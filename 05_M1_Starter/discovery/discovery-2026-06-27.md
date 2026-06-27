# Discovery report — 2026-06-27

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh **opět explicitně zdůraznil: „Naprosto zásadní je validace
a ověření všech zdrojů!!!!"** → každé numerické a legislativní tvrzení dnešního
výstupu je ověřeno přímo proti primárnímu zdroji (ÚZIS RTBC report PDF, ECDC/WHO
report, Sbírka zákonů).

27. 6. 2026 je **sobota**. Poslední discovery report v repu = 2026-06-26
(FALLBACK-AUDIT clanek-novela-elektronizace-2026, mergnuto PR #677). Startovní
stav: `git` HEAD na větvi `claude/dreamy-wright-9fxslo`; `npm run validate:all`
zelené (152 indikátorů, 152 článků prošlo publikační hygienou, financing OK,
clinical-quality 35 indicators). Publikační fronta drží **15 nepublikovaných
draftů**; další volný slot 2026-07-03.

## Procházené primární zdroje (stav fetch k 27. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | **NOVÉ 26. 6.: „Tuberkulóza v ČR v roce 2025"** (aid=8753) — plná výroční zpráva z Registru tuberkulózy (RTBC), data platná k 27. 5. 2026. **Nová datová vlna.** Viz „Posouzení triggeru". (15. 6. NRPATV číselník toxikologie už zpracováno.) |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | 26. 6. extrémní vedra (sezónní apel, sekundární); 24. 6. elektronizace (forward-looking novela — již zpracováno v auditu 26. 6.). Žádný nový schválený akt. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 26. 6. Newsletter, 24. 6. konjunkturální průzkumy. Žádná nová indikátorová/mortalitní/EHIS vlna (výdaje na zdravotní péči 2024 = 11. 6., zpracováno). |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | 26. 6. vibria u moře, 25. 6. repelenty (sezónní/sekundární). Žádná nová primární surveillance vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search | Nejnovější ucelená vlna = Health at a Glance 2025 (13. 11. 2025) + Country Health Profile Czechia 2025, oba v korpusu. **Žádná edice „2026", žádná nová `hlth_*` vlna s ČR-implikací.** |
| 6 | **ECDC/WHO — TB surveillance** | ecdc.europa.eu | ✅ 200 | Report „Tuberculosis surveillance and monitoring in Europe **2026 (2024 data)**", publ. **23. 3. 2026**: EU/EEA 2024 = **8,4/100 000** (38 249 případů, 30 zemí). Použito jako benchmark pro TB článek. |
| 7 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 (homepage) | Bez strojově ověřeného **nového** tisku v gesci MZ ČR. Žádný nový tisk netvrdím. |
| 8 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ 404 (registr se přesouvá) | Strojově nedostupné → žádný nový výpadek netvrdím. |
| 9 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 anti-bot | Strojově nedostupné. Žádný nový normativní akt v gesci MZ ČR netvrdím. |

## Posouzení triggeru — ÚZIS „Tuberkulóza v ČR v roce 2025" (26. 6. 2026)

Fetch oficiálního PDF (`uzis.cz/res/f/008469/tbc2025-cz.pdf`, ověřeno přes
pdfminer/pypdf extrakci textu) potvrdil plnou výroční zprávu z Registru
tuberkulózy (RTBC), data platná k **27. 5. 2026**. Ověřené klíčové hodnoty:

- **435 hlášených onemocnění TBC** všech forem v roce 2025 = **3,99/100 000** obyvatel;
  o 20 případů méně než v roce 2024 (⇒ 2024 = 455). ČR i nadále nízkoincidenční země.
- **366 (84,1 %) definitivní TBC**, z toho 286 (65,7 %) ověřeno ze sputa/LV;
  **179 (41,1 %) mikroskopicky pozitivní** (infekční).
- **391 (89,9 %) plicní**, 44 mimoplicní.
- Muži >74 %; nejčastěji 45–49 let; <20 let: 29 pacientů.
- **Praha 120 osob (8,58/100 000)** — absolutně i relativně nejvíc; nejnižší Zlínský 1,90.
- **228 osob narozených mimo ČR = 52,4 %**; nejvíc Ukrajina 137, Slovensko 19,
  Filipíny 12, Vietnam 11.
- **Rezistence (testováno 372):** isoniazid 41 (11,0 %), rifampicin 25 (6,7 %),
  **multirezistence (MDR) 24 (6,5 %)**.
- **Léčebný úspěch** kohorty 2024 (303 případů, hodnoceno po 12 měs.): **219 (72,3 %)**;
  selhání léčby v 2024 nevykázáno.
- **22 úmrtí na TBC** hlášeno do RTBC v roce 2025 (nejvíc Praha 8, Jihomoravský 3).
- Mykobakteriózy jiné než TBC: 118 případů (1,08/100 000).

**Je to HOT trigger pro nový článek:**
1. **Nová primární datová vlna** (ÚZIS RTBC, 26. 6. 2026) — strojově ověřitelná z PDF.
2. **Mezera v korpusu** — existuje indikátor `tuberkuloza` (ECDC, 2022, 3,6/100k),
   ale **žádný dedikovaný článek o TBC**. 65+ článků, infekce/očkování pokryté
   (vakcinace, klíšťová encefalitida, epidemiologie 1–4), TBC samostatně NE.
3. **HSPA framing**: nízká incidence = funkční surveillance + socioekonomika;
   majorita narozených mimo ČR; MDR jako kvalitativní výzva; léčebný úspěch
   72,3 % vs WHO cíl 90 %.

## Nové indikátory / datasety

- ÚZIS „Tuberkulóza v ČR v roce 2025" (RTBC) — nová vlna národních dat (viz výše).
  Indikátor `tuberkuloza` v dashboardu zůstává na ECDC metodice (harmonizovaná
  EU surveillance, ingest přes ECDC Atlas API); RTBC = národní registr, který ČR
  do ECDC reportuje. Článek cituje RTBC přímo s methodology caveatem; indikátor
  needituji (refresh je úkol ingest pipeline / INDICATOR-ADD flow).

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **schváleného** normativního aktu v gesci MZ ČR k 27. 6.

## Aktualizace existujících dat / dění (vlna)

- ÚZIS RTBC „Tuberkulóza v ČR v roce 2025" (26. 6. 2026) — viz výše.
- ECDC/WHO TB surveillance 2026 (2024 data, 23. 3. 2026) — benchmark.

## Doporučení pro routing fáze

- **HOT (nový článek):** TBC v ČR 2025 — nová ÚZIS RTBC vlna + mezera v korpusu.
- **WARM:** žádný akutní revizní cíl.
- **COLD:** n/a — HOT trigger má přednost.
