# Discovery report — 2026-08-31

Okno rešerše: **30. 8. – 31. 8. 2026** (poslední běh rutiny 30. 8., okno je
proto jednodenní). Všechny kanály ověřeny dotazem dnes, 31. 8. 2026.

## Nové indikátory / datasety

- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): beze změny — poslední
  věcná položka je dál **14. 8. „Vysoké teploty a mortalita"** (aid=8757),
  zbytek jsou nabídky zaměstnání z 3.–10. 8. → NIC.
- **NZIP datové zpravodajství** (nzip.cz/modul/datove-zpravodajstvi): tytéž
  čtyři položky jako 29. i 30. 8. (vysoké teploty a mortalita, laboratorní
  vyšetření, rakovina plic, stomatologická péče) → NIC.
- **NZIP dohodovací řízení — datové souhrny OIS-11-\***: sada **OIS-11-24**
  (náklady zdravotních pojišťoven dle segmentů) je dál ve verzi **2026-01**;
  edice `2026-02` vrací 404 (ověřeno přímým dotazem na soubor
  `Datovy-souhrn-OIS-11-24-...-2026-02.xlsx` dnes) → NIC nového ke stažení.
- **ČSÚ** (csu.gov.cz/aktuality): po 28. 8. nic nového — poslední položky jsou
  Newsletter 35/2026 a „Tvorba a užití HDP — 2. čtvrtletí 2026" (28. 8.)
  a odklady školní docházky (27. 8.). Nic demografického ani zdravotního → NIC.
- **Eurostat** (oficiální RSS `api/dissemination/catalogue/rss/en/
  statistics-update.rss`, 1 486 položek, feed pokrývá 24.–29. 8.): **žádný
  `hlth_*` dataset** v celém okně. Jediné blízké jsou regionální demografické
  sady `DEMO_R_*` (27.–28. 8., aktualizace dat) — populační, ne zdravotní →
  NIC.
- **OECD**: poslední vlna Health at a Glance zůstává 2025 (13. 11. 2025),
  Country Health Profile 12/2025 → NIC.

## Nové legislativní normy / sněmovní tisky

- **PSP tisk 235** (novela zákona o pojistném — mimořádná valorizace platby za
  státní pojištěnce), ověřeno na psp.cz dnes: **beze změny** — vláda předložila
  23. 6. 2026, 1. čtení 8. 7. 2026 (Sněmovna nesouhlasila se zrychleným
  projednáním, přikázala výborům), garanční Výbor pro zdravotnictví má návrh
  na programu **10. schůze 2. 9. 2026**, další projednávání možné od 7. 9.,
  30. schůze Sněmovny od 8. 9. → WARM (revize `valorizace-statni-pojistenci-2027`
  dává smysl až po jednání výboru, tedy nejdřív 2. 9.).
- **VeKLEP** (Hlídač státu, dotaz 31. 8., filtr od 24. 8.): **28 materiálů,
  z toho žádný v gesci MZ ČR.** Nejblíž zdravotnictví jsou dva materiály MPSV
  k evropským průkazům osob se zdravotním postižením (poslední úprava 25.
  a 26. 8.) — sociální dávková agenda, ne zdravotní služby. Zbytek: vodní zákon
  (MZe), dorovnávací daně a pojišťovnictví (MF), uznávání odborné kvalifikace
  (MŠMT), důchodové nařízení pro rok 2027, doprava, stavebnictví → NIC.
- **Sbírka zákonů**: zakonyprolidi.cz vrací agentovi dál 403 → kanál přímo
  neověřen. Přes VeKLEP ani přes feed MZ nezaznamenán nový předpis v gesci MZ.
- **MZ Věstník**: ve feedu MZ (WP API, 20 nejnovějších příspěvků) žádné nové
  číslo → beze změny.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR** (WP API `mzd.gov.cz/wp-json/wp/v2/posts`, ověřeno dnes): **nic
  nového po 28. 8.** Poslední položka je dál 28. 8. „Kvalita vody ke koupání —
  aktuální informace k 24. 8. 2026". Před ní jen 26. 8.: změna 3. výzvy NPO
  (zpracovaná článkem `clanek-npo-motol-termin-2026` z běhu 28. 8.), pozvánka
  na konferenci NIKEZ a série vyhlášení a výsledků výběrových řízení
  (rutinní úřední deska) → NIC nového.
- **SÚKL** (sukl.gov.cz WP API, ověřeno dnes): **nic nového po 28. 8.**
  Poslední položky: 28. 8. padělek Ozempicu, 27. 8. Seznamy cen a úhrad
  k 1. 9. 2026 (rutinní měsíční publikace), 26. 8. pozastavení distribuce
  Namaku s.r.o. → NIC.
- **NÚKIB**: nic po 21. 8. („Zpráva o stavu kybernetické bezpečnosti ČR za rok
  2025") → NIC.
- **WHO Europe** (who.int/europe/news-room, ověřeno dnes): poslední tisková
  zpráva je dál **28. 8. „New WHO collaborating centre to strengthen quality of
  care and people-centred health policies"** — institucionální oznámení bez
  datového obsahu a bez vazby na ČR → NIC.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna v okně 30.–31. 8.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 31. 8. 2026)

- **VeKLEP**: viz výše — 28 materiálů od 24. 8., žádný zdravotnický.
- **Registr smluv**: fulltext `nemocnice` s hodnotou nad 15 mil. Kč
  zveřejněný od 28. 8.: **1 záznam**, a to zástavní právo k pohledávkám mezi
  ČSOB a Oblastní nemocnicí Trutnov **podepsané 12. 1. 2018** (dodatečné
  zveřejnění staré smlouvy, 134,88 mil. Kč, u záznamu je příznak „zásadní
  nedostatek s vlivem na platnost smlouvy" — což je automatická značka
  Hlídače, ne rozhodnutí soudu nebo úřadu). Za sledované okno tedy **žádná
  nová mimořádná zdravotnická smlouva** → NIC.
- **ÚOHS**: fulltext `nemocnice OR zdravotní OR zdravotnictví OR pojišťovna`
  s právní mocí od 1. 8. 2026: **0 výsledků** → žádné nové rozhodnutí.

## Ověřovna Barometru — kandidáti

- Žádný nový kvantitativní výrok politika o zdravotnictví v okně.

## Doporučení pro routing fázi

- **HOT**: žádný nález s dnešním spouštěčem a plnou primární doložitelností.
- **WARM**: tisk 235 (jednání zdravotnického výboru 2. 9. 2026) — revize až
  po jednání.
- **COLD → EVERGREEN-WRITE.** Kadenční pojistka je dnes rozhodující: poslední
  nový článek vznikl **29. 8.** (`amr-multirezistence-soubeh`), tedy dva dny
  zpět, a dnešek je **pondělí — první den nového týdne s kvótou 0/3**.
  Prompt v takové situaci ukládá upřednostnit EVERGREEN-WRITE i před dostupným
  auditem. Evergreen backlog má tři položky se `status: ready`:
  - `npo-zdravotnictvi-bilance` (priorita 14) — nese podmínku „psát až **po**
    31. 8. 2026, kdy bude znám výsledek". Dnes je 31. 8., unijní lhůta teprve
    dnes končí a poslední žádost o platbu zveřejněná není → **stále nezralá**,
    stejně jako včera;
  - `nemocnicni-ambulance-64-miliard` (priorita 15) — datový základ (OIS-11-24
    verze 2026-01 + Tabulka č. 3 přílohy MZ) je dnes dostupný a stažený
    → **zralá, vybrána**;
  - `centrova-leciva-37-miliard` (priorita 16) — zralá, ale nižší priorita.
