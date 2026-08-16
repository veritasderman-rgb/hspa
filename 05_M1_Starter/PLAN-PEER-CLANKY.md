# PEER — cross-check kapitoly 1.4 a plán 8 článků

Podklad k dokumentu **PEER: Hospodářská strategie** (Pirátská expertní ekonomická rada),
kapitola **1.4 Zdraví a soběstačnost přinesou silnější ekonomiku**.

Dvě části:

- **[A] Cross-check** — co v argumentaci sedí, co nesedí, kde je metodická past a co v kapitole chybí.
- **[B] Osm návrhů článků**, které jednotlivé návrhy PEER podpírají daty z tohoto dashboardu.

Stav: **podklad k rozhodnutí**, žádný článek zatím nevznikl.

---

## 0. Poznámka k pozici webu (jednou a dál už ne)

HSPA Monitor stojí na tom, že je **datový, ne stranický**. Články, které by byly
označkované jako „podpora programu strany", tuhle pozici spotřebují — a spotřebují ji
i pro všech 238 článků, které tu už jsou.

Funkční varianta je jiná a přitom vede ke stejnému výsledku: psát o **konkrétních
opatřeních** (cukerná daň, krátké intervence, přesun péče z lůžek, bonus za životní styl)
poctivě na datech, včetně toho, co pro ně nemluví. Opatření, která mají evidenci, z toho
vyjdou silnější — a citovatelná i pro toho, kdo je navrhuje. Osm návrhů níže je psáno
takhle. Kdo si je chce vzít jako munici, může; článek přitom obstojí i před tím, kdo
s PEER nesouhlasí.

Zbytek dokumentu tuhle věc už neřeší.

---

# [A] CROSS-CHECK KAPITOLY 1.4

Ověřováno proti `data/indicators.json` (190 indikátorů), proti korpusu článků
(238 článků, z toho ~30 přímo k tématu) a proti primárním zdrojům (Eurostat, ČSÚ SHA,
NERV, MGI). Značení: ✅ sedí · ⚠️ nesedí nebo zastaralé · 🔶 sedí, ale je to metodicky
napadnutelné.

## A1. Co sedí a je to použitelné

| Tvrzení PEER | Ověření |
|---|---|
| „jedna z nejnižších měr proočkovanosti seniorů" | ✅ Chřipka 65+: **24,5 %** (ČR) vs. **49 %** (EU), cíl WHO/ECDC 75 %. Pneumokoky 65+: **5 %**. Klíšťová encefalitida: 17 % při nejvyšší incidenci v EU. Indikátory `vakcinace_chripka_65`, `vakcinace_pneumokok_65`. |
| „vysoká míra kouření, nadváhy a konzumace alkoholu" | ✅ Alkohol **10,6 l** čistého lihu na osobu 15+ vs. OECD 8,4. Nadváha+obezita dospělých **60 %** vs. EU 52,7. Jaterní mortalita o **43 %** nad evropským průměrem. |
| „v nemocnicích poskytujeme více péče než zbytek Evropy" | ✅ Hospitalizovanost **17 990 / 100 tis.** obyvatel — nejvyšší v OECD (OECD 14 600). Průměrná délka akutní hospitalizace 7,0 dne vs. OECD 6,5. Odvratitelné hospitalizace (ACSC) 580 vs. OECD 473. |
| „neúměrně vysoký počet kontaktů pacienta s lékařem" | ✅ Doloženo, ČR patří k nejvyšším v OECD. |
| „složka pojistného placeného zaměstnavateli patří mezi nejvyšší" | ✅ 9 % zaměstnavatel + 4,5 % zaměstnanec; celkové zdanění práce u nízkých příjmů skutečně v čele OECD. |
| Struktura financování ~85 % veřejné / 15 % soukromé | ✅ Konzistentní s `platba_z_kapsy_pct` = 13,6 % (EU 15, OECD 18). |
| Připojištění 0,7 % vs. EU 4,4 % | ✅ Odpovídá SHA HF.2.1; ČR má prakticky nulový trh dobrovolného připojištění. |
| Neformální pečující 250–300 tis. | ✅ Sedí pro definici „pečující o příjemce příspěvku na péči". K odhadu „až milion" viz A3. |
| Deinstitucionalizace: ~15 tis. lidí ve velkých zařízeních, terénní kapacity 5–10 % | ✅ Sedí s analýzou JDI (duben 2026), kterou sami citují. |
| Poměr úvazků 48 tis. pobytové / 12 tis. terénní / 4 tis. ambulantní | ✅ Sedí. Zároveň je to nejsilnější číslo celé sociální části a v textu je schované až v odrážce (viz A5). |
| Částečné úvazky ze 7 % na 15 % | ✅ ČR ~7,6 % (Eurostat 2024) vs. EU ~17 %. Cíl je ambiciózní, ale ne nereálný. |

## A2. Co nesedí — opravit před publikací

### ⚠️ 1. Tabulka „Mezinárodní srovnání: zdraví" míchá dvě různé časové řady

Toto je nejzávažnější nález. Tabulka uvádí:

| | ČR | EU | „Nejlepší v EU (Švédsko)" |
|---|---|---|---|
| HLY muži | 61,2 | 63,5 | ~71,0 |
| HLY ženy | 62,4 | 64,2 | ~72,7 |

Problémy:

- **Švédské hodnoty jsou z roku 2020, tedy z jiné metodiky.** Eurostat v roce 2021
  revidoval otázku GALI v EU-SILC. Švédsko po revizi spadlo z 73,3 na **66,2** roku.
  Postavit vedle sebe české číslo po revizi a švédské před revizí **nafukuje mezeru
  o 5–6 let**. Kdokoli si to ověří v `hlth_hlye`, srazí tím celou tabulku — a s ní
  i důvěryhodnost cíle „+5 let".
- **Čísla za ČR i EU jsou zastaralá.** Aktuální vlna (Eurostat `hlth_hlye`, staženo
  12. 8. 2026, rok **2024**): ČR **62,4** roku při narození, EU27 **65,2**, rozdíl
  **−2,8 roku**. Hodnota 62,4 v tabulce PEER je označena jako „ženy", ve skutečnosti
  odpovídá českému průměru obou pohlaví.
- **Naděje dožití je také posunutá.** ČR 2024: celkem **80,1**, ženy **83,0**
  (EU 81,5 / 84,1). PEER uvádí muži 76,9 / ženy 82,8.

**Oprava:** celou tabulku přepočítat na jednu vlnu (2024) a jeden dataset. Mezera vůči EU
je −2,8 roku a je to dost silné číslo samo o sobě: **Česko ztrácí na zdravých letech
dvakrát víc než na letech samotných** (−2,8 vs. −1,4). To je lepší argument než nafouknuté
srovnání se Švédskem, protože přežije ověření.

### ⚠️ 2. „~14 % HDP / ~700 mld Kč" — dvojice, která si navzájem odporuje

Obojí pochází ze studie **McKinsey Global Institute z června 2021** na datech ~2019.
Při tehdejším HDP (~5 750 mld Kč) 700 mld ≈ 12 %. Při dnešním HDP (~8 300 mld Kč) by
14 % bylo **~1 160 mld Kč**, ne 700.

**Oprava:** buď „~700 mld Kč (MGI 2021, cenová hladina 2019)", nebo přepočíst na dnešek
a uvést jedno číslo. Uvádět obě zároveň bez data znamená, že jedno z nich je vždy špatně.

### ⚠️ 3. „Potenciál dodatečného HDP do roku 2040: ~840 mld Kč / +0,7 %" — dvě různé veličiny v jedné buňce

840 mld Kč je **hladinový** efekt (o kolik vyšší HDP v roce 2040), +0,7 % je **tempo**
(o kolik rychleji ročně). 840 mld je zhruba 10 % dnešního HDP, ne 0,7 %. Tabulka to
slepuje lomítkem, jako by šlo o totéž.

**Oprava:** rozdělit na dva řádky s jednotkami („úroveň HDP v roce 2040 vyšší o…" ×
„roční tempo růstu vyšší o … p.b.").

### ⚠️ 4. „Návratnost až 10 : 1 (*Lancet*)"

Poměr 10 : 1 (resp. 14 : 1) pro intervence veřejného zdraví pochází z **Masters et al.,
*Journal of Epidemiology and Community Health* 2017**, ne z Lancetu. Špatná citace
u čísla, které je nejlákavější k převzetí do médií.

**Oprava:** doplnit správný zdroj, nebo číslo vypustit — argument stojí i bez něj.

### ⚠️ 5. „inspirujeme se Nizozemskem" u pojistného navázaného na životní styl

**Nizozemsko tohle nedělá a zákon mu to zakazuje.** Zorgverzekeringswet stojí na
*verbod op premiedifferentiatie*: každý pojištěnec téhož pojistitele platí u téže smlouvy
stejné nominální pojistné bez ohledu na věk, pohlaví a zdravotní stav, doplněné
akceptační povinností a systémem risk-adjustmentu. Diferenciace pojistného podle chování
je přesně to, co nizozemský model **vylučuje**.

Země, která má, co PEER popisuje, je **Německo** — *Bonusprogramme* podle § 65a SGB V.
Ale ta neváže pojistné: nabízí bonus (věcný nebo peněžní, zákonem limitovaný) za doložené
preventivní a pohybové aktivity nad rámec pojistného, které zůstává jednotné.

**Oprava:** přepsat na Německo a přeformulovat nástroj z „nižší pojistné" na „bonus
z Fondu prevence". Detaily proč v A4 — tohle není jen chybná citace, je to nejzranitelnější
místo celé kapitoly.

### ⚠️ 6. „počet lidí 80+ se v následujících 15–20 letech více než zdvojnásobí"

Podle střední varianty projekce ČSÚ (2023–2100) roste skupina 80+ z ~450 tis. (2024) na
~750 tis. kolem roku 2040 (+65 %) a zdvojnásobení nastává až kolem přelomu 40. a 50. let,
tedy za **~23–25 let**, ne za 15–20. Formulace „více než zdvojnásobí" v 15letém horizontu
je rychlejší než projekce.

**Oprava:** „do roku 2040 vzroste o dvě třetiny, do poloviny století se zdvojnásobí."
Slabší formulace, ale ověřitelná — a pro argument stačí.

## A3. Metodické pasti — číslo je obhajitelné, ale rámování je napadnutelné

### 🔶 1. „46,5 % rozpočtu na nemocniční péči vs. 36,4 % v EU27" a cíl −10 p.b. do 2035

Toto číslo se **nepodařilo ukotvit v žádné standardní klasifikaci**:

| Metrika | ČR | Srovnání | Zdroj |
|---|---|---|---|
| Podíl výdajů **zdravotních pojišťoven** na lůžkovou péči | 55,9 % | EU ~32 % | `podil_vydaje_luzkova_pece` |
| Podíl **nemocnic (HP.1)** na celkových výdajích na zdravotnictví (SHA) | ~40 % | OECD ~36 % | ČSÚ Zdravotnické účty 2024 |
| **PEER** | 46,5 % | EU27 36,4 % | NERV 2024 (dle Eurostatu) |

Na metrice, kterou má tento dashboard ověřenou (SHA, poskytovatelé), je mezera
**~4 p.b.**, ne 10. Cíl „−10 p.b. do 2035" je tedy zakotvený v čísle, které může být
mimo o **faktor dva** — podle toho, jaká klasifikace se použije.

Druhá past je horší: SHA zařazuje **ambulantní péči poskytovanou v nemocnici** pod
poskytovatele HP.1. Cíl formulovaný jako „podíl nemocniční péče" jde proto splnit
**přeúčtováním** — převedením nemocničních ambulancí na samostatné právní subjekty —
aniž by se v systému cokoli změnilo. Cíl, který lze splnit účetně, není cíl.

**Oprava:** cíl přeformulovat na věcnou veličinu, kterou nelze přeúčtovat —
hospitalizovanost na 100 tis. obyvatel (dnes 17 990, OECD 14 600) nebo podíl výkonů
provedených jako jednodenní chirurgie. Číslo 46,5 % ponechat jako ilustraci s přesnou
definicí a odkazem na stranu v NERV.

### 🔶 2. „denně přes 182 tisíc lidí v pracovní neschopnosti"

Číslo je správné, ale jako důkaz **nemocnosti** nefunguje: skok roku 2024 je z velké části
**legislativní**, ne zdravotní — od 1. 1. 2024 vstoupily do nemocenského pojištění dohody
(DPP/DPČ) a naplno se projevila e-neschopenka. Roste tak evidovaná, ne prožitá nemocnost.
Oponent tohle vytáhne během jedné věty.

**Oprava:** buď použít **procento** dočasné pracovní neschopnosti (4,5 %) s explicitní
poznámkou o zlomu řady, nebo argument nahradit letitou strukturální veličinou
(např. ztracené roky v produktivním věku, kde má PEER vlastní číslo 62 %).

### 🔶 3. „250–300 tisíc pečujících, podle některých odhadů až jeden milion"

Rozpětí 250 tis. → 1 mil. není nejistota měření, ale **dvě různé definice**: příjemci
příspěvku na péči a jejich pečující × sebehlášená péče o blízkého v šetřeních typu
SHARE/EU-SILC (zahrnuje i občasnou výpomoc). Uvedené vedle sebe bez vysvětlení vypadají
jako by autoři nevěděli.

**Oprava:** dvě čísla, dvě definice, jedna věta ke každé.

### 🔶 4. „8,6 % HDP" v kapitole chybí — a je to riziko

PEER staví na tom, že „mechanismus přidávat přes odvody je vyčerpaný". Jenže ČR vydává na
zdravotnictví **8,6 % HDP proti EU 10,4 %**. Oponent to použije obráceně: *systém není
předražený, je poddimenzovaný, a vy ho chcete škrtat.*

**Toto číslo v kapitole být musí** — ne proto, že podpírá, ale proto, že se bez odpovědi
na něj argumentace neobejde. Odpověď existuje a je silná: nejde o to, kolik dáváme, ale
že u výsledků (léčitelná mortalita, HLY) jsme hůř, než odpovídá i těm 8,6 %.

## A4. Vnitřní rozpor — bonus za životní styl vs. vlastní závěr kapitoly

Kapitola v sekci „Co nám to přinese?" sama píše:

> **Spravedlivější přístup ke zdraví** — dnes jsou zdravotní rizika silně sociálně
> podmíněná (PAQ Research, SYRI, studie HBSC ukazují, že u dětí z chudších rodin
> začíná nerovnost u obezity a končí u depresí).

O dvě stránky dřív ale navrhuje navázat **část pojistného** na doložitelnou péči
o vlastní zdraví. Když jsou rizikové chování a zdravotní stav sociálně podmíněné,
je bonus/malus podle chování **transferem od chudších k bohatším** — tedy přesným opakem
věty výše. Tenhle rozpor je v jednom dokumentu a najde ho každý oponent.

K tomu se přidávají tři další problémy:

1. **Právní.** Pojistné na veřejné zdravotní pojištění je veřejnoprávní dávka, ne cena
   za produkt. Jeho diferenciace podle chování naráží na čl. 31 Listiny a na princip
   rovnosti; jako minimum by to vyžadovalo změnu zákona 592/1992 Sb. a obstát před ÚS.
   Dokument s tím nepočítá.
2. **Evidenční.** Nejlepší dostupná evidence o programech odměňujících životní styl —
   randomizované studie (Illinois Workplace Wellness Study, BJ's Wholesale Club) — nachází
   **prakticky nulový efekt** na zdravotní ukazatele a náklady; mění se hlavně to, kdo se
   přihlásí (selekce zdravějších).
3. **Formulační.** „Zavedeme **pilotně a povinně** jen pro ročníky do 40 let" je vnitřně
   sporné (pilot je dobrovolný nebo omezený, ne povinný) a věková hranice zakládá další
   otázku rovného zacházení.

**Doporučení:** neškrtat, ale **přesunout nástroj** — místo diferenciace pojistného
posílit **Fond prevence** (kam ostatně sami směrují 40 % výnosu z cukerné daně) a nastavit
mu jednotný, zákonem vymezený katalog plnění po vzoru německého § 65a SGB V. Získají tím
prakticky totéž chování systému, bez ústavního rizika, bez rozporu s vlastním závěrem
a s reálnou mezinárodní předlohou. Viz **návrh článku č. 7**, který je přesně o tomhle.

## A5. Co v kapitole chybí — nejsilnější nepoužité argumenty

Toto jsou data, která PEER podpírají a která v textu **nejsou**. Každé z nich je
zároveň námět článku.

1. **Léčitelná mortalita.** ČR ztrácí o **~25 % víc** životů, kterým šlo zabránit léčbou,
   než je evropský průměr. To je nejpřímější dostupný důkaz, že problém není jen v penězích,
   ale ve výsledcích — přesně teze kapitoly. V textu není ani jednou.
2. **Regionální nerovnost.** Rozdíl v naději dožití mezi kraji jde do let; rozdíl podle
   vzdělání u mužů je **13 let** (EU 7). PEER přitom v kapitole 1.3 staví celý argument
   o exekucích na Ústecku a Karlovarsku. Zdravotní kapitola tuhle spojnici nevyužije,
   ačkoli jde o stejné okresy a stejné lidi.
3. **Duševní zdraví — úplně chybí.** Ani zmínka, přestože: psychiatrická hospitalizace
   trvá **43 dní** (OECD 19), center duševního zdraví je **0,37 / 100 tis.** (EU ~1,
   reforma slibovala 100, funguje ~40), dětské psychiatrické hospitalizace se za deset let
   zdvojnásobily a výdaje na duševní zdraví jsou 4 % vs. EU 7 %. Pro kapitolu o *ztrátě
   produktivity* je to nevysvětlitelná mezera — duševní onemocnění jsou v produktivním
   věku hlavní příčinou ztracených let.
4. **Screeningy.** Prevence je v kapitole postavená na krátkých intervencích a daních.
   Účast na onkologických screeningech — konkrétní, měřitelná, s hotovou infrastrukturou —
   se neobjeví. Přitom je to nejrychlejší cesta k „záchytu dřív".
5. **Léková politika.** Výdaje na léčiva **1,7 % HDP vs. EU 1,4 %**, polypragmazie
   u **46,6 %** seniorů 65+, každý sedmý senior dlouhodobě na benzodiazepinech
   (Německo každý sedmnáctý). Úsporový i kvalitativní potenciál, který kapitola míjí.
6. **Gender pay gap ve zdravotnictví: 24,9 %** (EU 17,4) — nejhorší sektor v ČR.
   Kapitola 1.3 staví na mzdové mezeře žen; zdravotnictví je přitom její extrém a zároveň
   obor, kde PEER chce nabírat tisíce lidí. Ty dvě kapitoly spolu nemluví.

---

# [B] OSM NÁVRHŮ ČLÁNKŮ

Každý návrh: jaký návrh PEER podpírá · teze · co v repu už je · indikátory · riziko.
Řazeno podle přínosu, ne podle pořadí v dokumentu.

---

### 1. Cíl „+5 let ve zdraví" potřebuje metr, který nejde ohnout

**Podpírá:** ústřední cíl kapitoly.
**Rubrika:** `populace` · **Linie:** Žít déle ve zdraví

**Teze.** Cíl je správný a je to nejlepší věc v celé kapitole — ale je zatím
neměřitelný. Eurostat letos v monitoringu SDG **vyměnil ukazatel**: dosavadní *Healthy
Life Years* (otázka na omezení v běžných činnostech) nahradil zdravou délkou života
podle *subjektivního zdraví*. Rozdíl pro českého seniora je **6,6 roku**, u novorozence
**11,4 roku**. Cíl „+5 let během jedné generace" tak lze splnit i tím, že se změní
otázka v dotazníku. Článek cíl nezpochybňuje — ukotvuje ho: jeden dataset (`hlth_hlye`),
jeden výchozí rok, jedno číslo, proti kterému se to za dvacet let změří.

**V repu:** `clanek-zdrave-roky-dve-metriky.html` (draft, 13. 8. 2026) — celá metodická
část hotová. **Doplnit:** převod na politický cíl a co z toho plyne pro formulaci
v programech.

**Indikátory:** `nadeje_doziti_zdravi_65`, `nadeje_doziti_total`, `subjektivni_zdravi`

**Riziko:** článek zároveň opravuje tabulku PEER (viz A2.1). Je to služba, ne útok —
ale je dobré to vědět předem.

---

### 2. Nemocnice na 56 procent: proč přesun péče z lůžek není škrt

**Podpírá:** návrh 2 — „Přesuneme péči z lůžek", −10 p.b. do 2035.
**Rubrika:** `financovani` · **Linie:** Platíme za objem, ne za výsledek

**Teze.** Česko drží nemocniční kapacitu, kterou z velké části nevyužívá — **akutní lůžka
jsou obsazena z 56 %** — a přitom hospitalizuje **nejvíc v OECD** (17 990 / 100 tis. vs.
14 600). To není spor o to, jestli zavřít nemocnice. Je to spor o to, co se v nich dělá:
**580 odvratitelných hospitalizací na 100 tis.** (OECD 473) jsou lidé, které jinde zvládne
ambulance. Článek ukazuje, kde konkrétně ten přesun jde — a férově i tu podmínku, kterou
sám PEER uvádí: bez kapacit na druhé straně se úspora jen přesune jinam.

Součástí je metodická poznámka o číslech 40 / 46,5 / 55,9 % (viz A3.1) a doporučení
navázat cíl na hospitalizovanost, ne na účetní podíl.

**V repu:** `prazdna-luzka-efektivita` (publ.), `hospitalizujeme-nejvic` (publ.),
`vyhnutelne-hospitalizace`, `financovani-sha` (publ., ověřená SHA 2024).

**Indikátory:** `hospitalizace_na_100k`, `podil_vydaje_luzkova_pece`,
`hospitalizace_acsc`, `prumerna_delka_hospitalizace`

---

### 3. Odvratitelná úmrtí: nejsilnější argument, který PEER nepoužil

**Podpírá:** celou linii „efektivita" — a odpovídá na námitku „8,6 % HDP je málo".
**Rubrika:** `klinika` · **Linie:** Dostat péči včas

**Teze.** Debata o zdravotnictví se vede v miliardách. Existuje ale ukazatel, který měří,
co za ně systém skutečně dodá: **léčitelná mortalita** — úmrtí, kterým šlo zabránit včasnou
a kvalitní léčbou. Česko jich má **o čtvrtinu víc** než evropský průměr. To je odpověď na
nejsilnější námitku proti celé kapitole: ano, dáváme na zdravotnictví méně než EU
(8,6 vs. 10,4 % HDP) — ale ztrácíme víc, než i těm 8,6 % odpovídá. Problém není jen
v objemu peněz, ale v tom, co za ně systém dodá.

**V repu:** `lecitelna-mortalita` (publ.), `vydaje-zdravotnictvi` (publ.).

**Indikátory:** `lecitelna_mortalita`, `preventabilni_mortalita`, `vydaje_zdravotnictvi_hdp`

**Proč vysoko:** je to jediný článek ze série, který **doplňuje chybějící argument** místo
aby vylepšoval existující. Podle A5.1 je to největší nevyužitá munice v kapitole.

---

### 4. Prevence není razítko: co ve skutečnosti funguje

**Podpírá:** návrh 1 — úhrady lékařům za krátké intervence, ne za počet prohlídek.
**Rubrika:** `prevence` · **Linie:** Žít déle ve zdraví

**Teze.** Formulace PEER („preventivní prohlídka je vstupní bod a měření, ne cíl") je
věcně správná a stojí na dobré evidenci — **krátké intervence** u alkoholu a kouření patří
k nejlépe doloženým a nejlevnějším zásahům v medicíně vůbec (Cochrane, doporučení NERV).
Článek ukazuje, co konkrétně by musela úhradová vyhláška odměňovat, aby to nebyl další
signální výkon bez obsahu. A zároveň — férově — kde evidence naopak **chybí**: programy
odměňující „zdravý životní styl" obecně mají v randomizovaných studiích efekt blízký nule.
Ta hranice je pro návrh 1 dobrá zpráva a pro návrh 4 varování.

Kontext: Česko dává na prevenci **2,74 %** běžných výdajů proti OECD 3,2 %.

**V repu:** `vydaje-prevence` (publ.), `medikalizace-verejneho-zdravi` (publ.),
`reforma_primarni_pece_2027` (publ. — kapitace a P4P), krátké intervence zmíněné
v `jaterni-mortalita-alkohol` a `koureni-v-tehotenstvi`.

**Indikátory:** `vydaje_prevence_pct`, `alkohol_spotreba`, `bmi_dospeli`

---

### 5. Deset až patnáct miliard: co vydrží spočítat na cukerné a alkoholové dani

**Podpírá:** návrh 1 — spotřební daň ze slazených nápojů, zrušení výjimky u tichého vína,
40 % výnosu do Fondu prevence.
**Rubrika:** `legislativa` · **Linie:** Žít déle ve zdraví

**Teze.** Číslo „10–15 mld Kč/rok i po zohlednění poklesu spotřeby" je v dokumentu bez
výpočtu — a je to přesně ten typ údaje, který v rozpravě rozeberou první. Článek ho
rozebere sám, poctivě: kolik zhruba nese tiché víno, kolik SSB daň při různých sazbách,
jak velká je cenová elasticita, co se stalo v Mexiku a v Británii (kde levy vedla hlavně
k **přeformulování receptur**, ne k výběru — což je z hlediska zdraví lepší, ale z hlediska
rozpočtu horší). A hlavně: **regresivita**. Spotřební daň dopadá tvrději na nízké příjmy —
a právě proto je účelové vázání výnosu do prevence jediná odpověď, která tuhle námitku
skutečně vyvrací. To je argument, který PEER má, ale nerozvíjí.

**V repu:** série `napoje-1` až `napoje-6` (publ., 6 dílů — `napoje-6-dan-regulace` je
přímo o regulaci), `jaterni-mortalita-alkohol` (publ.), `alkohol-adolescenti` (draft).

**Indikátory:** `alkohol_spotreba`, `jaterni_mortalita`, `deti_obezita_cosi`

---

### 6. Nejlevnější nevyužitá kapacita v systému: očkování dospělých

**Podpírá:** návrhy 1 a 2 současně — prevence i odlehčení lůžkům.
**Rubrika:** `prevence` · **Linie:** Najít nemoc dřív

**Teze.** PEER zmiňuje nízkou proočkovanost seniorů jednou větou. Přitom je to jediné
opatření v celé kapitole, které je **hotové, hrazené a nevyužité**: chřipka 65+ **24,5 %**
proti cíli WHO/ECDC 75 %, pneumokoky 65+ **5 %**, klíšťová encefalitida **17 %** při
nejvyšší incidenci v EU. Vakcíny pojišťovny hradí. Chybí jen ruce a dostupnost — a novela
zákona o ochraně veřejného zdraví, která má očkování otevřít lékárníkům a zubařům, míří
na vládu s otevřeným rozporem s lékařskou komorou. Článek počítá, kolik hospitalizací
seniorů by proočkovanost na evropské úrovni ušetřila — čímž propojuje prevenční a
efektivitní linii kapitoly.

**V repu:** `vakcinace-pneumokok-seniori` (publ.), `klistova-encefalitida` (publ.),
`klistova-encefalitida-proockovanost-2026` (publ.), `ockovani-v-lekarnach` (draft —
aktuální legislativa).

**Indikátory:** `vakcinace_chripka_65`, `vakcinace_pneumokok_65`, `hospitalizace_acsc`

---

### 7. Kdo doplatí na bonus za zdravý životní styl

**Podpírá:** návrh 4 — tím, že ho **opraví**.
**Rubrika:** `financovani` · **Linie:** Platíme za objem, ne za výsledek

**Teze.** Toto je nejdůležitější článek z osmi. Návrh navázat část pojistného na
doložitelnou péči o vlastní zdraví má tři vady najednou a každá z nich sama stačí:
**Nizozemsko, na které se odkazuje, tohle zákonem zakazuje** (Zorgverzekeringswet stojí na
*verbod op premiedifferentiatie*). Randomizované studie programů odměňujících životní styl
nacházejí efekt **blízký nule** a hlavní pozorovaný jev je selekce zdravějších. A protože
je rizikové chování silně sociálně podmíněné — jak píše sám PEER o dvě stránky dál —
bonus/malus je transfer **od chudších k bohatším**.

Článek ale nekončí u kritiky. Existuje varianta, která dělá skoro totéž a stojí na reálné
předloze: německé **Bonusprogramme podle § 65a SGB V** — bonus z fondu prevence za doložené
aktivity, pojistné zůstává jednotné. Česko má Fondy prevence zdravotních pojišťoven už dnes,
jen bez jednotných pravidel a bez měření účinku. Cesta od záměru PEER k funkčnímu opatření
vede tudy, ne přes pojistné.

**V repu:** `presna-medicina-solidarita` (draft — hranice pojištění a osobní odpovědnost),
`narok-pojistence-1..4` (série, publ. — ústavní rozměr nároku),
`platba_za_vysledek_vzp` (publ.).

**Indikátory:** `platba_z_kapsy_pct`, `vydaje_prevence_pct`, `zdravotni_gramotnost_omezena`

**Riziko:** jediný z osmi, který návrh PEER přímo rozporuje. Zároveň jediný, který jim
může ušetřit prohranou debatu — návrh 4 je v současné podobě neobhajitelný a strhne
s sebou i zbytek kapitoly.

---

### 8. Sestra na pomezí: kde se celý plán láme

**Podpírá:** návrh 3 (terénní a odlehčovací služby, deinstitucionalizace) — a ukazuje,
proč návrhy 2 a 3 nelze dělat odděleně.
**Rubrika:** `dostupnost` · **Linie:** Dostat péči včas

**Teze.** PEER chce dvě věci současně: přesunout péči z lůžek do terénu a rozšířit terénní
a odlehčovací služby o 40–50 mld Kč. Obě potřebují **stejné lidi**. A ti nejsou:
proti **48 tisícům úvazků** v pobytových službách stojí **12 tisíc** v terénních a **4 tisíce**
v ambulantních. Sestra v ČR přitom bere **1,48násobek** průměrné mzdy — víc než v Německu
i Švédsku — a stejně chybí; problém tedy není jen mzdový. Článek ukazuje, že personál je
**vázající podmínka** celé kapitoly, ne položka vedle ní: pokud se plán nesekvencuje
(nejdřív ruce v terénu, teprve pak lůžka dolů), úspora ve zdravotnictví se jen přesune
do rodin — což kapitola sama správně popisuje jako to, čemu chce zabránit.

**V repu:** `platy-sester` (draft), `osetrovatelstvi_generacni_propast_2026` (publ.),
`dlouhodoba-pece-vydaje` (publ.), `luzka-dlouhodobe-pece` (publ.),
`neformalni-pecujici` (draft), `socialne_zdravotni_pomezi_2026` (publ.),
`reforma_dlouhodobe_pece_2026` (publ.).

**Indikátory:** `sestry_per_1000`, `luzka_dlouhodobe_pece_65plus`, `vydaje_dlouhodoba_pece_hdp`

---

## Bonus (mimo osmičku, kdyby byl prostor)

**9. Třináct let rozdílu.** Naděje dožití mužů se podle vzdělání liší o **13 let**
(EU 7). Ústecko a Karlovarsko — kraje, na kterých PEER staví celou argumentaci
o exekucích v kapitole 1.3 — jsou zároveň kraje s nejhorším zdravím. Článek spojuje
kapitolu 1.3 a 1.4 do jednoho argumentu: reforma exekucí je zdravotní politika a
zdravotní politika je regionální politika. Indikátor `nadeje_doziti_vzdelani_gap_muzi`.

**10. Chybějící kapitola: duševní zdraví.** 43 dní hospitalizace (OECD 19), 0,37 centra
duševního zdraví na 100 tis. (slíbeno 100, funguje ~40), 4 % výdajů vs. EU 7 %, zdvojnásobené
dětské hospitalizace. Pro kapitolu o ztracené produktivitě nevysvětlitelná mezera.

---

## Souhrn priorit

| # | Článek | Hodnota pro PEER | Náročnost |
|---|---|---|---|
| 7 | Bonus za životní styl | **kritická** — zachraňuje neobhajitelný návrh | střední |
| 1 | Metr pro „+5 let" | **vysoká** — ukotvuje ústřední cíl | nízká (draft hotov) |
| 3 | Odvratitelná úmrtí | **vysoká** — doplňuje chybějící argument | nízká |
| 2 | Nemocnice na 56 % | vysoká — nese návrh 2 | střední |
| 8 | Sestra na pomezí | vysoká — odhaluje vázající podmínku | střední |
| 5 | Cukerná a alkoholová daň | střední — brání napadnutelné číslo | vysoká (výpočet) |
| 6 | Očkování dospělých | střední — nejrychlejší konkrétní výsledek | nízká |
| 4 | Prevence není razítko | střední — nese návrh 1 | střední |

**Nejdřív 7, 1 a 3.** Sedmý článek řeší jedinou vadu, která může kapitole srazit vaz;
první a třetí jsou levné a přitom nejvíc mění, jak kapitola obstojí v rozpravě.
