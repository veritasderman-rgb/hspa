// Paleta zdravotních pojišťoven — jediný zdroj pravdy pro Atlas pojištěnců
// (src/pojistenci.js) i Srovnávač pojišťoven (src/pojistovny*.js).
//
// Barvy žijí jako CSS tokeny `--zp-111 … --zp-213` v src/styles.css (light v :root,
// dark v :root[data-theme="dark"]). Tento modul je čistý: v JS není žádná barva
// série (hex jen v metadatech `brand`), jen mapování kód → token. Knihovny, které CSS proměnné neumí (ECharts/canvas),
// čtou hodnotu přes zpColorResolved(); překreslení po přepnutí tématu obstará
// onThemeChange().
//
// Pravidla (docs/visual-components.md → „Paleta pojišťoven“):
//  - pevné pořadí podle kódu, paleta se nikdy nerecykluje,
//  - barva série = odstín brandu pojišťovny (rozhodnutí vydavatele 2. 11. 2026),
//    upravený ve světlosti/sytosti tak, aby paleta prošla validátorem dataviz
//    v light i dark; VZP je tedy karmínová/malinová, ale NIKDY ne stavová `--red`
//    (ΔE ≥ 15) — `--red` patří hrotu kompasu a stavu „bad“; stav nese ikona + text,
//  - text se barvou série nikdy nebarví; identitu nese tečka.
//
// `brand` u každé pojišťovny je jen metadata (původní barva z webu/loga a zdroj);
// žádná funkce modulu ji nečte. Odvozené tokeny --zp-* žijí výhradně ve styles.css.

/** Sedm pojišťoven v pevném pořadí podle kódu (názvy dle data/pojistovny.json).
 *  `brand` = původní brandová barva a zdroj (jen metadata, staženo 2. 11. 2026). */
export const ZP = [
  { kod: '111', zkratka: 'VZP ČR', nazev: 'Všeobecná zdravotní pojišťovna ČR', token: '--zp-111',
    brand: { hex_original: '#e6300e', zdroj: 'vzp.cz — logo (vzp-logo-mobile.png), CSS .Logo { color:#d22d0f }' },
  },
  { kod: '201', zkratka: 'VoZP', nazev: 'Vojenská zdravotní pojišťovna ČR', token: '--zp-201',
    brand: { hex_original: '#166937', zdroj: 'vozp.cz — img/logo.svg (fill)' },
  },
  { kod: '205', zkratka: 'ČPZP', nazev: 'Česká průmyslová zdravotní pojišťovna', token: '--zp-205',
    brand: { hex_original: '#00aee7', zdroj: 'cpzp.cz — cpzp-logo.svg (symbol; text loga #ce1141, theme-color #061ba6)' },
  },
  { kod: '207', zkratka: 'OZP', nazev: 'Oborová zdravotní pojišťovna zaměstnanců bank, pojišťoven a stavebnictví', token: '--zp-207',
    brand: { hex_original: '#702082', zdroj: 'ozp.cz — web/images/layout/hlavicka/OZP.svg (fill)' },
  },
  { kod: '209', zkratka: 'ZPŠ', nazev: 'Zaměstnanecká pojišťovna Škoda', token: '--zp-209',
    brand: { hex_original: '#f36f21', zdroj: 'zpskoda.cz — themes/custom/zps/logo.svg (háček nad „š“; písmo #58595b)' },
  },
  { kod: '211', zkratka: 'ZP MV ČR', nazev: 'Zdravotní pojišťovna ministerstva vnitra ČR', token: '--zp-211',
    brand: { hex_original: '#283796', zdroj: 'zpmvcr.cz — themes/zpmv/i/hp2025/zpmv-logo-header.svg (fill)' },
  },
  { kod: '213', zkratka: 'RBP', nazev: 'RBP, zdravotní pojišťovna', token: '--zp-213',
    brand: { hex_original: '#00a3e0', zdroj: 'rbp213.cz — systemfiles/global/image/…icon-120x120.png (pozadí ikony), CSS #0197cf' },
  },
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
