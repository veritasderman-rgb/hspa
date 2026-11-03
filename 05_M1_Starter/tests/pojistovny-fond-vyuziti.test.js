// Testy A7.2: sekce „Kolik z fondu doopravdy dostanete“ na stránce Prevence (strop vs. průměrné čerpání).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVyuziti, vyuzitiHtml } from '../src/pojistovny-prevence.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const F = json('pojistovny-fond-pravidla.json');
const R = json('pojistovny-hospodareni-rady.json');
const B = json('pojistovny-fond-bilance.json');
const html = fs.readFileSync(path.join(ROOT, 'pojistovny-prevence.html'), 'utf8');
const rows = (h) => [...h.matchAll(/<tr data-zp="(\d+)">([\s\S]*?)<\/tr>/g)].map((m) => ({ kod: m[1], html: m[2] }));

test('A7.2: tabulka má 7 řádků v pořadí kódů z pravidel (bez řazení), každý s data-zp', () => {
  const h = vyuzitiHtml(F, R, B);
  const r = rows(h);
  assert.deepEqual(r.map((x) => x.kod), F.pojistovny.map((z) => z.kod));
  assert.equal(r.length, 7);
  assert.doesNotMatch(h, /data-sort|aria-sort|zpv-sortnote/);
  assert.match(h, /data-csv-title="Strop příspěvků z fondu prevence vedle průměrného čerpání, 2024"/);
  assert.match(h, /data-zpv-csv/);
});

test('A7.2: hodnoty 2024 — programy na pojištěnce, plnění plánu, zůstatek na pojištěnce a stropy z pravidel', () => {
  const t = buildVyuziti(F, R, B);
  assert.equal(t.rok, 2024);
  const by = Object.fromEntries(t.radky.map((x) => [x.zkratka, x]));
  assert.equal(by['ZP MV ČR'].programy, 322.73);
  assert.equal(by.RBP.programy, 82.47);
  assert.ok(Math.abs(by['VZP ČR'].plneni - 129.9389) < 1e-6);
  assert.ok(Math.abs(by['ZPŠ'].plneni - 91.5825) < 1e-6);
  assert.equal(Math.round(by['ČPZP'].zustatek), 1109);
  assert.equal(Math.round(by.OZP.zustatek), 1178);
  assert.match(by['ČPZP'].dospely, /^1\s000 Kč$/);
  assert.match(by['ČPZP'].dite, /^1\s500 Kč$/);
  assert.equal(by['VZP ČR'].dospely, 'bez souhrnného stropu');
  assert.match(by.OZP.dospely, /^10\s000 Kč \(jen část\)$/);
  assert.equal(by['ZPŠ'].dospely, null, 'ZPŠ strop nedohledán, tabulka ukáže pomlčku');
});

test('A7.2: počet příspěvků na 100 pojištěnců má jen ZPŠ (s poznámkou „příspěvky, ne osoby“), ostatní „neuvádí“', () => {
  const t = buildVyuziti(F, R, B);
  const s = t.radky.filter((x) => x.prispevku100 != null);
  assert.deepEqual(s.map((x) => x.zkratka), ['ZPŠ']);
  const zps = B.pojistovny.find((z) => z.kod === '209').roky['2024'].vyuziti.pocet_prispevku.hodnota;
  const poj = R.pojistovny.find((z) => z.kod === '209').rady.pojistenci_prumer['2024'].hodnota;
  assert.ok(Math.abs(s[0].prispevku100 - (zps / poj) * 100) < 1e-9);
  const r = rows(vyuzitiHtml(F, R, B));
  const zpsRow = r.find((x) => x.kod === '209').html;
  assert.match(zpsRow, /59<small>příspěvky, ne osoby<\/small>/);
  for (const x of r.filter((y) => y.kod !== '209')) {
    assert.match(x.html, /<span class="zpc-na">neuvádí<\/span>/, x.kod);
    assert.doesNotMatch(x.html, /příspěvky, ne osoby/, x.kod);
  }
});

test('A7.2: text vysvětluje strop vs. průměr, odkazuje na explainer a neobsahuje pořadí, žebříček ani štědrost', () => {
  const h = vyuzitiHtml(F, R, B);
  assert.match(h, /horní mez pro jednoho pojištěnce/);
  assert.match(h, /včetně těch, kteří z fondu nečerpají/);
  assert.match(h, /href="jak-funguje\.html\?id=fond_prevence"/);
  assert.doesNotMatch(h, /pořadí|žebříček|štědr|nejlepší|nejhorší/i);
});

test('A7.2: bez dat nebo bez bilance se sekce nehroutí', () => {
  assert.match(vyuzitiHtml(F, null, B), /zatím není k dispozici/);
  assert.match(vyuzitiHtml({ pojistovny: [] }, R, B), /zatím není k dispozici/);
  const bez = vyuzitiHtml(F, R, null);
  assert.equal(rows(bez).length, 7);
  assert.doesNotMatch(bez, /příspěvky, ne osoby/);
});

test('A7.2: stránka Prevence má kontejner sekce za pravidly fondu a explainer fond_prevence nese odstavec „nárok vs. průměr“', () => {
  assert.match(html, /id="zpFpPravidla"[\s\S]*id="kolik-z-fondu"[\s\S]*Kolik z fondu doopravdy dostanete[\s\S]*id="zpFpVyuziti"/);
  const e = json('explainers.json').explainers.find((x) => x.id === 'fond_prevence');
  assert.ok(e.key_facts.some((k) => k.label === 'Nárok vs. průměr' && /horní mez/.test(k.value)));
  assert.match(e.tldr_public, /průměr přes všechny pojištěnce včetně těch, kteří nečerpají/);
});
