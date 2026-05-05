# Inventář strategií zdravotnictví ČR a kontextu

**Účel:** výchozí bod pro M-STR-2 (datový model `data/strategies.json`).
**Stav:** verze 1.0 — květen 2026.
**Pokrytí:** 50+ strategických dokumentů napříč 5 úrovněmi (národní, sektorové, instituce, EU, globální).
**Stav verifikace:** záznamy v tomto markdown dokumentu **nemají** pole `verified_at` — jejich URL byly ověřeny v rámci jednorázové rešerše M-STR-1 (květen 2026). V M-STR-2 (převod do `data/strategies.json`) se každé položce doplní pole `verified_at` (ISO timestamp) a `verification_status` (`ok` / `needs_verification` / `broken`), aby cron-validátor mohl spustit periodickou re-verifikaci přes HTTP HEAD/GET.

---

## 1 · Národní strategie ČR (úroveň 1)

### 1.1 · Strategický rámec rozvoje péče o zdraví v ČR do roku 2035 ("Zdraví 2035")

- **ID návrh:** `zdravi_2035`
- **Garant:** MZČR (Ministerstvo zdravotnictví ČR)
- **Status:** ✅ platná (schváleno vládou 12.11.2025, usnesení č. 862/2025)
- **Horizont:** 2025–2035
- **Hlavní web:** https://mzd.gov.cz/zdravi-2035/
- **PDF:** https://mzd.gov.cz/wp-content/uploads/2025/12/Strategicky-ramec-rozvoje-pece-o-zdravi-v-Ceske-republice-do-roku-2035.pdf
- **Implementační plány:** 11 plánů (SC 3.1 nemá vlastní plán)
- **Vývoj:** Zdraví 2030 (2019/2020) → COVID aktualizace (2020) → Zdraví 2035 (2025, 12 specifických cílů)
- **Topics:** `framework`, `public_health`, `prevention`, `equity`, `quality`, `workforce`
- **TL;DR (veřejnost):** Hlavní plán, jak má být Česko v roce 2035 zdravější — dostupná péče pro všechny bez ohledu na region a větší zapojení občanů do péče o sebe sama.
- **TL;DR (odborník):** Aktualizace Zdraví 2030, prolongace do 2035. 12 specifických cílů (rozšířeno z původních 7), 11 implementačních plánů. Schváleno vládou 12.11.2025 usnesením č. 862/2025.
- **TL;DR (politik):** Klíčový koncepční dokument MZČR. Implementace přes 11 plánů s rozpočty a harmonogramem. Garant: MZČR. Provazuje se s Zdravím 2030, OECD HSPA Rámcem, eHealth strategií 2025–2035, NOP 2030.
- **linked_indicators (návrh):** většina HSPA indikátorů, especially `nadeje_doziti_total`, `kuractvi_denni`, `obezita_prevalence`, `vakcinace_chripka_65`

### 1.2 · Strategický rámec Zdraví 2030

- **ID návrh:** `zdravi_2030`
- **Garant:** MZČR
- **Status:** ⚠️ Nahrazeno aktualizací Zdraví 2035 (2025), formálně zůstává platné do 2030, prakticky překryto
- **Horizont:** 2020–2030
- **Hlavní web:** https://mzd.gov.cz/finalni-dokument-strategickeho-ramce-rozvoje-pece-o-zdravi-v-ceske-republice-do-roku-2030-a-jeho-implementacni-plany/
- **Dedikovaný portál:** https://zdravi2030.mzcr.cz/
- **PDF:** https://zdravi2030.mzcr.cz/zdravi-2030-strategicky-ramec.pdf
- **Schváleno:** Vláda ČR, 13.7.2020 (implementační plány 11.1.2021)
- **Cíle:** 3 strategické (zdravotní stav populace / optimalizace systému / podpora výzkumu) → 7 specifických
- **Topics:** `framework`, `public_health`, `prevention`

### 1.3 · Národní strategie elektronického zdravotnictví ČR 2025–2035

- **ID návrh:** `ehealth_2025_2035`
- **Garant:** MZČR + NCEZ (Národní centrum elektronického zdravotnictví)
- **Status:** ✅ platná (2025)
- **Horizont:** 2025–2035
- **Hlavní web:** https://ncez.mzcr.cz/cs/narodni-strategie-elektronickeho-zdravotnictvi/narodni-strategie-elektronickeho-zdravotnictvi
- **PDF:** https://mzd.gov.cz/wp-content/uploads/2025/10/MZ_strategie_EZ_2025-2035.pdf
- **Tisková zpráva:** https://mzd.gov.cz/tiskove-centrum-mz/narodni-strategie-elektronickeho-zdravotnictvi-cr-2025-2035-prinese-moderni-propojeny-a-bezpecny-e-health-system/
- **Účast:** 190+ expertů ze 71 organizací
- **Cíle:** 40 cílů v 5 kategoriích, vč. EZKarta, Národní elektronický zdravotnický portál, digital health diary
- **Vazba:** EU EHDS (regulace 2025/327)
- **Topics:** `digital_health`, `interoperability`, `data_protection`
- **TL;DR (veřejnost):** Plán, jak budou Češi v roce 2035 mít přístup ke svým zdravotním datům přes mobil (EZKarta) a jak budou data lépe sdílena mezi lékaři.
- **linked_indicators (návrh):** `ehealth_adoption`

### 1.4 · OECD HSPA Rámec pro ČR

- **ID návrh:** `oecd_hspa_cz`
- **Garant:** OECD + MZČR + Evropská komise
- **Status:** ✅ publikováno (květen 2023), v fázi institucionalizace
- **Hlavní web:** https://www.oecd.org/en/publications/health-system-performance-assessment-framework-for-the-czech-republic_5d59b667-en.html
- **PDF:** https://www.oecd.org/content/dam/oecd/en/publications/reports/2023/05/health-system-performance-assessment-framework-for-the-czech-republic_70b1f068/5d59b667-en.pdf
- **Účel:** rámec pro hodnocení výkonnosti zdravotního systému, 122 indikátorů
- **Souvislost:** přímo motivuje projekt Zdravé Česko (toto je framework, který následujeme)
- **Topics:** `hspa_framework`, `indicators`, `monitoring`
- **TL;DR (veřejnost):** Mezinárodní žebříček, jak měřit, jestli zdravotnictví funguje. ČR ho přijala jako svůj systém hodnocení.
- **linked_indicators:** všechny

### 1.5 · Národní onkologický plán ČR 2030

- **ID návrh:** `narodni_onkologicky_plan_2030`
- **Garant:** MZČR
- **Status:** ✅ platná (vláda 22.6.2022)
- **Horizont:** 2022–2030
- **Hlavní web:** https://mzd.gov.cz/narodni-onkologicky-plan-cr-2030/
- **PDF:** https://mzd.gov.cz/wp-content/uploads/2022/06/Narodni-onkologicky-plan-Ceske-republiky-2030.pdf
- **Akční plán implementace 2025–2027:** https://mzd.gov.cz/akcni-plan-implementace-narodniho-onkologickeho-planu-2025-2027/
- **Vazba:** Europe's Beating Cancer Plan
- **Financování:** Národní plán obnovy ~15 mld. Kč pro zdravotnictví
- **Topics:** `cancer`, `screening`, `treatment`, `quality_of_life`
- **linked_indicators (návrh):** `screening_kolorektalni`, `screening_mamograficky`, `screening_cervix`, `mortalita_onkologicka`

### 1.6 · Národní kardiovaskulární plán ČR 2025–2035

- **ID návrh:** `narodni_kvplan_2035`
- **Garant:** MZČR + Česká kardiologická společnost
- **Status:** ✅ platná (vláda prosinec 2024)
- **Horizont:** 2025–2035
- **Hlavní web:** https://mzd.gov.cz/narodni-kardiovaskularni-plan-cr-na-obdobi-2025-2035/
- **PDF (v.4.0):** https://mzd.gov.cz/wp-content/uploads/2025/01/Narodni-kardiovaskularni-plan-CR-na-obdobi-2025-2035.pdf
- **Předchůdce:** Národní kardiovaskulární program 2013
- **Klíčové novinky:** screening výdutě břišní aorty, program „Buď Fit 24" (prevence dětské obezity)
- **Topics:** `cardiovascular`, `prevention`, `screening`
- **linked_indicators (návrh):** `mortalita_kardiovaskularni`, `mortalita_inhosp_ami`, `mortalita_inhosp_cmp`, `kontrola_hypertenze`, `obezita_prevalence`

### 1.7 · Strategie reformy psychiatrické péče → Reforma péče o duševní zdraví

- **ID návrh:** `reforma_dusevni_zdravi`
- **Garant:** MZČR + Národní rada pro duševní zdraví + NIVZD
- **Status:** ⚠️ částečná implementace (kritika v 2024 — „reforma se zmařila")
- **Schváleno:** ministr zdravotnictví 7.10.2013
- **Hlavní web:** https://www.reformapsychiatrie.cz/
- **PDF:** https://www.reformapsychiatrie.cz/sites/default/files/2021-03/Strategie%20reformy%20psychiatrick%C3%A9%20p%C3%A9%C4%8De.pdf
- **Harmonogram:** https://vlada.gov.cz/assets/ppov/rlp/dokumenty/zpravy-plneni-mezin-umluv/Strategie-reformy-psychiatricke-pece-a-jeji-harmonogram.pdf
- **Klíčové prvky:** Centra duševního zdraví (komunitní multidisciplinární týmy)
- **Fáze:** 1) 2014–2016, 2) do 2020–2023, 3) 2023+ vyhodnocení
- **Topics:** `mental_health`, `community_care`, `destigmatization`
- **TL;DR (veřejnost):** Plán přesunout péči o duševně nemocné z velkých nemocnic do komunitních center blízko domova. Začalo to 2013, ale postupuje pomaleji než původně plánováno.

### 1.8 · Strategie rozvoje paliativní péče v ČR do roku 2035

- **ID návrh:** `strategie_paliativni_2035`
- **Garant:** MZČR + Česká společnost paliativní medicíny
- **Status:** 🟡 v přípravě / standardizace (od 2024)
- **Horizont:** do 2035
- **Hlavní web:** https://mzd.gov.cz/informace-o-projektu-standardizace-paliativni-pece-v-ceske-republice/
- **Analytická část:** https://mzd.gov.cz/wp-content/uploads/2025/04/Analyticka-cast-Strategie-rozvoje-paliativni-pece-v-CR-do-roku-2025.pdf
- **Projekt:** „Standardizace paliativní péče v ČR" (OP Zaměstnanost+, ESF EU)
- **Implementační plány:** 2 (dospělí + děti, dokončení 2027)
- **Topics:** `palliative_care`, `end_of_life`, `aging`

### 1.9 · Národní akční plán antimikrobiální rezistence (NAP-AMR)

- **ID návrh:** `nap_amr`
- **Garant:** MZČR + MZe + SZÚ + ÚKZÚZ
- **Status:** ⚠️ AP NAP-ATB byl pro 2019–2022, aktualizace v rámci nového Zdraví 2035 (Implementační plán 1.1)
- **Implementační plán 2025+:** https://mzd.gov.cz/wp-content/uploads/2025/12/Implementacni-plan-c.-1.1-Primarni-prevence-nemoci-a-ochrana-verejneho-zdravi.pdf
- **One Health koordinace:** SZÚ NRL ATB + Národní antibiotický program SVS
- **Topics:** `amr`, `antibiotics`, `infection_control`, `one_health`
- **linked_indicators (návrh):** `spotreba_antibiotik`, `rezistence_antibiotik_ecoli`

### 1.10 · Národní akční plán pro Alzheimerovu nemoc a obdobná onemocnění

- **ID návrh:** `napad`
- **Garant:** MZČR
- **Status:** ⚠️ je v rámci Implementačních plánů Zdraví 2030/2035
- **TL;DR:** Plán pro péči o pacienty s demencí a podporu pečujících rodin.
- **Topics:** `dementia`, `aging`, `chronic_care`

---

## 2 · Národní screeningové programy (Národní screeningové centrum ÚZIS)

> Pozn.: `nsc.uzis.cz/cs/o-nsc/strategie/` v době rešerše vrátil 503 (server error). Níže rekonstrukce ze sekundárních zdrojů. Před publikací re-verifikovat.

### 2.1 · Národní program screeningu kolorektálního karcinomu

- **ID návrh:** `screening_program_kolorektalni`
- **Garant:** MZČR + ÚZIS + NSC
- **Status:** ✅ platná, **modernizace 1.1.2026** (snížení věku na 45)
- **Hlavní web:** https://mzd.gov.cz/category/programy-a-strategie/screeningove-programy/screening-kolorektalniho-karcinomu/
- **Detailní portál:** https://www.kolorektum.cz/
- **Spuštěno:** 2000
- **Cílová skupina:** 45–74 let (od 2026, do té doby 50+)
- **Modality:** TOKS (1× za 2 roky) nebo screeningová koloskopie (1× za 10 let)
- **linked_indicators:** `screening_kolorektalni`

### 2.2 · Národní program screeningu karcinomu prsu (mamografie)

- **ID návrh:** `screening_program_prsu`
- **Garant:** MZČR + Národní program screeningu karcinomu prsu
- **Status:** ✅ platná
- **Cílová skupina:** ženy 45+, mamografie 1× za 2 roky
- **linked_indicators:** `screening_mamograficky`

### 2.3 · Národní program screeningu karcinomu děložního hrdla

- **ID návrh:** `screening_program_cervix`
- **Detailní portál:** https://www.cervix.cz/cs/o-programu/popis-programu/
- **Status:** ✅ platná
- **linked_indicators:** `screening_cervix`

### 2.4 · Screening výdutě břišní aorty

- **ID návrh:** `screening_aorta`
- **Status:** 🟡 spouštění (z Národního kardiovaskulárního plánu 2025–2035)
- **Garant:** MZČR + Česká kardiologická společnost

### 2.5 · Buď Fit 24 (prevence dětské obezity)

- **ID návrh:** `bud_fit_24`
- **Status:** ✅ aktivní (z Národního kardiovaskulárního plánu 2025–2035)

---

## 3 · Instituce a jejich strategické dokumenty (úroveň 2)

| ID návrh | Instituce | Web | Klíčové dokumenty |
|---|---|---|---|
| `inst_mzcr` | MZČR | https://mzd.gov.cz/ | Strategické rámce Zdraví 2030/2035, plány a akční plány |
| `inst_uzis` | ÚZIS | https://www.uzis.cz/ | NZIS strategie, registry, otevřená data, koncepce |
| `inst_nsc_uzis` | NSC ÚZIS | https://nsc.uzis.cz/ | Screeningové programy ČR — onko + kardiometabolické |
| `inst_szu` | SZÚ | https://szu.gov.cz/ | Epidemiologie, AMR, EHIS/EHES, environmentální zdraví |
| `inst_nrc` | NRC | https://www.nrc.cz/ | Indikátory kvality péče (NRHOSP, NOR), bezpečnost pacientů |
| `inst_ncez` | NCEZ | https://ncez.mzcr.cz/ | eHealth interoperabilita, standardy, EHDS implementace |
| `inst_nivzd` | NIVZD | https://www.nivzd.cz/ | Reforma péče o duševní zdraví |
| `inst_clk` | ČLK (Česká lékařská komora) | https://www.lkcr.cz/ | Profesní strategie, etika |
| `inst_clnk` | ČLnK (Česká lékárnická komora) | https://www.lekarnici.cz/ | Lékárenství |
| `inst_cas` | ČAS (Česká asociace sester) | https://www.cnna.cz/ | Sesterská profese |
| `inst_cls_jep` | ČLS JEP | https://www.cls.cz/ | Doporučené postupy odborných společností |
| `inst_kardio` | Česká kardiologická společnost | https://www.kardio-cz.cz/ | Národní kardiovaskulární plán partner |
| `inst_kzp` | KZP (Kancelář zdravotního pojištění) | https://kancelarzp.cz/ | PUK — Portál ukazatelů kvality |

### 3a · Zdravotní pojišťovny (specifická podsekce)

V ČR působí **7 zdravotních pojišťoven** v systému veřejného zdravotního pojištění (zákon 48/1997 Sb.). VZP je dominantní (~60 % pojištěnců), 6 zaměstnaneckých pojišťoven je sdruženo ve Svazu zdravotních pojišťoven (SZP). Každá publikuje výroční zprávu, zdravotně-pojistný plán a vlastní strategie/koncepce. Pro projekt Zdravé Česko jsou pojišťovny klíčové, protože spravují K-dávky (data o úhradách) a jsou hlavním partnerem v dohodovacím řízení.

| ID návrh | Pojišťovna | Kód | Pojištěnci (cca) | Web | Strategie / koncepce |
|---|---|---|---|---|---|
| `inst_vzp` | **VZP ČR** | 111 | ~6 mil. | https://www.vzp.cz/ | „Strategie VZP ČR" v přípravě (schválení do konce 2025): přechod od úhrady objemu péče k value-based care, prevence, digitalizace, AI/telemedicína |
| `inst_zpmv` | ZP MV ČR (211) | 211 | ~1,4 mil. | https://www.zpmvcr.cz/ | Vlastní zdravotně-pojistný plán, programy prevence |
| `inst_cpzp` | ČPZP — Česká průmyslová ZP | 205 | ~1,3 mil. | https://www.cpzp.cz/ | Zdravotně-pojistný plán, smluvní politika |
| `inst_ozp` | OZP — Oborová ZP | 207 | ~785 tis. | https://www.ozp.cz/ | Zdravotně-pojistný plán, prevence |
| `inst_vozp` | VoZP — Vojenská ZP | 201 | ~720 tis. | https://www.vozp.cz/ | Specializace na vojáky a rodiny |
| `inst_rbp` | RBP — Revírní bratrská pokladna | 213 | ~470 tis. | https://www.rbp213.cz/ | Specializace MS region |
| `inst_zps` | ZPŠ — Zaměstnanecká ZP Škoda | 209 | ~140 tis. | https://www.zpskoda.cz/ | Nejmenší, regionální |
| `inst_szp` | **SZP ČR** (Svaz ZP) | — | sdružuje 6 zaměstnaneckých | https://szpcr.cz/ | Společný dohodovací zástupce v jednání s MZČR |

**TL;DR (veřejnost):** V ČR si můžeš vybrat jednu ze 7 zdravotních pojišťoven; jednou ročně (do 31. března) můžeš změnit. Všechny musejí ze zákona uhradit stejnou základní péči — liší se v benefitech (preventivní programy, příspěvky), v rychlosti komunikace a v tom, s kterými lékaři mají smlouvu.

**TL;DR (odborník):** 7 ZP v ČR, dominance VZP (~55–60 %). Smluvní politika diferenciovaná, K-dávky publikované jednotlivě. Ve dohodovacím řízení 2026 dohoda s MZČR jen ve 3 segmentech z 15 (zubaři, gynekologové, lékárny). Předpokládaný deficit 12,2 mld. Kč 2026.

**TL;DR (politik):** ZP jsou veřejnoprávní instituce s monopolem na výběr pojistného, ale s konkurenčním tržním modelem v péči o klienty. Klíčový spor: VZP vs. SZP (rozdílná struktura pojištěnců, rozdílné zájmy). Stát má ve VZP přímý vliv (Správní rada 30 členů včetně 10 z Parlamentu).

**linked_indicators (návrh):** `cekaci_doba_kycel` (VZP data), `vydaje_zdravotnictvi_hdp`, `platba_z_kapsy_pct`

---

## 4 · EU strategie (úroveň 3)

### 4.1 · EU4Health 2021–2027

- **ID návrh:** `eu4health_2021_2027`
- **Garant:** Evropská komise (DG SANTE), HaDEA jako implementační agentura
- **Status:** ✅ aktivní
- **Rozpočet:** 5,3 mld. EUR
- **Hlavní web:** https://hadea.ec.europa.eu/programmes/eu4health_en
- **Účel:** odpověď na COVID-19, posílení odolnosti EU zdravotnických systémů
- **Topics:** `eu_funding`, `health_systems`, `crisis_preparedness`

### 4.2 · European Health Data Space (EHDS)

- **ID návrh:** `ehds`
- **Regulace:** 2025/327 (přijata 11.2.2025, OJ 5.3.2025)
- **Status:** ✅ regulace přijata, implementace 2027–2029
- **Hlavní web:** https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en
- **Klíčové milníky:** březen 2027 (implementing acts), březen 2029 (primární use, ePrescriptions/Patient Summaries)
- **Topics:** `digital_health`, `data_protection`, `interoperability`
- **Vazba na ČR:** Národní strategie elektronického zdravotnictví 2025–2035 výslovně reflektuje

### 4.3 · Europe's Beating Cancer Plan

- **ID návrh:** `eu_beating_cancer_plan`
- **Garant:** Evropská komise (DG SANTE)
- **Status:** ✅ aktivní (přijato 3.2.2021)
- **Rozpočet:** 4 mld. EUR (2021–2027)
- **Hlavní web:** https://commission.europa.eu/topics/public-health/european-health-union/cancer-plan-europe_en
- **PDF (COM/2021/44):** https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:52021DC0044
- **4 pilíře:** prevence / včasná detekce / diagnóza a léčba / kvalita života
- **Cíle 2030:** vakcinace 90 % dívek + chlapců proti HPV, 90 % pacientů přístup k Comprehensive Cancer Centres
- **Cíl 2040:** <5 % populace EU užívá tabák
- **Vazba na ČR:** Národní onkologický plán ČR 2030 implementuje

### 4.4 · EU Cancer Mission (Horizon Europe)

- **ID návrh:** `eu_cancer_mission`
- **Garant:** EU Horizon Europe
- **Status:** ✅ aktivní
- **Vazba:** komplementární k Beating Cancer Plan

### 4.5 · EU Mental Health Strategy

- **ID návrh:** `eu_mental_health_strategy`
- **Garant:** Evropská komise
- **Status:** ✅ aktivní (od 2023)

### 4.6 · ECDC priority areas

- **ID návrh:** `ecdc_priority_areas`
- **Garant:** ECDC (European Centre for Disease Prevention and Control)
- **Status:** ✅ průběžně
- **Hlavní web:** https://www.ecdc.europa.eu/

---

## 5 · WHO globální strategie (úroveň 3)

### 5.1 · WHO European Programme of Work 2020–2025 (EPW)

- **ID návrh:** `who_epw_2020_2025`
- **Garant:** WHO Regional Office for Europe
- **Status:** ✅ končící (přijato 70. zasedání WHO RC v září 2020)
- **Hlavní web:** https://www.who.int/europe/about-us/our-work/european-programme-of-work
- **Druhý EPW (2026–2030):** https://www.who.int/europe/about-us/our-work/second-european-programme-of-work-2026-2030 (v přípravě)
- **3 priority:** UHC / health emergencies / health and well-being
- **4 flagshipy:** Pan-European Mental Health Coalition, Empowerment through Digital Health, European Immunization Agenda 2030, Healthier behaviours
- **Topics:** `who_strategy`, `uhc`, `mental_health`, `immunization`

### 5.2 · WHO Global Action Plan for the Prevention and Control of NCDs 2013–2030

- **ID návrh:** `who_ncd_action_plan`
- **Garant:** WHO (rezoluce WHA66.10, 2013, prodloužení 2019)
- **Status:** ✅ aktivní do 2030
- **PDF:** https://www.who.int/publications/i/item/9789241506236
- **Implementation roadmap 2023–2030:** https://www.who.int/teams/noncommunicable-diseases/governance/roadmap
- **Cíle:** 4 NCD (KV, rakovina, respirační, diabetes) × 4 rizikové faktory (tabák, strava, fyz. aktivita, alkohol) × 9 cílů × 25 indikátorů
- **linked_indicators (návrh):** `mortalita_kardiovaskularni`, `mortalita_onkologicka`, `obezita_prevalence`, `kuractvi_denni`, `alkohol_spotreba`

### 5.3 · WHO Mental Health Action Plan 2013–2030

- **ID návrh:** `who_mental_health_action_plan`
- **Garant:** WHO
- **Status:** ✅ aktivní

### 5.4 · WHO Global Strategy on Digital Health 2020–2025

- **ID návrh:** `who_digital_health_strategy`
- **Garant:** WHO
- **Status:** ✅ aktivní

### 5.5 · WHO Global Action Plan on Antimicrobial Resistance

- **ID návrh:** `who_amr_action_plan`
- **Garant:** WHO

### 5.6 · WHO Workforce 2030

- **ID návrh:** `who_workforce_2030`
- **Garant:** WHO
- **Účel:** lidské zdroje pro UHC

---

## 6 · OECD publikace a rámce (úroveň 3)

### 6.1 · OECD Health at a Glance 2025 (a předchozí)

- **ID návrh:** `oecd_health_at_a_glance`
- **Garant:** OECD
- **Status:** ✅ pravidelně (poslední 13.11.2025)
- **Hlavní web:** https://www.oecd.org/en/publications/health-at-a-glance-2025_8f9e3f98-en.html
- **PDF (244 stran):** https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/11/health-at-a-glance-2025_a894f72e/8f9e3f98-en.pdf
- **Specifická edice EU:** State of Health in the EU 2025 + Country Health Profiles
- **Country Profile ČR 2025:** https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/12/country-health-profile-2025-country-notes_7e72146d/czechia_e16c6d2d/7d087e31-en.pdf
- **Topics:** `benchmarking`, `indicators`, `oecd_data`

### 6.2 · OECD Recommendation on Patient Safety

- **ID návrh:** `oecd_patient_safety`
- **Garant:** OECD

### 6.3 · OECD HSPA Framework (general)

- **ID návrh:** `oecd_hspa_general`
- **Vztah:** ČR specifický rámec (1.4) je aplikací

### 6.4 · OECD Learning through national HSPA (policy paper 2026)

- **PDF:** https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/01/learning-through-national-health-system-performance-assessment-hspa_e34d6ff1/2fa1314a-en.pdf
- **Status:** ✅ čerstvý (leden 2026)

---

## 7 · Globální (UN, Lancet, ostatní) (úroveň 3)

### 7.1 · UN SDG 3 — Good Health and Well-being

- **ID návrh:** `un_sdg3`
- **Garant:** UN (Sustainable Development Goals 2015–2030)
- **Status:** ✅ aktivní

### 7.2 · The Lancet Commissions

- **ID návrh:** `lancet_commissions`
- **Klíčové:** Climate Change & Health, Universal Health Coverage, Global Surgery, Mental Health
- **Status:** průběžné

### 7.3 · UN 2030 Agenda for Sustainable Development

- **ID návrh:** `un_2030_agenda`
- **Vztah:** rámec, ke kterému se WHO EPW + globální strategie zarovnávají

---

## 8 · Datové a metodické standardy (úroveň 4 — pomocné)

| ID návrh | Standard | Garant | Status |
|---|---|---|---|
| `std_icd10` | ICD-10 (MKN-10) | WHO | ✅ aktivní (CZ používá) |
| `std_icd11` | ICD-11 (MKN-11) | WHO | 🟡 přechod plánovaný |
| `std_snomed_ct` | SNOMED CT | SNOMED International | ✅ aktivní |
| `std_loinc` | LOINC | Regenstrief Institute | ✅ aktivní |
| `std_hl7_fhir` | HL7 FHIR | HL7 International | ✅ aktivní (eHealth) |
| `std_cz_drg` | CZ-DRG | ÚZIS / NRC | ✅ aktivní (úhradová klasifikace) |
| `std_atc_ddd` | ATC/DDD | WHO | ✅ aktivní (preskripce) |
| `std_ichi` | ICHI | WHO | 🟡 implementace |

---

## 9 · Pokrytí — počty a gaps

| Úroveň | Počet záznamů | Status pokrytí |
|---|---|---|
| **1 · Národní strategie ČR** | 10 | dobré, hlavní strategie pokryté |
| **2 · Screeningové programy** | 5 | částečné — NSC ÚZIS přímo nedostupný |
| **3 · Instituce ČR** | 15 | široké, instituční mapa kompletní |
| **4 · EU** | 6 | hlavní EU iniciativy pokryté |
| **5 · WHO** | 6 | klíčové globální strategie pokryté |
| **6 · OECD** | 4 | publikace a rámce |
| **7 · Globální** | 3 | UN/Lancet kontext |
| **8 · Standardy** | 8 | metodické zázemí |
| **CELKEM** | **57** | dostatečné pro M-STR-2 |

---

## 10 · Identifikované gaps (k re-verifikaci nebo doplnění v M-STR-2)

1. **NSC ÚZIS přímý web** (`nsc.uzis.cz/cs/o-nsc/strategie/`) — server vracel 503; **re-verifikovat**.
2. **Akční plán k omezení škod alkoholem / Národní strategie protidrogové politiky** — neověřeno detailně, RVKPP.
3. **Národní imunizační program** — neidentifikován konkrétní dokument; je v Implementačních plánech Zdraví 2035.
4. **Strategie reformy primární péče** — zmíněno v plánu, neověřeno detailně.
5. **Vyhláška o kategorizaci léčivých přípravků** — relevantní pro dostupnost léčiv, není formální strategie.
6. **EU Pharmaceutical Strategy** — komplementární k EHDS, neověřeno detailně.
7. **G7/G20 health declarations** — politicky relevantní, ale necitované jako binding pro ČR.

---

## 11 · Připomínky k metodice ověřování pro M-STR-2

- **`verified_at` timestamp** v každé položce JSON.
- **Cron re-verifikace** přes `npm run validate-strategies` — pokud URL vrátí 4xx/5xx, označí jako `status: needs_verification`.
- **Re-verifikace alespoň 1× za 6 měsíců** (vyhláškové úpravy, prolongace strategií).
- **Manuální review** před publikací: osoba s přehledem o ČR zdravotní politice.

---

*Verze 1.0 · květen 2026 · Připraveno jako vstup pro M-STR-2 (data/strategies.json).*
