// Stránka Newsletter (newsletter.html): archiv minulých čísel z newsletter-log.json.
// buildArchive je čistá funkce — testuje se bez DOM; dále statické kontroly HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildArchive, archiveHtml, formatIssueDate, SECTION_PAGES, INITIAL_VISIBLE,
} from '../src/newsletter-page.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const NOW = new Date('2026-10-20T12:00:00+02:00');

const ARTICLES = [
  { slug: 'clanek-a.html', title: 'Článek A', published: true, date: '2026-09-01' },
  { slug: 'clanek-draft.html', title: 'Koncept', published: false, date: '2026-09-02' },
  { slug: 'clanek-budouci.html', title: 'Budoucí', published: true, date: '2027-01-01' },
];
const INDICATORS = [{ id: 'ind_x', name: 'Indikátor X' }];

const LOG = {
  campaigns: [
    { brevo_campaign_id: 1, subject: 'Úvod', scheduled_for: null, note: 'INTERNÍ POZNÁMKA', articles: ['clanek-a.html'], featured_indicator: null },
    { brevo_campaign_id: 2, subject: 'Starší', scheduled_for: '2026-07-10T11:00:00+02:00', articles: ['legislativa', 'neznamy-slug', 'clanek-a.html'], featured_indicator: null },
    { brevo_campaign_id: 3, subject: 'Novější', scheduled_for: '2026-09-26T12:00:00+02:00', note: 'INTERNÍ POZNÁMKA', articles: ['clanek-draft.html', 'clanek-budouci.html'], featured_indicator: 'ind_x' },
    { brevo_campaign_id: 4, subject: 'Naplánované', scheduled_for: '2026-10-23T11:00:00+02:00', articles: ['clanek-a.html'], featured_indicator: 'ind_x' },
  ],
};

test('buildArchive: nejnovější první, úvodní vydání bez data na konci', () => {
  const issues = buildArchive(LOG, ARTICLES, INDICATORS, NOW);
  assert.deepEqual(issues.map(i => i.id), [3, 2, 1]);
  assert.equal(issues.at(-1).dateLabel, null);
});

test('buildArchive: naplánovaná (ještě neodeslaná) kampaň se nezobrazuje', () => {
  const issues = buildArchive(LOG, ARTICLES, INDICATORS, NOW);
  assert.ok(!issues.some(i => i.id === 4));
});

test('buildArchive: nepublikovaný článek je jen text, neznámý slug se vynechá, sekce má odkaz', () => {
  const [novejsi, starsi] = buildArchive(LOG, ARTICLES, INDICATORS, NOW);
  assert.deepEqual(novejsi.items.map(i => [i.title, i.href]), [['Koncept', null], ['Budoucí', null]]);
  assert.deepEqual(starsi.items.map(i => [i.title, i.href]), [
    [SECTION_PAGES.legislativa.label, 'legislativa.html'],
    ['Článek A', 'clanek-a.html'],
  ]);
});

test('buildArchive: indikátor čísla se jménem z datasetu; neznámý id se vynechá', () => {
  const [novejsi, starsi] = buildArchive(LOG, ARTICLES, INDICATORS, NOW);
  assert.deepEqual(novejsi.indicator, { id: 'ind_x', name: 'Indikátor X' });
  assert.equal(starsi.indicator, null);
  const bez = buildArchive(LOG, ARTICLES, [], NOW);
  assert.equal(bez[0].indicator, null);
});

test('formatIssueDate: česky, v časové zóně Praha', () => {
  assert.equal(formatIssueDate('2026-09-26T12:00:00+02:00'), '26. září 2026');
  assert.equal(formatIssueDate(null), null);
  assert.equal(formatIssueDate('nesmysl'), null);
});

test('archiveHtml: interní poznámka se nikdy nevypisuje, starší vydání jsou za tlačítkem', () => {
  const html = archiveHtml(buildArchive(LOG, ARTICLES, INDICATORS, NOW));
  assert.doesNotMatch(html, /INTERNÍ POZNÁMKA/);
  assert.match(html, /href="indicator\.html\?id=ind_x"/);
  assert.match(html, /Úvodní vydání/);

  const many = Array.from({ length: INITIAL_VISIBLE + 3 }, (_, n) => ({
    brevo_campaign_id: n, subject: `S${n}`, scheduled_for: `2026-08-${String(n + 1).padStart(2, '0')}T11:00:00+02:00`, articles: [],
  }));
  const big = archiveHtml(buildArchive({ campaigns: many }, [], [], NOW));
  assert.match(big, /id="nlpArchiveMore" hidden/);
  assert.match(big, /Zobrazit starší vydání \(3\)/);
});

test('skutečný log: všechna odeslaná čísla se dají vykreslit a mají předmět', () => {
  const log = JSON.parse(read('data/newsletter-log.json'));
  const arts = JSON.parse(read('data/articles.json')).articles;
  const inds = JSON.parse(read('data/indicators.json')).indicators;
  const issues = buildArchive(log, arts, inds, NOW);
  assert.ok(issues.length > 0);
  for (const i of issues) assert.ok(i.subject, `kampaň ${i.id} bez předmětu`);
  // každá položka logu je buď článek z articles.json, nebo známá sekce
  const slugs = new Set(arts.map(a => a.slug));
  for (const c of log.campaigns) {
    for (const s of c.articles || []) {
      assert.ok(slugs.has(s) || SECTION_PAGES[s], `newsletter-log: ${s} není článek ani známá sekce`);
    }
  }
});

test('newsletter.html: formulář má jiná ID než patička, jeden h1, modul načten', () => {
  const html = read('newsletter.html');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const id of ['nlpForm', 'nlpEmail', 'nlpConsent', 'nlpStatus', 'nlpArchive']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /id="(newsletterForm|nlEmail|nlConsent|newsletterStatus)"/);
  assert.match(html, /<script type="module" src="src\/newsletter-page\.js">/);
  assert.match(html, /for="nlpEmail"/);
});

test('newsletter-page.js: source přihlášení je newsletter-page, popup je vypnutý', () => {
  const js = read('src/newsletter-page.js');
  assert.match(js, /submitNewsletterSignup\(email, 'newsletter-page'\)/);
  assert.match(js, /popups: 'manual'/);
});
