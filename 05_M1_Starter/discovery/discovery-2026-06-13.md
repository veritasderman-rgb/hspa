# Discovery report — 2026-06-13

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch / PubMed MCP).
Železné pravidlo: co není ověřené z primárního zdroje, nezůstává. Uživatel pro
tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a ověření všech
zdrojů!!!!"** Předchozí běh 2026-06-12 (pátek) → ARTICLE-REVISE
(`clanek-vydaje-zdravotnictvi`, ČSÚ zdravotnické účty 2024). 13. 6. 2026 je
**sobota**.

## Procházené primární zdroje (stav fetch k 13. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny relevantní pro data: 10. 6. čestné členství (L. Dušek, K. Hejduk) — personální. **Nová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 2 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | **NOVÁ VLNA 12. 6. 2026** — „Pohyb obyvatelstva – 1. čtvrtletí 2026" (rychlá informace). Jinak 11. 6. zdravotnické účty 2024 (řešeno 12. 6.). |
| 3 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **NOVÁ TZ 12. 6. 2026** — „Elektronizace zdravotnictví rozšiřuje možnosti lékařů. Portál eZdraví umožňuje ověřit držení zbrojního oprávnění a zpracovávat posudky pro řidiče." Předchozí: 11. 6. hygiena/letní sezona, 10. 6. MoodPass + odměňování nelékařů, 9. 6. CDZ (vše v korpusu / řešeno). |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | 11. 6. invazní komáři (iROZHLAS, sekundární); 10. 6. klíšťata ve městech (ČT24, sekundární); 8. 6. nikotin u mladých (`koureni-adolescenti` ve frontě). **Nová surveillance vlna s ČR-implikací: žádná nová proti 12. 6.** |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) nejnovější, již v korpusu. Eurostat news 13. 3. 2026 „33 % úmrtí na nemoci oběhové soustavy 2023" — minulé, v korpusu konzistentní. **Žádná nová vlna hlth_* s ČR-implikací k 13. 6.** |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | — search | „Komplexní novela zákona o zdravotních službách" (schválena sněmovnou, antibyrokratická opatření) + vyhlášky 76/2026 a 77/2026 Sb. (oceňování / redistribuce v.z.p.) — bez strojově ověřeného **nového** data k 13. 6.; elektronizace již pokryta `clanek-novela-elektronizace-2026`. Netvrdím novou normu. |
| 7 | **SÚKL — registr výpadků** | sukl.gov.cz | — | Neprocházeno strojově (předchozí běhy 301/404). Per železné pravidlo netvrdím žádný nový výpadek. |

## Nové indikátory / datasety

- **NOVÁ VLNA (ČSÚ, 12. 6. 2026):** „Pohyb obyvatelstva – 1. čtvrtletí 2026"
  (rychlá informace). Ověřené národní hodnoty Q1 2026 (ČSÚ): živě narození ≈ 17,5 tis.
  (−6 % r/r), zemřelí ≈ 30,1 tis. (−3 % r/r), **přirozený úbytek ≈ −12 582** (zemřelo
  o tolik více, než se narodilo), záporné migrační saldo, počet obyvatel klesl pod
  10,9 mil. → **rutinní čtvrtletní demografická vlna**: úmrtnost meziročně *klesla*
  (neutrální/pozitivní signál), hlavní příběh je pokles porodnosti — slabý
  samostatný HSPA hook, vhodnější jako indikátorový update než nový článek.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 13. 6. 2026.
  Vyhlášky 76/2026 a 77/2026 Sb. (oceňování nákladů / redistribuce pojistného)
  identifikovány, ale bez čerstvého triggeru a tematicky spadají pod již pokrytou
  oblast (dohodovací řízení / financování).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **WARM — 12. 6. 2026, MZ ČR:** rozšíření portálu eZdraví (ověření zbrojního
  oprávnění, posudky pro řidiče). **Nevybráno** — digitalizační oblast je v korpusu
  saturovaná (série `digi-1`…`digi-5`, `ehealth`, `ezkarta-ehealth`,
  `novela-elektronizace-2026`, `ncez-financovani-2027`, `ehds-evropsky-prostor`);
  inkrementální feature bez tvrdého KPI → redundance.
- **WARM — 12. 6. 2026, ČSÚ:** pohyb obyvatelstva Q1 2026 (viz výše). Nevybráno
  jako samostatný článek.
- **WARM — SZÚ:** komáři/klíšťata — sekundární zdroje, bez primární vlny. Nevybráno.

## Aktualizace existujících dat (vlna)

- ČSÚ pohyb obyvatelstva Q1 2026 (kandidát na indikátorový update demografie, ne
  na článek).

## Doporučení pro routing fáze

- **Žádný tvrdý HOT trigger pro nový článek.** Digitalizace saturovaná, demografická
  vlna rutinní (úmrtnost klesla), legislativa bez nového aktu. Fronta navíc drží
  **15 nepublikovaných draftů** — přidat 16. tenký článek by byla „zbytečná změna"
  (železné pravidlo: lepší žádná změna než zbytečná).
- **→ FALLBACK AUDIT** nejstaršího auditovaného článku (>30 dní). Cíl:
  `clanek-akutni-infarkt.html` (last_reviewed 2026-05-11, stáří 33 dní). Plně
  v souladu s explicitním požadavkem uživatele na **ověření všech zdrojů**.
  Detail viz `routing-2026-06-13.md`.
