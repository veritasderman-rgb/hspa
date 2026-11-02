# Síť poboček a smluvních odborností per zdravotní pojišťovna

_Stav k 2. 11. 2026. Rešerše a první datový prototyp na otázku vydavatele: „Jakou má která pojišťovna například síť poboček, dá se to zjistit a porovnat? Jakou má síť alergologů? Dermatologů? Atd.“ Navazuje na `05_M1_Starter/PLAN-SROVNAVAC-POJISTOVEN.md` (balíček P3.5) a `docs/metodika-srovnavac-pojistoven.md` § 2 (oblasti `dostupnost` a `sit`). Žádné UI._

## 1. Odpověď na otázku vydavatele

| Co | Dá se zjistit? | Jak spolehlivě |
|---|---|---|
| **Síť poboček** 7 ZP | **Ano, ale ne srovnatelně.** Každá ZP uvádí něco jiného (pobočka / jednatelství / expozitura / klientské centrum / podatelna) a čtyři ze sedmi ZP nemají strojově čitelný seznam. | Počty z webů 2026 se liší od hodnot v `pojistovny.json` až o 65 % (tab. 3). Srovnávat lze až po sjednocení definice a ručním spočtení; VZP a ZP MV ČR nelze z webu vyčíst vůbec (JS aplikace). |
| **Síť alergologů, dermatologů, praktiků, zubařů, psychiatrů, gynekologů** per ZP × kraj | **Ano jako odhad, ne jako fakt.** Otevřená data ÚZIS říkají, které zařízení (IČZ) má u které ZP smluvní příznak; odbornost se k němu doplní z NRPZS. | Horní odhad smluvních pracovišť, stav k 31. 12. 2024, nadhodnocuje u poliklinik a nemocnic. Dobré na hrubý obrázek (kdo má podstatně užší síť, kde), nevhodné na pořadí velkých ZP. |
| **Úvazky / počty lékařů** per ZP | **Ne** (jen VZP, jen od 2010; ostatní ZP až od 2023 a bez veřejného rozpadu). | Per ZP je veřejné jen u VZP (NR-02-05/06). Celkem za všechny ZP: NR-02-01/02. |
| **Čekací doby** per ZP | Ne z otevřených dat. | Jen dotazem na ZP / KZP (žádost podle zák. 106/1999). |

**Co z dat plyne (prototyp, ČR, odbornost = podíl míst NRPZS, na kterých má ZP smluvní IČZ):**

- Pět velkých ZP (111, 201, 205, 207, 211) má prakticky **stejně širokou síť**: u alergologie 60–69 % evidovaných míst, u dermatovenerologie 49–55 %, rozdíly mezi nimi jsou menší než chyba metody. Pořadí velkých ZP z těchto čísel **nevyvozovat**.
- **ZPŠ (209) a RBP (213) mají síť výrazně užší** a regionální: ZPŠ 22–36 % evidovaných míst, RBP 33–45 %. ZPŠ je nejhustší ve Středočeském, Libereckém a Královéhradeckém kraji, RBP v Moravskoslezském, Olomouckém, Zlínském a Jihomoravském (v Libereckém kraji 0 dermatologů). Odpovídá to geografii jejich kmene. Výjimka potvrzuje limit metody: v Praze vychází ZPŠ 96 ze 151 míst alergologie, pravděpodobně proto, že smlouva s velkou nemocnicí nebo poliklinikou se přenese na všechna její pracoviště (kap. 5, limit 1).
- Přepočet „na 100 tis. pojištěnců“ je u **odborností zavádějící** (kap. 6): VZP vychází 6,9 alergologa, ZPŠ 151, ačkoli oba mají ve skutečnosti podobnou síť. Správné jmenovatele jsou evidovaná místa (pokrytí) a obyvatelé / dojezd.

## 2. Zdroje smluvní sítě per pojišťovna × odbornost

Ověřeno živě 2. 11. 2026 (User-Agent `ZdraveCesko-HSPA/1.0`, max 1 req/s, přes proxy s CA bundle, TLS nevypnuto).

| Zdroj | HTTP | Formát / velikost | Licence | Aktualizace | Obsahuje ZP? | Lze spočítat „počet smluvních poskytovatelů odbornosti X pojišťovny Y v kraji Z“? |
|---|---|---|---|---|---|---|
| **NRPZS místa poskytování** `datanzis.uzis.gov.cz/data/NR-01-NRPZS/NR-01-06/…csv` | 200 | CSV, 28 482 156 B, 41 136 řádků, 49 sloupců; `-metadata.json` 200 (14 719 B) | volný přístup (data.gov.cz) | soubor 1. 11. 2026; popis „měsíčně“ | **Ne.** Žádný sloupec o pojišťovně ani smlouvě (jediná zmínka „pojišťov“ v celém souboru je 1 řádek v textu). Sloupce: IČO, adresa vč. RÚIAN a GPS, `ZZ_obor_pece` (textové názvy oborů čárkou, ne číselné kódy odborností), forma/druh/rozsah péče, kraj/okres. | **Ne.** Dá odbornost × kraj celkem (jmenovatel), ne ZP. |
| NRPZS web a API `nrpzs.uzis.cz` (`/`, `/api/doc`, `/api/v1/…`) | **503** (4× z 4, „connection timeout“) | – | – | – | – | Nelze ověřit; shoduje se s poznámkou v `ingest/config.js` (API nespolehlivé). |
| **ÚZIS NR-04-64 „Odvozený číselník IČZ dle údajů pojišťoven včetně historických hodnot“** (stránka `nzip.cz/data/2430-…`, soubor `data.mzcr.cz/data/distribuce/456/…historicke.csv`) | 200 | CSV, 68 232 103 B, 295 483 řádků, 28 sloupců | CC BY 4.0 | soubor z 9. 6. 2025 (data do 31. 12. 2024); deklarováno „čtvrtletně“, ve skutečnosti 17 měsíců stará | **Ano**: `CPO` (111/201/205/207/209/211/213), `ICZ`, `ICO`, **`smluvni_zarizeni` 0/1**, okres, PSČ, RÚIAN adresa, platnost záznamu od–do, počet vykázaných služeb, roky první/poslední služby | **Ano na úrovni zařízení (IČZ), ne odbornosti.** Odbornost patří k IČP (pracovišti), které číselník nenese. Doplňuje se spojením přes IČO + RÚIAN s NRPZS (přiřadí se ≈ 90 % smluvních IČZ, 59 % přesně na adresu). **Použito v prototypu.** |
| ÚZIS OIS-12-02 „Odvozený číselník IČZ v poslední dostupné verzi“ (`…/distribuce/457/…posledni-dostupne.csv`) | 200 | CSV, 14 454 699 B, 45 437 řádků, 16 sloupců | CC BY 4.0 | 9. 6. 2025 | **Ne** (bez `CPO`, bez smluvního příznaku) | Ne. Jen identifikace IČZ. |
| ÚZIS NR-02-01/02 (úvazky / počty zdravotníků podle „smluvního zajištění z veřejného zdravotního pojištění“, ČR/kraj/okres, odbornost pracoviště, kategorie, věk) | metodika PDF 200 | XLSX, 18,7 MB, edice 2024-01, 1× ročně | NZIP otevřená data | edice 2024-01 | **Ne per ZP**, jen „smluvní zajištění“ celkem | Úvazky odbornosti × kraj **celkem za všechny ZP** – dobrý jmenovatel, ne rozpad. |
| ÚZIS NR-02-05/06 (totéž jen pro **VZP**, od roku 2010) | metodika PDF 200 | XLSX, 12,4 MB, edice 2024-01 | NZIP | 1× ročně | Jen VZP (pro ostatní ZP jsou osobní data v NRHZS až od 2023) | Pro VZP: fyzické osoby odbornost × kraj × rok 2010–2024. Pro ostatní ZP ne. |
| NZIP „Datová podpora dohodovacího řízení“ (katalog repa: `ingest/mapping/nzip_dohodovaci_rizeni_catalog.json`, 44 sad) | – | XLSX | NZIP | 1–3 edice ročně | Per ZP jen **OIS 11-47** (pojištěnci), 11-05 (základní sazby), 11-24 (náklady ZP dle segmentů), 11-31, 11-32 (spektrum smluvně sjednané jednodenní péče, sloupce ZP 111…), 11-25 | **Počty smluvních poskytovatelů per ZP × odbornost ne.** **OIS 11-39 je „Data o referenční síti“ (DRG, nemocnice), ne síť poskytovatelů**; **OIS 11-20 je „Zátěž PLD“ (kapitace per okres), bez ZP**. Odkaz v metodice § 2 je nepřesný (kap. 7). |
| **VZP vyhledávač smluvních poskytovatelů** `www.vzp.cz/poskytovatele/vyhledavac` | 200 | HTML/JS aplikace; vrací IČ, IČZ, IČP, smluvní odbornost, adresu; mapa | neuvedena; export ani API neuvedeno | průběžně (spuštěn 3/2020) | Jen VZP | Technicky ano scrapingem aplikace (nedoporučeno, kap. 5). |
| VZP „Smlouvy s poskytovateli“ `…/smluvni-vztahy/smlouvy-s-poskytovateli-zdravotnich-sluzeb` | 200 | HTML portál (hledání podle názvu, územního pracoviště, segmentu, IČ/IČZ) | neuvedena | průběžně | Jen VZP | Jen po jednom poskytovateli, ne hromadně. |
| VZP číselník smluvních odborností č. 770 `media.vzpstatic.cz/…/smluvni-odbornosti-ciselnik-770-1-10-2010.zip` | 200 | ZIP 4 342 B, `ODBORN.770`, kódování CP852, 323 odborností | – | platný od 1. 10. 2010 | – | **Ověřeny kódy**: 001, 002, 014, 207, 305, 404, 603 (tab. 1). |
| VZP ročenka 2024 `media.vzpstatic.cz/…/rocenka-2024-tabulky.xlsx`; výroční zpráva 2024 | 200 / 200 | XLSX 2,08 MB (70 listů, mj. počty pracovišť IČP per odbornost); PDF 8,65 MB | VZP | 2025 | Jen VZP | Pro VZP počty pracovišť per odbornost (T 3.2…); VZ kap. 4.6 popisuje zónaci a „preferované oblasti“ (VZP PLUS), bez čísel per kraj. |
| Ostatní ZP (ČPZP, OZP, VoZP, RBP, ZPŠ, ZP MV ČR) – vyhledávač / seznam smluvních | – | **Nenalezen žádný strojově čitelný ani veřejně zdokumentovaný seznam** (rešerše 2. 11. 2026; OZP zmiňuje vyhledávač a aplikaci Atlas doktorů, URL se nepodařilo potvrdit; ČPZP nenalezeno) | – | – | – | Ne. Nejbližší krok viz kap. 5. |
| Zdravotně pojistné plány (příloha sněmovních tisků, ZPP 2026 = tisk 280) | 200 (zdroj repa) | PDF | veřejné | ročně | Ano, per ZP | Kdysi uváděly počty smluvních ambulantních zařízení per ZP a segment (VZP, 21. 1. 2016: stav k 31. 12. 2014, např. praktici pro dospělé VZP 5 396, ZPMV 4 590, ČPZP 4 326, OZP 4 366, VoZP 4 455, RBP 1 675, ZPŠ 645). **Zda ZPP 2026 tabulku stále mají, jsem neověřil.** Jen ČR, ne kraj. |
| KZP `kancelarzp.cz` | 200 (úvodní stránka) | – | – | – | – | Na úvodní stránce ani v hlavní navigaci jsem žádnou datovou sadu o síti nenašel. Další krok: žádost. |
| Nařízení vlády 307/2012 Sb. (zakonyprolidi.cz/cs/2012-307) | 200 | HTML | – | účinné od 1. 1. 2013 | – | Normativ, ne data (kap. 4). |

**Tab. 1 – ověřené kódy odborností (číselník VZP 770, platí pro všechny ZP).** 001 pracoviště praktického lékaře pro dospělé; 002 pro děti a dorost; **014 praktický zubní lékař** (ročenka VZP ho vede jako „klinická stomatologie, odbornost 014“); 207 alergologie a klinická imunologie; 305 psychiatrie; 404 dermatovenerologie (405 dětská, 406 korektivní); 603 gynekologie a porodnictví. Pozor na záměnu: 207 je zároveň kód pojišťovny OZP.

## 3. Pobočky: oficiální seznamy a rozdíl proti `pocet_pobocek`

Ověřeno 2. 11. 2026. Počty z webů jsou moje spočtení / citace stránky; **žádná ZP nenabízí JSON ani soubor ke stažení**.

| ZP | URL seznamu | HTTP | Formát | Počet na webu | Definice na webu | `servis.pocet_pobocek` v repu | Rozdíl |
|---|---|---|---|---|---|---|---|
| 111 VZP | `vzp.cz/kontakty/pobocky` (+ podstránky `/kontakty/pobocky/<město>`) | 200 | JS aplikace nad REST API `vsrezsy.vzp.cz` (nezdokumentované); detailní stránky nejsou v sitemapě | „téměř 200“ (VZP, 3/2026; od 1. 7. 2026 jen 2 regionální ředitelství místo 6) | klientské pracoviště / pobočka | null | nelze spočítat |
| 201 VoZP | `vozp.cz/kontakty#pobocky`, detail `/pobocky/<slug>` | 200 | HTML kartičky, filtr krajů | **51** = 7 poboček + 43 jednatelství + 1 ústředí | pobočka / jednatelství / ústředí | 7 (+ „40 jednatelství“) | 7 vs. 50 míst s přepážkou |
| 205 ČPZP | `cpzp.cz/pobocky?page=N`, detail `/pobocky/<id>` | 200 | HTML, 6 stran po 20 | **101** („Zobrazeno 1–20 z 101“) | vše „pobočka“ | 100 (VZ 2024), web 101 | sedí (+1) |
| 207 OZP | úvodní stránka `ozp.cz/` + `ozp.cz/objednavky/` | 200 | text s výčtem podle krajů, mapa | **45** („45 poboček po ČR“) | pobočka / expozitura / jednatelství / ředitelství / pracoviště | 13 (+ 30 expozitur) | 13 vs. 45 podle toho, co se počítá |
| 209 ZPŠ | `zpskoda.cz/kontakt` | 200 | HTML, 7 položek „Kontaktní místa“ | **7** | kontaktní místo | 7 | sedí |
| 211 ZP MV ČR | `zpmvcr.cz/pracoviste` (`/pobocky` přesměruje) | 200 | HTML + dynamický seznam; staticky vidět 9 míst (6 poboček Praha, Brno, Ostrava, Plzeň, Liberec, Olomouc) | „více než 90 klientských center“ | klientské centrum / kontaktní pracoviště (pošta, Polpoint, ePodání) / mobilní | null | nelze přesně spočítat; ~90 vs. 6 |
| 213 RBP | `rbp213.cz/pobocky/a-5372/` | 200 | HTML seznam, 65 položek (28 s označením „slouží jako podatelna“) | **~65** vč. podatelen | pobočka / podatelna | 39 (VZ 2024) | 39 vs. 65 |

**Co z toho plyne.** „Počet poboček“ není srovnatelné číslo: VoZP, OZP a ZP MV ČR počítají v jednom čísle různé kategorie (od regionálního ředitelství po poštovního partnera). Samotné rozdíly mezi webem a VZ (VoZP 7 vs. 51, OZP 13 vs. 45, RBP 39 vs. 65) jsou přitom větší než jakýkoli rozdíl mezi pojišťovnami, který by se dal číslem ukázat.

**Navržená jednotná definice (k odsouhlasení PS):** *„Místo s pravidelnými úředními hodinami pro veřejnost, kde pojištěnec vyřídí agendu osobně s pracovníkem pojišťovny (osobní přepážka)."* Nezapočítává se: ústředí bez přepážky pro veřejnost, podatelny a partnerská místa provozovaná třetí stranou (pošta, Polpoint, ePodání), mobilní a virtuální pobočky, schránky. Vykazovat se mají tři čísla, ne jedno: (a) místa s osobní přepážkou; (b) z toho regionální pobočky (plný servis); (c) partnerská místa zvlášť. Pro každé místo adresa a úřední hodiny (vzor: `data/pohotovosti.json`).

**Co jde stáhnout automaticky.** Server-renderovaný HTML seznam mají ČPZP (101, stránkování), VoZP (51, detaily), RBP (65) a částečně ZP MV ČR a ZPŠ: to je stejný druh zdroje jako `vzp_pohotovosti.js` (HTML, throttle, práh `MIN_EXPECTED`). OZP má výčet v textu, VZP nic strojového (REST API aplikace nezdokumentováno).

## 4. Normativní rámec: nařízení vlády 307/2012 Sb.

Čteno na zakonyprolidi.cz (verze 1, účinnost 1. 1. 2013); **před publikací ověřit proti Sbírce zákonů**, čtení nahradil jen nástroj pro shrnutí stránky.

- **Místní dostupnost** (příloha 1, ambulantní péče) se měří **dojezdovou dobou v minutách**, ne počtem poskytovatelů: praktický lékař pro dospělé, pro děti a dorost, zubní lékař, gynekologie a porodnictví **35 min**; psychiatrie, dermatovenerologie **60 min**; alergologie a klinická imunologie **90 min**.
- **Časová dostupnost** (příloha 2) jsou maximální lhůty pro plánované výkony, např. MR 5 týdnů, CT 3 týdny, kyčel/koleno 52 týdnů, katarakta 30 týdnů.
- Odpovědnost za zajištění nese **zdravotní pojišťovna** (§ 40 zák. 48/1997 Sb.; VZP to ve VZ 2024 kap. 4.6.1 uvádí jako prioritu smluvní politiky a zónace). Z toho plyne správná otázka pro srovnávač: **„Je v dojezdové normě od pojištěnce ZP Y smluvní pracoviště odbornosti X?“**, ne „kolik jich ZP má“.

## 5. Prototyp a jeho limity

`ingest/fetchers/pojistovny-sit.js` → `data/pojistovny-sit.json` (v0.1-prototyp), validátor `validateSit()` na konci `ingest/validate-pojistovny.js`, testy `tests/pojistovny-sit.test.js`. Běh 2. 11. 2026: stažení NRPZS (28 MB) a číselníku IČZ (68 MB), 41 136 míst, 152 178 smluvních IČZ, výstup 22 kB. Cache v `ingest/cache/` (gitignored).

**Metoda.** (1) Z NR-04-64 poslední záznam IČZ se `smluvni_zarizeni`=1 a platností k 31. 12. 2024. (2) Párování IČZ → místo NRPZS: IČO + RÚIAN adresa (přesné), jinak IČO + okres, jinak IČO s jediným místem; zbytek „nepřiřazeno“ (9–15 % IČZ podle ZP, vykázáno v `kvalita`). (3) Obor NRPZS → kód odbornosti VZP 770. (4) Místo se každé ZP počítá nejvýše jednou. Výstup: `matice[ZP][odbornost][kraj]` a `celkem_cr[odbornost][kraj]` (všechna evidovaná místa bez ohledu na smlouvu).

**Čeho se to týká a čeho ne** – čtěte před jakýmkoli použitím:

1. **Zařízení, ne odbornost.** Smlouva je na pracoviště a odbornost (IČP). Číselník nese jen IČZ. U ordinace jednoho lékaře sedí, u poliklinik a nemocnic je výsledek **horní odhad**.
2. **Zastaralost.** Číselník je z června 2025 (stav 31. 12. 2024) a ÚZIS ho deklarovaně čtvrtletně neobnovuje. Pokud ÚZIS nevydá novou verzi, data stárnou.
3. **Chybí smlouvy po 2024, nesmluvní příznak je tak, jak ho předala ZP** (ÚZIS upozorňuje, že u ZP mimo VZP není historie před 2018 věrná).
4. **Nepřiřazeno 9–15 %** smluvních IČZ (viz `kvalita`); nejhorší je OZP (207), kde jen 16 % přes adresu.
5. **Registr je širší než síť.** NRPZS zahrnuje i poskytovatele bez jakékoli smlouvy (soukromá estetická dermatologie, samoplátci), proto ani u nejširší sítě nevychází 100 %.
6. **Soulad s `GOVERNANCE.md`:** § 2 bod 2 – číslo má primární strojově dohledatelný zdroj (ÚZIS, CC BY 4.0) a postup jde zopakovat; § 6 bod 1 – metoda a limity se musí zobrazit vedle čísla; § 2 bod 5 / § 6 bod 3 – číselník obsahuje jména fyzických osob (OSVČ lékaři); do repa ani na web proto jdou **jen agregáty po krajích**, nikdy řádky s IČO/názvem.
7. **Třída změny** (`GOVERNANCE.md` § 3): data, dokument a validátor jsou B; **zařazení fetcheru do cronu je C** (konfigurace nasazení / workflows). Dokud není, soubor `data/pojistovny-sit.json` je jednorázový prototyp s `stav: "prototyp"` a na web nejde.

**Pokud se nic dalšího nedá:** nejbližší krok je **žádost o datovou sadu** podle zák. 106/1999 na ÚZIS (`analyzy@uzis.cz`): NRHZS agregát *počet pracovišť (IČP) × odbornost pracoviště × kraj × ZP × smluvní příznak* za poslední uzavřený rok. ÚZIS to má (odbornost pracoviště používá v NR-02-05/06 i v 11-32), jde jen o jeho zveřejnění. Paralelně dotaz KZP a sedmi ZP na „počet smluvních pracovišť odbornosti X k 31. 12. 2025 per kraj“ (vzor: kolo 1 žádostí, `data/zadosti-106.json`).

**Scraping vyhledávačů ZP nedoporučuji.** VZP vyhledávač je JS aplikace bez dokumentovaného API, ostatní ZP vyhledávač nenabízejí nebo ho nelze potvrdit; chybí licence, výstup obsahuje jména lékařů (osobní údaje, § 6 bod 3), data nejsou verzovaná (nešlo by doložit „stav k datu“, § 2 bod 2) a snadno se změní bez varování. U poboček je naopak scraping server-renderovaných HTML seznamů (ČPZP, VoZP, RBP, ZPŠ) přijatelný: veřejné adresy firem, žádné osobní údaje, stejný vzor jako `vzp_pohotovosti.js`; VZP a OZP vyžadují ruční zápis podle jednotné definice.

## 6. Návrh indikátorů pro oblasti `sit` a `dostupnost`

Primární není „počet na pojištěnce“. Příklad z prototypu (ČR, 2024, místa na 100 tis. pojištěnců dané ZP): dermatovenerologie VZP **9,3**, ČPZP 40,4, OZP 67,0, ZPŠ **163,0**, RBP 81,2. Čísla by suggerovala, že ZPŠ má 17× hustší síť než VZP. Ve skutečnosti mají všechny ZP skoro celostátní síť a jmenovatel (kmen pojištěnců) jen určuje velikost čísla. Proto:

| Indikátor | Definice | Proč | Zdroj / stav |
|---|---|---|---|
| `sit_<odb>_pokryti` | podíl evidovaných míst odbornosti v kraji (NRPZS), na nichž má ZP smluvní IČZ; per ZP × kraj | férově ukazuje, kde je síť užší, bez závislosti na velikosti kmene | prototyp `matice / celkem_cr`; ČR: alergologie VZP 69 %, RBP 45 %, ZPŠ 36 % |
| `sit_<odb>_pod_normativem_podil_krajů` | podíl krajů, kde < X % pojištěnců ZP bydlí v dojezdu normy 307/2012 (35/60/90 min) od nejbližšího smluvního pracoviště odbornosti | řeší přímo normu, kterou ZP musí plnit; **hlavní indikátor oblasti `dostupnost`** | vyžaduje GPS míst (NRPZS `ZZ_GPS`), `obce-gps.json`, pojištěnce po obcích (CRP po okresech) a dojezd (vzor `dojezdy.json` pohotovostí); dosud nepostaveno |
| `sit_<odb>_na_100k_obyvatel_kraje` | smluvní pracoviště ZP v kraji / 100 tis. obyvatel kraje (ČSÚ) | srovnání krajů uvnitř jedné ZP, ne mezi ZP | ČSÚ + prototyp |
| `pobocky_osobni_prepazka` | počet míst s osobní přepážkou podle jednotné definice (kap. 3) | srovnatelné číslo místo `pocet_pobocek` | ruční zápis + HTML scraping, kap. 3 |
| `pobocky_na_100k_pojistencu` | totéž / 100 tis. pojištěnců (OIS 11-47) | zde **dává smysl** (pobočka slouží vlastním pojištěncům) | po definici |
| `pobocky_okresy_bez_mista` | počet okresů bez místa s přepážkou | geografické pokrytí | po definici a adresách |

**Férovost a vymezení.** `09_Srovnavac_pojistoven_plan.md` § 1 říká, že projekt **není** hodnocení vztahu pojišťovna–nemocnice a PS chtěla síť jen pro **nedostatkové regiony**. Doporučené vymezení:

1. Měří se **dostupnost pro pojištěnce**, ne kvalita smluv ani úhrady: otázka zní „může pojištěnec ZP Y v oblasti Z využít smluvního poskytovatele odbornosti X v dojezdové normě?“. Nikdy „ZP Y nasmlouvala málo“ (smlouvu uzavírají dvě strany; poskytovatel může smlouvu odmítnout nebo nežádat).
2. Zobrazují se **jen regiony se zhoršenou dostupností** (kraje nebo okresy, kde je norma 307/2012 překročena u kterékoli ZP nebo které ZP samy označují jako preferované: VZP publikuje seznam preferovaných oblastí, VZ 2024 kap. 4.6.1), ne žebříček ZP v celé ČR.
3. U velkých ZP se rozdíly menší než chyba metody (kap. 1) **neukazují**. Pořadí jen s intervalem nejistoty, nebo vůbec ne. Zobrazuje se stav k datu zdroje a metoda vedle čísla.
4. Žádné verdikty z těchto dat bez kola 1 a práva na odpověď (`PLAN-SROVNAVAC-POJISTOVEN.md` § 1, bod 6: AI nepíše verdikty).

## 7. Doporučené kroky

1. **Opravit odkaz v metodice § 2** (řádek `sit`): „NRHZS (OIS 11-39), OIS 11-20“ → NR-04-64 (číselník IČZ per ZP), NRPZS, NR-02-01/02/05/06, norma 307/2012 Sb.; OIS 11-39 je referenční síť DRG a OIS 11-20 zátěž PLD. (Metodiku jsem nezměnil, patří PS.)
2. Žádost o datovou sadu na ÚZIS a dotaz KZP a ZP (kap. 5).
3. Rozhodnutí PS o definici „pobočky“ (kap. 3) a o vymezení na nedostatkové regiony (kap. 6).
4. Pokud PS řekne ano: dojezdový indikátor (balíček P3.5b), po definici adresy poboček z HTML.
5. Kdyby ÚZIS dataset přestal vycházet, prototyp zastarává: cron zapnout až po přijetí kroku 2 (třída C).
