// Visual regression smoke test — každá hlavní stránka × 3 viewporty.
// Snapshot baseline se commitne (gitignored: tests/e2e/__screenshots__).
// Selhání = vizuální regrese mimo toleranci (maxDiffPixelRatio 0.01 = 1 %).
//
// Update baseline po vědomé změně: npm run test:e2e -- --update-snapshots

import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/',                            name: 'home' },
  { path: '/clanky.html',                 name: 'articles-hub' },
  { path: '/hspa-prehled.html',           name: 'hspa-overview' },
  { path: '/tematicke-linie.html',        name: 'themes' },
  { path: '/kraje.html',                  name: 'regions' },
  { path: '/pojistenci.html',             name: 'insurees' },
  { path: '/prevence.html',               name: 'prevention' },
  { path: '/strategie.html',              name: 'strategies' },
  { path: '/glosar.html',                 name: 'glossary' },
  { path: '/o-projektu.html',             name: 'about' },
  { path: '/jak-funguje.html',            name: 'how-it-works' },
  { path: '/clanek-akutni-infarkt.html',  name: 'article-sample' },
];

for (const { path, name } of PAGES) {
  test(`visual: ${name}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    // Vypni animace + počkej na async fetch dokončení
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
