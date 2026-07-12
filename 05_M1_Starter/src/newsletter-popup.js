// Newsletter popup — nenápadná rohová karta vpravo dole, která se vysune
// po ~10 sekundách strávených na stránce. Reuse Brevo endpointu z footeru
// (/api/subscribe, viz newsletter-signup.js).
// Návrh viz BACKLOG B-39: časový trigger, rohová karta, všechny stránky,
// návrat po 30 dnech, jedno zobrazení na návštěvu.

import { submitNewsletterSignup } from './newsletter-signup.js';

const STORAGE_KEY = 'zdrave-cesko/nl-popup';
const SESSION_KEY = 'zdrave-cesko/nl-popup-session';
const DISMISS_DAYS = 30;
const SHOW_DELAY_MS = 10000; // po ~10 s na stránce nabídneme newsletter

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(patch) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    // localStorage nedostupné (privátní režim) — popup se příště zobrazí znovu
  }
}

/**
 * Čistá funkce: má se popup zobrazit? Testovatelná bez DOM.
 *   - subscribed → nikdy znovu
 *   - dismissed před méně než 30 dny → ne
 *   - už zobrazen v této návštěvě (session) → ne
 *   - jinak ano
 */
export function shouldShowPopup(state = {}, now = Date.now(), session = {}) {
  if (session && session.shown) return false;
  if (state && state.subscribed) return false;
  if (state && typeof state.dismissedAt === 'number'
      && now - state.dismissedAt < DISMISS_DAYS * 86400000) {
    return false;
  }
  return true;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markSessionShown() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ shown: true }));
  } catch {
    // sessionStorage nedostupné — popup se může na další stránce ukázat znovu
  }
}

/**
 * Je footer newsletter blok (aspoň částečně) ve viewportu? Když ano, popup
 * nemá smysl — duplikoval by formulář, který už uživatel vidí.
 */
function footerNewsletterVisible() {
  const block = document.querySelector('.newsletter-block');
  if (!block) return false;
  const r = block.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

/**
 * Inicializuje popup: po ~10 s strávených na stránce vysune kartu. Když
 * uživatel v tu chvíli právě vidí footer formulář, popup se nezobrazí
 * (duplicita). Bezpečné pro opakované volání i SSR.
 */
export function initNewsletterPopup() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__nlPopupInit) return;
  window.__nlPopupInit = true;
  if (!shouldShowPopup(readState(), Date.now(), readSession())) return;

  window.setTimeout(() => {
    if (!shouldShowPopup(readState(), Date.now(), readSession())) return;
    // Uživatel právě u patičky vidí stejný formulář inline — popup by ho jen
    // překryl. Nabídku už tedy zaregistroval, tuto stránku přeskočíme.
    if (footerNewsletterVisible()) return;
    showPopup();
  }, SHOW_DELAY_MS);
}

function showPopup() {
  if (document.getElementById('nlPopup')) return;

  const wrap = document.createElement('aside');
  wrap.id = 'nlPopup';
  wrap.className = 'nl-popup';
  wrap.setAttribute('aria-label', 'Přihlášení k newsletteru');
  wrap.innerHTML = `
    <div class="nl-popup-card">
      <button type="button" class="nl-popup-close" aria-label="Zavřít nabídku newsletteru">&times;</button>
      <div class="ed-kicker">Newsletter</div>
      <p class="nl-popup-h">Co se v dashboardu hýbe — bez spamu</p>
      <p class="nl-popup-lead">Krátký přehled novinek: které články vyšly a kde se data změnila. Maximálně 1× měsíčně, bez sledovacích pixelů.</p>
      <form class="nl-popup-form">
        <label for="nlPopupEmail" class="sr-only">E-mail</label>
        <input type="email" id="nlPopupEmail" name="email" placeholder="vase@email.cz" autocomplete="email" required>
        <button type="submit" class="nl-popup-submit">Přihlásit se</button>
      </form>
      <label class="nl-popup-consent">
        <input type="checkbox" id="nlPopupConsent" required>
        <span>Souhlasím se zasíláním novinek a se zpracováním e-mailu výhradně pro tento účel.</span>
      </label>
      <p class="nl-popup-status" role="status" aria-live="polite"></p>
    </div>`;

  document.body.appendChild(wrap);
  document.body.classList.add('nl-popup-open');
  markSessionShown(); // max 1 zobrazení na návštěvu (session)
  void wrap.offsetWidth; // vynutí reflow, aby slide-in transition spolehlivě naběhla
  wrap.classList.add('nl-popup--visible');

  let closed = false;
  // persist=false → tiché skrytí bez zápisu dismissedAt (popup nezavřel
  // uživatel, jen doscrolloval k footer formuláři — 30denní stopka by
  // trestala bez jeho rozhodnutí).
  const close = (subscribed, persist = true) => {
    if (closed) return;
    closed = true;
    if (persist) writeState(subscribed ? { subscribed: true } : { dismissedAt: Date.now() });
    footerObserver?.disconnect();
    wrap.classList.remove('nl-popup--visible');
    document.body.classList.remove('nl-popup-open');
    document.removeEventListener('keydown', onKey);
    let removed = false;
    const remove = () => { if (!removed) { removed = true; wrap.remove(); } };
    wrap.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 600); // fallback (prefers-reduced-motion: žádná transition)
  };

  // Jakmile uživatel doscrolluje k footer newsletteru, popup se tiše uklidí —
  // dva identické formuláře přes sebe jsou matoucí.
  let footerObserver = null;
  const footerBlock = document.querySelector('.newsletter-block');
  if (footerBlock && typeof IntersectionObserver !== 'undefined') {
    footerObserver = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) close(false, false);
    }, { threshold: 0.2 });
    footerObserver.observe(footerBlock);
  }

  const onKey = (e) => { if (e.key === 'Escape') close(false); };
  document.addEventListener('keydown', onKey);
  wrap.querySelector('.nl-popup-close').addEventListener('click', () => close(false));

  const form = wrap.querySelector('.nl-popup-form');
  const consent = wrap.querySelector('#nlPopupConsent');
  const status = wrap.querySelector('.nl-popup-status');
  const submitBtn = form.querySelector('.nl-popup-submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!consent.checked) {
      status.textContent = 'Pro přihlášení potřebujeme váš souhlas se zpracováním e-mailu.';
      status.dataset.tone = 'error';
      consent.focus();
      return;
    }
    const email = wrap.querySelector('#nlPopupEmail')?.value?.trim();
    if (!email) return;
    status.textContent = 'Přihlašujeme…';
    status.dataset.tone = 'info';
    submitBtn.disabled = true;
    const result = await submitNewsletterSignup(email, 'popup');
    status.textContent = result.message;
    status.dataset.tone = result.ok ? 'info' : 'error';
    if (result.ok) {
      // subscribed → popup se už nikdy neukáže; karta se po chvíli uklidí.
      writeState({ subscribed: true });
      setTimeout(() => close(true), 3000);
    } else {
      submitBtn.disabled = false; // chyba → nechat uživatele zkusit znovu
    }
  });
}
