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

## Aktuální baseline (2026-06)

První automatický sken (`docs/a11y-baseline-2026-06.md`) napříč 15 stránkami
nalezl 5 typů porušení. Prioritizovaný backlog remediace (Proud A2/A3):

| Pravidlo | Závažnost | Rozsah | Poznámka |
|---|---|---|---|
| `color-contrast` | serious | ~960 prvků | Revize barevných tokenů; část může být na hraně poměru — vyžaduje design rozhodnutí. |
| `nested-interactive` | serious | ~100 (index, jak-funguje) | Interaktivní prvek vnořený v interaktivním — refaktor markupu. |
| `target-size` | serious | ~110 (index) | SC 2.5.8 — zvětšit klikací cíle / rozestupy. |
| `aria-hidden-focus` | serious | 15 (všechny stránky) | Sdílený prvek s `aria-hidden`, který obsahuje fokusovatelný obsah — jeden zásah ve sdílené komponentě. |
| `link-in-text-block` | serious | 14 | Odkazy odlišené jen barvou — doplnit podtržení. |

Remediace těchto bodů je samostatný pracovní proud (A2/A3); tento commit dodává
tooling, baseline a hardening (forced-colors / prefers-contrast / scroll-padding).
