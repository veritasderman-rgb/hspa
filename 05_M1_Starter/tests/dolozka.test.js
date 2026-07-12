// Doložka — testy výpočetního enginu (src/dolozka-engine.js), viz PLAN-DOLOZKA.md §A.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normText,
  claimsForArticle,
  locateClaims,
  matchesContract,
  driftStatus,
  articleTrustStats,
  corpusTrustStats,
} from '../src/dolozka-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const claimsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'claims.json'), 'utf8'));
const indicatorsData = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8')
);
const indicatorsById = new Map(indicatorsData.indicators.map((i) => [i.id, i]));

/** Pomocník: syntetické tvrzení s rozumnými defaulty. */
function tvrzeni(prepis = {}) {
  return {
    id: 'test-claim--01',
    article: 'clanek-test.html',
    quote: 'ČR 52,6 %',
    metric: 'Testovací metrika',
    value: 52.6,
    unit: '%',
    as_of: 2023,
    location: 'prose',
    indicator_id: 'test_indikator',
    relation: 'exact',
    check: 'auto',
    ...prepis,
  };
}

/** Pomocník: Map s jedním syntetickým indikátorem. */
function mapa(hodnota = 52.6, rok = 2024) {
  return new Map([['test_indikator', { id: 'test_indikator', value: hodnota, year: rok }]]);
}

// ---------------------------------------------------------------------------
// normText
// ---------------------------------------------------------------------------

test('normText: nezlomitelné mezery a newliny kolabují na jednu mezeru', () => {
  assert.equal(normText('ČR 9,5 %'), 'ČR 9,5 %');
  assert.equal(normText('první\n  řádek\t\tdruhý'), 'první řádek druhý');
  assert.equal(normText('  okraje se ořežou  '), 'okraje se ořežou');
  assert.equal(normText('a   \n b'), 'a b', 'mix mezer, nbsp a newlinu = jedna mezera');
});

// ---------------------------------------------------------------------------
// claimsForArticle
// ---------------------------------------------------------------------------

test('claimsForArticle: vybere jen tvrzení daného slugu', () => {
  const pole = [
    tvrzeni({ id: 'a', article: 'clanek-a.html' }),
    tvrzeni({ id: 'b', article: 'clanek-b.html' }),
    tvrzeni({ id: 'c', article: 'clanek-a.html' }),
  ];
  const vysledek = claimsForArticle(pole, 'clanek-a.html');
  assert.deepEqual(vysledek.map((c) => c.id), ['a', 'c']);
  assert.deepEqual(claimsForArticle(pole, 'clanek-x.html'), []);
});

// ---------------------------------------------------------------------------
// locateClaims
// ---------------------------------------------------------------------------

test('locateClaims: quote křížící whitespace se najde v normalizovaném textu', () => {
  const body = normText('Diabetes má v ČR prevalenci   9,5\n%, tedy hodně.');
  const claim = tvrzeni({ quote: 'ČR prevalenci 9,5 %' });
  const hits = locateClaims(body, [claim]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].claim, claim);
  assert.equal(
    body.slice(hits[0].start, hits[0].end),
    'ČR prevalenci 9,5 %',
    'interval ukazuje na normalizovaný výskyt'
  );
});

test('locateClaims: dva překrývající se quotes — delší vyhrává', () => {
  const body = 'Naděje dožití činí 79,9 let a dál roste.';
  const kratsi = tvrzeni({ id: 'kratsi', quote: '79,9' });
  const delsi = tvrzeni({ id: 'delsi', quote: 'činí 79,9 let' });
  const hits = locateClaims(body, [kratsi, delsi]);
  assert.equal(hits.length, 1, 'kratší překrývající se quote se zahodí');
  assert.equal(hits[0].claim.id, 'delsi');
});

test('locateClaims: quote 2× v textu → jen první výskyt', () => {
  const body = 'Hodnota 42 % na začátku a znovu hodnota 42 % na konci.';
  const claim = tvrzeni({ quote: '42 %' });
  const hits = locateClaims(body, [claim]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].start, body.indexOf('42 %'), 'první výskyt');
});

test('locateClaims: nenalezený nebo prázdný quote se přeskočí', () => {
  const body = 'Text bez žádných čísel z registru.';
  const hits = locateClaims(body, [
    tvrzeni({ id: 'chybi', quote: '99,9 %' }),
    tvrzeni({ id: 'prazdny', quote: '' }),
    tvrzeni({ id: 'jen-mezery', quote: '  \n ' }),
  ]);
  assert.deepEqual(hits, []);
});

test('locateClaims: víc nepřekrývajících se quotes → seřazeno podle start', () => {
  const body = 'Nejdřív 10 % pacientů, potom rozdíl 52,6 let mezi kraji.';
  const a = tvrzeni({ id: 'a', quote: 'rozdíl 52,6 let' });
  const b = tvrzeni({ id: 'b', quote: '10 %' });
  const hits = locateClaims(body, [a, b]);
  assert.deepEqual(hits.map((h) => h.claim.id), ['b', 'a'], 'vzestupně podle pozice');
  assert.ok(hits[0].start < hits[1].start);
});

// ---------------------------------------------------------------------------
// matchesContract
// ---------------------------------------------------------------------------

test('matchesContract: přesná shoda a shoda po zaokrouhlení na desetiny claimu', () => {
  assert.equal(matchesContract(52.6, 52.6), true, 'identická hodnota');
  assert.equal(matchesContract(52.6, 52.63), true, '52,63 zaokrouhleno na 1 des. místo = 52,6');
  assert.equal(matchesContract(52.6, 52.75), false, '52,75 → 52,8 ≠ 52,6');
  assert.equal(matchesContract(60, 60.4), true, 'celé číslo: zaokrouhlení na 0 des. míst');
  assert.equal(matchesContract(60, 60.6), false);
});

test('matchesContract: procentní tolerance tolerance_pct', () => {
  assert.equal(matchesContract(100, 104, 5), true, 'odchylka 3,85 % ≤ 5 %');
  assert.equal(matchesContract(100, 110, 5), false, 'odchylka 9,09 % > 5 %');
  assert.equal(matchesContract(100, 104), false, 'bez tolerance zaokrouhlení nestačí');
});

test('matchesContract: contract null/NaN/nula → bezpečné chování', () => {
  assert.equal(matchesContract(52.6, null), false);
  assert.equal(matchesContract(52.6, NaN), false);
  assert.equal(matchesContract(52.6, undefined), false);
  assert.equal(matchesContract(5, 0, 10), false, 'contract 0 → tolerance se nepoužije (dělení nulou)');
  assert.equal(matchesContract(0, 0), true, 'nula proti nule sedí přes zaokrouhlení');
});

// ---------------------------------------------------------------------------
// driftStatus
// ---------------------------------------------------------------------------

test('driftStatus: exact + auto + shoda → current (s contractValue a contractYear)', () => {
  const r = driftStatus(tvrzeni(), mapa(52.63, 2024));
  assert.equal(r.status, 'current');
  assert.equal(r.contractValue, 52.63);
  assert.equal(r.contractYear, 2024);
  assert.ok(r.indicator, 'vrací i indikátor');
});

test('driftStatus: exact + auto + neshoda → changed (vrací contractValue)', () => {
  const r = driftStatus(tvrzeni(), mapa(55.1, 2025));
  assert.equal(r.status, 'changed');
  assert.equal(r.contractValue, 55.1);
  assert.equal(r.contractYear, 2025);
});

test('driftStatus: manual / related / bez indicator_id → reference', () => {
  assert.equal(driftStatus(tvrzeni({ check: 'manual' }), mapa()).status, 'reference');
  assert.equal(driftStatus(tvrzeni({ relation: 'related' }), mapa()).status, 'reference');
  assert.equal(driftStatus(tvrzeni({ indicator_id: undefined }), mapa()).status, 'reference');
});

test('driftStatus: chybějící indikátor nebo indikátor bez čísla → reference', () => {
  const chybi = driftStatus(tvrzeni({ indicator_id: 'neexistuje' }), mapa());
  assert.equal(chybi.status, 'reference');
  assert.equal(chybi.indicator, null);

  const bezCisla = driftStatus(tvrzeni(), mapa(null));
  assert.equal(bezCisla.status, 'reference');
  assert.ok(bezCisla.indicator, 'indikátor existuje, jen nemá číselnou hodnotu');
});

test('driftStatus: tolerance_pct se propaguje do matchesContract', () => {
  const claim = tvrzeni({ value: 100, tolerance_pct: 5 });
  assert.equal(driftStatus(claim, mapa(104)).status, 'current');
  assert.equal(driftStatus(claim, mapa(110)).status, 'changed');
});

// ---------------------------------------------------------------------------
// articleTrustStats
// ---------------------------------------------------------------------------

test('articleTrustStats: počty po statusech a invariant auto = current + changed', () => {
  const pole = [
    tvrzeni({ id: '1' }), // current (52,6 vs 52,6)
    tvrzeni({ id: '2', value: 40 }), // changed
    tvrzeni({ id: '3', check: 'manual' }), // reference
    tvrzeni({ id: '4', article: 'clanek-jiny.html' }), // jiný článek — nepočítá se
  ];
  const s = articleTrustStats(pole, 'clanek-test.html', mapa());
  assert.deepEqual(s, { total: 3, auto: 2, current: 1, changed: 1, reference: 1 });
});

// ---------------------------------------------------------------------------
// integrační testy nad reálnými daty (data/claims.json + data/indicators.json)
// ---------------------------------------------------------------------------

test('reálná data: corpusTrustStats je konzistentní přes celý registr', () => {
  const s = corpusTrustStats(claimsData.claims, indicatorsById);
  assert.equal(s.total, claimsData.claims.length, 'total = počet záznamů registru');
  assert.ok(s.auto > 0, 'aspoň část tvrzení se kontroluje automaticky');
  assert.ok(s.current > 0, 'aspoň část tvrzení odpovídá kontraktu');
  assert.equal(s.current + s.changed, s.auto, 'auto = current + changed');
  assert.equal(s.current + s.changed + s.reference, s.total, 'statusy pokrývají vše');
  assert.ok(s.articles > 0, 'registr pokrývá aspoň jeden článek');
  assert.equal(
    s.articles,
    new Set(claimsData.claims.map((c) => c.article)).size,
    'articles = počet unikátních slugů'
  );
});

test('reálná data: exact + auto tvrzení dostávají verdikt (ne reference)', () => {
  const kandidati = claimsData.claims
    .filter((c) => c.relation === 'exact' && c.check === 'auto' && c.indicator_id)
    .slice(0, 3);
  assert.equal(kandidati.length, 3, 'registr má aspoň 3 exact+auto tvrzení');
  for (const claim of kandidati) {
    const r = driftStatus(claim, indicatorsById);
    assert.ok(
      r.status === 'current' || r.status === 'changed',
      `claim ${claim.id} má verdikt (dostal '${r.status}')`
    );
    assert.ok(r.indicator, `claim ${claim.id} má dohledaný indikátor`);
    assert.ok(Number.isFinite(r.contractValue), `claim ${claim.id} nese contractValue`);
  }
});

// ---------------------------------------------------------------------------
// locateClaims — review nálezy PR #786 (quotes s HTML tagy, sdílené quotes)
// ---------------------------------------------------------------------------

test('locateClaims: quote s inline HTML tagy se najde v čistém textu (review #786)', () => {
  const body = 'Studie v JAMA Network Open ukázala pokles — ČR 26,3 % oproti průměru.';
  const sTagem = { id: 't1', quote: 'v <em>JAMA Network Open</em> ukázala' };
  const sKoncovymi = { id: 't2', quote: 'pokles</a></strong> — ČR 26,3 %' };
  const hits = locateClaims(body, [sTagem, sKoncovymi]);
  assert.equal(hits.length, 2, 'oba otagované quotes se po stripu tagů najdou');
});

test('locateClaims: dva claims se STEJNÝM quote → jeden výskyt se skupinou obou (review #786)', () => {
  const body = 'Spokojenost: 72 % vs. OECD 78 % — pod průměrem.';
  const cr = { id: 'cr', quote: '72 % vs. OECD 78 %', metric: 'ČR' };
  const oecd = { id: 'oecd', quote: '72 % vs. OECD 78 %', metric: 'OECD' };
  const hits = locateClaims(body, [cr, oecd]);
  assert.equal(hits.length, 1, 'jeden sdílený výskyt');
  assert.equal(hits[0].claims.length, 2, 'skupina nese OBA claims');
  assert.equal(hits[0].claim.id, 'cr', 'claim = první ze skupiny (zpětná kompatibilita)');
  // entry bez skupiny má claims = [claim]
  const solo = locateClaims('Hodnota 52,6 procenta.', [{ id: 's', quote: '52,6 procenta' }]);
  assert.equal(solo[0].claims.length, 1);
});

test('locateClaims: reálné otagované quotes z registru se najdou ve svém článku', () => {
  const fs2 = fs;
  const otagovane = claimsData.claims.filter((c) => /<[^>]+>/.test(c.quote)).slice(0, 3);
  assert.ok(otagovane.length >= 1, 'registr obsahuje otagované quotes');
  for (const claim of otagovane) {
    const html = fs2.readFileSync(path.join(ROOT, claim.article), 'utf8');
    // textová vrstva: strip tagů z HTML (jako textContent) + normalizace
    const text = normText(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' '));
    const hits = locateClaims(text, [claim]);
    assert.equal(hits.length, 1, `otagovaný quote ${claim.id} se v ${claim.article} najde`);
  }
});
