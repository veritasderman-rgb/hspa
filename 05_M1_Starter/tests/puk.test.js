// Testy PUK scraperu.
// Ověřuje selektorové strategie proti syntetickým HTML fixturám,
// transform vrstvu a chování při fetch chybách.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';

import {
  extractNationalValue,
  extractRegionalBreakdown,
  extractCanvasJsSeries,
  extractStripLineValues,
  pickLatestStripLine,
  extractKrajYearMatrix,
} from '../ingest/fetchers/puk.js';

test('extractNationalValue — data-attr strategy', () => {
  const html = `<html><body>
    <div data-value-national="1.03" data-unit="%" data-year="2024">obsah</div>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractNationalValue($);
  assert.equal(r.value, 1.03);
  assert.equal(r.unit, '%');
  assert.equal(r.year, 2024);
  assert.equal(r.strategy, 'data-attr');
});

test('extractNationalValue — class-named strategy', () => {
  const html = `<html><body>
    <div class="narodni-hodnota">5,2 % (rok 2024)</div>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractNationalValue($);
  assert.equal(r.value, 5.2);
  assert.equal(r.unit, '%');
  assert.equal(r.year, 2024);
  assert.equal(r.strategy, 'class-named');
});

test('extractNationalValue — table-row strategy', () => {
  const html = `<html><body>
    <table>
      <tr><th>Národní průměr</th><td>11,2 %</td></tr>
      <tr><th>Praha</th><td>9,1 %</td></tr>
    </table>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractNationalValue($);
  assert.equal(r.value, 11.2);
  assert.equal(r.unit, '%');
  assert.equal(r.strategy, 'table-row');
});

test('extractNationalValue — meta tag strategy', () => {
  const html = `<html><head>
    <meta name="ukazatel-hodnota" content="0.78">
  </head><body></body></html>`;
  const $ = cheerio.load(html);
  const r = extractNationalValue($);
  assert.equal(r.value, 0.78);
  assert.equal(r.strategy, 'meta-tag');
});

test('extractNationalValue — none-matched returns null safely', () => {
  const html = `<html><body><p>žádné data</p></body></html>`;
  const $ = cheerio.load(html);
  const r = extractNationalValue($);
  assert.equal(r.value, null);
  assert.equal(r.strategy, 'none-matched');
});

test('extractRegionalBreakdown — table-by-label strategy (full 14 regions)', () => {
  const regions = [
    'Praha', 'Středočeský', 'Jihočeský', 'Plzeňský', 'Karlovarský',
    'Ústecký', 'Liberecký', 'Královéhradecký', 'Pardubický',
    'Vysočina', 'Jihomoravský', 'Olomoucký', 'Zlínský', 'Moravskoslezský',
  ];
  const rows = regions.map((r, i) => `<tr><th>${r}</th><td>${(i + 5).toFixed(1).replace('.', ',')} %</td></tr>`).join('');
  const html = `<html><body><table>${rows}</table></body></html>`;
  const $ = cheerio.load(html);
  const r = extractRegionalBreakdown($);
  assert.equal(r.strategy, 'table-by-label');
  assert.equal(Object.keys(r.by_region).length, 14);
  assert.equal(r.by_region['Praha'], 5);
  assert.equal(r.by_region['Moravskoslezský'], 18);
});

test('extractRegionalBreakdown — data-attr strategy', () => {
  const html = `<html><body>
    <ul>
      <li data-region="Praha" data-value="5.1">Praha</li>
      <li data-region="Středočeský" data-value="6.4">Středočeský</li>
      <li data-region="Jihočeský" data-value="7.0">Jihočeský</li>
      <li data-region="Plzeňský" data-value="6.8">Plzeňský</li>
      <li data-region="Karlovarský" data-value="8.1">Karlovarský</li>
      <li data-region="Ústecký" data-value="9.2">Ústecký</li>
      <li data-region="Liberecký" data-value="6.5">Liberecký</li>
      <li data-region="Královéhradecký" data-value="6.0">Královéhradecký</li>
    </ul>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractRegionalBreakdown($);
  assert.equal(r.strategy, 'data-attr');
  assert.equal(r.by_region['Praha'], 5.1);
  assert.equal(r.by_region['Karlovarský'], 8.1);
});

test('extractCanvasJsSeries — picks named series with percent values', () => {
  const html = `
    var chart = new CanvasJS.Chart("chartContainer", {
      data: [
        { name: "Celá ČR", type: "line", dataPoints: [
          { x: 2018, y: 7.04 }, { x: 2019, y: 6.8 }, { x: 2020, y: 7.68 }
        ]},
        { name: "KKC", type: "line", dataPoints: [
          { x: 2018, y: 7.43 }, { x: 2019, y: 6.79 }
        ]},
      ]
    });
  `;
  const r = extractCanvasJsSeries(html, 'Celá ČR');
  assert.equal(r.value, 7.68);
  assert.equal(r.year, 2020);
  assert.equal(r.trend.length, 3);
  assert.equal(r.series_name, 'Celá ČR');
  assert.equal(r.strategy, 'canvasjs-percent');
});

test('extractCanvasJsSeries — fraction values normalized × 100', () => {
  const html = `
    data: [{ name: "Celá ČR", dataPoints: [
      { x: 2020, y: 0.0768 }, { x: 2021, y: 0.0771 }, { x: 2022, y: 0.0679 }
    ]}]
  `;
  const r = extractCanvasJsSeries(html, 'Celá ČR');
  assert.equal(r.value, 6.79);
  assert.equal(r.year, 2022);
  assert.equal(r.strategy, 'canvasjs-fraction');
});

test('extractStripLineValues — parses national reference lines from CanvasJS', () => {
  const html = `
    var chart = new CanvasJS.Chart("chartContainer2024", {
      axisY: { stripLines: [{ value: 5.24, color: "red" }] },
      data: [{}]
    });
    var chart2 = new CanvasJS.Chart("chartContainer2023", {
      axisY: { stripLines: [{ value: 8.05 }] }
    });
  `;
  const r = extractStripLineValues(html);
  assert.equal(r.stripLines.length, 2);
  assert.equal(r.stripLines[0].value, 5.24);
  assert.equal(r.stripLines[0].year, 2024);
  assert.equal(r.stripLines[1].value, 8.05);
  assert.equal(r.stripLines[1].year, 2023);
  assert.equal(r.strategy, 'canvasjs-stripline');
});

test('extractStripLineValues — parses variant-prefixed containers (elektivní vs akutní)', () => {
  const html = `
    var c1 = new CanvasJS.Chart("chartContainer12024", {
      axisY: { stripLines: [{ value: 4.37 }] }
    });
    var c2 = new CanvasJS.Chart("chartContainer52024", {
      axisY: { stripLines: [{ value: 13.33 }] }
    });
  `;
  const r = extractStripLineValues(html);
  assert.equal(r.stripLines.length, 2);
  assert.equal(r.stripLines[0].variant, '1');
  assert.equal(r.stripLines[0].value, 4.37);
  assert.equal(r.stripLines[1].variant, '5');
  assert.equal(r.stripLines[1].value, 13.33);
});

test('extractKrajYearMatrix — parses year header + per-kraj rows from PUK AWaRe-like pages', () => {
  const regions = [
    'Hlavní město Praha', 'Středočeský kraj', 'Jihočeský kraj', 'Plzeňský kraj',
    'Karlovarský kraj', 'Ústecký kraj', 'Liberecký kraj', 'Královéhradecký kraj',
    'Pardubický kraj', 'Kraj Vysočina', 'Jihomoravský kraj',
    'Olomoucký kraj', 'Zlínský kraj', 'Moravskoslezský kraj',
  ];
  const yearHeaderHtml = `<table><tr><th></th><th>2022</th><th>2023</th><th>2024</th></tr></table>`;
  const krajRowsHtml = regions.map((r, i) =>
    `<table><tr><td>${r} ▼ ▲</td><td>${(20 + i).toFixed(1)}%</td><td>${(21 + i).toFixed(1)}%</td><td>${(22 + i).toFixed(1)}%</td></tr></table>`
  ).join('');
  const html = `<html><body>${yearHeaderHtml}${krajRowsHtml}</body></html>`;
  const $ = cheerio.load(html);
  const r = extractKrajYearMatrix($);
  assert.equal(Object.keys(r.regions).length, 14);
  assert.equal(r.latest_year, 2024);
  assert.ok(r.national_latest > 22 && r.national_latest < 36);
  assert.equal(r.strategy, 'kraj-year-matrix');
  assert.equal(r.regions['Praha'][0].year, 2022);
  assert.equal(r.regions['Praha'][2].value, 22);
  assert.equal(r.regions['Vysočina'].length, 3);
});

test('extractKrajYearMatrix — empty body returns partial-or-empty', () => {
  const $ = cheerio.load('<html><body><p>nic</p></body></html>');
  const r = extractKrajYearMatrix($);
  assert.equal(Object.keys(r.regions).length, 0);
  assert.equal(r.strategy, 'partial-or-empty');
});

test('pickLatestStripLine — picks newest year for given variant', () => {
  const lines = [
    { container: 'chartContainer12022', year: 2022, variant: '1', value: 5.28 },
    { container: 'chartContainer12024', year: 2024, variant: '1', value: 4.37 },
    { container: 'chartContainer52024', year: 2024, variant: '5', value: 13.33 },
  ];
  assert.equal(pickLatestStripLine(lines, '1').value, 4.37);
  assert.equal(pickLatestStripLine(lines, '5').value, 13.33);
  assert.equal(pickLatestStripLine(lines, null), null);
});

test('extractCanvasJsSeries — no match returns null safely', () => {
  const r = extractCanvasJsSeries('<html><body>no chart</body></html>', 'Cokoli');
  assert.equal(r.value, null);
  assert.equal(r.strategy, 'canvasjs-none');
});

test('extractRegionalBreakdown — partial returns empty without false positives', () => {
  const html = `<html><body><p>žádná data</p></body></html>`;
  const $ = cheerio.load(html);
  const r = extractRegionalBreakdown($);
  assert.equal(r.strategy, 'partial-or-empty');
  assert.equal(Object.keys(r.by_region).length, 0);
});
