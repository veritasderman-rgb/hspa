// Validátor pro data/financing.json — zajišťuje integritu datového kontraktu
// stránky financovani.html. Spuštění:  npm run validate:financing

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'financing.json');

const TOLERANCE_PCT = 5;

const REQUIRED_TOP = ['version', 'generated_at', 'sankey', 'trend', 'headline_stats', 'metadata'];
const REQUIRED_HEADLINE = ['uhrady_zp_mld_kc', 'per_pojistence_kc', 'meziroci_rust_pct', 'podil_hdp_pct'];

/**
 * Vrátí seznam chyb (prázdný = OK).
 * @param {any} data
 * @returns {string[]}
 */
export function validateFinancing(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['root: očekáván objekt'];
  }
  for (const k of REQUIRED_TOP) {
    if (!(k in data)) errors.push(`chybí ${k}`);
  }

  // sankey: aspoň 1 rok, sources + targets musí sedět na hub
  if (data.sankey && typeof data.sankey === 'object') {
    const years = Object.keys(data.sankey);
    if (!years.length) errors.push('sankey: žádný rok');
    for (const year of years) {
      const s = data.sankey[year];
      if (!s.sources?.length) errors.push(`sankey.${year}: chybí sources`);
      if (!s.targets?.length) errors.push(`sankey.${year}: chybí targets`);
      if (!s.hub?.label)      errors.push(`sankey.${year}: chybí hub.label`);
      const sumSrc = (s.sources ?? []).reduce((a, x) => a + (x.value_mld_kc ?? 0), 0);
      const sumTgt = (s.targets ?? []).reduce((a, x) => a + (x.value_mld_kc ?? 0), 0);
      const diffPct = sumSrc === 0 ? 100 : Math.abs(sumSrc - sumTgt) / sumSrc * 100;
      if (diffPct > TOLERANCE_PCT) {
        errors.push(`sankey.${year}: sources (${sumSrc}) ≠ targets (${sumTgt}), odchylka ${diffPct.toFixed(1)} % > ${TOLERANCE_PCT} %`);
      }
      if (s.total_mld_kc != null) {
        const totalDiffPct = Math.abs(sumSrc - s.total_mld_kc) / s.total_mld_kc * 100;
        if (totalDiffPct > TOLERANCE_PCT) {
          errors.push(`sankey.${year}: total_mld_kc (${s.total_mld_kc}) ≠ Σ sources (${sumSrc}), odchylka ${totalDiffPct.toFixed(1)} %`);
        }
      }
      // ID musí být unikátní v rámci sources / targets
      const srcIds = (s.sources ?? []).map(x => x.id);
      if (new Set(srcIds).size !== srcIds.length) errors.push(`sankey.${year}: duplikátní id v sources`);
      const tgtIds = (s.targets ?? []).map(x => x.id);
      if (new Set(tgtIds).size !== tgtIds.length) errors.push(`sankey.${year}: duplikátní id v targets`);
    }
  }

  // trend: years.length === values.length pro každý segment
  if (data.trend) {
    const yearsLen = data.trend.years?.length ?? 0;
    if (!yearsLen) errors.push('trend.years: prázdné');
    for (const [key, seg] of Object.entries(data.trend.segments ?? {})) {
      if (!Array.isArray(seg.values)) {
        errors.push(`trend.segments.${key}.values: očekáváno pole`);
        continue;
      }
      if (seg.values.length !== yearsLen) {
        errors.push(`trend.segments.${key}.values: ${seg.values.length} hodnot vs. ${yearsLen} let`);
      }
      if (!seg.label)  errors.push(`trend.segments.${key}: chybí label`);
      if (!seg.color)  errors.push(`trend.segments.${key}: chybí color`);
    }
  }

  // headline_stats
  for (const k of REQUIRED_HEADLINE) {
    if (!data.headline_stats?.[k]) errors.push(`headline_stats: chybí ${k}`);
    else if (typeof data.headline_stats[k].value !== 'number') {
      errors.push(`headline_stats.${k}.value: očekáváno číslo`);
    }
  }

  // metadata.sources, caveats
  if (!Array.isArray(data.metadata?.sources) || !data.metadata.sources.length) {
    errors.push('metadata.sources: očekáváno neprázdné pole');
  }
  if (!Array.isArray(data.metadata?.caveats)) {
    errors.push('metadata.caveats: očekáváno pole');
  }

  // by_payer: per-ZP segmenty (volitelné, ale když je, musí být konzistentní)
  if (data.by_payer && typeof data.by_payer === 'object') {
    const VALID_PAYERS = ['111', '201', '205', '207', '209', '211', '213'];
    for (const [payer, years] of Object.entries(data.by_payer)) {
      if (!VALID_PAYERS.includes(payer)) {
        errors.push(`by_payer.${payer}: neznámý kód ZP (povolené: ${VALID_PAYERS.join(', ')})`);
      }
      if (!years || typeof years !== 'object') {
        errors.push(`by_payer.${payer}: očekáván objekt rok → segmenty`);
        continue;
      }
      for (const [year, rec] of Object.entries(years)) {
        if (!/^\d{4}$/.test(year)) {
          errors.push(`by_payer.${payer}.${year}: rok musí být YYYY`);
        }
        if (!rec.segments || typeof rec.segments !== 'object') {
          errors.push(`by_payer.${payer}.${year}: chybí segments`);
          continue;
        }
        const total = Object.values(rec.segments).reduce((a, v) => a + (Number(v) || 0), 0);
        if (rec.total_tis_kc != null) {
          const diffPct = Math.abs(total - rec.total_tis_kc) / Math.max(rec.total_tis_kc, 1) * 100;
          if (diffPct > TOLERANCE_PCT) {
            errors.push(`by_payer.${payer}.${year}: Σ segments (${total}) ≠ total_tis_kc (${rec.total_tis_kc}), odchylka ${diffPct.toFixed(1)} %`);
          }
        }
      }
    }
  }

  return errors;
}

export async function main() {
  if (!fs.existsSync(FILE)) {
    console.error('data/financing.json neexistuje — spusť npm run transform:financing');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const errors = validateFinancing(data);
  if (errors.length) {
    console.error('✗ data/financing.json — chyby:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('✓ data/financing.json OK');
  console.log(`  sankey: ${Object.keys(data.sankey).length} rok(ů), ${data.sankey[Object.keys(data.sankey)[0]].sources.length} sources, ${data.sankey[Object.keys(data.sankey)[0]].targets.length} targets`);
  console.log(`  trend:  ${data.trend.years.length} let, ${Object.keys(data.trend.segments).length} segmentů`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('validate-financing failed:', err);
    process.exit(1);
  });
}
