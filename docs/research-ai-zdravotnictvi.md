# Rešerše: AI ve zdravotnictví (podklad pro sérii 2 článků)

> Interní redakční podklad. Stav k **18. 6. 2026**. Klinická tvrzení mají PubMed/DOI, regulatorní a tržní fakta odkaz na zdroj.
> Důsledně oddělovat **PROKÁZÁNO** (evidence) od **SLIBOVÁNO/NEJISTÉ** (hype, preklinika, marketing).
> Série: **díl 1 = Vrstva 1 (uživatelská vstřícnost)**, **díl 2 = Vrstva 2 (diagnostika, léčba, výzkum)**.

## Hlavní teze

1. Zralost AI klesá od administrativy → diagnostiky → objevu léků. Nejdál je provozní AI; objev léků je téměř výhradně preklinický (k 2026 **žádný AI-navržený lék není schválen**).
2. Provozní AI nezkracuje čas vždy, ale konzistentně zlepšuje prožitek a snižuje vyhoření.
3. Diagnostická AI je z 99 % asistent, ne autonomní rozhodčí; většina nástrojů validovaná jen retrospektivně, RCT je málo.
4. AI antibiotika jsou reálný směr, ale „myší" — halicin, abaucin i třída proti MRSA fungují in vitro a u myší, žádné v klinickém testu.
5. Česko: od pilotů k běžnému provozu (67,6 % zařízení používá/testuje AI, radiologie 82,9 %), ale **rutinní úhrada z pojištění k pol. 2026 neexistuje** (VZP pilot od 7/2026).
6. Regulace dozrává: zdravotnická AI = „vysoce riziková" v EU AI Act, nad MDR/IVDR „dvojí zátěž"; termíny se posouvají (Digital Omnibus).

---

## VRSTVA 1 — Uživatelská vstřícnost

### 1.1 Ambient AI scribes (přepis konzultace do dokumentace)
- **PROKÁZÁNO:** Kaiser/TPMG — 7 260 lékařů, 2 576 627 konzultací (63 týdnů), ~15 791 ušetřených hodin; 84 % lepší interakce, 82 % spokojenost [1]. Yale/6 systémů (Abridge): vyhoření 51,9 %→38,8 %, OR 0,26 [3]. MGB+Emory: vyhoření −21,2 b. za 84 dní [4]. UCLA RCT (238 lékařů): Nabla −9,5 % času v záznamu (p=0,02), DAX nevýznamně (−1,7 %, p=0,66) [5,6]. Stanford DAX: zátěž −24,4, p<0,001 [7].
- **Adopce:** Abridge ~5,3 mld. USD, 200+ systémů; Nabla 85 000+ kliniků; Microsoft Dragon/DAX Copilot 600+ org [8,9,10].
- **NEJISTÉ:** „74 % méně vyhoření" = OR, ne absolutní pokles; úspora času nekonzistentní (v RCT u DAX nevyšla); studie krátké, self-report.
- **RIZIKA:** Whisper ~1 % přepisů obsahuje vymyšlené věty, ~40 % škodlivý obsah [11,12]; ChatGPT-4 z přepisů 23,6 chyb/případ, 86 % opomenutí [13]; NHS England 4/2025 vyžaduje safety officer + DPIA [14].

### 1.2 Recall / zvaní na prevenci / no-show predikce
- **PROKÁZÁNO:** pediatrický model 83 % záchyt no-show, <17 % planých [15]; Peru XGBoost AUC 0,72 [16]; Chile — predikce + telefonát −10,3 p.b. no-show [18]. AI pozvánka zvyšuje záměr na screening: +12,9 / +13,8 b. vs expert +7,5 (preprint) [22].
- **NEJISTÉ/ETIKA:** modely váží socioekonomický status; většina literatury měří přesnost predikce, ne reálný dopad na účast.

### 1.3 Generování zprávy / překlad nálezu / kódování
- **PROKÁZÁNO:** GPT-4 propouštěcí dopisy ≥ mladí lékaři v „poskytnutí informace" (4,32 vs 3,70, p=0,03), bez halucinací (jediný zdroj) [19]; zjednodušení radiologických zpráv z 10.–14. na 5.–8. třídu [20]; detekce chyb v onkologii Gemini 2.5 Pro 97,8 % vs lékaři 47,8 % [21].
- **VÝHRADA (závisí na kontextu):** u akutních propouštěcích zpráv GPT-4 **42 % halucinací, 47 % opomenutí** (preprint) — bez kontroly lékařem nepoužitelné.

### 1.4 Triáž a symptom checkery
- **NEJISTÉ (převažuje):** audit 23 checkerů — správná dg. první 34 %, triáž 57 % [23]; Ada v ED top-5 sens 70 %, 14 % „nebezpečných" triáží [24]; ChatGPT-3.5 41 % nebezpečných triáží [25]; Charité RCT (Ada) nulový efekt [26].
- **VAROVÁNÍ — Babylon Health:** „lepší než lékař" (81 % vs 72 %); Lancet 2018 „žádný přesvědčivý důkaz" [28]; valuace 4,2 mld. USD → krach 9/2023 [27].

---

## VRSTVA 2 — Diagnostika, léčba, výzkum

### 2.1 Zobrazovací diagnostika
- **MASAI (Švédsko) — jediný velký RCT mamografie:** bezpečnostní analýza (80 033 žen) detekce 6,1 vs 5,1/1000, falešná pozitivita 1,5 % obě, **čtecí zátěž −44,3 %** [29]; plná kohorta (105 934) 6,4 vs 5,0/1000 (poměr 1,29; p=0,0021) [30]; primární cíl (intervalové ca) non-inferiorní, **senzitivita 80,5 % vs 73,8 %** (p=0,031), specificita 98,5 % obě [31].
- **Diabetická retinopatie (IDx-DR):** první **autonomní** FDA AI (2018); sens 87,2 %, spec 90,7 % [32].
- **Patologie (Paige Prostate):** první FDA AI v patologii (2021); sens patologů 89,5 %→96,8 % [press].
- **Mrtvice (Viz.ai):** meta-analýza 15 595 pac., zkrácení časů ~31–40 min [press/meta].
- **TBC RTG:** WHO 2021 podmíněně doporučuje CAD (AUC ~0,90) [WHO].
- **FDA:** ~1 451 schválených AI/ML prostředků (12/2025), ~76 % radiologie.
- **RIZIKA:** dataset shift (nejhůře MRI) [33]; automation bias zhoršil radiology na všech úrovních [34]; většina nástrojů jen retrospektivně.

### 2.2 Klinická rozhodovací podpora (CDSS) a EKG
- **PROKÁZÁNO — AI-EKG (Mayo):** dysfunkce levé komory AUC 0,93, sens 86,3 % [35]; fibrilace síní ze sinusu AUC 0,87 [36].
- **VAROVÁNÍ — Epic Sepsis Model:** externí validace **AUC jen 0,63, nezachytil 67 % septických (1 709/2 552)**, alert u 18 % hospitalizací [37]. Marketingové AUC 0,76–0,83 se nepotvrdilo.

### 2.3 Objev léků, antibiotika, AMR
- **AMR měřítko:** 2019 **1,27 mil. úmrtí přímo přičitatelných**, 4,95 mil. asociovaných [38, WHO].
- **AlphaFold:** atomová přesnost predikce struktury; DB >200 mil. struktur; **Nobel za chemii 2024** (Hassabis, Jumper, Baker); AlphaFold3 (2024) [39, DB, Nobel].
- **Halicin (MIT):** sken >107 mil. molekul, nové antibiotikum in vitro + myši [40].
- **SLIBOVÁNO/NEJISTÉ:** žádný AI-navržený lék zatím schválen; nejdál rentosertib (Insilico) — pouze fáze 2 [Nat Med 2025]; Exscientia propouštění + akvizice Recursion. AI antibiotika preklinická: **abaucin** (A. baumannii, jen myši) [41]; **třída proti MRSA** (vysvětlitelná NN, 12 mil. predikcí, jen myši) [42].

---

## Průřezová témata

### Regulace
- **EU AI Act (2024/1689, účinný 1.8.2024):** zdrav. AI „vysoce riziková" přes MDR/IVDR (Annex I) + Annex III. Časová osa: zákazy 2/2025 → GPAI 8/2025 → Annex III 8/2026 → zdrav. prostředky 8/2027. **Digital Omnibus** (dohoda 5/2026, dosud nepřijatý) odsouvá: Annex III → 12/2027, zdrav. prostředky → 8/2028. MDCG 2025-6 (dvojí posouzení).
- **FDA:** ~1 451 AI/ML prostředků (12/2025), ~76 % radiologie; PCCP final guidance 12/2024.
- **WHO:** 6 principů (2021); guidance ke generativní AI / LMM (2024).

### Rizika / etika
- **Obermeyer, Science 2019:** algoritmus s náklady jako proxy potřeby → podhodnocoval černošské pacienty; náprava 17,7 %→46,5 %; ~200 mil. lidí/rok.
- **Automation bias** (EKG 57 %→48 %) [JAMIA 2012]; **dataset shift** [NEJM 2021]; **iluze vysvětlitelnosti** [Lancet Dig Health 2021]; **GDPR čl. 9** (zvláštní kategorie).
- **Odpovědnost:** směrnice o odpovědnosti za AI **stažena** (2/2025); platí jen revidovaná PLD 2024/2853 (software/AI; transpozice do 12/2026).

### Ekonomika (POZOR — projekce, ne fakta)
- Trh AI ve zdravotnictví 110–188 mld. USD do 2030 (CAGR ~37–39 %); McKinsey/Harvard 200–360 mld. USD ročních úspor v USA.

### Český kontext (reálné vs plánované)
- **Reálné:** eRecept (povinný od 2018, ~83 mil. receptů/rok); **Carebot** (RTG-AI, MDR IIa; dle MZ 16 030 snímků v 9 nemocnicích, 56 nově odhalených nádorů); **Kardi AI** (EKG/fibrilace, MDR IIa, ~30 pracovišť vč. FN Ostrava/Olomouc); **FN Motol** AI-MRI (~2× rychleji); **ÚZIS** AI projekt (onkoregistr + kódování příčin smrti, 25,4 mil. Kč, 2023–2026).
- **Strategie:** MZ ČR Výbor pro AI ve zdravotnictví (1/2025); národní průzkum 2/2026 (67,6 % / radiologie 82,9 %); NAIS 2030; eHealth strategie 2025–2035.
- **Úhrada:** k pol. 2026 žádná systémová úhrada; VZP metodika (4/2026), **pilot od 7/2026**.

### Tři redakční varování
1. Časová osa AI Act se mění (Omnibus) — původní termíny jako platné, nové jako dohodnuté-leč-nepřijaté.
2. Čísla nasazení (FDA 1 451; Carebot, Kardi) z trackerů/PR, často piloty.
3. Tržní čísla = projekce; v ČR AI z pojištění zatím hrazená není.

---

## Master seznam zdrojů (s DOI/PMID)

**Vrstva 1 — scribes:**
1. Tu SP et al. Ambient AI Scribes: Learnings after 1 Year and over 2.5 Million Uses. NEJM Catalyst 2025. DOI 10.1056/CAT.25.0040.
2. AMA. AI scribes save 15,000 hours. 2025.
3. Olson K et al. Ambient AI Scribes to Reduce Burnout. JAMA Netw Open 2025. DOI 10.1001/jamanetworkopen.2025.34976.
4. You JG et al. Ambient Documentation Technology & Burnout. JAMA Netw Open 2025;8(8):e2528056. PMID 40839265; DOI 10.1001/jamanetworkopen.2025.28056.
5. Lukac PJ et al. RCT of Two Ambient AI Scribes. medRxiv 2025. DOI 10.1101/2025.07.10.25331333.
6. Lukac PJ et al. Ambient AI Scribes: Randomized Trial. NEJM AI 2025;2(12). DOI 10.1056/aioa2501000.
7. Shah SJ et al. Ambient AI scribes: burnout & documentation burden. JAMIA 2025;32(2):375-380. PMID 39657021; DOI 10.1093/jamia/ocae295.
8. Fierce Healthcare. Abridge $300M Series E. 2025.
9. Nabla press (85 000+ clinicians). 2025.
10. Fierce Healthcare. Microsoft Dragon Copilot (600+ orgs). 2025.
11. Koenecke A et al. Careless Whisper: Speech-to-Text Hallucination Harms. ACM FAccT 2024. DOI 10.1145/3630106.3658996; arXiv:2402.08021.
12. Burke G, Schellmann H (AP/ABC). Whisper invents things no one said. 2024.
13. Kernberg A et al. ChatGPT-4 Structured Medical Notes from Audio. J Med Internet Res 2024;26:e54419. PMID 38648636; DOI 10.2196/54419.
14. NHS England. Guidance on AI-enabled ambient scribing. 4/2025.

**Vrstva 1 — pacientská administrativa:**
15. Liu D et al. ML predicting no-shows (pediatric). NPJ Digit Med 2022. PMID 35444260; DOI 10.1038/s41746-022-00594-w.
16. Reategui-Rivera CM et al. ML No-Show Telemedicine. Telemed Rep 2025. PMID 40630810; DOI 10.1089/tmr.2025.0009.
17. Alabdulkarim Y et al. No-shows dental. PeerJ Comput Sci 2022. PMID 36426240; DOI 10.7717/peerj-cs.1147.
18. Dunstan J et al. Predicting no-shows pediatric hospital Chile. Health Care Manag Sci 2023. PMID 36707485; DOI 10.1007/s10729-022-09626-z.
19. JMIR 2024;e57721. Discharge Letters: LLM vs Junior Clinicians (jediný zdroj).
20. Naidu SU et al. LLMs for Radiology Report Simplification. Acad Radiol 2026. PMID 41486037; DOI 10.1016/j.acra.2025.12.008.
21. May P et al. AI-Assisted Error Detection (oncology). JCO Clin Cancer Inform 2026. PMID 41494139; DOI 10.1200/CCI-25-00194.
22. Konda S et al. Static vs Conversational AI on CRC Screening Intent: RCT. arXiv 2507.08211 (preprint).
23. Semigran HL et al. Symptom checkers audit. BMJ 2015. PMID 26157077; DOI 10.1136/bmj.h3480.
24. Fraser HSF et al. Symptom Checker in ED (Ada). JMIR Mhealth Uhealth 2022. PMID 36121688; DOI 10.2196/38364.
25. Fraser H et al. Ada, WebMD, ChatGPT, Physicians in ED. JMIR 2023. PMID 37788063; DOI 10.2196/49995.
26. Schmieding ML et al. Symptom Checker App RCT. J Med Internet Res 2025. PMID 40173434; DOI 10.2196/64028.
27. Sifted. The rise and fall of Babylon. 2023.
28. Fraser H, Coiera E, Wong D. Safety of patient-facing digital symptom checkers. Lancet 2018.

**Vrstva 2 — zobrazování:**
29. Lång K et al. AI-supported screen reading vs double reading (MASAI safety). Lancet Oncol 2023;24(8):936-944. PMID 37541274; DOI 10.1016/S1470-2045(23)00298-X.
30. Hernström V et al. MASAI screening performance. Lancet Digit Health 2025;7(3):e175-e183. PMID 39904652; DOI 10.1016/S2589-7500(24)00267-X.
31. Gommers J et al. MASAI interval cancer/sensitivity/specificity. Lancet 2026;407(10527):505-514. PMID 41620232; DOI 10.1016/S0140-6736(25)02464-X.
32. Abràmoff MD et al. Pivotal trial autonomous AI diabetic retinopathy. npj Digit Med 2018;1:39. PMID 31304320; DOI 10.1038/s41746-018-0040-6.
33. Yang Y et al. Limits of fair medical imaging AI generalization. Nat Med 2024;30(10):2838-2848. PMID 38942996; DOI 10.1038/s41591-024-03113-4.
34. Dratsch T et al. Automation Bias in Mammography. Radiology 2023. PMID 37129490; DOI 10.1148/radiol.222176.
(Paige: Business Wire 2021 FDA De Novo DEN200080; MedTech Dive study. Viz.ai: Transl Stroke Res 2025 meta, PMC12596299. TBC: WHO 2021; PLOS Digit Health CAD4TB/qXR. FDA: IntuitionLabs tracker 2025.)

**Vrstva 2 — CDSS / léky / AMR:**
35. Attia ZI et al. AI-ECG cardiac contractile dysfunction. Nat Med 2019;25(1):70-74. PMID 30617318; DOI 10.1038/s41591-018-0240-2.
36. Attia ZI et al. AI-ECG atrial fibrillation in sinus rhythm. Lancet 2019;394(10201):861-867. PMID 31378392; DOI 10.1016/S0140-6736(19)31721-0.
37. Wong A et al. External Validation of Epic Sepsis Model. JAMA Intern Med 2021;181(8):1065-1070. PMID 34152373; DOI 10.1001/jamainternmed.2021.2626.
38. Antimicrobial Resistance Collaborators (Murray CJL et al.). Global burden of bacterial AMR 2019. Lancet 2022;399(10325):629-655. PMID 35065702; DOI 10.1016/S0140-6736(21)02724-0.
39. Jumper J et al. Highly accurate protein structure prediction with AlphaFold. Nature 2021;596:583-589. PMID 34265844; DOI 10.1038/s41586-021-03819-2.
40. Stokes JM et al. A Deep Learning Approach to Antibiotic Discovery (halicin). Cell 2020;180(4):688-702. PMID 32084340; DOI 10.1016/j.cell.2020.01.021.
41. Liu G et al. Deep learning-guided discovery of antibiotic targeting A. baumannii (abaucin). Nat Chem Biol 2023;19(11):1342-1350. PMID 37231267; DOI 10.1038/s41589-023-01349-8.
42. Wong F et al. Discovery of a structural class of antibiotics with explainable deep learning (anti-MRSA). Nature 2023;626:177-185. PMID 38123686; DOI 10.1038/s41586-023-06887-8.

**Regulace / etika / ekonomika / ČR:** EU AI Act 2024/1689 (EUR-Lex); EC AI Act timeline; MDCG 2025-6; Council Digital Omnibus 5/2026; FDA AI device list; WHO 2021 principy + 2024 LMM; Obermeyer Z et al. Science 2019;366:447-453 (PMID 31649194; DOI 10.1126/science.aax2342); Goddard K et al. JAMIA 2012 (PMID 21685142); Finlayson SG et al. NEJM 2021 (DOI 10.1056/NEJMc2104626); Ghassemi M et al. Lancet Digit Health 2021; GDPR čl. 9; PLD 2024/2853. ČR: MZ ČR eHealth strategie 2025–2035; NCEZ Výbor pro AI (1/2025); MZ průzkum 2/2026; MPO NAIS 2030; SÚKL eRecept; ÚZIS AI projekt; Carebot; Kardi AI; VZP úhradová metodika 4/2026.

---

## Návrh struktury článků

- **Díl 1 (`clanek-ai-zdravotnictvi-1-vstricnost.html`):** scribes → recall/zvaní → sumarizace/překlad → triáž (+ Babylon). Teze: „největší přínos AI dnes není diagnóza, ale vrácený čas a méně vyhoření." Indikátory: `ehealth_adoption`, `screening_mamograficky`, `screening_kolorektalni`, `screening_cervix`.
- **Díl 2 (`clanek-ai-zdravotnictvi-2-lecba.html`):** mamografie MASAI → retinopatie/patologie/mrtvice → EKG + Epic sepse (varování) → AlphaFold + antibiotika/AMR. Teze: „v léčbě asistent, v objevu léků zatím slib; oddělme prokázané od myší." Indikátory: `screening_mamograficky`, `prezit_karcinom_prsu_5let`, `mortalita_inhosp_cmp`, `rezistence_mrsa`, `rezistence_acinetobacter_karbapenem`, `spotreba_antibiotik`, `prevalence_diabetu`.
