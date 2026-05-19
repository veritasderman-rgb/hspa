// Sprint C — 25 příběhů Priority 3 (technická vrstva)
import fs from 'node:fs';
import path from 'node:path';

const STORIES = {
  nadeje_doziti_zeny: `Pražská porodnice, prosinec, narozena holčička. Statistický odhad délky jejího života: 82,5 roku. To je o 0,8 roku víc, než měl novorozenec před deseti lety. Ale o 1,3 roku míň, než kdyby se narodila ve Švédsku, Itálii nebo Španělsku, kde ženy žijí v průměru 83,8 roku.

Naděje dožití žen při narození v ČR je 82,5 roku (ČSÚ, 2024). OECD průměr 83,8, EU 83,3 — Česko je signal warn. Rozdíl 1,3 roku oproti OECD znamená cca 12 000 ztracených let života ročně v ženské populaci ČR. Trend pomalu roste (2010: 80,3 → 2024: 82,5), tempo se ale zpomaluje. Pandemická hodnota 2020–2022 přechodně klesla, dnes je obnovena.

Strukturálně ženy v ČR žijí déle než muži (+6,1 roku — viz nadeje_doziti_total) díky biologickým a chování faktorům (méně kouření, méně alkoholu, lepší zdravotní gramotnost). Hlavní příčiny úmrtí žen: KV onemocnění (40 %), onkologie (28 %, z toho karcinom prsu a kolorektum nejvíc), respirační (8 %). Mezi kraji rozdíl 2,5 roku (Praha 84,1 vs. Karlovarský 81,6) — sociální determinanty zdraví hrají velkou roli.

Pro dosažení OECD úrovně je třeba zaměřit prevenci na kardiovaskulární mortalitu žen po menopauze (kontrola hypertenze, statiny v primární prevenci, screening dyslipidemie), na onkologický screening (mamograf, cervix, kolorektum — viz indikátory) a na duševní zdraví (deprese, úzkost u žen 50+). Politické páky kumulují všechno z Priority 1 — bez nich naděje dožití nedosáhne OECD úrovně. Indikátor v HSPA dashboardu sleduje ženskou délku života jako klíčový souhrnný ukazatel zdraví populace.`,

  nadeje_doziti_zdravi_65: `Zlín, ordinace praktického lékaře, 65letý pacient přichází na první důchodovou prohlídku. „Doktore, kolik mi to ještě dáte zdravého života?" Statistický odhad: 7,7 let (žena 8,9, muž 6,5). To je o 2,5 roku méně, než kdyby žil v Norsku nebo Švédsku, kde čerství 65letí mají před sebou 10+ let zdravého života.

Healthy Life Years (HLY) ve 65 letech v ČR: 7,7 let v průměru (Eurostat, 2023). OECD průměr 10,2, EU 9,4. Česko je signal bad. Rozdíl 2,5 roku znamená, že čeští senioři vstupují do období závislosti, multimorbidity a polypragmazie o 2–3 roky dříve než průměr OECD. Trend stagnuje (2010: 8,1, 2023: 7,7) — kapacita prodloužené délky života (viz indikátor nadeje_doziti_total) je „v nemoci", ne ve zdraví.

Strukturálně HLY měří subjektivní omezení v aktivitách denního života. Klíčové determinanty: kardiovaskulární zátěž, muskuloskeletální nemoci (osteoartróza, osteoporóza), kognitivní poruchy (demence, deprese), polypragmazie. Česko má vysokou prevalenci CHOPN, KV onemocnění a diabetu — multimorbidita 65+ je u 65 % seniorů (viz multimorbidita_65plus). Geriatrická medicína je v Česku poddimenzovaný obor, dlouhodobá péče (LTC) je rozdělená mezi sociální systém a zdravotní pojištění.

HLY je klíčový indikátor kvality let života, ne jen kvantity. Politické páky: program „Active and Healthy Ageing" (model WHO Europe); rozšíření geriatrické péče (cca 200 nových míst do 2030); reforma rozhraní sociálně-zdravotního pomezí (viz clanek-socialne-zdravotni-pomezi-2026); investice do prevence sarkopenie, demence a deprese; rozšíření kapacity rehabilitace. Indikátor v HSPA dashboardu sleduje HLY jako klíčový ukazatel kvality stárnutí — jedna z nejvíce zaostávajících oblastí českého systému.`,

  subjektivni_zdravi: `EU SILC dotazník, jaro 2023, respondent paní (54), Ústecký kraj. „Jak byste celkově popsala svůj zdravotní stav?" — Odpovědi: 1. velmi dobré, 2. dobré, 3. uspokojivé, 4. špatné, 5. velmi špatné. Odpověď: „spíš uspokojivé". V Česku takových respondentů přes 40 % — pod průměrem OECD i EU.

Subjektivní zdraví (% populace 16+, který uvedl „dobré" nebo „velmi dobré") v ČR je 60 % (Eurostat EU-SILC, 2023). OECD průměr 70 %, EU 68 % — Česko signal bad. Rozdíl 8–10 procentních bodů. Trend stabilní (2010: 58 %, 2023: 60 %). Mezi věkovými skupinami klesá strmě: 16–24 let 85 %, 65+ jen 35 %. Mezi kraji rozdíl 15 procentních bodů (Praha 67 % vs. Karlovarský 52 %).

Strukturálně subjektivní zdraví reflektuje skutečný zdravotní stav (objektivní indikátory korelují), ale také kulturní a psychologické faktory. Češi mají tendenci k pesimističtějšímu hodnocení vlastního zdraví než severské nebo středomořské země — částečně historická norma, částečně reálná zátěž chronických nemocí. Faktor také hraje socioekonomická vrstva: nízkopříjmoví respondenti hodnotí zdraví hůř o 20 procentních bodů.

Subjektivní zdraví je důležitý kompozitní indikátor, který doplňuje klinická data. Politicky: zlepšení v PYLL, kardiovaskulární mortalitě a HLY se promítne do subjektivního zdraví; investice do mentálního zdraví (zatím deficitní); programy „healthy ageing"; redukce sociálních determinant (vzdělání, příjem). Indikátor v HSPA dashboardu sleduje subjektivní zdraví jako klíčový PROM (patient-reported outcome measure) parametr.`,

  mortalita_kojenecka: `Porodnice, neonatologie, čerstvě narozený 1 700g předčasný novorozenec, 30. týden. Tým neonatologů — pediatr, neonatolog, sestry, perfuzionista — zahajuje intenzivní péči. V Česku má tento novorozenec 86% šanci přežít první rok — díky síti perinatologických center a vysoké kvalitě neonatologie, kterou jsme v devadesátých letech vybudovali.

Kojenecká mortalita v ČR je 2,4 úmrtí na 1 000 živě narozených (ČSÚ, 2024). OECD průměr 4, EU 3,4 — Česko signal good, výrazně podprůměrné. Trend dlouhodobě klesající (1990: 10,8; 2000: 4,1; 2024: 2,4) — to je 4,5násobné zlepšení za 35 let, jeden z nejlepších výsledků mezi OECD zeměmi. Mezi kraji je rozdíl, ale relativně nízký (1,8 v Praze vs. 3,2 v Karlovarském).

Strukturálně Česko má skvěle nastavený systém perinatální péče: 12 perinatologických center (vysoce specializovaná, intermediární), regionalizace porodů podle gestačního týdne (porod pod 32. týden v perinatologickém centru), systém převozů (UMP — urgentní mezicentrový převoz), kvalitní neonatologie. Tato síť je analogická síti kardiocenter — model dobré praxe českého systému.

Kojenecká mortalita je v Česku úspěšný příběh. Politicky: udržení standardu (financování perinatologických center, mzdové ohodnocení neonatologie), pokračující výzkum (ÚZIS NRMD — Národní registr matek a novorozenců), prevence předčasných porodů (programy adolescentního zdraví, podpora preconception care). Pro replikaci v jiných oborech (onkologie, dětská psychiatrie) je model perinatologické sítě inspirací. Indikátor v HSPA dashboardu sleduje kojeneckou mortalitu jako příklad dobré praxe českého systému.`,

  mortalita_onkologicka: `Oddělení onkologie krajské nemocnice, ranní vizita, 64letá pacientka po pokročilém karcinomu plic, paliativní vrstva péče. Pacientka byla diagnostikována ve stadiu IIIB — pozdě. Pětileté přežití u stadia IIIB je cca 30 %, u stadia I 70 %. Mezera mezi nimi je z velké části o tom, kdy se diagnóza udělá — což je problém českého screeningu a prevence.

Standardizovaná onkologická mortalita v ČR je 180 na 100 000 obyvatel (ÚZIS, 2024). OECD průměr 163, EU 165 — Česko signal bad. Trend pomalu klesá (2010: 200; 2024: 180), tempo nedostatečné vzhledem k dynamice ostatních OECD zemí. Nejčastější příčiny: plíce (cca 5 500 úmrtí/rok), kolorektum (3 500), prsní žláza (1 600), prostata (1 400), slinivka (2 200).

Strukturálně český systém má rozvinutou síť onkologických center (KOC — Komplexní onkologická centra, 13 v ČR), kvalitní diagnostiku a chirurgii, dostupnost moderních léčiv (s časovým posunem oproti DE/FR). Mezery jsou: (1) screeningové účasti (viz indikátory screening_*), (2) primární prevence (kouření, alkohol, obezita), (3) onkologické vědomí a včasné vyhledání péče, (4) regionální dostupnost rehabilitace a paliativní péče.

Onkologická mortalita je druhá nejčastější příčina úmrtí v ČR (po KV). Politické páky: dokončení screeningových programů (cíl 65–75 % účast), Národní onkologický program 2025–2035, posílení role onkologického koordinátora (viz clanek-onkologicky-koordinator-2026), rozšíření screenu rakoviny plic (LDCT u 50+ kuřáků, model NLST). Indikátor v HSPA dashboardu sleduje onkologickou mortalitu jako klíčový ukazatel funkčnosti onkologického systému jako celku.`,

  incidence_prsu: `Mamografické pracoviště, výsledek vyšetření 56leté pacientky, suspektní nález, doporučení biopsie. Histologie: invazivní duktální karcinom, stadium IIA. Pro pacientku to bude rok intenzivní léčby. Pro statistiku to je jeden ze 7 500 případů ročně v ČR.

Incidence karcinomu prsu v ČR je 145 případů na 100 000 žen (ÚZIS NOR, 2023). OECD průměr 90,7, EU 113,4 — Česko je dramaticky nad oběma průměry. To je signal bad. Vysvětlení: kombinace skutečně vyšší incidence (rizikové faktory: pozdní porody, hormonální terapie, alkohol, obezita) a lepší detekce přes screening (paradox: víc nalezených případů znamená víc statistických nálezů, ale dlouhodobě lepší přežití).

Strukturálně český systém má rozvinutou mamografickou síť (cca 70 akreditovaných center), strukturovaný screening (viz screening_mamograficky 60 %), a kvalitní operační a onkologickou léčbu. Mezera je v primární prevenci — nízká edukace o rizikových faktorech (alkohol, obezita), pozdější věk prvního porodu (související s demografickou změnou), hormonální antikoncepce a HRT.

Karcinom prsu je nejčastější onkologickou diagnózou žen v ČR. Pětileté přežití je 87 % (lepší než průměr — díky screeningu a léčbě). Politické páky: zvýšení účasti ve screeningu z 60 na 75 %; rozšíření mobilních mamografických jednotek pro odlehlé regiony; národní kampaně o rizikových faktorech; HPV vakcinace jako primární prevence cervix (analog pro prs neexistuje, ale snižování konzumace alkoholu je nejjednodušší kontrola rizika). Indikátor v HSPA dashboardu sleduje incidenci jako klíčový ukazatel kombinace rizikových faktorů a kvality screeningu.`,

  incidence_kolorektalni: `Gastrologie, kolonoskopie 58letého pacienta. Polyp v sigmatu, biopsie, histologie: adenokarcinom in situ. Pacient měl štěstí: zachyceno časně, kompletní endoskopická resekce, dlouhodobé sledování. Kolorektální karcinom je v Česku velmi častý a zároveň velmi screeningovatelný — paradox, který Česko zatím nezvládlo.

Incidence kolorektálního karcinomu v ČR je 73,5 případů na 100 000 obyvatel (ÚZIS NOR, 2023). OECD průměr 36,5, EU 38,2 — Česko je signal bad, dvojnásobné. Vysvětlení: kombinace skutečně vysoké incidence (rizikové faktory: západní strava bohatá na červené maso a tuky, nízká spotřeba vlákniny, alkohol, obezita, kouření) a lepší detekce přes screening — viz indikátor screening_kolorektalni.

Strukturálně český systém má rozsáhlou kolonoskopickou kapacitu, ale screeningová účast je nízká (28 % vs. cíl 65 %). Většina případů se proto stále diagnostikuje až v symptomatickém stadiu, kdy přežití je nižší. Pětileté přežití u stadia I je 90 %, u stadia IV jen 14 % — pravdový rozdíl rozhoduje o tom, jak časně se nálezník zachytí.

Kolorektální karcinom je v Česku druhá nejčastější onkologická příčina úmrtí. Politické páky: zvýšení screeningové účasti (Priority 1 — viz clanek-rakovina-tlusteho-streva); primární prevence (strava bohatá na vlákninu, snížení spotřeby červeného a zpracovaného masa, redukce alkoholu); investice do kolonoskopické kapacity (model „bez fronty pro pozitivního pacienta"); spolupráce s NNO (Loono, klub onkologických pacientů). Indikátor v HSPA dashboardu sleduje incidenci jako klíčový ukazatel rizikových faktorů a screeningu.`,

  prezit_rakoviny_5let: `Onkologické centrum, follow-up po 5 letech od diagnózy. Pacientka po karcinomu prsu stadia II, kompletní remise, doporučení každoroční kontroly. Pětileté přežití je v onkologii standardní milník — pacient, který jím projde, má vysokou pravděpodobnost vyléčení. V Česku tímto milníkem projde 56 % všech onkologických pacientů.

Pětileté přežití u všech onkologických diagnóz v ČR je 56 % (CONCORD-3 + ÚZIS NOR, 2020 — nejnovější dostupné). OECD průměr 62 %, EU 60 % — Česko signal bad. Rozdíl 4–6 procentních bodů znamená cca 2 000 dalších úmrtí ročně. Specificky: karcinom prsu 87 % (srovnatelné s OECD), kolorektum 58 % (pod OECD 62 %), plíce 14 % (srovnatelné, ale s rezervou), prostata 92 % (srovnatelné).

Strukturálně český onkologický systém má dobrou léčbu u časně diagnostikovaných případů (chirurgie, radioterapie, moderní onkologika v KOC), ale slabší výsledky u pozdě diagnostikovaných (rozdíl s OECD je hlavně ve fázi diagnózy, ne v kvalitě léčby). Hlavní mezerou je screening (viz Priority 1), prevence rizikových faktorů a včasný záchyt symptomů (čekání na vyšetření = pozdější diagnóza).

Pětileté přežití je klíčový kompozitní indikátor funkčnosti onkologického systému. Politické páky: zvýšení screeningové účasti (kolorektum z 28 na 65 %, mamograf 60 → 75 %, cervix 52 → 70 %); rozšíření screeningu rakoviny plic (LDCT u rizikových); Národní onkologický program 2025–2035 s konkrétními termíny; zkrácení čekacích dob na onkologické vyšetření (cíl: dle ESMO guidelines do 14 dní od podezření). Indikátor v HSPA dashboardu sleduje pětileté přežití jako klíčový ukazatel kvality onkologické péče.`,

  obezita_prevalence: `Praktický lékař, prohlídka 47letého pacienta. „BMI 32, obezita I. stupně. Krevní tlak hraniční, glykémie 6,2 mmol/l (prediabetes), cholesterol 6,3 mmol/l." Klasický metabolický syndrom. Pacient patří do 21 % české dospělé populace s BMI ≥ 30. Pro každého z nich je riziko KV onemocnění, diabetu typu 2 a onkologie významně zvýšené.

Prevalence obezity (BMI ≥ 30) v dospělé populaci ČR je 20,8 % (SZÚ/EHIS, 2024). OECD průměr 19,4 %, EU 17,8 % — Česko je signal warn, nad oběma průměry. Trend výrazně rostoucí: 2008 — 17,4 %; 2024 — 20,8 % (+3,4 procentního bodu za 16 let). Mezi muži obezita 22 %, ženami 19,5 %. Mezi věkovými skupinami nejvyšší v 55–64 let (29 %), nejnižší v 18–24 (8 %).

Strukturálně český obesogenic environment kombinuje vysokou spotřebu zpracovaných potravin, sladkých nápojů, alkoholu, nízkou pohybovou aktivitu (viz indikátor pohybova_aktivita_dospeli — 33 %). Sociální gradient je výrazný: nízkopříjmoví dospělí mají obezitu 28 %, vysokopříjmoví 14 %. Veřejné kampaně, daň z cukru, regulace marketingu junk food a strukturovaná pohybová politika v ČR chybí.

Obezita je v ČR podle SZÚ asociovaná s 8 % všech úmrtí (cesta přes diabetes, KV, onkologii, osteoartrózu). Politické páky: sugar tax (model UK Soft Drinks Industry Levy 2018 — pokles spotřeby o 21 % během 4 let); regulace marketingu junk food u dětí; nutri-skóre na obalech; investice do bariatrické chirurgie pro indikované; programy „healthy weight loss" v primární péči (model Counterweight Plus UK). Indikátor v HSPA dashboardu sleduje obezitu jako klíčový determinant preventovatelné mortality.`,

  prevalence_diabetu: `Praktický lékař, glykémie 8,4 mmol/l u 56letého pacienta, opakované měření, diagnóza: diabetes mellitus typu 2. Pacient vstupuje do skupiny cca 1 milionu Čechů s diabetem — to je 9,5 % dospělé populace. Pro každého z nich znamená diagnóza chronickou léčbu, riziko komplikací (oční, renální, kardiovaskulární) a 30–50% zvýšení rizika předčasné úmrtí.

Prevalence diabetu (typu 1 + 2) v ČR je 9,5 % dospělé populace (NRH+ÚZIS, 2023). OECD průměr 7,0 %, EU 7,5 % — Česko signal bad. Trend trvale rostoucí: 2010 — 7,8 %; 2023 — 9,5 %. Z toho diabetes typu 2 cca 90 %, typu 1 (autoimunitní) 5 %, gestační a sekundární 5 %. Mezi věkovými skupinami: 65+ prevalence 22 %, 45–64 12 %, 25–44 4 %.

Strukturálně diabetes typu 2 je převážně preventovatelný — kombinace obezity, sedavého stylu života, nezdravé stravy a genetické predispozice. Český systém má dobré endokrinologické sítě (cca 500 ambulancí), kvalitní léčbu (SGLT2 inhibitory, GLP-1 analoga, inzulínové analogy), edukační centra pro pacienty. Mezera je v prevenci a včasném záchytu — prediabetes (glykémie 5,6–6,9) je u dalších cca 1 milionu lidí, ale screening v primární péči je nesystematický.

Diabetes je 7. nejčastější příčinou úmrtí v ČR (přímo cca 4 000 úmrtí/rok, nepřímo přes KV a renální komplikace dalších 20 000+). Politické páky: program „diabetes prevence" pro prediabetes (UK NHS DPP model — Counterweight, redukce váhy 5 % snižuje riziko diabetu o 58 %); kapitační indikátor pro praktika za záchyt a kontrolu diabetu (UK QOF); rozšíření úhrady SGLT2 inhibitorů a GLP-1 analog; veřejné kampaně o rizikových faktorech. Indikátor v HSPA dashboardu sleduje diabetes jako klíčový marker metabolického zdraví populace.`,

  pohybova_aktivita_dospeli: `Ranní MHD, plno lidí cestou do kanceláře. Sedavá doprava, sedavá práce, sedavý večer u televize. Doporučení WHO: 150 minut středně intenzivní pohybové aktivity týdně. Realita ČR: jen 33 % dospělých to splňuje. Většina populace je v deficitu pohybu, který se sčítá s ostatními rizikovými faktory.

Pohybová aktivita splňující WHO doporučení v ČR je 33 % dospělých (SZÚ/EHIS, 2023). OECD průměr 40 %, EU 38 % — Česko signal bad. Trend stabilní (2014: 32 %, 2023: 33 %). Mezi věkovými skupinami: 18–35 let 42 %, 35–55 35 %, 55+ jen 22 %. Mezi pohlavími: muži 38 %, ženy 28 %. Rozdíl mezi kraji 10 procentních bodů.

Strukturálně český sedavý lifestyle reflektuje urbanizaci, motorizaci, sedavé práce, ale taky nedostatečnou infrastrukturu (cyklistické trasy mimo Prahu a Brno limitované, nedostatek bezbariérových chodníků pro seniory, omezený přístup k organizovanému sportu pro nízkopříjmové). Tělesná výchova ve školách je v RVP, ale realita podle ČŠI ukazuje pokles intenzity. Programy „aktivní stárnutí" v komunitách jsou marginální.

Pohybová neaktivita je podle WHO 4. nejdůležitější rizikový faktor předčasné úmrtí — vyšší než hypertenze a cholesterol. Cca 6 % všech úmrtí v ČR je atribuovatelných sedavému stylu života. Politické páky: investice do bezpečné cyklistické infrastruktury (model Nizozemska — cyklistická vrstva v každém městě); programy „pohyb na recept" v primární péči (UK Exercise on Prescription model); rozšíření školní tělesné výchovy na 5 hodin týdně; daňové úlevy pro firmy podporující pohyb zaměstnanců. Indikátor v HSPA dashboardu sleduje pohyb jako klíčový determinant zdraví napříč věkem.`,

  pm25_expozice: `Ústí nad Labem, listopad, prachové ráno. Měřící stanice ČHMÚ hlásí PM2.5 koncentraci 38 µg/m³ — třikrát víc, než doporučuje WHO (5 µg/m³ roční průměr). V chladnějších obdobích roku jsou hodnoty v Moravskoslezském, Ústeckém a Olomouckém kraji běžně nad 25 µg/m³. Pacienti s CHOPN, astmatem, KV onemocněním reportují zhoršení symptomů.

Roční expozice PM2.5 v ČR (populačně vážený průměr) je 14,1 µg/m³ (ČHMÚ, 2024). OECD průměr 11,2, EU 12,1 — Česko signal bad. WHO Air Quality Guideline 2021 doporučuje ≤ 5 µg/m³ (3× pod českým průměrem). Pomalý trend pokles (2010: 19,5; 2024: 14,1), tempo nedostatečné. Mezi kraji extrémní rozptyl: Moravskoslezský 22, Ústecký 18, Karlovarský 11, Jihočeský 9, Praha 16.

Strukturálně český problém s PM2.5 kombinuje vytápění tuhými palivy v lokálních topeništích (cca 600 000 domácností), průmyslové emise (ostravsko-karvinská aglomerace, severní Čechy), dopravní emise (Praha, Brno), vzdušnou turbulenci ze sousedního Polska. Kotlíkové dotace (od 2015) výrazně pomohly s lokálními topeništi, ale problém přetrvává v sociálně slabých regionech.

Znečištění ovzduší je podle SZÚ a EEA 2. nejvýznamnější environmentální rizikový faktor předčasné úmrtí v Evropě. V ČR atribuovaných cca 7 500 úmrtí ročně. Politické páky: pokračování kotlíkových dotací a kontrola lokálních topenišť; zóny nízkých emisí v krajských městech; veřejná hromadná doprava; energetická efektivita budov (Green Deal); spolupráce s Polskem o přeshraniční emise. Indikátor v HSPA dashboardu sleduje PM2.5 jako klíčový environmentální determinant zdraví.`,

  pyll_potencialne_ztracene_roky: `Ústí nad Labem, smuteční síň, pohřeb 52letého muže po náhlém infarktu. Statisticky by se dožil 75–80 let. Rozdíl 23–28 let je v PYLL terminologii „potencionálně ztracený rok života" — sčítají se tisíce takových případů ročně do souhrnné metriky preventovatelné mortality.

PYLL (Potential Years of Life Lost před 70. rokem) v ČR je 3 800 / 100 000 obyvatel (OECD Health at a Glance 2024, ref. rok 2023). OECD průměr 3 300, EU 3 100 — Česko signal bad. Rozdíl 500–700 let znamená cca 50 000 dodatečných ztracených let života ročně. Trend pomalu klesá (2010: 4 500; 2024: 3 800), tempo nedostatečné. Hlavní příčiny: KV onemocnění (32 %), onkologie (28 %), externí příčiny (11 %), respirační (8 %), digestivní (6 %).

Strukturálně PYLL kombinuje všechny faktory předčasné úmrtí: rizikové chování (tabák, alkohol, obezita), kvalitu primární prevence, dostupnost a kvalitu akutní péče, chronickou léčbu. Česko má v PYLL silnou složku KV mortality (viz indikátor mortalita_kardiovaskularni 463,75/100 000) a relativně vysokou onkologickou mortalitu.

PYLL je jeden z klíčových kompozitních ukazatelů funkčnosti zdravotního systému jako celku. Politicky se PYLL zlepšuje přes kombinaci primární prevence (Priority 1 indikátory), screeningu (Priority 1) a kvality péče (Priority 2). Cíl: dosáhnout úrovně OECD průměru (3 300) do roku 2035 — to znamená redukci PYLL o 13 % za dekádu. Indikátor v HSPA dashboardu sleduje PYLL jako klíčový souhrnný ukazatel preventovatelné mortality.`,

  multimorbidita_65plus: `Geriatrická ambulance, 78letá pacientka přichází na pravidelnou kontrolu. Diagnózy: hypertenze, diabetes typu 2, ICHS, osteoporóza, depresivní porucha, glaukom. Šest chronických diagnóz, devět chronických léků. To je typická česká kohorta seniorů — 65 % populace 65+ má 2+ chronická onemocnění současně.

Multimorbidita (2+ chronických diagnóz) v populaci 65+ v ČR je 65 % (ÚZIS, 2022). OECD průměr 60 %, EU 62 % — Česko signal warn. Trend rostoucí (2010: 58 %, 2022: 65 %) — kombinace stárnoucí populace, prodloužené délky života a kvalitnější diagnostiky chronických nemocí. Nejčastější kombinace: hypertenze + diabetes, hypertenze + KV onemocnění, deprese + somatická choroba, COPD + KV.

Strukturálně český systém je organizován monoorgánově — pacient s multimorbiditou navštěvuje 4–6 specialistů ročně bez koordinace. Praktik je formálně koordinátor, ale nemá kapacitu ani úhradovou páku na komplexní case management. Polypragmazie (5+ léků současně) zasahuje 51 % seniorů 65+ (viz indikátor polypragmazie_65plus) a souvisí s interakcemi, vedlejšími účinky, hospitalizacemi.

Multimorbidita je dominantním modelem zdraví seniorů a vyžaduje jiný model péče než akutní medicína mladších pacientů. Politické páky: kapitační indikátor pro praktika za care plan multimorbidního pacienta (UK QOF, NICE Multimorbidity Guideline NG56); rozšíření kapacity geriatrické medicíny (cca 200 nových míst do 2030); investice do home-based care; integrace zdravotní a sociální péče (viz clanek-socialne-zdravotni-pomezi-2026); pravidelná deprescribing review. Indikátor v HSPA dashboardu sleduje multimorbiditu jako klíčový strukturální parametr stárnoucí populace.`,

  pouzivani_antidepresiv: `Lékárna, výdej receptu na sertralin pro 45letou pacientku. Devátý měsíc užívání, dlouhodobá terapie depresivní poruchy. Pacientka je jednou ze zhruba 900 000 Čechů, kteří užívají antidepresiva — to je 8,4 % dospělé populace. Užívání rychle roste.

Spotřeba antidepresiv v ČR je 84 DDD na 1 000 obyvatel a den (SÚKL, 2023). OECD průměr 67, EU 65 — Česko je 25 % nad oběma průměry. Signal neutral (kontextově: vyšší spotřeba antidepresiv je ambivalentní — může znamenat lepší diagnostiku a léčbu deprese, nebo overprescribing v primární péči). Trend rychle rostoucí: 2010 — 45 DDD, 2023 — 84 DDD (téměř dvojnásobek). Dominují SSRI (sertralin, escitalopram) a SNRI (venlafaxin, duloxetin).

Strukturálně rostoucí spotřeba odráží kombinaci: skutečně rostoucí prevalence depresivní poruchy (mladí, postpandemická vrstva), zlepšenou diagnostiku v primární péči, ale i overprescribing (praktik nemá kam poslat pacienta na CBT terapii — viz indikátor psychiatri_per_100k — proto začíná farmakoterapii). Psychoterapeutická péče je v ČR limitovaná a častěji samoplatební, takže farmakologická intervence je často default.

Antidepresiva jsou dvojsmyslný indikátor: vyšší spotřeba může znamenat lepší přístup k léčbě, ale i overprescribing. Politické páky: rozšíření kapacity klinické psychologie a CBT v hrazené síti (model UK IAPT); kapitační indikátor pro praktika za záchyt deprese (PHQ-9); deprescribing review po 6 měsících léčby; investice do non-farmakologických intervencí. Indikátor v HSPA dashboardu sleduje antidepresiva jako kontextový ukazatel mentálního zdraví a primární péče.`,

  vakcinace_hpv: `Pediatrická ordinace, 12letá dívka přichází se svojí matkou. „Doktorko, slyšela jsem o té rakovině děložního čípku, doporučujete vakcínu?" Matka má informace, dcera je v cílové skupině (11–14 let), pojišťovna od 2018 vakcínu hradí dívkám i chlapcům 11–14 let. Tahle rodina dosáhne na proočkovanost — ale jen 70 % cílové kohorty se nakonec očkuje.

Proočkovanost HPV vakcínou u dívek 11–14 let v ČR je 69,8 % (ÚZIS, 2023, 2 dávky). OECD průměr 75 %, EU 72 % — Česko signal warn. WHO cíl pro „cervical cancer elimination 2030": ≥ 90 % dívek do 15 let. Česko zaostává o cca 20 procentních bodů. Trend stagnuje (2018: 65 %, 2023: 69,8 %). U chlapců proočkovanost cca 50 % — chlapci ji mají hrazenou od 2018, ale pediatrická komunikace s rodiči je slabší.

Strukturálně český program HPV vakcinace funguje (pojišťovny hradí 9–14 let, pediatři aplikují), ale nedosahuje cíle WHO. Mezery: nedostatečná veřejná kampaň (Loono dělá hodně, stát málo); slabá komunikace ze strany pediatrů u rodičů hesitantů; nedávno přibyl rozšířený program i pro chlapce, ale komunikace nedostihla; absence opportunistic catch-up vakcinace u starších dívek/žen.

HPV vakcína je primární prevence karcinomu cervix, ale také karcinomu anorektálního, oropharyngeálního a penisového. Politické páky: národní kampaň „90 % do 2030" (WHO cíl); systematická pozvánka rodičů přes ordinaci dětského lékaře; rozšíření školní vakcinace (model Skotska, Austrálie); catch-up program pro ženy 15–26 (model Velké Británie). Indikátor v HSPA dashboardu sleduje HPV proočkovanost jako klíčový ukazatel primární onkologické prevence.`,

  vakcinace_chripka_65: `Ordinace praktického lékaře, listopad, 72letý pacient přichází na pravidelnou kontrolu hypertenze. „Pane doktore, chřipku letos vůbec nehodlám očkovat — minulý rok mi po té vakcíně bylo špatně." Tato situace je v Česku statisticky převažující — proočkovanost 65+ proti chřipce je v ČR jen 24,5 %, jedna z nejnižších v OECD.

Proočkovanost proti chřipce u 65+ v ČR je 24,5 % (sezona 2024/2025, ÚZIS+SZÚ). OECD průměr 47 %, EU 49 % — Česko signal bad. WHO cílová hodnota pro chřipku u rizikových skupin: ≥ 75 %. Česko zaostává o 50 procentních bodů. Trend dlouhodobě nepříznivý: 2010 — 32 %, 2024 — 24,5 % (POKLES o 7 procentních bodů za 14 let).

Strukturálně český systém chřipkové vakcinace funguje (pojišťovny hradí seniorům 65+, chroniky a zdravotníky), ale kombinace nízké důvěry, slabé komunikace a propagandy proti vakcínám (zvláště po COVID) drží hodnoty extrémně nízko. Praktici mají vakcínu k dispozici, ale aktivně neoslovují cílovou skupinu. Veřejná kampaň státu je marginální (oproti UK, kde NHS každý rok organizuje masivní kampaň).

Chřipková epidemie zabíjí v Česku ročně 1 500–3 000 lidí (cca 90 % seniorů). Plošná vakcinace 75 % cílové skupiny by mohla snížit tato úmrtí o 40–60 %. Politické páky: kampaň „Flu jab — protect yourself" (UK NHS model — pozvánka pacientovi, lékárna jako vakcinační místo, mobilní jednotky); kapitační indikátor pro praktika za proočkovanost cílové skupiny (UK QOF); investice do komunikace pro hesitanty; rozšíření na zaměstnance v péči o seniory (povinné v některých zařízeních). Indikátor v HSPA dashboardu sleduje chřipkovou proočkovanost jako klíčový ukazatel ochrany zranitelné populace.`,

  spotreba_antibiotik: `Ambulance praktického lékaře, pacient s nachlazením, žádá antibiotikum. Lékař vyšetří, vysvětlí, že jde pravděpodobně o virovou infekci, nabídne symptomatickou léčbu. Pacient nesouhlasí, hrozí, že půjde jinam. Tato scéna je v ČR výrazně méně častá než dřív — celostátní spotřeba antibiotik patří mezi nižší v Evropě.

Celková spotřeba antibiotik v ČR (mimonemocniční sektor) je 15 DDD na 1 000 obyvatel a den (SÚKL+ESAC-Net, 2024). OECD průměr 17,5, EU 18,5 — Česko signal good, pod průměrem. Trend pomalu klesající (2010: 18,5, 2024: 15) — ČR je jedním z mála zemí, kde antibiotic stewardship přinesl měřitelný pokles. Nejnižší hodnoty mají Nizozemsko (10), Švédsko (12), Estonsko (11) — vyšší ČR má Polsko (22), Francie (24), Rumunsko (28).

Strukturálně český úspěch v spotřebě antibiotik kombinuje: práci Národního antibiotického programu (NAP od 1999); osvětu praktiků a pediatrů (CRP-test point-of-care, virologie); pravidelný monitoring přes SÚKL+ESAC-Net; tradiční konzervativní preskripční praxi. Slabší vrstvou je nemocniční sektor (vyšší spotřeba širokospektrých ATB) a multirezistence (viz indikátor rezistence_antibiotik_ecoli — 13,1 %, signal warn).

Antibiotic stewardship je v EU jedno z klíčových public health témat — AMR (antimicrobial resistance) způsobuje v EU cca 35 000 úmrtí ročně (ECDC). Politické páky: pokračování NAP s aktualizací 2025–2030; rozšíření CRP-testů v primární péči; vzdělávání veřejnosti (ECDC „European Antibiotic Awareness Day"); nemocniční antibiotic stewardship týmy v každé nemocnici 200+ lůžek. Indikátor v HSPA dashboardu sleduje ATB spotřebu jako klíčový ukazatel racionální farmakoterapie.`,

  rezistence_antibiotik_ecoli: `Mikrobiologická laboratoř, krajská nemocnice, výsledek hemokultury 68leté pacientky se sepsí. Escherichia coli, citlivost: rezistentní k ampicilinu, ko-trimoxazolu, ciprofloxacinu. Lékař volí carbapenem — širokospektré ATB poslední rezervy. To je každý 8. izolát v ČR — 13,1 % E. coli rezistentní na fluorochinolony.

Rezistence E. coli na fluorochinolony v ČR je 13,1 % (ESAC-Net+EARS-Net, 2024). OECD průměr 11,5 %, EU 12,0 % — Česko signal warn. Trend mírně rostoucí (2015: 11,8 %, 2024: 13,1 %). Závažnější MDR (multi-drug resistant) E. coli s ESBL produkcí cca 7 % izolátů. Carbapenem-resistant Enterobacterales (CRE) zatím v ČR vzácné, ale stoupající.

Strukturálně český problém s antimikrobiální rezistencí (AMR) kombinuje: relativně nízkou ambulantní spotřebu ATB (viz spotreba_antibiotik), ale vysokou nemocniční spotřebu; insuficientní antibiotic stewardship programy v menších nemocnicích; nedostatečnou izolaci pacientů s MDR; veterinární medicínu (90 % EU ATB spotřebovává zvířata — ČR má dobrý monitoring v gestci SVS).

AMR je podle WHO „global health threat" — predikce do 2050: 10 milionů úmrtí ročně globálně. ČR je v evropském středu — bez akcelerace stewardship hrozí zhoršení. Politické páky: dokončení Národního antibiotického programu (NAP) 2025–2030; antibiotic stewardship týmy v každé nemocnici (cíl 100 % nemocnic 200+ lůžek); investice do molekulární mikrobiologie (rychlé identifikace); redukce ATB ve veterinární medicíně (EU strategie „from farm to fork"); osvěta veřejnosti. Indikátor v HSPA dashboardu sleduje rezistenci E. coli jako klíčový ukazatel AMR.`,

  kontrola_hypertenze: `Praktický lékař, kontrola 56leté pacientky s léčenou hypertenzí. Krevní tlak 152/95 mmHg, 6 měsíců na monoterapii. Cílová hodnota dle guidelines: < 140/90, optimálně < 130/80. Léčba je neefektivní — pacientka by potřebovala uptitraci nebo kombinační terapii. Tahle situace je v ČR běžná: 32 % léčených hypertoniků nedosahuje cílových hodnot.

Kontrola hypertenze (% léčených s cílovou hodnotou) v ČR je 68 % (Czech post-MONICA, 2024). OECD průměr 72 %, EU 70 % — Česko signal warn. Trend pomalu rostoucí (2010: 60 %, 2024: 68 %). Z celkové populace dospělých s hypertenzí (cca 35 %) je léčeno 75 %, z léčených dobrá kontrola 68 % — efektivní léčba (z celkové diagnózy) jen u 51 % hypertoniků.

Strukturálně český systém má dostupné moderní antihypertenziva (RAAS blokátory, kalciové blokátory, betablokátory, diuretika), kvalitní endokrinologické a kardiologické sítě. Mezery: nesystematické záchyt v primární péči (cca 25 % hypertoniků neví o své diagnóze); nedostatečná uptitrace léčby (lékaři ponechají monoterapii i u pacienta nad cílovou hodnotou); nízká adherence pacienta k léčbě (50–60 % dlouhodobá adherence po 1 roce).

Nekontrolovaná hypertenze je v ČR hlavním modifikovatelným rizikem KV mortality (viz mortalita_kardiovaskularni). Politické páky: kapitační indikátor pro praktika za kontrolu hypertenze (UK QOF jakýn na to dobrý vzor); HMA = home blood pressure monitoring jako rutina (rozšířená úhrada měřáků); kombinační preparáty (single-pill combination) v první linii; intervence k zlepšení adherence (text reminders, pill organizers). Indikátor v HSPA dashboardu sleduje kontrolu hypertenze jako klíčový ukazatel kvality chronické péče.`,

  prohlidka_prakticky_lekar: `Praktický lékař, čtvrteční odpoledne, paní Nováková (47) přichází na preventivní prohlídku (nárok jednou za 2 roky). „Měřím vám tlak, krevní obraz, glykémie, cholesterol, vyšetřím vás. Doporučím mamograf, kolonoskopii doporučí gastrolog." Pacientka odchází s několika doporučeními. Tahle scéna se v Česku odehraje u 48 % dospělých — necelá polovina v daném roce.

Účast v preventivní prohlídce u praktika v ČR je 48 % dospělé populace ročně (Eurostat / vlastní data SZP, 2024). OECD a EU srovnatelné indikátory chybí (různé systémy). Trend stabilní (2015: 47 %, 2024: 48 %). Mezi věkovými skupinami: 18–35 let cca 30 % (mladí prohlídku odkládají), 35–55 let 45 %, 55–75 let 65 %. Mezi muži a ženami: ženy 55 %, muži 41 %.

Strukturálně český systém má povinnou preventivní prohlídku zakotvenou v zákoně 48/1997 Sb. (jednou za 2 roky, dospělí 18+, hrazená pojišťovnou), s definovaným obsahem (anamnéza, fyzikální vyšetření, krevní obraz, biochemie, prevenční doporučení). Praktici prohlídku vykazují, ale aktivně nevolají pacienty. Pojišťovny vědí, kdo dlouho nebyl, ale adresné pozvánky posílají jen sporadicky.

Preventivní prohlídka je vstupní brána ke všem dalším screeningům a včasné diagnostice chronických nemocí. Politické páky: adresné pozvánky pojišťovny (SMS, mail, push notifikace v eHealth aplikaci); kapitační platba praktikovi za skutečně provedenou prohlídku (ne jen za registraci pacienta); večerní a sobotní termíny pro pracující; rozšířený obsah prohlídky o screeningové testy (HbA1c, OGTT, lipidogram, FOBT, popř. PSA). Indikátor v HSPA dashboardu sleduje účast v preventivní prohlídce jako klíčový ukazatel přístupnosti primární péče.`,

  readmise_30d_ami: `Kardiocentrum, post-akutní rehabilitace 64letého pacienta měsíc po infarktu. „Vrátil jste se s recidivou anginy pectoris, opět dilatace." Toto je „30denní readmise" — pacient se vrací do nemocnice s souvisejícím problémem do 30 dní od propuštění. Indikátor je proxy kvality nemocniční péče a koordinace s následnou ambulantní vrstvou.

30denní readmise po AMI v ČR je 11,5 % (ÚZIS NRH, 2024). OECD průměr 13,2 %, EU 13,5 % — Česko signal good, pod oběma průměry. Hodnota se zlepšila (2015: 13,8 %, 2024: 11,5 %) díky rozvoji rehabilitační péče, lepší post-discharge edukaci a sítě kardiocenter (viz mortalita_inhosp_ami).

Strukturálně český systém má dobrou kardiologickou síť (viz clanek-akutni-infarkt), s post-AMI péčí v centrech a navazující ambulantní kardiologií. Mezery: nesystematický transfer k praktikovi (komunikace mezi nemocnicí a primární péčí slabší), nízká účast v kardiorehabilitaci (cca 30 % indikovaných), nesoustavná adherence k sekundární prevenci (statiny, ACE inhibitory, antiagregace). Mezi kraji je rozptyl v readmissionech 8–14 %.

Readmise je klíčový quality indicator nemocniční péče. Politické páky: pokračování centralizace AMI péče; rozšíření kardiorehabilitační kapacity (cíl 60 % indikovaných do programu); povinné předání kompletní propouštěcí zprávy do 24 hodin (elektronicky přes NCEZ); navýšení kapitační platby praktikovi za sledování post-AMI pacientů; pravidelný audit readmissionů per nemocnice. Indikátor v HSPA dashboardu sleduje readmise jako klíčový ukazatel kvality akutní a navazující péče.`,

  bezpecnost_padu_nemocnice: `Interní oddělení nemocnice, 84letý pacient ráno, pokus o samostatný odchod na toaletu, pád na bok, fraktura kyčle. Komplikace prodlouží hospitalizaci o 3 týdny, zvýší riziko úmrtí na 20 %. Tahle nepříznivá událost se v Česku stane statisticky cca 2,1× za 1 000 hospitalizovaných — nad průměrem OECD.

Pády hospitalizovaných pacientů v ČR jsou 2,1 na 1 000 hospitalizací (ÚZIS NRH, 2024). OECD průměr 1,8, EU 2,0 — Česko signal bad. Trend stabilní (2018: 2,3, 2024: 2,1). Vysoký podíl seniorních pacientů (multimorbidita, polypragmazie, kognitivní poruchy, sarkopenie) zvyšuje riziko pádů. Variabilita mezi nemocnicemi extrémní (1,0–3,5 na 1 000) — odráží kvalitu fall prevention programů.

Strukturálně český systém má v každé větší nemocnici Risk Management Officer a fall prevention guidelines, ale implementace v rutinní praxi kolísá. Kvalitní fall prevention programy zahrnují: screening rizika při příjmu (Morse Fall Scale), revize medikace pro fall-risk drugs (benzodiazepiny, antihypertenziva), úprava prostředí (signalizace, sliding rails), trénink chůze a rovnováhy. Personální poddimenzování (sestra/lůžko) zvyšuje riziko (méně sledování pacienta).

Pády v nemocnici jsou „never events" v kvalitativním slovníku — preventovatelné komplikace, které by se neměly stávat při kvalitní péči. Politické páky: povinný reporting per nemocnice (model UK NHS Improvement Patient Safety Incident Reports); audit a benchmarking; investice do personálního obsazení (sestra/lůžko jako quality indicator); rozšíření „bed alarms" a senzorické vybavení; deprescribing programy pro fall-risk drugs. Indikátor v HSPA dashboardu sleduje pády jako klíčový ukazatel patient safety.`,

  cekaci_doba_kycel: `Brno, ortopedie, 67letá pacientka přichází s diagnózou pokročilé koxartrózy, doporučení k totální endoprotéze kyčelního kloubu (TEP). „Operační termín za 118 dní." Skoro 4 měsíce čekání. Pacientka mezitím užívá analgetika, snižuje pohybovou aktivitu, sociálně se uzavírá. To je v Česku průměrná čekací doba — výrazně nad OECD.

Průměrná čekací doba na TEP kyčle v ČR je 118 dní (ÚZIS NRH, 2024). OECD průměr 85 dní, EU 95 dní — Česko signal bad. Trend zhoršující se (2015: 95 dní, 2024: 118 dní) — kombinace stárnoucí populace (rostoucí poptávka), pomalého rozšiřování operační kapacity, post-pandemického návratu odložených zákroků. Mezi nemocnicemi rozptyl 60–180 dní.

Strukturálně český systém má ortopedickou síť dobře pokrytou, ale kapacita TEP je limitovaná (počet operačních sálů, anesteziologů, ortopedů, lůžek). Čekací doba je z velké části fixní problémem strana nabídky, ne diagnostiky. Privátní samoplatební zákroky v Brně, Praze a Liberci jsou dostupné do 14 dnů za 150–250 tisíc Kč — opět dvourychlostní péče.

Čekání na TEP kyčle není jen otázkou komfortu — má klinické a sociální důsledky (sarkopenie, deprese, zhoršení mobility, kardio-respirační dekondice). Politické páky: navýšení kapacity (orthopedický „elective surgery boost" program — UK model 2024); transparentní reporting čekacích dob per nemocnice; investice do robotické chirurgie (zkrácení hospitalizace o 1–2 dny); rozšíření denní jednodenní chirurgie pro vhodné pacienty; národní cíl „TEP kyčle do 90 dnů u 90 % pacientů". Indikátor v HSPA dashboardu sleduje čekání na TEP jako klíčový ukazatel přístupnosti elektivní chirurgie.`,

  hospitalizace_acsc: `Liberecká nemocnice, internistický příjem, 64letý pacient s dekompenzací srdečního selhání. Hospitalizace 8 dní, intenzivní léčba. Při lepší koordinaci ambulantní péče (správná uptitrace léčby, edukace pacienta, včasná reakce na zhoršení) by tahle hospitalizace nemusela být. To jsou ACSC — Ambulatory Care Sensitive Conditions, hospitalizace, kterým by mohla zabránit kvalitní primární péče.

Hospitalizace pro ACSC v ČR je 580 na 100 000 obyvatel ročně (ÚZIS, 2023). OECD průměr 480, EU 510 — Česko signal bad. Trend stabilní (2015: 600, 2023: 580). Nejčastější ACSC v Česku: CHOPN exacerbace, srdeční selhání, diabetická dekompenzace, hypertenzní krize, akutní pneumonie u CHOPN, dehydratace seniorů.

Strukturálně český systém má primární péči (praktici, pediatři, gynekologové), ale jejich integrace s ambulantními specialisty, sociální péčí a edukací pacienta je slabá. Praktik nemá kapitační indikátor za kontrolu CHOPN nebo srdečního selhání, takže intenzita follow-up je nesoustavná. Domácí péče (home-based care) je velmi omezená oproti UK Community Matron modelu nebo nizozemským pečovatelům.

ACSC je indikátor funkčnosti primární péče — vyšší hodnoty znamenají, že systém nedokáže udržet pacienta mimo nemocnici. Politické páky: kapitační indikátor pro praktika za kontrolu chronických nemocí (UK QOF model); rozšíření home-based care (Community Matron); telemonitoring pro srdeční selhání a CHOPN (UK PROACTIVE-COPD, model); investice do pacientské edukace (CHOPN passport, heart failure self-management); integrace praktik – specialista – sestra praktika. Indikátor v HSPA dashboardu sleduje ACSC jako klíčový ukazatel kvality a koordinace primární péče.`,
};

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CARDS = path.resolve(ROOT, '..', 'indicators');
let updated = 0, skipped = 0;

for (const [id, story] of Object.entries(STORIES)) {
  const file = path.join(CARDS, `${id}.json`);
  if (!fs.existsSync(file)) { console.error('MISSING:', id); continue; }
  const card = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (card.patient_story && card.patient_story.trim().length > 50) { console.log('SKIP:', id); skipped++; continue; }
  const out = {};
  let inserted = false;
  for (const [k, v] of Object.entries(card)) {
    if (k === 'framework' && !inserted) { out.patient_story = story.trim(); inserted = true; }
    out[k] = v;
  }
  if (!inserted) out.patient_story = story.trim();
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  updated++;
  console.log('OK:', id);
}
console.log(`\nDone. Updated: ${updated}. Skipped: ${skipped}.`);
