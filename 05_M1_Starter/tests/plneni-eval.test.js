// Testy vyhodnocovací logiky plnění strategií (src/plneni-eval.js).
// Hlídají poctivost: složené hodnoty se nesrovnávají, proxy se nikdy
// neměří proti cílům dokumentu, směr „méně je cíl" funguje bez zvláštního
// zacházení a řádový nesoulad končí jako „nelze", ne jako nesmyslné číslo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCzNumber,
  computeTrajectory,
  evaluateDocIndicator,
  aggregateScore,
  BUCKET_ORDER,
} from '../src/plneni-eval.js';

test('parseCzNumber: česká čísla s jednotkami', () => {
  assert.equal(parseCzNumber('15,9 %'), 15.9);
  assert.equal(parseCzNumber('79,9 let'), 79.9);
  assert.equal(parseCzNumber('63,9%'), 63.9);
  assert.equal(parseCzNumber('1 234'), 1234);
  assert.equal(parseCzNumber('cca 90 %'), 90);
  assert.equal(parseCzNumber(74.1), 74.1);
  // jmenovatel není druhé číslo
  assert.equal(parseCzNumber('256,8 na 100 000 obyvatel'), 256.8);
  assert.equal(parseCzNumber('13,6 na 1 000 obyvatel'), 13.6);
  assert.equal(parseCzNumber('1 CDZ na cca 100 000 obyvatel'), 1);
  // pomlčka jako prozaický oddělovač — hodnota je před ní
  assert.equal(parseCzNumber('0 center — pilíř CDZ v roce 2013 neexistoval'), 0);
});

test('parseCzNumber: složené hodnoty a intervaly poctivě odmítne', () => {
  assert.equal(parseCzNumber('muži 62,7 / ženy 64,0 let'), null);
  assert.equal(parseCzNumber('5–10 %'), null);
  assert.equal(parseCzNumber('60 až 70'), null);
  assert.equal(parseCzNumber('IV. kvartil'), null, 'dvě „čísla" (IV je text, 4 není číslice) — jen jedno skutečné');
  assert.equal(parseCzNumber(''), null);
  assert.equal(parseCzNumber(null), null);
});

test('computeTrajectory: higher-is-better cesta k cíli', () => {
  // prohlídky 63,2 % → cíl 74,1 %, dnes 68,7 % ⇒ zhruba půlka cesty
  const t = computeTrajectory({ baselineValue: '63,2 %', baselineYear: 2019, targetValue: '74,1 %', current: 68.7, currentYear: 2024 });
  assert.equal(t.status, 'na-ceste');
  assert.ok(t.progressPct >= 45 && t.progressPct <= 55, `progress ${t.progressPct}`);
});

test('computeTrajectory: lower-is-better funguje bez zvláštní větve', () => {
  // kuřáctví 24 % → cíl 15 %, dnes 20 % ⇒ ~44 % cesty (span je záporný)
  const t = computeTrajectory({ baselineValue: '24 %', baselineYear: 2020, targetValue: '15 %', current: 20, currentYear: 2024 });
  assert.equal(t.status, 'na-ceste');
  assert.ok(t.progressPct >= 40 && t.progressPct <= 50, `progress ${t.progressPct}`);
  // a zhoršení jde do opačného směru
  const w = computeTrajectory({ baselineValue: '24 %', baselineYear: 2020, targetValue: '15 %', current: 27, currentYear: 2024 });
  assert.equal(w.status, 'opacny-smer');
});

test('computeTrajectory: splněno, beze změny, guardy', () => {
  assert.equal(computeTrajectory({ baselineValue: '10', baselineYear: 2020, targetValue: '20', current: 21, currentYear: 2024 }).status, 'splneno');
  assert.equal(computeTrajectory({ baselineValue: '10', baselineYear: 2020, targetValue: '20', current: 10.2, currentYear: 2024 }).status, 'beze-zmeny');
  // cíl = výchozí stav (DRG 1 → 1)
  assert.equal(computeTrajectory({ baselineValue: '1', baselineYear: 2023, targetValue: '1', current: 1, currentYear: 2024 }).status, 'nelze');
  // naše hodnota starší než výchozí stav dokumentu
  assert.equal(computeTrajectory({ baselineValue: '10', baselineYear: 2023, targetValue: '20', current: 15, currentYear: 2022 }).status, 'nelze');
  // řádový nesoulad (procenta vs. počty)
  assert.equal(computeTrajectory({ baselineValue: '5 %', baselineYear: 2023, targetValue: '6 %', current: 1400, currentYear: 2024 }).status, 'nelze');
});

test('computeTrajectory: artefakty se nevydávají za verdikty', () => {
  // stejný rok = srovnání metodik, ne posun (obezita 19,3 vs. 19,8 v 2019)
  assert.equal(computeTrajectory({ baselineValue: '19,3 %', baselineYear: 2019, targetValue: '17 %', current: 19.8, currentYear: 2019 }).status, 'nelze');
  // rok v textu místo hodnoty („program spuštěn 2024" → 2024 vs. cíl 30 %)
  assert.equal(computeTrajectory({ baselineValue: 'program spuštěn 2024', baselineYear: 2023, targetValue: '30 %', current: 53.3, currentYear: 2024 }).status, 'nelze');
  // pokles větší než celá dráha za jeden rok = metodický nesoulad, ne verdikt
  assert.equal(computeTrajectory({ baselineValue: '40 %', baselineYear: 2023, targetValue: '45 %', current: 31.1, currentYear: 2024 }).status, 'nelze');
  // malý span ale plauzibilní pohyb zůstává verdiktem (kuřáci 15,9→15, dnes 16,4)
  assert.equal(computeTrajectory({ baselineValue: '15,9 %', baselineYear: 2023, targetValue: '15 %', current: 16.4, currentYear: 2024 }).status, 'opacny-smer');
  // jednotkový nesoulad: počet zařízení (30 CDZ) vs. naše míra na 100 tisíc (0,37)
  assert.equal(computeTrajectory({ baselineValue: '30 CDZ', baselineYear: 2022, targetValue: '100 CDZ', current: 0.37, currentYear: 2024 }).status, 'nelze');
});

test('evaluateDocIndicator: proxy se nikdy neměří proti cílům dokumentu', () => {
  const di = {
    baseline: { value: '5,2 %', year: 2023 },
    target: { value: '4,5 %' },
    mapping: { match: 'proxy', indicator_id: 'x', note: 'jiný jmenovatel' },
  };
  const r = evaluateDocIndicator(di, { value: 4.8, year: 2024 });
  assert.equal(r.bucket, 'sledujeme');
});

test('evaluateDocIndicator: chybi → neměříme, primo bez čísel → sledujeme', () => {
  assert.equal(evaluateDocIndicator({ mapping: { match: 'chybi' } }, null).bucket, 'nemerime');
  const composite = {
    baseline: { value: 'muži 62,7 / ženy 64,0', year: 2017 },
    target: { value: 'muži 65,7 / ženy 66,0' },
    mapping: { match: 'primo', indicator_id: 'x' },
  };
  assert.equal(evaluateDocIndicator(composite, { value: 63.1, year: 2024 }).bucket, 'sledujeme');
});

test('aggregateScore: každý indikátor dokumentu padne právě do jednoho koše', () => {
  const plneni = {
    ramcove_indikatory: [
      { baseline: { value: '10 %', year: 2020 }, target: { value: '20 %' }, mapping: { match: 'primo', indicator_id: 'a' } },
    ],
    cile: [{
      sc: '1.1',
      doc_indicators: [
        { baseline: { value: '30', year: 2020 }, target: { value: '20' }, mapping: { match: 'primo', indicator_id: 'b' } },
        { mapping: { match: 'chybi' } },
        { baseline: { value: '5', year: 2020 }, target: { value: '9' }, mapping: { match: 'proxy', indicator_id: 'c', note: 'n' } },
      ],
    }],
  };
  const indMap = new Map([
    ['a', { value: 15, year: 2024 }],   // na cestě
    ['b', { value: 31, year: 2024 }],   // opačný směr (lower-is-better)
    ['c', { value: 7, year: 2024 }],    // proxy → sledujeme
  ]);
  const { counts, total, perSc } = aggregateScore(plneni, indMap);
  assert.equal(total, 4);
  assert.equal(Object.values(counts).reduce((x, y) => x + y, 0), total);
  assert.equal(counts['na-ceste'], 1);
  assert.equal(counts['opacny-smer'], 1);
  assert.equal(counts.sledujeme, 1);
  assert.equal(counts.nemerime, 1);
  assert.deepEqual(Object.keys(perSc.get('1.1')), BUCKET_ORDER);
});
