# Discovery report — 2026-08-16

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality: jediná datová položka „Vysoké teploty
  a mortalita" (14. 8.) je NZIP datový souhrn, který už zpracoval článek
  `clanek-vedra-umrtnost-data.html` z běhu 14. 8. → NIC nového.
- NZIP datové zpravodajství: beze změny proti 14. 8. (vysoké teploty a mortalita,
  laboratorní vyšetření, rakovina plic, stomatologická péče — vše zachyceno
  dřívějšími běhy) → NIC.

## Nové legislativní normy / sněmovní tisky
- PSP: historie.sqw dnes 503, sntisk.sqw vrací jen vyhledávací formulář.
  Sněmovna je mezi schůzemi (další projednávání tisků 235 a 274 možné
  od 7. 9. 2026, stav ověřen 12. 8.) → riziko změny o víkendu minimální.
- Sbírka zákonů: e-sbirka.gov.cz dnes vrací jen prázdnou hlavičku (JS aplikace,
  bez SSR obsahu); zakonyprolidi.cz trvale 403 → kanál dnes neprůchozí,
  prověřit v příštím běhu.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR (mzd.gov.cz/vsechny-novinky, ověřeno 16. 8.):
  - 14. 8. „Krev nemá prázdniny" — výzva k darování krve kvůli letnímu poklesu
    zásob. Bez nového datasetu; korpus téma pokrývá
    (`clanek-darcovstvi-krve-plazma.html`, 19. 7.) → NIC (soft news).
  - 14. 8. Kvalita vody ke koupání k 10. 8. → mimo záběr (SZÚ surveillance).
  - 12. 8. „Situace s tamoxifenem se stabilizuje… dalších více než 10 tisíc
    balení" — už zapracováno v `clanek-tamoxifen-vypadek.html` (publikován
    13. 8., cituje přímo tuto TZ) → NIC nového.
  - 11. 8. geriatrická péče (2. setkání), mamografický screening (osvěta) →
    bez dat, NIC.
- ÚZIS aktuality: 14. 8. „Vysoké teploty a mortalita" (viz výše — pokryto);
  jinak jen personální inzeráty (3.–10. 8.) → NIC.
- SZÚ: nejnovější 10. 8. (biomonitoring mateřského mléka — zachyceno 12. 8.)
  → NIC.
- NÚKIB: 13. 8. měsíční přehled kyberincidentů za červenec 2026 (obecný, bez
  zdravotnické specifiky); 10. 8. Zimbra advisory (zachyceno 12. 8.) → NIC.
- WHO Europe: news výpis přes proxy vrací prázdný filtr → kanál dnes
  neprůchozí; 12. 8. beze změny relevantní pro ČR.
- SÚKL: sukl.gov.cz/aktuality vrací prázdný obsah (JS aplikace) → kanál dnes
  neprůchozí; výpadky tamoxifen + kvetiapin už zpracovány (8. a 13. 8.).
- OECD: policy brief „Strengthening health checks for the prevention and
  management of cardiovascular disease" (11. 8. 2026, 13 s., série The State
  of Cardiovascular Health in the EU) — oecd.org přes proxy stále **403**,
  plný text nelze strojově ověřit → **WARM carry-over** (kandidát, jakmile
  bude text dostupný; navazoval by na `clanek-preventivni-prohlidka.html`
  a `clanek-kardiovaskularni-mortalita.html`).

## Aktualizace existujících dat (vlna)
- Žádná nová vlna ÚZIS/ČSÚ/Eurostat zjištěna (ČSÚ aktuality přes proxy 404;
  Eurostat vlna 2024 HLY/HLE zachycena 12.–13. 8.).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní, dotaz 16. 8. 2026)
- VeKLEP: jediný pohyb u materiálů MZ = novela z. 258/2000 Sb. (očkování
  u farmaceutů, PID ALBSDUUFQ5OR) — poslední úprava 11. 8., zpracováno
  včerejším článkem `clanek-ockovani-v-lekarnach.html` → žádný nový návrh.
  (hlidacstatu.cz dataset veklep, dotaz 16. 8. 2026)
- Registr smluv (kategorie léčiva/zdravotnictví, > 50 mil. Kč, zveřejněno
  9.–16. 8.): FN Motol — dodatek č. 7 SoD „Rekonstrukce LDN" s Metrostav CZ,
  297,2 mil. Kč, podepsán 12. 8. (prodloužení termínu dokončení,
  hlidacstatu.cz smlouva id 39123602); VFN Praha — nákup IBRUTINIB 156,6 mil.
  Kč (Janssen-Cilag, 11. 8., id 39130934); FN Brno — FARICIMAB 100,4 mil. Kč
  (ROCHE, 12. 8., id 39090078). Rutinní nákupy centrových léčiv; dodatek
  Motol = kandidát rubriky „Peníze ve zdravotnictví" jen při dalším vývoji
  (samotné prodloužení termínu bez výroku kontrolního orgánu není kauza).
  (hlidacstatu.cz, dotaz 16. 8. 2026)
- ÚOHS: žádné nové zdravotnické rozhodnutí s právní mocí/uveřejněním od
  1. 8. 2026 (hlidacstatu.cz dataset rozhodnuti-uohs, dotaz 16. 8. 2026).

## Ověřovna Barometru — kandidáti
- Žádný nový kvantitativní výrok politika o zdravotnictví nezachycen
  (víkend, MZ TZ bez číselných výroků politiků).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný
- HOT (aktuální dění): žádný použitelný (tamoxifen i vedra už pokryty,
  OECD brief nedostupný)
- WARM: OECD CVD policy brief (čeká na dostupnost plného textu)
- COLD: evergreen backlog má 4 položky `ready` (priority 9–12)
  → **EVERGREEN-WRITE, priorita 9: sousede-serie-dostupnost**
