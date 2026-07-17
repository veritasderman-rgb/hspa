# Discovery report — 2026-07-17

Rešerše primárních zdrojů (živé WebSearch/WebFetch, PubMed MCP) k datu 2026-07-17.
Poslední běh: 2026-07-16 (STRATEGY-ADD + integrity-fix). Fronta draftů: 23.

## Nové indikátory / datasety
- [ ] Žádná nová vlna ÚZIS/OECD/Eurostat od 07-16. ÚZIS aktuality: poslední větší
  položky = základní přehled epidemiologické situace TBC v ČR (publ. 26. 6. 2026),
  publikace datové sady NRPZS, aktualizace toxikologického slovníku (15. 6.). Nic
  nového od posledního běhu. (uzis.cz/index.php?pg=aktuality)
- OECD Health at a Glance 2025 (publ. 11/2025) — již zpracováno; ČR data konzistentní
  (naděje dožití 79,9; 4,2 lékaře/1000; 9,0 sester/1000; výdaje 8,5 % HDP).

## Nové legislativní normy / sněmovní tisky
- MZ ČR — Legislativní newsletter červenec 2026: za červen 2026 vyhlášeny 4 předpisy
  MZ, ve sněmovně/senátu 4 zdravotnické tisky, vládě předáno 6 materiálů. Konkrétně
  drobnější: novela vyhl. 391/2013 Sb. (zdrav. způsobilost ke sportu), NV rozšiřující
  seznam kontrolovaných látek (methiodon aj.), vyhl. 118/2026 Sb. (přírodní léčivé
  zdroje). **Žádná systémová reforma s KPI implikací.**
  (mzd.gov.cz/wp-content/uploads/2026/07/Legislativni-newsletter-07-2026.pdf)
- PSP ČR — bez nového zdravotnického tisku s dopadem; tisk 70 (Vojtěch, 12. 2025) měl
  3. čtení 25. 3. 2026 (staré). Úhradová vyhláška 2027 = dohodovací řízení běží.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- SÚKL registr výpadků — žádný nový kriticky-nedostatkový lék s KPI charakterem
  reportován (dostupnost je „živá" agenda bez stabilního seznamu). (sukl.gov.cz)
- Bez nové mediální kauzy s primárně doložitelnými fakty.

## Aktualizace existujících dat (vlna)
- Bez nové vlny od 07-16.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- VeKLEP: bez nového zdravotnického návrhu s posunem fáze (kryto MZ newsletterem výše).
- Registr smluv: žádná mimořádná zdravotnická smlouva v tomto běhu.
- ÚOHS: žádné nové rozhodnutí s KPI dopadem.

## PubMed (recenzovaná literatura, ČR / relevantní k dashboardu)
- **KLÍČOVÝ NÁLEZ (verifikační, ne nové téma):** Bonanno EG, …, Midão L, Costa E.
  *Polypharmacy Prevalence Among Older Adults Based on SHARE: An Update.* J Clin Med
  2025;14(4):1330. PMID 40004860, DOI 10.3390/jcm14041330. SHARE Wave 9 (2021–22):
  **ČR 46,6 %** seniorů 65+ s polypragmazií (5+ léků); 28-zemní průměr 36,2 %
  (rozpětí 25,0–51,8 %). Nejvyšší Polsko 51,8 / Izrael 51,5 / Portugalsko 51,3.
  → **Přímo vyvrací** hodnotu 51 % a mezinárodní žebříček (Estonsko/Itálie/Maďarsko)
  publikované v `clanek-polypragmazie-senioru.html` a v seed indikátoru
  `polypragmazie_65plus` (51,2 %). Viz routing → FALLBACK-AUDIT (audit-fix).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný
- HOT (aktuální dění → nový článek): žádný s primárně-zdrojovou doložitelností
- WARM (revize kvůli nové vlně): žádný nový trigger
- **COLD → FALLBACK-AUDIT**: fronta plná (23 draftů), žádné nové dění → audit.
  Discovery přinesl **konkrétní primárně-zdrojový důkaz o chybné páteřní hodnotě**
  v publikovaném „verified" článku `clanek-polypragmazie-senioru` → audit-fix
  s nejvyšší prioritou (železné pravidlo: neověřená čísla na portálu nezůstávají).
