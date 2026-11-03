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
// Záložky jsou ve dvou skupinách (ZP_SKUPINY): „pro pojištěnce“ (Přehled, Kmen, Peníze, Prevence,
// Aplikace, Zdravotní gramotnost) vlevo a „pro redakci a data“ (Metodika, Indikátory) vpravo,
// světlejším písmem a za svislým oddělovačem. Stáří dat pod nimi řeší src/pojistovny-stari.js.
//
// Čisté funkce (testované bez DOM): zpStrankaById, zpStrankyVSkupine, zpShellHtml,
// zpTabsHtml, zpZdrojeHtml, legacyRedirect.

import { renderModuleNav, renderMastheadDate, renderFooter, escapeHtml } from './page-shared.js';
import { loadJson, loadedJsonUrls } from './pojistovny-shared.js';

export { stariDatHtml } from './pojistovny-stari.js';

const esc = escapeHtml;

export const DATA_URL = 'data/pojistovny.json';
export const KICKER = 'Srovnávač zdravotních pojišťoven · pracovní verze';

/**
 * Skupiny záložek v pořadí zleva doprava. `pojistenci` je obsah pro čtenáře (pojištěnce),
 * `redakce` pracovní podklady (metodika, semafor, inventář dat) pro redakci a pracovní skupinu.
 */
export const ZP_SKUPINY = [
  { id: 'pojistenci', label: 'Pro pojištěnce' },
  { id: 'redakce', label: 'Pro redakci a data' },
];

/**
 * Stránky srovnávače v pořadí záložek; `skupina` je id z ZP_SKUPINY. `veta` a `co` čte
 * rozcestník přehledu (src/pojistovny-prehled.js), `kicker` je štítek karty rozcestníku.
 */
export const ZP_STRANKY = [
  { id: 'prehled', skupina: 'pojistenci', href: 'pojistovny.html', label: 'Přehled' },
  {
    id: 'kmen', skupina: 'pojistenci', href: 'pojistovny-kmen.html', label: 'Kmen a hospodaření', kicker: 'CRP 2025 · MZ a MF 2024 · ZPP 2026',
    veta: 'Kdo koho pojišťuje, jak starý kmen nese a kolik stojí jeho péče. Hospodaření a rezervy jsou na stránce Peníze.',
    co: 'Karty pojišťoven, vývoj kmene, věk kmene, kraje, síť odborností',
  },
  {
    id: 'penize', skupina: 'pojistenci', href: 'pojistovny-penize.html', label: 'Peníze', kicker: 'MZ 2015–2024 · přerozdělení 2019–2026',
    veta: 'Kdo do přerozdělení přispívá a kdo z něj bere, jak se hospodaření vyvíjelo deset let a za co pojišťovny platí.',
    co: 'Relativní saldo přerozdělení, řady 2015–2024, státní pojištěnci, segmenty, fond prevence, provoz, rezervy 2026',
  },
  {
    id: 'prevence', skupina: 'pojistenci', href: 'pojistovny-prevence.html', label: 'Prevence', kicker: 'Kolo 1 · weby a výroční zprávy',
    veta: 'Co pojišťovny z fondu prevence nabízejí, kam peníze jdou a co o výsledcích samy uvádějí.',
    co: 'Nabídka 7 × 9, onkologie a duševní zdraví, struktura fondu, odpovědi z VZ',
  },
  {
    id: 'aplikace', skupina: 'pojistenci', href: 'pojistovny-aplikace.html', label: 'Aplikace a servis', kicker: 'První výstup PS',
    veta: 'Deset funkcí aplikací, klientský servis, stížnosti na dostupnost a co pojišťovny publikují jako otevřená data.',
    co: 'Matice funkcí, kritéria přívětivosti, pobočky a bonusy, stížnosti a § 16a, audit open dat',
  },
  {
    id: 'gramotnost', skupina: 'pojistenci', href: 'pojistovny-gramotnost.html', label: 'Zdravotní gramotnost', kicker: 'V přípravě · druhé téma PS',
    veta: 'Jak pojišťovny hledají rizikové pojištěnce a podporují zdravotní gramotnost.',
    co: 'Rizikové skupiny, návrh dotazníků, souhrnné odpovědi',
  },
  {
    id: 'metodika', skupina: 'redakce', href: 'pojistovny-metodika.html', label: 'Metodika a semafor', kicker: 'Derivát metodiky Barometru',
    veta: 'Šest oblastí, čtyři stavy a právo pojišťovny na odpověď; registr žádostí a ověření čísel.',
    co: 'Semafor 7 × 6, návrh dotazníků a vyhodnocení, stanoviska, žádosti, ověření proti VZ, plán',
  },
  {
    id: 'indikatory', skupina: 'redakce', href: 'pojistovny-indikatory.html', label: 'Indikátory a data', kicker: 'Inventář · stav k 2. 11. 2026',
    veta: 'Které údaje říkají, kdo je u koho pojištěn, které indikátory se pojišťoven týkají a jak pojišťovny publikují otevřená data.',
    co: 'Zdroje o kmeni, indikátory kontraktu, datové sady, navržené ukazatele, audit open dat',
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

/** Stránky jedné skupiny v pořadí záložek (neznámá skupina = prázdné pole). */
export function zpStrankyVSkupine(skupina) {
  return ZP_STRANKY.filter((s) => s.skupina === skupina);
}

/**
 * Rozcestník témat jako záložky ve dvou skupinách (každá vlastní `<ul>` pojmenovaná skrytým
 * popiskem skupiny pro čtečku; druhá, redakční, jde vpravo za svislým oddělovačem).
 * Neznámé `aktivni` = žádná aktivní.
 */
export function zpTabsHtml(aktivni) {
  const groups = ZP_SKUPINY.map((g) => {
    const items = zpStrankyVSkupine(g.id).map((s) => {
      const cur = s.id === aktivni ? ' aria-current="page"' : '';
      return `<li><a class="zpc-tab" href="${esc(s.href)}"${cur}>${esc(s.label)}</a></li>`;
    }).join('');
    if (!items) return '';
    return `<span class="zpc-tabs-lbl sr-only" id="zpTabsLbl-${esc(g.id)}">${esc(g.label)}</span>`
      + `<ul class="zpc-tabs-grp zpc-tabs-grp--${esc(g.id)}" data-skupina="${esc(g.id)}" aria-labelledby="zpTabsLbl-${esc(g.id)}">${items}</ul>`;
  }).join('');
  return `<nav class="zpc-tabs" aria-label="Témata srovnávače">${groups}</nav>`;
}

/** Hlavička srovnávače: pásek pracovní verze, kicker, záložky. */
export function zpShellHtml(aktivni) {
  return '<div class="zpc-strip" role="note"><b>Pracovní verze pod heslem, neindexovaná.</b> '
    + 'Čísla z výročních zpráv jsou přepsána z PDF a čekají na druhé ověření.</div>'
    + `<div class="zpc-shell-head"><p class="zpc-kicker">${esc(KICKER)}</p>${zpTabsHtml(aktivni)}</div>`;
}

/** Odstavec „Data této stránky (JSON)“ s odkazy na načtené datasety; bez URL prázdný řetězec. */
export function zpZdrojeJsonHtml(jsonUrls) {
  const urls = (Array.isArray(jsonUrls) ? jsonUrls : []).filter((u) => typeof u === 'string' && u);
  if (!urls.length) return '';
  const links = urls.map((u) => `<a href="${esc(u)}">${esc(u.split('/').pop())}</a>`).join(' · ');
  return `<p class="zpc-zdroje-json">Data této stránky (JSON, CC BY 4.0): ${links}</p>`;
}

/** Patička „Zdroje“ ze zdroje[] v pojistovny.json (sbalená, aby nenatahovala stránku); jsonUrls = načtené datasety. */
export function zpZdrojeHtml(d, jsonUrls = []) {
  const list = Array.isArray(d?.zdroje) ? d.zdroje : [];
  if (!list.length) return '';
  const items = list.map((z) => `<li>${esc(z.nazev || z.id || '')}`
    + `${z.url ? ` — <a href="${esc(z.url)}" rel="noopener">${esc(z.url)}</a>` : ''}`
    + `${z.clanek ? ` · <a href="${esc(z.clanek)}">článek</a>` : ''}</li>`).join('');
  return `<details class="zpc-acc zpc-zdroje"><summary>Zdroje dat srovnávače<span class="zpc-n"> · ${list.length}</span></summary>`
    + `<div class="zpc-acc-body"><ul class="zpc-zdroje-list">${items}</ul>`
    + '<p class="zpc-note">Každé číslo ve srovnávači nese zdroj a rok. Hodnocení v semaforu vzniká až po právu pojišťovny na odpověď.</p>'
    + `${zpZdrojeJsonHtml(jsonUrls)}</div></details>`;
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
  foot.innerHTML = zpZdrojeHtml(d, loadedJsonUrls());
  // ostatní moduly stránky načítají data až po shellu → seznam JSON se doplní po načtení stránky
  if (typeof globalThis.addEventListener === 'function' && !renderZpShell._loadHook) {
    renderZpShell._loadHook = true;
    globalThis.addEventListener('load', () => refreshZdrojeJson(doc), { once: true });
  }
}

/** Doplní / obnoví odstavec s odkazy na JSON v už vykreslené patičce (neruší otevření <details>). */
export function refreshZdrojeJson(doc = globalThis.document) {
  const body = doc?.querySelector ? doc.querySelector('#zpZdroje .zpc-acc-body') : null;
  if (!body) return;
  const html = zpZdrojeJsonHtml(loadedJsonUrls());
  const cur = body.querySelector('.zpc-zdroje-json');
  if (cur) cur.remove();
  if (html) body.insertAdjacentHTML('beforeend', html);
}
