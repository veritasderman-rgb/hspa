// Validace data/explainers.json proti datovému kontraktu (M-EXPL-2).
// Spouštěj v CI před deployem: node ingest/validate-explainers.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED = ['id', 'title', 'category', 'tldr_public', 'tldr_expert', 'tldr_policy'];
const VALID_CATEGORIES = ['money', 'classification', 'actors', 'process', 'inspiration'];
const VALID_VERIFICATION = ['ok', 'needs_verification', 'broken'];

function validate() {
  const file = path.join(ROOT, 'data', 'explainers.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/explainers.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];

  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!Array.isArray(data.explainers)) errors.push('explainers must be array');

  const ids = new Set();

  // Cross-link s indikátory a strategiemi
  const indicatorsFile = path.join(ROOT, 'data', 'indicators.json');
  const strategiesFile = path.join(ROOT, 'data', 'strategies.json');
  const validIndicatorIds = new Set();
  const validStrategyIds = new Set();

  if (fs.existsSync(indicatorsFile)) {
    const inds = JSON.parse(fs.readFileSync(indicatorsFile, 'utf8'));
    for (const i of inds.indicators ?? []) validIndicatorIds.add(i.id);
  }
  if (fs.existsSync(strategiesFile)) {
    const strs = JSON.parse(fs.readFileSync(strategiesFile, 'utf8'));
    for (const s of strs.strategies ?? []) validStrategyIds.add(s.id);
  }

  for (const [i, e] of data.explainers.entries()) {
    const tag = `explainer[${i}] (${e.id ?? '?'})`;
    for (const f of REQUIRED) {
      if (e[f] == null) errors.push(`${tag}: missing required '${f}'`);
    }
    if (e.id) {
      if (ids.has(e.id)) errors.push(`${tag}: duplicate id`);
      ids.add(e.id);
    }
    if (e.category && !VALID_CATEGORIES.includes(e.category)) {
      errors.push(`${tag}: invalid category '${e.category}'`);
    }
    if (e.verification_status && !VALID_VERIFICATION.includes(e.verification_status)) {
      errors.push(`${tag}: invalid verification_status '${e.verification_status}'`);
    }

    // Cross-link kontrola
    for (const id of e.linked_indicators ?? []) {
      if (validIndicatorIds.size && !validIndicatorIds.has(id)) {
        errors.push(`${tag}: linked_indicator '${id}' nenalezen`);
      }
    }
    // linked_strategies může odkazovat i na jiný explainer (cross-modul cross-link)
    for (const sid of e.linked_strategies ?? []) {
      if (!validStrategyIds.has(sid) && !ids.has(sid)) {
        // Pozn.: ids zatím nemusí obsahovat všechny — proto jen warning, ne error
        const allExplainerIds = new Set(data.explainers.map(x => x.id));
        if (!allExplainerIds.has(sid)) {
          errors.push(`${tag}: linked_strategy '${sid}' nenalezen ani ve strategiích, ani v explainers`);
        }
      }
    }

    // absurdity_examples: každý musí mít quote/context, nějaký zdroj
    for (const [j, ex] of (e.absurdity_examples ?? []).entries()) {
      if (!ex.context) errors.push(`${tag}.absurdity_examples[${j}]: missing context`);
      if (!ex.source && !ex.url) {
        errors.push(`${tag}.absurdity_examples[${j}]: musí mít aspoň source NEBO url`);
      }
    }
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: validated ${data.explainers.length} explainers.`);
}

validate();
