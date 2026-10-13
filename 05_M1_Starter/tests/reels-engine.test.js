// Animované příspěvky s Kompíkem (social/reels/): scénáře, poctivost obrazu, brand, render.
// Skill: .claude/skills/animovane-prispevky/SKILL.md

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { compile, frameSvg, audioTrack, validate } from '../social/reels/lib/styles.js';
import { parseValue } from '../social/reels/lib/facts.js';
import { chunkWords } from '../social/reels/lib/florence-scene.js';
import { florence, MOODS as F_MOODS, GESTURES_F } from '../social/reels/characters/florence.js';
import { parseLine as parseLine2 } from '../social/reels/lib/speech.js';
import { schedule, syllables, parseLine } from '../social/reels/lib/speech.js';
import { kompik } from '../social/reels/characters/kompik.js';
import { person, ROLES } from '../social/reels/characters/cast.js';
import { C } from '../social/reels/lib/palette.js';
import { RESVG_FONT } from '../social/reels/lib/text.js';
import { SR } from '../social/reels/lib/audio.js';
import { FORMATS } from '../social/reels/lib/format.js';
import { dims } from '../social/reels/lib/styles.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = resolve(ROOT, 'social/reels/scripts');
const scripts = readdirSync(SCRIPTS).filter(f => f.endsWith('.json')).map(f => ({ f, s: JSON.parse(readFileSync(resolve(SCRIPTS, f), 'utf8')) }));
const kompikScripts = scripts.filter(x => !x.s.style || x.s.style === 'kompik');
const florenceScripts = scripts.filter(x => x.s.style === 'florence');

const plain = html => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1');

test('reels: aspoň jeden scénář existuje a všechny projdou validací', () => {
  assert.ok(scripts.length >= 1);
  for (const { f, s } of scripts) {
    const { errors, duration } = validate(s);
    assert.deepEqual(errors, [], `${f}: ${errors.join('; ')}`);
    const max = FORMATS[s.format || 'portrait'].maxDur;
    assert.ok(duration >= 8 && duration <= max, `${f}: délka ${duration} (max ${max} pro ${s.format || 'portrait'})`);
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
  const base = JSON.parse(JSON.stringify(kompikScripts[0].s));
  const g = base.beats.find(b => b.type === 'group');
  g.count = Math.round(parseValue(g.value) * 2);
  assert.ok(validate(base).errors.some(e => e.includes('obraz by klamal')));
  const noSrc = JSON.parse(JSON.stringify(kompikScripts[0].s));
  delete noSrc.source_line;
  assert.ok(validate(noSrc).errors.some(e => e.includes('source_line')));
  const long = JSON.parse(JSON.stringify(kompikScripts[0].s));
  long.beats[0].dur = 30;
  assert.ok(validate(long).errors.some(e => e.includes('> 20')));
  const frac = JSON.parse(JSON.stringify(kompikScripts[0].s));
  frac.beats.find(b => b.type === 'group').count = 16.1;
  assert.ok(validate(frac).errors.some(e => e.includes('celé číslo')), 'neceločíselný count');
  const undeclared = JSON.parse(JSON.stringify(kompikScripts[0].s));
  undeclared.beats[0].line = 'Úspěšnost je 99 %.';
  assert.ok(validate(undeclared).errors.some(e => e.includes('„99"')), 'číslo bez faktu v replice');
  const declared = JSON.parse(JSON.stringify(kompikScripts[0].s));
  declared.beats[0].line = 'Jen 16,1 na 100 000?';
  assert.ok(!validate(declared).errors.some(e => e.includes('není hodnota')), 'hodnota faktu a číslo z citace projdou');
  const noOutro = JSON.parse(JSON.stringify(kompikScripts[0].s));
  noOutro.beats.pop();
  assert.ok(validate(noOutro).errors.some(e => e.includes('outro')));
});

test('reels: červená (#B8361E) je jen na hrotu střelky a v miniznačce kompasu', () => {
  for (const [name, col] of Object.entries(C)) {
    if (name !== 'needle') assert.notEqual(col.toUpperCase(), C.needle.toUpperCase(), `paleta ${name}`);
  }
  for (const r of Object.keys(ROLES)) assert.ok(!person({ role: r }).toUpperCase().includes(C.needle.toUpperCase()), `role ${r} nese červenou`);
  assert.equal((kompik({}).svg.match(new RegExp(C.needle, 'gi')) || []).length, 1, 'Kompík má červenou jen na střelce');
  const tl = compile(kompikScripts[0].s);
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
  const tl = compile(kompikScripts[0].s);
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

test('florence: postava nese odznak AI a žádnou červenou střelky', () => {
  for (const mood of F_MOODS) for (const gesture of GESTURES_F) {
    const svg = florence({ mood, gesture }).svg;
    assert.ok(svg.includes('>AI</text>'), `${mood}/${gesture}: chybí odznak AI`);
    assert.ok(!svg.toUpperCase().includes(C.needle.toUpperCase()), `${mood}/${gesture}: nese červenou střelky`);
  }
});

test('florence: titulky nerozdělí „0,3 %" a předložky, kousky ≤ 3 slova', () => {
  const ch = chunkWords(parseLine2('A že péči nedostali, hlásí jen *0,3 %* lidí.')).map(c => c.map(w => w.text).join(' '));
  assert.ok(ch.some(c => c.includes('0,3 %')), ch.join(' | '));
  assert.ok(ch.every(c => c.split(' ').length <= 4), ch.join(' | '));
});

test('florence: scénáře mají háček, outro a AI označení na každém snímku', () => {
  assert.ok(florenceScripts.length >= 1);
  for (const { f, s } of florenceScripts) {
    const tl = compile(s);
    for (let t = 0; t < tl.duration; t += 0.5) {
      const svg = frameSvg(tl, t);
      assert.ok(svg.includes('FLORENCE · AI AUTORKA'), `${f} t=${t}: chybí AI označení`);
    }
    const bad = JSON.parse(JSON.stringify(s));
    bad.beats.shift();
    assert.ok(validate(bad).errors.some(e => e.includes('hook')), `${f}: validátor nevyžaduje hook`);
    const nofact = JSON.parse(JSON.stringify(s));
    const nb = nofact.beats.find(b => b.type === 'number');
    if (nb) { nb.fact = 'neexistuje'; assert.ok(validate(nofact).errors.some(e => e.includes('fakt'))); }
  }
});

test('styly: neznámý styl validátor odmítne', () => {
  assert.ok(validate({ ...kompikScripts[0].s, style: 'xyz' }).errors.length > 0);
});

test('formát na šířku: 1920×1080, delší limit, tabule a kroky se vykreslí', () => {
  const land = scripts.filter(x => x.s.format === 'landscape');
  assert.ok(land.length >= 2, 'aspoň jedno video na šířku pro Kompíka i Florence');
  for (const { f, s } of land) {
    const tl = compile(s);
    assert.deepEqual(dims(tl), { W: 1920, H: 1080 }, f);
    for (let t = 0; t < tl.duration; t += 0.9) {
      const svg = frameSvg(tl, t);
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"'), `${f} t=${t}`);
    }
  }
  // portrait zůstává 1080×1920 a 20 s
  assert.deepEqual(dims(kompikScripts[0].s), { W: 1080, H: 1920 });
  const long = JSON.parse(JSON.stringify(land.find(x => !x.s.style).s));
  long.beats[0].dur += 30;
  assert.ok(validate(long).errors.some(e => e.includes('> 40')), 'landscape má strop 40 s');
});

test('tabule (board): verdikty, překryv s razítkem a doložení čísel hlídá validátor', () => {
  const base = scripts.find(x => x.s.format === 'landscape' && !x.s.style).s;
  const over = JSON.parse(JSON.stringify(base));
  over.beats.find(b => b.type === 'board').items[0].text = 'Velmi dlouhý text položky tabule';
  assert.ok(validate(over).errors.some(e => e.includes('překryla') || e.includes('32 znaků')));
  const bad = JSON.parse(JSON.stringify(base));
  bad.beats.find(b => b.type === 'board').items[0].verdict = 'mozna';
  assert.ok(validate(bad).errors.some(e => e.includes('verdict')));
  const num = JSON.parse(JSON.stringify(base));
  num.beats.find(b => b.type === 'board').items[0].stamp = '500 Kč';
  assert.ok(validate(num).errors.some(e => e.includes('„500"')), 'číslo na razítku musí mít fakt');
  const nobasis = JSON.parse(JSON.stringify(base));
  delete nobasis.beats.find(b => b.type === 'board').items[0].basis;
  assert.ok(validate(nobasis).errors.some(e => e.includes('basis')));
});

test('kroky (step) Florence: titulek, základ a čísla jen z faktů', () => {
  const base = scripts.find(x => x.s.format === 'landscape' && x.s.style === 'florence').s;
  const step = b => b.type === 'step';
  const noBasis = JSON.parse(JSON.stringify(base));
  delete noBasis.beats.find(step).basis;
  assert.ok(validate(noBasis).errors.some(e => e.includes('basis')));
  const num = JSON.parse(JSON.stringify(base));
  num.beats.find(step).title = 'Stížnost do 15 dnů';
  assert.ok(validate(num).errors.some(e => e.includes('„15"')));
  const many = JSON.parse(JSON.stringify(base));
  const st = many.beats.find(step);
  for (let i = 0; i < 3; i++) many.beats.splice(2, 0, { ...st });
  assert.ok(validate(many).errors.some(e => e.includes('kroků') || e.includes('překryly')));
});

test('hlas (ElevenLabs) jen na šířku, s označením a s řečí, která se vejde do beatu', () => {
  const voiced = scripts.filter(x => x.s.beats.some(b => b.voice));
  for (const { f, s } of voiced) {
    assert.equal(s.format, 'landscape', `${f}: hlas jen u webových videí na šířku`);
    assert.ok(s.voice_credit && /ElevenLabs/.test(s.voice_credit), `${f}: chybí voice_credit`);
    for (const b of s.beats.filter(x => x.voice)) assert.ok(existsSync(resolve(ROOT, b.voice)), `${f}: chybí ${b.voice}`);
    const tl = compile(s);
    const out = tl.beats.find(b => b.type === 'outro');
    assert.ok(frameSvg(tl, out.t0 + 1.2).includes('hlas: '), `${f}: koncová karta neoznačuje hlas`);
    const a = audioTrack(tl);
    assert.ok(Math.abs(a.length / SR - (tl.duration + 0.3)) < 0.05);
  }
  if (voiced.length) {
    const port = JSON.parse(JSON.stringify(voiced[0].s));
    delete port.format;
    assert.ok(validate(port).errors.some(e => e.includes('jen u videí na šířku')));
    const nocredit = JSON.parse(JSON.stringify(voiced[0].s));
    delete nocredit.voice_credit;
    assert.ok(validate(nocredit).errors.some(e => e.includes('voice_credit')));
    const short = JSON.parse(JSON.stringify(voiced[0].s));
    short.beats.find(b => b.voice).dur = 0.8;
    assert.ok(validate(short).errors.some(e => e.includes('hlas')));
  }
});
