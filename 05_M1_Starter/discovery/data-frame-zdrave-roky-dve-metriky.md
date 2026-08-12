# Datový rámec — zdrave-roky-dve-metriky

Všechna čísla stažena strojově z Eurostat REST API (dissemination
`statistics/1.0/data`) **12. 8. 2026**; obě pohlaví (`sex=T`), jednotka roky,
není-li uvedeno jinak. Datasety: `hlth_hlye` (Healthy life years, GALI;
updated 17. 7. 2026) a `hlth_silc_17` (Healthy life expectancy based on
self-perceived health; updated 25. 6. 2026).

## Centrální KPI
- **HLY 65+ ČR 2024 = 8,0 roku** (GALI; `hlth_hlye`, HLY_Y65, T)
- **HLE 65+ ČR 2024 = 14,6 roku** (subjektivní zdraví; `hlth_silc_17`, HE_Y65, T)
- Rozdíl metrik: 14,6 − 8,0 = **6,6 roku** (derived)
- Naděje dožití při 65, ČR 2024 = 18,9 (`hlth_hlye`, LE_Y65, T)
- Podíl zdravých let po 65 (derived): GALI 8,0/18,9 = **42 %**; subj. 14,6/18,9 = **77 %**

## Benchmark (ČR vs EU27_2020, 2024, T)
| metrika | ČR | EU27 | Δ |
|---|---|---|---|
| HLY 65+ (GALI) | 8,0 | 10,3 | −2,3 |
| HLE 65+ (subj.) | 14,6 | 16,2 | −1,6 |
| LE 65 | 18,9 | 20,2 | −1,3 |
| HLY při narození | 62,4 | 65,2 | −2,8 |
| HLE při narození | 73,8 | 75,5 | −1,7 |
| LE při narození | 80,1 | 81,5 | −1,4 |
| EU podíl po 65 (derived) | — | GALI 51 % / subj. 80 % | — |

## Sekundární hodnoty
- ČR trend HLY 65+: 2020 7,5 · 2021 7,6 · 2022 7,4 · 2023 7,7 · 2024 8,0
  (shoda s trendem indikátoru `nadeje_doziti_zdravi_65` v datovém kontraktu)
- ČR trend HLE 65+: 2021 13,0 · 2022 13,8 · 2023 14,2 · 2024 14,6
- ČR 2024 podle pohlaví (65+): HLY M 7,8 / F 8,2; HLE M 13,6 / F 15,5;
  LE M 16,9 / F 20,6
- Podíl zdravých let žen/mužů po 65 (derived): GALI ženy 8,2/20,6 = 40 %,
  muži 7,8/16,9 = 46 %; subj. ženy 15,5/20,6 = 75 %, muži 13,6/16,9 = 80 %
- ČR při narození 2024: HLY 62,4; HLE 73,8 (M 71,9 / F 75,7); LE 80,1;
  rozdíl metrik 73,8 − 62,4 = 11,4 roku (derived)
- Kontrakt: `subjektivni_zdravi` = 67 % dospělých 16+ hodnotí zdraví jako
  dobré/velmi dobré (2025; EU 67,9) — stejná otázka EU-SILC, z níž vychází
  `hlth_silc_17`
- Flagy Eurostat: EU27 2023 HLY_Y65 nese `bep` (break in series + estimated
  + provisional); DE 2023 `b` (break); EU27 HLY 65+ meziročně 9,4 → 10,3

## Metodika / citace
- **Výměna v SDG monitoringu** — Statistics Explained „SDG 3 – Good health and
  well-being", poznámka 5 (ověřeno 12. 8. 2026), doslovně: *„Due to
  methodological reasons, the data source used for measuring healthy life
  expectancy has changed. Up to 2025, the indicator 'Healthy life years' was
  used for the SDG monitoring, combining life expectancy with data on activity
  limitations (online data code: (hlth_hlye)). As of this 2026 edition, a new
  indicator 'Healthy life expectancy based on self-perceived health' is used."*
- **GALI otázka** (Statistics Explained „Healthy life years statistics",
  ověřeno 12. 8. 2026): *„Are you limited because of a health problem in
  activities people usually do: severely limited, limited but not severely or
  not limited at all?"* + follow-up, zda omezení trvá ≥ 6 měsíců.
- **Otázka subjektivního zdraví** (ESMS `hlth_silc_17_esms`, ověřeno
  12. 8. 2026): sebehodnocení celkového zdraví na škále very good … very bad;
  „ve zdraví" = very good + good. Kombinuje se s úmrtnostními tabulkami.
- Limity srovnatelnosti (Statistics Explained, hlth_hlye): self-report,
  kulturní a sociální pozadí respondentů, EU-SILC vynechává osoby
  v institucích (kolektivních domácnostech), rozdíly národních formulací
  otázek mohou lámat řady.

## Legislativa
— (článek bez legislativní vazby; Zdraví 2030 jen jako strategický kontext)

## Mezinárodní kontext
- Obě metriky počítá Eurostat stejnou Sullivanovou logikou (úmrtnostní
  tabulky × prevalence zdravotního stavu z EU-SILC); liší se JEN zdrojová
  otázka. Methodology caveat: čísla HLY a HLE se NESMÍ směšovat do jedné řady.

## Interní křížové odkazy
- Články: clanek-nadeje-doziti-zdravi.html (HLY 65+, vlna 2023 — WARM revize),
  clanek-regionalni-nuzky-nadeje-doziti.html, clanek-stries-dozivame-pozdeji…
  (ne — držet: nadeje-doziti-zdravi + regionalni-nuzky + pyll)
- Indikátory: nadeje_doziti_zdravi_65 (8,0/2024, benchmark EU 10,3 — shoda
  s API), subjektivni_zdravi (67 %/2025), nadeje_doziti_total (80,1/2024,
  EU 81,5 — shoda s API)

## Ověřovací protokol
- hlth_hlye ČR/EU27/DE: staženo 12. 8. 2026, JSON uloženy ve scratchpadu
  session (hly_cz.json); hodnoty výše přepsány přímo ze skriptového výstupu.
- hlth_silc_17 ČR/EU27: dtto (hle_cz2.json).
- SDG poznámka 5 + GALI otázka: WebFetch 12. 8. 2026 (citace doslovné).
- Konzistence s datovým kontraktem: nadeje_doziti_zdravi_65 value 8,0/2024,
  trend 2020–2024 i benchmark EU 10,3 = přesná shoda; nadeje_doziti_total
  80,1/2024, EU 81,5 = přesná shoda; subjektivni_zdravi 67/2025, EU 67,9.
