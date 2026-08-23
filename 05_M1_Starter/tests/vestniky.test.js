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

/* ── prolinkování (mapping → badge, vazby, karta skupiny) ───────────── */

import { anotujSkupiny } from '../ingest/fetchers/vestniky.js';
import { buildVazby } from '../ingest/build-vestniky-vazby.js';
import { mergeVestnik } from '../ingest/ppo/build-web.js';
import { zkratNazev } from '../src/vestniky.js';

const MAPPING = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'ingest', 'mapping', 'vestniky_souvislosti.json'), 'utf8'));

test('vestniky vazby: mapping pravidla jsou validní regexy a mají zásahy v datech', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky.json'), 'utf8'));
  for (const r of [...MAPPING.skupiny, ...MAPPING.indikatory]) {
    const re = new RegExp(r.re, 'i'); // vyhodí při nevalidním regexu
    const n = d.castky.reduce((s, c) => s + c.obsah.filter(o => re.test(o.t)).length, 0);
    assert.ok(n >= 1, `pravidlo ${r.g ?? r.id} nemá v korpusu žádný zásah`);
  }
});

test('vestniky vazby: anotace g v data/vestniky.json odpovídá pravidlům (drift)', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky.json'), 'utf8'));
  const kopie = JSON.parse(JSON.stringify(d.castky));
  for (const c of kopie) for (const o of c.obsah) delete o.g;
  anotujSkupiny(kopie, MAPPING);
  assert.deepEqual(kopie, d.castky, 'pole g nesedí na pravidla — spusť npm run fetch:vestniky');
  const n = d.castky.reduce((s, c) => s + c.obsah.filter(o => o.g).length, 0);
  assert.ok(n >= 50, `podezřele málo anotací (${n})`);
});

test('vestniky vazby: data/vestniky-vazby.json je drift-konzistentní', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky.json'), 'utf8'));
  const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky-vazby.json'), 'utf8'));
  const rebuilt = buildVazby(d, MAPPING, committed.skupiny_nazvy);
  assert.deepEqual(rebuilt, committed, 'vazby nesedí — spusť npm run fetch:vestniky');
  const ind = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const ids = new Set(ind.indicators.map(x => x.id));
  for (const id of Object.keys(committed.indikatory)) {
    assert.ok(ids.has(id), `vazby: indikátor ${id} v indicators.json není`);
  }
  const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
  const gids = new Set(ppo.skupiny.map(s => s.id));
  for (const g of Object.keys(committed.skupiny_nazvy)) {
    assert.ok(gids.has(Number(g)), `vazby: skupina ${g} v ppo.json není`);
  }
});

test('vestniky vazby: mergeVestnik plní kartu skupiny (nejnovější první, cap)', () => {
  const skupiny = new Map([[9, { id: 9 }], [10, { id: 10 }]]);
  const vest = { castky: [
    // datum je záměrně PROTI chronologii částek (u starých ročníků je to datum
    // migrace na web MZ) — řadit se musí podle rok/číslo
    { id: 1, titul: 'V 1/2020', rok: 2020, cislo: 1, datum: '2025-12-01', url: 'u1', obsah: [{ t: 'Program screeningu XYZ' }] },
    { id: 2, titul: 'V 2/2024', rok: 2024, cislo: 2, datum: '2024-01-01', url: 'u2', obsah: [{ t: 'Aktualizace programu screeningu XYZ' }, { t: 'Jiné téma' }] },
  ] };
  mergeVestnik(skupiny, vest, { skupiny: [{ g: 9, re: 'screeningu XYZ' }, { g: 10, re: 'nikde-nic' }] }, 8);
  const s = skupiny.get(9);
  assert.equal(s.vestnik.length, 2);
  assert.equal(s.vestnik_celkem, 2);
  assert.equal(s.vestnik[0].titul, 'V 2/2024', 'řadí rok/číslo částky, ne datum záznamu na webu');
  assert.equal(s.vestnik[0].rok, 2024, 'zásah nese rok částky');
  assert.equal(skupiny.get(10).vestnik, undefined, 'skupina bez zásahu pole nedostane');
  // drift: g v datech ⇒ skupina má kartu v ppo.json
  const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
  const s196 = ppo.skupiny.find(x => x.id === 196);
  assert.ok(s196.vestnik?.length >= 3, 'g196 (mamografie) má mít kartu Ve Věstníku MZ');
});

test('vestniky vazby: zkratNazev ořeže úvodní floskule', () => {
  assert.equal(zkratNazev('Komise pro program screeningu karcinomu prsu'), 'Screeningu karcinomu prsu');
  assert.equal(zkratNazev('Pracovní skupina k seznamu zdravotních výkonů s bodovými hodnotami'),
    'Seznamu zdravotních výkonů s bodovými hod…');
  assert.equal(zkratNazev(null), '');
});

/* ── fulltextový index PDF ──────────────────────────────────────────── */

import { tokenize, queryTerms, novyIndex, pridejDoIndexu } from '../ingest/lib/vestniky-fulltext.js';
import { queryTermsFt, fulltextIds } from '../src/vestniky.js';

test('vestniky fulltext: tokenizace frontendová = ingestová (parita)', () => {
  const vzorky = ['Mamografického screeningu', 'úhrada zdravotních VÝKONŮ č. 89312',
    'kolorektální karcinom — Doporučený postup', 'x', 'a1b2c3d4e5f6',
    'mamografie podle věku', 'úhrady dle zákona České republiky', 'tento Věstník bude'];
  for (const v of vzorky) {
    assert.deepEqual(queryTermsFt(v).sort(), queryTerms(v).sort(), `parita selhala pro: ${v}`);
  }
});

test('vestniky fulltext: pridejDoIndexu + fulltextIds (AND průnik)', () => {
  const idx = novyIndex();
  pridejDoIndexu(idx, 1, 'Mamografický screening a úhrady výkonů');
  pridejDoIndexu(idx, 2, 'Kolorektální screening bez úhrad');
  assert.ok(!pridejDoIndexu(idx, 1, 'duplicitně'), 'zpracovaná částka se nepřidá znovu');
  assert.deepEqual([...fulltextIds(idx, 'screening')].sort(), [1, 2]);
  assert.deepEqual([...fulltextIds(idx, 'screening mamografický')], [1], 'AND průnik');
  assert.deepEqual([...fulltextIds(idx, 'neexistujícíslovo')], [], 'neznámý term = prázdno');
  assert.equal(fulltextIds(idx, ''), null, 'prázdný dotaz = žádný fulltext filtr');
});

test('vestniky fulltext: data/vestniky-fulltext.json — obal, pokrytí, reálný dotaz', () => {
  const p = path.join(ROOT, 'data', 'vestniky-fulltext.json');
  assert.ok(fs.existsSync(p), 'index chybí — spusť npm run build:vestniky:fulltext');
  const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.ok(idx.zpracovano.length >= 250, `podezřele malé pokrytí (${idx.zpracovano.length})`);
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky.json'), 'utf8'));
  const ids = new Set(d.castky.map(c => c.id));
  for (const id of idx.zpracovano) assert.ok(ids.has(id), `index obsahuje neznámou částku ${id}`);
  const hits = fulltextIds(idx, 'mamografie');
  assert.ok(hits.size >= 5, `„mamografie" má mít zásahy v plných textech (${hits.size})`);
});

test('vestniky fulltext: filterCastky s ftIds přidá částku s příznakem ft', () => {
  const castky = [
    { id: 1, rok: 2020, titul: 'Věstník č. 1/2020', obsah: [{ t: 'Jiné téma', kat: 'ostatni' }] },
    { id: 2, rok: 2021, titul: 'Věstník č. 2/2021', obsah: [{ t: 'Screening plic', kat: 'screening' }] },
  ];
  const rows = filterCastky(castky, { q: 'screening', ftIds: new Set([1]) });
  assert.equal(rows.length, 2);
  assert.ok(rows.find(r => r.id === 1).ft, 'fulltext-only zásah nese příznak ft');
  assert.ok(!rows.find(r => r.id === 2).ft, 'obsahový zásah příznak nemá');
  assert.equal(filterCastky(castky, { q: 'screening', ftIds: new Set([1]), kat: 'screening' }).length, 1,
    'kategorie filtruje ft-only zásah bez položek dané kategorie');
});

/* ── odkazy mezi částkami (ruší/mění) ───────────────────────────────── */

import { anotujOdkazy } from '../ingest/fetchers/vestniky.js';

test('vestniky: anotujOdkazy najde a klasifikuje odkazy, přeskočí sebe-referenci', () => {
  const castky = [
    { id: 10, cislo: 9, rok: 2024, obsah: [{ t: 'Výzva k podání žádosti' }] },
    { id: 11, cislo: 12, rok: 2024, obsah: [
      { t: 'Ministerstvo ruší v plném rozsahu výzvy zveřejněné ve Věstníku MZ ČR částka 9/2024' },
      { t: 'Oprava překlepu ve Věstníku částka 12/2024' },
      { t: 'Aktualizace metodiky dle částky 3/2020' },
    ] },
  ];
  const n = anotujOdkazy(castky);
  assert.equal(n, 2, 'dvě položky s odkazem');
  const [rusi, sebe, meni] = castky[1].obsah;
  assert.deepEqual(rusi.ref, [{ c: 10, cislo: 9, rok: 2024, akce: 'rusi' }]);
  assert.equal(sebe.ref, undefined, 'zmínka vlastní částky není odkaz');
  assert.deepEqual(meni.ref, [{ c: null, cislo: 3, rok: 2020, akce: 'meni' }], 'cíl mimo archiv → c null');
});

test('vestniky: ref anotace v datech je drift-konzistentní a cíle existují', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky.json'), 'utf8'));
  const kopie = JSON.parse(JSON.stringify(d.castky));
  for (const c of kopie) for (const o of c.obsah) delete o.ref;
  anotujOdkazy(kopie);
  assert.deepEqual(kopie, d.castky, 'ref nesedí na anotátor — spusť npm run fetch:vestniky');
  const ids = new Set(d.castky.map(c => c.id));
  let n = 0;
  for (const c of d.castky) for (const o of c.obsah) for (const r of o.ref ?? []) {
    n++;
    if (r.c != null) assert.ok(ids.has(r.c), `ref na neznámou částku ${r.c}`);
  }
  assert.ok(n >= 15, `podezřele málo odkazů (${n})`);
});
