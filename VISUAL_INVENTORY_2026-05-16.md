# HSPA Monitor — Visual Inventory Audit

**Datum auditu:** 2026-05-16
**Scope:** 65 publikovaných + 38 drafts = 103 článků v `05_M1_Starter/`
**Metoda:** Read-only sken `clanek-*.html`. Pro každý článek extrahováno: word count (text mezi `<div class="article-body">` a `</article>`, HTML stripped) a 8 indikátorů přítomnosti vizuálních prvků.

**Definice indikátorů:**
- **TAB** = `<table>`, `article-data-table`, `ex-compare`, `cekani-table`, `cmp-result`, `hly-compare`, `sha-comp-grid`
- **CHART** = `article-bar-chart`, `ex-bars`, `sha-donut`, `vakc-gauge`, `waffle`, `kapitace-bar`, `sha-comp-bar`, `uh-bod-bars`, `<canvas>`, `cmp-funnel`
- **TIMELINE** = `class="timeline"`, `rpp-timeline`, `ex-cycle`, `timeline-item`, `timeline-year`
- **DIAG** = `article-flow`, `ephf-domain`, `ephf-pillar`, `cmp-stage`, inline `<svg>`
- **COUNTER** = `stat-num`, `num-big`, `big-number`, `hero-stat`, `key-figure`, `waffle-stat`, `ephf-*-num`, `cmp-stage-num`
- **WIDGET** = `<select>`, `onclick=`, `data-filter`, `dropdown`, `toggle`, `tabs`, `interactive`
- **EVBOX** = `article-evidence-box`, `article-databox-inline`, `article-callout`
- **XGRID** = ≥5 distinct internal `clanek-*.html` cross-links v article-body

**Souhrn pokrytí (103 článků):**

| Prvek | Počet článků s prvkem | % |
|---|---:|---:|
| TAB | 21 | 20 % |
| CHART | 7 | 7 % |
| TIMELINE | 2 | 2 % |
| DIAG | 5 | 5 % |
| COUNTER | 4 | 4 % |
| WIDGET | 0 | 0 % |
| EVBOX | 23 | 22 % |
| XGRID | 7 | 7 % |

**Distribuce `potreba_visual` skóre:** 0 = 13 článků (12 %), 1 = 24 (23 %), 2 = 15 (15 %), 3 = 51 (50 %).
**Bez jakéhokoli vizuálu:** 68 ze 103 (66 %).
**Dobře vybavené (≥3 prvků):** 9 ze 103 (9 %).

**Skórovací pravidlo `potreba_visual`** (deterministicky podle V = počet detekovaných prvků a wc = word count):
- wc < 800 → 0 (krátký explainer)
- wc < 1500: 0 viz → 1, jinak 0
- wc 1500–2499: 0 viz → 2, 1 viz → 1, jinak 0
- wc 2500–3999: 0 viz → 3, 1 viz → 2, 2 viz → 1, ≥3 → 0
- wc ≥ 4000: 0 viz → 3, 1 viz → 3, 2 viz → 2, ≥3 → 1

---

## Sekce 1 — Tabulka inventáře

`published`: 1 = `/05_M1_Starter/clanek-*.html`, 0 = `/05_M1_Starter/drafts/clanek-*.html`. `wc` = word count. `P` = potreba_visual.

| slug | pub | wc | TAB | CHART | TIME | DIAG | CTR | WID | EV | XG | P |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ai-act-zdravotnictvi-srpen-2026 | 1 | 4657 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| akutni-infarkt | 1 | 2614 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| alkohol-spotreba | 1 | 1269 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| ambulantni-kontakty | 1 | 1334 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| bmi-obezita | 1 | 1375 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| cekaci-doby-kycel | 1 | 2128 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| cekani-specialista | 1 | 1436 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| centralizace-chirurgie-2027 | 1 | 3252 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| cervix-hpv | 1 | 2056 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| cmp-iktova-centra | 1 | 2583 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| deficit-pojisteni-2026 | 1 | 4383 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 |
| deficit-vzp-2026 | 1 | 3492 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| detska-psychiatrie-krize | 1 | 3377 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| ehds-evropsky-prostor-zdravotni-data | 1 | 2997 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| ehealth | 1 | 1412 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| ezkarta-ehealth | 1 | 1779 | 0 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| financovani-segmenty-2026 | 1 | 2042 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| financovani-sha | 1 | 3655 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| hospitalizujeme-nejvic | 1 | 2287 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| hta-jca-eu-2026 | 1 | 4192 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| institut-verejneho-zdravi | 1 | 1232 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| kardiovaskularni-mortalita | 1 | 2227 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| koureni | 1 | 1558 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| kyberneticka-bezpecnost-zdravotnictvi-2026 | 1 | 6161 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| mamograf-rakovina-prsu | 1 | 1800 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| manifest-reforma-zdravotnictvi | 1 | 4260 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| nadeje-doziti-zdravi | 1 | 2021 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| narok-pojistence-1-co-to-je | 1 | 2986 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| narok-pojistence-2-demograficky-tlak | 1 | 2983 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| narok-pojistence-3-co-s-tim | 1 | 3155 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| nosokomialni-infekce | 1 | 2060 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| novela-elektronizace-2026 | 1 | 5475 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| novela-lps-pojistovny | 1 | 5102 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| novela-paliativni-pece | 1 | 3507 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| okresni-nemocnice-personalni-krize | 1 | 3637 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| onkologicky-koordinator-2026 | 1 | 4266 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| osetrovatelstvi-generacni-propast-2026 | 1 | 4494 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |
| platba-statu-statni-pojistenci | 1 | 5822 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| platba-z-kapsy | 1 | 2233 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| platba-za-vysledek-vzp | 1 | 5196 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| pm25-spinavy-vzduch | 1 | 1413 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| pohyb | 1 | 1348 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| polypragmazie-senioru | 1 | 3819 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| pracovni-sila | 1 | 2190 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| preventivni-prohlidka | 1 | 1585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| prezit-rakoviny | 1 | 1980 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| pyll | 1 | 2113 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| rakovina-tlusteho-streva | 1 | 1264 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| reforma-dlouhodobe-pece-2026 | 1 | 4773 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| reforma-pohotovosti-290-2025 | 1 | 1484 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| reforma-primarni-pece-2027 | 1 | 4676 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| reforma-psychiatrie-13-let | 1 | 1926 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| rezistence-antibiotik | 1 | 2073 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| screening-rakoviny-plic | 1 | 2045 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| sebevrazdy-dusevni-zdravi | 1 | 1275 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| socialne-zdravotni-pomezi-2026 | 1 | 4207 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| spotreba-antibiotik | 1 | 2133 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| stret-zajmu-vyziva-kojencu | 1 | 1939 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 0 |
| transplantace-darcovstvi-organu | 1 | 3273 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| uhradova-vyhlaska | 1 | 4386 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| vakcinace | 1 | 2003 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| vydaje-prevence | 1 | 4218 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| vydaje-zdravotnictvi | 1 | 2191 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| vyhnutelne-hospitalizace | 1 | 1769 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| vzacna-onemocneni-strategie-2035 | 1 | 3743 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| **— DRAFTS —** | | | | | | | | | | | |
| ai-act-zdravotnictvi-srpen-2026 | 0 | 3947 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| centralizace-onkochirurgie-2026 | 0 | 3755 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| cz-drg-balicek-2027 | 0 | 2066 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| dohodovaci-rizeni-2027-data | 0 | 4455 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |
| drg-reforma-2026 | 0 | 4884 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |
| indiko-kvalita-onkologie-regiony | 0 | 2689 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| interna-regionalni-nemocnice-starnuti | 0 | 3173 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| krajske-nemocnice-akciovky-2026 | 0 | 4730 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| kyberbezpecnost-zdravotnictvi | 0 | 3942 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| legislativni-newsletter-05-2026 | 0 | 2884 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| legislativni-priority-2026-q2 | 0 | 1690 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| novela-290-2025-prava-pacientu | 0 | 3451 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| novela-leciva-lpod-2026 | 0 | 3812 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| novela-zdravotnich-sluzeb-2026 | 0 | 4940 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| okresni-nemocnice-personalni-krize | 0 | 3637 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| onkologicky-koordinator-2026 | 0 | 3971 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| osetrovatelska-narocnost-cz-drg | 0 | 3165 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| osetrovatelstvi-generacni-propast-2026 | 0 | 4494 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |
| personalni-evidence-nrzp-smlouvy | 0 | 2696 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| platba-statu-statni-pojistenci | 0 | 5090 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| pldd-detska-primarni-pece | 0 | 4135 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |
| polypragmazie-senioru | 0 | 3819 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| porodnice-regiony | 0 | 2401 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| posudkova-sluzba-ipzs-2026 | 0 | 4721 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| prerozdeleni-pojistneho-tisk-70 | 0 | 3886 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| reforma-dlouhodobe-pece | 0 | 5179 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| reforma-intenzivni-pece-2026 | 0 | 3514 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| reforma-primarni-pece-2027 | 0 | 4699 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| reforma-stomatologie-3-amalgam | 0 | 3928 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| regionalni-predikce-socialne-zdravotni-pece | 0 | 3517 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| socialne-zdravotni-pomezi-38-2025 | 0 | 5048 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| specializacni-vzdelavani-lekaru-2026 | 0 | 4255 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| telemedicina-zakon-240-2024 | 0 | 4228 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| transplantace-darcovstvi-organu | 0 | 3273 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| vakcinace-lekarny-nelekari | 0 | 3940 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| vypadky-leciv | 0 | 3927 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| vzacna-onemocneni-strategie | 0 | 4688 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| zdravi-2035-strategicky-ramec | 0 | 4136 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |

---

## Sekce 2 — Top 15 kandidátů na obohacení

Řazeno podle `potreba_visual` desc + `word_count` desc. Z 51 článků s P=3.

**1. `clanek-kyberneticka-bezpecnost-zdravotnictvi-2026.html`** (pub, 6 161 slov). Data: zákon 264/2025 Sb. (NIS2), deadline 11/2026, lhůty 24 / 30 / 60 / 72 hod, 4,3 mld Kč investice, ransomware incidenty.
→ **TIMELINE** legislativní cesty 264/2025 → vyhlášky → implementace. **TAB** klasifikace subjektů NIS2 (Essential × Important, povinnosti). **DIAG** scénář útoku (ransomware → CT/lab/HIS → klinický dopad).

**2. `clanek-platba-statu-statni-pojistenci.html`** (pub, 5 822 slov). Data: 154,6 mld Kč ročně 2026, sazba 13,5 %, VZ 16 206 → 2 188 Kč/měsíc, ~5,9 mil. státních pojištěnců, tři epochy zmrazení 1992–2026.
→ **CHART** historie platby státu 1993–2026 s vyznačením epoch. **TAB** mezinárodní srovnání (CZ, SK, DE, NL). **DIAG** mechanika § 3c (VZ → sazba → platba → výnos).

**3. `clanek-novela-elektronizace-2026.html`** (pub, 5 475 slov). Data: eRecept 99 %, eNeschopenka, ePosudek, eŽádanka, eOčkovací průkaz, EHDS deadline 2033, harmonogram 18/24/36 měsíců.
→ **TIMELINE** roll-outu eHealth modulů 2018 → 2033. **DIAG** datový tok NCEZ ↔ ÚZIS ↔ pojišťovny ↔ poskytovatel. **TAB** přehled modulů (status, právní základ, gestor).

**4. `clanek-platba-za-vysledek-vzp.html`** (pub, 5 196 slov). Data: Duškova reforma, 12 % objemu k 2030, pilot 18 měsíc, paralely UK QOF, US HVBP.
→ **TIMELINE** roll-outu 2026 → 2030. **CHART** komparativní podíl P4P (CZ, UK, US, NL). **DIAG** výpočet bonusu/maluse.

**5. `clanek-novela-lps-pojistovny.html`** (pub, 5 102 slov). Data: 290/2025 Sb., 96 nemocnic, výkon 90 Kč → 9 600 Kč cíl, 200 tisíc kontaktů, 40/60 rozdělení odpovědnosti.
→ **TIMELINE** přechodu LPS kraje → pojišťovny 2025–2027. **TAB** RACI matrix (kraj × pojišťovna × poskytovatel). **CHART** geografická distribuce 96 LPS bodů.

**6. `clanek-socialne-zdravotni-pomezi-2026.html`** (pub, 4 207 slov). Data: 38/2025 Sb., 12 mld Kč, kompetence MZ × MPSV.
→ **DIAG** dvojkolejný systém (zdravotní × sociální). **TIMELINE** legislativy 2025–2029. **TAB** „kdo platí co" (LDN × pobytová sociální × home care).

**7. `clanek-reforma-dlouhodobe-pece-2026.html`** (pub, 4 773 slov). Data: demografie 2030/2040/2050, 1,4 % vs. 1,8 % HDP CZ vs. EU, 120 mld Kč.
→ **CHART** projekce poptávky 2025–2050 (počet 80+, závislých). **TAB** 4 mezinárodní LTC modely (DE, JP, NL, SE). **DIAG** financování ↔ poskytování ↔ monitoring.

**8. `clanek-reforma-primarni-pece-2027.html`** (pub, 4 676 slov). Data: kapitace 105/110/145 Kč, věková krize PLDD/VPL, 145 tis. registrovaných na praxi.
→ **CHART** schody kapitace podle věkové skupiny (replikace patternu `kapitace-stairs`). **TIMELINE** dohodovací řízení 2026 → vyhláška 2027. **TAB** P4P bonusy (indikátor → bonus → měření).

**9. `clanek-onkologicky-koordinator-2026.html`** (pub, 4 266 slov). Data: signální výkon 2026, lhůty 14/28/31/62 dnů, 4 modely navigace (US Freeman, UK MDT, NL pathways, DE Lotsen).
→ **TIMELINE** cesty pacienta (D0 → MDT → terapie). **TAB** 4 mezinárodní modely. **DIAG** KOC/ROS/NOD architektura.

**10. `clanek-manifest-reforma-zdravotnictvi.html`** (pub, 4 260 slov). Data: 13 oblastí reformy, indikátory (22,6 % kouření, 28 % obezita, 42 % prevence, 72 % screening).
→ **DIAG** mřížka 13 oblastí 4×4 (pattern `ephf-domain`). **XGRID** cross-link každá oblast → detail článku. **COUNTER** klíčové číslo pro každou oblast.

**11. `clanek-vydaje-prevence.html`** (pub, 4 218 slov). Data: 2,7 % vs. 3,4 % OECD, 40 mld Kč, účast 21/22/35/45 % podle programu.
→ **CHART** podíl prevence z celkových výdajů (CZ vs. OECD 2010–2024). **TAB** rozpad 40 mld na typy prevence. **CHART** waffle 2,7 % vs. cíl.

**12. `clanek-deficit-vzp-2026.html`** (pub, 3 492 slov). Data: −12,7 mld Kč 2026, 41 mld výdaje × 29 mld příjmy, rezervy 23 mld. Sourozenec `deficit-pojisteni-2026` má 4 prvky — twin „nahý".
→ **CHART** trajektorie rezerv 2022–2028 (replikace ze sourozence). **TAB** tři odhady deficitu (VZP × MZ × SZP). **DIAG** rovnice příjmy/výdaje/rezervy.

**13. `clanek-detska-psychiatrie-krize.html`** (pub, 3 377 slov). Data: 157 dětských psychiatrů, čekací doby měsíce, reforma 2013–2026.
→ **CHART** hustota psychiatrů po krajích. **CHART** věková pyramida oboru. **TIMELINE** reformy psychiatrie 2013 → 2026.

**14. `clanek-okresni-nemocnice-personalni-krize.html`** (pub, 3 637 slov; identický draft). Data: Pelhřimov, Znojmo case studies, počty lékařů × oddělení.
→ **TAB** sledovaná oddělení po nemocnicích. **CHART** geografická mapa rizikových nemocnic. **DIAG** poptávka ↔ kapacita ↔ dohoda.

**15. `clanek-vzacna-onemocneni-strategie-2035.html`** (pub, 3 743 slov; draft 4 688). Data: ~6 000 vzácných nemocí, ~500 000 pacientů CZ, strategie 2026–2035, referenční síť.
→ **TIMELINE** strategie 2026–2035. **TAB** referenční centra (název × lokalita × skupina). **CHART** waffle 500 tis. pacientů z 10,5 mil.

**Další kandidáti P=3 / ≥3 800 slov / 0 vizuálů (16–30):** `ai-act-zdravotnictvi-srpen-2026`, `hta-jca-eu-2026`, `polypragmazie-senioru`, `transplantace-darcovstvi-organu`, `centralizace-chirurgie-2027`, `osetrovatelstvi-generacni-propast-2026`, `novela-paliativni-pece` (pub); `krajske-nemocnice-akciovky-2026`, `posudkova-sluzba-ipzs-2026`, `socialne-zdravotni-pomezi-38-2025`, `novela-zdravotnich-sluzeb-2026`, `specializacni-vzdelavani-lekaru-2026`, `telemedicina-zakon-240-2024`, `zdravi-2035-strategicky-ramec`, `reforma-stomatologie-3-amalgam`, `prerozdeleni-pojistneho-tisk-70`, `vypadky-leciv`, `novela-leciva-lpod-2026` (drafts).

---

## Sekce 3 — Klastry článků

Klasifikace podle dominantního tématu (jeden článek → jeden klastr, hraniční případy přiřazeny podle gestora/legislativního rámce). Počty zahrnují unikátní slugy (publikovaná + draft verze stejného slugu počítány jako 1).

### A) Finanční (12 článků)
**Slugy:** `deficit-pojisteni-2026`, `deficit-vzp-2026`, `platba-statu-statni-pojistenci`, `platba-z-kapsy`, `platba-za-vysledek-vzp`, `vydaje-zdravotnictvi`, `vydaje-prevence`, `financovani-segmenty-2026`, `financovani-sha`, `uhradova-vyhlaska`, `dohodovaci-rizeni-2027-data`, `prerozdeleni-pojistneho-tisk-70`.
**Typický vhodný vizuál:** **CHART** stacked bar / waterfall pro rozpad výdajů, **TIMELINE** dohodovacího řízení / valorizace, **DIAG** flow peněz (kdo platí → pojišťovna → poskytovatel).
**Top 3 kandidáti na obohacení:** `platba-statu-statni-pojistenci` (P=3, 5 822 slov), `platba-za-vysledek-vzp` (P=3, 5 196 slov), `vydaje-prevence` (P=3, 4 218 slov).
**Dobře vybavený benchmark v klastru:** `deficit-pojisteni-2026` (4 prvků), `financovani-sha` (3 prvků), `vydaje-zdravotnictvi` (3 prvků) — jejich struktura je vhodný šablon pro twins.

### B) Legislativní (16 článků)
**Slugy:** `novela-elektronizace-2026`, `novela-lps-pojistovny`, `novela-paliativni-pece`, `novela-zdravotnich-sluzeb-2026` (draft), `novela-290-2025-prava-pacientu` (draft), `novela-leciva-lpod-2026` (draft), `reforma-pohotovosti-290-2025`, `socialne-zdravotni-pomezi-2026`, `socialne-zdravotni-pomezi-38-2025` (draft), `centralizace-chirurgie-2027`, `centralizace-onkochirurgie-2026` (draft), `legislativni-newsletter-05-2026` (draft), `legislativni-priority-2026-q2` (draft), `telemedicina-zakon-240-2024` (draft), `specializacni-vzdelavani-lekaru-2026` (draft), `krajske-nemocnice-akciovky-2026` (draft).
**Typický vhodný vizuál:** **TIMELINE** legislativního procesu (návrh → vláda → PS → Senát → účinnost), **TAB** „co mění" před/po, **DIAG** RACI gestorů.
**Top 3 kandidáti:** `novela-elektronizace-2026` (P=3, 5 475 slov), `novela-lps-pojistovny` (P=3, 5 102 slov), `socialne-zdravotni-pomezi-38-2025` (draft, P=3, 5 048 slov).
**Pozn.** Klastr má dnes 0 TIMELINE prvků — paradoxně téma s nejpřímější vizuální logikou (chronologie účinností).

### C) Demografický / dlouhodobá péče (8 článků)
**Slugy:** `reforma-dlouhodobe-pece-2026`, `reforma-dlouhodobe-pece` (draft), `osetrovatelstvi-generacni-propast-2026`, `pldd-detska-primarni-pece` (draft), `interna-regionalni-nemocnice-starnuti` (draft), `posudkova-sluzba-ipzs-2026` (draft), `polypragmazie-senioru`, `regionalni-predikce-socialne-zdravotni-pece` (draft).
**Typický vhodný vizuál:** **CHART** věková pyramida (poptávka), **CHART** věková pyramida (poskytovatelská strana — sestry, PLDD), **TAB** mezinárodní LTC modely.
**Top 3 kandidáti:** `reforma-dlouhodobe-pece` (draft, P=3, 5 179 slov), `reforma-dlouhodobe-pece-2026` (pub, P=3, 4 773 slov), `posudkova-sluzba-ipzs-2026` (draft, P=3, 4 721 slov).

### D) AMR / antibiotika / infekce (4 články)
**Slugy:** `rezistence-antibiotik`, `spotreba-antibiotik`, `nosokomialni-infekce`, `vakcinace`, `vakcinace-lekarny-nelekari` (draft).
**Typický vhodný vizuál:** **CHART** time-series (DDD/1000/den ČR vs. OECD), **CHART** gauge účast očkování vs. herd-immunity práh (existuje `vakc-gauge` v `vakcinace` — replikovat), **TAB** rezistence patogen × antibiotikum.
**Top 3 kandidáti:** `vakcinace-lekarny-nelekari` (draft, P=3, 3 940 slov), `rezistence-antibiotik` (pub, P=2, 2 073 slov), `nosokomialni-infekce` (pub, P=2, 2 060 slov).

### E) IP (intenzivní/akutní péče / kardio-stroke) (4 články)
**Slugy:** `akutni-infarkt`, `cmp-iktova-centra`, `kardiovaskularni-mortalita`, `reforma-intenzivni-pece-2026` (draft).
**Typický vhodný vizuál:** **TAB** výsledky CZ vs. OECD (30-day mortality, door-to-needle), **DIAG** síť iktových center na mapě, **CHART** trajektorie mortality.
**Top 3 kandidáti:** `kardiovaskularni-mortalita` (pub, P=2, 2 227 slov), `reforma-intenzivni-pece-2026` (draft, P=1, 3 514 slov — má 2 vizuály), `akutni-infarkt` (pub, P=3, 2 614 slov).
**Dobře vybavený benchmark:** `cmp-iktova-centra` (4 prvků) — vzor pro twins.

### F) CZ-DRG / úhrady (5 článků)
**Slugy:** `cz-drg-balicek-2027` (draft), `drg-reforma-2026` (draft), `osetrovatelska-narocnost-cz-drg` (draft), `uhradova-vyhlaska` (pub), `dohodovaci-rizeni-2027-data` (draft).
**Typický vhodný vizuál:** **DIAG** vzorec úhrady (case-mix → základní sazba → korekce), **TAB** scénáře úprav s dopadem na nemocnici, **CHART** simulace přerozdělení.
**Top 3 kandidáti:** `drg-reforma-2026` (draft, P=3, 4 884 slov), `dohodovaci-rizeni-2027-data` (draft, P=3, 4 455 slov), `osetrovatelska-narocnost-cz-drg` (draft, P=1, 3 165 slov — má 2 prvky).

### G) Klinický / onkologie a screening (9 článků)
**Slugy:** `mamograf-rakovina-prsu`, `cervix-hpv`, `screening-rakoviny-plic`, `rakovina-tlusteho-streva`, `prezit-rakoviny`, `onkologicky-koordinator-2026`, `centralizace-chirurgie-2027`, `indiko-kvalita-onkologie-regiony` (draft), `vzacna-onemocneni-strategie-2035`.
**Typický vhodný vizuál:** **CHART** účast ve screeningu × cílová hodnota (gauge nebo waffle), **TAB** 5-year survival po diagnózách (CZ vs. OECD), **TIMELINE** cesty pacienta od pozvánky po terapii.
**Top 3 kandidáti:** `onkologicky-koordinator-2026` (pub, P=3, 4 266 slov), `vzacna-onemocneni-strategie-2035` (pub, P=3, 3 743 slov), `centralizace-chirurgie-2027` (pub, P=3, 3 252 slov).

### H) Digitalizace / eHealth / AI (8 článků)
**Slugy:** `ehealth`, `ezkarta-ehealth`, `ehds-evropsky-prostor-zdravotni-data`, `novela-elektronizace-2026`, `telemedicina-zakon-240-2024` (draft), `ai-act-zdravotnictvi-srpen-2026`, `kyberneticka-bezpecnost-zdravotnictvi-2026` (+ `kyberbezpecnost-zdravotnictvi` draft).
**Typický vhodný vizuál:** **DIAG** datový tok / architektura systému, **TIMELINE** roll-outu modulu, **TAB** comparison platform/modulu.
**Top 3 kandidáti:** `kyberneticka-bezpecnost-zdravotnictvi-2026` (pub, P=3, 6 161 slov), `novela-elektronizace-2026` (pub, P=3, 5 475 slov), `ai-act-zdravotnictvi-srpen-2026` (pub, P=3, 4 657 slov).
**Dobře vybavený benchmark:** `ezkarta-ehealth` (3 prvků) — vzor pro twins.

### I) Pracovní síla / vzdělávání / kapacity (8 článků)
**Slugy:** `pracovni-sila`, `osetrovatelstvi-generacni-propast-2026`, `specializacni-vzdelavani-lekaru-2026` (draft), `personalni-evidence-nrzp-smlouvy` (draft), `okresni-nemocnice-personalni-krize`, `pldd-detska-primarni-pece` (draft), `reforma-primarni-pece-2027`, `vakcinace-lekarny-nelekari` (draft).
**Typický vhodný vizuál:** **CHART** věková pyramida oboru, **CHART** hustota poskytovatelů po krajích (mapa nebo bar), **TAB** specializace × stav rezidenčních míst.
**Top 3 kandidáti:** `osetrovatelstvi-generacni-propast-2026` (pub, P=3, 4 494 slov), `reforma-primarni-pece-2027` (pub, P=3, 4 676 slov), `specializacni-vzdelavani-lekaru-2026` (draft, P=3, 4 255 slov).

### J) Risk factors / determinanty zdraví (7 článků)
**Slugy:** `koureni`, `alkohol-spotreba`, `bmi-obezita`, `pohyb`, `pm25-spinavy-vzduch`, `preventivni-prohlidka`, `stret-zajmu-vyziva-kojencu`.
**Typický vhodný vizuál:** **CHART** CZ vs. OECD trajektorie (line), **CHART** waffle „X z 10 dospělých", **TAB** intervence v zemích s nejlepším výsledkem.
**Top 3 kandidáti:** `preventivni-prohlidka` (pub, P=2, 1 585 slov), `bmi-obezita` (pub, P=1, 1 375 slov), `pohyb` (pub, P=1, 1 348 slov) — klastr má relativně krátké texty; obohacení by mělo prioritu jen 1× vizuál.
**Dobře vybavený benchmark:** `stret-zajmu-vyziva-kojencu` (4 prvků).

### K) Outcomes / mortalita / nárok (11 článků)
**Slugy:** `nadeje-doziti-zdravi`, `pyll`, `sebevrazdy-dusevni-zdravi`, `vyhnutelne-hospitalizace`, `hospitalizujeme-nejvic`, `ambulantni-kontakty`, `cekani-specialista`, `cekaci-doby-kycel`, `narok-pojistence-1-co-to-je`, `narok-pojistence-2-demograficky-tlak`, `narok-pojistence-3-co-s-tim`.
**Poznámka:** Série Nárok pojištěnce je započítána jako 3 samostatné díly. Indikátor kardiovaskulární mortality přesunut do klastru E (kardio-stroke cluster) pro odstranění cross-cluster duplicity.
**Typický vhodný vizuál:** **CHART** time-series CZ vs. OECD, **TAB** výsledky podle diagnózy/regionu, **COUNTER** big number pro klíčovou hodnotu.
**Top 3 kandidáti:** `detska-psychiatrie-krize` (pub, P=3, 3 377 slov), `hospitalizujeme-nejvic` (pub, P=1 — má EVBOX), `cekaci-doby-kycel` (pub, P=1 — má TAB+EVBOX).
**Dobře vybavené benchmarky:** `narok-pojistence-1/2/3` (3 prvků), `vydaje-zdravotnictvi` (3 prvků).

### L) Ostatní (HTA, transplantace, manifest, IP zdraví, strategický rámec) (7 článků)
**Slugy:** `hta-jca-eu-2026`, `transplantace-darcovstvi-organu`, `manifest-reforma-zdravotnictvi`, `institut-verejneho-zdravi`, `reforma-psychiatrie-13-let`, `porodnice-regiony` (draft), `zdravi-2035-strategicky-ramec` (draft).
**Typický vhodný vizuál:** **TIMELINE** strategického rámce, **DIAG** institucionální mapa, **TAB** mezinárodní komparace.
**Top 3 kandidáti:** `hta-jca-eu-2026` (pub, P=3, 4 192 slov), `zdravi-2035-strategicky-ramec` (draft, P=3, 4 136 slov), `manifest-reforma-zdravotnictvi` (pub, P=3, 4 260 slov — má 13 sekcí, ideální pro grid 4×4).

---

## Strukturální observace

1. **Asymetrické vybavení.** 9 článků (9 %) má ≥3 prvků (`cmp-iktova-centra`, `deficit-pojisteni-2026`, `stret-zajmu-vyziva-kojencu`, série `narok-pojistence`, `ezkarta-ehealth`, `financovani-sha`, `vydaje-zdravotnictvi`). 68 článků (66 %) nemá žádný vizuální prvek mimo prózu.
2. **Sourozenecké páry pub × draft.** 10 slugů existuje v obou adresářích — typicky publikovaná verze má mírně více prvků než draft, nebo jsou identické. Příklady: `osetrovatelstvi-generacni-propast-2026`, `okresni-nemocnice-personalni-krize`, `polypragmazie-senioru`, `transplantace-darcovstvi-organu`, `platba-statu-statni-pojistenci`, `onkologicky-koordinator-2026`, `reforma-primarni-pece-2027`, `socialne-zdravotni-pomezi` (různé verze), `vzacna-onemocneni-strategie`, `kyberneticka-bezpecnost-zdravotnictvi-2026` / `kyberbezpecnost-zdravotnictvi`.
3. **Chybějící typ:** **WIDGET** se nevyskytuje v žádném ze 103 článků. Interaktivita je dnes nulová — i tam, kde by filter (region, věk, rok) měl smysl (např. `indiko-kvalita-onkologie-regiony`, `regionalni-predikce-socialne-zdravotni-pece`, `pracovni-sila`).
4. **Chybějící typ:** **TIMELINE** má pouze 2 články (`deficit-pojisteni-2026`, `reforma-psychiatrie-13-let`), přestože legislativní klastr (16 článků) je strukturálně chronologický.
5. **Reusable patterns už v kódu.** Existující CSS třídy jsou bohaté (`ex-bars`, `ex-cycle`, `ex-compare`, `vakc-gauge`, `sha-donut`, `waffle`, `kapitace-stairs`, `ephf-domain`, `cmp-stage`, `rpp-timeline`, `article-flow`) — obohacení nevyžaduje nové komponenty, ale aplikaci existujících.
6. **XGRID koreluje s editorialním pojetím série.** Trojice `narok-pojistence-1/2/3` má 7–14 interních linků; samostatné explainery typicky 0–2. `vydaje-zdravotnictvi` (12 linků) funguje jako hub.
7. **EVBOX (article-evidence-box) je nejrozšířenější rozšířený prvek** (23 článků), ale jeho přítomnost je často jen okrajová (samostatný callout box, ne strukturální vizuál). Pro skutečné obohacení je samotný EVBOX nedostatečný.

**Konec auditu.**
