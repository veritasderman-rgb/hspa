// Sprint A — 12 příběhů Priority 1 pro patient_story field
// Texty: 4 odstavce, 300-500 slov, šablona (scéna → data → struktura → páka)
// Audit: každá hodnota shodná s data/indicators.json k 19. 5. 2026

import fs from 'node:fs';
import path from 'node:path';

const STORIES = {
  kuractvi_denni: `Praha, ordinace praktického lékaře, ranní vyšetření 47letého řidiče kamionu. „Kouřím asi tak krabičku denně, doktore. Ale to už od dvaceti, mám to v pohodě." Toto je v české statistice běžná replika. Pan Novák patří do 22,6 % dospělých Čechů, kteří kouří denně — to je téměř každý čtvrtý dospělý. V přepočtu na populaci ČR jde o zhruba 1,9 milionu kuřáků s denním návykem, kromě dalšího milionu příležitostných.

Český průměr 22,6 % stojí o 6,6 procentního bodu nad průměrem OECD (16 %) a o 4,4 procentního bodu nad průměrem EU (18,2 %). Trend je naštěstí pomalu klesající — v roce 2003 kouřilo denně 31 % dospělých, v roce 2014 přes 24 %. Mezi muži je prevalence vyšší (26 %) než mezi ženami (19 %), výrazný gradient sleduje vzdělání a příjem: dospělí s vyšším vzděláním kouří dvojnásobně méně než ti se základním.

Strukturálně Česko za posledních dvacet let neudělalo žádný velký tobacco control krok srovnatelný s Irskem (úplný zákaz v restauracích 2004), Norskem (plain packaging 2017) nebo Austrálií (plain packaging + extrémní spotřební daně). Daň z cigaret zůstává v evropském porovnání nízká, prodej z automatů legální, denní reklama v trafice na úrovni očí dítěte standardní. Programy odvykání nehradí pojišťovny plošně, ale jen vybrané (VZP MOJEZP, ZP MV, ČPZP). NUDZ a SZÚ provozují Národní linku pro odvykání 800 350 000, využití je marginální.

Tabák je v ČR podle SZÚ příčinou cca 16 000 úmrtí ročně — to je každé desáté úmrtí. Vstupuje do KV mortality, onkologie (plíce, hrtan, močový měchýř), CHOPN a perinatální mortality. Politicky to není sporná oblast — odbornost je jednotná, daňová páka existuje, mezinárodní benchmark jasný. Co chybí, je jednoduchá implementace WHO Framework Convention on Tobacco Control (FCTC), kterou Česko ratifikovalo 2012, ale plošně neimplementovalo. Indikátor v dashboardu HSPA Monitor sleduje tento parametr jako proxy systémové prevence.`,

  alkohol_spotreba: `Pondělí ráno, krajská nemocnice, internista píše propouštěcí zprávu 58letého pacienta hospitalizovaného s akutní pankreatitidou. „Alkohol — 5–6 piv denně víkendy, do toho destiláty." Pacient sám sebe nevidí jako problémového piáka. V Česku je to nejběžnější odpověď: pití je sociálně normalizované, klinický práh „škodlivé spotřeby" společensky neznámý.

Roční spotřeba čistého alkoholu na obyvatele 15+ je v Česku 14,4 litru (ČSÚ, ÚZIS, 2024). OECD průměr je 8,9 litru, EU průměr 10,1 litru — Česko trvale patří mezi 3 země s nejvyšší spotřebou v OECD spolu s Lotyšskem a Maďarskem. Hodnota klesá pomalu (2010: 15,6 litru), ale tempo nepostačuje. Mužská spotřeba je 2,5× vyšší než ženská. Z toho cca 70 % pivo, 20 % destiláty, 10 % víno.

Strukturálně český alkoholový režim odráží historickou tradici a politickou neochotu zavádět omezení. Pivo má od 2020 sníženou sazbu DPH, prodej v supermarketech je 24/7, na ulici legální, sponzorství sportu masivní. Spotřební daň z lihu je v EU pásmu, ale na pivo a víno extrémně nízká — víno bez spotřební daně vůbec. Léčebné kapacity protialkoholní léčby jsou regionálně rozmístěné nerovnoměrně — Praha a Brno mají kapacitu, Karlovarský a Liberecký kraj jsou pod dlouhodobým tlakem.

Alkohol je podle Lancet 2018 (Burton & Sheron) odpovědný za 7 % všech úmrtí v Česku — to je více než AIDS, tuberkulóza, malárie a dopravní nehody dohromady globálně. Vstupuje do jaterní cirhózy, kardiovaskulárních příhod, onkologie (jícen, prsní žláza, kolorektum), úrazů a sebevražd. Politická páka existuje (zvýšení spotřební daně na pivo, omezení reklamy, ban sponzorství), ale je dlouhodobě blokovaná lobbyingem pivovarů. WHO doporučuje cílovou redukci o 10 % do 2030 — Česko k ní nesměřuje. Indikátor v dashboardu HSPA Monitor sleduje tento parametr jako klíčový determinant preventovatelné mortality.`,

  bmi_dospeli: `Plzeň, ordinace praktického lékaře, preventivní prohlídka 52leté ženy. „BMI 28, obvod pasu 96 cm. Paní Krásná, jste v pásmu nadváhy, blížíte se obezitě." Pacientka přikyvuje, ale ví, že přesně tohle slyšela před pěti lety i před deseti. Mezi prohlídkami se její váha zvedla o 4 kg. To není výjimka — to je modal trajektorie české středního věku.

60 % dospělých Čechů má BMI ≥ 25 (nadváha nebo obezita). OECD průměr je 55 %, EU 53 % (data 2023 dle SZÚ/EHIS). Z toho samotná obezita (BMI ≥ 30) dosahuje 21 % — pětina dospělých. U mužů je nadváha rozšířenější (66 %) než u žen (54 %). Trend je trvale rostoucí: v roce 2008 mělo nadváhu 50 % dospělých, dnes 60 %. Pohybová aktivita je v ČR rovněž pod průměrem — jen 38 % dospělých splňuje WHO doporučení 150 minut středně intenzivní aktivity týdně.

Strukturálně český obesogenic environment kombinuje vysokou spotřebu zpracovaných potravin, sladkých nápojů a alkoholu (viz alkohol_spotreba) se sedavým životním stylem a marketingem rychloobčerstvení v dětských kategoriích. Daň z cukru, sodíku ani trans-tuků v Česku není. Etikety nutriční hodnoty v restauracích nepovinné. Programy bariatrické chirurgie pojišťovna hradí omezeně, požadovaný BMI ≥ 40 (nebo ≥ 35 s komplikací). Veřejné kampaně typu „5 porcí ovoce" jsou marginální. Žádný plán „Strategie obezity 2030" v ČR neexistuje, na rozdíl od UK National Obesity Strategy.

Obezita je v ČR podle SZÚ asociovaná s 13 % všech úmrtí — cesta přes diabetes typu 2, KV onemocnění, onkologii (kolorektum, prsní žláza, ledviny) a osteoartrózu. Ekonomický náklad pro veřejné zdravotní pojištění odhaduje OECD na 4 % celkových výdajů na zdravotní péči — v ČR by to bylo cca 18 mld. Kč ročně. Politické nástroje (sugar tax dle UK modelu, zákaz reklamy junk food u dětí, povinné nutri-skóre na obalech) jsou veřejně diskutované, implementace váznou. Indikátor v HSPA dashboardu sleduje BMI jako klíčový determinant české preventabilní mortality.`,

  mortalita_kardiovaskularni: `Ostrava, FNO, kardiocentrum, ranní porada k pacientce, 71leté ženě, která zemřela v noci na akutní selhání srdce. „Před deseti lety prodělala AMI, opakovaně léčená pro hypertenzi, diabetes, dyslipidemii. Adherence ke statinům nízká, BMI 32." Tahle anamnéza je typická pro českou kohortu, která přes funkční akutní kardiologii vstupuje do mortality v relativně mladém věku.

Standardizovaná kardiovaskulární mortalita v ČR je 463,75 na 100 000 obyvatel (Eurostat hlth_cd_asdr2, ESP 2013, ref. rok 2023). EU-27 průměr je 312,95 — Česko je o 48 % výš než průměr unie. Hodnota dlouhodobě klesá (1990: ~700, 2010: ~520), ale tempo je pomalejší než v sousedním Polsku nebo Slovensku. U mužů je mortalita 1,8× vyšší než u žen. Rozdíl mezi kraji je významný: Karlovarský, Ústecký a Moravskoslezský kraj mají hodnoty o 15–20 % nad republikovým průměrem.

Strukturálně český systém akutní kardiologie patří v Evropě k nejlepším (síť 22 PCI center 24/7, AMI in-hospital mortalita 5,2 % vs. OECD 6,5 % — viz indikátor mortalita_inhosp_ami). Mezera je primární prevence. Česko má vysokou prevalenci kuřáctví (22,6 %), nadváhy (60 %), alkoholu (14,4 l/os.) a nízkou účast v populačních prevencích (screening kontroly hypertenze, lipidů). Adherence k chronické medikaci je v ČR podle ČFS pod 60 % u indikované terapie hypertenze a dyslipidemie.

Kardiovaskulární mortalita je v Česku odpovědná za zhruba 40 % všech úmrtí — to je největší jednotlivá kategorie. Politické páky existují: zvýšení spotřební daně na tabák, screening kardiovaskulárního rizika v 40+, lepší úhrada SGLT2 inhibitorů, GLP-1 analogů a PCSK9 inhibitorů, programy „heart-healthy" stravování. Systém má dobrou akutní léčbu — chybí mu prevence. Indikátor v HSPA dashboardu sleduje populační vrstvu jako klíčový ukazatel zdraví české střední generace.`,

  mortalita_preventabilni: `Liberec, krajská nemocnice, oddělení interny, sobota večer, mladší muž (47) přivezen pro pokročilou jaterní cirhózu s krvácením do žaludku. Anamnéza: kouření, denní pití od 25 let, žádná preventivní prohlídka deset let. Pacient zemřel po 36 hodinách. To je „preventovatelné úmrtí" v OECD klasifikaci — úmrtí v produktivním věku, kterému by bylo možné předejít primární prevencí nebo včasnou léčbou.

Preventabilní mortalita v ČR je 155 úmrtí na 100 000 obyvatel mladších 75 let (OECD Health at a Glance 2024, ref. rok 2022). OECD průměr je 121, EU 130. Česko je o 28 % nad OECD průměrem. Hodnota klesá pomalu — v roce 2010 byla 195, v 2024 je 155 (pokles o 20 % za 14 let). Pro srovnání: Norsko 95, Švédsko 99, Itálie 109. Mužská preventabilní mortalita (215) je 2,3× vyšší než ženská (95).

Strukturálně preventabilní mortalita kombinuje dvě věci: chování (tabák, alkohol, nezdravá strava, sedavost) a slabou primární prevenci (screening, kontrola hypertenze, vakcinace). Česko zaostává v obou. WHO definuje preventabilní úmrtí jako ta, kterým by „mohla zabránit účinná veřejnozdravotní intervence". Z 30 nejčastějších diagnóz preventabilních úmrtí v ČR vede plíce, kardiovaskulární systém, alkoholová onemocnění jater, dopravní úrazy a sebevraždy. Léčba dostupná v Česku je technicky srovnatelná s OECD — mezera vzniká před vstupem do systému.

Preventabilní mortalita je jeden z nejdůležitějších indikátorů funkčnosti zdravotního systému jako celku — měří, jestli systém pacienta vůbec zachytí. Politické páky kumulují všechno, co diskutujeme v ostatních článcích: tobacco control, alkoholová politika, screening, vakcinace, péče o duševní zdraví, kontrola hypertenze. Pokles z 155 na 121 (OECD úroveň) by v ČR znamenal cca 3 500 zachráněných životů ročně — to je víc, než kolik zemře v dopravních nehodách čtyřnásobně. Indikátor v HSPA dashboardu je proxy efektivity celé preventivní vrstvy systému.`,

  sebevrazdy_per_100k: `Hradec Králové, krizová linka 116 123, neděle ve 23:40. „Volám, protože už nevím, jak dál. Ztratil jsem práci, manželka mě opustila, nemám kam jít. Lék mi v pondělí nedá psychiatr — je tam pětiměsíční pořadník." Tahle replika není konstruovaná — je to typická situace, kterou linky uvádějí v anualizovaných reportech. V Česku přes 1 200 lidí ročně sebevraždu dokoná. Linka vstupuje jako poslední záchytná vrstva v systému, kde primární psychiatrická péče má mnohaměsíční čekací doby.

Standardizovaná míra sebevražd v ČR je 12,5 na 100 000 obyvatel ročně (ČSÚ, 2024). OECD průměr je 10,5, EU 11,2. Česko stojí cca o 19 % nad OECD průměrem. Mužská mortalita (21,5) je 4,3× vyšší než ženská (5,0). Nejvyšší věkové skupiny (75+) mají hodnoty přes 30/100 000 — sebevražda jako důsledek osamělosti, somatického onemocnění a depresivní poruchy. Trend dlouhodobě stagnuje: 2010 — 13,7; 2024 — 12,5. Pokles je pomalejší než v Nizozemsku, Norsku nebo Finsku, které dlouhodobě investují do prevence.

Strukturálně český systém péče o duševní zdraví trpí dvěma chronickými problémy: nedostatečnou kapacitou (3 psychiatři na 10 000 obyvatel vs. OECD 5,8) a nedokončenou Reformou psychiatrické péče (probíhá od 2013 — Centra duševního zdraví jsou rozšířena jen v některých krajích, kapacita lůžkové péče v psychiatrických nemocnicích klesá rychleji, než roste komunitní péče). Krizová pomoc je zajištěna NNO — Linka bezpečí, Linka první psychické pomoci, Modrá linka — financování smíšené, nestabilní. Telefonická a online intervence pokrývá jen zlomek poptávky.

Sebevražda je v Česku nejčastější příčinou úmrtí mužů v kategorii 25–44 let — víc než dopravní nehody nebo onkologie. Politické páky jsou jasné: dokončení Reformy psychiatrické péče (kapacita Center duševního zdraví v každém okrese), regulace dostupnosti smrtících látek (paracetamol balení, pesticidy), školní programy mentálního zdraví (UK MindEd model), pravidelný populační screening depresivních symptomů u 65+. Indikátor v HSPA dashboardu sleduje sebevraždy jako klíčový ukazatel efektivity systému duševního zdraví — který je v ČR mezi nejvíce zaostávajícími.`,

  screening_kolorektalni: `Olomouc, gastroenterologické pracoviště, 64letý muž přichází k první kolonoskopii. „Doktor mi to dal jako doporučení po 60. Pomyslel jsem si, ať to mám za sebou — vyšetření bylo nepříjemné, ale zvládl jsem to. Předtím jsem to nikdy nedělal." Tato situace je v Česku stále nadprůměrná — většina indikovaných lidí na screening kolorektálního karcinomu nepřijde.

Účast v českém populačním screeningu kolorektálního karcinomu je 28 % (ÚZIS, 2024). OECD průměr je 42 %, EU 38 %. Cílová hodnota pro efektivní snížení mortality podle EU doporučení je ≥ 65 %. Česko zaostává o 14 procentních bodů za OECD a o 37 bodů za referenční hodnotou. Program funguje od 2009 jako populační, oslovuje občany 50+ pomocí adresných pozvánek od zdravotních pojišťoven (test okultního krvácení iFOBT, při pozitivitě kolonoskopie). Účast pomalu roste (2015: 22 %; 2024: 28 %), ale ne dostatečně.

Strukturálně český systém má všechny komponenty — test, vyšetření, registr — ale narazí na bariéry. Adresné pozvánky pojišťovny posílají, ale ne pravidelně a jejich form je často byrokratická. Praktiční lékaři, kteří mají pro screening klíčovou roli (vydání žádanky, motivace pacienta), nemají dostatečnou kapitační páku — vykazují cca 50–60 % indikovaných pacientů. Kolonoskopická kapacita je v některých krajích limitovaná (Karlovarský, Liberecký). Veřejné kampaně typu Loono nebo „Březen — měsíc střev" mají dosah, ale není to systematická investice státu.

Kolorektální karcinom je v Česku 2. nejčastější onkologickou diagnózou (incidence 73,5 / 100 000) a 2. nejčastější příčinou úmrtí na onkologii. Časný záchyt přes screening snižuje mortalitu o 40 % (Cochrane Review 2019). Politické páky: zvýšit kapitační platbu praktikovi za organizovaný screening; rozšířit adresné pozvánky o SMS a notifikace v eHealth aplikaci; investovat do kolonoskopické kapacity (cca 600 mil. Kč jednorázově, dle MZ ČR analýzy 2024); kampaně typu „rok prevence". Indikátor v HSPA dashboardu sleduje účast jako klíčový ukazatel funkčnosti populačního screeningu.`,

  screening_mamograficky: `České Budějovice, mamografické pracoviště, 54letá žena přichází na vyšetření. „Naposledy jsem byla před šesti lety, pak jsem zapomněla, pak pandemie, pak jsem to odkládala." Tahle pacientka je v cílové skupině screeningu (45–69 let), ale účast má suboptimální. Mamografické pracoviště za den vyšetří 40–60 žen — kapacita systému je dostatečná, mezera vzniká na vstupu.

Účast v českém mamografickém screeningu žen 45–69 let je 60 % (ÚZIS, 2024). OECD průměr je 68 %, EU 65 %. Cílová hodnota podle EU doporučení je ≥ 75 %. Česko zaostává o 8 procentních bodů za OECD a o 15 bodů za doporučenou hodnotou. Program funguje od 2002, screening provádí cca 70 akreditovaných center, frekvence dvouletá, hrazený z veřejného zdravotního pojištění. Trend pomalu roste (2010: 51 %; 2024: 60 %), ale tempo nestačí na dosažení cíle 75 % do roku 2030.

Strukturálně český systém má akreditovaná centra, organizovaný registr a adresné pozvánky. Mezera vzniká v komunikaci s pacientkou a v dostupnosti center — některé okresy mají center málo, dojezd 60+ minut. Praktická lékařka nebo gynekoložka může screening doporučit, ale není odpovědná za follow-up neúčastnice. Tichá kohorta žen z marginalizovaných skupin (nižší vzdělání, romské komunity, vzdálené regiony) má účast pod 35 %. Programy navigace pacientky (model UK breast cancer navigator) v ČR nejsou.

Karcinom prsu je v Česku nejčastější onkologickou diagnózou u žen (incidence 130 / 100 000, mortalita ~30 / 100 000). Screening snižuje mortalitu o 20–30 % u screenovaných žen (Cochrane). Politické páky: rozšířit pozvánky o digitální notifikace; investovat do mobilních mamografických jednotek pro odlehlé regiony (model Polska a Slovenska); přidat kapitační platbu praktikovi/gynekoložce za organizovaný screening; národní kampaň „říjen růžová" se sjednoceným systémem komunikace. Indikátor v HSPA dashboardu sleduje účast jako klíčový ukazatel efektivity sekundární prevence rakoviny prsu.`,

  screening_cervix: `Brno, gynekologická ambulance, 36letá žena přichází na první „pap" po pěti letech. „Měla jsem to v plánu, ale pak děti, práce, a nepřišlo mi to akutní." Pacientka má za sebou negativní výsledek, ale v intervalu pět let prošla bez screeningu — to je v Česku běžné. Systém funguje, ale velká část cílové populace ho nevyužívá pravidelně.

Účast v českém screeningu rakoviny děložního čípku žen 25–60 let je 52,3 % (ÚZIS, 2024). OECD průměr 64,5 %, EU 65 %. Cílová hodnota dle EU doporučení je ≥ 70 %. Česko zaostává o 12 procentních bodů za OECD. Screening (cytologie nebo HPV test) provádí gynekologové v ambulanci, frekvence ročně (cytologie) nebo tříletá (HPV od 2021), hrazený z veřejného zdravotního pojištění. Pomalý trend růstu (2015: 48 %; 2024: 52 %) — bez intervence systém cíle 70 % nedosáhne.

Strukturálně český program má anomálii — frekvence cytologie ročně byla v 90. letech politicky stanovena jako „častěji = lépe", ale mezinárodní guidelines (WHO, ASCCP) doporučují tříleté nebo pětileté intervaly s HPV testem jako přesnější. Česko přešlo na hybridní model 2021, ale zavádění je pomalé. Mladé ženy (25–35) mají vysokou účast (~65 %), zato ženy 50+ často „vypadávají" — věk peri/postmenopauzy, kdy už si nemusí pravidelnou kontrolu spojovat s prevencí. Vakcinace HPV (viz indikátor vakcinace_hpv) je doplňková primární prevence.

Karcinom děložního čípku je v ČR cca 800 případů ročně, mortalita 300. Většinu by mohl screening zachytit v prekarcinomovém stadiu (CIN). WHO vyhlásila v roce 2020 cíl „elimination of cervical cancer" do 2030 — vyžaduje 70 % screening + 90 % HPV vakcinace dívek + 90 % léčby prekancerózních lézí. Česko žádný z těchto tří cílů nesplňuje. Politické páky: lepší kapitační platba gynekoložce za organizovaný screening; HPV samosběrový test pro neúčastnice (mailem domů, model Nizozemska); intenzivní HPV vakcinační kampaň pro dívky 11–14 let. Indikátor v HSPA dashboardu sleduje účast jako klíčový ukazatel funkčnosti sekundární prevence — která v ČR potřebuje reformu, ne jen kampaň.`,

  vakcinace_mmr_deti: `Pediatrická ordinace, 18měsíční dítě, druhá dávka MMR. „My ji raději ještě počkáme, slyšeli jsme, že jsou s tím problémy." Matku ujišťuje pediatrička, že vakcína je bezpečná a že posun znamená vyšší riziko spalniček v případě epidemie. Tahle situace se v Česku za poslední dekádu objevuje stále častěji — důvěra v povinné očkování klesá.

Proočkovanost MMR (spalničky-zarděnky-příušnice) v ČR u dětí 2 roky věku je 83,7 % (ÚZIS, 2022, druhá dávka). OECD průměr je 94,8 %, EU 95,2 %. WHO cílová hodnota pro herd immunity (kolektivní imunitu) proti spalničkám je 95 %. Česko zaostává o více než 11 procentních bodů a překračuje epidemiologickou prahovou hodnotu. Trend je dlouhodobě klesající: 2010 — 95 %; 2018 — 90 %; 2022 — 83,7 %. Vzestup vakcinační hesitancy začal po roce 2010 a urychlil se po pandemii COVID-19.

Strukturálně český systém má vakcinace plošně dostupné, hrazené, povinné dle zákona 258/2000 Sb. — ale vymáhání chybí. Sankce za odmítnutí jsou marginální, výjimky se rozšiřují, soudní praxe v posledních pěti letech vesměs vyhovuje rodičům odmítajícím povinné očkování. Pediatři, kteří mají vakcinaci v gesci, nemají vždy čas ani komunikační podporu pro práci s vakcinačními hesitanty. Komunikační kampaň státu je marginální, zatímco anti-vakcinační kampaně na sociálních sítích jsou organizované a financované.

Spalničky jsou jedna z nejnakažlivějších infekcí (R₀ = 12–18). Při proočkovanosti pod 95 % se vrací — Rumunsko 2017–2019 (přes 60 úmrtí), Ukrajina 2018 (115 úmrtí), Texas 2025 (2 dětské úmrtí). Česko mělo v 2024 vzestup hlášených případů. Politické páky: standardizovaná komunikační podpora pediatrů s vakcinačními hesitanty (model finského MetaMo); pravidelná populární kampaň státu („Spalničky se vracejí"); reforma vymáhání povinného očkování s reálnými, ale proporcionálními sankcemi. Indikátor v HSPA dashboardu sleduje MMR proočkovanost jako klíčový ukazatel funkčnosti dětské preventivní péče a jeden z nejcitlivějších markerů důvěry v systém.`,

  cekaci_doby_specialist: `Plzeň, středa odpoledne, paní Krásná (62) volá k neurologovi pro suspektní polyneuropatii. „Nejdřívější volný termín je 2. listopadu." Je červen. Pět měsíců čekání na běžné neurologické vyšetření. Pacientka pravděpodobně mezitím přejde do soukromé ambulance, zaplatí samoplatebně 2 000 Kč, nebo nepůjde vůbec — a problém se prohloubí.

Průměrná čekací doba na první vyšetření specialistou v ČR je 28 dní (vlastní data ÚZIS / SZP, 2024, agregace přes 8 nejčastějších specializací). OECD průměr je 18 dní, EU 22 dní. Česko je v evropském srovnání nadprůměrně dlouhé. Rozptyl mezi specializacemi je dramatický: oftalmologie 7 dní, neurologie 42 dní, endokrinologie 56 dní, sexuologie 90+ dní. Mezi regiony rozdíl 3–4× (Praha → Karlovarský). Hodnota se zhoršuje (2018: 22 dní; 2024: 28).

Strukturálně problém vzniká kombinací: nedostatečné kapacity v některých oborech (neurologie, endokrinologie, dětská psychiatrie), nerovnoměrné distribuce (koncentrace v metropolích), úhradové vyhlášky (limity počtu výkonů na pojištěnce), demografického tlaku (stárnutí populace zvyšuje poptávku). Systém má dva souběžné světy: hrazená péče (28 dní průměr, často s frontou), samoplatební ambulance (do tří dnů, ale za 1500–3500 Kč za vyšetření). To je defacto dvourychlostní péče bez explicitní legislativní úpravy.

Čekací doby ovlivňují klinické výsledky — pozdní záchyt diabetu, neurologického onemocnění, endokrinní poruchy se promítá do mortality a chronicity. Politické páky: pravidelný transparentní reporting čekacích dob per kraj a specializaci (UK NHS model — povinné publikování); navýšení kapitační platby praktikům za řešení v primární péči (aby méně případů končilo u specialisty); investice do navýšení kapacit v deficitních oborech (cca 200 nových míst neurologie do 2030); telemedicína pro triáž (kdo z 28 dnů opravdu potřebuje specialista). Indikátor v HSPA dashboardu sleduje čekací doby jako jeden z hlavních ukazatelů přístupnosti péče — a zároveň jeden z hlavních problémů, který občan na vlastní kůži cítí.`,

  infekce_nosokomialni: `Praha, fakultní nemocnice, JIP, 71letý pacient po elektivní ortopedické operaci. Pátý pooperační den vystupuje horečka. Hemokultura — Staphylococcus aureus, multirezistentní. Diagnóza: nosokomiální infekce krevního řečiště, pravděpodobně z centrálního žilního katetru. Hospitalizace se prodlouží o 14 dní, pacient má 25% riziko úmrtí. To není výjimečná situace — je to statisticky pravděpodobná komplikace, kterou systém u zhruba 6,5 % hospitalizovaných pacientů zaznamenává.

Prevalence nosokomiálních (zdravotně-asociovaných) infekcí v ČR je 6,5 % hospitalizovaných pacientů (ÚZIS NRH, 2023). OECD průměr je 5,5 %, EU 5,9 %. Česko je nad oběma průměry o 0,6–1 procentní bod. Trend pomalu klesá (2015: 7,8 %; 2023: 6,5 %), tempo je nedostatečné. Nejčastější typy: infekce močových cest, infekce v místě chirurgického výkonu, pneumonie spojená s ventilátorem, infekce krevního řečiště. Multirezistentní kmeny (MRSA, ESBL E. coli, Klebsiella) tvoří v ČR cca 20 % izolátů — vyšší než průměr EU.

Strukturálně český systém má všechny komponenty (NRPZS, NRH, antibiotická střediska, hygienické směrnice), ale implementace v každodenní praxi kolísá. Hand hygiene compliance měřená v auditech je v některých nemocnicích jen 40–50 % (cíl WHO: 80 %+). Antibiotic stewardship (program racionální preskripce ATB) je pomalu zaváděn jen ve velkých nemocnicích. Personální poddimenzování (sestry / lůžko v některých odděleních pod doporučenou hodnotou) zvyšuje riziko chyb. Forenzní pohled — pacient, kterému se „v nemocnici stalo něco navíc", má v ČR ztížený přístup ke kompenzaci.

Nosokomiální infekce jsou v Česku odhadované jako příčina cca 2 000–3 000 úmrtí ročně — část preventabilní lepší hygienou a antibiotickou stewardship. Politické páky: zveřejňování dat infekce per nemocnice (UK NHS model — povinné publikování MRSA a C. difficile case rates per trust); inspekce hygienické compliance s reálným dopadem na akreditaci; investice do antibiotic stewardship programu (každá fakultní nemocnice ATB tým); navýšení personálních standardů (sestra/lůžko jako kvalitativní indikátor). Indikátor v HSPA dashboardu sleduje nosokomiální infekce jako klíčový ukazatel kvality nemocniční péče a pacientské bezpečnosti.`,
};

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CARDS = path.resolve(ROOT, '..', 'indicators');
let updated = 0;
let skipped = 0;

for (const [id, story] of Object.entries(STORIES)) {
  const file = path.join(CARDS, `${id}.json`);
  if (!fs.existsSync(file)) { console.error('MISSING:', id); continue; }
  const card = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (card.patient_story && card.patient_story.trim().length > 50) {
    console.log('SKIP (already has):', id);
    skipped++;
    continue;
  }
  // Insert patient_story before `framework` to match template order
  const out = {};
  let inserted = false;
  for (const [k, v] of Object.entries(card)) {
    if (k === 'framework' && !inserted) {
      out.patient_story = story.trim();
      inserted = true;
    }
    out[k] = v;
  }
  if (!inserted) out.patient_story = story.trim();
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  updated++;
  console.log('OK:', id);
}
console.log(`\nDone. Updated: ${updated}. Skipped: ${skipped}.`);
