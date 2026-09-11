# Datový rámec — sebevrazdy-validace-policejni-data

Všechny hodnoty ověřeny 11. 9. 2026 přímo z primárního zdroje. Nic není
převzato z WHO releasu, který byl pouze spouštěčem.

## Centrální KPI

- **Hlavní hodnota**: 1 561 zemřelých úmyslným sebepoškozením v ČR v roce 2024,
  o **308 (+24,6 %)** víc než v roce 2023 (1 253).
- **Primární zdroj**: ČSÚ, tisková zpráva *Nejčetnější příčiny smrti zůstávají
  v Česku nezměněny*, kód 134003-25, vydáno 22. 9. 2025, aktualizováno
  23. 9. 2025, staženo 11. 9. 2026.
  <https://csu.gov.cz/produkty/nejcetnejsi-priciny-smrti-zustavaji-v-cesku-nezmeneny>
  Doslova: *„V důsledku úmyslného sebepoškození v roce 2024 skonalo 1 561
  obyvatel Česka (1,4 % z úhrnu zemřelých), což bylo o čtvrtinu, resp. o 308
  osob, více než v roce 2023.“* a *„Nárůst počtu zemřelých sebevraždou byl
  z velké části zapříčiněn novou validací dat, kterou na základě údajů Policie
  ČR provedl Ústav zdravotnických informací a statistiky ČR u případů
  potenciálních sebevražd.“*
- **Klíčová výhrada zdroje** (ÚZIS, závěr analytické studie, doslova):
  *„Výše popsané změny však jsou důsledkem provedené validace, nikoliv nárůstem
  v intenzitě sebevražednosti jako takové.“*
- **Benchmark**: nepoužívá se mezinárodní benchmark centrálního KPI (absolutní
  počet není srovnatelný). Mezinárodní srovnání se dělá na standardizovaných
  mírách — viz sekce Mezinárodní kontext.
- **Časový kontext**: data za rok 2024, publikovaná 22. 9. 2025. Vlna za rok
  2025 v době psaní nevyšla.

## Sekundární hodnoty

Zdroj pro celou tuto sekci: **ÚZIS ČR**, *Validace počtu sebevražd v ČR v roce
2024 — srovnání počtu sebevražd podle statistiky ČSÚ/ÚZIS a evidence PČR
(analytická studie)*, NZIP dataset 2478, poslední aktualizace 22. 9. 2025,
staženo 11. 9. 2026.
<https://www.nzip.cz/data/2478-sebevrazdy-2024-analyticka-studie>

### Mechanismus validace

- Soubor od Policejního prezidia: **1 547 záznamů** o dokonaných sebevraždách.
- Napojeno a shodně evidováno jako sebevražda: **1 131** záznamů.
- Nenapojeno: 46 bez Listu o prohlídce zemřelého, 47 cizinci bez pobytu nebo
  jiný nesoulad.
- Napojeno, ale **odlišná příčina smrti: 323** → prověřeno.
- **Opraveno: 294.** U 29 zůstala odlišná příčina (9× přirozená příčina,
  14× událost nezjištěného úmyslu, 6× jiná vnější příčina).
- Opačný směr: **137** záznamů vedených jako sebevražda podle LPZ, které PP
  neevidovalo. Z toho 78 sebevraždou podle PP bylo (8 ve vězení či vazbě,
  10 evidováno jako pokus, 60 dohlášeno po uzávěrce), 11 bez záznamu u PP,
  **8 opraveno ze sebevraždy na nehodu**, u 40 rozpor trvá.
- Pitváno bylo **95 %** všech úmrtí evidovaných jako sebevražda (data za 2024).

### Tabulka 3 — rozpad 294 oprav podle původní příčiny smrti

| Původní příčina | MKN-10 | Počet |
|---|---|---|
| Oběšení nezjištěného úmyslu | Y20 | 59 |
| Střet chodce s vlakem, nehoda | V05 | 40 |
| Ostatní události nezjištěného úmyslu | — | 34 |
| Jiná než vnější příčina | — | 30 |
| Otrava nezjištěného úmyslu | Y10–Y19 | 26 |
| Pád, skok z výšky nezjištěného úmyslu | Y30 | 22 |
| Jiné vnější příčiny náhodných poranění | W26–W87 | 21 |
| Náhodný pád z výšky | W13–W19 | 18 |
| Jiné vnější příčiny náhodných poranění | X41–X59 | 18 |
| Výstřel ze střelné zbraně nezjištěného úmyslu | Y22 | 10 |
| Pád, skok před pohyblivý předmět nezjištěného úmyslu | Y31 | 10 |
| Jiné dopravní nehody | — | 6 |
| **Celkem** | | **294** |

Kontrolní součet přepočítán: 59+40+34+30+26+22+21+18+18+10+10+6 = **294** ✓

### Tabulka 1 — rozdíl mezi evidencí PP a ČSÚ (kódy X60–X84)

| Rok | Policie | ČSÚ | Rozdíl |
|---|---|---|---|
| 2010 | 1 831 | 1 502 | 329 |
| 2015 | 1 578 | 1 384 | 194 |
| 2019 | 1 386 | 1 191 | 195 |
| 2020 | 1 404 | 1 224 | 180 |
| 2021 | 1 438 | 1 221 | 217 |
| 2022 | 1 575 | 1 302 | 273 |
| 2023 | 1 532 | 1 250 | 282 |

Doslova ze studie: *„Rozdíl v obou zdrojích dat se až do roku 2023 pohyboval
cca od 150 do 300 případů ročně. Počet sebevražd dle statistiky příčin smrti
byl ve všech sledovaných letech nižší, počty jsou tedy podhodnocené a část
sebevražd ze statistiky uniká.“*

### Tabulka 4 — vývoj vybraných příčin (2023 → 2024)

| Příčina | 2023 | 2024 |
|---|---|---|
| Sebevraždy (X60–X84, Y87.0) | 1 253 | 1 561 |
| Chodec usmrcený vlakem (V05) | 95 | 51 |
| Události nezjištěného úmyslu celkem (Y10–Y34) | 576 | 494 |
| Oběšení, (u)škrcení a (za)dušení NU (Y20) | 51 | 13 |
| Pád, skok nebo strčení z výšky NU (Y30) | 36 | 18 |
| Neurčený případ NU (Y34) | 280 | 297 |
| Vnější příčiny celkem | 5 334 | 5 487 |

Delší řada Y10–Y34: 2010 359 · 2013 178 · 2016 208 · 2019 414 · 2021 579 ·
2022 615 · 2023 576 · 2024 494. Studie: *„počet úmrtí v důsledku události
nezjištěného úmyslu zhruba od roku 2016 vytrvale rostlo až do roku 2023.“*

### Tabulka 2 — kraje, průměr 2018–2022 (na 100 000)

| Kraj | Sebevraždy | Nezjištěný úmysl | Celkem |
|---|---|---|---|
| Olomoucký | 8,7 | 13,7 | 22,4 |
| Vysočina | 9,3 | 2,6 | 11,8 |
| Ústecký | 9,9 | 6,4 | 16,3 |
| Zlínský | 10,5 | 6,9 | 17,4 |
| Královéhradecký | 12,3 | 6,3 | 18,6 |
| Liberecký | 15,1 | 1,8 | 16,9 |
| **ČR** | **11,8** | **4,4** | **16,2** |

### Vintage — rozdíl mezi tabulkami (doložený, ne chyba)

| Rok | Tab. 1 (X60–X84) | Tab. 4 (X60–X84 + Y87.0) |
|---|---|---|
| 2014 | 1 488 | 1 489 |
| 2015 | 1 384 | 1 387 |
| 2016 | 1 316 | 1 318 |
| 2017 | 1 395 | 1 397 |
| 2023 | 1 250 | 1 253 |

WHO release uvádí pro 2023 hodnotu **1 249** bez uvedení zdroje. **Nepoužívá se.**

## Mezinárodní kontext

Zdroj: **Eurostat**, `hlth_cd_asdr2` (standardizovaná míra úmrtnosti, rezidenti),
unit RT, sex T, age TOTAL, rok 2023 (nejnovější dostupný), staženo přes
disseminační API 11. 9. 2026.

| Země | X60–X84 sebevraždy | Y10–Y34 nezjištěný úmysl |
|---|---|---|
| Slovensko | 6,52 | **16,36** |
| Lotyšsko | 14,02 | 7,98 |
| Rakousko | 13,98 | 5,71 |
| **Česko** | **11,59** | **5,29** |
| **EU27** | **10,37** | **2,45** |
| Německo | 11,38 | 2,20 |
| Slovinsko | 16,44 | 1,02 |
| Nizozemsko | 10,40 | 0,50 |
| Španělsko | 7,95 | 0,25 |
| Irsko | 8,88 | 0,23 |
| Itálie | 5,78 | **0,01** |

Česká řada Y10–Y34: 2018 3,12 · 2019 3,95 · 2020 4,21 · 2021 5,52 · 2022 5,77 ·
2023 5,29. Unijní řada: 2,21 · 2,37 · 2,40 · 2,15 · 2,28 · 2,45.

NUTS2 za rok 2023 (tentýž dataset):

| Region | Sebevraždy | Nezjištěný úmysl |
|---|---|---|
| Střední Morava | 7,12 | **13,45** |
| Moravskoslezsko | 11,41 | 11,93 |
| Praha | 12,00 | 4,52 |
| Severovýchod | 13,51 | 3,36 |
| Jihozápad | 12,79 | 1,75 |

**Methodology caveat**: Eurostat uvádí standardizované míry, ÚZIS a ČSÚ
absolutní počty za ČR — obojí se v článku nemíchá do jednoho srovnání.
Součet obou měr **není** míra sebevražednosti a v článku se nikde neprovádí.

## Evidence (ověřeno v PubMed 11. 9. 2026)

- *Úmrtí nezjištěného úmyslu mohou měnit pořadí regionů* ← **Auger N, Burrows S,
  Gamache P, Hamel D.** *Suicide in Canada: impact of injuries with undetermined
  intent on regional rankings.* Inj Prev. 2016;22(1):76–8.
  DOI 10.1136/injuryprev-2015-041613. PMID 26157108. Typ: Journal Article.
  Abstrakt doslova: *„suicide rates increased by up to 26.5% for men and 37.7%
  for women after including injuries with undetermined intent, shifting
  provincial rankings of suicide.“*
- *Rozdíly mezi zeměmi v míře nezjištěného úmyslu jsou řádové* ← **Snowdon J.**
  *Spain's suicide statistics: do we believe them?* Soc Psychiatry Psychiatr
  Epidemiol. 2021;56(5):721–729. DOI 10.1007/s00127-020-01948-z. PMID 32918553.
  Abstrakt doslova: *„its event of undetermined intent (EUI) death rate was 0.09
  (contrasting with E & W's 1.74).“*
- **Protinález 1** ← **Tøllefsen IM, Helweg-Larsen K, Thiblin I, et al.** *Are
  suicide deaths under-reported? Nationwide re-evaluations of 1800 deaths in
  Scandinavia.* BMJ Open. 2015;5(11):e009120. DOI 10.1136/bmjopen-2015-009120.
  PMID 26608638. Typ: **Validation Study**. Abstrakt doslova: *„reclassification
  did not increase the overall official suicide statistics of the 3 Scandinavian
  countries“*, přitom ale *„21% of the undetermined deaths were reclassified as
  suicides in the Swedish data set.“*
- **Protinález 2** ← **Schmeckenbecher J, Kapusta ND, Krausz RM, Emilian CA.**
  *Autopsy rates and the misclassification of suicide and accident deaths.*
  Eur J Epidemiol. 2024;39(10):1109–1126. DOI 10.1007/s10654-024-01142-4.
  PMID 39044107. Abstrakt doslova: *„suicides do not seem to be misclassified as
  undetermined deaths or ill-defined deaths.“*
- **Consensus kontrola**: dotaz *„suicide undercount misclassification deaths of
  undetermined intent national mortality statistics“* (medical_mode,
  exclude_preprints) → převaha evidence **nejednotná**. Vedle prací dokládajících
  podhodnocení stojí Tøllefsen 2015 a Schmeckenbecher 2024 s opačným nálezem.
  Článek proto obecné tvrzení o podhodnocení **nevyslovuje** a rozpor uvádí.

## Interní křížové odkazy

- Související články: `clanek-sebevrazdy-dusevni-zdravi`,
  `clanek-sebevrazdy-mladistvi`, `clanek-pokusy-o-sebevrazdu-hospitalizace`,
  `clanek-epidemiologie-1-proc-verit-cislum`, `clanek-lecitelna-mortalita`,
  `clanek-centra-dusevniho-zdravi`
- Související indikátory: `sebevrazdy_per_100k`, `sebevrazdy_mladistvi_15_19`,
  `hospitalizace_pokus_o_sebevrazdu`, `prevalence_dusevni_poruchy_dospeli`,
  `centra_dusevniho_zdravi_per_100k`
