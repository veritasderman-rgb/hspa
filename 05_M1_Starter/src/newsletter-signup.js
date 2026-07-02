// Sdílená logika přihlášení k newsletteru (Brevo).
// Používá footer formulář (page-shared.js) i scroll popup (newsletter-popup.js).
//
// E-maily NEjdou z prohlížeče přímo do Brevo API (klíč nesmí být v klientu) —
// POSTují se na vlastní serverless endpoint /api/subscribe (Vercel function,
// viz api/subscribe.js), který kontakt založí v Brevu přes privátní API klíč.

export const NEWSLETTER_ENDPOINT = '/api/subscribe';

/**
 * Odešle e-mail na /api/subscribe. Vrací { ok, message }.
 * Nikdy nevyhazuje — chybové stavy překládá na srozumitelnou českou hlášku,
 * aby ji formuláře mohly rovnou zobrazit ve status řádku.
 *
 * @param {string} email
 * @param {string} source - odkud přihlášení přišlo ('footer' | 'popup'), jen pro evidenci
 */
export async function submitNewsletterSignup(email, source = 'web') {
  try {
    const res = await fetch(NEWSLETTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
    });
    if (res.ok) {
      return {
        ok: true,
        message: 'Hotovo — jste přihlášeni k odběru. Děkujeme!',
      };
    }
    if (res.status === 400) {
      let detail = null;
      try { detail = await res.json(); } catch { /* tělo nemusí být JSON */ }
      return {
        ok: false,
        message: detail?.message || 'E-mail se nepodařilo přihlásit — zkontrolujte prosím adresu.',
      };
    }
    return {
      ok: false,
      message: 'Přihlášení se teď nepovedlo. Zkuste to prosím za chvíli znovu.',
    };
  } catch {
    return {
      ok: false,
      message: 'Nepodařilo se spojit se serverem. Zkuste to prosím za chvíli znovu.',
    };
  }
}
