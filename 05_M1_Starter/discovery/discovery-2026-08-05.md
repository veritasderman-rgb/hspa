# Discovery report — 2026-08-05

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality: jediný nový záznam 3. 8. je personální inzerát (mzdový účetní), ne data. ČSÚ bez nové zdravotnické publikace (poslední RI: HDP a zaměstnanost 30. 7.).

## Nové legislativní normy / sněmovní tisky
- (nezjistitelné live) — zakonyprolidi.cz/cs/aktualne HTTP 403 přes proxy; psp.cz/sqw/historie.sqw HTTP 503 (Sněmovna mezi schůzemi). Žádný sekundární signál o nové normě v gesci MZ.
- e-sbirka.gov.cz technicky nedostupná pro strojové čtení (JS aplikace bez server-side obsahu) — § 49 zákona o léčivech nešlo ověřit z textu normy; právní rámec ZvLP proto článek popisuje podle znění MZ ČR a SÚKL, bez citace konkrétního paragrafu.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- **HOT — Tamoxifen (výpadek + zvláštní léčebný program).** TZ MZ ČR 3. 8. 2026
  (aktualizace 4. 8.): „Zvláštní léčebný program ministerstva zdravotnictví pomůže
  dostat tamoxifen k většímu počtu pacientek. Současně probíhají jednání
  o dodávkách dalších tisíců balení."
  https://mzd.gov.cz/tiskove-centrum-mz/zvlastni-lecebny-program-ministerstva-zdravotnictvi-pomuze-dostat-tamoxifen-k-vetsimu-poctu-pacientek/
  Citace: ministr Adam Vojtěch, ředitel SÚKL Tomáš Boráň, prezident ČLnK Aleš Krebs.
  SÚKL 4. 8. publikoval podmínky ZvLP (individuální příprava v lékárnách
  z neregistrovaných LP registrovaných v EU/EHP, výdej max. na ~2 měsíce léčby):
  https://sukl.gov.cz/neregistrovane-lecive-pripravky/tamoxifen-mimoradna-moznost-individualni-pripravy-z-neregistrovanych-lecivych-pripravku-v-ramci-zvlastniho-lecebneho-programu/
  **Strojová verifikace v SÚKL MR feedu** (opendata.sukl.cz/soubory/MR/mr.zip,
  staženo 5. 8. 2026, soubor generován 4. 8. 2026 22:15):
  - Tamoxifen Ebewe 10 mg (kód SÚKL 0058701): přerušení dodávek od 16. 6. 2025,
    výrobní důvody, hlášený termín obnovení **15. 7. 2027**, poslední platné hlášení.
  - Tamoxifen Ebewe 20 mg (0058702): přerušení od 8. 12. 2025 (hlášeno 26. 11. 2025),
    výrobní důvody, termín obnovení **15. 7. 2027**, poslední platné hlášení.
  - Tamoxifen Orifarm 20 mg (0289384): uvedení na trh od 20. 1. 2026, přerušení
    8. 6.–13. 7. 2026 (kapacitní/distribuční důvody), obnovení dodávek od 28. 7. 2026.
  - Historie trhu: Nolvadex D ukončil dodávky 2009, Tamoplex 10/20 mg 2011–2012 —
    trh dlouhodobě stojí na jediném dodavateli (Ebewe).
- MZ ČR 30. 7.: plán spolupráce MZ × WHO Europe 2026–2027 (zachyceno 08-01/08-02, bez tvrdých KPI, nezakládá článek).
- MZ ČR 29. 7.: projekt společných nákupů fakultních nemocnic (WARM kandidát, navazuje na publikovaný článek o smlouvách FN; bez nových čísel v TZ).
- MZ ČR 21. 7.: Strategie rozvoje paliativní péče do 2035 (WARM, kandidát na samostatné zpracování ve strategiích).
- WHO Europe: nic ČR-specifického (hepatitida — World Hepatitis Day 28. 7. už pokryto článkem hepatitida-eliminace-2030 ve frontě; West Nile, požáry Španělsko).

## Aktualizace existujících dat (vlna)
- (žádná nová vlna) — OECD/Eurostat mimo publikační okno (HAaG listopad); ČSÚ bez zdravotnické RI.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- MCP `hlidac_statu` není v této session připojen → kanál přeskočen (bez náhrady sekundárními zdroji, v souladu s citačními pravidly kanálu).

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): **tamoxifen — výpadek a zvláštní léčebný program** (plná primární doložitelnost: MZ TZ + SÚKL ZvLP podmínky + strojový MR feed + 4 navázané indikátory dashboardu)
- WARM (revize): společné nákupy FN (bez čísel — odloženo), paliativní strategie 2035 (strategie, ne článek)
- COLD: evergreen backlog má 6 položek `ready` (nevyužito — reaktivní trigger má přednost)

## Poznámka k dostupnosti zdrojů (proxy)
zakonyprolidi.cz (403), psp.cz (503), csu.gov.cz/aktualni-informace (404 — homepage funkční),
sukl.gov.cz/farmaceuticky-trh/registr-vypadku-leciv (404 po redirectu — nahrazeno přímo
strojovým MR feedem na opendata.sukl.cz, který je primárnější). e-sbirka.gov.cz bez
server-side obsahu. mzd.gov.cz i sukl.gov.cz (homepage, TZ, ZvLP stránky) plně dostupné.
