# Discovery report — 2026-06-18

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a
ověření všech zdrojů!!!!"** 18. 6. 2026 je **čtvrtek**.

Startovní stav: `npm run validate:all` zelené (143 indikátorů, 134 článků prošlo
publikační hygienou). Publikační fronta drží **15 nepublikovaných verified draftů**
do 2026-07-01. Předchozí běh (06-16) uzavřel REVISE `clanek-spotreba-antibiotik`
(ESAC-Net AER 2024) — ověřeno v gitu (commity `7f1e2ad`, `206132b`, `14e73f8`).

## Procházené primární zdroje (stav fetch k 18. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny od 06-16: nejnovější **15. 6.** NRPATV přidal *salbutamol* + *syntetické kanabinoidy PINACA* do číselníku látek (rozšíření číselníku, **ne nová datová vlna**). Žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **15. 6.** Vojtěch na Radě EU v Lucemburku (agenda dostupnost léčiv); 14. 6. „+24 mld pro 2027" (zpracováno 06-15); 12. 6. eZdraví (ověření zbroj. oprávnění / řidičská způsobilost). Po 15. 6. žádná nová TZ s datovým triggerem. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | **17. 6.** HDP 1Q2026 (ekonomika, ne zdravotnictví); 16. 6. časopis *Demografie* 2/2026 + ceny výrobců; 11. 6. zdravotnické účty 2024 (64 tis. Kč/os, zpracováno). Žádná nová mortalitní/EHIS vlna. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | **17. 6.** infikovaná klíšťata ve velkých městech (sezónní surveillance, drobné); 15. 6. „Generace vapingu 15–24" (re-prezentace NAUTA 2025, v korpusu); vlny veder (Zdravotnický deník — sekundární). Ne nová primární vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) stále nejnovější, v korpusu. Žádná nová `hlth_*` vlna s ČR-implikací. WHO/Europe 11.–15. 6.: digitální zdraví, vlny veder (200k úmrtí v Evropě/4 roky — regionální téma, ne ČR primární vlna). |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ anti-bot | psp.cz historie.sqw → „tisk nenalezen"; zakonyprolidi/e-sbírka strojově neověřeno. Žádný strojově ověřený **nový** normativní akt v gesci MZ ČR po 14. 6. netvrdím (úhradová vyhláška 432/2025 z 10/2025 = známá). |
| 7 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ 404 | Registr výpadků strojově nedohledán. Žádný nový výpadek netvrdím. |

## Nové indikátory / datasety

- (žádný nový indikátor)

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 18. 6. 2026.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Čtvrtek.** Žádný nový tvrdý primárně-doložitelný HOT trigger pro **nový** článek.
  Vše saturováno / v korpusu / ve frontě (15 verified draftů do 1. 7.). Psát 16.
  tenký článek by byl „zbytečná změna" proti železnému pravidlu kvality.

## Aktualizace existujících dat (vlna) — KLÍČOVÝ NÁLEZ

- **Datový drift mezi publikovaným článkem a ŽIVÝM ověřeným dashboardem.**
  `clanek-hospitalizujeme-nejvic` (poslední audit 2026-05-16, **33 dní** > 30,
  publikovaný, nejstarší auditovaný + nejhustší na čísla/benchmarky → fallback
  priorita #2 „riziko nepřesnosti") byl auditován v době, kdy klíčové indikátory
  měly `origin: seed`. Mezitím ingest pipeline (fetched 2026-06-16) přepnula
  tři z nich na `origin: live` + `verification_status: verified`:

  | indikátor | hodnota v článku (05-16, seed) | ŽIVÁ ověřená hodnota (dashboard) | zdroj live |
  |---|---|---|---|
  | `hospitalizace_na_100k` | **18 800** /100k, „origin: seed, vyžaduje re-validaci" | **17 989,8** /100k (2024), **live, verified** (verified_at 2026-06-01) | ÚZIS · NRH, fetched 2026-06-16 |
  | `postele_akutni_per_1000` | deck **4,1** /1000 | **4,0** /1000 (2023), **live, verified** | OECD Health Statistics (curative beds), fetched 2026-06-16 |
  | `luzka_jip_per_100k` | 44,6 /100k (správně), ale „origin: seed" | **44,61** /100k (2023), **live, verified** (verified_at 2026-06-10) | OECD Health Statistics (adult ICU) |

  Trend `hospitalizace_na_100k` (ověřeno z dashboardu): 2020 16 379 → 2022 17 887
  → 2023 17 988 → 2024 **17 990**. Headline článku „**Devatenáct tisíc**" (≈19 000)
  i deck „18 800" jsou tedy **vyšší než ověřená živá hodnota** (17 990 ≈ 18 000)
  o ~800–1 000 / 100k. Železné pravidlo → musí se opravit směrem k ověřené hodnotě.

- **Sekundární nález (vizuální nekonzistence):** hero **counter-grid** téhož článku
  stále nese čísla z **OECD Health at a Glance 2023** (22/100 obyv., 6,6 lůžek vs
  OECD 4,3, ALOS ČR 6,4 vs OECD 7,2, ~13 % ACSC) — přímo **protiřečí** auditovanému
  tělu (HAG 2025: 4,0 lůžka, ACSC 592/473) a **cituje superseded edici**. Audit
  05-16 opravil prózu, ale nejvýraznější vizuál (animovaný KPI grid) ponechal stálý.

## Verifikace proti primárním zdrojům (provedeno tento běh)

- **OECD Czechia Country Health Profile 2025** (PDF stažen, dekomprese FlateDecode):
  CID-subsetted fonty → tabulky strojově nečitelné jako text (stejná limitace jako
  06-16). Ověřeno proto přes text-vracející OECD landing/search:
  **ČR 6,4 nemocničních lůžek / 1 000 vs OECD průměr 4,2** (HAG 2025) — shoduje se
  s databoxem článku.
- **Dashboard `data/indicators.json`** (ověřeno přímo): hospitalizace 17 990 (2024,
  live, verified), akutní lůžka 4,0 (2023, live, verified), JIP 44,61 (2023, live,
  verified), ACSC 592 vs 473 (2022, seed), ALOS 7 vs 6,5 (seed — jediný zbývající
  seed v clusteru).

## Doporučení pro routing fáze

- HOT (nový indikátor): žádné
- HOT (aktuální dění → nový článek): žádné (fronta 15 draftů, žádný tvrdý trigger)
- WARM (revize publikovaného článku zastaralého kvůli datovému driftu):
  **`clanek-hospitalizujeme-nejvic`** — seed→live drift centrálního KPI + stálý
  hero grid z HAG 2023. → **ARTICLE-REVISE / FALLBACK-AUDIT**
- COLD: ostatní 05-16 články (sledovat příští běhy)
