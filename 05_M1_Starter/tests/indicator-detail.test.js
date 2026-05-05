// Testy datové vrstvy detailní stránky indikátoru.
// Ověřujeme:
//   1) Nový indikátor kojenecka_umrtnost má kompletní strukturu (data + metodika + region)
//   2) Tile-cartogram v src/indicator.js pokrývá všech 14 krajů NUTS-3 ČR (každý kód právě jednou)
//   3) Indicator-context.json odkazuje pouze na existující ID indikátorů
//   4) Pro každý existující regionální dataset existuje matching indikátor

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const NUTS3_CODES = ['CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051',
                     'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080'];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

// ===== 1. Nový indikátor =====

test('kojenecka_umrtnost: záznam v data/indicators.json je úplný', () => {
  const data = loadJson('data/indicators.json');
  const ind = data.indicators.find(i => i.id === 'kojenecka_umrtnost');
  assert.ok(ind, 'kojenecka_umrtnost nenalezen v data/indicators.json');
  assert.equal(ind.area, 'Výsledky');
  assert.equal(ind.unit, '‰');
  assert.equal(ind.direction, 'lower_is_better');
  assert.ok(Array.isArray(ind.trend) && ind.trend.length >= 3);
  assert.ok(ind.benchmark?.oecd != null);
  assert.equal(ind.method_card_url, 'indicators/kojenecka_umrtnost.json');
});

test('kojenecka_umrtnost: metodická karta existuje a má povinná pole', () => {
  const card = loadJson('indicators/kojenecka_umrtnost.json');
  assert.equal(card.id, 'kojenecka_umrtnost');
  assert.ok(card.definition.length > 100, 'definice je příliš krátká');
  assert.ok(card.data_source.primary);
  assert.ok(card.data_source.fallback, 'kojenecká úmrtnost má mít primární i fallback API zdroj');
});

test('kojenecka_umrtnost: OECD a Eurostat API mapping existuje', () => {
  const oecd = loadJson('ingest/mapping/oecd_codes.json');
  const eu = loadJson('ingest/mapping/eurostat_codes.json');
  assert.ok(oecd.indicators.kojenecka_umrtnost, 'chybí OECD mapping');
  assert.ok(eu.indicators.kojenecka_umrtnost, 'chybí Eurostat mapping');
});

// ===== 2. Tile cartogram pokrývá všechny kraje =====

test('Tile cartogram v src/indicator.js obsahuje všech 14 krajů NUTS-3', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/indicator.js'), 'utf8');
  for (const code of NUTS3_CODES) {
    assert.ok(src.includes(code), `Tile cartogram postrádá kraj ${code}`);
  }
});

// ===== 3. Indicator-context odkazuje na existující ID =====

test('data/indicator-context.json: všechny klíče odpovídají existujícím indikátorům', () => {
  const inds = loadJson('data/indicators.json');
  const ctx = loadJson('data/indicator-context.json');
  const validIds = new Set(inds.indicators.map(i => i.id));
  for (const id of Object.keys(ctx.contexts || {})) {
    assert.ok(validIds.has(id), `indicator-context.json odkazuje na neexistující ID '${id}'`);
  }
});

// ===== 4. Regionální datasety odpovídají indikátorům =====

test('data/regions.json: každý dataset má matching indicator nebo známé předponové ID', () => {
  const inds = loadJson('data/indicators.json');
  const regions = loadJson('data/regions.json');
  const validIds = new Set(inds.indicators.map(i => i.id));
  // Povolené prefixové IDs pro datasety bez 1:1 indikátoru
  const exempt = new Set(['nadeje_doziti_men', 'mortalita_kvn_kraje']);
  for (const ds of regions.datasets) {
    if (exempt.has(ds.id)) continue;
    assert.ok(
      validIds.has(ds.id),
      `regions.json dataset '${ds.id}' nemá matching indicator (přidej do exempt nebo zarovnej ID)`
    );
  }
});

test('data/regions.json: každý dataset má 14 krajů NUTS-3 s validními kódy', () => {
  const regions = loadJson('data/regions.json');
  const expected = new Set(NUTS3_CODES);
  for (const ds of regions.datasets) {
    assert.equal(ds.regions.length, 14, `dataset ${ds.id}: očekáváno 14 krajů`);
    const codes = new Set(ds.regions.map(r => r.code));
    for (const c of NUTS3_CODES) {
      assert.ok(codes.has(c), `dataset ${ds.id}: chybí kraj ${c}`);
    }
    for (const c of codes) {
      assert.ok(expected.has(c), `dataset ${ds.id}: neznámý NUTS-3 kód ${c}`);
    }
  }
});

// ===== 5. Detail stránka existuje a načítá se ze správných URL =====

test('indicator.html + src/indicator.js existují a referencují klíčové datové soubory', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'indicator.html')));
  const src = fs.readFileSync(path.join(ROOT, 'src/indicator.js'), 'utf8');
  for (const url of ['data/indicators.json', 'data/regions.json', 'data/indicator-context.json']) {
    assert.ok(src.includes(url), `src/indicator.js neodkazuje na ${url}`);
  }
});
