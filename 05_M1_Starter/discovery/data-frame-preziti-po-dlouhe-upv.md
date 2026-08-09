# Datový rámec — preziti-po-dlouhe-upv

Všechna čísla replikována 9. 8. 2026 z PDF analytické studie ÚZIS/NRIP
„Pilotní přehled vybraných indikátorů intenzivní péče a anesteziologie
2010–2024" (NZIP dataset 2708, publ. 7. 4. 2026, zpracováno k 1. 2. 2026,
zdroj NRHZS):
- landing: https://www.nzip.cz/data/2708-indikatory-intenzivni-pece-anesteziologie-2010-2024-analyticka-studie
- PDF: https://www.nzip.cz/data/nrip/analyticke-studie/indikatory-ip-ap-2024/indikatory-ip-ap-2024.pdf

## Centrální KPI
- **Přežití 1 rok po příjmu na ARO s UPV ≥ 2 dny (18+): 51,2 %**
  (zemřelo 15 279 z 31 294 pacientů = 48,8 %; souhrn kohort 2022+2023,
  sekce „Trajektorie pacientů: stav rok po příjmu")
- Benchmark: žádný (OECD/Eurostat srovnatelný indikátor nepublikují —
  viz benchmark_source metodické karty)
- Časový kontext: kohorty přijaté 2022+2023, stav 1 rok po příjmu;
  kohorta 2024 bez kompletního follow-upu (studie výslovně)

## Věkový gradient přežití (UPV ≥ 2 dny, Σ 2022+2023, tamtéž)
- 65–74 let: přežití 48,5 % (zemřelo 5 408 z 10 511 = 51,5 %)
- 75–84 let: přežití 34,7 % (zemřelo 4 890 ze 7 488 = 65,3 %)
- 85+ let: přežití 16,9 % (zemřelo 959 z 1 154 = 83,1 %)

## Trajektorie: kde jsou pacienti rok po příjmu (UPV ≥ 2 dny, 18+, Σ 2022+2023)
- doma bez příspěvku na péči (PnP): 11 683 (37,3 %)
- doma, PnP I.–II. stupně: 1 549 (4,9 %)
- doma, PnP III.–IV. stupně: 1 302 (4,2 %)
- hospitalizace / pobytová sociální služba, bez PnP nebo PnP I.–II.: 1 024 (3,3 %)
- hospitalizace / pobytová sociální služba, PnP III.–IV.: 457 (1,5 %)
- zemřel: 15 279 (48,8 %)
(kontrolní součet 100,0 %)

## Kontext: všichni pacienti ARO 18+ (Σ 2022+2023, tamtéž)
- N = 56 177; zemřelo 20 675 (36,8 %); doma bez PnP 28 509 (50,7 %)
- 85+ na ARO celkem: N = 2 250, zemřelo 1 593 (70,8 %), doma bez PnP 265 (11,8 %)

## Case-based roční řada (hospitalizační případy, všechny věkové skupiny,
## UPV ≥ 2 dny; NRHZS — POZOR: jiný jmenovatel než patient-based headline)
- Hospitalizační mortalita: 2010: 30,8 % (4 206/13 661) → 2019: 20,9 %
  → 2023: 16,9 % (3 629/21 464) → 2024: 17,0 % (3 727/21 922)
- Mortalita do 3 měsíců od příjmu: 2010: 47,1 % → 2023: 32,5 %
- Mortalita do 1 roku od příjmu: 2010: 54,3 % (7 419/13 661) → 2019: 51,2 %
  → 2021: 52,0 % → 2022: 46,3 % → 2023: 40,1 % (8 609/21 464); 2024 bez
  kompletního follow-upu
- UPV ≥ 11 dnů, mortalita do 1 roku: 2010: 64,5 % → 2023: 51,3 %

## Objemové trendy (hospitalizační případy s UPV ≥ 2 dny dle věku, NRHZS)
- 19–64 let: 2010: 5 681 → 2024: 7 524 (+32,4 %)
- 65–84 let: 2010: 5 970 → 2024: 10 810 (+81,1 %)
- 85+ let: 2010: 721 → 2024: 599 (−16,9 %)

## Interní křížové odkazy
- Indikátory: preziti_1rok_po_upv_2d_pct (opraven v tomto běhu),
  luzka_jip_per_100k (44,61 / 100 000 obyv., 2023, OECD benchmark 18 —
  verified, OECD Health Statistics data-explorer, fetched 3. 8. 2026)
- Související články: clanek-prazdna-luzka-efektivita.html (kapacity),
  clanek-demence-prevalence.html (křehcí senioři), drafts/clanek-reforma-intenzivni-pece-2026.html
  (NIKEZ reforma — dosud draft mimo articles.json)

## Methodology caveats (do článku)
1. Patient-based (31 294 pacientů 18+, Σ kohort 2022+2023) vs. case-based
   (hospitalizační případy, všechny věky, po letech) — nekombinovat v jednom
   grafu; v článku prezentovat odděleně s popisky.
2. Hodnoty NEJSOU rok 2024 — kohorta 2024 nemá roční follow-up.
3. Trajektorie „doma bez PnP" ≠ „plné zdraví" — PnP je proxy závislosti,
   nikoli klinického stavu; nespekulovat nad rámec studie.
