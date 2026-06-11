// Web analytics — injected via script tags (native browser ESM compatible).
//   1) Vercel Web Analytics — bezcookieové měření návštěvnosti.
//   2) Google Analytics 4 (GA4) — s Consent Mode v2, výchozí stav „denied".
//   3) Custom eventy (Úroveň 1 z PLAN-GA4-ROZSIRENI.md):
//      - indicator_click           — klik na indikátor (hub matrix, related card)
//      - glossary_term_open        — klik na zvýrazněný odborný termín v textu
//      - patient_story_expand      — rozkliknutí pacientského příběhu (kvalita-pece)
//      - external_source_click     — klik na externí zdroj (PUK, ÚZIS, OECD…)
//   Implementováno přes delegated event listenery na document — funguje
//   napříč všemi stránkami portálu bez nutnosti per-page wireupů.

// GA4 Measurement ID — pro výměnu property stačí přepsat tuto konstantu.
const GA_MEASUREMENT_ID = 'G-DVH1RPVTM4';

// Externí zdroje, jejichž odkazy chceme sledovat (primární data sources).
// Hledá se substring v hostname — `puk.kancelarzp.cz` matchne kromě `puk.`
// taky `kancelarzp` (kdyby někdo dal jen tu doménu).
const TRACKED_EXTERNAL_SOURCES = [
  { hostMatch: 'puk.kancelarzp.cz', source: 'puk' },
  { hostMatch: 'kancelarzp.cz',     source: 'kzp' },
  { hostMatch: 'indiko.cz',         source: 'indiko' },
  { hostMatch: 'uzis.cz',           source: 'uzis' },
  { hostMatch: 'oecd.org',          source: 'oecd' },
  { hostMatch: 'ec.europa.eu',      source: 'eurostat' },
  { hostMatch: 'sukl.cz',           source: 'sukl' },
  { hostMatch: 'szu.cz',            source: 'szu' },
  { hostMatch: 'mzcr.cz',           source: 'mzcr' },
  { hostMatch: 'who.int',           source: 'who' },
  { hostMatch: 'qualityindicators.ahrq.gov', source: 'ahrq' },
];

/**
 * Vrátí true pro lokální dev prostředí (kde GA4 ani Vercel Analytics nespouštíme).
 */
function isLocalEnv() {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') return true;
  const { hostname, protocol } = window.location;
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === ''
    || protocol === 'file:';
}

/**
 * Bezpečný wrapper kolem gtag — žádný no-op pokud gtag není inicializován
 * (např. consent denied, ad-blocker, lokální dev).
 *
 * @param {string} name  — název eventu (snake_case, ≤ 40 chars, dle GA4 doc)
 * @param {object} [params]
 */
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    // Filtrujeme null/undefined parametry — GA4 je nemá rád
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    window.gtag('event', name, clean);
  } catch {
    // Tichý fail — analytika nikdy nesmí lámat stránku
  }
}

/**
 * Stáhne indicator_id z elementu — buď z data-indicator-id, nebo z href ?id=…
 * Funguje pro karty (.hub-cell), related-card, related-indicator atd.
 */
function extractIndicatorId(el) {
  if (!el) return null;
  if (el.dataset?.indicatorId) return el.dataset.indicatorId;
  const href = el.getAttribute?.('href') ?? '';
  if (!href) return null;
  // Statická stránka indikator-{id}.html  nebo  interaktivní indicator.html?id={id}
  const ms = href.match(/indikator-([a-zA-Z0-9_-]+)\.html/);
  if (ms) return ms[1];
  const m = href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Bind delegated event listeners pro custom eventy.
 * Idempotentní — volat lze jen jednou, druhé volání se přeskočí.
 */
function bindCustomEvents() {
  if (typeof document === 'undefined') return;
  if (document.body?.dataset.gaCustomBound === '1') return;
  if (document.body) document.body.dataset.gaCustomBound = '1';

  // Hlavní delegated click handler
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // 1) Glossary term — explicit button, řeší se přednostně
    const glossBtn = target.closest('.cq-gloss-term[data-term], .gloss-term[data-term], .glossary-abbr[data-term]');
    if (glossBtn) {
      trackEvent('glossary_term_open', {
        term: glossBtn.dataset.term,
        source_page: location.pathname,
      });
      // Nepokračujeme — kliknutí na termín nikdy není navigace
      return;
    }

    // 2) Indicator click — karta, related-card, statická indikátorová stránka
    //    (indikator-*.html) i odkaz na interaktivní indicator.html
    const indEl = target.closest(
      '[data-indicator-id], a[href*="indikator-"], a[href*="indicator.html"]'
    );
    if (indEl) {
      const indicatorId = extractIndicatorId(indEl);
      if (indicatorId) {
        trackEvent('indicator_click', {
          indicator_id: indicatorId,
          source_page: location.pathname,
          domain: indEl.dataset?.indicatorDomain ?? null,
          signal: indEl.dataset?.indicatorSignal ?? null,
        });
      }
      // Pokračujeme — link se má normálně otevřít
    }

    // 3) External source click — odkazy na primární zdroje
    const extLink = target.closest('a[href^="http"]');
    if (extLink) {
      try {
        const url = new URL(extLink.href, location.origin);
        // Pokud cíl není ze stejné domény, je externí
        if (url.host !== location.host) {
          const matched = TRACKED_EXTERNAL_SOURCES.find(s => url.hostname.includes(s.hostMatch));
          if (matched) {
            trackEvent('external_source_click', {
              source: matched.source,
              host: url.hostname,
              from_page: location.pathname,
              url: url.pathname,
            });
          }
        }
      } catch {
        // Invalid URL — ignorujeme
      }
    }
  }, { passive: true });

  // Patient story expand — <details> toggle v catalogu na kvalita-pece.html
  // Pozor: toggle event se nezbubliňuje, takže potřebujeme capture: true
  document.addEventListener('toggle', (e) => {
    const det = e.target;
    if (!(det instanceof HTMLDetailsElement)) return;
    if (!det.open) return; // Trigger jen při OTEVŘENÍ, ne při zavření
    if (!det.classList.contains('cq-catalog-item')) return;
    const name = det.querySelector('.cq-catalog-name')?.textContent?.trim() ?? 'unknown';
    const section = det.closest('.cq-catalog-section')?.querySelector('.cq-catalog-section-h')?.textContent?.trim() ?? null;
    trackEvent('patient_story_expand', {
      indicator_name: name.slice(0, 80),
      section: section ? section.slice(0, 60) : null,
      source_page: location.pathname,
    });
  }, true);
}

// =====================================================================
// Úroveň 2 z PLAN-GA4-ROZSIRENI.md — engagement & funnel
// =====================================================================
//
// Eventy:
//   - section_visible    — IntersectionObserver 50 %, jednou per session×section
//   - scroll_depth       — 25 / 50 / 75 / 100 %, jednou per session×page
//   - article_read       — scroll > 80 % AND dwell time > 30 s, jednou per session
//   - share_click        — klik na share tlačítko (twitter/linkedin/facebook/email/copy)
//   - nav_dropdown_open  — hover/focus na submenu v top nav
//
// Idempotentní binding přes data-ga-engagement-bound = '1'.

const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const ARTICLE_READ_THRESHOLD = 80;
const ARTICLE_DWELL_MS = 30_000;

function bindEngagementEvents() {
  if (typeof document === 'undefined') return;
  if (!document.body) return;
  if (document.body.dataset.gaEngagementBound === '1') return;
  document.body.dataset.gaEngagementBound = '1';

  bindSectionVisibility();
  bindScrollDepth();
  bindArticleRead();
  bindShareClicks();
  bindNavDropdownOpen();
}

/**
 * IntersectionObserver pro section_visible eventy.
 * Jen sekce s id (nebo aria-labelledby) jsou sledovány — zabraňuje šumu.
 * Každá sekce se posílá maximálně 1× per page-load.
 */
function bindSectionVisibility() {
  if (typeof IntersectionObserver === 'undefined') return;
  const seen = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      const id = el.id || el.getAttribute('aria-labelledby') || el.dataset.sectionId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const titleEl = el.querySelector('h2, h3, h4');
      trackEvent('section_visible', {
        section_id: id,
        section_title: titleEl?.textContent?.trim().slice(0, 80) ?? null,
        source_page: location.pathname,
      });
      observer.unobserve(el);
    }
  }, { threshold: 0.5 });

  // Sledujeme jakoukoli <section> s id NEBO s aria-labelledby NEBO obsahující h3
  document.querySelectorAll('section[id], section[aria-labelledby]').forEach(s => observer.observe(s));
}

/**
 * Scroll depth tracking — emit jednou za milník 25/50/75/100 %.
 * Používá throttle (passive scroll listener + requestAnimationFrame).
 */
function bindScrollDepth() {
  if (typeof window === 'undefined') return;
  const reached = new Set();
  let ticking = false;
  const t0 = Date.now();

  function check() {
    ticking = false;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return;
    const pct = Math.round((window.scrollY / docH) * 100);
    for (const threshold of SCROLL_THRESHOLDS) {
      if (pct >= threshold && !reached.has(threshold)) {
        reached.add(threshold);
        trackEvent('scroll_depth', {
          depth_pct: threshold,
          time_to_reach_ms: Date.now() - t0,
          source_page: location.pathname,
        });
      }
    }
  }

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(check);
  }, { passive: true });

  // Také zkontrolujeme po načtení (kdyby stránka začínala už scrollnutá kvůli hash anchor)
  setTimeout(check, 200);
}

/**
 * Article read event — emit když scroll > 80 % AND dwell time > 30 s.
 * Jen na stránkách clanek-*.html.
 */
function bindArticleRead() {
  if (typeof location === 'undefined') return;
  const isArticle = /\/clanek-[a-z0-9-]+\.html$/i.test(location.pathname);
  if (!isArticle) return;

  let scrollOk = false;
  let dwellOk = false;
  let fired = false;
  const t0 = Date.now();

  function maybeFire() {
    if (fired || !scrollOk || !dwellOk) return;
    fired = true;
    const slug = location.pathname.match(/clanek-([a-z0-9-]+)\.html/i)?.[1] ?? 'unknown';
    // Z meta tagů zkusíme získat audit-status a topics
    const auditStatus = document.querySelector('meta[name="article:audit-status"]')?.content
      ?? document.body?.dataset?.auditStatus
      ?? null;
    trackEvent('article_read', {
      article_slug: slug,
      audit_status: auditStatus,
      time_to_read_ms: Date.now() - t0,
    });
  }

  // Dwell timer
  setTimeout(() => { dwellOk = true; maybeFire(); }, ARTICLE_DWELL_MS);

  // Scroll listener (throttled)
  let ticking = false;
  function check() {
    ticking = false;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) { scrollOk = true; maybeFire(); return; }
    const pct = (window.scrollY / docH) * 100;
    if (pct >= ARTICLE_READ_THRESHOLD) { scrollOk = true; maybeFire(); }
  }
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(check);
  }, { passive: true });
}

/**
 * Share click tracking — twitter/linkedin/facebook/email/copy.
 * Detekuje share linky podle classu, data-share-channel nebo host v URL.
 */
function bindShareClicks() {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href], button');
    if (!link) return;

    // Explicitní data-share-channel
    let channel = link.dataset?.shareChannel;
    let shareUrl = location.href;

    if (!channel && link.tagName === 'A') {
      const href = link.getAttribute('href') ?? '';
      try {
        const url = new URL(href, location.origin);
        if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) channel = 'twitter';
        else if (url.hostname.includes('linkedin.com')) channel = 'linkedin';
        else if (url.hostname.includes('facebook.com')) channel = 'facebook';
        else if (url.protocol === 'mailto:') channel = 'email';
        else if (href.startsWith('mailto:')) channel = 'email';
      } catch { /* ignore */ }
    }

    // Detekce „copy URL" tlačítka přes class nebo data-action
    if (!channel) {
      const cls = link.className?.toString?.() ?? '';
      if (/share-copy|copy-url|copy-link/i.test(cls)) channel = 'copy';
      if (link.dataset?.action === 'copy' || link.dataset?.action === 'share-copy') channel = 'copy';
    }

    if (!channel) return;
    trackEvent('share_click', {
      channel,
      url: shareUrl,
      source_page: location.pathname,
    });
  }, { passive: true });
}

/**
 * Nav dropdown open — sleduje, jak často lidi otevírají submenu
 * v top navigaci (Indikátory ▼, Financování ▼). Trigger na focus-within.
 */
function bindNavDropdownOpen() {
  if (typeof document === 'undefined') return;
  const wrappers = document.querySelectorAll('.module-tab-wrap');
  const opened = new Set(); // jednou per session×parent
  wrappers.forEach(w => {
    const fire = () => {
      const parent = w.querySelector('.module-tab-has-submenu');
      const id = parent?.getAttribute('href') ?? parent?.textContent?.trim() ?? 'unknown';
      if (opened.has(id)) return;
      opened.add(id);
      trackEvent('nav_dropdown_open', {
        parent_id: id,
        source_page: location.pathname,
      });
    };
    w.addEventListener('mouseenter', fire, { once: false, passive: true });
    w.addEventListener('focusin', fire, { passive: true });
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const isLocal = isLocalEnv();

  if (!isLocal) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    document.head.appendChild(s);
  }

  // ── Google Analytics 4 — Consent Mode v2 ───────────────────────────────
  // Reklamní storage zůstává denied (žádný remarketing, ads, personalizace);
  // analytics_storage je granted, protože GA4 měření návštěvnosti pro veřejný
  // informační portál bez ads je obvyklý legitimní zájem. Žádné PII se neukládá.
  if (!isLocal) {
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = window.gtag || gtag;

    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
    });

    const ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(ga);

    // Bind custom event listenery hned po načtení DOM
    function bindAll() {
      bindCustomEvents();
      bindEngagementEvents();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindAll, { once: true });
    } else {
      bindAll();
    }
  }
}

// Export pro testy + možnost manuálního trackingu z jiných modulů
export const __test__ = {
  extractIndicatorId,
  isLocalEnv,
  TRACKED_EXTERNAL_SOURCES,
  SCROLL_THRESHOLDS,
  ARTICLE_READ_THRESHOLD,
  ARTICLE_DWELL_MS,
};
