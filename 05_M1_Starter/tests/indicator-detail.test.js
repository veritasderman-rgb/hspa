// Testy pro čisté funkce z src/indicator-detail.js.
// Nevyžaduje DOM — modul volá init() pouze pokud typeof window !== 'undefined'.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRegionalDataset, tileColor, getInfluence, TILE_LAYOUT } from '../src/indicator-detail.js';

// ===== findRegionalDataset =====

test('findRegionalDataset: vrací null pro null regionsRoot', () => {
  assert.equal(findRegionalDataset(null, { id: 'nadeje_doziti_total' }), null);
});

test('findRegionalDataset: vrací null pro prázdný datasets array', () => {
  assert.equal(findRegionalDataset({ datasets: [] }, { id: 'nadeje_doziti_total' }), null);
});

test('findRegionalDataset: vrací null pokud regionsRoot nemá datasets', () => {
  assert.equal(findRegionalDataset({}, { id: 'nadeje_doziti_total' }), null);
});

test('findRegionalDataset: shoda přes indicator_id', () => {
  const ds1 = { indicator_id: 'kojenecka_umrtnost', id: 'ds-kojenci', regions: [] };
  const ds2 = { indicator_id: 'nadeje_doziti_total', id: 'ds-doziti', regions: [] };
  const regionsRoot = { datasets: [ds1, ds2] };
  const result = findRegionalDataset(regionsRoot, { id: 'kojenecka_umrtnost' });
  assert.equal(result, ds1);
});

test('findRegionalDataset: fallback shoda přes dataset id', () => {
  // Dataset nemá indicator_id — fallback na d.id === indicator.id
  const ds1 = { id: 'mortalita_kardiovaskularni', regions: [] };
  const ds2 = { id: 'jiny_dataset', regions: [] };
  const regionsRoot = { datasets: [ds1, ds2] };
  const result = findRegionalDataset(regionsRoot, { id: 'mortalita_kardiovaskularni' });
  assert.equal(result, ds1);
});

test('findRegionalDataset: indicator_id shoda má přednost před id shodou', () => {
  // ds1 má id shodující se s indicator.id, ale ds2 má indicator_id shodu — ds2 by měl vyhrát
  const ds1 = { id: 'kojenecka_umrtnost', regions: [] };
  const ds2 = { indicator_id: 'kojenecka_umrtnost', id: 'ds-kojenci-2', regions: [] };
  const regionsRoot = { datasets: [ds1, ds2] };
  const result = findRegionalDataset(regionsRoot, { id: 'kojenecka_umrtnost' });
  assert.equal(result, ds2);
});

test('findRegionalDataset: vrací null pokud žádný dataset neodpovídá', () => {
  const regionsRoot = { datasets: [{ indicator_id: 'jiny', id: 'jiny2', regions: [] }] };
  assert.equal(findRegionalDataset(regionsRoot, { id: 'neexistujici' }), null);
});

// ===== tileColor =====

test('tileColor: vrací #E2E8F0 pro null hodnotu', () => {
  const result = tileColor(null, 79, 'higher_is_better', [76, 78, 80, 82]);
  assert.equal(result, '#E2E8F0');
});

test('tileColor: vrací #F1F5F9 pro hodnotu blízko průměru (do 5 % rozsahu)', () => {
  // countryAvg = 79, allValues [76..82], range = max(79-76, 82-79) = 3
  // value = 79.1, diffNorm = 0.1/3 ≈ 0.033 < 0.05 → near average
  const result = tileColor(79.1, 79, 'higher_is_better', [76, 78, 80, 82]);
  assert.equal(result, '#F1F5F9');
});

test('tileColor: vrací zelenou rgba pro region lepší než průměr při higher_is_better', () => {
  // value = 82, countryAvg = 79, allValues [76..82]
  // range = max(79-76, 82-79) = 3, diffNorm = 3/3 = 1 > 0 → isBetter = true
  const result = tileColor(82, 79, 'higher_is_better', [76, 78, 79, 80, 82]);
  assert.match(result, /^rgba\(56, 118, 29,/);
});

test('tileColor: vrací zelenou rgba pro region s nižší mortalitou při lower_is_better', () => {
  // Nižší hodnota je lepší při lower_is_better
  // value = 76, countryAvg = 79, allValues [76..82]
  // diffNorm = (76-79)/3 = -1 < 0 → isBetter = true (lower_is_better)
  const result = tileColor(76, 79, 'lower_is_better', [76, 78, 79, 80, 82]);
  assert.match(result, /^rgba\(56, 118, 29,/);
});

test('tileColor: vrací hnědou rgba pro region horší než průměr při higher_is_better', () => {
  // value = 76, countryAvg = 79, allValues [76..82]
  // diffNorm = (76-79)/3 = -1 < 0 → isBetter = false (higher_is_better)
  const result = tileColor(76, 79, 'higher_is_better', [76, 78, 79, 80, 82]);
  assert.match(result, /^rgba\(180, 95, 6,/);
});

test('tileColor: vrací hnědou rgba pro region s vyšší mortalitou při lower_is_better', () => {
  // Vyšší hodnota je horší při lower_is_better
  // value = 82, countryAvg = 79, allValues [76..82]
  // diffNorm = (82-79)/3 = 1 > 0 → isBetter = false (lower_is_better)
  const result = tileColor(82, 79, 'lower_is_better', [76, 78, 79, 80, 82]);
  assert.match(result, /^rgba\(180, 95, 6,/);
});

test('tileColor: opacity je v platném rozsahu (0–1) pro krajní hodnoty', () => {
  // Intenzita 1 pro nejvzdálenější region
  const green = tileColor(82, 79, 'higher_is_better', [76, 78, 79, 80, 82]);
  // rgba(56, 118, 29, X) — extrahujeme X
  const opacityMatch = green.match(/rgba\(56, 118, 29, ([\d.]+)\)/);
  assert.ok(opacityMatch, 'zelená rgba by měla odpovídat vzoru');
  const opacity = parseFloat(opacityMatch[1]);
  assert.ok(opacity > 0 && opacity <= 1, `opacity ${opacity} by měla být v rozsahu (0, 1]`);
});

// ===== getInfluence =====

test('getInfluence: vrací bespoke záznam pro kojenecka_umrtnost', () => {
  const inf = getInfluence('kojenecka_umrtnost');
  assert.ok(typeof inf.why === 'string', '.why by mělo být string');
  assert.ok(typeof inf.factors === 'object' && Array.isArray(inf.factors), '.factors by mělo být pole');
  assert.ok(typeof inf.levers === 'object' && Array.isArray(inf.levers), '.levers by mělo být pole');
  // Zkontrolujeme stabilní fráze z textu .why (zrcadlíme přesný obsah source)
  assert.ok(
    inf.why.includes('perinatologické'),
    `.why by mělo zmiňovat "perinatologické", dostali jsme: "${inf.why.slice(0, 80)}..."`
  );
  assert.ok(
    inf.why.includes('WHO'),
    `.why by mělo zmiňovat "WHO"`
  );
  assert.ok(
    inf.why.includes('neonatologické'),
    `.why by mělo zmiňovat "neonatologické"`
  );
});

test('getInfluence: bespoke kojenecka_umrtnost má neprázdné faktory a páky', () => {
  const inf = getInfluence('kojenecka_umrtnost');
  assert.ok(inf.factors.length > 0, '.factors by nemělo být prázdné');
  assert.ok(inf.levers.length > 0, '.levers by nemělo být prázdné');
});

test('getInfluence: vrací bespoke záznam pro mortalita_kardiovaskularni', () => {
  const inf = getInfluence('mortalita_kardiovaskularni');
  assert.ok(inf.why.includes('Kardiovaskulární'), '.why by mělo zmiňovat "Kardiovaskulární"');
  assert.ok(inf.factors.length >= 3, 'mělo by mít alespoň 3 faktory');
});

test('getInfluence: vrací bespoke záznam pro cekaci_doba_kycel', () => {
  const inf = getInfluence('cekaci_doba_kycel');
  assert.ok(inf.why.includes('kyčle'), '.why by mělo zmiňovat kyčle');
});

test('getInfluence: vrací obecný fallback pro neznámé id', () => {
  const inf = getInfluence('neexistujici_indikator_xyz');
  assert.ok(typeof inf.why === 'string');
  assert.ok(Array.isArray(inf.factors));
  assert.ok(Array.isArray(inf.levers));
  // Generický fallback má přesně 4 faktory — splňuje požadavek ≥ 4
  assert.ok(inf.factors.length >= 4, `obecný fallback by měl mít ≥ 4 faktory, má ${inf.factors.length}`);
});

test('getInfluence: fallback .why zmiňuje HSPA rámec', () => {
  const inf = getInfluence('zcela_neznamy_klic');
  assert.ok(inf.why.includes('HSPA'), '.why fallbacku by mělo zmiňovat "HSPA"');
});

test('getInfluence: fallback pro dvě různá neznámá id vrací identický objekt', () => {
  const a = getInfluence('id_prvni');
  const b = getInfluence('id_druhy');
  // Oba by měly být stejný generic objekt
  assert.deepEqual(a, b);
});

// ===== TILE_LAYOUT =====

test('TILE_LAYOUT: má přesně 14 záznamů', () => {
  const keys = Object.keys(TILE_LAYOUT);
  assert.equal(keys.length, 14, `očekáváno 14 regionů, nalezeno ${keys.length}`);
});

test('TILE_LAYOUT: obsahuje CZ010 (Praha)', () => {
  assert.ok('CZ010' in TILE_LAYOUT, 'chybí CZ010 (Praha)');
  assert.equal(TILE_LAYOUT.CZ010.short, 'PR');
  assert.equal(TILE_LAYOUT.CZ010.name, 'Praha');
});

test('TILE_LAYOUT: obsahuje CZ080 (Moravskoslezský)', () => {
  assert.ok('CZ080' in TILE_LAYOUT, 'chybí CZ080 (Moravskoslezský)');
  assert.equal(TILE_LAYOUT.CZ080.short, 'MS');
  assert.equal(TILE_LAYOUT.CZ080.name, 'Moravskoslezský');
});

test('TILE_LAYOUT: každý záznam má col, row, short a name', () => {
  for (const [code, t] of Object.entries(TILE_LAYOUT)) {
    assert.ok(typeof t.col === 'number', `${code}: col by měl být číslo`);
    assert.ok(typeof t.row === 'number', `${code}: row by měl být číslo`);
    assert.ok(typeof t.short === 'string' && t.short.length > 0, `${code}: short by měl být neprázdný string`);
    assert.ok(typeof t.name === 'string' && t.name.length > 0, `${code}: name by měl být neprázdný string`);
  }
});

test('TILE_LAYOUT: col a row jsou kladná celá čísla', () => {
  for (const [code, t] of Object.entries(TILE_LAYOUT)) {
    assert.ok(Number.isInteger(t.col) && t.col > 0, `${code}: col=${t.col} by měl být kladné celé číslo`);
    assert.ok(Number.isInteger(t.row) && t.row > 0, `${code}: row=${t.row} by měl být kladné celé číslo`);
  }
});

test('TILE_LAYOUT: všechny kódy mají formát CZ + 3 číslic', () => {
  for (const code of Object.keys(TILE_LAYOUT)) {
    assert.match(code, /^CZ\d{3}$/, `kód ${code} neodpovídá formátu NUTS-3 CZxxx`);
  }
});
