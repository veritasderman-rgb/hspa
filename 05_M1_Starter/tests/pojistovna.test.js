// Testy profilu pojišťovny pojistovna.html?zp=<kód> (A2.3): čisté funkce src/pojistovna.js, HTML stránky,
// odkazy z přehledu a z karet Kmene, rozcestník pro neplatný kód. Renderery se neduplikují (profil jen skládá).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  zpZUrl, profilTitle, profilTiles, porovnejDlazdice, porovnatProProfil, tilesHtml, buildKmenKarta, aplikaceKarta, stiznostiKarta, fondKarta, hlavickaHtml, profilHtml, rozcestnikHtml, renderProfil,
} from '../src/pojistovna.js';
import { ovKartaHtml, ovMiniKartyHtml, zpSouhrny } from '../src/pojistovny-prehled.js';
import { buildRadyKarta, buildSegmentyKarta, buildSaldoKarta } from '../src/pojistovny-penize.js';
import { ZP_STRANKY } from '../src/pojistovny-shell.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const DATA = {
  P: json('pojistovny.json'), A: json('pojistovny-aplikace.json'), PV: json('pojistovny-prevence.json'),
  PR: json('pojistovny-prerozdeleni.json'), R: json('pojistovny-hospodareni-rady.json'), S: json('pojistovny-segmenty.json'),
  I: json('pojistovny-instituce.json'), SP: json('pojistovny-smluvni-programy.json'), D: json('pojistovny-dostupnost.json'),
  ST: json('pojistovny-stiznosti.json'),
};
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = read('pojistovna.html');
const count = (s, re) => (s.match(re) || []).length;
const KODY = ['111', '201', '205', '207', '209', '211', '213'];

test('?zp=: platný kód, jinak null; titulek profilu', () => {
  assert.equal(zpZUrl('?zp=111'), '111');
  assert.equal(zpZUrl('?foo=1&zp=213'), '213');
  assert.equal(zpZUrl('?zp=999'), null);
  assert.equal(zpZUrl(''), null);
  assert.equal(zpZUrl(undefined), null);
  assert.equal(profilTitle('111'), 'VZP ČR — profil pojišťovny · Srovnávač pojišťoven');
  assert.match(profilTitle(null), /^Profil pojišťovny — Srovnávač pojišťoven/);
});

test('KPI: devět dlaždic s průměrem sedmi pojišťoven nebo ČR v meta, hodnoty z dat', () => {
  const t = profilTiles('111', DATA);
  assert.equal(t.length, 9);
  const by = (re) => t.find((x) => re.test(x.label));
  assert.ok(Math.abs(by(/^pojištěnců/).value - DATA.P.pojistovny[0].crp.pojistenci / 1e6) < 1e-9);
  assert.match(by(/^pojištěnců/).label, /CRP 2025/);
  assert.match(by(/podíl na trhu/).meta, /průměr sedmi pojišťoven: 14,3/);
  assert.match(by(/senioři/).meta, /^ČR: \d/);
  assert.match(by(/státní/).label, /\(2024\)/);
  assert.ok(by(/státní/).value > 40 && by(/státní/).value < 70);
  assert.match(by(/státní/).meta, /průměr sedmi pojišťoven: \d/);
  assert.match(by(/vykázané/).meta, /^ČR: [\d\s ]+Kč$/);
  assert.match(by(/přepočtené/).meta, /přepočteno na index přerozdělení; není to věková standardizace/);
  assert.ok(by(/přepočtené/).value > 0);
  assert.equal(by(/saldo/).label, `relativní saldo přerozdělení ${DATA.PR.posledni_rok_rocni}`);
  assert.ok(by(/saldo/).value > 15, 'VZP +17 mld');
  assert.match(by(/^pojištěnců/).meta, /^průměr sedmi pojišťoven: 1,55[\s\u00a0]mil\.$/);
  assert.match(by(/saldo/).meta, /součet sedmi pojišťoven je nula/);
  assert.match(by(/provoz/).meta, /průměr sedmi pojišťoven/);
  assert.match(by(/rezerva/).meta, /kritické pásmo 3–4 %/);
  // bez řad MZ a přerozdělení: dlaždice zůstanou, hodnoty „nedohledáno“ (null), nic nepadá
  const bez = profilTiles('111', { P: DATA.P });
  assert.equal(bez.length, 9);
  assert.equal(bez.find((x) => /státní/.test(x.label)).value, null);
  assert.equal(bez.find((x) => /saldo/.test(x.label)).value, null);
  assert.deepEqual(profilTiles('999', DATA), []);
  assert.deepEqual(profilTiles('111', {}), []);
});

test('mini-grafy: řada jedné ZP + ČR, kmen 2010–2025, segmenty, saldo, fond prevence, stížnosti, aplikace', () => {
  const nakl = buildRadyKarta(DATA.R, 'naklady_na_pojistence_kc', '205');
  assert.equal(nakl.series.length, 2, 'jedna ZP + ČR');
  assert.equal(nakl.series[0].label, 'ČPZP');
  assert.equal(nakl.series[1].key, 'cr');
  assert.match(nakl.opts.title, /ČPZP a ČR 2015–2024/);
  assert.equal(buildRadyKarta(DATA.R, 'naklady_na_pojistence_kc', '999'), null);
  assert.equal(buildRadyKarta(DATA.R, 'statni_pojistenci_pct', '111'), null, 'bary nejsou řada');
  const kmen = buildKmenKarta(DATA.P, '207');
  assert.equal(kmen.series.length, 2);
  assert.equal(kmen.series[0].points.length, 16);
  assert.equal(kmen.opts.base, 2010);
  assert.match(kmen.opts.title, /2010–2025/);
  assert.equal(buildKmenKarta(DATA.P, '999'), null);
  const seg = buildSegmentyKarta(DATA.S, '211');
  assert.equal(seg.zkratka, 'ZP MV ČR');
  assert.ok(seg.parts.length >= 3);
  assert.equal(buildSegmentyKarta(DATA.S, '999'), null);
  const sa = buildSaldoKarta(DATA.PR, '211');
  assert.ok(sa.mld < 0);
  assert.equal(sa.rok, DATA.PR.posledni_rok_rocni);
  assert.equal(buildSaldoKarta(null, '211'), null);
  assert.match(fondKarta(DATA.PV, '111'), /Struktura čerpání fondu prevence/);
  assert.match(fondKarta(null, '111'), /nedohledáno|nejsou k dispozici/);
  const app = aplikaceKarta(DATA.A, '111');
  assert.equal(count(app, /<tr data-zp="/g), 1, 'jeden řádek');
  assert.match(app, /n\/10/);
  assert.match(aplikaceKarta(null, '111'), /nejsou k dispozici/);
  const st = stiznostiKarta(DATA.ST, DATA.P, '111');
  assert.match(st, /Podání k dostupnosti péče/);
  assert.match(st, /Stížnosti podle § 16a/);
  assert.match(stiznostiKarta(null, DATA.P, '111'), /nejsou k dispozici/);
});

test('profil VZP ČR: hlavička, KPI, všechny sekce s odkazem „Celé téma →“ na podstránku', () => {
  const html = profilHtml('111', DATA);
  assert.equal(count(html, /<header class="zpc-prof-head" data-zp="111"/g), 1);
  assert.match(html, /Všeobecná zdravotní pojišťovna ČR/);
  assert.match(html, /<dt>IČO<\/dt><dd>41197518/);
  assert.match(html, /<dt>Zákon<\/dt><dd>551\/1991 Sb\./);
  assert.match(html, /Otevřený svaz zdravotních pojišťoven/);
  assert.match(html, /rel="noopener">vzp\.cz/);
  assert.match(html, /<button type="button" class="zpc-chip zpc-prof-moje" data-prof-moje="111">Nastavit jako moji pojišťovnu<\/button>/);
  assert.equal(count(html, /class="zpv-tile"/g), 9);
  for (const id of ['prof-kmen', 'prof-penize', 'prof-prevence', 'prof-aplikace', 'prof-instituce']) assert.match(html, new RegExp(`<section class="zpc-prof-sec" id="${id}"`), id);
  for (const href of ['pojistovny-kmen.html#zp-111', 'pojistovny-penize.html', 'pojistovny-prevence.html', 'pojistovny-aplikace.html', 'pojistovny-instituce.html', 'pojistovny-instituce.html#sit-odbornosti']) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  assert.equal(count(html, /Celé téma: /g), 5);
  assert.match(html, /Správní rada<\/dt><dd>30 členů/);
  assert.match(html, /zpc-prog-list/);
  assert.match(html, /Co publikuje VZP ČR o dostupnosti péče/);
  assert.match(html, /Síť smluvních odborností/);
  // profil nevybírá „Moje pojišťovnu“ za čtenáře: žádný zápis do úložiště ani data-moje-zp v HTML
  assert.doesNotMatch(html, /data-moje-zp|localStorage/);
  // jména osob v profilu nejsou
  assert.doesNotMatch(html, /jmeno|příjmení/i);
});

test('profil: všech sedm pojišťoven se vykreslí, každý ve své barvě a s vlastními daty', () => {
  for (const kod of KODY) {
    const html = profilHtml(kod, DATA);
    assert.match(html, new RegExp(`data-zp="${kod}" style="--c:var\\(--zp-${kod}\\)"`), kod);
    assert.equal(count(html, /<h1/g), 0, 'h1 je ve stránce');
    assert.ok(count(html, /class="zpv-tile"/g) === 9, kod);
    assert.doesNotMatch(html, /undefined|NaN|\[object/, kod);
  }
  assert.match(profilHtml('213', DATA), /RBP/);
});

test('profil bez dat: nic nepadá, sekce hlásí „nedohledáno“', () => {
  assert.match(profilHtml('111', {}), /nepodařilo načíst/);
  assert.match(profilHtml('999', DATA), /nepodařilo načíst/);
  const jenP = profilHtml('205', { P: DATA.P });
  assert.match(jenP, /nedohledáno|nejsou k dispozici|nedohledán/);
  assert.doesNotMatch(jenP, /undefined|NaN/);
  assert.doesNotThrow(() => renderProfil({ kod: '111', data: {} }, null));
});

test('?zp=999 i chybějící zp = rozcestník sedmi odkazů na pojistovna.html?zp=', () => {
  const html = rozcestnikHtml(DATA.P, DATA.A);
  assert.equal(count(html, /<a class="zpc-ov-mini" href="pojistovna\.html\?zp=\d{3}"/g), 7);
  for (const kod of KODY) assert.ok(html.includes(`href="pojistovna.html?zp=${kod}"`), kod);
  assert.doesNotMatch(html, /<button/);
  assert.match(rozcestnikHtml(null), /nepodařilo načíst/);
  // ovMiniKartyHtml bez href zůstává tlačítky (přehled)
  const s = zpSouhrny(DATA.P, DATA.A);
  assert.equal(count(ovMiniKartyHtml(s), /<button type="button" class="zpc-ov-mini"/g), 7);
});

test('odkazy na profil: karta vybrané ZP na přehledu a karty na Kmeni', () => {
  const s = zpSouhrny(DATA.P, DATA.A).find((x) => x.kod === '111');
  assert.match(ovKartaHtml(s), /<a href="pojistovna\.html\?zp=111">Profil VZP ČR →<\/a>/);
  assert.match(ovKartaHtml(s), /pojistovny-kmen\.html#zp-111/, 'původní odkaz na Kmen zůstává');
  const src = read('src/pojistovny.js');
  assert.match(src, /class="zpc-card-prof" href="pojistovna\.html\?zp=\$\{esc\(z\.kod\)\}"/);
  assert.match(src, /renderProfil\(\{ kod: zpZUrl\(location\.search\)/);
});

test('stránka profilu: noindex, jeden h1, audit, shell s data-aktivni="profil" (bez záložky), kontejnery, orchestrátor', () => {
  assert.match(page, /^<!DOCTYPE html>/);
  assert.match(page, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.equal(count(page, /<h1\b/g), 1);
  assert.equal(count(page, /<title>/g), 1);
  assert.match(page, /<title>Profil pojišťovny — Srovnávač pojišťoven/);
  assert.match(page, /<!--\s*\n\s*audit:/);
  assert.match(page, /href="src\/styles\.min\.css"/);
  assert.match(page, /<main id="content">\s*<div id="zpShell" class="zpc-shell" data-aktivni="profil"><\/div>/);
  for (const id of ['zpProfil', 'zpProfilHead', 'zpMojeZp', 'zpZdroje', 'siteFooter', 'moduleNav', 'mastheadDate']) assert.equal(count(page, new RegExp(`id="${id}"`, 'g')), 1, id);
  assert.match(page, /<script type="module" src="src\/pojistovny\.js"><\/script>/);
  assert.doesNotMatch(page, /\sstyle="/);
  assert.doesNotMatch(page, /\.\.\/src\//);
  // profil není téma: není v ZP_STRANKY, takže v záložkách nemá žádnou aktivní
  assert.ok(!ZP_STRANKY.some((x) => x.id === 'profil' || x.href === 'pojistovna.html'));
});

test('sitemap, middleware, e2e a axe: profil je noindex, za heslem a v seznamech stránek', async () => {
  assert.match(read('scripts/generate-sitemap.js'), /'\/pojistovna\.html': \{ typ: 'noindex'/);
  assert.match(read('scripts/generate-sitemap.js'), /'\/pojistovny-instituce\.html': \{ typ: 'noindex'/);
  const { config } = await import('../middleware.js');
  assert.ok(config.matcher.includes('/pojistovna.html'));
  assert.match(read('tests/e2e/visual.spec.js'), /pojistovna\.html\?zp=111/);
  assert.match(read('tests/e2e/a11y.spec.js'), /pojistovna\.html\?zp=111/);
  assert.match(read('tests/e2e/visual.spec.js'), /pojistovny-instituce\.html/);
  assert.match(read('tests/a11y/axe-scan.mjs'), /'pojistovna\.html\?zp=111'/);
  assert.match(read('tests/a11y/axe-scan.mjs'), /'pojistovny-instituce\.html'/);
});

test('profil s ?porovnat=: dlaždice dostanou řádek druhé ZP a rozdíl, bez porovnání beze změny', () => {
  const bez = profilTiles('111', DATA);
  assert.ok(bez.every((t) => !t.cmp));
  const s = profilTiles('111', DATA, '205');
  assert.equal(s.length, bez.length);
  const pocet = s[0];
  assert.equal(pocet.cmp.kod, '205');
  assert.equal(pocet.cmp.label, 'ČPZP');
  assert.match(pocet.cmp.diff, /^[+−][\d,]+ mil\.$/);
  assert.match(s[1].cmp.diff, /p\. b\.$/, 'podíl na trhu: rozdíl v procentních bodech');
  // rozdíl = hodnota − hodnota druhé ZP
  const druha = profilTiles('205', DATA)[0].value;
  assert.ok(Math.abs((pocet.value - druha) - Number(pocet.cmp.diff.replace('−', '-').replace(',', '.').replace(' mil.', ''))) < 0.006);
  // sama se sebou ani neznámý kód nic nepřidá
  assert.ok(profilTiles('111', DATA, '111').every((t) => !t.cmp));
  assert.ok(profilTiles('111', DATA, '999').every((t) => !t.cmp));
  // chybějící hodnota druhé ZP: text „nedohledáno“ a bez rozdílu
  const jedna = porovnejDlazdice([{ value: 5, decimals: 1, unit: '%', label: 'a' }], [{ value: null, decimals: 1, unit: '%' }], '205');
  assert.equal(jedna[0].cmp.text, 'nedohledáno');
  assert.equal(jedna[0].cmp.diff, null);
});

test('profil: porovnatProProfil — URL má přednost před atributem i úložištěm, sama sebe ignoruje', () => {
  const st = { getItem: () => '213' };
  assert.equal(porovnatProProfil('111', { search: '?zp=111&porovnat=205', attr: '207', storage: st }), '205');
  assert.equal(porovnatProProfil('111', { search: '?zp=111', attr: '207', storage: st }), '207');
  assert.equal(porovnatProProfil('111', { search: '?zp=111', storage: st }), '213');
  assert.equal(porovnatProProfil('111', { search: '?zp=111&porovnat=111' }), null);
  assert.equal(porovnatProProfil('111', { search: '?zp=111' }), null);
  assert.equal(porovnatProProfil('111', { search: '?porovnat=999' }), null);
});

test('profilHtml(kod, data, porovnat): obal dlaždic data-prof-tiles, počet dlaždic stejný, řádek druhé ZP', () => {
  const bez = profilHtml('111', DATA);
  assert.equal(count(bez, /data-prof-tiles/g), 1);
  assert.doesNotMatch(bez, /zpv-tile-cmp/);
  const s = profilHtml('111', DATA, '205');
  assert.equal(count(s, /class="zpv-tile"/g), count(bez, /class="zpv-tile"/g));
  assert.equal(count(s, /class="zpv-tile-cmp" data-zp="205"/g), 9);
  assert.match(s, /data-prof-tiles data-porovnat="205"/);
  assert.match(s, /aria-label="Klíčová čísla: VZP ČR a ČPZP"/);
  assert.match(tilesHtml('111', DATA, '205'), /^<div data-prof-tiles/);
  assert.equal(tilesHtml('999', DATA, '205'), '');
});

test('profil: renderProfil poslouchá zp:porovnat-change a překreslí jen dlaždice', () => {
  const src = read('src/pojistovna.js');
  assert.match(src, /addEventListener\(POROVNAT_EVENT/);
  assert.match(src, /\[data-prof-tiles\]/);
});
