// Freshness validation — runs as last step of refresh.yml.
//
// Reads data/indicators.json and counts indicators by source.origin.
// Updates data/freshness.json with append-only history + current stats.
// Exits non-zero if live_ratio drops below MIN_LIVE_RATIO — workflow fails,
// production data is NOT pushed when fetchers are silently broken.
//
// CLI:
//   node ingest/verify-freshness.js
//   node ingest/verify-freshness.js --min-live-ratio=0.3
//   node ingest/verify-freshness.js --report-only   (don't fail, just write report)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const INDICATORS_FILE = path.join(ROOT, 'data', 'indicators.json');
const FRESHNESS_FILE = path.join(ROOT, 'data', 'freshness.json');
const MAX_HISTORY = 90; // keep last 90 daily entries

const args = parseArgs(process.argv.slice(2));
const MIN_LIVE_RATIO = Number(args['min-live-ratio'] ?? 0.0);
const REPORT_ONLY = Boolean(args['report-only']);

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? true;
    }
  }
  return out;
}

export function summarize(indicators) {
  const total = indicators.length;
  const byOrigin = {};
  const bySource = {};
  const stale = []; // indicators where source.fetched_at > 7 days

  for (const ind of indicators) {
    const origin = ind.source?.origin ?? 'unknown';
    byOrigin[origin] = (byOrigin[origin] ?? 0) + 1;

    const sourceName = ind.source?.name ?? 'unknown';
    if (!bySource[sourceName]) bySource[sourceName] = { total: 0, live: 0, seed: 0 };
    bySource[sourceName].total += 1;
    if (origin === 'live') bySource[sourceName].live += 1;
    else if (origin === 'seed') bySource[sourceName].seed += 1;

    const fetched = ind.source?.fetched_at ? new Date(ind.source.fetched_at) : null;
    if (fetched && Date.now() - fetched.getTime() > 7 * 24 * 3600 * 1000) {
      stale.push({ id: ind.id, fetched_at: ind.source.fetched_at });
    }
  }

  const live = byOrigin.live ?? 0;
  const live_ratio = total > 0 ? live / total : 0;

  return {
    total,
    live,
    live_ratio,
    by_origin: byOrigin,
    by_source: bySource,
    stale_count: stale.length,
    stale_sample: stale.slice(0, 5),
  };
}

function loadFreshnessHistory() {
  if (!fs.existsSync(FRESHNESS_FILE)) {
    return { version: '1.0', updated_at: null, current: null, history: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(FRESHNESS_FILE, 'utf8'));
  } catch {
    return { version: '1.0', updated_at: null, current: null, history: [] };
  }
}

function appendHistory(record, newEntry) {
  const today = newEntry.date;
  const history = (record.history ?? []).filter(h => h.date !== today);
  history.push(newEntry);
  history.sort((a, b) => a.date.localeCompare(b.date));
  return history.slice(-MAX_HISTORY);
}

function formatReport(summary) {
  const lines = [];
  lines.push(`Total indicators: ${summary.total}`);
  lines.push(`Live origin: ${summary.live} (${(summary.live_ratio * 100).toFixed(1)}%)`);
  lines.push(`Stale (>7 days): ${summary.stale_count}`);
  lines.push('');
  lines.push('By origin:');
  for (const [k, v] of Object.entries(summary.by_origin)) {
    lines.push(`  ${k.padEnd(10)} ${v}`);
  }
  lines.push('');
  lines.push('By source:');
  for (const [name, s] of Object.entries(summary.by_source)) {
    const ratio = s.total > 0 ? (s.live / s.total * 100).toFixed(0) : 0;
    lines.push(`  ${name.padEnd(28)} ${s.live}/${s.total} live (${ratio}%)`);
  }
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(INDICATORS_FILE)) {
    console.error(`[freshness] FATAL: ${INDICATORS_FILE} does not exist — run transform first.`);
    process.exit(2);
  }

  const data = JSON.parse(fs.readFileSync(INDICATORS_FILE, 'utf8'));
  const summary = summarize(data.indicators ?? []);

  console.log('=== Data freshness report ===');
  console.log(formatReport(summary));
  console.log('');

  // Update history
  const today = new Date().toISOString().slice(0, 10);
  const record = loadFreshnessHistory();
  const entry = {
    date: today,
    generated_at: data.generated_at,
    total: summary.total,
    live: summary.live,
    live_ratio: Number(summary.live_ratio.toFixed(3)),
    by_origin: summary.by_origin,
    by_source: summary.by_source,
  };
  record.updated_at = new Date().toISOString();
  record.current = entry;
  record.history = appendHistory(record, entry);
  fs.writeFileSync(FRESHNESS_FILE, JSON.stringify(record, null, 2) + '\n');
  console.log(`[freshness] wrote ${path.relative(ROOT, FRESHNESS_FILE)} (history: ${record.history.length} entries)`);

  if (REPORT_ONLY) {
    console.log('[freshness] --report-only: not gating on live_ratio');
    return;
  }

  if (summary.live_ratio < MIN_LIVE_RATIO) {
    console.error(`[freshness] FAIL: live_ratio ${summary.live_ratio.toFixed(3)} < threshold ${MIN_LIVE_RATIO}`);
    console.error('[freshness] Fetchers are silently producing seed data. Investigate before pushing.');
    process.exit(1);
  }

  console.log(`[freshness] OK: live_ratio ${summary.live_ratio.toFixed(3)} >= ${MIN_LIVE_RATIO}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
