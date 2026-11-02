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
import {
  loadOdbMapping, normalizeOdbornost, normIcz, parseSeznamRows, parseSeznamXlsx, parseSeznamCsv, parseStavK,
  buildIczKraj, krajForIcz, aggregateSeznam, buildSrovnani, buildSeznamyBlock,
} from '../ingest/fetchers/pojistovny-sit-seznamy.js';
import { validateSit, validateAll } from '../ingest/validate-pojistovny.js';
import XLSX from 'xlsx';

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

// ---------------------------------------------------------------- seznamy pojišťoven (pojistovny-sit-seznamy.js)

test('normalizeOdbornost: kód před pomlčkou (VZP i ČPZP), název jako záloha, nesoulad kódu a názvu', () => {
  const mp = loadOdbMapping();
  assert.deepEqual(normalizeOdbornost('207 - alergologie a klinická imunologie', mp), { kod: '207', raw: '207', shoda: true });
  assert.deepEqual(normalizeOdbornost('207-alergologie a klinická imunologie', mp), { kod: '207', raw: '207', shoda: true });
  assert.equal(normalizeOdbornost('014 - klinická stomatologie', mp).kod, '014');
  assert.equal(normalizeOdbornost('002 - praktické lékařství pro děti a dorost a pediatrie', mp).kod, '002');
  assert.equal(normalizeOdbornost('002-praktické lékařství pro děti a dorost', mp).kod, '002');
  assert.deepEqual(normalizeOdbornost('101 - vnitřní lékařství - interna', mp), { kod: null, raw: '101', shoda: true });
  assert.deepEqual(normalizeOdbornost('2U1-dlouhodobá lp rehabilitační', mp), { kod: null, raw: '2U1', shoda: true });
  assert.equal(normalizeOdbornost('Dermatovenerologie', mp).kod, '404');
  assert.deepEqual(normalizeOdbornost('207 - psychiatrie', mp), { kod: '207', raw: '207', shoda: false });
  assert.deepEqual(normalizeOdbornost('', mp), { kod: null, raw: null, shoda: true });
});

test('mapování odborností pokrývá právě sledované kódy VZP 770', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ingest', 'mapping', 'pojistovny_sit_odbornosti.json'), 'utf8'));
  assert.deepEqual(Object.keys(m.odbornosti).sort(), ODBORNOSTI.map((o) => o.kod).sort());
  for (const o of Object.values(m.odbornosti)) {
    assert.ok(o.nazev_770 && o.nazvy.length);
    for (const n of o.nazvy) assert.equal(n, norm(n), `název '${n}' musí být normalizovaný`);
  }
});

test('parseSeznamXlsx: titulek se stavem nad hlavičkou, IČZ doplněné nulami, prázdné řádky pryč', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Seznam smluvních poskytovatelů zdravotních služeb dle odborností k 1. 10. 2026 (řazeno dle IČZ)', '', '', '', ''],
    ['IČO', 'NÁZEV SUBJEKTU', 'IČZ', 'NÁZEV POSKYTOVATELE', 'ODBORNOST'],
    ['23761', 'Ústav', '01001000', 'Ústav', '207 - alergologie a klinická imunologie'],
    ['23761', 'Ústav', 1001000, 'Ústav', '404 - dermatovenerologie'],
    ['', '', '', '', ''],
    ['1', 'X', 'abc', 'X', '001 - všeobecné praktické lékařství'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seznam');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const p = parseSeznamXlsx(buf);
  assert.match(p.titulek, /k 1\. 10\. 2026/);
  assert.equal(parseStavK(p.titulek), '2026-10-01');
  assert.deepEqual(p.radky, [
    { icz: '01001000', odb: '207 - alergologie a klinická imunologie' },
    { icz: '01001000', odb: '404 - dermatovenerologie' },
  ]);
  assert.throws(() => parseSeznamRows([['a', 'b'], ['c', 'd']]), /hlavička/);
});

test('parseSeznamCsv (VoZP: UTF-8, uvozovky, CRLF) a parseStavK z názvu souboru', () => {
  const csv = '"IČO","Název IČO","IČZ","Název IČZ","Obec","PSČ","Ulice"\r\n'
    + '"00023761","ÚSTAV","01001000","ÚSTAV","Praha","11000","Národní 139/8"\r\n'
    + '"1","X, s.r.o.","5000","X","Brno","60200","A 1"\r\n';
  assert.deepEqual(parseSeznamCsv(csv).radky, [{ icz: '01001000' }, { icz: '00005000' }]);
  assert.throws(() => parseSeznamCsv('"A","B"\n"1","2"\n'), /IČZ/);
  assert.equal(parseStavK('vozp-smluvni-poskytovatele-30.09.2026-csv.csv'), '2026-09-30');
  assert.equal(parseStavK('PZSdleOdb.xlsx'), null);
  assert.equal(normIcz(' 1001000 '), '01001000');
  assert.equal(normIcz('x1'), '');
});

test('buildIczKraj + krajForIcz: číselník ÚZIS, pak jednoznačné dvojčíslí (≥ 95 %), jinak bez kraje', () => {
  const rows = [];
  for (let i = 0; i < 40; i++) rows.push({ ICZ: `10${String(i).padStart(3, '0')}000`, okres_RUIAN: 'CZ0100' }); // 10 → Praha 100 %
  for (let i = 0; i < 20; i++) rows.push({ ICZ: `20${String(i).padStart(3, '0')}000`, okres_RUIAN: 'CZ0201' });
  for (let i = 0; i < 20; i++) rows.push({ ICZ: `20${String(i + 50).padStart(3, '0')}000`, okres_RUIAN: 'CZ0100' }); // 20 → 50:50
  rows.push({ ICZ: '30000000', okres_RUIAN: 'CZ0311' }); // málo IČZ na dvojčíslí
  rows.push({ ICZ: '31000000', okres_RUIAN: '' });
  const ik = buildIczKraj(rows, new Set(['CZ010', 'CZ020', 'CZ031']));
  assert.equal(ik.okres.get('20000000'), 'CZ020');
  assert.deepEqual(krajForIcz('20000000', ik), { kraj: 'CZ020', uroven: 'ciselnik' });
  assert.deepEqual(krajForIcz('10999000', ik), { kraj: 'CZ010', uroven: 'prefix' });
  assert.deepEqual(krajForIcz('20999000', ik), { kraj: null, uroven: 'neurcen' });
  assert.deepEqual(krajForIcz('30999000', ik), { kraj: null, uroven: 'neurcen' });
  assert.deepEqual(krajForIcz('31000000', ik), { kraj: null, uroven: 'neurcen' });
});

const IK = { okres: new Map([['01001000', 'CZ010'], ['20001000', 'CZ020']]), prefix: new Map([['80', 'CZ080']]) };
const ODB_KODY = ODBORNOSTI.map((o) => o.kod);

test('aggregateSeznam: IČZ × odbornost jednou, kraj, bez kraje, kvalita; seznam bez odbornosti jen IČZ', () => {
  const mp = loadOdbMapping();
  const radky = [
    { icz: '01001000', odb: '207 - alergologie a klinická imunologie' },
    { icz: '01001000', odb: '207 - alergologie a klinická imunologie' }, // duplicita
    { icz: '01001000', odb: '404 - dermatovenerologie' },
    { icz: '01001000', odb: '101 - interna' }, // nesledovaná
    { icz: '20001000', odb: '207-alergologie a klinická imunologie' },
    { icz: '80555000', odb: '001-všeobecné praktické lékařství' }, // kraj přes dvojčíslí
    { icz: '55555000', odb: '207 - alergologie a klinická imunologie' }, // bez kraje
  ];
  const a = aggregateSeznam(radky, { mp, ik: IK, odbKody: ODB_KODY });
  assert.deepEqual(a.matice['207'], { CZ010: 1, CZ020: 1 });
  assert.equal(a.celkem['207'], 3);
  assert.equal(a.bez_kraje['207'], 1);
  assert.deepEqual(a.matice['001'], { CZ080: 1 });
  assert.equal(a.celkem['305'], 0);
  assert.equal(a.icz_celkem, 4);
  assert.deepEqual(a.icz_kraj, { CZ010: 1, CZ020: 1, CZ080: 1 });
  assert.equal(a.icz_bez_kraje, 1);
  assert.deepEqual(a.kvalita, { radku: 7, icz: 4, kraj_ciselnik: 2, kraj_prefix: 1, kraj_neurcen: 1, odbornost_bez_kodu: 0, odbornost_nazev_nesouhlasi: 0 });

  const b = aggregateSeznam([{ icz: '01001000' }, { icz: '01001000' }, { icz: '77000000' }], { mp, ik: IK, odbKody: ODB_KODY, sOdbornosti: false });
  assert.equal(b.matice, null);
  assert.equal(b.celkem, null);
  assert.equal(b.icz_celkem, 2);
  assert.deepEqual(b.icz_kraj, { CZ010: 1 });
});

/** fixtureDoc() + bloky seznamů pro VZP (s odborností), VoZP (bez) a ostatní bez seznamu. */
function fixtureDocSeznamy() {
  const d = fixtureDoc();
  const mp = loadOdbMapping();
  const zdroj = (stavK) => ({ nazev: 'Seznam', url: 'https://example.cz/seznam.xlsx', stranka: 'https://example.cz/', format: 'XLSX', stav_k: stavK, overeno: '2026-11-02', licence: 'neuvedena' });
  const vzp = aggregateSeznam([
    { icz: '01001000', odb: '207 - alergologie a klinická imunologie' },
    { icz: '55555000', odb: '207 - alergologie a klinická imunologie' },
  ], { mp, ik: IK, odbKody: ODB_KODY });
  const vozp = aggregateSeznam([{ icz: '01001000' }], { mp, ik: IK, odbKody: ODB_KODY, sOdbornosti: false });
  d.seznamy_pojistoven = buildSeznamyBlock({
    111: { stav: 'seznam', zdroj: zdroj('2026-10-01'), jednotka: 'IČZ s odborností', ...vzp },
    201: { stav: 'seznam-bez-odbornosti', zdroj: { ...zdroj('2026-09-30'), format: 'CSV' }, jednotka: 'IČZ', ...vozp },
  }, { overeno: '2026-11-02' });
  d.srovnani = buildSrovnani(d, d.seznamy_pojistoven);
  return d;
}

test('buildSeznamyBlock + buildSrovnani: 7 ZP, bez seznamu bez čísel, poměr seznam / odhad', () => {
  const d = fixtureDocSeznamy();
  assert.deepEqual(Object.keys(d.seznamy_pojistoven).sort(), ['111', '201', '205', '207', '209', '211', '213']);
  for (const k of ['205', '207', '209', '211', '213']) {
    assert.equal(d.seznamy_pojistoven[k].stav, 'bez-seznamu');
    assert.equal(d.seznamy_pojistoven[k].matice, undefined);
    assert.ok(d.seznamy_pojistoven[k].poznamka);
  }
  // odhad VZP alergologie ve fixture = 1 místo (Praha); seznam = 2 IČZ
  assert.deepEqual(d.srovnani.zp['111'].odbornosti['207'], { seznam: 2, odhad: 1, pomer: 2 });
  assert.deepEqual(d.srovnani.zp['111'].odbornosti['404'], { seznam: 0, odhad: 0, pomer: null });
  assert.equal(d.srovnani.zp['201'].odbornosti, null);
  assert.equal(d.srovnani.zp['205'], undefined);
});

test('validateSit: bloky seznamů projdou; bez bloků nic nehlásí; chytá nesoulad', () => {
  assert.deepEqual(validateSit(fixtureDocSeznamy()).errors, []);
  assert.deepEqual(validateSit(fixtureDoc()).errors, []);
  const bad = (mut) => { const d = structuredClone(fixtureDocSeznamy()); mut(d); return validateSit(d).errors.join('\n'); };
  assert.match(bad((d) => { d.seznamy_pojistoven['111'].celkem['207'] = 5; }), /≠ celkem|> icz_celkem/);
  assert.match(bad((d) => { d.seznamy_pojistoven['111'].matice['207'].CZ999 = 1; }), /neznámý kraj/);
  assert.match(bad((d) => { d.seznamy_pojistoven['111'].icz_bez_kraje = 0; }), /icz_kraj \+ icz_bez_kraje/);
  assert.match(bad((d) => { d.seznamy_pojistoven['209'].celkem = { 207: 1 }; }), /nesmí nést čísla/);
  assert.match(bad((d) => { d.seznamy_pojistoven['201'].matice = {}; }), /bez odbornosti nesmí/);
  assert.match(bad((d) => { d.seznamy_pojistoven['111'].stav = 'jiny'; }), /stav musí být/);
  assert.match(bad((d) => { d.seznamy_pojistoven['111'].zdroj.stav_k = '1. 10. 2026'; }), /stav_k/);
  assert.match(bad((d) => { d.seznamy_pojistoven['999'] = d.seznamy_pojistoven['209']; }), /neznámý kód ZP/);
  assert.match(bad((d) => { d.srovnani.zp['111'].odbornosti['207'].pomer = 0.5; }), /pomer musí být/);
  assert.match(bad((d) => { d.srovnani.zp['111'].odbornosti['207'].odhad = 9; }), /součet matice/);
  assert.match(bad((d) => { d.srovnani.zp['209'] = { odbornosti: null }; }), /bez seznamu/);
  assert.match(bad((d) => { delete d.srovnani.metoda; }), /srovnani musí mít/);
});

test('render: druhý pohled „Podle seznamu pojišťovny“ — tooltip, sloupce seznam ZP, bez seznamu, bez undefined', async () => {
  const { renderSit, sitKrajTableHtml, seznamTip, seznamyTableHtml } = await import('../src/pojistovny-sit.js');
  const d = fixtureDocSeznamy();
  const html = renderSit(d, '207');
  assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
  assert.match(html, /Podle seznamu pojišťovny/);
  assert.match(html, /Rozdíl metod/);
  assert.match(html, /seznam pojišťovny k 1\. 10\. 2026: 2 smluvních zařízení \(IČZ\) s touto odborností/);
  assert.match(html, /bez seznamu pojišťovny/); // tooltip u ZP bez seznamu
  assert.equal((html.match(/>bez seznamu</g) || []).length, 5, '5 ZP bez seznamu v tabulce');
  assert.match(html, /seznam odbornost neuvádí: 1 smluvních zařízení/);
  assert.doesNotMatch(html, /zpv-sort/, 'bez řazení');
  const t = sitKrajTableHtml(d, '207');
  assert.match(t, /seznam ZP<small>VZP ČR<\/small>/);
  assert.doesNotMatch(t, /seznam ZP<small>VoZP/, 'VoZP nemá odbornost → žádný sloupec');
  assert.match(t, /<tfoot><tr class="zpc-sit-sum"><th scope="row">ČR celkem<\/th>/);
  assert.match(t, /z toho 1 bez kraje/);
  assert.equal(seznamTip(d, '201', '207'), 'seznam pojišťovny odbornost neuvádí');
  // starší data bez bloku: žádný druhý pohled ani prázdné sloupce
  const old = fixtureDoc();
  assert.equal(seznamyTableHtml(old), '');
  assert.equal(seznamTip(old, '111', '207'), '');
  assert.doesNotMatch(renderSit(old), /Podle seznamu|seznam ZP|tfoot/);
  // commitnutá data: všechny odbornosti bez undefined/NaN
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'pojistovny-sit.json'), 'utf8'));
  for (const odb of ODB_KODY) assert.doesNotMatch(renderSit(real, odb), /undefined|NaN/, `odbornost ${odb}`);
});
