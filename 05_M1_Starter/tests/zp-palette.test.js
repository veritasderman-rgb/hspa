// Paleta pojišťoven (src/zp-palette.js + tokeny --zp-* v src/styles.css).
// Hlídá: 7 unikátních kódů v pevném pořadí, shodu s data/pojistovny.json,
// definici každého tokenu v :root i :root[data-theme="dark"], žádný hex v JS modulu
// a to, že Srovnávač i Atlas berou barvy ze stejné palety.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZP, ZP_BY_KOD, zpColor, zpColorResolved, onThemeChange } from '../src/zp-palette.js';
import { ZP_COLOR } from '../src/pojistovny-shared.js';
import { ZP_COLORS } from '../src/pojistenci.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8'));

const KODY = ['111', '201', '205', '207', '209', '211', '213'];

// Jen sekce paleta (od markeru po další marker), aby test nechytal --zp-* odjinud.
const start = css.indexOf('/* === Srovnávač pojišťoven: tokeny palety pojišťoven (--zp-*)');
assert.ok(start >= 0, 'v styles.css chybí marker sekce tokenů palety pojišťoven');
const next = css.indexOf('/* === Srovnávač pojišťoven:', start + 10);
const section = css.slice(start, next < 0 ? undefined : next);
const sectionBlock = (selector) => {
  const i = section.indexOf(`\n${selector} {`);
  assert.ok(i >= 0, `v sekci --zp-* chybí blok ${selector}`);
  return section.slice(i, section.indexOf('}', i));
};

test('zp-palette: 7 unikátních kódů v pevném pořadí podle kódu', () => {
  assert.deepEqual(ZP.map((z) => z.kod), KODY);
  assert.equal(new Set(ZP.map((z) => z.token)).size, 7);
  assert.deepEqual(ZP.map((z) => z.kod), [...ZP.map((z) => z.kod)].sort());
  for (const z of ZP) {
    assert.equal(z.token, `--zp-${z.kod}`);
    assert.equal(ZP_BY_KOD[z.kod], z);
  }
});

test('zp-palette: kódy, zkratky a názvy odpovídají data/pojistovny.json', () => {
  const data = DATA.pojistovny.map((z) => [z.kod, z.zkratka, z.nazev]);
  assert.deepEqual(ZP.map((z) => [z.kod, z.zkratka, z.nazev]), data);
});

test('zp-palette: každý token je definovaný v :root i v :root[data-theme="dark"]', () => {
  const light = sectionBlock(':root');
  const dark = sectionBlock(':root[data-theme="dark"]');
  for (const z of ZP) {
    assert.match(light, new RegExp(`${z.token}:\\s*#[0-9a-f]{6}\\s*;`, 'i'), `${z.token} chybí v :root`);
    assert.match(dark, new RegExp(`${z.token}:\\s*#[0-9a-f]{6}\\s*;`, 'i'), `${z.token} chybí v dark`);
  }
  assert.match(light, /--zp-neutral:\s*var\(--neutral\)/, '--zp-neutral = --neutral');
});

test('zp-palette: light i dark hexy jsou unikátní a VZP už není červená', () => {
  const hexes = (block) => ZP.map((z) => block.match(new RegExp(`${z.token}:\\s*(#[0-9a-f]{6})`, 'i'))[1].toLowerCase());
  for (const block of [sectionBlock(':root'), sectionBlock(':root[data-theme="dark"]')]) {
    const hx = hexes(block);
    assert.equal(new Set(hx).size, 7, 'barvy v rámci tématu musí být unikátní');
  }
  // VZP (dříve brand červená v Atlasu) je modrá: dominantní B, ne R (kolize s --red/--bad).
  for (const block of [sectionBlock(':root'), sectionBlock(':root[data-theme="dark"]')]) {
    const [r, , b] = [1, 3, 5].map((i) => parseInt(hexes(block)[0].slice(i, i + 2), 16));
    assert.ok(b > r, 'VZP musí být modrá, ne červená');
  }
});

test('zp-palette: zpColor() vrací token, neznámý kód → neutral', () => {
  assert.equal(zpColor('111'), 'var(--zp-111)');
  assert.equal(zpColor(213), 'var(--zp-213)');
  assert.equal(zpColor('999'), 'var(--zp-neutral)');
  assert.equal(zpColor(undefined), 'var(--zp-neutral)');
  assert.equal(zpColor(''), 'var(--zp-neutral)');
});

test('zp-palette: zpColorResolved() čte token přes getComputedStyle, bez hodnoty vrací var()', () => {
  // bez DOMu (node) → token
  assert.equal(zpColorResolved('205'), 'var(--zp-205)');
  assert.equal(zpColorResolved('999'), 'var(--zp-neutral)');
  // s fake elementem a getComputedStyle
  const prev = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => (n === '--zp-111' ? '  #123456 ' : '') });
  try {
    assert.equal(zpColorResolved('111', {}), '#123456');
    assert.equal(zpColorResolved('201', {}), 'var(--zp-201)'); // prázdná hodnota → fallback
  } finally {
    if (prev === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = prev;
  }
});

test('zp-palette: onThemeChange() bez DOMu je no-op a vrací odpojovací funkci', () => {
  const off = onThemeChange(() => {});
  assert.equal(typeof off, 'function');
  off();
});

test('zp-palette: žádný hex v zp-palette.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'zp-palette.js'), 'utf8');
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, 'barvy patří do styles.css (tokeny), ne do JS');
});

test('Srovnávač i Atlas sdílejí jednu paletu', () => {
  for (const z of ZP) {
    assert.equal(ZP_COLOR[z.kod], zpColor(z.kod), `ZP_COLOR[${z.kod}]`);
    // v node bez DOMu je přeložená barva Atlasu token; v prohlížeči hex téhož tokenu
    assert.equal(ZP_COLORS[z.kod], zpColorResolved(z.kod), `ZP_COLORS[${z.kod}]`);
  }
  assert.deepEqual(Object.keys(ZP_COLOR), KODY);
});

test('pojistenci.js: v grafech nejsou natvrdo inkoustové hexy ani font Inter (tokeny přes themeTokens)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistenci.js'), 'utf8');
  for (const lit of ['#1f1a14', '#5a5347', '#e8e2d4', '#fffaf2', 'Inter,']) {
    assert.ok(!src.toLowerCase().includes(lit.toLowerCase()), `pojistenci.js obsahuje natvrdo ${lit}`);
  }
  assert.match(src, /onThemeChange\(/, 'grafy se musí překreslit při změně tématu');
});
