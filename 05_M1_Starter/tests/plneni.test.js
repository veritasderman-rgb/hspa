// Testy datasetů „Plní se …?" (data/plneni-*.json) — generická pravidla
// pro všechny strategie rozložené na cíle → úkoly → indikátory.
// Zdraví 2035 má vlastní přísnější testy v tests/zdravi2035.test.js;
// tady se hlídá, že žádný dataset neodkazuje do prázdna a že mapování
// zůstává poctivé. Kotvy hodnot z PDF per strategie jsou dole — brání
// tichému přepsání hodnot dokumentu při budoucích editacích.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const DATASETS = [
  { file: 'data/plneni-onko-2030.json', page: 'plneni-onko-2030.html', strategy: 'narodni_onkologicky_plan_2030' },
  { file: 'data/plneni-kv-2035.json', page: 'plneni-kv-2035.html', strategy: 'narodni_kvplan_2035' },
  { file: 'data/plneni-amr.json', page: 'plneni-amr.html', strategy: 'nap_amr' },
  { file: 'data/plneni-dusevni-zdravi.json', page: 'plneni-dusevni-zdravi.html', strategy: 'reforma_dusevni_zdravi' },
  { file: 'data/plneni-zdravi-2030.json', page: 'plneni-zdravi-2030.html', strategy: 'zdravi_2030' },
];

const indicators = new Set(read('data/indicators.json').indicators.map(i => i.id));
const strategies = read('data/strategies.json').strategies;
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');

for (const ds of DATASETS) {
  const d = read(ds.file);

  test(`plneni · ${ds.file}: struktura a vazba na registr`, () => {
    assert.equal(d.strategy_id, ds.strategy);
    assert.ok((d.strategic_goals ?? []).length >= 1, 'aspoň jedna skupina cílů');
    assert.ok((d.cile ?? []).length >= 3, 'aspoň tři cíle');
    assert.ok(d.document?.url, 'dokument má URL');
    assert.ok(d.extracted_at, 'extracted_at');
    const strat = strategies.find(s => s.id === ds.strategy);
    assert.ok(strat, 'strategie v registru');
    assert.equal(strat.plneni_url, ds.page, 'plneni_url míří na stránku');
  });

  test(`plneni · ${ds.file}: každý mapovaný indikátor existuje v kontraktu i jako stránka`, () => {
    const ids = new Set();
    for (const c of d.cile) {
      for (const dc of c.dilci_cile ?? []) for (const i of dc.indikatory ?? []) ids.add(i);
      for (const di of c.doc_indicators ?? []) if (di.mapping?.indicator_id) ids.add(di.mapping.indicator_id);
      for (const i of c.kontext_indikatory ?? []) ids.add(i);
    }
    for (const r of d.ramcove_indikatory ?? []) if (r.mapping?.indicator_id) ids.add(r.mapping.indicator_id);
    assert.ok(ids.size >= 5, `aspoň 5 mapovaných indikátorů (je ${ids.size})`);
    for (const id of ids) {
      assert.ok(indicators.has(id), `${id} je v kontraktu`);
      assert.ok(fs.existsSync(path.join(ROOT, `indikator-${id}.html`)), `indikator-${id}.html existuje`);
    }
  });

  test(`plneni · ${ds.file}: poctivost mapování (enumy, proces bez indikátorů)`, () => {
    for (const c of d.cile) {
      for (const dc of c.dilci_cile ?? []) {
        assert.ok(['primo', 'proxy', 'proces'].includes(dc.mereni), `${dc.num}: mereni`);
        if (dc.mereni === 'proces') assert.equal((dc.indikatory ?? []).length, 0, `${dc.num}: proces bez indikátorů`);
      }
      for (const di of c.doc_indicators ?? []) {
        assert.ok(['primo', 'proxy', 'chybi'].includes(di.mapping?.match), `${di.name}: match`);
        if (di.mapping.match === 'proxy') assert.ok(di.mapping.note, `${di.name}: proxy má vysvětlení`);
        if (di.mapping.match === 'chybi') assert.ok(!di.mapping.indicator_id, `${di.name}: chybi bez id`);
      }
    }
  });

  test(`plneni · ${ds.file}: stránka existuje, je v sitemapě a čte správný dataset`, () => {
    const page = path.join(ROOT, ds.page);
    assert.ok(fs.existsSync(page), `${ds.page} existuje`);
    const html = fs.readFileSync(page, 'utf8');
    assert.ok(html.includes(`data-plneni-data="${ds.file}"`), 'body nese data-plneni-data');
    assert.ok(html.includes('src/plneni-page.js'), 'stránka bootstrapuje sdílený renderer');
    assert.ok(sitemap.includes(`/${ds.page.replace('.html', '')}`), `${ds.page} v sitemapě`);
  });
}

// ── kotvy hodnot z PDF (per strategie) ────────────────────────────────────
// Doplňované po extrakci: brání tichému přepsání hodnot dokumentu.

function anchorTest(file, name, fn) {
  test(`plneni-kotvy · ${file}: ${name}`, () => fn(read(file)));
}

anchorTest('data/plneni-amr.json', 'usnesení 75/2019, jediné populační kritérium III.2, 26/30 procesních', (d) => {
  assert.equal(d.document.approved, '2019-01-28');
  assert.ok(d.document.approval.includes('75'), 'usnesení č. 75');
  const dcs = d.cile.flatMap(c => c.dilci_cile);
  assert.equal(dcs.length, 30);
  assert.equal(dcs.filter(x => x.mereni === 'proces').length, 26);
  const iii2 = dcs.find(x => x.num.startsWith('III.2'));
  assert.equal(iii2.mereni, 'primo');
  assert.deepEqual(iii2.indikatory, ['spotreba_antibiotik']);
  assert.ok(iii2.kriterium.includes('DDD/1000'), 'kritérium dokumentu doslova');
});

anchorTest('data/plneni-onko-2030.json', 'HPV 63,9→90, kolorektální screening 29,5→60, mortalita proxy', (d) => {
  assert.equal(d.document.approved, '2022-06-22');
  const rams = d.ramcove_indikatory;
  const hpv = rams.find(r => /HPV/.test(r.name));
  assert.ok(hpv.baseline.value.includes('63,9'), 'HPV výchozí 63,9 % doslova');
  assert.ok((hpv.target_2035 ?? hpv.target).value.includes('90'), 'HPV cíl 90 %');
  assert.equal(hpv.mapping.match, 'primo');
  const kolo = rams.find(r => /olorektální|TOKS|tlustého střeva/i.test(r.name));
  assert.ok(kolo.baseline.value.includes('29,5'), 'kolorektální výchozí 29,5 %');
  const mort = rams.find(r => /mrtnost|ortalita/.test(r.name));
  assert.equal(mort.mapping.match, 'proxy', 'hrubá vs. standardizovaná míra = proxy');
});

anchorTest('data/plneni-kv-2035.json', 'chybějící příloha s hodnotami, kapacitní cíl ambulancí 6→7', (d) => {
  // Plán slibuje tabulku indikátorů s hodnotami v příloze, která v publikovaném
  // PDF není — dataset proto nesmí rámcové hodnoty vymýšlet.
  assert.equal((d.ramcove_indikatory ?? []).length, 0, 'plán nepublikoval vlastní tabulku hodnot');
  const c13 = d.cile.find(c => String(c.sc) === '1.3');
  const amb = c13.doc_indicators.find(di => di.name.includes('1.3.2'));
  assert.ok(amb.baseline.value.includes('6 míst'), 'výchozí hustota ambulancí doslova');
  assert.ok((amb.target_2035 ?? amb.target).value.includes('7'), 'cíl 7 míst na 100 tisíc');
  const dcs = d.cile.flatMap(c => c.dilci_cile);
  assert.equal(dcs.length, 101);
  assert.equal(d.cile.length, 16);
});

anchorTest('data/plneni-dusevni-zdravi.json', 'CDZ 1/100k a rozpor NAPDZ 2/3 vs. 4100 lůžek', (d) => {
  const all = JSON.stringify(d);
  assert.ok(/100 000/.test(all), 'cíl hustoty CDZ');
  assert.ok(all.includes('8490') || all.includes('8 490'), 'výchozí následná lůžka NAPDZ');
  assert.ok(all.includes('4100') || all.includes('4 100'), 'indikátor NAPDZ — rozpor s 2/3 přiznán');
  const goals = d.strategic_goals.map(g => g.id);
  assert.equal(goals.length, 2, 'dvě skupiny: Strategie 2013 + NAPDZ');
});

anchorTest('data/plneni-zdravi-2030.json', 'prohlídky 63,2→74,1, preventabilní 256,8→228,9, hodnocení u všech cílů', (d) => {
  const all = JSON.stringify(d);
  assert.ok(all.includes('63,2') && all.includes('74,1'), 'preventivní prohlídky doslova');
  assert.ok(all.includes('256,8') && all.includes('228,9'), 'preventabilní úmrtí doslova');
  assert.equal(d.cile.length, 7);
  assert.equal(d.cile.filter(c => c.hodnoceni).length, 7, 'oficiální hodnocení u každého cíle');
  for (const c of d.cile.filter(c => c.hodnoceni)) {
    assert.ok(/Zpráv|zpráv/.test(c.hodnoceni.zdroj) && /str\./.test(c.hodnoceni.zdroj), `${c.sc}: zdroj se stranou`);
  }
});

