# Audit homepage + nav redesign — 2026-05-16

**Scope:** PR #285 (homepage swap 3↔4 + topnav cleanup), PR #286 (HSPA přehled „K čemu se HSPA dá použít"), PR #287 (visual inventory, mimo scope homepage auditu).

**Reviewer:** independent subagent (general-purpose) spuštěný z konverzace 2026-05-16.

**Metoda:** strukturovaný 4-sekční audit dle promptu definovaného v plánu redesignu.

---

## Sekce 1 — Strukturální integrita: ✅ PASS

- Validní HTML pro všechny 3 dotčené stránky (`index.html`, `hspa-prehled.html`, `tematicke-linie.html`): vyrovnané `<section>`, žádné duplicate `id`.
- 0 výskytů `renderModuleNav('themes')` napříč repem — žádná stránka neaktivuje odebraný tab.
- `src/themes.js:225` korektně volá `renderModuleNav('hspa-prehled')`.
- Jediný odkaz na `tematicke-linie.html` z `hspa-prehled.html:64` (legitimní podstránka). Topnav v `src/page-shared.js` čistý.
- Žádný odkaz JS render funkcí na DOM sekci přesunutou v homepage.
- `npm test` → **252/252 PASS**. `npm run validate:data` → OK 80 indikátorů.

---

## Sekce 2 — UX a vizuální konzistence: ⚠️ MINOR

- **Tone of voice** nové sekce „K čemu se HSPA dá použít" je věcný, přístupný; akteři (politik / ředitel / analytik / pacient) přítomni; bez marketingového hyperbolu. Soulad s `clanek-financovani-segmenty-2026.html` a stávajícím `hspa-hero`.
- **Druhý odstavec sekce** v původní verzi byl 75-slovní zeď (mikrocharakteristika 4 různých aktérů v jedné větě), pro mobilní čtení nepříjemná. **Doporučení: rozbít na 2 kratší odstavce.**
- **Reading flow homepage** funguje — ed-hero (kontext) → home-articles (čerstvý obsah) → ed-narrative (4-step orientace) → ed-dims (technický framework grid) je logická posloupnost.
- **Mobilní layout** OK — `.ed-narrative-grid` a `.ed-dims-grid` mají breakpoints na `<720px`. Žádný horizontal overflow.
- **Třída `.hspa-usecase-section` nemá vlastní CSS pravidlo** (`grep -c .hspa-usecase 05_M1_Starter/src/styles.css` → 0) — sekce vizuálně splývá s navazující `.hspa-dims-section`, ztrácí se oddělení. **Doporučení: doplnit CSS rule s vlastním pozadím / borderem.**
- Accessibility: tab order OK, lang dědí z `<html lang="cs">`, kontrast textových barev na ed-bg pasivně ≥ 4.5:1.

---

## Sekce 3 — Sémantika navigace: ⚠️ MINOR

- **Mentální model navigace** zachován — uživatel se na Tematické linie dostane z HSPA přehledu (CTA na konci sekce „K čemu se HSPA dá použít"). Po opening `tematicke-linie.html` se v topnavu aktivuje **HSPA přehled**, breadcrumb „← HSPA přehled" v hlavičce stránky.
- **Breadcrumb** existuje a vede správně na `hspa-prehled.html`.
- **CTA odkaz na Tematické linie** v původní verzi řešen jako inline-styled `<a>` v posledním odstavci sekce — riskuje přehlédnutí mezi rétorickými větami. **Doporučení: převést na samostatný `.ed-promo-card` pattern** (stejně jako CTA „Procházet všechny indikátory" v dolní části HSPA přehledu).
- **SEO**: `tematicke-linie.html` nemá `<meta name="robots" content="noindex">` ani `<link rel="canonical">`. Google bude indexovat oba vstupy (HSPA přehled i Tematické linie) jako rovnocenné — ztrácí se právě vytvořená hierarchie. **Doporučení: přidat `canonical` na `hspa-prehled.html` nebo `noindex` na Tematické linie.**

---

## Sekce 4 — Regression tests: ✅ PASS

- `npm test` → **252/252 PASS**.
- `npm run validate:all` selhává pouze na pre-existujícím explainer `nv_307_2012` (mimo scope tohoto auditu, hlášeno už dříve).

---

## Doporučené micro-edits (seřazené podle priority)

1. **Přidat `<link rel="canonical" href="https://hspa-cesko.cz/hspa-prehled.html">` na `tematicke-linie.html`** — odstraní SEO ambiguitu mezi paralelními vstupy.
2. **Převést inline CTA v `hspa-prehled.html:64` na `.ed-promo-card`** — sjednocení s patternem v rámci stránky, lepší viditelnost.
3. **Doplnit CSS pravidlo pro `.hspa-usecase-section`** v `src/styles.css` — visual separation od navazující sekce.
4. **Rozbít dlouhý 75-slovní druhý odstavec** v sekci „K čemu se HSPA dá použít" na 2 kratší odstavce — lepší čtení na mobilu.

---

*Status*: micro-edits 1–4 aplikovány v PR navazujícím na tento audit. Plný subagent transkript není uložen — toto je redakční rekapitulace klíčových zjištění.
