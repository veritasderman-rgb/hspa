// Věcná příbuznost článků (pickRelatedByAffinity v src/article-related.js).
// Skóre: společný indikátor ×3, shodný tag +2, shodná rubrika +1;
// tie-break novější datum → slug. Čistá funkce — kandidáti už jsou
// přefiltrovaní na viditelné.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickRelatedByAffinity } from '../src/article-related.js';

const base = { published: true, date: '2026-01-01' };
const current = {
  ...base,
  slug: 'clanek-aktualni.html',
  linked_indicators: ['ind_a', 'ind_b'],
  tag: 'Prevence',
  rubric: 'prevence',
};

test('společné indikátory váží víc než tag i rubrika dohromady', () => {
  const candidates = [
    { ...base, slug: 'clanek-tag-rubrika.html', tag: 'Prevence', rubric: 'prevence', linked_indicators: [] },        // 2+1 = 3
    { ...base, slug: 'clanek-dva-indikatory.html', tag: 'Jiný', rubric: 'jina', linked_indicators: ['ind_a', 'ind_b'] }, // 6
  ];
  const out = pickRelatedByAffinity(current, candidates, 4);
  assert.equal(out[0].slug, 'clanek-dva-indikatory.html');
  assert.equal(out[1].slug, 'clanek-tag-rubrika.html');
});

test('článek bez jakéhokoli překryvu se nevrací', () => {
  const candidates = [
    { ...base, slug: 'clanek-cizi.html', tag: 'Jiný', rubric: 'jina', linked_indicators: ['ind_x'] },
  ];
  assert.deepEqual(pickRelatedByAffinity(current, candidates, 4), []);
});

test('aktuální článek se nikdy nedoporučí sám', () => {
  const out = pickRelatedByAffinity(current, [current], 4);
  assert.deepEqual(out, []);
});

test('při shodě skóre vyhrává novější datum, pak slug', () => {
  const candidates = [
    { ...base, slug: 'clanek-b.html', date: '2026-02-01', tag: 'Prevence', rubric: 'x', linked_indicators: [] },
    { ...base, slug: 'clanek-a.html', date: '2026-03-01', tag: 'Prevence', rubric: 'x', linked_indicators: [] },
    { ...base, slug: 'clanek-c.html', date: '2026-02-01', tag: 'Prevence', rubric: 'x', linked_indicators: [] },
  ];
  const out = pickRelatedByAffinity(current, candidates, 4);
  assert.deepEqual(out.map(a => a.slug), ['clanek-a.html', 'clanek-b.html', 'clanek-c.html']);
});

test('respektuje max a řadí sestupně podle skóre', () => {
  const candidates = Array.from({ length: 10 }, (_, i) => ({
    ...base,
    slug: `clanek-${i}.html`,
    tag: i % 2 === 0 ? 'Prevence' : 'Jiný',
    rubric: 'prevence',
    linked_indicators: i < 3 ? ['ind_a'] : [],
  }));
  const out = pickRelatedByAffinity(current, candidates, 3);
  assert.equal(out.length, 3);
  // Top 3: kandidáti s indikátorem (skóre ≥ 4) před čistě tagovými (3) a rubrikovými (1)
  for (const a of out) assert.ok((a.linked_indicators ?? []).includes('ind_a'));
});
