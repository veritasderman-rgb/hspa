# Datový rámec — enterokoky-gentamicin-rezistence

Vše staženo a ověřeno **10. 9. 2026**. Nic nepřevzato z backlogu ani z předchozích
discovery reportů.

## Centrální KPI

- **Hlavní hodnota:** vysoká (high-level) rezistence *Enterococcus faecalis*
  ke gentamicinu v ČR = **32,4 %** (219 ze 675 invazivních izolátů), rok 2024.
- **Primární zdroj:** ECDC Surveillance Atlas of Infectious Diseases, dataset
  EARS-Net (`Dataset=27&HealthTopic=4`), measure `ENCFAE.GENTAHIGH.R.PROPORTION`
  (id 1146465), `.COUNT` (1146466), `.R.COUNT` (1146467), geoCode CZ, timeUnit Y.
  Endpoint `https://atlas.ecdc.europa.eu/public/AtlasService/rest/GetMeasureResultsForTimeUnitAndGeoRegion`.
  Staženo 10. 9. 2026.
- **Benchmark (ČR vs EU/EHP):** populačně vážený průměr EU/EHP **22,6 %**
  (n = 18 260), rozpětí zemí 4,8 – 49,2 %. Zdroj: ECDC, *Antimicrobial resistance
  in the EU/EEA (EARS-Net) — Annual Epidemiological Report for 2024*, Stockholm,
  tabulka 9b + doslovná věta v próze kapitoly *Enterococcus faecalis*.
- **Časový kontext:** vlna 2024 (data hlášená za rok 2024, zpráva vydána 2025).

## Sekundární hodnoty

Všechny za ČR, rok 2024, tentýž zdroj a totéž stažení (ECDC Atlas, geoCode CZ);
u každé ověřen podíl proti čitateli a jmenovateli:

| Druh | Skupina | Hodnota | R / N | kontrola |
|---|---|---|---|---|
| *E. faecalis* | aminopeniciliny | 0,3 % | 2 / 692 | 0,2890 % ✓ |
| *E. faecalis* | vankomycin | 0,3 % | 2 / 692 | 0,2890 % ✓ |
| *E. faecalis* | gentamicin (high-level) | 32,4 % | 219 / 675 | 32,4444 % ✓ |
| *E. faecium* | aminopeniciliny | 94,9 % | 394 / 415 | 94,9398 % ✓ |
| *E. faecium* | vankomycin (VRE) | 18,3 % | 76 / 415 | 18,3133 % ✓ |
| *E. faecium* | gentamicin (high-level) | 51,4 % | 208 / 405 | 51,3580 % ✓ |

Česká řada *E. faecalis* / gentamicin (high-level), % izolátů:
2019 **31,5** · 2020 **30,2** · 2021 **38,5** · 2022 **30,7** · 2023 **26,4** ·
2024 **32,4**. (Atlas, tentýž measure, staženo 10. 9. 2026.)

Unijní řada téže metriky (AER 2024, tab. 9b): 2020 **29,0** · 2021 **28,9** ·
2022 **25,2** · 2023 **24,3** · 2024 **22,6**; ECDC u ní uvádí statisticky
významný klesající trend.

Rozpad fenotypů *E. faecium* **za EU/EHP** (AER 2024, tabulka 16; n = 12 995
izolátů s kompletním vyšetřením citlivosti ke všem třem skupinám, tj. 50 %
z 26 111 hlášených):

- citlivé ke všem třem: 1 130 = **8,7 %**
- rezistence k jediné skupině: 4 297 = **33,1 %** (z toho samotné aminopeniciliny
  4 218 = 32,5 %)
- ke dvěma skupinám: 6 133 = **47,2 %** (aminopeniciliny + gentamicin 5 016 =
  38,6 %; aminopeniciliny + vankomycin 1 103 = 8,5 %)
- ke všem třem: 1 435 = **11,0 %**
- v próze: 91,3 % rezistentních aspoň k jedné skupině, 58,2 % ke dvěma a více
  (kontrola: 33,1 + 47,2 + 11,0 = 91,3 ✓; 47,2 + 11,0 = 58,2 ✓)

Kontext hlášení (AER 2024): 30 zemí hlásilo za 2024 **36 610** invazivních izolátů
*E. faecalis* a **26 111** izolátů *E. faecium* (+39,1 % proti 18 765 v roce 2020);
výsledek citlivosti ke gentamicinu mělo **18 260 (49,9 %)** izolátů *E. faecalis*,
k vankomycinu **25 678 (98,3 %)** izolátů *E. faecium*.

Reprezentativnost ČR (AER 2024, tab. 1): odhadované pokrytí populace **70 %**;
geografická, nemocniční i izolátová reprezentativnost shodně *High*; frekvence
hemokultur **23,4 setu na 1 000 pacientodnů** — šestá nejnižší z 26 zemí s
vykázaným údajem (medián 58,6; Dánsko 265,8; Španělsko 588,1).

Redakční dopočty (normální aproximace binomického podílu, uvedeno v textu):
95% CI pro ČR — *E. faecalis* gentamicin 28,9–36,0 %; *E. faecium* gentamicin
46,5–56,2 %; VRE 14,6–22,0 %; *E. faecium* aminopeniciliny 92,8–97,0 %.

## Metodika a definice (doslovně z primárních zdrojů)

**EUCAST, Breakpoint tables for interpretation of MICs and zone diameters,
v. 16.1, valid from 2026-06-24**, kapitola *Enterococcus* spp.:

- pozn. 1: „Enterococci are resistant to aminoglycosides when used in monotherapy.
  However, synergy with beta-lactams or glycopeptides is still likely if the
  isolate does not express an acquired aminoglycoside-modifying enzyme.“
- pozn. 2/A: „Gentamicin can be used to screen for the presence of
  aminoglycoside-modifying enzymes (high-level aminoglycoside resistance). …
  Positive test: Isolates with gentamicin MIC >128 mg/L or a zone diameter <8 mm
  denote presence of aminoglycoside-modifying enzymes. Combinations between
  penicillins or glycopeptides and aminoglycosides will not be synergistic,
  except streptomycin which must be tested separately if required (see note 3/B).“
- pozn. 3/B: „Isolates screening positive with gentamicin for
  aminoglycoside-modifying enzymes may still exhibit synergy with streptomycin.
  This can be screened for with streptomycin testing.“

**ECDC AER 2024**, tab. 2 — EARS-Net hodnotí u *E. faecalis* pouze
„High-level aminoglycoside resistance (Gentamicin)“, u *E. faecium*
„Aminopenicillins / High-level aminoglycoside resistance / Vancomycin“.
Publikovaný unijní průměr má ale v tab. 9b jen *E. faecalis*/gentamicin a
*E. faecium*/vankomycin.

**ECDC AER 2024**, kapitola *E. faecalis*: „However, it should be noted that for
each year more than one third of the countries reported that susceptibility to
gentamicin was tested for <90% of isolates.“

**ECDC AER 2024**, obecná metodika: EARS-Net zahrnuje výhradně invazivní izoláty —
„Only data from invasive (blood and cerebrospinal fluid) isolates are included in
EARS-Net.“

## Legislativa a institucionální rámec

- Česko se surveillance účastní **od roku 2000**, sledování *Enterococcus faecalis*
  a *E. faecium* bylo zahájeno **v roce 2001** (SZÚ, stránka EARS-Net;
  ověřeno 10. 9. 2026). Národním uzlem je **NRL pro antibiotika SZÚ**.
- Národní antibiotický program byl ustaven usnesením vlády ČR z 4. 5. 2009 č. 595;
  poslední akční plán zveřejněný koordinátorem je na období 2019–2022 (usnesení
  vlády z 28. 1. 2019 č. 75) — stav zjištěný a doložený v
  `clanek-amr-multirezistence-soubeh` (29. 8. 2026), v tomto článku se na něj
  jen odkazuje, nepřepočítává se.
- Doporučení Rady EU 2023/C 220/01 stanoví tři cíle do roku 2030 pro krevní
  infekce (MRSA, *E. coli* rezistentní k cefalosporinům 3. generace,
  karbapenem-rezistentní *K. pneumoniae*) — **enterokoky mezi nimi nejsou**.
  Zdroj a znění doložené v témže článku.

## Evidence (recenzovaná literatura)

| Tvrzení | Práce | Ověřeno |
|---|---|---|
| Ampicilin + ceftriaxon je stejně účinný jako ampicilin + gentamicin a lze ho použít **bez ohledu na high-level rezistenci k aminoglykosidům**; přerušení léčby kvůli nežádoucím účinkům 25 % (AG) vs 1 % (AC), nová renální insuficience 23 % vs 0 % | Fernández-Hidalgo N, Almirante B, Gavaldà J, et al. *Ampicillin plus ceftriaxone is as effective as ampicillin plus gentamicin for treating Enterococcus faecalis infective endocarditis.* Clin Infect Dis. 2013;56(9):1261–8. DOI 10.1093/cid/cit052. PMID 23392394. Multicentrická observační kohorta, 18 nemocnic (17 ES + 1 IT), AC n=159 vs AG n=87 | PubMed 10. 9. 2026; typ Comparative Study / Multicenter Study — ne komentář, ne retrakce |
| Metaanalýza: proti ceftriaxonu měl gentamicin srovnatelnou celkovou úmrtnost (RD −0,8 %; 95% CI −5,0 až 3,5), relaps (RD −0,1 %; −2,4 až 2,3) i selhání léčby (RD 1,1 %; −1,6 až 3,7), ale **vyšší podíl přerušení pro toxicitu (RD 26,3 %; 95% CI 19,8 až 32,7)**; 10 observačních studií, 911 pacientů, vysoké riziko zkreslení | Prosty C, Sorin M, Katergi K, et al. *Revisiting the Evidence Base That Informs the Use of Adjunctive Therapy for Enterococcus faecalis Endocarditis: A Systematic Review and Meta-Analysis.* Clin Infect Dis. 2024;79(5):1162–71. DOI 10.1093/cid/ciae379. PMID 39041860 | PubMed 10. 9. 2026; typ Systematic Review / Meta-Analysis |
| Metaanalýza: AC non-inferiorní vůči AG; nižší nefrotoxicita (OR 0,45; 95% CI 0,26–0,77) a nižší vysazení pro nežádoucí účinky (OR 0,11; 0,03–0,46). Abstrakt zároveň charakterizuje **tehdy platná** doporučení jako rovnocenná („equivalent class IB recommendation“) | Mirna M, Topf A, Schmutzler L, Hoppe UC, Lichtenauer M. *Time to abandon ampicillin plus gentamicin in favour of ampicillin plus ceftriaxone in Enterococcus faecalis infective endocarditis? A meta-analysis of comparative trials.* Clin Res Cardiol. 2021;111(10):1077–86. DOI 10.1007/s00392-021-01971-3. PMID 34751788 | PubMed 10. 9. 2026; typ Meta-Analysis |

**Consensus kontrola:** dotaz „ampicillin plus ceftriaxone versus ampicillin plus
gentamicin for *Enterococcus faecalis* infective endocarditis with high-level
aminoglycoside resistance“ → převaha evidence **souhlasí** (10 vrácených prací,
mezi nimi dvě metaanalýzy a několik kohort týmž směrem; žádná práce netvrdila
opak). Tvrzení tedy nestojí na jediné studii. Consensus je nástroj — citují se
nalezené práce.

**Nedostupný zdroj:** doporučené postupy ESC 2023 (Delgado V et al., Eur Heart J
2023;44(39):3948–4042, DOI 10.1093/eurheartj/ehad193, PMID 37622656) —
plný text z tohoto prostředí HTTP 403 (academic.oup.com i escardio.org),
abstrakt v PubMed není. **Z guideline se necituje nic.**

## Interní křížové odkazy

- Články: `clanek-amr-multirezistence-soubeh`, `clanek-rezistence-antibiotik-mapa`,
  `clanek-rezistence-antibiotik`, `clanek-nosokomialni-infekce`,
  `clanek-spotreba-antibiotik`, `clanek-esencialni-antiinfektiva`
- Indikátory: `rezistence_efaecalis_gentamicin`, `rezistence_efaecium_gentamicin`,
  `rezistence_efaecalis_vankomycin`, `rezistence_efaecalis_aminopeniciliny`,
  `rezistence_efaecium_aminopeniciliny`, `rezistence_vre`, `rezistence_mrsa`,
  `spotreba_antibiotik`, `infekce_nosokomialni`
