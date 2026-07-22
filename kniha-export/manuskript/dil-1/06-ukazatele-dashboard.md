---
slug: ukazatele-dashboard
dil: 1
poradi: 6
audit: verified
stitky: Legislativa a reforma, Řízení systému · Data
---

# Ukazatele a dashboard, který vede k akci: méně metrik, ale ty správné

**Pro koho je tento text: pro analytiky, medical directors, management nemocnic, pojišťovny i ministerstvo. V díle o řízení podle výsledků jsme řekli, že měření se láme v řízení až tam, kde číslo mění rozhodnutí. A v díle o mapování, že z nalezených pák se stávají hypotézy. Dashboard je místo, kde se tyhle hypotézy převedou na čísla, podle kterých se reálně jedná. Postavit ho špatně je snadné; postavit ho tak, aby vedl k akci, je řemeslo.**

*Pro koho je tento text:* pro analytiky, medical directors, management nemocnic, pojišťovny i ministerstvo. V díle o řízení podle výsledků jsme řekli, že měření se láme v řízení až tam, kde číslo mění rozhodnutí. A v díle o mapování, že z nalezených pák se stávají hypotézy. Dashboard je místo, kde se tyhle hypotézy převedou na čísla, podle kterých se reálně jedná. Postavit ho špatně je snadné; postavit ho tak, aby vedl k akci, je řemeslo.


### Méně bývá víc: proč přebytek metrik škodí

Intuice velí: čím víc měříme, tím líp řídíme. Praxe je opačná. Společný projekt Evropské observatoře, OECD a WHO Europe k tzv. „policy-friendly" dashboardu zdůrazňuje, že záměr soustředit ukazatele do malé, politicky relevantní podmnožiny **zlepšuje použitelnost pro rozhodování** — a naopak příliš mnoho metrik ji zásadně snižuje. Pozornost se rozmělní, nikdo neví, co je skutečně důležité, a dashboard se stane archivem, ne nástrojem.

Řídicí sada proto nemá být encyklopedická; má být *operační*. Vše ostatní — dílčí analýzy, metodické karty, archiv časových řad — je referenční materiál, který se vytáhne, až když řídicí ukazatel zabliká.

Tomuhle malému jádru se říká *tracer* ukazatele — „stopové" metriky, které zastupují zdraví celého systému, podobně jako pár krevních testů zastupuje stav celého těla. Výběr tracer sady je nejdůležitější rozhodnutí celého dashboardu — a zároveň to nejméně algoritmické. Ani sebelepší metodika vám nerozhodne, co váš systém potřebuje sledovat; to je strategická volba.


### Jak tracer ukazatele vybírat: tři rozhodující otázky

Výběr tracer sady se v praxi řídí třemi otázkami, které musí každý kandidát projít — nikoli jednou, ale v tomto pořadí:

**1. Mění se to rozhodnutím?** Ukazatel, jehož výsledek nemůže ovlivnit nikdo, kdo sedí u stolu, kde se dashboard čte, v řídicí sadě nemá co dělat. Průměrný věk populace je zajímavá epidemiologická data, ale nikoli tracer metrika pro management nemocnice. Testovacím kritériem je: kdyby číslo zablikalo červeně, víme, *kdo* by měl co udělat?

**2. Reaguje v rozumném čase?** Různé metriky mají různou „reakční dobu". Pětileté přežití po diagnóze rakoviny je výborný outcome indikátor — ale v řídicím dashboardu pro čtvrtletní review je prakticky nepoužitelný, protože zpětná vazba přijde příliš pozdě na jakoukoliv korekci. Tracer sada potřebuje alespoň jeden ukazatel s dostatečně krátkým zpožděním, aby byl schopen potvrdit nebo vyvrátit zásah v aktuálním reviewovém cyklu.

**3. Je odolný vůči manipulaci?** Každá metrika, která se stane terčem, nese riziko, že bude optimalizována i za cenu poškození toho, co skutečně měla měřit. Goodhartův zákon to formuluje ostře: *jakmile se z metriky stane terč, přestává být dobrou metrikou*. Tracer ukazatele proto volíme tak, aby celá sada jako systém odhalila přesměrování úsilí — k tomu slouží balancing a equity metriky popsané níže.


> [[GRAF: Kritéria výběru tracer ukazatele — SMART v kontextu dashboardu]]
> _Podklad:_ Kritéria výběru tracer ukazatele — SMART v kontextu dashboardu Kritérium Otázka Typická past Ovlivnitelnost Kdo u stolu s tím může něco udělat? Demografické ukazatele (věk, pohlaví) — zajímavé, ale nereaktivní Reakční čas Kdy přijde zpětná vazba po zásahu? Mortalita po 5 letech — skvělý outcome, ale pozdní zpětná vazba Odolnost vůči gamingu Je metriku těžké obejít bez poškození jiného ukazatele? Izolované čekací doby — zkrácení jedné fronty přelévá tlak jinam Datová dostupnost Lze číst v relevantní frekvenci (měsíc / čtvrtletí)? Výsledky dotazníků kvality života — cenné, ale sběr bývá roční Sr…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Čtyři typy ukazatelů — a proč potřebujete všechny

Sada složená jen z výsledkových metrik je zranitelná: jak varoval Goodhartův zákon, jakmile se z metriky stane terč, začne se obcházet. Obranou je mix **čtyř typů**, kde se navzájem hlídají. Každý typ zodpovídá jinou otázku a odhaluje jiný způsob, jak může systém selhat — nebo jak může být výsledek uměle vylepšen na úkor jiné dimenze.


> [[GRAF: Čtyři typy ukazatelů v řídicí sadě]]
> _Podklad:_ Čtyři typy ukazatelů v řídicí sadě Typ Na co odpovídá Příklad (ilustrativní) Čím se obchází Výsledkový (outcome) Dosáhli jsme toho, kvůli čemu to děláme? Přežití, odklonitelná mortalita, kvalita života Výběr méně nemocných pacientů (cream skimming); přeřazení na nižší DRG Procesní (process) Děláme správné věci správně? Door-to-treatment, pokrytí screeningem, adherence ke guidelines Formální splnění (zaškrtnutí políčka) bez věcné změny praxe; exception reporting Balancing Co se přitom může zhoršit? Readmise, čekací doby v jiné oblasti, náklady na výkon Těžko obejít, pokud je sada nastavena tak,…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Příklad ze švédské praxe (ilustrativní): jednou z rolí tamních národních kvalitních registrů — v zemi jich operuje přes sto — je právě tato vzájemná kontrola typů ukazatelů. Registr pro srdeční selhání (RiksSvikt) sleduje vedle mortalitních výsledků i procesní indikátory jako zahájení doporučené medikace a equity dimenzi v podobě adherence ke guidelines napříč nemocnicemi různých velikostí. Bez všech tří by šlo jen o část obrazu.


### Antivzor: vanity metrics a dashboard jako dekorace

Praxe zná dva typické selhání, která se navzájem posilují.

**Vanity metrics** jsou ukazatele, které vypadají impozantně, ale k řízení nic nepřidají. Počet provedených výkonů, podíl elektronicky vykázaných dokladů, průměrná délka ošetřovací doby sledovaná bez kontextu závažnosti — to vše může být relevantní v jiném analytickém kontextu, ale jako součást řídicí sady generuje jen falešný pocit přehledu. Snadno stoupají, protože se nikdo nesnaží je obejít — jenže klesají stejně neprůkazně.

**Dashboard jako dekorace** je selhání organizační, ne metodické. Jde o situaci, kdy je sada metrik technicky vzorově sestavena, ale porada ji zpracovává jako rituál: čte se pořadí, zaznamená se „červená", a tím to hasne. Bez předem sjednané odpovědi — kdo, co a do kdy — je sebelepší dashboard jen estetický přehled. Přesně o tomto pojednává „uzavření smyčky", které jsme popsali v díle o results-based management.


> [[GRAF: Spektrum gamingu a pojistky — od snadné manipulace k odolné sadě]]
> _Podklad:_ Spektrum gamingu a pojistky — od snadné manipulace k odolné sadě Typ selhání Mechanismus Pojistka Výběr lehkých případů Pracoviště odmítá (nebo odkládá) těžké pacienty, čímž „zlepšuje" surové výsledky Risk adjustment; funnel plot (viz níže) Exception reporting Formálně správné splnění procesního ukazatele bez věcné změny (zaškrtávání políček v EIS) Výsledkový ukazatel jako protizávaží; namátková auditní kontrola Přelévání Zlepšení jedné metriky přeleje tlak na jinou oblast (kratší hospitalizace → vyšší readmise) Balancing metrika zachytí readmise v sadě Skrytá nerovnost Průměrné číslo vypadá d…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Risk adjustment: proč surová čísla lžou a jak to napravit

**Proč nestačí surový výsledek.** Srovnávat pracoviště podle „surového" výsledku — například procentem pacientů propuštěných domů po plánované operaci — je nespravedlivé i nebezpečné. Centrum, které bere nejtěžší případy, bude mít horší čísla jednoduše proto, že léčí jiné pacienty. Pokud se podle takových čísel trestá, naučí se *cream-skimmingu*: vyhýbat se rizikovým pacientům, nebo je odkládat. Výsledek: průměrná čísla v systému se zlepší, ale ti, co péči nejvíc potřebují, ji nedostanou. Bez očištění o závažnost případů dashboard nejen lže, ale aktivně kazí chování.

**Co je risk adjustment.** Jde o statistické postupy, které „vytáhnou" z výsledku část vysvětlenou charakteristikami pacienta — věk, komorbidity, závažnost vstupního stavu — a nechají viditelnou jen tu část, kterou může ovlivnit poskytovatel. Výsledkem je „očištěný" výsledek, který říká: při srovnatelné záži pacientů, jak si pracoviště vedlo? Toto srovnání je základem smysluplného benchmarkingu.

**Funnel plot jako nástroj férového srovnání.** Klasickým grafickým nástrojem pro srovnání poskytovatelů po risk adjustmentu je *funnel plot*, přesně popsaný Davide Spiegelhalterem v publikaci z roku 2005. Klíčový princip: menší pracoviště mají přirozeně větší statistický rozptyl výsledků — i bez jakéhokoli selhání čistě proto, že vzorkují méně pacientů. Funnel plot tento rozptyl respektuje: kolem průměrné hodnoty (osa x = objem práce) se vykreslí trychtýřové hranice (funnels), které jsou pro malá pracoviště široké a pro velká úzké. Teprve případ, který tyto hranice přesáhne, je skutečným signálem k vyšetření — ne pouhý artefakt velikosti.


> [[GRAF: Funnel plot vs. ligová tabulka — proč záleží na metodě srovnání]]
> _Podklad:_ Funnel plot vs. ligová tabulka — proč záleží na metodě srovnání Aspekt Ligová tabulka (surové pořadí) Funnel plot (po risk adjustmentu) Malé pracoviště s dobrými výsledky Skoro vždy dole — malý vzorek, vysoký rozptyl Spadá do „normálního" pásma — není falešně stigmatizováno Velké centrum s průměrnými výsledky Vypadá průměrně Přesné — velký vzorek, úzká mez, každá odchylka je viditelná Centrum s rizikovými pacienty Dole — trestáno za těžší mix Výsledek se očistí o závažnost, srovnání je férovější Skutečný outlier Smíchán s ostatními, těžko odlišit signál od šumu Vyčnívá za trychtýřovou mez — ja…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Funnel plot je tedy anti-ligová tabulka: místo spuriózního žebříčku dává smysluplný signál. Spiegelhalter ho označuje jako „atraktivně jednoduchý" nástroj, který se vyhnul jednomu z nejzávažnějších problémů srovnávání institucí — umělému pořadí způsobenému statistickým šumem.


### Data lag a lead/lag indikátory: řídit v tempu změny

**Data lag (zpoždění dat).** Z dílu o komplexitě víme, že tvrdé výsledky se hýbou roky. Řídit se jen jimi znamená řídit podle zpětného zrcátka: vidíte, kam jste šli, ne kam jedete. Každý ukazatel řídicí sady musí být doprovázen metadatem, které říká: jak dlouhý je typický lag mezi intervencí a měřitelnou odezvou tohoto ukazatele?

**Lead indikátory** jsou rychlejší procesní signály, které korelují s budoucím výsledkem, ale reagují dříve. **Lag indikátory** jsou samotné outcome metriky — cenné pro potvrzení správné cesty, ale pomalé pro korekci kurzu. Dobře sestavená řídicí sada obsahuje oboje — a analytik musí toto rozlišení udržet explicitní, aby rozhodovatelé věděli, na co daný typ ukazatele spolehlivě odpovídá.


> [[GRAF: Lead vs. lag indikátory: příklady a reakční časy]]
> _Podklad:_ Lead vs. lag indikátory: příklady a reakční časy Typ Příklad (ilustrativní) Typický reakční čas K čemu slouží Lead (procesní) % pacientů zahájených na doporučené medikaci do 24 h Týdny–měsíce Včasná zpětná vazba k zásahu; korekce kurzu Lead (strukturální) Pokrytí preventivním screeningem cílové populace Měsíce–1 rok Signál o budoucím výsledku; korekce ještě před plným efektem Lag (outcome) Odklonitelná mortalita (amenable mortality) 2–5 let Potvrzení správné cesty; odpovědnost za výsledek Lag (systémový) Naděje dožití při narození 5–10 let Strategický kontext; ne pro operativní řízení Ilustrat…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Jeden bod nikdy nestačí. Trend od náhodného výkyvu odliší jen *run chart* — graf v čase, ne jediné číslo. Metoda statistické regulace procesů (SPC), popsaná v české zdravotnické praxi zejména skrze práce z okruhu Mohammed et al. (2008), rozlišuje dvě kategorie variability: *common cause* (šum v systému, přirozený rozptyl) a *special cause* (neobvyklá odchylka signalizující skutečnou změnu). Řídicí dashboard by neměl reagovat na výkyvy první kategorie — to vede k přetahování dobře fungujícího systému. Reagovat má až na druhou.


### Jak dashboard číst na poradě

Nejpodceňovanější část dashboardu není jeho stavba, ale *čtení*. Sebelepší sada metrik je k ničemu, pokud porada skončí konstatováním „aha, červená" bez rozhodnutí. Dobrý dashboard má proto u každého ukazatele tři věci: **práh** (kdy je to ještě v pořádku a kdy už ne), **vlastníka** (kdo za to odpovídá) a předem domluvenou **reakci** (co se stane, když ukazatel zabliká).


> [[GRAF: Strukturovaný záznam řídicího ukazatele — semafor + práh + vlastník + reakce]]
> _Podklad:_ Strukturovaný záznam řídicího ukazatele — semafor + práh + vlastník + reakce Prvek Co obsahuje Proč nestačí bez ostatních Semafor (signál) Dobře / pozor / špatně — vizuální stav proti prahu Bez prahu je semafor libovolný; bez trendových dat může být výsledkem šumu Práh Konkrétní hodnota nebo rozsah; ideálně opřeno o benchmark nebo klinický standard Bez definice prahu nelze posoudit, zda „červená" signalizuje systémový problém nebo normální rozptyl Vlastník Jméno nebo role; jediná osoba nesoucí odpovědnost za stav metriky a návrh reakce Kolektivní vlastnictví = žádné vlastnictví; na poradě nikd…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


> [[GRAF: Jak se z ukazatele stane rozhodnutí — anatomie jednoho řádku dashboardu na poradě]]
> _Podklad:_ Jak se z ukazatele stane rozhodnutí — anatomie jednoho řádku dashboardu na poradě Signál Semafor (dobře / pozor / špatně) proti předem definovanému prahu — ne holé číslo bez kontextu. Trend Run chart: jde to nahoru, dolů, nebo jen šumí? Jeden bod nestačí k rozhodnutí. Interpretace Co za číslem je — odděleně od rozhodnutí. Tady mluví odborník nebo analytik. Bez tohoto kroku se rozhodnutí dělá naslepo. Rozhodnutí Co s tím uděláme, kdo a do kdy. Bez tohoto kroku je dashboard jen dekorace. Tady se měření mění v řízení Oddělení interpretace (co číslo znamená) od rozhodnutí (co uděláme) je klíčové —…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Jak vést review meeting: čtyři pravidla

Procesní nastavení porady je stejně důležité jako obsah dashboardu. Čtyři pravidla, která se osvědčila v mezinárodní praxi:

**1. Seřaďte, ne čtěte.** Špatná porada prochází dashboard ukazatel po ukazateli a konstatuje stav. Dobrá porada začíná otázkou: „Co z tohoto si vyžaduje akci dnes?" Zbytek — zelené ukazatele bez trendu zhoršení — se zaznamená, ale neprodiskutovává. Tím se uvolní čas pro hlubší analýzu těch pár věcí, které skutečně potřebují rozhodnutí.

**2. Oddělte interpretaci od rozhodnutí časově.** Analytik nebo lékař prezentuje interpretaci (co stojí za číslem) a pak odejde — nebo se porada přeruší a přejde do části, kde se rozhoduje. Záměs těchto dvou fází vede k tomu, že rozhodnutí dělá ten, kdo nejlépe interpretuje — a to nemusí být ten, kdo nese odpovědnost za výsledek.

**3. Pište závěry ve formátu KDO — CO — DO KDY.** Každé rozhodnutí, které vzejde z porady, musí mít vlastníka, konkrétní akci a termín. Bez tohoto formátu je výstup porady dobrý úmysl, ne závazek. Na příštím reviewu se začíná právě tím, co bylo domluveno — zda to bylo splněno.

**4. Chraňte sadu před růstem.** Přirozená tendence každé organizace je přidávat ukazatele. Po každém incidentu se ozve: „To by v dashboardu mělo být." Řídicí sada musí mít svého strážce (vlastníka procesu, ne jednotlivých metrik), který každý nový kandidát prověří kritérii výběru a v případě přijetí nového ukazatele jeden odebere. Jinak se sada postupně zvětší na nepoužitelný katalog.

Dashboard, který vede k akci — sedm pravidel

1. Vyber **malou řídicí sadu** tracer ukazatelů — ne padesát.
2. Měj mezi nimi outcome, process, **balancing** i equity.
3. Výsledky srovnávej **očištěné o závažnost** (risk adjustment).
4. U každého znej **data lag**; doplň pomalé metriky rychlými lead indikátory.
5. Ukazuj **trend** (run chart), ne jediné číslo.
6. Každý ukazatel má práh, vlastníka a předem domluvenou reakci.
7. Na poradě odděl **interpretaci** od **rozhodnutí**.


### Mezinárodní inspirace: co funguje jinde

Žádná z principů popsaných v tomto článku nebyla vymyšlena od stolu — všechny mají referenční systémy, kde se v praxi ověřily.

**Healthy Belgium.** Belgický model HSPA, na jehož přístupu je tento web částečně inspirován, publikoval v roce 2024 již pátou edici svého výkonnostního reportu. Report pracuje se sadou indikátorů pokrývajících šest dimenzí — přístupnost, kvalitu, efektivitu, udržitelnost, equity a nově od roku 2024 také odolnost (resilience). Klíčovým institucionálním rysem belgického systému je oddělení: KCE (Federální centrum pro analýzu zdravotní péče) a Sciensano (Vědecký ústav veřejného zdraví) dodávají měření, zatímco INAMI/RIZIV a ministerstvo nesou odpovědnost za rozhodování. Toto oddělení je přesným strukturálním ekvivalentem pravidla „interpretace zvlášť, rozhodnutí zvlášť" na úrovni celého systému.

**Švédské národní registry.** Švédsko provozuje přes sto národních kvalitních registrů s individuálními záznamy pacientů — od SWEDEHEART (kardiovaskulární výsledky) přes registry onkologické až po rehabilitaci. Jejich silnou stránkou je kontinualita dat umožňující skutečné longitudinální sledování výsledků, nikoli jen průřezové snapshoty. Tím řeší jeden z chronických problémů většiny dashboardů: vidí trend, ne jen poslední bod. Kritici nicméně upozorňují, že existence registru ještě není jeho využití — a že přechod od sběru dat k reálnému zlepšení vyžaduje aktivní smyčku zpětné vazby na úrovni klinik, ne jen národního reportingu.

**OECD proof-of-concept brief.** Projekt Evropské observatoře, OECD a WHO Europe formálně testoval, jak vypadá „policy-friendly" dashboard v praxi. Závěr byl empiricky strohý, ale operačně důležitý: klíčovým faktorem použitelnosti není technická propracovanost — je to *relevance pro politické otázky, které rozhodovatel aktuálně řeší*. Sada metrik, která neodpovídá na otázky, které management pokládá, bude ignorována bez ohledu na kvalitu dat. Tento princip je argumentem pro to, aby se řídicí sada sestavovala iterativně s těmi, kdo ji budou číst — ne jenom technickými experty.

Z mezinárodní komparace vystupují tři společné jmenovatele úspěšných systémů. Za prvé, **institucionální zakotvení**: úspěšné systémy mají jasně definovanou odpovědnost za sběr dat (nezávislá agentura nebo akademická instituce) oddělenou od odpovědnosti za rozhodnutí (ministerstvo, pojišťovna, management). Za druhé, **rytmus a rituál**: data se nepřečtou jednou ročně ve výroční zprávě, ale v pravidelném čtvrtletním nebo půlročním cyklu, kde jsou konkrétní lidé odpovědní za konkrétní výsledky. Za třetí, **investice do čtení, ne jen do sběru**: finančně a personálně nejvytíženějším článkem systému bývá analytická vrstva, která data přeloží do jazyka srozumitelného pro rozhodovatelé — a právě tato vrstva bývá v systémech s nedostatečně uzavřenou smyčkou nejpodfinancovanější.


### Český kontext: surovina je, jde o výběr a čtení

Česko, jak jsme psali v díle o řízení podle výsledků, netrpí nedostatkem dat. Na Portálu ukazatelů kvality se objevují první národní outcome indikátory, vzniká český HSPA rámec s indikátory ve čtyřech oblastech (Výsledky, Výstupy, Procesy, Struktury). Výzva tedy nezní „naměřit víc", ale „**vybrat těch pár, podle kterých se opravdu rozhoduje, a naučit se je číst**".

Tento web sám je malou ukázkou principu: barevný signál dobře / pozor / špatně proti mezinárodnímu benchmarku je přesně ten typ čtení, který má dashboard umožnit — jen ho je potřeba dotáhnout z displeje až k rozhodnutí. Zatím je HSPA Monitor především observatoří: produkuje interpretaci. Krok, který česká zdravotní politika zatím v plné míře nevykonala, je uzavření smyčky — dostat tato čísla k těm, kdo nesou odpovědnost za výsledky, a sjednat s nimi protokol reakce.

Konkrétně to pro českou praxi znamená tři kroky, které lze vnímat jako progres od observatoře k řídicímu nástroji: **výběr** (z existující datové základny vybrat řídicí sadu pro konkrétní úroveň — ministerstvo, pojišťovna, kraj, nemocnice), **protokol** (u každého ukazatele definovat práh, vlastníka a reakci před prvním ostrým čtením) a **rytmus** (sjednat pravidelný cyklus reviewu s formálním zápisem závěrů ve formátu kdo–co–do kdy). Žádný z těchto kroků není technicky složitý. Jsou organizačně náročné, protože vyžadují politickou vůli přijmout odpovědnost za výsledky, které může číslo osvítit. A právě proto, že to není technická, ale governance otázka — kdo interpretuje, kdo rozhoduje a kdo hlídá nezávislost měřiče — je toto téma následujícím dílem série.


---

### Zdroje

- European Observatory / OECD / WHO Europe — Assessing health system performance: Proof of concept for a HSPA dashboard of key indicators — méně, lépe zvolených metrik zvyšuje politickou použitelnost. eurohealthobservatory.who.int ↗
- OECD — Rethinking Health System Performance Assessment (2024) — obnovený rámec, důraz na equity jako průřezovou dimenzi. oecd.org ↗
- Spiegelhalter, D.J. (2005) — Funnel plots for comparing institutional performance — statisticky korektní srovnání pracovišť, trychtýřové meze, anti-ligová tabulka. Statistics in Medicine, 24(8), 1185–1202. doi:10.1002/sim.1970 ↗
- Mohammed, M.A., Worthington, P., & Woodall, W.H. (2008) — Plotting basic control charts: tutorial notes for healthcare practitioners. Quality and Safety in Health Care, 17(2), 137–145. doi:10.1136/qshc.2004.012047 ↗ — run charts a SPC v péči o zdraví.
- Healthy Belgium (KCE / Sciensano / INAMI) — Performance of the Belgian health system: Report 2024 — 5. vydání, 6 dimenzí vč. nové resilience. healthybelgium.be ↗
- Švédské národní kvalitní registry — přehled a praxe — přes 100 registrů, longitudinální výsledková data. kunskapsstyrningvard.se ↗
- Portál ukazatelů kvality (KZP / MZ ČR) — národní indikátory kvality péče. ÚZIS ↗

<!-- Zdroj webu: clanek-ukazatele-dashboard.html · skorezdravotnictvi.cz/clanek-ukazatele-dashboard -->