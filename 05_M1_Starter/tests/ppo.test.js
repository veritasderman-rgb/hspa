// Testy sekce „Pracovní skupiny MZ": konzistence datových souborů
// data/ppo.json + data/ppo-osoby.json (staví ingest/ppo/build-web.js)
// a pure helperů src/ppo.js, src/ppo-detail.js a builderu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { filterHrany, heatRows, fmtDate, nodeRadius, STAV_LABELS, KAT_LABELS } from '../src/ppo.js';
import { membersOf, edgesOf, ROLE_ORDER, coiEvents } from '../src/ppo-detail.js';
import { membershipRows, vedeCount } from '../src/ppo-osoba.js';
import { normText, prijmeniKey, filterOsoby } from '../src/ppo-osoby.js';
import { formatDatumCz, formatOd, filterUkoly } from '../src/ppo-ukoly.js';
import { clusterKey, layoutNetwork, spojkaRow, VIEW, mergeExterni, mergeSouvislosti, applyKorekce, UHRADOVY_ORGAN, parseTermin, buildUkoly } from '../ingest/ppo/build-web.js';

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

/* ── FÁZE 4b: kurátorované souvislosti skupin ──────────────────────── */

test('ppo souvislosti: cíle odkazů existují a články jsou publikované', () => {
  const reg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'ingest', 'ppo', 'skupiny-souvislosti.json'), 'utf8'));
  const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8')).articles;
  const published = new Set(articles.filter(a => a.published !== false).map(a => a.slug));
  const byId = new Map(ppo.skupiny.map(s => [s.id, s]));
  assert.ok(reg.skupiny.length >= 5, 'podezřele málo kurátorovaných skupin');
  for (const r of reg.skupiny) {
    const s = byId.get(r.id);
    assert.ok(s, `souvislosti: skupina ${r.id} v datech není`);
    assert.deepEqual(s.souvislosti, r.odkazy, `skupina ${r.id}: data nekopírují registr`);
    for (const o of r.odkazy) {
      assert.ok(o.nazev && o.url, `skupina ${r.id}: odkaz bez názvu/url`);
      if (!/^https?:/.test(o.url)) {
        const file = o.url.split(/[?#]/)[0];
        assert.ok(fs.existsSync(path.join(ROOT, file)), `skupina ${r.id}: cíl ${file} neexistuje`);
        if (/^clanek-.*\.html$/.test(file)) {
          assert.ok(published.has(file), `skupina ${r.id}: článek ${file} není publikovaný`);
        }
      }
    }
  }
  // skupiny bez záznamu v registru souvislosti nemají
  const regIds = new Set(reg.skupiny.map(r => r.id));
  for (const s of ppo.skupiny) {
    if (!regIds.has(s.id)) assert.equal(s.souvislosti, undefined, `skupina ${s.id} má souvislosti mimo registr`);
  }
});

test('ppo helpery: mergeSouvislosti hlídá id, existenci cíle i publikaci článku', () => {
  const mk = () => new Map([[1, { id: 1 }]]);
  const opts = { rootDir: ROOT, publishedSlugs: new Set(['clanek-vakcinace.html']) };
  const byId = mk();
  mergeSouvislosti(byId, { skupiny: [{ id: 1, odkazy: [
    { nazev: 'a', url: 'prevence.html' },
    { nazev: 'b', url: 'clanek-vakcinace.html' },
    { nazev: 'c', url: 'https://example.org/x' },
  ] }] }, opts);
  assert.equal(byId.get(1).souvislosti.length, 3);
  assert.throws(() => mergeSouvislosti(mk(), { skupiny: [{ id: 9, odkazy: [] }] }, opts), /v datech není/);
  assert.throws(() => mergeSouvislosti(mk(), { skupiny: [{ id: 1, odkazy: [{ nazev: 'x', url: 'neexistuje-xyz.html' }] }] }, opts), /v repu není/);
  assert.throws(() => mergeSouvislosti(mk(), { skupiny: [{ id: 1, odkazy: [{ nazev: 'x', url: 'clanek-veto-platcu-szv-2026.html' }] }] }, opts), /není publikovaný|v repu není/);
});

/* ── kurátorské korekce kategorizace (osoby-externi.json `korekce`) ── */

test('ppo korekce: žebříčky bez úředníků neobsahují osoby s korekcí mz_urednik', () => {
  const kor = externiReg.osoby.filter(e => e.korekce);
  assert.ok(kor.length >= 2, 'čekám aspoň korekce Karen + Šmucler');
  for (const e of kor) {
    assert.ok(KAT_LABELS[e.korekce.kat], `korekce ${e.id}: neznámá kategorie '${e.korekce.kat}'`);
    assert.ok(e.korekce.duvod, `korekce ${e.id}: chybí duvod`);
    for (const key of ['bez_uredniku', 'bez_uredniku_a_statnich']) {
      if (e.korekce.kat === 'mz_urednik') {
        assert.ok(!ppo.spojky[key].some(r => r.id === e.id),
          `${key}: osoba ${e.id} s korekcí mz_urednik nesmí být v žebříčku`);
      }
    }
    const p = osoby.osoby.find(x => x.id === e.id);
    assert.equal(p.kat, e.korekce.kat, `osoba ${e.id}: kat v datech nenese korekci`);
    if (e.korekce.afiliace) {
      assert.equal(p.afiliace[0], e.korekce.afiliace[0], `osoba ${e.id}: afiliace nenese korekci`);
    }
  }
});

test('ppo helpery: applyKorekce přepíše kategorii a vyřadí ze správných žebříčků', () => {
  const mk = () => ({
    osoby: [{ id: 7, jmeno: 'MUDr. Jan Novák', afiliace_kategorie: 'neuvedeno', afiliace: [] }],
    zebricky: { celkovy: [7], bez_uredniku: [7], bez_uredniku_a_statnich: [7] },
  });
  const outA = mk();
  applyKorekce(outA, { osoby: [{ id: 7, jmeno: 'Jan Novák',
    korekce: { kat: 'mz_urednik', afiliace: ['náměstek'] } }] });
  assert.equal(outA.osoby[0].afiliace_kategorie, 'mz_urednik');
  assert.deepEqual(outA.osoby[0].afiliace, ['náměstek']);
  assert.deepEqual(outA.zebricky.bez_uredniku, []);
  assert.deepEqual(outA.zebricky.bez_uredniku_a_statnich, []);
  assert.deepEqual(outA.zebricky.celkovy, [7], 'celkový žebříček zůstává');
  const outB = mk();
  applyKorekce(outB, { osoby: [{ id: 7, jmeno: 'Jan Novák', korekce: { kat: 'statni_instituce' } }] });
  assert.deepEqual(outB.zebricky.bez_uredniku, [7], 'statni_instituce v bez_uredniku zůstává');
  assert.deepEqual(outB.zebricky.bez_uredniku_a_statnich, []);
  assert.throws(() => applyKorekce(mk(), { osoby: [{ id: 7, jmeno: 'Petr Dvořák', korekce: { kat: 'komora' } }] }), /neobsahuje/);
});

/* ── Kdo je kdo + dvojrole (pracovni-osoby.html, data/ppo-dvojrole.json) ── */

const dvojrole = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-dvojrole.json'), 'utf8'));

test('ppo dvojrole: dataset sedí na registr, skupiny i heuristiku úhradových orgánů', () => {
  assert.equal(dvojrole.pocet, dvojrole.osoby.length);
  assert.ok(dvojrole.pocet >= 250, `podezřele málo osob (${dvojrole.pocet})`);
  const regFirmy = new Map(externiReg.osoby.filter(e => e.firmy?.length).map(e => [e.id, e]));
  const gById = new Map(ppo.skupiny.map(g => [g.id, g]));
  for (const o of dvojrole.osoby) {
    const e = regFirmy.get(o.id);
    assert.ok(e, `osoba ${o.id} není v registru s firmami`);
    assert.deepEqual(o.firmy, e.firmy, `osoba ${o.id}: firmy nesedí na registr`);
    if (o.url) assert.ok(o.url.startsWith('https://www.hlidacstatu.cz/osoba/'), `osoba ${o.id}: podezřelá url`);
    assert.ok(o.skupiny.length >= 1, `osoba ${o.id}: bez skupin`);
    for (const sk of o.skupiny) {
      const g = gById.get(sk.g);
      assert.ok(g, `osoba ${o.id}: skupina ${sk.g} neexistuje`);
      assert.equal(sk.uhradovy, UHRADOVY_ORGAN.test(g.nazev), `osoba ${o.id}: uhradovy flag u ${sk.g}`);
    }
  }
  // úhradové orgány řadí builder na začátek
  const prvniBezUhr = dvojrole.osoby.findIndex(o => !o.skupiny.some(s => s.uhradovy));
  if (prvniBezUhr >= 0) {
    assert.ok(!dvojrole.osoby.slice(prvniBezUhr).some(o => o.skupiny.some(s => s.uhradovy)),
      'osoby s úhradovým orgánem nejsou seřazené první');
  }
});

test('ppo helpery: normText, prijmeniKey, filterOsoby (adresář Kdo je kdo)', () => {
  assert.equal(normText('Šmucler Ž'), 'smucler z');
  assert.equal(prijmeniKey('doc. MUDr. Roman Šmucler, CSc.'), 'smucler');
  assert.equal(prijmeniKey('prof. MUDr. Vladimír Černý, Ph.D., FCCM'), 'cerny');
  const os = [
    { id: 1, jmeno: 'MUDr. Igor Karen', kat: 'mz_urednik', afiliace: ['náměstek'], clenstvi: [], externi: { funkce: [], odkazy: [] } },
    { id: 2, jmeno: 'Jan Černý', kat: 'pojistovna', afiliace: ['VZP'], clenstvi: [] },
  ];
  assert.equal(filterOsoby(os, { q: 'karen' }).length, 1);
  assert.equal(filterOsoby(os, { q: 'cerny' })[0].id, 2, 'hledání bez diakritiky');
  assert.equal(filterOsoby(os, { kat: 'pojistovna' }).length, 1);
  assert.equal(filterOsoby(os, { jenOverene: true })[0].id, 1);
  assert.equal(filterOsoby(os, { q: 'vzp' }).length, 1, 'hledá i v afiliaci');
});

/* ── úkoly z jednání (pracovni-ukoly.html, data/ppo-ukoly.json) ────── */

const ukolyData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-ukoly.json'), 'utf8'));

test('ppo parseTermin: české formulace termínů → ISO datum, jinak null', () => {
  assert.equal(parseTermin('2026-03-02'), '2026-03-02');
  assert.equal(parseTermin('21. 2. 2025'), '2025-02-21');
  assert.equal(parseTermin('15.8.2025'), '2025-08-15');
  assert.equal(parseTermin('6.11.24'), '2024-11-06');
  assert.equal(parseTermin('do 15. 11. 2024'), '2024-11-15');
  assert.equal(parseTermin('20. února 2020'), '2020-02-20');
  assert.equal(parseTermin('do konce roku 2023'), '2023-12-31');
  assert.equal(parseTermin('do konce listopadu 2018'), '2018-11-30');
  assert.equal(parseTermin('prosinec 2019'), '2019-12-31');
  assert.equal(parseTermin('do příštího jednání'), null);
  assert.equal(parseTermin('co nejdříve'), null);
  assert.equal(parseTermin('cca 14 dnů před jednáním PS 24. 11. 2016'), null,
    'datum ukotvené relativní vazbou není termín');
  assert.equal(parseTermin('od 1. 9. 2025'), null, 'datum počátku není termín');
  assert.equal(parseTermin('na příštím jednání (21. 11. 2018)'), '2018-11-21',
    'datum příštího jednání termínem je');
  assert.equal(parseTermin('ideálně do 15.5.2026 (alespoň 14 dní před dalším jednáním)'), '2026-05-15',
    'relativní vazba až ZA datem normalizaci neblokuje');
  assert.equal(parseTermin('45. 13. 2025'), null, 'nevalidní den/měsíc se odmítá');
  assert.equal(parseTermin(null), null);
});

test('ppo ukoly: dataset je přegenerovatelný z analýz a sedí na skupiny', () => {
  // drift test: builder nad analýzami v repu musí dát přesně committed dataset
  const ANA = path.join(ROOT, 'ingest', 'ppo', 'analyza');
  const analyzy = new Map();
  for (const f of fs.readdirSync(ANA)) {
    const m = /^skupina-(\d+)\.json$/.exec(f);
    if (m) analyzy.set(Number(m[1]), JSON.parse(fs.readFileSync(path.join(ANA, f), 'utf8')));
  }
  const gids = new Set(ppo.skupiny.map(s => s.id));
  const rebuilt = buildUkoly(analyzy, gids);
  assert.deepEqual(rebuilt.ukoly, ukolyData.ukoly, 'ukoly nesedí na builder (spusť npm run build:ppo)');
  assert.deepEqual(rebuilt.otevrene, ukolyData.otevrene, 'otevrene nesedí na builder');
  assert.equal(ukolyData.pocty.ukoly, ukolyData.ukoly.length);
  assert.equal(ukolyData.pocty.otevrene, ukolyData.otevrene.length);

  const gById = new Map(ppo.skupiny.map(g => [g.id, g]));
  const gsInData = new Set([...ukolyData.ukoly, ...ukolyData.otevrene].map(u => u.g));
  assert.deepEqual(ukolyData.skupiny.map(s => s.g), [...gsInData].sort((a, b) => a - b),
    'seznam skupin nekryje přesně skupiny s úkoly');
  for (const s of ukolyData.skupiny) assert.equal(s.nazev, gById.get(s.g)?.nazev, `skupina ${s.g}: název nesedí`);
  for (const u of ukolyData.ukoly) {
    assert.ok(u.co, 'úkol bez textu');
    if (u.datum) assert.match(u.datum, /^\d{4}-\d{2}-\d{2}$/);
    if (u.datum) assert.ok(u.datum >= '2004-01-01' && u.datum <= '2027-12-31', `podezřelé datum jednání ${u.datum}`);
    assert.equal(u.t, parseTermin(u.termin), 'pole t nesedí na parseTermin(termin)');
  }
});

test('ppo ukoly helpery: formatDatumCz, formatOd, filterUkoly', () => {
  assert.equal(formatDatumCz('2025-09-04'), '4. září 2025');
  assert.equal(formatDatumCz(null), '');
  assert.equal(formatOd('2026-06'), 'od června 2026');
  const nazvy = new Map([[4, 'PS k seznamu zdravotních výkonů'], [199, 'Komise pro výživu']]);
  const list = [
    { g: 4, datum: '2025-06-05', co: 'Opravit registrační listy', kdo: 'ČUS ČLS JEP' },
    { g: 199, datum: '2024-03-01', co: 'Dodat podklady ke kojení', kdo: 'tajemnice' },
  ];
  assert.equal(filterUkoly(list, { q: 'registracni' }, nazvy).length, 1, 'hledání bez diakritiky');
  assert.equal(filterUkoly(list, { q: 'vyzivu' }, nazvy)[0].g, 199, 'hledá i v názvu skupiny');
  assert.equal(filterUkoly(list, { g: '4' }, nazvy).length, 1);
  assert.equal(filterUkoly(list, { rok: '2024' }, nazvy)[0].g, 199);
  assert.equal(filterUkoly(list, {}, nazvy).length, 2);
});

/* ── stránky existují a odkazují na moduly ─────────────────────────── */

test('ppo: stránky sekce existují a mají robots index', () => {
  for (const [page, mod] of [['pracovni-skupiny.html', 'src/ppo.js'], ['pracovni-skupina.html', 'src/ppo-detail.js'], ['pracovni-osoba.html', 'src/ppo-osoba.js'], ['pracovni-osoby.html', 'src/ppo-osoby.js'], ['pracovni-ukoly.html', 'src/ppo-ukoly.js']]) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.ok(html.includes(mod), `${page} nenačítá ${mod}`);
    assert.match(html, /name="robots" content="index, follow"/, `${page}: chybí robots index`);
    assert.ok(fs.existsSync(path.join(ROOT, mod)), `${mod} neexistuje`);
  }
});
