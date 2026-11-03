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
  { path: '/pojistovny.html',             name: 'insurers' },
  // Podstránky srovnávače (P1.6, PLAN-SROVNAVAC-POJISTOVEN.md § 2.8)
  { path: '/pojistovny-kmen.html',        name: 'insurers-kmen' },
  { path: '/pojistovny-penize.html',      name: 'insurers-penize' },
  { path: '/pojistovny-prevence.html',    name: 'insurers-prevence' },
  { path: '/pojistovny-aplikace.html',    name: 'insurers-aplikace' },
  { path: '/pojistovny-gramotnost.html',  name: 'insurers-gramotnost' },
  { path: '/pojistovny-metodika.html',    name: 'insurers-metodika' },
  { path: '/pojistovny-indikatory.html',  name: 'insurers-indikatory' },
  { path: '/pojistovny-instituce.html',   name: 'insurers-instituce' },
  { path: '/pojistovna.html?zp=111',      name: 'insurers-profil' },
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

// Tmavý režim: web nesleduje prefers-color-scheme, motiv se přepíná ručně
// (src/page-shared.js initThemeEarly, localStorage 'hspa-theme' → data-theme).
// Snapshot dark varianty drží tokenový přepínač stránek, které mají vlastní
// barevné plochy (srovnávač pojišťoven: .zpc-lvl-*, karty, matice).
const DARK_PAGES = [
  { path: '/pojistovny.html', name: 'insurers' },
  // z podstránek jen kmen (nejvíc barevných ploch); ostatní sdílejí tytéž tokeny, baseline nebobtná
  { path: '/pojistovny-kmen.html', name: 'insurers-kmen' },
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

async function settle(page) {
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
}

// Viewport-only snapshot (ne fullPage): výška snímku je dána viewportem,
// takže přidání/odebrání obsahu na stránce (nový článek v hubu, delší
// homepage, data refresh) už NEzpůsobí size-mismatch fail. Zachytává
// regrese layoutu/CSS „nad ohybem"; přístupnost celé stránky pokrývá
// a11y.spec.js. Robustní vůči obsahovému driftu — viz docs/traps.md.
// <canvas> grafy (Chart.js sparklines, donuty) renderují nedeterministicky;
// .masthead-date se mění každý den — obojí maskujeme, aby diff nehlásil
// falešné regrese.
function shot(page, file) {
  return expect(page).toHaveScreenshot(file, {
    fullPage: false,
    mask: [page.locator('canvas'), page.locator('.masthead-date')],
  });
}

for (const { path, name } of PAGES) {
  test(`visual: ${name}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await settle(page);
    await shot(page, `${name}.png`);
  });
}

for (const { path, name } of DARK_PAGES) {
  test(`visual: ${name} (dark)`, async ({ page }) => {
    // Motiv nastavíme už před načtením stránky (render JS čte currentTheme),
    // a po načtení ho pro jistotu vynutíme i na <html>.
    await page.addInitScript(() => {
      try { localStorage.setItem('hspa-theme', 'dark'); } catch (_) { /* bez storage */ }
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await settle(page);
    await shot(page, `${name}-dark.png`);
  });
}
