// Testy pro disclaimer + cross-link na dohodovací řízení v Financování modulu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FINANCOVANI = fs.readFileSync(path.join(ROOT, 'financovani.html'), 'utf8');
const POSKYTOVATELE = fs.readFileSync(path.join(ROOT, 'financovani-poskytovatele.html'), 'utf8');

test('financovani.html — obsahuje hlavní disclaimer blok', () => {
  assert.match(FINANCOVANI, /class="fn-disclaimer"/);
  assert.match(FINANCOVANI, /Stáří dat, status a predikce/);
});

test('financovani.html — disclaimer pokrývá všech 5 sekcí (Sankey, trend, mapa, 7 ZP, providers)', () => {
  const block = FINANCOVANI.match(/class="fn-disclaimer-list">([\s\S]*?)<\/ul>/)?.[1] ?? '';
  assert.match(block, /Sankey/, 'pokrývá Sankey');
  assert.match(block, /Časová řada/, 'pokrývá trend');
  assert.match(block, /Mapa krajů/, 'pokrývá mapu');
  assert.match(block, /Porovnání 7 ZP/, 'pokrývá 7 ZP');
  assert.match(block, /Drill-down poskytovatelé/, 'pokrývá providers');
});

test('financovani.html — disclaimer odkazuje na dohodovací řízení analýzu', () => {
  assert.match(FINANCOVANI, /dohodovaci-rizeni\.html\?view=analyza/);
});

test('financovani.html — predikční rok 2024 je explicitně označen', () => {
  assert.match(FINANCOVANI, /odhad\/predikce|predikce|odhad/i);
  assert.match(FINANCOVANI, /září roku N\+2/);
});

test('financovani.html — hero karta meziroční růst má marker hvězdičky', () => {
  assert.match(FINANCOVANI, /fn-stat-estimate/);
});

test('financovani.html — related card pro dohodovací řízení odkazuje na ?view=analyza', () => {
  // hledáme blok jen pro related card (ne disclaimer-link)
  const cardBlock = FINANCOVANI.match(/<a class="fn-related-card" href="dohodovaci-rizeni[^"]*"[\s\S]{0,400}/);
  assert.ok(cardBlock, 'related card pro dohodovaci-rizeni musí existovat');
  assert.match(cardBlock[0], /\?view=analyza/);
});

test('financovani-poskytovatele.html — caveat sekce odkazuje na dohodovací řízení analýzu', () => {
  assert.match(POSKYTOVATELE, /class="fnp-caveat-link"/);
  assert.match(POSKYTOVATELE, /dohodovaci-rizeni\.html\?view=analyza/);
});

test('financovani-poskytovatele.html — caveat-link zmiňuje rozdíl 2024 plánovaný vs. 2023 finální', () => {
  const linkBlock = POSKYTOVATELE.match(/class="fnp-caveat-link"[\s\S]*?<\/p>/)?.[0] ?? '';
  assert.match(linkBlock, /2024/);
  assert.match(linkBlock, /2023/);
});
