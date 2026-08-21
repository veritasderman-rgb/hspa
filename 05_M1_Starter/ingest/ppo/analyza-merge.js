// FÁZE 2 — deterministické sloučení dílčích výstupů mapy.
// Map-agenti zapisují analyza/partial/skupina-<gid>-<značka>.json (i skupiny
// s jedinou dávkou); tenhle skript je složí do analyza/skupina-<gid>.json:
//   - jednani: konkatenace, řazení dle (datum, doc_id), dedup dle doc_id
//     (vyhrává první výskyt v pořadí dílů řazených dle názvu souboru)
//   - statut_shrnuti / pravidla: první ne-null hodnota
// Spuštění: node ingest/ppo/analyza-merge.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ANA = path.join(DIR, 'analyza');
const PART = path.join(ANA, 'partial');
fs.mkdirSync(PART, { recursive: true });

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
  let statut = null, pravidla = null, errs = [];
  for (const f of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { errs.push(`${path.basename(f)}: nevalidní JSON (${e.message})`); continue; }
    for (const x of j.jednani ?? []) {
      if (x?.doc_id && !seen.has(x.doc_id)) { seen.add(x.doc_id); jednani.push(x); }
    }
    if (statut == null && j.statut_shrnuti) statut = j.statut_shrnuti;
    if (pravidla == null && j.pravidla) pravidla = j.pravidla;
  }
  if (errs.length) { bad++; console.error(`✗ skupina ${gid}: ${errs.join('; ')}`); continue; }
  jednani.sort((a, b) => String(a.datum ?? '9999').localeCompare(String(b.datum ?? '9999'))
    || String(a.doc_id).localeCompare(String(b.doc_id)));
  const out = { group_id: gid, jednani, statut_shrnuti: statut, pravidla };
  fs.writeFileSync(path.join(ANA, `skupina-${gid}.json`), JSON.stringify(out, null, 1) + '\n');
  ok++;
  console.log(`✓ skupina-${gid}.json (${jednani.length} jednání z ${files.length} dílů)`);
}
console.log(`\nSloučeno ${ok} skupin${bad ? `, ${bad} s chybou` : ''}.`);
process.exit(bad ? 1 : 0);
