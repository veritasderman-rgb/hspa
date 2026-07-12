// Validátor data/levers.json — kontrakt pro Simulátor pák.
// Spouští se v npm run validate:all. Kontroluje, že každá páka má validní
// control, každý efekt cílí na existující indikátor a nese zdroj, a že
// elasticita má konečný koeficient a directional má polarity+strength.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VALID_STRENGTH = new Set(['weak', 'medium', 'strong']);
const VALID_POLARITY = new Set(['up', 'down']);
const VALID_CONTROL = new Set(['slider', 'toggle']);

export function validateLevers() {
  const errors = [];
  const leversPath = path.join(ROOT, 'data', 'levers.json');
  const indicatorsPath = path.join(ROOT, 'data', 'indicators.json');

  const doc = JSON.parse(fs.readFileSync(leversPath, 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(indicatorsPath, 'utf8'));
  const indIds = new Set(indicators.indicators.map(i => i.id));

  if (!Array.isArray(doc.levers) || doc.levers.length === 0) {
    errors.push('levers.json: chybí neprázdné pole "levers"');
    return report(errors);
  }

  const seen = new Set();
  for (const lever of doc.levers) {
    const tag = `páka ${lever.id ?? '?'}`;
    if (!lever.id) errors.push(`${tag}: chybí id`);
    if (lever.id && seen.has(lever.id)) errors.push(`${tag}: duplicitní id`);
    if (lever.id) seen.add(lever.id);
    if (!lever.label) errors.push(`${tag}: chybí label`);

    const c = lever.control || {};
    if (!VALID_CONTROL.has(c.type)) errors.push(`${tag}: control.type musí být slider|toggle (má '${c.type}')`);
    if (c.type === 'slider') {
      for (const k of ['min', 'max', 'step']) {
        if (!Number.isFinite(c[k])) errors.push(`${tag}: slider bez konečného control.${k}`);
      }
      if (Number.isFinite(c.min) && Number.isFinite(c.max) && c.min >= c.max) {
        errors.push(`${tag}: slider min ≥ max`);
      }
    }

    if (!Array.isArray(lever.effects) || lever.effects.length === 0) {
      errors.push(`${tag}: chybí neprázdné pole effects`);
      continue;
    }
    for (const eff of lever.effects) {
      const et = `${tag} → ${eff.indicator ?? '?'}`;
      if (!eff.indicator || !indIds.has(eff.indicator)) {
        errors.push(`${et}: indikátor neexistuje v indicators.json`);
      }
      if (!eff.source) errors.push(`${et}: chybí source (každý efekt musí být doložen)`);
      if (eff.kind === 'elasticity') {
        if (!Number.isFinite(eff.coef_per_unit)) errors.push(`${et}: elasticity bez konečného coef_per_unit`);
      } else if (eff.kind === 'directional') {
        if (!VALID_POLARITY.has(eff.polarity)) errors.push(`${et}: directional polarity musí být up|down`);
        if (!VALID_STRENGTH.has(eff.strength)) errors.push(`${et}: directional strength musí být weak|medium|strong`);
      } else {
        errors.push(`${et}: kind musí být elasticity|directional (má '${eff.kind}')`);
      }
    }
  }
  return report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`FAIL: levers.json — ${errors.length} chyb:`);
    errors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('OK: validated levers.json — páky, efekty i zdroje v pořádku.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validateLevers() ? 0 : 1);
}
