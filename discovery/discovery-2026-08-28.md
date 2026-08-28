# Discovery report — 2026-08-28

Okno rešerše: **24. 8. – 28. 8. 2026** (poslední běh rutiny 24. 8.; 25.–27. 8.
rutina neběžela, okno je proto čtyřdenní).

## Nové indikátory / datasety

- ÚZIS aktuality (uzis.cz/index.php?pg=aktuality, ověřeno 28. 8.): poslední
  věcná položka dál **14. 8. „Vysoké teploty a mortalita"**, nic novějšího
  (jen pracovní inzeráty 7. a 10. 8.) → NIC.
- NZIP datové zpravodajství (nzip.cz/modul/datove-zpravodajstvi, ověřeno
  28. 8.): jediná datovaná položka „Vysoké teploty a mortalita" (položka
  2833), ostatní (laboratorní vyšetření, rakovina plic, stomatologie)
  bez data a zachyceny reporty 11.–16. 8. → NIC nového.
- ČSÚ (csu.gov.cz/aktuality, ověřeno 28. 8.): poslední relevantní 24. 8.
  „Indexy cen výrobců — červenec 2026"; nic demografického ani zdravotního
  → NIC.
- Eurostat (oficiální RSS `api/dissemination/catalogue/rss/en/
  statistics-update.rss`, ověřeno 28. 8., okno 20.–27. 8.): **žádný `hlth_*`
  dataset**. Ve feedu jen energetika, migrace, obchod a demografie
  (DEMO_R_BIRTHS, DEMO_R_DEATHS, DEMO_R_FAGEC3 — obecná demografie, ne
  zdravotní řady) → NIC.
- OECD (WebSearch fallback, ověřeno 28. 8.): poslední vlna Health at a Glance
  zůstává 2025 (13. 11. 2025), Country Health Profile 2025 (12/2025).
  Žádná nová srpnová publikace → NIC.
- PubMed (dotaz 28. 8., `Czech Republic[Affiliation]` + healthcare/health
  system/mortality/hospital): filtr podle EDAT nevrátil spolehlivě omezenou
  množinu (server ignoroval datové okno, vrátil 41 092 záznamů) → kanál
  tento den **nepřinesl použitelný nález**; nejde o potvrzení, že nic není.

## Nové legislativní normy / sněmovní tisky

- **PSP tisk 235** (novela zák. o pojistném — mimořádná valorizace platby za
  státní pojištěnce, VZ 18 362 Kč od 1. 1. 2027), ověřeno na psp.cz 28. 8.:
  proti stavu z 24. 8. **posun** — garanční Výbor pro zdravotnictví má tisk
  nově na **pozvánce na jednání č. 10 dne 2. 9. 2026**; 30. schůze Sněmovny
  od 8. 9. Věcně beze změny (1. čtení 8. 7. 2026, výbory dosud neprojednaly).
  → WARM, pokrývá už `clanek-valorizace-statni-pojistenci-2027`.
- **VeKLEP** (Hlídač státu, dotaz 28. 8., okno od 20. 8.): 30 materiálů,
  z toho **žádný nový zdravotnický**. Nařízení vlády o vyměřovacím základu
  pro rok 2027 (KORNDWFEFC5X, 2026-0197) beze změny — poslední úprava
  20. 8. 2026, tj. stav popsaný v reportu 24. 8. Jinak důchody 2027,
  vodní zákon, dorovnávací daně, evropské průkazy OZP (MPSV) → NIC nového
  ve zdravotnictví.
- Sbírka zákonů: zakonyprolidi.cz dál vrací agentovi 403; přes VeKLEP ani
  MZ Věstník nezaznamenán nový předpis v gesci MZ → NIC.
- MZ Věstník: beze změny (poslední č. 10/2026).
- SÚKL Věstník 8/2026 zveřejněn 20. 8. (rutinní).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **HOT — MZ ČR, 26. 8. 2026: „Ministerstvo zdravotnictví změnilo 3. výzvu
  NPO"**. Ministerstvo posunulo u předem definovaného projektu *Vybudování
  Českého onkologického institutu – Motolského onkologického centra*
  (komponenta 6.2 NPO, alokace **4 073 405 000 Kč**, míra podpory 100 %)
  **datum ukončení způsobilosti výdajů i datum ukončení realizace projektu
  z 31. 8. 2026 na 30. 11. 2026** a aktualizovalo název oprávněného žadatele.
  Změna platí od **27. 8. 2026** — tj. **čtyři dny před původním termínem**.
  Ověřeno **stažením a strojovým přečtením primárních dokumentů výzvy**
  (28. 8. 2026):
  - `01_V_Text_-3_vyzvy_NP_MOC-3.0.pdf` (verze 3.0, platnost od 27. 08. 2026):
    ukončení realizace **30. 11. 2026**, alokace 4 073 405 000 Kč, oprávnění
    žadatelé **„Fakultní nemocnice Motol a Homolka"**;
  - `01_V_Text_-3_vyzvy_NP_MOC-2.0-1.pdf` (verze 2.0, platnost od 15. 12. 2025):
    ukončení realizace **31. 8. 2026**, tatáž alokace, oprávnění žadatelé
    **„Fakultní nemocnice v Motole"**.
  Kontext: čl. 18 odst. 4 písm. i) nařízení (EU) 2021/241 (RRF) požaduje
  milníky a cíle *„to be completed by 31 August 2026"* (ověřeno verbatim na
  EUR-Lex 28. 8.). 8. výzva MZ (hematoonkologie, 3 556 900 000 Kč) drží
  v aktuální verzi 4.0 (platnost od 23. 6. 2026) termín **31. 8. 2026** —
  ověřeno stejným způsobem z `Text_8._vyzvy_NPO_6.2_4.0.pdf`.
  Za poslední dva měsíce je 3. výzva **jedinou** změněnou výzvou NPO na MZ
  (kategorie „Národní plán obnovy", ověřeno 28. 8.).
  MZ **neuvádí důvod** posunu.
  URL: https://mzd.gov.cz/ministerstvo-zdravotnictvi-zmenilo-3-vyzvu-npo-3/
- MZ ČR — ostatní (WP API, ověřeno 28. 8.): 26. 8. konference NIKEZ 2026
  (organizační); zbytek 25.–26. 8. jsou vyhlášení a výsledky výběrových
  řízení o smlouvy (rutinní úřední deska) → NIC.
- SÚKL (sukl.gov.cz, ověřeno 28. 8.): 26. 8. pozastavení povolení
  k distribuci (Namaku s.r.o.), 24. 8. tisková informace o stahování léčiv,
  25. 8. Seznam cen a úhrad PZLÚ k 1. 9. → rutinní, NIC.
- NÚKIB (ověřeno 28. 8.): nic po 21. 8. (Zpráva o stavu kybernetické
  bezpečnosti 2025, zpracována) → NIC.
- WHO Europe (ověřeno 28. 8.): stránky news/releases vrátily 404, resp.
  prázdný filtr → kanál tento den **neověřen**, nejde o potvrzení, že nic
  není.
- VZP dokumenty: rozcestník beze změny → NIC.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna v okně 24.–28. 8.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 28. 8. 2026)

- **VeKLEP**: viz výše — žádný nový zdravotnický materiál od 20. 8.
  (hlidacstatu.cz, dataset veklep)
- **Registr smluv**, kategorie `zdrav`, zveřejněno od 24. 8., hodnota
  ≥ 20 mil. Kč: **4 smlouvy, souhrn 339,0 mil. Kč** — FN Ostrava /
  Janssen-Cilag (apalutamid, 110,6 mil. Kč, 20. 8.), IKEM / Boston Scientific
  (ICD přístroje třídy D, 108,9 mil. Kč, 21. 8.), IKEM / SYNEKTIK (výpůjčka
  robota da Vinci 5. generace, 96,8 mil. Kč, 21. 8.), IKEM / WEST MEDICAL
  (sternální fixační systémy, 22,7 mil. Kč, 21. 8.). Žádná se skrytou cenou,
  žádná s příznakem vážného problému → **žádná mimořádná**. (hlidacstatu.cz)
- **ÚOHS**: fulltext nemocnice / zdravotní / zdravotnictví s právní mocí od
  1. 7. 2026: **0 výsledků** → žádné nové. (hlidacstatu.cz)

## Ověřovna Barometru — kandidáti

- Žádný nový kvantitativní výrok politika o zdravotnictví v okně.

## Doporučení pro routing fázi

- **HOT (aktuální dění, plná primární doložitelnost)**: posun termínu
  3. výzvy NPO u Motolského onkologického centra → **ARTICLE-WRITE**,
  rubrika `financovani`. Termínová vazba (31. 8. 2026 je za tři dny),
  úplná dokladovatelnost ze dvou verzí primárního dokumentu výzvy
  a z textu nařízení (EU) 2021/241, mezera v korpusu (žádný ze 262 článků
  Motolské onkologické centrum ani lhůtu NPO nepokrývá).
- **WARM**: tisk 235 na programu zdravotnického výboru 2. 9. (revize
  `valorizace-statni-pojistenci-2027` až po jednání); WHO „More than
  a mother"; OECD CVD policy brief.
- **COLD**: fallback-audit není namístě (HOT k dispozici). Evergreen backlog
  je fakticky vyčerpán — viz routing report.
