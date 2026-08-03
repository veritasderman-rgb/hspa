// Sdílené komponenty napříč stránkami: navigační lišta mezi moduly.

import { getSiteStats, applyDataStats } from './site-stats.js';
import { initSiteSearch } from './search.js';
import { initNewsletterPopup } from './newsletter-popup.js';
import { initAwarenessPopup } from './awareness-popup.js';
import { submitNewsletterSignup } from './newsletter-signup.js';

/* ── Dark mode: brzká inicializace tématu ───────────────────────────────
   Nastaví data-theme z uložené volby co nejdřív (při načtení modulu), aby
   uživatelé s ručně zapnutým tmavým režimem viděli minimum probliknutí.
   Výchozí je VŽDY světlý motiv — systémové prefers-color-scheme se
   záměrně nesleduje; tmavý se zapíná jen ručním toggle. */
export const THEME_KEY = 'hspa-theme';
(function initThemeEarly() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (_) { /* private mode / no storage → výchozí světlý motiv */ }
})();

/** Aktuální efektivní téma ('dark' | 'light'). Výchozí je vždy 'light';
   'dark' jen když si ho uživatel ručně zapnul (data-theme="dark").
   Systémové prefers-color-scheme se záměrně nesleduje. */
export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

const THEME_ICON = {
  dark: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.03-.92-.1-1.36a5.5 5.5 0 0 1-7.54-7.54C12.92 3.03 12.46 3 12 3z"/></svg>',
  light: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5v2m0 16v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m16 0h2M4.2 19.8l1.4-1.4M17.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
};

/** HTML přepínače tématu do nav lišty. */
export function themeToggleHtml() {
  const eff = currentTheme();
  const next = eff === 'dark' ? 'light' : 'dark';
  return `<button type="button" class="theme-toggle" aria-label="Přepnout na ${next === 'dark' ? 'tmavý' : 'světlý'} režim" aria-pressed="${eff === 'dark'}" title="Přepnout světlý/tmavý režim">${eff === 'dark' ? THEME_ICON.light : THEME_ICON.dark}</button>`;
}

/** Naváže VŠECHNY přepínače tématu (desktop nav i mobilní drawer) — třídou, ne id,
   aby fungoval i na mobilu. Klik přepne data-theme, uloží volbu a synchronizuje
   ikonu/aria na všech instancích. */
export function wireThemeToggle() {
  const btns = document.querySelectorAll('.theme-toggle');
  if (!btns.length) return;
  const sync = () => {
    const eff = currentTheme();
    const nextNext = eff === 'dark' ? 'light' : 'dark';
    btns.forEach(b => {
      b.setAttribute('aria-pressed', String(eff === 'dark'));
      b.setAttribute('aria-label', `Přepnout na ${nextNext === 'dark' ? 'tmavý' : 'světlý'} režim`);
      b.innerHTML = eff === 'dark' ? THEME_ICON.light : THEME_ICON.dark;
    });
  };
  btns.forEach(b => {
    if (b.dataset.wired === '1') return;
    b.dataset.wired = '1';
    b.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* ignore */ }
      sync();
    });
  });
  sync();
}

/** Kanonická doména webu (sjednoceno s handle sociálních sítí). */
export const SITE_URL = 'https://skorezdravotnictvi.cz';

/**
 * Oficiální profily projektu na sociálních sítích. Jediný zdroj pravdy —
 * používá se v patičce, na stránce „O projektu", v JSON-LD `sameAs`
 * i ve sdílecím pásku pod články.
 */
export const SOCIAL_LINKS = [
  { id: 'facebook', label: 'Facebook', handle: 'Skóre zdravotnictví Česko', url: 'https://www.facebook.com/profile.php?id=61590403735200' },
  { id: 'x', label: 'X', handle: '@SkoreZdravko', url: 'https://x.com/SkoreZdravko' },
  { id: 'instagram', label: 'Instagram', handle: '@skorezdravotnictvi', url: 'https://www.instagram.com/skorezdravotnictvi/' },
];

/** Inline SVG ikony sítí (monochrom, `currentColor`) — bez externích fontů/skriptů. */
export const SOCIAL_ICONS = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.24 2H21.5l-7.1 8.12L22.9 22h-6.6l-5.17-6.77L5.2 22H1.94l7.6-8.69L1.5 2h6.77l4.67 6.18L18.24 2zm-1.16 18h1.8L7.02 3.9H5.1l11.98 16.1z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.81s-.01 3.54-.07 4.81c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.81s.01-3.54.07-4.81c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.14 0-3.5.01-4.74.07-.9.04-1.38.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.33-.28.81-.32 1.71C3.21 9.18 3.2 9.53 3.2 12s.01 2.82.07 4.07c.04.9.19 1.38.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.33.13.81.28 1.71.32 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.38-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.33.28-.81.32-1.71.06-1.25.07-1.6.07-4.07s-.01-2.82-.07-4.07c-.04-.9-.19-1.38-.32-1.71a2.86 2.86 0 0 0-.69-1.06 2.86 2.86 0 0 0-1.06-.69c-.33-.13-.81-.28-1.71-.32C15.5 4.01 15.14 4 12 4zm0 3.05A4.95 4.95 0 1 0 12 17a4.95 4.95 0 0 0 0-9.95zm0 1.8a3.15 3.15 0 1 1 0 6.3 3.15 3.15 0 0 1 0-6.3zm5.15-.55a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z"/></svg>',
};

/** Vyrenderuje řadu odkazů na oficiální profily (sdílené patičkou i „O projektu"). */
export function socialLinksHtml() {
  return SOCIAL_LINKS.map(s =>
    `<a class="social-link" href="${s.url}" target="_blank" rel="me noopener" aria-label="${s.label} — ${s.handle} (otevře se v novém okně)" title="${s.label}: ${s.handle}">${SOCIAL_ICONS[s.id] ?? ''}<span class="social-link-label">${s.label}</span></a>`
  ).join('');
}

/**
 * Vloží do <head> JSON-LD `Organization` se `sameAs` na oficiální profily.
 * Říká vyhledávačům, že tyhle účty jsou naše. Idempotentní, běží na každé
 * stránce (z renderModuleNav).
 */
export function injectOrgSchema() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('orgSchemaLd')) return;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HSPA Monitor',
    alternateName: 'Skóre zdravotnictví',
    url: SITE_URL + '/',
    logo: SITE_URL + '/assets/brand/og-default.png',
    sameAs: SOCIAL_LINKS.map(s => s.url),
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'orgSchemaLd';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Vrátí `true`, pokud má článek být veřejně viditelný v daný okamžik.
 *
 * Pravidlo „publish at 6:00":
 *   - `published === false` → vždy false (draft)
 *   - `date` (YYYY-MM-DD) v budoucnu → false (zatím nesmí ven)
 *   - `date` dnes, ale teprve před 06:00 lokálního času → false (čeká na ranní release)
 *   - `date` v minulosti nebo dnes po 06:00 → true
 *
 * Datum se interpretuje v lokálním čase (cs-CZ), 06:00 jako vyhlášený
 * editorial deadline. Pokud `date` chybí, považujeme článek za publikovaný
 * (zachovává zpětnou kompatibilitu se staršími záznamy).
 *
 * @param {Object} article - záznam z data/articles.json
 * @param {Date} [now=new Date()] - lokální čas pro testy
 * @returns {boolean}
 */
export function isArticleVisible(article, now = new Date()) {
  if (!article || article.published === false) return false;
  const ds = article.date || article.published_at || article.scheduled_for;
  if (!ds) return true;
  // Construct local 06:00 of the article's date
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ds));
  if (!m) return true; // neparsovatelné datum → publikováno (legacy fallback)
  const release = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 6, 0, 0, 0);
  return now.getTime() >= release.getTime();
}

/** Pomocný filter pro pole článků. */
export function filterVisibleArticles(articles, now = new Date()) {
  return (articles ?? []).filter(a => isArticleVisible(a, now));
}

/**
 * Vrátí TL;DR text indikátoru/strategie/explaineru. Dříve respektoval
 * persona switcher (Veřejnost/Odborník/Politik), který byl odstraněn —
 * nyní vždy preferuje tldr_public s fallbackem na expert/tldr.
 */
export function audienceText(obj) {
  if (!obj) return '';
  return obj.tldr_public ?? obj.tldr_expert ?? obj.tldr ?? '';
}

/**
 * Jednotné odvození verifikačního stavu indikátoru pro odznak — sdílené napříč
 * detailem indikátoru (indicator.js) i přehledem (app.js), aby byl stav
 * konzistentní (dříve měl každý pohled vlastní, rozcházející se logiku).
 *
 * Priorita: explicitní `verification_status` z dat (metodická karta) → odvození
 * z původu hodnoty. `verified` je vyhrazen pro hodnoty s explicitním `verified`
 * (redakčně ověřené z primárního zdroje); samotný `origin: live` znamená
 * „předběžné" (z fetcheru, metodika neprošla verifikací), `origin: seed`
 * znamená „ilustrativní" (modelová hodnota M1). Neznámé/rozpracované statusy
 * (review-pending, needs_verification) → 'preliminary', aby se nikdy
 * nevykreslila prázdná pill.
 *
 * @param {{verification_status?: string, source?: {origin?: string}}} ind
 * @returns {'verified'|'preliminary'|'illustrative'|null}
 */
export function resolveVerificationStatus(ind) {
  const explicit = ind?.verification_status;
  if (explicit === 'verified' || explicit === 'preliminary' || explicit === 'illustrative') {
    return explicit;
  }
  if (explicit) return 'preliminary';
  const origin = ind?.source?.origin;
  if (origin === 'seed') return 'illustrative';
  if (origin === 'live') return 'preliminary';
  return null;
}

export const VERIF_TEXT = {
  verified: 'Ověřeno',
  preliminary: 'Předběžné',
  illustrative: 'Ilustrativní',
};
export const VERIF_TITLE = {
  verified: 'Data z primárního zdroje, redakčně ověřená',
  preliminary: 'Data dostupná, metodika v revizi nebo zdroj neprošel plnou verifikací',
  illustrative: 'Modelová/ukázková hodnota (seed) — nepoužívat pro citace, čeká na napojení živého zdroje',
};

/**
 * Sestaví HTML odznaku verifikace, nebo prázdný řetězec, pokud stav není znám.
 * @param {{verification_status?: string, source?: {origin?: string}}} ind
 */
export function verifBadgeHtml(ind) {
  const status = resolveVerificationStatus(ind);
  if (!status) return '';
  const cls = status === 'verified' ? 'verif-verified'
    : status === 'preliminary' ? 'verif-preliminary' : 'verif-illustrative';
  return `<span class="verif-badge ${cls}" title="${VERIF_TITLE[status]}">${VERIF_TEXT[status]} <span class="verif-hint" aria-hidden="true">ⓘ</span></span>`;
}

/**
 * Vyplní datum do hlavičky (masthead-strip) v editorial stylu,
 * a zároveň proběhne render společných page-shared komponent
 * (HSPA score, footer, scroll-to-top), které jsou na každé stránce
 * povinné bez ohledu na to, zda masthead-date span existuje.
 * Příklad: "Pondělí 5. května 2026"
 */
export function renderMastheadDate(el = document.getElementById('mastheadDate')) {
  if (el) {
    const d = new Date();
    const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
    el.textContent = `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  renderHSPAScore();
  renderFooter();
  injectScrollToTop();
}

/**
 * Injectuje fixed scroll-to-top tlačítko do <body>. Zviditelní se po
 * rolování pod prahovou hodnotu (400px). Klik plynule scrolluje nahoru,
 * respektuje prefers-reduced-motion. Idempotent — re-volání nevytvoří
 * duplikát.
 */
export function injectScrollToTop() {
  if (typeof window === 'undefined' || document.getElementById('scrollTopBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'scrollTopBtn';
  btn.className = 'scroll-top-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Zpět nahoru');
  btn.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(btn);

  const THRESHOLD = 400;
  const updateVisible = () => {
    const visible = window.scrollY > THRESHOLD
      && !document.body.classList.contains('mobile-nav-open');
    btn.classList.toggle('visible', visible);
    btn.tabIndex = visible ? 0 : -1;
    btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };
  window.addEventListener('scroll', updateVisible, { passive: true });
  // Také reagujeme na otevření/zavření mobilního drawer (toggle body class)
  const observer = new MutationObserver(updateVisible);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  updateVisible();

  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
}

/**
 * Vyplní sdílenou patičku do elementu #siteFooter na každé stránce.
 */
export function renderFooter(el = document.getElementById('siteFooter')) {
  if (!el) return;
  el.innerHTML = `
    <aside class="newsletter-block" aria-labelledby="newsletterHead">
      <div class="newsletter-inner">
        <div class="ed-kicker">Newsletter</div>
        <h3 class="newsletter-h" id="newsletterHead">Co se v dashboardu hýbe — bez spamu</h3>
        <p class="newsletter-lead">
          Krátký přehled, co je nového: které články vyšly, kde se data změnila, na čem se v projektu pracuje. Maximálně 1× měsíčně. Bez sledovacích pixelů, bez sdílení s třetími stranami.
        </p>

        <!--
          Brevo — kontakt zakládá vlastní serverless endpoint /api/subscribe
          (api/subscribe.js), který volá Brevo API s privátním klíčem
          (BREVO_API_KEY v env Vercelu). Formulář POSTuje fetchem, výsledek
          se ukazuje inline ve status řádku — žádné nové okno, žádný
          externí script ani iframe.
        -->
        <div class="newsletter-form-slot" id="newsletterSignup">
          <form
            class="newsletter-form"
            id="newsletterForm">
            <label for="nlEmail" class="sr-only">E-mail</label>
            <input
              type="email"
              id="nlEmail"
              name="email"
              placeholder="vase@email.cz"
              autocomplete="email"
              required>
            <button type="submit" class="newsletter-submit">Přihlásit se</button>
          </form>
          <label class="newsletter-consent">
            <input type="checkbox" id="nlConsent" required>
            <span>Souhlasím se zasíláním novinek a se zpracováním e-mailu výhradně pro tento účel.</span>
          </label>
          <p class="newsletter-status" id="newsletterStatus" role="status" aria-live="polite"></p>
        </div>

        <p class="newsletter-foot">
          Rozesílku zajišťuje Brevo; e-mail použijeme jen pro newsletter. Více v <a href="o-projektu.html">O projektu</a>.
        </p>
      </div>
    </aside>

    <div class="row">
      <div>
        <h4 class="footer-col-h">O projektu</h4>
        <p>Občanská implementace OECD HSPA rámce pro ČR. Autor: Josef Pavlovic. Není oficálním portálem MZČR.</p>
        <p><a href="o-projektu.html">Metodika, zdroje a disclaimer →</a></p>
      </div>
      <div>
        <h4 class="footer-col-h">Data a otevřenost</h4>
        <p>
          <a href="data/indicators.json">indicators.json</a> ·
          <a href="data/regions.json">regions.json</a> ·
          <a href="hspa-prehled.html">Metodické karty</a><br>
          Licence CC-BY 4.0 · Data: ÚZIS, ČSÚ, OECD, Eurostat
        </p>
        <p class="footer-privacy">Web nepoužívá sledovací cookies. Žádné osobní údaje nejsou zpracovávány.</p>
      </div>
      <div>
        <h4 class="footer-col-h">Zpětná vazba</h4>
        <p>
          <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">Nahlásit chybu nebo navrhnout indikátor ↗</a><br>
          <a href="https://github.com/veritasderman-rgb/hspa" target="_blank" rel="noopener">Zdrojový kód (GitHub) ↗</a>
        </p>
      </div>
      <div>
        <h4 class="footer-col-h">Sledujte nás</h4>
        <p>Oficiální profily projektu — aktuální data a články:</p>
        <div class="footer-social">${socialLinksHtml()}</div>
      </div>
    </div>
    <div class="disclaimer">
      Josef Pavlovic · CC-BY 4.0 · Není oficálním portálem MZČR ani OECD ·
      Citujte: Pavlovic, J. (2026). HSPA Monitor. hspa-cesko.cz
    </div>
  `;
  injectScrollToTop();
  wireNewsletterForm();
}

/**
 * Přihlášení k newsletteru: consent gate + fetch na /api/subscribe (Brevo).
 * Native HTML required atribut pokryje validaci e-mailu; my doplňujeme
 * consent gating s přátelskou hláškou a inline výsledek bez nového okna.
 */
function wireNewsletterForm() {
  if (typeof window === 'undefined') return;
  const form = document.getElementById('newsletterForm');
  if (!form || form.dataset.wired === '1') return;
  form.dataset.wired = '1';
  const status = document.getElementById('newsletterStatus');
  const consent = document.getElementById('nlConsent');
  const submitBtn = form.querySelector('.newsletter-submit');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (consent && !consent.checked) {
      if (status) {
        status.textContent = 'Pro přihlášení potřebujeme váš souhlas se zpracováním e-mailu.';
        status.dataset.tone = 'error';
      }
      consent.focus();
      return;
    }
    const email = form.querySelector('#nlEmail')?.value?.trim();
    if (!email) return;
    if (status) {
      status.textContent = 'Přihlašujeme…';
      status.dataset.tone = 'info';
    }
    if (submitBtn) submitBtn.disabled = true;
    const result = await submitNewsletterSignup(email, 'footer');
    if (status) {
      status.textContent = result.message;
      status.dataset.tone = result.ok ? 'info' : 'error';
    }
    if (result.ok) {
      form.reset();
    } else if (submitBtn) {
      submitBtn.disabled = false;
    }
  });
}

/**
 * Spočítá HSPA skóre z indikátorů. Backward-compat re-export ze site-stats.
 * Verified + preliminary indikátory: good=100, warn=50, bad=0, neutral ignorováno.
 * Illustrative indikátory ignorovány úplně.
 */
export { computeScore as computeHSPAScore } from './site-stats.js';

/**
 * Načte indikátory a články, spočítá site-wide statistiky a aplikuje je do DOM
 * — všechny [data-stat="<klíč>"] dostanou hodnoty (totalIndicators, hspaCount,
 * monitoringCount, score, ...). Detaily viz src/site-stats.js.
 */
export function renderHSPAScore() {
  Promise.allSettled([
    fetch('data/indicators.json').then(r => r.ok ? r.json() : null),
    fetch('data/articles.json').then(r => r.ok ? r.json() : null),
  ]).then(([indRes, artRes]) => {
    const indData = indRes.status === 'fulfilled' ? indRes.value : null;
    const artData = artRes.status === 'fulfilled' ? artRes.value : null;
    if (!indData) return;
    const stats = getSiteStats({
      indicators: indData.indicators ?? [],
      articles: artData?.articles ?? [],
    });
    applyDataStats(stats);
  }).catch(() => {});
}

/**
 * Render společné navigační lišty mezi moduly. Volá se z každé stránky,
 * automaticky zvýrazní aktivní záložku podle window.location.pathname.
 *
 * Některé záložky mají `children: [...]` — generuje se dropdown submenu.
 * Active state se propaguje: pokud je aktivní stránka child, parent se
 * zvýrazní jako .active a získá class .module-tab-has-active-child.
 *
 * Dropdown je čistě CSS (hover + focus-within), žádný JS handler.
 * Mobile drawer renderuje submenu inline (children jako siblings parent).
 */
/**
 * Inline SVG značky „HSPA Kompas" pro hlavičku. Inkoustové části dědí barvu
 * textu (`currentColor` = --ink, na tmavém pozadí --paper přes inverzi),
 * červený hrot střelky drží `var(--red)` (= aktuální směr systému, viz
 * docs/visual-components.md „Brand mark"). Stupnice je redukovaná na hlavní
 * rysky — pravidlo škálování pro velikosti 32–48 px.
 */
const BRAND_COMPASS_SVG = `<svg viewBox="0 0 100 100" width="34" height="34" fill="none" aria-hidden="true" focusable="false">
  <circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="3"/>
  <g stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
    <line x1="50" y1="6" x2="50" y2="13" transform="rotate(90 50 50)"/>
    <line x1="50" y1="6" x2="50" y2="13" transform="rotate(180 50 50)"/>
    <line x1="50" y1="6" x2="50" y2="13" transform="rotate(270 50 50)"/>
  </g>
  <polygon points="45,8 55,8 50,16.5" fill="currentColor"/>
  <polygon points="33,79.44 55.2,53 44.8,47" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
  <polygon class="bc-needle" points="67,20.56 55.2,53 44.8,47"/>
  <circle class="bc-pivot" cx="50" cy="50" r="3.4" stroke="currentColor" stroke-width="2.6"/>
</svg>`;

/**
 * Injectuje brandový prvek do každé stránky — idempotentně, bez nutnosti
 * editovat inline `.brand` markup ve 130+ HTML souborech:
 *   1. favicon / apple-touch-icon do <head> (kanonické assety v assets/brand/)
 *   2. SVG kompas vlevo od wordmarku „HSPA monitor" v hlavičce
 *
 * Volá se z renderModuleNav(), který běží na každé stránce. Cesty k assetům
 * jsou root-absolutní (`/assets/...`), aby fungovaly i z podsložky /manifest/.
 */
export function renderBrandMark() {
  if (typeof document === 'undefined') return;

  // 1) Favicon — jen pokud stránka vlastní <link rel="icon"> nedeklaruje
  const head = document.head;
  if (head && !head.querySelector('link[rel="icon"]')) {
    const links = [
      { rel: 'icon', type: 'image/svg+xml', href: '/assets/brand/favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/assets/brand/favicon-32.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/assets/brand/apple-touch-icon.png' },
    ];
    for (const l of links) {
      const el = document.createElement('link');
      el.rel = l.rel;
      if (l.type) el.type = l.type;
      if (l.sizes) el.setAttribute('sizes', l.sizes);
      el.href = l.href;
      head.appendChild(el);
    }
  }

  // 1a) PWA manifest — jen pokud stránka vlastní <link rel="manifest"> nemá.
  if (head && !head.querySelector('link[rel="manifest"]')) {
    const mf = document.createElement('link');
    mf.rel = 'manifest';
    mf.href = '/site.webmanifest';
    head.appendChild(mf);
  }

  // 1b) RSS feed discovery — aby čtečky a agregátory feed našly automaticky.
  if (head && !head.querySelector('link[rel="alternate"][type="application/rss+xml"]')) {
    const rss = document.createElement('link');
    rss.rel = 'alternate';
    rss.type = 'application/rss+xml';
    rss.title = 'HSPA Monitor — články';
    rss.href = '/feed.xml';
    head.appendChild(rss);
  }

  // 2) Kompas v hlavičce — vlevo od wordmarku, idempotentně
  const brand = document.querySelector('.topbar .brand');
  if (brand && !brand.querySelector('.brand-compass')) {
    const slot = document.createElement('span');
    slot.className = 'brand-logo brand-compass';
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = BRAND_COMPASS_SVG;
    // Pokud je wordmark zabalený v odkazu na index, vlož kompas dovnitř
    // odkazu (klikací logo); jinak na začátek .brand.
    const link = brand.querySelector('a.brand-link');
    if (link) link.insertBefore(slot, link.firstChild);
    else brand.insertBefore(slot, brand.firstChild);
  }
}

export function renderModuleNav(activeId) {
  initAwarenessPopup();   // Týden zdraví má prioritu; nastaví __awPopupActive
  initNewsletterPopup();  // spustí se jen mimo aktivní awareness-týden
  renderBrandMark();
  injectOrgSchema();
  const path = window.location.pathname;
  const tabs = [
    {
      id: 'indicators',
      label: 'Indikátory',
      href: 'index.html',
      match: ['index.html', '/', 'diagnoza.html'],
      children: [
        { id: 'hspa-prehled', label: 'HSPA přehled',   href: 'hspa-prehled.html', match: ['hspa-prehled.html'] },
        { id: 'kvalita-pece', label: 'Kvalita péče',   href: 'kvalita-pece.html', match: ['kvalita-pece.html'] },
        { id: 'pojistenci',   label: 'Atlas pojištěnců', href: 'pojistenci.html', match: ['pojistenci.html'] },
        { id: 'diagnoza',     label: 'Diagnóza',       href: 'diagnoza.html',     match: ['diagnoza.html'] },
      ],
    },
    { id: 'kraje',       label: 'Krajský pohled',          href: 'kraje.html',              match: ['kraje.html'] },
    {
      id: 'financing',
      label: 'Financování',
      href: 'financovani.html',
      match: ['financovani.html', 'vyhlaska.html', 'reditel.html'],
      children: [
        { id: 'dohodovaci-rizeni',        label: 'Dohodovací řízení',  href: 'dohodovaci-rizeni.html',        match: ['dohodovaci-rizeni.html'] },
        { id: 'vyhlaska',                 label: 'Úhradová vyhláška: hra', href: 'vyhlaska.html',              match: ['vyhlaska.html'] },
        // 'financovani-poskytovatele' — DOČASNĚ SKRYTO. Provider-level
        // úhradová data jsou velmi citlivá; bez ověřených živých dat
        // (NRHZS denní refresh + audit) je riziko zavádějících závěrů.
        // Stránka /financovani-poskytovatele.html zatím existuje pro
        // direct-URL přístup s upozorněním, ale není v navigaci.
      ],
    },
    { id: 'explainers',  label: 'Jak funguje',             href: 'jak-funguje.html',        match: ['jak-funguje.html', 'cesta-pacienta.html', 'model-systemu.html', 'simulator.html', 'hra.html', 'pribeh-pacienta.html'],
      children: [
        { id: 'jak-zdravotnictvi', label: 'Zdravotnictví',           href: 'jak-funguje.html',    match: ['jak-funguje.html'] },
        { id: 'cesta-pacienta',    label: 'Cesta pacienta systémem',  href: 'cesta-pacienta.html', match: ['cesta-pacienta.html'] },
        { id: 'model-systemu',     label: 'Model systému',            href: 'model-systemu.html', match: ['model-systemu.html'] },
        { id: 'simulator',         label: 'Simulátor pák',            href: 'simulator.html',     match: ['simulator.html'] },
        { id: 'tri-zidle',         label: 'Tři židle: hra',           href: 'hra.html',           match: ['hra.html', 'pribeh-pacienta.html'] },
      ],
    },
    { id: 'prevention',  label: 'Co s tím můžu dělat já', href: 'prevence.html',           match: ['prevence.html', 'kompas.html'],
      children: [
        { id: 'prevence-hub', label: 'Prevence podle oblastí', href: 'prevence.html', match: ['prevence.html'] },
        { id: 'kompas',       label: 'Osobní kompas',          href: 'kompas.html',   match: ['kompas.html'] },
      ],
    },
    { id: 'articles',    label: 'Články',                  href: 'clanky.html',             match: ['clanky.html', 'rubrika.html'] },
    { id: 'strategies',  label: 'Strategie',               href: 'strategie.html',          match: ['strategie.html'],
      children: [
        { id: 'strategie-cr',  label: 'Strategie českého zdravotnictví', href: 'strategie.html',   match: ['strategie.html'] },
        { id: 'legislativa',   label: 'Legislativní radar',              href: 'legislativa.html', match: ['legislativa.html'] },
      ],
    },
    { id: 'barometr',    label: 'Barometr',                href: 'barometr.html',           match: ['barometr.html'] },
    { id: 'about',       label: 'O projektu',              href: 'o-projektu.html',         match: ['o-projektu.html'] },
    { id: 'glossary',    label: 'Glosář',                  href: 'glosar.html',             match: ['glosar.html'] },
  ];

  const isActive = (t) => activeId ? t.id === activeId : t.match.some(m => path.endsWith(m));
  const childActive = (t) => Array.isArray(t.children) && t.children.some(c => isActive(c));

  const container = document.getElementById('moduleNav');
  if (!container) return;

  const desktopTabsHtml = tabs.map(t => renderDesktopTab(t, isActive, childActive)).join('');
  const mobileTabsHtml = tabs.map(t => renderMobileTab(t, isActive)).join('');

  const searchTriggerHtml = `<button type="button" class="site-search-trigger" id="siteSearchTrigger" aria-label="Otevřít vyhledávání"><span aria-hidden="true">⌕</span> Hledat <kbd>/</kbd></button>`;
  container.innerHTML = desktopTabsHtml + searchTriggerHtml + themeToggleHtml();

  // Aktivuj global keyboard shortcut (/, Cmd+K) a wire trigger
  initSiteSearch();
  const trigger = document.getElementById('siteSearchTrigger');
  if (trigger) {
    trigger.addEventListener('click', () => {
      // Simulate '/' keypress to reuse same open logic
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    });
  }

  wireSubmenuAria(container);

  injectMobileNav(mobileTabsHtml);
  wireThemeToggle(); // po injectMobileNav — naváže i drawer toggle
}

/**
 * Toggle aria-expanded na parent linkách s dropdownem podle hover/focus stavu.
 * Dropdown sám je CSS-only — JS jen udržuje a11y atribut pro screen readery.
 */
function wireSubmenuAria(container) {
  const wraps = container.querySelectorAll('.module-tab-wrap');
  wraps.forEach(wrap => {
    const trigger = wrap.querySelector('.module-tab-has-submenu');
    if (!trigger) return;
    const setExpanded = (v) => trigger.setAttribute('aria-expanded', String(v));
    wrap.addEventListener('mouseenter', () => setExpanded(true));
    wrap.addEventListener('mouseleave', () => setExpanded(false));
    wrap.addEventListener('focusin', () => setExpanded(true));
    wrap.addEventListener('focusout', (e) => {
      // focusout firing před přesunem do submenu — zkontrolujeme, zda focus zůstal ve wrap
      if (!wrap.contains(e.relatedTarget)) setExpanded(false);
    });
    // Esc zavře dropdown a vrátí focus na trigger
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        trigger.focus();
      }
    });
  });
}

/**
 * Desktopová záložka — buď flat link, nebo wrapper s dropdownem.
 */
function renderDesktopTab(tab, isActive, childActive) {
  const editorial = tab.id === 'articles' ? ' module-tab-editorial' : '';
  const hasChildren = Array.isArray(tab.children) && tab.children.length > 0;

  if (!hasChildren) {
    const active = isActive(tab);
    return `<a href="${tab.href}" class="module-tab${active ? ' active' : ''}${editorial}"${active ? ' aria-current="page"' : ''}>${tab.label}</a>`;
  }

  const selfActive = isActive(tab);
  const subActive = childActive(tab);
  const parentActive = selfActive || subActive;
  const submenuId = `submenu-${tab.id}`;

  const childrenHtml = tab.children.map(c => {
    const active = isActive(c);
    return `<a href="${c.href}" class="module-tab module-tab-child${active ? ' active' : ''}"${active ? ' aria-current="page"' : ''} role="menuitem">${c.label}</a>`;
  }).join('');

  return `<div class="module-tab-wrap${parentActive ? ' module-tab-wrap-active' : ''}">
    <a href="${tab.href}" class="module-tab module-tab-has-submenu${parentActive ? ' active' : ''}"${selfActive ? ' aria-current="page"' : ''} aria-haspopup="menu" aria-expanded="false" aria-controls="${submenuId}">${tab.label}<span class="module-tab-caret" aria-hidden="true">▾</span></a>
    <div class="module-submenu" id="${submenuId}" role="menu" aria-label="${tab.label}">${childrenHtml}</div>
  </div>`;
}

/**
 * Mobilní záložka — flat link nebo parent + odsazené children (žádný
 * accordion-toggle, vždy expanded; mobil drawer má dost prostoru).
 */
function renderMobileTab(tab, isActive) {
  const editorial = tab.id === 'articles' ? ' module-tab-editorial' : '';
  const active = isActive(tab);
  const parentHtml = `<a href="${tab.href}" class="module-tab${active ? ' active' : ''}${editorial}"${active ? ' aria-current="page"' : ''}>${tab.label}</a>`;

  if (!Array.isArray(tab.children) || tab.children.length === 0) {
    return parentHtml;
  }

  const childrenHtml = tab.children.map(c => {
    const cActive = isActive(c);
    return `<a href="${c.href}" class="module-tab module-tab-child${cActive ? ' active' : ''}"${cActive ? ' aria-current="page"' : ''}>${c.label}</a>`;
  }).join('');

  return parentHtml + childrenHtml;
}

/**
 * Injectuje hamburger tlačítko do topbaru a slide-in drawer s navigací do <body>.
 * Aktivní jen na mobilním viewportu (<720px) přes CSS. Idempotent — re-render
 * neduplikuje markup, jen přepíše obsah drawer-listu.
 */
function injectMobileNav(tabsHtml) {
  const topbar = document.querySelector('header.topbar');
  if (!topbar) return;

  // Mobilní vstup do vyhledávání: desktopový .site-search-trigger žije uvnitř
  // .module-nav, která se pod 720 px skrývá — mobil proto potřebuje vlastní
  // trigger v topbaru (viditelnost řídí CSS breakpoint 720 px jako hamburger).
  let searchBtn = document.getElementById('mobileSearchTrigger');
  if (!searchBtn) {
    searchBtn = document.createElement('button');
    searchBtn.id = 'mobileSearchTrigger';
    searchBtn.className = 'mobile-search-trigger';
    searchBtn.setAttribute('type', 'button');
    searchBtn.setAttribute('aria-label', 'Otevřít vyhledávání');
    searchBtn.innerHTML = '<span aria-hidden="true">⌕</span>';
    searchBtn.addEventListener('click', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    });
    topbar.appendChild(searchBtn);
  }

  let toggle = document.getElementById('mobileNavToggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'mobileNavToggle';
    toggle.className = 'mobile-nav-toggle';
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-label', 'Otevřít menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mobileNavDrawer');
    toggle.innerHTML = `
      <span class="mobile-nav-toggle-bars" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>`;
    topbar.appendChild(toggle);
  }

  let drawer = document.getElementById('mobileNavDrawer');
  let backdrop = document.getElementById('mobileNavBackdrop');
  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobileNavBackdrop';
    backdrop.className = 'mobile-nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    drawer = document.createElement('aside');
    drawer.id = 'mobileNavDrawer';
    drawer.className = 'mobile-nav-drawer';
    drawer.setAttribute('aria-label', 'Hlavní menu');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    drawer.innerHTML = `
      <div class="mobile-nav-drawer-head">
        <span class="mobile-nav-drawer-title">Menu</span>
        <span class="mobile-nav-drawer-actions">${themeToggleHtml()}<button type="button" class="mobile-nav-close" aria-label="Zavřít menu">×</button></span>
      </div>
      <button type="button" class="mobile-nav-search" id="mobileNavSearch"><span aria-hidden="true">⌕</span> Hledat na webu</button>
      <nav class="mobile-nav-list" aria-label="Stránky"></nav>`;
    document.body.appendChild(drawer);
  }
  drawer.querySelector('.mobile-nav-list').innerHTML = tabsHtml;

  if (toggle.dataset.wired === '1') return;
  toggle.dataset.wired = '1';

  const open = () => {
    document.body.classList.add('mobile-nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.inert = false;
    backdrop.setAttribute('aria-hidden', 'false');
    const firstLink = drawer.querySelector('a, button');
    firstLink?.focus();
  };
  const close = () => {
    document.body.classList.remove('mobile-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    backdrop.setAttribute('aria-hidden', 'true');
    toggle.focus();
  };
  toggle.addEventListener('click', () => {
    document.body.classList.contains('mobile-nav-open') ? close() : open();
  });
  drawer.querySelector('.mobile-nav-close').addEventListener('click', close);
  drawer.querySelector('.mobile-nav-search')?.addEventListener('click', () => {
    close();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
  });
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('mobile-nav-open')) close();
  });
  // Focus trap: dokud je drawer otevřený, Tab cykluje uvnitř — fokus nesmí
  // utéct do obsahu pod backdropem (WCAG 2.1.2 No Keyboard Trap naruby).
  drawer.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !document.body.classList.contains('mobile-nav-open')) return;
    const focusables = [...drawer.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

let _glossaryTermsCache = null;

/**
 * Načte a cachuje termíny glosáře. Bezpečné pro opakované volání.
 */
export async function loadGlossaryTerms() {
  if (_glossaryTermsCache) return _glossaryTermsCache;
  try {
    const data = await fetch('data/glossary.json').then(r => r.json());
    _glossaryTermsCache = data.terms ?? [];
  } catch {
    _glossaryTermsCache = [];
  }
  return _glossaryTermsCache;
}

/**
 * Wrappuje známé zkratky v HTML stringu do <abbr> s tooltip.
 * Volat PŘED vložením do innerHTML. Bezpečné — operuje na escaped stringu.
 * Příklad: wrapAcronyms('Hodnotí OECD data', glossaryTerms) → 'Hodnotí <abbr ...>OECD</abbr> data'
 */
export function wrapAcronyms(html, terms) {
  if (!html || !terms || !terms.length) return html;
  // Build one combined regex so each text segment is processed in a single pass —
  // prevents later terms from matching inside <abbr> attributes just injected.
  const escaped = terms.map(t => t.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const combined = new RegExp(`(?<![\\w\\-])(${escaped.join('|')})(?![\\w\\-])`, 'g');
  const byKey = new Map(terms.map(t => [t.key, t]));
  // Split into alternating text/tag segments; only replace inside text (even indices)
  const parts = html.split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(combined, match => {
      const t = byKey.get(match);
      if (!t) return match;
      return `<abbr class="glossary-abbr" data-def="${escapeHtml(t.short_def)}" title="${escapeHtml(t.full)}">${match}</abbr>`;
    });
  }
  return parts.join('');
}

/**
 * Vrátí HTML pro error stav s „Zkusit znovu" tlačítkem (reload).
 * Použít v catch handlerech místo statického `.status error` divu.
 *
 *   container.innerHTML = renderErrorState('Nepodařilo se načíst strategie.', err);
 *
 * B-12 z BACKLOGu — graceful degradation per async fetch.
 */
export function renderErrorState(message, error) {
  const detail = error?.message ? escapeHtml(error.message) : '';
  return `
    <div class="empty-state" role="alert">
      <p class="empty-state-msg">${escapeHtml(message)}</p>
      ${detail ? `<p class="empty-state-detail"><code>${detail}</code></p>` : ''}
      <div class="empty-state-actions">
        <button class="empty-state-btn" type="button" onclick="window.location.reload()">Zkusit znovu</button>
        <a class="empty-state-btn empty-state-btn-sec" href="o-projektu.html">Co dělat dál</a>
      </div>
    </div>`;
}

/**
 * Escape HTML pro injekci do innerHTML.
 */
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Naformátuje číslo podle českých konvencí (mezera jako oddělovač tisíců,
 * desetinná čárka) — sjednocuje zobrazení napříč kartami, benchmarky a tabulkami.
 * Defaultně zachovává přesnost hodnoty (max 3 desetinná místa), nezaokrouhluje
 * tedy „2.736" na „2,7". Pro pevný počet míst použij minDecimals/maxDecimals.
 *
 * @param {number|string|null} value
 * @param {{minDecimals?:number, maxDecimals?:number}} [opts]
 * @returns {string} např. 17989.8 → „17 989,8", 803252 → „803 252", null → „—"
 */
export function formatNumberCz(value, { minDecimals = 0, maxDecimals = 3 } = {}) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('cs-CZ', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: Math.max(minDecimals, maxDecimals),
  });
}

/**
 * Vyrenderuje inline markdown z textu — nejprve escapuje HTML, pak nahradí:
 *   - **bold** → <strong>bold</strong>
 *   - *italic* / _italic_ → <em>italic</em>
 *   - `code` → <code>code</code>
 *   - jednoduché URL (http/https) → <a>...</a>
 * Vrací HTML string připravený pro innerHTML.
 *
 * Pro odstavcový/seznamový markdown použijte renderBlockMarkdown.
 */
export function renderInlineMarkdown(s) {
  if (s == null) return '';
  let html = escapeHtml(String(s));
  // Inline code
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
  // Bold (**text** or __text__) — non-greedy
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
  // Italic (single * or _) — vyhne se případům s mezerami u hvězdiček (násobení apod.)
  html = html.replace(/(^|[\s(\[])\*([^*\n]+?)\*(?=$|[\s.,;:!?)\]])/g, '$1<em>$2</em>');
  html = html.replace(/(^|[\s(\[])_([^_\n]+?)_(?=$|[\s.,;:!?)\]])/g, '$1<em>$2</em>');
  return html;
}

/**
 * Detekuje paragraf s inline číslovanou/písmennou výčetkou typu
 * "intro: (1) první ... (2) druhý ... (3) třetí" a převádí ji na proper
 * <ol> seznam. Vrací { intro, items, isNum } nebo null.
 *
 * Bezpečnost: vyžaduje sekvenční markery (1,2,3 nebo a,b,c) bez přeskoků,
 * minimálně 2 markery. Markery musí být odděleny whitespace nebo na začátku.
 * Aby se nesplelo s odkazy typu "§3 odst. 1" (bez závorek), pracujeme jen
 * se závorkovou notací (X).
 */
export function detectInlineEnumeration(text) {
  if (!text || typeof text !== 'string') return null;
  // Normalizace: data občas markují celý "(1) Topic" jako tučný span:
  //   **(1) demografie** — text...   →   (1) **demografie** — text...
  // To pomůže detektoru a zároveň zachová bold u topic.
  text = text.replace(/\*\*\(([0-9a-z])\)\s+([^*]+?)\*\*/g, '($1) **$2**');
  // Případy, kdy je tučný jen marker:  **(1)** text  → (1) text
  text = text.replace(/\*\*\(([0-9a-z])\)\*\*/g, '($1)');

  const markerRe = /(^|[\s])\(([0-9]|[a-z])\)\s/g;
  const markers = [];
  let m;
  while ((m = markerRe.exec(text)) !== null) {
    markers.push({ token: m[2], start: m.index + m[1].length, end: m.index + m[0].length });
  }
  if (markers.length < 2) return null;

  const isNum = /^\d$/.test(markers[0].token);
  for (let i = 0; i < markers.length; i++) {
    const expected = isNum ? String(i + 1) : String.fromCharCode(97 + i);
    if (markers[i].token !== expected) return null;
  }

  const intro = text.slice(0, markers[0].start).trim();
  const items = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length;
    let item = text.slice(start, end).trim();
    item = item.replace(/[;,]\s*$/, '');
    items.push(item);
  }
  return { intro, items, isNum };
}

/**
 * Vyrenderuje blokový markdown:
 *   - dvojitý newline → odstavec
 *   - řádky začínající `- ` nebo `* ` → <ul><li>
 *   - řádky začínající `1. ` (číslo + tečka) → <ol><li>
 *   - paragrafy s inline výčetkou (1)…(2)…(3) nebo (a)…(b)… se převádí
 *     na proper <ol class="md-enum"> s case-insensitive bold prefixem
 *     u "Topic — rest" položek.
 * Inline markdown se aplikuje uvnitř.
 */
export function renderBlockMarkdown(s) {
  if (s == null) return '';
  const text = String(s).replace(/\r\n/g, '\n');
  if (!text.trim()) return '';

  const blocks = /\n/.test(text) ? text.split(/\n{2,}/) : [text];

  return blocks.map(block => {
    const lines = block.split('\n');
    const ulMatch = lines.length > 0 && lines.every(l => /^\s*[-*]\s+/.test(l));
    const olMatch = lines.length > 0 && lines.every(l => /^\s*\d+\.\s+/.test(l));
    if (ulMatch) {
      return `<ul>${lines.map(l => `<li>${renderInlineMarkdown(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    if (olMatch) {
      return `<ol>${lines.map(l => `<li>${renderInlineMarkdown(l.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    }
    const joined = lines.join(' ');

    // Inline výčetka: "intro: (1) … (2) … (3) …"
    const enum_ = detectInlineEnumeration(joined);
    if (enum_) {
      const intro = enum_.intro
        ? `<p>${renderInlineMarkdown(enum_.intro)}</p>`
        : '';
      const lis = enum_.items.map(item => {
        const html = renderInlineMarkdown(item);
        // Zvýrazni první "Topic —/–/-" prefix tučně, pokud už není
        const boldedHtml = boldEnumPrefix(html);
        return `<li>${boldedHtml}</li>`;
      }).join('');
      const tag = enum_.isNum ? 'ol' : 'ol';
      const cls = enum_.isNum ? 'md-enum md-enum-num' : 'md-enum md-enum-alpha';
      return `${intro}<${tag} class="${cls}"${enum_.isNum ? '' : ' style="list-style-type:lower-alpha"'}>${lis}</${tag}>`;
    }

    return `<p>${renderInlineMarkdown(joined)}</p>`;
  }).join('');
}

/**
 * Pokud má položka tvar "Topic — rest" (em-dash, en-dash nebo hyphen),
 * obalí Topic do <strong>. Pokud už <strong> obsahuje, ponechá beze změny.
 * Vstup je už HTML escaped + markdown processed.
 */
function boldEnumPrefix(html) {
  if (/^<strong>/i.test(html.trim())) return html;
  // Hledáme první výskyt — nebo – nebo - (mezi mezerami) v rozumné vzdálenosti
  const m = html.match(/^([^—–\-]{2,80})\s+([—–\-])\s+(.+)$/s);
  if (!m) return html;
  const topic = m[1].trim();
  // Pokud topic obsahuje HTML značky (kromě inline jako <em>, <code>) — neformátujeme
  if (/<\/?(p|ol|ul|li|br|div)/i.test(topic)) return html;
  // První písmeno na velké
  const cap = topic.charAt(0).toLocaleUpperCase('cs-CZ') + topic.slice(1);
  return `<strong>${cap}</strong> ${m[2]} ${m[3]}`;
}

/**
 * Kanonický seznam interaktivních nástrojů webu — jediný zdroj pravdy pro
 * prolinkování mezi nástroji navzájem (blok „Prozkoumejte dál" na každé
 * nástrojové stránce) i pro homepage sekci.
 */
export const SITE_TOOLS = [
  { id: 'simulator',     href: 'simulator.html',     label: 'Simulátor pák',
    desc: 'Posuňte reformní páku a uvidíte modelový dopad na indikátory.', verb: 'Zkusit simulátor' },
  { id: 'kompas',        href: 'kompas.html',        label: 'Osobní zdravotní kompas',
    desc: 'Zadejte věk a kraj a zjistěte, co se v prevenci týká právě vás.', verb: 'Otevřít kompas' },
  { id: 'barometr',      href: 'barometr.html',      label: 'Barometr politických prohlášení',
    desc: 'Držíme politiky za slovo — sliby vlády vs. čísla, která měříme.', verb: 'Otevřít barometr' },
  { id: 'model-systemu', href: 'model-systemu.html', label: 'Model systému',
    desc: 'Interaktivní kauzální mapa: kudy se problém propisuje systémem.', verb: 'Prozkoumat model' },
  { id: 'vyhlaska',      href: 'vyhlaska.html',      label: 'Úhradová vyhláška: hra',
    desc: 'Rozdělte růst úhrad jako ministr — a ustůjte reakce segmentů.', verb: 'Zahrát si' },
  { id: 'tri-zidle',     href: 'hra.html',           label: 'Tři židle: herní kampaň',
    desc: 'Ministr → ředitel nemocnice → pacient: projděte systém ze všech tří židlí.', verb: 'Hrát kampaň' },
  { id: 'kviz',          href: 'kviz.html',          label: 'Kvíz: otestujte se',
    desc: 'Deset otázek z živých dat — tipněte hodnotu, srovnejte ČR s OECD.', verb: 'Spustit kvíz' },
];

/**
 * Vyrenderuje blok „Prozkoumejte dál" — karty ostatních nástrojů (kromě
 * aktivního) — do elementu #toolSiblings, je-li na stránce přítomen.
 * Zajišťuje, že jsou nástroje provázané mezi sebou z jednoho zdroje pravdy.
 * @param {string} activeId  id aktuálního nástroje (vyloučí se ze seznamu)
 */
export function renderRelatedTools(activeId, el = (typeof document !== 'undefined' ? document.getElementById('toolSiblings') : null)) {
  if (!el) return;
  const others = SITE_TOOLS.filter(t => t.id !== activeId);
  if (!others.length) return;
  el.innerHTML = `
    <div class="ed-kicker">Prozkoumejte dál</div>
    <h2 class="tool-siblings-h">Další interaktivní nástroje</h2>
    <div class="tool-siblings-grid">
      ${others.map(t => `
        <a class="tool-sibling-card" href="${t.href}">
          <span class="tool-sibling-title">${escapeHtml(t.label)}</span>
          <span class="tool-sibling-desc">${escapeHtml(t.desc)}</span>
          <span class="tool-sibling-cta">${escapeHtml(t.verb)} →</span>
        </a>`).join('')}
    </div>`;
}
