# Plán — Diagnóza českého zdravotnictví (`diagnoza.html`)

Syntéza celého webu: každý indikátor dostane **spis případu** — od symptomu
(měření + „Doháněč: kdy doženeme OECD") přes příčiny (Model systému), léčbu
(Simulátor pák), účet (Úhradová vyhláška) a politické sliby (Barometr) až po
osobní akci (Kompas/Prevence) a další čtení (články). Nula nových dat —
jen propojení existujících datasetů.

## Architektura (4 pracovní balíky + integrace)

### A · Index křížových vazeb — `scripts/build-diagnoza-index.js` → `data/diagnoza-index.json`

Build skript projde existující datasety a pro každý indikátor
z `data/indicators.json` sestaví záznam. **Závazný kontrakt výstupu:**

```json
{
  "version": "1.0",
  "generated_at": "...",
  "_doc": "...",
  "indicators": {
    "<indicator_id>": {
      "articles":  [{ "slug": "clanek-x.html", "title": "..." }],
      "levers":    [{ "id": "...", "label": "...", "kind": "elasticity|directional" }],
      "vyhlaska":  [{ "id": "<segment_id>", "label": "..." }],
      "barometr":  [{ "id": "...", "titulek": "...", "stav": "plni_se|bez_pohybu|opacny_smer|..." }],
      "kompas":    [{ "id": "...", "label": "..." }],
      "prevence":  [{ "id": "<theme_id>", "title": "..." }],
      "system_nodes": [{ "id": "...", "label": "...", "kind": "lever|flow|outcome" }],
      "region_dataset": "<dataset_id>|null"
    }
  }
}
```

Zdroje vazeb: `articles.json` (`linked_indicators`), `levers.json`
(`effects[].indicator`), `vyhlaska-hra.json` (`effects[].indicator`),
`barometr.json` (`commitments[].linked_indicators`), `personal-checks.json`
(`related_indicator`), `prevention.json` (`themes[].hspa_indicators`),
`system-model.json` (`nodes[].indicators`), `regions.json`
(`datasets[].indicator_id` — první match). Indikátory bez jediné vazby se do
indexu nezapisují. U článků jen `isArticleVisible`-nezávislá metadata (slug,
title) — viditelnost řeší frontend. Skript: `npm run build:diagnoza`,
zapojit i test „index je v syncu se zdroji" (regeneruj v paměti a porovnej).

### B · Doháněč — `src/dohanec-engine.js` (čistý, bez DOM)

**Závazný kontrakt:**

```js
dohanec(indicator, opts?) → {
  status: 'catches_up' | 'diverging' | 'already_better' | 'insufficient_data',
  year: number|null,        // rok protnutí OECD (jen catches_up; strop 2100)
  rate: number|null,        // průměrná roční změna z trendu (absolutní)
  gap: number|null,         // aktuální rozdíl vs. benchmark (se znaménkem)
  note: string              // lidsky čitelné shrnutí (česky)
}
```

Pravidla: potřebuje `benchmark.oecd`, `direction` ∈ higher/lower_is_better
a ≥ 3 body v `trend[]` (+ aktuální hodnota), jinak `insufficient_data`.
Tempo = průměrná roční změna přes celý dostupný trend (lineární, ne CAGR —
jednodušší vysvětlit). Benchmark se drží konstantní (poctivá poznámka
v note). Pokud je ČR už na správné straně benchmarku → `already_better`.
Pokud se rozdíl zvětšuje nebo tempo ~0 → `diverging` („při současném tempu
nikdy"). Protnutí po roce 2100 → `diverging` (prakticky nikdy). Vše modelová
extrapolace, NE predikce — disclaimer v UI.

### C · Stránka — `diagnoza.html` + `src/diagnoza.js` + CSS `.dg-*`

- `diagnoza.html?id=<indicator_id>`; bez id → rozcestník (výběr indikátorů,
  které mají spis, seřazený podle počtu vazeb).
- Sekce spisu: 1) hero s Doháněčem, 2) Měření (hodnota/trend/benchmark/
  signál + kraje), 3) Proč (system_nodes → model-systemu.html), 4) Páky
  (levers → simulator.html), 5) Peníze (vyhlaska → vyhlaska.html),
  6) Sliby (barometr → barometr.html), 7) Co můžu já (kompas + prevence),
  8) Číst dál (články, jen viditelné přes isArticleVisible).
- Prázdné sekce se nevykreslují (spis ukazuje jen to, co existuje).
- Bootstrap: renderModuleNav('indicators') + renderMastheadDate() +
  renderRelatedTools? (ne — Diagnóza není SITE_TOOL, je to vrstva nad
  indikátory; místo toho odkaz zpět na indicator.html).
- CSS jen tokeny (--paper/--ink/--rule/--red/signály) → dark-safe;
  žádné prefers-color-scheme.

### D · Vstupní body

- `src/indicator.js`: tlačítko/odkaz „🗂 Otevřít spis Diagnózy" (jen pokud
  indikátor v indexu je).
- `index.html`: karta v sekci `.home-tools` (wide „Nová vrstva").
- `src/page-shared.js`: SITE_TOOLS NErozšiřovat (Diagnóza není nástroj,
  je to pojivo) — jen nav: pod „Indikátory" children přidat
  `{ id: 'diagnoza', label: 'Diagnóza', href: 'diagnoza.html' }`.

## Vlastnictví souborů (paralelní práce bez konfliktů)

| Balík | Smí editovat |
|---|---|
| A | `scripts/build-diagnoza-index.js`, `data/diagnoza-index.json`, `tests/diagnoza-index.test.js`, `package.json` (jen +2 řádky scripts) |
| B | `src/dohanec-engine.js`, `tests/dohanec.test.js` |
| C | `diagnoza.html`, `src/diagnoza.js`, `_diagnoza.css` (dočasný — integrátor přilepí do styles.css) |
| D | `src/indicator.js`, `index.html`, `src/page-shared.js` |
| Integrace | merge CSS, build:css, validate:all, testy, smoke, PR |

## Konvence (závazné pro všechny balíky)

Komentáře česky; node:test; žádná čísla bez zdroje; CSS tokeny only;
JSON: pozor na české uvozovky „…“ (U+201E/U+201C, nikdy ASCII ");
disclaimer „modelová extrapolace, ne predikce" u Doháněče.
