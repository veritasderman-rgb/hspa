// Tests for ingest/mapping/eurostat_codes.json — validates that filter dimensions
// match Eurostat schema. Prevents regression of the May 2026 bug where:
//   - hlth_hlye used age=Y65, indic_he=F (both invalid → HTTP 400)
//   - hlth_silc_08 used quant_inc=TOTAL (wrong dim name) and reason=TOOEXP_FAR_WAIT/TOOEFW
//     (neither exists in the live 'reason' code list; correct summary code is TXP_TFAR_WLIST)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateAnnualMean } from '../ingest/fetchers/eurostat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ingest', 'mapping', 'eurostat_codes.json'), 'utf8')
);

test('hlth_hlye: hlth_hle uses HLY_Y* / LE_Y* codes + unit=YR (Eurostat 2026 schéma)', () => {
  const m = MAPPING.indicators.nadeje_doziti_zdravi_65;
  assert.equal(m.dataset, 'hlth_hlye');
  // Eurostat restrukturalizoval hlth_hlye 2026: dimenze indic_he→hlth_hle,
  // kód HLY_65→HLY_Y65; roky vyžadují unit=YR (jinak vrací % nebo HTTP 400).
  assert.equal(m.filter_extra.indic_he, undefined, 'dimenze indic_he byla nahrazena hlth_hle');
  const indic = m.filter_extra.hlth_hle;
  assert.match(indic, /^(HLY_Y|LE_Y|HLY_LE_Y)(0|50|65)(_PC)?$/, `hlth_hle=${indic} not in valid set`);
  assert.equal(m.filter_extra.unit, 'YR', 'hlth_hlye vyžaduje unit=YR pro počet let');
});

test('hlth_hlye: no separate age dimension (age is encoded in indic_he)', () => {
  const m = MAPPING.indicators.nadeje_doziti_zdravi_65;
  assert.equal(m.filter_extra.age, undefined,
    'hlth_hlye does not have an "age" dimension; setting it causes HTTP 400');
});

test('hlth_silc_08: quantile dimension (not quant_inc)', () => {
  const m = MAPPING.indicators.unmet_need_medical;
  assert.equal(m.dataset, 'hlth_silc_08');
  assert.equal(m.filter_extra.quant_inc, undefined,
    'Eurostat hlth_silc_08 dimension is named "quantile", not "quant_inc"');
  assert.equal(m.filter_extra.quantile, 'TOTAL');
});

test('hlth_silc_08: reason uses valid code (TXP_TFAR_WLIST)', () => {
  const m = MAPPING.indicators.unmet_need_medical;
  // Skutečné kódy dimenze 'reason' v živém datasetu hlth_silc_08 (ověřeno 2026-06-01):
  // TXP, TFAR, TXP_TFAR_WLIST, NTIME, NUMT_ND, NOKNOW, WAITING, FEAR, HOPING, OTH.
  // Souhrnný kód „too expensive / too far / waiting list" je TXP_TFAR_WLIST.
  const valid = ['TXP', 'TFAR', 'TXP_TFAR_WLIST', 'NTIME', 'NUMT_ND', 'NOKNOW', 'WAITING', 'FEAR', 'HOPING', 'OTH'];
  assert.ok(valid.includes(m.filter_extra.reason),
    `reason=${m.filter_extra.reason} not in Eurostat schema (${valid.join('|')})`);
});

test('all mappings have dataset, country_dim, cz_code', () => {
  for (const [id, m] of Object.entries(MAPPING.indicators)) {
    assert.ok(m.dataset, `${id}: missing dataset`);
    assert.ok(m.country_dim, `${id}: missing country_dim`);
    assert.ok(m.cz_code, `${id}: missing cz_code`);
  }
});

// --- Dávka G (2026-07-06): treatable/preventable mortalita, zubní péče, potraty ---

test('mortalita_lecitelna: hlth_cd_apr, mortalit=TRT, icd10=TOTAL', () => {
  const m = MAPPING.indicators.mortalita_lecitelna;
  assert.equal(m.dataset, 'hlth_cd_apr');
  assert.equal(m.filter_extra.mortalit, 'TRT');
  assert.equal(m.filter_extra.icd10, 'TOTAL');
  assert.equal(m.filter_extra.unit, 'RT');
  assert.equal(m.eu_code, 'EU27_2020');
});

test('mortalita_preventabilni: hlth_cd_apr, mortalit=PRVT (ne TRT)', () => {
  const m = MAPPING.indicators.mortalita_preventabilni;
  assert.equal(m.dataset, 'hlth_cd_apr');
  assert.equal(m.filter_extra.mortalit, 'PRVT');
  assert.equal(m.filter_extra.icd10, 'TOTAL');
  assert.equal(m.filter_extra.unit, 'RT');
});

test('nesplnena_potreba_zubni_pece: hlth_silc_09, souhrnný reason TXP_TFAR_WLIST', () => {
  const m = MAPPING.indicators.nesplnena_potreba_zubni_pece;
  assert.equal(m.dataset, 'hlth_silc_09');
  assert.equal(m.filter_extra.reason, 'TXP_TFAR_WLIST');
  assert.equal(m.filter_extra.age, 'Y_GE16');
  // POZOR: na rozdíl od hlth_silc_08 (medical) používá hlth_silc_09 (dental)
  // příjmovou dimenzi "quant_inc", NE "quantile" — quantile=TOTAL vracelo HTTP 400
  // (ověřeno živě proti API 2026-07-23). Sourozenecké datasety mají různá jména dimenze.
  assert.equal(m.filter_extra.quantile, undefined,
    'hlth_silc_09 dimension is "quant_inc", not "quantile"');
  assert.equal(m.filter_extra.quant_inc, 'TOTAL');
  assert.equal(m.filter_extra.unit, 'PC');
});

test('umela_preruseni_tehotenstvi: demo_fabortind, ABORTRT, bez eu_code (context_dependent)', () => {
  const m = MAPPING.indicators.umela_preruseni_tehotenstvi;
  assert.equal(m.dataset, 'demo_fabortind');
  assert.equal(m.filter_extra.indic_de, 'ABORTRT');
  assert.equal(m.filter_extra.unit, 'RT');
  // Kontextový indikátor → žádný EU agregát (jinak by fetcher zbytečně tahal EU řadu).
  assert.equal(m.eu_code, undefined);
});

test('nadumrtnost: demo_mexrt, aggregate=annual_mean (měsíční → roční)', () => {
  const m = MAPPING.indicators.nadumrtnost;
  assert.equal(m.dataset, 'demo_mexrt');
  assert.equal(m.aggregate, 'annual_mean');
  assert.equal(m.min_periods, 12);
  assert.equal(m.filter_extra.unit, 'PC');
});

test('aggregateAnnualMean: průměruje měsíce, vynechá neúplné roky', () => {
  // 2024 = 12 měsíců (kompletní), 2025 = jen 2 měsíce (neúplný → vynechán)
  const obs = [];
  for (let mo = 1; mo <= 12; mo++) obs.push({ geo: 'CZ', time: `2024-${String(mo).padStart(2, '0')}`, value: mo <= 6 ? 2 : 4 });
  obs.push({ geo: 'CZ', time: '2025-01', value: 10 });
  obs.push({ geo: 'CZ', time: '2025-02', value: 12 });
  const out = aggregateAnnualMean(obs, 'geo', { minPeriods: 12 });
  assert.equal(out.length, 1, 'jen kompletní rok 2024');
  assert.equal(out[0].time, '2024');
  assert.equal(out[0].value, 3); // průměr (2×6 + 4×6)/12 = 3
});
