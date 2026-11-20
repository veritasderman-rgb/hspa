// Formáty videa. Výchozí „portrait" 9:16 (Reels, Stories, TikTok, Shorts),
// „landscape" 16:9 pro vložení do webové stránky (YouTube, prezentace).
// Scénář volí formát polem `"format": "landscape"`; scéna si podle něj vezme
// rozměry, rozvržení a délkové limity.

// `maxDur` platí pro němá videa (žvatlání, titulky), `maxDurVoiced` pro videa
// s mluveným hlasem — mluvené vysvětlení unese delší stopáž než němý skeč.
export const FORMATS = {
  portrait: { W: 1080, H: 1920, maxDur: 20, maxDurVoiced: 60 },
  landscape: { W: 1920, H: 1080, maxDur: 40, maxDurVoiced: 90 },
};

/** Strop délky (s) podle formátu a toho, jestli video mluví. */
export function maxDurOf(script) {
  const f = FORMATS[script?.format || 'portrait'] || FORMATS.portrait;
  return (script?.beats || []).some(b => b.voice) ? f.maxDurVoiced : f.maxDur;
}

export function formatName(scriptOrTimeline) {
  const s = scriptOrTimeline?.script || scriptOrTimeline || {};
  return s.format || 'portrait';
}

export function formatOf(scriptOrTimeline) {
  const name = formatName(scriptOrTimeline);
  const f = FORMATS[name];
  if (!f) throw new Error(`neznámý formát „${name}" (${Object.keys(FORMATS).join(', ')})`);
  return { name, ...f };
}
