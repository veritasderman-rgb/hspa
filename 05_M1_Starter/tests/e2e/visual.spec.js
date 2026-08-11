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
  { path: '/jak-funguje.html',            name: 'how-it-works' },
  // Pozn.: dlouhé články (clanek-*.html) se z vizuálních snapshotů vynechávají —
  // Article Visuals používají JS count-up animace (requestAnimationFrame), které
  // CSS `animation:none` nezastaví, takže snapshot padá na nedeterministický
  // frame. Přístupnost článků pokrývá a11y.spec.js; layout dashboardových
  // stránek (stabilní) pokrývají snapshoty výše.
  //
  // o-projektu.html (about) je rovněž vyřazena z VISUAL snapshotu: její
  // fullPage výška kolísá o ±1px mezi běhy (sub-pixel zaokrouhlení dlouhé
  // textové stránky + async [data-stat] skóre), což působí nedeterministický
  // size mismatch. Přístupnost about pokrývá a11y.spec.js.
];

test.beforeEach(async ({ page }) => {
  // Awareness popup (Týden zdraví) se od PR #898 zobrazuje takřka okamžitě
  // (300 ms) jako centrovaný modal s podkladem přes celou stránku — během
  // kampaně by překryl KAŽDÝ snapshot (~85 % pixelů diff) a mimo kampaň by
  // zmizel, takže baseline by nebyla stabilní. Totéž platí pro sezonní popup
  // „průvodce vedry" (vedra-popup.js, okno 1. 6. – 31. 8.), který od
  // 10. 8. 2026 přebíral přednost, jakmile je awareness vypnutý, a překryl
  // každý snapshot. Pro vizuální regresi všechny tři popupy deterministicky
  // vypneme přes idempotentní guard flagy modulů (awareness-popup.js /
  // newsletter-popup.js / vedra-popup.js kontrolují window.__*PopupInit
  // a s nastaveným flagem se vůbec neinicializují).
  await page.addInitScript(() => {
    window.__awPopupInit = true;
    window.__nlPopupInit = true;
    window.__vdPopupInit = true;
  });
});

for (const { path, name } of PAGES) {
  test(`visual: ${name}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    // Vypni animace + počkej na async fetch dokončení a načtení fontů
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    // Počkej, až se naplní [data-stat] placeholdery (skóre/počty se dopočítají
    // async z dat) — dokud drží „—", mění se výška stránky o ±1px mezi běhy
    // a fullPage snapshot je nedeterministický (size mismatch).
    await page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('[data-stat]'));
      return els.length === 0 || els.every(el => el.textContent.trim() !== '—');
    }, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      // Viewport-only snapshot (ne fullPage): výška snímku je dána viewportem,
      // takže přidání/odebrání obsahu na stránce (nový článek v hubu, delší
      // homepage, data refresh) už NEzpůsobí size-mismatch fail. Zachytává
      // regrese layoutu/CSS „nad ohybem"; přístupnost celé stránky pokrývá
      // a11y.spec.js. Robustní vůči obsahovému driftu — viz docs/traps.md.
      fullPage: false,
      // <canvas> grafy (Chart.js sparklines, donuty) renderují nedeterministicky;
      // .masthead-date se mění každý den — obojí maskujeme, aby diff nehlásil
      // falešné regrese.
      mask: [page.locator('canvas'), page.locator('.masthead-date')],
    });
  });
}
