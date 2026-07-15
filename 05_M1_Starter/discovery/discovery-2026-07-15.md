# Discovery report — 2026-07-15

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Poslední discovery: 2026-07-14 (fallback-audit EHDS). Pozn.: `mzcr.cz` → `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od 07-14)
- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): nejnovější stále „Tuberkulóza v ČR
  v roce 2025" (26. 6.) a NRPATV (15. 6.) — obojí již pokryto. **Žádná nová vlna** od 07-14.
- OECD HAG 2025 + EU Country Health Profile 2025 zapracováno; Eurostat bez nové vlny
  (potvrzeno WebSearch — poslední dostupné HAG 2025 / CHP 2025).

## Nové legislativní normy / sněmovní tisky
- **Legislativní newsletter MZ 07/2026** (mzd.gov.cz/legislativni-newsletter-cervenec-2026,
  691 kB PDF): pokrývá **červen** 2026 — 4 předpisy MZ ve Sbírce + 4 zdravotnické tisky
  (PS/Senát: novela 95/2004 Sb. o způsobilosti zdrav. profesí; novela zákona o reklamě +
  zdravotnických prostředcích). Vše spadá do června (rozsah dřívějších běhů). **Žádný nový
  červencový legislativní trigger.**
- `zakonyprolidi.cz/cs/aktualne` — infra 403 (WebFetch/curl), ne obsahová změna.
- PSP historie — bez nového července ve zdravotnictví (potvrzeno WebSearch).

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- MZ tiskové zprávy (mzd.gov.cz/tiskove-centrum/tiskove-zpravy) — nejnovější **14. 7.**:
  „MZ a SÚKL: Tamoxifen je již vyroben, dodávky do lékáren budou v nejbližších dnech
  obnoveny" (řešení výpadku hormonální léčby karcinomu prsu). **Úzký single-drug SÚKL
  event, bez KPI** → kandidát budoucí revize (dostupnost léčiv), ne dnešní ARTICLE-WRITE
  při plné frontě.
- „Česko otevírá výsledky léčby cévních mozkových příhod" (portál PUK KZP) — ověřeno:
  **TZ z 13. 2. 2026**, ne nová (mediální re-publikace). Bez triggeru.
- Governance duševního zdraví / závislosti (agenda z ÚV na MZ, 1. 7.) — bez KPI, dřívější
  běh.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Stav publikační fronty
- **51 draftů** (published: false), 129 publikovaných (celkem 180 článků). Fronta plná →
  nový článek by odporoval železnému pravidlu „lepší žádná změna než zbytečná".

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` **zelené** (1377 claims, všechny quotes doslovně dohledatelné).
- `npm test` **820/820**, 0 failures.
- `npm run scan:nightly`: 129 článků, flagy auto-fix 0 / review 94 / low 8. Dvě
  `indicator-drift` (ehealth_adoption, sestry_per_1000) prověřeny → **falešně pozitivní**
  (indikátor odkazován jako signál/kvalitativně, bez citace konkrétní kolidující hodnoty).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění → nový článek): žádný způsobilý (tamoxifen = úzký SÚKL event bez KPI;
  stroke TZ stará; fronta plná 51 draftů).
- WARM (revize kvůli nové primárně doložené události): žádný nový trigger.
- **COLD → FALLBACK-AUDIT**: nejstarší reviewed (kanonický klíč `last_reviewed:`)
  publikované články jsou z **2026-05-17** (59 dní). Vybráno
  `clanek-narok-pojistence-2-demograficky-tlak.html`: nejvyšší hustota externě
  ověřitelných čísel (ČSÚ projekce 65+/75+/85+, OECD HAG 4,2 lékaře/1000, OOP 14,6 %),
  nese `indicator-drift` flag k prošetření a je nosným dílem série „Nárok pojištěnce".
</content>
