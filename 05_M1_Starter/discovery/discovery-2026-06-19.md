# Discovery report — 2026-06-19

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh opět explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**

19. 6. 2026 je **pátek**. Poslední discovery report v repu = 2026-06-17
(ARTICLE-REVISE clanek-deficit-pojisteni-2026, propsání rozhodnutí vlády 8. 6.).

Startovní stav: `npm run validate:all` zelené (146 indikátorů, 143 článků prošlo
publikační hygienou; strategie 36, explainery 35, prevence 9, dohodovací řízení
9 dimenzí / 44 sad, financing OK, clinical-quality 35). Fronta: 98 published,
17 draftů. Žádná regrese.

## Procházené primární zdroje (stav fetch k 19. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější **15. 6.** (NRPATV číselník toxikologie — salbutamol + syntetické kanabinoidy; registrová údržba, **bez HSPA-implikace**). 10. 6. čestná členství. **Žádná nová datová vlna.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **18. 6.: „Rekordní shoda ve zdravotnictví: Dohodovací řízení pro rok 2027 bylo jedním z nejúspěšnějších v historii"** — KLÍČOVÝ NÁLEZ (viz níže). 12. 6. eHealth (ověřování zbrojních průkazů). 10. 6. MoodPass (už v korpusu jako draft). |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | **11. 6.: „Zdravotní péče v roce 2024 stála 64 tisíc korun na osobu"** (TZ k výdajům — SHA, rutinní roční); 12. 6. Pohyb obyvatelstva Q1 2026; 16. 6. Demografie 2/2026 (journal). Žádná nová indikátorová vlna nad rámec zachyceného. |
| 4 | **VZP — aktuality** | vzp.cz/o-nas/aktuality | ✅ 200 | „VZP se dohodla se šesti segmenty, dohodovací řízení skončilo" — strana segmentové dohody k DŘ 2027 (komplement k MZ TZ). |
| 5 | **PSP ČR / Sbírka** | psp.cz, zakonyprolidi.cz | ⚠️ 403 | psp.cz historie 403 (anti-bot). Žádný strojově ověřený **nový** normativní akt v gesci MZ ČR po 14. 6. netvrdím. |

## Aktualizace existujících dat / dění (vlna)

- **DOHODOVACÍ ŘÍZENÍ 2027 UKONČENO 18. 6. 2026 — REKORDNÍ POČET DOHOD.**
  MZ ČR (primární TZ, 18. 6.): *„Zástupci poskytovatelů zdravotních služeb
  a zdravotních pojišťoven dospěli k dohodě ve 12 z 15 segmentů, přičemž v jednom
  případě byla uzavřena částečná dohoda."* → **3 segmenty bez dohody**.
  - **Finanční podmínka (verbatim TZ):** *„V rámci závěrečného jednání byla
    z uzavřených dohod vypuštěna podmínka navýšení platby za státní pojištěnce
    o 25 miliard korun. Uzavřené dohody tak zůstávají platné i při aktuálně
    schváleném navýšení této platby o 21 miliard korun."*
  - **Úhradová vyhláška (verbatim TZ):** *„Úhradová vyhláška pro rok 2027 bude
    zveřejněna ve Sbírce zákonů do konce října letošního roku."*
  - **3 nedohodnuté segmenty** (konvergentně MZ + nasezdravotnictvi.cz): akutní
    lůžková péče, následná lůžková péče, ambulantní specialisté — podle
    nasezdravotnictvi.cz **> 60 % nákladů systému** (sekundární, atribuovat).
  - **Kontrast s 2026 (MZ ČR Výsledky DŘ 2026, primární):** v DŘ na rok 2026
    dohoda jen ve **3 z 15** segmentů (gynekologie, stomatologie, lékárenská
    péče). Skok 3/15 → 12/15 = jádro „rekordnosti".
  - **Vazba na korpus:** přímo navazuje na rozhodnutí vlády 8. 6. 2026 o +24 mld
    (21 mld valorizace platby státu + 3 mld přesun) — to je ta „aktuálně schválená"
    valorizace 21 mld, na kterou jsou dohody navázány (clanek-deficit-pojisteni-2026
    aktualizován 17. 6.; clanek-platba-statu-statni-pojistenci 15. 6.).
  - **Mezera v korpusu:** žádný článek nepokrývá **výsledek** DŘ 2027 (event z 18. 6.).
    `clanek-financovani-segmenty-2026` (= „Kam plyne 459 miliard", publ. 11. 5.)
    popisuje *strukturu* výdajů, ne *výsledek* vyjednávání 2027.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal;
  ČSÚ „64 tis. Kč/osobu 2024" = rutinní roční SHA TZ (lze využít jako kontext, ne nový indikátor).

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 19. 6. 2026.
  Úhradová vyhláška 2027 teprve přijde (Sbírka zákonů do konce října 2026) —
  zatím **avizovaný termín**, ne vyhlášený akt.

## Doporučení pro routing fáze

- **HOT (aktuální dění, primárně doložitelné):** výsledek DŘ 2027 (18. 6.) —
  čerstvý event, primární zdroj (MZ TZ + VZP), silná HSPA-finanční implikace,
  ověřitelný kontrast 3/15 → 12/15, genuine mezera v korpusu. → **ARTICLE-WRITE.**
- WARM: žádný zastaralý živý článek nevyžaduje akutní revizi (deficit/platba-statu
  aktualizovány 15.–17. 6.).
- COLD: n/a — máme HOT.
