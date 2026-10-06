// Vydavatelská brána (GOVERNANCE.md § 3): třída PR se určuje mechanicky z cest.
// Testy chrání dvě věci: (1) že třída C skutečně zachytí všechno, co ústava
// vyhrazuje člověku, (2) že rutinní obsah autorky padá do B, ne do C — jinak
// by editor nemohl mergovat a vydavatel by byl zpátky u ručního klikání.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, zaradSoubor, markdown, LABELS } from '../scripts/pr-gate.js';

const S = '05_M1_Starter/';

test('ústava, prompty, workflows a kill switch jsou vždy třída C', () => {
  for (const f of ['GOVERNANCE.md', 'PROMPT_ROUTINE.md', 'PROMPT_EDITOR.md', 'CLAUDE.md',
    '.github/workflows/pr-gate.yml', '.claude/settings.json', 'docs/scheduled-sessions.md', `${S}data/ai-provoz.json`]) {
    assert.equal(zaradSoubor(f).trida, 'C', f);
  }
});

test('osoby, pohotovosti, závislosti a soukromí jsou třída C', () => {
  for (const f of [`${S}data/barometr.json`, `${S}data/ppo-coi.json`, `${S}data/ppo-osoby.json`,
    `${S}data/pohotovosti.json`, `${S}data/dojezdy.json`, `${S}pohotovost-praha.html`, `${S}pohotovosti.html`,
    `${S}src/pohotovosti-engine.js`, `${S}package.json`, `${S}package-lock.json`, `${S}vercel.json`,
    `${S}src/page-shared.js`, `${S}src/analytics.js`]) {
    assert.equal(zaradSoubor(f).trida, 'C', f);
  }
});

test('nová top-level stránka je C, úprava existující hub stránky je B, nový článek je B', () => {
  assert.equal(zaradSoubor(`${S}nova-sekce.html`, 'A').trida, 'C');
  assert.equal(zaradSoubor(`${S}o-projektu.html`, 'M').trida, 'B');
  assert.equal(zaradSoubor(`${S}clanek-novy-text-2026.html`, 'A').trida, 'B');
  assert.equal(zaradSoubor(`${S}indikator-neco.html`, 'A').trida, 'B');
});

test('smazání článku nebo karty je C, úprava je B', () => {
  assert.equal(zaradSoubor(`${S}clanek-stary.html`, 'D').trida, 'C');
  assert.equal(zaradSoubor(`${S}indicators/neco.json`, 'D').trida, 'C');
  assert.equal(zaradSoubor(`${S}clanek-stary.html`, 'M').trida, 'B');
  assert.equal(zaradSoubor(`${S}indicators/neco.json`, 'M').trida, 'B');
});

test('běžný výstup denní rutiny padá do B (ne C), aby ho editor mohl mergovat', () => {
  const r = classify([
    { status: 'A', file: `${S}clanek-doplatky-leky-2025.html` },
    { status: 'M', file: `${S}data/articles.json` },
    { status: 'M', file: `${S}data/claims.json` },
    { status: 'A', file: `${S}indicators/doplatky_leky.json` },
    { status: 'M', file: `${S}data/indicators.json` },
    { status: 'M', file: `${S}data/evidence-audit.json` },
    { status: 'A', file: `${S}assets/covers/clanek-doplatky-leky-2025.svg` },
    { status: 'M', file: `${S}data/legislativa.json` },
    { status: 'M', file: `${S}PLAN-PRACE.md` },
    { status: 'M', file: 'docs/incidents.md' },
  ]);
  assert.equal(r.trida, 'B');
  assert.equal(r.label, LABELS.B);
});

test('čistě mechanické změny jsou A', () => {
  const r = classify([
    { status: 'M', file: `${S}data/legislativa.json` },
    { status: 'M', file: `${S}data/freshness.json` },
    { status: 'A', file: `${S}data/snapshot-2026-10-06.json` },
    { status: 'M', file: `${S}assets/covers/clanek-x.png` },
  ]);
  assert.equal(r.trida, 'A');
});

test('nejvyšší třída vyhrává a neznámá cesta je C', () => {
  assert.equal(classify([`${S}data/legislativa.json`, `${S}clanek-a.html`]).trida, 'B');
  assert.equal(classify([`${S}clanek-a.html`, 'GOVERNANCE.md']).trida, 'C');
  assert.equal(zaradSoubor('nahodny-soubor.bin').trida, 'C');
  assert.equal(zaradSoubor('nahodny-soubor.bin').pravidlo, 'nezarazeno');
});

test('prázdný diff je B (není co automaticky schválit, ale ani důvod k eskalaci)', () => {
  assert.equal(classify([]).trida, 'B');
});

test('markdown souhrn jmenuje rozhodující soubory třídy C', () => {
  const md = markdown(classify([`${S}clanek-a.html`, `${S}data/barometr.json`]));
  assert.match(md, /třída C/);
  assert.match(md, /Rozhodující soubory třídy C: `05_M1_Starter\/data\/barometr\.json`/);
  assert.match(md, /Josef Pavlovic/);
});
