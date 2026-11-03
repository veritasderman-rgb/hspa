# PLAN · Poporodní návštěvy porodní asistentky (výkon 06211) v datech

> **Stav:** analýza hotová, návrh čeká na schválení vlastníkem. Nic z níže
> navrženého zatím není ve webu.
> **Vstupní data:** odpověď ÚZIS **UZIS/080507/2026** (vyřízeno 30. 10. 2026),
> normalizovaná v [`ingest/manual/uzis-06211/`](ingest/manual/uzis-06211/README.md).
> **Navazuje na:** [`clanek-porodni-asistentky-sestinedeli.html`](clanek-porodni-asistentky-sestinedeli.html)
> (27. 8. 2026, zatím uvádí „~2 % žen“ a nárok od 1. 1. 2026),
> [`clanek-komise-porodnictvi.html`](clanek-komise-porodnictvi.html) a indikátor
> [`porodni_asistentky_per_100k`](indicators/porodni_asistentky_per_100k.json).

Článek z 27. 8. slíbil čtenářům „třetí test“ reformy: zda se z využití nároku
stane veřejně sledované číslo. S těmito daty to jde poprvé změřit, a to po
krajích a pojišťovnách.

---

## 1. Co data obsahují

Výkon **06211 NÁVŠTĚVA TĚHOTNÉ NEBO MATKY V ŠESTINEDĚLÍ PORODNÍ ASISTENTKOU**
z NRHZS, čtvrtletně 2025 Q1 – 2026 Q2 (rok 2026 předběžně), ve třech řezech:
kraj poskytovatele (14 + ČR), pojišťovna (7) a pojišťovna × kraj.

Ke každé buňce je šest metrik: vykázané výkony, unikátní ženy, porody podle NRHZS,
podíl žen na porodech, počet IČZ odbornosti 921 (porodní asistentka) a 603
(gynekologie a porodnictví) s vykázaným výkonem.

**Proč je to zlomový dataset:** od 1. 1. 2026 dostává každá rodička při
propuštění žádanku na tři hrazené návštěvy. Dřív lékař návštěvy *mohl*
indikovat, teď *musí*
([MZ ČR](https://mzd.gov.cz/tiskove-centrum-mz/od-ledna-2026-budou-mit-zeny-po-porodu-narok-na-tri-navstevy-porodni-asistentky-v-domacnosti-hrazene-ze-zdravotniho-pojisteni/),
[VZP](https://www.vzp.cz/o-nas/aktuality/narok-na-porodni-asistentku-bude-mit-od-ledna-kazda-zena-po-porodu)).
Data zachycují rok před změnou a první dvě čtvrtletí po ní.

## 2. Hlavní zjištění

### 2.1 Celá ČR: zhruba čtyřnásobek, ale daleko od „každé ženy“

| | 2025 Q1 | Q2 | Q3 | Q4 | **2026 Q1** | 2026 Q2* |
|---|---:|---:|---:|---:|---:|---:|
| výkony 06211 | 833 | 937 | 1 055 | 1 156 | **3 953** | 4 399 |
| unikátní ženy | 548 | 620 | 722 | 771 | **2 607** | 2 960 |
| porody (NRHZS) | 18 033 | 18 732 | 20 437 | 17 884 | **17 414** | 14 707 |
| ženy / porody | 3,0 % | 3,3 % | 3,5 % | 4,3 % | **15,0 %** | 20,1 % |
| IČZ odb. 921 | 13 | 16 | 14 | 16 | **53** | 60 |
| IČZ odb. 603 | 32 | 30 | 34 | 43 | **83** | 83 |

\* předběžné, jmenovatel neúplný (viz § 3)

- **Využití vzrostlo zhruba pětkrát.** Výkonů bylo v 1. pololetí 2026 celkem 8 352,
  v 1. pololetí 2025 jen 1 770 (4,7×). Podíl žen na porodech stoupl z 3,5 %
  (průměr 2025) na **15,0 %** v Q1 2026, což je první spolehlivý kvartál.
- **Nárok je ale využitý zhruba z desetiny.** Tři návštěvy na každý porod
  v Q1 2026 by znamenaly 52 242 výkonů, vykázáno jich bylo 3 953 (7,6 %, tedy
  13× méně). Profesní organizace s jinými daty ÚZIS uvádějí „17× méně“
  ([otevřený dopis UNIPA, ČKPA a LLP VZP, 10. 8. 2026](https://llp.cz/blog/otevreny-dopis-rediteli-vzp/otevreny-dopis-vzp-cr-nerovny-postup-odbornosti-921/)).
- **Žena s návštěvou dostane v průměru 1,5 výkonu za kvartál**, ne tři. Stejné
  to bylo v roce 2025 i v roce 2026. Část rozdílu jde na vrub řezu po kvartálech
  (šestinedělí přechází přes hranici kvartálu), zbytek se z těchto dat odlišit nedá
  (→ § 6, doplňující dotaz).
- **Poskytovatelů, kteří výkon vykazují, přibylo v obou odbornostech zhruba
  stejně:** 603 (gynekologie a porodnictví: porodnice i ambulantní gynekologové)
  z 43 na 83, tedy +40; 921 (porodní asistentka: typicky samostatná praxe, ale
  může jít i o ambulanci porodní asistentky u většího zařízení) z 16 na 60, tedy +44.
  Kde vzniklo víc péče, z dat **nevyplývá**: tabulky nemají výkony podle
  odbornosti a IČZ neříká nic o velikosti poskytovatele (→ § 6 bod 3).
- **Počty IČZ jsou poskytovatelé, kteří výkon v kvartálu vykázali, ne
  poskytovatelé se smlouvou.** Růst může znamenat nové smlouvy i to, že
  stávající smluvní poskytovatelé začali výkon vykazovat. Platí to pro všechna
  tvrzení o IČZ níže.

### 2.2 Kraje: čtyřnásobný rozdíl a vyhaslý průkopník

| Kraj | 2025 | 2026 Q1 | 2026 Q2* | výkony 2025 | výkony H1 2026 | výkonů/ženu H1 | IČZ 921 (max 2025 → Q2 2026) | IČZ 603 |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Celá ČR | 3,5 % | 15,0 % | 20,1 % | 3 981 | 8 352 | 1,50 | 16 → 60 | 43 → 83 |
| Zlínský | 4,1 | **29,8** | 31,7 | 314 | 1 012 | 1,91 | 1 → 4 | 2 → 5 |
| Olomoucký | **15,9** | 25,1 | 19,0 | 1 009 | 592 | 1,33 | 4 → 6 | 5 → 4 |
| Královéhradecký | 2,8 | 19,2 | 13,1 | 286 | 446 | 1,90 | 2 → 4 | 1 → 1 |
| Jihomoravský | 3,9 | 17,6 | **36,4** | 433 | 1 283 | 1,40 | 3 → 7 | 4 → 9 |
| Jihočeský | 4,8 | 16,9 | 31,7 | 311 | 769 | 1,78 | 1 → 7 | 2 → 5 |
| Moravskoslezský | 6,0 | 16,8 | 16,1 | 566 | 813 | 1,36 | 0 → 3 | 9 → 15 |
| Vysočina | 1,7 | 15,6 | 23,8 | 82 | 439 | 1,51 | 0 → 2 | 4 → 9 |
| Karlovarský | 8,3 | 15,2 | 18,8 | 294 | 225 | 1,94 | 2 → 3 | 0 → 0 |
| Liberecký | 3,6 | 13,6 | **9,3** | 245 | 205 | 1,44 | 1 → **0** | 1 → 4 |
| Pardubický | 0,2 | 11,0 | 20,8 | 19 | 303 | 1,38 | 1 → 7 | 1 → 4 |
| Středočeský | 1,4 | 10,7 | 17,0 | 136 | 767 | 1,52 | 2 → 6 | 6 → 11 |
| Praha | 0,6 | 10,6 | 16,9 | 106 | 927 | 1,27 | 2 → 5 | 1 → 3 |
| Ústecký | 3,0 | 10,5 | 12,7 | 172 | 339 | 1,30 | 0 → 4 | 8 → 11 |
| Plzeňský | 0,2 | **7,4** | 13,1 | 8 | 232 | 1,41 | 0 → 2 | 1 → 2 |

(řazeno podle Q1 2026, podíl = unikátní ženy / porody; sloupec 2025 = součet žen / součet porodů za rok)

- **Rozpětí v Q1 2026 je 7,4 % (Plzeňský) až 29,8 % (Zlínský)**, tedy čtyřnásobek.
  Stejný celostátní nárok vede k velmi rozdílné dostupnosti podle bydliště.
- **Olomoucký kraj byl v roce 2025 jediný, kde návštěvy fungovaly ve větším
  měřítku:** 16 % porodů a čtvrtina všech výkonů v ČR (1 009 z 3 981). Po
  reformě se nerozjel, v Q2 2026 spadl na 19 % a pod celostátní průměr.
  Čím to je (konkrétní poskytovatel? kapacita?), nutno ověřit u zdroje, data to neříkají.
- **V Plzeňském kraji až do Q2 2026 nevykázalo výkon jediné IČZ 921** a kraj má
  nejnižší využití. **V Libereckém kraji v Q2 2026 nevykázalo výkon žádné IČZ 921**
  (v Q1 jedno). Neznamená to nutně zániklou smlouvu; podíl spadl z 13,6 %
  na 9,3 %. Mezi Q1 a Q2 2026 klesl počet výkonů v pěti krajích: Liberecký
  145 → 60, Královéhradecký 300 → 146, Olomoucký 347 → 245, Zlínský 529 → 483,
  Moravskoslezský 430 → 383. Q2 je ale předběžný.
- **Praha má na tisíc porodů nejméně poskytovatelů** (8 IČZ na 5 523 porodů
  v H1, tedy 1,45/1 000; ostatní kraje 2,4–8,7). Do Q3 2025 tu služba prakticky
  neexistovala (0–0,7 %).
- Počet IČZ na porody s využitím koreluje jen slabě (Pearson r ≈ 0,27 přes kraje
  H1 2026). IČZ není kapacita: jedno IČZ může být porodnice s desítkami
  asistentek, nebo jedna samostatná asistentka. Do článku proto žádné tvrzení
  typu „víc smluv = víc návštěv“ nepatří.
- **Intenzita péče se liší také:** ve Zlínském, Královéhradeckém a Karlovarském
  kraji připadá na ženu 1,9 výkonu za kvartál, v Praze a Ústeckém 1,3.

### 2.3 Pojišťovny: stejný nárok, jiná síť

| ZP | 2025 | 2026 Q1 | 2026 Q2* | IČZ 921 (max 2025 → Q1 → Q2 2026) |
|---|---:|---:|---:|---|
| 111 VZP | 3,1 % | 14,0 % | 19,4 % | 10 → 20 → **39** |
| 201 VoZP | 2,9 | 11,9 | 20,5 | 8 → 14 → 25 |
| 205 ČPZP | **5,7** | **17,3** | 17,1 | 6 → **37** → 39 |
| 207 OZP | 2,1 | 17,8 | (33,4 — artefakt) | 9 → 17 → 18 |
| 209 ZPŠ | 4,7 | 11,9 | 11,9 | 3 → 6 → 4 |
| 211 ZPMV | 3,8 | 16,8 | 25,0 | 11 → 26 → 38 |
| 213 RBP | 5,0 | 16,6 | 19,4 | 1 → 5 → 8 |

- **VZP (57 % porodů) začala v Q1 2026 nejpomaleji z velkých pojišťoven (14,0 %)**
  a počet IČZ 921, která jí výkon vykázala, se zdvojnásobil až v Q2 (20 → 39).
  Je to v souladu s tvrzením otevřeného dopisu profesních organizací, že VZP
  „ve druhém čtvrtletí … začala ve větší míře než doposud uzavírat smlouvy se
  samostatnými porodními asistentkami“. Samotná data ÚZIS ale vznik smluv
  nedokládají (vykazující ≠ smluvní poskytovatel). Pro článek ověřit počet
  smluv přímo u VZP.
- **ČPZP vykazovalo hned v Q1 37 IČZ 921** a měla nejvyšší využití Q1
  (17,3 %). V Q2 ale stagnuje, zatímco ostatní rostou.
- **OZP Q2 33,4 % je artefakt neúplných dat** (452 porodů proti 1 191 v Q1).
  Nepublikovat.
- **Uvnitř krajů se pojišťovny rozcházejí až čtyřnásobně** (H1 2026, buňky
  s ≥150 porody): Středočeský ČPZP 7,1 % × ZPMV 22,8 %; Praha VoZP 9,4 % × OZP
  24,1 %; Plzeňský ČPZP 6,6 % × ZPMV 13,7 %; Pardubický VZP 14,2 % × ZPMV 28,5 %.
  Nejvyšší buňky: Zlínský ZPMV 32,4 %, RBP 31,2 %, VZP 30,2 %.
  **ZPMV má nejvyšší podíl v 9 z 12 krajů**, kde lze pojišťovny srovnat
  (aspoň dvě ZP s ≥150 porody). Výjimky: Praha (OZP), Jihomoravský (ČPZP)
  a Ústecký (VZP).

## 3. Pasti při čtení (povinně do každého textu a karty)

1. **Q2 2026 je předběžný a má neúplný jmenovatel.** Porody meziročně −21,5 %,
   v Q1 jen −3,4 %. Skutečný pokles porodnosti je řádově jednotky procent
   (viz [`clanek-demografie-2025-…`](clanek-demografie-2025-rekordni-doziti-minimum-narozenych.html)).
   Za titulkové číslo proto brát **Q1 2026 = 15,0 %** a Q2 uvádět jen jako
   předběžný odhad, nebo počkat na aktualizaci od ÚZIS.
2. **„Podíl žen na porodech“ není podíl rodiček, které službu využily.** V čitateli
   jsou ženy s návštěvou v kvartálu (i těhotné, i ženy, které rodily v minulém
   kvartálu), ve jmenovateli porody v kvartálu. Formulace: „na každých 100 porodů
   připadlo 15 žen s návštěvou porodní asistentky“, ne „15 % rodiček“.
3. **Kraj = kraj poskytovatele**, ne bydliště. Porodnice u hranice kraje
   (např. Brno pro Vysočinu) mohou podíly přelévat.
4. **06211 obsahuje i návštěvy v těhotenství.** Rozdělení před porodem / po
   porodu tabulky nemají.
5. **„~2 %“ v článku z 27. 8. a v kartě indikátoru** jsou údaj MZ/VZP s jinou
   definicí. ÚZIS dává pro rok 2025 3,0–4,3 % po kvartálech (3,5 % za rok podle
   definice z bodu 2). Starší číslo nepřepisovat potichu: uvést obě i s definicí
   a záznam v `data/claims.json` přeznačit (drift).
6. Jen veřejné pojištění, bez samoplátkyň (ty si porodní asistentku platily
   i před reformou, takže skutečné využití péče porodní asistentky je vyšší než
   využití hrazené).

## 4. Kontext: o co se vede spor (podklad pro texty)

| Datum | Událost | Zdroj |
|---|---|---|
| 4. 12. 2025 | PS k seznamu výkonů: úprava výkonu 06211 **nepřijata** (pro 2 — MZ‑CAU, ČFS; proti 1 — SZP; zdrželo se 7) | `data/ppo-analyza/4.json` |
| 1. 1. 2026 | Automatická žádanka na 3 návštěvy při propuštění z porodnice | MZ ČR, VZP |
| 18. 2. 2026 | Pracovní skupina k porodnictví (Úřad vlády) protestuje proti dvěma návrhům na jednání PS SZV 19. 2.: **zkrácení 06211 z 60 na 20 minut** (předkládá SZP spolu s VZP) a **zrušení automatické indikace** (předkládá ČGPS ČLS JEP) | [podnět PS k porodnictví](https://vlada.gov.cz/assets/ppov/rovne-prilezitosti-zen-a-muzu/prac_skupiny/Pracovni_skupina_k_porodnictvi/Podnet-k-zachovani-poporodni-a-tehotenske-navstevni-sluzby-porodni-asistentkou-_06211__1.pdf) |
| 3. 3. 2026 | MZ v odpovědi na dotaz podle InfZ: kterými poskytovateli síť zajistí, je „zcela na uvážení zdravotních pojišťoven“; daty o personálních kapacitách nemocnic **„nedisponuje“** | [mzd.gov.cz/…/82.pdf](https://mzd.gov.cz/wp-content/uploads/2026/03/82.pdf) |
| 19. 3. 2026 | PS SZV: úprava 06211 **stažena z hlasování**, úkol „znovu projednat se všemi organizacemi porodních asistentek“ (zatím otevřený) | `data/ppo-analyza/4.json`, `data/ppo-ukoly.json` |
| 5/2026 | „Poporodní péče v datech“ (V. Hažlinská, UNIPA): rychlá sonda Q1 2026, 108 žen, 63 PA, 37 porodnic. Reálná návštěva 60–90 min, bariéry: nevěděla, kde PA najít; odmítnutí pro kapacitu; dlouhý termín; chybí smlouva s mou ZP. **Nereprezentativní vzorek, autorka je zároveň aktérkou debaty** | [unipa.cz PDF](https://unipa.cz/wp-content/uploads/2026/05/poporodni-pece-v-datech.pdf) |
| 22. 5. 2026 | MZ zřizuje Mezioborovou komisi pro transformaci péče o těhotnou ženu, matku a dítě, bez porodních asistentek (už zpracováno v `clanek-komise-porodnictvi.html`) | [mzd.gov.cz/…/193.pdf](https://mzd.gov.cz/wp-content/uploads/2026/08/193.pdf) |
| 10. 8. 2026 | Otevřený dopis UNIPA, ČKPA a LLP řediteli VZP: nemocnice mají nasmlouvanou dopravu do 50 km bez ohledu na hranice krajů, samostatné PA „virtuální výjezdní místa“ a část cest platí ze svého. Tvrzení, že „třetině žen, které péči poptávaly, se ji nepodařilo využít“, se opírá o sondu z 5/2026 | [llp.cz](https://llp.cz/blog/otevreny-dopis-rediteli-vzp/otevreny-dopis-vzp-cr-nerovny-postup-odbornosti-921/) |

Úhrada 06211 pro samostatnou PA podle úhradové vyhlášky 2025 (314/2024 Sb.) je
orientačně 443,94 Kč za návštěvu
([prezentace PS k porodnictví, 26. 5. 2025](https://uv.gov.cz/assets/ppov/rovne-prilezitosti-zen-a-muzu/prac_skupiny/Pracovni_skupina_k_porodnictvi/Priloha-c--1-Zapisu-z-26-05-2025-Prezentace-A--Fikejzove-k-uhradam-pece-porodni-asistentky.pdf)).
Sazbu pro rok 2026 (vyhláška 432/2025 Sb.) a návrh na 2027 **před použitím
v textu ověřit v primárním znění**.

Evidence k obsahu článků (ověřit přes PubMed podle `PROMPT_EVIDENCE_AUDIT.md`,
nepřebírat z paměti):
[WHO recommendations on maternal and newborn care for a positive postnatal experience (2022)](https://www.who.int/publications/i/item/9789240045989)
(počet a načasování poporodních kontaktů), Cochrane review *Schedules for home
visits in the early postpartum period* (Yonemoto et al.), Cochrane *Midwife-led
continuity models* (Sandall et al., už citováno v článku z 27. 8.).

## 5. Návrh prezentace na webu

### 5.1 Indikátory (2 nové + 1 regionální dataset + úprava stávající karty)

**A · `porodni_asistentka_navstevy_porody` — Ženy s návštěvou porodní asistentky na 100 porodů** *(HSPA)*

- `area: "Procesy"`, `domain: "Porodní a poporodní péče"`, `subdomain: "Šestinedělí"`,
  `dimension: "dostupnost"`, `direction: "higher_is_better"`, `framework: "hspa"`
- hodnota **15,0** (2026 Q1); trend 2025 = 3,5 (roční), 2026 Q1 = 15,0. Q2 až po
  potvrzení od ÚZIS.
- benchmark: mezinárodní srovnatelný neexistuje, proto `signal: "neutral"`.
  Do `importance` napsat cílovou hodnotu podle nároku (teoreticky ~100 žen na
  100 porodů) a regionální rozpětí.
- zdroj: ÚZIS NRHZS, datový požadavek UZIS/080507/2026, `origin: "seed"`,
  `verification_status` podle `PLAN-VERIFIKACE-INDIKATORU.md` (ruční zdroj).
- **Rozhodnutí pro implementaci:** kontrakt má trend po letech. Buď hodnota
  „2026 (Q1)“ s poznámkou v `method_notes`, nebo počkat na celý rok 2026.
  Doporučuji první variantu: indikátor má smysl právě teď a ruční zdroj se
  po dodání dat za rok 2026 přepíše.

**B · `porodni_asistentky_vykazujici_icz_921` — Poskytovatelé odbornosti porodní asistentka (921), kteří vykázali návštěvu 06211** *(monitoring)*

- `area: "Struktury"`, `framework: "monitoring"`, hodnota 60 (2026 Q2) / 53 (Q1),
  2025 = 13–16. Je to nejbližší dostupná proxy toho, jestli roste péče
  porodních asistentek mimo gynekologicko-porodnická zařízení, tedy části,
  o kterou se vede spor (§ 4). V `limitations` uvést: vykazující IČZ ≠ smluvní
  IČZ (smlouvy bez vykázaného výkonu nejsou vidět), IČZ ≠ počet asistentek
  ≠ kapacita, odbornost 921 ≠ vždy samostatná praxe. Pokud se podaří získat
  počty smluv od pojišťoven, indikátor přejmenovat na smluvní síť.

**C · regionální dataset `porodni_asistentka_navstevy_porody_kraje`** v `data/regions.json`
(stejný tvar jako `zachyt_pas_18_mesicu_kraje`), hodnoty Q1 2026 podle § 2.2.
Na `kraje.html` je to nejsilnější vizuál celé sady: rozpětí 7,4–29,8 %.

**D · per-ZP řez pro Srovnávač pojišťoven** (`PLAN-SROVNAVAC-POJISTOVEN.md`,
inventář `docs/pojistovny-indikatory.md`, P5.5 per-ZP indikátory): podíl
a IČZ 921 podle pojišťovny + matice ZP × kraj. Patří tam, ne do hlavního
kontraktu.

**Úprava stávajícího `porodni_asistentky_per_100k`:** do `limitations` a
`patient_story` doplnit nové číslo (2025 ≈ 3,5 % podle ÚZIS, Q1 2026 15 %)
vedle dosavadních „~2 %“ s definicemi (§ 3 bod 5) a prolinkovat indikátor A.

### 5.2 Články (série „Šestinedělí v datech“, 4 díly)

Série do `data/series.json`, rubrika `dostupnost` (díl 4: `legislativa`).
Všechny navazují na článek z 27. 8., který slíbil, že využití nároku bude
veřejně sledované.

| # | Pracovní titulek | Jádro | Data / vizuály (`.av-*`) | Indikátory |
|---|---|---|---|---|
| **1** | **Ze tří na patnáct ze sta. První data o tom, jak ženy využívají nárok na porodní asistentku** | Národní obraz: zhruba 5× víc návštěv, ale 13× méně, než nárok dovoluje; 1,5 návštěvy na ženu místo tří; vykazujících poskytovatelů přibylo v obou odbornostech (603: +40, 921: +44), podíl na výkonech podle odbornosti zatím neznámý. Rozhodně uvést, co data neumí (§ 3). | `av-counter` (3,5 % → 15 %; 3 953 z 52 242), `av-bar` kvartály 2025–2026, `av-table` výkony/ženy/IČZ | A (launch), B, `porodni_asistentky_per_100k` |
| **2** | **Ve Zlínském kraji třetina, v Plzeňském necelá desetina. Mapa poporodní péče** | Kraje: čtyřnásobné rozpětí, Olomoucký průkopník z roku 2025 stagnuje, v Plzni do Q2 žádné vykazující IČZ 921, v Libereckém v Q2 také žádné, Praha má nejmíň poskytovatelů na porod. Bez kauzálních tvrzení (r ≈ 0,27). | `av-table` 14 krajů (2025 / Q1 / IČZ), odkaz na mapu `kraje.html` (dataset C) | C, A, `kojeni_pri_propusteni` |
| **3** | **Stejný nárok, jiná pojišťovna. U koho se návštěvy rozjely dřív** | U VZP se počet IČZ 921 vykazujících výkon zdvojnásobil až v Q2 (20 → 39), u ČPZP jich bylo 37 hned v Q1; počty smluv ověřit u pojišťoven. ZPMV vede v 9 z 12 srovnatelných krajů. Spor o úhradu dopravy (dopis 10. 8.). Uvnitř kraje až 4× rozdíl podle pojišťovny. Pravidlo nestrannosti: konfrontovat s daty, ne s motivy; dát VZP prostor (odpověď Seidlové z 25. 5. 2026). | `av-table` ZP × Q, „heatmapa“ ZP × kraj jako `av-table` | D (srovnávač), B |
| **4** | **Šedesát, nebo dvacet minut? Kdo rozhoduje o tom, jak bude vypadat šestinedělí** | Politický rámec: návrhy z 19. 2. (60 → 20 min, zrušení automatické indikace), osud v PS SZV (prosinec nepřijato, březen staženo, úkol otevřený), MZ „nedisponuje“ daty o kapacitách, komise bez PA (odkaz, neopakovat). Co sledovat: úhradová vyhláška 2027, cohortová data od ÚZIS. | `av-timeline` (tabulka § 4) | A, B |

**Volitelný 5. kus, služba čtenářkám:** explainer `explainers.json` „Jak využít
žádanku na porodní asistentku“ (kde hledat seznam smluvních PA podle
pojišťovny, kdy volat, co návštěva obsahuje, co dělat při odmítnutí: stížnost
na pojišťovnu kvůli místní dostupnosti podle § 46 zák. 48/1997 Sb.). Žádná
lékařská doporučení jednotlivci (GOVERNANCE § 2 bod 5).

**Pořadí a načasování:** díl 1 a dataset A+C v jednom PR (třída B), díly 2–4
jako drafty do fronty. Publikace jde přes `publish-scheduled.js`, nejvýš
1 článek denně; díly 1–3 mohou dostat `topical_until` do doby, než ÚZIS
dodá data za Q3 2026. Do tvorby textů zapojit evidence-audit (PubMed) na
tvrzení o přínosu poporodních návštěv.

### 5.3 Napojení ve webu

- `clanek-porodni-asistentky-sestinedeli.html`: doplnit krátký odkaz
  „Aktualizace: první data o využití nároku → díl 1“ (žádné přepisování textu).
- `tematicke-linie.html` / `data/themes.json`: přidat indikátor A do linie,
  kam patří perinatální péče.
- `data/claims.json`: přeznačit tvrzení „~2 % žen“ (drift, viz § 3 bod 5).
- `zdravi-2035.html`: dílčí cíl **2.7.7** (multidisciplinární péče o těhotné,
  rodičky a ženy po porodu, citován v odpovědi MZ 3. 3. 2026) může dostat
  indikátor A, pokud ho dataset `data/zdravi2035-plneni.json` mapuje.
- glosář: zkontrolovat pojmy *šestinedělí*, *porodní asistentka*, *IČZ*,
  *odbornost 921*.

## 6. Doplňující dotaz na ÚZIS (doporučeno odeslat hned)

Bez těchto údajů zůstane hlavní otázka („kolik rodiček skutečně dostalo péči
a kdy“) jen odhadem:

1. **Kohortová metrika:** z žen, které porodily v měsíci M (2025-01 až 2026-09),
   kolik má ≥1 výkon 06211 do 42 dnů po porodu; rozložení 0 / 1 / 2 / 3 / 4+
   návštěvy.
2. **Načasování:** medián a kvartily dnů od propuštění (nebo porodu)
   do první návštěvy.
3. **Výkony podle odbornosti vykazujícího IČZ** (921 vs. 603 vs. jiné), nejen
   počty IČZ. Teprve to ukáže, kolik péče nesou nemocnice a kolik samostatné PA.
4. **Kraj (případně okres) bydliště ženy** místo kraje poskytovatele.
5. **Těhotenství vs. šestinedělí:** výkon před porodem a po porodu zvlášť.
6. Aktualizace Q2 2026 (konečná) a Q3 2026.
7. Související výkony: **34007** (edukace o kojení), 06021/06023 (vyšetření
   těhotné porodní asistentkou), vykázaná doprava k výkonu 06211.

## 7. Co z dat NEtvrdit

- „15 % rodiček využilo nárok“ (definice viz § 3 bod 2).
- „Víc smluv vede k vyššímu využití“ (r ≈ 0,27, IČZ ≠ kapacita).
- „Třetina žen péči nesehnala“ jako fakt. Je to výsledek nereprezentativní sondy,
  citovat jen s popisem vzorku.
- Žádné hodnocení OZP za Q2 2026 (artefakt jmenovatele).
- „Pojišťovna uzavřela / ukončila smlouvy“ jen z počtu IČZ. Data ÚZIS ukazují
  poskytovatele, kteří výkon vykázali, ne smluvní síť.
- „Péče vznikla hlavně v nemocnicích“ (nebo naopak u samostatných PA), dokud
  ÚZIS nedodá výkony podle odbornosti (§ 6 bod 3).
- Příčiny propadu v Olomouckém a Libereckém kraji bez ověření u poskytovatelů
  nebo pojišťoven.
