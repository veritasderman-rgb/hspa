# Zdravé Česko — HSPA Dashboard · CLAUDE.md

Veřejný portál pro hodnocení výkonnosti zdravotního systému ČR podle metodiky OECD HSPA.
Inspirováno belgickým modelem **Healthy Belgium**.

## Aktivní kód

Veškerý vývoj probíhá v **`05_M1_Starter/`**. Ostatní adresáře jsou podkladové materiály:

| Adresář | Obsah |
|---|---|
| `01_Prototyp_Dashboard/` | Původní statický prototyp (zastaralý, jen pro referenci) |
| `02_Strategicky_dokument/` | Strategický plán DOCX |
| `03_Prezentace/` | Stakeholder prezentace PPTX |
| `04_Plan_napojeni_na_API/` | Plány a dokumentace milníků |
| `05_M1_Starter/` | **Aktivní dashboard** — veškerý kód je zde |
| `docs/` | Dokumentace pro vývojáře (site-architecture, visual-components, data-model) |

## Rychlý start

```bash
cd 05_M1_Starter
npm install
npm test          # ~260 testů, vše musí projít
npm run serve     # http://localhost:8080
```

## Architektura

```
05_M1_Starter/
├── index.html                  ← Homepage (hub matrix, dimensions, finance, podcasts)
├── clanky.html                 ← Hub všech článků (matrix + filtry)
├── clanek-*.html               ← 65 článků (long-form journalism)
├── hspa-prehled.html           ← HSPA 4 oblasti × domény (přehled indikátorů)
├── tematicke-linie.html        ← 8 tematických linií (linie = sada článků)
├── kraje.html                  ← Regionální dashboard (mapa krajů + tabulky)
├── pojistenci.html             ← OIS 11-47 (pojištěnci podle ZP × kraj × okres)
├── glosar.html                 ← 110 odborných pojmů (definice + odkazy)
├── prevence.html               ← Vakcinace + screeningy
├── strategie.html              ← Národní strategické dokumenty
├── o-projektu.html             ← O projektu, metodika
├── jak-funguje.html            ← Jak HSPA hodnocení funguje (vysvětlení)
├── redakce.html                ← Redakční tým a procesy
├── indicator.html              ← Stránka jednoho indikátoru (?id=...)
├── 404.html
│
├── src/                        ← Frontend ES modules (25 souborů, ~18 000 LOC)
│   ├── app.js                  ← Homepage (hub matrix, dimensions, podcasts, ticker)
│   ├── page-shared.js          ← Sdílené komponenty (nav, header, scroll)
│   ├── clanky.js               ← Hub článků + auto-bootstrap AV pro clanek-*.html
│   ├── article-visuals.js      ← AV designsystem (timeline, bar, table, flow, counter)
│   ├── article-toc.js          ← Table of Contents na stránkách clanek-*.html
│   ├── glossary-inline.js      ← Inline rozbalovací definice termínů v textu
│   ├── glosar.js               ← Stránka glosáře (vyhledávání, abeceda)
│   ├── hspa-prehled.js         ← HSPA matrix renderer
│   ├── kraje.js + cz-map.js    ← Mapa krajů + krajský dashboard
│   ├── pojistenci.js           ← OIS 11-47 dashboard
│   ├── prevence.js             ← Prevence dashboard
│   ├── strategies.js           ← Strategie + explainery
│   ├── explainers.js           ← Explainery (samostatné kontextové texty)
│   ├── explainer-policy-views.js, strategy-policy-views.js, strategy-links.js
│   ├── indicator.js            ← Detail indikátoru (?id=...)
│   ├── search.js               ← Globální fulltextové vyhledávání
│   ├── themes.js               ← Tematické linie
│   ├── redakce.js              ← Stránka redakce
│   ├── site-stats.js           ← Statistika hodnocení článků a pokrytí
│   ├── analytics.js            ← Plausible loader
│   ├── schema.js               ← JSON-LD structured data
│   └── styles.css              ← Veškeré CSS (~9 400 LOC, dark mode, print, a11y)
│
├── data/
│   ├── indicators.json         ← Datový kontrakt HSPA (80 indikátorů)
│   ├── articles.json           ← Metadata 65 článků (audit, topics, linked_indicators)
│   ├── glossary.json           ← 110 termínů (definice, odkazy)
│   ├── dimensions.json         ← 6 dimenzí kvality (přístupnost, efektivita, …)
│   ├── themes.json             ← 8 tematických linií (mentální zdraví, prevence, …)
│   ├── strategies.json         ← Národní strategické dokumenty
│   ├── explainers.json         ← Kontextové texty (politika, reformy, koncepty)
│   ├── prevention.json         ← Vakcinace + screeningy
│   ├── regions.json            ← Krajská data (multi-dataset, v2 formát)
│   ├── pojistenci-d5-*.json    ← OIS 11-47 (ZP × kraj × okres)
│   ├── freshness.json          ← Stav čerstvosti dat na indikátor
│   ├── cz-regions.geojson      ← GeoJSON krajů
│   └── snapshot-YYYY-MM-DD.json ← Denní snapshoty datového kontraktu
│
├── indicators/                 ← Metodické karty (1 JSON = 1 indikátor, 80 souborů)
├── ingest/
│   ├── run.js                  ← Orchestrátor (spouštěn GitHub Actions)
│   ├── transform.js            ← Harmonizace + výpočet signálů
│   ├── transform_pojistenci_d5.js
│   ├── validate*.js            ← Validátory pro indikátory, strategie, explainery, prevenci
│   ├── verify-freshness.js     ← Detekce zastaralých dat
│   ├── fetchers/               ← ÚZIS, ČSÚ, OECD, Eurostat, SÚKL fetchery
│   ├── lib/                    ← HTTP, cache, JSON-stat, SDMX, CSV parsery
│   └── mapping/                ← Mapping tabulky (OECD kódy, ÚZIS kódy)
├── scripts/                    ← Pomocné skripty (generování thumbnails ap.)
└── tests/                      ← ~260 testů (node:test), pokrývá frontend, fetchery, transform
```

## Datový tok

```
GitHub Actions (denně 06:00 UTC)
  ↓ npm run ingest
ingest/fetchers/* → ingest/cache/*
  ↓ npm run transform
data/indicators.json + data/snapshot-YYYY-MM-DD.json
  ↓ git commit + push
Vercel auto-deploy → CDN → uživatel
```

## Datový kontrakt (`data/indicators.json`)

Frontend čte **pouze** tento soubor pro indikátorová data — nezná ÚZIS, ČSÚ ani OECD.

```json
{
  "version": "1.0",
  "generated_at": "2026-05-05T06:00:00Z",
  "indicators": [{
    "id": "nadeje_doziti_total",
    "name": "Naděje dožití při narození",
    "area": "Výsledky",           // Výsledky | Výstupy | Procesy | Struktury
    "domain": "Zdravotní stav",
    "subdomain": "Doba dožití",
    "value": 79.9,
    "unit": "let",
    "year": 2024,
    "trend": [{"year": 2022, "value": 79.5}],
    "benchmark": {"oecd": 81.1, "eu": 80.9},
    "signal": "warn",             // good | warn | bad | neutral
    "direction": "higher_is_better",
    "source": {"name": "ČSÚ", "url": "...", "fetched_at": "...", "origin": "seed|live"},
    "method_card_url": "indicators/nadeje_doziti_total.json"
  }]
}
```

Detailní schémata všech `data/*.json` viz [`docs/data-model.md`](../docs/data-model.md).

## Klíčové příkazy

```bash
npm test                  # Spustí všechny testy (~260)
npm run validate:all      # Validuje indicators + strategies + explainers + prevention
npm run verify:freshness  # Kontrola stáří dat (warn > 7 dní, fail > 30 dní)
npm run ingest            # Spustí celý ingest pipeline (seed v dev prostředí)
npm run transform         # Jen transform krok
npm run serve             # Lokální HTTP server
```

## Stav (květen 2026)

Milníky M1–M11 (datový pipeline, frontend, deploy, CI gate) jsou kompletní.
Aktuálně běží další vlny vývoje:

| Vlna | Stav |
|---|---|
| M1–M11 · ingest pipeline + frontend + deploy | ✅ historie |
| Articles audit & metadata systém | ✅ probíhá kontinuálně |
| Article Visuals designsystem (AV) | ✅ |
| Homepage redesign (hub matrix, dimensions, podcasts) | ✅ |
| Glossary inline rozbalování | ✅ |
| Tematické linie (8 linií) | ✅ |
| Krajský dashboard + OIS 11-47 pojištěnci | ✅ |
| Animation system (count-up, bar fill, IntersectionObserver) | ✅ |

## Pravidla pro rozšiřování

### Přidat nový indikátor
1. Vytvoř `indicators/{id}.json` (metodická karta) — viz existující karty pro strukturu
2. Přidej seed záznam do `data/indicators.json` (pro dev bez síťového přístupu)
3. Případně přidej mapping do `ingest/mapping/oecd_codes.json` nebo `uzis_codes.json`
4. Spusť `npm test` — test "Každý indikátor v data/indicators.json má odpovídající metodickou kartu" musí projít

### Přidat nový fetcher
1. Vytvoř `ingest/fetchers/{source}.js` — viz existující fetchery
2. Exportuj `async function fetch{Source}(opts)` s parametrem `force`
3. Zaregistruj v `ingest/run.js`
4. Napiš test do `tests/{source}.test.js`

### Přidat nový článek
1. Vytvoř `clanek-{slug}.html` podle vzoru existujících článků (article-page layout)
2. Přidej záznam do `data/articles.json` (slug, title, audit-status, topics, linked_indicators)
3. Použij Article Visuals komponenty (`.av-*`) — viz `docs/visual-components.md`
4. Pro draft uveď `"published": false` v `articles.json`

## Signal logika

```javascript
computeSignal(value, benchmark, direction, thresholds)
// direction: 'higher_is_better' | 'lower_is_better' | 'context_dependent'
// thresholds: { good: 2, warn: 5 }  (v %)
// good:    adjusted diff > +good %
// warn:    -warn % ≤ adjusted diff ≤ +good %
// bad:     adjusted diff < -warn %
// neutral: chybí benchmark nebo direction = context_dependent
```

## Audit metadata (článků)

Každý článek má v `data/articles.json` `audit-status`:

| Status | Význam |
|---|---|
| `verified` | obsah ověřen redakcí, čísla zkontrolována, zdroje doplněny |
| `review-pending` | nový/upravený článek, čeká na ověření |
| `partial` | částečně ověřeno (např. text OK, čísla čekají na update) |
| `flagged` | nalezený problém (chybné číslo, zastaralý zdroj) → blocking |
| `draft-flagged` | rozpracovaný draft s otevřenými problémy |

Banner se zobrazuje v hlavičce článku, pokud status není `verified`.

## Publikační pravidla

### Kdy se článek zobrazí v UI

`isArticleVisible(article)` v `src/page-shared.js` rozhoduje o viditelnosti
napříč všemi pohledy (hub `clanky.html`, homepage `index.html`, indicator
detail, prevence, themes, search). Pravidla:

1. **`published === false`** → vždy skrytý (draft jen pro redakci).
2. **`date` (YYYY-MM-DD) v budoucnu** → skrytý (čeká na release den).
3. **`date` dnes, ale teprve před 06:00 lokálního času** → skrytý (vychází v 6:00 ráno).
4. **`date` v minulosti nebo dnes ≥ 06:00** → viditelný.

Pravidlo „v 6:00 ráno" zajišťuje, že nově publikovaný článek se zobrazí
najednou napříč všemi konzumenty (homepage hero, articles hub, related links
na indikátoru) ve stejný okamžik — předvídatelně pro čtenáře, redakci
i analytiku. Když cron pipeline ráno commitne nová data a Vercel rebuild
proběhne před 06:00, čtenáři zaregistrují nové články přesně v 6:00.

### Publikační hygiena — co NESMÍ být v publikovaném článku

Validátor `ingest/validate-articles.js` (`npm run validate:articles`,
součást `npm run validate:all`) kontroluje:

1. **Audit-status ↔ published konzistence**: článek s `audit-status: draft`,
   `flagged` nebo `draft-flagged` v HTML metadata MUSÍ mít `published: false`
   v `articles.json`.
2. **Redakční bannery v publikovaných článcích**:
   - Inline `<p style="background:#fff7e6...">` s "Status:" → fail
   - Texty obsahující „pracovní draft", „auditní revizi", „TODO/XXX/FIXME"
     v `<header class="article-header">` → fail
   - Legitimní markup `<aside class="article-review-banner">` je akceptován
     (slouží jako čtenáři srozumitelná editorial poznámka).
3. **Drafty mají varování** (ne fail), pokud zůstanou `published: false`.

### Životní cyklus článku

1. **Draft**: HTML soubor `clanek-{slug}.html` + `data/articles.json` záznam
   s `published: false` a `audit-status: draft`. Viditelný jen v `redakce.html`.
2. **Audit**: redakce přidá `<aside class="article-review-banner">` se shrnutím
   změn (pokud je relevantní pro čtenáře). Detailní seznam změn pro interní
   účely PATŘÍ DO `<!-- HTML komentáře -->`, NE do viditelného textu.
3. **Schválení**: `audit-status` → `verified` (nebo `review-pending`/`partial`
   pokud je redakce ochotna publikovat se zachovaným bannerem). `published: true`
   se nastaví společně s konečným `date` (publikační den).
4. **Release**: o 06:00 lokálního času v `date` se článek automaticky zobrazí
   napříč webem. GitHub Actions cron 06:00 UTC + Vercel rebuild zajistí, že
   `data/articles.json` je v ten okamžik aktuální.

## Deploy (Vercel)

- **Root Directory:** `05_M1_Starter`
- **Framework Preset:** Other (statický web)
- **Build Command:** *(prázdné)*
- Po každém push do `main` Vercel automaticky rebuildne
- GitHub Actions cron (06:00 UTC) commituje čerstvá data → Vercel rebuild

## Bezpečnostní pravidla

- Všechna data jsou agregovaná — žádné PII
- `User-Agent: ZdraveCesko-HSPA/1.0` ve všech HTTP požadavcích
- Cron maximálně jednou denně (rate limit ÚZIS)
- Žádné API klíče — vše veřejné zdroje

## Další dokumentace

- [`docs/site-architecture.md`](../docs/site-architecture.md) — sitemap, per-page popis, CSS namespace průvodce, JS moduly map
- [`docs/visual-components.md`](../docs/visual-components.md) — AV designsystem + ostatní UI komponenty (hub matrix, scorecard, finance donut…)
- [`docs/data-model.md`](../docs/data-model.md) — schémata všech JSON datasetů a jejich vztahy
- [`PROMPT_DAILY_ROUTINE.md`](./PROMPT_DAILY_ROUTINE.md) — denní rutina pro AI agenta
- [`BACKLOG.md`](./BACKLOG.md), [`STATUS_AUDIT_2026-05-18.md`](./STATUS_AUDIT_2026-05-18.md) — aktuální backlog a stav

## Soubory pro ignorování při hledání

- `ingest/cache/` — gitignored raw odpovědi ze zdrojů
- `node_modules/`
- `*.lock`
- `data/snapshot-*.json` — denní snapshoty (historie datového kontraktu)
