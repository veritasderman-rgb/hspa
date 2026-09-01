// Plnění Zdraví 2035 — konzistence kurátorovaného mapování strategie
// na indikátory kontraktu (data/zdravi2035-plneni.json).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.resolve(ROOT, f), 'utf8'));

const plneni = read('data/zdravi2035-plneni.json');
const known = new Set(read('data/indicators.json').indicators.map(i => i.id));

const allMappedIds = () => {
  const ids = new Set();
  for (const sc of plneni.cile) {
    for (const d of sc.dilci_cile ?? []) for (const id of d.indikatory ?? []) ids.add(id);
    for (const di of sc.doc_indicators ?? []) if (di.mapping?.indicator_id) ids.add(di.mapping.indicator_id);
    for (const id of sc.kontext_indikatory ?? []) ids.add(id);
  }
  for (const r of plneni.ramcove_indikatory ?? []) if (r.mapping?.indicator_id) ids.add(r.mapping.indicator_id);
  return ids;
};

test('zdravi2035 · struktura dokumentu sedí (3 strategické cíle, 12 SC)', () => {
  assert.equal(plneni.strategic_goals.length, 3);
  assert.equal(plneni.cile.length, 12);
  const dcTotal = plneni.cile.reduce((n, s) => n + (s.dilci_cile?.length ?? 0), 0);
  assert.ok(dcTotal >= 100, `čekáno přes 100 dílčích cílů, je ${dcTotal}`);
  // Číslo SC musí patřit pod svůj strategický cíl — 1.x → sg1 atd.
  const goalNum = Object.fromEntries(plneni.strategic_goals.map(g => [g.id, g.num]));
  for (const sc of plneni.cile) {
    assert.ok(sc.sc.startsWith(`${goalNum[sc.goal]}.`), `SC ${sc.sc} přiřazen k cíli ${sc.goal}`);
  }
});

test('zdravi2035 · každý mapovaný indikátor existuje v kontraktu i jako stránka', () => {
  for (const id of allMappedIds()) {
    assert.ok(known.has(id), `indikátor „${id}“ není v kontraktu`);
    // Čipy na stránce odkazují na statické indikator-*.html — mrtvý odkaz
    // by poslal čtenáře uprostřed argumentu na 404.
    assert.ok(fs.existsSync(path.resolve(ROOT, `indikator-${id}.html`)),
      `chybí statická stránka indikator-${id}.html (spusť scripts/generate-indicator-pages.js)`);
  }
});

test('zdravi2035 · poctivost mapování: enumy, proxy s poznámkou, proces bez indikátorů', () => {
  for (const sc of plneni.cile) {
    for (const d of sc.dilci_cile ?? []) {
      assert.ok(['primo', 'proxy', 'proces'].includes(d.mereni), `${d.num}: mereni=${d.mereni}`);
      if (d.mereni === 'proces') {
        assert.equal((d.indikatory ?? []).length, 0, `${d.num}: procesní úkol s indikátory`);
      }
    }
    for (const di of sc.doc_indicators ?? []) {
      const m = di.mapping;
      assert.ok(['primo', 'proxy', 'chybi'].includes(m.match));
      if (m.match === 'chybi') assert.ok(!m.indicator_id, `${di.name}: chybi s indicator_id`);
      else assert.ok(m.indicator_id, `${di.name}: ${m.match} bez indicator_id`);
      if (m.match === 'proxy') {
        assert.ok(m.note, `${di.name}: proxy bez vysvětlení, v čem se metodiky liší`);
      }
      if (di.baseline?.value != null) assert.ok(di.baseline.year, `${di.name}: baseline bez roku`);
    }
  }
});

test('zdravi2035 · hodnoty dokumentu se nepřepisují — kotvy z PDF drží', () => {
  // Namátkové kotvy proti tichému „vylepšení“ čísel při budoucí editaci:
  // hodnoty musí zůstat přesně ty z dokumentu, i ty podivné.
  const sc11 = plneni.cile.find(s => s.sc === '1.1');
  const kuraci = sc11.doc_indicators.find(d => d.name.includes('denních kuřáků'));
  assert.equal(kuraci.baseline.value, '15,9 %');
  assert.equal(kuraci.target_2035.value, '15 %');
  assert.equal(kuraci.mapping.indicator_id, 'kuractvi_denni');

  const vydaje = sc11.doc_indicators.find(d => d.name.includes('veřejných výdajů na prevenci'));
  assert.match(vydaje.note ?? '', /NIŽŠÍ/, 'podivnost 5,2→4,5 % musí zůstat přiznaná');

  const sc21 = plneni.cile.find(s => s.sc === '2.1');
  const prohlidky = sc21.doc_indicators.find(d => d.name.includes('preventivní prohlídkou'));
  assert.equal(prohlidky.target_2035.value, '74,1 %');
  assert.equal(prohlidky.mapping.match, 'primo');
});

test('zdravi2035 · vazba na web: strategie nese plneni_url, sitemap zná stránku', () => {
  const strategies = read('data/strategies.json').strategies;
  const z35 = strategies.find(s => s.id === plneni.strategy_id);
  assert.ok(z35, 'strategie zdravi_2035 chybí v registru');
  assert.equal(z35.plneni_url, 'zdravi-2035.html');

  const sitemap = fs.readFileSync(path.resolve(ROOT, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('/zdravi-2035<') || sitemap.includes('/zdravi-2035.html<'),
    'zdravi-2035 chybí v sitemapě');
});

test('zdravi2035 · SC bez dílčích cílů to musí vysvětlit (3.1)', () => {
  const sc31 = plneni.cile.find(s => s.sc === '3.1');
  assert.equal((sc31.dilci_cile ?? []).length, 0);
  assert.match(sc31.dilci_cile_note, /Koncepce zdravotnického výzkumu/);
  // …a jeho poznámka říká, PROČ tu žádný populační indikátor není.
  assert.match(sc31.poznamka ?? '', /vlastnost cíle, ne mezera/);
});
