# Discovery report — 2026-06-24

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh opět explicitně zdůraznil: **„Naprosto zásadní je validace
a ověření všech zdrojů!!!!"**

24. 6. 2026 je **středa**. Poslední discovery report v repu = 2026-06-23
(FALLBACK-AUDIT clanek-cmp-iktova-centra). Startovní stav: `git` na úrovni
origin/main (001ebf7 „data: refresh 2026-06-23"); `npm run validate:all` zelené
(149 indikátorů, 147 článků prošlo publikační hygienou). Publikační fronta drží
**14 nepublikovaných verified draftů** (scheduled_for 2026-06-30 → 2026-07-02,
další volný slot 2026-07-03).

## Procházené primární zdroje (stav fetch k 24. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější stále **15. 6.** (NRPATV číselník toxikologie — salbutamol + synt. kanabinoidy; registrová údržba, bez HSPA-implikace). 10. 6. čestné členství Dušek/Hejduk (personální). **Žádná nová datová vlna od posledního běhu.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější **18. 6.** „Rekordní shoda: DŘ 2027" (zpracováno). 15. 6. Vojtěch Rada EU Lucemburk; 14. 6. „+24 mld pro 2027"; 12. 6. eZdraví. Nic nového po 18. 6. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | **23. 6.** kriminalita 2025 (ne zdravotnictví); 19. 6. Newsletter 25/2026; 17. 6. HDP 1Q; 16. 6. Demografie 2/2026 (journal). **Žádná nová indikátorová/mortalitní/EHIS vlna.** |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | Položky 17.–23. 6. jsou sezónní/sekundární (vedra, klíšťata, STI rozhovor iROZHLAS, pitný režim). Žádná nová primární surveillance vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search (OECD article URL 403 anti-bot) | Nejnovější ucelená vlna = Health at a Glance 2025 + Country Health Profile Czechia 2025, oba v korpusu. **Eurostat `hlth_hlye` (Healthy Life Years)** metadata-touch 15. 6. 2026, ale **referenční rok stále 2023** (DDN z 8. 8. 2025) → **ne nová vlna**, jen údržba metadat. Žádná nová `hlth_*` vlna s ČR-implikací. |
| 6 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 | Bez strojově ověřeného **nového** tisku v gesci MZ ČR po 14. 6. |
| 7 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 anti-bot | Strojově nedostupné (konzistentní s předchozími běhy). Žádný nový normativní akt v gesci MZ ČR netvrdím. Pro legislativní verifikaci použity náhradní oficiální zdroje (PSP, e-Sbírka přes search, ASPI). |

## Prošetřená stopa (post-operative sepsis / PUK)

WebSearch vrátil MZ ČR TZ „Když data chrání pacienty: Česko otevírá výsledky
pooperačních sepsí" (puk.kzp.cz). Fetch potvrdil **datum publikace 2. 6. 2026**,
data: 2,75 mil. hospitalizací 2020–2024, národní referenční hodnota **0,84 %**
(> 5 000 sepsí ročně), ~30 poskytovatelů > 1,2 %. **Korpus téma plně pokrývá:**
`clanek-pooperacni-sepse-2026.html` (titulek „0,84 % a přes 5 000 případů ročně")
+ kontext v `clanek-nikez-jak-funguje-2026` a `clanek-data-leci-cesko-2026`.
Není to nový gap.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal;
  Eurostat hlth_hlye = metadata touch bez nové vlny (ref. rok stále 2023).

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 24. 6. 2026.

## Aktualizace existujících dat / dění (vlna)

- Žádná nová vlna od běhu 23. 6. Žádný nový primárně-doložitelný HOT trigger.

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný event pro nový článek (fronta drží
  14 verified draftů do 2. 7., 15. tenký článek = „zbytečná změna" proti
  železnému pravidlu kvality).
- **WARM:** žádný živý článek nevyžaduje akutní revizi kvůli nové vlně.
- **COLD → FALLBACK-AUDIT:** discovery bez nového dění → audit publikovaného
  článku **bez audit bloku** s nejvyšší prioritou „legislativa" (fallback
  priorita #1). Kandidáti bez parsovatelného audit bloku: `clanek-reforma-pohotovosti-290-2025`
  (verified, **legislativa** — zákon 290/2025 Sb.) a `clanek-ai-act-zdravotnictvi-srpen-2026`
  (verified). Vybrán **clanek-reforma-pohotovosti-290-2025** — legislativně
  nejhustší (zákon + 2 vyhlášky + sněmovní proces + síťová čísla), priorita #1
  „aktuální legislativa" → ideální cíl pro nezávislou source-verification.
