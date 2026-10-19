// Pásek „Na kafe“ (Stripe Payment Link, 50 Kč) — statické regresní kontroly.
// Hlídá, že odkaz míří na hostovanou platební stránku Stripe, že pásek je
// součástí sdílené patičky i fallbacku pro stránky bez #siteFooter a že má CSS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KAFE_URL, KAFE_AMOUNT_LABEL, kafeStripHtml } from '../src/page-shared.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shared = readFileSync(resolve(ROOT, 'src', 'page-shared.js'), 'utf8');
const css = readFileSync(resolve(ROOT, 'src', 'styles.css'), 'utf8');

test('KAFE_URL je hostovaný Stripe Payment Link (https, donate.stripe.com)', () => {
  assert.match(KAFE_URL, /^https:\/\/donate\.stripe\.com\/[A-Za-z0-9]+$/);
  assert.equal(KAFE_AMOUNT_LABEL, '50 Kč');
});

test('kafeStripHtml: text výzvy, částka a bezpečný odkaz do nového okna', () => {
  const html = kafeStripHtml();
  assert.match(html, /Líbí se vám náš web\? Přidejte mi na kafe 50 Kč\./);
  assert.match(html, /id="kafeStrip"/);
  assert.match(html, new RegExp(`href="${KAFE_URL.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"`));
  assert.match(html, /target="_blank"[^>]*rel="noopener"/);
  assert.match(html, /Přispět 50 Kč/);
  // žádný Stripe SDK, iframe ani script — jen odkaz
  assert.doesNotMatch(html, /<script|<iframe/i);
});

test('page-shared.js: pásek je ve sdílené patičce a fallback běží z renderModuleNav', () => {
  assert.match(shared, /export function renderFooter[\s\S]*?\$\{kafeStripHtml\(\)\}[\s\S]*?<div class="row">/, 'renderFooter vkládá kafeStripHtml() před sloupce patičky');
  assert.match(shared, /export function renderModuleNav[\s\S]*?renderKafeStrip\(\);/, 'renderModuleNav volá renderKafeStrip()');
  assert.match(shared, /export function renderKafeStrip[\s\S]*?getElementById\('siteFooter'\)\) return;/, 'fallback mlčí tam, kde je #siteFooter (jinak by byl pásek dvakrát)');
  assert.match(shared, /querySelector\('footer\.site-footer'\)/, 'starší články: pásek před statický <footer class="site-footer">');
});

test('CSS: .kafe-strip existuje, používá tokeny a v patičce nemá horizontální přetečení mimo footer', () => {
  assert.match(css, /\.kafe-strip\s*\{[^}]*var\(--paper\)/s);
  assert.match(css, /\.kafe-btn[^{]*\{[^}]*min-height:\s*44px/s, 'tlačítko má dotykovou výšku 44px');
  assert.match(css, /footer\.bottom \.kafe-strip\s*\{[^}]*margin:\s*0 calc\(-1 \* var\(--content-pad/s, 'záporné okraje jen uvnitř footer.bottom');
  assert.match(css, /@media print\s*\{\s*\.kafe-strip\s*\{\s*display:\s*none/s, 'v tisku skrytý');
});
