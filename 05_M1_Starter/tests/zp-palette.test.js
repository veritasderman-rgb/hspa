// Paleta pojišťoven (src/zp-palette.js + tokeny --zp-* v src/styles.css).
// Hlídá: 7 unikátních kódů v pevném pořadí, shodu s data/pojistovny.json,
// definici každého tokenu v :root i :root[data-theme="dark"], žádnou barvu série v JS modulu
// (hex jen v metadatech `brand.hex_original`), rychlou kontrolu palety (pásmo světlosti,
// chroma, ΔE sousedů, CVD, odstup od stavových barev — stejná matematika jako validátor
// dataviz; je-li validátor po ruce, spustí se i on) a to, že Srovnávač i Atlas berou barvy
// ze stejné palety. Barvy vycházejí z brandu pojišťoven (rozhodnutí vydavatele 2. 11. 2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
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

// --- pomůcky: OKLab + CVD (stejné konstanty jako dataviz validate_palette.js) ---
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const labFromLin = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const labOf = (hex, kind) => {
  const lin = hexRgb(hex).map(toLin);
  if (!kind) return labFromLin(lin);
  const M = MACHADO[kind];
  return labFromLin(M.map((row) => Math.max(0, Math.min(1, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]))));
};
const dE = (a, b, kind) => 100 * Math.hypot(...labOf(a, kind).map((v, i) => v - labOf(b, kind)[i]));
const cvdE = (a, b) => Math.min(dE(a, b, 'protan'), dE(a, b, 'deutan'));
const lch = (hex) => { const [L, a, b] = labOf(hex); return { L, C: Math.hypot(a, b) }; };
const relLum = (hex) => { const [r, g, b] = hexRgb(hex).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

// hexy tokenů --zp-* a stavových barev z styles.css (první :root = light, :root[data-theme="dark"] = dark)
const themeHexes = (block) => ZP.map((z) => block.match(new RegExp(`${z.token}:\\s*(#[0-9a-f]{6})`, 'i'))[1].toLowerCase());
const cssVar = (name, themeStart) => {
  const i = css.indexOf(themeStart);
  assert.ok(i >= 0, `v styles.css chybí ${themeStart}`);
  return css.slice(i).match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1].toLowerCase();
};
const THEMES = {
  light: { block: () => sectionBlock(':root'), surface: () => cssVar('paper', ':root {'), start: ':root {', band: [0.43, 0.77] },
  dark: { block: () => sectionBlock(':root[data-theme="dark"]'), surface: () => cssVar('paper', ':root[data-theme="dark"],'), start: ':root[data-theme="dark"],', band: [0.48, 0.67] },
};

test('zp-palette: light i dark hexy jsou unikátní', () => {
  for (const t of Object.values(THEMES)) {
    assert.equal(new Set(themeHexes(t.block())).size, 7, 'barvy v rámci tématu musí být unikátní');
  }
});

test('zp-palette: brand metadata (hex_original + zdroj) u každé pojišťovny a VZP je brandově červená', () => {
  for (const z of ZP) {
    assert.match(z.brand.hex_original, /^#[0-9a-f]{6}$/i, `${z.zkratka}: brand.hex_original`);
    assert.ok(z.brand.zdroj && z.brand.zdroj.length > 8, `${z.zkratka}: brand.zdroj`);
  }
  // brand VZP je červený (dominantní R) a token si drží odstín červené rodiny (R > G, R > B)
  const [r, g, b] = hexRgb(ZP[0].brand.hex_original);
  assert.ok(r > g && r > b, 'brand VZP je červený');
  for (const t of Object.values(THEMES)) {
    const [tr, tg, tb] = hexRgb(themeHexes(t.block())[0]);
    assert.ok(tr > tg && tr > tb, 'VZP token zůstává v červené rodině (karmín/malinová)');
  }
});

test('zp-palette: rychlá kontrola palety (pásmo L, chroma, sousedé ΔE ≥ 15, CVD ≥ 8) v light i dark', () => {
  for (const [name, t] of Object.entries(THEMES)) {
    const hx = themeHexes(t.block());
    hx.forEach((h, i) => {
      const { L, C } = lch(h);
      assert.ok(L >= t.band[0] - 0.005 && L <= t.band[1], `${name} ${ZP[i].zkratka} ${h}: L ${L.toFixed(3)} mimo pásmo ${t.band}`);
      assert.ok(C >= 0.1, `${name} ${ZP[i].zkratka} ${h}: chroma ${C.toFixed(3)} pod 0,10`);
    });
    for (let i = 0; i < 6; i++) {
      const n = dE(hx[i], hx[i + 1]);
      const c = cvdE(hx[i], hx[i + 1]);
      assert.ok(n >= 15, `${name} ${ZP[i].zkratka}↔${ZP[i + 1].zkratka}: normal ΔE ${n.toFixed(1)} < 15`);
      assert.ok(c >= 8, `${name} ${ZP[i].zkratka}↔${ZP[i + 1].zkratka}: CVD ΔE ${c.toFixed(1)} < 8`);
    }
  }
});

test('zp-palette: VZP se liší od stavové --red (ΔE OKLab ≥ 15) v light i dark', () => {
  for (const t of Object.values(THEMES)) {
    const vzp = themeHexes(t.block())[0];
    const red = cssVar('red', t.start);
    const bad = cssVar('bad', t.start);
    assert.equal(red, bad, '--bad je alias --red');
    const d = dE(vzp, red);
    assert.ok(d >= 15, `VZP ${vzp} vs --red ${red}: ΔE ${d.toFixed(1)} < 15`);
  }
});

test('zp-palette: žádná pojišťovna nekoliduje se stavovými barvami (ΔE ≥ 9 vůči --red/--good/--warn)', () => {
  // VZP ≥ 15 hlídá test výše; u ostatních je práh 9 — nejtěsnější místa (ZPŠ dark vs --red, VoZP vs --good)
  // jsou zdůvodněná v docs/visual-components.md → „Paleta pojišťoven“; stav má vždy ikonu + text.
  for (const [name, t] of Object.entries(THEMES)) {
    const hx = themeHexes(t.block());
    for (const sv of ['red', 'good', 'warn']) {
      const sh = cssVar(sv, t.start);
      hx.forEach((h, i) => {
        const d = dE(h, sh);
        assert.ok(d >= 9, `${name} ${ZP[i].zkratka} ${h} vs --${sv} ${sh}: ΔE ${d.toFixed(1)} < 9`);
      });
    }
  }
});

test('zp-palette: dark série mají kontrast ≥ 2,5 : 1 na pozadí (VZP karmín je záměrně nejtmavší, WARN < 3 : 1)', () => {
  const t = THEMES.dark;
  const surf = t.surface();
  themeHexes(t.block()).forEach((h, i) => {
    const c = contrast(h, surf);
    assert.ok(c >= 2.5, `dark ${ZP[i].zkratka} ${h}: kontrast ${c.toFixed(2)} < 2,5`);
    if (i !== 0) assert.ok(c >= 3, `dark ${ZP[i].zkratka} ${h}: kontrast ${c.toFixed(2)} < 3 (jen VZP smí mít relief)`);
  });
});

// Validátor dataviz (skill) — je-li v prostředí, spustíme ho nad light i dark paletou.
// Hledá se přes env ZP_PALETTE_VALIDATOR nebo /tmp/claude-0/bundled-skills/*/*/dataviz/scripts/.
const findValidator = () => {
  if (process.env.ZP_PALETTE_VALIDATOR && fs.existsSync(process.env.ZP_PALETTE_VALIDATOR)) return process.env.ZP_PALETTE_VALIDATOR;
  const root = '/tmp/claude-0/bundled-skills';
  try {
    for (const v of fs.readdirSync(root)) {
      for (const h of fs.readdirSync(path.join(root, v))) {
        const f = path.join(root, v, h, 'dataviz', 'scripts', 'validate_palette.js');
        if (fs.existsSync(f)) return f;
      }
    }
  } catch { /* není */ }
  return null;
};
const VALIDATOR = findValidator();
test('zp-palette: validátor dataviz projde (light i dark)', { skip: VALIDATOR ? false : 'validátor dataviz není v prostředí (ZP_PALETTE_VALIDATOR)' }, () => {
  for (const [name, t] of Object.entries(THEMES)) {
    const r = spawnSync('node', [VALIDATOR, themeHexes(t.block()).join(','), '--mode', name, '--surface', t.surface()], { encoding: 'utf8' });
    assert.equal(r.status, 0, `validátor ${name}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /ALL CHECKS PASS/, `validátor ${name}`);
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

test('zp-palette: v zp-palette.js jsou hexy jen jako brand.hex_original (a v textu zdroje)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'zp-palette.js'), 'utf8');
  const seriesLines = src.split('\n').filter((l) => /#[0-9a-fA-F]{3,8}\b/.test(l));
  for (const l of seriesLines) {
    assert.match(l, /^\s*brand: \{ hex_original: '#[0-9a-f]{6}', zdroj: '/, `hex mimo brand metadata: ${l.trim()}`);
  }
  assert.equal(seriesLines.length, 7, 'právě jeden brand řádek na pojišťovnu');
  // žádný hex z tokenů --zp-* se nesmí dostat do JS (barvu série dává jen CSS)
  for (const t of Object.values(THEMES)) for (const h of themeHexes(t.block())) {
    assert.ok(!src.toLowerCase().includes(h), `token ${h} nesmí být v JS`);
  }
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
