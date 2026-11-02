// Testy interakcí srovnávače pojišťoven — src/zp-interact.js (P1.3).
// Projekt nemá jsdom/happy-dom: testujeme čisté funkce, renderMojeZpChips přes
// minimální vlastní DOM stub a kontrakt stringů (CSS sekce, zdroj modulu).
// Skutečné chování v prohlížeči (klik, hover, reduced motion) ověřuje Playwright.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  easeOutQuart, clampTipPosition, sortRowsByLevel, nextSortDir,
  readMojeZp, writeMojeZp, normalizeZpList, renderMojeZpChips,
  ZP_FALLBACK, ZP_KODY, STORAGE_KEY, MOJE_EVENT, HOVER_PREFIX,
} from '../src/zp-interact.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'src', 'zp-interact.js'), 'utf8');
const MARKER = '/* === Srovnávač pojišťoven: interakce src/zp-interact.js (.zpi-) — plní balíček P1.3 === */';

// --- stub úložiště -----------------------------------------------------------
function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _m: m,
  };
}
const throwingStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

// --- easing --------------------------------------------------------------------
test('easeOutQuart: 0 → 0, 1 → 1, monotónní a nad lineární', () => {
  assert.equal(easeOutQuart(0), 0);
  assert.equal(easeOutQuart(1), 1);
  let prev = 0;
  for (let t = 0.1; t <= 1; t += 0.1) {
    const v = easeOutQuart(t);
    assert.ok(v >= prev);
    assert.ok(v >= t - 1e-9);
    prev = v;
  }
});

// --- clampTipPosition ----------------------------------------------------------
const VP = { width: 400, height: 600 };
const TIP = { width: 120, height: 40 };

test('clampTipPosition: výchozí umístění nad markem, vycentrované', () => {
  const r = { left: 150, top: 300, right: 190, bottom: 320, width: 40, height: 20 };
  const p = clampTipPosition(r, TIP, VP);
  assert.equal(p.placement, 'above');
  assert.equal(p.left, 150 + 20 - 60);
  assert.equal(p.top, 300 - 40 - 8);
});

test('clampTipPosition: levý a pravý okraj viewportu se drží v mezích', () => {
  const left = clampTipPosition({ left: 0, top: 300, right: 10, bottom: 320, width: 10, height: 20 }, TIP, VP);
  assert.equal(left.left, 8);
  const right = clampTipPosition({ left: 390, top: 300, right: 400, bottom: 320, width: 10, height: 20 }, TIP, VP);
  assert.equal(right.left, 400 - 120 - 8);
});

test('clampTipPosition: nahoře nezbývá místo → pod markem', () => {
  const p = clampTipPosition({ left: 100, top: 20, right: 140, bottom: 40, width: 40, height: 20 }, TIP, VP);
  assert.equal(p.placement, 'below');
  assert.equal(p.top, 40 + 8);
});

test('clampTipPosition: nevejde se ani pod → přitlačí se ke spodnímu okraji', () => {
  const p = clampTipPosition({ left: 100, top: 10, right: 140, bottom: 590, width: 40, height: 580 }, TIP, VP);
  assert.equal(p.top, 600 - 40 - 8);
});

test('clampTipPosition: tooltip širší než viewport → zarovnán doleva s okrajem', () => {
  const p = clampTipPosition({ left: 10, top: 300, right: 20, bottom: 310, width: 10, height: 10 },
    { width: 500, height: 30 }, VP);
  assert.equal(p.left, 8);
});

// --- sortRowsByLevel -----------------------------------------------------------
function row(id, ...levels) {
  return {
    id,
    cells: levels.map((l) => ({
      getAttribute: (n) => (n === 'data-level' && l !== undefined ? String(l) : null),
    })),
  };
}

test('sortRowsByLevel: sestupně podle data-level sloupce, stabilní při shodě', () => {
  const rows = [row('a', 0, 1), row('b', 0, 3), row('c', 0, 3), row('d', 0, 2)];
  assert.deepEqual(sortRowsByLevel(rows, 1, 'desc').map((r) => r.id), ['b', 'c', 'd', 'a']);
  assert.deepEqual(sortRowsByLevel(rows, 1, 'asc').map((r) => r.id), ['a', 'd', 'b', 'c']);
});

test('sortRowsByLevel: chybějící úroveň („nedohledáno“) vždy na konci, vstup se nemění', () => {
  const rows = [row('a', 0, undefined), row('b', 0, 1), row('c', 0, 4)];
  assert.deepEqual(sortRowsByLevel(rows, 1, 'desc').map((r) => r.id), ['c', 'b', 'a']);
  assert.deepEqual(sortRowsByLevel(rows, 1, 'asc').map((r) => r.id), ['b', 'c', 'a']);
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'c']);
});

test('sortRowsByLevel: sloupec mimo rozsah neshodí, zachová pořadí', () => {
  const rows = [row('a', 1), row('b', 2)];
  assert.deepEqual(sortRowsByLevel(rows, 5, 'desc').map((r) => r.id), ['a', 'b']);
});

test('sortRowsByLevel: podporuje i buňky s dataset.level', () => {
  const rows = [{ id: 'x', cells: [{ dataset: { level: '1' } }] }, { id: 'y', cells: [{ dataset: { level: '2' } }] }];
  assert.deepEqual(sortRowsByLevel(rows, 0, 'desc').map((r) => r.id), ['y', 'x']);
});

test('nextSortDir: první klik desc, pak přepíná', () => {
  assert.equal(nextSortDir(null), 'desc');
  assert.equal(nextSortDir('descending'), 'asc');
  assert.equal(nextSortDir('ascending'), 'desc');
});

// --- readMojeZp / writeMojeZp ----------------------------------------------------
test('klíč úložiště a název eventu jsou zafixované kontraktem', () => {
  assert.equal(STORAGE_KEY, 'hspa-moje-zp');
  assert.equal(MOJE_EVENT, 'zp:moje-change');
  assert.equal(HOVER_PREFIX, 'zpi-hover-');
});

test('write/read: round-trip, smazání přes null', () => {
  const s = memStorage();
  assert.equal(writeMojeZp('201', s), true);
  assert.equal(s.getItem('hspa-moje-zp'), '201');
  assert.equal(readMojeZp(s), '201');
  assert.equal(writeMojeZp(null, s), true);
  assert.equal(readMojeZp(s), null);
});

test('readMojeZp: neznámý kód nebo prázdná hodnota → null', () => {
  assert.equal(readMojeZp(memStorage({ 'hspa-moje-zp': '999' })), null);
  assert.equal(readMojeZp(memStorage({ 'hspa-moje-zp': '' })), null);
  assert.equal(readMojeZp(memStorage({ 'hspa-moje-zp': '999' }), ['999']), '999');
});

test('read/write: blokované nebo chybějící úložiště nehází', () => {
  assert.equal(readMojeZp(throwingStorage), null);
  assert.equal(writeMojeZp('111', throwingStorage), false);
  assert.equal(readMojeZp(null), null);
  assert.equal(writeMojeZp('111', null), false);
});

// --- seznam ZP -------------------------------------------------------------------
test('ZP_FALLBACK odpovídá data/pojistovny.json (kódy i zkratky)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8'));
  assert.deepEqual(ZP_FALLBACK.map((z) => [z.kod, z.zkratka]), data.pojistovny.map((z) => [z.kod, z.zkratka]));
  assert.deepEqual(ZP_KODY, ['111', '201', '205', '207', '209', '211', '213']);
});

test('normalizeZpList: token ve tvaru --zp-111 / zp-111 / var(--zp-111); prázdný vstup → záloha', () => {
  const n = normalizeZpList([
    { kod: 111, zkratka: 'A', nazev: 'Aaa', token: 'var(--zp-111)' },
    { kod: '201', zkratka: 'B', token: '--zp-201' },
    { kod: '205', zkratka: 'C' },
    { kod: '207', zkratka: 'D', token: 'x"; background:url(evil)' },
    null,
  ]);
  assert.deepEqual(n.map((z) => z.cssVar), ['--zp-111', '--zp-201', '--zp-205', '--zp-207']);
  assert.equal(n[0].kod, '111');
  assert.equal(normalizeZpList([]).length, 7);
  assert.equal(normalizeZpList(undefined).length, 7);
});

// --- renderMojeZpChips (DOM stub) --------------------------------------------------
class El {
  constructor(tag) {
    this.tag = tag; this.attrs = {}; this.children = []; this.className = ''; this.disabled = false;
    this.type = ''; this._text = '';
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  appendChild(c) { this.children.push(c); return c; }
  replaceChildren(...c) { this.children = c; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
}
const fakeDoc = { createElement: (t) => new El(t) };
const fakeContainer = () => { const c = new El('div'); c.ownerDocument = fakeDoc; return c; };

test('renderMojeZpChips: bez kontejneru nedělá nic', () => {
  assert.equal(renderMojeZpChips(null, ZP_FALLBACK), null);
});

test('renderMojeZpChips: group + 7 chipů + „Zrušit výběr“, aria-pressed', () => {
  const c = fakeContainer();
  const row = renderMojeZpChips(c, ZP_FALLBACK, '201');
  assert.equal(c.children.length, 1);
  assert.equal(row.className, 'zpi-chips');
  assert.equal(row.getAttribute('role'), 'group');
  assert.equal(row.getAttribute('aria-label'), 'Moje pojišťovna');
  const chips = row.children.filter((b) => b.className === 'zpi-chip');
  assert.equal(chips.length, 7);
  assert.deepEqual(chips.map((b) => b.getAttribute('data-zp')), ZP_KODY);
  assert.deepEqual(chips.map((b) => b.getAttribute('aria-pressed')),
    ['false', 'true', 'false', 'false', 'false', 'false', 'false']);
  assert.ok(chips.every((b) => b.type === 'button'));
  const dot = chips[0].children[0];
  assert.equal(dot.className, 'zpi-dot');
  assert.equal(dot.getAttribute('style'), '--c:var(--zp-111)');
  assert.equal(chips[0].textContent, 'VZP ČR');
  const clear = row.children[row.children.length - 1];
  assert.match(clear.className, /zpi-chip--clear/);
  assert.equal(clear.textContent, 'Zrušit výběr');
  assert.equal(clear.disabled, false);
});

test('renderMojeZpChips: bez výběru je „Zrušit výběr“ neaktivní; zkratka jde přes textContent (bez HTML)', () => {
  const c = fakeContainer();
  const row = renderMojeZpChips(c, [{ kod: '111', zkratka: '<img src=x onerror=1>', nazev: 'x' }]);
  assert.equal(row.children[row.children.length - 1].disabled, true);
  assert.equal(row.children[0].textContent, '<img src=x onerror=1>');
});

// --- kontrakt CSS + zdroj ----------------------------------------------------------
const SECTION = CSS.slice(CSS.indexOf(MARKER));

test('styles.css: marker sekce P1.3 existuje právě jednou', () => {
  assert.ok(CSS.includes(MARKER));
  assert.equal(CSS.split(MARKER).length, 2);
});

test('CSS sekce: zvýraznění pro všech 7 kódů (výběr i hover)', () => {
  for (const k of ZP_KODY) {
    assert.ok(SECTION.includes(`main[data-moje-zp="${k}"] .zpv-mark[data-zp="${k}"]`), `výběr ${k}`);
    assert.ok(SECTION.includes(`main.zpi-hover-${k} .zpv-mark[data-zp="${k}"]`), `hover ${k}`);
  }
  assert.match(SECTION, /main\[data-moje-zp\] \.zpv-mark[^{]*\{[^}]*opacity: \.45/);
  assert.match(SECTION, /tr\[data-zp\]\[aria-current="true"\][^{]*\{[^}]*var\(--paper2\)/);
});

test('CSS sekce: reduced motion, print, chip 32 px, bez natvrdo hexů a fontů', () => {
  assert.match(SECTION, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(SECTION, /@media print/);
  assert.match(SECTION, /\.zpi-chip[^{]*\{[^}]*min-height: 32px/);
  assert.match(SECTION, /border-radius: 999px/);
  assert.doesNotMatch(SECTION, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(SECTION, /Inter|#1f1a14|#e8e2d4/);
});

test('CSS sekce: každá animace/transition má reduced-motion výjimku', () => {
  const rm = SECTION.slice(SECTION.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(rm, /\.zpi-chip[^{]*\{ transition: none/);
  assert.match(rm, /\.zpi-tip\.is-on \{ animation: none/);
});

test('zp-interact.js: kontrakt s grafy (třídy, atributy, parametry IO)', () => {
  for (const s of [
    'zpv-anim-ready', "'is-in'", 'data-zpv-anim', '.zpv-count[data-value]', 'data-zpi-init',
    'button.zpv-sort', 'table.zpv-heat', 'aria-sort', 'zpi-tip', "'role', 'status'", "'aria-live', 'polite'",
    "threshold: 0.3", "rootMargin: '0px 0px -10% 0px'", 'unobserve', 'prefers-reduced-motion: reduce',
    'otevrit', 'zpi-expand-all', 'zpMojeZp', 'data-moje-zp', 'aria-current',
  ]) assert.ok(SRC.includes(s), `chybí ${s}`);
  // tooltip se plní jen přes textContent, nikdy innerHTML
  assert.doesNotMatch(SRC, /innerHTML/);
  // žádný scroll listener (plán § 6 bod 8)
  assert.doesNotMatch(SRC, /addEventListener\('scroll'/);
});
