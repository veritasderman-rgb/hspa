# E2E testy (Playwright + axe-core)

Visual regression + a11y scan napříč 3 viewporty (375 / 768 / 1280 px).

## Lokální spuštění

```bash
cd 05_M1_Starter

# Jednorázová instalace browser binaries
npx playwright install --with-deps chromium

# Všechny e2e testy
npm run test:e2e

# Jen vizuální snapshots
npm run test:e2e:visual

# Jen a11y axe scan
npm run test:e2e:a11y

# Update baseline po vědomé designové změně
npm run test:e2e -- --update-snapshots
git add tests/e2e/*-snapshots
```

## V CI

`.github/workflows/visual-a11y.yml` se spouští na každý PR proti `main`,
který se dotýká `05_M1_Starter/**`. Failuje pokud:

- vizuální regrese > 1 % pixelů (`maxDiffPixelRatio: 0.01`)
- nová critical/serious axe violation (wcag2aa + wcag21aa tagy)

Při failure se uploaduje `playwright-report/` jako artifact (retention 14 dní).

## Struktura

- `tests/e2e/visual.spec.js` — visual regression: 12 stránek × 3 viewporty
- `tests/e2e/a11y.spec.js` — axe-core scan: 11 stránek × 3 viewporty
- `tests/e2e/visual.spec.js-snapshots/` — baseline screenshots (commitnuté)
- `playwright.config.js` — konfigurace v root `05_M1_Starter/`

## Snapshot strategy

První commit nemá baseline → první lokální run musí běžet s `--update-snapshots`
pro vytvoření initial baseline. Pak se commitne `tests/e2e/visual.spec.js-snapshots/`.
Další PR pak baseline vs. preview porovnává.

Pokud designová změna vědomě mění layout, run `--update-snapshots` a commitnout
nový baseline jako součást stejného PR.
