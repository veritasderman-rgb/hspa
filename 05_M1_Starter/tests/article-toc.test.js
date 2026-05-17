// Testy pure funkcí pro Article TOC.
// Auto-bootstrap (enhanceArticleToc) je DOM-only — testy se zaměřují na slug/index.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug, buildHeadingIndex } from '../src/article-toc.js';

// ===== slugify =====

test('slugify: ASCII slug z české diakritiky', () => {
  assert.equal(slugify('Čísla: kde deficit je'), 'cisla-kde-deficit-je');
  assert.equal(slugify('Naděje dožití při narození'), 'nadeje-doziti-pri-narozeni');
  assert.equal(slugify('Šest dimenzí výkonu'), 'sest-dimenzi-vykonu');
});

test('slugify: collapse multiple separators', () => {
  assert.equal(slugify('Hello   world!!! 2026'), 'hello-world-2026');
  assert.equal(slugify('   leading spaces   '), 'leading-spaces');
});

test('slugify: fallback na "section" pro prázdný/whitespace/symboly', () => {
  assert.equal(slugify(''), 'section');
  assert.equal(slugify(null), 'section');
  assert.equal(slugify('   '), 'section');
  assert.equal(slugify('!@#$%'), 'section');
});

test('slugify: limit délky na 60 znaků', () => {
  const long = 'A'.repeat(100);
  assert.ok(slugify(long).length <= 60);
});

// ===== uniqueSlug =====

test('uniqueSlug: bez kolize vrátí base', () => {
  assert.equal(uniqueSlug('foo', new Set()), 'foo');
});

test('uniqueSlug: kolize → suffix -2', () => {
  assert.equal(uniqueSlug('foo', new Set(['foo'])), 'foo-2');
});

test('uniqueSlug: postupně inkrementuje', () => {
  assert.equal(uniqueSlug('foo', new Set(['foo', 'foo-2', 'foo-3'])), 'foo-4');
});

// ===== buildHeadingIndex (s fake DOM) =====

test('buildHeadingIndex: skenuje h3, doplňuje ID, vrací seznam', () => {
  // Minimální fake DOM imitující querySelector behaviour
  const h1 = makeH('Čísla', null);
  const h2 = makeH('Anatomie', 'custom-id');
  const h3 = makeH('Čísla', null); // kolize sluggu s h1
  const headings = [h1, h2, h3];
  const idAttrs = [{ id: 'existing-id' }]; // existující ID v body

  const body = {
    querySelectorAll(sel) {
      if (sel === '[id]') return idAttrs;
      if (sel === 'h3') return headings;
      return [];
    },
  };

  const out = buildHeadingIndex(body);
  assert.equal(out.length, 3);
  assert.equal(out[0].id, 'cisla');
  assert.equal(out[0].text, 'Čísla');
  assert.equal(out[1].id, 'custom-id'); // existing preserved
  assert.equal(out[2].id, 'cisla-2'); // kolize handled
  // ID se zapsalo do mock element (mutace)
  assert.equal(h1.id, 'cisla');
  assert.equal(h3.id, 'cisla-2');
});

function makeH(text, existingId) {
  return {
    textContent: text,
    id: existingId ?? '',
  };
}
