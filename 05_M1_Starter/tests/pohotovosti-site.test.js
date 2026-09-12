// Samostatný web pohotovostí (scripts/build-pohotovosti-site.js → dist-pohotovosti/).
// Hlídá: odlehčený shell bez navigace/newsletteru, absolutní odkazy zpět na HSPA,
// canonical na vlastní doméně, service worker s cestami samostatného webu,
// sitemap + manifest, a že shell modul pokrývá vše, co si stránky berou z page-shared.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build, loadConfig, rewriteLinks } from '../scripts/build-pohotovosti-site.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'poh-site-'));
const cfg = loadConfig();
const summary = build({ out: OUT, quiet: true });
const read = (rel) => fs.readFileSync(path.join(OUT, rel), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data/pohotovosti-okresy.json'), 'utf8'));

/** Názvy importované z './page-shared.js' v daném modulu. */
function pageSharedImports(file) {
  const src = fs.readFileSync(path.resolve(ROOT, 'src', file), 'utf8');
  const m = /import\s*\{([^}]*)\}\s*from\s*'\.\/page-shared\.js'/.exec(src);
  return m ? m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) : [];
}

test('site · konfigurace nese doménu, název a odkaz zpět na provozovatele', () => {
  assert.match(cfg.host, /^[a-z0-9.-]+\.[a-z]+$/);
  assert.equal(cfg.url, `https://${cfg.host}`);
  assert.ok(cfg.name && cfg.short_name && cfg.tagline);
  assert.match(cfg.operator.url, /^https:\/\/skorezdravotnictvi\.cz/);
  assert.ok(cfg.hspa_links.length >= 1 && cfg.hspa_links.every(l => /^https:\/\//.test(l.href)));
});

test('site · build vyrobí index, všechny okresní stránky a servisní soubory', () => {
  assert.equal(summary.okresy, manifest.okresy.length);
  assert.deepEqual(summary.okresMissing, []);
  for (const f of ['index.html', '404.html', 'sw-pohotovosti.js', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'vercel.json',
    'src/pohotovosti.js', 'src/pohotovosti-engine.js', 'src/pohotovost-okres.js', 'src/page-shared.js', 'src/analytics.js', 'src/styles.min.css',
    'data/pohotovosti.json', 'data/pohotovosti-okresy.json', 'data/obce-gps.json', 'assets/vendor/echarts.min.js', 'assets/brand/favicon.svg']) {
    assert.ok(fs.existsSync(path.join(OUT, f)), `chybí ${f}`);
  }
  for (const o of manifest.okresy) assert.ok(fs.existsSync(path.join(OUT, `${o.slug}.html`)), `chybí ${o.slug}.html`);
});

test('site · index: odlehčený shell, canonical na vlastní doméně, žádná navigace dashboardu ani newsletter', () => {
  const html = read('index.html');
  assert.ok(html.includes(`<link rel="canonical" href="${cfg.url}/">`));
  assert.ok(html.includes('window.POH_SITE={"standalone":true'));
  assert.match(html, /<main id="content">/);
  assert.match(html, /id="toolSiblings"/);
  assert.match(html, /href="tel:155"/);
  assert.match(html, /application\/ld\+json/, 'FAQ JSON-LD musí zůstat');
  for (const forbidden of ['id="moduleNav"', 'masthead-strip', 'newsletter', 'href="index.html"', 'href="pohotovosti.html', 'src="src/', 'href="src/']) {
    assert.ok(!html.includes(forbidden), `index.html nesmí obsahovat ${forbidden}`);
  }
  assert.ok(html.includes(`href="${cfg.operator.url}`), 'odkaz zpět na HSPA Monitor');
});

test('site · okresní stránka: canonical /<okres>, odkazy na / a absolutní na HSPA, JSON-LD zachován', () => {
  const sample = manifest.okresy.find(o => o.slug === 'klatovy') ?? manifest.okresy[0];
  const html = read(`${sample.slug}.html`);
  assert.ok(html.includes(`<link rel="canonical" href="${cfg.url}/${sample.slug}">`));
  assert.match(html, /href="\/"/, 'odkaz na celostátní vyhledávání vede na /');
  assert.ok(!/href="pohotovosti\.html/.test(html) && !/href="index\.html"/.test(html));
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.ok(html.includes(`okrese ${sample.okres}`));
  assert.match(html, /<script type="module" src="\/src\/pohotovost-okres\.js">/);
  // žádný relativní odkaz na stránku HSPA Monitoru
  const rel = [...html.matchAll(/href="([a-z0-9-]+\.html[^"]*)"/g)].map(m => m[1]);
  assert.deepEqual(rel, [], `relativní odkazy: ${rel.join(', ')}`);
});

test('site · rewriteLinks: pohotovosti → /, okres → /<slug>, HSPA stránky absolutně, assets od kořene', () => {
  const out = rewriteLinks('<a href="pohotovosti.html#pohRozH">a</a><a href="pohotovost-klatovy.html">b</a><a href="index.html">c</a><a href="indicator.html?id=dojezd_zzs">d</a><img src="assets/x.png"><link href="src/styles.min.css">', cfg);
  assert.equal(out, `<a href="/#pohRozH">a</a><a href="/klatovy">b</a><a href="${cfg.operator.url}/">c</a><a href="${cfg.operator.url}/indicator?id=dojezd_zzs">d</a><img src="/assets/x.png"><link href="/src/styles.min.css">`);
});

test('site · shell modul exportuje vše, co si stránky berou z page-shared.js', async () => {
  const shell = await import('../src/pohotovosti-shell.js');
  for (const file of ['pohotovosti.js', 'pohotovost-okres.js']) {
    for (const name of pageSharedImports(file)) {
      assert.equal(typeof shell[name], 'function', `${file} importuje ${name}, shell ho nemá`);
    }
  }
  assert.equal(read('src/page-shared.js'), fs.readFileSync(path.resolve(ROOT, 'src/pohotovosti-shell.js'), 'utf8'));
});

test('site · service worker: cesty samostatného webu, precache existuje, články mimo', () => {
  const code = read('sw-pohotovosti.js');
  const ctx = { self: { addEventListener() {}, location: { origin: cfg.url } }, caches: {}, fetch() {}, Response: class {}, Headers: class {}, URL };
  vm.createContext(ctx);
  vm.runInContext(`${code}\n;this.__PRECACHE = PRECACHE; this.__ALLOW = ALLOW; this.__VERSION = VERSION;`, ctx);
  const allowed = (p) => ctx.__ALLOW.some(re => re.test(p));
  for (const p of ['/', '/klatovy', '/klatovy.html', '/data/pohotovosti.json', '/data/pohotovosti-akutni.json', '/data/obce-gps.json', '/src/pohotovosti.js', '/assets/vendor/echarts.min.js']) {
    assert.ok(allowed(p), `SW má obsluhovat ${p}`);
  }
  for (const p of ['/data/articles.json', '/data/indicators.json', '/clanek/x', '/api/subscribe']) {
    assert.ok(!allowed(p), `SW nemá obsluhovat ${p}`);
  }
  for (const p of ctx.__PRECACHE) {
    const rel = p === '/' ? 'index.html' : p.replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(OUT, rel)), `precache ${p} musí ve výstupu existovat`);
  }
  assert.match(ctx.__VERSION, /^standalone-\d{4}-\d{2}-\d{2}$/);
  assert.ok(!code.includes("'/pohotovosti'"), 'fallback navigace musí vést na /');
});

test('site · sitemap, robots, manifest a vercel.json jsou konzistentní s doménou', () => {
  const sm = read('sitemap.xml');
  assert.equal((sm.match(/<url>/g) || []).length, 1 + manifest.okresy.length);
  assert.ok(sm.includes(`<loc>${cfg.url}/</loc>`) && sm.includes(`<loc>${cfg.url}/${manifest.okresy[0].slug}</loc>`));
  assert.ok(read('robots.txt').includes(`Sitemap: ${cfg.url}/sitemap.xml`));
  const wm = JSON.parse(read('manifest.webmanifest'));
  assert.equal(wm.name, cfg.name); assert.equal(wm.scope, '/'); assert.equal(wm.start_url, '/');
  const vercel = JSON.parse(read('vercel.json'));
  assert.equal(vercel.cleanUrls, true);
  const all = vercel.headers.find(h => h.source === '/(.*)');
  assert.ok(all.headers.some(h => h.key === 'Permissions-Policy' && /geolocation=\(self\)/.test(h.value)), 'geolokace musí být povolená');
  assert.ok(all.headers.some(h => h.key === 'Content-Security-Policy'));
  assert.ok(vercel.headers.some(h => h.source === '/sw-pohotovosti.js'));
  assert.match(read('404.html'), /noindex/);
});

test('site · registrace SW ve zdrojích zná samostatný režim (scope /)', () => {
  for (const f of ['src/pohotovosti.js', 'src/pohotovost-okres.js']) {
    const src = fs.readFileSync(path.resolve(ROOT, f), 'utf8');
    assert.match(src, /POH_SITE\?\.standalone === true/, `${f} musí rozlišit samostatný web`);
    assert.match(src, /'\/sw-pohotovosti\.js'/);
  }
});
