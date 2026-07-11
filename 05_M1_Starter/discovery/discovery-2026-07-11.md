# Discovery report — 2026-07-11

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Poslední discovery: 2026-07-09 (07-10 bez běhu). Pozn.: `mzcr.cz` přesměrovává na `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od 07-09)
- ÚZIS aktuality: nejnovější stále „Tuberkulóza v ČR v roce 2025" (26. 6.) a NRPATV
  (15. 6.) — obojí již pokryto / **není nové**. Žádná nová vlna od 07-09.
- OECD HAG 2025 + EU Country Health Profile 2025 zapracováno; Eurostat bez nové vlny.

## Nové legislativní normy / sněmovní tisky
- Bez nového strojově dohledatelného triggeru. `zakonyprolidi.cz/cs/aktualne` opět 403
  (WebFetch), PSP historie.sqw 503 (dočasný výpadek) — obojí infra, ne obsahová změna.
- Legislativní newsletter MZ červenec 2026 (last update 1. 7.) pokrývá červen — už
  zaznamenáno v discovery 07-06/07-08.

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- **TZ MZ 9. 7. 2026** — „Ministr Vojtěch bilancuje první půlrok". **Roundup, ne nový
  indikátor.** Souhrn dříve oznámených opatření: 22 ze 119 programových cílů
  dokončeno/rozpracováno, 1 200+ léků nově u praktika (od 1. 7.), 15 nových center
  duševního zdraví (207 mil. Kč), ~8 mld. Kč přerozděleno mezi pojišťovnami, 24 mld. Kč
  z vyšší platby státu 2027–2028. Všechna čísla jsou kompilací dříve avizovaných měření
  — žádné nové tvrdé KPI, žádný samostatný ARTICLE-WRITE trigger. (Řada figur už je
  v korpusu / draftech: centra duš. zdraví, přerozdělení pojišťoven, 1 200 léků.)
- TZ MZ 10. 7. 2026 — „Kvalita vody ke koupání". Mimo záběr HSPA korpusu.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna (OECD HAG 2025, ČSÚ, Eurostat — vše zapracováno).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Stav publikační fronty
- **23 draftů** (published: false). Fronta plná → nový článek by odporoval železnému
  pravidlu „lepší žádná změna než zbytečná". (Bilance MZ navíc bez KPI → nezpůsobilá
  pro ARTICLE-WRITE.)

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` **zelené** na čistém stromu (1377 claims, všechny quotes
  doslovně dohledatelné). Bez orphaned claims, bez publikační hygieny fail.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění → nový článek): žádný způsobilý (bilance MZ je roundup bez KPI).
- WARM (revize kvůli nové primárně doložené události): žádný nový trigger od 07-09
  (AI Act článek už aktualizován 07-09 memorandem MZ).
- **COLD → FALLBACK-AUDIT**: nejstarší reviewed publikované články jsou z 2026-05-16
  (>30 dnů). Kandidát s nejvyšší hodnotou source-verifikace (železné pravidlo):
  `clanek-kyberneticka-bezpecnost-zdravotnictvi-2026.html` — ~40 externích zdrojů,
  legislativa-těžký (zákon 264/2025 Sb., vyhlášky 408/409/410/334, NÚKIB, EUR-Lex,
  ENISA), reálné poslední content-review z 05-16 (06-10 byla jen metadata-sync).
