# Datový rámec — obezita-vzdelani-2025

Všechny hodnoty níž byly staženy **6. 9. 2026** přímo z disseminačního API
Eurostatu (`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/...`),
ne z tiskové zprávy, ne ze sekundárního zdroje a ne z paměti modelu. U každé
tabulky je uveden dataset, filtr a příznaky kvality (flags), jak je vrátilo API.

## Centrální KPI

- **Hlavní hodnota:** obezita (BMI ≥ 30) u dospělých 18+ v ČR = **21,1 %** (2025)
- **Benchmark:** EU27 = **16,3 %** (2025) → odstup **+4,8 p. b.**
- **Primární zdroj:** Eurostat, dataset `ilc_hch10` (EU-SILC), DOI 10.2908/ILC_HCH10,
  timestamp poslední aktualizace dat 8. 6. 2026; zvýrazněno článkem Eurostatu
  *Obesity rate in the EU: 16.3% in 2025* ze 4. 9. 2026
- **Časový kontext:** vlny 2017, 2022, 2025 (modul EU-SILC, tříletá periodicita)
- **PŘÍZNAK KVALITY:** všechny české buňky vlny 2025 nesou flag **`u` = low
  reliability** — a to plošně, včetně národního součtu a všech věkových skupin,
  ne jen u řídkých podskupin. Vlna 2022 flag nemá; vlna 2017 ho má také.
  Eurostat sám k tomuto flagu píše, že se má používat s krajní opatrností.

## Řada ČR × EU27 (ilc_hch10, sex=T, age=Y_GE18, isced11=TOTAL)

| ukazatel | 2017 | 2022 | 2025 |
|---|---|---|---|
| ČR obezita BMI ≥ 30 | 20,5 `u` | 17,8 | **21,1 `u`** |
| EU27 obezita BMI ≥ 30 | 15,1 | 14,8 `e` | **16,3** |
| ČR nadváha + obezita BMI ≥ 25 | 62,3 `u` | 56,5 | **60,4 `u`** |
| EU27 nadváha + obezita BMI ≥ 25 | 52,0 | 51,3 `e` | **51,7** |

Vlna 2022 je v české řadě odlehlá dolů u všech skupin; text ji jako takovou
pojmenovává a neopírá o ni žádný závěr.

## Rozpad podle vzdělání — jádro článku

### EU-SILC 2025 (`ilc_hch10`, BMI ≥ 30, 18+, sex=T)

| vzdělání (ISCED 2011) | ČR | EU27 | rozdíl |
|---|---|---|---|
| ZŠ a méně (0–2) | 26,0 `u` | 18,5 | +7,5 |
| SŠ a vyučen (3–4) | 23,2 `u` | 17,7 | **+5,5** |
| VŠ (5–8) | 13,9 `u` | 12,6 | **+1,3** |
| celkem | 21,1 `u` | 16,3 | +4,8 |

### Nezávislé ověření — EHIS 2019 (`hlth_ehis_bm1e`, BMI ≥ 30, age=Y_GE18, sex=T)

Jiné šetření (European Health Interview Survey), jiná vlna, **stejná věková
báze 18+**, dataset **bez jediného příznaku kvality** (timestamp aktualizace
3. 1. 2024).

| vzdělání | ČR 2019 | EU27 2019 | rozdíl | ČR 2014 | EU27 2014 | rozdíl |
|---|---|---|---|---|---|---|
| ZŠ a méně | 22,8 | 20,3 | +2,5 | 22,6 | 19,4 | +3,2 |
| SŠ a vyučen | 21,4 | 17,1 | **+4,3** | 20,5 | 15,4 | **+5,1** |
| VŠ | 13,2 | 11,4 | **+1,8** | 12,5 | 10,7 | **+1,8** |
| celkem | 19,8 | 16,5 | +3,3 | 19,3 | 15,4 | +3,9 |

**Shoda napříč šetřeními:** ve všech třech vlnách (EHIS 2014, EHIS 2019,
EU-SILC 2025) je odstup českých vysokoškoláků od evropských vysokoškoláků
nejmenší ze všech tří skupin (+1,8 / +1,8 / +1,3 p. b.) a odstup střední
vzdělanostní skupiny výrazně větší (+5,1 / +4,3 / +5,5 p. b.).

**Co naopak konzistentní NENÍ:** skupina „ZŠ a méně“. EHIS ji drží 2–3 body nad
EU, EU-SILC 2025 sedm a půl bodu. Je to nejmenší skupina (8,5 % dospělých ČR)
a v EU-SILC nese flag `u`. Článek na ní nestaví žádný závěr a tenhle rozpor
pojmenovává v textu.

Doplňkově, tentýž český vysokoškolský údaj napříč pěti měřeními: 12,5 (EHIS 2014),
12,4 (EU-SILC 2017), 13,2 (EHIS 2019), 12,2 (EU-SILC 2022), 13,9 (EU-SILC 2025).

## Váhy — struktura vzdělání (`edat_lfse_03`, age=Y18-64, sex=T, unit=PC)

| vzdělání | ČR 2025 | EU27 2025 | ČR 2019 | EU27 2019 |
|---|---|---|---|---|
| ZŠ a méně | 8,5 | 19,5 | 8,6 | 22,2 |
| SŠ a vyučen | **65,4** | 46,3 | **68,9** | 48,5 |
| VŠ | 26,1 | 34,2 | 22,5 | 29,4 |

Aktualizace datasetu 11. 6. 2026.

## Dopočty redakce (přímá standardizace) — označit v textu jako dopočet

Metoda: přímá standardizace podle vzdělání. Míry obezity 18+ se váží podílem
skupin ve věku 18–64. **Věkové báze se plně nepřekrývají** (míry 18+, váhy
18–64) — dopočet je proto ilustrativní rozklad, ne oficiální standardizovaná
hodnota.

| výpočet | výsledek |
|---|---|
| ČR míry × ČR váhy (2025) | 21,0 % (kontrola proti vykázaným 21,1 % — sedí) |
| ČR míry × **EU váhy** (2025) | 20,6 % |
| EU míry × EU váhy (2025) | 16,1 % (kontrola proti vykázaným 16,3 % — sedí) |
| **efekt struktury 2025** | **0,45 p. b. ze 4,8 p. b. odstupu** |
| efekt struktury 2019 (EHIS, váhy 2019) | 0,37 p. b. ze 3,3 p. b. odstupu |

Interpretace: kdyby mělo Česko evropskou vzdělanostní strukturu, jeho obezita by
klesla jen o necelé půl bodu. Odstup od Evropy tedy **nevzniká tím, že by tu
bylo víc lidí s nízkým vzděláním** — je jich naopak méně než v EU (8,5 % proti
19,5 %). Vzniká tím, že česká střední vzdělanostní skupina má vyšší míru
obezity než její evropský protějšek.

Další dopočty:
- Vzdělanostní rozpětí (ZŠ minus VŠ) 2025: ČR **12,1 p. b.**, EU27 5,9 p. b. → 2,05×
- Pořadí rozpětí 2025 mezi 30 zeměmi, které mají v datasetu obě krajní vzdělanostní
  skupiny (33 geo položek minus tři agregáty EU27 / EA20 / EA21): Malta 15,1 ·
  Slovensko 14,0 · Turecko 13,0 · **Česko 12,1** · Slovinsko 11,2 · Chorvatsko 11,2 →
  ČR je čtvrtá celkově a **třetí mezi členskými státy EU** (Turecko je země kandidátská)
- Vzdělanostní rozpětí ČR napříč vlnami EU-SILC: 2017 = 13,5 · 2022 = 7,5 · 2025 = 12,1

## Sekundární hodnoty (podpůrné, všechny z týchž stažení)

- ČR 2025 podle pohlaví (18+): muži 22,7 %, ženy 19,8 % · EU27: muži 17,4 %, ženy 15,3 %
- ČR 2025 ženy podle vzdělání: ZŠ 26,3 · SŠ 22,0 · VŠ **11,4** (rozpětí 14,9 p. b.)
- ČR 2025 muži podle vzdělání: ZŠ 25,2 · SŠ 24,6 · VŠ **17,0** (rozpětí 8,2 p. b.)
- EU27 2025 ženy: 18,8 / 16,4 / 11,0 · muži: 18,2 / 19,0 / 14,4
- ČR 2025 podle věku: 16–24 = 7,8 · 25–34 = 14,2 · 35–49 = 19,3 · 50–64 = 24,9 ·
  65–74 = 26,9 · 75+ = 21,0 (EU27: 6,0 · 12,4 · 15,9 · 19,6 · 20,4 · 16,5)
- Pořadí zemí, obezita 2025 celkem: Malta 26,6 · Lotyšsko 24,6 · Finsko 23,2 ·
  Irsko 22,1 · Estonsko 22,0 · Litva 21,5 · Turecko 21,4 · **Česko 21,1** →
  ČR je sedmá nejvyšší mezi členskými státy EU. Nejníž Itálie 7,0 · Řecko 12,8 ·
  Rumunsko 12,9.

## Legislativa

Žádná. Článek nestaví na normě. Vyhlášku o školním stravování, kterou zmiňuje
publikovaný `clanek-obezita-jidelny-reforma`, se dnes nepodařilo ověřit
z primárního zdroje (zakonyprolidi.cz vrací HTTP 403, e-sbirka.gov.cz nevydala
obsah) — **proto v tomto článku citovaná není** a odkaz vede jen na existující
článek jako související obsah.

## Interní křížové odkazy

- Články: `clanek-bmi-obezita`, `clanek-obezita-jidelny-reforma`,
  `clanek-deti-obezita-cosi`, `clanek-nadeje-doziti-vzdelani`,
  `clanek-prijem-a-zdravi`, `clanek-nesplnena-potreba-zubni-pece`
- Indikátory: `obezita_prevalence` (19,8 %, EHIS 2019, EU 16,5 — sedí na tento
  rámec), `bmi_dospeli` (60 %, EHIS 2019, EU 52,7 — sedí),
  `nadeje_doziti_vzdelani_gap_muzi` (13 let, 2018), `prevalence_diabetu`
  (9,5 %, 2023), `mortalita_kardiovaskularni` (463,75 / 100 tis., 2023),
  `vydaje_prevence_pct` (2,736 %, 2023, OECD 3,2)

## Co se do článku vědomě NEDÁVÁ

- Jakýkoli závěr postavený na skupině „ZŠ a méně“ z EU-SILC 2025 (rozpor s EHIS,
  malá skupina, flag `u`)
- Přepnutí indikátorů dashboardu na EU-SILC (jiné šetření než deklarují karty)
- Kauzální tvrzení „vzdělání způsobuje obezitu“ — data ukazují asociaci
- Cokoli o účinnosti konkrétních opatření (cukrová daň, Nutri-Score) — to je téma
  publikovaného `clanek-bmi-obezita`, tady by šlo o nedoložený přesah
- Vyhláška o spotřebním koši ve školních jídelnách (dnes neověřitelná)
