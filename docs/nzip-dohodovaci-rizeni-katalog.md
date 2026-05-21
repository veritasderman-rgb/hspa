# NZIP „Datová podpora dohodovacího řízení" — katalog datových sad

Analýza zdroje **<https://www.nzip.cz/dohodovaci-rizeni>** a všech jeho podstránek
(crawl 2026-05-21). Cílem bylo najít nové indikátory pro HSPA dashboard, které mají
**časovou řadu** a **strojově stažitelná data** (.xlsx / .csv).

Strojově čitelný katalog: [`05_M1_Starter/ingest/mapping/nzip_dohodovaci_rizeni_catalog.json`](../05_M1_Starter/ingest/mapping/nzip_dohodovaci_rizeni_catalog.json)

## Co bylo procházeno

| | Počet |
|---|---|
| Procházených podstránek celkem | 51 |
| Datových sad se stažitelným souborem | 44 |
| Stránek jen s interaktivní vizualizací (bez souboru) | 7 |
| Sad se silnou vnitřní časovou řadou | 10 |
| Navržených kandidátů na nové indikátory | 56 |

## Struktura zdroje

Portál člení data do **8 dimenzí** datové podpory dohodovacího řízení:

1. Ceny a objemy
2. Personální zabezpečení
3. Produkce a náklady poskytovatelů nelůžkové péče
4. Seznam výkonů *(bez datových souhrnů — jen plánované změny)*
5. Struktura pojištěnců a náklady zdravotních pojišťoven
6. Produkce a náklady segmentu lůžkové péče
7. Produkce a náklady komunitních ošetřovatelských služeb
8. Produkce a náklady jednodenní péče

Kromě toho jsou odkazovány sady z dalších registrů ÚZIS: personální kapacity
(`NR-02-01/02`), zdravotnická technika (`SSS-04-02`), centra vysoce specializované
péče (`OIS-03-01`) a otevřená data preventivních prohlídek (`PPS-08-01`).

## Jak vzniká časová řada

Každá sada je publikována jako **XLSX „datový souhrn"** na úrovni jednotlivých
poskytovatelů (IČO / IČZ). Časová řada vzniká dvěma způsoby:

- **Vnitřní řada** — soubor obsahuje více let jako sloupce nebo listy
  (např. `OIS-11-12` roky 2019–2024, `SSS-04-02` list *Vývoj_v_ČR* roky 2006–2024).
- **Napříč edicemi** — soubor je snímkem za jeden referenční rok; řada vzniká
  stohováním ročních edic (přípona `-NN` ve verzi: `2025-01`, `2026-01`…).

**Kadence aktualizace:** nepravidelně, dle ÚZIS — typicky 1–3 edice ročně na sadu.
Doporučená kontrola zdroje: měsíčně (data se nemění denně).

## Nejsilnější kandidáti na nové indikátory (vnitřní časová řada)

| Sada | Téma | Řada | HSPA dimenze |
|---|---|---|---|
| `SSS-04-02` | Přístrojové vybavení (CT, MR, PET, urychlovače…) | 2006–2024 | Struktury / Zdravotnická technika |
| `OIS-11-12` | Vývoj průměrných platů a mezd | 2019–2024 | Struktury / Pracovní síla |
| `OIS-11-13` | Kapacity a úvazky zdravotníků | 2019–2024 | Struktury / Pracovní síla |
| `OIS-11-17` | Nákladová struktura lůžkové péče | 2019–2024 | Struktury / Financování |
| `OIS-11-27` | Produkce následné a dlouhodobé péče | 2019–2024 | Procesy / Nemocniční péče |
| `OIS-11-31` | Úhrady komunitní ošetřovatelské péče | 2022–2024 | Struktury / Financování |
| `OIS-11-33` | Produkce výkonů jednodenní péče | 2019–2024 | Procesy / Efektivita |
| `OIS-11-40` | Produkce lázní a ozdravoven | 2019–2024 | Procesy / Nemocniční péče |
| `OIS-11-06` | Centrové (nákladové) léky | 2022–2024 | Struktury / Financování |
| `OIS-11-47` | Struktura pojištěnců | 2010–2025 | **Již zpracováno** (`pojistenci-d5-*.json`) |

## Ověřený extrakt: přístrojové vybavení

List *Vývoj_v_ČR* sady `SSS-04-02` je **hotová národní časová řada** počtu přístrojů
a počtu na milion obyvatel pro 19 typů zdravotnické techniky, roky 2006–2024.
Extrahováno do
[`05_M1_Starter/ingest/nzip-extracts/sss-04-02-pristroje-vyvoj-cr.json`](../05_M1_Starter/ingest/nzip-extracts/sss-04-02-pristroje-vyvoj-cr.json).

**Hodnoty 2024 (na milion obyvatel):** CT 16,4 · MR 13,5 · PET 2,1 · lineární
urychlovače 5,1.

> ⚠️ **Nesrovnalost k ověření redakcí.** Stávající indikátor `ct_per_milion`
> v `data/indicators.json` uvádí pro rok 2024 hodnotu **28**, zatímco `SSS-04-02`
> dává **16,4** (179 přístrojů / 10,9 mil. obyvatel; odpovídá řádově i hodnotám
> OECD). `mri_per_milion` uvádí 12 vs. 13,5 v `SSS-04-02`. Doporučeno sjednotit
> definici a zdroj — indikátory zde **nebyly měněny** (změna čísel je dle
> redakčních pravidel blocking a vyžaduje ověření).

## Doporučené další kroky

1. Přidat fetcher `ingest/fetchers/nzip_dohodovaci_rizeni.js`, který dle katalogu
   stáhne nejnovější edice XLSX a uloží do `ingest/cache/`.
2. Pro sady se silnou řadou napsat transform → národní/krajský agregát → seed do
   `data/indicators.json` + metodická karta v `indicators/`.
3. Prioritně: aktualizovat `ct_per_milion` / `mri_per_milion` z `SSS-04-02`
   plnou řadou 2006–2024 a vyjasnit nesrovnalost hodnot.
4. Zvážit nové indikátory: PET na milion obyvatel, lineární urychlovače,
   průměrný plat lékaře/sestry, objem jednodenní péče.

## Stránky bez stažitelného souboru (jen interaktivní vizualizace)

`1909`, `1910`, `1911`, `1912` (výkony / HVLP / PZT v rámci v. z. p.),
`1914` (hospitalizace — kardiologie), `2074` (lůžkový fond), `2253` (migrace za
lůžkovou péčí). Data jsou dostupná pouze jako Tableau dashboard — bez přímého
.xlsx/.csv. Vhodné k opětovné kontrole, zda ÚZIS doplní stažitelný export.
