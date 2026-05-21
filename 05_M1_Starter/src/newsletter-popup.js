// Newsletter popup — nenápadná rohová karta vpravo dole, která se vysune
// po doscrollování 55 % stránky. Reuse MailerLite endpointu z footeru.
// Návrh viz BACKLOG B-39: scroll trigger, rohová karta, všechny stránky,
// návrat po 30 dnech, jedno zobrazení na návštěvu.

const STORAGE_KEY = 'zdrave-cesko/nl-popup';
const DISMISS_DAYS = 30;
const SCROLL_TRIGGER = 0.55;
const MAILERLITE_ACTION =
  'https://assets.mailerlite.com/jsonp/2206303/forms/186842930008294691/subscribe';

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
 *   - jinak ano
 */
export function shouldShowPopup(state = {}, now = Date.now()) {
  if (state && state.subscribed) return false;
  if (state && typeof state.dismissedAt === 'number'
      && now - state.dismissedAt < DISMISS_DAYS * 86400000) {
    return false;
  }
  return true;
}

/**
 * Inicializuje popup: navěsí scroll listener, který po doscrollování
 * SCROLL_TRIGGER vykreslí kartu. Bezpečné pro opakované volání i SSR.
 */
export function initNewsletterPopup() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__nlPopupInit) return;
  window.__nlPopupInit = true;
  if (!shouldShowPopup(readState())) return;

  let armed = true;
  const onScroll = () => {
    if (!armed) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable < 200) return; // příliš krátká stránka — netriggerovat
    const ratio = (window.scrollY || doc.scrollTop || 0) / scrollable;
    if (ratio >= SCROLL_TRIGGER) {
      armed = false;
      window.removeEventListener('scroll', onScroll);
      showPopup();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
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
      <form class="nl-popup-form" action="${MAILERLITE_ACTION}" method="post" target="_blank">
        <label for="nlPopupEmail" class="sr-only">E-mail</label>
        <input type="email" id="nlPopupEmail" name="fields[email]" placeholder="vase@email.cz" autocomplete="email" required>
        <input type="hidden" name="ml-submit" value="1">
        <input type="hidden" name="anticsrf" value="true">
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
  void wrap.offsetWidth; // vynutí reflow, aby slide-in transition spolehlivě naběhla
  wrap.classList.add('nl-popup--visible');

  let closed = false;
  const close = (subscribed) => {
    if (closed) return;
    closed = true;
    writeState(subscribed ? { subscribed: true } : { dismissedAt: Date.now() });
    wrap.classList.remove('nl-popup--visible');
    document.body.classList.remove('nl-popup-open');
    document.removeEventListener('keydown', onKey);
    let removed = false;
    const remove = () => { if (!removed) { removed = true; wrap.remove(); } };
    wrap.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 600); // fallback (prefers-reduced-motion: žádná transition)
  };

  const onKey = (e) => { if (e.key === 'Escape') close(false); };
  document.addEventListener('keydown', onKey);
  wrap.querySelector('.nl-popup-close').addEventListener('click', () => close(false));

  const form = wrap.querySelector('.nl-popup-form');
  const consent = wrap.querySelector('#nlPopupConsent');
  const status = wrap.querySelector('.nl-popup-status');
  form.addEventListener('submit', (e) => {
    if (!consent.checked) {
      e.preventDefault();
      status.textContent = 'Pro přihlášení potřebujeme váš souhlas se zpracováním e-mailu.';
      status.dataset.tone = 'error';
      consent.focus();
      return;
    }
    // Souhlas OK — POST projde do nového okna (MailerLite double opt-in).
    status.textContent = 'Hotovo — v novém okně potvrďte přihlášení. Děkujeme!';
    status.dataset.tone = 'info';
    form.querySelector('.nl-popup-submit').disabled = true;
    writeState({ subscribed: true });
    setTimeout(() => close(true), 3500);
  });
}
