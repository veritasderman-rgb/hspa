# Workflow playbooks — HSPA Monitor

Step-by-step návody pro běžné úkoly. Cíl: nemuset znovu zjišťovat, co je třeba upravit.

---

## Nový indikátor

### 1. Vytvoř metodickou kartu

`05_M1_Starter/indicators/{id}.json` — viz [`data-model.md`](data-model.md) pro plné schéma a [`indicators/nadeje_doziti_total.json`](../05_M1_Starter/indicators/) jako vzor.

Povinná pole: `id`, `name`, `area`, `domain`, `subdomain`, `definition`, `unit`, `direction`, `data_source`, `benchmark_source`, `signal_thresholds`, `frequency`, `stewards`, `method_notes`, `limitations`, `framework`, `dimension`.

### 2. Přidej do `data/indicators.json`

```json
{
  "id": "{id}",
  "name": "...",
  "area": "Výsledky | Výstupy | Procesy | Struktury",
  "domain": "...",
  "subdomain": "...",
  "framework": "hspa | monitoring",
  "dimension": "zdravi | kvalita | efektivita | spravedlnost",
  "value": 1.23,
  "unit": "%",
  "year": 2024,
  "trend": [{ "year": 2020, "value": 1.30 }],
  "benchmark": { "oecd": 0.9, "eu": 1.0 },
  "signal": "good | warn | bad | neutral",
  "direction": "lower_is_better | higher_is_better | context_dependent",
  "source": {
    "name": "...",
    "url": "...",
    "fetched_at": "2026-05-27T06:00:00Z",
    "origin": "seed | live"
  },
  "method_card_url": "indicators/{id}.json"
}
```

### 3. (Volitelně) Mapping pro fetcher

Pokud má jít přes ingest pipeline:
- OECD indikátor → `ingest/mapping/oecd_codes.json`
- ÚZIS indikátor → `ingest/mapping/uzis_codes.json`

### 4. Validace

```bash
npm run validate:all     # validate.js musí projít
npm test                 # test „Každý indikátor v data/indicators.json má odpovídající metodickou kartu" musí projít
```

### 5. Cross-link

- V příslušném článku přidej `<a href="indicator.html?id={id}">...</a>` link
- V `data/strategies.json` u relevantní strategie přidej `id` do `linked_indicators[]`
- V `data/themes.json` u relevantní tematické linie přidej `id` do `linked_indicators[]`

---

## Nový článek

### 1. HTML soubor

Vytvoř `05_M1_Starter/clanek-{slug}.html` podle vzoru existujícího článku (např. `clanek-alkohol-spotreba.html`).

**Důležité konvence**:
- `<link rel="stylesheet" href="src/styles.css">` (NE `../src/...`)
- `<script type="module" src="src/clanky.js"></script>` (auto-bootstrap AV designsystem)
- `<meta name="article:audit-status" content="draft|review-pending|partial|verified|flagged">`
- HTML komentář `<!-- audit: ... -->` v headu pro audit metadata (NE viditelné v textu!)
- Žádné `<aside class="article-review-banner">` v publikovaných článcích (validátor zablokuje)
- Article body uvnitř `<article class="article-page">`

Standardní layout sekcí:
1. `<header class="article-header">` — tagy, title, deck, meta
2. `<div class="article-body">` — text, sekce, vizuály
3. `<aside class="article-databox">` — propojení s HSPA indikátory
4. `<section class="article-sources">` — zdroje s atribucí
5. `<nav class="article-nav-bottom">` — Zpět na hub

### 2. Záznam v `data/articles.json`

```json
{
  "id": "{slug-without-clanek-prefix-or-html}",
  "slug": "clanek-{slug}.html",
  "tag": "Životní styl | Onkologie | …",
  "date": "2026-05-27",
  "title": "...",
  "perex": "150-250 znaků prvního odstavce nebo deckа",
  "linked_indicators": ["id1", "id2"],
  "linked_prevention_themes": ["screening_preventivni_pece"],
  "topics": ["financovani", "kvalita"],
  "published": true | false
}
```

> **`number` do záznamu NEPIŠ.** Redakční pořadové číslo přiděluje až publikační
> cron (`assignPublicationNumber` v `scripts/publish-scheduled.js`) v okamžiku
> vydání. Dokud si ho bral každý draft jako `max+1`, dva PR připravené tutéž noc
> si sáhly pro totéž číslo a kolidovaly na stejném řádku `articles.json` — první
> šel zmergovat, druhý ne, a když se konflikt vyřešil „vezmi obojí", zůstaly dva
> články se stejným číslem (v korpusu jich takhle bylo 18). Publikace je naopak
> sériová, nejvýš jeden článek denně, takže tam kolize nastat nemůže.
> Validátor `validate:articles` duplicitu i chybějící číslo u publikovaného
> článku odmítne.

### 3. Cover obrázek

```bash
node ingest/scripts/generate-article-cover.js {slug-without-clanek-or-html}
```

Output: `assets/covers/clanek-{slug}.svg` + `.png` (1200×630). Pokud script selže → potřeba `npm install` (kvůli `@resvg/resvg-js`).

### 4. Audit metadata

V HTML komentáři na začátku souboru:

```html
<!--
  audit:
    last_reviewed: 2026-05-27
    reviewer: claude-code-agent
    status: review-pending
    primary_sources_added: 5
    visual_elements_added: 1
    notes: "..."
-->
```

### 5. Cross-link

Article hub `clanky.html` se aktualizuje automaticky z `articles.json`. Doporučené manuální cross-linky:
- V `o-projektu.html` timeline, pokud je článek vázán na konkrétní událost
- V `data/strategies.json` / `explainers.json` v `documents[]` pokud cituje strategii/explainer

### 6. Registr tvrzení (claims)

Podstatná kvantitativní tvrzení z článku zapiš do `data/claims.json` (schéma viz [`data-model.md`](data-model.md) § 18): `quote` = DOSLOVNÝ úryvek z textu, vazba na indikátor (`indicator_id`). `check: "auto"` použij JEN pro přímé citace hodnoty indikátoru (`relation: "exact"` + povinné `as_of`); metodické odchylky = `related` + `manual`. Ověř:

```bash
npm run validate:claims  # schéma, FK, invarianty + quote dohledatelný v HTML
```

### 7. Validace

```bash
npm run validate:all     # validate-articles.js (publikační hygiena)
npm test
```

---

## Nová strategie / explainer

### Strategie (`data/strategies.json`)

Schema (validate-strategies.js):
- Required: `id`, `title`, `level`, `scope`, `status`, `owner`, `tldr_public`
- Valid `scope`: `framework | program | action_plan | strategy | guideline` — **NE `institutional`!**
- Valid `status`: `active | proposed | obsolete | revision_due`

Plný schema viz `oecd_health_at_a_glance` v `data/strategies.json`.

### Explainer (`data/explainers.json`)

Schema (validate-explainers.js):
- Required: `id`, `title`, `category`, `tldr_public`, `tldr_expert`, `tldr_policy`
- Valid `category`: `money | classification | actors | process | inspiration`

> **Pozn.**: persona switcher byl odstraněn, ale `tldr_expert` a `tldr_policy` zůstávají povinné v schématu. UI vždy renderuje `tldr_public` (přes `audienceText()` v `page-shared.js`). Detail viz [`decisions-log.md`](decisions-log.md).

### Validace + cross-link

```bash
npm run validate:all
```

Cross-link: v `linked_indicators[]`, `related_strategies[]`, případně z článků (`<a href="strategie.html?id={id}">`).

---

## Změna menu

Renderuje `src/page-shared.js` → `renderModuleNav(activeId)` z hardcoded pole `tabs[]`.

### Přidat top-level záložku

V `renderModuleNav()` doplň pole `tabs` o nový objekt:

```js
{ id: '{slug}', label: 'Název', href: '{slug}.html', match: ['{slug}.html'] },
```

### Přidat submenu (children)

Plánováno v [PLAN-KVALITA-PECE.md](../05_M1_Starter/PLAN-KVALITA-PECE.md) Fáze 0. Po implementaci:

```js
{
  id: 'indikatory-group', label: 'Indikátory', href: 'index.html',
  match: ['index.html', '/'],
  children: [
    { id: 'hspa-prehled', label: 'HSPA přehled', href: 'hspa-prehled.html' },
    { id: 'kvalita-pece', label: 'Kvalita péče', href: 'kvalita-pece.html' },
  ],
},
```

### Editorial marker (puntík před labelem)

Pro označení sekce jako „editorial heart" stačí v `renderModuleNav()` přidat třídu:

```js
const editorial = t.id === 'articles' ? ' module-tab-editorial' : '';
```

CSS pravidla v `src/styles.css` pod komentářem „Editorial marker".

---

## Cover obrázek

### Pro nový článek

```bash
cd 05_M1_Starter
node ingest/scripts/generate-article-cover.js {article-id-from-articles-json}
```

Generuje SVG (vektorový) + PNG (1200×630 rasterizovaný). Style options:
- `editorial` (default) — paper, Source Serif, accent bar
- `bold` — větší typografie
- `data-hero` — dominantní velké číslo
- `pull-quote` — citace

```bash
node ingest/scripts/generate-article-cover.js {id} --style=data-hero
node ingest/scripts/generate-article-cover.js --all   # batch pro všechny publikované
```

### Pro hub stránku / launch banner

Existující skript `scripts/generate-launch-banner.js` (1200×630, editorial styl). Pro novou stránku duplikovat skript, upravit text a brand counters.

Output: `assets/social/{name}.{svg,png}`.

### og:image v `<head>` článku

Generátor `generate-article-cover.js` automaticky doplní:
```html
<meta property="og:image" content="assets/covers/clanek-{slug}.png" data-cover-injected="1">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

---

## Nový fetcher (ingest pipeline)

### Struktura

`ingest/fetchers/{source}.js`:
```js
export async function fetch{Source}(opts) {
  // 1. Check cache freshness (readCacheIfFresh)
  // 2. HTTP request s User-Agent: ZdraveCesko-HSPA/1.0
  // 3. Parse (CSV / JSON / SDMX / HTML scraping)
  // 4. Throttle mezi requesty (CONFIG.throttle_ms)
  // 5. Write cache (ingest/cache/{source}_{id}.json)
  // 6. Return structured data
}
```

### Registrace

V `ingest/run.js` přidej importu + volání. Důsledky:
- Cron 06:00 UTC spustí fetcher
- Output protéká `transform.js` → `data/indicators.json`

### Test

`tests/{source}.test.js` — viz existující testy jako vzor.

### Validátor

Pokud nová doména (clinical, financing), přidej `ingest/validate-{source}.js`.

### Logging (zejména pro scrapery)

Auditní stopa: scraper píše do `data/{source}-scraping-log.json`:
```json
{
  "last_run": "2026-05-27T06:00:00Z",
  "runs": [
    { "date": "...", "urls_scraped": 42, "errors": [], "values_extracted": 86 }
  ]
}
```

---

## Update existujícího článku

### 1. Audit poznámka

Přidej do existujícího HTML komentáře `<!-- audit: ... -->` záznam:
```
OPRAVA YYYY-MM-DD: [stručně co a proč]
```

### 2. Status

Pokud měníš substantivně, sniž `audit-status` z `verified` → `review-pending`. Po finální kontrole povyš zpět.

### 3. Cross-validation

Pokud měníš číslo, ověř:
- Stejné číslo v `data/articles.json` `perex`?
- Stejné v `data/indicators.json` hodnotě indikátoru?
- Stejné v `og:description`?

Validátory NEDETEKUJÍ inkonzistence napříč soubory — manuální kontrola.

---

## Update plánu (living spec)

Soubory jako [`PLAN-KVALITA-PECE.md`](../05_M1_Starter/PLAN-KVALITA-PECE.md), [`BACKLOG.md`](../05_M1_Starter/BACKLOG.md) jsou živé. Po každém PR aktualizovat:
- Fáze označit jako ✅ done
- Otevřené body přesunout do „done" nebo aktualizovat
- Verze bumpnout (1.0 → 1.1)

---

## Daily routine (cron 06:00 UTC)

Spouští `npm run ingest` → `npm run transform` → commit dat. Pokud něco selže, výstup je v `discovery/discovery-YYYY-MM-DD.md` + `discovery/routing-YYYY-MM-DD.md`. Lokálně pro debug:

```bash
npm run ingest
npm run transform
npm run verify:freshness   # warn > 7 dní, fail > 30 dní
```
