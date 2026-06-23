# Discovery report — 2026-06-23

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh opět explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**

23. 6. 2026 je **úterý**. Poslední discovery report v repu = 2026-06-22
(FALLBACK-AUDIT clanek-vakcinace). Startovní stav: `git` na úrovni origin/main
(0798f5f); `npm run validate:all` zelené (148 indikátorů, 146 článků prošlo
publikační hygienou); `npm test` 492/500 pass — 8 selhání jsou výhradně chybějící
volitelné npm balíčky v sandboxu (csv-parse, xlsx, cheerio), nikoli regrese.

## Procházené primární zdroje (stav fetch k 23. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější stále **15. 6.** (NRPATV číselník toxikologie — salbutamol + synt. kanabinoidy; registrová údržba, bez HSPA-implikace). **Žádná nová datová vlna od posledního běhu.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější **18. 6.** „Rekordní shoda: DŘ 2027" (zpracováno 19. 6.). Nic nového po 18. 6. |
| 3 | **MZ ČR — všechny novinky** | mzd.gov.cz/vsechny-novinky/ | ✅ 200 | **20. 6.** rozhovor s ministrem A. Vojtěchem („Plánuji zůstat celé čtyři roky") — politicko-osobní rozhovor, NE primárně-datový event (železné pravidlo → hodnotový/politický obsah, neaudituje se, není HSPA-actionable). 19. 6. kvalita vody ke koupání (odkaz na data SZÚ k 15. 6., sezónní). |
| 4 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 19. 6. Newsletter 25/2026; 16. 6. Demografie 2/2026 (journal); 11. 6. „Zdravotní péče 2024 = 64 tis. Kč/os." (v korpusu). **Žádná nová indikátorová vlna.** |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ (OECD article URL 403 anti-bot) | Nejnovější ucelená vlna = Health at a Glance 2025 + Country Health Profile 2025. Žádná nová vlna v 6/2026. |
| 6 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 | Bez strojově ověřeného **nového** tisku v gesci MZ ČR po 14. 6. |
| 7 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ anti-bot | Žádný nový normativní akt v gesci MZ ČR netvrdím. |

## Prošetřená stopa (stroke / CMP PUK data)

WebSearch vrátil PUK TZ „Když data zachraňují životy: Česko otevírá výsledky
léčby cévních mozkových příhod" (puk.kancelarzp.cz/sada-ukazatelu-kvality-pece-o-pacienty-s-cmp/).
Fetch potvrdil **datum publikace 10. 2. 2026** — není to nový event. Korpus
téma pokrývá: `clanek-cmp-iktova-centra.html`. **Stopa však vedla k auditnímu
nálezu** (viz routing): tento článek nesl zastaralou centrální hodnotu.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 23. 6. 2026.

## Aktualizace existujících dat / dění (vlna)

- Žádná nová vlna od běhu 22. 6. Jediný nový item (20. 6. rozhovor ministra) je
  politicko-osobní, ne datový.

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný event.
- **WARM:** žádný živý článek nevyžaduje akutní revizi kvůli nové vlně.
- **COLD → FALLBACK-AUDIT:** discovery bez nového dění → audit nejstaršího
  needitovaného článku. Dva publikované články **nemají audit blok vůbec**
  (last_reviewed neparsovatelné): `clanek-cmp-iktova-centra` (review-pending) a
  `clanek-reforma-pohotovosti-290-2025` (verified). Vybrán **clanek-cmp-iktova-centra**
  — review-pending, numericky nejhustší (mortalita po CMP vs OECD), topicky živý
  (PUK CMP portál) → nejvyšší riziko nepřesnosti a ideální cíl pro source-verification.
