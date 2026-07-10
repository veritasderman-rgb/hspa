// Testy nočního skeneru: respektování audit.last_reviewed u check-sources.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLastReviewed, daysBetween, REVIEW_SKIP_DAYS, scanArticle,
} from '../scripts/nightly-scan.js';

const TODAY = '2026-06-03';
const fx = name => ({
  slug: `tests/fixtures/nightly/${name}.html`,
  title: name, number: '1', date: '2026-01-01', published: true,
});
const types = item => item.flags.map(f => f.type);

test('parseLastReviewed vytáhne datum z audit komentáře', () => {
  assert.equal(parseLastReviewed('<!-- last_reviewed: 2026-06-01 -->'), '2026-06-01');
  assert.equal(parseLastReviewed('last_reviewed: "2026-05-15"'), '2026-05-15');
  assert.equal(parseLastReviewed('<p>bez auditu</p>'), null);
});

test('daysBetween počítá dny správně', () => {
  assert.equal(daysBetween('2026-06-01', '2026-06-03'), 2);
  assert.equal(daysBetween('2026-05-20', '2026-06-03'), 14);
  assert.equal(daysBetween('bad', '2026-06-03'), null);
});

test('check-sources se přeskočí u článku auditovaného < 14 dní', () => {
  const item = scanArticle(fx('recent-review'), TODAY, { skipReviewed: true });
  assert.ok(!types(item).includes('check-sources'), 'check-sources nemá být přítomné');
  assert.ok(item.check_sources_skipped, 'má být zaznamenáno check_sources_skipped');
  assert.equal(item.last_reviewed, '2026-06-01');
});

test('check-sources se NEpřeskočí u staršího auditu (> 14 dní)', () => {
  const item = scanArticle(fx('old-review'), TODAY, { skipReviewed: true });
  assert.ok(types(item).includes('check-sources'), 'check-sources má být přítomné');
  assert.ok(!item.check_sources_skipped);
});

test('--no-skip-reviewed (skipReviewed:false) ukáže check-sources i u recentního auditu', () => {
  const item = scanArticle(fx('recent-review'), TODAY, { skipReviewed: false });
  assert.ok(types(item).includes('check-sources'));
});

test('date-passed surfuje i u recentně auditovaného článku (check-sources přeskočeno)', () => {
  const item = scanArticle(fx('recent-review-datepassed'), TODAY, { skipReviewed: true });
  const t = types(item);
  assert.ok(t.includes('date-passed'), 'date-passed se nesmí přeskočit');
  assert.ok(!t.includes('check-sources'), 'check-sources se má přeskočit');
});

test('REVIEW_SKIP_DAYS je 14 (sladěno s rutinou)', () => {
  assert.equal(REVIEW_SKIP_DAYS, 14);
});

// --- indicator-drift (článek ↔ datový kontrakt) ---

test('valueVariants: generuje české zápisy hodnoty vč. tisícových mezer', async () => {
  const { valueVariants } = await import('../scripts/nightly-scan.js');
  const v = valueVariants(4564.4);
  assert.ok(v.includes('4564,4'), 'desetinná čárka');
  assert.ok(v.includes('4 564,4'), 'tisícová mezera');
  assert.ok(v.includes('4564'), 'celé číslo');
  const w = valueVariants(98.7);
  assert.ok(w.includes('98,7'));
});

test('findIndicatorDrift: flaguje zastaralou citaci, mlčí u aktuální', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }],
    ['bar_ind', { id: 'bar_ind', value: 250.4, unit: '/100k', year: 2023 }],
  ]);
  // Statická stránka indikator-{id}.html (foo) i fallback indicator.html?id= (bar) —
  // drift-check musí detekovat obě formy odkazu.
  const html = `
    <li><a href="indikator-foo_ind.html">Foo</a> — 35,8 % vs. OECD 91 %</li>
    <li><a href="indicator.html?id=bar_ind">Bar</a> — 250,4 / 100 000 (2023)</li>`;
  const drifts = findIndicatorDrift(html, byId);
  assert.equal(drifts.length, 1);
  assert.equal(drifts[0].id, 'foo_ind');
});

test('findIndicatorDrift: ignoruje cross-link blok „Datový klíč" (article-databox)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['lekari_per_1000', { id: 'lekari_per_1000', value: 4.2, unit: '/1000', year: 2024 }]]);
  // Databox: popisná věta s číslem v oblastním štítku / odkazu na zákon —
  // NE citace hodnoty indikátoru → nesmí flagovat.
  const databox = `
    <aside class="article-databox" aria-label="Datový rámec článku">
      <ul class="article-databox-list">
        <li><a href="indikator-lekari_per_1000.html"><strong>Lékaři na 1 000 obyvatel</strong></a> — souhrnná hustota, propojení se zákonem 95/2004 Sb. (oblast: Struktury → Lidské zdroje)</li>
      </ul>
    </aside>`;
  assert.equal(findIndicatorDrift(databox, byId).length, 0, 'databox je cross-link, ne citace');
  // Tatáž zastaralá citace v těle článku (mimo databox) se ale flaguje dál.
  const body = '<p>V krajích připadá průměrně 3,4 lékaře na 1 000 obyvatel — <a href="indikator-lekari_per_1000.html">detail</a>.</p>';
  assert.equal(findIndicatorDrift(body, byId).length, 1, 'drift v těle článku zůstává');
});

test('findIndicatorDrift: bez čísel v okolí neflaguje (jen odkaz bez citace)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }]]);
  const html = '<a href="indikator-foo_ind.html">detail indikátoru</a> bez čísel okolo.';
  assert.equal(findIndicatorDrift(html, byId).length, 0);
});

test('findIndicatorDrift: jednociferná varianta nematchne uvnitř letopočtu (boundary)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['pad_ind', { id: 'pad_ind', value: 2.1, unit: '/1000', year: 2024 }]]);
  // okno obsahuje rok 2026 (obsahuje číslici 2), ale NE hodnotu 2,1 → musí flagovat
  const html = '<p>V roce 2026 bylo pádů 3,4 na 1 000 hospitalizací — <a href="indikator-pad_ind.html">detail</a></p>';
  const drifts = findIndicatorDrift(html, byId);
  assert.equal(drifts.length, 1, 'stará citace 3,4 ≠ aktuální 2,1; rok 2026 nesmí maskovat drift');
  // a naopak: správná citace 2,1 nesmí flagovat
  const ok = '<p>Pádů je 2,1 na 1 000 hospitalizací (2024) — <a href="indikator-pad_ind.html">detail</a></p>';
  assert.equal(findIndicatorDrift(ok, byId).length, 0);
});

// --- F3: ladění nočního skeneru (2 doložené vzory šumu, PLAN-PRACE.md) ---

test('findIndicatorDrift vzor 1: atribuční „<a>Label</a> (RRRR)" neflaguje (zdrojová poznámka, ne citace)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['vakcinace_mmr_deti', { id: 'vakcinace_mmr_deti', value: 83.7, unit: '%', year: 2022 }],
    ['vakcinace_chripka_65', { id: 'vakcinace_chripka_65', value: 24.5, unit: '%', year: 2025 }],
  ]);
  // Přesně vzor z drift-revize: "Zdroj: … — MMR (2022), chřipka 65+ (2025)."
  // Label "chřipka 65+" nese vlastní číslo (65) — bez odstranění labelu by
  // samo o sobě falešně "otevřelo" kontrolu, i když jde jen o název indikátoru.
  const html = `<p class="av-figure-note"><strong>Zdroj:</strong> dashboard HSPA Monitoru —
    <a href="indikator-vakcinace_mmr_deti.html">MMR</a> (2022),
    <a href="indikator-vakcinace_chripka_65.html">chřipka 65+</a> (2025).
    Zdroj dat OECD/SZÚ.</p>`;
  assert.equal(findIndicatorDrift(html, byId).length, 0, 'atribuční rok+label se nemá brát jako citace');
});

test('findIndicatorDrift vzor 1: skutečná citace se stejným rokem v závorce dál flaguje', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }]]);
  // Rok v závorce NENÍ bezprostředně za </a> (je tam ještě text s číslem) →
  // musí se pořád vyhodnotit jako citace a zachytit drift (35,8 ≠ 98,7).
  const html = '<p>Hodnota <a href="indikator-foo_ind.html">Foo</a> — ČR 35,8 % (2022) vs. OECD 91 %.</p>';
  const drifts = findIndicatorDrift(html, byId);
  assert.equal(drifts.length, 1, 'citace s hodnotou před rokem v závorce se nesmí ignorovat');
});

test('findIndicatorDrift vzor 2: položka „article-list-bullets" bez čísla s jednotkou neflaguje', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['psychiatri_per_100k', { id: 'psychiatri_per_100k', value: 13, unit: '/ 100 000', year: 2024 }],
  ]);
  // Přesně vzor z clanek-czechsex-sexualni-nasili.html: položka jen odkazuje
  // na téma ("kapacita systému"), label sám nese "100 000" z názvu indikátoru.
  const html = `<ul class="article-list-bullets">
      <li><a href="indikator-psychiatri_per_100k.html"><strong>Psychiatři na 100 000 obyvatel</strong></a> — kapacita systému</li>
    </ul>`;
  assert.equal(findIndicatorDrift(html, byId).length, 0, 'položka bez citace hodnoty se nemá flagovat');
});

test('findIndicatorDrift vzor 2: položka „article-list-bullets" SE skutečnou zastaralou citací dál flaguje', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }]]);
  // Položka stejného typu seznamu, ale TENTOKRÁT s citovanou (zastaralou) hodnotou.
  const html = `<ul class="article-list-bullets">
      <li><a href="indikator-foo_ind.html"><strong>Foo indikátor</strong></a> — ČR 35,8 % vs. OECD 91 %</li>
    </ul>`;
  const drifts = findIndicatorDrift(html, byId);
  assert.equal(drifts.length, 1, 'citovaná hodnota v položce seznamu se pořád musí ověřit');
});

test('findIndicatorDrift vzor 2: seznam BEZ třídy article-list-bullets se chová jako dřív (nechráněný)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }]]);
  // Obyčejná <li> bez obklopujícího <ul class="article-list-bullets"> — širší
  // okno se použije jako dřív; citace za odkazem (mimo <li>) se pořád najde.
  const html = '<li><a href="indikator-foo_ind.html">Foo</a> — 35,8 % vs. OECD 91 %</li>';
  assert.equal(findIndicatorDrift(html, byId).length, 1);
});

test('findIndicatorDrift: přeťatý sousední odkaz na okraji okna nezanechá zbytek atributu jako falešné číslo', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['bar_ind', { id: 'bar_ind', value: 5, unit: '%', year: 2024 }],
  ]);
  // Odkaz na JINÝ indikátor s "per_100k" v id těsně před zkoumaným odkazem —
  // hranice okna (m.index - 60) by bez ochrany řízla doprostřed jeho href
  // atributu a zanechala by "…per_100k.html">" jako text s číslicemi.
  const html = '<p>Souvisí s hustotou <a href="indikator-nejaky_jiny_per_100k.html">psychiatrů</a> a spotřebou <a href="indikator-bar_ind.html">antidepresiv</a>; bez konkrétní hodnoty.</p>';
  assert.equal(findIndicatorDrift(html, byId).length, 0, 'zbytek href sousedního odkazu se nesmí počítat jako citace');
});
