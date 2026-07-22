---
slug: komplexita-reforem
dil: 1
poradi: 3
audit: verified
stitky: Legislativa a reforma, Řízení systému · Komplexita
---

# Proč se systémy nereformují samy: komplexita, chaos a okno příležitosti

**V prvním díle jsme stavěli logiku změny a v druhém jsme ji učili měřit. Oba texty mlčky předpokládaly cosi optimistického: že když dobře navrhneme opatření a poctivě změříme výsledek, systém se pohne tím směrem, kterým ho tlačíme. Praxe je ale tvrdohlavější. Reformy se schválí a nestane se nic; peníze přitečou a výsledek se nezmění; opatření zabere jinde a jinak, než mělo. Tenhle díl je o tom proč — a je to intelektuální páteř celé série. Bez něj vypadají selhání reforem jako řada náhod nebo selhání jednotlivců. Ve skutečnosti mají společnou příčinu: zdravotnictví je komplexní systém, a komplexní systémy se chovají jinak než stroje.**

V prvním díle jsme stavěli logiku změny a v druhém jsme ji učili měřit. Oba texty mlčky předpokládaly cosi optimistického: že když dobře navrhneme opatření a poctivě změříme výsledek, systém se pohne tím směrem, kterým ho tlačíme. Praxe je ale tvrdohlavější. Reformy se schválí a nestane se nic; peníze přitečou a výsledek se nezmění; opatření zabere jinde a jinak, než mělo. Tenhle díl je o tom *proč* — a je to intelektuální páteř celé série. Bez něj vypadají selhání reforem jako řada náhod nebo selhání jednotlivců. Ve skutečnosti mají společnou příčinu: **zdravotnictví je komplexní systém, a komplexní systémy se chovají jinak než stroje.**


### Složité není totéž co komplexní

Klíčové rozlišení, na kterém všechno stojí, je rozdíl mezi *složitým* (complicated) a *komplexním* (complex). Dopravní letadlo je nesmírně složité — má miliony součástek — ale je **predikovatelné**: stejný vstup dá stejný výstup, a kdo má dost času a expertizy, rozebere ho a zase složí. Provoz na rušné křižovatce je oproti tomu jednoduchý na popis, ale **komplexní** v chování: skládá se z aktérů, kteří se rozhodují sami, reagují jeden na druhého a vytvářejí vzorce, které nikdo nenaplánoval. Letadlo se dá *seřídit*. Křižovatka se dá nanejvýš *ovlivnit*.


> [[GRAF: Dopravní letadlo vs. rušná křižovatka — proč jedna distinkce mění všechno]]
> _Podklad:_ Dopravní letadlo vs. rušná křižovatka — proč jedna distinkce mění všechno Vlastnost Složité (complicated) Komplexní (complex) Příklad Dopravní letadlo, jaderný reaktor, operační sál Provoz na křižovatce, péče o chronicky nemocné, reforma systému Aktéři Pasivní součástky — reagují deterministicky Autonomní agenti — rozhodují a adaptují se Předvídatelnost Vysoká: stejný vstup → stejný výstup Nízká: interakce vytvářejí neplánovatelné vzorce Jak se to „opravuje" Expertní analýza, rozebrat, složit, seřídit Ovlivňovat pravidla a zpětné vazby; počítat s překvapením Správný nástroj Detailní plán, kont…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Tahle distinkce se v manažerské praxi často mapuje na čtyři režimy (rámec, který zpopularizovali Snowden a Boone) — a každý z nich vyžaduje jiný typ zásahu. Zacházet s komplexním problémem nástroji vhodnými pro „složitý" je nejčastější příčina toho, proč reforma selže: na živý, reagující systém se aplikuje detailní plán, jako by šlo o motor.


> [[GRAF: Čtyři režimy problémů — a proč na zdravotnictví nestačí „dobrý plán"]]
> _Podklad:_ Čtyři režimy problémů — a proč na zdravotnictví nestačí „dobrý plán" Jednoduchý Příčina a následek jsou zřejmé. Existuje osvědčený postup.Např. proplacení standardního výkonu podle sazebníku. Postupuj podle pravidla Složitý Vazby existují, ale je třeba expertiza, aby se odhalily.Např. návrh úhradového modelu pro jednu diagnózu. Zavolej experta Komplexní Vazby se ukážou až zpětně; aktéři reagují a mění systém za pochodu.Např. reforma primární péče nebo koordinace mezi zdravotní a sociální oblastí. Zkoušej, sleduj, uč se Chaotický Souvislosti zmizí, je třeba nejdřív stabilizovat.Např. první týdn…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Zdravotnictví jako komplexní adaptivní systém

Že zdravotnictví patří do třetí kolonky, není metafora — je to popis. Plsek a Greenhalgh to ve vlivné sérii v *British Medical Journal* už v roce 2001 shrnuli tak, že ve zdravotní péči jsou *interakce mezi aktéry důležitější než diskrétní činy jednotlivých částí* — a že systém tvoří **autonomní agenti**: lékaři, sestry, pacienti, pojišťovny, kraje, dodavatelé IT. Každý z nich má vlastní cíle, vlastní pravidla a vlastní svobodu rozhodování. Z jejich interakcí vzniká chování celku — tzv. *emergence* — které se nedá odvodit z chování jednotlivce a které nikdo neřídí shora.

Z toho plyne nepříjemná, ale osvobozující věc: v komplexním systému **detailní plán „shora" zpravidla selhává**, protože nedokáže předvídat, jak na něj autonomní aktéři zareagují. Plsek s Greenhalghem proti tomu postavili pojem *minimum specifications* — myšlenku, že jasně daný směr a několik mála pevných pravidel uvolní víc užitečné tvořivosti než stostránkový předpis, který se aktéři stejně naučí obcházet. Reformovat komplexní systém tedy neznamená napsat dokonalou instrukci. Znamená to změnit *pravidla hry a zpětné vazby*, ve kterých se aktéři pohybují — a počítat s tím, že výsledek vás překvapí.


### Emergence a minimum specifications: co z toho plyne pro návrh opatření

Pojmem *emergence* se v teorii komplexních adaptivních systémů označuje vznik vlastností, které nemá žádná část systému sama o sobě — vynoří se teprve z interakcí. Hejno ptáků, které vzdušně tancuje bez dirigenta; dopravní zácpa, která se pohybuje jako entita, i když každé auto jen brzdí za tím před ním; nemocniční nákaza, která se šíří po sítích kontaktů, aniž by to kdokoli naplánoval. Všechno to jsou emergentní jevy: nejsou to chyby systému, jsou to vlastnosti systému.

Pro reformy je z toho nepříjemný důsledek: **složitý centrální plán nevyřeší to, čemu říkáme „selhání systému"**, protože chování systému nevzniká z centrálního místa. Vzniká lokálně, interakcemi mezi aktéry. Přesně to měli na mysli Plsek a Greenhalgh (BMJ 2001), když psali, že „interakce uvnitř komplexního adaptivního systému jsou často důležitější než diskrétní činy jednotlivých částí" a že smysluplný pokrok k náročnému cíli může vzejít z mála, flexibilních, jednoduchých pravidel — tomu říkali *minimum specifications* (minimální specifikace).

Příklad ze zdravotnictví: integrovaná péče o chronicky nemocné pacienty ve fragmentovaném systému. Stostránková vyhláška, která popisuje, kdo komu kdy co předá, se ukáže jako neproveditelná — jsou v ní stovky výjimek, které autoři nepředvídali, a aktéři se ji naučí obcházet přesně tam, kde to nejpohodlněji vyhovuje jejich zájmům. Oproti tomu: pokud se stanoví jen tři pevná pravidla — *pacient má jednoho koordinátora; koordinátor vidí celou historii; výsledek koordinace se vykazuje zvlášť od výkonů* — mohou lokální týmy zbytek organizovat samy, přizpůsobit ho situaci a učit se za pochodu. Emergence pracuje *pro* vás, ne proti vám. Není to laissez-faire: bez onoho jádra pevných pravidel se nic nezmění. Je to ale jiné místo, kde se pravidlo aplikuje — ne do detailu procedury, ale do architektury pobídek.

Emergence má ještě jednu důsledkovou vrstvu, která reformátory překvapuje: **souhrn racionálních individuálních rozhodnutí může vést k iracionálnímu celkovému výsledku**. Každé zdravotnické zařízení, které optimalizuje svůj výkaz výkonů a vyhýbá se případům, u nichž hrozí nízká úhrada nebo komplikace, jedná lokálně racionálně. Celkový výsledek — selektivní příjem pacientů, přesouvání nákladnějších případů jinam, podléčení těch, kteří nejsou „ziskoví" — je emergentní vlastností systému, ne záměrem nikoho konkrétního. Právě proto nestačí obvinit manažery z hledání skulin; je třeba změnit pravidla, z nichž skrze emergenci nevhodný výsledek přirozeně plyne.


### Zpětné vazby a zpoždění: proč se systém „houpe"

Druhá vlastnost komplexních systémů, kterou reformátoři podceňují, je **zpoždění**. Donella Meadows, zakladatelka moderního systémového myšlení, to ilustrovala na obyčejné sprše s pomalým bojlerem: otočíte kohoutkem, voda je studená, přidáte horkou — a protože se teplá voda dostaví se zpožděním, najednou se opaříte, ucuknete, je zima, a oscilace pokračuje. Ne proto, že byste nevěděli, co chcete. Ale proto, že systém reaguje *se zpožděním*, a vy reagujete na zastaralou informaci.

Zdravotnictví je takových smyček plné a zpoždění se v něm počítají na roky. To má dva praktické důsledky. Za prvé: tvrdé výsledky (naděje dožití, mortalita) se hýbou tak pomalu, že řídit se jen jimi znamená řídit podle zpětného zrcátka — proto série v díle o měření trvá na rychlejších „lead" signálech a balancing metrikách. Za druhé: zásah do jedné části systému se vrátí jinde a jindy, než čekáte — a často jako problém, který vypadá nesouvisle s původním rozhodnutím.

Proč systém díky zpoždění osciluje, a ne konverguje? Příčina je v tom, že rozhodovatele při každém zásahu vidí pouze *starý stav* systému — nikoli stav, do kterého předchozí opatření systém právě přivádí. Přidají úhrady, protože čekací doby jsou vysoké; jenže vysoké čekací doby jsou výsledkem rozhodnutí z minulého roku, a úhrady přidávají na objem, který se do statistik promítne až za čtvrtletí. Do té doby se zdá, že zásah nezabírá — a přidá se znovu. Výsledek: přestřelení. Pak přijde restrikce — a totéž na druhou stranu. Meadows takové chování nazývala *oscilací kvůli zpoždění ve smyčce* (delays in feedback loops) a zdůrazňovala, že bez vědomé snahy smyčku *zpomalit* nebo *zpřehlednit* — zkrátit čas od výsledku k informaci — se systém bude houhat dál bez ohledu na záměr aktérů. Tohle je systémová příčina mnoha reformních vln: ne špatná vůle, ale slepota vůči zpožděné zpětné vazbě.


> [[GRAF: Ilustrace zpětné vazby se zpožděním: jak dobře míněný zásah rozhoupe systém]]
> _Podklad:_ Ilustrace zpětné vazby se zpožděním: jak dobře míněný zásah rozhoupe systém Navýšení úhrad Aby se zkrátily čekací doby, přidá se do segmentu více peněz na výkon. Více výkonů Aktéři racionálně reagují na pobídku — objem péče roste rychleji než rozpočet. Vyčerpání rozpočtu Se zpožděním se ukáže, že prostředky došly. Přichází tlak na úspory. Restrikce → a zpět Zavedou se škrty a regulace; čekací doby znovu narostou — a tlak na další navýšení začíná nanovo. Oscilace Ilustrativní smyčka redakce HSPA Monitoru — ukazuje princip oscilace ze zpoždění, není modelem konkrétního opatření. Konkrétní česká …
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Páky změny: na čem se plýtvá pozorností

Pokud detailní plány selhávají a peníze se rozhoupou ve smyčce, kde tedy reforma zabírá? Donella Meadows nabídla slavný (a záměrně provokativní) žebříček *míst, kde lze do systému zasáhnout* — od nejslabších k nejsilnějším. Dole jsou **parametry**: sazby, čísla, výše rozpočtu. Nahoře jsou **zpětné vazby, pravidla, cíle systému** a úplně nejvýš **paradigma** — sdílené přesvědčení o tom, k čemu systém vůbec je. Pointa, kvůli které žebříček vznikl, je nepříjemná: politická i veřejná pozornost se valnou většinou upírá na parametry („přidejme miliardu", „zvedněme sazbu"), tedy na tu *nejslabší* páku — zatímco skutečnou změnu chování přinášejí až pravidla a cíle, na které se dostane nejméně. Meadows sama žebříček označila za „work in progress" — jde tedy o heuristiku, ne zákon. Jako myšlenkový nástroj je ale mimořádně přesný v pojmenování jedné banální pravdy: reálný politický boj o systém probíhá skoro výhradně dole.

Jak jednotlivé úrovně vypadají v praxi zdravotnictví? **Parametry** jsou nejviditelnější: výše úhrad za výkon, limity počtu lůžek, sazba daně na léky. Jsou snadno uchopitelné, mediálně srozumitelné a politicky průchodné — jenže samy o sobě mění jen objem, ne strukturu chování. **Zpětné vazby** jsou o řád silnější: jde o to, zda a jak rychle se informace o výsledku vrátí k tomu, kdo rozhoduje. Nemocnice, která nemá zpětnou vazbu na stav pacientů po propuštění, nemůže ho ani optimalizovat — a nakupovat drahé přístroje zůstává bezpečnější než riskovat s preventivní intervencí, jejíž výsledek přijde za roky. **Pravidla** jdou ještě hlouběji: kdo smí co vykázat, jaká procedura zakládá nárok na úhradu, jak jsou definovány kategorie diagnóz. Mění se obtížně — legislativa, vyhlášky, mezinárodní standardy — ale právě proto mají velký vliv. **Cíle systému** — za co je vlastně placeno — jsou nejdůležitější smluvní úroveň: systém, který platí za objem výkonů, nutně vytváří tlak na objem; systém, který platí za výsledek, generuje tlak na výsledek. A úplně nahoře stojí **paradigma**: sdílené přesvědčení o smyslu systému. Je zdravotnictví pojistka pro případ nemoci, nebo systém pro udržení zdraví? Paradigma se mění nejhůře ze všeho — a když se změní, systém se celý přeskupí, aniž by byl vydán jediný zákon.


> [[GRAF: Páky změny od nejslabší k nejsilnější (podle D. Meadows)]]
> _Podklad:_ Páky změny od nejslabší k nejsilnější (podle D. Meadows) Páka Co to je ve zdravotnictví Síla Parametry Výše úhrad, sazby, rozpočet, počet lůžek Nejslabší — málokdy mění chování Zpětné vazby Jestli se výsledek vrací k tomu, kdo rozhoduje (měření, reporting s následkem) Střední Pravidla Úhradové mechanismy, zákony, kdo smí co vykázat Silná Cíle systému Za co je systém vlastně placen — objem, nebo výsledek? Velmi silná Paradigma Sdílené přesvědčení „k čemu zdravotnictví je" Nejsilnější Volně podle Donelly Meadows, Leverage Points (1999). Žebříček je heuristika — myšlenkový nástroj, ne empiricky v…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Tady se série propojuje: přechod od placení *za objem* k placení *za výsledek*, kterému se věnuje pozdější díl o incentivách, není zásah do parametru — je to zásah do **cíle systému**, tedy do jedné z nejsilnějších pák. Proto je tak těžký a proto na něj „další miliarda" nestačí.


### Atraktory a path dependence: proč systém ulpívá

Komplexní systémy mají sklon usadit se ve stabilních stavech — *atraktorech* — a do nich se vracet, i když jsou z celkového hlediska nevýhodné. Politolog Paul Pierson tomu v politické vědě říká **path dependence** a vysvětluje ji mechanismem *rostoucích výnosů* (increasing returns): jakmile se systém jednou vydá nějakou cestou, každý další krok po ní je levnější a snazší než přechod na jinou — i kdyby ta jiná byla objektivně lepší. Investice, dovednosti, smlouvy, zvyky a očekávání se nabalují kolem zvolené trajektorie a postupně ji zamykají.

Pierson rozlišuje tři mechanismy, které rostoucí výnosy pohánějí a lock-in prohlubují. Prvním jsou **náklady na přechod** (switching costs): čím více aktérů si pořídí dovednosti, smlouvy a technologie kompatibilní se stávající trajektorií, tím dražší je přejít na jinou — i kdyby ta jiná byla objektivně lepší. Druhým je **koordinační efekt**: „síťová hodnota" stávajícího řešení roste tím, jak ho přijímá víc hráčů. Třetím je **adaptivní očekávání**: aktéři počítají s tím, že stávající řešení přetrvá, a proto do něj investují — čímž jeho přetrvání sami potvrzují. Dohromady tyto tři mechanismy vysvětlují, proč reformní okno musí být dostatečně široké: nestačí přesvědčit kritické množství aktérů, aby novou cestou *vykročili*; je třeba přesvědčit je, aby v ní *zůstali* i přes krátkodobé nevýhody přechodu.

Učebnicovým příkladem je **technologický a institucionální lock-in** ve veřejném IT: jakmile se jednou koupí konkrétní systém, náklady na přechod jinam (přeškolení, migrace dat, autorská práva ke kódu) rostou tak, že se zadavatel stává rukojmím první volby. Tomu se podrobně věnuje pozdější díl o datové páteři. Pro tuto chvíli stačí pointa: path dependence vysvětluje, proč se systém nedokáže odpoutat od jednou nastoupené cesty *i tehdy, když všichni souhlasí, že by měl*. Setrvačnost není hloupost aktérů — je to vlastnost systému.

Path dependence má ještě jednu subtilní vrstvu, na kterou Pierson upozorňuje: **politické a ekonomické instituce jsou vůči rostoucím výnosům obzvláště náchylné**, protože jejich „produkty" — pravidla, standardy, kategorie — samy o sobě fungují jako koordinační mechanismy. Jakmile se dostatečný počet aktérů organizuje kolem téhož pravidla (úhradový katalog, diagnostic-related group, kategorie nemocí v klasifikaci MKN), stává se pravidlo samo o sobě hodnotným — ne proto, že je nutně nejlepší, ale proto, že je *sdílené*. Přejít na lepší alternativu by vyžadovalo, aby všichni přešli najednou; kdo přejde sám, ztratí výhody kompatibility. To je přesně situace, ve které se nachází česká úhradová vyhláška rok co rok: každý ví, že model de-facto platí za objem, ne za výsledek, ale unilaterální odklon by jednotlivou pojišťovnu nebo skupinu poskytovatelů systémově znevýhodnil. Reformovat to vyžaduje koordinovaný přechod, tedy silnou a legitimní koordinaci — a ta se v komplexním systému vytváří obtížně.


### Punctuated equilibrium: proč změna přichází ve skocích

Když je systém tak houževnatý, jak se vůbec kdy změní? Politologové Baumgartner a Jones popsali vzorec, který platí napříč oblastmi politiky: **dlouhá období stability přerušená vzácnými skokovými změnami** (punctuated equilibrium). Systém většinu času drží *institucionální tření* (institutional friction) — setrvačnost pravidel, zájmů a rutin. Žádný jednotlivý aktér nechce nést náklady změny, pokud ostatní čekají. Výsledkem je přetrvávající rovnováha, která může být pro všechny suboptimální — ale stabilní. Pak přijde nárazem velká změna a po ní se systém opět usadí. Reformy se tedy nedějí plynule; dějí se ve skocích, mezi kterými je dlouho zdánlivý klid.

Klíčová implikace pro zdravotnictví: **inkrementální tlak v průběhu klidného období málokdy produkuje strukturální změnu** — spíše ji oddaluje, protože zainteresované strany si za tu dobu upevní pozice. Tlak se ale hromadí pod povrchem. Jakmile pak přijde šok, může přeskočit hráz velmi rychle — a v té chvíli záleží na tom, jaká řešení jsou připravena.

Baumgartner a Jones k tomu dodávají jeden klíčový mechanismus: **institucionální tření (institutional friction)** není jen setrvačnost, ale aktivní proces. Ve stabilní fázi dominantní koalice aktérů — poskytovatelé, pojišťovny, odborné společnosti — monitoruje a potlačuje signály, které by problém zpolitizovaly. Nová data jsou zpochybněna, alternativní interpretace marginalizovány, agendu ovládají ti, kteří mají zájem na zachování statu quo. Skoková změna pak nepřichází proto, že se nahromadilo dost argumentů; přichází proto, že šok naruší schopnost dominantní koalice udržet kontrolu nad agendu. Na tomto místě se punctuated equilibrium a Kingdonův model protínají: šok zároveň přepisuje definici problému (*problem stream*) i přeskupuje politické koalice (*politics stream*) — a najednou se dostane ke slovu *policy stream*, kde léta čekají připravená, leč ignorovaná řešení.

Co ten skok spustí? John Kingdon nabídl odpověď, která se stala klasikou: **okno příležitosti** (policy window). Podle něj v politice běží paralelně tři proudy — *problém* (něco se uzná za naléhavé), *řešení* (existuje promyšlený návrh) a *politika* (je vůle a koalice to prosadit). Reforma se neuskuteční, když má někdo dobrý nápad. Uskuteční se ve vzácném okamžiku, kdy se všechny tři proudy **protnou** — a okno se zase rychle zavře. Velmi často je tím, co tři proudy srazí dohromady, vnější šok: fiskální tlak, krize, pandemie.


> [[GRAF: Kingdonovo okno příležitosti: tři proudy, jeden vzácný průnik]]
> _Podklad:_ Kingdonovo okno příležitosti: tři proudy, jeden vzácný průnik Proud Co obsahuje Kdo ho nese Kdy se „otevírá" Problém Téma se uzná za naléhavé — statistiky, krize, stížnosti Média, auditory, NKÚ, EU zprávy Incident, skandál, silná data Řešení Existuje promyšlený, technicky připravený návrh Experti, think-tanky, pilotní projekty Dlouhodobá příprava „v šuplíku" Politika Je vůle, koalice a politický kapitál prosadit změnu Vláda, parlament, klíčoví aktéři Volby, změna vedení, vnější tlak → Okno Průnik všech tří: změna se uskuteční. Okno se otevírá vzácně a rychle se zavírá — typicky vnějším šokem (…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


> [[GRAF: České zdravotnictví ve skocích: stabilita přerušená vnějšími tlaky]]
> _Podklad:_ České zdravotnictví ve skocích: stabilita přerušená vnějšími tlaky 1992–93 Vznik systému veřejného zdravotního pojištění a zdravotních pojišťoven — skoková institucionální změna po roce 1989. 2008 Zavedení regulačních poplatků — politicky vynucená změna pravidel, později z velké části zrušená (oscilace). 2020 Pandemie covid-19 jako vnější šok: strategie Zdraví 2030 byla ještě v roce 2020 aktualizována (posílení veřejného zdraví a digitalizace). Šok otevřel okno Ověřené milníky (vznik pojišťoven 1992–93; regulační poplatky 2008; aktualizace Zdraví 2030 v roce 2020). Ilustruje princip punctuated…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


> [[GRAF: Reforma jako přechod mezi atraktory — ilustrativní metafora]]
> _Podklad:_ Reforma jako přechod mezi atraktory — ilustrativní metafora Krajina atraktorů — ilustrativní model reformního přechodu Stávající stav Nový stav Bariéra tlak / šok Ilustrativní metafora, ne empirický model. Fyzikální představa „krajiny atraktorů" ukazuje logiku, proč systém lpí na stávajícím stavu i tehdy, když je neefektivní — přechod vyžaduje překonání bariéry (náklady na změnu, zájmy, zvyky). Vnější šok celou krajinu „nakloní" a sníží bariéru. Konkrétní číselné parametry nelze z metafory odvozovat.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Pro zvídavé — reforma jako fázový přechod

Fyzikální metafora vystihuje, proč šok funguje. Představte si systém jako kuličku v krajině s několika prohlubněmi (atraktory). Současný neefektivní stav je hluboká prohlubeň: kulička v ní leží, protože okolní „kopečky" (náklady na změnu, zájmy, zvyky) jsou příliš vysoké, než aby ji běžné postrčení dostalo ven.

Vnější tlak — třeba fiskální krize — celou krajinu *nakloní*: sníží bariéru a kulička může přeskočit do jiné prohlubně. Náhodné otřesy (pandemie) pak rozhodnou, kdy přesně k přeskoku dojde. **Je to ilustrativní model, ne výpočet:** ukazuje logiku „proč až šok", nedokazuje konkrétní čísla.


### Co z toho plyne pro reformátora: sedm praktických důsledků

Teorie komplexity by bez praktických implikací zůstala akademickým cvičením. Níže jsou důsledky, které přímo vyplývají z výše popsaných principů — ne jako recept, ale jako orientační mapa pro návrh opatření, alokaci pozornosti a management očekávání.

**1. Neřiďte se jen tvrdými výsledky.** V systémech se zpožděním způsobuje řízení pouze podle lagging indicators (naděje dožití, mortalita) chronické přestřelování. Potřebujete rychlejší zpětné vazby — procesní indikátory, strukturální signály, intermediate outcomes — a kapacitu rozlišit, co je šum a co je systémová změna. Díl o měření to rozkládá podrobněji; zde stačí říci, že bez leadových ukazatelů se reformní rozhodnutí dělají v podstatě naslepo.

**2. Netlačte na parametry — měňte pravidla.** „Přidejme miliardu" nebo „zvedněme normu" jsou politicky srozumitelné zásahy, ale v Meadowsině žebříčku patří na samé dno. Strukturální změnu přinesou teprve pravidla a cíle: co se smí vykázat, co zakládá nárok na úhradu, za co se vlastně platí. Tyto zásahy jsou legislativně náročnější, politicky kontroverznější — a právě proto mají trvalý efekt.

**3. Navrhujte minimum specifications, ne maximální regulaci.** Stostránková vyhláška s výjimkami vytváří iluzi kontroly a reálný prostor pro obcházení. Malý počet pevných, vymahatelných pravidel s jasnou zpětnou vazbou mobilizuje emergentní inteligenci systému. Konkrétně: definujte výstup (výsledek koordinace), ne proces (kdo zavolá komu ve který den).

**4. Počítejte s tím, že zásah způsobí překvapení jinde.** Každá reforma má nechtěné vedlejší účinky — ne proto, že by autoři byli neschopní, ale proto, že v komplexním systému zpětné vazby přenášejí zásah do oblastí, které analýza ex ante nevidí. Smyčky se nevyhneme; můžeme ji zkrátit — budovat systémy rychlého učení, monitorovat ne jen to, co jsme chtěli změnit, ale co se hýbe kolem toho.

**5. Mějte řešení připravené v šuplíku.** Okno se neotevírá na objednávku. Když přijde šok — fiskální krize, pandémie, skandál, volební výsledek — dostane se ke slovu ten, kdo má technicky připravený, legitimizovaný a koaličně zakotvený návrh. Že byla strategie Zdraví 2030 v roce 2020 přepracována, nebylo náhoda: pracovaly na ní expertní skupiny dávno předtím, než covid otevřel politické okno. Inkrementální příprava v klidném období není ztracený čas — je to investice do kapacity využít šok.

**6. Snižujte switching costs pro klíčové přechody.** Reformy, které vyžadují koordinovaný přechod velkého počtu aktérů najednou (nový úhradový model, nová datová architektura, nová klasifikace), narážejí na path dependence nejsilněji. Strategie, která sníží náklady na přechod — pilotní projekty, přechodná financování, záruky kompatibility — snižuje výšku bariéry v krajině atraktorů a zvyšuje pravděpodobnost, že systém skutečně přeskočí do nového stavu místo toho, aby se po vnějším tlaku vrátil zpět.

**7. Reformní selhání není vina jednotlivce.** Nejdůležitější — a politicky nejnepopulárnější — implikace: když reforma selže nebo přinese nečekaný výsledek, příčina je zpravidla systémová, ne personální. Aktéři reagují racionálně na pravidla a zpětné vazby, ve kterých se pohybují. Změnit chování bez změny prostředí, v němž se rozhodují, je lákavá, ale iluzorní strategie. Trest managera nebo ministra může být politicky uspokojivý, ale systemicky nefunkční, pokud zůstanou nezměněny pobídky, které dané chování generovaly.


### Co z toho plyne pro českou reformu

Tři konkrétní závěry, které tvoří most do zbytku série. **Za prvé:** „další miliarda do systému" je zásah do parametru — nejslabší páky. Sama o sobě reformu nedělá, často jen nakrmí existující smyčku a zvýší objem, ne výsledek. Skutečná páka leží v pravidlech a cílech: za co systém platí.

**Za druhé:** vnější šok je doložitelně to, co otevírá okno. Že byla strategie Zdraví 2030 už v roce 2020 přepracována kvůli pandemii, je české punctuated equilibrium jako z učebnice — covid sehnal dohromady proud problému, řešení i politické vůle, který by se jinak míjel roky. Pro reformátora z toho plyne nečekané doporučení: mít *řešení připravené v šuplíku*, aby ve chvíli, kdy se okno otevře, bylo co protlačit. Okna se neotevírají na objednávku a nezůstávají otevřená dlouho.

**Za třetí:** bez politického proudu okno nezůstane otevřené ani u dávno známého problému. Elektronizace zdravotnictví je toho smutným důkazem — problém i řešení jsou na stole roky, a přesto, jak doložil Nejvyšší kontrolní úřad v kontrolní akci 22/20, klíčové projekty nabraly šestileté zpoždění a 159 milionů korun vynaložených na prověřované cíle k jejich splnění nevedlo. Chyběl třetí proud. Tady se zároveň ukazuje path dependence: čím déle systém zůstává v staré trajektorii, tím dražší je z ní vystoupit.

Komplexitu nelze „vyřešit" — dá se s ní jen pracovat poučeněji. Nepsat dokonalé plány, ale měnit pravidla, zpětné vazby a cíle; počítat se zpožděním a oscilací; připravit řešení na chvíli, kdy se otevře okno; a vědět, že setrvačnost není selhání lidí, ale vlastnost systému. Jak takový systém prakticky *zmapovat* a najít v něm konkrétní páky, ukáže následující díl série o systémovém mapování.


---

### Zdroje

- Plsek & Greenhalgh — The challenge of complexity in health care (BMJ, 2001) — zdravotnictví jako CAS; „minimum specifications". doi.org/10.1136/bmj.323.7313.625 ↗
- Snowden & Boone — A Leader's Framework for Decision Making (Harvard Business Review, 2007) — rámec Cynefin (simple/complicated/complex/chaotic). hbr.org ↗
- Donella Meadows — Leverage Points: Places to Intervene in a System (1999) — žebříček pák, sprcha se zpožděním. donellameadows.org ↗
- Donella Meadows — Thinking in Systems (2008) — zpětné vazby, zpoždění, atraktory.
- John Sterman — Business Dynamics / „Learning in and about complex systems" — proč je učení v komplexních systémech pomalé.
- John Kingdon — Agendas, Alternatives, and Public Policies (1984) — tři proudy a okno příležitosti.
- Baumgartner & Jones — Agendas and Instability in American Politics (1993) — punctuated equilibrium, institucionální tření.
- Paul Pierson — Increasing Returns, Path Dependence, and the Study of Politics (APSR, 2000) — proč se systém zamyká do trajektorie. doi.org/10.2307/2586011 ↗
- NKÚ — kontrolní akce 22/20 (Národní strategie elektronického zdravotnictví, 2019–2022) — zpoždění a vynaložené prostředky bez splnění cílů. kontrolní závěr (PDF) ↗
- Zdraví 2030 — Strategický rámec rozvoje péče o zdraví v ČR do roku 2030 — aktualizace v roce 2020. mzd.gov.cz ↗
- Pozn.: Rámce komplexity, systémové dynamiky a politické ekonomie (Meadows, Cynefin) jsou myšlenkové nástroje, ne empiricky validované zákony — text je tak i používá. Tento díl je rozpracovaný draft; česká čísla projdou před publikací ověřením z primárních zdrojů.

<!-- Zdroj webu: clanek-komplexita-reforem.html · skorezdravotnictvi.cz/clanek-komplexita-reforem -->