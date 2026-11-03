// Testy A6.2: data/pojistovny-fond-pravidla.json, validátor a renderer sekce „Pravidla fondu“ na stránce Prevence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFondPravidla, PODMINKY, KODY_ZP } from '../ingest/lib/validate-fond-pravidla.js';
import { validateAll, loadDatasets } from '../ingest/validate-pojistovny.js';
import { buildPravidlaMatrix, pravidlaHtml, buildKontroly, buildLimity, limityHtml, stropText, PRAVIDLA_MATICE, lhutaText } from '../src/pojistovny-prevence.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/pojistovny-fond-pravidla.json'), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

test('skutečný soubor projde validátorem bez chyb', () => {
  const r = validateFondPravidla(real());
  assert.deepEqual(r.errors, []);
});

test('7 pojišťoven × 9 podmínek, každá neprázdná položka má citaci, https url a datum', () => {
  const D = real();
  assert.deepEqual(D.pojistovny.map((p) => p.kod), KODY_ZP);
  for (const p of D.pojistovny) {
    assert.deepEqual(Object.keys(p.podminky), PODMINKY);
    for (const [id, b] of Object.entries(p.podminky)) {
      if (b.stav === null) { assert.ok(b.poznamka, `${p.kod}.${id}`); continue; }
      assert.ok(b.citace && /^https:\/\//.test(b.url) && /^\d{4}-\d{2}-\d{2}$/.test(b.overeno_at), `${p.kod}.${id}`);
    }
  }
});

test('všech sedm pojišťoven vylučuje pojištěnce s přihláškou k jiné ZP (zjištění, na kterém stojí sekce)', () => {
  for (const p of real().pojistovny) assert.equal(p.podminky.bez_preregistrace.stav, 'ano', p.kod);
});

test('soubor neobsahuje jména osob ani tituly', () => {
  const txt = JSON.stringify(real());
  assert.doesNotMatch(txt, /Ing\.|MUDr\.|Mgr\.|JUDr\.|RNDr\./);
  assert.doesNotMatch(txt, /Štein|Stárek|Diessl|Sixtov|Mazurov|Kalivoda|Pýchov/);
});

test('rozbitá kopie hlásí chyby', () => {
  const fails = (mut, re) => { const d = clone(real()); mut(d); assert.match(validateFondPravidla(d).errors.join('\n'), re); };
  fails((d) => { d.pojistovny[0].podminky.bez_dluhu.stav = 'asi'; }, /bez_dluhu\.stav/);
  fails((d) => { d.pojistovny[0].podminky.bez_dluhu.url = 'http://x.cz'; }, /url: musí začínat https/);
  fails((d) => { d.pojistovny[0].podminky.bez_dluhu.overeno_at = '3.11.2026'; }, /overeno_at/);
  fails((d) => { delete d.pojistovny[0].podminky.bez_dluhu.citace; }, /citace/);
  fails((d) => { d.pojistovny[0].podminky.bez_dluhu.hodnota = 5; }, /hodnota: u této podmínky/);
  fails((d) => { d.pojistovny[0].podminky.registrace_trva = { stav: null }; }, /vyžaduje poznámku/);
  fails((d) => { d.pojistovny.pop(); }, /musí být 7 pojišťoven/);
  fails((d) => { d.pojistovny[5].kontroly[0].url = 'ftp://x'; }, /kontroly\[0\]\.url/);
  fails((d) => { d.pojistovny[5].kontroly[0].organ = 'Policie'; }, /organ/);
  fails((d) => { d.pojistovny[5].kontroly[0].zjisteni = []; }, /zjisteni/);
  fails((d) => { d.pojistovny[5].kontroly[0].zjisteni[0] = 'Zjistil to Ing. Novák'; }, /jméno nebo oslovení/);
  fails((d) => { d.pojistovny[1].kontroly[0].reakce = 'Řekla paní Nováková'; }, /jméno nebo oslovení/);
  fails((d) => { d.podminky.pop(); }, /podminky: musí být/);
  assert.ok(validateFondPravidla(null).errors.length);
});

test('validateAll s reálnými datasety bere fond-pravidla jako volitelný dataset', () => {
  const s = loadDatasets();
  assert.ok(s.fondPravidla);
  assert.deepEqual(validateAll(s).errors, []);
  const bad = clone(s);
  bad.fondPravidla.pojistovny[0].podminky.bez_dluhu.stav = 'asi';
  assert.match(validateAll(bad).errors.join('\n'), /bez_dluhu\.stav/);
});

test('renderer: matice má 7 řádků, neutrální tón a žádné jméno osoby', () => {
  const f = real();
  const m = buildPravidlaMatrix(f);
  assert.equal(m.rows.length, 7);
  assert.equal(m.cols.length, PRAVIDLA_MATICE.length);
  const html = pravidlaHtml(f);
  assert.match(html, /data-tone="neutral"/);
  assert.equal((html.match(/<tr data-zp="\d{3}"><th scope="row"><span class="zpv-rowlab">/g) || []).length, 7);
  assert.match(html, /nedohledáno/);
  assert.doesNotMatch(html, /Ing\.|MUDr\.|Mgr\./);
  assert.doesNotMatch(html, /Štein|Stárek|Diessl|Sixtov/);
});

test('renderer: kontroly seřazené od nejnovějších, všechny mají odkaz; tabulka limitů má 7 řádků a CSV tlačítko', () => {
  const f = real();
  const ks = buildKontroly(f);
  assert.ok(ks.length >= 10);
  for (let i = 1; i < ks.length; i++) assert.ok(ks[i - 1].rok_kontroly >= ks[i].rok_kontroly);
  const html = pravidlaHtml(f);
  assert.equal((html.match(/class="zpc-kr"/g) || []).length, ks.length);
  assert.equal((html.match(/zpc-kr-zdroj"><a href="https:/g) || []).length, ks.length);
  assert.match(html, /data-zpv-csv/);
  assert.equal(buildLimity(f).length, 7);
});

test('stropText: ne, částka, jiný limit, null', () => {
  assert.equal(stropText({ stav: 'ne' }), 'bez souhrnného stropu');
  assert.match(stropText({ stav: 'ano', hodnota: 1500 }), /1\s500 Kč/);
  assert.match(stropText({ stav: 'castecne' }), /jiný limit/);
  assert.equal(stropText({ stav: null }), null);
  assert.equal(stropText(undefined), null);
});

test('stránka Prevence odkazuje na explainer fond_prevence a ten existuje', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pojistovny-prevence.html'), 'utf8');
  assert.match(html, /id="zpFpPravidla"/);
  assert.match(html, /href="jak-funguje\.html\?id=fond_prevence"/);
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/explainers.json'), 'utf8')).explainers;
  assert.ok(ex.some((e) => e.id === 'fond_prevence'));
});

test('lhůta podání drží jednotku pojišťovny: měsíce zůstávají měsíce, dny dny (Codex, PR #1372)', () => {
  const f = real();
  const lhuty = Object.fromEntries(f.pojistovny.map((z) => [z.zkratka, z.podminky.lhuta_podani_dni]));
  assert.equal(lhutaText(lhuty['VoZP']), '90 dní', 'VoZP uvádí 90 dnů');
  assert.equal(lhutaText(lhuty['VZP ČR']), '3 měsíce', 'VZP uvádí 3 měsíce, ne 90 dní');
  for (const z of f.pojistovny) {
    const c = z.podminky.lhuta_podani_dni;
    assert.ok(['dni', 'mesice'].includes(c.jednotka), `${z.zkratka}: jednotka`);
    assert.doesNotMatch(c.poznamka || '', /zapsáno jako 90 dní/, `${z.zkratka}: žádný přepočet měsíců na dny`);
    if (/měsíc/.test(c.citace)) assert.equal(c.jednotka, 'mesice', `${z.zkratka}: citace mluví o měsících`);
  }
  assert.equal(lhutaText({ stav: 'ano', hodnota: 1, jednotka: 'mesice' }), '1 měsíc');
  assert.equal(lhutaText({ stav: 'ano', hodnota: 6, jednotka: 'mesice' }), '6 měsíců');
  assert.equal(lhutaText({ stav: 'ano', hodnota: 30, jednotka: 'dni' }), '30 dní');
  assert.equal(lhutaText({ stav: null }), null);
  const html = limityHtml(f);
  assert.match(html, /3 měsíce/);
  assert.match(html, /90 dní/);
  // validátor: neznámá jednotka a jednotka mimo lhůtu jsou chyby
  const kopie = structuredClone(f);
  kopie.pojistovny[0].podminky.lhuta_podani_dni.jednotka = 'tydny';
  kopie.pojistovny[1].podminky.strop_dospely_kc.jednotka = 'dni';
  const v = validateFondPravidla(kopie);
  assert.ok(v.errors.some((e) => /jednotka: dni \| mesice/.test(e)), v.errors.join('\n'));
  assert.ok(v.errors.some((e) => /jednotka: uvádí se jen u lhůty/.test(e)), v.errors.join('\n'));
});
