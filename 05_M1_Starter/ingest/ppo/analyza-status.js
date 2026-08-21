// FÁZE 2 — stavový přehled: které skupiny už mají validní výstup mapy
// a které čekají. Umožňuje idempotentní resume (PLAN-PPO.md §4.5).
// Spuštění: node ingest/ppo/analyza-status.js [--json]

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, 'source');
const ANA = path.join(DIR, 'analyza');
fs.mkdirSync(ANA, { recursive: true });

const CTENE = new Set(['zapis', 'usneseni', 'statut', 'jednaci_rad']);
const SKIP = new Set([66]);

const korpus = zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'ppo_korpus_full.jsonl.gz')))
  .toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

const chars = new Map();
for (const r of korpus) {
  if (SKIP.has(r.group_id) || !CTENE.has(r.doctype) || r.chars < 50) continue;
  chars.set(r.group_id, (chars.get(r.group_id) || 0) + r.chars);
}

const stav = [];
for (const [gid, ch] of [...chars.entries()].sort((a, b) => b[1] - a[1])) {
  const f = path.join(ANA, `skupina-${gid}.json`);
  let ok = false;
  if (fs.existsSync(f)) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      ok = Array.isArray(j.jednani) && typeof j.profil === 'object';
    } catch { ok = false; }
  }
  stav.push({ gid, tokeny_odhad: Math.round(ch / 3.2 / 1000) + 'k',
              davek: Math.max(1, Math.ceil(ch / 3.2 / 55000)), hotovo: ok });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(stav, null, 1));
} else {
  const todo = stav.filter(s => !s.hotovo);
  console.log(`Skupin s čitelným obsahem: ${stav.length} · hotovo: ${stav.length - todo.length} · zbývá: ${todo.length}`);
  for (const s of todo) console.log(`  #${s.gid}  ~${s.tokeny_odhad} tokenů  (${s.davek} dávek)`);
}
