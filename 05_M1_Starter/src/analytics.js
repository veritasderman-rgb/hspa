// Vercel Web Analytics — injected via script tag (native browser ESM compatible).
// https://vercel.com/docs/analytics/quickstart#script-tag
//
// The earlier bare specifier `import { inject } from '@vercel/analytics'`
// could not be resolved by the browser (no bundler, no import map) and
// crashed every module that imported this file — silently breaking the
// loading of explainers, prevention themes and other pages.

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
}
