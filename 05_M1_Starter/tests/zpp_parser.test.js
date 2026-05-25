// Testy pro ZPP PDF parser (F2b) — bez reálného PDF, jen heuristika.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  groupIntoRows,
  findSegmentTablePages,
  parseTableRow,
  resolveSegment,
  parseZpp,
  bucketize,
} from '../ingest/lib/zpp_parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ZPP_SOURCES = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'zpp_sources.json'), 'utf8'));
const ZPP_SEGMENTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'zpp_segments.json'), 'utf8'));

test('zpp_sources.json — všech 7 ZP definováno', () => {
  const codes = Object.keys(ZPP_SOURCES.payers).sort();
  assert.deepEqual(codes, ['111', '201', '205', '207', '209', '211', '213']);
});

test('zpp_sources.json — VZP a ZP MV ČR mají URL pro 2024', () => {
  assert.ok(ZPP_SOURCES.payers['111'].urls['2024']);
  assert.ok(ZPP_SOURCES.payers['211'].urls['2024']);
});

test('zpp_segments.json — sankey_buckets pokrývá všechny segmenty', () => {
  const allSegments = new Set(Object.keys(ZPP_SEGMENTS.segments));
  const buckets = ZPP_SEGMENTS.sankey_buckets;
  const bucketSegments = new Set();
  for (const [key, ids] of Object.entries(buckets)) {
    if (key === 'comment') continue;
    for (const id of ids) bucketSegments.add(id);
  }
  for (const seg of allSegments) {
    assert.ok(bucketSegments.has(seg), `segment ${seg} chybí v sankey_buckets`);
  }
});

test('groupIntoRows — text items na stejné Y se sloučí do řádku', () => {
  const items = [
    { text: 'A', x: 10, y: 100, page: 1 },
    { text: 'B', x: 50, y: 100, page: 1 },
    { text: 'C', x: 10, y: 90,  page: 1 },
  ];
  const rows = groupIntoRows(items, 3);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].items.length, 2);
  assert.equal(rows[0].items[0].text, 'A');
  assert.equal(rows[1].items[0].text, 'C');
});

test('groupIntoRows — různé stránky zůstanou oddělené', () => {
  const items = [
    { text: 'A', x: 0, y: 100, page: 1 },
    { text: 'B', x: 0, y: 100, page: 2 },
  ];
  const rows = groupIntoRows(items);
  assert.equal(rows.length, 2);
});

test('findSegmentTablePages — najde kotvu', () => {
  const rows = [
    { page: 1, items: [{ text: 'Úvod' }] },
    { page: 5, items: [{ text: 'Výdaje na zdravotní služby podle segmentů péče' }] },
  ];
  assert.deepEqual(findSegmentTablePages(rows), [5]);
});

test('parseTableRow — extrahuje label + čísla', () => {
  const items = [
    { text: 'Akutní lůžková péče', x: 10 },
    { text: '50 000', x: 200 },
    { text: '55 000', x: 300 },
  ];
  const r = parseTableRow(items);
  assert.equal(r.label, 'Akutní lůžková péče');
  assert.deepEqual(r.values, [50000, 55000]);
});

test('parseTableRow — vrátí null pro řádek bez čísla', () => {
  const items = [{ text: 'Jen text bez čísel', x: 10 }];
  assert.equal(parseTableRow(items), null);
});

test('resolveSegment — najde lůžkovou péči', () => {
  const seg = resolveSegment('Akutní lůžková péče');
  assert.equal(seg.id, 'luzkova');
  assert.equal(seg.label, 'Lůžková péče');
});

test('resolveSegment — case-insensitive', () => {
  const seg = resolveSegment('Léčivé přípravky na poukaz');
  assert.equal(seg.id, 'leky');
});

test('resolveSegment — vrátí null pro neznámý label', () => {
  assert.equal(resolveSegment('Něco úplně jiného'), null);
});

test('parseZpp — agreguje syntetické řádky', () => {
  const items = [
    { text: 'Výdaje na zdravotní služby podle segmentů péče', x: 0, y: 200, page: 1 },
    { text: 'Akutní lůžková péče', x: 10, y: 180, page: 1 },
    { text: '163000', x: 200, y: 180, page: 1 },
    { text: 'Ambulantní specializovaná péče', x: 10, y: 160, page: 1 },
    { text: '65000', x: 200, y: 160, page: 1 },
    { text: 'Léčivé přípravky', x: 10, y: 140, page: 1 },
    { text: '29000', x: 200, y: 140, page: 1 },
  ];
  const out = parseZpp({ items, payer: '111', year: 2024 });
  assert.equal(out.parsed, true);
  assert.equal(out.payer, '111');
  assert.ok(out.segments.luzkova >= 163000);
  assert.ok(out.segments.ambulantni >= 65000);
  assert.ok(out.segments.leky >= 29000);
});

test('parseZpp — prázdné items', () => {
  const out = parseZpp({ items: [], payer: '111', year: 2024 });
  assert.equal(out.parsed, false);
});

test('bucketize — sloučí segments do 4 vizuálních uzlů', () => {
  const segments = {
    luzkova: 163000, ambulantni: 65000, stomatologie: 9500,
    leky: 29000, prostredky: 7000, lazne: 4500, doprava_zzs: 5500, ostatni: 6500,
  };
  const b = bucketize(segments);
  assert.equal(b.luzkova, 163000);
  assert.equal(b.ambulantni, 65000 + 9500);
  assert.equal(b.leky, 29000);
  assert.equal(b.ostatni, 7000 + 4500 + 5500 + 6500);
});
