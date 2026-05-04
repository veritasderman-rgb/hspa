// Validace data/indicators.json proti datovému kontraktu.
// Spouštěj v CI před deployem.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_FIELDS = [
  'id', 'name', 'area', 'domain', 'subdomain',
  'value', 'unit', 'year', 'trend', 'benchmark',
  'signal', 'source', 'method_card_url'
];

const VALID_AREAS = ['Výsledky', 'Výstupy', 'Procesy', 'Struktury'];
const VALID_SIGNALS = ['good', 'warn', 'bad', 'neutral'];

function validate() {
  const dataPath = path.join(ROOT, 'data', 'indicators.json');
  if (!fs.existsSync(dataPath)) {
    console.error('FAIL: data/indicators.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const errors = [];

  if (!data.version) errors.push('Missing data.version');
  if (!data.generated_at) errors.push('Missing data.generated_at');
  if (!Array.isArray(data.indicators)) errors.push('data.indicators must be array');

  for (const [i, ind] of data.indicators.entries()) {
    for (const field of REQUIRED_FIELDS) {
      if (ind[field] == null) errors.push(`indicator[${i}] (${ind.id || '?'}): missing '${field}'`);
    }
    if (ind.area && !VALID_AREAS.includes(ind.area)) {
      errors.push(`indicator[${i}] (${ind.id}): invalid area '${ind.area}'`);
    }
    if (ind.signal && !VALID_SIGNALS.includes(ind.signal)) {
      errors.push(`indicator[${i}] (${ind.id}): invalid signal '${ind.signal}'`);
    }
    if (ind.trend && !Array.isArray(ind.trend)) {
      errors.push(`indicator[${i}] (${ind.id}): trend must be array`);
    }
    // Method card existence
    if (ind.method_card_url) {
      const cardPath = path.join(ROOT, ind.method_card_url);
      if (!fs.existsSync(cardPath)) {
        errors.push(`indicator[${i}] (${ind.id}): method card '${ind.method_card_url}' not found`);
      }
    }
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: validated ${data.indicators.length} indicators.`);
}

validate();
