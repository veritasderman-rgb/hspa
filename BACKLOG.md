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

## ✅ Dokončovací a dočišťovací vlna — 2026-05-21 (zpracováno 21. 5. 2026)

> Přidáno po auditu stavu repozitáře (21. 5. 2026), zpracováno týž den.
> Položky B-30 až B-39 jsou **vyřešené nebo ověřené**; u zbytku je uveden
> důvod, proč nejdou dokončit automatizovaně (redakční rozhodnutí, provozní
> pipeline, měřicí prostředí).

**Souhrn stavu vlny:**

| # | Položka | Stav |
|---|---|---|
| B-30 | Oprava `validate:all` | ✅ DONE — opraveno + ověřeno |
| B-31 | 5 padajících testů | ✅ RESOLVED — chyběly lokální závislosti, ne regrese |
| B-32 | 15 uvázlých draftů | ⏳ OPEN — redakční rozhodnutí (mimo automatizaci) |
| B-33 | Seed cleanup | 🟡 PARTIAL — inventura hotová, konverze vyžaduje pipeline |
| B-34 | Gramatický průchod | ✅ RESOLVED — `in-hospital` je záměrný termín, ne chyba |
| B-35 | Audit `prevence.html` | ✅ DONE — ověřeno, plán 07 naplněn |
| B-36 | UX audit | 🟡 PARTIAL — statická hygiena OK, user-testing chybí |
| B-37 | Vizuální / brand audit | ✅ DONE — ověřena konzistence všech 85 stránek |
| B-38 | Grafické překryvy | 🟡 PARTIAL — z-index OK staticky, breakpointy → B-01 |
| B-39 | Newsletter popup | ✅ DONE — slide-in rohová karta, scroll 55 %, návrat po 30 dnech |

### Fáze 0 — Akutní opravy (rozbité buildy) · ✅ hotovo

#### B-30 · Opravit `npm run validate:all` 🔴 ✅ DONE
**Z**: audit 2026-05-21
**Stav**: ✅ Opraveno. Explainer `nv_307_2012` měl `verification_status:
"preliminary"` mimo povolenou množinu (`ok / needs_verification / broken`) —
sjednoceno na `needs_verification`. Doplněn chybějící status u
`dansko_stroke_care`. Ověřeno: `validate:all` prochází (88 indikátorů,
33 strategií, 28 explainerů, 9 témat prevence, 69 článků).
**Akceptační kritéria**:
- [x] `preliminary` → `needs_verification`
- [x] Doplněn status u `dansko_stroke_care`
- [x] `npm run validate:all` projde bez chyby

#### B-31 · Prošetřit 5 padajících testů 🔴 ✅ RESOLVED
**Z**: audit 2026-05-21
**Stav**: ✅ Vyřešeno — **nejde o regresi ani síťovou flakiness**. Testy
`csu / sukl / sukl_mr / uzis_nzis` padaly na chybějícím balíčku `csv-parse`,
`social-distribution` na `@anthropic-ai/sdk`. Oba balíčky **jsou** korektně
deklarované v `package.json`; chyběly jen nainstalované v lokálním sandboxu.
CI (`deploy-check.yml`) instaluje závislosti přes `npm ci`, takže v reálném
CI testy procházejí. Po `npm install` lokálně: **329/329 testů zelených**.
Žádná změna v repu není potřeba.
**Akceptační kritéria**:
- [x] Příčina určena: chybějící nainstalované závislosti, ne regrese
- [x] Ověřeno, že CI instaluje závislosti (`npm ci` v `deploy-check.yml`)
- [x] Po instalaci 329/329 testů prochází

### Fáze 1 — Obsahové dočištění

#### B-32 · Rozhodnout 15 uvázlých draftů 🟠 ⏳ OPEN
**Z**: audit 2026-05-21
**Stav**: ⏳ Otevřené — **redakční rozhodnutí mimo rozsah automatizovaného
úklidu.** 15 článků má datum v minulosti, ale `published: false`. To je
**bezpečný stav** — drafty se nezobrazují čtenářům. Část navíc obsahuje
`article-review-banner`, který musí redakce odstranit před publikací.
Hromadné publikování 15 článků na veřejný zdravotnický portál bez redakční
kontroly je vysoce rizikové; ponecháno jako vědomě otevřené.
**Akceptační kritéria**:
- [ ] Redakce projde 15 draftů a u každého rozhodne: publikovat / odložit / zrušit

#### B-33 · Seed cleanup (= 06_Plan P0.4) 🟠 🟡 PARTIAL
**Z**: 06_Plan_redesignu P0.4 + STATUS_AUDIT
**Stav**: 🟡 Inventura hotová. **86 z 88 indikátorů má `origin: seed`,
jen 2 jsou `live`** (`Procesy` 29 seed, `Výsledky` 23, `Struktury` 21,
`Výstupy` 13). Konverze na `live` vyžaduje funkční fetchery + síťový přístup
a běh ingest pipeline — provozní úkol, ne úprava dat. Souvisí s nízkým
`live_ratio` (2,3 %), který patří k operační údržbě ingest pipeline.
**Akceptační kritéria**:
- [x] Soupis: 86 seed / 2 live, rozpad dle oblasti
- [ ] Konverze na `live` — vyžaduje běh pipeline (provozní)

#### B-34 · Finální gramatický průchod (= 06_Plan P1.1) 🟡 ✅ RESOLVED
**Z**: 06_Plan_redesignu P1.1
**Stav**: ✅ Prověřeno. Konkrétní výtka z `STATUS_AUDIT` („in-hospital
úmrtnost") se ukázala jako **záměrná metodická terminologie** — „in-hospital"
se v článcích používá výhradně jako odborný kvalifikátor v kontrastu vůči
„admission-based 30-day" (definiční rozdíl, který články explicitně
vysvětlují); nadpisy indikátorů už používají české „Nemocniční úmrtnost".
Žádná oprava není namístě. Plošný gramatický re-read 69 článků je redakční
úkol, ne automatizovatelná oprava.

#### B-35 · Verifikační audit `prevence.html` (= 07_Prevence) 🟡 ✅ DONE
**Z**: STATUS_AUDIT Top 5 #5 + 07_Prevence_plan
**Stav**: ✅ Ověřeno — `prevence.html` plně naplňuje `07_Prevence_plan`.
`data/prevention.json` obsahuje 9 témat (jídlo, pohyb, tabák/nikotin,
alkohol, vztahy/samota, smysl života, děti/prostředí, digitální zdraví,
screening), každé má 3–4 primární zdroje (plán chtěl 2–5), `caveat` pole
a `hspa_indicators` propojení. Hero i `flow_steps` přítomny, caveat box
v `prevence.html` je. Položky 07-plánu označené v STATUS_AUDIT jako PARTIAL
jsou ve skutečnosti DONE.

### Fáze 2 — Dokončení rozpracovaných funkcí

Odkazuje na existující backlog — detail viz „Co reálně zbývá k akci" níže:
**B-04** (hero simplify), **B-06** (perf / Core Web Vitals), **B-09**
(taxonomy unification, fáze 1–3). Většina vyžaduje schválení vlastníka nebo
měřicí prostředí (skutečný browser + Lighthouse) — beze změny.

### Fáze 3 — Audity

#### B-36 · UX audit (komplexní) 🟠 🟡 PARTIAL
**Z**: audit 2026-05-21
**Stav**: 🟡 Statická část hotová. Audit 85 HTML stránek: **všechny mají
`<title>`, `meta description`, `viewport` i `lang="cs"`** — základní
UX/SEO hygiena je napříč webem konzistentní. Hloubková část (navigační
cesty, srozumitelnost, „co je tady hlavní", test na reálných uživatelích)
vyžaduje user-testing — viz též B-04.
**Akceptační kritéria**:
- [x] Statická hygiena: 85/85 stránek má title/desc/viewport/lang
- [ ] User test: 4/5 najde konkrétní článek do 3 kliknutí (vyžaduje uživatele)

#### B-37 · Vizuální / brand-konzistenční audit 🟠 ✅ DONE
**Z**: audit 2026-05-21
**Stav**: ✅ Ověřeno. Audit všech 85 HTML stránek: **každá používá
standardní brandový shell** (`masthead-strip` / `module-nav` / `site-header`)
a **žádná nemá ad-hoc `<style>` blok** — veškeré styly jdou přes
`src/styles.css`. Strukturální brandová konzistence je v pořádku, žádná
stránka „nevypadla z konceptu".
**Akceptační kritéria**:
- [x] Žádná stránka bez standardního headeru
- [x] Žádná stránka nepoužívá ad-hoc styly mimo `styles.css`

#### B-38 · Kontrola grafických překryvů 🟠 🟡 PARTIAL
**Z**: audit 2026-05-21
**Stav**: 🟡 Statická část hotová. `z-index` žebříček v `styles.css` je
konzistentní a bez kolizí: `.skip-link` 9999 → `.mobile-nav-drawer` 9100 →
`.mobile-nav-backdrop` 9000 → `.scroll-top-btn` 8500 → overlaye 1000 →
tooltipy 200. Shodné páry (`modal-backdrop`/`site-search-overlay` 1000;
`glossary-abbr`/`article-progress` 200) jsou na vzájemně vylučujících se
nebo prostorově oddělených komponentách — žádná reálná kolize. Vizuální
kontrola překryvů na 4 šířkách vyžaduje skutečný browser → pokryje
**B-01** (Playwright baseline) + **B-02** (mobile audit).
**Akceptační kritéria**:
- [x] `z-index` vrstvy zdokumentované, bez statických kolizí
- [ ] Vizuální kontrola na 360/414/768/1280 px (vyžaduje browser → B-01/B-02)

> **Mobilní responzivita a a11y** — pokryto existujícími položkami **B-02**
> (mobile audit, touch targety ≥44 px, žádný horizontal scroll) a **B-03**
> (WCAG 2.1 AA). Vyžadují měřicí prostředí (Lighthouse, axe-core na živém
> preview) — viz „Co reálně zbývá k akci".

### Fáze 4 — Newsletter popup

#### B-39 · Newsletter popup (slide-in) 🟡 ✅ DONE
**Z**: audit 2026-05-21
**Stav**: ✅ Implementováno. Nový modul `src/newsletter-popup.js` —
nenápadná rohová karta vpravo dole, vysune se po doscrollování 55 % stránky.
Napojeno přes `renderModuleNav()` v `page-shared.js`, takže běží na všech
stránkách. Reuse MailerLite endpointu z footeru. Stav v `localStorage`:
po zavření se vrátí až za 30 dní, po přihlášení už nikdy. Esc zavírá,
`prefers-reduced-motion` respektován, otevřený popup schová scroll-top FAB
(kolize vpravo dole). Čistá funkce `shouldShowPopup()` pokrytá testy.
**Parametry (rozhodnutí vlastníka 2026-05-21)**: spouštěč scroll 55 %,
rohová karta vpravo dole, všechny stránky, návrat po 30 dnech.
**Akceptační kritéria**:
- [x] Popup se zobrazí jednou za návštěvu, po zavření se vrátí až za 30 dní
- [x] `position: fixed` → žádný CLS; Esc + klávesnice OK, `aria-label` region
- [ ] A/B měření konverze vs. footer-only baseline (provozní, po nasazení)

> **Pozn.**: vizuální kontrola v prohlížeči nebyla v sandboxu možná
> (bez Playwrightu — viz B-01); ověřeno staticky + 6 unit testů logiky
> zobrazení. Doporučeno proklikat na Vercel preview.

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
| ~~B-29 Freshness banner~~ (frontend banner) | OPERATIONAL | PR #337 zavedl, PR #351 odstranil (UX feedback — banner s ratio 2 % působil rušivě). Backend freshness.json + verify:freshness ponechány. |
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

_Aktualizováno 21. 5. 2026 — dokončovací a dočišťovací vlna B-30 až B-39
zpracována: B-30/B-35/B-37 hotovo, B-31/B-34 vyřešeno, B-33/B-36/B-38
částečně (zbytek vyžaduje pipeline / měřicí prostředí), B-32 redakční
rozhodnutí, B-39 spec připravena._
