// Testy grafových primitiv srovnávače pojišťoven (src/zp-viz.js, balíčky P1.2 + P2.1).
// Čisté funkce → string; kontrolujeme kontrakt (třídy, data-zp, data-tip,
// tabindex, aria), null → „nedohledáno“, řazení, escapování a tabulková dvojčata.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rankedBars, segmentedBar, statTiles, meter, indexedLines, dumbbell,
  heatmap, dotMatrix, coverageMatrix,
  foldParts, indexSeries, dodgeLabels, niceTicks, meterSignal, dotScore, diffPct, sortDesc, pct,
  NA_TEXT, ZP_KODY,
} from '../src/zp-viz.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'src', 'zp-viz.js'), 'utf8');
const EVIL = '<script>alert(1)</script>';

const ZP = [
  { kod: '111', label: 'VZP ČR', value: 22.88 },
  { kod: '201', label: 'VoZP', value: 19.24 },
  { kod: '205', label: 'ČPZP', value: 16.75 },
  { kod: '207', label: 'OZP', value: 17.41 },
  { kod: '209', label: 'ZPŠ', value: null },
  { kod: '211', label: 'ZP MV ČR', value: 19.6 },
  { kod: '213', label: 'RBP', value: 17.24 },
];

const count = (s, re) => (s.match(re) || []).length;
/** Počet řádků v tbody tabulkového dvojčete (<details class="zpv-table">). */
function twinRows(html) {
  const m = /<details class="zpv-table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/.exec(html);
  assert.ok(m, 'chybí tabulkové dvojče');
  return count(m[1], /<tr>/g);
}
/** Povolené inline styly: jen --w, --i (custom properties) a width. */
function assertOnlyAllowedStyles(html) {
  for (const [, st] of html.matchAll(/style="([^"]*)"/g)) {
    for (const decl of st.split(';').map((d) => d.trim()).filter(Boolean)) {
      const prop = decl.split(':')[0].trim();
      assert.ok(['--w', '--i', '--x', 'width'].includes(prop), `nepovolený inline styl: ${decl}`);
    }
  }
}
function assertEscaped(html) {
  assert.ok(!html.includes('<script>'), 'neescapovaný <script>');
  assert.ok(html.includes('&lt;script&gt;'), 'chybí escapovaný text');
}
/** Každý mark s tabindex má data-tip a role img + aria-label. */
function assertFocusableMarks(html) {
  const marks = [...html.matchAll(/<(span|g)\b[^>]*class="[^"]*(?:zpv-mark|zpv-series)[^"]*"[^>]*tabindex="0"[^>]*>/g)].map((m) => m[0]);
  assert.ok(marks.length > 0, 'žádný fokusovatelný mark');
  for (const m of marks) {
    assert.match(m, /data-tip="[^"]+"/, `mark bez data-tip: ${m}`);
    assert.match(m, /role="img"/, `mark bez role img: ${m}`);
    assert.match(m, /aria-label="[^"]+"/, `mark bez aria-label: ${m}`);
    assert.match(m, /data-(zp|key)="[^"]+"/, `mark bez data-zp/data-key: ${m}`);
  }
}

// ---------------------------------------------------------------- pomocné

test('pomocné: pct, sortDesc, niceTicks, diffPct', () => {
  assert.equal(pct(50, 200), '25%');
  assert.equal(pct(300, 200), '100%');
  assert.equal(pct(null, 200), '0%');
  assert.deepEqual(sortDesc([{ value: 1 }, { value: null }, { value: 3 }]).map((x) => x.value), [3, 1, null]);
  assert.deepEqual(niceTicks(93.7, 120.4, 5), [90, 100, 110, 120, 130]);
  assert.equal(diffPct(100, 130), 30);
  assert.equal(diffPct(0, 5), null);
  assert.equal(diffPct(null, 5), null);
  assert.deepEqual(ZP_KODY, ['111', '201', '205', '207', '209', '211', '213']);
});

// ---------------------------------------------------------------- 1 rankedBars

test('rankedBars: prázdný vstup → figura s „nedohledáno“, bez marků', () => {
  for (const v of [[], null, undefined]) {
    const h = rankedBars(v, { title: 'X' });
    assert.match(h, /^<figure class="zpv zpv-figure zpv-bars[^"]*"/);
    assert.ok(h.includes(NA_TEXT));
    assert.ok(!h.includes('zpv-mark'));
  }
});

test('rankedBars: řazení sestupně, null na konci jako „nedohledáno“ bez baru', () => {
  const h = rankedBars(ZP, { title: 'Podíl 65+', unit: '%', dec: 1 });
  const order = [...h.matchAll(/<div class="zpv-row" data-zp="(\d+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['111', '211', '201', '207', '213', '205', '209']);
  assert.equal(count(h, /class="zpv-bar zpv-mark"/g), 6, 'null nemá bar');
  assert.match(h, /data-zp="209"[^>]*>[\s\S]*?<span class="zpv-na">nedohledáno<\/span>/);
  assert.ok(h.includes('Řazeno podle hodnoty'));
});

test('rankedBars: sort none zachová pořadí, bez poznámky o řazení', () => {
  const h = rankedBars(ZP, { sort: 'none' });
  const order = [...h.matchAll(/<div class="zpv-row" data-zp="(\d+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ZP.map((z) => z.kod));
  assert.ok(!h.includes('Řazeno podle hodnoty'));
});

test('rankedBars: kontrakt marků, šířka podle max, aria, dvojče, styly', () => {
  const h = rankedBars(ZP, { title: 'Podíl 65+', unit: '%', dec: 1, maxv: 40, source: 'CRP 2025' });
  assertFocusableMarks(h);
  assert.match(h, /data-zp="111" data-zpv-anim="bar" style="--w:57.2%;--i:0"/);
  assert.match(h, /class="zpv-plot zpv-barlist[^"]*" role="group" aria-label="Podíl 65\+: VZP ČR 22,9 %/);
  assert.ok(h.includes('<figcaption class="zpv-cap">'));
  assert.ok(h.includes('Zdroj: CRP 2025'));
  assert.equal(twinRows(h), ZP.length);
  assert.ok(h.includes('Zobrazit jako tabulku'));
  assertOnlyAllowedStyles(h);
  assert.match(h, /data-tip="VZP ČR: 22,9 % · CRP 2025"/);
});

test('rankedBars: referenční zóna/linka v tracku + popisek v záhlaví', () => {
  const zone = rankedBars(ZP, { unit: '%', dec: 1, ref: { value: 20.86, label: 'Průměr ČR' } });
  assert.match(zone, /zpv-ref zpv-ref--below" style="--w:91.17%"/);
  assert.match(zone, /<span class="zpv-refkey">[\s\S]*Průměr ČR: 20,9 %/);
  const line = rankedBars(ZP, { ref: { value: 20, label: 'Limit', kind: 'line' } });
  assert.ok(line.includes('zpv-ref--line'));
  assert.ok(line.includes('zpv-has-refline'));
  const above = rankedBars(ZP, { ref: { value: 20, label: 'Nad', kind: 'zone-above' } });
  assert.ok(above.includes('zpv-ref--above'));
});

test('rankedBars allowNegative: nulová osa, záporné bary doleva, znaménko, styly', () => {
  const items = [
    { kod: '205', label: 'ČPZP', value: 8.05 },
    { kod: '213', label: 'RBP', value: -1.78 },
    { kod: '201', label: 'VoZP', value: -0.98 },
    { kod: '209', label: 'ZPŠ', value: null },
  ];
  const h = rankedBars(items, { title: 'Změna', unit: '%', dec: 1, allowNegative: true, signed: true });
  assert.ok(h.includes('zpv-has-neg'));
  // rozsah −1,78 … 8,05 → nula na 18,11 %
  assert.equal(count(h, /class="zpv-zero" style="--x:18.11%"/g), 4, 'nulová osa v každém řádku');
  assert.match(h, /class="zpv-bar zpv-mark" data-zp="205" data-zpv-anim="bar" style="--x:18.11%;--w:81.89%;--i:0"/);
  assert.match(h, /class="zpv-bar zpv-mark zpv-bar--neg" data-zp="213" data-zpv-anim="bar" style="--x:0%;--w:18.11%;--i:2"/);
  assert.match(h, /zpv-val zpv-val--neg" style="--x:0%">−1,8\s%</);
  assert.match(h, /aria-label="ČPZP: \+8,1\s%"/);
  assert.match(h, /data-zp="209"[^>]*>[\s\S]*?nedohledáno/);
  assert.equal(count(h, /zpv-bar--neg/g), 2);
  assertOnlyAllowedStyles(h);
  assertFocusableMarks(h);
  // bez záporných hodnot je výstup shodný s výchozím
  const pos = [{ kod: '111', label: 'VZP', value: 4 }, { kod: '201', label: 'VoZP', value: 2 }];
  assert.equal(rankedBars(pos, { allowNegative: true }), rankedBars(pos));
  // bez allowNegative se záporná hodnota dál kreslí od nuly (šířka 0)
  assert.ok(!rankedBars(items).includes('zpv-zero'));
});

test('rankedBars: escapování popisků i titulku', () => {
  const h = rankedBars([{ key: 'x', label: EVIL, value: 3 }], { title: EVIL, sub: EVIL, source: EVIL });
  assertEscaped(h);
  assert.match(h, /data-key="x"/);
});

// ---------------------------------------------------------------- 2 segmentedBar

test('segmentedBar: prázdný vstup, nulové a null části', () => {
  assert.ok(segmentedBar([], {}).includes(NA_TEXT));
  const h = segmentedBar([{ kod: '111', label: 'A', value: 60 }, { kod: '201', label: 'B', value: 0 }, { kod: '205', label: 'C', value: null }]);
  assert.equal(count(h, /class="zpv-seg zpv-mark"/g), 1, 'nula a null nekreslí segment');
  assert.equal(twinRows(h), 3, 'tabulka nese všechny části');
  assert.ok(h.includes(NA_TEXT));
});

test('segmentedBar: fold do „Ostatní“ nad maxParts, legenda v pořadí segmentů', () => {
  const parts = Array.from({ length: 9 }, (_, i) => ({ key: 'k' + i, label: 'Položka ' + i, value: 100 - i * 10 }));
  const h = segmentedBar(parts, { maxParts: 6, title: 'Fond' });
  assert.equal(count(h, /class="zpv-seg zpv-mark"/g), 6);
  assert.match(h, /data-key="ostatni" data-slot="other"/);
  assert.ok(h.includes('Ostatní'));
  const legend = /<ul class="zpv-legend">([\s\S]*?)<\/ul>/.exec(h)[1];
  assert.deepEqual([...legend.matchAll(/<li data-key="([^"]+)"/g)].map((m) => m[1]), ['k0', 'k1', 'k2', 'k3', 'k4', 'ostatni']);
  assert.equal(twinRows(h), 9);
  const f = foldParts(parts, 6, 'Jiné');
  assert.equal(f.length, 6);
  assert.equal(f[5].value, 50 + 40 + 30 + 20);
  assert.deepEqual(f[5].folded, ['Položka 5', 'Položka 6', 'Položka 7', 'Položka 8']);
  assert.equal(foldParts(parts.slice(0, 3), 6).length, 3);
});

test('segmentedBar: is-colored, podíl uvnitř jen když se vejde, šířky, aria', () => {
  const h = segmentedBar(ZP.map((z) => ({ ...z, value: z.value ?? 1.32 })), { title: 'Tržní podíl', unit: '%', maxParts: 7 });
  assert.match(h, /^<figure class="zpv zpv-figure zpv-segmented is-colored"/);
  assertFocusableMarks(h);
  assert.equal(count(h, /class="zpv-seg-lab"/g) + count(h, /class="zpv-seg-lab zpv-seg-lab--s"/g),
    count(h, /zpv-seg-lab[ "]/g));
  // ZPŠ (1,32 z ~114) < 7 % → bez popisku
  assert.ok(!/data-zp="209"[^>]*>\s*<span class="zpv-seg-lab/.test(h));
  assert.match(h, /role="group" aria-label="Tržní podíl: VZP ČR /);
  assertOnlyAllowedStyles(h);
  assert.match(h, /style="width:[\d.]+%;--i:0"/);
});

test('segmentedBar: escapování', () => {
  assertEscaped(segmentedBar([{ key: 'a', label: EVIL, value: 5 }], { title: EVIL }));
});

// ---------------------------------------------------------------- 3 statTiles

test('statTiles: hodnota je fallback text, data-value/decimals, null → nedohledáno', () => {
  const h = statTiles([
    { value: 10851604, label: 'pojištěnců', meta: 'CRP 2025' },
    { value: -7.5, unit: 'mld Kč', decimals: 1, label: 'saldo' },
    { value: null, unit: '%', label: EVIL },
  ]);
  assert.match(h, /^<ul class="zpv zpv-stats">/);
  assert.match(h, /<b class="zpv-count" data-zpv-anim="count" data-value="10851604" data-decimals="0">10 851 604<\/b>/);
  assert.match(h, /data-value="-7.5" data-decimals="1">−7,5<\/b>/);
  assert.match(h, /<b class="zpv-count zpv-na">nedohledáno<\/b>/);
  assert.ok(!/nedohledáno<\/b><span class="zpv-tile-unit">/.test(h), 'bez jednotky u null');
  assertEscaped(h);
  assert.ok(statTiles([]).includes(NA_TEXT));
  assert.ok(!/tabular-nums/.test(/\.zpv-count \{[^}]*\}/.exec(CSS)[0]), 'stat číslo bez tabular-nums');
});

// ---------------------------------------------------------------- 4 meter

test('meter: role meter s aria hodnotami, prahy → signál, null', () => {
  const h = meter(8, { max: 10, label: 'Aplikace', text: '8/10', thresholds: [{ at: 0, signal: 'bad' }, { at: 5, signal: 'warn' }, { at: 8, signal: 'good' }] });
  assert.match(h, /role="meter" aria-label="Aplikace" aria-valuenow="8" aria-valuemin="0" aria-valuemax="10" aria-valuetext="8\/10"/);
  assert.ok(h.includes('zpv-meter--good'));
  assert.ok(h.includes('style="--w:80%"'));
  assert.equal(meterSignal(3, [{ at: 0, signal: 'bad' }, { at: 5, signal: 'warn' }]), 'bad');
  assert.equal(meterSignal(3, []), 'neutral');
  const n = meter(null, { label: 'x' });
  assert.ok(n.includes(NA_TEXT));
  assert.ok(!n.includes('role="meter"'));
  assertEscaped(meter(1, { label: EVIL }));
});

// ---------------------------------------------------------------- 5 indexedLines

const SERIES = [
  { kod: '111', label: 'VZP ČR', points: [{ year: 2010, value: 6298959 }, { year: 2015, value: 5920874 }, { year: 2025, value: 6168626 }] },
  { kod: '211', label: 'ZP MV ČR', points: [{ year: 2010, value: 1124000 }, { year: 2015, value: 1200000 }, { year: 2025, value: 1353000 }] },
  { kod: '209', label: 'ZPŠ', points: [{ year: 2010, value: 133298 }, { year: 2015, value: null }, { year: 2025, value: 143000 }] },
];

test('indexedLines: index = 100 v základním roce', () => {
  const s = indexSeries(SERIES[0].points, 2010);
  assert.equal(s.baseYear, 2010);
  assert.equal(s.points[0].index, 100);
  assert.ok(Math.abs(s.points[2].index - 97.93) < 0.01);
  const f = indexSeries(SERIES[0].points, 2015);
  assert.equal(f.points[1].index, 100);
  const first = indexSeries([{ year: 2012, value: null }, { year: 2013, value: 50 }, { year: 2014, value: 75 }]);
  assert.equal(first.baseYear, 2013);
  assert.equal(first.points[2].index, 150);
  assert.equal(first.points[0].index, null);
});

test('indexedLines: SVG kontrakt, legenda vždy, dvojče = počet let, null mezera', () => {
  const h = indexedLines(SERIES, { title: 'Kmen', base: 2010, source: 'CRP' });
  assert.match(h, /^<figure class="zpv zpv-figure zpv-lines is-colored"/);
  assert.match(h, /<svg class="zpv-svg" viewBox="0 0 360 232"/);
  assertFocusableMarks(h);
  assert.equal(count(h, /class="zpv-line zpv-mark" data-zp="\d+"[^>]*pathLength="1" data-zpv-anim="line"/g), 3);
  assert.equal(count(h, /<circle class="zpv-dot zpv-mark"[^>]*r="4"/g), 3);
  assert.equal(count(h, /<li data-zp=/g), 3, 'legenda');
  assert.equal(twinRows(h), 3, 'řádek na rok');
  assert.ok(h.includes('Index, 2010 = 100'));
  // ZPŠ 2015 = null → dvojče „nedohledáno“, čára je přerušená (dvě M)
  assert.ok(h.includes(NA_TEXT));
  const zps = /class="zpv-line zpv-mark" data-zp="209" d="([^"]+)"/.exec(h)[1];
  assert.equal(count(zps, /M/g), 2);
  assert.match(h, /aria-label="Kmen \(index, 2010 = 100\): VZP ČR 2025 97,9/);
  assertOnlyAllowedStyles(h);
});

test('indexedLines: prázdný vstup a escapování', () => {
  assert.ok(indexedLines([], {}).includes(NA_TEXT));
  assert.ok(indexedLines([{ kod: '111', label: 'x', points: [{ year: 2010, value: null }] }]).includes(NA_TEXT));
  assertEscaped(indexedLines([{ key: 'a', label: EVIL, points: [{ year: 2010, value: 1 }, { year: 2011, value: 2 }] }], { title: EVIL }));
});

test('indexedLines: rozestavení popisků bez kolizí, jinak jen legenda', () => {
  const ys = dodgeLabels([100, 101, 102, 150], 13, 10, 200);
  const sorted = [...ys].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 13 - 1e-9);
  assert.equal(ys[3], 150);
  assert.equal(dodgeLabels([1, 2, 3, 4, 5], 13, 0, 20), null);
  const crowded = Array.from({ length: 30 }, (_, i) => ({ key: 'k' + i, label: 'S' + i, points: [{ year: 2010, value: 100 }, { year: 2011, value: 100 + i * 0.01 }] }));
  const h = indexedLines(crowded);
  assert.ok(!h.includes('class="zpv-endlab"'), 'při přeplnění bez direct labels');
  assert.equal(count(h, /<li data-key=/g), 30, 'legenda zůstává');
});

// ---------------------------------------------------------------- 6 dumbbell

test('dumbbell: řazení podle „to“, rozdíl v tooltipu, null, dvojče', () => {
  const items = [
    { key: 'a', label: 'Kardio', from: 600000, to: 787767 },
    { key: 'b', label: 'Dieta', from: 90000, to: 72784 },
    { key: 'c', label: 'Bez plánu', from: null, to: 1000 },
    { key: 'd', label: 'Bez skutečnosti', from: 5000, to: null },
  ];
  const h = dumbbell(items, { title: 'Plán vs. skutečnost', unit: 'tis. Kč' });
  const order = [...h.matchAll(/<div class="zpv-row" data-key="(\w)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['a', 'b', 'c', 'd']);
  assertFocusableMarks(h);
  assert.equal(count(h, /class="zpv-db-to zpv-mark"/g), 3);
  assert.equal(count(h, /class="zpv-db-from"/g), 2);
  assert.match(h, /data-tip="Kardio: skutečnost 787 767 tis\. Kč · plán 600 000 tis\. Kč · \+31,3 % proti plánu"/);
  assert.match(h, /zpv-db-line--down/);
  assert.match(h, /data-key="d"[\s\S]*?<span class="zpv-na">nedohledáno<\/span>/);
  assert.equal(twinRows(h), 4);
  assert.ok(h.includes('zpv-sw--from') && h.includes('zpv-sw--to'), 'legenda dvou sérií');
  assertOnlyAllowedStyles(h);
  assert.ok(dumbbell([], {}).includes(NA_TEXT));
  assertEscaped(dumbbell([{ key: 'x', label: EVIL, from: 1, to: 2 }], { title: EVIL }));
});

// ---------------------------------------------------------------- 7 heatmap

const ROWS = [{ kod: '111', label: 'VZP ČR' }, { kod: '211', label: 'ZP MV ČR' }];
const COLS = [{ key: 'onko', label: 'Onkologie' }, { key: 'kardio', label: 'Kardiologie' }, { key: 'x', label: 'Chybí' }];

test('heatmap: sémantická tabulka, data-level, data-zp na řádku, řazení markup', () => {
  const h = heatmap(ROWS, COLS, (r, c) => (c.key === 'x' ? null : { level: r.kod === '211' ? 3 : 1, tip: 'popis ' + c.label }),
    { title: 'Nabídka', rowHeader: 'Pojišťovna' });
  assert.match(h, /<table class="zpv-matrix zpv-heat" aria-label="Nabídka">/);
  assert.equal(count(h, /<tr data-zp="\d+">/g), 2);
  assert.equal(count(h, /data-level="3"/g), 2 + 1, '2 buňky + legenda');
  assert.equal(count(h, /<td class="zpv-cell" data-level="1"/g), 2);
  assert.equal(count(h, /data-level="na"/g), 2);
  assert.ok(h.includes('>nejsilnější<'));
  assert.ok(h.includes('<span class="sr-only"> — popis Onkologie</span>'));
  assert.equal(count(h, /<th scope="col" aria-sort="none"><button type="button" class="zpv-sort" data-col="/g), 3);
  assert.match(h, /<td class="zpv-cell" data-level="1" data-col="onko" tabindex="0" data-tip="VZP ČR · Onkologie: základní — popis Onkologie">/);
  assert.ok(h.includes(NA_TEXT));
  assert.ok(!/style="/.test(h), 'heatmap bez inline stylů');
  assert.ok(!heatmap(ROWS, COLS, () => ({ level: 1 }), { sortable: false }).includes('zpv-sort"'));
});

test('heatmap: prázdný vstup, chybná funkce, escapování', () => {
  assert.ok(heatmap([], COLS, () => null).includes(NA_TEXT));
  assert.ok(heatmap(ROWS, [], () => null).includes(NA_TEXT));
  const bad = heatmap(ROWS, COLS, () => { throw new Error('x'); });
  assert.equal(count(bad, /data-level="na"/g), 6);
  assertEscaped(heatmap([{ key: 'a', label: EVIL }], [{ key: 'b', label: EVIL }], () => ({ level: 2, tip: EVIL }), { title: EVIL }));
});

// ---------------------------------------------------------------- 8 dotMatrix

test('dotMatrix: stavy koleček s aria-label, skóre jako meter, null', () => {
  const vals = { onko: true, kardio: 'partial', x: false };
  const h = dotMatrix([...ROWS, { kod: '209', label: 'ZPŠ' }], COLS,
    (r, c) => (r.kod === '209' ? null : vals[c.key]), { title: 'Funkce', scoreLabel: 'n/3' });
  assert.equal(count(h, /<tr data-zp="\d+">/g), 3);
  assert.equal(count(h, /class="zpv-pip zpv-pip--yes zpv-mark" data-zp="\d+" role="img" aria-label="Onkologie: ano"/g), 2);
  assert.equal(count(h, /zpv-pip--part zpv-mark" data-zp="\d+" role="img" aria-label="Kardiologie: částečně"/g), 2);
  assert.equal(count(h, /class="zpv-pip zpv-pip--no" role="img" aria-label="Chybí: ne"/g), 2);
  assert.equal(count(h, /role="meter"[^>]*aria-valuenow="1.5" aria-valuemin="0" aria-valuemax="3"/g), 2);
  assert.ok(h.includes('>1,5/3<'));
  assert.ok(h.includes('>n/3<'));
  assert.ok(h.includes('Onkologie: nedohledáno'));
  assert.deepEqual(dotScore([true, false, null, 'partial']), { yes: 1.5, known: 3, total: 4 });
  assert.ok(dotMatrix([], COLS, () => true).includes(NA_TEXT));
  assertEscaped(dotMatrix([{ key: 'a', label: EVIL }], [{ key: 'b', label: EVIL }], () => true, { title: EVIL }));
});

// ---------------------------------------------------------------- 9 coverageMatrix

test('coverageMatrix: ikona + text u každého stavu, null, vlastní popisky', () => {
  const st = { onko: 'ano', kardio: 'castecne', x: 'ne' };
  const h = coverageMatrix(ROWS, COLS, (r, c) => (r.kod === '211' && c.key === 'x' ? null : st[c.key]),
    { title: 'Pokrytí', labels: { ne: 'VZ neuvádí' } });
  assert.equal(count(h, /<tr data-zp="\d+">/g), 2);
  assert.equal(count(h, /<td class="zpv-cov" data-state="ano"[^>]*><span class="zpv-cov-ic zpv-tone-good" aria-hidden="true">✓<\/span><span class="zpv-cov-tx">ano<\/span>/g), 2);
  assert.equal(count(h, /zpv-tone-warn" aria-hidden="true">½<\/span><span class="zpv-cov-tx">částečně/g), 2);
  assert.equal(count(h, /<span class="zpv-cov-tx">VZ neuvádí<\/span>/g), 1);
  assert.equal(count(h, /data-state="na"/g), 1);
  assert.ok(h.includes(NA_TEXT));
  assert.match(h, /zpv-legend--cov/);
  assert.ok(coverageMatrix(ROWS, [], () => 'ano').includes(NA_TEXT));
  assertEscaped(coverageMatrix([{ key: 'a', label: EVIL }], [{ key: 'b', label: EVIL }], () => ({ stav: 'ano', tip: EVIL }), { title: EVIL }));
});

// ---------------------------------------------------------------- CSS + modul

test('CSS: sekce .zpv- pod markerem, tokeny ZP, rampa, animace a reduced motion', () => {
  const marker = '/* === Srovnávač pojišťoven: vizuální primitivy src/zp-viz.js (.zpv-) — plní balíček P1.2/P2.1 === */';
  const at = CSS.indexOf(marker);
  assert.ok(at > 0, 'chybí marker sekce');
  const sec = CSS.slice(at);
  for (const k of ZP_KODY) assert.ok(sec.includes(`.zpv [data-zp="${k}"] { --zpv-zp: var(--zp-${k}`), `mapování ${k}`);
  assert.ok(sec.includes('.zpv-figure.is-colored .zpv-mark { --zpv-mark-color: var(--zpv-zp)'));
  for (const i of [0, 1, 2, 3]) assert.ok(sec.includes(`--zpv-ramp-${i}:`), `rampa ${i}`);
  assert.ok(sec.includes('--zpv-ramp-3: #1c5cab') && sec.includes('--zpv-ramp-3: #6da7ec'));
  assert.match(sec, /:root\[data-theme="dark"\] \{[^}]*--zpv-ramp-3/);
  assert.match(sec, /@media screen and \(prefers-reduced-motion: no-preference\)[\s\S]*\.zpv-anim-ready \[data-zpv-anim="bar"\]/);
  assert.match(sec, /@media \(prefers-reduced-motion: reduce\) \{\s*\.zpv \[data-zpv-anim\] \{ transition: none; \}/);
  assert.match(sec, /@media print \{[\s\S]*repeating-linear-gradient\(45deg/);
  assert.ok(!/#1f1a14|#e8e2d4|'Inter'/.test(sec), 'žádné natvrdo hexy inkoustu ani font');
});

test('CSS: každý selektor sekce .zpv- je definovaný jen jednou (v rámci kontextu)', () => {
  // Jen sekce .zpv-: od jejího markeru po další marker „Srovnávač pojišťoven“ (sekce .zpi-/.zpd- mají vlastní testy).
  const start = CSS.indexOf('/* === Srovnávač pojišťoven: vizuální primitivy');
  const next = CSS.indexOf('/* === Srovnávač pojišťoven:', start + 1);
  const sec = CSS.slice(start, next === -1 ? undefined : next);
  // odstraň komentáře a obsah @-bloků zpracuj zvlášť podle kontextu
  const clean = sec.replace(/\/\*[\s\S]*?\*\//g, '');
  const seen = new Map();
  let ctx = 'top';
  let depth = 0;
  for (const m of clean.matchAll(/([^{};]+)\{|\}/g)) {
    if (m[0] === '}') { depth -= 1; if (depth === 0) ctx = 'top'; continue; }
    const sel = m[1].trim();
    if (sel.startsWith('@')) { ctx = sel; depth += 1; continue; }
    depth += 1;
    const key = `${ctx}::${sel}`;
    assert.ok(!seen.has(key), `duplicitní selektor: ${key}`);
    seen.set(key, true);
  }
  assert.ok(seen.size > 50, 'parser našel pravidla sekce');
});

test('modul: čisté funkce bez DOM, importy jen escapeHtml + formatNumberCz', () => {
  assert.ok(!/\bdocument\.|\bwindow\./.test(SRC.replace(/\/\/.*$/gm, '')), 'žádný DOM');
  const imports = [...SRC.matchAll(/^import .*$/gm)].map((m) => m[0]);
  assert.deepEqual(imports, ["import { escapeHtml, formatNumberCz } from './page-shared.js';"]);
});

test('CSS: každá sekce srovnávače má vyrovnané závorky (chybějící } u @media print zanořila sekce .zpi- a .zpd- do tisku)', () => {
  const markers = [...CSS.matchAll(/\/\* === Srovnávač pojišťoven:[^\n]*\*\//g)].map((m) => m.index);
  assert.ok(markers.length >= 4, 'markery sekcí');
  markers.forEach((start, i) => {
    const sec = CSS.slice(start, markers[i + 1]).replace(/\/\*[\s\S]*?\*\//g, '');
    const open = (sec.match(/\{/g) || []).length, close = (sec.match(/\}/g) || []).length;
    assert.equal(open, close, `nevyrovnané závorky v sekci začínající na pozici ${start}`);
  });
});
