// Testy stránky Peníze (A1.2–A1.6): čisté funkce src/pojistovny-penize.js, HTML stránky, přesun
// sekcí z Kmene, karta ZP se státními pojištěnci. Žádné „žebříčky“ ani skóre; seřazené grafy nesou SORT_NOTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sg, rokPrerozdeleni, buildSaldoChart, buildPodilyPredPo, buildSaldoTabulka, saldoTabulkaHtml, buildVyberMesicni, vyberMesicniHtml,
  UKAZATELE, UKAZATEL_VYCHOZI, rokyUkazatele, crHodnota, buildRadyChart, radyHtml, prepinacRokuHtml, stavZUrl, stavDoUrl,
  buildStatni, statniKarta, buildSegmenty, urovenV, buildFondProvoz, VYBER_REZIMY,
} from '../src/pojistovny-penize.js';
import { statniDd } from '../src/pojistovny.js';
import { rankedBars, segmentedBar, SORT_NOTE } from '../src/zp-viz.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const PR = json('pojistovny-prerozdeleni.json');
const R = json('pojistovny-hospodareni-rady.json');
const S = json('pojistovny-segmenty.json');
const html = fs.readFileSync(path.join(ROOT, 'pojistovny-penize.html'), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

test('sg: znaménko, typografické minus, jednotka', () => {
  assert.equal(sg(2.34, 1, 'mld Kč'), '+2,3 mld Kč');
  assert.match(sg(-9.23, 1), /^−9,2$/);
  assert.equal(sg(null), 'nedohledáno');
});

test('saldo: rok z dat, diverging graf, součet sald = 0, tooltip s % a Kč na pojištěnce', () => {
  const ch = buildSaldoChart(PR);
  assert.equal(ch.rok, PR.posledni_rok_rocni);
  assert.match(ch.opts.title, new RegExp(`Relativní saldo přerozdělení ${ch.rok} po pojišťovnách`));
  assert.equal(ch.opts.allowNegative, true);
  assert.equal(ch.opts.signed, true);
  assert.match(ch.opts.sub, /Součet je nula\. Je to fakt zákonného mechanismu, ne hodnocení\./);
  assert.equal(ch.items.length, 7);
  const sum = ch.items.reduce((a, i) => a + i.value, 0);
  assert.ok(Math.abs(sum) < 0.01, `součet ${sum}`);
  assert.match(ch.items[0].tip, /vybraného pojistného/);
  assert.match(ch.items[0].tip, /na pojištěnce/);
  const fig = rankedBars(ch.items, ch.opts);
  assert.match(fig, /zpv-has-neg/);
  assert.ok(fig.includes(SORT_NOTE), 'SORT_NOTE u seřazeného grafu');
  assert.match(fig, /\+17,2[\s\u00a0]mld Kč/);
  assert.match(fig, /−10,0[\s\u00a0]mld Kč/);
  // rok se mění s daty
  const pr2 = JSON.parse(JSON.stringify(PR));
  pr2.posledni_rok_rocni = 2024;
  assert.match(buildSaldoChart(pr2).opts.title, /2024/);
  assert.equal(rokPrerozdeleni({}), null);
});

test('před a po přerozdělení: dva segmentedBary za týž rok, 7 částí, součty odpovídají', () => {
  const pp = buildPodilyPredPo(PR);
  assert.equal(pp.pred.parts.length, 7);
  assert.match(pp.pred.opts.title, /Podíl na vybraném pojistném/);
  assert.match(pp.po.opts.title, /Podíl na částce po přerozdělení/);
  const s1 = pp.pred.parts.reduce((a, p) => a + p.value, 0);
  const s2 = pp.po.parts.reduce((a, p) => a + p.value, 0);
  assert.ok(s2 > s1, 'po přerozdělení je víc (platba státu)');
  const fig = segmentedBar(pp.pred.parts, pp.pred.opts);
  assert.equal(count(fig, /class="zpv-seg zpv-mark"/g), 7);
});

test('tabulka salda: roky 2019–poslední, pevné pořadí podle kódu, data-zp řádky, znaménka', () => {
  const t = buildSaldoTabulka(PR);
  assert.equal(t.roky[0], 2019);
  assert.equal(t.roky[t.roky.length - 1], PR.posledni_rok_rocni);
  assert.deepEqual(t.radky.map((r) => r.kod), ['111', '201', '205', '207', '209', '211', '213']);
  const h = saldoTabulkaHtml(PR);
  assert.equal(count(h, /<tr data-zp=/g), 7);
  assert.match(h, /\+11,9/);
  assert.match(h, /−16,4/);
  assert.match(h, /nejde o hodnocení/);
  assert.match(saldoTabulkaHtml({}), /nedohledáno/);
});

test('měsíční výběr: 7 sérií, bez VZP 6, značky osy po lednech, index = 100 v prvním měsíci', () => {
  const v = buildVyberMesicni(PR, 'vse');
  assert.equal(v.series.length, 7);
  assert.equal(v.series[0].points.length, PR.mesice.length);
  assert.equal(v.opts.xTicks[0].label, '2019');
  assert.ok(v.opts.xTicks.every((t) => /^\d{4}$/.test(t.label)));
  assert.equal(buildVyberMesicni(PR, 'bez-vzp').series.length, 6);
  assert.ok(!buildVyberMesicni(PR, 'bez-vzp').series.some((s) => s.kod === '111'));
  assert.match(vyberMesicniHtml(PR, 'vse'), /zpv-lines/);
  assert.match(vyberMesicniHtml(PR, 'bez-vzp'), /Bez VZP ČR/);
  assert.deepEqual(VYBER_REZIMY.map((r) => r.id), ['vse', 'bez-vzp']);
  assert.equal(buildVyberMesicni({}).series.length, 0);
});

test('ukazatele: typy, výchozí, index vs. bary, ČR jen u ukazatelů na pojištěnce', () => {
  assert.equal(UKAZATEL_VYCHOZI, 'naklady_na_pojistence_kc');
  assert.ok(UKAZATELE.every((u) => ['index', 'bary'].includes(u.typ) && u.label && u.unit));
  for (const id of ['naklady_na_pojistence_kc', 'prijmy_celkem_mld', 'naklady_zs_mld', 'provozni_naklady_pct', 'statni_pojistenci_pct', 'zustatek_bu_zfzp_mld', 'hospodarsky_vysledek_mld', 'fond_prevence_na_pojistence_kc', 'pojistencu_na_zamestnance']) {
    assert.ok(UKAZATELE.some((u) => u.id === id), id);
  }
  const idx = buildRadyChart(R, 'naklady_na_pojistence_kc', null);
  assert.equal(idx.typ, 'index');
  assert.equal(idx.series.length, 8, '7 ZP + ČR');
  assert.equal(idx.series[7].key, 'cr');
  assert.equal(idx.opts.base, 2015);
  assert.equal(buildRadyChart(R, 'prijmy_celkem_mld', null).series.length, 7, 'součty bez ČR');
  const fig = radyHtml(R, { ukazatel: 'naklady_na_pojistence_kc', rok: null });
  assert.match(fig, /zpv-lines/);
  assert.match(fig, /<select class="zpc-sit-select" id="zpRadySel" data-rady-sel>/);
  assert.doesNotMatch(fig, /data-rok=/, 'u indexu bez přepínače roku');
  const bar = buildRadyChart(R, 'provozni_naklady_pct', 2023);
  assert.equal(bar.typ, 'bary');
  assert.equal(bar.rok, 2023);
  assert.ok(!bar.roky.includes(2015), 'provoz jen od 2018');
  assert.equal(buildRadyChart(R, 'provozni_naklady_pct', 1999).rok, 2024, 'neznámý rok = poslední');
  const sal = buildRadyChart(R, 'hospodarsky_vysledek_mld', 2024);
  assert.equal(sal.opts.allowNegative, true);
  assert.equal(sal.opts.signed, true);
  const html2 = radyHtml(R, { ukazatel: 'hospodarsky_vysledek_mld', rok: 2022 });
  assert.match(html2, /data-rok="2022"/);
  assert.match(html2, /aria-checked="true"[^>]*data-rok="2022"|data-rok="2022"[^>]*>/);
  assert.ok(html2.includes(SORT_NOTE));
  assert.equal(buildRadyChart(R, 'nesmysl', null).ukazatel.id, UKAZATEL_VYCHOZI);
  assert.equal(buildRadyChart(null, 'naklady_na_pojistence_kc', null).series.length, 0);
  assert.match(radyHtml(null, { ukazatel: 'x', rok: null }), /nedohledáno|Údaje nejsou/);
  assert.match(prepinacRokuHtml([2023, 2024], 2024), /role="radiogroup" aria-label="Rok"/);
  assert.deepEqual(rokyUkazatele(R, 'statni_pojistenci_pct'), [2018, 2019, 2020, 2021, 2022, 2023, 2024]);
});

test('stav v URL: ?ukazatel=…&rok=…&vyber=…, výchozí se nezapisuje, neznámé = výchozí', () => {
  assert.deepEqual(stavZUrl('?ukazatel=provozni_naklady_pct&rok=2022&vyber=bez-vzp&segment=luz_celkem'), { ukazatel: 'provozni_naklady_pct', rok: 2022, segment: 'luz_celkem', vyber: 'bez-vzp' });
  assert.deepEqual(stavZUrl('?ukazatel=x&rok=abc&vyber=y'), { ukazatel: UKAZATEL_VYCHOZI, rok: null, segment: null, vyber: 'vse' });
  assert.equal(stavDoUrl({ ukazatel: UKAZATEL_VYCHOZI, rok: null, segment: null, vyber: 'vse' }), '');
  assert.equal(stavDoUrl({ ukazatel: 'provozni_naklady_pct', rok: 2022, segment: null, vyber: 'vse' }), '?ukazatel=provozni_naklady_pct&rok=2022');
  assert.equal(stavDoUrl({ ukazatel: UKAZATEL_VYCHOZI, rok: null, segment: null, vyber: 'vse' }, '?kmen=bez-vzp&ukazatel=x'), '?kmen=bez-vzp');
});

test('státní pojištěnci: poslední rok, pásmo ČR odvozené (cr je null) a označené; karta ZP', () => {
  const st = buildStatni(R);
  assert.equal(st.rok, 2024);
  assert.equal(st.items.length, 7);
  assert.ok(st.cr && st.cr.odvozeno);
  assert.ok(st.cr.value > 55 && st.cr.value < 57);
  assert.match(st.opts.sub, /Za státní pojištěnce \(děti, důchodci, nezaměstnaní…\) platí pojistné stát; podíl je u všech pojišťoven podobný\./);
  assert.ok(rankedBars(st.items, st.opts).includes(SORT_NOTE));
  assert.deepEqual(statniKarta(R, '111'), { hodnota: 55.71, rok: 2024 });
  assert.equal(statniKarta(R, '999'), null);
  assert.equal(statniKarta(null, '111'), null);
  assert.match(statniDd(R, '111'), /55,7 %/);
  assert.match(statniDd(null, '111'), /nedohledáno/, 'bez souboru nedohledáno');
  const x = crHodnota({ ...R, cr: { rady: { statni_pojistenci_pct: { 2024: { hodnota: 56 } } } } }, 'statni_pojistenci_pct', 2024);
  assert.deepEqual(x, { value: 56, label: 'ČR', odvozeno: false });
});

test('segmenty: 7 pruhů po skupinách, dumbbell 6 největších, rankedBars na pojištěnce s pásmem ČR; bez dat null', () => {
  const ch = buildSegmenty(S, R, { kod: '111', segment: null });
  assert.equal(ch.rok, 2024);
  assert.equal(ch.bary.length, 7);
  for (const b of ch.bary) {
    assert.equal(b.opts.maxParts, 5);
    const sum = b.parts.reduce((a, p) => a + p.value, 0);
    const celkem = S.pojistovny.find((z) => z.kod === b.kod).celkem['2024'].tis_kc / 1e6;
    assert.ok(Math.abs(sum - celkem) / celkem < 0.005, `${b.zkratka}: skupiny ≈ celkem`);
  }
  assert.equal(ch.dumbbell.items.length, 6);
  assert.ok(ch.dumbbell.items.every((i) => i.to > 0));
  assert.ok(ch.perPojistence.items.length === 7 && ch.perPojistence.cr);
  assert.ok(ch.moznosti.length > 11);
  assert.equal(urovenV({ uroven: 2, uroven_podle_roku: { 2022: 1 } }, 2022), 1);
  assert.equal(urovenV({ uroven: 2 }, 2024), 2);
  const luz = buildSegmenty(S, R, { segment: 'luz_celkem' });
  assert.equal(luz.perPojistence.segmentId, 'luz_celkem');
  assert.equal(buildSegmenty(S, R, { kod: '205' }).dumbbell.kod, '205');
  assert.equal(buildSegmenty(null, R), null);
  assert.equal(buildSegmenty({ pojistovny: [] }, R), null);
});

test('fond prevence a provoz: kontext, limit 100 % jako čára, využití limitu 2024', () => {
  const fp = buildFondProvoz(R);
  assert.match(fp.fond.opts.sub, /Kontext, ne hlavní ukazatel \(rozhodnutí PS 7\. 10\. 2026\)/);
  assert.equal(fp.fond.series.length, 8);
  assert.equal(fp.provoz.rok, 2024);
  assert.equal(fp.provoz.opts.ref.value, 100);
  assert.equal(fp.provoz.opts.ref.kind, 'line');
  assert.match(fp.provoz.opts.title, /Využití zákonného limitu přídělu na provoz 2024/);
  assert.match(fp.provoz.items[0].tip, /maximálního přídělu/);
  assert.ok(rankedBars(fp.provoz.items, fp.provoz.opts).includes(SORT_NOTE));
  assert.equal(buildFondProvoz({}).provoz.items.length, 0);
});

test('stránka pojistovny-penize.html: noindex, h1, shell Peníze, kontejnery, Jak systém funguje, texty z _doc', () => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.match(html, /<title>Peníze — Srovnávač pojišťoven, pracovní verze · HSPA Monitor<\/title>/);
  assert.equal(count(html, /<h1/g), 1);
  assert.match(html, /<div id="zpShell" class="zpc-shell" data-aktivni="penize">/);
  assert.match(html, /href="src\/styles\.min\.css"/);
  assert.match(html, /<script type="module" src="src\/pojistovny\.js">/);
  assert.match(html, /^<!--\s*\n\s*audit:|<!--\s*\n\s*audit:/m);
  for (const id of ['zpMojeZp', 'zpPrerozdeleni', 'zpRady', 'zpStatni', 'zpSegmenty', 'zpFondProvoz', 'zpTableFin', 'zpChartZust', 'zpChartProvoz', 'zpChartYoy', 'zpZdroje', 'siteFooter']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /Jak systém funguje[\s\S]*href="jak-funguje\.html\?id=prerozdeleni_pojistneho"/);
  assert.match(html, /Čisté saldo vůči platbě státu z veřejných dat spočítat nejde/);
  assert.match(html, /nejde o hodnocení/);
  assert.doesNotMatch(html, /žebříček/i);
  // pořadí sekcí
  const poradi = ['id="prerozdeleni"', 'id="hospodareni-rady"', 'id="statni-pojistenci"', 'id="segmenty"', 'id="fond-provoz"', 'id="hospodareni-2024"'].map((x) => html.indexOf(x));
  assert.deepEqual([...poradi].sort((a, b) => a - b), poradi);
  assert.ok(poradi.every((i) => i > 0));
});

test('přesun z Kmene: Hospodaření 2024, rezervy, provoz a výroční zprávy 2025 jsou na Penězích, na Kmeni zůstává kmen a náklady na pojištěnce', () => {
  const kmen = fs.readFileSync(path.join(ROOT, 'pojistovny-kmen.html'), 'utf8');
  for (const id of ['zpTableFin', 'zpChartZust', 'zpChartProvoz', 'zpChartYoy']) {
    assert.doesNotMatch(kmen, new RegExp(`id="${id}"`), `${id} z Kmene odešlo`);
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const id of ['zpCards', 'zpChart65', 'zpChartNzs', 'zpKmenMesicni', 'zpSit']) assert.match(kmen, new RegExp(`id="${id}"`), id);
  assert.match(kmen, /href="pojistovny-penize\.html"/);
  const js = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  assert.match(js, /function renderHospodareni\(d\)/);
  assert.match(js, /if \(has\(\['zpCards', 'zpChartShare'\]\)\) renderKmen\(d, rady\)/);
  assert.match(js, /has\(\['zpTableFin', 'zpChartZust', 'zpChartProvoz', 'zpChartYoy'\]\)\) renderHospodareni\(d\)/);
});
