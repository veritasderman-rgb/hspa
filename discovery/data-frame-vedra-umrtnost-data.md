# Datový rámec — vedra-umrtnost-data

Všechna „computed" čísla = vlastní reprodukovatelný výpočet redakce z otevřeného
datasetu ÚZIS **NR-06-33 „Denní úmrtí — věk, pohlaví, příčina"**
(data.mzcr.cz/data/distribuce/467, CSV 16,5 MB, 1. 1. 1994 – 31. 12. 2024,
Last-Modified 24. 11. 2025, CC BY 4.0; staženo a zparsováno 14. 8. 2026;
326 524 řádků). Sezónní základna dne = průměr téhož kalendářního okna ±7 dní
v okolních letech ±3 roky (bez roku samotného). Není to kauzální atribuce
(viz caveat v článku).

## Centrální KPI
- **1. 8. 1994: 420 zemřelých za den** — nejvyšší letní denní počet v celé řadě
  1994–2024; sezónní základna ~289 → **+45 %**. Z toho 234 úmrtí (56 %) nemoci
  oběhové soustavy. [computed, NR-06-33]
- Jen **3 letní dny ≥ 400 zemřelých** v celé řadě — 27. 6. 1994 (420),
  29. 6. 1994 (416), 1. 8. 1994 (420). [computed]

## Sekundární hodnoty
- Okno 23. 7.–8. 8. 1994: 5 770 zemřelých, **+855 nad základnu (+17,4 %)** [computed]
- Okno 25. 6.–3. 7. 1994: **+429 (+15,9 %)** [computed]
- Hlavní vlna 3.–16. 8. 2015: 4 677 zemřelých, **+771 (+19,7 %)**; peak 14. 8. 2015
  = 385 (+112 nad základnu) [computed]
- 16.–22. 6. 2013: 2 353, **+440 (+23,0 %)** [computed]
- 30. 7.–9. 8. 2018: 3 640, **+452 (+14,2 %)** [computed]
- 10.–18. 7. 2010: 2 795, **+314 (+12,6 %)** [computed]
- Léto 2024: průměr 290,7 zemřelých/den, maximum 10. 7. 2024 = 337 [computed]
- Roční úhrny (sanity check): 1994 = 117 373; 2024 = 112 211 [computed]
- Eurostat `demo_r_mwk_ts` CZ: poslední týden **2026-W27 = 2 299** zemřelých
  (provizorní), refresh 13. 8. 2026, W28–W31 prázdné → zpoždění ~5–6 týdnů
  [Eurostat dissemination API, 14. 8. 2026]
- Zpoždění denních dat: poslední den 31. 12. 2024, publikováno 26. 11. 2025;
  k 14. 8. 2026 jsou nejnovější denní data **přes 19 měsíců** stará (591 dní)

## Primární zdroje
1. ÚZIS aktualita „Vysoké teploty a mortalita", 14. 8. 2026,
   uzis.cz/index.php?pg=aktuality&aid=8757 — citace: „Data o zemřelých osobách
   dostává ÚZIS v pravidelném jednoročním intervalu. V současné chvíli tak
   nejsou k dispozici data v reálném čase." (WebFetch 14. 8. 2026)
2. NZIP dataset 2516 / NR-06-33 (nzip.cz/data/2516-…), CSV data.mzcr.cz
3. ČSÚ DataStat OBY04ZEM03T01 (týdenní zemřelí) — odkazovaný ÚZIS kanál
4. Eurostat demo_r_mwk_ts (týdenní zemřelí, API pull 14. 8. 2026)
5. Clim4Cast teplotní index (clim4cast.eu/cs/teplotni-index) — zdánlivá teplota,
   předpověď 10 dní, Interreg Central Europe, model ECMWF (WebFetch 14. 8. 2026)

## Recenzovaná literatura (PubMed MCP, 14. 8. 2026)
- Kyselý & Kříž 2003, Epidemiol Mikrobiol Imunol 52(3):105–16, PMID 12931347
  (bez DOI): peaky vln >100 úmrtí/den (+30 %); červen 1994 (17.–30. 6.)
  +456 úmrtí (+10,3 %); mortality displacement ~50 % obětí
- Urban, Hanzlíková, Kyselý, Plavcová 2017, Int J Environ Res Public Health,
  DOI 10.3390/ijerph14121562: léto 2015 rekordní v celkové délce vln a tepelné
  zátěži; relativní nadúmrtnost hlavní vlny 2015 > 1994; v 2015 senioři 65+
  zasaženi výrazně silněji (v 1994 obě věkové skupiny srovnatelně)
- Kyselý & Kříž 2008, Int J Biometeorol, DOI 10.1007/s00484-008-0166-3:
  slabší dopad vln 2003 — adaptace, mortality displacement, lepší informovanost,
  biometeorologická předpověď
- Urban, Kyselý, Plavcová, Hanzlíková, Štěpánek 2020, Sci Total Environ,
  DOI 10.1016/j.scitotenv.2020.137093: průměrný dopad dne vlny na nadúmrtnost
  klesal ~2–3 %/dekádu, pokles se v poslední dekádě zastavil; kumulativní počet
  nadúmrtí roste s frekvencí a intenzitou vln; nejzranitelnější skupina se
  posunula k 70+ (muži) / 75+ (ženy)

## Mezinárodní/metodický kontext
- Rozdíl výpočtů: naše okna/základna ≠ definice vln a GAM základny v literatuře
  → čísla se liší (např. červen 1994: náš výpočet +429 v okně 25. 6.–3. 7.
  vs Kyselý +456 v okně 17.–30. 6.) — v článku explicitní methodology caveat.
- Kauzalita: prostá odchylka od sezónní základny ≠ atribuce vedru
  (chřipka/covid vyloučeny jen implicitně letní sezónou).

## Interní křížové odkazy
- Články: clanek-vedro-a-telo.html, clanek-nemocnice-v-horku.html,
  clanek-nadumrtnost-cesko.html
- Indikátory (databox): nadumrtnost (2,7 %, 2025, Eurostat),
  mortalita_kardiovaskularni (463,75/100k std., 2023, Eurostat),
  multimorbidita_65plus (65 %, 2022, SHARE)
