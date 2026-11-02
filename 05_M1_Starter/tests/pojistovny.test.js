// Testy Hlídače zdravotních pojišťoven — data/pojistovny.json + pojistovny.html + src/pojistovny.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateAll, loadDatasets, ZP_CODES, OBLASTI, STAVY } from '../ingest/validate-pojistovny.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8'));
const ZP = ['111', '201', '205', '207', '209', '211', '213'];

test('pojistovny.json: 7 pojišťoven, všechny kódy, unikátní', () => {
  const codes = DATA.pojistovny.map((z) => z.kod).sort();
  assert.deepEqual(codes, ZP);
});

test('pojistovny.json: tržní podíly z CRP dávají 100 % (±0,2 p.b.)', () => {
  const sum = DATA.pojistovny.reduce((a, z) => a + z.crp.podil_trhu_pct, 0);
  assert.ok(Math.abs(sum - 100) < 0.2, `součet podílů ${sum}`);
});

test('pojistovny.json: každá hospodářská hodnota má zdroj a rok', () => {
  for (const z of DATA.pojistovny) {
    for (const [k, v] of Object.entries(z.hospodareni)) {
      if (k === 'rok') continue;
      assert.equal(typeof v, 'object', `${z.kod}.${k} není objekt`);
      if (v.hodnota != null) {
        assert.ok(v.zdroj, `${z.kod}.${k}: chybí zdroj`);
        assert.ok(v.rok, `${z.kod}.${k}: chybí rok`);
      }
    }
  }
});

test('pojistovny.json: saldo systému = součet sald pojišťoven (±0,2 mld)', () => {
  const sum = DATA.pojistovny.reduce((a, z) => a + (z.hospodareni.hospodarsky_vysledek_mld.hodnota ?? 0), 0);
  assert.ok(Math.abs(sum - DATA.system.saldo_mld) < 0.2, `součet ${sum.toFixed(2)} vs. systém ${DATA.system.saldo_mld}`);
});

test('pojistovny.json: semafor obsahuje všech 6 oblastí a jen povolené stavy', () => {
  const stavy = Object.keys(DATA.stavy_semaforu);
  for (const z of DATA.pojistovny) {
    assert.deepEqual(Object.keys(z.semafor).sort(), ['dostupnost', 'hospodareni', 'kvalita', 'prevence', 'servis', 'sit']);
    for (const s of Object.values(z.semafor)) {
      if (s.stav != null) assert.ok(stavy.includes(s.stav), `neznámý stav ${s.stav}`);
    }
  }
});

test('pojistovny.html: noindex dokud je pracovní návrh, jeden h1, modul, footer', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pojistovny.html'), 'utf8');
  if (DATA.stav === 'pracovni-navrh') assert.match(html, /<meta name="robots" content="noindex/, 'pracovní návrh musí být noindex');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /class="ed-hero-headline"/);
  assert.match(html, /src\/styles\.min\.css/);
  assert.match(html, /<script type="module" src="src\/pojistovny\.js">/);
  assert.match(html, /id="siteFooter"/);
  assert.match(html, /id="moduleNav"/);
  for (const id of ['zpHeroStats', 'zpAppMatrix', 'zpPrevMatrix', 'zpPrevOnko', 'zpPrevDusevni', 'zpFpStruktura', 'zpOdpovedi', 'zpCards', 'zpChartShare', 'zpChart65', 'zpTableFin', 'zpChartNzs', 'zpChartZust', 'zpTablePrev', 'zpNotes', 'zpChybi', 'zpOtazky', 'zpSemafor', 'zpSources']) {
    assert.match(html, new RegExp(`id="${id}"`), `chybí kontejner #${id}`);
  }
});

test('middleware.js: chrání stránku i data heslem a posílá noindex', () => {
  const mw = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
  assert.match(mw, /POJISTOVNY_HESLO/);
  assert.match(mw, /WWW-Authenticate/);
  assert.match(mw, /X-Robots-Tag/);
  assert.match(mw, /'\/pojistovny'/);
  assert.match(mw, /\/data\/pojistovny-:path\*/);
});

test('pojistovny-aplikace.json a pojistovny-otazky.json: základní tvar', () => {
  const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-aplikace.json'), 'utf8'));
  assert.equal(a.aplikace.length, 7);
  assert.equal(a.funkce.length, 10);
  for (const x of a.aplikace) assert.ok(ZP.includes(x.kod), `neznámý kód ${x.kod}`);
  const o = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-otazky.json'), 'utf8'));
  const fp = o.sady.find((s) => s.id === 'fond-prevence');
  assert.equal(fp.otazky.length, 7);
});

test('pojistovny-prevence.json: 7 pojišťoven × 9 oblastí, stupně jen z povolené množiny', () => {
  const file = path.join(ROOT, 'data', 'pojistovny-prevence.json');
  if (!fs.existsSync(file)) return; // soubor vzniká v kole 1; test přeskočí, dokud neexistuje
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(p.pojistovny.length, 7);
  const ok = new Set(Object.keys(p.stupne));
  for (const z of p.pojistovny) {
    assert.equal(Object.keys(z.oblasti).length, 9, `${z.kod}: oblasti`);
    for (const [k, v] of Object.entries(z.oblasti)) if (v.stupen != null) assert.ok(ok.has(v.stupen), `${z.kod}.${k}: stupeň ${v.stupen}`);
  }
});

test('src/pojistovny.js: čisté funkce formátují a kreslí', async () => {
  const mod = await import('../src/pojistovny.js');
  assert.equal(mod.fmtKc(47998), '47 998');
  assert.equal(mod.fmtKc(null), '—');
  const svg = mod.hbarSvg([{ label: 'A', value: 10, color: '#000' }, { label: 'B', value: null, color: '#000' }], { unit: ' %' });
  assert.match(svg, /<svg/);
  assert.match(svg, /nedohledáno/);
  const sp = mod.sparkSvg([{ year: 2010, share_pct: 60 }, { year: 2011, share_pct: 58 }, { year: 2012, share_pct: 57 }], '#000');
  assert.match(sp, /polyline/);
  assert.match(mod.levelBadge('silne'), /zpc-lvl-2/);
  assert.match(mod.levelBadge(null), /—/);
});

// ---------------------------------------------------------------------------
// Validátor všech čtyř datasetů (ingest/validate-pojistovny.js, P0.2)
// ---------------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
const realSets = () => clone(loadDatasets());
const fails = (sets, re) => {
  const { errors } = validateAll(sets);
  assert.ok(errors.length > 0, 'validátor měl selhat');
  assert.ok(errors.some((e) => re.test(e)), `očekávaná chyba ${re} v:\n${errors.join('\n')}`);
};

test('validate-pojistovny: exporty ZP_CODES, OBLASTI, STAVY', () => {
  assert.deepEqual(ZP_CODES, ZP);
  assert.equal(OBLASTI.length, 6);
  assert.deepEqual(STAVY, ['dolozeno', 'deklarovano', 'nedolozeno', 'neodpovedela']);
});

test('validate-pojistovny: projde na reálných datech všech 4 datasetů', () => {
  const { errors, warnings, checks } = validateAll(loadDatasets());
  assert.deepEqual(errors, []);
  assert.ok(Array.isArray(warnings));
  assert.ok(checks > 500, `málo kontrol: ${checks}`);
});

test('validate-pojistovny: CLI vrací exit 0 a souhrn „OK: 4 datasety“', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'ingest', 'validate-pojistovny.js')], { encoding: 'utf8' });
  assert.match(out, /OK: 4 datasety, \d+ kontrol/);
});

test('validate-pojistovny: chybějící dataset selže', () => {
  const s = realSets();
  s.prevence = null;
  fails(s, /pojistovny-prevence\.json: chybí/);
});

test('validate-pojistovny: duplicitní kód ZP v pojistovny.json', () => {
  const s = realSets();
  s.pojistovny.pojistovny[1].kod = s.pojistovny.pojistovny[0].kod;
  fails(s, /duplicitní kód/);
});

test('validate-pojistovny: hospodareni_2025 — null i chybějící projde, rozbitá obálka selže', () => {
  const s = realSets();
  s.pojistovny.pojistovny[0].hospodareni_2025 = null;
  delete s.pojistovny.pojistovny[1].hospodareni_2025;
  assert.deepEqual(validateAll(s).errors, []);
  const bad = realSets();
  bad.pojistovny.pojistovny[0].hospodareni_2025 = { pocet_pojistencu: { hodnota: 'moc', rok: 2025, zdroj: 'x' } };
  fails(bad, /hospodareni_2025\.pocet_pojistencu\.hodnota: není číslo/);
  const noSrc = realSets();
  noSrc.pojistovny.pojistovny[0].hospodareni_2025 = { pocet_pojistencu: { hodnota: 5, rok: 2025, zdroj: null } };
  fails(noSrc, /hospodareni_2025\.pocet_pojistencu: hodnota bez zdroje/);
  const notObj = realSets();
  notObj.pojistovny.pojistovny[0].hospodareni_2025 = { pocet_pojistencu: 5 };
  fails(notObj, /hospodareni_2025\.pocet_pojistencu: musí být objekt/);
});

test('validate-pojistovny: changelog[] je volitelný, ale musí mít správný tvar', () => {
  const s = realSets();
  delete s.pojistovny.changelog;
  assert.deepEqual(validateAll(s).errors, []);
  s.pojistovny.changelog = [];
  assert.deepEqual(validateAll(s).errors, []);
  s.pojistovny.changelog = [{ datum: '2026-11-02', zmena: 'Doplněno hospodaření 2025', zdroj: 'VZ 2025' }];
  assert.deepEqual(validateAll(s).errors, []);
  for (const [patch, re] of [
    [{ datum: '2.11.2026' }, /changelog\[0\]\.datum/],
    [{ datum: '2026-13-40' }, /changelog\[0\]\.datum/],
    [{ zmena: '' }, /changelog\[0\]\.zmena/],
    [{ zdroj: 5 }, /changelog\[0\]\.zdroj/],
  ]) {
    const b = realSets();
    b.pojistovny.changelog = [{ datum: '2026-11-02', zmena: 'x', zdroj: 'y', ...patch }];
    fails(b, re);
  }
});

test('validate-pojistovny: aplikace — neznámé id funkce, hodnota mimo true|false|null, duplicity, počet', () => {
  const a = realSets();
  a.aplikace.aplikace[0].funkce.neexistuje = true;
  fails(a, /funkce: neznámé id 'neexistuje'/);
  const b = realSets();
  b.aplikace.aplikace[0].funkce.bankid = 'ano';
  fails(b, /funkce\.bankid: musí být true\|false\|null/);
  const c = realSets();
  c.aplikace.funkce[1].id = c.aplikace.funkce[0].id;
  fails(c, /funkce: duplicitní id/);
  const d = realSets();
  d.aplikace.funkce[1].label = d.aplikace.funkce[0].label;
  fails(d, /funkce: duplicitní label/);
  const e = realSets();
  e.aplikace.aplikace.pop();
  fails(e, /aplikace očekáváno 7/);
  const f = realSets();
  f.aplikace.aplikace[2].kod = '999';
  fails(f, /neznámý kód ZP/);
  const g = realSets();
  g.aplikace.aplikace[0].uzivatele = { hodnota: 'hodně', rok: 2025, zdroj: 'x' };
  fails(g, /uzivatele\.hodnota: není číslo/);
  const h = realSets();
  h.aplikace.rizikove_skupiny.skupiny = [];
  fails(h, /rizikove_skupiny\.skupiny/);
  const i = realSets();
  i.aplikace.rozpory.push({ nope: 1 });
  fails(i, /rozpory\[\d+\]: musí být string/);
});

test('validate-pojistovny: prevence — neznámé id oblasti, stupen "super", duplicitní kód, rok_vz', () => {
  const a = realSets();
  a.prevence.pojistovny[0].oblasti.neexistujici = { stupen: 'silne', popis: 'x' };
  fails(a, /oblasti: neznámé id 'neexistujici'/);
  const b = realSets();
  b.prevence.pojistovny[0].oblasti.onkologie.stupen = 'super';
  fails(b, /oblasti\.onkologie\.stupen: 'super'/);
  const c = realSets();
  c.prevence.pojistovny[1].kod = c.prevence.pojistovny[0].kod;
  fails(c, /duplicitní kód/);
  const d = realSets();
  d.prevence.pojistovny[0].rok_vz = '2024';
  fails(d, /rok_vz: musí být číslo/);
  const e = realSets();
  e.prevence.pojistovny[0].onko_screening.prsu = 'ano';
  fails(e, /onko_screening\.prsu: musí být boolean\|null/);
  const f = realSets();
  f.prevence.pojistovny[0].onko_screening.neznamy = true;
  fails(f, /onko_screening: neznámý sloupec/);
  const g = realSets();
  g.prevence.pojistovny[0].dusevni.neznamy = { stupen: 'silne' };
  fails(g, /dusevni: neznámý sloupec/);
  const h = realSets();
  h.prevence.oblasti[1].id = h.prevence.oblasti[0].id;
  fails(h, /oblasti: duplicitní id/);
  const i = realSets();
  i.prevence.pojistovny[0].fond_prevence_struktura.polozky[0].skutecnost = 'moc';
  fails(i, /skutecnost: musí být číslo\|null/);
  // null stupeň je v pořádku
  const ok1 = realSets();
  ok1.prevence.pojistovny[0].oblasti.onkologie.stupen = null;
  assert.deepEqual(validateAll(ok1).errors, []);
});

test('validate-pojistovny: fond prevence — nesoulad součtu je WARN, ne FAIL', () => {
  const s = realSets();
  s.prevence.pojistovny[0].fond_prevence_struktura.celkem.skutecnost += 100000;
  const { errors, warnings } = validateAll(s);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /součet položek .* ≠ celkem/);
  // v toleranci ±1 % bez varování
  const t = realSets();
  t.prevence.pojistovny[0].fond_prevence_struktura.celkem.skutecnost += 1000;
  assert.deepEqual(validateAll(t).warnings, []);
});

test('validate-pojistovny: otázky — oba tvary sad, duplicitní id, neznámý typ', () => {
  const a = realSets();
  a.otazky.sady[0].otazky[1].id = a.otazky.sady[0].otazky[0].id;
  fails(a, /duplicitní id otázky/);
  const b = realSets();
  b.otazky.sady[1].casti[1].otazky[0].id = b.otazky.sady[1].casti[0].otazky[0].id;
  fails(b, /duplicitní id otázky/);
  const c = realSets();
  c.otazky.sady[1].typ = 'esej';
  fails(c, /neznámý typ 'esej'/);
  const d = realSets();
  delete d.otazky.sady[1].casti[0].otazky[0].moznosti;
  fails(d, /moznosti: musí být neprázdné pole stringů/);
  const e = realSets();
  e.otazky.sady[0].otazky[0].text = '';
  fails(e, /chybí text/);
  const f = realSets();
  f.otazky.sady[1].id = f.otazky.sady[0].id;
  fails(f, /duplicitní id sady/);
  const g = realSets();
  g.otazky.sady[0].typ = 'dotaznik'; // otevřená sada se nesmí tvářit jako dotazník (nemá casti[])
  fails(g, /typ dotaznik vyžaduje neprázdné casti/);
});
