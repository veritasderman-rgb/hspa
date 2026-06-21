# Discovery report — 2026-06-21

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh opět explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**

21. 6. 2026 je **neděle**. Poslední discovery report v repu = 2026-06-20
(FALLBACK-AUDIT clanek-prezit-rakoviny). Startovní stav: `npm run validate:all`
zelené (146 indikátorů, 144 článků prošlo publikační hygienou); `npm test`
589/589 pass. Žádná regrese.

## Procházené primární zdroje (stav fetch k 21. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější **15. 6.** (NRPATV číselník toxikologie — salbutamol + syntetické kanabinoidy; registrová údržba, bez HSPA-implikace). 10. 6. čestná členství. **Žádná nová datová vlna od posledního běhu.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější **18. 6.** „Rekordní shoda: DŘ 2027" (zpracováno 19. 6.). 15. 6. ministr v Lucemburku, 14. 6. +24 mld (v korpusu). **Nic nového po 18. 6.** |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 19. 6. newsletter 25/2026; 18. 6. Statistika & My; 17. 6. ekonomika Q1; 16. 6. Demografie 2/2026 (journal); 11. 6. „Zdravotní péče 2024 = 64 tis. Kč/os." (rutinní SHA). **Žádná nová indikátorová vlna.** |
| 4 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ 200 | Nejnovější ucelená vlna = Health at a Glance 2025 + Country Health Profile 2025 (12/2025, reflektováno). Eurostat HLY poslední řez = 2023. Žádná nová vlna v 6/2026. |
| 5 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 | Bez strojově ověřeného **nového** tisku v gesci MZ ČR po 14. 6. (komplexní novela zákona o zdravotních službách už schválena, v korpusu). |
| 6 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ jen sekundární | Žádný strojově ověřený **nový** kritický výpadek s konkrétním datem za poslední ~3 dny. Probíhající výpadky (Exacyl, Tisercin aj.) jsou sekundární/nedatované, bez nového eventu. |
| 7 | **zakonyprolidi.cz — aktuálně** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | Anti-bot. Žádný nový normativní akt v gesci MZ ČR netvrdím. Úhradová vyhláška 2027 přijde do konce října 2026. |

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal;
  Eurostat HLY beze změny (poslední řez 2023).

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 21. 6. 2026.

## Aktualizace existujících dat / dění (vlna)

- Žádná nová vlna od běhu 20. 6. Výsledek DŘ 2027 (18. 6.) zpracován 19. 6.
  (clanek-dohodovaci-rizeni-2027-vysledek, ve frontě na 2026-07-02).

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný event.
- **WARM:** žádný živý článek nevyžaduje akutní revizi kvůli nové vlně.
- **COLD → FALLBACK-AUDIT:** discovery bez nového dění → audit nejstaršího
  auditovaného článku (`last_reviewed` > 30 dní). Po včerejším auditu
  clanek-prezit-rakoviny (→ 2026-06-20) jsou nejstarší dva články z **2026-05-14**
  (38 dní): `clanek-nadeje-doziti-zdravi` a `clanek-vakcinace`. Vybrán
  **clanek-nadeje-doziti-zdravi** — je číselně nejhustší (HLY, naděje dožití,
  multimorbidita, mezinárodní srovnání 6 zemí) → nejvyšší riziko nepřesnosti
  a ideální cíl pro source-verification proti Eurostatu (priorita #2 fallbacku).
