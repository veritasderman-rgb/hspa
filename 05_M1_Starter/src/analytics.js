// Web analytics — injected via script tags (native browser ESM compatible).
//   1) Vercel Web Analytics — bezcookieové měření návštěvnosti.
//   2) Google Analytics 4 (GA4) — s Consent Mode v2, výchozí stav „denied".
// https://vercel.com/docs/analytics/quickstart#script-tag
//
// The earlier bare specifier `import { inject } from '@vercel/analytics'`
// could not be resolved by the browser (no bundler, no import map) and
// crashed every module that imported this file — silently breaking the
// loading of explainers, prevention themes and other pages.

// GA4 Measurement ID — pro výměnu property stačí přepsat tuto konstantu.
const GA_MEASUREMENT_ID = 'G-DVH1RPVTM4';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const { hostname, protocol } = window.location;
  const isLocal = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === ''
    || protocol === 'file:';

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
  // Pokud chceš plně cookieless režim, přepni `analytics_storage` na 'denied'
  // — GA pak posílá jen modelované pings (v GA Admin se ale verifikace data
  // hitů nezobrazí, jen v reportech s několikadenním zpožděním).
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
  }
}
