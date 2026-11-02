# Dotazníky srovnávače zdravotních pojišťoven: znění pro všechny fáze

> Stav k 2. 11. 2026, verze sad 1 (zatím nic nebylo rozesláno). Zdroj pravdy je `05_M1_Starter/data/pojistovny-otazky.json`; tento dokument je jeho čitelná podoba a text otázek v něm se s JSON shoduje doslova (hlídá `tests/zp-dotaznik.test.js`). Změna znění = změna JSON, zvýšení `verze` sady a záznam v `changelog`. Navazuje na `09_Srovnavac_pojistoven_plan.md`, `docs/metodika-srovnavac-pojistoven.md` (§ 2 oblasti, § 3 stavy, § 4 férovost, § 7 dotazníky) a `05_M1_Starter/PLAN-SROVNAVAC-POJISTOVEN.md` § 2.7.

## Přehled

| Fáze | Sada | Respondent | Kanál | Otázek |
|---|---|---|---|---|
| prosinec 2026 (po schválení kritérií na PS 12. 11. 2026) | `aplikace-privetivost` | IT expert redakce; hodnotí každou ze 7 aplikací zvlášť, pojišťovna list nevyplňuje | `interni` | 8 |
| kolo 1 · leden 2027 | `fond-prevence` | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web` | 7 |
| kolo 1 · leden 2027 (spolu s fondem prevence) | `pobocky-definice` | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web` | 4 |
| Q1 2027 (s NAPO) | `napo-pacientske-organizace` | pacientské organizace (členské organizace NAPO); odpovídá organizace za své členy, ne jednotlivec | `web-token` | 16 |
| po návrhu verdiktů · březen 2027 | `pravo-na-odpoved` | zdravotní pojišťovna, které se návrh hodnocení týká | `dopis+web` | 3 |
| kolo 2 · Q2 2027 | `rizikovi-pojistenci` | zdravotní pojišťovny (všech 7, adresný odkaz s tokenem) | `web-token` | 14 |
| od zveřejnění stránky (průběžně) | `pojistenci-anketa` | veřejnost, pojištěnci všech pojišťoven; bez tokenu a bez registrace | `web-verejnost` | 8 |

## Zásady pro všechny sady

- **Pojišťovna je partner i předmět hodnocení.** Otázky jsou věcné, bez hodnoticích přívlastků a bez domněnek o motivech (GOVERNANCE § 2). Ptáme se na to, co jde doložit, ne na názor.
- **Stejná otázka, stejný den, stejný formát** pro všech sedm pojišťoven (metodika § 4 bod 2). Lhůta 15 dnů odpovídá zákonu č. 106/1999 Sb.; právo na odpověď má 10 dní.
- **Formát odpovědi je v otázce.** Roky, jednotky (tis. Kč, počet unikátních osob), datum stavu (31. 12.) a sloupce tabulky. Nápověda (`napoveda`) u otázky říká, co musí odpověď obsahovat, aby dostala stav `dolozeno`; formulář ji ukazuje pod otázkou.
- **Žádné osobní údaje.** U adresných sad je respondentem instituce; veřejná anketa nemá volný text kromě krátkého upřesnění a nic, co by identifikovalo člověka. Zveřejňují se jen souhrny od tří odpovědí (metodika § 7).
- **Kanály** (`kanal`): `web-token` (osobní odkaz `pojistovny-gramotnost.html?dotaznik=<sada>&token=<token>`), `web-verejnost` (bez tokenu), `dopis+web` (dopis s nabídkou spolupráce; odpověď písemně nebo přes odkaz), `interni` (vyplňuje redakce, web ani API ji nepřijmou).
- **Pole sady:** `id`, `nazev`, `verze`, `typ` (`otevrene` | `dotaznik`), `faze`, `respondent`, `kanal`, `uvod`, u pojišťoven `pravni_zaklad`, volitelně `povolene_respondenty`. **Pole otázky:** `id`, `text`, volitelně `moznosti` + `vyber` (`jeden` | `vice`), `napoveda`, `max_delka` (1–2 000; platí pro text odpovědi i upřesnění). V dotazníku musí otevřená otázka mít `max_delka`, aby šlo poznat záměr od chybějící nabídky.

## 1. Prosinec 2026: aplikace (interní hodnoticí list)

První výstup pracovní skupiny je modul Aplikace. Kritéria přívětivosti (`data/pojistovny-aplikace.json` → `kriteria_privetivosti`, návrh podle podkladu M. Rybáře) schvaluje PS 12. 11. 2026; teprve pak IT expert hodnotí. Pojišťovny list nevyplňují, proto má sada `kanal: interni`: web ji nevybere (`?dotaznik=` ji ignoruje), API ji odmítne a token se k ní nevydá. Id otázek části K odpovídají id kritérií (pomlčka místo podtržítka).

### Uživatelská přívětivost aplikací – hodnoticí list (`aplikace-privetivost`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| prosinec 2026 (po schválení kritérií na PS 12. 11. 2026) | IT expert redakce; hodnotí každou ze 7 aplikací zvlášť, pojišťovna list nevyplňuje | `interni`: interní (redakce, mimo web) | jeden týden testu pro všech 7 aplikací | stupeň 0/1/2 u 6 kritérií na aplikaci (modul Aplikace), datum a verze testu; až po schválení kritérií PS a právu na odpověď |

Sada `aplikace-privetivost` · typ `dotaznik` · verze 1 · 8 otázek

**Úvod pro respondenta:** Hodnoticí list vyplňuje IT expert redakce jednou za každou aplikaci a platformu, na skutečném zařízení a ve stejném týdnu pro všech sedm aplikací. Stupeň 0/1/2 u kritérií K1–K6 zapíše redakce do data/pojistovny-aplikace.json (aplikace[].kriteria[id] = {stupen, zdroj, rok}) a zveřejní ho až po schválení kritérií pracovní skupinou. Pojišťovna dostane výsledek 10 dní před zveřejněním k vyjádření; kontakt je redakce.

**K · Kritéria přívětivosti (stupeň 0 / 1 / 2)**

1. **K1 · Přihlášení bankovní identitou (BankID) nebo identitou občana** `prihlaseni-bankid` · _jedna volba_

   - 0 – nesplňuje: aktivace ani přihlášení přes BankID nebo identitu občana nejsou možné
   - 1 – částečně: jen první aktivace účtu, nebo s omezením (např. jen některé banky)
   - 2 – splňuje: aktivace i běžné přihlášení přes BankID nebo identitu občana, bez návštěvy pobočky

   > Test: nová instalace, aktivace bez dřívějšího účtu. Zapište, které identity aplikace nabízí.

2. **K2 · Přístupnost pro 65+ (velikost písma, kontrast)** `pristupnost-65` · _jedna volba_

   - 0 – nesplňuje: aplikace nereaguje na systémovou velikost písma, nebo se text při zvětšení ořezává; kontrast textu je nízký
   - 1 – částečně: zvětšení funguje jen na části obrazovek, nebo část textu nemá kontrast 4,5 : 1
   - 2 – splňuje: při největším systémovém písmu zůstává text na hlavních obrazovkách celý a čitelný, kontrast textu je alespoň 4,5 : 1, dotykové plochy alespoň 44 × 44 bodů

   > Test: iOS Zpřístupnění → Větší text na maximum, Android Velikost písma a Velikost zobrazení na maximum. Projít čtyři obrazovky: přihlášení, přehled, žádost o příspěvek, průkaz. Kontrast změřit nástrojem platformy (Accessibility Inspector, Accessibility Scanner).

3. **K3 · Digitální průkaz pojištěnce dostupný offline** `offline-prukaz` · _jedna volba_

   - 0 – nesplňuje: aplikace digitální průkaz nemá
   - 1 – částečně: průkaz je, ale bez připojení se nezobrazí nebo vyžaduje nové přihlášení
   - 2 – splňuje: průkaz se po dřívějším přihlášení zobrazí v režimu letadlo, včetně čísla pojištěnce a platnosti

   > Test: přihlásit se, zavřít aplikaci, zapnout režim letadlo, znovu otevřít.

4. **K4 · Připomínky prevence** `notifikace-prevence` · _jedna volba_

   - 0 – nesplňuje: aplikace na preventivní prohlídky ani screeningy neupozorňuje
   - 1 – částečně: obecný přehled nebo upozornění bez vazby na věk a pohlaví pojištěnce
   - 2 – splňuje: adresná připomínka podle nároku pojištěnce (věk, pohlaví, poslední prohlídka), kterou lze vypnout

   > Test: testovací účet, nebo popis funkce v aplikaci a nápovědě pojišťovny (zdroj uveďte).

5. **K5 · Podpora v aplikaci (chat, žádost o zavolání)** `podpora-chat` · _jedna volba_

   - 0 – nesplňuje: v aplikaci není kontakt na podporu, jen odkaz na web
   - 1 – částečně: kontaktní formulář nebo e-mail, bez odpovědi v reálném čase
   - 2 – splňuje: chat s pracovníkem (ne jen automatický robot) nebo žádost o zavolání přímo v aplikaci, s uvedenou provozní dobou

6. **K6 · Hodnocení v obchodech s aplikacemi (ověřeno k datu testu)** `hodnoceni-obchody` · _jedna volba_

   - 0 – nesplňuje: nižší z obou průměrů je pod 3,0, nebo aplikace v jednom z obchodů chybí
   - 1 – částečně: nižší z obou průměrů je 3,0–3,9
   - 2 – splňuje: průměr alespoň 4,0 v App Storu i v Google Play

   > Opište průměr a počet hodnocení z českého App Storu a Google Play k datu testu. Při méně než 50 hodnoceních v obchodě zapište nejvýš stupeň 1 a poznámku. Prahy jsou návrh k PS.

**Z · Ověření na zařízení**

7. **Na jaké platformě proběhl test?** `zarizeni-platforma` · _více voleb_

   - iOS
   - Android

   > Hodnotí se obě platformy; když se výsledek liší, vyplní se list pro každou zvlášť a do datasetu jde nižší stupeň s poznámkou.

8. **Zařízení, verze systému, verze aplikace a datum testu** `zarizeni-verze` · _otevřená, nejvýš 300 znaků_

   > Formát: zařízení · verze systému · verze aplikace · datum (RRRR-MM-DD), např. iPhone 13 · iOS 18.1 · 5.12.0 · 2026-12-10.

**Co znamená „doloženo“.** Stupeň je doložený, když je u něj datum testu, zařízení a verze aplikace (část Z) a u K6 opsané průměry s počtem hodnocení. Co hodnotitel na zařízení neověřil, zůstává prázdné (`kriteria: {}` = zatím nehodnoceno), ne 0.

## 2. Leden 2027: kolo 1 (fond prevence + pobočky)

Obě sady jdou všem sedmi pojišťovnám v jednom dopise, týž den a ve stejném znění (metodika § 4 bod 2). Odpovídá se písemně (dokumenty jsou podkladem a zveřejňují se v plném znění) nebo přes formulář s tokenem. Před žádostí podle zákona č. 106/1999 Sb. je vždy dobrovolná nabídka spolupráce (§ 4 bod 3).

### Fond prevence – první kolo (`fond-prevence`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| kolo 1 · leden 2027 | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web`: dopis + web s tokenem nebo písemná odpověď | 15 dnů od doručení (pak žádost podle zákona 106) | plné znění odpovědí (`ingest/manual/pojistovny/odpovedi/`), stav oblasti `prevence` se zdůvodněním a stanoviskem pojišťovny |

Sada `fond-prevence` · typ `otevrene` · verze 1 · 7 otázek

**Právní základ:** Dobrovolná nabídka spolupráce (metodika § 4 bod 3). Pokud do 15 dnů odpověď nepřijde, následuje žádost o informace podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, se stejným zněním otázek.

**Úvod pro respondenta:** Ptáme se všech sedmi zdravotních pojišťoven ve stejný den na totéž: zda a jak umíte doložit účast a výsledek preventivních programů za roky 2024 a 2025, ne jakou výši příspěvků nabízíte. Odpovědi zveřejníme v plném znění a návrh hodnocení vám pošleme 10 dní před zveřejněním k vyjádření. Prosíme o odpověď do 15 dnů od doručení; s dotazy se obracejte na redakci (kontakt je v průvodním dopise).

1. **Které preventivní programy hrazené z fondu prevence jste nabízeli v letech 2024 a 2025? U každého uveďte prosím název, cílovou skupinu (věk, diagnóza, region), formu (příspěvek, vlastní program, kampaň, program se zaměstnavatelem) a období nabídky.** `fp1` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: úplný seznam za oba roky, nejlépe tabulka (CSV nebo XLSX) se sloupci název · cílová skupina · forma · rok. Samotný odkaz na web nestačí, pokud se nabídka mezi lety měnila.

2. **Jaký měřitelný cíl má každý program (např. zvýšit účast na screeningu v cílové skupině o 5 p. b.) a z jakého podkladu cíl vychází (vlastní data, odborné doporučení, analýza)?** `fp2` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: cíl vyjádřený číslem, s výchozí hodnotou a termínem, a dokument nebo odkaz, kde je stanoven. Obecný popis typu „podpora zdraví“ zapíšeme jako deklarovaný cíl.

3. **Jaké byly skutečné náklady jednotlivých programů v letech 2024 a 2025 v tis. Kč, z jakého fondu byly hrazeny (fond prevence, základní fond) a kolik unikátních pojištěnců každý program za rok využilo?** `fp3` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: tabulka program × rok s náklady v tis. Kč a počtem unikátních účastníků. Součet za fond prevence by měl odpovídat výroční zprávě; případný rozdíl prosíme vysvětlit. Předběžná data za rok 2025 označte jako předběžná.

4. **Jak měříte dopad programů na zdraví nebo chování účastníků (např. záchyty při screeningu, změna proočkovanosti, nástup do návazné péče)? Uveďte prosím ukazatele a jejich hodnoty za roky 2024 a 2025.** `fp4` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: konkrétní ukazatel, jeho hodnota za oba roky a srovnání (výchozí stav, neúčastníci nebo kontrolní skupina). Počet vyplacených příspěvků sám o sobě dopad nedokládá.

5. **Jakými kanály pojištěnce s nabídkou prevence oslovujete (dopis, e-mail, aplikace, praktický lékař, zaměstnavatel, kampaň)? Kolik pojištěnců jste v letech 2024 a 2025 jednotlivými kanály oslovili a kolik z nich se programu zúčastnilo?** `fp5` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: počet oslovených a počet účastníků podle kanálu alespoň za jeden rok, ve formátu kanál · rok · oslovení · účastníci. Seznam kanálů bez čísel zapíšeme jako deklaraci.

6. **Jak hodnotíte nákladovou efektivitu programů (např. náklady na jednoho účastníka nebo na jeden záchyt)? Máte k tomu interní metodiku? Pokud ano, prosíme o její předání nebo odkaz; pokud ji nelze zveřejnit, uveďte prosím důvod.** `fp6` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: metodika (dokument nebo odkaz), podle které lze výpočet zopakovat, a alespoň jeden výsledek za rok 2024 nebo 2025. Metodiku, kterou nelze předat, uvedeme jako „existuje, nepředložena“.

7. **Jak často výsledky programů vyhodnocujete (průběžně, ročně, nepravidelně) a co jste na základě vyhodnocení v letech 2024–2025 změnili (program ukončen, upraven, rozšířen)?** `fp7` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: datum posledního vyhodnocení a alespoň jeden příklad rozhodnutí, které z něj vzešlo (zápis, změna podmínek programu, tisková zpráva).

**Co znamená „doloženo“.** Stav `dolozeno` dostane odpověď, ze které lze tvrzení ověřit a zopakovat: tabulka nebo dokument s čísly za oba roky, metodika výpočtu, srovnání s výchozím stavem. Tvrzení bez čísel je `deklarovano`, odpověď mimo otázku `nedolozeno`, žádná odpověď ani po výzvě `neodpovedela` (metodika § 3). Výše fondu ani počet programů kritériem nejsou (§ 4 bod 6).

### Pobočky podle jednotné definice (`pobocky-definice`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| kolo 1 · leden 2027 (spolu s fondem prevence) | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web`: dopis + web s tokenem nebo písemná odpověď | 15 dnů (s kolem 1) | tři čísla na pojišťovnu k 31. 12. 2026 (přepážky, z toho ≥ 3 dny v týdnu, partnerská místa zvlášť) a seznam míst; indikátory `pobocky_osobni_prepazka`, `pobocky_na_100k_pojistencu`, `pobocky_okresy_bez_mista` (`docs/pojistovny-sit.md` § 6) |

Sada `pobocky-definice` · typ `otevrene` · verze 1 · 4 otázky · povolení respondenti: `pojistovna`

**Právní základ:** Dobrovolná nabídka spolupráce (metodika § 4 bod 3). Pokud do 15 dnů odpověď nepřijde, následuje žádost o informace podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, se stejným zněním otázek.

**Úvod pro respondenta:** Počty poboček nejsou mezi pojišťovnami srovnatelné, protože každá počítá jiné druhy míst; navrhujeme proto jednotnou definici: pobočka je místo s pravidelnými úředními hodinami pro veřejnost, kde pojištěnec vyřídí agendu osobně s pracovníkem pojišťovny (osobní přepážka), a nepatří sem ústředí bez přepážky, podatelna, partnerské místo třetí strany (pošta, Polpoint, ePodání) ani mobilní či virtuální pobočka. Čísla zveřejníme s datem a s vaším seznamem míst, odděleně podle druhu. Odpovězte prosím do 15 dnů spolu s otázkami k fondu prevence; kontakt na redakci je v průvodním dopise.

1. **Kolik míst s osobní přepážkou podle uvedené definice jste měli k 31. 12. 2026?** `prepazky` · _otevřená, nejvýš 300 znaků_

   > Odpověď: jedno číslo. Doloženo: číslo k datu a seznam míst (otázka 4), jehož počet řádků druhu „prepazka“ číslu odpovídá.

2. **Kolik z těchto míst mělo k témuž datu úřední hodiny pro veřejnost alespoň 3 dny v týdnu?** `uredni-hodiny` · _otevřená, nejvýš 300 znaků_

   > Odpověď: jedno číslo. Úřední hodiny podle stavu k 31. 12. 2026, ne po předchozí domluvě.

3. **Kolik dalších kontaktních míst jste k 31. 12. 2026 provozovali mimo definici (partnerská místa, podatelny, mobilní pobočky)? Uveďte prosím počet zvlášť podle druhu.** `partnerska-mista` · _otevřená, nejvýš 1 000 znaků_

   > Formát: druh · počet. Tato místa zveřejníme odděleně od poboček, aby pojištěnec viděl, kde co vyřídí.

4. **Pošlete prosím seznam všech míst z otázek 1–3 jako CSV (UTF-8, středník) se sloupci: nazev; druh (prepazka | partnerske | podatelna | mobilni); adresa; obec; kraj; uredni_hodiny; dny_v_tydnu; stav_k (RRRR-MM-DD). Uveďte odkaz ke stažení nebo název přiloženého souboru.** `seznam-csv` · _otevřená, nejvýš 1 000 znaků_

   > Doloženo: soubor, ze kterého jdou čísla z otázek 1–3 spočítat. Pokud seznam zveřejňujete na webu ve strojově čitelné podobě (CSV, JSON), stačí stálý odkaz; budeme ho používat pro průběžnou aktualizaci.

**Co znamená „doloženo“.** Číslo je doložené, když ho lze spočítat ze zaslaného seznamu míst (CSV) a počet řádků druhu `prepazka` se s ním shoduje. Bez seznamu zveřejníme číslo jako deklarované a vedle něj počet z webu pojišťovny s datem ověření.

## 3. Q1 2027: pacientské organizace přes NAPO

NAPO rozešle členským organizacím osobní odkazy (`scripts/dotaznik-token.js --typ pacientska_organizace`). Úvodní blok popisuje organizaci (typ, diagnózová oblast, počet členů v pásmech), pak šest oblastí metodiky: u každé slovní škála a „ke které pojišťovně se hodnocení vztahuje“, na konci jedna otevřená otázka. Samostatná otevřená otázka u každé oblasti by dala 21 otázek nad limit 16; konkrétní zkušenost je proto v jedné otevřené otázce s pokynem uvést oblast a pojišťovnu.

### Zkušenost pacientských organizací s pojišťovnami (`napo-pacientske-organizace`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| Q1 2027 (s NAPO) | pacientské organizace (členské organizace NAPO); odpovídá organizace za své členy, ne jednotlivec | `web-token`: web s osobním odkazem (token) | 30 dnů od doručení odkazu | jen souhrnné počty za všechny organizace (otázky s nabídkou, od 3 odpovědí); volné texty nezveřejňujeme |

Sada `napo-pacientske-organizace` · typ `dotaznik` · verze 1 · 16 otázek · povolení respondenti: `pacientska_organizace`

**Úvod pro respondenta:** Ptáme se pacientských organizací, jakou zkušenost mají jejich členové se zdravotními pojišťovnami v šesti oblastech, které srovnávač sleduje; odpovídá organizace jako celek, bez jmen a údajů, podle kterých by šlo poznat konkrétního člověka. Zveřejníme jen souhrnné počty za všechny organizace (od tří odpovědí), volné texty slouží redakci jako podnět k ověření u pojišťoven. Lhůta je 30 dnů od doručení odkazu; kontakt na redakci je v průvodním e-mailu NAPO.

**1 · O vaší organizaci**

1. **Jaký typ organizace jste?** `typ-organizace` · _jedna volba, s polem pro upřesnění_

   - pacientská organizace (spolek pacientů)
   - zastřešující organizace nebo síť organizací
   - organizace rodičů nebo blízkých pacientů
   - jiné (uveďte)

2. **Jakou diagnózovou oblast nebo skupinu pacientů zastupujete?** `diagnozova-oblast` · _více voleb, s polem pro upřesnění_

   - onkologická onemocnění
   - kardiovaskulární a metabolická onemocnění (vč. diabetu)
   - duševní zdraví
   - neurologická onemocnění
   - vzácná onemocnění
   - autoimunitní a revmatická onemocnění
   - respirační onemocnění a alergie
   - zdravotní postižení
   - senioři
   - děti a dospívající
   - jiné (uveďte)

3. **Kolik má vaše organizace členů?** `pocet-clenu` · _jedna volba_

   - do 50
   - 51–200
   - 201–1 000
   - 1 001–5 000
   - více než 5 000

**2 · Prevence**

4. **Jak členové hodnotí nabídku preventivních programů a příspěvků pro lidi s vaší diagnózou (informace o nabídce, podmínky čerpání)?** `prevence-hodnoceni` · _jedna volba_

   - velmi dobrá
   - spíše dobrá
   - spíše špatná
   - velmi špatná
   - nemáme zkušenost / nevíme

5. **Ke které pojišťovně se vaše hodnocení v této oblasti vztahuje především?** `prevence-pojistovna` · _více voleb_

   - VZP ČR – Všeobecná zdravotní pojišťovna (111)
   - VoZP – Vojenská zdravotní pojišťovna (201)
   - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
   - OZP – Oborová zdravotní pojišťovna (207)
   - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
   - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
   - RBP, zdravotní pojišťovna (213)
   - nevím / nelze určit

   > Lze vybrat více pojišťoven. Souhrn zveřejníme jen za všechny organizace dohromady.

**3 · Dostupnost a čekací doby**

6. **Jak členové hodnotí pomoc pojišťovny, když nemohou sehnat lékaře nebo vyšetření v přiměřené době (např. zprostředkování termínu)?** `dostupnost-hodnoceni` · _jedna volba_

   - velmi dobrá
   - spíše dobrá
   - spíše špatná
   - velmi špatná
   - nemáme zkušenost / nevíme

7. **Ke které pojišťovně se vaše hodnocení v této oblasti vztahuje především?** `dostupnost-pojistovna` · _více voleb_

   - VZP ČR – Všeobecná zdravotní pojišťovna (111)
   - VoZP – Vojenská zdravotní pojišťovna (201)
   - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
   - OZP – Oborová zdravotní pojišťovna (207)
   - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
   - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
   - RBP, zdravotní pojišťovna (213)
   - nevím / nelze určit

   > Lze vybrat více pojišťoven. Souhrn zveřejníme jen za všechny organizace dohromady.

**4 · Síť poskytovatelů**

8. **Jak členové hodnotí dostupnost smluvních lékařů a zařízení, které pro svou diagnózu potřebují, v dosahu bydliště?** `sit-hodnoceni` · _jedna volba_

   - velmi dobrá
   - spíše dobrá
   - spíše špatná
   - velmi špatná
   - nemáme zkušenost / nevíme

9. **Ke které pojišťovně se vaše hodnocení v této oblasti vztahuje především?** `sit-pojistovna` · _více voleb_

   - VZP ČR – Všeobecná zdravotní pojišťovna (111)
   - VoZP – Vojenská zdravotní pojišťovna (201)
   - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
   - OZP – Oborová zdravotní pojišťovna (207)
   - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
   - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
   - RBP, zdravotní pojišťovna (213)
   - nevím / nelze určit

   > Lze vybrat více pojišťoven. Souhrn zveřejníme jen za všechny organizace dohromady.

**5 · Kvalita péče**

10. **Jak členové hodnotí informace pojišťovny o kvalitě poskytovatelů a pomoc při výběru, kde se léčit?** `kvalita-hodnoceni` · _jedna volba_

    - velmi dobrá
    - spíše dobrá
    - spíše špatná
    - velmi špatná
    - nemáme zkušenost / nevíme

11. **Ke které pojišťovně se vaše hodnocení v této oblasti vztahuje především?** `kvalita-pojistovna` · _více voleb_

    - VZP ČR – Všeobecná zdravotní pojišťovna (111)
    - VoZP – Vojenská zdravotní pojišťovna (201)
    - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
    - OZP – Oborová zdravotní pojišťovna (207)
    - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
    - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
    - RBP, zdravotní pojišťovna (213)
    - nevím / nelze určit

    > Lze vybrat více pojišťoven. Souhrn zveřejníme jen za všechny organizace dohromady.

**6 · Klientský servis**

12. **Jak členové hodnotí jednání s pojišťovnou: pobočka, telefon, aplikace, srozumitelnost dopisů, rychlost vyřízení žádostí?** `servis-hodnoceni` · _jedna volba_

    - velmi dobrá
    - spíše dobrá
    - spíše špatná
    - velmi špatná
    - nemáme zkušenost / nevíme

13. **Ke které pojišťovně se vaše hodnocení v této oblasti vztahuje především?** `servis-pojistovna` · _více voleb_

    - VZP ČR – Všeobecná zdravotní pojišťovna (111)
    - VoZP – Vojenská zdravotní pojišťovna (201)
    - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
    - OZP – Oborová zdravotní pojišťovna (207)
    - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
    - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
    - RBP, zdravotní pojišťovna (213)
    - nevím / nelze určit

    > Lze vybrat více pojišťoven. Souhrn zveřejníme jen za všechny organizace dohromady.

**7 · Hospodaření a transparentnost**

14. **Jak členové hodnotí srozumitelnost informací o tom, co pojišťovna hradí a proč (např. zdůvodnění rozhodnutí o žádosti o úhradu podle § 16)?** `hospodareni-hodnoceni` · _jedna volba_

    - velmi dobrá
    - spíše dobrá
    - spíše špatná
    - velmi špatná
    - nemáme zkušenost / nevíme

15. **Ke které pojišťovně se vaše hodnocení v této oblasti vztahuje především?** `hospodareni-pojistovna` · _více voleb_

    - VZP ČR – Všeobecná zdravotní pojišťovna (111)
    - VoZP – Vojenská zdravotní pojišťovna (201)
    - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
    - OZP – Oborová zdravotní pojišťovna (207)
    - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
    - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
    - RBP, zdravotní pojišťovna (213)
    - nevím / nelze určit

    > Lze vybrat více pojišťoven. Souhrn zveřejníme jen za všechny organizace dohromady.

**8 · Konkrétní zkušenost**

16. **Popište prosím jednu až tři konkrétní zkušenosti členů, které vaše hodnocení ilustrují: oblast, pojišťovna, co se stalo a jak to dopadlo. Bez osobních údajů.** `zkusenost` · _otevřená, nejvýš 1 500 znaků_

    > Neuvádějte jména, rodná čísla, adresy, data narození ani vzácné diagnózy v kombinaci s místem. Text nezveřejňujeme; redakce ho použije jako podnět k ověření u pojišťovny.

**Co znamená „doloženo“.** Dotazník NAPO verdikt nedokládá: je to zkušenost pacientů, podnět k otázkám pro pojišťovny a kontext oblasti `servis`. Souhrn se ukazuje vždy s počtem organizací a bez pořadí pojišťoven.

## 4. Březen 2027: právo na odpověď

Po vyhodnocení kola 1 dostane každá pojišťovna návrh svého hodnocení 10 dní před zveřejněním (metodika § 4 bod 4) a lhůta se eviduje v `data/zadosti-106.json` jako záznam typu `pravo-na-odpoved`.

### Právo na odpověď k návrhu hodnocení (`pravo-na-odpoved`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| po návrhu verdiktů · březen 2027 | zdravotní pojišťovna, které se návrh hodnocení týká | `dopis+web`: dopis + web s tokenem nebo písemná odpověď | 10 dní od doručení návrhu hodnocení | stanovisko doslova vedle hodnocení (`pojistovny[].semafor[oblast].stanovisko_pojistovny`, blok „Stanoviska pojišťoven“); nesouhlas a podklady jako součást changelogu |

Sada `pravo-na-odpoved` · typ `otevrene` · verze 1 · 3 otázky · povolení respondenti: `pojistovna`

**Právní základ:** Právo na odpověď podle metodiky srovnávače, § 4 bod 4. Nejde o žádost podle zákona č. 106/1999 Sb.

**Úvod pro respondenta:** Návrh hodnocení (stav semaforu v šesti oblastech) dostáváte 10 dní před zveřejněním, stejně jako ostatní pojišťovny. S návrhem můžete nesouhlasit, doložit podklady a napsat stanovisko, které zveřejníme doslova vedle hodnocení. Lhůta je 10 dní od doručení návrhu; kontakt na redakci je v průvodním dopise.

1. **Se kterými návrhy stavu nesouhlasíte? Označte oblasti; popis každé oblasti a odkaz na ni je v návrhu hodnocení.** `nesouhlas` · _více voleb_

   - prevence – Prevence s dopadem
   - dostupnost – Dostupnost a čekací doby
   - sit – Síť a ohrožené oblasti
   - kvalita – Kvalita ve smluvní politice
   - servis – Klientský servis a informování
   - hospodareni – Hospodaření a transparentnost
   - s návrhy ve všech oblastech souhlasíme

   > Popis oblastí a stavů je v metodice srovnávače (pojistovny-metodika.html, § 2 a § 3).

2. **U oblastí, se kterými nesouhlasíte: co je podle vás v návrhu nepřesné a jaké podklady to ukazují? Uveďte odkaz (URL) na dokument, nebo název souboru, který posíláte datovou schránkou či e-mailem.** `doklady` · _otevřená, nejvýš 2 000 znaků_

   > Formát: oblast · co nesouhlasí · podklad (URL nebo název souboru). Stav „doloženo“ může dostat jen tvrzení, které lze z dat nebo metodiky ověřit a zopakovat (metodika § 3).

3. **Stanovisko ke zveřejnění: text, který zveřejníme doslova a beze změn vedle hodnocení. Pokud se týká více oblastí, začněte každý odstavec názvem oblasti.** `stanovisko` · _otevřená, nejvýš 1 500 znaků_

   > Redakce text nekrátí ani neupravuje; jen ho podle oblastí rozdělí do pole stanovisko_pojistovny u příslušné oblasti. Bez stanoviska zveřejníme hodnocení s poznámkou, že pojišťovna právo na odpověď nevyužila.

**Co znamená „doloženo“.** Nový podklad, ze kterého lze tvrzení ověřit a zopakovat, změní stav ještě před zveřejněním (s datem v changelogu). Nesouhlas bez podkladu stav nemění, ale stanovisko se zveřejní vždy.

## 5. Q2 2027: kolo 2 (rizikoví pojištěnci a zdravotní gramotnost)

Dotazník A–D, formulář s tokenem. Oproti první verzi: část B je nově o personalizované komunikaci a souhlasu s profilováním (otevřená otázka PS č. 3), bariéry identifikace se přesunuly do otevřené otázky A5, měření výsledků je v části C a přibyla část D „Zdravotní gramotnost“ (materiály, jazyky, přístupnost 65+, spolupráce s pacientskými organizacemi). Otázky A3 a A4 mají zachované volby kvůli kompatibilitě exportu agregátů.

### Rizikoví pojištěnci a zdravotní gramotnost – druhé kolo (`rizikovi-pojistenci`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| kolo 2 · Q2 2027 | zdravotní pojišťovny (všech 7, adresný odkaz s tokenem) | `web-token`: web s osobním odkazem (token) | 15 dnů od doručení odkazu (pak žádost podle zákona 106) | plné znění odpovědí s hodnocením; na stránce souhrnné počty u otázek s nabídkou (od 3 odpovědí); vstup pro oblasti `prevence` a `servis` |

Sada `rizikovi-pojistenci` · typ `dotaznik` · verze 1 · 14 otázek

**Právní základ:** Dobrovolná nabídka spolupráce (metodika § 4 bod 3). Pokud do 15 dnů odpověď nepřijde, následuje žádost o informace podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, se stejným zněním otázek.

**Úvod pro respondenta:** Druhé kolo se ptá, jak vyhledáváte pojištěnce se zvýšeným zdravotním rizikem, jak je oslovujete a co nabízíte pro zdravotní gramotnost; u otázek s nabídkou vyberte vše, co platí, otevřené otázky slouží k doložení. Odpovědi zveřejníme v plném znění spolu s hodnocením, jehož návrh dostanete 10 dní předem k vyjádření, souhrnné počty za všechny pojišťovny až od tří odpovědí. Lhůta je 15 dnů od doručení odkazu; kontakt na redakci je v průvodním dopise.

**A · Identifikace rizikových skupin**

1. **Které skupiny pojištěnců se zvýšeným zdravotním rizikem aktivně vyhledáváte?** `A1` · _více voleb, s polem pro upřesnění_

   - obézní děti
   - dospělí s obezitou nebo metabolickým rizikem (prediabetes, hypertenze)
   - mladí dospělí s rizikovým chováním (kouření, alkohol)
   - křehcí senioři
   - chroničtí pacienti (diabetes, srdeční selhání, CHOPN)
   - pacienti s polypragmazií (5 a více léků současně)
   - pojištěnci, kteří nechodí na preventivní prohlídky nebo screeningy
   - rizikové skupiny aktivně nevyhledáváme
   - jiné (uveďte)

   > Doloženo: u vybraných skupin počty v otázce A5.

2. **Z jakých dat rizikové pojištěnce vyhledáváte?** `A2` · _více voleb, s polem pro upřesnění_

   - vykázané diagnózy (MKN-10)
   - vykázaná péče a výkony
   - výsledky screeningů
   - léková data (vydané léčivé přípravky)
   - účast na preventivních prohlídkách
   - údaje od lékařů nad rámec vykázané péče
   - vlastní analytické modely
   - jiné (uveďte)

3. **Používáte k vyhledání rizikových pojištěnců predikční model (statistický nebo strojového učení)?** `A3` · _jedna volba, s polem pro upřesnění_

   - ano – uveďte typ modelu
   - ne

   > Doloženo: popis modelu (vstupní proměnné, cílová událost, ověření přesnosti), stačí odkaz nebo příloha.

4. **Jak často seznam rizikových pojištěnců aktualizujete?** `A4` · _jedna volba_

   - měsíčně
   - čtvrtletně
   - ročně
   - ad hoc

5. **Kolik pojištěnců bylo k 31. 12. 2026 zařazeno do jednotlivých skupin z otázky A1 a podle jakého kritéria? Co vyhledávání nejvíc ztěžuje (např. chybějící BMI nebo údaje o životním stylu)?** `A5` · _otevřená, nejvýš 1 500 znaků_

   > Formát: skupina · kritérium zařazení · počet pojištěnců. Doloženo: počty k datu a kritérium, podle kterého je lze zopakovat.

**B · Personalizovaná komunikace a souhlas s profilováním**

6. **Jak rizikové pojištěnce oslovujete?** `B1` · _více voleb, s polem pro upřesnění_

   - dopisem
   - e-mailem nebo SMS
   - notifikací v aplikaci
   - telefonicky
   - přes praktického nebo jiného ošetřujícího lékaře
   - přes zaměstnavatele
   - individuálně neoslovujeme, nabídka je jen na webu
   - jiné (uveďte)

7. **Na jakém základě pojištěnce do rizikové skupiny zařazujete a oslovujete?** `B2` · _jedna volba, s polem pro upřesnění_

   - předem udělený souhlas pojištěnce (opt-in)
   - zákonný základ, pojištěnec může oslovování odmítnout (opt-out)
   - zákonný základ bez možnosti odmítnutí
   - individuálně neoslovujeme
   - jiné (uveďte)

   > Uveďte prosím v upřesnění ustanovení, o které se zpracování opírá (zákon, článek GDPR).

8. **Jak se pojištěnec dozví, že byl do rizikové skupiny zařazen, a jak může oslovování odmítnout?** `B3` · _otevřená, nejvýš 1 500 znaků_

   > Doloženo: odkaz na informace pro pojištěnce nebo znění souhlasu, případně počet pojištěnců, kteří v roce 2026 oslovování odmítli.

**C · Měření výsledků**

9. **Jaké výsledky u oslovených rizikových pojištěnců sledujete?** `C1` · _více voleb, s polem pro upřesnění_

   - účast na prevenci a screeningu
   - adherence k léčbě
   - změna klinických hodnot nebo diagnóz
   - hospitalizace a návštěvy pohotovosti
   - náklady na zdravotní služby
   - spokojenost pojištěnců
   - výsledky zatím nesledujeme
   - jiné (uveďte)

10. **Uveďte prosím jeden výsledek z let 2025–2026 s čísly: skupina, ukazatel, hodnota u oslovených a ve srovnávací skupině (neoslovení nebo stav před zahájením).** `C2` · _otevřená, nejvýš 1 500 znaků_

    > Doloženo: ukazatel s hodnotou a srovnáním, ze kterého je patrný rozdíl. Výsledek bez srovnání zapíšeme jako deklarovaný. Pokud výsledek zveřejňujete, přidejte odkaz.

**D · Zdravotní gramotnost**

11. **Jaké materiály ke zdravotní gramotnosti pojištěncům nabízíte?** `D1` · _více voleb, s polem pro upřesnění_

    - tištěné letáky a brožury
    - články a průvodce na webu
    - obsah v mobilní aplikaci
    - videa
    - přednášky, kurzy nebo poradny
    - materiály ve snadném čtení
    - materiály pro rodiče a děti
    - jiné (uveďte)

12. **V jakých jazycích jsou materiály k dispozici?** `D2` · _více voleb, s polem pro upřesnění_

    - čeština
    - angličtina
    - ukrajinština
    - slovenština
    - vietnamština
    - romština
    - český znakový jazyk
    - jiné (uveďte)

13. **Co nabízíte pojištěncům 65+, aby se k informacím a službám snadno dostali?** `D3` · _více voleb, s polem pro upřesnění_

    - osobní konzultace na pobočce
    - telefonická linka s obsluhou, bez hlasového automatu
    - tištěné výpisy a dopisy na vyžádání
    - zvětšené písmo a vysoký kontrast na webu a v aplikaci
    - zjednodušený režim aplikace
    - zmocnění blízké osoby k elektronickým službám
    - nic z uvedeného
    - jiné (uveďte)

14. **S kterými pacientskými organizacemi jste v letech 2025–2026 spolupracovali na materiálech nebo programech a v jaké podobě (společný materiál, financování, připomínkování)? Pokud jste nespolupracovali, napište prosím „ne“.** `D4` · _otevřená, nejvýš 1 000 znaků_

    > Doloženo: název organizace, název materiálu nebo programu a rok; stačí odkaz.

**Co znamená „doloženo“.** Volba v nabídce je deklarace. Doloženo je až to, co otevřené otázky (A5, B3, C2, D4) podloží počtem k datu, odkazem na dokument nebo výsledkem se srovnáním.

## 6. Od zveřejnění stránky: anketa pro pojištěnce

Veřejná anketa bez tokenu na `pojistovny-gramotnost.html?dotaznik=pojistenci-anketa`. Žádné osobní údaje: věk jen v pásmech, bydliště jen kraj, jediné volné pole je upřesnění „jiné“ do 300 znaků a API v něm odmítne e-mail i rodné číslo.

### Anketa pro pojištěnce: co vám u pojišťovny chybí (`pojistenci-anketa`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| od zveřejnění stránky (průběžně) | veřejnost, pojištěnci všech pojišťoven; bez tokenu a bez registrace | `web-verejnost`: web bez tokenu | průběžně | souhrnné počty u každé otázky (od 3 odpovědí), nikdy jednotlivé odpovědi ani text upřesnění |

Sada `pojistenci-anketa` · typ `dotaznik` · verze 1 · 8 otázek · povolení respondenti: `verejnost`

**Úvod pro respondenta:** Anketa je anonymní: neptáme se na jméno, e-mail ani bydliště přesněji než kraj, neukládáme IP adresu a všechny otázky jsou nepovinné. Zveřejňujeme jen souhrnné počty, a to až od tří odpovědí. Vyplnění zabere asi dvě minuty; dotazy a připomínky směřujte na redakci Zdravého Česka.

**1 · Vaše pojišťovna**

1. **U které zdravotní pojišťovny jste pojištěni?** `pojistovna` · _jedna volba_

   - VZP ČR – Všeobecná zdravotní pojišťovna (111)
   - VoZP – Vojenská zdravotní pojišťovna (201)
   - ČPZP – Česká průmyslová zdravotní pojišťovna (205)
   - OZP – Oborová zdravotní pojišťovna (207)
   - ZPŠ – Zaměstnanecká pojišťovna Škoda (209)
   - ZP MV ČR – Zdravotní pojišťovna ministerstva vnitra (211)
   - RBP, zdravotní pojišťovna (213)
   - nechci uvést

2. **Proč jste právě u této pojišťovny? Vyberte vše, co platí.** `duvod` · _více voleb_

   - nevybíral(a) jsem si, jsem u ní odjakživa
   - příspěvky z fondu prevence a další výhody
   - doporučení rodiny, známých nebo zaměstnavatele
   - pobočka nebo kontaktní místo blízko
   - aplikace a online služby
   - smluvní lékaři a zařízení v okolí
   - přestoupil(a) jsem kvůli zkušenosti s předchozí pojišťovnou
   - jiný důvod

3. **Co vám u vaší pojišťovny chybí?** `co-chybi` · _více voleb, s polem pro upřesnění do 300 znaků_

   - srozumitelné informace o tom, co hradí
   - pomoc se sehnáním lékaře nebo termínu
   - příspěvky na prevenci, které bych opravdu využil(a)
   - jednodušší vyřizování online
   - osobní kontakt (pobočka, telefon s člověkem)
   - rychlejší vyřízení žádostí a stížností
   - přehled o vykázané péči
   - nic mi nechybí
   - jiné (uveďte)

   > Do upřesnění prosím nepište jména, e-maily ani jiné osobní údaje.

4. **Využil(a) jste za poslední dva roky příspěvek z fondu prevence své pojišťovny?** `fond-prevence` · _jedna volba_

   - ano
   - ne
   - nevím

5. **Používáte mobilní aplikaci své pojišťovny?** `aplikace` · _jedna volba_

   - ano
   - ne
   - nevím o ní

6. **Jak jste se svou pojišťovnou celkově spokojen(a)?** `spokojenost` · _jedna volba_

   - 1 – velmi nespokojen(a)
   - 2
   - 3
   - 4
   - 5 – velmi spokojen(a)

**2 · O vás (nepovinné)**

7. **Ve kterém kraji bydlíte?** `kraj` · _jedna volba_

   - Hlavní město Praha
   - Středočeský kraj
   - Jihočeský kraj
   - Plzeňský kraj
   - Karlovarský kraj
   - Ústecký kraj
   - Liberecký kraj
   - Královéhradecký kraj
   - Pardubický kraj
   - Kraj Vysočina
   - Jihomoravský kraj
   - Olomoucký kraj
   - Zlínský kraj
   - Moravskoslezský kraj
   - nechci uvést

8. **Kolik vám je let?** `vek` · _jedna volba_

   - 18–29
   - 30–44
   - 45–64
   - 65–74
   - 75 a více
   - nechci uvést

**Co znamená „doloženo“.** Anketa nic nedokládá a do semaforu nevstupuje: je to samovýběrový vzorek čtenářů, ne reprezentativní šetření. Na stránce vždy s počtem odpovědí a touto poznámkou.

## Průvodní dopis (kolo 1)

Šablona pro dopis s nabídkou spolupráce, který jde všem sedmi pojišťovnám týž den spolu se sadami `fond-prevence` a `pobocky-definice`. Podepisuje a odesílá člověk za think tank Ministr zdraví (kdo konkrétně a kdo je kontaktní osoba, je otevřená otázka PS č. 4); AI nic neodesílá. Obecná šablona dopisů institucím: [`docs/dopis-instituce-data.md`](dopis-instituce-data.md). Odeslání a doručení zapíše člověk do `data/zadosti-106.json` (`typ: nabidka-spoluprace`).

```text
Vážená paní ředitelko, vážený pane řediteli,
think tank Ministr zdraví a Národní asociace pacientských organizací připravují s odbornou garancí
Advance Healthcare Management Institute srozumitelný průvodce vztahem pojišťovna–pojištěnec.
Rádi bychom Vás požádali o dobrovolné předání podkladů: přikládáme 7 otázek k fondu prevence a 4 otázky
k pobočkám; stejný dopis dnes dostaly všechny zdravotní pojišťovny.
Nejde nám o výši příspěvků, ale o to, co lze doložit: účast, výsledek a metodiku.
Odpovědi zveřejníme v plném znění a návrh hodnocení Vám pošleme 10 dní předem k vyjádření.
Odpovědět můžete dopisem, datovou schránkou nebo přes formulář: [osobní odkaz s tokenem].
Prosíme o odpověď do 15 dnů; jinak podáme stejné otázky jako žádost podle zákona č. 106/1999 Sb., aby měly všechny pojišťovny stejné podmínky.
Kontaktní osoba: [jméno, funkce, e-mail, telefon]. Děkujeme za spolupráci. [podpis]
```

## Co se při změně znění dělá

1. Upravit `data/pojistovny-otazky.json`; po prvním rozeslání sady zvýšit její `verze` (odpovědi nesou verzi, na kterou se odpovídalo) a připsat záznam do `changelog`.
2. Přegenerovat nebo ručně upravit tento dokument tak, aby text otázek odpovídal JSON doslova.
3. `node ingest/validate-pojistovny.js` a `npm test` (`tests/zp-dotaznik.test.js` hlídá unikátní id, povolený kanál, limity počtu otázek a shodu s tímto dokumentem).
4. Nová hodnota `respondent_typ` (např. „expert“) by znamenala migraci databáze a změnu API: třída C, rozhoduje vydavatel.
