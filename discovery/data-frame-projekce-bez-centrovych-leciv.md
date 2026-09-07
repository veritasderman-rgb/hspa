# Datový rámec — projekce-bez-centrovych-leciv

Všechna čísla níž byla ověřena **7. 9. 2026** přímo z primárního souboru
(PDF ÚZIS, XLSX datových souhrnů NZIP, text vyhlášky ve Sbírce). Agregace nad
XLSX jsem počítal sám, ne přebíral z backlogu ani z metodických karet.

## Centrální KPI

- **Hlavní hodnota:** 1 014 mld Kč — celkové výdaje z v. z. p. v roce 2040 podle
  populační varianty modelu ÚZIS, **bez centrových léčiv**.
- **Primární zdroj:** ÚZIS ČR, *Predikce výdajů z veřejného zdravotního pojištění*,
  analytický report projektu „Konstrukce modelů pro predikci regionálních potřeb
  a dostupnosti zdravotní péče…" (CZ.03.02.02/00/22_046/0002180), **verze 2.0,
  17. 2. 2025**, hlavní autorka Ing. Markéta Bartůňková, spoluautoři T. Pavlík,
  Z. Bortlíček, A. Krbušek, J. Zdražil, L. Dušek.
  <https://www.uzis.cz/res/file/projekty/modely-predikce/predikce-vzp-vydaje.pdf>
  (staženo 7. 9. 2026, kap. 9.4, s. 34).
- **Protipól KPI:** 39,81 mld Kč — skutečné úhrady za centrové léky v roce 2024,
  tedy položka, kterou žádná z variant projekce nemodeluje.
- **Časový kontext:** model běží na datech NRHZS 2010–2023, predikuje 2024–2040.

## Tři varianty modelu (kap. 9, s. 32–34) — všechny bez centrových léčiv

| Varianta | Co zohledňuje | Nárůst 2023→2040 | Celkem 2040 |
|---|---|---|---|
| základní | inflace + objem platů a mezd dle makropredikce MF ČR ze srpna 2024 | +414 mld Kč / **+98 %** | **836 mld Kč** |
| produkční | navíc pozorovaný trend produkce 2022/2023 (koef. růstu max. 0,5 %) | +527 mld Kč / **+125 %** | **949 mld Kč** |
| populační (střední) | navíc demografická projekce ČSÚ | +592 mld Kč / **+140 %** | **1 014 mld Kč** |

- Populační varianta, nízká demografická větev: +560 mld Kč (+133 %); vysoká:
  +610 mld Kč (+144 %).
- Rozpad základní varianty: lůžková péče +112 %, ambulantní segment +118,6 mld Kč
  (+97 %), segmenty mimo ambulantní a lůžkový +55 %.
- Rozpad produkční varianty: lůžková +131 %, ambulantní +113 %, ostatní +126 %
  (nárůst tažený hlavně sub-segmentem léků na recept).
- Demografické vstupy populační varianty: do 2040 pokles obyvatel o cca 113 tis.
  (mezní hodnoty −532 tis. až +217 tis.), růst průměrného věku o 3,6 roku,
  +33 mil. člověkoroků ve střední variantě.

**Doslovná citace důvodu vyloučení (s. 34):** „prezentované varianty nákladového
modelu nekalkulují s tzv. centrovými léčivy, které představují další výraznou
nákladovou položku veřejného zdravotního pojištění. Důvodem jsou výrazné nejistoty
v modelování nákladů na centrové léky v delším časovém horizontu, což souvisí
dramatickým rozšiřováním indikací a nepredikovatelnou generifikací těchto preparátů."

**Doslovná citace ze závěru kap. 10 (s. 43):** „Na rozdíl od predikcí výdajů na
ambulantní, lůžkovou a ostatní zdravotní péči je možné predikce nákladů na tzv.
centrová léčiva spolehlivě vytvořit pouze na několik málo let dopředu."

## Dopočet základny (aritmetická identita ze dvou primárních zdrojů)

- 836 − 414 = **~422 mld Kč** = základna projekce pro rok 2023.
- OIS-11-24, součet všech segmentů za 2023 bez dvojzápočtu 1.7.1 = **456,07 mld Kč**
  (spočteno z XLSX, viz níž).
- Podsegmenty centrových léčiv 2023: 2.1.4 (lůžkoví poskytovatelé) 30,80 mld
  + 1.7.1 (ambulantní specialisté) 2,96 mld = **33,75 mld Kč**.
- 456,07 − 33,75 = **422,32 mld Kč** → shoda s dopočtenou základnou do 0,1 %.
  Potvrzuje, že projekce startuje ze systému *po* odečtení centrových léčiv.

## Tři různá čísla ÚZIS pro tutéž věc (rok 2023)

| Zdroj | Definice | 2022 | 2023 | 2024 |
|---|---|---|---|---|
| OIS-11-06 *Centrové léky* | 18 terapeutických oblastí, NRHZS | 31,72 | **35,90** | **39,81** |
| OIS-11-24 *Náklady dle segmentů* | podsegmenty ZPP 2.1.4 + 1.7.1 | — | **33,75** | 37,54 |
| Predikce výdajů, tab. 4 | segmenty dle úhradové vyhlášky 2025 | 27,62 | **32,11** | 35,51 (predikce) |

Rozptyl 2023: **32,11 – 35,90 mld Kč**, tedy 3,79 mld Kč (11,8 % nejnižší hodnoty)
mezi třemi publikacemi téže instituce za týž rok. **Tempo se ale neliší:**
OIS-11-06 2022→2024 +25,5 % (≈ +12,1 % ročně), tab. 4 predikce 2023→2025 +26,9 %,
ZPP podsegmenty 2023→2024 +11,2 %.

**Methodology caveat, který musí být v textu:** hodnoty ze tří sad se nesmí míchat
v jedné časové řadě ani použít jako „číslo vs. benchmark". Každá tabulka v článku
drží jednu definici.

## Sekundární hodnoty (všechny ověřené)

- Podíl centrových léků na systému 2023: 35,90 / 456,07 = **7,9 %** (definice
  OIS-11-06); 33,75 / 456,07 = 7,4 % (definice ZPP).
- Tempo celého systému 2023→2024 (OIS-11-24): 456,07 → 504,80 mld Kč = **+10,7 %**;
  centrová léčiva ve stejné sadě +11,2 %. **Netvrdit, že jde o nejrychleji
  rostoucí položku systému** — roste zhruba tempem celku. (Nejrychleji rostoucí je
  jen v rámci lékového účtu: segment 6 = léky na recept rostl 45,64 → 47,81 mld,
  tj. +4,8 %.)
- Predikce ÚZIS pro rok 2025 (tab. 4, s. 43): epidemiologická predikce
  40 215 453 tis. Kč + horizon scanning 2 119 780 tis. Kč = **40 759 689 tis. Kč
  (40,76 mld)**, tj. +26,93 % proti reálným nákladům 2023.
- Horizon scanning: nové indikace „jen v roce 2025 budou generovat více než
  **5,2 %** celkového objemu nákladů na centrovou péči" (s. 41).
- Z predikce >40 mld Kč na rok 2025 má „téměř polovina" připadnout na onkologii
  a hematoonkologii (**cca 19 mld Kč**, s. 43).
- OIS-11-06 2024, největší oblasti: onkologie – solidní nádory **10,87 mld Kč**,
  hemato(onko)logie **6,18 mld Kč** (vlastní součet přes 7 pojišťoven).
- Unikátní pacienti 2024: součet přes oblasti a pojišťovny **148 831** — je to
  **horní odhad**, jeden pacient může být veden ve více oblastech.

## Legislativa

- **Zákon č. 48/1997 Sb., § 39d** — „Zásady pro úhradu vysoce inovativních léčivých
  přípravků": SÚKL rozhoduje o výši a podmínkách **dočasné** úhrady vysoce
  inovativního přípravku, je-li to ve veřejném zájmu podle § 17 odst. 2.
  <https://www.zakonyprolidi.cz/cs/1997-48#p39d> (ověřeno v textu zákona 7. 9. 2026).
- **Vyhláška č. 432/2025 Sb.** (úhradová vyhláška pro rok 2026), **příloha č. 15**
  „Úhrada některých léčivých přípravků podle § 5 odst. 1 a § 7":
  - bod 1: týká se přípravků označených symbolem **„S" podle § 39 odst. 1 vyhlášky
    č. 376/2011 Sb.** — to je legální definice centrového léku.
  - bod 2: **carve-out** — HIV/AIDS, spinální svalová atrofie, cystická fibróza,
    hereditární angioedém, profylaxe RSV u dětí, ATC M09AX09 a přípravky podané
    pojištěncům do 18 let se hradí v jednotkové ceně a **do stropu podle bodu 3
    nevstupují**.
  - bod 3: strop ÚHR_CL,2026 = **min** (Σ Produkce_2024 × INU × ICS ;
    Σ Produkce_2026 × ICS × IZP_CL), kde IZP_CL = min(1; arctg-výraz s parametry
    1,075 / 2,75 / 1,1926). Skupiny a) až r) odpovídají terapeutickým oblastem
    OIS-11-06.
  - bod 4: index navýšení úhrady (INU) per skupina — nejvyšší **Dýchací soustava 1
    (astma, CHOPN) 1,70**, Oběhový systém 1,62, Hepatologie 1,55, Ostatní 1,50;
    nejnižší **Oftalmologie 1,05**, Neurologie 2 (roztroušená skleróza) 1,10,
    Infekce 1,11. Index cenové slevy (ICS) nejnižší u Dýchací soustavy 2 (0,87),
    Revmatologie a Trávicí soustavy (0,90).
  <https://www.zakonyprolidi.cz/cs/2025-432> (text přílohy ověřen 7. 9. 2026).

## Mezinárodní kontext

Vynechán záměrně. Srovnatelná definice „centrového léku" (národní symbol „S")
v OECD ani Eurostatu neexistuje; dvojice „ČR vs. OECD" by porušila zákaz párovat
čísla z různých metodik.

## Interní křížové odkazy

- Články: `clanek-centrove-leky-2026` (objem a struktura centrové léčby),
  `clanek-financovani-segmenty-2026` (rozpad 508 mld po segmentech; nese základní
  variantu +414 mld / +98 %, ale ne ostatní varianty ani vyloučení),
  `clanek-narok-pojistence-2-demograficky-tlak` (demografický tlak),
  `clanek-deficit-vzp-2026`, `clanek-presna-medicina-solidarita`.
- Indikátory: `naklady_centrove_leky_total`, `podil_vydaje_leky`,
  `uhrada_zp_per_pojistenec`, `podil_vydaje_luzkova_pece`.

## Co článek NESMÍ udělat

1. Extrapolovat centrová léčiva do roku 2040 vlastním výpočtem — ÚZIS sám říká,
   že to spolehlivě nejde. Zdrženlivost je pointa textu, ne jeho slabina.
2. Sčítat nebo srovnávat hodnoty napříč třemi definičními sadami.
3. Tvrdit, že centrová léčiva jsou nejrychleji rostoucí položkou systému.
4. Interpretovat strop v příloze 15 jako „zastropování léčby" — je to strop
   **úhrady poskytovateli**, ne limit indikace.
