# Datový rámec — regionalni-nuzky-nadeje-doziti

Všechna čísla ověřena ŽIVĚ z ČSÚ open-data API (data.csu.gov.cz), dotazy 2026-08-04.

## Centrální KPI
- **3,8 roku** — rozdíl naděje dožití mužů při narození mezi nejlepším a nejhorším krajem
  (Praha 79,22 vs Ústecký kraj 75,39; dvouletý průměr 2024–2025)
- Primární zdroj: ČSÚ — Úmrtnostní tabulky za kraje, sada OBY04BK, výběr OBY04BKT01,
  API `data.csu.gov.cz/api/dotaz/v1/data/vybery/OBY04BKT01`, staženo 2026-08-04
- Ženy: rozpětí 3,5 roku (Praha 84,56 vs Ústecký 81,01)
- Časový kontext: 2letý průměr 2024–2025 (ČSÚ krajské tabulky publikuje jako 2leté průměry)

## Sekundární hodnoty
1. **ČR celkem 2025 (jednoletá tabulka)**: muži 77,49, ženy 83,19 — OBY04BCRT01, 2026-08-04
2. **Okresní extrémy (5letý ⌀ 2021–2025, OBY04BOT01)**: muži Most 73,06 vs Praha-západ 78,52
   (rozdíl 5,46 roku ≈ 5,5); ženy Most 79,52 vs Praha 83,80 (4,28 roku). Karviná 73,24,
   Jeseník 73,65, Chomutov 73,76 (muži, dno); Děčín 80,13, Sokolov 80,16, Teplice 80,18 (ženy, dno)
3. **Dekádní trend (OBY04BKT01, 2014–2015 vs 2024–2025)**: rozpětí krajů muži 3,75 → 3,83
   (stagnace), ženy 2,87 → 3,54 (rozevření o ~0,7 roku). Ústecký muži 73,79 → 75,39 (+1,60);
   Praha muži 77,53 → 79,22 (+1,69). Ženy Praha 82,40 → 84,56 (+2,16), Ústecký 79,69 → 81,01 (+1,32)
4. **Čistý disponibilní důchod domácností na obyvatele 2024 (WNUC04T01, regionální účty)**:
   ČR 399 747 Kč; Praha 528 267; Středočeský 431 292; dno: Ústecký 348 560, Karlovarský 352 746,
   Moravskoslezský 356 179, Olomoucký 356 687
5. **Shoda pořadí**: čtyři kraje s nejnižším disponibilním důchodem 2024 (Ústecký, Karlovarský,
   Moravskoslezský, Olomoucký) = čtyři kraje s nejkratší nadějí dožití mužů 2024–2025
   (Ústecký 75,39, Moravskoslezský 75,81, Karlovarský 75,97, Olomoucký 76,82)
6. **Kontrapříklad**: Kraj Vysočina — disponibilní důchod pod ČR průměrem (389 388 Kč, 5. nejnižší
   pozice odzadu ne — přesně: 10. odspodu), ale 3. nejdelší život mužů (77,92)

## Legislativa
— (nerelevantní pro tento článek; zdravotně-politický rámec: HSPA, nerovnosti ve zdraví)

## Mezinárodní kontext
- Nepoužíváme mezinárodní krajská srovnání (jiné metodiky NUTS-3 life tables napříč zeměmi);
  článek zůstává u ČSÚ dat. Methodology caveat: krajská čísla = 2leté průměry, okresní = 5leté
  průměry, ČR = jednoletá tabulka → hodnoty nejsou přímo směšovatelné, v textu přiznáno.

## Interní křížové odkazy
- Články: clanek-nadeje-doziti-vzdelani.html (13 let za diplom — vzdělanostní gradient),
  clanek-nadeje-doziti-zdravi.html (roky ve zdraví), clanek-plodnost-mladistvych.html
  (mapa chudoby), kraje.html (krajský dashboard s mapou)
- Indikátory: nadeje_doziti_total, nadeje_doziti_zeny, nadeje_doziti_vzdelani_gap_muzi,
  ohrozeni_chudobou, prijem_disponibilni
