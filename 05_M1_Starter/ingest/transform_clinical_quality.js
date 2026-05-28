// Transform vrstva pro clinical-quality.json.
//
// Čte výstupy scraperů z ingest/cache/puk_raw.json + indiko_raw.json
// a merguje je do data/clinical-quality.json. Zachovává seed záznamy
// jako fallback — scraping update jen tehdy, když má hodnotu.
//
// Princip: scraping NIKDY nepřepisuje seed hodnoty NULL hodnotou.
// Když selže scraper, data zůstanou v aktuálním stavu.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TARGET = path.join(ROOT, 'data', 'clinical-quality.json');
const PUK_CACHE = path.join(ROOT, 'ingest', 'cache', 'puk_raw.json');
const INDIKO_CACHE = path.join(ROOT, 'ingest', 'cache', 'indiko_raw.json');

function loadJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

/**
 * Mapping PUK fetcher IDs → clinical-quality.json indicator IDs.
 * Některé seedy mají stejné ID, jiné mírně odlišné.
 */
const PUK_ID_MAP = {
  'pooperacni_sepse_psi13': 'pooperacni_sepse_psi13',
  'mortalita_30d_ami': 'mortalita_30d_ami_oecd',  // ČR data z PUK doplní hodnotu do OECD-aligned záznamu
  'mortalita_30d_cmp': null,                       // zatím nepřítomno v seedu — bude přidáno
  'trombektomie_cmp': null,
  'atb_aware_ambulantni': 'atb_aware_ambulantni',
  'mortalita_90d_kolorekt': null,
};

export function transformClinicalQuality() {
  const target = loadJson(TARGET, null);
  if (!target) {
    console.error('FATAL: data/clinical-quality.json missing');
    process.exit(1);
  }

  const puk = loadJson(PUK_CACHE, { indicators: [] });
  const indiko = loadJson(INDIKO_CACHE, { diagnoses: [] });

  let pukUpdated = 0;
  let indikoUpdated = 0;
  let pukSkipped = 0;

  // Merge PUK
  for (const scraped of puk.indicators ?? []) {
    if (scraped.status !== 'ok' || scraped.value_national == null) {
      pukSkipped++;
      continue;
    }
    const targetId = PUK_ID_MAP[scraped.id];
    if (!targetId) {
      pukSkipped++;
      continue;
    }
    const ind = target.indicators.find(i => i.id === targetId);
    if (!ind) continue;
    ind.value_national = scraped.value_national;
    if (scraped.unit) ind.unit = scraped.unit;
    if (scraped.year) ind.year = scraped.year;
    if (Object.keys(scraped.by_region).length > 0) ind.by_region = scraped.by_region;
    ind.last_scraped_at = scraped.fetched_at;
    ind.source_url = scraped.source_url ?? ind.source_url;
    pukUpdated++;
  }

  // Merge INDIKO — uložíme do nového pole 'indiko_diagnoses' (na úrovni top-level)
  if ((indiko.diagnoses ?? []).some(d => d.status === 'ok' || d.status === 'parsed-partial')) {
    target.indiko_diagnoses = (indiko.diagnoses ?? [])
      .filter(d => d.status === 'ok' || d.status === 'parsed-partial')
      .map(d => ({
        id: d.id,
        diagnosis: d.diagnosis,
        phases: d.phases,
        mdt_share: d.mdt_share,
        source_url: d.source_url,
        last_scraped_at: d.fetched_at,
      }));
    indikoUpdated = target.indiko_diagnoses.length;
  }

  // Aktualizuj generated_at, jen pokud došlo k nějaké změně
  if (pukUpdated > 0 || indikoUpdated > 0) {
    target.generated_at = new Date().toISOString();
  }

  fs.writeFileSync(TARGET, JSON.stringify(target, null, 2) + '\n');

  console.log(`  Clinical quality merge: PUK updated=${pukUpdated} skipped=${pukSkipped}, INDIKO updated=${indikoUpdated}`);
  return { pukUpdated, pukSkipped, indikoUpdated };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  transformClinicalQuality();
}
