# Brief pro Claude Code: nove clanky a indikatory pro HSPA Monitor

Datum briefu: 2026-05-14  
Repo: `veritasderman-rgb/hspa`  
Cilovy web: `hspa-cesko.cz` / `skorezdravotnictvi.cz`  
Aktivni kod v repozitari: `05_M1_Starter/`

## Kontext

Priprav obsahovy a datovy balik navazujici na tri prezentace z VZ PS PCR 13. 5. 2026:

1. `prof. Dusek_planovane zmeny v dohodovacim rizeni.pdf`
2. `prof. Dusek_predikce potreb a nutnost efektivni podpory luzkove pece .pdf`
3. `prof. Dusek_reforma intenzivni pece.pdf`

Tyto decky posouvaji HSPA Monitor od obecneho dashboardu k reformnim tematum: nove dohodovaci rizeni, value-based financovani, otevrena data NZIS, regionalni predikce potreb, interna a oblastni nemocnice, intenzivni pece, osetrovatelska narocnost a personalni evidence.

Vsechny fakticke ciselne claimy nize ber jako **source notes ze slidovych podkladu**, ne jako hotova publikacni tvrzeni. Pred zverejnenim je over proti primarnimu zdroji: NZIP, UZIS/NRHZS, MZ CR, OECD, pripadne vestnik / sbirka zakonu.

## Struktura webu, kterou respektuj

Aktivni aplikace je staticky vanilla JS web bez buildu:

- `05_M1_Starter/index.html` - hlavni dashboard indikaturu
- `05_M1_Starter/clanky.html` - listing clanku
- `05_M1_Starter/clanek-*.html` - jednotlive clanky v rootu
- `05_M1_Starter/drafts/clanek-*.html` - drafty, obvykle `noindex`
- `05_M1_Starter/data/articles.json` - index clanku pro listing
- `05_M1_Starter/data/indicators.json` - hlavni datovy kontrakt indikaturu
- `05_M1_Starter/indicators/{id}.json` - metodicka karta indikaturu
- `05_M1_Starter/data/regions.json` - krajsky rozpad pro vybrane indikatory
- `05_M1_Starter/src/clanky.js` - render listingu clanku, disclaimery, topic filtry
- `05_M1_Starter/src/indicator.js` - detail indikaturu
- `05_M1_Starter/tests/*.test.js` - node:test suite

Pravidla:

- Neprepisuj datovy model bez nutnosti.
- Novy indikator znamena minimalne: zaznam v `data/indicators.json` + karta `indicators/{id}.json`.
- Pokud ma indikator krajske hodnoty, pridej dataset do `data/regions.json` s 14 NUTS3 kraji.
- Novy clanek znamena HTML soubor + zaznam v `data/articles.json`.
- Dokud neni fact-check hotovy, nastav `published: false`, `robots: noindex`, pripadne audit/review metadata.
- U clanku pouzij stavajici styl `article-page`, `article-header`, `article-deck`, `article-body`, `article-source-note`.
- Topic pouzivej existujici: `legislativa`, `financovani`, `klinika`, `prevence`, `populace`, `dusevni-zdravi`, `dostupnost`, `digitalizace`.
- Po upravach spust `npm test` a `npm run validate:all` v `05_M1_Starter/`.

## Existujici obsah, na ktery navazat

V repu uz existuji relevantni clanky / drafty:

- `clanek-financovani-segmenty-2026.html` - DPDR/NRHZS segmenty, 459 mld Kc, podil luzkove pece.
- `clanek-uhradova-vyhlaska.html` - obecna mechanika uhradove vyhlasky.
- `clanek-platba-za-vysledek-vzp.html` - value-based care / platba za vysledek.
- `drafts/clanek-dohodovaci-rizeni-2027-data.html` - draft o DŘ 2027 a otevrenych datech.
- `drafts/clanek-drg-reforma-2026.html` - draft o CZ-DRG reforme.
- `clanek-financovani-segmenty-2026.html` je pravdepodobne nejblizsi publikovany anchor pro nove indikatory financovani.

Nezakladej duplicitni clanky, pokud staci rozsirit existujici draft. Priorita je spis **aktualizovat / rozdelit drafty** nez generovat dalsi prekryv.

## Source notes z prezentaci

### A. Nove dohodovaci rizeni a otevrena data

Zdroj: `prof. Dusek_planovane zmeny v dohodovacim rizeni.pdf`

Klicove teze:

- Navrh nove upravy §17: MZ navrhuje jednaci rad, predstavuje priority, moderuje a predsedá jednanim.
- Dohody maji byt mozne i vicelete; dohodovani se muze prodlouzit do zari, aby zahrnulo predikce.
- Vyhlaska ma byt kazdorocni publikaci dohod.
- Povinne cast dohod o vazbe uhrad na vysledek.
- Zakaz deficitniho planovani uhrad.
- Omezeni mozne vyse rezerv zdravotnich pojistoven; nadlimitni rezervy vyuzit pro individualni smluvni politiku.
- Rozsireny cil dohodovani: nejen uhrady, ale i sit a personal vcetne odmenovani.
- Dohodovani ma stat na komplexnich informacich: inflace, spotreba, predikce, obloznost, regiony.
- Pri nedohode: smirci rizeni, panel, MZ urci koridor okolo objektivne stanovene stredove hodnoty; navrh mimo koridor se vyrazuje.
- Pilot DŘ 2026-2027 ma 3 pracovni skupiny: uhrady, sit, personal.
- Cile pilotu: jednaci rad, vicelete dohody, VBHF modely pro segmenty, narodni transformacni plany, vyuzitelnost dat a modelaci.
- Otevrena data pro DŘ: 8 dimenzi, 53 datovych sad.
- Dimenze: ceny a objemy; vyvoj personalnich nakladu; nakladova struktura poskytovatelu; seznam vykonu; struktura pojistencu a naklady ZP; produkce a naklady luzkove pece; komunitni osetrovatelske sluzby; jednodenni pece.
- Data jsou publikovana na NZIP, zejmena `https://www.nzip.cz/dohodovaci-rizeni`.
- Dalsi sady: luzkovy fond/luzkova pece, produkce luzkove pece, intenzivni pece (`https://www.nzip.cz/intenzivni-pece`).
- Socialne-zdravotni predikce: datove propojeni NZIS, CSSZ, Urad prace, MPSV; predikce po krajich, okresech a ORP do let 2025, 2030, 2035, 2040, 2050.
- Pripravene sady zahrnuji demografii, dlouhodobou socialne-zdravotni podporu, kapacity PSS, polymorbiditu, geriatricke riziko, umrti a 90 dni pred smrti, PnP III/IV, dlouhodobou osetrovatelskou peci, zdravotni postizeni, dusevni onemocneni, neformalni peci, cizince s aktivnim pojistenim.
- INDIKO/NZIP ma publikovat indikatory kvality, napriklad onkologicka pece a cas do zahajeni lecby podle regionu.
- Personalni data: zdravotnicti pracovnici ve smlouvach se ZP maji byt overeni v NRZP; ve smlouvach ma byt seznam pracovniku s identifikacnim cislem, ne jen pocet. Vznik samostatnych ICP pro operacni a porodni saly s personalnim zabezpecenim.

### B. Interna, regionalni nemocnice, dlouhodoba pece

Zdroj: `prof. Dusek_predikce potreb a nutnost efektivni podpory luzkove pece .pdf`

Klicove teze a cisla:

- Interna je pater nechirurgicke akutni pece o dospele a klicovy obor pro polymorbidni pacienty.
- Akutni interna 2023: 291 pracovist, 8 807 luzek, 8,1 luzka / 10 000 obyvatel.
- Hospitalizace 2023 na interne: 339 722 pripadu, 2 110 594 osetrovacich dnu, prumerna doba 6,2 dne.
- Pacienti 65+ na interne: 245 400, tj. 72,2 % internich hospitalizaci.
- Demografie: 65+ 2 158 322 v roce 2021, 2 682 875 v roce 2040, 3 073 347 v roce 2050.
- Demografie: 75+ 864 727 v roce 2021, 1 363 039 v roce 2040, 1 591 189 v roce 2050.
- Demografie: 85+ 203 389 v roce 2021, 469 580 v roce 2040, 510 185 v roce 2050.
- Vysoke geriatricke riziko 75+: 61 150 v roce 2020, 75 603 v roce 2024, 98 702 v roce 2030, 118 377 v roce 2035, 132 941 v roce 2040, 150 963 v roce 2050.
- PnP III-IV 75+: 115 442 v roce 2024, 151 174 v roce 2030, 211 347 v roce 2040, 240 666 v roce 2050.
- PnP III-IV 85+: 62 384 v roce 2024, 84 546 v roce 2030, 146 348 v roce 2040, 165 144 v roce 2050.
- Celkovy objem akutni luzkove pece klesa, ale netyka se seniornich skupin; objem akutni pece o 65+ trvale roste.
- Financni modelace interni pece 2024:
  - naklad / CM bod RN: FN/centra 83 737 Kc, krajske 79 629 Kc, oblastni 74 788 Kc.
  - prumerna uhradova ZS 1. kolo ZP: FN/centra 85 991 Kc, krajske 80 433 Kc, oblastni 65 907 Kc.
  - oblastni nemocnice: rozdil -8 881 Kc / CM bod, pri CM 180 498 ztrata cca -1,6 mld. Kc.
- Modelace vsech PALP:
  - oblastni nemocnice v pausal A: rozdil cca -3,804 mld. Kc.
  - celkove modelacni saldo uvedeno cca -2,481 mld. Kc.
- Zaver: zakladni sazby maji vic zohlednovat realnou proporcionalni nakladovost typu nemocnice; sazby za stejnou peci maji byt vic shodne mezi pojistovnami; optimalizovat model oblastnich nemocnic s efektivnim provozem.
- Obloznost interni pece 2024:
  - akutni standardni luzka interna: celkem 66,1 %, FN 68,7 %, krajske 61,4 %, oblastni 65,9 %.
  - akutni intenzivni luzka interna: celkem 64,6 %, FN 75,8 %, krajske 66,7 %, oblastni 61,0 %.
- Navrh: pro kalkulaci realnych nakladu pouzivat jen pracoviste se schvalenymi standardy, zejmena vyuziti luzek 75-95 %.
- Osetrovatelska narocnost: geriatrie a interna maji vysoky podil pacientu v kategoriich 3-5; prumer podilu HP s kategoriemi 3-5 je 51,1 %, interna je v grafu vysoko.
- Pocet osetrovacich dnu na 1 uvazek sestry z RN: prumer 406; interna v grafu cca 575 OD / uvazek / rok.
- OD 00024 nasledna/dlouhodoba pece: naklad 3 515 Kc / OD, mzdove naklady 2 465 Kc (70 %). Uhrady tri ZP cca 3 043 / 3 084 / 3 100 Kc.
- Plosne navyseni 00024 o 500 Kc by znamenalo cca 1,7 mld. Kc rocne.

### C. Reforma intenzivni pece

Zdroj: `prof. Dusek_reforma intenzivni pece.pdf`

Klicove teze a cisla:

- Reforma IP: PS kvalita IP NIKEZ 1/2025; koncepcni material 11/2025; PS pro restrukturalizaci IP 1/2026; zadani koncepce IP a perioperacni pece ve formatu Vestniku MZ 4/2026.
- Odhad nakladu intenzivni pece bez NIP v CR: cca 29 mld. Kc / rok.
- Charakteristika CR: nadbytek luzek IP, nejednotna klasifikace, nejednotna organizace, absence koordinace, indikace IP bez benefitu, nizka efektivita podle dlouhodobych vysledku.
- NRHZS 2024: celkovy pocet luzek intenzivni pece 5 727.
- OECD 2021/2022: CR cca 40 ICU luzek / 100 000 obyvatel; vysoko v mezinarodnim srovnani.
- Problem: nizka obloznost, zejmena oborovych JIP; nekde nesoulad mezi smluvne sjednanymi IP luzky a vykazovanim OD IP.
- Dlouhodobe vysledky po ARO / UPV >2 dny:
  - preziti vice nez rok: dospeli 51,2 %.
  - 65-74 let: 48,5 %.
  - 75-84 let: 34,7 %.
  - 85+ let: 16,9 %.
- Hlavni duvody reformy: nadbytek luzek, neucelne indikace, spatne dlouhodobe vysledky, variabilita organizace/kvality, starnuti populace, nedostatek personalu.
- Klicove nastroje: organizacni ramec a rizeni IP, Advanced Care Planning, narodni standardy NIKEZ, datova modelace site, zmena uhradove filozofie k value-based care.
- Zmeny: racionalni indikace do IP/NIP, reklasifikace typu IP, organizace IP v nemocnicich, spoluprace s UP/paliaci/standardnimi luzky, HPO priprava, narodni indikatory kvality a vykonnosti.
- Organizace IP: koordinator/dispecink IP, EWS/MET, koordinace mezi IP pracovisti, multioborove JIP tam, kde davaji smysl, jednotne datove standardy.
- Interni IP 2024: interni obory 960 intenzivnich luzek, 226 218 OD, obloznost 64 %; FN 75 %, krajske 64 %, oblastni 61 %.
- Hodnocena pracoviste ARO 2024: 91 pracovist, 821 IP luzek, 36 454 HP, 194 782 OD, vyuziti 65 %, nevyuzite OD 104 883, resuscitacni OD 113 850.
- Hodnocena pracoviste JIP 2024: 125 pracovist, 4 906 IP luzek, 304 734 HP, 1 092 321 OD, vyuziti 61 %, nevyuzite OD 698 369, resuscitacni OD 84 097.

## Navrzeny obsahovy balik

### Priorita 1: aktualizovat existujici drafty

1. `drafts/clanek-dohodovaci-rizeni-2027-data.html`
   - Upravit z "DŘ na datech" na "pilot noveho DŘ 2026-2027".
   - Doplnit planned legal change: vicelete dohody, zakaz deficitniho planovani, rezervy ZP, smirci panel, koridor MZ, DŘ nad uhradami/siti/personalem.
   - Doplnit datovy blok "8 dimenzi / 53 datasetu".
   - Pridat chronologii: 13. 5. 2026 prezentace PS PCR -> pilot 2026-2027 -> vyhodnoceni konec 2026 -> legislativni zmena.
   - Udrzet `published:false` do fakticke kontroly.

2. `drafts/clanek-drg-reforma-2026.html`
   - Nesoustredit jen na "konec sazby z roku 2014"; doplnit ciselny priklad z interni pece:
     - oblastni interna: ZS 65 907 Kc vs. naklad 74 788 Kc, gap -8 881 Kc / CM, ztrata cca 1,6 mld. Kc.
     - vsechny PALP A oblastni nemocnice: cca -3,8 mld. Kc.
   - Z textu udelat vecnou analyzu "kdo je podfinancovan a proc se to neda resit plosnym pridanim".
   - Doplnit vazbu na osetrovatelskou narocnost a efektivni obloznost 75-95 %.
   - Udrzet jako draft, pokud nebudou overeny primarni datove zdroje.

### Priorita 2: nove clanky

3. `drafts/clanek-reforma-intenzivni-pece-2026.html`
   - Pracovni titulek: "Prilis mnoho JIP luzek, prilis malo vysledku. Co ma zmenit reforma intenzivni pece"
   - Tvrzeni: Cesko ma velmi hustou sit IP luzek, ale nizkou obloznost a problematicke dlouhodobe vysledky u casti pacientu.
   - Core numbers: 5 727 IP luzek; ARO vyuziti 65 %, JIP 61 %; nevyuzite OD ARO 104 883, JIP 698 369; preziti >1 rok po UPV >2 dny u dospelych 51,2 %, u 85+ 16,9 %.
   - Vysvetlit ACP, EWS/MET, koordinacni dispecink, multioborove JIP, narodni QI.
   - Linked indicators: `luzka_jip_per_100k` + nove navrzene `obloznost_intenzivni_pece_pct`, `preziti_1rok_po_upv_2d_pct`, `nevyuzite_osetrovaci_dny_ip`.

4. `drafts/clanek-interna-regionalni-nemocnice-starnuti.html`
   - Pracovni titulek: "Interna jako pater starnouciho Ceska. Proc oblastni nemocnice nesmi spadnout mezi zidle"
   - Tvrzeni: Demografie zvysi poptavku po komplexni akutni peci o polymorbidni seniory; interna je hlavni vstupni obor.
   - Core numbers: 339 722 internich hospitalizaci, 72,2 % pacientu 65+, 8 807 luzek; high-risk geriatricti 75+ 75 603 v roce 2024 -> 118 377 v roce 2035 -> 150 963 v roce 2050.
   - Vysvetlit rozdil mezi specializovanou a vseobecnou internou.
   - Linked indicators: `multimorbidita_65plus`, `polypragmazie_65plus`, `postele_akutni_per_1000`, nove `podil_senioru_na_internich_hospitalizacich`, `geriatricti_pacienti_vysoke_riziko_75plus`.

5. `drafts/clanek-regionalni-predikce-socialne-zdravotni-pece.html`
   - Pracovni titulek: "Predikce az na ORP. Proc zdravotnictvi a socialni sluzby potrebuji stejnou mapu starnuti"
   - Tvrzeni: Integrace dat NZIS, MPSV, CSSZ a Uradu prace ma poprve umoznit regionalni planovani LTC, PSS, neformalni pece a zaveru zivota.
   - Core numbers: PnP III-IV 75+ 115 442 v roce 2024 -> 211 347 v roce 2040 -> 240 666 v roce 2050; 85+ 62 384 -> 146 348 -> 165 144.
   - Upozornit, ze nejde jen o zdravotnictvi, ale o kapacity pobytovych/terenich socialnich sluzeb, home care a neformalnich pecujicich.
   - Linked indicators: `pracovnici_ltc_per_100_65plus`, `multimorbidita_65plus`, nove `pnp_iii_iv_75plus_predikce`, `dlouhodoba_osetrovatelska_pece_predikce`.

6. `drafts/clanek-osetrovatelska-narocnost-cz-drg.html`
   - Pracovni titulek: "Sestra neni konstanta. Proc musi CZ-DRG zohlednit osetrovatelskou narocnost pacienta"
   - Tvrzeni: Kategoriemi 3-5 lze uz dnes merit narocnost hospitalizovanych pacientu; geriatrie a interna maji vysoky podil takovych pacientu a vysoke OD na uvazek sestry.
   - Core numbers: prumer podilu kat. 3-5 cca 51,1 %; interna v grafu vysoko; interni oddeleni cca 575 OD / uvazek sestry / rok vs. prumer 406.
   - Vysvetlit, proc stejne DRG nemusi znamenat stejnou narocnost osetrovatelskeho tymu.
   - Linked indicators: nove `podil_pacientu_kategorie_3_5`, `osetrovaci_dny_na_uvazek_sestry`, `obloznost_interna_standard_pct`.

### Priorita 3: volitelne pozdeji

7. `drafts/clanek-personalni-evidence-nrzp-smlouvy.html`
   - O nutnosti overovat zdravotnicke pracovniky ve smlouvach se ZP pres NRZP.
   - Vazba na samostatna ICP pro operacni a porodni saly.
   - Vysoke riziko bez overenych dat; spis explainer nez clanek.

8. `drafts/clanek-indiko-kvalita-onkologie-regiony.html`
   - O INDIKO/NZIP a indikatorech kvality, napr. cas do zahajeni lecby karcinomu plic podle regionu.
   - Zverejnit az po dohledani konkretniho datasetu a metodiky.

## Navrzene indikatory

Nepridavej vse najednou. Prioritne zaveď 6-8 indikaturu, ktere podpori nove clanky.

### Pridat jako nove indikatory

1. `obloznost_intenzivni_pece_pct`
   - Nazev: "Využiti luzek intenzivni pece"
   - Area: `Procesy`
   - Domain: `Intenzivni pece`
   - Dimension: `efektivita`
   - Unit: `%`
   - Direction: `context_dependent` nebo `higher_is_better` s opatrnosti
   - Seed: ARO 65 %, JIP 61 %; agregat CR lze dat 62-65 % podle zvolene metodiky.
   - Zdroj: NRHZS 2024 / prezentace reforma IP; primary source NZIP intenzivni pece.

2. `preziti_1rok_po_upv_2d_pct`
   - Nazev: "Přežití 1 rok po UPV delší než 2 dny"
   - Area: `Výsledky`
   - Domain: `Intenzivni pece`
   - Dimension: `kvalita`
   - Unit: `%`
   - Direction: `higher_is_better`
   - Seed: dospeli 51,2 %; 65-74 let 48,5 %; 75-84 let 34,7 %; 85+ 16,9 %.
   - Method notes: jde o vysoce rizikovy outcome, musi vysvetlit case-mix a vekovou strukturu.

3. `nevyuzite_osetrovaci_dny_ip`
   - Nazev: "Nevyužité ošetřovací dny intenzivní péče"
   - Area: `Procesy`
   - Domain: `Intenzivni pece`
   - Dimension: `efektivita`
   - Unit: `OD / rok`
   - Direction: `lower_is_better`
   - Seed: ARO 104 883; JIP 698 369 v roce 2024.
   - Pozor: vysvetlit, ze 100% vyuziti neni cil; nutna je rezerva pro spicky a krizove situace.

4. `obloznost_interna_standard_pct`
   - Nazev: "Využiti akutních standardních lůžek vnitřního lékařství"
   - Area: `Procesy`
   - Domain: `Luzkova pece`
   - Dimension: `efektivita`
   - Unit: `%`
   - Direction: `context_dependent`
   - Seed: celkem 66,1 %, FN 68,7 %, krajske 61,4 %, oblastni 65,9 %.
   - Method notes: cilovy efektivni rozsah podle prezentace 75-95 %, ale neni to mechanicky benchmark pro kazde pracoviste.

5. `podil_senioru_na_internich_hospitalizacich`
   - Nazev: "Podíl pacientů 65+ na interních hospitalizacích"
   - Area: `Výstupy`
   - Domain: `Luzkova pece`
   - Dimension: `dostupnost`
   - Unit: `%`
   - Direction: `context_dependent`
   - Seed: 72,2 % v roce 2023.
   - Linked article: interna / starnuti.

6. `geriatricti_pacienti_vysoke_riziko_75plus`
   - Nazev: "Geriatričtí pacienti 75+ s vysokým rizikem ztráty soběstačnosti"
   - Area: `Výsledky`
   - Domain: `Starnuti a zatez nemoci`
   - Dimension: `zdravi`
   - Unit: `osoby`
   - Direction: `lower_is_better` nebo `context_dependent`
   - Trend: 2020 61 150; 2024 75 603; 2030 98 702; 2035 118 377; 2040 132 941; 2050 150 963.
   - Pozor: jde o predikci, ne historickou radu; `verification_status` nastav `preliminary` nebo pouzij samostatny metodicky note.

7. `podfinancovani_oblastni_interna_cm`
   - Nazev: "Rozdíl úhrady a nákladu u interny v oblastních nemocnicích"
   - Area: `Struktury`
   - Domain: `Financovani luzkove pece`
   - Dimension: `efektivita`
   - Unit: `Kč / CM bod`
   - Direction: `context_dependent`
   - Seed: -8 881 Kc / CM; vysvetlit, ze negativni hodnota znamena uhrada pod modelem nakladu RN.
   - Benchmark: bez OECD.
   - Upozorneni: vysoky politicky risk, musi mit silny method note.

8. `osetrovaci_dny_na_uvazek_sestry`
   - Nazev: "Ošetřovací dny na 1 úvazek sestry"
   - Area: `Procesy`
   - Domain: `Pracovni sila`
   - Dimension: `bezpecnost`
   - Unit: `OD / úvazek / rok`
   - Direction: `lower_is_better` nebo `context_dependent`
   - Seed: prumer 406; interna cca 575 podle grafu.
   - Pozor: mezioborova interpretace je slozita; metodicky explicitne vysvetlit limity.

### Spis update existujicich nez nove

- `luzka_jip_per_100k` - aktualizovat metodickou kartu o NRHZS 2024 a oddelit celkovy pocet luzek IP od OECD definice ICU.
- `pracovnici_ltc_per_100_65plus` - rozsirit o socialne-zdravotni predikce z NZIP/SZD.
- `uhrada_zp_per_pojistenec`, `podil_vydaje_luzkova_pece`, `podil_vydaje_ambulantni_pece` - provazat s novym DŘ/VBHC obsahem.
- `multimorbidita_65plus`, `polypragmazie_65plus` - provazat s internou a geriatrii.

## Datova a redakcni kvalita

Pro kazdy novy clanek:

- Pridej `article-source-note` s jasnym rozlisenim:
  - deck / prezentace jako zdroj kontextu,
  - primarni dataset / dokument pro publikacni cisla,
  - co je predikce, co pozorovana hodnota, co interpretace.
- Pridej aspon jeden "evidence box" nebo malou tabulku:
  - Hodnota CR / rok / zdroj / metodicka poznamka.
- U legislativnich clanku pridej "Chronologie".
- U reformnich clanku pridej "Co se ma merit po reforme" s navazanymi indikatory.
- Neuvadej tvrzeni "reforma vyresi" bez meritelneho indikatoru a ciloveho casu.
- Nepouzivej mediální claimy bez primarniho odkazu.
- Kde jsou hodnoty jen ze slidove prezentace, oznac jako `review-pending`.

## Implementacni kroky pro Claude Code

1. Projdi `CLAUDE.md`, `05_M1_Starter/README.md`, `src/clanky.js`, `src/indicator.js`, `ingest/validate.js`.
2. Zkontroluj existujici drafty a rozhodni, ktere se maji aktualizovat misto vytvareni duplicity.
3. Vytvor/aktualizuj clanky v `05_M1_Starter/drafts/`.
4. Priprav minimalni sada indikaturu:
   - `obloznost_intenzivni_pece_pct`
   - `preziti_1rok_po_upv_2d_pct`
   - `obloznost_interna_standard_pct`
   - `podil_senioru_na_internich_hospitalizacich`
   - `geriatricti_pacienti_vysoke_riziko_75plus`
   - `podfinancovani_oblastni_interna_cm`
5. U kazdeho indikaturu vytvor metodickou kartu a zkontroluj, ze `method_card_url` funguje.
6. Pokud pridavas `data/regions.json`, dej vzdy vsech 14 kraju; pokud nemas overena krajska data, regiony nepridavej.
7. Dopln `data/articles.json` jen pro clanky, ktere maji byt viditelne v listingu. Drafty nech mimo nebo s `published:false`.
8. Spust:

```bash
cd 05_M1_Starter
npm test
npm run validate:all
```

9. V PR popisu uveď:
   - seznam novych/menenych clanku,
   - seznam novych/menenych indikaturu,
   - ktere hodnoty jsou overene vs. preliminary,
   - jake zdroje je nutne rucne overit pred publikaci.

## Acceptance criteria

- Nejsou duplicitni clanky k uz existujicim draftum.
- Kazdy novy indikator ma metodickou kartu.
- `npm test` prochazi.
- `npm run validate:all` prochazi.
- Vsechny publikovane clanky maji `linked_indicators`.
- Drafty s neoverenymi cisly zustavaji `noindex` / `published:false`.
- U dat z prezentaci je uveden source note a nehraje se to jako produkcni open-data ingest.
- Zadny novy clanek netvrdi pricinnou souvislost bez explicitniho zdroje nebo metodickeho omezeni.

## Poznamka k fakt-checku

Nejvetsi riziko neni implementace, ale fakticka presnost. Decky jsou silne, ale nektere hodnoty jsou modelace nebo pracovni analyticke vystupy. Pred publikaci zejmena over:

- pravni stav navrhovane zmeny §17 a jestli nejde pouze o predbezny navrh,
- presnou metodiku ICU/IP luzek v OECD vs. NRHZS,
- definici "preziti 1 rok po UPV >2 dny" a case-mix adjustment,
- zda podfinancovani oblastnich nemocnic podle RN dat je publikovatelny udaj,
- zda predikce ORP/SZD jsou jiz verejna open data, nebo jen projektovy vystup.
