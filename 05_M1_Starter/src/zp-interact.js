// Srovnávač pojišťoven — interakce (P1.3, PLAN-SROVNAVAC-POJISTOVEN.md § 2.2, § 2.5).
//
// DOM modul. Grafy (src/zp-viz.js) vracejí jen HTML/SVG string; tenhle modul je
// oživí, a to idempotentně a bez per-element listenerů:
//
//   1. „Moje pojišťovna“ — chipy v #zpMojeZp, výběr v localStorage (hspa-moje-zp),
//      atribut main[data-moje-zp], event `zp:moje-change` na document.
//   2. Linked highlight — delegovaný pointerover/focusin na .zpv-mark[data-zp]
//      nastaví na <main> třídu zpi-hover-<kod> (CSS zvýrazní stejný kód všude).
//   3. Tooltip — jeden <div class="zpi-tip" role="status" aria-live="polite">,
//      plní ho .zpv-mark i libovolný prvek s data-tip (TIP_SELECTOR: buňky
//      heatmapy s popisem programu, dot matrix, matice pokrytí, řádky barů).
//   4. Animace — IntersectionObserver přidá .is-in na figure.zpv, count-up.
//   5. Řazení heatmap (button.zpv-sort[data-col]) a „Rozbalit vše“.
//   6. „Porovnat s“ (A4.2) — druhý řádek chipů v #zpPorovnatZp (vytvoří se pod #zpMojeZp),
//      výběr v localStorage (hspa-porovnat-zp), main[data-porovnat-zp], event `zp:porovnat-change`;
//      marky druhé ZP dostanou .is-porovnat (obrys), řádky tabulek data-porovnat="true";
//      řádky skládaného grafu (.zpv-srow[data-zp], stackedRows) dostávají .is-moje/.is-porovnat jako řádky tabulek.
//      Parametr ?porovnat=<kód> v URL má při načtení přednost před localStorage.
//   7. Přepínače u grafů (A4.3) — figureSwitch() ze zp-viz.js: jeden delegovaný handler (klik,
//      šipky, change), zápis `?<id>=…` do URL (replaceState) a event `zp:switch` {id, value}.
//
// Kontrakt (třídy, atributy, události) je shrnutý v hlavičce CSS sekce
// „Srovnávač pojišťoven: interakce“ v src/styles.css a v tests/zp-interact.test.js.

import { formatNumberCz, escapeHtml } from './page-shared.js';
import { tableToCsv, csvFilename } from './zp-viz.js';

export const STORAGE_KEY = 'hspa-moje-zp';
export const MOJE_EVENT = 'zp:moje-change';
export const HOVER_PREFIX = 'zpi-hover-';
export const POROVNAT_KEY = 'hspa-porovnat-zp';
export const POROVNAT_EVENT = 'zp:porovnat-change';
export const SWITCH_EVENT = 'zp:switch';
/** Co ukazuje tooltip: datové marky i buňky/řádky s popisem (heatmapa, dot matrix,
 *  matice pokrytí, řádek baru). Hover i focus; fokusovatelné jsou jen prvky s tabindex. */
export const TIP_SELECTOR = '.zpv-mark, [data-tip]';

/** Záloha seznamu ZP — použije se jen, když selže import ./zp-palette.js.
 *  Kódy a zkratky odpovídají data/pojistovny.json. */
export const ZP_FALLBACK = [
  { kod: '111', zkratka: 'VZP ČR', nazev: 'Všeobecná zdravotní pojišťovna ČR', token: '--zp-111' },
  { kod: '201', zkratka: 'VoZP', nazev: 'Vojenská zdravotní pojišťovna ČR', token: '--zp-201' },
  { kod: '205', zkratka: 'ČPZP', nazev: 'Česká průmyslová zdravotní pojišťovna', token: '--zp-205' },
  { kod: '207', zkratka: 'OZP', nazev: 'Oborová zdravotní pojišťovna zaměstnanců bank, pojišťoven a stavebnictví', token: '--zp-207' },
  { kod: '209', zkratka: 'ZPŠ', nazev: 'Zaměstnanecká pojišťovna Škoda', token: '--zp-209' },
  { kod: '211', zkratka: 'ZP MV ČR', nazev: 'Zdravotní pojišťovna ministerstva vnitra ČR', token: '--zp-211' },
  { kod: '213', zkratka: 'RBP', nazev: 'RBP, zdravotní pojišťovna', token: '--zp-213' },
];

export const ZP_KODY = ZP_FALLBACK.map((z) => z.kod);

const TIP_GAP = 8;
const TIP_MARGIN = 8;
const COUNT_MS = 1200;

// ---------------------------------------------------------------------------
// Čisté pomocné funkce (testované bez DOM)
// ---------------------------------------------------------------------------

export function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/** Text počítadla: český formát, typografické minus (U+2212) a volitelný prefix —
 *  stejný výstup jako fmtValue v zp-viz.js, aby count-up nepřepsal „−7,5“ na „-7,5“. */
export function fmtCount(v, decimals = 0, prefix = '') {
  if (!Number.isFinite(v)) return null;
  const d = Math.min(4, Math.max(0, decimals | 0));
  return `${prefix}${formatNumberCz(v, { minDecimals: d, maxDecimals: d }).replace(/^-/, '\u2212')}`;
}

/**
 * Pozice tooltipu (position: fixed) u marku, zarovnaná do viewportu.
 * Preferuje umístění nad markem, při nedostatku místa pod ním.
 * @param {{left:number, top:number, right?:number, bottom?:number, width?:number, height?:number}} rect
 * @param {{width:number, height:number}} tipSize
 * @param {{width:number, height:number}} viewport
 * @returns {{left:number, top:number, placement:'above'|'below'}}
 */
export function clampTipPosition(rect, tipSize, viewport) {
  const rw = rect.width != null ? rect.width : (rect.right - rect.left);
  const rh = rect.height != null ? rect.height : (rect.bottom - rect.top);
  const bottom = rect.bottom != null ? rect.bottom : rect.top + rh;
  const tw = tipSize.width;
  const th = tipSize.height;

  let left = rect.left + rw / 2 - tw / 2;
  const maxLeft = Math.max(TIP_MARGIN, viewport.width - tw - TIP_MARGIN);
  left = Math.min(Math.max(left, TIP_MARGIN), maxLeft);

  let placement = 'above';
  let top = rect.top - th - TIP_GAP;
  if (top < TIP_MARGIN) {
    placement = 'below';
    top = bottom + TIP_GAP;
    if (top + th > viewport.height - TIP_MARGIN) {
      top = Math.max(TIP_MARGIN, viewport.height - th - TIP_MARGIN);
    }
  }
  return { left: Math.round(left), top: Math.round(top), placement };
}

function cellLevel(cell) {
  if (!cell) return null;
  const raw = typeof cell.getAttribute === 'function'
    ? cell.getAttribute('data-level')
    : (cell.dataset ? cell.dataset.level : null);
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Seřadí řádky podle data-level buňky ve sloupci colIndex. Stabilní;
 * řádky bez úrovně („nedohledáno“) jdou vždy na konec, v obou směrech.
 * @param {ArrayLike<{cells:ArrayLike<any>}>} rows
 * @param {number} colIndex
 * @param {'asc'|'desc'} dir
 * @returns {Array} nové pole (vstup se nemění)
 */
export function sortRowsByLevel(rows, colIndex, dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return Array.from(rows)
    .map((row, i) => ({ row, i, level: cellLevel(row.cells && row.cells[colIndex]) }))
    .sort((a, b) => {
      if (a.level === null && b.level === null) return a.i - b.i;
      if (a.level === null) return 1;
      if (b.level === null) return -1;
      if (a.level !== b.level) return sign * (a.level - b.level);
      return a.i - b.i;
    })
    .map((x) => x.row);
}

/** První klik na sloupec řadí sestupně, další přepíná. */
export function nextSortDir(currentAriaSort) {
  return currentAriaSort === 'descending' ? 'asc' : 'desc';
}

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch (_) { return null; }
}

/** Načte vybraný kód ZP; neplatná/chybějící hodnota i vyhozená výjimka → null. */
export function readMojeZp(storage = defaultStorage(), valid = ZP_KODY) {
  try {
    if (!storage) return null;
    const v = storage.getItem(STORAGE_KEY);
    return v && valid.includes(v) ? v : null;
  } catch (_) { return null; }
}

/** Uloží (nebo při null smaže) výběr. Vrací true, když se zápis povedl. */
export function writeMojeZp(kod, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    if (kod == null) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, String(kod));
    return true;
  } catch (_) { return false; }
}

/** Normalizuje seznam ZP (z zp-palette.js nebo ze zálohy) na {kod, zkratka, nazev, cssVar}. */
export function normalizeZpList(list) {
  if (!Array.isArray(list) || list.length === 0) return normalizeZpList(ZP_FALLBACK);
  const out = [];
  for (const z of list) {
    if (!z || z.kod == null) continue;
    const kod = String(z.kod);
    const m = typeof z.token === 'string' ? z.token.match(/--[a-z0-9-]+/i) : null;
    out.push({
      kod,
      zkratka: String(z.zkratka || z.nazev || kod),
      nazev: String(z.nazev || z.zkratka || kod),
      cssVar: m ? m[0] : `--zp-${kod}`,
    });
  }
  return out.length ? out : normalizeZpList(ZP_FALLBACK);
}

/**
 * Vyrenderuje řádek chipů „Moje pojišťovna“ do kontejneru (DOM API, text jen přes textContent).
 * @param {Element|null} container  #zpMojeZp; když chybí, nic se neděje
 * @param {Array} zpList            [{kod, zkratka, nazev, token}]
 * @param {string|null} [selected]  aktuálně vybraný kód
 * @returns {Element|null} vytvořený .zpi-chips
 */
export function renderMojeZpChips(container, zpList, selected = null) {
  if (!container) return null;
  const doc = container.ownerDocument || globalThis.document;
  const list = normalizeZpList(zpList);

  const row = doc.createElement('div');
  row.className = 'zpi-chips';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Moje pojišťovna');

  for (const z of list) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'zpi-chip';
    btn.setAttribute('data-zp', z.kod);
    btn.setAttribute('aria-pressed', selected === z.kod ? 'true' : 'false');
    btn.setAttribute('title', z.nazev);
    const dot = doc.createElement('span');
    dot.className = 'zpi-dot';
    dot.setAttribute('style', `--c:var(${z.cssVar})`);
    dot.setAttribute('aria-hidden', 'true');
    const label = doc.createElement('span');
    label.textContent = z.zkratka;
    btn.appendChild(dot);
    btn.appendChild(label);
    row.appendChild(btn);
  }

  const clear = doc.createElement('button');
  clear.type = 'button';
  clear.className = 'zpi-chip zpi-chip--clear';
  clear.setAttribute('data-zp-clear', '');
  clear.textContent = 'Zrušit výběr';
  if (selected == null) clear.disabled = true;
  row.appendChild(clear);

  container.replaceChildren(row);
  return row;
}

/** Načte vybraný kód „Porovnat s“; neplatná/chybějící hodnota i vyhozená výjimka → null. */
export function readPorovnat(storage = defaultStorage(), valid = ZP_KODY) {
  try {
    if (!storage) return null;
    const v = storage.getItem(POROVNAT_KEY);
    return v && valid.includes(v) ? v : null;
  } catch (_) { return null; }
}

/** Uloží (nebo při null smaže) „Porovnat s“. Vrací true, když se zápis povedl. */
export function writePorovnat(kod, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    if (kod == null) storage.removeItem(POROVNAT_KEY);
    else storage.setItem(POROVNAT_KEY, String(kod));
    return true;
  } catch (_) { return false; }
}

/** Kód z `?porovnat=` v query stringu; neznámý nebo chybějící = null. */
export function porovnatZUrl(search, valid = ZP_KODY) {
  let v = null;
  try { v = new URLSearchParams(String(search ?? '')).get('porovnat'); } catch (_) { v = null; }
  return v && valid.includes(v) ? v : null;
}

/** Query string s nastaveným (nebo při null / výchozí hodnotě smazaným) parametrem; ostatní parametry zůstanou. */
export function searchWith(search, id, value, defaultValue = null) {
  let p;
  try { p = new URLSearchParams(String(search ?? '')); } catch (_) { p = new URLSearchParams(''); }
  if (value == null || value === '' || (defaultValue != null && String(value) === String(defaultValue))) p.delete(id);
  else p.set(id, String(value));
  const out = p.toString();
  return out ? `?${out}` : '';
}

/** Index další volby radiogroupu po šipce (cyklicky); jiná klávesa = -1. */
export function nextSwitchIndex(length, index, key) {
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 0;
  if (!step || !(length > 0) || !(index >= 0)) return -1;
  return (index + step + length) % length;
}

/**
 * HTML řádku chipů „Porovnat s“ (čistá funkce; DOM ho jen vloží). Pojišťovna vybraná jako „Moje“
 * je disabled (nejde porovnávat sama se sebou); „Zrušit“ je disabled bez výběru.
 * @param {Array} zpList  [{kod, zkratka, nazev, token}]
 * @param {string|null} [moje]
 * @param {string|null} [porovnat]
 */
export function porovnatChipsHtml(zpList, moje = null, porovnat = null) {
  const e = escapeHtml;
  const chips = normalizeZpList(zpList).map((z) => {
    const isMoje = moje != null && moje === z.kod;
    const title = isMoje ? `${z.nazev} (je vaše pojišťovna)` : z.nazev;
    return `<button type="button" class="zpi-chip zpi-chip--porovnat" data-zp="${e(z.kod)}" aria-pressed="${porovnat === z.kod}" title="${e(title)}"${isMoje ? ' disabled' : ''}>`
      + `<span class="zpi-dot" style="--c:var(${e(z.cssVar)})" aria-hidden="true"></span><span>${e(z.zkratka)}</span></button>`;
  }).join('');
  return '<div class="zpi-chips zpi-chips--porovnat" role="group" aria-label="Porovnat s">'
    + '<span class="zpi-chips-lbl">Porovnat s</span>'
    + `${chips}<button type="button" class="zpi-chip zpi-chip--clear zpi-chip--porovnat" data-zp-clear-porovnat${porovnat == null ? ' disabled' : ''}>Zrušit</button></div>`;
}

/** Vloží řádek „Porovnat s“ do kontejneru; bez kontejneru nic. */
export function renderPorovnatChips(container, zpList, moje = null, porovnat = null) {
  if (!container) return null;
  // HTML skládá porovnatChipsHtml a všechny texty prošly escapeHtml; do tooltipu (textContent) se nikdy nevkládá HTML
  container.replaceChildren();
  container.insertAdjacentHTML('beforeend', porovnatChipsHtml(zpList, moje, porovnat));
  return container.firstElementChild || null;
}

// ---------------------------------------------------------------------------
// DOM část
// ---------------------------------------------------------------------------

function prefersReducedMotion(win) {
  try {
    return !!(win && typeof win.matchMedia === 'function'
      && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

function getMain(root) {
  if (root && root.nodeType === 9) return root.querySelector('main') || root.body || root.documentElement;
  if (root && root.closest) return root.closest('main') || root;
  return null;
}

function getTip(doc) {
  let tip = doc.querySelector('.zpi-tip');
  if (!tip) {
    tip = doc.createElement('div');
    tip.className = 'zpi-tip';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    doc.body.appendChild(tip);
  }
  return tip;
}

function runCount(el, win) {
  const target = parseFloat(el.dataset.value);
  const decimals = parseInt(el.dataset.decimals, 10) || 0;
  const fmt = (v) => fmtCount(v, decimals, el.dataset.prefix || '');
  if (!Number.isFinite(target)) return;
  const t0 = win.performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / COUNT_MS);
    el.textContent = p < 1 ? fmt(target * easeOutQuart(p)) : fmt(target);
    if (p < 1) win.requestAnimationFrame(step);
  };
  win.requestAnimationFrame(step);
}

/**
 * Oživí stránku/část stránky. Idempotentní — lze volat znovu po každém
 * překreslení grafů (nové figury/počítadla se zpracují, ostatní se přeskočí;
 * výběr „Moje pojišťovna“ se znovu promítne do řádků tabulek a marků).
 * @param {Document|Element} [root]
 * @returns {Promise<void>} resolvuje po vykreslení chipů (volající může ignorovat)
 */
export function initZpInteract(root = globalThis.document) {
  const main = getMain(root);
  if (!main) return Promise.resolve();
  const doc = main.ownerDocument;
  const win = doc.defaultView || globalThis;
  const reduced = prefersReducedMotion(win);
  const first = main.dataset.zpiInit !== '1';

  // ---- výběr: obnovení + promítnutí do DOM --------------------------------
  const container = doc.getElementById('zpMojeZp');
  let chipsList = ZP_FALLBACK;

  const syncMoje = (kod) => {
    if (kod) main.setAttribute('data-moje-zp', kod);
    else main.removeAttribute('data-moje-zp');
    main.querySelectorAll('tr[data-zp]').forEach((tr) => {
      if (kod && tr.getAttribute('data-zp') === kod) tr.setAttribute('aria-current', 'true');
      else if (tr.getAttribute('data-porovnat') === 'true') tr.setAttribute('aria-current', 'false'); // řádek druhé ZP
      else tr.removeAttribute('aria-current');
    });
    main.querySelectorAll('.zpv-mark[data-zp], tr[data-zp], .zpv-srow[data-zp]').forEach((el) => {
      el.classList.toggle('is-moje', !!kod && el.getAttribute('data-zp') === kod);
    });
    // chipy „Moje“ (řádek „Porovnat s“ má vlastní modifikátor a vlastní stav)
    doc.querySelectorAll('.zpi-chip[data-zp]:not(.zpi-chip--porovnat)').forEach((b) => {
      b.setAttribute('aria-pressed', kod && b.getAttribute('data-zp') === kod ? 'true' : 'false');
    });
    doc.querySelectorAll('.zpi-chip--clear:not(.zpi-chip--porovnat)').forEach((b) => { b.disabled = !kod; });
    doc.querySelectorAll('.zpi-chip--porovnat[data-zp]').forEach((b) => { b.disabled = !!kod && b.getAttribute('data-zp') === kod; });
  };

  // „Porovnat s“: stav v main[data-porovnat-zp], třída .is-porovnat na markách a řádcích druhé ZP
  const syncPorovnat = (kod) => {
    if (kod) main.setAttribute('data-porovnat-zp', kod);
    else main.removeAttribute('data-porovnat-zp');
    main.querySelectorAll('.zpv-mark[data-zp], tr[data-zp], .zpv-srow[data-zp]').forEach((el) => {
      const on = !!kod && el.getAttribute('data-zp') === kod;
      el.classList.toggle('is-porovnat', on);
      if (el.tagName !== 'TR') return;
      if (on) {
        el.setAttribute('data-porovnat', 'true');
        if (el.getAttribute('aria-current') !== 'true') el.setAttribute('aria-current', 'false');
      } else {
        el.removeAttribute('data-porovnat');
        if (el.getAttribute('aria-current') === 'false') el.removeAttribute('aria-current');
      }
    });
    doc.querySelectorAll('.zpi-chip--porovnat[data-zp]').forEach((b) => {
      b.setAttribute('aria-pressed', kod && b.getAttribute('data-zp') === kod ? 'true' : 'false');
    });
    doc.querySelectorAll('[data-zp-clear-porovnat]').forEach((b) => { b.disabled = !kod; });
  };

  const setPorovnat = (kod) => {
    const moje = main.getAttribute('data-moje-zp');
    const valid = kod != null && kod !== moje && normalizeZpList(chipsList).some((z) => z.kod === kod) ? kod : null;
    writePorovnat(valid);
    syncPorovnat(valid);
    syncPorovnatUrl(win, valid);
    doc.dispatchEvent(new win.CustomEvent(POROVNAT_EVENT, { bubbles: true, detail: { kod: valid } }));
  };

  const setMoje = (kod) => {
    const valid = kod != null && normalizeZpList(chipsList).some((z) => z.kod === kod) ? kod : null;
    writeMojeZp(valid);
    syncMoje(valid);
    doc.dispatchEvent(new win.CustomEvent(MOJE_EVENT, { bubbles: true, detail: { kod: valid } }));
    // stejná pojišťovna nemůže být zároveň „Moje“ i „Porovnat s“
    if (valid && main.getAttribute('data-porovnat-zp') === valid) setPorovnat(null);
  };

  const current = first ? readMojeZp(defaultStorageOf(win)) : main.getAttribute('data-moje-zp');
  syncMoje(current);

  // „Porovnat s“: URL (?porovnat=) má při načtení přednost před localStorage
  let currentPor = main.getAttribute('data-porovnat-zp');
  if (first) {
    const urlPor = porovnatZUrl(win.location ? win.location.search : '');
    currentPor = urlPor || readPorovnat(defaultStorageOf(win));
    if (currentPor && currentPor === current) currentPor = null;
    if (urlPor && currentPor) writePorovnat(currentPor, defaultStorageOf(win));
  }
  syncPorovnat(currentPor);

  // ---- globální (jednou na dokument/main) ---------------------------------
  if (first) {
    main.dataset.zpiInit = '1';
    bindDelegates(main, doc, win);
    if (current) doc.dispatchEvent(new win.CustomEvent(MOJE_EVENT, { bubbles: true, detail: { kod: current, initial: true } }));
    if (currentPor) doc.dispatchEvent(new win.CustomEvent(POROVNAT_EVENT, { bubbles: true, detail: { kod: currentPor, initial: true } }));
  }

  // ---- animace ------------------------------------------------------------
  setupMotion(main, win, reduced);

  // ---- rozbalit vše -------------------------------------------------------
  let wantExpand = false;
  try { wantExpand = new win.URLSearchParams(win.location.search).get('otevrit') === 'vse'; } catch (_) { /* ignore */ }
  main.querySelectorAll('details:not([data-zpi-init])').forEach((d) => {
    d.setAttribute('data-zpi-init', '1');
    if (wantExpand) d.open = true;
  });

  // ---- chipy (asynchronně kvůli volitelnému zp-palette.js) -----------------
  if (!container || container.dataset.zpiInit === '1') return Promise.resolve();
  container.dataset.zpiInit = '1';
  container.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target.closest('button') : null;
    if (!t || !container.contains(t)) return;
    if (t.hasAttribute('data-zp-clear')) { setMoje(null); return; }
    const kod = t.getAttribute('data-zp');
    if (!kod) return;
    setMoje(main.getAttribute('data-moje-zp') === kod ? null : kod);
  });
  // druhý řádek chipů pod „Moje pojišťovna“ (kontejner se vytvoří sám, HTML stránek se nemění)
  let porContainer = doc.getElementById('zpPorovnatZp');
  if (!porContainer) {
    porContainer = doc.createElement('div');
    porContainer.id = 'zpPorovnatZp';
    porContainer.className = 'zpc-moje zpc-porovnat';
    container.insertAdjacentElement('afterend', porContainer);
  }
  porContainer.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target.closest('button') : null;
    if (!t || !porContainer.contains(t) || t.disabled) return;
    if (t.hasAttribute('data-zp-clear-porovnat')) { setPorovnat(null); return; }
    const kod = t.getAttribute('data-zp');
    if (!kod) return;
    setPorovnat(main.getAttribute('data-porovnat-zp') === kod ? null : kod);
  });
  return loadZpList().then((list) => {
    chipsList = list;
    renderMojeZpChips(container, list, main.getAttribute('data-moje-zp'));
    renderPorovnatChips(porContainer, list, main.getAttribute('data-moje-zp'), main.getAttribute('data-porovnat-zp'));
  });
}

/** Parametr ?porovnat= se v URL udržuje jen tam, kde už je, a na profilu pojišťovny (sdílitelný odkaz). */
function syncPorovnatUrl(win, kod) {
  try {
    const u = new win.URL(win.location.href);
    const maParam = u.searchParams.has('porovnat');
    const profil = /\/pojistovna(\.html)?$/.test(u.pathname);
    if (!maParam && !profil) return;
    u.search = searchWith(u.search, 'porovnat', kod);
    win.history.replaceState(null, '', u);
  } catch (_) { /* bez history API se stav jen nezapíše */ }
}

/** Zápis `?<id>=<value>` do URL (výchozí hodnota parametr smaže). */
function switchToUrl(win, id, value, def) {
  try {
    const u = new win.URL(win.location.href);
    u.search = searchWith(u.search, id, value, def);
    win.history.replaceState(null, '', u);
  } catch (_) { /* bez history API se stav jen nezapíše */ }
}

function emitSwitch(doc, win, id, value, def) {
  switchToUrl(win, id, value, def);
  doc.dispatchEvent(new win.CustomEvent(SWITCH_EVENT, { bubbles: true, detail: { id, value } }));
}

function pickRadio(btn, doc, win) {
  const group = btn.closest('.zpc-switch[data-switch]');
  if (!group || btn.getAttribute('aria-checked') === 'true') return;
  group.querySelectorAll('button[role="radio"]').forEach((b) => {
    const on = b === btn;
    b.setAttribute('aria-checked', String(on));
    b.setAttribute('tabindex', on ? '0' : '-1');
  });
  emitSwitch(doc, win, group.getAttribute('data-switch'), btn.getAttribute('data-value'), group.getAttribute('data-default'));
}

function defaultStorageOf(win) {
  try { return win.localStorage || null; } catch (_) { return null; }
}

async function loadZpList() {
  try {
    const mod = await import('./zp-palette.js');
    if (Array.isArray(mod.ZP) && mod.ZP.length) return mod.ZP;
  } catch (_) { /* soubor ještě nemusí existovat → záloha */ }
  return ZP_FALLBACK;
}

function bindDelegates(main, doc, win) {
  const tip = getTip(doc);
  let hoverKod = null;

  const setHover = (kod) => {
    if (kod === hoverKod) return;
    if (hoverKod) main.classList.remove(HOVER_PREFIX + hoverKod);
    hoverKod = kod;
    if (kod) main.classList.add(HOVER_PREFIX + kod);
  };

  const showTip = (mark) => {
    // Mark bez vlastního popisu (kolečko v dot matrix) bere text z nejbližšího
    // předka s data-tip (buňka); pozice tooltipu zůstává u marku.
    const holder = mark.hasAttribute('data-tip') ? mark
      : (mark.parentElement && mark.parentElement.closest ? mark.parentElement.closest('[data-tip]') : null);
    const text = holder ? holder.getAttribute('data-tip') : null;
    if (!text) return;
    tip.textContent = text;
    tip.classList.add('is-on');
    const r = mark.getBoundingClientRect();
    const pos = clampTipPosition(
      r,
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight },
    );
    tip.style.left = `${pos.left}px`;
    tip.style.top = `${pos.top}px`;
    tip.setAttribute('data-placement', pos.placement);
  };

  const hideTip = () => {
    if (!tip.classList.contains('is-on')) return;
    tip.classList.remove('is-on');
    tip.textContent = '';
  };

  const markOf = (e) => (e.target && e.target.closest ? e.target.closest(TIP_SELECTOR) : null);

  const enter = (e) => {
    const mark = markOf(e);
    if (!mark) return;
    setHover(mark.getAttribute('data-zp'));
    showTip(mark);
  };
  const leave = (e) => {
    if (e.type === 'pointerout' && e.pointerType === 'touch') return; // dotyk: schová další klepnutí
    const mark = markOf(e);
    if (!mark) return;
    const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(TIP_SELECTOR) : null;
    if (to === mark) return;
    if (!to) { setHover(null); hideTip(); }
  };

  main.addEventListener('pointerover', enter);
  main.addEventListener('pointerout', leave);
  main.addEventListener('focusin', enter);
  main.addEventListener('focusout', leave);

  doc.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest && e.target.closest(TIP_SELECTOR)) return;
    setHover(null);
    hideTip();
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setHover(null); hideTip(); }
  });

  main.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target.closest('button') : null;
    if (!t) return;
    if (t.getAttribute('role') === 'radio' && t.closest('.zpc-switch[data-switch]')) { pickRadio(t, doc, win); return; }
    if (t.classList.contains('zpi-expand-all')) {
      main.querySelectorAll('details').forEach((d) => { d.open = true; });
      return;
    }
    if (t.classList.contains('zpv-sort')) sortHeat(t);
    if (t.hasAttribute('data-zpv-csv')) downloadCsv(t, doc, win);
  });

  // A4.3: select přepínač a šipky u radiogroupu
  main.addEventListener('change', (e) => {
    const sel = e.target && e.target.closest ? e.target.closest('select[data-switch]') : null;
    if (sel) emitSwitch(doc, win, sel.getAttribute('data-switch'), sel.value, sel.getAttribute('data-default'));
  });
  main.addEventListener('keydown', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.zpc-switch[data-switch] button[role="radio"]') : null;
    if (!b) return;
    const all = Array.from(b.closest('.zpc-switch').querySelectorAll('button[role="radio"]'));
    const i = nextSwitchIndex(all.length, all.indexOf(b), e.key);
    if (i < 0) return;
    e.preventDefault();
    pickRadio(all[i], doc, win);
    all[i].focus();
  });
}

/** Sestaví CSV z tabulkového dvojčete nad tlačítkem (textContent buněk) a stáhne ho; bez serveru a sledování. */
function downloadCsv(btn, doc, win) {
  const details = btn.closest('details.zpv-table');
  const table = details ? details.querySelector('table') : null;
  if (!table) return;
  const cellText = (c) => c.textContent || '';
  const headers = Array.from(table.querySelectorAll('thead th')).map(cellText);
  const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.children).map(cellText));
  const title = details.getAttribute('data-csv-title') || '';
  const csv = tableToCsv(headers, rows, { title, source: details.getAttribute('data-csv-source') || '', text: true });
  const blob = new win.Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = win.URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = csvFilename(title, new Date());
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
}

function sortHeat(btn) {
  const table = btn.closest('table.zpv-heat');
  const th = btn.closest('th');
  if (!table || !th || !table.tBodies.length) return;
  const colAttr = Number(btn.getAttribute('data-col'));
  const col = Number.isFinite(colAttr) && btn.hasAttribute('data-col') ? colAttr : th.cellIndex;
  const dir = nextSortDir(th.getAttribute('aria-sort'));
  const tbody = table.tBodies[0];
  const sorted = sortRowsByLevel(Array.from(tbody.rows), col, dir);
  sorted.forEach((row) => tbody.appendChild(row));
  table.querySelectorAll('th[aria-sort]').forEach((h) => h.removeAttribute('aria-sort'));
  th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
  // Po seřazení se ukáže věta „Řazeno podle stupně, nejde o hodnocení“ (heatmap() ji nese skrytou).
  const fig = table.closest ? table.closest('figure') : null;
  const note = fig ? fig.querySelector('[data-zpv-sortnote]') : null;
  if (note) note.hidden = false;
}

function setupMotion(main, win, reduced) {
  const counts = Array.from(main.querySelectorAll('.zpv-count[data-value]:not([data-zpi-init])'));
  const figures = Array.from(main.querySelectorAll('figure.zpv:not([data-zpi-init])'))
    .filter((f) => f.querySelector('[data-zpv-anim]'));
  counts.forEach((c) => { c.setAttribute('data-zpi-init', '1'); });
  figures.forEach((f) => { f.setAttribute('data-zpi-init', '1'); });

  const finalText = (el) => fmtCount(parseFloat(el.dataset.value), parseInt(el.dataset.decimals, 10) || 0, el.dataset.prefix || '');

  if (reduced || typeof win.IntersectionObserver === 'undefined') {
    // Konečný stav bez přechodu: žádná třída zpv-anim-ready, hodnoty rovnou.
    counts.forEach((c) => { const t = finalText(c); if (t != null) c.textContent = t; });
    return;
  }

  if (figures.length) main.classList.add('zpv-anim-ready');

  const io = new win.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      if (el.matches('figure.zpv')) {
        el.querySelectorAll('.zpv-mark').forEach((m, i) => m.style.setProperty('--i', String(i)));
        el.classList.add('is-in');
        el.querySelectorAll('.zpv-count[data-value]').forEach((c) => runCount(c, win));
      } else {
        runCount(el, win);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -10% 0px' });

  figures.forEach((f) => io.observe(f));
  // Počítadla uvnitř figury spouští figura; samostatná mají vlastní pozorování.
  counts.filter((c) => !c.closest('figure.zpv')).forEach((c) => io.observe(c));
  // Počítadlo ve figuře bez data-zpv-anim: figura se neanimuje → konečná hodnota hned.
  counts.filter((c) => c.closest('figure.zpv') && !figures.includes(c.closest('figure.zpv')))
    .forEach((c) => { const t = finalText(c); if (t != null) c.textContent = t; });
}

// Samoinicializace: <script type="module" src="src/zp-interact.js"> stačí;
// pojistovny.js může initZpInteract() po překreslení volat znovu.
if (typeof document !== 'undefined' && document.querySelector('main')) {
  const boot = () => { initZpInteract(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
