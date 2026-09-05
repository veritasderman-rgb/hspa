// Model „Kdo se o nás postará v roce 2035“ (src/ltc-engine.js) proti
// vlastním tabulkám studie Deloitte/APSS (data/ltc-scenare.json).
//
// Model nesmí vymýšlet: pro čtyři scénáře studie musí dát (v toleranci
// zaokrouhlení tabulek) stejné počty klientů, rodin i náklady. Když se
// parametry v datech změní, tenhle test řekne, který scénář přestal sedět.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paramsFromData, simulate, baseline, year2024, roundThousands } from '../src/ltc-engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ltc-scenare.json'), 'utf8'));
const P = paramsFromData(data);
const byId = Object.fromEntries(data.scenarios.map(s => [s.id, s]));

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${Math.round(actual)} vs. studie ${expected} (±${tol})`);

test('ltc-scenare.json · každý parametr má citaci a stranu ze studie', () => {
  assert.match(data.source.url, /^https:\/\/www\.apsscr\.cz\//);
  assert.ok(data.source.caveat.includes('na zakázku'), 'zdroj přiznává, kdo studii objednal');
  for (const key of ['residential', 'terenni', 'neformalni']) {
    assert.ok(data.baseline_2024[key].quote && data.baseline_2024[key].page, `baseline_2024.${key}: quote + page`);
    assert.ok(data.base_2035[key].quote && data.base_2035[key].page, `base_2035.${key}: quote + page`);
  }
  for (const key of ['divert_share', 'days_per_fte', 'investment']) {
    assert.ok(data.model[`${key}_quote`] && data.model[`${key}_page`], `model.${key}: quote + page`);
  }
  assert.equal(data.scenarios.length, 4);
  for (const s of data.scenarios) assert.ok(s.expected.cost_total_mld > 0 && s.page, `${s.id}: expected + page`);
});

test('rok 2024 · součty sedí na tabulku 3 (92 / 96 / 139 tis. osob, ~80 mld.)', () => {
  const y = year2024(P);
  assert.equal(y.residential.served, 92000);
  assert.equal(y.terenni.served, 96000);
  assert.equal(y.neformalni.persons, 139000);
  assert.equal(y.personsTotal, 327000);
  near(y.costs.res + y.costs.ter + y.costs.inf, 80, 4, 'náklad 2024 z jednotkových nákladů');
});

test('základní scénář · 135 / 141 / 190 tis. osob, 136 tis. FTE rodin, ~137 mld.', () => {
  const s = byId.zs;
  const r = simulate(s.inputs, P);
  near(r.residential.served, s.expected.residential_clients, 1500, 'pobytoví klienti');
  near(r.terenni.served, s.expected.terenni_clients, 1000, 'terénní klienti');
  near(r.neformalni.persons, s.expected.neformalni_persons, 1000, 'osoby v neformální péči');
  near(r.neformalni.fte, s.expected.neformalni_fte, 3000, 'FTE neformálních pečujících');
  near(r.costs.total, s.expected.cost_total_mld, 3, 'celkový náklad');
  assert.equal(r.residential.shortfall, 0);
  assert.equal(r.neformalni.added, 0);
  near(r.personsTotal, data.base_2035.total_need_persons, 2000, 'celková potřeba péče');
  // baseline() = totéž bez zadávání vstupů
  near(baseline(P).costs.total, r.costs.total, 0.5, 'baseline() = základní scénář');
});

test('scénář 1 · zmrazení lůžek: 43 tis. bez pobytu, 17 tis. do terénu, 26 tis. rodinám (+18 tis. FTE), ~121 mld.', () => {
  const s = byId.s1;
  const r = simulate(s.inputs, P);
  near(r.residential.served, s.expected.residential_clients, 1500, 'pobytoví klienti');
  near(r.residential.shortfall, s.expected.residential_shortfall, 1500, 'bez pobytového místa');
  near(r.terenni.diverted, 17000, 1500, 'přesměrováno do terénu');
  near(r.terenni.served, s.expected.terenni_clients, 2000, 'terénní klienti');
  near(r.neformalni.added, s.expected.neformalni_added, 1500, 'osob navíc v rodinách');
  near(r.neformalni.addedFte, s.expected.neformalni_added_fte, 1500, 'FTE rodin navíc');
  near(r.costs.total, s.expected.cost_total_mld, 4, 'celkový náklad');
  assert.ok(r.costs.total < byId.zs.expected.cost_total_mld, 'formálně levnější než základní scénář');
});

test('scénář 1.1 · zmrazení všeho: terén na 96 tis., 88 tis. osob navíc rodinám (+62 tis. FTE), ~123 mld.', () => {
  const s = byId.s11;
  const r = simulate(s.inputs, P);
  near(r.terenni.served, s.expected.terenni_clients, 1500, 'terénní klienti');
  assert.equal(r.terenni.diverted, 0, 'bez pečovatelů se do terénu nikdo nepřesune');
  near(r.neformalni.added, s.expected.neformalni_added, 2000, 'osob navíc v rodinách');
  near(r.neformalni.addedFte, s.expected.neformalni_added_fte, 2000, 'FTE rodin navíc');
  near(r.costs.total, s.expected.cost_total_mld, 4, 'celkový náklad');
});

test('scénář 2 · vše do pobytových služeb: 231 tis. klientů, terén i rodiny na úrovni 2024, ~180 mld.', () => {
  const s = byId.s2;
  const r = simulate(s.inputs, P);
  near(r.residential.served, s.expected.residential_clients, 1500, 'pobytoví klienti');
  near(r.terenni.served, s.expected.terenni_clients, 1000, 'terénní klienti');
  near(r.neformalni.persons, s.expected.neformalni_persons, 1000, 'osoby v neformální péči');
  near(r.costs.total, s.expected.cost_total_mld, 4, 'celkový náklad');
  assert.equal(r.residential.shortfall, 0);
  assert.ok(r.investmentMld > 200, 'investice do lůžek ve stovkách mld.');
});

test('model · invarianty: celková potřeba péče je stálá, nic nezmizí ani nevznikne', () => {
  const total = data.base_2035.total_need_persons;
  for (const beds of [76000, 90000, 111000, 150000, 190000]) {
    for (const fte of [34000, 45000, 55000, 70000]) {
      for (const divertShare of [0, 0.2, 0.4]) {
        const r = simulate({ beds, fte, divertShare }, P);
        near(r.personsTotal, total, 2000, `beds=${beds} fte=${fte} share=${divertShare}: součet osob`);
        assert.ok(r.residential.shortfall >= 0 && r.neformalni.added >= 0 && r.terenni.diverted >= 0);
        assert.ok(r.terenni.served <= r.terenni.capacity + 1e-6, 'terén nepřekročí kapacitu pečovatelů');
        assert.ok(r.residential.served <= r.residential.capacity + 1e-6, 'pobyt nepřekročí kapacitu lůžek');
      }
    }
  }
});

test('model · monotónnost: víc lůžek nikdy nezvýší zátěž rodin; víc pečovatelů ji nikdy nezvýší', () => {
  let prev = Infinity;
  for (let beds = 76000; beds <= 190000; beds += 5000) {
    const r = simulate({ beds, fte: 55000, divertShare: 0.4 }, P);
    assert.ok(r.neformalni.persons <= prev + 1e-6, `beds=${beds}: rodiny ${r.neformalni.persons} > ${prev}`);
    prev = r.neformalni.persons;
  }
  prev = Infinity;
  for (let fte = 34000; fte <= 70000; fte += 2000) {
    const r = simulate({ beds: 76000, fte, divertShare: 0.4 }, P);
    assert.ok(r.neformalni.persons <= prev + 1e-6, `fte=${fte}: rodiny ${r.neformalni.persons} > ${prev}`);
    prev = r.neformalni.persons;
  }
  assert.equal(roundThousands(25640), 26000);
});

// ── stránka a registrace ─────────────────────────────────────────────────

test('kalkulacka-pece-2035.html · hostitelské prvky, registrace nástroje, sitemap, a11y sken', () => {
  const html = fs.readFileSync(path.join(ROOT, 'kalkulacka-pece-2035.html'), 'utf8');
  for (const id of ['ltcPresets', 'ltcSliders', 'ltcSummary', 'ltcKpis', 'ltcBarsPersons', 'ltcBarsCost', 'ltcTable', 'ltcSources', 'toolSiblings']) {
    assert.ok(html.includes(`id="${id}"`), `chybí #${id}`);
  }
  assert.ok(html.includes('src/ltc-kalkulacka.js'));
  assert.ok(html.includes('na zakázku'), 'stránka říká, kdo studii objednal');
  const shared = fs.readFileSync(path.join(ROOT, 'src/page-shared.js'), 'utf8');
  assert.ok(shared.includes("href: 'kalkulacka-pece-2035.html'"), 'nástroj je v SITE_TOOLS');
  const sitemap = fs.readFileSync(path.join(ROOT, 'scripts/generate-sitemap.js'), 'utf8');
  assert.ok(sitemap.includes("'/kalkulacka-pece-2035.html'"), 'stránka je ve STATIC_PAGES');
  const axe = fs.readFileSync(path.join(ROOT, 'tests/a11y/axe-scan.mjs'), 'utf8');
  assert.ok(axe.includes("'kalkulacka-pece-2035.html'"), 'stránka je v a11y skenu');
  const css = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
  for (const sel of ['.ltc-layout', '.ltc-kpi', '.ltc-seg-res', '.ltc-seg-ter', '.ltc-seg-inf', '--ltc-label-ter']) {
    assert.ok(css.includes(sel), `chybí ${sel}`);
  }
});
