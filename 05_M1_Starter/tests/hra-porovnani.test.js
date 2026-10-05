// Tři židle — porovnání kampaní (seminární režim): parser vstupu a sestavení
// tabulky z kódů (čisté funkce, bez DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCampaignInput, extractCodes, buildComparison, markIndexes } from '../src/hra-porovnani.js';
import { encodeShare, emptyState } from '../src/hra-stav.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const DOCS = { VYHLASKA: read('vyhlaska-hra.json'), REDITEL: read('reditel-hra.json'), PRIBEH: read('pribeh-pacienta.json') };
const preset = (id) => DOCS.VYHLASKA.presets.find(p => p.id === id).alloc;

function stateWith(alloc, extra = {}) {
  return { ...emptyState(), ministr: { alloc }, ...extra };
}

test('extractCodes: z odkazu (i víc kódů), z holého kódu, jinak nic', () => {
  assert.deepEqual(extractCodes('https://x.cz/hra.html?k=AbC_12-xyz'), ['AbC_12-xyz']);
  assert.deepEqual(extractCodes('https://x.cz/porovnani.html?k=AAAAAAAA&k=BBBBBBBB'), ['AAAAAAAA', 'BBBBBBBB']);
  assert.deepEqual(extractCodes('AbC_12-xyz'), ['AbC_12-xyz']);
  assert.deepEqual(extractCodes('Jana:'), []);
  assert.deepEqual(extractCodes('krátký'), []);
});

test('parseCampaignInput: jméno + odkaz, holý kód, prázdné řádky, neplatný řádek', () => {
  const text = `
    Jana: https://skorezdravotnictvi.cz/hra.html?k=AAAAAAAAAA
    https://skorezdravotnictvi.cz/hra.html?k=BBBBBBBBBB
    Petr — CCCCCCCCCC
    nesmysl bez kódu
  `;
  const rows = parseCampaignInput(text);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { label: 'Jana', code: 'AAAAAAAAAA', raw: 'Jana: https://skorezdravotnictvi.cz/hra.html?k=AAAAAAAAAA' });
  assert.equal(rows[1].label, 'Kampaň 2');
  assert.equal(rows[1].code, 'BBBBBBBBBB');
  assert.deepEqual([rows[2].label, rows[2].code], ['Petr', 'CCCCCCCCCC']);
  assert.equal(rows[3].code, null, 'řádek bez kódu je neplatný, ale zůstává (sloupec „neplatný kód")');
  assert.equal(rows[3].label, 'nesmysl bez kódu');
  // odkaz na porovnání s více kódy se rozbalí na víc kampaní
  const multi = parseCampaignInput('Seminář: https://x.cz/porovnani.html?k=AAAAAAAAAA&k=BBBBBBBBBB');
  assert.deepEqual(multi.map(r => [r.label, r.code]), [['Seminář 1', 'AAAAAAAAAA'], ['Seminář 2', 'BBBBBBBBBB']]);
  assert.deepEqual(parseCampaignInput(''), []);
});

test('buildComparison: dvě vyhlášky vedle sebe — alokace, verdikt, trilema, projekce; neplatný kód = prázdný sloupec', () => {
  const sq = encodeShare(stateWith(preset('status_quo')));
  const ref = encodeShare(stateWith(preset('reformni')));
  const cmp = buildComparison([
    { label: 'Status quo', code: sq }, { label: 'Reforma', code: ref }, { label: 'Rozbité', code: 'nesmysl!!' },
  ], DOCS);
  assert.deepEqual(cmp.columns.map(c => c.invalid), [false, false, true]);
  assert.deepEqual(cmp.shareCodes, [sq, ref]);

  const alloc = cmp.rows.filter(r => r.group === 'Alokace růstu (%)');
  assert.equal(alloc.length, DOCS.VYHLASKA.segments.length, 'řádek pro každý segment');
  const prakt = alloc.find(r => r.label === 'Praktičtí lékaři');
  assert.deepEqual(prakt.values, [7, 10, null]);
  assert.match(prakt.hint, /žádá \+8 %/);

  const deals = cmp.rows.find(r => r.label.startsWith('Dohody'));
  assert.equal(deals.values[0], 12, 'status quo = 12/15 jako realita');
  assert.equal(deals.values[2], null);
  const prot = cmp.rows.find(r => r.label === 'Protesty');
  assert.ok(prot.values[1] >= 1, 'reformní preset má nemocnice v protestu (relativní spravedlnost)');
  const s10 = cmp.rows.find(r => r.label.startsWith('Lůžkový blok po 10'));
  assert.equal(s10.values[0], 56.3);
  assert.ok(s10.values[1] < 52);
  const oecd = cmp.rows.find(r => r.label.startsWith('Let k průměru OECD'));
  assert.equal(oecd.values[0], 'nikdy');
  assert.match(oecd.values[1], /^4\d$/);
  const tri = cmp.rows.filter(r => r.group === 'Trilema vyhlášky');
  assert.equal(tri.length, 3);
  assert.equal(tri[0].values[0].tone, 'mid');
  assert.equal(tri[0].values[1].tone, 'bad');
  // akt II/III neodehrané → prázdné buňky
  assert.equal(cmp.rows.find(r => r.label === 'Persona').values[0], null);
  assert.equal(cmp.rows.find(r => r.label.startsWith('Růst rozpočtu')).values[0], null);
});

test('buildComparison: odehraný akt II a III se přepočítají enginy (persona, týdny, rozpočet s deficitem)', () => {
  const alloc = Object.fromEntries(DOCS.VYHLASKA.segments.map(s => [s.id, 10])); // deficit
  const decisions = Object.fromEntries(DOCS.REDITEL.decisions.map(d => [d.id, d.options[0].id]));
  const st = stateWith(alloc, {
    reditel: { decisions },
    pacient: { persona: 'diabetik', decisions: { prohlidka: 'chodit', noha: 'podiatrie' } },
  });
  const cmp = buildComparison([{ label: 'Plná', code: encodeShare(st) }], DOCS);
  const growth = cmp.rows.find(r => r.label.startsWith('Růst rozpočtu')).values[0];
  assert.ok(Number.isFinite(growth) && growth < 10, 'deficit vyhlášky rozpočet zkrátil pod 10 %');
  assert.equal(cmp.rows.find(r => r.label === 'Persona').values[0], 'Pan Karel, 58 let');
  assert.ok(cmp.rows.find(r => r.label === 'Týdnů v systému').values[0] > 0);
  assert.equal(cmp.rows.find(r => r.label === 'Z kapsy (Kč)').values[0], 500);
  const bil = cmp.rows.find(r => r.label.startsWith('Bilance'));
  assert.ok(bil.values[0] < 0, 'bilance záporná = deficit');
});

test('markIndexes: spread označí max i min, max/min jen jednu stranu, shodné hodnoty nic', () => {
  assert.deepEqual([...markIndexes([7, 10, null, 3], 'spread').max], [1]);
  assert.deepEqual([...markIndexes([7, 10, null, 3], 'spread').min], [3]);
  assert.deepEqual([...markIndexes([7, 10, 3], 'max').min], []);
  assert.deepEqual([...markIndexes([7, 10, 3], 'min').min], [2]);
  assert.deepEqual([...markIndexes([5, 5, 5], 'spread').max], []);
  assert.deepEqual([...markIndexes([5], 'spread').max], [], 'jedna hodnota = nic');
});
