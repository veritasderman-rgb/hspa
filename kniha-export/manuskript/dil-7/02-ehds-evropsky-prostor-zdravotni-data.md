---
slug: ehds-evropsky-prostor-zdravotni-data
dil: 7
poradi: 2
audit: verified
stitky: Digitalizace, Evropská legislativa, Datová infrastruktura · eHealth · GDPR
---

# Evropský prostor zdravotních dat: jak nařízení EHDS změní české zdravotnictví do roku 2035

**Když vstoupilo v platnost nařízení GDPR, Česko — jako ostatně většina členských zemí — implementovalo transpozici na poslední chvíli a s přetrvávajícím výkladovým chaosem. Nařízení EHDS je z pohledu zdravotnictví řádově složitější: netýká se jen ochrany dat, ale aktivně přikazuje jejich sdílení, přenositelnost a interoperabilitu. Zdravotní systém, který nesdílí data ani uvnitř vlastních hranic — kde ambulantní lékař nevidí propouštěcí zprávu z nemocnice a pohotovost nezná chronická onemocnění pacienta — je nyní legislativně vyzýván, aby tato data zpřístupnil přeshraničně v celé Evropské unii. To je výzva, která přesahuje technologický problém a zasahuje do architektury systému, kompetencí regulátorů a financování digitální transformace.**

Když vstoupilo v platnost nařízení GDPR, Česko — jako ostatně většina členských zemí — implementovalo transpozici na poslední chvíli a s přetrvávajícím výkladovým chaosem. Nařízení EHDS je z pohledu zdravotnictví řádově složitější: netýká se jen ochrany dat, ale aktivně přikazuje jejich sdílení, přenositelnost a interoperabilitu. Zdravotní systém, který nesdílí data ani uvnitř vlastních hranic — kde ambulantní lékař nevidí propouštěcí zprávu z nemocnice a pohotovost nezná chronická onemocnění pacienta — je nyní legislativně vyzýván, aby tato data zpřístupnil přeshraničně v celé Evropské unii. To je výzva, která přesahuje technologický problém a zasahuje do architektury systému, kompetencí regulátorů a financování digitální transformace.


> [[GRAF: EHDS — evropský datový prostor zdraví]]
> _Podklad:_ EHDS — evropský datový prostor zdraví 2025/327 Nařízení EU o EHDS vstup v platnost 26. 3. 2025 26. 3. 2031 plné povinné napojení primary use case cross-border pacientská shrnutí + eRecepty (2029) → propouštěcí zprávy, lab. výsledky, zobrazovací data (2031) 27 členských států v EHDS každý buduje národní bránu MyHealth@EU NCEZ český gestor implementace odbor MZ ČR; provázáno s novelou 236/2025 Sb. Zdroj: Nařízení EU 2025/327, zákon 325/2021 Sb. ve znění 236/2025 Sb., NCEZ.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Co je EHDS a proč vznikl

Zkratka EHDS (European Health Data Space) označuje regulační a infrastrukturní rámec, jehož cílem je umožnit obyvatelům EU přistupovat ke svým zdravotním datům v elektronické formě a sdílet je přeshraničně při čerpání péče v jiném členském státě. Vedle tohoto tzv. primárního využití dat nařízení zavádí i rámec pro sekundární využití — to jest přístup výzkumníků, orgánů veřejného zdraví a tvůrců politik k anonymizovaným nebo pseudonymizovaným zdravotním datům za podmínek přísné governance.

Politické zázemí pro EHDS vzniklo konsolidací několika paralelních problémů. Za prvé, pandemie COVID-19 odhalila fragmentaci epidemiologických dat napříč členskými státy: i základní otázky o hospitalizacích, mortalitě a vakcinaci bylo obtížné zodpovědět v EU-širokém srovnání. Za druhé, průmysl a akademická sféra opakovaně poukazovaly na to, že zdravotní data jsou klíčovým aktivem pro vývoj léků, diagnostických nástrojů a algoritmů klinického rozhodování, ale jejich přístupnost je v EU extrémně nerovnoměrná. Za třetí, pacientská mobilita v EU narazila na praktický strop: čím dál více lidí žije, pracuje a cestuje v různých členských státech, ale jejich zdravotní záznamy jsou z praktického hlediska nepřenosné.

Legislativní příprava EHDS trvala přes tři roky. Evropská komise zveřejnila návrh nařízení v květnu 2022. Přes intenzivní jednání v trialogu — v nichž se Rada EU a Evropský parlament neshodly zejména v otázkách rozsahu pacientského opt-outu ze sekundárního využití, povinností EHR systémů a délky přechodných období — bylo nařízení přijato 11. února 2025, vyhlášeno v Úředním věstníku EU 5. března 2025 a vstoupilo v platnost 26. března 2025.


### Nařízení 2025/327 — přímá použitelnost a národní implementace

Nařízení EU 2025/327 je přímo použitelným právním aktem, což znamená, že se nevyžaduje jeho přepis do národního zákonodárství v podobě, jaká by byla nutná u směrnice. Přesto vyžaduje řadu národních implementačních kroků: členské státy musí designovat příslušné orgány, přijmout prováděcí opatření a — kde stávající národní legislativa odporuje nebo je nedostatečná — přijmout novelizující nebo doplňující zákony.

V případě České republiky je klíčovým legislativním úkonem novela zákona č. 325/2021 Sb. o elektronizaci zdravotnictví. Tento zákon, který vstoupil v platnost 1. ledna 2022, zakotvuje architekturu Národního zdravotnického informačního systému (NZIS), roli ÚZIS jako správce a rámec NCPeH (National Contact Point for eHealth). Novela musí mimo jiné definovat roli nového regulačního orgánu — Digital Health Authority — a jeho vztah k existující struktuře MZ ČR, ÚZIS a Národního centra elektronického zdravotnictví (NCEZ). Samotný zákon 325/2021 Sb. byl mezitím novelizován zákonem č. 236/2025 Sb. s účinností od 1. ledna 2026, který ukotvil obecné komponenty elektronizace (elektronická žádanka, sdílený zdravotní záznam, delegování přístupu k dokumentaci jménem pacienta) — institucionální nároky EHDS (designace DHA a HDAB) ale tato novela neřeší a jejich transpozice zůstává předmětem další, v polovině roku 2026 stále připravované novely v gesci Ministerstva zdravotnictví ČR.

EHDS se uplatňuje souběžně s nařízením GDPR, na které explicitně odkazuje jako na základ pro ochranu osobních údajů. Zdravotní data jsou pod GDPR tzv. zvláštní kategorií osobních údajů a jejich zpracování je obecně zakázáno s výjimkami, na které EHDS přímo navazuje. Právní základ pro přeshraniční sdílení při primárním využití je poskytování zdravotní péče (čl. 9 odst. 2 písm. h) GDPR); u sekundárního využití nařízení vyžaduje anonymizaci nebo pseudonymizaci v kombinaci s přísnými organizačními a technickými zárukami. Klíčové napětí — a jeden z nejdéle diskutovaných sporných bodů trialogu — je rozsah práva pacienta odmítnout, aby jeho pseudonymizovaná data byla využita k sekundárním účelům. Kompromisní text nařízení umožňuje členským státům zavést opt-out, přičemž podmínky tohoto opt-outu jsou definovány na národní úrovni v rámci stanoveného rozsahu.


### Primární využití — co získá pacient

Primární využití dat v terminologii EHDS označuje situace, kdy jsou zdravotní data použita přímo pro péči o daného pacienta. Klíčovým nástrojem je platforma MyHealth@EU, která umožňuje přeshraniční sdílení zdravotního záznamu při čerpání péče v jiném členském státě. Pro pacienta to v praxi znamená, že ošetřující lékař v Německu, Španělsku nebo na Kypru bude moci po jejich výslovném souhlasu přistoupit k jejich pacientskému souhrnu (Patient Summary), elektronickému receptu (eRecept) a záznamu výdeje léčiva — a to bez nutnosti pacienta, aby si dokumentaci tisknul, vozil a překládal.

Do roku 2031 se přeshraniční sdílení rozšíří o propouštěcí zprávy (discharge reports), laboratorní výsledky a zobrazovací data (radiologické snímky s diagnostickými závěry). Tím se uzavírá mezera, která dnes tvoří jednu z největších praktických překážek přeshraniční péče: pacient po hospitalizaci v zahraničí se vrací domů s papírovou nebo PDF propouštěcí zprávou v cizím jazyce, kterou jeho praktický lékař musí dešifrovat ručně.

Podmínkou funkčnosti přeshraničního sdílení je, že pacient má v portálu MyHealth@EU přehled o tom, co je o něm sdíleno, a může přístup selektivně omezit nebo odvolat. Toto právo na kontrolu je jedním ze základních pilířů nařízení a explicitně navazuje na právo přístupu a právo na přenositelnost zakotvené v GDPR. Nařízení dále přikazuje, aby pacienti měli bezplatný přístup k vlastním elektronickým zdravotním záznamům prostřednictvím jednotného přístupu v každém členském státě — v ČR tuto roli má plnit portál Moje zdravotní záznamy v rámci infrastruktury NCEZ.


### Sekundární využití — výzkum, HDAB a governance dat

Sekundární využití zdravotních dat je druhý — a regulačně složitější — pilíř EHDS. Jde o přístup k pseudonymizovaným nebo anonymizovaným zdravotním datům pro účely výzkumu, vývoje léků, epidemiologického modelování, tvorby zdravotní politiky a hodnocení bezpečnosti zdravotnických technologií. Přístup k těmto datům nebude možný přímo, ale výhradně prostřednictvím nově zřizovaných orgánů HDAB (Health Data Access Bodies), které budou v každém členském státě zodpovědné za posuzování žádostí, udělování licencí a dozor nad dodržováním podmínek.

Nařízení definuje přípustné účely sekundárního využití taxativně: vědecký výzkum ve veřejném zájmu, vzdělávání a výuka zdravotníků, tvorba politik a regulační rozhodování, péče o pacienta v souladu s platnými právními předpisy a vývoj produktů nebo služeb přispívajících k veřejnému zdraví. Komerční využití dat pro reklamní nebo pojišťovací účely (například segmentace pojistného rizika nebo cílení marketingu na základě zdravotních charakteristik) je explicitně zakázáno. Orgány HDAB jsou povinny vést auditovatelný záznamy o každém přístupu k datům; reidentifikace subjektů dat je přísně zakázána a sankciována.

Infrastrukturně bude sekundární přístup zprostředkován prostřednictvím tzv. secure processing environments — datových prostor, kde výzkumníci mohou analyzovat data, aniž by si je mohli stáhnout a odnést. Výsledkem analýzy jsou agregáty, statistiky nebo modely, nikoli individuální záznamy. Tato architektura — přinášet analytické nástroje k datům, nikoli data k analytickým nástrojům — je principem, který EK prosazuje i v kontextu Data Governance Act a Data Act. Pro ČR to znamená vybudovat nebo adaptovat infrastrukturu pro tyto bezpečné prostředí a integrovat ji do evropské sítě EHDS.


> [[GRAF: Sekundární využití dat: jak se výzkumník dostane k datům — a k čemu ne]]
> _Podklad:_ Sekundární využití dat: jak se výzkumník dostane k datům — a k čemu ne Žádost o přístup Taxativně přípustný účel: výzkum ve veřejném zájmu, výuka, tvorba politik, vývoj produktů pro veřejné zdraví. HDAB posoudí a licencuje Health Data Access Body v každém členském státě; auditovatelný záznam každého přístupu. Secure processing environment Analýza pseudonymizovaných dat bez možnosti stažení — nástroje jdou k datům, ne data k nástrojům. Ven jdou jen agregáty Statistiky a modely, nikoli individuální záznamy. Reidentifikace zakázána a sankcionována; reklama a pojistná segmentace explicitně zakázán…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Čtyři milníky: 2027, 2029, 2031 a 2035

Nařízení 2025/327 stanoví čtyři klíčové implementační termíny, přičemž každý z nich ukládá konkrétní povinnosti a sankce za neplnění jsou teoreticky vymahatelné Evropskou komisí skrze řízení o porušení práva EU.


> [[GRAF: Implementační harmonogram EHDS — co musí Česko stihnout kdy]]
> _Podklad:_ Implementační harmonogram EHDS — co musí Česko stihnout kdy 26. 3. 2025 Nařízení 2025/327 v platnosti Přijato 11. 2. 2025, vyhlášeno v Úředním věstníku EU 5. 3. 2025. 2026 EHDS-adaptace zákona 325/2021 Sb. Obecnou elektronizaci ukotvila novela 236/2025 Sb. (účinnost 1. 1. 2026); EHDS-specifická adaptace s designací DHA je ale v polovině roku 2026 stále v přípravě — s blížícím se tvrdým termínem března 2027 (legislativní cyklus 12–18 měsíců) roste tlak. Teď 26. 3. 2027 Digital Health Authority + NCPeH + designace HDAB První tvrdý termín; NCPeH v ČR existuje od 2019, zákonná designace DHA se tep…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

**26. března 2027** je prvním tvrdým termínem: každý členský stát musí designovat Digital Health Authority a funkční NCPeH (National Contact Point for eHealth). V České republice existuje NCPeH od roku 2019 jako součást infrastruktury ÚZIS/NCEZ a je provozně zapojen do přeshraničního sdílení eReceptů a pacientských souhrnů v rámci pilotního projektu MyHealth@EU. Zákonná designace Digital Health Authority — s definovanými kompetencemi, personálním zajištěním a rozpočtem — je však teprve předmětem přípravy. Zkušenosti z jiných členských států (Finsko, Estonsko, Dánsko) ukazují, že přizpůsobení existujících institucí na roli DHA trvá minimálně 18 měsíců od přijetí legislativního rámce; pro ČR to reálně znamená, že novela zákona musí být přijata nejpozději v první polovině roku 2026.

**26. března 2029** přináší povinné přeshraniční sdílení pro první skupinu prioritních dat: pacientský souhrn, eRecept a záznam výdeje léčiva. Pro ČR tato data do velké míry existují — eRecept je v provozu od roku 2018, pacientský souhrn je v pilotní podobě zpřístupněn přes NCPeH. Hlavní výzvou do tohoto termínu není technologická, ale organizační a legislativní: ověřit, že systémy splňují technické specifikace EHDS (formát HL7 FHIR R4, identifikační schémata, zabezpečení přístupu), a zajistit, že poskytovatelé péče — zejména ambulantní lékaři — jsou na přeshraniční sdílení připraveni procesně. Od stejného data se podle kapitoly IV nařízení uplatňují i pravidla pro **sekundární využití dat**: orgán pro přístup ke zdravotním datům (HDAB) musí být provozně funkční — přijímat a posuzovat žádosti o přístup k datům, provozovat bezpečné analytické prostředí a auditovat dodržování podmínek. Designaci HDAB ukládá nařízení už k 26. březnu 2027 (společně s Digital Health Authority).

**26. března 2031** je z hlediska technické náročnosti nejkritičtějším milníkem: rozšíření přeshraničního sdílení na druhou skupinu prioritních dat (propouštěcí zprávy, laboratorní výsledky, zobrazovací data) a povinná certifikace EHR systémů používaných v EU. Certifikace EHR je zásadně nová povinnost: systémy nemocnic a ambulancí budou muset prokázat shodu s interoperabilitními požadavky EHDS prostřednictvím akreditovaných subjektů. V ČR existují desítky různých nemocničních informačních systémů (NIS) a systémů pro ambulantní péči; míra jejich připravenosti na FHIR-nativní export dat se výrazně liší. Certifikace bude pro mnoho dodavatelů vyžadovat rozsáhlé úpravy produktů.

**26. března 2035** je posledním aplikačním milníkem nařízení — netýká se ale primárně českých povinností: od tohoto data se mohou o status autorizovaného účastníka evropské infrastruktury **HealthData@EU** ucházet i třetí země a mezinárodní organizace (čl. 75 odst. 5). Vlastní povinnosti ČR v oblasti sekundárního využití dat jsou splatné podstatně dříve: orgán pro přístup ke zdravotním datům (HDAB) musí být designován už k 26. březnu 2027 a provozně funkční podle kapitoly IV od 26. března 2029 — se zákonem ukotvenou kapacitou přijímat, posuzovat a vyřizovat žádosti o přístup k datům, spravovat bezpečné analytické prostředí a auditovat dodržování podmínek. Rok 2035 tedy uzavírá globální rozšíření EHDS, nikoli český harmonogram.


### Role MZ ČR, ÚZIS, NCEZ a novela zákona 325/2021 Sb.

Implementace EHDS v České republice není projektem jednoho ministerstva — je koordinačním problémem zahrnujícím minimálně tři instituce s různými mandáty, rozpočty a kulturami. Ministerstvo zdravotnictví ČR je gestorem legislativy a zdravotní politiky; ÚZIS (Ústav zdravotnických informací a statistiky ČR) je správcem NZIS a provozovatelem klíčové datové infrastruktury; Národní centrum elektronického zdravotnictví (NCEZ) je implementační agenturou pro projekty eHealth, jmenovitě NCPeH a platformy pro sdílení dokumentů. V zákoně 325/2021 Sb. jsou vymezeny role ÚZIS a NZIS, ale EHDS přináší potřebu definovat novou entitu nebo jasně rozšířit kompetence existující.

Klíčové otázky, které novela zákona musí zodpovědět, zahrnují: kdo je Digital Health Authority (nový orgán, nebo ÚZIS/NCEZ s rozšířeným mandátem?), jaké jsou sankční pravomoci DHA vůči poskytovatelům a dodavatelům NIS, jak je definován opt-out ze sekundárního využití dat, kdo financuje certifikaci EHR systémů a v jakém časovém horizontu, a jak jsou upraveny kompetence HDAB ve vztahu k existujícím orgánům v oblasti ochrany osobních údajů (Úřad pro ochranu osobních údajů). Příprava těchto odpovědí je podmínkou pro zahájení legislativního procesu a ministerstvo zdravotnictví je v roce 2026 stále v přípravné fázi.


### Národní strategie elektronického zdravotnictví 2025–2035 — co slibuje a co reálně řeší

V říjnu 2025 schválila česká vláda Národní strategii elektronického zdravotnictví ČR 2025–2035, která vznikla za účasti 190 expertů ze 71 organizací a stanoví 5 strategických a 40 specifických cílů. Dokument explicitně uvádí implementaci EHDS jako jednu z klíčových horizontálních priorit a reaguje na termíny dané nařízením 2025/327. Svým rozsahem a kvalitou analytické části se jedná o věcně propracovaný policy dokument — srovnatelný s obdobnými strategiemi v Dánsku nebo Finsku.

Kritické čtení strategie ale odhaluje strukturální napětí. Dokument identifikuje potřebné změny správně, ale implementační část zůstává v rovině záměrů bez explicitního rozpočtového závazku, bez jmenovaných odpovědných institucí pro každý cíl a bez definovaných sankcí za neplnění milníků. Strategie říká, co je potřeba udělat; neříká, kdo za to zaplatí a co se stane, pokud se to nestihne. Zkušenost z předchozích strategií elektronického zdravotnictví v ČR (strategie z roku 2016, akční plán z roku 2020) je poučná: dokumenty existovaly, implementace probíhala pomalu a nesystematicky. Aby strategie 2025–2035 dopadla jinak, bude klíčová politická vůle zajistit financování z národních zdrojů a z fondů EU (CEF2-Digital, EU4Health) a přiřadit konkrétní odpovědnosti na úrovni zákonů, nikoli jen vládních usnesení.


### Kde Česko zaostává — připravenost EHR systémů, ePropouštěcí zpráva a registr preventivních vyšetření

Česká digitální zdravotní infrastruktura má silné základy — eRecept je funkční, NCPeH je v provozu, NZIS pokrývá hospitalizace, dispenzární péči a část ambulantních výkonů. Na tomto základě ale EHDS staví nároky, které odhalují mezery v několika konkrétních oblastech.

Propouštěcí zprávy jsou v českých nemocnicích stále z velké části generovány jako textové dokumenty bez strukturovaného datového formátu. Standard HL7 FHIR, který je technickým základem EHDS interoperability, vyžaduje strukturovaná data — ne volný text. Přechod na strukturované propouštěcí zprávy ve formátu FHIR R4 je technicky řešitelný, ale vyžaduje aktualizaci nebo výměnu NIS systémů u stovek poskytovatelů a intenzivní standardizaci klinického obsahu (terminologie SNOMED CT, ICD-11, LOINC). Tato práce je odhadována na pět až sedm let, i s plnou podporou a financováním.

Certifikace EHR systémů — povinná do roku 2031 — zasáhne ekosystém dodavatelů NIS, kde se setkáme s produkty od nativně moderních FHIR-ready platforem až po systémy pocházející technologicky z devadesátých let. Certifikační schéma, které připravuje Evropská komise formou prováděcích aktů, zatím není ve finální podobě; dodavatelé nemohou plně plánovat rozsah nutných úprav. Tato regulační nejistota sama o sobě zpomaluje investiční rozhodování.

Registr preventivních vyšetření — klíčový datový zdroj pro plánování preventivních programů a pro sekundární využití v kontextu EHDS — v ČR chybí jako centralizovaný strukturovaný systém. Preventivní prohlídky jsou vykazovány v systémech zdravotních pojišťoven, ale jejich konsolidace pro analytické účely je komplikovaná. Národní registr preventivních vyšetření je jedním z cílů Národní strategie eHealth 2025–2035, ale bez konkrétního termínu a financování.

Identitní infrastruktura je dalším problematickým místem. EHDS vyžaduje, aby pacienti mohli bezpečně prokázat svou identitu při přeshraničním přístupu ke zdravotním záznamům. Česká eIdentita (NIA — Národní identitní autorita) je legislativně i technicky funkční, ale míra adopce — zejména u starší populace — je nízká. Pokud bude přeshraniční přístup podmíněn digitální identitou, reálná dostupnost systému bude omezena na tu část populace, která digitální identitu používá.


> [[GRAF: Čtyři mezery české připravenosti na EHDS]]
> _Podklad:_ Čtyři mezery české připravenosti na EHDS Oblast Stav dnes Co vyžaduje EHDS Propouštěcí zprávy převážně volný text bez struktury FHIR R4 + SNOMED CT / ICD-11 / LOINC; odhad přechodu 5–7 let Certifikace EHR/NIS certifikační schéma EK není finální → investiční nejistota dodavatelů povinná shoda s interoperabilitou do 26. 3. 2031 Registr preventivních vyšetření chybí jako centralizovaný systém; data roztříštěná u pojišťoven cíl Národní strategie eHealth 2025–2035 — zatím bez termínu a financování Digitální identita (NIA) funkční, ale nízká adopce u starší populace bezpečné prokázání identity při p…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Dopady na pacienty, poskytovatele, výzkum a inovace

Pro pacienty je nejbezprostřednější benefit EHDS přeshraniční přenositelnost zdravotní dokumentace. Každý, kdo někdy onemocněl v zahraničí a musel vysvětlovat svou anamnézu jazykově bariérovanému lékaři bez jakékoli dokumentace, ocení funkční pacientský souhrn dostupný v MyHealth@EU. Obdobně pro chronicky nemocné — diabetiky, pacienty po orgánové transplantaci, onkologické pacienty — je přístupnost jejich zdravotního záznamu v zahraničí otázkou bezpečnosti péče, nikoli jen pohodlí. Právo bezplatného přístupu k vlastním elektronickým zdravotním záznamům, které EHDS garantuje, je přitom pro českou realitu posunem: dnes je přístup pacienta k vlastní dokumentaci zákonně zaručen, ale systém pro digitální přístup přes portál je pilotní a neuniverzální.

Pro poskytovatele péče přinese EHDS zvýšenou administrativní zátěž v přechodném období: přechod na strukturované záznamy, certifikace NIS, školení personálu pro přeshraniční scénáře. V delším horizontu ale může interoperabilní datová infrastruktura snížit duplicitu vyšetření (lékař vidí výsledky z předchozích pracovišť), zlepšit koordinaci péče a snížit riziko lékové polypragmazie přístupem k aktuálnímu přehledu medikace. Tyto přínosy jsou empiricky doloženy ze Skandinávie a Estonska, kde interoperabilní zdravotní záznamy fungují déle.

Pro výzkum a farmaceutický průmysl je sekundární využití dat pod EHDS potenciálně transformační. Přístup k pseudonymizovaným zdravotním záznamům milionů pacientů v reálném klinickém prostředí — tzv. real-world data — je klíčovým aktivem pro klinické studie, post-market surveillance léčiv a diagnostických přístrojů, vývoj algoritmů umělé inteligence a farmakovigilanci. EU jako celek disponuje daty z populace přes 450 milionů lidí; koordinovaný přístup k nim přes EHDS by mohl být konkurenční výhodou vůči USA i Číně v oblasti medicínského výzkumu. Česko, které má funkční NZIS s longitudinálními daty o hospitalizacích a preskripci, má v tomto kontextu nezanedbatelný datový kapitál — ale jen za předpokladu, že infrastruktura HDAB bude funkční a interoperabilní.


### Výhled — co se musí stihnout do března 2027

Do prvního tvrdého termínu EHDS — 26. března 2027 — zbývá méně než rok. Z hlediska legislativy to znamená, že novela zákona 325/2021 Sb. musí projít celým legislativním procesem, včetně meziresortního připomínkového řízení, projednání v Parlamentu a podpisu prezidenta. Typický legislativní cyklus v ČR pro zákon tohoto rozsahu trvá 12 až 18 měsíců od zahájení meziresortního řízení. Pokud ministerstvo zdravotnictví nepředloží pracovní verzi věcného záměru do konce roku 2025, je termín designace DHA do března 2027 realisticky ohrožen.

Z hlediska infrastruktury je situace méně kritická — NCPeH v ČR existuje a je technicky funkční pro primární sdílení. Potřebné upgrady pro plnou shodu s EHDS technickými specifikacemi (FHIR R4 profily definované prováděcími akty EK) jsou spíše evoluční než revoluční. NCEZ pracuje na rozšíření platformy; zásadní otázkou je, zda bude financování dostatečné a včasné.

Z hlediska governance je klíčovým úkolem vyjasit vztah mezi MZ ČR, ÚZIS a NCEZ v roli Digital Health Authority. Nelze mít tři instituce s překrývajícími se kompetencemi — EHDS explicitně vyžaduje jednu jasně designovanou DHA s jasnou odpovědností a pravomocemi vůči poskytovatelům péče, pojišťovnám i dodavatelům NIS. Politická dohoda na tomto institucionálním designu je předpokladem pro vše ostatní.

Česko není v nejhorší pozici mezi státy EU: eRecept funguje, NCPeH existuje, NZIS pokrývá klíčové datové zdroje a Národní strategie eHealth 2025–2035 poskytuje analytický základ. Ale v implementaci EHDS platí, co platí v mnoha jiných oblastech reformy: dokumenty a strategie nestačí — rozhoduje kapacita státu přenést záměr do zákona, zákon do provozu a provoz do praxe lékařů a pacientů. Na to zbývá do roku 2027 méně než třináct měsíců.


---

### Zdroje

- Nařízení EU 2025/327 (EHDS) — plný text nařízení v Úředním věstníku EU (anglická verze). EUR-Lex ↗
- Evropská komise — EHDS — portál EK k implementaci EHDS, technické specifikace a prováděcí akty. health.ec.europa.eu ↗
- NCEZ — aktualita k EHDS — informace Národního centra elektronického zdravotnictví k vyhlášení nařízení. ncez.mzcr.cz ↗
- Zákon č. 325/2021 Sb. o elektronizaci zdravotnictví — platné znění národní legislativy, jejíž novela je klíčovým implementačním krokem. zakonyprolidi.cz ↗
- Národní strategie elektronického zdravotnictví ČR 2025–2035 — schválena vládou ČR v říjnu 2025; 5 strategických cílů, 40 specifických cílů, reakce na EHDS. mzd.gov.cz ↗
- ÚZIS — Národní zdravotnický informační systém — správce NZIS, provozovatel NCPeH a klíčové datové infrastruktury. uzis.cz ↗
- MyHealth@EU — pilotní implementace — evropská platforma pro přeshraniční sdílení zdravotní dokumentace; ČR je zapojena prostřednictvím NCPeH. health.ec.europa.eu ↗
- HL7 FHIR R4 — technický standard — interoperabilitní standard zdravotní dokumentace, na němž je EHDS technicky postaven. hl7.org ↗
- Estonský X-tee a Digiriik — referenční architektura interoperabilní zdravotní datové infrastruktury v EU. e-estonia.com ↗
- Pozn. k údajům: Informace o stavu přípravy novely zákona 325/2021 Sb. a institucionálním designu DHA v ČR vycházejí z veřejně dostupných dokumentů MZ ČR a NCEZ ke dni vydání článku (12. 5. 2026). Prováděcí akty EK upřesňující technické specifikace EHDS jsou ke stejnému datu stále v přípravě a konečná podoba certifikačního schématu pro EHR systémy není finalizována. Čtenáři doporučujeme sledovat portál EK a NCEZ pro aktuální vývoj.

<!-- Zdroj webu: clanek-ehds-evropsky-prostor-zdravotni-data.html · skorezdravotnictvi.cz/clanek-ehds-evropsky-prostor-zdravotni-data -->