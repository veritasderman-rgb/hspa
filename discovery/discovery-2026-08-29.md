# Discovery report — 2026-08-29

Okno rešerše: **28. 8. – 29. 8. 2026** (poslední běh rutiny 28. 8., okno je
proto jednodenní).

## Nové indikátory / datasety

- ÚZIS aktuality (uzis.cz/index.php?pg=aktuality, ověřeno 29. 8.): beze změny
  proti 28. 8. — poslední věcná položka dál **14. 8. „Vysoké teploty
  a mortalita"** → NIC.
- NZIP datové zpravodajství (nzip.cz/modul/datove-zpravodajstvi, ověřeno
  29. 8.): tytéž čtyři položky jako 28. 8., žádná nová → NIC.
- ČSÚ (csu.gov.cz/aktuality, ověřeno 29. 8.): 28. 8. „Tvorba a užití HDP —
  2. čtvrtletí 2026" a Newsletter 35/2026; 27. 8. odklady školní docházky.
  Nic demografického ani zdravotního → NIC.
- Eurostat (oficiální RSS `api/dissemination/catalogue/rss/en/
  statistics-update.rss`, ověřeno 29. 8., okno od 26. 8.): vlna z 28. 8.
  neobsahuje **žádný `hlth_*` dataset** (jen zemědělství, energetika, národní
  účty, urbánní statistiky, obecná demografie DEMO_R_*) → NIC.
- OECD: poslední vlna Health at a Glance zůstává 2025 (13. 11. 2025),
  Country Health Profile 12/2025 → NIC (beze změny proti 28. 8.).

## Nové legislativní normy / sněmovní tisky

- **PSP tisk 235** (novela zák. o pojistném — mimořádná valorizace platby za
  státní pojištěnce), ověřeno na psp.cz 29. 8.: **beze změny** proti stavu
  z 28. 8. — 1. čtení 8. 7. 2026, výbory dosud neprojednaly, garanční Výbor
  pro zdravotnictví má tisk na pozvánce na jednání 2. 9. 2026, 30. schůze
  Sněmovny od 8. 9. → WARM (revize `valorizace-statni-pojistenci-2027`
  má smysl až po jednání výboru).
- **VeKLEP** (Hlídač státu, dotaz 29. 8., filtr `datumPosledniUpravy` od
  27. 8.): **4 materiály, z toho žádný zdravotnický** — vodní zákon (MZe),
  dorovnávací daně (MF), vyhláška o bankovkách, nařízení vlády o žádostech
  občanů třetích zemí. → NIC.
- Sbírka zákonů: zakonyprolidi.cz dál vrací agentovi 403 → kanál neověřen
  přímo; přes VeKLEP ani MZ nezaznamenán nový předpis v gesci MZ.
- MZ Věstník: v feedu MZ (WP API, 20 nejnovějších příspěvků) žádné nové
  číslo → beze změny (poslední č. 10/2026).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- MZ ČR (WP API, ověřeno 29. 8.): jediná položka po 26. 8. je **28. 8.
  „Kvalita vody ke koupání — aktuální informace k 24. 8. 2026"** (rutinní
  sezónní monitoring). Změna 3. výzvy NPO (26. 8.) je již zpracovaná
  článkem `clanek-npo-motol-termin-2026` z běhu 28. 8. → NIC nového.
- SÚKL (sukl.gov.cz, ověřeno 29. 8.): **28. 8. informace o výskytu padělku
  léčivého přípravku Ozempic** (šarže RT6KL87); 20. 8. tatáž informace
  k přípravku Mounjaro. Dvě upozornění na padělky GLP-1 v jednom měsíci je
  zaznamenáníhodné, ale jde o rutinní bezpečnostní komunikaci regulátora bez
  kvantifikovatelného dopadu na indikátory dashboardu → **WARM**, ne HOT.
- NÚKIB (ověřeno 29. 8.): nic po 21. 8. → NIC.
- WHO Europe (ověřeno 29. 8.): stránky `news-room/releases` vrátily 404,
  `news` vrátila prázdný filtr → kanál tento den **neověřen**; nejde
  o potvrzení, že nic není.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna v okně 28.–29. 8.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 29. 8. 2026)

- **VeKLEP**: viz výše — žádný nový zdravotnický materiál od 27. 8.
- **Registr smluv**: kanál **tento den neověřen** — nástroj
  `search_contracts` MCP serveru hlidac-statu vracel na všechny dotazy
  (i na prostý fulltext bez filtrů) chybu `An error occurred invoking
  'search_contracts'`, stejně jako `ping`. Jde o výpadek endpointu, ne
  o prázdný výsledek. **Nejde o potvrzení, že žádná mimořádná smlouva
  není.** (`search_veklep_legislation` a `search_uohs_decisions` téhož
  serveru fungovaly.)
- **ÚOHS**: fulltext `nemocnice` s právní mocí od 1. 8. 2026: **0 výsledků**
  → žádné nové rozhodnutí. (hlidacstatu.cz)

## Ověřovna Barometru — kandidáti

- Žádný nový kvantitativní výrok politika o zdravotnictví v okně.

## Doporučení pro routing fázi

- **HOT**: žádný nález s dnešním spouštěčem a plnou primární doložitelností.
- **WARM**: tisk 235 (jednání zdravotnického výboru 2. 9.); dvě upozornění
  SÚKL na padělky GLP-1 (20. a 28. 8.).
- **COLD → EVERGREEN-WRITE**: kadenční pojistka vynucuje nový článek
  (týdenní kvóta 2/3, viz routing report). Evergreen backlog má položku
  `amr-multirezistence-soubeh` (priorita 13), jejíž metodická podmínka
  („ko-rezistenci nelze dopočítat z dílčích podílů — buď se dohledá
  v EARS-Net, nebo se nepíše") je **splnitelná**: ECDC Surveillance Atlas
  publikuje pro čtyři patogeny samostatnou populaci *Combined resistance*
  s vlastním čitatelem i jmenovatelem (ověřeno dotazem na Atlas API 29. 8.).
