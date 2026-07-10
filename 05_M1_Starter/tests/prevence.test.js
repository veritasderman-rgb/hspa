// Testy stránky Prevence — PREV-PERSONA (U27): filtr podle životní fáze.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterThemesByPersona } from '../src/prevence.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('filterThemesByPersona: all vrací vše, fáze filtruje podle life_phases', () => {
  const t = [
    { id: 'x', life_phases: ['mlada_rodina'] },
    { id: 'y', life_phases: ['seniori_65'] },
    { id: 'z', life_phases: ['mlada_rodina', 'dospeli_40', 'seniori_65'] },
  ];
  assert.equal(filterThemesByPersona(t, 'all').length, 3);
  assert.deepEqual(filterThemesByPersona(t, 'mlada_rodina').map(x => x.id), ['x', 'z']);
  assert.deepEqual(filterThemesByPersona(t, 'dospeli_40').map(x => x.id), ['z']);
  assert.deepEqual(filterThemesByPersona(t, 'seniori_65').map(x => x.id), ['y', 'z']);
});

test('filterThemesByPersona: neplatný vstup → prázdné/kopie', () => {
  assert.deepEqual(filterThemesByPersona(null, 'all'), []);
  assert.deepEqual(filterThemesByPersona([{ id: 'a' }], 'mlada_rodina'), []); // bez life_phases se nezobrazí
});

test('data: každé prevence téma má neprázdné validní life_phases', () => {
  const p = JSON.parse(readFileSync(resolve(ROOT, 'data', 'prevention.json'), 'utf8'));
  const VALID = ['mlada_rodina', 'dospeli_40', 'seniori_65'];
  for (const t of p.themes) {
    assert.ok(Array.isArray(t.life_phases) && t.life_phases.length, `${t.id} má life_phases`);
    for (const ph of t.life_phases) assert.ok(VALID.includes(ph), `${t.id}: platná fáze ${ph}`);
  }
});
