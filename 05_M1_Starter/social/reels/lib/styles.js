// Výběr stylu podle scénáře: výchozí „Kompík vysvětluje" (scene.js),
// `"style": "florence"` → „Florence komentuje" (florence-scene.js).

import * as kompikStyle from './scene.js';
import * as florenceStyle from './florence-scene.js';
import { formatOf } from './format.js';

export const STYLES = { kompik: kompikStyle, florence: florenceStyle };

export function styleOf(scriptOrTimeline) {
  const name = scriptOrTimeline.style || scriptOrTimeline.script?.style || 'kompik';
  const st = STYLES[name];
  if (!st) throw new Error(`neznámý styl „${name}" (${Object.keys(STYLES).join(', ')})`);
  return st;
}

export const validate = script => {
  if (script.style && !STYLES[script.style]) return { errors: [`neznámý styl „${script.style}"`], warnings: [], duration: 0 };
  return styleOf(script).validate(script);
};
export const compile = script => styleOf(script).compile(script);
export const frameSvg = (tl, t) => styleOf(tl).frameSvg(tl, t);
export const audioTrack = tl => styleOf(tl).audioTrack(tl);
export const W = 1080, H = 1920;   // výchozí formát (portrait); jinak dims()
/** Rozměry videa podle `script.format` (portrait 1080×1920, landscape 1920×1080). */
export const dims = scriptOrTl => { const f = formatOf(scriptOrTl); return { W: f.W, H: f.H }; };
