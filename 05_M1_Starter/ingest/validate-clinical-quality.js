// Validace data/clinical-quality.json proti datovému kontraktu.
// Spustit:  node ingest/validate-clinical-quality.js
//
// Kontroluje:
//  - top-level pole (version, generated_at, source_attribution, indicators)
//  - source_attribution: každý source má name, provider, url, license
//  - indicators: každý záznam má id, name, primary_source, source_url
//  - primary_source musí odpovídat klíči v source_attribution
//  - regions, pokud uvedeno, je 14 krajů
//  - generated_at je ISO datum

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_TOP = ['version', 'generated_at', 'source_attribution', 'indicators'];
const REQUIRED_SOURCE = ['name', 'provider', 'url', 'license'];
const REQUIRED_INDICATOR = ['id', 'section', 'name', 'method', 'primary_source', 'source_url'];
const VALID_SECTIONS = ['safety', 'acute_cardio', 'stroke', 'amr', 'onco_surgery', 'onco_path'];

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

function warn(msg) {
  console.warn('WARN: ' + msg);
}

function validate() {
  const file = path.join(ROOT, 'data', 'clinical-quality.json');
  if (!fs.existsSync(file)) fail('data/clinical-quality.json not found');

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail('clinical-quality.json is not valid JSON: ' + err.message);
  }

  const errors = [];

  for (const f of REQUIRED_TOP) {
    if (data[f] == null) errors.push(`Missing required top-level field: ${f}`);
  }

  if (data.generated_at && Number.isNaN(Date.parse(data.generated_at))) {
    errors.push(`generated_at is not a valid ISO date: ${data.generated_at}`);
  }

  if (data.source_attribution && typeof data.source_attribution === 'object') {
    for (const [key, src] of Object.entries(data.source_attribution)) {
      const tag = `source_attribution.${key}`;
      for (const f of REQUIRED_SOURCE) {
        if (src[f] == null) errors.push(`${tag}: missing required '${f}'`);
      }
      if (src.url && !/^https?:\/\//i.test(src.url)) {
        errors.push(`${tag}: url must start with http(s)://`);
      }
    }
  }

  if (!Array.isArray(data.indicators)) {
    errors.push('indicators must be array');
  } else {
    const sourceKeys = new Set(Object.keys(data.source_attribution ?? {}));
    const ids = new Set();
    for (const [i, ind] of data.indicators.entries()) {
      const tag = `indicators[${i}] (${ind.id ?? '?'})`;
      for (const f of REQUIRED_INDICATOR) {
        if (ind[f] == null) errors.push(`${tag}: missing required '${f}'`);
      }
      if (ind.id) {
        if (ids.has(ind.id)) errors.push(`${tag}: duplicate id '${ind.id}'`);
        ids.add(ind.id);
      }
      if (ind.section && !VALID_SECTIONS.includes(ind.section)) {
        errors.push(`${tag}: invalid section '${ind.section}', expected one of: ${VALID_SECTIONS.join(', ')}`);
      }
      if (ind.primary_source && !sourceKeys.has(ind.primary_source)) {
        errors.push(`${tag}: primary_source '${ind.primary_source}' not defined in source_attribution`);
      }
      if (ind.source_url && !/^https?:\/\//i.test(ind.source_url)) {
        errors.push(`${tag}: source_url must start with http(s)://`);
      }
    }
  }

  if (data.regions !== undefined) {
    if (!Array.isArray(data.regions) || data.regions.length !== 14) {
      errors.push(`regions must be an array of exactly 14 entries (got ${Array.isArray(data.regions) ? data.regions.length : typeof data.regions})`);
    }
  }

  if (errors.length > 0) {
    console.error(`FAIL: ${errors.length} validation error(s) in data/clinical-quality.json:`);
    for (const e of errors) console.error('  · ' + e);
    process.exit(1);
  }

  const indicatorCount = Array.isArray(data.indicators) ? data.indicators.length : 0;
  const sourceCount = data.source_attribution ? Object.keys(data.source_attribution).length : 0;
  console.log(`OK: clinical-quality.json — ${indicatorCount} indicators, ${sourceCount} sources, generated_at=${data.generated_at}`);
}

validate();
