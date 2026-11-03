// Srovnávač pojišťoven — kmen měsíc po měsíci (metodika § 4.3).
//
// Podsekce stránky pojistovny-kmen.html pod „Vývoj kmene 2010–2025“. Čte
// data/pojistovny-kmen-mesicni.json (generuje ingest/transform_pojistovny_kmen_mesicni.js):
// měsíční počty pojištěnců sedmi pojišťoven ODVOZENÉ z přerozdělení MZ (částka na pojišťovnu
// ÷ částka na jednoho pojištěnce). Kreslí
//   (a) #zpKmenMesicni  graf indexedLines (leden 2022 = 100, 7 sérií v brandové paletě;
//                       „Moje pojišťovna“ se zvýrazní samo přes data-zp),
//   (b) #zpKmenPrestupy tabulku změn kmene k 1. 1. a 1. 7. v posledních dvou letech.
// Načítá a volá ho orchestrátor src/pojistovny.js (jen na stránce, která má kontejner).
//
// Nad grafem je přepínač rozsahu (A0.6): „Všech 7“ / „Bez VZP ČR“ / „Od 1/2023“ — VZP kmenem
// a skokem z uprchlické registrace roztahuje osu, ostatní pojišťovny se pak slévají. Přepínač je
// společná komponenta figureSwitch (src/zp-viz.js, A4.3): klik, šipky a zápis do URL
// (?kmen=bez-vzp|od-2023, výchozí „Všech 7“ se nezapisuje) řeší src/zp-interact.js, tenhle modul
// jen poslouchá událost `zp:switch` (id „kmen“) a překreslí graf.
//
// Čisté funkce (testované bez DOM): mesicLabel, mesicX, buildMesicniSeries, mesicniVyber,
// rezimZUrl, prepinacHtml, prestupyTabulka, prestupyHtml, veta. Žádné pořadí ani hodnocení: řádky jsou v pevném pořadí podle kódu pojišťovny.

import { escapeHtml, formatNumberCz } from './page-shared.js';
import { indexedLines, isNum, figureSwitch, readSwitchFromUrl } from './zp-viz.js';
import { dot, set } from './pojistovny-shared.js';
import { initZpInteract, SWITCH_EVENT } from './zp-interact.js';

const esc = escapeHtml;

export const SOURCE_MESICNI = 'MZ ČR · Přerozdělování pojistného na v.z.p. (měsíční PDF) · počet odvozen podílem dvou částek';

/** „2022-01“ → „1/2022“ (stejný zápis jako v PDF MZ). */
export function mesicLabel(m) {
  const mt = /^(\d{4})-(\d{2})$/.exec(String(m ?? ''));
  return mt ? `${Number(mt[2])}/${mt[1]}` : String(m ?? '');
}

/** „2022-07“ → 2022,4167 (zlomek roku pro číselnou osu indexedLines). */
export function mesicX(m) {
  const mt = /^(\d{4})-(\d{2})$/.exec(String(m ?? ''));
  return mt ? Math.round((Number(mt[1]) + (Number(mt[2]) - 1) / 12) * 10000) / 10000 : NaN;
}

/** Opačně: zlomek roku → „7/2022“. */
export function xLabel(x) {
  const rok = Math.floor(x + 1e-6);
  const mesic = Math.round((x - rok) * 12) + 1;
  return `${mesic}/${rok}`;
}

/** Vstup pro indexedLines: 7 sérií (kod → barva a data-zp z palety), osa po měsících. */
export function buildMesicniSeries(K) {
  const mesice = Array.isArray(K?.mesice) ? K.mesice : [];
  const series = (K?.pojistovny || []).map((z) => ({
    kod: z.kod,
    label: z.zkratka,
    points: mesice.map((m, i) => ({ year: mesicX(m), value: isNum(z.pocty?.[i]) ? z.pocty[i] : null })),
  }));
  // značky osy: každý leden, popsaný jen rokem (na mobilu by se „1/2022“ a „2023“ slévaly; měsíc základu říká podtitulek)
  const ticks = mesice.filter((m) => m.endsWith('-01'))
    .map((m) => ({ x: mesicX(m), label: m.slice(0, 4) }));
  const prvni = mesice[0], posledni = mesice[mesice.length - 1];
  return {
    series,
    opts: {
      title: 'Kmen měsíc po měsíci',
      sub: `Počet pojištěnců každé pojišťovny vůči ${prvni ? mesicLabel(prvni) : 'prvnímu měsíci'} (= 100); ${prvni ? mesicLabel(prvni) : ''} až ${posledni ? mesicLabel(posledni) : ''}. Odvozeno z přerozdělení MZ, ne přímo publikováno.`,
      base: mesice.length ? mesicX(mesice[0]) : 'first',
      xFmt: xLabel,
      xHead: 'Měsíc',
      xTicks: ticks,
      source: SOURCE_MESICNI,
    },
  };
}

/** Režimy přepínače rozsahu grafu: id → popisek. */
export const MESICNI_REZIMY = [
  { id: 'vse', label: 'Všech 7' },
  { id: 'bez-vzp', label: 'Bez VZP ČR' },
  { id: 'od-2023', label: 'Od 1/2023' },
];
const KOD_VZP = '111';
const OD_2023 = '2023-01';

/** Hodnota parametru ?kmen= → režim; neznámé nebo chybějící = 'vse'. */
export function rezimZUrl(search) {
  return readSwitchFromUrl('kmen', MESICNI_REZIMY.map((r) => r.id), 'vse', String(search ?? ''));
}

/**
 * Výběr rozsahu měsíčního kmene. 'bez-vzp' vyřadí VZP ČR (kód 111), 'od-2023' ořízne měsíce před
 * 1/2023 (a u každé pojišťovny odpovídající počty); 'vse' a neznámý režim vrací vstup beze změny.
 * Index (= 100 v prvním měsíci) se přepočítá v buildMesicniSeries sám, protože základ je první měsíc.
 * Vstup se nemění (vrací se kopie).
 */
export function mesicniVyber(K, rezim) {
  if (rezim !== 'bez-vzp' && rezim !== 'od-2023') return K;
  if (!K || !Array.isArray(K.pojistovny)) return K;
  if (rezim === 'bez-vzp') return { ...K, pojistovny: K.pojistovny.filter((z) => String(z.kod) !== KOD_VZP) };
  const mesice = Array.isArray(K.mesice) ? K.mesice : [];
  const od = Math.max(0, mesice.findIndex((m) => m >= OD_2023));
  const zacatek = mesice.some((m) => m >= OD_2023) ? od : mesice.length;
  return {
    ...K,
    mesice: mesice.slice(zacatek),
    pojistovny: K.pojistovny.map((z) => ({ ...z, pocty: Array.isArray(z.pocty) ? z.pocty.slice(zacatek) : z.pocty })),
  };
}

/** Přepínač rozsahu: figureSwitch (radiogroup ze tří tlačítek, roving tabindex), id/parametr `kmen`. */
export function prepinacHtml(rezim) {
  return figureSwitch({
    id: 'kmen', label: 'Rozsah grafu', kind: 'radio', selected: rezim, defaultValue: 'vse',
    options: MESICNI_REZIMY.map((r) => ({ value: r.id, label: r.label })),
  });
}

/** Graf pro zvolený rozsah (jen figura, bez přepínače a poznámky). */
export function grafMesicni(K, rezim) {
  const ch = buildMesicniSeries(mesicniVyber(K, rezim));
  if (rezim === 'bez-vzp') ch.opts.sub += ' Bez VZP ČR, jejíž kmen skočil registrací uprchlíků; osa je proto jemnější.';
  return indexedLines(ch.series, ch.opts);
}

/**
 * Tabulka přestupů: pro každou pojišťovnu změna kmene k 1. 1. a 1. 7. v posledních `pocetLet` letech.
 * @returns {{cols: Array<{rok, termin, z, na}>, radky: Array<{kod, zkratka, bunky: Array<{pred, po, zmena, zmena_pct}|null>}>, celkem: Array}}
 */
export function prestupyTabulka(K, pocetLet = 2) {
  const zp = K?.prestupy?.pojistovny || [];
  const vsechny = zp.flatMap((p) => p.zmeny || []).concat(K?.prestupy?.celkem?.zmeny || []);
  const roky = [...new Set(vsechny.map((c) => c.rok))].sort((a, b) => a - b).slice(-pocetLet);
  const cols = [];
  for (const rok of roky) {
    for (const termin of ['1. 1.', '1. 7.']) {
      const c = vsechny.find((x) => x.rok === rok && x.termin === termin);
      if (c) cols.push({ rok, termin, z: c.z, na: c.na });
    }
  }
  const bunky = (zmeny) => cols.map((col) => (zmeny || []).find((c) => c.rok === col.rok && c.termin === col.termin) || null);
  return {
    cols,
    radky: zp.map((p) => ({ kod: p.kod, zkratka: p.zkratka, bunky: bunky(p.zmeny) })),
    celkem: bunky(K?.prestupy?.celkem?.zmeny),
  };
}

const fmtInt = (v) => formatNumberCz(Math.abs(v), { minDecimals: 0, maxDecimals: 0 });
const znak = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±');

/** „+11 830“ / „−4 953“ (typografické minus); null → „nedohledáno“. */
export function fmtZmena(v) {
  return isNum(v) ? `${znak(v)}${fmtInt(v)}` : 'nedohledáno';
}
/** „+0,19 %“ / „−0,72 %“. */
export function fmtZmenaPct(v) {
  return isNum(v) ? `${znak(v)}${formatNumberCz(Math.abs(v), { minDecimals: 2, maxDecimals: 2 })} %` : '';
}

const bunkaHtml = (c) => (c && isNum(c.zmena)
  ? `<td title="${esc(`${mesicLabel(c.z)} → ${mesicLabel(c.na)}: ${fmtInt(c.pred)} → ${fmtInt(c.po)} pojištěnců`)}">${esc(fmtZmena(c.zmena))}<small>${esc(fmtZmenaPct(c.zmena_pct))}</small></td>`
  : '<td>nedohledáno</td>');

/** HTML tabulky přestupů (řádky v pevném pořadí podle kódu, bez řazení a bez barevného hodnocení). */
export function prestupyHtml(K, pocetLet = 2) {
  const t = prestupyTabulka(K, pocetLet);
  if (!t.cols.length || !t.radky.length) return '<p class="zpc-na">Přestupové změny nejsou k dispozici (nedohledáno).</p>';
  const head = `<tr><th scope="col">Pojišťovna</th>${t.cols.map((c) => `<th scope="col" title="${esc(`${mesicLabel(c.z)} → ${mesicLabel(c.na)}`)}">${esc(`${c.termin} ${c.rok}`)}</th>`).join('')}</tr>`;
  const body = t.radky.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row">${dot(r.kod)}${esc(r.zkratka)}</th>${r.bunky.map(bunkaHtml).join('')}</tr>`).join('')
    + `<tr class="zpc-tr-sum"><th scope="row">Celkem 7 pojišťoven</th>${t.celkem.map(bunkaHtml).join('')}</tr>`;
  return `<div class="zpc-tbl" role="region" tabindex="0" aria-label="Změna kmene k 1. 1. a 1. 7. v posledních dvou letech (tabulka, posuvná)">`
    + `<table><thead>${head}</thead><tbody>${body}</tbody></table></div>`
    + '<p class="zpc-cap">Změna počtu pojištěnců mezi prosincem a lednem (1. 1.) a mezi červnem a červencem (1. 7.), v pojištěncích a v % kmene. Pevné pořadí podle kódu pojišťovny, nejde o hodnocení. Je to čistá změna kmene, ne hrubé toky: zahrnuje i narození, úmrtí a opravy registru.</p>';
}

/** Věta pod grafem: odkud počty jsou a co skoky znamenají. */
export function veta(K) {
  const mesice = K?.mesice || [];
  const od = mesice.length ? mesicLabel(mesice[0]) : '';
  const do_ = mesice.length ? mesicLabel(mesice[mesice.length - 1]) : '';
  return `Počty pojištěnců jsou odvozené podílem dvou částek z měsíčního přerozdělení MZ (částka po přerozdělení na pojišťovnu děleno částkou na jednoho pojištěnce), MZ je takto přímo nezveřejňuje; průměr roku 2024 se od ročního průměru podle MZ liší o méně než 0,1 %. Skoky mezi prosincem a lednem a mezi červnem a červencem odpovídají přestupním termínům 1. 1. a 1. 7.; změny mimo ně zdroj MZ nevysvětluje. Skok VZP ČR v dubnu 2022 časově odpovídá registraci uprchlíků z Ukrajiny s dočasnou ochranou, kteří jsou podle zákona č. 65/2022 Sb. (účinnost 21. 3. 2022) pojištěnci vedenými u VZP ČR (do února 2023 jich VZP registrovala téměř 367,5 tisíce); pokles v dubnu 2023 časově odpovídá konci dočasné ochrany u osob, které si ji do konce března 2023 neprodloužily. Počet osob v těchto skocích zdroje neuvádějí. Období ${od} až ${do_}. Řazeno podle kódu pojišťovny, nejde o hodnocení.`;
}

/** Překreslí jen figuru podle režimu (přepínač drží stav sám); předchozí render zbledne na 60 % (is-busy), bez skoku výšky. */
function prekresliGraf(host, K, rezim) {
  const fig = host.querySelector ? host.querySelector('[data-kmen-fig]') : null;
  if (!fig) return;
  const h = fig.offsetHeight;
  if (h) fig.style.minHeight = `${h}px`;
  fig.classList.add('is-busy');
  const swap = () => {
    fig.innerHTML = grafMesicni(K, rezim);
    try { const r = initZpInteract(); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (_) { /* bez interakce graf funguje */ }
    const done = () => { fig.classList.remove('is-busy'); fig.style.minHeight = ''; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(done); else done();
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(swap); else swap();
}

/** Vykreslí obě kontejnery (chybí-li dataset, ukáže stav „nedohledáno“). */
export function renderKmenMesicni(K, rezimVstup) {
  if (!K || !Array.isArray(K.pojistovny) || !K.pojistovny.length) {
    set('zpKmenMesicni', '<p class="zpc-na">Měsíční kmen zatím není k dispozici (nedohledáno).</p>');
    set('zpKmenPrestupy', '');
    return;
  }
  const rezim = rezimVstup || rezimZUrl(globalThis.location?.search);
  set('zpKmenMesicni', prepinacHtml(rezim) + `<div class="zpc-kmen-fig" data-kmen-fig>${grafMesicni(K, rezim)}</div><p class="zpc-note">${esc(veta(K))}</p>`);
  set('zpKmenPrestupy', prestupyHtml(K, 2));
  const host = globalThis.document?.getElementById('zpKmenMesicni');
  if (!host || !host.addEventListener || host.dataset?.rezimInit === '1') return;
  host.dataset.rezimInit = '1';
  globalThis.document.addEventListener(SWITCH_EVENT, (e) => {
    if (e.detail?.id !== 'kmen') return;
    const id = MESICNI_REZIMY.some((r) => r.id === e.detail.value) ? e.detail.value : 'vse';
    prekresliGraf(host, K, id);
  });
}
