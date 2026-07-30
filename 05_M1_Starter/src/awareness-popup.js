// Týden zdraví — globální popup. Centrovaný modal s podkladem (backdrop)
// upozorňující na právě probíhající mezinárodní zdravotní den/týden, s
// odkazem na microsite tyden.html. Priorita nad newsletter popupem: je-li
// aktivní awareness-týden, běží tenhle a newsletter se v daném týdnu
// nespustí (initAwarenessPopup vrací, jestli převzal řízení). Dismiss
// per-týden (localStorage), 1× za návštěvu. Zobrazí se prakticky ihned po
// příchodu na stránku (SHOW_DELAY_MS) — jen tolik, aby proběhla úvodní
// vykreslovací práce (nav, brand mark) předtím, než se karta objeví.
// Vzor: newsletter-popup.js. Viz PLAN-TYDNY-ZDRAVI.md.

import { activeWeekFor, announceWeekFor, formatRange } from './awareness-core.js';

const STORAGE_KEY = 'zdrave-cesko/aw-popup';   // { [weekId]: dismissedAt }
const SESSION_KEY = 'zdrave-cesko/aw-popup-session';
const SHOW_DELAY_MS = 300;

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

/**
 * Texty popupu pro daný režim. Režim 'announce' (před startem týdne) má
 * vlastní stavový klíč — dismiss ohlášení tedy NEumlčí ostrý popup, který
 * se od prvního dne týdne ukáže znovu.
 */
export function popupVariant(week, mode) {
  const p = week.popup || {};
  // CTA vždy s ?id= — bez něj by tyden.html (resolveWeek) mohl při překryvu
  // ohlašovacího okna s jiným nadcházejícím týdnem otevřít nesprávný obsah.
  const href = `tyden.html?id=${encodeURIComponent(week.id)}`;
  if (mode === 'announce') {
    return {
      stateKey: `${week.id}:announce`,
      headline: p.announce_headline || `Blíží se ${week.observance || 'Týden zdraví'}`,
      body: p.announce_body || p.body || week.lead || '',
      cta: p.announce_cta || 'Podívat se, co chystáme',
      range: formatRange(week),
      href,
    };
  }
  return {
    stateKey: week.id,
    headline: p.headline || week.title || '',
    body: p.body || week.lead || '',
    cta: p.cta || 'Otevřít týden',
    range: null,
    href,
  };
}

function showPopup(week, variant) {
  if (document.getElementById('awPopup')) return;
  const wrap = document.createElement('aside');
  wrap.id = 'awPopup';
  wrap.className = 'aw-popup';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', week.observance || 'Týden zdraví');
  wrap.innerHTML = `
    <div class="aw-popup-card">
      <button type="button" class="aw-popup-close" aria-label="Zavřít upozornění">&times;</button>
      <div class="ed-kicker">${escapeText(week.kicker || 'Týden zdraví')}</div>
      <p class="aw-popup-h">${escapeText(variant.headline)}</p>
      <p class="aw-popup-lead">${escapeText(variant.body)}</p>
      ${variant.range ? `<p class="aw-popup-range">${escapeText(variant.range)}</p>` : ''}
      <a class="aw-popup-cta" href="${escapeText(variant.href)}">${escapeText(variant.cta)}</a>
    </div>`;
  document.body.appendChild(wrap);
  markSessionShown(variant.stateKey);
  void wrap.offsetWidth;
  wrap.classList.add('aw-popup--visible');

  const close = () => {
    writeDismissed(variant.stateKey);
    wrap.classList.remove('aw-popup--visible');
    document.removeEventListener('keydown', onKey);
    wrap.removeEventListener('click', onBackdropClick);
    setTimeout(() => wrap.remove(), 300);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  // Klik na podklad (mimo kartu) zavírá — stejná konvence jako .modal-backdrop
  // u metodických karet indikátorů (app.js closeModalAndFocus).
  const onBackdropClick = (e) => { if (e.target === wrap) close(); };
  wrap.querySelector('.aw-popup-close').addEventListener('click', close);
  wrap.addEventListener('click', onBackdropClick);
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
    // Ostrý týden má přednost; mimo něj zkusíme okno předběžného ohlášení
    // (announce_from ≤ dnes < start) — kampaň tak může „viset dřív".
    const active = activeWeekFor(today, reg.weeks || []);
    const week = active || announceWeekFor(today, reg.weeks || []);
    if (!week) return false;
    const variant = popupVariant(week, active ? 'active' : 'announce');
    window.__awPopupActive = true; // signál pro newsletter popup, ať mlčí
    if (!shouldShowAwarenessPopup(variant.stateKey, readState(), readSession())) return true;
    window.setTimeout(() => {
      if (shouldShowAwarenessPopup(variant.stateKey, readState(), readSession())) showPopup(week, variant);
    }, SHOW_DELAY_MS);
    return true;
  } catch {
    return false;
  }
}
