# WCAG 2.2 AA — axe-core baseline (2026-06-01)

Automatický sken (`npm run test:a11y`) · tagy: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa · 15 stránek.

**Celkem porušení pravidel: 37** (napříč stránkami; stejné pravidlo se může opakovat).

| Stránka | Porušení | Stav |
|---|---|---|
| `index.html` | 5 | ⚠️ 5 |
| `clanky.html` | 2 | ⚠️ 2 |
| `hspa-prehled.html` | 3 | ⚠️ 3 |
| `tematicke-linie.html` | 2 | ⚠️ 2 |
| `kraje.html` | 2 | ⚠️ 2 |
| `pojistenci.html` | 2 | ⚠️ 2 |
| `prevence.html` | 3 | ⚠️ 3 |
| `strategie.html` | 2 | ⚠️ 2 |
| `glosar.html` | 2 | ⚠️ 2 |
| `jak-funguje.html` | 3 | ⚠️ 3 |
| `o-projektu.html` | 2 | ⚠️ 2 |
| `redakce.html` | 2 | ⚠️ 2 |
| `indicator.html?id=nadeje_doziti_total` | 2 | ⚠️ 2 |
| `clanek-vydaje-prevence.html` | 3 | ⚠️ 3 |
| `404.html` | 2 | ⚠️ 2 |

## Porušená pravidla (agregováno)

### `aria-hidden-focus` — serious
ARIA hidden element must not be focusable or contain focusable elements  
Dokumentace: https://dequeuniversity.com/rules/axe/4.11/aria-hidden-focus?application=playwright  
Výskyt: 15 prvků na stránkách: `index.html`, `clanky.html`, `hspa-prehled.html`, `tematicke-linie.html`, `kraje.html`, `pojistenci.html`, `prevence.html`, `strategie.html`, `glosar.html`, `jak-funguje.html`, `o-projektu.html`, `redakce.html`, `indicator.html?id=nadeje_doziti_total`, `clanek-vydaje-prevence.html`, `404.html`

### `color-contrast` — serious
Elements must meet minimum color contrast ratio thresholds  
Dokumentace: https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright  
Výskyt: 963 prvků na stránkách: `index.html`, `clanky.html`, `hspa-prehled.html`, `tematicke-linie.html`, `kraje.html`, `pojistenci.html`, `prevence.html`, `strategie.html`, `glosar.html`, `jak-funguje.html`, `o-projektu.html`, `redakce.html`, `indicator.html?id=nadeje_doziti_total`, `clanek-vydaje-prevence.html`, `404.html`

### `link-in-text-block` — serious
Links must be distinguishable without relying on color  
Dokumentace: https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright  
Výskyt: 14 prvků na stránkách: `index.html`, `hspa-prehled.html`, `prevence.html`, `clanek-vydaje-prevence.html`

### `nested-interactive` — serious
Interactive controls must not be nested  
Dokumentace: https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=playwright  
Výskyt: 102 prvků na stránkách: `index.html`, `jak-funguje.html`

### `target-size` — serious
All touch targets must be 24px large, or leave sufficient space  
Dokumentace: https://dequeuniversity.com/rules/axe/4.11/target-size?application=playwright  
Výskyt: 110 prvků na stránkách: `index.html`

---

> Vygenerováno `tests/a11y/axe-scan.mjs`. Tento report slouží jako baseline pro postupné čištění (Proud A2/A3). Doplňkové WCAG 2.2 success criteria, které axe automaticky neověří (2.4.11 Focus Not Obscured, 2.5.7 Dragging, 2.5.8 Target Size, 3.2.6 Consistent Help), vyžadují manuální kontrolu — viz `docs/accessibility.md`.
