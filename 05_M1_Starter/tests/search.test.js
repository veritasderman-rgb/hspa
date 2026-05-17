// Testy pure funkcí site-wide search.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, searchIndex, highlight } from '../src/search.js';

const ARTICLES = [
  { slug: 'clanek-akutni-infarkt.html', title: 'Akutní infarkt myokardu (AMI)', perex: 'Mortalita 30 dní po AMI', tag: 'Klinika', topics: ['klinika'], published: true },
  { slug: 'clanek-vakcinace.html', title: 'Vakcinace v Česku', perex: 'Klesající proočkovanost', tag: 'Prevence', topics: ['prevence'], published: true },
  { slug: 'clanek-draft.html', title: 'Draft', perex: '', published: false },
];
const INDICATORS = [
  { id: 'ami_mortalita', name: 'Mortalita 30 dní po AMI', area: 'Výstupy', domain: 'Kvalita', subdomain: 'Hospitalizace', dimension: 'kvalita' },
  { id: 'vakcinace_mmr', name: 'Proočkovanost MMR vakcínou', area: 'Procesy', domain: 'Prevence', subdomain: 'Vakcinace', dimension: 'kvalita' },
];
const GLOSSARY = [
  { key: 'AMI', full: 'Acute Myocardial Infarction', short_def: 'Akutní infarkt myokardu', anchor: 'ami' },
  { key: 'OECD', full: 'Organisation for Economic Co-operation and Development', short_def: '…', anchor: 'oecd' },
];

// ===== buildIndex =====

test('buildIndex: kombinuje 3 zdroje, ignoruje drafty', () => {
  const idx = buildIndex({ articles: ARTICLES, indicators: INDICATORS, glossary: GLOSSARY });
  // 2 published articles + 2 indicators + 2 glossary = 6
  assert.equal(idx.length, 6);
  const types = idx.map(i => i.type);
  assert.deepEqual(types.filter(t => t === 'article').length, 2);
  assert.deepEqual(types.filter(t => t === 'indicator').length, 2);
  assert.deepEqual(types.filter(t => t === 'glossary').length, 2);
});

test('buildIndex: prázdný vstup → prázdný index', () => {
  assert.deepEqual(buildIndex({}), []);
  assert.deepEqual(buildIndex(), []);
});

test('buildIndex: indicator URL obsahuje encoded id', () => {
  const idx = buildIndex({ indicators: [{ id: 'foo bar', name: 'X' }] });
  assert.ok(idx[0].url.includes('foo%20bar'));
});

// ===== searchIndex =====

test('searchIndex: query "AMI" vrátí indikátor + glossary + článek', () => {
  const idx = buildIndex({ articles: ARTICLES, indicators: INDICATORS, glossary: GLOSSARY });
  const out = searchIndex('AMI', idx);
  assert.ok(out.length >= 3);
  // První musí být exact match v label (glossary "AMI" má label = "AMI" → exact match score 100)
  assert.equal(out[0].type, 'glossary');
  assert.equal(out[0].label, 'AMI');
});

test('searchIndex: query "vakcinace" matchuje napříč typy', () => {
  const idx = buildIndex({ articles: ARTICLES, indicators: INDICATORS, glossary: GLOSSARY });
  const out = searchIndex('vakcinace', idx);
  assert.ok(out.length >= 2);
  const types = new Set(out.map(o => o.type));
  assert.ok(types.has('article') || types.has('indicator'));
});

test('searchIndex: case-insensitive', () => {
  const idx = buildIndex({ articles: ARTICLES });
  assert.equal(searchIndex('VAKCINACE', idx).length, searchIndex('vakcinace', idx).length);
});

test('searchIndex: nic nematchuje → []', () => {
  const idx = buildIndex({ articles: ARTICLES });
  assert.deepEqual(searchIndex('nonexistent_xyz_qqq', idx), []);
});

test('searchIndex: prázdný query → []', () => {
  const idx = buildIndex({ articles: ARTICLES });
  assert.deepEqual(searchIndex('', idx), []);
  assert.deepEqual(searchIndex('   ', idx), []);
  assert.deepEqual(searchIndex(null, idx), []);
});

test('searchIndex: prefix má vyšší skóre než substring v sub', () => {
  const idx = [
    { id: 'a', type: 'article', label: 'Vakcinace v Česku', sub: '', url: 'a', haystack: 'vakcinace v česku' },
    { id: 'b', type: 'indicator', label: 'Mortalita', sub: 'Vakcinace souvislost', url: 'b', haystack: 'mortalita vakcinace souvislost' },
  ];
  const out = searchIndex('vakcinace', idx);
  assert.equal(out[0].id, 'a'); // prefix match má přednost
});

// ===== highlight =====

test('highlight: obalí matched token do <mark>', () => {
  const out = highlight('Akutní infarkt myokardu', 'infarkt');
  assert.ok(out.includes('<mark>infarkt</mark>'));
});

test('highlight: ignoruje tokeny kratší než 2 znaky (proti šumu)', () => {
  const out = highlight('AB CD', 'a');
  assert.equal(out, 'AB CD'); // 'a' je 1 znak → no mark
});

test('highlight: escapuje HTML i bez query', () => {
  assert.equal(highlight('<b>X</b>', ''), '&lt;b&gt;X&lt;/b&gt;');
});

test('highlight: bezpečné s regex meta-znaky v query', () => {
  const out = highlight('Cena (Kč)', '(kč)');
  assert.ok(out.includes('Cena'));
  // Nesmí throw chybou regex parsování
});
