# Conventions — HSPA Monitor

Editorial + code konvence, které musí být dodržené napříč repo. Doplňuje `CLAUDE.md`.

---

## Audit lifecycle

Každý článek má v `<meta name="article:audit-status">` jeden ze čtyř stavů:

| Status | Význam | Banner v UI |
|---|---|---|
| `draft` | Nový/rozpracovaný | NE (`published: false`) |
| `review-pending` | Publikován, čeká na detailní review | ANO (žlutý ne-blokující banner) |
| `partial` | Publikován s vědomím otevřených bodů | ANO (varování) |
| `verified` | Plně ověřen redakcí | NE |
| `flagged` | Nalezený problém — blokující | NE (jen v `published: false`) |
| `draft-flagged` | Draft s otevřenými problémy | NE |

### Pravidla `validate-articles.js`

1. `audit-status: draft|flagged|draft-flagged` MUSÍ mít `published: false`.
2. V `<header class="article-header">` NESMÍ být:
   - Inline `<p style="background:#fff7e6...">` s „Status:"
   - Texty „pracovní draft", „auditní revizi", „TODO", „XXX", „FIXME"
3. `<aside class="article-review-banner">` v publikovaném článku → fail.
   V draftu (`published: false`) je tolerován jako varování.

### Životní cyklus

1. **Draft** — `clanek-{slug}.html` + záznam v `articles.json` s `published: false`. Viditelný jen v `redakce.html`.
2. **Audit** — detailní změny v `<!-- HTML komentáři -->` na začátku souboru. NIKDY ne ve viditelném textu.
3. **Schválení** — `audit-status` → `verified` (nebo `review-pending` / `partial`). `published: true` + finální `date`.
4. **Release** — o 06:00 lokálního času na `date` se článek zviditelní napříč webem (homepage hero, hub, indikátor detail).

### Audit metadata v HTML komentáři

```html
<!--
  audit:
    last_reviewed: 2026-05-27
    reviewer: claude-code-agent
    status: review-pending
    unverified_claims_removed: 0
    primary_sources_added: 5
    visual_elements_added: 1
    notes: "Volný formát Markdown-like text. Detail změn, opravy,
            otevřené otázky pro ruční audit."
-->
```

Klíč `notes` přidává nový záznam vždy s prefixem `OPRAVA YYYY-MM-DD:` aby šlo dohledat historii.

---

## HSPA framework taxonomie

Každý indikátor má dvě klasifikace:

### Area (čtyři oblasti)

| Area | Popis |
|---|---|
| `Výsledky` | Co se stalo s pacientem (mortalita, přežití, kvalita života) |
| `Výstupy` | Co systém vyprodukoval (hospitalizace, výkony) |
| `Procesy` | Jak se péče poskytuje (čekací doby, koordinace, kvalita preskripce) |
| `Struktury` | Co máme k dispozici (lůžka, lékaři, financování) |

### Dimension (čtyři dimenze kvality)

| Dimension | Popis |
|---|---|
| `zdravi` | Zdravotní stav, mortalita, dispozice |
| `kvalita` | Klinická efektivita, bezpečnost, evidence-based |
| `efektivita` | Hospodárnost, využití kapacit, allokativní efektivita |
| `spravedlnost` | Rovnost přístupu (regionální, sociální, věkové) |

### Direction

| Direction | Význam |
|---|---|
| `lower_is_better` | Nižší hodnota = lepší (mortalita, čekací doby) |
| `higher_is_better` | Vyšší hodnota = lepší (proočkovanost, přežití) |
| `context_dependent` | Záleží na kontextu (např. počet hospitalizací — nárůst může znamenat lepší dostupnost i selhání ambulantní péče) |

### Signal (výsledné hodnocení)

Vypočítává `computeSignal(value, benchmark, direction, thresholds)` v `src/site-stats.js`:

```javascript
// thresholds: { good: 2, warn: 5 }  (v %)
// good:    adjusted diff > +good %
// warn:    -warn % ≤ adjusted diff ≤ +good %
// bad:     adjusted diff < -warn %
// neutral: chybí benchmark nebo direction = context_dependent
```

---

## Source attribution

Každé tvrzení v článku NEBO indikátoru musí mít explicitní zdroj. Pravidla:

### Indikátor v `data/indicators.json`

```json
"source": {
  "name": "OECD Health at a Glance 2025",
  "url": "https://www.oecd.org/...",
  "fetched_at": "2026-05-25T06:00:00Z",
  "origin": "seed | live"
}
```

- `origin: seed` = ručně zadáno, statická hodnota
- `origin: live` = z ingest pipeline (cron refresh)

### Metodická karta `indicators/{id}.json`

```json
"data_source": {
  "primary": { "type": "uzis_nrh", "dataset": "...", "note": "..." },
  "fallback": { "type": "oecd", "code": "..." }
}
```

### Článek (HTML)

V `<section class="article-sources">` minimálně:
- Primární data (ÚZIS, ČSÚ, OECD, Eurostat, SÚKL...)
- Metodika (zákony, vyhlášky, OECD HCQO definice)
- Mezinárodní inspirace (pokud relevantní)

Žádné tvrzení v textu bez odkazu na primární zdroj.

### Scraped data

Pokud data scrapnuté (např. plánované PUK, INDIKO), v UI **viditelný disclaimer**:

> Data získána scrapingem veřejně dostupných stránek, protože zdroj nepublikuje strojově čitelný API endpoint. Re-publikováno s písemným souhlasem provozovatele.

V `data/{source}-scraping-log.json` auditní stopa každého běhu.

---

## Publikační hygiena

### Co NESMÍ být v publikovaném článku

(Z `validate-articles.js`):

1. Audit-status `draft | flagged | draft-flagged` v HTML metadata + `published: true`.
2. `<aside class="article-review-banner">`.
3. Inline „Status:" bannery s background-warning barvou.
4. Texty „pracovní draft", „auditní revizi", „TODO", „XXX", „FIXME" v hlavičce.
5. `lorem ipsum` placeholders.

### Pravidlo „v 6:00 ráno"

`isArticleVisible(article)` v `src/page-shared.js`:

- `published === false` → vždy skrytý.
- `date` v budoucnu → skrytý.
- `date` dnes, ale před 06:00 lokálního času → skrytý.
- `date` v minulosti / dnes po 06:00 → viditelný.

Cron 04:00 UTC promotuje 1 draft na publikovaný den; o 06:00 lokálního času (≈ 04:00 UTC v ČR) se článek objeví napříč webem.

### Publikační fronta

`scripts/publish-scheduled.js` vybírá 1 článek denně:

1. **`topical_until`** (nejbližší datum) — aktualita má přednost.
2. **`ready_since`** (nejstarší) — fronta připravených.
3. `scheduled_for` = „ne dřív než".
4. Tie-break: `ready_since` → `scheduled_for` → `slug`.

---

## Code conventions

### CSS

- Namespace prefixy povinné — viz [`quickref.md` § CSS namespace mapa](quickref.md#css-namespace-mapa).
- Žádné inline styly v JS-renderovaných šablonách (kromě nutných transform/opacity pro animace).
- `@media (prefers-reduced-motion: reduce)` musí být u každé animace.
- Dark mode zatím neexistuje (žádný `prefers-color-scheme` blok ani přepínač) — pokud ho budeš přidávat, jde o vědomé designové rozhodnutí: postavit na CSS proměnných v `:root` a převést „paper" paletu na noční inkoust, ne čistou čerň.

### JS

- ES modules (`import`/`export`), ne CommonJS.
- Žádné runtime dependencies kromě CDN-loaded Chart.js (jen na stránkách, které ho potřebují).
- Hardcoded data → JSON v `data/*.json`, ne v JS.
- `console.error` jen pro skutečné chyby, ne pro debug.

### HTML

- `<link rel="stylesheet" href="src/styles.css">` (relativní, ne `../src/...`).
- `<script type="module" src="src/{slug}.js"></script>` na konci `<body>`.
- `<meta>` tagy povinné: `description`, `og:type`, `og:title`, `og:description`, `og:image`, `article:published_time`, `article:section`, `article:audit-status`.
- Lang attribute: `<html lang="cs">`.

### JSON

- 2 spaces indent.
- Žádné trailing commas.
- České uvozovky `„"` JSOU povoleny v string values (NE jako struktura JSON syntaxe).
- **TRAP**: pokud máš v `notes` string s českými uvozovkami obsahujícími anglické `"`, musíš je escapovat `\"` nebo přeformulovat. Validátory selhávají s `Expected ',' or '}'`.

---

## Citace a interní odkazy

### Mezi články

```html
<a href="clanek-{slug}.html">Smysluplný anchor text</a>
```

Nikdy „článek 19/20/21", „článek autora" apod. — vždy konkrétní téma článku.

### Na indikátor

```html
<a href="indicator.html?id={indicator-id}"><strong>Název indikátoru</strong></a>
```

### Na strategii / explainer

```html
<a href="strategie.html?id={strategy-id}">Název strategie</a>
<a href="jak-funguje.html#{explainer-id}">Název explaineru</a>
```

### Na primární zdroj

```html
<a href="https://..." target="_blank" rel="noopener">Stručný popis ↗</a>
```

Externí odkazy vždy s `target="_blank" rel="noopener"` a šipkou „↗".

---

## Bezpečnostní pravidla

- Všechna data agregovaná — žádné PII, žádná data per-pacient.
- `User-Agent: ZdraveCesko-HSPA/1.0` ve všech HTTP požadavcích (fetchery).
- Cron nejvýše 1× denně (rate limit ÚZIS, OECD, Eurostat); datový refresh běží týdně (pondělí 06:00 UTC) — zdroje publikují ročně až čtvrtletně.
- Žádné API klíče v kódu — vše veřejné endpoints.
- `.env` v gitignore, žádné secrets v commitu.

---

## Disclaimer „AI píše"

Každý článek má v top sekci AI disclaimer (renderuje `src/clanky.js` → `injectAiDisclaimer()`):

- Hub `clanky.html` → prominentní karta nad „Doporučujeme — Začněte tady"
- Článkové stránky → kompaktní pásek pod breadcrumbem

Tón: transparent („Tento článek nepíše člověk"), legrační („Já — Claude od Anthropicu — z čerstvého datového balíčku"), ale serious ohledně možných chyb („pod každou statistikou najdete odkaz na primární zdroj").

NEMĚNIT bez explicitního souhlasu (zásadní transparency commitment projektu).
