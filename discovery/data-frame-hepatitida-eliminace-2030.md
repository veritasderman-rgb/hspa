# Datový rámec — hepatitida-eliminace-2030

## Centrální KPI
- Hlavní hodnota: **3,1 nově zachycené chronické hepatitidy B+C na 100 000 obyvatel** (ČR, 2023)
- Primární zdroj: ECDC Surveillance Atlas of Infectious Diseases (dataset 361, HealthTopic 26) — v datovém kontraktu `data/indicators.json` jako `hepatitida_bc_chronicka`, origin **live**, fetched 2026-07-21
- Trend (ČR, /100 000): 2019 = 2,6 · 2020 = 1,3 · 2021 = 1,5 · 2022 = 2,5 · 2023 = 3,1 (propad 2020 = pandemické podhlášení/omezené testování)
- Časový kontext: cíl WHO eliminace do 2030 (za <5 let)

## Sekundární hodnoty (primární zdroje)
- **Hepatitida C — 1 447 nahlášených případů v ČR (2024)** = nejvíc v období 2010–2025 — SZÚ / ISIN (via NZIP)
- Hepatitida C celkem 2010–2025: **15 763** případů; průměr **700–1 000/rok**; ~**600–800/rok** vázáno na injekční užívání drog — SZÚ / ISIN
- Antivirová léčba (DAA) vyléčí **>90 %** osob s HCV — SZÚ / NZIP
- Hepatitida B celkem 2010–2025: **1 378** případů; vrchol **244 v roce 2010**, dlouhodobě klesá — SZÚ / ISIN
- Plošné **povinné a hrazené očkování kojenců proti hepatitidě B** (v ČR od roku 2001; schéma 2+1) — SZÚ

## Cíle WHO eliminace 2030 (vs baseline 2015)
- −90 % nových nákaz · −65 % úmrtnosti · **90 % diagnostikovaných** · **80 % léčených** — WHO, Elimination of hepatitis by 2030
- Svět mimo trajektorii: ~1,1 mil. úmrtí/rok (2022) vs cíl <0,5 mil.; celosvětově léčeno ~9,4 mil. lidí na HCV vs cíl 40 mil. — WHO Global Hepatitis Report 2024

## Legislativa
- Vyhláška č. **389/2023 Sb.**, příloha č. 18 — systém epidemiologické surveillance, povinné hlášení virových hepatitid B a C

## Metodické výhrady (caveat)
- ECDC „chronická hepatitida B+C incidence" (3,1/100 000) a SZÚ/ISIN „nahlášené případy hepatitidy C" (1 447 v 2024) **měří různé věci** (nově zachycené chronické nákazy vs všechna nahlášení HCV) — v článku drženy odděleně, netvořit z nich dvojici.
- Rok 2020 ovlivněn pandemií (podhlášení) — nárůst 2020→2023 neinterpretovat jako čistě epidemiologický.

## Interní křížové odkazy
- Indikátor: `hepatitida_bc_chronicka`
- Související témata: prevence / vakcinace, přenosné nemoci (rezistence antibiotik), stav populace
