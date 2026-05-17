# Discovery report — 2026-05-17

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-17 (sobota), prozkoumáno 7 primárních zdrojů (ÚZIS aktuality, MZ ČR tiskové zprávy, PSP ČR, zakonyprolidi, VZP dokumenty, NZIP, OECD via výsledky vyhledávání).

## Nové legislativní normy / sněmovní tisky / mezinárodní smlouvy

- **Mezinárodní smlouva ČR–SR o přeshraniční spolupráci zdravotnických záchranných služeb** —
  - **23. 4. 2026 (čtvrtek):** Poslanecká sněmovna schválila ratifikační usnesení.
  - Senát schválil v prosinci 2025; zbývá podpis prezidenta a vyhlášení ve Sbírce mezinárodních smluv.
  - Rámcová smlouva podepsána **4. července 2025 v Praze** ministry zdravotnictví Vlastimilem Válkem (CZ) a Kamilem Šaškem (SK).
  - **Územní záběr:** CZ — Jihomoravský, Zlínský, Moravskoslezský kraj. SK — Bratislavský, Trnavský, Trenčínský, Žilinský samosprávný kraj.
  - **Obsah:** Záchranky obou zemí mohou zasahovat za hranicemi, používat výstražná světla a zvuk; pacient transportován do nejbližšího vhodného zařízení bez ohledu na hranici. Pozemní i letecká ZZS. Koordinace přes dispečinky obou zemí v reálném čase.
  - **Primární zdroje (potvrzeno):** Tisková zpráva MZ ČR z července 2025 (podpis) + dubna 2026 (schválení PSP); Senát PČR (prosinec 2025 ratifikace); zdravotnickydenik.cz (jako sekundární kontext).

## Nová tisková zpráva MZ ČR — reforma screeningu (souvisí s existujícími články, kandidát na REVISE)

- **7. 5. 2026:** "Přesnější screening, lepší výsledky" — MZ ČR oznamuje cílené úpravy 3 onkologických screeningů:
  - **Cervix:** přechod na HPV testování jednou za 5 let u žen 25–65 let, s vloženou cytologií mezi HPV testy.
  - **Plíce:** rozšíření odesílatelů, snadnější přístup pro kuřáky.
  - **Kolorektum:** posílení účasti.
  - Korpus už pokrývá: `clanek-cervix-hpv.html`, `clanek-screening-rakoviny-plic.html`, `clanek-rakovina-tlusteho-streva.html` → kandidát na REVISE.

## Další tiskové zprávy MZ ČR (květen 2026, méně významné)

- 15. 5. 2026 — "Dobrovolníci pomáhají pacientům po CMP" — pilot, souvisí s `clanek-cmp-iktova-centra.html` (kontext)
- 13. 5. 2026 — hantavirus Andes monitoring (riziko pro ČR aktuálně nízké)
- 12. 5. 2026 — "Zdravotnictví 4.0 Challenge" — partnerství studenti+nemocnice (Ostrava)
- 11. 5. 2026 — "Den otevřených dveří MZ"
- 6. 5. 2026 — "První kapka" — kampaň darování krve
- 4. 5. 2026 — "Posílení prevence ve firemních benefitech" — dohoda MZ + MF (kandidát na článek, ale chybí konkrétní legislativní text)
- 4. 5. 2026 — "Telemedicínský screening kožních nádorů" — pilotní projekt
- 29. 4. 2026 — "Certifikace CZERT EMT 1 WHO" — humanitární pomoc

## ÚZIS aktuality (od dubna 2026)

- 5. 5. 2026 — prodloužení sběru výkazů za 2025 do 20. 5. 2026 (provozní info, ne článek)
- 28. 4. 2026 — rozšíření číselníku zdravotnických oborů (metodické)
- 22. 4. 2026 — nábor data/BI specialisty (HR)
- 14. 4. 2026 — odborné setkání v Senátu k HPV strategii (souvisí s `clanek-cervix-hpv.html`)

## Aktualizace existujících dat (vlna)

- Žádná nová vlna OECD HAG (nejnovější je HAG 2025 z 11/2025, již použita).
- Eurostat hlth_cd_asdr2 — žádná nová vlna oproti květnové refresh kaskádě.
- ÚZIS NRH 2024 — žádná nová verze.

## Aktuální dění / kauzy s implikací

- ČR–SK přeshraniční ZZS smlouva = **jednoznačně HOT** (nová mezinárodní smlouva, nový institucionální rámec, nedotčené téma v korpusu).
- "Přesnější screening" = WARM (revize 3 existujících článků, čeká na vydání věstníku či vyhlášky pro plnou doložitelnost).

## Doporučení pro routing fáze

- **HOT (nový článek):** `prihranicni-zachranka-cr-sk-2026` — mezinárodní smlouva o přeshraniční spolupráci ZZS. Schválení PSP 23. 4. 2026, nový institucionální rámec, žádný existující článek se tématu nedotýká. Vícero primárních zdrojů (MZ ČR TZ x2, PSP usnesení, Senát ratifikace, zákon č. 374/2011 Sb. jako právní pozadí).
- **WARM (revize):** `clanek-cervix-hpv.html` po vydání věstníku k cervix screeningu (zatím jen ohlášení, čekat).
- **COLD:** Pokud HOT padne, audit nejstaršího článku (`audit.last_reviewed > 30 dnů`).

## Zdroje, kde se nic relevantního nezměnilo (pro úplnost)

- NÚKIB — fetch nedostupný (301 redirect — nezkoumáno hlouběji v této iteraci)
- SÚKL výpadky léčiv — 403 v této iteraci (nedohledáno)
- VZP dokumenty — žádný nový dokument publikovaný od posledního auditu

---

**Routing rozhodnutí:** ARTICLE-WRITE → `clanek-prihranicni-zachranka-cr-sk-2026.html` (viz routing-2026-05-17.md).
