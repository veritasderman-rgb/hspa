// Generátor doprovodné grafiky pro sociální sítě.
//
// Pro článek vytvoří PNG ve 4 rozměrech (FB 1200×630, LI 1200×627,
// X 1600×900, IG 1080×1350) v jednotném editorial stylu (paper/ink/red,
// Source Serif 4 + Inter). SVG → PNG přes @resvg/resvg-js.
//
// CLI:  node social/generators/image-generator.js <article-id>

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { IMAGE_SIZES, BRAND, FONTS_DIR, OUT_DIR, SITE, NETWORKS, tagColor } from '../config.js';

const FONT_FILES = existsSync(FONTS_DIR)
  ? readdirSync(FONTS_DIR).filter(f => /\.(ttf|otf)$/i.test(f)).map(f => resolve(FONTS_DIR, f))
  : [];

const SERIF = 'Source Serif 4, Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';

function escapeXml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Greedy word-wrap na max. počet znaků na řádek. */
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > maxChars) { lines.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines;
}

/** Najde největší velikost písma, při níž se headline vejde do maxLines. */
function fitHeadline(text, contentW, maxLines, baseSize, minSize) {
  for (let size = baseSize; size >= minSize; size -= 3) {
    const charsPerLine = Math.max(8, Math.floor(contentW / (size * 0.52)));
    const lines = wrap(text, charsPerLine);
    if (lines.length <= maxLines) return { size, lines };
  }
  const charsPerLine = Math.max(8, Math.floor(contentW / (minSize * 0.52)));
  return { size: minSize, lines: wrap(text, charsPerLine).slice(0, maxLines) };
}

/** Punchy headline — první věta titulku, pokud má rozumnou délku. */
function pickHeadline(title) {
  const t = String(title || '').trim();
  const dot = t.indexOf('. ');
  if (dot >= 20 && dot <= 75) return t.slice(0, dot + 1);
  return t;
}

/** Vybere hlavní statistiku (KeyStat s člověkem-čitelnou hodnotou). */
function pickStat(article) {
  return (article.keyStats || []).find(s => s.display && s.label) || null;
}

function buildSvg(article, network) {
  const { w, h, orient } = IMAGE_SIZES[network];
  const portrait = orient === 'portrait';
  const pad = Math.round(w * (portrait ? 0.085 : 0.058));
  const barW = Math.max(10, Math.round(w * 0.009));
  const contentW = w - pad * 2;
  const accent = tagColor(article.tag);
  const stat = pickStat(article);

  const kickerSize = Math.round(w * 0.0175);
  const kickerY = pad + kickerSize;
  const ruleY = kickerY + Math.round(h * 0.022);

  const headTop = ruleY + Math.round(h * (portrait ? 0.05 : 0.055));
  const baseHead = Math.round(h * (portrait ? 0.066 : (stat ? 0.10 : 0.125)));
  const minHead = Math.round(h * (portrait ? 0.044 : 0.062));
  const maxLines = portrait ? 5 : 4;
  const { size: headSize, lines } = fitHeadline(pickHeadline(article.title), contentW, maxLines, baseHead, minHead);
  const headLineH = Math.round(headSize * 1.14);

  const footY = h - pad;
  const footSize = Math.round(w * 0.0165);

  // KeyStat panel — nad patičkou.
  let statSvg = '';
  if (stat) {
    const numSize = Math.round(h * (portrait ? 0.115 : 0.155));
    const labelSize = Math.round(w * 0.019);
    const statBaseY = footY - Math.round(h * 0.085) - labelSize;
    statSvg = `
  <text x="${pad}" y="${statBaseY}" font-family="${SERIF}" font-size="${numSize}" font-weight="700" fill="${accent}" letter-spacing="-2">${escapeXml(stat.display)}</text>
  <text x="${pad}" y="${statBaseY + labelSize + Math.round(h * 0.028)}" font-family="${SANS}" font-size="${labelSize}" font-weight="500" fill="${BRAND.inkMut}">${escapeXml(truncate(stat.label, portrait ? 46 : 64))}</text>`;
  }

  const headlineSvg = lines.map((ln, i) =>
    `<text x="${pad}" y="${headTop + headSize + i * headLineH}" font-family="${SERIF}" font-size="${headSize}" font-weight="700" fill="${BRAND.ink}" letter-spacing="-0.5">${escapeXml(ln)}</text>`
  ).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BRAND.paper}"/>
  <rect x="${w - barW}" y="0" width="${barW}" height="${h}" fill="${accent}"/>

  <text x="${pad}" y="${kickerY}" font-family="${SANS}" font-size="${kickerSize}" font-weight="700" letter-spacing="${Math.round(kickerSize * 0.18)}" fill="${accent}">${escapeXml((article.tag || 'HSPA MONITOR').toUpperCase())}</text>
  <line x1="${pad}" y1="${ruleY}" x2="${w - pad}" y2="${ruleY}" stroke="${BRAND.ink}" stroke-opacity="0.16" stroke-width="1.5"/>

  ${headlineSvg}
  ${statSvg}

  <line x1="${pad}" y1="${footY - footSize - Math.round(h * 0.022)}" x2="${w - pad}" y2="${footY - footSize - Math.round(h * 0.022)}" stroke="${BRAND.ink}" stroke-opacity="0.16" stroke-width="1.5"/>
  <rect x="${pad}" y="${footY - footSize}" width="${Math.round(footSize * 0.5)}" height="${Math.round(footSize * 0.5)}" fill="${BRAND.red}"/>
  <text x="${pad + Math.round(footSize * 0.9)}" y="${footY - Math.round(footSize * 0.12)}" font-family="${SERIF}" font-size="${footSize}" fill="${BRAND.ink}"><tspan font-weight="700">HSPA</tspan><tspan font-style="italic" font-weight="400"> monitor</tspan></text>
  <text x="${w - pad}" y="${footY - Math.round(footSize * 0.12)}" font-family="${SANS}" font-size="${Math.round(footSize * 0.82)}" font-weight="600" letter-spacing="0.5" fill="${BRAND.inkMut}" text-anchor="end">${escapeXml(SITE.replace('https://', ''))}</text>
</svg>`;
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

function renderPng(svg, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * 2 },   // @2× pro retina
    font: { fontFiles: FONT_FILES, loadSystemFonts: FONT_FILES.length === 0, defaultFontFamily: 'Inter' },
  });
  return r.render().asPng();
}

/** Vygeneruje 4 PNG (jeden na síť) do outDir. Vrací { network: cesta }. */
export function generateImages(article, { outDir = resolve(OUT_DIR, article.id) } = {}) {
  mkdirSync(outDir, { recursive: true });
  const paths = {};
  for (const network of NETWORKS) {
    const svg = buildSvg(article, network);
    const png = renderPng(svg, IMAGE_SIZES[network].w);
    const file = resolve(outDir, `${network}.png`);
    writeFileSync(file, png);
    writeFileSync(resolve(outDir, `${network}.svg`), svg);
    paths[network] = file;
  }
  return paths;
}

// --- CLI -------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const id = process.argv[2];
  if (!id) {
    console.error('Použití: node social/generators/image-generator.js <article-id>');
    process.exit(1);
  }
  const { listVisibleArticles } = await import('../sources/article-detector.js');
  const article = listVisibleArticles().find(a => a.id === id);
  if (!article) {
    console.error(`Článek "${id}" nenalezen mezi viditelnými.`);
    process.exit(1);
  }
  const paths = generateImages(article);
  for (const [net, p] of Object.entries(paths)) {
    console.log(`${net.padEnd(10)} ${IMAGE_SIZES[net].w}×${IMAGE_SIZES[net].h}  →  ${p.replace(process.cwd() + '/', '')}`);
  }
}
