// FÁZE 2 — deterministická validace výstupů LLM mapy/profilů.
// Spuštění: node ingest/ppo/analyza-validate.js <gid> | --all
// Exit 0 = OK, 1 = chyby (vypíše co a kde).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ANA = path.join(DIR, 'analyza');

const isStr = v => typeof v === 'string' && v.length > 0;
const isArr = Array.isArray;
const optStr = v => v === null || typeof v === 'string';
const UKOL_KEYS = new Set(['co', 'kdo', 'termin']);

// Všechny klíče schématu jsou ASCII — klíč s diakritikou („termín") je slip
// LLM agenta, který by konzumentům tiše schoval hodnoty (Codex review PR #1038).
function checkAsciiKeys(v, errs, cesta) {
  if (isArr(v)) { v.forEach((x, i) => checkAsciiKeys(x, errs, `${cesta}[${i}]`)); return; }
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) {
      if (/[^\x20-\x7E]/.test(k)) errs.push(`${cesta}.${k}: klíč není ASCII`);
      checkAsciiKeys(val, errs, `${cesta}.${k}`);
    }
  }
}

function checkJednani(j, errs, i) {
  const p = `jednani[${i}]`;
  if (!isStr(j.doc_id)) errs.push(`${p}.doc_id chybí`);
  if (!optStr(j.datum)) errs.push(`${p}.datum musí být string|null`);
  if (j.datum && !/^20\d{2}(-\d{2}-\d{2})?$/.test(j.datum)) errs.push(`${p}.datum formát`);
  for (const k of ['temata', 'rozhodnuti', 'aktivni_osoby', 'zminene_organizace',
                   'zminene_dokumenty', 'odkazy_na_jine_skupiny', 'citace', 'stret_zajmu'])
    if (!isArr(j[k])) errs.push(`${p}.${k} musí být pole`);
  if (!isArr(j.ukoly)) errs.push(`${p}.ukoly musí být pole`);
  else j.ukoly.forEach((u, k) => {
    if (!u || typeof u !== 'object' || !isStr(u.co)) { errs.push(`${p}.ukoly[${k}].co chybí`); return; }
    for (const kk of Object.keys(u))
      if (!UKOL_KEYS.has(kk)) errs.push(`${p}.ukoly[${k}]: neznámý klíč '${kk}' (schéma zná co/kdo/termin)`);
  });
  if (isArr(j.citace) && j.citace.length > 2) errs.push(`${p}.citace > 2`);
}

function checkFile(f) {
  const errs = [];
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { return [`nevalidní JSON: ${e.message}`]; }
  if (!Number.isInteger(j.group_id)) errs.push('group_id chybí');
  checkAsciiKeys(j, errs, '');
  if (!isArr(j.jednani)) errs.push('jednani musí být pole');
  else j.jednani.forEach((x, i) => checkJednani(x, errs, i));
  if (!('pravidla' in j)) errs.push('pravidla chybí (musí být objekt, nebo explicitní null)');
  else if (j.pravidla !== null) {
    if (typeof j.pravidla !== 'object' || Array.isArray(j.pravidla)) errs.push('pravidla musí být objekt|null');
    else for (const k of ['jmenovani', 'rozhodovani', 'kvorum', 'stret_zajmu', 'zverejnovani', 'kadence'])
      if (!(k in j.pravidla) || !optStr(j.pravidla[k])) errs.push(`pravidla.${k} chybí nebo není string|null`);
  }
  if (j.profil !== undefined && j.profil !== null) {
    const p = j.profil;
    if (!isStr(p.co_dela)) errs.push('profil.co_dela chybí');
    for (const k of ['hlavni_temata', 'co_se_pripravuje', 'otevrene_ukoly', 'kdo_vystupuje'])
      if (!isArr(p[k])) errs.push(`profil.${k} musí být pole`);
    if (typeof p.transparentnost !== 'object') errs.push('profil.transparentnost chybí');
  }
  return errs;
}

const arg = process.argv[2];
if (!arg) { console.error('Užití: analyza-validate.js <gid> | --all'); process.exit(1); }
const files = arg === '--all'
  ? fs.readdirSync(ANA).filter(f => /^skupina-\d+\.json$/.test(f)).map(f => path.join(ANA, f))
  : [path.join(ANA, `skupina-${arg}.json`)];

let bad = 0;
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`✗ ${f} neexistuje`); bad++; continue; }
  const errs = checkFile(f);
  if (errs.length) { bad++; console.error(`✗ ${path.basename(f)}:`); errs.slice(0, 10).forEach(e => console.error('   - ' + e)); }
  else console.log(`✓ ${path.basename(f)}`);
}
process.exit(bad ? 1 : 0);
