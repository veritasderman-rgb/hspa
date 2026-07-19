// Validátor data/reditel-hra.json — kontrakt pro Tři židle · Akt II
// (Rok ředitele nemocnice). Spouští se v npm run validate:all. Hlídá:
// doložené parametry nemocnice, handoff na existující segmenty hry na
// ministra (vč. shody referenčního požadavku), úplná rozhodnutí s dopady
// v mezích, reakce s precedenty a verdiktová pásma.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VALID_OPERATOR = new Set(['lte', 'lt', 'gte', 'gt']);
const AXIS_EFFECTS = ['personal', 'pacienti'];

export function validateReditelHra() {
  const errors = [];
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'reditel-hra.json'), 'utf8'));
  const vyhlaska = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vyhlaska-hra.json'), 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const indIds = new Set(indicators.indicators.map(i => i.id));
  const vyhlaskaIds = new Set(vyhlaska.segments.map(s => s.id));

  // Nemocnice: každé číslo musí být konečné a doložené (byť „modelový předpoklad")
  const h = doc.hospital || {};
  for (const [num, src] of [
    ['baseline_budget_mil', 'baseline_budget_source'],
    ['structural_deficit_mil', 'structural_deficit_source'],
    ['personnel_share_pct', 'personnel_share_source'],
    ['personnel_drift_pct', 'personnel_drift_source'],
    ['other_drift_pct', 'other_drift_source'],
  ]) {
    if (!Number.isFinite(h[num])) errors.push(`hospital.${num} musí být číslo`);
    if (!h[src]) errors.push(`hospital.${src} chybí (každé číslo musí být doloženo)`);
  }
  if (!h.label || !h.profile || !h.profile_source) errors.push('hospital: chybí label/profile/profile_source');

  // Handoff na akt I
  const hf = doc.handoff || {};
  if (!Array.isArray(hf.segments) || hf.segments.length === 0) {
    errors.push('handoff.segments musí být neprázdné pole');
  } else {
    let wsum = 0;
    for (const s of hf.segments) {
      if (!vyhlaskaIds.has(s.id)) errors.push(`handoff: segment '${s.id}' neexistuje ve vyhlaska-hra.json`);
      if (!Number.isFinite(s.weight) || s.weight <= 0) errors.push(`handoff: segment '${s.id}' má neplatnou weight`);
      else wsum += s.weight;
    }
    if (Math.abs(wsum - 1) > 0.001) errors.push(`handoff: součet vah musí být 1 (je ${wsum})`);
  }
  if (!Number.isFinite(hf.default_growth_pct) || !hf.default_growth_source) {
    errors.push('handoff: chybí default_growth_pct nebo default_growth_source');
  }
  const akutni = vyhlaska.segments.find(s => s.id === 'akutni_luzkova');
  if (!Number.isFinite(hf.demand_ref_pct) || !hf.demand_ref_source) {
    errors.push('handoff: chybí demand_ref_pct nebo demand_ref_source');
  } else if (akutni && hf.demand_ref_pct !== akutni.demand_pct) {
    errors.push(`handoff.demand_ref_pct (${hf.demand_ref_pct}) nesouhlasí s demand_pct akutni_luzkova ve vyhlaska-hra.json (${akutni.demand_pct})`);
  }

  // Osy
  const axisIds = new Set((doc.axes || []).map(a => a.id));
  for (const id of ['hospodareni', 'personal', 'pacienti']) {
    if (!axisIds.has(id)) errors.push(`axes: chybí osa '${id}'`);
  }

  // Rozhodnutí
  if (!Array.isArray(doc.decisions) || doc.decisions.length === 0) {
    errors.push('chybí neprázdné pole "decisions"');
    return report(errors);
  }
  const seen = new Set();
  for (const d of doc.decisions) {
    const tag = `rozhodnutí ${d.id ?? '?'}`;
    if (!d.id) errors.push(`${tag}: chybí id`);
    if (d.id && seen.has(d.id)) errors.push(`${tag}: duplicitní id`);
    if (d.id) seen.add(d.id);
    if (!Number.isInteger(d.quarter) || d.quarter < 1 || d.quarter > 4) errors.push(`${tag}: quarter musí být 1–4`);
    if (!d.label || !d.question) errors.push(`${tag}: chybí label/question`);
    if (!d.context || !d.context_source) errors.push(`${tag}: chybí context/context_source (kontext musí být doložen)`);
    for (const ind of d.indicator_links || []) {
      if (!indIds.has(ind)) errors.push(`${tag}: indicator_links '${ind}' neexistuje v indicators.json`);
    }
    if (!Array.isArray(d.options) || d.options.length < 2) {
      errors.push(`${tag}: musí mít aspoň 2 options`);
      continue;
    }
    const optSeen = new Set();
    for (const o of d.options) {
      const ot = `${tag} → option ${o.id ?? '?'}`;
      if (!o.id || optSeen.has(o.id)) errors.push(`${ot}: chybí/duplicitní id`);
      if (o.id) optSeen.add(o.id);
      if (!o.label || !o.note) errors.push(`${ot}: chybí label/note`);
      if (!Number.isFinite(o.cost_mil)) errors.push(`${ot}: cost_mil musí být číslo`);
      for (const ax of AXIS_EFFECTS) {
        const v = o.effects?.[ax];
        if (!Number.isInteger(v) || v < -2 || v > 2) errors.push(`${ot}: effects.${ax} musí být celé číslo −2..2`);
      }
    }
  }
  for (let q = 1; q <= 4; q += 1) {
    if (!doc.decisions.some(d => d.quarter === q)) errors.push(`kvartál ${q} nemá žádné rozhodnutí`);
  }

  // Reakce
  for (const r of doc.reactions || []) {
    const tag = `reakce ${r.id ?? '?'}`;
    if (!r.id) errors.push(`${tag}: chybí id`);
    if (!axisIds.has(r.axis)) errors.push(`${tag}: axis '${r.axis}' neexistuje`);
    if (!VALID_OPERATOR.has(r.operator)) errors.push(`${tag}: operator musí být lte|lt|gte|gt`);
    if (!Number.isFinite(r.threshold)) errors.push(`${tag}: threshold musí být číslo`);
    if (!r.label || !r.desc) errors.push(`${tag}: chybí label/desc`);
    if (!r.precedent_source) errors.push(`${tag}: chybí precedent_source (každá reakce musí mít doklad)`);
  }
  if (!Array.isArray(doc.reactions) || doc.reactions.length === 0) errors.push('chybí neprázdné pole "reactions"');

  // Verdiktová pásma
  for (const id of axisIds) {
    const b = doc.verdict_bands?.[id];
    if (!b || !Number.isFinite(b.good_gte) || !Number.isFinite(b.mid_gte)) {
      errors.push(`verdict_bands.${id}: chybí good_gte/mid_gte`);
    } else if (b.good_gte <= b.mid_gte) {
      errors.push(`verdict_bands.${id}: good_gte musí být > mid_gte`);
    }
  }

  return report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`FAIL: reditel-hra.json — ${errors.length} chyb:`);
    errors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('OK: validated reditel-hra.json — nemocnice, handoff, rozhodnutí i reakce v pořádku.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validateReditelHra() ? 0 : 1);
}
