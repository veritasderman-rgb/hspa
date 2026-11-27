// Pevný čas odeslání newsletteru (rozhodnutí vydavatele 27. 11. 2026: pátek 11:00
// Europe/Prague). Stejný řetězec používá workflow i fallback přes MCP Brevo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEND_TIME, scheduledAtFor, nextFridayYmd } from '../scripts/newsletter-run.js';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'newsletter-run.js');

test('čas odeslání je pevně 11:00', () => {
  assert.equal(SEND_TIME, '11:00');
});

test('scheduledAt nese offset podle zimního a letního času', () => {
  assert.equal(scheduledAtFor('2026-11-27'), '2026-11-27T11:00:00.000+01:00');
  assert.equal(scheduledAtFor('2027-07-02'), '2027-07-02T11:00:00.000+02:00');
  // den přechodu na letní čas (neděle 28. 3. 2027) — v 11:00 už platí +02:00
  assert.equal(scheduledAtFor('2027-03-28'), '2027-03-28T11:00:00.000+02:00');
});

test('nejbližší pátek je vždy v budoucnu', () => {
  assert.equal(nextFridayYmd(new Date('2026-11-26T12:00:00Z')), '2026-11-27');
  assert.equal(nextFridayYmd(new Date('2026-11-27T12:00:00Z')), '2026-12-04');
});

test('--print-scheduled-at vypíše jen řetězec pro Brevo', () => {
  const out = execFileSync('node', [SCRIPT, '--print-scheduled-at', '--friday=2026-12-04'], { encoding: 'utf8' });
  assert.equal(out.trim(), '2026-12-04T11:00:00.000+01:00');
});
