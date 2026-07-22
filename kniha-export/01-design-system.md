# Skóre zdravotnictví 2026 — Grafický design systém
## Pro sazbu v Affinity Publisher

> Tento dokument je **závazný vizuální manuál knihy**. Sazeč podle něj založí
> master pages, paragraph a character styles, tabulkové styly a barevnou paletu.
> Všechno navazuje na značku **HSPA Kompas** z webu skorezdravotnictvi.cz.
> Odchylky konzultuj s brandem v `docs/visual-components.md §0` (v repu).

---

## 0. Řídící princip

Kniha je **tiskovina jako přesný přístroj**: klidná typografická plocha, hodně
bílého (spíš krémového) prostoru, data jako hrdina. Estetika navazuje na web:
*„papír a inkoust"* — teplý krémový podklad, tmavě hnědočerný text, a **červená
jen jako hrot střelky** (signál, akcent), nikdy jako plošná dekorace.

**Tři pravidla, která nesmí padnout:**
1. **Červená patří jen signálu.** Špatný stav, hrot kompasu, jeden zvýrazněný
   údaj na dvoustraně. Nikdy ne plochy, nadpisy paušálně, rámečky.
2. **Data mají navrch.** Grafika slouží číslu, ne naopak. Žádné 3D, stíny,
   přechody, dekorativní ikony.
3. **Konzistence napříč knihou.** Jeden graf = jeden vizuální jazyk (viz
   `03-grafy-spec.md`). Čtenář se učí číst jednou.

---

## 1. Formát a vazba

| Parametr | Hodnota | Poznámka |
|---|---|---|
| **Formát** | **190 × 250 mm** (na výšku) | Blízko B5, prostor pro grafy i pohodlný sazební obrazec; digitálně i tiskově přívětivý |
| Alternativa | 170 × 240 mm | Pokud se preferuje štíhlejší kniha |
| Vazba | V2 (lepená) / V8 (šitá) | Dle nákladu; sazba počítá s hřbetem |
| Barevnost | 4/4 CMYK (tisk) + RGB varianta pro PDF | Paleta je tisknutelná (viz §3) |
| Rozsah | 200–320 stran | Dle finální selekce v `02-obsah-struktura.md` |

## 2. Sazební obrazec (grid)

Základ je **modulární grid 12 sloupců** s výrazným vnějším okrajem na
marginálie (poznámky, definice, mini-scorecardy) — tak jako web má boční „vpichy".

| Prvek | Hodnota |
|---|---|
| Horní okraj | 18 mm |
| Dolní okraj | 20 mm (místo na paginaci + živé záhlaví) |
| Vnitřní okraj (u hřbetu) | 20 mm |
| **Vnější okraj (marginálie)** | **34 mm** — sem patří okrajové definice, ikony dimenzí, mini-signály |
| Sloupce | 12, mezera (gutter) 4 mm |
| Základní sazba textu | 7 vnitřních sloupců (hlavní blok) |
| Marginální sloupec | 3 vnější sloupce |
| Baseline grid | 12 pt (řádkový rejstřík — vše se řídí od něj) |

**Typy stránek (master pages):**
- **A — Textová** (běžná strana článku): hlavní blok + marginálie
- **B — Dvojstrana s grafem** (graf přes hlavní blok, text v marginu nebo protistraně)
- **C — Kapitolová předsádka** (celostránkový titul dílu/kapitoly, barevná dimenzní plocha jako tenký prvek)
- **D — Scorecard / datová strana** (mřížka indikátorů)
- **E — Front/back matter** (tiráž, obsah, zdroje, glosář, rejstřík — užší sazba)

## 3. Barevná paleta

**Základ (papír & inkoust) — přebíráno 1:1 z webu:**

| Token | HEX | CMYK (orient.) | Použití |
|---|---|---|---|
| Papír | `#FBF8F1` | 2 / 2 / 8 / 0 | Podklad všech stran |
| Papír 2 | `#F3EEE2` | 4 / 4 / 14 / 0 | Boxy, jemné plochy, tabulkové pruhy |
| Inkoust | `#1F1A14` | 60 / 60 / 70 / 75 | Veškerý text, čáry, osy grafů |
| Inkoust tlumený | `#5E574B` (≈ ink 66 %) | — | Popisky, marginálie, sekundární text |
| **Signální červená** | **`#B8361E`** | 20 / 90 / 95 / 10 | Hrot kompasu, signál „bad", 1 akcent/dvojstrana |

**Signální barvy (stav indikátoru) — používat úsporně, jen v legendě/scorecardech:**

| Signál | HEX | Význam |
|---|---|---|
| good | `#2F6B1F` | Lepší než benchmark |
| warn | `#A05A08` | Kolem benchmarku |
| bad | `#B8361E` | Horší než benchmark |
| neutral | `#6B6357` | Bez benchmarku / kontextové |

**6 dimenzních barev (barevné kódování dílů/kapitol — jako tenké prvky, ne plochy):**

| Dimenze | HEX | Kód dílu |
|---|---|---|
| Zdraví | `#2F6D4F` | I |
| Dostupnost | `#2C5A8A` | II |
| Kvalita | `#88531F` | III |
| Bezpečnost | `#9C3450` | IV |
| Efektivita | `#5F4A8C` | V |
| Spravedlnost | `#2C7A87` | VI |

> Dimenzní barva se objevuje jen jako **tenký akcent**: číslo dílu, linka v
> záhlaví, tečka u indikátoru. Nikdy jako plná plocha strany. Sytost snížit pro
> tisk (kniha nesmí být pestrá — je krémová s akcenty).

## 4. Typografie

Doporučení stojí na **jednom serifovém písmu pro čtený text** + **jednom
grotesku pro data, popisky a nadpisy scorecardů**. Konkrétní licencované řezy
navrhne sázecí session přes Adobe `font_recommend` — níže je **charakteristika
a fallback**, ne uzamčená volba.

| Role | Charakter | Konkrétní návrh | Fallback |
|---|---|---|---|
| **Čtený text (body)** | Humanistická serif, dobrá čitelnost v malém, český háček/čárka bez kompromisů | *Source Serif 4*, *Lora*, *Noto Serif* | Georgia |
| **Nadpisy dílů/kapitol** | Výrazná serif nebo kontrastní display serif | *Source Serif 4 SemiBold*, *Fraunces* | — |
| **Data / grotesk** | Neutrální grotesk s tabulkovými číslicemi (tabular figures!) | *Inter*, *Source Sans 3*, *IBM Plex Sans* | Arial |
| **Popisky grafů, marginálie** | Tentýž grotesk, menší, tlumený inkoust | *Inter* | — |
| **Číslice v grafech/tabulkách** | **Tabular (stejná šířka) figures povinné** | — | — |

**Velikostní stupnice (na baseline gridu 12 pt):**

| Styl | Velikost / prokl. | Poznámka |
|---|---|---|
| Body | 9,5 / 13 pt | Hlavní čtený text |
| Body lead (perex) | 11 / 15 pt | Úvod článku/kapitoly |
| H1 díl | 32–40 pt | Kapitolová předsádka (master C) |
| H2 kapitola | 20–24 pt | |
| H3 sekce | 13 / 16 pt, grotesk semibold | |
| Marginálie | 8 / 11 pt, grotesk, tlumený | Definice, poznámky |
| Popisek grafu | 7,5 / 10 pt, grotesk | |
| Zdroj pod grafem | 7 pt, grotesk, tlumený | Prefix „Zdroj: " |
| Paginace / živé záhlaví | 8 pt, grotesk | |

**Sazební pravidla:** vlajková nebo bloková sazba (rozhodnout jednotně — doporučuji
**bloková s pečlivým dělením**), české uvozovky „ ", pomlčka –, neoddělovat
předložky (nezl. mezery), řádkový rejstřík dodržet i u boxů.

## 5. Opakující se komponenty (→ paragraph/object styles v Affinity)

Web má ustálenou sadu „vpichů". Kniha je přebírá jako **object styles**:

| Web (`.av-*`) | Kniha — komponenta | Popis |
|---|---|---|
| Scorecard | **Karta indikátoru** | Rámeček: název, hodnota velká tabular, jednotka, rok, signální tečka, benchmark OECD/EU, mini-trend (sparkline). Standardní stavební kámen datových stran. |
| `.av-counter` | **Velké číslo** | Jedno klíčové číslo přes marginálii nebo box, s krátkým popiskem. |
| `.av-timeline` | **Časová osa** | Horizontální linka s milníky (reformy, zákony). |
| `.av-bar` | **Sloupcový/pruhový graf** | Viz `03-grafy-spec.md`. |
| `.av-table` | **Datová tabulka** | Tabular figures, jemné linky, pruhování papír2. |
| `.av-flow` | **Schéma toku** | Financování, cesta pacienta — statické blokové schéma. |
| Glossary inline | **Okrajová definice** | Termín tučně + definice v marginu (mísot inline rozbalení na webu). |
| Audit banner | **Poznámka o ověření** | Diskrétní marginální značka „Ověřeno / Ilustrativní" (viz metodika). |
| Model systému / hry | **Statická infografika + QR** | Interaktivní → tištěná mapa/schéma + QR na živou verzi. |

**Boxy (asides) — 4 typy, vizuálně rozlišené jen jemně:**
1. **Kontext / vysvětlivka** (explainer) — box papír2, bez červené.
2. **Co s tím (páka)** — box s tenkou dimenzní linkou vlevo; „co může systém udělat".
3. **Zdroj / jak to víme** — malý box, grotesk, odkaz na dataset + QR.
4. **Klíčové číslo** — velké číslo, jediné místo, kde smí být červená jako akcent.

## 6. Obálka a brand

- **Titulní strana:** HSPA Kompas jako centrální motiv (stupnice, index ▲, červený
  hrot střelky). Kompas je jediné místo s výraznou červenou. Krémový podklad,
  tmavý inkoust, velký název „Skóre zdravotnictví **2026**".
- **Zadní strana:** jedna silná teze + 4–6 klíčových čísel roku (mini-scorecard),
  QR na web, tiráž iniciativy.
- **Hřbet:** název + rok + kompas-ikona.
- **Předsádky:** jemný kompasový pattern (tenké linky), bez barvy.
- **Kanonické assety kompasu:** `05_M1_Starter/assets/brand/` (PNG),
  SVG geometrie viz `o-projektu.html` (`.brand-symbol-mark`).
- **Pravidlo:** červená = jen hrot střelky. Zbytek kompasu je inkoust.

## 7. Živá záhlaví, paginace, orientace

- **Živé záhlaví (verso):** název dílu (dimenze). **Recto:** název kapitoly/článku.
- **Paginace:** vnější dolní roh, grotesk 8 pt, u čísla dílu tenká dimenzní tečka.
- **Barevný index na ořezu (volitelně):** tenký dimenzní proužek na vnějším ořezu
  strany podle dílu — čtenář listováním najde díl. (Levné, funkční, elegantní.)

## 8. Přístupnost a tisk

- Kontrast textu na papíru ≥ 7:1 (inkoust na krému splňuje).
- Nespoléhat na barvu samotnou: signály mají vždy i **tvar/popisek** (▲ good,
  ● warn, ▼ bad) — kniha musí fungovat i černobíle a pro barvoslepé.
- Grafy: min. velikost popisku 7 pt, osy vždy popsané, jednotky vždy uvedené.
- CMYK profil: ISO Coated v2 (nebo dle tiskárny); červená `#B8361E` ověřit na
  nátisku (neposunout do oranžova).

---

### Předání do Affinity — co z tohoto dokumentu vzniká
1. **Barevná paleta** (globální swatche): 5 základních + 4 signální + 6 dimenzních.
2. **Paragraph styles:** body, lead, H1 díl, H2 kap, H3, marginálie, popisek, zdroj.
3. **Character styles:** tabular figures, termín (tučně), signál (barevný).
4. **Object styles:** karta indikátoru, 4 typy boxů, graf-rámec, QR blok.
5. **Master pages A–E** dle §2.
6. **Table styles:** datová tabulka (tabular, pruhy papír2, linky inkoust 0,3 pt).

→ Postup krok za krokem viz `README.md`.
