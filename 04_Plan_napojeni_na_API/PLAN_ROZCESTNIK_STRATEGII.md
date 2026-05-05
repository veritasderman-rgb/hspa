# Plán Rozcestníku strategií zdravotnictví ČR

**Adresát:** Claude Code
**Cíl:** Postavit přehledný a kvalitní rozcestník (waypoint) strategických dokumentů, programů a institucí, které řeší zdravotnictví v ČR — od národních (Zdraví 2030, MZČR, NSC) přes EU (EU4Health, EHDS) po globální (WHO, OECD). Tři audience vrstvy: veřejnost, odborník, tvůrce politik.
**Předpoklad:** existující dashboard 05_M1_Starter, frontend s audience-switch, regionální sekcí a metodickými kartami.
**Časový odhad:** 4 sezení — 2 rešerše + 2 implementace.

---

## 1 · Proč to chceme

Pro uživatele dashboardu Zdravé Česko je hodnota indikátoru jen půl příběhu. Druhá půlka je: **"kdo to řeší a podle jakého plánu?"** Kde se vzala čísla pro screening, kdo je za to odpovědný, jak souvisí s českými strategiemi a EU programy, kdy se mají dosáhnout cíle.

Bez tohoto kontextu jsou čísla mrtvá. Rozcestník propojí indikátor → strategii → instituci → harmonogram → originální zdroj.

**Ne-cíl:** psát vlastní obsah strategií. Cíl je **agregovat odkazy a metadata** s krátkými shrnutími, ne suplovat ÚZIS/MZČR.

---

## 2 · Audience matice (3 vrstvy detailu)

| Atribut | Veřejnost | Odborník | Tvůrce politik |
|---|---|---|---|
| **Hlavní otázka** | „Co se s naším zdravím plánuje?" | „Kde najdu konkrétní dokument / monitoring?" | „Kdo je odpovědný, jaké jsou závislosti?" |
| **Délka shrnutí** | 2–3 věty | 1 odstavec + KPI | abstrakt + institucionální mapa |
| **Klíčové prvky** | piktogram, jasný cíl, deadline | odkaz na originál, garant, status | revize, financování, EU vazby |
| **Filtry** | téma (mentální, prevence, …) | dokument, instituce, status | životní cyklus (návrh / platná / revize) |
| **Default render** | kartičky s barvou témata | tabulka s odkazem | timeline + responsibility matrix |

---

## 3 · Rešeršní inventář (M-STR-1)

Tahle sekce **slouží jako vodítko** pro M-STR-1; finální seznam vznikne po web rešerši a ověření, zda každý zdroj žije.

### 3.1 · Národní strategie ČR (úroveň 1 — primární)

| Název | Garant | Status (k 2026) | Časový horizont |
|---|---|---|---|
| **Zdraví 2030** — Strategický rámec pro ochranu a podporu veřejného zdraví ČR | MZČR | platná | 2020–2030 |
| **Strategický rámec rozvoje péče o zdraví v ČR do 2035** | MZČR | platná (12/2025) | 2025–2035 |
| **Národní strategie eZdraví 2025–2035** | MZČR + NCEZ | platná | 2025–2035 |
| **Implementační plány Zdraví 2030** (specifické cíle, akční plány) | MZČR + odborné společnosti | platné | průběžné |
| **OECD HSPA Rámec pro ČR (2023)** | OECD + MZČR | implementace | – |

### 3.2 · Specifické národní strategie a programy (úroveň 2)

- Národní onkologický program (MZČR + ČOS)
- Strategie reformy duševního zdraví 2017+ (Národní akční plán pro duševní zdraví)
- Národní akční plán pro Alzheimerovu nemoc a obdobná onemocnění (NAPAD)
- Národní akční plán proti antimikrobiální rezistenci (NAP-AMR)
- Akční plán k omezení škod působených alkoholem (Národní strategie protidrogové politiky)
- Strategie reformy primární péče
- Akční plán rozvoje paliativní péče
- Národní strategie prevence násilí na dětech
- Akční plán pro fyzickou aktivitu (Strategie pohybové aktivnosti)
- Národní akční plán pro vzácná onemocnění
- Strategie lůžkové péče
- Národní imunizační program
- Národní strategie elektronizace zdravotnictví (eRecept, eŽádanka, NCeZ)

### 3.3 · Instituce a jejich strategické dokumenty (úroveň 2)

| Instituce | Web | Co publikuje | Pro nás |
|---|---|---|---|
| **MZČR** | mzd.gov.cz | strategické rámce, akční plány, vyhlášky | hlavní zdroj |
| **ÚZIS** | uzis.cz | NZIS strategie, registry, otevřená data | data + metodiky |
| **NSC ÚZIS** | nsc.uzis.cz/cs/o-nsc/strategie/ | screening — strategie + monitoring | konkrétní indikátory |
| **SZÚ** | szu.gov.cz | epidemiologie, prevence, AMR | environmentální + chování |
| **NRC** | nrc.cz | indikátory kvality péče | hospitalizační outcome |
| **NCEZ / NÚKIB** | ncez.cz | eHealth interoperabilita, kybernetická bezp. | datové standardy |
| **NIVZD** | nivzd.cz | strategie reformy duševního zdraví | pro modul mentální zdraví |
| **VZP / SZP** | vzp.cz, szpcr.cz | data o úhradách, výkazy pojišťoven | financování |
| **ČLK / ČLnK / ČAS** | lkcr.cz, lekarnici.cz, cnna.cz | profesní strategie | pracovní síla |
| **ČLS JEP** | cls.cz | doporučené postupy odborných společností | klinické metodiky |

### 3.4 · EU úroveň (úroveň 3)

- **EU4Health 2021–2027** (Evropská komise — financování)
- **Europe's Beating Cancer Plan** (EU — onkologie)
- **European Health Data Space (EHDS)** (regulace 2025+)
- **EU Pharmaceutical Strategy**
- **EU Mental Health Strategy** (2023)
- **ECDC priority areas** (infekční nemoci, surveillance)
- **EMA strategie** (léčiva)
- **EU Cancer Mission** (Horizon Europe)
- **OECD Health at a Glance: Europe** (kombinovaná publikace OECD/EU)
- **WHO Europe — European Programme of Work 2020–2025**

### 3.5 · Globální úroveň (úroveň 3)

- **WHO Global Strategy on Digital Health 2020–2025**
- **WHO Global Action Plan on Antimicrobial Resistance**
- **WHO Global Action Plan for the Prevention and Control of NCDs 2013–2030**
- **WHO Global Strategy on Human Resources for Health: Workforce 2030**
- **WHO Mental Health Action Plan 2013–2030**
- **OECD Health Statistics + Health at a Glance** (každoročně)
- **OECD Recommendation on Patient Safety**
- **Lancet Commissions** (Climate Change & Health, Universal Health Coverage)
- **UN SDG 3** — Good Health and Well-being (cíle 2030)
- **G7 / G20 health declarations**

### 3.6 · Datové a metodické standardy (úroveň 3 — pomocné)

- ICD-10 / ICD-11 (WHO)
- SNOMED CT
- LOINC
- HL7 FHIR (interoperabilita)
- CZ-DRG (česká úhradová klasifikace hospitalizací)
- ATC / DDD (WHO ATC)
- ICHI (International Classification of Health Interventions)

### 3.7 · Specifické zdroje, které user explicitně zmínil

- **`https://nsc.uzis.cz/cs/o-nsc/strategie/`** — Národní screeningové centrum, sekce strategie. Obsahuje:
  - Strategie boje proti rakovině v ČR
  - Strategie populační prevence — kardiovaskulární a metabolická onemocnění
  - Strategie populační prevence — onkologická onemocnění (kolorektální, prsu, cervikální, plic)
  - Strategie pro screening a prevenci u rizikových skupin

  → Pro každou strategii NSC: status, garant, harmonogram, propojení s našimi indikátory `screening_*` a `vakcinace_*`.

---

## 4 · Datový model

Každá strategie je objekt v `data/strategies.json` (analogicky k `data/indicators.json`):

```json
{
  "version": "1.0",
  "generated_at": "2026-05-...",
  "strategies": [
    {
      "id": "zdravi_2030",
      "title": "Zdraví 2030",
      "subtitle": "Strategický rámec pro ochranu a podporu veřejného zdraví ČR",
      "level": "national",            // national | sector | institution | eu | global | standard
      "scope": "framework",            // framework | program | action_plan | strategy | guideline
      "status": "active",              // active | proposed | obsolete | revision_due
      "owner": "MZČR",
      "co_owners": ["ÚZIS", "Vláda ČR"],
      "horizon": { "from": 2020, "to": 2030 },
      "topics": ["public_health", "prevention", "ncd"],
      "tldr_public": "Plán, jak má být Česko v roce 2030 zdravější — důraz na prevenci, mentální zdraví a snížení rozdílů mezi kraji.",
      "tldr_expert": "Národní strategický rámec se 4 strategickými cíli (zdraví všech věkových skupin), 9 specifickými cíli, monitorovaný přes sadu indikátorů harmonizovaných s OECD HSPA.",
      "tldr_policy": "Schváleno usnesením vlády č. 200/2020. Implementace přes 9 specifických akčních plánů 2021–2024 a 2025–2030. Revize plánovaná 2027.",
      "key_goals": [
        { "label": "Zdravější životní styl", "indicator_ids": ["kuractvi_denni", "vakcinace_chripka_65"] },
        { "label": "Snížení regionálních rozdílů", "indicator_ids": ["nadeje_doziti_total"] }
      ],
      "linked_indicators": ["nadeje_doziti_total", "kuractvi_denni", "spotreba_antibiotik"],
      "related_strategies": ["strategicky_ramec_2035", "ehealth_2025_2035"],
      "documents": [
        { "title": "Strategický rámec Zdraví 2030 (PDF)", "url": "https://mzd.gov.cz/.../zdravi-2030.pdf", "lang": "cs" },
        { "title": "Implementační plán 2021–2024", "url": "...", "lang": "cs" }
      ],
      "external_refs": {
        "eu": ["eu4health_2021_2027"],
        "global": ["who_european_programme_2020_2025", "un_sdg_3"]
      },
      "monitoring": {
        "frequency": "yearly",
        "report_url": "https://mzd.gov.cz/zprava-o-zdravi-cr",
        "next_review": "2027-12-31"
      },
      "tags": ["MZČR", "OECD HSPA", "Vláda ČR", "Zdraví 2030"]
    }
  ]
}
```

**Klíčové novinky vs. `indicators.json`:**

- `tldr_public` / `tldr_expert` / `tldr_policy` — tři varianty shrnutí (audience-aware)
- `linked_indicators` — propojení do našeho dashboardu (z karty se kliká na strategii a opačně)
- `external_refs` — graf vazeb na EU/globální dokumenty
- `monitoring` — kdy vychází zpráva, kdy příští revize

**Rozšíření existující karty indikátoru (`indicators/<id>.json`):**

```json
{
  "id": "kuractvi_denni",
  "...": "...",
  "linked_strategies": ["zdravi_2030", "narodni_protialkoholni_program"]
}
```

Tím se uzavře cyklus: indikátor zná své strategie a strategie zná své indikátory.

---

## 5 · UI / IA návrh rozcestníku

### 5.1 · Vstupní stránka `/strategie`

```
┌──────────────────────────────────────────────────────┐
│  STRATEGIE ZDRAVOTNICTVÍ ČR                          │
│                                                      │
│  [Audience switch:  Veřejnost  Odborník  Politik ]   │
│  [Hledat...]   [Téma ▾]  [Úroveň ▾]  [Status ▾]      │
└──────────────────────────────────────────────────────┘

┌─ Veřejnost ────────────────────────────────────────┐
│  ⭐ Hlavní strategie ČR (3 karty velké)             │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│     │ Zdraví  │ │  Stra-  │ │ eHealth │             │
│     │  2030   │ │ tegie   │ │ 2025–35 │             │
│     │         │ │  2035   │ │         │             │
│     └─────────┘ └─────────┘ └─────────┘             │
│                                                     │
│  📋 Tematicky                                       │
│     [Prevence] [Mentální] [Onkologie] [Senioři]     │
│     [Equity] [Ambulantní] [Lůžková] [eHealth]       │
│                                                     │
│  🌍 Mezinárodní kontext                             │
│     EU · WHO · OECD                                 │
└─────────────────────────────────────────────────────┘
```

### 5.2 · Detail strategie `/strategie/<id>`

```
┌──────────────────────────────────────────────────────┐
│  ← zpět  ZDRAVÍ 2030                                 │
│  Strategický rámec ochrany a podpory veřejného zdraví│
│                                                      │
│  [Veřejnost / Odborník / Politik]                    │
│                                                      │
│  Status: ✓ Platná    Garant: MZČR    2020–2030      │
│                                                      │
│  TL;DR  (přepíná se podle audience)                  │
│  ─────────────────────────────────                   │
│  Plán, jak má být Česko v roce 2030 zdravější…       │
│                                                      │
│  Klíčové cíle                                        │
│  • Zdravější životní styl  → 2 indikátory            │
│  • Snížení regionálních rozdílů  → 1 indikátor       │
│                                                      │
│  Sledované indikátory (klikatelné)                   │
│  [Denní kuřáctví] [Vakcinace 65+] [Naděje dožití]    │
│                                                      │
│  Související strategie                               │
│  → Strategický rámec 2035                            │
│  → Národní strategie eZdraví 2025–2035               │
│  → EU4Health 2021–2027                               │
│                                                      │
│  Dokumenty                                           │
│  📄 Strategický rámec (PDF)    Vláda ČR · 2020       │
│  📄 Akční plán 2021–2024 (PDF) MZČR · 2021           │
│                                                      │
│  Monitoring                                          │
│  Zprávy o stavu vychází ročně. Další revize: 12/2027 │
└──────────────────────────────────────────────────────┘
```

### 5.3 · Navigace v dashboardu

V hlavičce stávajícího dashboardu **přibude tlačítko / odkaz „Strategie"** vedle tlačítka „Načíst znovu". V kartě indikátoru (modal) přibude sekce **„Souvisí se strategiemi"** se 2–3 kličkami.

### 5.4 · Speciální vizualizace pro „Politika"

- **Timeline** všech aktivních strategií ČR (Gantt-like) — kdy začaly, kdy končí, kdy je revize
- **Síťový graf** — co s čím souvisí (Zdraví 2030 → Strategický rámec 2035 → eZdraví → EU4Health → WHO Europe Work Programme)
- **Responsibility matrix** — tabulka instituce × strategie × role (vlastník / spoluvlastník / monitor)

---

## 6 · Implementační milníky

### M-STR-1 · Web rešerše a ověření zdrojů (90 min)

**Definice "hotovo":** existuje `04_Plan_napojeni_na_API/STRATEGIES_INVENTORY.md` se seznamem všech strategií (cca 40–60 položek), každá má aktuální URL na primární dokument, status (živý/archivní), datum ověření.

**Postup:**

1. **Národní strategie:** zwebfetch každý URL z 3.1 + 3.2, ověřit přístupnost, získat datum publikace, autora.
2. **Instituce:** pro každou ze 3.3 najít sekci „strategie / koncepce / dokumenty", vypsat klíčové dokumenty.
3. **NSC ÚZIS:** detailně prokrousat `https://nsc.uzis.cz/cs/o-nsc/strategie/`.
4. **EU/WHO/OECD:** 3.4–3.5, ověřit přístupnost.
5. **Klasifikace:** přiřadit `level`, `scope`, `topics`, `linked_indicators`.

Výstup: čistý markdown inventář, ze kterého se v M-STR-2 generuje JSON.

### M-STR-2 · Datový model + sběr metadat (90 min)

**Definice "hotovo":**
- `data/strategies.json` s minimálně 30 položkami napříč 3 úrovněmi (národní + EU/WHO + instituce)
- `indicators/<id>.json` rozšířeny o `linked_strategies` pole tam, kde je to relevantní
- `ingest/validate.js` rozšířen o validaci `strategies.json` schematu

**Komponenty:**
1. JSON schema pro strategii (ve `04_Plan.../STRATEGIES_SCHEMA.md`)
2. `ingest/validate-strategies.js` — kontrola: každý `linked_indicators` musí existovat v `indicators/`
3. Cross-link audit: pokud strategie linkuje indikátor, indikátor by měl linkovat zpět

### M-STR-3 · Frontend stránka rozcestníku (120 min)

**Definice "hotovo":** dostupná stránka `strategie.html` (nebo route `/strategie` ve stávajícím dashboardu) splňující IA návrh ze sekce 5.

**Komponenty:**
1. `05_M1_Starter/strategie.html` (separátní stránka, sdílí styles + base layout)
2. `05_M1_Starter/src/strategies.js` — load + filter + render
3. `05_M1_Starter/src/strategy-detail.js` — detail view s audience switchem
4. CSS rozšíření v `styles.css`
5. Klikatelná propojení: karta indikátoru → strategie a opačně
6. Vyhledávání + filtry (téma, úroveň, status)

**Audience-aware rendering:** stejný JS přepíná `tldr_public` / `tldr_expert` / `tldr_policy` podle `data-audience` na `<body>`.

### M-STR-4 · Pokročilé vizualizace pro Politiku (60 min, volitelně)

**Definice "hotovo":** v audience „Politik" existuje navíc:
- **Timeline view** strategií (HTML + CSS, žádný D3 dep)
- **Responsibility matrix** (HTML tabulka)

**Riziko:** scope creep. Lze odložit do M-STR-5.

---

## 7 · Co NEdělat

1. **Nepiš obsah strategií** — agregujeme odkazy a TL;DR (max 3–5 vět). Nesmí to být fork strategie.
2. **Necituj politicky kontroverzní hodnocení** — TL;DR má být faktický, ne interpretace „splněno / nesplněno". Pokud je třeba uvést status („nedostatečné financování"), citovat oficiální monitoring.
3. **Necachuj PDF dokumenty v repu** — odkazy stačí. PDF je velký a rychle se mění.
4. **Nevymýšlej `linked_indicators`** — propojení musí být reálné, podložené tím, že strategie sama indikátor zmiňuje.
5. **Nezahrnuj zaniklé / neaktuální strategie** v hlavním seznamu — pokud chceš historický kontext, separátní sekce „Archiv".
6. **Nepřevkrývej dashboardu indikátorů** — strategie je doplněk, ne hlavní view. Přístup je vždy z menu / odkazu.

---

## 8 · Acceptance test (po M-STR-3)

```
1. data/strategies.json validní podle schema, ≥ 30 položek.
2. node ingest/validate-strategies.js → OK.
3. npm test → všechny testy passes (předchozí 85 + 5–10 nových pro strategie).
4. V prohlížeči (npm run serve):
   - Z dashboardu klik na „Strategie" otevře rozcestník.
   - Audience switch mění TL;DR i layout (kartičky vs. tabulka vs. timeline).
   - Filtr „Téma: Onkologie" vrátí ≥ 3 strategie.
   - Detail strategie otevře `tldr_*` podle aktuální audience.
   - Klik na linked_indicators v detailu strategie otevře modal indikátoru z dashboardu.
   - Klik na metodickou kartu indikátoru ukáže sekci „Souvisí se strategiemi".
5. Lighthouse: žádný regress.
```

---

## 9 · Riziková analýza

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|---|---|---|---|
| Strategie zaniká / mění URL během rešerše | jistota | nízký | re-validace přes `npm run validate-strategies` v cronu |
| Audience-rozdělení TL;DR je subjektivní | střední | nízký | review s 1 odbornou osobou před deploy |
| PDF dokumenty za paywallem (OECD některé) | nízká | nízký | uvést v kartě, ale odkaz se nemění |
| Counter-aktualizace stavu (revize) | jistota | střední | pole `last_verified` + `next_review` v JSON, vizualizace „kdy naposledy ověřeno" |
| Konflikt s politickou citlivostí | nízká | vysoký | drž se faktického, citace ano, vlastní hodnocení ne |

---

## 10 · Hand-off pořadí

1. **M-STR-1** — Web rešerše. Bez živé sítě nelze. Vyžaduje ~90 min nepřerušovaného běhu s WebFetch + WebSearch.
2. **M-STR-2** — Datový model. Návazný, ale dá se rozdělit po batch-ech (úrovně 1, 2, 3 zvlášť).
3. **M-STR-3** — Frontend. Nezávislý na M-STR-1/2 v tom smyslu, že kostra (HTML + JS) jde napsat se stub daty; live data se dotahnou z M-STR-2.
4. **M-STR-4** — Vizualizace pro Politiku. Volitelné.

Mezi milníky commit + push → review.

---

## 11 · Návaznost na zbytek dashboardu

- **Po M-STR-2:** karty indikátorů v dashboardu dostanou sekci „Souvisí se strategiemi" — 2–3 chipy s odkazem.
- **Po M-STR-3:** v hlavičce dashboardu nový tab „Strategie".
- **Po M-STR-4:** sekce „Politik" v dashboardu odkazuje na timeline + responsibility matrix v rozcestníku.

---

*Verze 1.0 · květen 2026 · Připraveno pro implementaci v Claude Code.*
