# Plán vysvětlovací sekce „Jak (ne)funguje české zdravotnictví"

**Adresát:** Claude Code
**Cíl:** Postavit ucelenou vysvětlovací sekci dashboardu, která laickému i odbornému uživateli rozkryje, **jak se v ČR rozhoduje o penězích, výkonech a klasifikacích** — kde se berou ceny za operace, kdo je vyjednává, jak se zapisují do číselníků, podle čeho se kódují diagnózy. Vše s důrazem na **autentické příklady absurdit**, které ilustrují systémové problémy bez politické agitace.
**Vztah k ostatním plánům:** doplňuje `PLAN_ROZCESTNIK_STRATEGII.md` (rozcestník navádí ke strategiím, tato sekce vysvětluje, **proč to vypadá tak, jak to vypadá**).
**Časový odhad:** 4 sezení po 90 min (1 rešerše + 3 implementace).

---

## 1 · Proč to chceme

Občan, který se na dashboardu dozví, že hospitalizace pro CMP stojí v Praze X Kč a v Karlovarském kraji Y Kč, se logicky ptá:

- *„Proč ten rozdíl?"*
- *„Jak vůbec ta cena vznikla?"*
- *„Kdo to vyjednává?"*
- *„Proč mé pojišťovna účtuje výkon ‚A12345' a já vůbec nevím, co to je?"*

Bez vysvětlení jsou indikátory **mrtvé**. Sekce *„Jak to funguje"* propojí vrcholové strategie (rozcestník) s každodenní mechanikou systému. Uživatel po jejím projití pochopí:

1. **Kdo jsou hráči** (pojišťovny, MZČR, dohodovací zástupci, odborné společnosti, ČLS JEP)
2. **Jak se tvoří cena** — od bodu v Seznamu zdravotních výkonů přes hodnotu bodu v dohodovacím řízení po DRG a úhradovou vyhlášku
3. **Jak se kóduje péče** — MKN-10/11 pro diagnózy, SZV pro výkony, CZ-DRG pro hospitalizace
4. **Kde to skřípe** — autentické příklady absurdit z veřejně dostupných zápisů a vyhlášek

**Ne-cíl:** politická interpretace, doporučení reformy, vlastní hodnocení „kdo má pravdu". Pouze faktické vysvětlení mechanismů a citace zdrojů.

---

## 2 · Audience matice (3 vrstvy)

| Atribut | Veřejnost | Odborník | Tvůrce politik |
|---|---|---|---|
| **Hlavní otázka** | „Proč moje operace stála 380 000 Kč a moje pojišťovna jí zaplatila jenom 220 000?" | „Jak je definovaný výkon 51789 a co znamená jeho mandatory time?" | „Kde leží neefektivity v dohodovacím řízení?" |
| **Délka výkladu** | 5–7 vět + infografika | odstavec + odkazy na primární zdroj | abstrakt + návrh systémových úprav (citované) |
| **Klíčové prvky** | metafora, příklad ze života | DRG báze, MKN-10 prefix, SZV registrační list | dohodovací řízení timeline, vyhlášky, deficit |
| **Default render** | ilustrace + tooltip | tabulka + odkaz | timeline + responsibility matrix |

---

## 3 · Sekce, které musí být pokryté

### 3.1 · Pojišťovny — kdo, co a proč

**Co tam patří:**
- 7 zdravotních pojišťoven v ČR + jejich kódy + počty pojištěnců
- Rozdíl mezi VZP (veřejnoprávní s monopolem státu) a 6 zaměstnaneckými (sdruženými v SZP)
- Co dělají: výběr pojistného → smluvní vztah s poskytovateli → úhrada péče
- Co publikují: výroční zprávy, zdravotně-pojistné plány, K-dávky (data o úhradách)
- Pravidla přechodu (1× ročně do 31. března)
- Klíčový spor VZP vs. SZP — rozdílná struktura pojištěnců (VZP má proporcionálně víc seniorů a chronicky nemocných → je přerozdělování spravedlivé?)

**Zdroje:**
- https://szpcr.cz/o-svazu/pojistovny/
- https://www.vzp.cz/ + výroční zprávy
- Zákon 48/1997 Sb.

**Audience-aware:**
- **Veřejnost:** „7 firem, které spravují tvé zdravotní pojištění. Můžeš si vybrat. Jednou ročně přejít. Co nabízejí navíc — rozhoduje, ne to, co musí."
- **Odborník:** „Smluvní politika 7 ZP, K-dávky, kompenzační fond, riziková strukturace pojistného kmene podle věku/diagnóz."
- **Politik:** „Veřejnoprávní × kvazitržní hybrid. Klíčový reform. tlak: digitalizace, přerozdělovací mechanismus, transparentnost smluv."

### 3.2 · Úhradová vyhláška + dohodovací řízení

**Co tam patří:**
- Co je úhradová vyhláška: každoroční předpis MZČR, který stanoví podmínky a výši úhrady péče z veřejného zdravotního pojištění (segmenty: praktici, ambulantní specialisté, akutní lůžka, následná, …)
- Kdo ji schvaluje: ministr zdravotnictví, vyhláška = právní předpis
- **Dohodovací řízení**: zákonný proces (zákon 48/1997 Sb., §17), kde poskytovatelé (skrze své zástupce) a zdravotní pojišťovny (skrze své zástupce) **vyjednávají** ceny pro daný rok. Probíhá zhruba leden–červenec.
- Pokud je dohoda → pojišťovny + poskytovatelé společně předloží návrh; pokud není → MZČR rozhodne **vlastní cenu** vyhláškou.
- **Výsledek 2026:** dohoda jen ve 3 z 15 segmentů (zubaři, gynekologové, lékárny). Zbytek vyhláškou. Deficit 12,2 mld. Kč.
- Zápisy z dohodovacího řízení jsou **veřejně dostupné** přes web MZČR (sekce „Dohodovací řízení") — sem patří **autentické citace** z protokolů: „Zástupci ZP odmítli návrh nárůstu o 7 % s odůvodněním X. Zástupci poskytovatelů trvali na minimu Y. Hlasování — neshoda 4:8."

**Zdroje:**
- https://mzd.gov.cz/category/agendy-ministerstva/zdravotni-pojisteni/uhradove-vyhlasky/
- https://mzd.gov.cz/uhradova-vyhlaska-2026/ (PDF)
- https://mzd.gov.cz/vysledky-dohodovaciho-rizeni-pro-rok-2026/
- Zákon 48/1997 Sb. §17 (zákonyprolidi.cz)

**Cíl rešerše „absurdita":** Najít konkrétní zápis z protokolu kde:
- Jeden segment požaduje +15 %, druhý nabízí +0 %
- Je vidět nesouměřitelnost argumentů (klinické vs. ekonomické)
- Vyhláška pak rozhodne někde mezi (ale často blíže nabídce ZP, což vyvolává následný protest poskytovatelů)

### 3.3 · CZ-DRG — proč operace stojí kolik stojí

**Co tam patří:**
- DRG = Diagnosis Related Groups, mezinárodní koncept zařazování hospitalizací do **klinicky a ekonomicky podobných skupin**
- ČR používá vlastní variantu **CZ-DRG**, vyvíjí ÚZIS v projektu **DRG Restart**
- Aktuální verze: CZ-DRG 5.0 revize 1
- Struktura: **MDC** (Major Diagnostic Category, ~25 oborů jako MDC04 = nemoci dýchací soustavy) → **DRG báze** → **DRG kategorie** (zohledňuje komplikace, věk, závažnost)
- Klasifikace bere v úvahu **MKN-10 + Seznam zdravotních výkonů** (operace, vyšetření)
- **Jak to ovlivňuje cenu:** každá DRG báze má **relativní váhu** (RW) → cena = RW × základní sazba kraje × bonus/malus za odchylky délky pobytu
- **Proč je rozdíl Praha vs. Karlovarský:** rozdílné základní sazby (vyplývají z historických nákladů nemocnic), rozdílné case-mixy

**Zdroje:**
- https://drg.uzis.cz/index.php?pg=klasifikace-hospitalizacnich-pripadu
- https://drg.uzis.cz/klasifikace-pripadu/web/klasifikacni-system/
- ÚZIS DRG Restart projekt

**Audience-aware:**
- **Veřejnost:** Metafora s leteckou společností: „základní cena letu (DRG báze) + příplatky (komplikace) + cena podle nákladů letiště (kraj). Stejná operace v jiné nemocnici stojí jinou částku, kterou pojišťovna zaplatí — ne proto, že je dražší, ale protože tam mají jiné historické náklady."
- **Odborník:** „DRG báze 04-K01 (Hlavní výkony na hrudníku) — RW 4.5, ALOS 8.2 dní, Trim point 24 dní, …"
- **Politik:** „Variabilita základních sazeb 1.7× mezi nejlevnějším a nejdražším krajem; otevřená otázka centralizace vs. lokálního rozhodování."

**Cíl rešerše „absurdita":** Najít **konkrétní DRG bázi**, kde stejný klinický stav má **různou váhu** podle drobné kódovací odlišnosti — typicky když přidání jednoho diagnostického kódu (např. „obezita E66.0") **zvýší úhradu o desítky procent** (legitimní z hlediska komplikací, ale absurdní z hlediska kódovací praxe).

### 3.4 · MKN — Mezinárodní klasifikace nemocí

**Co tam patří:**
- MKN-10 = Mezinárodní klasifikace nemocí, 10. revize, **v ČR od 1994**
- Aktuální česká verze: 1.1.2025 (vydává ÚZIS)
- Strukturalizace: **22 kapitol** (I–XXII) → 3-znakové kódy → 4-znakové → ICD-O pro onkologii
- Příklad: I21 = Akutní infarkt myokardu, I21.0 = AIM přední stěny, I21.1 = AIM dolní stěny
- **K čemu slouží:** statistika (ÚZIS NRH), úmrtní listy (LPZ), úhrada péče (DRG), výzkum, mezinárodní srovnání
- **Přechod na MKN-11:** WHO schválila 2019, platí od 2022 s 5letým přechodným obdobím. ČR pracuje na implementaci (Národní centrum pro nomenclatúru a klasifikace, ÚZIS). MKN-11 verze pro 2026 v 15 jazycích vyšla 16.2.2026.

**Zdroje:**
- https://mkn10.uzis.cz/
- https://www.uzis.cz/index.php?pg=registry-sber-dat--klasifikace--mezinarodni-klasifikace-nemoci-mkn-11
- https://www.uzis.cz/res/file/klasifikace/mkn/mkn-11-cz-implementacni-plan.pdf

**Audience-aware:**
- **Veřejnost:** Když lékař do propouštěcí zprávy napíše „I21.0", říká tím: „toto je akutní infarkt přední stěny srdce". Kód je **mezinárodně srovnatelný** — stejný kód v Berlíně, Tokiu i Praze.
- **Odborník:** Hierarchie kapitola → blok → kód → podkód; rozdíl mezi **diagnóza**, **přidružená diagnóza** a **vedlejší diagnóza**; vliv na DRG.
- **Politik:** Migrace MKN-10 → MKN-11 = několikamiliardová investice (změna všech informačních systémů, školení, mapování); WHO doporučuje, ČR plánuje.

**Cíl rešerše „absurdita":** Najít **konkrétní kód MKN-10, který nemá smysl v praxi** — typicky:
- T75.4 — „Účinky proudu o frekvenci nad 60 000 Hz" (= mikrovlnná trouba?)
- W56 — „Kontakt s mořskými živočichy" (v ČR?)
- Y92.241 — „Bowlingový salón jako místo úrazu"

Takové kódy jsou WHO standardem, ale jejich český překlad odhaluje, jak je MKN obrovským, někdy příliš detailním systémem.

### 3.5 · Seznam zdravotních výkonů (SZV) + Pracovní skupina

**Co tam patří:**
- **SZV** = Seznam zdravotních výkonů s bodovými hodnotami, vyhláška 134/1998 Sb.
- Každý výkon má **kódové číslo** (5-místné), **název**, **mandatorní čas**, **bodovou hodnotu**, **kategorii**, **omezení**
- Příklad: 51789 — Cévní mozková příhoda — komplexní vyšetření — 2 256 bodů
- **Pracovní skupina k SZV** je poradní orgán ministra zdravotnictví: 12 stálých členů + zástupci odborných společností. Schází se cca 1× měsíčně. **Zápisy jsou veřejné** na web MZČR.
- Návrhy na nové výkony / změny / vyřazení podávají: MZČR, ZP, odborné společnosti, ČLS JEP
- Po projednání ve PS → ministr → vyhláška → účinnost zpravidla od 1.1. následujícího roku

**Zdroje:**
- https://szv.mzcr.cz/ — databáze výkonů
- https://mzd.gov.cz/zapisy-z-jednani-pracovni-skupiny-k-seznamu-zdravotnich-vykonu/
- https://ppo.mzcr.cz/workGroup/4 — Pracovní skupina k SZV
- https://www.zakonyprolidi.cz/cs/1998-134 — vyhláška 134/1998
- https://novysazebnik.cz/ — alternativní výklad

**Audience-aware:**
- **Veřejnost:** „Pro každou věc, kterou ti lékař udělá (vyšetření, operaci, návštěvu), existuje 5-místný kód. Kódy mají bodovou hodnotu. Hodnota bodu se pak násobí cenou koruny za bod, kterou každý rok určí dohodovací řízení nebo ministerská vyhláška."
- **Odborník:** „Registrační list výkonu obsahuje mandatorní čas (T0–T2), režii (přístroje, materiál, prostor), nositele (lékař/sestra/laborant), kategorii (Z/W/P/X/Y) a kontextové vazby s jinými výkony."
- **Politik:** „SZV je dynamický dokument — ročně přibývá ~50 návrhů, schvaluje se ~15. Klíčový reformní bod: rychlost zařazování nových technologií (TAVI, robotické chirurgie, biologická léčba)."

**Cíl rešerše „absurdita":** V zápisech Pracovní skupiny k SZV najít:
- Výkon, jehož bodová hodnota se nezměnila od 1998 navzdory radikálnímu posunu nákladů (např. základní vyšetření praktikem)
- Výkony s **bizarrním názvem nebo definicí** (např. „Konzilium na dálku — telefonicky max. 10 min.", body = méně než cena hovoru)
- Disproporci: drahá zkouška mající nízkou hodnotu vs. levná diagnostická úkona s vysokou hodnotou kvůli historicky sjednanému vlivu lobby
- Workflow rule: tentýž výkon jednou pokrytý, podruhé ne, v závislosti na MKN diagnóze (zbytečná byrokracie)

---

## 4 · Architektura UI

```
┌──────────────────────────────────────────────────────┐
│  JAK FUNGUJE ČESKÉ ZDRAVOTNICTVÍ                     │
│                                                      │
│  [Audience switch:  Veřejnost  Odborník  Politik]    │
└──────────────────────────────────────────────────────┘

┌─ Veřejnost ────────────────────────────────────────┐
│  💰 Kdo platí mou péči?                            │
│      → Pojišťovny (kartička)                       │
│                                                     │
│  📊 Jak vznikne cena za operaci?                   │
│      → DRG (kartička)                              │
│                                                     │
│  📋 Co znamenají kódy v propouštěcí zprávě?        │
│      → MKN + SZV (kartička)                        │
│                                                     │
│  ⚖️ Kdo rozhoduje o cenách?                         │
│      → Úhradová vyhláška (kartička)                │
└─────────────────────────────────────────────────────┘

┌─ Odborník ─────────────────────────────────────────┐
│  Detailnější výklad s odkazy na primární zdroje:   │
│  • DRG báze + RW                                   │
│  • SZV registrační listy                           │
│  • Zápisy PS k SZV                                 │
│  • Úhradové vyhlášky archiv                        │
└─────────────────────────────────────────────────────┘

┌─ Politik ──────────────────────────────────────────┐
│  Systémový pohled:                                  │
│  • Timeline dohodovacího řízení (Gantt)            │
│  • Responsibility matrix                            │
│  • Identified gaps & reform proposals              │
└─────────────────────────────────────────────────────┘
```

### 4.1 · Detailní stránka jedné sekce (např. /jak-funguje/uhradova-vyhlaska)

```
┌──────────────────────────────────────────────────────┐
│  ← zpět  ÚHRADOVÁ VYHLÁŠKA                           │
│                                                      │
│  [Veřejnost / Odborník / Politik]                    │
│                                                      │
│  TL;DR  (přepíná podle audience)                     │
│  Co to je, kdo to dělá, jak často.                   │
│                                                      │
│  ─── Anatomie procesu ───                            │
│  [INFOGRAFIKA: Leden – Červen — dohodovací řízení;   │
│   Červenec — návrh; Srpen-Říjen — připomínkové ř.;   │
│   Listopad — vyhlášení; Leden+1 — účinnost]          │
│                                                      │
│  ─── Konkrétně 2026 ───                              │
│  • Dohoda v 3/15 segmentech                          │
│  • Deficit 12,2 mld. Kč                              │
│  • Vyhláška 432/2025 Sb.                             │
│  • Poslední úprava: 30.10.2025                       │
│                                                      │
│  ─── 💬 Z protokolů (s autentickými citacemi) ───   │
│  „Zástupci ZP navrhli 0 %, poskytovatelé 12 %.      │
│   Po 5 hodinách jednání — bez dohody."               │
│   (zápis 14.5.2025, str. 8)                          │
│                                                      │
│  Související indikátory: vydaje_zdravotnictvi_hdp,   │
│   platba_z_kapsy_pct                                 │
│                                                      │
│  Další dokumenty:                                    │
│  📄 Vyhláška 432/2025 Sb. (Sbírka zákonů)            │
│  📄 Výsledky DŘ 2026 (MZČR)                          │
│  📄 Zákon 48/1997 Sb. §17                            │
└──────────────────────────────────────────────────────┘
```

---

## 5 · Datový model

`data/explainers.json` (analogicky k `strategies.json`):

```json
{
  "version": "1.0",
  "generated_at": "2026-...",
  "explainers": [
    {
      "id": "uhradova_vyhlaska",
      "title": "Úhradová vyhláška",
      "category": "money",
      "tldr_public": "Každoroční seznam pravidel, kolik pojišťovny zaplatí lékařům za jednotlivé úkony.",
      "tldr_expert": "Vyhláška MZČR podle §17 zákona 48/1997 Sb...",
      "tldr_policy": "Klíčový dokument...",
      "process": {
        "type": "timeline",
        "steps": [
          { "phase": "Dohodovací řízení", "from": "2025-01-30", "to": "2025-06-19" },
          { "phase": "Návrh vyhlášky", "from": "2025-07-01", "to": "2025-07-31" },
          { "phase": "Připomínkové řízení", "from": "2025-08-01", "to": "2025-10-15" },
          { "phase": "Vyhlášení", "from": "2025-10-30", "to": "2025-10-30" },
          { "phase": "Účinnost", "from": "2026-01-01", "to": "2026-12-31" }
        ]
      },
      "absurdity_examples": [
        {
          "title": "12 z 15 segmentů bez dohody",
          "source": "MZČR — Výsledky DŘ 2026",
          "url": "https://mzd.gov.cz/vysledky-dohodovaciho-rizeni-pro-rok-2026/",
          "quote": "Dohoda dosažena pouze ve 3 z 15 segmentů: zubaři, gynekologové, lékárny. Zbytek určen vyhláškou.",
          "context": "I když je dohodovací řízení ze zákona priorita, v praxi systém končí v ¾ případů ministerským rozhodnutím."
        }
      ],
      "linked_indicators": ["vydaje_zdravotnictvi_hdp", "platba_z_kapsy_pct"],
      "documents": [
        { "title": "Vyhláška 432/2025 Sb.", "url": "https://mzd.gov.cz/wp-content/uploads/2025/11/Uhradova_vyhlaska_2026.pdf" },
        { "title": "Zákon 48/1997 Sb.", "url": "https://www.zakonyprolidi.cz/cs/1997-48" }
      ]
    }
  ]
}
```

**Klíčové novinky vs. `strategies.json`:**
- Pole `process.steps` pro timeline vizualizaci
- Pole `absurdity_examples` pro autentické citace s kontextem
- Pole `category: money | classification | actors | process`

---

## 6 · Implementační milníky

### M-EXPL-1 · Rešerše a sběr autentických citací (90 min)

**Definice "hotovo":** existuje `04_Plan_napojeni_na_API/EXPLAINERS_SOURCE_CITATIONS.md` se sbírkou:
- ≥ 3 citace ze zápisů z dohodovacího řízení 2026 nebo Pracovní skupiny k SZV
- ≥ 5 příkladů „absurdních" MKN-10 kódů (odkazy na oficiální překlad)
- ≥ 2 příklady disproporce v SZV (bodová hodnota vs. realita)
- ≥ 1 konkrétní DRG báze s vysvětlením, jak komplikace mění váhu

**Postup:**
1. WebFetch zápisů Pracovní skupiny k SZV (mzd.gov.cz/zapisy-z-jednani-pracovni-skupiny-k-seznamu-zdravotnich-vykonu/)
2. Stažení posledních 3 protokolů z dohodovacího řízení (mzd.gov.cz/dohodovaci-rizeni)
3. Procházení MKN-10 abecedního seznamu (alespoň kapitoly XIX–XX, kde jsou „divné" externí příčiny)
4. Inspekce 5 namátkových výkonů na szv.mzcr.cz pro disproporce
5. CZ-DRG: vyber 1 bázi s rozdílem mezi „základní" a „komplikovanou" verzí

**Výstup:** primární cit. text v `EXPLAINERS_SOURCE_CITATIONS.md`. Žádné parafráze — pouze přímé citace s odkazem na zdroj.

### M-EXPL-2 · Datový model + obsah (90 min)

**Definice "hotovo":**
- `data/explainers.json` se 5 položkami (pojišťovny, úhradová vyhláška, DRG, MKN, SZV)
- Schema validátor `ingest/validate-explainers.js`
- Cross-link s `data/indicators.json` (analogicky k `linked_strategies`)

### M-EXPL-3 · Frontend stránka „Jak to funguje" (90 min)

**Definice "hotovo":** dostupná stránka `jak-funguje.html` se:
- Hlavní rozcestí (5 kartiček podle category)
- Detail explainer s audience-switchem, timeline (pokud má `process.steps`), absurdity examples blokem
- Klikatelné cross-links na indikátory a strategie

**Komponenty:**
1. `05_M1_Starter/jak-funguje.html` (separátní stránka, sdílí styles)
2. `05_M1_Starter/src/explainers.js` — load + render
3. `05_M1_Starter/src/explainer-detail.js` — detail s audience switchem
4. CSS pro „absurdity" blok (citace s vyznačeným odkazem)

### M-EXPL-4 · (volitelně) Pokročilé vizualizace (60 min)

- Dohodovací řízení timeline (Gantt-style HTML+CSS, žádné D3)
- Síťový graf: Pojišťovny ↔ Poskytovatelé ↔ MZČR ↔ DR-zástupci
- DRG kalkulátor — interaktivní: vyber MKN-10 + procedure → ukáže DRG bázi a RW

---

## 7 · Tone-of-voice — KRITICKÉ pravidlo

Sekce „absurdity" musí dodržet:

✅ **Faktické citace s primárním zdrojem.** „V zápisu z 14.5.2025, strana 8 stojí: …"
✅ **Identifikace systémové příčiny.** „Toto se stalo proto, že zákon 48/1997 Sb. §17 odst. 4 dává ministrovi pravomoc rozhodnout, pokud strany nedospějí k dohodě."
✅ **Odkaz na další úroveň poznání.** „Pokud chceš víc, podívej se na Strategii VZP 2030 sekce X."

❌ **Žádný vlastní názor** typu „toto je nehorázné". Faktum mluví samo.
❌ **Žádné personální útoky** — jména konkrétních úředníků/lobbistů ne, role ano („zástupce SZP", „garant odbornosti").
❌ **Žádné fyzické politické komentáře** typu „za této vlády".

Princip: *„Měřit, ne soudit. Soudit nechat čtenáře."*

---

## 8 · Rizika

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|---|---|---|---|
| Zápisy z PS k SZV se zveřejňují s odstupem (3–6 měsíců) | jistota | nízký | použít poslední 1–2 roky, neaktualizovat denně |
| Citace mohou být vytržené z kontextu | střední | vysoký | každá citace musí mít `context` pole + odkaz na úplný zápis |
| Přechod MKN-10 → MKN-11 v průběhu projektu | střední | nízký | sekce o přechodu doplnit, ne přepsat |
| Politizace obsahu | nízká | vysoký | zachovat tone-of-voice (sekce 7), peer review před publikací |
| URL na vyhlášky se mění při novelizaci | střední | nízký | použít `mzd.gov.cz/uhradova-vyhlaska-{rok}/` jako stabilní pattern; zákonyprolidi.cz pro archiv |

---

## 9 · Hand-off pořadí

1. **M-EXPL-1** — Rešerše. Vyžaduje WebFetch + ručně procházet PDF zápisy. Bez živé sítě nelze.
2. **M-EXPL-2** — Datový model. Návazné, sběr nepokrytých explainers ze sekce 3.
3. **M-EXPL-3** — Frontend. Nezávislé na obsahu (kostra se stub daty), live data dotáhne M-EXPL-2.
4. **M-EXPL-4** — Volitelné vizualizace.

Mezi milníky commit + push → review.

---

## 10 · Návaznost na zbytek dashboardu

- **Po M-EXPL-2:** karty indikátorů (např. `vydaje_zdravotnictvi_hdp`) získávají sekci „Souvisí s vysvětlením" → Úhradová vyhláška
- **Po M-EXPL-3:** v hlavičce dashboardu nový tab „Jak to funguje" vedle „Indikátory" a „Strategie"
- **Cross-link s rozcestníkem strategií:** explainery odkazují na strategie a opačně (např. „Úhradová vyhláška" → „Strategie VZP 2030")

---

*Verze 1.0 · květen 2026 · Připraveno pro implementaci v Claude Code po M-STR-1.*
