// Testy modulů 1, 2 a 4 srovnávače pojišťoven (src/pojistovny-prevence.js, balíčky P2.2 + P2.3):
// čisté přípravy dat pro grafy, skupiny položek fondu prevence, matice pokrytí odpovědí z VZ
// a validátor nových polí (kriteria_privetivosti, aplikace[].kriteria, polozky[].skupina).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAppMatrix, buildKriteriaMatrix, buildPrevHeatmap, buildOnkoMatrix, buildDusevniHeatmap,
  buildFondParts, coverageState, buildCoverage, odhadniSkupinu, normSkupina, levelOf,
  buildPrevProc, prevProcHtml, pocetPolozek, PREV_HEAT_FOOT, buildOtazkySady, otazkySadyHtml, SADY_PORADI, sadaCasti, vyhodnoceniHtml,
  FOND_SKUPINY, VZ_OTAZKY, buildFunkceSouhrn,
} from '../src/pojistovny-prevence.js';
import { dotMatrix, heatmap, segmentedBar, coverageMatrix, dumbbell, rankedBars } from '../src/zp-viz.js';
import { validateAll, loadDatasets } from '../ingest/validate-pojistovny.js';
import { datumCz } from '../src/pojistovny-shared.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const APP = readJson('pojistovny-aplikace.json');
const PREV = readJson('pojistovny-prevence.json');
const zp = (kod) => PREV.pojistovny.find((z) => z.kod === kod);

// ---------------------------------------------------------------- modul 1
test('buildAppMatrix: 7 ZP × 10 funkcí, ZPŠ bez údajů, uživatelé v sub řádku', () => {
  const m = buildAppMatrix(APP);
  assert.equal(m.rows.length, 7);
  assert.equal(m.cols.length, 10);
  const vzp = m.rows.find((r) => r.kod === '111');
  assert.match(vzp.sub, /Moje VZP/);
  assert.match(vzp.sub, /2,4\smil\. uživatelů \(2025\)/);
  const zps = m.rows.find((r) => r.kod === '209');
  assert.match(zps.sub, /funkce bez údajů/);
  for (const c of m.cols) assert.equal(m.cell(zps, c), null);
  const vozp = m.rows.find((r) => r.kod === '201');
  assert.equal(m.cell(vozp, m.cols.find((c) => c.key === 'edoklady_eneschopenky')), false);
  assert.equal(m.cell(vozp, m.cols.find((c) => c.key === 'bankid')), true);
});

test('buildFunkceSouhrn: kolik pojišťoven funkci má (ano = 1, částečně = ½), ZPŠ bez údajů se nepočítá, eDoklady a eRecept chybějí nejčastěji', () => {
  const f = buildFunkceSouhrn(APP);
  assert.equal(f.items.length, 10);
  assert.equal(f.max, 6, 'šest aplikací se známými funkcemi (ZPŠ ne)');
  const val = (id) => f.items.find((i) => i.key === id).value;
  assert.equal(val('edoklady_eneschopenky'), 2);
  assert.equal(val('erecept_leky'), 2);
  assert.equal(val('prehled_pojisteni'), 6);
  const min = Math.min(...f.items.map((i) => i.value));
  assert.deepEqual(f.items.filter((i) => i.value === min).map((i) => i.key).sort(), ['edoklady_eneschopenky', 'erecept_leky']);
  assert.match(f.items.find((i) => i.key === 'erecept_leky').tip, /chybí: VoZP, ČPZP, ZP MV, RBP|chybí: /);
  // částečně = ½
  const a = { funkce: [{ id: 'x', label: 'X' }], aplikace: [{ kod: '111', zp: 'VZP', funkce: { x: true } }, { kod: '201', zp: 'VoZP', funkce: { x: 'partial' } }, { kod: '209', zp: 'ZPŠ', funkce: { x: null } }] };
  assert.equal(buildFunkceSouhrn(a).items[0].value, 1.5);
  assert.equal(buildFunkceSouhrn(a).max, 2);
  assert.deepEqual(buildFunkceSouhrn(null), { items: [], max: 0, bez: [] });
  assert.deepEqual(f.bez, ['ZPŠ'], 'aplikace bez známých funkcí (do sub grafu)');
  // popisky funkcí nejdou přes bary: ≤ 22 znaků (nazev_kratky z dat, jinak ořez), plný název v tooltipu
  assert.ok(f.items.every((i) => i.label.length <= 22), f.items.map((i) => i.label).join(' | '));
  assert.match(f.items.find((i) => i.key === 'komunikace_s_pojistovnou').tip, /^Komunikace s pojišťovnou: /);
  const html = rankedBars(f.items, { title: 'Kolik pojišťoven funkci má', maxv: f.max, dec: 1 });
  assert.match(html.slice(html.lastIndexOf('<div class="zpv-row"')), /eDoklady|eRecept/, 'dole jsou funkce, které chybějí nejčastěji');
});

test('dotMatrix nad daty aplikací: poslední sloupec n/10, ZPŠ bez skóre', () => {
  const m = buildAppMatrix(APP);
  const html = dotMatrix(m.rows, m.cols, m.cell, { title: 'Funkce', scoreLabel: 'n/10' });
  assert.match(html, /n\/10/);
  assert.equal((html.match(/data-zp="209"/g) || []).length >= 1, true);
  assert.match(html, /role="meter"[^>]*aria-valuetext="10\/10"/);
  // ZPŠ: meter prázdný („nedohledáno“)
  const zpsRow = html.split('<tr').find((r) => r.includes('data-zp="209"'));
  assert.match(zpsRow, /zpv-meter is-empty/);
});

test('buildKriteriaMatrix: 6 kritérií, prázdné hodnoty = všechny buňky null', () => {
  const k = buildKriteriaMatrix(APP);
  assert.equal(k.cols.length, 6);
  assert.equal(k.stav, 'navrh');
  assert.equal(k.hodnoceno, 0);
  for (const r of k.rows) for (const c of k.cols) assert.equal(k.cell(r, c), null);
  const html = dotMatrix(k.rows, k.cols, k.cell, { scoreLabel: 'n/6' });
  assert.equal((html.match(/zpv-meter is-empty/g) || []).length, 7);
});

test('buildKriteriaMatrix: stupeň 0/1/2 → ne / částečně / ano', () => {
  const a = structuredClone(APP);
  a.aplikace[0].kriteria = { prihlaseni_bankid: { stupen: 2, zdroj: 'x', rok: 2026 }, offline_prukaz: { stupen: 1, zdroj: 'x', rok: 2026 }, podpora_chat: { stupen: 0, zdroj: 'x', rok: 2026 } };
  const k = buildKriteriaMatrix(a);
  const r = k.rows[0];
  const by = (id) => k.cell(r, k.cols.find((c) => c.key === id));
  assert.equal(by('prihlaseni_bankid'), true);
  assert.equal(by('offline_prukaz'), 'partial');
  assert.equal(by('podpora_chat'), false);
  assert.equal(by('notifikace_prevence'), null);
  assert.equal(k.hodnoceno, 3);
});

// ---------------------------------------------------------------- modul 4: rizikové skupiny
test('normSkupina: objekt {nazev, kriteria} se nikdy nestane „[object Object]“', () => {
  for (const s of APP.rizikove_skupiny.skupiny) {
    const n = normSkupina(s);
    assert.ok(n.nazev && !n.nazev.includes('[object'));
    assert.ok(n.kriteria.length > 0);
  }
  assert.deepEqual(normSkupina('Křehcí senioři'), { nazev: 'Křehcí senioři', kriteria: '' });
  assert.deepEqual(normSkupina(null), { nazev: '', kriteria: '' });
});

// ---------------------------------------------------------------- modul 2: heatmapy
test('levelOf: enum stupňů → 0..3, jinak null', () => {
  assert.equal(levelOf('minimalni'), 0);
  assert.equal(levelOf('nejsilnejsi'), 3);
  assert.equal(levelOf(2), 2);
  assert.equal(levelOf(null), null);
  assert.equal(levelOf('neznamy'), null);
});

test('buildPrevHeatmap: 7 × 9, úrovně 0..3, popis v tipu, rok VZ v sub', () => {
  const h = buildPrevHeatmap(PREV);
  assert.equal(h.rows.length, 7);
  assert.equal(h.cols.length, 9);
  for (const r of h.rows) for (const c of h.cols) {
    const v = h.cell(r, c);
    assert.ok(v && v.level >= 0 && v.level <= 3, `${r.label}/${c.key}`);
  }
  const mv = h.rows.find((r) => r.kod === '211');
  assert.equal(h.cell(mv, h.cols.find((c) => c.key === 'onkologie')).level, 3);
  assert.match(h.rows.find((r) => r.kod === '209').sub, /VZ 2020/);
  const html = heatmap(h.rows, h.cols, h.cell, { sortable: true });
  assert.equal((html.match(/class="zpv-sort"/g) || []).length, 9);
});

test('pocetPolozek: položky popisu oddělené čárkou nebo středníkem, prázdný popis = 0', () => {
  assert.equal(pocetPolozek('screeningy, omezené benefity'), 2);
  assert.equal(pocetPolozek('glukóza'), 1);
  assert.equal(pocetPolozek('očkování (HPV, klíšťovka, chřipka)'), 3, 'výčet v závorce se počítá taky');
  assert.equal(pocetPolozek('UZ/mamo; markery ,  '), 2);
  for (const v of [null, undefined, '', '  ', ' , ']) assert.equal(pocetPolozek(v), 0, JSON.stringify(v));
});

test('buildPrevHeatmap: v buňce počet nalezených položek, barva podle stupně, tooltip se stupněm a popisem', () => {
  const h = buildPrevHeatmap(PREV);
  const vzp = h.rows.find((r) => r.kod === '111');
  const onko = h.cols.find((c) => c.key === 'onkologie');
  const c = h.cell(vzp, onko);
  assert.equal(c.level, 1, 'barva = stupeň základní');
  assert.equal(c.text, '2', 'screeningy, omezené benefity = 2 položky');
  assert.equal(c.tipText, 'stupeň základní');
  assert.match(c.tip, /popis rešerše má 2 položky: screeningy, omezené benefity/);
  const mv = h.rows.find((r) => r.kod === '211');
  assert.equal(h.cell(mv, onko).text, '4');
  assert.equal(h.cell(mv, onko).level, 3);
  // jedna položka = „položku“, pět a více = „položek“
  assert.match(h.cell(vzp, h.cols.find((x) => x.key === 'diabetologie')).tip, /popis rešerše má 1 položku: glukóza/);
  const p2 = structuredClone(PREV);
  p2.pojistovny[0].oblasti.onkologie = { stupen: 'silne', popis: 'a, b, c, d, e' };
  assert.match(buildPrevHeatmap(p2).cell(buildPrevHeatmap(p2).rows[0], onko).tip, /popis rešerše má 5 položek/);
  // bez popisu: stupeň zůstane (barva), v buňce „—“, tooltip řekne, že rešerše nic nenašla
  p2.pojistovny[0].oblasti.onkologie = { stupen: 'minimalni', popis: null };
  const h2 = buildPrevHeatmap(p2);
  const e = h2.cell(h2.rows[0], onko);
  assert.deepEqual([e.level, e.text, e.tipText], [0, '—', 'stupeň minimální']);
  assert.match(e.tip, /nenašla konkrétní program/);
  // bez stupně = „nedohledáno“ (null), beze změny
  p2.pojistovny[0].oblasti.onkologie = { stupen: null, popis: 'x' };
  assert.equal(buildPrevHeatmap(p2).cell(buildPrevHeatmap(p2).rows[0], onko), null);
});

test('heatmapa nabídky: číslo v buňce, tooltip „stupeň … — našla …“, věta pod maticí, legenda zůstává rampou stupňů', () => {
  const hm = buildPrevHeatmap(PREV);
  const html = heatmap(hm.rows, hm.cols, hm.cell, { title: 'Nabídka', sortable: true, foot: PREV_HEAT_FOOT });
  const cells = [...html.matchAll(/<td class="zpv-cell" data-level="(\d)"[^>]*data-tip="([^"]*)">([^<]*)/g)];
  assert.equal(cells.length, 63, '7 × 9 buněk');
  for (const [, , , text] of cells) assert.match(text, /^(\d+|—)$/, 'v buňce jen číslo nebo „—“, ne slovo stupně');
  assert.doesNotMatch(html, /<td class="zpv-cell"[^>]*>(minimální|základní|silné|nejsilnější)</);
  assert.match(html, /data-tip="VZP ČR · Onkologie: stupeň základní — popis rešerše má 2 položky: screeningy, omezené benefity"/);
  // legenda = rampa stupňů (4 slova), pod maticí věta o významu čísla a odstínu
  assert.equal((html.match(/<i class="zpv-sw zpv-sw--ramp"/g) || []).length, 4);
  for (const w of ['minimální', 'základní', 'silné', 'nejsilnější']) assert.match(html, new RegExp(`</i>${w}</li>`));
  assert.match(html, /<p class="zpv-foot">Číslo v buňce = počet položek v textu rešerše [^<]*ne ověřený počet programů[^<]*Odstín = redakční stupeň\.<\/p>/);
  assert.ok(html.indexOf('zpv-legend') < html.indexOf('zpv-foot'), 'věta je pod legendou');
  assert.doesNotMatch(heatmap(hm.rows, hm.cols, hm.cell, {}), /zpv-foot/);
  // řazení dál jede podle data-level (stupeň), ne podle čísla v buňce
  assert.match(html, /data-level="3"[^>]*data-tip="ZP MV ČR · Onkologie: stupeň nejsilnější/);
  // věta je i ve vykreslovací funkci modulu
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny-prevence.js'), 'utf8');
  assert.match(src, /foot: PREV_HEAT_FOOT/);
});

test('rešerše: každá ZP má reserse {datum YYYY-MM-DD, url}, url z pojistovny.json a _doc říká, odkud je datum', () => {
  const POJ = readJson('pojistovny.json');
  assert.equal(PREV.pojistovny.length, 7);
  for (const z of PREV.pojistovny) {
    assert.match(z.reserse?.datum, /^\d{4}-\d{2}-\d{2}$/, z.zkratka);
    assert.match(z.reserse?.url, /^https?:\/\//, z.zkratka);
    const pj = POJ.pojistovny.find((x) => x.kod === z.kod);
    assert.equal(z.reserse.url, pj.prevence?.zdroj || pj.web, `${z.zkratka}: url stránky prevence z pojistovny.json`);
  }
  assert.match(PREV._doc, /reserse/);
  assert.match(PREV._doc, /první commit|prvního commitu/);
  assert.ok(PREV.changelog.some((c) => /reserse/.test(c.zmena)), 'změna je v changelogu');
});

test('validátor: reserse je volitelné; když je, musí mít datum YYYY-MM-DD a url', () => {
  const ds = loadDatasets();
  assert.deepEqual(validateAll(ds).errors, []);
  const noRes = structuredClone(ds);
  for (const z of noRes.prevence.pojistovny) delete z.reserse;
  assert.deepEqual(validateAll(noRes).errors, [], 'bez reserse projde');
  for (const [mut, re] of [
    [(r) => { r.datum = '14. 10. 2026'; }, /reserse\.datum/],
    [(r) => { r.datum = '2026-02-30'; }, /reserse\.datum/],
    [(r) => { delete r.datum; }, /reserse\.datum/],
    [(r) => { r.url = ''; }, /reserse\.url/],
    [(r) => { delete r.url; }, /reserse\.url/],
    [(r) => { r.url = 'www.vzp.cz'; }, /reserse\.url/],
  ]) {
    const bad = structuredClone(ds);
    mut(bad.prevence.pojistovny[0].reserse);
    assert.match(validateAll(bad).errors.join('\n'), re);
  }
  const notObj = structuredClone(ds);
  notObj.prevence.pojistovny[0].reserse = 'včera';
  assert.match(validateAll(notObj).errors.join('\n'), /reserse: musí být objekt/);
});

test('datumCz: ISO datum → „2. 11. 2026“, jiný text beze změny', () => {
  assert.equal(datumCz('2026-11-02'), '2. 11. 2026');
  assert.equal(datumCz('2026-10-14T08:00:00Z'), '14. 10. 2026');
  assert.equal(datumCz('brzy'), 'brzy');
  assert.equal(datumCz(null), '');
});

test('buildOnkoMatrix a buildDusevniHeatmap: 7 × 5, nadstandard v sub řádku', () => {
  const o = buildOnkoMatrix(PREV);
  assert.equal(o.rows.length, 7);
  assert.equal(o.cols.length, 5);
  assert.match(o.rows.find((r) => r.kod === '211').sub, /nadstandard: nejsilnější — /, 'stupeň má za pomlčkou důvod (popis z webu)');
  assert.equal(o.cell(o.rows[0], o.cols[0]), true);
  const d = buildDusevniHeatmap(PREV);
  assert.equal(d.rows.length, 7);
  assert.equal(d.cols.length, 5);
  assert.equal(d.cell(d.rows.find((r) => r.kod === '111'), d.cols.find((c) => c.key === 'deti')).level, 0);
});

// ---------------------------------------------------------------- skupiny položek fondu
test('odhadniSkupinu: klíčová slova a pořadí pravidel', () => {
  assert.equal(odhadniSkupinu('Preventivní očkování - chřipka'), 'ockovani');
  assert.equal(odhadniSkupinu('HPV infekce pro prekancerózu'), 'ockovani');
  assert.equal(odhadniSkupinu('Prevence zubního kazu u dětí'), 'dentalni');
  assert.equal(odhadniSkupinu('Příspěvek na dentální hygienu pro děti od 6-18 let'), 'dentalni');
  assert.equal(odhadniSkupinu('Příprava ženy k porodu (psychoprofylaxe a těhotenský tělocvik)'), 'tehotenstvi_deti');
  assert.equal(odhadniSkupinu('Maminka a novorozenec'), 'tehotenstvi_deti');
  assert.equal(odhadniSkupinu('Duševní pohoda'), 'dusevni');
  assert.equal(odhadniSkupinu('Prevence karcinomu prsů'), 'screening');
  assert.equal(odhadniSkupinu('Program na odhalování kardiovaskulárního rizika'), 'screening');
  assert.equal(odhadniSkupinu('Pohybové aktivity pro uživatele my213'), 'pohyb');
  assert.equal(odhadniSkupinu('Nákup permanentky na plavání nad 60 let'), 'pohyb');
  assert.equal(odhadniSkupinu('Prevence kardiovaskulárních onemocnění'), 'zivotni_styl');
  assert.equal(odhadniSkupinu('Prevence DM'), 'zivotni_styl');
  assert.equal(odhadniSkupinu('Zdravotnické pomůcky'), 'ostatni');
  assert.equal(odhadniSkupinu(''), 'ostatni');
  assert.equal(odhadniSkupinu(null), 'ostatni');
});

test('data: každá položka fondu má skupinu ze slovníku a odpovídá odhadniSkupinu', () => {
  assert.deepEqual(PREV.fond_prevence_skupiny.map((s) => s.id), FOND_SKUPINY.map((s) => s.id));
  assert.deepEqual(PREV.fond_prevence_skupiny, FOND_SKUPINY);
  assert.equal(FOND_SKUPINY.length, 8);
  const ids = new Set(FOND_SKUPINY.map((s) => s.id));
  let n = 0;
  for (const z of PREV.pojistovny) for (const p of z.fond_prevence_struktura.polozky) {
    n++;
    assert.ok(ids.has(p.skupina), `${z.zkratka}: ${p.nazev} → ${p.skupina}`);
    assert.equal(p.skupina, odhadniSkupinu(p.nazev), `${z.zkratka}: ${p.nazev}`);
  }
  assert.equal(n, 124);
});

// ---------------------------------------------------------------- buildFondParts
test('buildFondParts: VZP — plán ZPP, 13 položek, top 6 dumbbell seřazený sestupně', () => {
  const d = buildFondParts(zp('111'));
  assert.equal(d.mode, 'polozky');
  assert.equal(d.fromMode, 'plan');
  assert.equal(d.fromLabel, 'plán ZPP');
  assert.equal(d.parts.length, 13);
  assert.equal(d.bell.length, 6);
  const tos = d.bell.map((b) => b.to);
  assert.deepEqual(tos, [...tos].sort((a, b) => b - a));
  assert.equal(d.bell[0].label, 'Prevence kardiovaskulárních onemocnění');
  assert.equal(d.bell[0].from, 600000);
  assert.equal(d.bell[0].kod, '111');
  assert.deepEqual(d.notes, []);
});

test('buildFondParts: segmentedBar má nejvýš 6 segmentů, „Ostatní“ nese složené položky', () => {
  const d = buildFondParts(zp('213'));
  assert.equal(d.nItems, 48);
  const html = segmentedBar(d.parts, { maxParts: 6, title: 'x' });
  assert.equal((html.match(/class="zpv-seg zpv-mark"/g) || []).length, 6);
  assert.match(html, /Ostatní/);
});

test('buildFondParts: OZP nemá plán → předchozí rok a poznámka', () => {
  const d = buildFondParts(zp('207'));
  assert.equal(d.fromMode, 'predchozi');
  assert.equal(d.fromLabel, 'předchozí rok');
  assert.ok(d.notes.some((n) => /neuvádí plán/.test(n) && /2024/.test(n)));
  assert.ok(d.notes.some((n) => /rok 2025/.test(n)));
  const top = d.bell[0];
  assert.equal(top.to, 143680);
  assert.equal(top.from, 141357);
  const html = dumbbell(d.bell, { fromLabel: d.fromLabel, toLabel: 'skutečnost' });
  assert.match(html, /předchozí rok/);
});

test('buildFondParts: ZPŠ — poznámka o roce 2020, skupiny sčítají na celek', () => {
  const z = zp('209');
  const d = buildFondParts(z);
  assert.ok(d.notes.some((n) => /rok 2020/.test(n)));
  const g = buildFondParts(z, { skupiny: true });
  assert.equal(g.mode, 'skupiny');
  assert.ok(g.parts.length <= 8 && g.parts.length >= 5);
  const sumItems = d.parts.reduce((a, p) => a + p.value, 0);
  const sumGroups = g.parts.reduce((a, p) => a + p.value, 0);
  assert.equal(sumGroups, sumItems);
  assert.ok(g.parts.every((p) => /^[a-z_]+$/.test(p.key)));
  assert.ok(g.parts.find((p) => /Očkování/.test(p.label)));
});

test('buildFondParts: bez struktury → null; záporná položka se do segmentů nedostane', () => {
  assert.equal(buildFondParts({ kod: '111', zkratka: 'X' }), null);
  assert.equal(buildFondParts({ kod: '111', zkratka: 'X', fond_prevence_struktura: { polozky: [] } }), null);
  const d = buildFondParts(zp('207'));
  assert.ok(d.parts.every((p) => p.value > 0));
});

// ---------------------------------------------------------------- matice pokrytí
test('coverageState: ano / částečně / ne', () => {
  assert.equal(coverageState('Aplikace Moje VZP je hlavní kanál a přihlášení jde přes BankID.'), 'ano');
  assert.equal(coverageState(['Web', 'Infolinka', 'Aplikace Moje VZP (hlavní kanál)']), 'ano');
  assert.equal(coverageState('Ročně'), 'castecne');
  assert.equal(coverageState(''), 'ne');
  assert.equal(coverageState(null), 'ne');
  assert.equal(coverageState([]), 'ne');
  assert.equal(coverageState('   '), 'ne');
  assert.equal(coverageState('VZ neuvádí'), 'ne');
  assert.equal(coverageState('VZ neuvádí měření zdravotního dopadu. Čerpání je vázáno na účast na prohlídkách.'), 'castecne');
  assert.equal(coverageState('Zdravotní dopad VZ přímo neměří. Chování je měřitelné u programů s podmínkou.'), 'castecne');
});

test('buildCoverage: 7 ZP × 7 otázek, měření dopadu jako mezera', () => {
  const c = buildCoverage(PREV);
  assert.equal(c.rows.length, 7);
  assert.equal(c.cols.length, 7);
  assert.equal(VZ_OTAZKY.length, 7);
  const stavy = {};
  for (const r of c.rows) for (const col of c.cols) {
    const v = c.cell(r, col);
    assert.ok(['ano', 'castecne', 'ne'].includes(v.stav));
    stavy[v.stav] = (stavy[v.stav] || 0) + 1;
  }
  assert.ok(stavy.ano > 0 && stavy.castecne > 0);
  const vzp = c.rows.find((r) => r.kod === '111');
  assert.equal(c.cell(vzp, c.cols.find((x) => x.key === 'mereni_dopadu')).stav, 'castecne');
  const html = coverageMatrix(c.rows, c.cols, c.cell, { title: 'Odpovědi' });
  assert.match(html, /data-state="castecne"/);
  assert.match(html, /zpv-cov-ic/);
});

// ---------------------------------------------------------------- validátor nových polí
test('validátor: reálná data bez chyb, i s novými poli', () => {
  const r = validateAll(loadDatasets());
  assert.deepEqual(r.errors, []);
});

test('validátor: kriteria_privetivosti — duplicitní id, chybějící label, neznámé id a stupeň', () => {
  const ds = loadDatasets();
  const a = structuredClone(ds);
  a.aplikace.kriteria_privetivosti.kriteria.push({ id: 'prihlaseni_bankid', label: 'duplicita' });
  assert.ok(validateAll(a).errors.some((e) => /duplicitní id 'prihlaseni_bankid'/.test(e)));

  const b = structuredClone(ds);
  b.aplikace.aplikace[0].kriteria = { neexistuje: { stupen: 1, zdroj: 'x', rok: 2026 } };
  assert.ok(validateAll(b).errors.some((e) => /neznámé id 'neexistuje'/.test(e)));

  const c = structuredClone(ds);
  c.aplikace.aplikace[0].kriteria = { podpora_chat: { stupen: 5, zdroj: 'x', rok: 2026 } };
  assert.ok(validateAll(c).errors.some((e) => /podpora_chat\.stupen/.test(e)));

  const d = structuredClone(ds);
  d.aplikace.aplikace[0].kriteria = { podpora_chat: { stupen: 2, zdroj: 'PS 12. 11. 2026', rok: 2026 } };
  assert.deepEqual(validateAll(d).errors, []);

  const e = structuredClone(ds);
  e.aplikace.kriteria_privetivosti.kriteria[0].label = '';
  assert.ok(validateAll(e).errors.some((x) => /chybí label/.test(x)));
});

test('validátor: prázdné aplikace[].kriteria je platné (zatím nehodnoceno)', () => {
  const ds = loadDatasets();
  for (const a of ds.aplikace.aplikace) assert.deepEqual(a.kriteria, {});
  assert.deepEqual(validateAll(ds).errors, []);
});

test('validátor: skupina položky fondu musí být ze slovníku', () => {
  const ds = structuredClone(loadDatasets());
  ds.prevence.pojistovny[0].fond_prevence_struktura.polozky[0].skupina = 'nesmysl';
  assert.ok(validateAll(ds).errors.some((e) => /skupina: 'nesmysl'/.test(e)));
  const dup = structuredClone(loadDatasets());
  dup.prevence.fond_prevence_skupiny.push({ id: 'ockovani', label: 'dup' });
  assert.ok(validateAll(dup).errors.some((e) => /duplicitní id 'ockovani'/.test(e)));
});

// ---------------------------------------------------------------- HTML kontejnery
test('podstránky aplikace / prevence / gramotnost (P1.6): kontejnery modulů 1, 2, 4 a progressive disclosure', () => {
  const page = { 'modul-aplikace': 'pojistovny-aplikace.html', 'modul-prevence': 'pojistovny-prevence.html', 'modul-gramotnost': 'pojistovny-gramotnost.html' };
  const ids = {
    'modul-aplikace': ['zpAppMatrix', 'zpAppKriteria'],
    'modul-prevence': ['zpPrevMatrix', 'zpPrevProc', 'zpPrevOnko', 'zpPrevDusevni', 'zpFpStruktura', 'zpOdpovediMatrix', 'zpOdpovedi', 'zpDolozene', 'zpMereni'],
    'modul-gramotnost': ['zpRizikove', 'zpOtazky', 'zpDalsi', 'zpDotaznik', 'zpDotaznikAgregace'],
  };
  for (const [mod, file] of Object.entries(page)) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const id of ids[mod]) assert.match(html, new RegExp(`id="${id}"`), `${file}: ${id}`);
    // select z původního fondu prevence je pryč
    assert.doesNotMatch(html, /zpFpSelect/);
    const sec = html.split(`id="${mod}"`)[1].split('</section>')[0];
    assert.ok((sec.match(/<details class="zpc-acc/g) || []).length >= 3, `${mod}: rozklikávací vysvětlivky`);
    assert.equal((sec.match(/<p class="zpc-lead">/g) || []).length, 1, `${mod}: jeden lead`);
  }
});

test('buildPrevProc / prevProcHtml: každý stupeň má viditelný důvod (popis z webu), bez popisu je to řečeno', () => {
  const list = buildPrevProc(PREV);
  assert.equal(list.length, 7);
  const mv = list.find((z) => z.kod === '211');
  const onko = mv.items.find((i) => i.skupina === 'Onkologický screening');
  assert.equal(onko.stupen, 'nejsilnější');
  assert.match(onko.popis, /markery/);
  assert.ok(mv.items.some((i) => i.skupina === 'Nabídka' && i.label === 'Onkologie'));
  assert.ok(mv.items.some((i) => i.skupina === 'Duševní zdraví'));
  const html = prevProcHtml(PREV);
  assert.equal((html.match(/<details class="zpc-acc zpc-proc" data-zp="/g) || []).length, 7);
  assert.match(html, /markery/);
  // rešerše webu: datum v summary každé pojišťovny a odkaz na stránku prevence uvnitř
  assert.equal((html.match(/rešerše webu 2\. 11\. 2026<\/span><\/summary>/g) || []).length, 7);
  assert.equal(mv.reserse.datum, '2026-11-02');
  assert.match(html, /<p class="zpc-note">Rešerše webu 2\. 11\. 2026: <a href="https:\/\/www\.vozp\.cz\/prispevky-na-prevenci" rel="noopener">stránka prevence VoZP<\/a>\.<\/p>/);
  // bez reserse se summary i odkaz vynechají
  const p3 = structuredClone(PREV);
  delete p3.pojistovny[0].reserse;
  assert.equal(buildPrevProc(p3)[0].reserse, null);
  const h3 = prevProcHtml(p3);
  assert.equal((h3.match(/ · rešerše webu /g) || []).length, 6, 'summary jen u 6 pojišťoven');
  assert.equal((h3.match(/Rešerše webu /g) || []).length, 6, 'odkaz jen u 6 pojišťoven');
  // bez popisu → „bez uvedeného důvodu“ a počítá se v summary
  const p2 = structuredClone(PREV);
  const base = buildPrevProc(PREV).find((z) => z.kod === p2.pojistovny[0].kod).bezDuvodu;
  p2.pojistovny[0].oblasti.onkologie = { stupen: 'silne' };
  const l2 = buildPrevProc(p2).find((z) => z.kod === p2.pojistovny[0].kod);
  assert.equal(l2.bezDuvodu, base + 1);
  assert.match(prevProcHtml(p2), /bez uvedeného důvodu/);
  // bez stupně se položka vynechá
  p2.pojistovny[0].oblasti.onkologie = { stupen: null, popis: 'x' };
  assert.ok(!buildPrevProc(p2).find((z) => z.kod === p2.pojistovny[0].kod).items.some((i) => i.label === 'Onkologie'));
});

test('buildOtazkySady / otazkySadyHtml: všech 7 sad v pořadí fází, číslované 1…7, znění otázek doslova', () => {
  const o = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-otazky.json'), 'utf8'));
  const list = buildOtazkySady(o);
  assert.equal(list.length, o.sady.length);
  assert.deepEqual(list.map((x) => x.sada.id), SADY_PORADI, 'pořadí = fáze z docs/pojistovny-dotazniky.md');
  assert.ok(list.every((x) => x.pocet > 0));
  const html = otazkySadyHtml(o);
  for (let i = 0; i < list.length; i++) assert.match(html, new RegExp(`<summary>${i + 1}\\. `), `sada ${i + 1} je číslovaná`);
  assert.equal((html.match(/<details class="zpc-acc zpc-q" id="dotaznik-/g) || []).length, list.length);
  for (const { sada } of list) {
    for (const c of sadaCasti(sada)) for (const q of c.otazky || []) assert.ok(html.includes(q.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')), `${sada.id}/${q.id}`);
  }
  assert.match(html, /jedna volba/);
  assert.match(html, /více voleb/);
  assert.match(html, /Nápověda: /);
  // neznámá sada jde na konec, prázdný vstup nevybouchne
  const o2 = { sady: [{ id: 'zzz', nazev: 'Z', casti: [{ id: 'A', nazev: 'a', otazky: [{ id: 'A1', text: 't', max_delka: 200 }] }] }, ...o.sady] };
  assert.equal(buildOtazkySady(o2).at(-1).sada.id, 'zzz');
  assert.match(otazkySadyHtml(o2), /nejvýš 200 znaků/);
  assert.match(otazkySadyHtml({ sady: [] }), /zatím nejsou/);
});

test('vyhodnoceniHtml + otazkySadyHtml: každá sada má vyhodnocení (oblasti semaforu, vstup, pravidla, výstup); režim metodika bez procesních textů', () => {
  const o = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-otazky.json'), 'utf8'));
  for (const s of o.sady) {
    assert.ok(s.vyhodnoceni && s.vyhodnoceni.oblasti.length && s.vyhodnoceni.pravidla.length >= 3 && s.vyhodnoceni.vstup && s.vyhodnoceni.vystup, s.id);
    const h = vyhodnoceniHtml(s.vyhodnoceni);
    assert.match(h, /<b>Vyhodnocení<\/b> · oblast semaforu: /);
    assert.match(h, /Výstup:/);
    assert.equal((h.match(/<li>/g) || []).length, s.vyhodnoceni.pravidla.length);
  }
  assert.match(vyhodnoceniHtml({ oblasti: ['servis'] }), /Klientský servis a informování/);
  assert.equal(vyhodnoceniHtml(null), '');
  const plne = otazkySadyHtml(o);
  const metodika = otazkySadyHtml(o, { proces: false });
  const bez = otazkySadyHtml(o, { vyhodnoceni: false });
  assert.match(plne, /zpc-vyhod/);
  assert.match(metodika, /zpc-vyhod/);
  assert.doesNotMatch(bez, /zpc-vyhod/);
  const fp = o.sady.find((s) => s.id === 'fond-prevence');
  assert.ok(plne.includes(fp.uvod.slice(0, 40)), 'plný režim má úvod pro respondenta');
  assert.ok(!metodika.includes(fp.uvod.slice(0, 40)), 'režim metodika úvod vynechá');
  assert.ok(!metodika.includes('osobní odkaz od redakce'), 'režim metodika bez kanálu');
  const met = fs.readFileSync(path.join(ROOT, 'pojistovny-metodika.html'), 'utf8');
  const iSem = met.indexOf('id="zpSemafor"'), iOt = met.indexOf('<div id="zpOtazky" data-rezim="metodika">'), iZad = met.indexOf('id="zpZadosti"');
  assert.ok(iSem > 0 && iOt > iSem && iZad > iOt, 'pořadí: semafor → návrh dotazníků → žádosti');
  assert.match(fs.readFileSync(path.join(ROOT, 'pojistovny-gramotnost.html'), 'utf8'), /<div id="zpOtazky"><\/div>/);
});

test('validátor: vyhodnoceni — neznámá oblast, prázdná pravidla, chybějící vstup', () => {
  const ds = loadDatasets();
  assert.equal(validateAll(ds).errors.length, 0, validateAll(ds).errors.join('; '));
  const a = structuredClone(ds); a.otazky.sady[0].vyhodnoceni.oblasti = ['neexistuje'];
  assert.ok(validateAll(a).errors.some((e) => /vyhodnoceni\.oblasti/.test(e)));
  const b = structuredClone(ds); b.otazky.sady[0].vyhodnoceni.pravidla = [];
  assert.ok(validateAll(b).errors.some((e) => /vyhodnoceni\.pravidla/.test(e)));
  const c = structuredClone(ds); delete c.otazky.sady[0].vyhodnoceni.vstup;
  assert.ok(validateAll(c).errors.some((e) => /vyhodnoceni\.vstup/.test(e)));
});

test('renderApps: matice funkcí a kritérií bez součtu (score: false), sub grafu „kolik pojišťoven“ říká, které aplikace nemají známé funkce', () => {
  const js = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny-prevence.js'), 'utf8');
  const apps = js.slice(js.indexOf('export function renderApps'), js.indexOf('// ---------------------------------------------------------------- modul 4 (část)'));
  assert.equal((apps.match(/score: false/g) || []).length, 2, 'matice funkcí i kritérií');
  assert.doesNotMatch(apps, /scoreLabel/);
  assert.match(apps, /Součet za aplikace se známými funkcemi/);
  assert.equal(buildFunkceSouhrn(APP).bez.join(), 'ZPŠ');
  const m = buildAppMatrix(APP);
  const html = dotMatrix(m.rows, m.cols, m.cell, { title: 'Funkce', score: false });
  assert.doesNotMatch(html, /role="meter"|zpv-scorehead/);
});
