// Testy sweepu mimo články (#931) — scripts/nightly-scan.js:
// extractUrlsFromJson, isRecentlyLinkChecked, scanCardLinks/scanDraftLinks
// nad reálným repem + integrita sidecar logu data/link-check-log.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractUrlsFromJson, isRecentlyLinkChecked, scanCardLinks, scanDraftLinks, loadLinkCheckLog,
} from '../scripts/nightly-scan.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = '2026-08-12';

test('extractUrlsFromJson: sbírá URL ze stringů rekurzivně, deduplikuje', () => {
  const urls = extractUrlsFromJson({
    a: 'viz https://uzis.cz/x.',
    b: { c: ['text (https://oecd.org/y), a znovu https://uzis.cz/x'] },
    d: 42,
  });
  assert.deepEqual(urls.sort(), ['https://oecd.org/y', 'https://uzis.cz/x']);
});

test('extractUrlsFromJson: hranaté závorky v URL přežijí (OECD Data Explorer)', () => {
  const [u] = extractUrlsFromJson('https://data-explorer.oecd.org/vis?fs[0]=Topic&df[id]=DSD_X');
  assert.equal(u, 'https://data-explorer.oecd.org/vis?fs[0]=Topic&df[id]=DSD_X');
});

test('extractUrlsFromJson: koncová interpunkce a nepárová závorka se oříznou', () => {
  assert.deepEqual(extractUrlsFromJson('zdroj: https://szu.gov.cz/a,'), ['https://szu.gov.cz/a']);
  assert.deepEqual(extractUrlsFromJson('(https://szu.gov.cz/b)'), ['https://szu.gov.cz/b']);
  assert.deepEqual(extractUrlsFromJson('(viz https://szu.gov.cz/c).'), ['https://szu.gov.cz/c']);
});

test('extractUrlsFromJson: vyvážené závorky uvnitř URL přežijí (Lancet)', () => {
  const lancet = 'https://www.thelancet.com/journals/lanpub/article/PIIS2468-2667(22)00199-2/fulltext';
  assert.deepEqual(extractUrlsFromJson(`viz (${lancet}).`), [lancet]);
});

test('isRecentlyLinkChecked: budoucí ani kalendářně nevalidní razítko neumlčuje', () => {
  assert.equal(isRecentlyLinkChecked('f', TODAY, { f: '2027-08-01' }), false);
  assert.equal(isRecentlyLinkChecked('f', TODAY, { f: '2026-99-99' }), false);
});

test('scanDraftLinks: bez capu — draft s >12 odkazy nese úplnou sadu', () => {
  const items = scanDraftLinks(TODAY, { skipChecked: false, log: {} });
  const max = Math.max(0, ...items.map(i => i.urls.length));
  assert.ok(max > 12, `očekáván draft s >12 URL (max=${max}) — cap z findExternalLinks nesmí platit`);
});

test('isRecentlyLinkChecked: < 14 dní přeskočit, starší ne, rozbité datum ne', () => {
  assert.equal(isRecentlyLinkChecked('f', TODAY, { f: '2026-08-10' }), true);
  assert.equal(isRecentlyLinkChecked('f', TODAY, { f: '2026-07-01' }), false);
  assert.equal(isRecentlyLinkChecked('f', TODAY, {}), false);
  assert.equal(isRecentlyLinkChecked('f', TODAY, { f: 'nedávno' }), false);
});

test('scanCardLinks: najde karty s URL (mezera #931 — dřív sweep neexistoval)', () => {
  const items = scanCardLinks(TODAY, { skipChecked: false, log: {} });
  assert.ok(items.length > 0, 'žádná karta s URL — nečekané pro tento repo');
  for (const i of items.slice(0, 5)) {
    assert.match(i.file, /^indicators\/.+\.json$/);
    assert.ok(Array.isArray(i.urls) && i.urls.length > 0);
  }
});

test('scanCardLinks: sidecar log soubor vyřadí z worklistu', () => {
  const all = scanCardLinks(TODAY, { skipChecked: false, log: {} });
  const first = all[0].file;
  const withLog = scanCardLinks(TODAY, { skipChecked: true, log: { [first]: TODAY } });
  const entry = withLog.find(i => i.file === first);
  assert.equal(entry.skipped, true);
});

test('scanDraftLinks: drafty s externími odkazy jsou ve worklistu', () => {
  const items = scanDraftLinks(TODAY, { skipChecked: false, log: {} });
  for (const i of items) assert.match(i.file, /^drafts\/clanek-.+\.html$/);
});

test('data/link-check-log.json: validní obálka { _doc, checks }', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'link-check-log.json'), 'utf8'));
  assert.equal(typeof raw._doc, 'string');
  assert.equal(typeof raw.checks, 'object');
  const log = loadLinkCheckLog();
  assert.ok(!('_doc' in log), 'loader má vracet jen checks, ne obálku s _doc');
  for (const [k, v] of Object.entries(log)) {
    assert.match(v, /^\d{4}-\d{2}-\d{2}$/, `nevalidní datum u ${k}`);
  }
});
