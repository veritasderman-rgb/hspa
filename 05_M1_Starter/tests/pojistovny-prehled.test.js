// Testy balíčku P1.6 (PLAN-SROVNAVAC-POJISTOVEN.md § 2.8): sdílený shell podstránek,
// přehled jako general view, síť smluvních odborností (prototyp) a úpravy primitiv
// z revize P1.5 (dumbbell: hodnota u plného bodu + osa; heatmapa: věta po seřazení).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ZP_STRANKY, ZP_SKUPINY, LEGACY_HASH, zpStrankaById, zpStrankyVSkupine, zpTabsHtml, zpShellHtml, zpZdrojeHtml, legacyRedirect,
} from '../src/pojistovny-shell.js';
import {
  aplikaceSkore, zpSouhrny, semaforRadekHtml, semaforMiniHtml, ovKartaHtml, ovMiniKartyHtml, temaKartyHtml, buildPrehled,
} from '../src/pojistovny-prehled.js';
import {
  sitSoucty, kvartilyHranice, levelByHranice, buildSitHeatmap, sitKrajRows, sitKrajTableHtml, renderSit, ODB_KRATKE,
} from '../src/pojistovny-sit.js';
import { heroTiles, buildKmenCharts } from '../src/pojistovny.js';
import { dumbbell, heatmap, HEAT_SORT_NOTE } from '../src/zp-viz.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const D = json('pojistovny.json');
const A = json('pojistovny-aplikace.json');
const P = json('pojistovny-prevence.json');
const SIT = json('pojistovny-sit.json');
const count = (s, re) => (s.match(re) || []).length;
const copy = (o) => JSON.parse(JSON.stringify(o));
const KODY = ['111', '201', '205', '207', '209', '211', '213'];

// ---------------------------------------------------------------- shell

test('shell: sedm stránek v pořadí záložek, soubory existují, podstránky mají větu a „co tam najdu“', () => {
  assert.deepEqual(ZP_STRANKY.map((s) => s.id), ['prehled', 'kmen', 'prevence', 'aplikace', 'gramotnost', 'metodika', 'indikatory']);
  for (const s of ZP_STRANKY) {
    assert.ok(fs.existsSync(path.join(ROOT, s.href)), s.href);
    if (s.id !== 'prehled') assert.ok(s.veta && s.co && s.kicker, s.id);
  }
  assert.equal(zpStrankaById('aplikace').label, 'Aplikace a servis');
  assert.match(zpStrankaById('aplikace').veta, /klientský servis, stížnosti na dostupnost/);
  assert.equal(zpStrankaById('kmen').href, 'pojistovny-kmen.html');
  assert.equal(zpStrankaById('nic'), null);
});

test('shell: dvě skupiny záložek — pro pojištěnce (5) a pro redakci a data (2), každá stránka v právě jedné', () => {
  assert.deepEqual(ZP_SKUPINY.map((g) => g.id), ['pojistenci', 'redakce']);
  assert.equal(ZP_SKUPINY[1].label, 'Pro redakci a data');
  assert.deepEqual(zpStrankyVSkupine('pojistenci').map((s) => s.id), ['prehled', 'kmen', 'prevence', 'aplikace', 'gramotnost']);
  assert.deepEqual(zpStrankyVSkupine('redakce').map((s) => s.id), ['metodika', 'indikatory']);
  assert.deepEqual(zpStrankyVSkupine('nic'), []);
  for (const s of ZP_STRANKY) assert.ok(ZP_SKUPINY.some((g) => g.id === s.skupina), `${s.id}: skupina`);
  // skupiny jdou za sebou: celé pojištěnecké pořadí předchází redakčnímu
  assert.deepEqual(ZP_STRANKY.map((s) => s.skupina), ['pojistenci', 'pojistenci', 'pojistenci', 'pojistenci', 'pojistenci', 'redakce', 'redakce']);
});

test('shell: záložky — aktivní s aria-current="page", jinak žádná; pásek a kicker', () => {
  const html = zpTabsHtml('prevence');
  assert.equal(count(html, /<a class="zpc-tab"/g), 7);
  assert.equal(count(html, /aria-current="page"/g), 1);
  assert.match(html, /href="pojistovny-prevence\.html" aria-current="page">Prevence</);
  assert.match(html, /<nav class="zpc-tabs" aria-label="Témata srovnávače">/);
  assert.equal(count(zpTabsHtml('xx'), /aria-current/g), 0);
  // dva seznamy: pojištěnci (5 záložek) a redakce (2), každý pojmenovaný skrytým popiskem skupiny
  assert.equal(count(html, /<ul class="zpc-tabs-grp /g), 2);
  const [grpP, grpR] = html.split(/<span class="zpc-tabs-lbl sr-only"/).slice(1);
  assert.match(grpP, /id="zpTabsLbl-pojistenci">Pro pojištěnce<\/span><ul class="zpc-tabs-grp zpc-tabs-grp--pojistenci" data-skupina="pojistenci" aria-labelledby="zpTabsLbl-pojistenci">/);
  assert.match(grpR, /id="zpTabsLbl-redakce">Pro redakci a data<\/span><ul class="zpc-tabs-grp zpc-tabs-grp--redakce" data-skupina="redakce" aria-labelledby="zpTabsLbl-redakce">/);
  assert.equal(count(grpP, /<a class="zpc-tab"/g), 5);
  assert.equal(count(grpR, /<a class="zpc-tab"/g), 2);
  assert.match(grpR, /pojistovny-metodika\.html/);
  assert.match(grpR, /pojistovny-indikatory\.html/);
  assert.doesNotMatch(grpP, /pojistovny-(metodika|indikatory)\.html/);
  // aktivní redakční stránka nese aria-current v druhé skupině
  const act = zpTabsHtml('indikatory').split('zpc-tabs-grp--redakce')[1];
  assert.match(act, /href="pojistovny-indikatory\.html" aria-current="page"/);
  const shell = zpShellHtml('kmen');
  assert.match(shell, /class="zpc-strip" role="note"/);
  assert.match(shell, /Srovnávač zdravotních pojišťoven · pracovní verze/);
});

test('shell: zdroje z pojistovny.json jako sbalená patička, escapování, prázdné = nic', () => {
  const html = zpZdrojeHtml(D);
  assert.equal(count(html, /<li>/g), D.zdroje.length);
  assert.match(html, /<details class="zpc-acc zpc-zdroje">/);
  assert.equal(zpZdrojeHtml({}), '');
  assert.ok(!zpZdrojeHtml({ zdroje: [{ nazev: '<script>x</script>' }] }).includes('<script>'));
});

test('shell: staré odkazy — dotazník a kotvy #modul-… míří na podstránky', () => {
  assert.equal(legacyRedirect('?dotaznik=rizikovi-pojistenci&token=abc', ''), 'pojistovny-gramotnost.html?dotaznik=rizikovi-pojistenci&token=abc');
  assert.equal(legacyRedirect('', '#modul-kmen'), 'pojistovny-kmen.html');
  assert.equal(legacyRedirect('', '#modul-plan'), 'pojistovny-metodika.html#modul-plan');
  assert.equal(legacyRedirect('', ''), null);
  assert.equal(legacyRedirect('?x=1', '#nic'), null);
  for (const to of Object.values(LEGACY_HASH)) assert.ok(fs.existsSync(path.join(ROOT, to.split('#')[0])), to);
});

// ---------------------------------------------------------------- přehled

test('přehled: aplikace n/10 — ZPŠ bez údajů = null, ostatní počet funkcí', () => {
  const s = aplikaceSkore(A);
  assert.equal(s.items.length, 7);
  assert.equal(s.max, A.funkce.length);
  assert.equal(s.items.find((i) => i.kod === '209').value, null);
  assert.equal(s.items.find((i) => i.kod === '111').value, 10);
  assert.ok(s.items.every((i) => i.tip));
  assert.deepEqual(aplikaceSkore(null).items, []);
});

test('přehled: karta pojišťovny — kmen, podíl, rezerva, aplikace; žádný fond prevence ani Σ stupňů', () => {
  const sou = zpSouhrny(D, A);
  assert.deepEqual(sou.map((s) => s.kod), KODY);
  const vzp = sou[0];
  assert.equal(vzp.pojistenci, D.pojistovny[0].crp.pojistenci);
  const html = ovKartaHtml(vzp);
  assert.match(html, /data-zp="111"/);
  assert.match(html, /<h2 id="zpOvKartaH">VZP ČR<\/h2>/);
  assert.match(html, /href="pojistovny-kmen\.html#zp-111"/);
  assert.doesNotMatch(html, /prevence|Σ/i);
  assert.doesNotMatch(html.replace(/ style="--c:var\(--zp-\d{3}\)"/g, ''), /style="/, 'jen barva tečky (dot), karta přes CSS');
  assert.equal(ovKartaHtml(null), '');
  const minis = ovMiniKartyHtml(sou);
  assert.equal(count(minis, /<button type="button" class="zpc-ov-mini" data-ov-zp=/g), 7);
  assert.doesNotMatch(minis, / data-zp=/, 'mini karty nejsou marky ani chipy');
});

test('přehled: semafor — bez verdiktů jeden řádek s odkazem na metodiku, s verdiktem miniatura 7 × 6', () => {
  const line = semaforRadekHtml(D);
  assert.match(line, /class="zpc-ov-semline"/);
  assert.match(line, /zatím nehodnoceno/);
  assert.match(line, /href="pojistovny-metodika\.html"/);
  assert.doesNotMatch(line, /<table/);
  const d = copy(D);
  d.pojistovny[0].semafor.prevence = { stav: 'dolozeno', zduvodneni: 'x', zdroj: 'y', rok: 2026 };
  const mini = semaforRadekHtml(d);
  assert.match(mini, /<table class="zpc-ov-semtab">/);
  assert.equal(count(mini, /<tr data-zp=/g), 7);
  assert.equal(count(mini, /<td data-stav=/g), 42);
  assert.equal(count(mini, /data-stav="dolozeno"/g), 1);
  assert.match(semaforMiniHtml({}), /nepodařilo/);
});

test('přehled: buildPrehled — tři dlaždice KPI, čtyři grafy z kmene (podíl, rezervy, náklady, provoz), bez matice VZ, aplikací a indexu kmene', () => {
  const out = buildPrehled({ d: D, a: A, p: P, tiles: heroTiles(D, { bezFondu: true }), kmen: buildKmenCharts(D) });
  assert.equal(count(out.hero, /class="zpv-tile"/g), 3);
  assert.doesNotMatch(out.hero, /na pojištěnce/);
  assert.equal(count(out.grafy, /<div class="zpc-ov-tile"/g), 4);
  assert.deepEqual([...out.grafy.matchAll(/data-tema="(\w+)"/g)].map((m) => m[1]), ['kmen', 'kmen', 'kmen', 'kmen']);
  assert.match(out.grafy, /zpv-segmented/);
  assert.match(out.grafy, /Rezervy na konci roku 2026/);
  assert.match(out.grafy, /Náklady na zdravotní služby na pojištěnce/);
  assert.match(out.grafy, /Provoz v % příjmů/);
  assert.doesNotMatch(out.grafy, /zpv-covtable/, 'matice pokrytí VZ z přehledu odešla (A0.1)');
  assert.doesNotMatch(out.grafy, /Co umí aplikace|Co výroční zprávy/, 'ani n/10 aplikací');
  assert.doesNotMatch(out.grafy, /zpv-heat|zpv-lines/, 'žádná heatmapa ani index kmene na přehledu');
  assert.doesNotMatch(out.grafy, /<table class="zpv-matrix zpv-heat/);
  assert.equal(count(out.grafy, /class="zpc-ov-more"/g), 4);
  assert.match(out.grafy, /Celé téma<span class="sr-only">: Kmen a hospodaření<\/span>/);
  assert.equal(count(out.grafy, /data-zp="111"/g) > 3, true, 'marky nesou data-zp');
  assert.match(out.semafor, /zatím nehodnoceno/);
  // rozcestník: 4 velké karty pro pojištěnce + 2 menší redakční v samostatném řádku
  assert.equal(count(out.temata, /class="zpc-tema-card"/g), 4);
  assert.equal(count(out.temataRedakce, /class="zpc-tema-card zpc-tema-card--mini"/g), 2);
  assert.doesNotMatch(out.temata, /pojistovny-(metodika|indikatory)\.html/);
  assert.match(out.temataRedakce, /pojistovny-metodika\.html/);
  assert.match(out.temataRedakce, /pojistovny-indikatory\.html/);
  // bez dat nepadá
  const empty = buildPrehled({ d: null, a: null, p: null });
  assert.equal(empty.grafy, '');
  assert.equal(empty.hero, '');
});

test('přehled: rozcestník — velké karty podstránek pro pojištěnce s kickerem, názvem, větou a „co tam najdu“', () => {
  const html = temaKartyHtml();
  assert.equal(html, temaKartyHtml('pojistenci'));
  for (const s of zpStrankyVSkupine('pojistenci').filter((x) => x.id !== 'prehled')) assert.match(html, new RegExp(`href="${s.href}"`));
  assert.doesNotMatch(html, /href="pojistovny\.html"/);
  assert.doesNotMatch(html, /pojistovny-(metodika|indikatory)\.html/, 'redakční stránky jdou do samostatného řádku');
  for (const c of ['zpc-tema-kicker', 'zpc-tema-title', 'zpc-tema-veta', 'zpc-tema-co']) assert.equal(count(html, new RegExp(c, 'g')), 4, c);
});

test('přehled: rozcestník — redakční stránky jako menší karty bez věty, v HTML pod nadpisem „Pro redakci a data“', () => {
  const html = temaKartyHtml('redakce');
  for (const s of zpStrankyVSkupine('redakce')) assert.match(html, new RegExp(`href="${s.href}"`));
  assert.equal(count(html, /zpc-tema-card--mini/g), 2);
  assert.equal(count(html, /zpc-tema-title/g), 2);
  assert.equal(count(html, /zpc-tema-co/g), 2);
  assert.doesNotMatch(html, /zpc-tema-veta/);
  assert.equal(temaKartyHtml('nic'), '');
  const page = fs.readFileSync(path.join(ROOT, 'pojistovny.html'), 'utf8');
  assert.match(page, /<h3 class="zpc-ov-h3" id="zpOvRedakceH">Pro redakci a data<\/h3>\s*<ul id="zpOvTemataRedakce" class="zpc-tema-grid zpc-tema-grid--mini" aria-labelledby="zpOvRedakceH">/);
  assert.ok(page.indexOf('id="zpOvTemata"') < page.indexOf('id="zpOvRedakceH"'), 'redakční řádek je pod pojištěneckými kartami');
});

// ---------------------------------------------------------------- síť odborností

test('síť: součty ČR — podíl = smluvní místa / evidovaná místa, 7 × 7', () => {
  const s = sitSoucty(SIT);
  assert.deepEqual(Object.keys(s), KODY);
  for (const kod of KODY) {
    assert.equal(Object.keys(s[kod]).length, SIT.odbornosti.length);
    for (const v of Object.values(s[kod])) {
      assert.ok(v.pct > 0 && v.pct <= 100, `${kod}: ${v.pct}`);
      assert.ok(v.smluvni <= v.celkem);
    }
  }
  // ruční kontrola jedné buňky: alergologie VZP
  const n = Object.values(SIT.matice['111']['207']).reduce((a, b) => a + b, 0);
  const c = Object.values(SIT.celkem_cr['207']).reduce((a, b) => a + b, 0);
  assert.equal(s['111']['207'].smluvni, n);
  assert.equal(s['111']['207'].celkem, c);
  // dokument: velké ZP 60–69 % u alergologie, ZPŠ a RBP výrazně méně
  assert.ok(s['209']['207'].pct < s['111']['207'].pct);
  assert.ok(s['213']['404'].pct < s['201']['404'].pct);
});

test('síť: kvartily a stupně — hranice, hodnota na hranici do nižšího stupně, null', () => {
  const h = kvartilyHranice([1, 2, 3, 4, 5]);
  assert.deepEqual(h, [2, 3, 4]);
  assert.equal(levelByHranice(2, h), 0);
  assert.equal(levelByHranice(2.5, h), 1);
  assert.equal(levelByHranice(4, h), 2);
  assert.equal(levelByHranice(4.1, h), 3);
  assert.equal(levelByHranice(null, h), null);
  assert.equal(kvartilyHranice([null, undefined]), null);
  assert.equal(levelByHranice(3, null), null);
});

test('síť: heatmapa — 49 buněk s číslem, popisky stupňů jako rozsahy, bez řazení, tip s počty a stavem', () => {
  const hm = buildSitHeatmap(SIT);
  assert.equal(hm.rows.length, 7);
  assert.equal(hm.cols.length, 7);
  assert.equal(hm.cols.find((c) => c.key === '207').label, ODB_KRATKE['207']);
  assert.match(hm.levels[0], /^do \d+ %$/);
  assert.match(hm.levels[3], /^nad \d+ %$/);
  const html = renderSit(SIT);
  assert.equal(count(html, /<td class="zpv-cell" data-level="[0-3]"/g), 49);
  assert.equal(count(html, /button class="zpv-sort"|class="zpv-sort"/g), 0, 'bez řazení (pořadí velkých ZP nevyvozovat)');
  assert.match(html, /\d+ % — [^"]*evidovaných míst · horní odhad, stav 31\. 12\. 2024/);
  const levels = [...html.matchAll(/data-level="([0-3])"/g)].map((m) => Number(m[1]));
  for (const l of [0, 1, 2, 3]) assert.ok(levels.filter((x) => x === l).length >= 10, `stupeň ${l} ~ čtvrtina buněk`);
  assert.match(html, /<tr data-zp="209">/);
  assert.match(html, /Zdroj: ÚZIS · číselník IČZ \(NR-04-64\) a NRPZS \(NR-01-06\), prototyp · 2024/);
});

test('síť: tabulka kraj × ZP pro vybranou odbornost, select, odkaz na dokument, chybějící data', () => {
  const rows = sitKrajRows(SIT, '404');
  assert.equal(rows.length, SIT.kraje.length);
  assert.ok(rows.every((r) => Object.keys(r.zp).length === 7));
  const t = sitKrajTableHtml(SIT, '404');
  assert.equal(count(t, /<tr><th scope="row">/g), 14);
  assert.match(t, /role="region" tabindex="0"/);
  const html = renderSit(SIT, '305');
  assert.match(html, /<option value="305" selected>/);
  assert.equal(count(html, /<option /g), 7);
  assert.match(html, /href="https:\/\/github\.com\/veritasderman-rgb\/hspa\/blob\/main\/docs\/pojistovny-sit\.md"/);
  assert.match(renderSit(null), /nepodařilo/);
  assert.match(renderSit({ matice: {}, odbornosti: [] }), /nepodařilo/);
});

// ---------------------------------------------------------------- primitivy (revize P1.5)

test('dumbbell: hodnota u plného bodu i při poklesu, osa od 0,9 × minima s poznámkou, sortNote', () => {
  const items = [{ key: 'a', label: 'A', from: 900, to: 1000 }, { key: 'b', label: 'B', from: 1200, to: 950 }];
  const h = dumbbell(items, { title: 't' });
  assert.match(h, /Osa nezačíná nulou \(od 810\)/);
  assert.match(h, /Řazeno podle hodnoty, nejde o hodnocení/);
  // pokles: popisek vlevo od plného bodu (--x = poloha „to“)
  const to = h.match(/data-key="b"[\s\S]*?class="zpv-db-to zpv-mark"[^>]*style="--w:([\d.]+%)/)[1];
  assert.match(h, new RegExp(`class="zpv-val zpv-val--neg zpv-val--db" style="--x:${to.replace('.', '\\.')}">950<`));
  // růst: popisek vpravo od plného bodu
  const toA = h.match(/data-key="a"[\s\S]*?class="zpv-db-to zpv-mark"[^>]*style="--w:([\d.]+%)/)[1];
  assert.match(h, new RegExp(`class="zpv-val" style="--w:${toA.replace('.', '\\.')}">1\\s000<`));
  // široký rozsah → osa od nuly, bez poznámky; sortNote:false vypne větu
  const h2 = dumbbell([{ key: 'x', label: 'X', from: 1, to: 100 }], { sortNote: false });
  assert.doesNotMatch(h2, /Osa nezačíná nulou|Řazeno podle/);
});

test('heatmap: věta „Řazeno podle stupně, nejde o hodnocení pojišťoven“ je skrytá, dokud se neřadí', () => {
  const rows = [{ kod: '111', label: 'VZP' }];
  const cols = [{ key: 'a', label: 'A' }];
  const h = heatmap(rows, cols, () => ({ level: 2 }), { title: 'H' });
  assert.match(h, new RegExp(`<span class="zpv-sortnote" data-zpv-sortnote hidden>${HEAT_SORT_NOTE}</span>`));
  assert.doesNotMatch(heatmap(rows, cols, () => ({ level: 2 }), { title: 'H', sortable: false }), /data-zpv-sortnote/);
  const src = fs.readFileSync(path.join(ROOT, 'src', 'zp-interact.js'), 'utf8');
  assert.match(src, /\[data-zpv-sortnote\][\s\S]{0,80}hidden = false/);
});

test('styles.css: P1.6 třídy existují v sekci .zpc- a bez pevných barev, --red jen mimo srovnávač', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8');
  const start = css.indexOf('/* P1.6: přehled (general view)');
  const end = css.indexOf('/* === Srovnávač pojišťoven: vizuální primitivy');
  assert.ok(start > 0 && end > start);
  const sec = css.slice(start, end);
  for (const c of ['.zpc-shell', '.zpc-tabs', '.zpc-tab[aria-current="page"]', '.zpc-overview-grid', '.zpc-ov-tile', '.zpc-ov-karta',
    '.zpc-ov-mini', '.zpc-tema-card', '.zpc-ov-semline', '.zpc-sit-limit', '.zpc-sit-select',
    '.zpc-tabs-grp--redakce', '.zpc-tema-card--mini', '.zpc-tema-grid--mini', '.zpc-ov-h3', '.zpc-stari', '.zpc-stari-wrap', '.zpc-stari-warn']) assert.ok(sec.includes(c), c);
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(sec), 'jen tokeny');
  const zp = css.slice(css.indexOf('/* === Srovnávač pojišťoven: stránka'), css.indexOf('/* === Srovnávač pojišťoven: dotazníky'));
  assert.ok(!/var\(--red\)/.test(zp), '--red patří hrotu střelky a stavu bad, ne srovnávači');
});
