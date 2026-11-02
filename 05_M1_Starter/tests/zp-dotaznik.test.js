// Testy dotazníků srovnávače pojišťoven (P2.4): api/dotaznik.js, api/_db.js,
// api/_dotaznik-validate.js, api/_dotaznik-agregace.js, scripts/export-dotaznik.js,
// scripts/dotaznik-token.js, src/zp-dotaznik.js a SQL migrace.
// Bez živé DB: SQL klient se injektuje přes globalThis.__hspaSqlForTests,
// DOM je minimální vlastní stub (projekt nemá jsdom).

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateOdpoved, hashToken, flattenOtazky as apiFlatten, questionKind as apiKind, hasUpresneni as apiHasUp,
} from '../api/_dotaznik-validate.js';
import { getSql, normalizeDatabaseUrl } from '../api/_db.js';
import handler, { checkRateLimit, __resetForTests, RATE_MAX } from '../api/dotaznik.js';
import { buildSadaAgregaty, MIN_ODPOVEDI } from '../api/_dotaznik-agregace.js';
import { buildExport, writeIfChanged } from '../scripts/export-dotaznik.js';
import { checkArgs, createToken, insertToken, parseArgs, tokenUrl } from '../scripts/dotaznik-token.js';
import {
  renderDotaznik, renderDotaznikAgregace, collectOdpovedi, buildPayload, interpretResponse,
  flattenOtazky, questionKind, hasUpresneni, submitDotaznik,
} from '../src/zp-dotaznik.js';
import { validateAll, loadDatasets } from '../ingest/validate-pojistovny.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const OTAZKY = JSON.parse(read('data', 'pojistovny-otazky.json'));
const SADA = OTAZKY.sady.find((s) => s.id === 'rizikovi-pojistenci');
const OTEVRENA = OTAZKY.sady.find((s) => s.id === 'fond-prevence');
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';

// --- pomocníci --------------------------------------------------------------
function fakeSql(handlers = []) {
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ text, values });
    for (const [re, rows] of handlers) {
      if (re.test(text)) return Promise.resolve(typeof rows === 'function' ? rows(values, text) : rows);
    }
    return Promise.resolve([]);
  };
  sql.calls = calls;
  return sql;
}

function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; },
  };
}

let ipCounter = 0;
const fakeReq = (over = {}) => ({
  method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${++ipCounter % 250}` }, body: {}, query: {}, ...over,
});

const ENV_KEY = 'DATABASE_URL';
let savedEnv;
beforeEach(() => {
  savedEnv = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
  delete globalThis.__hspaSqlForTests;
  __resetForTests();
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env[ENV_KEY]; else process.env[ENV_KEY] = savedEnv;
  delete globalThis.__hspaSqlForTests;
});

const verejnostBody = (odpovedi, over = {}) => ({
  sada_id: 'rizikovi-pojistenci', sada_verze: '1', respondent_typ: 'verejnost', odpovedi, ...over,
});
const tokenBody = (odpovedi, over = {}) => ({
  sada_id: 'rizikovi-pojistenci', sada_verze: '1', respondent_typ: 'pojistovna', token: TOKEN, respondent_kod: '111', odpovedi, ...over,
});

// --- definice: validátor a data ---------------------------------------------
test('data: sady mají verzi, A3 a A4 jsou jednovýběrové, validátor projde', () => {
  assert.equal(SADA.verze, '1');
  assert.equal(OTEVRENA.verze, '1');
  const byId = Object.fromEntries(flattenOtazky(SADA).map((q) => [q.id, q]));
  assert.equal(byId.A3.vyber, 'jeden');
  assert.equal(byId.A4.vyber, 'jeden');
  assert.equal(questionKind(byId.A1), 'vice');
  const { errors } = validateAll(loadDatasets());
  assert.deepEqual(errors, []);
});

test('validate-pojistovny: odmítne špatné vyber a prázdnou verzi', () => {
  const d = loadDatasets();
  const a = structuredClone(d);
  a.otazky.sady[1].casti[0].otazky[0].vyber = 'moc';
  assert.ok(validateAll(a).errors.some((e) => /vyber/.test(e)));
  const b = structuredClone(d);
  b.otazky.sady[0].verze = '';
  assert.ok(validateAll(b).errors.some((e) => /verze/.test(e)));
});

test('shoda pomocných funkcí frontendu a API', () => {
  for (const s of OTAZKY.sady) {
    assert.deepEqual(flattenOtazky(s), apiFlatten(s));
    for (const q of flattenOtazky(s)) {
      assert.equal(questionKind(q), apiKind(q));
      assert.equal(hasUpresneni(q), apiHasUp(q));
    }
  }
});

// --- validateOdpoved ------------------------------------------------------------
test('validateOdpoved: platná odpověď pojišťovny s tokenem', () => {
  const r = validateOdpoved(SADA, tokenBody({
    A1: ['obézní děti', 'křehcí senioři', 'obézní děti'], A1_upresneni: 'jiné skupiny neřešíme', A3: 'ne', A4: 'ročně',
  }));
  assert.equal(r.ok, true, r.errors.join('|'));
  assert.deepEqual(r.clean.odpovedi.A1, ['obézní děti', 'křehcí senioři']);
  assert.equal(r.clean.odpovedi.A3, 'ne');
  assert.equal(r.clean.respondent_typ, 'pojistovna');
  assert.equal(r.clean.token, TOKEN);
});

test('validateOdpoved: neznámá otázka a neznámé upřesnění', () => {
  const r = validateOdpoved(SADA, verejnostBody({ Z9: 'ano', A4_upresneni: 'x' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /Z9.*neznámá otázka/.test(e)));
  assert.ok(r.errors.some((e) => /A4_upresneni.*nemá/.test(e)));
});

test('validateOdpoved: hodnota mimo nabídku, pole u jednovýběru', () => {
  assert.equal(validateOdpoved(SADA, verejnostBody({ A4: 'každý týden' })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A1: ['obézní děti', 'mimozemšťané'] })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A4: ['ročně', 'měsíčně'] })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A1: [1] })).ok, false);
});

test('validateOdpoved: délka textu max 2000', () => {
  const ok = validateOdpoved(OTEVRENA, { sada_id: 'fond-prevence', sada_verze: '1', respondent_typ: 'verejnost', odpovedi: { fp1: 'a'.repeat(2000) } });
  assert.equal(ok.ok, true, ok.errors.join('|'));
  const bad = validateOdpoved(OTEVRENA, { sada_id: 'fond-prevence', sada_verze: '1', respondent_typ: 'verejnost', odpovedi: { fp1: 'a'.repeat(2001) } });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /2000/.test(e)));
  const upres = validateOdpoved(SADA, verejnostBody({ A1: ['jiné (uveďte)'], A1_upresneni: 'b'.repeat(2001) }));
  assert.equal(upres.ok, false);
});

test('validateOdpoved: veřejnost bez tokenu a bez kódu je OK', () => {
  const r = validateOdpoved(SADA, verejnostBody({ A3: 'ano – uveďte typ modelu', A3_upresneni: 'logistická regrese' }));
  assert.equal(r.ok, true, r.errors.join('|'));
  assert.equal(r.clean.token, null);
  assert.equal(r.clean.respondent_kod, null);
});

test('validateOdpoved: veřejnost s tokenem nebo kódem je chyba', () => {
  assert.equal(validateOdpoved(SADA, verejnostBody({ A3: 'ne' }, { token: TOKEN })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A3: 'ne' }, { respondent_kod: '111' })).ok, false);
});

test('validateOdpoved: pojišťovna a organizace bez tokenu je chyba', () => {
  const body = tokenBody({ A3: 'ne' });
  delete body.token;
  const r = validateOdpoved(SADA, body);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /token/.test(e)));
  const napo = tokenBody({ A3: 'ne' }, { respondent_typ: 'pacientska_organizace', respondent_kod: 'NAPO' });
  delete napo.token;
  assert.equal(validateOdpoved(SADA, napo).ok, false);
  assert.equal(validateOdpoved(SADA, tokenBody({ A3: 'ne' }, { token: 'kratky' })).ok, false);
});

test('validateOdpoved: špatná sada, verze, typ, prázdný formulář, osobní údaje', () => {
  assert.equal(validateOdpoved(SADA, verejnostBody({ A3: 'ne' }, { sada_id: 'jina' })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A3: 'ne' }, { sada_verze: '7' })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A3: 'ne' }, { respondent_typ: 'admin' })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({})).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody({ A3: '' })).ok, false);
  assert.equal(validateOdpoved(SADA, verejnostBody('ne')).ok, false);
  assert.equal(validateOdpoved(SADA, null).ok, false);
  const pii = validateOdpoved(SADA, verejnostBody({ A1: ['jiné (uveďte)'], A1_upresneni: 'napište mi na jan@example.cz' }));
  assert.equal(pii.ok, false);
  assert.ok(pii.errors.some((e) => /osobní údaj/.test(e)));
  const rc = validateOdpoved(SADA, verejnostBody({ A1: ['jiné (uveďte)'], A1_upresneni: 'RČ 850101/1234' }));
  assert.equal(rc.ok, false);
});

test('validateOdpoved: povolene_respondenty omezí typy; řídicí znaky se odstraní', () => {
  const def = { ...SADA, povolene_respondenty: ['pojistovna'] };
  assert.equal(validateOdpoved(def, verejnostBody({ A3: 'ne' })).ok, false);
  assert.equal(validateOdpoved(def, tokenBody({ A3: 'ne' })).ok, true);
  const r = validateOdpoved(OTEVRENA, { sada_id: 'fond-prevence', sada_verze: '1', respondent_typ: 'verejnost', odpovedi: { fp1: '  ahoj\u0000 svět\u0007 ' } });
  assert.equal(r.clean.odpovedi.fp1, 'ahoj svět');
});

test('hashToken: sha256 hex, stabilní', () => {
  assert.equal(hashToken('x'), hashToken('x'));
  assert.match(hashToken('x'), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken('x'), hashToken('y'));
});

// --- _db.js ----------------------------------------------------------------------
test('normalizeDatabaseUrl: uvozovky, psql prefix, prázdno', () => {
  assert.equal(normalizeDatabaseUrl(''), '');
  assert.equal(normalizeDatabaseUrl(undefined), '');
  assert.equal(normalizeDatabaseUrl('nesmysl'), '');
  assert.equal(normalizeDatabaseUrl('  postgresql://u:p@h/db?sslmode=require\n'), 'postgresql://u:p@h/db?sslmode=require');
  assert.equal(normalizeDatabaseUrl("psql 'postgres://u:p@h/db?sslmode=require'"), 'postgres://u:p@h/db?sslmode=require');
  assert.equal(normalizeDatabaseUrl('"postgres://u:p@h/db"'), 'postgres://u:p@h/db');
});

test('getSql: bez env 503 dotaznik-neni-nakonfigurovan; injektovaný klient má přednost', async () => {
  const none = await getSql();
  assert.equal(none.sql, null);
  assert.equal(none.status, 503);
  assert.equal(none.error, 'dotaznik-neni-nakonfigurovan');
  const fake = fakeSql();
  globalThis.__hspaSqlForTests = fake;
  assert.equal((await getSql()).sql, fake);
});

test('getSql: s env a bez balíčku vrací 503 chybi-zavislost', async (t) => {
  let installed = true;
  try { await import('@neondatabase/serverless'); } catch { installed = false; }
  if (installed) { t.skip('balíček @neondatabase/serverless je nainstalován'); return; }
  process.env[ENV_KEY] = 'postgresql://u:p@localhost/db';
  const r = await getSql();
  assert.equal(r.sql, null);
  assert.equal(r.status, 503);
  assert.equal(r.error, 'chybi-zavislost');
});

// --- handler ------------------------------------------------------------------------
test('handler: chybějící DATABASE_URL → 503 pro GET i POST', async () => {
  for (const method of ['POST', 'GET']) {
    const res = fakeRes();
    await handler(fakeReq({ method, body: verejnostBody({ A3: 'ne' }), query: { sada: 'rizikovi-pojistenci', agregace: '1' } }), res);
    assert.equal(res.statusCode, 503, method);
    assert.equal(res.body.error, 'dotaznik-neni-nakonfigurovan');
    assert.equal(res.body.ok, false);
  }
});

test('handler: jiné metody 405 s Allow, OPTIONS 204', async () => {
  const res = fakeRes();
  await handler(fakeReq({ method: 'DELETE' }), res);
  assert.equal(res.statusCode, 405);
  assert.match(res.headers.Allow, /POST/);
  const opt = fakeRes();
  await handler(fakeReq({ method: 'OPTIONS' }), opt);
  assert.equal(opt.statusCode, 204);
});

test('handler: POST veřejnost → insert volán, IP se do SQL nedostane', async () => {
  const sql = fakeSql([[/insert into dotaznik_odpoved/, [{ id: 'u1' }]]]);
  globalThis.__hspaSqlForTests = sql;
  const req = fakeReq({ body: verejnostBody({ A3: 'ne', A1: ['obézní děti'] }) });
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body, { ok: true });
  assert.equal(sql.calls.length, 1);
  const c = sql.calls[0];
  assert.match(c.text, /insert into dotaznik_odpoved/);
  assert.ok(c.values.includes('rizikovi-pojistenci'));
  assert.ok(c.values.includes('verejnost'));
  assert.deepEqual(JSON.parse(c.values.find((v) => typeof v === 'string' && v.startsWith('{'))), { A3: 'ne', A1: ['obézní děti'] });
  const ip = req.headers['x-forwarded-for'];
  assert.ok(!JSON.stringify(c.values).includes(ip));
  assert.ok(!/ip/i.test(c.text.replace(/\bzip\b/gi, '')));
});

test('handler: POST s tokenem → jeden příkaz s update tokenu, uložen hash, ne token', async () => {
  const sql = fakeSql([[/update dotaznik_token/, [{ id: 'u2' }]]]);
  globalThis.__hspaSqlForTests = sql;
  const res = fakeRes();
  await handler(fakeReq({ body: tokenBody({ A3: 'ne' }) }), res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(sql.calls.length, 1);
  assert.match(sql.calls[0].text, /pouzit_at = now\(\)/);
  assert.match(sql.calls[0].text, /pouzit_at is null/);
  assert.ok(sql.calls[0].values.includes(hashToken(TOKEN)));
  assert.ok(!sql.calls[0].values.includes(TOKEN));
});

test('handler: neplatný nebo použitý token → 403', async () => {
  globalThis.__hspaSqlForTests = fakeSql([[/update dotaznik_token/, []]]);
  const res = fakeRes();
  await handler(fakeReq({ body: tokenBody({ A3: 'ne' }) }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'neplatny-token');
});

test('handler: neplatná odpověď → 400 bez zásahu do DB; neznámá sada 404; špatné tělo 400', async () => {
  const sql = fakeSql();
  globalThis.__hspaSqlForTests = sql;
  const r1 = fakeRes();
  await handler(fakeReq({ body: verejnostBody({ A4: 'nikdy' }) }), r1);
  assert.equal(r1.statusCode, 400);
  assert.equal(r1.body.error, 'neplatna-odpoved');
  assert.ok(r1.body.errors.length > 0);
  const r2 = fakeRes();
  await handler(fakeReq({ body: verejnostBody({ A3: 'ne' }, { sada_id: 'neni' }) }), r2);
  assert.equal(r2.statusCode, 404);
  const r3 = fakeRes();
  await handler(fakeReq({ body: 'tohle neni json{' }), r3);
  assert.equal(r3.statusCode, 400);
  const r4 = fakeRes();
  await handler(fakeReq({ body: JSON.stringify(verejnostBody({ A3: 'ne' })) }), r4);
  assert.equal(r4.statusCode, 200);
  assert.equal(sql.calls.length, 1, 'jen poslední (platný) požadavek sáhl na DB');
});

test('handler: příliš velké tělo → 413; chyba DB → 500 bez úniku detailu', async () => {
  globalThis.__hspaSqlForTests = fakeSql();
  const big = fakeRes();
  await handler(fakeReq({ body: verejnostBody({ A3: 'ne' }, { balast: 'x'.repeat(70000) }) }), big);
  assert.equal(big.statusCode, 413);
  globalThis.__hspaSqlForTests = () => Promise.reject(new Error('connection refused postgres://secret'));
  const res = fakeRes();
  const origErr = console.error;
  console.error = () => {};
  try { await handler(fakeReq({ body: verejnostBody({ A3: 'ne' }) }), res); } finally { console.error = origErr; }
  assert.equal(res.statusCode, 500);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
});

test('handler: rate limit per hash IP → 429 po RATE_MAX odeslání', async () => {
  globalThis.__hspaSqlForTests = fakeSql([[/insert into/, [{ id: 'x' }]]]);
  const headers = { 'x-forwarded-for': '198.51.100.7' };
  for (let i = 0; i < RATE_MAX; i++) {
    const res = fakeRes();
    await handler(fakeReq({ headers, body: verejnostBody({ A3: 'ne' }) }), res);
    assert.equal(res.statusCode, 200, `pokus ${i + 1}`);
  }
  const res = fakeRes();
  await handler(fakeReq({ headers, body: verejnostBody({ A3: 'ne' }) }), res);
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers['Retry-After']) >= 1);
  const other = fakeRes();
  await handler(fakeReq({ headers: { 'x-forwarded-for': '198.51.100.8' }, body: verejnostBody({ A3: 'ne' }) }), other);
  assert.equal(other.statusCode, 200);
});

test('checkRateLimit: okno se posouvá', () => {
  const k = 'klíč';
  for (let i = 0; i < 3; i++) assert.equal(checkRateLimit(k, 1000 + i, 3, 10000).ok, true);
  assert.equal(checkRateLimit(k, 1500, 3, 10000).ok, false);
  assert.equal(checkRateLimit(k, 11001, 3, 10000).ok, true);
});

test('handler: GET agregace má tvar a cache hlavičku, počítá jen hodnoty z nabídky', async () => {
  const sql = fakeSql([
    [/from dotaznik_agregace/, [
      { otazka_id: 'A1', hodnota: 'obézní děti', pocet: 3 },
      { otazka_id: 'A1', hodnota: 'výmysl', pocet: 9 },
      { otazka_id: 'A4', hodnota: 'ročně', pocet: 2 },
      { otazka_id: 'ZZ', hodnota: 'x', pocet: 5 },
    ]],
    [/group by respondent_typ/, [{ respondent_typ: 'pojistovna', pocet: 4 }, { respondent_typ: 'verejnost', pocet: 1 }]],
  ]);
  globalThis.__hspaSqlForTests = sql;
  const res = fakeRes();
  await handler(fakeReq({ method: 'GET', query: { sada: 'rizikovi-pojistenci', agregace: '1' } }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['Cache-Control'], /s-maxage=300/);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.sada, 'rizikovi-pojistenci');
  assert.equal(res.body.pocet_odpovedi, 5);
  assert.deepEqual(res.body.respondent_typy, { pojistovna: 4, verejnost: 1 });
  assert.equal(res.body.otazky.A1['obézní děti'], 3);
  assert.equal(res.body.otazky.A1['křehcí senioři'], 0);
  assert.ok(!('výmysl' in res.body.otazky.A1));
  assert.equal(res.body.otazky.A4['ročně'], 2);
  assert.ok(!('ZZ' in res.body.otazky));
  const again = fakeRes();
  await handler(fakeReq({ method: 'GET', query: { sada: 'rizikovi-pojistenci', agregace: '1' } }), again);
  assert.equal(sql.calls.length, 2, 'druhé volání jde z paměťové cache');
});

test('handler: GET bez agregace → 400, neznámá sada → 404', async () => {
  globalThis.__hspaSqlForTests = fakeSql();
  const a = fakeRes();
  await handler(fakeReq({ method: 'GET', query: { sada: 'rizikovi-pojistenci' } }), a);
  assert.equal(a.statusCode, 400);
  const b = fakeRes();
  await handler(fakeReq({ method: 'GET', query: { sada: 'x', agregace: '1' } }), b);
  assert.equal(b.statusCode, 404);
});

// --- agregace, export, tokeny ------------------------------------------------------
test('buildSadaAgregaty: pod prahem se skryje, volné texty se nezveřejňují', () => {
  const few = buildSadaAgregaty(SADA, [{ otazka_id: 'A4', hodnota: 'ročně', pocet: 1 }], [{ respondent_typ: 'pojistovna', pocet: MIN_ODPOVEDI - 1 }]);
  assert.equal(few.skryto, true);
  assert.deepEqual(few.otazky, {});
  const none = buildSadaAgregaty(SADA, [], []);
  assert.equal(none.pocet_odpovedi, 0);
  assert.ok(!('skryto' in none));
  const open = buildSadaAgregaty(OTEVRENA, [{ otazka_id: 'fp1', hodnota: 'tajný text', pocet: 4 }], [{ respondent_typ: 'verejnost', pocet: 4 }]);
  assert.deepEqual(open.otazky, {});
});

test('buildExport: tvar souboru a zápis jen při změně', async () => {
  const sql = fakeSql([
    [/from dotaznik_agregace/, (v) => (v[0] === 'rizikovi-pojistenci' ? [{ otazka_id: 'A3', hodnota: 'ne', pocet: 4 }] : [])],
    [/group by respondent_typ/, (v) => (v[0] === 'rizikovi-pojistenci' ? [{ respondent_typ: 'pojistovna', pocet: 4 }] : [])],
  ]);
  const doc = await buildExport(sql, OTAZKY, new Date('2026-11-03T10:00:00Z'));
  assert.equal(doc.version, '1.0.0');
  assert.equal(doc.generated_at, '2026-11-03T10:00:00.000Z');
  assert.deepEqual(Object.keys(doc.sady).sort(), ['fond-prevence', 'rizikovi-pojistenci']);
  const s = doc.sady['rizikovi-pojistenci'];
  assert.equal(s.pocet_odpovedi, 4);
  assert.deepEqual(s.respondent_typy, { pojistovna: 4 });
  assert.equal(s.otazky.A3.ne, 4);
  assert.equal(s.otazky.A3['ano – uveďte typ modelu'], 0);
  assert.equal(doc.sady['fond-prevence'].pocet_odpovedi, 0);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zpd-'));
  const file = path.join(dir, 'agr.json');
  assert.equal(writeIfChanged(doc, file), 'zapsano');
  const later = await buildExport(sql, OTAZKY, new Date('2026-11-04T10:00:00Z'));
  assert.equal(writeIfChanged(later, file), 'beze-zmeny');
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).generated_at, '2026-11-03T10:00:00.000Z');
  later.sady['rizikovi-pojistenci'].otazky.A3.ne = 5;
  assert.equal(writeIfChanged(later, file), 'zapsano');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('data/pojistovny-dotaznik-agregaty.json: výchozí soubor má tvar exportu', () => {
  const j = JSON.parse(read('data', 'pojistovny-dotaznik-agregaty.json'));
  assert.equal(typeof j.version, 'string');
  assert.equal(typeof j.generated_at, 'string');
  assert.equal(typeof j.sady, 'object');
});

test('dotaznik-token: argumenty, token, hash do DB, URL', async () => {
  const args = parseArgs(['--sada', 'rizikovi-pojistenci', '--kod', '111', '--platnost-dni', '30']);
  const chk = checkArgs(args, OTAZKY.sady);
  assert.equal(chk.ok, true, chk.errors.join('|'));
  assert.equal(chk.value.typ, 'pojistovna');
  assert.equal(checkArgs({ sada: 'neni', kod: '111' }, OTAZKY.sady).ok, false);
  assert.equal(checkArgs({ sada: 'rizikovi-pojistenci', kod: '999' }, OTAZKY.sady).ok, false);
  assert.equal(checkArgs({ sada: 'rizikovi-pojistenci', kod: 'NAPO', typ: 'pacientska_organizace' }, OTAZKY.sady).ok, true);
  assert.equal(checkArgs({ sada: 'rizikovi-pojistenci', kod: '111', typ: 'verejnost' }, OTAZKY.sady).ok, false);
  const t1 = createToken(); const t2 = createToken();
  assert.match(t1, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(t1, t2);
  const sql = fakeSql([[/insert into dotaznik_token/, [{ id: 'i', platny_do: '2026-12-02' }]]]);
  await insertToken(sql, chk.value, t1);
  assert.deepEqual(sql.calls[0].values.slice(0, 4), [hashToken(t1), 'rizikovi-pojistenci', 'pojistovna', '111']);
  assert.ok(!sql.calls[0].values.includes(t1));
  assert.equal(tokenUrl('pojistovny.html', 'rizikovi-pojistenci', t1), `pojistovny.html?dotaznik=rizikovi-pojistenci&token=${t1}`);
  // token z generátoru projde validací těla
  assert.equal(validateOdpoved(SADA, tokenBody({ A3: 'ne' }, { token: t1 })).ok, true);
});

// --- SQL migrace -------------------------------------------------------------------------
test('migrace: tabulky, sloupce, indexy a view', () => {
  const m1 = read('api', 'migrations', '0001_dotaznik.sql');
  const m2 = read('api', 'migrations', '0002_agregace.sql');
  assert.match(m1, /create table if not exists dotaznik_odpoved/);
  assert.match(m1, /create table if not exists dotaznik_token/);
  for (const col of ['sada_id', 'sada_verze', 'respondent_typ', 'respondent_kod', 'odpovedi\\s+jsonb not null', 'odeslano_at', 'token_id', 'token_hash\\s+text not null unique', 'platny_do', 'pouzit_at', 'vytvoren_at']) {
    assert.match(m1, new RegExp(col), col);
  }
  assert.match(m1, /check \(respondent_typ in \('pojistovna', 'pacientska_organizace', 'verejnost'\)\)/);
  assert.match(m1, /on dotaznik_odpoved \(sada_id, odeslano_at\)/);
  assert.ok(!/\bip\b|zdroj_ip/i.test(m1.replace(/--.*$/gm, '')), 'v tabulkách nesmí být IP');
  assert.match(m2, /create or replace view dotaznik_agregace/);
  assert.match(m2, /jsonb_each\(/);
  assert.match(m2, /jsonb_typeof\(e\.value\) = 'array'/);
  assert.match(m2, /otazka_id/);
  assert.match(m2, /hodnota/);
  assert.match(m2, /pocet/);
  assert.match(read('api', 'migrations', 'README.md'), /psql "\$DATABASE_URL" -f/);
});

test('package.json: žádná nová závislost @neondatabase/serverless (třída C, dělá vydavatel)', () => {
  assert.ok(!/@neondatabase\/serverless/.test(read('package.json')));
});

// --- frontend: DOM stub --------------------------------------------------------------------
class El {
  constructor(tag, doc) {
    this.tag = tag; this.ownerDocument = doc; this.attrs = {}; this.children = []; this.className = '';
    this.disabled = false; this.value = ''; this.checked = false; this._text = ''; this.listeners = {};
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  appendChild(c) { this.children.push(c); return c; }
  replaceChildren(...c) { this.children = c; this._text = ''; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  walk(fn) { fn(this); this.children.forEach((c) => c.walk(fn)); }
  find(pred) { const out = []; this.walk((n) => { if (pred(n)) out.push(n); }); return out; }
}
const fakeDoc = { createElement(t) { return new El(t, fakeDoc); } };
const mkContainer = () => new El('div', fakeDoc);
const countQuestions = (sada) => flattenOtazky(sada).length;

test('renderDotaznik: počet polí s data-otazka = počet otázek, části jako fieldset', () => {
  const c = mkContainer();
  const r = renderDotaznik(c, SADA);
  assert.ok(r.form);
  const qs = c.find((n) => n.attrs['data-otazka']);
  assert.equal(qs.length, countQuestions(SADA));
  assert.deepEqual(qs.map((n) => n.attrs['data-otazka']), flattenOtazky(SADA).map((q) => q.id));
  const parts = c.find((n) => n.className === 'zpd-part');
  assert.equal(parts.length, SADA.casti.length);
  assert.ok(parts.every((p) => p.tag === 'fieldset'));
  const radios = c.find((n) => n.attrs.type === 'radio');
  const checks = c.find((n) => n.attrs.type === 'checkbox');
  const expected = flattenOtazky(SADA).filter((q) => q.vyber === 'jeden').reduce((s, q) => s + q.moznosti.length, 0);
  assert.equal(radios.length, expected);
  assert.equal(checks.length, flattenOtazky(SADA).filter((q) => q.vyber !== 'jeden').reduce((s, q) => s + q.moznosti.length, 0));
  // upřesnění jen u otázek s volbou „uveďte“
  const upres = c.find((n) => (n.attrs.name || '').endsWith('_upresneni'));
  assert.equal(upres.length, flattenOtazky(SADA).filter(hasUpresneni).length);
  assert.equal(c.find((n) => n.className === 'zpd-submit').length, 1);
  const st = c.find((n) => (n.className || '').startsWith('zpd-status'))[0];
  assert.equal(st.attrs.role, 'status');
  // pole respondent_typ se u veřejnosti nerenderuje
  assert.equal(c.find((n) => n.attrs.name === 'respondent_typ').length, 0);
});

test('renderDotaznik: otevřená sada = textarea na otázku', () => {
  const c = mkContainer();
  renderDotaznik(c, OTEVRENA);
  assert.equal(c.find((n) => n.tag === 'textarea').length, OTEVRENA.otazky.length);
  assert.equal(c.find((n) => n.attrs['data-otazka']).length, OTEVRENA.otazky.length);
  assert.equal(c.find((n) => n.attrs.maxlength === '2000' && n.tag === 'textarea').length, OTEVRENA.otazky.length);
});

test('renderDotaznik: adresný respondent bez tokenu formulář nedostane', () => {
  const c = mkContainer();
  const r = renderDotaznik(c, SADA, { respondentTyp: 'pojistovna' });
  assert.equal(r.form, null);
  assert.equal(c.find((n) => n.tag === 'form').length, 0);
  assert.match(c.textContent, /token/);
  const c2 = mkContainer();
  assert.equal(renderDotaznik(c2, { ...SADA, povolene_respondenty: ['pojistovna'] }).form, null);
});

test('renderDotaznik: bez kontejneru nebo sady nic', () => {
  assert.equal(renderDotaznik(null, SADA), null);
  assert.equal(renderDotaznik(mkContainer(), null), null);
});

function fillForm(c, picks) {
  for (const n of c.find((x) => x.tag === 'input' && (x.attrs.type === 'radio' || x.attrs.type === 'checkbox'))) {
    if (picks[n.attrs.name]?.includes(n.value)) n.checked = true;
  }
}

test('renderDotaznik: submit posílá POST na /api/dotaznik a ukáže „odesláno“', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { status: 200, json: async () => ({ ok: true }) }; };
  const c = mkContainer();
  const r = renderDotaznik(c, SADA, { fetchImpl });
  fillForm(c, { A1: ['obézní děti', 'křehcí senioři'], A4: ['ročně'] });
  const submitEv = c.find((n) => n.tag === 'form')[0].listeners.submit[0];
  let prevented = false;
  submitEv({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  const result = await r.submit();
  assert.equal(result, null, 'druhý submit během/po prvním se nepouští znovu');
  await new Promise((res) => setTimeout(res, 0));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/dotaznik');
  assert.equal(calls[0].init.method, 'POST');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.sada_id, 'rizikovi-pojistenci');
  assert.equal(body.sada_verze, '1');
  assert.equal(body.respondent_typ, 'verejnost');
  assert.ok(!('token' in body));
  assert.deepEqual(body.odpovedi, { A1: ['obézní děti', 'křehcí senioři'], A4: 'ročně' });
  const st = c.find((n) => (n.className || '').startsWith('zpd-status'))[0];
  assert.match(st.className, /is-ok/);
  assert.match(st.textContent, /Děkujeme/);
});

test('renderDotaznik: token → typ pojistovna a token v těle; prázdný formulář se neodešle', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push(init); return { status: 200, json: async () => ({ ok: true }) }; };
  const c = mkContainer();
  const r = renderDotaznik(c, SADA, { token: TOKEN, fetchImpl });
  const empty = await r.submit();
  assert.equal(empty.kind, 'empty');
  assert.equal(calls.length, 0);
  fillForm(c, { A3: ['ne'] });
  await r.submit();
  const body = JSON.parse(calls[0].body);
  assert.equal(body.respondent_typ, 'pojistovna');
  assert.equal(body.token, TOKEN);
});

test('renderDotaznik: 503, 403, 400, 429 a síťová chyba → srozumitelný stav, ne výjimka', async () => {
  const cases = [
    [() => ({ status: 503, json: async () => ({ error: 'dotaznik-neni-nakonfigurovan' }) }), /není aktivní/],
    [() => ({ status: 403, json: async () => ({}) }), /není platný/],
    [() => ({ status: 400, json: async () => ({ errors: ['A4: hodnota mimo nabídku'] }) }), /A4: hodnota mimo nabídku/],
    [() => ({ status: 429, json: async () => ({}) }), /příliš mnoho/i],
    [() => ({ status: 404, json: async () => { throw new Error('html'); } }), /ověřit/],
    [() => ({ status: 500, json: async () => ({}) }), /Odeslání se nepodařilo/],
    [() => { throw new TypeError('Failed to fetch'); }, /Odeslání se nepodařilo/],
  ];
  for (const [mkResp, re] of cases) {
    const c = mkContainer();
    const r = renderDotaznik(c, SADA, { fetchImpl: async () => mkResp() });
    fillForm(c, { A3: ['ne'] });
    await r.submit();
    const st = c.find((n) => (n.className || '').startsWith('zpd-status'))[0];
    assert.match(st.className, /is-err/);
    assert.match(st.textContent, re);
    const btn = c.find((n) => n.className === 'zpd-submit')[0];
    assert.equal(btn.disabled, false, 'po chybě jde odeslat znovu');
  }
});

test('collectOdpovedi, buildPayload, interpretResponse, submitDotaznik bez fetch', async () => {
  const refs = { A3: { kind: 'jeden', inputs: [{ value: 'ano – uveďte typ modelu', checked: true }, { value: 'ne', checked: false }], extra: { value: ' GLM ' } } };
  assert.deepEqual(collectOdpovedi({ casti: [{ otazky: [{ id: 'A3', moznosti: ['x'] }] }] }, refs), { A3: 'ano – uveďte typ modelu', A3_upresneni: 'GLM' });
  assert.equal(buildPayload(OTEVRENA, { fp1: 'x' }).sada_verze, '1');
  assert.equal(interpretResponse(200, { ok: true }).kind, 'ok');
  assert.equal(interpretResponse(503, null).kind, 'unavailable');
  assert.equal((await submitDotaznik({}, null)).kind, 'error');
});

test('renderDotaznikAgregace: bary pro otázky s nabídkou, text nikdy', () => {
  const agg = {
    version: '1.0.0',
    sady: { 'rizikovi-pojistenci': { pocet_odpovedi: 4, respondent_typy: { pojistovna: 4 }, otazky: { A3: { 'ano – uveďte typ modelu': 1, ne: 3 }, A4: { 'měsíčně': 0, 'čtvrtletně': 2, 'ročně': 2, 'ad hoc': 0 } } } },
  };
  const c = mkContainer();
  const root = renderDotaznikAgregace(c, agg, SADA);
  assert.equal(root.className, 'zpd-agg');
  assert.match(c.textContent, /Zatím odpovědělo 4 \(pojišťovny 4\)/);
  const bars = c.find((n) => n.className === 'zpd-bar');
  assert.equal(bars.length, 2 + 4);
  const fills = c.find((n) => n.className === 'zpd-bar-fill').map((n) => n.attrs.style);
  assert.deepEqual(fills.slice(0, 2), ['--w:25%', '--w:75%']);
  assert.equal(c.find((n) => n.className === 'zpd-bar-val')[1].textContent, '3 z 4');
  assert.equal(c.find((n) => n.className === 'zpd-agg-q').length, 2, 'jen A3 a A4 mají data');
});

test('renderDotaznikAgregace: chybí sada → null; 0 odpovědí a skryto → vysvětlení bez barů', () => {
  const c = mkContainer();
  assert.equal(renderDotaznikAgregace(c, { sady: {} }, SADA), null);
  assert.equal(renderDotaznikAgregace(c, null, SADA), null);
  assert.equal(renderDotaznikAgregace(null, {}, SADA), null);
  renderDotaznikAgregace(c, { sady: { [SADA.id]: { pocet_odpovedi: 0, respondent_typy: {}, otazky: {} } } }, SADA);
  assert.match(c.textContent, /Zatím nejsou k dispozici/);
  renderDotaznikAgregace(c, { sady: { [SADA.id]: { pocet_odpovedi: 2, respondent_typy: { pojistovna: 2 }, otazky: {}, skryto: true } } }, SADA);
  assert.match(c.textContent, /méně než tři/);
  assert.equal(c.find((n) => n.className === 'zpd-bar').length, 0);
});

// --- kontrakt stringů: zdroj, HTML, CSS, dokumentace ---------------------------------------
test('zp-dotaznik.js nepoužívá innerHTML ani eval', () => {
  const src = read('src', 'zp-dotaznik.js').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(src));
});

test('pojistovny.html a pojistovny.js: kontejnery, věta o soukromí, volání renderu', () => {
  const html = read('pojistovny.html');
  const modul = html.slice(html.indexOf('id="modul-gramotnost"'), html.indexOf('id="modul-metodika"'));
  assert.match(modul, /<div id="zpDotaznik" data-sada="rizikovi-pojistenci"><\/div>/);
  assert.match(modul, /<div id="zpDotaznikAgregace"><\/div>/);
  assert.match(modul, /bez osobních údajů/);
  const js = read('src', 'pojistovny.js');
  assert.match(js, /from '\.\/zp-dotaznik\.js'/);
  assert.match(js, /pojistovny-dotaznik-agregaty\.json/);
  assert.match(js, /renderDotaznik\(/);
});

test('styles.css: sekce .zpd- je poslední pod markerem a .zpd- jinde není', () => {
  const css = read('src', 'styles.css');
  const marker = '/* === Srovnávač pojišťoven: dotazníky src/zp-dotaznik.js (.zpd-) — balíček P2.4 === */';
  const i = css.indexOf(marker);
  assert.ok(i > 0);
  assert.equal(css.indexOf(marker, i + 1), -1);
  for (const m of ['(.zpc-) — plní balíček P0.4', '(.zpv-) — plní balíček P1.2/P2.1', '(.zpi-) — plní balíček P1.3']) {
    assert.ok(css.indexOf(m) > 0 && css.indexOf(m) < i, m);
  }
  assert.ok(!css.slice(0, i).includes('.zpd-'));
  const section = css.slice(i);
  for (const cls of ['.zpd-form', '.zpd-part', '.zpd-q', '.zpd-opt', '.zpd-submit', '.zpd-status', '.zpd-agg', '.zpd-bars', '.zpd-bar-fill']) {
    assert.ok(section.includes(cls), cls);
  }
  // třídy použité ve zdroji existují v CSS
  const src = read('src', 'zp-dotaznik.js');
  const used = new Set([...src.matchAll(/'(zpd-[a-z0-9-]+)/g)].map((m) => m[1]));
  for (const cls of used) assert.ok(section.includes('.' + cls), `chybí CSS pro .${cls}`);
});

test('dokumentace: o-projektu (soukromí), metodika § 7, quickref .zpd-', () => {
  const op = read('o-projektu.html');
  assert.match(op, /Dotazníky v Srovnávači pojišťoven/);
  assert.match(op, /bez osobních údajů/);
  const met = fs.readFileSync(path.join(ROOT, '..', 'docs', 'metodika-srovnavac-pojistoven.md'), 'utf8');
  assert.match(met, /^## 7\. Dotazníky/m);
  const qr = fs.readFileSync(path.join(ROOT, '..', 'docs', 'quickref.md'), 'utf8');
  assert.match(qr, /`\.zpd-\*`/);
});

test('vercel.json: funkce dotaznik.js dostane definici sad', () => {
  const v = JSON.parse(read('vercel.json'));
  assert.equal(v.functions['api/dotaznik.js'].includeFiles, 'data/pojistovny-otazky.json');
});
