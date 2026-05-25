// Transform: data/providers.json — z NRHZS cache (nebo manual snapshot) seřadí
// top N poskytovatelů podle součtu leky_kc + zp_kc a doplní metadata.
//
// Spuštění:  npm run transform:providers

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OUT = path.join(ROOT, 'data', 'providers.json');
const NRHZS_CACHE = path.join(__dirname, 'cache', 'nrhzs');

/** Validuje a normalizuje záznam poskytovatele. */
export function normalizeProvider(p) {
  if (!p.ico) return null;
  return {
    ico: String(p.ico),
    nazev: p.nazev ?? '',
    kraj: p.kraj ?? null,
    segment: p.segment ?? 'ostatni',
    leky_kc: Number(p.leky_kc ?? 0) || 0,
    zp_kc: Number(p.zp_kc ?? 0) || 0,
    vykony_pocet: p.vykony_pocet != null ? Number(p.vykony_pocet) : null,
  };
}

export function sortAndTrim(providers, limit = 500) {
  return providers
    .map(normalizeProvider)
    .filter(Boolean)
    .sort((a, b) => (b.leky_kc + b.zp_kc) - (a.leky_kc + a.zp_kc))
    .slice(0, limit);
}

export function buildOutput(snapshot, opts = {}) {
  const top = sortAndTrim(snapshot.providers ?? [], opts.limit ?? 500);
  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generator: 'ingest/transform_providers.js',
    year: snapshot.year ?? opts.year ?? 2024,
    coverage_note: snapshot.coverage_note ?? `Top ${top.length} poskytovatelů podle součtu úhrad za léky + zdravotnické prostředky.`,
    caveats: snapshot.caveats ?? [
      'Úhrady v Kč per IČO jsou v NRHZS open data POUZE pro léky a zdravotnické prostředky.',
      'Pro lůžkovou a ambulantní výkonovou péči per IČO data nejsou veřejně dostupná.',
    ],
    providers: top,
    segments_legend: snapshot.segments_legend ?? {},
  };
}

export async function main() {
  // Preferuj cache, padni na manual snapshot, padni na existující providers.json
  let snapshot = null;
  const cacheFile = path.join(NRHZS_CACHE, 'providers.json');
  if (fs.existsSync(cacheFile)) {
    snapshot = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } else if (fs.existsSync(OUT)) {
    snapshot = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    console.log('  použit existující data/providers.json jako snapshot (žádný NRHZS cache)');
  } else {
    console.error('Žádný vstup: chybí ingest/cache/nrhzs/providers.json i data/providers.json');
    process.exit(1);
  }
  const out = buildOutput(snapshot);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ data/providers.json: ${out.providers.length} poskytovatelů, top: ${out.providers[0]?.nazev}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('transform_providers failed:', err);
    process.exit(1);
  });
}
