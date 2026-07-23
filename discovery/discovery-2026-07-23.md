# Discovery report — 2026-07-23

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md). **Důraz běhu: validace a ověření všech zdrojů.**
Klíčovým nálezem dne není nový externí dataset, ale **interní narušení integrity zdrojů** — registr tvrzení (`data/claims.json`) se rozešel s opraveným článkem o kojení a padal validační gate.

## Kontrola validačních gate (nejdřív)
- `npm run validate:all` → **FAIL**: 9/1393 tvrzení neprošlo quote-verifikací, všechna ve článku `kojeni-obrat-porodnice`.
- Příčina: commit `7badb0d` (2026-07-22) opravil článek z **„výlučné kojení"** (WHO exclusive) na **„plné kojení"** (kategorie, kterou ÚZIS/NZIP fakticky měří). Quotes v `claims.json` zůstaly na staré terminologii → drift, tvrzení už nešla dohledat zpět do textu. Viz FÁZE 5 / železné pravidlo: parafráze/nedohledatelný úryvek do registru nepatří.
- **Vyřešeno tento běh** — viz routing (FALLBACK-AUDIT / integrity-fix).

## Nové indikátory / datasety
- [ ] (žádná nová vlna v datovém kontraktu od posledního běhu) — `data/indicators.json` `generated_at: 2026-07-22T08:29:29Z`, 178 indikátorů, nejnovější snapshot `snapshot-2026-07-22.json`. Freshness OK (live_ratio 0,37).

## Nové legislativní normy / sněmovní tisky
- MZ ČR — **Legislativní newsletter červenec 2026** (#ZdravéParagrafy, mzd.gov.cz/legislativni-newsletter-cervenec-2026): za červen 2026 vyšly ve Sbírce 4 předpisy v gesci MZ, 4 zdravotnické tisky v PSP/Senátu, 6 materiálů do vlády (3 v procesu). Dílčí položka: novela **vyhlášky č. 391/2013 Sb.** (posudky zdravotní způsobilosti — ruší povinnost u rekreačního sportu, nově vymezuje „sportovce"). Minor, není silný trigger.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- ÚZIS: **Tuberkulóza v ČR 2025** (publ. 26. 6. 2026) — starší, pravděpodobně již dostupné v předchozích bězích; ne nový trigger.
- Monitoring koupališť KHS (10. 7. 2026) — mimo rámec HSPA korpusu.

## Aktualizace existujících dat (vlna)
- (žádná nová vlna od posledního běhu; ingest cron neprodukoval nový snapshot mezi 07-22 a 07-23)

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- VeKLEP: (v tomto běhu neprocházeno přes MCP — kanál doplňkový; žádný ověřený nález nezařazen)
- Registr smluv: (bez zařazeného nálezu)
- ÚOHS: (bez zařazeného nálezu)

## Stav publikační fronty
- 32 nepublikovaných draftů v `data/articles.json` (fronta saturovaná). Evergreen backlog: 8 položek `status: ready`. Poslední nový článek: `hepatitida-eliminace-2030` (2026-07-22, **včera**).

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): —
- WARM: —
- **COLD / INTEGRITY**: validační gate padal kvůli driftu registru tvrzení vs. opravený článek → **FALLBACK-AUDIT (integrity-fix)**. Nový článek se dnes nepíše (fronta saturovaná 32 drafty, nový článek napsán včera, kadenční pojistka >2 dny nespuštěna, žádný přesvědčivý čerstvý trigger).
