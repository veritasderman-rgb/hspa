// Vyřízne z plného korpusu texty jedné skupiny pro map-agenta (FÁZE 2).
// Orchestrátor NIKDY nečte korpus celý — subagent dostane jen tento výřez.
// Spuštění: node ingest/ppo/korpus-slice.js <group_id> [rok]
//   → vypíše na stdout dokumenty skupiny (doctype zapis/usneseni/statut/
//     jednaci_rad; ostatní jen metadata), chronologicky, s oddělovači.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'source');
const gid = Number(process.argv[2]);
const rok = process.argv[3] ? String(process.argv[3]) : null;
if (!gid) { console.error('Užití: node korpus-slice.js <group_id> [rok]'); process.exit(1); }

const CTENE = new Set(['zapis', 'usneseni', 'statut', 'jednaci_rad', 'stanovisko', 'program']);
const text = zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'ppo_korpus_full.jsonl.gz'))).toString('utf8');
const docs = text.split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(r => r.group_id === gid && r.method !== 'container')
  .filter(r => !rok || (r.date || '').startsWith(rok))
  .sort((a, b) => String(a.date).localeCompare(String(b.date)));

let tokensEst = 0;
for (const d of docs) {
  const readable = CTENE.has(d.doctype) && d.chars > 50;
  console.log(`\n===== DOKUMENT ${d.doc_id} =====`);
  console.log(`titul: ${d.title}\ndatum: ${d.date ?? '?'}\ntyp: ${d.doctype}\nurl: ${d.url.startsWith('http') ? d.url : 'https://ppo.mzcr.cz' + d.url}`);
  if (readable) { console.log('--- text ---'); console.log(d.text.trim()); tokensEst += d.chars / 3.2; }
  else console.log(`(text vynechán — typ ${d.doctype}, ${d.chars} znaků)`);
}
console.error(`\n[korpus-slice] skupina ${gid}${rok ? ' rok ' + rok : ''}: ${docs.length} dokumentů, ~${Math.round(tokensEst / 1000)}k tokenů čteného textu`);
