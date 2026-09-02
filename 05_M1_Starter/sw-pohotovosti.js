// Service worker stránky pohotovostí — offline cache.
//
// PROČ: kdo hledá pohotovost, má často jednu čárku signálu, nebo je někde,
// kde data nejdou vůbec. Po první návštěvě si prohlížeč uloží stránku,
// její skripty a data, takže vyhledání podle obce a „otevřeno teď“
// fungují i bez připojení. Stránka o tom ví (navigator.onLine) a řekne,
// jak stará data ukazuje.
//
// CO DĚLÁ A CO NE:
//   • Network-first: dokud síť odpovídá, bere se vždy čerstvá odpověď
//     a cache se jen obnoví. Z cache se čte až po selhání sítě.
//   • Zasahuje JEN do bílé listiny cest (ALLOW): stránky pohotovostí,
//     jejich data, skripty, styly a značka. Všechno ostatní (články,
//     indikátory, vyhledávací index) jde mimo něj, jako by tu nebyl.
//   • Registruje se se scope `/pohotovost` (src/pohotovosti.js), takže
//     řídí jen stránky /pohotovosti a /pohotovost-<okres>; ostatní
//     stránky webu pod ním neběží.
//   • Nic neposílá, nic nesbírá. Žádné notifikace, žádná synchronizace.
//
// VERZE: při změně chování zvedněte VERSION — aktivace smaže starší cache.

const VERSION = 'v1';
const CACHE = `pohotovosti-${VERSION}`;

/**
 * Co se uloží hned při instalaci (jednotlivě — jedna chybějící položka nesmí
 * shodit instalaci).
 *
 * Skripty: CELÝ graf statických importů obou stránek. Při první návštěvě se
 * SW registruje až po načtení modulů, takže je runtime cache nezachytí —
 * a `cache.add('/src/page-shared.js')` importy neprochází. Chybějící modul
 * offline shodí inicializaci celé stránky. Seznam hlídá test
 * (tests/pohotovosti-practical.test.js) proti skutečným importům v src/.
 */
const PRECACHE = [
  '/pohotovosti',
  '/pohotovosti.html',
  '/data/pohotovosti.json',
  '/data/obce-gps.json',
  '/data/cz-regions.geojson',
  '/src/styles.min.css',
  '/src/pohotovosti.js',
  '/src/pohotovosti-engine.js',
  '/src/pohotovost-okres.js',
  '/src/analytics.js',
  '/src/page-shared.js',
  '/src/site-stats.js',
  '/src/search.js',
  '/src/newsletter-popup.js',
  '/src/newsletter-signup.js',
  '/src/awareness-popup.js',
  '/src/awareness-core.js',
  '/src/vedra-popup.js',
  '/site.webmanifest',
];

/** Cesty, do kterých SW vůbec zasahuje. Vše ostatní jde bez zásahu. */
const ALLOW = [
  /^\/pohotovosti(\.html)?$/,
  /^\/pohotovost-[a-z0-9-]+(\.html)?$/,
  /^\/data\/pohotovosti[a-z0-9-]*\.json$/,
  /^\/data\/obce-gps\.json$/,
  /^\/data\/dojezdy\.json$/,
  /^\/data\/cz-regions\.geojson$/,
  // Data, která si sdílené moduly (navigace, statistika, popupy) tahají
  // při každém otevření — bez nich stránka funguje, ale hlásí chyby.
  /^\/data\/(articles|indicators|glossary|awareness-weeks|vedra-popup)\.json$/,
  /^\/src\/[a-z0-9-]+\.js$/,
  /^\/src\/styles\.min\.css$/,
  /^\/assets\/brand\//,
  /^\/assets\/vendor\/echarts\.min\.js$/,
  /^\/site\.webmanifest$/,
];

function allowed(url) {
  return url.origin === self.location.origin && ALLOW.some(re => re.test(url.pathname));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('pohotovosti-') && k !== CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!allowed(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      // Navigace bez uložené kopie okresní stránky → aspoň hlavní vyhledávání,
      // které má data a umí najít i tenhle okres.
      if (req.mode === 'navigate') {
        const page = (await cache.match('/pohotovosti')) ?? (await cache.match('/pohotovosti.html'));
        if (page) return page;
      }
      return new Response('Jste offline a tahle část stránky ještě není uložená.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
