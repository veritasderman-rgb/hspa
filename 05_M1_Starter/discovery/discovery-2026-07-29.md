# Discovery report — 2026-07-29

Běh se řídí explicitním mandátem session: **„Naprosto zásadní je validace a ověření
všech zdrojů."** Discovery proto slouží hlavně k rozhodnutí, zda existuje HOT
spouštěč silnější než ověřovací práce; není-li, běh jde na FALLBACK-AUDIT.

## Nové indikátory / datasety
- [ ] (žádný nový dataset ÚZIS/NZIP se strojově dohledatelnou HSPA metrikou od 07-28)

## Aktualizace existujících dat (vlna) — relevantní k auditovanému článku
- **ECDC — HIV/AIDS Surveillance in Europe 2025 (data za rok 2024)** publikováno
  **27. 11. 2025** (ecdc.europa.eu). EU/EEA míra **5,3 / 100 000** (2024), 24 164
  diagnóz, −14,5 % vs. 2015 (6,2). → **WARM/reinforcing** pro auditovaný článek:
  hodnota benchmarku 5,3 se **nezměnila** (2023 i 2024 = 5,3), jen novější edice
  reportu potvrzuje stabilitu. Do článku doplněna aktualizační věta + zdroj.

## Nové legislativní normy / sněmovní tisky
- Nic nového s HSPA implikací od posledního běhu (07-28). Novela zák. o ochraně
  veřejného zdraví (pitná voda, 13. 7. 2026) je úzce technická — bez článkové hodnoty.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- Bez nového HOT triggeru s primárně-zdrojovou KPI doložitelností.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS
- MCP `hlidac_statu` není v tomto běhu k dispozici (nezaregistrován) → kanál přeskočen.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný
- HOT (aktuální dění): žádný
- WARM: ECDC 2025 (2024 data) — benchmark HIV potvrzen, netřeba nový článek, jen
  drobná aktualizace citace v auditovaném článku
- COLD → **FALLBACK-AUDIT**: nejstarší publikovaný `review-pending` článek, který
  nikdy neprošel nezávislým fact-auditem = `clanek-hiv-nove-diagnozy.html`
  (last_reviewed 2026-06-01, datově hustá epidemiologie s mezinárodně ověřitelnými
  tvrzeními — ideální cíl pro mandát validace zdrojů).
