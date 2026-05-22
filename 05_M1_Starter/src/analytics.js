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
  // Výchozí souhlas je nastaven na „denied" JEŠTĚ PŘED načtením gtag.js.
  // Dokud souhlas není udělen, GA běží v bezcookieovém režimu (cookieless
  // pings) — neukládá cookies. GDPR-friendly kompromis bez cookie lišty.
  // Pozdější souhlas lze udělit přes:
  //   window.gtag('consent', 'update', { analytics_storage: 'granted' });
  if (!isLocal) {
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = window.gtag || gtag;

    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);

    const ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(ga);
  }
}
