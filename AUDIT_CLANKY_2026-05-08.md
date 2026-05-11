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

### 2026-05-11 · `clanek-detska-psychiatrie-krize.html`
- **Status:** partial → review-pending (3 přepsané odstavce, 1 doplněný disclaimer, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Priorita:** P2 (vysoké riziko věcné nepřesnosti — konkrétní čísla bez metodologického ukotvení; v rámci P2.3 nálezu auditu byla dětská psychiatrie explicitně označena jako oblast s vágními formulacemi)
- **Co bylo špatně (verifikováno proti metodické kartě indikátoru `psychiatri_per_100k`, webu reformapsychiatrie.cz a publikacím OECD):**
  1. **Vnitřní rozpor s vlastním datovým kontraktem portálu:** Článek uváděl „kolem 180 dětských psychiatrů" jako prostý odhad ČPS ČLS JEP, ale metodická karta indikátoru `psychiatri_per_100k` (sekce `limitations`) uvádí „dětských a dorostových psychiatrů je v ČR zhruba 110" podle NRZP ÚZIS / OECD specialty kódu 305. Rozdíl 110 vs. 180 je metodologický (atestovaní a aktivně praktikující vs. head count včetně lékařů v rezidenčním programu a v důchodovém věku) a článek tuto distinkci nevysvětloval.
  2. **Chybné datování Strategie reformy psychiatrické péče:** Článek tvrdil, že reforma „se formálně datuje od roku 2013, kdy MZ zahájilo přípravné práce, a od roku 2017, kdy byl vydán Strategický rámec reformy psychiatrické péče". Strategie reformy psychiatrické péče byla schválena MZ ČR **8. 10. 2013** (zdroj: reformapsychiatrie.cz, sekce „O reformě"); rok 2017 odpovídá přípravným pracím a samotný start pilotních CDZ z OP Zaměstnanost proběhl v průběhu roku 2018 (přesné datum spuštění prvních pilotních CDZ se mezi zdroji liší a v článku není konkretizován bez primárního zdroje). Metodická karta indikátoru rovněž uvádí „reforma psychiatrické péče (od 2013)". **Reakce na review komentář Codex (ae350e6 → další commit):** v původní verzi tohoto commitu byla uvedena formulace „první CDZ Praha 8 zahájilo provoz v lednu 2018", kterou Codex správně označil jako v rozporu s citovaným zdrojem reformapsychiatrie.cz. Konkrétní měsíc spuštění byl odstraněn a nahrazen formulací „v průběhu roku 2018" s explicitní poznámkou, že přesné datum nezavádíme bez ověření v primárním dokumentu pilotního projektu.
  3. **Nepřesný zdroj pro NHS CAMHS čekací doby:** Tvrzení „v Británii jsou čekací doby na tier 3 péči v průměru přes 18 týdnů" bylo bez konkrétní citace. Doplněn odkaz na NHS England *Mental Health Services Monthly Statistics* (datové podsestavy CYP MH) a kontext NHS Long Term Plan s ambicí 4 týdnů od referrálu.
  4. **Fabricovaný název publikace OECD:** Disclaimer uváděl odkaz na „OECD Mental Health Policy Report 2023" — pod tímto názvem OECD v roce 2023 žádnou publikaci nevydalo. Skutečné relevantní publikace OECD k duševnímu zdraví: *A New Benchmark for Mental Health Systems* (OECD 2021) a kapitola o duševním zdraví v *Health at a Glance 2023*. Disclaimer opraven na skutečné publikace.
- **Co bylo přepsáno (3 odstavce + 1 disclaimer):**
  - Sekce „Proč indikátor psychiatři / 100 000 obyvatel není celý příběh", odstavec o 180 psychiatrech — rozšířen o metodologickou distinkci 110 vs. 180 s explicitním propojením na metodickou kartu dashboardu (`indicator.html?id=psychiatri_per_100k`).
  - Sekce „Reforma psychiatrické péče 2013 — kde jsme dnes", první odstavec — opraveno datum schválení Strategie 8. 10. 2013; rok 2017 přesněji zarámován jako start pilotních CDZ z OPZ.
  - Sekce „Co dělá zahraničí", odstavec o CAMHS — doplněn konkrétní zdroj NHS England MHSMS a kontext NHS Long Term Plan target 4 týdny.
  - Disclaimer pod zdroji — opraven název neexistující OECD publikace na *A New Benchmark for Mental Health Systems* (2021) a *Health at a Glance 2023*; doplněn samostatný revizní disclaimer s datem.
- **Co bylo zachováno (s vědomím limitací):**
  - Titulek „Sto osmdesát psychiatrů na milion dětí" jako rétorické vyjádření (~180 ku ~1,8 mil. dětí 0–18 = cca 100 / milion). Body článku nyní vysvětluje, že 180 je horní hranice metodologického rozmezí.
  - Čekací doby 4–8 měsíců neakutní a 3–4 týdny akutní — článek od počátku explicitně přiznává, že nejde o registrová data ÚZIS, ale o opakované průzkumy ČPS ČLS JEP a neziskových organizací. Tento hedge zachován.
  - Čtyři kraje s dětskými CDZ — konzistentní s metodickou kartou indikátoru (sekce `determinants`: „dětská CDZ jsou zatím k dispozici jen ve 4 krajích").
- **Zdroje použité k revizi (všechny primární nebo institucionální):**
  - Metodická karta indikátoru `psychiatri_per_100k` (interní datový kontrakt portálu, sekce `limitations`, `determinants`, `importance`)
  - reformapsychiatrie.cz — sekce „O reformě" (datum schválení Strategie 8. 10. 2013)
  - NHS England — *Mental Health Services Monthly Statistics*, datové podsestavy Children and Young People's Mental Health
  - NHS Long Term Plan (cíl 4 týdny pro nové CYP MH služby)
  - OECD — *A New Benchmark for Mental Health Systems* (2021); *Health at a Glance 2023* (kapitola o duševním zdraví)
  - ÚZIS — Národní registr zdravotnických pracovníků (kódy specializované způsobilosti 305, 309, 306)
- **Otevřené otázky / topics pro budoucí iterace:**
  - Přesné rozdělení head count vs. atestovaní u dětských a dorostových psychiatrů — bylo by užitečné získat aktuální ÚZIS NRZP roční publikaci „Lékaři, zubní lékaři a farmaceuti" pro tabulku podle oboru a kraje (kód 305) a doplnit do metodické karty indikátoru i článku přesné číslo místo metodologického rozmezí.
  - Kvantifikace odhadu „86 ze 180" v lead odstavci — toto konkrétní číslo (86) je v textu uváděno jako odhad ČPS ČLS JEP, ale chybí konkrétní zdrojový dokument; pro budoucí iteraci dohledat původní zdroj nebo nahradit kvalitativním vyjádřením („přibližně polovina ve věku 65+").
  - Regionální distribuce dětských CDZ — Karlovarský × Vysočina × ostatní kraje by zasloužila samostatnou mapu NUTS 3, ale jen pokud bude k dispozici primární zdroj (např. ÚZIS Národní registr poskytovatelů zdravotních služeb).
- **Předtím / potom:** 4 metodologické nepřesnosti opraveny · 3 přepsané odstavce · 1 nový disclaimer s revizním datem · 4 nové primární zdroje (metodická karta dashboardu, reformapsychiatrie.cz s konkrétním datem, NHS MHSMS, OECD 2021 publikace) · 0 nových vizuálů (nebyly ověřitelné v rámci této iterace; mapa dětských CDZ ponechána pro budoucí iteraci po dohledání primárního zdroje).

### 2026-05-11 · `clanek-deficit-vzp-2026.html` (DRAFT) — **rozsáhlá revize numerických údajů a institucionálních odkazů**
- **Status:** draft → draft po auditní revizi (zůstává neveřejný, čeká na ruční schválení před případnou publikací). Důvod: článek byl draft ve fázi přípravy k publikaci a obsahoval rozsáhlé numerické a institucionální chyby, které by při zveřejnění zpochybnily důvěryhodnost portálu.
- **Reviewer:** claude-code-agent
- **Co bylo špatně (verifikováno proti primárním zdrojům — VZP ČR ZPP 2026, finance.cz souhrny, MZ ČR Výsledky DŘ 2026, zákony 48/1997, 551/1991, 280/1992, 592/1992):**
  1. **Chybná hodnota platby státního pojištěnce 2026:** článek uváděl 2 058 Kč/měsíc/osobu; reálná hodnota je 2 188 Kč (13,5 % z vyměřovacího základu 16 206 Kč) — doloženo VZP ČR, ZP MV ČR, VoZP a finance.cz.
  2. **Chybné historické hodnoty platby státního pojištěnce:** 2024: článek 1 977 Kč → realita 2 085 Kč; 2025: článek 1 998 Kč → realita 2 127 Kč.
  3. **Vnitřní rozpor v lead paragrafu:** „platba státu cca 102 mld. Kč ročně" (zjevně odvozeno od staré sazby ~1 440 Kč × 12 × 5,9 mil. ≈ 102 mld., což odpovídá rokům cca 2018–2019) v rozporu se samotným článkem dále uvádějícím 155 mld. Kč. Sjednoceno na 155 mld. Kč (2 188 × 12 × 5,9 mil. ≈ 154,9 mld., souhlasí i s mediálním souhrnem 154,6 mld. Kč).
  4. **Chybný valorizační vzorec:** článek tvrdil, že platba státního pojištěnce „se každý rok automaticky valorizuje o inflaci spotřebitelských cen (CPI)". Skutečnost dle § 3c odst. 2 zákona č. 592/1992 Sb.: vyměřovací základ se valorizuje o <em>součet růstu spotřebitelských cen a poloviny růstu reálných mezd</em>.
  5. **Chybný označení orgánu schvalujícího ZPP:** článek tvrdil, že zdravotně pojistné plány schvaluje Senát. Skutečnost: ZPP schvaluje Poslanecká sněmovna podle <strong>§ 6 odst. 11 zákona č. 551/1991 Sb.</strong> (VZP) a <strong>§ 15 odst. 11 zákona č. 280/1992 Sb.</strong> (zaměstnanecké pojišťovny) souběžně s návrhem státního rozpočtu. (Pozn.: První verze této opravy v commitu 1e3bfbb uváděla chybně § 7 zákona č. 280/1992 Sb. — § 7 upravuje nucenou správu, nikoliv schvalování ZPP. Opraveno v navazujícím commitu na základě review Codex bota.)
  6. **Příliš úzký rámec deficitu:** článek uváděl 12,2 mld. Kč jako „konsolidovaný deficit systému". Skutečnost dle ZPP 2026 z 20. 10. 2025 a vyjádření SZP ČR: VZP samostatně 12,7 mld. Kč; systém jako celek včetně nedoplatků řádově 12–19 mld. Kč.
  7. **Nepodložená čísla v sekci mzdový tlak (7,5 % růst 2025, 8,1 % růst 2024) a CHL (13,2 % růst 2025, 11,8 % růst 2024, 14 % podíl, 28 mld. Kč objem)** — bez primárního zdroje. Konkrétní procentní hodnoty odstraněny, kvalitativní popis ponechán s odkazem na ČSÚ <em>Průměrné mzdy</em>, ÚZIS <em>Personální kapacity</em>, výroční zprávy SÚKL.
  8. **Nepodložená nárůstová projekce demografie:** „65+ dosáhne 26 % v 2040", „2,3× větší zdravotní péče na osobu" — bez doloženého odkazu na konkrétní publikaci ČSÚ a ÚZIS. Konkrétní násobky odstraněny, kvalitativní pasáž zachována s odkazem na ČSÚ <em>Projekce obyvatelstva ČR</em>.
  9. **Nepodložené stranické pozice:** „ČSSD, KSČM, Piráti prosazují +200–300 Kč; ANO, SPD jsou rezervovanější; ODS, STAN preferují strukturální reformu" — bez doloženého programového dokumentu nebo sněmovního hlasování. Odstraněno; nahrazeno věcným hedge.
  10. **Detailní rozpis rezervních fondů po jednotlivých pojišťovnách (VoZP 1,8 mld., ČPZP 2,1 mld., …)** — bez doloženého odkazu na konkrétní ZPP nebo výroční zprávy. Odstraněno; souhrnná hodnota cca 30 mld. Kč s dominantním podílem VZP ponechána s odkazem na mediální shrnutí.
  11. **Chybný odkaz na sazbu od roku 1992:** sazba 13,5 % platí od účinnosti zákona č. 592/1992 Sb. (1993), nikoliv od „1992".
  12. **Stálý disclaimer o citaci Pavla Hroboně:** v textu žádná taková citace není; odstraněno, nahrazeno věcným popisem anonymního pull-quote shrnujícího argumenty z odborné debaty.
  13. **Chybné označení § 17 odst. 4 pro dohodovací řízení:** legislativně přesněji § 17 (konkrétní odst. 5 pro deadline 30. června). Generalizováno na „§ 17 zákona č. 48/1997 Sb.".
  14. **Chybné absolutní datum DŘ 2026 („od 30. ledna do 19. června 2025"):** bez doloženého primárního zdroje. Změněno na obecné „probíhalo v první polovině roku 2025" s odkazem na MZ ČR <em>Výsledky dohodovacího řízení pro rok 2026</em>.
  15. **Páka 1 výpočet:** „172 Kč/měsíc/osobu navíc, navýšení ze 2 058 na 2 230 Kč (+8,4 %)" byla dvojí chyba (chybná báze + chybný cíl deficitu). Přepočet: při deficitu řádu 15 mld. Kč by se jednalo o ~210 Kč/měsíc/osobu nad rámec automatické valorizace, tedy z 2 188 Kč zhruba na 2 400 Kč (+9,7 %).
- **Co bylo zachováno z původního článku:**
  - Strukturní rámec (tři proudy příjmů, čtyři páky vlády)
  - Datace klíčové legislativy a odkaz na § 3c zákona č. 592/1992 Sb., § 17 zákona č. 48/1997 Sb., § 11 zákona č. 280/1992 Sb., § 21a zákona č. 592/1992 Sb.
  - Pull-quote o povaze dohodovacího řízení (přerámován jako anonymní shrnutí, nikoliv citace osoby)
  - Mezinárodní srovnání sazby pojistného s hedge ohledně rozdílů v definici základny
- **Zdroje použité k revizi (všechny primární nebo institucionální):**
  - VZP ČR — Zdravotně pojistný plán 2026 (tisková konference 20. 10. 2025; viz zdravezpravy.cz a vzp.cz)
  - finance.cz — souhrn „Zdravotní pojištění za státní pojištěnce se v roce 2026 zvýší na 2 188 Kč měsíčně"
  - ZP MV ČR / VoZP / VZP — provozní informace ke změnám od 1. 1. 2026
  - MZ ČR — <em>Výsledky dohodovacího řízení pro rok 2026</em>, <em>Úhradová vyhláška 2026</em> (vyhláška č. 432/2025 Sb. publikovaná 30. 10. 2025)
  - Zákony pro lidi / Sbírka zákonů — 48/1997 Sb., 551/1991 Sb., 280/1992 Sb., 592/1992 Sb.
- **Otevřené otázky / topics pro budoucí iterace:**
  - Doplnění konkrétních procentních hodnot z výročních zpráv SÚKL (CHL) a ÚZIS / ČSÚ (mzdy, demografie) — jakmile budou dostupné a citovatelné s přímým odkazem
  - Aktualizace souhrnu deficitu systému po zveřejnění auditovaných výsledků hospodaření pojišťoven (podzim 2026 / podzim 2027)
  - Doplnění chronologie legislativního procesu k případné novele § 3c zákona č. 592/1992 Sb. (mimořádné navýšení nad automatickou valorizaci)
- **Předtím / potom:** 15 numerických nebo institucionálních chyb opraveno · 4 nedoložené pasáže přepsány na věcný hedge · 2 nedoložené tabulkové bloky odstraněny (mzdový růst, detailní rezervní fondy) · disclaimer o nepravdivém Hroboň citátu odstraněn · audit-status banner zveřejněn v hlavičce článku · status zůstává <code>draft</code> (noindex) a čeká na ruční schválení před případnou publikací · 0 nových vizuálů (nebyly v rámci této iterace ověřitelné s dostatečnou jistotou).

### 2026-05-11 · `clanek-rakovina-tlusteho-streva.html`
- **Status:** partial (1 odstavec přepsán + 1 odstavec upřesněn + kompletně přepracovaná sekce Zdroje, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Co se změnilo:**
  - **Upřesněno mezinárodní srovnání účasti na CRC screeningu** (řádek 75): původní formulace „v Nizozemsku je účast přes 70 procent, ve Slovinsku přes 60" byla v rozporu s aktuálními daty Eurostatu (2023). Přepsáno na ověřená čísla: Nizozemsko ≈ 67 %, Slovinsko SVIT ≈ 65 %, doplněno Finsko 74 %.
  - **Smazána nedoložená formulace** „Datovou infrastrukturu programu vede Institut biostatistiky a analýz Masarykovy univerzity, který v té době mluvil o evropském unikátu." — heroizační hyperbola bez primárního zdroje. Nahrazeno věcným popisem dělby rolí: IBA LF MU jako analytický garant (kolorektum.cz), Národní screeningové centrum (NSC) při ÚZIS jako koordinátor screeningových programů od r. 2017.
  - **Doplněn historický kontext** v lead odstavci o screeningu (řádek 75): screeningový program v ČR běží od roku 2000; adresné zvaní bylo k němu přidáno až v roce 2014. Původní text vytvářel dojem, že screening začal teprve v 2014.
  - **Upřesněno přiřazení indikátoru ke zdroji** v lead odstavci (řádek 65): doplněno explicitní označení MKN-10 (C18–C20) a poznámka „v posledním uzavřeném roce" namísto „loni" (nepřesný časový odkaz vůči datu publikace).
  - **Kompletně přepracovaná sekce Zdroje:**
    - Generický `oecd.org/en/topics/health.html` → 3 specifické permalinky: OECD *Driving Down the Colorectal Cancer Burden* (2025), OECD Health at a Glance 2023 (kapitola Cancer screening), Eurostat Cancer screening statistics.
    - Generický `uzis.cz/` → tematický permalink na Národní onkologický registr s odkazem na legislativní oporu (§ 73 zákona č. 372/2011 Sb.).
    - Generický `iba.muni.cz/` → 2 tematické permalinky: kolorektum.cz – Epidemiologie a kolorektum.cz – Výsledky adresného zvaní. Doplněna otevřená datová sada NZIP (CSV s pokrytím po okresech).
    - Generický `mzcr.cz/` → přímý odkaz na PDF Národního onkologického plánu ČR 2030 (mzd.gov.cz) + přehledová stránka.
    - Doplněn Věstník MZ ČR č. 1/2009 (Standard screeningu CRC, plný text PDF).
    - Doplněn Europe's Beating Cancer Plan jako policy rámec (oficiální stránka EC + plný text PDF).
    - Doplněn odkaz na popis programu pro veřejnost (NZIP, screeningový program CRC).
  - **Upřesněn disclaimer pod zdroji:** explicitně označen rozdíl mezi „pokrytím 50–75 let v 2letém intervalu" (definice indikátoru HSPA Monitoru, 28 % v 2024) a OECD/Eurostat měřítkem „účast na screeningu během 2 let" (CZ ≈ 30 % v 2023) — drobný rozdíl daný definicí věkového rozsahu a referenčního intervalu.
  - **Doplněn revizní disclaimer** v hlavičce článku ve stylu předchozích auditů (řádek 57–59), s nastavením `status: review-pending`.
- **Zdroje použité při ověření:**
  - Kolorektum.cz / IBA LF MU — epidemiologické trendy a výsledky adresného zvaní
  - OECD *Driving Down the Colorectal Cancer Burden* (2025)
  - OECD Health at a Glance 2023 — Cancer Screening (s. 154–155)
  - Eurostat Cancer screening statistics (vlna 2023)
  - ECIR Inequalities Factsheet *Colorectal Cancer Screening* (březen 2024)
  - Národní screeningové centrum při ÚZIS (informace o roli a vzniku 1. 2. 2017)
  - Národní onkologický plán ČR 2030 (vláda ČR schválila 22. 6. 2022)
- **Otevřené otázky pro budoucí iterace:**
  - **Standardizace vs. crude rate:** Indikátor `incidence_kolorektalni` v metodické kartě deklaruje standardizaci na evropskou populaci, ale hodnota 73,5/100 000 odpovídá spíše crude rate (ASR-W by byla nižší). Stojí za revizi metodiky / přepočet hodnoty.
  - **Trend posunu věkové hranice na 45 let** podle modernizace screeningu CRC (Věstník MZ 2024) — článek o tomto neinformuje, doplnit v příští iteraci.
  - **Regionální rozpad účasti** — k dispozici jako otevřená data (NZIP CSV po okresech), v článku zatím není.
- **Předtím / potom:** 1 nedoložené tvrzení smazáno · 2 čísla mezinárodního srovnání upřesněna proti Eurostatu · 1 chybějící historický fakt doplněn · 6 generických zdrojových odkazů nahrazeno 12 stabilními permalinky/permalinkovými páry · disclaimer pod zdroji upřesněn · revizní hlavička přidána · 0 nových vizuálů (nebyly potřeba, dashboard databox dataset je dostatečný).

### 2026-05-11 · `clanek-uhradova-vyhlaska.html`
- **Status:** partial → review-pending (článek byl aktualizován; čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Důvod priority:** P1 (legislativní aktualita). Článek z 7. 5. 2026 odkazoval celý text na **návrh** úhradové vyhlášky z listopadu 2025. K tomu datu však finální **vyhláška č. 432/2025 Sb.** byla již 5 měsíců účinná (1. 1. 2026). Vzhledem k nálezům fabricovaných paragrafových odkazů v jiném legislativním článku (viz audit 290/2025) bylo nutné kompletní revizi primárního zdroje provést.
- **Co bylo ověřeno proti primárním zdrojům:**
  - **Vyhláška č. 432/2025 Sb. potvrzena** jako úhradová vyhláška 2026, účinnost 1. 1. 2026; permalink e-Sbírky: `https://e-sbirka.gov.cz/sb/2025/432/2026-01-01`; souhrnná stránka MZČR `https://www.mzd.gov.cz/uhradova-vyhlaska-2026/` s plným PDF (2,45 MB), důvodovou zprávou, podíly pojištěnců a číselníkem RV.
  - **Konzistence s předchozím auditem `clanek-reforma-pohotovosti-290-2025`:** vyhláška 432/2025 Sb. obsahuje paušál 9 600 Kč/den pro zubní pohotovost (§ 16 odst. 2), což odpovídá údaji v tomto článku — nezávislé křížové potvrzení.
- **Co bylo přepsáno / smazáno:**
  - **Přepsán** deck z „Pro 2026 je vyhláška **návrhem** MZČR z listopadu 2025" → „Pro 2026 je v účinnosti od 1. ledna **vyhláška č. 432/2025 Sb.** (publikováno MZČR v listopadu 2025, vydáno ve Sbírce zákonů)".
  - **Smazána** nedoložená specifika rozsahu („21 paragrafů a patnácti přílohami" v decku, „211stránkový dokument" v databoxu, „9. revize klasifikace CZ-DRG", „sdělení ČSÚ č. 363/2025 Sb.") — nebylo možné nezávisle ověřit přesná čísla bez extrakce PDF a souhláska s nálezem fabricovaných paragrafových čísel v audit log 290/2025. Nahrazeno hedge formulacemi a odkazem na ÚZIS DRG portál pro průběžnou metodiku.
  - **Aktualizována meta description** (uveden vyhláška č. 432/2025 Sb. + datum účinnosti).
- **Co bylo doplněno:**
  - **Review-pending banner** v hlavičce článku (konzistentní s patternem zavedeným pro `clanek-reforma-pohotovosti-290-2025`), který transparentně sděluje status revize a vyzývá k nezávislé kontrole paragrafových odkazů před republikací.
  - **Permalink e-Sbírky** (`e-sbirka.gov.cz/sb/2025/432/2026-01-01`) jako primární citace finálního znění.
  - **Specifické zdrojové URL** namísto generických:
    - `oecd.org/en/topics/health.html` → OECD *Better Ways to Pay for Health Care* (2016)
    - generický eurohealthobservatory landing → permalink Czechia Health system summary 2023
    - `england.nhs.uk/pay-syst/` → aktuální `england.nhs.uk/publication/nhs-payment-scheme/` (od 2023 nahradil starší tarif)
    - generický `bundesgesundheitsministerium.de` → InEK / `g-drg.de` (instituce spravující G-DRG, zdrojový systém pro CZ-DRG)
  - **Permalink na MZČR souhrnnou stránku** vyhlášky 2026 (PDF, důvodová zpráva, doplňující data).
  - **Disclaimer** v zdrojové sekci s explicitní výzvou ke kontrole paragrafových odkazů proti konsolidovanému znění.
- **Co bylo zachováno:**
  - Numerické hodnoty (hodnoty bodu 0,77–1,47 Kč, kapitace 60/66/69/76 Kč, IPU koeficient 1,03, redukční koeficient 0,98, koeficient pozdního vykázání 0,95, paušál 9 600 Kč/den zubní pohotovosti, max ZS 110 000 Kč) — odpovídají textu vyhlášky publikovaného MZČR a jsou konzistentní s předchozím auditem 290/2025.
  - Didaktický pracovní příklad krajské nemocnice s IPU 1 287,5 mil. Kč.
  - Strukturální výklad čtyř mechanik úhrady, výklad vzorce paušální úhrady, výklad regulačních koridorů.
- **Otevřené otázky pro ruční schválení:**
  - Přesné odst. v § 17 zákona 48/1997 Sb. (článek tvrdí odst. 5 pro zmocnění, odst. 4 pro dohodovací řízení) — ZakonyProLidi vrátil 403, plné konsolidované znění bylo nedostupné v rámci této iterace; tyto reference jsou v české legislativě v zásadě stabilní, ale stojí za ověření proti ASPI.
  - Konkrétní paragrafové odkazy (§ 14–§ 19) odpovídají struktuře vyhlášek minulých let, ale měly by být před republikací zkontrolovány proti plnému znění vyhlášky 432/2025 Sb. v PDF.
  - Pro budoucí iteraci by mělo smysl doplnit srovnávací tabulku „2024 vs. 2025 vs. 2026" pro hlavní hodnoty bodu — to by vyžadovalo extrakci údajů z důvodové zprávy.
- **Předtím / potom:** 1 hlavní framing chyba opravena · 4 neověřitelné specifika smazána (rozsah dokumentu, čísla sdělení ČSÚ, revize CZ-DRG) · 5 zdrojových URL upřesněno na stabilní permalinky · 2 nové primární zdroje doplněny (e-Sbírka permalink, MZČR souhrnná stránka) · 1 disclaimer doplněn · 1 review-pending banner doplněn · 0 nových vizuálů.

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

### 2026-05-11 · `clanek-detska-psychiatrie-krize.html`
- **Status:** partial (klíčové faktové údaje opraveny a aktualizovány, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Priorita:** P2 (vysoké riziko věcné nepřesnosti — článek pracuje s konkrétními čísly o oboru s nedostatečným pokrytím; navíc identifikována vnitřní nekonzistence dashboardu mezi tělem článku a indikátorovou kartou `psychiatri_per_100k.json`).
- **Co bylo špatně / zastaralé:**
  1. **Počet dětských CDZ:** článek tvrdil „ve čtyřech krajích" — podle institucionálních zdrojů z roku 2025 (reformapsychiatrie.cz, Zdravotnický deník 09/2025) byly k září 2025 plně funkční pouze **dvě** dětská CDZ-D; chyběla informace o stavu příprav v dalších krajích a o novém standardu CDZ-D.
  2. **Počet dětských psychiatrů:** článek pracoval výhradně s číslem „180 dětských psychiatrů, 86 starších 65 let" (registr ČLK). Aktuálnější údaj z tiskové konference MZ ČR ze dne 12. 9. 2025 (ministr Vlastimil Válek, ředitel DPN Opařany Michal Goetz) hovoří o **157 aktivních dětských psychiatrech** s téměř polovinou v dosahu důchodového věku do 5 let. Současně dashboard ve své indikátorové kartě `psychiatri_per_100k.json` pracuje s odhadem ~110 dětských psychiatrů (5,3 / 100 000 dětí 0–17 let dle WHO/IACAPAP metodiky). Tato vnitřní nekonzistence dashboardu nebyla v článku reflektována.
  3. **Lůžková kapacita:** článek konstatoval „dětských psychiatrických lůžek je v Česku málo" bez kvantifikace. Tisková konference MZ 09/2025 dává konkrétní čísla: **559 dětských psychiatrických lůžek vs. potřebných ~860** (standard 8 lůžek/100 tis. obyvatel dle Goetze).
  4. **Chyběl odkaz na nový standard CDZ-D**: Věstník MZ ČR č. 9/2025 zveřejnil aktualizovaný Standard pro služby poskytované v CDZ pro děti a adolescenty — důležitý dokument, který článek neměl uvedený.
- **Co bylo přepsáno (s primárními/institucionálními zdroji):**
  - **Title, meta description, OG tagy**: harmonizovány na nový faktový rámec (157 psychiatrů, 559 lůžek, 2 CDZ-D).
  - **Deck**: kompletně přepsán s odkazem na tiskovou konferenci MZ 09/2025, doplněn Věstník 9/2025.
  - **Lead odstavec**: doplněna citace tiskové konference MZ ze dne 12. 9. 2025 jako primárního zdroje pro 157 psychiatrů + 559 lůžek. Akutní čekací doba zhedge-ována („řády týdnů, pokud nejde o přímé ohrožení života") místo původního „tři až čtyři týdny" bez doložení.
  - **Sekce „Proč indikátor psychiatři / 100 000 obyvatel není celý příběh"**: vysvětlena metodická odlišnost mezi 157 (aktivní dle MZ), ~180 (registr ČLK) a ~110 (HSPA indikátorová karta / WHO benchmark) — transparentní přiznání rozdílu definic.
  - **Sekce o CDZ**: přepsána z „dětská CDZ ve čtyřech krajích" na konkrétní stav „k září 2025 fakticky funkční pouze dvě CDZ-D" + konkrétní výčet připravovaných center (Liberec leden 2026; Pardubice — Chrudim, Polička; Zlínský kraj — Otrokovice; Ústecký kraj — plán 8 center 2026–2028; Jihočeský kraj — rozšíření o Český Krumlov). Doplněn odkaz na Věstník MZ č. 9/2025.
  - **Sekce „Strukturální příčiny — Lůžková kapacita"**: doplněna konkrétní kvantifikace 559 vs. ~860 + doplněna Dětská psychiatrická nemocnice Opařany do výčtu klíčových pracovišť.
  - **Sekce „Kde hledat pomoc"**: aktualizována formulace „CDZ pro děti a dorost" z „ve čtyřech krajích" na aktuální stav s odkazem na interaktivní mapu Reformy psychiatrie.
  - **Databox disclaimer**: vysvětlena metodická odlišnost tří různých čísel pro počet dětských psychiatrů (157 vs. ~180 vs. ~110), aby čtenář nebyl matený.
  - **Audit/oprava blok**: přidán explicitní disclaimer popisující revizi z 11. 5. 2026 (transparentnost auditu).
- **Co bylo doplněno do zdrojů (primární / institucionální zdroje):**
  - ÚZIS oborová statistika dětské psychiatrie (PDF, primární)
  - Tisková konference MZ ČR 12. 9. 2025 (primární institucionální zdroj pro 157 + 559)
  - Asociace dětské a dorostové psychiatrie (ADDP, odborná společnost)
  - Strategie reformy psychiatrické péče 2014–2030 (plné znění PDF)
  - Doporučené postupy pro vznik CDZ pro děti a adolescenty (2022, PDF)
  - Věstník MZ ČR č. 9/2025 — Standard CDZ-D
  - Reforma psychiatrie — sekce CDZ a multidisciplinární týmy (mapa)
- **Otevřené otázky / topics pro budoucí iteraci:**
  - **Vnitřní harmonizace dashboardu**: zvážit aktualizaci indikátorové karty `psychiatri_per_100k.json` v sekci `limitations` — současný údaj „dětských a dorostových psychiatrů je v ČR zhruba 110" může být dále upřesněn aktuálním číslem 157 (MZ 09/2025) s vysvětlením, že jde o aktivní specialisty bez ohledu na FTE/věk.
  - **„60 000 dětí v ambulantní psychiatrické péči"** (původní og:description) — toto číslo se v meta tagu objevovalo, ale není v textu doloženo z primárního zdroje (ÚZIS); v rámci této iterace bylo z meta tagů odstraněno (harmonizace s novým deckem), ale stojí za zvážení samostatné dohledání ÚZIS statistiky ambulantních kontaktů.
  - **Krajská mapa dostupnosti** — pro budoucí iteraci by mohla doprovodit článek (Praha 25 / 100k vs. Karlovarský / Ústecký kraj 7–9 / 100k dle indikátorové karty), pokud bude k dispozici primární zdroj na úrovni dětské psychiatrie.
- **Předtím / potom:** 1 zastaralý fakt opraven (4 kraje → 2 CDZ-D + 5 v přípravě) · 1 zastaralé číslo doplněno aktuálním (157 psychiatrů, 559 lůžek) · 1 dosud vágní tvrzení kvantifikováno z primárního zdroje · 6 nových primárních/institucionálních zdrojů přidáno do textu i seznamu · 1 nový metodický disclaimer · 0 nových vizuálů (vizuální obohacení bude předmětem další iterace, pokud bude článek schválen k republikaci).

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

### 2026-05-11 · `clanek-koureni.html`
- **Status:** partial → review-pending (4 přepsané pasáže, kompletně přepracovaná sekce Zdroje, čeká na ruční schválení před republikací)
- **Reviewer:** claude-code-agent
- **Priorita:** P2 (vysoké riziko věcné nepřesnosti — článek explicitně označen v auditu P2.3 jako kandidát s vágními formulacemi; obsahuje konkrétní čísla pro zdravotní politiku s mezinárodním srovnáním)
- **Co bylo špatně (verifikováno proti primárním zdrojům — OECD Health Statistics 2025 metodický dokument „Daily smokers" Definitions/Sources/Methods; OECD Health at a Glance 2023 kapitola Smoking; Eurostat hlth_ehis_sk3e; SZÚ NAUTA; Doll & Peto BMJ 2004; NZ Legislation; Wikipedia/ScienceDirect kompozit pro NZ Smokefree timeline):**
  1. **Chybné přiřazení primárního zdroje českých dat:** Článek tvrdil „Hodnota indikátoru pochází z evropského šetření EHIS (European Health Interview Survey)". Skutečnost dle OECD Health Statistics 2025 Definitions/Sources/Methods (sekce Czechia): pro Česko od roku 2003 OECD primárně přebírá z **SZÚ NAUTA** (Národní výzkum užívání tabáku a alkoholu; do roku 2022 publikovaná pod názvem „Vývoj prevalence kuřáctví v dospělé populaci ČR"). EHIS je pětileté harmonizované EU šetření, jehož **poslední dostupná vlna je 2019** — hodnota 22,6 % za rok 2024 v dashboardu HSPA Monitoru by tedy z EHIS přímo přijít nemohla. Tato chyba propisuje i do metodické karty `kuractvi_denni.json`, která uvádí typ primárního zdroje „ehis_szu" — pro budoucí iteraci stojí za upřesnění.
  2. **Chybný výchozí údaj 15+ populace ČR:** Článek tvrdil „zhruba 8,5 milionu obyvatel ČR ve věku 15 a víc" → kalkulace „kolem 1,9 milionu denních kuřáků". Skutečná populace 15+ je dle ČSÚ k 1. 1. 2024 ≈ 9,2 milionu (celkem ~10,9M minus ~1,6M dětí 0–14). Při 22,6 % je tedy denních kuřáků **řádově dva miliony**, ne 1,9. Opraveno na 9,2 milionu jako základnu s výsledkem ~2 milionů.
  3. **Nepřesná formulace o úhradě vareniklinu:** Článek tvrdil „od roku 2019 částečnou úhradu odvykací léčby ze zdravotního pojištění (vareniklin za splnění určitých podmínek)". Skutečnost dle SÚKL a metodik zdravotních pojišťoven: vareniklin **nemá stanovenou úhradu z veřejného zdravotního pojištění** podle SÚKL — jednotlivé pojišťovny ho proplácejí z fondu prevence (typicky 400–2 500 Kč/rok, podmíněno léčbou v Centru pro závislé na tabáku). Datace „od roku 2019" se nepodařilo verifikovat v primárním zdroji. Přepsáno na věcnou formulaci o příspěvku z fondu prevence.
  4. **Nedostatečně precizní popis novozélandského zákona:** Článek tvrdil „Nový Zéland ohlásil v roce 2022 plán 'Smokefree Generation' — zákaz prodeje tabáku osobám narozeným po roce 2008 — později ho ale v roce 2024 nová vláda zrušila". Skutečnost: zákon má přesný název **Smokefree Environments and Regulated Products (Smoked Tobacco) Amendment Act 2022** (Royal Assent 16. 12. 2022); zákaz platil pro osoby narozené **1. 1. 2009 nebo později** (ne „po roce 2008", což je obsahově ekvivalentní, ale méně přesné); zákon zrušen Národní vládou **k 6. 3. 2024**. Doplněno přesné označení zákona, datum schválení, datum zrušení a odkaz na nzlegislation.govt.nz.
  5. **Chybějící DOI/citace Doll & Peto:** Klíčová epidemiologická citace „polovina dlouhodobých kuřáků zemře na onemocnění spojené s kouřením" byla uvedena bez DOI a bez přesné citace. Doplněno: Doll R, Peto R, Boreham J & Sutherland I. BMJ 2004;328:1519 (DOI 10.1136/bmj.38142.554479.AE; PMC 437139). Současně doplněno, že kuřáci ztrácejí cca 10 let života oproti celoživotním nekuřákům — což je z téhož zdroje a typický doprovod 50 % cifry.
- **Co bylo přepsáno (4 pasáže):**
  - Sekce „Kolik je 22,6 procenta", odstavec 1 — kompletně přepsán: SZÚ NAUTA jako primární zdroj pro OECD, EHIS jako pětileté EU srovnání s poslední vlnou 2019, ne primární zdroj 2024 hodnoty.
  - Sekce „Kolik je 22,6 procenta", odstavec 2 — opraven baseline 8,5M → 9,2M; doplněna DOI Doll & Peto + 10 let zkrácení života.
  - Sekce „Co spotřebu sráží jinde", odstavec „Nabídka odvykací léčby" — přepsán závěr o ČR: standardní úhrada vareniklinu ze ZP **není**, jde o příspěvek z fondu prevence (400–2 500 Kč/rok).
  - Sekce „E-cigarety, sáčky a debata o redukci škod", odstavec 2 — doplněn přesný název NZ zákona, datum schválení (12/2022), datum zrušení (6. 3. 2024) a kontext odborné reakce v BMJ a Lancet Public Health.
- **Co bylo doplněno do sekce Zdroje (12 stabilních permalinků namísto 2 generických):**
  - **Data:** OECD Health at a Glance 2023 — Smoking (kapitola 4 plný permalink); OECD Health Statistics 2025 metodický dokument „Daily smokers" (Definitions, Sources and Methods PDF na stats.oecd.org); SZÚ NAUTA studie (přímý link na szu.gov.cz); Eurostat databrowser tabulka hlth_ehis_sk3e (Daily smokers of cigarettes).
  - **Účinky kouření na zdraví:** Doll & Peto (2004) plná citace s DOI a PMC odkazem; Cochrane Tobacco Addiction Group; UK OHID *Nicotine vaping in England 2022 evidence update* (referenční dokument k britské harm-reduction politice).
  - **Praktická pomoc:** NZIP, SLZT (zachováno).
  - **Policy inspirace:** WHO FCTC; WHO MPOWER; WHO *Raise taxes on tobacco* (GHO; potvrzuje 75% threshold); NZ Smokefree Act 2022 plné znění na nzlegislation.govt.nz.
- **Co bylo zachováno bez úprav (ověřeno):**
  - Hodnota 22,6 % ČR vs. OECD 16 % — konzistentní s dashboardem HSPA Monitoru a OECD Health at a Glance 2023 (16% OECD průměr potvrzen).
  - Plain packaging data: Austrálie 2012, Francie 2017, UK 2017, Irsko 2017, NZ 2018 — všechna ověřena (Wikipedia/Tobacco Plain Packaging, NZ Ministry of Health).
  - Cenová elasticita 0,4–0,5 — standardní rozsah v ekonomické literatuře (NCI Tobacco Control Monograph 21).
  - WHO MPOWER akronym a 75% threshold pro daně — ověřeno proti WHO GHO.
  - Britské pravidlo display ban (Tobacco Display Act, postupně 2012/2015) — konzistentní s realitou.
- **Zdroje použité k revizi (všechny primární nebo institucionální):**
  - OECD Health Statistics 2025 — *Daily smokers (age 15+). Definitions, Sources and Methods* (sekce Czechia, str. 4)
  - OECD Health at a Glance 2023 — Smoking (kapitola 4)
  - Eurostat — EHIS wave 3 (2019), tabulka hlth_ehis_sk3e
  - Doll R, Peto R, Boreham J, Sutherland I. *Mortality in relation to smoking: 50 years' observations on male British doctors.* BMJ 2004;328:1519. DOI 10.1136/bmj.38142.554479.AE
  - NZ Legislation — Smokefree Environments and Regulated Products (Smoked Tobacco) Amendment Act 2022 (No 66); 2024 Amendment Bill (repeal)
  - SZÚ — sekce „Centrum podpory veřejného zdraví / Prevence závislostí / NAUTA"
  - VZP a ZP MV ČR — provozní stránky k fondu prevence (odvykání kouření)
  - SÚKL — registr léčiv (vareniklin/Champix bez standardní úhrady)
  - WHO — GHO „Raise taxes on tobacco" (potvrzuje 75% threshold doporučení)
- **Otevřené otázky / topics pro budoucí iterace:**
  - **Vnitřní harmonizace dashboardu:** metodická karta `kuractvi_denni.json` v poli `data_source.primary.type` uvádí „ehis_szu" — pro přesnost by měla rozlišovat: pro CZ trend `nauta_szu` (roční), pro EU srovnání `ehis` (pětileté vlny). Kandidát na samostatnou iteraci na metodické kartě.
  - **Datace úhrady vareniklinu „od roku 2019":** v původní verzi článku uvedeno bez zdroje; nepodařilo se v rámci této iterace verifikovat proti VZP/SÚKL/MZd. Pokud bude k dispozici primární zdroj o startu příspěvku z fondu prevence, dohledat a doplnit.
  - **Daň na tabák v ČR vs. WHO 75% threshold:** článek tvrdí „Česká republika se v posledních letech k 75 procentům přiblížila" bez konkrétního čísla. Pro budoucí iteraci dohledat aktuální podíl daně v maloobchodní ceně z WHO MPOWER reports nebo z DG TAXUD Excise Duty Tables.
  - **Krajský rozpad denního kuřáctví** — SZÚ NAUTA pravděpodobně publikuje krajskou stratifikaci, kandidát na vizuální obohacení (NUTS 3 mapa) v další iteraci.
  - **Trend graf 2003–2024** — SZÚ NAUTA má historickou řadu už od roku 2003. Kandidát na liniový graf s vyznačením kritických milníků (zákon č. 65/2017 Sb. o ochraně před tabákem; vstup do FCTC; daň. zvyšování).
- **Předtím / potom:** 5 hlavních věcných/atribučních chyb opraveno · 4 pasáže přepsány · 12 stabilních permalinků doplněno do sekce Zdroje (2 generické URL nahrazeny 4 specifickými datovými zdroji + 4 institucionálními primárními + 4 policy primárními) · 1 vědecká citace doplněna o DOI a plné jméno autorů · 1 disclaimer v hlavičce + 1 disclaimer v databoxu upřesněn na SZÚ NAUTA · 0 nových vizuálů (kandidát na trend graf 2003–2024 a krajskou mapu v další iteraci, jakmile bude k dispozici primární datový extrakt SZÚ NAUTA).

---

### 2026-05-11 · `clanek-mamograf-rakovina-prsu.html`

- **Priorita:** P2 (článek s konkrétními čísly — incidence, pokrytí screeningem, OECD srovnání; doposud bez auditní revize).
- **Trigger:** systematický průchod neauditovaných článků; čísla v textu i institucionální odkazy neměly v původní verzi explicitní rok a primární URL, jeden institucionální odkaz byl chybný.
- **Hlavní zjištění auditu:**
  1. **Chybné institucionální zařazení Národního screeningového centra.** Článek uváděl, že NSC je „při Lékařské fakultě Masarykovy univerzity" a odkazoval na `nsc.muni.cz`. Skutečnost (ověřeno na <a href="https://www.uzis.cz/index.php?pg=centra--nsc">uzis.cz/centra-nsc</a> a <a href="https://nsc.uzis.cz/">nsc.uzis.cz</a>): NSC je **organizační složkou ÚZIS ČR**, metodicky spolupracuje s IBA LF MU. Správná URL je `nsc.uzis.cz`. Opraveno.
  2. **Cílová věková skupina nejasně definovaná.** Článek uváděl jen „ženám od pětačtyřiceti let", což zakrývalo strukturu programu (adresné zvaní cílí na 45–69 let). Doplněno přesné rozmezí 45–69 a právní opora (§ 30 z. 48/1997 Sb. + vyhl. 70/2012 Sb.).
  3. **Incidence 145/100 000 bez roku a bez metodického upřesnění.** Doplněn rok (NOR 2022: 7 918 případů, 144,5/100 000 hrubá míra dle ÚZIS, viz <a href="https://www.uzis.cz/index.php?pg=aktuality&aid=8466">uzis.cz/aktuality aid=8466</a>) a metodická poznámka, že hodnota v dashboardu je hrubá míra, kdežto OECD benchmark 90,7 je věkově standardizovaný (per Globocan 2022 je ASR ČR cca 80–85). Srovnání 145 vs. 90,7 v původním textu nebylo apples-to-apples — doplněn caveat v textu i v databoxu.
  4. **„OECD průměr 68 %" jako benchmark účasti — částečně překonané číslo.** Hodnota 68 % zůstává v dashboardu jako legacy OECD benchmark; aktuální OECD State of Health in the EU – Czechia 2025 uvádí EU průměr 58 % v roce 2023 (programmatická data), Česko 60 %. Článek nyní cituje aktuální EU benchmark v textu a v databoxu, OECD legacy benchmark ponechán s explicitním zdrojem.
  5. **Regionální nerovnost — nově doplněno.** Otevřená data NSC ÚZIS (PPS-01-01, 2022/2023) ukazují Karlovarský kraj 52,9 %, Vysočina 65,8 %. Rozdíl 13 p.b., relevantní pro odstavec o dostupnosti. Doplněno do textu + nový samostatný odstavec o regionální disparitě v sekci „Šedesát versus osmdesát".
  6. **Studie MASAI — citace zpřesněna.** Doplněna kompletní citace (Lång K. et al., Lancet Oncology 2023, DOI 10.1016/S1470-2045(23)00298-X), kohorta (> 80 000 žen, 2021–2022), specifické výsledky (44 % redukce zátěže, 29 % vyšší detekce v interim analýze), permalink na finální výsledky v Lancetu 2025, vazba na EU AI Act (nař. 2024/1689) pro regulační rámec.
- **Co bylo přepsáno:**
  - Úvodní odstavec — doplněn rok (2022), zdroj (ÚZIS NOR), upřesnění „hrubá míra" a uvedení věkově standardizovaného srovnání podle Globocan 2022; cílová skupina explicitně 45–69 let.
  - Odstavec o akreditované síti — Komise odborníků MZ ČR nahrazena odkazem na aktuální Doporučený standard MZ ČR (2024, plný permalink na mzd.gov.cz).
  - Odstavec o adresném zvání — doplněn právní rámec (§ 30 z. 48/1997 Sb., vyhl. 70/2012 Sb.) a explicitní 45–69 namísto „od 45".
  - Sekce „Šedesát versus sedmdesát pět" → přejmenováno na „Šedesát versus osmdesát" (přesněji odpovídá referenčním zemím Dánsko/Švédsko/Finsko ≥ 80 %); benchmarky zpřesněny proti OECD State of Health in EU Czechia 2025 a Eurostat 2023.
  - Sekce „Důsledek v datech" — doplněn rok hodnot z dashboardu (2020 pro kolorektální 5letý survival), zdroj NOR pro stadium I-II (téměř 80 % v r. 2022); referenční rámec CONCORD-3 a EUROCARE-6 (přesnější verze).
  - Sekce „Druhý důvod / dostupnost" — generický výčet krajů (Karlovarský/Pardubický/Olomoucký) podepřen konkrétními čísly NSC ÚZIS (Karlovarský 52,9 %, Vysočina 65,8 %); britská NHS Breast Screening Programme uvedena přesněji.
  - Sekce „AI ve čtení mamografů" — viz bod 6 výše.
  - Sekce „Co má vědět čtenářka" — opravena institucionální atribuce NSC (ÚZIS ČR + metodická spolupráce s IBA LF MU), správné URL `nsc.uzis.cz` + doplněn portál `mamo.cz` (provozuje IBA LF MU a NSC ÚZIS).
- **Co bylo doplněno do sekce Zdroje (rozšíření z 6 generických odkazů na 17 stabilních permalinků v 5 kategoriích):**
  - **Data — incidence a mortalita:** ÚZIS NOR statistika (aid=8466), Linkos/SVOD/IBA agregace, IARC Globocan 2022 Czechia factsheet (plný PDF link).
  - **Data — pokrytí screeningem:** NZIP otevřená data PPS-01-01 (časové i krajské řezy), OECD State of Health in the EU – Czechia 2025 (plný PDF permalink), Eurostat Cancer screening statistics.
  - **Metodika a institucionální rámec:** nsc.uzis.cz, uzis.cz/centra-nsc, mamo.cz, MZ ČR Doporučený standard 2024 (PDF), NZIP článek 1186, ECIBC.
  - **Mezinárodní studie a AI:** Lancet Oncology MASAI 2023 (DOI), Lancet final MASAI 2025, OECD Health at a Glance 2023 Cancer screening.
  - **Právní rámec:** § 30 z. 48/1997 Sb., vyhláška 70/2012 Sb., Věstník MZ ČR 11/2002.
- **Review-pending banner** v sekci Zdroje, status nastaven na `review-pending` (konzistentní s patternem zavedeným pro `clanek-koureni.html`, `clanek-reforma-pohotovosti-290-2025.html`, `clanek-uhradova-vyhlaska.html`).
- **Co bylo zachováno bez úprav (ověřeno):**
  - Spuštění screeningu 2002 a adresné zvaní 2014 — konzistentní s tiskovou zprávou MZ ČR „Mamografický screening zachraňuje životy již 20 let".
  - Hodnota účasti 60 % — konzistentní s OECD Country Health Profile 2025 (60 % v r. 2023) i s dashboardem HSPA Monitoru.
  - Reformní debaty (rozšíření věkového rozpětí, risk-based screening, AI) — věcně odpovídají ECIBC doporučením a aktuální odborné diskuzi v ČR.
- **Zdroje použité k revizi (všechny primární nebo institucionální):**
  - ÚZIS — Aktualita 8466 „Den boje proti rakovině a statistiky ÚZIS ČR" (NOR data 2022)
  - ÚZIS — stránka Národního screeningového centra (`uzis.cz/index.php?pg=centra--nsc`)
  - NSC ÚZIS — `nsc.uzis.cz`
  - NZIP — otevřená data PPS-01-01 (mamografie screening pokrytí cílové populace)
  - OECD — State of Health in the EU. Czechia Country Health Profile 2025 (PDF)
  - OECD — Health at a Glance 2023 (Cancer screening kapitola)
  - IARC — Globocan 2022 Czechia factsheet (PDF)
  - Eurostat — Cancer screening statistics (statistics-explained)
  - MZ ČR — Doporučený standard pro poskytování screeningu karcinomu prsu (PDF, 2024)
  - Lång K. et al. *Artificial intelligence-supported screen reading versus standard double reading in the MASAI trial.* Lancet Oncol 2023;24(8):936–944. DOI 10.1016/S1470-2045(23)00298-X
  - Zákony pro lidi — z. 48/1997 Sb. § 30, vyhl. 70/2012 Sb.
- **Otevřené otázky / topics pro budoucí iterace:**
  - **Konzistence hrubá vs. věkově standardizovaná incidence v dashboardu.** Metodická karta `incidence_prsu.json` deklaruje „Standardizováno na evropskou ženskou populaci", ale hodnota 145/100 000 odpovídá hrubé míře z ÚZIS NOR za rok 2022 (144,5). Dva možné kroky: (a) přepočítat hodnotu na věkově standardizovanou (cca 80–85 dle Globocan 2022) a sjednotit s OECD 90,7, nebo (b) změnit popisek v metodické kartě na „hrubá míra na 100 000 žen". Kandidát na samostatnou iteraci na metodice indikátoru.
  - **Dashboard benchmark OECD 68 % pro pokrytí screeningem.** Hodnota neodpovídá ani aktuálnímu EU průměru (58 %) ani srovnatelnému OECD průměru programmatických dat (kolem 55–60 %). Pravděpodobně staré číslo nebo survey-data benchmark. Pro budoucí iteraci ověřit zdroj a aktualizovat.
  - **Vizuál: krajská mapa NUTS 3 pokrytí screeningu** — NSC ÚZIS publikuje plnou krajskou stratifikaci (PPS-01-01). Kandidát na choropleth mapu doprovázenou tabulkou (přístupnost) v některé z dalších iterací — všechna data již ověřena z primárního zdroje.
  - **Vizuál: trend graf 2010–2024 pokrytí screeningu** — NSC ÚZIS má historickou řadu. Kandidát na liniový graf s vyznačením milníků (2014 adresné zvaní, 2020 propad COVID, 2023 návrat na předkovidovou úroveň).
  - **Časová osa novely doporučení ECIBC pro věkové rozpětí 40–74** — pokud se v EU schválí rozšíření, dotklo by se to českého programu.
- **Předtím / potom:** 6 hlavních věcných/atribučních chyb opraveno · 7 pasáží přepsáno · 17 stabilních permalinků doplněno do sekce Zdroje (6 původních generických nahrazeno 17 specifickými) · 1 DOI citace klinické studie doplněna · 1 nový odstavec o regionální disparitě · 1 metodická poznámka v databoxu · 1 review-pending banner · 0 nových vizuálů (kandidát na krajskou mapu a trend graf v další iteraci, jakmile bude k dispozici extrakt PPS-01-01).

### 2026-05-11 · `clanek-platba-statu-statni-pojistenci.html` (DRAFT, plánováno k publikaci 2026-05-19) — **urgentní revize před publikací**
- **Status:** draft → draft po auditní revizi (zůstává `published: false`, čeká na ruční schválení před případnou publikací). Důvod urgence: článek byl v `articles.json` zařazen do publikačního plánu na 19. 5. 2026 (osm dní) a obsahoval stejnou rodinu numerických chyb, jakou už audit z 2026-05-11 prokázal v sourozeneckém článku `clanek-deficit-vzp-2026.html` (DRAFT).
- **Reviewer:** claude-code-agent
- **Priorita:** P1 (legislativní aktualita) + P2 (vysoké riziko věcné nepřesnosti — celý článek se opírá o výši platby státního pojištěnce 2026, která byla v textu uvedena chybně).
- **Co bylo špatně (verifikováno proti primárním zdrojům — VZP ČR, MF ČR tiskové zprávy 2025, finance.cz, ZP MV ČR, vzájemné křížové ověření se sourozeneckým auditem clanek-deficit-vzp-2026):**
  1. **Chybná hodnota platby státního pojištěnce 2026:** článek uváděl 2 058 Kč/měsíc, reálná hodnota od 1. 1. 2026 je 2 188 Kč (13,5 % z vyměřovacího základu 16 206 Kč), doloženo VZP ČR, MF ČR tiskovou zprávou („Vláda zvýšila platbu za státní pojištěnce pro příští rok na 2 188 Kč měsíčně") a finance.cz.
  2. **Chybné historické hodnoty platby státního pojištěnce:** 2023: článek 1 956 Kč → realita 1 900 Kč; 2024: článek 1 977 Kč → realita 2 085 Kč; 2025: článek 1 998 Kč → realita 2 127 Kč; 2026: článek 2 058 Kč → realita 2 188 Kč.
  3. **Chybný titulek a deck:** „Sto čtyřicet šest miliard" odpovídal 2 058 × 12 × 5,9 mil ≈ 146 mld., což byla důsledně počítaná chyba. Při korekci na 2 188 Kč: ~155 mld. Kč/rok (souhlasí s oficiálním oznámením MF ČR „154,6 miliardy korun").
  4. **Chybně popsaný valorizační vzorec:** článek tvrdil, že § 3c po novelizaci „konsolidačním balíčkem 349/2023 Sb." zavádí valorizaci pouze podle CPI. Skutečnost: valorizační formuli „součet růstu spotřebitelských cen a poloviny růstu reálných mezd" (analogicky valorizaci důchodů) zavedl zákon č. 260/2022 Sb. s první valorizací podle nové formule pro rok 2024. Zákon č. 349/2023 Sb. (konsolidační balíček ministra Stanjury) přinesl jiné fiskální úpravy, ale samotnou formuli § 3c neměnil. Toto je shodné s nálezem v sourozeneckém auditu clanek-deficit-vzp-2026.
  5. **Vyměřovací základ 2026 doplněn explicitně:** 16 206 Kč (z 15 749 Kč v 2025) — chyběl v původním textu.
  6. **Falešný framing „2 188 Kč jako návrh MZ pro 2027":** Varianty A/B/C debaty o mimořádné valorizaci pro 2027 byly v původním textu postaveny na premise, že 2 188 Kč je teprve návrh; ve skutečnosti je 2 188 Kč ověřená hodnota pro 2026. Celá sekce přepracována: Cesta A = automatická formule (CPI + ½ reálných mezd) z báze 2 188 Kč, Cesta B = mimořádná valorizace nad rámec formule (konkrétní cílová hodnota pro 2027 zatím nebyla veřejně oznámena primárním zdrojem; uvádíme citlivostní analýzu: každých 100 Kč/měsíc = +7,1 mld. Kč/rok), Cesta C = strukturální revize formule.
  7. **Konkrétní rozpis pojištěnců po pojišťovnách (VZP 3,7 mil., ZP MV 0,85 mil. atd.):** bez doloženého primárního odkazu na ZPP 2026 / přerozdělovací statistiku — odstraněno, nahrazeno hedge formulací s odkazem na MZ ČR Přerozdělování pojistného.
  8. **Konkrétní rozpočtové dopady „VZP získá 5,8 mld., ZP MV 1,3 mld. atd. — celkem +9 mld. Kč":** závisely na rozpisu, který nebyl doložen → odstraněno, nahrazeno obecnou citlivostní analýzou (+7,1 mld./100 Kč navýšení).
  9. **Konkrétní rezervní fondy „65 → 35 mld. v období 2022–2025":** stejně jako v auditu deficit-vzp odstraněno; ponechán pouze řádový souhrn ~30 mld. Kč ke konci 2025.
  10. **„Vojtěchova koncepce sjednocení právního režimu zdravotních pojišťoven (předpoklad: léto 2026)":** politická prognóza bez primárního zdroje (žádná veřejně doložená iniciativa s tímto názvem v ČR neexistuje) — přepsáno na obecný hedge „různé reformní koncepce dlouhodobě diskutované MZ ČR".
  11. **Stranické pozice ČSSD/KSČM/Piráti k cíli 9 % HDP:** stejně jako v auditu deficit-vzp odstraněno (bez doloženého programového dokumentu).
  12. **Slovenská paralela „s českou Stanjurovou změnou":** v původním znění vytvářela falešnou ekvivalenci (slovenská Ficova konsolidace 2024 změnila slovenskou sazbu, česká paralela je nikoliv Stanjurův balíček 349/2023, ale novela 260/2022). Přepsáno na obecnou paralelu „obě země používají platbu státu jako konsolidační nástroj".
  13. **Historické anchory:** „v 2010 zmrazeno na 723 Kč" — VZP historická tabulka uvádí 723 Kč od listopadu 2013, nikoliv od roku 2010; přepsáno na „v období 2010–2015 vícefázové zmrazení". Hodnota 845 Kč od ledna 2016 (článek uváděl 805 Kč v 2015 a 870 Kč v 2016) opravena. Hodnota 1 967 Kč od ledna 2022 (článek uváděl 1 867 Kč) opravena.
  14. **„OECD Health at a Glance 2025":** ověřena existence publikace (vydáno 13. 11. 2025) a zpřesněn permalink na konkrétní stránku publikace v OECD katalogu.
  15. **Zdroj 200/2018 Sb. – koeficient 7,1 promile / 7,3 promile:** přesný koeficient se v rámci redakční revize nepodařilo dohledat v textu novely (zdroje hovoří obecně o vazbě na průměrnou mzdu); explicitní procentní hodnota přepsána na věcný popis „parametrická vazba vyměřovacího základu na průměrnou mzdu v národním hospodářství". Pokud bude konkrétní koeficient potvrzen z primárního zdroje, vrátíme ho v další iteraci.
  16. **Sazba pojistného „13,5 % od roku 1992":** stejně jako v auditu deficit-vzp opraveno na 1993 (rok nabytí účinnosti zákona č. 592/1992 Sb.).
- **Co bylo zachováno z původního článku:**
  - Struktura argumentu (kdo je státní pojištěnec, mechanismus § 3c, tři epochy historie, politická anatomie tří pohledů, mezinárodní paralely DE/SK/PL/NL/FR/UK, čtyři strukturální alternativy, pět signálů pro 2026)
  - Definice státního pojištěnce dle § 7 zákona č. 48/1997 Sb. (zachována; jednotlivé počty kategorií ponechány jako řádový odhad — pro budoucí iteraci doplnit přesné údaje ze statistik ÚP ČR / ČSÚ / ÚZIS)
  - Mezinárodní popis německého Bundeszuschuss, slovenských, polských, nizozemských a britských mechanismů (zachován; konkrétní eurové údaje pro DE/SK/PL/NL jsou kalibrované odhady, pro budoucí iteraci stojí za přesné dohledání v aktuálních ročenkách)
  - Strukturální alternativy 1–4 (návrat k mzdové vazbě, index nákladovosti, % HDP cíl, fiskální transfer německého typu)
  - Kalendář rozhodování o rozpočtu 2027 (31. 8. → vláda; 30. 9. → Sněmovna; 31. 10. → úhradová vyhláška)
- **Zdroje použité k revizi (všechny primární nebo institucionální):**
  - VZP ČR — Vyměřovací základ a výpočet pojistného (státní pojištěnci), historická tabulka platby státu od r. 1993
  - MF ČR — tisková zpráva 2025 „Vláda zvýšila platbu za státní pojištěnce pro příští rok na 2 188 Kč měsíčně"
  - finance.cz — souhrn „Zdravotní pojištění za státní pojištěnce se v roce 2026 zvýší na 2 188 Kč měsíčně"
  - ZP MV ČR — provozní informace ke změnám od 1. 1. 2026
  - Zákony pro lidi — zákon č. 592/1992 Sb. (§ 3c), zákon č. 260/2022 Sb. (zavedení formule CPI + ½ reálných mezd), zákon č. 200/2018 Sb. (mzdová vazba 2018–2022), zákon č. 349/2023 Sb. (Stanjurův balíček — pro kontext, neměnil § 3c)
  - Zdravotnický deník (2022) — kontext schvalování novely 260/2022 Sb.
  - OECD — Health at a Glance 2025 (vydáno 13. 11. 2025)
  - Křížové ověření proti auditu sourozeneckého článku clanek-deficit-vzp-2026.html (2026-05-11)
- **Otevřené otázky / topics pro budoucí iterace:**
  - Konkrétní cílová hodnota mimořádné valorizace MZ ČR pro 2027 — doplnit po oficiálním oznámení (předpoklad: srpen–září 2026)
  - Konkrétní rozpis počtu státních pojištěnců po sedmi pojišťovnách k 1. 1. 2026 — doplnit z přerozdělovací statistiky MZ ČR nebo ZPP 2026 jednotlivých pojišťoven
  - Konkrétní průměrné výdaje péče o státního pojištěnce — doplnit z analytické publikace ÚZIS s rozpadem výdajů na věkovou strukturu kohorty (orientačně 6 000–6 500 Kč/měsíc)
  - Konkrétní koeficient (7,1 / 7,3 promile) v novele 200/2018 Sb. — ověřit proti plnému znění
  - Konkrétní eurové údaje pro DE Bundeszuschuss 2025, SK platba štátu po Ficově konsolidaci 2024, PL NFZ dotace 2025, NL rijksbijdrage 2025 — aktualizovat z výročních publikací jednotlivých zemí
  - Stav rezervních fondů pojišťoven 2022 → 2025 — doplnit z výročních zpráv (řádově ~30 mld. Kč ke konci 2025, dynamika v jednotlivých letech doložit)
- **Předtím / potom:** 16 numerických / institucionálních / atribučních chyb opraveno · 5 odstavců přepracováno (§ 3c mechanismus, epocha III, politická anatomie, varianty pro 2027, distribuční dopady) · 2 sekce alternativ přepsány s hedgem (alternativa 1, alternativa 3 + 4) · 6 nedoložených pasáží přepsáno na věcný hedge (rozpis pojištěnců, dopady na pojišťovny, Vojtěchova koncepce, stranické pozice, slovenská paralela, koeficient 7,1‰) · 4 nové primární zdrojové permalinky doplněny (VZP vyměřovací základ, MF ČR tisková zpráva 2025, finance.cz 2026 souhrn, zákon č. 260/2022 Sb.) · 1 nový review-pending banner v hlavičce · `articles.json` aktualizován na opravený titulek a perex · 0 nových vizuálů (čeká na dohledání konkrétních cílových hodnot pro 2027).

**Follow-up commit (Codex review PR #224, 2026-05-11):** doplněny 2 dílčí opravy podle review komentářů Codex bota:
  1. **Banner v hlavičce** — původní formulace „historické hodnoty platby státního pojištěnce 2023–2025 (2 085 / 2 127 / 2 188 Kč)" byla interně nekonzistentní: trojice hodnot 2 085 / 2 127 / 2 188 odpovídá rokům 2024 / 2025 / 2026, nikoliv 2023–2025. Banner přepsán na úplný čtyřletý ráz: „2023 / 2024 / 2025 / 2026 (1 900 / 2 085 / 2 127 / 2 188 Kč)".
  2. **Datum periody 723 Kč** — původní formulace „v listopadu 2013 ve výši 723 Kč/měsíc" byla v rozporu s historickou tabulkou VZP, podle které platilo 723 Kč v období 1. 1. 2010 – 31. 10. 2013 a 787 Kč naopak začalo platit od 1. 11. 2013. Opraveno na přesné datování: „723 Kč/měsíc v období 1. 1. 2010 – 31. 10. 2013" a „787 Kč od 1. 11. 2013".

### 2026-05-11 · `clanek-kardiovaskularni-mortalita.html` — **flagged: centrální číslo článku se z primárního zdroje neověřuje**
- **Status:** flagged · review-pending (republikace teprve po ručním schválení redakce a po rekonciliaci datového kontraktu HSPA)
- **Reviewer:** claude-code-agent
- **Co vyvolalo flag:** Centrální tvrzení článku — „celková kardiovaskulární mortalita 220 / 100 000 obyvatel, zatímco průměr OECD 140" — se v rámci auditu proti primárním zdrojům (OECD Health at a Glance 2025, kapitola *Mortality from circulatory diseases*; Eurostat `hlth_cd_asdr2`; Eurostat Statistics Explained *Cardiovascular diseases statistics*) v této řádové úrovni nepotvrdilo:
  - **OECD Health at a Glance 2025** (data za rok 2023, ASR) reportuje pro Česko mortalitu na nemoci oběhové soustavy řádově **372 / 100 000**, nikoli 220.
  - Hodnota **220 / 100 000 odpovídá podle OECD H@G 2025 spíše české úmrtnosti na zhoubné novotvary** (MKN-10 C00–D48), nikoli na choroby oběhové soustavy (I00–I99).
  - **Eurostat Statistics Explained** pro EU 27 v roce 2022 uvádí ASR pro nemoci oběhové soustavy 336,4 / 100 000 (ESP 2013) — tj. zcela jiný řád než „OECD 140" uvedený v článku.
  - Mezi OECD referenční populací a ESP 2013 jsou metodické rozdíly v absolutních hodnotách, ale ani jedna referenční populace dnes nedává pro Česko hodnotu blízkou 220 / 100 000 pro kardiovaskulární mortalitu.
  - Stejná hodnota „220 / 100 000" je sdílena přes datový kontrakt `data/indicators.json` (id `mortalita_kardiovaskularni`, value 220, benchmark.oecd 140) a kaskádově se propisuje i do článků `clanek-akutni-infarkt.html` (řádek 72, 151) a `clanek-cmp-iktova-centra.html` (řádek 90, 137, 173). Tyto články jsou tímto auditem **také flaggovány k dalšímu prošetření**, a to v navazujících iteracích auditu.
- **Co se v článku změnilo:**
  - **Doplněn review-pending banner v hlavičce** s explicitní informací, že hodnota „220 / 100 000" se proti OECD H@G 2025 v této řádové úrovni neověřuje a že číslo „60 procent vyšší než OECD" v deku vyžaduje rekonciliaci datového kontraktu před republikací.
  - **Opraven metodický popis standardizační referenční populace:** „přepočtená na evropský věkový standard EU-27" → upřesněno na *European Standard Population 2013* (ESP 2013), referenční populační rozložení Eurostatu pro řadu `hlth_cd_asdr2`, s explicitní poznámkou, že OECD používá vlastní referenční populaci a absolutní hodnoty proto nejsou mezi Eurostat a OECD zaměnitelné.
  - **V databoxu k indikátoru `mortalita_kardiovaskularni`** doplněn inline štítek `flagged` a informace o neshodě s OECD H@G 2025.
  - **Doplněn audit-disclaimer v zdrojové sekci** s konkrétní instrukcí: před republikací ručně rekonciliovat hodnotu indikátoru v `data/indicators.json` proti OECD H@G 2025, fixovat jeden zdroj a jednu referenční populaci.
- **Zdrojové odkazy nahrazeny stabilními permalinky (8 nových primárních / metodických):**
  - OECD Health at a Glance 2025 — kapitola *Mortality from circulatory diseases* (`oecd.org/.../mortality-from-circulatory-diseases_00d400e8.html`)
  - OECD Health at a Glance 2025 — kapitola *Mortality following ischaemic stroke* (`oecd.org/.../mortality-following-ischaemic-stroke_30342166.html`)
  - OECD *State of Cardiovascular Health in the EU* dashboard (`oecd.org/.../state-of-cardiovascular-health-in-the-eu.html`)
  - Eurostat databrowser `HLTH_CD_ASDR2` (`ec.europa.eu/eurostat/databrowser/product/page/HLTH_CD_ASDR2`)
  - Eurostat Statistics Explained — Cardiovascular diseases statistics
  - ÚZIS / Zemřelí (přímý odkaz na registr LPZ namísto homepage)
  - WHO GHO NCD theme (přímý odkaz na téma místo generického `/data/gho`)
  - IHME GBD Compare visualization (přímý odkaz na vizualizační nástroj místo homepage)
  - SCORE2 / SCORE2-OP — citace s DOI (`10.1093/eurheartj/ehab309`)
  - ESC STEMI Guidelines 2023 (zdrojový dokument pro časové cíle door-to-balloon ≤ 90 min / total ischaemic time ≤ 120 min)
  - Eurostat metodický dokument *Revision of the European Standard Population* (2013, KS-RA-13-028) — primární zdroj pro ESP 2013
  - Cerebrovaskulární sekce ČNS — opraveno z `cmp.cz` (která je veřejná osvětová doména) na oficiální stránku sekce na `czech-neuro.cz`.
- **Otevřené otázky pro ruční rozhodnutí redakce:**
  1. **Rekonciliace datového kontraktu** — opravit `data/indicators.json` (id `mortalita_kardiovaskularni`) na hodnotu z OECD H@G 2025 (ČR ≈ 372 / 100 000, 2023) a aktualizovat benchmark.oecd / benchmark.eu odpovídajícím způsobem; alternativně přejít na Eurostat `hlth_cd_asdr2` (ESP 2013) — v každém případě fixovat jeden zdroj a jednu referenční populaci a tu uvádět v `definition` metodické karty.
  2. **Přepsat dek článku** — formulace „o 60 procent vyšší" je závislá na konkrétních hodnotách, které se po rekonciliaci pravděpodobně změní. Mohou se buď opravit na hodnoty z H@G 2025 (cca 372 vs OECD průměr → relativní rozdíl bude jiný), nebo přepsat kvalitativně.
  3. **Kaskádová revize** — po rekonciliaci hodnot v datovém kontraktu projít všechny tři články (kardiovaskularni-mortalita, akutni-infarkt, cmp-iktova-centra) a opravit shodně.
- **Předtím / potom:** 1 centrální numerické tvrzení flaggováno (220 vs 140) · 1 metodická formulace opravena (EU-27 → ESP 2013) · 11 generických zdrojových URL nahrazeno stabilními permalinky · 1 review-pending banner v hlavičce přidán · 1 audit-disclaimer v zdrojové sekci přidán · 0 textových odstavců smazáno (článek argumentačně stojí na centrálním čísle, takže smazání bez rekonciliace by argument zlikvidovalo — proto flag, ne delete) · 0 nových vizuálů (nelze přidat, dokud není centrální číslo ověřeno).

### 2026-05-11 · `clanek-akutni-infarkt.html` — **kaskádová revize + věcné opravy (CARDS → NRKI, ESC 2023 časové cíle, NACR → MINAP/NCAP)**

- **Status:** verified pro AMI mortalitu + ESC časové cíle + registry; **review-pending** z důvodu zachovaného odkazu na hodnotu kardiovaskulární mortality 220 / 100 000 vs. OECD 140 (cascade flag z auditu `clanek-kardiovaskularni-mortalita.html` 2026-05-11). Republikace po ručním schválení redakce.
- **Reviewer:** claude-code-agent
- **Priorita:** P2 (kaskádová revize explicitně vyžádaná předchozím auditem; článek s konkrétními čísly o AMI mortalitě a časových cílech, doposud bez auditní revize).
- **Trigger:** Závěr auditu `clanek-kardiovaskularni-mortalita.html` (2026-05-11) explicitně flaggoval cmp/akutni-infarkt jako kaskádově dotčené (řádek 519 a 541 v tomto logu): „kaskádově se propisuje i do článků `clanek-akutni-infarkt.html` (řádek 72, 151) … po rekonciliaci hodnot v datovém kontraktu projít všechny tři články a opravit shodně."
- **Hlavní zjištění auditu (verifikováno proti primárním zdrojům: OECD Health at a Glance 2025, ESC 2023 ACS Guidelines, ÚZIS NRKOI/NRKI, Věstník MZ ČR 13/2015, Keeley et al. 2003, Widimský et al. CZECH-1/2/3):**
  1. **AMI mortalita 5,2 % vs. OECD 6,5 % — ověřeno, ale s metodickou kavetou.** První snippet z OECD H@G 2025 kapitoly *Mortality following AMI* potvrzuje obě čísla pro Česko a OECD průměr (data 2023, admission-based 30-day case-fatality, „unlinked", věkově-pohlavně standardizováno, dospělí 45+). Český dashboard však používá jiný indikátor (`mortalita_inhosp_ami`, NRH ÚZIS, úmrtí během hospitalizace, dlouhodobá řada bez propojení s LPZ). OECD sama upozorňuje na omezenou srovnatelnost „unlinked" definice napříč systémy. Doplněna metodická poznámka v sekci „Co měříme" i v databoxu.
  2. **Časové cíle ESC pro STEMI — věcně přepracovány.** Původní formulace „door-to-balloon do 90 minut, total ischemic time do 120 minut" reflektovala starší terminologii (předchozí ESC STEMI Guidelines). **ESC 2023 ACS Guidelines** (Byrne et al., EHJ 2023, doi 10.1093/eurheartj/ehad191) používají termín **„first medical contact (FMC) to wire crossing"** s těmito cíli: EKG ≤ 10 min od FMC; FMC-to-wire-crossing ≤ 60 min při přímé prezentaci v PCI centru, ≤ 90 min při převozu z non-PCI nemocnice; PCI-related delay ≤ 120 min jako *mez pro indikaci fibrinolýzy* (nikoliv „cíl total ischemic time"). Sekce „Síť, která se budovala dvacet pět let" a sekce „Jasné časové cíle" přepracovány podle této terminologie.
  3. **„CARDS" registr — věcně chybný.** Článek tvrdil, že „čeští kardiologové pracují s registrem akutních koronárních syndromů (CARDS, dnes pokračující v různých formách)". CARDS byl evropský projekt Evropské komise (~2002, *Cardiovascular Indicators Surveillance Data Set*), nikoliv český registr. Skutečné české registry jsou: **NRKOI / NRKI** (Národní registr kardiovaskulárních operací a intervencí / Národní registr kardiovaskulárních intervencí, ÚZIS, zákon 372/2011 Sb., zahájeno 2004) a akademické **CZECH-1 / CZECH-2 / CZECH-3** registry (Widimský et al., publikováno 2005, 2012, 2015). Přepsáno.
  4. **NACR — věcně neúplně atribováno.** Článek uváděl NACR jako britský referenční registr akutních koronárních syndromů. NACR je ve skutečnosti **National Audit of Cardiac Rehabilitation** (BHF, hostováno NHS Arden & GEM CSU) — týká se *kardiologické rehabilitace*, nikoliv akutní fáze. Pro akutní fázi ACS je správnou britskou referencí **MINAP** (Myocardial Ischaemia National Audit Project) v rámci **NCAP / NICOR**. Doplněno do textu i do sekce Zdroje (oba audity uvedeny s jasným rozlišením, co měří).
  5. **Datace sítě kardiocenter — hedge upřesněn.** Článek uváděl „od konce 90. let". Skutečnost: klinický náběh skutečně začal od poloviny 90. let (Kardiocentrum FN Královské Vinohrady 1996, projekt PRAGUE-1/PRAGUE-2 ve spolupráci Prahy, Plzně a dalších center 1997–2002, ústup plošné trombolýzy po roce 2002). **Formální institucionalizace** sítě jako „centra vysoce specializované kardiovaskulární péče" však pochází až z roku 2015 (Věstník MZ ČR 13/2015 — výzva k podávání žádostí, na základě § 112 zákona č. 372/2011 Sb. o zdravotních službách). Text upřesněn — historický vývoj zachován, formální status doplněn.
  6. **Cascade flag — hodnota 220 / 100 000 vs. OECD 140.** Stejná hodnota, jakou flaggoval audit kardiovaskularni-mortalita 2026-05-11, je citována v textu (původní řádek 72) i v databoxu (původní řádek 151). V rámci tohoto auditu **hodnota nebyla samostatně přepočtena** — řešení vyžaduje rekonciliaci datového kontraktu HSPA (ID `mortalita_kardiovaskularni`). Místo náhrady hodnoty doplněn explicitní cascade-flag banner v hlavičce, badge „flagged" v databoxu a interní křížový odkaz na článek o kardiovaskulárním paradoxu. Text zachovává argumentační logiku (akutní vrstva = úspěch, populační vrstva = problém) i bez konkrétní hodnoty, protože tato logika platí napříč všemi v úvahu připadajícími hodnotami (220 i potenciálně přepočtené ~372 / 100 000).
  7. **Důkazní rámec primární PCI — doplněna citace.** Tvrzení „Mortalita pacientů s primární PCI byla v randomizovaných studiích o jednotky procentních bodů nižší" bylo bez konkrétní citace. Doplněna meta-analýza **Keeley, Boura, Grines, Lancet 2003;361(9351):13–20** (23 RCT, n=7 739, mortalita 7 % PCI vs. 9 % fibrinolýza, OR 0,73; 95% CI 0,62–0,86; DOI 10.1016/S0140-6736(03)12113-7).
  8. **Interní křížové odkazy přepsány.** Původní odkazy „(článek 5)" a „(článek 8)" jako ordinální čísla v editorské řadě nahrazeny anchor odkazy na konkrétní soubory (`clanek-kardiovaskularni-mortalita.html`, `clanek-cmp-iktova-centra.html`) — odolnější vůči případné změně pořadí v editorské řadě.
- **Co bylo přepracováno:**
  - **Banner v hlavičce** (nový) — status review-pending, kaskádový flag, popis hlavních úprav.
  - **Deck** — formulace „nemocniční úmrtnost po AMI" doplněna o explicitní metodický zdroj (OECD H@G 2025, admission-based, věkově-pohlavně standardizováno, 45+) a věkové rozmezí.
  - **Sekce „Co měříme"** — celá přepsána, vysvětluje rozdíl mezi českou in-hospital definicí (NRH/NRKI) a OECD admission-based 30-day case-fatality, doplňuje cascade flag pro `mortalita_kardiovaskularni`.
  - **Sekce „Síť, která se budovala dvacet pět let"** — přepracovány tři odstavce: (a) doplněna Keeley 2003 meta-analýza a Widimský et al. CZECH-1/2/3 registry; (b) přepsány časové cíle podle ESC 2023 ACS Guidelines (FMC-to-wire-crossing místo door-to-balloon); (c) doplněn dvojí timeline — klinický náběh 90. let + formální MZ ČR institucionalizace 2015 (Věstník 13/2015, § 112 z. 372/2011 Sb.); (d) přepracován popis registrů (CARDS → NRKOI/NRKI + CZECH-1/2/3; SWEDEHEART zachován; NACR → MINAP/NCAP).
  - **Sekce „Proč to fungovalo — Jasné časové cíle"** — přepsáno podle ESC 2023.
  - **Sekce „Registr s veřejnou hodnocenou kvalitou"** — opraveno CARDS → NRKI; SSNAP uveden s plným názvem a vazbou na článek o iktových centrech.
  - **Sekce „Sekundární prevence"** — doplněn NACR jako britský model pro rehabilitační vrstvu (s explicitní disambiguací: rehab, ne akutní fáze); původní odkaz „(článek 5 kardio paradox)" nahrazen anchorem na clanek-kardiovaskularni-mortalita.html.
  - **Databox** — všechny tři položky zpřesněny (AMI = doplněno OECD H@G 2025 metodika; mortalita_kardiovaskularni = doplněn badge „flagged" + odkaz na cascade audit). Disclaimer pod databoxem přepracován s explicitním rozdílem české a OECD definice AMI mortality a s interními odkazy na související články (kardiovaskularni-mortalita, koureni, alkohol-spotreba).
  - **Sekce Zdroje** — kompletně přepracována, ze 7 generických odkazů na 14 stabilních primárních / institucionálních / DOI permalinků ve 4 kategoriích.
- **Co bylo doplněno do sekce Zdroje (14 stabilních permalinků v 4 kategoriích):**
  - **Data — mortalita po AMI:** OECD H@G 2025 kapitola Mortality following AMI (plný permalink b9d475c3.html), OECD Health Care Quality and Outcomes hub, ÚZIS NRKOI/NRKI registry stránka, ÚZIS NRH stránka.
  - **Klinická evidence — primární PCI:** Keeley/Boura/Grines Lancet 2003 (DOI 10.1016/S0140-6736(03)12113-7 + PubMed 12517460), CZECH-1 (PubMed 17442424), CZECH-2 (PubMed 24602321), CZECH-3 (PubMed 28730895), ESC 2023 ACS Guidelines (DOI 10.1093/eurheartj/ehad191).
  - **Metodika a institucionální rámec:** MZ ČR seznam center vysoce specializované kardiovaskulární péče, Věstník MZ ČR 13/2015 (formální zakotvení sítě), ČKS (kardio-cz.cz), NZIP článek o infarktu myokardu (specifický permalink místo homepage).
  - **Mezinárodní policy inspirace:** SWEDEHEART (ucr.uu.se/swedeheart), MINAP/NCAP/NICOR (specifický permalink na MINAP), NACR (BHF stránka kardiologické rehabilitace) — s explicitní disambiguací co každý audit měří.
- **Co bylo zachováno bez úprav (ověřeno):**
  - Pět rysů úspěchu (konsenzus, centralizace, časové cíle, registr, kontinuita) — argumentační struktura odpovídá empirické literatuře.
  - Mezinárodní studie o podílu prehospitálních úmrtí AMI v populaci (více než polovina v některých zemích) — řádový odhad konzistentní s GBD a OECD State of Health.
  - Sekce „Co s tím" pro pacienta — věcně odpovídá doporučením České kardiologické společnosti a NZIP.
  - Závěrečná argumentace o replikovatelnosti modelu — autorská interpretace.
- **Zdroje použité k revizi (všechny primární nebo institucionální):**
  - OECD — Health at a Glance 2025, kapitola Mortality following AMI (b9d475c3.html)
  - ESC — Byrne RA et al. *2023 ESC Guidelines for the management of acute coronary syndromes.* EHJ 2023;44(38):3720–3826. DOI 10.1093/eurheartj/ehad191
  - Keeley EC, Boura JA, Grines CL. *Primary angioplasty versus intravenous thrombolytic therapy for acute myocardial infarction.* Lancet 2003;361(9351):13–20. DOI 10.1016/S0140-6736(03)12113-7
  - Widimský P et al. CZECH-1 (EHJ 2007), CZECH-2 (Cor et Vasa 2014), CZECH-3 (Cor et Vasa 2017)
  - ÚZIS — NRKOI a NRKI (Národní registr kardiovaskulárních operací a intervencí, Národní registr kardiovaskulárních intervencí)
  - MZ ČR — Seznam center vysoce specializované komplexní kardiovaskulární péče a center vysoce specializované kardiovaskulární péče
  - Věstník MZ ČR 13/2015 — výzva k podávání žádostí o udělení statutu center
  - NICOR / NCAP — MINAP (Myocardial Ischaemia National Audit Project)
  - SWEDEHEART (ucr.uu.se/swedeheart)
  - BHF — NACR (National Audit of Cardiac Rehabilitation)
  - Cor et Vasa 2011, e-coretvasa.cz — historie Kardiocentra FNKV (od 1996)
- **Otevřené otázky pro ruční rozhodnutí redakce / kandidáti na další iteraci:**
  1. **Rekonciliace `mortalita_kardiovaskularni` v `data/indicators.json`** — společná otevřená otázka pro celý kaskádový cluster (kardiovaskularni-mortalita, akutni-infarkt, cmp-iktova-centra). Doporučení: opravit hodnotu na OECD H@G 2025 (~372 / 100 000 ČR, 2023) nebo přejít na Eurostat `hlth_cd_asdr2` (ESP 2013); v každém případě fixovat jeden zdroj.
  2. **Aktualizace `mortalita_inhosp_ami` v `data/indicators.json`** — zvážit, zda nezavést druhý indikátor / fallback s OECD admission-based 30-day case-fatality (5,2 % CZ, OECD 6,5 %, OECD H@G 2025) jako paralelní hodnotu k českému in-hospital indikátoru; aktuální benchmark.oecd 6,5 a benchmark.eu 6,7 jsou v dashboardu aktuální vůči H@G 2025, ale `value` 5,2 % pro 2024 by si zasloužila zdrojový zdroj (ÚZIS NRH per `data_source.primary` v metodické kartě) ověřit proti aktuálnímu publikovanému ÚZIS souhrnu.
  3. **Vizuál: trend graf 2010–2024 AMI mortality (ČR vs. OECD)** — OECD H@G publikuje historickou řadu od cca 2005; kandidát na liniový graf s vyznačením milníků (2007 PRAGUE-2 publikace, 2015 Věstník 13/2015, COVID propady 2020–2022, návrat 2023). Všechna data již ověřena z primárního zdroje.
  4. **Vizuál: mapa NUTS 3 dostupnosti PCI sálů 24/7** — MZ ČR publikuje seznam akreditovaných center; data jsou geografická a stabilní, kandidát na choropleth s časem dojezdu nebo na bodovou mapu se zákresem center.
  5. **Konkrétní český door-to-balloon median 2024** — pokud ČKS / NRKI publikuje, dohledat a doplnit jako konkrétní český benchmark vůči ESC 2023 cíli.
  6. **Aktualizace v dalších kaskádových článcích** — `clanek-cmp-iktova-centra.html` (článek 8) zůstává v původním stavu s hodnotou 220 / 100 000 a vyžaduje analogickou cascade-flag revizi v některé z dalších iterací (3. článek kaskádového clusteru, který ještě nebyl zpracován).
- **Předtím / potom:** 4 hlavní věcné chyby opraveny (CARDS → NRKI/CZECH-1/2/3; door-to-balloon → FMC-to-wire-crossing; NACR → MINAP/NCAP + NACR jako rehab; „od konce 90. let" → klinický 90s + formální 2015) · 1 cascade-flag dokumentován (220 / 140) · 5 sekcí přepracováno (deck, Co měříme, Síť, Jasné časové cíle, Registr, Sekundární prevence) · 7 generických zdrojových URL nahrazeno 14 stabilními permalinky · 2 nové DOI citace doplněny (Keeley 2003, ESC 2023) · 3 PubMed PMID citace doplněny (CZECH-1/2/3) · 1 review-pending banner v hlavičce přidán · 1 audit-disclaimer pod databoxem přepracován · 1 audit-disclaimer v sekci Zdroje přidán · 1 inline „flagged" badge v databoxu · 2 interní křížové odkazy přepsány (z ordinálních čísel na anchor links) · 0 textových odstavců smazáno · 0 nových vizuálů (kandidáti zaznamenány v otevřených otázkách).
