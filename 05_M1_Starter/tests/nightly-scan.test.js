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

// --- date-passed: razítka pořízení dat nejsou sliby ---
//
// Datum stažení / ověření / aktualizace je v článku vždy pozdější než
// publikace a vždy už uplynulé. Bez tohoto veta se článek po každé noční
// revizi, která do něj zapíše datum kontroly, vrací do fronty date-passed —
// a protože date-passed obchází přeskočení recentně auditovaných článků,
// vytlačuje z 3–5 revizí za noc skutečnou práci. (Nález review bota, PR #1013.)

test('isSourceStamp: pozná razítko pořízení dat, mlčí u slibu', async () => {
  const { isSourceStamp } = await import('../scripts/nightly-scan.js');
  const at = (t, needle) => isSourceStamp(t, t.indexOf(needle));
  assert.ok(at('Staženo 16. 8. 2026 přes REST API', '16.'), 'staženo');
  assert.ok(at('Aktualizace 13. 8. 2026: resort ohlásil posun', '13.'), 'aktualizace');
  assert.ok(at('platnou úpravou zatím není (ověřeno 12. 8. 2026)', '12.'), 'ověřeno');
  assert.ok(at('refresh datové sady z 19. 8. 2026 nic nepřinesl', '19.'), 'refresh + vsuvka');
  assert.ok(at('čísla vycházejí z odhadů k datu vydání (8. 5. 2026)', '8. 5.'), 'k datu vydání');
  assert.ok(!at('Novela nabývá účinnosti od 1. 2. 2026', '1. 2.'), 'slib není razítko');
  assert.ok(!at('Vláda návrh projedná 3. 6. 2026', '3. 6.'), 'projednání není razítko');
});

test('date-passed: razítka pořízení dat se neflagují', () => {
  const item = scanArticle(fx('source-stamp-datepassed'), TODAY, { skipReviewed: true });
  const passed = item.flags.filter(f => f.type === 'date-passed');
  assert.deepEqual(passed, [], `žádné date-passed, dostal ${JSON.stringify(passed)}`);
});

test('date-passed: razítko v článku neumlčí skutečný slib jinde', () => {
  const item = scanArticle(fx('stamp-and-promise'), TODAY, { skipReviewed: true });
  const passed = item.flags.filter(f => f.type === 'date-passed');
  assert.equal(passed.length, 1, 'právě jeden flag — slib ano, razítko ne');
  assert.equal(passed[0].date, '2026-02-01');
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

test('stripNonValueNumbers: odfiltruje roky, slug číslice a sbírkové citace (issue #688)', async () => {
  const { stripNonValueNumbers } = await import('../scripts/nightly-scan.js');
  // věkový rozsah ze slugu
  assert.ok(!/\d{2,}/.test(stripNonValueNumbers('sebevraždy mladistvých 15–19 let, detail indikátoru', 'sebevrazdy_mladistvi_15_19')));
  // rok v popisku grafu
  assert.ok(!/\d{2,}/.test(stripNonValueNumbers('Proočkovanost MMR (2022), zdroj ÚZIS', 'vakcinace_mmr_deti')));
  // „100k" ze slugu sousedního odkazu
  assert.ok(!/\d{2,}/.test(stripNonValueNumbers('psychiatrů na 100k obyvatel, spotřeba antidepresiv', 'psychiatri_per_100k')));
  // sbírková citace
  assert.ok(!/\d{2,}/.test(stripNonValueNumbers('podle zákona 95/2004 Sb. a vyhlášky 70/2012', 'lekari_per_1000')));
  // skutečná hodnota s desetinnou čárkou PŘEŽIJE filtr
  assert.ok(/\d+,\d+/.test(stripNonValueNumbers('účast jen 52,6 procenta (2023)', 'prohlidka_prakticky_lekar')));
  // věkový práh se sufixem „+" (issue #745) — „18+", „65+"
  assert.ok(!/\d{2,}/.test(stripNonValueNumbers('denní kouření dospělých, věk 18+', 'kuractvi_denni')));
  assert.ok(!/\d{2,}/.test(stripNonValueNumbers('pracovníci LTC na 100 osob 65+', 'pracovnici_ltc_per_100_65plus')));
  // reálná hodnota se sufixem jednotky (ne „+") PŘEŽIJE — např. „62 index"
  assert.ok(/\d{2,}/.test(stripNonValueNumbers('adopce e-zdravotnictví 62 index', 'ehealth_adoption')));
  // jmenovatel míry „1 000" se NESTRIPUJE (review PR #784) — u jednociferné
  // rate-citace „3 / 1 000" musí zůstat důkazem, že „3" je hodnota
  assert.ok(/\d{2,}/.test(stripNonValueNumbers('hustota 3 sestry / 1 000 obyvatel', 'sestry_per_1000')));
});

test('stripNonValueNumbers: jmenovatel míry BEZ čitatele je název jednotky, ne citace (issue #878)', async () => {
  const { stripNonValueNumbers } = await import('../scripts/nightly-scan.js');
  // Odkaz-atribuce v běžném odstavci: jediné číslo v okně je jmenovatel
  // v labelu odkazu („hustotu lékařů na 1 000 obyvatel") — žádná citace
  // hodnoty. Dřív to spouštělo falešný indicator-drift.
  assert.ok(!/\d+,\d+|\d{2,}/.test(stripNonValueNumbers(
    'HSPA Monitor už několik ukazatelů sleduje: hustotu lékařů na 1 000 obyvatel i počet absolventů',
    'lekari_per_1000')));
  assert.ok(!/\d+,\d+|\d{2,}/.test(stripNonValueNumbers(
    'hustotu lékáren na 100 000 obyvatel', 'lekarny_per_100k')));
  assert.ok(!/\d+,\d+|\d{2,}/.test(stripNonValueNumbers(
    'psychiatrů na 100 tisíc obyvatel i průměrnou délku hospitalizace', 'psychiatri_per_100k')));
  assert.ok(!/\d+,\d+|\d{2,}/.test(stripNonValueNumbers(
    'adopcí elektronického zdravotnictví per 100 000 obyvatel', 'ehealth_adoption')));
  // REÁLNÝ drift (zastaralá hodnota u jmenovatele) filtr PŘEŽIJE — jinak by
  // heuristika maskovala to, co má hlásit
  assert.ok(/\d+,\d+/.test(stripNonValueNumbers(
    'zastaralá hustota 3,8 lékaře na 1 000 obyvatel', 'lekari_per_1000')));
  assert.ok(/\d+,\d+/.test(stripNonValueNumbers(
    'kojenecká úmrtnost klesla na 2,4 na 1 000 živě narozených', 'mortalita_kojenecka')));
});

test('findIndicatorDrift: odkaz-atribuce se správnou hodnotou jinde v článku se neflaguje (issue #745)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['prezit_karcinom_prsu_5let', { id: 'prezit_karcinom_prsu_5let', value: 81.4, unit: '%', year: 2014 }],
  ]);
  // Metodický odstavec u odkazu obsahuje jiné číslo („MKN-10 C50"), ale
  // správná hodnota 81,4 % je citována jinde v článku → není to drift.
  const html = `
    <p>Pětileté přežití karcinomu prsu je v Česku <strong>81,4 %</strong>.</p>
    <p>Indikátor <a href="indikator-prezit_karcinom_prsu_5let.html">prezit_karcinom_prsu_5let</a>
       sleduje čisté přežití (MKN-10 C50) očištěné o jiné příčiny úmrtí.</p>`;
  assert.equal(findIndicatorDrift(html, byId).length, 0, 'hodnota v článku přítomna → žádný drift');
  // Když správná hodnota v článku NENÍ nikde a okno cituje jiné číslo → flag.
  const stale = `
    <p>Pětileté přežití je podle staršího odhadu <strong>74,0 %</strong>
       (<a href="indikator-prezit_karcinom_prsu_5let.html">indikátor</a>).</p>`;
  assert.equal(findIndicatorDrift(stale, byId).length, 1, 'chybí správná hodnota → drift se hlásí');
});

test('findIndicatorDrift: falešné poplachy z #688 už neflaguje, skutečný drift ano', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['sebevrazdy_mladistvi_15_19', { id: 'sebevrazdy_mladistvi_15_19', value: 6.96, unit: '/100k', year: 2023 }],
    ['vakcinace_mmr_deti', { id: 'vakcinace_mmr_deti', value: 83.7, unit: '%', year: 2022 }],
  ]);
  // okno obsahuje jen věkový rozsah/rok → žádná citace hodnoty → žádný flag
  const fp = `
    <p>Sebevraždy mladistvých ve věku 15–19 let sledujeme v <a href="indikator-sebevrazdy_mladistvi_15_19.html">indikátoru</a>.</p>
    <p>Detail v <a href="indikator-vakcinace_mmr_deti.html">indikátoru MMR</a> (za rok 2022).</p>`;
  assert.equal(findIndicatorDrift(fp, byId).length, 0, 'roky a věkové rozsahy nejsou citace');
  // skutečná zastaralá citace se flaguje dál
  const real = '<p>Proočkovanost MMR je 91,2 procenta — <a href="indikator-vakcinace_mmr_deti.html">detail</a>.</p>';
  assert.equal(findIndicatorDrift(real, byId).length, 1, 'zastaralé číslo se pořád chytá');
});

test('isDriftIgnored: ověřený falešný pár se ignoruje, ostatní ne', async () => {
  const { isDriftIgnored } = await import('../scripts/nightly-scan.js');
  const ign = new Set(['clanek-x.html::ehealth_adoption']);
  assert.equal(isDriftIgnored('clanek-x.html', 'ehealth_adoption', ign), true);
  assert.equal(isDriftIgnored('clanek-x.html', 'jiny_indikator', ign), false, 'jiný indikátor v témže článku se neignoruje');
  assert.equal(isDriftIgnored('clanek-y.html', 'ehealth_adoption', ign), false, 'stejný indikátor v jiném článku se neignoruje');
});

test('nightly-scan-ignore.json: validní schéma a všechny páry mají důvod+datum', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const doc = JSON.parse(fs.readFileSync(path.resolve(dir, '..', 'scripts', 'nightly-scan-ignore.json'), 'utf8'));
  assert.ok(Array.isArray(doc.ignore), 'ignore je pole');
  for (const e of doc.ignore) {
    assert.ok(e.article && e.article.endsWith('.html'), `${e.indicator}: article je clanek-*.html`);
    assert.ok(e.indicator && /^[a-z0-9_]+$/.test(e.indicator), `${e.article}: indicator je slug`);
    assert.ok(e.reason && e.reason.length > 20, `${e.article}/${e.indicator}: netriviální reason`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.added), `${e.article}/${e.indicator}: added je datum`);
  }
});
