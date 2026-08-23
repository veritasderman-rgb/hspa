// Bulk build fulltextového indexu Věstníků MZ z textové cache
// ingest/cache/vestniky/text/{id}.txt.gz (plné texty PDF, gitignored).
// Výstup data/vestniky-fulltext.json je committed; týdenní cron ho pak
// doplňuje inkrementálně přímo ve fetcheru (jen nové částky) — tenhle
// builder se pouští jen při plné rekonstrukci nad kompletní cache.
//
// Spuštění: node ingest/build-vestniky-fulltext.js  (npm run build:vestniky:fulltext)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { novyIndex, pridejDoIndexu } from './lib/vestniky-fulltext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEXT_DIR = path.join(ROOT, 'ingest', 'cache', 'vestniky', 'text');
const OUT = path.join(ROOT, 'data', 'vestniky-fulltext.json');

const files = fs.existsSync(TEXT_DIR)
  ? fs.readdirSync(TEXT_DIR).filter(f => /^\d+\.txt\.gz$/.test(f)).sort()
  : [];
if (!files.length) {
  console.error('build:vestniky:fulltext — textová cache je prázdná; index se staví jen nad plnou cache.');
  process.exit(1);
}

const index = novyIndex();
for (const f of files) {
  const id = Number(f.replace('.txt.gz', ''));
  const text = zlib.gunzipSync(fs.readFileSync(path.join(TEXT_DIR, f))).toString('utf8');
  pridejDoIndexu(index, id, text);
}
index.zpracovano.sort((a, b) => a - b);

fs.writeFileSync(OUT, JSON.stringify(index) + '\n');
console.log(`✓ data/vestniky-fulltext.json — ${index.zpracovano.length} částek, `
  + `${Object.keys(index.termy).length} termů, ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB`);
