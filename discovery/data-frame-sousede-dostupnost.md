# Datový rámec — sousede-dostupnost

Všechna čísla stažena a ověřena **16. 8. 2026** přímými dotazy na Eurostat
REST API (`ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/…`).

## Centrální KPI
- Hlavní hodnota: **0,3 %** osob 16+ s neuspokojenou potřebou lékařského
  vyšetření z důvodů cena / vzdálenost / čekací listina (ČR, 2025)
- Primární zdroj: Eurostat `hlth_silc_08` (EU-SILC), reason=TXP_TFAR_WLIST,
  sex=T, age=Y_GE16, staženo 16. 8. 2026
- Benchmark: EU27 2,4 % · DE 1,0 % · AT 0,9 % · PL 2,9 % · SK 1,1 % (2025)
- Časový kontext: vlna EU-SILC 2025 (nejnovější)

## Sekundární hodnoty

### Praktikující lékaři na 100 000 obyvatel (Eurostat `hlth_rs_prs2`, med_spec=PHYS, unit=P_HTHAB, updated 13. 7. 2026)
| Země | 2021 | 2024 | Δ 2021→24 | koncept |
|---|---|---|---|---|
| CZ | 425,59 | 429,41 | +0,9 % | PRACT (2022 flag b — break) |
| DE | 452,97 | 475,40 | +5,0 % | PRACT |
| AT | 540,91 | 563,51 | +4,2 % | PRACT (2025: 576,86) |
| PL | 351,24 | 386,20 | +10,0 % | PRACT |
| SK | 368,02 | 394,74 | +7,3 % | **PACT** (professionally active, flag d — definition differs) |

EU27 agregát v datasetu není publikován.

### Praktikující sestry na 100 000 obyvatel (tamtéž, med_spec=NRS)
| Země | 2021 | 2024 | Δ | koncept |
|---|---|---|---|---|
| CZ | 827,86 | 799,26 | **−3,5 %** | PRACT (2022 flag b) |
| DE | 1203,18 | 1251,25 | +4,0 % | PRACT |
| AT | 1065,08e | 1015,07e | −4,7 % | PRACT, flag e (odhad) |
| PL | 580,11 | 601,44 | +3,7 % | PRACT |
| SK | 572,58d | 579,02d | +1,1 % | PACT, flag d |

### Neuspokojená potřeba — jen čekací listina (hlth_silc_08, reason=WLIST, 2025)
EU27 1,2 % · CZ 0,2 % · DE 0,8 % · AT 0,6 % · PL 2,2 % · SK 1,0 %
Trend DE (TXP_TFAR_WLIST): 0,3 (2022) → 1,0 (2025) — zřetelné zhoršení.
Trend SK: 3,2 (2023) → 1,1 (2025) — zlepšení. CZ: 0,2 → 0,5 (2024) → 0,3.

### Nemocniční lůžka na 100 000 obyvatel (Eurostat `hlth_rs_bds1`, 2024)
| Země | celkem | z toho akutní (curative) | dlouhodobá v nemocnicích |
|---|---|---|---|
| EU27 | 507,35 | — | — |
| CZ | 639,48 | 398,62 | 184,90 |
| DE | 758,59 | 566,18 | 0,00 (vykazuje mimo nemocnice) |
| AT | 655,11 | 472,13 | 51,38 |
| PL | 627,49 | 428,78 | 3,68 |
| SK | 557,67 | 463,42 | 70,73 |

ČR: lůžek celkem o 26 % nad průměrem EU27, ale **akutních nejméně z pětky**;
29 % českého lůžkového fondu je dlouhodobá péče v nemocnicích (LDN) —
strukturální specifikum, u sousedů 0–13 %.

## Legislativa
— (nerelevantní pro tento díl)

## Mezinárodní kontext — methodology caveats (POVINNÉ v textu)
1. SK personál = professionally active (PACT), ne practising → mírně
   nadhodnocené proti PRACT zemím; flag d.
2. AT sestry = odhad (flag e).
3. DE dlouhodobá lůžka v nemocnicích = 0 (vede je mimo nemocniční sektor)
   → mezinárodní srovnání jen přes celkové/akutní lůžka.
4. Národní registr ÚZIS (dashboard: lekari_per_1000 4,2/1000; sestry_per_1000
   9,0/1000, rok 2024) se od Eurostatu liší vymezením kategorií — článek pro
   mezinárodní srovnání používá výhradně Eurostat.

## Interní křížové odkazy
- Články: starnuti-lekaru, platy-sester, platy-lekaru (draft), absolventi-osetrovatelstvi,
  mri-vysetreni-cesko, hospitalizujeme-nejvic, platba-z-kapsy, casna-operace-zlomeniny-kycle
- Indikátory: lekari_per_1000, sestry_per_1000, unmet_need_medical, cekaci_doby_specialist
