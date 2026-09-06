# Discovery report — 2026-09-06

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, fáze 1). Všechny nálezy níž mají
odkaz na primární strojově dohledatelný zdroj; hodnoty citované v tomto reportu
byly staženy dnes přímo z API / webu daného zdroje, ne z paměti modelu.

## Nové indikátory / datasety

- [X] **Eurostat — vlna 2025 rozdělení podle BMI (EU-SILC).** Eurostat vydal
  4. 9. 2026 statistický článek *Obesity rate in the EU: 16.3% in 2025* nad
  datasety `ilc_hch10` a `sdg_02_10`. Referenční rok 2025, věková báze 18+.
  Datová vrstva `ilc_hch10` (DOI 10.2908/ILC_HCH10) nese timestamp poslední
  aktualizace **8. 6. 2026**; článek ze 4. 9. je interpretační výstup nad ní.
  - ČR, obezita (BMI ≥ 30, 18+): 2017 = 20,5 % · 2022 = 17,8 % · **2025 = 21,1 %**
  - EU27: 2017 = 15,1 % · 2022 = 14,8 % · **2025 = 16,3 %**
  - ČR, nadváha + obezita (BMI ≥ 25, 18+): 2017 = 62,3 % · 2022 = 56,5 % · **2025 = 60,4 %**
  - Rozpad podle vzdělání (ČR 2025): ZŠ a méně 26,0 % · SŠ/vyučen 23,2 % · VŠ 13,9 %
  - Rozpad podle vzdělání (EU27 2025): 18,5 % · 17,7 % · 12,6 %
  - Příznaky: **všechny české buňky vln 2017 a 2025 nesou flag `u` = low
    reliability**; vlna 2022 flag nemá. EU27 2022 nese `e` (estimated).
  - API: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_hch10`
    (staženo 6. 9. 2026)
- [X] **Eurostat — struktura vzdělání 18–64 (`edat_lfse_03`, 2025, aktualizace
  11. 6. 2026).** ČR: ZŠ 8,5 % · SŠ 65,4 % · VŠ 26,1 %. EU27: 19,5 % · 46,3 % · 34,2 %.
  Potřebné jako váha pro čtení rozpadu výše.
- [ ] ÚZIS NZIP — žádný nový/aktualizovaný dataset od posledního běhu.

## Nové legislativní normy / sněmovní tisky

- (žádná nová norma v gesci MZ ČR vyhlášená od 5. 9.)
- Sněmovní tisk 235 (valorizace platby za státní pojištěnce) — stav beze změny
  proti běhu 5. 9. (usnesení garančního výboru č. 50 rozesláno 4. 9.); už
  zapracováno revizí `clanek-valorizace-statni-pojistenci-2027` v předchozím běhu.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR, 1. 9. 2026** — TZ „Česko patří mezi evropské průkopníky screeningu
  rakoviny prostaty“. Podkladem je recenzovaná publikace **Eur Urol Open Sci
  2026;91:41–48, DOI 10.1016/j.euros.2026.07.003** (PMID 42564931). Čísla v TZ
  (310 tis. oslovených, 2 079 záchytů) odpovídají tomu, co už nese publikovaný
  `clanek-prostata-screening-pilot` (18. 8. 2026) — nález je tedy **WARM**:
  doplnit článku recenzovaný pramen s DOI, ne psát nový text.
- **MZ ČR, 2. 9. 2026** — TZ o onkologických koordinátorech. Pokryto článkem
  `clanek-onkologicky-koordinator-2026` (17. 5. 2026), bez nových čísel.
- **MZ ČR, 3. 9. 2026** — TZ EZKarta nové generace. Pokryto článkem
  `clanek-ezkarta-nova-generace` z běhu 4. 9. 2026.
- SZÚ 1.–3. 9.: mediální výstupy (žloutenka A, školní stravování, pohybová
  iniciativa) — sekundární, bez vlastního datového výstupu.
- NÚKIB 21. 8.: Zpráva o stavu kybernetické bezpečnosti ČR za rok 2025 —
  bez zdravotnicky specifického řezu v přehledu; ponecháno na noční rutinu.

## Aktualizace existujících dat (vlna)

- ÚZIS — aktuality beze změny od 14. 8. 2026 (poslední věcná položka: vysoké
  teploty a mortalita).
- ČSÚ — od 25. 8. žádná publikace k demografii, úmrtnosti ani projekcím.
- WHO Europe — od 25. 8. bez nové evropské statistiky či guideline pro ČR.
- OECD — bez nové vlny Health at a Glance (očekává se 11/2026).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP:** 1 záznam. Návrh zákona, kterým se mění zákon č. 167/1998 Sb.,
  o návykových látkách, a další související zákony (předkladatel MZ ČR,
  autorizace 30. 6. 2026, **poslední úprava 1. 9. 2026**), ID `KORNDVEC8EF8`,
  <https://odok.cz/portal/veklep/material/KORNDVEC8EF8/>. Zatím bez čísla
  sněmovního tisku. Dotaz spuštěn 6. 9. 2026. → kandidát na legislativní radar,
  ne na dnešní článek (fáze projednávání se od minula posunula jen o úpravu
  materiálu).
- **Registr smluv:** kategorie `zdrav`, od 30. 8. 2026 celkem 157 smluv
  v objemu 47,3 mil. Kč. Největší položky jsou rutinní nákupy léčiv a materiálu
  fakultními nemocnicemi (FN Ostrava — klinické hodnocení dle protokolu
  GO42552, 5,11 mil. Kč, ROCHE s.r.o.; FN Hradec Králové — antivirotika,
  5,07 mil. Kč, MSD). **Žádná smlouva se skrytou cenou ani hodnotou těsně pod
  limitem ZZVZ.** Dotaz spuštěn 6. 9. 2026 přes hlidacstatu.cz.
- **ÚOHS:** žádné nové rozhodnutí s účastníkem ze zdravotnictví od 25. 8. 2026.

## Ověřovna Barometru — kandidáti

- (žádný nový kvantitativní výrok politika, který by šlo konfrontovat
  s indikátory dashboardu; TZ MZ z 1.–4. 9. citují data programu, ne politické
  odhady)

## Doporučení pro routing fáze

- **HOT (nová vlna dat s implikací):** Eurostat `ilc_hch10` vlna 2025 —
  obezita dospělých podle vzdělání. V korpusu není žádný článek, který by nesl
  post-2019 datový bod o obezitě dospělých, a vzdělanostní gradient obezity
  není pokrytý vůbec.
- **WARM (revize):** `clanek-prostata-screening-pilot` — doplnit DOI recenzované
  publikace Eur Urol Open Sci 2026;91:41–48 jako primární pramen.
- **WARM (radar):** VeKLEP KORNDVEC8EF8 — novela zákona o návykových látkách.
- **COLD:** nic dalšího.
