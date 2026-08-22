// Testy sekce „Pracovní skupiny MZ": konzistence datových souborů
// data/ppo.json + data/ppo-osoby.json (staví ingest/ppo/build-web.js)
// a pure helperů src/ppo.js, src/ppo-detail.js a builderu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { filterHrany, heatRows, fmtDate, nodeRadius, STAV_LABELS } from '../src/ppo.js';
import { membersOf, edgesOf, ROLE_ORDER, coiEvents } from '../src/ppo-detail.js';
import { membershipRows, vedeCount } from '../src/ppo-osoba.js';
import { clusterKey, layoutNetwork, spojkaRow, VIEW, mergeExterni } from '../ingest/ppo/build-web.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
const osoby = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-osoby.json'), 'utf8'));

/* ── obal a souhrn ─────────────────────────────────────────────────── */

test('ppo: validní obal a souhrn sedí na data', () => {
  assert.ok(ppo.version, 'chybí version');
  assert.ok(ppo.stav_k && /^\d{4}-\d{2}-\d{2}$/.test(ppo.stav_k), 'stav_k není ISO datum');
  assert.equal(ppo.souhrn.skupin, ppo.skupiny.length);
  assert.equal(ppo.souhrn.aktivnich, ppo.skupiny.filter(s => s.stav === 'aktivni').length);
  assert.equal(ppo.souhrn.vazeb, ppo.sit.hrany.length);
  assert.equal(ppo.souhrn.osob, osoby.pocet);
  assert.equal(osoby.pocet, osoby.osoby.length);
  assert.ok(ppo.skupiny.length >= 100, `podezřele málo skupin (${ppo.skupiny.length})`);
});

test('ppo: „vynechano" se do webu nedostane; každá skupina má povinná pole', () => {
  for (const s of ppo.skupiny) {
    assert.notEqual(s.stav, 'vynechano', `skupina ${s.id} má stav vynechano`);
    assert.ok(s.nazev, `skupina ${s.id} bez názvu`);
    assert.ok(s.url?.startsWith('https://ppo.mzcr.cz/'), `skupina ${s.id}: podezřelé url ${s.url}`);
    assert.ok(STAV_LABELS[s.stav], `skupina ${s.id}: stav '${s.stav}' bez české popisky`);
    assert.ok(Number.isInteger(s.pocet_clenu) && s.pocet_clenu >= 0, `skupina ${s.id}: pocet_clenu`);
  }
});

/* ── síť ───────────────────────────────────────────────────────────── */

test('ppo: hrany a uzly referencují existující skupiny, layout je v plátně', () => {
  const gids = new Set(ppo.skupiny.map(s => s.id));
  const uzly = new Set(ppo.sit.uzly.map(u => u.id));
  for (const u of ppo.sit.uzly) {
    assert.ok(gids.has(u.id), `uzel ${u.id} nemá skupinu`);
    assert.ok(u.x >= 0 && u.x <= ppo.sit.view.w, `uzel ${u.id}: x mimo plátno`);
    assert.ok(u.y >= 0 && u.y <= ppo.sit.view.h, `uzel ${u.id}: y mimo plátno`);
    assert.ok(u.stupen >= 1, `uzel ${u.id}: stupen < 1`);
  }
  const osobyIds = new Set(osoby.osoby.map(p => p.id));
  for (const h of ppo.sit.hrany) {
    assert.ok(uzly.has(h.a) && uzly.has(h.b), `hrana ${h.a}–${h.b}: uzel chybí v síti`);
    assert.ok(h.vaha >= 1, `hrana ${h.a}–${h.b}: váha ${h.vaha}`);
    assert.equal(h.osoby.length, h.vaha, `hrana ${h.a}–${h.b}: váha ≠ počet osob`);
    for (const pid of h.osoby) assert.ok(osobyIds.has(pid), `hrana ${h.a}–${h.b}: osoba ${pid} chybí`);
  }
});

test('ppo: hrana skutečně odpovídá sdíleným členstvím v ppo-osoby.json', () => {
  const byId = new Map(osoby.osoby.map(p => [p.id, p]));
  for (const h of ppo.sit.hrany.slice(0, 40)) {
    for (const pid of h.osoby) {
      const gs = new Set(byId.get(pid).clenstvi.map(c => c.g));
      assert.ok(gs.has(h.a) && gs.has(h.b),
        `osoba ${pid} na hraně ${h.a}–${h.b} nemá obě členství`);
    }
  }
});

/* ── spojky, kalendář ──────────────────────────────────────────────── */

test('ppo: spojky referencují osoby a počty sedí na členství', () => {
  const byId = new Map(osoby.osoby.map(p => [p.id, p]));
  for (const [key, rows] of Object.entries(ppo.spojky)) {
    assert.ok(rows.length >= 3, `žebříček ${key} je podezřele krátký`);
    for (const r of rows) {
      const p = byId.get(r.id);
      assert.ok(p, `${key}: osoba ${r.id} chybí v ppo-osoby.json`);
      assert.equal(r.skupin, p.clenstvi.length, `${key}: ${r.jmeno} — počet skupin nesedí`);
      assert.ok(r.skupin >= 2, `${key}: ${r.jmeno} má < 2 skupiny`);
    }
  }
});

test('ppo: kalendář po_skupine referencuje skupiny, součet měsíců = jednani_celkem', () => {
  const gids = new Set(ppo.skupiny.map(s => s.id));
  for (const g of Object.keys(ppo.kalendar.po_skupine)) {
    assert.ok(gids.has(Number(g)), `kalendar.po_skupine: skupina ${g} chybí`);
  }
  const soucet = Object.values(ppo.kalendar.mesice).reduce((s, n) => s + n, 0);
  assert.equal(soucet, ppo.kalendar.jednani_celkem, 'součet měsíců ≠ jednani_celkem');
});

/* ── pure helpery frontendu ────────────────────────────────────────── */

test('ppo helpery: filterHrany, heatRows, fmtDate, nodeRadius', () => {
  const hrany = [{ vaha: 1 }, { vaha: 3 }, { vaha: 5 }];
  assert.equal(filterHrany(hrany, 3).length, 2);
  const rows = heatRows({ '2025-03': 2, '2026-01': 1 });
  assert.deepEqual(rows.map(r => r.rok), ['2026', '2025']);
  assert.equal(rows[1].mesice[2].n, 2);
  assert.equal(rows[1].mesice.length, 12);
  assert.equal(fmtDate('2026-03-19'), '19. 3. 2026');
  assert.equal(fmtDate(null), '—');
  assert.ok(nodeRadius(25) > nodeRadius(4));
});

test('ppo helpery: membersOf třídí role dle ROLE_ORDER, edgesOf váhou sestupně', () => {
  const os = [
    { id: 1, jmeno: 'B', clenstvi: [{ g: 7, role: 'Členové' }] },
    { id: 2, jmeno: 'A', clenstvi: [{ g: 7, role: 'Předseda' }] },
    { id: 3, jmeno: 'C', clenstvi: [{ g: 8, role: 'Členové' }] },
  ];
  const m = membersOf(os, 7);
  assert.deepEqual(m.map(x => x.p.id), [2, 1]);
  assert.ok(ROLE_ORDER.includes('Tajemník'));
  const e = edgesOf([{ a: 7, b: 8, vaha: 2, osoby: [] }, { a: 9, b: 7, vaha: 5, osoby: [] }], 7);
  assert.deepEqual(e.map(x => x.gid), [9, 8]);
});

/* ── builder: determinismus layoutu ────────────────────────────────── */

test('ppo builder: layoutNetwork je deterministický a drží plátno', () => {
  const skupiny = new Map([[1, { gesce: 'SZ/A' }], [2, { gesce: 'SZ/B' }], [3, { gesce: 'HH' }]]);
  const uzly = [{ id: 1, stupen: 5 }, { id: 2, stupen: 2 }, { id: 3, stupen: 9 }];
  const l1 = layoutNetwork(uzly, skupiny);
  const l2 = layoutNetwork(uzly.map(u => ({ ...u })), skupiny);
  assert.deepEqual(l1, l2, 'layout není deterministický');
  for (const u of l1.uzly) {
    assert.ok(u.x >= 0 && u.x <= VIEW.w && u.y >= 0 && u.y <= VIEW.h);
  }
  assert.equal(clusterKey('SZT/OZI'), 'SZT');
  assert.equal(clusterKey(null), '-');
});

test('ppo builder: spojkaRow počítá jen viditelné skupiny a předsednictví', () => {
  const p = { id: 1, jmeno: 'X', afiliace: ['Y'], clenstvi: [
    { g: 1, role: 'Předseda' }, { g: 2, role: 'Členové' }, { g: 66, role: 'Předseda' },
  ] };
  const r = spojkaRow(p, new Set([1, 2]));
  assert.equal(r.skupin, 2);
  assert.equal(r.predsednictvi, 1);
  assert.deepEqual(r.skupiny, [1, 2]);
});

/* ── analýza zápisů (FÁZE 2 → data/ppo-analyza) ────────────────────── */

test('ppo analýza: souhrn v ppo.json ↔ soubory data/ppo-analyza/ 1:1', () => {
  const dir = path.join(ROOT, 'data', 'ppo-analyza');
  const files = new Set(fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f)));
  for (const s of ppo.skupiny) {
    if (s.analyza) {
      assert.ok(files.has(`${s.id}.json`), `skupina ${s.id} má souhrn, ale chybí soubor`);
      const a = JSON.parse(fs.readFileSync(path.join(dir, `${s.id}.json`), 'utf8'));
      assert.equal(a.group_id, s.id, `${s.id}.json: group_id nesedí`);
      assert.equal(a.jednani.length, s.analyza.jednani, `skupina ${s.id}: počet jednání nesedí`);
      files.delete(`${s.id}.json`);
    }
  }
  assert.deepEqual([...files], [], 'soubory bez souhrnu v ppo.json');
});

test('ppo analýza: jednání nejnovější první, URL vedou na portál MZ', () => {
  const dir = path.join(ROOT, 'data', 'ppo-analyza');
  for (const f of fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f))) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (let i = 1; i < a.jednani.length; i++) {
      assert.ok(String(a.jednani[i - 1].datum ?? '') >= String(a.jednani[i].datum ?? ''),
        `${f}: jednání nejsou seřazena sestupně (${a.jednani[i - 1].datum} < ${a.jednani[i].datum})`);
    }
    for (const j of a.jednani) {
      if (j.url) assert.ok(j.url.startsWith('https://ppo.mzcr.cz'), `${f}: podezřelé url ${j.url}`);
      for (const k of ['temata', 'rozhodnuti', 'ukoly', 'stret_zajmu', 'citace'])
        assert.ok(Array.isArray(j[k]), `${f}: jednani.${k} není pole`);
    }
  }
});

test('ppo zjisteni: teze s doklady na portálu a existujícími skupinami', () => {
  const gids = new Set(ppo.skupiny.map(s => s.id));
  assert.ok(ppo.zjisteni.length >= 10, `podezřele málo zjištění (${ppo.zjisteni.length})`);
  for (const z of ppo.zjisteni) {
    assert.ok(z.teze?.length > 40, 'zjištění bez teze');
    assert.ok(z.skupiny.length >= 1, `zjištění bez skupin: ${z.teze.slice(0, 40)}`);
    for (const g of z.skupiny) assert.ok(gids.has(g), `zjištění odkazuje na neexistující skupinu ${g}`);
    assert.ok(z.doklady.length >= 1, `zjištění bez dokladu: ${z.teze.slice(0, 40)}`);
    for (const d of z.doklady)
      assert.ok(d.url.startsWith('https://ppo.mzcr.cz'), `doklad mimo portál: ${d.url}`);
  }
});

test('ppo helpery: coiEvents skládá COI napříč jednáními s datem a zdrojem', () => {
  const ev = coiEvents([
    { datum: '2026-01-01', url: 'https://x', stret_zajmu: ['a', 'b'] },
    { datum: '2025-01-01', url: null, stret_zajmu: [] },
  ]);
  assert.equal(ev.length, 2);
  assert.deepEqual(ev[0], { datum: '2026-01-01', url: 'https://x', text: 'a' });
});

/* ── FÁZE 4a: kurátorované externí odkazy + profil osoby ───────────── */

const externiReg = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'ingest', 'ppo', 'osoby-externi.json'), 'utf8'));

test('ppo osoby-externi: registr sedí na data a odkazy vedou na https zdroje', () => {
  assert.match(externiReg.overeno, /^\d{4}-\d{2}-\d{2}$/, 'overeno není ISO datum');
  const byId = new Map(osoby.osoby.map(p => [p.id, p]));
  for (const e of externiReg.osoby) {
    const p = byId.get(e.id);
    assert.ok(p, `kurátorovaná osoba ${e.id} (${e.jmeno}) v datech není`);
    assert.ok(p.jmeno.includes(e.jmeno), `id ${e.id}: jméno „${p.jmeno}" neobsahuje „${e.jmeno}"`);
    assert.ok(e.odkazy.length >= 1, `id ${e.id}: bez odkazů`);
    assert.ok(e.odkazy.some(o => o.url.startsWith('https://www.hlidacstatu.cz/osoba/')),
      `id ${e.id}: chybí odkaz na Hlídač státu`);
    for (const o of e.odkazy) {
      assert.ok(o.nazev, `id ${e.id}: odkaz bez názvu`);
      assert.ok(o.url.startsWith('https://'), `id ${e.id}: nešifrovaný odkaz ${o.url}`);
    }
    assert.ok(e.identita, `id ${e.id}: chybí zdůvodnění identity (identita)`);
  }
  // dokumentovaná zamítnutí odkazují na skutečné osoby a nekolidují s propojenými
  const linked = new Set(externiReg.osoby.map(e => e.id));
  for (const n of externiReg.nepropojeno ?? []) {
    assert.ok(byId.has(n.id), `nepropojeno: osoba ${n.id} v datech není`);
    assert.ok(!linked.has(n.id), `nepropojeno: osoba ${n.id} je zároveň propojená`);
    assert.ok(n.duvod, `nepropojeno: osoba ${n.id} bez důvodu`);
  }
});

test('ppo osoby: externi v datech přesně kopíruje registr (bez interních polí)', () => {
  const s = osoby.osoby.filter(p => p.externi);
  assert.equal(s.length, externiReg.osoby.length, 'počet osob s externi nesedí na registr');
  const regById = new Map(externiReg.osoby.map(e => [e.id, e]));
  for (const p of s) {
    const e = regById.get(p.id);
    assert.deepEqual(p.externi, { funkce: e.funkce, odkazy: e.odkazy, overeno: externiReg.overeno },
      `id ${p.id}: externi v datech neodpovídá registru`);
  }
});

test('ppo helpery: mergeExterni hlídá neexistující id i posun jména', () => {
  const mk = () => [{ id: 7, jmeno: 'MUDr. Jan Novák' }];
  const merged = mergeExterni(mk(), {
    overeno: '2026-08-22',
    osoby: [{ id: 7, jmeno: 'Jan Novák', funkce: ['f'], odkazy: [{ nazev: 'n', url: 'https://x' }] }],
  });
  assert.deepEqual(merged[0].externi,
    { funkce: ['f'], odkazy: [{ nazev: 'n', url: 'https://x' }], overeno: '2026-08-22' });
  assert.throws(() => mergeExterni(mk(), { osoby: [{ id: 8, jmeno: 'Jan Novák' }] }), /v osobách není/);
  assert.throws(() => mergeExterni(mk(), { osoby: [{ id: 7, jmeno: 'Petr Dvořák' }] }), /neobsahuje kurátorské/);
  assert.equal(mergeExterni(mk(), null)[0].externi, undefined, 'bez registru se nic nemerguje');
});

test('ppo helpery: membershipRows řadí role dle ROLE_ORDER, vedeCount počítá předsednictví', () => {
  const skupinyById = new Map([
    [1, { id: 1, nazev: 'Béčko' }], [2, { id: 2, nazev: 'Áčko' }], [3, { id: 3, nazev: 'Céčko' }],
  ]);
  const p = { clenstvi: [{ g: 1, role: 'Členové' }, { g: 2, role: 'Členové' }, { g: 3, role: 'Předseda' }, { g: 99, role: 'Členové' }] };
  const rows = membershipRows(p, skupinyById);
  assert.deepEqual(rows.map(x => x.s.id), [3, 2, 1], 'předseda první, pak členství abecedně; neznámá skupina ven');
  assert.equal(vedeCount(p), 1);
  assert.equal(vedeCount({ clenstvi: [{ g: 1, role: 'Místopředseda' }] }), 1);
});

/* ── stránky existují a odkazují na moduly ─────────────────────────── */

test('ppo: stránky sekce existují a mají robots index', () => {
  for (const [page, mod] of [['pracovni-skupiny.html', 'src/ppo.js'], ['pracovni-skupina.html', 'src/ppo-detail.js'], ['pracovni-osoba.html', 'src/ppo-osoba.js']]) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.ok(html.includes(mod), `${page} nenačítá ${mod}`);
    assert.match(html, /name="robots" content="index, follow"/, `${page}: chybí robots index`);
    assert.ok(fs.existsSync(path.join(ROOT, mod)), `${mod} neexistuje`);
  }
});
