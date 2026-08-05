# Datový rámec — tamoxifen-vypadek

## Centrální KPI
- Hlavní hodnota: **oba registrované přípravky Tamoxifen Ebewe (10 mg i 20 mg) mají
  přerušené dodávky s výrobcem hlášeným termínem obnovení 15. 7. 2027** (výrobní důvody)
- Primární zdroj: SÚKL open data — MR feed (Hlášení o uvedení/přerušení/ukončení/obnovení
  dodávek LP), https://opendata.sukl.cz/soubory/MR/mr.zip — staženo 5. 8. 2026,
  soubor generován 4. 8. 2026 22:15. Řádky:
  - 0058701 TAMOXIFEN EBEWE 10MG TBL NOB 100 — preruseni, PLATNOST_OD 16.06.2025,
    DATUM_HLASENI 12.05.2025, DUVOD „Výrobní důvody", TERMIN_OBNOVENI 15.07.2027, POSLEDNI_PLATNE_HLASENI=ANO
  - 0058702 TAMOXIFEN EBEWE 20MG TBL NOB 100 — preruseni, PLATNOST_OD 08.12.2025,
    DATUM_HLASENI 26.11.2025, DUVOD „Výrobní důvody", TERMIN_OBNOVENI 15.07.2027, POSLEDNI_PLATNE_HLASENI=ANO
  - 0289384 TAMOXIFEN ORIFARM 20MG TBL NOB 100 — zahajeni od 20.01.2026;
    preruseni 08.06.2026 (hlášeno 03.06.2026, kapacitní/distribuční důvody,
    termín obnovení 13.07.2026); obnoveni od 28.07.2026 (hlášeno 29.07.2026, ANO)
- Benchmark: nepřímý — EMA katalog výpadků (metodicky nesrovnatelné, viz metodická
  karta indikátoru; EMA reportuje 4× nárůst hlášení 2018→2024)
- Časový kontext: stav k 4. 8. 2026 (feed), TZ MZ 3. 8. 2026, SÚKL podmínky ZvLP 4. 8. 2026

## Sekundární hodnoty
- 1 329 aktivních výpadků LP celkem (k 3. 8. 2026) + roční řada 2019: 1 293, 2020: 1 089,
  2021: 1 080, 2022: 1 231, 2023: 1 309, 2024: 1 458, 2025: 1 555 — dashboard indikátor
  `vypadky_leciv_aktivni` (verified, origin live, fetched_at 2026-08-03), zdroj SÚKL MR feed
- Historie trhu (MR feed): NOLVADEX D ukončení dodávek (hlášeno 10.07.2009),
  TAMOPLEX 10/20 MG ukončení (2011–2012), Tamoxifen Ebewe 30tbl balení ukončení 2011
  → trh s tamoxifenem dlouhodobě stojí na jediném dodavateli
- Incidence karcinomu prsu ČR: 133 / 100 000 žen (věk. std., 2022), EU: 148 —
  EU Country Cancer Profile 2025 Czechia (JRC/OECD), dashboard `incidence_prsu`
- Pětileté přežití karcinomu prsu: 81,4 % (diagnózy do 2014, CONCORD/OECD HCQO),
  OECD: 84,3 % — dashboard `prezit_karcinom_prsu_5let` (verified)
- Mamografický screening 50–69: 54,5 % (2024, ÚZIS NRHZS), OECD 68 %, EU 65 % —
  dashboard `screening_mamograficky` (verified)
- ZvLP mechanismus: individuální příprava (IPLP) v lékárnách z neregistrovaných LP
  registrovaných v jiných státech EU/EHP; výdej max. ~2 měsíce léčby (výjimka: jeden
  blistr ji smí přesáhnout); použitelnost min. 3 měsíce od výdeje; zákaz použít balení
  dovezená pro specifický léčebný program (Tamoxifen Orifarm, Tamoxifeno Farmoz) —
  SÚKL 4. 8. 2026
- Citace (MZ TZ 3. 8. 2026): ministr Adam Vojtěch; Tomáš Boráň (ředitel SÚKL);
  Aleš Krebs (prezident ČLnK) — doslovná znění v TZ
- Tamoxifen = syntetický nesteroidní antiestrogen (SERM), blokuje estrogenní receptory,
  užívá se dlouhodobě, tablety 1×(–2×) denně, hlavně karcinom prsu — ČOS ČLS JEP,
  linkos.cz slovníček

## Legislativa
- Právní institut „zvláštní léčebný program" popsán podle zveřejněných podmínek MZ ČR
  a SÚKL (stránka ZvLP, 4. 8. 2026). Konkrétní § zákona č. 378/2007 Sb. NECITUJEME —
  e-sbirka.gov.cz strojově nečitelná (JS bez server-side obsahu), zakonyprolidi.cz 403;
  text normy nebylo možné ověřit. (Pozn. pro budoucí revizi: doplnit § po ověření.)

## Mezinárodní kontext
- Výpadek je evropský: „na evropském trhu omezené množství tamoxifenu" (Boráň, TZ MZ);
  jednání o dodávkách „tisíců balení" s výrobci a evropskými partnery (TZ MZ)
- Methodology caveat: počet hlášených výpadků SÚKL ≠ počet fakticky nedostupných léků
  v lékárnách (proxy); EMA katalog nesrovnatelný (jen centrálně registrované LP)

## Interní křížové odkazy
- Články: preziti-karcinom-prsu, dostupnost-radioterapie-2026, hta_jca_eu_2026,
  generika-biosimilars-uspora, onkologicky_koordinator_2026
- Indikátory: vypadky_leciv_aktivni, incidence_prsu, prezit_karcinom_prsu_5let,
  screening_mamograficky
