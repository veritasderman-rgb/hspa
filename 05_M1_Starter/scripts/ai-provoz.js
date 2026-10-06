#!/usr/bin/env node
// Kill switch AI provozu (GOVERNANCE.md § 5).
//
// Stav drží data/ai-provoz.json: { stav: "bezi" | "pozastaveno", od, duvod, kdo }.
// Každý workflow, který něco posílá ven nebo commituje do mainu, a blok A každé
// rutiny spustí jako PRVNÍ krok `node scripts/ai-provoz.js check` — při
// pozastavení skript skončí kódem 1 a job se zastaví dřív, než cokoli udělá.
//
//   node scripts/ai-provoz.js check              # exit 0 = běží, exit 1 = pozastaveno
//   node scripts/ai-provoz.js status             # vypíše stav (JSON)
//   node scripts/ai-provoz.js pause --duvod "…"  [--kdo "…"]
//   node scripts/ai-provoz.js resume             [--kdo "…"]
//
// Skript je úmyslně bez závislostí a bez sítě: musí fungovat i když je rozbité
// všechno ostatní.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STATE_FILE = path.resolve(__dirname, '..', 'data', 'ai-provoz.json');

export const STAVY = ['bezi', 'pozastaveno'];

export function readState(file = STATE_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!STAVY.includes(raw.stav)) {
    // Neznámý stav = pozastaveno. Kill switch musí selhávat bezpečně.
    return { ...raw, stav: 'pozastaveno', duvod: `neplatný stav „${raw.stav}“ v ${path.basename(file)}` };
  }
  return raw;
}

export function isRunning(state) {
  return state.stav === 'bezi';
}

export function setState(file, stav, { duvod = '', kdo = 'Josef Pavlovic', today = new Date() } = {}) {
  if (!STAVY.includes(stav)) throw new Error(`Neplatný stav: ${stav} (povoleno: ${STAVY.join(', ')})`);
  if (stav === 'pozastaveno' && !duvod.trim()) throw new Error('Pozastavení vyžaduje --duvod.');
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const next = {
    ...prev,
    stav,
    od: today.toISOString().slice(0, 10),
    duvod: stav === 'bezi' ? '' : duvod.trim(),
    kdo,
  };
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  return next;
}

export function describe(state) {
  return isRunning(state)
    ? `AI provoz: BĚŽÍ (od ${state.od}, ${state.kdo})`
    : `AI provoz: POZASTAVENO od ${state.od} (${state.kdo}) — ${state.duvod || 'bez udání důvodu'}`;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'check';
  try {
    if (cmd === 'check') {
      const s = readState();
      console.log(describe(s));
      if (!isRunning(s)) {
        console.log('→ Podle GOVERNANCE.md § 5 se nic nepublikuje, neposílá ani nemerguje. Obnovení: workflow ai-provoz.yml → obnovit.');
        process.exit(1);
      }
    } else if (cmd === 'status') {
      console.log(JSON.stringify(readState(), null, 2));
    } else if (cmd === 'pause') {
      const s = setState(STATE_FILE, 'pozastaveno', { duvod: arg('--duvod') || '', kdo: arg('--kdo') || 'Josef Pavlovic' });
      console.log(describe(s));
    } else if (cmd === 'resume') {
      const s = setState(STATE_FILE, 'bezi', { kdo: arg('--kdo') || 'Josef Pavlovic' });
      console.log(describe(s));
    } else {
      console.error(`Neznámý příkaz: ${cmd}. Použij check | status | pause --duvod "…" | resume`);
      process.exit(2);
    }
  } catch (e) {
    console.error(`ai-provoz: ${e.message}`);
    process.exit(2);
  }
}
