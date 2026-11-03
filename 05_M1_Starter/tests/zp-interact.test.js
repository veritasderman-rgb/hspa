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
  TIP_SELECTOR, fmtCount,
  POROVNAT_KEY, POROVNAT_EVENT, SWITCH_EVENT, readPorovnat, writePorovnat, porovnatZUrl, searchWith, nextSwitchIndex,
  porovnatChipsHtml, renderPorovnatChips,
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

// --- tooltip: kontrakt selektoru (revize P1.5, Codex review PR #1343) -----------
test('TIP_SELECTOR: tooltip cílí na marky i na prvky s data-tip (buňky heatmapy a matic)', () => {
  const parts = TIP_SELECTOR.split(',').map((s) => s.trim());
  assert.ok(parts.includes('.zpv-mark'));
  assert.ok(parts.includes('[data-tip]'));
  // delegace (hover, focus, odchod, klik mimo) jde jen přes TIP_SELECTOR, ne přes holé '.zpv-mark'
  assert.doesNotMatch(SRC, /closest\('\.zpv-mark'\)/);
  assert.ok((SRC.match(/closest\(TIP_SELECTOR\)/g) || []).length >= 3);
});

// --- count-up: typografické minus -------------------------------------------------
test('fmtCount: záporné číslo s U+2212, prefix, desetinná místa; NaN → null', () => {
  assert.equal(fmtCount(-7.5, 1), '−7,5');
  assert.equal(fmtCount(512.2, 1), '512,2');
  assert.equal(fmtCount(3.549, 2, '~'), '~3,55');
  assert.equal(fmtCount(Number.NaN, 1), null);
  assert.doesNotMatch(fmtCount(-1234.5, 1), /-/);
});

test('CSV: delegovaný click na [data-zpv-csv], BOM + text/csv, bez sledování', () => {
  assert.match(SRC, /hasAttribute\('data-zpv-csv'\)/);
  assert.match(SRC, /'\\ufeff'/);
  assert.match(SRC, /text\/csv;charset=utf-8/);
  assert.match(SRC, /revokeObjectURL/);
  assert.ok(!/fetch\(|sendBeacon|XMLHttpRequest/.test(SRC.split('function downloadCsv')[1].split('function sortHeat')[0]));
  assert.match(CSS, /\.zpv-csv \{[^}]*min-height: 24px[^}]*font-size: 12\.5px/);
  assert.match(CSS, /@media print \{[\s\S]*?\.zpv-csv \{ display: none; \}/);
});

// --- A4.2 „Porovnat s“ ---------------------------------------------------------------
test('Porovnat s: klíč úložiště a názvy událostí jsou zafixované kontraktem', () => {
  assert.equal(POROVNAT_KEY, 'hspa-porovnat-zp');
  assert.equal(POROVNAT_EVENT, 'zp:porovnat-change');
  assert.equal(SWITCH_EVENT, 'zp:switch');
});

test('readPorovnat / writePorovnat: round-trip, neplatná hodnota, smazání, výjimka', () => {
  const s = memStorage();
  assert.equal(readPorovnat(s), null);
  assert.equal(writePorovnat('205', s), true);
  assert.equal(s._m.get('hspa-porovnat-zp'), '205');
  assert.equal(readPorovnat(s), '205');
  assert.equal(readMojeZp(s), null, 'nezasahuje do klíče Moje pojišťovna');
  s.setItem('hspa-porovnat-zp', '999');
  assert.equal(readPorovnat(s), null);
  writePorovnat('207', s);
  writePorovnat(null, s);
  assert.equal(readPorovnat(s), null);
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(readPorovnat(bad), null);
  assert.equal(writePorovnat('205', bad), false);
  assert.equal(readPorovnat(null), null);
});

test('porovnatZUrl a searchWith: platný kód z ?porovnat=, ostatní parametry zůstanou, výchozí smaže parametr', () => {
  assert.equal(porovnatZUrl('?zp=111&porovnat=205'), '205');
  assert.equal(porovnatZUrl('?porovnat=999'), null);
  assert.equal(porovnatZUrl(''), null);
  assert.equal(searchWith('?zp=111', 'porovnat', '205'), '?zp=111&porovnat=205');
  assert.equal(searchWith('?zp=111&porovnat=205', 'porovnat', null), '?zp=111');
  assert.equal(searchWith('?kmen=bez-vzp', 'kmen', 'vse', 'vse'), '');
  assert.equal(searchWith('', 'rok', 2022), '?rok=2022');
});

test('nextSwitchIndex: šipky cyklicky, jiná klávesa -1', () => {
  assert.equal(nextSwitchIndex(3, 0, 'ArrowRight'), 1);
  assert.equal(nextSwitchIndex(3, 2, 'ArrowRight'), 0);
  assert.equal(nextSwitchIndex(3, 0, 'ArrowLeft'), 2);
  assert.equal(nextSwitchIndex(3, 1, 'ArrowDown'), 2);
  assert.equal(nextSwitchIndex(3, 1, 'Enter'), -1);
  assert.equal(nextSwitchIndex(0, 0, 'ArrowRight'), -1);
});

test('porovnatChipsHtml: popisek, sedm chipů, vybraný aria-pressed, „Moje“ disabled, Zrušit disabled bez výběru', () => {
  const h = porovnatChipsHtml(ZP_FALLBACK, '111', '205');
  assert.match(h, /^<div class="zpi-chips zpi-chips--porovnat" role="group" aria-label="Porovnat s">/);
  assert.match(h, /<span class="zpi-chips-lbl">Porovnat s<\/span>/);
  assert.equal((h.match(/class="zpi-chip zpi-chip--porovnat" data-zp=/g) || []).length, 7);
  assert.match(h, /data-zp="205" aria-pressed="true"/);
  assert.equal((h.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(h, /data-zp="111" aria-pressed="false" title="[^"]*\(je vaše pojišťovna\)" disabled/);
  assert.equal((h.match(/ disabled/g) || []).length, 1, 'jen „Moje“; Zrušit je aktivní, protože porovnat je vybraný');
  const none = porovnatChipsHtml(ZP_FALLBACK, null, null);
  assert.match(none, /data-zp-clear-porovnat disabled>Zrušit/);
  assert.equal((none.match(/aria-pressed="true"/g) || []).length, 0);
  // escapování a neznámý seznam = záloha
  assert.doesNotMatch(porovnatChipsHtml([{ kod: '111', zkratka: '<b>x</b>', nazev: '"n"' }]), /<b>x/);
  assert.equal((porovnatChipsHtml(null).match(/zpi-chip--porovnat" data-zp=/g) || []).length, 7);
});

test('renderPorovnatChips: bez kontejneru nic, s kontejnerem vloží řádek', () => {
  assert.equal(renderPorovnatChips(null, ZP_FALLBACK), null);
  let vlozeno = null;
  const c = { replaceChildren() { vlozeno = ''; }, insertAdjacentHTML(_p, h) { vlozeno = h; }, firstElementChild: { cls: 'row' } };
  assert.deepEqual(renderPorovnatChips(c, ZP_FALLBACK, '111', null), { cls: 'row' });
  assert.match(vlozeno, /zpi-chips--porovnat/);
});

test('CSS: .is-porovnat = obrys bez výplně, u čar čárkovaně, řádky tabulky data-porovnat, barvy ZP přes tokeny', () => {
  assert.match(CSS, /\.zpv-bar\.is-porovnat, \.zpv-seg\.is-porovnat \{ background: transparent; box-shadow: inset 0 0 0 2px var\(--zpv-mark-color/);
  assert.match(CSS, /\.zpv-line\.is-porovnat \{ stroke-dasharray/);
  assert.match(CSS, /main tr\[data-zp\]\[data-porovnat="true"\] \{ background: color-mix\(in srgb, var\(--paper2\)/);
  for (const k of ZP_KODY) assert.ok(CSS.includes(`main[data-porovnat-zp="${k}"] .zpv-mark[data-zp="${k}"] { opacity: 1; --zpv-mark-color: var(--zp-${k}); }`), k);
  assert.doesNotMatch(CSS.slice(CSS.indexOf('„Porovnat s“ (A4.2)'), CSS.indexOf('„Porovnat s“ (A4.2)') + 4000), /transition|animation/);
});

test('zp-interact.js: Porovnat s a přepínače — kontrakt se stránkou', () => {
  for (const s of ['zpPorovnatZp', 'data-porovnat-zp', 'is-porovnat', "'data-porovnat', 'true'", "'aria-current', 'false'", 'zpi-chip--porovnat',
    'SWITCH_EVENT', 'select[data-switch]', '.zpc-switch[data-switch] button[role="radio"]', 'history.replaceState', 'nextSwitchIndex', 'data-zp-clear-porovnat']) {
    assert.ok(SRC.includes(s), s);
  }
  // chipy „Moje“ a „Porovnat s“ se nepřepisují navzájem
  assert.ok(SRC.includes(".zpi-chip[data-zp]:not(.zpi-chip--porovnat)"));
});
