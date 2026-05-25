// Testy pro F5 — porovnání 7 ZP v data/financing.json.by_payer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FIN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'financing.json'), 'utf8'));

const ALL_PAYERS = ['111', '201', '205', '207', '209', '211', '213'];

test('data/financing.json — by_payer obsahuje všech 7 ZP pro rok 2024', () => {
  assert.ok(FIN.by_payer, 'by_payer chybí');
  for (const p of ALL_PAYERS) {
    assert.ok(FIN.by_payer[p], `chybí ZP ${p}`);
    assert.ok(FIN.by_payer[p]['2024'], `chybí ${p}.2024`);
  }
});

test('data/financing.json — všechny segments_id sedí na zpp_segments.json', () => {
  const segMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'zpp_segments.json'), 'utf8'));
  const knownSegments = new Set(Object.keys(segMap.segments));
  for (const p of ALL_PAYERS) {
    const segments = FIN.by_payer[p]?.['2024']?.segments ?? {};
    for (const segId of Object.keys(segments)) {
      assert.ok(knownSegments.has(segId), `${p}.2024: neznámý segment "${segId}"`);
    }
  }
});

test('data/financing.json — součet by_payer ≈ celkový seed total (±15 %)', () => {
  const totalByPayer = ALL_PAYERS.reduce((a, p) => {
    const t = FIN.by_payer[p]?.['2024']?.total_tis_kc ?? 0;
    return a + t;
  }, 0) / 1e6;
  // Total seed: 459 mld v 2023, očekáváme ~478 mld v 2024 (+10 %).
  // ±15 % toleruje seed nepřesnost.
  assert.ok(totalByPayer >= 390, `Σ by_payer 2024 = ${totalByPayer.toFixed(0)} mld Kč — moc málo`);
  assert.ok(totalByPayer <= 560, `Σ by_payer 2024 = ${totalByPayer.toFixed(0)} mld Kč — moc moc`);
});

test('data/financing.json — Σ segments == total_tis_kc per ZP ±5 %', () => {
  for (const p of ALL_PAYERS) {
    const rec = FIN.by_payer[p]['2024'];
    const sum = Object.values(rec.segments).reduce((a, v) => a + v, 0);
    const diffPct = Math.abs(sum - rec.total_tis_kc) / rec.total_tis_kc * 100;
    assert.ok(diffPct < 5, `${p}: Σ segments ${sum} ≠ total ${rec.total_tis_kc} (${diffPct.toFixed(2)} %)`);
  }
});

test('data/financing.json — VZP je největší a ZPŠ nejmenší', () => {
  const totals = Object.fromEntries(
    ALL_PAYERS.map(p => [p, FIN.by_payer[p]['2024'].total_tis_kc])
  );
  const sorted = ALL_PAYERS.slice().sort((a, b) => totals[b] - totals[a]);
  assert.equal(sorted[0], '111', 'VZP musí být největší');
  assert.equal(sorted[sorted.length - 1], '209', 'ZPŠ musí být nejmenší');
});
