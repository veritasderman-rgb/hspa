# Datový rámec — esencialni-antiinfektiva

Všechna čísla SEAI spočtena parserem z primárních PDF (pdftotext -layout,
regex na stavový sloupec, čísla stránek 3–7 filtrována) a verifikována
vizuální kontrolou 5 vzorových stran (2026: s. 3, 11, 13, 19; 2025: s. 28)
— 5/5 přesná shoda všech pozic. Jednotka analýzy = **pozice seznamu**
(léčivá látka × léková forma se samostatným stavem), NE unikátní látka.

## Centrální KPI

- **70 z 197 pozic (35,5 %) SEAI 2026 není v ČR standardně dostupných**
  (stavy 3–7: registrováno-nedostupno / SpLP / neregistrováno v ČR /
  dovoz ze 3. zemí / mimořádné opatření)
- Primární zdroj: Věstník MZ ČR č. 10/2026, s. 3–27, vydán 20. 8. 2026,
  PDF https://mzd.gov.cz/wp-content/uploads/2026/08/Vestnik-MZD_10-2026.pdf
  (staženo 21. 8. 2026). Stavy dostupnosti k 29. 5. 2026 (poznámka legendy:
  „pouze orientační").
- Benchmark: meziroční srovnání SEAI 2025 — Věstník MZ ČR č. 8/2025,
  s. 18–42, vydán 11. 6. 2025, PDF
  https://mzd.gov.cz/wp-content/uploads/2025/06/Vestnik-MZD-8-2025.pdf
  (staženo 21. 8. 2026). Stavy k 10. 4. 2025.
- Časový kontext: SEAI 2026 (třetí novodobá roční aktualizace: SEAI 2024
  ve Věstníku 4/2024 z 27. 3. 2024, SEAI 2025 ve Věstníku 8/2025).

## Rozpad stavů (SEAI 2026, 197 pozic)

| Stav | Význam (legenda věstníku) | 2026 | 2025 |
|---|---|---|---|
| 1 | registrováno + dostupné, ≥ 2 držitelé registrace | 64 | 59 |
| 2 | registrováno + dostupné, jediný držitel | 63 | 70 |
| 3 | registrováno, ale nedostupné na trhu | 15 | 15 |
| 4 | specifický léčebný program (SpLP) | 17 | 18 |
| 5 | neregistrováno v ČR, registrováno jinde v EU | 28 | 29 |
| 6 | neregistrováno v ČR ani EU, dovoz ze 3. zemí | 8 | 7 |
| 7 | mimořádné opatření MZ dle § 8 odst. 6 zák. o léčivech | 2 | — (kategorie neexistovala) |
| Σ | | **197** | **198** |

Odvozeně 2026: plná konkurence (stav 1) 64/197 = 32,5 %; jediný dodavatel
(stav 2) 63/197 = 32,0 %; standardně nedostupné (3–7) 70/197 = 35,5 %.
2025: stav 1 59/198 = 29,8 %; stav 2 70/198 = 35,4 %; (3–6) 69/198 = 34,8 %.

## Sekundární hodnoty

- Rozpad 197 pozic dle sekcí: antibiotika 97, antimykotika 17,
  antiparazitika 39, antivirotika 44 (tamtéž).
- Stavy 3–7 po sekcích 2026: antibiotika 28/97, antimykotika 5/17,
  antiparazitika 24/39 (61,5 % — nejhorší), antivirotika 13/44.
- 26 pozic 2026 nese hvězdičku „na trhu nemusí být dostupné všechny síly"
  (2025: 23).
- Stav 7 (2 pozice): tuberkulinový test a BCG vakcína — v SEAI 2025 vedeny
  jako stav 5 s poznámkou „dovoz do ČR na základě § 8 odst. 6 zákona
  o léčivech" (s. 28); 2026 pro ně zavádí explicitní kategorii.
  Nově v 2026 též diagnostikum Siiltibcy (stav 3).
- AWaRe klasifikace WHO (uvedena u části antibiotik, 69 z 97 pozic):
  Access 36, Watch 23, Reserve 10. Legenda: dle WHO AWaRe classification,
  verze 5. 9. 2025; seznam adaptuje WHO Model List of Essential Medicines,
  24. vydání.
- Kontext dashboardu (data/indicators.json): vypadky_leciv_aktivni (SÚKL),
  lpod_share_critical 5,4 % LP (SÚKL, 2026), podil_access_antibiotik
  59,4 % (ECDC ESAC-Net, 2024), spotreba_antibiotik 15 DDD/1000/den
  (SZÚ NRL, 2023).

## Legislativa

- § 8 odst. 6 zákona č. 378/2007 Sb., o léčivech — mimořádné opatření MZ
  (stav 7; formulace přímo v legendě věstníku 10/2026 i poznámce BCG
  ve věstníku 8/2025 — netřeba externí citace zákona).
- § 112 zákona č. 372/2011 Sb. — jen kontext věstníku (HOC výzva),
  do článku nevstupuje.

## Mezinárodní kontext

- WHO Model List of Essential Medicines, 24th List (2025) — předloha,
  na kterou se SEAI 2026 explicitně odkazuje (legenda, s. 27).
- Methodology caveat: srovnání 2025 × 2026 je srovnáním úhrnů dvou mírně
  odlišných seznamů (198 vs 197 pozic; přibylo Siiltibcy, měněny lékové
  formy), NE párové srovnání položek. Stavy k různým datům (10. 4. 2025
  vs 29. 5. 2026). Obojí v článku explicitně.
- Institucionální historie: seznam esenciálních antiinfektiv vzniká v rámci
  Národního antibiotického programu; SÚKL zveřejňoval revize (naposledy web
  „Revidovaný Seznam esenciálních antiinfektiv za rok 2020"). Přesný rok
  první publikace ve věstníku NEUVÁDĚT (zdroje se rozcházejí: 2012/2013) —
  držet se doložitelné řady 2024 → 2025 → 2026.

## Interní křížové odkazy

- Články: clanek-tamoxifen-vypadek.html, clanek-kvetiapin-vypadek.html,
  clanek-spotreba-antibiotik.html, clanek-rezistence-antibiotik.html,
  clanek-veterinarni-antibiotika-one-health.html
- Indikátory: vypadky_leciv_aktivni, lpod_share_critical,
  podil_access_antibiotik, spotreba_antibiotik
