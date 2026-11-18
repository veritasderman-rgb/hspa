// Odchytávač pozměňovacích návrhů mimo předmět zákona: jádro, parsery
// otevřených dat psp.cz, čtečka ZIP/DOCX, běh fetcheru bez sítě, validátor.
// Vzorové řádky a texty pocházejí z průzkumného běhu psp-probe (18. 11. 2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  loadHealthLaws, extractLawRefs, amendedLaws, effectivityChange, tiskScope,
  evaluateTisk, scopeFromTitleIncomplete, SIGNALY,
} from '../ingest/lib/prilepky.js';
import { readZip, docxText } from '../ingest/lib/zip.js';
import { parseUnl, lawBills, writtenAmendments, parseDocPage, predkladatelTyp, organObdobi } from '../ingest/lib/psp-opendata.js';
import { run, writeIfChanged } from '../ingest/fetchers/psp_prilepky.js';
import { validatePrilepky } from '../ingest/validate-prilepky.js';
import { renderSection, renderTisk, UROVEN_LABELS, formatDate } from '../src/prilepky.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HL = loadHealthLaws();

const TISK_235 = {
  ct: 235,
  nazev: 'Novela z. o pojistném na veřejné zdr. pojištění',
  uplny_nazev: 'Vládní návrh zákona, kterým se mění zákon č. 592/1992 Sb., o pojistném na veřejné zdravotní pojištění, ve znění pozdějších předpisů',
  predkladatel_typ: 'vlada',
  predkladatel: 'ministr zdravotnictví',
  url: 'https://www.psp.cz/sqw/historie.sqw?o=10&t=235',
};
// Začátek skutečného sněmovního dokumentu 1813 (tisk 235).
const PN_1813 = `Pozměňovací návrh poslanců k vládnímu návrhu zákona, kterým se mění zákon č. 592/1992 Sb., o pojistném na veřejné zdravotní pojištění, ve znění pozdějších předpisů (ST 235)
Vládní návrh zákona, kterým se mění zákon č. 592/1992 Sb., o pojistném na veřejné zdravotní pojištění, ve znění pozdějších předpisů, se mění takto:
1. Název zákona zní: „Zákon, kterým se mění zákon č. 592/1992 Sb., o pojistném na veřejné zdravotní pojištění, ve znění pozdějších předpisů, zákon č. 551/1991 Sb., o Všeobecné zdravotní pojišťovně České republiky, ve znění pozdějších předpisů, a zákon č. 280/1992 Sb., o resortních, oborových, podnikových a dalších zdravotních pojišťovnách, ve znění pozdějších předpisů“.
3. Za článek III se vkládají nové části druhá a třetí, které včetně nadpisů znějí: „ČÁST DRUHÁ Změna zákona o Všeobecné zdravotní pojišťovně České republiky Čl. IV
Zákon č. 551/1991 Sb., o Všeobecné zdravotní pojišťovně České republiky, ve znění pozdějších předpisů, se mění takto: V § 7a odst. 2 písm. b) se slova „s tím, že úhrnná výše příspěvku poskytovaného pacientským organizacím nepřekročí 5 %“ zrušují.
ČÁST TŘETÍ Čl. V V zákoně č. 280/1992 Sb., o resortních, oborových, podnikových a dalších zdravotních pojišťovnách, ve znění zákona č. 10/1993 Sb. a zákona č. 15/1993 Sb., se v § 16 odst. 2 slova „nepřekročí 5 %“ zrušují.`;
const PN_1796 = 'Vládní návrh zákona, kterým se mění zákon č. 592/1992 Sb., o pojistném na veřejné zdravotní pojištění, ve znění pozdějších předpisů (ST 235) se mění takto: V čl. I bodě 1 se částka „18 362 Kč“ nahrazuje částkou „17 540 Kč“.';

test('registr zdravotnických zákonů: čísla ve tvaru N/RRRR, bez duplicit', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest/mapping/zdravotnicke-zakony.json'), 'utf8')).zakony;
  assert.ok(raw.length >= 20);
  assert.equal(new Set(raw.map(z => z.cislo)).size, raw.length);
  for (const z of raw) assert.match(z.cislo, /^\d{1,4}\/\d{4}$/);
  assert.ok(HL.has('48/1997') && HL.has('372/2011'));
});

test('extractLawRefs: čísla zákonů včetně nezlomitelných mezer', () => {
  assert.deepEqual(extractLawRefs('zákon č. 48/1997 Sb. a zákona č. 372/2011 Sb., č. 48/1997 Sb.'), ['48/1997', '372/2011']);
});

test('amendedLaws: hlavička novelizace, ne pouhá zmínka ani výčet novel', () => {
  const a = amendedLaws(PN_1813).map(x => x.cislo);
  assert.deepEqual(a, ['551/1991', '280/1992']); // 592/1992 je jen v názvu, 10/1993 a 15/1993 ve výčtu novel
  assert.deepEqual(amendedLaws(PN_1796), []);
  assert.deepEqual(amendedLaws('Podle zákona č. 48/1997 Sb. se postupuje obdobně.'), []);
});

test('amendedLaws: citace je doslovný úryvek s číslem zákona', () => {
  const flat = PN_1813.replace(/\s+/g, ' ');
  for (const z of amendedLaws(PN_1813)) {
    assert.ok(z.citace.includes(`č. ${z.cislo} Sb.`));
    for (const part of z.citace.split(' … ')) assert.ok(flat.includes(part), `není doslovně v textu: ${part}`);
  }
});

test('effectivityChange: jen když text mluví o účinnosti', () => {
  assert.equal(effectivityChange(PN_1796), null);
  assert.match(effectivityChange('Čl. III zní: Tento zákon nabývá účinnosti dnem 1. ledna 2028.'), /nabývá účinnosti dnem 1\. ledna 2028\./);
});

test('tiskScope: z názvu; neúplný výčet se pozná', () => {
  assert.deepEqual(tiskScope(TISK_235), { zakony: ['592/1992'], neuplny: false });
  assert.equal(scopeFromTitleIncomplete('Vládní návrh zákona o digitální ekonomice a o změně některých souvisejících zákonů'), true);
  assert.equal(scopeFromTitleIncomplete('…kterým se mění zákon č. 1/2000 Sb. a další související zákony'), true);
  assert.equal(scopeFromTitleIncomplete(TISK_235.uplny_nazev), false);
  assert.deepEqual(tiskScope({ ...TISK_235, predmet_z_textu: ['551/1991'] }).zakony, ['592/1992', '551/1991']);
});

test('tisk 235: návrh 1813 mění další zdravotnické zákony, 1796 je v předmětu', () => {
  const r = evaluateTisk(TISK_235, [{ cd: 1813, text: PN_1813, url: 'https://www.psp.cz/sqw/sd.sqw?cd=1813&o=10' }, { cd: 1796, text: PN_1796 }], HL);
  assert.equal(r.zdravotnicky, true);
  assert.equal(r.navrhy.length, 1);
  assert.equal(r.navrhy[0].cd, 1813);
  assert.deepEqual(r.navrhy[0].mimo_predmet.map(z => z.cislo), ['551/1991', '280/1992']);
  assert.deepEqual(r.navrhy[0].signaly, ['jiny_zdravotnicky_zakon']);
  assert.equal(r.uroven, 'stredni');
});

test('zdravotnický zákon v cizím tisku = vysoká úroveň; cizí zákon v cizím tisku nás nezajímá', () => {
  const dane = { ct: 311, nazev: 'Novela z. o daních z příjmů', uplny_nazev: 'Vládní návrh zákona, kterým se mění zákon č. 586/1992 Sb., o daních z příjmů, ve znění pozdějších předpisů', predkladatel_typ: 'vlada' };
  const pn = 'Za část první se vkládá část druhá: Čl. III Zákon č. 48/1997 Sb., o veřejném zdravotním pojištění, ve znění pozdějších předpisů, se mění takto: 1. V § 17 se doplňuje odstavec 10. Čl. IV Zákon č. 235/2004 Sb., o dani z přidané hodnoty, se mění takto: 1. V § 5';
  const r = evaluateTisk(dane, [{ cd: 9, text: pn }], HL);
  assert.equal(r.zdravotnicky, false);
  assert.equal(r.uroven, 'vysoka');
  assert.deepEqual(r.navrhy[0].signaly, ['zdravotnicky_zakon_v_cizim_tisku']);
  assert.deepEqual(r.navrhy[0].mimo_predmet.map(z => z.cislo), ['48/1997']); // DPH do nálezu nepatří
  assert.equal(evaluateTisk(dane, [{ cd: 10, text: 'Čl. IV Zákon č. 235/2004 Sb., o dani z přidané hodnoty, se mění takto: 1.' }], HL), null);
});

test('cizí zákon ve zdravotnickém tisku = vysoká úroveň', () => {
  const pn = 'Čl. IX Zákon č. 586/1992 Sb., o daních z příjmů, ve znění pozdějších předpisů, se mění takto: 1. V § 4';
  const r = evaluateTisk(TISK_235, [{ cd: 5, text: pn }], HL);
  assert.deepEqual(r.navrhy[0].signaly, ['cizi_zakon_ve_zdravotnickem_tisku']);
  assert.equal(r.uroven, 'vysoka');
});

test('procesní signály: poslanecký návrh a § 90/2 jen u zdravotnických tisků', () => {
  const r = evaluateTisk({ ...TISK_235, predkladatel_typ: 'poslanci', navrzeno_90_2: true }, [], HL);
  assert.deepEqual(r.signaly, ['bez_pripominkoveho_rizeni', 'navrh_schvalit_v_prvnim_cteni']);
  assert.equal(r.uroven, 'nizka');
  assert.equal(evaluateTisk({ ct: 1, nazev: 'x', uplny_nazev: 'Návrh poslanců na vydání zákona o myslivosti', predkladatel_typ: 'poslanci' }, [], HL), null);
  assert.equal(evaluateTisk(TISK_235, [], HL), null);
});

test('evaluateTisk bere i hotový rozbor místo textu (stav fetcheru)', () => {
  const r = evaluateTisk(TISK_235, [{ cd: 1813, zmeny: amendedLaws(PN_1813), ucinnost: null }], HL);
  assert.deepEqual(r.navrhy[0].mimo_predmet.map(z => z.cislo), ['551/1991', '280/1992']);
});

// ── otevřená data psp.cz ────────────────────────────────────────────────────
const enc = s => { // Windows-1250 jen pro znaky, které ve vzorcích jsou
  const map = { 'á': 0xe1, 'é': 0xe9, 'í': 0xed, 'ý': 0xfd, 'ě': 0xec, 'š': 0x9a, 'č': 0xe8, 'ř': 0xf8, 'ž': 0x9e, 'ů': 0xf9, 'ú': 0xfa, 'ň': 0xf2, 'ť': 0x9d, 'ď': 0xef, 'ó': 0xf3, 'Š': 0x8a, 'Č': 0xc8, 'Ž': 0x8e, 'Ř': 0xd8, 'Ú': 0xda };
  return Buffer.from([...s].map(c => map[c] ?? c.charCodeAt(0)));
};
const TISKY_UNL = [
  '43357|1|16|235|0|1||174||ministr zdravotnictví|Novela z. o pojistném na veřejné zdr. pojištění|23.06.2026|23.06.2026|23:59||Vládní návrh zákona, kterým se mění zákon č. 592/1992 Sb., o pojistném na veřejné zdravotní pojištění, ve znění pozdějších předpisů||60|1|||2026-06-23 17:15|||',
  '43358|1|16|235|1|1||174|||Usnesení VZ k tisku 235/0|||||x||||||||',
  '43400|2|10|240|0|2||174||Novák|Novela z. o myslivosti|01.07.2026|||| Návrh poslanců na vydání zákona o myslivosti|||||||||',
  '40498|1|16|235|0|1||173||ministr|Starý tisk|01.01.2022||||Starý||||||||||',
  '43500|9|16|250|0|||174|||Zpráva o něčem|||||Zpráva||||||||||',
].join('\n') + '\n';
const TABLES = {
  tisky: parseUnl(enc(TISKY_UNL)),
  druh_tisku: parseUnl(enc('1|T|Vládní návrh zákona|\n2|T|Poslanecký návrh zákona|\n9|T|Zpráva|\n')),
  typ_zakon: parseUnl(enc('1|VL - vláda|\n2|PO - poslanec|\n18|UT - Moravskoslezský kraj|\n')),
  typ_stavu: parseUnl(enc('5|3. čtení|\n')),
  stavy: parseUnl(enc('16|5|2||||\n')),
};
const SD_UNL = '14037|172|1813|13|||203|5462|2018-12-03 14:28:50|\n30796|174|1796|13|||235|5512|2026-09-22 09:56:45|\n30813|174|1813|13|||235|6763|2026-09-22 14:57:18|\n30900|174|1900|5||||6763|2026-10-01 10:00:00|\n';

test('parseUnl: Windows-1250, koncový oddělovač', () => {
  assert.equal(TABLES.tisky[0].length, 24);
  assert.equal(TABLES.tisky[0][9], 'ministr zdravotnictví');
});

test('lawBills: jen návrhy zákonů daného období, hlavní tisk', () => {
  const b = lawBills(TABLES, 10);
  assert.deepEqual(b.map(x => x.ct), [235, 240]);
  assert.deepEqual({ ...b[0], uplny_nazev: undefined }, {
    id_tisk: 43357, ct: 235, nazev: 'Novela z. o pojistném na veřejné zdr. pojištění', uplny_nazev: undefined,
    predkladatel_typ: 'vlada', predkladatel: 'ministr zdravotnictví', predlozeno: '2026-06-23', stav: '3. čtení',
    navrzeno_90_2: true, url: 'https://www.psp.cz/sqw/historie.sqw?o=10&t=235',
  });
  assert.equal(b[1].predkladatel_typ, 'poslanci');
  assert.equal(organObdobi(10), 174);
  assert.equal(predkladatelTyp('UT - Moravskoslezský kraj'), 'kraj');
  assert.equal(predkladatelTyp('SE - senát'), 'senat');
});

test('writtenAmendments: jen dokumenty k tisku v daném období', () => {
  assert.deepEqual(writtenAmendments(parseUnl(enc(SD_UNL)), 10), [
    { id_dokument: 30796, cd: 1796, ct: 235, datum: '2026-09-22', url: 'https://www.psp.cz/sqw/sd.sqw?cd=1796&o=10' },
    { id_dokument: 30813, cd: 1813, ct: 235, datum: '2026-09-22', url: 'https://www.psp.cz/sqw/sd.sqw?cd=1813&o=10' },
  ]);
});

const SD_PAGE = cd => `<html><title>Sněmovní dokument ${cd}</title><body><div id="main-content"><h1>Sněmovní dokument ${cd}</h1>Písemné pozměňovací návrhy k tisku <a href="historie.sqw?t=235&o=10">235</a>
 Předkladatel <a href="/sqw/detail.sqw?id=6763">Jana Vzorová</a> <a href="/sqw/text/orig2.sqw?idd=${cd}1">x.pdf</a> <a href="/sqw/text/orig2.sqw?idd=${cd}2">x.docx</a></div><a href="/sqw/detail.sqw?id=6105">Předseda</a></body></html>`;

test('parseDocPage: předkladatel a odkaz na .docx', () => {
  const p = parseDocPage(SD_PAGE(1813), 'https://www.psp.cz/sqw/sd.sqw?cd=1813&o=10');
  assert.equal(p.docx, 'https://www.psp.cz/sqw/text/orig2.sqw?idd=18132');
  assert.equal(p.autor, 'Jana Vzorová');
});

// ── ZIP / DOCX ──────────────────────────────────────────────────────────────
function makeZip(files) { // deflate, bez ZIP64
  const locals = []; const central = []; let off = 0;
  for (const [name, content] of Object.entries(files)) {
    const n = Buffer.from(name); const raw = Buffer.from(content); const data = zlib.deflateRawSync(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, n, data); central.push(ch, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}
const makeDocx = text => makeZip({ 'word/document.xml': `<w:document><w:body>${text.split('\n').map(p => `<w:p><w:r><w:t>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`).join('')}</w:body></w:document>` });

test('readZip + docxText: odstavce, entity, smazaný text ze sledování změn', () => {
  assert.equal(readZip(makeZip({ 'a.unl': 'x|y|\n' })).get('a.unl').toString(), 'x|y|\n');
  assert.equal(docxText(makeDocx('První & druhý\nZákon č. 1/2000 Sb.')), 'První & druhý\nZákon č. 1/2000 Sb.');
  const del = makeZip({ 'word/document.xml': '<w:p><w:r><w:t>zůstává</w:t></w:r><w:del><w:r><w:delText>pryč</w:delText></w:r></w:del></w:p>' });
  assert.equal(docxText(del), 'zůstává');
});

// ── běh fetcheru bez sítě ───────────────────────────────────────────────────
function fakeGet(calls) {
  const tiskyZip = makeZip({ 'tisky.unl': enc(TISKY_UNL), 'druh_tisku.unl': enc('1|T|Vládní návrh zákona|\n2|T|Poslanecký návrh zákona|\n9|T|Zpráva|\n'), 'typ_zakon.unl': enc('1|VL - vláda|\n2|PO - poslanec|\n'), 'typ_stavu.unl': enc('5|3. čtení|\n'), 'stavy.unl': enc('16|5|2||||\n') });
  const sdZip = makeZip({ 'sd_dokument.unl': enc(SD_UNL) });
  return async url => {
    calls.push(url);
    if (url.endsWith('tisky.zip')) return tiskyZip;
    if (url.endsWith('sd.zip')) return sdZip;
    let m = /sd\.sqw\?cd=(\d+)/.exec(url); if (m) return SD_PAGE(m[1]);
    m = /orig2\.sqw\?idd=(\d+)2$/.exec(url); if (m) return makeDocx(m[1] === '1813' ? PN_1813 : PN_1796);
    throw new Error('neočekávaná adresa ' + url);
  };
}

test('run: první běh stáhne oba návrhy, druhý už nic; výstup projde validátorem', async () => {
  const calls = [];
  const first = await run({ get: fakeGet(calls), log: () => {}, now: new Date('2026-11-18T03:23:00Z') });
  assert.equal(first.report.fetched, 2);
  assert.equal(first.data.tisky.length, 1);
  const t = first.data.tisky[0];
  assert.equal(t.ct, 235);
  assert.deepEqual(t.signaly, ['navrh_schvalit_v_prvnim_cteni']);
  assert.equal(t.navrhy[0].autor, 'Jana Vzorová');
  assert.deepEqual(t.navrhy[0].mimo_predmet.map(z => z.cislo), ['551/1991', '280/1992']);
  assert.deepEqual(first.data.pokryti, { navrhu_zakonu: 2, pisemnych_pn: 2, precteno_pn: 2, pn_bez_textu: 0, pn_ceka: 0 });
  assert.deepEqual(validatePrilepky(first.data), []);
  assert.ok(!JSON.stringify(first.state).includes('Název zákona zní'), 'stav nemá nést celý text');

  const calls2 = [];
  const second = await run({ get: fakeGet(calls2), state: first.state, log: () => {}, now: new Date('2026-11-19T03:23:00Z') });
  assert.equal(second.report.fetched, 0);
  assert.deepEqual(calls2.map(u => u.split('/').pop()), ['tisky.zip', 'sd.zip']);
  assert.deepEqual(second.data.tisky, first.data.tisky);
});

test('run: limit max odloží zbytek na příští běh', async () => {
  const r = await run({ get: fakeGet([]), max: 1, log: () => {} });
  assert.equal(r.report.fetched, 1);
  assert.equal(r.data.pokryti.pn_ceka, 1);
});

test('writeIfChanged: časové značky samy o sobě soubor nepřepíšou', async () => {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'prilepky-'));
  const f = path.join(dir, 'p.json');
  const a = (await run({ get: fakeGet([]), log: () => {}, now: new Date('2026-11-18T00:00:00Z') })).data;
  const b = (await run({ get: fakeGet([]), log: () => {}, now: new Date('2026-11-19T00:00:00Z') })).data;
  assert.equal(writeIfChanged(f, a), true);
  assert.equal(writeIfChanged(f, b), false);
  assert.equal(JSON.parse(fs.readFileSync(f, 'utf8')).generated_at, '2026-11-18T00:00:00.000Z');
});

test('validátor: odmítne verdikt, zákon v předmětu i citaci bez čísla zákona', async () => {
  const { data } = await run({ get: fakeGet([]), log: () => {} });
  const bad = structuredClone(data);
  bad.tisky[0].navrhy[0].mimo_predmet[0].citace = 'něco jiného';
  bad.tisky[0].predmet.push('280/1992');
  bad.signaly = { ...bad.signaly, x: 'Jde o přílepek.' };
  const errs = validatePrilepky(bad).join('\n');
  assert.match(errs, /citace neobsahuje/);
  assert.match(errs, /je v předmětu tisku/);
  assert.match(errs, /přílepek/);
  assert.ok(Object.keys(SIGNALY).every(k => !/přílep/i.test(SIGNALY[k])));
});

test('sekce na webu: citace, odkazy na psp.cz, escapování, žádný verdikt', async () => {
  const { data } = await run({ get: fakeGet([]), log: () => {}, now: new Date('2026-11-18T03:23:00Z') });
  const html = renderSection(data);
  assert.match(html, /Sněmovní dokument 1813/);
  assert.match(html, /href="https:\/\/www\.psp\.cz\/sqw\/sd\.sqw\?cd=1813&amp;o=10"/);
  assert.match(html, /zákon č\.&nbsp;551\/1991&nbsp;Sb\., o Všeobecné zdravotní pojišťovně/);
  assert.match(html, /<blockquote class="prl-citace">Zákon č\. 551\/1991 Sb\./);
  assert.match(html, /stav k 18\. 11\. 2026/);
  assert.ok(!/přílep/i.test(html), 'web nález neoznačuje slovem přílepek');
  assert.ok(Object.values(UROVEN_LABELS).every(u => !/přílep/i.test(u.label)));
  const zly = renderTisk({ ...data.tisky[0], nazev: '<script>x</script>', navrhy: [] });
  assert.ok(!zly.includes('<script>'));
  assert.equal(formatDate('2026-09-22'), '22. 9. 2026');
  assert.match(renderSection({ ...data, tisky: [] }), /zatím žádný takový pozměňovací návrh nenašli/);
});

test('commitnutý dataset je validní', () => {
  const f = path.join(ROOT, 'data', 'prilepky.json');
  assert.deepEqual(validatePrilepky(JSON.parse(fs.readFileSync(f, 'utf8'))), []);
});
