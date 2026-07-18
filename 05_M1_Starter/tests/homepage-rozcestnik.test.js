// Testy intent rozcestníku na homepage (index.html, sekce .home-rozcestnik).
// Rozcestník směruje návštěvníka podle záměru na relevantní klastr — jeho
// odkazy MUSÍ mířit na existující stránky (jinak by rozcestník posílal do 404).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/** Vyřízne HTML sekce .home-rozcestnik. */
function rozcestnikSection() {
  const start = html.indexOf('class="home-rozcestnik"');
  assert.ok(start !== -1, 'Sekce .home-rozcestnik na homepage chybí');
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

test('rozcestník existuje a má čtyři persona-karty', () => {
  const sec = rozcestnikSection();
  const cards = sec.match(/class="rozcestnik-card"/g) ?? [];
  assert.equal(cards.length, 4, `očekávány 4 karty rozcestníku, nalezeno ${cards.length}`);
  const personas = sec.match(/class="rozcestnik-persona"/g) ?? [];
  assert.equal(personas.length, 4, 'každá karta má mít personu');
});

test('každá karta rozcestníku vede na persona minihomepage pro-*.html', () => {
  const sec = rozcestnikSection();
  const personas = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'personas.json'), 'utf8')
  ).personas;
  for (const p of personas) {
    const href = `pro-${p.slug}.html`;
    assert.ok(sec.includes(`href="${href}"`), `rozcestník neodkazuje na minihomepage ${href}`);
    assert.ok(fs.existsSync(path.join(ROOT, href)), `minihomepage ${href} neexistuje`);
  }
});

test('všechny odkazy rozcestníku míří na existující stránky (žádné 404)', () => {
  const sec = rozcestnikSection();
  const hrefs = [...sec.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(hrefs.length >= 12, `očekáváno ≥12 odkazů (4 karty × 3), nalezeno ${hrefs.length}`);
  for (const href of hrefs) {
    // Jen lokální .html cíle (bez query/hash) — externí a kotvy nepatří sem.
    assert.ok(/^[a-z0-9-]+\.html$/.test(href), `nečekaný tvar odkazu v rozcestníku: ${href}`);
    assert.ok(
      fs.existsSync(path.join(ROOT, href)),
      `odkaz rozcestníku míří na neexistující soubor: ${href}`
    );
  }
});
