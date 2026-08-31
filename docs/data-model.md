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
  "interactive_only": [ { "page_id": "1909", "title": "...", "nzip_page": "..." } ]
}
```

Pipeline:

```
ingest/fetchers/nzip_dohodovaci_rizeni.js   stáhne XLSX → ingest/cache/dohodovaci-rizeni/
ingest/transform_dohodovaci_rizeni.js       XLSX → ingest/nzip-extracts/{OIS}.json
ingest/build-dohodovaci-rizeni.js           katalog + extrakty + overlay → data/dohodovaci-rizeni.json
```

Spuštění celé pipeline: `npm run data:dohodovaci-rizeni`. Redakční overlay
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
      "phase": "pripominky",                            // pripominky | vyporadani | vlada | parlament | dokonceno
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
indikátoru). Stavy přepočítává noční rutina (PROMPT_NIGHTLY_ROUTINE § 3.6),
kandidáty výroků sbírá denní rutina. Opravy jen přes `meta.changelog[]`.

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
