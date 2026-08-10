// Vedra — sezónní globální popup. Centrovaný modal (vizuálně sdílí .aw-popup
// komponentu s Týdny zdraví) upozorňující v letním okně na servisní stránku
// vedra.html. Okno a texty řídí redakce v data/vedra-popup.json — kód se při
// změně kampaně needituje.
//
// Priorita: aktivní Týden zdraví (awareness-popup) > vedra > newsletter.
// Volající (page-shared.js) spouští initVedraPopup jen když awareness popup
// nepřevzal řízení; tento modul nastavuje window.__vedraPopupActive, podle
// kterého mlčí newsletter popup (newsletter-popup.js).
//
// Dismiss per kampaň (localStorage, klíč from..to): zavření letos neumlčí
// popup příští léto, kdy redakce posune okno. 1× za návštěvu (sessionStorage).
// Na samotné stránce vedra.html se nezobrazuje (uživatel už je tam).
// Vzor: awareness-popup.js.

const STORAGE_KEY = 'zdrave-cesko/vedra-popup';   // { [campaignId]: dismissedAt }
const SESSION_KEY = 'zdrave-cesko/vedra-popup-session';
const SHOW_DELAY_MS = 300;

function readState() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function writeDismissed(campaignId) {
  try {
    const s = readState(); s[campaignId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* privátní režim */ }
}
function readSession() {
  try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function markSessionShown(campaignId) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ shown: campaignId })); }
  catch { /* noop */ }
}

/**
 * Je dnešek uvnitř kampaňového okna? (čistá, testovatelná)
 * from/to jsou YYYY-MM-DD, obě meze včetně; chybějící/rozbitá konfigurace → ne.
 */
export function isVedraWindow(cfg, today) {
  if (!cfg || cfg.enabled !== true) return false;
  if (typeof cfg.from !== 'string' || typeof cfg.to !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.from) || !/^\d{4}-\d{2}-\d{2}$/.test(cfg.to)) return false;
  return cfg.from <= today && today <= cfg.to;
}

/** Stavový klíč kampaně — dismiss váže na konkrétní okno, ne na popup obecně. */
export function vedraCampaignId(cfg) {
  return `${cfg.from}..${cfg.to}`;
}

/**
 * Má se popup zobrazit? (čistá, testovatelná — zrcadlí shouldShowAwarenessPopup)
 *   - už zavřený pro tuto kampaň → ne (mlčí do konce okna)
 *   - už zobrazený v této návštěvě → ne
 *   - jinak ano
 */
export function shouldShowVedraPopup(campaignId, state = {}, session = {}) {
  if (!campaignId) return false;
  if (session && session.shown === campaignId) return false;
  if (state && state[campaignId]) return false;
  return true;
}

function escapeText(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function showPopup(cfg, campaignId) {
  if (document.getElementById('vdPopup') || document.getElementById('awPopup')) return;
  const wrap = document.createElement('aside');
  wrap.id = 'vdPopup';
  wrap.className = 'aw-popup';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Průvodce vedry');
  wrap.innerHTML = `
    <div class="aw-popup-card">
      <button type="button" class="aw-popup-close" aria-label="Zavřít upozornění">&times;</button>
      <div class="ed-kicker">${escapeText(cfg.kicker || 'Vedra')}</div>
      <p class="aw-popup-h">${escapeText(cfg.headline || 'Jak zvládnout vedra ve zdraví')}</p>
      <p class="aw-popup-lead">${escapeText(cfg.body || '')}</p>
      <a class="aw-popup-cta" href="vedra.html">${escapeText(cfg.cta || 'Otevřít průvodce vedry')}</a>
    </div>`;
  document.body.appendChild(wrap);
  markSessionShown(campaignId);
  void wrap.offsetWidth;
  wrap.classList.add('aw-popup--visible');

  const close = () => {
    writeDismissed(campaignId);
    wrap.classList.remove('aw-popup--visible');
    document.removeEventListener('keydown', onKey);
    wrap.removeEventListener('click', onBackdropClick);
    setTimeout(() => wrap.remove(), 300);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onBackdropClick = (e) => { if (e.target === wrap) close(); };
  wrap.querySelector('.aw-popup-close').addEventListener('click', close);
  wrap.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onKey);
}

/**
 * Zkusí zobrazit vedra popup. Vrací Promise<boolean> — true, pokud převzal
 * řízení (aktivní kampaň), takže newsletter popup má mlčet. Volat až po
 * awareness popupu (viz page-shared.js).
 */
export async function initVedraPopup() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__vdPopupInit) return window.__vedraPopupActive === true;
  window.__vdPopupInit = true;
  if (location.pathname.includes('vedra.html')) return false;
  try {
    const cfg = await fetch('data/vedra-popup.json').then(r => r.json());
    const today = new Date().toISOString().slice(0, 10);
    if (!isVedraWindow(cfg, today)) return false;
    const campaignId = vedraCampaignId(cfg);
    window.__vedraPopupActive = true; // signál pro newsletter popup, ať mlčí
    if (!shouldShowVedraPopup(campaignId, readState(), readSession())) return true;
    window.setTimeout(() => {
      // Awareness popup mohl mezitím převzít řízení (asynchronní závod) —
      // dvojí modal přes sebe nikdy; awareness má přednost.
      if (window.__awPopupActive) return;
      if (shouldShowVedraPopup(campaignId, readState(), readSession())) showPopup(cfg, campaignId);
    }, SHOW_DELAY_MS);
    return true;
  } catch {
    return false;
  }
}
