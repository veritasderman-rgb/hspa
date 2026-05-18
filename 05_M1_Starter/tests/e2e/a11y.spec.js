// A11y scan — axe-core proti každé hlavní stránce.
// Failuje na NOVÉ critical/serious violations (existující baseline porovnáno
// proti tests/e2e/__a11y-baseline__/{name}.json — pokud nový violation typ).

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '/',                     name: 'home' },
  { path: '/clanky.html',          name: 'articles-hub' },
  { path: '/hspa-prehled.html',    name: 'hspa-overview' },
  { path: '/tematicke-linie.html', name: 'themes' },
  { path: '/kraje.html',           name: 'regions' },
  { path: '/pojistenci.html',      name: 'insurees' },
  { path: '/prevence.html',        name: 'prevention' },
  { path: '/strategie.html',       name: 'strategies' },
  { path: '/glosar.html',          name: 'glossary' },
  { path: '/o-projektu.html',      name: 'about' },
  { path: '/jak-funguje.html',     name: 'how-it-works' },
];

for (const { path, name } of PAGES) {
  test(`a11y: ${name} — no critical/serious violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (blocking.length > 0) {
      console.error(`A11y violations for ${name}:`,
        blocking.map(v => `${v.impact}/${v.id}: ${v.description} (${v.nodes.length}×)`).join('\n  '));
    }
    expect(blocking, `Critical/serious axe violations on ${name}`).toEqual([]);
  });
}
