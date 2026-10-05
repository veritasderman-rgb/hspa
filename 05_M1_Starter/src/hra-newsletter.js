// Tři židle — newsletter popup navázaný na hru (bez časovače).
//
// Herní stránky nespouštějí generický 10s popup (přerušil by tahání
// posuvníků). Místo toho se karta nabídne až po PRVNÍM VERDIKTU a ~15 s bez
// interakce — hráč už něco udělal a text karty na to navazuje: do termínu
// v datech (vyhlaska-hra.json → newsletter_hook.valid_until) slibuje srovnání
// hráčovy vyhlášky se skutečnou, po termínu spadne na obecný herní text.
// Čistá část (gameNewsletterCopy) je testovaná; DOM část je tenká.

import { requestNewsletterPopup } from './newsletter-popup.js';

/** Obecný herní text (po termínu hooku nebo bez hooku v datech). */
export const GENERIC_GAME_COPY = {
  kicker: 'Newsletter',
  headline: 'Hrajete si se systémem, který se každý rok přepisuje',
  lead: 'Pošleme vám, kde se data pohnula a které články vyšly. Maximálně 1× měsíčně, bez sledovacích pixelů.',
  cta: 'Přihlásit se',
};

/**
 * Text karty podle hooku z dat a dnešního dne (YYYY-MM-DD).
 * Hook platí včetně dne valid_until; po něm se použije jeho fallback_*
 * (když chybí, GENERIC_GAME_COPY).
 */
export function gameNewsletterCopy(hook, today = new Date().toISOString().slice(0, 10)) {
  if (!hook || typeof hook !== 'object') return GENERIC_GAME_COPY;
  const valid = typeof hook.valid_until === 'string' && hook.valid_until.length === 10 && today <= hook.valid_until;
  if (valid && hook.headline && hook.lead) {
    return {
      kicker: 'Newsletter · k této hře',
      headline: hook.headline,
      lead: hook.lead,
      cta: hook.cta || GENERIC_GAME_COPY.cta,
    };
  }
  return {
    kicker: GENERIC_GAME_COPY.kicker,
    headline: hook.fallback_headline || GENERIC_GAME_COPY.headline,
    lead: hook.fallback_lead || GENERIC_GAME_COPY.lead,
    cta: GENERIC_GAME_COPY.cta,
  };
}

/**
 * Připraví herní popup. Volající po prvním verdiktu zavolá controller.verdictReady();
 * karta se vysune po idleMs bez interakce na activityEl (input/pointerdown/keydown
 * časovač resetují). Idempotentní: zobrazí nejvýš jednou (dál hlídá
 * newsletter-popup.js — session per varianta, 30 dní, subscribed).
 * @returns {{verdictReady: () => void, dispose: () => void}}
 */
export function armGameNewsletter({ hook = null, idleMs = 15000, activityEl = null, timers = globalThis } = {}) {
  let timer = null;
  let armed = false;
  let done = false;
  const el = activityEl || (typeof document !== 'undefined' ? document : null);
  const events = ['input', 'pointerdown', 'keydown'];

  const fire = () => {
    timer = null;
    if (done) return;
    done = true;
    unlisten();
    requestNewsletterPopup({ variant: 'hra', copy: gameNewsletterCopy(hook), source: 'popup-hra' });
  };
  const reset = () => {
    if (done || !armed) return;
    if (timer) timers.clearTimeout(timer);
    timer = timers.setTimeout(fire, idleMs);
  };
  const listen = () => { if (el) events.forEach(ev => el.addEventListener(ev, reset, { passive: true })); };
  const unlisten = () => { if (el) events.forEach(ev => el.removeEventListener(ev, reset)); };

  return {
    verdictReady() {
      if (armed || done) return;
      armed = true;
      listen();
      reset();
    },
    dispose() {
      done = true;
      if (timer) timers.clearTimeout(timer);
      unlisten();
    },
  };
}
