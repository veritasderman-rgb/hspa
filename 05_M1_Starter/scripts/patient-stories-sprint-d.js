// Sprint D — 16 příběhů Priority 3 (zbytek, technická + kapacitní vrstva)
import fs from 'node:fs';
import path from 'node:path';

const STORIES = {
  ambulantni_kontakty_per_capita: `Pražská poliklinika, čtvrteční odpoledne, čekárna plná pacientů. Češi navštěvují ambulantního lékaře v průměru 11,2× ročně — to je výrazně víc než průměr OECD (6,8). Vysoký počet kontaktů je v ČR strukturálně daný: praktik vidí pacienta často (recept, neschopenka, krátká konzultace), specialisté kontrolují chronická onemocnění v relativně krátkých intervalech, repetitivní úhradové výkony.

Ambulantní kontakty per capita v ČR jsou 11,2 ročně (ÚZIS, 2024). OECD průměr 6,8, EU 7,2 — Česko je výrazně nad oběma. Signal neutral (vysoká hodnota není sama o sobě dobrá ani špatná — interpretace záleží na kontextu). Trend stabilní (2010: 11,5; 2024: 11,2). Mezi věkovými skupinami: 65+ má průměr 17 kontaktů/rok, mladí 18–35 cca 6 kontaktů.

Strukturálně vysoké ambulantní kontakty kombinují české kulturní očekávání („chci slyšet od doktora"), úhradový systém (výkon-based platby motivují k častějším návštěvám), a fragmentaci péče (4–6 specialistů u multimorbidního pacienta). V Nizozemsku má pacient průměr 4 kontakty/rok, ale výsledky srovnatelné nebo lepší — protože systém integruje péči přes silnou primární vrstvu.

Vysoké ambulantní kontakty znamenají vyšší zátěž systému a nákladovost, ale ne nutně lepší kvalitu. Politické páky: posílení primární péče s rozšířenými kompetencemi (méně předávání na specialistu); kapitační platba (UK GP capitation model) místo per-výkon; integrace chronické péče (multidisciplinární týmy); telemedicína a e-konzultace. Indikátor v HSPA dashboardu sleduje ambulantní kontakty jako kontextový ukazatel intenzity ambulantní péče.`,

  cezarsky_rez_pct: `Porodnice, plánovaný porod 32leté primipary. Indikace císařského řezu: pánevní poloha plodu. Operace plánovaná, anestezie epidurální, krátká hospitalizace. To je v ČR 28,3 % všech porodů — v evropském průměru, ale s rostoucí trajektorií.

Procento porodů císařským řezem v ČR je 28,3 % (ÚZIS NRMD, 2024). OECD průměr 28 %, EU 27 % — Česko signal warn (mírně nad WHO doporučeným optimem 10–15 %). Trend rostoucí (2010: 23 %; 2024: 28,3 %). Mezi nemocnicemi rozptyl 18–38 % — odráží jak rizikový profil pacientek, tak různou klinickou praxi. Indikace: pánevní poloha, fetal distress, předchozí SC, mateřský diabetes, makrosomie, opakované SC.

Strukturálně český systém má kvalitní porodnictví (3. nejnižší kojenecká mortalita v Evropě — viz mortalita_kojenecka 2,4), ale rostoucí SC trend odráží defenzivní medicínu (riziko soudních sporů u komplikovaného vaginálního porodu), demografické faktory (starší prvorodičky, asistovaná reprodukce), pacientskou poptávku (plánovaný SC vyšší procento u některých populací). VBAC (vaginal birth after cesarean) je v ČR limitovaný.

Vysoký SC procent znamená vyšší peri- a postoperační rizika pro matku (krvácení, infekce, tromboembolismus), pozdější obtíže (placenta accreta v dalším těhotenství, problematické vaginální porody po SC). Politické páky: standardizace indikací SC (NICE guideline NG192); rozšíření VBAC programů (UK model); podpora normálního porodu (porodní asistentky, dula); audit SC per nemocnice s benchmarking; pacientská edukace o rizicích a benefitech různých modalitních rozhodnutí. Indikátor v HSPA dashboardu sleduje SC procento jako klíčový ukazatel kvality porodní péče.`,

  ct_per_milion: `Krajská nemocnice, 24/7 CT službů. ČR má 28 CT skenerů na milion obyvatel — nad OECD průměrem (26), nad EU (24). Dostupnost CT diagnostiky je v Česku dobrá. Otázka kvality není v zařízení samotném — je v indikaci, interpretaci a kontroly radiační zátěže.

Hustota CT skenerů v ČR je 28 na milion obyvatel (SÚKL+ÚZIS, 2024). OECD průměr 26, EU 24 — Česko signal good. Trend rostoucí (2010: 18; 2024: 28). Distribuce mezi kraji relativně rovnoměrná (1 CT na 30–50 tisíc obyvatel ve většině krajských nemocnic). Roční počet CT vyšetření v ČR cca 1,9 milionu — výrazně víc na obyvatele než v Nizozemsku nebo Velké Británii.

Strukturálně český systém má dostatek CT zařízení (private + veřejná síť), výborné radiologie. Mezery: variabilita v indikacích (přesah doporučení EAR appropriateness criteria), radiologové neminimalizují radiační dávku (otázka kvalita vyšetření vs. radiation safety), čekací doby na elektivní CT (i přes hustotu) v některých regionech.

Vysoká hustota CT je dvojsmyslná: dostupnost je dobrá, ale overuse a radiační zátěž jsou rizika. Politické páky: audit appropriateness indikací (ESR EuroSafe Imaging); standardizace technických protokolů (dose reduction); rozšíření MRI namísto CT u indikací, kde MRI je vhodnější (méně radiační zátěže); rozšíření teleradiologie pro 24/7 expertní interpretaci. Indikátor v HSPA dashboardu sleduje CT hustotu jako klíčový ukazatel diagnostické kapacity.`,

  hospitalizace_na_100k: `Internistické oddělení krajské nemocnice, pondělní příjem 19 pacientů. V ČR se hospitalizuje 18 800 lidí na 100 000 obyvatel ročně — vysoko nad OECD (14 600). Hospitalizujeme často. Otázka, jestli za vším stojí dobrá indikace, je v Česku otevřená — viz indikátor hospitalizace_acsc (potenciálně preventovatelné hospitalizace).

Míra hospitalizace v ČR je 18 800 na 100 000 obyvatel ročně (ÚZIS NRH, 2024). OECD průměr 14 600, EU 15 200 — Česko je 29 % nad EU, signal neutral (vysoká hodnota neznamená automaticky špatnou kvalitu). Trend pomalu klesající (2010: 21 000; 2024: 18 800). Nejčastější diagnózy: KV onemocnění (15 %), onkologie (12 %), ortopedie (10 %), gastrointest. (9 %), respirační (8 %), porody (6 %).

Strukturálně český systém je orientovaný na hospitalizační péči — dědictví socialistické organizace zdravotnictví. Některé výkony, které OECD provádí ambulantně (jednodenní chirurgie), v ČR často znamenají hospitalizaci 2–4 dnů. Vysoký podíl seniorních hospitalizací (multimorbidita, sociální indikace), rozsáhlá síť lůžkové péče (postele_akutni_per_1000 = 4,1 vs. OECD 3,5).

Vysoká hospitalizace zatěžuje systém nákladově (lůžkový den ~10× dražší než ambulantní kontakt). Politické páky: rozšíření jednodenní chirurgie; investice do ambulantní rehabilitace; integrace primární – komunitní – nemocniční péče; redukce ACSC hospitalizací (viz indikátor); deflujní lůžek pro „sociální hospitalizace" do LTC. Indikátor v HSPA dashboardu sleduje hospitalizace jako kontextový ukazatel intenzity nemocniční péče.`,

  luzka_jip_per_100k: `Praha-Motol, kardio-JIP, 12 monitorovaných lůžek, sestra na 2 pacienty. ČR má 35 JIP lůžek na 100 000 obyvatel — výrazně nad OECD (14) a EU (13). Vysoká hodnota odráží specifickou českou koncepci „intenzivní péče" zahrnující široce JIP, ARO, monitorované jednotky.

Hustota JIP lůžek v ČR je 35 na 100 000 obyvatel (ÚZIS, 2024). OECD průměr 14, EU 13 — Česko je 2,5× nad oběma. Signal neutral (vysoká hodnota odráží metodologii sběru). ČR započítává všechna intenzivní lůžka napříč obory (kardio, neuro, chirurgie, pediatrie, neonatologie, ARO), zatímco některé země OECD úžeji jen mechanicky ventilovaná lůžka. Po metodické harmonizaci by hodnota byla cca 18–20.

Strukturálně český systém má rozsáhlou síť intenzivní medicíny — to se osvědčilo v COVID pandemii, kdy ČR měla velký bufer kapacity. ARO a JIP jsou v každé krajské nemocnici, ve fakultkách v každém oboru. To je investiční dědictví a personální nákladnost (sestra-pacient 1:2 nebo 1:1).

Vysoká JIP kapacita je pozitivní pro krizovou připravenost, ale vyžaduje stálé personální obsazení (ARO sestra je vysoce kvalifikovaná, nedostatková). Politické páky: harmonizace metodiky reportingu (OECD srovnatelnost); rozšíření „step-down units" (mezi JIP a standardním oddělením); zlepšení personálního obsazení (sestra/lůžko); telemedicínská konzultace pro periferní ARO/JIP. Indikátor v HSPA dashboardu sleduje JIP lůžka jako kontextový ukazatel intenzivní kapacity.`,

  mri_per_milion: `Krajská nemocnice, MR pracoviště, čekací doba 6 týdnů na neurologické vyšetření. ČR má 12 MRI skenerů na milion obyvatel — pod OECD (16) i EU (14,5). Signal bad. Při potřebě neurologické nebo onkologické MRI diagnostiky stojí pacient ve frontě nebo platí samoplatebně cca 5 000 Kč.

Hustota MRI skenerů v ČR je 12 na milion obyvatel (SÚKL+ÚZIS, 2024). OECD průměr 16, EU 14,5 — Česko signal bad. Trend pomalu rostoucí (2010: 5; 2024: 12), tempo nedostatečné. Distribuce velmi nerovnoměrná — Praha a Brno mají kvalitní pokrytí, periferní regiony (Karlovarský, Vysočina) jen 1–2 přístroje na celý kraj.

Strukturálně český systém má nižší MRI hustotu než většina OECD zemí, což má klinické důsledky: pozdější diagnostika neurologických onemocnění (mozkové nádory, demyelinizační onemocnění), karcinomu prsu (MRI je doplňková modalitě k mamografu), prostaty, muskuloskeletálních úrazů. Privátní MRI ambulance jsou dostupné v Praze, Brně, Olomouci do týdne, ale samoplatebně.

Nízká MRI hustota znamená delší čekání na klíčovou diagnostiku. Politické páky: investice do nových MRI přístrojů (cca 20 nových do 2030, prioritně periferní regiony); rozšíření hrazené nočních a víkendových směn (24/7 MRI v krajských centrech); rozšíření teleradiologie pro expertní hodnocení; standardizace indikací MRI (ESR appropriateness). Indikátor v HSPA dashboardu sleduje MRI hustotu jako klíčový ukazatel diagnostické kapacity.`,

  nevyuzite_osetrovaci_dny_ip: `Interní oddělení krajské nemocnice, čtvrtek odpoledne. Pacientka po stabilizaci čeká na propuštění — sociální umístění v LDN, pečovatelské službě nebo do domácí péče. Trvá 8 dní, než se najde místo. To je „nevyužitý ošetřovací den" — pacient blokuje akutní lůžko, ale nepotřebuje akutní péči. Toto se v ČR týká statisticky 803 252 dnů ročně.

Nevyužité ošetřovací dny v interní péči (IP) v ČR jsou 803 252 OD ročně (ÚZIS NRH, 2024). OECD srovnatelný indikátor neexistuje (různé systémy LTC). Signal neutral. Trend pomalu klesající díky rozšíření LDN kapacity, ale stále významný. V přepočtu odpovídá cca 2 200 zablokovaných akutních lůžek po celý rok.

Strukturálně problém vzniká na rozhraní zdravotní a sociální péče (viz clanek-socialne-zdravotni-pomezi-2026). Sociální umístění (DD, LDN, pečovatelská služba) má omezené kapacity, dlouhé čekací lhůty, byrokratický proces. Pacient končící akutní léčbu nemá kam jít — rodina nemůže zajistit péči, sociální systém má frontu.

Nevyužité OD jsou důsledek systémového selhání na rozhraní — nikoli klinický problém. Politické páky: reforma rozhraní (nová sociálně-zdravotní pomezní legislativa, ÚZ SP); rozšíření LDN a paliativních lůžek; investice do domácí péče a hospice care; integrace case managementu nemocnice + sociální péče. Indikátor v HSPA dashboardu sleduje nevyužité OD jako klíčový ukazatel efektivity využití akutních lůžek.`,

  obloznost_intenzivni_pece_pct: `JIP fakultní nemocnice, ranní statistika. 8 z 12 lůžek obsazeno = 67 % obložnost. To je v Česku průměr — 63 %. To znamená rezervu pro krize (pandemie, hromadná nehoda, vlna respirační epidemie), ale také znamená, že stálé personální obsazení musí počítat s plnou kapacitou.

Obložnost intenzivní péče v ČR je 63 % (ÚZIS, 2024). OECD srovnatelný indikátor chybí (různá metodologie). Signal neutral. Optimální obložnost JIP je 70–80 % (vyšší znamená nedostatečnou rezervu, nižší inefficient využití kapacity). ČR je v evropském středu. Mezi nemocnicemi rozptyl 50–85 % — odráží regionální poptávku a sezónnost.

Strukturálně český systém má rozsáhlou JIP kapacitu (viz luzka_jip_per_100k 35/100 000), což vytváří strukturní nedoužitost v běžných obdobích. Personální obsazení je fixní (ARO sestra musí být přítomna i u 50% obložnosti), takže nedoužité kapacity znamenají vyšší jednotkové náklady. V krizi (COVID 2020/2021) se 63 % rezerva ukázala jako kritická pro absorbovat vlnu pacientů.

Obložnost JIP je trade-off mezi efektivitou a resilience (připravenost na krize). Politické páky: harmonizace metodologie reportingu (OECD srovnatelnost); flexibilní step-down units; sdílená telemedicínská konzultace mezi malými JIP a centrem expertise; krizový plán pro elektivní redukci v případě epidemie. Indikátor v HSPA dashboardu sleduje obložnost JIP jako kontextový ukazatel využití intenzivní kapacity.`,

  obloznost_interna_standard_pct: `Interní oddělení okresní nemocnice, ranní statistika. 33 ze 50 lůžek obsazeno = 66 % obložnost. Pacienti na standardním interním oddělení jsou typicky multimorbidní senioři s exacerbací CHOPN, srdečního selhání, dehydratací, post-akutní rehabilitací. Standardní interna je „domácí oddělení" celého systému.

Obložnost interních standardních oddělení v ČR je 66,1 % (ÚZIS, 2024). OECD srovnatelný indikátor chybí. Signal neutral. Optimální obložnost se pohybuje 75–85 %. ČR je pod doporučeným pásmem — kombinace přebytku lůžek (postele_akutni_per_1000 = 4,1 vs. OECD 3,5), sezonalita (zima vyšší, léto nižší), regionální variabilita.

Strukturálně český systém má historicky vysoký počet interních lůžek (dědictví socialistické organizace), zatímco poptávka po standardní hospitalizaci klesá (díky ambulantizaci, jednodenní chirurgii, lepší primární péče u některých diagnóz). Některé okresní nemocnice mají chronicky nízkou obložnost (50–60 %), ale uzavření je politicky a sociálně náročné.

Nízká obložnost znamená neefektivní využití kapacit, ale uzavření lůžek je sociálně a politicky komplikované. Politické páky: koncentrace lůžkové péče (model centralizace okresních interen — viz clanek-centralizace-chirurgie-2027); konverze nevyužitých interních lůžek na LDN nebo paliativní lůžka; investice do ambulantní rehabilitace pro snížení potřeby lůžkové péče. Indikátor v HSPA dashboardu sleduje obložnost interny jako kontextový ukazatel využití standardní lůžkové kapacity.`,

  osetrovaci_dny_na_uvazek_sestry: `Sestra Petra (38), ranní směna, 12 pacientů. Roční přepočet její pracovní zátěže: 406 ošetřovacích dnů na úvazek. To je v evropském srovnání vysoká hodnota — sestra ve Švédsku nebo Nizozemsku má cca 320 OD/úvazek/rok. Vyšší zátěž znamená vyšší riziko vyhoření, chyb a fluktuace.

Ošetřovací dny na sesterský úvazek v ČR jsou 406 OD/úvazek/rok (ÚZIS NRH, 2024). OECD srovnatelný indikátor chybí. Signal neutral (přístup OECD se liší). Trend stagnuje (2018: 420; 2024: 406). Hodnota odráží kombinaci personálního poddimenzování (sestra/lůžko nedostatečné) a vysoké hospitalizační aktivity. Mezi nemocnicemi extrémní rozptyl 320–520 OD/úvazek.

Strukturálně český systém má sestry chronicky pod tlakem: vysoký věkový průměr (45+), vysoká fluktuace (mladé sestry odcházejí do 3–5 let), nedostatečné personální normy (sestra/lůžko nezávazné). Vysoký počet OD/úvazek znamená v praxi: méně času na pacienta, vyšší riziko chyb, vyšší riziko vyhoření, vyšší fluktuace. Studie UK NHS ukazují, že zátěž ≥ 8 pacientů na sestru ve směně zvyšuje 30denní mortalitu o 11 %.

Vysoká pracovní zátěž sestry je systémový kvality a safety problém. Politické páky: závazné personální normy (sestra/lůžko 1:6 standard, 1:4 chirurgie, 1:2 ARO/JIP); navýšení mzdové úrovně (současná úroveň pod sousedním Německem o 30–40 %); rozšíření kompetencí sestry (samostatná preskripce, ambulantní vyšetření); rotace mezi odděleními pro redukci vyhoření. Indikátor v HSPA dashboardu sleduje OD na úvazek jako klíčový ukazatel personální udržitelnosti.`,

  podfinancovani_oblastni_interna_cm: `Krajská nemocnice, ekonomické oddělení, kalkulace nákladů na interní hospitalizaci. Skutečný náklad: 38 000 Kč/CM bod. Úhrada od pojišťovny: 29 119 Kč/CM bod. Rozdíl: -8 881 Kč na každý CM bod. To je strukturální podfinancování české oblastní interny — okresní a krajské nemocnice za hospitalizační péči dostávají od pojišťoven méně, než je nákladná realita.

Podfinancování oblastní interní péče v ČR je -8 881 Kč na CM (case-mix) bod (Asociace krajů + AČMN, 2024). OECD srovnatelný indikátor neexistuje. Signal neutral. Trend zhoršující se (2018: -5 200; 2024: -8 881) — kombinace rostoucích nákladů (energie, mzdy, materiály) a pomaleji rostoucích úhrad. Rozdíl mezi okresní a fakultní nemocnicí: fakultka má často kladnou marži, okresní záporné saldo.

Strukturálně český úhradový systém pro lůžkovou péči využívá DRG (case-mix index), ale úhrada na CM bod je politicky vyjednávaná a často nedostatečná pro oblastní nemocnice s vyšším podílem multimorbidních seniorů (komplikovanější, nákladnější péče, ale stejná úhrada). Záporné saldo nemocnice musí pokrýt: krajský dotační rozpočet, jiné zdroje (ambulantní výnosy, lékárna), provozní úspory.

Podfinancování oblastní interny je strukturální slabost systému — vede k uzavírání oddělení v menších nemocnicích, koncentraci péče (clanek-okresni-nemocnice-personalni-krize, clanek-centralizace-chirurgie-2027). Politické páky: reforma úhradové vyhlášky (sjednocení sazby per CM bod napříč typy nemocnic); zvýšení sazby pro multimorbidní seniorské hospitalizace; rozšíření case-mix klasifikace o komorbidity (model DRG v3 / „outlier payments"); transparentní kalkulace nákladů per nemocnice. Indikátor v HSPA dashboardu sleduje podfinancování interny jako klíčový ukazatel finanční udržitelnosti okresních nemocnic.`,

  podil_senioru_na_internich_hospitalizacich: `Interní oddělení krajské nemocnice, ranní vizita 18 pacientů. 13 z nich je 65+ — to je 72 % podíl seniorů. Tahle skladba je v Česku statisticky modální. Standardní interna je dnes z velké části geriatrickou péčí — bez explicitního přizpůsobení (specializovaných geriatrů, multimorbiditně optimalizované léčby).

Podíl seniorů (65+) na interních hospitalizacích v ČR je 72,2 % (ÚZIS NRH, 2023). OECD srovnatelný indikátor chybí. Signal neutral. Trend rostoucí (2010: 65 %; 2023: 72,2 %) — důsledek demografického stárnutí. V populaci 65+ je hospitalizační rate 3,5× vyšší než v 18–65 letech.

Strukturálně český systém má v interní péči faktický posun směrem ke geriatrickému profilu, ale strukturálně se na to neadaptoval: nedostatek geriatrů (cca 100 v celé ČR), nedostatek geriatrických oddělení v okresních nemocnicích, nedostatečná geriatrická školení pro internisty, generická léčba (často nevhodná u multimorbidních seniorů — viz polypragmazie_65plus).

Vysoký podíl seniorů na interních lůžkách signalizuje potřebu strukturální geriatrické reformy. Politické páky: rozšíření kapacity geriatrické medicíny (cca 200 nových míst do 2030); povinný modul geriatrie pro interní specializaci; geriatrický assessment u 75+ hospitalizovaných (model UK Comprehensive Geriatric Assessment); rozšíření LDN a paliativní péče (snížení tlaku na akutní interní lůžka). Indikátor v HSPA dashboardu sleduje seniorský podíl jako klíčový strukturální ukazatel demografického profilu hospitalizací.`,

  postele_akutni_per_1000: `Krajská nemocnice, statistika lůžkového fondu. Česko má 4,1 akutních lůžka na 1 000 obyvatel — nad OECD průměrem 3,5 a EU 3,7. Trvale široký lůžkový fond je historické dědictví socialistické organizace zdravotnictví — Česko dlouhodobě hospitalizuje víc a déle (viz hospitalizace_na_100k 18 800 / 100k vs. OECD 14 600).

Akutní postele per 1 000 obyvatel v ČR jsou 4,1 (ÚZIS, 2024). OECD průměr 3,5, EU 3,7 — Česko nad oběma. Signal neutral (vysoká hodnota není automaticky špatná). Trend pomalu klesající (2010: 4,7; 2024: 4,1). Hodnota odráží stále vysokou hospitalizační intenzitu a relativně pomalou ambulantizaci péče.

Strukturálně český systém má víc lůžek než aktuálně potřebuje pro akutní péči — ale uzavření je politicky a sociálně komplikované. Nadměrná kapacita generuje fixní personální a provozní náklady (energie, údržba, sestra-úvazek). V krizi (COVID 2020/2021) se ukázala jako rezerva. V normálním provozu je inefficient.

Akutní lůžkový fond je investiční a personální zátěží. Politické páky: koncentrace lůžkové péče (model centralizace specializovaných výkonů — clanek-centralizace-chirurgie-2027); konverze nevyužitých akutních lůžek na LDN, paliativní, rehabilitační; rozšíření jednodenní chirurgie a ambulantizace; reforma okresních nemocnic (clanek-okresni-nemocnice-personalni-krize). Indikátor v HSPA dashboardu sleduje akutní lůžka jako kontextový ukazatel kapacity lůžkové péče.`,

  preziti_1rok_po_upv_2d_pct: `ARO oddělení fakultní nemocnice, pacient (62) po 4 dnech umělé plicní ventilace pro septický šok. Úspěšný weaning, propuštění do běžné péče. Statistika: 1leté přežití pacientů po UPV ≥ 2 dny je v ČR 51,2 %. Téměř každý druhý takový pacient se za rok od propuštění nedožije. Klinická realita ARO/JIP péče.

Roční přežití po UPV ≥ 2 dny v ČR je 51,2 % (ÚZIS NRH, 2024). OECD srovnatelný indikátor chybí. Signal neutral (hodnota odráží kombinaci kvality péče a závažnosti pacientů — kde je nemoc závažnější, je přežití nižší). Trend stabilní (2018: 49,8 %; 2024: 51,2 %). Mezi nemocnicemi rozptyl 40–62 % — odráží jak case-mix, tak kvalitu post-discharge péče.

Strukturálně český systém má kvalitní ARO a JIP péči, ale post-ICU vrstva (PICS — Post Intensive Care Syndrome) není systémově řešena. Pacienti po dlouhé UPV mají vysoké riziko fyzických, kognitivních a psychiatrických komplikací — kombinace svalové slabosti, dekondice, deliria, PTSD, deprese. Bez strukturované post-ICU rehabilitace dlouhodobé přežití klesá.

Jednoroční přežití po UPV je dvojsmyslný indikátor: závisí jak na kvalitě akutní péče, tak na navazujícím systému rehabilitace a chronické péče. Politické páky: rozšíření PICS klinik (model UK National Outreach Forum); strukturovaná rehabilitace po dlouhé ICU péči; multioborové post-ICU follow-up (rehabilitace, psychologie, výživa); rozšíření paliativní vrstvy u prognosticky nepříznivých pacientů. Indikátor v HSPA dashboardu sleduje 1leté přežití po UPV jako klíčový ukazatel komplexní kvality intenzivní a navazující péče.`,

  prumerna_delka_hospitalizace: `Interní oddělení, pacientka po dekompenzaci srdečního selhání, propouštění po 9 dnech. To je v ČR typická délka hospitalizace pro tuto diagnózu. Průměr napříč všemi diagnózami v ČR je 7 dní — mírně nad OECD průměrem 6,5. Délka hospitalizace je proxy efektivity nemocniční péče a koordinace s ambulantním sektorem.

Průměrná délka hospitalizace v ČR je 7 dní (ÚZIS NRH, 2024). OECD průměr 6,5, EU 6,8 — Česko signal warn. Trend pomalu klesající (2010: 8,2; 2024: 7), tempo nedostatečné. Mezi diagnózami rozptyl: porody 3 dny, ortopedie 5–7 dnů, kardiochirurgie 8–10 dnů, akutní psychiatrie 25–35 dnů.

Strukturálně český systém má delší hospitalizace než OECD průměr kvůli: vyššímu věku pacientů, multimorbiditě, defenzivní medicíně (delší observace „pro jistotu"), pomalejšímu propouštění (čekání na sociální umístění — viz nevyuzite_osetrovaci_dny_ip), nedostatečné ambulantní rehabilitaci. Jednodenní chirurgie je v ČR podrozvinutá oproti UK NHS Best Practice Tariffs.

Delší hospitalizace zvyšuje náklady (lůžkový den ~7 000 Kč v okresní, ~12 000 Kč ve fakultní) a riziko nozokomiálních infekcí (viz infekce_nosokomialni). Politické páky: rozšíření jednodenní chirurgie (model UK Day Surgery 70 % indikovaných); enhanced recovery after surgery (ERAS) protokoly; investice do ambulantní rehabilitace; integrace s LTC a domácí péčí (zkrácení sociálních hospitalizací). Indikátor v HSPA dashboardu sleduje délku hospitalizace jako klíčový ukazatel efektivity nemocniční péče.`,

  stomatologove_per_1000: `Stomatologická ambulance v menším městě Plzeňského kraje, 7 měsíců na nového pacienta. „Bohužel registrujeme jen omezený počet." Pacientka jde do druhé, do třetí ordinace — stejná odpověď. Nakonec se zaregistruje v samoplatebním režimu, ošetření 4 500 Kč za prohlídku a hygienu. To je v Česku reálná dostupnost — i přes nadprůměrnou hustotu stomatologů.

Hustota stomatologů v ČR je 0,78 na 1 000 obyvatel (ÚZIS NRPZS, 2024). OECD průměr 0,71, EU 0,74 — Česko signal good, nadprůměrné. Trend stabilní (2010: 0,73; 2024: 0,78). Paradox: dostatek stomatologů celkově, ale nedostatek v hrazené síti pro pojištěnce. Cca 20–25 % stomatologů přešlo na převážně samoplatební model (cosmetic dentistry, implantáty), což snižuje kapacitu pro běžnou hrazenou péči.

Strukturálně český stomatologický systém má dvě paralelní vrstvy: hrazenou (pojišťovny hradí standardní stomatologickou péči — amalgamové výplně, extrakce, RTG), a samoplatební (estetické zákroky, implantáty, kovokeramické a metal-free korunky, ortodoncie pro dospělé). Standardní hrazený balík je technologicky zastaralý — pacient, který chce moderní materiály, doplácí. Stomatologové se přirozeně přesouvají do segmentu, kde mají vyšší výnos.

Stomatologie je v ČR specifický příklad dvourychlostní péče. Politické páky: reforma standardu hrazené stomatologie (rozšíření o sklo-ionomerové výplně, kompozity v viditelných lokalizacích); úprava úhradových sazeb (současné podfinancování standardu); rozšíření školní stomatologické prevence (dnes marginalizovaná); investice do regionálních vzdělávacích programů pro stomatology v hrazené síti. Indikátor v HSPA dashboardu sleduje hustotu stomatologů jako kontextový ukazatel kapacity — interpretovat nutno s rozlišením hrazené vs. samoplatební vrstvy.`,
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
