# NZIP / ÚZIS otevřená data — inventář a HSPA prioritizace

> **Účel:** rozcestník pro postupné překlápění ÚZIS indikátorů z „Ilustrativní" na
> „Ověřeno". Národní katalog data.gov.cz (CKAN API) je mrtvý, ale **NZIP Datové
> zpravodajství** (`nzip.cz/modul/datove-zpravodajstvi`) je živý a každá sada
> odkazuje na stabilní CSV na `data.mzcr.cz`. Vytvořeno 2026-06-10.

## Jak na to (pipeline je hotová)

```bash
# 1) discovery CSV URL z NZIP detailu (distribuční ID nelze hádat):
node -e "import('./ingest/fetchers/nzip_opendata.js').then(m=>m.discoverCsvUrl(NZIP_ID).then(console.log))"
# 2) přidej indikátor do ingest/mapping/nzip_opendata_codes.json (režim viz níže)
# 3) npm run ingest:nzip   (nebo node ingest/fetchers/nzip_opendata.js)
# 4) ověř hodnotu, přepni kartu na verified, zapiš do data/indicators.json
```

**Agregační režimy** (`mode` v mappingu):
- `microdata_ratio` — 1 řádek = 1 osoba/případ; podíl řádků kde `flag_col==flag_value` za rok. ⚠️ soubory 100–300 MB, **pomalé** (cron timeout) — předpočítat ad-hoc nebo nahradit agregátem.
- `aggregate_ratio` — `num_col` / `denom_col` za rok (×100).
- `aggregate_sum` — suma `value_col` za rok (+ volitelný `filter_col`/`filter_value`).

**Past (BACKLOG):** hodnota z NZIP se často liší od seedu kvůli metodice
(jmenovatel, jednotka, věková kohorta, vzorek vs. populace). **Nehádat** —
před přepnutím ověřit definici proti metadatům `…csv-metadata.json`.

## Prioritní fronta — seed indikátory s nalezenou NZIP sadou

Řazeno: HSPA seed indikátory mají přednost. `A`=agregát (rychlý fetch), `M`=mikrodata (velký soubor).

| NZIP id | typ | HSPA indikátor (seed) | Stav / poznámka |
|---|---|---|---|
| [1754](https://www.nzip.cz/data/1754) | A | `bezpecnost_padu_nemocnice` | NU Pády lůžková péče (agregát); jednotka rel. počtu ≠ kontrakt /1000 hosp — ověřit |
| [1768](https://www.nzip.cz/data/1768) | A | `prevalence_diabetu` | diabetes mellitus epidemiologie |
| [1772](https://www.nzip.cz/data/1772) | A | `prezit_rakoviny_5let` | novotvary přežití |
| [1823](https://www.nzip.cz/data/1823) | A | `hospicova_pece_luzka` | NRPZS poskytovatelé → hospicová lůžka, kapacity |
| [2291](https://www.nzip.cz/data/2291) | A | `vakcinace_hpv` | očkování HPV poskytovatel |
| [2515](https://www.nzip.cz/data/2515) | A | `nizka_porodna_hmotnost_pct` | novorozenci ČR → nízká porodní hmotnost |
| [2639](https://www.nzip.cz/data/2639) | A | `hiv_nove_diagnozy` | pohlavní nemoci → HIV (ale ECDC je primárnější benchmark) |
| [1616](https://www.nzip.cz/data/1616) | M | `cezarsky_rez_pct` | rodičky císařské řezy |
| [1622](https://www.nzip.cz/data/1622) | M | `cezarsky_rez_pct` | rodičky způsob porodu (mikrodata 48MB, kódy bez číselníku) |
| [1751](https://www.nzip.cz/data/1751) | M | `prumerna_delka_hospitalizace` | hospitalizační případy akutní péče → délka hospitalizace |
| [1781](https://www.nzip.cz/data/1781) | M | `ucast_preventivni_prohlidky_stomatolog` | stomatolog roční podíl OVĚŘENO 52,1 % (2023) ≈ seed 51,9 % |
| [1781](https://www.nzip.cz/data/1781) | M | `prohlidka_prakticky_lekar` | PL 2letý interval z mikrodat = 60,8 % (2023) vs seed 53,7 % — ověřit jmenovatel |

**Ověřené hodnoty ad-hoc** (čekají na rozhodnutí o metodice/fetcheru):
- `ucast_preventivni_prohlidky_stomatolog`: **52,1 %** (2023, roční podíl z mikrodat NZIP 1781) ≈ seed 51,9 % → shoda potvrzuje, lze přepnout (pozor: 185 MB soubor, fetch yearly).
- `prohlidka_prakticky_lekar`: **60,8 %** (2023, 2leté pokrytí per `id_pacient`) vs seed 53,7 % → liší se; ověřit, zda jmenovatel = evidovaní pojištěnci vs. všichni 18+.

## Kandidátní sady bez přímého HSPA indikátoru (možná budoucí rozšíření)

| NZIP id | sada | Možné využití |
|---|---|---|
| [1663](https://www.nzip.cz/data/1663) | hypertenze | hypertenze → kontrola_hypertenze (kontext) |
| [1701](https://www.nzip.cz/data/1701) | vakcinace-verejne-zdravotni-pojisteni | vakcinace z VZP — možný zdroj pro vakcinace_* indikátory |
| [1764](https://www.nzip.cz/data/1764) | ukazatele-akutni-luzkova-pece-cz-drg-skupiny | CZ-DRG ukazatele akutní lůžková péče (skupiny) |
| [1770](https://www.nzip.cz/data/1770) | novotvary-incidence-prevalence-regiony | novotvary incidence/prevalence regiony → onkologie |
| [1778](https://www.nzip.cz/data/1778) | luzkovy-fond-vyuziti | lůžkový fond využití → postele_akutni, obloznost |
| [2061](https://www.nzip.cz/data/2061) | incidence-prevalence-hospitalizace-ambulantni-pece-psychiatrie | psychiatrie incidence/prevalence/hospitalizace |
| [2066](https://www.nzip.cz/data/2066) | dusevni-onemocneni-sebevrazednost | duševní onemocnění sebevražednost |
| [2355](https://www.nzip.cz/data/2355) | umrti-pocet-rok-vek-pohlavi-kapitola-mkn-10 | úmrtí počet rok/věk/pohlaví/MKN — surová mortalita (nutná standardizace pro HSPA) |
| [2521](https://www.nzip.cz/data/2521) | hospitalizacni-pripady-dlouhodoba-casova-rada | hospitalizační případy dlouhodobá časová řada |
| [2576](https://www.nzip.cz/data/2576) | oslovene-osoby-casny-zachyt-karcinom-plic | časný záchyt karcinom plic (INDIKO-blízké) |
| [2591](https://www.nzip.cz/data/2591) | rodicky-cesko | rodičky ČR souhrn |
| [2656](https://www.nzip.cz/data/2656) | totalni-endoprotezy-pocet | totální endoprotézy počet → kontext cekaci_doba_kycel |
| [2671](https://www.nzip.cz/data/2671) | tuberkuloza-epidemiologie | tuberkulóza epidemiologie |
| [2695](https://www.nzip.cz/data/2695) | mortalita-vek-pohlavi-okresy-dlouhodoby-vyvoj | mortalita věk/pohlaví/okresy dlouhodobý vývoj |

## Úplný seznam otevřených datových sad (205)

Pro snadné dohledání. Tučně = už zmapováno výše.

| NZIP id | slug |
|---|---|
| [2704](https://www.nzip.cz/data/2704) | akutni-infarkt-myokardu |
| [2059](https://www.nzip.cz/data/2059) | akutni-pece-psychiatrie |
| [2646](https://www.nzip.cz/data/2646) | alergicka-ryma |
| [2057](https://www.nzip.cz/data/2057) | alzheimerova-nemoc-neurcene-demence |
| [2058](https://www.nzip.cz/data/2058) | ambulantni-pece-psychiatrie |
| [2647](https://www.nzip.cz/data/2647) | anesteziologicka-pece |
| [2542](https://www.nzip.cz/data/2542) | asistovana-reprodukce-prubeh-efektivita |
| [2455](https://www.nzip.cz/data/2455) | asthma-bronchiale |
| [2454](https://www.nzip.cz/data/2454) | atopicka-dermatitida |
| [2642](https://www.nzip.cz/data/2642) | casny-zachyt-vydut-brisni-aorty-pocet-vysetreni |
| [2095](https://www.nzip.cz/data/2095) | cervix-cytologie-pocet |
| [2094](https://www.nzip.cz/data/2094) | cervix-cytologie-podil-abnormalnich |
| [2330](https://www.nzip.cz/data/2330) | cervix-podil-hpv |
| [2331](https://www.nzip.cz/data/2331) | cervix-podil-pozitivnich-hpv |
| [2329](https://www.nzip.cz/data/2329) | **cervix-pokryti-trilete** |
| [2070](https://www.nzip.cz/data/2070) | cervix-screening-pokryti-populace |
| [2705](https://www.nzip.cz/data/2705) | cevni-mozkova-prihoda |
| [2735](https://www.nzip.cz/data/2735) | chronicka-dialyzacni-lecba-podil-osob-nefrolog |
| [2430](https://www.nzip.cz/data/2430) | ciselnik-icz-pojistovny-historicke |
| [2431](https://www.nzip.cz/data/2431) | ciselnik-icz-pojistovny-posledni-dostupne |
| [2479](https://www.nzip.cz/data/2479) | ciselnik-mkn-10-cz |
| [2293](https://www.nzip.cz/data/2293) | ciselnik-reprodukcni-zdravi |
| [2182](https://www.nzip.cz/data/2182) | ciselnik-vekove-skupiny |
| [2516](https://www.nzip.cz/data/2516) | denni-umrti-vek-pohlavi-pricina |
| [2663](https://www.nzip.cz/data/2663) | deti-a-mladistvi-poruchy-autistickeho-spektra |
| [1768](https://www.nzip.cz/data/1768) | **diabetes-mellitus-epidemiologie** |
| [1750](https://www.nzip.cz/data/1750) | diagnozy-kapitoly-mkn-10 |
| [2624](https://www.nzip.cz/data/2624) | diagnozy-odbornost |
| [1749](https://www.nzip.cz/data/1749) | diagnozy-skupiny-mkn-10 |
| [1748](https://www.nzip.cz/data/1748) | diagnozy-triznakove-mkn-10 |
| [2060](https://www.nzip.cz/data/2060) | dlouhodoba-pece-psychiatrie |
| [2625](https://www.nzip.cz/data/2625) | dopravni-urazy-charakteristika-okres-zarizeni |
| [1819](https://www.nzip.cz/data/1819) | dopravni-urazy-diagnozy-s |
| [1820](https://www.nzip.cz/data/1820) | dopravni-urazy-diagnozy-t |
| [1818](https://www.nzip.cz/data/1818) | dopravni-urazy |
| [2064](https://www.nzip.cz/data/2064) | dusevni-onemocneni-rehospitalizace |
| [2066](https://www.nzip.cz/data/2066) | **dusevni-onemocneni-sebevrazednost** |
| [2067](https://www.nzip.cz/data/2067) | dusevni-onemocneni-umrtnost |
| [2664](https://www.nzip.cz/data/2664) | hospitalizace-pacientu-pokus-o-sebevrazdu |
| [2225](https://www.nzip.cz/data/2225) | hospitalizacni-pripady-akutni-intezivni-pece |
| [1952](https://www.nzip.cz/data/1952) | hospitalizacni-pripady-akutni-pece-ctyrznakove-diagnozy |
| [1662](https://www.nzip.cz/data/1662) | hospitalizacni-pripady-akutni-pece-kardiologie |
| [1751](https://www.nzip.cz/data/1751) | **hospitalizacni-pripady-akutni-pece** |
| [1752](https://www.nzip.cz/data/1752) | hospitalizacni-pripady-akutni-pece-typ-zz |
| [2521](https://www.nzip.cz/data/2521) | **hospitalizacni-pripady-dlouhodoba-casova-rada** |
| [1951](https://www.nzip.cz/data/1951) | hospitalizacni-pripady-nasledna-dlouhodoba-pece |
| [2760](https://www.nzip.cz/data/2760) | hromadne-vyrabene-lecive-pripravky-1-uroven-atc |
| [2759](https://www.nzip.cz/data/2759) | hromadne-vyrabene-lecive-pripravky-2-uroven-atc |
| [2758](https://www.nzip.cz/data/2758) | hromadne-vyrabene-lecive-pripravky-3-uroven-atc |
| [2757](https://www.nzip.cz/data/2757) | hromadne-vyrabene-lecive-pripravky-4-uroven-atc |
| [2285](https://www.nzip.cz/data/2285) | hromadne-vyrabene-lecive-pripravky-atc-aktualni-mesic-icp |
| [2635](https://www.nzip.cz/data/2635) | hromadne-vyrabene-lecive-pripravky-atc-novi-pacienti |
| [2406](https://www.nzip.cz/data/2406) | hromadne-vyrabene-lecive-pripravky-atc-unikatni-pacienti |
| [2191](https://www.nzip.cz/data/2191) | hromadne-vyrabene-lecive-pripravky-icz-doklad |
| [2284](https://www.nzip.cz/data/2284) | hromadne-vyrabene-lecive-pripravky-nazev-mesic-icp |
| [2615](https://www.nzip.cz/data/2615) | hromadne-vyrabene-lecive-pripravky-nazev-novi-pacienti |
| [2405](https://www.nzip.cz/data/2405) | hromadne-vyrabene-lecive-pripravky-nazev-unikatni-pacienti |
| [2204](https://www.nzip.cz/data/2204) | hromadne-vyrabene-lecive-pripravky-sukl-atc-aktualni-mesic-icz |
| [2203](https://www.nzip.cz/data/2203) | hromadne-vyrabene-lecive-pripravky-sukl-atc-aktualni-mesic-pojistovna |
| [2200](https://www.nzip.cz/data/2200) | hromadne-vyrabene-lecive-pripravky-sukl-atc-aktualni |
| [2202](https://www.nzip.cz/data/2202) | hromadne-vyrabene-lecive-pripravky-sukl-atc-vykazani-mesic-icz |
| [2201](https://www.nzip.cz/data/2201) | hromadne-vyrabene-lecive-pripravky-sukl-atc-vykazani-mesic-pojistovna |
| [2199](https://www.nzip.cz/data/2199) | hromadne-vyrabene-lecive-pripravky-sukl-atc-vykazani |
| [2206](https://www.nzip.cz/data/2206) | hromadne-vyrabene-lecive-pripravky-sukl-mesic-icp |
| [2290](https://www.nzip.cz/data/2290) | hromadne-vyrabene-lecive-pripravky-sukl-mesic-icp-predpis-icz-vydej |
| [2286](https://www.nzip.cz/data/2286) | hromadne-vyrabene-lecive-pripravky-sukl-mesic-icz-vydej-podani |
| [2679](https://www.nzip.cz/data/2679) | hromadne-vyrabene-lecive-pripravky-sukl-novi-pacienti |
| [2404](https://www.nzip.cz/data/2404) | hromadne-vyrabene-lecive-pripravky-sukl-unikatni-pacienti |
| [2460](https://www.nzip.cz/data/2460) | hromadne-vyrabene-lecive-pripravky-unikatni-pacienti-vek-diagnoza |
| [1746](https://www.nzip.cz/data/1746) | hromadne-vyrabene-lecive-pripravky-verejne-zdravotni-pojisteni |
| [1663](https://www.nzip.cz/data/1663) | **hypertenze** |
| [2061](https://www.nzip.cz/data/2061) | **incidence-prevalence-hospitalizace-ambulantni-pece-psychiatrie** |
| [2288](https://www.nzip.cz/data/2288) | individualne-pripravovane-lecive-pripravky-sukl-mesic-icp-predpis-icz-vydej |
| [2289](https://www.nzip.cz/data/2289) | individualne-pripravovane-lecive-pripravky-sukl-mesic-icz |
| [2407](https://www.nzip.cz/data/2407) | individualne-pripravovane-lecive-pripravky-sukl-unikatni-pacienti |
| [2408](https://www.nzip.cz/data/2408) | individualne-pripravovane-lecive-pripravky-typ-unikatni-pacienti |
| [2461](https://www.nzip.cz/data/2461) | individualne-pripravovane-lecive-pripravky-unikatni-pacienti-vek-diagnoza |
| [2621](https://www.nzip.cz/data/2621) | infekcni-nemoci |
| [2517](https://www.nzip.cz/data/2517) | jednotliva-umrti-sociodemo-charakteristiky-priciny |
| [1661](https://www.nzip.cz/data/1661) | kardiostimulatory-implantabilni-kardioverter-defibrilatory |
| [1666](https://www.nzip.cz/data/1666) | kardiovaskularni-onemocneni-zatez-ceska-republika |
| [2328](https://www.nzip.cz/data/2328) | kolorektum-cekaci-doba |
| [2327](https://www.nzip.cz/data/2327) | **kolorektum-pokryti-uplne-trilete** |
| [2069](https://www.nzip.cz/data/2069) | kolorektum-screening-pokryti-populace |
| [2601](https://www.nzip.cz/data/2601) | kolorektum-screening-pokryti-populace-trilete |
| [2092](https://www.nzip.cz/data/2092) | kolorektum-screeningove-kolonoskopie-pocet |
| [2093](https://www.nzip.cz/data/2093) | kolorektum-toks-kolonoskopie |
| [2091](https://www.nzip.cz/data/2091) | kolorektum-toks-pocet |
| [2090](https://www.nzip.cz/data/2090) | kolorektum-toks-podil-pozitivnich |
| [2650](https://www.nzip.cz/data/2650) | lazenska-pece-lecebne-vykony |
| [2652](https://www.nzip.cz/data/2652) | lazenska-pece-osetrovaci-dny |
| [2653](https://www.nzip.cz/data/2653) | lazenska-pece-pacienti-hrazena-pece |
| [2651](https://www.nzip.cz/data/2651) | lazenska-pece-pacienti |
| [2662](https://www.nzip.cz/data/2662) | lecba-psychofarmaky |
| [1778](https://www.nzip.cz/data/1778) | **luzkovy-fond-vyuziti** |
| [2324](https://www.nzip.cz/data/2324) | mamografie-diagnosticke |
| [2325](https://www.nzip.cz/data/2325) | mamografie-doplnujici-vysetreni |
| [2326](https://www.nzip.cz/data/2326) | **mamografie-pokryti-uplne-trilete** |
| [2068](https://www.nzip.cz/data/2068) | mamografie-screening-pokryti-populace |
| [2088](https://www.nzip.cz/data/2088) | mamografie-screeningova-vysetreni-pocet |
| [2089](https://www.nzip.cz/data/2089) | mamografie-ultrazvukova-vysetreni-podil |
| [1922](https://www.nzip.cz/data/1922) | migrace-luzkova-pece |
| [2695](https://www.nzip.cz/data/2695) | **mortalita-vek-pohlavi-okresy-dlouhodoby-vyvoj** |
| [1823](https://www.nzip.cz/data/1823) | **narodni-registr-poskytovatelu-zdravotnich-sluzeb** |
| [2062](https://www.nzip.cz/data/2062) | navazna-pece-psychiatrie-pokryti |
| [2319](https://www.nzip.cz/data/2319) | navstevy-zz-mkn-odbornosti-okresy-migrace |
| [1665](https://www.nzip.cz/data/1665) | nemoci-obehove-soustavy-umrti |
| [1754](https://www.nzip.cz/data/1754) | **nezadouci-udalosti-luzkova-pece** |
| [2515](https://www.nzip.cz/data/2515) | **novorozenci-cesko** |
| [1613](https://www.nzip.cz/data/1613) | novorozenci-lecba-oddeleni |
| [1614](https://www.nzip.cz/data/1614) | novorozenci-lecba-porodni-sal |
| [1705](https://www.nzip.cz/data/1705) | novorozenci-pece-porodni-sal |
| [1611](https://www.nzip.cz/data/1611) | novorozenci-propusteni |
| [1623](https://www.nzip.cz/data/1623) | novorozenci-screening |
| [1615](https://www.nzip.cz/data/1615) | novorozenci-sociodemograficke-charakteristiky |
| [1612](https://www.nzip.cz/data/1612) | novorozenci-vrozene-vady |
| [1609](https://www.nzip.cz/data/1609) | novorozenci-zpusob-porodu |
| [1770](https://www.nzip.cz/data/1770) | **novotvary-incidence-prevalence-regiony** |
| [1771](https://www.nzip.cz/data/1771) | novotvary-mortalita-regiony |
| [1772](https://www.nzip.cz/data/1772) | **novotvary-preziti** |
| [2299](https://www.nzip.cz/data/2299) | nzip-autorske-clanky |
| [2300](https://www.nzip.cz/data/2300) | nzip-externi-zdroje |
| [2301](https://www.nzip.cz/data/2301) | nzip-kategorie |
| [2302](https://www.nzip.cz/data/2302) | nzip-rejstrikove-pojmy |
| [1958](https://www.nzip.cz/data/1958) | nzis-komponenty |
| [2693](https://www.nzip.cz/data/2693) | ocekavatelne-umrti-vek-pohlavi-kraje-casovy-trend |
| [2291](https://www.nzip.cz/data/2291) | **ockovani-hpv-poskytovatel** |
| [2643](https://www.nzip.cz/data/2643) | ocni-vady-pokryti-cilove-populace |
| [2576](https://www.nzip.cz/data/2576) | **oslovene-osoby-casny-zachyt-karcinom-plic** |
| [2665](https://www.nzip.cz/data/2665) | pacienti-centra-dusevniho-zdravi |
| [2691](https://www.nzip.cz/data/2691) | pacienti-ocekavatelne-umrti-mista-okresy-casovy-trend |
| [2690](https://www.nzip.cz/data/2690) | pacienti-umrti-priciny-vybrane-chronicke-diagnozy |
| [2320](https://www.nzip.cz/data/2320) | pacienti-zdravotnicka-zachranna-sluzba |
| [2639](https://www.nzip.cz/data/2639) | **pohlavni-nemoci** |
| [2195](https://www.nzip.cz/data/2195) | polymorbidita-obyvatel-kraj-bydliste |
| [2196](https://www.nzip.cz/data/2196) | polymorbidita-obyvatel-kraj-bydliste-pricina-umrti |
| [2418](https://www.nzip.cz/data/2418) | polymorbidita-obyvatel-okres-bydliste-pricina-umrti |
| [2593](https://www.nzip.cz/data/2593) | poskytovatele-cvsop |
| [2583](https://www.nzip.cz/data/2583) | potraty-sociodemograficke-charakteristiky |
| [2218](https://www.nzip.cz/data/2218) | poukazy-zdravotnicke-prostredky-okres-predepsani-vydej-bydliste |
| [2694](https://www.nzip.cz/data/2694) | predcasne-umrti-vek-pohlavi-kraje-casovy-trend |
| [2580](https://www.nzip.cz/data/2580) | preventivni-prohlidky-pokryti-kapitace |
| [2579](https://www.nzip.cz/data/2579) | preventivni-prohlidky-pokryti |
| [1781](https://www.nzip.cz/data/1781) | **preventivni-prohlidky-prakticti-lekari-stomatologove** |
| [2617](https://www.nzip.cz/data/2617) | prostata-pocet-oslovenych |
| [2618](https://www.nzip.cz/data/2618) | prostata-podil-pozitivnich-psa |
| [2616](https://www.nzip.cz/data/2616) | prostata-podil-vysetrenych-psa |
| [1747](https://www.nzip.cz/data/1747) | prostredky-zdravotnicke-techniky-material-verejne-zdravotni-pojisteni |
| [2063](https://www.nzip.cz/data/2063) | psychofarmaka-pokryti |
| [2190](https://www.nzip.cz/data/2190) | recepty-hvlp-kod-sukl-mesic-misto-vydani-atc-aktualni |
| [2189](https://www.nzip.cz/data/2189) | recepty-hvlp-kod-sukl-mesic-misto-vydani-atc-vykazani |
| [2183](https://www.nzip.cz/data/2183) | recepty-hvlp-okres-predepsani-vydej-bydliste |
| [2547](https://www.nzip.cz/data/2547) | reprodukcni-zdravotni-udalosti |
| [2633](https://www.nzip.cz/data/2633) | rocni-vykazy-ambulantni-pece |
| [2591](https://www.nzip.cz/data/2591) | **rodicky-cesko** |
| [1616](https://www.nzip.cz/data/1616) | **rodicky-cisarske-rezy** |
| [1617](https://www.nzip.cz/data/1617) | rodicky-diabetes |
| [1625](https://www.nzip.cz/data/1625) | rodicky-komplikace-porod |
| [1624](https://www.nzip.cz/data/1624) | rodicky-komplikace-tehotenstvi |
| [1620](https://www.nzip.cz/data/1620) | rodicky-porod-leky |
| [1618](https://www.nzip.cz/data/1618) | rodicky-robsonova-klasifikace |
| [1619](https://www.nzip.cz/data/1619) | rodicky-screening |
| [1621](https://www.nzip.cz/data/1621) | rodicky-sociodemograficke-charakteristiky |
| [1622](https://www.nzip.cz/data/1622) | **rodicky-zpusob-porodu** |
| [2578](https://www.nzip.cz/data/2578) | screening-demence-prakticky-lekar |
| [2711](https://www.nzip.cz/data/2711) | screening-kycle |
| [2577](https://www.nzip.cz/data/2577) | screening-sluchu-novorozenci |
| [2065](https://www.nzip.cz/data/2065) | sebevrazedne-pokusy |
| [2619](https://www.nzip.cz/data/2619) | sluch-screening-5-let-pokryti-populace |
| [1664](https://www.nzip.cz/data/1664) | srdecni-selhani-epidemiologie |
| [2656](https://www.nzip.cz/data/2656) | **totalni-endoprotezy-pocet** |
| [2661](https://www.nzip.cz/data/2661) | trajektorie-pacientu-pred-umrtim-regiony |
| [2671](https://www.nzip.cz/data/2671) | **tuberkuloza-epidemiologie** |
| [1765](https://www.nzip.cz/data/1765) | ukazatele-akutni-luzkova-pece-cz-drg-baze |
| [1766](https://www.nzip.cz/data/1766) | ukazatele-akutni-luzkova-pece-cz-drg-kategorie |
| [1767](https://www.nzip.cz/data/1767) | ukazatele-akutni-luzkova-pece-cz-drg-mdc |
| [1764](https://www.nzip.cz/data/1764) | **ukazatele-akutni-luzkova-pece-cz-drg-skupiny** |
| [2689](https://www.nzip.cz/data/2689) | umrti-doma-pocet-odbornost-925-926-poslednich-30-dnu |
| [2355](https://www.nzip.cz/data/2355) | **umrti-pocet-rok-vek-pohlavi-kapitola-mkn-10** |
| [2657](https://www.nzip.cz/data/2657) | unikatni-pacienti-vykazana-pece-odbornost-929-drg-markery |
| [1787](https://www.nzip.cz/data/1787) | urazy-diagnozy-s |
| [1788](https://www.nzip.cz/data/1788) | urazy-diagnozy-t |
| [1786](https://www.nzip.cz/data/1786) | urazy |
| [1701](https://www.nzip.cz/data/1701) | **vakcinace-verejne-zdravotni-pojisteni** |
| [2649](https://www.nzip.cz/data/2649) | vcasny-zachyt-poruchy-autistickeho-spektra |
| [2669](https://www.nzip.cz/data/2669) | vrozene-vady-cesko |
| [2628](https://www.nzip.cz/data/2628) | vykony-diagnoza-odbornost |
| [2627](https://www.nzip.cz/data/2627) | vykony-diagnoza |
| [2629](https://www.nzip.cz/data/2629) | vykony-icz-okres-diagnoza |
| [2287](https://www.nzip.cz/data/2287) | vykony-zdravotni-pece-forma-odbornost |
| [2283](https://www.nzip.cz/data/2283) | vykony-zdravotni-pece-rok-mesic-icz-odbornost |
| [2282](https://www.nzip.cz/data/2282) | vykony-zdravotni-pece-rok-mesic-zp |
| [1744](https://www.nzip.cz/data/1744) | vykony-zdravotni-pece-verejne-zdravotni-pojisteni |
| [1745](https://www.nzip.cz/data/1745) | vykony-zdravotni-pece-verejne-zdravotni-pojisteni-poskytovatel-zdravotnich-sluzeb |
| [2115](https://www.nzip.cz/data/2115) | zdravotnicka-technika-zarizeni |
| [2402](https://www.nzip.cz/data/2402) | zdravotnicke-prostredky-kod-mesic-icp-predpis-icz-vydej |
| [2217](https://www.nzip.cz/data/2217) | zdravotnicke-prostredky-kod-mesic-icz |
| [2216](https://www.nzip.cz/data/2216) | zdravotnicke-prostredky-kod-mesic-pojistovna |
| [2413](https://www.nzip.cz/data/2413) | zdravotnicke-prostredky-kod-unikatni-pacienti |
| [2414](https://www.nzip.cz/data/2414) | zdravotnicke-prostredky-typ-unikatni-pacienti |
| [2462](https://www.nzip.cz/data/2462) | zdravotnicke-prostredky-unikatni-pacienti-vek-diagnoza |
| [2692](https://www.nzip.cz/data/2692) | zemreli-vek-pohlavi-kraje-diagnozy-mista |
| [2514](https://www.nzip.cz/data/2514) | zvlast-uctovane-lecive-pripravky-signalni-vykony |
| [2347](https://www.nzip.cz/data/2347) | zvlast-uctovane-lecive-pripravky-sukl-atc-aktualni |
| [2188](https://www.nzip.cz/data/2188) | zvlast-uctovane-lecive-pripravky-sukl-atc-vykazani |

---

_Katalog má 556 položek celkem (205 otevřených dat + datové souhrny/vizualizace)._
_Regenerace seznamu: stáhni `nzip.cz/modul/datove-zpravodajstvi/katalog-dat?show=100&page=N`._
