// Síť smluvních poskytovatelů per ZP × odbornost × kraj: agregace na fixture + validátor.
// Fixture je malá a ručně sestavená; netestuje se síť (viz docs/pojistovny-sit.md).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ODBORNOSTI, REF_DATE, norm, splitObory, oborToKod, filterContractRows, aggregateSit, buildDocument,
} from '../ingest/fetchers/pojistovny-sit.js';
import { validateSit, validateAll } from '../ingest/validate-pojistovny.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const place = (ico, ruian, kraj, okres, obory) => ({
  poskytovatel_ICO: ico, ZZ_RUIAN_kod: ruian, ZZ_kraj_kod: kraj, ZZ_kraj_nazev: `Kraj ${kraj}`, ZZ_okres_kod: okres, ZZ_obor_pece: obory,
});

const PLACES = [
  place('1', '100', 'CZ010', 'CZ0100', 'alergologie a klinická imunologie'),                    // 0: sám na adrese
  place('2', '200', 'CZ020', 'CZ0201', 'dermatovenerologie, alergologie a klinická imunologie'), // 1: dva obory
  place('3', '300', 'CZ020', 'CZ0202', 'psychiatrie'),                                          // 2: ICO se dvěma místy
  place('3', '301', 'CZ020', 'CZ0203', 'psychiatrie'),                                          // 3
  place('4', '400', 'CZ031', 'CZ0311', 'Porodní asistentka'),                                   // 4: nesledovaný obor
  place('5', '500', 'CZ031', 'CZ0311', 'všeobecné praktické lékařství'),                         // 5: jediné místo IČO
  place('6', '600', 'CZ080', 'CZ0801', 'zubní lékařství'),                                      // 6: bez smlouvy
];

const row = (o) => ({
  CPO: '111', ICZ: '10000001', posledni_zaznam: '1', smluvni_zarizeni: '1', ICO: '1', adresa_RUIAN: '100', okres_RUIAN: '',
  okres: '', plat_od_rozsirena: '2010-01-01', plat_do_rozsirena: '2024-12-31', ...o,
});

test('norm a splitObory: diakritika, čárky, mezery', () => {
  assert.equal(norm('  Alergologie a Klinická  Imunologie '), 'alergologie a klinicka imunologie');
  assert.deepEqual(splitObory('Psychiatrie, Dermatovenerologie'), ['psychiatrie', 'dermatovenerologie']);
  assert.deepEqual(splitObory(''), []);
});

test('oborToKod: sledované odbornosti mají kódy číselníku VZP 770', () => {
  assert.equal(oborToKod('alergologie a klinicka imunologie'), '207');
  assert.equal(oborToKod('dermatovenerologie'), '404');
  assert.equal(oborToKod('vseobecne prakticke lekarstvi'), '001');
  assert.equal(oborToKod('zubni lekarstvi'), '014');
  assert.equal(oborToKod('psychiatrie'), '305');
  assert.equal(oborToKod('gynekologie a porodnictvi'), '603');
  assert.equal(oborToKod('porodni asistentka'), null);
  assert.equal(new Set(ODBORNOSTI.map(o => o.kod)).size, ODBORNOSTI.length);
});

test('filterContractRows: jen poslední smluvní záznam platný k referenčnímu dni', () => {
  const rows = [
    row({}),                                              // ok
    row({ posledni_zaznam: '0' }),                        // starší verze
    row({ smluvni_zarizeni: '0' }),                       // nesmluvní
    row({ smluvni_zarizeni: '' }),                        // neuvedeno
    row({ plat_do_rozsirena: '2023-12-31' }),             // skončilo před ref. dnem
    row({ plat_od_rozsirena: '2025-01-01' }),             // začíná po ref. dni
    row({ ICO: '00000000' }),                             // fiktivní IČO
    row({ ICO: '' }),
    row({ CPO: '999' }),                                  // neznámá ZP
    row({ CPO: '213', ICO: '2', adresa_RUIAN: '', okres_RUIAN: 'CZ0201' }),
  ];
  const out = filterContractRows(rows, REF_DATE);
  assert.equal(out.length, 2);
  assert.deepEqual(out[1], { zp: '213', icz: '10000001', ico: '2', ruian: '', okres: 'CZ0201' });
});

test('aggregateSit: párování adresa → okres → jediné místo, jedno místo se počítá jednou', () => {
  const contracts = [
    // ZP 111: IČO 1 na adrese 100 (alergologie, Praha); dvě IČZ na stejné adrese → místo se počítá jednou
    { zp: '111', icz: 'a', ico: '1', ruian: '100', okres: '' },
    { zp: '111', icz: 'b', ico: '1', ruian: '100', okres: '' },
    // IČO 2 adresa nesedí, okres ano → místo 1 (dva obory: derma + alergo)
    { zp: '111', icz: 'c', ico: '2', ruian: '999', okres: 'CZ0201' },
    // IČO 3 bez adresy, okres CZ0203 → jen místo 3
    { zp: '111', icz: 'd', ico: '3', ruian: '', okres: 'CZ0203' },
    // IČO 5 adresa nesedí, okres chybí, ale IČO má jediné místo
    { zp: '111', icz: 'e', ico: '5', ruian: '', okres: '' },
    // IČO 3 bez okresu → dvě místa, nejednoznačné → nepřiřazeno
    { zp: '205', icz: 'f', ico: '3', ruian: '', okres: '' },
    // neexistující IČO
    { zp: '205', icz: 'g', ico: '77', ruian: '', okres: '' },
    // ZP 205: IČO 1 přes adresu
    { zp: '205', icz: 'h', ico: '1', ruian: '100', okres: '' },
  ];
  const agg = aggregateSit(PLACES, contracts);

  assert.equal(agg.mist_nrpzs, 7);
  assert.deepEqual(agg.matice['111']['207'], { CZ010: 1, CZ020: 1 });
  assert.deepEqual(agg.matice['111']['404'], { CZ020: 1 });
  assert.deepEqual(agg.matice['111']['305'], { CZ020: 1 });
  assert.deepEqual(agg.matice['111']['001'], { CZ031: 1 });
  assert.deepEqual(agg.matice['205']['207'], { CZ010: 1 });
  assert.deepEqual(agg.matice['205']['305'], {}); // nejednoznačné IČO 3 se nepřiřadí
  assert.deepEqual(agg.matice['111']['014'], {}); // místo 6 nemá smlouvu

  // jmenovatel: všechna místa registru bez ohledu na smlouvu
  assert.deepEqual(agg.celkem_cr['207'], { CZ010: 1, CZ020: 1 });
  assert.deepEqual(agg.celkem_cr['014'], { CZ080: 1 });
  assert.deepEqual(agg.celkem_cr['305'], { CZ020: 2 });

  assert.deepEqual(agg.kvalita['111'], { icz_smluvni: 5, adresa: 2, okres: 2, jediny: 1, nepriraditelne: 0 });
  assert.deepEqual(agg.kvalita['205'], { icz_smluvni: 3, adresa: 1, okres: 0, jediny: 0, nepriraditelne: 2 });
  assert.deepEqual(agg.kvalita['209'], { icz_smluvni: 0, adresa: 0, okres: 0, jediny: 0, nepriraditelne: 0 });

  assert.deepEqual(agg.kraje.map(k => k.kod), ['CZ010', 'CZ020', 'CZ031', 'CZ080']);
});

test('aggregateSit: Praha — okres CZ0106 se spáruje s CZ0100 (správní obvody)', () => {
  const places = [place('9', '900', 'CZ010', 'CZ0100', 'psychiatrie')];
  const agg = aggregateSit(places, [{ zp: '111', icz: 'x', ico: '9', ruian: '', okres: 'CZ0106' }, { zp: '111', icz: 'y', ico: '9', ruian: '', okres: 'CZ0201' }]);
  assert.equal(agg.kvalita['111'].okres, 1);
  assert.equal(agg.kvalita['111'].jediny, 1); // druhé IČZ: okres nesedí, ale IČO má jediné místo
});

function fixtureDoc() {
  const contracts = [
    { zp: '111', icz: 'a', ico: '1', ruian: '100', okres: '' },
    { zp: '205', icz: 'h', ico: '1', ruian: '100', okres: '' },
    { zp: '111', icz: 'f', ico: '3', ruian: '', okres: '' },
  ];
  // doplnit 14 krajů, ať validátor nehlásí neúplný číselník krajů
  const places = [...PLACES];
  for (let i = 0; i < 14; i++) places.push(place(`9${i}`, `9${i}`, `CZ9${String(i).padStart(2, '0')}`, 'CZ0999', 'Porodní asistentka'));
  return buildDocument(aggregateSit(places, contracts), { generatedAt: '2026-11-02T00:00:00Z' });
}

test('validateSit: výstup agregace projde, má 7 ZP a metodiku', () => {
  const doc = fixtureDoc();
  const r = validateSit(doc);
  assert.deepEqual(r.errors, []);
  assert.equal(Object.keys(doc.matice).length, 7);
  assert.ok(doc.metoda.length >= 3 && doc.jednotka.includes('horní odhad'));
});

test('validateSit: chytá poškozená data', () => {
  const bad = (mut) => { const d = structuredClone(fixtureDoc()); mut(d); return validateSit(d).errors.join('\n'); };
  assert.match(bad(d => { d.matice['111']['207']['CZ010'] = 5; }), /smluvních míst nemůže být víc/);
  assert.match(bad(d => { d.matice['111']['207']['CZ999'] = 1; }), /neznámý kraj/);
  assert.match(bad(d => { d.matice['111']['207']['CZ010'] = -1; }), /nezáporné celé číslo/);
  assert.match(bad(d => { d.matice['111']['207']['CZ010'] = 0.5; }), /nezáporné celé číslo/);
  assert.match(bad(d => { d.matice['999'] = {}; }), /neznámý kód ZP/);
  assert.match(bad(d => { delete d.matice['213']; }), /chybí ZP 213/);
  assert.match(bad(d => { delete d.matice['111']['404']; }), /chybí odbornost 404/);
  assert.match(bad(d => { d.kvalita['111'].adresa += 1; }), /≠ icz_smluvni/);
  assert.match(bad(d => { d.kraje.push({ ...d.kraje[0] }); }), /duplicitní kód/);
  assert.match(bad(d => { d.kraje = d.kraje.slice(0, 5); }), /aspoň 14/);
  assert.match(bad(d => { d.odbornosti.push({ kod: '207', nazev: 'dup' }); }), /duplicitní kód/);
  assert.match(bad(d => { d.rok = '2024'; }), /rok musí být celé číslo/);
  assert.match(bad(d => { delete d.celkem_cr; }), /chybí celkem_cr/);
  assert.match(validateSit(null).errors.join(), /chybí nebo není objekt/);
});

test('validateSit: varuje, když je příliš mnoho IČZ nepřiřazeno', () => {
  const d = fixtureDoc();
  d.kvalita['111'] = { icz_smluvni: 4, adresa: 1, okres: 0, jediny: 0, nepriraditelne: 3 };
  const r = validateSit(d);
  assert.deepEqual(r.errors, []);
  assert.match(r.warnings.join(), /nepřiřazeno/);
});

test('validateAll volá validateSit, jen když je dataset k dispozici', () => {
  const r = validateAll({ sit: { ...fixtureDoc(), rok: 'x' } });
  assert.ok(r.errors.some(e => /rok musí být celé číslo/.test(e)));
});

test('commitnutý data/pojistovny-sit.json (je-li) prochází validátorem', () => {
  const file = path.join(__dirname, '..', 'data', 'pojistovny-sit.json');
  if (!fs.existsSync(file)) return;
  const r = validateSit(JSON.parse(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(r.errors, []);
});
