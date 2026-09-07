// Testy evidence-auditu: fronta (scripts/evidence-audit-queue.js) + registr (ingest/validate-evidence-audit.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildQueue, pickBatch, itemStatus, scoreArticle, scoreIndicator, contentHash,
  countStudyMentions, countLiteratureLinks, DEFAULT_MAX_AGE_DAYS,
} from '../scripts/evidence-audit-queue.js';
import { validateEvidenceAudit, loadForeignKeys } from '../ingest/validate-evidence-audit.js';

const TODAY = '2026-09-07';

test('itemStatus: pending → stale (hash / stáří) → done', () => {
  assert.equal(itemStatus(undefined, 'abc', TODAY), 'pending');
  assert.equal(itemStatus({ content_hash: 'abc', checked_at: '2026-09-01' }, 'abc', TODAY), 'done');
  assert.equal(itemStatus({ content_hash: 'old', checked_at: '2026-09-01' }, 'abc', TODAY), 'stale');
  assert.equal(itemStatus({ content_hash: 'abc', checked_at: '2025-01-01' }, 'abc', TODAY, DEFAULT_MAX_AGE_DAYS), 'stale');
  assert.equal(itemStatus({ content_hash: 'abc', checked_at: 'bad' }, 'abc', TODAY), 'stale');
});

test('scoreArticle: odkazy na studie váží víc než zmínky, strop zmínek 10', () => {
  const base = { lit_links: 0, study_mentions: 0, claims_manual: 0 };
  assert.equal(scoreArticle(base, 'article'), 0);
  assert.equal(scoreArticle({ ...base, lit_links: 2 }, 'article'), 6);
  assert.equal(scoreArticle({ ...base, study_mentions: 50 }, 'article'), 20);
  assert.equal(scoreArticle({ ...base, claims_manual: 3 }, 'analysis'), 5);
  assert.equal(scoreArticle(base, 'explainer'), 1);
});

test('scoreIndicator: HSPA + Výsledky + navázané články + chybějící literatura', () => {
  const s = { linked_articles: 12, has_literature: false, study_mentions: 0 };
  assert.equal(scoreIndicator(s, { framework: 'hspa', area: 'Výsledky' }), 3 + 3 + 8 + 1);
  assert.equal(scoreIndicator({ ...s, has_literature: true }, { framework: 'monitoring', area: 'Struktury' }), 8);
});

test('heuristiky: zmínky o studiích a odkazy na literaturu', () => {
  assert.equal(countStudyMentions('Metaanalýza z Lancetu a kohortová studie; evidence obyvatel.'), 4);
  assert.equal(countLiteratureLinks('<a href="https://doi.org/10.1/x">a</a> <a href="https://csu.gov.cz">b</a> <a href="https://pubmed.ncbi.nlm.nih.gov/1/">c</a>'), 2);
  assert.equal(contentHash('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
});

test('buildQueue nad repem: všechny viditelné články a indikátory, seřazeno, bez neviditelných draftů', () => {
  const q = buildQueue({ today: TODAY });
  const articles = JSON.parse(readFileSync(new URL('../data/articles.json', import.meta.url), 'utf8')).articles;
  const visible = articles.filter(a => a.published !== false && a.date && a.date <= TODAY);
  assert.equal(q.articles.length, visible.length);
  assert.ok(q.indicators.length > 200);
  for (const a of q.articles) assert.match(a.id, /^clanek-.*\.html$/);
  for (const i of q.indicators) assert.match(i.id, /^indicator:/);
  // hidden draft (published:false) nesmí být ve frontě
  const hidden = articles.find(a => a.published === false);
  if (hidden) assert.ok(!q.articles.some(x => x.id === hidden.slug));
  // seřazeno: status → priorita desc
  for (let k = 1; k < q.articles.length; k++) {
    const a = q.articles[k - 1], b = q.articles[k];
    if (a.status === b.status) assert.ok(a.priority >= b.priority, `${a.id} < ${b.id}`);
  }
  assert.equal(q.counts.articles.total, q.articles.length);
});

test('pickBatch: bere pending před stale a nikdy done (bez includeDone)', () => {
  const q = {
    articles: [
      { id: 'a-done', status: 'done', priority: 99 },
      { id: 'a1', status: 'pending', priority: 5 },
      { id: 'a2', status: 'stale', priority: 4 },
    ],
    indicators: [{ id: 'indicator:x', status: 'pending', priority: 1 }],
  };
  assert.deepEqual(pickBatch(q, { articles: 1, indicators: 1 }).map(x => x.id), ['a1', 'indicator:x']);
  assert.deepEqual(pickBatch(q, { articles: 5, indicators: 0 }).map(x => x.id), ['a1', 'a2']);
  assert.deepEqual(pickBatch(q, { articles: 5, indicators: 0, includeDone: true }).map(x => x.id), ['a-done', 'a1', 'a2']);
});

const validItem = () => ({
  id: 'clanek-kdo-se-o-nas-postara-2035.html', type: 'article', checked_at: TODAY,
  content_hash: 'a9993e364706816aba3e25717850c26c9cd0d89d', run_id: 'ea-2026-09-07-01',
  tools: { pubmed: true, consensus: false }, models: { search: 'sonnet', adjudicate: 'opus' },
  claims: [{
    text: 'Domácí péče snižuje počet hospitalizací seniorů', kind: 'effect', verdict: 'supported', confidence: 'medium',
    evidence: [{ pmid: '12345678', doi: '10.1000/xyz123', title: 'Home care and hospitalisation', year: 2022, journal: 'BMJ', study_type: 'systematic review', found_via: 'pubmed', relation: 'supports' }],
    note: 'Přehled 14 RCT.',
  }],
  summary: { supported: 1 },
  actions: [{ type: 'source-added', detail: 'doplněna položka do article-sources' }],
});

test('validateEvidenceAudit: prázdný a platný registr projde, chyby se hlásí', () => {
  const fk = loadForeignKeys();
  const real = JSON.parse(readFileSync(new URL('../data/evidence-audit.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateEvidenceAudit(real, fk), []);
  assert.deepEqual(validateEvidenceAudit({ version: '1.0', generated_at: 'x', items: [validItem()] }, fk), []);

  const bad = validItem();
  bad.claims[0].verdict = 'contradicted';        // bez akce flagged/issue
  bad.claims.push({ text: 'x', verdict: 'partial', evidence: [] });  // partial bez evidence i note
  bad.claims.push({ text: 'y', verdict: 'supported', evidence: [{ title: 't', found_via: 'consensus', relation: 'supports' }] });
  const errs = validateEvidenceAudit({ version: '1.0', generated_at: 'x', items: [bad, { ...validItem() }] }, fk);
  assert.ok(errs.some(e => e.includes('contradicted claim vyžaduje akci')), errs.join('\n'));
  assert.ok(errs.some(e => e.includes("verdict 'partial' requires a note")));
  assert.ok(errs.some(e => e.includes('needs pmid or doi')));
  assert.ok(errs.some(e => e.includes('ověřena v PubMed')));
  assert.ok(errs.some(e => e.includes('duplicate id')));
  assert.ok(errs.some(e => e.includes('summary.contradicted')));
});

test('validateEvidenceAudit: FK na články/indikátory a zákaz provozních textů nástrojů', () => {
  const fk = loadForeignKeys();
  const ghost = { ...validItem(), id: 'clanek-neexistuje.html' };
  assert.ok(validateEvidenceAudit({ version: '1', generated_at: 'x', items: [ghost] }, fk).some(e => e.includes('nenalezen v data/articles.json')));
  const ind = { ...validItem(), id: 'indicator:nadeje_doziti_total', type: 'indicator' };
  assert.deepEqual(validateEvidenceAudit({ version: '1', generated_at: 'x', items: [ind] }, fk), []);
  const boiler = validItem();
  boiler.claims[0].note = 'You have 3 searches remaining, sign up for more.';
  assert.ok(validateEvidenceAudit({ version: '1', generated_at: 'x', items: [boiler] }, fk).some(e => e.includes('Provozní text')));
});
