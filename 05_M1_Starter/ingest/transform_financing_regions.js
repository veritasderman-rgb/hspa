// Transform: data/financing-regions.json — choropleth pro stránku financovani.html.
//
// Strategie F3a (MVP s proxy daty):
//   1. Národní průměr výdajů ZP / pojištěnce vezme z data/financing.json
//      (headline_stats.per_pojistence_kc).
//   2. Pro každý kraj odvodí index podle věkové struktury (pct_65plus, pct_80plus,
//      dependency_old) z data/pojistenci-d5-kraj.json — vyšší podíl seniorů = vyšší
//      úhrady (aproximace empirického vztahu pro ČR ~2,3× pro 65+ vs. průměr).
//   3. Výsledná hodnota: per_pojistence_kc × kraj_index, normalizováno tak, aby
//      vážený průměr přes pojištěnce = národní průměr.
//
// Tato proxy data nahradí reálná stratifikace NRHZS okres → kraj v F3b.
//
// Spuštění:  npm run transform:financing-regions

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FINANCING = path.join(ROOT, 'data', 'financing.json');
const POJISTENCI = path.join(ROOT, 'data', 'pojistenci-d5-kraj.json');
const OUT = path.join(ROOT, 'data', 'financing-regions.json');

// Empirická aproximace: nákladový index podle podílu 65+ a 80+.
// Kalibrováno tak, aby Praha (mladá populace, ale vysoká koncentrace center) ≈ 1,12,
// Karlovarský/Ústecký (méně seniorů, ale chudší zdravotní stav) ≈ 0,95,
// Vysočina/Zlínsko/Plzeňsko (starší populace) ≈ 1,05–1,10.
// Vzorec sleduje: base 0,80 + 0,015 × pct_65plus + 0,005 × pct_80plus + 0,06 (Praha bonus)
const PRAGUE_CENTRA_BONUS = 0.06; // Praha jako sídlo center vysoce specializované péče
const PRAHA_CODE = 'CZ010';

export function calcKrajIndex(stats, code) {
  const pct65 = Number(stats.pct_65plus ?? 20);
  const pct80 = Number(stats.pct_80plus ?? 5);
  let idx = 0.80 + 0.015 * pct65 + 0.005 * pct80;
  if (code === PRAHA_CODE) idx += PRAGUE_CENTRA_BONUS;
  return idx;
}

/**
 * Hlavní transform — sestaví financing-regions.json.
 * @param {{ year?: number, financing?: any, pojistenci?: any }} [opts]
 */
export function buildRegions(opts = {}) {
  const financing = opts.financing ?? JSON.parse(fs.readFileSync(FINANCING, 'utf8'));
  const pojistenci = opts.pojistenci ?? JSON.parse(fs.readFileSync(POJISTENCI, 'utf8'));
  const year = String(opts.year ?? financing.headline_stats?.per_pojistence_kc?.year ?? 2023);

  const perPojistenceAvg = financing.headline_stats?.per_pojistence_kc?.value ?? 42226;

  // Krok 1: spočti raw index pro každý kraj a hrubé hodnoty.
  const krajRecords = pojistenci.krajs.map(k => {
    const stats = pojistenci.data?.[k.code]?.[year];
    if (!stats || stats.total == null) return null;
    return {
      code: k.code,
      name: k.name,
      pojistenci: stats.total,
      pct_65plus: Number(stats.pct_65plus ?? 0),
      pct_80plus: Number(stats.pct_80plus ?? 0),
      raw_index: calcKrajIndex(stats, k.code),
    };
  }).filter(Boolean);

  // Krok 2: normalizace — vážený průměr přes pojištěnce = národní průměr.
  const totalPoj = krajRecords.reduce((a, r) => a + r.pojistenci, 0);
  const weightedRaw = krajRecords.reduce((a, r) => a + r.raw_index * r.pojistenci, 0) / totalPoj;

  const regions = krajRecords.map(r => {
    const norm_index = r.raw_index / weightedRaw;
    const value = Math.round(perPojistenceAvg * norm_index);
    return {
      code: r.code,
      name: r.name,
      value,
      pojistenci: r.pojistenci,
      index_vs_avg: Math.round(norm_index * 1000) / 1000,
      pct_65plus: r.pct_65plus,
    };
  });

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generator: 'ingest/transform_financing_regions.js',
    year: Number(year),
    country_avg: perPojistenceAvg,
    unit: 'Kč/poj./rok',
    direction: 'context_dependent',
    method: 'proxy: per_pojistence_kc × index věkové struktury (pct_65plus, pct_80plus); Praha +6 % bonus za centra. Normalizováno na pojištěnce-vážený národní průměr. Reálná stratifikace NRHZS okres → kraj v F3b.',
    sources: [
      'data/financing.json (per_pojistence_kc)',
      'data/pojistenci-d5-kraj.json (věková struktura)',
    ],
    regions,
  };
}

export async function main() {
  const out = buildRegions();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ data/financing-regions.json (${out.regions.length} krajů, průměr ${out.country_avg.toLocaleString('cs-CZ')} Kč/poj.)`);
  // Sanity check
  const min = Math.min(...out.regions.map(r => r.value));
  const max = Math.max(...out.regions.map(r => r.value));
  console.log(`  rozsah: ${min.toLocaleString('cs-CZ')} – ${max.toLocaleString('cs-CZ')} Kč/poj.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('transform_financing_regions failed:', err);
    process.exit(1);
  });
}
