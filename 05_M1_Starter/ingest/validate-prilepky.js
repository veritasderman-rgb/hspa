// Validace data/prilepky.json (pozměňovací návrhy mimo předmět zákona).
// Spouštěj: node ingest/validate-prilepky.js · součást `npm run validate:all`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIGNALY } from './lib/prilepky.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const UROVNE = ['vysoka', 'stredni', 'nizka'];
const ZAKON_RE = /^\d{1,4}\/\d{4}$/;
const PSP_URL_RE = /^https:\/\/www\.psp\.cz\/sqw\//;
const SIGNALY_TISKU = ['bez_pripominkoveho_rizeni', 'navrh_schvalit_v_prvnim_cteni'];
// Web nález popisuje, neoznačuje. Slovo „přílepek“ je verdikt (Pl. ÚS 77/06), v datech být nesmí.
const VERDIKT_RE = /přílep/i;

export function validatePrilepky(data) {
  const errors = [];
  for (const f of ['version', 'generated_at', 'source', 'obdobi', 'pokryti', 'signaly']) {
    if (data[f] == null) errors.push(`Missing ${f}`);
  }
  if (!Array.isArray(data.tisky)) { errors.push('tisky must be array'); return errors; }
  const seen = new Set();
  for (const [i, t] of data.tisky.entries()) {
    const tag = `tisk[${i}] (${t.ct ?? '?'})`;
    if (!Number.isInteger(t.ct)) errors.push(`${tag}: ct must be integer`);
    if (seen.has(t.ct)) errors.push(`${tag}: duplicate ct`);
    seen.add(t.ct);
    if (!t.nazev) errors.push(`${tag}: missing nazev`);
    if (!PSP_URL_RE.test(t.url ?? '')) errors.push(`${tag}: url must point to psp.cz`);
    if (!UROVNE.includes(t.uroven)) errors.push(`${tag}: invalid uroven '${t.uroven}'`);
    if (!Array.isArray(t.predmet) || t.predmet.some(z => !ZAKON_RE.test(z))) errors.push(`${tag}: predmet must be list of N/RRRR`);
    for (const s of t.signaly ?? []) if (!SIGNALY_TISKU.includes(s)) errors.push(`${tag}: unknown signal '${s}'`);
    if (!Array.isArray(t.navrhy)) { errors.push(`${tag}: navrhy must be array`); continue; }
    if (!t.navrhy.length && !(t.signaly ?? []).length) errors.push(`${tag}: no finding`);
    for (const n of t.navrhy) {
      const nt = `${tag} dokument ${n.cd ?? '?'}`;
      if (!Number.isInteger(n.cd)) errors.push(`${nt}: cd must be integer`);
      if (!PSP_URL_RE.test(n.url ?? '')) errors.push(`${nt}: url must point to psp.cz`);
      if (!UROVNE.includes(n.uroven)) errors.push(`${nt}: invalid uroven`);
      if (!n.signaly?.length) errors.push(`${nt}: no signal`);
      for (const s of n.signaly ?? []) if (!(s in SIGNALY)) errors.push(`${nt}: unknown signal '${s}'`);
      if (!n.mimo_predmet?.length) errors.push(`${nt}: mimo_predmet empty`);
      for (const z of n.mimo_predmet ?? []) {
        if (!ZAKON_RE.test(z.cislo ?? '')) errors.push(`${nt}: invalid law number '${z.cislo}'`);
        if (t.predmet?.includes(z.cislo)) errors.push(`${nt}: zákon ${z.cislo} je v předmětu tisku, není mimo`);
        // Citace musí být doslovná a musí obsahovat číslo zákona, o kterém nález mluví.
        if (!z.citace || !z.citace.replace(/\s+/g, '').includes(`${z.cislo}Sb.`)) errors.push(`${nt}: citace neobsahuje „${z.cislo} Sb.“`);
      }
    }
  }
  if (VERDIKT_RE.test(JSON.stringify({ ...data, _doc: '', tisky: data.tisky.map(t => ({ ...t, nazev: '', uplny_nazev: '', navrhy: t.navrhy.map(n => ({ ...n, mimo_predmet: [] })) })) }))) {
    errors.push('Dataset nesmí nález označovat slovem „přílepek“ — popisuje postup, verdikt nevynáší');
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(ROOT, 'data', 'prilepky.json');
  const errors = validatePrilepky(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (errors.length) {
    console.error(`✗ prilepky.json: ${errors.length} chyb`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('✓ prilepky.json validní');
}
