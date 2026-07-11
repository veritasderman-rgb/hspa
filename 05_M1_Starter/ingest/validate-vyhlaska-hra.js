// Validátor data/vyhlaska-hra.json — kontrakt pro hru Úhradová vyhláška.
// Spouští se v npm run validate:all. Hlídá: doložené baseline (suma ≈ celkem),
// úplné zástupce se zdroji argumentů, všechny eskalační stavy, modelové
// požadavky, integritu efektů (indikátor existuje, directional má vše),
// a že presety se vejdou do obálky.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VALID_KIND = new Set(['definitional', 'directional', 'none']);
const VALID_POLARITY = new Set(['up', 'down']);
const VALID_STRENGTH = new Set(['weak', 'medium', 'strong']);
const ESCALATION_STATES = ['agree', 'grudging', 'no_deal', 'protest'];

export function validateVyhlaskaHra() {
  const errors = [];
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vyhlaska-hra.json'), 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const indIds = new Set(indicators.indicators.map(i => i.id));

  if (!doc.envelope || !Number.isFinite(doc.envelope.amount_mld) || !doc.envelope.source) {
    errors.push('envelope: chybí amount_mld nebo source');
  }
  if (!Number.isFinite(doc.current_total_mld) || !doc.current_total_source) {
    errors.push('chybí current_total_mld nebo current_total_source (letošní objem systému)');
  }
  if (!Array.isArray(doc.segments) || doc.segments.length === 0) {
    errors.push('chybí neprázdné pole "segments"');
    return report(errors);
  }

  const seen = new Set();
  let baseSum = 0;
  for (const s of doc.segments) {
    const tag = `segment ${s.id ?? '?'}`;
    if (!s.id) errors.push(`${tag}: chybí id`);
    if (s.id && seen.has(s.id)) errors.push(`${tag}: duplicitní id`);
    if (s.id) seen.add(s.id);
    if (!s.label) errors.push(`${tag}: chybí label`);
    if (!Number.isFinite(s.baseline_mld)) errors.push(`${tag}: baseline_mld musí být číslo`);
    else baseSum += s.baseline_mld;
    if (!s.baseline_source) errors.push(`${tag}: chybí baseline_source (každé číslo musí být doloženo)`);

    const r = s.representative || {};
    if (!r.role) errors.push(`${tag}: chybí representative.role`);
    if (!r.argument) errors.push(`${tag}: chybí representative.argument`);
    if (!Array.isArray(r.argument_sources) || r.argument_sources.length === 0) {
      errors.push(`${tag}: representative.argument_sources musí být neprázdné pole`);
    }
    if (!Number.isFinite(s.demand_pct)) errors.push(`${tag}: demand_pct musí být číslo`);
    if (!s.demand_reasoning) errors.push(`${tag}: chybí demand_reasoning (modelový požadavek musí být vysvětlen)`);

    const esc = s.escalation || {};
    for (const state of ESCALATION_STATES) {
      if (!esc[state]) errors.push(`${tag}: escalation.${state} chybí`);
    }
    if (!s.real_2027) errors.push(`${tag}: chybí real_2027 (srovnání s realitou DR 2027)`);

    if (!Array.isArray(s.effects) || s.effects.length === 0) {
      errors.push(`${tag}: chybí effects (aspoň kind:none s poznámkou)`);
      continue;
    }
    for (const eff of s.effects) {
      const et = `${tag} → efekt ${eff.indicator ?? eff.kind}`;
      if (!VALID_KIND.has(eff.kind)) errors.push(`${et}: kind musí být definitional|directional|none`);
      if (!eff.source) errors.push(`${et}: chybí source`);
      if (eff.kind === 'definitional' || eff.kind === 'directional') {
        if (!eff.indicator || !indIds.has(eff.indicator)) {
          errors.push(`${et}: indikátor neexistuje v indicators.json`);
        }
      }
      if (eff.kind === 'definitional' && eff.group_segments) {
        for (const gid of eff.group_segments) {
          if (!doc.segments.some(x => x.id === gid)) {
            errors.push(`${et}: group_segments odkazuje na neznámý segment '${gid}'`);
          }
        }
      }
      if (eff.kind === 'directional') {
        if (!VALID_POLARITY.has(eff.polarity)) errors.push(`${et}: directional polarity musí být up|down`);
        if (!VALID_STRENGTH.has(eff.strength)) errors.push(`${et}: directional strength musí být weak|medium|strong`);
      }
    }
  }

  if (Number.isFinite(doc.baseline_total_mld) && Math.abs(baseSum - doc.baseline_total_mld) > 1) {
    errors.push(`suma baseline_mld (${baseSum.toFixed(1)}) se liší od baseline_total_mld (${doc.baseline_total_mld}) o víc než 1 mld`);
  }

  // Presety: validní segmenty + vejdou se do obálky (v dnešních cenách — scale)
  const scale = Number.isFinite(doc.current_total_mld) && baseSum > 0
    ? doc.current_total_mld / baseSum : 1;
  for (const p of doc.presets || []) {
    const pt = `preset ${p.id ?? '?'}`;
    let cost = 0;
    for (const [segId, pct] of Object.entries(p.alloc || {})) {
      const seg = doc.segments.find(s => s.id === segId);
      if (!seg) { errors.push(`${pt}: neznámý segment '${segId}'`); continue; }
      if (!Number.isFinite(pct)) errors.push(`${pt}: alokace '${segId}' musí být číslo`);
      else cost += seg.baseline_mld * scale * (pct / 100);
    }
    for (const s of doc.segments) {
      if (!(s.id in (p.alloc || {}))) errors.push(`${pt}: chybí alokace segmentu '${s.id}'`);
    }
    if (doc.envelope && Number.isFinite(doc.envelope.amount_mld) && cost > doc.envelope.amount_mld + 0.05) {
      errors.push(`${pt}: cena ${cost.toFixed(1)} mld (škálováno na ${doc.current_year ?? 'dnešek'}) překračuje obálku ${doc.envelope.amount_mld} mld`);
    }
  }

  return report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`FAIL: vyhlaska-hra.json — ${errors.length} chyb:`);
    errors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('OK: validated vyhlaska-hra.json — segmenty, zástupci, efekty i presety v pořádku.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validateVyhlaskaHra() ? 0 : 1);
}
