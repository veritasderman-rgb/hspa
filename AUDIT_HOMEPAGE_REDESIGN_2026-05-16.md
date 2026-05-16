# AUDIT — Homepage redesign 2026-05-16
**Rozsah:** PR #285, #286, #287 (commit 92d26a5, 7b8d464, cf3d392)
**Auditor:** Claude Code (Opus 4.7) · pasivní review, žádné zásahy do kódu.

---

## 1 · STRUKTURÁLNÍ INTEGRITA · ✅ PASS

**HTML.** `index.html`, `hspa-prehled.html`, `tematicke-linie.html` — vyrovnané `<section>` (po 14 / 14 / 2 párů), žádné duplicate `id` (ověřeno `grep -oP 'id="[^"]+"' | sort | uniq -d`), všechny `<h2>/<h3>` mají `aria-labelledby` cíl (např. `edHeroHeadline`, `edDimsHeadline`, `hspaUsecaseHead`, `hspaDimsHead`, `themesHeroHeadline`).

**Top nav.** `grep -rn "'themes'" src/` vrací 0 výskytů jako `activeId`. V `page-shared.js` (řádky 235–246) tab `themes` v `tabs` array NEEXISTUJE — odebrán korektně. `src/themes.js:225` volá `renderModuleNav('hspa-prehled')` → správně aktivuje HSPA přehled tab. Mobile drawer (`injectMobileNav`) přebírá stejný `tabsHtml` → automaticky bez themes.

**Linkcheck.** `grep -rn 'href="tematicke-linie'` vrací 1 výskyt: `hspa-prehled.html:64` (legitimní CTA). Žádný odkaz z topnavu, žádné orphan reference.

**DOM safety.** `app.js:363` čte `#edDimsGrid`, `app.js:1369` čte `#homeArticlesGrid` — oba ID stále existují v `index.html` (řádky 117 a 60). Žádná render funkce nepředpokládá pořadí sourozenců — funguje s `getElementById`, ne s `:nth-child`.

**Tests.** `npm test` → **252/252 pass · 994 ms.** `npm run validate:data` → OK (80 indicators). `npm run validate:all` selhává JEN na pre-existujícím explainer error (`nv_307_2012`: invalid verification_status 'preliminary') — **bez vztahu** k tomuto redesignu.

---

## 2 · UX A VIZUÁLNÍ KONZISTENCE · ⚠️ MINOR

**Tone of voice (PR #286).** Tři odstavce „K čemu se HSPA dá použít" jsou přístupné, věcné, akteři přítomni (politik / ředitel nemocnice / analytik pojišťovny / pacient). Tón je v lince s `clanek-financovani-segmenty-2026.html` — žádná marketingová hyperbola („transformuje", „revoluce" chybí ✓). Druhý odstavec je ale **dlouhá souvětnatá zeď** (4 středníkem oddělené klauzule, ~75 slov) — funguje na desktopu, na mobilu vizuálně zdrží. Doporučení: rozbít na 2 odstavce nebo strukturovat jako bulletovaný seznam aktérů.

**Reading flow homepage.** Nové pořadí `ed-hero → home-articles → ed-narrative → ed-dims` funguje: čtenář dostane (1) klíčový stav, (2) články jako vstup k hloubce, (3) 4-step interpretační rámec, (4) konkrétní šestkové měření. Articles **před** narrativem je odvážný editorial krok — predikuje, že čtenář raději přistoupí přes konkrétní příběh než abstrakt — psychologicky obhájitelné.

**Mobile.** `.ed-narrative-grid` (`@media max-width: 560px → 1fr`) ✓. `.ed-dims-grid` (`@media max-width: 560px → 2fr`) ✓. CTA tlačítko na hspa-prehled.html:64 používá **inline styly** s `var(--accent)` — funguje, ale obchází design system (`.ed-promo-card` pattern už existuje pár řádků níže).

**A11y.** `.hspa-usecase-section` třída **nemá vlastní CSS pravidla** (`grep -c` → 0). Sekce dědí od parent kontextu — žádný padding ani border. Spoléhá na `<p class="hspa-dims-lead">` pro typografii. Kontrast OK, ale sekce vizuálně splývá s následující `hspa-dims-section`.

---

## 3 · SÉMANTIKA NAVIGACE · ⚠️ MINOR

**Mentální model.** Tematické linie jako podstránka HSPA přehledu je legitimní redakční rozhodnutí. Breadcrumb na `tematicke-linie.html:32–34` existuje a vede správně. CTA z `hspa-prehled.html:64` je **viditelné, ale řešené jako inline `<a>` s inline styly v posledním odstavci 3-odstavcového bloku** — riskuje se přehlédnutí. Lépe samostatná karta typu `.ed-promo-card` (existuje pár sekcí níže pro „Procházet indikátory" — stejný pattern by vyřešil i Tematické linie).

**Breadcrumb.** ✓ existuje, ✓ správný target, ✓ správné šipky.

**SEO.** `tematicke-linie.html` nemá `<meta name="robots">` (default = indexovat) ani `<link rel="canonical">`. Pokud má být sekundární vstup, doporučit redakci buď (a) přidat `<meta name="robots" content="noindex, follow">` nebo (b) `<link rel="canonical" href="https://.../hspa-prehled.html">`. Aktuálně Google bude indexovat OBĚ stránky jako rovnocenné — což oslabuje právě vytvořenou hierarchii.

---

## 4 · REGRESSION TESTS · ✅ PASS

```
npm test           → 252/252 pass
npm run validate:data  → OK 80 indicators
npm run validate:all   → FAIL (pre-existující explainer nv_307_2012, NESOUVISÍ)
```

---

## DOPORUČENÉ MICRO-EDITS (priorita ↓)

1. **[P1 · SEO]** `tematicke-linie.html` `<head>`: přidat `<meta name="robots" content="noindex, follow">` NEBO `<link rel="canonical" href="hspa-prehled.html">` — vyhnout se dvěma indexovaným vstupům do téhož obsahu.
2. **[P2 · UX]** `hspa-prehled.html:63–66`: nahradit inline-styled `<a>` za samostatnou kartu pattern `.ed-promo-card` (viz ř. 186–194) — zviditelní CTA, sjednotí design system.
3. **[P3 · CSS]** Přidat do `src/styles.css` blok `.hspa-usecase-section { padding: 40px; max-width: var(--max-w); margin: 0 auto; border-bottom: 1px solid var(--rule); }` (analogie `.hspa-dims-section`) — sekce má vlastní třídu bez pravidel, vizuálně splývá.
4. **[P4 · OBSAH]** `hspa-prehled.html:57–58`: rozbít druhý odstavec na 2 (politik+ředitel | analytik+pacient) nebo `<ul>` se 4 aktéry — souvětí je na mobilu obtížně skenovatelné.
