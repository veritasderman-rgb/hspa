# Discovery report — 2026-06-07

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** Předchozí
běh 2026-06-06 → FALLBACK-AUDIT (re-ověření `clanek-ncez-financovani-2027`,
audit-pass). 7. 6. 2026 je **neděle** — víkend, minimální nová vládní produkce.

## Procházené primární zdroje (stav fetch k 7. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny: poslední položka 5. 5. 2026 (prodloužení sběru výkazů do 20. 5.); 28. 4. rozšíření číselníku odborností; 14. 4. HPV strategie. **Nová datová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 2 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější TZ stále **4. 6. (NCEZ → odbor MZ + Ostrava)** — již zpracováno (ve frontě `ncez-financovani-2027`). Po 4. 6. žádná nová TZ. Předchozí: 3. 6. radioterapie (publikováno), 2. 6. pooperační sepse, 29. 5. vedení IKEM (Rögnerová → Benešová), 28. 5. centralizace HPB/jícnové chirurgie + CDZ IV. |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 5. 6. B. Kotlík na ČT24 — ovzduší/předčasná úmrtí (**sekundární**); 26. 5. Nutrivigilance 2025 (primárka, ale bez HSPA-indikátorové implikace); 29. 5. NAUTA nikotin u mladých (již posouzeno). **Nová surveillance vlna s ČR-implikací: žádná.** |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | 5. 6. maloobchod 04/2026; 4. 6. mzdy Q1, CPI 05/2026, trh práce Q1; 3. 6. neschopenky stabilní (sociální, ne HSPA datová vlna); 1. 6. nové logo. **Nová demografická/mortalitní/EHIS vlna: žádná.** |
| 5 | PSP ČR — sněmovní tisky | psp.cz/sqw/historie.sqw | ⚠️ nedohledáno | „Sněmovní tisk nebyl nalezen" / navigační skeleton — seznam dnes strojově nedohledán. **Žádný nový zdravotnický tisk neověřen → netvrdím nic.** |
| 6 | Sbírka zákonů / zakony.gov.cz | zakonyprolidi.cz/cs/aktualne | ⚠️ anti-bot | Seznam nových norem dnes nedohledán strojově. **Žádnou novou normu netvrdím.** (WebSearch vrátil jen již známé novely VZP+elektronizace účinné 1. 1. 2026 a komplexní novelu zákona o zdrav. službách — nic nového po 4. 6.) |
| 7 | SÚKL — výpadky léčiv | sukl.cz/farmaceuticky-trh/registr-vypadku-leciv | ⚠️ anti-bot | Registr výpadků dnes nedohledán strojově. **Žádný nový výpadek netvrdím.** |

**OECD / Eurostat / WHO / NÚKIB:** beze změny — HAG 2025 (publ. 11/2025) a
Country Health Profile Czechia 2025 (publ. 12/2025) jsou nejnovější vlny, již
v korpusu; žádná nová vlna hlth_* / WHO guideline s ČR-implikací k 7. 6. (víkend,
delta proti včerejšku nepravděpodobná).

## Nové indikátory / datasety

- (žádné nové) — ÚZIS bez vlny, ČSÚ bez demografické/EHIS vlny, OECD/Eurostat beze změny.

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR datovaná po 4. 6. 2026 strojově neověřena.
  PSP a Sbírka dnes strojově nedohledány — per železné pravidlo NETVRDÍM, že něco
  nového vyšlo, jen že to dnes nelze primárně doložit.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **5. 6. — ovzduší / předčasná úmrtí** (B. Kotlík, ČT24) — sekundární, bez nové
  primární datové vlny; téma pokryto (`clanek-pm25-spinavy-vzduch`). Netvoří HOT.
- **4. 6. NCEZ** — již ve frontě (`ncez-financovani-2027`, audit-pass 6. 6.).

## Aktualizace existujících dat (vlna)

- (žádná nová vlna vyžadující revizi existujícího článku dnes)

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný trigger (neděle; MZ front beze změny po
  4. 6.; SZÚ/ČSÚ bez HSPA vlny; PSP/Sbírka/SÚKL strojově nedohledány).
- **WARM:** žádná zastaralá vlna vyžadující revizi dnes.
- **COLD → FALLBACK-AUDIT.** Per rozhodovací strom (žádný nový indikátor, žádné
  nové primárně-doložitelné dění, žádný článek zastaralý kvůli nové vlně)
  přepínám na audit. Vzhledem k explicitnímu pokynu uživatele („validace a ověření
  všech zdrojů") je auditním cílem s nejvyšší hodnotou nezávislé re-ověření zdrojů
  článku, který je nejblíže automatické publikaci publikační frontou a nebyl
  re-auditován včerejším během. Cílem dne je `clanek-centra-dusevniho-zdravi.html`
  (`scheduled_for` prázdné = eligible, `ready_since: 2026-06-06`, nejstarší
  `last_reviewed: 2026-06-04` mezi imminentními kandidáty). Detail viz
  `routing-2026-06-07.md`.
