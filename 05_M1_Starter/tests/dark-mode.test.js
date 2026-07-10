// U28 Dark mode — statické regresní kontroly (bez DOM).
// Chrání tokenový dark blok v CSS, přepínač v page-shared.js a build minifikátu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(ROOT, 'src', 'styles.css'), 'utf8');
const min = readFileSync(resolve(ROOT, 'src', 'styles.min.css'), 'utf8');
const shared = readFileSync(resolve(ROOT, 'src', 'page-shared.js'), 'utf8');

test('CSS: dark téma přes data-theme i prefers-color-scheme', () => {
  assert.match(css, /:root\[data-theme="dark"\]/, 'ruční toggle přepínač');
  assert.match(css, /@media\s*\(prefers-color-scheme:\s*dark\)/, 'systémový default');
  // bázové tokeny se v dark bloku přepisují
  assert.match(css, /\[data-theme="dark"\][^{]*\{[^}]*--paper:\s*#17140f/s, '--paper dark');
  assert.match(css, /\[data-theme="dark"\][^{]*\{[^}]*--ink:\s*#ece5d8/s, '--ink dark');
});

test('CSS: dark tokeny jsou i v minifikátu (build proběhl)', () => {
  // minifikátor strhne uvozovky v atributovém selektoru → [data-theme=dark]
  assert.match(min, /data-theme=["']?dark["']?/, 'styles.min.css obsahuje dark blok — spusť npm run build:css');
  assert.ok(min.includes('#17140f'), 'dark --paper v minifikátu');
});

test('page-shared.js: exportuje přepínač tématu a brzkou inicializaci', () => {
  assert.match(shared, /export function themeToggleHtml/, 'themeToggleHtml export');
  assert.match(shared, /export function wireThemeToggle/, 'wireThemeToggle export');
  assert.match(shared, /export function currentTheme/, 'currentTheme export');
  assert.match(shared, /localStorage\.getItem\(THEME_KEY\)/, 'čte uloženou volbu');
  assert.match(shared, /container\.innerHTML\s*=\s*desktopTabsHtml\s*\+\s*searchTriggerHtml\s*\+\s*themeToggleHtml\(\)/, 'toggle je v nav liště');
});

test('page-shared.js: brzká inicializace je odolná (try/catch bez DOM)', () => {
  // IIFE initThemeEarly musí být obalená try/catch, aby import v node prostředí nespadl
  assert.match(shared, /function initThemeEarly\(\)\s*\{\s*try\s*\{/s, 'initThemeEarly má try blok');
});
