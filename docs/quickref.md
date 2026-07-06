# Quick Reference — HSPA Monitor

Jednostránkový cheatsheet pro rychlou orientaci. Pro hloubku viz
[`data-model.md`](data-model.md), [`site-architecture.md`](site-architecture.md),
[`visual-components.md`](visual-components.md).

---

## Kde co je

| Co | Kde |
|---|---|
| Aktivní kód | `05_M1_Starter/` (vše ostatní = staré podklady) |
| HTML stránky | `05_M1_Starter/*.html` (hub) + `05_M1_Starter/clanek-*.html` (75+ článků) |
| JS moduly | `05_M1_Starter/src/*.js` |
| CSS | `05_M1_Starter/src/styles.css` (~9 400 řádků) |
| Data | `05_M1_Starter/data/*.json` |
| Metodické karty indikátorů | `05_M1_Starter/indicators/{slug}.json` |
| Cover obrázky článků | `05_M1_Starter/assets/covers/clanek-*.{svg,png}` |
| Social bannery | `05_M1_Starter/assets/social/` |
| ETL/ingest | `05_M1_Starter/ingest/` |
| Skripty | `05_M1_Starter/scripts/` |
| Testy | `05_M1_Starter/tests/` (~355 testů) |
| Dokumentace pro vývojáře | `docs/` (root level) |

---

## Klíčové příkazy

```bash
cd 05_M1_Starter

# Setup
npm install

# Server
npm run serve                    # http://localhost:8080

# Validace
npm run validate:all             # všech 9 validátorů (indicators, strategies, explainers, prevention, articles, dohodovaci, legislation, financing, clinical-quality)

# Testy
npm test                         # ~355 testů (349 passing, 6 pre-existing failures z chybějících npm packages)

# Article cover (po novém článku/refreshi)
node ingest/scripts/generate-article-cover.js <slug-without-html>
node ingest/scripts/generate-article-cover.js --all

# Launch banner pro social
node scripts/generate-launch-banner.js
```

---

## Git workflow

```bash
# Vždy ze stavu remote main
git checkout main && git pull origin main

# Branch konvence
git checkout -b claude/<descriptive-feature-name>

# Commit
git add -A && git commit -m "..."

# Push + PR (vždy PR, ne přímý push do main)
git push -u origin claude/<branch-name>
# Pak vytvořit PR přes MCP github tools nebo gh CLI
```

**Konvence commit prefixů**: `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):` (česky tělo zprávy).

---

## Žargon / pojmy

| Zkratka | Význam |
|---|---|
| HSPA | Health System Performance Assessment (OECD/MZ ČR 2023) |
| ÚZIS | Ústav zdravotnických informací a statistiky (primární CZ data) |
| KZP | Kancelář zdravotního pojištění (claims data) |
| NIKEZ | Národní institut kvality a excelence zdravotnictví |
| INDIKO | Portál indikátorů kvality péče (FBMI ČVUT) |
| PUK | Portál ukazatelů kvality (KZP) |
| OECD HAaG | OECD Health at a Glance (mezinárodní benchmark) |
| AV | Article Visuals designsystem (`.av-*` CSS classes) |

---

## CSS namespace mapa

| Prefix | Účel | Stránky/komponenty |
|---|---|---|
| `.av-*` | Article Visuals (counter, bar, timeline, flow) | clanek-*.html |
| `.fn-*` | Financování (Sankey, hero stats) | financovani.html, financovani-poskytovatele.html |
| `.ed-*` | Editorial layout (hero, narrative, hub) | index.html, clanky.html, hub stránky |
| `.related-*` | „Příbuzné sekce" (cross-link cards) | všechny stránky kromě homepage |
| `.module-tab*` | Top nav + submenu | všude (renderuje page-shared.js) |
| `.narok-svg-figure` | Custom decision tree / Venn / scissor SVGs | série Nárok pojištěnce |
| `.clinical-*` | (plánováno) clinical-quality vizuálky | kvalita-pece.html |
| `.timeline-*` | Časová osa (HSPA, projekt) | o-projektu.html |

---

## Datový kontrakt — klíčová pole

### `data/indicators.json` (80 indikátorů)

Required: `id`, `name`, `area`, `domain`, `value`, `unit`, `year`, `signal`, `direction`, `source`, `method_card_url`.

```json
{
  "id": "nadeje_doziti_total",
  "area": "Výsledky | Výstupy | Procesy | Struktury",
  "dimension": "zdravi | kvalita | efektivita | spravedlnost",
  "direction": "lower_is_better | higher_is_better | context_dependent",
  "signal": "good | warn | bad | neutral",
  "source": { "name": "...", "url": "...", "fetched_at": "...", "origin": "seed | live" }
}
```

### `data/articles.json` (78 článků)

Required: `id`, `slug`, `number`, `tag`, `date`, `title`, `perex`, `linked_indicators`, `topics`.
Optional: `published: false` (draft), `audit: {...}`, `topical_until`, `ready_since`, `scheduled_for`.

### `data/strategies.json` schema (validate-strategies.js)

Required: `id`, `title`, `level`, `scope`, `status`, `owner`, `tldr_public`.
Valid `scope`: `framework | program | action_plan | strategy | guideline` (ne `institutional`!).
Valid `status`: `active | proposed | obsolete | revision_due`.

### `data/explainers.json` schema

Required: `id`, `title`, `category`, `tldr_public`, `tldr_expert`, `tldr_policy`.
Valid `category`: `money | classification | actors | process | inspiration`.

---

## „I need to..." Quick links

| Úkol | Detail |
|---|---|
| Přidat nový indikátor | [workflows.md § Nový indikátor](workflows.md#nový-indikátor) |
| Přidat nový článek | [workflows.md § Nový článek](workflows.md#nový-článek) |
| Přidat strategii / explainer | [workflows.md § Nová strategie / explainer](workflows.md#nová-strategie--explainer) |
| Přidat vizuál do článku | [visual-components.md](visual-components.md) |
| Změnit menu / nav | [workflows.md § Změna menu](workflows.md#změna-menu) |
| Vygenerovat covery | [workflows.md § Cover obrázek](workflows.md#cover-obrázek) |
| Implementovat scrapper | [workflows.md § Nový fetcher](workflows.md#nový-fetcher) |
| Pravidla audit-status | [conventions.md § Audit lifecycle](conventions.md#audit-lifecycle) |
| Past, kterým se vyhnout | [traps.md](traps.md) |
| Recent decisions (nedělat znovu) | [decisions-log.md](decisions-log.md) |

---

## Stavová matice (aktuální)

| Položka | Stav | Detail |
|---|---|---|
| Persona switcher (Veřejnost/Odborník/Politik) | **ODSTRANĚN** (PR #402) | Nevracet! |
| Score widget v hlavičce | **ODSTRANĚN** (PR #402) | Nevracet! |
| GA4 (G-DVH1RPVTM4) | aktivní | `analytics_storage: 'granted'`, reklamní denied |
| Vercel Analytics | aktivní (paralelně s GA4) | bezcookieové |
| Editorial dot před „Články" | aktivní | `.module-tab-editorial` |
| Submenu architektura | **plánováno** | PLAN-KVALITA-PECE.md Fáze 0 → PR-1 |
| Stránka Kvalita péče | **plánováno** | PLAN-KVALITA-PECE.md |
| Souhlas KZP (PUK data) | ✅ získán | scraping povolen |
| Souhlas FBMI ČVUT (INDIKO) | ✅ získán | scraping povolen |

---

## Soubory pro ignorování při hledání

- `ingest/cache/` — gitignored raw odpovědi
- `node_modules/`
- `*.lock`
- `data/snapshot-*.json` — denní snapshoty historie
- `discovery/` — daily routine outputs
- `tests/__snapshots__/` (pokud existuje)
