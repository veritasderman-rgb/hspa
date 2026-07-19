// Validátor data/pribeh-pacienta.json — kontrakt pro Tři židle · Akt III
// (Příběh pacienta). Spouští se v npm run validate:all. Hlídá: fáze kroků
// existují v cesta-pacienta.json, disease_ref (jen volitelný) existuje,
// dvojí vyprávění pacient/lékař u každého kroku, doložené zdroje,
// indikátory existují a číselné parametry jsou konečné.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export function validatePribehPacienta() {
  const errors = [];
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pribeh-pacienta.json'), 'utf8'));
  const cesta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cesta-pacienta.json'), 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const indIds = new Set(indicators.indicators.map(i => i.id));
  const phaseIds = new Set(cesta.phases.map(p => p.id));
  const diseaseIds = new Set(cesta.diseases.map(d => d.id));

  if (!Number.isFinite(doc.waiting_shift_weeks) || doc.waiting_shift_weeks < 0) {
    errors.push('waiting_shift_weeks musí být nezáporné číslo');
  }
  if (!doc.waiting_shift_source) errors.push('chybí waiting_shift_source');

  if (!Array.isArray(doc.personas) || doc.personas.length === 0) {
    errors.push('chybí neprázdné pole "personas"');
    return report(errors);
  }

  const seen = new Set();
  for (const p of doc.personas) {
    const tag = `persona ${p.id ?? '?'}`;
    if (!p.id) errors.push(`${tag}: chybí id`);
    if (p.id && seen.has(p.id)) errors.push(`${tag}: duplicitní id`);
    if (p.id) seen.add(p.id);
    if (!p.label || !p.sublabel) errors.push(`${tag}: chybí label/sublabel`);
    if (!p.intro || !p.intro_source) errors.push(`${tag}: chybí intro/intro_source`);
    if (!p.outcome_note) errors.push(`${tag}: chybí outcome_note`);
    if (p.disease_ref !== undefined && !diseaseIds.has(p.disease_ref)) {
      errors.push(`${tag}: disease_ref '${p.disease_ref}' neexistuje v cesta-pacienta.json (mají ho jen onkologické persony)`);
    }
    if (!Array.isArray(p.steps) || p.steps.length < 3) {
      errors.push(`${tag}: musí mít aspoň 3 kroky`);
      continue;
    }
    const stepSeen = new Set();
    let hasWaitSensitive = false;
    for (const s of p.steps) {
      const st = `${tag} → krok ${s.id ?? '?'}`;
      if (!s.id || stepSeen.has(s.id)) errors.push(`${st}: chybí/duplicitní id`);
      if (s.id) stepSeen.add(s.id);
      if (!phaseIds.has(s.phase_ref)) errors.push(`${st}: phase_ref '${s.phase_ref}' neexistuje v cesta-pacienta.json`);
      if (!s.title) errors.push(`${st}: chybí title`);
      if (!s.views?.pacient || !s.views?.lekar) errors.push(`${st}: chybí dvojí vyprávění views.pacient/views.lekar`);
      if (!Number.isFinite(s.base_time_weeks) || s.base_time_weeks < 0) errors.push(`${st}: base_time_weeks musí být nezáporné číslo`);
      if (typeof s.wait_sensitive !== 'boolean') errors.push(`${st}: wait_sensitive musí být boolean`);
      if (s.wait_sensitive) hasWaitSensitive = true;
      for (const ind of s.indicators || []) {
        if (!indIds.has(ind)) errors.push(`${st}: indikátor '${ind}' neexistuje v indicators.json`);
      }
      if (!Array.isArray(s.sources) || s.sources.length === 0) errors.push(`${st}: sources musí být neprázdné pole (každý krok musí být doložen)`);
      if (s.decision) {
        if (!s.decision.question) errors.push(`${st}: decision bez question`);
        if (!Array.isArray(s.decision.options) || s.decision.options.length < 2) {
          errors.push(`${st}: decision musí mít aspoň 2 options`);
        } else {
          const optSeen = new Set();
          for (const o of s.decision.options) {
            const ot = `${st} → option ${o.id ?? '?'}`;
            if (!o.id || optSeen.has(o.id)) errors.push(`${ot}: chybí/duplicitní id`);
            if (o.id) optSeen.add(o.id);
            if (!o.label || !o.note) errors.push(`${ot}: chybí label/note`);
            if (!Number.isFinite(o.cost_oop_kc) || o.cost_oop_kc < 0) errors.push(`${ot}: cost_oop_kc musí být nezáporné číslo`);
            if (!Number.isFinite(o.time_weeks_delta)) errors.push(`${ot}: time_weeks_delta musí být číslo`);
          }
        }
      }
    }
    if (!hasWaitSensitive) errors.push(`${tag}: aspoň jeden krok musí být wait_sensitive (napojení na akt II)`);
    if (!p.steps.some(s => s.decision)) errors.push(`${tag}: aspoň jeden krok musí mít decision`);
  }

  return report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`FAIL: pribeh-pacienta.json — ${errors.length} chyb:`);
    errors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('OK: validated pribeh-pacienta.json — persony, kroky, dvojí vyprávění i doklady v pořádku.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validatePribehPacienta() ? 0 : 1);
}
