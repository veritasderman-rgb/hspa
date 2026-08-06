# Datový rámec — erecept-v-cislech

## Centrální KPI
- Hlavní hodnota: **téměř 56 mil.** receptů zasláno v roce 2024 formou SMS =
  **téměř 65 %** všech předepsaných e-receptů; stálo SÚKL **>33 mil. Kč** = téměř
  pětinu provozních výdajů.
- Primární zdroj: NKÚ, kontrolní akce 24/25, TZ 3. 11. 2025 (staženo 6. 8. 2026)
  https://www.nku.cz/cz/pro-media/tiskove-zpravy/temer-56-milionu-receptu-zaslali-lekari-v-roce-2024-formou-sms--sukl-to-stalo-pres-33-mil--kc-_-petinu-provoznich-vydaju-id15078/
- Benchmark (vývoj): 2020 SMS 28,5 mil. → 2024 téměř 56 mil. (NKÚ).
- Časový kontext: rok 2024 (SMS + náklady), kontrolované období 2020–2023.

## Sekundární hodnoty (primární zdroj + rok)
- 2018 (první rok povinné e-preskripce): **58,5 mil. předepsaných** / 56 mil.
  vydaných eReceptů; **41 864 lékařů**, **2 894 lékáren**, 17 083 zdrav. zařízení.
  — MZ ČR, TZ 3. 1. 2019 „eRecept se osvědčil, jeho oblíbenost roste".
- **300 mil.** eReceptů vystaveno kumulativně k **25. 2. 2022** (od zavedení 2018).
  — SÚKL, TZ 28. 2. 2022.
- Průzkum 2021 (březen–květen, vzorek 1000 lékařů + 1000 lékárníků, telefonicky):
  **80 % lékařů** používá eRecept denně (před třemi lety 56 %); do lékového
  záznamu nahlíží u každého pacienta jen **2 % lékárníků**, u některých 30 %,
  výjimečně 39 %. — SÚKL, TZ 21. 10. 2021.
- Aplikace eRecept (web/mobil) využita v 2024 jen pro ~290 tis. receptů = **0,34 %**
  — NKÚ 24/25.
- SÚKL open data: měsíční agregace předepsaných/vydaných LP ze systému eRecept,
  okresní granularita, CSV, poslední vlna červen 2026 (publ. 9. 7. 2026).
  — opendata.sukl.cz.

## Indikátory dashboardu (databox)
- `ehealth_adoption` — eHealth index 62/100 (MZ ČR · eHealth, 2024, signal bad).
- `kyberneticke_incidenty_zdravotnictvi` — 29 incidentů/rok (NÚKIB, 2022).

## Legislativa (kontext, ne tvrzené číslo)
- Povinná elektronická preskripce od 1. 1. 2018 (zákon č. 378/2007 Sb., o léčivech,
  § 81 an.) — uvedeno jako rámec, bez citace konkrétního paragrafu z textu normy
  (e-sbirka strojově nedostupná; historie zavedení doložena MZ/SÚKL TZ).

## Methodology caveaty
- „80 % lékařů" je **údaj z roku 2021** — v textu explicitně datováno, ne jako
  současný stav.
- Přesný celkový roční objem eReceptů za 2024 není publikován v jediném primárním
  čísle (živá čísla jen v PowerBI dashboardu SÚKL) → článek neuvádí syntetický
  součet, kotví na ověřených hodnotách (58,5 mil./2018; SMS 65 % z 2024; 300 mil.
  kumulativně 2022).
- SMS jako notifikační kanál ≠ počet unikátních eReceptů; NKÚ jej uvádí jako podíl
  „z předepsaných e-receptů".

## Interní křížové odkazy
- Související články: `clanek-ehealth.html` (eHealth index 62), `clanek-digi-4-povinne-dobrovolne-2026.html`,
  `clanek-kyberneticka-bezpecnost-zdravotnictvi-2026.html`.
- Související indikátory: `ehealth_adoption`, `kyberneticke_incidenty_zdravotnictvi`.
