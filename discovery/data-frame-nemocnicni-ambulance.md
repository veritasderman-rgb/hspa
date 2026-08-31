# Datový rámec — clanek-nemocnicni-ambulance

Sestaveno 31. 8. 2026. Všechna čísla stažena a přepočítána dnes ze dvou
nezávislých primárních zdrojů; nic není přebráno z backlogu ani z jiného
článku korpusu.

## Centrální KPI

- **Hlavní hodnota: 65,0 mld Kč** — podsegment **2.1.1 ZPP** („ambulantní péče
  (doklady 01, 01s, 03, 03s, 06 bez vazby na hospitalizační doklad 02)")
  u skupiny poskytovatelů akutní lůžkové péče, rok **2024, skutečnost**,
  všech sedm zdravotních pojišťoven.
- **Primární zdroj:** MZ ČR, *Hodnocení vývoje systému veřejného zdravotního
  pojištění v roce 2024*, tabulková příloha **Tabulka č. 3** („Struktura
  nákladů na zdravotní služby podle jednotlivých segmentů, v tis. Kč"),
  sloupcový blok „Zdravotní pojišťovny celkem", řádek 2.1.1 = **65 049 110
  tis. Kč**. Staženo 31. 8. 2026 z
  `mzd.gov.cz/wp-content/uploads/2024/06/vz2024_hodnoceni_tab_3-3a-3b-3c.xlsx`.
- **Druhý nezávislý zdroj:** ÚZIS, datový souhrn **NRHZS OIS-11-24** „Náklady
  zdravotních pojišťoven dle segmentů péče", verze **2026-01**
  (nzip.cz/data/2394), list *Úhradová data – souhrn*, segment 2.1.1, rok
  2024 = **64,631 mld Kč**. Staženo 31. 8. 2026. Rozdíl obou zdrojů **0,6 %**.
- **Časový kontext:** rok 2024 (poslední uzavřený). Řada je zatím dvouletá
  (2023 a 2024) v obou zdrojích na úrovni podsegmentů; delší řada existuje
  jen na úrovni celých segmentů (Tabulka č. 8, od 2019).

## Sekundární hodnoty

Vše z Tabulky č. 3, blok „Zdravotní pojišťovny celkem", skutečnost, mil. Kč
(zaokrouhleno z tis. Kč), pokud není uvedeno jinak:

| ř. | Ukazatel | 2023 | 2024 | růst |
|---|---|---|---|---|
| I. | Náklady na zdravotní služby ze ZFZP oddílu A celkem | 456 454 | 504 581 | +10,5 % |
| 1 | na ambulantní péči celkem | 124 974 | 143 798 | +15,1 % |
| 2 | na lůžkovou zdravotní péči celkem | 258 894 | 283 320 | +9,4 % |
| 2.1 | skupina poskytovatelů akutní lůžkové péče | 229 981 | 251 502 | +9,4 % |
| **2.1.1** | **v tom: ambulantní péče** | **61 163** | **65 049** | **+6,4 %** |
| 2.1.2 | akutní lůžková péče | 136 490 | 149 764 | +9,7 % |
| 2.1.3 | ostatní (LPS, přeprava atd.) | 832 | 583 | −29,9 % |
| 2.1.4 | léčivé přípravky na specializovaných pracovištích | 31 496 | 36 106 | +14,6 % |
| 2.2 | následná a dlouhodobá lůžková péče | 28 914 | 31 818 | +10,0 % |
| III. | Náklady na zdravotní služby celkem (I. + II.) | 458 741 | 508 134 | +10,8 % |

Kontrolní součet: 2.1.1 + 2.1.2 + 2.1.3 + 2.1.4 = 251 502 = ř. 2.1 (přesně).
2.1 + 2.2 = 283 320 = ř. 2 (přesně).

Doprovodná čísla z textové části téhož dokumentu (PDF `vz2024_hodnoceni.pdf`,
staženo 31. 8. 2026):

- „Celkové náklady na zdravotní služby v roce 2024 tvořily částku **508,134
  mld. Kč**. Oproti roku 2023 byly náklady vyšší o 49,393 mld. Kč."
- ZFZP oddíl A: „nároky PZS za poskytnuté zdravotní služby v roce 2024 ve výši
  **504,581 mld. Kč**… nárůst o 48,126 mld. Kč, tj. o 10,5 %."
- „V objemově největším segmentu lůžkové zdravotní péče byl nárůst nákladů
  o **9,4 %** (tj. o 24,426 mld. Kč) oproti roku 2023. U ambulantní péče došlo
  k navýšení nákladů celkem o **15,1 %** (tj. o 18,824 mld. Kč)."
- „V roce 2024 bylo v průměru evidováno **10,84 mil. pojištěnců**."
- Náklady na zdravotní služby na jednoho pojištěnce: **46 856 Kč**.
- Tabulka č. 8 (řada 2019–2024, mil. Kč) — ambulantní péče: 83 028 / 100 602 /
  109 472 / 114 193 / 124 974 / 143 798; lůžková péče: 170 226 / 197 758 /
  229 253 / 237 060 / 258 894 / 283 320; celkem: 310 969 / 359 023 / 404 543 /
  418 126 / 456 454 / 504 581.

Z NRHZS OIS-11-24 (vlastní přepočet ze staženého souboru, součet přes všech
sedm pojišťoven, řádek 1.7.1 podle metodiky sady vynechán):

| segment | 2023 | 2024 | růst |
|---|---|---|---|
| celkem | 456,07 mld | 504,80 mld | +10,7 % |
| segment 1 (ambulantní) | 128,02 mld | 144,92 mld | +13,2 % |
| segment 2 (lůžkový) | 256,69 mld | 284,21 mld | +10,7 % |
| 2.1.1 | 59,269 mld | 64,631 mld | +9,0 % |
| 2.1.2 | 137,466 mld | 150,005 mld | +9,1 % |
| 2.1.4 | 30,798 mld | 34,237 mld | +11,2 % |

## Odvozené hodnoty (prostá aritmetika nad výše uvedenými čísly)

- 2.1.1 / I. (2024) = 65 049 / 504 581 = **12,89 %** všech úhrad ZFZP.
  Podle NRHZS 64,631 / 504,80 = 12,80 %.
- 2.1.1 / segment 2 = 65 049 / 283 320 = **22,96 %**.
- 2.1.1 / 2.1 = 65 049 / 251 502 = **25,86 %**.
- 2.1.1 / (2.1.1 + 2.1.2) = 65 049 / 214 813 = **30,28 %** — tolik z peněz,
  které pojišťovny pošlou akutním nemocnicím za vlastní péči, je za ambulantní
  ošetření. Podle NRHZS 2024 = 30,11 %, podle NRHZS 2023 = 30,13 %.
- 2.1.2 / I. = 149 764 / 504 581 = **29,68 %**.
- Ambulantní péče celkem (segment 1 + 2.1.1) = 124 974 + 61 163 = 186 137
  (2023) → 143 798 + 65 049 = **208 847 mil. Kč (2024)** = **41,39 %** úhrad
  (2023: 40,78 %).
- „Lůžková péče" po odečtení 2.1.1 = 283 320 − 65 049 = **218 271 mil. Kč**
  = **43,26 %**.
- Vlastní lůžková péče (2.1.2 + 2.1.3 + 2.2) = 149 764 + 583 + 31 818
  = **182 165 mil. Kč** = **36,10 %**.
- 2.1.1 na pojištěnce = 65 049 mil. Kč / 10,84 mil. pojištěnců = **6 001 Kč**
  ročně.
- Rozdíl obou zdrojů u 2.1.1 (2024): (65,049 − 64,631) / 65,049 = **0,64 %**.

## Okresní řez (jen rok 2023 — v sadě není nic novějšího)

Zdroj: OIS-11-24, list *Úhradová data – okresy*, vlastní přepočet.
Kontrolní součet listu = 456,07 mld Kč, tj. **přesná shoda se souhrnným
listem**. 78 řádků: 77 okresů + „Neznámo" (CZ9999, 2,03 mld Kč — segmenty,
které pojišťovny nečlení na IČZ).

Podíl 2.1.1 na součtu 2.1.1 + 2.1.2 (47 okresů, kde je ten součet ≥ 1 mld Kč):

- ČR celkem 2023: **30,1 %**, medián okresů **31,8 %**.
- Nejvyšší: Blansko 40,2 % · Příbram 39,3 % · Bruntál 38,9 % · Kolín 38,3 % ·
  Mladá Boleslav 36,5 % · Písek 36,4 % · Prostějov 36,0 % · Opava 35,2 %.
- Nejnižší: Frýdek-Místek 20,3 % · Most 22,0 % · Pardubice 23,4 % ·
  České Budějovice 24,0 % · Karlovy Vary 25,2 % · Litoměřice 25,7 % ·
  Ostrava-město 26,2 % · Ústí nad Labem 27,1 %.
- Okresy fakultních nemocnic: Praha 28,9 % · Brno-město 29,1 % ·
  Hradec Králové 29,3 % · Olomouc 28,6 % · Plzeň-město 31,2 %.
- Dva okresy mají celý segment 2.1 nulový (žádný poskytovatel akutní lůžkové
  péče s vlastním IČZ v okrese): **Praha-západ** a **Rychnov nad Kněžnou**.

## Legislativa a metodika

- **§ 15 zákona č. 48/1997 Sb.** a **vyhláška č. 376/2011 Sb.** — právní
  ukotvení podsegmentu 2.1.4 (léčivé přípravky hrazené pouze poskytovatelům
  na specializovaných pracovištích). Uvedeno přímo v číselníku Tabulky č. 3.
- Verbatim definice segmentů z číselníku ZPP (Tabulka č. 3):
  - segment 1: „na ambulantní péči celkem (**poskytovatelé zdravotních služeb
    nevykazující žádný kód ošetřovacího dne**, zahrnují se náklady na zvlášť
    účtované léčivé přípravky, zvlášť účtovaný materiál, s výjimkou nákladů na
    léky na recepty a zdravotnické prostředky vydané na poukazy)";
  - segment 2: „na lůžkovou zdravotní péči celkem (**poskytovatelé zdravotních
    služeb vykazující kód ošetřovacího dne**, zahrnují se náklady na zvlášť
    účtované léčivé přípravky, zvlášť účtovaný materiál, paušál na léky
    **i případně nasmlouvané služby ambulantní, stomatologickou a přepravu
    provozovanou v rámci lůžkového PZS** s výjimkou nákladů na léky na recepty
    a zdravotnických prostředků vydaných na poukazy)";
  - 2.1.1: „v tom: ambulantní péče (doklady 01, 01s, 03, 03s, 06 **bez vazby na
    hospitalizační doklad 02** ‚Metodiky pro pořizování a předávání dokladů')";
  - 2.1.2: „akutní lůžková péče (doklady 02, 02s, 03, 03s a 06 **s vazbou na
    doklad 02**)".
- Metodický list OIS-11-24: „Segmenty 1.7 a 1.7.1 jsou uváděny v logice dle
  definice z číselníku segmentů (‚z toho'), segment 1.7 obsahuje i úhradu za
  1.7.1. a tyto dva segmenty se nesmí znovu sčítat." — respektováno ve všech
  součtech výše.

## Methodology caveaty (musí být v článku)

1. **Dva zdroje, dvě čísla.** ZPP (Tabulka č. 3) je účetnictví pojišťoven
   včetně dohadných položek; OIS-11-24 je agregát z NRHZS. Úrovně se shodují
   na 0,6 %, meziroční tempo se liší (6,4 vs 9,0 %). Článek uvádí obě čísla
   a netvrdí, které je „správné"; **oba zdroje se ale shodují ve směru** —
   nemocniční ambulance rostou pomaleji než samostatný ambulantní sektor.
2. **Označení roku v OIS-11-24.** Sada vede rok 2024 pod hodnotou `2024_pol`
   a v metodickém listu má „Období: 01.01.2023–30.06.2024". Že jde o **plný
   rok 2024**, ověřeno křížově: součet sady za `2024_pol` (504,80 mld) se liší
   od nezávisle publikovaného ročního čísla MZ ČR pro ZFZP oddíl A (504,581
   mld) o **0,04 %**; pololetní hodnota by byla zhruba poloviční. Zpracováno
   dne 31. 10. 2025.
3. **Okres = okres zařízení podle IČZ**, ne bydliště pacienta. Okresní řez
   proto měří, kde se péče vykázala, ne kde bydlí ošetření lidé; dva okresy
   bez vlastní akutní nemocnice mají nulu, protože jejich obyvatelé se léčí
   v sousedním okrese.
4. **Okresní řez existuje jen za rok 2023.** List *Úhradová data – okresy*
   obsahuje pouze rok 2023, souhrnný list oba roky.
5. **2.1.1 není totéž co „ambulance nemocnice" v hovorovém smyslu.** Je to
   účetní kategorie definovaná typem dokladu bez vazby na hospitalizační
   doklad. Článek nesmí tvrdit, co konkrétně uvnitř je (kolik připadá na
   odborné poradny, kontroly po hospitalizaci nebo jednodenní výkony) —
   ta struktura v sadě není.
6. **Nepřenášet mezi metodikami.** Podíly segmentů ZPP nelze srovnávat
   s podíly podle SHA (mezinárodní srovnání) — jiný čitatel i jmenovatel.
   Článek proto žádný mezinárodní benchmark neuvádí.

## Interní křížové odkazy

- Související články: `clanek-financovani-segmenty-2026` (přehled celých
  508 miliard), `clanek-presun-pece-z-luzek` (tatáž vlastnost v klasifikaci
  SHA a riziko splnění cíle přeúčtováním), `clanek-prazdna-luzka-efektivita`,
  `clanek-ambulantni-kontakty`.
- Související indikátory: `podil_vydaje_luzkova_pece` (56,3 %),
  `podil_vydaje_ambulantni_pece` (28,7 %), `uhrada_zp_per_pojistenec`
  (46 529 Kč), `ambulantni_kontakty_per_capita`, `postele_akutni_per_1000`.
