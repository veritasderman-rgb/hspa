// Testy stránky „Jak se rozhoduje": čisté funkce (sankey, tempo) + drift
// kontrola kurátorského data/rozhodovani.json — hlavně doloženého případu,
// který MUSÍ sedět na reálná data analýzy zápisů (poctivost je závazek).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sankeyData, tempoStats } from '../src/jak-se-rozhoduje.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ROZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'rozhodovani.json'), 'utf8'));

test('rozhodovani: koleje mají kroky a interní odkazy vedou na existující stránky', () => {
  assert.equal(ROZ.koleje.length, 5);
  for (const k of ROZ.koleje) {
    assert.ok(k.nazev && k.otazka && k.kroky.length >= 3, `kolej ${k.id} je neúplná`);
    for (const s of k.kroky) {
      assert.ok(s.role && s.kdo, `kolej ${k.id}: krok bez role/kdo`);
      if (s.url) {
        const file = s.url.split('?')[0];
        assert.ok(fs.existsSync(path.join(ROOT, file)), `kolej ${k.id}: cíl ${file} v repu není`);
      }
    }
  }
});

test('rozhodovani: doložený případ sedí na data analýzy zápisů (drift)', () => {
  const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-analyza', `${ROZ.pripad.g}.json`), 'utf8'));
  for (const o of ROZ.pripad.over) {
    const j = a.jednani.find(x => x.datum === o.jednani);
    assert.ok(j, `případ: jednání ${o.jednani} v analýze není`);
    const u = j.ukoly[o.i];
    assert.ok(u, `případ: úkol ${o.jednani}:${o.i} v analýze není`);
    if (o.stav) assert.equal(u.stav, o.stav, `případ: úkol ${o.jednani}:${o.i} nemá stav ${o.stav}`);
    if (o.sd) assert.equal(u.sd, o.sd, `případ: úkol ${o.jednani}:${o.i} má doklad ${u.sd}, ne ${o.sd}`);
    if (o.ext_nazev_re) {
      assert.match(u.ext?.nazev ?? '', new RegExp(o.ext_nazev_re),
        `případ: úkol ${o.jednani}:${o.i} nemá externí doklad ${o.ext_nazev_re}`);
    }
  }
  // data kroků případu jsou chronologicky vzestupná
  const data = ROZ.pripad.kroky.map(k => k.datum);
  assert.deepEqual(data, [...data].sort(), 'kroky případu nejsou chronologicky');
});

test('rozhodovani: sankey orgány existují v ppo.json', () => {
  const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
  const gids = new Set(ppo.skupiny.map(s => s.id));
  for (const o of ROZ.sankey.organy) {
    for (const g of (o.gs ?? [o.g])) assert.ok(gids.has(g), `sankey: skupina ${g} není v ppo.json`);
  }
});

test('rozhodovani: sankeyData agreguje kategorie a slévá drobné do ostatní', () => {
  const osoby = [
    { kat: 'pojistovna', clenstvi: [{ g: 1 }, { g: 2 }] },
    { kat: 'pojistovna', clenstvi: [{ g: 1 }] },
    { kat: 'odborna_spolecnost', clenstvi: [{ g: 2 }] },
    { kat: 'kraj_obec', clenstvi: [{ g: 9 }] },
  ];
  const d = sankeyData(osoby, [{ g: 1, label: 'A' }, { g: 2, label: 'B' }]);
  assert.equal(d.organy.length, 2);
  assert.equal(d.organy[0].n, 2, 'orgán A má 2 osoby');
  assert.equal(d.kategorie[0].kat, 'pojistovna', 'nejsilnější kategorie první');
  assert.ok(!d.kategorie.some(k => k.kat === 'kraj_obec'), 'osoba mimo orgány do diagramu nepatří');
});

test('rozhodovani: tempoStats počítá medián a koše', () => {
  const den = n => new Date(Date.parse('2025-01-01') + n * 86400000).toISOString().slice(0, 10);
  const ukoly = [10, 50, 84, 120, 400].map(n => ({ stav: 'splneno', datum: '2025-01-01', sd: den(n) }));
  ukoly.push({ stav: 'pokracuje', datum: '2025-01-01', sd: den(5) });
  const t = tempoStats(ukoly);
  assert.equal(t.n, 5, 'jen doložená splnění');
  assert.equal(t.median, 84);
  assert.equal(t.buckets[0].n, 2, 'koš 0–60 dní');
  assert.equal(tempoStats([]), null);
});

test('rozhodovani: stránka existuje, je v navigaci i sitemap', () => {
  const html = fs.readFileSync(path.join(ROOT, 'jak-se-rozhoduje.html'), 'utf8');
  assert.ok(html.includes('src/jak-se-rozhoduje.js'));
  assert.match(html, /name="robots" content="index, follow"/);
  assert.ok(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').includes('/jak-se-rozhoduje'));
  assert.ok(fs.readFileSync(path.join(ROOT, 'src', 'page-shared.js'), 'utf8').includes('jak-se-rozhoduje.html'));
});
