// Tests for ingest/mapping/eurostat_codes.json — validates that filter dimensions
// match Eurostat schema. Prevents regression of the May 2026 bug where:
//   - hlth_hlye used age=Y65, indic_he=F (both invalid → HTTP 400)
//   - hlth_silc_08 used quant_inc=TOTAL (wrong dim name) and reason=TOOEXP_FAR_WAIT (wrong code)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ingest', 'mapping', 'eurostat_codes.json'), 'utf8')
);

test('hlth_hlye: indic_he uses HLY_X / LE_X codes (not sex-letter)', () => {
  const m = MAPPING.indicators.nadeje_doziti_zdravi_65;
  assert.equal(m.dataset, 'hlth_hlye');
  const indic = m.filter_extra.indic_he;
  // Valid pattern: HLY_0|HLY_50|HLY_65|HLY_PC_0|HLY_PC_50|HLY_PC_65|LE_0|LE_50|LE_65
  assert.match(indic, /^(HLY|LE)_(0|50|65|PC_0|PC_50|PC_65)$/, `indic_he=${indic} not in valid set`);
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

test('hlth_silc_08: reason uses valid code (TOOEFW, not TOOEXP_FAR_WAIT)', () => {
  const m = MAPPING.indicators.unmet_need_medical;
  const valid = ['TOOEXP', 'TOOFAR', 'TOOEFW', 'NOTIME', 'NO_UNMET', 'WAIT', 'OTH'];
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
