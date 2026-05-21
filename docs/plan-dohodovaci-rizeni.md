# Plán: stránka „Dohodovací řízení — datová podpora"

Pracovní plán pro vyskladnění nové sekce webu nad datovými sadami NZIP
„Datová podpora dohodovacího řízení" (ÚZIS ČR / MZ ČR). Vychází z crawlu
zdroje a katalogu
[`05_M1_Starter/ingest/mapping/nzip_dohodovaci_rizeni_catalog.json`](../05_M1_Starter/ingest/mapping/nzip_dohodovaci_rizeni_catalog.json)
a analýzy [`nzip-dohodovaci-rizeni-katalog.md`](nzip-dohodovaci-rizeni-katalog.md).

Status: **návrh k odsouhlasení.** Po schválení začíná Vlna 0.

---

## 1. Koncept a vymezení

Datové sady dohodovacího řízení **nejsou klasické HSPA indikátory** — neměří
výsledek ani kvalitu systému, ale **provozní a ekonomická data** používaná při
každoročním vyjednávání úhrad (úhradová vyhláška) mezi zdravotními pojišťovnami
a poskytovateli. Proto:

- **nepatří** do `data/indicators.json` (kontrakt 80 HSPA indikátorů ani jeho
  signal-logiky),
- dostanou **vlastní dataset, vlastní stránku, vlastní CSS namespace** (`.dr-*`),
- existující `pojistenci.html` (OIS 11-47) je fakticky jedna z těchto sad
  → **sloučí se** do nové stránky.

Rozsah: 44 datových sad + 7 stránek jen s interaktivní vizualizací.

---

## 2. Umístění v hierarchii a navigace

| Pozice menu | Nyní | Návrh |
|---|---|---|
| 4. položka | `Pojištěnci` | **`Dohodovací řízení`** |

- Nová položka **nahradí** „Pojištěnci" na 4. místě menu — drží pohromadě
  datově těžké stránky: *Indikátory → HSPA přehled → Krajský pohled →
  Dohodovací řízení*.
- `pojistenci.html` → tenký **redirect** na `dohodovaci-rizeni.html?id=ois-11-47`
  (staré odkazy nepadnou).
- Úprava pole `tabs[]` v `src/page-shared.js` (~ř. 304): odebrat `pojistenci`,
  přidat `{ id:'dohodovaci-rizeni', label:'Dohodovací řízení',
  href:'dohodovaci-rizeni.html', match:['dohodovaci-rizeni.html'] }`.
- URL: `dohodovaci-rizeni.html` (rozcestník) a `dohodovaci-rizeni.html?id={ois}`
  (detail) — vzor `indicator.html`.

---

## 3. Architektura souborů

**Nové:**

| Soubor | Účel |
|---|---|
| `dohodovaci-rizeni.html` | Skeleton (topbar → masthead → `main#content` → footer); landing i detail |
| `src/dohodovaci-rizeni.js` | Vstupní modul; bez `?id=` rozcestník, s `?id=` detail |
| `src/dr-visuals.js` | Sdílené vizualizační rendery (time-lapse mapa, race, 3D bar) |
| `data/dohodovaci-rizeni.json` | Frontend kontrakt (schéma §5) |
| `ingest/fetchers/nzip_dohodovaci_rizeni.js` | Stahování XLSX dle katalogu |
| `ingest/lib/xlsx.js` | Wrapper na parsování XLSX |
| `ingest/transform_dohodovaci_rizeni.js` | XLSX → národní/krajské agregáty → dataset |
| `ingest/validate-dohodovaci-rizeni.js` | Validátor schématu |
| `ingest/mapping/dohodovaci_rizeni_international.json` | OIS kód → OECD/Eurostat kód |
| `tests/dohodovaci_rizeni_frontend.test.js` | Smoke test |

**Změněné:**

- `src/page-shared.js` — navigace (§2)
- `src/pojistenci.js` — zachovat atlas-logiku, přemontovat jako detail renderer
  pro `?id=ois-11-47`
- `pojistenci.html` — nahradit redirectem
- `src/styles.css` — nový namespace `.dr-*`
- `ingest/run.js` — registrace fetcheru + transformu
- `package.json` — XLSX závislost (SheetJS), `echarts-gl`, skript
  `validate:dohodovaci-rizeni`
- `docs/site-architecture.md`, `docs/data-model.md` — nová stránka a dataset

Využije se hotový katalog `ingest/mapping/nzip_dohodovaci_rizeni_catalog.json`.

---

## 4. Datová pipeline

```
katalog (hotový)  →  fetcher (stáhne nejnovější XLSX edice do ingest/cache/)
                  →  transform (XLSX → agregace na ČR / kraj → série)
                  →  + mezinárodní vrstva (OECD SDMX / Eurostat přes stávající
                       fetchery oecd.js, eurostat.js, dle international mappingu)
                  →  data/dohodovaci-rizeni.json
                  →  validate  →  commit  →  Vercel
```

- **XLSX parsing:** repo zatím XLSX knihovnu nemá (pojištěnci se konvertovali
  ručně). Přidá se SheetJS + `ingest/lib/xlsx.js`.
- **Agregace:** XLSX jsou na úrovni poskytovatelů (IČO/IČZ) → transform sečte /
  zváží na ČR a kraj.
- **Časová řada:** buď z více let uvnitř souboru, nebo stohováním ročních edic
  (řeší katalog).
- **Kadence:** nepravidelná, dle ÚZIS — typicky 1–3 edice ročně na sadu.

---

## 5. Datový model — `data/dohodovaci-rizeni.json`

```jsonc
{
  "version": "1.0",
  "generated_at": "2026-…",
  "negotiation_context": { "title": "...", "lead": "..." },   // co je dohodovací řízení
  "dimensions": [                                              // 8 + registry
    { "id": "d2-personalni", "number": 2, "label": "Personální zabezpečení",
      "color": "...", "description": "...", "dataset_ids": ["ois-11-12", "..."] }
  ],
  "datasets": [{
    "id": "ois-11-12",
    "ois_code": "OIS-11-12",
    "dimension": "d2-personalni",
    "title": "Vývoj průměrných platů a mezd",
    "role_in_negotiation": "Vstup pro vyjednávání mzdových indexací v segmentech…",
    "what_it_says": "Editorial interpretace — co z dat plyne…",
    "source": { "name": "ÚZIS · výkaz E(MZ)2-01", "nzip_page": "…",
                "files": ["…"], "cadence": "ročně" },
    "headline": { "value": 126657, "unit": "Kč/měs", "year": 2024,
                  "label": "Plat lékaře" },
    "series": [{ "key": "plat_lekar", "label": "Lékař (plat)", "unit": "Kč",
                 "points": [{ "year": 2019, "value": 89495 }] }],
    "international": {                                          // KLÍČOVÉ
      "available": true,
      "comparator": "Remuneration of doctors (ratio to average wage)",
      "cz": 2.6, "oecd": 2.8, "eu": 2.5, "unit": "× průměrná mzda", "year": 2023,
      "source": { "name": "OECD Health Statistics", "code": "…", "url": "…" },
      "explanation": "Čeští lékaři berou 2,6× průměrnou mzdu, mírně pod OECD…"
    },
    "visualization": {                                         // viz §7, výstup rozvahy §8
      "data_cut": "national_timeseries",
      "primary_chart": "line",
      "animation": { "pattern": "line-draw", "rationale": "…",
                     "controls": ["play"] },
      "uses_3d": false,
      "engine": "chartjs",
      "fallback_2d": "Statická linka s posledním rokem zvýrazněným.",
      "rationale": "Krátké zdůvodnění volby."
    },
    "regional": false
  }],
  "interactive_only": [ /* 7 stránek bez stažitelného souboru */ ]
}
```

Sady bez mezinárodního ekvivalentu: `international.available:false` +
`international.note` („přímé srovnání neexistuje; nejbližší proxy je…").

---

## 6. Mezinárodní srovnání — mapping per dimenze

Nejnáročnější část. Pro každou dimenzi navržený zdroj benchmarku; rešerše
proběhne v rámci příslušné vlny.

| Dim | Téma | Mezinárodní zdroj / metrika | Síla |
|---|---|---|---|
| 1 | Léky, PZT, ceny | OECD *Pharmaceutical expenditure per capita*; Eurostat `hlth_sha` | střední |
| 2 | Platy, úvazky, věk | OECD *Remuneration of doctors/nurses*, *Doctors per 1 000*, *Doctors by age* | **silná** |
| 3 | Nelůžková péče, ZZS | OECD *Doctors' consultations per capita*; ZZS bez přímého srovnání | střední |
| 5 | Pojištěnci, náklady ZP | OECD *Health expenditure by function/scheme*; Eurostat demografie | **silná** |
| 6 | Lůžková péče, DRG | OECD *Hospital beds per 1 000*, *Average length of stay*, *Discharges* | **silná** |
| 7 | Komunitní / domácí péče | OECD *Long-term care recipients / workers* | střední |
| 8 | Jednodenní péče | OECD *Day-surgery rates* (katarakta, tonzilektomie) | **silná** |
| — | Přístroje SSS-04-02 | OECD *Medical technology* — CT, MRI, PET, radioterapie / mil. ob. | **silná** |

Sady bez ekvivalentu (referenční síť, centralizace péče, ZZS výjezdy) →
poctivě označeny „srovnání není k dispozici", nikdy se nedopočítává uměle.

---

## 7. Struktura stránky (podoba homepage)

**Landing `dohodovaci-rizeni.html`** zrcadlí editorial styl homepage:

1. **Editorial hero** (`.dr-hero`) — kicker „Datová podpora dohodovacího řízení"
   + headline + lead vysvětlující, co dohodovací řízení je a proč data.
2. **Mřížka 8 dimenzí** (`.dr-dims-grid`, vzor `.ed-dims-grid`) — 8 dlaždic,
   každá = dimenze, počet sad, proklik.
3. **Sekce per dimenze** — `.card-grid` karet sad (vzor `.indicator-card`):
   název, headline číslo (`.av-counter`), mini-sparkline, štítek mezinárodního
   srovnání.
4. **Sekce „Odkud data jsou"** — provenience, ÚZIS, kadence, odkaz na katalog.
5. Footer.

**Detail `?id=…`** zrcadlí `indicator.html`:

- hlavička (dimenze, OIS kód), hero hodnota, **role v dohodovacím řízení**,
  **co data říkají**,
- velký graf časové řady (Chart.js) s referenčními liniemi OECD/EU,
- **blok mezinárodního srovnání** + jeho vysvětlení,
- metodika a zdroje, odkaz na originální XLSX,
- `?id=ois-11-47` → vykreslí stávající atlas pojištěnců.

---

## 8. Grafická reprezentace a animace

V repu jsou **dva grafické enginy** — Chart.js (statické grafy indikátorů) a
**ECharts** (atlas pojištěnců: autoplay mapa, bar-chart-race). Použijí se **oba**;
pro 3D se přidá `echarts-gl`.

### Katalog animovaných vzorů

| Vzor | Co dělá | Odkud / čím | Pro jaká data |
|---|---|---|---|
| **Time-lapse choropleta** | autoplay mapa krajů přes roky, slider + ▶ | `pojistenci.js renderMap` (ECharts) | krajský rozpad v čase |
| **Bar-chart-race** | žebříček top-N se přeskupuje rok po roce | `pojistenci.js renderRace` (ECharts) | top DRG, top okresy, top segmenty |
| **Count-up** | číslo se „dopočítá" při scrollu | `.av-counter` (IntersectionObserver) | headline čísla |
| **Animované kreslení řady** | linka se vykreslí zleva doprava | Chart.js animace | časové řady |
| **Populační pyramida** | oboustranné bary, přechod mezi roky | `pojistenci.js renderPyramid` | věková struktura personálu |
| **3D bar / surface** | kraj × rok × hodnota jako 3D plocha | `echarts-gl` | husté kraj×rok matice |
| **Animovaný stacked / treemap** | podíly segmentů narůstají | ECharts | rozpad nákladů ZP |

### Pravidla použití (srozumitelnost vs. přehlednost)

- Animace **slouží sdělení**, ne dekoraci — každá musí mít „proč".
- **3D jen tam, kde zvyšuje srozumitelnost** (např. kraj×rok×hodnota povrch,
  kde 2D mřížka je nečitelná); nikdy ne 3D koláč. Vždy i 2D fallback.
- Vše respektuje `prefers-reduced-motion` → animace vypnuta, finální stav
  okamžitě.
- Každá animace má ruční ovládání (slider, ▶/⏸) — uživatel není rukojmím
  autoplaye.
- 2D statická varianta musí dávat smysl i bez přehrání (tisk, screenshot).

---

## 9. Datová a grafická rozvaha per sada

**Pro každou ze 44 sad se v rámci její vlny provede explicitní rozvaha** —
rozhodovací krok, jehož výstup se zapíše do bloku `visualization` (§5):

1. **Datový řez** — co je nosné sdělení? (národní agregát / kraj / kategorie /
   top-N / poskytovatelé)
2. **Primární graf** — jaký typ nejlépe nese sdělení.
3. **Animace** — má smysl? jaký vzor z katalogu §8? jaký „proč"?
4. **3D** — zvyšuje 3D srozumitelnost, nebo jen ruší? (default: ne)
5. **Srozumitelnost vs. přehlednost** — kontrola: pochopí to laik za 5 s?
   a zároveň to není přeplácané?
6. **Fallback** — 2D/statická varianta + `reduced-motion` stav.

### První návrh přiřazení

| Sada / typ | Datový řez | Graf + animace |
|---|---|---|
| Přístroje SSS-04-02 | národní řada 2006–2024, 19 typů | animované kreslení řady + count-up; malé násobky per typ |
| Platy/mzdy OIS-11-12/13 | řada 2019–2024 per kategorie | line + count-up; pyramida pro věk personálu (11-16) |
| Lůžkový fond OIS-11-28 | kraj × rok | **time-lapse choropleta** + 3D povrch kraj×rok jako alternativa |
| Nákladovost DRG OIS-11-37 | top-N DRG dle nákladů v čase | **bar-chart-race** |
| Náklady ZP OIS-11-24 | rozpad segmentů | animovaný treemap / stacked |
| Jednodenní péče OIS-11-33 | řada objemu výkonů | line + count-up, srovnání s OECD day-surgery |
| Pojištěnci OIS-11-47 | (hotovo) | beze změny — atlas se přemontuje jako detail |

---

## 10. Vyskladnění — vlny

- **Vlna 0 — Infrastruktura:** dataset schéma + validátor, fetcher + `xlsx.js`,
  transform skeleton, `src/dr-visuals.js` (zobecněné rendery time-lapse mapy,
  race, 3D baru extrahované z `pojistenci.js`), instalace `echarts-gl`, landing
  skeleton + nav + redirect pojištěnců, vykreslení (zatím prázdné) dimenzní
  mřížky. Proof-of-concept: zapojit už hotová data (SSS-04-02 přístroje,
  OIS 11-47 pojištěnci).
- **Vlny 1–8 — jedna dimenze datové podpory na vlnu.** Každá vlna:
  1. datová a grafická rozvaha sad dané dimenze (§9),
  2. fetch + transform,
  3. mezinárodní benchmark (§6),
  4. redakční texty (zdroj, role, interpretace, vysvětlení srovnání),
  5. detailní stránky + karty na landing.
  Doporučené pořadí dle hodnoty/snadnosti: **2 → 6 → 8 → 5 → 1 → 3 → 7 → 4**.
- **Vlna 9 — Doplňkové registry:** SSS-04-02, NR-02, OIS-03-01, PPS-08-01
  + odkazy na 7 interaktivních vizualizací.
- **Vlna 10 — Finalizace:** a11y, dark mode, print, responsivita, freshness,
  dokumentace, smoke testy.

---

## 11. Testy, validace, dokumentace

- `npm run validate:dohodovaci-rizeni` → součást `validate:all`
- `tests/dohodovaci_rizeni_frontend.test.js` — smoke kontrakt
- aktualizace `docs/site-architecture.md` + `docs/data-model.md`
- ověření Vercel preview na konci každé vlny

---

## 12. Rizika a otevřené otázky

- **XLSX parser** — nová závislost (SheetJS); nutno odsouhlasit.
- **`echarts-gl`** — nová závislost pro 3D vizualizace.
- **Agregace provider-level dat** — u některých sad (vážené průměry platů)
  chybí váhy v jednom souboru → nutný join přes více sad.
- **Mezinárodní srovnání** je u ~⅓ sad slabé/neexistuje — plán to řeší
  poctivým označením, ne dopočítáváním.
- **Sloučení pojištěnců** — `pojistenci.js` má ~1255 LOC; zachovat beze změny
  chování, jen přemontovat vstupní bod.
- **Otevřené:** (1) souhlas se SheetJS + `echarts-gl`; (2) finální název v menu
  („Dohodovací řízení" vs. „Datová podpora").

---

*Verze 1.0 · květen 2026 · podklad pro AI agenty i lidi*
