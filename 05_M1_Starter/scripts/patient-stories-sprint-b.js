// Sprint B — 11 příběhů Priority 2 (HR + finance + výstupy)
import fs from 'node:fs';
import path from 'node:path';

const STORIES = {
  lekari_per_1000: `Hradec Králové, sestra Petra (47) telefonuje pacientovi z gastrologie. „Pan doktor Vašíček ordinuje až za šest týdnů, zkuste se objednat na privátním u dr. Kalouska — tam vás vezmou za týden za 1 800 Kč." Tahle replika ilustruje paradox české kapacitní statistiky: lékařů máme nad OECD průměrem, přesto čekání chronicky narůstá.

Hustota lékařů v ČR je 4,2 lékaře na 1 000 obyvatel (ÚZIS NRPZS, 2024). OECD průměr 3,9, EU 4,0 — Česko je signal good, mírně nadprůměrné. Hodnota dlouhodobě roste (2010: 3,7), tempo cca 0,05 lékaře/1 000 ročně. Distribuce je ale extrémně nerovnoměrná: Praha 6,5, Středočeský 2,9, Karlovarský 3,1. Specializačně chybí praktici (cca 80 % cíle podle ÚZIS analýzy 2024), pediatři pro venkov, neurologové, dětští psychiatři.

Strukturálně český systém má dostatek lékařských licencí, ale problém v distribuci, generační výměně a úvazcích. Třetina českých lékařů je ve věku 60+, polovina těch z nich plánuje odchod do pěti let. Mladí absolventi (viz absolventi_lekarstvi_per_100k) doplňují kohortu jen z 65 %. Lékaři pracují na zkrácený úvazek, často na více úvazků současně (1 lékař = 1,2–1,5 statisticky vykázané plné úvazky). Privátní samoplatební ambulance odčerpávají kapacitu z hrazené sítě.

Hustota lékařů je proxy strukturní kapacity systému. Politické páky: úhradová motivace pro odlehlé regiony (model finských „peripherally tariffs"); dotační program rezidenčních míst v deficitních specializacích; rozšíření kompetencí sester praktiků (nurse practitioners model — UK NICE 2023); registrace fakultních absolventů u praktika do prvních 5 let. Indikátor v HSPA dashboardu sleduje hustotu jako strukturální kapacitu — ale interpretovat ji nutno společně s distribucí, specializačním mixem a úvazkovou intenzitou.`,

  sestry_per_1000: `JIP fakultní nemocnice, ranní směna, sestra Veronika přebírá 4 pacienty po kardiochirurgické operaci. WHO doporučení pro JIP: 1 sestra na 1 pacienta. Realita ČR: poměr 1:2,5 nebo i 1:3, podle směny a oddělení. Chyba v dávkování léků nebo ve sledování vitálních funkcí je tu statisticky pravděpodobnější — a nese ji systém, nikoli individuální sestra.

Hustota zdravotních sester v ČR je 9,0 na 1 000 obyvatel (ÚZIS, 2024). OECD průměr je 9,2, EU 8,5. Česko je signal warn — těsně pod OECD, nad EU. Pomalý nárůst (2010: 8,3) maskuje strukturální problém: vysoký věkový průměr (45+), vysoká fluktuace mladých sester (odchod do 5 let cca 30 %), nízká atraktivita oboru pro Y/Z generaci. Mezery na nočních směnách a v odlehlých nemocnicích jsou kritické.

Strukturálně český systém má počty sester nominálně dobré, ale úvazkově horší. Sestra v ČR často pracuje na 1,2 úvazku (přesčasy), což zkresluje statistiku. Personální normy (sestra/lůžko) jsou definované, ale ne závazné — nedostatečné personální obsazení je v některých nemocnicích trvalý stav. Mzdy sester rostly v posledních pěti letech rychleji než průměrná mzda, ale stále zaostávají za sousedním Německem (kde sestra vydělá 1,8× víc), takže odchod kvalifikovaných sester do DE/AT pokračuje.

Sestry jsou v každém zdravotním systému kritickou kapacitní vrstvou — bez nich nelze provozovat lůžkovou péči. Politické páky: rozšíření kompetencí (samostatná preskripce, prevence, edukace pacienta — UK model nurse-led clinics); dotační program návratu sester z mateřské/zahraničí; udržitelný mzdový plán s vazbou na úvazkovou intenzitu; investice do středního zdravotnického školství. Indikátor v HSPA dashboardu sleduje hustotu sester jako klíčový ukazatel personální udržitelnosti.`,

  absolventi_lekarstvi_per_100k: `Lékařská fakulta, červen, promoce. 350 nových lékařů vchází do bílých plášťů. V Česku ročně promuje cca 1 380 absolventů všeobecného lékařství — 13 na 100 000 obyvatel. To je signal warn — pod OECD průměrem 14 a pod EU průměrem 15. Pro doplnění odcházející kohorty (cca 1 500 lékařů ročně do důchodu) je to mírný deficit. Pro pokrytí demografického tlaku (stárnoucí populace) ještě výraznější.

Absolventi všeobecného lékařství na 100 000 obyvatel: ČR 13, OECD 14, EU 15 (OECD Health Statistics, 2023). Trend je pomalu rostoucí (2010: 11, 2024: 13), tempo nedostatečné. Kapacita lékařských fakult v ČR je v posledních 10 letech politicky zvyšována, ale narazí na kapacitní limity klinických stáží (nedostatek lůžek s mentorovým dohledem). Zahraniční studenti tvoří cca 25 % studentů LF — z nich většina po promoci odejde domů nebo do EU.

Strukturálně český systém vyučí dostatek lékařů, ale obtížně je udrží v hrazené síti a v deficitních specializacích. Praktické lékařství, dětská psychiatrie, gerontopsychiatrie, infektologie, soudní lékařství — to jsou obory s chronicky neobsazenými rezidenčními místy. Rezidenční dotační program existuje, ale částky jsou nízké (do 50 000 Kč/měsíc). Migrace mladých lékařů do DE/AT je v některých regionech 25 % kohorty (Karlovarský, Liberecký kraj).

Absolventi lékařství jsou indikátor budoucí kapacity. Bez 14–15 absolventů/100k populace systém v 10leté projekci nemůže pokrýt poptávku. Politické páky: zvýšení kapacity LF (nárůst o 200 míst ročně do 2030); zvýšení rezidenčních dotací v deficitních specializacích (model Rakouska s vázanou službou); dotační program „lékař v okrese" pro venkov (model Bavorska); rozšíření spolupráce s privátními poskytovateli na klinické stáže. Indikátor v HSPA dashboardu sleduje pipeline absolventů jako klíčový ukazatel udržitelnosti systému.`,

  psychiatri_per_100k: `Olomoucký kraj, pondělí, mladá maminka (28) volá k dětskému psychiatrovi. „Můj syn (7) má od září úzkostné záchvaty, učitelka doporučuje vyšetření." Nejbližší volný termín: leden — sedm měsíců. Druhá ambulance: jaro 2027. Tři volné termíny pro samoplatební vyšetření v Brně do 14 dnů za 2 500 Kč. Mezera mezi poptávkou a kapacitou je v dětské psychiatrii v ČR brutálně velká.

Hustota psychiatrů v ČR je 13 na 100 000 obyvatel (ÚZIS NRPZS, 2024). OECD průměr je 17,3, EU 17,6. Česko je signal bad — o 24 % pod OECD průměrem. U dětských psychiatrů je situace dramatičtější: cca 2,5 / 100 000 dětí, vs. cíl EU 8–10. V některých krajích (Karlovarský, Liberecký) je jeden dětský psychiatr na 100 000+ dětí. Trend pomalu roste (2010: 11; 2024: 13), ale nedostatečně vzhledem k růstu poptávky o 40 % za 10 let.

Strukturálně český systém psychiatrické péče prochází Reformou psychiatrické péče (od 2013), která má za cíl posun z lůžkové péče v psychiatrických nemocnicích do komunitní péče (Centra duševního zdraví). Reforma je rozjetá, ale ne kompletní — v některých krajích CDZ chybí, lůžkové kapacity ubývají rychleji, než roste komunitní péče. Generační výměna psychiatrů (60+ kohorta připravuje odchod) není pokryta novými absolventy.

Psychiatři jsou kritický deficit systému. Politické páky: zvýšení rezidenčních dotací v psychiatrii a dětské psychiatrii (cca 50 nových míst ročně); dokončení Reformy psychiatrické péče (kapacita CDZ v každém okrese); telemedicínská psychiatrie (rozšíření hrazené konzultace přes video); rozšíření kompetencí klinického psychologa a sestry pro mental health první linii (model UK IAPT). Indikátor v HSPA dashboardu sleduje psychiatry jako klíčový ukazatel kapacity duševního zdraví — jednoho z nejvíce zaostávajících systémových oborů v ČR.`,

  ehealth_adoption: `Praha, ordinace praktického lékaře, ranní vizita 67letého pacienta po hospitalizaci. „Doktore, propouštěcí zprávu z nemocnice jste dostal?" — „Bohužel ne, oni mi to faxují s týdenním zpožděním." Tato scéna je v Česku 2025 stále realistická. eHealth systém v ČR má základní stavební prvky (eRecept, eŽádanka, NCEZ), ale plná interoperabilita nemocnic, ambulancí a pojišťoven dosud chybí.

eHealth Adoption Index ČR je 62/100 (vlastní složený index, NCEZ + MZ ČR 2024). OECD průměr je 70/100, EU 68/100. Česko je signal bad. Komponenty: eRecept funguje na 99 % (od 2018 povinný), eŽádanka spuštěna 2020 částečně, propouštěcí zpráva v digitální formě dostupná v cca 65 % nemocnic, sdílení obrazové dokumentace mezi nemocnicemi limitované, pacientský portál „Můj zdravotní záznam" (NCEZ) má cca 800 000 uživatelů z 10 milionů.

Strukturálně český eHealth má dvě hlavní mezery: (1) interoperabilita systémů poskytovatelů (nemocnice mají různé HIS, často nekompatibilní); (2) pacientský přístup k vlastním datům (formálně garantován GDPR, prakticky pomalu se rozjíždí). Národní strategie eHealth 2025–2035 byla schválena, implementační tempo ale váhá. Pojišťovny mají vlastní pacientské portály — duplikace, nikoli synergický systém. Estonsko, Dánsko a Finsko mají jednotnou pacientskou identitu a 100 % nemocnic v jednom systému už od 2005.

eHealth je infrastruktura, která umožňuje vše ostatní — telemedicínu, kvalitu, prevenci, výzkum, pacientskou angažovanost. Politické páky: závazný technický standard interoperability (model Finska); plošný rollout pacientského portálu (cíl 5 mil. aktivních uživatelů do 2028); finanční motivace nemocnic za interoperabilitu (úhradová bonifikace); osobní digitální identita pacienta (BankID model Švédsko/Norsko). Indikátor v HSPA dashboardu sleduje eHealth adoption jako klíčový ukazatel digitální zralosti systému.`,

  vydaje_zdravotnictvi_hdp: `Ministerstvo financí, příprava státního rozpočtu, jednání o úhradové vyhlášce. „Pojišťovny chtějí navýšení o 28 mld., my máme možný strop 18." V této matematice se rozhoduje, kolik Češi v dalším roce na zdravotnictví vyhradí — a indikátor „výdaje na zdravotnictví jako % HDP" je výsledný součet, který tuto debatu reflektuje.

Výdaje na zdravotnictví v ČR jsou 8,5 % HDP (2024, ČSÚ SHA). OECD průměr je 9,3 %, EU 10,4 % — Česko je signal neutral, mírně pod průměrem. V absolutní hodnotě cca 660 mld. Kč ročně. Trend rostoucí (2000: 6,2 %, 2010: 7,2 %, 2024: 8,5 %). Vysoký podíl tvoří veřejné zdravotní pojištění (cca 80 %), zbytek státní rozpočet, kraje, samoplátci (cca 14 % — viz indikátor platba_z_kapsy_pct).

Strukturálně český systém je financován primárně z příjmů ze zdravotního pojištění (13,5 % vyměřovacího základu zaměstnance + zaměstnavatele). Stát platí za státní pojištěnce (děti, důchodci, OSVČ minimální, ženy na MD/RD) paušál — ten je dlouhodobě nedostatečný a tvoří chronický rozpočtový tlak. Index 8,5 % HDP odráží kombinaci konzervativní fiskální politiky a nižší zdravotní inflace než v sousedních zemích.

Výdaje na zdravotnictví jsou debatní agenda — víc neznamená automaticky lépe (US 17 % HDP, ale horší výsledky než EU). Politicky relevantní jsou: efektivita využití (DRG systém, hodnotová úhrada), distribuce mezi segmenty (lůžková 56 %, ambulantní 28 %, léky 10 %), a alokace (regiony, specializace). Česko by mělo směřovat k cca 9,5 % HDP do 2030 (CEFRES/MZ ČR analýza 2024), pokud chce dohnat západoevropský standard kvality. Indikátor v HSPA dashboardu sleduje výdaje jako klíčový kontextový parametr funkčnosti systému.`,

  vydaje_leky_hdp: `Lékárna, Praha 4, čtvrtek ráno, 73letá důchodkyně přebírá tři recepty. „1 700 Kč doplatek, paní." Pacientka má 5 chronických léků, měsíční výdaj rodiny za léky cca 3 500 Kč. To je v Česku běžné, zejména u starších pacientů s polypragmazií (viz indikátor polypragmazie_65plus). Vysoké výdaje na léky jsou kombinací stárnoucí populace, šíření nových molekul a omezené cenové páky státu.

Výdaje na léky v ČR jsou 1,7 % HDP (2024). OECD průměr 1,5 %, EU 1,4 % — Česko je nad oběma průměry. V absolutní hodnotě cca 132 mld. Kč ročně, z toho cca 75 % hradí zdravotní pojišťovny, 25 % pacient (doplatek + samoléčba). Trend rostoucí (2010: 1,5 %; 2024: 1,7 %). Vysoký podíl tvoří inovativní léčiva (onkologie, biologika, RA, vzácná onemocnění), které tlačí celkový rozpočet nahoru.

Strukturálně český systém má fixní seznam hrazených léků (SÚKL), referenční ceny (regulovaný maximum), a paralelní distribuci (umožňující reexport — viz indikátor vypadky_leciv_aktivní). Centralizované vyjednávání cen je v Česku slabší než v Německu (AMNOG benefit assessment) nebo Velké Británii (NICE health technology appraisal). U inovativních léčiv „extra-financování" přes mimořádné úhrady stoupá, ale nesystémově.

Výdaje na léky jsou indikátor lékové politiky státu — nízké hodnoty mohou znamenat omezenou dostupnost (Polsko, Rumunsko), vysoké hodnoty buď bohatství systému nebo neefektivitu. Česko je v evropském středu. Politické páky: posílení hodnotové úhrady (HTA s českou perspektivou; rozšíření spolupráce s EUNetHTA); zvýšení role generik a biosimilars (cíl 70 % objemu generik); reforma kategorií léků (kategorie A bez doplatku, kategorie B s doplatkem, kategorie C samoplatebné). Indikátor v HSPA dashboardu sleduje výdaje na léky jako klíčový kontextový parametr lékové politiky.`,

  platba_z_kapsy_pct: `Stomatologická ambulance, plzeňské sídliště. „Korunka — 8 500 Kč, pojišťovna nehradí." 65letá důchodkyně počítá: má důchod 18 000 Kč, jak na to dosáhne. Stomatologie, brýle, sluchadla, samoléčba, nadstandardní zákroky — sektory, kde pacient platí z kapsy. Out-of-pocket payment je v Česku 14 % všech zdravotních výdajů — pod průměrem OECD, ale s tlakem na růst.

Platba z kapsy (out-of-pocket, OOP) jako % celkových zdravotních výdajů v ČR je 14 % (2024). OECD průměr 18 %, EU 15 %. Česko je signal good — relativně nízké. Trend stabilní: 2010 — 15 %, 2024 — 14 %. Struktura OOP: stomatologie cca 40 %, doplatky za léky 25 %, samoléčba 15 %, nadstandardní zákroky a kosmetika 10 %, zdravotnické potřeby (sluchadla, brýle nad rámec) 10 %.

Strukturálně český systém má rozsáhlý standard hrazené péče — zákon 48/1997 Sb. definuje, co pojišťovna hradí. OOP vstupuje hlavně v segmentech, kde standard je technicky překonaný (stomatologie — pojišťovna hradí amalgam, kov, pro estetické řešení doplatí pacient) nebo kde existují nadstandardní varianty (porod, oční operace). Ochranný limit pro doplatky léků (5 000 Kč ročně, u dětí a důchodců 1 000) odlehčuje rodinám s vysokou polypragmazií.

OOP je indikátor finanční dostupnosti péče — vysoké hodnoty znamenají, že systém přenáší zátěž na rodinu, nízké hodnoty znamenají dobré pokrytí. Česko je v evropském benchmarku dobré. Politicky aktuální jsou: reforma standardu stomatologické péče (rozšíření hrazených materiálů); valorizace ochranného limitu pro chroniky; expanze úhrady sluchadel a brýlí pro nízkopříjmové. Pacientská zátěž je distribuovaná nerovnoměrně — nízkopříjmoví senioři s polypragmazií spotřebovávají disproporčně velkou část OOP. Indikátor v HSPA dashboardu sleduje OOP jako klíčový ukazatel finanční dostupnosti péče.`,

  unmet_need_medical: `EU SILC, jaro 2025, výzkum kvality života. Respondentka 47 let, Brno: „Potřebovala jsem v posledních 12 měsících lékaře a nedostala jsem ho?" — „Ne." Ve většině zemí EU by stejnou odpověď dala 2–3 % respondentů. V Česku 0,3 %. To je formálně skvělý výsledek — ale skrývá problém, který indikátor nezachytí.

Unmet need for medical examination v ČR je 0,3 % populace 16+ (Eurostat EU-SILC, 2025). OECD průměr 2,4 %, EU 2,4 %. Česko je signal good — výrazně pod průměrem. Trend dlouhodobě stabilní: 2010 — 0,7 %, 2024 — 0,3 %. Měření: dotaz respondentovi, zda v posledních 12 měsících potřeboval, ale nedostal lékařskou péči. Hlavní důvody pro „unmet": finanční (v ČR marginální), čekací doby (sub-population), vzdálenost (rural), nepřítomnost specialisty.

Strukturálně český systém má velkoryse definovaný balík hrazené péče (zákon 48/1997 Sb.) a hustou síť poskytovatelů. „Formální dostupnost" je vysoká — formálně každý má pojišťovnu, registrující praktika, a může jít na vyšetření. Co indikátor neměří: čekání 5+ měsíců na specialistu (viz indikátor cekaci_doby_specialist), samoplatební obejití hrazené sítě, fragmentaci péče u chroniků, nedostatek specialistů pro mentální zdraví a dětskou psychiatrii.

Unmet medical need je formálně silný indikátor přístupnosti — ale jeho české skvělé hodnoty je třeba interpretovat opatrně. Češi mají dobrou formální přístupnost; reálná kvalita zkušenosti se ale skrývá v jiných indikátorech (čekací doby, spokojenost s informací, OOP). Politicky to znamená neoslabit silnou stránku (univerzální pokrytí, hustá síť), ale doplnit ji o kvalitativní parametry — Patient Reported Experience Measures (PREMs), které dosud v Česku systematicky neměříme. Indikátor v HSPA dashboardu sleduje unmet need jako formální ukazatel dostupnosti.`,

  spokojenost_pece: `Královské Vinohrady, propouštění z chirurgie po laparoskopické cholecystektomii. „Jak jste celkově spokojen s péčí?" — „Ano, byl jsem spokojen." 75 % Čechů hodnotí péči pozitivně (Eurobarometer 2024). To je víc než průměr OECD (64 %) a víc než průměr EU (67 %). Je to skvělý výsledek — ale je třeba ho číst spolu s ostatními parametry zkušenosti.

Spokojenost s posledním kontaktem s lékařem v ČR je 75 % (Eurobarometer „Quality of Healthcare", 2024). OECD průměr 64 %, EU 67 % — Česko nadprůměrné. Trend stabilní (2010: 73 %, 2024: 75 %). Spokojenost je nejvyšší v hospitalizační péči (78 %), nejnižší u dlouhodobých čekacích dob (cca 58 %). Mezi věkovými skupinami je rozdíl: 65+ uvádí spokojenost 82 %, mladí 18–35 cca 68 %.

Strukturálně český systém má dvě vrstvy zkušenosti: technická péče (operace, diagnostika, léčba) je hodnocena velmi pozitivně — Češi mají dobré výsledky a důvěru v odbornost. Komunikační vrstva (čekací doby, informování pacienta, koordinace mezi odděleními) je hodnocena méně příznivě — viz indikátor spokojenost_informovani (72 %). Mezi nemocnicemi je výrazná variabilita.

Spokojenost s péčí je PREM (patient-reported experience measure) — důležitý ukazatel kvality, který doplňuje klinické indikátory. Politicky: investovat do koordinace péče (case manager pro chroniky), zlepšit informování o čekacích dobách (transparentní dashboard NHS-like), pravidelný national PREM survey (model NHS Inpatient Survey, který Česko nemá). Spokojenost je dobrá — ale potenciál je vyšší, zejména v koordinaci a v komunikaci. Indikátor v HSPA dashboardu sleduje spokojenost jako klíčový PREM ukazatel.`,

  spokojenost_informovani: `Ambulance interny, dělá se ECHO, lékař dokončí vyšetření, podá pacientce papír s výsledkem: „Tady to máte, kontrola za rok, kontaktujte praktika." Pacientka odchází bez vysvětlení nálezu, bez vyjádření, co znamená pro běžný život. Tahle scéna je v ČR statisticky modální — informování pacienta je hodnoceno hůř než péče samotná.

Spokojenost s informováním lékařem v ČR je 72 % (Eurobarometer 2024). OECD průměr 78 %, EU 76 % — Česko je signal warn, pod průměry. Rozdíl 3–6 procentních bodů je systémový. Mezi věkovými skupinami: 65+ uvádí spokojenost 78 % (často proto, že explicitních očekávání mají méně), mladí 18–35 cca 64 % (vyšší očekávání podloženého rozhovoru o léčbě, vedlejších účincích, alternativách).

Strukturálně český systém má kapacitní problém ve vstupní vrstvě: praktik má průměrně 12 minut na pacienta, specialista 15–20 minut. To je málo na řádné informování o diagnóze, vysvětlení léčby, diskusi o vedlejších účincích a o alternativách. Komunikační dovednosti jsou součástí lékařských fakult, ale jejich procvičování v praxi je omezené. Pacientské materiály (letáky, brožury, online edukace) v češtině existují, ale jsou roztříštěné. Asociace pacientů jako STAN, AAA, MAMMA HELP suplují systém, ale s limitovanou kapacitou.

Informování pacienta je klíčové pro adherenci ke léčbě, prevenci a sebepéči — bez něj selhává compliance, roste polypragmazie, snižuje se efektivita léčby. Politicky: prodloužení času na konzultaci v primární péči (model Norska — 20 min default); investice do shared decision making nástrojů (NICE Patient Decision Aids); zařazení komunikačních dovedností do CEUMS; národní pacientský portál se srozumitelnou edukací (UK NHS Choices model). Indikátor v HSPA dashboardu sleduje informování jako klíčový PREM parametr zkušenosti pacienta.`,
};

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CARDS = path.resolve(ROOT, '..', 'indicators');
let updated = 0, skipped = 0;

for (const [id, story] of Object.entries(STORIES)) {
  const file = path.join(CARDS, `${id}.json`);
  if (!fs.existsSync(file)) { console.error('MISSING:', id); continue; }
  const card = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (card.patient_story && card.patient_story.trim().length > 50) { console.log('SKIP:', id); skipped++; continue; }
  const out = {};
  let inserted = false;
  for (const [k, v] of Object.entries(card)) {
    if (k === 'framework' && !inserted) { out.patient_story = story.trim(); inserted = true; }
    out[k] = v;
  }
  if (!inserted) out.patient_story = story.trim();
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  updated++;
  console.log('OK:', id);
}
console.log(`\nDone. Updated: ${updated}. Skipped: ${skipped}.`);
