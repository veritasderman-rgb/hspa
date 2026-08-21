# Discovery report — 2026-08-21

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality (uzis.cz, ověřeno 21. 8.): poslední položka
  „Vysoké teploty a mortalita" (14. 8.), zpracována 14. 8. → NIC nového.
- ČSÚ (csu.gov.cz/aktuality, ověřeno 21. 8. — kanál dnes PRŮCHOZÍ, na rozdíl
  od 17.–20. 8.): novinky 14.–20. 8. bez zdravotní relevance (indexy cen
  výrobců, VŠPS zaměstnanost Q2, tisková konference ke školnímu roku) → NIC.
- Eurostat: žádná nová vlna zjištěna (SILC 2024/2025 zachycena 12.–13. 8.).
- NZIP datové zpravodajství: neprověřováno dnes (kanál 16.–20. 8. neprůchozí).
- OECD: oecd.org přes proxy dlouhodobě 403 → CVD policy brief zůstává
  **WARM carry-over**.

## Nové legislativní normy / sněmovní tisky
- **MZ ČR Věstník č. 10/2026** (vydán 20. 8. 2026, PDF ověřeno stažením
  21. 8.): 1) **Seznam esenciálních antiinfektiv (SEAI) 2026** (s. 3–27 —
  stavy registrace/dostupnosti 1–7 k 29. 5. 2026, WHO AWaRe klasifikace,
  adaptace WHO Model List of Essential Medicines 24th List), 2) výzva
  Centra vysoce specializované hematologické a hematoonkologické péče
  (HOC) na období 2026–2030 (§ 112 z. č. 372/2011 Sb.), 3) organizace
  a hodnocení kvality hematoonkologické péče, 4) Národní radiologické
  standardy — radiační onkologie, 5) metodický pokyn HPB onkochirurgie.
  → **HOT** (SEAI: strojově ověřitelný celý obsah, návaznost na korpus
  výpadků léčiv a antibiotické série)
- PSP: sněmovna mezi schůzemi (tisky 235, 274 — další posun možný od
  7. 9. 2026; stav z 12. 8.) → beze změny; historie.sqw dnes vrací
  „tisk nenalezen" bez parametru.
- Sbírka zákonů: zakonyprolidi.cz trvale 403 přes proxy → kanál neprůchozí.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- **MZ ČR, TZ 20. 8. 2026**: „Ministerstvo zdravotnictví a Masarykova
  univerzita posílí propojení vzdělávání zdravotníků s praxí" — memorandum,
  bez nových kvantitativních dat. → WARM (téma personálu hustě pokryto
  korpusem; TZ 18. 8. s čísly programů už zachycena 20. 8.)
- SÚKL (sukl.gov.cz, ověřeno 21. 8.): 20. 8. upozornění na padělek Mounjaro
  (záchyt mimo legální řetězec), Věstník SÚKL 8/2026, obsah Českého lékopisu
  2023 → minor (padělky = opakující se agenda, bez systémového čísla).
- SZÚ (szu.gov.cz, ověřeno 21. 8.): nejnovější 10. 8. (biomonitoring
  mateřského mléka, zachyceno dřív) → NIC.
- NÚKIB: nukib.cz dnes 503 → kanál neprůchozí (13. 8. přehled bez
  zdravotnické specifiky byl poslední známý stav).
- WHO Europe (ověřeno 21. 8.): položky 18.–19. 8. bez vazby na ČR (Moldova
  trauma týmy, World Humanitarian Day, women's health deep-dive) → NIC.
- VZP (vzp.cz, ověřeno 21. 8.): seznam aktualit se nevykresluje (JS obsah),
  žádný nový dokument zjistitelný → NIC.
- PubMed (dotaz 21. 8., EDAT 14.–21. 8., „Czech Republic" + health): 38
  nových záznamů; žádný s HSPA relevancí nadřazenou HOT nálezu SEAI
  → neprioritizováno.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna zjištěna.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 21. 8. 2026)
- VeKLEP (předkladatel MZ ČR, datumPosledniUpravy 14.–22. 8.): **žádný
  záznam**. Širší okno 1.–22. 8. potvrzuje jen známé: novela z. č. 325/2021 Sb.
  o elektronizaci zdravotnictví (PID ALBSDVLDLD32, změna 4. 8.) a novela
  z. č. 258/2000 Sb. (PID ALBSDUUFQ5OR, změna 11. 8., pokryta článkem
  ockovani-v-lekarnach). (hlidacstatu.cz dataset veklep, dotaz 21. 8. 2026)
- Registr smluv: nástroj `search_contracts` dnes vrací serverovou chybu
  při všech dotazech → **kanál neprůchozí**, bez náhrady (generický search
  nevrací dataset smluv). Zítra opakovat.
- ÚOHS: fulltext „zdravotnictví OR nemocnice" — žádné rozhodnutí s datem
  vydání ze srpna 2026 (srpnová data v odpovědi jsou jen crawl timestampy
  DbCreated). → žádné nové. (hlidacstatu.cz, dotaz 21. 8. 2026)

## Doporučení pro routing fáze
- HOT (nový dokument): **SEAI 2026** — Věstník MZ č. 10/2026 (20. 8.),
  strojově ověřitelný seznam esenciálních antiinfektiv se stavem
  dostupnosti 1–7; meziroční srovnání se SEAI 2025 (Věstník 8/2025) možné
  ze dvou primárních PDF.
- WARM: memorandum MZ × MUNI (bez čísel); OECD CVD policy brief
  (carry-over, kanál 403); HOC výzva 2026–2030 (Věstník 10/2026, položka
  2–3 — kandidát na samostatný článek o centralizaci hematoonkologie,
  vhodné až po SEAI).
- COLD: fallback-audit není potřeba (HOT k dispozici).
