// Testy pure funkcí pro inline glossary tooltips.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortTermsByLengthDesc,
  findFirstOccurrences,
  wordBoundaryRegex,
} from '../src/glossary-inline.js';

const TERMS = [
  { key: 'NIS' },
  { key: 'NIS2' },
  { key: 'OECD' },
  { key: 'ÚZIS' },
];

test('sortTermsByLengthDesc: delší termíny jsou první', () => {
  const sorted = sortTermsByLengthDesc(TERMS);
  // Délky: NIS=3, NIS2=4, OECD=4, ÚZIS=4. Poslední musí být NIS (3 znaky).
  // Pořadí 4-znakových mezi sebou nezáleží, ale musí být před NIS.
  assert.equal(sorted[sorted.length - 1].key, 'NIS');
  for (let i = 0; i < sorted.length - 1; i++) {
    assert.ok(sorted[i].key.length >= sorted[i + 1].key.length,
      `term ${sorted[i].key} (len ${sorted[i].key.length}) musí být před ${sorted[i + 1].key} (len ${sorted[i + 1].key.length})`);
  }
});

test('wordBoundaryRegex: matchuje jen samostatný token', () => {
  assert.ok(wordBoundaryRegex('NIS').test('Zákon o NIS je důležitý'));
  assert.equal(wordBoundaryRegex('NIS').test('NIS2 přichází'), false);
  assert.equal(wordBoundaryRegex('NIS').test('NIS-2 přichází'), false);
  assert.ok(wordBoundaryRegex('NIS2').test('NIS2 přichází'));
});

test('findFirstOccurrences: zachytí jen první výskyt, delší termín má přednost', () => {
  const text = 'OECD vydává data. NIS2 i NIS jsou v zákoně. Druhé OECD už ne.';
  const sorted = sortTermsByLengthDesc(TERMS);
  const used = new Set();
  const out = findFirstOccurrences(text, sorted, used);
  // Očekávám: OECD (start 0), NIS2 (start 18), NIS (start 25)
  const keys = out.map(o => o.term.key);
  assert.ok(keys.includes('OECD'));
  assert.ok(keys.includes('NIS2'));
  assert.ok(keys.includes('NIS'));
  // Output je seřazený podle pozice
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i].start > out[i - 1].start);
  }
  // used mutace
  assert.ok(used.has('OECD'));
  assert.ok(used.has('NIS2'));
  assert.ok(used.has('NIS'));
});

test('findFirstOccurrences: ne-použité termíny v dalším volání', () => {
  const sorted = sortTermsByLengthDesc(TERMS);
  const used = new Set();
  const text1 = 'OECD vydává';
  const out1 = findFirstOccurrences(text1, sorted, used);
  assert.equal(out1.length, 1);

  // Druhé volání — OECD už nesmí matchnout
  const text2 = 'OECD znovu, NIS je tady';
  const out2 = findFirstOccurrences(text2, sorted, used);
  assert.equal(out2.length, 1);
  assert.equal(out2[0].term.key, 'NIS');
});

test('findFirstOccurrences: delší term blokuje overlap kratšího', () => {
  const sorted = sortTermsByLengthDesc(TERMS);
  const used = new Set();
  // NIS2 zabere pozici 0–4, NIS by chtěl 0–3 → musí být skipnut na této pozici
  // ale matchne se na jiném výskytu pokud existuje
  const text = 'NIS2 alone here.';
  const out = findFirstOccurrences(text, sorted, used);
  assert.equal(out.length, 1);
  assert.equal(out[0].term.key, 'NIS2');
});

test('findFirstOccurrences: ignoruje již použité klíče napříč voláními', () => {
  const sorted = sortTermsByLengthDesc(TERMS);
  const used = new Set(['OECD']);
  const text = 'OECD a ÚZIS';
  const out = findFirstOccurrences(text, sorted, used);
  assert.equal(out.length, 1);
  assert.equal(out[0].term.key, 'ÚZIS');
});

test('wordBoundaryRegex: case-sensitive', () => {
  assert.ok(wordBoundaryRegex('OECD').test('OECD a'));
  assert.equal(wordBoundaryRegex('OECD').test('oecd nestačí'), false);
});

test('findFirstOccurrences: zachází s regex meta znaky v klíči', () => {
  const sorted = sortTermsByLengthDesc([{ key: 'C.S.S.' }]);
  const used = new Set();
  const out = findFirstOccurrences('Zkratka C.S.S. patří sem.', sorted, used);
  assert.equal(out.length, 1);
});
