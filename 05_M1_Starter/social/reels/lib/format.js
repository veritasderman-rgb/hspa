// Formáty videa. Výchozí „portrait" 9:16 (Reels, Stories, TikTok, Shorts),
// „landscape" 16:9 pro vložení do webové stránky (YouTube, prezentace).
// Scénář volí formát polem `"format": "landscape"`; scéna si podle něj vezme
// rozměry, rozvržení a délkové limity.

export const FORMATS = {
  portrait: { W: 1080, H: 1920, maxDur: 20 },
  landscape: { W: 1920, H: 1080, maxDur: 40 },
};

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
