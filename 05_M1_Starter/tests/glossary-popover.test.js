// Glosářový popover — čistá část: umístění karty vůči slovu ve viewportu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionFor, initGlossaryPopover } from '../src/glossary-popover.js';

const VP = { width: 1280, height: 800 };
const POP = { width: 320, height: 140 };

test('positionFor: pod slovem, když se vejde; drží levý okraj slova', () => {
  const p = positionFor({ left: 200, top: 300, width: 80, height: 18 }, POP, VP);
  assert.equal(p.placement, 'below');
  assert.equal(p.left, 200);
  assert.equal(p.top, 300 + 18 + 8);
});

test('positionFor: nad slovem, když se dolů nevejde', () => {
  const p = positionFor({ left: 200, top: 720, width: 80, height: 18 }, POP, VP);
  assert.equal(p.placement, 'above');
  assert.equal(p.top, 720 - 140 - 8);
});

test('positionFor: nikdy nepřeteče vpravo ani vlevo (okraj 12 px)', () => {
  const right = positionFor({ left: 1200, top: 100, width: 60, height: 18 }, POP, VP);
  assert.equal(right.left, 1280 - 320 - 12);
  const left = positionFor({ left: 2, top: 100, width: 60, height: 18 }, POP, VP);
  assert.equal(left.left, 12);
});

test('positionFor: na úzkém displeji (karta širší než místo) zůstane v okraji', () => {
  const narrow = { width: 360, height: 640 };
  const p = positionFor({ left: 300, top: 100, width: 40, height: 18 }, { width: 336, height: 160 }, narrow);
  assert.equal(p.left, 12);
  assert.equal(p.placement, 'below');
});

test('positionFor: když se nevejde ani nahoru ani dolů, zůstane dole (neskočí mimo obrazovku)', () => {
  const tiny = { width: 400, height: 200 };
  const p = positionFor({ left: 20, top: 90, width: 40, height: 18 }, { width: 300, height: 180 }, tiny);
  assert.equal(p.placement, 'below');
  assert.ok(p.top >= 12);
});

test('initGlossaryPopover: bez DOM je no-op (SSR/test), s prázdnými hesly také', () => {
  assert.equal(initGlossaryPopover([{ key: 'DRG' }]), null);
  assert.equal(initGlossaryPopover([]), null);
});
