---
slug: platba-z-kapsy
dil: 2
poradi: 24
audit: partial
stitky: Financování, OOP · solidarita · doplatky
---

# Čtrnáct procent z kapsy. Česká solidarita zdravotnictví — a kde její míra zaostává za realitou

**České OOP 14,6 % (ČSÚ 2023; dashboard pracuje s odhadem 14 % pro rok 2024) je v evropském srovnání slušný výsledek, ale ne výjimečný. Průměr EU se podle Eurostatu pohybuje kolem 15 %, takže Česko leží zhruba na evropském průměru; viditelně lepší jsme až vůči průměru OECD jako celku, který je kolem 18 %. Vyšší míra OOP v daném systému znamená, že větší část zdravotní péče platí pacient přímo — buď za výkony, které pojištění nehradí, nebo formou doplatků a spoluúčastí. Příliš vysoké OOP se v mezinárodní literatuře dlouhodobě spojuje s tzv. katastrofickými zdravotními výdaji (catastrophic health expenditure), které WHO definuje jako výdaje překračující 40 % nesubsistenčního příjmu domácnosti. Slabá pojistná ochrana vede k tomu, že si lidé léčbu odkládají, nebo si na ni musejí půjčovat. České číslo je solidní, ale neznamená „několikanásobně lepší" než většina vyspělých systémů — řada zemí (Francie, Lucembursko, Chorvatsko, Nizozemsko, Německo) je výrazně níž.**

České OOP 14,6 % (ČSÚ 2023; dashboard pracuje s odhadem 14 % pro rok 2024) je v evropském srovnání slušný výsledek, ale ne výjimečný. Průměr EU se podle Eurostatu pohybuje kolem **15 %**, takže Česko leží zhruba na evropském průměru; viditelně lepší jsme až vůči průměru OECD jako celku, který je kolem **18 %**. Vyšší míra OOP v daném systému znamená, že větší část zdravotní péče platí pacient přímo — buď za výkony, které pojištění nehradí, nebo formou doplatků a spoluúčastí. Příliš vysoké OOP se v mezinárodní literatuře dlouhodobě spojuje s tzv. *katastrofickými zdravotními výdaji* (catastrophic health expenditure), které WHO definuje jako výdaje překračující 40 % nesubsistenčního příjmu domácnosti. Slabá pojistná ochrana vede k tomu, že si lidé léčbu odkládají, nebo si na ni musejí půjčovat. České číslo je solidní, ale neznamená „několikanásobně lepší" než většina vyspělých systémů — řada zemí (Francie, Lucembursko, Chorvatsko, Nizozemsko, Německo) je výrazně níž.


> [[GRAF: Platba z kapsy (OOP) — ČR v evropském srovnání]]
> _Podklad:_ Platba z kapsy (OOP) — ČR v evropském srovnání 14,6 % OOP podíl ČR (ČSÚ 2023) EU průměr ~15 % — zhruba evropský průměr ~18 % OECD průměr USA ~11 %, ale celkové výdaje 17 % HDP ~9 % Francie / Lucembursko silná pojistná ochrana s nízkou spoluúčastí 40 % WHO práh pro katastrofické výdaje % nesubsistenčního příjmu domácnosti Zdroj: ČSÚ Zdravotnické účty 2023, Eurostat hlth_sha, OECD Health at a Glance 2025, WHO Catastrophic Health Spending.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Co indikátor měří a co nezachycuje

Indikátor `platba_z_kapsy_pct` zachycuje podíl OOP na celkových zdravotních výdajích podle *System of Health Accounts* (SHA) — mezinárodní metodiky OECD, Eurostatu a WHO. SHA standardizuje, co se počítá jako „zdravotní výdaj" a kdo ho hradí (veřejné zdroje, soukromé pojištění, OOP). Limitace, kterou výslovně uvádí metodická karta indikátoru: **neformální platby a zdravotní suplementy nejsou zahrnuty** — skutečná zátěž pacienta je vyšší. To je v českém kontextu důležité ze dvou důvodů.

Za prvé, v některých segmentech (zejména stomatologie, oční optika, suplementy a některé výkony nadstandardní péče) jsou platby pacienta pod hranicí, kterou SHA identifikuje jako „zdravotní výdaj" — pacient si zaplatil, ale nikam se to v statistice ne zachytí. Za druhé, v některých případech existují *neformální platby* — sponzorské dary, „pozornosti", platby v hotovosti za nadstandardní zacházení —, které pacient platí, ale které do oficiálního výkaznictví nevstupují. Český systém tento jev v evropském srovnání stále řeší méně transparentně, než by měl, a samostatný článek o platbě bez úplatků a kulichů (manifest) tomuto tématu věnuje pozornost.

Skutečná OOP zátěž je tedy v ČR pravděpodobně vyšší než dashboardových 14 procent (případně oficiálních 14,6 % za rok 2023 podle ČSÚ) — ne dramaticky, ale o jednotky procentních bodů. Pro mezinárodní srovnání to ale není zlomová informace, protože podobnou metodickou rezervu mají všechny země. Trend uvnitř ČR a relativní pozice vůči EU/OECD jsou robustnější než absolutní hodnota.


### Kde se 14 procent platí

Český OOP se rozkládá nerovnoměrně. Z dat ÚZIS, ČSÚ a domácí literatury vyplývá, že hlavní složky tvoří čtyři skupiny.


> [[GRAF: Čtyři hlavní složky přímých plateb pacientů v ČR]]
> _Podklad:_ Čtyři hlavní složky přímých plateb pacientů v ČR Složka Co pacient platí Ochrana / kontext Doplatky na léky rozdíl mezi úhradou SÚKL a tržní cenou; u novějších léků stovky–tisíce Kč/měsíc roční ochranný limit (§ 16b), od 2025 evidence v eReceptu (SÚKL) Stomatologie fotokompozit, korunky, implantáty, ortodoncie dospělých, dentální hygiena největší jednorázový OOP výdaj; důvod odkládání péče Optometrie a brýle prakticky celá dioptrická korekce z vlastní kapsy běžné i v jiných zemích EU Nadstandardní výkony rozdíl nad hrazený standard (typ čočky, jednolůžkový pokoj…) šedá zóna mezi „doplatkem" a …
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

**Doplatky na léky.** Pacient v ČR doplácí část ceny léčiva, pokud SÚKL stanoví úhradu z veřejného zdravotního pojištění nižší, než je tržní cena. U některých léků (zejména novějších přípravků s jednou aktivní látkou bez substitutu) může doplatek dosahovat stovek nebo tisíců korun měsíčně. Existuje *roční ochranný limit* doplatků (regulovaný zákonem o veřejném zdravotním pojištění), který chrání zejména seniory a pacienty s velkou polypragmazií, ale jeho nastavení a praktická aplikace se v posledních letech opakovaně mění.

**Stomatologie.** Zákonem hrazené stomatologické výkony pokrývají dnes spíše základní úroveň (amalgámové výplně, extrakce, vybrané části dětské stomatologie). Moderní fotokompozitní výplně, korunky, implantáty, ortodoncie u dospělých nebo profesionální dentální hygiena jsou v plné výši nebo částečně hrazené pacientem. Pro pacienta s pokročilejšími stomatologickými potřebami představuje tato vrstva často největší jednorázový OOP výdaj — a v souhrnu jeden ze zásadních důvodů, proč se zubní péči v ČR někteří pacienti vyhýbají, dokud to nejde. Tomuto tématu věnuje pozornost samostatná kapitola autorova manifestu o stomatologii.

**Optometrie a brýle.** Ze zdravotního pojištění je hrazený minimální podíl optických pomůcek; pacient za novou dioptrickou korekci, dětský pár nebo specializované čočky platí prakticky všechno z vlastní kapsy. V evropském srovnání není tento režim výjimečný (řada zemí má podobný), ale představuje strukturálně významnou OOP položku, která se v rodinném rozpočtu projeví.

**Nadstandardní výkony a komfort.** Pacient, který si přeje materiál, výkon nebo komfort nad rámec hrazeného standardu (vyšší typ čočky při operaci katarakty, jednolůžkový pokoj, určité ortopedické pomůcky), platí rozdíl ze své kapsy. Tato vrstva je v ČR strukturálně problematická: hranice mezi standardem a nadstandardem není vždy jasně formulovaná a v některých případech se OOP odehrává v šedé zóně mezi „doplatkem" a „neformální platbou".


### Co znamená OOP pro různé skupiny

Za průměrnými 14 procenty se schovávají velmi rozdílné situace. Domácnost s mladým pracujícím, který občas potřebuje preventivní prohlídku a antibiotika na chřipku, vidí OOP v desítkách korun ročně. Senior s vícero chronickými diagnózami, několika doplatkovými léky, potřebou zubní péče a brýlí může vydávat z kapsy desetitisíce korun ročně — a v některých případech se posouvat ke katastrofickému zdravotnímu výdaji, zejména pokud má nízký důchod. Distribuci OOP zátěže mezi domácnostmi v ČR i v EU sleduje šetření *Eurostat EU-SILC* a evropský monitoring katastrofických výdajů publikuje WHO/Europe (poslední přehled *Can people afford to pay for health care?*); podle těchto zdrojů je podíl českých domácností s katastrofickými zdravotními výdaji v evropském srovnání nízký, ale nenulový. Konkrétní procento pro daný rok zde neuvádíme, dokud nebude dohledatelné z primárního zdroje — viz článek o anatomii financování (financovani-sha).

Pacient s chronickou diagnózou, která vyžaduje doplatkovou medikaci, je dnes v Česku částečně chráněn ročním ochranným limitem doplatků na léky (zákon č. 48/1997 Sb., o veřejném zdravotním pojištění, § 16b). Limit znamená, že pojišťovna pacientovi vrátí částku, o kterou jeho zaplacené započitatelné doplatky překročily zákonný strop, a to do 60 kalendářních dnů po skončení čtvrtletí, v němž byl limit překročen. Od 1. ledna 2025 přešla evidence započitatelných doplatků z jednotlivých zdravotních pojišťoven na **SÚKL** a je vedena prostřednictvím systému *eRecept*; pacient si tak může souhrn svých doplatků a stav vůči ročnímu limitu kontrolovat v jednom místě napříč pojišťovnami. Mechanismus chrání zejména seniory; pro mladší produktivní populaci není limit vždy dostatečně vysoký, aby zachytil náklady polypragmazie.


### Mezinárodní srovnání — kde 14,6 % stojí v EU


> [[GRAF: Přímé platby pacientů (% zdravotních výdajů, 2023) — kde stojí ČR v EU]]
> _Podklad:_ Přímé platby pacientů (% zdravotních výdajů, 2023) — kde stojí ČR v EU Zdroj: Eurostat hlth_sha11_hf (2023); ČSÚ (ČR 14,6 %).
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

České OOP 14,6 % (ČSÚ, 2023) řadí ČR zhruba na evropský průměr (Eurostat 2023: ~15 %) a do horní třetiny zemí EU z pohledu finanční ochrany — ne ale mezi vůbec nejnižší. Hodnoty níže uvedené pro evropské státy pocházejí z Eurostatu `hlth_sha11_hf` (current health expenditure, 2023). **Lucembursko** 8,5 %, **Francie** 8,9 % a **Chorvatsko** 9,4 % jsou v EU jediné státy s OOP pod 10 %; ve Francii to umožňuje kombinace univerzální veřejné pojišťovny (Sécurité Sociale) a doplňkových pojištění (mutuelles), které ošetří podstatnou část doplatků. **Německo** 10,7 % — kombinace veřejného zákonného pojištění a soukromého pojištění pro některé skupiny. **Severské země** jsou v užším rozmezí, než se někdy uvádí: Švédsko 13,4 %, Dánsko 13,9 % a Norsko 14,1 % — všechny zhruba na úrovni ČR, při převážně daňově financovaném systému. **Nizozemsko** mělo podle OECD Health at a Glance 2023 OOP kolem 9 % (povinná soukromá pojistka + veřejná regulace).

Na opačném pólu EU mají out-of-pocket podíl výrazně přes 30 % pouze čtyři země: **Bulharsko 35,5 %**, **Lotyšsko 35,1 %**, **Řecko 34,3 %** a **Litva 31,4 %** — strukturálně vyšší kvůli historicky slabší pojistné ochraně. **Itálie** má 22,3 %, tedy podstatně méně než tyto čtyři státy; **Portugalsko** a další jihoevropské státy se pohybují v pásmu zhruba 15–25 %. **USA** mají OOP zhruba 10–11 % celkových výdajů (OECD), což je při srovnání podílu *nižší* než ČR; absolutní částky placené z kapsy jsou ale v amerických cenách dramaticky vyšší než v Evropě a americký systém má současně mnohem širší pásmo domácností s katastrofickými výdaji.

Žádné z těchto čísel není ideál samo o sobě; co je důležité, je *distribuce* — kolik pacientů má katastrofické zdravotní výdaje, kolik si léčbu odkládá kvůli ceně, kolik domácností bankrotuje kvůli zdravotní události. V tomto rámci patří Česko mezi země s relativně dobrým výsledkem — ale ne s vynikajícím. Šetření Eurostat EU-SILC ukazuje, že část českých domácností (zejména seniory a osamělé) zdravotní výdaje stále bolí.


### Co Česko realisticky může

Reformní debata o OOP v Česku se točí kolem několika konkrétních témat. Žádné z nich neznamená radikální změnu solidárního charakteru systému — všechna se týkají jeho jemných úprav.

**Roční ochranný limit doplatků na léky** vyžaduje pravidelnou aktualizaci. Limity stanovené před deseti lety dnes nezachycují inflační realitu; pacient s polypragmazií se k limitu dostane později, než by měl. Aktualizovaný a věkově diferencovaný limit (nižší pro seniory a chronicky nemocné, vyšší pro pracující) by chránil ty, kteří jsou OOP nejvíce ohroženi.

**Reforma stomatologie**, která je samostatným tématem manifestu i článku 9 této řady, je v OOP debatě klíčová — protože stomatologické výdaje tvoří ze čtyř hlavních složek největší. Definice a plné hrazení základních stomatologických výkonů pro děti a mladistvé do 18 let a rozšíření kompetencí dentálních hygienistek by OOP zátěž v této oblasti dotčené populace dramaticky snížilo.

**Transparence nadstandardů** — vyřešení šedé zóny mezi standardem a nadstandardem, kterou popisuje autorův manifest jako „možnost volby bez úplatků a kulichů". Pokud je v Česku ochota platit za nadstandard transparentně, je rozumné transparentní platbu legalizovat a definovat — nikoli zakazovat (což vede k neformálním platbám), ale ani nepokrytě tolerovat.

**Doplňkové zdravotní pojištění** — mechanismus, který by mohl pacientovi pokrýt doplatky, nadstandardy a vybrané výkony hrazené z veřejného pojištění minimálně. Český trh komerčního zdravotního pojištění je v evropském srovnání slabě rozvinutý; v některých zemích (Francie, Nizozemsko, Slovinsko) představuje doplňkové pojištění zásadní pilíř ochrany pacienta proti vysokému OOP. Tomuto tématu se věnuje samostatný článek o financování.


### Co s tím

Pro pacienta s vysokými doplatky na léky: roční ochranný limit doplatků existuje a pojišťovna vás chrání zákonně. Od 1. ledna 2025 si můžete souhrn započitatelných doplatků a stav vůči ročnímu limitu kontrolovat v *eReceptu* spravovaném SÚKL (jednotně napříč pojišťovnami); pokud limit překročíte, pojišťovna vám rozdíl vrátí. Pro chronické pacienty je rozumné konzultovat s lékárníkem, jestli je možné přejít na ekvivalentní léčivo s nižším doplatkem (generika, biosimilars) — v řadě případů to jde a nemusíte na to mít odbornou znalost.

Pro pacienty s vyššími náklady na stomatologii: pokud máte zájem, je legitimní si u zubaře vyžádat položkový rozpis hrazené a nehrazené části léčby předem — pro plánovaný zákrok je to standardní postup, který má pacient právo dostat. Volba poskytovatele s důsledně transparentní cenovou politikou je v této oblasti důležitá.

Pro tvůrce politik je sdělení sevřené. Český OOP 14 procent je v evropském srovnání slušné číslo, ale skutečná zátěž některých skupin (zejména seniorů, chronicky nemocných a domácností s nízkými příjmy) je vyšší, než by průměr napovídal. Reformní balíček (aktualizovaný ochranný limit, dotažená stomatologie, transparence nadstandardů, rozvoj doplňkového pojištění) má v evropské zkušenosti známé prvky a žádná z nich nepředstavuje ideologickou volbu — všechna jsou věc nastavení parametrů solidárního systému tak, aby chránil ty, kteří solidaritu nejvíc potřebují.


---

### Zdroje

- ČSÚ — Výsledky zdravotnických účtů v ČR v letech 2010–2023 (vydáno 2025) — primární domácí zdroj OOP a struktury SHA pro ČR. csu.gov.cz ↗
- Eurostat — hlth_sha11_hf Healthcare expenditure by financing scheme — primární datová tabulka pro mezinárodní srovnání HF.3 (out-of-pocket) v rámci EU. Eurostat databrowser ↗
- Eurostat — Newsroom: 10 % HDP EU šlo v roce 2023 na zdravotnictví — souhrn (EU OOP průměr 14,9 %; Bulharsko 35,5 %, Lotyšsko 35,1 %, Řecko 34,3 %). eurostat news 17. 11. 2025 ↗
- OECD — Health at a Glance 2025: Financial hardship and out-of-pocket expenditure — průměr OECD pro OOP (~18 %) a srovnání zemí. oecd.org · HAAG 2025 ↗
- SÚKL — Co je to započitatelný doplatek — výklad fungování ročního ochranného limitu podle § 16b z. 48/1997. sukl.gov.cz ↗
- System of Health Accounts 2011 (OECD/Eurostat/WHO) — metodika národních účtů zdravotnictví, klasifikace HF / HC / HP. OECD SHA 2011 ↗
- NZIP — finanční dostupnost péče — informace pro pacienty o doplatcích a ochranném limitu. nzip.cz ↗
- Zákon č. 48/1997 Sb., o veřejném zdravotním pojištění, § 16b — roční ochranný limit doplatků na léčiva. zakonyprolidi.cz · § 16b ↗
- SÚKL — Informace k plánovaným změnám v limitech započitatelných doplatků za LP/PZLÚ — přesun evidence ochranného limitu ze ZP na SÚKL od 1. 1. 2025. sukl.gov.cz · novela 2025 ↗
- Eurostat — EU-SILC (Statistics on Income and Living Conditions) — primární datový zdroj pro distribuci OOP zátěže mezi domácnostmi. ec.europa.eu · EU-SILC ↗
- WHO/Europe — Can people afford to pay for health care? — evropský monitoring katastrofických zdravotních výdajů. who.int/europe · UHC monitoring ↗
- WHO — Universal Health Coverage — globální rámec a definice katastrofických výdajů. who.int ↗
- Pozn. k údajům: České hodnoty pro rok 2023 (14,6 % OOP, 8,4 % HDP) pocházejí z primární publikace ČSÚ Výsledky zdravotnických účtů v ČR v letech 2010–2023 (vydáno 2025; staženo 15. 5. 2026). Dashboard HSPA Monitoru pracuje navíc s odhadem pro rok 2024 (14 % OOP, 8,6 % HDP), který v článku uvádíme jako explicitně označený odhad. Mezinárodní hodnoty jsou z Eurostat hlth_sha11_hf (current health expenditure, 2023) a OECD Health at a Glance 2025; metodika obou se mírně liší, proto se hodnoty pro tutéž zemi mezi zdroji liší o desetiny až jednotky procentního bodu. Výši ročního ochranného limitu doplatků a věkové kategorie se v čase mění; pro aktuální stav viz NZIP, SÚKL nebo zdravotní pojišťovna.

<!-- Zdroj webu: clanek-platba-z-kapsy.html · skorezdravotnictvi.cz/clanek-platba-z-kapsy -->