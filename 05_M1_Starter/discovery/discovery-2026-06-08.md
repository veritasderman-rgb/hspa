# Discovery report — 2026-06-08

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** Předchozí
běh 2026-06-07 (neděle) → FALLBACK-AUDIT (re-ověření `clanek-centra-dusevniho-zdravi`,
audit-fix 23/30 → 23/22). 8. 6. 2026 je **pondělí** — první pracovní den po víkendu.

## Procházené primární zdroje (stav fetch k 8. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny: poslední položka stále 5. 5. 2026 (prodloužení sběru výkazů do 20. 5.); 28. 4. rozšíření číselníku odborností; 14. 4. HPV; 12. 1. demografické změny personálu. **Nová datová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 2 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější TZ stále **4. 6. (NCEZ → odbor MZ + Ostrava)** — již ve frontě (`ncez-financovani-2027`, audit-pass 6. 6.). Po 4. 6. žádná nová TZ. Předchozí: 3. 6. radioterapie, 2. 6. pooperační sepse — obojí v korpusu. |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 5. 6. B. Kotlík na ČT24 — ovzduší/předčasná úmrtí (**sekundární**, téma pokryto `clanek-pm25-spinavy-vzduch`); 5. 6. setkání ERVISS (respirační viry); 4. 6. klíšťata (Právo, sekundární); 3. 6. hepatitida (Zdravotnický deník, sekundární). **Nová surveillance vlna s ČR-implikací: žádná.** |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | 5. 6. maloobchod 04/2026; 4. 6. mzdy Q1 + CPI 05/2026 + trh práce Q1; 3. 6. neschopenky stabilní (sociální, ne HSPA vlna). **Nová demografická/mortalitní/EHIS vlna: žádná.** |
| 5 | PSP ČR — sněmovní tisky | psp.cz/sqw/historie.sqw | ⚠️ nedohledáno | Seznam strojově nedohledán (navigační skeleton). **Žádný nový zdravotnický tisk neověřen → netvrdím nic.** |
| 6 | Sbírka zákonů / zakonyprolidi.cz | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | Anti-bot (HTTP 403). Seznam nových norem dnes nedohledán strojově. WebSearch vrátil jen již známé novely (VZP + elektronizace účinné 1. 1. 2026). **Žádnou novou normu netvrdím.** |
| 7 | SÚKL — výpadky léčiv | sukl.cz/farmaceuticky-trh/registr-vypadku-leciv | ⚠️ anti-bot | Registr výpadků dnes nedohledán strojově. **Žádný nový výpadek netvrdím.** |
| 8 | MZ ČR — Věstník | mzd.gov.cz/category/uredni-deska/vestnik-mz-cr/ | ⚠️ 404 | Cesta strojově nedohledána (404 na této URL). **Žádný nový věstník netvrdím.** |

**OECD / Eurostat / WHO / NÚKIB:** beze změny — HAG 2025 (publ. 11/2025) a
Country Health Profile Czechia 2025 (publ. 12/2025) jsou nejnovější vlny, již
v korpusu; žádná nová vlna hlth_* / WHO guideline s ČR-implikací k 8. 6.

## Nové indikátory / datasety

- (žádné nové) — ÚZIS bez vlny, ČSÚ bez demografické/EHIS vlny, OECD/Eurostat beze změny.

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR datovaná po 4. 6. 2026 strojově neověřena.
  PSP, Sbírka i Věstník dnes strojově nedohledány (403/404/skeleton) — per
  železné pravidlo NETVRDÍM, že něco nového vyšlo, jen že to dnes nelze
  primárně doložit.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **5. 6. — ovzduší / předčasná úmrtí** (B. Kotlík, ČT24) — sekundární, bez nové
  primární datové vlny; téma pokryto (`clanek-pm25-spinavy-vzduch`). Netvoří HOT.
- **4. 6. NCEZ** — již ve frontě (`ncez-financovani-2027`, audit-pass 6. 6.).

## Aktualizace existujících dat (vlna)

- (žádná nová vlna vyžadující revizi existujícího článku dnes)

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný trigger (MZ front beze změny po 4. 6.;
  SZÚ/ČSÚ bez HSPA vlny; PSP/Sbírka/SÚKL/Věstník strojově nedohledány).
- **WARM:** žádná zastaralá vlna vyžadující revizi dnes.
- **COLD → FALLBACK-AUDIT.** Per rozhodovací strom (žádný nový indikátor, žádné
  nové primárně-doložitelné dění, žádný článek zastaralý kvůli nové vlně)
  přepínám na audit. Per explicitní pokyn uživatele („validace a ověření všech
  zdrojů") je auditním cílem s nejvyšší hodnotou nezávislé re-ověření zdrojů
  článku, který je **nejblíže automatické publikaci** publikační frontou a nebyl
  re-auditován včerejším během. Další-v-pořadí kandidát po `centra-dusevniho-zdravi`
  (re-auditováno 7. 6.) je `clanek-veterinarni-antibiotika-one-health.html`
  (`scheduled_for` prázdné = eligible, `ready_since: 2026-06-06`, slug-sort 2. mezi
  imminentními; `last_reviewed: 2026-06-05`). Detail viz `routing-2026-06-08.md`.
