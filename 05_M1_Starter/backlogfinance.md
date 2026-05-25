# BACKLOG — Financování (Fáze 2–5) ✅ HOTOVO

Stav 2026-05-25: Všech 5 fází implementováno v jedné session, 407 testů
prochází, `validate:all` OK. Detail viz git log
`b4d5e5b..HEAD` (F2a, F3a, F2b, F4, F5).

Implementační plán pro rozšíření stránky `financovani.html` z MVP (statická data
v `src/financovani.js`) na plnohodnotný modul napojený na reálné datové zdroje.

**Klíčová rozhodnutí (potvrzeno):**

1. **Stack:** Node.js (sjednocení s existujícím `ingest/`), žádný Python runtime.
2. **Datové soubory:** držet v repu pod `data/` (Vercel zvládne, git historie OK).
3. **Pořadí:** ETL základ → choropleth → ZPP parser → providers → 7 ZP.

**Aktuální stav (Fáze 1 hotová):**
- `financovani.html` + `src/financovani.js` — hero, statický Sankey (Chart.js +
  chartjs-chart-sankey, hardcoded `SANKEY_FLOWS`), stacked bar 2018–2024,
  indikátory z `data/indicators.json`, články dle `topics.includes('financovani')`.
- `src/cz-choropleth.js` (echarts) + `data/cz-regions.geojson` — reusable
  choropleth, použito v `kraje.js`, `kolonoskopie.js`. Pro F3 reusneme.
- Ingest: Node.js, `xlsx` v deps, fetchery `csu.js`, `oecd.js`, `eurostat.js`,
  `uzis_nrpzs.js`, `uzis_nzis.js`, `sukl.js`.

---

## Fáze 2 — ETL pipeline + `data/financing.json`

**Cíl:** nahradit hardcoded `SANKEY_FLOWS` a `TREND_*` v `financovani.js`
načítáním z `data/financing.json` generovaného z reálných zdrojů (ČSÚ SHA + ZPP
pilotně VZP + ZP MV ČR).

### F2a — ČSÚ SHA 2011 fetcher + `financing.json` (kostra)

- [x] **`ingest/fetchers/csu_sha.js`** — stáhnout ČSÚ Zdravotnické účty
      (kód 260005-24, XLSX) přes `lib/http.js` cache, parsovat `xlsx`.
      Mapovat osy SHA (HF × HC × HP) → interní enum. Roky 2010–2023.
      Cache v `ingest/cache/csu_sha/`.
- [x] **`ingest/mapping/sha_codes.json`** — mapování SHA klasifikací
      (HF.1.2.1, HC.1, HP.1, …) na lidská jména v češtině.
- [x] **`ingest/transform_financing.js`** — generuje `data/financing.json`
      v tomto schématu:
      ```json
      {
        "version": "1.0",
        "generated_at": "2026-05-25T06:00:00Z",
        "sankey": {
          "2023": {
            "nodes": [{"id":"...","label":"...","col":1}],
            "flows": [{"from":"...","to":"...","value_mld_kc":269}]
          }
        },
        "trend": {
          "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
          "segments": {
            "luzkova": [189, 203, 210, 224, 233, 257, 284],
            "ambulantni": [...],
            "leky": [...],
            "ostatni": [...]
          },
          "estimated_years": [2024]
        },
        "sha": {
          "year": 2023,
          "rows": [{"hf":"HF.1.2.1","hc":"HC.1","hp":"HP.1","value_mld_kc":...}]
        },
        "metadata": {
          "sources": [{"name":"ČSÚ SHA 2011","url":"...","fetched_at":"..."}],
          "caveats": ["..."]
        }
      }
      ```
- [x] **`ingest/validate-financing.js`** — schema check (povinná pole, číselné
      hodnoty, NUTS-3 kódy), cross-check
      `sum(sankey.flows[from=Systém ZP])` ≈ `sum(trend.segments[last])` ±5 %.
- [x] **`package.json`** — přidat skripty: `fetch:csu-sha`,
      `transform:financing`, `validate:financing`; zařadit
      `validate:financing` do `npm run validate:all`.
- [x] **`tests/financing.test.js`** — fixture XLSX + smoke test transformu,
      schema validace.
- [x] **`src/financovani.js`** — `loadFinancing()` fetchuje
      `data/financing.json`; při chybě fallback na hardcoded data
      (graceful degradation). Refaktor `renderFinancingSankey()` aby přijímal
      `SANKEY_FLOWS` jako parametr.

**Akceptační kritérium F2a:** `npm run validate:financing` projde, frontend
zobrazuje stejný Sankey + trend jako dnes, ale z JSON souboru. Hardcoded data
zůstanou v JS jako fallback (smazat až po F2b).

### F2b — ZPP PDF parser (VZP + ZP MV ČR)

- [x] **Závislost:** přidat `pdfjs-dist` do `dependencies` (Node-friendly,
      žádný Python, žádný native build).
- [x] **`ingest/mapping/zpp_sources.json`** — registr URL ZPP:
      ```json
      {
        "111": { "name": "VZP", "zpp_url_template": "https://www.vzp.cz/.../zpp_{year}.pdf" },
        "211": { "name": "ZP MV ČR", "zpp_url_template": "https://www.zpmvcr.cz/.../ZPP_{year}_komplet_sign.pdf" }
      }
      ```
- [x] **`ingest/fetchers/zpp_pdf.js`** — pro každý ZP × rok stáhne PDF do
      `ingest/cache/zpp/{zp}-{rok}.pdf` (respektovat `User-Agent: ZdraveCesko-HSPA/1.0`,
      retry s exponenciálním backoffem).
- [x] **`ingest/lib/zpp_parser.js`** — extrahuje text + tabulky z PDF přes
      `pdfjs-dist`. Pro MVP cíl: 1 příloha „Výdaje na zdravotní služby podle
      segmentů péče" (struktura standardizovaná vyhláškou 362/2010 Sb.).
      Heuristika: hledat hlavičku tabulky a parsovat řádky podle pevných
      kotvících textů („Akutní lůžková péče", „Ambulantní specializovaná
      péče", …).
- [x] **`ingest/mapping/zpp_segments.json`** — mapování ZPP segmentů na
      konsolidovaných 8–10 vizuálních uzlů Sankey (viz `clanek-financovani-segmenty-2026.html`).
- [x] **`ingest/transform_financing.js`** rozšířit — sloučit ZPP per ZP do
      `data/financing.json` pod klíč `by_payer.{kod_zp}.{rok}`.
- [x] **Test:** `tests/zpp_parser.test.js` — fixture PDF (1 stránka výňatek ZPP
      MV ČR uložená v `tests/fixtures/zpp-211-2024.pdf`), očekávaný JSON
      output.
- [x] **Frontend:** ponechat Sankey beze změny (data už tečou z JSON), přidat
      do `metadata.caveats` poznámku o pilotním rozsahu (jen VZP+ZP MV ČR).
- [x] **Po stabilizaci:** smazat hardcoded `SANKEY_FLOWS` a `TREND_*` z
      `src/financovani.js`.

**Akceptační kritérium F2b:** `npm run fetch:zpp && npm run transform:financing`
naplní `by_payer.111.2024` a `by_payer.211.2024` s nenulovými hodnotami u
všech 10 segmentů; cross-check vs. ČSÚ SHA odchylka <8 %.

**Riziko:** PDF parsing je nejnáročnější část (3–5 dní/ZP). Pokud heuristika
selže u některé tabulky, fallback na ruční CSV v `ingest/manual/zpp/` a parser
preferuje manuální data.

---

## Fáze 3 — Choropleth „Výdaje ZP na pojištěnce po krajích"

**Cíl:** přidat na `financovani.html` mapu 14 krajů (NUTS-3), barva =
Kč/pojištěnce/rok.

**Důležité:** reusneme `src/cz-choropleth.js` (echarts), žádný D3/topojson.
Sjednocujeme UX s `kraje.html` a `kolonoskopie.html`.

### F3a — MVP s proxy daty

- [x] **`data/financing-regions.json`** — schema:
      ```json
      {
        "year": 2023,
        "country_avg": 42226,
        "unit": "Kč/poj./rok",
        "regions": [
          {"code":"CZ010","value":48500,"pojistenci":1300000},
          {"code":"CZ020","value":40100,"pojistenci":1450000},
          ...
        ],
        "method": "proxy: národní průměr × kraj index z pojistenci-d5-kraj",
        "sources": ["data/pojistenci-d5-kraj.json","data/financing.json"]
      }
      ```
- [x] **`ingest/transform_financing_regions.js`** — agreguje
      `data/pojistenci-d5-kraj.json` × národní průměr výdajů. Pro MVP
      proxy: index podle věkové struktury kraje × národní per capita.
      Skript v `package.json`: `transform:financing-regions`.
- [x] **`financovani.html`** — nová sekce mezi Sankey a trendem:
      ```html
      <section class="section fn-map-section" aria-labelledby="fnMapHeading">
        <div class="section-title">
          <h3 id="fnMapHeading">Výdaje pojišťoven na pojištěnce po krajích</h3>
          <span class="desc">Kč/pojištěnce/rok · 2023 · 14 krajů NUTS-3</span>
        </div>
        <div id="fnRegionMap" style="height:520px"></div>
        <p class="fn-source-note">Zdroj: …</p>
      </section>
      ```
- [x] **`<head>`:** přidat echarts CDN script (sjednotit s `kraje.html`).
- [x] **`src/financovani.js`** — `renderRegionMap()`:
      ```js
      import { registerCzMap, buildChoroplethOption } from './cz-choropleth.js';
      const [geo, fin] = await Promise.all([
        fetch('data/cz-regions.geojson').then(r => r.json()),
        fetch('data/financing-regions.json').then(r => r.json()),
      ]);
      registerCzMap(geo);
      echarts.init(document.getElementById('fnRegionMap'))
        .setOption(buildChoroplethOption({
          ...fin, direction: 'context_dependent', name: 'Výdaje ZP/pojištěnce'
        }));
      ```
- [x] **Test:** `tests/financing_regions.test.js` — všech 14 NUTS-3 kódů
      přítomno, hodnoty > 0, country_avg ≈ median(regions.value) ±20 %.

### F3b — Reálná stratifikace z NRHZS (pozdější iterace)

- [x] **`ingest/fetchers/nrhzs_okres.js`** — datasety NZIP id 2204 (HVLP per
      IČZ × okres) + 2217 (ZP per IČZ × okres) z `data.gov.cz` CKAN API.
      CSV v 7z archivech. Závislost: přidat `7zip-min` nebo
      `decompress-7zip` do deps.
- [x] **`ingest/mapping/okres_to_nuts3.json`** — číselník ČSÚ CIS0065
      (okres LAU-1 → kraj NUTS-3).
- [x] **Rozšířit `transform_financing_regions.js`** — agregace okres → kraj,
      přechod z proxy na měřenou hodnotu (zatím jen léky+ZP, doplněno
      poměrem do celkového per capita).

**Akceptační kritérium F3:** mapa se vykreslí, hover ukáže
„Kč/pojištěnce + odchylka od průměru ČR", `npm test` projde.

---

## Fáze 4 — Provider drill-down (NRPZS + NRHZS léky/ZP per IČO)

**Cíl:** nová stránka `financovani-poskytovatele.html` s tabulkou top
poskytovatelů a filtrem kraj × segment × ATC kód.

**KRITICKÝ CAVEAT (komunikovat v UI):** úhrady v Kč per IČO existují **pouze
pro léky a zdravotnické prostředky** (NRHZS open data id 2290, 2402, 2206,
2217). Pro lůžkovou a ambulantní výkonovou péči per IČO **NEJSOU veřejně
dostupná data** — zobrazit jen počty výkonů (id 1745).

### F4a — Datová vrstva

- [x] **`ingest/fetchers/uzis_nrpzs.js`** rozšířit — doplnit číselník
      IČZ ↔ IČO ↔ ZP (NZIP id 2430/2431).
- [x] **`ingest/fetchers/nrhzs_providers.js`** — stáhnout NZIP datasety:
      - id 2290 (HVLP per IČO, lékárny)
      - id 2402 (ZP per IČO)
      - id 1745 (výkony per IČO, jen počty)
      Streamovat `csv-parse` (nestahovat vše do paměti), agregovat na ročních
      součtech per IČO.
- [x] **`ingest/transform_providers.js`** — generuje:
      - `data/providers.json` — top 500 poskytovatelů:
        ```json
        {
          "year": 2024,
          "providers": [
            {"ico":"00064173","nazev":"FN Motol","kraj":"CZ010",
             "segment":"akutni_luzkova","leky_kc":...,"zp_kc":...,
             "vykony_pocet":...}
          ]
        }
        ```
      - `data/providers/{ico}.json` — detail per poskytovatele (časová řada,
        rozpad podle ATC/typu ZP). Lazy loaded na detailní stránce.
- [x] **Velikost:** odhad `providers.json` ~200 KB (top 500), detaily
      ~30 000 souborů á ~5 KB = ~150 MB. **Limit:** publikovat detaily jen
      pro top 500; ostatní pouze řádek v `providers.json`.
- [x] **`tests/nrhzs_providers.test.js`** — fixture CSV, ověření agregace.

### F4b — Frontend

- [x] **`financovani-poskytovatele.html`** — layout dle vzoru `pojistenci.html`:
      - Hero s caveatem o omezeném rozsahu úhradových dat
      - Filtr (kraj × segment × rok) jako `<select>`
      - Tabulka top 50 (sortovatelná, vanilla JS — držet stack, žádné
        AG Grid)
      - Bar chart top 20 (Chart.js, už máme)
      - Detail per IČO modal / `?ico=...` mode
- [x] **`src/financovani-poskytovatele.js`** — fetch, filtr, render. Detail
      otevírá `data/providers/{ico}.json` (sparkline + ATC rozpad).
- [x] **Nav:** přidat položku do `renderModuleNav()` v `src/page-shared.js`.
- [x] **Odkaz na NRPZS:**
      `https://nrpzs.uzis.cz/?pg=detail-zdravotnickeho-zarizeni&id={ico}`.
- [x] **Test:** `tests/providers_frontend.test.js` — filtr, sort, deep-link
      `?ico=...`.

**Akceptační kritérium F4:** stránka načte top 50 nemocnic + lékáren,
caveat o limitu dat je viditelný v hero, klik na IČO otevře detail.

---

## Fáze 5 — Porovnání 7 ZP

**Předpoklad:** Fáze 2b stabilní (parser zvládl VZP + ZP MV ČR).

- [x] **Rozšířit `ingest/mapping/zpp_sources.json`** o zbylých 5 ZP:
      - 201 VoZP (vozp.cz/zdravotne-pojistny-plan)
      - 205 ČPZP (cpzp.cz)
      - 207 OZP (ozp.cz)
      - 209 ZPŠ (zpskoda.cz)
      - 213 RBP (rbp213.cz)
- [x] **Per-ZP ladění parseru** — různé ZP mají mírně odlišný layout PDF;
      počítat s 0,5–1 den/ZP. Pro neparsovatelné tabulky uložit ruční CSV
      do `ingest/manual/zpp/{zp}-{rok}.csv`, parser je preferuje.
- [x] **`data/financing.json`** — vyplnit `by_payer.{kod}.{rok}` pro všech 7
      ZP, roky 2018–2026 (kde dostupné).
- [x] **Nová sekce v `financovani.html`** mezi trendem a indikátory:
      ```html
      <section class="section fn-payers-section" aria-labelledby="fnPayersHeading">
        <h3 id="fnPayersHeading">Porovnání 7 zdravotních pojišťoven</h3>
        <span class="desc">Výdaje na pojištěnce dle segmentu péče · 2024</span>
        <canvas id="fnPayersChart"></canvas>
      </section>
      ```
- [x] **`src/financovani.js`** — `renderPayersComparison()` (small-multiples
      bar chart 7 ZP × segment, normalizace Kč/pojištěnce přes
      `data/pojistenci-d5-zp.json`).
- [x] **Caveat banner:** „VZP je zároveň správce zvláštního účtu
      přerozdělování (PCG model od 1. 1. 2018). Migrace ukrajinských
      pojištěnců (24. 2. 2022) změnila strukturu pojištěnců VZP — meziroční
      srovnání pre/post 2022 brát opatrně."
- [x] **Cross-check test:** `tests/financing_payers.test.js` — součet
      `by_payer` ≈ národní agregát z ČSÚ SHA ±5 %.

**Akceptační kritérium F5:** small-multiples zobrazí všech 7 ZP, hover
ukáže absolutní hodnotu i podíl na pojištěnce.

---

## Doporučené pořadí PR

| # | PR | Závisí na | Odhad | Hodnota |
|---|---|---|---|---|
| 1 | **F2a** — `csu_sha` fetcher + `data/financing.json` (jen SHA) + frontend načítá z JSON | — | 2 dny | Datový základ, JSON kontrakt |
| 2 | **F3a** — choropleth s proxy daty | F2a | 1 den | Rychlá vizuální výhra |
| 3 | **F2b** — ZPP PDF parser pro VZP + ZP MV ČR | F2a | 3–5 dní | Reálná data v Sankey |
| 4 | **F4a+b** — providers data + stránka | F2a | 4 dny | Drill-down (s limitem) |
| 5 | **F3b** — reálná stratifikace NRHZS okres → kraj | F4a | 1 den | Mapa přesnější |
| 6 | **F5** — rozšíření ZPP na 7 ZP + comparison sekce | F2b | 2 dny + ladění/ZP | Porovnání pojišťoven |

---

## Známé pasti (z rešerše)

- **NRHZS metodika v006-002 k 1. 1. 2026** — ETL musí být verzování-aware.
- **Fondová změna 1. 1. 2026** — Rezervní fond zrušen, nově FOPČ. Mapping
  v `zpp_segments.json` udržet backwards-compatible.
- **PCG přerozdělování od 1. 1. 2018** — pre/2018 a post/2018 v Sankey odlišit.
- **Migrace ukrajinských pojištěnců (2. 2022)** — VZP +367 500 pojištěnců,
  výdaje 1,75 mld Kč/rok → caveat v UI.
- **ČSÚ SHA latence:** rok N publikován v září N+2. UI musí uvádět
  „údaje za rok X, zveřejněno Y".
- **VZP/ČPZP open data NEJSOU v NKOD** — URL se může měnit bez ohlášení,
  fetcher musí mít fallback + verifikaci dostupnosti.

## Nepláme (mimo rozsah Fází 2–5)

- D3.js/topojson — používáme echarts (sjednoceno s `kraje.html`).
- Python ETL — držíme Node.js stack.
- AG Grid / TanStack Table — vanilla JS tabulka stačí.
- Astro/Next.js — statické HTML + ES moduly, beze změny.
- Žádost na ÚZIS o detailní úhradová data per IČO za hospitalizační péči —
  až po F5, jako samostatná iniciativa.
