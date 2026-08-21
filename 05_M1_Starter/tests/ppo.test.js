// Testy sekce „Pracovní skupiny MZ": konzistence datových souborů
// data/ppo.json + data/ppo-osoby.json (staví ingest/ppo/build-web.js)
// a pure helperů src/ppo.js, src/ppo-detail.js a builderu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { filterHrany, heatRows, fmtDate, nodeRadius, STAV_LABELS } from '../src/ppo.js';
import { membersOf, edgesOf, ROLE_ORDER } from '../src/ppo-detail.js';
import { clusterKey, layoutNetwork, spojkaRow, VIEW } from '../ingest/ppo/build-web.js';

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

test('ppo: stupen uzlu = počet incidentních hran (ne bipartitní stupeň)', () => {
  // Nález Codex review PR #1034: sit.json má ve stupni počet členů skupiny;
  // web musí ukazovat počet vazeb skupina–skupina.
  const deg = new Map();
  for (const h of ppo.sit.hrany) {
    deg.set(h.a, (deg.get(h.a) ?? 0) + 1);
    deg.set(h.b, (deg.get(h.b) ?? 0) + 1);
  }
  for (const u of ppo.sit.uzly) {
    assert.equal(u.stupen, deg.get(u.id), `uzel ${u.id}: stupen ${u.stupen} ≠ hrany ${deg.get(u.id)}`);
  }
});

test('ppo: jednání skupin jsou kompletně z kalendáře (počet, roky, poslední)', () => {
  let soucet = 0;
  for (const s of ppo.skupiny) {
    const data = ppo.kalendar.po_skupine[s.id] ?? [];
    assert.equal(s.jednani_celkem, data.length, `skupina ${s.id}: jednani_celkem ≠ kalendář`);
    const rokySum = Object.values(s.jednani_roky ?? {}).reduce((a, b) => a + b, 0);
    assert.equal(rokySum, s.jednani_celkem, `skupina ${s.id}: součet jednani_roky nesedí`);
    assert.equal(s.posledni_aktivita, data.at(-1) ?? null, `skupina ${s.id}: posledni_aktivita ≠ poslední zápis`);
    soucet += data.length;
  }
  assert.equal(soucet, ppo.kalendar.jednani_celkem, 'součet jednání skupin ≠ jednani_celkem');
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

/* ── stránky existují a odkazují na moduly ─────────────────────────── */

test('ppo: stránky sekce existují a mají robots index', () => {
  for (const [page, mod] of [['pracovni-skupiny.html', 'src/ppo.js'], ['pracovni-skupina.html', 'src/ppo-detail.js']]) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.ok(html.includes(mod), `${page} nenačítá ${mod}`);
    assert.match(html, /name="robots" content="index, follow"/, `${page}: chybí robots index`);
    assert.ok(fs.existsSync(path.join(ROOT, mod)), `${mod} neexistuje`);
  }
});
