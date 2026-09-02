// Progresivní vylepšení okresních stránek pohotovostí (pohotovost-*.html).
//
// Stránky generuje scripts/build-pohotovosti-okresy.js STATICKY — adresy,
// telefony a rozpisy jsou v HTML a fungují bez JavaScriptu. Tenhle modul
// jen dokresluje, co statika neumí: navigaci, patičku a živý stav
// „teď otevřeno / otevírá v…“ z rozpisu zapečeného v data-hours.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter } from './page-shared.js';
import { evaluateStatus } from './pohotovosti-engine.js';

function liveBadges() {
  const now = new Date();
  for (const el of document.querySelectorAll('.pokr-place')) {
    const target = el.querySelector('.pokr-live');
    if (!target) continue;
    let hours = null;
    try {
      hours = JSON.parse(el.dataset.hours || 'null');
    } catch { /* rozbitý atribut = žádný badge, statika platí dál */ }
    if (!hours) continue;
    const st = evaluateStatus(hours, now);
    if (st.state === 'open') {
      target.textContent = st.nonstop ? '· teď otevřeno (nepřetržitě)' : `· teď otevřeno${st.until ? ` do ${st.until}` : ''}`;
      target.className = 'pokr-live pokr-live-open';
    } else if (st.state === 'closed') {
      target.textContent = st.next ? `· teď zavřeno, otevírá ${st.next}` : '· teď zavřeno';
      target.className = 'pokr-live pokr-live-closed';
    } else {
      return; // unknown: neříkat nic je poctivější než hádat
    }
    target.hidden = false;
  }
}

/** Offline: tentýž service worker jako hlavní stránka (sw-pohotovosti.js). */
function registerOffline() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register(
      new URL('../sw-pohotovosti.js', import.meta.url).pathname,
      { scope: new URL('../pohotovost', import.meta.url).pathname },
    ).catch(() => {});
  } catch {
    // Bez service workeru stránka funguje dál, jen ne offline.
  }
}

if (typeof window !== 'undefined') {
  renderModuleNav();
  renderMastheadDate();
  renderFooter();
  liveBadges();
  registerOffline();
  // Přes půlnoc a přes hranici otevírací doby se stav mění i bez reloadu.
  setInterval(liveBadges, 60_000);
}
