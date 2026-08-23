// Testy archivu Věstníků MZ: čisté funkce fetcheru (parsování čísla/roku,
// obsahu z HTML i PDF, kategorizace, PDF odkaz) + frontend filtr + drift
// kontrola commitnutého data/vestniky.json proti schématu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCisloRok, parseObsahHtml, parseObsahPdf, kategorie, extractPdfUrl, buildCastka, mergePrev }
  from '../ingest/fetchers/vestniky.js';
import { filterCastky, fmtDatum, normText, KAT_LABELS } from '../src/vestniky.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('vestniky: parseCisloRok zvládá oba formáty titulu i slug fallback', () => {
  assert.deepEqual(parseCisloRok('Věstník č. 10/2026'), { cislo: 10, rok: 2026 });
  assert.deepEqual(parseCisloRok('Věstník 1/2008'), { cislo: 1, rok: 2008 });
  assert.deepEqual(parseCisloRok('bez čísla', 'vestnik-3-1999-2'), { cislo: 3, rok: 1999 });
  assert.deepEqual(parseCisloRok('nic', 'nic'), { cislo: null, rok: null });
});

test('vestniky: parseObsahHtml čte číslované položky a slepuje zalomené řádky', () => {
  const html = '<div><strong>Obsah Věstníku č. 10/2026</strong></div>'
    + '<div>1. Seznam esenciálních antiinfektiv<br />2. Metodický pokyn MZD k organizaci péče<br />'
    + 'a k nastavení spádové zodpovědnosti</div>';
  const items = parseObsahHtml(html);
  assert.equal(items.length, 2);
  assert.equal(items[0], 'Seznam esenciálních antiinfektiv');
  assert.match(items[1], /^Metodický pokyn MZD k organizaci péče a k nastavení/);
  assert.deepEqual(parseObsahHtml(''), []);
  assert.deepEqual(parseObsahHtml(null), []);
});

test('vestniky: parseObsahPdf najde sekci OBSAH a uřízne patičku', () => {
  const lines = ['ROČNÍK 2008', 'OBSAH', '1. Metodické opatření ....... 2',
    '2. Cenový předpis MZ', 'kterým se mění úhrady', 'ZN.: 1234/2008', '3. Tohle už nepatří'];
  const items = parseObsahPdf(lines);
  assert.equal(items.length, 2);
  assert.equal(items[0], 'Metodické opatření');
  assert.equal(items[1], 'Cenový předpis MZ kterým se mění úhrady');
  assert.deepEqual(parseObsahPdf(['žádný obsah tu není']), []);
});

test('vestniky: kategorie deterministicky a s fallbackem ostatni', () => {
  assert.equal(kategorie('Program mamografického screeningu'), 'screening');
  assert.equal(kategorie('Doporučený postup pro očkování proti pertusi'), 'ockovani');
  assert.equal(kategorie('Cenový předpis 1/2026/OLZP o regulaci cen'), 'cenove');
  assert.equal(kategorie('Seznam esenciálních antiinfektiv (SEAI)'), 'leciva');
  assert.equal(kategorie('Statut a jednací řád komise'), 'spravni');
  assert.equal(kategorie('Úplně jiné téma'), 'ostatni');
  assert.ok(Object.keys(KAT_LABELS).includes(kategorie('cokoliv')), 'fallback má label');
});

test('vestniky: extractPdfUrl vytáhne první PDF odkaz', () => {
  assert.equal(extractPdfUrl('<a href="https://x.cz/a.pdf">PDF</a>'), 'https://x.cz/a.pdf');
  assert.equal(extractPdfUrl('<a href="/f.pdf?v=1&amp;x=2">x</a>'), '/f.pdf?v=1&x=2');
  assert.equal(extractPdfUrl('<a href="/stranka.html">nic</a>'), null);
});

test('vestniky: buildCastka skládá záznam s kategorizovaným obsahem', () => {
  const c = buildCastka(
    { id: 1, title: { rendered: 'Věstník č. 2/2020' }, slug: 'vestnik-2-2020',
      date: '2020-03-01T10:00:00', link: 'https://mzd.gov.cz/vestnik/vestnik-2-2020/' },
    ['Cenový předpis o regulaci cen', 'Jiné sdělení'], 'https://x.cz/v.pdf');
  assert.equal(c.cislo, 2); assert.equal(c.rok, 2020); assert.equal(c.datum, '2020-03-01');
  assert.equal(c.obsah.length, 2);
  assert.deepEqual(c.obsah[0], { t: 'Cenový předpis o regulaci cen', kat: 'cenove' });
});

test('vestniky: filterCastky hledá v obsahu, zužuje položky a filtruje rok/kategorii', () => {
  const castky = [
    { rok: 2026, titul: 'Věstník č. 1/2026', obsah: [
      { t: 'Program screeningu karcinomu plic', kat: 'screening' },
      { t: 'Cenový předpis', kat: 'cenove' }] },
    { rok: 2020, titul: 'Věstník č. 2/2020', obsah: [{ t: 'Standard péče', kat: 'standardy' }] },
  ];
  assert.equal(filterCastky(castky, {}).length, 2);
  const q = filterCastky(castky, { q: 'screening' });
  assert.equal(q.length, 1);
  assert.equal(q[0].obsah.length, 1, 'při hledání se ukážou jen odpovídající položky');
  assert.equal(filterCastky(castky, { rok: '2020' }).length, 1);
  const k = filterCastky(castky, { kat: 'cenove' });
  assert.equal(k.length, 1);
  assert.deepEqual(k[0].obsah.map(o => o.kat), ['cenove']);
  assert.equal(filterCastky(castky, { q: 'plic', rok: '2020' }).length, 0);
  assert.equal(normText('Věstník Č. 1'), 'vestnik c. 1');
});

test('vestniky: fmtDatum formátuje česky, nevalidní vrací beze změny', () => {
  assert.equal(fmtDatum('2026-08-20'), '20. srpna 2026');
  assert.equal(fmtDatum('divné'), 'divné');
});

test('vestniky: data/vestniky.json odpovídá schématu a je vnitřně konzistentní', () => {
  const p = path.join(ROOT, 'data', 'vestniky.json');
  assert.ok(fs.existsSync(p), 'data/vestniky.json chybí — spusť npm run fetch:vestniky');
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.ok(Array.isArray(d.castky) && d.castky.length >= 300, 'archiv má mít stovky částek');
  assert.equal(d.pocty.castky, d.castky.length);
  assert.equal(d.pocty.polozky, d.castky.reduce((n, c) => n + c.obsah.length, 0));
  for (const c of d.castky) {
    assert.ok(c.titul && c.url, `částka ${c.id}: chybí titul/url`);
    assert.ok(c.rok === null || (c.rok >= 1998 && c.rok <= 2100), `částka ${c.id}: rok ${c.rok}`);
    for (const o of c.obsah) {
      assert.ok(o.t && typeof o.t === 'string', `částka ${c.id}: prázdná položka obsahu`);
      assert.ok(Object.keys(KAT_LABELS).includes(o.kat), `částka ${c.id}: neznámá kategorie ${o.kat}`);
    }
  }
  // řazení: nejnovější první
  const prvni = d.castky[0], posledni = d.castky.at(-1);
  assert.ok((prvni.rok ?? 0) >= (posledni.rok ?? 0), 'částky mají být od nejnovějších');
});

test('vestniky: stránka existuje, načítá modul a je v sitemap i navigaci', () => {
  const html = fs.readFileSync(path.join(ROOT, 'vestniky-mz.html'), 'utf8');
  assert.ok(html.includes('src/vestniky.js'), 'stránka nenačítá src/vestniky.js');
  assert.match(html, /name="robots" content="index, follow"/);
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('skorezdravotnictvi.cz/vestniky-mz'), 'chybí v sitemap.xml');
  const shared = fs.readFileSync(path.join(ROOT, 'src', 'page-shared.js'), 'utf8');
  assert.ok(shared.includes('vestniky-mz.html'), 'chybí v module nav');
});

test('vestniky: mergePrev doplní prázdný čerstvý běh z předchozího výstupu', () => {
  const prevRec = { obsah: [{ t: 'Cenový předpis o regulaci cen', kat: 'cenove' }], pdf: 'https://x.cz/v.pdf' };
  const prazdna = { obsah: [], pdf: null };
  const m = mergePrev(prazdna, prevRec);
  assert.equal(m.obsah.length, 1, 'obsah převzat z minula');
  assert.equal(m.obsah[0].kat, 'cenove', 'kategorie se přepočítá deterministicky');
  assert.equal(m.pdf, 'https://x.cz/v.pdf');
  const plna = { obsah: [{ t: 'Nový obsah', kat: 'ostatni' }], pdf: 'https://y.cz/n.pdf' };
  assert.deepEqual(mergePrev(plna, prevRec), plna, 'čerstvá data mají přednost');
  assert.deepEqual(mergePrev(prazdna, undefined), prazdna, 'bez předchozího záznamu beze změny');
});
