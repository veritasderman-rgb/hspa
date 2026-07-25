# Discovery report — 2026-07-25

> Denní rutina, explicitní důraz běhu: **validace a ověření všech zdrojů**.
> Discovery proběhlo proti živým primárním zdrojům (web reachable přes proxy).

## Nové indikátory / datasety
- [ ] (žádný nový strojově-dohledatelný indikátor s primární KPI od posledního běhu)
- ÚZIS aktuality: poslední vlna — TBC v ČR 2025 (červen 2026), bez nové HSPA-relevantní metriky vhodné pro nový článek dnes.

## Nové legislativní normy / sněmovní tisky
- MZ ČR — návrh novely zákona o ochraně veřejného zdraví (harmonizace hyg. požadavků na materiály ve styku s pitnou vodou dle směrnice EU) — v legislativním procesu (MZ legislativní newsletter 7/2026).
- Zákon o digitalizaci zdravotnictví — pokračuje (povinné eŽádanky navazující na eRecept). Kontext k evergreen položce „eRecept v číslech" (backlog prio 7), ne dnešní trigger.
- (žádná nová norma v gesci MZ vyhlášená ve Sbírce s implikací vyžadující reaktivní článek dnes)

## Aktuální dění / kauzy s implikací pro zdravotnictví
- Vláda — TK k vyhodnocení Programového prohlášení za 1. pololetí 2026 (9. 7. 2026) + TK po jednání vlády (13. 7. 2026). Systémová, bez nové ověřitelné KPI k samostatnému článku dnes.
- MZ: v 1. pololetí „konkrétní kroky k dostupnosti a kvalitě péče + příprava dlouhodobých systémových změn (stárnutí, personál)" — bez nové tvrdé metriky.

## Aktualizace existujících dat (vlna)
- Bez nové vlny s implikací pro publikovaný korpus, která by vynutila ARTICLE-REVISE dnes.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nezjišťováno v tomto běhu (fokus = validace zdrojů publikovaného obsahu; kanál doplňkový). Bez nálezu k zápisu.

## Stav fronty a zásobníku
- **Publikované články: 140.** Nepublikované drafty ve frontě: **32** (publish cron drénuje ~1/den → korpus roste i bez nového draftu).
- Evergreen backlog: **7 položek `ready`** (nejnižší priorita 5 „Prázdná lůžka").
- Poslední nový článek (ARTICLE/EVERGREEN-WRITE): `hepatitida-eliminace-2030` (2026-07-22) → **3 dny** bez nového článku.

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): — (nic s primárně-zdrojovou KPI doložitelností vyžadující reaktivní článek dnes)
- WARM (revize kvůli vlně): —
- COLD → **FALLBACK-AUDIT**: nejstarší skutečně auditovaný publikovaný článek s tvrdými čísly.
  - Skenem podle **nejnovějšího** auditního data (last_reviewed i všechny `fN_` poznámky) je nejstarší kohorta `zubni-kaz-deti` (2026-06-03), `rizeni-podle-vysledku`/`teorie-zmeny` (2026-06-05, ale názorové/procesní texty).
  - `zubni-kaz-deti` = datově nejhustší, navíc data explicitně **„orientační (origin: seed)"** — nikdy neověřená proti živým primárním zdrojům. Nejvyšší auditní hodnota pro dnešní mandát ověření zdrojů.
