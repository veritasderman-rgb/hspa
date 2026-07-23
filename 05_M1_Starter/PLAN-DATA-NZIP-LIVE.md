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
| P1 | NRHZS léčiva ATC — ATB (J01) | `spotreba_antibiotik` enrich | ano | A1 |
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
```

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
