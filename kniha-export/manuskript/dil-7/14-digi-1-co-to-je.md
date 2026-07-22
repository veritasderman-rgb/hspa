---
slug: digi-1-co-to-je
dil: 7
poradi: 14
audit: partial
stitky: Digitalizace, Vysvětlujeme, Série „Digitální zdravotnictví“ · díl 1 z 5
---

# Od papírku k datům: co vlastně znamená digitalizace zdravotnictví

**Zkuste si vzpomenout, kdy jste naposledy dostali papírový recept. Nejspíš to bylo dávno — dnes vám lékař řekne číslo, pošle SMS nebo e-mail, a vy si lék vyzvednete v kterékoli lékárně. Tahle drobnost je dokonalý příklad toho, co znamená digitalizace zdravotnictví: ne robot u lůžka a ne umělá inteligence, která vás vyšetří, ale jednoduchá změna v tom, jak se informace o vašem zdraví dostane tam, kde je zrovna potřeba. Bez papíru, bez faxu, bez ztracených složek. Tahle série vás provede celým tématem srozumitelně a od nuly — a slibujeme, že ani jednou nebudeme předpokládat, že víte, co je „API“ nebo „interoperabilita“. (To si vysvětlíme ve druhém dílu.)**

Zkuste si vzpomenout, kdy jste naposledy dostali papírový recept. Nejspíš to bylo dávno — dnes vám lékař řekne číslo, pošle SMS nebo e-mail, a vy si lék vyzvednete v kterékoli lékárně. Tahle drobnost je dokonalý příklad toho, co znamená digitalizace zdravotnictví: ne robot u lůžka a ne umělá inteligence, která vás vyšetří, ale jednoduchá změna v tom, *jak se informace o vašem zdraví dostane tam, kde je zrovna potřeba*. Bez papíru, bez faxu, bez ztracených složek. Tahle série vás provede celým tématem srozumitelně a od nuly — a slibujeme, že ani jednou nebudeme předpokládat, že víte, co je „API“ nebo „interoperabilita“. (To si vysvětlíme ve druhém dílu.)


> [[GRAF: Digitální zdravotnictví v Česku — co už běží]]
> _Podklad:_ Digitální zdravotnictví v Česku — co už běží 2018 eRecept plošně povinný od 1. 1. 2018, zákon o léčivech 2020 eNeschopenka povinná od 1. 1. 2020, propojuje lékaře, zaměstnavatele a ČSSZ 1. 1. 2026 spuštěn portál eZdraví nová centrální brána ke službám e-zdravotnictví 4 mil.+ instalací aplikace EZKarta orientační údaj MZ ČR; aktivních uživatelů je méně Zdroj: zákon č. 378/2007 Sb. (eRecept), ČSSZ (eNeschopenka), MZ ČR / NCEZ (portál eZdraví, EZKarta). Počty uživatelů EZKarty MZ uvádí v různých metrikách — bereme je jako orientační.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Pět minut v ordinaci: dřív a dnes

Nejlíp se to ukáže na cestě jednoho receptu. Dřív lékař vzal blok, naškrábal název léku, podepsal, orazítkoval a podal vám papír. Ten jste museli fyzicky donést do konkrétní lékárny — když jste ho cestou ztratili nebo zapomněli doma, měli jste smůlu. Lékárník přepsal ručně napsaný text do počítače (a občas luštil, co tam vlastně stojí). Nikdo přitom neviděl, jestli vám jiný lékař nepředepsal lék, který se s tímhle „nesnáší“.


> [[GRAF: Cesta receptu: papírová versus digitální]]
> _Podklad:_ Cesta receptu: papírová versus digitální Dřív — papír putuje s pacientem Lékař napíše recept rukou → pacient ho fyzicky donese do jedné konkrétní lékárny → lékárník text přepíše. Ztratíte papír = problém. Nikdo nevidí ostatní vaše léky. Riziko ztráty i chyb v opisu Dnes — recept je záznam v systému Lékař vystaví eRecept do centrálního úložiště (spravuje ho SÚKL) → vy dostanete jen identifikační kód (SMS, e-mail, papírová průvodka) → lék si vyzvednete v kterékoli lékárně v ČR. Kód místo papíru Bonus — lékový záznam hlídá kombinace Protože je předpis i výdej v systému, lékař nahlédne do vašeho l…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Všimněte si, že nikde v té cestě nevznikla „velká státní databáze nemocí“. Vznikl jen **záznam o jednom receptu** v jednom úložišti, ke kterému se dostanou ti, kdo ho potřebují — váš lékař a lékárník. Tohle je klíč k pochopení celé digitalizace: jde o to nechat data bezpečně *protékat* mezi místy, kde se péče poskytuje, ne je všechna naskládat na jednu hromadu. K tomu se ještě vrátíme.


### Tři věci, které už běží, i když o nich nevíte

Lidé často slýchají, že „digitalizace zdravotnictví teprve začíná“. To je jen půl pravdy. Tři velké systémy fungují v Česku dlouhé roky a používá je prakticky každý, kdo chodí k lékaři:

- **eRecept** — elektronický recept, povinný od roku 2018. Drtivá většina receptů v ČR už dávno není na papíře.
- **eNeschopenka** — od roku 2020 lékař „vypíše neschopenku“ elektronicky a údaje doputují zaměstnavateli i České správě sociálního zabezpečení automaticky. Pacient už neroznáší papírové „díly“.
- **lékový záznam** — přehled vašich předepsaných a vydaných léků, který od roku 2020 doplňuje eRecept. Je to ta „bezpečnostní pojistka“ proti nebezpečným kombinacím.

K nim se v roce 2024 přidala mobilní aplikace **EZKarta** — vaše okno do systému v telefonu: očkovací průkaz, přehled preventivních prohlídek a screeningů, postupně i další funkce. A 1. ledna 2026 spustilo Ministerstvo zdravotnictví zcela novou centrální vrstvu (o té je celý třetí díl). Když si to seřadíme na časovou osu, je vidět, že nejde o jeden velký „den D“, ale o pozvolné přidávání kostek skládačky:


> [[GRAF: Milníky, které jste možná zažili (a jeden, který přichází)]]
> _Podklad:_ Milníky, které jste možná zažili (a jeden, který přichází) 1. 1. 2018 eRecept plošně povinný Konec papírových receptů jako pravidla. Lékaři předepisují elektronicky, lék vyzvednete v kterékoli lékárně podle kódu. 2020 eNeschopenka + lékový záznam Neschopenka putuje elektronicky mezi lékařem, zaměstnavatelem a ČSSZ. Lékový záznam dává přehled o všech vašich lécích. březen 2024 EZKarta v telefonu Mobilní aplikace pro občany: očkovací průkaz, prevence, screeningy. Přihlášení přes státní identitu NIA. 1. 1. 2026 Nová centrální páteř — portál eZdraví Spuštění centrálních služeb (portál eZdraví, kme…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Proč to stát vlastně dělá

Digitalizace není cíl sama o sobě — nemá smysl „mít to elektronicky“ jen proto, že to jde. Důvody jsou tři a všechny jsou hodně praktické.

**Bezpečnost.** Když systém ví, co všechno berete za léky, dokáže upozornit na kombinace, které si „nesednou“. Lékové interakce jsou přitom běžnou a podceňovanou příčinou poškození pacientů, hlavně u starších lidí, kteří berou víc léků najednou. Papír tohle nikdy neuměl ohlídat.

**Méně chyb a méně přepisování.** Pokaždé, když člověk ručně přepisuje údaj z jednoho papíru do druhého počítače, vzniká příležitost k chybě — a ztrácí se čas, který by mohl jít pacientovi. Když si systémy předají data přímo mezi sebou, odpadá luštění rukopisu i dvojí zadávání.

**Dostupnost ve správný okamžik.** Záchranář u nehody, lékař na pohotovosti v jiném městě, lékárník o víkendu — všichni se občas potřebují rychle dozvědět něco zásadního: jakou máte krevní skupinu, na co jste alergičtí, jaké berete léky. Digitální systém umí tahle data zpřístupnit přesně tam a tehdy, kdy zachraňují čas (a někdy život). Právě k tomu slouží nový **emergentní zdravotní záznam**, o kterém píšeme ve třetím dílu.


### Co se NEděje: žádná velká složka na jednom místě

Tady je nejčastější nedorozumění, se kterým se u digitalizace zdravotnictví setkáte. Mnoho lidí si představí, že stát buduje jednu obří databázi, kde leží kompletní zdravotní záznamy všech občanů — a děsí se, kdo všechno do ní uvidí. **Český systém je ale postavený přesně naopak.**

Stát záměrně *nestaví* centrální sklad zdravotnické dokumentace. Vaše data zůstávají tam, kde vznikla — u vašeho praktického lékaře, v nemocnici, kde jste byli hospitalizovaní, v laboratoři, která vám dělala odběr. Centrálně existuje jen **integrované datové rozhraní**: něco jako bezpečná spojovací síť, přes kterou si tato místa data předají teprve ve chvíli, kdy je opravdu potřeba. Odborně se tomu říká, že architektura je „federovaná“ — místo jedné hromady je to síť propojených ostrovů.

Má to dva velké důvody. Za prvé bezpečnost: jedna obří databáze by byla lákavým cílem útoku a jedním kritickým bodem, jehož selhání by ohrozilo úplně všechno. Síť rozprostřených dat je odolnější. Za druhé kontrola: o každém nahlédnutí do vašich dat zůstává záznam v takzvaném **žurnálu činností** — můžete si zpětně zobrazit, kdo a kdy se vám do záznamů díval. A přes **registr oprávnění** sami řídíte, kdo smí vaše data sdílet. Mimochodem, stejný princip „data zůstávají u poskytovatele“ razí i nové evropské nařízení EHDS.


### Mapa série: co vás čeká v dalších dílech

Tenhle díl byl rozcvička — ukázal, že digitalizace už dávno není sci-fi a že nestojí na jedné velké databázi. V dalších čtyřech dílech jdeme hlouběji, pořád ale srozumitelně:

- **Díl 2 — Jak to funguje pod kapotou.** Co je *API*, co znamená, že si systémy „rozumí“ (interoperabilita), a proč data zůstávají u lékaře. Nejvíc „technický“ díl, ale vysvětlený na přepážce a společném jazyku.
- **Díl 3 — Dvě vrstvy a kdo co provozuje.** Staré samostatné služby (eRecept, eNeschopenka, registry) versus nová centrální páteř NCEZ spuštěná v roce 2026.
- **Díl 4 — Co je povinné a co dobrovolné v roce 2026.** Vyvrátíme mýtus, že „od ledna musí lékaři všechno naráz“.
- **Díl 5 — Kam to směřuje.** Národní strategie do roku 2035, evropský EHDS a realistický rok 2030 — a co z toho jsou jen sliby bez opory v zákoně.

Pokud chcete předběhnout, můžete už teď nahlédnout do souvisejících článků: o aplikaci EZKarta a indexu eHealth nebo o evropském nařízení EHDS. Jinak se uvidíme u druhého dílu — a vezmeme to pěkně od přepážky.


---

### Zdroje

- eRecept a lékový záznam — SÚKL — provozovatel centrálního úložiště elektronických receptů a lékového záznamu. epreskripce.gov.cz ↗
- eNeschopenka — ČSSZ — informace o elektronické neschopence pro pacienty, lékaře i zaměstnavatele. cssz.cz ↗
- EZKarta — MZ ČR / ÚZIS — mobilní aplikace pro občany. ezkarta.mzcr.cz ↗
- Portál eZdraví — NCEZ — národní portál elektronického zdravotnictví, spuštěn 1. 1. 2026. ezdravi.gov.cz ↗
- Zákon č. 325/2021 Sb. o elektronizaci zdravotnictví — základní zákon o e-zdravotnictví ve znění novely 236/2025 Sb. zakonyprolidi.cz ↗
- NCEZ — Národní centrum elektronického zdravotnictví — odbor MZ ČR koordinující elektronizaci. ncez.mzcr.cz ↗
- Pozn. k údajům: Počty uživatelů a instalací aplikace EZKarta jsou orientační — Ministerstvo zdravotnictví je v různých vystoupeních uvádí v různých metrikách (počet instalací versus počet aktivních uživatelů). Tento díl je úvodní a zjednodušující; přesnější právní a technické detaily rozvádějí následující díly série.

<!-- Zdroj webu: clanek-digi-1-co-to-je.html · skorezdravotnictvi.cz/clanek-digi-1-co-to-je -->