# Backlog — HSPA Monitor

> Sjednocený prioritizovaný backlog, který nahrazuje **`04_Plan_napojeni_na_API/CODEX_TASKS.md`** (archivováno) a integruje **`planUXDesign.md`** (Sprint 0–3).
>
> Vznikl 18. 5. 2026 jako odpověď na duplicitu mezi dvěma paralelními TODO listy. Cíl: jeden zdroj pravdy pro „co ještě udělat".

---

## Statusy

- 🔴 **CRITICAL** — blokátor důvěryhodnosti / a11y compliance
- 🟠 **HIGH** — vysoký dopad na UX nebo údržbu
- 🟡 **MEDIUM** — nice-to-have, dlouhodobý zisk
- 🔵 **LOW** — backlog / Q3+
- ✅ **DONE** — dokončeno, jen pro historii

---

## 🔴 CRITICAL (nejvyšší priorita)

### B-01 · Sprint 0: Testing infrastructure
**Z**: planUXDesign Sprint 0
**Effort**: 0.5 dne
**Co**: Playwright + axe-core + GitHub Actions visual-a11y workflow. Bez toho nelze rozumně testovat UI změny.
**Akceptační kritéria**:
- [ ] `npm i -D @playwright/test @axe-core/playwright`
- [ ] `tests/visual.spec.js` per stránku × 3 viewporty (375 / 768 / 1280)
- [ ] `.github/workflows/visual-a11y.yml` failuje na nový critical/serious axe violation
- [ ] Baseline screenshots commitnuté

### B-02 · Mobile audit + responsive fixes
**Z**: planUXDesign Sprint 1.1 + CODEX_TASKS Task D (Mobile-first refactor)
**Effort**: 2 dny
**Co**: každá stránka funkční na 360 / 414 / 768px, žádný horizontal scroll, touch targets ≥44px, text ≥14px.
**Klíčové komponenty k opravě**: `.hub-matrix-grid`, `.scorecard`, `.topic-filters`, `.finance-tiles`, `.regions-table`
**Akceptační kritéria**:
- [ ] Lighthouse mobile score ≥90
- [ ] axe: 0 critical, 0 serious
- [ ] Visual regression baseline approved
- [ ] Touch targets ≥44px (verify per `nav.module-nav`, `.topic-chip`, `.finance-tile`)

### B-03 · Accessibility audit + WCAG 2.1 AA
**Z**: CODEX_TASKS Task A + planUXDesign Sprint 1 (částečně)
**Effort**: 2 dny
**Co**: `axe-core/cli` → 0 violations; Lighthouse a11y ≥95; keyboard test (Tab, Enter, Escape); screen reader (VoiceOver/NVDA); kontrast 4.5:1.
**Akceptační kritéria**:
- [ ] `npx @axe-core/cli http://localhost:8080/` → 0 violations na všech stránkách
- [ ] Lighthouse a11y ≥ 95
- [ ] Tab projde dashboard bez focus trapu
- [ ] Modal trap focus + Escape close
- [ ] `prefers-reduced-motion` respektován (Chart.js + AV animations)

---

## 🟠 HIGH (vysoká priorita)

### B-04 · Hero index.html simplify
**Z**: planUXDesign Sprint 1.2
**Effort**: 1.5 dne
**Co**: above-fold redukce z 5+ kompetujících elementů na 1 hlavní + 2 supporting. Definovat „hlavní příběh" (manuálně nebo auto).
**Akceptační kritéria**:
- [ ] Above-fold (1024×768): headline + hero number + 1 CTA
- [ ] LCP ≤ 2.5s
- [ ] CLS ≤ 0.1
- [ ] User test (3 lidi): „co je tady hlavní?" — 2/3 odpovědí o dnešním tématu

### B-05 · Reading progress + TOC v dlouhých článcích
**Z**: planUXDesign Sprint 1.3
**Effort**: 2 dny
**Co**: progress bar nahoře + sticky TOC se sekcemi pro články >5 min. IntersectionObserver na h3.
**Akceptační kritéria**:
- [ ] Články ≥5 min mají TOC + progress
- [ ] Active section správně highlighted
- [ ] Keyboard navigable (Tab + Enter)
- [ ] Žádný layout shift při sticky aktivaci

### B-06 · Performance optimalizace + Core Web Vitals
**Z**: CODEX_TASKS Task B
**Effort**: 1 den
**Co**: Lighthouse Performance ≥95 mobile, LCP <2.5s, CLS <0.1; Chart.js lazy load; CSP `script-src 'self'`; total transfer <250 KB první load.
**Akceptační kritéria**:
- [ ] Lighthouse Performance ≥ 95 (mobile, Slow 4G)
- [ ] LCP < 2.5s, CLS < 0.1
- [ ] Chart.js stahuje se jen tam, kde je potřeba
- [ ] Total transfer size < 250 KB první load

### B-07 · Single source of truth pro čísla
**Z**: planUXDesign Sprint 2.1
**Effort**: 2 dny
**Co**: `src/site-stats.js` computed z `articles.json` + `indicators.json`. HTML elementy s `data-stat="X"` auto-bind. Žádný hardcoded count.
**Akceptační kritéria**:
- [ ] Žádný hardcoded „80 indikátorů" / „71 striktních" v `.html`
- [ ] Při změně `indicators.json` se UI aktualizuje bez code change
- [ ] Skóre se počítá deterministicky

### B-08 · Dynamic score calculation
**Z**: planUXDesign Sprint 2.3
**Effort**: 1 den
**Co**: `scoreExplainVal` na index.html se počítá z `indicators.json`, ne hardcoded „64". Breakdown tooltip s 80 (good) / 50 (warn) / 0 (bad) counts.
**Akceptační kritéria**:
- [ ] Skóre se mění při změně indikátorů
- [ ] Tooltip s breakdown funkční
- [ ] Žádný hardcoded „64" nikde

### B-09 · Taxonomy unification (4 → 2)
**Z**: planUXDesign Sprint 2.2
**Effort**: 1.5 dne
**Co**: snížit 4 paralelní klasifikace (topics, dimenze, oblasti, OECD domény) na 2 (primární = 6 HSPA dimenzí, sekundární = 4 oblasti). Vyžaduje **UX rozhodnutí** (workshop / AskUserQuestion).
**Akceptační kritéria**:
- [ ] Jeden taxonomický systém viditelný v UI
- [ ] Všechny články mají dimenzi
- [ ] User test (5 lidi): 4/5 najde článek do 3 kliknutí

---

## 🟡 MEDIUM (nice-to-have)

### B-10 · Site-wide search (`/` shortcut)
**Z**: planUXDesign Sprint 3.1
**Effort**: 2 dny
**Co**: keyboard shortcut `/` + `Cmd/Ctrl+K` otevře search overlay. Indexuje články + indikátory + glossary. Fuse.js nebo vanilla substring.
**Akceptační kritéria**:
- [ ] `/` otevírá overlay
- [ ] Query „AMI" vrátí indikátor + článek
- [ ] Mobile: tap na search ikonu

### B-11 · Glossary inline tooltips
**Z**: planUXDesign Sprint 3.2 + 06_Plan P2.1
**Effort**: 1.5 dne
**Co**: první výskyt termínu v článku má `<abbr>` s definicí + link na glossary. Auto-detect z `glossary.json` (110 termínů).
**Akceptační kritéria**:
- [ ] Termín „NÚKIB" v článku má tooltip
- [ ] Druhý výskyt v stejném článku není tooltipovaný
- [ ] Mobile tap funguje

### B-12 · Error / empty states
**Z**: planUXDesign Sprint 3.3
**Effort**: 1 den
**Co**: graceful degradation per async fetch (loading skeleton, error retry, 404 page).
**Akceptační kritéria**:
- [ ] Žádný „forever loading"
- [ ] 404 page funguje
- [ ] JS-disabled scénář ukazuje aspoň text content

### B-13 · „Behind the scenes" stránka
**Z**: planUXDesign Sprint 3.4
**Effort**: 0.5 dne
**Co**: `metodika.html` (nebo sekce v `o-projektu.html`) s vizualizací 5 fází daily routine. Link z AI disclaimer.
**Akceptační kritéria**:
- [ ] Stránka existuje, linkovaná z 3+ míst
- [ ] Vysvětlení procesu srozumitelné laikovi

### B-14 · Audience switch (P1.7 z 06)
**Z**: 06_Plan_redesignu P1.7
**Effort**: 1 den
**Co**: vizuální přepínač „Pro veřejnost / Pro odborníky / Pro politiky" v hlavičce. Data mají `tldr_public/expert/policy` připraveno. localStorage persistence.
**Akceptační kritéria**:
- [ ] Přepínač viditelný v topbaru
- [ ] Persistuje v localStorage
- [ ] `data-audience` atribut na `<body>` přepíná CSS pravidla

### B-15 · Verification badge per indikátor (P2.3 z 06)
**Z**: 06_Plan_redesignu P2.3
**Effort**: 1 den
**Co**: indicators dostanou viditelný badge Ověřeno / Předběžné / Ilustrativní podle `source.origin`. Analogie k `article:audit-status`.
**Akceptační kritéria**:
- [ ] Badge viditelný na karte indikátoru
- [ ] Filter „pouze ověřené"

### B-16 · Anglická lokalizace (i18n)
**Z**: CODEX_TASKS Task C
**Effort**: 3 dny
**Co**: EN verze webu (přepínač CS/EN). Mezinárodní publikum (OECD, EU partner orgs).
**Akceptační kritéria**:
- [ ] `/en/` URL pattern
- [ ] Přepínač jazyka v topbaru
- [ ] Strategy/indicator labels přeloženy

---

## 🔵 LOW (backlog / Q3+)

### B-17 · UX audit stránky „Strategie"
**Z**: CODEX_TASKS Task E
**Effort**: 1 den
**Co**: čitelnost strategie.html, 4-vrstvý flow diagram (Národní / Sektorové / EU / Standardy).

### B-18 · Vizuální schéma „pák" (SVG)
**Z**: 06_Plan_redesignu P3.6
**Effort**: 2 dny
**Co**: klikací SVG sloup-střecha-páky (Prevence / Akutní / Následná → Délka života ve zdraví).

### B-19 · Accountability strategií
**Z**: 06_Plan_redesignu P3.9
**Effort**: 3 dny
**Co**: rozšířit `data/strategies.json` o `accountability` field (budget, target indicators, evaluation_status). UI badges Vyhodnoceno / Čeká / Bez kontroly.

### B-20 · Strategie storytelling vrstva
**Z**: 06_Plan_redesignu P3.8
**Effort**: 1.5 dne
**Co**: editorial hero + 4-vrstvý flow diagram pro strategie.html.

### B-21 · PROMs / PREMs roadmap
**Z**: 06_Plan_redesignu P4.2
**Effort**: backlog
**Co**: integrovat patient-reported outcomes/experiences až bude ÚZIS pilot 2025 publikován.

### B-22 · Otevřená data + API
**Z**: 06_Plan_redesignu P4.1
**Effort**: backlog
**Co**: CC-BY 4.0 export `data/indicators.json` přes REST endpoint.

### B-23 · Sociální determinanty zdraví
**Z**: 06_Plan_redesignu P4.3
**Effort**: backlog
**Co**: nová doména indikátorů (vzdělání, příjem, bydlení) — vyžaduje ČSÚ data feeds.

### B-24 · AI / NLP query interface
**Z**: 06_Plan_redesignu P4.4
**Effort**: backlog
**Co**: chatbot-style query nad daty. Vyžaduje LLM provider.

### B-25 · Gamifikace + regionální srovnání
**Z**: 06_Plan_redesignu P4.5
**Effort**: backlog
**Co**: „Jak si stojí tvůj kraj?" interaktivní mapa, ranking.

### B-26 · PWA + offline mode
**Z**: AUDIT_UX_OBSAH §8 #20
**Effort**: backlog
**Co**: service worker, manifest.json, offline indicators cache.

### B-27 · Dark mode přes prefers-color-scheme
**Z**: AUDIT_UX_OBSAH §8 #19
**Effort**: backlog
**Co**: dark theme via media query, žádný toggle.

### B-28 · Indikátory odolnosti (resilience)
**Z**: 06_Plan_redesignu P4.6
**Effort**: backlog
**Co**: covid surge capacity, kybernetické incidenty NÚKIB agregovaně.

---

## 🟡 OPERATIONAL (provozní / observability)

### B-29 · Ingest freshness banner
**Z**: PLAN_AUTOMATICKY_INGEST
**Effort**: 0.5 dne
**Co**: stale-data banner po 7 dnech bez live update, README badge s freshness ratio.
**Akceptační kritéria**:
- [ ] Cron zveřejní freshness report v každém runu
- [ ] Pokud `live_ratio < 30 %`, workflow failne + GitHub issue
- [ ] README freshness badge
- [ ] Web banner po 7 dnech bez `live`

---

## ✅ DONE (jen pro historii — z CODEX_TASKS a planUXDesign překryvy)

| Item | Zdroj | Kde dokončeno |
|---|---|---|
| Glossary (110 termínů) | 06_Plan P2.1 | PR #323 |
| O-projektu stránka | 06_Plan P2.4 | Existuje |
| 4-step narrative na home | 06_Plan P3.1 | `.ed-narrative-grid` v `index.html` |
| Success stories „Kde Česko vede" | 06_Plan P3.4 | `.ed-success` v `index.html` |
| Prevence stránka | 06_Plan P3.11 | `prevence.html` |
| Tematické linie | 06_Plan P3.2 | `tematicke-linie.html` |
| Pořadí menu | 06_Plan P2.6 | Indikátory → Jak funguje → Strategie |
| Skeleton loaders | 06_Plan P1.3 | `.skeleton-card` |
| Empty states | 06_Plan P1.4 | `.empty-state-actions` |
| HSPA tooltip + jednovětné | 06_Plan P1.6 | `<abbr>` + `.ed-hero-hspa-line` |
| Mezera v datech (gap section) | 06_Plan P0.3 | PR #321 |
| AI disclaimer | — | `injectAiDisclaimer()` v `clanky.js` |
| Article audit metadata | — | 110 článků, PR #315 |
| Pohotovosti syntéza | — | PR #316 (smazán duplicit) |
| Renumber articles | — | PR #324 (souvislá řada M+1..39) |
| Indicator counts update | — | PR #324 (73→80, 64→71) |
| Hub redesign (magazine+atlas+library) | — | PR #316 |
| Home page animations level B | — | PR #322 |
| NotebookLM podcast card | — | PR #332 |
| Site architecture + visual components + data model docs | — | PR #335 |
| Home article cards padding | — | PR #336 |
| **P1.7 Audience switch UI** | planUXDesign Sprint 2 | PR #337 |
| **B-29 Freshness banner** | OPERATIONAL | PR #337 |
| **A11y skip-link na všech stránkách** | planUXDesign Sprint 1 | PR #338 |
| **B-07/B-08 propojení 52 článků s site-stats** | planUXDesign Sprint 2 | PR #339 |
| **B-15 Verification filter „Pouze ověřené"** | 06_Plan P2.3 | PR #340 |
| **P2.3 Verification badge per indikátor** | 06_Plan P2.3 | hotové už dříve (`.verif-badge` v app.js) |
| **B-13 Behind-the-scenes** | planUXDesign Sprint 3.4 | hotové už dříve (`#behind-the-scenes` v o-projektu.html) |
| **B-05 Reading progress + TOC** | planUXDesign Sprint 1.3 | hotové už dříve (`src/article-toc.js`) |
| **B-10 Site-wide search** | planUXDesign Sprint 3.1 | hotové už dříve (`src/search.js`, `/` shortcut) |
| **B-11 Glossary inline tooltips** | 06_Plan P2.1 | hotové už dříve (`src/glossary-inline.js`) |
| **P3.9 Strategie accountability** | 06_Plan P3.9 | hotové už dříve (data + UI ve všech 33 strategiích) |
| **B-01 Playwright + axe testing infra (scaffold)** | planUXDesign Sprint 0 | PR #341 — scaffold + workflow opt-in; baseline vyžaduje vlastníka jednorázově lokálně |
| **B-09 Taxonomy unification — návrh** | planUXDesign Sprint 2.2 | PR #341 (`docs/taxonomy-decision.md`); implementace fází 1–3 vyžaduje schválení vlastníkem |
| **P3.6 SVG schéma pák** | 06_Plan P3.6 | PR #342 (jak-funguje.html `.leverage-section`) |
| **B-03 a11y — aria-current + masthead aria-hidden fix** | planUXDesign Sprint 1 | PR #343 |

---

## Roadmap (stav 2026-05-18 po PR #335–#343)

| Sprint | Položky | Effort | Status |
|---|---|---|---|
| **Sprint 0** | B-01 testing infra | 0.5 dne | ✅ scaffold (PR #341); baseline owner-action |
| **Sprint 1** (a11y + critical UX) | B-02, B-03 ✅, B-04, B-05 ✅, B-06 | 4.5 dne | ✅ B-03/B-05/skip-link; B-02 (Lighthouse mobile), B-04 (hero), B-06 (perf) vyžadují měření |
| **Sprint 2** (data consistency + structure) | B-07 ✅, B-08 ✅, B-09 ⚠️, B-14, B-15 ✅ | 1.5 dne | ✅ B-07/B-08/B-15; B-09 návrh (PR #341) čeká schválení; B-14 audience switch sám DONE (PR #337) |
| **Sprint 3** (polish + discovery) | B-10 ✅, B-11 ✅, B-12, B-13 ✅, B-29 ✅ | 1 den | ✅ B-10/B-11/B-13/B-29; B-12 audit nice-to-have (error messages už existují) |
| **Backlog Q3+** | B-16 (i18n) až B-28 | 12+ dní | viz „Co zbývá" níže |

## Co reálně zbývá k akci (po PR #335–#343)

Položky vyžadují buď **measuring environment** (skutečný browser + Lighthouse + axe-core), nebo **schválení designových rozhodnutí** vlastníkem projektu. Jejich dokončení není doručitelné jako CLI scriptovaná změna.

| Položka | Důvod, proč nedoručeno | Co je potřeba |
|---|---|---|
| **B-01** baseline snapshots | sandbox bez Chrome binaries | Vlastník jednorázově lokálně: `npx playwright install --with-deps chromium && npx playwright test --update-snapshots && git add tests/e2e/*-snapshots`; pak odkomentovat `pull_request` trigger v `.github/workflows/visual-a11y.yml` |
| **B-02** mobile audit Lighthouse ≥90 | vyžaduje skutečný browser + síťový profile | Vlastník: spustit Lighthouse mobile na deployed preview, identifikovat konkrétní fail body, oprava per komponenta |
| **B-03** plný WCAG scan (0 critical) | vyžaduje axe-core na live preview | Aktivovat workflow z PR #341, projít fail, opravit per stránka |
| **B-04** hero simplify (above-fold 1 příběh) | designové rozhodnutí | Vlastník: definovat „hlavní příběh dne" (manuálně nebo auto-rotující). Pak implementovat single hero block. |
| **B-06** Chart.js lazy + perf | Lighthouse baseline + plán | Chart.js už je per-page (jen 2 stránky), ECharts taky (2 stránky). Další perf práce vyžaduje konkrétní LCP/CLS měření. |
| **B-09 implementace fází 1–3** | UX rozhodnutí | Vlastník: schválit `docs/taxonomy-decision.md` (PR #341), pak fáze 1 (`linked_dimensions` v `articles.json`) lze udělat batch skriptem |
| **B-12** retry buttons u error states | nice-to-have | Empty/error messages už jsou. Retry button je dlouhodobá kosmetika. |
| **B-16** EN i18n | dlouhý projekt | Vyžaduje rozhodnutí o URL pattern, translation flow, fallback strategy. Není scaffold doručitelný v 1 PR. |
| **B-17 až B-28** | Q3+ backlog | Žádný nereaguje na okamžitý uživatelský feedback. Plánovaný delší rozvoj. |

---

## Princip per sprint

1. **Měřit před** — Lighthouse + axe baseline na main
2. **Implementovat** — feature branch, 1 PR per úkol
3. **Měřit po** — stejné metriky, srovnat
4. **Reviewovat** — Codex + Vercel preview + manual check
5. **Merge + monitor**

---

## Reference

- `04_Plan_napojeni_na_API/CODEX_TASKS.md` — **ARCHIVED**, nahrazuje tento backlog
- `planUXDesign.md` — detailní plán Sprint 0–3 s test specifikací (komplementární k tomuto backlogu)
- `STATUS_AUDIT_2026-05-18.md` — status verifikace strategických plánů
- `06_Plan_redesignu.md` — historický strategický plán, většina P0–P3 hotová
- `07_Prevence_plan.md` — MVP plán prevence sekce
- `08_Politicky_program.md` — source pro manifest article (CONSUMED)

---

_Vznikl jako sjednocení paralelních TODO listů. Aktualizovat při dokončení sprintů._
