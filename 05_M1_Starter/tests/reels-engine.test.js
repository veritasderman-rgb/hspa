// Animované příspěvky s Kompíkem (social/reels/): scénáře, poctivost obrazu, brand, render.
// Skill: .claude/skills/animovane-prispevky/SKILL.md

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { compile, frameSvg, audioTrack, validate, parseValue } from '../social/reels/lib/scene.js';
import { schedule, syllables, parseLine } from '../social/reels/lib/speech.js';
import { kompik } from '../social/reels/characters/kompik.js';
import { person, ROLES } from '../social/reels/characters/cast.js';
import { C } from '../social/reels/lib/palette.js';
import { RESVG_FONT } from '../social/reels/lib/text.js';
import { SR } from '../social/reels/lib/audio.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = resolve(ROOT, 'social/reels/scripts');
const scripts = readdirSync(SCRIPTS).filter(f => f.endsWith('.json')).map(f => ({ f, s: JSON.parse(readFileSync(resolve(SCRIPTS, f), 'utf8')) }));

const plain = html => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1');

test('reels: aspoň jeden scénář existuje a všechny projdou validací', () => {
  assert.ok(scripts.length >= 1);
  for (const { f, s } of scripts) {
    const { errors, duration } = validate(s);
    assert.deepEqual(errors, [], `${f}: ${errors.join('; ')}`);
    assert.ok(duration >= 8 && duration <= 20, `${f}: délka ${duration}`);
    assert.equal(s.slug, f.replace(/\.json$/, ''), `${f}: slug musí odpovídat názvu souboru`);
  }
});

test('reels: každý fakt je doslovně doložen v textu článku (žádná čísla z paměti)', () => {
  for (const { f, s } of scripts) {
    const path = resolve(ROOT, s.article);
    assert.ok(existsSync(path), `${f}: článek ${s.article} neexistuje`);
    const text = plain(readFileSync(path, 'utf8'));
    for (const fact of s.facts) {
      assert.ok(text.includes(plain(fact.quote)), `${f}: citace faktu „${fact.id}" není v článku: ${fact.quote}`);
      assert.ok(fact.quote.includes(fact.value), `${f}: citace faktu „${fact.id}" neobsahuje hodnotu ${fact.value}`);
    }
  }
});

test('reels: validátor odmítne klamavý počet postaviček a chybějící zdroj', () => {
  const base = JSON.parse(JSON.stringify(scripts[0].s));
  const g = base.beats.find(b => b.type === 'group');
  g.count = Math.round(parseValue(g.value) * 2);
  assert.ok(validate(base).errors.some(e => e.includes('obraz by klamal')));
  const noSrc = JSON.parse(JSON.stringify(scripts[0].s));
  delete noSrc.source_line;
  assert.ok(validate(noSrc).errors.some(e => e.includes('source_line')));
  const long = JSON.parse(JSON.stringify(scripts[0].s));
  long.beats[0].dur = 30;
  assert.ok(validate(long).errors.some(e => e.includes('> 20')));
  const noOutro = JSON.parse(JSON.stringify(scripts[0].s));
  noOutro.beats.pop();
  assert.ok(validate(noOutro).errors.some(e => e.includes('outro')));
});

test('reels: červená (#B8361E) je jen na hrotu střelky a v miniznačce kompasu', () => {
  for (const [name, col] of Object.entries(C)) {
    if (name !== 'needle') assert.notEqual(col.toUpperCase(), C.needle.toUpperCase(), `paleta ${name}`);
  }
  for (const r of Object.keys(ROLES)) assert.ok(!person({ role: r }).toUpperCase().includes(C.needle.toUpperCase()), `role ${r} nese červenou`);
  assert.equal((kompik({}).svg.match(new RegExp(C.needle, 'gi')) || []).length, 1, 'Kompík má červenou jen na střelce');
  const tl = compile(scripts[0].s);
  for (const t of [0.5, 4, 9, 12.9]) {
    const n = (frameSvg(tl, t).match(new RegExp(C.needle, 'gi')) || []).length;
    // 1× střelka Kompíka + 1× značka v odznaku série (+ 1× v logu koncové karty)
    assert.ok(n >= 2 && n <= 3, `t=${t}: ${n} výskytů červené`);
  }
});

test('reels: řeč — slabiky, zvýraznění, rozvrh', () => {
  assert.equal(syllables('šestnáct'), 2);
  assert.equal(syllables('polovina'), 4);
  assert.equal(syllables('vlk'), 1);
  const w = parseLine('Jen *méně než polovina*.');
  assert.deepEqual(w.map(x => x.emph), [false, true, true, true]);
  const sc = schedule('Kolik sester?', 1);
  assert.ok(sc.syl.length >= 4 && sc.end > 1.4);
  assert.ok(sc.syl.at(-1).q, 'otázka stoupá');
});

test('reels: snímek se vykreslí (resvg) a zvuková stopa má správnou délku', () => {
  const tl = compile(scripts[0].s);
  const png = new Resvg(frameSvg(tl, 9.8), { font: RESVG_FONT, fitTo: { mode: 'width', value: 270 } }).render().asPng();
  assert.ok(png.length > 2000);
  const a = audioTrack(tl);
  assert.ok(Math.abs(a.length / SR - (tl.duration + 0.3)) < 0.05);
  assert.ok(a.some(v => Math.abs(v) > 0.05), 'stopa není tichá');
});

test('reels: všechny typy beatů, emoce a gesta se vykreslí bez chyby', () => {
  const s = {
    slug: 'test', article: 'x.html', source_line: 'Zdroj: test', footnote: 'test',
    facts: [{ id: 'a', value: '10', source: 's', quote: 'q 10' }],
    beats: [
      { type: 'intro', dur: 2, emotion: 'curious', line: 'Ahoj?' },
      { type: 'say', dur: 1.5, emotion: 'skeptic', gesture: 'shrug', line: 'Hm.' },
      { type: 'say', dur: 1.5, emotion: 'proud', gesture: 'think', line: 'Aha.' },
      { type: 'group', dur: 2, emotion: 'happy', fact: 'a', role: 'senior', count: 10, value: '10', side: 'center', label: 'x', line: 'Deset.' },
      { type: 'punch', dur: 1.5, emotion: 'happy', tone: 'good', text: 'Super', basis: 'x', line: 'Jo!' },
      { type: 'outro', dur: 1.5 },
    ],
  };
  assert.deepEqual(validate(s).errors, []);
  const tl = compile(s);
  for (let t = 0; t < tl.duration; t += 0.37) assert.ok(frameSvg(tl, t).startsWith('<svg'));
});
