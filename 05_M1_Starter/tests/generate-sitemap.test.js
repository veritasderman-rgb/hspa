// Testy generátoru sitemap.xml (scripts/generate-sitemap.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSitemap, STATIC_PAGES, SITEMAP_EXCLUDED, isIndexablePage } from '../scripts/generate-sitemap.js';
import { SITE_BASE } from '../scripts/generate-feed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arts = [
  { slug: 'clanek-a.html', title: 'Á <test>', date: '2026-06-01', tag: 'Prevence' },
  { slug: 'clanek-b.html', title: 'B', date: '2026-06-09' },
  { slug: 'clanek-draft.html', title: 'Draft', date: '2026-06-01', published: false },
  { slug: 'clanek-future.html', title: 'Budoucí', date: '2027-01-01' },
];

test('buildSitemap: validní urlset, statické stránky + viditelné články', () => {
  const xml = buildSitemap(arts, { today: '2026-06-10' });
  assert.match(xml, /<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  // Homepage jako absolutní URL
  assert.ok(xml.includes(`<loc>${SITE_BASE}/</loc>`));
  // Viditelný článek je uvnitř, draft i budoucí ven
  assert.ok(xml.includes(`${SITE_BASE}/clanek-a`));
  assert.ok(xml.includes(`${SITE_BASE}/clanek-b`));
  assert.ok(!xml.includes('clanek-draft'), 'draft nesmí být v sitemapě');
  assert.ok(!xml.includes('clanek-future'), 'budoucí článek nesmí být v sitemapě');
});

test('buildSitemap: každý <url> má <loc>, lastmod článku = jeho datum', () => {
  const xml = buildSitemap(arts, { today: '2026-06-10' });
  const urls = (xml.match(/<url>/g) ?? []).length;
  const locs = (xml.match(/<loc>/g) ?? []).length;
  assert.equal(urls, locs, 'počet <url> a <loc> musí sedět');
  // lastmod článku odpovídá datu publikace
  assert.match(xml, new RegExp(`${SITE_BASE}/clanek-b</loc>\\s*<lastmod>2026-06-09</lastmod>`));
});

test('buildSitemap: validní XML escaping v loc', () => {
  const xml = buildSitemap(arts, { today: '2026-06-10' });
  assert.ok(!xml.includes('<loc>https://hspa-cesko.cz/clanek-a.html&'), 'žádný neescapovaný ampersand');
});

test('buildSitemap: noindex stránky se přes isIndexable vyřadí', () => {
  // Simulujeme, že clanek-b má v HTML noindex → nesmí být v sitemapě.
  const isIndexable = loc => loc !== '/clanek-b.html';
  const xml = buildSitemap(arts, { today: '2026-06-10', isIndexable });
  assert.ok(xml.includes(`${SITE_BASE}/clanek-a`), 'indexovatelný článek zůstává');
  assert.ok(!xml.includes('clanek-b'), 'noindex článek vyřazen');
});

test('buildSitemap: osoby jen se ≥2 členstvími nebo externími odkazy', () => {
  const ppoOsoby = [
    { id: 1, clenstvi: [{ g: 1 }, { g: 2 }] },
    { id: 2, clenstvi: [{ g: 1 }] },
    { id: 3, clenstvi: [], externi: { odkazy: [] } },
  ];
  const xml = buildSitemap(arts, { today: '2026-06-10', ppoOsoby });
  assert.ok(xml.includes(`${SITE_BASE}/pracovni-osoba?id=1`), 'spojka (2 členství) patří do sitemapy');
  assert.ok(xml.includes(`${SITE_BASE}/pracovni-osoba?id=3`), 'kurátorovaná osoba patří do sitemapy');
  assert.ok(!xml.includes('pracovni-osoba?id=2'), 'osoba s 1 členstvím bez externi do sitemapy nepatří');
});

test('sitemap: každá indexovatelná stránka je v STATIC_PAGES nebo ve výjimkách', () => {
  // Pojistka proti tiché de-indexaci: nová sekční stránka musí být buď
  // v STATIC_PAGES, nebo výslovně ve výjimkách s důvodem. Bez toho stránka
  // sice existuje, ale týdenní cron ji při přegenerování sitemapy zahodí
  // (přesně to potkalo vestniky-mz.html a jak-se-rozhoduje.html).
  const listed = new Set(STATIC_PAGES.map(p => p.loc));
  const excluded = new Set(Object.keys(SITEMAP_EXCLUDED));
  // clanek-/indikator-/pohotovost- mají vlastní dynamické sady v buildSitemap
  // (články, indikátorové stránky, okresní stránky pohotovostí z manifestu).
  const stranky = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html') && !/^(clanek|indikator|pohotovost)-/.test(f));

  const chybi = [];
  for (const f of stranky) {
    const loc = f === 'index.html' ? '/' : `/${f}`;
    if (listed.has(loc) || excluded.has(loc)) continue;
    if (!isIndexablePage(loc)) continue; // noindex stránky do sitemapy nepatří
    chybi.push(loc);
  }
  assert.deepEqual(chybi, [],
    `indexovatelné stránky mimo STATIC_PAGES i SITEMAP_EXCLUDED: ${chybi.join(', ')}`);

  // Výjimky musí mít typ i důvod a odpovídat existujícímu souboru.
  for (const [loc, { typ, duvod } = {}] of Object.entries(SITEMAP_EXCLUDED)) {
    assert.ok(duvod && duvod.length > 5, `${loc}: výjimka bez důvodu`);
    assert.ok(['sablona', 'noindex'].includes(typ), `${loc}: neznámý typ výjimky "${typ}"`);
    assert.ok(fs.existsSync(path.join(ROOT, loc.replace(/^\//, ''))),
      `${loc}: výjimka pro neexistující soubor`);
    assert.ok(!listed.has(loc), `${loc}: nemůže být zároveň ve výjimkách i v STATIC_PAGES`);
    // Výjimka typu noindex platí jen po dobu, kdy je stránka opravdu noindex.
    // Jinak by publikovaná stránka (robots → index) prošla první smyčkou přes
    // `excluded` a tiše zůstala mimo sitemapu — přesně ta regrese, kterou má
    // tenhle test chytat.
    if (typ === 'noindex') {
      assert.ok(!isIndexablePage(loc),
        `${loc}: výjimka je zdůvodněná noindexem, ale stránka je indexovatelná `
        + '— buď vrať robots na noindex, nebo ji zapiš do STATIC_PAGES');
    }
  }
});
