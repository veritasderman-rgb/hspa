---
slug: datova-patere-lock-in
dil: 1
poradi: 5
audit: verified
stitky: Digitalizace, Řízení systému · Data · Interoperabilita
---

# Bez dat nelze řídit: datová páteř, interoperabilita a past dodavatele

**V díle o řízení podle výsledků jsme tvrdili, že Česko má překvapivě dobrá data, ale rozpojenou smyčku. Tenhle díl jde o patro hlouběji: k samotné datové páteři. Protože dokud data netečou tam, kde se rozhoduje — a dokud jim jde věřit — je každý dashboard jen hezká fasáda. A protože budování datové páteře je dlouhodobá investice, je zároveň nejnázornějším příkladem path dependence z třetího dílu: jednou zvolená cesta se zamyká a vystoupit z ní je čím dál dražší.**

V díle o řízení podle výsledků jsme tvrdili, že Česko má překvapivě dobrá data, ale rozpojenou smyčku. Tenhle díl jde o patro hlouběji: k samotné *datové páteři*. Protože dokud data netečou tam, kde se rozhoduje — a dokud jim jde věřit — je každý dashboard jen hezká fasáda. A protože budování datové páteře je dlouhodobá investice, je zároveň nejnázornějším příkladem **path dependence** z třetího dílu: jednou zvolená cesta se zamyká a vystoupit z ní je čím dál dražší.


### Data nejsou IT projekt, ale infrastruktura

Nejdůležitější myšlenkový posun je přestat o datech uvažovat jako o „IT projektu", který se jednou dodá, a začít je vnímat jako **infrastrukturu** — sdílenou, dlouhodobou, jako silnice nebo elektrická síť. Tato infrastruktura má tři vrstvy: technickou (jak jsou data uložena a přenášena), sémantickou (co data znamenají, jaké mají formáty a standardy) a právní a správní (kdo smí data používat, k jakému účelu a kdo za ně odpovídá). Selhat může libovolná vrstva. Nejčastěji selhává ta třetí — správní.

Právě na tom staví celý estonský úspěch. Jeho páteří je *X-Road*: decentralizovaná vrstva pro výměnu dat mezi systémy, ne jedna centrální databáze. Technicky to funguje tak, že X-Road sám data neukládá — uchovává jen záznamy o tom, kdo k jakému systému přistoupil a kdy. Samotná data zůstávají v příslušných registrech; X-Road je pouze bezpečný „poštovní doručovatel". Toto rozlišení je klíčové: systém je odolný, protože neexistuje jeden bod selhání, a důvěryhodný, protože každý přístup zanechá stopu. Ročně X-Road zprostředkuje přes 2,2 miliardy datových transakcí a umožňuje fungování více než tří tisíc digitálních služeb.

V zdravotnictví platí princip *once-only* — občan tutéž informaci státu poskytuje jen jednou a systémy si ji mezi sebou sdílí. Pacient má přístup ke svým zdravotním záznamům přes pacientský portál a vidí log každého přístupu: kdo, kdy a z jakého systému se na jeho data podíval. Tato transparentnost není jen technická funkce — je to politická volba, která buduje legitimitu celého systému.


> [[GRAF: Interoperabilita versus centralizace — dva přístupy k datové páteři]]
> _Podklad:_ Interoperabilita versus centralizace — dva přístupy k datové páteři Otázka Estonský přístup (X-Road) Centralizovaný přístup Co z toho plyne Architektura Decentralizovaná výměna, ne jedna databáze; X-Road ukládá pouze logy přenosů Jedna centrální databáze nebo „státní cloud" Decentralizace: odolnost, méně rizik jednoho bodu selhání Jádro systému Standardy, zákon, role — ne konkrétní software; dodavatel je vyměnitelný Konkrétní platforma; změna = migrační projekt Interop.: vendor lock-in se neprojeví Důvěra a transparentnost Pacient vidí každý přístup ke svým datům (audit log) Závisí na rozhodnu…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### TEHIK: governance jako institucionální páka

Estonský úspěch nevznikl sám od sebe. Za ním stojí konkrétní instituce: **TEHIK** (Tervise ja Heaolu Infosüsteemide Keskus — Centrum informačních systémů zdraví a sociálního zabezpečení), kompetentní centrum pro ICT v oblasti zdravotnictví, sociálního a pracovního systému. TEHIK vznikl 1. ledna 2017 sloučením ICT oddělení Ministerstva sociálních věcí a estonské eHealth Foundation. Jeho úkolem je spravovat více než 40 státních databází a vyvíjet e-služby — přímo pro občany, pro zdravotníky, pro state agencies. Dnes v TEHIK pracuje přes 200 expertů.

Důležité je, co TEHIK *není*: není to dodavatel. Je to státní kompetentní centrum, které vlastní standardy, definuje architektonická pravidla, koordinuje dodavatele a drží kontinuitu přes volební cykly. Státní instituce tohoto typu — schopná technicky vést agendu a zároveň odmítat špatná řešení — je v Česku přesně tím, co chybí. Různé role (NCEZ, ÚZIS, MZ) jsou funkčně rozděleny, ale integrující technická autorita s mandátem i kapacitou chybí.

Klíčové ale je, co estonský úspěch *nedělá*: nestojí na jedné zázračné technologii. Stojí na **governance** — na zákonech, jasných rolích, standardech výměny dat a na důvěře, kterou si stát buduje transparentností. Surovinu (data) má spousta zemí. Estonsko má navíc pravidla a důvěru, díky kterým je ta surovina použitelná. To je lekce, kterou nelze koupit v zakázce.


### Kde se v Česku datová smyčka rozpojuje

Aby data mohla řídit rozhodování, musí projít celým cyklem: vzniknout u poskytovatele, doputovat do sdíleného prostoru, být zpracována a doručena zpět jako informace pro management. Každý článek tohoto řetězce, kde se smyčka přetrhne, zastavuje celý tok. V českém zdravotnictví se přetrhne na více místech najednou.


> [[GRAF: Kde se v ČR datová smyčka rozpojuje — od poskytovatele k managementu]]
> _Podklad:_ Kde se v ČR datová smyčka rozpojuje — od poskytovatele k managementu Vznik dat u poskytovatele NIS, ambulantní SW, eRecept (SÚKL), laboratorní systémy. Data existují, ale jsou fragmentovaná v desítkách proprietárních formátů. Funguje Sdílení přes centrální infrastrukturu NCEZ centrální brána; kmenové registry a infrastruktura sdílení dat nebyly zřízeny ve stanoveném termínu (k 1. 1. 2023). NKÚ 22/20: lékaři nemohou v kritických situacích efektivně získat existující informace o pacientovi. Zlomový bod Pojišťovny a úhradová data VZP a ostatní ZP mají výkazy výkonů — bohatý zdroj. Interoperabilit…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Vendor lock-in: jak se systém zamkne

Opačným pólem dobré governance je **vendor lock-in** — závislost na jednom dodavateli, ze které se nedá levně vystoupit. Paul Pierson by řekl, že je to path dependence s *rostoucími výnosy* v praxi: první volba se zdá levná, ale každý další krok po téže cestě je snazší než přechod jinam, a tak se náklady na vystoupení nabalují, až je migrace prakticky nemožná. Lock-in „nezačne pálit" hned — projeví se až ve chvíli, kdy zadavatel potřebuje systém upravit nebo rozšířit a zjistí, že je rukojmím.

V zdravotnictví je lock-in obzvlášť silný ze tří důvodů. Za prvé, zdravotnické informační systémy (NIS, ambulantní SW, PACS) jsou komplexní a při migraci hrozí ztráta historických dat nebo přerušení provozu — zástavní právo, které žádný ředitel nemocnice nechce aktivovat. Za druhé, smluvní know-how je v rukou dodavatele: integrace, konfigurace, specifická rozšíření jsou záměrně navržena tak, aby byla nepřenositelná. Za třetí, u zdravotnických systémů platí regulatorní zátěž (certifikace zdravotnického prostředku, auditní požadavky) — co bylo jednou certifikováno, se mění velmi neochotně.


> [[GRAF: Anatomie vendor lock-inu — proč se past zaklapne až po letech]]
> _Podklad:_ Anatomie vendor lock-inu — proč se past zaklapne až po letech První zakázka Pořídí se systém — často bez vlastnictví zdrojového kódu, bez požadavku na otevřené formáty. Cena je „výhodná". Akumulace závislosti Data, formáty, integrace a know-how jsou navázané na dodavatele. Přechod by znamenal začít znovu — ztráta dat, výpadek, recertifikace. Zakázky „z nezbytnosti" (JŘBU) Rozšíření a úpravy se zadávají bez soutěže (jednací řízení bez uveřejnění), protože technicky může dodávat jen stávající dodavatel. Konkurenční tlak zmizí. Ztráta soutěže Cenová spirála a patová situace Zadavatel platí víc, m…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Obrana proti lock-inu je přitom známá a je opět spíš o governance než o technologii: **otevřené standardy** (aby data šla přenést), **vlastnictví zdrojových kódů** (aby úpravy mohl udělat i jiný dodavatel) a kvalitní příprava zakázky (aby se zadavatel sám neuvázal). Tyto požadavky stojí na začátku víc úsilí — a šetří roky závislosti. ÚOHS opakovaně rozhodoval o tom, co jsou přípustné podmínky zadávacích dokumentací pro ochranu před lock-inem. NSS tyto spory posunul dál — vyžaduje detailnější analýzu tržní reakce na konkrétní licenční podmínky. Judikatura je stále živá, ale trend je jasný: čím lépe je lock-in prevence zdůvodněna v zadávací dokumentaci, tím lépe obstojí u soudu.


### Path dependence: proč je to více než politologie

Piersonův článek z roku 2000 ve *American Political Science Review* nebyl psán o zdravotnické informatice. Psal se o politických institucích. Ale jeho ústřední teze — že procesy s rostoucími výnosy tvoří self-reinforcing sekvence, kde raná rozhodnutí uzavírají pozdější volby — je v digitalizaci zdravotnictví téměř empiricky ověřitelná. Mechanismus funguje takto:

Za prvé, nastavovací náklady jsou velké a nevratné. Nemocnice, která investovala desítky milionů do NIS, nemůže tuto investici zruinovat migračním projektem. Za druhé, efekty učení jsou uzamčeny u dodavatele: personál umí pracovat s konkrétním systémem a jeho školení a pracovní postupy jsou na tento systém navázány. Za třetí, koordinační efekty: jestliže ostatní nemocnice v regionu nebo pojišťovny používají stejný systém, přechod jinam vytváří interoperabilní bariéru. A za čtvrté — a to je pro Piersona ústřední — adaptivní očekávání: aktéři plánují budoucnost s předpokladem, že stávající systém tu bude. Alternativy se přestávají uvažovat.

Výsledkem je, že systém se nachází v rovnováze, která není optimální — ale z níž se nedá vyjít po jednom kroku. Vystoupení z path dependence vyžaduje koordinaci, politickou vůli přebít krátkodobé náklady migrace a institucionální kapacitu tuto migraci řídit. Estonsko tuto koordinaci zvládlo na přelomu tisíciletí, kdy IT systémy byly méně zakořeněné a souběžná transformace státu (nezávislost, digitalizace veřejné správy) vytvořila politické okno. Česko toto okno tehdy nevyužilo — a každý rok jeho náklady na vstup do alternativní cesty rostou.


### Česká realita: co NKÚ změřil

Že nejde o teorii, doložil v Česku Nejvyšší kontrolní úřad. V kontrolní akci 22/20 prověřil nakládání s prostředky na cíle Národní strategie elektronického zdravotnictví v letech 2019–2022. Zjistění NKÚ byla tvrdá a konkrétní.


> [[GRAF: Co NKÚ zjistil v kontrolní akci 22/20 — klíčová čísla]]
> _Podklad:_ Co NKÚ zjistil v kontrolní akci 22/20 — klíčová čísla 159 mil. Kč vynaloženo na prověřené cíle NSEZ — bez splnění cílů 6 let zpoždění klíčové projekty sdílení dat a eŽádanka 91 mil. Kč — NIS Nemocnice Na Homolce modernizace NIS — součást kontroly NKÚ 0 ze 4 povinných registrů spuštěno k 1. 1. 2023 poskytovatelé, zdravotníci, pacienti, centrální eHealth služby Zdroj: NKÚ, kontrolní akce 22/20 (nku.cz/assets/kon-zavery/k22020.pdf); tisková zpráva NKÚ „Elektronizace zdravotnictví se zpožďuje" (2023). 159 mil. Kč = 122 mil. Kč (Budování departementální eHealth infrastruktury) + 36,6 mil. Kč (Strat…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Konkrétně: Ministerstvo zdravotnictví podle NKÚ **nezřídilo ve stanoveném termínu infrastrukturu pro sdílení dat**. K 1. lednu 2023 — kdy to zákon vyžadoval — chyběly čtyři základní registry (registr poskytovatelů, registr zdravotníků, registr pacientů, centrální eHealth služby) i mechanismus pro logování přístupů. Lékaři v kritické situaci stále nemohou efektivně získat existující informace o pacientovi. Klíčové projekty — sdílení zdravotnické dokumentace a elektronická žádanka (eŽádanka) — nabraly zhruba šestileté zpoždění. A **159 milionů korun** vynaložených na prověřované cíle k jejich splnění nevedlo.

Kontrola NKÚ 22/20 se na vendor lock-in jako takový nezaměřovala. Ale ve struktuře zjištění je patrný jeho otisk: projekty se zpožďují, dodavatelé se mění (nebo nemění), interoperabilita chybí, prostředky odcházejí bez výsledku. To je přesný popis systému, v němž každý aktér optimalizuje svou část, ale žádný z nich nehlídá celek. A v takové fragmentaci lock-in kvete.


### Srovnání: kde jsme a kde jsou ostatní

Estonsko není jediný referenční bod. Dánsko vybudovalo MedCom — národní elektronický zdravotní hub, který propojuje praktiky, nemocnice, lékárny a pojišťovny od devadesátých let. Finsko má systém Kanta, který sdružuje recept, zdravotní záznamy a souhlas pacientů do jednoho rozhraní. Ani tyto země neměly snadnou cestu: Finsko bojovalo s regionální roztříštěností zdravotního systému, Dánsko s odlišnými systémy v každé nemocnici. Všechny ale sdílejí jeden vzor: *investovaly do governance před technologií*, nastavily povinné standardy a vydržely continuity přes více volebních cyklů.


> [[GRAF: Digitalizace zdravotnictví: ověřené milníky — Estonsko vs. Česko]]
> _Podklad:_ Digitalizace zdravotnictví: ověřené milníky — Estonsko vs. Česko 2001 Estonsko: eRecept a centrální zdravotní záznam Pilotní provoz systémů, které tvoří základ dnešního X-Road e-Health. Estonsko je rok po přijetí do NATO, ekonomika roste, reformní okno otevřené. EST 2008 Estonsko: plná implementace once-only + pacientský portál Pacient má přístup k záznamu, vidí logy přístupů. Systém pokrývá celou populaci. EST 2017 Estonsko: TEHIK sloučením ICT kapacit Ministerstvo sociálních věcí a eHealth Foundation sloučí ICT kapacity do jedné státní instituce — TEHIK. Kontinuita a kompetence jsou instituc…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Mezinárodní žebříčky adopce digitálního zdravotnictví — ať už index OECD, nebo evropský Index digitální ekonomiky a společnosti — řadí Česko dlouhodobě pod průměr Evropské unie a výrazně za severské státy a Estonsko. Konkrétní pořadí a hodnoty se liší podle metodiky a roku, a proto je zde záměrně neuvádíme jako tvrdé číslo; směr je ale napříč zdroji stabilní. Podstatné je, *proč* ten rozdíl vzniká: není primárně o penězích ani o schopnostech českých vývojářů. Je o dvou desetiletích odlišných voleb v governance dat — kdo drží standardy, komu patří zdrojový kód a jestli infrastruktura přežije volební cyklus. To jsou pravidla, ne parametry; a právě proto je rozdíl tak houževnatý.


### Symptom slabé zakázkové governance

Symptom slabé zakázkové governance

Netransparentní dodavatelské řetězce ve veřejném IT jsou opakovaným tématem orgánů činných v trestním řízení i ÚOHS. Tam, kde chybí otevřené standardy a konkurence, roste prostor pro přeprodejní řetězce a předražení.

**Pozn. (presumpce neviny):** Konkrétní živé kauzy — včetně vyšetřování zakázek u zdravotních pojišťoven — jsou předmětem trestního řízení. Dokud nepadne pravomocné rozhodnutí, platí presumpce neviny; v tomto textu je uvádíme jen jako *ilustraci systémového rizika*, ne jako prokázaný fakt. Konkrétní čísla budou doplněna až po ověření z primárních zdrojů.


### Vnější tlak: co od Česka žádá EHDS

Česko by možná mohlo pokračovat ve svém tempu — ale Brusel toto tempo nyní kodifikuje jako závazek. Nařízení EU o Evropském prostoru zdravotních dat (EHDS, nařízení 2025/327) vstoupilo v platnost v roce 2025 a od členských států vyžaduje, aby do roku 2027 umožnily přeshraniční sdílení zdravotních dat pacientů v rámci primárního použití a do roku 2029 zpřístupnily data pro sekundární využití (výzkum, tvorba politik). To předpokládá funkční národní infrastrukturu interoperability — standardizované formáty (HL7 FHIR), identifikaci pacientů, souhlas a správu přístupu. Přesně ty vrstvy, které u nás chybí nebo jsou rozestavěny.

EHDS tak funguje jako vnější kotva: Česko nemá svobodu ignorovat interoperabilitu donekonečna, protože od roku 2027 musí být schopno napojit se na přeshraniční síť. Ale kotva funguje jen do té míry, do jaké je domácí infrastruktura připravena nést zátěž. Pokud NCEZ centrální systém spuštěný v lednu 2026 bude postavený znovu na proprietárních rozhraních bez otevřených standardů — EHDS ho z lock-inu sama nevytáhne. Povinnosti budou splněny formálně, ale interoperabilní páteř nevznikne.

Tady se znovu vrací Piersonova logika: okno, které EHDS otevírá, je politicky a časově ohraničené. Pokud ho Česko v příštích dvou až třech letech nevyužije k nastavení governance standardů, nastavení odpovědnosti a zlepšení zadávacích podmínek, příští generace IT kontraktů opět uzamkne systém na dalších deset patnáct let.


### Co konkrétně dělat: páka je v pravidlech zakázky, ne v rozpočtu

Problém datové páteře není primárně technický ani finanční. Je správní. A proto jsou i jeho řešení správní. Lze je rozdělit do tří okruhů.

**Otevřené standardy jako podmínka zakázky.** Každá nová zakázka na zdravotnický informační systém by měla jako minimální požadavek obsahovat povinnost výstupu dat v otevřených formátech (HL7 FHIR, SNOMED CT, LOINC). Toto není nadstandardní požadavek — je to podmínka, bez níž systém do celku nezapadne. Judikatura ÚOHS a NSS tuto oblast aktivně rozvíjí: zadavatelé, kteří dokážou zdůvodnit požadavek otevřených formátů jako prevenci lock-inu, mají stále silnější pozici.

**Vlastnictví zdrojových kódů.** U systémů, které jsou vyvíjeny na zakázku (customizace, integrace, specifické moduly), by stát jako zadavatel měl trvat na vlastnictví zdrojových kódů nebo alespoň na neomezeném licenčním právu je předat jinému dodavateli. Toto je přesný bod, kde se spor o zdrojové kódy u Ministerstva dopravy (ÚOHS 2020, NSS 2023 a 2025) týkal každé vládní IT zakázky. Výsledek judikatury je nuancovaný — vlastnictví krabicového SW se nevyžaduje, ale u customizovaných systémů je argumentace pro ownership silná.

**Institucionální kontinuita.** Největší lekce z Estonska není X-Road, ale TEHIK — instituce, která přežívá vládní cykly, drží standardy a odmítá zakázky, které nesplňují interoperabilní podmínky. Bez obdobné instituce v Česku — ať už jde o posílení NCEZ, ÚZIS nebo nový orgán — bude každá vláda znovu vynalézat kolo a každý nový ministr bude znovu svolávat strategické meetingy, aniž by měl technickou páku k prosazení změn.

Most do zbytku série je přímý. Datová páteř je **předpoklad** všeho, co přijde dál: bez propojených, důvěryhodných dat nelze postavit dashboard (díl 6) ani platit za výsledek bez gamingu — protože výsledek nepůjde spolehlivě změřit. A je to zároveň nejnázornější ukázka pák z předchozího dílu: skutečná páka neleží v tom, kolik peněz do digitalizace nalijeme (parametr), ale v *pravidlech* — otevřených standardech, vlastnictví kódu, governance dat. Estonsko nevyhrálo víc penězi. Vyhrálo lepšími pravidly a kontinuitou, která přečkala volební cykly. Spuštění NCEZ systému k 1. lednu 2026 je krok správným směrem — ale bude záležet na tom, zda pravidla, která systém obklopují, budou dost silná, aby lock-in příště nevznikl znovu.


---

### Zdroje

- e-Estonia — X-Road (interoperabilita a once-only) — decentralizovaná výměna dat, > 2,2 mld. transakcí ročně, log přenosů nikoli centrální databáze. e-estonia.com ↗
- TEHIK — Health and Welfare Information Systems Centre — státní kompetentní centrum pro ICT v zdravotnictví a sociálním systému, > 40 databází, 200+ expertů. tehik.ee ↗
- Digital Care Hub — Estonia's interoperable health records — pacientský audit log přístupů, once-only od 2008. digitalcarehub.co.uk ↗
- Paul Pierson — Increasing Returns, Path Dependence, and the Study of Politics (APSR, 2000) — American Political Science Review, vol. 94(2), s. 251–267. doi.org/10.2307/2586011 ↗
- ÚOHS — rozhodovací praxe k vendor lock-inu — případ Ministerstva dopravy, zdrojové kódy jako pojistka. uohs.gov.cz ↗
- NSS 2 As 87/2022-71 (18. 10. 2023) a 3 As 120/2024-81 (16. 6. 2025) — rozsudky k vendor lock-inu a požadavku zdrojových kódů. zakonyprolidi.cz ↗
- NKÚ — kontrolní akce 22/20 (Národní strategie elektronického zdravotnictví, 2019–2022) — zpoždění, kmenové registry k 1. 1. 2023, infrastruktura sdílení dat, 159 mil. Kč. kontrolní závěr (PDF) ↗
- NKÚ — tisková zpráva „Elektronizace zdravotnictví se zpožďuje" — shrnutí závěrů KA 22/20 pro média. nku.cz ↗
- NCEZ — Národní centrum elektronického zdravotnictví — stav implementace, spuštění centrálního systému 1. 1. 2026. ncez.mzcr.cz ↗
- Pozn.: Klíčová tvrzení v tomto článku jsou ověřena z primárních zdrojů (NKÚ, ÚOHS, NSS, e-Estonia, TEHIK, Pierson APSR 2000). Kauzy v trestním řízení nejsou v textu konkretizovány; platí presumpce neviny. eHealth index hodnoty jsou orientační (OECD DHI kompozit).

<!-- Zdroj webu: clanek-datova-patere-lock-in.html · skorezdravotnictvi.cz/clanek-datova-patere-lock-in -->