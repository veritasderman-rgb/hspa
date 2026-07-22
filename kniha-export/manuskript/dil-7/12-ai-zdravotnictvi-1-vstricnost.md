---
slug: ai-zdravotnictvi-1-vstricnost
dil: 7
poradi: 12
audit: verified
stitky: Digitalizace, Série AI ve zdravotnictví · díl 1/2 · vstřícnost
---

# Lékař, který se vám zase dívá do očí: jak umělá inteligence mění provoz medicíny

**Představte si dvě návštěvy u lékaře. Při první se doktor během rozhovoru dívá do monitoru, klepe do klávesnice a otázky klade tak trochu přes rameno — protože ví, že každé slovo bude muset zapsat a že po vás čeká dalších dvacet pacientů a hodina papírování večer doma. Při druhé sedí naproti vám, dívá se vám do očí a poslouchá; rozhovor nahrává aplikace v telefonu, která z něj sama vytvoří koncept zprávy. Lékař ho po konzultaci jen zkontroluje a podepíše. Tohle není sci-fi ani příslib do budoucna. Je to nejrychleji se šířící způsob, jak dnes umělá inteligence vstupuje do medicíny — a paradoxně ten, o kterém se mluví nejmíň, protože nezní tak dramaticky jako „AI čte rentgeny“. Přitom právě tady jsou zatím nejpřesvědčivější data o tom, že AI něčemu reálně pomáhá.**

Představte si dvě návštěvy u lékaře. Při první se doktor během rozhovoru dívá do monitoru, klepe do klávesnice a otázky klade tak trochu přes rameno — protože ví, že každé slovo bude muset zapsat a že po vás čeká dalších dvacet pacientů a hodina papírování večer doma. Při druhé sedí naproti vám, dívá se vám do očí a poslouchá; rozhovor nahrává aplikace v telefonu, která z něj sama vytvoří koncept zprávy. Lékař ho po konzultaci jen zkontroluje a podepíše. Tohle není sci-fi ani příslib do budoucna. Je to nejrychleji se šířící způsob, jak dnes umělá inteligence vstupuje do medicíny — a paradoxně ten, o kterém se mluví nejmíň, protože nezní tak dramaticky jako „AI čte rentgeny“. Přitom právě tady jsou zatím nejpřesvědčivější data o tom, že AI něčemu reálně pomáhá.


> [[GRAF: Vstřícná AI v číslech — co už je doloženo a kde je riziko]]
> _Podklad:_ Vstřícná AI v číslech — co už je doloženo a kde je riziko 2,6 mil. konzultací zapsal AI „zapisovatel“ za rok v jediné americké síti Kaiser Permanente, 7 260 lékařů (2023–2024) 38,8 % podíl lékařů s vyhořením po nasazení AI zápisu — z původních 51,9 % studie 6 systémů, JAMA Netw Open 2025 67,6 % českých zdravotnických zařízení už AI používá nebo testuje národní průzkum MZ ČR, únor 2026 ~1 % přepisů od jednoho rozšířeného nástroje obsahovalo zcela vymyšlené věty proto je kontrola lékařem nepřekročitelná Zdroje: počet konzultací a vyhoření z recenzovaných studií (NEJM Catalyst 2025; JAMA Network …
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Tři čtvrtiny lékařova dne nejsou u pacienta

Abychom pochopili, proč je „nudná“ administrativní AI tak zásadní, musíme se podívat, kde se v medicíně ztrácí čas. Řada studií z posledních let opakovaně ukazuje, že lékaři tráví dokumentací a administrativou zhruba stejně času jako přímou péčí o pacienta — a část z toho se přelévá do večerů a víkendů, do takzvané „práce v pyžamu“. Tahle neviditelná zátěž je jedním z hlavních motorů vyhoření, a vyhoření zase odchodů z profese, které si žádný systém — a Česko obzvlášť, vzhledem ke stárnoucím lékařům — nemůže dovolit. Administrativní AI neslibuje, že vyléčí nemoc. Slibuje něco přízemnějšího a v tuto chvíli cennějšího: že vrátí lékaři čas a duševní kapacitu, aby se mohl věnovat tomu, kvůli čemu šel do medicíny.

Tato „první vrstva“ AI má tři velké oblasti, kterými se v tomto díle postupně projdeme. Za prvé **přepis a tvorbu dokumentace** — AI, která poslouchá konzultaci a píše zprávu. Za druhé **provoz a kontakt s pacientem** — chytré zvaní na prevenci, předpovídání, kdo nepřijde, a překlad nálezů do srozumitelné řeči. A za třetí **první kontakt a triáž** — chatboty a „symptom checkery“, kde je naopak důkazů o přínosu nejméně a varování nejvíc. Společným jmenovatelem je, že nejde o stroj, který rozhoduje místo člověka, ale o nástroj, který připravuje podklad — a poslední slovo musí mít vždy zdravotník.


### Zapisovatel, který poslouchá: ambient AI scribes

Nejdál ze všeho je technologie s nezáživným názvem **ambient AI scribe** — doslova „AI zapisovatel z prostředí“. Princip je jednoduchý: mikrofon (typicky aplikace v telefonu na stole) pasivně poslouchá rozhovor lékaře s pacientem. Řeč se přepíše na text a jazykový model z přepisu vytvoří strukturovaný klinický záznam — anamnézu, závěr, návrh dalšího postupu, někdy i návrh receptů a žádanek. Klíčový rozdíl proti diktování je v tom, že lékař nemluví do počítače, ale s pacientem. A klíčové bezpečnostní pravidlo zní: nástroj nestanovuje diagnózu ani léčbu, jen dokumentuje, a lékař koncept **musí zkontrolovat a schválit**.


> [[GRAF: Jak funguje AI zapisovatel — krok za krokem]]
> _Podklad:_ Jak funguje AI zapisovatel — krok za krokem Konzultace probíhá normálně Aplikace na stole nahrává rozhovor. Pacient s nahráváním souhlasí; lékař se může plně věnovat naslouchání místo psaní. Řeč se přepíše na text Model pro rozpoznávání řeči převede mluvené slovo na přepis. Právě tady vzniká první riziko chyb a „přeslechů“. Jazykový model napíše koncept zprávy Z přepisu vznikne strukturovaný záznam: subjektivní potíže, objektivní nález, závěr, plán. Vše ve formě konceptu, ne hotového dokumentu. Lékař koncept kontroluje a opravuje Nepřekročitelný krok. Lékař ověří fakta, doplní, co AI vynechala…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Co o tom víme z dat? Nezvykle hodně, a to i z velmi velkých nasazení. Největší zveřejněná zkušenost pochází ze sítě Kaiser Permanente v Kalifornii: za zhruba rok používalo AI zapisovatele **7 260 lékařů při více než 2,5 milionu konzultací** a odhadovaná úspora času na dokumentaci dosáhla kolem **15 800 hodin**. Důležitější než hodiny jsou ale dopady na lidi: 84 procent lékařů uvedlo, že nástroj zlepšil jejich interakci s pacientem, a téměř polovina pacientů vnímala, že lékař tráví méně času „u obrazovky“. Studie napříč šesti zdravotnickými systémy publikovaná v *JAMA Network Open* v roce 2025 zjistila, že po měsíci používání kleslo vyhoření lékařů **z 51,9 na 38,8 procenta**. Další práce ze sítě Mass General Brigham popsala obdobně velký pokles.


> [[GRAF: vizuální prvek]]
> _Podklad:_ −9,5 % méně času v záznamu s jedním z nástrojů v randomizované studii u druhého nástroje se úspora času neprokázala
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Tady je ale potřeba zabrzdit a oddělit prokázané od marketingového. Většina nadšených čísel pochází z pozorovacích projektů a dotazníků — ne z přísně kontrolovaných pokusů. A když přišel první velký **randomizovaný** test (UCLA Health, 238 lékařů ve čtrnácti oborech, zveřejněný v *NEJM AI* v roce 2025), výsledek byl střízlivější: jeden z nástrojů zkrátil čas strávený v záznamu o 9,5 procenta, zatímco druhý **žádnou statisticky významnou úsporu času nepřinesl**. Oba přitom zlepšily vnímanou zátěž a pohodu lékařů. Poučení je dvojí: prožitek (méně stresu, víc očního kontaktu) se zlepšuje docela spolehlivě, ale „uspoří vám to čas“ neplatí automaticky a závisí na konkrétním nástroji i způsobu nasazení.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

A pak je tu riziko, které se nesmí podcenit: **halucinace**, tedy situace, kdy si AI sebejistě vymyslí něco, co nezaznělo. U přepisových modelů to není teorie. Akademická analýza jednoho velmi rozšířeného nástroje pro rozpoznávání řeči (publikovaná na konferenci ACM FAccT v roce 2024) zjistila, že zhruba **jedno procento přepisů obsahovalo celé vymyšlené věty** — a z nich asi 40 procent bylo potenciálně škodlivých, včetně vymyšlených léků či diagnóz, často vložených do míst, kde pacient jen mlčel. Jiná studie, která nechala obecný jazykový model vytvořit zprávy z nahrávek, napočítala v průměru **23,6 chyby na jeden případ** a 86 procent vynechání. To není důvod technologii zavrhnout — je to důvod, proč je kontrola lékařem absolutní podmínkou a proč regulátoři jako britská NHS od dubna 2025 vyžadují u těchto nástrojů formální posouzení bezpečnosti a ochrany dat.


### Pozvánka, která přijde ve správnou chvíli

Druhá oblast vstřícné AI se točí kolem jednoduché otázky: jak dostat správného pacienta na správné vyšetření ve správný čas. Zní to banálně, ale je za tím obrovský populační potenciál. Screeningové programy — na rakovinu prsu, děložního čípku nebo tlustého střeva — fungují jen tehdy, když na ně lidé skutečně chodí. A neúčast na objednaných termínech (anglicky „no-show“) stojí systém peníze i kapacitu a prodlužuje čekání ostatním. Tady AI nedělá nic geniálního, jen dobře počítá pravděpodobnosti: které pozvané osobě hrozí, že nepřijde, a komu a kdy poslat pozvánku tak, aby zabrala.

Důkazy o predikci neúčasti jsou solidní. Modely strojového učení dokážou označit rizikové termíny překvapivě spolehlivě — jeden pediatrický model zachytil 83 procent budoucích neúčastí při méně než 17 procentech planých poplachů, jiné práce z telemedicíny i stomatologie hlásí přesnost (měřenou ukazatelem AUC) kolem 0,72. Nejsilnějším prediktorem je napříč studiemi prostá věc: kolik termínů člověk zmeškal v minulosti. Co je důležitější — existuje i důkaz, že predikce *něco změní*: v chilské dětské nemocnici spojili předpověď rizika s cíleným telefonátem nejohroženějším rodinám a neúčast klesla o **10,3 procentního bodu** oproti kontrolní skupině.


> [[GRAF: Chytré zvaní a predikce neúčasti — co ukazují studie]]
> _Podklad:_ Chytré zvaní a predikce neúčasti — co ukazují studie Zdroje: NPJ Digital Medicine (2022) pro záchyt neúčasti; Telemedicine Reports (2025) pro AUC; Health Care Management Science (2023) pro pokles neúčasti po intervenci. AUC je technicky bezrozměrný ukazatel rozlišovací schopnosti; zde převeden na procenta jen pro vizuální srovnání.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

U personalizovaného zvaní na prevenci jsou data zatím opatrnější. Randomizovaný experiment ukázal, že zpráva napsaná na míru (ať už AI, nebo formou chatbota) zvyšuje *záměr* jít na screening víc než neosobní expertní leták. Háček je v tom slově „záměr“: studie měřila ochotu, ne to, kolik lidí skutečně dorazilo — a mezi „chci jít“ a „šel jsem“ bývá velký rozdíl. Druhá výhrada je etická a stojí za to ji vyslovit nahlas: modely neúčasti silně váží socioekonomické znaky. Hrozí, že „rizikový pacient“ začne znamenat „chudší pacient“ — a systém, který má rovnat přístup k péči, by ho neměl nevědomky prohlubovat.


### Zpráva, které pacient rozumí

Třetí velká oblast je práce s textem, kterou jazykové modely zvládají nejlépe: shrnovat, přepisovat a překládat. Konkrétně jde o tři věci. **Sumarizaci** — z dlouhé hospitalizace vytvořit koncept propouštěcí zprávy. **Překlad do lidštiny** — odborný nález plný zkratek převést do textu, kterému rozumí pacient bez medicínského vzdělání. A **předvyplnění administrativy** — třeba návrh kódování diagnóz (MKN-10), které je jinak zdlouhavé a chybové.

Důkazy jsou nadějné, ale s jednou velkou hvězdičkou. V kontrolované studii hodnotili zkušení lékaři koncepty propouštěcích dopisů a ty od jazykového modelu obstály v „poskytnutí informace“ lépe než dopisy mladých lékařů — a to bez halucinací. Přehled studií o zjednodušování nálezů zjistil, že AI dokáže srazit čtenářskou náročnost radiologické zprávy z úrovně vysoké školy zhruba na úroveň druhého stupně základní školy. A v onkologii našel jeden model při kontrole dokumentace 97,8 procenta záměrně vložených chyb, zatímco lékaři jen 47,8 procenta. To je obraz AI jako pečlivého korektora, který nikdy není unavený.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 42 % propouštěcích zpráv od AI v jedné studii z urgentu obsahovalo halucinaci jiný typ dokumentu, opačný výsledek — kvalita kolísá
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Ta hvězdička ale není malá. Jiná studie, tentokrát na propouštěcích zprávách z urgentního příjmu, našla u jazykového modelu **42 procent halucinací a 47 procent opomenutí** klinicky důležité informace. Dva protichůdné výsledky u dvou typů dokumentů říkají totéž, co celá tato vrstva AI: kvalita silně závisí na úkolu, na datech i na tom, jak je nástroj zapojený — a bez kontroly člověkem je výstup nepoužitelný. Vstřícná AI je výborný pomocník a mizerný samostatný pracovník.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Chatbot u vchodu: triáž a její meze

Poslední oblast první vrstvy je zároveň ta, kde je nadšení největší a důkazy nejslabší: **symptom checkery**, tedy chatboti, kterým pacient popíše příznaky a oni poradí, co to může být a kam jít. Tady je třeba být obzvlášť opatrný, protože jde o jediné místo, kde AI mluví přímo s laikem bez lékaře mezi tím — a chyba má přímý dopad.

Přesnost těchto nástrojů je dlouhodobě nízká a moc se nelepší. Velký audit 23 symptom checkerů publikovaný v *BMJ* už v roce 2015 zjistil, že správnou diagnózu na prvním místě nabídly jen ve **34 procentech** a správnou míru naléhavosti (triáž) v 57 procentech případů. Novější testy to potvrzují: aplikace Ada měla v jedné studii na urgentním příjmu sice slušnou citlivost v první pětici návrhů, ale 14 procent jejích doporučení ohledně naléhavosti lékaři označili za **nebezpečná**. Obecný chatbot ChatGPT ve verzi 3.5 vykázal v jednom testu dokonce 41 procent nebezpečných triáží. A randomizovaná studie z berlínské Charité nenašla žádné zlepšení spokojenosti ani úzkosti pacientů, kteří před návštěvou použili symptom checker, oproti běžné péči.


> [[GRAF: Symptom checkery: přesnost zůstává nízká (audit 23 nástrojů, %)]]
> _Podklad:_ Symptom checkery: přesnost zůstává nízká (audit 23 nástrojů, %) Zdroje: Semigran et al., BMJ (2015) pro diagnózu a triáž; test obecného chatbota pro podíl nebezpečných triáží. Hodnoty z různých studií, neslouží k přímému srovnání nástrojů, ale ilustrují trvale nízkou spolehlivost.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Jak nebezpečné to může být, ukázal pád firmy **Babylon Health** — kdysi vlajkové lodi britského „digitálního zdraví“. Babylon tvrdil, že jeho chatbot zvládá diagnostiku „lépe než lékař“ (81 procent správně proti 72 procentům u lékařů v jednom testu). Nezávislý rozbor v *The Lancet* z roku 2018 ale konstatoval, že pro takové tvrzení „není přesvědčivý důkaz“ a že systém může být v některých situacích „výrazně horší“. Firma přesto vyrostla na valuaci přes 4 miliardy dolarů — a v září 2023 skončila v likvidaci. Nejnebezpečnější přitom není, když chatbot pošle k lékaři zbytečně. Nebezpečné je falešné uklidnění, které někoho s vážným stavem odradí od péče, dokud není pozdě.

Pozor ale na jeden důležitý rozdíl, ke kterému se vracíme v druhém dílu: tahle nízká spolehlivost platí pro *spotřebitelské* symptom checkery, kterým příznaky popisuje laik. Něco jiného jsou špičkové „uvažovací“ modely pracující se strukturovaným lékařským popisem případu — ty v recenzovaných testech z let 2024–2026 (mj. v časopise *Science*) naopak dosahují úrovně lékařů i nad ni. Je to jiný nástroj, jiný uživatel a jiná evidence; házet je do jednoho pytle vede ke zmatku v obou směrech. Druhý díl série této „uvažující“ AI a otázce, zda může sloužit jako druhý názor, věnuje samostatnou kapitolu.


### Co to znamená pro Česko

Jak na tom je s touto vrstvou AI Česko? Lépe, než by člověk čekal, a zároveň s jednou velkou dírou. Dobrá zpráva nejdřív: podle národního průzkumu ministerstva zdravotnictví z února 2026 už nějakou formu umělé inteligence používá nebo testuje **67,6 procenta zdravotnických zařízení**, v radiologii dokonce 82,9 procenta. Česko má navíc roky fungující digitální základ, na kterém se dá stavět — **eRecept** je povinný od roku 2018 a vystavují se přes něj desítky milionů receptů ročně, takže lékaři i pacienti jsou na elektronické nástroje zvyklí. Vzniká i institucionální zázemí: ministerstvo zřídilo Výbor pro umělou inteligenci ve zdravotnictví a AI počítá s národní strategií i s novou strategií elektronického zdravotnictví na léta 2025–2035.


> [[GRAF: vizuální prvek]]
> _Podklad:_ od 7/2026 teprve tehdy spouští VZP pilot úhrady AI z veřejného pojištění do té doby žádná systémová úhrada neexistuje
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

A teď ta díra: **peníze**. K polovině roku 2026 v Česku neexistuje systémová úhrada umělé inteligence z veřejného zdravotního pojištění. Nemocnice, která chce AI nasadit, ji platí ze svého. Změna se rýsuje — VZP schválila na jaře 2026 metodiku dočasné úhrady a pilotní provoz má začít teprve od července 2026 — ale dokud nebude jasné, kdo a za co zaplatí, zůstane většina nasazení ve fázi pilotů a nadšení jednotlivců. To je důležitý kontext k tomu zářnému číslu 67,6 procenta: „používá nebo testuje“ není totéž co „má v rutinním, financovaném provozu“. Jak v Česku vzniká celá digitální páteř, na kterou se tyhle nástroje napojují, podrobně rozebírá naše série o digitalizaci — od vysvětlení, co digitalizace zdravotnictví vlastně je, až po to, jak spolu systémy mluví přes rozhraní API.


### Kde je háček — a proč „vrácený čas“ není málo

Když to shrneme, vstřícná AI má překvapivě pevné základy, ale i jasné meze, které platí napříč všemi jejími podobami. První mez je **člověk ve smyčce**: ať jde o zprávu, pozvánku, nebo triáž, výstup AI je vždy návrh, který musí někdo zkontrolovat. Druhá je **halucinace** — schopnost modelu sebejistě tvrdit nepravdu — kvůli které se nesmí žádný výstup pouštět dál naslepo. Třetí jsou **data a soukromí**: nahrávky konzultací a zdravotní záznamy patří mezi nejcitlivější osobní údaje vůbec a jejich zpracování přísně hlídá GDPR. A čtvrtá je **regulace**: Evropská unie řadí zdravotnickou AI mezi „vysoce rizikové“ systémy s tvrdými povinnostmi — čemu přesně musí výrobci i nemocnice dostát, jsme rozebrali v samostatném textu o tom, co přináší evropský AI Act do zdravotnictví.

Přesto by byla chyba mávnout nad touhle vrstvou rukou jako nad „pouhou administrativou“. Většina velkých slibů o AI v medicíně — že nahradí radiology nebo objeví zázračné léky — je zatím buď nejistá, nebo daleko. Naproti tomu „lékař, který se vám zase dívá do očí“ je přínos skromný, ale doložený, levný na pochopení a okamžitě citelný pro pacienta i pro vyčerpaný systém. Není to revoluce z titulků. Je to ale možná to nejlepší, co umělá inteligence dnešní medicíně reálně nabízí.

V **druhém díle** série opustíme zázemí a vstoupíme přímo do diagnostiky a léčby: podíváme se, jak si AI vede při čtení mamografů a snímků sítnice, proč je jeden slavný systém na předpověď sepse odstrašujícím příkladem, a kam to dotáhl hon na nová antibiotika proti rezistentním bakteriím — od oceňovaného AlphaFoldu po molekuly, které zatím fungují jen u myší. Jinými slovy: kde AI opravdu léčí a kde zatím jen slibuje.


---

### Zdroje

- Tu SP, et al. Ambient AI Scribes: Learnings after 1 Year and over 2.5 Million Uses. NEJM Catalyst, 2025. — nasazení u 7 260 lékařů, > 2,5 mil. konzultací, ~15 791 ušetřených hodin; 84 % lepší interakce s pacientem. doi.org/10.1056/CAT.25.0040 ↗
- Olson K, et al. Use of Ambient AI Scribes to Reduce Administrative Burden and Professional Burnout. JAMA Network Open, 2025. — vyhoření z 51,9 % na 38,8 % (OR 0,26). doi.org/10.1001/jamanetworkopen.2025.34976 ↗
- Lukac PJ, et al. Ambient AI Scribes in Clinical Practice: A Randomized Trial. NEJM AI, 2025. — RCT (238 lékařů): jeden nástroj −9,5 % času v záznamu, druhý bez významné úspory. doi.org/10.1056/aioa2501000 ↗
- Koenecke A, et al. Careless Whisper: Speech-to-Text Hallucination Harms. ACM FAccT, 2024. — ~1 % přepisů s vymyšlenými větami, ~40 % z nich potenciálně škodlivých. doi.org/10.1145/3630106.3658996 ↗
- Kernberg A, Gold JA, Mohan V. Using ChatGPT-4 to Create Structured Medical Notes From Audio Recordings. J Med Internet Res, 2024;26:e54419. — průměrně 23,6 chyby na případ, 86 % opomenutí. doi.org/10.2196/54419 ↗
- Dunstan J, et al. Predicting no-shows in a pediatric hospital in Chile using machine learning. Health Care Manag Sci, 2023. — predikce + cílený telefonát: neúčast −10,3 procentního bodu. doi.org/10.1007/s10729-022-09626-z ↗
- Liu D, et al. Machine learning approaches to predicting no-shows in pediatric medical appointment. NPJ Digit Med, 2022. — záchyt 83 % neúčastí při < 17 % planých poplachů. doi.org/10.1038/s41746-022-00594-w ↗
- Semigran HL, et al. Evaluation of symptom checkers for self diagnosis and triage: audit study. BMJ, 2015;351:h3480. — správná diagnóza první ve 34 %, triáž v 57 %. doi.org/10.1136/bmj.h3480 ↗
- Fraser H, Coiera E, Wong D. Safety of patient-facing digital symptom checkers. The Lancet, 2018. — k tvrzení Babylonu „lepší než lékař“ není přesvědčivý důkaz. doi.org/10.1016/S0140-6736(18)32819-8 ↗
- Citace recenzovaných článků vycházejí z databáze PubMed (National Library of Medicine, USA); konferenční práce (FAccT) z ACM Digital Library.
- Ministerstvo zdravotnictví ČR — Národní průzkum: umělá inteligence se stává běžnou součástí českého zdravotnictví (únor 2026) — 67,6 % zařízení AI používá/testuje, radiologie 82,9 %. mzd.gov.cz ↗
- VZP — úhradová metodika pro AI a pilotní provoz (od července 2026) — dočasná úhrada zdravotnické AI z veřejného pojištění. vzp.cz ↗
- NHS England — Guidance on the use of AI-enabled ambient scribing products (duben 2025) — požadavek na posouzení bezpečnosti a ochrany dat. england.nhs.uk ↗
- HSPA Monitor — indikátory — eHealth adopce, mamografický screening, kolorektální screening.
- Pozn. k hodnotám: Výsledky studií popisují konkrétní nástroj, prostředí a populaci, ne „umělou inteligenci“ obecně; čísla z různých studií neslouží k přímému srovnání produktů. Údaje o nasazení a úhradách v ČR vycházejí z oficiálních zdrojů (MZ ČR, VZP) aktuálních k červnu 2026 a mohou se rychle měnit. Tento text je osvětový — netýká se konkrétní diagnózy ani volby nástroje pro dané pracoviště.

<!-- Zdroj webu: clanek-ai-zdravotnictvi-1-vstricnost.html · skorezdravotnictvi.cz/clanek-ai-zdravotnictvi-1-vstricnost -->