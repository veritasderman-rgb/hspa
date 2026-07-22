---
slug: ai-zdravotnictvi-2-lecba
dil: 7
poradi: 13
audit: verified
stitky: Digitalizace, Série AI ve zdravotnictví · díl 2/2 · diagnostika a výzkum
---

# Od mamografu k antibiotikům z počítače: kde umělá inteligence léčí a kde zatím jen slibuje

**V prvním díle jsme viděli umělou inteligenci jako tichého pomocníka, který lékaři vrací čas — přepisuje konzultace, zve pacienty na prevenci, píše srozumitelné zprávy. To je vrstva, kterou pacient skoro nevidí. Teď vstupujeme přímo do ordinace a laboratoře: k AI, která se dívá na váš rentgen, počítá riziko z vašeho EKG a hledá molekulu, jež by zabila bakterii odolnou vůči všem dnešním antibiotikům. Je to oblast s největšími sliby — a proto i s největším rozdílem mezi tím, co se píše, a tím, co je doloženo. Projdeme ji od nejpevnějších důkazů k nejvzdálenějším příslibům a u každého kroku si řekneme jednu věc: na jaké úrovni důkazu vlastně stojíme.**

V prvním díle jsme viděli umělou inteligenci jako tichého pomocníka, který lékaři vrací čas — přepisuje konzultace, zve pacienty na prevenci, píše srozumitelné zprávy. To je vrstva, kterou pacient skoro nevidí. Teď vstupujeme přímo do ordinace a laboratoře: k AI, která se dívá na váš rentgen, počítá riziko z vašeho EKG a hledá molekulu, jež by zabila bakterii odolnou vůči všem dnešním antibiotikům. Je to oblast s největšími sliby — a proto i s největším rozdílem mezi tím, co se píše, a tím, co je doloženo. Projdeme ji od nejpevnějších důkazů k nejvzdálenějším příslibům a u každého kroku si řekneme jednu věc: na jaké úrovni důkazu vlastně stojíme.


> [[GRAF: Léčebná AI v číslech — od pevného důkazu k pouhému příslibu]]
> _Podklad:_ Léčebná AI v číslech — od pevného důkazu k pouhému příslibu +29 % více nádorů zachytilo AI-podpořené čtení mamografů v randomizovaném testu studie MASAI, Švédsko (Lancet 2025) −44 % o tolik nižší čtecí zátěž radiologů ve stejném testu jeden snímek navíc čte AI, ne druhý lékař 1,27 mil. úmrtí ročně je přímo přičitatelných rezistenci na antibiotika 2019; proto se hledají nové léky (Lancet 2022) 0 léků navržených umělou inteligencí je zatím schváleno k léčbě nejdál postoupil jeden kandidát do fáze 2 Zdroje: mamografie z randomizované studie MASAI (Lancet, 2023–2026); úmrtí na rezistenci z globáln…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Čtení snímků: kde má AI nejlepší vysvědčení

Začněme tam, kde jsou důkazy nejpevnější — u obrazové diagnostiky. Umělá inteligence pro čtení snímků je hluboká neuronová síť natrénovaná na statisících obrázků (mamografů, rentgenů, snímků sítnice, digitalizovaných vzorků tkáně). Z obrazu počítá skóre rizika nebo vyznačuje podezřelá místa. Pracuje ve třech režimech: jako **triáž** (seřadí nálezy podle naléhavosti), jako **druhé čtení** (asistuje lékaři) a vzácně jako **autonomní diagnóza** (rozhodne sama). Že je radiologie pro AI doménou číslo jedna, ukazuje i regulační statistika: z více než 1 400 nástrojů s umělou inteligencí, které k závěru roku 2025 schválil americký úřad FDA, jsou zhruba **tři čtvrtiny právě z radiologie**.

Korunním důkazem celého oboru je švédská studie **MASAI** — vůbec první velký **randomizovaný** test AI v mamografickém screeningu, tedy zlatý standard, který obvykle u diagnostických nástrojů chybí. Zařadila přes sto tisíc žen a srovnávala obvyklé čtení dvěma radiology s postupem, kde jeden odečet provádí AI. Výsledky vycházely postupně a jsou pozoruhodně konzistentní: AI-podpořené čtení zachytilo na plné kohortě **6,4 nádoru na tisíc žen oproti 5,0** u standardního postupu (tedy zhruba o 29 procent víc), a to **bez nárůstu falešně pozitivních nálezů**. Klíčové je, že v hlavní analýze, zveřejněné na začátku roku 2026, AI nezhoršila to nejdůležitější — počet rakovin přehlédnutých mezi screeningy (tzv. intervalové karcinomy) — a přitom dosáhla vyšší citlivosti (80,5 procenta proti 73,8). A vedlejší přínos je provozně zásadní: **čtecí zátěž radiologů klesla o 44 procent**, protože druhý lidský odečet u většiny snímků nahradila AI.


> [[GRAF: MASAI: AI-podpořené čtení vs. standardní dvojí čtení (záchyt nádorů na 1000 žen)]]
> _Podklad:_ MASAI: AI-podpořené čtení vs. standardní dvojí čtení (záchyt nádorů na 1000 žen) Zdroj: studie MASAI — plná kohorta (Lancet Digital Health, 2025) a hlavní analýza intervalových karcinomů (Lancet, 2026). Vedle vyššího záchytu přinesla AI pokles čtecí zátěže radiologů o 44 %. Jde zatím o jeden region a jeden software — dopad na úmrtnost se teprve sleduje.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Mamografie ale není jediný úspěch. Jediným plně **autonomním** diagnostickým systémem, který kdy americký regulátor povolil — tedy takovým, který vydá výsledek bez lékaře — je nástroj na záchyt **diabetické retinopatie** (poškození sítnice u cukrovkářů) z fotografie oka. V registrační studii dosáhl citlivosti 87,2 a specificity 90,7 procenta a běží přímo v ordinacích praktiků, kde dřív pacient musel k očnímu specialistovi. V **patologii** zase první schválený systém zvýšil záchyt karcinomu prostaty ve vzorcích tkáně, u **cévní mozkové příhody** umí AI na CT během minut upozornit na uzávěr velké tepny a zrychlit cestu pacienta k zákroku, a u **tuberkulózy** Světová zdravotnická organizace už v roce 2021 podmíněně doporučila počítačové čtení rentgenů hrudníku jako alternativu k lidskému odečtu.


### Asistent, ne soudce: rizika diagnostické AI

Tady je ale nutné zchladit nadšení dvěma střízlivými fakty. Za prvé: MASAI je **výjimka, ne pravidlo**. Drtivá většina diagnostických nástrojů s AI byla ověřena jen **retrospektivně** — tedy na starých, archivních datech, kde už se ví, jak to dopadlo. To je mnohem slabší důkaz než prospektivní test na živých pacientech, natož randomizovaná studie. Mezi „náš model měl na archivu 95procentní úspěšnost“ a „v reálném provozu to pacientům pomohlo“ je velká propast a marketingová čísla bývají z té první kategorie.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 67 % septických pacientů nezachytil rozšířený americký AI model v nezávislém testu Epic Sepsis Model, externí validace 2021
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Za druhé: AI v diagnostice má své typické **poruchy**. Výkon modelu padá, jakmile narazí na data z jiného přístroje, jiné nemocnice nebo jiné populace, než na jakých se učil (odborně „dataset shift“) — síť skvělá v jedné nemocnici může být průměrná o ulici dál. A je tu zákeřnější riziko, **automation bias**: člověk má sklon přebírat odpověď stroje i tehdy, když je špatná. V kontrolovaném pokusu chybná rada AI prokazatelně zhoršila přesnost radiologů — a to na všech úrovních zkušenosti, od rezidentů po veterány. Právě proto je dnešní léčebná AI v drtivé většině případů **asistent, ne soudce**: nejlépe funguje jako druhý pár očí pod dohledem člověka, ne jako náhrada jeho úsudku.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Laboratoře a EKG: tichá výstraha — a odstrašující příklad

Mimo obraz se AI nejvíc osvědčila u dat, která jsou sama o sobě čísla nebo křivky — typicky EKG. Tým z americké Mayo Clinic ukázal, že neuronová síť dokáže z běžného elektrokardiogramu odhalit **skrytou slabost srdce** (sníženou funkci levé komory), kterou by lékař z křivky pouhým okem nevyčetl, s rozlišovací schopností (AUC) 0,93. Jiný jejich model předpoví z EKG natočeného v normálním rytmu zvýšené riziko **fibrilace síní**. To je AI v nejlepší roli: vytáhne z rutinního vyšetření signál, který by jinak zůstal skrytý.

Jenže stejná oblast dala medicíně i nejslavnější varování. **Epic Sepsis Model** — komerční nástroj na včasnou předpověď sepse (život ohrožující reakce na infekci) — byl nasazený ve stovkách amerických nemocnic, často s důvěrou v dodavatelem uváděnou přesnost. Když ho ale v roce 2021 nezávisle prověřili na téměř 28 tisících pacientů, výsledek byl tristní: rozlišovací schopnost jen **AUC 0,63** (málo nad náhodou), model **nezachytil 67 procent skutečně septických pacientů** a zároveň spustil planý poplach u 18 procent všech hospitalizovaných. Marketingové AUC 0,76–0,83 se v reálu nepotvrdilo. Je to učebnicový rozdíl mezi „číslem od výrobce“ a nezávislou validací — a důvod, proč by žádná nemocnice neměla AI nasazovat jen na základě brožury.


> [[GRAF: Diagnostická a léčebná AI: čím je vlastně doložena]]
> _Podklad:_ Diagnostická a léčebná AI: čím je vlastně doložena Oblast Co AI dělá Úroveň důkazu Příklad Mamografie druhé čtení screeningu randomizovaná studie (nejvyšší) MASAI (Švédsko) Sítnice (cukrovka) autonomní diagnóza prospektivní studie + schválení FDA IDx-DR EKG odhalí skrytou slabost srdce velké kohorty Mayo Clinic Mrtvice (CT) triáž, urychlení zákroku většinou pozorovací Viz.ai Sepse včasná výstraha selhala v nezávislém testu Epic Sepsis Model Klinické uvažování (text) diagnóza a plán léčby z popisu případu srovnání na případech + RCT (zatím ne v reálném provozu) o1-preview, GPT-4 Čtení tabulky: …
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Druhý názor: AI, která uvažuje jako lékař

Zatím jsme mluvili o AI, která čte obrázky a křivky. Jiná otázka je, jestli umí *uvažovat* jako lékař — z popisu případu navrhnout diagnózu a rozhodnout, co dál. Právě sem dopadla studie, o které se v roce 2026 hodně psalo: tým z Harvardu a Stanfordu otestoval pokročilý „uvažovací“ model OpenAI (o1-preview) na úlohách klinického uvažování a výsledky zveřejnil v časopise *Science*. Jsou působivé — a právě proto si zaslouží číst pozorně, ne jen v titulcích.


> [[GRAF: AI v klinickém uvažování — co studie skutečně naměřila]]
> _Podklad:_ AI v klinickém uvažování — co studie skutečně naměřila 89 % skóre o1 v „management reasoning“ (co s pacientem dál) — lékaři s internetem 34 % 5 expertních případů (Science 2026) 67 % správných diagnóz o1 při vstupní triáži na urgentu — dva lékaři 55 a 50 % 76 reálných případů (Beth Israel, Boston) 0 rozdíl mezi „lékař + AI“ a „AI samotná“ — statisticky nevýznamný randomizovaná studie, Nature Medicine 2025 Zdroje: Brodeur et al., Science (2026) pro o1-preview; Goh et al., Nature Medicine (2025) pro randomizovaný test „lékař + AI“. Plné citace s DOI v sekci Zdroje.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Čísla z té studie v *Science* jsou opravdu silná. Na publikovaných „záludných“ klinických případech dosáhl o1-preview úspěšnosti 88,6 procenta (předchozí model GPT-4 měl 72,9). Při vstupní triáži na urgentu — kdy byly k dispozici jen vitální funkce, základní údaje a krátká poznámka sestry — určil správnou diagnózu častěji (67,1 procenta) než dva atestovaní lékaři (55,3 a 50,0). A nejvíc překvapil v **„management reasoning“**, tedy v rozhodování, co s pacientem po diagnóze (jaké testy, jaká antibiotika, jak vést rozhovor o konci života): tam dosáhl mediánu kolem 89 procent, zatímco lékaři s běžnými pomůckami včetně Googlu jen 34. Zaslepení hodnotitelé navíc často nepoznali, jestli úvahu sepsal člověk, nebo stroj.

Než ale prohlásíme, že „debata skončila“, patří sem dvě věci, které se do nadšených titulků obvykle nevejdou. Za prvé: **jde o uzavřené, textové úlohy, ne o skutečnou ordinaci.** Sami autoři upozorňují, že testovali pouze práci s textem — a reálná medicína je plná netextových signálů: jak pacient vypadá, jak mluví, jak je vyděšený. Výborné skóre na sadě připravených případů není totéž co lepší výsledek u lůžka, a počty případů byly malé (desítky). Mezi „uměl to na testu“ a „pomohlo to pacientům“ je stejná propast, jakou jsme viděli u zobrazovací AI.

Za druhé — a to je možná nejdůležitější zjištění celé oblasti: **dát lékaři chatbota automaticky nezlepší výsledek.** Randomizovaná studie zveřejněná v *Nature Medicine* (2025) rozdala 92 lékařům buď GPT-4 navíc k běžným zdrojům, nebo jen běžné zdroje. Lékaři s AI si vedli lépe (o 6,5 procentního bodu) — ale **nebyli lepší než samotná AI** (rozdíl −0,9 bodu, statisticky nevýznamný). Úzkým hrdlem tedy není schopnost modelu, ale to, jak ho člověk umí zapojit do vlastní úvahy. To je klíčový vzkaz pro každého, kdo chce AI nasadit jako „druhý názor“: nestačí ji lékaři dát do ruky, je potřeba promyslet celý postup.

A pozor na jeden rozdíl: tohle je úplně jiná liga než spotřebitelské „symptom checkery“ z prvního dílu, kterým příznaky popisuje laik a které v testech opakovaně selhávají. Tady jde o špičkový model pracující se strukturovaným lékařským popisem případu. Schopnost je tedy reálná a recenzovaná ve špičkovém časopise; co chybí, je důkaz z reálného provozu, bezpečně navržený postup „druhého názoru“ a jasná odpovědnost za výsledek — přesně to, co řeší evropský AI Act, který diagnostickou AI řadí mezi vysoce rizikové systémy. Jinými slovy: ano, modely jsou nečekaně dobré v uvažování; ne, neznamená to, že zítra budou samostatně řídit léčbu.


### Tiché riziko: deskilling, když se na AI spolehneme až moc


> [[GRAF: vizuální prvek]]
> _Podklad:_ −6 b. o tolik klesl záchyt adenomů u endoskopistů, když pracovali bez AI, na kterou si zvykli z 28,4 % na 22,4 %; Lancet Gastroenterol. Hepatol. 2025
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

A tím se dostáváme k riziku, které je možná nejzávažnější právě proto, že je tiché a pomalé: **deskilling** — oslabení vlastní dovednosti, když ji za nás začne dělat stroj. A nejde jen o obavu na papíře. Polská **pozorovací** studie zveřejněná v roce 2025 v *Lancet Gastroenterology & Hepatology* sledovala endoskopisty ve čtyřech centrech, která zavedla AI na hledání polypů při kolonoskopii. Když pak tíž lékaři dělali kolonoskopii *bez* AI, jejich záchyt adenomů (přednádorových polypů) byl nižší než před zavedením AI — **22,4 oproti 28,4 procenta**, tedy o šest procentních bodů. Autoři z toho opatrně usuzují, že trvalé spoléhání na AI *může* zhoršit návyky endoskopisty. Jde o porovnání „před a po", které samo o sobě příčinu nedokáže (do hry mohou vstoupit i další vlivy) — ale je to varovný signál, který stojí za další ověření.

Druhou tváří téhož problému je **„never-skilling“** — pojem, který v roce 2026 zavedli autoři v *Nature Medicine*: u mediků a začínajících lékařů, kteří se na AI spolehnou hned na začátku, hrozí, že si základní klinické uvažování *nikdy nevybudují*. K tomu se přidává „mis-skilling“, kdy člověk nekriticky převezme i chybu AI jako fakt. Žádný z těchto jevů neznamená, že je AI špatná — znamenají, že o tom, jestli lékaře povýší, nebo postupně vyřadí, rozhoduje způsob a načasování jejího nasazení.

Tohle je potřeba číst společně s předchozí kapitolou. Ano, špičkový model může uvažovat na úrovni lékaře i nad ní — ale právě proto je pokušení přenechat mu úsudek největší a deskilling nejrychlejší. A protože AI občas tiše selže (vzpomeňme na model na sepsi nebo na pokles výkonu na cizích datech), potřebujeme lékaře, kteří si *udrželi* schopnost ji zkontrolovat a v případě potřeby převzít otěže. Pokud se o tuhle schopnost připravíme, vyměníme dnešní omyly jednotlivého lékaře za zítřejší systémovou slepou skvrnu — a ta se napravuje mnohem hůř.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Hon na nová antibiotika: naděje, která zatím běhá po myších

Teď se dostáváme k nejvzrušující — a nejméně doložené — části. Svět zoufale potřebuje nová antibiotika. Bakterie odolné vůči stávajícím lékům způsobily v roce 2019 odhadem **1,27 milionu úmrtí přímo** a podílely se na dalších bezmála pěti milionech. Přitom desítky let nevznikla žádná zásadně nová třída antibiotik — vyvíjet je je drahé a pro farmaceutické firmy málo výnosné. A právě sem vkládá medicína velkou naději do umělé inteligence.

Jak to funguje? Model se naučí na tisících změřených molekul, které bakterie zabíjejí nebo nezabíjejí, a pak dokáže **předpovědět účinek pro miliony dalších, netestovaných sloučenin** — během dní, ne let. Lidé pak v laboratoři ověří jen malý vybraný zlomek. Příbuznou revolucí je **AlphaFold** od DeepMindu: program, který z pořadí aminokyselin předpoví trojrozměrný tvar bílkoviny — a tvar určuje funkci i to, kam může lék zapadnout. Jeho databáze dnes pokrývá přes 200 milionů struktur a v roce 2024 za něj jeho tvůrci dostali **Nobelovu cenu za chemii**. To je skutečný, oceněný vědecký nástroj, ne hype.


> [[GRAF: Od 100 milionů molekul k antibiotiku — a proč to ještě není lék]]
> _Podklad:_ Od 100 milionů molekul k antibiotiku — a proč to ještě není lék Model se učí na známých molekulách Síť dostane tisíce sloučenin s informací, zda bakterii zabíjejí. Naučí se vzory, které lidské oko nevidí. Proskenuje stovky milionů kandidátů Antibiotikum halicin vzešlo z předpovědi přes 107 milionů molekul — to by žádná laboratoř ručně nestihla. Vybere hrstku nadějných látek Z milionů zůstanou desítky kandidátů, které stojí za fyzické otestování v laboratoři. Účinek v misce a u myší Halicin, abaucin i nová třída proti MRSA zabíjejí bakterie in vitro a léčí infekce u myší. Tady končí dnešní důka…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Konkrétní výsledky znějí jako z titulků — a jsou skutečné. **Halicin**, objevený na MIT díky předpovědi přes 107 milionů molekul, je strukturně nové antibiotikum účinné proti řadě bakterií. **Abaucin** cílí na *Acinetobacter baumannii*, jednu z nejobávanějších nemocničních bakterií. A v roce 2023 našla „vysvětlitelná“ neuronová síť úplně novou strukturní třídu látek proti zlatému stafylokoku odolnému na meticilin (MRSA). Všechny tři jsou reálné vědecké úspěchy. A u všech tří platí totéž zásadní „ale“: **fungují zatím jen v laboratorní misce a u myší.** Žádné z nich nedostal jediný člověk jako léčbu.


### Proč zatím žádný „AI lék“ nekoupíte

Tady je potřeba být úplně přímý, protože právě v téhle oblasti je propast mezi sliby a realitou největší. K polovině roku 2026 **není schválen žádný lék, který by navrhla umělá inteligence** — ani jedno antibiotikum, ani nic jiného. Nejdál postoupila molekula proti plicní fibróze od firmy Insilico Medicine, a i ta je teprve ve **druhé ze tří** klinických fází. Některé hvězdy oboru přitom couvají: firma Exscientia, donedávna vlajková loď „AI návrhu léků“, v roce 2024 propouštěla, zúžila projekty a nakonec ji pohltil konkurent, který pak několik programů ukončil.

Neznamená to, že je AI v objevu léků slepá ulička — spíš že je na začátku dlouhé cesty. Vývoj léku trvá typicky deset let a stojí miliardy; i kdyby AI dramaticky zrychlila první kroky (a leccos naznačuje, že může), čekání na klinické důkazy zkrátit nedokáže — testy bezpečnosti a účinnosti na lidech prostě trvají. Rozumný postoj tedy zní: brát objev nových molekul jako reálný a vzrušující směr, ale každé tvrzení o „zázračném AI léku“ poměřovat jednoduchou otázkou — *v jaké je fázi testů na lidech?* Když je odpověď „zatím v žádné“, je to věda, ne ještě medicína.


### Co to znamená pro Česko

Pro Česko má tahle vrstva dvě roviny — co se tu reálně používá a proč na výzkumu antibiotik záleží zrovna u nás. Začněme nasazením: v diagnostice už AI v českých nemocnicích není exotikou. Domácí systém **Carebot** na čtení rentgenů hrudníku má evropskou certifikaci zdravotnického prostředku a podle ministerstva zdravotnictví analyzoval přes **16 tisíc snímků v devíti nemocnicích a pomohl odhalit 56 nových nádorů**. Český **Kardi AI** hlídá srdeční rytmus z EKG, fakultní nemocnice Motol nasadila AI ke zrychlení vyšetření na magnetické rezonanci. To přesně odpovídá světovému vzorci, kde AI vede radiologie a kardiologie.

Druhá rovina je naléhavější, než se zdá. Hon na nová antibiotika není akademická hra ani pro Česko — a dashboard HSPA Monitoru to ukazuje černé na bílém. Rezistence bakterie *Acinetobacter* na karbapenemy, tedy na „záložní“ antibiotika posledních linií, dosahuje v ČR **25,5 procenta** — a je to přesně ten druh bakterie, na kterou míří AI-objevený abaucin. U zlatého stafylokoka je odolnost vůči meticilinu (MRSA) na 9,3 procenta, u klebsiely na karbapenemy zatím na nižších 2,2 procenta. Česko má přitom v mezinárodním srovnání rozumnou spotřebu antibiotik — jak v humánní medicíně, tak ve veterině — což rezistenci brzdí. Ale i tak platí: každé nové antibiotikum, ať z laboratoře, nebo z počítače, se bude jednou počítat i tady.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 25,5 % rezistence Acinetobacter na karbapenemy v ČR — záložní antibiotika selhávají přesně tuto bakterii cílí AI-objevený abaucin (zatím u myší)
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

A nakonec peníze a pravidla, která platí pro obě roviny stejně jako pro vstřícnou AI z prvního dílu. Diagnostická AI je v Evropské unii „vysoce rizikový“ systém s tvrdými povinnostmi — co to znamená pro výrobce i nemocnice, rozebírá náš text o evropském AI Actu ve zdravotnictví. A jako u všeho v českém zdravotnictví nakonec rozhoduje úhrada: dokud nezačne pojišťovna AI platit (pilot VZP startuje teprve v polovině roku 2026), zůstane i ta nejlépe doložená diagnostika spíš v pilotech než v plošném provozu.


> [[GRAF: vizuální prvek]]
> _Podklad:_ 
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Tečka: prokázané, slibované, vymyšlené

Když celou sérii zúžíme do jediné myšlenky, zní takto: o umělé inteligenci v medicíně se nedá mluvit paušálně, protože pod jedním slovem se skrývají tři velmi rozdílné světy. Je tu AI **prokázaná** — tichý pomocník, který vrací lékaři čas, a druhé čtení mamografů, kde existuje randomizovaný důkaz. Je tu AI **slibovaná** — antibiotika z počítače a nové léky, které fungují u myší a čekají na první pacienty. A je tu AI, jejíž čísla jsou **vymyšlená** v doslovném smyslu — halucinace v přepisu i marketingová přesnost, která se v nezávislém testu rozplyne.

Dobrý zdravotní systém — a dobrý čtenář — pozná, ve kterém z těch tří světů se zrovna pohybuje. Nejde o to být nadšenec, ani skeptik. Jde o to u každého nového nástroje položit tři otázky: *Co přesně dělá? Na jaké úrovni důkazu to stojí? A kdo nese odpovědnost, když se splete?* Umělá inteligence medicínu nezachrání ze dne na den, ale na pár konkrétních místech jí už dnes prokazatelně pomáhá. Zbytek je práce — a u léků ještě roky testů. A nad celou debatou by mělo viset jedno varování: největším rizikem nemusí být to, že je AI příliš slabá, ale to, že se na ni spolehneme natolik, až ztratíme vlastní schopnost ji zkontrolovat. Kdo začal prvním dílem, ví, že ten nejjistější přínos je zatím překvapivě skromný: lékař, který se vám zase dívá do očí.


---

### Zdroje

- Lång K, et al. AI-supported screen reading versus standard double reading in the MASAI trial: clinical safety analysis. Lancet Oncology, 2023;24(8):936–944. — detekce 6,1 vs 5,1/1000; čtecí zátěž −44,3 %. doi.org/10.1016/S1470-2045(23)00298-X ↗
- Hernström V, et al. Screening performance of AI-supported mammography (MASAI), full cohort. Lancet Digital Health, 2025;7(3):e175–e183. — 6,4 vs 5,0/1000 (poměr 1,29). doi.org/10.1016/S2589-7500(24)00267-X ↗
- Gommers J, et al. Interval cancer, sensitivity and specificity in the MASAI trial. Lancet, 2026;407(10527):505–514. — senzitivita 80,5 % vs 73,8 %, specificita 98,5 %. doi.org/10.1016/S0140-6736(25)02464-X ↗
- Abràmoff MD, et al. Pivotal trial of an autonomous AI-based diagnostic system for diabetic retinopathy. npj Digital Medicine, 2018;1:39. — autonomní dg., senzitivita 87,2 %, specificita 90,7 %. doi.org/10.1038/s41746-018-0040-6 ↗
- Yang Y, et al. The limits of fair medical imaging AI in real-world generalization. Nature Medicine, 2024;30(10):2838–2848. — pokles výkonu při změně přístroje/populace (dataset shift). doi.org/10.1038/s41591-024-03113-4 ↗
- Dratsch T, et al. Automation Bias in Mammography: The Impact of AI Suggestions on Reader Performance. Radiology, 2023. — chybná rada AI zhoršila radiology na všech úrovních. doi.org/10.1148/radiol.222176 ↗
- Attia ZI, et al. Screening for cardiac contractile dysfunction using an AI-enabled ECG. Nature Medicine, 2019;25(1):70–74. — skrytá dysfunkce levé komory, AUC 0,93. doi.org/10.1038/s41591-018-0240-2 ↗
- Wong A, et al. External Validation of a Widely Implemented Proprietary Sepsis Prediction Model (Epic). JAMA Internal Medicine, 2021;181(8):1065–1070. — AUC 0,63, nezachytil 67 % septických. doi.org/10.1001/jamainternmed.2021.2626 ↗
- Antimicrobial Resistance Collaborators (Murray CJL, et al.). Global burden of bacterial antimicrobial resistance in 2019. The Lancet, 2022;399(10325):629–655. — 1,27 mil. úmrtí přímo přičitatelných rezistenci. doi.org/10.1016/S0140-6736(21)02724-0 ↗
- Jumper J, et al. Highly accurate protein structure prediction with AlphaFold. Nature, 2021;596:583–589. — predikce struktury proteinů (Nobelova cena za chemii 2024). doi.org/10.1038/s41586-021-03819-2 ↗
- Stokes JM, et al. A Deep Learning Approach to Antibiotic Discovery (halicin). Cell, 2020;180(4):688–702. — předpověď přes 107 mil. molekul; účinek in vitro a u myší. doi.org/10.1016/j.cell.2020.01.021 ↗
- Liu G, et al. Deep learning-guided discovery of an antibiotic targeting Acinetobacter baumannii (abaucin). Nature Chemical Biology, 2023;19(11):1342–1350. — účinek pouze u myší (preklinika). doi.org/10.1038/s41589-023-01349-8 ↗
- Wong F, et al. Discovery of a structural class of antibiotics with explainable deep learning (anti-MRSA). Nature, 2023;626:177–185. — nová třída proti MRSA, účinek u myší. doi.org/10.1038/s41586-023-06887-8 ↗
- Brodeur PG, et al. Performance of a large language model on the reasoning tasks of a physician. Science, 2026. — o1-preview: triáž na urgentu 67,1 % vs lékaři 55,3/50,0 %; publikované CPC případy 88,6 % (GPT-4 72,9); „management reasoning“ ~89 % vs lékaři 34 %; výstupy nerozeznatelné od lidských. Jen textové úlohy (limitace uvedená autory). doi.org/10.1126/science.adz4433 ↗
- Goh E, et al. GPT-4 assistance for improvement of physician performance on patient care tasks: a randomized controlled trial. Nature Medicine, 2025;31(4):1233–1238. — lékaři s GPT-4 +6,5 b. vs konvenční zdroje, ale „lékař + AI“ nebyl lepší než „AI samotná“ (−0,9 b., p=0,8). doi.org/10.1038/s41591-024-03456-y ↗
- Budzyń K, et al. Endoscopist deskilling risk after exposure to artificial intelligence in colonoscopy: a multicentre, observational study. Lancet Gastroenterology & Hepatology, 2025;10(10):896–903. — pozorovací before/after studie: záchyt adenomů při kolonoskopii bez AI byl po expozici AI nižší (22,4 vs 28,4 %, −6 p.b., p=0,0089); autoři usuzují na možný deskilling, nikoli prokázanou příčinu. doi.org/10.1016/S2468-1253(25)00133-5 ↗
- Ke Y, et al. AI-induced never-skilling in medical education. Nature Medicine, 2026;32(6):1997–2006. — koncept „never-skilling“ (medici si dovednost nikdy nevybudují) a „mis-skilling“; rámec ochrany kompetencí. doi.org/10.1038/s41591-026-04438-y ↗
- Citace recenzovaných článků vycházejí z databáze PubMed (National Library of Medicine, USA); studie v Science je citována přímo dle vydavatele.
- HSPA Monitor — indikátory — mamografický screening, rezistence Acinetobacter, MRSA, spotřeba antibiotik.
- Ministerstvo zdravotnictví ČR — nasazení AI v nemocnicích (2025–2026) — Carebot: ~16 030 snímků v 9 nemocnicích, 56 nově odhalených nádorů; Kardi AI; FN Motol (AI-MRI). mzd.gov.cz ↗
- WHO — Use of computer-aided detection software for tuberculosis screening (2021) — podmíněné doporučení AI čtení RTG hrudníku. who.int ↗
- FDA — Artificial Intelligence-Enabled Medical Devices — > 1 400 schválených nástrojů, ~76 % radiologie. fda.gov ↗
- Pozn. k hodnotám: Výsledky studií popisují konkrétní nástroj a populaci, ne „umělou inteligenci“ obecně. Antibiotika halicin, abaucin a třída proti MRSA jsou ve fázi laboratorních a zvířecích experimentů — nejde o schválené léky. Údaje o nasazení a počtech (FDA, ČR) pocházejí z oficiálních zdrojů a odborných přehledů aktuálních k červnu 2026 a mohou se měnit. Tento text je osvětový — netýká se konkrétní diagnózy ani volby léčby.

<!-- Zdroj webu: clanek-ai-zdravotnictvi-2-lecba.html · skorezdravotnictvi.cz/clanek-ai-zdravotnictvi-2-lecba -->