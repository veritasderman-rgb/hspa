---
slug: digi-2-jak-funguje-api
dil: 7
poradi: 6
audit: verified
stitky: Digitalizace, Vysvětlujeme, Série „Digitální zdravotnictví“ · díl 2 z 5
---

# Jak to funguje pod kapotou: co je API a proč data zůstávají u lékaře

**V prvním dílu jsme slíbili, že vám nikdy nebudeme předhazovat slova jako „API“ nebo „interoperabilita“ bez vysvětlení. Čas splnit slib. Tenhle díl je z celé pětidílné série technicky „nejhlubší“ — ale nebojte se: vše si ukážeme na okénku na úřadě, na společném jazyku a na tom, jak vás systém pozná, když u přepážky stojíte právě vy. Když dočtete, budete rozumět tomu, co se ve zdravotnictví děje „pod kapotou“, lépe než většina lidí, kteří o digitalizaci mluví v televizi.**

V prvním dílu jsme slíbili, že vám nikdy nebudeme předhazovat slova jako „API“ nebo „interoperabilita“ bez vysvětlení. Čas splnit slib. Tenhle díl je z celé pětidílné série technicky „nejhlubší“ — ale nebojte se: vše si ukážeme na okénku na úřadě, na společném jazyku a na tom, jak vás systém pozná, když u přepážky stojíte právě vy. Když dočtete, budete rozumět tomu, co se ve zdravotnictví děje „pod kapotou“, lépe než většina lidí, kteří o digitalizaci mluví v televizi.


> [[GRAF: Tři pojmy, čtyři čísla — co táhne digitální zdravotnictví]]
> _Podklad:_ Tři pojmy, čtyři čísla — co táhne digitální zdravotnictví 2023 Evropa volí společný jazyk eHealth Network 30. 3. 2023 doporučila HL7 FHIR pro nové případy užití 23 z 27 států EU pro tu volbu většinová podpora členských zemí pro HL7 FHIR 2030 dokdy se udržuje český DASTA domácí standard se nejdéle do té doby nahrazuje mezinárodním 0 centrálních skladů dokumentace data zůstávají u poskytovatelů — federovaná architektura Zdroj: eHealth Network (síť pro e-zdravotnictví dle směrnice 2011/24/EU), HL7 International, NCEZ / MZ ČR, zákon č. 325/2021 Sb. Roky přechodu na nový standard jsou orientační — …
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### API jako okénko na úřadě

Představte si přepážku na úřadě. Přijdete, podáte vyplněný formulář s konkrétním požadavkem („potřebuji výpis z rejstříku“), úřednice ho vezme, zpracuje podle pevných pravidel a podá vám zpátky přesně to, co jste chtěli. Nemusíte vědět, co se děje vzadu v archivu — stačí, že přepážka má jasná pravidla: co se na ni dá podat, v jaké formě, a co dostanete nazpět. Přesně tohle je **API** (z anglického „application programming interface“, tedy rozhraní pro propojení programů): dohodnutá přepážka mezi dvěma počítačovými programy, přes kterou si automaticky předávají data podle předem domluvených pravidel.

Zkusme to na zdravotnickém příkladu. Program ve vaší ordinaci potřebuje vědět, jaké léky pacient bere. Místo aby lékař volal kolegům nebo luštil staré papíry, pošle jeho program přes API krátký, přesně naformulovaný dotaz centrální službě: „jaké platné předpisy má tenhle pacient?“. Služba podle pravidel ověří oprávnění, vyhledá údaje a pošle zpátky *strukturovanou odpověď* — tedy data uspořádaná tak, že je počítač hned chápe a umí zobrazit v přehledné tabulce. Žádné ruční přepisování, žádné luštění rukopisu.

Klíčové slovo je „strukturovaná“. Kdyby přepážka vracela odpověď jako volně psaný dopis, musel by si ho program znovu pracně „přečíst“ a hádat, kde je název léku a kde dávkování. API proto vrací data v pevném tvaru — jako kdyby úřednice místo věty vyplnila kolonky předtištěného formuláře, ve kterých je vždy jasné, co kam patří.


> [[GRAF: Jak putuje dotaz přes API — a proč se data jen „půjčí“]]
> _Podklad:_ Jak putuje dotaz přes API — a proč se data jen „půjčí“ 1 · Program lékaře pošle dotaz Software v ordinaci zformuluje přesný dotaz — „jaké platné předpisy má tento pacient?“ — a odešle ho přes API, tedy dohodnutou přepážku, nikoli e-mailem nebo telefonem. Otázka podle pravidel 2 · Rozhraní zkontroluje pravidla Přepážka ověří, že dotaz má správný tvar a že tazatel má oprávnění data vidět. Teprve pak ho pustí dál. Pravidla jsou pevná a stejná pro všechny. Kontrola formy i oprávnění 3 · Odpovídající systém vyhledá data Dotaz dorazí do systému, kde data skutečně leží (úložiště receptů, registr). Te…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Všimněte si posledního kroku: data se *půjčila*, ne nasypala na hromadu. To je rozdíl, který odlišuje moderní zdravotnický systém od strašáka „jedné velké databáze“. Přepážka umožní položit otázku a dostat odpověď, aniž by si někdo musel pořizovat trvalou kopii všeho o všech.


### Aby si systémy rozuměly: interoperabilita a společný jazyk

Přepážka sama o sobě nestačí. Představte si, že na ni přijde formulář vyplněný v jazyce, kterému úřednice nerozumí — přepážka tu je, ale dohoda vázne. U počítačů je to stejné: i když mají API, musí se shodnout na *formátu* dat, jinak si navzájem nerozumí. Schopnost různých systémů si vzájemně rozumět a smysluplně si předávat data se odborně jmenuje **interoperabilita**. Je to vlastně dohoda na společném jazyce.

Česko si dlouhá léta vystačilo s vlastním standardem zvaným **DASTA** (Datový standard Ministerstva zdravotnictví). Funguje dodnes a počítá se s tím, že se bude udržovat nejdéle do roku 2030 — postupně ho ale nahrazuje mezinárodní standard **HL7 FHIR**. Ten má jednu velkou výhodu: mluví jím čím dál víc systémů po celém světě, takže česká data zapadnou do evropského i globálního prostředí. Pro přeshraniční přenos dokumentů (například když se léčíte v jiné zemi EU) se používá ještě formát HL7 CDA, který umí zabalit celý dokument tak, aby mu rozuměl systém v cizině.

Není to jen česká úvaha. Evropská *eHealth Network* — síť, ve které spolupracují členské státy na elektronickém zdravotnictví — na svém zasedání 30. března 2023 doporučila HL7 FHIR jako základní standard pro nové případy užití: laboratorní výsledky, propouštěcí zprávy z nemocnice i lékařské snímky. Tuto volbu podpořilo 23 z 27 zemí Evropské unie. Když tedy ČR přechází na HL7 FHIR, jde stejným směrem jako většina Evropy.

Jenže společný jazyk není jen o gramatice — je i o slovníku. Když jeden systém napíše „rýma“, druhý „akutní rinitida“ a třetí jen číselný kód, musí existovat dohoda, že jde o totéž. Proto NCEZ buduje takzvaný *terminologický server* — sdílené odborné slovníky (mezinárodní číselníky SNOMED CT a LOINC), které zaručí, že stejná diagnóza nebo stejný laboratorní test znamenají napříč všemi systémy přesně jednu a tutéž věc.


> [[GRAF: Tři „jazyky“ zdravotnických dat — kdy se používá který]]
> _Podklad:_ Tři „jazyky“ zdravotnických dat — kdy se používá který Standard K čemu slouží Kde se používá Výhled DASTA domácí formát pro výměnu zdravotnických dat (laboratoře, žádanky, zprávy) tradičně po celé ČR mezi ordinacemi, laboratořemi a nemocnicemi udržuje se nejdéle do roku 2030, pak ústup HL7 FHIR moderní mezinárodní standard pro nové výměny dat přes API nově budované služby v ČR i nový společný základ v EU nastupující hlavní standard HL7 CDA zabalení celého dokumentu (zpráva, souhrn) pro přenos přeshraniční sdílení dokumentů mezi zeměmi EU nadále pro přeshraniční dokumenty Zdroj: NCEZ / MZ ČR (D…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Páteř, ne sklad: integrované datové rozhraní

Teď navážeme na to, co zaznělo už v prvním dílu — a vysvětlíme to do hloubky. Česko záměrně **nestaví centrální úložiště zdravotnické dokumentace**, tedy žádný jeden obří sklad, kde by ležely kompletní záznamy všech občanů. Místo toho buduje **integrované datové rozhraní**: bezpečnou spojovací páteř, přes kterou si jednotliví poskytovatelé předají data teprve ve chvíli, kdy je potřeba. Odborně se takové architektuře říká „federovaná“ — místo jedné hromady je to síť propojených ostrovů.

Vaše data tedy zůstávají tam, kde vznikla: u praktického lékaře, v nemocnici, v laboratoři. Když je některý oprávněný lékař potřebuje, položí přes API dotaz (vzpomeňte na přepážku z první sekce) a dostane odpověď. Existuje sice i **dočasné úložiště**, ale plní jen velmi omezenou roli: krátkodobě podrží „zásilku“ dat — třeba zprávu připravenou k vyzvednutí jiným lékařem — a jakmile si ji adresát poprvé vyzvedne, role tohoto úložiště končí. Není to trvalý archiv, spíš výdejní box na zásilku.

Proč zrovna takhle, a ne pohodlnější „všechno na jedno místo“? Hlavní důvod je bezpečnost. Jedna obří databáze by byla nejlákavějším možným cílem útoku a zároveň jediným *kritickým bodem selhání* — kdyby vypadla nebo ji někdo prolomil, ohrozí to úplně všechno naráz. Síť rozprostřených, oddělených ostrovů dat je proti tomu mnohem odolnější: výpadek jednoho místa neshodí celý systém a útočník nezíská jedním průnikem kompletní záznamy celé země. Méně pohodlí pro stavitele, mnohem víc bezpečí pro pacienta.


### Jak systém pozná, že u přepážky stojíte vy: digitální identita

U úřední přepážky se prokazujete občankou. V digitálním světě potřebujete totéž — jistotu, že u přepážky stojí opravdu ten, kdo tvrdí, že tam stojí. K tomu slouží **NIA**, tedy Národní identitní autorita (zřízená zákonem č. 250/2017 Sb. o elektronické identifikaci, spravuje ji Digitální a informační agentura). Je to jednotné, státem zaručené přihlášení: jednou ověřenou identitou se dostanete do mnoha různých služeb. Prakticky ji znáte pod jmény jako bankovní identita, eObčanka nebo Mobilní klíč eGovernmentu — to všechno jsou způsoby, jak se přes NIA bezpečně přihlásit.

S identitou souvisí ještě jedna tichá, ale důležitá změna. Dřív se ve zdravotnictví všechno vázalo na rodné číslo — jenže rodné číslo prozrazuje datum narození i pohlaví a používá se napříč celým státem, takže není ideální z hlediska soukromí. Zákon o elektronizaci proto zavádí **bezvýznamový identifikátor** pacienta: nic neprozrazující číslo, které slouží jen k jednoznačnému určení osoby v systému e-zdravotnictví. Obdobně dostávají vlastní identifikátor i zdravotničtí pracovníci. „Bezvýznamový“ znamená přesně to — z čísla samotného nikdo nic nevyčte, je to jen klíč k záznamu.


### Kdo se mi díval do dat: kontrola a stopa

Otevřenost systému by byla k ničemu, kdybyste neměli přehled, kdo k vašim datům přistupuje. Proto každé nahlédnutí zanechává stopu v **žurnálu činností** — auditní stopě, do které se zapisuje, kdo a kdy se vám do záznamů díval. Stejně jako vám banka ukáže seznam plateb, systém e-zdravotnictví umožní zpětně zobrazit seznam přístupů k vašim zdravotnickým datům. Pokud něco nesedí, je to dohledatelné.

Druhým nástrojem kontroly je **registr oprávnění**. V něm jsou uložené vaše souhlasy a nesouhlasy — tedy kdo smí vaše data sdílet a vidět. Sami tak držíte v ruce nastavení toho, komu se přepážka otevře. Spolu se žurnálem činností tvoří dvojici, která mění logiku celého systému: nejde o to, že někde leží vaše data a vy doufáte v nejlepší, ale o to, že o každém přístupu existuje záznam a vy nad sdílením máte kontrolu.

A tím se dostáváme k otázce, kterou jsme zatím obešli: kdo to všechno vlastně provozuje? Co jsou ty „staré“ samostatné služby jako eRecept a co je nová centrální páteř **NCEZ** spuštěná v roce 2026? Přesně o těchto dvou vrstvách systému — a o tom, kdo za kterou zodpovídá — je celý třetí díl série. Teď už ale víte to hlavní: API je přepážka, interoperabilita je společný jazyk a vaše data zůstávají u lékaře.


---

### Zdroje

- NCEZ — standardy a interoperabilita — Národní centrum elektronického zdravotnictví, informace o DASTA, FHIR, terminologickém serveru a integrovaném datovém rozhraní. ncez.mzcr.cz ↗
- HL7 FHIR (verze R4) — oficiální specifikace mezinárodního standardu pro výměnu zdravotnických dat. hl7.org/fhir/R4 ↗
- Zákon č. 325/2021 Sb. o elektronizaci zdravotnictví — integrované datové rozhraní, dočasné úložiště, žurnál činností, registr oprávnění, bezvýznamový identifikátor. zakonyprolidi.cz ↗
- NIA / Identita občana — jednotné přihlášení ke státním službám (bankovní identita, eObčanka, Mobilní klíč eGovernmentu). identitaobcana.cz ↗
- Digitální a informační agentura (DIA) — správce Národní identitní autority. dia.gov.cz ↗
- Pozn. k údajům: Tento díl je vysvětlující a zjednodušující — používá analogie, aby byly technické principy srozumitelné laikovi. Konkrétní technické detaily (verze standardů, harmonogram přechodu z DASTA na HL7 FHIR, rozsah povinného nasazení) se průběžně vyvíjejí; roky uvedené jako výhled berte jako orientační.

<!-- Zdroj webu: clanek-digi-2-jak-funguje-api.html · skorezdravotnictvi.cz/clanek-digi-2-jak-funguje-api -->