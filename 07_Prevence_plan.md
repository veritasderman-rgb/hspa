# Plán nové sekce „Prevence / Co s tím můžu dělat já"

_Stav k 6. 5. 2026. Navazuje na `06_Plan_redesignu.md`, zejména P3.2 „Žít déle ve zdraví"._

## 1. Proč tato sekce patří do HSPA monitoru

Současný HSPA monitor dobře ukazuje, jak si vede zdravotnický systém: indikátory, strategie, vysvětlení mechanismů. Chybí mu ale **občanská vrstva**: co z toho plyne pro člověka, který nechce jen číst o systému, ale chce si přidat roky života ve zdraví.

Navrhovaná sekce nemá být strašení, moralizování ani individualizace všeho, co je ve skutečnosti systémový problém. Má být praktická a dospělá:

> Každý den děláme desítky malých rozhodnutí, která se v čase skládají. Co jíme, jestli jdeme ven, jestli kouříme, kolik pijeme, jestli zvedneme telefon přátelům, jak vedeme děti k pohybu, jak používáme obrazovky. Prevence není strach žít. Prevence je umět si život užít tak, aby nám a našim blízkým zůstalo co nejvíc let ve zdraví a pohodě.

Repo už má pro tuto sekci solidní základ:

- `05_M1_Starter/data/indicators.json` obsahuje preventivní indikátory: `kuractvi_denni`, `alkohol_spotreba`, `obezita_prevalence`, `bmi_dospeli`, `pohybova_aktivita_dospeli`, `pm25_expozice`, screeningy, sebevraždy, zdravé roky v 65 letech.
- `05_M1_Starter/data/strategies.json` obsahuje navazující strategie: `zdravi_2035`, `narodni_kvplan_2035`, onkologické screeningy, `bud_fit_24`, WHO NCD plán, mental health plán.
- `05_M1_Starter/src/styles.css` už má editorial komponenty `ed-hero`, `ed-flow`, `ed-story`, `ed-area`, které lze recyklovat.
- `06_Plan_redesignu.md` už navrhuje tematické linie, mimo jiné „Žít déle ve zdraví".

## 2. Nejdůležitější poznatky pro obsah

### 2.1 Jídlo: 3 až 5 rozhodnutí denně

Aktuální jádro doporučení je stabilní: nejde o jednu dietu, ale o vzorec stravování. WHO popisuje zdravou stravu přes přiměřenost, vyváženost, míru a pestrost. Prakticky to znamená hlavně více zeleniny, ovoce, luštěnin, celozrnných potravin, ořechů a přirozené vlákniny; méně soli, volných cukrů, nasycených tuků, trans-tuků a vysoce průmyslově zpracovaných potravin.

Použitelná čísla do UI:

- alespoň **400 g** ovoce a zeleniny denně pro osoby nad 10 let,
- alespoň **25 g** přirozené vlákniny denně pro osoby nad 10 let,
- volné cukry pod **10 % energie**, ideálně k 5 %,
- sůl pod **5 g denně**,
- nasycené tuky pod **10 % energie**, trans-tuky pod 1 %.

Český kontext: podle State of Health in the EU 2025 pro Česko přispívají behaviorální a environmentální rizika významně k mortalitě; u behaviorálních rizik měla špatná strava velký podíl, následovaná tabákem, alkoholem a nízkou pohybovou aktivitou.

### 2.2 Pohyb: jít, či nejít

WHO aktuálně uvádí, že pravidelný pohyb pomáhá v prevenci a zvládání kardiovaskulárních onemocnění, diabetu, některých nádorů, deprese a úzkosti. Základní dospělá norma je **150 až 300 minut středně intenzivní aktivity týdně** nebo 75 až 150 minut intenzivní aktivity, plus posilování hlavních svalových skupin aspoň 2 dny týdně. U starších lidí patří do prevence i rovnováha a prevence pádů.

Pro děti a dospívající je praktický překlad: **aspoň 60 minut denně středně až vyšší intenzity**; u menších dětí hodně volné hry. Český NZIP i WHO doporučení jsou v tomto konzistentní.

Český kontext: OECD Health at a Glance 2025 country note uvádí u Česka 27 % dospělých s nedostatečnou pohybovou aktivitou a PM2.5 expozici nad průměrem OECD.

### 2.3 Kouření a nikotin: žádný bezpečný tabák

WHO v roce 2025 uvádí, že tabák zabíjí až polovinu lidí, kteří ho užívají a nepřestali. Všechny formy tabáku jsou škodlivé a neexistuje bezpečná úroveň expozice. U e-cigaret je potřeba rozlišovat: pro část dospělých kuřáků mohou být méně škodlivou náhradou jen při úplném nahrazení cigaret, ale **nejsou bezpečné pro děti, mladé lidi ani nekuřáky**. CDC v roce 2025 upozorňuje, že nikotin škodí vývoji mozku adolescentů a může ovlivnit pozornost, učení, náladu a kontrolu impulzů.

### 2.4 Alkohol: méně je zdravotně bezpečnější

WHO fakt sheet k alkoholu z roku 2024 uvádí 2,6 milionu úmrtí globálně v roce 2019 v souvislosti s alkoholem. WHO Europe v roce 2025 znovu zdůrazňuje, že **ve vztahu k riziku rakoviny není bezpečná úroveň konzumace alkoholu**; alkohol způsobuje nejméně 7 typů rakoviny. CDC v lednu 2026 uvádí stejné praktické sdělení: riziko rakoviny snižujeme tím, že pijeme méně nebo vůbec.

Český kontext: OECD Health at a Glance 2025 country note uvádí spotřebu alkoholu v Česku **11,2 l čistého alkoholu na osobu 15+** proti průměru OECD 8,5 l.

### 2.5 Samota a vztahy: sociální zdraví je zdravotní téma

WHO Commission on Social Connection publikovala 30. 6. 2025 zprávu, která řadí sociální spojení mezi veřejně zdravotní priority. WHO uvádí, že **přibližně 1 z 6 lidí globálně zažívá osamělost** a odhaduje, že osamělost souvisí zhruba s 871 000 úmrtími ročně. Dopady se týkají mortality, kardiovaskulárních onemocnění, diabetu 2. typu, deprese a úzkosti.

### 2.6 Smysl života: ne jako slogan, ale jako rutina

Důkazy o „smyslu života" nejsou stejně přímočaré jako u kouření nebo alkoholu. Je poctivé ho formulovat jako faktor, který pomáhá udržet dlouhodobě zdravé rutiny, sociální vazby a psychickou odolnost. Studie z roku 2024 na čtyřech longitudinálních souborech starších dospělých našla asociaci mezi vyšším smyslem života a nižším rizikem pádů.

### 2.7 Prostředí, ve kterém vychováváme děti

Prevence není jen individuální vůle. Děti vyrůstají v prostředí, které buď zdravé volby usnadňuje, nebo sabotuje. WHO k dětskému environmentálnímu zdraví uvádí, že snížení environmentálních rizik by mohlo zabránit zhruba **1 ze 4 úmrtí dětí do 5 let**. WHO k městskému zdraví zdůrazňuje, že špatně navržená doprava a urbanismus zvyšují znečištění, hluk, zranění a bariéry pro bezpečný pohyb.

Český konkrétní hook: MZČR 2. 9. 2025 představilo novelu školního stravování s důrazem na pestrost, kvalitu surovin, méně cukru, soli a vysoce průmyslově zpracovaných potravin, s přechodem do 1. 9. 2026.

### 2.8 Digitální závislosti: nejde o paniku z technologií

HHS Surgeon General advisory 2023 říká opatrně, ale jasně: nelze uzavřít, že sociální média jsou pro děti a dospívající dostatečně bezpečná; jsou potřeba ochranná opatření. WHO rozpoznává **gaming disorder v ICD-11** pouze tehdy, kdy vzorec hraní vede k výraznému narušení osobního, rodinného, sociálního, školního nebo pracovního fungování. Tedy **ne každé hraní je diagnóza**. Problém nastává, když obrazovka vytlačí spánek, pohyb, reálné vztahy, školu, klid a samoregulaci.

WHO doporučení pro děti do 5 let: miminka bez obrazovek, pro 2 až 4 roky maximálně 1 hodina sedavého screen time denně.

### 2.9 Screeningy a preventivní prohlídky

Sekce by měla jasně oddělit životní styl od zdravotních služeb. Člověk nemůže sám nahradit systém, ale může využít to, co už existuje: **preventivní prohlídky, onkologické screeningy, očkování, kontrolu tlaku, cholesterolu, diabetu a zubní prevenci**. Repo už má screeningové indikátory a strategické vazby, proto je vhodné tuto část napojit přímo na existující karty.

## 3. Navržená informační architektura sekce

Navrhovaný název v navigaci:
- krátká verze: `Prevence`
- podtitulek v hero: `Co můžu udělat já`
- URL: `prevence.html`

**Hero headline:**

> Prevence není o tom bát se žít. Je to o tom, jak si přidat roky ve zdraví.

**Hero lead:**

> Naše budoucí zdraví neurčují jen geny a lékaři. Z velké části o něm rozhoduje to, co jíme, jak moc se hýbeme, jak spíme a koho máme kolem sebe. Tyto každodenní volby se sčítají. Zatímco zbytek HSPA monitoru ukazuje, jak si vede celý zdravotnický systém, tato sekce je o vás. Ukazuje, kde máte reálnou páku na to, abyste si život užili v co největší síle a pohodě.

### 3.1 Čtyřkrokový editorial flow

1. **Každodenní volby** — jídlo, pohyb, alkohol, nikotin, spánek; pointa: malé volby se sčítají
2. **Domácnost a děti** — školní jídlo, společné stolování, pohyb venku, screen pravidla, spánkový rytmus; pointa: děti kopírují prostředí, ne prezentace o zdraví
3. **Vztahy a komunita** — přátelé, rodina, klub, dobrovolnictví, KČT, sousedské vazby; pointa: sociální zdraví je zdravotní faktor
4. **Systém a prevence** — screeningy, očkování, dostupnost preventivní péče, urbanismus, školy, potravinové prostředí; pointa: osobní odpovědnost potřebuje prostředí, které zdravou volbu usnadní

### 3.2 Devět tematických karet

Každá karta má mít stejný kontrakt:

- `id`: stabilní slug pro detail routing (`prevence.html?id=...`) a validátor (např. `jidlo`, `pohyb`, `tabak_nikotin`, `alkohol`, `vztahy_samota`, `smysl_zivota`, `deti_prostredi`, `digitalni_zdravi`, `screening_preventivni_pece`)
- `title`: Jídlo / Pohyb / Tabák a nikotin / Alkohol / Vztahy a komunita / Smysl a psychická odolnost / Děti a prostředí / Digitální zdraví / Screeningy a prohlídky
- `daily_choice`: jedna věta o každodenním rozhodnutí
- `what_we_know`: 500 až 800 znaků evidence bez moralizování
- `try_this_week`: 3 praktické kroky na týden
- `hspa_indicators`: vazba na existující indikátory
- `strategies`: vazba na existující strategie
- `system_levers`: co má dělat stát, škola, obec, pojišťovna, zaměstnavatel
- `sources`: 2 až 5 primárních zdrojů
- `caveat`: jasné vymezení, kdy má člověk řešit věc s lékařem nebo odborníkem

**Spánek a regenerace** je důležité téma, ale pro MVP ho nenavrhujeme jako samostatnou kartu — jeho doporučení (digitální hygiena před spaním, pravidelný rytmus, vyhýbání se alkoholu pozdě večer) se přirozeně promítají do karet *Pohyb*, *Alkohol*, *Děti a prostředí* a *Digitální zdraví*. Po MVP ho lze povýšit na 10. kartu, jakmile budou dostupné indikátory `spanek_dospeli` / `spanek_adolescenti`.

### 3.3 MVP sada témat

| ID | Indikátory | Strategie |
|---|---|---|
| `jidlo` | `bmi_dospeli`, `obezita_prevalence`, `prevalence_diabetu`, `mortalita_kardiovaskularni`, `mortalita_onkologicka` | `zdravi_2035`, `bud_fit_24`, `who_ncd_action_plan` |
| `pohyb` | `pohybova_aktivita_dospeli`, `bmi_dospeli`, `obezita_prevalence`, `nadeje_doziti_zdravi_65`, `sebevrazdy_per_100k` | `zdravi_2035`, `bud_fit_24`, `who_ncd_action_plan` |
| `tabak_nikotin` | `kuractvi_denni`, `mortalita_kardiovaskularni`, `mortalita_onkologicka` | `zdravi_2035`, `who_ncd_action_plan` |
| `alkohol` | `alkohol_spotreba`, `mortalita_onkologicka`, `sebevrazdy_per_100k` | `zdravi_2035`, `who_ncd_action_plan` |
| `vztahy_samota` | `sebevrazdy_per_100k`, `nadeje_doziti_zdravi_65`, `pouzivani_antidepresiv` | `reforma_dusevni_zdravi`, `who_mental_health_action_plan` |
| `smysl_zivota` | `sebevrazdy_per_100k`, `nadeje_doziti_zdravi_65`, `multimorbidita_65plus` | `reforma_dusevni_zdravi`, `strategie_paliativni_2035` |
| `deti_prostredi` | `pm25_expozice`, `mortalita_kojenecka`, `vakcinace_mmr_deti`, `vakcinace_hpv`, `obezita_prevalence` | `zdravi_2035`, `bud_fit_24` |
| `digitalni_zdravi` | (chybí přímý indikátor) — provizorně `sebevrazdy_per_100k`, `pohybova_aktivita_dospeli`, `pouzivani_antidepresiv` | — |
| `screening_preventivni_pece` | `screening_kolorektalni`, `screening_mamograficky`, `screening_cervix`, `vakcinace_hpv`, `prohlidka_prakticky_lekar`, `kontrola_hypertenze` | `narodni_onkologicky_plan_2030`, `narodni_kvplan_2035` |

### 3.4 Copy pro MVP

#### 1. Jídlo: Třikrát denně volíme svou budoucnost

**what_we_know:**
> Talíř není morální test ani zkouška vůle. Je to zkrátka to nejčastější zdravotní rozhodnutí, které za den uděláme. Když si za základ jídla zvolíme zeleninu, luštěniny a celozrnné obiloviny, nedržíme dietu do plavek. Hlasujeme pro zdravé cévy, lepší krevní tlak a samostatnost ve stáří. Podle WHO není klíčem extrémní odpírání, ale celkový vzorec stravování: pestrost, přiměřenost a omezení vysoce průmyslově zpracovaných potravin.

**try_this_week:**
- Přidat kousek zeleniny nebo ovoce ke každému hlavnímu jídlu.
- Jednou denně vyměnit bílou přílohu za celozrnnou variantu nebo přidat luštěninu.
- Nekupovat domů slazené nápoje jako automatickou volbu.

#### 2. Pohyb: Jít, či nejít

**what_we_know:**
> Pohyb není trest za to, co jsme snědli. Je to základní údržba těla, které nás má nést ještě dvacet nebo třicet let. Dnešní procházka, schody místo výtahu, jízda na kole nebo chvíle s činkami rozhodují o tom, jestli v sedmdesáti letech vstaneme ze židle bez cizí pomoci. Pravidelná aktivita je jedním z nejsilnějších spojenců v prevenci kardiovaskulárních nemocí, diabetu i depresí.

**try_this_week:**
- Vyzkoušet pravidlo dvou pater: pokud jdete jen o jedno nebo dvě patra nahoru, vynechat výtah a vzít to po schodech.
- Spojit nutnou cestu s extra pohybem: zaparkovat o kousek dál nebo vystoupit o zastávku dřív.
- Při delším telefonování nezůstávat sedět, ale postavit se a procházet se po místnosti nebo venku.

#### 3. Tabák a nikotin: Žádná bezpečná dávka neexistuje

**what_we_know:**
> Největší zdravotní výhra v této oblasti není „kouřit méně stylově". Je to přestat úplně. Tabák škodí ve všech podobách a neexistuje u něj žádná bezpečná míra. Obzvlášť u dětí a dospívajících je pravidlo jednoduché: nikotin do vyvíjejícího se mozku nepatří. Může negativně ovlivnit paměť, učení, náladu i kontrolu impulzů.

**try_this_week:**
- Vybrat si jeden konkrétní den a zkusit odložit první ranní cigaretu nebo e-cigaretu o 30 minut.
- Zmapovat své spouštěče: sledovat, kdy po nikotinu sáháte automaticky, třeba při kávě, ve stresu nebo při čekání.
- Uložit si do telefonu číslo na Národní linku pro odvykání kouření: 800 350 000.

#### 4. Alkohol: Méně je vždy bezpečnější

**what_we_know:**
> V naší kultuře je pití alkoholu bráno jako samozřejmost, biologicky ale neutrální není. Cílem není zakazovat si radost, ale poctivě si přiznat fakta: čím méně alkoholu pijeme, tím menší je naše zdravotní riziko, včetně rizika vzniku mnoha typů rakoviny. Radost a relaxaci lze stavět i na večerech, kde není hlavní jednotkou počet vypitých sklenic.

**try_this_week:**
- Zavést pravidlo brzdy: ke každé sklence alkoholu automaticky vypít jednu velkou sklenici čisté vody.
- Vyhlásit si tento týden tři po sobě jdoucí dny úplně bez alkoholu.
- Nekupovat alkohol domů do zásoby. Co doma není, to si k večerní televizi nenalijete.

#### 5. Vztahy a komunita: Sociální kontakt jako lék

**what_we_know:**
> Zvednout telefon přátelům, vyrazit s někým ven nebo se přidat ke spolku není „jen společenská věc". Je to silná prevence. Samota a izolace mají na naše tělo tvrdé dopady. Kvalitní sociální vazby proto podle WHO patří do stejné zdravotní debaty, ve které řešíme tlak, cukr nebo cholesterol.

**try_this_week:**
- Zavolat, ne jen napsat, někomu blízkému, s kým jste déle nemluvili.
- Naplánovat si na víkend krátkou procházku nebo kávu s kamarádem či kolegou.
- Vědomě pozdravit a prohodit pár milých slov se sousedem, prodavačem nebo pošťákem. I letmý kontakt se počítá.

#### 6. Smysl života: Kotva v každodennosti

**what_we_know:**
> Smysl života není jen velký citát z motivační knížky. Často je to úplně obyčejný kalendář: komu dnes zavolám, komu pomůžu, kam půjdu a proč mi stojí za to ráno vstát. Udržování smysluplných rutin, vztahů a koníčků pomáhá držet psychickou odolnost a u starších lidí může souviset i s nižším rizikem pádů.

**try_this_week:**
- Položit si večer otázku: „Na co se zítra těším?" a najít aspoň jednu konkrétní drobnost.
- Vyhradit si tento týden 30 minut na činnost, kterou neděláte pro výkon ani pro peníze, ale protože vás baví a dává vám smysl.
- Nabídnout někomu ve svém okolí drobnou nevyžádanou pomoc.

#### 7. Děti a prostředí: Zdravá volba jako ta nejsnazší

**what_we_know:**
> Prevence u dětí nestojí jen na jejich pevné vůli. Děti přirozeně kopírují prostředí, ve kterém vyrůstají. Nejde o to, co všechno dítě „má vydržet". Jde o to, zda má ve škole jídlo, po kterém nepadne únavou, zda má bezpečné hřiště a cestu, po které může jít pěšky. A hlavně: zda má kolem sebe dospělé, kteří mu ukazují, že dobrý spánek a pohyb nejsou trest, ale normální součást života.

**try_this_week:**
- Položit doma nakrájené jablko nebo mrkev na stůl do zorného pole dětí.
- Uspořádat alespoň jednu společnou rodinnou večeři bez obrazovek na stole i v ruce.
- Nechat děti, ať samy naplánují jeden víkendový výlet, jehož součástí bude chůze nebo pobyt venku.

#### 8. Digitální zdraví: Technologie jako sluha, ne pán

**what_we_know:**
> Digitální zdraví neznamená návrat do jeskyní ani paniku z technologií. Je to schopnost určit hranici, kdy nám obrazovky slouží a kdy už si naopak berou náš spánek, pozornost, vztahy a čas na pohyb. Ochranná pravidla potřebují především děti, u kterých by čas u obrazovky neměl vytlačit volnou hru, kvalitní spánek a skutečný kontakt s lidmi.

**try_this_week:**
- Stanovit si zónu bez telefonu, například postel nebo jídelní stůl.
- Na zkoušku vypnout notifikace z aplikací, které nepotřebujete řešit okamžitě.
- Alespoň hodinu před spaním odložit obrazovky a místo toho číst, povídat si nebo poslouchat hudbu.

#### 9. Screeningy a prohlídky: Spojenec, kterého se vyplatí využít

**what_we_know:**
> Nejlepší nemoc je ta, která vůbec nevznikne. Druhá nejlepší je ta, kterou zachytíme včas. Zdravotní systém jako jednotlivci nenahradíme, ale můžeme naplno využít to, co nabízí: preventivní prohlídky, očkování a programy na včasný záchyt nádorů, vysokého tlaku, cholesterolu nebo diabetu.

**try_this_week:**
- Zkontrolovat si, kdy jste byli naposledy na preventivní prohlídce u praktického lékaře nebo zubaře.
- Vybrat jednu kontrolu či screening, které už dlouho odkládáte, a objednat se.
- Zjistit si, na jaká bezplatná preventivní vyšetření máte ve svém věku nárok.

## 4. Implementační plán

### Fáze 1: obsahový a datový kontrakt

Přidat nový soubor: `05_M1_Starter/data/prevention.json`

Navržený tvar:

```json
{
  "version": "2026-05-06",
  "generated_at": "2026-05-06T00:00:00Z",
  "hero": {
    "kicker": "Prevence / Co můžu udělat já",
    "headline": "Prevence není o tom bát se žít. Je to o tom, jak si přidat roky ve zdraví.",
    "lead": "Naše budoucí zdraví neurčují jen geny a lékaři..."
  },
  "themes": [
    {
      "id": "jidlo",
      "title": "Jídlo",
      "subtitle": "Třikrát denně volíme svou budoucnost.",
      "daily_choice": "Co bude základem talíře dnes?",
      "what_we_know": "Talíř není morální test...",
      "try_this_week": [...],
      "hspa_indicators": ["bmi_dospeli", "obezita_prevalence", "prevalence_diabetu"],
      "strategies": ["zdravi_2035", "bud_fit_24", "who_ncd_action_plan"],
      "system_levers": ["školní stravování", "cenová dostupnost zdravých potravin"],
      "sources": [{ "title": "WHO: Healthy diet", "url": "...", "accessed_at": "2026-05-06" }],
      "caveat": "Při diabetu, poruchách příjmu potravy..."
    }
  ]
}
```

### Fáze 2: nová stránka a render

Přidat:
- `05_M1_Starter/prevence.html`
- `05_M1_Starter/src/prevence.js`

`prevence.html` má recyklovat strukturu ze `jak-funguje.html` a `strategie.html`:
- stejný `topbar`, `masthead-strip`, `moduleNav`,
- `ed-hero`, `ed-flow`, grid témat, detail view přes `?id=...`.

`src/prevence.js`:
- importovat helpery z `page-shared.js`,
- načíst `data/prevention.json`, `data/indicators.json`, `data/strategies.json`,
- vykreslit hero stats z existujících indikátorů, 4 flow kroky, tematické karty, detail tématu s prokliky.

### Fáze 3: navigace

Upravit:
- `05_M1_Starter/src/page-shared.js`
- všechny HTML stránky se statickým menu

Navrhované pořadí:
```
Indikátory → Jak funguje zdravotnictví → Co s tím můžu dělat já → Strategie → O HSPA
```

Důvod: Prevence (Co s tím můžu dělat já) je pro běžného člověka přirozenější druhý krok po hlavním dashboardu. Jak funguje zdravotnictví a Strategie zůstávají pro hlubší systémovou vrstvu.

### Fáze 4: CSS

Upravit pouze `05_M1_Starter/src/styles.css` a recyklovat stávající editorial jazyk. Přidat minimální sadu tříd:

- `.prevention-grid`
- `.prevention-card`
- `.prevention-card-meta`
- `.prevention-actions`
- `.prevention-link-row`
- `.prevention-source-list`
- `.prevention-caveat`

Cílem je, aby sekce působila jako přirozená součást editorial redesignu: paper/ink/red, pravidla, typografie Source Serif + Inter.

### Fáze 5: validace a testy

Přidat:
- `05_M1_Starter/ingest/validate-prevention.js`
- test `05_M1_Starter/tests/prevention.test.js`
- npm script `validate:prevention`
- rozšíření `validate:all`

Validovat:
- každé téma má `id`, `title`, `what_we_know`, `try_this_week`, `sources`,
- každý `hspa_indicators` existuje v `data/indicators.json`,
- každá strategie existuje v `data/strategies.json`,
- každý zdroj má URL a datum přístupu,
- žádné téma nemá prázdný detail,
- detail URL `prevence.html?id=...` funguje i při neznámém ID.

### Fáze 6: backlog nových indikátorů

Do dalšího sprintu založit nebo doplnit indikátory:
- `nadmerny_screen_time_deti`
- `spanek_adolescenti`
- `osamelost_dospeli`
- `socialni_opora_dospeli`
- `konzumace_ovoce_zelenina`
- `slazene_napoje_deti`
- `aktivni_doprava_deti`
- `preventivni_prohlidky_dospeli`

U těchto indikátorů nepoužívat seed hodnoty bez jasného badge `illustrative`. Ideálně hledat Eurostat, EHIS/HBSC, SZÚ, ÚZIS, OECD.

## 5. MVP rozsah pro první PR

První PR by měl být obsahově užitečný, ale technicky omezený:

1. Přidat `data/prevention.json` s 9 tematickými kartami.
2. Přidat `prevence.html` a `src/prevence.js`.
3. Přidat navigační položku `Prevence` (resp. „Co s tím můžu dělat já").
4. Vykreslit list a detail tématu.
5. Prolinkovat existující indikátory a strategie.
6. Přidat validační testy.

Neimplementovat zatím:
- personalizované kalkulačky,
- medical advice,
- user accounts,
- tracking návyků,
- nové datové fetchery.

## 6. Editorial pravidla

Sekce musí držet tón:

- bez studu a moralizování,
- bez slibů typu „zabraňte rakovině za 30 dní",
- bez individualizace systémových bariér,
- bez paniky z technologií,
- s jasným rozlišením „co můžu udělat já" a „co musí změnit systém",
- s praktickými kroky, které jsou pro běžného člověka proveditelné.

Základní formulace:

> Nejde o to žít dokonale. Jde o to mít prostředí a návyky, které dělají zdravou volbu častější, jednodušší a příjemnější.

## 7. Zdroje pro první verzi

- WHO: Healthy diet — https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- WHO: Physical activity (26. 6. 2024) — https://www.who.int/news-room/fact-sheets/detail/physical-activity
- WHO: Tobacco (25. 6. 2025) — https://www.who.int/news-room/fact-sheets/detail/tobacco
- WHO Europe: Effects of tobacco on health (19. 5. 2025)
- CDC: E-cigarettes (31. 1. 2025) — https://www.cdc.gov/tobacco/e-cigarettes/index.html
- WHO: Alcohol (28. 6. 2024) — https://www.who.int/news-room/fact-sheets/detail/alcohol
- WHO Europe: Alcohol and cancer (26. 11. 2025)
- CDC: Alcohol and cancer (29. 1. 2026)
- WHO Commission on Social Connection: flagship report (30. 6. 2025)
- WHO: Social connection Q&A (30. 6. 2025)
- WHO: Ambient outdoor air pollution (24. 10. 2024)
- EEA: Harm to human health from air pollution in Europe (2025)
- WHO: Children's environmental health (13. 9. 2024)
- WHO: Urban health (19. 3. 2025)
- MZČR: Nová pravidla pro školní jídelny (2. 9. 2025)
- HHS Surgeon General: Social media and youth mental health (2023)
- WHO: Gaming disorder in ICD-11 (14. 9. 2018)
- WHO: Guidelines on physical activity, sedentary behaviour and sleep for children under 5 (2019)
- NZIP: Děti a pohyb — https://www.nzip.cz/clanek/1567-deti-a-pohyb
- OECD: Health at a Glance 2025, Czechia country note
- OECD / European Observatory: Czechia Country Health Profile 2025
- NIH: Leisure activities may improve longevity for older adults (13. 9. 2022)
- Sutin et al. 2024: Purpose in Life and Risk of Falls
