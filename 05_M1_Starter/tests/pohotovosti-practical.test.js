// Rozcestník „Kam s tím?“, poradní linky záchranek, EN/UK vrstva, zpětná
// vazba, sdílení a offline režim stránky pohotovostí.
//
// Pointa téhle vrstvy: stránka posílá lidi na konkrétní telefonní čísla
// a říká jim, kam s jakou situací patří. Nic z toho nesmí být z hlavy —
// každý řádek nese zdroj a datum ověření, statická FAQ hlavička říká totéž
// co živá sekce, a service worker sahá jen na to, co mu patří.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { careAdvice, feedbackIssueUrl } from '../src/pohotovosti-engine.js';
import { faqJsonLd, placeHtml, rozcestnikHtml } from '../scripts/build-pohotovosti-okresy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.resolve(ROOT, p), 'utf8');
const data = JSON.parse(read('data/pohotovosti.json'));
const html = read('pohotovosti.html');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^(\+\d{9,15}|1\d{2}|116\d{3})$/;

// ── datový kontrakt ──────────────────────────────────────────────────────

test('practical.triage · každý řádek má zdroj, datum ověření, tlačítko a FAQ pár', () => {
  const rows = data.practical?.triage ?? [];
  assert.ok(rows.length >= 6, `jen ${rows.length} řádků rozcestníku`);
  const ids = new Set();
  for (const r of rows) {
    assert.ok(r.id && !ids.has(r.id), `${r.id}: id chybí nebo je duplicitní`);
    ids.add(r.id);
    assert.ok(r.situation && r.text, `${r.id}: situation/text`);
    assert.ok(['tel', 'find', 'href', 'anchor', 'poradna'].includes(r.action?.kind), `${r.id}: action.kind`);
    assert.ok(r.action.label, `${r.id}: tlačítko bez popisku`);
    if (r.action.kind === 'tel') assert.match(r.action.phone, PHONE, `${r.id}: telefon`);
    if (r.action.kind === 'href') assert.match(r.action.url, /^https?:\/\//, `${r.id}: url`);
    if (r.action.kind === 'find') assert.ok(r.action.categories?.length, `${r.id}: find bez kategorií`);
    assert.ok(r.faq?.q && r.faq?.a, `${r.id}: faq.q/faq.a`);
    assert.match(r.source?.url ?? '', /^https?:\/\//, `${r.id}: zdroj`);
    assert.match(r.verified_at ?? '', ISO, `${r.id}: verified_at`);
  }
  // Ohrožení života musí být řádek s 155 — a musí být první, ne někde uprostřed.
  assert.equal(rows[0].action.kind, 'tel');
  assert.equal(rows[0].action.phone, '155', 'první řádek rozcestníku je ohrožení života → 155');
  assert.ok(rows[0].urgent, 'řádek 155 je označený jako urgentní (červený okraj)');
});

test('practical · expectations, no_gp, feedback a apps nesou zdroj', () => {
  const pr = data.practical;
  assert.ok((pr.expectations ?? []).length >= 2, 'aspoň dvě položky „co vás čeká“');
  for (const e of pr.expectations) {
    assert.ok(e.id && e.title && e.text, `${e.id}: id/title/text`);
    assert.match(e.source?.url ?? '', /^https?:\/\//, `${e.id}: zdroj`);
    assert.match(e.verified_at ?? '', ISO, `${e.id}: verified_at`);
  }
  assert.ok(pr.no_gp?.short && pr.no_gp?.text && pr.no_gp?.links?.length, 'no_gp: short/text/links');
  assert.match(pr.no_gp.source?.url ?? '', /^https?:\/\//);
  assert.match(pr.no_gp.verified_at ?? '', ISO);
  assert.match(pr.feedback?.issues_new_url ?? '', /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/new$/);
  for (const a of pr.apps ?? []) {
    assert.ok(a.id && a.name && a.url && a.text, `${a.id}: id/name/url/text`);
    assert.match(a.source?.url ?? '', /^https?:\/\//, `${a.id}: zdroj`);
    assert.match(a.verified_at ?? '', ISO, `${a.id}: verified_at`);
  }
});

test('practical.intl · EN i UK mají tísňové číslo, aspoň 5 položek a zdroje', () => {
  for (const lang of ['en', 'uk']) {
    const b = data.practical.intl?.[lang];
    assert.ok(b, `chybí intl.${lang}`);
    assert.ok(b.title, `${lang}: title`);
    assert.ok((b.items ?? []).length >= 5, `${lang}: jen ${(b.items ?? []).length} položek`);
    assert.ok(b.items.some(it => it.tel === '155' || it.tel === '112'), `${lang}: chybí 155/112`);
    for (const it of b.items) {
      assert.ok(it.q && it.a, `${lang}: položka bez q/a`);
      if (it.tel) assert.match(it.tel, PHONE, `${lang}: tel ${it.tel}`);
      if (it.url) assert.match(it.url, /^https?:\/\//, `${lang}: url`);
    }
    assert.ok((b.sources ?? []).some(s => /^https?:\/\//.test(s.url)), `${lang}: zdroje`);
    assert.match(b.verified_at ?? '', ISO, `${lang}: verified_at`);
  }
  // Ukrajinský blok je opravdu ukrajinsky (cyrilice), ne anglicky s jiným klíčem.
  assert.match(data.practical.intl.uk.title, /[Ѐ-ӿ]/);
});

test('online.advice_lines · poradní linky ZZS: kraj z registru, jedna na kraj, ne tísňové číslo', () => {
  const lines = data.online?.advice_lines ?? [];
  assert.ok(lines.length >= 2, `jen ${lines.length} poradních linek (čekány aspoň dvě)`);
  const known = new Set(data.regions.map(r => r.kraj_code));
  const seen = new Set();
  for (const l of lines) {
    assert.ok(l.id && l.kraj && l.name, `${l.id}: id/kraj/name`);
    // Provozní doba: buď ze zdroje, nebo poctivě přiznané „web ji neuvádí“ — nikdy prázdno.
    assert.ok(l.hours || l.hours_unknown === true, `${l.id}: hours nebo hours_unknown`);
    assert.ok(!(l.hours && l.hours_unknown), `${l.id}: hours a hours_unknown si odporují`);
    assert.ok(l.quote, `${l.id}: doslovný citát ze zdroje`);
    assert.ok(known.has(l.kraj_code), `${l.id}: kraj ${l.kraj_code} není v registru`);
    assert.ok(!seen.has(l.kraj_code), `${l.id}: druhá linka pro ${l.kraj_code}`);
    seen.add(l.kraj_code);
    assert.match(l.phone, /^\+\d{9,15}$/, `${l.id}: telefon v mezinárodním tvaru`);
    assert.doesNotMatch(l.phone, /^\+420(155|112)$/);
    assert.match(l.source?.url ?? '', /^https?:\/\//, `${l.id}: zdroj`);
    assert.match(l.verified_at ?? '', ISO, `${l.id}: verified_at`);
  }
});

// ── statická FAQ hlavička = živá sekce ───────────────────────────────────

test('pohotovosti.html · FAQPage JSON-LD je totéž, co rozcestník v datech', () => {
  const m = /<script type="application\/ld\+json" id="pohFaqLd">\n([\s\S]*?)\n<\/script>/.exec(html);
  assert.ok(m, 'chybí FAQPage JSON-LD (spusť `npm run build:pohotovosti-okresy`)');
  const ld = JSON.parse(m[1]);
  assert.equal(ld['@type'], 'FAQPage');
  assert.deepEqual(ld, faqJsonLd(data.practical),
    'FAQ v hlavičce nesedí na practical.triage — spusť `npm run build:pohotovosti-okresy`');
  assert.ok(ld.mainEntity.length >= 6);
  for (const q of ld.mainEntity) {
    assert.equal(q['@type'], 'Question');
    assert.ok(q.name.endsWith('?'), `otázka „${q.name}“ nekončí otazníkem`);
    assert.ok(q.acceptedAnswer.text.length >= 40, `odpověď na „${q.name}“ je moc krátká`);
  }
  // Značky zůstávají, aby builder měl kam psát příště.
  assert.ok(html.includes('<!-- poh-faq:start') && html.includes('<!-- poh-faq:end -->'));
});

test('pohotovosti.html · hostitelské prvky nových sekcí a nástrojů existují', () => {
  for (const id of ['pohTriageGrid', 'pohPoradny', 'pohIntl', 'pohIntlBody', 'pohOffline', 'pohTools', 'pohPrint', 'pohRozH']) {
    assert.ok(html.includes(`id="${id}"`), `chybí #${id}`);
  }
  assert.ok(html.includes('data-share-list'), 'chybí tlačítko sdílení výsledků');
  assert.ok(/<section class="poh-intl-block"|<details class="poh-intl"/.test(html));
  assert.ok(html.includes('lang="uk"') && html.includes('lang="en"'), 'jazykové značky pro EN/UK');
});

// ── engine ───────────────────────────────────────────────────────────────

test('careAdvice · poradní linka ZZS je krok hned za prvním kontaktem, jen s polohou a jen u lékařské péče', () => {
  const line = { id: 'x', kraj_code: 'CZ064', name: 'Linka 155 pro neakutní stavy', phone: '+420800140155', hours: 'denně 7–19' };
  const day = new Date(2026, 8, 7, 10, 0);   // pondělí 10:00
  const night = new Date(2026, 8, 7, 22, 0);
  const withOrigin = careAdvice({ now: day, hasOrigin: true, category: 'lps_dospeli', adviceLine: line });
  const kinds = withOrigin.steps.map(s => s.kind);
  assert.equal(kinds[0], 'prvni_kontakt');
  assert.equal(kinds[1], 'poradna');
  assert.equal(withOrigin.steps[1].line.phone, '+420800140155');

  const atNight = careAdvice({ now: night, hasOrigin: true, category: 'lps_deti', adviceLine: line });
  assert.ok(atNight.steps.some(s => s.kind === 'poradna'), 'v noci se linka nabízí taky');

  const noOrigin = careAdvice({ now: day, hasOrigin: false, adviceLine: line });
  assert.ok(!noOrigin.steps.some(s => s.kind === 'poradna'), 'bez polohy nevíme kraj — linka jiného kraje by neporadila');

  for (const category of ['zubni', 'lekarna']) {
    const other = careAdvice({ now: day, hasOrigin: true, category, adviceLine: line });
    assert.ok(!other.steps.some(s => s.kind === 'poradna'), `${category}: zdravotnická poradna není pro zuby a léky`);
  }
});

test('feedbackIssueUrl · předvyplněné hlášení nese pracoviště, datum dat a štítek', () => {
  const url = feedbackIssueUrl(
    { id: 'vzp-123', name: 'Nemocnice Klatovy', workplace: 'LPS', okres: 'Klatovy', address: 'Plzeňská 929', phone: '+420376335111', category_label: 'LPS pro dospělé' },
    { labels: ['pohotovosti'], generatedDay: '2026-09-01' },
  );
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, 'https://github.com/veritasderman-rgb/hspa/issues/new');
  assert.equal(u.searchParams.get('labels'), 'pohotovosti');
  assert.match(u.searchParams.get('title'), /Nemocnice Klatovy/);
  const body = u.searchParams.get('body');
  assert.match(body, /vzp-123/);
  assert.match(body, /376 335 111/);
  assert.match(body, /2026-09-01/);
  assert.match(body, /Co je jinak/);
});

// ── okresní stránky ──────────────────────────────────────────────────────

test('okresy · karta nese patičku s datem dat a hlášením změny; bez data nic', () => {
  const base = { id: 'x1', name: 'Nemocnice X', category: 'lps_dospeli', category_label: 'LPS', okres: 'Klatovy', phone: '+420111222333', hours: null };
  const s = placeHtml(base, { generatedAt: '2026-09-01T06:00:00Z', feedback: { issues_new_url: 'https://github.com/veritasderman-rgb/hspa/issues/new', labels: ['pohotovosti'] } });
  assert.match(s, /pokr-foot/);
  assert.match(s, /Data k 2026-09-01/);
  assert.match(s, /Nahlásit změnu/);
  assert.match(s, /issues\/new\?/);
  assert.ok(!placeHtml(base).includes('pokr-foot'), 'bez kontextu se patička nevykreslí (starší volání)');
});

test('okresy · kompaktní rozcestník má 155 a poradní linku kraje, když ji kraj má', () => {
  const practical = data.practical;
  const line = (data.online?.advice_lines ?? [])[0];
  const s = rozcestnikHtml(practical, line);
  assert.match(s, /pokr-roz/);
  assert.match(s, /href="tel:155"/);
  assert.ok(s.includes(`tel:${line.phone}`), 'poradní linka kraje je v bloku');
  assert.match(s, /pohotovosti\.html#pohRozH/, 'odkaz na plný rozcestník');
  const without = rozcestnikHtml(practical, null);
  assert.ok(!without.includes(`tel:${line.phone}`));
  assert.match(without, /href="tel:155"/);

  // A v generované stránce kraje s linkou to opravdu je.
  const manifest = JSON.parse(read('data/pohotovosti-okresy.json'));
  const okres = manifest.okresy.find(o => o.kraj_code === line.kraj_code);
  assert.ok(okres, `žádný okres pro ${line.kraj_code}`);
  const page = read(`pohotovost-${okres.slug}.html`);
  assert.ok(page.includes(`tel:${line.phone}`), `pohotovost-${okres.slug}.html: chybí poradní linka (spusť build:pohotovosti-okresy)`);
  assert.match(page, /pokr-foot/);
  assert.match(page, /sw-pohotovosti|pohotovost-okres\.js/);
});

// ── offline: service worker ──────────────────────────────────────────────

/** Spustí SW v sandboxu s falešným `self`, vrátí zachycené handlery. */
function loadServiceWorker() {
  const code = read('sw-pohotovosti.js');
  const handlers = {};
  const cacheStore = new Map();
  const cache = {
    add: async (url) => { cacheStore.set(url, { url }); },
    put: async (req, res) => { cacheStore.set(typeof req === 'string' ? req : req.url, res); },
    match: async (req) => cacheStore.get(typeof req === 'string' ? req : req.url),
  };
  const ctx = {
    self: {
      addEventListener: (type, fn) => { handlers[type] = fn; },
      location: { origin: 'https://skorezdravotnictvi.cz' },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: { open: async () => cache, keys: async () => ['pohotovosti-v0', 'other'], delete: async () => true },
    fetch: async () => ({ ok: true, clone() { return this; } }),
    Response: class { constructor(body, init) { this.body = body; this.status = init?.status; } },
    URL,
  };
  vm.runInContext(code, vm.createContext(ctx));
  return { handlers, cacheStore, ctx };
}

test('sw-pohotovosti.js · registruje install/activate/fetch a zasahuje jen do bílé listiny', async () => {
  const { handlers } = loadServiceWorker();
  for (const t of ['install', 'activate', 'fetch']) assert.equal(typeof handlers[t], 'function', `chybí handler ${t}`);

  const respond = (pathname, mode = 'cors') => {
    let intercepted = false;
    handlers.fetch({
      request: { method: 'GET', url: `https://skorezdravotnictvi.cz${pathname}`, mode },
      respondWith: () => { intercepted = true; },
    });
    return intercepted;
  };
  // Co mu patří:
  for (const p of ['/pohotovosti', '/pohotovosti.html', '/pohotovost-klatovy', '/pohotovost-brno-mesto.html',
    '/data/pohotovosti.json', '/data/pohotovosti-akutni.json', '/data/obce-gps.json', '/data/dojezdy.json',
    '/src/pohotovosti.js', '/src/page-shared.js', '/src/styles.min.css', '/assets/brand/favicon.svg', '/site.webmanifest']) {
    assert.ok(respond(p), `${p} má jít přes SW`);
  }
  // Co mu nepatří — zbytek webu musí běžet, jako by SW neexistoval:
  for (const p of ['/', '/index.html', '/clanek-reforma-pohotovosti-290-2025.html', '/data/indicators.json',
    '/data/search-index.json', '/data/articles.json', '/indikator-x.html', '/kraje.html']) {
    assert.ok(!respond(p), `${p} nesmí jít přes SW`);
  }
  // Ne-GET a cizí origin nikdy.
  let intercepted = false;
  handlers.fetch({ request: { method: 'POST', url: 'https://skorezdravotnictvi.cz/data/pohotovosti.json' }, respondWith: () => { intercepted = true; } });
  handlers.fetch({ request: { method: 'GET', url: 'https://plausible.io/js/script.js' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});

test('sw-pohotovosti.js · network-first: síť má přednost, cache až po selhání', async () => {
  const { handlers, cacheStore, ctx } = loadServiceWorker();
  const req = { method: 'GET', url: 'https://skorezdravotnictvi.cz/data/pohotovosti.json', mode: 'cors' };

  let out;
  handlers.fetch({ request: req, respondWith: (p) => { out = p; } });
  const fresh = await out;
  assert.equal(fresh.ok, true, 'online → odpověď ze sítě');
  assert.ok(cacheStore.has(req.url), 'a uložila se do cache');

  ctx.fetch = async () => { throw new Error('offline'); };
  handlers.fetch({ request: req, respondWith: (p) => { out = p; } });
  const cached = await out;
  assert.equal(cached, cacheStore.get(req.url), 'offline → kopie z cache');

  // Navigace na neuloženou okresní stránku → hlavní vyhledávání, ne prázdno.
  cacheStore.set('/pohotovosti', { page: true });
  handlers.fetch({ request: { method: 'GET', url: 'https://skorezdravotnictvi.cz/pohotovost-nikde', mode: 'navigate' }, respondWith: (p) => { out = p; } });
  assert.deepEqual(await out, { page: true });
});

test('offline · stránky registrují SW se scope /pohotovost a Vercel ho nekešuje', () => {
  for (const f of ['src/pohotovosti.js', 'src/pohotovost-okres.js']) {
    const src = read(f);
    assert.ok(src.includes("'../sw-pohotovosti.js'"), `${f}: registrace SW`);
    assert.ok(src.includes("'../pohotovost'"), `${f}: scope omezený na /pohotovost*`);
  }
  assert.ok(html.includes('id="pohOffline"'));
  const cfg = JSON.parse(read('vercel.json'));
  const rule = cfg.headers.find(r => r.source === '/sw-pohotovosti.js');
  assert.ok(rule, 'vercel.json: chybí pravidlo pro /sw-pohotovosti.js');
  assert.match(rule.headers.find(h => h.key === 'Cache-Control')?.value ?? '', /no-cache/);
});

test('styles.css · nové komponenty rozcestníku, EN/UK bloku a offline pruhu existují', () => {
  const css = read('src/styles.css');
  for (const sel of ['.poh-roz-grid', '.poh-roz-card-urgent', '.poh-intl', '.poh-offline', '.poh-poradna', '.poh-card-foot', '.pokr-roz', '.pokr-foot', '.poh-expect']) {
    assert.ok(css.includes(sel), `chybí ${sel}`);
  }
});
