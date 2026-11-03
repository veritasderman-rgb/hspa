// Testy rutiny výročních zpráv zdravotních pojišťoven (srovnávač pojišťoven):
// parser odkazů na PDF, normalizace textu, tolerantní hledání čísel, fetcher s podvrženou sítí,
// extrakce textu, ověřovací skript, validátor, souhrn pro stránku a workflow.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseVzLinks, yearFromText, yearFromUrl, sliceSection, normalizeVzText, pdfTextToVz, jeBezTextu,
  buildNumberIndex, findValue, decimalsOf, platneCislice, kontextKolem,
} from '../ingest/lib/pojistovny-vz.js';
import { fetchPojistovnyVz, extractTexts, ocekavaneRoky, loadMapping, loadManifest, STAVY } from '../ingest/fetchers/pojistovny-vz.js';
import { verifyAll, buildUrlMap, resolveDoc } from '../scripts/pojistovny-verify.js';
import { validateAll, loadDatasets, ZP_CODES } from '../ingest/validate-pojistovny.js';
import { verifikaceSouhrnHtml } from '../src/pojistovny-verifikace.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'vz-page.html'), 'utf8');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pojistovny-vz-'));

// ---------------------------------------------------------------- parser odkazů
test('parseVzLinks: VZP vzor vyřadí přílohu a anglickou verzi, duplicitní URL sloučí', () => {
  const links = parseVzLinks(FIXTURE, 'https://www.vzp.cz/o-nas/dokumenty/vyrocni-zpravy', {
    vzory_odkazu: ['vzpstatic\\.cz/.*vyrocni[-_]zprava[-_](vzp[-_])?20\\d\\d\\.pdf$'],
  });
  assert.deepEqual(links.map((l) => [l.rok, l.url]), [
    [2024, 'https://media.vzpstatic.cz/media/Default/vyrocni-zpravy/vyrocni-zprava-2024.pdf'],
    [2023, 'https://media.vzpstatic.cz/media/Default/vyrocni-zpravy/vyrocni-zprava-2023.pdf'],
  ]);
  assert.equal(links[0].zdroj_roku, 'text');
});

test('parseVzLinks: jednoduché uvozovky, rok z textu odkazu má přednost před zavádějícím názvem souboru', () => {
  const links = parseVzLinks(FIXTURE, 'https://www.rbp213.cz/o-nas/pro-verejnost-a-media/vyrocni-zprava/a-380/', {
    vzory_odkazu: ['/systemfiles/file/[^/]+\\.pdf$'],
  });
  assert.equal(links.length, 2);
  assert.equal(links[0].rok, 2025);
  assert.equal(links[0].url, 'https://www.rbp213.cz/systemfiles/file/1780467908vz-2026-01-1-.pdf');
  assert.equal(links[1].rok, 2024);
});

test('parseVzLinks: sekce_od omezí hledání na „Výroční zprávy“, rok před odkazem se přečte z okolního textu', () => {
  const cfg = { vzory_odkazu: ['/cdn/file/[^/]+\\.pdf$'], sekce_od: '<h[1-6][^>]*>\\s*Výroční zprávy' };
  const links = parseVzLinks(FIXTURE, 'https://www.cpzp.cz/clanek/50-0-Ekonomicke-informace.html', cfg);
  assert.deepEqual(links.map((l) => l.rok), [2025, 2024, 2023]);
  assert.ok(links.every((l) => l.zdroj_roku === 'predchozi-text'));
  assert.equal(links[0].url, 'https://www.cpzp.cz/cdn/file/dZAT3vXGFhQ4bZcw9MdN1wgn0VHSYyfu.pdf');
  // bez sekce by se do výsledku dostal i plán 2026
  const bez = parseVzLinks(FIXTURE, 'https://www.cpzp.cz/clanek/50-0-Ekonomicke-informace.html', { vzory_odkazu: cfg.vzory_odkazu });
  assert.equal(bez.length, 4);
});

test('parseVzLinks: rok z názvu souboru, cesta s datem nahrání (2026-10) rok nezmate', () => {
  const links = parseVzLinks(FIXTURE, 'https://www.zpmvcr.cz/o-nas/dokumenty/vyrocni-zpravy', { vzory_odkazu: ['/VZ\\s*20\\d\\d[^/]*\\.pdf$'] });
  assert.deepEqual(links.map((l) => [l.rok, l.zdroj_roku]), [[2025, 'url'], [2024, 'url']]);
  assert.equal(links[0].url, 'https://www.zpmvcr.cz/system/files/dokumenty/2026-10/VZ%202025%20ZPMVCR_komplet.pdf');
});

test('parseVzLinks: <base href> určuje základ relativních odkazů a „za rok N“ v title má přednost před datem schválení', () => {
  const html = `<html><head><base href="https://www.ozp.cz/"></head><body>
    <a href="web/files-c/510/vz_ozp_2022.pdf" title="Výroční zpráva za rok 2022 schválena PS PČR usnesením č. 118 ze dne 6.12.2023 - 10MB ve formátu pdf"><img alt="" src="x.gif"></a>
  </body></html>`;
  const links = parseVzLinks(html, 'https://www.ozp.cz/tiskove-centrum/vyrocni-zpravy', {});
  assert.equal(links[0].url, 'https://www.ozp.cz/web/files-c/510/vz_ozp_2022.pdf');
  assert.equal(links[0].rok, 2022);
  assert.equal(links[0].zdroj_roku, 'title');
});

test('parseVzLinks: ne-PDF odkazy, mailto a kotvy se ignorují', () => {
  const links = parseVzLinks(FIXTURE, 'https://example.cz/', {});
  assert.ok(links.every((l) => /\.pdf$/i.test(l.url)));
  assert.ok(!links.some((l) => /docx|mailto/.test(l.url)));
});

test('yearFromText / yearFromUrl / sliceSection', () => {
  assert.equal(yearFromText('Výroční zpráva VZP ČR za rok 2024 (schváleno 6. 12. 2023)'), 2024);
  assert.equal(yearFromText('Výroční zpráva 2021'), 2021);
  assert.equal(yearFromText('Stáhnout soubor'), null);
  assert.equal(yearFromUrl('https://x.cz/system/files/dokumenty/2026-10/VZ%202025%20ZPMVCR_komplet.pdf'), 2025);
  assert.equal(yearFromUrl('https://x.cz/a/b/vyrocni-zprava-2013-en.pdf?x=2019'), 2013);
  assert.equal(yearFromUrl('https://x.cz/cdn/file/dBsRubRJnfQF.pdf'), null);
  assert.equal(sliceSection('<h3>A</h3>xx<h3>B</h3>yy', '<h3>B</h3>'), 'yy');
  assert.equal(sliceSection('<h3>A</h3>xx<h3>B</h3>yy', '<h3>A</h3>'), 'xx');
  assert.equal(sliceSection('nic', '<h3>Z'), '');
});

// ---------------------------------------------------------------- normalizace textu
test('normalizeVzText: nezlomitelné mezery → běžné, měkký spojovník pryč, řady mezer sbalené, prázdné řádky omezené', () => {
  assert.equal(normalizeVzText('1 234 567'), '1 234 567');
  assert.equal(normalizeVzText('ná­klady'), 'náklady');
  assert.equal(normalizeVzText('a      b\t\tc'), 'a  b  c');
  assert.equal(normalizeVzText('řádek   \nx\n\n\n\n\ny'), 'řádek\nx\n\ny');
  assert.equal(normalizeVzText('−6,4'), '-6,4');
  assert.equal(normalizeVzText(null), '');
});

test('pdfTextToVz: strany oddělené značkou „=== strana N ===“, poslední prázdná strana za \\f se nepočítá', () => {
  const { text, strany } = pdfTextToVz('první strana\fdruhá\f');
  assert.equal(strany, 2);
  assert.equal(text, '=== strana 1 ===\nprvní strana\n=== strana 2 ===\ndruhá\n');
});

test('jeBezTextu: sken (skoro žádné znaky na stranu) vs. běžný dokument', () => {
  const sken = pdfTextToVz('\f'.repeat(124)).text;
  assert.equal(jeBezTextu(sken, 124), true);
  const plny = pdfTextToVz(Array.from({ length: 10 }, () => 'x'.repeat(3000)).join('\f'));
  assert.equal(jeBezTextu(plny.text, plny.strany), false);
});

// ---------------------------------------------------------------- hledání čísel
const idx = (text) => buildNumberIndex(normalizeVzText(text));

test('findValue: český zápis s tisícovou mezerou a desetinnou čárkou, i tečka a bez mezer', () => {
  assert.equal(findValue(idx('Zůstatek 1 234,5 mil. Kč'), 1234.5).nalezeno, true);
  assert.equal(findValue(idx('Zůstatek 1234.5 mil. Kč'), 1234.5).nalezeno, true);
  assert.equal(findValue(idx('Zůstatek 1234,5 mil. Kč'), 1234.5).nalezeno, true);
  assert.equal(findValue(idx('Zůstatek 1 234 mil. Kč'), 1234).nalezeno, true);
  const miss = findValue(idx('Zůstatek 1 244,5 mil. Kč'), 1234.5);
  assert.equal(miss.nalezeno, false);
  assert.equal(miss.pocet, 0);
});

test('findValue: měřítko tis./mil./mld. (×1000, ÷1000, ×1e6) a zaokrouhlení podle zadané přesnosti', () => {
  // 2 079 mil. Kč v datech = 2 079 022 tis. Kč ve VZ
  const a = findValue(idx('Preventivní programy  1 600 000  2 079 022  129,9'), 2079);
  assert.equal(a.nalezeno, true);
  assert.equal(a.meritko, 1000);
  // 297,744 mld. = 297 744 mil.
  assert.equal(findValue(idx('Příjmy celkem 297 744 mil. Kč'), 297.744).meritko, 1000);
  // 6 173 200 pojištěnců = 6 173,2 tis. osob
  const c = findValue(idx('počet pojištěnců 6 173,2 tis. osob'), 6173200);
  assert.equal(c.nalezeno, true);
  assert.equal(c.meritko, 0.001);
  // 0,728816 mld. = 728 816 tis.
  assert.equal(findValue(idx('zůstatek 728 816 tis. Kč'), 0.728816).meritko, 1e6);
  // příliš odlišné číslo se nesmí „zaokrouhlit“ na shodu
  assert.equal(findValue(idx('Preventivní programy 2 079 022'), 2079.5).nalezeno, false);
  assert.equal(findValue(idx('Preventivní programy 2 079 022'), 2085).nalezeno, false);
});

test('findValue: znaménko se ignoruje; sloupce oddělené dvěma mezerami jsou dvě čísla, podřady „2 079“ z „2 079 022“ se nehledají', () => {
  assert.equal(findValue(idx('saldo (6 420) mil. Kč'), -6.42).nalezeno, true);
  assert.equal(findValue(idx('saldo −6,4 mld. Kč'), -6.4).nalezeno, true);
  assert.equal(findValue(idx('na pojištěnce 48 412    297 744 Kč'), 297744).nalezeno, true);
  assert.equal(findValue(idx('na pojištěnce 48 412    297 744 Kč'), 48412).nalezeno, true);
  // 2 079 mil. se nesmí „najít“ jako začátek čísla 2 079 022 v témže měřítku
  assert.equal(findValue(idx('programy 2 079 022'), 2079, { scales: [1] }).nalezeno, false);
  assert.equal(findValue(idx('programy 2 079 022'), 2079).meritko, 1000);
});

test('findValue: jistota podle počtu platných číslic, vrací pozici a počet shod', () => {
  const t = 'A 638 B 638 C 2 079 022 D';
  const i = idx(t);
  const malo = findValue(i, 638);
  assert.equal(malo.pocet, 2);
  assert.equal(malo.jistota, 'nizka');
  assert.equal(findValue(i, 2079022).jistota, 'vysoka');
  assert.equal(findValue(i, 2079).jistota, 'stredni');
  const f = findValue(i, 2079022);
  assert.equal(normalizeVzText(t).slice(f.pozice, f.pozice + f.delka), '2 079 022');
  assert.equal(decimalsOf(11.1213), 4);
  assert.equal(decimalsOf(2079), 0);
  assert.equal(platneCislice(1900000), 2);
  assert.equal(platneCislice(0.0150), 2);
});

test('kontextKolem: ±okolí kolem shody, bílé znaky a značky stran sloučeny', () => {
  const t = `${'x'.repeat(200)}\n=== strana 3 ===\nSaldo  2 079 022\ntis. Kč ${'y'.repeat(200)}`;
  const f = findValue(buildNumberIndex(t), 2079022);
  const k = kontextKolem(t, f.pozice, f.delka, 20);
  assert.ok(k.includes('2 079 022'));
  assert.ok(!k.includes('==='));
  assert.ok(!/\s{2,}/.test(k));
  assert.ok(k.length <= 9 + 2 * 20 + 2);
});

// ---------------------------------------------------------------- mapování a očekávané roky
test('mapování: 7 ZP se správnými kódy, platné regexy, https odkazy', () => {
  const m = loadMapping();
  assert.deepEqual(m.pojistovny.map((z) => z.kod).sort(), [...ZP_CODES].sort());
  for (const z of m.pojistovny) {
    const stranky = Array.isArray(z.stranka_vz) ? z.stranka_vz : [z.stranka_vz];
    assert.ok(stranky.length && stranky.every((s) => /^https:\/\//.test(s)), `${z.kod}: stranka_vz`);
    assert.ok(z.vzory_odkazu?.length, `${z.kod}: vzory_odkazu`);
    for (const v of z.vzory_odkazu) new RegExp(v, 'i');
    if (z.sekce_od) new RegExp(z.sekce_od, 'i');
    for (const u of Object.values(z.rucni_pdf ?? {})) assert.match(u, /^https:\/\/.+\.pdf$/);
  }
});

test('ocekavaneRoky: okno roky_od … loňský rok + roky_navic, seřazeno', () => {
  const now = new Date('2026-11-02T00:00:00Z');
  assert.deepEqual(ocekavaneRoky({ _roky_od: 2023 }, { now }), [2023, 2024, 2025]);
  assert.deepEqual(ocekavaneRoky({ _roky_od: 2024, roky_navic: [2020] }, { now }), [2020, 2024, 2025]);
});

// ---------------------------------------------------------------- fetcher s podvrženou sítí
const PDF_BYTES = Buffer.from('%PDF-1.4\nfake\n%%EOF\n');
function fakeFetch(routes, calls = []) {
  return async (url) => {
    calls.push(url);
    const r = routes[url];
    if (r == null) return new Response('nenalezeno', { status: 404 });
    const { status = 200, body, type = 'text/html' } = r;
    return new Response(body, { status, headers: { 'content-type': type } });
  };
}

test('fetchPojistovnyVz: stáhne PDF, zapíše manifest (sha256, velikost, stav), nenalezený rok = nenalezeno, 403 stránky = chyba', async () => {
  const dir = tmp();
  const mapping = {
    roky_od: 2024,
    pojistovny: [
      { kod: '111', zkratka: 'VZP', stranka_vz: 'https://vzp.test/vz', vzory_odkazu: ['vyrocni-zprava-20\\d\\d\\.pdf$'], rucni_pdf: {} },
      { kod: '201', zkratka: 'VoZP', stranka_vz: 'https://vozp.test/vz', vzory_odkazu: ['\\.pdf$'], rucni_pdf: {} },
      { kod: '205', zkratka: 'ČPZP', stranka_vz: 'https://cpzp.test/vz', vzory_odkazu: ['\\.pdf$'], rucni_pdf: { 2025: 'https://cpzp.test/rucni-2025.pdf' } },
    ],
  };
  const calls = [];
  const routes = {
    'https://vzp.test/vz': { body: '<a href="/files/vyrocni-zprava-2024.pdf">Výroční zpráva za rok 2024</a>' },
    'https://vzp.test/files/vyrocni-zprava-2024.pdf': { body: PDF_BYTES, type: 'application/pdf' },
    'https://vozp.test/vz': { status: 403, body: 'Forbidden' },
    'https://cpzp.test/vz': { body: '<a href="/x/a.pdf">Výroční zpráva 2024</a>' },
    'https://cpzp.test/x/a.pdf': { body: '<html>přihlaste se</html>', type: 'text/html' },
    'https://cpzp.test/rucni-2025.pdf': { body: PDF_BYTES, type: 'application/pdf' },
  };
  const manifestFile = path.join(dir, 'manifest.json');
  const cacheRoot = path.join(dir, 'cache');
  const common = { mapping, manifestFile, cacheRoot, now: new Date('2026-11-02T10:00:00Z'), pauseMs: 0, sleepImpl: async () => {}, log: () => {} };
  const m = await fetchPojistovnyVz({ ...common, fetchImpl: fakeFetch(routes, calls) });

  const by = (kod, rok) => m.polozky.find((p) => p.kod === kod && p.rok === rok);
  const vzp24 = by('111', 2024);
  assert.equal(vzp24.stav, 'ok');
  assert.equal(vzp24.url, 'https://vzp.test/files/vyrocni-zprava-2024.pdf');
  assert.match(vzp24.sha256, /^[0-9a-f]{64}$/);
  assert.equal(vzp24.velikost, PDF_BYTES.length);
  assert.ok(Date.parse(vzp24.stazeno_at));
  assert.ok(fs.existsSync(path.join(cacheRoot, '111-2024.pdf')));
  assert.equal(by('111', 2025).stav, 'nenalezeno');
  assert.match(by('111', 2025).poznamka, /zatím není/);
  assert.equal(by('201', 2024).stav, 'chyba');
  assert.equal(by('201', 2024).http_status, 403);
  assert.match(by('201', 2024).poznamka, /HTTP 403/);
  assert.equal(by('205', 2024).stav, 'chyba'); // HTML místo PDF
  assert.match(by('205', 2024).poznamka, /není PDF/);
  assert.equal(by('205', 2025).stav, 'ok');
  assert.match(by('205', 2025).poznamka, /rucni_pdf/);
  for (const p of m.polozky) assert.ok(STAVY.includes(p.stav));
  // uloženo na disk a znovu načitatelné
  assert.deepEqual(loadManifest(manifestFile).polozky.length, m.polozky.length);

  // druhý běh: PDF z cache se znovu nestahuje, stazeno_at zůstává
  const calls2 = [];
  const m2 = await fetchPojistovnyVz({ ...common, fetchImpl: fakeFetch(routes, calls2) });
  assert.ok(!calls2.includes('https://vzp.test/files/vyrocni-zprava-2024.pdf'));
  assert.equal(m2.polozky.find((p) => p.kod === '111' && p.rok === 2024).stazeno_at, vzp24.stazeno_at);
  assert.match(m2.polozky.find((p) => p.kod === '111' && p.rok === 2024).poznamka, /z cache/);
  // --force stáhne znovu
  const calls3 = [];
  await fetchPojistovnyVz({ ...common, force: true, fetchImpl: fakeFetch(routes, calls3) });
  assert.ok(calls3.includes('https://vzp.test/files/vyrocni-zprava-2024.pdf'));
  // filtr --kod nechá ostatní položky beze změny
  const m4 = await fetchPojistovnyVz({ ...common, kody: ['111'], fetchImpl: fakeFetch(routes, []) });
  assert.equal(m4.polozky.length, m.polozky.length);
});

test('fetchPojistovnyVz: nejvýš 1 požadavek za sekundu (pauza mezi požadavky) a User-Agent z konfigurace', async () => {
  const dir = tmp();
  const mapping = { roky_od: 2025, pojistovny: [{ kod: '111', zkratka: 'VZP', stranka_vz: 'https://vzp.test/vz', vzory_odkazu: ['\\.pdf$'], rucni_pdf: {} }] };
  const pauzy = [];
  const headers = [];
  const fetchImpl = async (url, init) => {
    headers.push(init.headers['User-Agent']);
    if (url === 'https://vzp.test/vz') return new Response('<a href="/a.pdf">VZ 2025</a>');
    return new Response(PDF_BYTES);
  };
  await fetchPojistovnyVz({
    mapping, fetchImpl, manifestFile: path.join(dir, 'm.json'), cacheRoot: path.join(dir, 'c'), now: new Date('2026-11-02T00:00:00Z'),
    pauseMs: 1000, sleepImpl: async (ms) => { pauzy.push(ms); }, log: () => {},
  });
  assert.ok(pauzy.length >= 1 && pauzy.every((ms) => ms > 0 && ms <= 1000));
  assert.ok(headers.length === 2 && headers.every((h) => /^ZdraveCesko-HSPA\/1\.0/.test(h)));
});

// ---------------------------------------------------------------- extrakce textu
test('extractTexts: normalizovaný text do vz-text, sken bez textové vrstvy → stav bez-textu, chyba extrakce → chyba', () => {
  const dir = tmp();
  const cacheRoot = path.join(dir, 'cache');
  const textDir = path.join(dir, 'text');
  fs.mkdirSync(cacheRoot, { recursive: true });
  for (const n of ['111-2024', '213-2024', '205-2024']) fs.writeFileSync(path.join(cacheRoot, `${n}.pdf`), PDF_BYTES);
  const manifestFile = path.join(dir, 'm.json');
  const pol = (kod) => ({ kod, rok: 2024, url: `https://x/${kod}.pdf`, sha256: 'a'.repeat(64), velikost: 10, stazeno_at: '2026-11-02T00:00:00.000Z', stav: 'ok', poznamka: '' });
  fs.writeFileSync(manifestFile, JSON.stringify({ version: '1.0', polozky: [pol('111'), pol('205'), pol('213'), pol('209')] }));
  const plny = Array.from({ length: 3 }, (_, i) => `Příjmy${i}  1 234,5 mil.   Kč ${'text '.repeat(150)}`).join('\f');
  const extract = (f) => {
    if (f.includes('213-')) return '\f'.repeat(50);
    if (f.includes('205-')) throw new Error('Syntax Error: Couldn\'t read xref table');
    return plny;
  };
  const { manifest, hotovo } = extractTexts({ manifestFile, cacheRoot, textDir, extract, log: () => {} });
  assert.equal(hotovo, 1);
  const by = (kod) => manifest.polozky.find((p) => p.kod === kod);
  assert.equal(by('111').stav, 'ok');
  assert.equal(by('111').strany, 3);
  const txt = fs.readFileSync(path.join(textDir, '111-2024.txt'), 'utf8');
  assert.match(txt, /=== strana 1 ===/);
  assert.match(txt, /=== strana 3 ===/);
  assert.match(txt, /1 234,5 mil\./);
  assert.ok(!txt.includes(' '));
  assert.equal(by('213').stav, 'bez-textu');
  assert.match(by('213').poznamka, /sken bez textové vrstvy/);
  assert.ok(!fs.existsSync(path.join(textDir, '213-2024.txt')));
  assert.equal(by('205').stav, 'chyba');
  assert.match(by('205').poznamka, /extrakce textu selhala/);
  assert.equal(by('209').stav, 'ok'); // bez PDF v cache se položka nemění
});

// ---------------------------------------------------------------- ověřovací skript
const POJ = (rows) => ({ pojistovny: [{ kod: '111', zkratka: 'VZP', hospodareni: rows, hospodareni_2025: null }] });
const URL_VZP24 = 'https://media.vzpstatic.cz/vz-2024.pdf';
const URL_MAP = buildUrlMap({ zdrojeHlavni: { vz_vzp_2024: URL_VZP24 }, manifest: { polozky: [{ kod: '213', rok: 2024, url: 'https://rbp/2024.pdf' }, { kod: '213', rok: 2025, url: 'https://rbp/2025.pdf' }] } });

test('resolveDoc: URL známé VZ, MZ hodnocení, vypočteno, volný text „VZ 2024“', () => {
  assert.deepEqual(resolveDoc(URL_VZP24, '111', 2024, URL_MAP), { doc: { kod: '111', rok: 2024 }, duvod: null });
  assert.match(resolveDoc('https://mzd.gov.cz/wp-content/uploads/2024/06/vz2024_hodnoceni.pdf', '111', 2024, URL_MAP).duvod, /MZ/);
  assert.match(resolveDoc('https://www.psp.cz/sqw/historie.sqw?o=10&t=280', '111', 2024, URL_MAP).duvod, /sněmovní tisk/);
  assert.match(resolveDoc('vypočteno z MZ hodnocení 2024', '111', 2024, URL_MAP).duvod, /odvozená/);
  assert.match(resolveDoc('výpočet: naklady × faktor', '111', 2024, URL_MAP).duvod, /odvozená/);
  assert.deepEqual(resolveDoc('VZ VZP 2023 Příloha 13', '111', 2024, URL_MAP).doc, { kod: '111', rok: 2023 });
  assert.equal(resolveDoc(null, '111', 2024, URL_MAP).doc, null);
  assert.equal(resolveDoc('https://neznamy.cz/x.pdf', '111', 2024, URL_MAP).doc, null);
});

test('verifyAll: nalezeno / nenalezeno / bez-textu / mimo-rozsah, kontext a měřítko', () => {
  const texty = { '111-2024': normalizeVzText('=== strana 1 ===\nČerpání ZFZP 11 121,3 mil. Kč a zůstatek\nPreventivní programy 1 600 000 2 079 022 129,9\n') };
  const pojistovny = POJ({
    zustatek: { hodnota: 11.1213, rok: 2024, zdroj: URL_VZP24 },
    prevence: { hodnota: 2079, rok: 2024, zdroj: URL_VZP24 },
    chybne: { hodnota: 12.9, rok: 2024, zdroj: URL_VZP24 },
    z_mz: { hodnota: 297.744, rok: 2024, zdroj: 'https://mzd.gov.cz/wp-content/uploads/2024/06/vz2024_hodnoceni.pdf' },
    vypocet: { hodnota: 56.71, rok: 2024, zdroj: 'vypočteno z MZ hodnocení 2024' },
    jina_vz: { hodnota: 100.5, rok: 2024, zdroj: 'https://rbp/2024.pdf' },
    prazdna: { hodnota: null, rok: 2024, zdroj: null },
  });
  const v = verifyAll({ pojistovny, urlMap: URL_MAP, loadText: (k, r) => texty[`${k}-${r}`] ?? null, now: new Date('2026-11-02T10:00:00Z') });
  const by = (c) => v.polozky.find((p) => p.cesta.endsWith(`.${c}`));
  assert.equal(by('zustatek').nalezeno, true);
  assert.equal(by('zustatek').meritko, 1000);
  assert.match(by('zustatek').kontext, /11 121,3 mil\./);
  assert.equal(by('prevence').nalezeno, true);
  assert.equal(by('chybne').nalezeno, false);
  assert.equal(by('chybne').kontext, null);
  assert.equal(by('z_mz').nalezeno, 'mimo-rozsah');
  assert.equal(by('vypocet').nalezeno, 'mimo-rozsah');
  assert.equal(by('jina_vz').nalezeno, 'bez-textu');
  assert.equal(by('prazdna'), undefined, 'null hodnota se neověřuje');
  assert.deepEqual({ ...v.souhrn, jistota: undefined }, { celkem: 4, nalezeno: 2, nenalezeno: 1, bez_textu: 1, mimo_rozsah: 2, jistota: undefined });
  assert.equal(v.generated_at, '2026-11-02T10:00:00Z');
  assert.equal(v.per_zp['111'].nalezeno, 2);
});

test('verifyAll: VZ bez textu se zkusí v srovnávacím sloupci následující VZ téže ZP; řádek tabulky potvrdí jistotu', () => {
  const pojistovny = { pojistovny: [{ kod: '213', zkratka: 'RBP', hospodareni: {}, hospodareni_2025: null }] };
  const prevence = { pojistovny: [{ kod: '213', fond_prevence_struktura: { rok: 2024, jednotka: 'tis. Kč', polozky: [
    { nazev: 'Programy', zpp: 130000, skutecnost: 117263, predchozi_rok: 103152 },
    { nazev: 'Drobnost', zpp: 11, skutecnost: 7, predchozi_rok: null },
  ], celkem: { zpp: 130000, skutecnost: 117263, predchozi_rok: 103152 } } }] };
  const text2025 = normalizeVzText('=== strana 5 ===\nPreventivní programy  140 000  144 438  103,2  117 263  123,2\nrůzné 11 a 7 jinde\n');
  const v = verifyAll({ pojistovny, prevence, urlMap: URL_MAP, manifest: { polozky: [{ kod: '213', rok: 2024, stav: 'bez-textu' }, { kod: '213', rok: 2025, stav: 'ok' }] },
    loadText: (k, r) => (k === '213' && r === 2025 ? text2025 : null) });
  const sk = v.polozky.find((p) => p.cesta.endsWith('polozky[0].skutecnost'));
  assert.equal(sk.nalezeno, true);
  assert.equal(sk.pres_nasledujici_vz, true);
  assert.equal(sk.dokument, '213-2025');
  assert.match(sk.poznamka, /srovnávacím sloupci/);
  const zpp = v.polozky.find((p) => p.cesta.endsWith('polozky[0].zpp'));
  assert.equal(zpp.nalezeno, 'bez-textu'); // plán 130 000 v následující VZ není
  assert.match(zpp.duvod, /bez-textu/);
  assert.equal(v.polozky.find((p) => p.cesta.endsWith('polozky[0].predchozi_rok')).nalezeno, 'bez-textu');
  assert.ok(v.polozky.every((p) => !('_d' in p) && !('_r' in p) && !('_radek' in p)), 'interní pole se neexportují');

  // řádek tabulky: dvě čísla vedle sebe → vysoká jistota
  const text = normalizeVzText('=== strana 9 ===\nPreventivní programy  600 000  787 767  131,3  259 943  303,1\n' + 'x '.repeat(500) + '\n787 767 jinde\n');
  const prev2 = { pojistovny: [{ kod: '111', fond_prevence_struktura: { rok: 2024, polozky: [{ nazev: 'KV', zpp: 600000, skutecnost: 787767, predchozi_rok: 259943 }], celkem: {} } }] };
  const v2 = verifyAll({ pojistovny: POJ({}), prevence: prev2, urlMap: URL_MAP, loadText: (k, r) => (k === '111' && r === 2024 ? text : null) });
  assert.ok(v2.polozky.length === 3 && v2.polozky.every((p) => p.nalezeno === true && p.shoda_radku === true && p.jistota === 'vysoka'));
});

// ---------------------------------------------------------------- commitnuté výstupy rutiny
test('manifest vz-manifest.json: tvar položek, stavy, sha256 a existující text u stavu ok', () => {
  const m = readJson('ingest/manual/pojistovny/vz-manifest.json');
  assert.equal(m.version, '1.0');
  assert.ok(Date.parse(m.generated_at));
  assert.ok(Array.isArray(m.polozky) && m.polozky.length >= 7);
  const kody = new Set();
  for (const p of m.polozky) {
    kody.add(p.kod);
    assert.ok(ZP_CODES.includes(p.kod), `kód ${p.kod}`);
    assert.ok(Number.isInteger(p.rok) && p.rok >= 2000);
    assert.ok(STAVY.includes(p.stav), `${p.kod}-${p.rok}: stav ${p.stav}`);
    assert.equal(typeof p.poznamka, 'string');
    if (p.stav === 'ok' || p.stav === 'bez-textu') {
      assert.match(p.url, /^https:\/\//);
      assert.match(p.sha256, /^[0-9a-f]{64}$/);
      assert.ok(p.velikost > 1000);
      assert.ok(Date.parse(p.stazeno_at));
    }
    if (p.stav === 'ok') {
      const f = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text', `${p.kod}-${p.rok}.txt`);
      assert.ok(fs.existsSync(f), `chybí text ${p.kod}-${p.rok}`);
      assert.ok(fs.statSync(f).size > 20_000, `${p.kod}-${p.rok}: podezřele malý text`);
    }
    if (p.stav === 'bez-textu') assert.ok(!fs.existsSync(path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text', `${p.kod}-${p.rok}.txt`)));
  }
  assert.deepEqual([...kody].sort(), [...ZP_CODES].sort());
});

test('vz-text/*.txt: každý text má značky stran a nemá nezlomitelné mezery', () => {
  const dir = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'));
  assert.ok(files.length >= 7);
  for (const f of files) {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(f, /^\d{3}-\d{4}\.txt$/);
    assert.match(t, /=== strana 1 ===/);
    assert.ok(!t.includes(' '), `${f}: nezlomitelná mezera`);
    assert.ok(!t.includes('\f'), `${f}: nenormalizovaný konec strany`);
  }
});

test('pojistovny-verifikace.json: tvar, souhrn odpovídá položkám, validátor bez chyb', () => {
  const v = readJson('data/pojistovny-verifikace.json');
  assert.equal(v.version, '1.0');
  assert.match(v.generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(Array.isArray(v.polozky) && v.polozky.length > 100);
  const n = (pred) => v.polozky.filter(pred).length;
  assert.equal(v.souhrn.nalezeno, n((p) => p.nalezeno === true));
  assert.equal(v.souhrn.nenalezeno, n((p) => p.nalezeno === false));
  assert.equal(v.souhrn.bez_textu, n((p) => p.nalezeno === 'bez-textu'));
  assert.equal(v.souhrn.mimo_rozsah, n((p) => p.nalezeno === 'mimo-rozsah'));
  assert.equal(v.souhrn.celkem, v.souhrn.nalezeno + v.souhrn.nenalezeno + v.souhrn.bez_textu);
  assert.deepEqual(Object.keys(v.per_zp).sort(), [...ZP_CODES].sort());
  for (const p of v.polozky) {
    assert.ok(p.cesta && typeof p.hodnota === 'number' && ZP_CODES.includes(p.kod));
    assert.ok([true, false, 'bez-textu', 'mimo-rozsah'].includes(p.nalezeno));
    if (p.nalezeno === true) {
      assert.ok(p.kontext.length > 0 && p.kontext.length <= 400, `${p.cesta}: kontext`);
      assert.ok(p.pocet_shod >= 1);
    }
  }
  const { errors } = validateAll(loadDatasets());
  assert.deepEqual(errors, []);
});

test('validateAll: nenalezené číslo je WARN s cestou, nesouhlasící souhrn je chyba', () => {
  const base = loadDatasets();
  const v = {
    version: '1.0', generated_at: '2026-11-02T10:00:00Z',
    souhrn: { celkem: 2, nalezeno: 1, nenalezeno: 1, bez_textu: 0, mimo_rozsah: 0 },
    per_zp: { 111: { zkratka: 'VZP' } },
    polozky: [
      { cesta: 'pojistovny[111].hospodareni.x', hodnota: 1, kod: '111', nalezeno: true, kontext: 'x 1 y' },
      { cesta: 'pojistovny[111].hospodareni.y', hodnota: 2, kod: '111', nalezeno: false, dokument: '111-2024' },
    ],
  };
  const r = validateAll({ ...base, verifikace: v });
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /pojistovny\[111\]\.hospodareni\.y/.test(w)));
  const bad = validateAll({ ...base, verifikace: { ...v, souhrn: { ...v.souhrn, nalezeno: 5 } } });
  assert.ok(bad.errors.some((e) => /souhrn\.nalezeno/.test(e)));
  const bad2 = validateAll({ ...base, verifikace: { ...v, polozky: [{ ...v.polozky[0], nalezeno: 'možná' }] } });
  assert.ok(bad2.errors.some((e) => /nalezeno: musí být/.test(e)));
});

// ---------------------------------------------------------------- souhrn pro stránku
test('verifikaceSouhrnHtml: tabulka ZP, <details> s nenalezenými, odkaz na manifest, escapování; bez dat záložní hláška', () => {
  assert.match(verifikaceSouhrnHtml(null), /zatím neproběhlo/);
  const v = {
    generated_at: '2026-11-02T10:00:00Z',
    souhrn: { celkem: 3, nalezeno: 1, nenalezeno: 1, bez_textu: 1, mimo_rozsah: 4 },
    per_zp: { 111: { zkratka: 'VZP <b>', nalezeno: 1, nenalezeno: 1, bez_textu: 0, mimo_rozsah: 2 }, 213: { zkratka: 'RBP', nalezeno: 0, nenalezeno: 0, bez_textu: 1, mimo_rozsah: 2 } },
    polozky: [
      { kod: '111', cesta: 'pojistovny[111].hospodareni.<x>', hodnota: 1426.8, nalezeno: false, dokument: '111-2024' },
      { kod: '213', cesta: 'a', hodnota: 1, nalezeno: 'bez-textu' },
    ],
  };
  const html = verifikaceSouhrnHtml(v);
  assert.match(html, /<table>/);
  assert.match(html, /<details class="zpc-acc"><summary>Nenalezená čísla \(1\)/);
  assert.match(html, /vz-manifest\.json/);
  assert.match(html, /2\. 11\. 2026/);
  assert.ok(!html.includes('VZP <b>') && html.includes('VZP &lt;b&gt;'), 'název ZP musí být escapovaný');
  assert.ok(!html.includes('<x>'));
  assert.match(html, /1\s426,8/);
  assert.match(html, /Bez ověření zůstalo 1 čísel/);
  const bez = verifikaceSouhrnHtml({ ...v, polozky: [] });
  assert.match(bez, /Všechna ověřitelná čísla se v textu výročních zpráv našla/);
});

// ---------------------------------------------------------------- workflow
test('workflow pojistovny-vz.yml: ruční spuštění, roční cron 15. 6. 03:00 UTC, kroky rutiny a PR přes create-pull-request', () => {
  const yml = fs.readFileSync(path.join(ROOT, '..', '.github', 'workflows', 'pojistovny-vz.yml'), 'utf8');
  assert.match(yml, /workflow_dispatch:/);
  assert.match(yml, /cron:\s*'0 3 15 6 \*'/);
  assert.match(yml, /poppler-utils/);
  assert.match(yml, /node ingest\/fetchers\/pojistovny-vz\.js/);
  assert.match(yml, /node scripts\/pojistovny-verify\.js/);
  assert.match(yml, /node ingest\/validate-pojistovny\.js/);
  assert.match(yml, /peter-evans\/create-pull-request@v\d+/);
  assert.match(yml, /branch: chore\/pojistovny-vz-\$\{\{ steps\.rok\.outputs\.rok \}\}/);
  assert.match(yml, /ai-provoz\.js check/, 'kill switch');
  assert.match(yml, /pull-requests: write/);
  // záložní cesta: když repozitář nedovolí PR z GITHUB_TOKENu, job neshodí a otevře issue s odkazem na PR
  assert.match(yml, /issues: write/);
  assert.match(yml, /id: pr\s*\n(?:.*\n){0,4}\s*continue-on-error: true/, 'krok PR má id a continue-on-error');
  assert.match(yml, /if: steps\.pr\.outcome == 'failure'/);
  assert.match(yml, /actions\/github-script@v\d+/);
  assert.match(yml, /compare\/main\.\.\./, 'issue nese odkaz Compare & pull request');
  assert.match(yml, /labels: \[label\]/);
  assert.match(yml, /core\.setFailed\(/, 'bez pushnuté větve po selhání PR job selže, ne tiše uspěje');
  assert.match(yml, /_Generated by \[Claude Code\]/, 'patička komentářů');
  assert.ok(!/ignore-ssl|NODE_TLS_REJECT_UNAUTHORIZED|--insecure/.test(yml), 'TLS se nevypíná');
});

test('PDF z cache se necommitují (gitignore) a skripty se do package.json nepřidávají', () => {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.match(gi, /^ingest\/cache\/\*/m);
  const pkg = readJson('package.json');
  assert.ok(!Object.values(pkg.scripts).some((s) => /pojistovny-vz|pojistovny-verify/.test(s)), 'třída C: skripty do package.json nepatří');
});
