# HSPA Monitor — Site Architecture

Mapa kompletního webu `05_M1_Starter/`: sitemap, per-page popis, JS moduly,
CSS namespace průvodce. Pro každou stránku: účel · uživatel · data · moduly · CSS.

## Sitemap

```
zdrave-cesko.cz/
├── /                       index.html              (Homepage)
├── /clanky                 clanky.html             (Hub článků)
├── /clanek-{slug}          clanek-*.html × 65      (Long-form články)
├── /hspa-prehled           hspa-prehled.html       (HSPA rámec přehled)
├── /tematicke-linie        tematicke-linie.html    (8 tematických linií)
├── /kraje                  kraje.html              (Krajský dashboard)
├── /dohodovaci-rizeni      dohodovaci-rizeni.html  (Datová podpora dohod. řízení — 44 sad)
├── /pojistenci             pojistenci.html         (OIS 11-47 — atlas, dětská stránka výše)
├── /prevence               prevence.html           (Vakcinace + screeningy)
├── /strategie              strategie.html          (Národní strategie)
├── /legislativa            legislativa.html        (Legislativní radar — VeKLEP)
├── /pracovni-skupiny       pracovni-skupiny.html   (Pracovní skupiny MZ — síť PPO)
├── /pracovni-skupina?id=…  pracovni-skupina.html   (detail jedné skupiny)
├── /pracovni-osoba?id=…    pracovni-osoba.html     (profil osoby: členství, externí odkazy)
├── /pracovni-osoby         pracovni-osoby.html     (Kdo je kdo: adresář osob + dvojrole)
├── /pracovni-ukoly         pracovni-ukoly.html     (dashboard úkolů z jednání: hledání, termíny, časová osa)
├── /barometr               barometr.html           (Barometr politických prohlášení)
├── /glosar                 glosar.html             (110 termínů)
├── /o-projektu             o-projektu.html         (O projektu)
├── /jak-funguje            jak-funguje.html        (Jak zdravotnictví funguje)
├── /redakce                redakce.html            (Redakční fronta)
├── /indicator?id={id}      indicator.html          (Detail indikátoru)
└── /404                    404.html
```

## Stránky — per-page přehled

### `index.html` — Homepage

| | |
|---|---|
| **Účel** | Single-page entry. Hero score (CZ vs OECD), hub matrix odkazů, 6 dimenzí kvality, finance donut, podcast, denní ticker novinek. |
| **Cílový uživatel** | Veřejnost — první návštěva. Rychlý přehled stavu systému. |
| **Fetchuje** | `data/indicators.json`, `data/dimensions.json`, `data/strategies.json`, `data/explainers.json`, `data/articles.json` |
| **JS moduly** | `src/app.js` (vstup) → `page-shared`, `analytics`, `article-visuals`, `site-stats` |
| **CSS namespace** | `.hub-*` (hub matrix), `.dim-*` / `.dimnav-*` (dimenze), `.finance-*` (donut), `.podcast-*`, `.av-counter*` (animace), `.masthead-*`, `.score-*`, `.hero-*` |

### `clanky.html` — Hub článků

| | |
|---|---|
| **Účel** | Seznam všech publikovaných článků s filtry (topics, area). Statistiky (počet vydaných, plánovaných, indikátorů, témat). |
| **Cílový uživatel** | Čtenář, který hledá konkrétní téma napříč články. |
| **Fetchuje** | `data/articles.json`, `data/indicators.json` (přes `page-shared`) |
| **JS moduly** | `src/clanky.js` → `page-shared`, `article-visuals`, `article-toc`, `glossary-inline` |
| **CSS namespace** | `.hub-*`, `.topic-chip`, `.article-list-*`, `.articles-hero-*`, `.upcoming-*` |

### `clanek-*.html` × 65 — Long-form články

| | |
|---|---|
| **Účel** | Jeden HTML soubor = jeden článek. Long-form journalism: 800–3000 slov, vizualizace, citace zdrojů. |
| **Cílový uživatel** | Čtenář, který se chce ponořit do konkrétního tématu. |
| **Fetchuje** | (přímo nic; AV komponenty čtou z DOM) |
| **JS moduly** | Stejný `src/clanky.js` jako hub — auto-bootstrap `enhanceArticleVisuals()`, `enhanceArticleToc()`, `enhanceInlineGlossary()` |
| **CSS namespace** | `.article-*` (layout: page, body, lead, callout, sources, toc), `.av-*` (designsystem komponenty — viz `visual-components.md`) |

### `hspa-prehled.html` — HSPA rámec

| | |
|---|---|
| **Účel** | Vizualizace 4 oblastí × 12 domén × 71 (z 122) indikátorů. Zobrazuje gap — co dashboard zatím nemá. |
| **Cílový uživatel** | Odborník / tvůrce politik — chce vidět celý rámec a co chybí. |
| **Fetchuje** | `data/indicators.json`, `data/dimensions.json` |
| **JS moduly** | `src/hspa-prehled.js` → `page-shared` |
| **CSS namespace** | `.hspa-*` (matrix, domain, subdomain), `.dim-*`, `.gap-*` |

### `tematicke-linie.html` — Tematické linie

| | |
|---|---|
| **Účel** | 8 tematických linií (mentální zdraví, prevence, senioři, equity, dlouhodobá péče, finance, eHealth, kvalita). Každá agreguje články + indikátory. |
| **Cílový uživatel** | Čtenář, který přemýšlí "co se děje v oblasti X", ne podle administrativní struktury HSPA. |
| **Fetchuje** | `data/themes.json`, `data/indicators.json`, `data/strategies.json`, `data/explainers.json`, `data/articles.json` |
| **JS moduly** | `src/themes.js` → `page-shared` |
| **CSS namespace** | `.theme-*` (linie, hero, list), `.topic-*` |

### `kraje.html` — Krajský dashboard

| | |
|---|---|
| **Účel** | Interaktivní mapa krajů (SVG) + krajský dashboard. Klikání na kraj → tabulka indikátorů pro region. |
| **Cílový uživatel** | Regionální politik, zájemce o regionální disparity. |
| **Fetchuje** | `data/regions.json`, `data/indicators.json`, `data/cz-regions.geojson` |
| **JS moduly** | `src/kraje.js` (vstup) + `src/cz-map.js` (mapa) → `page-shared` |
| **CSS namespace** | `.kraje-*`, `.regions-*`, `.cz-map-*` |

### `dohodovaci-rizeni.html` — Datová podpora dohodovacího řízení

| | |
|---|---|
| **Účel** | Rozcestník 44 datových sad NZIP „Datová podpora dohodovacího řízení" (8 dimenzí + doplňkové registry). Bez parametru landing v editorial stylu homepage; `?id={sada}` detail jedné sady; `?view=analyza` strategická analýza (SWOT, predikce, animovaná velká čísla, koláč, časová osa). Sady NEJSOU klasické HSPA indikátory — jde o provozní/ekonomická data úhradové vyhlášky. |
| **Cílový uživatel** | Účastník dohodovacího řízení, analytik, novinář pokrývající úhrady. |
| **Fetchuje** | `data/dohodovaci-rizeni.json` |
| **JS moduly** | `src/dohodovaci-rizeni.js` → `page-shared`, `analytics` |
| **CSS namespace** | `.dr-*` (hero, dims-grid, dim-tile, card, detail, intl-table) |
| **Data** | Generováno `ingest/build-dohodovaci-rizeni.js` — slučuje katalog `ingest/mapping/nzip_dohodovaci_rizeni_catalog.json`, datové extrakty `ingest/nzip-extracts/*.json` (transform z XLSX) a redakční overlay `ingest/dohodovaci-rizeni-content.json`. Pipeline: `npm run data:dohodovaci-rizeni` (fetch → transform → build). Stav: kompletní — 43 sad `ready` napříč všemi dimenzemi (1, 2, 3, 5, 6, 7, 8 + doplňkové registry), 1 `external` (OIS 11-47 → atlas pojištěnců), 0 `stub`; dimenze 4 (Seznam výkonů) bez datových souhrnů. Typy vizualizace: line chart, věková pyramida, tabulka období, žebříčkový graf (ranked bars). |

### `pojistenci.html` — OIS 11-47 (struktura pojištěnců)

| | |
|---|---|
| **Účis** | Animovaný atlas struktury populace 2010–2025: zdravotní pojišťovny × kraj × okres. |
| **Cílový uživatel** | Datový novinář, regulator, pojišťovna. |
| **Fetchuje** | `data/pojistenci-d5-{kraj,zp,okres}.json`, `data/cz-regions.geojson` |
| **JS moduly** | `src/pojistenci.js` → `page-shared` |
| **CSS namespace** | `.pojistenci-*` (atlas, controls, story, tile) |

### `prevence.html` — Prevence

| | |
|---|---|
| **Účel** | "Co s tím můžu dělat já" — vakcinace, screeningy, životní styl. Kombinuje data + akční doporučení. |
| **Cílový uživatel** | Občan, který chce vědět co dělat. |
| **Fetchuje** | `data/prevention.json`, `data/indicators.json`, `data/strategies.json`, `data/articles.json` |
| **JS moduly** | `src/prevence.js` → `page-shared` |
| **CSS namespace** | `.prevention-*`, `.action-*` (action-day-tag, action-card), `.vakc-*`, `.cml-*` |

### `strategie.html` — Národní strategie

| | |
|---|---|
| **Účel** | Národní strategické dokumenty (Strategický rámec do 2035, eHealth 2025–2035, …) + jejich rozklad (responsibility matrix, timeline). |
| **Cílový uživatel** | Policy maker, novinář pokrývající reformy. |
| **Fetchuje** | `data/strategies.json`, `data/explainers.json`, `data/articles.json` |
| **JS moduly** | `src/strategies.js` → `strategy-policy-views`, `strategy-links`, `page-shared` |
| **CSS namespace** | `.strategy-*`, `.timeline-*`, `.rm-*` (responsibility matrix), `.gantt-*` |

### `pracovni-skupiny.html` + `pracovni-skupina.html` + `pracovni-osoba.html` — Pracovní skupiny MZ

| | |
|---|---|
| **Účel** | Mapa pracovních a poradních orgánů MZ (data z ppo.mzcr.cz): SVG síť skupin propojených sdílenými členy (layout předpočítaný builderem), žebříčky „spojek" (osoby ve více skupinách — s úředníky a bez nich), heatmapa doložených jednání po měsících, sekce „Co říkají zápisy" (zjištění z LLM analýzy zápisů s doklady na primární dokumenty), filtrovatelný katalog. Detail (?id=N): účel, složení, profese, jednání po letech, napojené skupiny se jmény sdílených členů, a z analýzy zápisů profil „Co skupina reálně dělá", hlavní témata se stavem, doložená jednání s rozhodnutími a úkoly (rozbalovací, s odkazem na zdrojový zápis) a transparentnost/praxe střetu zájmů. Osoba (?id=N): členství s rolemi napříč orgány a u kurátorovaných osob veřejné funkce + externí odkazy (Hlídač státu, tiskové zprávy); jména členů a spojek na hubu i detailu na ni odkazují a členové s ověřeným profilem mají u jména přímý odkaz „Hlídač ↗". Kdo je kdo (pracovni-osoby.html, src/ppo-osoby.js): prohledávatelný adresář všech osob (fulltext bez diakritiky, filtr kategorií, „jen ověřené") + faktická sekce Dvojrole z data/ppo-dvojrole.json (osoba → orgány s příznakem úhradového dosahu → firemní angažmá dle rejstříku, filtr „jen úhradové"). Úkoly (pracovni-ukoly.html, src/ppo-ukoly.js): dashboard úkolů zadaných na jednáních z data/ppo-ukoly.json — builder skládá jednani[].ukoly + otevřené úkoly profilů a parseTermin převádí české formulace termínů na ISO datum; fulltext, filtr orgánu, roční časová osa s počty, stránkování po 150. FÁZE 6 (osud úkolů): registry ingest/ppo/ukoly-stav/ (LLM sledování napříč zápisy, citace strojově ověřené proti korpusu) a ingest/ppo/ukoly-legislativa.json (kurátorská rešerše Věstník MZ/VeKLEP/Sbírka) builder připojuje k úkolům jako stav/sd/dk/du a ext; dashboard má chipy „✓ doloženo/✓ vydáno/pokračuje" + filtr osudu, detail skupiny SVG časovou osu úkolů (zadáno → termín/doložené splnění) z obohacených data/ppo-analyza souborů. Poctivost: splnění jen s doslovným dokladem, absence dokladu ≠ nesplněno. Detail skupiny nese kartu Otevřené úkoly (z analyza souboru) s deep-linkem pracovni-ukoly.html?skupina=N, který v dashboardu předvolí filtr orgánu. Vybrané skupiny mají kurátorovanou kartu „Souvislosti na webu" (články, prevence, dohodovací řízení — registr ingest/ppo/skupiny-souvislosti.json, builder hlídá existenci cíle i publikaci článku). |
| **Cílový uživatel** | Novinář, policy maker, odborná veřejnost — „kdo připravuje rozhodnutí a kdo sedí u kterých stolů". |
| **Fetchuje** | `data/ppo.json` (hub i detail), `data/ppo-osoby.json` (detail + osoba), `data/ppo-analyza/{id}.json` (jen detail, líně — jen skupiny s analýzou) |
| **JS moduly** | `src/ppo.js` (hub), `src/ppo-detail.js` (detail, importuje helpery z ppo.js), `src/ppo-osoba.js` (osoba) → `page-shared` |
| **CSS namespace** | `.ppo-*` (síť, panel, spojky, heat, tabulka, detail karty; `.ppo-a-*` analýza, `.ppo-zjisteni` hub, `.ppo-o-*` osoba) ; reuse `.ed-hero*`, `.filters-row`, `.level-nav`, `.related-*`, `.leg-source-note` |
| **Builder** | `ingest/ppo/build-web.js` (FÁZE 3; `npm run build:ppo`) z FÁZE 1 výstupů `ingest/ppo/out/*` a FÁZE 2 analýzy `ingest/ppo/analyza/*` (profily, jednání, synteza.json → `zjisteni`); FÁZE 4a merguje kurátorský registr `ingest/ppo/osoby-externi.json` (veřejné funkce + odkazy, guard na id×jméno; sekce `nepropojeno` dokumentuje zamítnuté kandidáty z Hlídače státu) do `ppo-osoby.json` — deterministický vč. layoutu sítě; testy `tests/ppo.test.js` |

### `vestniky-mz.html` — Věstníky MZ (archiv obsahu)

| | |
|---|---|
| **Účel** | Prohledávatelný HTML archiv Věstníků Ministerstva zdravotnictví (1998→): co je ve které částce. Fulltext bez diakritiky přes položky obsahu, filtr rok × kategorie (deterministická klíčová slova: screening, očkování, centra péče, léčiva, ceny a úhrady, standardy, vzdělávání, správní, dotace), seznam od nejnovějších s odkazy na stránku MZ i PDF. Poctivost: částka bez strojově přečteného obsahu ≠ prázdná částka (viditelná poznámka + odkaz na PDF). |
| **JS moduly** | `src/vestniky.js` → `page-shared` |
| **CSS namespace** | `.vst-*` (částka, obsah, kategorie chip); reuse `.ed-hero*`, `.filters-row`, `.ppo-uk-roky/-year/-list/-more`, `.leg-source-note` |
| **Data** | `data/vestniky.json` — staví `ingest/fetchers/vestniky.js` (`npm run fetch:vestniky`, součást `npm run ingest`): WP REST API `mzd.gov.cz/wp-json/wp/v2/vestnik` (351 částek; u novějších content = obsah) + u starších (hlavně 2006–2011) extrakce OBSAHu z prvních stran PDF přes pdfjs-dist. Cache `ingest/cache/vestniky/`. Síťový dataset — NEPATŘÍ do build:generated ani merge=generated. Testy `tests/vestniky.test.js`. |

### `legislativa.html` — Legislativní radar

| | |
|---|---|
| **Účel** | Zdravotnická legislativa v přípravě (VeKLEP): tabulka návrhů zákonů/vyhlášek s fází legislativního procesu, anotací a propojením na indikátory + články. Nad tabulkou samostatná sekce „Legislativní plán ministerstva" — plnění plánu legislativních prací vlády (co MZ slíbilo předložit a v jakém termínu vs. reálný stav). |
| **Cílový uživatel** | Policy maker, novinář, odborná veřejnost sledující novely. |
| **Fetchuje** | `data/legislativa.json` (items + plan_meta/plan_items), `data/articles.json` |
| **JS moduly** | `src/legislativa.js` → `page-shared` |
| **CSS namespace** | `.leg-*` (tabulka, fáze pilly, zdrojová poznámka), `.leg-plan-*` (sekce plnění plánu — počitadla, badge stavu, tabulka); reuse `.filters-row`, `.level-nav`, `.chip`, `.ed-hero*`, `.ed-kicker` |

Sekce plnění plánu (`renderPlan()` v `src/legislativa.js`) se vykresluje jen
pokud `legislativa.json` obsahuje `plan_items` (jinak se skryje celá).
Zobrazuje metadata usnesení vlády (`plan_meta`), souhrnná počitadla (v procesu /
ve Sbírce / nezahájeno / po termínu) a filtrovatelnou tabulku plánovaných
předpisů se stavem, odkazem na materiál VeKLEP (pokud existuje) a redakční
poznámkou k plnění (`plneni_poznamka`). Položka „po termínu" = plánovaný měsíc
uplynul a stav je stále `nezahajeno`/`pripominkove_rizeni` (viz
`isPlanItemOverdue()`). Kde se plánovaná položka propojí s konkrétním
materiálem radaru, nese `radar_id` (FK na `legislativa.items[].id`).


### `barometr.html` — Barometr politických prohlášení

| | |
|---|---|
| **Účel** | Závazky vlády ve zdravotnictví (verbatim z programového prohlášení) převedené na měřitelné checkpointy s baseline z indikátorů a stavem plnění počítaným z dat; sekce Ověřovna — výroky politiků s verdikty doloženými čísly. Metodika viz `docs/metodika-barometr.md` (verbatim vs. interpretace, steel-man, právo na odpověď). |
| **JS** | `src/barometr.js` |
| **Fetchuje** | `data/barometr.json`, `data/indicators.json` (aktuální hodnoty živě), `data/souvislosti.json` |
| **Údržba** | stavy závazků přepočítává noční rutina (§ 3.6), kandidáty výroků sbírá denní rutina |

### `glosar.html` — Glosář

| | |
|---|---|
| **Účel** | 110 odborných pojmů (HSPA, OECD, ÚZIS, NRC, DRG, …). Vyhledávání, abeceda, odkazy mezi termíny. |
| **Cílový uživatel** | Čtenář, který narazí na zkratku a chce ji rozšifrovat. |
| **Fetchuje** | `data/glossary.json` |
| **JS moduly** | `src/glosar.js` → `page-shared` |
| **CSS namespace** | `.glossary-*` (page, list, term, search), `.search-*` |

### `o-projektu.html`, `jak-funguje.html`, `redakce.html` — Meta-stránky

| Stránka | Účel | Klíčové moduly / CSS |
|---|---|---|
| `o-projektu.html` | Kdo, proč, jak. Manifest projektu. Diskuze metodiky 80 z 122 indikátorů. | Inline `<script type="module">`, `.editorial-*`, `.ed-*` |
| `jak-funguje.html` | Schéma aktérů systému (MZ, ZP, poskytovatelé, pacienti, ÚZIS, SÚKL) jako interaktivní SVG. | `src/explainers.js`, `.schema-*`, `.cat-*` (kategorie) |
| `redakce.html` | Fronta nepublikovaných článků (drafts + review-pending) pro redakční tým. | `src/redakce.js`, `.redakce-*` |

### `indicator.html?id={id}` — Detail indikátoru

| | |
|---|---|
| **Účel** | Plná karta indikátoru: hodnota, trend, benchmark, regionální rozpad (CZ mapa), metodika, články & strategie odkazující na tento indikátor. |
| **Cílový uživatel** | Specialista, novinář ověřující číslo. |
| **Fetchuje** | `data/indicators.json`, `data/strategies.json`, `data/explainers.json`, `data/articles.json`, `data/regions.json`, `indicators/{id}.json` |
| **JS moduly** | `src/indicator.js` + `src/cz-map.js` → `page-shared` |
| **CSS namespace** | `.ind-*`, `.cz-map-*`, `.av-*` |

## JS moduly — vztahy a životní cyklus

### Vstupní moduly (per-page)

| Modul | Stránka | LOC |
|---|---|---|
| `app.js` | `index.html` | 1540 |
| `clanky.js` | `clanky.html` + všechny `clanek-*.html` | 547 |
| `hspa-prehled.js` | `hspa-prehled.html` | 120 |
| `themes.js` | `tematicke-linie.html` | 267 |
| `kraje.js` | `kraje.html` | 292 |
| `pojistenci.js` | `pojistenci.html` | 1255 |
| `prevence.js` | `prevence.html` | 321 |
| `strategies.js` | `strategie.html` | 357 |
| `explainers.js` | `jak-funguje.html` | 403 |
| `glosar.js` | `glosar.html` | 107 |
| `redakce.js` | `redakce.html` | 116 |
| `indicator.js` | `indicator.html` | 515 |

### Sdílené moduly (importované)

| Modul | Co poskytuje | Importují |
|---|---|---|
| `page-shared.js` | Nav, masthead, scroll progress, escapeHtml, audienceText, renderInlineMarkdown, loadGlossaryTerms, wrapAcronyms | (skoro vše) |
| `analytics.js` | Plausible loader (22 LOC) | (skoro vše) |
| `article-visuals.js` | AV designsystem: enhanceArticleVisuals(), bar/counter/flow/timeline/table | `app.js`, `clanky.js` |
| `article-toc.js` | TOC z h2/h3 v článku, scroll-spy | `clanky.js` |
| `glossary-inline.js` | Inline rozbalovací <abbr title> + auto-link na glosář | `clanky.js` |
| `site-stats.js` | Site-wide statistiky (počet indikátorů, score, articles), `applyDataStats()` pro `data-stat` atributy | `app.js`, `page-shared.js` |
| `search.js` | Globální fulltextové vyhledávání (Ctrl+K) | `page-shared.js` |
| `cz-map.js` | SVG mapa krajů, klikatelné regiony | `kraje.js`, `indicator.js` |
| `themes.js` (export pomocníků) | — | (jen jako entry point) |
| `strategy-links.js` | Propojení strategií ↔ indikátory ↔ články | `strategies.js`, `explainers.js` |
| `strategy-policy-views.js` | Timeline, responsibility matrix renderery | `strategies.js` |
| `explainer-policy-views.js` | Gantt, DRG kalkulátor, explainer visuals | `explainers.js` |
| `schema.js` | JSON-LD structured data inject | `app.js`, `explainers.js` |

### Životní cyklus modulu

1. HTML stránka má `<script type="module" src="src/{page}.js"></script>` (na konci `<body>`).
2. Entry modul importuje `analytics.js` (registruje Plausible), `page-shared.js` (nav + masthead).
3. Vstupní funkce `init()` se spustí na `DOMContentLoaded` (nebo immediately, pokud už DOM existuje).
4. Modul fetchuje vlastní data (`data/*.json`) v `Promise.all`.
5. Rendery zapisují do `#root` / specifických ID, používají `escapeHtml()` z `page-shared`.
6. Animace (`av-counter`, `finance-tile-fill`) startují přes `IntersectionObserver` z `article-visuals.js`.

## Datasety (`data/*.json`)

Plné schémata viz [`data-model.md`](data-model.md). Stručný přehled:

| Soubor | Co obsahuje | Hlavní spotřebitelé |
|---|---|---|
| `indicators.json` | 80 HSPA indikátorů (kontrakt) | všechny stránky kromě glosáře |
| `articles.json` | Metadata 65 článků (audit, topics, linked_indicators) | `app.js`, `clanky.js`, `themes.js`, `indicator.js`, `redakce.js`, `search.js` |
| `glossary.json` | 110 termínů (def, alias) | `glosar.js`, `page-shared` (loadGlossaryTerms), `search.js`, inline glossary |
| `dimensions.json` | 6 dimenzí kvality | `app.js`, `hspa-prehled.js` |
| `themes.json` | 8 tematických linií | `themes.js` |
| `strategies.json` | Národní strategie + provazby | `strategies.js`, `app.js`, `themes.js`, `indicator.js`, `prevence.js`, `explainers.js` |
| `explainers.json` | Kontextové texty (politika, reformy) | `explainers.js`, `app.js`, `themes.js`, `indicator.js` |
| `prevention.json` | Vakcinace + screeningy | `prevence.js` |
| `regions.json` | Krajská data (multi-dataset, v2) | `kraje.js`, `indicator.js` |
| `cz-regions.geojson` | GeoJSON krajů | `cz-map.js`, `pojistenci.js`, `kraje.js` |
| `pojistenci-d5-{kraj,okres,zp}.json` | OIS 11-47 (struktura ZP × kraj × okres) | `pojistenci.js` |
| `freshness.json` | Stav čerstvosti dat per indikátor | (interní, ingest pipeline) |
| `snapshot-YYYY-MM-DD.json` | Denní snapshoty kontraktu | (historie, ne frontend) |

## CSS namespace průvodce

Veškeré CSS v jediném `src/styles.css` (~9 400 LOC). Třídy jsou organizované per-page / per-komponenta. Konvence: namespace-block-element-modifier.

### Globální / infrastructure

| Prefix | Co je |
|---|---|
| `.masthead-*` | Header s skóre, datum, navigace |
| `.module-*` / `.module-nav-*` | Sub-nav (kontextová navigace v sekci) |
| `.footer-*` | Patička |
| `.site-*` | Site-wide layout (container, gutter, grid) |
| `.search-*` | Globální vyhledávání (Ctrl+K modal) |
| `.disclaimer-*`, `.audit-*` | Auditní bannery (review-pending, flagged) |
| `.status-*` | Status pillsy (good/warn/bad/neutral) |
| `.ai-*` | AI disclaimer / generated-by labels |

### Homepage (`index.html`)

| Prefix | Co je |
|---|---|
| `.hero-*` | Hero blok |
| `.hub-*` | Hub matrix (modulární odkazy na ostatní stránky) |
| `.dim-*` / `.dimnav-*` | 6 dimenzí (přístupnost, kvalita, efektivita, equity, udržitelnost, bezpečnost) |
| `.score-*` / `.scorecard-*` / `.sc-*` | CZ skóre × OECD |
| `.finance-*` | Finance donut + tiles (rozpočet sektorů zdravotnictví) |
| `.podcast-*` | Podcast card |
| `.newsletter-*` | Newsletter signup |
| `.home-*`, `.top-*` | Homepage-specifické sekce |
| `.gap-*` | Gap section (chybějící indikátory) |

### Články (`clanek-*.html`)

| Prefix | Co je |
|---|---|
| `.article-*` | Layout článku: `page`, `header`, `lead`, `body`, `meta`, `breadcrumb`, `sources`, `cover`, `progress` |
| `.article-callout-*` | Callout blok (caveat, info) |
| `.article-databox-*` | Databox (key-value list v rámci článku) |
| `.article-flow-*` | Legacy flow (in/out 2-sloupcový) — viz migrace v `visual-components.md` |
| `.article-figure-*` | Figura s zdrojem |
| `.article-toc-*` | Table of Contents (collapsible v `<details>`) |
| `.article-tags`, `.article-tag-*` | Tagy / topics |
| `.article-list-*` | Seznam článků v hubu (clanky.html) |
| `.article-upcoming-*` | "Připravujeme" sekce |
| `.av-*` | Article Visuals designsystem (timeline, bar-compare, data-table, flow, counter) — viz `visual-components.md` |
| `.ed-*` / `.editorial-*` | Editorial styly (typografie, callouty) |

### Per-sekce komponenty

| Prefix | Stránka | Co je |
|---|---|---|
| `.hspa-*` | hspa-prehled | HSPA matrix (oblast × doména × indikátor) |
| `.theme-*` | tematicke-linie | Linie list, hero, badge |
| `.topic-*` | clanky, themes | Topic chips (filtry) |
| `.kraje-*` / `.regions-*` / `.cz-map-*` | kraje, indicator | Krajský dashboard, SVG mapa |
| `.pojistenci-*` | pojistenci | Atlas, controls, story, tile |
| `.prevention-*` / `.action-*` / `.vakc-*` / `.cml-*` | prevence | Vakcinace gauge, kapitace stairs, action cards |
| `.strategy-*` / `.rm-*` / `.gantt-*` / `.timeline-*` | strategie | Strategie cards, responsibility matrix, gantt |
| `.explainer-*` / `.ex-*` / `.ephf-*` / `.drg-*` / `.kapitace-*` | jak-funguje, strategie | Explainer renderery, DRG kalkulátor |
| `.schema-*` / `.cat-*` | jak-funguje | SVG schéma aktérů |
| `.glossary-*` | glosar | Glossary page, term card, search |
| `.redakce-*` | redakce | Redakční fronta |
| `.ind-*` | indicator | Indicator detail karta |

### Legacy / specifické

Některé CSS třídy v `styles.css` jsou specifické pro konkrétní článek nebo komponentu mimo namespace:
`.cmp-*` (compare funnel), `.sha-*` (SHA donut), `.drg-*` (DRG scenarios),
`.waffle-*` (100-cell visual), `.cekani-*` (cekaci doby), `.hly-*` (healthy life years).
Postupně migrované na `.av-*` — viz `visual-components.md`, sekce Migrace.

## Design tokens (CSS proměnné)

Definované v `:root` v `styles.css`. Hlavní:

| Token | Význam | Příklad |
|---|---|---|
| `--ink` | Primární text | `#1a1a1a` (light), `#e8e8e8` (dark) |
| `--ink-mut` | Sekundární text | `#5a5a5a` |
| `--bg` | Hlavní pozadí | `#fafafa` |
| `--paper` | "Papír" — karty, články | `#ffffff` |
| `--rule` | Linky a obrysy | `#d0d0d0` |
| `--accent` | Brand červená (HSPA) | `#c8102e` |
| `--good`, `--warn`, `--bad`, `--neutral` | Signál barvy | `#0a8a3a`, `#d97706`, `#c8102e`, `#6b7280` |
| `--serif` | Editorial font | `'Source Serif Pro', Georgia, serif` |
| `--sans` | UI font | `'Inter', system-ui, sans-serif` |
| `--mono` | Kód, čísla | `'JetBrains Mono', monospace` |

Dark mode web zatím nemá — všechny stránky jsou ve světlé „paper" paletě (viz UX audit 2026-06-11, §11).

## Animace a interaktivita

Detail viz [`visual-components.md`](visual-components.md), sekce Animation patterns. Stručně:

- **IntersectionObserver** spouští animace, když element vejde do viewportu.
- `data-av-init="1"` flag značí už inicializovaný element (idempotence).
- `prefers-reduced-motion: reduce` → žádná animace, finální hodnota okamžitě.
- **Easing**: `easeOutQuart` pro countery, lineární pro bar fills.
- **Tabular nums** (`font-variant-numeric: tabular-nums`) na všech čísel pro stabilní výšku během animace.

## Audit metadata (`data/articles.json`)

Každý článek má `audit-status`:

| Status | Význam | Banner |
|---|---|---|
| `verified` | redakcí ověřeno, čísla zkontrolována | žádný |
| `review-pending` | nový/upravený článek čeká na review | žlutý banner |
| `partial` | částečně ověřeno (text OK, čísla čekají) | žlutý banner |
| `flagged` | nalezený problém → blocking | červený banner |
| `draft-flagged` | rozpracovaný draft s otevřenými problémy | červený banner |

Pole `published: false` → článek se nezobrazí v hubu (`clanky.html`), ale je viditelný v `redakce.html`.

## Pravidla pro rozšiřování

### Přidat novou stránku
1. Vytvoř `{slug}.html` v `05_M1_Starter/` podle vzoru existujících (header, masthead, footer, module-nav).
2. Vytvoř `src/{slug}.js` — vstupní modul. Importuj `page-shared` (renderModuleNav, renderMastheadDate).
3. Fetchuj data z `data/*.json` (žádný přímý přístup ke zdrojům).
4. Definuj CSS namespace `.{slug}-*` v `styles.css`.
5. Přidej stránku do navigace v `page-shared.js`.
6. Napiš smoke test do `tests/{slug}_frontend.test.js`.

### Přidat nový dataset
1. Vytvoř `data/{name}.json` s `version` polem.
2. Přidej validátor do `ingest/validate-{name}.js` a do `package.json` skriptu `validate:all`.
3. Doplň schéma do `docs/data-model.md`.
4. Pokud generovaný — přidej fetcher do `ingest/fetchers/` a vstup do `ingest/run.js`.

### Přidat novou UI komponentu
1. Pokud generická → AV designsystem (`.av-*` v `article-visuals.js` + `styles.css`).
2. Pokud per-page → namespace per stránka (`.{page}-*`).
3. Dokumentuj v `docs/visual-components.md`.
4. Vyber animaci respektující `prefers-reduced-motion`.

---
*Verze 1.0 · květen 2026 · zdroj pravdy pro AI agenty i lidi*
