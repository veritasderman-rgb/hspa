// Transform: generuje data/financing.json — datový kontrakt pro stránku
// financovani.html (Sankey, časová řada, headline stats).
//
// Strategie: seed-first. Tento skript přečte volitelné `seed_financing.json`
// (ručně vyladěné agregáty), validuje a propíše do `data/financing.json`.
// Až bude hotový ZPP PDF parser (F2b) a ČSÚ SHA fetcher (F2a-2), tento
// transform sloučí strukturovaná data z cache (`ingest/cache/csu_sha/*.json`,
// `ingest/cache/zpp/*.json`) do stejného výstupního schématu.
//
// Spuštění:  npm run transform:financing

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'data', 'financing.json');
const SEED_FILE = path.join(__dirname, 'data', 'seed_financing.json');
const ZPP_CACHE_DIR = path.join(__dirname, 'cache', 'zpp');
const ZPP_MANUAL_DIR = path.join(__dirname, 'manual', 'zpp');
const SHA_CACHE_DIR = path.join(__dirname, 'cache', 'csu_sha');

// Default seed — odpovídá hodnotám použitým v dosavadním frontend MVP.
// (Synchronizováno se src/financovani.js před F2a refaktorem.)
const DEFAULT_SEED = {
  year: 2023,
  total_mld_kc: 459,
  sources: [
    { id: 'zamestnanci',    label: 'Zaměstnanci a zaměstnavatelé', value_mld_kc: 269, color: '#4a6fa5' },
    { id: 'stat',           label: 'Stát (státní pojištěnci)',     value_mld_kc: 155, color: '#7a6a9c' },
    { id: 'osvc',           label: 'OSVČ',                         value_mld_kc:  25, color: '#5a8a6a' },
    { id: 'ostatni_platci', label: 'Ostatní plátci',               value_mld_kc:  10, color: '#8a8070' },
  ],
  hub: { id: 'zp', label: 'Systém ZP', subtitle: '7 pojišťoven · 459 mld Kč', color: '#6b6357' },
  targets: [
    { id: 'luzkova',    label: 'Lůžková péče',    value_mld_kc: 257, share_pct: 55.9, color: '#B45F06' },
    { id: 'ambulantni', label: 'Ambulantní péče', value_mld_kc: 131, share_pct: 28.5, color: '#38761D' },
    { id: 'leky',       label: 'Léky (recept)',   value_mld_kc:  46, share_pct: 10.0, color: '#0B5394' },
    { id: 'ostatni',    label: 'Ostatní péče',    value_mld_kc:  25, share_pct:  5.4, color: '#7A7070' },
  ],
  trend: {
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
    estimated_years: [2024],
    segments: {
      luzkova:    { label: 'Lůžková péče',                                  values: [189, 203, 210, 224, 233, 257, 284], color: '#B45F06' },
      ambulantni: { label: 'Ambulantní péče',                               values: [ 92,  98, 103, 111, 116, 131, 145], color: '#38761D' },
      leky:       { label: 'Léky (recept)',                                 values: [ 34,  37,  38,  40,  42,  46,  51], color: '#0B5394' },
      ostatni:    { label: 'Zdravotnické prostředky, lázně, ostatní',       values: [ 29,  30,  29,  29,  25,  25,  27], color: '#999999' },
    },
  },
  headline_stats: {
    uhrady_zp_mld_kc:  { value: 459,   year: 2023, label: 'Úhrady ZP 2023',           meta: 'Všech 7 pojišťoven dohromady' },
    per_pojistence_kc: { value: 42226, year: 2023, label: 'Na pojištěnce ročně',      meta: 'Průměr 2023 · všechny ZP' },
    meziroci_rust_pct: { value: 10.7,  year: 2024, label: 'Meziroční růst',           meta: '1. pololetí 2024 vs. 2023' },
    podil_hdp_pct:     { value: 8.4,   year: 2023, label: 'Celkové výdaje na zdraví', meta: 'ČSÚ SHA 2011 · 2023 · 642 mld Kč' },
  },
  sources_meta: [
    { name: 'ČSÚ Zdravotnické účty (SHA 2011)', code: '260005-24', url: 'https://csu.gov.cz/produkty/vysledky-zdravotnickych-uctu-cr-m6hwrlzbbw', fetched_at: null, origin: 'seed' },
    { name: 'ZPP 2024 (7 ZP)',                  url: 'https://www.psp.cz/sqw/text/text2.sqw?idd=242540', fetched_at: null, origin: 'seed' },
    { name: 'Platba státu za státní pojištěnce', url: 'clanek-platba-statu-statni-pojistenci.html', fetched_at: null, origin: 'seed' },
  ],
  caveats: [
    "MVP data: F2a obsahuje seed hodnoty kalibrované na publikované odhady ČSÚ SHA a souhrn ZPP. Reálný ETL fetcher z ČSÚ XLSX a ZPP PDF je v F2b.",
    "Rok 2024 je odhad na základě tempa 1. pololetí 2024 (+10,7 % vs. 2023). ČSÚ publikuje vlnu N v září roku N+2.",
    "Sankey nepokrývá komerční pojištění a přímé platby domácností — celkové výdaje na zdraví ČSÚ SHA 2023 = 642 mld Kč.",
    "Malé segmenty (zdravotnické prostředky 11, lázně/stomato 10, doprava/ZZS 4) jsou sloučeny do 'Ostatní péče' (25 mld Kč) pro čitelnost.",
  ],
};

/** Načte seed nebo vrátí DEFAULT_SEED. */
export function loadSeed(seedPath = SEED_FILE) {
  if (!fs.existsSync(seedPath)) return DEFAULT_SEED;
  try {
    return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (err) {
    console.warn(`seed_financing.json neparsovatelný (${err.message}) — používám default`);
    return DEFAULT_SEED;
  }
}

/**
 * Spojí seed se strukturovanými daty ze ZPP cache + manual fallback.
 * Pro každý {payer, year} v cache nahradí seed skutečnou agregací.
 * Pokud existují obě varianty (cache i manual), cache vyhrává.
 */
export function mergeZppCache(seed, zppDir = ZPP_CACHE_DIR, manualDir = ZPP_MANUAL_DIR) {
  const by_payer = {};

  const loadFrom = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const match = f.match(/^(\d{3})-(\d{4})\.json$/);
      if (!match) continue;
      const [, zp, year] = match;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        by_payer[zp] = by_payer[zp] || {};
        // cache > manual (parsed PDF má přednost)
        if (!by_payer[zp][year] || data.origin === 'parsed') {
          by_payer[zp][year] = data;
        }
      } catch (err) {
        console.warn(`zpp ${dir}/${f} skipped: ${err.message}`);
      }
    }
  };

  loadFrom(manualDir);  // first: manual (low priority)
  loadFrom(zppDir);     // then: cache (high priority, overrides manual)

  return { ...seed, by_payer: Object.keys(by_payer).length ? by_payer : null };
}

/** Sestaví výstupní JSON podle datového kontraktu data/financing.json. */
export function buildOutput(seed) {
  const year = String(seed.year);
  const out = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generator: 'ingest/transform_financing.js',
    sankey: {
      [year]: {
        total_mld_kc: seed.total_mld_kc,
        sources: seed.sources,
        hub: seed.hub,
        targets: seed.targets,
      },
    },
    trend: {
      unit: 'mld Kč',
      years: seed.trend.years,
      estimated_years: seed.trend.estimated_years,
      segments: seed.trend.segments,
    },
    headline_stats: seed.headline_stats,
    metadata: {
      sources: seed.sources_meta,
      caveats: seed.caveats,
    },
  };
  if (seed.by_payer) out.by_payer = seed.by_payer;
  return out;
}

export async function main() {
  const seed = loadSeed();
  const merged = mergeZppCache(seed);
  const out = buildOutput(merged);
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ data/financing.json (${(JSON.stringify(out).length / 1024).toFixed(1)} KiB)`);
  if (merged.by_payer) {
    const payers = Object.keys(merged.by_payer);
    console.log(`  by_payer: ${payers.length} ZP (${payers.join(', ')})`);
  } else {
    console.log('  by_payer: žádný ZPP cache, používám seed');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('transform_financing failed:', err);
    process.exit(1);
  });
}
