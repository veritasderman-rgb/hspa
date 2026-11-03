# Dotazníky srovnávače zdravotních pojišťoven: znění pro všechny fáze

> Stav k 2. 11. 2026, verze sad 1 (zatím nic nebylo rozesláno). Zdroj pravdy je `05_M1_Starter/data/pojistovny-otazky.json`; tento dokument je jeho čitelná podoba a text otázek v něm se s JSON shoduje doslova (hlídá `tests/zp-dotaznik.test.js`). Změna znění = změna JSON, zvýšení `verze` sady a záznam v `changelog`. Navazuje na `09_Srovnavac_pojistoven_plan.md`, `docs/metodika-srovnavac-pojistoven.md` (§ 2 oblasti, § 3 stavy, § 4 férovost, § 7 dotazníky) a `05_M1_Starter/PLAN-SROVNAVAC-POJISTOVEN.md` § 2.7.

## Přehled

| Fáze | Sada | Respondent | Kanál | Otázek |
|---|---|---|---|---|
| prosinec 2026 (po schválení kritérií na PS 12. 11. 2026) | `aplikace-privetivost` | IT expert redakce; hodnotí každou ze 7 aplikací zvlášť, pojišťovna list nevyplňuje | `interni` | 8 |
| kolo 1 · leden 2027 | `fond-prevence` | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web` | 7 |
| kolo 1 · leden 2027 (spolu s fondem prevence) | `pobocky-definice` | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web` | 4 |
| kolo 1 · leden 2027 (spolu s fondem prevence) | `dostupnost-prechody` | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web` | 4 |
| Q1 2027 (s NAPO) | `napo-pacientske-organizace` | pacientské organizace (členské organizace NAPO); odpovídá organizace za své členy, ne jednotlivec | `web-token` | 16 |
| po návrhu verdiktů · březen 2027 | `pravo-na-odpoved` | zdravotní pojišťovna, které se návrh hodnocení týká | `dopis+web` | 3 |
| kolo 2 · Q2 2027 | `rizikovi-pojistenci` | zdravotní pojišťovny (všech 7, adresný odkaz s tokenem) | `web-token` | 14 |
| od zveřejnění stránky (průběžně) | `pojistenci-anketa` | veřejnost, pojištěnci všech pojišťoven; bez tokenu a bez registrace | `web-verejnost` | 8 |

Znění všech sad je v plném rozsahu i na webu: `pojistovny-gramotnost.html` → blok **Návrh dotazníků** (číslované 1–7 v pořadí fází, každá sada má kotvu `#dotaznik-<id>`; renderuje `otazkySadyHtml` v `src/pojistovny-prevence.js` přímo z JSON, takže web i tento dokument říkají totéž).

## Zásady pro všechny sady

- **Pojišťovna je partner i předmět hodnocení.** Otázky jsou věcné, bez hodnoticích přívlastků a bez domněnek o motivech (GOVERNANCE § 2). Ptáme se na to, co jde doložit, ne na názor.
- **Stejná otázka, stejný den, stejný formát** pro všech sedm pojišťoven (metodika § 4 bod 2). Lhůta 15 dnů odpovídá zákonu č. 106/1999 Sb.; právo na odpověď má 10 dní.
- **Formát odpovědi je v otázce.** Roky, jednotky (tis. Kč, počet unikátních osob), datum stavu (31. 12.) a sloupce tabulky. Nápověda (`napoveda`) u otázky říká, co musí odpověď obsahovat, aby dostala stav `dolozeno`; formulář ji ukazuje pod otázkou.
- **Žádné osobní údaje.** U adresných sad je respondentem instituce; veřejná anketa nemá volný text kromě krátkého upřesnění a nic, co by identifikovalo člověka. Zveřejňují se jen souhrny od tří odpovědí (metodika § 7).
- **Kanály** (`kanal`): `web-token` (osobní odkaz `pojistovny-gramotnost.html?dotaznik=<sada>&token=<token>`), `web-verejnost` (bez tokenu), `dopis+web` (dopis s nabídkou spolupráce; odpověď písemně nebo přes odkaz), `interni` (vyplňuje redakce, web ani API ji nepřijmou).
- **Pole sady:** `id`, `nazev`, `verze`, `typ` (`otevrene` | `dotaznik`), `faze`, `respondent`, `kanal`, `uvod`, u pojišťoven `pravni_zaklad`, volitelně `povolene_respondenty`, a `vyhodnoceni` = `{oblasti[], vstup, pravidla[], vystup}`: jak se z odpovědí odvozuje stav semaforu (validuje `validate-pojistovny.js`; web ho ukazuje pod otázkami každé sady na stránce Metodika a semafor). **Pole otázky:** `id`, `text`, volitelně `moznosti` + `vyber` (`jeden` | `vice`), `napoveda`, `max_delka` (1–2 000; platí pro text odpovědi i upřesnění). V dotazníku musí otevřená otázka mít `max_delka`, aby šlo poznat záměr od chybějící nabídky.

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Klientský servis a informování)

_Vstup:_ Hodnoticí list IT experta: stupeň 0 / 1 / 2 u šesti kritérií K1–K6 pro každou ze sedmi aplikací, na stejném zařízení ve stejném týdnu.

1. Skóre aplikace = součet stupňů K1–K6 (0–12 bodů). Nehodnotí se dopad ani oblíbenost, jen zda funkce existuje a jak je použitelná; K6 (hodnocení v obchodech) se bere k datu testu a nezaokrouhluje.
2. Návrh stavu pro oblast Klientský servis: 9–12 bodů a žádné kritérium na stupni 0 = doloženo; 5–8 bodů, nebo 9+ s jedním kritériem na 0 = deklarováno (funkce jsou, ale s omezením); 0–4 body = nedoloženo. Pojišťovna bez veřejně dostupné aplikace, nebo která testovací přístup odmítne, = neodpověděla.
3. Stupeň se zapisuje jen s datem, verzí aplikace a zařízením (část Z); bez nich se test nepočítá a opakuje se.
4. Prahy i kritéria schvaluje pracovní skupina 12. 11. 2026; do té doby se stupně nezveřejňují.

_Výstup:_ Matice kritérií 7 × 6 a skóre na stránce Aplikace; po právu na odpověď (10 dní) návrh stavu v semaforu, oblast Klientský servis.

## 2. Leden 2027: kolo 1 (fond prevence, pobočky, dostupnost a přestupy)

Všechny tři sady jdou všem sedmi pojišťovnám v jednom dopise, týž den a ve stejném znění (metodika § 4 bod 2). Odpovídá se písemně (dokumenty jsou podkladem a zveřejňují se v plném znění) nebo přes formulář s tokenem. Před žádostí podle zákona č. 106/1999 Sb. je vždy dobrovolná nabídka spolupráce (§ 4 bod 3).

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Prevence s dopadem)

_Vstup:_ Odpovědi pojišťovny na sedm otázek fp1–fp7 (dopis a web, lhůta 15 dnů); každá odpověď se zveřejní v plném znění.

1. Každá otázka dostane vlastní stav: doloženo = odpověď obsahuje to, co žádá nápověda (čísla s rokem a jednotkou, metodika nebo odkaz na ni); deklarováno = pojišťovna tvrdí, že program má nebo měří, ale čísla ani metodiku nepředložila; nedoloženo = odpověď k věci nic neříká, nebo ji vlastní data pojišťovny (VZ, ZPP) vyvracejí.
2. Stav oblasti Prevence s dopadem = stav otázek o dopadu a efektivitě (fp4, fp6, fp7), ne průměr všech sedmi: pojišťovna může mít nejširší nabídku (fp1) a přesto deklarováno, pokud dopad neměří. fp1–fp3 a fp5 popisují nabídku a slouží ke kontextu, ne k verdiktu.
3. Pravidlo nejslabšího článku: když je fp4 nebo fp6 nedoloženo, oblast je nejvýš deklarováno. Doloženo vyžaduje fp4, fp6 i fp7 doloženo.
4. Výše fondu prevence ani počet programů nejsou kritériem (rozhodnutí PS 7. 10. 2026). Kč na pojištěnce se ukazují jen jako kontext, věkově standardizované, jakmile budou váhy.
5. Bez odpovědi do 15 dnů od doručení následuje žádost podle zákona 106 se stejným zněním; bez odpovědi ani na ni = neodpověděla (stav neutral, ne bad).

_Výstup:_ Tabulka 7 pojišťoven × 7 otázek se stavy, plné znění odpovědí (ingest/manual/pojistovny/odpovedi/), návrh verdiktu oblasti Prevence s dopadem; zveřejnění až po právu na odpověď.

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Klientský servis a informování)

_Vstup:_ Počty míst podle jednotné definice (přepážka, úřední hodiny ≥ 3 dny v týdnu, partnerská místa) k 31. 12. 2026 a CSV seznam míst s adresou a hodinami.

1. Srovnává se jen to, co je podle stejné definice: počet míst s osobní přepážkou (prepazky) a míst s úředními hodinami alespoň 3 dny v týdnu (uredni-hodiny). Čísla z webů pojišťoven („pobočky“, „kontaktní místa“, „klientská centra“) se nesrovnávají, protože každá pojišťovna počítá něco jiného.
2. Odvozené ukazatele: místa na 100 tisíc pojištěnců (kmen CRP k témuž datu) a pokrytí krajů (počet krajů, kde má pojišťovna aspoň jedno místo s úředními hodinami ≥ 3 dny). Oba se ukazují vedle sebe, bez pořadí a bez známky; regionální pojišťovna s hustou sítí ve dvou krajích není horší než celostátní s řidší.
3. Doloženo = čísla i CSV seznam (seznam-csv) s úředními hodinami; deklarováno = jen čísla bez seznamu, nebo seznam bez hodin; nedoloženo = odpověď bez čísel k definici; po lhůtě i po žádosti 106 = neodpověděla.
4. Seznam se jednou ročně kontroluje namátkou (5 adres na pojišťovnu proti webu); rozpor se zapíše do changelogu, verdikt se nemění bez práva na odpověď.

_Výstup:_ Tabulka míst podle definice a na 100 tisíc pojištěnců, mapa pokrytí krajů; vstup do oblasti Klientský servis (spolu s aplikacemi), ne samostatný verdikt.

### Dostupnost péče a přestupy pojištěnců (`dostupnost-prechody`)

| Kdy | Komu | Kanál | Lhůta | Co se zveřejní |
|---|---|---|---|---|
| kolo 1 · leden 2027 (spolu s fondem prevence) | zdravotní pojišťovny (všech 7, stejné znění týž den) | `dopis+web`: dopis + web s tokenem nebo písemná odpověď | 15 dnů (s kolem 1) | čísla k § 16, zajištění péče, odkaz na čekací doby a hrubé toky přestupů; aktualizace inventáře `data/pojistovny-dostupnost.json` |

Sada `dostupnost-prechody` · typ `otevrene` · verze 1 · 4 otázky · povolení respondenti: `pojistovna`

**Právní základ:** Dobrovolná nabídka spolupráce (metodika § 4 bod 3). Pokud do 15 dnů odpověď nepřijde, následuje žádost o informace podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, se stejným zněním otázek.

**Úvod pro respondenta:** Výroční zprávy neuvádějí počty žádostí podle § 16 zákona č. 48/1997 Sb., počty žádostí o zajištění péče podle odbornosti a kraje ani počty přestupů pojištěnců mezi pojišťovnami. Ptáme se všech sedmi pojišťoven ve stejný den na totéž a čísla zveřejníme s datem a vaším vysvětlením, vedle sebe a bez pořadí. Odpovězte prosím do 15 dnů spolu s otázkami k fondu prevence a k pobočkám.

1. **Kolik žádostí o úhradu podle § 16 zákona č. 48/1997 Sb. jste obdrželi v letech 2023, 2024 a 2025, jaký podíl z nich byl schválen (zcela nebo zčásti) a jaká byla medián doby od doručení žádosti do rozhodnutí ve dnech?** `par16` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: tabulka rok · počet žádostí · schváleno · zamítnuto · medián dnů, za každý ze tří let. Počet odvolání nebo náklady na léčiva podle § 16 samy o sobě počet žádostí nedokládají.

2. **Kolik žádostí pojištěnců o zajištění péče podle § 40 zákona č. 48/1997 Sb. (pojištěnec nenašel smluvního poskytovatele) jste obdrželi v letech 2024 a 2025, rozepsaných podle odbornosti a kraje, a u kolika z nich jste poskytovatele zajistili?** `zajisteni-pece` · _otevřená, nejvýš 2 000 znaků_

   > Doloženo: tabulka rok · odbornost · kraj · počet žádostí · počet zajištěných. Součet za odbornosti by měl odpovídat počtu uvedenému ve výroční zprávě; případný rozdíl prosíme vysvětlit.

3. **Zveřejňujete čekací nebo objednací doby na plánovanou péči (vlastní data, nebo odkazy na poskytovatele)? Pokud ano, uveďte prosím odkaz, rozsah výkonů, metodu a datum poslední aktualizace.** `cekaci-doby` · _otevřená, nejvýš 1 000 znaků_

   > Doloženo: stálý odkaz a popis rozsahu a metody. Odkaz na weby jednotlivých nemocnic zapíšeme jako rozcestník, ne jako vlastní údaj pojišťovny.

4. **Kolik pojištěnců k 1. 1. a k 1. 7. v letech 2025 a 2026 k vám přešlo z jiných zdravotních pojišťoven a kolik od vás odešlo (počet příchozích a odchozích zvlášť, bez rozpisu podle pojišťoven)?** `prechody` · _otevřená, nejvýš 1 000 znaků_

   > Doloženo: čtyři údaje za rok · datum · příchozí · odchozí, s uvedením zdroje (CRP, evidence přihlášek). Čistou změnu stavu pojištěnců už známe z dat MZ; ptáme se na hrubé toky.

_Vstup:_ Odpovědi pojišťovny na čtyři otázky (dopis a web, lhůta 15 dnů); každá odpověď se zveřejní v plném znění.

1. Každá otázka dostane vlastní stav: doloženo = odpověď obsahuje to, co žádá nápověda (čísla s rokem a jednotkou, odkaz); deklarováno = pojišťovna tvrdí, že údaj má, ale čísla nepředložila; nedoloženo = odpověď k věci nic neříká, nebo ji vlastní data pojišťovny vyvracejí.
2. Počty se ukazují vedle sebe s datem a znění odpovědi, bez pořadí a bez součtu do indexu; různé definice (viz data/pojistovny-dostupnost.json, srovnatelnost) se nesrovnávají.
3. Otázka prechody je kontext pro oblast Hospodaření (pohyb pojištěnců), ne verdikt; otázky par16, zajisteni-pece a cekaci-doby jsou vstupem do oblasti Dostupnost, prahy čekají na schválení PS.
4. Bez odpovědi do 15 dnů od doručení následuje žádost podle zákona 106 se stejným zněním; bez odpovědi ani na ni = neodpověděla (stav neutral, ne bad).

_Výstup:_ Tabulka 7 pojišťoven × 4 otázky se stavy a plným zněním odpovědí; aktualizace inventáře data/pojistovny-dostupnost.json (stav ano nebo castecne tam, kde odpověď přinese veřejný údaj).

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Prevence s dopadem, Dostupnost a čekací doby, Síť a ohrožené oblasti, Kvalita ve smluvní politice, Klientský servis a informování, Hospodaření a transparentnost)

_Vstup:_ Hodnocení pacientských organizací (členů NAPO) na škále v šesti oblastech, vždy s pojišťovnou, ke které se vztahuje, a popis konkrétních zkušeností.

1. Za organizaci odpovídá organizace, ne jednotlivec; jedna organizace = jedna odpověď. Výsledky se počítají jako podíl odpovědí na každém stupni škály, zvlášť za oblast a za pojišťovnu.
2. Zveřejňují se jen souhrnné počty, a to od tří odpovědí na oblast a pojišťovnu (technické minimum proti dohledání respondenta); rozklad podle diagnózové oblasti až od pěti organizací.
3. Dotazník není verdikt: je to signál od pacientů, který se ukazuje vedle dat jako „pohled pacientských organizací“. Do semaforu nevstupuje přímo; opakovaně špatné hodnocení v oblasti otevře cílený dotaz pojišťovně (kolo 2) a zmíní se v návrhu verdiktu, ke kterému má pojišťovna právo na odpověď.
4. Volné texty (zkusenost) se nezveřejňují automaticky; redakce z nich může citovat jen se souhlasem organizace a bez údajů o konkrétním pacientovi.

_Výstup:_ Blok „Pohled pacientských organizací“ u každé oblasti (podíly na škále, počet organizací), seznam otevřených otázek pro kolo 2.

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Prevence s dopadem, Dostupnost a čekací doby, Síť a ohrožené oblasti, Kvalita ve smluvní politice, Klientský servis a informování, Hospodaření a transparentnost)

_Vstup:_ Stanovisko pojišťovny k návrhu verdiktů (oblasti, s nimiž nesouhlasí, doklady, text ke zveřejnění) do 10 dnů od doručení návrhu.

1. Stanovisko se zveřejní doslova a beze změn vedle verdiktu (pole stanovisko_pojistovny), i když s ním redakce nesouhlasí.
2. Doklady se posuzují stejnými pravidly jako původní odpověď: nový podklad, který splňuje nápovědu příslušné otázky, mění stav otázky i oblasti; názor bez podkladu stav nemění. Každá změna má záznam v changelogu s datem a důvodem.
3. Pokud pojišťovna do 10 dnů neodpoví, verdikt se zveřejní s poznámkou „bez stanoviska“; stanovisko doručené později se doplní a verdikt se případně přepočítá se stejným záznamem.
4. Verdikty schvaluje člověk (vydavatel, třída C); AI připravuje jen podklady a návrh.

_Výstup:_ Zveřejněný semafor s verdikty, stanovisky pojišťoven a changelogem; žádný verdikt bez proběhlé lhůty.

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Prevence s dopadem, Klientský servis a informování)

_Vstup:_ Odpovědi pojišťoven na 14 otázek v částech A–D (osobní odkaz, lhůta 15 dnů): identifikace rizikových skupin, oslovení a souhlas, měření výsledků, zdravotní gramotnost.

1. Části A a C vstupují do oblasti Prevence s dopadem: A je doloženo, když A5 uvádí počty k 31. 12. 2026 s kritériem zařazení pro skupiny z A1; C je doloženo, když C2 uvádí aspoň jeden výsledek s čísly u oslovených i ve srovnávací skupině. Zaškrtnuté možnosti bez A5 a C2 = deklarováno.
2. Část B se nehodnotí stupněm, ale kontrolou souladu: pojištěnec se musí mít jak dozvědět o zařazení a jak oslovování odmítnout (B3); chybějící odpověď na B3 se uvede jako otevřená otázka, ne jako verdikt (otázky souhlasu s profilováním řeší ÚOOÚ, ne srovnávač).
3. Část D vstupuje do oblasti Klientský servis: doloženo = materiály s odkazy, jazyky a nabídka pro 65+ dohledatelné na webu; deklarováno = zaškrtnuto bez odkazů; nedoloženo = nic k věci. D4 (spolupráce s pacientskými organizacemi) se křížově ověřuje s odpověďmi organizací v dotazníku NAPO.
4. Odpověď „rizikové skupiny aktivně nevyhledáváme“ v A1 není sama o sobě nedoloženo: je to doložený fakt, který se zveřejní. Nedoloženo je jen tvrzení bez podkladu.
5. Souhrnné počty za všechny pojišťovny se zveřejní od tří odpovědí; odpovědi jednotlivých pojišťoven v plném znění spolu s hodnocením po právu na odpověď.

_Výstup:_ Tabulka částí A–D × 7 pojišťoven se stavy, plné znění odpovědí, návrh doplnění verdiktů v oblastech Prevence s dopadem a Klientský servis.

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

**Vyhodnocení** (pole `vyhodnoceni`; oblast semaforu: Klientský servis a informování)

_Vstup:_ Odpovědi veřejnosti bez registrace: pojišťovna, důvod volby, co chybí, využití fondu prevence a aplikace, spokojenost; kraj a věk nepovinně.

1. Anketa není průzkum: respondenti se vybírají sami, takže se výsledky nepřepočítávají na populaci a neuvádí se jako „spokojenost pojištěnců pojišťovny X“. Ukazují se jako „co říkají respondenti ankety“ s počtem odpovědí.
2. Souhrny se zveřejňují od tří odpovědí na sadu (technické minimum); rozklad podle pojišťovny až od 30 odpovědí na pojišťovnu, podle kraje až od 30 na kraj (návrh prahu pro PS). Pod prahem se ukazuje jen celkový součet.
3. Do semaforu anketa nevstupuje. Otázka „co vám chybí“ slouží jako zdroj témat pro dotazy pojišťovnám a pro dotazník NAPO; otázka „spokojenost“ se ukazuje jen celkově a vedle doložených dat.
4. Ochrana proti opakování: nejvýš pět odeslání z jedné adresy za 10 minut, bez ukládání IP; podezřelé série (stejná kombinace odpovědí v krátkém sledu) redakce z agregátů vyřadí a zapíše do changelogu.

_Výstup:_ Souhrnné grafy na stránce Zdravotní gramotnost (podíly odpovědí, počet respondentů), seznam témat pro další kolo dotazů.

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
