---
slug: epidemiologie-3-modely-rozhodovani
dil: 5
poradi: 15
audit: verified
stitky: Veřejné zdraví, Seriál o epidemiologii · díl 3/4 · modely a krizové rozhodování
---

# Modely, trasování a krizové rozhodování: jak čísla řídí politiku

**Na jaře 2020 se rozhodovalo o životech milionů lidí podle grafů, kterým většina veřejnosti nerozuměla. Vlády zavíraly školy, ekonomiky i hranice na základě modelů přenosu — soustav rovnic, které předpovídaly, kolik lidí onemocní, pokud se nic neudělá. Byl to největší experiment v dějinách aplikované epidemiologie a zároveň lekce o tom, jak se čísla čtou a jak se zneužívají. Tenhle díl seriálu otevírá černou skříňku: ukazuje, co model umí, co neumí — a proč obojí potřebujete vědět, abyste mu rozuměli.**

Na jaře 2020 se rozhodovalo o životech milionů lidí podle grafů, kterým většina veřejnosti nerozuměla. Vlády zavíraly školy, ekonomiky i hranice na základě modelů přenosu — soustav rovnic, které předpovídaly, kolik lidí onemocní, pokud se nic neudělá. Byl to největší experiment v dějinách aplikované epidemiologie a zároveň lekce o tom, jak se čísla čtou a jak se zneužívají. Tenhle díl seriálu otevírá černou skříňku: ukazuje, co model umí, co neumí — a proč obojí potřebujete vědět, abyste mu rozuměli.


> [[GRAF: Modely a opatření v číslech — co dokázala spočítat věda]]
> _Podklad:_ Modely a opatření v číslech — co dokázala spočítat věda 40–90 % o tolik protiepidemická opatření snižují přenos covidu-19 přehled 61 studií, 2024 19,8 mil. úmrtí odvráceno očkováním proti covidu za 1. rok dle nadúmrtí; 14,4 mil. dle hlášených úmrtí 1 hranice reprodukčního čísla, o kterou se vše hraje R > 1 roste, R < 1 vyhasíná 49 % účinnost preventivní léčby u trasovaných kontaktů (TBC) metaanalýza 439 644 účastníků Zdroj: NPI 40–90 % — Faherty et al. (2024); očkování proti covidu — Watson et al. (2022); trasování/preventivní léčba — Martinez et al. (2024). Plné citace s DOI v sekci Zdroje.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Kompartmentový model: jak se „nasimuluje“ epidemie

Základní nástroj epidemiologie infekcí se jmenuje **SEIR** podle čtyř skupin (kompartmentů), do kterých rozdělí celou populaci: **S**usceptible (vnímaví, mohou onemocnět), **E**xposed (nakažení, ještě ne nakažliví), **I**nfectious (nakažliví) a **R**ecovered (uzdravení a imunní). Model pak pomocí rovnic počítá, jak lidé den po dni přetékají z jedné skupiny do druhé. Rychlost přetékání ze S do E řídí — jak jinak — reprodukční číslo a počet kontaktů. Je to stejný princip jako u Snowovy mapy, jen místo teček na papíře jsou to proměnné v čase.


> [[GRAF: Model SEIR — kudy populace „přetéká“ během epidemie]]
> _Podklad:_ Model SEIR — kudy populace „přetéká“ během epidemie S — vnímaví Lidé, kteří nemoc ještě neprodělali ani nejsou očkovaní. Na začátku epidemie skoro celá populace. E — nakažení (inkubace) Už mají virus, ale ještě nenakazí ostatní. Délka tohoto stavu (inkubační doba) určuje, jak rychle se vlna rozjede. I — nakažliví Šíří nákazu dál. Kolik dalších nakazí, určuje reprodukční číslo. Tady se rozhoduje, jestli epidemie poroste, nebo opadne. klíčový kompartment R — uzdravení (imunní) Prodělali nemoc nebo jsou očkovaní. Ubývají z hry — a čím víc jich je, tím hůř se virus šíří. Tady vzniká kolektivní imu…
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Klíčový je rozdíl mezi R₀ z prvního dílu a tzv. **efektivním reprodukčním číslem R(t)**. R₀ platí pro populaci bez imunity na začátku. Jakmile část lidí onemocní nebo se naočkuje a jakmile zavedeme opatření, skutečné šíření klesá — a měříme ho právě R(t). Celá pandemická politika se dá shrnout do jediné věty: **dostat R(t) pod jedničku a udržet ho tam co nejmenším nákladem.**

Vyzkoušejte si to — postavte si vlastní epidemii

V režimu [Sandbox](https://nedovarenytapir.cz/#/sandbox) na simulátoru Nedovařený tapír si poskládáte vlastní SEIR model: nastavíte inkubační dobu, dobu nakažlivosti a reprodukční číslo a hned vidíte tvar epidemické křivky. Sledujte, jak se mění vrchol vlny a kdy R(t) protne jedničku — tedy okamžik, po kterém epidemie začíná opadat.


### Fungují opatření? Důkaz z celé Evropy

Nejčastější spor pandemie zněl: měla protiepidemická opatření (tzv. NPI — non-pharmaceutical interventions) vůbec smysl? Epidemiologie na to odpověděla daty. Studie publikovaná v *Nature* analyzovala 11 evropských zemí v první vlně roku 2020 a dospěla k závěru, že zavedená opatření — především lockdowny — stlačila reprodukční číslo **pod jedničku** ve všech sledovaných zemích a získala kontrolu nad epidemií. Pozdější přehled 61 studií ze čtyř zemí to upřesnil: jednotlivá mírná opatření snižovala efektivní reprodukční číslo zhruba o **10–50 %**, zatímco komplexní lockdowny o **40–90 %**, často kolem 70–80 %.


> [[GRAF: O kolik opatření snižují efektivní reprodukční číslo (orientační rozsahy)]]
> _Podklad:_ O kolik opatření snižují efektivní reprodukční číslo (orientační rozsahy) Zdroj: Faherty et al. (2024), Front Public Health (rozpětí účinnosti dle síly opatření); Flaxman et al. (2020), Nature (lockdowny stlačily R pod 1 v 11 zemích). Hodnoty jsou orientační rozsahy z přehledu studií, ne jediné „pravé“ číslo. DOI níže.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._

Důležité je číst to správně: opatření nejsou kouzlo, ale ani placebo. Mají měřitelný účinek, který se liší podle jejich síly a podle toho, jak se dodržují. A mají cenu — ekonomickou, sociální i na lidské důvěře. Epidemiologie umí spočítat ten první sloupec (o kolik klesne R), ale rozhodnutí, jestli ta cena stojí za to, je politické. Právě tohle napětí dělá z krizového rozhodování tak těžkou disciplínu.

Vyzkoušejte si to — sedněte si do krizového štábu

Ve hře [Krizový štáb](https://nedovarenytapir.cz/#/hra/krizovy-stab) řídíte zemi během epidemie: vybíráte z desítek opatření, sledujete reprodukční číslo, kapacitu nemocnic — a zároveň politický a ekonomický účet. Zjistíte, že každé opatření, které srazí R, něco stojí, a že lidé ho po čase přestávají dodržovat. Je to ten nejhmatatelnější způsob, jak pochopit, proč „prostě to zavřít“ nebo „prostě otevřít“ nikdy nebyla snadná volba.


### Trasování kontaktů: cílit místo plošně

Když je plošný lockdown drahý, nabízí se chirurgická alternativa: najít nakažené a jejich kontakty dřív, než stihnou nakazit další. To je **trasování kontaktů** — přímý potomek Snowovy detektivní práce. Jeho síla je v cílenosti: místo aby se omezovali všichni, izolují se jen ti, kdo nákazu skutečně mohou šířit. Že to funguje, ukazuje například rozsáhlá metaanalýza tuberkulózy: preventivní léčba podaná trasovaným kontaktům snížila riziko onemocnění o **49 %** napříč 439 644 účastníky 32 studií, u kontaktů s prokázanou infekcí ještě výrazněji.

Trasování má ale své limity: funguje jen, dokud je případů málo a dokud je systém stíhá dohledat. Jakmile počty explodují, kapacita trasovačů se vyčerpá — a tehdy nezbývá než sáhnout po plošnějších opatřeních. Modely pomáhají poznat přesně ten zlom, kdy trasování přestává stačit. To je další příklad toho, jak čísla přímo řídí volbu nástroje.

Vyzkoušejte si to — trasování na telefonu

Ve hře [Ósacká horečka](https://nedovarenytapir.cz/#/hra/osacka) dostanete omezený rozpočet a desítky kontaktů — a musíte vytelefonovat, kdo koho nakazil, najít „nultého pacienta“ a odhalit superpřenašečské události. Narazíte přitom na skutečný problém trasování: nikdy nemáte dost zdrojů na to, abyste prověřili každého, takže musíte sázet na ty nejpravděpodobnější.


### Když dorazila vakcína: 14 až 20 milionů životů

Modely posloužily i k tomu, aby se zpětně spočítalo, co očkování proti covidu skutečně přineslo. Studie v *Lancet Infectious Diseases* odhadla, že jen za **první rok** očkování (prosinec 2020 – prosinec 2021) odvrátilo ve 185 zemích **14,4 milionu** úmrtí podle oficiálně hlášených covidových úmrtí, a až **19,8 milionu**, pokud se počítá s nadúmrtností (která lépe zachycuje skutečný rozsah pandemie). To je v prvním roce globální snížení počtu úmrtí o zhruba 63 %. Studie zároveň upozornila, že nerovný přístup k vakcínám v chudších zemích tento přínos výrazně omezil — což je samo o sobě epidemiologické zjištění s politickými důsledky.


### Proč i nejlepší model může klamat

Tady je nutná upřímnost, kterou poctivá epidemiologie nikdy nevynechává: **model není věštba**. Je to nástroj „co kdyby“, který říká, co by se stalo za určitých předpokladů. Když se předpoklady změní — třeba proto, že lidé na základě varování změní chování — předpověď se nenaplní. To ale neznamená, že model selhal; znamená to, že posloužil. Tahle past (model varuje, lidé zareagují, varování se „nenaplní“, model je obviněn z chyby) provázela celou pandemii.

Proto se výstup modelu nikdy nečte jako jedno číslo, ale jako **rozpětí s mírou nejistoty** — intervaly spolehlivosti, scénáře, pásma. A proto platí zlaté pravidlo: model je dobrý sluha při rozhodování, ale špatný pán, pokud se z něj udělá jistota, kterou nikdy neslibuje. I edukační simulátor, na který v tomto seriálu odkazujeme, to říká na rovinu — slouží k pochopení principů, ne k predikci konkrétní reálné epidemie.


### Co to znamená pro Česko

Modely nejsou jen pro pandemie. Tytéž principy se uplatní u běžných ukazatelů, které HSPA Monitor sleduje. [Prevalence nemocničních infekcí](indikator-infekce_nosokomialni.html) je v Česku 6,5 % (2023) — nad průměrem OECD i EU; jde o přenos v uzavřeném prostředí, kde trasování a hygienická opatření rozhodují stejně jako u jakékoli jiné nákazy. Pokles [proočkovanosti MMR](indikator-vakcinace_mmr_deti.html) na 83,7 % je z modelového pohledu tikající bomba, protože u spalniček stačí málo, aby R(t) vyskočilo nad jedničku — a [incidence spalniček](indikator-spalnicky.html) je teploměr, který to změří. A [preventovatelná mortalita](indikator-mortalita_preventabilni.html) (174 vs 151 v EU, 2023) je v podstatě souhrn všech těch nepřijatých opatření a nevyužité prevence dohromady.


> [[GRAF: Kde se principy modelů potkávají s českými daty]]
> _Podklad:_ Kde se principy modelů potkávají s českými daty Indikátor ČR Co o tom říká model přenosu Proočkovanost MMR (děti) 83,7 % pod prahem kolektivní imunity → R(t) spalniček snadno přes 1 Incidence spalniček 0,9 / 100k citlivý teploměr, který trhání kolektivní imunity okamžitě měří Nemocniční infekce 6,5 % přenos v uzavřeném prostředí — doména trasování a hygieny Preventovatelná mortalita 174 / 100k souhrn nevyužité prevence; EU průměr 151 (2023) Zdroj: dashboard HSPA Monitoru — MMR, spalničky, nemocniční infekce, preventovatelná mortalita (roky v textu). Zdroj dat OECD/Eurostat/ECDC.
> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._


### Chcete jít víc do hloubky?

Příručka epidemiologa — vysokoškolská úroveň

Tohle byl výklad principů pro veřejnost. Matematika za nimi — soustava diferenciálních rovnic modelu SEIR, výpočet R₀ pomocí *next-generation matice*, kalibrace a validace modelů — je k mání v [příručce epidemiologa](https://nedovarenytapir.cz/#/prirucka) v úrovni **Vysoká škola (lékařská fakulta)**. Každá kapitola má ověřené odkazy na recenzovanou literaturu s DOI, takže si můžete dohledat původní práce — od Diekmannovy next-generation matice po studie účinnosti trasování. Je to logické pokračování tohoto seriálu pro každého, kdo chce vidět i rovnice.

Začali jsme u odmontované kliky vodní pumpy v roce 1854 a došli k modelům, které řídí rozhodování celých států. Pojítkem je jediná myšlenka, kterou stojí za to si odnést: **o zdraví populace se dá uvažovat přesně, ověřitelně a s pokorou k nejistotě.** Epidemiologie není ideologie ani věc názoru — je to nejlépe doložená cesta, jak z mlhy dohadů udělat čísla, na kterých se dá stavět. Zbývá ale poslední a nejtěžší článek řetězce: dostat ta čísla k lidem tak, aby jim věřili a jednali podle nich. O tom je **čtvrtý, závěrečný díl** — jak porážet nedůvěru a dezinformace. A pokud vás obor zlákal natolik, že si chcete sami zkusit, jak se taková čísla rodí, víte, kde hledat: [nedovarenytapir.cz](https://nedovarenytapir.cz).


---

### Zdroje

- Flaxman S, et al. Estimating the effects of non-pharmaceutical interventions on COVID-19 in Europe. Nature, 2020. — opatření (zejména lockdowny) stlačila reprodukční číslo pod 1 v 11 evropských zemích. doi.org/10.1038/s41586-020-2405-7 ↗
- Faherty LJ, et al. Effects of non-pharmaceutical interventions on COVID-19 transmission. Front Public Health, 2024. — přehled 61 studií: NPI snižují přenos o 40–90 %. doi.org/10.3389/fpubh.2024.1426992 ↗
- Watson OJ, et al. Global impact of the first year of COVID-19 vaccination: a mathematical modelling study. Lancet Infect Dis, 2022. — 14,4 mil. (hlášená úmrtí) až 19,8 mil. (nadúmrtí) odvrácených úmrtí. doi.org/10.1016/S1473-3099(22)00320-6 ↗
- Martinez L, et al. Effectiveness of preventive treatment among different age groups and M. tuberculosis infection status. Lancet Respir Med, 2024. — preventivní léčba trasovaných kontaktů účinná z 49 % (439 644 účastníků). doi.org/10.1016/S2213-2600(24)00083-3 ↗
- Kinoshita R, Nishiura H. Assessing age-dependent susceptibility to measles in Japan. Vaccine, 2017. — reprodukční číslo a práh kolektivní imunity spalniček. doi.org/10.1016/j.vaccine.2017.05.011 ↗
- Citace recenzovaných článků vycházejí z databáze PubMed (National Library of Medicine, USA).
- Nedovařený tapír — Krizový štáb — krizové rozhodování s reálnými kompromisy (zdraví × ekonomika × důvěra). nedovarenytapir.cz/#/hra/krizovy-stab ↗
- Nedovařený tapír — Ósacká horečka — trasování kontaktů a hledání zdroje nákazy. nedovarenytapir.cz/#/hra/osacka ↗
- Nedovařený tapír — Sandbox (SEIR) — postavte si vlastní model a sledujte R(t). nedovarenytapir.cz/#/sandbox ↗
- Nedovařený tapír — Příručka epidemiologa (úroveň Vysoká škola / lékařská fakulta) — rovnice SEIR, next-generation matice, kalibrace modelů s odkazy na literaturu. nedovarenytapir.cz/#/prirucka ↗
- HSPA Monitor — indikátory přenosu a prevence — nemocniční infekce, spalničky, MMR, preventovatelná mortalita.
- ECDC / OECD — Antimicrobial resistance & HAI, Health at a Glance — harmonizovaná evropská data o nemocničních infekcích a přenosu. ecdc.europa.eu ↗
- Pozn. k hodnotám: Modelové odhady (účinnost opatření, odvrácená úmrtí) jsou převzaty z citovaných recenzovaných studií včetně jejich intervalů nejistoty. Indikátorové hodnoty pocházejí z dashboardu HSPA Monitoru (OECD, Eurostat, ECDC); rok je uveden v textu. Simulátor Nedovařený tapír je edukační nástroj sloužící k pochopení principů — jeho výstupy nejsou predikcí reálné epidemie ani doporučením pro reálná rozhodnutí.

<!-- Zdroj webu: clanek-epidemiologie-3-modely-rozhodovani.html · skorezdravotnictvi.cz/clanek-epidemiologie-3-modely-rozhodovani -->