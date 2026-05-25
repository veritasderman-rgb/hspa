// ČSÚ · Výsledky zdravotnických účtů ČR (SHA 2011) — fetcher.
//
// Stahuje XLSX přílohy publikace 260005-N (poslední dvě edice) a extrahuje
// hlavní agregáty: výdaje podle financování (HF), funkcí péče (HC) a
// poskytovatelů (HP) — viz https://csu.gov.cz/produkty/vysledky-zdravotnickych-uctu-cr-m6hwrlzbbw
//
// Výstup:  ingest/cache/csu_sha/{code}.json  +  ingest/cache/csu_sha/summary.json
//
// Pozn.: ČSÚ obecně publikuje vlnu N v září roku N+2. Aktuální nejnovější je
// 260005-24 (data 2010-2022) a 260005-25 (data 2010-2023, vyšlo září 2025).
// Pokud primary URL zastará, doplnit do CSU_SHA_DATASETS novou edici.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry, HttpError } from '../lib/http.js';
import { readSheet, findHeaderRow, num, txt } from '../lib/xlsx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SHA_CACHE_DIR = path.resolve(ROOT, CONFIG.cache.dir, 'csu_sha');

export const CSU_SHA_DATASETS = [
  {
    code: '260005-25',
    label: 'Výsledky zdravotnických účtů ČR 2010–2023',
    xlsx_url: 'https://csu.gov.cz/docs/107508/4c5ae6b9-3a2c-4d31-bd58-cb52e7b0d70b/26000525-data-priloh.xlsx',
    year_range: [2010, 2023],
  },
  {
    code: '260005-24',
    label: 'Výsledky zdravotnických účtů ČR 2010–2022',
    xlsx_url: 'https://csu.gov.cz/docs/107508/8acce15a-9c3d-4a64-9d3e-3cd6db44eb29/26000524-data-priloh.xlsx',
    year_range: [2010, 2022],
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * Stáhne XLSX, uloží do cache pod {code}.xlsx, vrátí absolutní cestu.
 * Pokud cache už existuje a není starší než TTL, použije ji.
 */
export async function downloadXlsx(dataset, opts = {}) {
  ensureDir(SHA_CACHE_DIR);
  const filePath = path.join(SHA_CACHE_DIR, `${dataset.code}.xlsx`);
  if (fs.existsSync(filePath) && !opts.force) {
    const ageHours = (Date.now() - fs.statSync(filePath).mtimeMs) / 3_600_000;
    if (ageHours < (opts.ttlHours ?? CONFIG.cache.ttl_hours * 30)) {
      return filePath;
    }
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const res = await fetchImpl(dataset.xlsx_url, {
    headers: { 'User-Agent': CONFIG.csu.user_agent, 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status} for ${dataset.xlsx_url}`, { status: res.status, url: dataset.xlsx_url, attempts: 1 });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
  return filePath;
}

/**
 * Z XLSX listu extrahuje plochou agregovanou řadu hodnot pro daný rok.
 * Heuristika: hledá řádek s číselným rokem v hlavičce a vrací mapping
 * { kategorie → hodnota }. Pro různé listy (HF/HC/HP) je signature stejná.
 *
 * @param {Array<Array<any>>} rows  výstup readSheet(.., { header: 1 })
 * @param {{ category_col?: number, mustContain?: string[] }} opts
 */
export function extractYearlyAggregates(rows, opts = {}) {
  const { category_col = 0, mustContain = [] } = opts;
  const headerIdx = findHeaderRow(rows, { minCells: 3, mustContain });
  if (headerIdx < 0) return { years: [], rows: [] };

  const header = rows[headerIdx];
  const yearCols = [];
  for (let i = 1; i < header.length; i++) {
    const yr = Number(txt(header[i]));
    if (Number.isFinite(yr) && yr >= 1990 && yr <= 2100) {
      yearCols.push({ index: i, year: yr });
    }
  }

  const dataRows = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const cat = txt(row[category_col]);
    if (!cat) continue;
    const obs = {};
    for (const { index, year } of yearCols) {
      const v = num(row[index]);
      if (v != null) obs[year] = v;
    }
    if (Object.keys(obs).length > 0) {
      dataRows.push({ category: cat, values: obs });
    }
  }
  return { years: yearCols.map(y => y.year), rows: dataRows };
}

/**
 * Plný fetch pipeline: stáhne XLSX všech datasetů, zextrahuje agregáty pro
 * první 3 listy a uloží do {code}.json.
 */
export async function fetchCsuSha({ datasets = CSU_SHA_DATASETS, force = false, fetchImpl } = {}) {
  ensureDir(SHA_CACHE_DIR);
  const results = [];
  for (const ds of datasets) {
    try {
      const filePath = await downloadXlsx(ds, { force, fetchImpl });
      const sheets = {};
      // Heuristika: pokusíme se přečíst první 5 listů (různé edice mají různý počet)
      for (let i = 0; i < 5; i++) {
        try {
          const rows = readSheet(filePath, i);
          const agg = extractYearlyAggregates(rows);
          if (agg.rows.length > 0) {
            sheets[`sheet_${i}`] = agg;
          }
        } catch { /* list neexistuje, end */ }
      }
      const out = {
        code: ds.code,
        label: ds.label,
        xlsx_url: ds.xlsx_url,
        year_range: ds.year_range,
        fetched_at: new Date().toISOString(),
        sheets,
      };
      const outFile = path.join(SHA_CACHE_DIR, `${ds.code}.json`);
      fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
      results.push({ code: ds.code, sheets: Object.keys(sheets).length, file: outFile });
      console.log(`✓ ${ds.code}: ${Object.keys(sheets).length} listů (${out.label})`);
    } catch (err) {
      console.error(`✗ ${ds.code}: ${err.message}`);
      results.push({ code: ds.code, error: err.message });
    }
  }
  const summary = { generated_at: new Date().toISOString(), datasets: results };
  fs.writeFileSync(path.join(SHA_CACHE_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchCsuSha({ force: process.argv.includes('--force') }).catch((err) => {
    console.error('csu_sha failed:', err);
    process.exit(1);
  });
}
