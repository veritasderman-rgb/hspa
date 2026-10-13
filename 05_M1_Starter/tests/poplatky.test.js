// Poplatky u lékaře (poplatky.html + data/poplatky.json + src/poplatky-engine.js).
//
// Hlídá: rozhodovací stromy jsou úplné (každá větev končí verdiktem, žádný
// mrtvý uzel), verdikty sedí na závěry stanoviska MZ z 8. 10. 2026 v klíčových
// bodech, dopis se skládá pro všechny typy podání a plné znění stanoviska
// ve stránce je kompletní (9 dokumentů, poznámky pod čarou mají kotvy).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateData, walk, findSituation, buildLetter, formatDateCz, LETTER_TYPES } from '../src/poplatky-engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/poplatky.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'poplatky.html'), 'utf8');

/** Projde všechny cesty stromu a vrátí [answers, verdictId] pro každý list. */
function allPaths(sit) {
  const out = [];
  const rec = (answers) => {
    const step = walk(sit, answers);
    if (step.kind === 'verdict') { out.push([answers, step.id]); return; }
    step.node.moznosti.forEach((_, i) => rec([...answers, i]));
  };
  rec([]);
  return out;
}

const verdictFor = (id, labels) => {
  const sit = findSituation(data, id);
  const answers = [];
  for (const label of labels) {
    const step = walk(sit, answers);
    assert.equal(step.kind, 'question', `${id}: čekal jsem otázku před „${label}“`);
    const i = step.node.moznosti.findIndex((o) => o.label.startsWith(label));
    assert.ok(i >= 0, `${id}: možnost „${label}“ nenalezena`);
    answers.push(i);
  }
  const end = walk(sit, answers);
  assert.equal(end.kind, 'verdict');
  return end.verdict;
};

test('data/poplatky.json: stromy jsou úplné a konzistentní', () => {
  assert.deepEqual(validateData(data), []);
  assert.ok(data.situace.length >= 9);
  for (const k of [1, 2, 3, 4, 5, 6, 7, 8]) {
    assert.ok(data.situace.some((s) => s.kazuistika === k), `chybí situace pro kazuistiku ${k}`);
  }
});

test('každá cesta stromu končí verdiktem a každý verdikt je dosažitelný', () => {
  for (const sit of data.situace) {
    const reached = new Set(allPaths(sit).map(([, v]) => v));
    assert.deepEqual([...reached].sort(), Object.keys(sit.verdikty).sort(), sit.id);
  }
});

test('validateData chytí rozbitý strom', () => {
  const broken = structuredClone(data);
  broken.situace[0].uzly.q1.moznosti[0].dalsi = 'neexistuje';
  broken.situace[1].verdikty.v_ne.cesty = ['nikam'];
  const errs = validateData(broken);
  assert.ok(errs.some((e) => e.includes('neexistující uzel neexistuje')));
  assert.ok(errs.some((e) => e.includes('neznámou cestu nikam')));
});

test('klíčové závěry stanoviska: registrace, objednání, nedostavení', () => {
  assert.equal(verdictFor('registrace', ['Ano, je smluvní', 'Ano, bez platby']).typ, 'ne');
  assert.equal(verdictFor('registrace', ['Ano, je smluvní', 'Ne, je to dobrovolná']).typ, 'zalezi');
  assert.equal(walk(findSituation(data, 'prednostni'), []).verdict.typ, 'ne');
  assert.equal(verdictFor('objednani', ['Ano, je smluvní', 'Ne, jen přes placenou']).typ, 'ne');
  assert.equal(verdictFor('objednani', ['Ano, je smluvní', 'Ano, bezplatná', 'Ne, zdarma až']).typ, 'ne');
  assert.equal(verdictFor('objednani', ['Ano, je smluvní', 'Ano, bezplatná', 'Ano, liší se']).typ, 'ano');
  assert.equal(verdictFor('objednani', ['Ne, je nesmluvní', 'Ano']).typ, 'ne');
  assert.equal(verdictFor('nedostaveni', ['Ne, bylo to jen']).typ, 'ne');
  assert.equal(verdictFor('nedostaveni', ['Ano, výslovně']).typ, 'zalezi');
});

test('klíčové závěry stanoviska: pohotovost, eRecept, zuby, doprovod', () => {
  assert.equal(verdictFor('pohotovost', ['Lékařská nebo zubní', 'Ne']).typ, 'ano');
  assert.match(verdictFor('pohotovost', ['Lékařská nebo zubní', 'Ne']).titulek, /90 Kč/);
  assert.equal(verdictFor('pohotovost', ['Lékařská nebo zubní', 'Ano']).typ, 'ne');
  assert.equal(verdictFor('pohotovost', ['Urgentní příjem']).typ, 'ne');
  assert.equal(verdictFor('pohotovost', ['Lékárna', 'Ano, hrazený']).typ, 'ne');
  assert.equal(verdictFor('pohotovost', ['Lékárna', 'Ne —']).typ, 'ano');
  const erecept = walk(findSituation(data, 'erecept'), []).verdict;
  assert.equal(erecept.typ, 'ne');
  assert.ok(erecept.cesty.includes('sukl'), 'eRecept → SÚKL');
  assert.equal(verdictFor('hygiena', ['Ano, je smluvní', 'Ano, bez ní']).typ, 'ne');
  assert.equal(verdictFor('hygiena', ['Ne, je nesmluvní', 'Ano']).typ, 'ne');
  assert.equal(verdictFor('hygiena', ['Ne, je nesmluvní', 'Ne, běžná']).typ, 'zalezi');
  assert.equal(verdictFor('prohlidka', ['Dítě do 18']).typ, 'ne');
  assert.equal(verdictFor('prohlidka', ['Těhotná']).typ, 'ne');
  assert.equal(verdictFor('prohlidka', ['Dospělý — zubař']).typ, 'ne');
  assert.equal(verdictFor('prohlidka', ['Dospělý — chci']).typ, 'ano');
  assert.equal(verdictFor('doprovod', ['Za samotnou']).typ, 'ne');
  assert.equal(verdictFor('doprovod', ['Pobyt s lůžkem', 'Ano']).typ, 'ne');
  assert.match(verdictFor('doprovod', ['Pobyt s lůžkem', 'Ne']).text, /572 Kč/);
});

test('buildLetter: všechny typy podání, vyplněná i prázdná pole', () => {
  const today = new Date(2026, 9, 13);
  for (const typ of Object.keys(LETTER_TYPES)) {
    const empty = buildLetter(data, { typ, situace: 'registrace' }, today);
    assert.match(empty, /\[jméno a příjmení\]/);
    assert.match(empty, /dne 13\. 10\. 2026/);
    assert.match(empty, /MZDR 25582\/2026-2\/DZP/);
  }
  const full = buildLetter(data, {
    typ: 'podnet', situace: 'erecept', jmeno: 'Jana Nováková', adresa: 'Hlavní 1, Brno',
    poskytovatel: 'MUDr. X, Ulice 2, Brno', datum: '2026-10-01', castka: '300', zaplaceno: 'ano',
    popis: 'Chtěli roční paušál.', pojistovna: 'VZP (111)',
  }, today);
  assert.match(full, /^Jana Nováková\nHlavní 1, Brno/);
  assert.match(full, /Dne 1\. 10\. 2026 .* 300 Kč/);
  assert.match(full, /§ 80 odst\. 4 zákona č\. 378\/2007 Sb\./);
  assert.match(full, /§ 42 správního řádu/);
  assert.match(full, /doklad o zaplacení přikládám/);
  assert.doesNotMatch(full, /undefined|null/);
  const kraj = buildLetter(data, { typ: 'kraj', situace: 'jine' }, today);
  assert.match(kraj, /§ 93 odst\. 2/);
  assert.match(kraj, /Stížnost jsem nejprve podal\(a\) poskytovateli/);
});

test('formatDateCz', () => {
  assert.equal(formatDateCz('2026-10-08'), '8. 10. 2026');
  assert.equal(formatDateCz(''), '');
});

test('poplatky.html: plné znění má všech 9 dokumentů a funkční poznámky', () => {
  for (const id of ['ob', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8']) {
    assert.match(html, new RegExp(`<details class="pop-doc" id="zneni-${id}">`), `chybí dokument ${id}`);
  }
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const dangling = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((h) => !ids.has(h));
  assert.deepEqual(dangling, [], 'interní kotvy bez cíle');
  // obecná část: 56 poznámek, každá odkázaná z textu
  const obRefs = new Set([...html.matchAll(/href="#zneni-ob-fn-(\d+)"/g)].map((m) => Number(m[1])));
  assert.equal(obRefs.size, 56);
  // čísla jednací všech devíti částí
  for (let i = 1; i <= 9; i++) assert.ok(html.includes(`MZDR 25582/2026-${i}/DZP`), `č. j. -${i}`);
});

test('poplatky.html: poděkování zpracovatelce a odkazy na ohlasy', () => {
  assert.match(html, /Děkujeme Aleně Fikejzové/);
  assert.match(html, /id="ohlasy"/);
  assert.match(html, /zdravotnickydenik\.cz\/2026\/10\/poplatky-lekari-pacienti/);
  assert.match(html, /mzd\.gov\.cz\/tiskove-centrum-mz\/za-co-u-lekare-platit-muzete/);
});
