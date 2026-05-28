// Testy pro glossary highlight logiku v src/clinical-quality.js.
//
// Zaměřeno na bug, kdy „IC" matchoval uvnitř „penicilin" / „praktického"
// kvůli chybějícímu word-boundary v původním regexu.

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Replikace highlightGlossaryTerms z src/clinical-quality.js — pure JS bez DOM.
 * Test cover: word boundary, exact vs ci matchMode, first-occurrence.
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightGlossaryTerms(text, terms) {
  if (!text) return '';
  if (!terms || terms.length === 0) return text;

  const sorted = [...terms].sort((a, b) => b.key.length - a.key.length);
  const exactKeys = sorted.filter(t => t.matchMode === 'exact').map(t => t.key);
  const ciKeys = sorted.filter(t => t.matchMode !== 'exact').map(t => t.key);

  const buildPattern = (keys, flags) =>
    keys.length === 0 ? null
      : new RegExp(`(?<![\\p{L}\\p{N}])(${keys.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, flags);

  const exactPattern = buildPattern(exactKeys, 'gu');
  const ciPattern = buildPattern(ciKeys, 'giu');

  const findMatches = (pattern, mode) => {
    if (!pattern) return [];
    const out = [];
    let m;
    while ((m = pattern.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[1].length, matched: m[1], mode });
    }
    return out;
  };
  const allMatches = [...findMatches(exactPattern, 'exact'), ...findMatches(ciPattern, 'ci')]
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  const used = new Set();
  const accepted = [];
  let cursor = 0;
  for (const m of allMatches) {
    if (m.start < cursor) continue;
    const lower = m.matched.toLowerCase();
    const origTerm = m.mode === 'exact'
      ? terms.find(t => t.matchMode === 'exact' && t.key === m.matched)
      : terms.find(t => t.matchMode !== 'exact' && t.key.toLowerCase() === lower);
    if (!origTerm || used.has(origTerm.key)) continue;
    used.add(origTerm.key);
    accepted.push({ ...m, key: origTerm.key });
    cursor = m.end;
  }

  const parts = [];
  let last = 0;
  for (const a of accepted) {
    parts.push(text.slice(last, a.start));
    parts.push(`[${a.key}:${a.matched}]`);
    last = a.end;
  }
  parts.push(text.slice(last));
  return parts.join('');
}

// =====================================================================

test('bug fix: „IC" se NEMATCHUJE uvnitř „penicilin" (Czech accent boundary)', () => {
  const terms = [{ key: 'IC', matchMode: 'exact' }, { key: 'penicilin', matchMode: 'ci' }];
  const r = highlightGlossaryTerms('předepisuje penicilin doma', terms);
  // Penicilin se má zvýraznit (samostatné slovo), IC nikoliv (je uvnitř penicilin)
  assert.ok(r.includes('[penicilin:penicilin]'));
  assert.ok(!r.includes('[IC:'));
});

test('bug fix: „IC" se NEMATCHUJE uvnitř „praktického"', () => {
  const terms = [{ key: 'IC', matchMode: 'exact' }];
  const r = highlightGlossaryTerms('Pro Honzíka u praktického lékaře', terms);
  assert.ok(!r.includes('[IC:'));
  assert.equal(r, 'Pro Honzíka u praktického lékaře');
});

test('„IC" matchuje samostatně jako zkratka', () => {
  const terms = [{ key: 'IC', matchMode: 'exact' }];
  const r = highlightGlossaryTerms('Iktové centrum IC má 32 pracovišť', terms);
  assert.ok(r.includes('[IC:IC]'));
});

test('exact mode je case-sensitive: „PCI" matchuje, „pci" ne', () => {
  const terms = [{ key: 'PCI', matchMode: 'exact' }];
  const r1 = highlightGlossaryTerms('PCI tým čeká', terms);
  const r2 = highlightGlossaryTerms('pci tým čeká', terms);
  assert.ok(r1.includes('[PCI:PCI]'));
  assert.ok(!r2.includes('[PCI:'));
});

test('ci mode je case-insensitive: „Trombolýza" matchuje na začátku věty', () => {
  const terms = [{ key: 'trombolýza', matchMode: 'ci' }];
  const r = highlightGlossaryTerms('Trombolýza je léčba CMP', terms);
  assert.ok(r.includes('[trombolýza:Trombolýza]'));
});

test('first-occurrence rule: termín se zvýrazní jen jednou', () => {
  const terms = [{ key: 'sepse', matchMode: 'ci' }];
  const r = highlightGlossaryTerms('sepse je vážná. Sepse může zabít.', terms);
  // První „sepse" se zvýrazní, druhé „Sepse" ne
  const matches = (r.match(/\[sepse:/g) || []).length;
  assert.equal(matches, 1);
});

test('překryv: delší termín vyhrává', () => {
  const terms = [
    { key: 'CMP', matchMode: 'exact' },
    { key: 'akutní CMP', matchMode: 'ci' },
  ];
  const r = highlightGlossaryTerms('akutní CMP pacient', terms);
  // „akutní CMP" je delší → vyhrává
  assert.ok(r.includes('[akutní CMP:akutní CMP]'));
  // A „CMP" se už nezvýrazní (překryv + first-occurrence)
  assert.ok(!r.includes('[CMP:'));
});

test('česká diakritika: termín „Ústecký" se matchuje za mezerou', () => {
  const terms = [{ key: 'Ústecký', matchMode: 'ci' }];
  const r = highlightGlossaryTerms('Kraj Ústecký kraj má 20 nemocnic', terms);
  assert.ok(r.includes('[Ústecký:Ústecký]'));
});

test('prázdný vstup vrací prázdný string', () => {
  assert.equal(highlightGlossaryTerms('', [{ key: 'IC', matchMode: 'exact' }]), '');
});

test('žádné termíny → text se vrátí beze změny', () => {
  assert.equal(highlightGlossaryTerms('Text bez termínů', []), 'Text bez termínů');
});
