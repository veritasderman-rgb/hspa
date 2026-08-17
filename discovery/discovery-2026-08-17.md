# Discovery report — 2026-08-17

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality (uzis.cz, ověřeno 17. 8.): poslední datová
  položka „Vysoké teploty a mortalita" (14. 8.) už zpracována článkem
  `clanek-vedra-umrtnost-data.html` (běh 14. 8.); od 15. 8. jen ticho
  (personální inzeráty 7. a 10. 8.) → NIC nového.
- NZIP datové zpravodajství: nzip.cz/data dnes 404 (i s trailing slash a
  přes kategorii) → kanál dnes neprůchozí; poslední známý stav (16. 8.)
  beze změny proti 14. 8.

## Nové legislativní normy / sněmovní tisky
- PSP: historie.sqw vrací jen prázdný formulář („Sněmovní tisk nebyl
  nalezen") — sněmovna mezi schůzemi, další projednávání tisků 235 a 274
  možné od 7. 9. 2026 (stav ověřen 12. 8.) → beze změny.
- Sbírka zákonů: zakonyprolidi.cz trvale 403 přes proxy → kanál neprůchozí,
  prověřit v příštím běhu.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR (mzd.gov.cz/vsechny-novinky, ověřeno 17. 8.): žádná nová TZ
  15.–17. 8.; poslední 14. 8. („Krev nemá prázdniny" — soft news, pokryto
  `clanek-darcovstvi-krve-plazma.html`; kvalita vody — mimo záběr) → NIC.
- SZÚ (szu.gov.cz/aktuality, ověřeno 17. 8.): nejnovější 10. 8.
  (biomonitoring mateřského mléka — zachyceno 12. 8.) → NIC.
- NÚKIB (ověřeno 17. 8.): poslední 13. 8. měsíční přehled kyberincidentů za
  červenec (bez zdravotnické specifiky) → NIC.
- WHO Europe (who.int/europe/news-room, ověřeno 17. 8.): poslední výpis
  končí 10. 8. (GIS roadmap, Ukrajina — bez vazby na ČR) → NIC.
- SÚKL: sukl.cz/farmaceuticky-trh/registr-vypadku-leciv dnes **503** →
  kanál neprůchozí; výpadky tamoxifen + kvetiapin zpracovány (8. a 13. 8.).
- VZP (vzp.cz/o-nas/dokumenty, ověřeno 17. 8.): jen kategorie dokumentů,
  žádný nový dokument se srpnovým datem viditelný → NIC.
- ČSÚ: csu.gov.cz přes proxy 404 → kanál neprůchozí.
- OECD: policy brief „Strengthening health checks for the prevention and
  management of cardiovascular disease" (série The State of Cardiovascular
  Health in the EU) — oecd.org přes proxy stále **403** (ověřeno 17. 8. na
  publikační stránce full-report) → **WARM carry-over** (kandidát, jakmile
  bude plný text strojově dostupný; navazoval by na
  `clanek-preventivni-prohlidka.html` a `clanek-kardiovaskularni-mortalita.html`).

## Aktualizace existujících dat (vlna)
- Žádná nová vlna zjištěna (Eurostat SILC 2024/2025 zachycena 12.–13. 8.;
  ČSÚ neprůchozí).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 17. 8. 2026)
- VeKLEP (materiály MZ ČR, změna od 10. 8.): jediný záznam = novela
  z. 258/2000 Sb. (očkování u lékařů všech odborností, zubních lékařů a
  farmaceutů, PID ALBSDUUFQ5OR) — 10. 8. nahrána „Verze pro jednání vlády"
  + vypořádání připomínek, poslední úprava 11. 8., datum schůze vlády zatím
  nestanoveno. Zpracováno článkem `clanek-ockovani-v-lekarnach.html`
  (běh 15. 8., stav „verze pro jednání vlády" už zachycen) → žádný nový
  posun fáze. (hlidacstatu.cz dataset veklep, dotaz 17. 8. 2026)
- Registr smluv (kategorie zdrav + social_zdravotni, zveřejněno 16.–17. 8.,
  > 10 mil. Kč): **žádná smlouva** (víkendové okno). (hlidacstatu.cz,
  dotaz 17. 8. 2026)
- ÚOHS: žádné nové zdravotnické rozhodnutí s právní mocí/uveřejněním od
  1. 8. 2026 (hlidacstatu.cz dataset rozhodnuti-uohs, dotaz 17. 8. 2026).

## Ověřovna Barometru — kandidáti
- Žádný nový kvantitativní výrok politika o zdravotnictví nezachycen
  (víkend; MZ bez nových TZ).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný
- HOT (aktuální dění): žádný (víkendové okno, klíčové kanály bez novinek
  nebo neprůchozí)
- WARM: OECD CVD policy brief (čeká na strojovou dostupnost textu)
- COLD: evergreen backlog — položka priority 10 (`kde-tecou-penize-prevence`)
  je **redundantní** (všechny 3 kotvy mají silné publikované články:
  `vydaje-prevence`, `platba-z-kapsy`, `katastroficke-vydaje-zdravi`)
  → označit `done` s poznámkou; položka 11 (`co-rika-jedno-cislo-serie`)
  má 3 ze 4 kotev pokryté a jedinou čerstvou kotvu (lpod_share_critical)
  dnes nelze ověřit (SÚKL 503) → ponechat `ready`, přeskočit;
  → **EVERGREEN-WRITE, priorita 12: `disponibilni-prijem-zdravi`**
  (Eurostat SILC REST API dnes průchozí a strojově ověřitelné)
