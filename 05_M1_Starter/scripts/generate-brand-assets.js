// Generátor rastrových brand assetů (PNG) z kanonických SVG v assets/brand/.
//
// Vstup:  assets/brand/*.svg (favicon, apple-touch, og-default)
// Výstup: assets/brand/favicon-32.png, apple-touch-icon.png (180), og-default.png (1200×630)
//
// Spuštění:  node scripts/generate-brand-assets.js
//
// PNG varianty jsou potřeba pro:
//   - apple-touch-icon (iOS home screen vyžaduje PNG)
//   - og:image fallback na stránkách bez vlastního article-cover (soc. sítě)
//   - favicon fallback pro prohlížeče bez SVG-favicon podpory

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = resolve(__dirname, '..', 'assets', 'brand');

const TARGETS = [
  { src: 'favicon.svg',    out: 'favicon-32.png',       width: 32 },
  { src: 'favicon.svg',    out: 'apple-touch-icon.png',  width: 180 },
  // PWA installable ikony (Chromium/Android vyžadují square 192 a 512).
  { src: 'favicon.svg',    out: 'icon-192.png',          width: 192 },
  { src: 'favicon.svg',    out: 'icon-512.png',          width: 512 },
  { src: 'og-default.svg', out: 'og-default.png',        width: 1200 },
];

function render(src, out, width) {
  const svg = readFileSync(resolve(BRAND_DIR, src), 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
    background: src === 'favicon.svg' ? 'rgba(0,0,0,0)' : '#fbf8f1',
  });
  const png = resvg.render().asPng();
  writeFileSync(resolve(BRAND_DIR, out), png);
  console.log(`✓ ${out} (${width}px)`);
}

for (const t of TARGETS) render(t.src, t.out, t.width);
console.log('Hotovo — brand PNG assety vygenerovány.');
