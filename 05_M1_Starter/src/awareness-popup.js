// Týden zdraví — globální popup. Rohová karta (vpravo dole) upozorňující na
// právě probíhající mezinárodní zdravotní den/týden, s odkazem na microsite
// tyden.html. Priorita nad newsletter popupem: je-li aktivní awareness-týden,
// běží tenhle a newsletter se v daném týdnu nespustí (initAwarenessPopup vrací,
// jestli převzal řízení). Dismiss per-týden (localStorage), 1× za návštěvu.
// Vzor: newsletter-popup.js. Viz PLAN-TYDNY-ZDRAVI.md.

import { activeWeekFor } from './awareness-core.js';

const STORAGE_KEY = 'zdrave-cesko/aw-popup';   // { [weekId]: dismissedAt }
const SESSION_KEY = 'zdrave-cesko/aw-popup-session';
const SHOW_DELAY_MS = 6000;

function readState() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function writeDismissed(weekId) {
  try {
    const s = readState(); s[weekId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* privátní režim */ }
}
function readSession() {
  try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function markSessionShown(weekId) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ shown: weekId })); }
  catch { /* noop */ }
}

/**
 * Má se popup pro daný týden zobrazit? (čistá, testovatelná)
 *   - už zavřený (jakýkoli dismiss pro tento weekId) → ne (mlčí do konce týdne)
 *   - už zobrazený v této návštěvě → ne
 *   - jinak ano
 */
export function shouldShowAwarenessPopup(weekId, state = {}, session = {}) {
  if (!weekId) return false;
  if (session && session.shown === weekId) return false;
  if (state && state[weekId]) return false;
  return true;
}

function showPopup(week) {
  if (document.getElementById('awPopup')) return;
  const wrap = document.createElement('aside');
  wrap.id = 'awPopup';
  wrap.className = 'aw-popup';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', week.observance || 'Týden zdraví');
  const p = week.popup || {};
  wrap.innerHTML = `
    <div class="aw-popup-card">
      <button type="button" class="aw-popup-close" aria-label="Zavřít upozornění">&times;</button>
      <div class="ed-kicker">${escapeText(week.kicker || 'Týden zdraví')}</div>
      <p class="aw-popup-h">${escapeText(p.headline || week.title || '')}</p>
      <p class="aw-popup-lead">${escapeText(p.body || week.lead || '')}</p>
      <a class="aw-popup-cta" href="tyden.html">${escapeText(p.cta || 'Otevřít týden')}</a>
    </div>`;
  document.body.appendChild(wrap);
  markSessionShown(week.id);
  void wrap.offsetWidth;
  wrap.classList.add('aw-popup--visible');

  const close = () => {
    writeDismissed(week.id);
    wrap.classList.remove('aw-popup--visible');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 300);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  wrap.querySelector('.aw-popup-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
}

function escapeText(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Zkusí zobrazit awareness popup. Vrací Promise<boolean> — true, pokud převzal
 * řízení (je aktivní týden), takže volající nemá spouštět newsletter popup.
 * Na stránce microsite (tyden.html) se popup nezobrazuje (uživatel už je tam).
 */
export async function initAwarenessPopup() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__awPopupInit) return window.__awPopupActive === true;
  window.__awPopupInit = true;
  if (location.pathname.includes('tyden.html')) return false;
  try {
    const reg = await fetch('data/awareness-weeks.json').then(r => r.json());
    const today = new Date().toISOString().slice(0, 10);
    const week = activeWeekFor(today, reg.weeks || []);
    if (!week) return false;
    window.__awPopupActive = true; // signál pro newsletter popup, ať mlčí
    if (!shouldShowAwarenessPopup(week.id, readState(), readSession())) return true;
    window.setTimeout(() => {
      if (shouldShowAwarenessPopup(week.id, readState(), readSession())) showPopup(week);
    }, SHOW_DELAY_MS);
    return true;
  } catch {
    return false;
  }
}
