#!/usr/bin/env node
/**
 * generate-charts.mjs — statické SVG grafy pro knihu ze `cover_viz`
 * ================================================================
 * Čte data/articles.json a pro každý článek s `cover_viz` (bar-compare,
 * big-number, stat-cards) vygeneruje knižně stylizované SVG do grafika/.
 * Paleta a typografie dle 01-design-system.md / 03-grafy-spec.md.
 *
 * SPUŠTĚNÍ z 05_M1_Starter/:
 *   node ../kniha-export/podklady/generate-charts.mjs
 *   node ../kniha-export/podklady/generate-charts.mjs --only=deficit-pojisteni-2026
 *
 * VÝSTUP: kniha-export/grafika/<slug>.svg  (šířka 720 px, knižní paleta)
 * Bez závislostí (čistý Node). SVG lze umístit přímo do Affinity.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = resolve(__dirname, '..');
const SITE_DIR = resolve(EXPORT_DIR, '..', '05_M1_Starter');
const OUT = join(EXPORT_DIR, 'grafika');
mkdirSync(OUT, { recursive: true });

const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];

// paleta (01-design-system.md §3)
const C = {
  paper: '#FBF8F1', paper2: '#F3EEE2', ink: '#1F1A14',
  inkMut: '#5E574B', red: '#B8361E', good: '#2F6B1F', warn: '#A05A08', neutral: '#6B6357',
};
const FONT = 'Inter, "Source Sans 3", Arial, sans-serif';
const SERIF = '"Source Serif 4", Georgia, serif';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('cs-CZ') : n);

function barColor(row) {
  if (row.accent === 'bad') return C.red;
  if (row.accent === 'good') return C.good;
  if (row.accent === 'warn') return C.warn;
  return row.highlight ? C.ink : C.inkMut;
}

function svgBarCompare(cv) {
  const W = 720, padL = 150, padR = 70, padT = 54, rowH = 40, gap = 14;
  const rows = cv.rows || [];
  const H = padT + rows.length * (rowH + gap) + 40;
  const max = cv.max || Math.max(...rows.map(r => r.value)) * 1.1 || 1;
  const barW = W - padL - padR;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${FONT}'>`;
  s += `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;
  s += `<text x="0" y="26" font-family='${SERIF}' font-size="20" font-weight="600" fill="${C.ink}">${esc(cv.title || '')}</text>`;
  rows.forEach((r, i) => {
    const y = padT + i * (rowH + gap);
    const w = Math.max(2, (r.value / max) * barW);
    s += `<text x="${padL - 12}" y="${y + rowH / 2 + 5}" text-anchor="end" font-size="15" fill="${C.ink}">${esc(r.label)}</text>`;
    s += `<rect x="${padL}" y="${y}" width="${barW}" height="${rowH}" fill="${C.paper2}"/>`;
    s += `<rect x="${padL}" y="${y}" width="${w}" height="${rowH}" fill="${barColor(r)}"/>`;
    const val = `${fmt(r.value)}${cv.unit || ''}`;
    const inside = w > 60;
    s += `<text x="${padL + w + (inside ? -10 : 8)}" y="${y + rowH / 2 + 5}" text-anchor="${inside ? 'end' : 'start'}" font-size="15" font-weight="600" fill="${inside ? C.paper : C.ink}" font-variant-numeric="tabular-nums">${esc(val)}</text>`;
  });
  s += `<text x="0" y="${H - 12}" font-size="11" fill="${C.inkMut}">Zdroj: doplnit (viz článek) · skorezdravotnictvi.cz</text>`;
  s += `</svg>`;
  return s;
}

function svgBigNumber(cv) {
  const W = 720, H = 260;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${FONT}'>`;
  s += `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;
  s += `<text x="${W / 2}" y="140" text-anchor="middle" font-family='${SERIF}' font-size="110" font-weight="700" fill="${C.ink}" font-variant-numeric="tabular-nums">${esc(fmt(cv.number))}${esc(cv.unit || '')}</text>`;
  s += `<text x="${W / 2}" y="192" text-anchor="middle" font-size="20" fill="${C.inkMut}">${esc(cv.label || '')}</text>`;
  s += `<text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-size="11" fill="${C.inkMut}">Zdroj: doplnit · skorezdravotnictvi.cz</text>`;
  s += `</svg>`;
  return s;
}

function svgStatCards(cv) {
  const cards = cv.cards || [];
  const W = 720, H = 220, n = cards.length, cw = (W - (n + 1) * 16) / n;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${FONT}'>`;
  s += `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;
  s += `<text x="0" y="26" font-family='${SERIF}' font-size="20" font-weight="600" fill="${C.ink}">${esc(cv.title || '')}</text>`;
  cards.forEach((c, i) => {
    const x = 16 + i * (cw + 16), y = 50;
    s += `<rect x="${x}" y="${y}" width="${cw}" height="120" rx="4" fill="${C.paper2}"/>`;
    s += `<text x="${x + cw / 2}" y="${y + 58}" text-anchor="middle" font-family='${SERIF}' font-size="34" font-weight="700" fill="${C.ink}" font-variant-numeric="tabular-nums">${esc(c.value)}</text>`;
    // popisek – zalomení na 2 řádky
    const words = String(c.label).split(' ');
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(' '), l2 = words.slice(mid).join(' ');
    s += `<text x="${x + cw / 2}" y="${y + 88}" text-anchor="middle" font-size="13" fill="${C.inkMut}">${esc(l1)}</text>`;
    if (l2) s += `<text x="${x + cw / 2}" y="${y + 106}" text-anchor="middle" font-size="13" fill="${C.inkMut}">${esc(l2)}</text>`;
  });
  s += `<text x="0" y="${H - 8}" font-size="11" fill="${C.inkMut}">Zdroj: doplnit · skorezdravotnictvi.cz</text>`;
  s += `</svg>`;
  return s;
}

const arts = JSON.parse(readFileSync(join(SITE_DIR, 'data', 'articles.json'), 'utf8')).articles;
let ok = 0, skip = 0;
for (const x of arts) {
  const cv = x.cover_viz;
  if (!cv) continue;
  const slug = x.slug.replace(/^clanek-/, '').replace(/\.html$/, '');
  if (only && slug !== only) continue;
  let svg = null;
  if (cv.type === 'bar-compare') svg = svgBarCompare(cv);
  else if (cv.type === 'big-number' || cv.type === 'stat') svg = svgBigNumber(cv);
  else if (cv.type === 'stat-cards') svg = svgStatCards(cv);
  else { skip++; continue; }
  writeFileSync(join(OUT, `${slug}.svg`), svg);
  ok++;
}
console.log(`Vygenerováno ${ok} SVG do grafika/ (přeskočeno ${skip} nepodporovaných typů: donut/timeline → sazba ručně).`);
