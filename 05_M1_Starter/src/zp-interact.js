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
//
// Kontrakt (třídy, atributy, události) je shrnutý v hlavičce CSS sekce
// „Srovnávač pojišťoven: interakce“ v src/styles.css a v tests/zp-interact.test.js.

import { formatNumberCz } from './page-shared.js';

export const STORAGE_KEY = 'hspa-moje-zp';
export const MOJE_EVENT = 'zp:moje-change';
export const HOVER_PREFIX = 'zpi-hover-';
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
      else tr.removeAttribute('aria-current');
    });
    main.querySelectorAll('.zpv-mark[data-zp], tr[data-zp]').forEach((el) => {
      el.classList.toggle('is-moje', !!kod && el.getAttribute('data-zp') === kod);
    });
    doc.querySelectorAll('.zpi-chip[data-zp]').forEach((b) => {
      b.setAttribute('aria-pressed', kod && b.getAttribute('data-zp') === kod ? 'true' : 'false');
    });
    doc.querySelectorAll('.zpi-chip--clear').forEach((b) => { b.disabled = !kod; });
  };

  const setMoje = (kod) => {
    const valid = kod != null && normalizeZpList(chipsList).some((z) => z.kod === kod) ? kod : null;
    writeMojeZp(valid);
    syncMoje(valid);
    doc.dispatchEvent(new win.CustomEvent(MOJE_EVENT, { bubbles: true, detail: { kod: valid } }));
  };

  const current = first ? readMojeZp(defaultStorageOf(win)) : main.getAttribute('data-moje-zp');
  syncMoje(current);

  // ---- globální (jednou na dokument/main) ---------------------------------
  if (first) {
    main.dataset.zpiInit = '1';
    bindDelegates(main, doc, win);
    if (current) doc.dispatchEvent(new win.CustomEvent(MOJE_EVENT, { bubbles: true, detail: { kod: current, initial: true } }));
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
  return loadZpList().then((list) => {
    chipsList = list;
    renderMojeZpChips(container, list, main.getAttribute('data-moje-zp'));
  });
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
    if (t.classList.contains('zpi-expand-all')) {
      main.querySelectorAll('details').forEach((d) => { d.open = true; });
      return;
    }
    if (t.classList.contains('zpv-sort')) sortHeat(t);
  });
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
