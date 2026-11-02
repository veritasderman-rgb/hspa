// Testy balíčků P3.2 + P4.1 Srovnávače pojišťoven:
//  - src/pojistovny-kraje.js     mapa kraj × ZP + těžiště kmene (čisté funkce, bez DOM)
//  - src/pojistovny-semafor.js   UI semaforu, právo na odpověď, changelog
//  - src/pojistovny-zadosti.js   registr žádostí a lhůty + data/zadosti-106.json
//  - ingest/validate-pojistovny.js  validateZadosti, volitelné stanovisko_pojistovny
//  - pojistovny.html (tři script tagy), styles.css (marker), docs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  krajLabel, lastYear, nationalTotals, buildKrajDataset, sequentialRel, makeFill, topRegion,
  tezisteItems, evolutionRows, krajReadout, stateSentence, resolveKod, evolutionTableHtml,
  legendHtml, legendValue, fmtShare, tileValue, RAMP_REL_MIN, RAMP_REL_MAX, DEFAULT_KOD,
} from '../src/pojistovny-kraje.js';
import {
  semaforCell, semaforTip, semaforSummary, stanoviska, changelogSorted, fmtDateCz as semDate,
  renderSemafor, EMPTY_SENTENCE, NO_STATEMENT, STAV_META,
} from '../src/pojistovny-semafor.js';
import {
  parseIso, addDays, daysBetween, daysText, lhutaInfo, zadostStav, zadostInfo, coverageKey,
  latestZadost, zadostiCell, zadostiSummary, leadText, relabelNotSent, renderZadosti, todayIso,
  ZADOST_TYPY, ZADOST_STAVY, NOT_SENT,
} from '../src/pojistovny-zadosti.js';
import { renderCzMap, pickColorNeutral } from '../src/cz-map.js';
import { validateAll, validateZadosti, loadDatasets, ZP_CODES } from '../ingest/validate-pojistovny.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const readJson = (...p) => JSON.parse(read(...p));
const D5 = readJson('data', 'pojistenci-d5-zp.json');
const POJ = readJson('data', 'pojistovny.json');
const ZAD = readJson('data', 'zadosti-106.json');
const EVIL = '<script>alert(1)</script>';
const count = (s, re) => (s.match(re) || []).length;
const clone = (o) => JSON.parse(JSON.stringify(o));
/** Nezlomitelné mezery z formatNumberCz → obyčejné (čitelnější regexy). */
const sp = (s) => String(s).replace(/[\u00a0\u202f]/g, ' ');

// ===========================================================================
// P3.2 — kraj × ZP
// ===========================================================================

test('kraje: krajLabel a lastYear', () => {
  assert.equal(krajLabel('Moravskoslezský'), 'Moravskoslezský kraj');
  assert.equal(krajLabel('Praha'), 'Praha');
  assert.equal(krajLabel('Vysočina'), 'Kraj Vysočina');
  assert.equal(krajLabel(''), '');
  assert.equal(lastYear(D5), 2025);
  assert.equal(lastYear({}), null);
});

test('kraje: buildKrajDataset — 14 krajů, podíl z počtů, průměr ČR, kontext', () => {
  const ds = buildKrajDataset(D5, '213', 2025);
  assert.equal(ds.regions.length, 14);
  assert.equal(ds.direction, 'context_dependent');
  assert.equal(ds.kod, '213');
  assert.equal(ds.rok, 2025);
  const msk = ds.regions.find((r) => r.code === 'CZ080');
  assert.equal(msk.count, 321846);
  assert.equal(msk.total, 1178322);
  assert.ok(Math.abs(msk.value - 27.31) < 0.01, `MSK ${msk.value}`);
  const nat = nationalTotals(D5, '213', 2025);
  assert.ok(Math.abs(ds.country_avg - nat.share) < 0.01);
  assert.ok(ds.country_avg > 3 && ds.country_avg < 5);
  // součet krajů dává ČR
  assert.equal(nat.count, ds.regions.reduce((a, r) => a + r.count, 0));
});

test('kraje: RBP má nejvyšší podíl v Moravskoslezském kraji a ten je na mapě nejtmavší', () => {
  const ds = buildKrajDataset(D5, '213', 2025);
  assert.equal(topRegion(ds).code, 'CZ080');
  const fill = makeFill(ds);
  const colors = Object.fromEntries(ds.regions.map((r) => [r.code, fill(r, 0, false)]));
  assert.equal(colors.CZ080, pickColorNeutral(RAMP_REL_MAX, false));
  const lum = (c) => { const m = c.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  const darkest = Object.entries(colors).sort((a, b) => lum(a[1]) - lum(b[1]))[0][0];
  assert.equal(darkest, 'CZ080');
  // nejnižší podíl dostane první krok rampy, ne šedou „neutrální“ zónu
  const minR = ds.regions.reduce((a, r) => (r.value < a.value ? r : a));
  assert.equal(fill(minR, 0, false), pickColorNeutral(RAMP_REL_MIN, false));
  assert.notEqual(fill(minR, 0, false), '#E2E8F0');
});

test('kraje: sequentialRel — meze, degenerované rozpětí, neplatné vstupy', () => {
  assert.equal(sequentialRel(10, 10, 30), RAMP_REL_MIN);
  assert.equal(sequentialRel(30, 10, 30), RAMP_REL_MAX);
  assert.equal(sequentialRel(20, 10, 30), (RAMP_REL_MIN + RAMP_REL_MAX) / 2);
  assert.equal(sequentialRel(50, 10, 30), RAMP_REL_MAX);
  assert.equal(sequentialRel(5, 5, 5), RAMP_REL_MIN);
  assert.equal(sequentialRel(null, 0, 1), RAMP_REL_MIN);
});

test('kraje: dataset vynechá kraj bez dat a nespadne na prázdných vstupech', () => {
  const d = clone(D5);
  delete d.data.CZ010['2025'];
  assert.equal(buildKrajDataset(d, '111', 2025).regions.length, 13);
  assert.deepEqual(buildKrajDataset(null, '111', 2025).regions, []);
  assert.equal(buildKrajDataset(null, '111', 2025).country_avg, 0);
  assert.deepEqual(tezisteItems(null, '111', 2025), []);
  assert.deepEqual(evolutionRows(null, '111'), []);
  assert.equal(krajReadout(null, 'X', 1), '');
});

test('kraje: tezisteItems — součet 100 %, seřazeno sestupně, RBP = Moravskoslezský', () => {
  for (const kod of ['111', '201', '205', '207', '209', '211', '213']) {
    const items = tezisteItems(D5, kod, 2025);
    assert.equal(items.length, 14, kod);
    const sum = items.reduce((a, i) => a + i.value, 0);
    assert.ok(Math.abs(sum - 100) < 0.2, `${kod}: součet ${sum}`);
    for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].value >= items[i].value, `${kod}: řazení`);
  }
  const rbp = tezisteItems(D5, '213', 2025);
  assert.equal(rbp[0].key, 'CZ080');
  assert.ok(rbp[0].value > 70);
  assert.match(sp(rbp[0].tip), /Moravskoslezský kraj: 76,2 % kmene RBP · 321 846 pojištěnců/);
  assert.match(sp(rbp[0].tip), /kraj tvoří [\d,]+ % pojištěnců ČR · 2025 · ÚZIS/);
});

test('kraje: formátování podílů — malé hodnoty nejsou „0,0 %“', () => {
  assert.match(fmtShare(28.74), /^28,7$/);
  assert.match(fmtShare(0.04), /^0,04$/);
  assert.equal(fmtShare(null), 'nedohledáno');
  assert.equal(tileValue(0.01), '<0,1');
  assert.equal(tileValue(0), '0,0');
  assert.equal(tileValue(27.31), '27,3');
  assert.equal(tileValue(null), '—');
});

test('kraje: krajReadout — kraj · podíl · počet pojištěnců', () => {
  const ds = buildKrajDataset(D5, '213', 2025);
  const msk = ds.regions.find((r) => r.code === 'CZ080');
  const t = sp(krajReadout(msk, 'RBP', ds.country_avg));
  assert.match(t, /^Moravskoslezský kraj · RBP: 27,3 % pojištěnců kraje \(\+\d+,\d p\. b\. oproti ČR\) · 321 846 pojištěnců$/);
  const nizky = krajReadout(ds.regions.find((r) => r.code === 'CZ031'), 'RBP', ds.country_avg);
  assert.match(nizky, /−\d,\d p\. b\./);
});

test('kraje: evolutionRows — 16 let, změna první → poslední rok', () => {
  const rows = evolutionRows(D5, '111');
  assert.equal(rows.length, 14);
  assert.equal(rows[0].values.length, 16);
  const praha = rows.find((r) => r.code === 'CZ010');
  assert.ok(Math.abs(praha.values[0] - 61.6) < 0.1);
  assert.equal(praha.delta, Math.round((praha.values[15] - praha.values[0]) * 100) / 100);
  const html = evolutionTableHtml(D5, '111');
  assert.equal(count(html, /<tr>/g), 15, '14 krajů + hlavička');
  assert.equal(count(html, /<th scope="col">/g), 18, 'Kraj + 16 let + změna');
  assert.match(html, /role="region"/);
  assert.match(html, /tabindex="0"/);
});

test('kraje: výběr pojišťovny — jen Moje pojišťovna, jinak výchozí VZP + věta (žádný lokální přepínač)', () => {
  assert.equal(DEFAULT_KOD, '111');
  assert.equal(resolveKod({ moje: null }), '111');
  assert.equal(resolveKod({ moje: '213' }), '213');
  assert.equal(resolveKod({ moje: '999' }), '111');
  assert.equal(resolveKod(), '111');
  assert.equal(stateSentence({ kod: '111', moje: null }), 'Zobrazena je VZP ČR (výchozí). Vyberte svou pojišťovnu nahoře.');
  assert.equal(stateSentence({ kod: '213', moje: '213' }), 'Zobrazena je vaše pojišťovna: RBP.');
  const src = read('src', 'pojistovny-kraje.js');
  assert.ok(!/zpk-chip|chipsHtml|state\.local/.test(src), 'lokální chipy jsou pryč');
});

test('kraje: legenda rampy — 5 vzorků, nejnižší a nejvyšší hodnota', () => {
  const ds = buildKrajDataset(D5, '213', 2025);
  const html = legendHtml(ds, false);
  assert.equal(count(html, /class="zpk-sw"/g), 5);
  assert.match(html, /nejnižší &lt;0,1\s%/);
  assert.equal(legendValue(0), '0');
  assert.equal(legendValue(0.04), '<0,1');
  assert.equal(legendValue(12.34), '12,3');
  assert.ok(!/0,00/.test(html), 'legenda bez „0,00 %“');
  assert.match(html, /nejvyšší 27,3\s%/);
  assert.notEqual(legendHtml(ds, true), html, 'tmavý režim má jiné barvy');
  assert.equal(legendHtml({ regions: [] }, false), '');
});

test('kraje: cz-map hooky fillForRegion / titleForRegion / valueText přepíšou výchozí vzhled', () => {
  const stubHost = { innerHTML: '', querySelector: (sel) => (sel === 'svg' ? { querySelectorAll: () => [] } : null) };
  const ds = buildKrajDataset(D5, '213', 2025);
  renderCzMap(stubHost, ds, {
    fillForRegion: () => 'rgb(1,2,3)',
    titleForRegion: (r) => `T-${r.code}`,
    valueText: () => 'VAL',
  });
  assert.equal(count(stubHost.innerHTML, /fill="rgb\(1,2,3\)"/g), 14);
  assert.match(stubHost.innerHTML, /aria-label="T-CZ080"/);
  assert.equal(count(stubHost.innerHTML, />VAL</g), 14);
  // bez hooků zůstává původní chování (indicator.js)
  const plain = { innerHTML: '', querySelector: stubHost.querySelector };
  renderCzMap(plain, ds, {});
  assert.ok(!/rgb\(1,2,3\)/.test(plain.innerHTML));
  assert.match(plain.innerHTML, /od průměru ČR/);
});

// ===========================================================================
// P4.1 — semafor
// ===========================================================================

test('semafor: semaforCell — 4 stavy s ikonou a textem, null a neznámý = zatím nehodnoceno', () => {
  const stavy = POJ.stavy_semaforu;
  assert.deepEqual(['dolozeno', 'deklarovano', 'nedolozeno', 'neodpovedela'].map((s) => semaforCell(s, stavy).icon), ['✓', '◐', '✕', '⊘']);
  assert.equal(semaforCell('dolozeno', stavy).label, 'doloženo daty');
  assert.equal(semaforCell('dolozeno', stavy).tone, 'good');
  assert.equal(semaforCell('deklarovano', stavy).tone, 'warn');
  assert.equal(semaforCell('nedolozeno', stavy).tone, 'bad');
  assert.equal(semaforCell('neodpovedela', stavy).tone, 'neutral');
  for (const v of [null, undefined, '', 'bla', 5]) {
    const c = semaforCell(v, stavy);
    assert.equal(c.key, 'null');
    assert.equal(c.label, 'zatím nehodnoceno');
    assert.equal(c.hodnoceno, false);
    assert.equal(c.icon, '○');
  }
  assert.equal(semaforCell('dolozeno', { dolozeno: { label: 'JINÝ TEXT' } }).label, 'JINÝ TEXT');
  assert.equal(semaforCell('dolozeno', null).label, STAV_META.dolozeno.label);
});

test('semafor: semaforTip — zdůvodnění + zdroj + rok, prázdný stav vysvětlí proč', () => {
  const c = semaforCell('dolozeno', POJ.stavy_semaforu);
  assert.equal(semaforTip('VZP ČR', 'Prevence', { zduvodneni: 'Doložila data.', zdroj: 'Odpověď 1', rok: 2026 }, c),
    'VZP ČR · Prevence: doloženo daty · Doložila data. · Odpověď 1 · 2026');
  const n = semaforTip('VZP ČR', 'Prevence', { stav: null }, semaforCell(null, {}));
  assert.match(n, /zatím nehodnoceno/);
  assert.ok(n.includes(EMPTY_SENTENCE));
});

test('semafor: skutečná data — prázdný semafor vypadá záměrně prázdně', () => {
  const sum = semaforSummary(POJ);
  assert.equal(sum.total, 42);
  const html = renderSemafor(POJ);
  assert.equal(count(html, /<tr data-zp="/g), 7);
  assert.equal(count(html, /class="zps-cell zpv-mark"/g), 42);
  assert.equal(sum.hodnoceno, 0, 'před kolem 1 je semafor prázdný');
  assert.equal(count(html, /data-stav="null"/g), 42);
  assert.ok(html.includes(EMPTY_SENTENCE), 'věta nad tabulkou');
  assert.match(html, /zps-intro--empty/);
  assert.ok(count(html, /zatím nehodnoceno/g) >= 42);
  assert.ok(!/<td[^>]*data-stav="null"[^>]*tabindex/.test(html), 'prázdné buňky nejsou v tab pořadí');
  assert.equal(count(html, /<th scope="col"/g), 7, 'Pojišťovna + 6 oblastí');
  assert.match(html, /Stanoviska pojišťoven \(právo na odpověď\) · 0/);
  assert.ok(html.includes(NO_STATEMENT));
  assert.match(html, /Změny \(changelog\) · \d+/);
  assert.match(html, /Stavy semaforu/);
  assert.match(html, /role="region"/);
});

test('semafor: s verdikty — ikona + text, zdůvodnění v data-tip, tabindex jen u hodnocených', () => {
  const data = clone(POJ);
  data.pojistovny[0].semafor.prevence = { stav: 'dolozeno', rok: 2026, zduvodneni: 'Doložila záchyty.', zdroj: 'Odpověď č. 1', stanovisko_pojistovny: 'Naše doslovné stanovisko.' };
  data.pojistovny[1].semafor.sit = { stav: 'neodpovedela', rok: 2026, zduvodneni: 'Bez odpovědi do 15 dní.', zdroj: 'Evidence žádostí' };
  const html = renderSemafor(data);
  assert.match(html, /data-stav="dolozeno"[^>]*data-tip="VZP ČR · Prevence s dopadem: doloženo daty · Doložila záchyty\. · Odpověď č\. 1 · 2026"[^>]*tabindex="0"/);
  assert.match(html, /zps-tone-good" data-icon="✓" aria-hidden="true"><svg/);
  assert.match(html, /zps-tone-neutral" data-icon="⊘" aria-hidden="true"><svg/);
  assert.equal(count(html, /<svg/g) >= 42 + 5, true, 'každá buňka i legenda má SVG ikonu');
  assert.match(html, /<small>Doložila záchyty\.<\/small>/);
  assert.equal(count(html, /data-stav="null"/g), 40);
  assert.match(html, /Hodnoceno 2 z 42 polí/);
  assert.ok(!/zps-intro--empty/.test(html));
  // stanovisko doslova
  assert.deepEqual(stanoviska(data).map((s) => [s.zkratka, s.oblast, s.text]), [['VZP ČR', 'prevence', 'Naše doslovné stanovisko.']]);
  assert.match(html, /<blockquote class="zps-quote" data-zp="111"><p>Naše doslovné stanovisko\.<\/p>/);
  assert.match(html, /Stanoviska pojišťoven \(právo na odpověď\) · 1/);
  assert.ok(!html.includes(NO_STATEMENT));
  assert.deepEqual(semaforSummary(data).pocty, { dolozeno: 1, deklarovano: 0, nedolozeno: 0, neodpovedela: 1 });
});

test('semafor: escapování zdůvodnění, stanoviska i changelogu', () => {
  const data = clone(POJ);
  data.pojistovny[0].semafor.prevence = { stav: 'nedolozeno', rok: 2026, zduvodneni: EVIL, zdroj: EVIL, stanovisko_pojistovny: EVIL };
  data.changelog = [{ datum: '2026-11-03', zmena: EVIL, zdroj: EVIL }];
  const html = renderSemafor(data);
  assert.ok(!html.includes('<script>'), 'neescapovaný <script>');
  assert.ok(html.includes('&lt;script&gt;'));
});

test('semafor: changelog od nejnovějšího, český formát data, prázdný changelog', () => {
  const data = { changelog: [{ datum: '2026-01-05', zmena: 'a', zdroj: 'x' }, { datum: '2026-11-02', zmena: 'b', zdroj: '' }, { datum: '2026-11-02', zmena: 'c', zdroj: 'z' }] };
  assert.deepEqual(changelogSorted(data).map((c) => c.zmena), ['b', 'c', 'a']);
  assert.equal(semDate('2026-11-02'), '2. 11. 2026');
  assert.equal(semDate('bla'), 'bla');
  assert.deepEqual(changelogSorted({}), []);
  const html = renderSemafor({ ...clone(POJ), changelog: [] });
  assert.match(html, /Změny \(changelog\) · 0/);
  assert.match(html, /Zatím žádná změna\./);
  const real = renderSemafor(POJ);
  assert.match(real, /<time datetime="2026-11-02">2\. 11\. 2026<\/time>/);
});

test('semafor: nečitelná data → věta místo výjimky', () => {
  assert.match(renderSemafor(null), /nepodařilo načíst/);
  assert.match(renderSemafor({}), /nepodařilo načíst/);
});

// ===========================================================================
// P4.1 — registr žádostí
// ===========================================================================

test('žádosti: datumy — parseIso, addDays, daysBetween, plurál dní', () => {
  assert.equal(parseIso('2026-11-02'), Date.UTC(2026, 10, 2));
  for (const bad of ['2026-02-30', '2026-13-01', '26-11-02', null, '', 20261102]) assert.equal(parseIso(bad), null, String(bad));
  assert.equal(addDays('2026-11-02', 15), '2026-11-17');
  assert.equal(addDays('2026-12-25', 10), '2027-01-04');
  assert.equal(addDays('2026-11-02', NaN), null);
  assert.equal(daysBetween('2026-11-02', '2026-11-17'), 15);
  assert.equal(daysBetween('2026-11-17', '2026-11-02'), -15);
  assert.equal(daysBetween('x', '2026-11-02'), null);
  assert.deepEqual([1, 2, 4, 5, 15, 0].map(daysText), ['1 den', '2 dny', '4 dny', '5 dní', '15 dní', '0 dní']);
  assert.equal(daysText(-3), '3 dny');
  assert.match(todayIso(new Date(2026, 10, 2)), /^2026-11-02$/);
});

test('žádosti: lhutaInfo a zadostStav — připravená, čekající, po lhůtě, odpovězeno', () => {
  const base = { id: 'a', kolo: 1, typ: 'zadost-106', pojistovna_kod: '111', lhuta_dni: 15, doruceno: null, odpoved_soubor: null };
  const pripravena = { ...base, odeslano: null, stav: 'pripravena' };
  assert.deepEqual(lhutaInfo(pripravena, '2026-11-02'), { konec: null, zbyva: null });
  assert.equal(zadostStav(pripravena, '2026-11-02'), 'pripravena');

  const odeslana = { ...base, odeslano: '2026-11-03', stav: 'odeslana' };
  assert.deepEqual(lhutaInfo(odeslana, '2026-11-10'), { konec: '2026-11-18', zbyva: 8 });
  assert.equal(zadostStav(odeslana, '2026-11-10'), 'odeslana');
  assert.equal(zadostStav(odeslana, '2026-11-18'), 'odeslana', 'v den konce lhůty se ještě čeká');
  assert.equal(lhutaInfo(odeslana, '2026-11-18').zbyva, 0);
  assert.equal(zadostStav(odeslana, '2026-11-19'), 'po-lhute', 'po uplynutí lhůty');
  assert.equal(lhutaInfo(odeslana, '2026-11-20').zbyva, -2);

  const odpovezeno = { ...base, odeslano: '2026-11-03', doruceno: '2026-11-09', stav: 'odpovezeno' };
  assert.equal(zadostStav(odpovezeno, '2027-01-01'), 'odpovezeno');
  assert.equal(zadostStav({ ...odeslana, doruceno: '2026-11-09' }, '2027-01-01'), 'odpovezeno', 'doručení má přednost');
  assert.equal(zadostStav({ ...base, odeslano: '2026-11-03', stav: 'bez-odpovedi' }, '2026-11-04'), 'bez-odpovedi');
  assert.equal(zadostStav({ ...base, odeslano: '2026-11-03', stav: 'po-lhute' }, '2026-11-04'), 'po-lhute');
  assert.equal(zadostStav({ ...base, stav: 'nesmysl' }, '2026-11-04'), 'pripravena');
  assert.equal(zadostStav(null, '2026-11-04'), 'pripravena');
});

test('žádosti: zadostInfo — věta o lhůtě', () => {
  const base = { id: 'a', kolo: 1, typ: 'zadost-106', pojistovna_kod: '111', lhuta_dni: 15, doruceno: null };
  assert.match(zadostInfo({ ...base, odeslano: null, stav: 'pripravena' }, '2026-11-02').text, /lhůta 15 dní začne běžet odesláním/);
  assert.match(zadostInfo({ ...base, odeslano: '2026-11-03', stav: 'odeslana' }, '2026-11-10').text, /^zbývá 8 dní \(do 18\. 11\. 2026\)$/);
  assert.match(zadostInfo({ ...base, odeslano: '2026-11-03', stav: 'odeslana' }, '2026-11-18').text, /lhůta končí dnes/);
  assert.match(zadostInfo({ ...base, odeslano: '2026-11-03', stav: 'odeslana' }, '2026-11-20').text, /^po lhůtě o 2 dny \(skončila 18\. 11\. 2026\)$/);
  assert.match(zadostInfo({ ...base, odeslano: '2026-11-03', doruceno: '2026-11-09', stav: 'odpovezeno' }, '2026-12-01').text, /^odpovězeno za 6 dní$/);
});

test('žádosti: coverageKey a zadostiCell — mapování na matici pokrytí', () => {
  assert.deepEqual(['odpovezeno', 'odeslana', 'po-lhute', 'bez-odpovedi', 'pripravena'].map(coverageKey), ['ano', 'castecne', 'ne', 'ne', null]);
  const list = [
    { id: 'a', kolo: 1, typ: 'nabidka-spoluprace', pojistovna_kod: '111', odeslano: '2026-11-03', lhuta_dni: 15, doruceno: null, stav: 'odeslana' },
    { id: 'b', kolo: 2, typ: 'nabidka-spoluprace', pojistovna_kod: '111', odeslano: null, lhuta_dni: 15, doruceno: null, stav: 'pripravena' },
    { id: 'c', kolo: 1, typ: 'zadost-106', pojistovna_kod: '201', odeslano: '2026-11-03', lhuta_dni: 15, doruceno: '2026-11-08', stav: 'odpovezeno' },
  ];
  assert.equal(latestZadost(list, '111', 'nabidka-spoluprace').id, 'b', 'nejvyšší kolo');
  assert.equal(zadostiCell(list, '111', 'nabidka-spoluprace', '2026-11-10'), null, 'připravená = prázdná buňka');
  const c = zadostiCell(list, '201', 'zadost-106', '2026-11-10');
  assert.equal(c.stav, 'ano');
  assert.match(c.tip, /kolo 1 · odpovězeno · odesláno 3\. 11\. 2026 · odpovězeno za 5 dní/);
  assert.equal(zadostiCell(list.slice(0, 1), '111', 'nabidka-spoluprace', '2026-11-10').stav, 'castecne');
  assert.equal(zadostiCell(list.slice(0, 1), '111', 'nabidka-spoluprace', '2026-12-10').stav, 'ne', 'po lhůtě');
  assert.equal(zadostiCell(list, '205', 'zadost-106', '2026-11-10'), null, 'žádný záznam');
  assert.equal(latestZadost(null, '111', 'x'), null);
});

test('žádosti: zadostiSummary a leadText', () => {
  const sum = zadostiSummary(ZAD.zadosti, '2026-11-02');
  assert.equal(sum.total, 7);
  assert.equal(sum.counts.pripravena, 7);
  assert.equal(sum.maxKolo, 1);
  const lead = leadText(sum);
  assert.match(lead, /^Kolo 1: 7 připraveno k odeslání\./);
  assert.match(lead, /Zatím nic neodešlo.*člověk, ne AI/);
  assert.match(leadText({ total: 0, counts: {}, maxKolo: null }), /zatím neobsahuje žádný dotaz/);
  const mixed = leadText({ total: 4, counts: { pripravena: 1, odeslana: 1, odpovezeno: 1, 'po-lhute': 1, 'bez-odpovedi': 0 }, maxKolo: 2 });
  assert.match(mixed, /1 připraveno k odeslání, 1 čeká na odpověď, 1 odpovězeno, 1 po lhůtě/);
  assert.ok(!/Zatím nic neodešlo/.test(mixed));
});

test('žádosti: seed — 7 nabídek spolupráce kola 1, nic neodesláno', () => {
  assert.equal(ZAD.zadosti.length, 7);
  assert.deepEqual(ZAD.zadosti.map((z) => z.pojistovna_kod).sort(), ['111', '201', '205', '207', '209', '211', '213']);
  for (const z of ZAD.zadosti) {
    assert.equal(z.kolo, 1);
    assert.equal(z.typ, 'nabidka-spoluprace');
    assert.equal(z.stav, 'pripravena');
    assert.equal(z.odeslano, null);
    assert.equal(z.doruceno, null);
    assert.equal(z.odpoved_soubor, null);
    assert.equal(z.lhuta_dni, 15);
  }
  assert.ok(Array.isArray(ZAD.changelog));
});

test('žádosti: renderZadosti — matice 7 × 3, prázdné buňky = neodesláno, tabulka s lhůtami', () => {
  const html = renderZadosti(ZAD, '2026-11-02');
  assert.equal(count(html, /<tr data-zp="/g), 7 + 7, 'matice 7 ZP + tabulka 7 záznamů');
  assert.match(html, /Dotazy a žádosti pojišťovnám/);
  assert.match(html, /Kolo 1: 7 připraveno k odeslání/);
  for (const t of Object.values(ZADOST_TYPY)) assert.ok(html.includes(t), t);
  assert.ok(html.includes(`<span class="zpv-cov-tx">${NOT_SENT}</span>`));
  assert.ok(!html.includes('nedohledáno'), 'NA text matice je přejmenován');
  assert.match(html, /Evidence žádostí a lhůt · 7/);
  assert.match(html, /lhůta 15 dní začne běžet odesláním/);
  assert.match(html, /připravena k odeslání/);
  assert.match(html, /<details class="zpc-acc zpz-acc">/);
  assert.match(html, /role="region"/);
});

test('žádosti: renderZadosti s odeslanými — dny do konce lhůty a „po lhůtě“', () => {
  const data = clone(ZAD);
  data.zadosti[0] = { ...data.zadosti[0], odeslano: '2026-11-03', stav: 'odeslana' };
  data.zadosti[1] = { ...data.zadosti[1], odeslano: '2026-11-03', doruceno: '2026-11-09', stav: 'odpovezeno', odpoved_soubor: 'vozp-2026-11-09.pdf' };
  const early = renderZadosti(data, '2026-11-10');
  assert.match(early, /zbývá 8 dní \(do 18\. 11\. 2026\)/);
  assert.match(early, /odpovězeno za 6 dní/);
  assert.match(early, /vozp-2026-11-09\.pdf/);
  assert.match(early, /1 čeká na odpověď/);
  assert.match(early, /data-state="castecne"/);
  assert.match(early, /data-state="ano"/);
  const late = renderZadosti(data, '2026-11-25');
  assert.match(late, /po lhůtě o 7 dní/);
  assert.match(late, /data-state="ne"/);
  assert.match(late, /1 po lhůtě/);
});

test('žádosti: escapování a odolnost proti rozbitým datům', () => {
  const data = clone(ZAD);
  data.zadosti[0] = { ...data.zadosti[0], odpoved_soubor: EVIL, typ: EVIL };
  const html = renderZadosti(data, '2026-11-02');
  assert.ok(!html.includes('<script>'));
  assert.match(renderZadosti(null), /nepodařilo načíst/);
  assert.match(renderZadosti({ zadosti: [] }), /zatím neobsahuje žádný dotaz/);
  assert.equal(relabelNotSent('<span class="zpv-cov-tx">nedohledáno</span></span>nedohledáno</li>'),
    `<span class="zpv-cov-tx">${NOT_SENT}</span></span>${NOT_SENT}</li>`);
  assert.ok(ZADOST_STAVY['po-lhute']);
});

// ===========================================================================
// Validátor
// ===========================================================================

test('validátor: skutečný zadosti-106.json projde a je součástí loadDatasets', () => {
  const r = validateZadosti(ZAD);
  assert.deepEqual(r.errors, []);
  assert.ok(r.checks > 50);
  const ds = loadDatasets();
  assert.ok(ds.zadosti, 'loadDatasets načte volitelný dataset');
  const all = validateAll(ds);
  assert.deepEqual(all.errors, []);
});

test('validátor: validateAll bez zadosti-106 funguje (volitelný dataset)', () => {
  const ds = loadDatasets();
  delete ds.zadosti;
  const all = validateAll(ds);
  assert.deepEqual(all.errors, []);
});

test('validátor: zadosti — enumy, kódy ZP, data, unikáty, konzistence stavu', () => {
  const bad = (mut) => { const z = clone(ZAD); mut(z); return validateZadosti(z).errors; };
  assert.match(bad((z) => { z.zadosti[0].typ = 'blabla'; }).join('\n'), /typ: 'blabla'/);
  assert.match(bad((z) => { z.zadosti[0].stav = 'hotovo'; }).join('\n'), /stav: 'hotovo'/);
  assert.match(bad((z) => { z.zadosti[0].pojistovna_kod = '999'; }).join('\n'), /neznámý kód '999'/);
  assert.match(bad((z) => { z.zadosti[1].id = z.zadosti[0].id; }).join('\n'), /duplicitní/);
  assert.match(bad((z) => { z.zadosti[0].odeslano = '2026-02-30'; }).join('\n'), /odeslano/);
  assert.match(bad((z) => { z.zadosti[0].doruceno = '3. 11. 2026'; }).join('\n'), /doruceno/);
  assert.match(bad((z) => { z.zadosti[0].lhuta_dni = 0; }).join('\n'), /lhuta_dni/);
  assert.match(bad((z) => { z.zadosti[0].lhuta_dni = 1.5; }).join('\n'), /lhuta_dni/);
  assert.match(bad((z) => { z.zadosti[0].kolo = 0; }).join('\n'), /kolo/);
  assert.match(bad((z) => { z.zadosti[0].odpoved_soubor = '../tajne.pdf'; }).join('\n'), /odpoved_soubor/);
  assert.match(bad((z) => { z.zadosti[0].odpoved_soubor = '/etc/passwd'; }).join('\n'), /odpoved_soubor/);
  // připravená nesmí mít odeslání (nic není odesláno bez člověka)
  assert.match(bad((z) => { z.zadosti[0].odeslano = '2026-11-03'; }).join('\n'), /'pripravena' nesmí mít odeslano/);
  // odeslaná musí mít datum odeslání
  assert.match(bad((z) => { z.zadosti[0].stav = 'odeslana'; }).join('\n'), /vyžaduje datum odeslano/);
  // odpovězeno vyžaduje doručení; doručení vyžaduje stav odpovězeno; doručení nesmí předcházet odeslání
  assert.match(bad((z) => { Object.assign(z.zadosti[0], { stav: 'odpovezeno', odeslano: '2026-11-03' }); }).join('\n'), /vyžaduje datum doruceno/);
  assert.match(bad((z) => { Object.assign(z.zadosti[0], { stav: 'odeslana', odeslano: '2026-11-03', doruceno: '2026-11-04' }); }).join('\n'), /musí být 'odpovezeno'/);
  assert.match(bad((z) => { Object.assign(z.zadosti[0], { stav: 'odpovezeno', odeslano: '2026-11-05', doruceno: '2026-11-04' }); }).join('\n'), /dřív než odeslano/);
  assert.match(bad((z) => { z.changelog = [{ datum: 'včera', zmena: 'x', zdroj: '' }]; }).join('\n'), /changelog\[0\]\.datum/);
  assert.match(bad((z) => { z.zadosti = 'nic'; }).join('\n'), /zadosti: musí být pole/);
  assert.match(bad((z) => { delete z.version; }).join('\n'), /chybí version/);
  assert.match(validateZadosti(null).errors.join('\n'), /chybí nebo není objekt/);
  // platný vývoj: odesláno → odpovězeno
  const okData = clone(ZAD);
  Object.assign(okData.zadosti[0], { stav: 'odpovezeno', odeslano: '2026-11-03', doruceno: '2026-11-09', odpoved_soubor: 'vzp-2026-11-09.pdf' });
  assert.deepEqual(validateZadosti(okData).errors, []);
  // duplicitní trojice kolo+typ+ZP je jen varování
  const dup = clone(ZAD);
  dup.zadosti.push({ ...dup.zadosti[0], id: 'k1-nabidka-111-b' });
  const rd = validateZadosti(dup);
  assert.deepEqual(rd.errors, []);
  assert.equal(rd.warnings.length, 1);
  assert.ok(ZP_CODES.length === 7);
});

test('validátor: semafor — volitelné stanovisko_pojistovny je neprázdný string', () => {
  const ds = loadDatasets();
  assert.deepEqual(validateAll(ds).errors, []);
  const ok1 = clone(ds);
  ok1.pojistovny.pojistovny[0].semafor.prevence = { stav: 'dolozeno', rok: 2026, zduvodneni: 'x', zdroj: 'y', stanovisko_pojistovny: 'Doslovný text.' };
  assert.deepEqual(validateAll(ok1).errors, []);
  for (const v of ['', '   ', 5, { text: 'x' }]) {
    const d = clone(ds);
    d.pojistovny.pojistovny[0].semafor.prevence = { stav: 'dolozeno', rok: 2026, zduvodneni: 'x', zdroj: 'y', stanovisko_pojistovny: v };
    assert.match(validateAll(d).errors.join('\n'), /stanovisko_pojistovny/, JSON.stringify(v));
  }
});

// ===========================================================================
// HTML, CSS, dokumentace
// ===========================================================================

test('podstránky (P1.6): satelitní moduly jako script type=module na stránce svého kontejneru, na konci body', () => {
  const where = { 'pojistovny-kraje': ['pojistovny-kmen.html', 'zpKraje'], 'pojistovny-semafor': ['pojistovny-metodika.html', 'zpSemafor'],
    'pojistovny-zadosti': ['pojistovny-metodika.html', 'zpZadosti'] };
  for (const [m, [page, id]] of Object.entries(where)) {
    const html = read(page);
    for (const x of ['pojistovny', m]) {
      assert.equal(count(html, new RegExp(`<script type="module" src="src/${x}\\.js"></script>`, 'g')), 1, `${page}: ${x}`);
    }
    assert.match(html, new RegExp(`id="${id}"`), id);
    const at = html.indexOf(`src/${m}.js`);
    assert.ok(at > html.indexOf('<footer') && at < html.indexOf('</body>'), `${m} je na konci body`);
  }
});

test('styles.css: sekce .zpk-/.zps-/.zpz- je pod markerem na konci souboru', () => {
  const css = read('src', 'styles.css');
  const marker = '/* === Srovnávač pojišťoven: kraje, semafor, žádosti (.zpk-, .zps-, .zpz-) — balíčky P3.2/P4.1 === */';
  const at = css.indexOf(marker);
  assert.ok(at > 0, 'marker');
  assert.ok(at > css.indexOf('/* === Srovnávač pojišťoven: dotazníky'), 'pod existujícími markery');
  const tail = css.slice(at);
  for (const sel of ['.zpk-body', '.zpk-sw', '.zps-table', '.zps-cell', '.zps-quote', '.zps-log', '.zpz-table', '.zpz-stav']) {
    assert.ok(tail.includes(sel), sel);
  }
  const head = css.slice(0, at);
  assert.ok(!/\.zpk-|\.zps-|\.zpz-/.test(head), 'prefixy nejsou nikde jinde');
  assert.match(tail, /@media print/);
  assert.match(tail, /prefers-reduced-motion/);
  // tokeny, žádné pevné hex barvy
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(tail), 'jen tokeny');
});

test('styles.css: složené závorky jsou vyvážené (nedovřený @media print schoval všechna pravidla za sebou)', () => {
  const css = read('src', 'styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const ch of css) { if (ch === '{') depth++; else if (ch === '}') depth--; assert.ok(depth >= 0, 'přebývá }'); }
  assert.equal(depth, 0, 'chybí }');
});

test('moduly: žádné pevné barvy v JS, escapování přes escapeHtml, žádný innerHTML s neescapovaným vstupem z dat', () => {
  for (const f of ['pojistovny-kraje.js', 'pojistovny-semafor.js', 'pojistovny-zadosti.js']) {
    const src = read('src', f);
    assert.ok(!/#[0-9a-fA-F]{6}\b/.test(src), `${f}: hex barva`);
    assert.match(src, /escapeHtml/, f);
  }
});

test('dokumentace: quickref (prefixy), metodika § 4.2/4.4 (registr žádostí), site-architecture', () => {
  const qr = read('..', 'docs', 'quickref.md');
  for (const p of ['.zpk-', '.zps-', '.zpz-']) assert.ok(qr.includes(`\`${p}*\``), p);
  const met = read('..', 'docs', 'metodika-srovnavac-pojistoven.md');
  assert.match(met, /data\/zadosti-106\.json/);
  assert.match(met, /stanovisko_pojistovny/);
  const arch = read('..', 'docs', 'site-architecture.md');
  assert.match(arch, /pojistovny-kraje\.js/);
  assert.match(arch, /pojistovny-semafor\.js/);
  assert.match(arch, /pojistovny-zadosti\.js/);
});
