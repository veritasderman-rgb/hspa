# Zdravé Česko — HSPA Dashboard · CLAUDE.md

Veřejný portál pro hodnocení výkonnosti zdravotního systému ČR podle metodiky OECD HSPA.
Inspirováno belgickým modelem **Healthy Belgium**.

---

## 🚦 Rychlá orientace pro novou session

**Než začneš úkol, přečti:**

1. **[`docs/quickref.md`](docs/quickref.md)** — kde co je, klíčové příkazy, datový kontrakt, stavová matice
2. **[`docs/decisions-log.md`](docs/decisions-log.md)** — co bylo odstraněno nebo opraveno (nevracet zpět!)
3. **[`docs/traps.md`](docs/traps.md)** — známé pasti (JSON escaping, CSS pravidla, test failures)

**Pro konkrétní úkol:**

| Úkol | Otevři |
|---|---|
| Přidat indikátor / článek / strategii / explainer | [`docs/workflows.md`](docs/workflows.md) |
| Editorial pravidla, audit lifecycle, sourcing | [`docs/conventions.md`](docs/conventions.md) |
| Vizuální komponenty (`.av-*`, `.fn-*`, SVG patterns) | [`docs/visual-components.md`](docs/visual-components.md) |
| JSON schémata všech datasetů | [`docs/data-model.md`](docs/data-model.md) |
| Sitemap, per-page mapa JS modulů | [`docs/site-architecture.md`](docs/site-architecture.md) |
| Plán Kvalita péče (PUK + INDIKO) | [`05_M1_Starter/PLAN-KVALITA-PECE.md`](05_M1_Starter/PLAN-KVALITA-PECE.md) |
| Backlog, status auditu | [`BACKLOG.md`](BACKLOG.md), [`STATUS_AUDIT_*.md`](.) |
| Denní rutina cronu | [`PROMPT_DAILY_ROUTINE.md`](PROMPT_DAILY_ROUTINE.md) |

---

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
npm test          # 731 testů, 0 failures
npm run serve     # http://localhost:8080
```

## Git workflow (standardní pro každou změnu)

```bash
# 1) Vždy z čerstvého remote main
git checkout main && git pull origin main

# 2) Branch s prefixem claude/
git checkout -b claude/<descriptive-name>

# 3) Implementace, validace
npm run validate:all
npm test

# 4) Commit (česky, prefix feat/fix/docs/chore)
git add -A && git commit -m "feat(scope): popis"

# 5) Push + PR přes MCP github tools (NIKDY direct push do main)
git push -u origin claude/<branch>
```

**PR konvence**: structured body (Souhrn, Změny, Verifikace, Test plan), end-of-body trailer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Architektura

```
05_M1_Starter/
├── index.html                  ← Homepage (hub matrix, dimensions, finance, podcasts)
├── clanky.html                 ← Hub všech článků (matrix + filtry)
├── clanek-*.html               ← 212+ článků (long-form journalism, roste ~1/den)
├── hspa-prehled.html           ← HSPA 4 oblasti × domény (přehled indikátorů)
├── tematicke-linie.html        ← 5 tematických linií (linie = indikátory + články + strategie)
├── kraje.html                  ← Regionální dashboard (mapa krajů + tabulky)
├── pojistenci.html             ← OIS 11-47 (pojištěnci podle ZP × kraj × okres)
├── glosar.html                 ← 110 odborných pojmů (definice + odkazy)
├── prevence.html               ← Vakcinace + screeningy
├── strategie.html              ← Národní strategické dokumenty
├── o-projektu.html             ← O projektu, metodika
├── jak-funguje.html            ← Jak HSPA hodnocení funguje (vysvětlení)
├── model-systemu.html          ← Interaktivní kauzální mapa systému (páky, hrany, režim „Zatlačte na páku")
├── redakce.html                ← Redakční tým a procesy
├── pracovni-skupiny.html       ← Pracovní skupiny MZ (síť PPO, spojky, kalendář)
├── pracovni-skupina.html       ← Detail jedné skupiny (?id=...)
├── pracovni-osoba.html         ← Profil osoby (?id=...): členství + externí odkazy (Hlídač státu)
├── pracovni-osoby.html         ← Kdo je kdo: adresář osob + dvojrole (firmy dle rejstříku)
├── pracovni-ukoly.html         ← Dashboard úkolů z jednání orgánů MZ (hledání, termíny, časová osa)
├── vestniky-mz.html            ← Archiv obsahu Věstníků MZ 1998→ (fulltext, rok × kategorie, PDF odkazy)
├── indicator.html              ← Stránka jednoho indikátoru (?id=...)
├── 404.html
│
├── src/                        ← Frontend ES modules (25 souborů, ~18 000 LOC)
│   ├── app.js                  ← Homepage (hub matrix, dimensions, podcasts, ticker)
│   ├── page-shared.js          ← Sdílené komponenty (nav, header, scroll)
│   ├── clanky.js               ← Hub článků + auto-bootstrap AV pro clanek-*.html
│   ├── article-visuals.js      ← AV designsystem (timeline, bar, table, flow, counter)
│   ├── article-toc.js          ← Table of Contents na stránkách clanek-*.html
│   ├── article-share.js        ← Sdílecí pásek pod článkem (nativní share + intenty, bez cookies)
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
│   ├── ppo.js + ppo-detail.js  ← Pracovní skupiny MZ (síť, spojky, heatmapa; detail)
│   ├── search.js               ← Globální fulltextové vyhledávání
│   ├── themes.js               ← Tematické linie
│   ├── redakce.js              ← Stránka redakce
│   ├── site-stats.js           ← Statistika hodnocení článků a pokrytí
│   ├── analytics.js            ← Plausible loader
│   ├── schema.js               ← JSON-LD structured data
│   └── styles.css              ← Veškeré CSS (~9 400 LOC, print, a11y, dark mode — tokenový přepínač)
│       + styles.min.css        ← Commitovaný minifikát — po úpravě styles.css VŽDY `npm run build:css`
│
├── data/
│   ├── indicators.json         ← Datový kontrakt HSPA (190 indikátorů: 131 HSPA + 59 monitoring)
│   ├── articles.json           ← Metadata 212+ článků (audit, rubric, tag, linked_indicators)
│   ├── glossary.json           ← 110 termínů (definice, odkazy)
│   ├── dimensions.json         ← 6 dimenzí kvality (přístupnost, efektivita, …)
│   ├── themes.json             ← 5 tematických linií (žít déle ve zdraví, najít nemoc dřív, …)
│   ├── strategies.json         ← Národní strategické dokumenty
│   ├── explainers.json         ← Kontextové texty (politika, reformy, koncepty)
│   ├── prevention.json         ← Vakcinace + screeningy
│   ├── regions.json            ← Krajská data (multi-dataset, v2 formát)
│   ├── pojistenci-d5-*.json    ← OIS 11-47 (ZP × kraj × okres)
│   ├── freshness.json          ← Stav čerstvosti dat na indikátor
│   ├── system-model.json       ← Model systému (uzly + kauzální hrany pro model-systemu.html)
│   ├── ppo.json + ppo-osoby.json + ppo-analyza/ ← Pracovní skupiny MZ (builder ingest/ppo/build-web.js z ingest/ppo/out/ + ingest/ppo/analyza/)
│   ├── claims.json             ← Registr kvantitativních tvrzení z článků (drift-check)
│   ├── tags.json               ← Řízený slovník tagů článků + aliasy (validované)
│   ├── series.json             ← Registr článkových sérií (členství = zdroj pravdy)
│   ├── rubrics.json            ← 8 rubrik (primární osa článků, landing pages)
│   ├── search-index.json       ← Fulltextový index článků (build:search-index)
│   ├── cz-regions.geojson      ← GeoJSON krajů
│   └── snapshot-YYYY-MM-DD.json ← Denní snapshoty datového kontraktu
│
├── indicators/                 ← Metodické karty (1 JSON = 1 indikátor)
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
GitHub Actions (týdně, pondělí 06:00 UTC)
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
npm run build:css         # Minifikace styles.css → styles.min.css (NUTNÉ po každé úpravě CSS — hlídá test)
npm run build:generated   # Přegeneruje VŠECHNY generované artefakty (po každém merge/rebase)
npm run setup:git         # Merge driver pro generované soubory (běží i sám po `npm install`)
npm run validate:all      # Validuje indicators + strategies + explainers + prevention
npm run verify:freshness  # Kontrola stáří dat (warn > 7 dní, fail > 30 dní)
npm run ingest            # Spustí celý ingest pipeline (seed v dev prostředí)
npm run transform         # Jen transform krok
npm run serve             # Lokální HTTP server
```

## Generované artefakty (nekonfliktní merge)

Čtyři commitnuté soubory se negenerují ručně — vznikají z ostatního obsahu repa:

| Soubor | Builder |
|---|---|
| `data/search-index.json` | `npm run build:search-index` |
| `data/diagnoza-index.json` | `npm run build:diagnoza` |
| `data/souvislosti.json` | `npm run build:souvislosti` |
| `src/styles.min.css` | `npm run build:css` |

### 🚫 V PR je NEcommituj

**Obsahový PR tyhle čtyři soubory nemění.** Neupravuj je ručně, nespouštěj kvůli
nim `build:generated` před commitem a nedávej je do `git add`. Když omylem
skončí v diffu, vyndej je:

```bash
git checkout origin/main -- \
  05_M1_Starter/data/search-index.json \
  05_M1_Starter/data/diagnoza-index.json \
  05_M1_Starter/data/souvislosti.json \
  05_M1_Starter/src/styles.min.css
```

Regeneraci obstará až `.github/workflows/regenerate-artifacts.yml` nad
zmergovaným mainem a výsledek commitne bot.

**Proč:** přepisoval je skoro každý PR i cron, takže se dvě větve na nich potkaly
prakticky vždycky. Kořenový `.gitattributes` je značí `merge=generated`, což
spraví **lokální** rebase — ale **GitHub merge drivery neumí**. Server-side merge
je ignoruje, hlásí konflikt a zablokuje tlačítko, i když `git rebase` na stroji
proběhne bez jediného zásahu. Jediná cesta, jak to odstranit úplně, je nemít ty
soubory v diffu.

`.gitattributes` zůstává jako pojistka pro cesty, které je měnit musí (publikační
cron commituje `search-index.json` přímo na main).

**Testy tím netrpí.** `deploy-check.yml` i `visual-a11y.yml` pouštějí
`build:generated` v runneru před testy, takže drift testy běží nad čerstvým
výstupem a rozbitý builder shodí CI stejně jako dřív. Commit z toho nevzniká.

**Lokálně** po změně obsahu drift testy selžou (artefakty jsou zastaralé) —
`npm run build:generated` je srovná, jen ten výsledek necommituj.

⚠️ Do `merge=generated` patří JEN artefakty, které `build:generated` umí
přegenerovat offline a deterministicky. Nikdy tam nedávej něco taženého ze
sítě (`data/kolonoskopie.json`) — tiché převzetí jedné strany by ztratilo data.

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
| Brand mark „HSPA Kompas" (logo, favicon, cover, pattern) | ✅ |

## Brand — HSPA Kompas

Stálý grafický prvek webu (přístroj orientace: stupnice měří, střelka ukazuje
směr, červený hrot = aktuální směr systému). **Propisuje se automaticky — při
tvorbě nové stránky/článku/coveru ho neřešíš ručně:**

- **Logo + favicon** injektuje `renderBrandMark()` v `src/page-shared.js` na každé
  stránce (přes `renderModuleNav`). Markup `.brand` v HTML needituješ.
- **Cover obrázky** dostávají kompas z `brandCompass()` v
  `ingest/scripts/generate-article-cover.js` (všech 6 stylů) — nový cover ho má sám.
- **Kanonické assety**: `05_M1_Starter/assets/brand/` (PNG generuje
  `node scripts/generate-brand-assets.js`).
- **Pravidla a varianty**: [`docs/visual-components.md`](docs/visual-components.md) §0.
  Závazné pravidlo: červená patří JEN hrotu střelky, zbytek je inkoust.

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
   - `<aside class="article-review-banner">` v publikovaném článku → fail.
     Tento banner je interní procesní poznámka (status revize, „vytvořeno
     daily routine", „čeká na ruční schválení") a NEPATŘÍ do publikovaného
     textu. V draftu je tolerován (jen varování) — musí být odstraněn před
     publikací.
3. **Drafty mají varování** (ne fail), pokud zůstanou `published: false`.

### Životní cyklus článku

1. **Draft**: HTML soubor `clanek-{slug}.html` + `data/articles.json` záznam
   s `published: false` a `audit-status: draft`. Viditelný jen v `redakce.html`.
2. **Audit**: detailní seznam změn z auditní revize PATŘÍ DO
   `<!-- HTML komentáře -->` (blok `audit:` v hlavičce souboru), NE do
   viditelného textu. Žádné `<aside class="article-review-banner">`,
   žádné inline „Status:" bannery — čtenář publikovaného článku nemá
   vidět redakční proces.
3. **Schválení**: `audit-status` → `verified` (nebo `review-pending`/`partial`
   pokud redakce publikuje s vědomím otevřených bodů — ale BEZ viditelného
   banneru). `published: true` se nastaví společně s konečným `date`.
4. **Release**: o 06:00 lokálního času v `date` se článek automaticky zobrazí
   napříč webem. GitHub Actions cron 06:00 UTC + Vercel rebuild zajistí, že
   `data/articles.json` je v ten okamžik aktuální.

### Publikační fronta — výběr článku dne

Cron `scripts/publish-scheduled.js` (`.github/workflows/publish-articles.yml`,
04:00 UTC) publikuje **nejvýše jeden článek denně**. Každý běh projde všechny
připravené články (včetně nově přidaných) a vybere jeden podle pravidla:

1. **Aktuálnost má přednost** — má-li některý kandidát pole `topical_until`
   (datum, do kdy je téma aktuální), vyhrává ten s **nejbližším** `topical_until`.
   Pole nastav u článků vázaných na událost/termín (novela, akce, výročí).
2. **Jinak nejdéle připravený** — vyhrává článek s nejstarším `ready_since`.
   `ready_since` se orazítkuje automaticky v den, kdy článek poprvé projde
   review holdem (stane se publikovatelným) — redakce ho needituje ručně. Seed
   z `date` vzniku (v minulosti), jinak dnešek → nejstarší drafty jdou ven dřív.
3. `scheduled_for` funguje jako **„ne dřív než"** — článek se nepublikuje
   před tímto datem; prázdné pole = může jít ven hned.

**Co je „připravené" (politika fronty).** Fronta stojí na pravidle „co je
připraveno, jde ven": běžný `draft` z denní/noční rutiny je obsahově hotový a
cron ho **smí automaticky publikovat**. Zadrží se jen články se skutečným
problémem — `audit-status` `flagged` / `draft-flagged` / `needs-rewrite`,
`_review_note` v `articles.json`, nebo **viditelný blokátor** v HTML (`(DRAFT)`
v `<title>`, `draft` v `article-meta-date`, `<aside class="article-review-banner">`).
Publikovatelné statusy: `draft`, `review-pending`, `partial`, `verified`.

**Povýšení při publikaci.** Vybraný `draft` se v okamžiku publikace automaticky
povýší na `review-pending` (`promoteStatusForPublish`) — publikovaný článek tak
**nikdy nenese status `draft`** (invariant validátoru `validate-articles.js`) a
čtenář vidí férový banner „čeká na ověření". HTML se srovná na `robots: index,
follow` (`applyPublishToHtml`). Redakce článek dodatečně povýší na `verified`
plným auditem.

Publikovaný článek dostane `date` = den publikace (zobrazí se s aktuálním
datem a uplatní se pravidlo viditelnosti v 06:00). Rozhodování při shodě:
`ready_since` → `scheduled_for` → `slug`.

**Redakční číslo `number` přiděluje také až publikace** (`assignPublicationNumber`).
Draft ani PR ho nenastavuje. Dokud si ho bral každý draft jako `max+1`, dva PR
z jedné noci si sáhly pro totéž číslo a kolidovaly na stejném řádku
`articles.json` — první šel zmergovat, druhý spadl do konfliktu, a po „vezmi
obojí" zůstaly dva články se stejným číslem (v korpusu jich takhle bylo 18,
než to validátor začal hlídat). Publikace je sériová, takže tam kolize nastat
nemůže. `validate:articles` odmítne duplicitu i publikovaný článek bez čísla.

**Počty indikátorů ve statickém HTML se ručně nebumpují.** `data-stat` spany
nesou jen zaokrouhlenou formulaci („kolem 190"), přesnou hodnotu doplní za běhu
`src/site-stats.js`. Dřív musel každý PR s novým indikátorem přepsat 191→192
v deseti místech napříč čtyřmi soubory; dva takové PR kolidovaly a při sériovém
merge vznikl špatný součet. Hlídá `tests/site-stats-fallbacks.test.js` —
přesné číslo ve fallbacku neprojde, a zaokrouhlení nesmí utéct od skutečnosti.

## Deploy (Vercel)

- **Root Directory:** `05_M1_Starter`
- **Framework Preset:** Other (statický web)
- **Build Command:** *(prázdné)*
- Po každém push do `main` Vercel automaticky rebuildne
- GitHub Actions cron (pondělí 06:00 UTC) commituje čerstvá data → Vercel rebuild

## Bezpečnostní pravidla

- Všechna data jsou agregovaná — žádné PII
- `User-Agent: ZdraveCesko-HSPA/1.0` ve všech HTTP požadavcích
- Cron nejvýše jednou denně (rate limit ÚZIS); datový refresh běží týdně (pondělí)
- Žádné API klíče — vše veřejné zdroje

## Další dokumentace

### Helper docs (orientation, doporučeno přečíst v každé nové session)

- [`docs/quickref.md`](docs/quickref.md) — cheatsheet: kde co je, příkazy, datový kontrakt, stavová matice
- [`docs/workflows.md`](docs/workflows.md) — playbooky: nový indikátor, článek, strategie, explainer, menu, cover, fetcher
- [`docs/conventions.md`](docs/conventions.md) — editorial + code konvence, audit lifecycle, sourcing, CSS namespacing
- [`docs/decisions-log.md`](docs/decisions-log.md) — strategická rozhodnutí, odstranění a opravy (co nevracet zpět!)
- [`docs/traps.md`](docs/traps.md) — známé pasti: JSON escaping, schema, test failures, recovery patterns

### Deep reference (otevřít při konkrétní práci)

- [`docs/site-architecture.md`](docs/site-architecture.md) — sitemap, per-page popis, JS moduly map
- [`docs/visual-components.md`](docs/visual-components.md) — AV designsystem + UI komponenty (hub matrix, scorecard, finance donut…)
- [`docs/data-model.md`](docs/data-model.md) — schémata všech JSON datasetů a jejich vztahy
- [`docs/taxonomy-decision.md`](docs/taxonomy-decision.md) — taxonomie HSPA framework
- [`docs/plan-dohodovaci-rizeni.md`](docs/plan-dohodovaci-rizeni.md), [`docs/nzip-dohodovaci-rizeni-katalog.md`](docs/nzip-dohodovaci-rizeni-katalog.md) — dohodovací řízení detail

### Living docs (aktuální plány a backlog)

- [`05_M1_Starter/PLAN-PRACE.md`](05_M1_Starter/PLAN-PRACE.md) — kompletní audit kódu/backlogu/automatizací + sada úkolů U1–U30 pro další vývoj (vstupní bod pro novou session bez konkrétního zadání)
- [`05_M1_Starter/PLAN-KVALITA-PECE.md`](05_M1_Starter/PLAN-KVALITA-PECE.md) — plán implementace Kvality péče (PUK + INDIKO)
- [`05_M1_Starter/PLAN-SYSTEM-MODEL.md`](05_M1_Starter/PLAN-SYSTEM-MODEL.md) — plán stránky Model systému (`model-systemu.html` + `data/system-model.json`): kauzální graf pák a vazeb
- [`05_M1_Starter/PLAN-CLAIMS.md`](05_M1_Starter/PLAN-CLAIMS.md) — plán registru tvrzení (`data/claims.json`): samo-verifikující se korpus, automatická detekce driftu
- [`05_M1_Starter/PLAN-TRI-ZIDLE.md`](05_M1_Starter/PLAN-TRI-ZIDLE.md) — plán herní trilogie „Tři židle" (ministr → ředitel nemocnice → pacient/lékař + perspektivy na Modelu systému)
- [`05_M1_Starter/PLAN-PREHLEDNOST-OBJEVITELNOST.md`](05_M1_Starter/PLAN-PREHLEDNOST-OBJEVITELNOST.md) — plán přehlednosti a objevitelnosti článků (212+ článků: mobilní vyhledávání, taxonomie, kolekce/série, rubriky jako landing pages, fulltext index); **vstupní bod pro práci na navigaci a vyhledávání**
- [`05_M1_Starter/PLAN-KRAJE-GRANULARITA.md`](05_M1_Starter/PLAN-KRAJE-GRANULARITA.md) — audit okresní/obecní granularity krajského dashboardu (42 datasetů, ČSÚ open-data API, okresní drill-down); **vstupní bod pro prohlubování krajských dat**
- [`05_M1_Starter/PLAN-ONKO.md`](05_M1_Starter/PLAN-ONKO.md) — návrh sekce „Rakovina: co teď" (`rakovina.html` + `data/onko-navigace.json`): systémová osa nad klinickou `cesta-pacienta.html` — kam patřím, nárok a § 16, na co se ptát, čemu věřit; **čeká na schválení vlastníkem**
- [`BACKLOG.md`](BACKLOG.md) — backlog (historický; aktuální vstupní bod je PLAN-PRACE.md)
- [`05_M1_Starter/PLAN-VERIFIKACE-INDIKATORU.md`](05_M1_Starter/PLAN-VERIFIKACE-INDIKATORU.md) — plán přepnutí indikátorů z „Ilustrativní" na „Ověřeno" (živé zdroje po dávkách); **samostatný vstupní bod pro tu práci**
- [`05_M1_Starter/PLAN-DATA-NZIP-LIVE.md`](05_M1_Starter/PLAN-DATA-NZIP-LIVE.md) — NZIP/ÚZIS větev verifikace: živé indikátory z „Datového zpravodajství" + doplnění datasetů ke článkům, s **povinným ověřovacím protokolem dat** (kojení-proof); **samostatný vstupní bod pro tu práci**
- [`STATUS_AUDIT_2026-05-18.md`](STATUS_AUDIT_2026-05-18.md) — historický audit stavu
- [`PROMPT_DAILY_ROUTINE.md`](PROMPT_DAILY_ROUTINE.md) — denní rutina pro AI agenta (discovery → 1 článek)
- [`05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md`](05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md) — noční údržbová rutina (sweep korpusu: aktualizace, grafika, kontrola zdrojů); skener `npm run scan:nightly`
- [`05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md`](05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md) — sociální rutina (1×/den): doplňuje frontu Bufferu na 10 postů/kanál podle aktuálnosti; Buffer = zdroj pravdy
- [`05_M1_Starter/PROMPT_AWARENESS_ROUTINE.md`](05_M1_Starter/PROMPT_AWARENESS_ROUTINE.md) — týdenní rutina „Týdnů zdraví": agent připraví draft dalšího mezinárodního dne (`data/awareness-weeks.json`), cron `awareness-weekly.yml` (`scripts/awareness-rotate.js`) ho pak deterministicky přepne draft→ready a archivuje doběhnuté; microsite `tyden.html` + popup se aktivují podle data
- [`05_M1_Starter/PROMPT_NEWSLETTER_ROUTINE.md`](05_M1_Starter/PROMPT_NEWSLETTER_ROUTINE.md) — týdenní newsletter (čtvrtek → pátek 11:00 přes Brevo): Florencin úvod + 3–4 neposlané články; evidence `data/newsletter-log.json`, builder `scripts/newsletter-build.js`
- [`05_M1_Starter/PROMPT_STRET_ZAJMU_ROUTINE.md`](05_M1_Starter/PROMPT_STRET_ZAJMU_ROUTINE.md) — rutina „Střet zájmů v poradních orgánech MZ“ (`data/ppo-coi.json`): pětistupňový žebřík vazba → relevantní vazba → potenciální střet → doložený projev → porušení pravidla; ověření identity proti Hlídači státu, globální i per-orgán statistiky. **Střet zájmů není překážka — má se přiznat.** Čeká na schválení vlastníkem
- [`docs/social-copywriting-manual.md`](docs/social-copywriting-manual.md) — jak psát příspěvky (hlavní věc do 1. věty, věcně ale poutavě, délky per síť, checklist)
- [`docs/social-buffer-prvni-prispevky.md`](docs/social-buffer-prvni-prispevky.md) — hotové launch příspěvky (etalon tónu a struktury)

## Soubory pro ignorování při hledání

- `ingest/cache/` — gitignored raw odpovědi ze zdrojů
- `node_modules/`
- `*.lock`
- `data/snapshot-*.json` — denní snapshoty (historie datového kontraktu)
- `data/search-index.json` — generovaný fulltextový index (`npm run build:search-index`)
