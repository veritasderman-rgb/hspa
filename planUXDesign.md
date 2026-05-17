# Plán UX vylepšení HSPA Monitoru

> Implementační + testovací roadmapa pro UX redesign.
> Vytvořeno: 17. 5. 2026 · Sessions: claude-opus-4-7

---

## 📋 Předpoklady (před zahájením)

### Testovací infrastruktura — investice 1× pro celý projekt

Aktuálně máme `node:test` (220 unit testů). Pro UX změny potřebujeme **3 nové vrstvy**:

#### 1. Visual regression testing — Playwright (~3 h setup)
```bash
npm i -D @playwright/test
npx playwright install --with-deps chromium webkit
```
Soubor `tests/visual.spec.js` — pro každou stránku screenshot per viewport (375 / 768 / 1280px). Baseline commitnuto, PR diffy automaticky.

#### 2. Accessibility audit — axe-core (~1 h setup)
```bash
npm i -D @axe-core/playwright
```
V Playwrightu spustit `AxeBuilder.analyze()` na každé stránce. Reportovat WCAG 2.1 AA violations.

#### 3. CI workflow `.github/workflows/visual-a11y.yml`
- Trigger: `pull_request`
- Spustit `npm run serve &` + Playwright + axe
- Upload artifacts: screenshots, axe report
- Fail PR pokud nový critical/serious violation

**Bez této vrstvy nejde rozumně testovat UI. Sprint 1 začíná tímto.**

---

## 🚀 SPRINT 1 — Top 3 priority (cca 5 dní)

### Úkol 1.1 — Mobile audit + responsive fixes

**Cíl**: každá stránka funkční na 360px / 414px / 768px bez horizontal scroll, kliknutelných cílů ≥44px, čitelného textu ≥14px.

#### Sub-tasky
1. **Spustit Playwright screenshots přes 6 stránek × 3 viewporty** = 18 screenshots → vytvořit `audit/mobile-baseline-YYYY-MM-DD.md` se seznamem nálezů
2. **Identifikovat top 5 zlomených komponent** (typicky `.hub-matrix-grid` 8 dlaždic, `.scorecard` 5 tiles, `.topic-filters` 9 chips, `.finance-tiles`, `.regions-table`)
3. **Fix per komponentu** — pro každou:
   - `clanky.html` matrix → na <600px `grid-template-columns: 1fr 1fr` (4×2)
   - `index.html` scorecard → na <500px stack 2+2+1
   - `clanky.html` topic-filters → overflow-x scroll s indikátorem
   - Finance tiles → na <600px 1 sloupec
   - Regions table → již má `overflow-x: auto`? Verifikovat
4. **Sticky topbar** — ověřit, že na mobilu nezakrývá content; přidat `padding-top: var(--topbar-h)` na `main`
5. **Touch targets** — všechny `<button>`, `<a>` v navigation min 44×44px (Apple HIG), 48×48px (Material)
6. **Text scaling** — `text-size-adjust: 100%` na `html` (proti iOS auto-zoom)

#### Soubory
- `05_M1_Starter/src/styles.css` (přidat / upravit `@media (max-width: 600px)` bloky)
- `05_M1_Starter/clanky.html`, `index.html`, `hspa-prehled.html`, případně další pokud markup vyžaduje úpravu
- `tests/visual.spec.js` — přidat mobile snapshots

#### Test plan
- **Visual regression**: per komponenta před/po screenshot diff (toleranci ~1 %)
- **Accessibility**: axe nesmí přidat novou violation
- **Manual smoke**: iPhone SE (375×667), iPhone 14 Pro (393×852), iPad mini (768×1024) v BrowserStack nebo Chrome DevTools device mode
- **Performance**: Lighthouse mobile score ≥ 90 (current baseline TBD)
- **Network**: na slow 3G (Chrome throttling) musí být FCP ≤ 3s, LCP ≤ 4s

#### Akceptační kritéria
- [ ] Žádný horizontal scroll na 360–768px
- [ ] Všechny interaktivní cíle ≥44px
- [ ] Lighthouse mobile score ≥90
- [ ] axe: 0 critical, 0 serious violations
- [ ] Visual regression: schválené diffy, baseline updated

#### Odhad: **2 dny** (1 audit + 1 fixes + 0.5 test)
#### Rizika: Některé komponenty (donut chart, regions chart) mohou vyžadovat hlubší refactor Chart.js options

---

### Úkol 1.2 — Hero index.html simplify

**Cíl**: redukovat above-fold elements z 5+ kompetujících na 1 jasný hook + 2 supporting.

#### Sub-tasky
1. **Definovat „dnes hlavní příběh"** — buď manuálně přes `data/hero-pick.json`, nebo automaticky = nejnovější článek se signal=`bad` nebo highest-impact KPI
2. **Refactor `.ed-hero`**:
   - Headline (1 věta, varianty per měsíc)
   - 1 large hero number (např. „32 % víc Čechů umírá na KVN než průměr OECD") s odkazem na článek/indikátor
   - 1 řádek score chip („HSPA Monitor: 64/100 · 80 indikátorů")
   - CTA: „Prozkoumat dashboard ↓" + „Přečíst dnešní článek →"
3. **Přesunout pod fold**:
   - 4 ed-stat cards → samostatná sekce „Klíčové ukazatele" mezi hero a narrative
   - Score explain odstavec → tooltip na hover nad „64/100"
   - 4-step narrative → ponechat, ale snížit visual weight (menší typography)
4. **AI disclaimer** → pošoupnout pod hero do menší podoby (jen 1 line + „Více →")
5. **A/B test variant** (volitelné, pokud chceš empirický důkaz) — analytics event na CTR z hero

#### Soubory
- `index.html` (přerovnat sekce)
- `src/app.js` (`renderEditorialHero` refactor — méně picks)
- `src/styles.css` (`.ed-hero` redesign)
- Nové: `data/hero-pick.json` (volitelné, manual curation)

#### Test plan
- **A/B**: před/po Playwright screenshot na 1280px + 375px
- **Click heatmap** (simulace): kde uživatel asi klikne, je tam CTA?
- **Performance**: méně elements = lepší LCP (měřit Lighthouse before/after)
- **Acceptance review**: ukázat 3 lidem, požádat, aby řekli „co je tady hlavní?". Pokud 2/3 řeknou dnešní příběh, success.

#### Akceptační kritéria
- [ ] Above-fold (1024×768) obsahuje: headline + hero number + 1 CTA. Nic víc.
- [ ] LCP ≤ 2.5s (Lighthouse desktop)
- [ ] CLS ≤ 0.1
- [ ] Visual regression: nový baseline schválen

#### Odhad: **1.5 dne**
#### Rizika: subjektivita „co je dnes hlavní" — pokud manuální, vyžaduje denní práci; pokud automatické, riziko že vybere špatný článek

---

### Úkol 1.3 — Reading progress + TOC v dlouhých článcích

**Cíl**: u článků >5 minut zobrazit progress bar + sticky TOC s aktivní sekcí.

#### Sub-tasky
1. **Komponenta `.article-progress`** — sticky element na top, šířka 0→100 % podle scroll position v `.article-body`
2. **TOC generování** — JS skener `.article-body h3` → build seznam {text, id, offset}. Inject `<aside class="article-toc">` na desktop (sticky left), accordion na mobile
3. **Active section highlighting** — IntersectionObserver na h3, nastav `aria-current` na odpovídající TOC link
4. **„Skoč na" smooth scroll** s offset pro sticky topbar
5. **Anchor IDs** — všechny h3 v článcích musí mít stable ID (zatím chybí — generovat slug z textu)
6. **Reading time** — už existuje (`article-meta-time`), ale doplnit % progress hover („právě čteš sekci 3 z 7")

#### Soubory
- `src/article-visuals.js` (nebo nový `src/article-toc.js`)
- `src/clanky.js` (volá enhanceArticleVisuals — tam přidat TOC init)
- `src/styles.css` (`.article-progress`, `.article-toc`)
- Žádná změna v `.html` souborech (auto-detect z DOM)

#### Test plan
- **Unit**: `tests/article-toc.test.js` — generování TOC z DOM, slug generation
- **Visual**: screenshot dlouhého článku desktop + mobile
- **Manual scroll test**: TOC se aktualizuje na správnou sekci, progress bar postupuje plynule
- **Keyboard**: Tab na TOC link, Enter → scroll
- **Reduced motion**: progress + scroll bez animace

#### Akceptační kritéria
- [ ] Články ≥5 min mají TOC + progress
- [ ] Active section správně highlighted s ±5 % chybou na scroll
- [ ] Keyboard navigable
- [ ] Žádný layout shift při sticky aktivaci
- [ ] axe: 0 nových violations

#### Odhad: **2 dny**
#### Rizika: anchor IDs konflikty (pokud již někde existují), výkon na 50+ článcích s velkým DOM

---

## 🛠 SPRINT 2 — Strukturální (cca 5 dní)

### Úkol 2.1 — Single source of truth pro čísla

**Cíl**: žádný hardcoded count na `.html` stránce.

#### Sub-tasky
1. **Vytvořit `src/site-stats.js`** — funkce `getSiteStats(articles, indicators)` vrátí `{articleCount, hspaCount, monitoringCount, totalIndicators, frameworkTotal: 122, score}`
2. **Skóre computation** — z `indicators.json` (good=100, warn=50, bad=0, neutral=excluded) → ceil průměr
3. **HTML elementy s `data-stat="X"`** — JS auto-binds (např. `<span data-stat="hspaCount">71</span>` se přepíše)
4. **Build-time snapshot fallback** — pre-generovat `data/site-stats.json` v ingest pipeline, pro SEO meta tagů a graceful fallback
5. **Aktualizovat 4 stránky** (`index`, `o-projektu`, `tematicke-linie`, `hspa-prehled`) — nahradit hardcoded čísla `data-stat` atributy
6. **Tests**: `tests/site-stats.test.js` — assertions na výpočet skóre, edge cases (empty arrays, missing benchmarks)

#### Soubory
- Nový `src/site-stats.js`
- Nový `data/site-stats.json` (generovaný)
- 4 HTML soubory (replace hardcoded → `data-stat`)
- `src/app.js`, `src/clanky.js`, `src/hspa-prehled.js` (import + apply)
- `tests/site-stats.test.js`

#### Test plan
- **Unit**: výpočet skóre proti známé testovací sadě indikátorů
- **Integration**: na všech 4 stránkách kontrola, že `data-stat` elementy se aktualizují
- **Edge**: prázdný indicators.json → graceful (zobrazí „—")
- **Snapshot**: build-time vs runtime hodnoty shoda

#### Akceptační kritéria
- [ ] Žádný `grep -E "80 indikátorů|71 striktních"` hit v `.html` (vše dynamicky)
- [ ] Při změně `indicators.json` se UI aktualizuje bez code change
- [ ] Skóre se počítá deterministicky (test passes)

#### Odhad: **2 dny**
#### Rizika: pre-render snapshot může být stale (mitigation: regenerovat při deploy)

---

### Úkol 2.2 — Taxonomy unification

**Cíl**: snížit 4 paralelní klasifikace na 2 (primární + sekundární) s jasnými barvami/ikonami.

#### Sub-tasky
1. **UX rozhodnutí** (workshop / AskUserQuestion):
   - Primární osa: **6 HSPA dimenzí** (Zdraví, Dostupnost, Kvalita, Bezpečnost, Efektivita, Spravedlnost) — protože odpovídá oficiálnímu rámci
   - Sekundární osa: **4 oblasti** (Výsledky, Výstupy, Procesy, Struktury) — pro power user
   - 8 topic chips v `clanky.html` → re-mapovat na 6 dimenzí
   - 12 OECD domén v hspa-prehled matrix → uvádět jako „Příloha D rámce", ne navigační prvek
2. **Vizuální systém** — 6 dimenzí dostanou 6 barev (z `dimensions.json` `color` field), reusable variable `--dim-color`
3. **Refaktor 8 → 6 chip** v `clanky.html` — manuální mapping topics na dimenze, fallback na „Ostatní"
4. **Hover tooltips** — vysvětlit, co dimenze znamená
5. **Documentation page** `taxonomie.html` (nebo sekce v `o-projektu.html`) vysvětlující systém

#### Soubory
- `data/dimensions.json` (ověřit aktuálnost)
- `clanky.html` (chip taxonomy update)
- `data/articles.json` (re-mapovat `topics` → `dimensions`)
- `src/clanky.js`, `src/app.js` (filter logika)
- `src/styles.css` (sjednotit barvy)

#### Test plan
- **User testing** (5 uživatelů): „Najdi mi článek o dostupnosti péče" — měřit cestu kliknutí
- **Coverage**: každý článek má alespoň 1 primární dimenzi přiřazenou
- **Visual**: hub matrix + filter chips před/po
- **Backward compat**: staré URL hash `#topic=legislativa` redirect na `#dim=...`

#### Akceptační kritéria
- [ ] Jeden taxonomický systém viditelný v UI (6 dimenzí)
- [ ] Všechny články mají dimenzi
- [ ] User test: 4/5 lidí najde článek do 3 kliknutí

#### Odhad: **1.5 dne**
#### Rizika: vyžaduje UX rozhodnutí (kterou osu primární), může vyžadovat data migraci

---

### Úkol 2.3 — Dynamic score calculation

**Cíl**: `scoreExplainVal` se počítá z `indicators.json`, ne hardcoded „64".

#### Sub-tasky
1. **Score formula** v `src/site-stats.js`:
   ```js
   function computeScore(indicators) {
     const scored = indicators.filter(i => ['good','warn','bad'].includes(i.signal));
     if (!scored.length) return null;
     const sum = scored.reduce((acc, i) => acc + (i.signal === 'good' ? 100 : i.signal === 'warn' ? 50 : 0), 0);
     return Math.round(sum / scored.length);
   }
   ```
2. **Breakdown tooltip** — hover nad „64/100" zobrazí 80 (good) / 50 (warn) / 0 (bad) counts + formula
3. **Skoré per dimenze** — `renderDimensionsIndex` už počítá, ale standardizovat formulu (DRY)
4. **Historický kontext** — pokud máme snapshoty, ukázat „před měsícem 62, dnes 64 ↑"

#### Soubory
- `src/site-stats.js` (compute fn)
- `src/app.js` (use it)
- `index.html` (no hardcode)

#### Test plan
- **Unit**: known input → known output
- **Integration**: skóre na stránce shoduje s ručním výpočtem z `indicators.json`
- **Edge**: 0 scored indicators → null + UI shows „—"

#### Akceptační kritéria
- [ ] Skóre se mění při změně indikátorů
- [ ] Tooltip s breakdown funkční
- [ ] Žádný hardcoded „64" nikde

#### Odhad: **1 den**

---

## 🌟 SPRINT 3 — Polish (cca 5 dní)

### Úkol 3.1 — Site-wide search (`/` shortcut)

**Cíl**: keyboard shortcut `/` otevře search overlay, indexuje články + indikátory + glossary.

#### Sub-tasky
1. **Build index** — `src/search-index.js`: kombinuje titles z `articles.json` + `name` z `indicators.json` + `key+full` z `glossary.json` → flat array `{id, type, label, url, weight}`
2. **Search engine** — `fuse.js` (lightweight, fuzzy) nebo vlastní substring match
3. **UI overlay** — modal s search input + 3 sekce (Články / Indikátory / Glossary), navigovatelný Arrow + Enter
4. **Keyboard shortcut** — `/` (Discord style), `Cmd+K` / `Ctrl+K` (universal)
5. **Empty state** — pokud nic, „Nic nenalezeno. Hledat na webu Google →"
6. **Recent searches** — localStorage

#### Soubory
- Nový `src/search.js`
- Nový `src/search-overlay.html` (template)
- `src/styles.css` (modal styles)
- `index.html`, ostatní HTML (nový `<button>` v `module-nav` + keyboard listener globally)

#### Test plan
- **Unit**: search ranking na typické queries
- **Manual**: 10 different queries, ověřit relevant results in top 3
- **Keyboard**: `/`, `Cmd+K`, Esc, Arrow, Enter all work
- **Mobile**: tap na search ikonu otevírá nativní fullscreen modal

#### Akceptační kritéria
- [ ] `/` otevírá overlay
- [ ] Query „AMI" vrátí indikátor + článek o AMI
- [ ] Query „pohotovost" vrátí článek + glossary LPS

#### Odhad: **2 dny**

---

### Úkol 3.2 — Glossary inline tooltips

**Cíl**: první výskyt termínu v článku má hover tooltip s definicí + link na glossary.

#### Sub-tasky
1. **Auto-detection** — `src/glossary-inline.js` skenuje `.article-body` p, h3 textNodes, hledá termíny z `glossary.json` (case-sensitive, word boundary)
2. **Wrap first occurrence** v `<abbr class="gloss-term" data-key="..." title="krátká def">...</abbr>`
3. **Tooltip styling** — CSS `:hover` shows native title; pro lepší UX přidat custom tooltip s tlačítkem „Přečíst víc →"
4. **Mobile tap** — tap na term otevře bottomsheet nebo small popover
5. **Performance** — index by length DESC (longest first) aby „NIS2" nebyl v „NIS" zachycen

#### Soubory
- Nový `src/glossary-inline.js`
- `src/styles.css` (`.gloss-term`)
- `src/clanky.js` (call after article render)
- `tests/glossary-inline.test.js`

#### Test plan
- **Unit**: detekce „NIS2" před „NIS"; první výskyt zachycen, další ne; case sensitivity správně
- **Visual**: tooltip na hover (desktop), tap (mobile)
- **A11y**: `<abbr>` semantic OK, keyboard focus zvýrazňuje term

#### Akceptační kritéria
- [ ] Termín „NÚKIB" v článku má tooltip
- [ ] Druhý výskyt v stejném článku není tooltipovaný (avoid noise)
- [ ] Mobile tap funguje

#### Odhad: **1.5 dne**

---

### Úkol 3.3 — Error / empty states

**Cíl**: graceful degradation pro každý async fetch.

#### Sub-tasky
1. **Audit** všech `fetch(...)` v repo (`grep -rn "fetch(" src/`)
2. **Per fetch implementovat 3 stavy**: loading (skeleton), success (render), error (retry button + diagnostika)
3. **JS-disabled fallback** — `<noscript>` blocky s instrukcí povolit JS + statický odkaz na alternativu
4. **Timeout** — všechny fetche s 10s timeout
5. **404 page** — `404.html` vytvořit s návratovou navigací

#### Soubory
- Všechny `src/*.js` s `fetch`
- Nový `404.html`
- `src/styles.css` (`.error-state`)

#### Test plan
- **Manual**: vypnout síť v DevTools → každá stránka má error UI, ne nekonečný spinner
- **JS off** → základní content viditelný
- **404**: navštívit `/neexistuje.html` → 404 page

#### Akceptační kritéria
- [ ] Žádný „forever loading" stav
- [ ] 404 page funguje
- [ ] JS-disabled scénář ukazuje aspoň text content

#### Odhad: **1 den**

---

### Úkol 3.4 — „Behind the scenes" stránka

**Cíl**: vysvětlit metodiku — daily routine, audit, AI disclaimer — na jednom místě.

#### Sub-tasky
1. **Nová stránka `metodika.html`** (nebo sekce v `o-projektu.html`)
2. **5 fází routine** vizualizováno jako AV flow diagram
3. **Per fáze**: co se děje, kdo to dělá, jaký output, jak často
4. **Stats**: kolikrát byl audit spuštěn, kolik článků flagged, atd. (volitelné, pokud máme historii)
5. **Link z AI disclaimer** v `clanky.html` na tuto stránku

#### Soubory
- Nový `metodika.html` (nebo update `o-projektu.html`)
- `data/metodika-stats.json` (volitelné)

#### Test plan
- Manual readthrough, ověřit, že čtenář pochopí proces

#### Akceptační kritéria
- [ ] Stránka existuje a je linkovaná z 3+ míst
- [ ] Vysvětlení procesu srozumitelné laikovi

#### Odhad: **0.5 dne**

---

## 📊 Souhrn

| Sprint | Položky | Effort | Risk |
|---|---|---|---|
| 0 (předpoklady) | Testing infra (Playwright, axe, CI) | 0.5 dne | nízký |
| 1 | Mobile + Hero + Reading progress | 5.5 dne | středí (mobile fixes) |
| 2 | Single source + Taxonomy + Score | 4.5 dne | nízký |
| 3 | Search + Glossary inline + Errors + Behind | 5 dní | nízký |
| **Celkem** | | **~15.5 dne** | |

---

## 🎯 Doporučená sekvence

1. **Den 1**: Sprint 0 (testing infra) — bez tohoto nelze rozumně iterovat
2. **Dny 2–4**: Úkol 1.1 (mobile) — biggest impact
3. **Dny 5–6**: Úkol 1.2 (hero)
4. **Dny 7–8**: Úkol 1.3 (TOC)
5. **První PR review break** — sbírat feedback z reálných uživatelů
6. **Dny 9–13**: Sprint 2
7. **Dny 14–18**: Sprint 3

---

## 🔥 Minimum viable, pokud nemáš 15 dní

- **Minimum viable**: Sprint 0 + úkol 1.1 (mobile audit + 5 fixes) = **3 dny**
- **Solid improvement**: + úkoly 1.2, 1.3, 2.1 = **7 dní (1 týden)**
- **Comprehensive**: celý plán = **3 týdny**

---

## 🧠 Princip pro každý sprint

1. **Měřit před** — Lighthouse + axe baseline na main
2. **Implementovat** — feature branch, 1 PR per úkol
3. **Měřit po** — stejné metriky, srovnat
4. **Reviewovat** — Codex/Vercel preview, manual check
5. **Merge + monitor** — sledovat reálné metriky po pár dnech (pokud máme analytics)

---

## 📎 Závislosti a poznámky

- **Sprint 0 musí předcházet Sprintu 1** (jinak nejde A/B měřit změny)
- **Úkol 2.2 (taxonomy)** vyžaduje UX rozhodnutí — workshop nebo `AskUserQuestion` o tom, která osa bude primární
- **Úkol 3.1 (search)** může vyžadovat přidat external knihovnu (fuse.js) — zvážit vs. vanilla implementace
- **Pre-render snapshot** v Sprintu 2.1 vyžaduje integraci do ingest pipeline (`ingest/run.js`)

---

_Vytvořeno během iterace UX review HSPA Monitoru. Aktualizovat při změně rozsahu nebo dokončení sprintů._
