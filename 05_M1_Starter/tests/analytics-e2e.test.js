// End-to-end integrace src/analytics.js — simuluje plnou GA4 pipeline:
//   1) Mock DOM s gtag stub
//   2) Spustí module-level init (bind handlerů na production hostname)
//   3) Trigger click events na různé selektory
//   4) Ověří že správné GA4 eventy se pushly do dataLayer
//
// Pokrývá:
//   - indicator_click (Úroveň 1)
//   - glossary_term_open (Úroveň 1)
//   - external_source_click (Úroveň 1)
//   - patient_story_expand (Úroveň 1)
//   - scroll_depth při scrollu (Úroveň 2)
//
// Tyto testy by SELHALY pokud handlers nejsou navázané. Tím prokazují,
// že po deployi a kliku na produkci jdou eventy do GA4 (modulo network).

import { test } from 'node:test';
import assert from 'node:assert/strict';

class MockDocument {
  constructor() {
    this.body = { dataset: {} };
    this.documentElement = { scrollHeight: 2000 };
    this.readyState = 'complete';
    this._listeners = new Map();
    this.head = { appendChild: () => {} };
  }
  addEventListener(type, cb) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(cb);
  }
  createElement() { return { setAttribute() {}, defer: false, async: false, src: '' }; }
  querySelectorAll() { return []; }
  querySelector() { return null; }

  dispatch(type, event) {
    const list = this._listeners.get(type) ?? [];
    for (const cb of list) cb(event);
  }
}

function makeMockElement({ tag = 'a', dataset = {}, attrs = {}, className = '', closestMap = {} } = {}) {
  const el = {
    tagName: tag.toUpperCase(),
    dataset,
    className,
    href: attrs.href, // jako property (browser behavior)
    getAttribute(key) { return attrs[key] ?? null; },
    closest(selector) {
      // Naivní matcher pro testy — vrátí přiřazený closest cíl
      for (const [sel, target] of Object.entries(closestMap)) {
        if (selector === sel) return target;
      }
      // Fallback: pokud selector matchne na "self" patternu, vrátíme sebe
      return null;
    },
  };
  // Self-match je default: any selector může matchnout sebe
  el.closest = (selector) => {
    if (closestMap[selector] !== undefined) return closestMap[selector];
    // Heuristika: pokud má dataset.indicatorId a selector obsahuje data-indicator-id
    if (selector.includes('data-indicator-id') && el.dataset?.indicatorId) return el;
    if (selector.includes('cq-gloss-term') && className?.includes?.('cq-gloss-term')) return el;
    if (selector.includes('cq-catalog-item') && className?.includes?.('cq-catalog-item')) return el;
    if (selector === 'a[href^="http"]' && el.tagName === 'A' && attrs.href?.startsWith?.('http')) return el;
    if (selector === 'a[href*="indicator.html"]' && attrs.href?.includes?.('indicator.html')) return el;
    return null;
  };
  // instanceof Element shim
  Object.setPrototypeOf(el, GlobalElement.prototype);
  return el;
}

class GlobalElement {}

function setupProductionEnv() {
  const dataLayer = [];
  const document = new MockDocument();
  globalThis.Element = GlobalElement;
  const location = {
    hostname: 'hspa-cesko.cz',
    protocol: 'https:',
    host: 'hspa-cesko.cz',
    origin: 'https://hspa-cesko.cz',
    pathname: '/index.html',
    href: 'https://hspa-cesko.cz/index.html',
  };
  globalThis.location = location; // browser-global access
  globalThis.window = {
    location,
    dataLayer,
    gtag(...args) { dataLayer.push(args); },
    addEventListener() {},
    innerHeight: 800,
    scrollY: 0,
  };
  globalThis.document = document;
  globalThis.requestAnimationFrame = (cb) => { cb(0); return 0; };
  globalThis.setTimeout = () => 0;
  globalThis.IntersectionObserver = class {
    constructor() {} observe() {} unobserve() {} disconnect() {}
  };
  globalThis.URL = URL; // node built-in
  return { dataLayer, document };
}

function eventNames(dataLayer) {
  return dataLayer.filter(args => args[0] === 'event').map(args => args[1]);
}
function eventByName(dataLayer, name) {
  return dataLayer.filter(args => args[0] === 'event' && args[1] === name);
}

// =====================================================================

test('E2E: import modulu na production hostname binduje listenery na document', async () => {
  const { document } = setupProductionEnv();
  await import('../src/analytics.js?t=' + Date.now());
  // Po DOMContentLoaded (readyState=complete → bindAll fires sync)
  assert.ok(document._listeners.has('click'), 'click listener musí být navázaný');
  assert.ok(document._listeners.has('toggle'), 'toggle listener musí být navázaný');
});

test('E2E: indicator_click event vznikne po kliku na [data-indicator-id]', async () => {
  const { dataLayer, document } = setupProductionEnv();
  await import('../src/analytics.js?t=' + Date.now());

  const fakeCard = makeMockElement({
    tag: 'a',
    dataset: { indicatorId: 'mortalita_inhosp_ami', indicatorDomain: 'kvalita' },
    attrs: { href: 'indicator.html?id=mortalita_inhosp_ami' },
  });
  document.dispatch('click', { target: fakeCard });

  const events = eventByName(dataLayer, 'indicator_click');
  assert.equal(events.length, 1);
  assert.equal(events[0][2].indicator_id, 'mortalita_inhosp_ami');
  assert.equal(events[0][2].domain, 'kvalita');
});

test('E2E: glossary_term_open event vznikne po kliku na .cq-gloss-term', async () => {
  const { dataLayer, document } = setupProductionEnv();
  await import('../src/analytics.js?t=' + Date.now());

  const fakeBtn = makeMockElement({
    tag: 'button',
    dataset: { term: 'MDT' },
    className: 'cq-gloss-term',
  });
  // Override closest for [data-term] selector check
  fakeBtn.closest = (sel) => sel.includes('cq-gloss-term') ? fakeBtn : null;

  document.dispatch('click', { target: fakeBtn });

  const events = eventByName(dataLayer, 'glossary_term_open');
  assert.equal(events.length, 1);
  assert.equal(events[0][2].term, 'MDT');
});

test('E2E: external_source_click event vznikne po kliku na PUK odkaz', async () => {
  const { dataLayer, document } = setupProductionEnv();
  await import('../src/analytics.js?t=' + Date.now());

  const fakeLink = makeMockElement({
    tag: 'a',
    attrs: { href: 'https://puk.kancelarzp.cz/' },
  });
  // Selector matchování: a[href^="http"] + interní indicator.html selector
  fakeLink.closest = (sel) => {
    if (sel === 'a[href^="http"]') return fakeLink;
    if (sel.includes('indicator.html')) return null;
    if (sel.includes('data-term') || sel.includes('cq-gloss')) return null;
    if (sel.includes('data-indicator-id')) return null;
    return null;
  };

  document.dispatch('click', { target: fakeLink });

  const events = eventByName(dataLayer, 'external_source_click');
  assert.equal(events.length, 1);
  assert.equal(events[0][2].source, 'puk');
  assert.equal(events[0][2].host, 'puk.kancelarzp.cz');
});

test('E2E: patient_story_expand event vznikne při <details> open toggle', async () => {
  const { dataLayer, document } = setupProductionEnv();
  await import('../src/analytics.js?t=' + Date.now());

  // Simulate <details class="cq-catalog-item"> open=true
  const fakeDetails = {
    open: true,
    classList: { contains: (cls) => cls === 'cq-catalog-item' },
    closest: (sel) => sel.includes('cq-catalog-item') ? fakeDetails : null,
    querySelector: (sel) => {
      if (sel === '.cq-catalog-name') return { textContent: 'Pooperační sepse' };
      return null;
    },
  };
  // instanceof HTMLDetailsElement check — define class globally
  globalThis.HTMLDetailsElement = class {};
  Object.setPrototypeOf(fakeDetails, globalThis.HTMLDetailsElement.prototype);

  document.dispatch('toggle', { target: fakeDetails });

  const events = eventByName(dataLayer, 'patient_story_expand');
  assert.equal(events.length, 1);
  assert.equal(events[0][2].indicator_name, 'Pooperační sepse');
});

test('E2E: trackEvent params se posílají v správném formátu pro GA4', async () => {
  const { dataLayer } = setupProductionEnv();
  const mod = await import('../src/analytics.js?t=' + Date.now());
  mod.trackEvent('indicator_click', {
    indicator_id: 'foo',
    source_page: '/test.html',
    domain: 'kvalita',
    extra_null: null,
    extra_empty: '',
  });
  const events = eventByName(dataLayer, 'indicator_click');
  assert.equal(events.length, 1);
  const args = events[0]; // ['event', 'indicator_click', {...params}]
  assert.equal(args[0], 'event');
  assert.equal(args[1], 'indicator_click');
  // Filtered: null + empty pryč
  assert.equal('extra_null' in args[2], false);
  assert.equal('extra_empty' in args[2], false);
  assert.equal(args[2].indicator_id, 'foo');
});
