# Discovery report — 2026-07-09

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Všechny klíčové odkazy reověřeny HTTP 200. Pozn.: doména `mzcr.cz` přesměrovává na `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od posledního běhu 07-08)
- ÚZIS aktuality: nejnovější stále „Tuberkulóza v ČR v roce 2025" (26. 6.) a rozšíření
  NRPATV (15. 6.) — obojí **není nové**, TBC pokryta `clanek-tuberkuloza-cr-2025.html`.
- OECD Health at a Glance 2025 + EU Country Health Profile 2025 (publ. 12/2025) — již
  zapracováno; Eurostat bez nové vlny. **Není nové.**

## Nové legislativní normy / sněmovní tisky
- Bez nového strojově dohledatelného triggeru. Červencový legislativní newsletter MZ
  (obrázkové PDF) pokrývá červen — už zaznamenáno v discovery 07-06/07-08.
  `zakonyprolidi.cz/rocnik/2026` nadále vrací 403 (konkrétní účinnosti nedohledatelné).

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- **NOVÉ (HOT/WARM): TZ MZ ČR z 8. 7. 2026** — „Ministerstvo zdravotnictví ve spolupráci
  s odbornými institucemi nastavuje pravidla pro bezpečné využívání AI ve zdravotnictví".
  MZ podepsalo **memorandum o spolupráci** s Českou asociací umělé inteligence (CzAIA),
  ČLS JEP a IPVZ. Rámcový dokument (bez čísel, deadlinů, sankcí): dělba rolí — MZ
  koordinace, asociace odborná podpora, odborné společnosti doporučené postupy, IPVZ
  vzdělávání. Oblasti: doporučené postupy, ověřování kvality/bezpečnosti nástrojů,
  podpora pilotů, společné pracovní skupiny, účast v EU4Health. Citace min. Vojtěcha
  a předsedy asociace Misaře ověřeny verbatim. Zdroj (HTTP 200):
  mzd.gov.cz/tiskove-centrum-mz/…nastavuje-pravidla-pro-bezpecne-vyuzivani-ai-ve-zdravotnictvi/
- Ostatní TZ MZ beze změny: nejnovější dále 07-03 (SYPOVO / vzácná onemocnění) a 07-01
  (převzetí agendy závislostí a duševního zdraví) — obě již pokryty.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna (OECD HAG 2025, ČSÚ naděje dožití 2025, Eurostat — vše zapracováno).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` odhalil **3 orphaned claims** (`pracovni-sila--08/09/10`,
  quote-not-found) — fabrikovaná věková čísla (ø 49 sestry / přes 40 % nad 50 let /
  lékaři ø 50,3), která audit 07-08 správně **odstranil z článku** jako nepodložená
  (odporovala ÚZIS 2023), ale záznamy v `data/claims.json` zůstaly osiřelé. Regrese
  z včerejšího běhu (merge #756 na main). → **Odstraněno** (viz routing).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- **WARM (revize existujícího článku kvůli nové primárně doložené události):**
  `clanek-ai-act-zdravotnictvi-srpen-2026.html` — memorandum MZ z 8. 7. 2026 přesně
  vyplňuje mezeru, kterou článek sám pojmenovává (MZ „pouze odborný garant, nikoli
  dohledový orgán"). Článek `topical_until: 2026-08-02` (AI Act účinný za 3,5 týdne)
  → nejvyšší přínos aktuálnosti.
- Housekeeping: cleanup 3 orphaned claims (datová integrita).

Fronta plná (21 draftů) → nový článek by odporoval železnému pravidlu. Memorandum je
rámcové (bez KPI) → nezpůsobilé pro samostatný ARTICLE-WRITE. **ARTICLE-REVISE** je
správná cesta: udrží topical článek aktuální bez zbytečného 22. draftu.
