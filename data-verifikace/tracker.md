# Tracker verifikace — /dohodovaci-rizeni vs. NZIP XLS

> Portálová data: `data/dohodovaci-rizeni.json` z produkce https://www.hspa-cesko.cz/dohodovaci-rizeni
> (soubor není v repu — produkce je před repozitářem). Snapshot: `nzip-cache/portal-dohodovaci-rizeni.json`.
> XLSX zdroj každé sady = `source.latest_file`, viz `nzip-mapovani.md`. Verifikace je READ-ONLY.

Stav: **1 / 44 PASS** · TODO 43 · PASS 1 · FAIL 0 · BLOCKED 0

| # | id | dimenze | status | hodnota_portal | hodnota_nzip | list+buňka | poznámka |
|---|---|---|---|---|---|---|---|
| 1 | nr-02-01 | d9 Doplňkové registry a otevřená data | PASS | 210340 úvazků (2024) | 210340,32 úvazků | Kraje!F7 | Portál 210340 = zaokrouhlení XLSX 210340,32 (řádek ČR · Celkem odbornosti/typy/kategorie/subkategorie, sloupec Celkem). Jednotka úvazky OK. XLSX „stav k 31.12.2023', edice 2024-01 — portál uvádí rok 2024 (rok edice, ne rok stavu dat). |
| 2 | nr-02-02 | d9 Doplňkové registry a otevřená data | TODO | 215844 fyzických osob (2024) |  |  |  |
| 3 | ois-03-01 | d9 Doplňkové registry a otevřená data | TODO | 367 center (2024) |  |  |  |
| 4 | ois-11-05 | d1 Ceny a objemy | TODO | 71087 Kč (průměrná sazba) (2024) |  |  |  |
| 5 | ois-11-06 | d1 Ceny a objemy | TODO | 3171605 pacientoměsíců (2024) |  |  |  |
| 6 | ois-11-07 | d1 Ceny a objemy | TODO | 796.6 mil. Kč (2024) |  |  |  |
| 7 | ois-11-08 | d1 Ceny a objemy | TODO | 18.7 mld. Kč (2024) |  |  |  |
| 8 | ois-11-10 | d1 Ceny a objemy | TODO | 11.5 mld. Kč (2024) |  |  |  |
| 9 | ois-11-11 | d1 Ceny a objemy | TODO | 94.1 mld. Kč (2024) |  |  |  |
| 10 | ois-11-12 | d2 Personální zabezpečení | TODO | 126722 Kč / měsíc (2024) |  |  |  |
| 11 | ois-11-13 | d2 Personální zabezpečení | TODO | 45391 lékařských úvazků (2024) |  |  |  |
| 12 | ois-11-14 | d2 Personální zabezpečení | TODO | 91163 Kč / měsíc (2024) |  |  |  |
| 13 | ois-11-15 | d2 Personální zabezpečení | TODO | 124730 Kč / měsíc (2024) |  |  |  |
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
