# Discovery report — 2026-06-06

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů.“** Předchozí běh
2026-06-05 → ARTICLE-WRITE (`clanek-ncez-financovani-2027`, MZ ČR TZ 4. 6.),
ve frontě `scheduled_for: 2026-06-06`, `published:false`, `verified`.

## Procházené primární zdroje (stav fetch k 6. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny: poslední položka 5. 5. 2026 (administrativní — prodloužení sběru výkazů do 20. 5.); 28. 4. rozšíření číselníku odborností; 14. 4. HPV strategie. **Nová datová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 2 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější TZ stále **4. 6. (NCEZ → odbor MZ + Ostrava)** — již zpracováno (dnešní slot fronty). Po 4. 6. žádná nová TZ. Předchozí: 3. 6. radioterapie (zpracováno), 2. 6. pooperační sepse (zpracováno), 28. 5. centralizace HPB/jícnové chirurgie + Centra duševního zdraví IV (WARM, pokryto). |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 5. 6. B. Kotlík na ČT24 — znečištění ovzduší / předčasná úmrtí (**sekundární**, ČT24); 5. 6. EU/EEA Respiratory Viruses Network meeting (institucionální, bez datové vlny ČR); 4. 6. klíšťata (Právo, sekundární); 3. 6. žloutenka (ZD, sekundární); 29. 5. NAUTA nikotin u mladých (již posouzeno 5. 6. — bez nové datové vlny do HSPA). |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | Bez HSPA implikace: 28. 5. statistika jmen novorozenců; začátek 6/2026 trh práce a mzdy Q1; těžba dřeva; cestovní ruch. **Nová demografická/mortalitní/EHIS vlna: žádná.** |
| 5 | PSP ČR — sněmovní tisky | psp.cz/sqw/historie.sqw | ⚠️ nedohledáno | Stránka vrátila navigační skeleton / „Sněmovní tisk nebyl nalezen“ — seznam tisků dnes strojově nedohledán. **Žádný nový zdravotnický tisk neověřen → netvrdím nic.** |
| 6 | Sbírka zákonů | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | Anti-bot ochrana (NE 404). Seznam nových norem dnes nedohledán strojově. **Žádnou novou normu netvrdím.** Permalinky konkrétních zákonů ověřitelné přes WebSearch (viz audit níže). |
| 7 | SÚKL — výpadky léčiv | sukl.cz/farmaceuticky-trh/registr-vypadku-leciv | ⚠️ 403 | Anti-bot ochrana. Registr výpadků dnes nedohledán. **Žádný nový výpadek netvrdím.** |

**OECD / Eurostat / WHO / NÚKIB:** beze změny oproti běhu 5. 6. — žádná nová vlna
HAG, Country Health Profile, hlth_* datasetu ani WHO guidelines s ČR-implikací
ověřena k 6. 6. (delta proti včerejšku nepravděpodobná, daily kadence).

## Nové indikátory / datasety

- (žádné nové) — ÚZIS bez nové vlny, ČSÚ bez demografické/EHIS vlny, OECD/Eurostat beze změny.

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR datovaná po 30. 5. 2026 strojově neověřena.
  (Sbírka zákonů a PSP dnes strojově nedohledány — per železné pravidlo NETVRDÍM,
  že něco nového vyšlo, ani že nevyšlo; jen že to dnes nelze primárně doložit.)

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **5. 6. — znečištění ovzduší / předčasná úmrtí** (B. Kotlík, ČT24) — **sekundární**
  mediální výstup experta SZÚ, bez nové primární datové vlny. Téma již pokryto
  publikovaným `clanek-pm25-spinavy-vzduch`. Historický primární odhad SZÚ
  (~700 předčasných úmrtí/rok jen Praha) existuje, ale **není nový** → netvoří
  HOT trigger. Nový zpřísnější imisní limit EU (PM2.5 roční průměr 20 → 10 µg/m³,
  závazný od 2030) je rámcový kontext, ne dnešní událost.
- **4. 6. NCEZ** — již zpracováno (dnešní slot fronty `ncez-financovani-2027`).

## Aktualizace existujících dat (vlna)

- (žádná nová vlna vyžadující revizi existujícího článku dnes)

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný trigger. MZ front beze změny po 4. 6.
  (již ve frontě). SZÚ položky sekundární / bez nové vlny. ÚZIS/ČSÚ bez vlny.
  PSP/Sbírka/SÚKL dnes strojově nedohledány → nelze z nich nic primárně doložit.
- **WARM:** žádná zastaralá vlna vyžadující revizi dnes.
- **COLD → FALLBACK-AUDIT.** Per rozhodovací strom (žádný nový indikátor, žádné
  nové primárně-doložitelné dění, žádný článek zastaralý kvůli nové vlně)
  přepínám na audit. Vzhledem k explicitnímu pokynu uživatele („validace a
  ověření všech zdrojů“) a k tomu, že **nejčerstvější článek fronty
  `clanek-ncez-financovani-2027` má `scheduled_for: 2026-06-06` (dnes)** a vznikl
  předchozím automatickým během, je auditním cílem s nejvyšší hodnotou nezávislé
  re-ověření jeho zdrojů (Phase 5, A–F) PŘED tím, než ho redakce prompromuje do
  fronty k publikaci. Detail viz `routing-2026-06-06.md`.
