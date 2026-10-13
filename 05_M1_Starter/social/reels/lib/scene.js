// Scénář → časová osa → snímek (SVG) a zvuková stopa.
//
// Scénář je JSON v social/reels/scripts/<slug>.json, skládá se z „beatů":
//   intro   Kompík vyskočí na scénu a položí háček (otázku / tvrzení)
//   say     Kompík něco řekne s emocí a gestem
//   group   na scénu naskáče skupina postaviček (1 postavička = `per` jednotek)
//           s velkým číslem pod sebou; Kompík na ni ukazuje
//   punch   pointa: plácnutý nápis přes scénu + reakce (zvuk podle tónu)
//   outro   koncová karta: logo, doména, výzva (CTA), zdroj, „animace: AI"
// Formát a pravidla: .claude/skills/animovane-prispevky/references/scenar.md

import { C } from './palette.js';
import { clamp, lerp, prog, ease, tween, keys, squashAt, blink, escapeXml, r1, hash } from './anim.js';
import { schedule, mouthOpen } from './speech.js';
import { measure, wrapWords, balancedWrap, lineWidth } from './text.js';
import { kompik, aimArm, KOMPIK_HEIGHT } from '../characters/kompik.js';
import { person, ROLES } from '../characters/cast.js';
import { track, sfx, babble, music } from './audio.js';
import { parseValue, checkFacts, checkNumbers } from './facts.js';
import { FORMATS, formatName } from './format.js';
import { loadVoice, alignSchedule, voiceStart, mixVoice, duck, voiceMouth, voiceSpeaking } from './voice.js';

export { parseValue };

export const BEAT_TYPES = ['intro', 'say', 'group', 'punch', 'board', 'outro'];
export const VERDICTS = ['ne', 'zalezi', 'ano'];
export const EMOTIONS = ['curious', 'explain', 'worried', 'shocked', 'sad', 'happy', 'proud', 'skeptic'];
export const GESTURES = ['none', 'point-left', 'point-right', 'point-up', 'shrug', 'hands-up', 'wave', 'think'];
export const LIMITS = { minDur: 8, maxDur: 20, maxLine: 70, maxGroup: 40 };

// Rozvržení 9:16 s ohledem na UI Reels/Stories (horních ~220 px a spodních ~360 px
// překrývá rozhraní aplikace; důležité věci drž mezi y 230 a 1560).
const PORTRAIT = {
  W: 1080, H: 1920, cx: 540, cy: 960,
  badgeX: 540, badgeY: 250, kickerY: 318,
  bubbleCX: 540, bubbleTop: 372, bubbleMaxW: 940, bubbleFont: 64, bubbleLH: 80,
  groupBase: 1080, groupColGap: 84, groupRowGap: 60, groupScale: 0.4,
  valueY: 1178, labelY: 1226,
  kompikStage: { x: 540, y: 1490, s: 0.62 },
  kompikHero: { x: 540, y: 1420, s: 0.9 },
  floorY: 1478, ringR: 620,
  punchCX: 540, punchY: 700, punchMaxW: 820,
  outroCX: 540, logoY: 470, ctaY: 700,
  footCX: 540, footY: 1546,   // účaří drobného textu; s dotahy končí nad y 1560
  board: { x: 70, y: 630, w: 940, rowH: 128, font: 50 },
  sideX: { left: 280, right: 800, center: 540 },
  pointL: [200, 900], pointR: [880, 900], pointUp: [760, 300],
};
// Rozvržení 16:9 pro web: Kompík vlevo, tabule / skupiny vpravo, bublina nad Kompíkem.
const LANDSCAPE = {
  W: 1920, H: 1080, cx: 960, cy: 540,
  badgeX: 960, badgeY: 62, kickerY: 120,
  bubbleCX: 500, bubbleTop: 160, bubbleMaxW: 880, bubbleFont: 60, bubbleLH: 74,
  groupBase: 640, groupColGap: 72, groupRowGap: 52, groupScale: 0.34,
  valueY: 740, labelY: 782,
  kompikStage: { x: 470, y: 1000, s: 0.9 },
  kompikHero: { x: 500, y: 1000, s: 0.96 },
  floorY: 985, ringR: 470,
  punchCX: 960, punchY: 470, punchMaxW: 1100,
  outroCX: 1220, logoY: 360, ctaY: 560,
  footCX: 960, footY: 1052,
  board: { x: 940, y: 165, w: 930, rowH: 146, font: 48 },
  sideX: { left: 1100, right: 1560, center: 1330 },
  pointL: [120, 500], pointR: [1500, 500], pointUp: [900, 140],
};
const LAYOUTS = { portrait: PORTRAIT, landscape: LANDSCAPE };
// Geometrie aktuálně kreslené scény. Vše je synchronní, takže stačí přepnout
// na vstupu (compile / frameSvg / validate) podle `script.format`.
let L = PORTRAIT, W = L.W, H = L.H, SIDE_X = L.sideX;
function useFormat(scriptOrTl) {
  L = LAYOUTS[formatName(scriptOrTl)] || PORTRAIT;
  W = L.W; H = L.H; SIDE_X = L.sideX;
}
export { W, H };

const EMO = {
  curious: { needle: 0,   eyes: { mood: 'normal', lookY: -0.5 }, brows: 'up',      mouth: 'o',      arms: [28, 28] },
  explain: { needle: 35,  eyes: { mood: 'normal' },              brows: 'neutral', mouth: 'smile',  arms: [28, 28] },
  worried: { needle: 72,  eyes: { mood: 'normal' },              brows: 'worried', mouth: 'flat',   arms: [18, 18], sweat: true },
  shocked: { needle: 0,   eyes: { mood: 'wide' },                brows: 'up',      mouth: 'o',      arms: [158, 158], shake: true },
  sad:     { needle: 118, eyes: { mood: 'sad', lookY: 0.4 },     brows: 'worried', mouth: 'frown',  arms: [8, 8], lean: 3 },
  happy:   { needle: 35,  eyes: { mood: 'happy' },               brows: 'up',      mouth: 'grin',   arms: [150, 150], wiggle: true },
  proud:   { needle: 35,  eyes: { mood: 'happy' },               brows: 'neutral', mouth: 'smile',  arms: [52, 52], hips: true },
  skeptic: { needle: 58,  eyes: { mood: 'normal', lookX: 0.5 },  brows: 'skeptic', mouth: 'wobble', arms: [28, 28] },
};

function decimals(v) {
  const m = String(v).match(/[.,](\d+)/);
  return m ? m[1].length : 0;
}

function fmtCz(n, dec) {
  return n.toFixed(dec).replace('.', ',');
}

// ───────────────────────────── kompilace ─────────────────────────────

export function compile(script) {
  useFormat(script);
  const beats = [];
  let t = 0;
  for (const b of script.beats) {
    const beat = { ...b, t0: t, t1: t + b.dur };
    const speakAt = t + (b.type === 'intro' ? 0.45 : b.type === 'punch' ? 0.25 : b.type === 'outro' ? 0.55 : 0.2);
    if (b.line) beat.sched = schedule(b.line, speakAt);
    if (b.voice) {
      beat.v = loadVoice(b.voice, script.voice_tempo || 1);
      if (beat.v) { beat.sched = alignSchedule(beat.sched, speakAt, beat.v); beat.voiceAt = voiceStart(speakAt, beat.v); }
    }
    beats.push(beat);
    t += b.dur;
  }
  const duration = t;

  // skupiny postaviček
  const groups = [];
  beats.filter(b => b.type === 'group').forEach((b, gi) => {
    const n = b.count;
    const stagger = Math.min(0.075, 1.25 / n);
    const cx = SIDE_X[b.side || 'center'];
    const cols = b.cols || 5;
    const figs = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const rowCount = Math.min(cols, n - row * cols);
      const off = (cols - rowCount) / 2;   // neúplná řada je vystředěná
      figs.push({
        i, row,
        x: cx + (col + off - (cols - 1) / 2 + (row % 2 ? 0.25 : -0.25)) * L.groupColGap,
        y: L.groupBase - row * L.groupRowGap,
        t: b.t0 + 0.3 + i * stagger,
        seed: hash(`${b.id || gi}-${i}`),
      });
    }
    figs.sort((a, c) => c.row - a.row);   // zadní řady kreslit první
    groups.push({ ...b, cx, figs, top: L.groupBase - (Math.ceil(n / cols) - 1) * L.groupRowGap - 80, countEnd: b.t0 + 0.3 + n * stagger + 0.2 });
  });

  return { script, beats, groups, duration, W, H };
}

function beatAt(tl, t) {
  return tl.beats.find(b => t >= b.t0 && t < b.t1) || tl.beats[tl.beats.length - 1];
}

// ───────────────────────────── Kompík ─────────────────────────────

function emoOf(b) { return EMO[b?.emotion] || (b?.type === 'outro' ? EMO.happy : EMO.explain); }

function stageOf(b) { return (b.type === 'intro' || b.type === 'outro') ? L.kompikHero : L.kompikStage; }

function kompikPose(tl, t) {
  const b = beatAt(tl, t);
  const idx = tl.beats.indexOf(b);
  const prev = tl.beats[idx - 1];
  const e = emoOf(b);
  const pe = prev ? emoOf(prev) : e;

  // pozice: přechod mezi „hero" a „stage" s poskokem
  const to = stageOf(b), from = prev ? stageOf(prev) : to;
  const k = ease.inOut(prog(t, b.t0, b.t0 + 0.42));
  let x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k), s = lerp(from.s, to.s, k);
  if (from !== to) y -= Math.sin(k * Math.PI) * 110;
  let squash = 1;

  if (b.type === 'intro' && idx === 0) {
    // výskok zespodu
    y = keys(t, [[0, H + 360], [0.34, to.y, ease.outBack]]);
    squash = squashAt(t, 0.34, 0.22, 0.42);
  }
  if (from !== to) squash *= squashAt(t, b.t0 + 0.42, 0.14, 0.35);

  // dýchání
  y += Math.sin(t * Math.PI * 2 * 1.1) * 4 * s;
  squash *= 1 + Math.sin(t * Math.PI * 2 * 1.1 + 1) * 0.012;

  // střelka: pružný přechod mezi emocemi
  let needle = lerp(pe.needle, e.needle, ease.outElastic(prog(t, b.t0, b.t0 + 0.8)));
  if (b.type === 'intro' && b.emotion === 'curious') needle += 720 * ease.out(prog(t, b.t0 + 0.3, b.t0 + 1.15));
  if (e.wiggle) needle += Math.sin(t * 9) * 6;
  if (e.shake) needle += Math.sin(t * 55) * 5 * (1 - prog(t, b.t0, b.t0 + 1.2));
  if (b.type === 'outro') needle = lerp(pe.needle, 35, ease.outElastic(prog(t, b.t0 + 0.45, b.t0 + 1.4)));

  // výraz + řeč
  const open = b.v ? voiceMouth(b, t) : mouthOpen(b.sched, t);
  const speaking = b.v ? voiceSpeaking(b, t) : b.sched && t >= b.sched.syl[0]?.t0 && t <= b.sched.end;
  const eyes = { ...e.eyes, blink: blink(t, 7) };
  if (e.shake && t < b.t0 + 0.6) squash *= squashAt(t, b.t0 + 0.05, 0.16, 0.4);

  // ruce: emoce, gesto, ukazování na skupinu
  let armL = { a: e.arms[0], bend: e.hips ? -1.3 : 0.4, len: e.hips ? 92 : undefined };
  let armR = { a: e.arms[1], bend: e.hips ? -1.3 : 0.4, len: e.hips ? 92 : undefined };
  const pose = { x, y, s };
  const target = b.type === 'group' ? tl.groups.find(g => g.t0 === b.t0) : null;
  const point = (side, gx, gy) => ({ a: clamp(aimArm(pose, side, gx, gy), 10, 175), bend: 0, point: true });
  const g = b.gesture;
  if (target) {
    const side = target.cx < x ? -1 : target.cx > x ? 1 : 1;
    const arm = point(side, target.cx, target.top + 40);
    if (side < 0) armL = arm; else armR = arm;
    eyes.lookX = side * 0.8; eyes.lookY = -0.6;
  } else if (b.type === 'board') {
    const bx = L.board.x + L.board.w / 2, side = bx < x ? -1 : 1;
    const arm = point(side, bx, L.board.y + 120);
    if (side < 0) armL = arm; else armR = arm;
    eyes.lookX = side * 0.8; eyes.lookY = -0.4;
  } else if (g === 'point-left') { armL = point(-1, ...L.pointL); eyes.lookX = -0.8; }
  else if (g === 'point-right') { armR = point(1, ...L.pointR); eyes.lookX = 0.8; }
  else if (g === 'point-up') { armR = point(1, ...L.pointUp); eyes.lookY = -0.9; }
  else if (g === 'hands-up') { armL = { a: 160, bend: -0.2 }; armR = { a: 160, bend: -0.2 }; }
  else if (g === 'shrug') { armL = { a: 105, bend: -1.4, len: 100 }; armR = { a: 105, bend: -1.4, len: 100 }; }
  else if (g === 'think') { armR = { a: 168, bend: 1.4, len: 104 }; eyes.lookY = -0.7; eyes.lookX = 0.4; }
  if (b.type === 'outro' || g === 'wave') armR = { a: 150 + Math.sin(t * 11) * 18, bend: -0.3 };

  // náklon
  let lean = e.lean || 0;
  if (speaking) lean += Math.sin(t * 7) * 1.6;
  if (b.type === 'punch') lean += Math.sin(t * 40) * 3 * (1 - prog(t, b.t0 + 0.12, b.t0 + 0.6)) * (t > b.t0 + 0.12 ? 1 : 0);

  return {
    x, y, s, squash, lean, needle, eyes,
    brows: e.brows,
    mouth: { shape: e.mouth, open },
    armL, armR,
    sweat: !!e.sweat && t > b.t0 + 0.3,
    blush: 0.6,
  };
}

// ───────────────────────────── vrstvy scény ─────────────────────────────

function background(t, tl) {
  const rot = r1(t * 3);
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const R = L.ringR, a = (i * 15) * Math.PI / 180, r0 = R - (i % 6 === 0 ? 60 : 30);
    return `<line x1="${r1(Math.sin(a) * r0)}" y1="${r1(-Math.cos(a) * r0)}" x2="${r1(Math.sin(a) * R)}" y2="${r1(-Math.cos(a) * R)}" stroke="${C.sand2}" stroke-width="${i % 6 === 0 ? 10 : 5}" stroke-linecap="round"/>`;
  }).join('');
  const dots = Array.from({ length: 14 }, (_, i) => {
    const rx = (hash(`d${i}`) % 1000) / 1000, ry = (hash(`e${i}`) % 1000) / 1000;
    const yy = ((ry * H - t * (18 + i * 2)) % H + H) % H;
    return `<circle cx="${r1(rx * W)}" cy="${r1(yy)}" r="${4 + (i % 4) * 2}" fill="${C.sand2}"/>`;
  }).join('');
  return `<rect width="${W}" height="${H}" fill="${C.sand}"/>
  ${dots}
  <g transform="translate(${L.cx} ${L.cy}) rotate(${rot})" opacity="0.9"><circle r="${L.ringR}" fill="none" stroke="${C.sand2}" stroke-width="6"/>${ticks}</g>
  <rect x="0" y="${L.floorY}" width="${W}" height="${H - L.floorY}" fill="${C.sand2}"/>
  <rect x="0" y="${L.floorY}" width="${W}" height="8" fill="${C.ink}" opacity="0.08"/>`;
}

function badge(script, t) {
  const k = ease.outBack(prog(t, 0.1, 0.45));
  const text = (script.series || 'Kompík vysvětluje').toUpperCase();
  const fs = 30, w = measure(text, fs, 900) + text.length * 2 + 100;
  const kicker = script.kicker ? escapeXml(script.kicker.toUpperCase()) : '';
  return `<g transform="translate(${L.badgeX} ${L.badgeY}) scale(${r1(k * 100) / 100})">
    <rect x="${r1(-w / 2)}" y="-34" width="${r1(w)}" height="68" rx="34" fill="${C.paper}" stroke="${C.ink}" stroke-width="5"/>
    <g transform="translate(${r1(-w / 2 + 40)} 0) scale(0.3)">${miniCompass()}</g>
    <text x="${r1(-w / 2 + 70)}" y="11" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="2" fill="${C.ink}">${escapeXml(text)}</text>
  </g>
  ${kicker ? `<text x="${L.badgeX}" y="${L.kickerY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="27" letter-spacing="3" fill="${C.inkSoft}" opacity="${r1(prog(t, 0.3, 0.6) * 100) / 100}">${kicker}</text>` : ''}`;
}

/** Značka HSPA Kompas (compass-mark.svg) vystředěná na 0,0, šířka 100. */
function miniCompass(color = C.ink, bg = C.paper) {
  return `<g transform="translate(-50 -50)">
    <circle cx="50" cy="50" r="44" fill="${bg}" stroke="${color}" stroke-width="6"/>
    <polygon points="45,8 55,8 50,16.5" fill="${color}"/>
    <polygon points="33,79.44 55.2,53 44.8,47" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>
    <polygon points="67,20.56 55.2,53 44.8,47" fill="${C.needle}"/>
    <circle cx="50" cy="50" r="4" fill="${bg}" stroke="${color}" stroke-width="4"/>
  </g>`;
}

function bubble(b, t, anchor, { top = L.bubbleTop, tone = 'warn', above = false } = {}) {
  if (!b.sched) return '';
  const tIn = b.sched.syl[0].t0 - 0.12;
  if (t < tIn) return '';
  const fadeOut = 1 - prog(t, b.t1 - 0.12, b.t1);
  const pop = ease.outBack(prog(t, tIn, tIn + 0.2));
  const fs = L.bubbleFont, lh = L.bubbleLH, padX = 44, padY = 30;
  const lines = balancedWrap(b.sched.words, fs, L.bubbleMaxW - padX * 2, 800);
  const wMax = Math.max(...lines.map(lineWidth));
  const bw = wMax + padX * 2, bh = lines.length * lh + padY * 2 - (lh - fs) + 8;
  const bx = L.bubbleCX - bw / 2, by = above ? Math.max(L.bubbleTop, anchor[1] - 110 - bh) : top;
  const emphColor = tone === 'good' ? C.greenDeep : '#B86E00';
  const texts = lines.map((ln, li) => {
    const lx = L.bubbleCX - lineWidth(ln) / 2;
    const yy = by + padY + fs * 0.86 + li * lh;
    return ln.map(wd => {
      const ws = b.sched.wordStart[wd.i];
      const op = clamp((t - ws + 0.02) / 0.08);
      const lift = (1 - ease.out(clamp((t - ws) / 0.15))) * 10;
      if (op <= 0) return '';
      return `<text x="${r1(lx + wd.x)}" y="${r1(yy + lift)}" font-family="Inter" font-weight="800" font-size="${fs}" fill="${wd.emph ? emphColor : C.ink}" opacity="${r1(op * 100) / 100}">${escapeXml(wd.text)}</text>`;
    }).join('');
  }).join('');
  // ocásek k hlavě mluvčího
  const tx = clamp(anchor[0], bx + 80, bx + bw - 80);
  const tailBaseY = by + bh - 6;
  const tipY = Math.min(anchor[1] - 20, tailBaseY + 150);
  const tipX = lerp(tx, anchor[0], 0.6);
  const hasTail = tipY > tailBaseY + 20;
  const tailOuter = hasTail ? `<path d="M${r1(tx - 30)},${r1(tailBaseY)} L${r1(tipX)},${r1(tipY)} L${r1(tx + 30)},${r1(tailBaseY)} Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>` : '';
  const tailCover = hasTail ? `<path d="M${r1(tx - 24)},${r1(tailBaseY - 6)} L${r1(lerp(tipX, tx, 0.12))},${r1(tipY - 14)} L${r1(tx + 24)},${r1(tailBaseY - 6)} Z" fill="${C.paper}"/>` : '';
  const cx = L.bubbleCX, cy = by + bh / 2;
  return `<g opacity="${r1(fadeOut * 100) / 100}" transform="translate(${cx} ${r1(cy)}) scale(${r1(pop * 1000) / 1000}) translate(${-cx} ${r1(-cy)})">
    <rect x="${r1(bx + 8)}" y="${r1(by + 10)}" width="${r1(bw)}" height="${r1(bh)}" rx="40" fill="${C.ink}" opacity="0.12"/>
    ${tailOuter}
    <rect x="${r1(bx)}" y="${r1(by)}" width="${r1(bw)}" height="${r1(bh)}" rx="40" fill="${C.paper}" stroke="${C.ink}" stroke-width="7"/>
    ${tailCover}
    ${texts}
  </g>`;
}

function groupsLayer(tl, t, outroT0) {
  const out = [];
  const leave = outroT0 != null ? ease.in(prog(t, outroT0, outroT0 + 0.35)) : 0;
  for (const g of tl.groups) {
    if (t < g.t0) continue;
    const role = ROLES[g.role] ? g.role : 'pacient';
    const punch = tl.beats.find(b => b.type === 'punch' && t >= b.t0 + 0.12);
    const figs = g.figs.map(f => {
      if (t < f.t) return '';
      const k = prog(t, f.t, f.t + 0.24);
      const hop = (1 - ease.out(k)) * 90 + Math.max(0, Math.sin((t - f.t) * 5 + f.i)) * 4 * (1 - leave);
      const sc = L.groupScale * ease.outBack(k);
      const mood = punch && g.punchMood ? g.punchMood : (g.mood || 'happy');
      return person({ role, x: f.x, y: f.y + leave * 900, opacity: 1 - leave, s: sc, seed: f.seed, hop, blink: blink(t, f.seed % 97), mood, lookX: g.cx < L.cx ? 0.6 : -0.6 });
    }).join('');
    // číslo a popisek
    const v = parseValue(g.value), dec = decimals(g.value);
    const kc = ease.out(prog(t, g.t0 + 0.3, g.countEnd));
    const shown = Number.isFinite(v) ? fmtCz(v * kc, dec) : g.value;
    const lop = clamp((t - g.t0 - 0.25) / 0.2) * (1 - leave);
    const numFs = 96;
    out.push(`<g>${figs}</g>
      <g opacity="${r1(lop * 100) / 100}">
        <text x="${g.cx}" y="${L.valueY}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${numFs}" letter-spacing="-3" fill="${C.ink}">${escapeXml(shown)}</text>
        <text x="${g.cx}" y="${L.labelY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="34" fill="${C.inkSoft}">${escapeXml(g.label || '')}</text>
      </g>`);
  }
  return out.join('');
}

/** Časování tabule: kdy naskočí řádek a kdy na něj dopadne razítko. */
export function boardTimes(b) {
  const n = (b.items || []).length;
  const step = n ? Math.min(0.95, (b.dur - 0.9) / n) : 0;
  return (b.items || []).map((it, k) => {
    // `at` / `stamp_at` (s od začátku beatu) srovnají řádek a razítko s mluveným výčtem
    const row = it.at != null ? b.t0 + it.at : b.t0 + 0.35 + k * step;
    return { row, stamp: it.stamp_at != null ? b.t0 + it.stamp_at : row + Math.min(0.35, step * 0.55) };
  });
}

const STAMP = {
  ne: { fill: C.ink, ink: C.amber, text: 'NESMÍ' },
  zalezi: { fill: C.amber, ink: C.ink, text: 'JEN ZA PODMÍNEK' },
  ano: { fill: C.green, ink: C.ink, text: 'SMÍ' },
};

/** Tabule „smí / nesmí": řádky naskakují, razítka dopadají. Drží se do další tabule, skupiny nebo outra. */
function boardLayer(tl, t) {
  const out = [];
  tl.beats.forEach((b, bi) => {
    if (b.type !== 'board' || t < b.t0) return;
    // na výšku pointa tabuli překryje → tabule odejde i před pointou
    const next = tl.beats.slice(bi + 1).find(x => x.type === 'board' || x.type === 'group' || x.type === 'outro' || (L === PORTRAIT && x.type === 'punch'));
    const until = next ? next.t0 : Infinity;
    if (t >= until + 0.1) return;
    const leave = ease.in(prog(t, until - 0.25, until + 0.1));
    const B = L.board, times = boardTimes(b);
    const rows = b.items.map((it, k) => {
      const tm = times[k];
      if (t < tm.row) return '';
      const kr = ease.outBack(prog(t, tm.row, tm.row + 0.28));
      const y = B.y + (b.title ? 70 : 0) + k * B.rowH;
      const st = STAMP[it.verdict] || STAMP.ne;
      const label = (it.stamp || st.text).toUpperCase();
      const sfs = Math.round(B.font * (label.length > 8 ? 0.66 : 0.8));
      const sw = measure(label, sfs, 900) + 44;
      let stamp = '';
      if (t >= tm.stamp) {
        const ks = prog(t, tm.stamp, tm.stamp + 0.14);
        const sc = lerp(2.2, 1, ease.in(ks));
        const sx = B.x + B.w - 24 - sw / 2, sy = y + B.rowH / 2 - 6;
        stamp = `<g transform="translate(${r1(sx)} ${r1(sy)}) rotate(-7) scale(${r1(sc * 1000) / 1000})" opacity="${r1(clamp(ks * 3) * 100) / 100}">
          <rect x="${r1(-sw / 2)}" y="${r1(-sfs * 0.85)}" width="${r1(sw)}" height="${r1(sfs * 1.7)}" rx="12" fill="${st.fill}" stroke="${C.ink}" stroke-width="6"/>
          <text x="0" y="${r1(sfs * 0.36)}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${sfs}" letter-spacing="1" fill="${st.ink}">${escapeXml(label)}</text>
        </g>`;
      }
      return `<g transform="translate(${r1(-(1 - kr) * 60)} 0)" opacity="${r1(clamp(kr) * 100) / 100}">
        <rect x="${B.x}" y="${r1(y + 6)}" width="${B.w}" height="${B.rowH - 16}" rx="22" fill="${C.paper}" stroke="${C.ink}" stroke-width="6"/>
        <text x="${B.x + 32}" y="${r1(y + B.rowH / 2 + B.font * 0.33)}" font-family="Inter" font-weight="800" font-size="${B.font}" fill="${C.ink}">${escapeXml(it.text)}</text>
        ${stamp}
      </g>`;
    }).join('');
    const title = b.title ? `<text x="${B.x + 4}" y="${B.y + 40}" font-family="Inter" font-weight="900" font-size="${Math.round(B.font * 0.82)}" letter-spacing="2" fill="${C.inkSoft}">${escapeXml(b.title.toUpperCase())}</text>` : '';
    out.push(`<g transform="translate(0 ${r1(leave * 60)})" opacity="${r1((1 - leave) * 100) / 100}">${title}${rows}</g>`);
  });
  return out.join('');
}

function punchLayer(b, t) {
  const hit = b.t0 + 0.12;
  if (t < b.t0) return '';
  const k = prog(t, b.t0, hit);
  const sc = lerp(2.3, 1, ease.in(k));
  const op = clamp(k * 3) * (1 - prog(t, b.t1 - 0.15, b.t1));
  const text = String(b.text || '').toUpperCase();
  const fs = 80;
  const words = text.split(/\s+/).map(w => ({ text: w }));
  const lines = balancedWrap(words, fs, L.punchMaxW, 900);
  const wMax = Math.max(...lines.map(lineWidth));
  const pad = 44, lh = 88;
  const bw = wMax + pad * 2, bh = lines.length * lh + pad * 1.4;
  const fill = b.tone === 'good' ? C.green : b.tone === 'warn' ? C.amber : C.ink;
  const ink = b.tone === 'bad' || !b.tone ? C.amber : C.ink;
  // na výšku: dvouřádková bublina by kartu pointy přesahovala → karta o kus níž
  const twoLine = L === PORTRAIT && b.sched && balancedWrap(b.sched.words, L.bubbleFont, L.bubbleMaxW - 88, 800).length > 1;
  const cy = L.punchY + (twoLine ? L.bubbleLH : 0);
  const txt = lines.map((ln, i) => `<text x="0" y="${r1(-bh / 2 + pad * 0.7 + fs * 0.82 + i * lh)}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="-1" fill="${ink}">${escapeXml(ln.map(w => w.text).join(' '))}</text>`).join('');
  return `<g transform="translate(${L.punchCX} ${cy}) rotate(-4) scale(${r1(sc * 1000) / 1000})" opacity="${r1(op * 100) / 100}">
    <rect x="${r1(-bw / 2 + 12)}" y="${r1(-bh / 2 + 14)}" width="${r1(bw)}" height="${r1(bh)}" rx="28" fill="${C.ink}" opacity="0.18"/>
    <rect x="${r1(-bw / 2)}" y="${r1(-bh / 2)}" width="${r1(bw)}" height="${r1(bh)}" rx="28" fill="${fill}" stroke="${C.ink}" stroke-width="8"/>
    ${txt}
  </g>`;
}

function outroLayer(b, t, script) {
  const k = (a, d = 0.35) => ease.outBack(prog(t, b.t0 + a, b.t0 + a + d));
  const domain = script.domain || 'skorezdravotnictvi.cz';
  const cta = b.cta || 'Celý rozbor → odkaz v biu';
  const ctaFs = 46, ctaW = measure(cta, ctaFs, 900) + 90;
  const src = script.source_line || '';
  const lockW = measure('HSPA Monitor', 70, 900);
  return `
  <g transform="translate(${L.outroCX} ${L.logoY}) scale(${r1(k(0.05) * 1000) / 1000})">
    <g transform="translate(${r1(-lockW / 2 - 50)} -24) scale(0.95)">${miniCompass()}</g>
    <text x="${r1(-lockW / 2 + 22)}" y="0" font-family="Inter" font-weight="900" font-size="70" letter-spacing="-1" fill="${C.ink}">HSPA Monitor</text>
    <text x="0" y="66" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="${C.inkSoft}">${escapeXml(domain)}</text>
  </g>
  <g transform="translate(${L.outroCX} ${L.ctaY}) rotate(-2) scale(${r1(k(0.25) * 1000) / 1000})">
    <rect x="${r1(-ctaW / 2 + 8)}" y="-46" width="${r1(ctaW)}" height="100" rx="50" fill="${C.ink}" opacity="0.15"/>
    <rect x="${r1(-ctaW / 2)}" y="-54" width="${r1(ctaW)}" height="100" rx="50" fill="${C.amber}" stroke="${C.ink}" stroke-width="7"/>
    <text x="0" y="12" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${ctaFs}" fill="${C.ink}">${escapeXml(cta)}</text>
  </g>
  <g opacity="${r1(prog(t, b.t0 + 0.5, b.t0 + 0.8) * 100) / 100}">
    ${src ? `<text x="${L.outroCX}" y="${L.footY - 36}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="${C.inkSoft}">${escapeXml(src)}</text>` : ''}
    <text x="${L.outroCX}" y="${L.footY}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="${C.inkSoft}">${script.voice_credit ? `Animace a text: AI · hlas: ${escapeXml(script.voice_credit)} · redakce HSPA Monitor` : 'Animace a text: AI · redakce HSPA Monitor'}</text>
  </g>`;
}

function footnote(script, t, tl) {
  const out = tl.beats.find(b => b.type === 'outro');
  if (!script.footnote || (out && t >= out.t0)) return '';
  const first = tl.groups[0];
  if (!first || t < first.t0) return '';
  return `<text x="${L.footCX}" y="${L.footY}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="25" fill="${C.inkSoft}" opacity="${r1(prog(t, first.t0, first.t0 + 0.4) * 100) / 100}">${escapeXml(script.footnote)}</text>`;
}

/** Celý snímek v čase t jako SVG. */
export function frameSvg(tl, t) {
  useFormat(tl);
  const { script } = tl;
  const b = beatAt(tl, t);
  const outro = tl.beats.find(x => x.type === 'outro');
  const punch = tl.beats.find(x => x.type === 'punch' && t >= x.t0 && t < x.t1);

  // otřes kamery při pointě
  let cam = '';
  if (punch) {
    const hit = punch.t0 + 0.12, d = 0.32;
    if (t >= hit && t < hit + d) {
      const a = (1 - (t - hit) / d) * 14;
      cam = `translate(${r1(Math.sin(t * 90) * a)} ${r1(Math.cos(t * 77) * a)})`;
    }
    const z = 1 + 0.035 * ease.out(prog(t, hit, hit + 0.4));
    cam += ` translate(${L.cx} ${L.cy}) scale(${r1(z * 1000) / 1000}) translate(${-L.cx} ${-L.cy})`;
  }

  const pose = kompikPose(tl, t);
  const kp = kompik(pose);
  const tone = (tl.beats.find(x => x.type === 'punch') || {}).tone || 'warn';
  // ocásek bubliny míří nad hrot střelky, ne přes ni
  const anchor = [kp.head[0], kp.head[1] - 150 * pose.s];
  const speech = b.type === 'outro' ? '' : bubble(b, t, anchor, { tone, above: b.type === 'intro' || b.type === 'say' });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g transform="${cam}">
    ${background(t, tl)}
    ${badge(script, t)}
    ${groupsLayer(tl, t, outro ? outro.t0 : null)}
    ${boardLayer(tl, t)}
    ${kp.svg}
    ${speech}
    ${punch ? punchLayer(punch, t) : ''}
    ${outro && t >= outro.t0 ? outroLayer(outro, t, script) : ''}
    ${footnote(script, t, tl)}
  </g>
</svg>`;
}

// ───────────────────────────── zvuk ─────────────────────────────

export function audioTrack(tl) {
  const buf = track(tl.duration + 0.3);
  const bad = tl.beats.find(b => b.type === 'punch' && (b.tone || 'bad') === 'bad');
  const outro = tl.beats.find(b => b.type === 'outro');
  music(buf, tl.duration, { mood: t => (bad && t >= bad.t0 && (!outro || t < outro.t0) ? 'down' : 'up') });
  tl.beats.forEach(b => { if (b.v) duck(buf, b.voiceAt + b.v.start, b.voiceAt + b.v.end); });
  tl.beats.forEach((b, i) => {
    if (b.type === 'intro' && i === 0) { sfx.boing(buf, 0.05); sfx.pop(buf, 0.34); }
    if (b.type === 'intro' && b.emotion === 'curious') sfx.spin(buf, b.t0 + 0.35);
    const prev = tl.beats[i - 1];
    if (prev && stageOf(prev) !== stageOf(b)) sfx.whoosh(buf, b.t0);
    if (b.type === 'punch') {
      sfx.slam(buf, b.t0 + 0.12);
      const tone = b.tone || 'bad';
      if (tone === 'bad') sfx.sad(buf, b.t0 + 0.45);
      else if (tone === 'good') sfx.tada(buf, b.t0 + 0.3);
      else sfx.boing(buf, b.t0 + 0.3);
    }
    if (b.type === 'outro') sfx.ding(buf, b.t0 + 0.5);
    if (b.v) mixVoice(buf, b.voiceAt, b.v);
    else if (b.sched) babble(buf, b.sched, { seed: 3 + i });
  });
  tl.groups.forEach(g => g.figs.forEach(f => sfx.plop(buf, f.t, f.i)));
  tl.beats.filter(b => b.type === 'board').forEach(b => boardTimes(b).forEach((tm, k) => { sfx.plop(buf, tm.row, k); sfx.pop(buf, tm.stamp); }));
  return buf;
}

// ───────────────────────────── validace ─────────────────────────────

export function validate(script) {
  useFormat(script);
  const errors = [], warnings = [];
  const err = m => errors.push(m), warn = m => warnings.push(m);
  if (!script || typeof script !== 'object') return { errors: ['scénář není objekt'], warnings };
  if (!/^clanek-[a-z0-9-]+$|^[a-z0-9-]+$/.test(script.slug || '')) err('slug chybí nebo má neplatné znaky');
  if (!script.article) warn('chybí `article` (soubor článku, ze kterého čísla pocházejí)');
  const beats = Array.isArray(script.beats) ? script.beats : [];
  if (!beats.length) err('scénář nemá žádné beaty');
  const facts = Array.isArray(script.facts) ? script.facts : [];
  const factIds = new Set(facts.map(f => f.id));
  checkFacts(facts, err);
  let total = 0;
  beats.forEach((b, i) => {
    const at = `beat ${i + 1} (${b.type})`;
    if (!BEAT_TYPES.includes(b.type)) err(`${at}: neznámý typ`);
    if (!(b.dur > 0)) err(`${at}: chybí dur`);
    total += b.dur || 0;
    if (b.emotion && !EMOTIONS.includes(b.emotion)) err(`${at}: neznámá emoce „${b.emotion}" (povolené: ${EMOTIONS.join(', ')})`);
    if (b.gesture && !GESTURES.includes(b.gesture)) err(`${at}: neznámé gesto „${b.gesture}"`);
    if (b.line) {
      if (b.line.length > LIMITS.maxLine) err(`${at}: replika má ${b.line.length} znaků (max ${LIMITS.maxLine})`);
      const sc = schedule(b.line, 0);
      const lead = b.type === 'intro' ? 0.45 : b.type === 'punch' ? 0.25 : b.type === 'outro' ? 0.55 : 0.2;
      const v = b.voice ? loadVoice(b.voice, script.voice_tempo || 1) : null;
      if (b.voice && !v) err(`${at}: hlasový soubor ${b.voice} neexistuje`);
      const speech = v ? v.end - v.start : sc.end;
      if (speech + lead + 0.35 > b.dur) err(`${at}: ${v ? 'hlas' : 'replika'} trvá ${(speech + lead).toFixed(2)} s, beat má ${b.dur} s (nech ≥ 0,35 s rezervu)`);
      const lines = wrapWords(sc.words, L.bubbleFont, L.bubbleMaxW - 88, 800);
      if (lines.length > 3) err(`${at}: replika se v bublině zalomí na ${lines.length} řádky (max 3)`);
    } else if (b.type !== 'outro' && b.type !== 'group') warn(`${at}: beat bez repliky`);
    if (b.type === 'group') {
      if (!(Number.isInteger(b.count) && b.count >= 1 && b.count <= LIMITS.maxGroup)) err(`${at}: count musí být celé číslo 1–${LIMITS.maxGroup} (vykreslí se tolik postaviček)`);
      if (!ROLES[b.role]) err(`${at}: neznámá role „${b.role}" (${Object.keys(ROLES).join(', ')})`);
      if (b.side && !SIDE_X[b.side]) err(`${at}: side musí být left|right|center`);
      if (!b.fact || !factIds.has(b.fact)) err(`${at}: skupina musí odkazovat na fakt (fact) z \`facts\``);
      const f = facts.find(x => x.id === b.fact);
      if (f && b.value != null && String(b.value) !== String(f.value)) err(`${at}: value „${b.value}" ≠ fakt „${f.value}"`);
      const v = parseValue(b.value ?? f?.value), per = b.per || 1;
      if (Number.isFinite(v) && v > 0) {
        const dev = Math.abs(b.count * per - v) / v;
        if (dev > 0.1) err(`${at}: ${b.count} postaviček × ${per} = ${b.count * per}, ale hodnota je ${v} (odchylka ${(dev * 100).toFixed(0)} % > 10 % — obraz by klamal)`);
      }
    }
    if (b.type === 'board') {
      const items = Array.isArray(b.items) ? b.items : [];
      if (items.length < 2 || items.length > 6) err(`${at}: tabule musí mít 2–6 položek`);
      items.forEach((it, k) => {
        if (!it.text || it.text.length > 32) err(`${at}: položka ${k + 1} — text chybí nebo je delší než 32 znaků`);
        if (!VERDICTS.includes(it.verdict)) err(`${at}: položka ${k + 1} — verdict musí být ${VERDICTS.join('|')}`);
        if (it.stamp && it.stamp.length > 16) err(`${at}: položka ${k + 1} — razítko je delší než 16 znaků`);
        if (it.text && VERDICTS.includes(it.verdict)) {
          const label = (it.stamp || STAMP[it.verdict].text).toUpperCase();
          const sw = measure(label, Math.round(L.board.font * (label.length > 8 ? 0.66 : 0.8)), 900) + 44;
          if (32 + measure(it.text, L.board.font, 800) + 40 + sw + 24 > L.board.w) err(`${at}: položka ${k + 1} „${it.text}" by se překryla s razítkem — zkrať text nebo razítko`);
        }
        if (!it.basis) err(`${at}: položka ${k + 1} — chybí \`basis\` (kazuistika nebo paragraf, ze kterého verdikt plyne)`);
      });
      let prev = -1;
      items.forEach((it, k) => {
        if (it.at == null) return;
        if (!(it.at >= 0 && it.at <= b.dur - 0.3) || it.at < prev) err(`${at}: položka ${k + 1} — \`at\` musí být v beatu a rostoucí`);
        if (it.stamp_at != null && !(it.stamp_at >= it.at && it.stamp_at <= b.dur - 0.2)) err(`${at}: položka ${k + 1} — \`stamp_at\` musí být mezi \`at\` a koncem beatu`);
        prev = it.at;
      });
      if (b.dur < 0.9 + items.length * 0.55) err(`${at}: ${items.length} položek se do ${b.dur} s nevejde (≥ ${(0.9 + items.length * 0.55).toFixed(1)} s)`);
    }
    if (b.type === 'punch') {
      if (!b.text) err(`${at}: chybí text pointy`);
      if (!b.basis) err(`${at}: chybí \`basis\` — z jakých faktů pointa plyne (např. "16,1 / 34,8 = 0,46")`);
      if (b.tone && !['bad', 'good', 'warn'].includes(b.tone)) err(`${at}: tone musí být bad|good|warn`);
    }
  });
  checkNumbers(beats.map(b => ({ ...b, boardText: (b.items || []).map(it => `${it.text} ${it.stamp || ''}`).join(' ') })), facts, err, ['line', 'text', 'label', 'cta', 'boardText']);
  if (script.format && !FORMATS[script.format]) err(`neznámý formát „${script.format}" (${Object.keys(FORMATS).join(', ')})`);
  const maxDur = (FORMATS[script.format] || FORMATS.portrait).maxDur;
  if (beats.length && beats[beats.length - 1].type !== 'outro') err('poslední beat musí být outro (koncová karta s odkazem a zdrojem)');
  if (beats.length && beats[0].type !== 'intro') warn('první beat by měl být intro (háček do 1. sekundy)');
  if (beats.filter(b => b.type === 'group').length > 2) err('nejvýš 2 skupiny postaviček na video (jedna myšlenka, jedno srovnání)');
  if (total > maxDur) err(`délka ${total.toFixed(1)} s > ${maxDur} s`);
  if (total && total < LIMITS.minDur) err(`délka ${total.toFixed(1)} s < ${LIMITS.minDur} s`);
  if (!script.source_line) err('chybí `source_line` (zdroj na koncové kartě)');
  if (beats.some(b => b.type === 'group') && !script.footnote) err('chybí `footnote` (co znamená jedna postavička, rok, zdroj)');
  if (beats.some(b => b.voice) && !script.voice_credit) err('beat s hlasem vyžaduje `voice_credit` (kdo/co mluví — označení na koncové kartě)');
  if (beats.some(b => b.voice) && script.format !== 'landscape') err('hlas je povolený jen u videí na šířku pro web (`format: landscape`)');
  return { errors, warnings, duration: total };
}

export { KOMPIK_HEIGHT };
