// Testy pro src/analytics.js — custom eventy a delegated event handling.
//
// Pure helper functions tested standalone (extractIndicatorId, isLocalEnv).
// Plus simulated DOM events for delegated handlers.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Setup minimal DOM mocks BEFORE import
const ORIGINAL_GLOBAL = { window: globalThis.window, document: globalThis.document };

function setupMockDom({ hostname = 'example.com', protocol = 'https:' } = {}) {
  const listeners = new Map();
  const dataLayer = [];
  const gtagCalls = [];

  const documentMock = {
    body: { dataset: {} },
    readyState: 'complete',
    addEventListener(type, cb, opts) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ cb, opts });
    },
    createElement: () => ({ setAttribute() {}, src: '', defer: false, async: false }),
    head: { appendChild() {} },
  };

  globalThis.window = {
    location: { hostname, protocol, host: hostname, origin: `${protocol}//${hostname}`, pathname: '/test.html' },
    dataLayer,
    gtag(...args) { gtagCalls.push(args); dataLayer.push(args); },
  };
  globalThis.document = documentMock;

  return { listeners, gtagCalls, dataLayer };
}

function restoreDom() {
  globalThis.window = ORIGINAL_GLOBAL.window;
  globalThis.document = ORIGINAL_GLOBAL.document;
}

// =====================================================================

test('extractIndicatorId — z data-indicator-id atributu', async () => {
  setupMockDom();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  const { extractIndicatorId } = mod.__test__;
  const fakeEl = { dataset: { indicatorId: 'mortalita_inhosp_ami' }, getAttribute: () => null };
  assert.equal(extractIndicatorId(fakeEl), 'mortalita_inhosp_ami');
  restoreDom();
});

test('extractIndicatorId — z href ?id=… (relative URL)', async () => {
  setupMockDom();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  const { extractIndicatorId } = mod.__test__;
  const fakeEl = { dataset: {}, getAttribute: (k) => k === 'href' ? 'indicator.html?id=nadeje_doziti_total' : null };
  assert.equal(extractIndicatorId(fakeEl), 'nadeje_doziti_total');
  restoreDom();
});

test('extractIndicatorId — vrací null pro element bez ID', async () => {
  setupMockDom();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  const { extractIndicatorId } = mod.__test__;
  assert.equal(extractIndicatorId(null), null);
  assert.equal(extractIndicatorId({ dataset: {}, getAttribute: () => null }), null);
  assert.equal(extractIndicatorId({ dataset: {}, getAttribute: () => 'somewhere.html' }), null);
  restoreDom();
});

test('isLocalEnv — detekuje localhost', async () => {
  setupMockDom({ hostname: 'localhost' });
  const mod = await import('../src/analytics.js?t=' + Date.now());
  assert.equal(mod.__test__.isLocalEnv(), true);
  restoreDom();
});

test('isLocalEnv — detekuje 127.0.0.1', async () => {
  setupMockDom({ hostname: '127.0.0.1' });
  const mod = await import('../src/analytics.js?t=' + Date.now());
  assert.equal(mod.__test__.isLocalEnv(), true);
  restoreDom();
});

test('isLocalEnv — detekuje file:// protokol', async () => {
  setupMockDom({ hostname: '', protocol: 'file:' });
  const mod = await import('../src/analytics.js?t=' + Date.now());
  assert.equal(mod.__test__.isLocalEnv(), true);
  restoreDom();
});

test('isLocalEnv — produkce (hspa-cesko.cz) → false', async () => {
  setupMockDom({ hostname: 'hspa-cesko.cz' });
  const mod = await import('../src/analytics.js?t=' + Date.now());
  assert.equal(mod.__test__.isLocalEnv(), false);
  restoreDom();
});

test('TRACKED_EXTERNAL_SOURCES — obsahuje klíčové primární zdroje', async () => {
  setupMockDom();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  const sources = mod.__test__.TRACKED_EXTERNAL_SOURCES;
  const sourceKeys = sources.map(s => s.source);
  assert.ok(sourceKeys.includes('puk'));
  assert.ok(sourceKeys.includes('uzis'));
  assert.ok(sourceKeys.includes('oecd'));
  assert.ok(sourceKeys.includes('indiko'));
  assert.ok(sourceKeys.includes('sukl'));
  assert.ok(sourceKeys.includes('eurostat'));
  restoreDom();
});

test('trackEvent — no-op kdyz gtag chybí', async () => {
  setupMockDom();
  // Odebereme gtag
  delete globalThis.window.gtag;
  const mod = await import('../src/analytics.js?t=' + Date.now());
  // Should not throw
  assert.doesNotThrow(() => mod.trackEvent('test_event', { foo: 'bar' }));
  restoreDom();
});

test('trackEvent — volá window.gtag s eventem', async () => {
  const ctx = setupMockDom();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  mod.trackEvent('indicator_click', { indicator_id: 'foo', source_page: '/test' });
  // Najdeme volání event (může jich být víc kvůli GA init)
  const eventCalls = ctx.gtagCalls.filter(c => c[0] === 'event');
  assert.equal(eventCalls.length, 1);
  assert.equal(eventCalls[0][1], 'indicator_click');
  assert.equal(eventCalls[0][2].indicator_id, 'foo');
  restoreDom();
});

test('trackEvent — filtruje null/undefined/prázdné parametry', async () => {
  const ctx = setupMockDom();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  mod.trackEvent('test', { good: 'value', empty: '', nullish: null, undef: undefined });
  const eventCalls = ctx.gtagCalls.filter(c => c[0] === 'event');
  const params = eventCalls[eventCalls.length - 1][2];
  assert.equal(params.good, 'value');
  assert.equal('empty' in params, false);
  assert.equal('nullish' in params, false);
  assert.equal('undef' in params, false);
  restoreDom();
});
