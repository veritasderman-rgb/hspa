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
import { FORMATS, maxDurOf } from '../social/reels/lib/format.js';
import { GUESTS } from '../social/reels/lib/scene.js';
import { dims } from '../social/reels/lib/styles.js';
import { spawnSync } from 'node:child_process';
import { loadVoice, hasFfmpeg, timingPath } from '../social/reels/lib/voice.js';

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
    const max = maxDurOf(s);
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
  long.beats[0].dur += 70;
  assert.ok(validate(long).errors.some(e => e.includes('> 90')), 'mluvené video na šířku má strop 90 s');
  const mute = JSON.parse(JSON.stringify(kompikScripts.find(x => !x.s.beats.some(b => b.voice)).s));
  mute.beats[0].dur += 20;
  assert.ok(validate(mute).errors.some(e => e.includes('> 20')), 'němé video na výšku má dál strop 20 s');
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

test('hlas (ElevenLabs): označení na kartě, řeč se vejde do beatu, celé video mluví', () => {
  const voiced = scripts.filter(x => x.s.beats.some(b => b.voice));
  assert.ok(voiced.some(x => (x.s.format || 'portrait') === 'portrait'), 'aspoň jedno mluvené video na výšku');
  for (const { f, s } of voiced) {
    assert.ok(s.voice_credit && /ElevenLabs/.test(s.voice_credit), `${f}: chybí voice_credit`);
    for (const b of s.beats.filter(x => x.voice)) assert.ok(existsSync(resolve(ROOT, b.voice)), `${f}: chybí ${b.voice}`);
    for (const b of s.beats.filter(x => x.line)) assert.ok(b.voice, `${f}: beat s replikou bez hlasu`);
    if (s.format !== 'landscape') for (const b of s.beats.filter(x => x.voice)) assert.ok(b.spoken, `${f}: chybí spoken`);
    const tl = compile(s);
    const out = tl.beats.find(b => b.type === 'outro');
    assert.ok(frameSvg(tl, out.t0 + 1.2).includes('hlas: '), `${f}: koncová karta neoznačuje hlas`);
    const a = audioTrack(tl);
    assert.ok(Math.abs(a.length / SR - (tl.duration + 0.3)) < 0.05);
  }
  const base = voiced.find(x => x.s.format !== 'landscape').s;
  const clone = () => JSON.parse(JSON.stringify(base));
  const nocredit = clone();
  delete nocredit.voice_credit;
  assert.ok(validate(nocredit).errors.some(e => e.includes('voice_credit')));
  const short = clone();
  short.beats.find(b => b.voice).dur = 0.8;
  assert.ok(validate(short).errors.some(e => e.includes('hlas')));
  const mixed = clone();
  delete mixed.beats[1].voice; delete mixed.beats[1].spoken;
  assert.ok(validate(mixed).errors.some(e => e.includes('nemíchej')), 'mluvené video nesmí míchat hlas a žvatlání');
  const nospoken = clone();
  delete nospoken.beats[0].spoken;
  assert.ok(validate(nospoken).errors.some(e => e.includes('spoken')));
  const num = clone();
  num.beats[0].spoken += ' Je jich 999.';
  assert.ok(validate(num).errors.some(e => e.includes('„999"')), 'číslo v mluveném textu musí mít fakt');
  const long = clone();
  long.beats[0].dur += 30;
  assert.ok(validate(long).errors.some(e => e.includes('> 60')), 'mluvené video na výšku má strop 60 s');
});

test('dialog: host má jmenovku, mluví jen povolené role a obraz se nepřekrývá se skupinami', () => {
  const duo = scripts.filter(x => x.s.beats.some(b => b.speaker));
  assert.ok(duo.length >= 1, 'aspoň jeden scénář s hostem');
  for (const { f, s } of duo) {
    const tl = compile(s);
    assert.ok(tl.guests.length >= 1, f);
    for (const b of tl.beats.filter(x => x.speaker)) {
      assert.ok(GUESTS[b.speaker], `${f}: neznámý host ${b.speaker}`);
      const svg = frameSvg(tl, Math.min(b.t1 - 0.1, b.t0 + 1.2));
      assert.ok(svg.includes(GUESTS[b.speaker].toUpperCase()), `${f}: bublina hosta nemá jmenovku`);
      new Resvg(svg, { font: RESVG_FONT, fitTo: { mode: 'width', value: 270 } }).render();
    }
    // po první skupině je host v rohu a Kompík uprostřed (žádné duo rozestavení)
    const firstGroup = tl.beats.find(b => b.type === 'group');
    if (firstGroup) for (const b of tl.beats.filter(x => x.t0 >= firstGroup.t0)) assert.equal(b.duo, false, f);
  }
  const base = duo[0].s;
  const bad = JSON.parse(JSON.stringify(base));
  bad.beats.find(b => b.speaker).speaker = 'ministr';
  assert.ok(validate(bad).errors.some(e => e.includes('neznámý host')));
  const kid = JSON.parse(JSON.stringify(base));
  kid.beats.find(b => b.speaker).speaker = 'dite';
  assert.ok(validate(kid).errors.some(e => e.includes('neznámý host')), 'dítě v dialogu nemluví');
  const intro = JSON.parse(JSON.stringify(base));
  intro.beats[0].speaker = 'florence';
  assert.ok(validate(intro).errors.some(e => e.includes('speaker')));
  assert.equal(person({ role: 'sestra', talk: 0.8 }).includes('<ellipse cx="0" cy="-130"'), true, 'mluvící postava má otevřenou pusu');
});

test('hudba a efekty ze souboru: cesta, existence a čas v beatu', () => {
  const withAudio = scripts.filter(x => x.s.music || x.s.beats.some(b => b.sfx));
  assert.ok(withAudio.length >= 1);
  const base = withAudio[0].s;
  const miss = JSON.parse(JSON.stringify(base));
  miss.music = 'social/reels/audio/music/neexistuje.mp3';
  assert.ok(validate(miss).errors.some(e => e.includes('neexistuje')));
  const path = JSON.parse(JSON.stringify(base));
  path.music = '../../etc/passwd';
  assert.ok(validate(path).errors.some(e => e.includes('music')));
  const late = JSON.parse(JSON.stringify(base));
  const b = late.beats.find(x => x.sfx) || late.beats[1];
  b.sfx = [{ file: (base.beats.find(x => x.sfx) || {}).sfx?.[0].file || 'social/reels/audio/sfx/record-scratch.mp3', at: 99 }];
  assert.ok(validate(late).errors.some(e => e.includes('`at`')));
});

test('obsazení hlasů: každá mluvící postava má hlas z knihovny nebo navržený, nikdy klon', () => {
  const reg = JSON.parse(readFileSync(resolve(ROOT, 'social/reels/voices.json'), 'utf8'));
  assert.equal(reg.provider, 'ElevenLabs');
  for (const role of ['kompik', ...Object.keys(GUESTS)]) {
    const v = reg.cast[role];
    assert.ok(v, `voices.json: chybí hlas pro „${role}"`);
    assert.match(v.voice_id, /^[A-Za-z0-9]{20}$/, role);
    assert.ok(['library', 'designed'].includes(v.origin), `${role}: origin musí být library nebo designed (žádný klon)`);
    assert.ok(v.voice_name && v.direction, role);
  }
  const ids = Object.values(reg.cast).map(v => v.voice_id);
  assert.equal(new Set(ids).size, ids.length, 'každá postava má vlastní hlas');
  assert.ok(!reg.cast.dite, 'žádný dětský hlas');
});

test('hlas bez ffmpeg: validace a kompilace jedou z timing.json (CI runner ffmpeg nemá)', () => {
  const voiced = scripts.filter(x => x.s.beats.some(b => b.voice));
  for (const { f, s } of voiced) {
    for (const b of s.beats.filter(x => x.voice)) assert.ok(existsSync(timingPath(b.voice)), `${f}: chybí timing.json vedle ${b.voice}`);
  }
  if (!voiced.length) return;
  const r = spawnSync(process.execPath, ['social/reels/render.js', '--check', '--all'], { cwd: ROOT, env: { ...process.env, REELS_NO_FFMPEG: '1' }, encoding: 'utf8' });
  assert.equal(r.status, 0, `validace bez ffmpeg selhala:\n${r.stderr}`);
  // s ffmpeg: manifest musí sedět na skutečnou nahrávku (jinak render.js <slug> --voice-timing)
  if (!hasFfmpeg()) return;
  for (const { f, s } of voiced) {
    for (const b of s.beats.filter(x => x.voice)) {
      const tempo = s.voice_tempo || 1;
      const m = JSON.parse(readFileSync(timingPath(b.voice), 'utf8'))[`${b.voice.split('/').pop()}@${tempo}`];
      const v = loadVoice(b.voice, tempo);
      assert.ok(m, `${f}: ${b.voice} není v timing.json`);
      assert.deepEqual([m.start, m.end, m.dur], [v.start, v.end, v.dur], `${f}: timing.json je zastaralý pro ${b.voice}`);
    }
  }
});
