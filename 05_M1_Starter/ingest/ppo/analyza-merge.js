// FÁZE 2 — deterministické sloučení dílčích výstupů mapy.
// Map-agenti zapisují analyza/partial/skupina-<gid>-<značka>.json (i skupiny
// s jedinou dávkou); tenhle skript je složí do analyza/skupina-<gid>.json:
//   - jednani: konkatenace, řazení dle (datum, doc_id), dedup dle doc_id
//     (vyhrává první výskyt v pořadí dílů řazených dle názvu souboru)
//   - hygienické filtry proti korpusu (Codex review PR #1036):
//       · jednani z dokumentu bez čitelného textu (chars <= 50, např.
//         nepodporované ZIP přílohy) se zahazují — nejsou to jednání
//       · jednani z dokumentu, jehož typ není zapis/usneseni, se zahazují
//       · dokumenty s bajtově shodným textem (tentýž zápis pod více doc_id)
//         se dedupují dle sha1 hashe textu — vyhrává první dle (datum, doc_id)
//   - statut_shrnuti / pravidla: první ne-null hodnota
//   - normalizace klíčů: LLM agenti občas napíšou klíč s diakritikou
//     („rozhodnutí", „termín") — deterministicky se přejmenují na kanonické
//     ASCII klíče schématu, aby merged výstup nikdy nenesl obě varianty
// Spuštění: node ingest/ppo/analyza-merge.js

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ANA = path.join(DIR, 'analyza');
const PART = path.join(ANA, 'partial');
fs.mkdirSync(PART, { recursive: true });

// Index korpusu: doc_id → { chars, doctype, textHash }. Merge je
// deterministický orchestrální skript — korpus číst smí (zákaz platí
// pro hlavní LLM smyčku).
const JEDNANI_TYPY = new Set(['zapis', 'usneseni']);
// Přílohy zápisů (metodiky, podklady, podněty s návrhy usnesení) nesou
// v korpusu doctype zapis/usneseni (70 dokumentů), ale nejsou to záznamy
// jednání — poznají se podle názvu (Codex review PR #1041). Název má tvar
// „stránka / soubor", příloha se pozná v kterémkoli segmentu.
const isPriloha = t => String(t ?? '').split('/').some(s => /^příloh/i.test(s.trim()));
const korpusIdx = new Map();
{
  const gz = path.join(DIR, 'source', 'ppo_korpus_full.jsonl.gz');
  const text = zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    const r = JSON.parse(line);
    korpusIdx.set(r.doc_id, {
      chars: Number(r.chars) || 0,
      doctype: r.doctype,
      priloha: isPriloha(r.title),
      textHash: crypto.createHash('sha1').update(r.text ?? '').digest('hex'),
    });
  }
}

// Kanonizace klíčů s diakritikou (Codex review PR #1038). Alias se přejmenuje
// jen pokud kanonický klíč chybí; jinak se zahodí (kanonický vyhrává).
const KEY_ALIASES = new Map([['rozhodnutí', 'rozhodnuti'], ['termín', 'termin'], ['úkoly', 'ukoly']]);
function canonKeys(v) {
  if (Array.isArray(v)) return v.map(canonKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const canon = KEY_ALIASES.get(k) ?? k;
      if (!(canon in out)) out[canon] = canonKeys(val);
    }
    return out;
  }
  return v;
}

const byGid = new Map();
for (const f of fs.readdirSync(PART).sort()) {
  const m = /^skupina-(\d+)-.+\.json$/.exec(f);
  if (!m) continue;
  const gid = Number(m[1]);
  if (!byGid.has(gid)) byGid.set(gid, []);
  byGid.get(gid).push(path.join(PART, f));
}

let ok = 0, bad = 0;
for (const [gid, files] of [...byGid.entries()].sort((a, b) => a[0] - b[0])) {
  const jednani = [];
  const seen = new Set();
  let statut = null, pravidla = null, vyrazeno = 0, errs = [];
  for (const f of files) {
    let j;
    try { j = canonKeys(JSON.parse(fs.readFileSync(f, 'utf8'))); }
    catch (e) { errs.push(`${path.basename(f)}: nevalidní JSON (${e.message})`); continue; }
    for (const x of j.jednani ?? []) {
      if (!x?.doc_id || seen.has(x.doc_id)) continue;
      const meta = korpusIdx.get(x.doc_id);
      if (!meta || meta.chars <= 50 || !JEDNANI_TYPY.has(meta.doctype) || meta.priloha) { vyrazeno++; continue; }
      seen.add(x.doc_id);
      jednani.push(x);
    }
    if (statut == null && j.statut_shrnuti) statut = j.statut_shrnuti;
    if (pravidla == null && j.pravidla) pravidla = j.pravidla;
  }
  if (errs.length) { bad++; console.error(`✗ skupina ${gid}: ${errs.join('; ')}`); continue; }
  jednani.sort((a, b) => String(a.datum ?? '9999').localeCompare(String(b.datum ?? '9999'))
    || String(a.doc_id).localeCompare(String(b.doc_id)));
  // dedup bajtově shodných textů (tentýž zápis pod více doc_id)
  const seenHash = new Set();
  const unikatni = jednani.filter(x => {
    const h = korpusIdx.get(x.doc_id).textHash;
    if (seenHash.has(h)) { vyrazeno++; return false; }
    seenHash.add(h);
    return true;
  });
  jednani.length = 0;
  jednani.push(...unikatni);
  const out = { group_id: gid, jednani, statut_shrnuti: statut, pravidla };
  fs.writeFileSync(path.join(ANA, `skupina-${gid}.json`), JSON.stringify(out, null, 1) + '\n');
  ok++;
  console.log(`✓ skupina-${gid}.json (${jednani.length} jednání z ${files.length} dílů${vyrazeno ? `, ${vyrazeno} vyřazeno filtry` : ''})`);
}
console.log(`\nSloučeno ${ok} skupin${bad ? `, ${bad} s chybou` : ''}.`);
process.exit(bad ? 1 : 0);
