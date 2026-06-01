# Accessibility (WCAG 2.2 AA)

Jak udržovat a ověřovat přístupnost dashboardu Zdravé Česko. Cílová úroveň: **WCAG 2.2 AA**.

## Jak spustit automatický sken

```bash
cd 05_M1_Starter
npm install
npx playwright install chromium   # jednorázově – stáhne headless prohlížeč
npm run test:a11y                 # report-only, zapíše docs/a11y-baseline-YYYY-MM.md
npm run test:a11y:ci              # CI gate: exit 1 při critical/serious violations
```

Skener `tests/a11y/axe-scan.mjs` spustí lokální statický server, projede
reprezentativní průřez stránek headless Chromiem a na každé spustí
[axe-core](https://github.com/dequelabs/axe-core) s tagy
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`. Výsledek agreguje do markdown
reportu (`docs/a11y-baseline-*.md`).

> Skript je záměrně mimo `npm test` (soubor `.mjs`, ne `.test.js`), aby
> prostředí bez staženého prohlížeče neblokovalo hlavní testovou sadu. Pokud
> Playwright/Chromium chybí, skener vypíše návod a skončí s exit 0.

## Co axe NEověří — manuální checklist (WCAG 2.2 novinky)

Automatický sken nepokryje všechna AA kritéria verze 2.2. Tyto kontroluj ručně
(zejm. při změně navigace, mapy, filtrů, formulářů):

| SC | Kritérium | Co ověřit |
|---|---|---|
| **2.4.11** | Focus Not Obscured (Min) | Zafokusovaný prvek nesmí být schovaný pod sticky lištou. Řešeno `html { scroll-padding-top }` v `styles.css`; ověř při tabování pod horním menu. |
| **2.5.7** | Dragging Movements | Vše ovladatelné tažením (mapa krajů) musí jít i klikem/klávesnicí. Mapa: `cz-map.js` má `tabindex`/`role=button` na dlaždicích. |
| **2.5.8** | Target Size (Min) | Klikací cíle ≥ 24×24 px nebo dostatečný rozestup. Sleduj nav chipy, filtry, TOC, paginaci. Viz `target-size` v baseline reportu. |
| **3.2.6** | Consistent Help | Vyhledávání/nápověda na konzistentním místě napříč stránkami (sdílený `page-shared.js`). |
| **3.3.7 / 3.3.8** | Redundant Entry / Accessible Auth | N/A — web nemá přihlášení ani vstupní formuláře (kromě fulltextu). |

## Konvence pro přístupný kód

- **Dekorativní prvky**: `aria-hidden="true"` jen na prvcích, které **neobsahují
  fokusovatelný obsah** (jinak axe `aria-hidden-focus`). Pokud musí být skryté
  i fokusovatelné dítě, dej mu `tabindex="-1"`.
- **Ikony**: dekorativní SVG/emoji → `aria-hidden="true"`; významové → `aria-label`.
- **Odkazy v textu**: nesmí být odlišené jen barvou (SC 1.4.1). V textových
  blocích preferuj podtržení (řešeno i v `prefers-contrast: more`).
- **Nested interactive**: nevkládej interaktivní prvek do interaktivního
  (`<a>`/`<button>` uvnitř `<button>`/`<summary>`/odkazu).
- **Fokus**: spoléhej na sdílené `:focus-visible` styly (`styles.css` ~ř. 38, 781).
  Nepřidávej `outline: none` bez náhrady.
- **Jazyk**: `<html lang="cs">` na každé stránce.
- **Skip-link**: `<a class="skip-link" href="#content">` jako první fokusovatelný prvek.
- **Pohyb**: nové animace obal do `@media (prefers-reduced-motion: reduce)`.

## Stav remediace (2026-06)

První sken našel **37 porušení / 5 pravidel**. Po remediaci (Proud A2/A3)
zbývají **3 porušení** (−92 %). Aktuální stav viz `docs/a11y-baseline-2026-06.md`.

| Pravidlo | Výchozí | Nyní | Co se udělalo |
|---|---|---|---|
| `aria-hidden-focus` | 15 | ✅ 0 | `#mobileNavDrawer` dostává `inert` při zavření (`page-shared.js`). |
| `nested-interactive` | 102 | ✅ 0 | `.indicator-card` už není `role=button` — jediný interaktivní prvek je odkaz „Detail →" (`app.js`); SVG schéma `role=img`→`role=group` (`jak-funguje.html`). |
| `target-size` (SC 2.5.8) | 110 | ✅ 0 | `.ed-narrative-links a` min-height 24 px (`styles.css`). |
| `link-in-text-block` | 14 | ✅ 0 | Podtržení inline odkazů v textových blocích (`styles.css`). |
| `color-contrast` | 963 | ⚠️ 3 | `--ink-mut2` ztmaven na alpha 0.64 (954 nodů); `.theme-meta-good` zeleň ztmavena. |

**Zbývající 3 `color-contrast`** jsou brand/sémantické akcenty těsně pod prahem
(dimenze „kvalita" `#a36728` ≈ 4,37:1; warn signál `#b45f06` ≈ 4,32:1; cíl 4,5:1).
Jde o paletové barvy používané napříč webem — jejich úprava je **rozhodnutí
vlastníka palety**, ne mechanický fix, proto je vědomě neměníme blind.
