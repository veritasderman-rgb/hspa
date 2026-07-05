# Discovery report — 2026-07-05

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Uživatel pro tento běh znovu
explicitně zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**
Discovery proto proběhlo **živým fetchem primárních zdrojů** (WebFetch / WebSearch),
ne z paměti ani z předchozích discovery reportů. Železné pravidlo: **co není ověřené
z primárního strojově dohledatelného zdroje, na portálu nezůstává.**

5. 7. 2026 je **neděle**. Poslední discovery report = **2026-07-03** (mezera 07-04 i
07-05 — dnešní běh ji uzavírá). Startovní stav: publikační fronta drží **19
nepublikovaných draftů** (beze změny). Technická validace: `npm run validate:all` ✅
(160 indikátorů, 36 strategií, 35 explainerů, 9 prevence, 166 článků, dohodovací
řízení, financing, clinical-quality — vše OK).

## Procházené primární zdroje (stav fetch k 5. 7. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější položka stále **26. 6.** „Tuberkulóza v ČR v roce 2025". Před ní 15. 6. NRPATV, 10. 6. čestné členství. **Žádná nová vlna NRPZS/NOR/NRH/NRZP v červenci.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější **3 TZ**: (a) **3. 7.** „…nový systém péče o pacienty se vzácnými onemocněními…" (NOVÁ oproti 07-03 reportu, WATCH). (b) **1. 7.** „…převzalo agendu politiky v oblasti závislostí a duševního zdraví." (c) **30. 6.** „Více než 1 200 léků nově u praktického lékaře…" — **HOT trigger, ověřen živě tento běh** (viz Legislativa). **Žádná nová TZ 4.–5. 7.** |
| 3 | **MZ ČR — vice-nez-1-200-leku (detail TZ)** | mzd.gov.cz/…/vice-nez-1-200-leku-nove-u-praktickeho-lekare/ | ✅ 200 | Přímá extrakce faktů reformy (viz Legislativa + datový rámec). |
| 4 | **ČSÚ / OECD / Eurostat / WHO** | csu.gov.cz, oecd.org, ec.europa.eu/eurostat, who.int | ✅ | Beze změny s dopadem na zdravotnictví. Žádná nová `hlth_*` vlna / mortalitní / EHIS vlna s ČR-implikací. HAG 2025 + Country Health Profile Czechia 2025 stále nejnovější (v korpusu). |
| 5 | **PSP ČR / Sbírka zákonů / zakonyprolidi** | psp.cz, zakonyprolidi.cz | ⚠️ anti-bot (403) | Strojově neověřeno (403 = anti-bot, ne mrtvý odkaz). Žádný nový normativní akt v gesci MZ ČR netvrdím. |
| 6 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ přístupnost | Registr výpadků strojově obtížně dohledatelný. Žádný nový výpadek netvrdím. |

## Nové indikátory / datasety

- (žádný nový indikátor / dataset)

## Nové legislativní normy / sněmovní tisky / strategie

- **MZ ČR — TZ 30. 6. 2026** „Více než 1 200 léků nově u praktického lékaře. Ministerstvo
  zdravotnictví usnadňuje pacientům přístup k léčbě." — **primární, ověřeno WebFetch přímo
  z MZ tento běh (5. 7.).** Fakta z primárního zdroje: **novela vyhlášky o předepisování
  léčivých přípravků** zrušila u **více než 1 200 přípravků** dosavadní preskripční omezení
  **„E"** (dosud jen ambulantní specialisté) → od **1. 7. 2026** je smějí předepisovat i
  **praktičtí lékaři pro dospělé i PLDD**. Jde o **≈ 1/8 všech hrazených léčiv v ambulantní
  péči**. Nový symbol **„F"** zachovává specialistickou preskripci tam, kde je medicínsky
  nutná; **lékový záznam** brání duplicitám a interakcím. Terapeutické oblasti (jmenované
  v TZ): neurologie, respirační, diabetologie/metabolika, glaukom, vybrané KV, urologické,
  gynekologické diagnózy. Mezera v korpusu **znovu ověřena tento běh** (repo-wide grep
  „omezením E" / „symbolem F" / „1 200 lék" napříč `clanek-*.html` i `drafts/` = **0 shod**).
  **→ HOT → ARTICLE-WRITE (viz Routing).**
- **MZ ČR — TZ 3. 7. 2026** „…nový systém péče o pacienty se vzácnými onemocněními…" —
  **primární, NOVÁ** oproti 07-03 reportu. Doložitelnost i mezera v korpusu zatím neověřeny
  do hloubky. → **WATCH** (kandidát na příští běh), dnes nepíšu (max 1 článek/den).
- **MZ ČR — TZ 1. 7. 2026** kompetenční přesun agendy závislostí/duševního zdraví na MZ —
  beze změny od 07-03 (WARM follow-up pro publikovaný `clanek-protidrogova-dusevni-politika-mz-2026`).
- Úhradová vyhláška 2027 = avizovaný termín „do konce října", zatím nevydána.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Zrušení preskripčního omezení „E" u >1 200 léků (od 1. 7. 2026) — HOT → dnes psán článek.**
  Fresh primární policy change, doložitelnost výborná (primární MZ TZ + detail TZ), dopadovost
  vysoká (přístup k léčivům pro chroniky/seniory/regiony s hůře dostupnou specializovanou péčí),
  mezera v korpusu ověřena. HSPA úhel: **dostupnost a koordinace primární péče** (posílení role
  praktika, méně „obíhání specialistů"). 07-03 report tento trigger explicitně **deferoval na
  „příští běh"** — dnešní běh ho realizuje.
- **Vzácná onemocnění — nový systém péče (MZ TZ 3. 7.)** — WATCH, kandidát příští běh.
- Svrab (scabies) — **WATCH nezměněno**: SZÚ stránka stále nese jen mediální/expertní citace,
  žádný primárně strojově ověřitelný surveillance dataset s incidencí/mortalitou. Psát úmrtní
  číslo bez primárního zdroje = porušení železného pravidla → nepíšu.
- STI vlna — **již pokryto draftem** `pohlavni-nemoci-2025` (fronta, scheduled_for 07-04).

## Doporučení pro routing fáze

- **HOT (aktuální dění → nový článek): ZRUŠENÍ PRESKRIPČNÍHO OMEZENÍ „E" / >1 200 LÉKŮ
  U PRAKTIKŮ (od 1. 7. 2026).** Jediný plně doložitelný HOT trigger — primární MZ TZ 30. 6.
  ověřená živě tento běh, mezera v korpusu ověřena (0 shod). → **ARTICLE-WRITE.**
- HOT (nový indikátor): žádné.
- WATCH: vzácná onemocnění (MZ 3. 7.), svrab (chybí primární surveillance).
- COLD/fallback audit nejstaršího nebyl nutný — čas i hodnota lépe využity na nový plně
  doložený článek k fresh policy change (soulad s uživatelovým důrazem na ověření zdrojů).
