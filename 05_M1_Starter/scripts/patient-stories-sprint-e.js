// Sprint E (finalize) — rozšíření 13 legacy patient_story na plnohodnotné 4-odstavcové
// stories (200-500 slov). Reaguje na user feedback "některé příběhy se nepropsaly".
import fs from 'node:fs';
import path from 'node:path';

const STORIES = {
  dojezd_zzs: `Karlovarský kraj, sobota odpoledne. Pan Procházka (67), bývalý lázeňský zaměstnanec, dostává doma náhle prudkou bolest na hrudi, která vyzařuje do levé paže. Manželka volá 155. Operátor zdravotnického operačního střediska (ZOS) na základě otázek (bolest, dušnost, pocení) klasifikuje výzvu jako Prio 1 STEMI — okamžitý výjezd rychlé záchranné posádky (RZP) s lékařem. Cíl: dostat pacienta na PCI sál do Karlovarské krajské nemocnice (kardiocentrum) v rámci dveře-balon ≤ 90 minut. Klíčové je, kolik z těchto 90 minut spotřebuje samotná ZZS.

Dojezd ZZS do 20 minut v ČR splňuje 94,2 % výjezdů (AZZS + ÚZIS, 2024). Národní cíl: ≥ 95 % (operační koncept AZZS). OECD srovnatelný indikátor neexistuje — různé země používají různé prahy (NHS England 18 min pro Category 2; švédský SOS Alarm 20 min pro 95 % Prio 1). Signal neutral. Mezi kraji je rozptyl: Karlovarský kraj deklaruje průměrný dojezd 14,2 minuty, Praha 9,8, Jihočeský 13,8.

Strukturálně český systém má 315 výjezdových základen a 596 výjezdových skupin (AZZS 2024). Jejich rozmístění je dáno Plánem pokrytí území kraje a vychází z dojezdové izochrony 20 minut do 99 % obydleného území. Letecká zdravotnická záchranná služba (LZS, 10 stanovišť) zkracuje dojezd v horských oblastech. Kvalita triáže operátora ZOS rozhoduje, zda na vážný stav vyjede správná posádka okamžitě.

Indikátor 95 % výjezdů do 20 minut neznamená, že se v každé minutě a každé obci vejdeme. Znamená, že systém je v průměru tak nastavený, aby v 95 případech ze 100 stihl pana Procházku zachránit dříve, než infarkt nevratně poškodí srdeční sval. Politické páky: navýšení kapacity výjezdových základen v marginalizovaných regionech; udržitelná obnova vozového parku z krajských rozpočtů; doplňkový indikátor pro lékařskou pohotovostní službu (LPS) po novele zákona 372/2011 Sb. od 1. 1. 2026, která přesunula odpovědnost na zdravotní pojišťovny. Indikátor v HSPA dashboardu sleduje dojezd ZZS jako klíčový ukazatel rovnosti přístupu k akutní péči.`,

  lekarny_per_100k: `Karlovarský kraj, malé pohraniční městečko, pátek odpoledne. Pacient přijde k jediné místní lékárně — zavřeno (pohotovostní lékárna 25 km daleko). V Praze tuhle situaci pacient nezná: lékáren je hustá síť, 24/7 pohotovost ve více provozech. Mezi kraji je v ČR výrazná disparita v dostupnosti lékáren — celostátní průměr maskuje regionální nerovnosti.

Hustota lékáren v ČR je 26,7 na 100 000 obyvatel (SÚKL, 2024). OECD průměr 30,4, EU 32 — Česko je signal neutral, mírně pod průměrem. Trend stabilní (2015: 27,5; 2024: 26,7). Distribuce nerovnoměrná: Praha 35+/100k, Karlovarský a Liberecký kraj 22/100k. Lékárny v obchodních centrech a online lékárny rostou; tradiční městské a venkovské pomalu ubývají.

Strukturálně český lékárenský systém je liberalizovaný (od 1989 plný trh), s regulací jen u marže na rxRx léky. Koncentrace v sítích (Dr. Max, BENU, Pilulka) přesahuje 50 % trhu. Venkovské lékárny mají problém s návštěvností a personálem (farmaceut 1:5 000 obyvatel). Pohotovostní lékárny jsou v některých krajích koncentrované jen v krajských městech.

Lékárna je pro starší pacienty s polypragmazií klíčový kontakt se systémem — víc než praktik. Politické páky: regulace minimální sítě lékáren v krajích (model Polska — počet lékáren per obyvatele); podpora venkovských lékáren (krajské dotace, „lékárna v okrese"); rozšíření kompetencí farmaceuta (medication review, deprescribing, screening); pravidelná veřejná diskuse o vyváženosti tržního a regulovaného modelu. Indikátor v HSPA dashboardu sleduje lékárenskou hustotu jako klíčový ukazatel přístupnosti farmaceutické péče.`,

  lpod_share_critical: `Krajská nemocnice, oddělení biochemie, listopadové ráno. Lékárnice volá ze špitálu: „Nemáme epinefrin v injekci. Třetí týden, dodavatel slibuje, ale stále nic." Pacient v anafylaktickém šoku potřebuje epinefrin v sekundách. Tahle situace patří k 5,4 % léčivých přípravků, které jsou v ČR aktuálně klasifikovány jako kritické výpadky.

Podíl léčivých přípravků s kritickým výpadkem v ČR je 5,4 % všech registrovaných LP (SÚKL, 2024). OECD průměr 4 %, EU 4,5 % — Česko signal bad. Trend rostoucí (2018: 2,8 %; 2024: 5,4 %). Z toho cca 30 % výpadků trvajících nad 3 měsíce (skutečné kritické), 70 % krátkodobých přerušení. Nejvíce postižené třídy: antibiotika, onkologika, neurologická léčiva (antikonvulziva), kardiovaskulární přípravky.

Strukturálně český problém s výpadky léčiv kombinuje: paralelní vývoz z ČR do zemí s vyššími cenami (DE, AT, NL); globální narušení dodavatelských řetězců (post-COVID, výrobní problémy v Asii); úzkou marži generik (dodavatelé nemají rezervní kapacitu); nedostatek transparentního monitoringu výpadků v reálném čase. SÚKL má registr výpadků, ale s časovým posunem.

Výpadky léčiv mají přímé klinické důsledky — pacient bez epinefrinu, antikoncepce, antibiotika, antiepileptika čelí riziku. Politické páky: omezení paralelního exportu prioritních léčiv (analog DE Lieferengpassgesetz 2020); strategická rezerva kritických léčiv (model NHS UK Critical Medicines List); rychlejší reporting (24-48 hodin od identifikace výpadku); evropská spolupráce přes EMA Critical Medicines Alliance. Indikátor v HSPA dashboardu sleduje kritické výpadky LP jako klíčový ukazatel funkčnosti farmaceutického systému.`,

  mortalita_inhosp_ami: `Karlovy Vary, kardiocentrum, pondělí ráno. Pan Procházka (67) dorazil v sanitce s STEMI před 78 minutami. Door-to-balloon 38 minut. Implantovaný stent v RIA, hemodynamika stabilní, kardiogenní šok zažehnán. Tahle scéna v české akutní kardiologii je standardní praxe. Třicetidenní úmrtnost po hospitalizaci pro AMI je v ČR 5,2 procenta — jedna z nejlepších hodnot v OECD.

In-hospital mortalita po akutním infarktu myokardu (AMI) v ČR je 5,2 % (OECD Health at a Glance 2025, ref. rok 2023, admission-based, věkově-pohlavně standardizováno, 45+). OECD průměr 6,5, EU 6,7 — Česko signal good. Trend dlouhodobě klesající (2000: ~12 %, 2023: 5,2 %) — důsledek systematické centralizace akutní kardiologické péče od konce 90. let.

Strukturálně český systém má síť 22 kardiocenter (akreditovaných MZ ČR jako centra vysoce specializované kardiovaskulární péče), pokrývající celou republiku v dojezdu 60 minut. Primární PCI 24/7. Akademické registry CZECH-1, -2, -3 (Widimský et al.) přinášejí kontinuální audit kvality. Síť kardiocenter je modelovým případem úspěšné centralizace v českém systému — od „kardiologie všude trochu" v 90. letech k „kardiologie v centrech, dobře" po roce 2010.

Tahle hodnota je pro Česko strategicky důležitá. Politické páky: udržení standardu (financování center, mzdové ohodnocení kardiologů); rozšíření modelu na další obory (CMP iktová centra už hotovo — viz mortalita_inhosp_cmp; onkologie KOC; akutní traumatologie); kontinuální audit přes NRKI/NRKOI; rozšíření primární prevence ke snížení populační KV mortality (viz mortalita_kardiovaskularni — 463,75 / 100 000, nad EU průměrem). Akutní vrstva výborná, populační rezerva před vstupem do nemocnice. Indikátor v HSPA dashboardu sleduje AMI mortalitu jako klíčový ukazatel kvality české akutní kardiologie.`,

  mortalita_inhosp_cmp: `Ústí nad Labem, iktové centrum, čtvrtek dopoledne. Paní Nováková (72) přijata pro náhlou pravostrannou hemiparézu před 90 minutami. CT angio, perfuzní MRI, indikace mechanické trombektomie. Operace zahájena 142 minut od počátku symptomů. Tahle scéna je standard české péče o cévní mozkovou příhodu (CMP) — ale výsledky jsou horší než u AMI.

In-hospital mortalita po ischemické CMP v ČR je 11,2 % (ÚZIS NRH, 2024). OECD průměr 7,7, EU 8,5 — Česko signal bad. Trend pomalu klesající (2010: 14,5 %; 2024: 11,2 %). POZOR: ÚZIS NRH měří úmrtí během hospitalizace, OECD H@G 2025 30denní case-fatality admission-based (unlinked). Metodicky NEsrovnatelné 1:1 — mezera mezi ČR a OECD je pravděpodobně menší než přímý rozdíl 11,2 vs. 7,7 %.

Strukturálně český systém má síť 13 komplexních iktových center (KIC) a 32 iktových center (IC), pokrytí relativně dobré. Trombolýza 4,5 hodiny od počátku symptomů, trombektomie u vybraných pacientů až 24 hodin (na základě perfuzní/DWI selekce, dle DAWN 2018 a DEFUSE-3 2018 studií). RES-Q registr přináší kvalitativní audit. Mezery: prevence (kontrola hypertenze, FA detekce, statiny v primární prevenci); rehabilitace po CMP (limitovaná kapacita); sekundární prevence (adherence k léčbě).

Cílem není sám trombolytický výkon — cílem je pacient bez doživotního handikepu. Politické páky: udržení standardu KIC/IC; rozšíření populačního screeningu fibrilace síní (model UK NHS FAST programu); rozšíření kardiorehabilitace a neurorehabilitace; tobacco a alcohol control (snížení rizikových faktorů); aktualizace ESO Guidelines IV thrombolysis 2021 + Mechanical Thrombectomy 2019 v české klinické praxi. Indikátor v HSPA dashboardu sleduje CMP mortalitu jako klíčový ukazatel kvality akutní neurokardio-vaskulární péče.`,

  podil_vydaje_ambulantni_pece: `Praktický lékař v Olomouci, čtvrtek ráno, 18 pacientů v ordinaci. Krátké konzultace, recepty, neschopenky, preventivní prohlídky. Primární péče je páteří českého systému — ale je nedostatečně oceněna. Z celkových výdajů zdravotního pojištění míří do ambulantního sektoru jen 28,5 procenta.

Podíl výdajů na ambulantní péči v ČR je 28,5 % všech zdravotnických výdajů (ÚZIS SHA, 2023). OECD průměr 37 %, EU 35 % — Česko signal neutral, výrazně pod průměrem. V absolutní hodnotě cca 131 mld. Kč ročně. Trend stabilní (2010: 27 %, 2023: 28,5 %). Pro srovnání: lůžková péče má v Česku 55,9 % (oproti OECD 30 %) — viz indikátor podil_vydaje_luzkova_pece.

Strukturálně český systém je historicky organizovaný kolem lůžkové péče (dědictví socialistického zdravotnictví). Ambulantní sektor (praktici, ambulantní specialisté, pediatrie, gynekologie) je sice široce rozvinutý, ale finančně podhodnocený relativně k poptávce. Praktici v ČR mají v průměru 12 minut na pacienta (vs. UK GP 15 min, NL 20 min). Specialisté na zhruba 15–20 minut. Časový tlak omezuje hloubku konzultace, prevenci a edukaci.

Posílení primární péče by snížilo zátěž nemocnic a zlepšilo výsledky chronických pacientů. Politické páky: posun financování od lůžkové k ambulantní vrstvě (cíl: 35 % do 2030, OECD úroveň); zvýšení kapitační platby praktikům za care plan multimorbidních pacientů; rozšířené kompetence praktika (sex. medicine, mental health první linie, deprescribing); ekonomicky výhodnější je předcházet hospitalizaci než ji platit. Indikátor v HSPA dashboardu sleduje podíl ambulantní péče jako klíčový strukturální parametr českého systému.`,

  podil_vydaje_leky: `Lékárna Praha 4, čtvrteční ráno, výdej receptů. Pacientka přebírá tři léky — měsíční doplatek 1 700 Kč. Léková politika je v ČR komplexní propletení regulovaných cen, doplatků, samoléčby a inovativních léčiv. Z celkových výdajů zdravotního pojištění míří do lékové vrstvy 9,9 procenta — pod průměrem OECD.

Podíl výdajů na léky v ČR je 9,9 % všech zdravotnických výdajů (SÚKL+ÚZIS, 2023). OECD průměr 16 %, EU 15,5 % — Česko signal neutral, výrazně pod průměrem. POZOR: rozdíl mezi „% celkových výdajů" a „% HDP" (viz indikátor vydaje_leky_hdp = 1,7 % HDP, mírně nad EU průměrem 1,4 %) — interpretace závisí na denominátoru.

Strukturálně český systém má rozsáhlou kontrolu lékových cen (SÚKL referenční cena, maximální obchodní přirážka, kategorie hrazených LP). Generika a biosimilars tvoří cca 65 % objemu (cíl EU 70 %). Inovativní léčiva (onkologika, biologika, vzácná onemocnění) tvoří rostoucí podíl výdajů — strukturální tlak, který v 2030+ může dramaticky změnit poměry.

Lékovou vrstvu HSPA Monitor sleduje ze dvou perspektiv: makro (% výdajů, % HDP) a mikro (out-of-pocket pacient, viz platba_z_kapsy_pct). Politické páky: rozšíření hodnotové úhrady (HTA s českou perspektivou, spolupráce EUNetHTA); udržení vysokého podílu generik a biosimilars; transparentní kategorie hrazených léků; aktivní monitoring výpadků (viz vypadky_leciv_aktivni). Indikátor v HSPA dashboardu sleduje podíl lékových výdajů jako kontextový parametr farmaceutické politiky.`,

  podil_vydaje_luzkova_pece: `Krajská nemocnice, internistické oddělení, 50 lůžek z toho 33 obsazených seniory. Lůžková péče je v Česku dominantní vrstvou zdravotního systému — 55,9 procenta všech výdajů zdravotního pojištění míří do nemocnic. To je téměř dvojnásobek průměru OECD (30 %). Dědictví socialistické organizace zdravotnictví.

Podíl výdajů na lůžkovou péči v ČR je 55,9 % všech zdravotnických výdajů (ÚZIS SHA, 2023). OECD průměr 30 %, EU 32 % — Česko signal neutral (kontextová hodnota). V absolutní hodnotě cca 257 mld. Kč ročně. Trend pomalu klesající (2010: 60 %, 2023: 55,9 %), ale tempo nedostatečné na dosažení OECD struktury.

Strukturálně český systém má vysoký počet akutních lůžek (4,1 na 1 000 obyvatel — viz indikátor postele_akutni_per_1000) a vysokou hospitalizační aktivitu (18 800 hospitalizací na 100 000 — viz hospitalizace_na_100k). Některé výkony, které jsou v Nizozemsku nebo UK ambulantní, vyžadují v ČR hospitalizaci 2–4 dnů. Dominance lůžkové péče je historická — ale finančně neudržitelná v dlouhodobém horizontu (lůžkový den ~10× dražší než ambulantní kontakt).

Strukturální transformace systému je dlouhodobá agenda. Politické páky: rozšíření jednodenní chirurgie (UK Day Surgery Best Practice Tariffs); rozšíření ambulantní specializované péče (model nizozemské Tweedelijn); reforma okresních nemocnic (clanek-okresni-nemocnice-personalni-krize); konverze nadbytečných akutních lůžek na LDN, paliativní a rehabilitační (kde poptávka roste). Indikátor v HSPA dashboardu sleduje podíl lůžkové péče jako klíčový strukturální parametr — Česko by mělo do 2035 dosáhnout cca 40 %.`,

  pracovnici_ltc_per_100_65plus: `Domov pro seniory, ranní směna. 80letá paní Veverková potřebuje pomoc s ranní hygienou, podáním léků, oblékáním. V Česku má na 100 osob 65+ k dispozici jen 2,5 pracovníka dlouhodobé péče (LTC). V Norsku 6, ve Švédsku 5, v Nizozemsku 4,5. Mezera je strukturální — a roste s každou další seniorskou kohortou.

Pracovníci dlouhodobé péče (LTC) na 100 osob 65+ v ČR jsou 2,5 (ÚZIS+MPSV, 2024). OECD průměr 5, EU 4,6 — Česko signal bad, dramatický nedostatek. Trend stagnuje (2015: 2,3; 2024: 2,5) — populace 65+ roste rychleji než LTC kapacita. Mezi kraji rozptyl: Praha 3,2, Karlovarský 1,9. Pracovníci LTC zahrnují pečovatelky v terénní službě, pracovníky v domovech pro seniory, ošetřovatele v LDN.

Strukturálně český systém dlouhodobé péče je rozdělen mezi MPSV (sociální péče) a MZ ČR (zdravotní vrstva — LDN, ošetřovatelé). Rozhraní mezi nimi je problematické (viz clanek-socialne-zdravotni-pomezi-2026). Mzdové ohodnocení pracovníků LTC je v ČR jednou z nejnižších ve veřejné sféře (průměr ~28 000 Kč/měsíc 2024). Vysoká fluktuace, vyhoření, nábor z Ukrajiny a Slovenska.

Demografická křivka je neúprosná — počet osob 65+ v ČR roste o cca 50 000 ročně, ale počet pracovníků LTC roste minimálně. Bez systémové reformy bude v 2035 mezera neudržitelná. Politické páky: navýšení mezd v LTC (cíl: 1,5× současné úrovně do 2030); investice do středního zdravotnického a sociálního školství; reforma rozhraní zdravotní/sociální (jednotné financování case-managementu); rozšíření terénní pečovatelské služby (cíl: 30 hodin pomoci v domácnosti pro 30 % osob 75+). Indikátor v HSPA dashboardu sleduje LTC pracovníky jako klíčový ukazatel připravenosti na stárnoucí společnost.`,

  spotreba_opioidu: `Onkologická ambulance, pacient po pokročilé léčbě metastatického karcinomu pankreatu. Lékař předepisuje oxykodon retard 20 mg, kombinaci s nesteroidním analgetikem. V Česku se opioidní analgetika užívají pro paliativní onkologickou bolest, pooperační analgézii a chronickou bolest u některých pacientů. Spotřeba je v evropském srovnání mírná.

Spotřeba opioidních analgetik v ČR je 13,6 DDD na 1 000 obyvatel a den (SÚKL+ESAC-Net, 2024). OECD průměr 30,4 DDD, EU 27,2 DDD — Česko signal neutral, výrazně pod průměrem. Trend mírně rostoucí (2015: 9,8; 2024: 13,6), ale stále polovina OECD průměru. Nejčastěji: tramadol, codein, oxykodon, fentanyl (transdermální). Heroin a syntetické opioidy zneužívané jsou v ČR marginální (oproti USA, kde opioidní krize zabíjí 80 000 ročně).

Strukturálně český systém má opatrnou opioidní preskripci: regulační kontrola SÚKL, recept s modrým pruhem pro silné opioidy, povinné registry. Onkologická bolest má dostatečné pokrytí (cílem WHO „pain ladder"); pooperační analgézie standardní; chronická nemaligní bolest spíše konzervativně. Paradoxně část pacientů s opravdovou chronickou bolestí nedostává adekvátní léčbu (poddávkování ze strachu před závislostí).

Česko stojí v rozdílu mezi „opioidní krizí" USA a „opioidním nedoléčením" některých evropských zemí. Politické páky: udržení regulační kontroly (recept s modrým pruhem); rozšíření paliativní medicíny v krajích (mimo Prahu a Brno); edukace lékařů o racionální opioidní preskripci (CEUMS); monitoring SÚKL pro detekci diversion; rozšíření multidisciplinárních center pro chronickou bolest (cca 20 v celé ČR). Indikátor v HSPA dashboardu sleduje opioidní spotřebu jako klíčový ukazatel bolesti management a regulační rovnováhy.`,

  uhrada_zp_per_pojistenec: `Centrální registr pojištěnců, statistický roční přehled. Průměrná úhrada zdravotní pojišťovny na jednoho pojištěnce v ČR je 42 226 Kč ročně (2024). To je celkový součet: ambulantní péče, lůžková péče, léky, zdravotnické pomůcky, lázně, doprava — pro každého občana ČR statisticky.

Úhrada zdravotní pojišťovny per pojištěnec v ČR je 42 226 Kč/rok (SZP, 2024). OECD průměr cca 50 000 Kč, EU cca 47 000 Kč — Česko signal neutral, mírně pod průměry. Trend rostoucí (2015: 28 000; 2024: 42 226). Distribuce je asymetrická: 80 % výdajů jde na 20 % pojištěnců (Pareto pattern); senioři 65+ spotřebovávají průměrně 110 000 Kč/rok; mladí 18–35 cca 18 000 Kč/rok.

Strukturálně český systém má veřejné zdravotní pojištění s monopolním inkasem (7 pojišťoven), přerozdělovací fond kompenzuje asymetrické rizikové profily (VZP má vyšší podíl chronických pacientů než SZP). Stát platí za státní pojištěnce (děti, důchodci, OSVČ minimální, ženy na MD/RD) paušál, který je dlouhodobě nedostatečný — chronický rozpočtový tlak.

Úhrada per pojištěnec roste rychleji než průměrná mzda (zdravotní inflace), což vytváří dlouhodobý finanční tlak na systém. Politické páky: valorizace platby státu za státní pojištěnce (politicky citlivá agenda — viz clanek-platba-statu-statni-pojistenci); reforma přerozdělování (parametrizace podle PCG — Pharmacy-based Cost Groups); rozšíření hodnotové úhrady (DRG v3, P4P pro vybrané indikátory); transparentní reporting struktury úhrad per nemocnice a per pojišťovna. Indikátor v HSPA dashboardu sleduje úhradu per pojištěnec jako klíčový kontextový parametr financování systému.`,

  vydaje_prevence_pct: `MZ ČR, rozpočtové oddělení, příprava státního rozpočtu pro veřejné zdraví. Z celkových zdravotnických výdajů ČR míří do prevence 2,7 procenta — to je výrazně méně než průměr OECD (3,4 %) nebo EU (3,5 %). Disproporce mezi tím, kolik utratíme na léčbu, a kolik na to, abychom se nemoci vyhnuli.

Podíl výdajů na primární prevenci v ČR je 2,7 % zdravotnických výdajů (ÚZIS SHA, 2023). OECD průměr 3,4 %, EU 3,5 % — Česko signal bad. V absolutní hodnotě cca 18 mld. Kč ročně. Trend stabilní (2010: 2,5 %; 2023: 2,7 %). Z toho cca 60 % vakcinace (povinné a doporučené), 25 % screeningové programy (kolorektum, mamograf, cervix), 15 % osvěta a programy zdraví.

Strukturálně český systém je orientován spíš na akutní a chronickou léčbu (lůžková péče 55,9 % výdajů — viz podil_vydaje_luzkova_pece) než na prevenci. SZÚ (Státní zdravotní ústav) je gestor primární prevence, ale s relativně malým rozpočtem (cca 600 mil. Kč/rok). Veřejné kampaně typu „Loono" a „Konsent" suplují, ale s nestabilním grantovým financováním. Daň ze sladkých nápojů, regulace marketingu junk food, sugar tax — politicky všechno blokované.

Prevence má disproporcionálně vysokou návratnost — investice 1 koruny do prevence ušetří 2–5 korun v léčebné medicíně (WHO 2018 ROI analýza). Politické páky: zvýšení podílu výdajů na prevenci z 2,7 na cílových 3,5 % (analog EU); rozšíření populačních screeningů (cíl 65–75 % účast); kapitační indikátor pro praktika za prevenci (UK QOF model); investice do duševního zdraví a programů zdravého stárnutí. Indikátor v HSPA dashboardu sleduje prevenci jako klíčový ukazatel orientace systému na dlouhodobé výsledky.`,

  vypadky_leciv_aktivni: `SÚKL, databáze výpadků léčiv, čtvrteční report. Aktuálně evidováno 2 210 léčivých přípravků s hlášeným výpadkem nebo přerušením dodávek. To je v Česku trvale rostoucí číslo — léčiva, která pacient potřebuje, ale nedostane. Někdy na týden, někdy na měsíce.

Aktivně evidovaných výpadků LP v ČR je 2 210 (SÚKL, 2024). OECD srovnatelný indikátor neexistuje (různé reportingové systémy). Signal neutral (kontextová hodnota). Trend rostoucí (2018: 850; 2024: 2 210) — kombinace globálního narušení dodavatelských řetězců, paralelního exportu, nedostatku kapacit u dodavatelů.

Strukturálně český systém má SÚKL jako národní agenturu pro lékovou regulaci s povinným reportingem výpadků od dodavatele (zákonná povinnost dle zákona 378/2007 Sb.). Nicméně reportingový proces má časový posun (24–72 hodin), informace pro pacienta a lékárníka přicházejí často pozdě. Paralelní vývoz z ČR do zemí s vyššími cenami (DE, AT, NL) je legální a tvoří cca 20 % výpadků klíčových LP.

Výpadky léčiv jsou trvalý strukturální problém s přímými klinickými důsledky. Politické páky: omezení paralelního exportu prioritních LP (analog DE Lieferengpassgesetz 2020); rychlejší reporting v reálném čase (cílem 24 h od identifikace); strategická národní rezerva kritických léčiv; spolupráce s EMA Critical Medicines Alliance; transparentní seznam výpadků pro pacienty a lékárníky (online dashboard). Indikátor v HSPA dashboardu sleduje aktivní výpadky LP jako klíčový ukazatel funkčnosti farmaceutického systému a dostupnosti léčby.`,
};

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CARDS = path.resolve(ROOT, '..', 'indicators');
let updated = 0, skipped = 0;

for (const [id, story] of Object.entries(STORIES)) {
  const file = path.join(CARDS, `${id}.json`);
  if (!fs.existsSync(file)) { console.error('MISSING:', id); continue; }
  const card = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Tady ÚMYSLNĚ přepisujeme existující short patient_story na plnohodnotnou.
  // Pozor: musíme zachovat VŠECHNA existující pole (zejména framework, dimension),
  // jen vyměnit patient_story a vložit ho před framework. Codex review na PR #349
  // ukázal bug v předchozí verzi, kdy `continue` při k==='framework' skipl jeho
  // přidání do `out` → karta ztratila framework field. Nová logika: pokud
  // narazíme na framework, vložíme PŘED ním patient_story a pak framework zachováme.
  const out = {};
  let inserted = false;
  for (const [k, v] of Object.entries(card)) {
    if (k === 'patient_story') continue; // nahradíme novým textem
    if (k === 'framework' && !inserted) {
      out.patient_story = story.trim();
      inserted = true;
    }
    out[k] = v;
  }
  if (!inserted) out.patient_story = story.trim();
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  updated++;
  console.log('OK:', id, '(' + story.trim().split(/\s+/).filter(Boolean).length + ' slov)');
}
console.log(`\nDone. Updated: ${updated}.`);
