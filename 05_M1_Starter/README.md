# Zdravé Česko · Dashboard

Produkční portál pro HSPA hodnocení českého zdravotnictví. Statický web bez build kroku —
ES Modules + vanilla DOM + automatický denní ingest.

🌐 **Live:** [zdrave-cesko.cz](https://zdrave-cesko.cz)

## Co je v repozitáři

| Komponenta | Co dělá |
|---|---|
| **Frontend** (`index.html`, `clanek-*.html`, `clanky.html`, `hspa-prehled.html`, …) | 14+ stránek, vč. 65 long-form článků |
| **JS moduly** (`src/`, 25 souborů) | Frontend logika rozdělená podle stránky |
| **Datový kontrakt** (`data/indicators.json`) | 80 HSPA indikátorů, denní snapshoty |
| **Další datasety** (`data/*.json`) | Články, glossary, dimenze, témata, strategie, prevence, regiony, pojištěnci |
| **Metodické karty** (`indicators/*.json`) | 80 souborů, 1 = 1 indikátor |
| **Ingest pipeline** (`ingest/`) | Fetchery ÚZIS, ČSÚ, OECD, Eurostat, SÚKL + transform |
| **Testy** (`tests/`, ~260) | Frontend smoke, fetchery, transform, validace |
| **GitHub Actions** (`.github/workflows/refresh.yml`) | Denní cron 06:00 UTC |

## Rychlý start

```bash
npm install
npm test                    # ~260 testů
npm run serve               # http://localhost:8080
```

## Klíčové příkazy

```bash
npm test                    # Všechny testy
npm run validate:all        # Indicators + strategies + explainers + prevention
npm run verify:freshness    # Stáří dat (warn > 7 dní, fail > 30 dní)
npm run ingest              # Celý ingest pipeline (v dev = seed fallback)
npm run ingest:csu          # Jen ČSÚ
npm run ingest:oecd         # Jen OECD
npm run ingest:eurostat     # Jen Eurostat
npm run ingest:nrpzs        # Jen ÚZIS NRPZS
npm run transform           # Transform krok samostatně
npm run transform:pojistenci  # OIS 11-47 transformace
```

## Struktura repa

```
05_M1_Starter/
├── README.md               ← jsi tu
├── package.json            ← npm scripty, deps minimální (csv-parse, dotenv)
├── vercel.json             ← security headers + cache pravidla
├── 404.html
├── index.html              ← Homepage
├── clanky.html             ← Hub článků
├── clanek-*.html           ← 65 článků
├── hspa-prehled.html
├── tematicke-linie.html
├── kraje.html
├── pojistenci.html
├── prevence.html
├── strategie.html
├── glosar.html
├── o-projektu.html
├── jak-funguje.html
├── redakce.html
├── indicator.html
│
├── src/                    ← 25 ES modulů, ~18 000 LOC
│   ├── app.js              ← Homepage
│   ├── page-shared.js      ← Sdílené komponenty (nav, header, scroll)
│   ├── clanky.js           ← Hub + auto-bootstrap AV
│   ├── article-visuals.js  ← AV designsystem
│   ├── article-toc.js      ← TOC v článcích
│   ├── glossary-inline.js  ← Inline rozbalovací definice
│   ├── glosar.js           ← Stránka glosáře
│   ├── hspa-prehled.js     ← HSPA matrix
│   ├── kraje.js, cz-map.js ← Krajský dashboard
│   ├── pojistenci.js       ← OIS 11-47
│   ├── prevence.js         ← Vakcinace + screeningy
│   ├── strategies.js, explainers.js, explainer-policy-views.js,
│   │   strategy-policy-views.js, strategy-links.js
│   ├── indicator.js        ← Detail indikátoru
│   ├── search.js           ← Globální fulltext
│   ├── themes.js           ← Tematické linie
│   ├── redakce.js, site-stats.js, analytics.js, schema.js
│   └── styles.css          ← ~9 400 LOC, dark mode, print, a11y
│
├── data/                   ← Datasety (frontend čte výhradně tady)
│   ├── indicators.json     ← 80 HSPA indikátorů (datový kontrakt)
│   ├── articles.json       ← Metadata článků
│   ├── glossary.json       ← 110 termínů
│   ├── dimensions.json     ← 6 dimenzí
│   ├── themes.json         ← 8 tematických linií
│   ├── strategies.json, explainers.json
│   ├── prevention.json
│   ├── regions.json, cz-regions.geojson
│   ├── pojistenci-d5-*.json (kraj, okres, zp)
│   ├── freshness.json
│   └── snapshot-YYYY-MM-DD.json   ← denní snapshoty
│
├── indicators/             ← 80 metodických karet (1 JSON = 1 indikátor)
├── ingest/
│   ├── run.js              ← Orchestrátor
│   ├── transform.js, transform_pojistenci_d5.js
│   ├── validate*.js        ← 4 validátory (data, strategies, explainers, prevention)
│   ├── verify-freshness.js
│   ├── fetchers/           ← uzis_nrpzs, csu, oecd, eurostat, sukl, sukl_mr, uzis_nzis
│   ├── lib/                ← HTTP, cache, JSON-stat, SDMX, CSV parsery
│   ├── mapping/            ← OECD a ÚZIS kódy
│   └── cache/              ← gitignored raw responses
├── scripts/                ← Pomocné skripty (thumbnails ap.)
├── tests/                  ← ~260 testů (node:test)
└── .github/workflows/
    └── refresh.yml         ← cron 06:00 UTC + pre-deploy gate
```

## Datový kontrakt (`data/indicators.json`)

Frontend nesmí znát ÚZIS, OECD, ČSÚ — načítá pouze `data/*.json`.
Struktura indikátoru:

```json
{
  "version": "1.0",
  "generated_at": "2026-05-18T06:00:00Z",
  "indicators": [{
    "id": "nadeje_doziti_total",
    "name": "Naděje dožití při narození",
    "area": "Výsledky",
    "domain": "Zdravotní stav",
    "subdomain": "Doba dožití",
    "value": 79.9,
    "unit": "let",
    "year": 2024,
    "trend": [{"year": 2022, "value": 79.5}],
    "benchmark": {"oecd": 81.1, "eu": 80.9},
    "signal": "warn",
    "direction": "higher_is_better",
    "source": {"name": "ČSÚ", "url": "…", "fetched_at": "…", "origin": "seed|live"},
    "method_card_url": "indicators/nadeje_doziti_total.json"
  }]
}
```

Schémata všech datasetů viz [`../docs/data-model.md`](../docs/data-model.md).

## Datový tok

```
GitHub Actions cron 06:00 UTC
   ↓ npm run ingest
ingest/fetchers/* → ingest/cache/*
   ↓ npm run transform
data/indicators.json + data/snapshot-YYYY-MM-DD.json
   ↓ git commit + push
Vercel auto-deploy → CDN edge → uživatel
```

## Historie milníků

Milníky M1–M11 (datový pipeline → frontend → Vercel deploy → CI gate) jsou kompletní:

| Milník | Co bylo dodáno |
|---|---|
| M1 · setup + datový kontrakt | ✅ struktura, schema, 10 seed indikátorů |
| M2 · ÚZIS NRPZS fetcher | ✅ retry, cache, agregace kraj × obor |
| M3 · ČSÚ DataStat fetcher | ✅ primary → CSV fallback, JSON-stat parser |
| M4 · OECD/Eurostat fetchery | ✅ SDMX-JSON, JSON-stat, mapping, computed mean |
| M5 · transform vrstva | ✅ extraktory, signal logika, seed fallback |
| M6 · orchestrátor + cron | ✅ snapshoty, GitHub Actions 06:00 UTC |
| M7 · frontend interaktivita | ✅ reload, modal, CSV export, localStorage |
| M8 · verifikace | ✅ testovací suite |
| M9 · Vercel setup | ✅ `vercel.json` se security headers |
| M10 · auto-deploy hook | ✅ `refresh.yml` |
| M11 · pre-deploy gate | ✅ `deploy-check.yml` na každý PR |

Od M11 dále probíhají kontinuální vlny:

| Vlna | Stav |
|---|---|
| Articles content + audit metadata | ✅ probíhá kontinuálně |
| Article Visuals designsystem (AV) | ✅ |
| Homepage redesign (hub matrix, dimenze, podcasty) | ✅ |
| Glossary inline + samostatná stránka glosáře | ✅ |
| Tematické linie (8 linií) | ✅ |
| Krajský dashboard + OIS 11-47 pojištěnci | ✅ |
| Animation system (count-up, IntersectionObserver) | ✅ |
| Strategie + explainery + policy views | ✅ |

## Deploy na Vercel

1. **Import repa**: vercel.com → Add New → Project → vyber `veritasderman-rgb/hspa`.
2. **Project Settings**:
   - Framework Preset: **Other**
   - Root Directory: **`05_M1_Starter`**
   - Build Command: _prázdné_ (statický web)
   - Output Directory: _prázdné_
3. **Environment Variables**: žádné nejsou potřeba.
4. **Deploy** — Vercel automaticky publikuje statický web.

Po pushi do `main` Vercel automaticky rebuildne. GitHub Actions cron (`refresh.yml`)
v 06:00 UTC commitne aktualizovaná data → Vercel rebuild → uživatel vidí čerstvá čísla.

## Další dokumentace

- [`../CLAUDE.md`](../CLAUDE.md) — projektový brief (architektura, pravidla, signál logika)
- [`../docs/site-architecture.md`](../docs/site-architecture.md) — sitemap + per-page popis + CSS namespace průvodce + JS moduly map
- [`../docs/visual-components.md`](../docs/visual-components.md) — AV designsystem + ostatní UI komponenty
- [`../docs/data-model.md`](../docs/data-model.md) — schémata všech `data/*.json`
- [`../PROMPT_DAILY_ROUTINE.md`](../PROMPT_DAILY_ROUTINE.md) — denní AI agent rutina
- [`../BACKLOG.md`](../BACKLOG.md), [`../STATUS_AUDIT_2026-05-18.md`](../STATUS_AUDIT_2026-05-18.md) — backlog a stav

---
*Verze 2.0 · produkce · květen 2026*
