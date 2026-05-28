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
// Mapping PUK scraper ID → clinical-quality.json indicator ID.
// Explicit override pro indikátory s odlišným cílovým ID (např. PUK metodika
// se liší od OECD/ÚZIS, takže ukládáme do samostatného záznamu).
// Pro ID nenalezené v této mapě se použije scraped.id přímo a entry se
// AUTO-VYTVOŘÍ v clinical-quality.json (pro lazy onboarding nových indikátorů).
const PUK_ID_MAP_EXPLICIT = {
  // PUK „30d AMI" metodika není identická s OECD H@G admission-based (45+, age-sex
  // standardized) ani s ÚZIS NRH in-hospital. Mapujeme do samostatného záznamu.
  'mortalita_30d_ami': 'mortalita_30d_ami_puk',
  'mortalita_30d_cmp': 'mortalita_30d_cmp_puk',
  // Trombektomie + centralizace přes table-row mají nejednoznačný ročník — ponechat
  // jen v cache; entries v clinical-quality.json existují s vlastním auto-mapping ID
  'trombektomie_cmp': 'trombektomie_cmp',
  'centralizace_cmp': 'centralizace_cmp',
  'atb_aware_ambulantni': 'atb_aware_ambulantni',
};

function resolveTargetId(scrapedId) {
  return PUK_ID_MAP_EXPLICIT[scrapedId] ?? scrapedId;
}

// Default metadata pro auto-vytvořené indikátory podle ID prefixu
function inferSection(id) {
  if (id.includes('sepse') || id.includes('psi')) return 'safety';
  if (id.includes('ami') || id.includes('aim')) return 'acute_cardio';
  if (id.includes('cmp') || id.includes('rehabilitace')) return 'stroke';
  if (id.includes('aware') || id.includes('preskripce') || id.includes('atb')) return 'amr';
  if (id.includes('90d') || id.includes('chirurg') || id.includes('resekce') || id.includes('tonzily') || id.includes('jater')) return 'onco_surgery';
  if (id.includes('toxicita')) return 'onco_surgery';
  if (id.includes('statiny') || id.includes('adherence')) return 'chronic_care';
  return 'other';
}

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

  // Merge PUK — explicit mapping nebo auto-create entry pro nové ID
  let pukAutoCreated = 0;
  for (const scraped of puk.indicators ?? []) {
    if (scraped.status !== 'ok' || scraped.value_national == null) {
      pukSkipped++;
      continue;
    }
    const targetId = resolveTargetId(scraped.id);
    let ind = target.indicators.find(i => i.id === targetId);
    if (!ind) {
      // Auto-create entry pro indikátor poprvé scrapnutý
      ind = {
        id: targetId,
        section: inferSection(targetId),
        name: scraped.title_hint ?? targetId,
        method: 'PUK · automatický scraper (kvalita-pece scraper inferred)',
        primary_source: 'puk',
        source_url: scraped.source_url,
        auto_created: true,
      };
      target.indicators.push(ind);
      pukAutoCreated++;
    }
    ind.value_national = scraped.value_national;
    if (scraped.unit) ind.unit = scraped.unit;
    if (scraped.year) ind.year = scraped.year;
    if (Array.isArray(scraped.trend) && scraped.trend.length > 0) ind.trend = scraped.trend;
    if (scraped.series_name) ind.series_name = scraped.series_name;
    if (scraped.by_region && Object.keys(scraped.by_region).length > 0) ind.by_region = scraped.by_region;
    ind.last_scraped_at = scraped.fetched_at;
    ind.source_url = scraped.source_url ?? ind.source_url;
    pukUpdated++;
  }
  if (pukAutoCreated > 0) console.log(`  Auto-created ${pukAutoCreated} new indicator entries.`);

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
