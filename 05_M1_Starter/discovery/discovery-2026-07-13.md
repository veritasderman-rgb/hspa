# Discovery report — 2026-07-13

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Poslední discovery: 2026-07-12 (fallback-audit onkologický koordinátor). Pozn.: `mzcr.cz` → `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od 07-12)
- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): nejnovější stále „Tuberkulóza v ČR
  v roce 2025" (26. 6.) a NRPATV (15. 6.) — obojí již pokryto. **Žádná nová vlna** od 07-12.
- OECD HAG 2025 + EU Country Health Profile 2025 zapracováno; Eurostat bez nové vlny.

## Nové legislativní normy / sněmovní tisky
- **Legislativní newsletter MZ 07/2026** (mzd.gov.cz, 1. 7.): za červen 2026 vyhlášeny
  4 předpisy MZ ve Sbírce a 4 zdravotnické tisky v PS/Senátu. Konkrétní čísla jen v PDF
  (Legislativni-newsletter-07-2026.pdf) — obrazový PDF, strojově nečitelný; všechny
  spadají do června (v rozsahu předchozích discovery běhů). **Žádný nový červencový
  legislativní trigger.**
- `zakonyprolidi.cz/cs/aktualne` — infra 403 (WebFetch), ne obsahová změna.

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- MZ tiskové zprávy (mzd.gov.cz/tiskove-centrum/tiskove-zpravy) — nejnovější stále **9. 7.**
  (půlroční bilance ministra Vojtěcha, vyhodnoceno 07-11 jako roundup). Bez nové TZ od 07-12.
- Přehled červencových TZ (všechny už dříve vyhodnocené): 9. 7. bilance MZ; 8. 7. pravidla
  pro bezpečné využívání AI ve zdravotnictví (spadá do `clanek-ai-act-zdravotnictvi-srpen-2026`,
  revidováno 07-09); 3. 7. SYPOVO / vzácná onemocnění (pokryto, potvrzeno 07-12); **1. 7.
  MZ převzalo agendu politiky závislostí a duševního zdraví z Úřadu vlády** — institucionální
  změna (governance), bez nového kvantitativního KPI; není same-day reaktivní trigger
  (12 dní stará) → vedeno jako kandidát pro budoucí governance/duševní-zdraví revizi, ne
  dnešní ARTICLE-WRITE.
- mzd.gov.cz/vsechny-novinky — nejnovější 10. 7. „Kvalita vody ke koupání" (mimo HSPA scope).

## Aktualizace existujících dat (vlna)
- Žádná nová vlna.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Stav publikační fronty
- **23 draftů** (published: false), 127 publikovaných (celkem 178 článků). Fronta plná →
  nový článek by odporoval železnému pravidlu „lepší žádná změna než zbytečná".

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` **zelené** (1377 claims, všechny quotes doslovně dohledatelné).
- `npm test` — **820/820 pass** (po `npm install`; v sandboxu chyběl dev-dep `csv-parse`,
  doinstalováno — 10 fetcher testů poté zelené; jde o environmentální, ne obsahový problém).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění → nový článek): žádný způsobilý (bilance MZ roundup; AI, vzácná
  onemocnění i governance duševního zdraví bez nového KPI; fronta plná 23 draftů).
- WARM (revize kvůli nové primárně doložené události): žádný nový trigger.
- **COLD → FALLBACK-AUDIT**: nejstarší reviewed publikované články jsou z **2026-05-17**
  (>30 dní). Nejhustší na ověřitelná tvrzení (číselné + legislativní + institucionální) je
  `clanek-transplantace-darcovstvi-organu.html` (KST data s roční aktualizací — nejvyšší
  riziko driftu; `vzacna-onemocneni` re-potvrzeno 07-12). Vybráno pro nejvyšší přínos
  striktní primárně-zdrojové re-verifikace dle železného pravidla.
