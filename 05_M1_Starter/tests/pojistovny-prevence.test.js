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
  FOND_SKUPINY, VZ_OTAZKY,
} from '../src/pojistovny-prevence.js';
import { dotMatrix, heatmap, segmentedBar, coverageMatrix, dumbbell } from '../src/zp-viz.js';
import { validateAll, loadDatasets } from '../ingest/validate-pojistovny.js';

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
  assert.match(vzp.sub, /2,4 mil\. uživatelů \(2025\)/);
  const zps = m.rows.find((r) => r.kod === '209');
  assert.match(zps.sub, /funkce bez údajů/);
  for (const c of m.cols) assert.equal(m.cell(zps, c), null);
  const vozp = m.rows.find((r) => r.kod === '201');
  assert.equal(m.cell(vozp, m.cols.find((c) => c.key === 'edoklady_eneschopenky')), false);
  assert.equal(m.cell(vozp, m.cols.find((c) => c.key === 'bankid')), true);
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

test('buildOnkoMatrix a buildDusevniHeatmap: 7 × 5, nadstandard v sub řádku', () => {
  const o = buildOnkoMatrix(PREV);
  assert.equal(o.rows.length, 7);
  assert.equal(o.cols.length, 5);
  assert.match(o.rows.find((r) => r.kod === '211').sub, /nadstandard: nejsilnější/);
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
test('pojistovny.html: kontejnery modulů 1, 2, 4 existují a bylo použito progressive disclosure', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pojistovny.html'), 'utf8');
  for (const id of ['zpAppMatrix', 'zpAppKriteria', 'zpPrevMatrix', 'zpPrevOnko', 'zpPrevDusevni', 'zpFpStruktura',
    'zpOdpovediMatrix', 'zpOdpovedi', 'zpDolozene', 'zpMereni', 'zpRizikove', 'zpOtazky', 'zpDalsi', 'zpDotaznik', 'zpDotaznikAgregace']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  // select z původního fondu prevence je pryč
  assert.doesNotMatch(html, /zpFpSelect/);
  const sec = (id) => html.split(`id="${id}"`)[1].split('</section>')[0];
  for (const id of ['modul-aplikace', 'modul-prevence', 'modul-gramotnost']) {
    assert.ok((sec(id).match(/<details class="zpc-acc/g) || []).length >= 3, `${id}: rozklikávací vysvětlivky`);
    assert.equal((sec(id).match(/<p class="zpc-lead">/g) || []).length, 1, `${id}: jeden lead`);
  }
});
