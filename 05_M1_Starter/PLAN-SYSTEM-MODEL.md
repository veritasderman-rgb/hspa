# Plán: Model systému — interaktivní kauzální mapa českého zdravotnictví

**Stav:** schváleno vlastníkem (session 2026-07-07), implementuje se.
**Datum:** 2026-07-07.
**Branch:** `claude/skorezdravotnictvi-major-feature-7yb7l9` (společný PR s PLAN-CLAIMS.md).
**Cíl:** nová stránka `model-systemu.html` — klikací kauzální graf zdravotního
systému ČR. Uzly = oblasti/páky systému, hrany = kauzální vazby s polaritou,
každý uzel napojený na živé indikátory a články. Režim „Zatlačte na páku"
zvýrazní vše, co daná páka ovlivňuje (deterministický BFS po hranách).

---

## 0) Proč a co to je

Web má dnes tři statická „jak to funguje" zobrazení: schéma aktérů
(`jak-funguje.html` `.schema-*`), střechu-pilíře (`.leverage-*`) a sérii
článků o systémových pákách (`clanek-systemove-mapovani-paky.html`,
`clanek-teorie-zmeny.html`, …). Chybí vrstva, která je spojí: **jeden model,
kde čtenář vidí, co s čím kauzálně souvisí, a každé tvrzení je podložené
indikátorem nebo článkem.** Vertikální vrstvy grafu = HSPA oblasti
(Struktury → Procesy → Výstupy → Výsledky), takže stránka zároveň učí logiku
HSPA hodnocení.

## 1) Dataset `data/system-model.json`

```json
{
  "version": "1.0",
  "updated_at": "2026-07-07",
  "nodes": [{
    "id": "prevence_sluzby",
    "label": "Prevence a screeningy",
    "layer": "Procesy",            // Struktury | Procesy | Výstupy | Výsledky
    "kind": "lever | flow | outcome",   // páka (dá se za ni zatlačit) / průtok / výsledek
    "x": 340, "y": 180,            // pevné souřadnice ve viewBox (layout kurátorovaný, žádný algoritmus)
    "desc": "1–3 věty co uzel je a proč na něm záleží",
    "indicators": ["screening_kolorektalni", "vydaje_prevence_pct"],
    "articles": ["clanek-vydaje-prevence.html"],
    "explainers": []               // volitelné id z data/explainers.json
  }],
  "edges": [{
    "id": "prevence_to_mortalita",
    "from": "prevence_sluzby",
    "to": "odvratitelna_mortalita",
    "polarity": "plus | minus",    // posílení uzlu from posiluje/oslabuje uzel to
    "mechanism": "1 věta jak vazba funguje",
    "strength": "strong | weak",   // vizuální tloušťka; weak = nepřímá/pomalá vazba
    "articles": []                 // volitelný doklad
  }]
}
```

Rozsah: **~22 uzlů, ~40 hran**. Ne encyklopedie — model drží jen vazby,
které umíme doložit indikátorem nebo článkem z korpusu. Obsah grafu vzniká
syntézou z korpusu (fan-out čtecích agentů po doménách + ruční syntéza).

## 2) Stránka `model-systemu.html` + `src/system-model.js`

- **Skeleton** dle vzoru `strategie.html`: topbar + `#moduleNav`,
  masthead, `.ed-hero` (headline + lead + hero-detail „jak model číst"),
  `<main id="content">`, footer. Stylesheet `src/styles.min.css`.
- **SVG generované z JS** (vzor `cz-map.js`), data z `system-model.json`:
  uzly `<g class="msys-node msys-node-{layer}" tabindex="0" role="button"
  aria-label>`, hrany `<path class="msys-edge msys-edge-{polarity}">`
  s marker šipkami. Vrstvy = 4 horizontální pásy s popisky oblastí HSPA.
- **Interakce** (vzor `schema.js` `initSchema`):
  - klik/Enter/Space na uzel → `.msys-node-active`, zvýraznění incident hran,
    detail panel `#msysPanel[aria-live="polite"]`: popis, **živé hodnoty
    indikátorů** z `data/indicators.json` (hodnota, jednotka, signál tečka),
    chipy → `indikator-{id}.html`, odkazy na články;
  - **režim „Zatlačte na páku"**: tlačítko v panelu uzlu typu `lever` →
    BFS po hranách downstream, zasažené uzly `.msys-node-affected`
    (+ polarita na hranách), panel vypíše řetěz „páka → … → výsledek";
  - reset klikem mimo / Escape.
- **A11y + mobil**: `<ul id="msysFallbackList">` (vrstvy → uzly → odkazy)
  zobrazený pod grafem na malých šířkách, `prefers-reduced-motion` vypne
  přechodové animace zvýraznění, klávesnice plně funkční (viz vzor schema.js).
- **Barvy**: vrstvy používají existující role barvy
  (`styles.css:4866` paleta), polarita hran zelená/oranžová z arrow markerů
  jak-funguje. **Červená jen hrot kompasu** (visual-components.md §0).
- **CSS**: nová sekce na konci `styles.css`, namespace `.msys-*`,
  poté `npm run build:css`.

## 3) Zapojení do webu

1. **Menu**: child „Model systému" pod tab „Jak funguje"
   (`page-shared.js` pole `tabs` v `renderModuleNav`).
2. **Sitemap + SEO**: záznam do `STATIC_PAGES` v
   `scripts/generate-sitemap.js`, pak `npm run seo:pages` +
   `npm run generate:sitemap` (test `inject-page-seo.test.js` vynucuje
   canonical/og:url/JSON-LD).
3. **Cross-link**: karta „Model systému" do `.ed-flow`/related sekce na
   `jak-funguje.html`; článek `clanek-systemove-mapovani-paky.html` dostane
   odkaz na živý model (jen doplněný odkaz, žádná změna textu tvrzení).

## 4) Validátor + testy

- `ingest/validate-system-model.js` (vzor validate-strategies.js):
  unikátní id, `layer` z enum, `from`/`to` existují, `indicators[]` existují
  v `data/indicators.json`, `articles[]` existují v `data/articles.json`,
  žádné osiřelé uzly (uzel bez hrany), graf bez self-loops, JSON parsovatelný
  (pozor na české uvozovky — traps.md §1). Zapojit do `validate:all`.
- Testy (`tests/system-model.test.js`): pure helpery exportované
  z `src/system-model.js` — `downstreamOf(nodeId, edges)` (BFS),
  `edgesFor(nodeId)`, `layerNodes(layer)`; konzistence datasetu
  (každý uzel má aspoň 1 indikátor nebo článek).
- Vizuální verifikace: net-new UI → Playwright screenshot +
  `test:a11y` axe scan stránky.

## 5) Co tento plán NEDĚLÁ

- Žádný layout algoritmus (d3/force) — souřadnice jsou kurátorská data
  (decisions-log: žádné D3).
- Žádná LLM „AI query" vrstva — „dotazování" je deterministický průchod
  grafem; web zůstává bez API klíčů.
- Nemění obsah `jak-funguje.html` schémat (aktéři, leverage) — model je
  doplněk, ne náhrada.
- Nemění hodnoty indikátorů ani článků.

## 6) Fáze

| Fáze | Obsah |
|---|---|
| A | Syntéza obsahu grafu (fan-out čtení korpusu po doménách → nodes+edges) |
| B | `data/system-model.json` + validátor + testy datasetu |
| C | `model-systemu.html` + `src/system-model.js` + CSS + build:css |
| D | Menu, sitemap, SEO, cross-linky, a11y/vizuální verifikace |

*Generated by Claude Code.*
