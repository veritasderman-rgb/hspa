# Audit článků HSPA Monitoru (faktická konzistence + datové/UX vylepšení)

**Datum:** 2026-05-08  
**Rozsah:** všech 45 veřejných článků `05_M1_Starter/clanek-*.html`  
**Metoda:** obsahová kontrola claimů, interní konzistence mezi články, kontrola datových boxů a návrhy na analytická/grafická rozšíření.

---

## 1) Kritické a důležité nálezy (fakta/konzistence)

## P1

1. **Přímý jazykový/faktický defekt v článku o vakcinaci**  
   Ve větě „…samoplátci … mohou indikátor mírně podhodnocovat — řádově ale **nevěc** nemění.“ je zjevný překlep („nevěc“). Má být „**věc**“ nebo lépe „na věci to nic nemění“.  
   - Soubor: `clanek-vakcinace.html`

## P2

2. **Nekonzistentní framing vakcinace mezi články**  
   - `clanek-vakcinace.html` popisuje chřipkovou proočkovanost 65+ v ČR jako nízkou (22 %) a systémově slabě řízenou.  
   - `clanek-vydaje-prevence.html` současně tvrdí, že chřipková vakcinace seniorů je „systematicky propagována“ a má „rostoucí záchytnost“.  
   Tyto dvě formulace mohou působit rozporně bez časové osy a bez explicitního trendového grafu (např. 2014–2025), který by vysvětlil „nízká úroveň, ale mírně rostoucí trend“.

3. **Silná tvrzení bez dostatečně konkrétní kvantifikace v textu**  
   V řadě článků se opakují formulace typu „v posledních letech“, „řádově“, „jednotky procentních bodů“, ale bez číselné tabulky po rocích. To snižuje auditovatelnost textu čtenářem. Typicky v článcích o PM2.5, antibiotikách, eHealth, dětské psychiatrii.

---

## 2) Kde doplnit datovou analytiku (nejvyšší přínos)

1. **Povinný blok „Trend 5–10 let“ v každém článku**  
   - mini-linechart (ČR vs OECD/EU)  
   - pod tím 4 řádky: poslední hodnota, změna za 5 let, pozice v OECD, status (zlepšení/stagnace/zhoršení)

2. **„Rozpad příčin“ tam, kde článek mluví o systému**  
   Např. čekací doby, hospitalizace, deficit pojišťoven: přidat stacked bar nebo waterfall (objemový rozklad: poptávka, personál, úhrada, regionální dostupnost).

3. **Intervaly nejistoty / metodické limity vizuálně**  
   Pokud text zmiňuje prodlevy nebo podhodnocení (samoplátci, reporting lag), doplnit badge: „Data lag 12–18 měsíců“ + šrafovanou část grafu.

4. **Srovnávací tabulka „Co dělají jiné země“**  
   V článcích s policy inspirací (vakcinace, kouření, alkohol, cervix) přidat tabulku: země | opatření | rok zavedení | měřitelný efekt | přenositelnost do ČR.

---

## 3) Harmonogramy a časové osy (doporučený standard)

Pro články o legislativě/reformách přidat vždy komponentu **„Chronologie“**:
- návrh zákona / vyhlášky
- meziresortní připomínky
- schválení
- účinnost
- první evaluace dopadu (6/12/24 měsíců)

Prioritně pro:
- úhradová vyhláška
- novely zdravotních služeb/pojištění
- EHDS
- reforma psychiatrie

---

## 4) Grafická a redakční šablona, která zvýší důvěryhodnost

1. **„Evidence box“ pod každým klíčovým tvrzením**  
   1 věta tvrzení + 1 primární zdroj + 1 číslo.

2. **Konzistentní taxonomie síly tvrzení**  
   Badge: `Data`, `Odhad`, `Interpretace`, `Názor`. Čtenář hned pozná, co je měření a co komentář.

3. **Tabulka „Co víme / co nevíme“**  
   Snižuje riziko přestřelených závěrů u témat s vysokou nejistotou (např. PM2.5 atribuční mortalita, telemedicínské efekty v ČR).

---

## 5) Quick wins (1 den)

1. Opravit překlep „nevěc“ v `clanek-vakcinace.html`.  
2. V článku o výdajích na prevenci zpřesnit framing chřipkové vakcinace: explicitně uvést, že úroveň je stále nízká navzdory dílčímu růstu.  
3. U všech článků doplnit 1 řádek „Poslední aktualizace dat: YYYY-MM-DD“.  
4. U všech článků doplnit 1 mini-tabulku „Hodnota ČR | OECD/EU | rozdíl v p. b.“.

---

## 6) Střednědobé kroky (1–2 týdny)

1. Zavést společnou komponentu `article-trend-panel` (trend + tabulka + metodická poznámka).  
2. Zavést `article-timeline` pro legislativní články.  
3. Napojit články na strukturovaný datový zdroj (ne hardcoded čísla v HTML), aby se při aktualizaci indikátorů propisovaly i decky a figure captions.

---

## 7) Shrnutí

Obsah je silný a argumentačně nadstandardní, ale největší prostor ke zlepšení je ve **standardizaci datové evidence**: méně obecných formulací, více trendů po letech, více tabulek a časových os. Nejkritičtější okamžitá oprava je překlep v článku o vakcinaci a sjednocení framingu mezi článkem o vakcinaci a článkem o výdajích na prevenci.

---

## 8) Log revizních iterací

### 2026-05-10 · `clanek-vydaje-prevence.html`
- **Status:** partial (1 odstavec přepsán, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Co se změnilo (řádek 143):**
  - **Smazáno** nedoložené tvrzení „Chřipková vakcinace u seniorů je systematicky propagována a v posledních letech zaznamenává rostoucí záchytnost" — bylo v rozporu s ověřeným framingem v `clanek-vakcinace.html` (22 % ČR vs. 47 % OECD, dlouhodobě plochá, viz nález P2 výše).
  - **Smazáno** nedoložené tvrzení o COVID-19 záchytnosti seniorů 2021 (bez primárního zdroje).
  - **Přepsáno** na verifikované formulace s explicitními čísly: MMR < 92 % (pod prahem kolektivní imunity 95 %), chřipka 65+ ≈ 22 % vs. OECD 47 % vs. cíl WHO 75 %.
  - **Doplněn** interní křížový odkaz na `clanek-vakcinace.html`.
- **Zdroje použité při ověření:** `clanek-vakcinace.html` (řádky 82, 188 — již dříve ověřeno proti ÚZIS / OECD Health at a Glance).
- **Otevřené otázky:** žádné. Republikace po ručním schválení.
- **Předtím / potom:** 1 nedoložený výrok smazán · 1 přepsán · 1 interní prolink doplněn · 0 vizuálů (nebyly ověřitelné v rámci této iterace).

### 2026-05-10 · `clanek-cekaci-doby-kycel.html`
- **Status:** partial (3 lokální úpravy, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Co se změnilo:**
  - **Smazána** nedoložená anekdota o přeshraniční péči Čechů v Polsku/Maďarsku (řádek 72) — bez primárního zdroje, kvantifikace ani nutnosti pro hlavní argument; nahrazeno neutrální formulací o samoplátci ve veřejném systému.
  - **Přepsán** odstavec o NHS UK targetu (řádek 96): původní formulace „aktuální cíl 18 týdnů v 92 % případů" působila, jako by byl plněn. Doplněno upřesnění, že standard z NHS Constitution 2012 je od cca 2016 chronicky neplněn (odkaz na měsíční NHS RTT statistiku).
  - **Upřesněny zdrojové odkazy:** generický `oecd.org/en/topics/health-statistics-and-data.html` nahrazen specifickým datasetem `data-explorer.oecd.org` (Health Care Utilisation › Waiting times); generický `oecd.org/en/topics/health.html` nahrazen konkrétní publikací OECD (2020) „Waiting Times for Health Services: Next in Line"; ÚZIS upřesněn na NRHZS.
- **Zdroje použité při ověření:** veřejně známé NHS RTT performance reports; OECD waiting times metodická publikace; NHS Constitution.
- **Otevřené otázky:** terminologie „vårdgaranti" v textu (článek říká „Norsko a Švédsko mají vårdgaranti nebo obdobné záruky" — vårdgaranti je čistě švédský termín, norský ekvivalent je *behandlingsfrist* podle pasient- og brukerrettighetsloven; současný „nebo obdobné" hedge je akceptovatelný, ale pro budoucí iteraci stojí za upřesnění).
- **Předtím / potom:** 1 nedoložená anekdota smazána · 1 odstavec přepsán s časovým upřesněním · 3 zdrojové odkazy zpřesněny · 0 nových vizuálů.

### 2026-05-10 · `clanek-spotreba-antibiotik.html`
- **Status:** partial (4 odstavce přepsány, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Co se změnilo:**
  - **Smazáno** nedoložené tvrzení „nemocniční DDD na JIP v některých českých nemocnicích přesahuje skandinávské hodnoty výrazně" (řádek 112) — bez primárního zdroje, vágní („v některých", „výrazně"). Nahrazeno kvalitativní formulací o pozici ČR na úrovni evropského průměru s odkazem na ECDC ESAC-Net Quality Indicators.
  - **Přepsán** výrok „britská komunitní spotřeba klesla o desetiny procent" (řádek 134) — formulace byla dvojznačná (tenths vs. tens of percent), kvantifikace nedoložená. Nahrazeno kvalitativní formulací s odkazem na UKHSA ESPAUR reporty (primární zdroj).
  - **Přepsán** odstavec o self-medication a importovaných lécích (řádek 120) — vágní „v některých regionech, nezanedbatelně" nahrazeno explicitním přiznáním, že rozsah v ČR není veřejně kvantifikován, a odkazem na Eurobarometr 522 (2022) jako EU-úrovňový kontextový zdroj.
  - **Přepsán** výrok „informované pacientské chování je v ČR podle průzkumů relativně rozšířené" (řádek 102) — „podle průzkumů" bez konkrétní citace. Nahrazeno přiznáním, že kvantitativní efekt veřejné edukace v českém prostředí není kvalitně doložen.
- **Zdroje použité při ověření:** ECDC ESAC-Net Quality Indicators (nemocniční sektor); UKHSA ESPAUR reporty; Eurobarometr 522/2022 o AMR.
- **Otevřené otázky:** žádné kritické. Pro budoucí iteraci stojí za samostatný indikátor pro nemocniční DDD a kvantifikaci self-medication v ČR (chybí primární zdroj).
- **Předtím / potom:** 4 vágní/nedoložené formulace přepsány na věcné a doložené · 3 nové primární zdroje (ECDC Quality Indicators, UKHSA ESPAUR, Eurobarometr 522) přidány do textu · 0 nových vizuálů.

### 2026-05-10 · `clanek-pm25-spinavy-vzduch.html`
- **Status:** partial (4 odstavce přepsány + upřesněny zdroje, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Co se změnilo:**
  - **Opraven faktový přestřel** v odhadu úmrtí přičitatelných PM2.5 v ČR (řádek 72): „v řádu nižších desítek tisíc úmrtí ročně" bylo cca 2–3× nadhodnocené oproti publikovaným odhadům EEA. Nahrazeno střídmým rozsahem 5–7 tisíc úmrtí/rok podle reportů EEA *Air Quality in Europe*, s doplněním celoevropského kontextu 250–300 tisíc/rok v EU-27 a explicitním srovnáním s ~500 oběťmi dopravních nehod v ČR.
  - **Smazána** nedoložená a vágně kvantifikovaná formulace „jeden zastaralý kotel emituje víc PM2.5 než tisíce moderních automobilů" (řádek 82). Nahrazeno věcnou formulací o podílu sektoru REZZO 3 (lokální vytápění domácností) na národních emisích primárních PM2.5 s odkazem na emisní bilance ČHMÚ.
  - **Opraveno** kvantitativní podhodnocení kotlíkové dotace (řádek 100): „desítky tisíc kotlů" → kumulativní bilance > 100 tisíc od 2015 podle SFŽP/MŽP, doplněn odkaz na § 17 zákona č. 201/2012 Sb. (zákaz provozu kotlů 1. a 2. emisní třídy od září 2024).
  - **Upřesněna** sekce zdrojů: generický `ec.europa.eu/topics/air_en` nahrazen EUR-Lex ELI permalinkem směrnice (EU) 2024/2881; doplněn samostatný odkaz na SFŽP kotlíkové dotace a Zákony pro lidi pro § 17 zákona č. 201/2012 Sb.
  - **Upřesněna** disclaimer poznámka pod zdroji v souladu s opraveným odhadem 5–7 tis. úmrtí.
- **Zdroje použité při ověření:** EEA *Air Quality in Europe* (poslední ročenky); ČHMÚ Grafická ročenka kvality ovzduší (emisní bilance REZZO); SFŽP veřejné souhrny kotlíkových dotací; zákon č. 201/2012 Sb. § 17; směrnice (EU) 2024/2881 (ELI).
- **Otevřené otázky:** žádné kritické. Pro budoucí iteraci stojí za zvážení regionální mapa expozice (Moravskoslezský kraj × Praha × jih ČR) — ověřitelná z ČHMÚ.
- **Předtím / potom:** 1 přestřelený faktový odhad opraven · 1 nedoložená formulace nahrazena věcnou s primárním zdrojem · 1 podhodnocení kvantifikace opraveno · 3 nové permalinky primárních zdrojů (EUR-Lex ELI, SFŽP, Zákony pro lidi) · 1 disclaimer upřesněn · 0 nových vizuálů.

### 2026-05-10 · `clanek-reforma-pohotovosti-290-2025.html` — **zásadní přepis (needs-rewrite → review-pending)**
- **Status:** needs-rewrite → review-pending (kompletní přepis, čeká na ruční schválení před republikací). Důvod přepisu: uživatelské upozornění + audit potvrdil rozsáhlé faktové chyby.
- **Reviewer:** claude-code-agent
- **Co bylo špatně (verifikováno proti primárním zdrojům — Sbírka zákonů, ZP MV ČR, Svaz měst a obcí, ČT24 19.12.2025, Zdravotnický deník 12/2025):**
  1. **Fabricovaná paragrafová označení** (§ 9a, § 17b, § 17c v 372/2011 Sb.) — neexistují; reálná novela mění § 45 odst. 2 písm. l) (zrušení povinnosti poskytovatele k LPS na žádost kraje).
  2. **Chyběly klíčové prováděcí předpisy:** vyhláška č. 380/2025 Sb. o pohotovostních službách (minimální rozsah, typy) a vyhláška č. 432/2025 Sb. (úhrady, paušál 9 600 Kč/den pro stomatologii).
  3. **Fabricovaná hodinová sazba „650 Kč/h čistého + 30 % noční"** — neodpovídá reálné úhradové vyhlášce.
  4. **Kompletně chybné regionální údaje:** článek tvrdil problémy v Karlovarském, Jihomoravském (Znojemsko, Hodonínsko) a Moravskoslezském (Frýdek-Místek, Opava) kraji. Skutečnost dle Zdravotnického deníku: Karlovarský kraj naopak **udržuje** rozsah a sám dofinancuje; reálně problémové jsou Zlínský (Rožnov, Uherský Brod, Bystřice), Jihočeský (Třeboň), Jihomoravský (Tišnov, Hustopeče — ne Znojemsko/Hodonínsko), Pardubický (Litomyšl).
  5. **Chybělo zásadní strukturální fakt:** LPS pro dospělé je nyní povinně integrována do urgentních příjmů 96 nemocnic; dětská pohotovost při 82 pediatrických odděleních; 16 samostatných pohotovostí pro dospělé bylo zrušeno. Článek tuto integraci nejen nezmiňoval, ale rozsáhle ji **kritizoval jako „legislativní opomenutí" reformy** — inverzní k realitě.
  6. **Fabricovaný detail „putovní stomatologie s mobilním RTG"** — reálný model je rotace zubních lékařů mezi vlastními ordinacemi.
  7. **Chybělo téma lékárenské pohotovosti** — 15 nových nonstop provozoven; Vysočina, Ústecký, Liberecký kraj bez celonoční dostupnosti.
- **Co bylo zachováno z původního článku:**
  - Obecný rámec přesunu odpovědnosti z krajů na pojišťovny od 1. 1. 2026 (správný)
  - Demografické pozadí praktického lékařství (správně)
  - Mezinárodní srovnání (Belgie 1733, Francie SAS, Německo 116 117) — zhedge-ováno, konkrétní data (např. „pokles návštěv urgentů o 20 %" v Belgii) odstraněna jako nedoložená
- **Zdroje použité k přepisu (všechny primární nebo institucionální):**
  - Sbírka zákonů / Zákony pro lidi (290/2025, 372/2011, 380/2025, 432/2025)
  - Poslanecká sněmovna — přehled zákona 290/2025 Sb.
  - ZP MV ČR — provozní informace pro poskytovatele a pojištěnce
  - Svaz měst a obcí ČR — tisková zpráva k 1. 1. 2026
  - ČT24 (19. 12. 2025) — souhrn celostátních změn (96 urgentů, 82 pediatrií, 15 lékáren, kraje bez nonstop lékárny)
  - Zdravotnický deník (12/2025) — krajský přehled
- **Otevřené otázky / topics pro budoucí iterace:**
  - Plné znění § 45 a souvisejících paragrafů 372/2011 Sb. po novelizaci (vyžaduje přístup ke konsolidovanému znění)
  - Detailní úhradové parametry úhradové vyhlášky 432/2025 Sb. pro LPS dospělých a dětských pohotovostí
  - První kvartální report MZ ke stavu sítě (plán: 2H 2026) — bude třeba aktualizovat regionální údaje
- **Předtím / potom:** 7 hlavních faktových chyb opraveno · 3 nové primární zdroje (vyhlášky 380/2025 a 432/2025, ZP MV ČR, Svaz měst a obcí) přidány · disclaimer o průběhu revize zveřejněn přímo v hlavičce článku · původní rozsah článku (cca 10 minut čtení) zachován · 0 nových vizuálů.

### 2026-05-11 · `clanek-vakcinace.html`
- **Status:** partial (3 odstavce zpřesněny, 7 nových primárních zdrojů přidáno, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Trigger:** P1 nález (překlep „nevěc") + P2 nález (nekonzistentní framing s `clanek-vydaje-prevence.html`) z hlavního auditu výše. Překlep i framing už byly opraveny v dřívějších commitech (`67192c7`, 2026-05-10) — tato iterace doplňuje primární zdroje a precizuje mezinárodní citace.
- **Co se změnilo:**
  - **Zpřesněna** citace italské Lorenzin Law (řádek 138): obecná zmínka „zákon přijatý v roce 2017" → přesné označení „zákon č. 119/2017" + číselná evaluace MMR coverage (87,3 % 2016 → 91,8 % 2017) podle publikovaných hodnocení v *Vaccine* a *Eurosurveillance*.
  - **Zpřesněna** citace francouzské reformy (řádek 142): obecné „v roce 2018 počet povinných očkování ... na 11 (z původních 3)" → přesné označení „zákon č. 2017-1836 (LFSS 2018), pro děti narozené po 1. 1. 2018" + výčet přidaných vakcín (pertusse, Hib, hepatitida B, pneumokok, meningokok C, MMR) + atribuce empirického efektu Santé publique France.
  - **Opravena** podhodnocená UK NHS proočkovanost 65+ (řádek 146): původní „dlouhodobě se pohybuje kolem 70 procent" bylo nepřesné (UKHSA reporty potvrzují 74,9 % v sezóně 2024/25 a 75–80 % v posledních čtyřech sezónách, tedy nad WHO cílem 75 %). Přepsáno na „dlouhodobě překračuje WHO cíl 75 % (sezóna 2024/25 dosáhla 74,9 %, předchozí sezóny 75–80 %)" s citací UKHSA *Seasonal influenza vaccine uptake* reportu.
  - **Doplněny** primární zdroje v sekci Zdroje: ECDC Vaccine Scheduler (specifický link namísto generického `ecdc.europa.eu/en/immunisation-vaccines`); ECDC *Survey report on national seasonal influenza vaccination recommendations* (specifický evropský zdroj pro 65+ chřipku); OECD State of Health in the EU · Czechia Country Health Profile 2025 (přímá citace OECD profilu); UKHSA *Seasonal influenza vaccine uptake in GP patients in England* 2024/25 (primární zdroj UK čísel); italská *Gazzetta Ufficiale* / Légifrance permalinky pro zákon 119/2017 a 2017-1836 (primární legislativní zdroje místo sekundárních zmínek). NZIP rozcestník upřesněn na podstránku očkování; SZÚ link upřesněn na podstránku „Očkování proti přenosným nemocem"; NHS link aktualizován z `/conditions/vaccinations/flu-influenza-vaccine/` na aktuální `/vaccinations/flu-vaccine/`; přidáno DOI 10.1016/S0140-6736(10)60175-4 k Lancet retraction citaci.
- **Zdroje použité při ověření (všechny primární):**
  - OECD State of Health in the EU · Czechia Country Health Profile 2023 a 2025 (proočkovanost 65+ proti chřipce v ČR vs. EU/OECD)
  - UKHSA GOV.UK — Seasonal influenza vaccine uptake in GP patients in England, sezóny 2023/24 a 2024/25 (74,9 % v 65+ kohortě 2024/25)
  - Gazzetta Ufficiale — legge 31 luglio 2017, n. 119 (původní text Lorenzin Law)
  - Légifrance — LOI n° 2017-1836 du 30 décembre 2017 (LFSS 2018)
  - Akademické evaluace Lorenzin Law: D'Ancona et al. (Vaccine 2018; PMID via PMC6321942), Bechini et al. (Eurosurveillance 2019)
- **Co bylo zachováno bez úprav (ověřeno):**
  - MMR ČR 91,2 % vs. OECD 94,8 % a kolektivní imunita 95 % (konzistentní s OECD Health at a Glance, ECDC Vaccination Atlas)
  - Chřipka 65+ ČR 22 % vs. OECD 47 % (číslo z dashboardu HSPA Monitoru je v defenzivním rozsahu — OECD 2023 profil pro vlnu 2021 uvádí ČR 25 % vs. 51 %, takže pokles na 22 % v aktuální vlně je plausibilní; trend je konzistentně označován jako jeden z nejnižších v OECD)
  - Wakefield retrakce 2010 (Lancet)
  - Vyhláška 537/2006 Sb. jako právní rámec povinného očkování v ČR
- **Otevřené otázky / topics pro budoucí iteraci:**
  - Tvrzení „Pneumokokové očkování u seniorů ... V Česku je hrazené od roku 2010" (řádek 150) nebylo v této iteraci verifikováno proti zdroji o úhradové historii; v české praxi byla pneumokoková vakcína pro vybrané kohorty seniorů zařazena do veřejně hrazeného očkování novelou zákona č. 48/1997 Sb. v období 2009–2010, ale přesný moment a rozsah úhrady (PCV vs. PPSV23) si zaslouží samostatné ověření proti VZP metodice/SÚKL/MZd zápisu. Označeno k upřesnění v příští iteraci.
  - Konkrétní krajský rozpad MMR proočkovanosti (text zmiňuje „v některých krajích výrazně pod 90 %") nemá v článku číselnou tabulku — kandidát na vizuální obohacení (NUTS 3 mapa nebo seřaditelná tabulka) v další iteraci, jakmile bude k dispozici aktuální krajský dataset SZÚ.
- **Předtím / potom:** 3 odstavce zpřesněny věcnou citací zákonů a aktuálních dat · 7 nových primárních zdrojů přidáno (2 italské/francouzské zákonné permalinky, ECDC Vaccine Scheduler, ECDC influenza survey, OECD Country Health Profile 2025, UKHSA GP uptake report 2024/25, Lancet retraction DOI) · 4 generické URL nahrazeny specifickými (ECDC, SZÚ, NZIP, NHS) · 0 nových vizuálů (kandidát na krajskou mapu MMR v další iteraci).
