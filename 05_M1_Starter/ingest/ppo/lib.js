// Sdílené utility pro FÁZE 1 skripty nad daty ppo.mzcr.cz (PLAN-PPO.md §3).
// Zdrojová data: ingest/ppo/source/ (ppo_data.json, ppo_clenove.csv,
// ppo_osoby.csv, ppo_dokumenty.csv, ppo_korpus_full.jsonl.gz).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.join(__dirname, 'source');
export const OUT = path.join(__dirname, 'out');

// Přístrojová komise — vynechána rozhodnutím vlastníka (PLAN-PPO.md §4.4).
export const SKIP_GROUPS = new Set([66]);

/* ---------- CSV (jednoduchý parser: uvozovky, čárky, BOM) ---------- */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length > 1).map(r =>
    Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(SRC, name), 'utf8'));
}

export function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(SRC, name), 'utf8'));
}

export function readKorpusIndex() {
  // Jen metadata (bez textu) — na kadence a typy dokumentů stačí.
  const gz = path.join(SRC, 'ppo_korpus_full.jsonl.gz');
  if (!fs.existsSync(gz)) return null;
  const text = zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8');
  return text.split('\n').filter(Boolean).map(l => {
    const r = JSON.parse(l);
    const { text: _t, ...meta } = r;
    return meta;
  });
}

export function writeOut(name, data) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, typeof data === 'string' ? data
    : JSON.stringify(data, null, 1) + '\n');
  console.log(`✓ ${path.relative(process.cwd(), p)} (${fs.statSync(p).size} B)`);
}

/* ---------- klasifikace profese z titulů (PLAN-PPO.md §3.2) ---------- */
const PROF_RULES = [
  [/MUDr\./, 'lekar'],
  [/MDDr\.|MSDr\./, 'zubni_lekar'],
  [/MVDr\./, 'veterinar'],
  [/PharmDr\.|Mgr\.\s*Pharm/, 'farmaceut'],
  [/JUDr\./, 'pravnik'],
];
const NELEKAR_HINT = /(Ing\.|Mgr\.|PhDr\.|RNDr\.|PaedDr\.|ThDr\.|Bc\.|DiS\.|Ph\.D|MBA|prof\.|doc\.)/;

export function classifyProfession(name, affiliation = '') {
  for (const [re, prof] of PROF_RULES) if (re.test(name)) return prof;
  const aff = affiliation.toLowerCase();
  if (/sester|sestra|ošetřovatel|porodní asistent/.test(aff)) return 'sestra_nelekar_zdrav';
  if (/advokát|právn/.test(aff)) return 'pravnik';
  if (NELEKAR_HINT.test(name)) return 'nelekar_vs';       // VŠ nelékař (Ing./Mgr./…)
  if (name.trim()) return 'bez_titulu';
  return 'neznamo';
}

/* ---------- kategorie afiliace (slovník klíčových slov) ---------- */
const AFF_RULES = [
  // Pozor na české skloňování — vzory chytají i genitivy (…ústavu, Odboru…).
  ['mz_urednik', /MZD?\/|ministerstv[oau] zdravotnictví|MZ ČR|MZd|kancelář(?:e)? ministra|kabinet(?:u)? ministra|odbor .* MZ|náměst(?:ek|kyně|ka) ministr|ministr(?:yně|a)? zdravotnictví|hlavní hygieni|odboru? zdravotnick/i],
  ['statni_instituce', /ÚZIS|SÚKL|státní(?:ho)? ústav(?:u)? pro kontrolu léčiv|SZÚ|státní(?:ho)? zdravotní(?:ho)? ústav|zdravotnických informací a statistiky|NSC|Národní(?:ho)? screeningov|AZV|IPVZ|NCO ?NZO|KHS|hygienick|SÚJB|NÚDZ(?!.*univerz)/i],
  ['pojistovna', /VZP|OZP(?!\s*MZ)|ZPMV|VoZP|ČPZP|RBP|Svaz zdravotních pojišťoven|zdravotní pojišťovn/i],
  ['odborna_spolecnost', /ČLS JEP|odborn[áé] společnost|společnost .* ČLS|asociace klinick/i],
  ['komora', /ČLK|ČSK|ČLnK|Česká lékařská komora|stomatologická komora|lékárnická komora|KZP(?!S)/i],
  ['nemocnice', /nemocnice|FN |IKEM|ÚVN|fakultní|klinika|léčebna|poliklinika|zdravotnické zařízení|MOÚ|ÚHKT/i],
  ['akademie', /univerzit|1\. ?LF|2\. ?LF|3\. ?LF|LF UK|LF MU|LF UP|fakult|akademie věd|AV ČR|vysoká škola|CERGE|děkan/i],
  ['pacientska_org', /pacient|Aliance žen|Národní asociace pacient|spolek(?!.*lékař)/i],
  ['asociace_poskytovatelu', /AČMN|ANČR|AN ČR|asociace nemocnic|asociace poskytovatel|AZZS|záchrann|SAS(?![A-Za-z])|sdružení ambulantních|SPL|sdružení praktických lékařů|praktick.*lékař.*sdružení|mladí lékaři/i],
  ['kraj_obec', /krajsk[ýé] úřad|kraj(?![a-z])|magistrát|hejtman|město|obec/i],
  ['jine_ministerstvo', /MPSV|MŠMT|ministerstvo (?!zdravotnictví)/i],
  ['odbory', /odborov|OSZSP|LOK(?![a-z])/i],
];

export function classifyAffiliation(affiliation = '') {
  if (!affiliation.trim()) return 'neuvedeno';
  for (const [cat, re] of AFF_RULES) if (re.test(affiliation)) return cat;
  return 'nezarazeno'; // → osoby-nezarazene.csv → dočištění LLM dávkou
}
