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
  // Stabilní článek drží v gate pokrytí sdílené article šablony (CSS/JS).
  // Visual snapshot článku je vynechán (nedeterministické count-up animace),
  // ale axe analýza je deterministická.
  { path: '/clanek-vydaje-prevence.html', name: 'article-sample' },
];

// Známé color-contrast výjimky: brand/sémantické akcenty těsně pod prahem 4.5:1
// (dimenze „kvalita" #a36728 ≈ 4,37; warn #b45f06 ≈ 4,32) — rozhodnutí vlastníka
// palety, viz docs/accessibility.md. Vyřazujeme JEN tyto konkrétní barvy popředí;
// jakákoli NOVÁ kontrastní regrese (jiná barva) zůstává blokující.
const ALLOWED_CONTRAST_FG = new Set(['#a36728', '#b45f06']);

for (const { path, name } of PAGES) {
  test(`a11y: ${name} — no critical/serious violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      // Vyřazujeme vnořený cizí (cross-origin) přehrávač podcastu z Google Drive
      // (.hspa-podcast-player iframe na o-projektu.html a hspa-prehled.html).
      // axe-core prochází i do iframe a hlásí aria-prohibited-attr na role-less
      // <div aria-label> uvnitř GOOGLE markup přehrávače — to je third-party DOM,
      // který nevlastníme ani nemůžeme opravit. Gate nesmí blokovat na cizím
      // obsahu; vlastní stránku axe nadále skenuje celou. (Obdoba vlastníkem
      // schválené výjimky ALLOWED_CONTRAST_FG níže.)
      .exclude('.hspa-podcast-player iframe')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    // color-contrast zůstává AKTIVNÍ; jen u známých brand akcentů odfiltrujeme
    // jejich uzly. Zbydou-li jiné kontrastní uzly, jde o novou regresi → fail.
    const violations = results.violations
      .map(v => v.id !== 'color-contrast' ? v : {
        ...v,
        nodes: v.nodes.filter(n => !ALLOWED_CONTRAST_FG.has(n.any?.[0]?.data?.fgColor)),
      })
      .filter(v => v.nodes.length > 0);
    const blocking = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (blocking.length > 0) {
      console.error(`A11y violations for ${name}:`,
        blocking.map(v => `${v.impact}/${v.id}: ${v.description} (${v.nodes.length}×)`).join('\n  '));
    }
    expect(blocking, `Critical/serious axe violations on ${name}`).toEqual([]);
  });
}
