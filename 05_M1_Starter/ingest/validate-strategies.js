// Validace data/strategies.json proti datovému kontraktu (M-STR-2).
// Spouštěj v CI před deployem: node ingest/validate-strategies.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED = ['id', 'title', 'level', 'scope', 'status', 'owner'];
const VALID_LEVELS = ['national', 'sector', 'institution', 'eu', 'global', 'standard'];
const VALID_SCOPES = ['framework', 'program', 'action_plan', 'strategy', 'guideline'];
const VALID_STATUSES = ['active', 'proposed', 'obsolete', 'revision_due'];
const VALID_VERIFICATION = ['ok', 'needs_verification', 'broken'];

function validate() {
  const file = path.join(ROOT, 'data', 'strategies.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/strategies.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];

  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!Array.isArray(data.strategies)) errors.push('strategies must be array');

  const ids = new Set();

  // Načti indikátory pro cross-link kontrolu
  const indicatorsFile = path.join(ROOT, 'data', 'indicators.json');
  const validIndicatorIds = new Set();
  if (fs.existsSync(indicatorsFile)) {
    const inds = JSON.parse(fs.readFileSync(indicatorsFile, 'utf8'));
    for (const i of inds.indicators ?? []) validIndicatorIds.add(i.id);
  }

  for (const [i, s] of data.strategies.entries()) {
    const tag = `strategy[${i}] (${s.id ?? '?'})`;
    for (const f of REQUIRED) {
      if (s[f] == null) errors.push(`${tag}: missing required '${f}'`);
    }
    if (s.id) {
      if (ids.has(s.id)) errors.push(`${tag}: duplicate id`);
      ids.add(s.id);
    }
    if (s.level && !VALID_LEVELS.includes(s.level)) errors.push(`${tag}: invalid level '${s.level}'`);
    if (s.scope && !VALID_SCOPES.includes(s.scope)) errors.push(`${tag}: invalid scope '${s.scope}'`);
    if (s.status && !VALID_STATUSES.includes(s.status)) errors.push(`${tag}: invalid status '${s.status}'`);
    if (s.verification_status && !VALID_VERIFICATION.includes(s.verification_status)) {
      errors.push(`${tag}: invalid verification_status '${s.verification_status}'`);
    }
    if (s.linked_indicators) {
      if (!Array.isArray(s.linked_indicators)) errors.push(`${tag}: linked_indicators must be array`);
      else for (const id of s.linked_indicators) {
        if (validIndicatorIds.size && !validIndicatorIds.has(id)) {
          errors.push(`${tag}: linked_indicator '${id}' nenalezen v data/indicators.json`);
        }
      }
    }
  }

  // Round-trip check related_strategies
  for (const s of data.strategies) {
    for (const rid of s.related_strategies ?? []) {
      if (!ids.has(rid)) errors.push(`strategy ${s.id}: related_strategy '${rid}' nenalezen`);
    }
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: validated ${data.strategies.length} strategies.`);
}

validate();
