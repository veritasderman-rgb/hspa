// Testy stránky Instituce (A2.1, A3.1, A3.2, A3.3): čisté funkce src/pojistovny-instituce.js, HTML stránky,
// přesun sítě odborností z Kmene. Žádná jména osob, žádné žebříčky; seřazené grafy nesou SORT_NOTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  kdoKratce, obsazeniText, buildOrganyRows, organyTableHtml, citaceZp, citaceHtml, zdrojeInstituceHtml, organyHtml, organyKarta,
  buildAparat, aparatHtml, buildProgramyMatrix, programyZpHtml, programyHtml, programyKarta,
  buildDostupnostMatrix, dostupnostZpHtml, dostupnostHtml, dostupnostKarta, renderInstituce, STAV_DOSTUPNOST,
} from '../src/pojistovny-instituce.js';
import { dotMatrix, coverageMatrix, SORT_NOTE } from '../src/zp-viz.js';
import { ZP_STRANKY, zpStrankaById } from '../src/pojistovny-shell.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const I = json('pojistovny-instituce.json');
const SP = json('pojistovny-smluvni-programy.json');
const D = json('pojistovny-dostupnost.json');
const R = json('pojistovny-hospodareni-rady.json');
const page = fs.readFileSync(path.join(ROOT, 'pojistovny-instituce.html'), 'utf8');
const count = (s, re) => (s.match(re) || []).length;
const KODY = ['111', '201', '205', '207', '209', '211', '213'];
const keysOf = (o, acc = new Set()) => {
  if (Array.isArray(o)) o.forEach((x) => keysOf(x, acc));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.add(k); keysOf(v, acc); }
  return acc;
};

test('obsazení orgánu: „5 vláda + 5 zaměstnavatelé a OSVČ + 5 zaměstnanci“, VZP „10 vláda + 20 Poslanecká sněmovna“', () => {
  assert.equal(obsazeniText(I.pojistovny.find((z) => z.kod === '111').organy.spravni_rada), '10 vláda + 20 Poslanecká sněmovna');
  assert.equal(obsazeniText(I.pojistovny.find((z) => z.kod === '201').organy.spravni_rada), '5 vláda + 5 zaměstnavatelé a OSVČ + 5 zaměstnanci');
  assert.equal(obsazeniText(I.pojistovny.find((z) => z.kod === '201').organy.dozorci_rada), '3 vláda + 3 zaměstnavatelé a OSVČ + 3 zaměstnanci');
  assert.equal(obsazeniText({}), null);
  assert.equal(obsazeniText(null), null);
  assert.equal(kdoKratce('Poslanecká sněmovna'), 'Poslanecká sněmovna');
  // součet jmenovaných = počet členů (kontrola, kterou dělá i validátor)
  for (const z of I.pojistovny) for (const o of ['spravni_rada', 'dozorci_rada']) {
    assert.equal(z.organy[o].obsazeni.reduce((a, x) => a + x.pocet, 0), z.organy[o].pocet, `${z.kod} ${o}`);
  }
});

test('tabulka orgánů: 7 řádků s data-zp, 8 sloupců, bez jmen osob', () => {
  const rows = buildOrganyRows(I);
  assert.deepEqual(rows.map((r) => r.kod), KODY);
  const html = organyTableHtml(I);
  assert.equal(count(html, /<tr data-zp="/g), 7);
  assert.equal(count(html, /<th scope="col"/g), 8);
  for (const h of ['Zákon', 'Vznik', 'Správní rada', 'Dozorčí rada', 'Ředitel', 'Dohled', 'Členství']) assert.match(html, new RegExp(`>${h}<`));
  assert.match(html, /551\/1991 Sb\./);
  assert.match(html, /280\/1992 Sb\./);
  assert.match(html, /<b>30<\/b> členů<small>10 vláda \+ 20 Poslanecká sněmovna<\/small>/);
  assert.match(html, /MZ ČR \+ MF ČR/);
  assert.match(html, /jmenuje správní rada/);
  assert.match(html, /po sloučení 4 pojišťoven \(1996–2012\)/, 'ČPZP');
  assert.match(html, /region="?|role="region" tabindex="0"/);
  // žádný z klíčů `jmeno*` v datech ani ve výstupu
  const klice = [...keysOf(I)];
  assert.ok(!klice.some((k) => /^jmen[oa]$|^jmeno_|osoby$/.test(k)), `klíče s osobami: ${klice.filter((k) => /jmen|osob/.test(k))}`);
  assert.ok(!JSON.stringify(rows).includes('"jmeno"'));
  assert.ok(!/jmeno|příjmení/i.test(html));
});

test('citace a zdroje: po pojišťovnách, zdroje[] a chybi[] ve sbalených blocích', () => {
  const c = citaceZp(I.pojistovny[0]);
  assert.ok(c.length >= 5);
  assert.ok(c.every((x) => x.co && (x.citace || x.paragraf)));
  assert.match(citaceHtml(c), /<q>/);
  assert.equal(citaceHtml([]), '');
  const z = zdrojeInstituceHtml(I);
  assert.equal(count(z, /<details class="zpc-acc" data-zp="/g), 7);
  assert.match(z, /<summary>Zdroje a paragrafy<span class="zpc-n"> · \d+<\/span>/);
  assert.match(z, /<summary>Co se nepodařilo dohledat/);
  assert.match(z, /418\/2003 Sb\./);
  assert.doesNotMatch(z, /<details[^>]* open/);
  assert.equal(zdrojeInstituceHtml({}), '');
  assert.match(organyHtml(I), /zpc-inst-tbl/);
});

test('profil: orgány jedné pojišťovny (definiční seznam, bez jmen)', () => {
  const k = organyKarta(I, '211');
  assert.match(k, /Správní rada<\/dt><dd>15 členů/);
  assert.match(k, /Limit nákladů na činnost/);
  assert.match(organyKarta(I, '999'), /nedohledáno/);
  assert.match(organyKarta(null, '111'), /nedohledáno/);
});

test('aparát: pojištěnců na zaměstnance s pásmem „průměr sedmi pojišťoven“, využití limitu, index zaměstnanců, SORT_NOTE', () => {
  const a = buildAparat(R);
  assert.equal(a.naZamestnance.rok, 2024);
  assert.equal(a.naZamestnance.items.length, 7);
  assert.ok(a.naZamestnance.items.every((i) => Number.isFinite(i.value)));
  assert.equal(a.naZamestnance.opts.ref.label, 'průměr sedmi pojišťoven');
  const sp = R.pojistovny.reduce((s, z) => s + z.rady.pojistenci_prumer['2024'].hodnota, 0);
  const sz = R.pojistovny.reduce((s, z) => s + z.rady.zamestnanci['2024'].hodnota, 0);
  assert.ok(Math.abs(a.naZamestnance.opts.ref.value - sp / sz) < 1e-9);
  assert.equal(a.limit.rok, 2024);
  assert.equal(a.limit.opts.ref.value, 100);
  assert.equal(a.zamestnanci.series.length, 7);
  assert.equal(a.zamestnanci.opts.base, 2015);
  const html = aparatHtml(R);
  assert.ok(html.includes(SORT_NOTE));
  assert.match(html, /Pojištěnců na jednoho zaměstnance 2024/);
  assert.match(html, /Využití zákonného limitu přídělu na provoz 2024/);
  assert.match(html, /Zaměstnanci pojišťoven 2015–2024/);
  assert.match(html, /href="pojistovny-penize\.html#fond-provoz"[^>]*>Celé téma: Peníze/);
});

test('aparát bez dat: nic nepadá, věta „nedohledáno“', () => {
  assert.equal(buildAparat(null), null);
  assert.equal(buildAparat({}), null);
  assert.match(aparatHtml(null), /nedohledáno/);
  const prazdne = { roky: [2024], pojistovny: [{ kod: '111', zkratka: 'VZP ČR', rady: {} }] };
  assert.doesNotThrow(() => aparatHtml(prazdne));
});

test('smluvní programy: dotMatrix ZP × kritéria, ano = aspoň jeden program, bez dat „—“, scoreLabel „kritérií“', () => {
  const m = buildProgramyMatrix(SP);
  assert.deepEqual(m.cols.map((c) => c.key), ['kvalita', 'dostupnost', 'e-health', 'prevence', 'ekonomika']);
  assert.equal(m.rows.length, 7);
  const vzp = m.rows.find((r) => r.kod === '111');
  assert.equal(m.cell(vzp, { key: 'dostupnost' }), true);
  assert.equal(m.cell(vzp, { key: 'e-health' }), false, 'e-health nemá žádná ZP');
  for (const r of m.rows) assert.equal(m.cell(r, { key: 'e-health' }), false, r.label);
  assert.equal(m.opts.scoreLabel, 'kritérií');
  const html = dotMatrix(m.rows, m.cols, m.cell, m.opts);
  assert.equal(count(html, /<tr data-zp="/g), 7);
  assert.match(html, /scorehead">kritérií</);
  assert.match(html, /z 5 kritérií/);
  // ZP bez programů a s „nenalezeno“ = „—“, ne „ne“
  const SP2 = JSON.parse(JSON.stringify(SP));
  SP2.pojistovny[2].programy = [];
  SP2.pojistovny[2].nenalezeno = true;
  const m2 = buildProgramyMatrix(SP2);
  assert.equal(m2.cell(m2.rows[2], { key: 'kvalita' }), null);
});

test('seznam programů: odkaz rel=noopener, citace v <q>, ověřeno; vybraná ZP rozbalená, bez výběru všechny sbalené', () => {
  const z = SP.pojistovny[0];
  const li = programyZpHtml(z, SP.skala);
  assert.equal(count(li, /<li class="zpc-prog">/g), z.programy.length);
  assert.match(li, /<a href="https:\/\/plus\.vzp\.cz\/[^"]+" rel="noopener">Motivační program VZP PLUS/);
  assert.match(li, /<q class="zpc-prog-cit">/);
  assert.match(li, /ověřeno 3\. 11\. 2026/);
  assert.match(li, /všeobecní praktičtí lékaři/);
  assert.match(programyZpHtml({ programy: [], web_pro_poskytovatele: 'https://x.cz/p' }, {}), /nebyl nalezen žádný program/);
  const bez = programyHtml(SP, null);
  assert.equal(count(bez, /<details class="zpc-acc" data-zp="\d+">/g), 7);
  assert.equal(count(bez, /<details class="zpc-acc" data-zp="\d+" open>/g), 0);
  const sMoje = programyHtml(SP, '205');
  assert.equal(count(sMoje, /<details class="zpc-acc" data-zp="205" open>/g), 1);
  assert.match(bez, /Existence programu není jeho účinek/);
  assert.match(bez, /<b>E-health\.<\/b> Žádná pojišťovna/);
  assert.match(bez, /semaforu po právu pojišťovny na odpověď/);
  assert.match(programyHtml(null), /nedohledáno/);
  assert.match(programyKarta(SP, '111'), /zpc-prog-list/);
  assert.match(programyKarta(SP, '999'), /nedohledáno/);
});

test('dostupnost: coverageMatrix 7 × 5, tooltip = co, nenalezeno místo „neuvádí“, rozpis s citací a zdrojem', () => {
  const m = buildDostupnostMatrix(D);
  assert.equal(m.rows.length, 7);
  assert.equal(m.cols.length, 5);
  assert.deepEqual(m.cols.map((c) => c.key), ['cekaci_doby', 'sit_nedostatkove', 'zajisteni_pece', 'lhuty_307', 'par16']);
  const html = coverageMatrix(m.rows, m.cols, m.cell, m.opts);
  assert.equal(count(html, /<td class="zpv-cov"/g), 35);
  assert.equal(count(html, /<tr data-zp="/g), 7);
  assert.match(html, /data-tip="VZP ČR · Čekací doby: nenalezeno — Čekací doby na péči VZP nepublikuje/);
  assert.equal(STAV_DOSTUPNOST.ne, 'nenalezeno');
  assert.doesNotMatch(html, /zpv-cov-tx">neuvádí</);
  const one = buildDostupnostMatrix(D, { kod: '205' });
  assert.equal(one.rows.length, 1);
  const rozpis = dostupnostZpHtml(D.pojistovny[0], D.sloupce);
  assert.equal(count(rozpis, /<li><b>/g), 5);
  assert.match(rozpis, /<q class="zpc-prog-cit">/);
  assert.match(rozpis, /111-2025\.txt, ř\. 1299/);
  assert.match(rozpis, /rel="noopener">odkaz/);
  const full = dostupnostHtml(D);
  assert.match(full, /Proč se čísla nedají seřadit/);
  assert.match(full, /href="indicator\.html\?id=cekaci_doba_kycel"/);
  assert.match(full, /ilustrativní, ne ověřený údaj z VZP/);
  assert.match(full, /href="pojistovny-aplikace\.html#zpStiznosti"/);
  assert.equal(count(full, /<details class="zpc-acc" data-zp="/g), 7);
  assert.match(dostupnostHtml(null), /nedohledáno/);
  assert.match(dostupnostKarta(D, '111'), /Co publikuje VZP ČR o dostupnosti péče/);
  assert.match(dostupnostKarta(D, '999'), /nedohledáno/);
});

test('bez dat nic nepadá: všechny build funkce přežijí null i prázdné objekty', () => {
  assert.doesNotThrow(() => { organyHtml(null); organyHtml({}); programyHtml({}); dostupnostHtml({}); buildProgramyMatrix(null); buildDostupnostMatrix(undefined); buildOrganyRows(null); });
  assert.match(organyHtml(null), /nedohledáno/);
  assert.doesNotThrow(() => renderInstituce({}, null));
});

test('shell: záložka Instituce za Zdravotní gramotností ve skupině pro pojištěnce', () => {
  const ids = ZP_STRANKY.map((s) => s.id);
  assert.equal(ids.indexOf('instituce'), ids.indexOf('gramotnost') + 1);
  const s = zpStrankaById('instituce');
  assert.equal(s.skupina, 'pojistenci');
  assert.equal(s.href, 'pojistovny-instituce.html');
  assert.equal(s.label, 'Instituce');
  assert.ok(s.veta && s.co && s.kicker);
});

test('stránka Instituce: noindex, jeden h1, audit komentář, kontejnery, shell, skripty, síť přesunutá z Kmene', () => {
  assert.match(page, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.equal(count(page, /<h1\b/g), 1);
  assert.match(page, /<title>Instituce — Srovnávač pojišťoven, pracovní verze · HSPA Monitor<\/title>/);
  assert.match(page, /<!--\s*\n\s*audit:/);
  assert.match(page, /<div id="zpShell" class="zpc-shell" data-aktivni="instituce"><\/div>/);
  for (const id of ['zpInstOrgany', 'zpInstAparat', 'zpInstProgramy', 'zpInstDostupnost', 'zpSit', 'zpMojeZp', 'zpZdroje']) assert.equal(count(page, new RegExp(`id="${id}"`, 'g')), 1, id);
  assert.match(page, /<script type="module" src="src\/pojistovny\.js"><\/script>/);
  assert.match(page, /<script type="module" src="src\/pojistovny-sit\.js"><\/script>/);
  assert.doesNotMatch(page, /\sstyle="/);
  // síť odborností: povinné věty nad grafem se přesunuly spolu se sekcí
  const before = page.slice(page.indexOf('id="sit-odbornosti"'), page.indexOf('id="zpSit"'));
  assert.match(before, /horní odhad smluvních pracovišť, stav k 31\. 12\. 2024/);
  assert.match(before, /„Počet poboček“ dnes není srovnatelné číslo/);
  const kmen = fs.readFileSync(path.join(ROOT, 'pojistovny-kmen.html'), 'utf8');
  assert.doesNotMatch(kmen, /zpSit|sit-odbornosti|pojistovny-sit\.js/);
  // úvod orgánů zmiňuje oba zákony a dohled
  assert.match(page, /551\/1991 Sb\./);
  assert.match(page, /280\/1992 Sb\./);
  assert.match(page, /Ministerstvo zdravotnictví a Ministerstvo financí/);
});

test('orchestrátor: datasety Instituce se načítají podle kontejnerů a jdou do „Stáří dat“', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  assert.match(src, /import \{ renderInstituce \} from '\.\/pojistovny-instituce\.js'/);
  assert.match(src, /renderInstituce\(\{ I: inst, SP: prog, D: dost, R: rady \}\)/);
  assert.match(src, /instituce: \['zpInstOrgany', 'zpProfil'\]/);
  assert.match(src, /'zpInstAparat'/);
});
