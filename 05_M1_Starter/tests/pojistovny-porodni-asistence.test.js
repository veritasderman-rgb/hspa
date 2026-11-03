// Per-ZP řez návštěv porodní asistentky (výkon 06211) ve Srovnávači pojišťoven
// (PLAN-PORODNI-ASISTENCE-06211.md § 5.1 D): builder, validátor, karta profilu a stáří dat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPorodniAsistence, serialize, SRC, OUT } from '../ingest/build-pojistovny-porodni-asistence.js';
import { validatePorodniAsistence } from '../ingest/lib/validate-porodni-asistence.js';
import { porodniAsistenceKarta, profilHtml } from '../src/pojistovna.js';
import { stariRadky } from '../src/pojistovny-stari.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const PA = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const copy = (o) => JSON.parse(JSON.stringify(o));
const zp = (kod, D = PA) => D.pojistovny.find((z) => z.kod === kod);

test('builder: commitnutý dataset je totožný s výstupem builderu ze zdroje ÚZIS', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), serialize(buildPorodniAsistence(SOURCE)),
    'spusť node ingest/build-pojistovny-porodni-asistence.js');
  assert.equal(PA.generated_at, `${SOURCE.source.answered}T00:00:00Z`, 'deterministické datum = den vyřízení požadavku');
});

test('hodnoty: Česko 3,0 → 15,0 v hlavním období; pojišťovny podle článků série', () => {
  const iH = PA.obdobi.indexOf(PA.hlavni_obdobi);
  assert.equal(PA.hlavni_obdobi, '2026Q1');
  assert.deepEqual(PA.cr.rada.zeny_na_100_porodu, [3, 3.3, 3.5, 4.3, 15, 20.1]);
  assert.equal(PA.cr.rok_2025.zeny_na_100_porodu, 3.5);
  const q1 = Object.fromEntries(PA.pojistovny.map((z) => [z.kod, z.rada.zeny_na_100_porodu[iH]]));
  assert.deepEqual(q1, { 111: 14, 201: 11.9, 205: 17.3, 207: 17.8, 209: 11.9, 211: 16.8, 213: 16.6 });
  assert.deepEqual(zp('111').rada.icz_921, [7, 9, 9, 10, 20, 39]);
  const praha = zp('111').kraje.find((k) => k.kod === 'CZ010');
  assert.deepEqual([praha.zeny, praha.porody, praha.zeny_na_100_porodu, praha.maly_vzorek], [189, 2181, 8.7, false]);
});

test('nespolehlivé období: jen OZP ve 2. čtvrtletí 2026 (neúplný jmenovatel), hodnota null', () => {
  for (const z of PA.pojistovny) {
    assert.deepEqual(z.nespolehliva_obdobi, z.kod === '207' ? ['2026Q2'] : [], z.kod);
  }
  assert.equal(zp('207').rada.zeny_na_100_porodu[5], null);
  assert.equal(zp('207').rada.porody[5], 452, 'porody zůstávají v datech, jen se z nich nepočítá podíl');
});

test('validátor: commitnutý dataset projde, chyby v datech zachytí', () => {
  const r = validatePorodniAsistence(PA);
  assert.deepEqual(r.errors, []);
  assert.ok(r.checks > 500);

  const spatnaHodnota = copy(PA);
  zp('205', spatnaHodnota).rada.zeny_na_100_porodu[4] = 20;
  assert.ok(validatePorodniAsistence(spatnaHodnota).errors.some((e) => /205 2026Q1/.test(e)));

  const chybiZp = copy(PA);
  chybiZp.pojistovny = chybiZp.pojistovny.filter((z) => z.kod !== '209');
  const e2 = validatePorodniAsistence(chybiZp).errors;
  assert.ok(e2.some((e) => /musí být 7 pojišťoven/.test(e)));

  const nespolehlive = copy(PA);
  zp('207', nespolehlive).rada.zeny_na_100_porodu[5] = 33.4;
  assert.ok(validatePorodniAsistence(nespolehlive).errors.some((e) => /nespolehlivé období/.test(e)));

  const vzorek = copy(PA);
  zp('209', vzorek).kraje[0].maly_vzorek = !zp('209', vzorek).kraje[0].maly_vzorek;
  assert.ok(validatePorodniAsistence(vzorek).errors.some((e) => /maly_vzorek/.test(e)));

  const soucet = copy(PA);
  soucet.cr.rada.porody[0] += 1;
  assert.ok(validatePorodniAsistence(soucet).errors.some((e) => /součet porodů/.test(e)));
});

test('karta profilu: věta, tabulka šesti čtvrtletí, krajský řez; OZP Q2 jako neúplné; bez dat věta', () => {
  for (const kod of ['111', '201', '205', '207', '209', '211', '213']) {
    const h = porodniAsistenceKarta(PA, kod);
    assert.equal((h.match(/<tr><th scope="row" class="zpc-txt">\d\. čtvrtletí 20\d\d/g) || []).length, 6, kod);
    assert.match(h, /indikator-porodni_asistentka_navstevy_porody\.html/);
    assert.match(h, /ne podíl rodiček/);
  }
  const vzp = porodniAsistenceKarta(PA, '111');
  assert.match(vzp, /V 1\. čtvrtletí 2026 připadlo u VZP ČR na 100 porodů 14,0 žen s návštěvou porodní asistentky \(Česko 15,0\)/);
  assert.match(vzp, /Podle kraje poskytovatele, 1\. čtvrtletí 2026/);
  const ozp = porodniAsistenceKarta(PA, '207');
  assert.match(ozp, /neúplné/);
  assert.doesNotMatch(ozp, /33,4/);
  assert.match(porodniAsistenceKarta(PA, '209'), /malý vzorek/);
  assert.match(porodniAsistenceKarta(null, '111'), /zatím nejsou k dispozici/);
  assert.match(porodniAsistenceKarta(PA, '999'), /zatím nejsou k dispozici/);
});

test('profil: karta je v sekci Instituce, když profil dataset načetl', () => {
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8'));
  assert.match(profilHtml('111', { P, PA }), /Návštěvy porodní asistentky po porodu<\/h4><p class="zpc-note">V 1\. čtvrtletí 2026/);
  assert.match(profilHtml('111', { P }), /Návštěvy porodní asistentky po porodu<\/h4><p class="zpc-na">/);
});

test('stáří dat: řádek jen na profilu, období a předběžnost z datasetu', () => {
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8'));
  const r = stariRadky({ pojistovny: P, porodniAsistence: PA }, 'profil').find((x) => x.id === 'porodniAsistence');
  assert.ok(r);
  assert.equal(r.kDatu, 'Q1 2025–Q2 2026');
  assert.match(r.stav, /Q1 2026 a Q2 2026 předběžně/);
  assert.ok(!stariRadky({ pojistovny: P, porodniAsistence: PA }, 'instituce').some((x) => x.id === 'porodniAsistence'));
});
