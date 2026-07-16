# Discovery report — 2026-07-16

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Poslední discovery: 2026-07-15 (fallback-audit „Nárok pojištěnce 2"). Pozn.: `mzcr.cz` → `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový indikátorový dataset od 07-15)
- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): nejnovější stále „Tuberkulóza v ČR
  v roce 2025" (26. 6.) a NRPATV (15. 6.) — obojí již pokryto. **Žádná nová vlna** od 07-15.
- OECD HAG 2025 / EU CHP 2025 zapracováno; Eurostat bez nové vlny.

## Nové legislativní normy / sněmovní tisky
- Žádná nová norma ve Sbírce ani nový sněmovní tisk ve zdravotnictví od 07-15.
  Červencový legislativní newsletter MZ pokrývá červen (rozsah dřívějších běhů).

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- **HOT — nová strategie.** MZ ČR, TZ **15. 7. 2026**: „Ministerstvo zdravotnictví
  představilo **první Národní strategii pro klinická hodnocení** a připravovaný informační
  portál." → **Národní strategie klinických hodnocení humánních léčivých přípravků v ČR
  2035**. Ověřeno proti dvěma primárním TZ MZ:
  - TZ 15. 7. 2026 (announcement): 5 cílů (urychlit start hodnocení, akademický výzkum,
    kapacita časných fází, dostupnost inovativní léčby, konkurenceschopnost). Implementace
    přes akční plány na 2–3 roky, **první do 6 měsíců**. Portál v létě 2026. Spolupráce
    MZ + SÚKL + CZECRIN + AZV + AIFP + ACRO-CZ. Motivace: **jen 64 akademických z 932
    registrovaných studií; 4 620 nových účastníků 2023 (−15 % vs 2022, −32 % vs 2015)**.
  - TZ 29. 5. 2025 (context): >480 komerčních studií, >16 000 pacientů/rok, 70 % komerční.
  → Strategie **NEBYLA** v `data/strategies.json` (36 → 37). Doložitelnost vysoká (dvě
    primární TZ MZ). **Vybráno k zápisu** (STRATEGY-ADD), viz routing.
- MZ TZ 14. 7.: „SÚKL spouští Inovační kancelář pro zdravotnické prostředky" a
  „Tamoxifen je již vyroben" (řešení výpadku) — úzké eventy bez KPI, bez triggeru pro článek.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna primárních dat.

## Datová integrita korpusu (kontrola při validaci) — NÁLEZ + OPRAVA
- **`npm test` 819/820 (1 fail!)** proti 820/820 dne 07-15. Rozbité:
  `diagnoza-index.json je v syncu se zdroji`. Příčina: do korpusu přibyl článek
  `clanek-konopi-adolescenti.html` + indikátor `konopi_adolescenti`, ale
  `data/diagnoza-index.json` (křížové vazby) **nebyl přegenerován** při datovém refreshi
  07-15. **Opraveno**: `npm run build:diagnoza` (deterministický regen; +1 indikátorový
  spis „konopi_adolescenti", +32 řádků vazeb). Po opravě **820/820**.
- `npm run validate:all` **zelené** (1377 claims verbatim, 37 strategií po zápisu).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Stav publikační fronty
- **51 draftů** (published: false). Fronta plná → nový článek by odporoval železnému
  pravidlu. Nová strategie jde do `strategies.json` (samostatný dataset), nezvyšuje
  frontu článků.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění → nový článek): žádný způsobilý (fronta plná; SÚKL/tamoxifen bez KPI).
- **STRATEGY-ADD**: Národní strategie klinických hodnocení 2035 (dvě primární TZ MZ) →
  zápis do `data/strategies.json`.
- **INTEGRITY-FIX**: `diagnoza-index.json` regen (rozbitý test → zelený).
