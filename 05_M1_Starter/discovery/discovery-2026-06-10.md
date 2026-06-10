# Discovery report — 2026-06-10

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** Předchozí
běh byl 2026-06-08 (pondělí) → FALLBACK-AUDIT (re-ověření
`clanek-veterinarni-antibiotika-one-health`, audit-pass, 0 oprav). 9. 6. proběhl
bez běhu rutiny. 10. 6. 2026 je **středa**.

## Procházené primární zdroje (stav fetch k 10. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny: poslední položka stále 5. 5. 2026 (prodloužení sběru výkazů do 20. 5.). **Nová datová vlna NRPZS/NOR/NRH/NRZP: žádná.** |
| 2 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **NOVÁ TZ 9. 6. 2026** — „Ministerstvo zdravotnictví představilo další rozvoj sítě center duševního zdraví. Ve VFN v Praze zahájilo provoz nové centrum pro osoby se závislostmi." Předchozí: 4. 6. NCEZ (ve frontě `ncez-financovani-2027`), 3. 6. radioterapie, 2. 6. pooperační sepse — vše v korpusu. |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 9. 6. Den zdraví na Karláku (akce, ne datová vlna); 8. 6. „~40 % mladých Čechů užívá nikotin" (Novinky.cz, sekundární — téma `koureni-adolescenti` ve frontě, flagged); 8. 6. mléko do škol (CNN Prima, sekundární — téma `obezita-jidelny-reforma` ve frontě); 5. 6. ovzduší/předčasná úmrtí (sekundární, pokryto `pm25-spinavy-vzduch`). **Nová surveillance vlna s ČR-implikací: žádná.** |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | 8. 6. zahraniční obchod / průmysl / stavebnictví 04/2026; 4. 6. mzdy Q1 + CPI 05/2026; 1. 6. nové logo ČSÚ. **Nová demografická/mortalitní/EHIS vlna: žádná.** |
| 5 | OECD / Eurostat / WHO / NÚKIB | — | — | Beze změny — HAG 2025 (11/2025) a Country Health Profile Czechia 2025 (12/2025) nejnovější vlny, již v korpusu; žádná nová vlna hlth_* / WHO guideline s ČR-implikací k 10. 6. |

## Nové indikátory / datasety

- (žádný zcela nový indikátor) — ale **nová oficiální data k existujícímu indikátoru**
  `centra_dusevniho_zdravi_per_100k`: MZ ČR (TZ 9. 6. 2026) uvádí přesný stav sítě
  CDZ **koncem roku 2025** — viz níže.

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR strojově ověřena po 4. 6. 2026. (PSP / Sbírka
  zákonů strojově nedohledány — per železné pravidlo netvrdím, že něco vyšlo.)

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **HOT — 9. 6. 2026, MZ ČR (primární):** Další rozvoj sítě center duševního zdraví.
  Ověřeno přímo z TZ na mzd.gov.cz:
  - **Stav sítě CDZ koncem roku 2025: 50 center celkem** — 39 pro osoby se závažným
    duševním onemocněním (SMI, dospělí), 4 pro děti a dorost, 3 pro závislosti,
    2 pro ochranné léčení, 2 pro seniory.
  - **Nové adiktologické CDZ ve VFN Praha** — provoz od 1. 5. 2026; dotace
    5,437 mil. Kč na první rok (OP Zaměstnanost+, výzva č. 103, ESF+); součást
    Kliniky adiktologie 1. LF UK a VFN; cílí na klienty s komplikovanými formami
    závislostí a kombinovanými poruchami (duševní onemocnění + závislost).
  - **Výzva CDZ IV** (navazuje na TZ 28. 5. 2026 „Pomoc blíž lidem") — podpora
    vzniku **nejméně 15 nových center**; vyhlášení dotačního programu **15. 9. 2026**,
    příjem žádostí od 16. 9. 2026, realizace **7/2026 – 12/2028**; financováno
    z OP Zaměstnanost+ a státního rozpočtu; cílové skupiny SMI, děti/dorost, senioři,
    závislosti, ochranné léčení.
  - Citace ministra Adama Vojtěcha (TZ 9. 6.): „Centra duševního zdraví představují
    hmatatelné výsledky reformy péče o duševní zdraví a moderní přístup. Když jsme
    v roce 2018 otevírali první centra, chtěli jsme přinést pomoc přímo k lidem do
    jejich přirozeného prostředí a propojit zdravotní a sociální služby."

## Aktualizace existujících dat (vlna)

- **WARM:** `clanek-centra-dusevniho-zdravi.html` (verified, published) končí časovou
  řadu rokem 2024 (~40 center, kontrola NKÚ). MZ ČR 9. 6. 2026 publikovalo **přesný
  stav koncem 2025 (50 center, z toho 39 pro dospělé se SMI)** + novou rozvojovou
  vlnu (CDZ IV, adiktologické CDZ VFN). To je primárně-doložitelná aktualizace, která
  navazuje na narativ článku (časová osa + „politická páka — co může stát udělat").

## Doporučení pro routing fáze

- **HOT (nový článek):** žádný — téma je již robustně pokryto (`centra-dusevniho-zdravi`,
  `protidrogova-dusevni-politika-mz-2026`, `reforma-psychiatrie-13-let`,
  `umrtnost-predavkovani-drogy`). Nový samostatný článek by byl redundantní.
- **WARM (revize):** `clanek-centra-dusevniho-zdravi.html` — doplnit ověřenou vrstvu
  konce 2025 / 2026 (50 center, CDZ IV, adiktologické CDZ VFN) do časové osy,
  databoxu, sekce „Politická páka" a zdrojů. **→ ARTICLE-REVISE.** Detail viz
  `routing-2026-06-10.md`.
- **COLD:** —
