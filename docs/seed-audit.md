# Audit seed indikátorů — průběžný stav

Seed = hodnota v `data/indicators.json` se `source.origin: "seed"`, kterou nikdo neověřil proti primárnímu zdroji (`verification_status` ≠ `verified`). Po třech chybách, které se propsaly do publikovaných článků (CT/MR, délka hospitalizace, zubaři — viz `decisions-log.md` 2026-10-30), ověřujeme seedy po dávkách podle toho, kolik publikovaných článků na indikátor odkazuje.

**Postup u každého indikátoru**

1. Najít primární zdroj (OECD SDMX, Eurostat, ÚZIS, ČSÚ) a porovnat českou hodnotu, rok a benchmark.
2. Sedí-li hodnota **i celá řada** (covery a grafy kreslí celou řadu): `verification_status: verified` + `verified_at` v kontraktu, poznámka do `method_notes` karty (co a proti čemu se ověřilo).
3. Nesedí-li: opravit kontrakt a kartu (příběh pacienta bez neověřených čísel), kde to jde, napojit živě (`ingest/mapping/oecd_sdmx2_codes.json`). Projít články (`linked_indicators` + grep čísla) a claims, opravit s viditelnou poznámkou `article-callout-update` a záznamem `OPRAVA` v audit bloku. Zapsat do `decisions-log.md`.
4. Nedá-li se ověřit: zapsat sem, proč, a co by bylo potřeba.

Průměr OECD = prostý průměr členských zemí s údajem za daný rok, průměr EU = prostý průměr členských zemí EU v datech OECD (pokud benchmark výslovně není vážený agregát EU27 z Eurostatu — pak to karta říká).

## Dávka 1 (30. 10. 2026)

| Indikátor | Výsledek | Seed → zdroj |
|---|---|---|
| `psychiatri_per_100k` | **opraveno** | 13 (OECD 17,3) → 16,3 (OECD 19,0, EU 19,5), 2024; 11 článků opraveno |
| `nizka_porodna_hmotnost_pct` | **opraveno** | 7,9 % (2022, OECD 6,8) → 6,6 % (2024, OECD 6,69); článek přepsán, živě z OECD `DF_IH_LB` |
| `kuractvi_denni` | ověřeno | 16,4 % (2024) = OECD |
| `vakcinace_chripka_65` | ověřeno | 24,6 % = OECD, průměr OECD 51,06 |
| `spotreba_antibiotik` | hodnota sedí, řada ne | 15 vs OECD 15,4 (2023); řadu 2020–2022 v OECD ověřit nelze; EU 18,3 = ESAC-Net |
| `vydaje_zdravotnictvi_hdp` | ověřeno, řada opravena | 8,6 % = OECD SHA 8,65; seed řada 2020–2023 nahrazena OECD; EU 10,4 je vážený agregát |
| `platba_z_kapsy_pct` | ověřeno, řada opravena | 13,6 % = OECD SHA 13,56; seed řada (2020: 15,2) nahrazena OECD (2020: 11,1) |
| `lekari_per_1000` | hodnota sedí, řada ne | 4,2 (ÚZIS) vs OECD 4,29; seed řada 2020–2023 neodpovídá OECD → vyřešeno v dávce 2 (živě z OECD) |
| `sestry_per_1000` | hodnota sedí, řada ne | 9,0 vs OECD 9,09; seed řada klesá (9,2 → 9,0), OECD roste (8,66 → 9,09) |
| `ehealth_adoption` | **neověřitelné, podezřelé** | „index 0–100“ 62 vs „OECD 70“, „EU 68“ — OECD ani Eurostat takový složený index nevedou; zdroj indexu chybí. 12 tvrzení v 8 článcích. Rozhodnutí vydavatele: dohledat zdroj, nebo indikátor stáhnout a články opravit |
| `cekaci_doby_specialist` | **neověřitelné, podezřelé** | 28 dní vs „OECD 18“, „EU 22“ — OECD pro ČR čekací doby nevykazuje a srovnatelný medián čekání na specialistu mezinárodně neexistuje. 9 tvrzení. Stejné rozhodnutí jako u eHealth |
| `cekaci_doba_kycel` | **neověřitelné** | 118 dní (VZP) vs OECD 85 — OECD `DF_WAITING` pro ČR nemá data; benchmark je průměr jiných zemí s jinou definicí (od zařazení do pořadníku) |
| `prevalence_diabetu` | nelze potvrdit | 9,5 % (2023, NDR) — EHIS 2019 (Eurostat `hlth_ehis_cd1e`) dává 8,8 %, EU 7,4; novější vlna EHIS zatím nevyšla |
| `vakcinace_mmr_deti` | nelze potvrdit | 83,7 % (ÚZIS, kohorta 2022, do 2 let) vs OECD 89 % (2024) — jiná definice (OECD 1. dávka) |
| `hospitalizace_acsc` | nelze potvrdit | 592 / 100 000 — OECD publikuje jen jednotlivé diagnózy (astma, CHOPN, srdeční selhání, diabetes), složený ukazatel je třeba spočítat z NRH |
| `multimorbidita_65plus` | nelze potvrdit | SHARE — mikrodata, bez veřejného agregátu |
| `kontrola_hypertenze` | nelze potvrdit | EHES — bez veřejného agregátu |
| `centra_dusevniho_zdravi_per_100k` | nelze potvrdit | počet CDZ eviduje MZ, benchmark „EU 1“ je cíl NAPDZ, ne průměr EU (karta to říká) |
| `vydaje_dusevni_zdravi_pct` | nelze potvrdit | 4 % (2022) je zaokrouhlení bodu 2015 z NAPDZ; benchmark EU 7 je odhad OECD |

## Dávka 2 (2. 11. 2026)

| Indikátor | Výsledek | Seed → zdroj |
|---|---|---|
| `vydaje_leky_hdp` | **opraveno**, živě z OECD | 1,7 % HDP (OECD 1,5, EU 1,4) → 1,16 % (2024, SHA HC.5.1 — léky mimo nemocnici), OECD 1,28, EU 1,32; ČR pod průměrem, ne nad. 3 články |
| `lekari_per_1000` | **opraveno**, živě z OECD | 4,2 (OECD 3,9, EU 4,0) → 4,29 (2024), OECD 4,02, EU 4,36; ČR pod průměrem EU. 4 články |
| `psychiatrie_prumerna_delka_hospitalizace` | **opraveno**, živě z OECD | 43 dní (OECD 19, EU 21; 2018: 48) → 38,8 dne (2022, F00–F99), OECD 28,5 (Korea 215; bez ní ~24), EU 23,4 |
| `cezarsky_rez_pct` | **opraveno** | 28,3 % (OECD 28, EU 27) → 26,3 na 100 živě narozených (2024, OECD `DF_SURG_PROC`), OECD 27,3, EU 30,8; roste od 23,3 (2019) |
| `deti_obezita_cosi` | **opraveno** | 26,3 % (2019) a rostoucí řada 2008–2019, průměr 29,8 → 21,0 % sedmiletých (COSI 6. kolo, 2023; CI 16,6–26,2), region WHO Europe 25 %; řada bez zdroje odstraněna (PMID 37923562: bez významné změny 2008–2019). 10 článků |
| `infekce_nosokomialni` | **opraveno** | 6,5 % (OECD 5,5, EU 5,9) → 6,7 % (ECDC PPS 2022–2023), medián EU/EHP 6,8; 2016–2017 také 6,7 %. OECD prevalenci HAI nevede |
| `vakcinace_pneumokok_65` | **opraveno** | 5,5 % (OECD 50, EU 17) → 28,6 % (2025, ÚZIS NZIS — očkování od 2010 v registru), řada 31,8 → 28,6 (2019–2025); bez benchmarku — OECD ani Eurostat údaj nevedou. 5 článků |
| `vakcinace_hexa_deti` | ověřeno | 86 % (2024) i řada = WUENIC; OECD 91,8, EU 92,4 |
| `polypragmazie_65plus` | ověřeno | 46,6 % (SHARE W9) a 39,9 % (W6) = Bonanno et al. 2025 (PMID 40004860); „EU 36,2“ je 27 zemí SHARE + Izrael |
| `spokojenost_pece` | ověřeno, řada odstraněna | 75 % / OECD 64 % = Health at a Glance 2025 (Gallup); „EU 67 %“ a řada 2020–2023 se ověřit nepodařilo |
| `spokojenost_informovani` | **neověřitelné, podezřelé** | 72 % vs „OECD 78“, „EU 76“: karta uvádí jako zdroj „průzkum NRC“, příběh Eurobarometer 2024 — ani jeden údaj nebyl dohledán; OECD pro ČR zkušenost pacientů (DF_PE) nevykazuje. 3 tvrzení. Rozhodnutí vydavatele jako u eHealth |
| `nadeje_doziti_vzdelani_gap_muzi` | **neověřitelné** | 13 let — zdrojová analýza „Hamplová & Katrňák (CDK 2018)“ nedohledána, Eurostat `demo_mlexpecedu` ČR nemá; řada 1999–2016 je podle karty sama „orientační“. 4 tvrzení. Dohledat publikaci, nebo indikátor stáhnout |
| `incidence_kolorektalni` | neověřeno | hrubá incidence z NOR — v této dávce nedošlo na stažení dat NOR; zůstává ve frontě |

## Fronta na další dávky

Podle počtu publikovaných článků (k 2. 11. 2026), bez indikátorů, které už čekají na rozhodnutí vydavatele (`ehealth_adoption`, `cekaci_doby_specialist`, `spokojenost_informovani`, `nadeje_doziti_vzdelani_gap_muzi`) nebo nejdou ověřit z veřejných agregátů (viz dávka 1): `sestry_per_1000` (14), `spotreba_antibiotik` (14), `incidence_kolorektalni` (8), `podil_prakticti_lekari` (8), `ambulantni_kontakty_per_capita`, `hospicova_pece_luzka`, `incidence_prsu`, `naklady_centrove_leky_total`, `podil_lekaru_55plus`, `predcasne_porody_pct`, `prevalence_dusevni_poruchy_dospeli`, `screening_plicni`, `vakcinace_hpv` (po 7), `bezpecnost_padu_nemocnice` (6), … Neověřených seedů zbývá 114.

Pojistka: `npm run validate:claims` (kontrola `ingest/validate-seed-claims.js`) hlídá, aby nově publikovaná tvrzení (`data/claims.json`, `check: auto`) nestála na neověřeném seedu. Stávající případy jsou v baseline `data/seed-claims-baseline.json`; s každou dávkou auditu se baseline zmenšuje a nesmí růst.
