// Diagnóza — testy indexu křížových vazeb (data/diagnoza-index.json).
// Hlídá: (1) commitnutý index je v syncu se zdrojovými datasety,
// (2) žádné mrtvé cizí klíče na indikátory, (3) namátková kontrola spisu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDiagnozaIndex, countLinks } from '../scripts/build-diagnoza-index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'diagnoza-index.json'), 'utf8'));
const indicatorsDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));

test('diagnoza-index.json je v syncu se zdroji (regeneruj a porovnej, kromě generated_at)', () => {
  const fresh = buildDiagnozaIndex();
  // generated_at se liší z principu — porovnáváme zbytek dokumentu
  const strip = (doc) => ({ ...doc, generated_at: null });
  assert.deepEqual(
    strip(fresh),
    strip(committed),
    'data/diagnoza-index.json neodpovídá zdrojům — spusť `npm run build:diagnoza` a commitni výstup',
  );
});

test('každý indikátor v indexu existuje v data/indicators.json', () => {
  const validIds = new Set(indicatorsDoc.indicators.map((i) => i.id));
  for (const iid of Object.keys(committed.indicators)) {
    assert.ok(validIds.has(iid), `indikátor „${iid}“ v indexu nemá záznam v indicators.json`);
  }
});

test('indikátor bez vazby se nezapisuje; struktura spisu drží kontrakt', () => {
  const listKeys = ['articles', 'levers', 'vyhlaska', 'barometr', 'kompas', 'prevence', 'system_nodes'];
  for (const [iid, file] of Object.entries(committed.indicators)) {
    for (const key of listKeys) {
      assert.ok(Array.isArray(file[key]), `${iid}: pole „${key}“ chybí nebo není pole`);
    }
    assert.ok(
      file.region_dataset === null || typeof file.region_dataset === 'string',
      `${iid}: region_dataset musí být string nebo null`,
    );
    assert.ok(countLinks(file) > 0, `${iid}: spis bez jediné vazby nemá v indexu co dělat`);
  }
});

test('namátkou: spis „hospitalizace_acsc“ má aspoň 1 páku a 1 článek', () => {
  const file = committed.indicators.hospitalizace_acsc;
  assert.ok(file, 'hospitalizace_acsc v indexu chybí');
  assert.ok(file.levers.length >= 1, 'čekáme aspoň jednu páku (qof_prevence)');
  assert.ok(file.articles.length >= 1, 'čekáme aspoň jeden článek');
  // páka nese kind z efektu (elasticity|directional)
  for (const lever of file.levers) {
    assert.ok(['elasticity', 'directional'].includes(lever.kind), `neznámý kind páky: ${lever.kind}`);
  }
});
