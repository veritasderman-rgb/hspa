// Testy pro ÚZIS NZIS generický fetcher (M-NZIS-1).
// Pokrývají: CKAN resolver, primary→CKAN fallback, gzip dekódování,
// CSV parsing, cache hit, validace expected_columns.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';

import { fetchNzisDataset, fetchUzisNzis, loadUzisMapping } from '../ingest/fetchers/uzis_nzis.js';
import { resolveDistributionUrl, searchDatasets } from '../ingest/lib/ckan.js';
import { gunzipBufferToString } from '../ingest/lib/gzip.js';
import { cachePath, ensureCacheDir } from '../ingest/lib/cache.js';

function cleanNzisCache() {
  ensureCacheDir();
  const dir = cachePath('.');
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('uzis_') && (f.endsWith('.json') || f.endsWith('.raw.csv'))) {
      fs.unlinkSync(cachePath(f));
    }
  }
}

function jsonResponse(json, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return json; },
    async text() { return JSON.stringify(json); },
    body: null,
  };
}

function textResponse(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { throw new Error('not json'); },
    async text() { return text; },
    body: null,
  };
}

function gzipStreamResponse(text) {
  const gz = gzipSync(Buffer.from(text, 'utf8'));
  return {
    ok: true,
    status: 200,
    async text() { return text; },
    async json() { throw new Error('not json'); },
    body: new ReadableStream({
      start(c) { c.enqueue(gz); c.close(); },
    }),
  };
}

beforeEach(() => cleanNzisCache());

// ========== gunzipBufferToString ==========

test('gunzipBufferToString: rozbalí gzip buffer na string', async () => {
  const original = 'rok;hodnota\n2024;79.9\n';
  const gz = gzipSync(Buffer.from(original, 'utf8'));
  const out = await gunzipBufferToString(gz);
  assert.equal(out, original);
});

// ========== CKAN resolver ==========

test('resolveDistributionUrl: vrátí URL csv.gz distribuce', async () => {
  const ckanResponse = {
    success: true,
    result: {
      resources: [
        { format: 'PDF', url: 'https://example.test/info.pdf' },
        { format: 'CSV.GZ', url: 'https://example.test/data.csv.gz' },
        { format: 'CSV', url: 'https://example.test/data.csv' },
      ],
    },
  };
  const fetchImpl = async (url) => {
    assert.ok(url.includes('package_show'));
    assert.ok(url.includes('id=test_dataset'));
    return jsonResponse(ckanResponse);
  };
  const out = await resolveDistributionUrl('test_dataset', { fetchImpl, sleepImpl: async () => {} });
  assert.deepEqual(out, { url: 'https://example.test/data.csv.gz', format: 'csv.gz' });
});

test('resolveDistributionUrl: pokud chybí csv.gz, vrátí csv', async () => {
  const ckanResponse = {
    success: true,
    result: { resources: [{ format: 'CSV', url: 'https://example.test/x.csv' }] },
  };
  const fetchImpl = async () => jsonResponse(ckanResponse);
  const out = await resolveDistributionUrl('x', { fetchImpl, sleepImpl: async () => {} });
  assert.equal(out.format, 'csv');
});

test('resolveDistributionUrl: žádná použitelná distribuce → null', async () => {
  const fetchImpl = async () => jsonResponse({
    success: true,
    result: { resources: [{ format: 'PDF', url: 'x.pdf' }] },
  });
  const out = await resolveDistributionUrl('x', { fetchImpl, sleepImpl: async () => {} });
  assert.equal(out, null);
});

test('searchDatasets: vrátí pole výsledků z package_search', async () => {
  const fetchImpl = async (url) => {
    assert.ok(url.includes('package_search'));
    assert.ok(url.includes('q=NRZP'));
    return jsonResponse({ success: true, result: { results: [{ id: 'a' }, { id: 'b' }] } });
  };
  const out = await searchDatasets('NRZP', { fetchImpl, sleepImpl: async () => {} });
  assert.equal(out.length, 2);
});

// ========== Mapping ==========

test('loadUzisMapping: načte aspoň 3 datasety z mapping souboru', () => {
  const m = loadUzisMapping();
  assert.ok(m.nrh_dlouhodoba_rada);
  assert.ok(m.nrzp_pracovnici);
  assert.ok(m.nor_incidence);
});

// ========== fetchNzisDataset: CSV (plain) ==========

test('fetchNzisDataset: stáhne plain CSV, parsuje a uloží do cache', async () => {
  const csv = 'rok;kraj;pocet\n2024;CZ010;100\n2024;CZ020;90\n';
  const fetchImpl = async (url) => {
    assert.equal(url, 'https://example.test/x.csv');
    return textResponse(csv);
  };
  const mapping = {
    name: 'Test', primary_url: 'https://example.test/x.csv', format: 'csv',
    expected_columns: ['rok', 'kraj', 'pocet'],
  };
  const r = await fetchNzisDataset('test_csv', mapping, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.source, 'primary');
  assert.equal(r.rows, 2);
  assert.deepEqual(r.columns, ['rok', 'kraj', 'pocet']);

  const cached = JSON.parse(fs.readFileSync(cachePath('uzis_test_csv.json'), 'utf8'));
  assert.equal(cached.records[0].pocet, '100');
  assert.equal(cached.resolved_via, 'primary');
});

// ========== fetchNzisDataset: CSV.GZ stream ==========

test('fetchNzisDataset: stáhne csv.gz, dekomprimuje, parsuje', async () => {
  const csv = 'rok;hodnota\n2023;1\n2024;2\n';
  const fetchImpl = async () => gzipStreamResponse(csv);
  const mapping = {
    name: 'Test GZ', primary_url: 'https://example.test/x.csv.gz', format: 'csv.gz',
    expected_columns: ['rok', 'hodnota'],
  };
  const r = await fetchNzisDataset('test_gz', mapping, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.rows, 2);
  assert.deepEqual(r.columns, ['rok', 'hodnota']);
  assert.ok(fs.existsSync(cachePath('uzis_test_gz.raw.csv')));
});

// ========== fetchNzisDataset: cache hit ==========

test('fetchNzisDataset: druhé volání použije cache', async () => {
  const csv = 'a;b\n1;2\n';
  let calls = 0;
  const fetchImpl = async () => { calls++; return textResponse(csv); };
  const mapping = { name: 'X', primary_url: 'https://example.test/x.csv', format: 'csv' };

  await fetchNzisDataset('cache_t', mapping, { fetchImpl, sleepImpl: async () => {} });
  const second = await fetchNzisDataset('cache_t', mapping, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(calls, 1);
  assert.equal(second.source, 'cache');
});

// ========== fetchNzisDataset: primary fail → CKAN fallback ==========

test('fetchNzisDataset: 404 na primary → CKAN resolve → úspěch', async () => {
  const csv = 'a;b\n1;2\n';
  let stage = 'primary';
  const fetchImpl = async (url) => {
    if (url.endsWith('/old.csv')) {
      // primary fail
      return textResponse('', 404);
    }
    if (url.includes('package_show')) {
      stage = 'ckan';
      return jsonResponse({
        success: true,
        result: { resources: [{ format: 'CSV', url: 'https://example.test/new.csv' }] },
      });
    }
    if (url.endsWith('/new.csv')) {
      return textResponse(csv);
    }
    throw new Error(`unexpected url ${url}`);
  };
  const mapping = {
    name: 'Fallback test',
    ckan_dataset: 'fallback_test',
    primary_url: 'https://example.test/old.csv',
    format: 'csv',
  };
  const r = await fetchNzisDataset('fallback_t', mapping, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.source, 'ckan');
  assert.equal(r.rows, 1);
});

// ========== fetchUzisNzis: orchestrace ==========

test('fetchUzisNzis: orchestruje datasety, summary obsahuje všechny + failures', async () => {
  const csv = 'a;b\n1;2\n';
  const fetchImpl = async (url) => {
    if (url.includes('good')) return textResponse(csv);
    return textResponse('', 500);
  };
  const datasets = {
    good_a: { name: 'A', primary_url: 'https://example.test/good_a.csv', format: 'csv' },
    bad_b: { name: 'B', primary_url: 'https://example.test/bad_b.csv', format: 'csv' },
  };
  const summary = await fetchUzisNzis({ fetchImpl, sleepImpl: async () => {}, datasets });
  assert.ok(summary.datasets.good_a);
  assert.equal(summary.failures.length, 1);
  assert.equal(summary.failures[0].key, 'bad_b');
  assert.ok(fs.existsSync(cachePath('uzis_nzis.json')));
});

// ========== expected_columns warning ==========

test('fetchNzisDataset: chybějící expected_column nezpůsobí selhání (jen warning)', async () => {
  const csv = 'a;b\n1;2\n'; // bez 'c'
  const fetchImpl = async () => textResponse(csv);
  const mapping = {
    name: 'X', primary_url: 'https://example.test/x.csv', format: 'csv',
    expected_columns: ['a', 'b', 'c'],
  };
  const r = await fetchNzisDataset('warn_t', mapping, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.rows, 1);
  assert.equal(r.columns.length, 2);
});
