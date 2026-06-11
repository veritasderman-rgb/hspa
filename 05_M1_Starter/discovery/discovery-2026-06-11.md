# Discovery report — 2026-06-11

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch / PubMed MCP).
Železné pravidlo: co není ověřené z primárního zdroje, nezůstává. Uživatel pro
tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a ověření všech
zdrojů!!!!"** Předchozí běh byl 2026-06-10 (středa) → ARTICLE-REVISE
(`clanek-centra-dusevniho-zdravi`, doplnění ověřené vrstvy konce 2025).
11. 6. 2026 je **čtvrtek**.

## Procházené primární zdroje (stav fetch k 11. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny: poslední položka stále 5. 5. 2026 (prodloužení sběru výkazů do 20. 5.). **Nová datová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 2 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **2 NOVÉ TZ z 10. 6. 2026** — (a) „MoodPass otevírá cestu k plně digitalizovanému systému včasného záchytu duševních obtíží žen po porodu"; (b) „Ministerstvo pokračuje v naplňování změn v odměňování nelékařských zdravotnických pracovníků". Předchozí: 9. 6. CDZ (revize 10. 6.), 4. 6. NCEZ, 3. 6. radioterapie, 2. 6. sepse — vše v korpusu. |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 10. 6. klíšťata ve městech (ČT24, sekundární); 9. 6. Den zdraví na Karláku (akce); 8. 6. nikotin u mladých (Novinky, sekundární — `koureni-adolescenti` ve frontě, flagged); 8. 6. mléko do škol (sekundární — `obezita-jidelny-reforma` ve frontě); 3. 6. žloutenka 6 úmrtí (Zdravotnický deník, sekundární). **Nová surveillance vlna s ČR-implikací: žádná.** |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | 10. 6. CPI 05/2026 + ceny vývozu/dovozu 04/2026; 8. 6. zahraniční obchod/průmysl/stavebnictví 04/2026; 4. 6. mzdy Q1 + CPI; 3. 6. neschopenky stabilní. **Nová demografická/mortalitní/EHIS vlna: žádná.** |
| 5 | SÚKL — registr výpadků | sukl.gov.cz/farmaceuticky-trh/registr-vypadku-leciv | ⚠️ 301→404 | Permalink se přesměroval (sukl.cz → sukl.gov.cz) a vrátil 404; registr nedohledán strojově. Per železné pravidlo netvrdím žádný nový výpadek. |
| 6 | PSP ČR — sněmovní tisky | psp.cz/sqw/historie.sqw | ✅ 200 | Strojově vrácen jen rozcestník („Sněmovní tisk nebyl nalezen"); konkrétní nový zdravotnický tisk po 4. 6. nedohledán. Netvrdím, že něco vyšlo. |
| 7 | Sbírka zákonů | zakonyprolidi.cz/cs/aktualne | ⛔ 403 | Zdroj vrátil HTTP 403 Forbidden; strojově neprůchozí. Netvrdím žádnou novou normu. |
| 8 | OECD / Eurostat / WHO / NÚKIB | — | — | Beze změny — HAG 2025 (11/2025) a Country Health Profile Czechia 2025 (12/2025) nejnovější vlny, již v korpusu; žádná nová vlna hlth_* / WHO guideline s ČR-implikací k 11. 6. |

## Nové indikátory / datasety

- (žádný zcela nový strukturovaný indikátor v `data/indicators.json`) — ale **nový
  tematický celek bez pokrytí v korpusu**: perinatální / poporodní duševní zdraví
  matek a jeho **systémový záchyt** (screening). Trigger: spuštění aplikace
  **MoodPass** (Národní screeningové centrum ÚZIS + NÚDZ).

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR strojově ověřena po 4. 6. 2026 (PSP / Sbírka
  zákonů strojově neprůchozí — viz tabulka, řádky 6–7). Per železné pravidlo
  netvrdím, že něco vyšlo.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **HOT — 10. 6. 2026, MZ ČR (primární):** „MoodPass otevírá cestu k plně
  digitalizovanému systému včasného záchytu duševních obtíží žen po porodu."
  Ověřeno přímo z TZ na mzd.gov.cz:
  - **MoodPass** = telemedicínská aplikace; vyvinulo ji **Národní screeningové
    centrum ÚZIS ČR** ve spolupráci s **Národním ústavem duševního zdraví (NÚDZ)**.
  - **Až 75 % žen** s duševními obtížemi po porodu nevyhledá odbornou pomoc
    (odhad uvedený v TZ). → Toto číslo má **primární recenzovaný zdroj**:
    *Midwifery* 2024 (DOI 10.1016/j.midw.2024.104198): „Up to 75 % of at-risk
    perinatal women do not receive treatment in Czechia."
  - **Perinatální program NÚDZ**: zapojilo se přes **45 porodnic** v ČR.
  - **Rollout MoodPass**: aktuálně **3 porodnice** aplikaci používají → první
    fáze **12 porodnic** z různých krajů; postupné rozšiřování.
  - Citace ministra Adama Vojtěcha (péče o duševní zdraví žen v těhotenství a po
    porodu je důležitou součástí moderního zdravotnictví); Antonín Šebela (NÚDZ):
    „více než sedm let se věnujeme rozvoji péče o duševní zdraví žen…".
- **WARM — 10. 6. 2026, MZ ČR (primární):** odměňování nelékařských
  zdravotnických pracovníků — pokračování implementace. Téma labor/financování;
  jako samostatný HSPA článek s jediným centrálním KPI hůře ukotvitelné, slabší
  novost (běžící sága). Nevybráno.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna ÚZIS/ČSÚ/Eurostat/OECD k 11. 6. 2026.

## Primárně-zdrojová evidenční báze k HOT tématu (ověřeno PubMed MCP, live)

| # | Zdroj | DOI / PMID | Ověřené tvrzení |
|---|---|---|---|
| 1 | MZ ČR TZ, 10. 6. 2026 | mzd.gov.cz (permalink) | MoodPass; 75 % nevyhledá pomoc; 45 porodnic v perinat. programu; 3→12 porodnic |
| 2 | *Midwifery* 2024 | 10.1016/j.midw.2024.104198 | „Up to 75 % of at-risk perinatal women do not receive treatment in Czechia"; RCT MSM N=167 |
| 3 | *Česká gynekologie* 2022 | 10.48095/cccg202219 (PMID 35240832) | Český EPDS, N=243 konec šestinedělí: těžká deprese **2,5 %** (95% CI 1,1–5,3); jakákoli sledovaná duševní porucha **13,6 %** (95% CI 9,8–18,5); EPDS práh 11 |
| 4 | *BMC Psychology* 2024 | 10.1186/s40359-024-02308-1 | N=2 233 těhotných ČR (EPDS/PASS); antenatální deprese ↔ horší vazba matka–plod |
| 5 | *Psychosocial Intervention* 2025 (Mom Supports Mom RCT) | 10.5093/pi2025a12 | N=315 kontrola + 173 intervence; peer-support ↓ deprese (d=0,30) i úzkost (d=0,29) v 6. týdnu po porodu |
| 6 | *Česká gynekologie* 2018 (review) | PMID 30848154 | Aktivní screening + spolupráce gyn-porodnictví/psychiatrie = hlavní metoda prevence; „moderní technologie… časově nenáročná metoda aktivního screeningu" |
| 7 | WHO — Perinatal mental health | who.int (primární stránka) | Globálně ~**10 %** těhotných a ~**13 %** žen po porodu prožije duševní poruchu, převážně depresi (methodology caveat: jiná metodika než český EPDS) |

## Doporučení pro routing fáze

- **HOT (nový článek): ANO** — perinatální / poporodní duševní zdraví matek a
  jeho systémový záchyt (MoodPass). Genuinní mezera v korpusu (grep: žádný článek
  o poporodní depresi / screeningu matek; existující duševní-zdraví články pokrývají
  CDZ, reformu psychiatrie, sebevraždy, dětskou psychiatrii, předávkování — ne
  mateřskou perinatální oblast). Hluboká primární doložitelnost: 1 primární TZ +
  6 recenzovaných/agentúrních zdrojů (5 z nich přímo český NÚDZ korpus).
  **→ ARTICLE-WRITE.** Detail viz `routing-2026-06-11.md`.
- **WARM:** odměňování nelékařů (10. 6.) — odloženo, slabší novost/ukotvitelnost.
- **COLD:** —
