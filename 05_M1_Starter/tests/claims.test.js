// Testy registru tvrzení data/claims.json (PLAN-CLAIMS.md) + pure funkcí
// drift-checkeru (scripts/nightly-scan.js checkClaim) a quote-verifikace.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkClaim } from '../scripts/nightly-scan.js';
import { normalizeText, verifyQuote } from '../scripts/claims-verify-quotes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'claims.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));

test('claims: validní obal a netriviální pokrytí korpusu', () => {
  assert.ok(data.version, 'chybí version');
  assert.ok(Array.isArray(data.claims), 'claims musí být pole');
  // Pokrytí roste po dávkách (PLAN-CLAIMS.md §2) — prahy odpovídají 1. vlně
  // extrakce; nepokryté publikované články hlásí nightly-scan (claims-missing).
  assert.ok(data.claims.length >= 400, `málo tvrzení (${data.claims.length})`);
  const covered = new Set(data.claims.map(c => c.article));
  assert.ok(covered.size >= 60, `registr pokrývá jen ${covered.size} článků`);
});

test('claims: FK integrita a invarianty', () => {
  const validInd = new Set(indicators.indicators.map(i => i.id));
  const validArt = new Set(articles.articles.map(a => a.slug));
  const ids = new Set();
  for (const c of data.claims) {
    assert.ok(!ids.has(c.id), `duplicitní id ${c.id}`);
    ids.add(c.id);
    assert.ok(validArt.has(c.article), `claim ${c.id}: článek '${c.article}' neexistuje`);
    if (c.indicator_id) {
      assert.ok(validInd.has(c.indicator_id), `claim ${c.id}: indikátor '${c.indicator_id}' neexistuje`);
    }
    assert.equal(typeof c.value, 'number', `claim ${c.id}: value není number`);
    if (c.check === 'auto') {
      assert.equal(c.relation, 'exact', `claim ${c.id}: check=auto vyžaduje relation=exact`);
      assert.ok(c.indicator_id, `claim ${c.id}: check=auto bez indicator_id`);
      assert.ok(Number.isInteger(c.as_of), `claim ${c.id}: check=auto bez as_of — claims-stale by nešel detekovat`);
    }
  }
});

// --- checkClaim (pure) ---

const IND = { id: 'x', value: 100, unit: '%', year: 2024 };

test('checkClaim: shoda v toleranci → ok', () => {
  assert.equal(checkClaim({ check: 'auto', value: 101, tolerance_pct: 2 }, IND).status, 'ok');
});

test('checkClaim: odchylka přes toleranci → drift', () => {
  const res = checkClaim({ check: 'auto', value: 110, tolerance_pct: 2 }, IND);
  assert.equal(res.status, 'drift');
  assert.ok(Math.abs(res.deviation_pct - 10) < 0.001);
});

test('checkClaim: novější rok indikátoru + jiná hodnota v toleranci → stale', () => {
  const res = checkClaim({ check: 'auto', value: 99.5, as_of: 2022, tolerance_pct: 2 }, IND);
  assert.equal(res.status, 'stale');
});

test('checkClaim: manual/none a chybějící indikátor se nekontrolují', () => {
  assert.equal(checkClaim({ check: 'manual', value: 500 }, IND).status, 'ok');
  assert.equal(checkClaim({ check: 'auto', value: 500 }, null).status, 'ok');
});

test('checkClaim: nulová hodnota indikátoru', () => {
  const zero = { id: 'z', value: 0, year: 2024 };
  assert.equal(checkClaim({ check: 'auto', value: 0 }, zero).status, 'ok');
  assert.equal(checkClaim({ check: 'auto', value: 3 }, zero).status, 'drift');
});

// --- quote verifikace (pure) ---

test('normalizeText: tagy, entity, NBSP a typografické uvozovky', () => {
  const html = '<p>Češi vypijí&nbsp;<strong>14,4 litru</strong> — „nejvíc“ v OECD.</p>';
  assert.equal(normalizeText(html), 'Češi vypijí 14,4 litru - "nejvíc" v OECD.');
});

test('verifyQuote: doslovný úryvek projde, parafráze ne', () => {
  const text = normalizeText('<p>Screeningem projde jen 31,1 % cílové populace.</p>');
  assert.ok(verifyQuote('projde jen 31,1 % cílové populace', text));
  assert.ok(!verifyQuote('projde pouze 31 % populace', text));
});
