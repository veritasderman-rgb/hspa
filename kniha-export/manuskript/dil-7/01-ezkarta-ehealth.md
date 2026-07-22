---
slug: ezkarta-ehealth
dil: 7
poradi: 1
audit: verified
stitky: Digitalizace, EZKarta · Patient Summary · interoperabilita
---

# Šedesát dva ze sta. Český eHealth má EZKartu v telefonu — ale dva ze tří lékařů Patient Summary nepoužili

**Elektronické zdravotnictví není v dashboardu HSPA Monitoru samostatná diagnóza — je to vrstva, která ovlivňuje skoro všechny ostatní. Pokud lékař v ambulanci nevidí, jakou medikaci pacient bere, jaký nález mu udělali v nemocnici a jaký screening už proběhl, není to jen otázka pohodlí. Je to opakování vyšetření, lékové interakce, propadlé screeningové intervaly a delší čas k diagnóze. Česko v poslední dekádě digitalizovalo dílčí kroky — eRecept, eNeschopenku, datové schránky pro některé úkony — a má i legislativní rámec pro elektronickou zdravotní dokumentaci. Co dosud chybělo, byla integrující vrstva: jeden přehled, do kterého má pacient i lékař spolehlivý přístup. EZKarta měla být pokusem tu vrstvu nasadit.**

Elektronické zdravotnictví není v dashboardu HSPA Monitoru samostatná diagnóza — je to vrstva, která ovlivňuje skoro všechny ostatní. Pokud lékař v ambulanci nevidí, jakou medikaci pacient bere, jaký nález mu udělali v nemocnici a jaký screening už proběhl, není to jen otázka pohodlí. Je to opakování vyšetření, lékové interakce, propadlé screeningové intervaly a delší čas k diagnóze. Česko v poslední dekádě digitalizovalo dílčí kroky — eRecept, eNeschopenku, datové schránky pro některé úkony — a má i legislativní rámec pro elektronickou zdravotní dokumentaci. Co dosud chybělo, byla integrující vrstva: jeden přehled, do kterého má pacient i lékař spolehlivý přístup. EZKarta měla být pokusem tu vrstvu nasadit.


> [[GRAF: EZKarta — integrující vrstva eHealth ČR]]
> _Podklad:_ EZKarta — integrující vrstva eHealth ČR 86 mil eReceptů 2024 99 % adopce mezi lékaři + lékárnami 2020 spuštění eNeschopenky (povinné) propojení lékař ↔ ČSSZ ↔ zaměstnavatel 56 % dospělé populace s NIA 5 mil uživatelů · DIA 2/2026 · úzké hrdlo 325/2021 zákon o elektronizaci zdravotnictví novela 236/2025 — od 2026 + EHDS 2029–2031 Zdroj: SÚKL eRecept reporting, ČSSZ, DIA 2/2026, Sbírka zákonů 325/2021 + 236/2025; Nařízení (EU) 2025/327 (EHDS) — primární přeshraniční využití: skupina 1 (pacientská shrnutí, eRecepty) od 26. 3. 2029, skupina 2 (lab. nálezy, propouštěcí zprávy, snímky) od 26. 3. 203…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Co dashboard ukazuje a co o něm musíme vědět

Indikátor **eHealth adopce** v dashboardu kombinuje pokrytí elektronickou zdravotní dokumentací, eRecepty, telemedicínu a interoperabilitu do jednoho indexu na škále 0–100. Hodnota 62 v roce 2024 (z 55 v roce 2020) vychází z průzkumu MZ ČR doplněného o evropský DESI Health. Trend je vzestupný, ale tempo srovnání s vedoucími zeměmi neudrží — Estonsko se v tomto indexu pohybuje nad 90, Dánsko a Finsko v rozmezí 80–88. Průměr OECD 70 a EU 68 je tedy laťka, kterou jsme zatím nepřekročili.


> [[GRAF: eHealth adopce — index 0–100, 2024]]
> _Podklad:_ eHealth adopce — index 0–100, 2024 25 50 75 100 Estonsko 92 Dánsko 84 Finsko 84 OECD průměr 70 EU průměr 68 Česko 62 Zdroj: dashboard HSPA Monitoru — MZ ČR + DESI Health (2024). Estonsko, Dánsko a Finsko: hodnoty zaokrouhlené uvnitř udávaných rozmezí.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Druhý relevantní indikátor je **spokojenost pacientů s informováním**: 72 procent v roce 2024, OECD průměr 78. Není to jen o eHealthu — souvisí i s časem lékaře v ambulanci a komunikační kulturou — ale studie z poslední dekády opakovaně ukazují, že přístup k vlastním datům a srozumitelný digitální interface tuto hodnotu zvedají. Estonské a dánské pacientské portály jsou nejlepší tabulkový důkaz: kvalita informování po jejich nasazení vzrostla o 8 až 12 procentních bodů v dotaznících, které zachovaly metodiku.


### EZKarta v pilotu: čísla, která je třeba brát vážně

Petrová a Bruthans publikovali v *Digital Health* v březnu 2026 první systematickou evaluaci pilotní fáze EZKarty. Smíšený design — kvantitativní dotazník u 209 účastníků pilotu plus kvalitativní rozhovory se stakeholdery. Klíčový výsledek: **UMUX skóre použitelnosti 33,2 ± 6,5** je statisticky významně pod mezinárodním benchmarkem (p < 2,2 × 10⁻¹⁶). UMUX je čtyřpoložkový dotazník zachycující vnímanou užitečnost a srozumitelnost; na 100bodové škále se aplikace v běžném komerčním nasazení pohybují kolem 70 a aplikace, které lidé doporučují dál, kolem 80. Třiatřicet je hluboko pod tím, co se v profesionální literatuře považuje za přijatelnou minimální použitelnost.

Spokojenost vyjadřuje 38 procent uživatelů. **72 procent ale uvádí, že by aplikaci používali, kdyby byla integrovaná s klinickými systémy** — tedy kdyby v ní viděli reálná data ze své dokumentace, ne jen formulář. To je důležité: problém není v poptávce. Problém je v tom, co aplikace v pilotu skutečně dělá. Autoři identifikují tři hlavní bariéry — omezenou funkcionalitu, chybějící napojení na klinické systémy a nejasný přidaný užitek pro pacienta. Závěr autorů: „EZKarta exemplifikuje příležitosti i omezení adopce mHealthu v transformujících se zdravotních systémech." Fragmentovaná governance, slabá institucionální koordinace a netransparentní komunikace o tom, co se chystá kdy spustit, jsou podle autorů hlavní brzdy.


### Pohled lékařů: 1 739 respondentů, dva ze tří Patient Summary nepoužili

Hospodková, Bruthans a Englová — z téže katedry biomedicínského inženýrství ČVUT — publikovali v *International Journal of Medical Informatics* výsledky průřezového dotazníku, který v únoru a březnu 2025 rozeslali všem registrovaným českým lékařům. Vrátilo se 1 739 odpovědí (návratnost 4,14 procenta). Klíčová zjištění:

- **66,4 procenta lékařů Patient Summary vůbec nepoužilo.** Patient Summary je standardizovaný strukturovaný výtah pacientovy zdravotní dokumentace — léky, alergie, diagnózy, recentní vyšetření — který je v EU součástí infrastruktury přeshraničního eHealthu (eHDSI) a v ČR ho zprostředkovává Národní kontaktní bod pro elektronické zdravotnictví.
- **72,1 procenta nevědělo, že jejich elektronický záznam pacienta lze na národní kontaktní bod napojit.** Tedy ani ne, že existuje cesta, jak data sdílet v rámci EU.
- **Pouze 1,7 procenta uvedlo, že napojení reálně mají.**
- Délka praxe nehrála roli (p = 0,391). Statisticky významný rozdíl byl podle specializace (p < 0,001) — nejvyšší adopce je v intenzivní medicíně a interně, nejnižší v ambulantních specializacích.


> [[GRAF: Z 1 739 dotazovaných českých lékařů (Hospodková et al. 2026)]]
> _Podklad:_ Z 1 739 dotazovaných českých lékařů (Hospodková et al. 2026) 66,4 % Patient Summary nikdy nepoužilo 72,1 % neví o napojení na národní kontaktní bod 1,7 % má reálně funkční integraci Zdroj: Hospodková, Bruthans, Englová — Int J Med Inform 03/2026 (PMID 41443122). Návratnost dotazníku 4,14 % všech registrovaných lékařů ČR.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Autoři uzavírají, že nízké využití pramení primárně z omezeného povědomí a slabé systémové integrace, a doporučují cílená opatření: zlepšit komunikaci, posílit digitální vzdělávání lékařů a zaměřit politiku na konkrétní bariéry napojení. Jinými slovy — pokud lékař o nástroji neví, nepřekvapí, že ho nepoužívá.


### Tři vrstvy problému

Když se obě studie čtou společně, vyjde z nich konzistentní diagnóza ve třech vrstvách.

**Použitelnost.** Pilot národní pacientské aplikace propadl ve standardizovaném testu použitelnosti, který se v digitálním zdravotnictví dlouhodobě používá. To není kritika tým, který aplikaci vyvíjel — pilot má ukázat, co nefunguje, dříve než se nasadí v plné šíři. Otázka je, jestli závěry pilotu vstoupí do dalších verzí, nebo jestli se aplikace pustí do plošného nasazení s týmiž omezeními. Mezinárodní praxe ukazuje, že nasadit nepoužitelnou aplikaci je horší než ji odložit — jednou nepříjemná zkušenost znamená, že pacient se k ní už dlouho nevrátí.

**Integrace.** Sedmdesát dva procent pilotních uživatelů, kteří aplikaci chtějí používat, ale jen pokud uvidí svá data, ukazuje, kde se hraje. Bez napojení na elektronické záznamy poskytovatelů péče zůstává EZKarta funkčně prázdná. Český problém není v tom, že by národní úroveň digitalizace neměla rámec — eRecept funguje, eNeschopenka funguje, k Národnímu kontaktnímu bodu existuje legislativa. Problém je v tom, že napojení na úroveň jednotlivých nemocnic, ambulancí a klinických informačních systémů zůstává dobrovolné, neuhrazované a v praxi rozdrobené mezi dodavateli softwaru.

**Governance.** Když dva ze tří českých lékařů neznají Patient Summary a téměř tři čtvrtiny nevědí o napojení na národní kontaktní bod, není to chyba lékařů. Je to symptom, že komunikace o eHealth strategii zůstává mezi institucemi a do první linie nedoputovává. Estonsko, Dánsko ani Finsko necentralizovaly všechno; co dotáhly, je *jasná koordinace, jeden viditelný vlastník programu a stabilní financování*, díky kterému dodavatelé softwaru vědí, do čeho investovat. V ČR se odpovědnost za eHealth pohybuje mezi MZ ČR, ÚZIS, NÚDZ a ad-hoc platformami; to není administrativní detail, je to věc, která se promítá do tempa nasazení.


### Co dělá Estonsko, Dánsko a Finsko jinak

**Estonsko.** Páteřní platforma X-Road běží od roku 2001, e-recept od roku 2010 pokrývá přes 99 procent předpisů, pacientský portál *digilugu.ee* je standardní vstupní bod pro všechny zdravotní záznamy. Lékař i pacient vidí stejný obraz. Estonské nasazení mělo rozpočet, který v poměru k populaci odpovídá českým investicím za posledních pět let, ale rozprostřený do dvou dekád. Časový horizont, ne náklady, je hlavní rozdíl.

**Dánsko.** Pacientský portál *sundhed.dk* existuje od roku 2003 a integruje všechny dánské zdravotní záznamy včetně laboratorních výsledků, předpisů, hospitalizačních zpráv a očkování. Klíčové není jen technické řešení; je to fakt, že portál je *defaultní cestou*, jak dánský pacient se zdravotním systémem komunikuje. Dotazníky pacientské spokojenosti s informováním v Dánsku stoupají od jeho nasazení.

**Finsko.** Národní platforma *Kanta* sjednocuje recepty, archiv pacientských záznamů a osobní zdravotní deník. Adopce mezi lékaři přesahuje 99 procent, podle finských hodnotících studií je doba úspory na pacientské epizody měřitelná v desítkách minut. Finská zkušenost ukazuje, co je třeba: zákonná povinnost pro poskytovatele se napojit, jasné technické standardy, jeden centrální archiv a národní program adopce mezi lékaři, který běží roky.


### Co s tím

Pro pacienta, který chce dnes využít to, co v ČR existuje: *eRecept* je funkční národní služba, kterou používá většina ambulantních lékařů a kterou pacient vidí v aplikacích typu eRecept, IZIP nebo lékárenských portálech; *eNeschopenka* běží automaticky; *Národní zdravotnický informační portál* (nzip.cz) shromažďuje ověřené informace; *EZKarta* je v dispozici na hlavních platformách, ale očekávejte, že její funkční hloubka v této chvíli odpovídá pilotní fázi a má prokazatelně problém s použitelností. Pokud chcete, aby vás lékař viděl s Patient Summary, je obvykle nutné se zeptat aktivně — nebo požádat o výtah z elektronické dokumentace svého poskytovatele.

Pro tvůrce politik je sdělení obou studií konkrétní. Za prvé: výsledky pilotu EZKarty zařadit do plánu redesignu ještě před plošným nasazením; UMUX 33 není kosmetická vada. Za druhé: napojení poskytovatelů na národní kontaktní bod by nemělo zůstat dobrovolné — ze srovnání se severskými zeměmi vyplývá, že rozhodující byl moment, kdy stát stanovil jasný termín, technické standardy a financování. Za třetí: cílit komunikační a vzdělávací program přímo na ambulantní lékaře, kde je adopce nejnižší. Za čtvrté: ujasnit, kdo je v české eHealth strategii vlastníkem programu — bez toho zůstává jádrový problém governance, který se rok od roku opakuje. Šedesát dva ze sta není fyziologický strop českého eHealth indexu. Je to výsledek dvaceti let, ve kterých se digitalizace dělala po kouscích, a moment, kdy se rozhoduje, jestli těch dvacet bude pokračovat, nebo jestli další dekáda dotáhne to, co Estonci spustili před patnácti lety.


---

### Zdroje

- Petrová PH, Bruthans J, Ondrejková M. From pilot to policy: Adoption of the National mHealth application EZKarta in Czechia. Digital Health, 03/2026. PubMed ↗
- Hospodková P, Bruthans J, Englová A. Physicians' attitudes toward the patient summary in the Czech Republic. International Journal of Medical Informatics, 03/2026. PubMed ↗
- European Commission — DESI Health — evropský benchmark digitální zralosti zdravotnictví. digital-strategy.ec.europa.eu ↗
- OECD — Health at a Glance, kapitola Digital Health — mezinárodní srovnání eHealth indikátorů. oecd.org ↗
- Národní kontaktní bod pro eHealth (NCPeH ČR) — Patient Summary a přeshraniční výměna. ncpeh.uzis.cz ↗
- MZ ČR — Národní strategie elektronického zdravotnictví — domácí strategický rámec a aktuální stav. nzip.cz ↗
- e-Estonia — Healthcare — referenční popis estonského X-Road a digilugu.ee. e-estonia.com ↗
- sundhed.dk — dánský pacientský portál, referenční model integrace. sundhed.dk ↗
- Kanta (Finsko) — finský národní archiv zdravotních záznamů a receptů. kanta.fi ↗
- Pozn. k údajům: Hodnoty eHealth indexu a spokojenosti s informováním pocházejí z dashboardu HSPA Monitoru ke dni vydání článku. Pro detailní časové řady a metodiku doporučujeme primární zdroje (DESI Health, OECD Health at a Glance, MZ ČR). Citované studie z PubMedu jsou recenzované; jejich interpretaci ale vždy doplňujte o metodickou diskusi v originálech — UMUX i návratnost dotazníků mají své limity, které autoři otevřeně přiznávají.

<!-- Zdroj webu: clanek-ezkarta-ehealth.html · skorezdravotnictvi.cz/clanek-ezkarta-ehealth -->