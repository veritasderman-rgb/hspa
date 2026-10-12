// Fonty a měření textu pro renderer. resvg neumí váhy variabilního fontu, proto
// renderer nese statické řezy Inter (Bold 700, ExtraBold 800, Black 900) v ../fonts/.
// Šířku slova měří samotný resvg (getBBox) — zalamování bublin je tak přesné.

import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { escapeXml } from './anim.js';

const FONTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
export const FONT_FILES = readdirSync(FONTS_DIR).filter(f => /\.(otf|ttf)$/i.test(f)).map(f => resolve(FONTS_DIR, f));
export const RESVG_FONT = { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' };

const cache = new Map();

/** Šířka textu v px (Inter, daná velikost a váha). */
export function measure(text, size, weight = 800) {
  const key = `${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  if (!text.trim()) { const w = size * 0.28 * text.length; cache.set(key, w); return w; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${size * 2}"><text x="0" y="${size * 1.4}" font-family="Inter" font-weight="${weight}" font-size="${size}">${escapeXml(text)}</text></svg>`;
  const bb = new Resvg(svg, { font: RESVG_FONT }).getBBox();
  const w = bb ? bb.x + bb.width : size * 0.6 * text.length;
  cache.set(key, w);
  return w;
}

/**
 * Zalomí slova do řádků podle max šířky. Slovo = { text, emph }.
 * Vrací [[{text, emph, x, w, i}], …] — x je offset v řádku, i index slova v textu.
 */
export function wrapWords(words, size, maxW, weight = 800) {
  const space = measure('a a', size, weight) - measure('aa', size, weight);
  const lines = [[]];
  let x = 0;
  words.forEach((wd, i) => {
    const w = measure(wd.text, size, weight);
    if (x > 0 && x + w > maxW) { lines.push([]); x = 0; }
    lines[lines.length - 1].push({ ...wd, x, w, i });
    x += w + space;
  });
  return lines;
}

export function lineWidth(line) {
  if (!line.length) return 0;
  const last = line[line.length - 1];
  return last.x + last.w;
}

/**
 * Vyvážené zalomení: stejný počet řádků jako wrapWords, ale co nejužší sazba
 * (žádné osamocené „EU" na posledním řádku).
 */
export function balancedWrap(words, size, maxW, weight = 800) {
  const base = wrapWords(words, size, maxW, weight);
  if (base.length < 2) return base;
  let lo = Math.max(...words.map(w => measure(w.text, size, weight))), hi = maxW, best = base;
  for (let k = 0; k < 12 && hi - lo > 2; k++) {
    const mid = (lo + hi) / 2;
    const tryL = wrapWords(words, size, mid, weight);
    if (tryL.length <= base.length) { best = tryL; hi = mid; } else lo = mid;
  }
  return best;
}
