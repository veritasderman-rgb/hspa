# Discovery report — 2026-09-05

Běh denní rutiny podle `PROMPT_DAILY_ROUTINE.md`, fáze 1. Všechny zdroje procházeny
5. 9. 2026 z běhového prostředí agenta. Data z Eurostatu a PSP tažena přímo přes
API / surové HTML (ne přes shrnující WebFetch), aby se nečetla parafráze.

## Nové indikátory / datasety

- **[X] HOT — Eurostat, System of Health Accounts: nová vlna publikována 2. 9. 2026
  (23:00), poprvé s referenčním rokem 2024.** Aktualizováno všech 8 datasetů řady
  `HLTH_SHA11_*` (FS, HC, HCHF, HCHP, HF, HFFS, HP, HPHF) — zachyceno v oficiálním
  RSS feedu Eurostatu `statistics-update.rss`, potvrzeno hlavičkou `updated:
  2026-09-02T23:00:00+0200` v odpovědi datového API.
  - Ověřeno živým dotazem na API (`hlth_sha11_hf`, `unit=PC_GDP`, `icha11_hf=TOT_HF`):
    **ČR 2024 = 8,46 % HDP** (2023 = 8,38 %). Rok 2024 vykázalo **28 zemí**;
    **agregát EU27 za 2024 zatím NENÍ** (chybí ES, FI, LV, MT), poslední dostupný
    EU27 zůstává **2023 = 9,94 % HDP**.
  - Struktura financování ČR 2024 (`unit=PC_CHE`): **HF1 veřejné 85,06 %**
    (2023: 84,53), **HF3 přímé platby domácností 14,06 %** (2023: 14,60).
    EU27 2023: HF1 80,22 %, HF3 15,19 %.
  - Absolutní objem ČR (`unit=MIO_NAC`): 2023 = 641 996 mil. Kč, 2024 = 681 475 mil. Kč.
  - <https://ec.europa.eu/eurostat/databrowser/view/hlth_sha11_hf>
  - **Rozpor vintage, který je nutné ošetřit výhradou, ne tichým výběrem:** za rok
    **2023 se ČSÚ a Eurostat shodují na korunu** (ČSÚ 642,0 mld. Kč = Eurostat
    641 996 mil. Kč). Za **2024** se rozcházejí: ČSÚ ve své národní publikaci
    *Výsledky zdravotnických účtů v ČR* (zveřejněno **11. 6. 2026**, údaje značené
    „P — předběžné“) uvádí **696,7 mld. Kč / 8,6 % HDP / 13,6 % out-of-pocket**,
    Eurostat v transmisi z 2. 9. 2026 **681,5 mld. Kč / 8,46 % / 14,06 %**.
    Rozdíl 15,2 mld. Kč. ČSÚ ke dni 5. 9. 2026 novější vlnu nezveřejnil (stránka
    „Výdaje na zdravotní péči“ nese pořád datum 11. 06. 2026).
    <https://csu.gov.cz/vydaje-na-zdravotni-peci>
- [ ] ÚZIS — aktuality (uzis.cz/index.php?pg=aktuality): poslední věcná položka je
  pořád **„Vysoké teploty a mortalita“ (14. 8. 2026)**, dále jen tři pracovní
  inzeráty (3., 7., 10. 8.). **Žádná nová datová vlna.**
- [ ] NZIP — datasety (nzip.cz/data): HTTP 404, kontrola dnes **neproběhla**.
- [ ] OECD: Health at a Glance vychází typicky v listopadu — mimo okno.

## Nové legislativní normy / sněmovní tisky

- **[X] HOT — Sněmovní tisk 235** (vládní novela zákona č. 592/1992 Sb., o pojistném
  na veřejné zdravotní pojištění): **garanční Výbor pro zdravotnictví návrh
  projednal a doporučil schválit.** Stav ověřen na surovém HTML PSP
  (`historie.sqw?o=10&t=235`, hlavička „Stav projednávání ke dni: 5. září 2026“):
  „Garanční Výbor pro zdravotnictví projednal návrh zákona a vydal 4. 9. 2026
  usnesení doručené poslancům jako tisk 235/1 (doporučuje schválit).“
  - **Primární dokument stažen a strojově přečten** (`t023501.docx` z
    `psp.cz/sqw/text/orig2.sqw?idd=279377`): **50. usnesení Výboru pro zdravotnictví
    z 10. schůze ze dne 2. září 2026**. Výbor po úvodním slovu ministra zdravotnictví
    Adama Vojtěcha a zpravodajské zprávě poslance Jiřího Maška **doporučuje**
    Poslanecké sněmovně vyslovit souhlas s vládním návrhem — **bez pozměňovacích
    návrhů**; zmocňuje zpravodaje k úpravám podle § 95 odst. 2 jednacího řádu.
    Podepsáni Jiří Mašek (předseda a zpravodaj výboru) a Michaela Šebelová
    (ověřovatelka). Rozesláno poslancům **4. září 2026 v 11:38**.
  - Další projednávání možné od 7. 9. 2026, projednávání tisku **navrženo** na pořad
    **30. schůze (od 8. září 2026)** — formulace na PSP zůstává „navrženo“, ne
    „zařazeno“.
  - **Dopad na korpus:** `clanek-valorizace-statni-pojistenci-2027` (publikován
    25. 8. 2026) tvrdí v `meta name="description"`, v `og:description` i v těle
    textu, že tisk „zatím neprošel ani výborem“. **Toto tvrzení je od 4. 9. 2026
    nepravdivé.** Milník, který si článek sám nastavil a kontroloval denně od
    24. 8., nastal.
  - <https://www.psp.cz/sqw/historie.sqw?o=10&t=235> ·
    <https://www.psp.cz/sqw/text/tiskt.sqw?O=10&CT=235&CT1=1>
- Sbírka zákonů: `zakonyprolidi.cz/cs/aktualne` vrací HTTP 404, `e-sbirka.cz`
  odpovídá HTTP 200 ale bez strojově čitelného seznamu novinek. Kontrola nových
  norem v gesci MZ dnes **neproběhla úplně**.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **COLD — MZ ČR: „Aktivní ZÁŘÍ ve Strakově akademii nabídne také možnost darovat
  krev.“** Nejnovější položka v tiskovém centru MZ, akce bez indikátorové vazby.
- **COLD — MZ ČR, 3. 9. 2026: nová generace EZKarty.** Zpracováno v běhu 4. 9. 2026
  (`clanek-ezkarta-nova-generace`).
- **WARM (nadále odloženo) — MZ ČR, 2. 9. 2026: onkologičtí koordinátoři.** Klíčové
  číslo TZ („přes 60 % pacientů s karcinomem plic nezahájí léčbu do 8 týdnů“)
  nemá dohledatelný podklad. Beze změny od 3. 9.
- NÚKIB (nukib.gov.cz/cs/infoservis/aktuality): poslední položky 13. a 14. 8. 2026,
  **nic se vztahem ke zdravotnictví**; NIS2 jen jako výzva k podání nabídky (29. 7.).
- VZP (vzp.cz/o-nas/dokumenty): žádná nová výroční zpráva ani ZPP nad rámec
  posledního běhu.
- WHO Europe newsroom: stránka je plně JS-renderovaná, ze surového HTML nelze číst
  seznam zpráv. Kontrola dnes **neproběhla**.

## Aktualizace existujících dat (vlna)

- **Eurostat SHA11 — viz HOT výše (2. 9. 2026, referenční rok 2024).** Jediná nová
  vlna v okně 4.–5. 9. 2026.
- Nová vlna revidovala i zpětnou řadu 2023. Hodnoty, které
  `clanek-financovani-sha` cituje z Eurostatu (staženo 14. 6. 2026), se posunuly:
  Německo 11,7 → **11,64**, Francie 11,5 → **11,33**, Rakousko 11,2 → **11,18**,
  průměr EU 10,0 → **9,94**. Out-of-pocket průměr EU, který článek uvádí jako
  „kolem 14 %“, je podle nové vlny za 2023 **15,19 %**.
- ČSÚ: žádná nová Rychlá informace se vztahem ke zdravotnictví od
  „Průměrné mzdy — 2. čtvrtletí 2026“ (3. 9. 2026, zpracováno v noční rutině
  4. 9.). Kalendář ČSÚ je JS-renderovaný, ověřeno jen přes produktovou stránku.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP** (dotaz přes MCP `hlidac-statu`, dataset `veklep`, 5. 9. 2026, okno od
  29. 8. 2026): 2 nálezy, **ani jeden se netýká zdravotnictví** —
  „Vyhláška, kterou se mění vyhláška č. 11/2023 Sb., o zdravotní způsobilosti ve
  vnitrozemské plavbě“ (KORNDV37RXI3, poslední úprava 31. 8. 2026, předkladatel
  neuveden) a novela zákona o námořní plavbě (KORNDX4E2C5I, Ministerstvo dopravy).
  Obojí je zdravotní způsobilost v dopravě, ne zdravotní systém.
  → **žádný nový návrh v gesci MZ.**
- **ÚOHS** (dataset `rozhodnuti-uohs`, dotaz „nemocnice OR zdravotní OR
  zdravotnictví“, okno od 25. 8. 2026): **0 nálezů.**
- **Registr smluv**: dotaz `search_contracts` na kategorie `zdrav_*` skončil chybou
  serveru („An error occurred invoking 'search_contracts'“). Kontrola dnes
  **neproběhla** — přenést do dalšího běhu.

## Ověřovna Barometru — kandidáti

- Žádný nový kvantitativní výrok politika o zdravotnictví s vazbou na měřitelný
  indikátor v okně 4.–5. 9. 2026.

## Doporučení pro routing fáze

- **HOT (nová vlna dat s implikací):** Eurostat SHA11 s referenčním rokem 2024
  (2. 9. 2026) → přímo ruší metodickou výhradu, na které stojí sekce
  „Mezinárodní srovnání“ v `clanek-financovani-sha` („Eurostat zatím data 2024
  napříč EU nepublikoval“).
- **HOT (legislativa):** tisk 235 prošel garančním výborem → `clanek-valorizace-
  statni-pojistenci-2027` nese od 4. 9. nepravdivé tvrzení v meta description
  i v těle.
- **WARM:** žádný další.
- **COLD:** —
- **Evergreen backlog:** jediná položka se `status: ready` je
  `centrova-leciva-37-miliard` (priority 16) — **redundantní** s publikovaným
  `clanek-centrove-leky-2026.html` (27. 8. 2026), který stejný segment i tempo
  růstu už pokrývá z téže sady ÚZIS. Nosná teze položky (predikce ÚZIS do 2040
  modeluje centrová léčiva zvlášť) je samostatná, ale nevyvažuje dnešní dva
  reaktivní spouštěče.
