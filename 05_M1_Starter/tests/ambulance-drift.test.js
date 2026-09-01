// Drift-check citátů u denních ambulancí — offline logika porovnávání.
//
// `verified_at` je jen datum, kdy člověk stránku četl. Tyhle testy hlídají
// jádro, které z něj dělá živou záruku: citát se musí na stránce dohledat
// doslovně, po fragmentech a v pořadí — a kosmetika šablony (pomlčky,
// nbsp, uvozovky) nesmí spouštět falešný poplach.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeForMatch,
  splitQuote,
  quoteFoundIn,
  checkEntry,
} from '../ingest/verify-ambulance-drift.js';

test('normalizeForMatch · nbsp, pomlčky a uvozovky nejsou drift', () => {
  assert.equal(
    normalizeForMatch('7:00 – 15:00  „denně“'),
    normalizeForMatch('7:00 - 15:00 "denně"'),
  );
});

test('splitQuote · elipsa dělí citát na fragmenty', () => {
  assert.deepEqual(
    splitQuote('Ordinační doba […] Po–Pá 7:00 – 15:30 [...] dveře číslo 3'),
    ['Ordinační doba', 'Po-Pá 7:00 - 15:30', 'dveře číslo 3'],
  );
});

test('quoteFoundIn · najde fragmenty v pořadí, přeskládání hlásí jako drift', () => {
  const page = 'Chirurgická ambulance. Ordinační doba: Po–Pá 7:00 – 15:00. Umístění: přízemí.';
  assert.equal(quoteFoundIn(page, 'Ordinační doba […] 7:00 – 15:00').ok, true);

  // Fragmenty existují, ale v opačném pořadí — čísla se přestěhovala jinam.
  const out = quoteFoundIn(page, '7:00 – 15:00 […] Ordinační doba');
  assert.equal(out.ok, false);
  assert.ok(out.missing.includes('Ordinační doba'));
});

test('quoteFoundIn · změněné hodiny jsou drift', () => {
  const page = 'Chirurgická ambulance. Ordinační doba: Po–Pá 8:00 – 14:00.';
  const out = quoteFoundIn(page, 'Ordinační doba: Po–Pá 7:00 – 15:00');
  assert.equal(out.ok, false);
});

test('checkEntry · nedostupná stránka je „nedostupne“, ne drift', async () => {
  // O driftu nevíme nic — kdyby výpadek webu shodil údaj do „změněno,
  // ověřte“, každé pondělní okno údržby by rozblikalo půlku karet.
  const entry = { id: 'x', quote: 'cokoli', source: { url: 'https://nemocnice.example/amb' } };
  const fetchImpl = async () => { throw new Error('ECONNREFUSED'); };
  const out = await checkEntry(entry, { fetchImpl, timeoutMs: 500 });
  assert.equal(out.status, 'nedostupne');
});

test('checkEntry · živý HTML se čte přes stripHtml (skripty nejsou obsah)', async () => {
  const html = '<html><body><script>var x="7:00 - 9:00";</script>'
    + '<h2>Úrazová ambulance</h2><p>Ordinační doba 7:00&nbsp;- 15:00</p></body></html>';
  const fetchImpl = async () => ({ ok: true, text: async () => html });
  const okEntry = { id: 'a', quote: 'Ordinační doba 7:00 - 15:00', source: { url: 'https://x.example/' } };
  assert.equal((await checkEntry(okEntry, { fetchImpl })).status, 'ok');

  // Citát „nalezený“ jen ve skriptu projít nesmí.
  const scriptEntry = { id: 'b', quote: 'var x="7:00 - 9:00"', source: { url: 'https://x.example/' } };
  assert.equal((await checkEntry(scriptEntry, { fetchImpl })).status, 'drift');
});
