# Discovery report — 2026-09-10

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, fáze 1). Poslední běh rutiny proběhl
**8. 9. 2026** (9. 9. běžel jen indikátorový flow, discovery report za ten den
neexistuje) — okno rešerše je tedy **8.–10. 9. 2026**.

Každý nález níž byl **dnes** ověřen přímo proti API / webu / PDF primárního
zdroje. Kanály, které se ověřit nepodařilo, jsou označené jako **neověřené**, ne
jako „nic nového“.

## Nové indikátory / datasety

- [ ] **ÚZIS — aktuality** (<https://www.uzis.cz/index.php?pg=aktuality>, ověřeno
  10. 9. 2026): beze změny. Nejnovější věcná položka je pořád **14. 8. 2026**
  („Vysoké teploty a mortalita“); následují dvě personální inzerce (10. a 7. 8.).
  Žádná nová vlna NRPZS, NOR, NRH ani NRZP.
- [ ] **NZIP — datové zpravodajství**
  (<https://www.nzip.cz/modul/datove-zpravodajstvi>, ověřeno 10. 9. 2026):
  nejnovější položka je stále „Vysoké teploty a mortalita“ — tatáž vlna jako
  u ÚZIS. Nic nového.
- [ ] **ČSÚ — aktuality** (<https://csu.gov.cz/aktuality>, ověřeno 10. 9. 2026):
  od 25. 8. žádná publikace se zdravotnickým, demografickým ani zdravotnicko-účetním
  obsahem. Nejnovější položky: trh práce 2. čtvrtletí (3. 9.), myslivost (31. 8.),
  odklady školní docházky (27. 8.), kandidátní listiny (26. 8.).
- [ ] **ECDC Surveillance Atlas / EARS-Net**: dataset 27 / health topic 4 dotázán
  dnes přímo (metadatový endpoint `GetIndicatorMeasuresForHealthTopicAndDataset`,
  152 measures). Žádná nová populace nad rámec toho, co dashboard po běhu 8. 9.
  čte. **Nové jsou ale hodnoty, které dosud nikdo nezpracoval do textu** — viz
  „Doporučení pro routing“.
- [ ] **OECD** (<https://www.oecd.org/en/topics/health.html>): pro strojový dotaz
  dlouhodobě HTTP 403, kontrola dnes **neproběhla — neověřený kanál**. Health at
  a Glance 2026 se očekává až 11/2026, riziko zmeškané vlny je nízké.

## Nové legislativní normy / sněmovní tisky

- **Sněmovní tisk 235** (novela zákona o pojistném na veřejné zdravotní pojištění —
  valorizace platby za státní pojištěnce). Staženo dnes přímo z
  <https://www.psp.cz/sqw/historie.sqw?o=10&T=235>; stránka se sama označuje
  „**Stav projednávání ke dni: 10. září 2026**“. Historie končí u garančního
  výboru: usnesení Výboru pro zdravotnictví ze **4. 9. 2026** (tisk 235/1,
  *doporučuje schválit*), „další projednávání možné od 7. 9. 2026“, „projednávání
  tisku zařazeno na pořad 30. schůze (od 8. září 2026)“. **Druhé čtení k dnešku
  stále neproběhlo** — WARM položka přenesená z 8. 9. tedy zůstává otevřená a
  přenáší se dál. Článek `clanek-valorizace-statni-pojistenci-2027` věcně platí.
- **Věstník MZ ČR** (<https://mzd.gov.cz/vestniky/>, ověřeno 10. 9. 2026):
  poslední částky jsou **10/2026 (20. 8. 2026, SEAI 2026)** a **NIKEZ 1/2026
  (10. 8. 2026)**. Obě jsou v korpusu pokryté. Od 20. 8. nic nového.
- **Sbírka zákonů**: `zakonyprolidi.cz/cs/aktualne` vrací pro strojový dotaz
  HTTP 404/403 a `e-sbirka.gov.cz` je SPA bez serverem renderovaného výpisu.
  **Kanál dnes neověřen.**

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR — tiskové zprávy** (ověřeno 10. 9. 2026): od 8. 9. **žádná nová
  položka**. Nejnovější je pořád 7. 9. („Cestovatelé by ani na podzim neměli
  podceňovat ochranu před komáry“, osvěta, COLD). Starší už zpracované: 3. 9.
  EZKarta (`clanek-ezkarta-nova-generace`), 2. 9. onkologičtí koordinátoři,
  1. 9. screening karcinomu prostaty.
- **WHO Europe** (ověřeno 10. 9. 2026): nejnovější položka 8. 9. („Outgoing WHO
  Representative in Ukraine awarded by President“). Předchozí: humanitární sklady
  na Ukrajině (4. 9.), lesní požáry a klima (2. 9.), nový zástupce WHO (1. 9.).
  Žádná se zdravotnickým řezem pro ČR. **COLD.**
- **NÚKIB** (ověřeno 10. 9. 2026): od 4. 9. nic nového (Signal a ruští aktéři —
  4. 9., Festival bezpečného internetu — 1. 9.). Nic ke zdravotnictví ani NIS2.
  **COLD.**
- **SÚKL — registr výpadků léčiv**: `prehledy.sukl.cz` shodilo spojení
  (`Recv failure: Connection reset`), `sukl.cz` vrátil HTTP 503.
  **Kanál dnes neověřen.**

## Recenzovaná literatura (PubMed / Consensus)

Konektory `PubMed` i `Consensus` byly dnes **dostupné a použité**.

- **PubMed `search_articles`** — dotaz na afiliaci i název/abstrakt ČR
  (`("Czech Republic"[Title/Abstract] OR Czechia[Title/Abstract] OR "Czech
  Republic"[Affiliation] OR Czechia[Affiliation]) AND (health services OR
  mortality OR screening OR antimicrobial resistance OR enterococcus)`,
  `date_from` 2026/09/01, `datetype: edat`). Prvních 20 záznamů prošlo kontrolou:
  jde převážně o analytickou chemii, spektroskopii a klinické studie s českým
  spoluautorem, **nikoli o práce o českém zdravotním systému**. Nejblíž relevantní:
  - PMID 42657682 — Marques DFP et al., *Expert Rev Vaccines* 2026;25(1):2722420,
    [DOI 10.1080/14760584.2026.2722420](https://doi.org/10.1080/14760584.2026.2722420)
    — I-MOVE, očkování proti chřipce a nemocniční úmrtnost u 65+ (ČR mezi
    zúčastněnými centry, FN Brno). Relevantní k `ockovani_chripka_*`, ale
    dnešní běh 9. 9. už chřipkový indikátor zpracoval → **WARM, ne HOT.**
  - PMID 42288274 — Piggott C et al., *Clin Chim Acta* 2026;592:121180,
    [DOI 10.1016/j.cca.2026.121180](https://doi.org/10.1016/j.cca.2026.121180)
    — mezinárodní přehled schémat externího hodnocení kvality FIT testů
    (spoluautor P. Kocna, VFN/1. LF UK). Metodická práce ke screeningu
    kolorektálního karcinomu; **WARM** pro budoucí revizi screeningových článků.
  - Žádná domácí studie s přímým dopadem na indikátory dashboardu. **Žádný
    HOT nález.**
- **Consensus `search`** — použit k tématu dne (viz routing): „ampicillin plus
  ceftriaxone versus ampicillin plus gentamicin for *E. faecalis* infective
  endocarditis with high-level aminoglycoside resistance“. Vrátil 10 prací;
  tři nejsilnější (kohorta 2013, dvě metaanalýzy 2021 a 2024) byly **ověřeny
  v PubMed** (PMID/DOI, typ publikace) a jdou do článku. Consensus je zde
  **nástroj**, cituje se vždy nalezená práce.

## Aktualizace existujících dat (vlna)

- Žádná nová vlna od 8. 9. Poslední zpracované: Eurostat SHA (2. 9., zpracováno
  5. 9.), ECDC EARS-Net AER 2024 + Atlas (zpracováno 29. 8. a 8. 9.).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP**: `search_veklep_legislation` (dotaz „zdravotnictví“, 1 880 záznamů)
  vrací výsledky **řazené podle relevance, ne podle data**, a nenabízí datový
  filtr. První strana obsahuje materiály z let 2007–2024. **Kanál dnes ověřen jen
  částečně** — nový návrh z posledních 7 dní z tohoto výstupu potvrdit ani
  vyloučit nelze. Zaznamenávám jako metodické omezení, ne jako „žádný nový“.
- **ÚOHS**: `search_uohs_decisions` (dotaz „nemocnice“, 1 341 nálezů) vrátil
  odpověď o 401 802 znacích, kterou nelze v tomto běhu bezpečně zpracovat, a
  vrácené záznamy na první straně nenesou pole s datem vydání. **Kanál dnes
  ověřen jen částečně**, žádné rozhodnutí ze zdravotnictví se do výstupu
  neprobojovalo tak, aby šlo doložit datem.
- **Registr smluv**: dotaz dnes **nespuštěn** (kapacita běhu padla na ověřování
  hodnot pro článek). Neuvádím jako „žádná mimořádná smlouva“.
- **Ověřovna Barometru**: žádný nový kvantitativní výrok politika o zdravotnictví
  se v ověřených kanálech (MZ ČR TZ, PSP) mezi 8. a 10. 9. neobjevil.

## Doporučení pro routing fáze

- **HOT (nový indikátor)**: žádný. Populace v EARS-Net, které dashboard nemá, byly
  vyčerpány během 8. 9. (kombinovaná rezistence).
- **HOT (aktuální dění)**: žádný. Jediná otevřená legislativní stopa (tisk 235)
  se od 8. 9. neposunula.
- **WARM**: (a) tisk 235 — 2. čtení, přenášeno dál; (b) PMID 42657682 (I-MOVE,
  chřipka u 65+) k budoucí revizi očkovacích článků; (c) PMID 42288274 (EQA FIT)
  ke screeningovým článkům.
- **COLD**: MZ ČR, WHO Europe, NÚKIB, ČSÚ.
- **EVERGREEN**: fronta `data/article-backlog.json` má po doplnění z 8. 9.
  **dvě položky `status: ready`** — priority 18 (enterokoky) a 19 (vintage dat
  u výdajů na zdravotnictví). Kadenční pojistka je aktivní (3 dny od posledního
  ARTICLE/EVERGREEN-WRITE), takže routing padá sem. → **EVERGREEN-WRITE.**
