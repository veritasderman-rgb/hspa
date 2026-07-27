# Plán: Krajský dashboard — okresní/obecní granularita (ukazatel po ukazateli)

> **Účel:** samostatný vstupní bod pro postupné prohlubování granularity
> krajského přehledu (`kraje.html`). Audit všech datasetů v `data/regions.json`:
> u koho existuje u primárního zdroje jemnější než krajská granularita
> (okres = LAU1, obec, ORP), jak je dostupná a co je metodicky obhajitelné.
>
> **Vytvořeno:** 2026-07-24. Vzniklo ze zadání „občas mi přijde, že některá
> data mají granularitu na úrovni obcí nebo okresů — jít i na ten větší
> detail, pokud existuje; jdi ukazatel po ukazateli".

## 0. Co už je hotové (infrastruktura + první dávka)

- **Schéma:** dataset v `regions.json` může nést volitelný blok `okresy`
  `{ source, source_url, period, note, fetched_at, items: [{code, name, kraj, value}] }`.
  Kód kraje = prefix LAU1 kódu okresu (CZ0201 → CZ020). POZOR: poslední znak
  LAU1 jde za 9 do písmen (Středočeský: CZ020A Praha-východ, CZ020B Praha-západ,
  CZ020C Rakovník).
- **UI:** `kraje.html` drill-down — klik na kraj v mapě nebo v žebříčku otevře
  panel s okresním rozpadem (bar list, kraj + průměr ČR v poznámce, zdroj
  s odkazem). Hint „okresní detail — klikněte na kraj" se ukazuje jen u datasetů,
  které okresy mají. Panel se zavírá křížkem a při přepnutí ukazatele.
- **Testy:** `tests/regions-okresy.test.js` (struktura, LAU1↔NUTS3 konzistence,
  věrohodnost hodnot, kraj v rozsahu svých okresů ±1,5).
- **První dávka:** `nadeje_doziti_zeny` → 77 okresů, e₀ žen, pětiletý průměr
  2021–2025 (viz §2 řádek 2). Reprodukovatelně: `node scripts/fetch-okres-nadeje-doziti.mjs`.

## 1. Klíčový objev: ČSÚ open-data API (data.csu.gov.cz)

Katalog: `GET https://data.csu.gov.cz/api/katalog/v1/sady` (879 sad; pole
`urovneTypUzemi` říká přímo úrovně STAT/REGION/KRAJ/OKRES/ORP/OBEC — tvrdý
důkaz granularity per sada). Data: **předdefinované výběry**
`GET /api/dotaz/v1/data/vybery/{VYBER}?rozsah=CELY_VYBER` (JSON-stat 2.0;
`format=CSV` velkými písmeny; default rozsah vrací jen ukázku!). Custom POST
`/data/sady/{kod}/vlastni` vrací 400/500 — používat výběry.

Ověřené sady s jemnou granularitou (přímo z katalogu):

| ČSÚ sada | Název | Úrovně |
|---|---|---|
| **OBY04BO** | Úmrtnostní tabulky za okresy (výběr OBY04BOT01 „Naděje dožití v okresech") | OKRES |
| OBY04BOR | Úmrtnostní tabulky za SO ORP a Prahu | ORP |
| OBY04C | Zemřelí podle zkráceného seznamu příčin smrti | STAT→OKRES,ORP |
| OBY04A | Zemřelí podle pohlaví a věku | STAT→OKRES,ORP |
| OBY03 | Narození — souhrnné údaje | STAT→OKRES,ORP |
| OBY01PD | Stav a pohyb obyvatel (populace = jmenovatele) | STAT→OKRES,ORP |
| OBY01PDOB | Stav a pohyb obyvatel v obcích | KRAJ,ORP,**OBEC** |
| OBY04D | Standardizované míry úmrtnosti dle příčin | jen STAT,KRAJ (!) |

Důležitý metodický limit: ČSÚ **standardizované** míry (OBY04D) končí krajem.
Na okresní úrovni jsou jen **počty** (OBY04C) → okresní míry si musíme počítat
sami jako hrubé (nestandardizované) a přiznat to — jinak nesrovnatelné
s krajskou SDR vrstvou. Úmrtnostní tabulky okresů jsou **jen pětileté průměry**
a **jen po pohlavích** (oboupohlavní okresní e₀ neexistuje).

## 2. Audit ukazatel po ukazateli (42 datasetů v regions.json)

Třídy proveditelnosti:
- **A — proveditelné hned**: curl-dostupný ověřitelný zdroj, mechanika známa.
- **B — proveditelné s metodickou výhradou**: data existují (většinou ČSÚ počty),
  ale okresní hodnota vyžaduje vlastní výpočet hrubé míry / 5letý průměr
  a viditelné označení odchylky od krajské metodiky.
- **C — zdroj možná existuje, teď nedostupný**: ÚZIS/NZIP/registr publikuje
  krajsky; okresní rozpad buď neveřejný, v mikrodatech NRHZS (heavy stream),
  nebo za JS katalogem NZIP (potřeba browser session / nzip_id).
- **D — granularita neexistuje / nedává smysl**: survey s malým vzorkem,
  národní agregát, nebo ekologicky nepřenosná veličina.

| # | Dataset (indicator_id) | Zdroj kraj. dat | Okres | Obec/ORP | Třída | Poznámka |
|---|---|---|---|---|---|---|
| 1 | nadeje_doziti_total | ČSÚ | NE (jen po pohlavích) | ORP po pohlavích (OBY04BOR) | D* | Oboupohlavní okresní e₀ ČSÚ nepublikuje; nemíchat pohlaví. *Alternativa realizována: dataset `nadeje_doziti_muzi` (viz řádek 2b). |
| 2 | **nadeje_doziti_zeny** | ČSÚ | ✅ **NAPOJENO** (OBY04BOT01, 5letý ⌀ 2021–25) | ORP možné (OBY04BOR) | **A — hotovo** | §4: všech 14 krajů v rozsahu svých okresů. |
| 2b | **nadeje_doziti_muzi** (nový dataset) | ČSÚ | ✅ **NAPOJENO** (kraje OBY04BKT01 2letý ⌀ 2024–25; okresy OBY04BOT01 5letý ⌀; ČR OBY04BCRT01 jednoletá 2025 = 77,5) | ORP možné | **A — hotovo** | Okresní rozptyl mužů 5,4 roku (Most 73,1 … Praha-západ 78,5) > ženy (4,3). Publikační žebřík period ČSÚ (1letá/2letá/5letá) přiznán v note. |
| 3 | lekari_per_1000 | ÚZIS NRZP | nepublikováno veřejně | — | C | ÚZIS ročenky okresní řady zrušeny (~2013); NRZP open data kraj. |
| 4 | mortalita_kardiovaskularni | ČSÚ/Eurostat SDR | počty OBY04C | ORP počty | B | Okresně jen hrubá míra (vs. krajská standardizovaná) + 5letý ⌀; nutná viditelná výhrada. |
| 5 | obezita_prevalence | EHIS | — | — | D | Survey ~10 tis. respondentů — okres nemá oporu. |
| 6 | kojenecka_umrtnost | ČSÚ | OBY04A (zemřelí věk 0) + OBY03 (narození) | ORP | B | Malá čísla → jedině víceleté průměry. |
| 7 | kuractvi_denni | EHIS/SZÚ | — | — | D | Survey. |
| 8 | screening_mamograficky | ÚZIS/NSC | neveřejné | — | C | Program reportuje kraj; okres v NRHZS mikrodatech. |
| 9 | vakcinace_mmr_deti | ÚZIS/hygieny | neveřejné | — | C | |
| 10 | cekaci_doba_kycel | VZP | — | poskytovatel | C | Přirozená granularita je nemocnice, ne okres. |
| 11 | sebevrazdy_per_100k | ČSÚ/Eurostat | počty OBY04C | ORP počty | B | Hrubá míra + 5letý ⌀ (malá čísla); jinak metodicky křehké. |
| 12 | mortalita_preventabilni | Eurostat (OECD def.) | teoreticky z OBY04C | — | C | Skládání ICD skupin definice nad okresními počty = větší projekt. |
| 13 | sestry_per_1000 | ÚZIS NRZP | neveřejné | — | C | |
| 14 | stomatologove_per_1000 | ÚZIS NRZP/ČSK | neveřejné agregáty | — | C | ČSK má členy dle okresů, nepublikuje otevřeně. |
| 15 | prevalence_diabetu | NZIS/EHIS | NZIP mapa? | — | C | NZIP „datové zpravodajství" má diabetes mapy — katalog je JS SPA (potřeba nzip_id / browser). |
| 16 | mortalita_onkologicka | ČSÚ/Eurostat SDR | počty OBY04C | ORP počty | B | Jako #4. |
| 17 | pyll_potencialne_ztracene_roky | výpočet | z OBY04A možný | — | C | Vlastní výpočet PYLL nad okresními úmrtími dle věku — proveditelné, pracné. |
| 18 | vakcinace_chripka_65 | ÚZIS/ZP | neveřejné | — | C | |
| 19 | hospitalizace_acsc | NRHZS | mikrodata (okres bydliště) | — | C-heavy | NRHZS stream 100–300 MB — jen s vědomým souhlasem (viz PLAN-DATA-NZIP-LIVE §0a). |
| 20 | dojezd_zzs | ZZS krajů | neagregováno | — | D | ZZS je krajská organizace; okresní dojezd nikdo nepublikuje. |
| 21 | ehealth_adoption | NCEZ | — | — | D | Národní metrika. |
| 22 | screening_kolorektalni (×2 ⚠️) | ÚZIS NRHZS | neveřejné | — | C | ⚠️ **DUPLIKÁT v regions.json**: `screening_kolorektalni_kraje` (⌀ 32) vs `screening_kolorektalni` (⌀ 28,4) — dvě různé metriky (pokrytí programu vs. 2letá účast) pod jedním indicator_id. UI opraveno (selector přes unikátní id), ale redakce musí rozhodnout, která sada je kanonická, a druhou přejmenovat/odstranit. |
| 23 | hospitalizace_na_100k | NRHZS | mikrodata | — | C-heavy | |
| 24 | ambulantni_kontakty_per_capita | NRHZS | mikrodata | — | C-heavy | |
| 25 | psychiatri_per_100k | ÚZIS NRZP | neveřejné | — | C | |
| 26 | alkohol_spotreba | národní odhad | — | — | D | Kraj už je aproximace. |
| 27 | incidence_kolorektalni | ÚZIS NOR | SVOD okresní analýzy | — | C | svod.cz umí okres, ale není to open data API; NOR open data kraj. |
| 28 | prohlidka_prakticky_lekar | ZP výkazy | neveřejné | — | C | |
| 29 | vydaje_prevence_pct | SHA | — | — | D | Národní účty zdraví. |
| 30 | pm25_expozice | EEA/CHMI | gridová data | obec teoreticky | C | CHMI publikuje gridy/stanice — agregace na okres = GIS projekt. |
| 31 | cekaci_doby_specialist | šetření | — | — | D | |
| 32 | pracovnici_ltc_per_100_65plus | ÚZIS/MPSV | neveřejné | — | C | |
| 33 | **lekarny_per_100k** | SÚKL | ✅ **NAPOJENO** (SÚKL seznam 2026-06-30 + ČSÚ Px populace; `scripts/fetch-okres-lekarny.mjs`) | ✅ OBEC možná (mapování obcí hotové) | **A — hotovo** | ⚠️ Nález: krajský seed (avg 26,7; Praha 32,4) odporoval živému kontraktu (25,06) → krajská vrstva PŘEPOČTENA týmž výpočtem (avg 24,9; rekonciliace okres→kraj přesná). Mapování MESTO→okres: ČSÚ dimenze UZ5OK „Obce (okres)" (6 258 obcí jedním dotazem — text „5" matchuje kód) + kaskáda (unikátní jméno → PSČ-kraj → nejbližší medián PSČ okresu); 2 687/2 687 namapováno. |
| 34 | spotreba_opioidu | SÚKL DIS-13 | — | — | D | DIS-13 = dodávky do lékáren dle sídla lékárny ≠ spotřeba obyvatel okresu (ekologický klam, spádovost). |
| 35 | polypragmazie_65plus | ZP/ÚZIS | neveřejné | — | C | |
| 36 | incidence_prsu | ÚZIS NOR | SVOD | — | C | Jako #27. |
| 37 | mortalita_kojenecka | ČSÚ | jako #6 | ORP | B | (Druhý kojenecký dataset — kandidát na sloučení s #6.) |
| 38 | transplantace_per_milion | KST | — | — | D | Národní/centrová medicína. |
| 39 | prijem_disponibilni | ČSÚ regionální účty | — | — | D | Regionální účty končí krajem. |
| 40 | ohrozeni_chudobou | EU-SILC | — | — | D | Survey, krajské odhady na hraně. |
| 41 | cholesterol_prumer_dospeli | survey | — | — | D | |
| 42 | vakcinace_hexa/… ostatní bez řádku | — | — | — | — | Datasety mimo seznam výše granularitu neřeší (kraj = strop). |

**Souhrn:** 2× A (1 hotovo, 1 kandidát), 6× B (ČSÚ počty → hrubé míry s výhradou),
~15× C (neveřejné/heavy/browser), zbytek D (survey/národní/metodicky nepřenosné).

## 3. Stav dávek a doporučené pokračování

**Hotovo (2026-07-27):** 1. `nadeje_doziti_zeny` okresy · 2. `nadeje_doziti_muzi`
(nový krajský dataset + okresy) · 3. `lekarny_per_100k` okresy + přepočet krajské
vrstvy (seed→computed, soulad s živým kontraktem).

**Nálezy z dávky lékáren (k dořešení jinde):**
- `PSC_KRAJ_MAP` v `ingest/fetchers/sukl.js` má chybná pásma na moravské hranici:
  750–753 (Přerov, Olomoucký) spadá do pásma mapovaného na Moravskoslezský
  a 792–794 (Bruntál, Moravskoslezský) do pásma Olomouckého. Krajské agregace
  fetcheru jsou tím zkreslené → měl by přejít na mapování obec→okres→kraj
  (převodník UZ5OK je hotový v `scripts/fetch-okres-lekarny.mjs`).
- Obecní úroveň lékáren je na dosah (mapování obcí existuje) — čeká jen na UI
  pro obce (drill-down 2. úrovně) nebo samostatnou stránku.

**Další v pořadí:**
1. **Kojenecká úmrtnost okresně (třída B)** — OBY04A+OBY03, pětiletý průměr,
   viditelná výhrada „hrubá míra, 5letý průměr".
2. **Mortalitní ukazatele (B)** — jednotný vzor „okresní hrubá míra (5letý ⌀)
   vs. krajská standardizovaná" + společná UI výhrada.
