# Datový rámec — amr-multirezistence-soubeh

Všechna čísla stažena **29. 8. 2026**. Dva nezávislé primární kanály téhož
zdroje (ECDC), které se vzájemně potvrzují:

- **A) ECDC Surveillance Atlas of Infectious Diseases**, REST API
  `atlas.ecdc.europa.eu/public/AtlasService/rest/` (dataset 27, health topic 4
  = AMR / EARS-Net). Per-country hodnoty, čitatele i jmenovatele.
  Veřejný přístup: <https://atlas.ecdc.europa.eu/public/index.aspx?Dataset=27&HealthTopic=4>
- **B) ECDC, *Antimicrobial resistance in the EU/EEA (EARS-Net) — Annual
  Epidemiological Report for 2024***, Stockholm: ECDC; listopad 2025,
  ISSN 3094-5852. PDF stažen a strojově přečten 29. 8. 2026.
  <https://www.ecdc.europa.eu/sites/default/files/documents/antimicrobial-resistance-eu-annual-epidemiological-report-2024.pdf>

**Křížová kontrola A × B**: rozpětí zemí publikovaná ECDC v tabulce 9b
(K. pneumoniae kombinovaná 0,0 − 71,5 %; E. coli 1,2 − 21,7 %;
P. aeruginosa 0,0 − 47,5 %; Acinetobacter 0,0 − 89,5 %) přesně odpovídají
minimům a maximům, které vrátil Atlas pro rok 2024 (BG 71,46 % a IS 0,00 %;
MT 21,70 % a DK 1,18 %; EL 47,47 % a EE 0,00 %; RO 89,47 % a AT/FI/IE
0,00 %). Kanály se shodují.

---

## Centrální KPI

- **Hlavní hodnota: 26,6 %** — podíl invazivních izolátů *Klebsiella
  pneumoniae* v ČR rezistentních **současně** k cefalosporinům 3. generace,
  fluorochinolonům a aminoglykosidům, rok 2024.
- Čitatel/jmenovatel: **470 z 1 767** testovaných izolátů (Atlas,
  `KLEPNE.COMBINED.R.COUNT` = 470, `KLEPNE.COMBINED.COUNT` = 1 767;
  podíl `KLEPNE.COMBINED.R.PROPORTION` = 26,59875 %).
- Primární zdroj: ECDC Surveillance Atlas, measureId 1146375 / 1146376 /
  1146377, geoCode CZ, staženo 29. 8. 2026.
- **Benchmark**: populačně vážený průměr EU/EHP **18,8 %** (2024) —
  zdroj B, tabulka 9b (n = 58 262 izolátů), statisticky významný klesající
  trend 2020–2024. ČR je tedy **nad** evropským průměrem.
- **Pořadí ČR**: **10. nejvyšší z 29 zemí EU/EHP**, které za rok 2024
  hodnotu vykázaly (Atlas, geoLevel 2, rok 2024). Nad ČR: BG 71,5 %,
  EL 57,5 %, RO 50,4 %, PL 42,8 %, CY 39,3 %, HR 39,2 %, SK 36,2 %,
  LV 33,1 %, IT 28,6 %. Pod ČR nejblíž LT 25,2 % a HU 22,4 %.
- Časový kontext: rok 2024, data hlášená v roce 2025.

## Klíčový analytický výrok (a jeho aritmetika)

Jednotlivé podíly ČR 2024 pro *K. pneumoniae* (Atlas, tentýž jmenovatel
N = 1 767 u všech tří):

| třída | podíl R | measureId |
|---|---|---|
| cefalosporiny 3. generace | **44,1 %** | 1146361 |
| fluorochinolony | **35,0 %** | 1146354 |
| aminoglykosidy | **35,0 %** | 1146368 |

- Součin tří podílů (kdyby selhávaly **nezávisle na sobě**):
  0,4414 × 0,3503 × 0,3497 = **5,41 %**.
- Skutečná kombinovaná rezistence: **26,6 %** → **4,9× více**, než by dalo
  nezávislé selhávání.
- Metodicky čisté srovnání: kombinovaná populace i jednotlivé skupiny mají
  **shodný jmenovatel N = 1 767** (Atlas), jde tedy o tutéž množinu izolátů.
- Totéž u *E. coli* ČR 2024: 15,8 % (3GC) × 19,2 % (FQ) × 9,6 % (AG)
  = 0,29 %; skutečnost **4,78 %** → **16,5×** více.

> **Výhrada, kterou článek musí nést**: součin podílů není statistický test
> nezávislosti, je to jen referenční bod „co by bylo, kdyby". Skutečnost
> nad ním znamená, že rezistence se v izolátech shlukuje — což je
> u přenosných rezistenčních plazmidů očekávané, ne překvapivé. Článek to
> tvrdí přesně takto, nedělá z toho kauzální výrok.

## Kombinovaná rezistence ČR vs EU/EHP, 2024 (všechny čtyři patogeny)

| patogen | definice kombinace | ČR | ČR čitatel/jmenovatel | EU/EHP vážený průměr | rozpětí zemí |
|---|---|---|---|---|---|
| *K. pneumoniae* | 3GC + FQ + AG | **26,6 %** | 470 / 1 767 | 18,8 % | 0,0 − 71,5 % |
| *P. aeruginosa* | ≥ 3 z 5 (pip/tazo, ceftazidim, karbapenemy, FQ, AG) | **10,7 %** | 76 / 710 | 10,0 % | 0,0 − 47,5 % |
| *E. coli* | 3GC + FQ + AG | **4,8 %** | 204 / 4 268 | 5,5 % | 1,2 − 21,7 % |
| *Acinetobacter* spp. | FQ + AG + karbapenemy | **20,6 %** | 21 / 102 | 27,0 % | 0,0 − 89,5 % |

ČR hodnoty: Atlas (A). EU/EHP průměry a rozpětí: zpráva ECDC, tabulka 9b (B).

## Pětiletý trend ČR — kombinovaná rezistence (Atlas, %)

| patogen | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 |
|---|---|---|---|---|---|---|
| *K. pneumoniae* | 39,3 | 34,6 | 33,9 | 32,7 | 28,3 | **26,6** |
| *P. aeruginosa* | 19,0 | 15,5 | 15,4 | 17,7 | 15,3 | **10,7** |
| *E. coli* | 6,6 | 5,4 | 5,6 | 4,9 | 4,9 | **4,8** |
| *Acinetobacter* | 29,5 | 30,5 | 50,8 | 36,5 | 34,1 | **20,6** |

(2017: K. pneumoniae 41,8 %.) Trend u klebsielly je klesající po celé
období — to je věcně dobrá zpráva a článek ji nesmí zamlčet.

## Protipohyb: incidence krevních infekcí a cíle EU

Zdroj B, tabulky 5, 6 a 7 (odhadovaná incidence na 100 000 obyvatel,
základna 2019, cíl 2030 dle doporučení Rady EU 2023/C 220/01):

| ukazatel (ČR) | 2019 | 2024 | změna | trend | cíl ČR 2030 | stav |
|---|---|---|---|---|---|---|
| karbapenem-rezistentní *K. pneumoniae*, krevní infekce | 0,09 | **0,41** | **+355,6 %** (+34 případů) | ↑ statisticky významný | 0,09 (−2 %) | **4,5× nad cílem** |
| *E. coli* rezistentní k 3GC, krevní infekce | 6,56 | **8,83** | +34,6 % (+264 případů) | ↑ statisticky významný | 6,23 (−5 %) | nad cílem |
| MRSA, krevní infekce | 3,06 | **2,79** | −8,8 % (−22 případů) | bez významného trendu | 2,88 (−6 %) | **cíl splněn** |

ČR je podle zprávy jednou z 12 zemí, které už splnily svůj **MRSA** cíl
(zdroj B, sekce „Progress towards the EU targets on antimicrobial
resistance“).

Doplňkově (Atlas): podíl karbapenem-rezistentních izolátů *K. pneumoniae*
v ČR rostl 0,61 % (2019) → 2,16 % (2024), tj. 3,5×. Rostoucí incidence tedy
není jen artefakt většího počtu vyšetření.

## Legislativa / policy

- **Doporučení Rady EU 2023/C 220/01** ze dne **13. 6. 2023** o zintenzivnění
  opatření EU v boji proti antimikrobiální rezistenci v přístupu „jedno
  zdraví". Cíle do roku 2030 proti základně 2019, ověřeno verbatim na
  EUR-Lex 29. 8. 2026:
  - MRSA — snížit celkovou incidenci krevních infekcí **o 15 %**;
  - *E. coli* rezistentní k cefalosporinům 3. generace — **o 10 %**;
  - karbapenem-rezistentní *K. pneumoniae* — **o 5 %**.
  <https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=oj:JOC_2023_220_R_0001>
  (Pozn.: procenta v doporučení jsou cíle **pro EU jako celek**; národní
  cílové hodnoty v tabulkách 5–7 zprávy ECDC jsou z nich odvozené
  a u ČR činí −6 % MRSA, −5 % E. coli a −2 % K. pneumoniae.)
- **Národní antibiotický program (NAP)** — zřízen usnesením vlády
  **č. 595 ze 4. 5. 2009**, koordinuje ho SZÚ (Centrální koordinační
  skupina NAP), Komise pro antibiotickou politiku působí od roku 2003.
  Akční plány se podle SZÚ přijímají na **2–4leté** období a schvaluje je
  MZ ve spolupráci s MZe.
  <https://szu.gov.cz/temata-zdravi-a-bezpecnosti/narodni-antibioticky-program/>
- Akční plány, které koordinátor programu (SZÚ) zveřejňuje na stránce
  **Národní strategické dokumenty NAP**, jsou k 29. 8. 2026 právě dva:
  **AP NAP 2019–2022** a AP NAP 2011–2013. Nic novějšího tam není.
  <https://szu.gov.cz/tema/narodni-antibioticky-program/dokumenty-ke-stazeni/narodni-strategicke-dokumenty/>
- **Usnesení vlády ČR ze dne 28. ledna 2019 č. 75** — PDF staženo
  a strojově přečteno 29. 8. 2026, verbatim: *„Vláda I. schvaluje Akční
  plán Národního antibiotického programu České republiky na období
  2019-2022, obsažený v části III materiálu čj. 30/19 …; II. ukládá
  ministru zdravotnictví zajistit ve spolupráci s ministrem zemědělství
  realizaci úkolů uvedených v příloze 1 Akčního plánu."*
  <https://szu.gov.cz/wp-content/uploads/2023/06/usneseni_vlady_AP_NAP_2019_2022.pdf>
- **Redakce k 29. 8. 2026 nedohledala navazující akční plán** — stránka MZ
  `mzd.gov.cz/akcni-plan-narodniho-antibiotickeho-programu/` vrací 404,
  ve VeKLEP není žádný materiál s tímto názvem, a na stránce strategických
  dokumentů SZÚ nic novějšího než 2019–2022 není. Článek to formuluje jako
  **nedohledání, ne jako tvrzení, že plán neexistuje.**

  > **Nález fáze 5.** První verze tohoto rámce opírala údaj o akčním plánu
  > jen o snippet z vyhledávače nad stránkou `szu.cz/tema/akcni-plan-nap-2019-2022`,
  > která je dnes 404; `web.archive.org` je z prostředí agenta blokovaný
  > egress policy. Nezávislý průchod to zachytil jako porušení železného
  > pravidla a dohledal živý primární zdroj (viz dva body výše).

## Metodické výhrady, které článek musí uvést

1. **EARS-Net sleduje jen invazivní izoláty** — z krve a mozkomíšního moku.
   Není to obraz veškeré rezistence, ale její nejzávažnější části
   (zdroj B, popis metodiky).
2. **Kombinovaná rezistence počítá jen izoláty s kompletním vyšetřením**
   všech sledovaných tříd; izoláty s neúplnou citlivostí jsou vyloučené
   (zdroj B: *„combined resistance excludes isolates with incomplete AST
   information for the antimicrobial groups covered"*).
3. **Malé jmenovatele u Acinetobactera** — ČR 2024 jen **102 testovaných
   izolátů**, meziroční skoky (2021: 50,8 %, 2024: 20,6 %) jsou proto
   z velké části šum. Článek u tohoto patogenu nesmí interpretovat
   meziroční změnu jako trend.
4. **Pokrytí a intenzita hemokultivace v ČR.** Zpráva ECDC, tabulka 1:
   odhadované populační pokrytí ČR **70 %**, reprezentativnost
   geografická / nemocniční / izolátová shodně **High**, ale **frekvence
   hemokultur 23,4 setů na 1 000 pacientodnů** — šesté nejnižší z 26 zemí,
   které údaj vykázaly (níž jen LI 1,5, BG 12,2, LT 14,6, LV 20,1,
   HU 21,9), zatímco medián je kolem 58 a DK 265,8, PT 205,1, FI 188,7.
   Málo hemokultur znamená, že se část krevních infekcí vůbec nezachytí;
   ECDC sám nabádá číst data „mindful of ... variations in national blood
   culture rates". Odhadovaná incidence je proto spíš dolní mez.
   ECDC zároveň upozorňuje, že definice „setu" a „pacientodne" se mezi
   zeměmi liší — číslo se nesmí číst jako přesné mezinárodní srovnání.
5. **Rezistence k aminoglykosidům je podle EQA 2022 a 2024 v EARS-Net
   podhlášená** (zdroj B) — týká se i kombinované metriky, která
   aminoglykosidy obsahuje.

## Interní křížové odkazy

- Související články: `clanek-rezistence-antibiotik-mapa.html` (metrika
  lék po léku — přímý protějšek), `clanek-spotreba-antibiotik.html`,
  `clanek-antibiotika-access-aware.html`,
  `clanek-veterinarni-antibiotika-one-health.html`,
  `clanek-nosokomialni-infekce.html`, `clanek-rezistence-antibiotik.html`
- Kotevní indikátory: `rezistence_klebsiella_3gc`,
  `rezistence_klebsiella_fluorochinolony`,
  `rezistence_klebsiella_aminoglykosidy`, `rezistence_klebsiella_karbapenem`,
  `rezistence_pseudomonas_karbapenem`, `rezistence_pseudomonas_piptazo`,
  `rezistence_pseudomonas_ceftazidim`,
  `rezistence_pseudomonas_fluorochinolony`,
  `rezistence_pseudomonas_aminoglykosidy`,
  `rezistence_acinetobacter_karbapenem`, `rezistence_ecoli_3gc`,
  `rezistence_antibiotik_ecoli`, `rezistence_ecoli_aminoglykosidy`,
  `spotreba_antibiotik`
