# Funkční audit — HSPA Monitor

**Datum auditu:** 2026-05-06
**Metoda:** spuštěn lokální server (`npm run serve`), všechny stránky a JSON endpointy ověřeny `curl`em, integrita dat ověřena programaticky proti `data/*.json` a `indicators/*.json`.

Tento dokument doplňuje [`AUDIT_UX_OBSAH_2026-05.md`](./AUDIT_UX_OBSAH_2026-05.md) — soustředí se na **funkční chování** a **integritu dat**, ne na UX/SEO/a11y.

---

## TL;DR — co je v pořádku, co opravdu nefunguje

| Oblast | Stav |
|---|---|
| HTTP routing (všechny stránky 200) | ✅ |
| JSON datové soubory se načítají | ✅ |
| Schéma `data/indicators.json` validní | ✅ |
| Method-card soubory existují všechny (58/58) | ✅ |
| Cross-reference indikátorů z UI | ✅ (12/12) |
| Cross-reference strategie → indikátory | ✅ (64/64) |
| Cross-reference themes → indikátory/strategie | ✅ |
| Test suite (po `npm install`) | ✅ 167/167 |
| Verifikační status indikátorů | ⚠️ **0× verified, 46× preliminary, 12× illustrative** |
| Live data pipeline (`origin: live`) | ❌ **Všech 58 indikátorů `origin: seed`** |
| Skóre v masthead | ❌ **Hardcoded 64, reálně 31** |
| Hero stats na strategie.html | ❌ **Vymyšlené počty (5 k revizi, 26 bez kontroly)** |
| Hero stats na jak-funguje.html | ❌ Hardcoded statika bez zdroje |
| Detail-page narativní sekce | ❌ **0/58 má `determinants`, 1/58 má `importance`, 3/58 má `patient_story`** |
| Linkování krajských dat na indikátor | ⚠️ 1 sirotek (`kojenecka_umrtnost_kraje` → neexistující `kojenecka_umrtnost`) |
| favicon.ico, robots.txt, sitemap.xml | ❌ 404 |

---

## 1) Datová integrita — co je v datech vs. co web tvrdí

### 1.1 — **Verifikační status: 0 indikátorů `verified`** *(P1)*

`data/indicators.json` obsahuje 58 indikátorů. Po programatickém průchodu:
- `verified` → **0 indikátorů**
- `preliminary` → 46
- `illustrative` → 12

`o-projektu.html` (řádek 90) i `indicator.js` (řádek 92) definují `verified` jako „Data z primárního zdroje, max. 12 měsíců staré" — ale **žádný indikátor v dashboardu tuto úroveň nedosahuje**. Veřejnost vidí badge „Předběžné" nebo „Ilustrativní" na všech 58 kartách, což snižuje důvěryhodnost portálu, který se hlásí ke statistické přesnosti.

**Důsledek pro citaci:** Pavlovic, J. (2026) cituje data, jejichž žádná položka není označena jako ověřená.

### 1.2 — **Všech 58 indikátorů má `source.origin: "seed"`** *(P1)*

Pipeline definovaná v `.github/workflows/refresh.yml` se má spouštět denně v 06:00 UTC, fetchovat z ÚZIS / ČSÚ / OECD / Eurostat a commitovat aktualizace. **Reálně to ale neprodukuje live data** — všech 58 záznamů má v `source.origin` hodnotu `"seed"`, tj. ručně nasazené hodnoty.

Stránka `o-projektu.html` (ř. 97) uživateli říká:
> „Data jsou automaticky aktualizována každý den v 06:00 UTC prostřednictvím GitHub Actions. Pipeline stahuje data z primárních zdrojů, provádí transformaci a validaci…"

To zjevně neplatí. Buď cron neběží, nebo běží a transformační vrstva drží `origin: seed` jako defaultní hodnotu (a fetchery ji nepřepisují). Nutné prozkoumat `ingest/transform.js` a denní log GitHub Actions.

`source.fetched_at` ukazuje rozsah `2026-05-04 06:00:00Z` až `2026-05-05 00:00:00Z` — datum se aktualizuje, ale obsahem zůstávají seed hodnoty.

### 1.3 — **Skóre: hardcoded 64, reálná hodnota 31** *(P1)*

`page-shared.js` (`computeHSPAScore`) bere indikátory s verifikačním statusem `verified` nebo `preliminary` (39 indikátorů jich projde filtrem) a výsledné skóre vypočte jako vážený průměr (good=100, warn=50, bad=0).

```
scoreable: 39 / 58
sum / count → 31
```

Ale masthead na 4 stránkách **(`index.html`, `jak-funguje.html`, `strategie.html`, `indicator.html`)** má hardcoded `<strong id="czScore">64</strong>`. Při načtení JS se hodnota viditelně přepíše z 64 → 31. **To je obrovský pokles, který uživatel registruje jako blikání i jako věcný šok.**

Buď byla hodnota 64 historicky správná a od té doby se data zhoršila, nebo nikdy neodpovídala — v každém případě je nutné odstranit hardcoded fallback.

### 1.4 — **Hero čísla na `strategie.html` nemají oporu v datech** *(P1)*

Hero stats:
- „**33 strategií**" → ✅ ano, `data/strategies.json` má 33 záznamů
- „**6 úrovní**" → ✅ ano, `level` nabývá 6 hodnot (national/sector/institution/eu/global/standard)
- „**5 k revizi**" → ❌ reálně mají horizon ≤ 2025 jen **1** strategie
- „**26 bez kontroly**" → ❌ **0 strategií** má jakékoli pole `accountability` nebo `accountability_status`. Nelze tedy říct, kolik z nich je „bez kontroly"

Footer „Veřejné peníze, veřejná kontrola" tvrdí:
- **Vyhodnoceno 4 · Čeká 3 · Bez kontroly 26**

Tato čísla **nejsou nikde v datech**. Jsou to hardcoded čísla v HTML, která uživatel přečte jako autoritativní zjištění z dat. **To je faktická chyba na stránce, která sama tvrdí: „Strategie bez vyhodnocení je jen plácání do vody."**

### 1.5 — **Hero čísla na `jak-funguje.html` jsou statika bez zdroje** *(P2)*

- „8,5 % HDP", „7 pojišťoven", „cca 26 000 lékařů", „14 % spoluúčast"

Ani jedna z těchto hodnot není v žádném datovém souboru. Jsou hardcoded v HTML s metadaty „SHA 2023" / „OECD" v patičce. Není nutně špatně — ale měly by být buď v `data/` (s `source` a `fetched_at`), nebo jasně označeny jako redakční fakta.

Pro statistický portál je nekonzistentní část čísel táhnout z dat (skóre, počet indikátorů) a část mít hardcoded.

### 1.6 — **Detail-page narativní sekce se prakticky nezobrazí** *(P1)*

`indicator.js` (ř. 132–160) renderuje 3 narativní sekce, pokud method card má příslušné pole:

| Sekce | Field v method card | Pokrytí |
|---|---|---|
| „Proč na tom záleží" | `card.patient_story` | **3 / 58** indikátorů |
| „Co tento indikátor ovlivňuje" | `card.determinants` | **0 / 58** ❌ |
| „V čem je indikátor zásadní" | `card.importance` | **1 / 58** |

55 z 58 detail-page indikátorů uživateli nezobrazí žádný **proč/co/k čemu** kontext. Přitom právě tyto sekce by měly proměnit „79,9 let" v sdělení relevantní pro veřejnou debatu.

**Pole `determinants` v žádném z 58 method-card souborů neexistuje.** Buď je v plánu doplnit, nebo je `indicator.js` napsaný proti starému schématu. Nutné rozhodnout.

Podle struktury method-card má každý indikátor uniformní pole `definition`, `data_source`, `benchmark_source`, `signal_thresholds`, `frequency`, `stewards`, `method_notes`, `limitations` — ale narativní vrstva pro veřejnost (story/why/who-cares) chybí.

### 1.7 — **Krajský sirotek: `kojenecka_umrtnost_kraje` linkuje na neexistující indikátor** *(P2)*

V `data/regions.json` je dataset `kojenecka_umrtnost_kraje` s `indicator_id: "kojenecka_umrtnost"`. **V indicators.json ale tento indikátor neexistuje** — odpovídající indikátor je `mortalita_kojenecka`. Důsledek: na detail-page `indicator.html?id=mortalita_kojenecka` se nezobrazí krajský graf, přestože data pro kraje jsou připravena.

`indicator.js`/`findRegionDataset()` hledá podle `linked_indicator_id` nebo `id`, ne podle `indicator_id` — takže matching selže. Oprava na úrovni dat: přejmenovat dataset id (`mortalita_kojenecka_kraje`) a `indicator_id` (`mortalita_kojenecka`) v `regions.json`. Zbylých 12 datasetů používá konzistentní jména.

---

## 2) Funkční chování stránek

### 2.1 — Všechny stránky odpovídají HTTP 200 ✅

| URL | HTTP |
|---|---|
| `/index.html` | 200 |
| `/jak-funguje.html` | 200 |
| `/prevence.html` | 200 |
| `/strategie.html` | 200 |
| `/schema.html` | 200 |
| `/tematicke-linie.html` | 200 |
| `/glosar.html` | 200 |
| `/o-projektu.html` | 200 |
| `/indicator.html?id=nadeje_doziti_total` | 200 |
| `/indicator.html?id=mortalita_kardiovaskularni` | 200 |
| `/indicator.html?id=does_not_exist` | **200 (! viz 2.2)** |

### 2.2 — `indicator.html?id=neexistujici` vrací 200 *(P3)*

Záměrně neexistující ID vrací 200, protože indicator.html je statický soubor a chyba se zobrazí JS-side. Pro SEO to znamená, že crawler může indexovat **prázdné chybové stránky** s metadaty „Detail indikátoru · HSPA Monitor" pro vymyšlené parametry — duplicitní obsah. Jen-JS-side validace + 200 status je špatné pro robots.

**Doporučení:** vrátit `noindex` v meta + canonicalize na `/index.html` při neznámém ID. (Nebo přesunout na server-side rendering / přesměrovat 404 redirect.)

### 2.3 — Detail-page funguje pro existující indikátor ✅

Pro `nadeje_doziti_total` se načte:
- `data/indicators.json` → najde položku
- `indicators/nadeje_doziti_total.json` → method card existuje
- `data/regions.json` → krajský dataset existuje (14 krajů, country_avg 77)
- Trend graf (5 datových bodů, 2020–2024)

Detail vykreslen kompletně.

### 2.4 — `indicators/` directory listing funguje na lokále, ale na Vercel ne *(P2)*

Footer odkazuje na `indicators/` jako „Metodické karty" link. Na lokálním `http-server` se zobrazí auto-index. **Vercel s `cleanUrls: true` vrátí 404** (auto-index není povolen). Nutno vygenerovat statický `indicators/index.html` se seznamem nebo z footeru odstranit.

### 2.5 — Odkazy v navigaci `index.html` `<nav class="module-nav">` jsou hardcoded a obsahují **7** záložek:

```
Indikátory · Jak funguje · Co s tím můžu dělat já · Strategie · Schéma systému · O projektu · Glosář
```

Ale `src/page-shared.js` (`renderModuleNav`) na ostatních stránkách generuje **8** záložek (přidává „Tematické linie"). Hardcoded nav v homepage je tedy **neúplná**, viz UX audit 2.1.

### 2.6 — Anchor odkazy `#cat-money`, `#level-national` jsou generovány JS dynamicky *(P3)*

`jak-funguje.html` má 4 hero kartičky s odkazy `href="#cat-money"`, `#cat-classification`, `#cat-actors`, `#cat-process`. Cílové IDs (`<section id="cat-money">`) **vznikají až po načtení `src/explainers.js`** — pokud uživatel klikne před tím, anchor neskočí. To samé pro `strategie.html` a `#level-*`.

V praxi (rychlý LAN) to není problém. Na pomalém připojení nebo při disabled JS to je broken link.

### 2.7 — Externí odkazy ✅

WHO IRIS (`apps.who.int/iris/handle/10665/66267`), OECD (`oecd.org/en/publications/...`), DOI (`doi.org/10.1787/...`), ÚZIS, ČSÚ, Eurostat — všechny vedou na platné cíle a jsou označeny `target="_blank" rel="noopener"`. ✅

---

## 3) Build, testy, deploy

### 3.1 — Test suite zelená po `npm install` ✅

```
# tests 167
# pass  167
# fail  0
```

(Předchozí audit chybně tvrdil 146/144 — to byl artefakt prostředí bez `node_modules`.)

### 3.2 — `CLAUDE.md` má **stale** počty *(P3)*

`CLAUDE.md` říká „93 testů, vše musí projít" a pipeline tvrdí „M8 · Verifikace (93 testů) ✅". Reálný stav je **167 testů**. Jedna ze dvou věcí: buď přidat tabulky aktualizovat, nebo stáhnout konkrétní čísla a místo toho psát „celá test suite zelená".

### 3.3 — Validační skripty v `package.json` ✅

`npm run validate:data` / `validate:strategies` / `validate:explainers` / `validate:prevention` — všechny existují a v test suite se volají. ✅

### 3.4 — Cron `refresh.yml` ✅

`.github/workflows/refresh.yml` je správně nastaven (06:00 UTC, validate, push do main → Vercel auto-deploy). Otázka, **proč data zůstávají v `origin: seed`** — pravděpodobně transformační vrstva nepřepisuje origin pro zdroje, které nemají specializovaný fetcher. Nutné prozkoumat `ingest/transform.js`.

---

## 4) Závažnost a doporučená priorita

| Priorita | Položka |
|---|---|
| **P1** | Skóre 64 vs. reálných 31 — uživatelsky viditelná lež. Odstranit hardcode. |
| **P1** | Hero stats na `strategie.html` (5 k revizi, 26 bez kontroly, footer 4/3/26) — nemají oporu v datech. Buď doplnit do `accountability` schema, nebo z UI odstranit. |
| **P1** | 0/58 indikátorů `verified` — buď reklasifikovat, nebo vysvětlit v UI „Tento dashboard zatím nemá verified data, vše je preliminary/illustrative". |
| **P1** | Detail-page narativní sekce: pole `determinants` neexistuje v žádné method-card. Buď doplnit data, nebo přejmenovat field v `indicator.js`. |
| **P1** | `kojenecka_umrtnost_kraje` linkuje na neexistující indikátor `kojenecka_umrtnost` — sjednotit na `mortalita_kojenecka`. |
| **P2** | Live data pipeline neprodukuje `origin: live` — investigovat `ingest/transform.js`. |
| **P2** | Hardcoded statika v `jak-funguje.html` hero — přesunout do `data/system-overview.json` se zdroji. |
| **P2** | `indicator.html?id=neexistuje` vrací HTTP 200 — přidat noindex/canonical při invalid ID. |
| **P2** | Footer link „Metodické karty → `indicators/`" na Vercel = 404. Vygenerovat statický index. |
| **P3** | `CLAUDE.md` aktualizovat počet testů (z 93 na 167). |

---

## 5) Co web dělá funkčně dobře (zachovat)

- **Validace dat při buildu**: 4 validační skripty pro 4 typy obsahu (indicators, strategies, explainers, prevention).
- **Cross-reference integrity**: 64 strategy→indicator linků a 0 broken; theme→indicator/strategy linky 100% čisté.
- **Method cards uniformní**: 58/58 mají všech 15 povinných polí — datový kontrakt drží.
- **Daily cron + Vercel CDN**: pipeline architektonicky správně, jen aktuálně produkuje seed data.
- **CSP + bezpečné headers**: nastavené ve `vercel.json` defaultně lépe než většina veřejných portálů.
- **Test suite široká** (167 testů pokrývajících fetchery, transform, schéma, lib utility).
- **Robustní fallbacky**: `localStorage` cache pro offline kopii dat; `try/catch` v každém JS modulu — pád jednoho fetche nevyhodí celou stránku.

---

**Závěr:** Web funguje jako interaktivní aplikace velmi dobře — všechny stránky se načtou, navigace mezi sekcemi funguje, JSON datová vrstva má clean schéma a referenční integritu. Hlavní problémy jsou v rovině **datové autenticity**:

1. Hodnoty na úvodní stránce (skóre 64) a hero stats na `strategie.html` (4 published / 3 pending / 26 missing) jsou prezentovány jako data-driven, ale jsou hardcoded a faktické — prezentují čísla, která nemají oporu v datasetu.
2. Pipeline je nastavený, ale produkuje seed hodnoty, ne live data — to je v rozporu s editorial slibem v `o-projektu.html`.
3. Detail-page indikátorů je 95 % případů bez narativní vrstvy, protože method cards neobsahují pole, která `indicator.js` hledá.

Po opravě těchto P1 položek se web stane plně funkčním statistickým portálem v souladu s tím, co tvrdí.
