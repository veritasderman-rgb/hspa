// Testy pro ZPP PDF fetcher (F2b) — bez sítě, jen flow okolo manual fallbacku.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { processOne } from '../ingest/fetchers/zpp_pdf.js';
import { mergeZppCache } from '../ingest/transform_financing.js';
import { cachePath, ensureCacheDir } from '../ingest/lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function cleanZppCache() {
  ensureCacheDir();
  const dir = path.join(ROOT, 'ingest', 'cache', 'zpp');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.json') || f.endsWith('.pdf')) {
        fs.unlinkSync(path.join(dir, f));
      }
    }
  }
}

test('manual fallback existuje pro 111-2024 a 211-2024', () => {
  const d = path.join(ROOT, 'ingest', 'manual', 'zpp');
  assert.ok(fs.existsSync(path.join(d, '111-2024.json')));
  assert.ok(fs.existsSync(path.join(d, '211-2024.json')));
});

test('manual JSON má povinná pole + segments sčítá k total_tis_kc', () => {
  for (const f of ['111-2024.json', '211-2024.json']) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'manual', 'zpp', f), 'utf8'));
    assert.equal(typeof data.payer, 'string');
    assert.equal(typeof data.year, 'number');
    assert.equal(typeof data.segments, 'object');
    const sum = Object.values(data.segments).reduce((a, v) => a + v, 0);
    const diffPct = Math.abs(sum - data.total_tis_kc) / data.total_tis_kc * 100;
    assert.ok(diffPct < 5, `${f}: Σ segments ${sum} ≠ total ${data.total_tis_kc} (odchylka ${diffPct.toFixed(2)} %)`);
  }
});

test('processOne — fallback na manual když fetch selže', async () => {
  cleanZppCache();
  const failingFetch = async () => { throw new Error('network down'); };
  const out = await processOne('111', 2024, { fetchImpl: failingFetch });
  assert.equal(out.payer, '111');
  assert.equal(out.year, 2024);
  assert.equal(out.origin, 'manual');
  assert.ok(out.segments.luzkova > 0);
  cleanZppCache();
});

test('mergeZppCache — načte manual + cache, cache vyhraje', () => {
  const seed = { year: 2023, sources: [], targets: [] };
  const merged = mergeZppCache(seed);
  assert.ok(merged.by_payer);
  assert.ok(merged.by_payer['111']);
  assert.ok(merged.by_payer['211']);
});
