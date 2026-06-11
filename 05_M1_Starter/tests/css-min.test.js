// Drift guard: src/styles.min.css musí odpovídat aktuálnímu src/styles.css.
// Min verze je commitovaný artefakt (web nemá build krok) — po každé úpravě
// styles.css je nutné spustit `npm run build:css`. Hash v hlavičce min
// souboru to umožňuje ověřit bez závislosti na minifikátoru v test čase.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('styles.min.css je aktuální vůči styles.css (npm run build:css)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
  const min = fs.readFileSync(path.join(ROOT, 'src/styles.min.css'), 'utf8');
  const expected = createHash('sha256').update(src).digest('hex').slice(0, 16);
  const m = /src-hash=([0-9a-f]{16})/.exec(min);
  assert.ok(m, 'styles.min.css postrádá src-hash hlavičku — vygeneruj přes npm run build:css');
  assert.equal(
    m[1], expected,
    'styles.min.css je zastaralý — styles.css se změnil. Spusť: npm run build:css',
  );
});

test('HTML stránky odkazují na styles.min.css', () => {
  const offenders = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html'))
    .filter(f => /href="src\/styles\.css"/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.deepEqual(offenders, [], 'Stránky odkazující na neminifikované CSS: ' + offenders.join(', '));
});
