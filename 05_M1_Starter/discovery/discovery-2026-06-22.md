# Discovery report — 2026-06-22

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh opět explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**

22. 6. 2026 je **pondělí**. Poslední discovery report v repu = 2026-06-21
(FALLBACK-AUDIT clanek-nadeje-doziti-zdravi). Startovní stav: `npm run validate:all`
zelené (147 indikátorů, 145 článků prošlo publikační hygienou); `npm test`
492/500 pass — 8 selhání jsou výhradně chybějící volitelné npm balíčky v sandboxu
(csv-parse, xlsx, cheerio, @anthropic-ai/sdk), nikoli regrese; všechny logické
testy procházejí. Žádná regrese mého běhu.

## Procházené primární zdroje (stav fetch k 22. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější stále **15. 6.** (NRPATV číselník toxikologie — salbutamol + syntetické kanabinoidy; registrová údržba, bez HSPA-implikace). 10. 6. čestná členství. **Žádná nová datová vlna od posledního běhu.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější **18. 6.** „Rekordní shoda: DŘ 2027" (12/15 segmentů; zpracováno 19. 6.). 15. 6. ministr v Lucemburku, 14. 6. +24 mld (v korpusu), 10. 6. MoodPass / kompenzace nelékařů, 9. 6. Centrum duševního zdraví VFN. **Nic nového po 18. 6.** |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 16. 6. Demografie 2/2026 (journal); 12. 6. Pohyb obyvatelstva Q1 2026; 11. 6. „Zdravotní péče 2024 = 64 tis. Kč/os." (rutinní SHA, v korpusu). **Žádná nová indikátorová vlna.** |
| 4 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ 200 | Nejnovější ucelená vlna = Health at a Glance 2025 + Country Health Profile 2025 (11–12/2025, reflektováno). Žádná nová vlna v 6/2026. |
| 5 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 | Bez strojově ověřeného **nového** tisku v gesci MZ ČR po 14. 6. |
| 6 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ jen sekundární | Žádný strojově ověřený **nový** kritický výpadek s konkrétním datem za poslední dny. |
| 7 | **zakonyprolidi.cz — aktuálně** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | Anti-bot. Žádný nový normativní akt v gesci MZ ČR netvrdím. |

## Prošetřená stopa (postoperative sepsis)

WebSearch upozornil na „pooperační sepse" jako první indikátor použitelný pro
úhradu podle kvality (VBHC), publikovaný počátkem 6/2026 na PUK portálu
(puk.kancelarzp.cz, MZ ČR TZ, zdravezpravy.cz 3. 6.). **Není to nový nepokrytý
event** — korpus ho už pokrývá: `clanek-pooperacni-sepse-2026.html`. Bez akce.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 22. 6. 2026.

## Aktualizace existujících dat / dění (vlna)

- Žádná nová vlna od běhu 21. 6. Výsledek DŘ 2027 (18. 6.) zpracován 19. 6.

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný event.
- **WARM:** žádný živý článek nevyžaduje akutní revizi kvůli nové vlně.
- **COLD → FALLBACK-AUDIT:** discovery bez nového dění → audit nejstaršího
  auditovaného článku (`last_reviewed` > 30 dní). Po včerejším auditu
  clanek-nadeje-doziti-zdravi je nejstarší **clanek-vakcinace** (last_reviewed
  2026-05-14, 39 dní) — číselně hustý (MMR, chřipka 65+, HPV, regiony,
  mezinárodní srovnání Itálie/Francie/UK) → nejvyšší riziko nepřesnosti a
  ideální cíl pro source-verification (priorita #2 fallbacku).
