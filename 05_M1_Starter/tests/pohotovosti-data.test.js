// Parsery zdrojů a integrita vydaného datasetu pohotovostí.
//
// Zdroje jsou scrapované HTML (VZP) a otevřená data cizích úřadů. Nejtišší
// způsob, jak to rozbít, je změna šablony: parser doběhne, vrátí prázdno
// a transform bez mrknutí oka vydá stránku bez pohotovostí. Testy proto
// běží nad uloženými výřezy skutečných odpovědí.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyPlace,
  parseGps,
  normalizePhone,
  formatAddress,
  extractEmergencyPlaces,
  norm,
  splitList,
} from '../ingest/fetchers/nrpzs_pohotovosti.js';
import {
  streetKey,
  numberSet,
  pscKey,
  parseWktPoint,
  buildAddressGeoIndex,
  geocodeAddress,
  splitAddress,
} from '../ingest/lib/pohotovosti-geo.js';
import { parseListPage, parseDetailPage, parseCzechDate, parseRotationDetail } from '../ingest/fetchers/vzp_pohotovosti.js';
import { mapCategory, adaptKhk, adaptKvk } from '../ingest/fetchers/kraje_pohotovosti.js';
import { krajCode, splitAddress as splitAddressCz, normalizePhone as normalizePhoneT } from '../ingest/transform_pohotovosti.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readData = (name) => JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', name), 'utf8'));

// ─────────────────────────────────────────────────────────────────────────
// NRPZS · klasifikace
// ─────────────────────────────────────────────────────────────────────────

const nrpzsRow = (over = {}) => ({
  ZZ_ID: '1', ZZ_nazev: '', ZZ_druh_nazev: '', ZZ_druh_nazev_sekundarni: '',
  ZZ_rozsah_pece: '', ZZ_obor_pece: '', ZZ_forma_pece: '', ZZ_druh_pece: '',
  ZZ_GPS: 'POINT(50.0 14.0)', ZZ_obec: 'Praha', ZZ_kraj_kod: 'CZ010',
  poskytovatel_ICO: '12345678', ...over,
});

test('classifyPlace · „Zařízení LPS“ zakládá dospělou LPS', () => {
  const res = classifyPlace(nrpzsRow({ ZZ_druh_nazev_sekundarni: 'Zařízení LPS' }));
  assert.equal(res.lps_dospeli, 'odvozeno');
});

test('classifyPlace · výslovný text v rozsahu péče je silnější důkaz', () => {
  const res = classifyPlace(nrpzsRow({ ZZ_rozsah_pece: 'lékařská pohotovostní služba pro dospělé' }));
  assert.equal(res.lps_dospeli, 'registr');
});

test('classifyPlace · lékárenská pohotovost není lékařská LPS', () => {
  // Bez tohohle rozlišení spadnou do LPS desítky lékáren, které mají
  // v rozsahu péče „lékárenská pohotovostní služba“.
  const res = classifyPlace(nrpzsRow({
    ZZ_rozsah_pece: 'kontrola - vstupní, lékárenská pohotovostní služba',
    ZZ_druh_pece: 'lékárenská péče',
  }));
  assert.equal(res.lekarna, 'registr');
  assert.equal(res.lps_dospeli, undefined);
});

test('classifyPlace · dětský PODobor nezakládá dětskou pohotovost', () => {
  // Nemocnice, která je Zařízení LPS, vypisuje všechny své obory. „dětská
  // endokrinologie“ z ní nedělá dětskou pohotovost — vycházelo tak 91 míst
  // místo reálných ~30.
  const res = classifyPlace(nrpzsRow({
    ZZ_druh_nazev_sekundarni: 'Zařízení LPS',
    ZZ_obor_pece: 'dětská endokrinologie, chirurgie, vnitřní lékařství',
  }));
  assert.equal(res.lps_deti, undefined);

  const real = classifyPlace(nrpzsRow({
    ZZ_druh_nazev_sekundarni: 'Zařízení LPS',
    ZZ_obor_pece: 'praktické lékařství pro děti a dorost',
  }));
  assert.equal(real.lps_deti, 'odvozeno');
});

test('classifyPlace · zubní pohotovost z textu i z výhradně zubního oboru', () => {
  assert.equal(classifyPlace(nrpzsRow({ ZZ_rozsah_pece: 'pohotovostní služba v oboru zubní lékařství' })).zubni, 'registr');
  const dentalOnly = classifyPlace(nrpzsRow({ ZZ_druh_nazev_sekundarni: 'Zařízení LPS', ZZ_obor_pece: 'zubní lékařství' }));
  assert.equal(dentalOnly.zubni, 'odvozeno');
  assert.equal(dentalOnly.lps_dospeli, undefined, 'čistě zubní pracoviště není LPS pro dospělé');
});

test('classifyPlace · chirurgická kategorie je vždy odvozená', () => {
  const res = classifyPlace(nrpzsRow({
    ZZ_forma_pece: 'akutní lůžková péče standardní, ambulantní péče',
    ZZ_obor_pece: 'chirurgie, vnitřní lékařství',
  }));
  assert.equal(res.chirurgicka, 'odvozeno');
});

test('classifyPlace · běžná ambulance není pohotovost', () => {
  const res = classifyPlace(nrpzsRow({
    ZZ_obor_pece: 'dermatovenerologie, revmatologie',
    ZZ_forma_pece: 'ambulantní péče',
  }));
  assert.deepEqual(res, {});
});

test('parseGps čte NRPZS pořadí POINT(šířka délka)', () => {
  // Registr má osy prohozené proti standardnímu WKT. Kdyby se braly jako
  // POINT(x y), skončí všechny pohotovosti v Indickém oceánu.
  assert.deepEqual(parseGps('POINT(48.959066276499 14.470410383763)'), { lat: 48.959066, lon: 14.47041 });
  assert.equal(parseGps('POINT(14.47 48.95)'), null, 'prohozené osy musí spadnout na kontrole hranic ČR');
  assert.equal(parseGps(''), null);
});

test('normalizePhone dělá mezinárodní tvar', () => {
  assert.equal(normalizePhone('415620215'), '+420415620215');
  assert.equal(normalizePhone('+420 554 690 111'), '+420554690111');
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone(''), null);
});

test('formatAddress a pomocné funkce NRPZS', () => {
  assert.equal(
    formatAddress({ ZZ_ulice: 'Husova', ZZ_cislo_domovni_orientacni: '357', ZZ_PSC: '46063', ZZ_obec: 'Liberec' }),
    'Husova 357, 460 63 Liberec',
  );
  assert.equal(norm('Žďár  NAD Sázavou'), 'zdar nad sazavou');
  assert.deepEqual(splitList('a, b ,c'), ['a', 'b', 'c']);
});

test('extractEmergencyPlaces deduplikuje a řadí deterministicky', () => {
  const rows = [
    nrpzsRow({ ZZ_ID: '2', ZZ_kraj_kod: 'CZ064', ZZ_obec: 'Brno', ZZ_druh_nazev_sekundarni: 'Zařízení LPS' }),
    nrpzsRow({ ZZ_ID: '1', ZZ_kraj_kod: 'CZ010', ZZ_obec: 'Praha', ZZ_druh_nazev_sekundarni: 'Zařízení LPS' }),
    nrpzsRow({ ZZ_ID: '1', ZZ_kraj_kod: 'CZ010', ZZ_obec: 'Praha', ZZ_druh_nazev_sekundarni: 'Zařízení LPS' }),
  ];
  const out = extractEmergencyPlaces(rows);
  assert.equal(out.length, 2, 'duplicitní ZZ_ID se zahodí');
  assert.deepEqual(out.map(p => p.id), ['nrpzs-1', 'nrpzs-2'], 'řadí se podle kraje');
  assert.equal(out[0].evidence.lps_dospeli, 'odvozeno');
});

// ─────────────────────────────────────────────────────────────────────────
// Geokódování přes adresu
// ─────────────────────────────────────────────────────────────────────────

test('streetKey a numberSet normalizují zápis ulice', () => {
  assert.equal(streetKey('Lidická tř.'), 'lidicka');
  assert.equal(streetKey('nám. E. Filly 12'), 'e filly');
  assert.deepEqual([...numberSet('800/8')].sort(), ['8', '800']);
  assert.equal(pscKey('460 63'), '46063');
  assert.equal(pscKey('bez psc'), null);
  assert.deepEqual(parseWktPoint('POINT(50.1 14.4)'), { lat: 50.1, lon: 14.4 });
});

test('splitAddress zvládne obě podoby zápisu adresy', () => {
  assert.deepEqual(splitAddress('Na Františku 847/8, 11000 Praha 1'), {
    street: 'Na Františku 847/8', psc: '11000', obec: 'Praha 1',
  });
  assert.deepEqual(splitAddress('Vrchlického 5, Třeboň, 379 01'), {
    street: 'Vrchlického 5', psc: '37901', obec: 'Třeboň',
  });
});

test('geocodeAddress spáruje adresu VZP se záznamem registru', () => {
  const index = buildAddressGeoIndex([
    { ZZ_GPS: 'POINT(50.6858 14.5488)', ZZ_ulice: 'Purkyňova', ZZ_cislo_domovni_orientacni: '1849', ZZ_PSC: '47001', ZZ_obec: 'Česká Lípa' },
    { ZZ_GPS: 'POINT(50.7698 15.0652)', ZZ_ulice: 'Husova', ZZ_cislo_domovni_orientacni: '357/10', ZZ_PSC: '46063', ZZ_obec: 'Liberec' },
  ]);

  const hit = geocodeAddress(index, 'Husova 357, 46063 Liberec');
  assert.equal(hit.precision, 'house');
  assert.equal(hit.lat, 50.7698);

  assert.equal(geocodeAddress(index, 'Neznámá 1, 11000 Praha'), null);
});

test('geocodeAddress nehádá dům, když je v ulici víc kandidátů', () => {
  // Vybrat libovolný dům v ulici by vypadalo přesně a bylo by to vedle.
  const index = buildAddressGeoIndex([
    { ZZ_GPS: 'POINT(50.1 14.4)', ZZ_ulice: 'Dlouhá', ZZ_cislo_domovni_orientacni: '1', ZZ_PSC: '11000', ZZ_obec: 'Praha' },
    { ZZ_GPS: 'POINT(50.2 14.5)', ZZ_ulice: 'Dlouhá', ZZ_cislo_domovni_orientacni: '2', ZZ_PSC: '11000', ZZ_obec: 'Praha' },
  ]);
  assert.equal(geocodeAddress(index, 'Dlouhá 99, 11000 Praha'), null);
  assert.equal(geocodeAddress(index, 'Dlouhá 2, 11000 Praha').precision, 'house');
});

// ─────────────────────────────────────────────────────────────────────────
// VZP · parsery HTML
// ─────────────────────────────────────────────────────────────────────────

const LIST_HTML = `
<table><thead><tr><th>Název</th></tr></thead><tbody>
<tr>
  <td><strong>1. Lounská Lékařská s.r.o.</strong><br />Pod Nemocnicí 2709, 44001 Louny</td>
  <td>Ústecký kraj<br />Louny</td>
  <td>Lékařská pohotovost pro dospělé</td>
  <td><a href="/seznam-pohotovosti/56470001_1" class="btn">Více informací</a></td>
</tr>
<tr>
  <td><strong>Rozpis pohotovostí pro Jihočeský kraj</strong><br /></td>
  <td>Jihočeský kraj<br />Jihočeský kraj</td>
  <td>Stomatologická pohotovost</td>
  <td><a href="/seznam-pohotovosti/rotace/283" class="btn">Více informací</a></td>
</tr>
</tbody></table>`;

test('parseListPage vytáhne řádky včetně víceúrovňového id rotace', () => {
  const rows = parseListPage(LIST_HTML);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, '56470001_1');
  assert.equal(rows[0].name, '1. Lounská Lékařská s.r.o.');
  assert.equal(rows[0].address, 'Pod Nemocnicí 2709, 44001 Louny');
  assert.equal(rows[0].kraj, 'Ústecký kraj');
  assert.equal(rows[0].okres, 'Louny');
  // Bez celé cesty by se všech devět krajských rotací sesypalo na jedno „rotace“.
  assert.equal(rows[1].id, 'rotace/283');
});

const DETAIL_HTML = `
<table><tbody>
<tr><td>Název pracoviště</td><td>LSPP pro dospělé</td></tr>
<tr><td>Adresa místa poskytování péče</td><td>Pod Nemocnicí 2709, 44001 Louny</td></tr>
<tr><td>Telefon</td><td>415620215</td></tr>
<tr><td>Web</td><td>neuvedeno</td></tr>
</tbody></table>
<table><tbody>
<tr><td>Pondělí</td><td>Zavřeno</td></tr>
<tr><td>Pátek</td><td>17:00–20:00</td></tr>
<tr><td>Sobota</td><td>09:00–18:00</td></tr>
<tr><td>Svátek</td><td>09:00–18:00</td></tr>
</tbody></table>`;

test('parseDetailPage čte kontakty i rozvrh po dnech', () => {
  const d = parseDetailPage(DETAIL_HTML);
  assert.equal(d.workplace, 'LSPP pro dospělé');
  assert.equal(d.phone, '415620215');
  assert.equal(d.web, null, '„neuvedeno“ není adresa webu');
  assert.deepEqual(d.week.mon, []);
  assert.deepEqual(d.week.fri, [['17:00', '20:00']]);
  assert.deepEqual(d.week.holiday, [['09:00', '18:00']]);
  assert.equal(d.anyHours, true);
});

test('parseRotationDetail převede tabulku Datum | Od | Do na termíny', () => {
  const html = `
    <table><tbody>
      <tr><td>Název pracoviště</td><td>MUDr. Bouchal Ivo</td></tr>
      <tr><td>Telefon</td><td>384723036</td></tr>
    </tbody></table>
    <table><tbody>
      <tr><th>Datum</th><th>Od</th><th>Do</th></tr>
      <tr><td>5. 9. 2026</td><td>8:00</td><td>12:00</td></tr>
    </tbody></table>`;
  const d = parseRotationDetail(html);
  assert.equal(d.workplace, 'MUDr. Bouchal Ivo');
  assert.deepEqual(d.shifts, [{ from: '2026-09-05', to: '2026-09-05', ranges: [['08:00', '12:00']] }]);
});

test('parseCzechDate', () => {
  assert.equal(parseCzechDate('5. 9. 2026'), '2026-09-05');
  assert.equal(parseCzechDate('15.12.2026'), '2026-12-15');
  assert.equal(parseCzechDate('nedatum'), null);
});

// ─────────────────────────────────────────────────────────────────────────
// Krajské adaptéry
// ─────────────────────────────────────────────────────────────────────────

test('mapCategory sjednocuje krajská pojmenování', () => {
  assert.equal(mapCategory({ type: 'lékařská pohotovostní služba', target: 'dospělí' }), 'lps_dospeli');
  assert.equal(mapCategory({ type: 'lékařská pohotovostní služba', target: 'děti' }), 'lps_deti');
  assert.equal(mapCategory({ type: 'zubní lékařství', target: '' }), 'zubni');
  assert.equal(mapCategory({ type: 'lékárny', target: '' }), 'lekarna');
  assert.equal(mapCategory({ type: 'něco jiného', target: '' }), null);
});

test('adaptKvk přenese sloupce na den i souřadnice', () => {
  const [row] = adaptKvk([{
    'OBJEKT ID': '1',
    'Název zařízení pohotovostní služby': 'Nemocnice v Karlových Varech',
    'Místo pohotovostní služby': 'budova A',
    'Typ pohotovostní služby': 'lékařská pohotovostní služba',
    'Cílová skupina': 'dospělí',
    'Ordinační hodiny - pondělí': '16:00 - 21:00',
    'Ordinační hodiny - sobota': '9:00 - 19:00',
    'Kód vyššího územně samosprávného celku': 'CZ041',
    'Název obce': 'Karlovy Vary',
    'Název ulice': 'Bezručova',
    'Číslo domovní': '1190',
    'Poštovní směrovací číslo': '36001',
    'Telefonní kontakt': 'tel:+420354225601',
    'Zeměpisná šířka v souřadnicovém systému WGS84': '50.232642',
    'Zeměpisná délka v souřadnicovém systému WGS84': '12.876577',
  }]);
  assert.equal(row.category, 'lps_dospeli');
  assert.equal(row.place_note, 'budova A');
  assert.equal(row.phone, '+420354225601', 'prefix tel: se odřízne');
  assert.equal(row.lat, 50.232642);
  assert.deepEqual(row.hours.week.mon, [['16:00', '21:00']]);
});

test('adaptKhk rozparsuje ordinační dobu z jedné věty', () => {
  const [row] = adaptKhk([{
    ID: '1',
    'Název': 'Fakultní nemocnice Hradec Králové',
    'Cílová skupina': 'dospělí',
    'Ordinační hodiny': 'všední den: 16:00 – 22:00, SO,NE, svátek: 08:00 – 22:00',
    'Název obce': 'Hradec Králové',
    'Zeměpisná šířka v souřadnicovém systému WGS84': '50.1983',
    'Zeměpisná délka v souřadnicovém systému WGS84': '15.8285',
  }]);
  assert.equal(row.category, 'lps_dospeli');
  assert.deepEqual(row.hours.week.mon, [['16:00', '22:00']]);
  assert.deepEqual(row.hours.week.sat, [['08:00', '22:00']]);
  assert.equal(row.hours.raw, 'všední den: 16:00 – 22:00, SO,NE, svátek: 08:00 – 22:00');
});

// ─────────────────────────────────────────────────────────────────────────
// Transform · pomocné funkce
// ─────────────────────────────────────────────────────────────────────────

test('krajCode přeloží název kraje z libovolného zdroje', () => {
  assert.equal(krajCode('Hlavní město Praha'), 'CZ010');
  assert.equal(krajCode('Královehradecký kraj'), 'CZ052', 'zdroj VZP píše kraj bez čárky nad e');
  assert.equal(krajCode('Kraj Vysočina'), 'CZ063');
  assert.equal(krajCode('Moravskoslezský kraj'), 'CZ080');
});

test('transform · splitAddress a normalizePhone', () => {
  assert.equal(splitAddressCz('Vídeňská 800, 14059 Praha').obec, 'Praha');
  assert.equal(splitAddressCz('Vídeňská 800, 14059 Praha').psc, '14059');
  assert.equal(normalizePhoneT('222801343'), '+420222801343');
});

// ─────────────────────────────────────────────────────────────────────────
// Vydaný dataset
// ─────────────────────────────────────────────────────────────────────────

test('data/pohotovosti.json drží datový kontrakt stránky', () => {
  const d = readData('pohotovosti.json');
  assert.ok(d.places.length >= 150, `jen ${d.places.length} pohotovostí`);
  assert.ok(d.regions.length === 14, 'registr krajů musí mít všech 14 krajů');

  const kraje = new Set(d.places.map(p => p.kraj_code));
  assert.equal(kraje.size, 14, 'pohotovosti musí pokrývat všech 14 krajů');

  const bezGps = d.places.filter(p => p.lat == null || p.lon == null);
  assert.equal(bezGps.length, 0, `${bezGps.length} pohotovostí bez souřadnic`);

  const bezHodin = d.places.filter(p => !p.hours);
  assert.ok(bezHodin.length / d.places.length < 0.2, 'většina míst musí mít ordinační dobu');
});

test('data/pohotovosti.json · „nesplňuje minimum“ je vždy doložené', () => {
  // Je to tvrzení o konkrétním poskytovateli. Bez rozpisu kontrol by ho
  // stránka nemohla obhájit.
  const d = readData('pohotovosti.json');
  for (const p of d.places.filter(x => x.meets_minimum === false)) {
    assert.ok(Array.isArray(p.minimum_checks) && p.minimum_checks.length,
      `${p.id} nemá rozpis minimum_checks`);
    assert.ok(p.minimum_checks.some(c => !c.ok), `${p.id} nemá ani jednu nesplněnou podmínku`);
  }
});

test('data/pohotovosti.json · právní kontext má odkaz na předpis', () => {
  const d = readData('pohotovosti.json');
  assert.match(d.legal.decree.url, /^https?:\/\//);
  assert.match(d.legal.decree.title, /380\/2025/);
  assert.match(d.legal.law.title, /290\/2025/);
  for (const cat of ['lps_dospeli', 'lps_deti', 'zubni', 'lekarna']) {
    assert.ok(d.legal.decree.minimum_scope[cat], `chybí minimum pro ${cat}`);
  }
});

test('data/obce-gps.json pokrývá obce ČR', () => {
  const g = readData('obce-gps.json');
  assert.ok(g.count >= 5000, `gazetteer má jen ${g.count} obcí`);
  assert.deepEqual(g.fields, ['name', 'lat', 'lon', 'okres', 'lau']);
  const mimo = g.obce.filter(([, lat, lon]) => lat < 48.4 || lat > 51.2 || lon < 12 || lon > 18.9);
  assert.equal(mimo.length, 0, 'gazetteer nesmí mít obce mimo ČR');
});

// ─────────────────────────────────────────────────────────────────────────
// Nasazení
// ─────────────────────────────────────────────────────────────────────────

test('vercel.json povoluje geolokaci právě na stránce pohotovostí', () => {
  // Regrese: globální `Permissions-Policy: geolocation=()` platila i na
  // pohotovosti, takže tlačítko „Moje poloha“ na produkci vždy spadlo do
  // chybové větve — funkce vypadala rozbitě, aniž by to šlo poznat lokálně.
  const cfg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'vercel.json'), 'utf8'));
  const policyOf = (rule) => rule.headers.find(h => h.key === 'Permissions-Policy')?.value ?? null;

  // Pozor: catch-all pravidlo má „pohotovosti“ taky — v negativním lookaheadu.
  // Hledáme to, které na /pohotovosti přímo míří.
  const pohotovosti = cfg.headers.find(r => r.source.startsWith('/pohotovosti'));
  assert.ok(pohotovosti, 'chybí pravidlo hlaviček pro /pohotovosti');
  assert.match(policyOf(pohotovosti), /geolocation=\(self\)/);
  assert.match(policyOf(pohotovosti), /microphone=\(\)/, 'mikrofon musí zůstat zakázaný');
  assert.match(policyOf(pohotovosti), /camera=\(\)/, 'kamera musí zůstat zakázaná');

  // Catch-all pravidlo musí pohotovosti vynechat, jinak by se hlavičky
  // překrývaly a záleželo by na pořadí.
  const catchAll = cfg.headers.find(r => r.source.startsWith('/((?!'));
  assert.ok(catchAll.source.includes('pohotovosti'), 'catch-all musí /pohotovosti vyjmout');
  assert.match(policyOf(catchAll), /geolocation=\(\)/, 'jinde geolokace zakázaná zůstává');

  // Bezpečnostní hlavičky se v novém pravidle nesmí ztratit.
  for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Content-Security-Policy']) {
    assert.ok(pohotovosti.headers.some(h => h.key === key), `pravidlo pro /pohotovosti postrádá ${key}`);
  }
});
