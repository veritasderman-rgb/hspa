# Discovery report — 2026-07-14

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Poslední discovery: 2026-07-13 (fallback-audit transplantace). Pozn.: `mzcr.cz` → `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od 07-13)
- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): nejnovější stále „Tuberkulóza v ČR
  v roce 2025" (26. 6.) a NRPATV (15. 6.) — obojí již pokryto. **Žádná nová vlna** od 07-13.
- OECD HAG 2025 + EU Country Health Profile 2025 zapracováno; Eurostat bez nové vlny.

## Nové legislativní normy / sněmovní tisky
- **Legislativní newsletter MZ 07/2026** (mzd.gov.cz, 1. 7.): za červen 2026 vyhlášeny
  4 předpisy MZ ve Sbírce a 4 zdravotnické tisky v PS/Senátu. Obrazový PDF, strojově
  nečitelný; vše spadá do června (rozsah dřívějších běhů). **Žádný nový červencový
  legislativní trigger.**
- `zakonyprolidi.cz/cs/aktualne` — infra 403 (WebFetch), ne obsahová změna.

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- MZ tiskové zprávy (mzd.gov.cz/tiskove-centrum/tiskove-zpravy) — nejnovější stále **9. 7.**
  (půlroční bilance ministra Vojtěcha). **Bez nové TZ od 07-13.** Přehled červencových TZ
  (všechny už dříve vyhodnocené): 9. 7. bilance; 8. 7. pravidla pro AI ve zdravotnictví
  (pokryto `clanek-ai-act-zdravotnictvi-srpen-2026`, revid. 07-09); 3. 7. SYPOVO / vzácná
  onemocnění (pokryto `clanek-vzacna-onemocneni-strategie-2035`, audit 07-10, re-potvrzeno
  07-12); 1. 7. MZ převzalo agendu závislostí a duševního zdraví (governance, bez KPI —
  kandidát budoucí revize, ne dnešní ARTICLE-WRITE).

## Aktualizace existujících dat (vlna)
- Žádná nová vlna.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Stav publikační fronty
- **23 draftů** (published: false), 128 publikovaných (celkem 179 článků). Fronta plná →
  nový článek by odporoval železnému pravidlu „lepší žádná změna než zbytečná".

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` **zelené** (1377 claims, všechny quotes doslovně dohledatelné).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění → nový článek): žádný způsobilý (bilance MZ roundup; AI, vzácná
  onemocnění i governance duševního zdraví bez nového KPI; fronta plná 23 draftů).
- WARM (revize kvůli nové primárně doložené události): žádný nový trigger.
- **COLD → FALLBACK-AUDIT**: nejstarší reviewed publikované články jsou z **2026-05-17**
  (58 dní). Z osmičlenné dávky 05-17 je nejhustší na ověřitelná (EU-legislativní + datová)
  tvrzení a nejvyšší na riziko driftu za 58 dní `clanek-ehds-evropsky-prostor-zdravotni-data.html`
  (nařízení EU 2025/327 s konkrétním harmonogramem 2027/2029/2031/2035, návaznost na
  českou novelu 325/2021 Sb.). Sourozenci z 05-17 buď již čerstvě dotčeni (vzacna-onemocneni
  07-10/07-12), nebo méně číselní. Vybráno pro nejvyšší přínos striktní primárně-zdrojové
  re-verifikace dle železného pravidla.
