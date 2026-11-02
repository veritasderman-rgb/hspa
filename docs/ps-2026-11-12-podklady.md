# Podklady pro pracovní skupinu 12. 11. 2026 — Srovnávač zdravotních pojišťoven

_Připraveno 2. 11. 2026 jako podklad k rozhodnutí. Každý bod má: o čem se rozhoduje, co je dnes v repu, doporučení redakce, a co se po rozhodnutí změní v datech (soubor a pole). Nic z toho není rozhodnuto; dokud PS nerozhodne, web ukazuje „návrh“._

## 0. Co PS uvidí na webu (stav k 2. 11. 2026)

Sedm podstránek srovnávače (`pojistovny.html` a `pojistovny-*.html`, pod heslem): přehled, kmen a hospodaření (včetně standardizace nákladů indexem z přerozdělení MZ, metodika § 4.2), prevence (stupeň nabídky s viditelným důvodem u každé buňky), aplikace (matice 10 funkcí, návrh 6 kritérií přívětivosti), zdravotní gramotnost (návrh dotazníků 1–7), metodika a semafor (prázdný semafor, návrh dotazníků s vyhodnocovací metodikou), indikátory a data (kdo je u koho pojištěn, stížnosti z VZ, audit otevřených dat). Dotazníky ukládají odpovědi do databáze (Neon), zatím 0 odpovědí.

## 1. Definice pobočky

**Rozhoduje se:** co se počítá jako pobočka, aby byla čísla sedmi pojišťoven srovnatelná.

**Dnes:** weby i výroční zprávy počítají každá něco jiného (VoZP 7 poboček vs. 51 míst, OZP 13 vs. 45, RBP 39 vs. 65; VZP a ZP MV ČR nejde z webu spočítat vůbec), viz `docs/pojistovny-sit.md` kap. 3. Návrh definice je už ve znění dotazníku 3 (`pobocky-definice`): *místo s pravidelnými úředními hodinami pro veřejnost, kde pojištěnec vyřídí agendu osobně s pracovníkem pojišťovny (osobní přepážka)*; nepatří sem ústředí bez přepážky, podatelna, partnerské místo třetí strany (pošta, Polpoint, ePodání), mobilní ani virtuální pobočka. Vykazují se tři čísla zvlášť (přepážky, z toho s úředními hodinami ≥ 3 dny v týdnu, partnerská místa) a CSV seznam míst.

**Doporučení:** schválit definici beze změny; doplnit jen, zda se „úřední hodiny alespoň 3 dny v týdnu“ počítají jako 3 × min. 4 hodiny (navrhujeme ano). Na webu se do odpovědí nezobrazuje žádný počet poboček jako srovnání, jen věta, že čísla nejsou srovnatelná.

**Po rozhodnutí:** text v `data/pojistovny-otazky.json` (sada `pobocky-definice`, `uvod`) se případně upraví a sada dostane `verze: "2"`; `docs/pojistovny-dotazniky.md` se přegeneruje.

## 2. Žádost na ÚZIS o síť smluvních poskytovatelů podle odbornosti a pojišťovny (§ 106)

**Rozhoduje se:** zda redakce pošle ÚZIS žádost o informace podle zákona č. 106/1999 Sb.

**Dnes:** síť per pojišťovna × odbornost × kraj je jen horní odhad (číselník IČZ NR-04-64 × NRPZS, stav 31. 12. 2024; `data/pojistovny-sit.json`, `docs/pojistovny-sit.md`). Smlouva se uzavírá na pracoviště (IČP) a odbornost, ta ale v otevřených datech chybí. ÚZIS tyto údaje v NRHZS má.

**Doporučení:** poslat; souběžně požádat o totéž pojišťovny v kole 1 (nabídka spolupráce). Návrh znění:

> Věc: Žádost o poskytnutí informace podle zákona č. 106/1999 Sb.
>
> Žádáme o poskytnutí agregovaných údajů z Národního registru hrazených zdravotních služeb: počet smluvních pracovišť (IČP) s platnou smlouvou k 31. 12. 2025, v členění podle zdravotní pojišťovny (kód 111, 201, 205, 207, 209, 211, 213), odbornosti pracoviště podle číselníku odborností (alespoň 001, 002, 014, 207, 305, 404, 603) a kraje sídla pracoviště (CZ-NUTS 3). Dále počet přepočtených úvazků nositelů výkonů v témže členění, pokud je registr eviduje. Údaje žádáme ve strojově čitelné podobě (CSV). Jde o agregáty bez osobních údajů; využijeme je ve veřejném nekomerčním srovnávači zdravotních pojišťoven s uvedením ÚZIS jako zdroje.

Vzor průvodního dopisu a tón: `docs/dopis-instituce-data.md`. Evidence: po odeslání záznam do `data/zadosti-106.json` (typ `zadost-106`, `odeslano`, lhůta 15 dnů).

## 3. Kritéria přívětivosti aplikací a prahy K6

**Rozhoduje se:** šest kritérií K1–K6 (BankID, přístupnost 65+, offline průkaz, připomínky prevence, podpora v aplikaci, hodnocení v obchodech) a stupně 0/1/2; u K6 prahy.

**Dnes:** kritéria a testovací postup jsou ve znění sady `aplikace-privetivost` (`data/pojistovny-otazky.json`, `docs/pojistovny-dotazniky.md` § 1). Návrh prahů K6: 2 = průměr alespoň 4,0 v App Storu i Google Play; 1 = nižší z obou průměrů 3,0–3,9; 0 = pod 3,0 nebo aplikace v jednom obchodě chybí; při méně než 50 hodnoceních nejvýš stupeň 1. Vyhodnocení do semaforu (návrh v `vyhodnoceni` sady): 9–12 bodů bez nuly = doloženo, 5–8 = deklarováno, 0–4 = nedoloženo.

**Doporučení:** schválit kritéria; u K6 zvážit, zda hodnocení v obchodech vůbec patří do semaforu (měří spokojenost, ne funkci) — redakce navrhuje nechat ho v matici, ale do součtu pro semafor nezapočítat (součet pak 0–10, prahy 8–10 / 4–7 / 0–3).

**Po rozhodnutí:** `data/pojistovny-aplikace.json` → `kriteria_privetivosti.stav: "schvaleno"` a datum; test IT experta v prosinci 2026; stupně se zapíší do `aplikace[].kriteria`.

## 4. Kontakt na redakci v úvodech dotazníků

**Rozhoduje se:** jaký kontakt (e-mail, osoba) se uvede v průvodním dopise a v úvodu sad.

**Dnes:** úvody říkají „kontakt na redakci je v průvodním dopise“, dopis kontakt nemá (`docs/pojistovny-dotazniky.md`, oddíl Průvodní dopis).

**Doporučení:** jedna společná adresa redakce (ne osobní), stejná pro všechny sady; do úvodu sad ji nedávat (zůstává v dopise), aby se nemusely zvyšovat verze sad.

**Po rozhodnutí:** doplnit do `docs/pojistovny-dotazniky.md` (průvodní dopis) a do `scripts/dotaznik-token.js` (text e-mailu s odkazem).

## 5. Výchozí dotazník na stránce Zdravotní gramotnost a okruh respondentů

**Rozhoduje se:** který dotazník vidí návštěvník stránky bez osobního odkazu, a kdo smí odpovídat na adresné sady.

**Dnes (změna navržená v tomto podkladu, lze vrátit jedním řádkem):** bez tokenu se zobrazuje veřejná anketa `pojistenci-anketa`; sady `fond-prevence` a `rizikovi-pojistenci` mají `povolene_respondenty: ["pojistovna"]`, takže API odmítne odpověď od jiného typu respondenta i s tokenem. Osobní odkaz `pojistovny-gramotnost.html?dotaznik=rizikovi-pojistenci&token=…` funguje beze změny.

**Doporučení:** schválit. Dříve byla výchozí sada `rizikovi-pojistenci`, která bez tokenu nejde odeslat, takže návštěvník viděl formulář, který nemohl použít.

## 6. Prahy ve vyhodnocení dotazníků (přehled k odsouhlasení)

| Sada | Oblast semaforu | Co rozhoduje o stavu | Práh označený jako návrh |
|---|---|---|---|
| fond-prevence | Prevence s dopadem | otázky fp4, fp6, fp7 (dopad, efektivita, vyhodnocování), pravidlo nejslabšího článku | – |
| aplikace-privetivost | Klientský servis | součet stupňů K1–K6 | 9–12 doloženo, 5–8 deklarováno, 0–4 nedoloženo |
| pobocky-definice | Klientský servis | čísla + CSV seznam s hodinami | – |
| rizikovi-pojistenci | Prevence s dopadem, Klientský servis | A5 (počty k 31. 12. 2026), C2 (výsledek s čísly), D (odkazy) | – |
| napo-pacientske-organizace | signál, ne verdikt | souhrny od 3 organizací na oblast a pojišťovnu | 3 (technické minimum), rozklad podle diagnóz od 5 |
| pojistenci-anketa | signál, ne verdikt | souhrny od 3 odpovědí | rozklad podle pojišťovny a kraje od 30 |
| pravo-na-odpoved | všechny | stanovisko doslova, nové podklady mění stav | 10 dní |

Plné znění: `docs/pojistovny-dotazniky.md`, blok Vyhodnocení u každé sady; na webu Metodika a semafor → Návrh dotazníků.

## 7. Co PS nerozhoduje, ale má vědět

- Standardizace nákladů na pojištěnce používá index nákladovosti kmene z měsíčního přerozdělení MZ (metodika § 4.2), protože MZ nákladové indexy věkových skupin pro rok 2024 nezveřejnilo (§ 20c zákona č. 592/1992 Sb.). Odborná skupina (Advance, FBMI ČVUT) má potvrdit, zda je to přijatelná náhrada do vydání sady ÚZIS 5.3.
- Žádná ze sedmi pojišťoven nepublikuje otevřená data s licencí ani v NKOD; VZP a ČPZP zveřejňují produkční tabulky v XLSX. Podrobně na stránce Indikátory a data.
- Stížnosti na dostupnost péče uvádějí ve výročních zprávách jen čtyři pojišťovny a každá jinak; jednotná definice podání je otázka pro kolo 1 nebo žádost 106 (stránka Indikátory a data, blok stížností).
