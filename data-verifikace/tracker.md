# Tracker verifikace — /dohodovaci-rizeni vs. NZIP XLS

> Portálová data: `data/dohodovaci-rizeni.json` z produkce https://www.hspa-cesko.cz/dohodovaci-rizeni
> (soubor není v repu — produkce je před repozitářem). Snapshot: `nzip-cache/portal-dohodovaci-rizeni.json`.
> XLSX zdroj každé sady = `source.latest_file`, viz `nzip-mapovani.md`. Verifikace je READ-ONLY.

Stav: **12 / 44 PASS** · TODO 31 · PASS 12 · FAIL 0 · BLOCKED 1

| # | id | dimenze | status | hodnota_portal | hodnota_nzip | list+buňka | poznámka |
|---|---|---|---|---|---|---|---|
| 1 | nr-02-01 | d9 Doplňkové registry a otevřená data | PASS | 210340 úvazků (2024) | 210340,32 úvazků | Kraje!F7 | Portál 210340 = zaokrouhlení XLSX 210340,32 (řádek ČR · Celkem odbornosti/typy/kategorie/subkategorie, sloupec Celkem). Jednotka úvazky OK. XLSX „stav k 31.12.2023', edice 2024-01 — portál uvádí rok 2024 (rok edice, ne rok stavu dat). |
| 2 | nr-02-02 | d9 Doplňkové registry a otevřená data | PASS | 215844 fyzických osob (2024) | 215844 fyzických osob | Kraje!F7 | ČR-celkový řádek (sloupec Celkem), přesná shoda. XLSX stav k 31.12.2023, edice 2024-01 → portál rok 2024 (konvence roku edice). |
| 3 | ois-03-01 | d9 Doplňkové registry a otevřená data | PASS | 367 center (2024) | 367 center | CVSP – datový souhrn!A13:A379 | 367 datových řádků registru (1 řádek = 1 centrum). Počet sedí. POZOR: XLSX stav k 30.12.2025, portál uvádí year=2024 — nepřesné (ani rok edice 2026-01). |
| 4 | ois-11-05 | d1 Ceny a objemy | PASS | 71087 Kč (průměrná sazba) (2024) | 71065,24 Kč (průměr sl. E) | VÝSTUP 2024!E18:E1014 | Headline = průměr celkové základní sazby ALP 2024. 71065 vs portál 71087 → odchylka 22 Kč (0,03 %, v toleranci). Edice 2026-01. |
| 5 | ois-11-06 | d1 Ceny a objemy | PASS | 3171605 pacientoměsíců (2024) | 3171604,96 pacientoměsíců | Rok 2022-2024 ATC!sl. J/P/V/AB/AH/AN/AT ř.19:494 | Součet sloupců Počet pacientoměsíců 2024 přes 476 ATC × 7 ZP; zaokr. 3171605. Řada sedí (2022/2023). |
| 6 | ois-11-07 | d1 Ceny a objemy | PASS | 796.6 mil. Kč (2024) | 796 634 784 Kč = 796,6 mil. Kč | Genove_terapie!G13+M13+S13+Y13+AE13+AK13+AQ13 | Součet nákladů (max. cena za lék 2024) přes 7 ZP, řádek Všechna ATC. XLSX stav k 27.01.2026. |
| 7 | ois-11-08 | d1 Ceny a objemy | PASS | 18.7 mld. Kč (2024) | 18 685 852 313 Kč ≈ 18,686 mld. Kč | Rok 2024!K18:K61 | Součet sl. K (úhrada celkem) všech 44 typů PZT; XLSX nemá ČR-celkem řádek. ≈18,7 mld po zaokrouhlení. |
| 8 | ois-11-10 | d1 Ceny a objemy | PASS | 11.5 mld. Kč (2024) | 11,49 mld. Kč | Rok 2023!AI20:AX35 (součet) | Součet úhrad přes typy PZT. reference_period=Rok 2023, portál uvádí 2024 (edice 2025-02); zaokrouhleně 11,5 sedí. |
| 9 | ois-11-11 | d1 Ceny a objemy | PASS | 94.1 mld. Kč (2024) | 94 095 563 470 Kč ≈ 94,1 mld. Kč | Celkem!AK18:BA103 | Součet úhrad ZP (sl. AK–BA) přes ATC skupiny. Edice 2025-02. |
| 10 | ois-11-12 | d2 Personální zabezpečení | BLOCKED | 126722 Kč / měsíc (2024) | bez ČR-celkové buňky; LÉKAŘ Plat 2024 rozsah 23850–161236 Kč | data!sl. L (Rok 2024 odměna), řádky LÉKAŘ/Plat — bez agregátu | Headline 126722 je vážený národní průměr přes přepočtené úvazky z OIS-11-13 (jiný dataset, není v tomto XLSX); XLSX má jen hodnoty po typu poskytovatele bez vah a bez agregátní buňky → přesnou buňku nelze jednoznačně určit. Zdroj OIS-11-12 a období 2024 sedí, hodnota řádově plausibilní. |
| 11 | ois-11-13 | d2 Personální zabezpečení | PASS | 45391 lékařských úvazků (2024) | 45391 přepočtených úvazků | data!sl. R (Rok 2024 počty úvazků), řádky kat. Lékaři | Součet úvazků kategorie Lékaři za 2024 = 45391, přesná shoda. XLSX nemá ČR-celkem řádek. Edice 2025-02, zprac. 31.10.2025. |
| 12 | ois-11-14 | d2 Personální zabezpečení | PASS | 91163 Kč / měsíc (2024) | 91162,89 Kč/měs | Mzda_2024!C33 | Medián hrubé měsíční mzdy — lékaři specialisté (ISPV CZ-ISCO 2212), mzdová sféra 2024. Zaokr. 91163. |
| 13 | ois-11-15 | d2 Personální zabezpečení | PASS | 124730 Kč / měsíc (2024) | 124730,37 Kč/měs | Plat_2024!C36 | Medián hrubého měsíčního platu — lékaři specialisté (ISPV 2212), platová sféra 2024. Zaokr. 124730. |
| 14 | ois-11-16 | d2 Personální zabezpečení | TODO | 18.4 % pracovníků 60+ (2024) |  |  |  |
| 15 | ois-11-17 | d6 Lůžková péče | TODO | 167.41 mld. Kč (2024) |  |  |  |
| 16 | ois-11-18 | d3 Produkce nelůžkové péče | TODO | 16.3 mld. Kč (2024) |  |  |  |
| 17 | ois-11-19 | d3 Produkce nelůžkové péče | TODO | 77181183 receptů (2024) |  |  |  |
| 18 | ois-11-20 | d3 Produkce nelůžkové péče | TODO | 11176 poskytovatelů (2024) |  |  |  |
| 19 | ois-11-21 | d3 Produkce nelůžkové péče | TODO | 4320 poskytovatelů (2024) |  |  |  |
| 20 | ois-11-24 | d5 Struktura pojištěnců a náklady ZP | TODO | 459 mld. Kč (2023) |  |  |  |
| 21 | ois-11-25 | d6 Lůžková péče | TODO | 1792276 hospitalizačních případů (2024) |  |  |  |
| 22 | ois-11-27 | d6 Lůžková péče | TODO | 8895523 ošetřovacích dnů (2024) |  |  |  |
| 23 | ois-11-28 | d6 Lůžková péče | TODO | 76587 lůžek (2024) |  |  |  |
| 24 | ois-11-30 | d7 Komunitní ošetřovatelská péče | TODO | 8048294 kontaktů (2024) |  |  |  |
| 25 | ois-11-31 | d7 Komunitní ošetřovatelská péče | TODO | 12.68 mld. Kč (2024) |  |  |  |
| 26 | ois-11-32 | d8 Jednodenní péče | TODO | 27987 smluvních kombinací (2024) |  |  |  |
| 27 | ois-11-33 | d8 Jednodenní péče | TODO | 200115 výkonů (2024) |  |  |  |
| 28 | ois-11-35 | d1 Ceny a objemy | TODO | 4.6 mld. Kč (2024) |  |  |  |
| 29 | ois-11-36 | d1 Ceny a objemy | TODO | 42.4 mld. Kč (2024) |  |  |  |
| 30 | ois-11-37 | d6 Lůžková péče | TODO | 1808472 hospitalizačních případů |  |  |  |
| 31 | ois-11-38 | d6 Lůžková péče | TODO | 825011 výkonů převzetí od ZZS (2024) |  |  |  |
| 32 | ois-11-39 | d6 Lůžková péče | TODO | 47.7 % případů v referenční síti (2024) |  |  |  |
| 33 | ois-11-40 | d6 Lůžková péče | TODO | 109393 unikátních pacientů (2022) |  |  |  |
| 34 | ois-11-41 | d3 Produkce nelůžkové péče | TODO | 1055707 výjezdů ZZS (2024) |  |  |  |
| 35 | ois-11-42 | d3 Produkce nelůžkové péče | TODO | 11736 poskytovatelů (2024) |  |  |  |
| 36 | ois-11-45 | d6 Lůžková péče | TODO | 1789575 hospitalizačních případů (2024) |  |  |  |
| 37 | ois-11-46 | d6 Lůžková péče | TODO | 6.5 dní (průměrná délka) (2024) |  |  |  |
| 38 | ois-11-47 | d5 Struktura pojištěnců a náklady ZP | TODO | 10.85 mil. pojištěnců (2025) |  |  |  |
| 39 | ois-11-48 | d6 Lůžková péče | TODO | 5727 intenzivních lůžek (2024) |  |  |  |
| 40 | ois-11-49 | d6 Lůžková péče | TODO | 821 lůžek ARO (2024) |  |  |  |
| 41 | ois-11-50 | d6 Lůžková péče | TODO | 299.4 mld. Kč (2024) |  |  |  |
| 42 | ois-11-51 | d6 Lůžková péče | TODO | 91.8 % případů v centrech |  |  |  |
| 43 | pps-08-01 | d9 Doplňkové registry a otevřená data | TODO | 33.1 % účast u praktického lékaře (2023) |  |  |  |
| 44 | sss-04-02 | d9 Doplňkové registry a otevřená data | TODO | 16.408 CT na milion obyvatel (2024) |  |  |  |
