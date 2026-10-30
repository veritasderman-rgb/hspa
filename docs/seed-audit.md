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
| `lekari_per_1000` | hodnota sedí, řada ne | 4,2 (ÚZIS) vs OECD 4,29; seed řada 2020–2023 neodpovídá OECD — převod na OECD by rozešel 4 tvrzení v článcích (4,2), vyřešit v další dávce |
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

## Fronta na další dávky

Podle počtu publikovaných článků (k 30. 10. 2026): `spokojenost_informovani` (12), `infekce_nosokomialni` (11), `spokojenost_pece` (11), `vydaje_leky_hdp` (11), `deti_obezita_cosi` (10), `psychiatrie_prumerna_delka_hospitalizace` (10), `vakcinace_hexa_deti` (10), `cezarsky_rez_pct`, `incidence_kolorektalni`, `nadeje_doziti_vzdelani_gap_muzi`, `polypragmazie_65plus`, `vakcinace_pneumokok_65` (po 8), `ambulantni_kontakty_per_capita`, `hospicova_pece_luzka`, `incidence_prsu`, `predcasne_porody_pct`, `prevalence_dusevni_poruchy_dospeli`, `screening_plicni`, `vakcinace_hpv` (po 7), … Neověřených seedů zbývá 120.

Pojistka: `npm run validate:claims` (kontrola `ingest/validate-seed-claims.js`) hlídá, aby nově publikovaná tvrzení (`data/claims.json`, `check: auto`) nestála na neověřeném seedu. Stávající případy jsou v baseline `data/seed-claims-baseline.json`; s každou dávkou auditu se baseline zmenšuje a nesmí růst.
