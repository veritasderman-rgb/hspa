# Discovery report — 2026-06-16

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a
ověření všech zdrojů!!!!"** 16. 6. 2026 je **úterý**.

Startovní stav: `npm run validate:all` zelené (143 indikátorů, 132 článků prošlo
publikační hygienou). `npm test` 489 pass / 8 fail — 8 selhání jsou známé
environment-failures (chybějící optional deps `csv-parse`, `xlsx`, `cheerio`,
`@anthropic-ai/sdk`: testy `csu`, `csu_sha`, `indiko`, `puk`, `sukl`, `sukl_mr`,
`uzis_nzis`, `social-distribution`), ne obsahové — shodné s během 06-15 (po plné
`npm install` 586/586).

## Procházené primární zdroje (stav fetch k 16. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější **15. 6.** — Národní registr pitev a toxikologických vyšetření přidal položky *salbutamol* a *syntetické kanabinoidy – PINACA* na číselník látek. Jde o rozšíření číselníku registru, **ne novou datovou vlnu** s implikací pro výkonnost systému. Po 5. 5. (prodloužení sběru výkazů) žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **15. 6.** ministr Vojtěch na Radě EU v Lucemburku (dostupnost léčiv / podpora inovací — agenda, ne datová vlna). 14. 6. „+24 mld pro 2027" (již zpracováno během 06-15 → revize `platba-statu-statni-pojistenci`). Po 14. 6. žádná nová TZ s datovým triggerem. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | Beze změny od 06-15: nejnovější 12. 6. (Pohyb obyvatelstva 1Q2026), 11. 6. zdravotnické účty 2024 („64 tis. Kč/os"). Žádná nová mortalitní/EHIS vlna. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | **15. 6. „Generace vapingu: ve věku 15–24 let užívá e-cigarety alespoň jednou měsíčně každý čtvrtý"** + 8. 6. „~40 % mladých Čechů užívá nikotinové produkty". Jde o **komunikační re-prezentaci dat NAUTA 2025** (publ. 29. 5.), které jsou **již v korpusu** (`clanek-koureni` publ., `clanek-koureni-adolescenti` ve frontě). Ne nová primární vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) nejnovější, již v korpusu. Žádná nová `hlth_*` vlna s ČR-implikací; Eurostat excess-mortality Q1 2026 bez dedikované ČR-vlny vyžadující článek. |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ 403/anti-bot | zakonyprolidi.cz/cs/aktualne → HTTP 403. Žádný strojově ověřený **nový** normativní akt v gesci MZ ČR po 8.–14. 6. netvrdím. |
| 7 | **SÚKL — výpadky léčiv** | sukl.gov.cz | — | Registr výpadků strojově nedohledán (anti-bot). Žádný nový výpadek netvrdím. |
| 8 | **ECDC** (AMR/AMC surveillance) | ecdc.europa.eu | ✅ 200 + PDF | **NÁLEZ K AUDITU: ESAC-Net Annual Epidemiological Report za rok 2024 publikován 18. 11. 2025** — nová vlna spotřeby ATB, kterou dotčený publikovaný článek `clanek-spotreba-antibiotik` (postavený celý na vlně 2023) dosud nereflektuje. Viz níže. |

## Nové indikátory / datasety

- (žádný nový indikátor)

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 16. 6. 2026.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Úterý.** Žádný nový tvrdý primárně-doložitelný HOT trigger pro **nový** článek.
  Vapingová položka SZÚ 15. 6. je re-prezentace dat NAUTA 2025 (v korpusu).
  Rozhodnutí vlády +24 mld (8. 6.) zpracováno během 06-15. Fronta drží
  16 nepublikovaných draftů → 17. tenký článek by byl „zbytečná změna".

## Aktualizace existujících dat (vlna) — KLÍČOVÝ NÁLEZ

- **ECDC ESAC-Net AER za rok 2024** (publ. **18. 11. 2025**,
  ecdc.europa.eu/en/publications-data/antimicrobial-consumption-eueea-esac-net-annual-epidemiological-report-2024).
  Ověřeno přímo z primárního PDF (`ESAC-Net-AER-2024_rev2.pdf`, dekomprese
  FlateDecode streamů):
  - **Komunitní** sektor: EU/EEA populačně vážený průměr **18,8 DDD/1000/den**
    (rozpětí 9,0–27,8) za 2024 — proti 18,3 ve vlně 2023.
  - **Nemocniční** sektor: EU/EEA průměr **1,67 DDD/1000/den** (rozpětí
    0,79–**2,50**), kde **2,50 = Česko = stále nejvyšší v EU/EEA**.
  - **Total** (komunita + nemocnice): EU/EEA **20,3 DDD**; cíl EU 2030 = 15,9.
  - **Methodology caveat (zásadní):** *„Czechia and Greece changed their data
    collection process during the period, which could have an impact on
    comparability with previous years"* a *„data for Czechia were imputed for all
    population-weighted mean calculations for ATC J01 included in this report."*
    → **rok 2023 (ČR komunita 15,0 DDD) zůstává poslední přímo srovnatelnou
    pozorovanou hodnotou ČR.** Nová vlna 2024 se proto promítá jako
    **disclosure + aktualizace EU/EEA benchmarku + caveat**, nikoli jako
    přepsání ČR headline čísla (to by porušilo zákaz míchání nesrovnatelných
    metodik).

## Doporučení pro routing fáze

- **Žádný HOT trigger pro nový článek** (úterý; vaping i +24 mld saturované;
  legislativa bez nového aktu; fronta 16 draftů).
- **→ FALLBACK-AUDIT / ARTICLE-REVISE** `clanek-spotreba-antibiotik.html` —
  je **zároveň** (a) nejstarší auditovaný publikovaný článek s audit YAML
  (`last_reviewed: 2026-05-16`, dnes přesně 31 dní > 30), (b) nejhustší
  číslo+benchmark článek (priorita #2 — riziko nepřesnosti) **A ZÁROVEŇ**
  (c) přímo dotčený čerstvě ověřenou novou vlnou ECDC ESAC-Net 2024.
  Ideální průnik fallback priorit #2 a #3, plně v souladu s explicitním
  požadavkem uživatele na **ověření všech zdrojů**. Detail viz
  `routing-2026-06-16.md`.
