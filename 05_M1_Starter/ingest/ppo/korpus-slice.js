// Vyřízne z plného korpusu texty jedné skupiny pro map-agenta (FÁZE 2).
// Orchestrátor NIKDY nečte korpus celý — subagent dostane jen tento výřez.
// Spuštění: node ingest/ppo/korpus-slice.js <group_id> [rok] [cast/celkem]
//   → vypíše na stdout dokumenty skupiny, chronologicky, s oddělovači.
//
// Plný text jde jen z primárních typů jednání (zapis/usneseni/statut/
// jednaci_rad); stanoviska a programy se ZKRACUJÍ na úvodních 1200 znaků —
// jsou to výstupy skupiny (často stovky posudků výrobků), pro strukturu
// jednání stačí vědět, čeho se týkají. Ostatní typy jen metadata.
//
// Stránkování pro obří roky: `cast/celkem` (např. 2/5) rozdělí seřazený
// seznam dokumentů (po filtru rokem) na `celkem` dílů s ~vyrovnaným počtem
// čtených znaků a vypíše jen díl `cast`. Deterministické.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'source');
const gid = Number(process.argv[2]);
const rok = process.argv[3] && !process.argv[3].includes('/') ? String(process.argv[3]) : null;
const castArg = process.argv.find(a => /^\d+\/\d+$/.test(a));
if (!gid) { console.error('Užití: node korpus-slice.js <group_id> [rok] [cast/celkem]'); process.exit(1); }

const PLNE = new Set(['zapis', 'usneseni', 'statut', 'jednaci_rad']);
const ZKRACENE = new Set(['stanovisko', 'program']);
const TRUNC = 1200;
// Strop i pro primární dokumenty: v korpusu jsou OCR přílohy k zápisům
// o stovkách tisíc znaků (skupina 199: 610k / 532k) — samotné by přerostly
// kontext agenta a stránkování je nedělí. Meritum jednání je v úvodu,
// přílohy (kompiláty podkladů) se za stropem uříznou s explicitní značkou.
const PLNE_MAX = 100_000;

const text = zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'ppo_korpus_full.jsonl.gz'))).toString('utf8');
let docs = text.split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(r => Number(r.group_id) === gid && r.method !== 'container')
  .filter(r => !rok || (r.date || '').startsWith(rok))
  .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.doc_id).localeCompare(String(b.doc_id)));

const readableChars = d => {
  if (Number(d.chars) <= 50) return 0;
  if (PLNE.has(d.doctype)) return Math.min(Number(d.chars), PLNE_MAX);
  if (ZKRACENE.has(d.doctype)) return Math.min(Number(d.chars), TRUNC);
  return 0;
};

if (castArg) {
  const [cast, celkem] = castArg.split('/').map(Number);
  const total = docs.reduce((s, d) => s + readableChars(d), 0);
  const cil = total / celkem;
  const parts = Array.from({ length: celkem }, () => []);
  let idx = 0, acc = 0;
  for (const d of docs) {
    parts[idx].push(d);
    acc += readableChars(d);
    if (acc >= cil * (idx + 1) && idx < celkem - 1) idx++;
  }
  docs = parts[cast - 1] ?? [];
}

let tokensEst = 0;
for (const d of docs) {
  const rc = readableChars(d);
  console.log(`\n===== DOKUMENT ${d.doc_id} =====`);
  console.log(`titul: ${d.title}\ndatum: ${d.date ?? '?'}\ntyp: ${d.doctype}\nurl: ${d.url.startsWith('http') ? d.url : 'https://ppo.mzcr.cz' + d.url}`);
  if (rc > 0) {
    const t = d.text.trim();
    const limit = PLNE.has(d.doctype) ? PLNE_MAX : TRUNC;
    console.log('--- text ---');
    console.log(t.length > limit ? t.slice(0, limit) + `\n[… zkráceno, celkem ${d.chars} znaků]` : t);
    tokensEst += rc / 3.2;
  } else {
    console.log(`(text vynechán — typ ${d.doctype}, ${d.chars} znaků)`);
  }
}
console.error(`\n[korpus-slice] skupina ${gid}${rok ? ' rok ' + rok : ''}${castArg ? ' část ' + castArg : ''}: ${docs.length} dokumentů, ~${Math.round(tokensEst / 1000)}k tokenů čteného textu`);
