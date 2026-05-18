# HSPA Monitor — Data model

Schémata všech datasetů v `05_M1_Starter/data/` + metodických karet v
`05_M1_Starter/indicators/` + jejich vztahy. Pro per-stránka spotřebu viz
[`site-architecture.md`](site-architecture.md).

## Sdílené konvence

Každý dataset má root strukturu:

```json
{
  "version": "1.0",
  "generated_at": "2026-05-18T06:00:00Z",
  "<plural>": [ /* záznamy */ ]
}
```

- `version` — semver string. Major bump = breaking change v schématu.
- `generated_at` — ISO 8601 timestamp, kdy byl soubor vygenerován ingest pipeline.
- `_doc` — volitelné pole se stručným popisem schématu (samodokumentace).

Frontend vždy čte tyto soubory z `data/*.json` cestou relativní k webroot — nezná
zdroje (ÚZIS, OECD, …).

---

## 1. `data/indicators.json` — datový kontrakt

**Hlavní soubor projektu.** 80 indikátorů (71 striktní HSPA + 9 doplňkový monitoring).
Frontend čte tento soubor pro skoro vše, co zobrazuje.

### Schéma

```jsonc
{
  "version": "1.0",
  "generated_at": "2026-05-18T06:00:00Z",
  "indicators": [
    {
      "id": "nadeje_doziti_total",         // unique slug, kebab snake_case
      "name": "Naděje dožití při narození", // zobrazované jméno
      "area": "Výsledky",                   // HSPA oblast: Výsledky | Výstupy | Procesy | Struktury
      "domain": "Zdravotní stav",           // doména (12 v rámci HSPA)
      "subdomain": "Doba dožití",           // subdoména
      "framework": "hspa",                  // "hspa" | "monitoring" — striktní vs doplňkový
      "dimension": "zdravi",                // 1 z 6 dimenzí (→ data/dimensions.json)
      "value": 79.9,                        // aktuální hodnota
      "unit": "let",                        // jednotka (např. "%", "let", "na 100 000")
      "year": 2024,                         // rok hodnoty
      "trend": [                            // časová řada (min. 3 body pro spark)
        {"year": 2022, "value": 79.5},
        {"year": 2023, "value": 79.7},
        {"year": 2024, "value": 79.9}
      ],
      "benchmark": {                        // mezinárodní srovnání (oba nepovinné)
        "oecd": 81.1,
        "eu": 80.9
      },
      "signal": "warn",                     // good | warn | bad | neutral (vypočteno transformem)
      "direction": "higher_is_better",      // higher_is_better | lower_is_better | context_dependent
      "source": {
        "name": "ČSÚ",                      // lidský název zdroje
        "url": "https://...",               // odkaz pro citaci
        "fetched_at": "2026-05-18T06:00:00Z",
        "origin": "seed"                    // "seed" (dev fallback) | "live" (z fetchera)
      },
      "method_card_url": "indicators/nadeje_doziti_total.json"  // odkaz na metodickou kartu
    }
  ]
}
```

### Validace

- `npm run validate:data` — `ingest/validate.js` kontroluje povinná pole, ENUM hodnoty
  (`area`, `signal`, `direction`, `framework`), strukturu trendu, formát timestamp.
- Test: každý `id` v `indicators` má odpovídající soubor `indicators/{id}.json`.

### Signal logika

Vypočtená v `ingest/transform.js`:

```js
computeSignal(value, benchmark, direction, thresholds = { good: 2, warn: 5 })
// adjusted = (value - benchmark) / benchmark * 100, sign flipped pro lower_is_better
// adjusted > +good        → "good"
// -warn ≤ adjusted ≤ +good → "warn"
// adjusted < -warn        → "bad"
// chybí benchmark || direction === "context_dependent" → "neutral"
```

---

## 2. `indicators/{id}.json` — metodické karty (80 souborů)

Detailní karta pro jeden indikátor. 1 JSON soubor = 1 indikátor. Linkováno z
`indicators.json` přes `method_card_url`.

### Schéma

```jsonc
{
  "id": "nadeje_doziti_total",
  "name": "Naděje dožití při narození",
  "area": "Výsledky",
  "domain": "Zdravotní stav",
  "subdomain": "Doba dožití",
  "definition": "Průměrný počet let, který se dožije novorozenec za daných úmrtnostních poměrů.",
  "unit": "let",
  "direction": "higher_is_better",
  "framework": "hspa",                   // hspa | monitoring
  "dimension": "zdravi",
  "data_source": {                       // konfigurace fetcheru
    "primary": {
      "type": "csu_datastat",            // csu_datastat | oecd_sdmx | eurostat_jsonstat | uzis_nrpzs | sukl | nrc
      "endpoint": "https://...",
      "dataset": "DEM_NADEZE",
      "dimensions": { "sex": "T", "uzemi": "CZ0", "vek": "0" }
    },
    "fallback": {                        // pokud primary selže
      "type": "csv",
      "url": "https://csu.gov.cz/..."
    }
  },
  "benchmark_source": {                  // odkud brát benchmark
    "type": "oecd",
    "code": "EVIETOTLPOPYRSCSU",
    "dataset": "HEALTH_STAT"
  },
  "signal_thresholds": { "good": 2, "warn": 5 },  // custom prahy (default 2/5)
  "frequency": "yearly",                 // yearly | quarterly | monthly | ad-hoc
  "stewards": ["ČSÚ", "ÚZIS"],          // kdo data spravuje
  "method_notes": "Standardizováno na evropskou populaci. Dostupné od 1991.",
  "limitations": "Nezohledňuje rozdíly v kvalitě života.",
  "patient_story": "..."                 // long-form vyprávění pro detail stránku
}
```

---

## 3. `data/articles.json` — články (63 záznamů)

Metadata všech článků v sekci Články. Tělo článku není v JSON — je v `clanek-*.html`.

### Schéma

```jsonc
{
  "version": "1.0",
  "generated_at": "...",
  "articles": [
    {
      "id": "manifest-reforma-zdravotnictvi",       // slug bez "clanek-" prefixu
      "slug": "clanek-manifest-reforma-zdravotnictvi.html",  // soubor v repo root
      "number": "M",                                 // pořadové (M pro manifest)
      "tag": "Manifest",                             // zobrazovaný tag
      "date": "2026-05-07",                          // ISO datum publikace
      "kind": "manifest",                            // article | manifest | explainer
      "title": "...",
      "perex": "Lead odstavec...",
      "linked_indicators": [                          // indikátory zmíněné v článku
        "mortalita_kardiovaskularni",
        "screening_kolorektalni"
      ],
      "linked_prevention_themes": [],                // odkazy na prevention themes
      "topics": ["legislativa"],                     // 1+ topic (viz TOPIC_LABELS v clanky.js)
      "published": true,                             // false = jen v redakce.html
      "audit-status": "verified"                     // verified | review-pending | partial | flagged | draft-flagged
    }
  ]
}
```

### Audit status

| Status | Význam | UI |
|---|---|---|
| `verified` | obsah ověřen, čísla ok | bez banneru |
| `review-pending` | upraveno, čeká review | žlutý banner |
| `partial` | text OK, čísla čekají | žlutý banner |
| `flagged` | problém → blocking | červený banner |
| `draft-flagged` | rozpracováno + flag | červený banner, jen v `redakce.html` |

### Topics

Definované v `src/clanky.js` jako `TOPIC_LABELS`. Hlavní: `legislativa`, `financovani`,
`klinika`, `prevence`, `dlouhodoba-pece`, `psychiatrie`, `eu-rules`, `digitalizace`.

---

## 4. `data/glossary.json` — glosář (110 termínů)

```jsonc
{
  "version": "1.0",
  "generated_at": "...",
  "terms": [
    {
      "key": "HSPA",                                 // zkratka / klíč
      "full": "Health System Performance Assessment", // plný název
      "short_def": "Hodnocení výkonnosti zdravotního systému — ...",
      "anchor": "hspa",                              // anchor pro #ID v glosar.html
      "aliases": ["HSPA framework"]                  // volitelné alternativní formy
    }
  ]
}
```

Použití:
- `src/glosar.js` renderuje stránku glosáře (vyhledávání, abeceda)
- `src/glossary-inline.js` skenuje text článků, obaluje výskyty `<abbr title>` + auto-link
- `src/search.js` indexuje pro fulltext

---

## 5. `data/dimensions.json` — 6 dimenzí kvality

```jsonc
{
  "version": "1.0",
  "_doc": "6 dimenzí HSPA rámce — zdraví, přístupnost, kvalita, efektivita, equity, udržitelnost.",
  "dimensions": [
    {
      "id": "zdravi",
      "label": "Zdraví",
      "short": "Zdraví",
      "color": "#2f6d4f",
      "description": "Měří, jak dlouho a jak zdravě lidé žijí — naději dožití, úmrtnost...",
      "indicator_ids": ["nadeje_doziti_total", "..."]
    }
  ]
}
```

Konzumenti: `app.js`, `hspa-prehled.js`. Vazba na indikátory přes `dimension` pole
v `indicators.json`.

---

## 6. `data/themes.json` — 8 tematických linií

```jsonc
{
  "version": "1.0",
  "themes": [
    {
      "id": "zit_dele_ve_zdravi",
      "title": "Žít déle ve zdraví",
      "kicker": "Tematická linie 01",
      "headline": "Žijeme déle, ale ne zdravěji...",
      "lead": "Long-form intro odstavec...",
      "color": "red",                                // CSS color token
      "indicator_ids": ["nadeje_doziti_total", "..."],
      "strategy_ids": ["narodni_kvplan_2035", "..."],
      "explainer_ids": ["dansko_stroke_care"]
    }
  ]
}
```

Vazby: `indicator_ids → indicators.json`, `strategy_ids → strategies.json`,
`explainer_ids → explainers.json`. Konzument: `tematicke-linie.html` přes `themes.js`.

---

## 7. `data/strategies.json` — národní strategické dokumenty (33 záznamů)

```jsonc
{
  "version": "1.0",
  "strategies": [
    {
      "id": "zdravi_2035",
      "title": "Zdraví 2035",
      "subtitle": "Strategický rámec rozvoje péče o zdraví v ČR do roku 2035",
      "level": "national",                           // national | sector | institution | eu | global | standard
      "scope": "framework",
      "status": "active",                            // active | draft | superseded | expired
      "owner": "MZČR",
      "co_owners": ["Vláda ČR"],
      "horizon": { "from": 2025, "to": 2035 },
      "topics": ["framework", "public_health", "prevention"],
      "tldr_public": "...",                          // audience-specific TL;DRs
      "tldr_expert": "...",
      "tldr_policy": "...",
      "linked_indicators": ["nadeje_doziti_total", "..."],
      "related_strategies": ["zdravi_2030", "ehealth_2025_2035"],
      "documents": [
        { "title": "Strategický rámec (PDF)", "url": "https://...", "lang": "cs" }
      ],
      "external_refs": {
        "eu": ["eu4health_2021_2027"],
        "global": ["who_epw_2020_2025"]
      },
      "monitoring": {
        "frequency": "yearly",
        "next_review": "2027-12-31"
      },
      "tags": ["MZČR", "Vláda ČR"],
      "verified_at": "2026-05-05"
    }
  ]
}
```

Validátor: `npm run validate:strategies` (`ingest/validate-strategies.js`).

---

## 8. `data/explainers.json` — kontextové texty (28 záznamů)

Explainery jsou samostatné dlouhé texty (politika, reformy, koncepty) — pro koho
článek je moc úzký a strategie moc oficiální. Renderované na `jak-funguje.html` a
inline na detail stránkách.

```jsonc
{
  "version": "1.7",
  "explainers": [
    {
      "id": "pojistovny",
      "title": "Zdravotní pojišťovny",
      "subtitle": "Veřejnoprávní pojišťovny...",
      "category": "actors",                          // actors | money | classification | process | inspiration
      "tldr_public": "...",
      "tldr_expert": "...",
      "tldr_policy": "...",
      "key_facts": [
        { "label": "Počet pojišťoven", "value": "7" }
      ],
      "linked_indicators": ["..."],
      "linked_strategies": ["..."],
      "linked_articles": ["..."],
      "verified_at": "2026-05-05"
    }
  ]
}
```

Validátor: `npm run validate:explainers`.

---

## 9. `data/prevention.json` — prevence

Struktura mimo „array záznamů" — má hero + flow + themes.

```jsonc
{
  "version": "2026-05-06",
  "hero": { "title": "...", "lead": "..." },
  "flow_steps": [                                    // 4 kroky "od života k péči"
    { "num": "01", "name": "Každodenní volby", "arrow": "jídlo → pohyb → spánek", "desc": "..." }
  ],
  "themes": [                                        // detailní obsah per téma
    {
      "id": "jidlo",
      "name": "Jídlo",
      "lead": "...",
      "actions": [...],
      "linked_indicators": ["..."]
    }
  ]
}
```

Validátor: `npm run validate:prevention`. Konzument: `prevence.html` přes `prevence.js`.

---

## 10. `data/regions.json` — krajská data (multi-dataset v2)

```jsonc
{
  "version": "2.1",
  "_doc": "Krajská data — multi-dataset format. Každý dataset = jeden indikátor × kraje.",
  "datasets": [
    {
      "id": "nadeje_doziti_men",
      "indicator_id": "nadeje_doziti_total",         // odkaz na indikátor v indicators.json
      "name": "Naděje dožití (muži)",
      "unit": "let",
      "year": 2024,
      "country_avg": 77,
      "direction": "higher_is_better",
      "regions": [
        { "code": "CZ010", "name": "Praha", "value": 78.4 },
        { "code": "CZ020", "name": "Středočeský", "value": 77.6 }
      ]
    }
  ]
}
```

Konzumenti: `kraje.html` (`kraje.js`), `indicator.html` (`indicator.js`).
Region kódy odpovídají NUTS3 a polím v `cz-regions.geojson`.

---

## 11. `data/cz-regions.geojson` — krajské polygony

Standardní GeoJSON FeatureCollection s 14 features (kraje). Klíčové property:

```jsonc
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "code": "CZ010",           // NUTS3 kód — joinuje s regions.json
        "name": "Hlavní město Praha"
      },
      "geometry": { "type": "Polygon", "coordinates": [...] }
    }
  ]
}
```

Konzumenti: `cz-map.js`, `pojistenci.js`, `kraje.js`.

---

## 12. `data/pojistenci-d5-{kraj,okres,zp}.json` — OIS 11-47

3 soubory, jeden per agregace (kraj × okres × zdravotní pojišťovna).
Specifický formát s pivotováním přes roky.

```jsonc
{
  "version": "1.0",
  "generated_at": "...",
  "source": {
    "name": "ÚZIS · Centrální registr pojištěnců (CRP)",
    "dataset": "OIS 11.47 — Struktura pojištěnců",
    "publisher": "Ústav zdravotnických informací a statistiky ČR",
    "portal_url": "https://www.nzip.cz/dohodovaci-rizeni",
    "csv_filename": "...",
    "licence": "CC-BY 4.0"
  },
  "years": [2010, 2011, ..., 2025],                  // dostupné roky
  "krajs": [                                         // unique krajs s metadata
    { "code": "CZ010", "name": "Praha", "shortLabel": "PHA" }
  ],
  "age_groups": ["0-14", "15-64", "65+"],
  "sexes": ["M", "F", "T"],
  "data": [...],                                     // multi-dimensional array
  "rows_processed": 12345,
  "rows_skipped": 0
}
```

Generovaný `ingest/transform_pojistenci_d5.js`. Konzument: `pojistenci.js`.

---

## 13. `data/freshness.json` — freshness tracking

```jsonc
{
  "version": "1.0",
  "updated_at": "2026-05-18T...",
  "current": {                                       // současný stav
    "date": "2026-05-18",
    "total": 80,
    "live": 24,                                      // počet z fetcheru (ne seed)
    "live_ratio": 0.3,
    "by_origin": { "seed": 56, "live": 24 },
    "by_source": {
      "OECD Health Statistics": { "total": 12, "live": 5, "seed": 7 }
    }
  },
  "history": [                                       // denní snímky pro graf
    { "date": "2026-05-06", "generated_at": "...", "total": 58, "live": 2, ... }
  ]
}
```

Generovaný `ingest/verify-freshness.js`. Interní — frontend nečte.

---

## 14. `data/snapshot-YYYY-MM-DD.json` — denní snapshoty

Kompletní kopie `indicators.json` v daný den. Slouží jako historický záznam
(audit trail, regrese, "co se změnilo"). Frontend tyto soubory nečte.

---

## Vztahy mezi datasety

```
                    ┌──────────────────────┐
                    │   indicators.json    │ (80) ←──┐
                    │   (datový kontrakt)  │         │
                    └──────────┬───────────┘         │
                               │                     │
                ┌──────────────┼──────────────┐      │
                │              │              │      │
                ▼              ▼              ▼      │
       ┌──────────────┐ ┌──────────┐ ┌──────────────┴───┐
       │ articles.json│ │themes    │ │indicators/*.json │
       │   (63)       │ │.json (8) │ │ (80 metod. karet)│
       │ linked_      │ │indicator │ └──────────────────┘
       │ indicators[] │ │_ids[]    │
       └──────┬───────┘ └────┬─────┘
              │              │
              ├──────────────┤
              ▼              ▼
       ┌──────────────────────────┐
       │ strategies.json (33)     │ ←─── linked_indicators[]
       │ explainers.json (28)     │ ←─── linked_indicators[]
       │ prevention.json          │ ←─── linked_indicators[]
       └──────────────────────────┘

       ┌──────────────────┐
       │ regions.json     │ ─── indicator_id (FK → indicators.json)
       │ cz-regions       │ ─── code (FK → NUTS3)
       │ .geojson         │
       │ pojistenci-d5-*  │
       └──────────────────┘

       ┌──────────────────┐
       │ glossary.json    │  (110 termínů, samostatný namespace)
       │ dimensions.json  │  (6 dimenzí, FK přes indicators.dimension)
       │ freshness.json   │  (interní audit)
       └──────────────────┘
```

## Foreign keys

| FK | Z čeho | Do čeho |
|---|---|---|
| `articles.linked_indicators[]` | `articles.json` | `indicators.json#id` |
| `themes.indicator_ids[]` | `themes.json` | `indicators.json#id` |
| `themes.strategy_ids[]` | `themes.json` | `strategies.json#id` |
| `themes.explainer_ids[]` | `themes.json` | `explainers.json#id` |
| `strategies.linked_indicators[]` | `strategies.json` | `indicators.json#id` |
| `strategies.related_strategies[]` | `strategies.json` | `strategies.json#id` (self) |
| `explainers.linked_indicators[]` | `explainers.json` | `indicators.json#id` |
| `indicators.dimension` | `indicators.json` | `dimensions.json#id` |
| `indicators.method_card_url` | `indicators.json` | path to `indicators/{id}.json` |
| `regions.datasets[].indicator_id` | `regions.json` | `indicators.json#id` |
| `regions.datasets[].regions[].code` | `regions.json` | `cz-regions.geojson#properties.code` |
| `pojistenci.krajs[].code` | `pojistenci-d5-*.json` | `cz-regions.geojson#properties.code` |

## Validátory

| Skript | Co kontroluje |
|---|---|
| `npm run validate:data` | `indicators.json` schéma, FK na metodické karty |
| `npm run validate:strategies` | `strategies.json` ENUM, FK, povinná pole |
| `npm run validate:explainers` | `explainers.json` schéma |
| `npm run validate:prevention` | `prevention.json` schéma |
| `npm run validate:all` | spustí všechny 4 |
| `npm run verify:freshness` | aktualizuje `freshness.json`, fail při > 30 dní staré data |

Testy v `tests/`:
- `transform.test.js` — signál výpočty, edge cases
- `frontend.test.js` — smoke test datového kontraktu
- `strategies-frontend.test.js`, `pojistenci_frontend.test.js`, `prevention.test.js` — per-dataset smoke
- `verify-freshness.test.js` — freshness pravidla

## Schéma versioning

Při breaking change v dataset schématu:

1. Bump `version` (major: `"1.0"` → `"2.0"`).
2. Přidej migrační poznámku do `_doc` pole.
3. Update validátoru.
4. Update konzument modulů v `src/`.
5. Update testů.
6. Update této dokumentace.

Frontend by měl odmítnout dataset s neočekávaným major version.

---
*Verze 1.0 · květen 2026*
