# Discovery report — 2026-08-08

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality: pouze personální inzeráty (7. 8. databázový
  specialista, 3. 8. mzdový účetní); poslední datová publikace stále „Tuberkulóza
  v ČR v roce 2025" (26. 6.). ČSÚ: listing rychlých informací přes proxy nečitelný
  (JS katalog), žádný sekundární signál o nové demografické/zdravotnické publikaci
  (Pohyb obyvatelstva 2Q vyjde v září). OECD/Eurostat mimo publikační okno
  (HAaG listopad).

## Nové legislativní normy / sněmovní tisky
- (nezjistitelné live) — zakonyprolidi.cz/cs/aktualne HTTP 403 přes proxy (stejně
  jako běhy 08-01…08-07). Žádný sekundární signál o nové normě v gesci MZ.
  PSP: Sněmovna mezi schůzemi.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- **HOT (revizní) — MZ ČR 7. 8. 2026: „Do lékáren míří téměř 6 000 balení
  tamoxifenu, další dodávky jsou na cestě."** Primární zdroj: TZ MZ ČR
  (mzd.gov.cz/tiskove-centrum-mz/ministerstvo-zdravotnictvi-do-lekaren-miri-temer-6-000-baleni-tamoxifenu-dalsi-dodavky-jsou-na-ceste/,
  ověřeno 8. 8. 2026). Klíčová fakta: téměř 6 000 balení neregistrovaných
  přípravků tamoxifenu (registrovaných v jiných státech EU) postupně distribuováno
  do lékáren; dodávka převyšuje obvyklou týdenní spotřebu; další dodávka v tomto
  týdnu má pokrýt dvouměsíční léčbu pro 1 250 pacientek; zvláštní léčebný program
  (dělení neporušených blistrů v lékárnách) běží dál; citace ministra Vojtěcha.
  **Dopad na korpus: článek `clanek-tamoxifen-vypadek.html` čeká ve frontě
  (scheduled_for 2026-08-06, dosud nepublikován) — krok 4 jeho flow („souběžně se
  jedná o dodávkách tisíců balení") je předběhnut realitou; bez revize by článek
  vyšel s neaktuálním vyzněním „lék neteče".**
  - **Strojové ověření v SÚKL open-data MR feedu** (opendata.sukl.cz/soubory/MR/mr.zip,
    staženo 8. 8. 2026, soubor generován 7. 8. 2026 22:15, platnost 08.08.2026):
    registrované přípravky beze změny — 0058701 (Ebewe 10 mg) přerušení od
    16. 6. 2025, termín obnovení **15. 7. 2027**, výrobní důvody, poslední platné
    hlášení; 0058702 (Ebewe 20 mg) přerušení od 8. 12. 2025, obnovení 15. 7. 2027,
    výrobní; 0289384 (Orifarm 20 mg, specifický léčebný program) obnoveno
    28. 7. 2026. Centrální teze článku (oba registrované přípravky mimo trh do
    léta 2027) tedy PLATÍ; mění se aktuální stav zásobování přes neregistrované
    dovozy.
  - Sekundární stopa (jen kontext, necitovat místo primárních): zdravezpravy.cz,
    deníkn.cz minuta, zdravotnickydenik.cz — shodně 6 000 balení, 7. 8.
- MZ ČR ostatní 3.–7. 8.: kvalita vody ke koupání (osvětové), zásady chování ve
  vedru (osvětové) — bez implikace pro korpus.
- WHO Europe 5.–8. 8.: beze změny proti 08-07 (5. 8. kojení — globální, pokryto).
- NÚKIB 28. 7.–8. 8.: 7. 8. výzva k podání nabídky (expertní služby NIS2) —
  administrativní, mimo zdravotnictví.

## Aktualizace existujících dat (vlna)
- SÚKL MR feed — průběžný denní feed (využit výše pro re-verifikaci tamoxifenu);
  indikátor `vypadky_leciv_aktivni` = 1 329 (origin live, fetched 3. 8.) beze změny.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- MCP `hlidac_statu` není v této session připojen → kanál přeskočen (bez náhrady
  sekundárními zdroji, v souladu s citačními pravidly kanálu).

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): tamoxifen 7. 8. — jde o **update tématu, které korpus už
  pokrývá článkem ve frontě** → nikoli nový článek (redundance), ale ARTICLE-REVISE
  fronty před publikací.
- WARM (revize): **clanek-tamoxifen-vypadek.html** — viz výše; jediný kandidát.
- COLD: backlog má 5 položek `ready` — nevyužito (kadence splněna, revize má
  přednost před dublováním tématu).

## Poznámka k dostupnosti zdrojů (proxy)
zakonyprolidi.cz (403), csu.gov.cz listingy (JS, nečitelné), sukl.gov.cz listing TZ
(JS, nečitelné — konkrétní TZ stránky dostupné), mzd.gov.cz/category/... (404 —
funkční cesta je /vsechny-novinky/ a /tiskove-centrum-mz/{slug}/). Plně dostupné:
uzis.cz, mzd.gov.cz (přes /vsechny-novinky/), opendata.sukl.cz (mr.zip),
sukl.gov.cz TZ detaily, who.int, nukib.gov.cz.
