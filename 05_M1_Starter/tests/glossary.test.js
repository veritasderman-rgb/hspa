import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(__dirname, '../data/glossary.json'), 'utf8');
const glossary = JSON.parse(raw);

test('glossary.json: má správnou strukturu', () => {
  assert.equal(typeof glossary.version, 'string');
  assert.ok(Array.isArray(glossary.terms));
  assert.ok(glossary.terms.length > 0);
});

test('glossary.json: každý term má povinná pole', () => {
  for (const t of glossary.terms) {
    assert.ok(t.key, `term bez key: ${JSON.stringify(t)}`);
    assert.ok(t.full, `term ${t.key} bez full`);
    assert.ok(t.short_def, `term ${t.key} bez short_def`);
    assert.ok(t.anchor, `term ${t.key} bez anchor`);
  }
});

test('glossary.json: klíče jsou unikátní', () => {
  const keys = glossary.terms.map(t => t.key);
  const unique = new Set(keys);
  assert.equal(unique.size, keys.length, 'Duplicitní klíče v glossary');
});
