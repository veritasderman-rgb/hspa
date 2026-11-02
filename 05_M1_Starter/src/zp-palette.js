// Paleta zdravotních pojišťoven — jediný zdroj pravdy pro Atlas pojištěnců
// (src/pojistenci.js) i Srovnávač pojišťoven (src/pojistovny*.js).
//
// Barvy žijí jako CSS tokeny `--zp-111 … --zp-213` v src/styles.css (light v :root,
// dark v :root[data-theme="dark"]). Tento modul je čistý: v JS není žádný hex,
// jen mapování kód → token. Knihovny, které CSS proměnné neumí (ECharts/canvas),
// čtou hodnotu přes zpColorResolved(); překreslení po přepnutí tématu obstará
// onThemeChange().
//
// Pravidla (docs/visual-components.md → „Paleta pojišťoven“):
//  - pevné pořadí podle kódu, paleta se nikdy nerecykluje,
//  - žádná pojišťovna není červená (--red = hrot kompasu a stav „bad“),
//  - text se barvou série nikdy nebarví; identitu nese tečka.

/** Sedm pojišťoven v pevném pořadí podle kódu (názvy dle data/pojistovny.json). */
export const ZP = [
  { kod: '111', zkratka: 'VZP ČR', nazev: 'Všeobecná zdravotní pojišťovna ČR', token: '--zp-111' },
  { kod: '201', zkratka: 'VoZP', nazev: 'Vojenská zdravotní pojišťovna ČR', token: '--zp-201' },
  { kod: '205', zkratka: 'ČPZP', nazev: 'Česká průmyslová zdravotní pojišťovna', token: '--zp-205' },
  { kod: '207', zkratka: 'OZP', nazev: 'Oborová zdravotní pojišťovna zaměstnanců bank, pojišťoven a stavebnictví', token: '--zp-207' },
  { kod: '209', zkratka: 'ZPŠ', nazev: 'Zaměstnanecká pojišťovna Škoda', token: '--zp-209' },
  { kod: '211', zkratka: 'ZP MV ČR', nazev: 'Zdravotní pojišťovna ministerstva vnitra ČR', token: '--zp-211' },
  { kod: '213', zkratka: 'RBP', nazev: 'RBP, zdravotní pojišťovna', token: '--zp-213' },
];

/** Token pro „ostatní pojišťovny“ při zvýraznění jedné (= --neutral). */
export const ZP_NEUTRAL_TOKEN = '--zp-neutral';

export const ZP_BY_KOD = Object.fromEntries(ZP.map((z) => [z.kod, z]));

/** CSS barva pro SVG/HTML/CSS: `var(--zp-111)`; neznámý kód → neutrální. */
export function zpColor(kod) {
  const z = ZP_BY_KOD[String(kod)];
  return `var(${z ? z.token : ZP_NEUTRAL_TOKEN})`;
}

/**
 * Přeložená barva (hex/rgb) pro knihovny bez podpory CSS proměnných (ECharts).
 * Čte aktuální téma z `el` (default <html>). Bez DOMu nebo bez načteného CSS
 * (node testy, SSR) vrací `var(--zp-…)`, aby výsledek zůstal unikátní a čitelný.
 */
export function zpColorResolved(kod, el = typeof document !== 'undefined' ? document.documentElement : null) {
  const token = (ZP_BY_KOD[String(kod)] || { token: ZP_NEUTRAL_TOKEN }).token;
  if (!el || typeof getComputedStyle === 'undefined') return `var(${token})`;
  const v = (getComputedStyle(el).getPropertyValue(token) || '').trim();
  return v || `var(${token})`;
}

/**
 * Zavolá `cb` při každém přepnutí tématu (změna atributu data-theme na <html>).
 * Vrací funkci pro odpojení. Bez DOMu je no-op.
 */
export function onThemeChange(cb) {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const obs = new MutationObserver(() => cb());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
