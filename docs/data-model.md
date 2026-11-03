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
      "benchmark": {                        // mezinárodní srovnání (všechny klíče nepovinné)
        "oecd": 81.1,
        "eu": 80.9,
        "other": 11                         // průměr jiné sítě než OECD/EU (HBSC, ESPAD…) — jen se seedem
      },
      "benchmark_labels": { "other": "HBSC" },  // POVINNÉ, je-li benchmark.other: krátký token (≤ 16 znaků),
                                            // UI z něj skládá „HBSC průměr“ / „průměrem HBSC“; detail (44 zemí, rok)
                                            // patří do benchmark_source.note metodické karty. Validuje ingest/validate.js
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

### `source.origin` (seed/live) — proč je jen v kontraktu, ne v kartě

Metodická karta **záměrně nemá** pole `origin`/`fetched_at`. Rozhodnutí (U11,
2026-07): `origin` popisuje stav **konkrétního ingest běhu** — jestli poslední
`npm run transform` získal hodnotu z živého fetcheru, nebo spadl zpět na seed
(např. zdroj je dole, mapping chybí, sandbox bez síťového přístupu). To je
vlastnost běhu pipeline, ne vlastnost metodiky indikátoru — proto žije jen
v `data/indicators.json.indicators[].source.origin`, který transform
přegeneruje při každém běhu. Kopírovat ho i do karty by vytvořilo dva zdroje
pravdy, které se rozjedou (karta je commitovaná ručně, kontrakt se přepisuje
týdenním cronem).

Karta místo toho nese **editorial** pole `verification_status` (`verified` |
`preliminary` | `illustrative` | ...) + `verified_at` — to je tvrzení redakce
„metodiku a zdroj jsme ověřili", nezávislé na tom, jestli si dnešní cron běh
vyzvedl live hodnotu. Transform tato pole přenáší pass-through do
`data/indicators.json` (`ingest/transform.js`, `buildIndicator`).

**Očekávaný vztah:** karta s `verification_status: "verified"` by měla
odpovídat záznamu v kontraktu s `source.origin: "live"` — „ověřili jsme zdroj"
dává smysl jen pro hodnotu, která z něj skutečně živě přišla. Pokud karta tvrdí
`verified`, ale kontrakt má `origin: "seed"` (fetcher zrovna spadl na seed,
nebo ověření proběhlo dřív než napojení fetcheru), jde o dočasnou nekonzistenci
— ne chybu schématu, ale signál k dořešení (dodělat/opravit fetcher pro daný
indikátor).

Konzistenci hlídá `tests/verification-origin-consistency.test.js`:
- projde všechny karty s `verification_status: "verified"` a ověří
  `source.origin === "live"` v `data/indicators.json`,
- **nové** nekonzistence (id mimo snapshot `KNOWN_SEED_VERIFIED_EXCEPTIONS`
  v testu) test shodí,
- existující výjimky (7 ke dni 2026-07-06 — viz seznam v testu) jsou dočasně
  tolerované, aby test nerozbil CI na nekonzistencích, které čekají na
  dokončení fetcherů. Jakmile se pro daný indikátor doplní live fetcher, id
  ze seznamu výjimek odeber (test na to sám neupozorní).

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
      "number": "M",                                 // redakční pořadové; přiděluje publikační cron, ne draft ("M" = manifest)
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
      "audit-status": "verified",                    // verified | review-pending | partial | flagged | draft-flagged
      "scheduled_for": "2026-06-04",                 // volitelné — „ne dřív než": cron nepublikuje před tímto datem
      "topical_until": "2026-06-01",                 // volitelné — do kdy je téma aktuální; bližší datum = dřív ven
      "ready_since": "2026-05-22"                    // datum, kdy článek poprvé prošel review holdem (stamp cronu)
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

> **PREV-PERSONA (U27):** každé téma má `life_phases` (pole z `mlada_rodina | dospeli_40 | seniori_65`) — pohání persona filtr na `prevence.html`. Editorská kategorizace dle obsahu tématu; univerzální životní styl = všechny fáze. Vynucuje `ingest/validate-prevention.js`.

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

## 15. `data/dohodovaci-rizeni.json` — datová podpora dohodovacího řízení

Frontend kontrakt stránky `dohodovaci-rizeni.html`. **Sady nejsou HSPA
indikátory** — jde o provozní a ekonomická data dohodovacího řízení (zdroj NZIP
/ ÚZIS ČR). Samostatný namespace, mimo `indicators.json`.

```jsonc
{
  "version": "1.0",
  "generated_at": "...",
  "negotiation_context": { "title": "...", "lead": "...", "negotiation_year": 2027,
                           "summary": { "datasets_total": 44, "dimensions": 8, "interactive_only": 7 } },
  "dimensions": [                          // 9 — osm dimenzí + doplňkové registry
    { "id": "d2", "number": 2, "label": "Personální zabezpečení",
      "color": "#0b5394", "description": "...", "dataset_ids": ["ois-11-12", "..."] }
  ],
  "datasets": [{
    "id": "sss-04-02",                     // slug z OIS/NR/SSS kódu
    "ois_code": "SSS-04-02",
    "dimension": "d9",                     // FK → dimensions[].id
    "title": "...",
    "nzip_page": "https://www.nzip.cz/...",
    "status": "ready",                     // ready | external | stub
    "reference_period": "...", "cadence": "...", "editions": ["2025-01"],
    "role_in_negotiation": "...", "what_it_says": "...",
    "headline": { "value": 16.4, "unit": "...", "year": 2024, "label": "..." },
    "series": [{ "key": "ct", "label": "...", "unit": "...",
                 "points": [{ "year": 2006, "value": 13.0 }] }],
    "series_periods": [{ "key": "...", "label": "...", "unit": "...",
                 "points": [{ "period": "rok 2024", "value": 0 }] }],  // ISPV: srovnání období
    "pyramid": { "age_bands": ["Do 29", "..."],                         // věk × pohlaví snapshot
                 "muzi": [{ "band": "Do 29", "value": 0 }],
                 "zeny": [{ "band": "Do 29", "value": 0 }] },
    "method_note": "...",
    "international": { "available": true, "status": "pending", "comparator": "...",
                       "cz": 0, "oecd": 0, "eu": 0, "unit": "...", "explanation": "..." },
    "visualization": { "data_cut": "...", "primary_chart": "line",
                       "animation": { "pattern": "...", "rationale": "...", "controls": [] },
                       "uses_3d": false, "engine": "chartjs", "fallback_2d": "...", "rationale": "..." },
    "source": { "name": "...", "publisher": "...", "nzip_page": "...", "latest_file": "..." }
  }],
  "announced": { "source": { "title": "...", "url": "...", "as_of": "2026-02-25" }, "checked_at": "2026-10-30",
                 "items": [ { "number": "6.4", "dimension": "d6", "title": "...", "description": "...",
                              "status": "...", "hspa_relevance": "..." } ] },
  "edition_notes": [ { "ois_code": "OIS-11-06", "title": "...", "text": "..." } ],
  "data_policy": { "title": "...", "text": "...", "url": "...", "pdf": "..." },
  "interactive_only": [ { "page_id": "1909", "title": "...", "nzip_page": "..." } ]
}
```

`announced`, `edition_notes` a `data_policy` přebírá builder z ručně psaného
`ingest/dohodovaci-rizeni-ohlasene.json` (ohlášené, zatím nepublikované sady se
stavem podle veřejné prezentace ÚZIS; poznámky k revizím, zlomům a zadrženým
edicím; rámec zveřejňování dat NZIS). Když ohlášená sada vyjde, přesune se
z `announced.items` do katalogu.

Pipeline:

```
ingest/fetchers/nzip_dohodovaci_rizeni.js   stáhne XLSX → ingest/cache/dohodovaci-rizeni/
ingest/transform_dohodovaci_rizeni.js       XLSX → ingest/nzip-extracts/{OIS}.json
ingest/build-dohodovaci-rizeni.js           katalog + extrakty + overlay → data/dohodovaci-rizeni.json
```

Spuštění celé pipeline: `npm run data:dohodovaci-rizeni`. Transform u sad
z refreshe 2026-10 čte roky ze souboru (záhlaví „Rok 2025 – …“, listy „Rok 2025“,
titulní řádek „Hodnocené období: rok 2025“) — nová edice proto nevyžaduje úpravu
kódu, dokud ÚZIS nezmění rozvržení tabulky. Edici, která v titulku uvádí podezřelé
období, lze v katalogu zadržet (vynechat z `editions`, důvod do `edition_hold_note`). Redakční overlay
(role, interpretace, mezinárodní srovnání, vizualizační rozvaha) je ručně psaný
`ingest/dohodovaci-rizeni-content.json`. XLSX parsuje `ingest/lib/xlsx.js`
(wrapper nad SheetJS). Validátor: `npm run validate:dohodovaci-rizeni`.
Konzument: `dohodovaci-rizeni.html` přes `src/dohodovaci-rizeni.js`.

| Status | Význam |
|---|---|
| `ready` | plně zpracováno — má `series` + `headline` |
| `external` | zpracováno na vlastní stránce (`external_page`), např. atlas pojištěnců |
| `stub` | jen metadata + odkaz na NZIP; čeká na zpracování ve vlně dimenze |

---

## 16. `data/legislativa.json` — legislativní radar (VeKLEP)

Přehled zdravotnické legislativy v přípravě (návrhy zákonů, vyhlášek a nařízení
vlády). Zdroj: VeKLEP (Elektronická knihovna legislativního procesu, Úřad vlády
ČR) přes API Hlídače státu (`search_veklep_legislation`). Záznamy jsou ručně
kurátorované — výběr pokrývá legislativu s přímým dopadem na výkonnost
zdravotního systému. Automatickou aktualizaci řeší úkol U20 (denní rutina).

```jsonc
{
  "version": "1.0",
  "generated_at": "2026-07-06T00:00:00Z",
  "source": { "name": "...", "veklep_url": "...", "hlidac_url": "...", "note": "..." },
  "items": [
    {
      "id": "novela-elektronizace-zdravotnictvi-2026",  // interní slug
      "veklep_id": "ALBSDVLDLD32",                      // PID materiálu ve VeKLEP
      "title": "Návrh zákona, kterým se mění zákon č. 325/2021 Sb., ...",
      "title_short": "Novela zákona o elektronizaci zdravotnictví",
      "type": "zakon",                                  // zakon | vyhlaska | narizeni_vlady
      "submitter": "Ministerstvo zdravotnictví",        // předkladatel
      "phase": "pripominky",                            // pripominky | vyporadani | vlada | parlament | dokonceno | stazeno
      "veklep_status": "2 - v připomínkovém řízení",    // stav materiálu ve VeKLEP (raw)
      "veklep_url": "https://odok.cz/portal/veklep/material/ALBSDVLDLD32/",
      "annotation": "...",                              // redakční anotace (co návrh mění a proč je důležitý)
      "dates": {
        "authorized": "2026-07-03",                     // datum autorizace ve VeKLEP
        "last_change": "2026-07-03",                    // poslední změna materiálu
        "comments_until": "2026-08-03"                  // termín připomínek (null pokud neběží)
      },
      "linked_indicators": ["ehealth_adoption"],        // FK → indicators.json#id
      "linked_articles": ["novela-elektronizace-2026"], // FK → articles.json#id
      "verified_at": "2026-07-06"                       // kdy redakce záznam naposledy ověřila proti VeKLEP
    }
  ]
}
```

Fáze (`phase`) je redakční zjednodušení stavů VeKLEP pro filtr v UI:

| Fáze | VeKLEP stavy | Význam |
|---|---|---|
| `pripominky` | `2` | v připomínkovém řízení — lze podávat připomínky |
| `vyporadani` | `3`, `9PK` | připomínkové řízení ukončeno / projednáno pracovními komisemi LRV |
| `vlada` | `8` | zařazeno na jednání vlády |
| `parlament` | `CE`, `D` | zaevidováno / projednáváno v PSP |
| `dokonceno` | `A`, `B`, `SZ` | zapracovány změny / signováno / odesláno do Sbírky |
| `stazeno` | — (ručně, s `phase_note` a zdrojem) | předkladatel nebo vláda materiál stáhli z projednávání; kód VeKLEP zůstává (např. `7`), doklad je mimo registr (Legislativní newsletter MZ, usnesení vlády) |

Validátor: `npm run validate:legislation` (`ingest/validate-legislation.js`) —
ENUM `type`/`phase`, povinná pole, unikátní `id` + `veklep_id`, formát dat
(YYYY-MM-DD), `veklep_url` na doméně odok.cz a FK na indikátory + články.
Konzument: `legislativa.html` přes `src/legislativa.js` (tabulka + filtr fází).

### 16.1 `legislativa.json` — legislativní plán MZ (`plan_meta` + `plan_items`)

Samostatná sekce v témže souboru, nad radarem (`items`). Zatímco `items`
sleduje aktuální stav materiálů ve VeKLEP, `plan_meta`/`plan_items` sleduje
**plnění plánu legislativních prací vlády** — co MZ slíbilo předložit a v jakém
termínu, a jak to reálně plní. Sekce je volitelná (validuje se jen pokud je
`plan_meta` nebo `plan_items` v souboru přítomné).

```jsonc
{
  "_plan_doc": "...",                                 // redakční poznámka k plánu (zdroj, kdy ověřeno)
  "plan_meta": {
    "usneseni": "č. 175",                             // číslo usnesení vlády, kterým byl plán schválen
    "schvaleno": "2026-03-23",                         // YYYY-MM-DD
    "zdroj_nazev": "Plán legislativních prací vlády na zbývající část roku 2026 (příloha č. 1 k usnesení vlády ze dne 23. března 2026 č. 175)",
    "zdroj_url": "https://vlada.gov.cz/..."            // musí mířit na https://(www.)vlada.gov.cz/
  },
  "plan_items": [
    {
      "id": "plan-novela-ochrana-verejneho-zdravi-pitna-voda",  // interní slug
      "nazev": "Novela zákona o ochraně veřejného zdraví (výrobky v kontaktu s pitnou vodou)",
      "popis": "...",                                  // redakční popis, co novela dělá a proč
      "typ": "novela_zakona",                           // ustavni_zakon | vecny_zamer | zakon | novela_zakona |
                                                         // narizeni_vlady | novela_narizeni | vyhlaska | novela_vyhlasky
      "plan_termin": "2026-04",                         // YYYY-MM — termín předložení vládě podle plánu
      "ria": false,                                     // boolean|null — podléhá RIA (hodnocení dopadů regulace)?
      "stav": "vlada",                                  // nezahajeno | pripominkove_rizeni | vlada | parlament | sbirka | stazeno
      "veklep_pid": "ALBSDRVH64TT",                      // PID materiálu ve VeKLEP (nepovinné, dokud stav = nezahajeno)
      "veklep_url": "https://odok.cz/portal/veklep/material/ALBSDRVH64TT/",
      "radar_id": "novela-ochrana-verejneho-zdravi-pitna-voda-2026",  // FK → legislativa.items[].id (nepovinné)
      "plneni_poznamka": "Plán: předložení vládě duben 2026. ... — oproti plánu zhruba tříměsíční skluz.",
      "zdroje": [                                       // pole { nazev, url } — http(s) URL
        { "nazev": "Plán legislativních prací vlády ... (usnesení č. 175)", "url": "https://vlada.gov.cz/..." },
        { "nazev": "VeKLEP — detail materiálu ALBSDRVH64TT", "url": "https://odok.cz/portal/veklep/material/ALBSDRVH64TT/" }
      ]
    }
  ]
}
```

Pravidla validátoru (`validatePlan()` v `ingest/validate-legislation.js`):

- **Povinná pole `plan_meta`**: `usneseni`, `schvaleno`, `zdroj_nazev`, `zdroj_url`
  (`schvaleno` ve formátu YYYY-MM-DD, `zdroj_url` na doméně vlada.gov.cz).
- **Povinná pole `plan_items[]`**: `id`, `nazev`, `popis`, `typ`, `plan_termin`, `stav`.
- **ENUM**: `typ` ∈ `VALID_PLAN_TYPES`, `stav` ∈ `VALID_PLAN_STAV`.
- **`id` unikátní** napříč `plan_items`.
- **`plan_termin`** formát YYYY-MM.
- **`ria`** musí být boolean nebo `null`.
- **`veklep_url` podmíněně povinné**: jakmile `stav !== 'nezahajeno'`, musí být
  vyplněné (materiál už ve VeKLEP existuje); pokud vyplněné, musí mířit na
  `https://odok.cz/portal/veklep/`.
- **`radar_id`** (nepovinné) je FK — pokud vyplněné, musí odkazovat na existující
  `id` v `legislativa.items[]` v témže souboru.
- **`zdroje[]`** (nepovinné) — pole objektů `{ nazev, url }`, `url` musí být http(s).

„Po termínu" (`isPlanItemOverdue()` v `src/legislativa.js`) = `plan_termin`
(měsíc) je v minulosti **a** `stav` je stále `nezahajeno` nebo
`pripominkove_rizeni` — položky, které už reálně dorazily na vládu/do Parlamentu/
Sbírky, se „po termínu" neznačí bez ohledu na to, jak pozdě k tomu došlo.

Konzument: `legislativa.html` přes `src/legislativa.js` — samostatná sekce
„Legislativní plán ministerstva" nad tabulkou radaru (souhrnná počitadla:
v procesu / ve Sbírce / nezahájeno / po termínu, filtr podle stavu).

---

## 17. `data/system-model.json` — kauzální model systému

Interaktivní kauzální mapa na `model-systemu.html` (PLAN-SYSTEM-MODEL.md).
Uzly = oblasti/páky systému ve 4 vrstvách HSPA, hrany = kauzální vazby
s polaritou. Layout je kurátorovaný (pevné souřadnice), žádný algoritmus.

### Schéma

```jsonc
{
  "version": "1.0",
  "generated_at": "<ISO8601>",
  "nodes": [{
    "id": "prevence_screeningy",       // unikátní, snake_case
    "label": "Prevence a screeningy",  // krátký český label (SVG uzel)
    "layer": "Procesy",                // Struktury | Procesy | Výstupy | Výsledky
    "kind": "lever",                   // lever (páka) | flow (průtok) | outcome (výsledek)
    "x": 350, "y": 260,                // střed uzlu ve viewBox 1000×768
    "desc": "1–3 věty co uzel je",
    "indicators": ["screening_kolorektalni"],   // FK → indicators.json#id
    "articles": ["clanek-vydaje-prevence.html"],// FK → articles.json#slug
    "explainers": []                   // FK → explainers.json#id (nepovinné)
  }],
  "edges": [{
    "id": "prevence_to_mortalita",     // unikátní
    "from": "prevence_screeningy",     // FK → nodes.id
    "to": "odvratitelna_mortalita",    // FK → nodes.id (bez self-loops)
    "polarity": "plus",                // plus = podporuje | minus = zatěžuje cíl
    "mechanism": "1 věta jak vazba funguje",
    "strength": "strong",              // strong | weak (vizuální tloušťka)
    "articles": []                     // doklad vazby (nepovinné)
  }]
}
```

### Validace

`npm run validate:system-model` (`ingest/validate-system-model.js`): enumy,
FK na indikátory/články/explainery, unikátní id, bez self-loops, bez osiřelých
uzlů, každý uzel má aspoň 1 indikátor nebo článek. Testy:
`tests/system-model.test.js` (vč. BFS „každá páka dosáhne na výsledek").

Konzument: `model-systemu.html` přes `src/system-model.js` (SVG graf, detail
panel se živými hodnotami indikátorů, režim „Zatlačit na páku" = BFS downstream).

---

## 18. `data/claims.json` — registr kvantitativních tvrzení

Strukturovaný registr podstatných čísel ze VŠECH článků (PLAN-CLAIMS.md).
Nahrazuje ruční hlídání driftu: tvrzení s `check: "auto"` porovnává noční
skener s aktuální hodnotou indikátoru (kategorie `claims-drift`/`claims-stale`
v `scripts/nightly-scan.js`). Registr se mění jen commitem; skener je read-only.

### Schéma

```jsonc
{
  "version": "1.0",
  "generated_at": "<ISO8601>",
  "claims": [{
    "id": "alkohol-spotreba--03",      // {article_id}--{NN}, unikátní
    "article": "clanek-alkohol-spotreba.html",  // FK → articles.json#slug
    "quote": "Češi vypijí 14,4 litru…",// DOSLOVNÝ úryvek textu (≤240 znaků);
                                        // strojově ověřuje claims-verify-quotes.js
    "metric": "spotřeba čistého alkoholu na osobu 15+ za rok",
    "value": 14.4,                      // normalizované číslo (tečka)
    "unit": "l/os./rok",
    "as_of": 2024,                      // rok platnosti (POVINNÉ pro check=auto)
    "location": "prose",                // prose | counter | databox | perex
    "indicator_id": "alkohol_spotreba", // FK → indicators.json#id (nepovinné)
    "relation": "exact",                // exact | derived | related | external
    "check": "auto",                    // auto | manual | none
    "tolerance_pct": 2,                 // default 2 (nepovinné)
    "source_note": "OECD HAaG 2025"     // (nepovinné)
  }]
}
```

Invariant: `check: "auto"` ⇒ `relation: "exact"` ∧ `indicator_id` ∧ `as_of`
vyplněné (bez `as_of` by skener neuměl detekovat `claims-stale`) —
strojově se hlídají JEN přímé citace hodnoty indikátoru (stejná metrika,
populace, jednotka). Metodická odchylka (recorded vs. total alkohol, pozvaní
vs. cílová populace) = `related` + `manual` s vysvětlením v `metric`.

### Validace

`npm run validate:claims` = `ingest/validate-claims.js` (schéma, FK, invarianty)
+ `scripts/claims-verify-quotes.js` (každý quote je doslovně dohledatelný
v článku). Testy: `tests/claims.test.js`. Drift-check: `checkClaim()` v
`scripts/nightly-scan.js`.

---

## 19. `data/barometr.json` — Barometr politických prohlášení

Závazky vlády + výroky politiků konfrontované s indikátory. Normativní
pravidla (enumy, rozhodovací algoritmy stavů a verdiktů) definuje
[`docs/metodika-barometr.md`](metodika-barometr.md) — validátor
`ingest/validate-barometr.js` je vynucuje.

```json
{
  "meta": { "zdroj": {...}, "changelog": [] },
  "commitments": [{
    "id": "pp2026-primarni-pece",
    "citace_verbatim": "…",              // doslovná citace z primárního zdroje
    "zdroj": {"nazev": "…", "url": "…", "datum": "YYYY-MM-DD"},
    "oblast": "…",
    "interpretace": "…",                  // náš falzifikovatelný checkpoint (rozporovatelný)
    "linked_indicators": [{"id": "…", "baseline_value": 0, "baseline_year": 2024, "direction_wanted": "up|down"}],
    "legislativa_ids": ["…"],            // FK na data/legislativa.json (items i plan_items)
    "stav": "nema_meritelny_obsah|ceka_na_data|plni_se|bez_pohybu|opacny_smer|splneno",
    "stav_duvod": "…", "stav_od": "YYYY-MM-DD",
    "historie": [{"datum": "…", "zmena": "…", "duvod": "…"}]
  }],
  "statements": [{
    "id": "kdo-YYYY-MM-DD-slug",
    "vyrok_verbatim": "…", "kdo": "…", "funkce": "…", "kdy": "YYYY-MM-DD",
    "kde": {"nazev": "…", "url": "…"},
    "verdikt": "sedi_s_daty|nesedi|zavadejici_kontext|neoveritelne",
    "verdikt_zduvodneni": "…",            // povinně s čísly a zdrojem
    "linked_indicators": ["…"], "zdroje": [{"nazev": "…", "url": "…"}]
  }]
}
```

Baseline je zamrazená k datu slibu (musí odpovídat bodu `trend` řady
indikátoru). Stavy přepočítává rutina (`PROMPT_ROUTINE.md`, blok D),
kandidáty výroků sbírá její discovery (blok C). Opravy jen přes `meta.changelog[]`.

### Výhled 2027–2029 (`plan_vyhled_meta` + `horizont`)

Sekce plánu drží i výhled legislativních prací na léta 2027–2029 (příloha č. 2
téhož usnesení). Rozlišuje se polem `horizont` na položce `plan_items`:
`'2026'` (chybějící = default) nebo `'vyhled-2027-2029'`. Metadata výhledového
dokumentu jsou v `plan_vyhled_meta` (stejná struktura jako `plan_meta`). UI
`legislativa.html` přepíná mezi horizonty segmentem „Plán 2026 / Výhled 2027–2029".

## 20. `data/souvislosti.json` — znalostní graf (generovaný)

**Negeneruj ručně** — vzniká build-time skriptem `scripts/build-souvislosti.js`
(`npm run build:souvislosti`, součást refresh pipeline). Pro každý indikátor
agreguje typované vazby napříč datasety:

| Vazba | Zdroj |
|---|---|
| uzly/páky kauzálního modelu | `data/system-model.json` |
| legislativa v běhu + plán MZ | `data/legislativa.json` |
| články | `data/articles.json` (`linked_indicators`) |
| kvantitativní tvrzení | `data/claims.json` |
| závazky a výroky Barometru | `data/barometr.json` |

Konzumuje `barometr.html` a blok „Souvislosti" na detailu indikátoru.

## 21. `data/pohotovosti.json` — pohotovostní služba (generovaný)

**Negeneruj ručně** — vzniká z `ingest/transform_pohotovosti.js`
(`npm run data:pohotovosti`). Slévá tři zdroje, z nichž žádný sám nestačí:

| Zdroj | Co dodává | Co nemá |
|---|---|---|
| VZP — `pohotovosti.vzp.cz` (scrape) | ordinační doba po dnech, typ služby, telefon, celá ČR | souřadnice, napojení na registr |
| ÚZIS NRPZS (open data CSV) | souřadnice, přesná adresa, urgentní příjmy, základny ZZS | ordinační dobu nevede vůbec |
| Otevřená data krajů (4 ze 14) | popis místa v areálu, krajské souřadnice, rozpisy zubních služeb | pokrývá jen čtvrtinu republiky |

**Proč zrovna VZP:** zákonem č. 290/2025 Sb. přešla od 1. 1. 2026 odpovědnost
za pohotovostní službu z krajů na zdravotní pojišťovny. Krajské přehledy tím
přestaly být primárním zdrojem a slouží už jen jako doplněk a kontrola.

**Proč se joinuje přes adresu:** kód místa u VZP je `{IČZ}_{typ}` — IČZ je
interní číslo zařízení u pojišťovny. Na IČO ani na kód místa poskytování
v NRPZS nesedí ani jednou z 283 položek. Jediné společné pole je adresa
(`ingest/lib/pohotovosti-geo.js`); 272 z 283 se spáruje na úroveň domu,
zbytek spadne na střed obce a nese `geo_source: 'obec'`.

### Schéma

```json
{
  "version": "1.0",
  "generated_at": "2026-08-31T10:00:00Z",
  "legal": {
    "law":    { "title": "Zákon č. 290/2025 Sb. …", "effective_from": "2026-01-01" },
    "decree": { "title": "Vyhláška č. 380/2025 Sb. …", "url": "…", "minimum_scope": { "lps_dospeli": "§ 2 odst. 1: …" } }
  },
  "sources": [{ "id": "vzp", "name": "…", "url": "…", "role": "…", "fetched_at": "…" }],
  "coverage": { "places_total": 283, "places_with_hours": 283, "geo_sources": { "nrpzs": 272, "obec": 11 }, "by_kraj": {}, "by_category": {} },
  "categories": { "lps_dospeli": "Lékařská pohotovostní služba pro dospělé" },
  "regions": [{ "kraj_code": "CZ041", "has_open_data": true, "open_data_url": "…", "web": "…" }],
  "places": [{
    "id": "vzp-01003726_1",
    "name": "Nemocnice Na Františku",
    "workplace": "Lékařská pohotovostní služba",
    "category": "lps_dospeli | lps_deti | zubni | lekarna",
    "kraj_code": "CZ010", "okres": "…", "obec": "Praha 1",
    "address": "Na Františku 847/8, 11000 Praha 1",
    "lat": 50.0912, "lon": 14.4245,
    "geo_source": "nrpzs | kraj | obec",
    "phone": "+420222801343", "web": null, "detail_url": "…",
    "hours": { "kind": "weekly", "week": { "mon": [["17:00","22:00"]], "…": [], "holiday": [] } },
    "hours_source": "vzp",
    "meets_minimum": true,
    "minimum_checks": [{ "rule": "§ 2/3 odst. 1 písm. a) …", "ok": true, "detail": "…" }]
  }],
  "rotations": [{
    "id": "rotace-283", "kraj_code": "CZ031", "category": "zubni",
    "index_url": "…", "dates": ["2026-09-05"],
    "practices": [{ "name": "…", "hours": { "kind": "rotation", "shifts": [{ "from": "2026-09-05", "to": "2026-09-05", "ranges": [["08:00","12:00"]] }] } }]
  }]
}
```

**Provozní doba** má dva tvary, oba definované v `ingest/lib/pohotovosti-hours.js`:

- `kind: 'weekly'` — sedm dnů plus `holiday`; svátek je samostatný den, protože
  o Velikonočním pondělí platí nedělní režim, ne pondělní.
- `kind: 'rotation'` — služba se střídá mezi ordinacemi (v devíti krajích zubní,
  v osmi lékárenská); platí jen v uvedené termíny.

Interval s koncem menším než začátek (`["15:30","07:00"]`) je platný zápis noční
služby přesahující půlnoc, ne chyba. `[["00:00","24:00"]]` je nepřetržitý provoz.

### Online (telemedicínské) pohotovosti — `online`

Kurátorovaný registr `ingest/mapping/pohotovosti_online.json`, transform ho
kopíruje do `pohotovosti.json` pod klíč `online`.

Proč to v datech je: fyzická pohotovost slouží až po ordinačních hodinách, takže
v pracovní den dopoledne je online pohotovost často jediná odpověď, která
nevyžaduje cestu. Dva kraje ji provozují nepřetržitě a zdarma pro své obyvatele
(Jihočeský, Karlovarský), Praha ji připravuje, Vysočina a Zlínský kraj ji
odmítly — `not_available` to říká otevřeně, aby to nevypadalo jako mezera
v mapování.

Každá služba nese `free_for`, `good_for`, `not_for`, `response_minutes`,
`channels` — a povinně `source.url` + `verified_at`. Jsou to tvrzení o cizí
službě; bez zdroje a data ověření by zastarala tiše. `not_for` se v UI vypisuje
za „Není pro …“, takže musí být v akuzativu (hlídá test).

Vedle služeb jsou tu `infolines` — krajské nepřetržité informační linky
o pohotovostech.

**Poradní linky ZZS — `advice_lines`.** Neakutní poradní linky krajských
záchranných služeb: telefonní číslo pro „nevím, jestli s tím někam jít“, na
rozdíl od tísňové linky 155. Nejvýš jedna na kraj (validátor odmítne druhou);
`tests/pohotovosti-practical.test.js` navíc čeká aspoň dvě linky v poli.

| Pole | Typ | Význam |
|---|---|---|
| `id` | string | unikátní v celém poli |
| `kraj_code` | string | NUTS-3, musí být v `regions` |
| `kraj` | string | název kraje |
| `name` | string | název linky/služby |
| `phone` | string | mezinárodní tvar (`+420…`); **nikdy** `+420155` ani `+420112` — to jsou tísňové linky, ne poradní |
| `phone_alt` | string? | nepovinné druhé číslo (stejný tvar; render ho zobrazí jako druhé tlačítko) |
| `hours` | string? | provozní doba textem — povinná, pokud není `hours_unknown` |
| `hours_unknown` | bool? | `true`, když web záchranky provozní dobu neuvádí — render (`adviceLineHours()` v `src/pohotovosti.js`, builder okresních stránek) pak poctivě píše „provozní dobu web záchranky neuvádí, ověříte při zavolání“. `hours` a `hours_unknown` zároveň validátor odmítne |
| `quote` | string | doslovný citát ze zdroje (povinný — stejný princip jako u denních ambulancí: při revizi jde poznat, že se zdroj změnil) |
| `text` | string? | nepovinný doplňující text |
| `since` | string? | odkdy linka funguje (rok nebo `YYYY-MM-DD`) |
| `source` | `{name, url}` | povinné — tvrzení o cizí službě |
| `verified_at` | string | `YYYY-MM-DD` |

Stav k 1. 9. 2026 (průchod webů všech 14 ZZS): linku mají čtyři kraje —
Jihomoravský (jediný se zveřejněnou provozní dobou), Středočeský,
Královéhradecký a Pardubický (`hours_unknown: true`). Moravskoslezský kraj má
na webu jen rozpracovanou stránku „Infolinka“ bez čísla, proto v datech není.

`advice_lines_note` (nepovinné): `{text, source: {name, url}}` — poznámka
o krajích, které poradní linku neprovozují; když je přítomná, `source.url`
je povinné.

Frontend: `renderAdviceLines()` v `src/pohotovosti.js` vykresluje celostátní
přehled (sekce se ukazuje všem, ne jen z kraje, který linku má — viz „Online
pohotovosti vidí každý“ výše) a zvýrazní kraj podle polohy uživatele. V bloku
„Co dělat teď“ přidává `careAdvice()` (`src/pohotovosti-engine.js`) krok
`{kind: 'poradna', line}` hned za první kontakt — jen s vyplněnou polohou
a jen u lékařské péče (`lps_dospeli`/`lps_deti`); zubní a lékárenská pohotovost
poradnu nenabízí.

### Denní nemocniční ambulance — kategorie `ambulance_denni`

Kurátorovaný registr `ingest/mapping/nemocnicni-ambulance.json`; transform ho
joinuje na NRPZS (přes **IČO + obec**, ne přes IČO samotné — jeden poskytovatel
má míst víc a `poskytovatel_ICO` míří na libovolné z nich) a přidává výsledek
mezi `places`.

**Proč to v datech je:** pohotovost podle vyhlášky slouží až PO ordinačních
hodinách. V pondělí v deset dopoledne proto nemá otevřeno skoro nic a stránka
odpovídala „nejbližší otevřená je 115 km daleko“ — pravdivě, ale na jinou
otázku, než jakou člověk s naraženou rukou položil.

**Proč ručně:** provozní dobu nemocničních ambulancí nevede žádná celostátní
otevřená data. Distribuce NRPZS NR-01-06 je v celé sérii jediná a hodiny nemá;
REST API `nrpzs.uzis.cz`, které je podle dokumentace u vybraných zařízení vrací,
je dlouhodobě nedostupné. Zbývají weby nemocnic — a ty se strojově číst nedají:
průchod 135 nemocnicemi (`npm run scan:ambulance-hodiny`) vytáhl mezi
„ordinačními hodinami“ i polední pauzy, návštěvní dobu na lůžkovém oddělení
a poradny „pouze pro objednané“. Crawler proto hledá jen **kandidáty** do
`ingest/cache/ambulance_kandidati.json` a publikovaný záznam vzniká až tím,
že člověk zdrojovou stránku přečte.

Záznam navíc oproti pohotovosti nese:

| Pole | Význam |
|---|---|
| `walk_in` | `'ano'` jen když to zdroj říká výslovně, jinak `'neuvedeno'` (UI pak radí zavolat předem) |
| `quote` | doslovný úryvek ze zdroje, podle kterého byly hodiny zapsané |
| `source_name` + `detail_url` + `verified_at` | odkud a kdy — bez toho by údaj tiše zastaral |
| `hours_source` | vždy `'web_nemocnice'` |
| `meets_minimum` | vždy `null` — vyhláška o pohotovostních službách se na běžnou ambulanci nevztahuje a „nesplňuje minimum“ by bylo obvinění z něčeho, co po ní zákon nechce |

`coverage.pohotovosti_total` počítá jen pohotovosti, `coverage.ambulance_denni`
jen ambulance. Hero a statistika berou první z nich — jinak by stránka tvrdila
„292 pohotovostí“ o čísle, ve kterém je devět běžných ambulancí. Prahy pokrytí
ve validátoru se rovněž počítají jen z pohotovostí.

### Praktické informace — `practical`

Kurátorovaný `ingest/mapping/pohotovosti_prakticke.json`: výše regulačního
poplatku i s výjimkami (`fee`, povinně `source.url` + `verified_at`, protože se
mění novelou) a checklist `before_you_go`. Krok `zavolejte` je povinný —
zveřejněná ordinační doba se mění dovolenými a zástupy rychleji, než ji kdokoli
stihne aktualizovat, tuhle stránku včetně.

#### Rozcestník „Kam s tím?“ — `practical.triage`

Odpovídá na otázku, kterou vyhledávání samo zodpovědět nesmí: „kam vlastně
patřím?“. Každý řádek je proto přepis oficiálního zdroje (NZIP, záchranná
služba, ministerstvo) se zdrojem a datem ověření — stránka jen převádí
odpověď na tlačítko. Validátor (`validatePractical`) čeká aspoň 6 řádků;
první musí volat 155 (ohrožení života) a nést `urgent: true` — to hlídá
`tests/pohotovosti-practical.test.js`, ne samotný validátor.

| Pole | Typ | Význam |
|---|---|---|
| `id` | string | unikátní v poli |
| `situation` | string | nadpis karty (např. „Ohrožení života“) |
| `examples` | string? | typické příklady, nepovinné |
| `text` | string | vysvětlující text |
| `urgent` | bool? | první řádek ho má — červený okraj karty |
| `action` | objekt | viz níže |
| `secondary` | objekt? | druhé tlačítko, stejný tvar jako `action` |
| `faq` | `{q, a}` | otázka/odpověď pro FAQPage JSON-LD (`q` končí otazníkem, `a` ≥ 40 znaků — hlídá test) |
| `source` | `{name, url}` | povinné |
| `sources` | pole? | další zdroje `{name, url}`, když řádek opírá víc tvrzení o víc dokumentů (render je vypíše za hlavním zdrojem) |
| `verified_at` | string | `YYYY-MM-DD` |

`action`/`secondary` — tlačítko rozcestníku, `kind` je jeden z
`tel | find | href | anchor | poradna` (jiný druh renderer tiše nevykreslí):

| `kind` | Povinná pole | Vykreslí se jako |
|---|---|---|
| `tel` | `label`, `phone` (mezinárodní tvar, nebo tísňové/harmonizované číslo `1xx`/`116xxx`) | `<a href="tel:…">` |
| `href` | `label`, `url` (http/https) | odkaz do nové karty |
| `anchor` | `label`, `href` (musí začínat `#`) | odkaz na kotvu na téže stránce |
| `find` | `label`, `categories[]` — jen z `lps_dospeli, lps_deti, zubni, lekarna, ambulance_denni, akutni` | tlačítko, které přepne filtr typu ve vyhledávání a odscrolluje tam uživatele |
| `poradna` | `label` | tlačítko se vykreslí podle kraje uživatele ze `online.advice_lines` (`poradnaActionHtml()` v `src/pohotovosti.js`); bez zjištěného kraje odkáže na přehled linek |

Frontend: `renderTriage()` v `src/pohotovosti.js`. Klik na `find` mění
`state.categories`, posílá uživatele zpět k výsledkům (s polohou rovnou
na „Co dělat teď“, bez ní do pole pro obec).

#### Co vás na pohotovosti čeká — `practical.expectations`

Triáž podle závažnosti, čekání, co pohotovost neudělá — přepis oficiálního
zdroje. Aspoň 2 položky, každá `id`, `title`, `text`, `source{name,url}`,
`verified_at`. Vykresluje `renderBeforeYouGo()` pod checklistem
`before_you_go`.

#### Bez praktického lékaře — `practical.no_gp`

Jeden blok (ne pole): `title`, `short` (krátká věta, použije se přímo v kroku
„Zavolejte praktikovi“ v `careAdvice()`), `text`, `links[{label, url}]`
(aspoň jeden), `source{name,url}`, `verified_at`.

#### English · Українська — `practical.intl.{en,uk}`

Fakta (čísla, poplatek, pojištění) nesou stejné zdroje jako česká verze,
přeložený je jen text. Povinné pro oba jazyky `en` i `uk` (validátor selže,
když jeden z bloků chybí):

| Pole | Typ | Význam |
|---|---|---|
| `title` | string | nadpis bloku |
| `lead` | string? | úvodní odstavec |
| `items` | pole, ≥ 5 | `{q, a, tel?, tel_label?, url?, url_label?}` — aspoň jedna položka s `tel: '155'` nebo `'112'` |
| `sources` | pole, ≥ 1 s `url` | `{name, url}` |
| `sources_label` | string? | popisek nad zdroji (fallback v UI: „Sources“) |
| `verified_label` | string? | popisek u data ověření (fallback: „verified“) |
| `verified_at` | string | `YYYY-MM-DD` |

`sources_label` a `verified_label` validátor nekontroluje — jsou to jen
popisky pro UI s výchozí anglickou hodnotou, když chybí. Ukrajinský blok musí
být opravdu v cyrilici, ne anglický text pod jiným klíčem (hlídá test).
Frontend: `renderIntl()` v `src/pohotovosti.js`, jazykové sekce nesou
`lang="en"`/`lang="uk"`.

#### Aplikace — `practical.apps` (nepovinné)

Pole existuje jen když má stránka co nabídnout (Záchranka); když je
přítomné, každá položka nese `id`, `name`, `url` (http/https), `text`,
volitelně `features[]`, a povinně `source{name,url}` + `verified_at`.

#### Zpětná vazba — `practical.feedback`

```json
{ "issues_new_url": "https://github.com/<owner>/<repo>/issues/new", "labels": [] }
```

`issues_new_url` musí být přesně tvar GitHub „…/issues/new“ (bez query
stringu — ten se doplňuje až za běhu). Z tohoto bloku skládá
`feedbackIssueUrl()` (`src/pohotovosti-engine.js`) předvyplněné issue
(pracoviště, typ, adresa/telefon z dat, datum generování dat, štítky) — sdílí
ho hlavní stránka i každá okresní stránka, aby hlášení vypadala stejně
a šla třídit podle štítku.

### Drift-check citátů — `hours_check`

`ingest/verify-ambulance-drift.js` (`npm run verify:ambulance-drift`, týdně
v refresh.yml před transformem) stáhne zdrojové stránky všech denních ambulancí
a ověří, že `quote` je na nich pořád doslovně dohledatelný (normalizace bílých
znaků a pomlček; `[…]` dělí citát na fragmenty, které musí být všechny
a v pořadí). Výsledek jde do `ingest/cache/ambulance_drift.json` a transform ho
propíše jako `hours_check: { status: 'ok' | 'drift' | 'nedostupne', checked_at }`.
`drift` = stránka se změnila a hodiny musí přeověřit člověk (validátor warning,
karta ukazuje „zdroj se změnil — ověřte telefonicky“); `nedostupne` ≠ drift —
o změně nevíme nic a falešný poplach by devalvoval ten skutečný.

### Dojezdová analýza — `dojezdy` + `data/dojezdy.json`

`ingest/lib/dojezdy.js` (volá transform) spočítá pro všech ~6 250 obcí
vzdálenost k nejbližší pohotovosti OTEVŘENÉ ve třech referenčních časech
(středa 20:00 — vyhláškové okno; sobota 12:00 — pevná víkendová doba;
sobota 23:00 — noc, kterou vyhláška nepředepisuje). Počítá se jen LPS pro
dospělé a děti se známou dobou a polohou — ne urgentní příjmy, denní ambulance
ani ZZS (měří se síť pohotovostí podle vyhlášky), a ne zubní/lékárenská
(v části krajů rotují ke konkrétním datům, „typická sobota“ by byla fikce).
Souhrn (národní čísla + 77 okresů: medián/max/počet přes 20 km) je v hlavním
souboru pod `dojezdy`; per-obec vzdálenosti v líně načítaném `data/dojezdy.json`
(join na gazetteer po jménu + okresu, hodnoty v desetinách km). Vzdušná čára,
hranice 20 km ilustrativní — poznámka je přímo v datech a test ji vyžaduje.

## 21b. `data/pohotovosti-okresy.json` + `pohotovost-*.html` — okresní stránky

`scripts/build-pohotovosti-okresy.js` (`npm run build:pohotovosti-okresy`)
generuje z `data/pohotovosti.json` statickou landing page pro každý okres
s aspoň jedním pracovištěm (75 stránek): výpis s adresou, telefonem a rozpisem
hodin přímo v HTML (crawler nespouští JS) + JSON-LD `ItemList`
s `MedicalClinic`/`Dentist`/`Pharmacy` a `openingHoursSpecification`. Živý stav
„teď otevřeno“ dokresluje `src/pohotovost-okres.js` z `data-hours` atributu.
Manifest `data/pohotovosti-okresy.json` čte sitemap generátor a rozcestník na
`pohotovosti.html`. Regeneruje se v týdenním cronu po transformu; builder
přepisuje jen soubory, jejichž obsah se změnil. NENÍ v `build:generated` —
jsou to obsahové stránky jako `clanek-*.html`, jen je píše skript.

Každá okresní stránka nese i kompaktní verzi rozcestníku: blok `.pokr-roz`
s telefonními řádky z `practical.triage` (jen ty s `action.kind === 'tel'`)
plus poradní linku kraje, a odkaz na celý rozcestník na `pohotovosti.html`.
Patička `.pokr-foot` u každého pracoviště nese datum dat a předvyplněné
„Nahlásit změnu“ ze stejné `feedbackIssueUrl()` jako hlavní stránka.

Stejný běh navíc přepíše blok **FAQPage JSON-LD přímo v `pohotovosti.html`**,
mezi značkami `<!-- poh-faq:start -->`/`<!-- poh-faq:end -->` (funkce
`faqJsonLd()` + `writeFaqIntoPage()`): obsah se vždy odvozuje z
`practical.triage[].faq`, takže statická hlavička nemůže tvrdit něco jiného
než živá sekce rozcestníku. `tests/pohotovosti-practical.test.js` porovnává
obsah hlavičky s `faqJsonLd(practical)` na bit — po ruční úpravě `triage`
je nutné spustit `npm run build:pohotovosti-okresy` znovu, jinak test spadne.

**Offline cache — `sw-pohotovosti.js`.** Service worker v kořeni webu, scope
`/pohotovost` (registruje ho `registerOffline()` v `src/pohotovosti.js`, běží
tedy nad `pohotovosti.html` i nad všemi `pohotovost-*.html`). Network-first:
dokud síť odpovídá, bere se vždy čerstvá odpověď a jen se jí obnoví cache;
z cache se čte až po výpadku sítě. Zasahuje jen do bílé listiny cest (stránky
pohotovostí, jejich data, skripty, styly, značka) — články, indikátory
a zbytek webu jím neprochází vůbec. Navigace na okresní stránku bez uložené
kopie spadne zpátky na `/pohotovosti`, které má data a umí okres najít i tak.
Nic neodesílá, nic nesbírá; při změně chování se zvedá `VERSION` v souboru,
což při aktivaci smaže starší cache.

### `data/pohotovosti-akutni.json`

Doplňková vrstva z NRPZS: urgentní příjmy, nemocnice s akutní chirurgií
a výjezdové základny ZZS. Ordinační dobu registr nevede, takže `hours` chybí.

⚠️ **Slepá ulička, kterou tu nehledejte:** kategorie „denní úrazová ambulance“
odvozená z „nemocnice + chirurgický obor + ambulantní péče“ vypadá lákavě, ale
vybere i Revmatologický ústav, Masarykův onkologický ústav nebo Ústav pro péči
o matku a dítě. Registr nerozliší ambulanci, kam se chodí neobjednaně, od té na
objednání. Denní alternativu proto stránka bere jen z doloženého: urgentní
příjem, nebo pracoviště, které samo provozuje pohotovost.
`evidence` u každé kategorie rozlišuje `registr` (registr to tak přímo
pojmenovává) a `odvozeno` (dovodili jsme z druhu zařízení, formy péče a oborů) —
chirurgická kategorie je vždy odvozená. Stránka to čtenáři říká.

### `data/obce-gps.json`

Gazetteer 6 256 obcí ČR pro převod názvu města na souřadnice. Kompaktní formát
`[name, lat, lon, okres, lau]`, 4 desetinná místa (~11 m). Zdroj Wikidata
(třída Q5153359), kód LAU odkazuje zpět do RÚIAN. Není to zdravotnická data —
je to převodník, díky kterému vyhledávání běží v prohlížeči a poloha uživatele
nikam neodchází.

### Validace

`npm run validate:pohotovosti` — souřadnice uvnitř ČR, časy ve tvaru `HH:MM`,
data termínů `YYYY-MM-DD`, telefon v mezinárodním tvaru, NUTS-3 kód kraje,
všech 14 krajů v registru zdrojů, a prahové kontroly (min. 150 míst, ≥ 80 %
s ordinační dobou, ≥ 80 % s přesnou polohou, ≥ 5 000 obcí v gazetteeru).
Prahy jsou tam proto, že zdrojem hodin je scrapované HTML: kdyby VZP změnila
šablonu, transform doběhne bez chyby a vydá prázdno.

`meets_minimum: false` bez `minimum_checks` je chyba — je to tvrzení
o konkrétním poskytovateli a bez rozpisu by ho stránka nemohla doložit.

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
| `legislativa.items[].linked_indicators[]` | `legislativa.json` | `indicators.json#id` |
| `legislativa.items[].linked_articles[]` | `legislativa.json` | `articles.json#id` |
| `legislativa.plan_items[].radar_id` | `legislativa.json` | `legislativa.json#items[].id` (self) |
| `strategies.related_strategies[]` | `strategies.json` | `strategies.json#id` (self) |
| `explainers.linked_indicators[]` | `explainers.json` | `indicators.json#id` |
| `indicators.dimension` | `indicators.json` | `dimensions.json#id` |
| `indicators.method_card_url` | `indicators.json` | path to `indicators/{id}.json` |
| `regions.datasets[].indicator_id` | `regions.json` | `indicators.json#id` |
| `regions.datasets[].regions[].code` | `regions.json` | `cz-regions.geojson#properties.code` |
| `pojistenci.krajs[].code` | `pojistenci-d5-*.json` | `cz-regions.geojson#properties.code` |
| `system_model.nodes[].indicators[]` | `system-model.json` | `indicators.json#id` |
| `system_model.nodes[].articles[]` | `system-model.json` | `articles.json#slug` |
| `system_model.nodes[].explainers[]` | `system-model.json` | `explainers.json#id` |
| `system_model.edges[].from/to` | `system-model.json` | `system-model.json#nodes[].id` (self) |
| `claims.claims[].article` | `claims.json` | `articles.json#slug` |
| `claims.claims[].indicator_id` | `claims.json` | `indicators.json#id` |

## Validátory

| Skript | Co kontroluje |
|---|---|
| `npm run validate:data` | `indicators.json` schéma, FK na metodické karty |
| `npm run validate:strategies` | `strategies.json` ENUM, FK, povinná pole |
| `npm run validate:explainers` | `explainers.json` schéma |
| `npm run validate:prevention` | `prevention.json` schéma |
| `npm run validate:legislation` | `legislativa.json` ENUM fází/typů (radar) + ENUM typů/stavů (plán), FK na indikátory + články + self-FK `radar_id` |
| `npm run validate:system-model` | `system-model.json` enumy, FK, bez osiřelých uzlů/self-loops |
| `npm run validate:claims` | `claims.json` schéma, FK, invarianty + quote-verifikace proti HTML |
| `npm run validate:evidence` | `evidence-audit.json` enumy verdiktů, PMID/DOI, FK na články/indikátory/claims, akce u rozporů, zákaz provozních textů nástrojů |
| `npm run validate:pohotovosti` | `pohotovosti.json` + `obce-gps.json`: souřadnice v ČR, tvar časů, prahy pokrytí |
| `npm run validate:all` | spustí všechny validátory |
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


## 22. Datasety plnění strategií — `data/zdravi2035-plneni.json` + `data/plneni-*.json` (kurátorované)

Rodina osmi souborů se stejným schématem — každý rozkládá jeden strategický
dokument na cíle → dílčí cíle/úkoly → vlastní indikátory dokumentu a mapuje je
na kontrakt. Sdílený renderer `src/strategie-plneni.js` (stránky `zdravi-2035.html`
přes `src/zdravi2035.js`, `plneni-*.html` přes `src/plneni-page.js` a data-atributy
na `<body>`); validuje `ingest/validate-plneni.js` (`npm run validate:plneni`,
součást `validate:all`); testy `tests/plneni.test.js` (+ `tests/zdravi2035.test.js`).

| Soubor | Dokument | Stránka |
|---|---|---|
| `zdravi2035-plneni.json` | Zdraví 2035 (3 SG × 12 SC × 113 dílčích × 68 ind.) | `zdravi-2035.html` |
| `plneni-onko-2030.json` | Národní onkologický plán 2030 (16 SC, 51 dílčích, 78+15 ind.) | `plneni-onko-2030.html` |
| `plneni-kv-2035.json` | Národní KV plán 2025–2035 (16 SC, 101 dílčích, 126 bodů) | `plneni-kv-2035.html` |
| `plneni-amr.json` | AP NAP 2019–2022 (6 cílů, 30 aktivit; bez nástupce) | `plneni-amr.html` |
| `plneni-dusevni-zdravi.json` | Strategie reformy psychiatrie 2013 + NAPDZ 2020–2030 | `plneni-dusevni-zdravi.html` |
| `plneni-zdravi-2030.json` | Zdraví 2030 retrospektivně + oficiální Zpráva 2023–2024 | `plneni-zdravi-2030.html` |
| `plneni-socialni-sluzby.json` | Národní strategie rozvoje sociálních služeb 2026–2030 (5 SG × 18 SC, 56 opatření, 3 ind. dokumentu) | `plneni-socialni-sluzby.html` |
| `plneni-socialni-sluzby-2016-2025.json` | Předchůdkyně 2016–2025 retrospektivně (10 SG × 34 SC, 91 opatření, 0 ind. dokumentu) | `plneni-socialni-sluzby-2016-2025.html` |

**Dvojice sociálních služeb — specifika.** Žádný z obou dokumentů nemá
indikátorovou soustavu s výchozími a cílovými hodnotami: opatření/dílčí cíle
(`dilci_cile`) jsou skoro výhradně `mereni: "proces"` (2026–2030: 53 z 56,
zbylé 3 `proxy`, 0 `primo`; 2016–2025: 86 z 91, zbylých 5 `proxy`, 0 `primo`).
`doc_indicators` — jen tři milníky deinstitucionalizace u 2026–2030 (2033/2035/
2040), u 2016–2025 žádné — mapují na kontrakt výhradně `chybi` (0 `primo`,
0 `proxy`). U staršího dokumentu navíc žádná z povinných každoročních zpráv
o plnění (usnesení vlády č. 245/2016 ukládalo předkládat je k 31. březnu) není
veřejně dohledatelná — blok `hodnoceni` proto cituje analytickou část
nástupnické strategie 2026–2030, ne oficiální hodnocení gestora vlastního
plnění.

Odchylky novějších souborů od zdravi2035 (renderer i validátor čtou obojí):
klíč `target` (s volitelným `year`) místo `target_2035`; `level` u doc_indicators
volitelný; aktivity mohou nést `gestor`/`termin`/`kriterium` (AP NAP); cíl může
nést `hodnoceni` `{text, zdroj}` s oficiálním hodnocením plnění (Zdraví 2030 —
výhradně citace ze zdrojové zprávy s odkazem na stranu); druhý zdrojový dokument
jde do `document_b`. Baseline bez roku je povolená jen s notou, proč rok neuvádí
sám dokument.

### Původní popis Zdraví 2035 (platí dál)

Ručně kurátorovaný přepis Strategického rámce Zdraví 2035 (usnesení vlády
č. 862/25, 12. 11. 2025) + redakční mapování na indikátory kontraktu.
Validuje `ingest/validate-plneni.js` (`npm run validate:plneni`,
součást `validate:all`); konzumuje `zdravi-2035.html` (`src/zdravi2035.js`).

Struktura: 3 `strategic_goals` → 12 `cile` (SC). Každý SC nese `dilci_cile`
(číslované úkoly z návrhové části dokumentu, str. 73–150) a `doc_indicators`
(vlastní indikátory dokumentu z kap. 4.2 s výchozí hodnotou k 31. 12. 2023
a cílem 2035, doslova včetně podivností — nic se nedopočítává).

Klíčové enumy:

| Pole | Hodnoty | Význam |
|---|---|---|
| `doc_indicators[].mapping.match` | `primo` / `proxy` / `chybi` | kontrakt měří stejný jev / příbuzný jev s jinou metodikou (povinná `note`, proč se hodnoty nesmí srovnávat) / neměří vůbec |
| `dilci_cile[].mereni` | `primo` / `proxy` / `proces` | úkol má populační indikátor(y) v `indikatory` / má proxy / je organizační krok bez populačního indikátoru |

Aktuální hodnoty indikátorů se v souboru NEduplikují — stránka je bere za
běhu z `data/indicators.json`, takže nemůžou zastarat. Čipy odkazují na
statické `indikator-*.html`; test hlídá, že každá odkazovaná stránka existuje.

## 23. `data/ltc-scenare.json` — parametry kalkulačky dlouhodobé péče

Kurátorovaný přepis vstupních parametrů kalkulačky „Kdo se o nás postará
v roce 2035?" (`kalkulacka-pece-2035.html`) — kolik lůžek, pečovatelů a
neformálních pečujících dnes a v roce 2035 unese systém dlouhodobé péče
o seniory (65+), a kolik co stojí. Zdroj: studie Deloitte Advisory pro
Asociaci poskytovatelů sociálních služeb ČR (červen 2026), str. 58–66 —
studii objednali poskytovatelé, proto model přebírá jen vstupní parametry,
ne doporučení (viz `source.caveat`). Žádný samostatný validátor; hlídá ho
`tests/ltc-engine.test.js` proti čtyřem scénářům studie s tolerancí
zaokrouhlení. Model je čistá logika v `src/ltc-engine.js`, render
v `src/ltc-kalkulacka.js`, CSS `.ltc-*`.

### Schéma

```json
{
  "version": "1.0",
  "source": { "name": "...", "url": "...", "caveat": "studie na zakázku APSS ČR — model nepřebírá doporučení" },
  "verified_at": "YYYY-MM-DD",
  "baseline_2024": {
    "residential": { "beds": 76000, "clients": { "ds": 40000, "dzr": 32000, "other": 20000 }, "quote": "...", "page": 58 },
    "terenni":      { "fte": 34000, "clients": 96000, "quote": "...", "page": 58 },
    "neformalni":   { "persons": 139000, "days": 24200000, "fte": 97000, "quote": "...", "page": 58 },
    "unit_costs_tis_kc": { "ds": 495, "dzr": 540, "other": 495, "terenni": 130, "neformalni": 150 },
    "system_cost_mld": 80
  },
  "base_2035": {
    "residential": { "beds": 111000, "clients": { "ds": 43000, "dzr": 63000, "other": 29000 }, "quote": "...", "page": 58 },
    "terenni":      { "fte": 55000, "clients": 141000, "quote": "...", "page": 58 },
    "neformalni":   { "persons": 190000, "days": 34000000, "fte": 136000, "quote": "...", "page": 58 },
    "unit_costs_tis_kc": { "ds": 585, "dzr": 640, "other": 585, "terenni": 155, "neformalni": 175 },
    "unit_cost_neformalni_added_tis_kc": 190,
    "system_cost_mld": 137,
    "total_need_persons": 466000
  },
  "model": {
    "clients_per_bed": 1.2162, "clients_per_fte": 2.82, "divert_share_max": 0.40,
    "shortfall_split": { "ds": 3000, "dzr": 31000, "other": 9000 },
    "extra_split": { "ds": 27000, "dzr": 52000, "other": 17000 },
    "growth_terenni_2035": 45000, "growth_neformalni_2035": 51000,
    "days_per_added_person": 175, "days_per_fte": 250,
    "investment_per_bed_mil_kc": 2
  },
  "scenarios": [
    { "id": "zs", "label": "Základní scénář (demografie)", "inputs": { "beds": 111000, "fte": 55000, "divertShare": 0.4 },
      "expected": { "residential_clients": 135000, "terenni_clients": 141000, "neformalni_persons": 190000, "neformalni_fte": 136000, "cost_total_mld": 137 }, "page": "58–60" }
  ],
  "sliders": {
    "beds": { "min": 76000, "max": 190000, "step": 1000, "default": 111000 },
    "fte": { "min": 34000, "max": 70000, "step": 1000, "default": 55000 },
    "divertShare": { "min": 0, "max": 0.4, "step": 0.05, "default": 0.4 }
  }
}
```

| Blok | Význam |
|---|---|
| `baseline_2024` / `base_2035` | Výchozí stav a predikovaná potřeba 2035 pro tři pilíře péče (`residential` = pobytové služby DS/DZR/ostatní, `terenni` = terénní služby, `neformalni` = rodiny); každý dílčí blok nese `quote` (doslovná citace studie) + `page`, aby šlo číslo dohledat. |
| `model` | Přepočtové konstanty engine (kapacita na lůžko/úvazek, max. podíl přesměrovaný do terénu, rozdělení chybějících/přebytečných klientů mezi DS/DZR/ostatní, přírůstek 2024→2035, dny na pečující a na úvazek, cena nového lůžka) — každá s `..._quote` + `..._page`. |
| `scenarios[]` | Čtyři scénáře studie (základní, zmrazení lůžek, zmrazení všech investic, vše do pobytových služeb) jako `{id, label, short, inputs, expected, page}` — `inputs` jsou přednastavení posuvníků, `expected` jsou hodnoty z tabulek studie, proti kterým `tests/ltc-engine.test.js` ověřuje `src/ltc-engine.js`. |
| `sliders` | `{min, max, step, default}` pro tři ovládací prvky kalkulačky: `beds` (lůžka), `fte` (pečovatelé v terénu), `divertShare` (podíl seniorů bez lůžka, které zvládne terén). |

### Model (`src/ltc-engine.js`)

Čistá funkce bez DOM, tři kroky: (1) pobytová péče obslouží nejvýš `beds ×
clients_per_bed` klientů — nad demografickou poptávku 2035 může pohltit
přírůstek terénu a rodin; (2) kdo se nevejde, jde nejdřív do terénu, nejvýš
`divertShare` (strop `divert_share_max`) a jen pokud na to terén má kapacitu
(`fte × clients_per_fte`); (3) zbytek nesou rodiny — osoby se přepočítávají na
pečující dny (`days_per_added_person`) a na ekvivalent úvazků
(`days_per_fte`). Výstup kalkulačky (KPI dlaždice, skládané pruhy, tabulka)
čte `simulate()` proti aktuálním posuvníkům a `baseline()` pro srovnání se
základním scénářem; stav posuvníků žije v URL hashi
(`#luzka=…&pecovatele=…&teren=…`), aby šel výsledek sdílet odkazem.

## 24. `data/evidence-audit.json` — registr evidence-auditu (kurátorovaný orchestrací)

Výstup úkolu [`05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md`](../05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md):
pro každý ověřený článek / indikátor seznam odborných tvrzení, studie z PubMed (kandidáty
smí dodat Consensus, ověření je vždy v PubMed) a verdikt. Zapisuje ho jen orchestrace
(Sonnet rešerše → Opus adjudikace → sériový zápis), mění se výhradně commitem.

### Schéma

```json
{
  "version": "1.0",
  "generated_at": "2026-09-08T00:00:00Z",
  "items": [{
    "id": "clanek-kratke-intervence-uhrady.html",   // článek: slug souboru; indikátor: "indicator:{id}"
    "type": "article",                               // article | indicator
    "checked_at": "2026-09-08",
    "run_id": "ea-2026-09-08-01",
    "content_hash": "…sha1 souboru po úpravách…",     // fronta podle něj pozná změnu (stale)
    "tools": { "pubmed": true, "consensus": true },
    "models": { "search": "sonnet", "adjudicate": "opus", "write": "opus" },
    "calls": { "pubmed": 5, "consensus": 1 },
    "claims": [{
      "claim_id": "kratke-intervence-uhrady--03",     // volitelná vazba na data/claims.json
      "text": "doslovná věta z článku",
      "location": "sekce / perex / databox",
      "kind": "effect",                              // effect | efficacy | epidemiology | mechanism | measurement | policy | other
      "verdict": "partial",                          // supported | partial | contradicted | no-evidence | not-applicable | unclear
      "confidence": "medium",                        // high | medium | low
      "evidence": [{
        "pmid": "29476653", "doi": "10.1002/14651858.CD004148.pub4",
        "title": "…", "year": 2018, "journal": "Cochrane Database Syst Rev", "study_type": "systematic review",
        "found_via": "pubmed",                       // pubmed | consensus | article (článek už citoval)
        "relation": "partial",                       // supports | partial | contradicts | context
        "verified_in_pubmed": true                   // u found_via=consensus povinně true
      }],
      "note": "co abstrakt říká a čím se liší (povinné u partial / contradicted / unclear)"
    }],
    "summary": { "supported": 0, "partial": 1, "contradicted": 0, "no_evidence": 0, "not_applicable": 0, "unclear": 0 },
    "actions": [{ "type": "source-added", "detail": "…", "ref": "" }],  // source-added | claim-note | card-note | flagged | issue | none
    "followup": "co zůstalo neověřeno (volitelné; fronta položku vrátí jako stale)",
    "notes": ""
  }]
}
```

### Invarianty (`npm run validate:evidence`)

- `supported` / `partial` / `contradicted` mají ≥ 1 evidence; každá evidence má PMID nebo DOI.
- `contradicted` v položce vyžaduje akci `flagged` nebo `issue` (rozpor se nikdy neopravuje potichu).
- `summary` sedí na počty verdiktů (chybějící klíč = 0).
- FK: článek existuje v `articles.json`, indikátor v `indicators.json`, `claim_id` v `claims.json`.
- Provozní texty nástrojů (počítadla dotazů, výzvy k registraci, „podle Consensus“) registr odmítne.
- `followup` (volitelný neprázdný řetězec) = audit sám přiznává, co v položce zůstalo neověřeno (vyčerpaný strop volání); fronta takovou položku hlásí jako `stale`, i když se obsah nezměnil.

### Fronta (`npm run evidence:queue`)

`scripts/evidence-audit-queue.js` je odvozený artefakt (necommituje se, píše do `reports/`):
viditelné články + všechny indikátory, priorita podle odkazů na studie, zmínek o studiích,
ručně ověřovaných claims, HSPA frameworku a navázaných článků; stav `pending` → `stale`
(`content_hash` se liší, kontrola starší než 365 dní, nebo záznam nese `followup`) → `done`. `--batch` vrátí další
dávku (default 12 článků + 8 indikátorů), `--hash <soubor>` spočítá hash pro zápis.


---

## 25. Srovnávač pojišťoven — `data/pojistovny*.json` + `data/zadosti-106.json` (kurátorované)

Stránka `pojistovny.html` (pracovní verze pod heslem) čte jen tyto soubory; každý je
nepovinný (chybí-li, modul vypíše „data zatím nejsou k dispozici“). Plán a balíčky:
`05_M1_Starter/PLAN-SROVNAVAC-POJISTOVEN.md`, metodika `docs/metodika-srovnavac-pojistoven.md`,
validátor `ingest/validate-pojistovny.js`. Číselné položky mají obálku
`{hodnota, rok, zdroj, poznamka?}`; `null` = nedohledáno (na stránce „nedohledáno“ / „—“,
nikdy 0). Každý soubor nese `version`, `generated_at`, `_doc` a `changelog[]{datum, zmena, zdroj}`
(metodika § 4.7).

| Soubor | Obsah | Kdo čte |
|---|---|---|
| `pojistovny.json` | `system` (systém v.z.p. 2024), `system_crp` (CRP 2025), `pojistovny[]` po ZP: `crp` (kmen, `pojistenci_trend[]{year, insured}` 2010–2025, `top_kraje`), `hospodareni` (2024), `hospodareni_2025` (jen VZP, VoZP, OZP), `prevence`, `servis`, `mereni_dopadu`, `semafor`; `stavy_semaforu`, `zdroje[]`, `chybi[]` | `src/pojistovny.js`, `pojistovny-semafor.js` |
| `pojistovny-prevence.json` | `oblasti[]` × `pojistovny[].oblasti{stupen, popis}` (heatmapa 7 × 9; v buňce počet položek `popis`, barva = stupeň), `pojistovny[].reserse{datum: 'YYYY-MM-DD', url}` (volitelné: den redakční rešerše webu a adresa stránky prevence; ukazuje ho „Proč ten stupeň“ a řádek stáří dat; `validate-pojistovny.js` hlídá datum a url), `onko_screening`, `dusevni_sloupce`, `fond_prevence_struktura.polozky[]{nazev, zpp, skutecnost, predchozi_rok, skupina}`, `fond_prevence_skupiny[]`, `odpovedi` (7 otázek z VZ), `dolozene_vysledky[]` | `src/pojistovny-prevence.js` |
| `pojistovny-aplikace.json` | `funkce[]` × `aplikace[].funkce{id: true\|false\|'partial'\|null}`, `kriteria_privetivosti` (návrh, prázdná `aplikace[].kriteria{}` do PS), uživatelé, rizikové skupiny | `src/pojistovny-prevence.js` |
| `pojistovny-otazky.json` | `sady[]{id, nazev, typ, verze, platne_od?, pravni_zaklad, otazky[] \| casti[].otazky[]}` — definice dotazníků (formulář renderuje `src/zp-dotaznik.js`) | `zp-dotaznik.js`, `api/dotaznik.js` |
| `pojistovny-vek.json` | viz níže | `ingest/transform_pojistovny_crp.js` (výstup), standardizace § 4.1 |
| `pojistovny-dotaznik-agregaty.json` | viz níže | `src/zp-dotaznik.js` |
| `pojistovny-kmen-mesicni.json` | viz níže | `ingest/transform_pojistovny_kmen_mesicni.js` (výstup), `src/pojistovny-kmen-mesicni.js` |
| `zadosti-106.json` | viz níže | `src/pojistovny-zadosti.js` |
| `pojistovny-verifikace.json` | **plánovaný**, viz níže | — |

### `data/pojistovny-vek.json` — věková a pohlavní struktura kmene (generovaný)

Výstup `ingest/transform_pojistovny_crp.js` z CSV ÚZIS OIS 11-47 (verze 2026-01, rok 2025).
Podklad pro věkovou standardizaci nákladů a prevence (metodika § 4.1, balíček P3.3).

```json
{
  "version": "1.0", "generated_at": "…", "rok": 2025,
  "zdroj": { "nazev": "ÚZIS, OIS 11-47, verze 2026-01", "soubor": "…csv", "url": "…" },
  "pasma": ["0", "1-4", "5-9", "…", "90+"],          // 19 pásem
  "pohlavi": ["M", "F"],
  "stredy_pasem": { "0": 0.5, "1-4": 3, "…": "…" },   // pro odhad průměrného věku
  "cr": { "celkem": 10851604, "podil_65plus_pct": 20.86, "prumerny_vek_odhad": 43.1,
          "struktura": { "0:M": 42800, "0:F": 40367, "…": "…" } },   // klíč "<pásmo>:<pohlaví>"
  "pojistovny": [{ "kod": "111", "celkem": 6168626, "struktura": { "…": "…" },
                   "podil_65plus_pct": 22.88, "prumerny_vek_odhad": 44.3 }]
}
```

Standardizované hodnoty se zapisují do `pojistovny.json` jako
`hospodareni.naklady_na_pojistence_std_kc` / `fond_prevence_na_pojistence_std_kc`
s polem `stav`. Dokud nákladové indexy nejsou doložené, je `stav: "placeholder-bez-vah"`
(faktor 1, hodnota = nestandardizovaná) a **frontend číslo nezobrazí** — `stdInfo()`
v `src/pojistovny.js` bere jen `stav: "dolozeno"`, jinak ukáže štítek „nestandardizováno“.

### `data/pojistovny-kmen-mesicni.json` — měsíční kmen z přerozdělení MZ (generovaný, volitelný)

Výstup `ingest/transform_pojistovny_kmen_mesicni.js` (metodika § 4.3). Měsíční počet pojištěnců
sedmi ZP **odvozený** podílem dvou částek z měsíčního přerozdělení pojistného MZ; MZ počty takto
přímo nezveřejňuje. Vstupy: `ingest/manual/pojistovny/prerozdeleni-mz-pojistovna.json` (tis. Kč na
pojišťovnu) a `prerozdeleni-mz.json` (Kč na pojištěnce), oba přepsané z PDF MZ se zdrojem a datem
ověření. Rozsah leden 2022 až říjen 2026 (58 měsíců). Validátor `validateKmenMesicni()` v
`ingest/validate-pojistovny.js` (volitelný dataset): 7 ZP, měsíce bez mezer, stejná délka řad,
kladné počty (`null` = nedohledáno, jen varování), `celkem` ≈ součet ZP ±0,2 %, index a přestupy
odpovídají počtům, průměr 2024 ≈ `hospodareni.pocet_pojistencu` ±0,5 %. Idempotentní: stejný
vstup = beze změny souboru. Čte ho jen `pojistovny-kmen.html` (`#zpKmenMesicni`, `#zpKmenPrestupy`).

```json
{
  "version": "1.0", "generated_at": "…", "_doc": "…",
  "zdroj": { "nazev": "…", "url": "https://mzd.gov.cz/prerozdelovani-pojistneho-na-verejne-zdravotni-pojisteni/",
             "soubory": ["…pojistovna_vysledek_2024_12.pdf", "…pojistovna_vysledek_2026_10.pdf", "…pojistenec_…"],
             "vstupy": ["ingest/manual/pojistovny/prerozdeleni-mz-pojistovna.json", "…prerozdeleni-mz.json"],
             "overeno": "2026-11-02", "vzorec": "pocet = castka_na_pojistovnu_tis_kc * 1000 / castka_na_pojistence_kc" },
  "mesice": ["2022-01", "…", "2026-10"],
  "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR", "pocty": [5898302, "…"], "index_2022_01": [100, 100.05, "…"] }],
  "celkem": { "pocty": ["…"], "index_2022_01": ["…"] },        // z řádku „Celkem zdravotní pojišťovny“
  "prestupy": {
    "terminy": [{ "termin": "1. 1.", "z_mesic": 12, "na_mesic": 1 }, { "termin": "1. 7.", "z_mesic": 6, "na_mesic": 7 }],
    "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR", "zmeny": [
      { "rok": 2025, "termin": "1. 7.", "z": "2025-06", "na": "2025-07", "pred": 6153976, "po": 6164936, "zmena": 10960, "zmena_pct": 0.18 } ] }],
    "celkem": { "zmeny": ["…"] }
  }
}
```

`pocty[i]` odpovídá `mesice[i]`; `null` = chybí vstup (nic se nedomýšlí). `prestupy` jsou čistá
změna kmene mezi prosincem a lednem (1. 1.) a mezi červnem a červencem (1. 7.), ne hrubé toky
(zahrnuje narození, úmrtí, stěhování a opravy registru). Přesnost: částka na pojištěnce je v celých
Kč (chyba ≈ ±0,02 %); průměr 2024 se od údaje MZ liší do 0,1 %, stav 12/2025 od CRP 2025 do 0,7 %
u šesti ZP a o 1,06 % u VoZP.

### `data/pojistovny-dotaznik-agregaty.json` — agregáty dotazníků (generovaný)

Export `scripts/export-dotaznik.js` z Neonu (§ 2.7 plánu); stránka zná jen tenhle soubor,
ne databázi. Jen souhrnné počty, žádné PII ani jednotlivé odpovědi.

```json
{ "version": "1.0.0", "generated_at": "…",
  "sady": { "<sada_id>": {
    "pocet_odpovedi": 0,
    "respondent_typy": { "pojistovna": 0, "pacientska_organizace": 0, "verejnost": 0 },
    "skryto": false,                                   // true při < 3 odpovědích → agregát se nezobrazí
    "otazky": { "<otazka_id>": { "<moznost>": 0 } }   // jen uzavřené otázky; volný text se neexportuje
  } } }
```

Prázdné `sady: {}` = zatím nic nesebráno (stav k 2. 11. 2026); modul pak agregace nevykreslí.

### `data/zadosti-106.json` — registr dotazů a žádostí pojišťovnám

Stav dotazů kola 1+ (nabídka spolupráce → žádost podle zákona 106/1999 Sb. → právo
na odpověď). Pole `stav` zapisuje **člověk** (odeslání je třída C); modul jen zobrazuje
a dopočítá lhůtu.

```json
{ "version": "0.1.0", "generated_at": "…", "_doc": "…", "changelog": [ … ],
  "zadosti": [{
    "id": "k1-nabidka-111", "kolo": 1,
    "typ": "nabidka-spoluprace",          // | "zadost-106" | "pravo-na-odpoved"
    "pojistovna_kod": "111",
    "odeslano": null,                       // YYYY-MM-DD
    "lhuta_dni": 15,
    "doruceno": null,                       // YYYY-MM-DD odpovědi
    "odpoved_soubor": null,                 // cesta v ingest/manual/pojistovny/odpovedi/
    "stav": "pripravena"                    // | odeslana | odpovezeno | po-lhute | bez-odpovedi
  }] }
```

Odvozený stav (`zadostStav`): `odeslana` po uplynutí `lhuta_dni` od `odeslano` → `po-lhute`.
Matice pokrytí: odpovězeno = ✓, čeká = ½, po lhůtě / bez odpovědi = ✕, připravena = „—“.

### `data/pojistovny-sit.json` — síť smluvních odborností per ZP (generovaný prototyp)

Dva generátory, každý píše jen své bloky; kontrola `validateSit()` v
`ingest/validate-pojistovny.js`, metoda a limity `docs/pojistovny-sit.md`. Čte
`src/pojistovny-sit.js` (`#zpSit` na `pojistovny-kmen.html`). Jen agregáty po krajích,
žádné řádky s IČO/jmény (GOVERNANCE § 6 bod 3).

| Blok | Generátor | Obsah |
|---|---|---|
| `odbornosti[]{kod, nazev}`, `kraje[]{kod, nazev}` | `ingest/fetchers/pojistovny-sit.js` | 7 kódů číselníku VZP 770 (001, 002, 014, 207, 305, 404, 603), 14 krajů NUTS3 (`CZ010`…) |
| `matice[zp][odb][kraj]`, `celkem_cr[odb][kraj]`, `kvalita[zp]` | `pojistovny-sit.js` | horní odhad ÚZIS NR-04-64 × NRPZS, stav `ref_datum` 2024-12-31; jednotka = místo poskytování NRPZS na IČO (adrese) smluvního IČZ |
| `seznamy_pojistoven[zp]` (volitelný) | `ingest/fetchers/pojistovny-sit-seznamy.js` | ze seznamu, který ZP sama zveřejňuje: `stav` `seznam` (VZP, ČPZP) \| `seznam-bez-odbornosti` (VoZP) \| `bez-seznamu` (OZP, ZPŠ, ZP MV ČR, RBP) \| `chyba`; `zdroj{nazev, url, stranka, format, velikost_b, http, stav_k, stav_k_zdroj, soubor_datum, overeno, licence}`, `jednotka`, `kraj_metoda`, `matice[odb][kraj]`, `celkem[odb]`, `bez_kraje[odb]` (jen `seznam`), `icz_celkem`, `icz_kraj[kraj]`, `icz_bez_kraje`, `kvalita{radku, icz, kraj_ciselnik, kraj_prefix, kraj_neurcen, …}`; `bez-seznamu` nese jen `zdroj.stranka` a `poznamka` |
| `seznamy_pojistoven_zdroj_kraje` | `pojistovny-sit-seznamy.js` | číselník IČZ ÚZIS OIS-12-02 (IČZ → okres → kraj) |
| `srovnani{metoda, odhad_ref_datum, zp[zp]{stav_k, odbornosti[odb]{seznam, odhad, pomer}}}` (volitelný) | `pojistovny-sit-seznamy.js` | `pomer = seznam / odhad` za ČR; `odbornosti: null` u VoZP (seznam bez odbornosti) |

Jednotka seznamu: smluvní zařízení (IČZ) s nasmlouvanou odborností. Seznamy nenesou
pracoviště (IČP) ani adresu; kraj se doplňuje z číselníku ÚZIS, jinak z dvojčíslí IČZ
(≥ 95 % jednomu kraji), jinak `bez_kraje`. Validátor hlídá `součet matice + bez_kraje =
celkem`, `icz_kraj + icz_bez_kraje = icz_celkem`, že `bez-seznamu` nenese čísla a že
`srovnani` sedí na obě strany (seznam = `celkem`, odhad = součet `matice`, `pomer`).

### `data/pojistovny-verifikace.json` — protokol druhého ověření (plánovaný)

Zatím neexistuje. Čísla z výročních zpráv jsou přepsaná z PDF a „čekají na druhé
ověření“ (pásek pracovní verze). Navržený tvar, aby se ověření dalo strojově hlídat
a pásek odstranit po položkách:

```json
{ "version": "0.1.0", "generated_at": "…",
  "polozky": [{ "soubor": "data/pojistovny.json",
                "cesta": "pojistovny[kod=111].hospodareni.naklady_na_pojistence_kc",
                "hodnota": 47998, "zdroj": "…pdf", "strana": 12,
                "overil": "clovek|ai", "overeno": "YYYY-MM-DD",
                "vysledek": "shoda|oprava|nelze-overit", "poznamka": null }] }
```

Až vznikne: validátor kontroluje, že `cesta` existuje a `hodnota` sedí s datasetem
(drift jako `claims.json`); schéma potvrdí balíček, který soubor založí.

### Analytické datasety srovnávače (PLAN-SROVNAVAC-ANALYTIK.md § 6)

Šest souborů z analytického plánu `05_M1_Starter/PLAN-SROVNAVAC-ANALYTIK.md`. Platí stejné
konvence jako výše: `version`, `generated_at`, `_doc`, `zdroj`; číselná položka je obálka
`{hodnota, rok, zdroj, list, radek, sloupec}` (u hodnot z PDF jsou `radek` a `sloupec` `null`),
nebo `null` s položkou v `chybi[]`. Kódy ZP jsou řetězce (`"111"`). Nic se nedopočítává
mimo uvedené podíly.

| Soubor | Vznik | Validátor | Kdo čte |
|---|---|---|---|
| `pojistovny-hospodareni-rady.json` | generovaný | `ingest/lib/validate-hospodareni-rady.js` | `src/pojistovny-penize.js` (vzniká) |
| `pojistovny-prerozdeleni.json` | generovaný | `ingest/lib/validate-prerozdeleni.js` | `src/pojistovny-penize.js` (vzniká) |
| `pojistovny-segmenty.json` | generovaný | `ingest/lib/validate-segmenty.js` (volá ho transform před zápisem) | `src/pojistovny-penize.js` (vzniká) |
| `pojistovny-instituce.json` | ruční | `ingest/lib/validate-instituce.js` | `src/pojistovny-instituce.js` (vzniká) |
| `pojistovny-smluvni-programy.json` | ruční | `ingest/lib/validate-smluvni-programy.js` | `src/pojistovny-instituce.js` (vzniká) |
| `pojistovny-dostupnost.json` | ruční | `ingest/lib/validate-dostupnost.js` | `src/pojistovny-instituce.js` (vzniká) |
| `pojistovny-fond-bilance.json` | generovaný z ručně pořízených přepisů VZ | `ingest/lib/validate-fond-bilance.js` | `src/pojistovny-penize.js`, `src/pojistovny-prevence.js` (A7) |

Validátory jsou čisté funkce. Pět z nich (hospodareni-rady, prerozdeleni, instituce, smluvni-programy,
dostupnost) importuje `ingest/validate-pojistovny.js` (`npm run validate:pojistovny`, součást `validate:all`).
Validátor segmentů běží v transformu a do `validate-pojistovny.js` zatím zapojen není.

#### `data/pojistovny-hospodareni-rady.json` — řady hospodaření 7 ZP, 2015–2024 (generovaný)

Generuje `ingest/transform_pojistovny_hospodareni_rady.js` (`npm run transform:pojistovny-mz`) z cache,
kterou stahuje `ingest/fetchers/mz-hodnoceni.js` (parsery `ingest/lib/mz-hodnoceni.js`). Zdroj:
Hodnocení vývoje systému veřejného zdravotního pojištění MZ ČR, pro každý ročník XLSX (tabulková příloha)
i PDF; `zdroj.soubory[]` nese 30 souborů (10 ročníků × 2 typy) s `sha256`. Jeden ročník = jedna hodnota
„skutečnost“ daného roku.

| Klíč | Typ | Popis |
|---|---|---|
| `roky` | `int[]` | `[2015, …, 2024]`, souvislá řada |
| `zdroj` | objekt | `nazev`, `url` (stránka MZ), `soubory[]{rok, typ, soubor, url, sha256}`, `stazeno_at` |
| `jednotky` | `{ukazatel: text}` | jednotka každého ukazatele (tabulka níže) |
| `pojistovny[]` | 7 položek | `kod`, `zkratka`, `rady{}` (31 ukazatelů), `historicke[]` (prázdné: kódy sedmi ZP se v letech 2015–2024 nezměnily) |
| `cr` | `{rady}` | řádek CELKEM sedmi ZP, stejná struktura `rady` |
| `zamestnanecke` | `{rady}` | CELKEM zaměstnaneckých ZP (bez VZP) |
| `neaktivni_zp[]` | 7 položek | `kod`, `nazev`, `zkratka`, `stav` (`likvidace`, `vymazana`, `omezeny-rozsah`), `sloucena_do`, `rok`, `zdroj`; čísla nenesou. Pozor: kód `205` má u položky „Pojišťovna Garant - Hospital“ (`omezeny-rozsah`), zatímco ČPZP v `pojistovny[]` má kód 205 také — kolize kódů v datech, nevyřešena |
| `chybi[]` | položky | `ukazatel`, `roky[]`, `kody` (`"vsechny"`), `duvod` |

Každý ukazatel v `rady` je objekt `{"2015": obálka | null, …, "2024": obálka | null}`. Obálka má
`hodnota`, `rok`, `zdroj` (URL souboru), `list`, `radek` (číslo řádku jako v Excelu), `sloupec`
(písmeno). Hodnoty z PDF mají `radek` a `sloupec` `null`.

Ukazatele (31) a jednotky:

| Ukazatel | Jednotka | List / zdroj |
|---|---|---|
| `pojistenci_prumer` | osoby | tab.č.1 |
| `statni_pojistenci` | osoby | PDF Tab. 7 (2018–2024; 2015–2017 `null`) |
| `statni_pojistenci_pct` | % | PDF Tab. 7, podíl vypočtený z počtů |
| `zamestnanci` | osoby (přepočtený počet) | tab.č.1 |
| `pojistencu_na_zamestnance` | osoby | PDF Tab. 7 |
| `prijmy_celkem_mld` | mld. Kč | tab.č.1 |
| `pojistne_pred_prerozdelenim_mld` | mld. Kč | tab.č.1, „Příjmy z pojistného – výběr“ |
| `pojistne_po_prerozdeleni_mld` | mld. Kč | tab.č.1, „vč. vlivu přerozdělování“ |
| `vliv_prerozdeleni_mld` | mld. Kč | tab.č.1c (viz níže) |
| `naklady_zs_mld` | mld. Kč | Tabulka č. 3 |
| `naklady_na_pojistence_kc` | Kč | Tabulka č. 3a |
| `provozni_naklady_mil` | mil. Kč | PDF Tab. 4 (výdaje na vlastní činnost) |
| `provozni_naklady_pct` | % | PDF Tab. 4 (podíl na výdajích celkem) |
| `provozni_limit_pct` | % | `null` ve všech letech (MZ uvádí limit jen v tis. Kč) |
| `provozni_limit_pridelu_mil` | mil. Kč | tab.č.1a |
| `provozni_pridel_mil` | mil. Kč | tab.č.1a |
| `provozni_vyuziti_limitu_pct` | % | tab.č.1a, příděl / maximální limit přídělu × 100 |
| `zustatek_bu_zfzp_mld` | mld. Kč | tab.č.1b, KZ na účtu ZFZP k 31. 12. |
| `rezervni_fond_mld` | mld. Kč | tab. č. 1d |
| `pohledavky_po_lhute_mil` | mil. Kč | tab.č.1, pohledávky za plátci po lhůtě |
| `zavazky_po_lhute_mil` | mil. Kč | tab.č.1, závazky vůči poskytovatelům po lhůtě |
| `hospodarsky_vysledek_mld` | mld. Kč | tab.č.1, saldo příjmů a výdajů celkem |
| `fond_prevence_mil` | mil. Kč | Tabulka č. 3c (celkem: zdravotní programy + ozdravné pobyty + ostatní činnosti) |
| `fond_prevence_na_pojistence_kc` | Kč | Tabulka č. 3c (totéž na pojištěnce; web Peněz ho od A6.1 neukazuje jako index, v roce 2021–22 v něm dominuje covidové testování) |
| `fond_prevence_programy_mil` | mil. Kč | PDF Tab. 17, „Náklady na zdravotní programy“ (2018–2024; pomlčka „–“ = 0 s `poznamka`); `cr` z Tab. 16 |
| `fond_prevence_pobyty_mil` | mil. Kč | PDF Tab. 17, „Náklady na ozdravné pobyty“ |
| `fond_prevence_ostatni_mil` | mil. Kč | PDF Tab. 17, „Ostatní činnosti“ (co do nich MZ počítá, Hodnocení nedefinuje; 2021–22 hlavně antigenní testování na covid) |
| `fond_prevence_jine_zdroje_mil` | mil. Kč | PDF Tab. 17, „Z jiných zdrojů (VoZP ČR)“; jen VoZP ČR, u ostatních ZP `null` + záznam v `chybi[]` |
| `fond_prevence_celkem_t17_mil` | mil. Kč | PDF Tab. 17, „Celkové náklady“ (shoda s `fond_prevence_mil` ±1 mil. Kč) |
| `fond_prevence_programy_na_pojistence_kc` | Kč | zdravotní programy / `pojistenci_prumer`; MZ zaokrouhluje na mil. Kč (u ZPŠ chyba zaokrouhlení kolem 3 %) |
| `fond_prevence_ostatni_podil_pct` | % | ostatní činnosti / celkové náklady Tab. 17 × 100 |
| `fond_prevence_zpp_mil` | mil. Kč | Tabulka č. 3c, sloupec „Rok N ZPP“ = plán fondu prevence z ZPP pojišťovny (2015–2024 bez `null` u 7 ZP, `cr` i `zamestnanecke`; A7.1) |
| `fond_prevence_plneni_zpp_pct` | % | skutečnost Tab. 3c / `fond_prevence_zpp_mil` × 100 na 4 desetinná místa (MZ tiskne totéž ve sloupci „ZPP (v %)“; 2024: VZP 129,9, VoZP 98,1, ČPZP 106,9, OZP 100,5, ZPŠ 91,6, ZP MV 137,6, RBP 90,2, ČR 120,7) |
| `fond_prevence_podil_pojistneho_pct` | % | `fond_prevence_mil`(rok) / (`pojistne_po_prerozdeleni_mld`(rok − 1) × 1 000) × 100; strop 3 % (§ 7c zák. 551/1991, § 18b zák. 280/1992) se počítá z pojistného po přerozdělení za PŘEDCHOZÍ rok. 2015 = `null` (chybí 2014) a je v `chybi[]`; u VZP 2015–2022 nese buňka `poznamka` „před 2023 jiný režim zdrojů fondu u VZP“. Obálka ukazuje na řádek Tab. 3c (`list` popisuje obě složky) |

**Plán, plnění a podíl na pojistném (A7.1 a, b).** `parseTab3c` vrací kromě `celkem` a `na_pojistence` i `zpp_celkem` a
`zpp_na_pojistence` (sloupec s rokem a podhlavičkou „ZPP“, ve všech ročnících 2015–2024 těsně vlevo od skutečnosti).
Podíl na pojistném je jediná řada, která bere hodnotu z jiného ročníku (`sestavRady` předává výpočtu předchozí ročník).
Validátor: plnění ZPP 0–300 % a plán ≥ 0 jsou chyby; podíl na pojistném mimo 0–3,5 % je chyba, nad 3 % WARN s hodnotou
(nad strop se do fondu smí dostat i pokuty, penále a převod z provozního fondu, proto to není automaticky porušení);
plnění vs. skutečnost / plán (±1 p. b.) je WARN. Testy: `tests/mz-hodnoceni.test.js` (fixtury `tab3c-2015.json`, `tab3c-2024.json`).

**Řady fondu prevence z Tab. 17 (A6.1).** U ZP jen ročníky 2018–2024; v PDF 2015–2017 tabulka po pojišťovnách není,
tyto roky jsou `null` a v `chybi[]` je důvod „Tab. 17 v Hodnocení za rok … není“. V `cr.rady` jsou stejné řady
2015–2024 z Tab. 16 (u 2015–2017 z Tab. 8 v tis. Kč, přepočteno na mil. Kč), vždy ze sloupce roku v PDF téhož roku. V PDF
Hodnocení 2018 jsou sloupce „2018“ a „2018 ZPP“ zaměněny, proto je u 2018 použit sloupec, který sedí na Tab. 17
(vysvětlení v `poznamka` buňky). Parsery `parseTab17`, `parseTab16`, `vyberTab16` v `ingest/lib/mz-hodnoceni.js`,
fixtury `tests/fixtures/mz-hodnoceni/pdf-tab16-17-*.txt`. Validátor: Σ (programy + pobyty + ostatní + jiné zdroje) =
celkem Tab. 17 ±1 mil. Kč (chyba), programy ≤ celkem (chyba), celkem Tab. 17 vs. Tabulka č. 3c a Σ ZP vs. `cr` jen jako varování.

**`vliv_prerozdeleni_mld` není platba státu.** Je to list tab.č.1c („Vliv přerozdělování“; v PDF
„Výstupy z přerozdělování platby státu“) a je rovno `pojistne_po_prerozdeleni_mld` minus
`pojistne_pred_prerozdelenim_mld`. VZP 2024: 293,134759 − 189,756319 = 103,37844 mld. Kč. Součet za všechny
ZP odpovídá platbě státu a paušální dani přerozdělené do systému. MZ platbu státu po jednotlivých ZP
nezveřejňuje, proto z těchto dat čisté saldo přerozdělení po pojišťovnách nevzniká (relativní saldo
je v `pojistovny-prerozdeleni.json`, jiný výpočet).

Validátor hlídá: `roky` 2015→2024 souvisle; sedm kódů v pořadí; každá obálka má číselnou `hodnota`,
`rok` shodný s klíčem, `zdroj` jako https URL a `list`; 12 základních řad nesmí být `null`; `vliv` =
po − před (±0,0015 mld. Kč); Σ ZP = `cr` (resp. `zamestnanecke`) ±0,5 % u součtových ukazatelů;
`statni_pojistenci_pct` v pásmu 40–70 %, `provozni_naklady_pct` 0,5–5 %; srovnání s `pojistovny.json`
(počet pojištěnců, příjmy, náklady na pojištěnce, hospodářský výsledek) v toleranci 0,1 % nebo absolutní
toleranci.

```json
{
  "version": "1.0", "generated_at": "…",
  "roky": [2015, "…", 2024],
  "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR", "historicke": [],
    "rady": {
      "pojistenci_prumer": { "2024": { "hodnota": 6150186, "rok": 2024,
        "zdroj": "https://mzd.gov.cz/wp-content/uploads/2024/06/vz2024_hodnoceni_tab_1-1a-1b-1c-1d-2-4.xlsx",
        "list": "tab.č.1", "radek": 7, "sloupec": "D" }, "…": "…" },
      "…": "…" } }],
  "chybi": [{ "ukazatel": "statni_pojistenci", "roky": [2015, 2016, 2017], "kody": "vsechny", "duvod": "…" }]
}
```

#### `data/pojistovny-prerozdeleni.json` — výběr vs. výsledek přerozdělení (generovaný)

Generuje `ingest/transform_pojistovny_prerozdeleni.js` (součást `npm run transform:pojistovny-mz`) ze dvou ručně přepsaných vstupů z PDF MZ „Přerozdělování pojistného“:
`ingest/manual/pojistovny/prerozdeleni-mz-vyber.json` (100% výběr, 2019→, a doplněk výsledku 2019–2021,
tis. Kč/měsíc) a `prerozdeleni-mz-pojistovna.json` (částka po přerozdělení, 2022→). Vstupy stahuje
`ingest/fetchers/mz-prerozdeleni.js`. Počet pojištěnců bere z `pojistovny-hospodareni-rady.json`, jinak z
`pojistovny-kmen-mesicni.json`. Validátor `validatePrerozdeleni()` v `ingest/lib/validate-prerozdeleni.js`
(při chybě transform skončí výjimkou).

| Klíč | Typ | Popis |
|---|---|---|
| `mesice` | `string[]` | `"YYYY-MM"`, leden 2019 – říjen 2026 (94 měsíců), souvislá řada |
| `pojistovny[]` | 7 položek | `kod`, `zkratka`, `vybrano[]` (tis. Kč, 100% výběr), `po_prerozdeleni[]` (tis. Kč), `rozdil[]` (tis. Kč = po − vybrano), `rozdil_relativni[]` (tis. Kč), `rocne{rok: …}` |
| `celkem` | objekt | Σ sedmi ZP: `vybrano[]`, `po_prerozdeleni[]`, `rozdil[]`, `rocne{rok: …}` (u `celkem.rocne` jsou položky salda `null`) |
| `posledni_rok_rocni` | `int` | `2025` (poslední rok s 12 měsíci) |
| `posledni_mesic` | `string` | `"2026-10"` |
| `zdroj` | objekt | `vyber` a `po_prerozdeleni` (`nazev`, `url`, `soubory[]`, `overeno`), `pocet_pojistencu` (text: odkud se bere počet), `vstupy[]` |

Položky `rocne[rok]`: `vybrano_mld`, `po_prerozdeleni_mld`, `rozdil_mld`, `saldo_relativni_mld`,
`saldo_relativni_pct_vybraneho`, `pojistenci_prumer`, `pojistenci_zdroj` (`"hospodareni-rady"` nebo
`"kmen-mesicni"`), `rozdil_na_pojistence_kc`, `saldo_relativni_na_pojistence_kc`, `mesicu`. Neúplný rok
(`mesicu` < 12, v datech 2026 s `mesicu` 10) má roční hodnoty `null`.

**Definice relativního salda** (doslova z `_doc`):

> saldo_relativni_mld = po_prerozdeleni − vybrano × (Σ po_prerozdeleni všech sedmi ZP / Σ vybrano všech sedmi ZP), za rok z ročních součtů; rozdil_relativni[] je totéž po měsících (tis. Kč, podíl se počítá v témže měsíci). Je to aritmetická identita, ne odhad: o kolik pojišťovna dostala víc nebo míň, než kdyby se celý objem po přerozdělení (vybrané pojistné + platba státu + paušální daň + úroky) rozdělil v poměru jejího podílu na vybraném pojistném. Součet přes sedm pojišťoven je z konstrukce nula.

Ve stejném `_doc` je i věta: „Čisté saldo vůči platbě státu (po − vybrano − platba státu na pojišťovnu) z veřejných dat spočítat nejde“. Platba státu jde na zvláštní účet přerozdělování, ne na konkrétní pojišťovnu, a MZ ji po pojišťovnách nezveřejňuje. Rozdíl `rozdil` (včetně platby státu, paušální daně a úroků) je totéž jako `vliv_prerozdeleni_mld` v `pojistovny-hospodareni-rady.json` (VZP 2024: 103,373 mld. zde proti 103,378 mld. v Hodnocení). Tabulka 100% výběru v PDF MZ je o zhruba 0,6 % nižší než „výběr“ v Tab. 1 Hodnocení MZ (2024: 340,615 vs 342,591 mld. Kč); validátor to hlásí jako varování.

Validátor hlídá: 7 ZP se správnými kódy; měsíce souvislé a řady stejně dlouhé; `vybrano` > 0 tam, kde není `null`;
Σ sedmi ZP = `celkem` ±2 tis. Kč měsíčně (výběr i po přerozdělení); `rozdil` = po − vybrano; roční součty
odpovídají měsíčním a mají 12 měsíců; Σ `saldo_relativni_mld` za rok = 0 (±0,001 mld. Kč) a Σ měsíčních
`rozdil_relativni` = 0 (±2 tis. Kč); `posledni_rok_rocni` je poslední rok s 12 měsíci; rok 2024: Σ výběru ≈
„výběr“ v Tab. 1 Hodnocení (±0,5 %, jinak varování).

```json
{
  "version": "1.0", "generated_at": "2026-11-03T07:02:58Z", "_doc": "…",
  "mesice": ["2019-01", "…", "2026-10"],
  "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR",
    "vybrano": [12323903, "…"], "po_prerozdeleni": [17215459, "…"], "rozdil": [4891556, "…"],
    "rozdil_relativni": [1628893.1, "…"],
    "rocne": { "2024": { "vybrano_mld": 188.541, "po_prerozdeleni_mld": 291.914, "rozdil_mld": 103.373,
      "saldo_relativni_mld": 17.2536, "saldo_relativni_pct_vybraneho": 9.15, "pojistenci_prumer": 6150186,
      "pojistenci_zdroj": "hospodareni-rady", "rozdil_na_pojistence_kc": 16808,
      "saldo_relativni_na_pojistence_kc": 2805, "mesicu": 12 } } }],
  "celkem": { "…": "…" },
  "posledni_rok_rocni": 2025, "posledni_mesic": "2026-10"
}
```

#### `data/pojistovny-segmenty.json` — náklady ZS podle segmentů péče, 7 ZP + CELKEM, 2015–2024 (generovaný)

Generuje `ingest/transform_pojistovny_segmenty.js` (součást `npm run transform:pojistovny-mz`) z XLSX Hodnocení
MZ ČR, listy „Tabulka č. 3“ (tis. Kč) a „Tabulka č. 3a“ (Kč na pojištěnce); `zdroj.soubory[]` nese 10 souborů
(`typ: "xlsx-3"`). Náklady ZFZP na zdravotní služby, skutečnost. Validátor `validateSegmenty()` v
`ingest/lib/validate-segmenty.js` běží v transformu před zápisem (chyba = soubor se nezapíše). Čte
`src/pojistovny-penize.js` (vzniká souběžně).

| Klíč | Typ | Popis |
|---|---|---|
| `roky` | `int[]` | `[2015, …, 2024]` |
| `zdroj` | objekt | `nazev`, `url`, `soubory[]{rok, typ, soubor, url, sha256}` |
| `segmenty[]` | 62 položek | `id` (slug stabilní napříč ročníky), `nazev`, `nazev_kratky`, `skupina` (`ambulantni` 23 · `luzkova` 19 · `leky` 5 · `ostatni` 15), `uroven` (1–4 podle kódu řádku v listu), `poradi`; pokud se úroveň mezi ročníky liší, je v `uroven_podle_roku` |
| `cr` | `{rady}` | řádek CELKEM ZP; `rady{rok: {segment_id: obálka}}` |
| `pojistovny[]` | 7 položek | `kod`, `zkratka`, `rady{rok: {segment_id: obálka}}`, `celkem{rok: obálka}` (řádek I. „Náklady na zdravotní služby celkem“) |
| `chybi[]` | 26 položek | `segment`, `roky[]`, `kody` (`"vsechny"` nebo kód ZP), `duvod` (např. řádek „Soudní lékařství“ v Tabulce č. 3 není v letech 2023–2024) |

Obálka segmentu: `tis_kc` (skutečnost v tis. Kč, bez zaokrouhlení), `na_pojistence_kc` (z Tabulky č. 3a, Kč),
`zpp_tis_kc` (plán, zdravotně pojistný plán téhož roku, tis. Kč), `zdroj`, `list`, `radek`, `sloupec`. Segment,
který ročník v listu nemá, je `null` a je v `chybi[]`. Nic se nedopočítává ani nesčítá.

Validátor hlídá: 7 ZP a CELKEM; roky vzestupně po jednom; každá hodnota je obálka nebo `null`; `id` segmentů
jsou jedinečná; enumy `skupina` a `uroven`; Σ řádků úrovně 1 = `celkem` ±0,5 %; `celkem` = `naklady_zs_mld`
v `pojistovny-hospodareni-rady.json` ±0,1 % (jen varování: `na_pojistence_kc` × počet pojištěnců ≈ `tis_kc` × 1000 ±1 %).

```json
{
  "roky": [2015, "…", 2024],
  "segmenty": [{ "id": "amb_celkem", "nazev": "Na ambulantní péči celkem …", "nazev_kratky": "Ambulantní péče celkem",
                 "skupina": "ambulantni", "uroven": 1, "poradi": 1 }, "…"],
  "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR",
    "rady": { "2024": { "amb_celkem": { "tis_kc": 80154583, "na_pojistence_kc": 13032.871363565266,
      "zpp_tis_kc": 73998000, "zdroj": "https://mzd.gov.cz/wp-content/uploads/2024/06/vz2024_hodnoceni_tab_3-3a-3b-3c.xlsx",
      "list": "Tabulka č. 3 (tis. Kč) a Tabulka č. 3a (Kč na pojištěnce)", "radek": 9, "sloupec": "F" }, "…": "…" } },
    "celkem": { "2024": { "tis_kc": "…", "…": "…" } } }],
  "chybi": [{ "segment": "amb_soudni", "roky": [2023, 2024], "kody": "vsechny", "duvod": "…" }]
}
```

Plán A1.4 předepisuje k grafu poznámku, že segmenty jsou ze ZFZP, akruálně, podle metodiky MZ.

#### `data/pojistovny-instituce.json` — instituční rámec 7 ZP (ruční)

Ručně vedený dataset: zákon, vznik, složení a způsob obsazení orgánů, ředitel, dohled, limit nákladů
na činnost, členství. Zdroje: výroční zprávy 2024 a 2025 (`ingest/manual/pojistovny/vz-text/<kod>-<rok>.txt`,
strana PDF) a konsolidovaná znění zákonů (`zdroje[]`, 19 položek s `id`, `nazev`, `url`, `overeno`, `poznamka`).
Validátor `validateInstituce()` v `ingest/lib/validate-instituce.js`. Čte `src/pojistovny-instituce.js` (vzniká).

**Neobsahuje jména osob.** Členové orgánů jsou jen počty a způsob obsazení. Validátor odmítá klíče
`jmeno`, `prijmeni`, `osoby`, `osoba`, `clenove`, `predseda`, `mistopredseda`. Jména jsou třída C
a o nich rozhodne vydavatel; v `chybi[]` je to první položka (`pole: "organy.*.osoby"`).

| Klíč | Typ | Popis |
|---|---|---|
| `stav_k` | `YYYY-MM-DD` | datum stavu dat (2026-11-03) |
| `limit_vzorec` | objekt | `predpis` (vyhl. 418/2003 Sb., § 7 odst. 2), `vzorec`, `vyznam`, `url`, `overeno`, `poznamka` |
| `zdroje[]` | 19 položek | `id`, `nazev`, `url`, `overeno`, `poznamka`; na ně odkazují všechna pole přes `zdroj` |
| `pojistovny[]` | 7 položek | viz níže |
| `chybi[]` | 11 položek | `kod` (ZP nebo `null`), `pole`, `duvod` |

Položka `pojistovny[]`: `kod`, `zkratka`, `nazev`, `ico` (text), `sidlo_mesto`, `ico_zdroj{soubor, strana, vz_url, shoda}`,
`zakon{cislo, nazev, zdroj}` (`551/1991 Sb.` u VZP, `280/1992 Sb.` u ostatních), `vznik{rok, datum, puvod, poznamka, sloucene[], zdroj}`
(`puvod` ∈ `statni` | `resortni` | `podnikova` | `oborova`), `organy{spravni_rada, dozorci_rada, reditel, rozhodci_organ}`,
`dohled{organy[], poznamka, zdroj}`, `provozni_limit_pct{hodnota, rok, zdroj}` (rok podle zdroje; u VZP 2024),
`clenstvi[]{nazev, url, poznamka, zdroj}`, `weby{hlavni, pro_poskytovatele, vyrocni_zpravy}`,
`zamestnanci_odkaz` (text: cesta do `pojistovny.json`, zaměstnanci se tu neduplikují), `poznamky[]`.

Orgán: `spravni_rada` a `dozorci_rada` mají `pocet`, `obsazeni[]{kdo, pocet, poznamka}` (součet `pocet` = `pocet`
hlídá validátor), `funkcni_obdobi_let`, `zdroj`; `reditel` má `funkce`, `jmenuje`, `funkcni_obdobi_let`, `ve_funkci_od`,
`poznamka`, `zdroj`; `rozhodci_organ` má `existuje`, `slozeni_zakon`, `poznamka`, `zdroj`.

Validátor hlídá: 7 ZP s unikátními kódy; enumy (`puvod`, `zakon.cislo`); VZP podle 551/1991, zaměstnanecké
podle 280/1992; součet `obsazeni[].pocet` = `pocet`; u každého pole `zdroj` (citace + paragraf nebo VZ, URL
v `zdroje[]`); `stav_k` jako datum; zákaz klíčů s osobními údaji.

```json
{
  "stav_k": "2026-11-03",
  "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR", "nazev": "Všeobecná zdravotní pojišťovna ČR",
    "ico": "41197518", "zakon": { "cislo": "551/1991 Sb.", "…": "…" },
    "vznik": { "rok": 1992, "datum": "1992-01-01", "puvod": "statni", "sloucene": [], "…": "…" },
    "organy": { "spravni_rada": { "pocet": 30, "obsazeni": [{ "kdo": "vláda", "pocet": 10, "…": "…" }, "…"] },
                "…": "…" },
    "provozni_limit_pct": { "hodnota": 2.91, "rok": 2024, "zdroj": { "…": "…" } } }],
  "chybi": [{ "kod": null, "pole": "organy.*.osoby", "duvod": "Jména členů orgánů se záměrně nezapisují …" }]
}
```

#### `data/pojistovny-smluvni-programy.json` — bonifikační programy pro poskytovatele (ruční)

Rešerše webů pojišťoven (ruční průchod 2026-11-03). U programů bez veřejné stránky je citace z výroční
zprávy 2025 (`zdroj_typ: "vz"`). Inventář existence programů, ne hodnocení. Soubor sám říká, že existence
programu není jeho účinek ani důkaz kvality a počet programů se nesmí řadit ani sčítat do pořadí pojišťoven.
Prázdný seznam neznamená, že program neexistuje. Validátor `validateSmluvniProgramy()` v
`ingest/lib/validate-smluvni-programy.js`; čte `src/pojistovny-instituce.js` (vzniká).

| Klíč | Typ | Popis |
|---|---|---|
| `stav_k` | `YYYY-MM-DD` | datum stavu (2026-11-03) |
| `skala.segmenty` | `{id: popis}` | enum segmentů: `VPL`, `PLDD`, `AS`, `stomatologie`, `nemocnice`, `lekarna`, `fyzioterapie`, `domaci_pece`, `vice`, `jiny` |
| `skala.kriteria` | `{id: popis}` | enum kritérií: `kvalita`, `dostupnost`, `e-health`, `prevence`, `ekonomika` |
| `pojistovny[]` | 7 položek | `kod`, `zkratka`, `web_pro_poskytovatele`, `programy[]`, `nenalezeno`, `poznamky[]` |
| `chybi[]` | 4 texty | co se nepodařilo dohledat (např. e-health program u žádné ZP, veřejná stránka ČPZP) |

Program (`programy[]`, celkem 28 v datech): `id` (`"<kod>-<slug>"`, např. `"111-vzp-plus-vpl"`), `nazev`,
`segment` (enum), `kriteria[]` (enum), `popis`, `od_roku` (rok, nebo `null`; validátor hlídá 1990–2100),
`url` (https), `citace` (doslovný výňatek), `overeno` (datum), `zdroj_typ` (`web` | `vz`; 16 + 12).
`nenalezeno` je `null`, nebo — u pojišťovny bez programů — `{popis, url[]}` (validátor to vyžaduje).
Ve všech sedmi ZP je v datech `null`.

Validátor hlídá enumy segmentů a kritérií, https URL a formát dat. Obsah nehodnotí.

#### `data/pojistovny-dostupnost.json` — co pojišťovny publikují o dostupnosti péče (ruční)

Inventář: 5 sloupců × 7 ZP. Nehodnotí dostupnost ani pojišťovny; říká jen, zda a kde je údaj k dispozici.
Zdroje: výroční zprávy 2023–2025 (`radek` = číslo řádku v textu z `vz-text/`, citace je doslovný zlomek jednoho
řádku) a weby pojišťoven (ověřeno 2026-11-03 přímým stažením; sitemap prohledán na klíčová slova). Citace
ověřuje `tests/pojistovny-dostupnost-data.test.js` proti textům VZ. Validátor `validateDostupnost()` v
`ingest/lib/validate-dostupnost.js`; čte `src/pojistovny-instituce.js` (vzniká).

| Sloupec (`id`) | Název | Co se zjišťuje (`popis`, zkráceně) |
|---|---|---|
| `cekaci_doby` | Čekací doby | Publikuje pojišťovna, jak dlouho pojištěnci čekají na plánovanou péči, nebo odkazuje na tato data? |
| `sit_nedostatkove` | Nedostatkové oblasti | Publikuje seznam oblastí či okresů se zhoršenou dostupností, nebo programy pro ně? |
| `zajisteni_pece` | Zajištění péče na žádost | Má postup pro pojištěnce, který nenašel lékaře, a publikuje počty žádostí či výsledky? |
| `lhuty_307` | Plnění NV 307/2012 | Publikuje číselné vyhodnocení dojezdových dob a lhůt, nebo jen tvrdí, že síť kritéria splňuje? |
| `par16` | Mimořádná úhrada § 16 | Publikuje počty žádostí o mimořádnou úhradu podle § 16 zák. 48/1997 Sb., podíl schválených a lhůty vyřízení? |

Stav buňky (`pojistovny[].<sloupec>`): `stav` ∈ `ano` | `castecne` | `ne` (škála v `skala`: `ano` = veřejný a konkrétní
údaj; `castecne` = píše se o tom neúplně; `ne` = při uvedeném hledání nenalezeno). Buňka nese `co` (slovní popis
co říká a kde se hledalo), `url` (https), nebo `soubor` + `radek` (text VZ), `citace` (max 200 znaků), `rok`
a `overeno`. Každá buňka s `stav` musí mít `url`, nebo `soubor` + `radek`.

Dataset dále nese `srovnatelnost[]` (5 textů: stav „ano“ u různých ZP neříká totéž, proto se počty nesmějí řadit
do jednoho žebříčku), `chybi[]` (6 textů) a `pojistovny[].poznamky`. Čekací doby v textech VZP ČR a ZP MV ČR
se týkají čekací listiny k transplantaci, ne čekacích dob na péči.

```json
{ "stav_k": "2026-11-03",
  "sloupce": [{ "id": "cekaci_doby", "nazev": "Čekací doby", "popis": "…", "pravni_zaklad": "…" }, "…"],
  "pojistovny": [{ "kod": "111", "zkratka": "VZP ČR",
    "cekaci_doby": { "stav": "ne", "co": "…", "url": null, "soubor": "111-2025.txt", "radek": 1299,
                     "citace": "…", "rok": 2025, "overeno": "2026-11-03" },
    "par16": { "stav": "castecne", "co": "…", "url": null, "soubor": "111-2024.txt", "radek": "…", "…": "…" } }, "…"] }
```

### `data/pojistovny-fond-pravidla.json` (A6.2)

Pravidla čerpání fondu prevence u sedmi ZP a veřejné kontroly fondu. Inventář, ne hodnocení; validátor `ingest/lib/validate-fond-pravidla.js` (součást `validate:pojistovny`).

| Pole | Význam |
|---|---|
| `version`, `generated_at`, `stav_k`, `_doc`, `skala`, `poznamky_autora[]`, `zdroje[]{id,nazev,url}` | obálka a metodika; `skala` popisuje stavy ano / castecne / ne / null |
| `ramec{zakon[]{predpis,paragraf,obsah,url}, zmena_2026, strop_pct, strop_popis, nenarokovost{text,citace,url,overeno_at}, stanovisko_mz{datum,forma,obsah,citace,url,overeno_at}}` | § 7b/7c zák. 551/1991 Sb., § 18a/18b zák. 280/1992 Sb., strop 3 %, nenárokovost, stanovisko MZ z 11/2025 |
| `podminky[]{id,nazev,popis}` | 9 podmínek v pevném pořadí: registrace_trva, bez_preregistrace, preventivni_prohlidka, bez_dluhu, lhuta_podani_dni, strop_dospely_kc, strop_dite_kc, jen_aplikace, podminene_prispevky |
| `pojistovny[]{kod,zkratka,podminky{id:{stav,hodnota?,citace,url,overeno_at,poznamka?}},kontroly[]}` | `stav` ano / castecne / ne / null; null = nenalezeno, vyžaduje `poznamka` (otázka do kola 1); `hodnota` jen u lhůty a stropů (Kč); u lhůty navíc `jednotka` dni / mesice tak, jak ji pojišťovna uvádí (kalendářní měsíce se nepřepočítávají na dny); citace doslovná, do 450 znaků, `url` https |
| `kontroly[]{id,organ,cislo,rok_kontroly,obdobi,predmet,zjisteni[],castky_kc?[{popis,kc}],reakce,url,url_dalsi?}` | `organ` NKÚ / MZ / MF / MZ a MF; bez jmen osob (validátor hlídá tituly a oslovení) |
| `kontroly_plosne[]` | stejný tvar jako `kontroly[]`, kontroly týkající se všech pojišťoven (akvizice pojištěnců) |

Frontend: `src/pojistovny-prevence.js` (`pravidlaHtml`, `renderPravidla`) na stránce Prevence; explainer `fond_prevence` v `data/explainers.json`.

### `data/pojistovny-fond-bilance.json` (A7.1 c, A7.2)

Bilance fondu prevence (Fprev) sedmi ZP za roky 2022–2025 z výročních zpráv (VZ). Zdroj: přepisy PDF
`ingest/manual/pojistovny/vz-text/<kod>-<rokVZ>.txt` (k dispozici VZ 2023–2025, u RBP 2023 a 2025, u ZPŠ 2023 a 2024; ZPŠ 2020
v repu je, ale mimo rozsah). Oddíl „Fond prevence“ má podle šablony MZ (příloha č. 7) tabulku A (tvorba a čerpání, účetně)
a B (příjmy a výdaje bankovního účtu fondu), vždy se sloupcem „Skutečnost“. Generuje ho
`node ingest/transform_pojistovny_fond_bilance.js`, idempotentně (druhý běh nemění
soubor ani `generated_at`); validátor `ingest/lib/validate-fond-bilance.js` je součást `validate:pojistovny`. Částky jsou
v tis. Kč, počty v kusech. Dataset je účetní evidence, nic nehodnotí.

| Pole | Význam |
|---|---|
| `version`, `generated_at`, `stav_k`, `_doc`, `zdroj{nazev,adresar,soubory[]{soubor,sha256}}`, `roky[]` | obálka a metodika; `roky` = `[2022, 2023, 2024, 2025]` |
| `pojistovny[]{kod,zkratka,roky{<rok>},poznamky_autora[]}` | `kod` je řetězec (`"111"` … `"213"`), pořadí jako ve zbytku srovnávače |
| `roky[rok].tvorba{ze_zf,pokuty_penale,ostatni,z_pf,celkem}` | `ze_zf` = řádek 1.2.1 (převod ze ZFZP z pojistného), `pokuty_penale` = 1.2.2, `z_pf` = 1.2.3 (převod z provozního fondu; informativní, součást `ostatni`), `celkem` = II. Tvorba celkem. `ostatni` je jediná **odvozená** hodnota (`odvozeno: true`): celkem − ze_zf − pokuty_penale (prázdný řádek 1.2.1 nebo 1.2.2 = 0) |
| `roky[rok].cerpani_celkem`, `cerpani_programy` | III. Čerpání celkem (obsahuje i odpisy penále, snížení fondu a tvorbu opravných položek) a III.1 Preventivní programy (shoduje se s Tab. 3c MZ; u VoZP se Tab. 3c liší o „jiné zdroje“) |
| `roky[rok].zustatek_pocatecni`, `zustatek_konecny` | A.I a A.IV; chybí-li VZ roku, doplní se z konce předchozí / počátku následující VZ (`poznamka` v obálce) |
| `roky[rok].bu_zustatek_pocatecni`, `bu_zustatek_konecny` | B.I a B.IV, zůstatky bankovního účtu fondu |
| `roky[rok].vyuziti{pocet_prispevku,pocet_zadosti,pocet_osob,definice}` | počty za fond jako celek, jen kde je VZ uvádí (ZPŠ 2023: 76 393 a 2024: 85 266 příspěvků); `definice` je povinná, má-li některý počet hodnotu; příspěvky, žádosti a osoby nejsou totéž |
| `roky[rok].poznamky{<pole>: text}` | důvod u každého `null` (klíč je cesta pole, např. `tvorba.ze_zf`, `zustatek_konecny`, `vyuziti`); VZ, která v repu není, je řečeno výslovně |

Každá hodnota je obálka `{hodnota, soubor, radek, citace, poznamka?, odvozeno?}` nebo `null`: `soubor` je přepis VZ
(`^\d{3}-\d{4}\.txt$`), `radek` číslo řádku přepisu, kde je číslo vytištěno, `citace` text toho řádku se zhuštěnými mezerami
(do 220 znaků). Test `tests/pojistovny-fond-bilance.test.js` strojově ověřuje, že řádek `radek` obsahuje číslo z `hodnota`
(kromě odvozených).

Validátor: obálky a typy; `soubor` existuje v `vz-text` a `radek` leží v souboru; konečný zůstatek = počáteční + tvorba.celkem −
cerpani_celkem ±1 tis. Kč tam, kde jsou všechny čtyři (jinak WARN „neúplná bilance“ u roku, který má alespoň tvorbu nebo
čerpání); ze_zf + pokuty_penale + ostatni = celkem; cerpani_programy ≤ cerpani_celkem; konečný zůstatek roku = počáteční
zůstatek následujícího (WARN); čerpání programů proti `fond_prevence_mil` v `pojistovny-hospodareni-rady.json` ±2 % (WARN;
VoZP 2023 a 2024 se liší o jiné zdroje, −10,6 % a −9,4 %); každé `null` má důvod v `poznamky`; bez jmen osob.

### Doplňky k existujícím souborům

- **`data/pojistovny-otazky.json`** — sada `dostupnost-prechody` („Dostupnost péče a přestupy pojištěnců – první
  kolo“, typ `otevrene`, verze `"1"`, `faze` „kolo 1 · leden 2027 (spolu s fondem prevence)“, respondent všech
  7 ZP) se čtyřmi otázkami (`par16`, `zajisteni-pece`, `cekaci-doby`, `prechody`). Sada je navržená; odešle se až
  s kolem 1 a rozhoduje o tom člověk.
- **`data/explainers.json`** (§ 8 výše) — explainer `prerozdeleni_pojistneho` („Přerozdělení pojistného“,
  `category` `money`, `linked_indicators` `uhrada_zp_per_pojistenec`, `linked_strategies` `inst_vzp`, `inst_szp`,
  `verification_status` `needs_verification`, `verified_at` 2026-11-03). Text popisuje tentýž mechanismus jako
  `pojistovny-prerozdeleni.json`.
