# Plán: NZIP/ÚZIS data — živé indikátory + doplnění datasetů ke článkům

> **Účel:** samostatný vstupní bod pro dávkovou práci. Cílem je (A) přepnout co
> nejvíc indikátorů na **živá data** z NZIP „Datového zpravodajství" / data.mzcr.cz
> a (B) u zbytku aspoň **připojit odkaz na konkrétní datovou sadu** k indikátoru
> i článku. Nad vším stojí **ověřovací protokol**, který má zabránit opakování
> chyby „plné vs. výlučné kojení" (§4).
>
> **Vytvořeno:** 2026-07-22. Navazuje na `PLAN-VERIFIKACE-INDIKATORU.md`
> (rámec seed→verified) — tento plán je jeho **NZIP/ÚZIS větev** + lehká vlna
> „přilep dataset".

## 0a. Feasibility v prostředí (zjištěno 2026-07-23) — ČTI PŘED VLNOU A

Prověřeno přímo v běžícím prostředí, co pro Vlnu A funguje:

- ✅ **curl / node-http přes agent proxy funguje** (HTTP 200 na nzip.cz, data.mzcr.cz, opendata.sukl.cz, uzis.cz, szu.gov.cz).
- ✅ **SÚKL open data = přímé CSV, curl-fetchovatelné** — nejsnazší live cesta. Vzor:
  `https://opendata.sukl.cz/?q=katalog/dis-13` listuje měsíční soubory
  `https://opendata.sukl.cz/soubory/DIS13/DIS13_YYYYMMv01.csv` + datové rozhraní PDF.
  Vhodné pro `spotreba_opioidu`, `pouzivani_antidepresiv` (ATC N02A / N06A) —
  **pozor: přepočet na DDD/1000/den vyžaduje join DDD tabulky (WHO ATC/DDD nebo DLP)
  a pečlivý §4** (to je hlavní práce, ne stažení).
- ✅ **Existující fetchery** `eurostat.js`, `oecd_sdmx2.js`, `ecdc_atlas.js` volají
  SDMX/JSON-stat API přes curl — funkční alternativa (viz `PLAN-VERIFIKACE-INDIKATORU.md`).
- ⚠️ **NZIP „datové zpravodajství" katalog je plně JS (Symfony SPA)** — `nzip_id`
  datových sad **nejde dohledat curl scrapingem**, a **Playwright/Chromium je v této
  web session blokován proxy** (`ERR_CONNECTION_RESET`). ⇒ Pro nové NZIP sady je
  potřeba buď (a) znát `nzip_id` předem (z článku / od uživatele), nebo (b) session
  s browser-přístupem. Známé ID: kojení NR-10-12 = `nzip_id 1934`.
- ⚠️ **NRHZS mikrodata** (`obloznost_*`, `osetrovaci_dny_*`, `podil_*`…) = stream
  100–300 MB, `microdata_ratio`. Těžké; pouštět jen s vědomým souhlasem.
- ⛔ **DIS-13 NENÍ platný zdroj pro AKUTNÍ léčiva (antibiotika J01)** — §4 to zachytil:
  výpočet z DIS-13 dal ČR **18,3** DDD/1000/den J01, ale nezávislá reference **ECDC
  ESAC-Net ≈ 15–16** (komunitní spotřeba) → nadhodnocení ~15 %. DIS-13 měří **dodávky
  distributorů do lékáren** (velkoobchodní tok), ne skutečný výdej; u sezónních/akutních
  léčiv se dodávky a spotřeba v čase rozcházejí (předzásobení). Pro **chronická** léčiva
  (opioidy, antidepresiva) roční tok ≈ spotřeba, proto tam DIS-13 sedí do ~2 %. ⇒
  `spotreba_antibiotik` **NENAPOJOVAT z DIS-13**; jediný obhajitelný live zdroj je **ECDC
  ESAC-Net** (`ingest/fetchers/ecdc_atlas.js`). Toto pravidlo platí pro každé akutní ATC.

**Doporučené pořadí Vlny A odsud:** (1) SÚKL DIS-13 pharma přes existující vzor,
(2) Eurostat/OECD přes hotové fetchery, (3) NZIP sady jakmile jsou známa `nzip_id`,
(4) NRHZS mikrodata naposled.

---

## 0. TL;DR

- **Stav:** 178 indikátorů — **66 live / 112 seed**; **34 bez `source.url`**;
  48 bez benchmarku.
- **Engine už existuje:** `ingest/fetchers/nzip_opendata.js` (3 režimy:
  `microdata_ratio`, `aggregate_ratio`, `aggregate_sum`), mapping
  `ingest/mapping/nzip_opendata_codes.json`, discovery CSV distribuce scrapingem
  detailní stránky NZIP. **Rozšiřujeme ji, nestavíme od nuly.** Katalog:
  `nzip.cz/modul/datove-zpravodajstvi/katalog-dat` (570 sad).
- **Dvě vlny, běží paralelně, každá dávka = 1 PR:**
  - **Vlna A — Live upgrade:** seed → `origin: live` → `verification_status: verified`.
  - **Vlna B — Dataset-link attach:** doplnit `source.url` (34 indikátorů) a
    sekci „Kde si data ověříte" ke článkům, které se datasetu týkají.
- **Zlaté pravidlo (kojení lesson):** žádný indikátor nepřepínáme na „Ověřeno"
  bez projití **ověřovacího protokolu §4** — zejména kontroly *definice, jednotky,
  populace, homogenity řady a souměřitelnosti benchmarku*.

---

## 1. Cíl a měřitelný výstup

| Metrika | Výchozí (2026-07-22) | Cíl vlny |
|---|---|---|
| Indikátory `origin: live` | 66 / 178 | co nejvíc; prioritně 34 bez URL a NRHZS-dostupné |
| Indikátory `verification_status: verified` | (viz tracker §10) | +N za dávku |
| Indikátory bez `source.url` | 34 | **0** (Vlna B je uzavře i bez live) |
| Články s odkazem na primární datovou sadu | částečně | 100 % článků navázaných na živý indikátor |

**Definice „hotovo" pro indikátor:**
1. **Ověřeno (živé):** `origin: live` z funkčního fetcheru **+**
   `verification_status: "verified"` + `verified_at` v kartě `indicators/{id}.json`
   **+** protokol §4 zaškrtnutý (stopa v `method_notes`).
2. **Link-only (přechodně):** seed zůstává, ale `source.url` ukazuje na konkrétní
   NZIP/data.mzcr.cz distribuci a v kartě je `source_dataset` + poznámka
   „čeká na live". Badge zůstává „Ilustrativní" — férově.

---

## 2. Infrastruktura, na které stavíme (nečti kód, jen respektuj kontrakt)

- **Fetcher:** `ingest/fetchers/nzip_opendata.js`
  - Režimy: `microdata_ratio` (mikrodata, 1 řádek = 1 osoba, streamované 100–300 MB),
    `aggregate_ratio` (čitatel/jmenovatel ve sloupcích), `aggregate_sum`.
  - Vstup: `ingest/mapping/nzip_opendata_codes.json` (id indikátoru → NZIP detail
    URL + sloupce/filtry + režim). **Nová sada = nový záznam v mappingu**, ne nový
    fetcher, pokud režim sedí.
  - Výstup: `{ trend:[{year,value}], cz:{value,year}, source }` — velké CSV se
    do cache neukládá.
- **Odznak verifikace:** `resolveVerificationStatus()` v `src/page-shared.js`
  (NEMĚNIT). `verified` se odvodí **jen** z explicitního `verification_status:
  "verified"` v kartě. `origin: live` sám dá jen „Předběžné".
- **Metodická karta** `indicators/{id}.json` — pole relevantní pro protokol:
  `definition`, `unit`, `direction`, `data_source`, `benchmark_source`,
  `method_notes`, `limitations`, `verification_status`, `verified_at`.
- **Registr tvrzení** `data/claims.json` — po změně čísla/formulace v článku
  navázaném na indikátor je nutné srovnat (viz §8).
- **Generovaný index** `data/diagnoza-index.json` — po změně **titulku článku**
  se musí přegenerovat (`npm run build:diagnoza`).

---

## 3. Vlna A — Live upgrade (dávkově podle zdrojového registru)

**Postup pro jeden indikátor:**
1. Najdi v katalogu NZIP konkrétní datovou sadu; otevři detailní stránku
   `/data/{id}-{slug}` a **stáhni metodický popis (PDF/`csv-metadata.json`)**.
2. **Projdi ověřovací protokol §4** (definice/jednotka/populace/homogenita/benchmark).
3. Přidej záznam do `ingest/mapping/nzip_opendata_codes.json` (URL, sloupce,
   filtr, režim, očekávaná jednotka a poslední rok).
4. Spusť **jen tento fetcher** cíleně (ne celý `npm run transform` — viz §9 past),
   ověř `trend`/`cz` proti hodnotě z metodiky/ročenky.
5. Zapiš do karty: `definition` (přesně dle metodiky zdroje), `unit`,
   `data_source` (název + URL distribuce), `benchmark_source` (souměřitelný!),
   `method_notes` (co přesně měří + zaškrtnutý protokol), `limitations`
   (definiční zlomy, vykazovací praxe), `verification_status: "verified"`,
   `verified_at`.
6. Aktualizuj `data/indicators.json` záznam (hodnota, trend, `source.origin: live`).
7. **Post-kroky §8** (claims, diagnoza-index, validate, test).

**Prioritní dávky (každá = 1 PR):**

| Dávka | Registr / téma NZIP | Kandidátní indikátory | Režim |
|---|---|---|---|
| **A1 · Léčiva ATB/ATC** | NRHZS — léčivé přípravky dle ATC | `spotreba_antibiotik`, `rezistence_antibiotik` (enrich), nový `benzodiazepiny_seniori`, `antidepresiva_prevalence` | aggregate_sum / ratio |
| **A2 · Reprodukce/novorozenci** | NRRZ / NRML | `nizka_porodna_hmotnost_pct` (bez URL!), `kojeni_pri_propusteni` (revidovat def.+benchmark — viz §4), nová `asistovana_reprodukce`, `potraty` | aggregate_ratio |
| **A3 · Kapacity/procesy** | NRHZS | `nevyuzite_osetrovaci_dny_ip`, `obloznost_intenzivni_pece_pct`, `hospicova_pece_luzka` | aggregate_ratio/sum |
| **A4 · Veřejné zdraví/registry** | SZÚ / NRL | `hiv_nove_diagnozy`, `kontrola_hypertenze`, `deti_obezita_cosi` | aggregate_sum |
| **A5 · Nové aktuální oblasti** | NRHZS léčiva | `opioidy_spotreba` (nový), `glp1_antidiabetika` (nový), `statiny_prevalence` (nový → k `cholesterol`) | aggregate_sum |
| **A6 · Duševní zdraví** | NRHZS / psychiatrie | výdaje/hospitalizace, `psychofarmaka` | ratio/sum |

> Přesné názvy sad a distribuční URL **dohledej v katalogu při dávce** — přes
> automatický fetch se vytáhne jen část z 570; discovery řeší `discoverCsvUrl()`.

---

## 4. ⚠️ Ověřovací protokol dat (kojení-proof) — POVINNÝ PŘED „Ověřeno"

> Vznikl z chyby, kdy jsme „plné kojení" (~75 %) prezentovali jako „výlučné"
> a definiční zlom v řadě jako behaviorální „obrat". Každý bod musí projít;
> stopa se zapíše do `method_notes`.

**Zdroj a definice**
1. **Přečti metodiku zdroje**, ne jen tabulku. Co přesně kategorie měří?
   (Distribuce má `*.csv-metadata.json`; NZIP sada má „Metodický popis" PDF.)
2. **Název ≡ obsah.** Ověř, že název indikátoru odpovídá tomu, co dataset
   opravdu vykazuje. *(Kojení: název „výlučné" ≠ kategorie „plně kojeno".)*
   Křížově srovnej s názvem karty i s prózou navázaného článku.
3. **Jednotka a měřítko** (%, na 100 tis., absolutně, na lékaře…) — sedí
   `unit` v kartě přesně?
4. **Populace / jmenovatel** — kdo je v čitateli a jmenovateli? (všichni vs.
   donošení; hrazení vs. všichni; sídlo poskytovatele vs. bydliště).

**Řada a čas**
5. **Homogenita řady.** Změnila se v čase definice/vykazování? Vyznač
   nesrovnatelné roky, řadu přes zlom **neprezentuj jako trend**.
   *(Kojení: zlom kolem 2019–2021.)*
6. **Poslední uzavřený ročník.** Neúplné/předběžné roky označ, neber jako headline.

**Benchmark**
7. **Souměřitelnost benchmarku.** Měří OECD/EU benchmark **stejnou** veličinu,
   definici a populaci jako česká hodnota? Pokud ne → benchmark neuváděj nebo
   `direction: context_dependent` (žádný falešný signál).
   *(Kojení: český „plné" vs. mezinárodní „výlučné" = nesouměřitelné.)*

**Zdravý rozum a stopa**
8. **Plauzibilita.** Je hodnota v rozumném pásmu vůči OECD/EU a historii?
   Výrazný odskok = podezření na jednotku/definici, ne objev.
9. **Reprodukovatelnost.** Ulož přesnou distribuční URL + rok + jak se počítá
   (sloupce/filtr) do `data_source` a mappingu — ať to kdokoli zopakuje.
10. **Sign-off.** `verification_status: "verified"` + `verified_at` + shrnutí
    bodů 1–9 do `method_notes`; známé limity do `limitations`.

**Když kterýkoli bod neprojde:** indikátor zůstává seed/„Ilustrativní" a jde
do Vlny B (jen odkaz na dataset) s poznámkou, co je potřeba doověřit.

---

## 5. Vlna B — Dataset-link attach (lehká, uzavře „bez URL")

Pro indikátory, které teď nejde plně automatizovat (nebo neprojdou §4), přesto
přineseme hodnotu: **odkaz na konkrétní datovou sadu**.

**Indikátor (34 bez `source.url`):**
- Doplň `source.url` = stabilní distribuce `data.mzcr.cz/data/distribuce/...`
  nebo detailní NZIP stránka sady.
- Do karty přidej `source_dataset` (název + URL + rok) a poznámku
  „live TODO: dávka A#".
- Badge zůstává „Ilustrativní" (nelžeme o ověření).

**Článek:**
- Do `<section class="article-sources">` doplň položku „ÚZIS/NZIP — {sada}
  (datový souhrn / otevřená data)" s odkazem u článků navázaných na daný
  indikátor (viz `linked_indicators`).
- Volitelně zaveď v `articles.json` nepovinné pole `data_sources: [{name,url}]`
  pro strojovou evidenci (nový, aditivní — neruší validaci; doplň i do
  `docs/data-model.md`).

---

## 6. Kandidátní backlog (NZIP téma → cíl) — prioritizace

| Prio | NZIP téma / sada | Cíl u nás | Live? | Vlna |
|---|---|---|---|---|
| P1 | ECDC ESAC-Net — ATB (J01) | `spotreba_antibiotik` enrich (⛔ NE z DIS-13, viz §0a) | ano | A1 |
| P1 | NRML — novorozenci/rodičky | `nizka_porodna_hmotnost_pct` (bez URL) | ano | A2 |
| P1 | NRHZS — hospicová/paliativní lůžka | `hospicova_pece_luzka` (bez URL) | ano | A3 |
| P1 | SZÚ/NRL — HIV | `hiv_nove_diagnozy` (bez URL) | část | A4/B |
| P2 | NRHZS léčiva — benzodiazepiny (N05) | nový indikátor + článek *benzodiazepiny-seniori* | ano | A1 |
| P2 | NRHZS léčiva — opioidy (N02A) | nový indikátor (nová oblast) | ano | A5 |
| P2 | Asistovaná reprodukce | nový indikátor + do *nizka-porodna-hmotnost* | ano | A2 |
| P2 | Potraty | oživit *umela-preruseni-tehotenstvi* | ano | A2 |
| P2 | Sebevraždy | oživit *sebevrazdy-mladistvi* | ano | A4 |
| P3 | NRHZS — obložnost/nevyužité dny IP | `obloznost_intenzivni_pece_pct`, `nevyuzite_osetrovaci_dny_ip` | ano | A3 |
| P3 | NRHZS léčiva — GLP-1 / statiny | nové indikátory (obezita, cholesterol) | ano | A5 |
| P3 | Nežádoucí události | dimenze Bezpečnost (nový) | ověřit | A6 |
| P3 | Zdrav. pracovníci / odměňování / DRG | Financování/personál | ověřit | pozdější |

*(Zbylých ~24 seed-bez-URL indikátorů → Vlna B batch „přilep dataset", i bez live.)*

---

## 7. Mechanika jedné dávky (checklist do PR)

1. Vyber 3–8 indikátorů jednoho zdroje/registru.
2. Pro každý: katalog → metodika → **protokol §4** → mapping → cílený fetch → karta.
3. **Necommituj výstup celého `npm run transform`** (§9) — uprav jen dotčené
   `data/indicators.json` záznamy + karty.
4. Post-kroky §8.
5. PR: co dávka mění, důkaz ověření (§4 stopa), před/po tracker (§10).

## 8. Povinné post-kroky (každá dávka)

```bash
npm run validate:all          # indikátory, strategie, explainery, prevence
npm run build:diagnoza        # POKUD se změnil titulek článku (jinak padne test)
npm test                      # node --test tests/*.test.js — musí projít (904+)
# claims: pokud se změnila čísla/formulace v článku navázaném na indikátor,
#   srovnej data/claims.json (quote/metric/value) — jinak drift-check.
npm run verify:freshness      # kontrola stáří
```

## 9. Pasti (respektovat)

- **Kojení lesson** = protokol §4. Nikdy nepřepínej na „Ověřeno" bez něj.
- **Nikdy necommituj celý transform output** v sandboxu bez sítě — degraduje
  indikátory bez cache. Uprav dotčené záznamy cíleně (viz `PLAN-VERIFIKACE §6`).
- **Velká CSV** (mikrodata 100–300 MB) — jen streamovaně, výsledek do cache, ne soubor.
- **Titulek článku ⇒ `npm run build:diagnoza`** (jinak padá `diagnoza-index` test).
- **Benchmark** nikdy nesouměřitelný → radši žádný než falešný signál.
- **Souhrny ≠ mikrodata:** agregát může mít jiný jmenovatel než mikrodata — ověř §4/4.

## 10. Tracker (aktualizuj po každé dávce)

```
2026-07-22 (výchozí):  live 66 / seed 112 · bez source.url 34 · verified (viz PLAN-VERIFIKACE)
po Dávce B1 (link):    bez source.url 34 → 26  (+8: COSI, HIV, NZR, WUENIC, OHCA, KST, Zemřelí, hospice)
po Dávce B2 (link):    26 → 20  (+6: CZECHSEX ×5, ÚZIS Psychiatrická péče)
po Dávce B3 (link):    20 → 17  (+3: SHARE, SÚKL open-data ×2)
Codex fix (SÚKL):      SÚKL homepage → konkrétní sada DIS-13 (opioidy, antidepresiva)
po Dávce B4 (link):    17 → 16  (+1: kontrola_hypertenze → SZÚ EHES)
── VLNA A zahájena ──
Dávka A1 (SÚKL DIS-13): spotreba_opioidu → ŽIVĚ + OVĚŘENO (14,7 DDD/1000/den 2024,
   řada 2021–24 z DIS-13, křížově proti nezávislé referenci 2018=13,05 ↑) ✅ první „Ověřeno".
Dávka A2 (SÚKL DIS-13 + korpusová korekce): pouzivani_antidepresiv → ŽIVĚ + OVĚŘENO
   (78,9 DDD/1000/den 2024; opraveno 84→77 napříč 4 články + 8 claimů; OECD 75,3 ✓) ✅.
Codex follow-up A2: benchmark oecd 67→69,5 (ověřený průměr), narativ „zhruba na úrovni"
   → „mírně nad průměrem OECD (o cca desetinu)" napříč kartou/články/claims/perex/manifest;
   dořešeny zbylé 67-reference (protidrogova, manifest, reforma-psychiatrie) + perex articles.json;
   regen seo:indicators + manifest-substránky + souvislosti. ✅ konzistentní 78,9 vs 69,5.
Dávka A3 (Eurostat tps00202): sebevrazdy_mladistvi_15_19 → ŽIVĚ + OVĚŘENO
   (6,96/100k 2023, EU27 4,17; karta přepnuta csu_datastat→eurostat_jsonstat primary,
   mapping tps00202 přidán, buildIndicator ověřen origin=live; hodnota == seed, 0 korpusová
   korekce — 3 claimy konzistentní). Antibiotika (A?) ODLOŽENA: ECDC AMC Atlas API
   nevrací measure_id přes GetDatasets, Eurostat AMC neexistuje → potřeba jiný zdroj/session.
Dávka A4 (Eurostat hlth_silc_09): nesplnena_potreba_zubni_pece → ŽIVĚ + OVĚŘENO
   (1,0 % 2025, EU27 3,3 %). ROOT CAUSE HTTP 400: dental dataset používá příjmovou
   dimenzi `quant_inc`, NE `quantile` (medical hlth_silc_08 má `quantile`) — oprava
   mappingu + karty + testu; buildIndicator ověřen origin=live. 6 claimů (2024 TOTAL
   1,3 %, EU 3,3 %, gradient QU1 2,5 % / QU5 0,5 % = 5×) ověřeno proti API, konzistentní,
   0 korpusová korekce.
Dávka A5 (Eurostat hlth_ehis_fv3e): konzumace_ovoce_zeleniny → ŽIVĚ + OVĚŘENO
   (7,7 % 2019, EU27 12,4 %; EHIS poslední vlna 2019). Mapping přidán, buildIndicator
   origin=live. 11 claimů ověřeno PROTI ŽIVÉMU API včetně všech mezinárodních srovnání
   (DE 10,9 / IE 32,9 / NL 29,5 / AT 5,6 / PL 8,6 / RO 2,4 / SK 8,5 GE5 2019) — vše sedí,
   0 korpusová korekce.
Dávka A6 (Eurostat demo_mexrt + ROZŠÍŘENÍ FETCHERU): nadumrtnost → ŽIVĚ + OVĚŘENO
   (2,7 % 2025, EU27 3,6 %). Přidán agregační režim `aggregate: annual_mean` do
   eurostat.js (měsíční p-skóre → roční průměr, jen kompletní roky ≥12 měsíců) +
   2 testy. Reprodukuje řadu karty přesně (2020=18,2 … 2024=2,6 / 2025=2,7). Živě
   reportuje poslední kompletní rok (2026 s 3 měsíci vynechán). 0 claimů; flagship
   článek year-labeled 2024=2,6 → ponechán (jako A4/A5, dashboard je čerstvější).
A7 (luzka_dlouhodobe_pece_65plus) — HODNOTA KŘÍŽOVĚ OVĚŘENA ze 2 zdrojů; živý wire
   připraven (OECD), zbývá jen redakční sladění článku. Postup 2026-07-23:
   (1) Eurostat rekonstrukce jmenovatele: demo_pjan NEMÁ agregát Y_GE65 (jen jednoleté
   věky), ale součet Y65..Y_OPEN dá CZ 2020 = 2 131 630 → beds 75 174 / × 1000 = **35,27
   ≈ seed 35,3** ✓. (2) LEPŠÍ CESTA: **OECD DF_HEALTH_LTCR_BED poskytuje metriku PŘÍMO**
   — UNIT_MEASURE `10P3HB_Y_GE65` (lůžka na 1000 ob. 65+), MEASURE=LTCB, MODE_PROVISION=INST.
   Přes stávající oecd_sdmx2 fetcher: **CZ 2024 = 35,1** (2020 = 35,3 == seed!), OECD ⌀ 39,
   řada 2019–24 (fetch ověřen). ⇒ seed 35,3 potvrzen NEZÁVISLE dvěma zdroji.
   VÝSLEDEK A7: indikátor označen **verified** (hodnota křížově ověřena) + přidán do
   `KNOWN_SEED_VERIFIED_EXCEPTIONS` (origin zůstává seed — Eurostat hlth_rs_bdsns končí
   2020, žádný živý feed). OECD mapping po ověření ODSTRANĚN (orphaned by tahal zbytečný
   fetch). Živé napojení přes OECD je MOŽNÉ, ale NENÍ mechanické: mění benchmark 46 (6-zemní
   Eurostat průměr) → OECD ⌀ 39, což **rozporuje centrální tezi flagship článku**
   `clanek-luzka-dlouhodobe-pece` („Česko má o čtvrtinu méně lůžek než srovnatelné země",
   35,3 vs 46 = −23 %; přes OECD by bylo 35,1 vs 39 = −10 %). Přepnutí = obsahová revize
   teze článku NEBO míchání zdrojů (value OECD + benchmark Eurostat, §4 red flag). ⇒ cílené
   redakční PR, ne datový wire. Spec OECD pro budoucí aktivaci: DF_HEALTH_LTCR_BED, MEASURE=LTCB,
   UNIT_MEASURE=10P3HB_Y_GE65, MODE_PROVISION=INST, ostatní _Z, v1.0.
Dávka A8 (OECD SDMX, reakce na Codex #866): absolventi_lekarstvi_per_100k → ŽIVĚ
   (16,3/100k 2024, OECD ⌀ 15,4). ROOT CAUSE: mapping měl verzi dataflow 1.0, ale
   DSD_HEALTH_REAC_EMP@DF_GRAD je na v1.1 (jako absolventi_osetrovatelstvi) → 404.
   Oprava = bump verze. Zároveň OPRAVENY 3 chybné závěry z #866 (A7 benchmark
   reprodukovatelný, OECD větev 9/11 živá ne rozbitá, počty 73/76 ne 74/78).
Dávka A9 (OECD SDMX, nemapovaný indikátor): alkohol_spotreba → ŽIVĚ + OVĚŘENO
   (10,6 l/os. 2024, OECD ⌀ 8,4). Nový mapping DSD_HEALTH_LVNG@DF_HEALTH_LVNG_AC
   (MEASURE=AC, AGE=Y_GE15, L_PS), karta přepnuta z legacy typu `oecd` na `oecd_sdmx2`.
   2023=11,2 == dřívější seed (přesná shoda) → hodnota ověřena; 11 claimů year-labeled
   2023 (11,2) zůstává platných (quote-based, články neměněny), teze „ČR výrazně nad OECD"
   drží (10,6 vs 8,4). Živě reportuje 2024. → 74 live / 78 verified.
Dávka A10 (Eurostat NACE Q + oprava mého §4 omylu): gender_pay_gap_zdravotnictvi → ŽIVĚ
   (24,9 % 2024, benchmark 17,4). Dřívější „comparability blocker" byl OMYL: benchmark 17,4
   NENÍ celoekonomický, ale medián zemí EU/EEA v TÉMŽE sektoru NACE Q (spočteno: medián
   EU-27 NACE Q GPG = 18,0 2024; EU/EEA vč. NO/IS ~17,4). Napojeno z earn_gr_gpgr2
   (nace_r2=Q), bez eu_code (Eurostat nemá EU agregát pro NACE Q → benchmark = doložený
   medián). Hodnota 24,9 == seed. 5 claimů konzistentní. → 75 live / 79 verified.
Dávka A11 (OECD DF_PHYS_CAT): podil_prakticti_lekari → ŽIVĚ (17,2 % 2024, OECD ⌀ 22,5).
   HEALTH_PROF=EMPLGENP (praktičtí/general practitioners) jako % aktivních lékařů
   (UNIT PT_WR_PRF_HLTH), v1.1. CZ 2023=16,86 ≈ seed 16,9 (přesná shoda) → hodnota ověřena.
   0 claimů. Karta uzis_nrzp → oecd_sdmx2. → 76 live / 80 verified.
```

*(Dřívější nález „`nesplnena_potreba_zubni_pece` vrací HTTP 400" vyřešen v A4 výše —
příčinou nebyl reason kód, ale špatné jméno příjmové dimenze.)*

### Stav zbývajících tříd (ověřeno 2026-07-23, §4 „konečné ověření")

Každý zbývající seed indikátor má doložený terminální stav — ne „nedošlo na něj",
ale konkrétní technický blokátor:

- **OECD SDMX — VĚTŠINOU FUNGUJE (oprava dřívějšího chybného verdiktu; Codex #866).**
  Z 11 mapovaných je **9 živých**; můj dřívější závěr „celá větev rozbitá" plynul
  z jediného 404 na `DF_GRAD,1.0` — ve skutečnosti šlo o zastaralou **verzi** v mappingu,
  ne mrtvý dataflow. Opraveno v A8: `absolventi_lekarstvi_per_100k` v1.0 → **v1.1**
  (stejný dataflow, jaký už `absolventi_osetrovatelstvi` používá živě) → živě 16,3 (2024).
  **`vydaje_prevence_pct`** (DSD_SHA@DF_SHA) — TECHNICKY VYŘEŠENO, ale ZÁMĚRNĚ
  NEAKTIVOVÁNO (§4). Root cause: SHA dataflow získal dimenzi FINANCING_SCHEME_REV
  (12 dims místo 11) + verze 1.0→1.1. Správný klíč: `.A..PT_EXP_HLTH._T..HC6.._T..._Z`,
  version 1.1 → fetch vrací CZ 2024=3,069, OECD ⌀ 3,1 (2023=2,736 == seed). NEAKTIVUJI:
  živá hodnota 2024=3,069 (≈3,1) by rozbila **5 auto-claimů „2,7 %"** napříč 5 články
  + tezi o podinvestování prevence. §4 nález: řada je COVID-volatilní (2019=3,185 /
  2020=3,923 / 2021=8,412 / 2022=5,206 / 2023=**2,736 dip** / 2024=3,069) — ČR je
  strukturálně ~3,1, u průměru OECD, NE jasně pod. Seed 2,736 (2023) je jednoletý dolík,
  na kterém stojí narativ 5 článků. Aktivace = redakční revize teze (je ČR pod OECD, nebo
  na úrovni?), ne mechanický wire. Oprava klíče uložena v `_blocked` poli mappingu, mapping
  ZÁMĚRNĚ ponechán v původním (neaktivním) stavu, ať cron nerozbije korpus.
  **Zbylé OECD-source seed indikátory — batch triage 2026-07-23 (per-kus stav):**
  - `alkohol_spotreba` → ✅ NAPOJENO živě (A9). `gender_pay_gap` → ✅ (A10).
  - `podil_generik_objem` → NECHAT seed: OECD DF_GEN_MRKT končí 2022 (62,6 vol) < seed 2023 (62,8);
    62,6 korroboruje seed, napojení by byl krok zpět v roce.
  - `farmaceuti_per_100k` → NECHAT seed: DF_PHST nabízí jen jednotky PS (osoby) nebo 10P3HB
    (na 1000 = 0,77), ŽÁDNOU „na 100k" (seed 76/100k) → nutná konverze ×100, kterou fetcher
    neumí; navíc OECD končí 2022 (77/100k) < seed 2023 (76). Ověřeno, není mechanický wire.
  - `podil_prakticti_lekari` → ✅ NAPOJENO živě (A11): DF_PHYS_CAT v1.1, HEALTH_PROF=EMPLGENP,
    UNIT=PT_WR_PRF_HLTH (% aktivních lékařů). CZ 2024=17,2 (2023=16,86 == seed 16,9), OECD ⌀ 22,5.
    0 claimů. Karta uzis_nrzp → oecd_sdmx2.
  - `spokojenost_pece` → OBSTACLE (ověřeno): OECD patient-experience dataflowy (DF_PE, PaRIS)
    vracejí 404 přes v1.0/1.1/2.0 (verze/klíč) a hlavně — „spokojenost 75%" nemapuje na jediný
    jasný measure (patient experience = mnoho survey otázek), CZ pokrytí v OECD bývá řídké.
    Potřebuje identifikaci konkrétního measure + ověření CZ coverage, ne mechanický wire.
  - `nahrada_kolenniho_kloubu_100k` → DF_SURG_PROC má **18 dimenzí** + je třeba dohledat kód
    MEDICAL_PROCEDURE pro náhradu kolena + UNIT rate/100k; složitější klíč, samostatná dávka.
  - `prezit_karcinom_plic_5let` → JIŽ verified + v exceptions; KŘÍŽOVĚ POTVRZENO 2026-07-23
    proti OECD DF_CC MEASURE=CCLUNTSR = 2014=10,6 (přesná shoda se seedem). OECD má JEN 2014
    (CONCORD-3, zamrzlé) → origin zůstává seed, hodnota doložena. 7 claimů = CONCORD-3
    mezinárodní srovnání, konzistentní. Hotovo, beze změny.
  - `podil_lekaru_55plus` → OBSTACLE (ověřeno): DF_PHYS_AGE_SEX má věkové pásmo Y55T64
    (2024=18,1 %), ale seed je „55+" = nutno sečíst 55–64 + 65+; navíc seed je ÚZIS/NRZP
    (definice se může lišit od OECD) a 10 claimů = vysoký blast-radius. Age-sum + definiční
    §4 + korpusová kontrola, ne mechanický wire.
  - `vydaje_dlouhodoba_pece_hdp` → DF_SHA (stejný jako vydaje_prevence) → riziko stejného
    §4 landmine (volatilita/teze); prověřit blast-radius (5 claimů) před aktivací.
  - `incidence_prsu` → NENÍ OECD SDMX (zdroj EU Country Cancer Profile / ECIS-IARC), jiná cesta.
  Metoda napojení ověřena (A8/A9/A10); zbytek = per-kus dávky, každá s §4 + blast-radius,
  několik s doloženým rizikem landmine (SHA) nebo vysokým claim-radiusem.
- **~45 ÚZIS — BLOKOVÁNO PROSTŘEDÍM.** NRHZS microdata (těžký stream, uživatel
  odmítl) nebo NZIP `nzip_id` (jen browser session; Playwright blokován, viz §0a).
- **Antibiotika — ECDC AMC API NEPOSKYTUJE `measure_id`** (GetDatasets nevrací AMC
  sady; Eurostat AMC dataset neexistuje). DIS-13 zakázán guardrailem (akutní léčiva).
- **`gender_pay_gap_zdravotnictvi` — VYŘEŠENO v A10 (můj dřívější „comparability" byl OMYL).**
  Benchmark 17,4 NENÍ celoekonomický, ale **medián zemí EU/EEA v TÉMŽE sektoru NACE Q**
  (spočtený medián EU-27 NACE Q GPG = 18,0 (2024); EU/EEA vč. NO/IS ~17,4). Srovnání je
  souměřitelné → napojeno živě z Eurostat earn_gr_gpgr2.

**Bilance session (A1–A10 hotovo):** kontrakt 179 ind., **75 live / 79 verified**
(oprava dřívějšího chybného „74/78" — Codex #866). Zbývá: A7/vydaje flip (editorial,
fix připraven), ~10 nemapovaných OECD (per kus, metoda ověřena A9), ~45 ÚZIS
(blokované prostředím), antibiotika (ECDC AMC API).

**Nález k dořešení (samostatná korekce, jako kojení) — TURNKEY SPEC:**
`pouzivani_antidepresiv` má seed **84** DDD/1000/den (2023), ale:
- výpočet z **SÚKL DIS-13** (LEKARNA, N06A, D−V) dává řadu 2021–24: **71,3 / 74,4 / 76,7 / 78,9**;
- **OECD**: ČR 2023 = **75,3** DDD/1000/den; OECD **průměr** 52,4 (2010) → **69,5 (2020)**, rostoucí;
  ČR byla historicky **pod** průměrem, rychle dohání → 2023 je **zhruba na úrovni** průměru OECD,
  **NE „výrazně nad"**.
- ⇒ seed 84 je nadhodnocený ~11 % a narativ „84 vs OECD 67, o čtvrtinu více, výrazně nad" je **věcně chybný**.

**Rozsah korekce (napříč korpusem — 8 claimů, 4 články):**
`clanek-protidrogova-dusevni-politika-mz-2026` (av-counter data-value="84", próza, related-link),
`clanek-manifest-reforma-zdravotnictvi` (counter, data-card, próza, link),
`clanek-reforma-psychiatrie-13-let` (próza, related-link),
`clanek-sebevrazdy-dusevni-zdravi` (counter, próza, link). **Pozor:** v sebevrazdy je „84" i
v kódu MKN-10 **X60–X84** — ten NEMĚNIT; měnit jen antidepresivní řetězce („84 DDD", `data-value="84"`).
Fix: 84 → **77** (ČR 2023); „o čtvrtinu více" → „mírně nad / zhruba na úrovni průměru OECD";
+ indikátor value 78,9 (2024) origin:live verified; + 8 claimů (value 84→77, quote). Pak
`build:diagnoza` (titulky beze změny), `validate:all`, `npm test`.

**Zjištění o zbytku Vlny A (scan 2026-07-23):** ze všech pharma-consumption seed indikátorů má
**jen `lpod_share_critical` 0 claimů** (a ten je metodicky nejasný). Všechny ostatní
(antibiotika 6, benzodiazepiny 7, antidepresiva 8, vakcíny 4–7 claimů) mají **korpusový dopad** —
tj. každý = koordinovaná korekce jako výše. `spotreba_opioidu` (0 claimů) byl jediný „čistý"
rychlý wins. **Zbytek Vlny A je proto maraton pečlivých korekcí, ne dávka rychlých napojení** —
plánovat jako samostatné cílené PR, každý přes §4.

**Zbývá 16 bez URL — patří do Vlny A (live), NELZE bezpečně zavřít pouhým odkazem:**
většina jsou **NRHZS kapacitní metriky dopočítávané z mikrodat** (`obloznost_*`,
`osetrovaci_dny_*`, `podil_senioru_*`, `podfinancovani_*`, `nevyuzite_osetrovaci_dny_ip`,
`uhrada_zp_per_pojistenec`) — nemají samostatnou „klikací" sadu, jejich hodnota se
počítá ze stažených mikrodat (těžký fetch). Dále ambivalentní zdroj (`podil_vydaje_*`,
`vydaje_leky_hdp`, `lpod_share_critical`, `cekaci_doba_kycel`, `ehealth_adoption`,
NRC šetření `bezpecnost_padu_nemocnice`/`spokojenost_informovani`). → **Vlna A**
vyžaduje rozhodnutí, zda pouštět datové fetche (agregátní / mikrodata).

**Odloženo z Vlny B (protokol §4 — deklarovaný zdroj neseděl s ověřitelnou sadou;
řeší se ve Vlně A / vyžaduje potvrzení zdroje):** `cekaci_doba_kycel` (VZP?),
`kontrola_hypertenze` (SZÚ EHES), `ehealth_adoption` (MZ eHealth), `vydaje_leky_hdp`,
`bezpecnost_padu_nemocnice` (NRC), `spokojenost_informovani` (NRC), a NRHZS kapacitní
metriky (`obloznost_*`, `osetrovaci_dny_*`, `podil_*`, `podfinancovani_*`,
`nevyuzite_osetrovaci_dny_ip`, `uhrada_zp_per_pojistenec`, `podil_vydaje_*`,
`lpod_share_critical`) — kandidáti na živé napojení přes `nzip_opendata.js` (dávka A3).

---

## Jak to „sjedeme"
1. Otevři tento soubor, vyber **jednu dávku** z §6.
2. Odjeď §7 (protokol §4 u každého indikátoru).
3. 1 dávka = 1 PR se zelenou CI. Po merge aktualizuj tracker §10.
4. Vlnu B (link-only) můžeme prohnat rychleji ve větších dávkách — je nízkoriziková.
