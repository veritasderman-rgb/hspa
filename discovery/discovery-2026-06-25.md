# Discovery report — 2026-06-25

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh **explicitně a důrazně** zdůraznil: **„Naprosto zásadní je
validace a ověření všech zdrojů!!!!"** 25. 6. 2026 je **čtvrtek**.

Startovní stav: `npm run validate:all` zelené (150 indikátorů, 148 článků prošlo
publikační hygienou). Publikační fronta drží **14 nepublikovaných draftů** do
2026-07-02. Předchozí běh (06-24) uzavřel FALLBACK-AUDIT
`clanek-reforma-pohotovosti-290-2025` (verified, source-verification pass).

## Procházené primární zdroje (stav fetch k 25. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ search 200 | Žádná nová datová vlna NRPZS/NOR/NRH/NRZP. Nejnovější aktivita: čestné členství prof. Duška a Hejduka (10. 6.). Připomínka demografických změn personálu (nedatovaná). **Žádný datový trigger.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ search 200 | Vše známé: reforma zdravotních služeb (pohotovosti, 290/2025 — v korpusu), novela elektronizace (v korpusu), reforma preventivních prohlídek (v korpusu). **Žádná nová TZ s datovým triggerem po 15. 6.** |
| 3 | **ČSÚ — Pohyb obyvatelstva** | csu.gov.cz/rychle-informace + /produkty | ✅ 200 (fetch) | **NOVÁ VLNA / KLÍČOVÝ NÁLEZ.** *Pohyb obyvatelstva — 1. čtvrtletí 2026* (publ. **12. 6. 2026**) + *Pohyb obyvatelstva — rok 2025* (publ. 31. 3. 2026) + analytika „Počet narozených byl loni nejnižší za posledních 240 let". Viz níže. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | — | Beze změny relevantní k 06-18 (sezónní surveillance). Žádná nová primární vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search | Eurostat *Fertility statistics* aktualizováno (EU TFR 2024 = **1,34**, publ. 6. 3. 2026) — verifikační benchmark pro nález #3. HAG 2025 + Country Profile Czechia 2025 stále nejnovější (v korpusu). |
| 6 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ dynamický | Registr výpadků je dynamický (ráno ≠ večer). Žádný strojově ověřený **nový** kritický výpadek netvrdím. |
| 7 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ anti-bot/smíšené | Žádný strojově **jednoznačně nový** normativní akt v gesci MZ ČR po 14. 6. netvrdím. |

## Nové indikátory / datasety — KLÍČOVÝ NÁLEZ

- **ČSÚ: česká porodnost padla na historické minimum.** Nová primárně-zdrojová vlna
  (ČSÚ Pohyb obyvatelstva 2025 + 1Q2026), korpus ji **nepokrývá** samostatným
  článkem ani indikátorem. Všechna čísla ověřena přímo z ČSÚ (3 nezávislé primární
  stránky se shodují) + Eurostat benchmark:

  | metrika | hodnota | zdroj (ověřeno fetch/search) |
  |---|---|---|
  | Živě narození 2025 | **77 600** — nejméně v historii statistiky **od r. 1785** (240 let) | ČSÚ „Počet narozených byl loni nejnižší za posledních 240 let" (31. 3. 2026) |
  | Úhrnná plodnost 2025 | **1,28** dítěte/ženu (4. pokles v řadě) | ČSÚ, tamtéž |
  | Úhrnná plodnost — řada | 2021 **1,83** → 2022 1,62 → 2023 1,45 → 2024 1,37 → 2025 **1,28** | ČSÚ „Porodnost spadla na historické minimum" |
  | Pokles porodnosti | −8 % vs 2024; **−31 % vs 2021** (peak 111,8 tis.) | ČSÚ, tamtéž |
  | Zemřelí 2025 | 113 300; přirozený úbytek **−35 700** = největší převaha úmrtí **od r. 1919** | ČSÚ Pohyb obyvatelstva — rok 2025 |
  | Populace 31. 12. 2025 | 10 915 839 (+6,3 tis. y/y, **výhradně migrací** +42 tis.) | ČSÚ, tamtéž |
  | Q1 2026 (pokračování) | nar. 17,5 tis. (−6 % y/y), zemř. 30,1 tis., přir. úbytek −12,6 tis., migrace −7,3 tis., pop. 10,896 mil. | ČSÚ Pohyb obyvatelstva — 1Q2026 (12. 6. 2026) |
  | Prům. věk matky při 1. dítěti | 29,2 let (všechny porody 30,6) | ČSÚ |
  | Projekce bezdětnosti | **38 %** žen by zůstalo bezdětných, pokud by plodnost 2025 přetrvala | ČSÚ |
  | Regionální minimum | Praha + Karlovarský kraj **pod 1,2** | ČSÚ |
  | **Benchmark EU** | EU TFR 2024 = **1,34** (z 1,38 v 2023; nejníže od 2001) | Eurostat „EU fertility rate at 1.34… in 2024" (6. 3. 2026) |

## Nové legislativní normy / sněmovní tisky

- Bez strojově jednoznačně **nového** normativního aktu v gesci MZ ČR k 25. 6. 2026.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- Hlavní HOT trigger = **ČSÚ porodnost / přirozený úbytek** (viz výše). Demografický
  vstup, který určuje budoucí poptávku i financování zdravotního systému.

## Aktualizace existujících dat (vlna)

- ČSÚ Pohyb obyvatelstva 2025 + 1Q2026 — viz nález #3.
- Eurostat Fertility statistics (EU TFR 2024 1,34) — benchmark.

## Verifikace proti primárním zdrojům (provedeno tento běh)

- **ČSÚ Pohyb obyvatelstva 1Q2026** (WebFetch landing): pop 10,896 mil., −19,8 tis.,
  nar. 17,5 tis. (−6 %), zemř. 30,1 tis., přir. −12,6 tis., migrace −7,3 tis. ✅
- **ČSÚ Pohyb obyvatelstva rok 2025** (WebFetch landing): nar. 77,6 tis. (historické
  minimum), zemř. 113,3 tis., přir. −35,7 tis. (od 1919), pop. 10 915 839, sňatky
  42,5 tis. ✅
- **ČSÚ „Počet narozených nejnižší za 240 let"** (WebFetch): „vůbec nejnižší hodnota
  v historii statistického zjišťování od roku 1785"; TFR 1,28; −8 % vs 2024; −31 %
  vs 2021 (111,8 tis.); prům. věk matky 1. dítě 29,2 / vše 30,6; 38 % bezdětnost;
  Praha + KV pod 1,2. ✅
- **ČSÚ „Porodnost spadla na historické minimum"** (WebSearch): řada TFR 2021 1,83 →
  2022 1,62 → 2023 1,45 → 2024 1,37 → 2025 1,28. ✅
- **Eurostat Fertility statistics** (WebSearch): EU TFR 2024 1,34 (z 1,38 2023,
  nejníže od 2001); EU 2021 peak 1,53; 2024 v ČR 1,37 ≈ EU 1,34 (klíčový honest
  framing: ČR **není** dramaticky pod EU; story je trajektorie a absolutní 240letý
  rekord, ne „nejhorší v EU"). ✅

## Doporučení pro routing fáze

- HOT (nový indikátor + nový článek): **úhrnná plodnost / porodnost na historickém
  minimu** → INDICATOR-ADD (`uhrnna_plodnost`) + ARTICLE-WRITE. Mezera v korpusu:
  publikované články pokrývají *důsledky* demografie (`narok-pojistence-2-demograficky-tlak`,
  `reforma_dlouhodobe_pece_2026`, `deficit-pojisteni-2026`), ale **ne kořenovou
  demografickou vstupní veličinu** (porodnost / TFR / přirozený úbytek).
- WARM: žádný nový tvrdý revizní trigger nad rámec 06-18/06-24.
- COLD: ostatní.
