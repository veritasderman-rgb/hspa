// Srovnávač pojišťoven — sdílený shell přehledu a podstránek (balíček P1.6,
// PLAN-SROVNAVAC-POJISTOVEN.md § 2.8).
//
// Každá stránka srovnávače (pojistovny.html = přehled, pojistovny-<tema>.html =
// podstránky) má na začátku <main> prázdný kontejner
//   <div id="zpShell" class="zpc-shell" data-aktivni="<tema>"></div>
// a na konci <main> kontejner #zpZdroje. renderZpShell() do nich vykreslí:
//   - globální navigaci webu, datum v mastheadu a patičku (page-shared.js),
//   - pásek pracovní verze (.zpc-strip), kicker srovnávače a rozcestník témat
//     jako záložky (.zpc-tabs, aktivní s aria-current="page"),
//   - patičku sekce „Zdroje“ ze data/pojistovny.json.
// Výběr „Moje pojišťovna“ (#zpMojeZp) je statický kontejner ve stránce; výběr
// přežije přechod mezi stránkami přes localStorage (src/zp-interact.js,
// klíč hspa-moje-zp).
//
// Čisté funkce (testované bez DOM): zpStrankaById, zpShellHtml, zpTabsHtml,
// zpZdrojeHtml, legacyRedirect.

import { renderModuleNav, renderMastheadDate, renderFooter, escapeHtml } from './page-shared.js';
import { loadJson } from './pojistovny-shared.js';

const esc = escapeHtml;

export const DATA_URL = 'data/pojistovny.json';
export const KICKER = 'Srovnávač zdravotních pojišťoven · pracovní verze';

/**
 * Stránky srovnávače v pořadí záložek. `veta` a `co` čte rozcestník přehledu
 * (src/pojistovny-prehled.js), `kicker` je štítek karty rozcestníku.
 */
export const ZP_STRANKY = [
  { id: 'prehled', href: 'pojistovny.html', label: 'Přehled' },
  {
    id: 'kmen', href: 'pojistovny-kmen.html', label: 'Kmen a hospodaření', kicker: 'CRP 2025 · MZ a MF 2024 · ZPP 2026',
    veta: 'Kdo koho pojišťuje, jak starý kmen nese, kolik stojí jeho péče a s jakou rezervou vstupuje do roku 2026.',
    co: 'Karty pojišťoven, vývoj kmene, hospodaření, kraje, síť odborností',
  },
  {
    id: 'prevence', href: 'pojistovny-prevence.html', label: 'Prevence', kicker: 'Kolo 1 · weby a výroční zprávy',
    veta: 'Co pojišťovny z fondu prevence nabízejí, kam peníze jdou a co o výsledcích samy uvádějí.',
    co: 'Nabídka 7 × 9, onkologie a duševní zdraví, struktura fondu, odpovědi z VZ',
  },
  {
    id: 'aplikace', href: 'pojistovny-aplikace.html', label: 'Aplikace', kicker: 'První výstup PS',
    veta: 'Deset funkcí aplikací sedmi pojišťoven a návrh kritérií přívětivosti.',
    co: 'Matice funkcí, kritéria přívětivosti, rozpory a chybějící data',
  },
  {
    id: 'gramotnost', href: 'pojistovny-gramotnost.html', label: 'Zdravotní gramotnost', kicker: 'V přípravě · druhé téma PS',
    veta: 'Jak pojišťovny hledají rizikové pojištěnce a podporují zdravotní gramotnost.',
    co: 'Rizikové skupiny, dotazník kola 2, souhrnné odpovědi',
  },
  {
    id: 'metodika', href: 'pojistovny-metodika.html', label: 'Metodika a semafor', kicker: 'Derivát metodiky Barometru',
    veta: 'Šest oblastí, čtyři stavy a právo pojišťovny na odpověď; registr žádostí a ověření čísel.',
    co: 'Semafor 7 × 6, stanoviska, žádosti, ověření proti VZ, plán',
  },
];

/** Staré kotvy jednostránkové verze (pojistovny.html#modul-…) → podstránka. */
export const LEGACY_HASH = {
  'modul-aplikace': 'pojistovny-aplikace.html',
  'modul-prevence': 'pojistovny-prevence.html',
  'modul-kmen': 'pojistovny-kmen.html',
  'modul-gramotnost': 'pojistovny-gramotnost.html',
  'modul-metodika': 'pojistovny-metodika.html',
  'modul-plan': 'pojistovny-metodika.html#modul-plan',
};

export function zpStrankaById(id) {
  return ZP_STRANKY.find((s) => s.id === id) || null;
}

/** Rozcestník témat jako záložky; neznámé `aktivni` = žádná aktivní. */
export function zpTabsHtml(aktivni) {
  const items = ZP_STRANKY.map((s) => {
    const cur = s.id === aktivni ? ' aria-current="page"' : '';
    return `<li><a class="zpc-tab" href="${esc(s.href)}"${cur}>${esc(s.label)}</a></li>`;
  }).join('');
  return `<nav class="zpc-tabs" aria-label="Témata srovnávače"><ul>${items}</ul></nav>`;
}

/** Hlavička srovnávače: pásek pracovní verze, kicker, záložky. */
export function zpShellHtml(aktivni) {
  return '<div class="zpc-strip" role="note"><b>Pracovní verze pod heslem, neindexovaná.</b> '
    + 'Čísla z výročních zpráv jsou přepsána z PDF a čekají na druhé ověření.</div>'
    + `<div class="zpc-shell-head"><p class="zpc-kicker">${esc(KICKER)}</p>${zpTabsHtml(aktivni)}</div>`;
}

/** Patička „Zdroje“ ze zdroje[] v pojistovny.json (sbalená, aby nenatahovala stránku). */
export function zpZdrojeHtml(d) {
  const list = Array.isArray(d?.zdroje) ? d.zdroje : [];
  if (!list.length) return '';
  const items = list.map((z) => `<li>${esc(z.nazev || z.id || '')}`
    + `${z.url ? ` — <a href="${esc(z.url)}" rel="noopener">${esc(z.url)}</a>` : ''}`
    + `${z.clanek ? ` · <a href="${esc(z.clanek)}">článek</a>` : ''}</li>`).join('');
  return `<details class="zpc-acc zpc-zdroje"><summary>Zdroje dat srovnávače<span class="zpc-n"> · ${list.length}</span></summary>`
    + `<div class="zpc-acc-body"><ul class="zpc-zdroje-list">${items}</ul>`
    + '<p class="zpc-note">Každé číslo ve srovnávači nese zdroj a rok. Hodnocení v semaforu vzniká až po právu pojišťovny na odpověď.</p></div></details>';
}

/**
 * Kam přesměrovat starý odkaz na přehled: adresný odkaz na dotazník
 * (pojistovny.html?dotaznik=…&token=…) a kotvy #modul-… míří na podstránky.
 * @returns {string|null} cílová URL (relativní), nebo null
 */
export function legacyRedirect(search = '', hash = '') {
  const params = new URLSearchParams(search || '');
  if (params.get('dotaznik')) return `pojistovny-gramotnost.html${search}`;
  const h = String(hash || '').replace(/^#/, '');
  if (h && LEGACY_HASH[h]) return LEGACY_HASH[h];
  return null;
}

/**
 * Vykreslí shell do #zpShell a #zpZdroje (chybějící kontejner = nic).
 * @param {{aktivni?: string, doc?: Document}} [opts]  aktivni: id ze ZP_STRANKY;
 *   bez něj se čte z #zpShell[data-aktivni]
 * @returns {Promise<void>} resolvuje po vykreslení zdrojů
 */
export async function renderZpShell({ aktivni, doc = globalThis.document } = {}) {
  if (!doc) return;
  renderModuleNav('pojistovny');
  renderMastheadDate();
  if (typeof renderFooter === 'function') renderFooter();
  const host = doc.getElementById('zpShell');
  const tema = aktivni || host?.dataset?.aktivni || null;
  if (host && host.dataset.zpShellInit !== '1') {
    host.dataset.zpShellInit = '1';
    host.innerHTML = zpShellHtml(tema);
  }
  const foot = doc.getElementById('zpZdroje');
  if (!foot) return;
  const d = await loadJson(DATA_URL);
  foot.innerHTML = zpZdrojeHtml(d);
}
