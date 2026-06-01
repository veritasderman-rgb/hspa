# Plán: WCAG 2.2 AA · Nové explainéry · Sociální determinanty zdraví

> Living dokument. Tři propojené pracovní proudy dodávané na branch
> `claude/cool-dirac-IH8Yg` jako **jeden PR**. Stav: ✅ **A1 + B + C implementováno** (A2–A5 remediace = navazující backlog).

## Stav implementace (2026-06-01)

| Proud | Stav | Co dodáno |
|---|---|---|
| **A1** — a11y tooling + baseline | ✅ | `tests/a11y/axe-scan.mjs`, scripty `test:a11y` / `test:a11y:ci`, devDeps `playwright` + `@axe-core/playwright`, baseline `docs/a11y-baseline-2026-06.md` (37 porušení / 5 pravidel), `docs/accessibility.md`, hardening CSS (forced-colors, prefers-contrast, `scroll-padding-top` pro SC 2.4.11). |
| **B** — 3 explainéry | ✅ | `regionalni_dostupnost`, `primarni_pece`, `prevence_jako_politika` v `data/explainers.json`; hero blok v `jak-funguje.html`; propojeno v `themes.json`. |
| **C** — SDOH (plná varianta) | ✅ | 2 indikátory (`prijem_disponibilni`, `ohrozeni_chudobou`) — karty + seed; 2 NUTS-3 datasety v `regions.json`; registrace v `csu_datasets.js`; explainér `socialni_determinanty`; propojeno v `themes.json`. |
| **A2–A5** — remediace + CI gate | ⏳ backlog | Prioritizace porušení v `docs/a11y-baseline-2026-06.md` + `docs/accessibility.md`. |

**Verifikace:** `npm test` 498/498 ✓ · `npm run validate:all` ✓ · `npm run test:a11y` generuje baseline ✓.

## Rozhodnutí (potvrzeno zadáním)

1. **Kategorie explainérů** — nové explainéry zařadit do **stávajících** kategorií
   (`money | classification | actors | process | inspiration`). Žádná nová kategorie,
   žádná změna validátoru/`CATEGORY_LABELS`.
2. **SDOH data** — **plná varianta**: nový datový pipeline pro příjmové nerovnosti /
   chudobu po krajích (ČSÚ EU-SILC, NUTS-3) — fetcher, transform, validace, karta,
   seed, testy.
3. **Doručení** — vše (A+B+C) na `claude/cool-dirac-IH8Yg`, jeden PR.

---

## Východiska (stav repu, ověřeno 2026-06-01)

### Explainéry
- `data/explainers.json` — 31 položek; render `src/explainers.js` + `src/explainer-policy-views.js`
  na `jak-funguje.html`; validátor `ingest/validate-explainers.js`; testy
  `tests/strategies-explainers.test.js`; drafty `drafts/README.md`.
- Povinná pole: `id, title, category, tldr_public, tldr_expert, tldr_policy`.
- Volitelně: `subtitle, key_facts[], process(timeline), absurdity_examples[],
  linked_indicators[], linked_strategies[], documents[], verified_at, verification_status`.
- Testy/validátor vyžadují: validní kategorie; `linked_indicators` musí existovat
  v `indicators.json`; `linked_strategies` musí existovat ve `strategies.json` nebo mezi
  explainéry; každý `absurdity_examples[]` má `context` + (`source` nebo `url`); URL absolutní;
  test "≥1 linked strategy na explainér".

### Regionální data (`data/regions.json`, v2, 39 datasetů, vše NUTS-3 kraj)
Relevantní existující datasety pro nové explainéry:
- Dostupnost/primárka: `lekari_per_1000`, `prohlidka_prakticky_lekar_kraje`,
  `hospitalizace_acsc_kraje` (ACSC proxy kvality primárky), `ambulantni_kontakty_kraje`,
  `cekaci_doby_specialist`, `dojezd_zzs_kraje`, `lekarny_per_100k_kraje`, `sestry_per_1000_kraje`.
- Prevence: `vydaje_prevence_pct_kraje`, `mortalita_preventabilni_kraje`,
  `screening_mamografie_kraje`, `screening_kolorektalni_kraje`, `vakcinace_*`.
- SDOH proxy (pro gradient): `pyll_potencialne_ztracene_roky_kraje`, `nadeje_doziti_men/zeny`,
  `kuractvi_denni_kraje`, `obezita_kraje`.
- ⚠️ **Chybí**: jakýkoli příjmový/socioekonomický dataset → doplní Proud C.

### Navázatelné články (existují)
`clanek-reforma-primarni-pece-2027`, `clanek-vydaje-prevence`, `clanek-preventivni-prohlidka`,
paradox dostupnosti, screeningové články. Témata: `dostat_peci_vcas`, `zit_dele_ve_zdravi`,
`najit_nemoc_driv`.

### Accessibility baseline
Solidní: `:focus-visible` (styles.css ~38–40, 786, 2601…), `.sr-only` (799),
`.skip-link` (810, 824), `prefers-reduced-motion` (3700, 3786, 6770, 6910),
~1026 ARIA instancí (nav `page-shared.js`, search `search.js`, mapa `cz-map.js`,
ToC `article-toc.js`, glosář `glossary-inline.js`), `<html lang="cs">`.
**Chybí**: automatizované a11y testy (žádný axe/pa11y v `package.json`),
`@media (forced-colors)` / `prefers-contrast`, kompletní focus-trap/return-focus.
Existující nálezy: `AUDIT_UX_OBSAH_2026-05.md` (13 bodů P1–P3); plán
`planUXDesign.md` + `06_Plan_redesignu.md` (P4.7 WCAG 2.2 AA, axe-core plánován).

---

## Proud A — WCAG 2.2 AA audit roadmapa

**A1. Tooling & baseline (P1)**
- `devDependencies`: `playwright` + `@axe-core/playwright`; npm script `test:a11y`.
- Skript projede reprezentativní stránky (`index`, `clanky`, vzorový `clanek-*`,
  `hspa-prehled`, `kraje`, `pojistenci`, `prevence`, `strategie`, `glosar`,
  `jak-funguje`, `indicator.html?id=`, `404`) přes lokální `http-server`;
  `AxeBuilder.withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()`.
- Výstup: `docs/a11y-baseline-2026-06.md` (violations jako todo seznam).

**A2. Existující nálezy (P1–P2)** — odbavit 13 bodů z `AUDIT_UX_OBSAH_2026-05.md`:
heading hierarchie (h1→h6 skoky), `aria-hidden` konzistence na masthead, canvas/SVG
alt texty, kontrast, viditelnost skip-linku, labely.

**A3. WCAG 2.2-specifické novinky (P2)** — to, co audit ve verzi 2.1 nepokrýval:
- **2.4.11 Focus Not Obscured (AA)** — sticky nav nesmí zakrýt zafokusovaný prvek;
  ověřit `scroll-margin-top`/`scroll-padding-top` u kotev i focusu.
- **2.5.8 Target Size 24×24 px (AA)** — proměřit nav chipy, filtry `clanky.html`,
  TOC odkazy, mapové dlaždice, paginaci.
- **2.5.7 Dragging Movements (AA)** — mapa krajů musí mít ne-drag alternativu
  (klik/klávesnice — `cz-map.js` už má `tabindex`/`role=button`, doložit).
- **3.2.6 Consistent Help (AA)** — konzistentní umístění vyhledávání napříč
  stránkami (sdílený nav → doložit).
- 3.3.7 Redundant Entry / 3.3.8 Accessible Authentication — **N/A** (web bez
  přihlášení a bez vstupních formulářů kromě fulltextu).

**A4. CSS doplňky (P3)** — `@media (forced-colors: active)` a `prefers-contrast: more`
do `styles.css` (a11y sekce ~38–40, 786–824); focus-trap audit modálů, return-focus po
zavření search.

**A5. CI gate + dokumentace** — `test:a11y` do CI vedle `npm test` (nejdřív warn,
po vyčištění A2/A3 blocking pro klíčové stránky); `docs/accessibility.md`
(konvence, jak psát přístupné AV komponenty, checklist nového článku).

---

## Proud B — Nové explainéry

Postup pro každý: draft do `drafts/` → `node ingest/validate-explainers.js` →
`npm test` → promote do `data/explainers.json` → odkaz z hero v `jak-funguje.html`.
Každý: 3 audience TL;DR, `key_facts`, ≥1 `absurdity_examples`, `linked_indicators`,
≥1 `linked_strategies`, `documents` na existující články, `verified_at` + `verification_status: ok`.

| Explainér | `id` | Kategorie | `linked_indicators` | Navázat |
|---|---|---|---|---|
| Regionální dostupnost péče | `regionalni_dostupnost` | `process` | `dojezd_zzs_kraje`, `cekaci_doby_specialist`, `lekari_per_1000`, `lekarny_per_100k_kraje` | paradox dostupnosti |
| Primární péče | `primarni_pece` | `actors` | `prohlidka_prakticky_lekar_kraje`, `hospitalizace_acsc_kraje`, `ambulantni_kontakty_kraje` | `clanek-reforma-primarni-pece-2027` |
| Prevence jako politika | `prevence_jako_politika` | `process` | `vydaje_prevence_pct_kraje`, `mortalita_preventabilni_kraje`, screeningy | `clanek-vydaje-prevence`, `clanek-preventivni-prohlidka` |

---

## Proud C — Sociální determinanty zdraví (plná varianta)

### C1. Datový pipeline (nový dataset)
- **Zdroj**: ČSÚ EU-SILC „Příjmy a životní podmínky domácností" + čistý disponibilní
  důchod domácností na obyvatele po krajích (regionální účty).
- ⚠️ **Datový caveat**: EU-SILC má v ČR robustní vzorek na úrovni NUTS-2 (regiony
  soudržnosti); míra ohrožení chudobou na NUTS-3 (kraje) má širší interval spolehlivosti.
  Řešení: primárně použít **medián/čistý disponibilní důchod na obyvatele po krajích**
  (regionální účty, robustní NUTS-3) + míru ohrožení chudobou doplnit na NUTS-2 s jasnou
  poznámkou o úrovni. Karta indikátoru caveat zdokumentuje.
- Kroky:
  1. Rozšířit/přidat fetcher `ingest/fetchers/csu.js` (registrovat v `ingest/run.js`).
  2. Mapping kódů (kraj NUTS-3) v `ingest/mapping/`.
  3. Transform → nový dataset v `data/regions.json` (např. `prijem_median_kraje`,
     `ohrozeni_chudobou_nuts2`).
  4. Validace (`ingest/validate*.js`), `npm run verify:freshness`.
  5. Pokud má vzniknout i HSPA indikátor: karta `indicators/{id}.json` + seed
     v `data/indicators.json` (test „karta ↔ indikátor" musí projít).
  6. Test `tests/csu.test.js` (fetcher) + případně transform test.

### C2. Explainér `socialni_determinanty`
- Kategorie: **`process`**. Koncept Dahlgren–Whitehead / gradient zdraví.
- `linked_indicators`: nový příjmový dataset + proxy (`mortalita_preventabilni_kraje`,
  `pyll_potencialne_ztracene_roky_kraje`, `nadeje_doziti_*`, `kuractvi_denni_kraje`).
- Vizualizace NUTS-3 rozptylu (využít existující krajský render `kraje.js` / mapu).

---

## Pořadí prací (jeden PR, postupné commity)

1. **A1** — a11y tooling + baseline report (rychlá hodnota, CI základ).
2. **B** — 3 explainéry (čistě datové, nízké riziko).
3. **C1 → C2** — SDOH pipeline, pak explainér (závisí na datech).
4. **A2 → A3 → A4 → A5** — postupné čištění + WCAG 2.2 SC + CI gate.

## Definition of Done
- `npm test` zelené (vč. nových explainér testů a SDOH fetcher testu).
- `npm run validate:all` + `npm run verify:freshness` projdou.
- `npm run test:a11y` běží; baseline report v `docs/`.
- 3 explainéry + SDOH explainér viditelné na `jak-funguje.html`, prolinkované články.
- SDOH dataset v `data/regions.json` renderuje v krajském dashboardu.
- PR s body: Souhrn / Změny / Verifikace / Test plan; trailer Claude Code.
