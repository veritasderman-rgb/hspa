// Standardizace indexem nákladovosti kmene z měsíčního přerozdělení MZ (metodika § 4.2):
// ingest/transform_pojistovny_index_prerozdeleni.js + ingest/manual/pojistovny/prerozdeleni-mz.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { median, indexyZRady, aplikujIndex, STAV_INDEX } from '../ingest/transform_pojistovny_index_prerozdeleni.js';
import { validateAll, loadDatasets, STD_STAVY } from '../ingest/validate-pojistovny.js';
import { stdInfo, STD_METODA } from '../src/pojistovny.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8'));
const MZ = read('ingest', 'manual', 'pojistovny', 'prerozdeleni-mz.json');
const P = read('data', 'pojistovny.json');
const KODY = ['111', '201', '205', '207', '209', '211', '213'];

test('prerozdeleni-mz.json: roky 2023–2025, 7 ZP + celkem po 12 měsících, zdroj s URL a datem ověření', () => {
  assert.ok(MZ.zdroj?.url && MZ.zdroj?.overeno && MZ.zdroj?.soubory?.length === 2);
  for (const rok of ['2023', '2024', '2025']) {
    const r = MZ.roky[rok];
    assert.ok(r, rok);
    for (const k of [...KODY, 'celkem']) {
      assert.equal(r[k]?.length, 12, `${rok}/${k}`);
      assert.ok(r[k].every((v) => Number.isInteger(v) && v > 2000 && v < 7000), `${rok}/${k}: hodnoty mimo rozsah`);
    }
  }
  // hodnoty doložené z PDF MZ (prerozdelovani_pojistenec_vysledek_2024_12 / 2026_10)
  assert.equal(MZ.roky['2024']['111'][0], 4173);
  assert.equal(MZ.roky['2024']['213'][9], 2834, 'RBP 10/2024 mimořádné vyúčtování');
  assert.equal(MZ.roky['2024'].celkem[11], 3829);
  assert.equal(MZ.roky['2025']['209'][10], 2722, 'ZPŠ 11/2025');
});

test('median: lichý, sudý, robustní vůči odlehlému měsíci; prázdné pole vyhodí chybu', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 100]), 3600);
  assert.throws(() => median([]), /prázdné/);
});

test('indexyZRady 2024: index = medián ZP / medián celkem, faktor = 1 / index; VZP > 1, ČPZP a OZP < 1', () => {
  const idx = indexyZRady(MZ, 2024);
  assert.deepEqual(Object.keys(idx).sort(), KODY);
  for (const k of KODY) {
    assert.ok(idx[k].index > 0.85 && idx[k].index < 1.15, `${k}: index ${idx[k].index}`);
    assert.ok(Math.abs(idx[k].faktor - 1 / idx[k].index) < 0.0002);
    assert.equal(idx[k].median_cr_kc, 3836.5);
  }
  assert.ok(idx['111'].index > 1.03, 'VZP má nejnákladnější kmen');
  assert.ok(idx['205'].index < 0.93 && idx['207'].index < 0.93, 'ČPZP a OZP nejlevnější kmen');
  // RBP: mimořádný měsíc 10/2024 (2 834) medián neovlivní
  assert.ok(idx['213'].median_kc > 3550);
  assert.throws(() => indexyZRady(MZ, 2019), /chybí rok/);
  const bad = structuredClone(MZ); bad.roky['2024']['201'].pop();
  assert.throws(() => indexyZRady(bad, 2024), /12 měsíců/);
});

test('aplikujIndex: obálky std = základ × faktor, stav index-prerozdeleni, changelog jednou (idempotentní)', () => {
  const base = structuredClone(P);
  for (const z of base.pojistovny) { delete z.hospodareni.index_prerozdeleni; for (const k of ['naklady_na_pojistence_std_kc', 'fond_prevence_na_pojistence_std_kc']) delete z.hospodareni[k]; }
  base.changelog = base.changelog.filter((c) => !/indexem nákladovosti kmene/.test(c.zmena));
  const r1 = aplikujIndex(base, MZ, { dnes: '2026-11-02' });
  assert.equal(r1.zmeneno, true);
  for (const z of r1.data.pojistovny) {
    const h = z.hospodareni;
    assert.equal(h.index_prerozdeleni.rok, 2024);
    assert.equal(h.naklady_na_pojistence_std_kc.stav, STAV_INDEX);
    assert.equal(h.naklady_na_pojistence_std_kc.hodnota, Math.round(h.naklady_na_pojistence_kc.hodnota * h.naklady_na_pojistence_std_kc.faktor));
    assert.ok(Math.abs(1 / h.index_prerozdeleni.hodnota - h.naklady_na_pojistence_std_kc.faktor) < 0.001);
    assert.match(h.naklady_na_pojistence_std_kc.poznamka, /§ 4\.2/);
    assert.match(h.fond_prevence_na_pojistence_std_kc.poznamka, /aproximace/);
  }
  assert.equal(r1.data.changelog.length, base.changelog.length + 1);
  const r2 = aplikujIndex(r1.data, MZ, { dnes: '2026-11-03' });
  assert.equal(r2.zmeneno, false);
  assert.equal(r2.data.changelog.length, r1.data.changelog.length, 'druhý běh nepřidá changelog');
  // VZP: standardizace snižuje, ČPZP zvyšuje; rozptyl standardizovaných nákladů je menší než nestandardizovaných
  const vzp = r1.data.pojistovny.find((z) => z.kod === '111').hospodareni, cpzp = r1.data.pojistovny.find((z) => z.kod === '205').hospodareni;
  assert.ok(vzp.naklady_na_pojistence_std_kc.hodnota < vzp.naklady_na_pojistence_kc.hodnota);
  assert.ok(cpzp.naklady_na_pojistence_std_kc.hodnota > cpzp.naklady_na_pojistence_kc.hodnota);
  const span = (key) => { const v = r1.data.pojistovny.map((z) => z.hospodareni[key].hodnota); return Math.max(...v) - Math.min(...v); };
  assert.ok(span('naklady_na_pojistence_std_kc') < span('naklady_na_pojistence_kc'));
});

test('data/pojistovny.json: stav index-prerozdeleni u všech 7, validátor OK; validátor odhalí hodnotu ≠ základ × faktor a faktor ≠ 1/index', () => {
  for (const z of P.pojistovny) {
    assert.equal(z.hospodareni.naklady_na_pojistence_std_kc?.stav, STAV_INDEX, z.kod);
    assert.ok(z.hospodareni.index_prerozdeleni?.hodnota > 0.5);
  }
  assert.ok(STD_STAVY.includes(STAV_INDEX));
  const ds = loadDatasets();
  assert.deepEqual(validateAll(ds).errors, []);
  const a = structuredClone(ds); a.pojistovny.pojistovny[0].hospodareni.naklady_na_pojistence_std_kc.hodnota += 500;
  assert.ok(validateAll(a).errors.some((e) => /hodnota musí být base × faktor/.test(e)));
  const b = structuredClone(ds); b.pojistovny.pojistovny[0].hospodareni.index_prerozdeleni.hodnota = 1.5;
  assert.ok(validateAll(b).errors.some((e) => /faktor musí být 1 \/ index_prerozdeleni/.test(e)));
  const c = structuredClone(ds); c.pojistovny.pojistovny[0].hospodareni.index_prerozdeleni.hodnota = 3;
  assert.ok(validateAll(c).errors.some((e) => /index 0,5–2/.test(e)));
});

test('frontend stdInfo: index-prerozdeleni je standardizováno s metodou „přerozdělení MZ“', () => {
  const st = stdInfo(P.pojistovny[0].hospodareni);
  assert.equal(st.dolozeno, true);
  assert.equal(st.metoda, STD_METODA['index-prerozdeleni']);
  assert.match(st.metoda, /přerozdělení MZ/);
});
