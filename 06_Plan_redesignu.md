# Plán redesignu — Zdravé Česko (HSPA Monitor)

_Konsolidace 4 nezávislých review (živá analýza dashboardu, gramatický audit, UX expert, strategická analýza)._
_Konsolidováno květen 2026 · cíl: dostat platformu z prototypu do důvěryhodného veřejného nástroje pro debatu o zdravotnictví._

## Priorita

```
P0 (kritické — důvěryhodnost ohrožena)   → 1–2 týdny
P1 (rychlé wins — jazyk + UX trh)         → 2–3 týdny
P2 (audience + důvěryhodnost zdrojů)      → 3–4 týdny
P3 (strategický redesign storytellingu)   → 1–2 měsíce
P4 (růstové funkce)                       → backlog / Q3+
```

---

## P0 · Kritické metodické rozpory

Bez vyřešení těchto bodů je dashboard napadnutelný a každý expert (novinář, kdokoli z OECD/MZČR) ho odmítne brát vážně.

### P0.1 Sjednotit metodiku CMP/AMI úmrtnosti
**Problém:** Homepage tvrdí 11,2 % a srovnává s OECD 30denní úmrtností; metodická karta uvádí, že jde o **in-hospital** mortalitu a **explicitně varuje, že není srovnatelná 1:1 s OECD 30-day**.

**Akce:**
- Zvolit **jednu** metodiku napříč webem (preferuji 30-day case-fatality přepočet OECD HCQO, je to přesně to, co OECD HSPA používá).
- Pokud nemáme český 30-day datový zdroj, upravit text: *„30-day případová úmrtnost (in-hospital proxy)"* + poznámka v tooltipu.
- Aktualizovat obě story karty na úvodní stránce + metodickou kartu + indikator.html.

### P0.2 Sjednotit „výdaje na zdravotnictví"
**Problém:** *Jak funguje* hero říká **9,2 % HDP** (veřejné výdaje); indikátor `vydaje_zdravotnictvi_hdp` ukazuje **8,5 %** (celkové). Návštěvník nevidí jakou metodiku.

**Akce:**
- V *Jak funguje* hero rozlišit: *„Veřejné výdaje 7,5 % HDP · celkové 9,2 % HDP (OECD 2024)"* nebo přesné aktuální čísla.
- Indikátor přejmenovat na *„Celkové výdaje na zdravotnictví / HDP"* a doplnit benchmark veřejných výdajů jako vedlejší údaj.

### P0.3 Otevřít rozpor 58 vs 122 indikátorů
**Problém:** Oficiální český HSPA framework OECD má 122 indikátorů. Web má 58, neuvádí proč.

**Akce:**
- Do hero/manifest sekce přidat větu typu: *„Ze 122 indikátorů oficiálního OECD HSPA rámce dashboard prezentuje 58 nejdůležitějších, u kterých jsou aktuálně dostupná validní česká data. Zbývajících 64 indikátorů je metodicky definováno, ale data zatím nejsou centrálně agregována — jejich postupné doplnění je součástí plánu."*
- Stránka `/o-projektu` (viz P2.4) bude obsahovat seznam chybějících 64 indikátorů s důvodem (chybí národní data / metodika v rozpracování / čeká na ÚZIS dataset).

### P0.4 Vyčistit „seed" + slabé zdroje v datech
**Problém:** `data/indicators.json` má řadu položek `source.origin: "seed"` a placeholder URL nebo zdroje typu `nrc`, `vzp`, `sukl` bez kontextu.

**Akce:**
- Audit všech 58 indikátorů: pro každý ověřit primární zdroj (URL + datum stažení + verze datasetu).
- Pro indikátory, kde reálná data zatím nejsou, přidat **viditelný štítek** *„Ilustrativní hodnota"* nebo *„Odhad podle veřejně dostupných zdrojů"* místo hraní si na produkční data.
- V detail page přidat sekci *„Stav verifikace"* (verified / preliminary / illustrative) s posledním datem revize.

### P0.5 Opravit broken cross-link `index.html?indicator=...`
**Problém:** Detail karty linkují na `index.html?indicator=ID`, ale homepage tento parametr nezpracovává — uživatel skončí na úvodu bez zvýraznění.

**Akce:**
- Buď: změnit linky na `indicator.html?id=ID` (existuje a funguje).
- Nebo: app.js parser hash/query parametru `indicator` a scroll + highlight karty.

### P0.6 Smazat interní TODO a vývojářské poznámky z UI
**Problém:** V kartách: *„Endpoint v DataStat dohledat v M3."*, ve footeru: *„Před produkčním nasazením doporučena re-verifikace přes npm run validate:strategies"*.

**Akce:**
- Globální grep + audit všech `.md` polí v JSONech; přesunout interní poznámky do separátního pole `_dev_notes` nebo úplně pryč.
- Footer text přepsat na uživatelsky relevantní informace (datum poslední verifikace, kontakt, GitHub).

---

## P1 · Rychlé wins (jazyk + UX trh)

Plošně prolézt všechny stringy v HTML/JS/JSON. Většinu lze udělat search & replace.

### P1.1 Gramatika a stylistika

| Špatně | Správně | Zdroj |
|---|---|---|
| `naších 11,2 %` | `našich 11,2 %` | manifest 02 |
| `diskuzi o reformách` | `debatě o reformách` (preferuji) nebo `diskusi` | manifest hero |
| `OECD HSPA Rámec` | `rámec OECD HSPA` nebo `HSPA rámec` | strategie footer |
| `In-hospital úmrtnost po IM (AMI)` | `Nemocniční úmrtnost po akutním infarktu myokardu` | indikátor `mortalita_inhosp_ami` |
| `In-hospital úmrtnost po cévní mozkové příhodě` | `Nemocniční úmrtnost po cévní mozkové příhodě` | indikátor `mortalita_inhosp_cmp` |
| `15letá děvčata` | `15leté dívky` | HPV indikátor |
| `povinná pro 13leté` | `hrazená a doporučená pro 13leté` | HPV (povinná není!) |
| `prolongace do 2035` | `prodloužení do roku 2035` | strategie `zdravi-2035` |
| `v.z.p.` | `veřejné zdravotní pojištění` | explainer `pojistovny` |
| `~26 000 lékařů` | `cca 26 000 lékařů` | jak-funguje hero |
| `krajský rozpad` | `regionální srovnání` nebo `rozdělení po krajích` | manifest 04 |
| `dožít se co nejvyššího věku ve zdraví` | `prožít co nejvíce let ve zdraví` | manifest hero |
| `Češi se dožívají déle` (titulek) | `Češi se dožívají vyššího věku` (formálnější) | hero index.html |

### P1.2 Anglicismy a žargon
Buď přeložit, nebo při prvním výskytu vysvětlit závorkou:

- `Risk equalization` → `vyrovnávání rizikových profilů pojišťoven`
- `base rate` → `základní sazba úhrady`
- `volume cap` → `objemový strop`
- `default fallback` → `záložní data`
- `podversorgten` (sic!) → `nedostatečně zaopatřená`
- `guarantů` → `garantů` (i překlep)
- `Healthy Life Years` → `Léta prožitá ve zdraví (Healthy Life Years)`
- `case-fatality` → `případová úmrtnost`

### P1.3 Skeleton loaders místo „Načítám…"
Současné textové „Načítám… ⟳" psychologicky prodlužuje vnímané čekání. Implementace:
- HTML kostry (light grey blocky, šimmer animation) pro: hero stats, story karty, area tiles, indikátorová grid, regions chart.
- Při načtení se kostra plynule nahradí obsahem — žádný "skok".

### P1.4 Empty states s CTA
Současné `0 indikátorů` / `Žádný indikátor neodpovídá vašemu hledání` nahradit za:
> *„Pro tento filtr nejsou data. Zkuste **vymazat filtry** [tlačítko] nebo prohlédnout indikátory v oblasti **Výsledky** [tlačítko]."*

### P1.5 Filtry indikátorů viditelné defaultně
Současné `<details>` skrývá vyhledávání + řazení + oblast. U 58 indikátorů má hledání / oblast / řazení být viditelné nahoře jako sticky filter bar (jak je teď v dashboardu varianty Codex). Detailní filtry (signál, doména, krajský filtr) zůstávají skryté pod „Pokročilé".

### P1.6 HSPA tooltip v hlavičce + jednovětné vysvětlení
Dnes je „Co je HSPA" v collapsible až dole. Doporučuje se:
- V masthead-strip: za HSPA monitor titulek tooltip s textem *„Health System Performance Assessment — způsob měření výkonnosti zdravotního systému (WHO 2000, OECD 2023)."*
- Hned pod hero headlinem: kratší věta *„HSPA měří, jestli zdravotnictví zlepšuje zdraví, je dostupné, kvalitní a finančně udržitelné."* — link na `/o-projektu`.

### P1.7 Aktivovat audience switch
**Problém:** Data mají `tldr_public` / `tldr_expert` / `tldr_policy`, ale frontend vždy preferuje expertní text. Proto je řada karet pro laika nečitelná.

**Akce:**
- Přidat malý přepínač v hlavičce: *„Pro veřejnost / Pro odborníky / Pro politiky"* (default veřejnost).
- Persistovat volbu v localStorage.
- Při hover přepínače krátká vysvětlivka, čím se obsahy liší.

---

## P2 · Audience layering, glosář, transparentnost

### P2.1 Glosář zkratek (interaktivní)
Pro každou zkratku z následujícího seznamu vytvořit `<dfn>` element s tooltip + samostatnou stránku `/glosar`:

`HSPA · OECD · WHO · MZČR · ÚZIS · ČSÚ · SZÚ · SÚKL · NZIS · DRG · CZ-DRG · MKN-10 · SZV · ICF · HTA · VZP · ZZS · NRC · IKEM · HEPII · HCQO · HFA-DB · NUTS-3 · OOP · PCG · PROM · PREM · ECDC · DG REFORM · TSI · HLAB`

Implementace:
- Nový soubor `data/glossary.json` (key, full, short_def, link).
- JS helper `wrapAcronyms(html)` aplikovaný na rendered text.
- Hover/tap → bublina s krátkou definicí + odkaz na `/glosar#KLÍČ`.

### P2.2 Methodology cards inline u indikátorů
Současné metodické karty jsou dostupné, ale jako samostatné JSON soubory bez UI integrace. Doporučení:
- V `indicator.html` přidat sekci „**Jak se to měří?**" s 4 podotázkami:
  1. Co přesně tento indikátor měří?
  2. Proč je to důležité?
  3. Jaký je referenční (ideální) stav?
  4. Kde leží přirozené statistické meze a úskalí?
- Risk-adjustment vysvětlit explicitně u každého indikátoru, kde je relevantní (CMP, AMI, ICU bezpečnost...).

### P2.3 Stav verifikace dat (badge)
Každý indikátor + explainer + strategie dostane viditelný badge:

| Badge | Význam |
|---|---|
| 🟢 **Ověřeno** | Data z primárního zdroje, max. 12 měsíců staré, peer-reviewed |
| 🟡 **Předběžné** | Data jsou, ale metodika v revizi nebo zdroj není primární |
| 🟠 **Ilustrativní** | Hodnota pochází z odhadu/sekundárního zdroje — nepoužívat pro citace |

(Bez emoji ikon — místo nich textový badge v editorial stylu, ink/warn/red.)

### P2.4 Stránka „O projektu"
Chybí (P0 problém s důvěryhodností). Obsah:
- **Kdo za projektem stojí** (jméno autora / spolku / datová iniciativa) — bez tohoto je „občanská implementace" prázdné slovo.
- **Vztah k MZČR/OECD/ÚZIS** — explicitně: nezávislé, neoficiální, ale data agreguje z veřejných zdrojů těchto institucí.
- **Metodika výběru 58 indikátorů** ze 122 oficiálních.
- **Frekvence aktualizace** + automated pipeline.
- **Licence dat** (CC-BY 4.0).
- **Roadmap** + **kontakt**.
- **Disclaimer**: web nenahrazuje lékařské doporučení; data slouží k orientaci a podpoře veřejné debaty.

### P2.5 Filter terminologie (laik vs expert)
*Výsledky / Výstupy / Procesy / Struktury* je oficiální HSPA žargon, pro laika matoucí. Návrh:

| HSPA termín | Laický podtitul |
|---|---|
| Výsledky | Zdraví populace |
| Výstupy | Kvalita, dostupnost a finance |
| Procesy | Co systém dělá |
| Struktury | Lidé, lůžka, infrastruktura |

V UI: primární název je laický, originální HSPA termín v menším písmu pod ním. V tooltipu vysvětlení obou.

---

## P3 · Strategický redesign storytellingu

Zde je největší skok — z analytického nástroje na **nástroj veřejné debaty**. Cílem je přechod od „dashboard se 4 oblastmi" k „cestě od problému k pákám změny".

### P3.1 Nová narativní struktura úvodní stránky

Z manifestu „Proč to měříme" se stane jen jeden ze čtyř kroků:

```
1. JAK JSME NA TOM
   → zdravé roky, KVN úmrtnost, prevence, dostupnost
   → 4 ústřední fakta + okamžitý kontext OECD

2. PROČ SE TO DĚJE
   → rizikové chování, slabý screening, čekací doby, krajské rozdíly
   → odkazy na konkrétní indikátory přes „pochopit více"

3. KDO S TÍM MŮŽE POHNOUT
   → MZ ČR · pojišťovny · kraje · poskytovatelé · pacienti · občan sám
   → konkrétní odpovědnosti + nástroje (zákony, vyhlášky, smlouvy)

4. JAK POZNÁME ZLEPŠENÍ
   → konkrétní indikátory · trend · benchmark · odpovědná strategie
   → propojení s pákami a strategiemi
```

### P3.2 Tematické linie (cross-cutting stories)

Do navigace přidat 4 tematické cesty, které spojují indikátory + strategie + explainery:

- **„Žít déle ve zdraví"** — prevence, alkohol, kouření, obezita, kardiovaskulární plán
- **„Najít nemoc dřív"** — screeningy kolorekta, prsu, cervixu, HPV vakcinace
- **„Dostat péči včas"** — čekací doby, specialisté, regionální dostupnost, ZZS
- **„Platíme za objem, ne za výsledek"** — úhradová vyhláška, CZ-DRG, motivace systému

Každá linie = stránka s narrativním rámcem + 5–10 relevantních indikátorů + 2–3 strategie + 2–3 explainery.

### P3.3 Polidštění statistik (cesta pacienta)

K vybraným klíčovým indikátorům přidat **mini-příběh** (200–300 slov) v editorial stylu:

> *„Pan Novák z Karlovarského kraje a pan Jensen z Osla. Oba dostali infarkt v 62 letech. V tomto okamžiku jejich příběhy nezávisí na tom, kdo z nich má lepší životosprávu — závisí na organizaci akutní péče v jejich systému. Pan Jensen má 94% šanci to přežít s minimálním poškozením. Pan Novák 88% šanci. To je rozdíl 60 zachráněných životů na každých 1 000 infarktů..."*

Zdroj: NACCHO *Signals to Stories* metodologie. Příběh + číslo + následný odkaz na detail indikátoru.

### P3.4 České úspěchy (success stories)

Vyvážit kritiku ukázáním, kde český systém **vede**:
- **Centralizace iktových center** — patří k nejlepším v Evropě
- **Kojenecká úmrtnost** — top 5 v OECD
- **Dostupnost CT/MRI** — vysoká hustota
- **Spotřeba antibiotik** — relativně nízká vs. ostatní východní EU

Sekce „Kde Česko vede" jako vyvážení pesimistického narrativu.

### P3.5 „Co může udělat občan"

Praktická CTA sekce s personalizací podle životní fáze:
- Mladá rodina → očkování dětí, vstup k pediatrovi, prevence úrazů
- Dospělí 40+ → screening kolorekta, cervix, mamograf, krevní tlak
- Senioři 65+ → vakcinace chřipky, prevence pádů, kontroly chronických nemocí
- Občan obecně → jak změnit pojišťovnu, jak podat stížnost, jak najít specialistu

### P3.6 Vizuální schéma „pák"

Jednoduché SVG schéma „nemocnice jako střecha + sloupy páky" pro ilustraci, kde leží efekt:
- Sloup A: Prevence (vstup do systému)
- Sloup B: Akutní péče (zachycení události)
- Sloup C: Následná péče (návrat do života)
- Střecha: Délka života ve zdraví

Klikací — každý sloup vede na relevantní set indikátorů.

### P3.7 4-krokový narrative framework u dashboardu

Každá analytická sekce by měla mít tuto strukturu:

```
[KONTEXT]   Český systém má hustou síť X, Y, Z.
[VÝZVA]     Přesto v ukazateli A zaostáváme za…
[VHLED]     Detailní data ukazují, že páka leží v B.
[AKCE]      Reformní cyklus 2024 navrhuje C; sledovat lze přes indikátor D.
```

---

## P4 · Růstové funkce (backlog)

### P4.1 Otevřená data + interoperabilita
- Veřejný API endpoint: `/api/v1/indicators`, `/api/v1/regions`, `/api/v1/strategies` (plně dokumentováno OpenAPI).
- CSV exporty v lokalizaci CZ + EN.
- RSS feed pro změny v datech.

### P4.2 PROMs / PREMs roadmap
Zatím v ČR centrálně chybí. Roadmap:
1. Identifikovat existující pilotní projekty (IKEM, MOÚ).
2. Pilotní integrace s 2–3 nemocnicemi.
3. Standardizace národního datasetu (s ÚZIS).

### P4.3 Sociální determinanty zdraví
- Integrovat data o nezabezpečených potřebách (Eurostat EU-SILC `hlth_silc_08` — už máme částečně).
- Mapovat krajské rozdíly v délce života podle příjmových kvintilů.
- Zviditelnit transkulturní bariéry (komunikace, finanční dostupnost).

### P4.4 AI / NLP query interface
*„Zeptejte se přirozeným jazykem"* nad daty:
> *„Které kraje mají nejhorší dostupnost ortopedie?"* → automaticky dynamicky vygeneruje graf + odpověď.

Implementace přes Anthropic API + tool use (search, filter, summarize).

### P4.5 Gamifikace a regionální srovnání
- Krajská skóre s motivačním rámováním (*„kdyby všechny kraje dosáhly úrovně Prahy v X, zachránilo by to ročně Y životů"*).
- Ranking kraje měsíčně, lehká soutěživost mezi regiony.

### P4.6 Indikátory odolnosti (resilience)
Post-pandemická vrstva:
- Lůžková rezerva
- Personální rezerva (% personálu schopného přejít na intenzivní péči)
- Strategická zásoba kritických léků
- Zranitelnost dodavatelských řetězců

### P4.7 Accessibility audit (WCAG 2.2 AA)
- Kontrast ≥ 4.5:1 pro normální text, 3:1 pro velký
- Plně klávesnicí ovladatelné
- Aria labels u všech ikon a grafů
- Alt texty pro mapy + grafy
- Test se screen readerem (NVDA + VoiceOver)
- Mobile-first revize všech stránek

---

## Návrh konkrétních explainerů (rozšíření *Jak to funguje*)

Aktuálně 9 explainerů ve 4 kategoriích. Doporučené doplnění (~9 nových):

**Financování (3→6):**
- HTA + paragraf 16 zákona 48/1997 — nejdiskutovanější téma
- Spoluúčast pacienta — OOP rate ČR vs OECD, doplatky na léky
- Co a jak hradí pojišťovna — balíček zdravotního pojištění

**Klasifikace (1→3):**
- Klinické cesty a doporučené postupy
- ICF, MKN-O a další klasifikace

**Aktéři (3→6):**
- Pacientské organizace v české debatě
- Akademická obec a výzkum (ÚZIS, IKEM, MOÚ, HEPII…)
- Lékárny, distributoři a SÚKL

**Procesy (2→4):**
- Stížnosti a vymahatelnost práv pacienta (pyramida)
- Reformní cyklus 2014–2026

**Nová kategorie „Inspirace ze světa" (+3):**
- **Dánsko: stroke care a regionální centralizace** (5,5 % úmrtnost po CMP)
- **Estonsko: digitalizace a sdílení zdravotní dokumentace**
- **Nizozemsko: řízená konkurence pojišťoven**

---

## Doporučená sekvence implementace

### Sprint 1 (P0 — týden 1–2)
1. CMP/AMI metodický fix + úprava textů
2. Výdaje 9,2 vs 8,5 fix
3. Cross-link `index.html?indicator=` → `indicator.html?id=`
4. Smazat interní TODO + vývojářské poznámky
5. Audit zdrojů + flagging seed indikátorů

### Sprint 2 (P1 — týden 3–4)
6. Plošné jazykové opravy (search & replace)
7. Skeleton loaders
8. Empty states s CTA
9. Filtry viditelně + sticky bar
10. HSPA tooltip + jednovětný popis
11. Audience switch funkční

### Sprint 3 (P2 — týden 5–6)
12. Glosář zkratek (data + UI)
13. Methodology cards inline
14. Verifikační badge na všech kartách
15. Stránka `/o-projektu`
16. Filter terminologie laik/expert

### Sprint 4 (P3 — měsíc 2)
17. Nová homepage struktura (4-krokový narrative)
18. Tematické linie (4 stránky)
19. Polidštění statistik (5–10 mini-příběhů)
20. Sekce „Kde Česko vede"
21. Sekce „Co může udělat občan"
22. Vizuální schéma pák

### Backlog (P4 — Q3+)
23. Otevřené API + RSS
24. PROMs/PREMs roadmap
25. Sociální determinanty
26. AI query interface
27. Accessibility audit
28. Resilience indikátory
29. 9 nových explainerů + nová kategorie „Inspirace"

---

## Metriky úspěchu

Před nasazením definovat KPI a měřit v Plausible/Matomo:

| Metrika | Aktuální | Cíl po Sprint 4 |
|---|---|---|
| Bounce rate na homepage | ? | < 50 % |
| Průměrný čas na stránce | ? | > 90 s |
| Klikne na detail indikátoru | ? | > 30 % visitorů |
| Použití filtru | ? | > 15 % |
| Návštěvy O projektu (důvěra) | ? | > 20 % |
| Mobile traffic share | ? | > 40 % |

---

_Plán živě udržovat — zaškrtávat hotové, doplňovat zpětnou vazbu z dalších review._
