// Fetcher datových souhrnů NZIP — datová podpora dohodovacího řízení.
// Stahuje nejnovější XLSX edici každé sady z katalogu do
// ingest/cache/dohodovaci-rizeni/{ois}.xlsx.
//
// Spuštění samostatně:  node ingest/fetchers/nzip_dohodovaci_rizeni.js [--force] [--dim=2]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CATALOG = path.join(ROOT, 'ingest', 'mapping', 'nzip_dohodovaci_rizeni_catalog.json');
const CACHE_DIR = path.join(ROOT, 'ingest', 'cache', 'dohodovaci-rizeni');

const UA = CONFIG?.uzis?.user_agent || 'ZdraveCesko-HSPA/1.0';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Stáhne binární soubor s retry + exponenciálním backoffem. */
async function downloadBinary(url, attempts = 4) {
  const backoff = [2000, 4000, 8000, 16000];
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(backoff[i]);
    }
  }
  throw new Error(`Stažení selhalo (${attempts} pokusů): ${url} — ${lastErr?.message}`);
}

/**
 * Stáhne XLSX edice datových souhrnů.
 * @param {{ force?: boolean, dimension?: string }} opts
 *   dimension — prefix dimenze v katalogu, např. '2' (jen dimenze 2)
 */
export async function fetchNzipDohodovaciRizeni(opts = {}) {
  const { force = false, dimension = null } = opts;
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const targets = catalog.datasets.filter((d) => {
    if (dimension && !String(d.dimension).startsWith(dimension)) return false;
    return Array.isArray(d.editions) && d.editions.length > 0;
  });

  const results = [];
  for (const d of targets) {
    const latest = d.editions[d.editions.length - 1];
    if (!latest?.url) continue;
    const dest = path.join(CACHE_DIR, `${d.ois_code}.xlsx`);
    if (!force && fs.existsSync(dest)) {
      results.push({ ois: d.ois_code, status: 'cached', file: dest });
      continue;
    }
    try {
      const buf = await downloadBinary(latest.url);
      fs.writeFileSync(dest, buf);
      results.push({ ois: d.ois_code, status: 'downloaded', bytes: buf.length, file: dest });
      console.log(`  ✓ ${d.ois_code} — ${(buf.length / 1024).toFixed(0)} kB`);
    } catch (err) {
      results.push({ ois: d.ois_code, status: 'error', error: err.message });
      console.error(`  ✗ ${d.ois_code} — ${err.message}`);
    }
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');
  const dimArg = process.argv.find((a) => a.startsWith('--dim='));
  const dimension = dimArg ? dimArg.split('=')[1] : null;
  console.log(`Fetch NZIP dohodovací řízení${dimension ? ` (dimenze ${dimension})` : ''}…`);
  fetchNzipDohodovaciRizeni({ force, dimension }).then((r) => {
    const ok = r.filter((x) => x.status !== 'error').length;
    console.log(`Hotovo: ${ok}/${r.length} souborů.`);
    if (r.some((x) => x.status === 'error')) process.exit(1);
  });
}
