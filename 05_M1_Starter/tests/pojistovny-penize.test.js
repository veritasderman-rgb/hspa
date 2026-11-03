// Testy stránky Peníze (A1.2–A1.6): čisté funkce src/pojistovny-penize.js, HTML stránky, přesun
// sekcí z Kmene, karta ZP se státními pojištěnci. Žádné „žebříčky“ ani skóre; seřazené grafy nesou SORT_NOTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sg, rokPrerozdeleni, buildSaldoChart, buildPodilyPredPo, buildSaldoTabulka, saldoTabulkaHtml, buildVyberMesicni, vyberMesicniHtml,
  UKAZATELE, UKAZATEL_VYCHOZI, rokyUkazatele, klouzavySoucet12, vyberMesicniTabulka, kratkySegment, crHodnota, buildRadyChart, radyHtml, prepinacRokuHtml, stavZUrl, stavDoUrl,
  buildStatni, statniKarta, buildSegmenty, urovenV, buildFondProvoz, buildFond, buildFondKontext, fondKontextHtml, fondHtml, fondRoky, fondRokZUrl, fondPrepinacHtml, FOND_ROK_ID, VYBER_REZIMY, buildSlozky, buildNaPojistence, prepinacVyberuHtml,
} from '../src/pojistovny-penize.js';
import { statniDd } from '../src/pojistovny.js';
import { rankedBars, segmentedBar, stackedRows, SORT_NOTE } from '../src/zp-viz.js';

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

test('klouzavý 12měsíční součet: od 12. měsíce, okno s chybějícím měsícem = null, délka řady se zachovává', () => {
  const r = klouzavySoucet12([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3]);
  assert.equal(r.length, 14);
  assert.deepEqual(r.slice(0, 11), new Array(11).fill(null));
  assert.equal(r[11], 12);
  assert.equal(r[12], 13);
  assert.equal(r[13], 15);
  const mezera = klouzavySoucet12([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, null, 3]);
  assert.equal(mezera[11], 12);
  assert.equal(mezera[12], null);
  assert.equal(mezera[13], null);
  assert.deepEqual(klouzavySoucet12(null), []);
  assert.deepEqual(klouzavySoucet12([5, 5]), [null, null]);
});

test('měsíční výběr: klouzavý součet od 12. měsíce, index prvního dostupného = 100, měsíční řada v tabulce', () => {
  const v = buildVyberMesicni(PR, 'vse');
  assert.equal(v.series.length, 7);
  assert.equal(v.series[0].points.length, PR.mesice.length - 11, 'bod až od 12. měsíce');
  const z = PR.pojistovny[0];
  const soucet12 = z.vybrano.slice(0, 12).reduce((a, b) => a + b, 0);
  assert.equal(v.series[0].points[0].value, soucet12);
  assert.equal(v.opts.base, v.series[0].points[0].year, 'index = 100 v prvním dostupném měsíci');
  assert.match(v.opts.title, /klouzavý 12měsíční součet \(index 12\/2019 = 100\)/);
  assert.match(v.opts.sub, /Součet posledních 12 měsíců, index 12\/2019 = 100; měsíční řada v tabulce/);
  const html = vyberMesicniHtml(PR, 'vse');
  assert.equal(count(html, /<details class="zpv-table"/g), 2, 'dvě dvojčata: klouzavé (index) a měsíční hodnoty');
  assert.match(html, /Zobrazit měsíční řadu jako tabulku/);
  assert.match(html, /<th scope="row">1\/2019<\/th>/, 'měsíční tabulka začíná 1/2019');
  assert.match(html, /<th scope="row">12\/2019<\/th>/);
  assert.equal(vyberMesicniTabulka({}, 'vse'), '');
  assert.equal(v.opts.xTicks[0].label, '2020', 'značky osy jen uvnitř řady (první leden po 12/2019)');
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
  for (const id of ['naklady_na_pojistence_kc', 'prijmy_celkem_mld', 'naklady_zs_mld', 'provozni_naklady_pct', 'statni_pojistenci_pct', 'zustatek_bu_zfzp_mld', 'hospodarsky_vysledek_mld', 'pojistencu_na_zamestnance']) {
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
  assert.match(fig, /<select class="zpc-sit-select zpc-ctl-select" data-switch="ukazatel" data-default="naklady_na_pojistence_kc">/);
  assert.doesNotMatch(fig, /data-switch="rok"/, 'u indexu bez přepínače roku');
  const bar = buildRadyChart(R, 'provozni_naklady_pct', 2023);
  assert.equal(bar.typ, 'bary');
  assert.equal(bar.rok, 2023);
  assert.ok(!bar.roky.includes(2015), 'provoz jen od 2018');
  assert.equal(buildRadyChart(R, 'provozni_naklady_pct', 1999).rok, 2024, 'neznámý rok = poslední');
  const sal = buildRadyChart(R, 'hospodarsky_vysledek_mld', 2024);
  assert.equal(sal.opts.allowNegative, true);
  assert.equal(sal.opts.signed, true);
  const html2 = radyHtml(R, { ukazatel: 'hospodarsky_vysledek_mld', rok: 2022 });
  assert.match(html2, /data-switch="rok"/);
  assert.match(html2, /aria-checked="true" tabindex="0" data-value="2022"/);
  assert.ok(html2.includes(SORT_NOTE));
  assert.equal(buildRadyChart(R, 'nesmysl', null).ukazatel.id, UKAZATEL_VYCHOZI);
  assert.equal(buildRadyChart(null, 'naklady_na_pojistence_kc', null).series.length, 0);
  assert.match(radyHtml(null, { ukazatel: 'x', rok: null }), /nedohledáno|Údaje nejsou/);
  assert.match(prepinacRokuHtml([2023, 2024], 2024), /role="radiogroup" aria-label="Rok" data-switch="rok"/);
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

test('ukazatele řad: indexovaný graf „Fond prevence na pojištěnce“ je stažen (A6.1), ani v HTML Peněz není', () => {
  assert.ok(!UKAZATELE.some((u) => u.id === 'fond_prevence_na_pojistence_kc'));
  assert.ok(!UKAZATELE.some((u) => /^fond_prevence/.test(u.id)));
  assert.equal(buildRadyChart(R, 'fond_prevence_na_pojistence_kc', null).ukazatel.id, UKAZATEL_VYCHOZI, 'starý odkaz padá na výchozí ukazatel');
  assert.doesNotMatch(html, /fond_prevence_na_pojistence_kc/);
  assert.doesNotMatch(radyHtml(R, { ukazatel: 'fond_prevence_na_pojistence_kc', rok: null }), /Fond prevence na pojištěnce/);
  assert.doesNotMatch(fondHtml(R, null), /fond_prevence_na_pojistence_kc|Fond prevence na pojištěnce \d{4}/);
});

test('fond prevence (a): zdravotní programy na pojištěnce za rok, ČR jako čára, poznámka k covidu a VZP 2023', () => {
  assert.deepEqual(fondRoky(R), [2018, 2019, 2020, 2021, 2022, 2023, 2024]);
  const f = buildFond(R, 2024);
  assert.equal(f.rok, 2024);
  assert.equal(f.programy.items.length, 7);
  assert.deepEqual(f.programy.items.map((i) => Math.round(i.value)), [290, 250, 306, 316, 105, 323, 82]);
  assert.match(f.programy.opts.title, /Zdravotní programy z fondu prevence na pojištěnce 2024/);
  assert.match(f.programy.opts.sub, /bez ozdravných pobytů a „ostatních činností“ \(2021–22 testování na covid\)/);
  assert.match(f.programy.opts.sub, /VZP má od 2023 stejné zdroje fondu jako zaměstnanecké ZP/);
  assert.equal(f.programy.opts.ref.label, 'ČR');
  assert.ok(Math.abs(f.programy.opts.ref.value - 284.48) < 0.01, "ČR 2024 = 3 085 mil. Kč / pojištěnci");
  assert.match(f.programy.items[0].tip, /VZP ČR: 290 Kč na pojištěnce .* 2024/);
  const fig = rankedBars(f.programy.items, f.programy.opts);
  assert.ok(fig.includes(SORT_NOTE));
  assert.equal(count(fig, /data-zp="/g) >= 7, true, 'marky nesou data-zp pro Moje pojišťovna / Porovnat s');
  assert.match(fig, /Stáhnout CSV/);
  // rok mimo rozsah (2017, nesmysl) padá na poslední; změna roku mění hodnoty
  assert.equal(buildFond(R, 2017).rok, 2024);
  assert.equal(buildFond(R, 'x').rok, 2024);
  assert.notEqual(buildFond(R, 2021).programy.items[0].value, f.programy.items[0].value);
  assert.equal(buildFond({}).programy.items.length, 0);
  assert.equal(buildFond({}).rok, null);
});

test('fond prevence (b): složení programy / pobyty / ostatní po pojišťovnách pro zvolený rok (stackedRows)', () => {
  const f = buildFond(R, 2021);
  const st = f.struktura;
  assert.deepEqual(st.parts.map((p) => p.key), ['programy', 'pobyty', 'ostatni']);
  const vzp = st.rows.find((r) => r.kod === '111');
  assert.equal(st.cell(vzp, st.parts[0]), 331);
  assert.equal(st.cell(vzp, st.parts[2]), 615);
  assert.equal(st.jine, 16, 'VoZP jiné zdroje 2021');
  const html2 = stackedRows(st.rows, st.parts, st.cell, st.opts);
  assert.match(html2, /Kam fond prevence teče 2021/);
  assert.equal(count(html2, /class="zpv-srow"/g), 7);
  // VZP 2021: ostatní činnosti 615 z 946 ≈ 65 %
  assert.match(html2, /VZP ČR, Ostatní činnosti: 65,0 %/);
  assert.match(st.opts.sub, /Hodnocení nedefinuje/);
  // jiné zdroje VoZP se do podílů nepočítají a jsou řečeny větou
  assert.match(fondHtml(R, null, 2024), /VoZP ČR navíc čerpala 19 mil\. Kč „z jiných zdrojů“/);
});

test('fond prevence (c): podíl „ostatních činností“ ČR 2015–2024, covid 2021–22 viditelný', () => {
  const o = buildFond(R, null).ostatniCr;
  assert.deepEqual(o.items.map((i) => i.label), ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024']);
  const v = (y) => o.items.find((i) => i.label === String(y)).value;
  assert.ok(v(2021) > 40 && v(2022) > 35, 'covid');
  assert.ok(v(2019) < 15 && v(2024) < 15);
  assert.match(o.opts.title, /ČR 2015–2024/);
  const fig = rankedBars(o.items, o.opts);
  assert.ok(fig.indexOf('>2015<') < fig.indexOf('>2021<') && fig.indexOf('>2021<') < fig.indexOf('>2024<'), 'chronologické pořadí, ne řazení podle hodnoty');
  assert.ok(!fig.includes(SORT_NOTE));
  assert.match(o.items.find((i) => i.label === '2021').tip, /967 mil\. Kč z 2[\s\u00a0]238 mil\. Kč/);
});

test('fond prevence (d): kontext programy na pojištěnce × změna kmene k 1. 7. a 1. 1. (21 řádků, bez kauzality)', () => {
  const K = json('pojistovny-kmen-mesicni.json');
  const k = buildFondKontext(R, K);
  assert.deepEqual(k.roky, [2022, 2023, 2024]);
  assert.equal(k.radky.length, 21);
  const r = k.radky.find((x) => x.kod === '111' && x.rok === 2023);
  assert.equal(r.jul.zmena, 13500);
  assert.equal(r.led.zmena, -2069, '1. 1. 2024 je změna po roce 2023');
  assert.equal(r.programy, 117.21);
  assert.equal(buildFondKontext(R, null), null);
  assert.equal(buildFondKontext(R, { prestupy: { pojistovny: [] } }), null);
  const h = fondKontextHtml(R, K);
  assert.equal(count(h, /<tr data-zp="/g), 21);
  assert.match(h, /Stáhnout CSV/);
  assert.match(h, /data-csv-title="Zdravotní programy z fondu prevence na pojištěnce a změna kmene 2022–2024"/);
  assert.match(h, /bez vysvětlení/);
  assert.match(h, /neříká, že příspěvky z fondu přestupy ovlivnily, ani že přestupy ovlivnily příspěvky/);
  assert.match(h, /\+13[\s\u00a0]500/);
  assert.match(h, /−2[\s\u00a0]069/);
  assert.doesNotMatch(h, /příčin|způsobil|důsledek/i);
  assert.match(fondKontextHtml(R, null), /nedohledáno/);
});

test('fond prevence: přepínač roku (figureSwitch fond_rok), URL a celá sekce včetně provozu', () => {
  assert.equal(FOND_ROK_ID, 'fond_rok');
  const roky = fondRoky(R);
  assert.equal(fondRokZUrl('?fond_rok=2021', roky), 2021);
  assert.equal(fondRokZUrl('?fond_rok=2016', roky), 2024, 'rok mimo rozsah = poslední');
  assert.equal(fondRokZUrl('', roky), 2024);
  assert.equal(fondRokZUrl('?rok=2021', roky), 2024, 'nesahá na parametr řad');
  assert.equal(fondRokZUrl('', []), null);
  const sw = fondPrepinacHtml(roky, 2022);
  assert.match(sw, /role="radiogroup" aria-label="Rok čerpání fondu" data-switch="fond_rok" data-default="2024"/);
  assert.equal(count(sw, /role="radio"/g), 7);
  assert.match(sw, /aria-checked="true" tabindex="0" data-value="2022"/);
  const K = json('pojistovny-kmen-mesicni.json');
  const h = fondHtml(R, K, 2022);
  assert.match(h, /data-fond-fig/);
  assert.match(h, /Zdravotní programy z fondu prevence na pojištěnce 2022/);
  assert.match(h, /Využití zákonného limitu přídělu na provoz 2024/);
  assert.equal(count(h, /<figure class="zpv zpv-figure/g) >= 4, true);
  assert.ok(h.indexOf('data-fond-fig') < h.indexOf('Podíl „ostatních činností“') && h.indexOf('Podíl „ostatních činností“') < h.indexOf('Kontext: zdravotní programy'));
});

test('provoz a obálka buildFondProvoz: limit 100 % jako čára, využití limitu 2024', () => {
  const fp = buildFondProvoz(R);
  assert.equal(fp.fond.rok, 2024);
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
  for (const id of ['zpCards', 'zpChart65', 'zpChartNzs', 'zpKmenMesicni']) assert.match(kmen, new RegExp(`id="${id}"`), id);
  assert.doesNotMatch(kmen, /id="zpSit"/, 'síť odborností odešla na Instituce (A2.3)');
  assert.match(kmen, /href="pojistovny-penize\.html"/);
  const js = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  assert.match(js, /function renderHospodareni\(d\)/);
  assert.match(js, /if \(has\(\['zpCards', 'zpChartShare'\]\)\) renderKmen\(d, rady\)/);
  assert.match(js, /has\(\['zpTableFin', 'zpChartZust', 'zpChartProvoz', 'zpChartYoy'\]\)\) renderHospodareni\(d\)/);
});

// ---------------------------------------------------------------- A4.3 společná komponenta přepínače

test('přepínače Peněz jsou figureSwitch: id = parametr URL, výchozí hodnota se nezapisuje, listener na zp:switch', () => {
  const vyber = prepinacVyberuHtml('bez-vzp');
  assert.match(vyber, /role="radiogroup" aria-label="Rozsah grafu" data-switch="vyber" data-default="vse"/);
  assert.match(vyber, /aria-checked="true" tabindex="0" data-value="bez-vzp"/);
  assert.equal(count(vyber, /role="radio"/g), VYBER_REZIMY.length);
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny-penize.js'), 'utf8');
  assert.match(src, /SWITCH_EVENT/);
  assert.doesNotMatch(src, /data-rady-sel|data-seg-sel|data-vyber=|data-rok=/, 'staré ad-hoc atributy jsou pryč');
  assert.deepEqual(stavZUrl('?ukazatel=hospodarsky_vysledek_mld&rok=2021&vyber=bez-vzp'), { ukazatel: 'hospodarsky_vysledek_mld', rok: 2021, segment: null, vyber: 'bez-vzp' });
});

// ---------------------------------------------------------------- složky salda

test('složky salda: součet rizikové a plátcové složky = saldo, společná osa, bez slova „věk“ v kontextu salda', () => {
  const sl = buildSlozky(PR);
  const rok = PR.posledni_rok_rocni;
  assert.equal(sl.rok, rok);
  assert.match(sl.riz.opts.title, new RegExp(`^Složka riziková \\(složení kmene\\) ${rok}$`));
  assert.match(sl.plat.opts.title, new RegExp(`^Složka plátcová \\(příjmy plátců\\) ${rok}$`));
  for (const k of ['riz', 'plat']) {
    assert.equal(sl[k].opts.allowNegative, true);
    assert.equal(sl[k].opts.signed, true);
    assert.equal(sl[k].opts.maxv, sl.maxAbs);
    assert.equal(sl[k].opts.minv, -sl.maxAbs, 'stejná osa v obou grafech');
    assert.equal(sl[k].items.length, 7);
  }
  assert.match(sl.okno, /^12\/\d{4}–11\/\d{4}$/);
  for (let i = 0; i < 7; i++) {
    const z = PR.pojistovny[i];
    const r = z.rocne[rok];
    assert.ok(Math.abs(sl.riz.items[i].value + sl.plat.items[i].value - r.saldo_relativni_mld) < 0.01, z.zkratka);
  }
  const maxAbs = Math.max(...[...sl.riz.items, ...sl.plat.items].map((i) => Math.abs(i.value)));
  assert.equal(sl.maxAbs, maxAbs);
  assert.equal(buildSlozky({ pojistovny: [] }), null);
  // žádný popisek v kontextu salda nevysvětluje saldo „věkem kmene“
  const txt = JSON.stringify([sl.riz.opts, sl.plat.opts, buildSaldoChart(PR).opts]);
  assert.doesNotMatch(txt, /věk/i);
});

test('tabulka salda: sloupce saldo / riziková / plátcová za poslední rok, v HTML součet složek = saldo', () => {
  const t = buildSaldoTabulka(PR);
  assert.ok(t.radky.every((r) => r.slozky.rok === PR.posledni_rok_rocni));
  const h = saldoTabulkaHtml(PR);
  assert.match(h, /z toho riziková \(složení kmene\), mld Kč/);
  assert.match(h, /z toho plátcová \(příjmy plátců\), mld Kč/);
  const cislo = (x) => Number(x.replace(/<[^>]+>/g, '').replace(/\s/g, '').replace('−', '-').replace('+', '').replace(',', '.'));
  for (const row of h.match(/<tr data-zp="\d+">.*?<\/tr>/g)) {
    const cells = [...row.matchAll(/<td class="zpc-num[^"]*"[^>]*>(.*?)<\/td>/g)].map((m) => m[1]);
    const [saldo, riz, plat] = cells.slice(-3).map(cislo);
    assert.ok(Math.abs(riz + plat - saldo) <= 0.11, `${row.slice(0, 40)}: ${riz} + ${plat} ≠ ${saldo}`);
  }
  assert.doesNotMatch(h, /věk/i);
});

test('částky na pojištěnce: vybráno vs. po přerozdělení, stejná osa, rok z dat', () => {
  const np = buildNaPojistence(PR);
  assert.equal(np.rok, PR.posledni_rok_rocni);
  assert.match(np.vybrano.opts.title, new RegExp(`^Vybráno na pojištěnce ${np.rok}$`));
  assert.match(np.po.opts.title, new RegExp(`^Připadlo na pojištěnce po přerozdělení ${np.rok}$`));
  assert.equal(np.vybrano.opts.maxv, np.po.opts.maxv);
  assert.equal(np.vybrano.opts.unit, 'Kč');
  assert.equal(np.vybrano.items.length, 7);
  assert.equal(buildNaPojistence({ pojistovny: [] }), null);
});

test('stránka Peníze: text o salda mluví o složení kmene a příjmech plátců, ne o věku kmene', () => {
  assert.match(html, /vyrovnává rozdíly ve složení kmene a výši příjmů plátců/);
  assert.doesNotMatch(html, /věku kmene|dané věkem|věkem kmene/);
  assert.match(html, /Kladné saldo RBP a ČPZP je plátcové/);
});

test('tooltip salda nese obě složky v mld Kč', () => {
  const ch = buildSaldoChart(PR);
  assert.match(ch.items[0].tip, /z toho riziková \(složení kmene\) \+10,8\smld\sKč, plátcová \(příjmy plátců\) \+6,4\smld\sKč/);
});

test('ukazatele v mld Kč bez reference ČR (jen poměry a hodnoty na pojištěnce mají čáru ČR)', () => {
  for (const u of UKAZATELE.filter((x) => /^mld/.test(x.unit))) {
    const ch = buildRadyChart(R, u.id, null);
    if (ch.typ === 'bary') {
      assert.equal(ch.opts.ref, null, `${u.id}: bez ČR`);
      assert.doesNotMatch(radyHtml(R, { ukazatel: u.id, rok: null }), /zpv-ref--line|zpv-refkey/, u.id);
    } else {
      assert.ok(!ch.series.some((s) => s.key === 'cr'), `${u.id}: bez řady ČR`);
    }
  }
  // poměry s ČR zůstávají: státní pojištěnci (%) mají čáru
  assert.ok(buildRadyChart(R, 'statni_pojistenci_pct', 2024).opts.ref);
  assert.ok(buildRadyChart(R, 'naklady_na_pojistence_kc', null).series.some((s) => s.key === 'cr'));
  assert.equal(buildRadyChart(R, 'zustatek_bu_zfzp_mld', 2024).opts.ref, null);
  assert.equal(buildRadyChart(R, 'hospodarsky_vysledek_mld', 2024).opts.ref, null);
});

test('segmenty jako jeden obrázek: stackedRows 7 řádků × 4 skupiny, jedna legenda, dumbbell se zkrácenými popisky a plným názvem v tooltipu', () => {
  const ch = buildSegmenty(S, R, { kod: '111', segment: null });
  assert.equal(ch.stacked.rows.length, 7);
  assert.deepEqual(ch.stacked.parts.map((p) => p.key), ['ambulantni', 'luzkova', 'leky', 'ostatni']);
  const fig = stackedRows(ch.stacked.rows, ch.stacked.parts, ch.stacked.cell, ch.stacked.opts);
  assert.equal(count(fig, /<figure /g), 1);
  assert.equal(count(fig, /<ul class="zpv-legend zpv-legend--stack">/g), 1);
  assert.equal(count(fig, /<div class="zpv-srow" data-zp=/g), 7);
  assert.equal(count(fig, /class="zpv-seg zpv-mark" data-zp=/g), 28);
  assert.match(fig, /Náklady na zdravotní služby podle segmentů 2024/);
  // součet podílů v řádku = 100 % (kontrola na tabulkovém dvojčeti, jedna pojišťovna)
  const radek = fig.match(/<tr><th scope="row">VZP ČR<\/th>(.*?)<\/tr>/)[1];
  const sum = [...radek.matchAll(/>([\d,]+)\s*%</g)].reduce((a, m) => a + Number(m[1].replace(',', '.')), 0);
  assert.ok(Math.abs(sum - 100) < 0.3, `součet ${sum}`);
  // pojišťovny zůstávají v pevném pořadí podle kódu (žádné řazení = žádná poznámka o řazení)
  assert.deepEqual(ch.stacked.rows.map((r) => r.kod), ['111', '201', '205', '207', '209', '211', '213']);
  assert.doesNotMatch(fig, /Řazeno podle/);
  // dumbbell: popisky ≤ 22 znaků, tooltip nese plný název
  assert.ok(ch.dumbbell.items.every((i) => i.label.length <= 22), ch.dumbbell.items.map((i) => i.label).join(' | '));
  assert.ok(ch.dumbbell.items.every((i) => /skutečnost [\d,]+ mld Kč/.test(i.tip)));
  assert.equal(kratkySegment('Zdravotnické prostředky na poukazy celkem'), 'Zdravotnické…');
  // stránka: segmenty se skládají přes stackedRows, ne přes sedm segmentedBar
  const js = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny-penize.js'), 'utf8');
  assert.match(js, /stackedRows\(ch\.stacked\.rows/);
  assert.doesNotMatch(js, /ch\.bary\.map\(\(b, i\) => segmentedBar/);
});

test('Peníze: texty o přerozdělení jsou v rozbalovátku „Jak číst přerozdělení · 4“, pod grafy jedna věta; lead bez „přispívá a bere“', () => {
  assert.match(html, /<details class="zpc-acc">\s*<summary>Jak číst přerozdělení · 4<\/summary>/);
  const det = html.match(/<summary>Jak číst přerozdělení · 4<\/summary>([\s\S]*?)<\/details>/)[1];
  assert.equal(count(det, /<p class="zpc-note">/g), 4);
  for (const t of ['Co graf říká', 'není nula', 'Čisté saldo vůči platbě státu', 'Dvě složky salda']) assert.ok(det.includes(t), t);
  const pred = html.slice(html.indexOf('id="zpPrerozdeleni"'), html.indexOf('<summary>Jak číst přerozdělení'));
  assert.equal(count(pred, /<p /g), 1, 'pod grafem jedna věta');
  assert.match(html, /Jak přerozdělení vyrovnává složení kmene a příjmy plátců, jak se hospodaření vyvíjelo deset let a za co pojišťovny platí\./);
  assert.doesNotMatch(html, /přispívá|z něj bere/);
  const shell = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny-shell.js'), 'utf8');
  assert.doesNotMatch(shell, /přispívá|z něj bere/);
  assert.match(shell, /veta: 'Jak přerozdělení vyrovnává složení kmene a příjmy plátců/);
});

test('A6.1 zapojení: Peníze načítají měsíční kmen jen pro kontext fondu, HTML vysvětluje „ostatní činnosti“ a zdroje', () => {
  const js = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  assert.match(js, /fondKmen: \['zpFondProvoz'\]/);
  assert.match(js, /has\(POTREBA\.fondKmen\) \? loadJson\('data\/pojistovny-kmen-mesicni\.json'\)/);
  assert.match(js, /renderPenize\(\{ PR: pr, R: rady, S: seg, K: kmFond \}\)/);
  assert.match(js, /zahrnuje|včetně ozdravných pobytů a „ostatních činností“/, 'tabulka Hospodaření 2024 varuje, že fond je celkem');
  assert.match(html, /id="fond-provoz"[\s\S]*ostatní činnosti[\s\S]*antigenní testování na covid[\s\S]*id="zpFondProvoz"/);
  assert.match(html, /<b>Fond prevence\.<\/b> Tabulky 16 a 17 Hodnocení MZ/);
  assert.doesNotMatch(html, /žebříček/i);
});
