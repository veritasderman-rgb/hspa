// Podstránka Indikátory a pojišťovny (pojistovny-indikatory.html, src/pojistovny-indikatory.js):
// inventář z data/pojistovny-indikatory.json obohacený z kontraktu, auto seznam podle regexu,
// tabulky datasetů / kdo u koho / návrhů a blok otevřených dat (volitelný soubor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildKontraktSkupiny, buildAutoSeznam, kontraktHtml, autoHtml, datasetyHtml, kdoUKohoHtml, navrhyHtml,
  buildOpendataSouhrn, opendataHtml, indexKontrakt, buildStiznosti, stiznostiHtml,
} from '../src/pojistovny-indikatory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8'));
const INV = read('data', 'pojistovny-indikatory.json');
const K = read('data', 'indicators.json');

test('inventář: každé id v sekci kontrakt existuje v data/indicators.json a má granularitu', () => {
  const ids = indexKontrakt(K);
  for (const g of INV.kontrakt.skupiny) {
    assert.ok(g.id && g.nazev && g.polozky.length, g.id);
    for (const p of g.polozky) {
      assert.ok(ids.has(p.id), `${p.id} není v kontraktu`);
      assert.ok(typeof p.granularita === 'string' && p.granularita.length > 1, `${p.id}: granularita`);
    }
  }
  const all = INV.kontrakt.skupiny.flatMap((g) => g.polozky.map((p) => p.id));
  assert.equal(new Set(all).size, all.length, 'bez duplicit');
  assert.ok(INV.strucne.length >= 3 && INV.mezery.length >= 2);
  assert.ok(INV.datasety.polozky.length >= 10 && INV.kdo_u_koho.polozky.length === 5 && INV.navrhy.polozky.length >= 20);
  for (const n of INV.navrhy.polozky) assert.match(n.id, /^zp_[a-z0-9_]+$/, n.id);
  assert.equal(new Set(INV.navrhy.polozky.map((n) => n.id)).size, INV.navrhy.polozky.length);
});

test('buildKontraktSkupiny: obohacení z kontraktu (název, jednotka, rok, zdroj, ověření); neznámé id → chybi', () => {
  const sk = buildKontraktSkupiny(INV, K);
  assert.equal(sk.length, INV.kontrakt.skupiny.length);
  const u = sk[0].polozky.find((p) => p.id === 'uhrada_zp_per_pojistenec');
  assert.ok(u && !u.chybi && u.nazev.length > 5 && u.jednotka && u.rok >= 2023 && u.zdroj);
  assert.ok(sk.flatMap((g) => g.polozky).every((p) => !p.chybi));
  const inv2 = { kontrakt: { skupiny: [{ id: 'x', nazev: 'X', polozky: [{ id: 'neexistuje', granularita: 'g' }] }] } };
  const sk2 = buildKontraktSkupiny(inv2, K);
  assert.equal(sk2[0].polozky[0].chybi, true);
  assert.match(kontraktHtml(sk2), /v kontraktu chybí/);
  const html = kontraktHtml(sk);
  assert.match(html, /indicator\.html\?id=uhrada_zp_per_pojistenec/);
  assert.match(html, /Za co hodnota je/);
  assert.equal((html.match(/<table>/g) || []).length, sk.length);
  assert.equal(kontraktHtml([]).includes('nepodařilo'), true);
});

test('buildAutoSeznam: regex ze souboru, vyloučí ručně zařazené, seřadí česky; neplatný regex nevybouchne', () => {
  const sk = buildKontraktSkupiny(INV, K);
  const vyloucit = new Set(sk.flatMap((g) => g.polozky.map((p) => p.id)));
  const auto = buildAutoSeznam(INV, K, vyloucit);
  assert.ok(auto.length >= 10, `auto seznam má ${auto.length}`);
  assert.ok(auto.every((p) => !vyloucit.has(p.id)));
  assert.ok(auto.some((p) => p.id === 'screening_kolorektalni'), 'NRHZS screening je v auto seznamu');
  const names = auto.map((p) => p.nazev);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'cs')));
  assert.match(autoHtml(auto), /screening_kolorektalni/);
  assert.match(autoHtml([]), /Žádný indikátor/);
  const bad = { kontrakt: { auto_dotaz: { regex_zdroj: '(', regex_nazev: '[' } } };
  assert.deepEqual(buildAutoSeznam(bad, K), []);
});

test('datasetyHtml / kdoUKohoHtml / navrhyHtml: tabulky z inventáře', () => {
  const d = datasetyHtml(INV);
  assert.equal((d.match(/<tr>/g) || []).length - 1, INV.datasety.polozky.length);
  assert.match(d, /pojistenci-d5-zp\.json/);
  const k = kdoUKohoHtml(INV);
  assert.match(k, /OIS 11-47/);
  assert.match(k, /nzip\.cz/);
  assert.equal((k.match(/<dt>/g) || []).length, INV.kdo_u_koho.odpovedi.length);
  const n = navrhyHtml(INV);
  assert.match(n, /zp_pojistenci_mesicni/);
  assert.match(n, /class="zpc-no">ne/);
  assert.match(n, /class="zpc-yes">ano/);
  assert.match(datasetyHtml({}), /—/);
});

test('opendata: bez souboru věta, se souborem souhrn 7 řádků, detaily a centrální zdroje; chybějící ZP = —', () => {
  assert.match(opendataHtml(null), /zatím není k dispozici/);
  const od = {
    stav_k: '2026-11-02', skala: { ano: 'A', castecne: 'B', ne: 'C' },
    centralni_zdroje: [{ nazev: 'MZ přerozdělení', url: 'https://mzd.gov.cz/x', co_obsahuje: 'měsíční PDF', format: 'PDF', periodicita: 'měsíčně' }],
    pojistovny: [{
      kod: '111', zkratka: 'VZP ČR', overeno: '2026-11-02',
      web_opendata: { stav: 'castecne', url: 'https://www.vzp.cz/x', popis: 'statistiky', datove_sady: [{ nazev: 'Sada', url: 'https://www.vzp.cz/s', format: 'XLSX' }] },
      nkod: { stav: 'ne', pocet_sad: 0, url: null, sady: [] },
      vyrocni_zpravy_a_jine: { stav: 'ano', popis: 'VZ v PDF', odkazy: [{ nazev: 'VZ 2024', url: 'https://www.vzp.cz/vz' }] },
      zadosti_o_data: { popis: 'formulář', url: null }, shrnuti: 'Shrnutí VZP.', zdroje: ['https://www.vzp.cz/x'],
    }],
  };
  const rows = buildOpendataSouhrn(od);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].kod, '111');
  assert.equal(rows[0].web, 'castecne');
  assert.equal(rows[1]._r, null);
  const html = opendataHtml(od);
  assert.equal((html.match(/<tr data-zp="/g) || []).length, 7);
  assert.match(html, /Shrnutí VZP\./);
  assert.match(html, /částečně/);
  assert.match(html, /MZ přerozdělení/);
  assert.ok(html.includes('Podrobnosti podle pojišťoven<span class="zpc-n">1</span>'));
  assert.match(html, /VZ 2024/);
  assert.ok(!html.includes('undefined'));
});

test('stránka: HTML má kontejnery, shell data-aktivni, oba moduly; sitemap noindex; e2e visual zahrnuje stránku', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pojistovny-indikatory.html'), 'utf8');
  for (const id of ['zpShell', 'zpMojeZp', 'zpIndStrucne', 'zpIndKdo', 'zpIndKontrakt', 'zpIndAuto', 'zpIndDatasety', 'zpIndNavrhy', 'zpIndMezery', 'zpZdroje']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.doesNotMatch(html, /id="zpStiznosti"|id="zpOpendata"/, 'stížnosti a open data jsou od A0.5 na stránce Aplikace a servis');
  const apl = fs.readFileSync(path.join(ROOT, 'pojistovny-aplikace.html'), 'utf8');
  for (const id of ['zpStiznosti', 'zpOpendata', 'zpTablePrev', 'zpAppFunkce']) assert.match(apl, new RegExp(`id="${id}"`), id);
  assert.match(apl, /src\/pojistovny-indikatory\.js/);
  assert.match(html, /data-aktivni="indikatory"/);
  assert.match(html, /src\/pojistovny\.js/);
  assert.match(html, /src\/pojistovny-indikatory\.js/);
  assert.match(html, /noindex/);
  assert.match(fs.readFileSync(path.join(ROOT, 'scripts', 'generate-sitemap.js'), 'utf8'), /'\/pojistovny-indikatory\.html': \{ typ: 'noindex'/);
  assert.match(fs.readFileSync(path.join(ROOT, 'tests', 'e2e', 'visual.spec.js'), 'utf8'), /pojistovny-indikatory\.html/);
});

test('opendata soubor: existuje vždy (i zástupný); plný = validní tvar, 7 ZP, každé tvrzení se zdrojem a datem ověření', () => {
  const p = path.join(ROOT, 'data', 'pojistovny-opendata.json');
  assert.ok(fs.existsSync(p), 'data/pojistovny-opendata.json musí existovat (jinak e2e networkidle na CI vyprší)');
  const od = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.ok(od.stav_k && Array.isArray(od.pojistovny) && Array.isArray(od.centralni_zdroje));
  // soubor musí existovat i jako zástupný (http-server u 404 nechá požadavek viset → e2e networkidle vyprší)
  if (od.stav === 'placeholder' && od.pojistovny.length === 0) { assert.match(opendataHtml(od), /zatím není k dispozici/); return; }
  assert.equal(od.pojistovny.length, 7);
  assert.deepEqual(od.pojistovny.map((z) => String(z.kod)).sort(), ['111', '201', '205', '207', '209', '211', '213']);
  for (const z of od.pojistovny) {
    assert.ok(['ano', 'castecne', 'ne'].includes(z.web_opendata?.stav), `${z.kod} web stav`);
    assert.ok(['ano', 'ne'].includes(z.nkod?.stav), `${z.kod} nkod stav`);
    assert.ok(['ano', 'castecne', 'ne'].includes(z.vyrocni_zpravy_a_jine?.stav), `${z.kod} vz stav`);
    assert.ok(z.overeno && z.shrnuti && Array.isArray(z.zdroje) && z.zdroje.length, `${z.kod} overeno/shrnuti/zdroje`);
    for (const s of z.web_opendata?.datove_sady || []) assert.ok(s.nazev && s.url, `${z.kod} sada bez url`);
  }
  for (const c of od.centralni_zdroje) assert.ok(c.nazev && c.url, 'centrální zdroj bez url');
  assert.ok(!JSON.stringify(od).includes('undefined'));
});

test('stížnosti: dataset odkazuje na existující přepisy VZ a řádek s číslem; definice u každé ZP; 16a jen celá čísla', () => {
  const st = read('data', 'pojistovny-stiznosti.json');
  assert.equal(st.pojistovny.length, 7);
  assert.ok(st.srovnatelnost.length >= 3);
  for (const z of st.pojistovny) {
    assert.ok(z.definice && z.definice.length > 20, z.kod);
    for (const y of z.roky) {
      const p = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text', y.soubor);
      assert.ok(fs.existsSync(p), `${z.kod} ${y.rok}: ${y.soubor}`);
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      assert.ok(y.radek > 0 && y.radek <= lines.length, `${z.kod} ${y.rok}: řádek ${y.radek}`);
      const okno = lines.slice(Math.max(0, y.radek - 4), y.radek + 6).join(' ');
      assert.match(okno, /stížnost|podnět|podání|žádost|dostupnost|16a|Celkem/i, `${z.kod} ${y.rok}: okolí řádku ${y.radek} nemluví o podáních`);
      if (y.podani_dostupnost != null) assert.ok(Number.isInteger(y.podani_dostupnost) && y.podani_dostupnost > 0);
      if (y.stiznosti_16a != null) assert.ok(Number.isInteger(y.stiznosti_16a) && y.stiznosti_16a >= 0);
    }
  }
  // konkrétní doložené hodnoty, které se přepisovaly ručně
  const vzp = st.pojistovny.find((z) => z.kod === '111');
  assert.equal(vzp.roky.find((y) => y.rok === 2024).podani_dostupnost, 47058, 'řádek Celkem tabulky VZ 2024 (111-2024.txt:2063)');
  assert.equal(vzp.roky.find((y) => y.rok === 2023).podani_dostupnost, 46945, 'řádek Celkem tabulky VZ 2023 (111-2023.txt:1945)');
  const mv = st.pojistovny.find((z) => z.kod === '211');
  assert.equal(mv.roky.find((y) => y.rok === 2024).podani_celkem, 917);
  assert.equal(mv.roky.find((y) => y.rok === 2024).opravnene_stiznosti, 14);
});

test('buildStiznosti / stiznostiHtml: 7 řádků, roky z dat, na 100 tis. jen u plné definice, bez pořadí', () => {
  const st = read('data', 'pojistovny-stiznosti.json');
  const poj = read('data', 'pojistovny.json');
  const { roky, rows } = buildStiznosti(st, poj);
  assert.deepEqual(roky, [2023, 2024, 2025]);
  assert.equal(rows.length, 7);
  const vzp = rows.find((r) => r.kod === '111');
  assert.ok(vzp.na100k > 500 && vzp.na100k < 1000, `VZP na 100 tis. = ${vzp.na100k}`);
  assert.equal(rows.find((r) => r.kod === '211').na100k, null, 'jiná definice se nepřepočítává');
  assert.equal(rows.find((r) => r.kod === '201').posledni, null);
  const html = stiznostiHtml(st, poj);
  assert.equal((html.match(/<tr data-zp="/g) || []).length, 14, '7 řádků v tabulce podání + 7 v tabulce § 16a');
  assert.match(html, /47\u00a0058|47 058/);
  assert.match(html, /neuvádí/);
  assert.match(html, /917 podání, 14 oprávněných/);
  assert.match(html, /§ 16a/);
  assert.match(html, /111-2024\.txt/);
  assert.doesNotMatch(html, /pořadí|žebříček/);
  assert.match(stiznostiHtml(null, poj), /zatím nejsou/);
  assert.ok(!html.includes('undefined'));
});

test('stránka Aplikace a servis: žádná tabulka bez scope (zpTablePrev, stížnosti, open data), ZP MV ČR a § 16a v bezpatkovém stylu poznámek', () => {
  const st = read('data', 'pojistovny-stiznosti.json');
  const poj = read('data', 'pojistovny.json');
  const bezScope = (h) => (h.match(/<th(?![a-z])(?![^>]*\bscope=)[^>]*>/g) || []);
  const html = stiznostiHtml(st, poj);
  assert.deepEqual(bezScope(html), [], 'stiznostiHtml');
  assert.deepEqual(bezScope(opendataHtml(read('data', 'pojistovny-opendata.json'))), [], 'opendataHtml');
  // odstavec o ZP MV ČR a nadpis § 16a mají třídu jako okolní poznámky, ne výchozí patkové písmo
  assert.match(html, /<p class="zpc-note"><b>ZP MV ČR<\/b> jako jediná/);
  assert.match(html, /<h4 class="zpc-inst-h4">Stížnosti podle § 16a/);
  // tabulka servisu (renderServis v pojistovny.js) má scope u všech záhlaví
  const js = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  const servis = js.slice(js.indexOf('function renderServis'), js.indexOf('function renderKmen'));
  assert.deepEqual(bezScope(servis), [], 'zpTablePrev');
  // celý zdroj modulu: každé <th v šablonách má scope
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny-indikatory.js'), 'utf8');
  assert.deepEqual(bezScope(src), [], 'pojistovny-indikatory.js');
});
