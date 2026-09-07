# Discovery report — 2026-09-07

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, fáze 1). Každý nález níž má odkaz na
primární strojově dohledatelný zdroj. Hodnoty citované v tomto reportu byly
staženy dnes přímo z API / webu / PDF / XLSX daného zdroje a přepočítány, ne
převzaty z paměti modelu ani z backlogu.

## Nové indikátory / datasety

- [ ] ÚZIS — aktuality beze změny od **14. 8. 2026** (poslední věcná položka:
  „Vysoké teploty a mortalita"). Žádná nová vlna NRPZS, NOR, NRH ani NRZP.
- [ ] NZIP — žádný nový ani aktualizovaný datový souhrn od posledního běhu.
- [ ] Eurostat — po vlně `ilc_hch10` zpracované 6. 9. žádná další aktualizace
  zdravotních datasetů.
- [ ] OECD — bez nové vlny Health at a Glance (očekává se 11/2026).

## Nové legislativní normy / sněmovní tisky

- **Sněmovní tisk 235** (pojistné na veřejné zdravotní pojištění, valorizace
  platby za státní pojištěnce): usnesení garančního výboru pro zdravotnictví
  jako tisk 235/1 rozesláno **4. 9. 2026**; nově je bod **zařazen na 30. schůzi
  od 8. 9. 2026** (2. čtení). Věcně beze změny proti běhu 5. 9., kdy byl
  zapracován revizí `clanek-valorizace-statni-pojistenci-2027`. Ověřeno na
  <https://www.psp.cz/sqw/historie.sqw?o=10&t=235> (7. 9. 2026).
- Žádná nová norma v gesci MZ ČR vyhlášená ve Sbírce od 5. 9. 2026.

## Aktuální dění / kauzy s implikací pro zdravotnictví

Tiskové centrum MZ ČR nově redirectuje z `mzcr.cz` na **`mzd.gov.cz`** (HTTP 301) —
odkazy v korpusu na starou doménu stále fungují přes redirect.

- **MZ ČR, 4. 9. 2026** — „Aktivní ZÁŘÍ ve Strakově akademii nabídne také možnost
  darovat krev". Osvětová akce bez datového výstupu. COLD.
- **MZ ČR, 3. 9. 2026** — EZKarta nové generace. Pokryto `clanek-ezkarta-nova-generace`
  (běh 4. 9. 2026).
- **MZ ČR, 2. 9. 2026** — onkologičtí koordinátoři. Pokryto
  `clanek-onkologicky-koordinator-2026`.
- **MZ ČR, 1. 9. 2026** — screening karcinomu prostaty, recenzovaná publikace
  *Eur Urol Open Sci 2026;91:41–48*. Čísla (310 tis. oslovených, 8,7 % zvýšené PSA,
  2 079 záchytů) odpovídají publikovanému `clanek-prostata-screening-pilot`
  (18. 8. 2026). Zůstává **WARM** z běhu 6. 9.: doplnit článku DOI recenzovaného
  pramene.
- **MZ ČR, 25. 8. 2026** — centralizace onkochirurgie do 2030. Pokryto
  `clanek-centralizace-onkochirurgie-2030`.
- WHO Europe (1.–4. 9.), NÚKIB (4. 9.) — bez položky se zdravotnickým řezem pro ČR.
- ČSÚ — od 25. 8. bez nové publikace k demografii, úmrtnosti či projekcím.

## Aktualizace existujících dat (vlna)

- Žádná nová vlna. Poslední zpracovaná: Eurostat `ilc_hch10` (běh 6. 9.).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

Všechny tři dotazy spuštěny **7. 9. 2026** přes MCP `hlidac-statu`
(<https://www.hlidacstatu.cz>).

- **VeKLEP:** 2 záznamy s poslední úpravou od 31. 8., ani jeden v gesci MZ ČR:
  návrh vyhlášky, kterou se mění vyhláška č. 11/2023 Sb., o zdravotní způsobilosti
  ve vnitrozemské plavbě (`KORNDV37RXI3`, poslední úprava 31. 8. 2026), a novela
  zákona č. 61/2000 Sb., o námořní plavbě (Ministerstvo dopravy, `KORNDX4E2C5I`).
  Nález z běhu 6. 9. — novela zákona č. 167/1998 Sb., o návykových látkách
  (`KORNDVEC8EF8`, MZ ČR) — beze změny fáze. **Žádný nový kandidát.**
- **Registr smluv:** kategorie `zdrav`, od 31. 8. 2026 celkem **166 smluv
  v objemu 48,23 mil. Kč**. Největší položky jsou rutinní nákupy léčiv fakultními
  nemocnicemi (FN Ostrava — klinické hodnocení dle protokolu GO42552, 5,11 mil. Kč,
  ROCHE s.r.o.; FN Hradec Králové — antivirotika, 5,07 mil. Kč, MSD).
  **12 smluv se skrytou cenou** — všechny jsou výpůjčky přístrojů a instrumentária
  bez úplaty (Arthrex, Schubert CZ, 3M Bair Hugger) nebo bonusové dodatky, tedy
  smlouvy, u nichž nulová hodnota není anomálie. Žádná smlouva těsně pod limitem
  ZZVZ. **Žádný kandidát na článek.**
- **ÚOHS:** žádné nové rozhodnutí s účastníkem ze zdravotnictví od 25. 8. 2026.

## Ověřovna Barometru — kandidáti

- (žádný nový kvantitativní výrok politika o zdravotnictví, který by šlo
  konfrontovat s indikátory dashboardu)

## Doporučení pro routing fáze

- **HOT (reaktivní):** žádný. Všechny tři onkologické tiskovky MZ z přelomu
  srpna a září už mají v korpusu vlastní článek.
- **WARM (revize):** `clanek-prostata-screening-pilot` — doplnit DOI
  `10.1016/j.euros.2026.07.003` (přenášeno z 6. 9.).
- **COLD:** VeKLEP, Registr smluv, ÚOHS bez nálezu.
- **EVERGREEN:** backlog `data/article-backlog.json` má jednu položku
  `status: ready` — `centrova-leciva-37-miliard` (priority 16). Při ověřování
  jejího datového rámce se ukázalo, že nosná teze položky (ÚZIS modeluje centrová
  léčiva zvlášť a projekce do 2040 je nezahrnuje) **je pravdivá, doložitelná
  a v korpusu nepokrytá** — viz `discovery/data-frame-projekce-bez-centrovych-leciv.md`.
