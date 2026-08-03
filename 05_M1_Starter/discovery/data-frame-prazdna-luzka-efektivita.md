# Datový rámec — prazdna-luzka-efektivita

Všechna čísla ověřena přímo ze zdrojových xlsx souborů ÚZIS/NZIP (staženo a přečteno 3. 8. 2026).

## Centrální KPI
- **Obložnost standardních akutních lůžek ČR 2024 = 56,0 %** (přesně 0,55974).
- Primární zdroj: ÚZIS — NRHZS, datový souhrn *Obložnost lůžek* SSS-05-03, verze 2025-01, stav k 31. 12. 2024, zpracováno 12. 8. 2025. xlsx: <https://www.nzip.cz/data/luzkovy-fond/datove-souhrny/Datovy-souhrn-SSS-05-03-luzkovy-fond-obloznost-2025-01.xlsx> · landing: <https://www.nzip.cz/data/1780-luzkovy-fond-obloznost-datovy-souhrn>.
- Časový kontext: rok 2024 (poslední uzavřený rok); trend 2010–2024 v souboru.

## Sekundární hodnoty (ověřené)
- **Intenzivní lůžka (JIP+ARO) obložnost 2024 = 62,0 %** (0,61992). Stejný zdroj (řádek „Standartní intenzivní lůžka / Celkem").
- **Následná lůžka obložnost 2024 = 84,2 %** (0,84162). Stejný zdroj — kontrast: akutní kapacita poloprázdná, následná téměř plná.
- **Počet lůžek 2024** (NRHZS kapacity SSS-05-02, stav k 31. 12. 2024): standardní akutní (STAN) **42 309**, intenzivní (JIP) **5 727**. xlsx: <https://www.nzip.cz/data/luzkovy-fond/datove-souhrny/Datovy-souhrn-SSS-05-02-luzkovy-fond-kapacity-2025-01.xlsx> · landing: <https://www.nzip.cz/data/1779-luzkovy-fond-kapacity-datovy-souhrn>.
- **Ekvivalent průměrně prázdných akutních lůžek** = 42 309 × (1 − 0,560) ≈ **18 600** (transparentní odvození: lůžka × podíl nevyužití).
- **Nevyužité ošetřovací dny intenzivní péče / rok** = 5 727 × 365 × (1 − 0,6199) ≈ **794 500** (odvození dle vzorce obložnosti ÚZIS: OD = lůžka × 365).
- **Trend obložnosti STAN**: ~65 % (2010–2015) → propad na **52,7 %** v 2020 (covid) → 56 % (2024) — plné oživení nenastalo.
- **Akutní lůžka na 1 000 obyvatel: ČR 4,0 vs OECD 3,5** (indikátor `postele_akutni_per_1000`, origin: live, OECD Health Statistics, curative care beds, ref. 2023).
- **Kontext interna** (nejobsazenější obor lůžky): ÚZIS 2023 — 8 807 lůžek, 2 110 594 ošetřovacích dnů → obložnost ≈ 66 % (odvození; obor vnitřní lékařství). Sekundární souhrn efektivnizdravotnictvi.cz cituje ÚZIS; ponecháno jen jako kontext, ne centrální claim.

## Metodická výhrada (POVINNÁ v článku)
Obložnost ÚZIS = realizované ošetřovací dny / (nasmlouvaná lůžka k 31. 12. × 365). Počet lůžek je brán ke konci roku → při redukci lůžek během roku může obložnost přesáhnout 100 %; u JIP navíc lze na jednom lůžku vystřídat víc pacientů za den. Proto se „prázdná lůžka" a „nevyužité ošetřovací dny" interpretují jako **řádový průměr rezervy**, ne jako přesný počet fyzicky prázdných postelí v každém okamžiku. Analýza vychází z lůžek prioritně nasmlouvaných s VZP.

## Mezinárodní kontext
- OECD *Czechia Country Health Profile 2025* (září 2025): nemocničních lůžek 6,4/1 000 (vč. následných a psychiatrických), obsazenost cca 62 % (2023), discharges ~11 % pod pre-pandemickou úrovní. Konzistentní s domácím obrazem nadkapacity.
- OECD průměr obložnosti akutních lůžek se dlouhodobě pohybuje kolem ~70 % (cíl pro „uvolnění" kapacity dle domácích analýz).

## Interní křížové odkazy
- Související články: `clanek-hospitalizujeme-nejvic.html` (míra hospitalizací + počty lůžek), `clanek-luzka-dlouhodobe-pece.html` (nedostatek následných lůžek — druhá strana téže mince), `clanek-vyhnutelne-hospitalizace.html` (ACSC).
- Související indikátory: `obloznost_intenzivni_pece_pct`, `obloznost_interna_standard_pct`, `nevyuzite_osetrovaci_dny_ip`, `postele_akutni_per_1000`.
