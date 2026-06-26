# Discovery report — 2026-06-26

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh **opět explicitně zdůraznil: „Naprosto zásadní je validace
a ověření všech zdrojů!!!!"** → těžiště dnešního běhu je Fáze 5 (nezávislá
source-verification).

26. 6. 2026 je **pátek**. Poslední discovery report v repu = 2026-06-24
(FALLBACK-AUDIT clanek-reforma-pohotovosti-290-2025). 25. 6. proběhl publish +
přidány 2 klima drafty (nemocnice-v-horku, uhlikova-stopa-zdravotnictvi).
Startovní stav: `git` HEAD == origin/main (a6dc74d); `npm run validate:all`
zelené (151 indikátorů, 151 článků prošlo publikační hygienou, financing OK,
clinical-quality 35 indicators). Publikační fronta drží **16 nepublikovaných
draftů** (5 scheduled 2026-06-30 → 2026-07-02, 11 bez scheduled_for; další volný
slot 2026-07-03).

## Procházené primární zdroje (stav fetch k 26. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější stále **15. 6.** (NRPATV číselník toxikologie — salbutamol + synt. kanabinoidy; registrová údržba). 10. 6. čestné členství (personální). **Žádná nová datová vlna od 24. 6.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **NOVÉ 24. 6.**: „Elektronizace zdravotnictví pokračuje…" — novela zákona o elektronizaci prošla vnitroresortním připomínkovým řízením (před meziresortním řízením a předložením vládě) (eŽádanky povinné od 1. 7. 2027); systém centralizace lab. výsledků (282 laboratoří, > 405 mil. výsledků, 28 skupin vyšetření, data od 2020); veřejný přístup přes eZdraví + app EZKarta konec srpna 2026; vazba na EHDS. Viz „Posouzení triggeru" níže. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 24. 6. konjunkturální průzkumy; 23. 6. kriminalita 2025; 16. 6. Demografie 2/2026 (journal). **Žádná nová indikátorová/mortalitní/EHIS vlna** (výdaje na zdravotní péči 2024 = 11. 6., už zpracováno dříve). |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | Položky 18.–25. 6. jsou sezónní/sekundární mediální výstupy (vedra, klíšťata, repelenty, STI rozhovor, pitný režim). **Žádná nová primární surveillance vlna.** |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search | Nejnovější ucelená vlna = Health at a Glance 2025 (13. 11. 2025) + Country Health Profile Czechia 2025, oba v korpusu. **Žádná edice „2026", žádná nová `hlth_*` vlna s ČR-implikací.** |
| 6 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 (homepage; databáze prints strojově neparsovatelná na úrovni homepage) | Bez strojově ověřeného **nového** tisku v gesci MZ ČR po 14. 6. Žádný nový tisk netvrdím. |
| 7 | **SÚKL — výpadky léčiv** | sukl.cz → sukl.gov.cz/…/registr-vypadku-leciv | ⚠️ 301→404 | Registr se přesouvá na sukl.gov.cz, cílová cesta vrací 404. Strojově nedostupné → **žádný nový výpadek netvrdím.** |
| 8 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 anti-bot (konzistentní s předchozími běhy) | Strojově nedostupné. Žádný nový normativní akt v gesci MZ ČR netvrdím. |

## Posouzení triggeru — MZ ČR eZdraví TZ z 24. 6. 2026

Fetch oficiální TZ (mzd.gov.cz, primární kanál ministerstva) potvrdil:
**novela zákona o elektronizaci zdravotnictví prošla vnitroresortním
připomínkovým řízením** (TZ: „již prošla vnitroresortním připomínkovým řízením;
po vypořádání meziresortního … bude předložen vládě"), povinné eŽádanky od
**1. 7. 2027**, povinné vedení elektronické
zdravotní dokumentace, registrované výměnné sítě, sdílený zdravotní záznam;
systém centralizace laboratorních výsledků (**282 laboratoří, > 405 mil.
výsledků, 28 skupin vyšetření, data od 2020**), veřejný přístup přes portál
eZdraví + app **EZKarta** konec srpna 2026; cíl = soulad s EHDS.

**Není to HOT trigger pro nový článek:**
1. **Pokrytí korpusem je rozsáhlé** — 39 článků se dotýká eZdraví/elektronizace,
   včetně přímo `clanek-novela-elektronizace-2026` (zákon 236/2025 Sb.),
   `clanek-ezkarta-ehealth`, `clanek-ehds-evropsky-prostor-zdravotni-data`,
   `clanek-digi-1…5`, `clanek-ncez-financovani-2027`, `clanek-datova-patere-lock-in`.
2. **Legislativní akt zatím neexistuje** — novela jen prošla vnitroresortním
   připomínkovým řízením (meziresortní řízení a předložení vládě teprve čekají);
   **není ve Sbírce, není sněmovní tisk, nemá č./rok Sb.** Psát nový
   článek o neschváleném návrhu = porušení železného pravidla (legislativa
   vyžaduje č./rok Sb. nebo č. tisku).
3. **Fronta drží 16 draftů** → 17. tenký článek = „zbytečná změna".

→ **Trigger je relevantní jako WARM/forward-looking poznámka** v auditu článku
`clanek-novela-elektronizace-2026` (který stojí na předchozí novele 236/2025 Sb.),
nikoliv jako nový článek.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal;
  OECD/Eurostat beze změny.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **schváleného** normativního aktu v gesci MZ ČR k 26. 6.
  Novela elektronizace = teprve po vnitroresortním řízení, před meziresortním řízením (forward-looking, nikoli
  platná norma).

## Aktualizace existujících dat / dění (vlna)

- Žádná nová datová vlna od běhu 24. 6.

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný **schválený** event pro nový článek.
- **WARM:** eZdraví TZ 24. 6. se dotýká `clanek-novela-elektronizace-2026` —
  ne jako akutní oprava (článek popisuje předchozí, platnou novelu 236/2025 Sb.),
  ale jako příležitost doplnit forward-looking poznámku o navazující novele.
- **COLD → FALLBACK-AUDIT:** discovery bez nového schváleného dění + uživatelská
  priorita „ověř všechny zdroje". Cíl auditu podle fallback priority **#1
  „aktuální legislativa": `clanek-novela-elektronizace-2026`** — legislativně
  nejhustší článek dotčený dnešním legislativním děním (eZdraví novela),
  `audit.last_reviewed: 2026-05-15` (42 dní > 30 → zároveň splňuje fallback #3).
  Ideální cíl pro nezávislou re-verifikaci všech zdrojů.
