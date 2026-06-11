# SEO & GEO audit — HSPA Monitor

**Datum:** 2026-06-11
**Rozsah:** `05_M1_Starter/` (produkční web, doména `https://hspa-cesko.cz`)
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
- ✅ `sitemap.xml` (chyběl úplně) — generátor `scripts/generate-sitemap.js`, 131 URL, napojený na cron
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
  (`embed.html`, `indicator.html`, `rubrika.html`).
- Explicitně **povoluje** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai,
  PerplexityBot, Google-Extended, Applebot-Extended, CCBot — protože obsah je veřejné
  dobro a chceme být citováni. (Blokace = přepsat blok na `Disallow: /`.)
- `Sitemap: https://hspa-cesko.cz/sitemap.xml`.

### 2. `sitemap.xml` + generátor (nově)
Předtím **neexistoval** — vyhledávače i AI musely objevovat stránky jen přes odkazy.
- `scripts/generate-sitemap.js` (zrcadlí pattern `generate-feed.js`, sdílí
  `SITE_BASE` a `visibleArticles()` → respektuje publikační pravidla:
  drafty a budoucí data se nelistují).
- 18 kurátorovaných sekčních stránek (s `priority`/`changefreq`) + všechny viditelné
  články z `data/articles.json` = **131 URL**.
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
| 16 | `manifest.json` (PWA) | ❌ chybí | 🟢 (low) |
| 17 | `lang="cs"` / hreflang | ✅ správně (jednojazyčný web) | 🟢 |
| 18 | 404 (`noindex`) | ✅ | 🟢 |
| 19 | `vercel.json` (cleanUrls, hlavičky, cache) | ✅ | 🟢 |
| 20 | RSS feed | ✅ existuje + linkovaný | 🟢 |
| 21 | cleanUrls vs. `.html` v kanonických | ⚠️ kanonické míří na `.html`, který se 301 přesměruje | 🟠 |

---

## Backlog — strukturální doporučení (prioritně)

Tyto zásahy jsou invazivnější (dotýkají se šablon nebo 100+ článků), proto **nejsou**
součástí tohoto PR — doporučuji je řešit samostatně po odsouhlasení směru.

### P1 — největší dopad na GEO
1. **Article JSON-LD na každý článek (staticky v HTML).** `@type: Article`
   (resp. `NewsArticle`) s `headline`, `description`, `datePublished`
   (z `article:published_time`), `image` (absolutní URL obálky), `author`
   (Organization „HSPA Monitor“ / redakce), `publisher`, `mainEntityOfPage`.
   Nejlépe vygenerovat do HTML při publikaci (krok injektující cover už existuje
   v `publish-scheduled.js` / `generate-article-cover.js`) — ne za běhu JS.
2. **Organization schema staticky.** Dnes ho injektuje `injectOrgSchema()` v
   `page-shared.js` za běhu → ne-JS AI crawler ho nevidí. Vložit identický blok
   přímo do HTML hlaviček (nebo do build kroku).
3. **`BreadcrumbList` JSON-LD na článcích.** Drobečková navigace v HTML už existuje
   (`article-breadcrumb`) — doplnit strukturovaná data.

### P2 — kanonikalizace a sdílení
4. **`<link rel="canonical">` na všechny indexovatelné stránky** (absolutní URL).
   Dnes jen ~15/150. Sjednotit přitom s `cleanUrls` (#21): rozhodnout, zda kanonická
   forma je `/x` nebo `/x.html`, a držet ji **konzistentně** v canonical, `og:url`,
   sitemapě i feedu. (Pozn.: sitemap i feed dnes používají `.html` kvůli shodě se
   stávajícími canonical tagy; pokud se přejde na clean URL, upravit obojí.)
5. **`og:url` na všechny stránky** (absolutní).
6. **`og:image` absolutní URL na článcích** (dnes `assets/covers/...` relativně →
   některé scrapery/náhledy selžou; má být `https://hspa-cesko.cz/assets/covers/...`).

### P3 — struktura a renderování
7. **`<h1>` = titulek článku.** Dnes je `<h1>` brand a titulek je `<h2>`. Pro SEO/GEO
   by titulek článku měl být `<h1>` (brand dát jako `<p>`/`<span>` se `.brand`, nebo
   `aria-label`). Pozor na CSS (`.brand h1` styling) a na homepage, kde je brand H1
   legitimní.
8. **Statický obsah homepage** (nebo prerender). `#indicatorGrid`, `#homeArticlesGrid`
   a footer plní JS → ne-JS crawler vidí kostru. Zvážit server-side/build-time
   prerender alespoň seznamu článků a klíčových čísel.
9. **Per-indikátor URL.** Všech ~139 indikátorů sdílí jedinou šablonu
   `indicator.html?id=…` bez statického obsahu → nejsou samostatně indexovatelné.
   Zvážit statické stránky `/indikator/{id}.html` (nebo prerender) s vlastním
   `<title>`, popisem a `Dataset` JSON-LD — velký GEO potenciál (AI rády citují
   konkrétní čísla s URL).
10. **Alt text obálek.** `alt=""` je pro čistě dekorativní obrázek validní, ale
    obálky nesou téma — doplnit popisný alt (a11y + image search).
11. **`Dataset` / `FAQPage` JSON-LD** tam, kde to dává smysl (datové stránky, FAQ).

---

## Jak ověřit (po deployi)

```bash
curl -s https://hspa-cesko.cz/robots.txt
curl -s https://hspa-cesko.cz/sitemap.xml | head
curl -s https://hspa-cesko.cz/llms.txt | head
```

- Google Search Console → odeslat `sitemap.xml`.
- Rich Results Test / Schema validator na článku (po doplnění Article JSON-LD, P1).
