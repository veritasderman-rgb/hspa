// Testy Srovnávače zdravotních pojišťoven — data/pojistovny.json + pojistovny.html + src/pojistovny.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
