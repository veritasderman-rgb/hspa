// FÁZE 1 — spustí všechny deterministické buildery (PLAN-PPO.md §3).
// Spuštění: node ingest/ppo/run.js
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
for (const s of ['build-osoby.js', 'build-skupiny.js', 'build-sit.js', 'build-kalendar.js']) {
  console.log(`\n── ${s} ──`);
  execFileSync('node', [path.join(dir, s)], { stdio: 'inherit' });
}
