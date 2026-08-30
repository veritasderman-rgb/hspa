# Discovery report — 2026-08-30

Okno rešerše: **29. 8. – 30. 8. 2026** (poslední běh rutiny 29. 8., okno je
proto jednodenní). Všechny kanály ověřeny dotazem dnes, 30. 8. 2026.

## Nové indikátory / datasety

- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): beze změny proti 29. 8.
  — poslední věcná položka dál **14. 8. „Vysoké teploty a mortalita"**
  (aid=8757); zbytek jsou nabídky zaměstnání (3.–10. 8.) → NIC.
- **NZIP datové zpravodajství** (nzip.cz/modul/datove-zpravodajstvi): tytéž
  položky jako 29. 8. (vysoké teploty a mortalita, laboratorní vyšetření,
  rakovina plic, stomatologická péče) → NIC.
- **NZIP dohodovací řízení** (nzip.cz/dohodovaci-rizeni): datové souhrny
  OIS-11-\* jsou dál ve **verzi 2026-01**; edice `2026-02`, `2027-01`
  a `2027-02` vracejí 404 (ověřeno HEAD dotazem na obě sledované sady,
  OIS-11-24 i OIS-11-05) → NIC nového ke stažení.
- **ČSÚ** (csu.gov.cz/aktuality): 28. 8. Newsletter 35/2026 a „Tvorba a užití
  HDP — 2. čtvrtletí 2026", 27. 8. odklady školní docházky. Nic
  demografického ani zdravotního → NIC.
- **Eurostat** (oficiální RSS `api/dissemination/catalogue/rss/en/
  statistics-update.rss`, feed pokrývá 24.–29. 8.): **žádný `hlth_*` dataset**
  v celém okně (poslední vlna 29. 8. je STS/EI/NAMA — krátkodobé podnikové
  a národní účty) → NIC.
- **OECD**: poslední vlna Health at a Glance zůstává 2025 (13. 11. 2025),
  Country Health Profile 12/2025 → NIC.

## Nové legislativní normy / sněmovní tisky

- **PSP tisk 235** (novela zák. o pojistném — mimořádná valorizace platby za
  státní pojištěnce), ověřeno na psp.cz 30. 8.: **beze změny** — vláda
  předložila 23. 6. 2026, 1. čtení 8. 7. 2026 (Sněmovna nesouhlasila se
  zrychleným projednáním, přikázala výborům), garanční Výbor pro zdravotnictví
  má jednat **2. 9. 2026**, 30. schůze Sněmovny od 8. 9. → WARM (revize
  `valorizace-statni-pojistenci-2027` dává smysl až po jednání výboru).
- **VeKLEP** (Hlídač státu, dotaz 30. 8., filtr od 23. 8.): **28 materiálů,
  z toho žádný v gesci MZ ČR.** Nejblíže zdravotnictví jsou dva materiály
  MPSV k evropským průkazům osob se zdravotním postižením (aktualizace
  25. a 26. 8.) — sociální dávková agenda, ne zdravotní služby. Zbytek:
  vodní zákon (MZe), dorovnávací daně a pojišťovnictví (MF), uznávání
  odborné kvalifikace (MŠMT), důchodové nařízení, doprava, stavebnictví
  → NIC.
- **Sbírka zákonů**: zakonyprolidi.cz dál vrací agentovi 403, e-sbirka.gov.cz
  vrátila prázdný SPA shell → kanál **přímo neověřen**. Přes VeKLEP ani přes
  feed MZ nezaznamenán nový předpis v gesci MZ.
- **MZ Věstník**: ve feedu MZ (WP API, 25 nejnovějších příspěvků) žádné nové
  číslo → beze změny.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR** (WP API `wp-json/wp/v2/posts`, ověřeno 30. 8.): **nic nového po
  28. 8.** Poslední položka je dál 28. 8. „Kvalita vody ke koupání — aktuální
  informace k 24. 8. 2026" (rutinní sezónní monitoring). Změna 3. výzvy NPO
  (26. 8.) je zpracovaná článkem `clanek-npo-motol-termin-2026` z běhu 28. 8.
  → NIC nového.
- **SÚKL** (sukl.gov.cz WP API, ověřeno 30. 8.): **nic nového po 28. 8.**
  Poslední položky: 28. 8. padělek Ozempicu (šarže RT6KL87), 27. 8. Seznamy
  cen a úhrad k 1. 9. 2026 (rutinní měsíční publikace), 26. 8. pozastavení
  distribuce Namaku s.r.o. → NIC.
- **NÚKIB** (nukib.gov.cz): nic po 21. 8. („Zpráva o stavu kybernetické
  bezpečnosti ČR za rok 2025") → NIC.
- **WHO Europe** (who.int/europe/news-room, ověřeno 30. 8.): poslední
  tisková zpráva **28. 8. „New WHO collaborating centre to strengthen quality
  of care and people-centred health policies"** — institucionální oznámení
  bez datového obsahu a bez vazby na ČR → NIC.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna v okně 29.–30. 8.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 30. 8. 2026)

- **VeKLEP**: viz výše — žádný zdravotnický materiál od 23. 8.
- **Registr smluv**: nástroj `search_contracts` je **částečně funkční** —
  volání s parametrem `categories` (`zdrav_*`) selhává chybou
  `An error occurred invoking 'search_contracts'`, volání s `keywords`
  funguje. Fulltext `nemocnice` s hodnotou nad 20 mil. Kč od 27. 8.: **2
  záznamy**, z toho jediný nový je rutinní nákup — VFN v Praze × CSL Behring,
  *Kupní smlouva — Nákup normální lidský imunoglobulin pro intravenózní
  podání I. — opakovaná*, podepsáno 21. 8. 2026, 32,94 mil. Kč. Bez skryté
  ceny, bez příznaku právního rizika → **žádná mimořádná smlouva**.
  (Filtr podle kategorií tento den nešel spustit — nejde tedy o úplné
  pokrytí segmentu.)
- **ÚOHS**: fulltext `nemocnice OR zdravotní OR zdravotnictví` s právní mocí
  od 1. 8. 2026: **0 výsledků** → žádné nové rozhodnutí.

## Ověřovna Barometru — kandidáti

- Žádný nový kvantitativní výrok politika o zdravotnictví v okně.

## Doporučení pro routing fázi

- **HOT**: žádný nález s dnešním spouštěčem a plnou primární doložitelností.
- **WARM**: tisk 235 (jednání zdravotnického výboru 2. 9. 2026) — revize až
  po jednání.
- **COLD → FALLBACK-AUDIT.** Evergreen backlog má jedinou položku se
  `status: ready` (`npo-zdravotnictvi-bilance`, priorita 14) a ta nese
  explicitní podmínku „psát až po 31. 8. 2026, kdy bude znám výsledek".
  Dnes je 30. 8. → **nezralá**. Týdenní kvóta (po–ne 24.–30. 8.) je splněna:
  **3/3 nové články** (24. 8. `valorizace-statni-pojistenci-2027`,
  28. 8. `npo-motol-termin-2026`, 29. 8. `amr-multirezistence-soubeh`),
  kadenční pojistka tedy EVERGREEN-WRITE nevynucuje. → **audit nejstaršího
  článku.**
