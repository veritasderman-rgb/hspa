// Guard na volitelný okresní rozpad v data/regions.json (blok `okresy`
// u datasetu — plní ho scripts/fetch-okres-nadeje-doziti.mjs, čte kraje.js
// drill-down). Hlídá konzistenci kódů LAU1 ↔ NUTS3 a věrohodnost hodnot,
// aby drill-down nikdy nezobrazil okres pod špatným krajem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const regions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/regions.json'), 'utf8'));

const KRAJ_CODES = new Set([
  'CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051',
  'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080',
]);

const withOkresy = regions.datasets.filter(d => d.okresy);

test('alespoň jeden dataset nese okresní rozpad (nadeje_doziti_zeny)', () => {
  assert.ok(withOkresy.some(d => d.indicator_id === 'nadeje_doziti_zeny'),
    'nadeje_doziti_zeny má mít blok okresy (plní scripts/fetch-okres-nadeje-doziti.mjs)');
});

test('okresy: struktura, kódy a mapování na kraje', () => {
  for (const d of withOkresy) {
    const ok = d.okresy;
    assert.ok(ok.source, `${d.indicator_id}: okresy.source chybí`);
    assert.ok(ok.period, `${d.indicator_id}: okresy.period chybí`);
    assert.ok(Array.isArray(ok.items) && ok.items.length > 0, `${d.indicator_id}: okresy.items prázdné`);
    for (const o of ok.items) {
      // LAU1: poslední znak jde za 9 do písmen (Středočeský má 12 okresů → CZ020A/B/C)
      assert.match(o.code, /^CZ0[0-9]{2}[0-9A-Z]$/, `${d.indicator_id}: neplatný LAU1 kód ${o.code}`);
      assert.equal(o.kraj, o.code.slice(0, 5),
        `${d.indicator_id}/${o.code}: kraj (${o.kraj}) musí být prefix kódu okresu`);
      assert.ok(KRAJ_CODES.has(o.kraj), `${d.indicator_id}/${o.code}: neznámý kraj ${o.kraj}`);
      assert.ok(typeof o.name === 'string' && o.name.length > 1, `${d.indicator_id}/${o.code}: chybí name`);
      assert.ok(Number.isFinite(o.value), `${d.indicator_id}/${o.code}: hodnota není číslo`);
    }
    // Každý kraj datasetu, který má hodnotu, by měl mít aspoň jeden okres
    // (Praha = 1 okres; jinak by drill-down pro kraj mlčel).
    const okresKraje = new Set(ok.items.map(o => o.kraj));
    for (const r of d.regions || []) {
      assert.ok(okresKraje.has(r.code),
        `${d.indicator_id}: kraj ${r.code} nemá v okresním rozpadu žádný okres`);
    }
  }
});

test('nadeje_doziti_zeny okresy: 77 okresů, e0 ve věrohodném rozsahu, kraj v rozsahu svých okresů', () => {
  const d = regions.datasets.find(x => x.indicator_id === 'nadeje_doziti_zeny');
  if (!d || !d.okresy) return; // pokryto testem výše
  assert.equal(d.okresy.items.length, 77, 'ČR má 77 okresů (vč. Prahy)');
  for (const o of d.okresy.items) {
    assert.ok(o.value >= 70 && o.value <= 95, `${o.name}: e0 ${o.value} mimo rozsah 70–95 let`);
  }
  // §4 sanity: krajská (jednoletá) hodnota leží v rozsahu okresních (5letých) ±1,5 roku.
  for (const r of d.regions) {
    const vals = d.okresy.items.filter(o => o.kraj === r.code).map(o => o.value);
    const mn = Math.min(...vals) - 1.5;
    const mx = Math.max(...vals) + 1.5;
    assert.ok(r.value >= mn && r.value <= mx,
      `${r.code}: krajská hodnota ${r.value} mimo rozsah okresů ${mn}–${mx}`);
  }
});
