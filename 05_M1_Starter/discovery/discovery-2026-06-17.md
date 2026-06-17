# Discovery report — 2026-06-17

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh opět explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**

17. 6. 2026 je **středa**. Poslední discovery report v repu = 2026-06-14;
mezi tím proběhl běh 15. 6. (doložen audit-stopou v
`clanek-platba-statu-statni-pojistenci.html`, discovery soubor 06-15/06-16 chybí).

Startovní stav: `npm run validate:all` zelené (144 indikátorů, 133 článků prošlo
publikační hygienou); `npm test` 489 pass / 8 fail — všech 8 selhání je
pre-existing (chybějící optional deps `csv-parse` / `xlsx` v offline prostředí,
viz CLAUDE.md), žádná regrese.

## Procházené primární zdroje (stav fetch k 17. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější **15. 6.** — nové položky v NRPATV (salbutamol + syntetické kanabinoidy do číselníku toxikologie). Registrová údržba, **bez HSPA-implikace / bez nové datové vlny**. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější **15. 6.** (min. Vojtěch — Rada EU Lucemburk, dostupnost léčiv/inovace — forward-looking, zatím bez domácího doložitelného faktu). **14. 6.: „Opatření schválené vládou posílí zdravotnictví o 24 miliard korun"** — viz níže (klíčový nález). |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | Nejnovější **16. 6.** — nové číslo časopisu *Demografie 2/2026* (recenzovaný journal; rutinní, ne datová vlna s indikátorovou implikací). |
| 4 | **PSP ČR / Sbírka** | psp.cz, zakonyprolidi.cz | ⚠️ 403 | psp.cz historie 403 (anti-bot). Žádný strojově ověřený **nový** normativní akt v gesci MZ ČR po 14. 6. netvrdím. |
| 5 | **vláda.gov.cz** | vlada.gov.cz/cz/media-centrum/aktualne | ✅ 200 (listing) | Listing nezobrazil detail; rozhodnutí vlády o +24 mld ověřeno přes konvergentní zdroje (viz níže). |

## Aktualizace existujících dat / dění (vlna)

- **ROZHODNUTÍ VLÁDY 8. 6. 2026 — mimořádné posílení systému o +24 mld Kč pro 2027.**
  Z toho **21 mld** navýšení platby státu za státní pojištěnce ze státního rozpočtu
  + **3 mld** přesun z provozu zdravotních pojišťoven do péče; vláda požaduje úsporu
  ≥ 1 % provozu pojišťoven; **avizované zmrazení** platby státu pro 2028 (zatím jen
  záměr v TZ MZ ČR). Kontext: systém VZP 2026 hospodaří s ~563 mld Kč, výdaje ~15 mld
  nad příjmy; automatická valorizace § 3c by pro 2027 přidala jen ~3,17 mld (zdravezpravy.cz).
  - **Ověření data 8. 6. (= pondělí):** nasezdravotnictvi.cz (publ. 9. 6., „pondělní
    zasedání" + verbatim VZP „koupili rok času"); ČTK/ČeskéNoviny/ČT24 („vláda
    v pondělí schválila", breakdown 21+3, zmrazení 2028); TZ MZ ČR (14. 6.);
    oznámení premiéra 7. 6. (fintag.cz). Weekday check: 8. 6. 2026 = pondělí. PASS.
  - **Stav v korpusu:** sister článek `clanek-platba-statu-statni-pojistenci`
    byl o této vlně aktualizován už **15. 6.** (důkladně, s caveaty). Doprovodný
    **živý (published)** článek `clanek-deficit-pojisteni-2026` ji ale ještě
    **neměl** — stále prezentoval navýšení platby státu jako *hypotetickou* páku
    (nástroj „(b)") a *možný* Scénář C. → cross-article nekonzistence.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV číselník = údržba; ČSÚ Demografie 2/2026 = journal.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 17. 6. 2026.
  Prováděcí kroky k rozhodnutí 8. 6. (nařízení vlády o VZ 2027, kapitola 335
  rozpočtu, úhradová vyhláška 2027) teprve přijdou (srpen–říjen 2026).

## Doporučení pro routing fáze

- **Žádný nový HOT trigger pro nový článek.** Jediná velká vlna (vládních +24 mld)
  je v korpusu už zachycena (platba-statu, 15. 6.) — psát nový článek = redundance;
  fronta navíc drží 17 nepublikovaných draftů.
- **→ ARTICLE-REVISE** `clanek-deficit-pojisteni-2026` — živý published článek
  přímo dotčený ověřenou vlnou (rozhodnutí 8. 6.), který ji ještě neodrážel.
  Priorita #2 fallback stromu (riziko nepřesnosti / zastaralost živého článku
  hustého na čísla). Plně v souladu s požadavkem na **ověření všech zdrojů**.
