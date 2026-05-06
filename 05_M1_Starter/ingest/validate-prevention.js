// Validace data/prevention.json proti datovému kontraktu.
// Spouštěj v CI před deployem: node ingest/validate-prevention.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const prevFile = path.join(ROOT, 'data', 'prevention.json');
const indFile = path.join(ROOT, 'data', 'indicators.json');
const strFile = path.join(ROOT, 'data', 'strategies.json');

if (!fs.existsSync(prevFile)) fail('data/prevention.json not found');
if (!fs.existsSync(indFile)) fail('data/indicators.json not found');
if (!fs.existsSync(strFile)) fail('data/strategies.json not found');

const prev = JSON.parse(fs.readFileSync(prevFile, 'utf8'));
const ind = JSON.parse(fs.readFileSync(indFile, 'utf8')).indicators;
const str = JSON.parse(fs.readFileSync(strFile, 'utf8')).strategies;
const indIds = new Set(ind.map(i => i.id));
const strIds = new Set(str.map(s => s.id));

if (!prev.version) fail('prevention.json: missing version');
if (!prev.generated_at) fail('prevention.json: missing generated_at');
if (!prev.hero || !prev.hero.headline) fail('prevention.json: missing hero.headline');

if (!Array.isArray(prev.themes) || prev.themes.length < 9)
  fail(`expected 9 themes, got ${prev.themes?.length ?? 0}`);

const requiredFields = [
  'id', 'title', 'subtitle', 'daily_choice', 'what_we_know',
  'try_this_week', 'hspa_indicators', 'strategies',
  'system_levers', 'sources', 'caveat',
];

const seenIds = new Set();
const errors = [];

for (const t of prev.themes) {
  const tag = `theme[${t.id ?? '?'}]`;

  for (const f of requiredFields) {
    if (t[f] == null) errors.push(`${tag}: missing field '${f}'`);
  }

  if (t.id) {
    if (seenIds.has(t.id)) errors.push(`duplicate theme id: ${t.id}`);
    seenIds.add(t.id);
  }

  if (!Array.isArray(t.try_this_week) || t.try_this_week.length < 3)
    errors.push(`${tag}: try_this_week must have ≥3 items (got ${t.try_this_week?.length ?? 0})`);

  if (typeof t.what_we_know !== 'string' || t.what_we_know.length < 100)
    errors.push(`${tag}: what_we_know too short (${t.what_we_know?.length ?? 0} chars, min 100)`);

  if (!Array.isArray(t.hspa_indicators))
    errors.push(`${tag}: hspa_indicators must be array`);
  else {
    for (const id of t.hspa_indicators) {
      if (!indIds.has(id)) errors.push(`${tag}: unknown indicator '${id}'`);
    }
  }

  if (!Array.isArray(t.strategies))
    errors.push(`${tag}: strategies must be array`);
  else {
    for (const id of t.strategies) {
      if (!strIds.has(id)) errors.push(`${tag}: unknown strategy '${id}'`);
    }
  }

  if (!Array.isArray(t.sources) || t.sources.length === 0)
    errors.push(`${tag}: sources must be non-empty array`);
  else {
    for (const [j, s] of t.sources.entries()) {
      if (!s.url) errors.push(`${tag}.sources[${j}]: missing url`);
      if (!s.title) errors.push(`${tag}.sources[${j}]: missing title`);
    }
  }
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} validation error(s):`);
  errors.forEach(e => console.error('  -', e));
  process.exit(1);
}

console.log(`OK: validated ${prev.themes.length} prevention themes.`);
