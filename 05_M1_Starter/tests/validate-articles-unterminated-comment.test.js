// Neuzavřený HTML komentář = prázdná stránka.
//
// Kontext: publikovaný clanek-pyll.html měl před <body> blok „<!-- audit: …"
// bez uzavíracího „-->". Prohlížeč tím zakomentoval celé tělo a čtenář viděl
// bílou stránku; validátor mlčel, protože meta i hlavičku v textu souboru našel.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnterminatedComment } from '../ingest/validate-articles.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('najde komentář bez „-->" a vrátí řádek, kde začíná', () => {
  const html = '<html><head></head>\n<!--\naudit:\n  status: partial\n\n<body><main>text</main></body></html>';
  assert.deepEqual(findUnterminatedComment(html), { line: 2 });
});

test('uzavřené komentáře projdou, i když jich je víc', () => {
  const html = '<!-- a -->\n<body><!-- b\n víc řádků --><p>x</p><!----></body>';
  assert.equal(findUnterminatedComment(html), null);
});

test('„<!--" uvnitř <script> a <style> se nepočítá', () => {
  const html = '<head><script>const s = "<!-- není komentář";</script><style>/* <!-- */</style></head><body></body>';
  assert.equal(findUnterminatedComment(html), null);
});

test('žádná stránka webu nemá neuzavřený komentář', () => {
  const bad = fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => findUnterminatedComment(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.deepEqual(bad, []);
});
