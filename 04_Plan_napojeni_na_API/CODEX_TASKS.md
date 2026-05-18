# Zadání pro Codex — task briefingy pro Zdravé Česko

> ⚠️ **ARCHIVED** (18. 5. 2026) — tento dokument je **nahrazený** sjednoceným prioritizovaným backlogem v [`BACKLOG.md`](../BACKLOG.md). Položky byly přemapovány:
>
> - Task A (Accessibility) → **B-03** v BACKLOG
> - Task B (Performance) → **B-06**
> - Task C (Anglická lokalizace) → **B-16**
> - Task D (Mobile-first) → **B-02** (kombinováno s planUXDesign Sprint 1.1)
> - Task E (UX audit Strategie) → **B-17**
>
> Detailní zadání každého tasku zde zůstává jako reference, ale **status a prioritizace se sledují v `BACKLOG.md`**.

---

**Účel:** připravená zadání pro [Codex agenta](https://chatgpt.com/codex) na konkrétní úlohy nad mergeed `main`. Každý task je **self-contained** — Codex ho zvládne bez přístupu k této konverzaci nebo plánovacím dokumentům.

**Aktuální stav repa (květen 2026):**
- 42 indikátorů × 33 strategií × 5 explainers napříč 3 stránkami (`index.html`, `strategie.html`, `jak-funguje.html`)
- 135 testů (vanilla `node --test`, žádný framework)
- Vanilla JS, žádný build step, žádné npm dependencies pro frontend (jen CDN Chart.js)
- Vercel preview na každý PR, deploy-check workflow s `npm test` + `npm run validate:all`
- Audience switch (`public` / `expert` / `policy`) přes `localStorage` + `data-audience` atribut na `<body>`
- Dark mode přes `data-theme` + `prefers-color-scheme`

**Jak task poslat Codexovi:**
1. Otevři Codex (chatgpt.com/codex)
2. Zvol projekt `veritasderman-rgb/hspa`, branch `main`
3. Zkopíruj **celý task brief níže** jako zadání
4. Codex si vyrobí branch + PR

---

## 🅰️ Task A — Accessibility audit a WCAG 2.1 AA compliance

**Priorita:** vysoká (veřejný portál pro občany ČR — povinnost dle zákona 99/2019 Sb.)
**Odhad:** 2–4 hodiny
**Branch suggestion:** `codex/accessibility-audit`

### Cíl

Projít všechny 3 stránky portálu (`index.html`, `strategie.html`, `jak-funguje.html`) a opravit accessibility problémy. Cílem je **WCAG 2.1 AA compliance** ověřená přes `axe-core` (0 violations) a **Lighthouse Accessibility skóre ≥ 95**.

### Scope (in)

1. **Sémantická HTML** — landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), `<h1>`–`<h6>` hierarchie, `<button>` vs. `<a>`
2. **ARIA atributy** — `role`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-live`, `aria-expanded`, `aria-current`
3. **Klávesová navigace** — všechny interaktivní prvky musí být dosažitelné `Tab` + Enter/Space; modal trap focus; Escape close
4. **Focus indikátory** — viditelný `:focus-visible` outline, dostatečný kontrast
5. **Kontrast textu** — všechny text/background páry ≥ 4.5:1 (normal text) / 3:1 (large text); ověřit i v dark mode
6. **Screen reader** — alt texty, `aria-hidden` pro dekorativní emoji, čitelné labely formulářů
7. **Reduced motion** — `prefers-reduced-motion` respect (vypnout Chart.js animace)
8. **Form labels** — všechny `<input>` / `<select>` mají `<label>` (ne placeholder-only)

### Scope (out)

- Žádný redesign — zachovat současný look & feel
- Žádný nový build step, framework, ani npm dependency pro accessibility tools (axe-core jen v CI / dev mode přes CDN script)
- Žádná změna datového kontraktu

### Acceptance criteria

- [ ] `npx @axe-core/cli http://localhost:8080/` (po `npm run serve`) → **0 violations** napříč všemi 3 stránkami
- [ ] Lighthouse Accessibility skóre ≥ 95 v Chrome DevTools (audit on localhost:8080)
- [ ] Manuální keyboard test:
  - [ ] Tab projde celý dashboard (modul-nav → audience → filtry → karty → footer) bez focus trapu
  - [ ] Enter/Space na kartě indikátoru → otevře modal
  - [ ] Tab uvnitř modalu → focus zůstane (focus trap), Escape zavře
  - [ ] Šipky v audience-switch (volitelně — radiogroup pattern)
- [ ] Screen reader test (VoiceOver nebo NVDA, alespoň jeden):
  - [ ] Dashboard se ohlásí jako landmark (main, nav, header)
  - [ ] Karta indikátoru se přečte jako "[area], [název], hodnota [value] [unit], signál [good/warn/bad]"
  - [ ] Změna audience se ohlásí (`aria-live="polite"`)
- [ ] Kontrast: žádné `var(--muted)` na `var(--bg)` páru pod 4.5:1 (změřit a opravit)
- [ ] `prefers-reduced-motion: reduce` → Chart.js `animation: { duration: 0 }`
- [ ] `npm test` → všech 135 testů passes (žádná regrese)

### Test plan

```bash
# 1. Statická analýza
npx @axe-core/cli http://localhost:8080/index.html
npx @axe-core/cli http://localhost:8080/strategie.html
npx @axe-core/cli http://localhost:8080/jak-funguje.html

# 2. Lighthouse
npx lighthouse http://localhost:8080/ --only-categories=accessibility --view

# 3. Tests
npm test
```

### Where to start

Soubory primárně k úpravě (v `05_M1_Starter/`):
- `index.html` — řada inline nadpisů, modal struktura, scorecard role
- `strategie.html`, `jak-funguje.html` — cards jako `<a>` (správné), section headers
- `src/styles.css` — `:focus-visible` consistency, kontrast `--muted` (#607080) na `--bg` (#F7F9FB)
- `src/app.js`, `src/strategies.js`, `src/explainers.js` — modal focus trap, `aria-live` pro filter/search výsledky

Stávající ARIA který nesahat (už dobré):
- `data-audience` na `<body>`, `role="tablist"` na audience-switch
- `role="dialog"` + `aria-modal="true"` na modal
- `<a>` pro karty (správné — navigace, ne button)

---

## 🅱️ Task B — Performance optimalizace + Core Web Vitals

**Priorita:** střední
**Odhad:** 2–3 hodiny
**Branch suggestion:** `codex/performance`

### Cíl

Zlepšit **Lighthouse Performance ≥ 95** na 3G throttling. Cílit na Core Web Vitals (LCP, FID, CLS).

### Scope (in)

1. **Self-host Chart.js** místo CDN (umožní zpřísnit CSP `script-src 'self'`)
2. **Lazy-load Chart.js** — jen na `index.html` (regions chart) + v modal pro sparklines, ne na `strategie.html`/`jak-funguje.html`
3. **Defer-load** datasetů strategies/explainers na `index.html` (modal cross-link) — fetch až při otevření modalu
4. **Compress JSON** — minifikace `data/*.json` při deploy (vercel.json `cleanUrls`); ověřit že Vercel sám gzipuje
5. **Image/icon optimizace** — pokud existují PNG v `assets/`, převést na SVG/WebP
6. **CSS critical path** — inline kritické CSS (head + topbar) v `<head>`, zbytek async
7. **Eliminate render-blocking** — `<script type="module">` má defer-by-default, ověřit
8. **Preconnect** — `<link rel="preconnect" href="https://cdn.jsdelivr.net">` (pokud zachová CDN Chart.js)

### Scope (out)

- Žádná změna funkcionality
- Žádný build step (esbuild/rollup) — vanilla zůstává

### Acceptance criteria

- [ ] Lighthouse Performance skóre ≥ 95 (mobile, Slow 4G)
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Chart.js stahuje se jen na potřebných stránkách (Network tab v DevTools)
- [ ] `vercel.json` CSP `script-src 'self'` (žádný `cdn.jsdelivr.net`)
- [ ] Total transfer size < 250 KB (uncompressed JSON + JS + CSS) na první load
- [ ] `npm test` projde

### Test plan

```bash
npm run serve
npx lighthouse http://localhost:8080/ --preset=desktop --view
npx lighthouse http://localhost:8080/ --form-factor=mobile --throttling-method=simulate --view
```

### Where to start

- `05_M1_Starter/index.html` line 18: `<script src="https://cdn.jsdelivr.net/...">` → self-host
- `05_M1_Starter/src/app.js` — Chart.js dynamic import jen v `renderSparkline()` a `renderRegions()`
- `05_M1_Starter/vercel.json` — zpřísnit CSP po self-hostu

---

## 🅲 Task C — Anglická lokalizace (i18n)

**Priorita:** nízká (mezinárodní publikum, OECD/EU stakeholders)
**Odhad:** 4–6 hodin
**Branch suggestion:** `codex/i18n-english`

### Cíl

Přidat anglickou variantu portálu — language switcher v hlavičce, všechny statické texty přeložené, indikátory/strategie/explainers s `*_en` poli (volitelně).

### Scope (in)

1. **Language switcher** — `[CS | EN]` v topbar vedle audience switch
2. **Statické texty** v HTML/JS — extrahovat do `src/i18n/cs.json` + `src/i18n/en.json`
3. **`<html lang>`** se mění podle volby
4. **localStorage** — preferenci uložit (`zdrave-cesko/lang`)
5. **Datový kontrakt** — pole `name_en`, `tldr_public_en`, `tldr_expert_en`, `tldr_policy_en` v `data/strategies.json`, `data/explainers.json` (volitelné, fallback na CS)
6. **URL** — `?lang=en` jako alternativa k localStorage

### Scope (out)

- Strojový překlad — texty se píší ručně
- Pouze 2 jazyky pro start (CS, EN), žádný další framework

### Acceptance criteria

- [ ] Z dashboardu se dá přepnout na EN, všechny statické UI texty se změní
- [ ] `<html lang="en">` po přepnutí
- [ ] Strategie/explainers s `*_en` poli zobrazí EN, jinak CS s upozorněním "Translation not available"
- [ ] Test: nový soubor `tests/i18n.test.js` ověří, že každý klíč v `cs.json` má pendant v `en.json`
- [ ] Vyplněné minimum: 30 nejčastějších UI textů (audience labels, filter labels, button captions)

### Where to start

- Vytvoř `05_M1_Starter/src/i18n/index.js` s `t(key)` helper a `setLanguage(lang)` funkcí
- Najdi hardcoded české texty přes `grep -rn "ě\|š\|č\|ř\|ž\|ý\|á\|í\|é" src/ index.html strategie.html jak-funguje.html`

---

## 🅳 Task D — Mobile-first refactor + Touch UX

**Priorita:** střední (cíl mobile traffic 50%+)
**Odhad:** 3–4 hodiny
**Branch suggestion:** `codex/mobile-first`

### Cíl

Optimalizovat dashboard pro **portrait mobile (320–480px)**. Cílit na touch-friendly velikosti, čitelnost, rychlou navigaci.

### Scope (in)

1. **Touch targets ≥ 44×44 px** — tlačítka, audience switch, navigation tabs
2. **Sticky module-nav** — udělat opravdu sticky (`position: sticky`) na mobilu, ne hidden po scrollu
3. **Hamburger menu** — pro audience-switch a filtry na mobile (< 600px)
4. **Search box** — full-width na mobile, autofocus pří aktivaci
5. **Card grid** — 1 sloupec na portrait, 2 na landscape, 3+ na desktop (už máme `auto-fill 320px`, ověřit < 320px viewport)
6. **Responsive scorecard** — 5 dlaždic ve 2 řádkách (3+2) na portrait
7. **Modal** — full-screen na mobile s big close button
8. **Regions chart + table** — single column flow na mobile (už máme @media 768px)
9. **Timeline & responsibility matrix** (`strategie.html` policy) — horizontální scroll wrapper s scroll indicator

### Scope (out)

- Native app (PWA, Service Worker) — odložit do následujícího tasku
- Žádná změna datového kontraktu

### Acceptance criteria

- [ ] iPhone SE (375×667) — žádný horizontální scroll, všechny CTA prvky tappable
- [ ] Lighthouse Mobile Performance ≥ 90
- [ ] No element < 44×44 px target
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` ✅ (už máme)
- [ ] Timeline a responsibility matrix se dá horizontálně scrollnout s viditelným scroll indikátorem
- [ ] Modal close button ≥ 48×48 px na mobilu

### Where to start

- `src/styles.css` — aktualizovat `@media (max-width: 768px)` na `(max-width: 600px)` pro mobile breakpoint
- Přidat `@media (max-width: 480px)` pro extreme mobile
- `index.html` topbar — gridová layout pro mobile
---

## 🅴 Task E — UX audit + čitelnost stránky „Strategie“

**Priorita:** vysoká (obsah je kvalitní, ale části jsou špatně čitelné pro veřejnost i policy publikum)
**Odhad:** 3–5 hodin
**Branch suggestion:** `codex/ux-audit-strategie-readability`

### Cíl

Proveď **rychlý UX audit** napříč webem se **zvláštním důrazem na stránku `strategie.html`** (zejména sekce se strategií, timeline, rolemi odpovědností a delšími texty). Cílem je zvýšit čitelnost, skenovatelnost a srozumitelnost bez změny datového modelu.

### Scope (in)

1. **UX audit (heuristiky + průchod flow)**
   - Heuristiky: konzistence, hierarchie informací, orientace v obsahu, srozumitelnost termínů, kognitivní zátěž
   - Průchod 3 hlavních flow:
     - občan: „co je problém + co z toho plyne“
     - expert: „jaké metriky/zdroje to potvrzují“
     - policy: „co udělat, kdo za to odpovídá, v jakém čase“
2. **Čitelnost textu na `strategie.html`**
   - Zlepšit typografii dlouhých bloků (line-height, max-width, odsazení, mezititulky)
   - Přidat vizuální „kotvy“: TL;DR box, sticky mini-TOC, zvýraznění klíčových vět
   - Omezit „wall of text“: rozdělit obsah na kratší odstavce a bullet body (bez změny významu)
3. **Skenovatelnost a informační hierarchie**
   - Jasnější nadpisová struktura (`h1–h3`) a pořadí sekcí
   - Lepší kontrast/oddělení bloků (cards, callouts, tables)
   - Zkrátit délku řádků a sjednotit spacing mezi sekcemi
4. **UX mikrointerakce (low-risk)**
   - Lepší stavy hover/focus/active pro navigační prvky a strategie cards
   - „Back to top“ na delších stránkách
   - Jemné sticky chování navigace sekcí na desktopu
5. **Evidence výstupů z auditu**
   - Vytvořit krátký markdown report s nálezy, prioritami (P1/P2/P3) a mapou oprav
   - Každému nálezu přiřadit konkrétní soubor/sekci

### Scope (out)

- Žádný redesign brandu ani změna vizuální identity
- Žádná změna datových JSON kontraktů
- Žádné nové frameworky/build step

### Acceptance criteria

- [ ] V repu je audit report `04_Plan_napojeni_na_API/UX_AUDIT_STRATEGIE.md` s prioritizací nálezů
- [ ] `strategie.html` je čitelnější: méně dlouhých bloků, lepší mezititulky, vyšší skenovatelnost
- [ ] Dlouhé textové sekce mají konzistentní typografii (max-width, line-height, spacing)
- [ ] Navigace sekcemi je rychlá (sticky/kotvy) a funguje na desktop i mobile
- [ ] Žádná regrese: `npm test` prochází
- [ ] Zachovaný současný look & feel (inkrementální UX zlepšení, ne redesign)

### Test plan

```bash
# Funkční/regresní testy
npm test

# Ruční UX checklist (strategie)
# 1) Najdu do 10s: "co je problém", "co dělat", "kdo odpovídá"
# 2) Přečtu dlouhý blok bez ztráty řádku (line length + spacing)
# 3) Přeskočím mezi sekcemi pomocí kotev/sticky TOC
# 4) Na mobilu není text nalepený na okraje a tabulky mají čitelné overflow chování
```

### Where to start

- `05_M1_Starter/strategie.html` — struktura sekcí, kotvy, TL;DR bloky
- `05_M1_Starter/src/styles.css` — typografie, spacing, max-width textových bloků, sticky TOC
- `05_M1_Starter/src/strategy-policy-views.js` — případné rozdělení textu do čitelnějších bloků
- `04_Plan_napojeni_na_API/STRATEGIES_INVENTORY.md` — kontrola terminologie a konzistence názvů



---

## Doporučené pořadí

1. **Task A — Accessibility** první (právní povinnost, vysoký dopad)
2. **Task E — UX audit (Strategie)** druhý (čitelnost + orientace v obsahu)
3. **Task D — Mobile** třetí (cíl mobile traffic, related WCAG)
4. **Task B — Performance** čtvrtý (after A+D+E, aby Lighthouse pokrýval všechno)
5. **Task C — i18n** poslední (volitelný, mezinárodní publikum)

Každý task je nezávislý — lze poslat současně do 4 paralelních PR.

---

## Tone-of-voice pro Codex

- **Drž se zachování existujícího designu** — žádné svévolné UI změny
- **Vanilla JS** — žádné React/Vue/jQuery, žádné npm dependencies pro frontend
- **Test-first** — pokud upravuješ logiku, přidej test
- **Czech codebase** — komentáře a UI texty v češtině, identifikátory v angličtině
- **`@codex address that feedback` workflow** — pokud Codex review vrátí P1/P2 issue, oprav ho s testem regrese (jako u P1 buildGanttModel a P2 NOR sex_filter)

*Verze 1.1 · květen 2026 · 5 task briefs ready to send to Codex.*
