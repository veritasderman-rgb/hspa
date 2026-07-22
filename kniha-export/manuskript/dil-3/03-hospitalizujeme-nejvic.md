---
slug: hospitalizujeme-nejvic
dil: 3
poradi: 3
audit: verified
stitky: Nemocniční péče, Lůžka · JIP · ALOS · day surgery
---

# Osmnáct tisíc hospitalizací na sto tisíc obyvatel. Proč Česko leží v nemocnicích nejvíc v OECD

**Vysoká míra hospitalizací není sama o sobě špatná zpráva. Některé z těch hospitalizací byly v daném okamžiku medicínsky správné a pacientovi prospěly. Co je problém, je to, že v evropském srovnání část z nich představuje výkony, které sousední země zvládají ambulantně, jednodenně nebo v primární péči — bez týdenního pobytu na lůžku. Strukturálně to znamená, že lůžková kapacita zaměstnává personál a zdroje, které by jinde mohly posílit primární péči, prevenci a chronickou dispenzární práci.**

Vysoká míra hospitalizací není sama o sobě špatná zpráva. Některé z těch hospitalizací byly v daném okamžiku medicínsky správné a pacientovi prospěly. Co je problém, je to, že v evropském srovnání část z nich představuje výkony, které sousední země zvládají ambulantně, jednodenně nebo v primární péči — bez týdenního pobytu na lůžku. Strukturálně to znamená, že lůžková kapacita zaměstnává personál a zdroje, které by jinde mohly posílit primární péči, prevenci a chronickou dispenzární práci.


> [[GRAF: Česko a hospitalizace — nadhodnocený lůžkový systém]]
> _Podklad:_ Česko a hospitalizace — nadhodnocený lůžkový systém 17 990 / 100k hospitalizace v ČR (2024) OECD průměr 14 600; ÚZIS NRH (origin: live, verified) 6,4 lůžek nemocničních lůžek / 1 000 obyv. OECD průměr 4,2 (HAG 2025); vč. následných a psych. 44,6 / 100k lůžka intenzivní péče (adult ICU) OECD průměr 18; ESICM ~40, NRHZS ~52 — viz caveat 592 / 100k odvratitelné hospitalizace (ACSC) OECD průměr 473 (HAG 2025, ref. 2021/22) Zdroj: OECD Health at a Glance 2025 (hospital beds and occupancy, avoidable hospital admissions), dashboard HSPA Monitoru (ÚZIS NRH + OECD Health Statistics, origin: live, verif…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Caveat — co se srovnává a co ne

**Hospitalizace 17 990/100k (ČR) vs. 14 600/100k (OECD průměr).** Levá hodnota pochází z dashboardu HSPA Monitoru a je nově (vlna fetched 6/2026) napojená na ÚZIS NRH jako `origin: live` s `verification_status: verified` (hodnota za rok 2024; trend 2022 → 2024: 17 887 → 17 988 → 17 990). ÚZIS *Hospitalizovaní v nemocnicích ČR 2019* přitom v primární publikaci uvádí 22 280 hospitalizací na 100 000 obyvatel (všechna oddělení nemocnic včetně následné péče) — širší definice. OECD *discharges* (HAAG 2025) započítává *ukončené hospitalizační epizody* v akutní lůžkové péči, tj. užší definice. Hodnoty proto nejsou plně apples-to-apples; směrový rozdíl (Česko nad OECD průměrem) i absolutní hodnota ÚZIS jsou doložené.

**Lůžka intenzivní péče cca 40/100k (ČR) vs. cca 17/100k (OECD průměr).** OECD HAAG 2025 / HCQI počítá ICU lůžka standardizovaně podle ESICM klasifikace (úrovně 2 a 3, tj. plnohodnotná intenzivní a resuscitační lůžka pro dospělé). Česká NRHZS publikace (ÚZIS / prezentace prof. Duška 13. 5. 2026) reportuje pro 2024 širší IP definici: 821 lůžek ARO + 4 906 lůžek JIP = 5 727 lůžek (cca 52/100k), která zahrnuje i 1. úroveň oborových JIP nesplňujících ESICM 2./3. úroveň. *Zdravotnický deník* (3/2026) cituje hodnotu cca 40 ICU/100k pro ČR po ESICM standardizaci. Dashboard HSPA Monitoru nově (6/2026) používá ověřenou hodnotu OECD *adult ICU* = **44,6 / 100k** (OECD ⌀ 18), tj. harmonizovanou definici ležící mezi úzkou ESICM (~40) a širokou ÚZIS kategorií (~52).

**ALOS 7 dní (ČR) vs. 6,5 dne (OECD průměr).** ČSÚ Healthcare 2024 i ÚZIS NRH (2019) shodně uvádějí pro akutní lůžkovou péči v ČR průměrnou ošetřovací dobu kolem 5,5–6,0 dne (5,5 dne 2024 dle ČSÚ; 6,0 dne 2019 v nemocnicích, 8,0 dne včetně oddělení následné péče dle NRH). Dashboardová hodnota 7 dní pravděpodobně agreguje akutní i následnou péči a neodpovídá OECD definici acute care ALOS. Rozdíl proti OECD průměru je tedy menší, než článek původně tvrdil; směrový závěr (ČR pomalejší propouštění než nejlepší DRG systémy) zůstává platný.

**Odvratitelné hospitalizace (ACSC) 592/473.** Aktualizováno proti audit revisi sourozeneckého článku vyhnutelne-hospitalizace (15. 5. 2026); dříve 580/480. Zdroj: OECD *Health at a Glance* 2025, kapitola *Avoidable hospital admissions*, ref. rok 2021/2022, age-sex standardizováno. Eurostat publikuje příbuzný, ale odlišný indikátor — avoidable mortality (úmrtí, nikoli hospitalizace).


### Co měříme a co to znamená

Indikátor `hospitalizace_na_100k` zachycuje akutní hospitalizace všech diagnóz (bez porodů) na 100 000 obyvatel za rok ze Národního registru hospitalizovaných. Limitace, kterou metodická karta uvádí: srovnání je ovlivněno definicí akutního lůžka, různým započítáváním denní chirurgie a místní preferencí ambulantní vs. lůžkové péče. Ne všechny rozdíly mezi zeměmi jsou tedy reálné medicínské rozdíly. Část je metodická — viz *caveat* výše.

Šest čísel ale jeden vzor potvrzuje. Akutních lůžek (4,0 vs. 3,5 na tisíc obyvatel), lůžek intenzivní péče (cca 40 vs. cca 17 na 100 000 podle ESICM standardu — dvojnásobek až trojnásobek dle použité definice), průměrné délky hospitalizace (5,5–7 dní vs. 6,5 v průměru OECD) a samotné míry hospitalizací (17 990 vs. 14 600 / 100 000) jsou všechno ukazatele směřující ke stejnému závěru. Česko je strukturálně postavené na lůžkové péči víc než většina OECD. JIP indikátor je zvlášť výrazný; metodická karta `luzka_jip_per_100k.json` výslovně upozorňuje, že definice JIP se v zemích liší (úrovně 1/2/3 podle ESICM klasifikace) a standardizace OECD běží teprve od 2020 — i s touto výhradou je dvojnásobek až trojnásobek vs. evropský průměr významný strukturální fakt.

Pro úplnost: sám indikátor `hospitalizace_na_100k` je v dashboardu označen jako *neutral* — není to indikátor kvality, je to indikátor využití systému. Zda 17 990 znamená „lépe pečujeme" nebo „nadužíváme lůžka", se z čísla přímo nevyčte. Kontext z článků o ACSC a o ambulantních kontaktech ukazuje, že jde primárně o druhou interpretaci: chronicky nemocní končí v nemocnici častěji, než by museli.


### Tři vrstvy, kde se hospitalizační rozdíl rodí

Mezinárodní srovnávací studie OECD a Eurostat opakovaně rozkládají rozdíl v hospitalizační míře mezi zeměmi do tří strukturálních vrstev.


> [[GRAF: Tři vrstvy, ze kterých se rodí český hospitalizační náskok nad OECD]]
> _Podklad:_ Tři vrstvy, ze kterých se rodí český hospitalizační náskok nad OECD Vrstva O co jde Co by to řešilo Ambulantně řešitelné stavy (ACSC) 592 vs. 473/100k — diabetes, CHOPN, srdeční selhání, hypertenze, astma; primární péče je nezachytila včas silnější primární péče a dispenzarizace chroniků Lůžko místo jednodenní chirurgie výkony, které jinde běží jako day case (katarakta, laparoskopie, endoskopie), u nás končí nocí v nemocnici úhrada zvýhodňující day case + ambulantní chirurgická pracoviště Sociální lůžko v nemocnici pacient zůstává na akutním lůžku, protože chybí místo v sociálních službách („t…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

**Hospitalizace pro stavy, které mají být řešeny ambulantně.** ACSC indikátor (592 / 100 000 vs. OECD průměr 473 podle *OECD Health at a Glance* 2025, ref. rok 2021/2022, age-sex standardizováno) tento jev kvantifikuje pro pět chronických diagnóz — diabetes, CHOPN, srdeční selhání, nekomplikovanou hypertenzi a astma. V Česku tyto pacienty častěji než ve srovnatelných zemích hospitalizujeme proto, že primární péče jejich stav nezvládla zachytit a stabilizovat dřív. Souvislost se sourozeneckým článkem vyhnutelne-hospitalizace této redakční řady je přímá: část hospitalizační rezervy proti OECD se schovává právě tam.

**Lůžková péče místo jednodenní chirurgie a ambulantních zákroků.** Velká část výkonů, které v Česku probíhají s nocí v nemocnici, se v moderních evropských systémech provádí jako *day case* — pacient přijde ráno, výkon proběhne, pacient odchází odpoledne nebo večer domů. Britská NHS používá tento model standardně pro řadu výkonů (kataraktové operace, většina laparoskopické chirurgie, část urologických výkonů, gastroenterologické endoskopie). Skandinávie a Nizozemsko jdou stejnou cestou. Český systém má jednodenní chirurgii institucionalizovanou méně důsledně — úhradové mechanismy ji v některých případech nezvýhodňují, kapacita ambulantních chirurgických pracovišť je nerovnoměrná a část pacientů i lékařů je zvyklá na tradiční hospitalizační režim.

**Sociální lůžko v nemocnici.** Třetí vrstva, kterou popisuje samostatný článek o zdravotně-sociálním pomezí, představuje pacienty, kteří v lůžkové péči zůstávají déle, než by museli — protože se nedaří najít místo v zařízení sociálních služeb. Tato „technická hospitalizace" generuje akutní lůžko-dny i přesto, že její medicínský přínos už pominul. Mezinárodní srovnání tento jev v některých zemích omezuje, protože systémy s integrovanou zdravotně-sociální péčí (NHS Better Care Fund, nizozemská Wmo) tlačí na rychlejší přechod do následné péče.


### Co Česko v lůžkové péči naopak dělá dobře

Pro vyváženost: vyšší dostupnost akutních lůžek a JIP má i své pozitivní stránky. Pacient s akutní příhodou (cévní mozková příhoda, akutní infarkt myokardu, polytraumata) má v Česku rychlý přístup k specializovanému lůžku, čekací doba na akutní hospitalizaci je nízká a pandemie covidu ukázala, že vysoká rezerva JIP kapacity má v krizových situacích skutečnou hodnotu — některé západoevropské země v jarní vlně 2020 narazily na strop, zatímco česká JIP síť pacienty zvládla absorbovat. Indikátor JIP lůžek je tedy ambivalentní: vysoké číslo znamená nákladnou kapacitu, ale i odolnost systému proti šokům.

Druhým systémovým plus je síť specializovaných center — kardiocentra (článek 5), iktová centra (článek 8), komplexní onkologická centra. Hospitalizace v těchto centrech jsou klinicky odůvodněné a jejich výsledky v evropském srovnání obstojí. Co stahuje celkovou hospitalizační statistiku nahoru, jsou diagnózy mimo specializovaná centra — obecná interna, gastroenterologie, plicní lékařství, geriatrie — kde se v ČR hospitalizuje víc, než by bylo v moderním systému nutné.


### Co dělají systémy s nižší mírou hospitalizací


> [[GRAF: Míra hospitalizací na 100 000 obyvatel — ČR vs. referenční systémy]]
> _Podklad:_ Míra hospitalizací na 100 000 obyvatel — ČR vs. referenční systémy Zdroj: ÚZIS NRH (ČR); OECD Health at a Glance 2025 (discharges). Severská hodnota odvozena z −25 až −30 % vůči ČR uvedených v textu.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

**Skandinávie** — Norsko, Švédsko, Dánsko, Finsko — postupně od 90. let snižuje počet akutních lůžek a posiluje primární péči, domácí péči a komunitní zdravotní centra. Hospitalizace v severských zemích jsou řádově o 25–30 procent nižší než v Česku, při srovnatelných výsledcích zdraví populace. Klíčem je „step-down" filozofie — pacient, který není kandidátem na akutní lůžko, dostane péči v sub-akutním nebo komunitním zařízení, ne v nemocnici plné akutních resorts.

**Velká Británie** rozvíjí *day case surgery* dvě dekády. NHS data dlouhodobě sledují, kolik procent vybraných výkonů (BADS — British Association of Day Surgery seznam diagnóz) proběhne jednodenně. Pro mnohé výkony je tento podíl přes 90 procent — pacient po operaci kýly, kataraktové operaci nebo laparoskopické cholecystektomii odchází domů ten samý den. Český podíl jednodenní chirurgie u stejných výkonů je nižší.

**Nizozemsko** používá strukturu, ve které se přechod mezi lůžkovou a ambulantní péčí řídí silnou rolí *huisarts* (rodinného lékaře) a koordinovanou domácí péčí. Hospitalizace pro chronicky nemocné (článek 19) jsou v Nizozemsku výrazně nižší díky *care groups* s bundled payment — finanční motivací udržet pacienta v ambulantní léčbě.

**Německé G-DRG** mělo na ALOS významný efekt. Po zavedení DRG od 2003–2004 průměrná délka hospitalizace v Německu výrazně klesla, protože systém přestal odměňovat den pobytu a začal odměňovat výkon a diagnózu. Český systém DRG pilotně používá, ale plné nasazení s motivací zkrátit ALOS bez kompromisu kvality stále nemá. ČSÚ pro 2024 uvádí průměrnou ošetřovací dobu v české akutní lůžkové péči 5,5 dne (oproti 6,6 dne v 2010), tedy v segmentu akutní péče se ČR průměru OECD blíží; rozdíl proti dashboardové hodnotě 7 dní pramení z širší agregace včetně oddělení následné péče. I tak platí, že posun každého zbytečného lůžko-dne směrem k modernímu DRG režimu znamená v součtu napříč 1,8+ milionu hospitalizací významnou úsporu kapacit.


### Co Česko realisticky může

Reformní balíček, který by hospitalizační statistiku posunul směrem k evropskému průměru, kombinuje několik propojených kroků, kterým se věnuje řada manifestů a reformních dokumentů.

Za prvé, **posílení primární péče a snížení ACSC** — viz samostatný článek 19. Každý chronicky nemocný, který nezhorší stav natolik, že by skončil v nemocnici, je ušetřená hospitalizace.

Za druhé, **institucionalizace jednodenní chirurgie**. To znamená úhradovou vyhlášku, která day case nezvýhodňuje vůči standardní hospitalizaci pro vybrané výkony, a investici do dedikovaných ambulantních chirurgických pracovišť. České model úhradové vyhlášky day case dnes umožňuje, ale strukturální motivace k jeho rozšíření chybí.

Za třetí, **integrovaná zdravotně-sociální péče** po vzoru britského Better Care Fund nebo nizozemské Wmo. Pacient, který v nemocnici zůstává „na sociálním lůžku", protože není kam ho propustit, generuje pro systém jak medicínské, tak rozpočtové náklady. Vyřešení tohoto problému je úkol pro MZ a MPSV současně, ne pro jeden z těchto resortů.

Za čtvrté, **zrychlení přechodu na DRG**, který odměňuje výkon a diagnózu, ne den pobytu — tomu se věnuje samostatný článek o reformě úhradové vyhlášky a manifest.


### Co s tím

Pro pacienta, kterému lékař navrhuje hospitalizaci pro plánovaný výkon: stojí za to se zeptat, jestli daný výkon nelze provést jednodenně. U řady standardních zákroků (laparoskopická cholecystektomie, hernie, kataraktová operace, gastroskopie, kolonoskopie) je day case dnes možný i v ČR — některá pracoviště ho nabízejí, jiná raději hospitalizují. Volba poskytovatele s aktivní praxí jednodenní chirurgie znamená pro pacienta menší riziko nemocniční infekce, rychlejší rekonvalescenci doma a méně narušení pracovní rutiny.

Pro tvůrce politik je sdělení, že vysoká hospitalizační míra v Česku není ukazatel dobré dostupnosti — je to ukazatel struktury, ve které se ambulantní a lůžková péče nepoměřují čistě podle medicínské potřeby. Posun směrem k evropskému průměru znamená méně lůžek, kratší pobyty, víc jednodenní chirurgie a silnější primární péči. To je politicky náročné — redukce lůžek se v regionech vždy jeví jako „rušení nemocnic", i když znamená modernizaci péče. V evropské zkušenosti je to ale jediná cesta, jak peníze, lékaře a sestry uvolnit pro vrstvy, ve kterých chybí — primární péči, prevenci a komunitní zdravotní služby.


---

### Zdroje

- OECD — Health at a Glance 2025: Hospital activity (kapitola s discharges a ALOS). oecd.org/health-at-a-glance-2025/hospital-activity ↗
- OECD — Health at a Glance 2025: Hospital beds and occupancy (kapitola s počty lůžek, ICU a obsazeností). oecd.org/health-at-a-glance-2025/hospital-beds ↗
- OECD & European Observatory — State of Health in the EU: Czechia Country Health Profile 2025 (září 2025; uvádí 6,4 nemocničních lůžek / 1 000, obsazenost 62 % v 2023, discharges 11 % pod pre-pandemic úrovní). oecd.org/czechia-country-profile-2025.pdf ↗
- Eurostat — Hospital discharges by diagnosis (hlth_co_disch2), dataset permalink. ec.europa.eu/eurostat/hlth_co_disch2 ↗
- ÚZIS — Národní registr hospitalizovaných (NRH/NRHZS), registr a metodika. uzis.cz/narodni-registr-hospitalizovanych ↗
- ÚZIS — Hospitalizovaní v nemocnicích ČR (poslední veřejná publikace 2019; metodika a referenční tabulky). uzis.cz/hospit2019.pdf ↗
- ČSÚ — Healthcare (souhrnný portál; 2024: 160 akutních nemocnic, 49 199 lůžek, ALOS 5,5 dne; ~1,3 mil. hospitalizovaných pacientů). csu.gov.cz/healthcare ↗
- Zdravotnický deník — analýza kapacit JIP a hodnocení ICU vs. následných lůžek (3/2026; cituje 40 ICU/100k pro ČR vs OECD ~17, kritika nadbytečné struktury). zdravotnickydenik.cz ↗
- OECD — Health Care Quality Indicators: Definitions 2022 (definice ACSC, avoidable admissions). oecd.org/HCQI-Definitions.pdf ↗
- British Association of Day Surgery (BADS) — britská referenční organizace pro jednodenní chirurgii a seznam výkonů. daysurgeryuk.net ↗
- ESICM — European Society of Intensive Care Medicine — klasifikace ICU úrovní 1/2/3. esicm.org ↗
- NHS England — Better Care Fund — britský model integrované zdravotně-sociální péče. england.nhs.uk/better-care-fund ↗
- clanek-vyhnutelne-hospitalizace — audit ACSC indikátoru proti OECD HCQI a HAAG 2025 (15. 5. 2026); ACSC 580/480 aktualizováno na 592/473. Tento článek se s revidovanou hodnotou sjednocuje. clanek-vyhnutelne-hospitalizace.html
- Pozn. k údajům: Mezinárodní srovnání lůžkové kapacity je metodicky náročné; trend uvnitř země je robustnější než absolutní hodnoty. Definice akutního lůžka, započítávání denní chirurgie a definice akutní hospitalizace se mezi zeměmi liší. „Vyšší rezerva JIP zvládla covidovou vlnu" je řádový popis, ne kvantitativní studie — pro detail viz reporty SZÚ a ÚZIS k pandemii covidu. Indikátory hospitalizace_na_100k (ÚZIS NRH), luzka_jip_per_100k a postele_akutni_per_1000 (OECD Health Statistics) jsou v `data/indicators.json` nově `origin: live` + verified (vlna fetched 6/2026); prumerna_delka_hospitalizace (ALOS) zůstává `origin: seed` a vyžaduje napojení na NRHZS v navazující datové iteraci.

<!-- Zdroj webu: clanek-hospitalizujeme-nejvic.html · skorezdravotnictvi.cz/clanek-hospitalizujeme-nejvic -->