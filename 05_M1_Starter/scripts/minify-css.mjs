// Minifikace src/styles.css → src/styles.min.css (commitovaný artefakt).
//
// Web se nasazuje bez build kroku (Vercel servíruje repo tak, jak je),
// takže minifikovaná verze žije v repu. Do hlavičky vkládáme SHA-256 hash
// zdrojového styles.css — test tests/css-min.test.js z něj pozná, že někdo
// upravil styles.css a zapomněl spustit `npm run build:css`.
//
// Použití: npm run build:css

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/styles.css');
const OUT = path.join(ROOT, 'src/styles.min.css');

const css = readFileSync(SRC, 'utf8');
const hash = createHash('sha256').update(css).digest('hex').slice(0, 16);

const { code } = await esbuild.transform(css, { loader: 'css', minify: true });

writeFileSync(OUT, `/*! build:css src-hash=${hash} — generováno z styles.css, must run: npm run build:css */\n${code}`);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`styles.min.css: ${kb(css.length)} → ${kb(code.length)} (src-hash=${hash})`);
