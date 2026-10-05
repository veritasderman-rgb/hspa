// Herní newsletter popup — čistá část (text podle hooku a data) + varianty
// session limitu v newsletter-popup.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameNewsletterCopy, GENERIC_GAME_COPY, armGameNewsletter } from '../src/hra-newsletter.js';
import { shouldShowPopup, sessionBlocks } from '../src/newsletter-popup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vyhlaska-hra.json'), 'utf8'));
const HOOK = doc.newsletter_hook;

test('gameNewsletterCopy: do termínu hook z dat (srovnání se skutečnou vyhláškou), po termínu fallback', () => {
  const before = gameNewsletterCopy(HOOK, '2026-10-05');
  assert.equal(before.headline, HOOK.headline);
  assert.equal(before.lead, HOOK.lead);
  assert.equal(before.cta, HOOK.cta);
  const onDay = gameNewsletterCopy(HOOK, HOOK.valid_until);
  assert.equal(onDay.headline, HOOK.headline, 'valid_until platí včetně');
  const after = gameNewsletterCopy(HOOK, '2027-01-01');
  assert.equal(after.headline, HOOK.fallback_headline);
  assert.equal(after.lead, HOOK.fallback_lead);
  assert.notEqual(after.headline, HOOK.headline);
});

test('gameNewsletterCopy: bez hooku nebo s neúplným hookem → obecný herní text', () => {
  assert.deepEqual(gameNewsletterCopy(null), GENERIC_GAME_COPY);
  assert.deepEqual(gameNewsletterCopy(undefined), GENERIC_GAME_COPY);
  const partial = gameNewsletterCopy({ valid_until: '2099-01-01' }, '2026-10-05');
  assert.equal(partial.headline, GENERIC_GAME_COPY.headline, 'hook bez headline/lead se nepoužije');
});

test('session limit per varianta: generická nikdy podruhé, herní nezávisle na generické', () => {
  assert.equal(sessionBlocks({}, 'generic'), false);
  assert.equal(sessionBlocks({ shown: true }, 'generic'), true, 'starý formát = generická');
  assert.equal(sessionBlocks({ shown: 'generic' }, 'generic'), true);
  assert.equal(sessionBlocks({ shown: 'generic' }, 'hra'), false, 'herní smí po generické');
  assert.equal(sessionBlocks({ shown: 'hra' }, 'hra'), true, 'herní jen jednou');
  assert.equal(sessionBlocks({ shown: 'hra' }, 'generic'), true, 'generická po herní už ne');
  // shouldShowPopup to respektuje; subscribed a 30 dní platí pro obě
  assert.equal(shouldShowPopup({}, Date.now(), { shown: 'generic' }, 'hra'), true);
  assert.equal(shouldShowPopup({ subscribed: true }, Date.now(), {}, 'hra'), false);
  assert.equal(shouldShowPopup({ dismissedAt: Date.now() - 86400000 }, Date.now(), {}, 'hra'), false);
  assert.equal(shouldShowPopup({}, Date.now(), { shown: true }, 'generic'), false, 'zpětná kompatibilita');
});

test('armGameNewsletter: karta se žádá až po verdiktu a po klidu; interakce časovač resetuje', () => {
  // falešné časovače — žádný DOM, jen smyčka
  const queue = [];
  let id = 0;
  const timers = {
    setTimeout(fn, ms) { id += 1; queue.push({ id, fn, ms }); return id; },
    clearTimeout(tid) { const i = queue.findIndex(q => q.id === tid); if (i >= 0) queue.splice(i, 1); },
  };
  const listeners = {};
  const el = {
    addEventListener(ev, fn) { listeners[ev] = fn; },
    removeEventListener(ev) { delete listeners[ev]; },
  };
  const c = armGameNewsletter({ hook: HOOK, idleMs: 15000, activityEl: el, timers });
  assert.equal(queue.length, 0, 'před verdiktem nic');
  c.verdictReady();
  assert.equal(queue.length, 1, 'po verdiktu běží jeden časovač');
  const first = queue[0].id;
  listeners.input();
  assert.equal(queue.length, 1);
  assert.notEqual(queue[0].id, first, 'interakce časovač nahradila novým');
  c.verdictReady();
  assert.equal(queue.length, 1, 'opakované verdictReady nic nepřidá');
  c.dispose();
  assert.equal(queue.length, 0, 'dispose uklidí');
  assert.deepEqual(Object.keys(listeners), [], 'posluchače odpojené');
});
