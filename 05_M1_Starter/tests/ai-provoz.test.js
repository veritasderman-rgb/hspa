// Kill switch (GOVERNANCE.md § 5): musí selhávat bezpečně a stav v repu musí být platný.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readState, isRunning, setState, describe, STATE_FILE } from '../scripts/ai-provoz.js';

function tmp(obj) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-provoz-')), 'ai-provoz.json');
  fs.writeFileSync(f, JSON.stringify(obj));
  return f;
}

test('commitnutý stav je platný a čitelný', () => {
  const s = readState(STATE_FILE);
  assert.ok(['bezi', 'pozastaveno'].includes(s.stav));
  assert.match(s.od, /^\d{4}-\d{2}-\d{2}$/);
  // `kdo` zapisuje workflow ai-provoz.yml jako GitHub login toho, kdo přepnul (github.actor).
  assert.ok(typeof s.kdo === 'string' && s.kdo.trim().length > 0, 'kdo musí být vyplněno');
});

test('neznámý stav se čte jako pozastaveno (fail-safe)', () => {
  const s = readState(tmp({ stav: 'cokoli', od: '2026-01-01' }));
  assert.equal(isRunning(s), false);
  assert.match(s.duvod, /neplatný stav/);
});

test('pause vyžaduje důvod, resume důvod maže', () => {
  const f = tmp({ stav: 'bezi', od: '2026-01-01', kdo: 'Josef Pavlovic' });
  assert.throws(() => setState(f, 'pozastaveno', { duvod: '  ' }), /vyžaduje --duvod/);
  const p = setState(f, 'pozastaveno', { duvod: 'incident S1', today: new Date('2026-10-07T10:00:00Z') });
  assert.equal(p.stav, 'pozastaveno');
  assert.equal(p.od, '2026-10-07');
  assert.match(describe(p), /POZASTAVENO .* incident S1/);
  const r = setState(f, 'bezi', { today: new Date('2026-10-08T10:00:00Z') });
  assert.equal(r.duvod, '');
  assert.equal(isRunning(readState(f)), true);
});

test('CLI check čte soubor z AI_PROVOZ_STATE (crony ho berou z main, ne z vybrané větve)', () => {
  const script = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'scripts', 'ai-provoz.js');
  const run = file => spawnSync(process.execPath, [script, 'check'], { env: { ...process.env, AI_PROVOZ_STATE: file }, encoding: 'utf8' });
  const paused = run(tmp({ stav: 'pozastaveno', od: '2026-10-07', duvod: 'zkouška', kdo: 'test' }));
  assert.equal(paused.status, 1);
  assert.match(paused.stdout, /POZASTAVENO .* zkouška/);
  const running = run(tmp({ stav: 'bezi', od: '2026-10-07', duvod: '', kdo: 'test' }));
  assert.equal(running.status, 0);
  assert.match(running.stdout, /BĚŽÍ/);
});
