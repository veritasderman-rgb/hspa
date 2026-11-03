// Testy Srovnávače zdravotních pojišťoven — data/pojistovny.json + pojistovny.html + src/pojistovny.js.

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

// ---------------------------------------------------------------- P1.6: přehled + podstránky
const STRANKY = {
  'pojistovny.html': ['zpHeroStats', 'zpMojeZp', 'zpOvKarta', 'zpPrehled', 'zpOvGrafy', 'zpOvSemafor', 'zpOvTemata'],
  'pojistovny-kmen.html': ['zpHeroStats', 'zpChartShare', 'zpCards', 'zpKraje', 'zpChartTrend', 'zpChartGrowth', 'zpKmenMesicni', 'zpKmenPrestupy', 'zpChart65', 'zpChartNzs',
    'zpNotes', 'zpChybi'],
  'pojistovny-penize.html': ['zpPrerozdeleni', 'zpRady', 'zpStatni', 'zpSegmenty', 'zpFondProvoz', 'zpTableFin', 'zpChartZust', 'zpChartProvoz', 'zpChartYoy'],
  'pojistovny-prevence.html': ['zpPrevMatrix', 'zpPrevProc', 'zpPrevOnko', 'zpPrevDusevni', 'zpFpStruktura', 'zpDolozene', 'zpMereni', 'zpOdpovediMatrix', 'zpOdpovedi'],
  'pojistovny-aplikace.html': ['zpAppMatrix', 'zpAppFunkce', 'zpAppKriteria', 'zpAppSummary', 'zpAppNotes', 'zpTablePrev', 'zpStiznosti', 'zpOpendata'],
  'pojistovny-gramotnost.html': ['zpRizikove', 'zpOtazky', 'zpDalsi', 'zpDotaznik', 'zpDotaznikAgregace'],
  'pojistovny-instituce.html': ['zpInstOrgany', 'zpInstAparat', 'zpInstProgramy', 'zpInstDostupnost', 'zpSit'],
  'pojistovny-metodika.html': ['zpSemafor', 'zpOtazky', 'zpZadosti', 'zpVerifikace'],
  'pojistovny-indikatory.html': ['zpIndStrucne', 'zpIndKdo', 'zpIndKontrakt', 'zpIndAuto', 'zpIndDatasety', 'zpIndNavrhy', 'zpIndMezery'],
};
const PODSTRANKY = Object.keys(STRANKY).filter((f) => f !== 'pojistovny.html');
const readPage = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('P1.6: každá stránka srovnávače — noindex, jeden h1, styles.min.css, shell, Moje pojišťovna, zdroje, footer', () => {
  for (const f of Object.keys(STRANKY)) {
    const html = readPage(f);
    assert.match(html, /^<!DOCTYPE html>/, f);
    assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/, `${f}: noindex`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${f}: jeden h1`);
    assert.equal((html.match(/<title>/g) || []).length, 1, `${f}: title`);
    assert.match(html, /<!--\s*\n\s*audit:/, `${f}: audit komentář`);
    assert.match(html, /href="src\/styles\.min\.css"/, `${f}: styles.min.css (traps § 5)`);
    assert.doesNotMatch(html, /\.\.\/src\//, `${f}: relativní cesta ../src`);
    assert.match(html, /<script type="module" src="src\/pojistovny\.js"><\/script>/, `${f}: orchestrátor`);
    for (const id of ['zpShell', 'zpMojeZp', 'zpZdroje', 'siteFooter', 'moduleNav', 'mastheadDate']) {
      assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${f}: #${id}`);
    }
    for (const id of STRANKY[f]) assert.match(html, new RegExp(`id="${id}"`), `${f}: chybí #${id}`);
    assert.doesNotMatch(html, /\sstyle="/, `${f}: žádné inline styly`);
    // #zpShell je první v <main> a nese aktivní téma
    const tema = f === 'pojistovny.html' ? 'prehled' : f.replace(/^pojistovny-|\.html$/g, '');
    assert.match(html, new RegExp(`<main id="content">\\s*<div id="zpShell" class="zpc-shell" data-aktivni="${tema}"></div>`), `${f}: shell`);
  }
});

test('P1.6: script tagy odkazují na existující moduly, satelity jen tam, kde je jejich kontejner', () => {
  const SAT = { 'pojistovny-kraje': 'zpKraje', 'pojistovny-sit': 'zpSit', 'pojistovny-semafor': 'zpSemafor',
    'pojistovny-zadosti': 'zpZadosti', 'pojistovny-verifikace': 'zpVerifikace' };
  for (const f of Object.keys(STRANKY)) {
    const html = readPage(f);
    const srcs = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map((m) => m[1]);
    assert.ok(srcs.length >= 1, f);
    for (const src of srcs) assert.ok(fs.existsSync(path.join(ROOT, src)), `${f}: ${src} neexistuje`);
    for (const [m, id] of Object.entries(SAT)) {
      const has = srcs.includes(`src/${m}.js`);
      assert.equal(has, html.includes(`id="${id}"`), `${f}: ${m}.js ↔ #${id}`);
    }
  }
  // přehled je lehký: jen orchestrátor
  assert.deepEqual([...readPage('pojistovny.html').matchAll(/<script type="module" src="([^"]+)">/g)].map((m) => m[1]), ['src/pojistovny.js']);
});

test('P1.6: přehled je general view — žádné tabulky ani dlouhé akordeony, rozcestník na 5 podstránek', () => {
  const html = readPage('pojistovny.html');
  assert.doesNotMatch(html, /<table/);
  assert.equal((html.match(/<details/g) || []).length, 1, 'jen „O projektu a datech“');
  assert.match(html, /class="ed-hero-headline"/);
  assert.match(html, /id="zpOvGrafy" class="zpc-overview-grid" role="group"/);
  assert.match(html, /<details class="zpc-acc zpc-ov-about">\s*<summary>O projektu a datech<\/summary>\s*<div class="zpc-acc-body">\s*<p><b>Jak systém funguje\.<\/b>[\s\S]*href="jak-funguje\.html\?id=pojistovny"/, 'A0.7: vysvětlující vrstva s odkazem na explainer');
  assert.doesNotMatch(html, /zpc-ov-swipe|posuňte/, 'grafy přehledu jsou pod sebou, ne v posuvném pásu (A0.2)');
  for (const f of PODSTRANKY) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test('P1.6: síť odborností — povinné věty o omezení metody a o pobočkách nad grafem', () => {
  const html = readPage('pojistovny-instituce.html');
  const at = html.indexOf('id="zpSit"');
  const before = html.slice(html.indexOf('id="sit-odbornosti"'), at);
  assert.match(before, /horní odhad smluvních pracovišť, stav k 31\. 12\. 2024/);
  assert.match(before, /nese jen zařízení \(IČZ\)/);
  assert.match(before, /rozdíly mezi nimi jsou menší než chyba metody/);
  assert.match(before, /„Počet poboček“ dnes není srovnatelné číslo/);
});

test('middleware.js: chrání stránku i data heslem a posílá noindex', () => {
  const mw = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
  assert.match(mw, /POJISTOVNY_HESLO/);
  assert.match(mw, /WWW-Authenticate/);
  assert.match(mw, /X-Robots-Tag/);
  assert.match(mw, /'\/pojistovny'/);
  assert.match(mw, /\/data\/pojistovny-:path\*/);
  assert.match(mw, /'\/pojistovny-:path\*'/, 'podstránky srovnávače (P1.6)');
});

test('middleware.js: matcher pokrývá přehled, všech pět podstránek a data, nic jiného', async () => {
  const { config } = await import('../middleware.js');
  // path-to-regexp v jednoduchosti, jak ho Vercel používá: ':path*' = zbytek cesty, ukotveno na obou koncích
  const re = config.matcher.map((m) => new RegExp(`^${m.replace(/[.]/g, '\\.').replace(/:path\*/, '.*')}$`));
  const hit = (u) => re.some((r) => r.test(u));
  for (const u of ['/pojistovny', '/pojistovny.html', '/pojistovny-kmen.html', '/pojistovny-penize.html', '/pojistovny-prevence.html', '/pojistovny-aplikace.html',
    '/pojistovny-gramotnost.html', '/pojistovny-metodika.html', '/pojistovny-indikatory.html', '/pojistovny-instituce.html', '/pojistovna.html', '/pojistovna', '/pojistovny-kmen', '/data/pojistovny.json', '/data/pojistovny-sit.json', '/data/pojistovny-indikatory.json']) {
    assert.ok(hit(u), `${u} musí být za heslem`);
  }
  for (const u of ['/pojistenci.html', '/index.html', '/data/pojistenci-d5-zp.json', '/src/pojistovny.js', '/clanek-pojistne-plany-2026.html']) {
    assert.ok(!hit(u), `${u} nesmí být za heslem`);
  }
  assert.equal(new Set(config.matcher).size, config.matcher.length, 'bez duplicit');
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

// ---------------------------------------------------------------------------
// Čisté funkce src/pojistovny.js (P1.4 + P3.1 + P3.4): příprava vstupů pro
// primitivy zp-viz.js je oddělená od renderu a testuje se bez DOM.
// ---------------------------------------------------------------------------
const mod = await import('../src/pojistovny.js');
const viz = await import('../src/zp-viz.js');
const copy = (x) => JSON.parse(JSON.stringify(x));
const NB = (s) => s.replace(/ /g, ' ');

test('pojistovny.js: fmtKc a levelBadge', () => {
  assert.equal(mod.fmtKc(47998), NB('47 998'));
  assert.equal(mod.fmtKc(20.857, 1), '20,9');
  assert.equal(mod.fmtKc(null), '—');
  assert.equal(mod.fmtKc(''), '—');
  assert.equal(mod.fmtKc(-6.41, 1), '−6,4', 'záporné číslo s typografickým minus');
  assert.match(mod.levelBadge('silne'), /zpc-lvl-2/);
  assert.match(mod.levelBadge(3), /nejsilnější/);
  assert.match(mod.levelBadge(null), /—/);
  assert.equal(mod.levelBadge('<b>'), '&lt;b&gt;');
  assert.equal(mod.hbarSvg, undefined, 'hbarSvg je nahrazen primitivy zp-viz.js');
  assert.equal(mod.sparkSvg, undefined, 'sparkSvg je nahrazen miniIndexSvg');
});

test('pojistovny.js: miniIndexSvg — index prvního roku, krajní roky, null/krátká řada', () => {
  const svg = mod.miniIndexSvg([{ year: 2011, value: 120 }, { year: 2010, value: 100 }, { year: 2025, value: 117 }], { label: 'ČPZP' });
  assert.match(svg, /^<svg class="zpc-mini"/);
  assert.match(svg, />2010<\/text>/);
  assert.match(svg, />2025<\/text>/);
  assert.match(svg, /class="zpc-mini-end"[^>]*>117</);
  assert.match(svg, /role="img" aria-label="ČPZP: počet pojištěnců 2025 = 117\s% stavu 2010 \(index 2010 = 100\)"/);
  assert.ok(!/style=/.test(svg), 'barva jen přes CSS');
  assert.match(mod.miniIndexSvg([]), /nedohledán/);
  assert.match(mod.miniIndexSvg([{ year: 2010, value: 5 }]), /nedohledán/);
  assert.match(mod.miniIndexSvg(null), /nedohledán/);
  assert.ok(!mod.miniIndexSvg([{ year: 2010, value: 1 }, { year: 2011, value: 2 }], { label: '<x>' }).includes('<x>'));
});

test('pojistovny.js: heroTiles ze system/system_crp, null → nedohledáno', () => {
  const t = mod.heroTiles(DATA);
  assert.equal(t.length, 4);
  assert.equal(t[0].value, DATA.system_crp.pojistenci_2025);
  assert.equal(t[1].value, DATA.system.vydaje_celkem_mld);
  assert.equal(t[2].value, DATA.system.saldo_mld);
  assert.equal(t[3].value, DATA.system.fond_prevence_naklady_celkem_mld);
  // fond prevence jen celkem, nikdy přepočet na pojištěnce (PS 7. 10. 2026, plán § 1.1)
  assert.ok(t.every((x) => !/na pojištěnce/.test(`${x.label} ${x.meta}`)), 'žádné Kč na pojištěnce v hero');
  // plán 2026 a kladné saldo z dat, ne natvrdo
  assert.match(t[1].meta, /570,8/);
  assert.match(t[2].meta, /−14,9/);
  assert.match(t[2].meta, /kladně jen VoZP a ZPŠ/);
  const d2 = copy(DATA);
  d2.system.plan_2026_vydaje_mld = 600;
  delete d2.system.plan_2026_saldo_mld;
  const t2 = mod.heroTiles(d2);
  assert.match(t2[1].meta, /600,0/);
  assert.doesNotMatch(t2[2].meta, /plán 2026/);
  assert.equal(mod.heroTiles(DATA, { bezFondu: true }).length, 3, 'přehled: tři dlaždice');
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  assert.doesNotMatch(src, /570,8|14,9 mld/, 'čísla plánu nejsou natvrdo ve zdroji');
  const html = viz.statTiles(t);
  assert.equal((html.match(/class="zpv-count" data-zpv-anim="count"/g) || []).length, 4);
  const empty = mod.heroTiles({});
  assert.ok(empty.every((x) => x.value === null));
  assert.equal((viz.statTiles(empty).match(/nedohledáno/g) || []).length, 4);
});

test('pojistovny.js: buildKmenCharts — vstupy pro všechny grafy modulu 3', () => {
  const ch = mod.buildKmenCharts(DATA);
  for (const k of ['share', 'senior', 'nzs', 'zust', 'provoz', 'trend', 'growth', 'yoy']) assert.ok(ch[k]?.opts?.title, `chybí graf ${k}`);
  // tržní podíl: 7 částí, žádné skládání do „Ostatní“
  assert.equal(ch.share.parts.length, 7);
  assert.equal(ch.share.opts.maxParts, 7);
  assert.ok(Math.abs(ch.share.parts.reduce((a, p) => a + p.value, 0) - 100) < 0.2);
  // reference: ČR průměr 65+ jako linka, náklady jako linka, rezervy jako zóna 3,5
  assert.deepEqual(ch.senior.opts.ref, { value: DATA.system_crp.podil_65plus_pct, label: 'průměr ČR', kind: 'line' });
  assert.equal(ch.nzs.opts.ref.value, DATA.system.naklady_zs_na_pojistence_kc);
  assert.match(ch.nzs.opts.sub, /akruálně/);
  assert.deepEqual(ch.zust.opts.ref, { from: 3, to: 4, value: 3.5, label: 'kritické pásmo 3–4 % výdajů', text: 'kritické pásmo 3–4 % výdajů', kind: 'zone-band' });
  assert.equal(ch.trend.opts.title, 'Vývoj kmene, index 2010 = 100');
  assert.ok(ch.zust.items.every((i) => /závazky po splatnosti/.test(i.tip)));
  // provoz: limit v tipu, null limit → „limit nedohledán“
  assert.match(ch.provoz.items.find((i) => i.kod === '201').tip, /limit nedohledán/);
  assert.match(ch.provoz.items.find((i) => i.kod === '111').tip, /limit 2,91\s%/);
  // standardizace: placeholder → poznámka, žádné standardizované číslo; index z přerozdělení → metoda v poznámce
  const phD = copy(DATA); for (const z of phD.pojistovny) Object.assign(z.hospodareni.naklady_na_pojistence_std_kc, { stav: 'placeholder-bez-vah', faktor: 1, hodnota: z.hospodareni.naklady_na_pojistence_kc.hodnota });
  assert.ok(mod.buildKmenCharts(phD).nzs.items.every((i) => i.note.includes(mod.STD_PENDING)));
  if (DATA.pojistovny[0].hospodareni.naklady_na_pojistence_std_kc?.stav === 'index-prerozdeleni') {
    assert.ok(ch.nzs.items.every((i) => /^přepočteno na index přerozdělení \d[\d\s]*\sKč$/.test(i.note) && !/standardizováno/.test(i.note)));
    assert.equal(ch.nzs.std, true);
    assert.equal(ch.nzs.dbItems.length, 7);
    assert.ok(ch.nzs.dbItems.every((i) => Number.isFinite(i.from) && Number.isFinite(i.to)));
    assert.match(ch.nzs.dbOpts.sub, /index přerozdělení MZ/);
    assert.match(ch.nzs.dbOpts.sub, /není to věková standardizace/);
    assert.equal(ch.nzs.dbOpts.title, 'Náklady na zdravotní služby na pojištěnce: vykázáno → přepočteno');
    assert.equal(ch.nzs.dbOpts.toLabel, 'přepočteno');
  }
  assert.equal(mod.buildKmenCharts(phD).nzs.std, false, 'bez standardizace zůstává žebříček');
  // kmen 2010–2025: 7 sérií po 16 bodech, index proti 2010
  assert.equal(ch.trend.series.length, 7);
  assert.ok(ch.trend.series.every((s) => s.points.length === 16 && s.points[0].year === 2010));
  assert.equal(ch.trend.opts.base, 2010);
  assert.match(ch.trend.opts.sub, /ukrajinských uprchlíků/);
  // změna 2015 → 2025: diverging (záporné hodnoty povolené), se znaménkem
  assert.equal(ch.growth.opts.allowNegative, true);
  assert.ok(ch.growth.items.some((i) => i.value < 0));
  const gh = viz.rankedBars(ch.growth.items, ch.growth.opts);
  assert.match(gh, /zpv-bar--neg/);
  assert.match(gh, /\+8,1\s%/);
});

test('pojistovny.js: standardizace „dolozeno“ jde do poznámky s hodnotou', () => {
  const d = copy(DATA);
  const std = d.pojistovny[0].hospodareni.naklady_na_pojistence_std_kc;
  Object.assign(std, { stav: 'dolozeno', hodnota: 45000 });
  const ch = mod.buildKmenCharts(d);
  assert.match(ch.nzs.items[0].note, /standardizováno na věk a pohlaví 45\s000\sKč/);
  assert.deepEqual(mod.stdInfo(d.pojistovny[0].hospodareni), { dolozeno: true, stav: 'dolozeno', hodnota: 45000, poznamka: std.poznamka, metoda: 'na věk a pohlaví' });
  const ph = copy(DATA); Object.assign(ph.pojistovny[0].hospodareni.naklady_na_pojistence_std_kc, { stav: 'placeholder-bez-vah', faktor: 1 });
  assert.equal(mod.stdInfo(ph.pojistovny[0].hospodareni).dolozeno, false);
  assert.match(mod.stdInfo(DATA.pojistovny[0].hospodareni).metoda || '', /index přerozdělení/);
  assert.equal(mod.stdInfo(undefined).dolozeno, false);
});

test('pojistovny.js: P3.4 2024 → 2025 — jen příjmy/náklady na pojištěnce, jinak věta místo grafu', () => {
  const ch = mod.buildKmenCharts(DATA);
  const with25 = DATA.pojistovny.filter((z) => z.hospodareni_2025 && Object.keys(z.hospodareni_2025).length);
  if (ch.yoy.metric) {
    assert.notEqual(ch.yoy.metric.key, 'fond_prevence_na_pojistence_kc');
    assert.deepEqual(ch.yoy.items.map((i) => i.kod), with25.map((z) => z.kod));
    assert.equal(ch.yoy.veta, '');
  } else {
    // dnešní data: VZ 2025 jen u části ZP a bez společné metriky → graf se nekreslí
    assert.deepEqual(ch.yoy.items, []);
    assert.match(ch.yoy.veta, /^Meziroční srovnání 2024 → 2025 doplníme, až budou výroční zprávy 2025 u všech pojišťoven/);
    for (const z of with25) assert.ok(ch.yoy.veta.includes(z.zkratka), z.zkratka);
    assert.match(ch.yoy.veta, /chybí\)\.$/);
  }
  // fond prevence na pojištěnce už není kandidát (PS 7. 10. 2026 ho odmítla jako ukazatel)
  const z = (kod, a, b) => ({ kod, zkratka: kod,
    hospodareni: { naklady_na_pojistence_kc: { hodnota: a }, fond_prevence_na_pojistence_kc: { hodnota: 1 } },
    hospodareni_2025: { naklady_na_pojistence_kc: { hodnota: b }, fond_prevence_na_pojistence_kc: { hodnota: 2 } } });
  assert.equal(mod.pickYoyMetric([z('111', 10, 11), z('201', 5, 6)]).key, 'naklady_na_pojistence_kc');
  assert.equal(mod.pickYoyMetric([z('111', 10, null), z('201', 5, 6)]), null);
  assert.equal(mod.pickYoyMetric([{ kod: '111', hospodareni: {}, hospodareni_2025: null }]), null);
  assert.equal(mod.pickYoyMetric([]), null);
  const none = mod.buildKmenCharts({ pojistovny: [{ kod: '111', zkratka: 'VZP', hospodareni: {}, crp: {} }] });
  assert.deepEqual(none.yoy.items, []);
  assert.match(viz.dumbbell(none.yoy.items, none.yoy.opts), /nedohledáno/);
});

test('pojistovny.js: tabulka hospodaření — 6 sloupců, další v detailu, řazení s null na konci', () => {
  assert.equal(mod.FIN_COLS.length, 6);
  assert.ok(!mod.FIN_COLS.some((c) => c.key === 'fpp'), 'Kč fondu prevence na pojištěnce jen v Dalších sloupcích');
  assert.ok(mod.FIN_MORE_COLS.some((c) => c.key === 'fpp'));
  assert.deepEqual(mod.FIN_COLS.filter((c) => c.bar).map((c) => c.key), ['npp', 'provoz']);
  const keys = new Set([...mod.FIN_COLS, ...mod.FIN_MORE_COLS].map((c) => c.key));
  assert.equal(keys.size, mod.FIN_COLS.length + mod.FIN_MORE_COLS.length, 'sloupce se neopakují');
  const rows = mod.buildFinRows(DATA);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].v.npp, DATA.pojistovny[0].hospodareni.naklady_na_pojistence_kc.hodnota);
  for (const r of rows) for (const k of keys) assert.ok(r.v[k] === null || Number.isFinite(r.v[k]), `${r.kod}.${k}`);
  const desc = mod.sortFinRows(rows, 'npp', 'desc').map((r) => r.v.npp);
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  const t = [{ kod: 'a', v: { x: 2 } }, { kod: 'b', v: { x: null } }, { kod: 'c', v: { x: 5 } }, { kod: 'd', v: { x: 2 } }];
  assert.deepEqual(mod.sortFinRows(t, 'x', 'desc').map((r) => r.kod), ['c', 'a', 'd', 'b']);
  assert.deepEqual(mod.sortFinRows(t, 'x', 'asc').map((r) => r.kod), ['a', 'd', 'c', 'b']);
  assert.deepEqual(t.map((r) => r.kod), ['a', 'b', 'c', 'd'], 'vstup se nemění');
  assert.deepEqual(mod.sortFinRows(null, 'x'), []);
});

test('pojistovny.json: crp.pojistenci_trend 2010–2025 sedí s kmenem 2025 a růstem 2015 → 2025', () => {
  for (const z of DATA.pojistovny) {
    const t = z.crp.pojistenci_trend;
    assert.equal(t.length, 16, z.kod);
    assert.equal(t[t.length - 1].insured, z.crp.pojistenci, `${z.kod}: poslední bod = pojištěnci 2025`);
    const g = (t.find((p) => p.year === 2025).insured / t.find((p) => p.year === 2015).insured - 1) * 100;
    assert.ok(Math.abs(g - z.crp.rust_2015_2025_pct) < 0.01, `${z.kod}: růst ${g} ≠ ${z.crp.rust_2015_2025_pct}`);
  }
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

test('validate-pojistovny: crp.pojistenci_trend — povinná, ≥ 10 bodů, roky vzestupně', () => {
  let sets = realSets();
  delete sets.pojistovny.pojistovny[0].crp.pojistenci_trend;
  fails(sets, /pojistenci_trend: chybí/);
  sets = realSets();
  sets.pojistovny.pojistovny[1].crp.pojistenci_trend = sets.pojistovny.pojistovny[1].crp.pojistenci_trend.slice(0, 9);
  fails(sets, /pojistenci_trend: příliš krátká řada \(9/);
  sets = realSets();
  sets.pojistovny.pojistovny[2].crp.pojistenci_trend[3].year = 2010;
  fails(sets, /pojistenci_trend\[3\]\.year/);
  sets = realSets();
  sets.pojistovny.pojistovny[2].crp.pojistenci_trend[4].insured = null;
  fails(sets, /pojistenci_trend\[4\]\.insured/);
  sets = realSets();
  sets.pojistovny.pojistovny[0].crp.pojistenci_trend.at(-1).insured += 1;
  const { errors, warnings } = validateAll(sets);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /poslední bod/.test(w)));
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
  delete s.verifikace; // WARN „nenalezeno ve VZ“ patří jinému testu (tests/pojistovny-vz.test.js)
  // analytické datasety (PLAN-SROVNAVAC-ANALYTIK.md) mají vlastní validátory i vlastní WARN (např. výběr 2024 vs. Tab. 1 MZ)
  for (const k of ['hospodareniRady', 'prerozdeleni', 'instituce', 'smluvniProgramy', 'dostupnost', 'segmenty']) delete s[k];
  s.prevence.pojistovny[0].fond_prevence_struktura.celkem.skutecnost += 100000;
  const { errors, warnings } = validateAll(s);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /součet položek .* ≠ celkem/);
  // v toleranci ±1 % bez varování
  const t = realSets();
  delete t.verifikace;
  for (const k of ['hospodareniRady', 'prerozdeleni', 'instituce', 'smluvniProgramy', 'dostupnost', 'segmenty']) delete t[k];
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

test('data/pojistovny*.json: poznámky bez jmen osob (jen funkce); jména z revize UI jsou pryč', () => {
  const jmena = /Kabátek|Kabátk|Duškov|Matta|Mattu|Šmehlík|Vojtěch|Diessl|Kostka|Kostk|Felix|Klimša|Janalík|Zdeněk Kab|Ivan Duš/;
  for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter((x) => /^pojistovny.*\.json$/.test(x))) {
    const txt = fs.readFileSync(path.join(ROOT, 'data', f), 'utf8');
    assert.doesNotMatch(txt, jmena, f);
  }
  const vzp = DATA.pojistovny.find((z) => z.kod === '111').poznamky.find((n) => /Změna vedení/.test(n));
  assert.match(vzp, /odvolala ředitele \(13 let ve funkci\), od 24\. 2\. 2026 ředitelem dosavadní náměstek/);
  for (const z of DATA.pojistovny) for (const n of z.poznamky || []) assert.doesNotMatch(n, /https?:\/\//, `${z.zkratka}: URL v textu poznámky`);
});

test('CSS: citace na Instituci se zalamují (overflow-wrap), pole přepínače jsou v bezpatkovém písmu', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8');
  assert.match(css, /\.zpc-inst-cit a[^{]*\{overflow-wrap:anywhere\}/);
  assert.match(css, /\.zpc-sit-select\{[^}]*font-family:var\(--sans\)/);
  assert.match(css, /\.zpi-chip, \.zpi-expand-all \{[^}]*font-family: var\(--sans\)/);
});
