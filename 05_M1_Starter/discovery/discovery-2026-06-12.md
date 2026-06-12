# Discovery report — 2026-06-12

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**
Předchozí běh byl 2026-06-11 (čtvrtek) → ARTICLE-WRITE
(`clanek-dusevni-zdravi-matek-moodpass`, MoodPass / perinatální duševní zdraví,
zařazen na konec fronty 2026-07-01). 12. 6. 2026 je **pátek**.

## Procházené primární zdroje (stav fetch k 12. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | **NOVÁ DATOVÁ VLNA z 11. 6. 2026** — „Zdravotní péče v roce 2024 stála 64 tisíc korun na osobu" (zdravotnické účty / SHA, **předběžné údaje za 2024**). Jinak: 10. 6. CPI 05/2026, 8. 6. zahraniční obchod 04/2026, 4. 6. mzdy Q1 — bez zdravotní implikace. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **2 NOVÉ TZ z 11. 6. 2026** — (a) „Hygienici zahajují letní sezonu 2026. Češi stále více cestují mimo Evropu, zdravotní prevenci ale podceňují" (cestovní medicína, měkčí); předchozí 10. 6. MoodPass + odměňování nelékařů (oboje řešeno 11. 6. / WARM), 9. 6. CDZ (v korpusu). |
| 3 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny relevantní pro data: 10. 6. čestné členství (L. Dušek, K. Hejduk) — personální, ne datová vlna. **Nová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | 11. 6. invazní komáři (iROZHLAS, sekundární); 10. 6. klíšťata ve městech (ČT24, sekundární); 8. 6. nikotin u mladých (`koureni-adolescenti` ve frontě). **Nová surveillance vlna s ČR-implikací: žádná.** |
| 5 | **SÚKL — registr výpadků** | sukl.gov.cz/farmaceuticky-trh/registr-vypadku-leciv | — | Neprocházeno strojově (předchozí běh 301→404). Per železné pravidlo netvrdím žádný nový výpadek. |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | — | Předchozí běhy strojově neprůchozí (403/rozcestník). Netvrdím žádnou novou normu. |
| 7 | **OECD / Eurostat / WHO / NÚKIB** | — | — | Beze změny — HAG 2025 (11/2025), Country Health Profile Czechia 2025 (12/2025) nejnovější, již v korpusu. Žádná nová vlna hlth_* / WHO guideline s ČR-implikací k 12. 6. |

## Nové indikátory / datasety

- **NOVÁ VLNA existujícího indikátoru** `vydaje_zdravotnictvi_hdp` (+ navázané
  `platba_z_kapsy_pct`): ČSÚ **zdravotnické účty — předběžné údaje za rok 2024**,
  publikováno **11. 6. 2026**. Toto je přesně ta vlna, na kterou **explicitně čekal**
  článek `clanek-vydaje-zdravotnictvi.html` (otevřená otázka v audit YAML z 16. 5.:
  „po publikaci ČSÚ 2024 sjednotit primární a dashboard hodnotu").

## Ověřená primárně-zdrojová báze k HOT tématu (ČSÚ, fetch 200, předběžné údaje 2024)

| # | Ukazatel 2024 | Hodnota | Primární zdroj | Verdikt |
|---|---|---|---|---|
| 1 | Celkové výdaje na zdravotní péči | **696,7 mld. Kč** (necelých 697) | ČSÚ zdravotnické účty, SHA, předběžné 2024 | OK |
| 2 | Na 1 obyvatele | **63 998 Kč** (≈64 tis., +~5 000 Kč vs 2023) | tamtéž | OK |
| 3 | **Podíl na HDP** | **8,6 %** (o 0,2 p.b. více než 2023) | tamtéž — verbatim „…na HDP v roce 2024 tedy dosahoval 8,6 %, což bylo o 0,2 procentního bodu více než v předchozím roce" | OK |
| 4 | Z toho 2023 podíl na HDP | **8,4 %** (= 8,6 − 0,2) | odvozeno z citace výše | OK |
| 5 | Meziroční růst výdajů | **+8,5 %** (≠ podíl na HDP!) | tamtéž | OK |
| 6 | Zdravotní pojišťovny | **514,2 mld. Kč (73,8 %)**, +47,6 mld., růst >10 %, 47 234 Kč/obyv. | tamtéž | OK |
| 7 | Ostatní veřejné zdroje | **81,9 mld. Kč (11,8 %)** | tamtéž | OK |
| 8 | Domácnosti (přímé platby / OOP) | **94,5 mld. Kč (13,6 %)** | tamtéž | OK |
| 9 | Ostatní soukromé | **6,1 mld. Kč (0,9 %)** | tamtéž | OK |
| 10 | Onkologie / kardiovaskulární | **55,8 / 54,2 mld. Kč** | tamtéž | OK |
| 11 | Dlouhodobý růst | **302 mld. (2010) → 697 mld. (2024)** — více než dvojnásobek | tamtéž | OK |

**Antitrap (audit A/D):** „+8,5 % meziroční růst" se NESMÍ zaměnit s „8,6 % podíl
na HDP". Číslo 8,5 je shodou okolností starý titulkový odhad podílu na HDP i nový
meziroční růst — to jsou DVĚ různé veličiny. Verifikováno odděleně.

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR strojově ověřena (PSP / Sbírka zákonů neprůchozí).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **WARM — 11. 6. 2026, MZ ČR/hygiena:** start letní sezony, cestovní medicína,
  podceňování prevence při cestách mimo Evropu. Měkčí, bez jediného tvrdého KPI;
  nevybráno.
- **WARM — 11. 6. 2026, SZÚ:** invazní komáři / klíšťata ve městech — sekundární
  zdroje (iROZHLAS, ČT24), bez primární surveillance vlny. Nevybráno.

## Doporučení pro routing fáze

- **HOT → ARTICLE-REVISE:** `clanek-vydaje-zdravotnictvi.html` — nová vlna ČSÚ
  2024 (publ. 11. 6. 2026) přímo plní otevřenou otázku článku. Sjednotit titulkové
  číslo (8,5 → ověřených **8,6 % HDP za 2024**), dashboard indikátory
  (`vydaje_zdravotnictvi_hdp`, `platba_z_kapsy_pct`) a doplnit nové ověřené
  absolutní hodnoty (696,7 mld. / 64 tis. na osobu / struktura financování).
  **→ ARTICLE-REVISE.** Detail viz `routing-2026-06-12.md`.
- WARM (letní sezona, komáři) — nevybráno.
- COLD — n/a (jasný HOT trigger).
