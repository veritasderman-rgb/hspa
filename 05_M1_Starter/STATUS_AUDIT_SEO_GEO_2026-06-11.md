# SEO & GEO audit — HSPA Monitor

**Datum:** 2026-06-11
**Rozsah:** `05_M1_Starter/` (produkční web, doména `https://skorezdravotnictvi.cz`)
**GEO = Generative Engine Optimization** — optimalizace pro AI odpovědní enginy
(ChatGPT/OpenAI, Claude, Perplexity, Google AI Overviews), aby web našly,
správně pochopily a **citovaly jako zdroj**.

---

## TL;DR

Web má **solidní základ** (per-page meta, OG/Twitter, favicony, RSS feed, čisté URL,
bezpečnostní hlavičky, jeden `<h1>` na stránku, plně server-renderovaná těla článků).
Chyběly však **tři základní stavební kameny discovery** a několik strukturálních věcí
důležitých hlavně pro GEO.

**Hotovo v tomto PR (rychlé výhry):**
- ✅ `robots.txt` (chyběl úplně) — vč. explicitního povolení AI crawlerů + odkaz na sitemap
- ✅ `sitemap.xml` (chyběl úplně) — generátor `scripts/generate-sitemap.js`, 119 URL, napojený na cron
  (vylučuje stránky s `noindex` v HTML, ať sitemap neposílá protichůdný signál)
- ✅ `llms.txt` (GEO standard) — kurátorovaná mapa webu pro AI enginy

**Doporučeno k dořešení (strukturální, mimo tento PR):** viz sekce „Backlog“ níže —
Article JSON-LD, kanonické odkazy na všech stránkách, server-side Organization schema,
`<h1>` na článcích, statický obsah homepage, per-indikátor URL.

---

## Co bylo provedeno v tomto PR

### 1. `robots.txt` (nově)
Předtím **neexistoval**. Bez něj nebyl ani odkaz na sitemap, ani explicitní postoj
k AI crawlerům. Nový soubor:
- `Allow: /` pro všechny + `Disallow` na šablony bez vlastního obsahu
  (`embed.html`, `indicator.html`, `rubrika.html`) — bez koncové kotvy `$`, ať pravidlo
  pokryje i query varianty (`indicator.html?id=…`).
- Explicitně **povoluje** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai,
  PerplexityBot, Google-Extended, Applebot-Extended, CCBot — protože obsah je veřejné
  dobro a chceme být citováni. (Blokace = přepsat blok na `Disallow: /`.)
- `Sitemap: https://skorezdravotnictvi.cz/sitemap.xml`.

### 2. `sitemap.xml` + generátor (nově)
Předtím **neexistoval** — vyhledávače i AI musely objevovat stránky jen přes odkazy.
- `scripts/generate-sitemap.js` (zrcadlí pattern `generate-feed.js`, sdílí
  `SITE_BASE` a `visibleArticles()` → respektuje publikační pravidla:
  drafty a budoucí data se nelistují).
- 18 kurátorovaných sekčních stránek (s `priority`/`changefreq`) + viditelné
  články z `data/articles.json`, **kromě těch s `noindex` v HTML** = **119 URL**.
- npm skript `generate:sitemap`, test `tests/generate-sitemap.test.js` (5 assertů).
- Napojeno na cron: `refresh.yml` (denně 06:00 UTC) i `publish-articles.yml`
  regenerují a commitují `sitemap.xml` vedle `feed.xml`.

### 3. `llms.txt` (nově, GEO)
Kurátorovaná markdown mapa webu pro AI enginy: jednovětný popis portálu, klíčové
stránky s popisy, strojově čitelné zdroje (feed, sitemap, `data/indicators.json`)
a pokyn k citování („HSPA Monitor — Zdravé Česko“ + zdroj + rok).

---

## Plný nález auditu

Legenda závažnosti: 🔴 kritické · 🟠 střední · 🟢 v pořádku / drobnost

| # | Oblast | Stav | Závažnost |
|---|--------|------|-----------|
| 1 | robots.txt | ❌ chyběl → ✅ **opraveno** | 🔴 |
| 2 | sitemap.xml | ❌ chyběla → ✅ **opraveno** | 🔴 |
| 3 | llms.txt (GEO) | ❌ chyběl → ✅ **opraveno** | 🟠 |
| 4 | Article / NewsArticle JSON-LD | ❌ chybí na všech článcích | 🔴 |
| 5 | Organization JSON-LD | ⚠️ injektován JS za běhu (neviditelný pro ne-JS crawlery) | 🟠 |
| 6 | Kanonické odkazy | ⚠️ jen ~15 stránek z 150 (chybí na článcích) | 🟠 |
| 7 | `og:url` | ⚠️ jen na 1 stránce | 🟠 |
| 8 | `<h1>` na článcích | ⚠️ H1 = brand „HSPA monitor“, titulek článku je `<h2>` | 🟠 |
| 9 | Client-side rendering homepage | ⚠️ indikátory/články/footer plní JS | 🟠 |
| 10 | Těla článků v HTML | ✅ plně server-renderovaná | 🟢 |
| 11 | `og:image` cesty na článcích | ⚠️ relativní (`assets/...`), ne absolutní | 🟠 |
| 12 | Alt text obálek článků | ⚠️ `alt=""` na všech | 🟠 |
| 13 | Per-page `<title>` / `description` | ✅ kvalitní, unikátní | 🟢 |
| 14 | OG / Twitter cards | ✅ kompletní | 🟢 |
| 15 | Favicony (SVG+PNG+apple) | ✅ | 🟢 |
| 16 | `manifest.json` (PWA) | ❌ chybí → ✅ `site.webmanifest` + `<link rel=manifest>` (renderBrandMark) | 🟢 (low) |
| 17 | `lang="cs"` / hreflang | ✅ správně (jednojazyčný web) | 🟢 |
| 18 | 404 (`noindex`) | ✅ | 🟢 |
| 19 | `vercel.json` (cleanUrls, hlavičky, cache) | ✅ | 🟢 |
| 20 | RSS feed | ✅ existuje + linkovaný | 🟢 |
| 21 | cleanUrls vs. `.html` v kanonických | ⚠️ kanonické míří na `.html`, který se 301 přesměruje | 🟠 |

---

## Backlog — strukturální doporučení (prioritně)

Tyto zásahy jsou invazivnější (dotýkají se šablon nebo 100+ článků).
Řeší se postupně v navazujících PR.

### P1 — největší dopad na GEO
1. ✅ **Article JSON-LD na každý článek (staticky v HTML)** — `NewsArticle`
   (`headline`, `description`, `datePublished`, `dateModified`, `image` absolutně,
   `author`/`publisher` = HSPA Monitor, `mainEntityOfPage`, `inLanguage`,
   `articleSection`). Injektuje `ingest/scripts/inject-article-seo.js` (`npm run
   seo:articles`) ze `data/articles.json`; napojeno na `publish-scheduled.js`.
2. ✅ **Organization schema staticky.** Na článcích je `publisher: Organization`
   součástí NewsArticle. Na **sekčních stránkách** přidán statický `@graph`
   `Organization` + `WebSite` (se `sameAs` na sociální profily) přes
   `ingest/scripts/inject-page-seo.js` (`npm run seo:pages`). Runtime
   `injectOrgSchema()` v `page-shared.js` zůstává jako doplněk pro ostatní pohledy.
3. ✅ **`BreadcrumbList` JSON-LD na článcích** — Domů → Články → titulek, součást
   stejného `@graph` jako NewsArticle.

### P2 — kanonikalizace a sdílení
4. ✅ **`<link rel="canonical">` na všechny indexovatelné stránky** (absolutní URL).
   Hotovo na **článcích** (`inject-article-seo.js`) i **18 sekčních stránkách**
   (`inject-page-seo.js`, self-canonical). Při tom opravena chybná pre-existing
   canonical na `tematicke-linie.html` (mířila na `hspa-prehled.html` + starou
   doménu) a normalizace `kvalita-pece.html` na kanonickou doménu. Zbývá sjednotit
   s `cleanUrls` (#21): dnes všude `.html`.
5. ✅ **`og:url` na všechny stránky** (absolutní). Hotovo na článcích i sekčních.
6. ✅ **`og:image` absolutní URL na článcích** + nově `og:image:alt` = titulek
   (`inject-article-covers.js`).

### P3 — struktura a renderování
7. ✅ **`<h1>` = titulek stránky.** Brand „HSPA monitor" v topbaru přesunut z `<h1>`
   na `<p class="brand-title">` (CSS `.brand h1` → `.brand .brand-title`, `margin:0`)
   a titulek povýšen na `<h1>` na **146 obsahových stránkách** (články `article-title`,
   sekční hero `ed-hero-headline`/`hspa-hero-headline`/`hub-hero-h`/`fn-hero-headline`,
   homepage hero). Transformace `scripts/promote-h1-headings.js` (idempotentní),
   drift-guard `tests/h1-headings.test.js`. JS-shell/utility stránky (indicator,
   rubrika, 404, embed) si brand `<h1>` ponechávají (jediný statický nadpis).
   `dohodovaci-rizeni.html` ✅ dostal vlastní statický titulkový `<h1>`
   (`fn-hero-headline`). Vizuální snapshot baseline se
   přegeneruje na CI.
8. ✅ **Prerender homepage.** `scripts/prerender-homepage.js` (`npm run prerender:home`)
   zapéká 3 nejnovější články staticky do `#homeArticlesGrid` v `index.html`
   (markup zrcadlí `app.js`). app.js obsah při načtení přepíše (`innerHTML`),
   takže pro uživatele beze změny a bez duplicity — crawler/AI navíc dostane
   seznam článků bez JS. Napojeno na `refresh.yml` i `publish-articles.yml`.
   *(Indicator grid se neprerenderuje — jednotlivé indikátory už mají vlastní
   statické stránky z #9.)*
9. ✅ **Per-indikátor URL.** Generátor `scripts/generate-indicator-pages.js`
   (`npm run seo:indicators`) tvoří lehké statické `indikator-{id}.html` (plochá
   struktura kvůli relativním cestám) se statickým obsahem (název=H1, hodnota,
   rok, benchmark, definice, význam, metodika, zdroj) + odkazem na interaktivní
   `indicator.html?id=…`. Ilustrativní (seed) indikátory dostávají `noindex` a
   sitemap je vynechá. Napojeno na `refresh.yml` (regenerace při změně dat).
   *Zbývá: přesměrovat interní odkazy z `indicator.html?id=` na statické stránky
   (dnes jen přes sitemap) — samostatný nízkorizikový follow-up.*
10. ✅ **Alt text obálek.** Cover `<img>` zůstává `alt=""` (správně — obálka nese
    titulek jako text hned vedle nadpisu, popisný alt by duplikoval). Místo toho
    přidán `og:image:alt` = titulek (náhled/AI/image search bez a11y duplikace).
11. ✅ **`Dataset` JSON-LD** na indexovatelných per-indikátorových stránkách
    (`variableMeasured`, `temporalCoverage`, `spatialCoverage`, `creator`/`publisher`)
    — velký GEO potenciál (AI citují konkrétní čísla s URL). `FAQPage` zatím
    nevyužito (na webu není FAQ formát).

---

## Jak ověřit (po deployi)

```bash
curl -s https://skorezdravotnictvi.cz/robots.txt
curl -s https://skorezdravotnictvi.cz/sitemap.xml | head
curl -s https://skorezdravotnictvi.cz/llms.txt | head
```

- Google Search Console → odeslat `sitemap.xml`.
- Rich Results Test / Schema validator na článku (po doplnění Article JSON-LD, P1).
