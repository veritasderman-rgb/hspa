// Styl „Florence komentuje" — druhý formát animovaných příspěvků.
//
// Kompík vysvětluje (světlá scéna, postavičky, bublina). Florence KOMENTUJE: tmavá
// scéna osvětlená její lampou, velké titulky po kouscích (2–3 slova, styl TikTok),
// rychlé střihy se „zoom punchem", jedno číslo nasvícené lampou. Cíl: zastavit scroll.
//
// Beaty (scénář `"style": "florence"`):
//   hook    první věta naplno od 1. snímku (žádný nájezd) + reakce Florence
//   say     komentář v titulcích s výrazem a gestem
//   number  lampa nasvítí velké číslo z faktu (+ volitelné srovnání `compare`)
//   outro   karta: Florence · AI autorka, výzva, zdroj, „Text a animace: AI"
// Formát: .claude/skills/animovane-prispevky/references/florence.md

import { C } from './palette.js';
import { clamp, lerp, prog, ease, blink, escapeXml, r1 } from './anim.js';
import { schedule, mouthOpen } from './speech.js';
import { measure } from './text.js';
import { florence, MOODS, GESTURES_F } from '../characters/florence.js';
import { track, sfx, musicNight } from './audio.js';
import { parseValue, checkFacts, checkNumbers } from './facts.js';
import { LIMITS } from './scene.js';
import { FORMATS, formatName } from './format.js';
import { loadVoice, alignSchedule, voiceStart, mixVoice, duck, voiceMouth, voiceSpeaking } from './voice.js';

export const F_BEATS = ['hook', 'say', 'number', 'step', 'outro'];
const RATE = 1.12;              // Florence mluví o kousek rychleji než Kompík
const LEAD = { hook: 0.05, say: 0.12, number: 0.1, step: 0.35, outro: 0.5 };

const PORTRAIT = {
  W: 1080, H: 1920, cx: 540, cy: 960, tx: 540,
  labelY: 250, kickerY: 318,
  capY: 760, capFont: 108, capMaxW: 940, capNumY: 420, capStepY: 1080, numMaxW: 960,
  numY: 700, labelUnderY: 805, compareY: 880,
  footY: 950,
  flo: { x: 540, y: 2080, s: 1.35 },
  ambient: [540, 1250, 760], lampDefault: [540, 1200],
  outro: { titleY: 470, ctaY: 690, domainY: 830, srcY: 900, aiY: 936 },
  steps: { x: 90, y: 380, w: 900, rowH: 106, font: 40 },
};
// 16:9 pro web: text a kroky vlevo, Florence s lampou vpravo.
const LANDSCAPE = {
  W: 1920, H: 1080, cx: 960, cy: 540, tx: 700,
  labelY: 62, kickerY: 118,
  capY: 640, capFont: 96, capMaxW: 1160, capNumY: 300, capStepY: 905, numMaxW: 1000,
  numY: 580, labelUnderY: 680, compareY: 760,
  footY: 1040,
  flo: { x: 1530, y: 1090, s: 1.0 },
  ambient: [1530, 700, 700], lampDefault: [1530, 760],
  outro: { titleY: 330, ctaY: 520, domainY: 660, srcY: 730, aiY: 766 },
  steps: { x: 110, y: 168, w: 1060, rowH: 112, font: 46 },
};
const LAYOUTS = { portrait: PORTRAIT, landscape: LANDSCAPE };
let L = PORTRAIT, W = L.W, H = L.H;
function useFormat(x) { L = LAYOUTS[formatName(x)] || PORTRAIT; W = L.W; H = L.H; }
export { W, H };

// ───────────────────────────── kompilace ─────────────────────────────

/** Rozdělí slova repliky do titulkových kousků (≤ 3 slova, ≤ 16 znaků, konec na interpunkci). */
export function chunkWords(words) {
  const chunks = [];
  let cur = [];
  const len = c => c.map(w => w.text).join(' ').length;
  words.forEach((w, i) => {
    cur.push({ ...w, i });
    const next = words[i + 1];
    if (!next) return;
    const end = /[.?!,:…—–]$/.test(w.text);
    // nerozdělovat „0,3 %", předložky a zvýrazněný úsek (pokud se vejde)
    const glue = next.text.length <= 2 || /^%/.test(next.text) || (w.emph && next.emph && len(cur) + next.text.length < 22);
    if (end || (!glue && (cur.length >= 3 || len(cur) >= 16))) { chunks.push(cur); cur = []; }
  });
  if (cur.length) chunks.push(cur);
  return chunks;
}

export function compile(script) {
  useFormat(script);
  const beats = [];
  let t = 0;
  for (const b of script.beats) {
    const beat = { ...b, t0: t, t1: t + b.dur };
    if (b.line) {
      const speakAt = t + (LEAD[b.type] ?? 0.12);
      beat.sched = schedule(b.line, speakAt, { rate: RATE });
      if (b.voice) {
        beat.v = loadVoice(b.voice, script.voice_tempo || 1);
        if (beat.v) { beat.sched = alignSchedule(beat.sched, speakAt, beat.v); beat.voiceAt = voiceStart(speakAt, beat.v); }
      }
      beat.chunks = chunkWords(beat.sched.words).map(ws => ({ words: ws, t0: beat.sched.wordStart[ws[0].i] }));
      beat.chunks.forEach((c, k) => { c.t1 = beat.chunks[k + 1]?.t0 ?? beat.t1 - 0.05; });
    }
    beats.push(beat);
    t += b.dur;
  }
  return { script, beats, duration: t, style: 'florence', W, H };
}

const beatAt = (tl, t) => tl.beats.find(b => t >= b.t0 && t < b.t1) || tl.beats[tl.beats.length - 1];

// ───────────────────────────── vrstvy ─────────────────────────────

function background(t, glow, glowAt) {
  const dots = Array.from({ length: 22 }, (_, i) => {
    const rx = ((i * 7919) % 1000) / 1000, ry = ((i * 104729) % 1000) / 1000;
    const yy = ((ry * H - t * (10 + (i % 5) * 4)) % H + H) % H;
    return `<circle cx="${r1(rx * W)}" cy="${r1(yy)}" r="${2 + (i % 3)}" fill="${C.amberSoft}" opacity="${0.08 + (i % 4) * 0.04}"/>`;
  }).join('');
  return `<defs>
    <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.55"/><stop offset="0.45" stop-color="${C.amber}" stop-opacity="0.16"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>
    <radialGradient id="vign" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.night}"/>
  <circle cx="${L.ambient[0]}" cy="${L.ambient[1]}" r="${L.ambient[2]}" fill="url(#lampGlow)" opacity="0.35"/>
  ${glow > 0 ? `<circle cx="${r1(glowAt[0])}" cy="${r1(glowAt[1])}" r="${r1(520 + glow * 260)}" fill="url(#lampGlow)" opacity="${r1(glow * 100) / 100}"/>` : ''}
  ${dots}`;
}

function topLabel(script, t) {
  const text = 'FLORENCE · AI AUTORKA';
  const fs = 29, w = measure(text, fs, 900) + text.length * 2 + 104;
  const k = ease.outBack(prog(t, 0, 0.25));
  return `<g transform="translate(${L.tx} ${L.labelY}) scale(${r1(k * 100) / 100})">
    <rect x="${r1(-w / 2)}" y="-33" width="${r1(w)}" height="66" rx="33" fill="${C.ink}" stroke="${C.amber}" stroke-width="4"/>
    <g transform="translate(${r1(-w / 2 + 40)} 0)"><rect x="-9" y="-16" width="18" height="24" rx="5" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="3"/><rect x="-11" y="-21" width="22" height="6" rx="2" fill="${C.amber}"/><rect x="-11" y="8" width="22" height="6" rx="2" fill="${C.amber}"/></g>
    <text x="${r1(-w / 2 + 72)}" y="10" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="2" fill="${C.paper}">${text}</text>
  </g>
  ${script.kicker ? `<text x="${L.tx}" y="${L.kickerY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="27" letter-spacing="3" fill="${C.grey}">${escapeXml(script.kicker.toUpperCase())}</text>` : ''}`;
}

/** Titulek: jeden kousek naráz, slovo právě „vyslovené" svítí jantarově, *zvýraznění* v jantarovém štítku. */
function captions(b, t, y = L.capY) {
  if (!b.chunks) return '';
  const c = b.chunks.find(ch => t >= ch.t0 - 0.02 && t < ch.t1);
  if (!c) return '';
  let fs = L.capFont;
  const textOf = ws => ws.map(w => w.text).join(' ');
  while (fs > 64 && measure(textOf(c.words), fs, 900) > L.capMaxW) fs -= 6;
  const space = measure('a a', fs, 900) - measure('aa', fs, 900);
  const widths = c.words.map(w => measure(w.text, fs, 900));
  // mezi zvýrazněným a obyčejným slovem extra mezera, ať štítek nepřekryje soused
  const gaps = c.words.map((w, k) => (k === 0 ? 0 : space + (!!w.emph !== !!c.words[k - 1].emph ? 18 : 0)));
  const total = widths.reduce((a, w) => a + w, 0) + gaps.reduce((a, g) => a + g, 0);
  const pop = ease.outBack(prog(t, c.t0, c.t0 + 0.14));
  const sc = lerp(1.25, 1, pop);
  const xs = [];
  let x = L.tx - total / 2;
  c.words.forEach((w, k) => { x += gaps[k]; xs.push(x); x += widths[k]; });
  const out = [];
  // souvislý zvýrazněný úsek = jeden jantarový štítek
  for (let k = 0; k < c.words.length; k++) {
    if (!c.words[k].emph) continue;
    let e = k;
    while (e + 1 < c.words.length && c.words[e + 1].emph) e++;
    const x0 = xs[k] - 16, x1 = xs[e] + widths[e] + 16;
    // štítek kryje i diakritiku velkých písmen (Ú, Č), jinak by tmavá čárka zmizela v pozadí
    out.push(`<rect x="${r1(x0)}" y="${r1(y - fs * 1.0)}" width="${r1(x1 - x0)}" height="${r1(fs * 1.26)}" rx="16" fill="${C.amber}" stroke="${C.ink}" stroke-width="7" transform="rotate(-2 ${r1((x0 + x1) / 2)} ${y})"/>`);
    k = e;
  }
  c.words.forEach((w, k) => {
    const said = t >= b.sched.wordStart[w.i] - 0.02;
    const fill = w.emph ? C.ink : said ? C.paper : C.grey;
    if (!w.emph) out.push(`<text x="${r1(xs[k])}" y="${y}" font-family="Inter" font-weight="900" font-size="${fs}" fill="none" stroke="${C.ink}" stroke-width="16" stroke-linejoin="round">${escapeXml(w.text)}</text>`);
    out.push(`<text x="${r1(xs[k])}" y="${y}" font-family="Inter" font-weight="900" font-size="${fs}" fill="${fill}">${escapeXml(w.text)}</text>`);
  });
  return `<g transform="translate(${L.tx} ${y - fs * 0.3}) scale(${r1(sc * 1000) / 1000}) translate(${-L.tx} ${-(y - fs * 0.3)})">${out.join('')}</g>`;
}

function numberLayer(tl, b, t) {
  const f = tl.script.facts.find(x => x.id === b.fact);
  const value = String(b.value ?? f?.value ?? '');
  const v = parseValue(value), dec = (value.match(/[.,](\d+)/) || ['', ''])[1].length;
  const k = ease.out(prog(t, b.t0 + 0.15, b.t0 + 0.85));
  // „1 000 000 Kč": tisíce oddělené mezerou se načítají celé, ne jen první trojice
  const grouped = value.match(/-?\d{1,3}(?:[\s\u00a0]\d{3})+/);
  const shown = grouped
    ? value.replace(grouped[0], String(Math.round(Number(grouped[0].replace(/[\s\u00a0]/g, '')) * k)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'))
    : Number.isFinite(v) ? value.replace(/-?\d+(?:[.,]\d+)?/, (v * k).toFixed(dec).replace('.', ',')) : value;
  const hit = b.t0 + 0.85;
  const slam = t >= hit ? 1 + 0.12 * Math.max(0, 1 - (t - hit) / 0.25) : lerp(0.7, 1, k);
  const op = clamp((t - b.t0) / 0.12) * (1 - prog(t, b.t1 - 0.1, b.t1));
  let fs = 300;
  while (fs > 140 && measure(shown, fs, 900) > L.numMaxW) fs -= 10;
  const parts = [`<g transform="translate(${L.tx} ${L.numY}) scale(${r1(slam * 1000) / 1000})" opacity="${r1(op * 100) / 100}">
    <text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="-8" fill="none" stroke="${C.ink}" stroke-width="22" stroke-linejoin="round">${escapeXml(shown)}</text>
    <text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="-8" fill="${C.amber}">${escapeXml(shown)}</text>
  </g>`];
  const lop = clamp((t - hit) / 0.2) * (1 - prog(t, b.t1 - 0.1, b.t1));
  if (b.label) parts.push(`<text x="${L.tx}" y="${L.labelUnderY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="46" fill="${C.paper}" opacity="${r1(lop * 100) / 100}">${escapeXml(b.label)}</text>`);
  if (b.compare) {
    const cf = tl.script.facts.find(x => x.id === b.compare.fact);
    const cop = clamp((t - hit - 0.45) / 0.2) * (1 - prog(t, b.t1 - 0.1, b.t1));
    const txt = `${b.compare.label}: ${b.compare.value ?? cf?.value ?? ''}`;
    const w = measure(txt, 40, 800) + 60;
    parts.push(`<g opacity="${r1(cop * 100) / 100}"><rect x="${r1(L.tx - w / 2)}" y="${L.compareY - 46}" width="${r1(w)}" height="66" rx="33" fill="none" stroke="${C.grey}" stroke-width="4"/><text x="${L.tx}" y="${L.compareY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="${C.grey}">${escapeXml(txt)}</text></g>`);
  }
  return parts.join('');
}

function outroLayer(tl, b, t) {
  const k = a => ease.outBack(prog(t, b.t0 + a, b.t0 + a + 0.35));
  const cta = b.cta || 'Celý rozbor → odkaz v biu';
  const ctaW = measure(cta, 46, 900) + 90;
  const domain = tl.script.domain || 'skorezdravotnictvi.cz';
  return `
  <g transform="translate(${L.tx} ${L.outro.titleY}) scale(${r1(k(0.05) * 1000) / 1000})">
    <text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-size="104" letter-spacing="-2" fill="${C.paper}">Florence</text>
    <text x="0" y="62" text-anchor="middle" font-family="Inter" font-weight="800" font-size="38" fill="${C.amber}">AI autorka HSPA Monitoru</text>
  </g>
  <g transform="translate(${L.tx} ${L.outro.ctaY}) rotate(-2) scale(${r1(k(0.25) * 1000) / 1000})">
    <rect x="${r1(-ctaW / 2)}" y="-54" width="${r1(ctaW)}" height="100" rx="50" fill="${C.amber}" stroke="${C.ink}" stroke-width="7"/>
    <text x="0" y="12" text-anchor="middle" font-family="Inter" font-weight="900" font-size="46" fill="${C.ink}">${escapeXml(cta)}</text>
  </g>
  <g opacity="${r1(prog(t, b.t0 + 0.45, b.t0 + 0.8) * 100) / 100}">
    <text x="${L.tx}" y="${L.outro.domainY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="${C.paper}">${escapeXml(domain)}</text>
    <text x="${L.tx}" y="${L.outro.srcY}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="${C.grey}">${escapeXml(tl.script.source_line || '')}</text>
    <text x="${L.tx}" y="${L.outro.aiY}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="${C.grey}">${tl.script.voice_credit ? `Text a animace: AI · hlas: ${escapeXml(tl.script.voice_credit)} · redakce HSPA Monitor` : 'Text a animace: AI · redakce HSPA Monitor'}</text>
  </g>`;
}

function florencePose(tl, b, t) {
  const idx = tl.beats.indexOf(b);
  const enter = idx === 0 ? ease.outBack(prog(t, 0, 0.3)) : 1;
  const pop = Math.max(0, 1 - (t - b.t0) / 0.18);
  let gesture = b.gesture || (b.type === 'number' ? 'lamp' : b.type === 'outro' ? 'wave' : 'idle');
  const mood = b.mood || (b.type === 'outro' ? 'smile' : 'neutral');
  const talk = b.v ? voiceMouth(b, t) : mouthOpen(b.sched, t);
  const speaking = b.v ? voiceSpeaking(b, t) : b.sched && t >= b.sched.syl[0]?.t0 && t <= b.sched.end;
  let glow = 0;
  if (gesture === 'lamp') glow = b.type === 'number' ? clamp(0.35 + 0.65 * prog(t, b.t0 + 0.1, b.t0 + 0.85)) : 0.5;
  return {
    x: L.flo.x, y: L.flo.y + (1 - enter) * 700 - pop * 26,
    s: L.flo.s, mood, gesture, talk, glow,
    bob: Math.sin(t * Math.PI * 2 * 0.9) * 5,
    tilt: (speaking ? Math.sin(t * 6) * 2.2 : 0) + (mood === 'skeptic' ? -5 : mood === 'smirk' ? 4 : 0),
    blink: blink(t, 11),
    lookX: gesture === 'point' ? 0.4 : mood === 'skeptic' ? -0.6 : 0,
    lookY: gesture === 'point' || gesture === 'lamp' ? -0.6 : 0,
    wave: t * 10,
  };
}

/** Seznam kroků: naskakují s beaty `step`, aktuální svítí jantarově, hotové mají fajfku. */
function stepsLayer(tl, b, t) {
  if (b.type !== 'step') return '';
  const S = L.steps;
  const steps = tl.beats.filter(x => x.type === 'step');
  return steps.filter(x => t >= x.t0).map((x, k) => {
    const cur = x === b;
    const kr = ease.outBack(prog(t, x.t0, x.t0 + 0.3));
    const y = S.y + k * S.rowH;
    const done = !cur;
    const fill = cur ? C.amber : 'none';
    const txt = cur ? C.ink : C.grey;
    const n = String(x.n ?? k + 1);
    const circle = done
      ? `<circle cx="${S.x + 40}" cy="${y + S.rowH / 2 - 8}" r="32" fill="${C.greenDeep}" stroke="${C.ink}" stroke-width="5"/><path d="M${S.x + 24},${y + S.rowH / 2 - 8} l11,12 l21,-24" fill="none" stroke="${C.paper}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<circle cx="${S.x + 40}" cy="${y + S.rowH / 2 - 8}" r="32" fill="${C.ink}" stroke="${C.ink}" stroke-width="5"/><text x="${S.x + 40}" y="${y + S.rowH / 2 + 6}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="38" fill="${C.amber}">${escapeXml(n)}</text>`;
    return `<g transform="translate(${r1(-(1 - kr) * 50)} 0)" opacity="${r1(clamp(kr) * 100) / 100}">
      ${cur ? `<rect x="${S.x}" y="${y}" width="${S.w}" height="${S.rowH - 16}" rx="22" fill="${fill}" stroke="${C.ink}" stroke-width="6"/>` : ''}
      ${circle}
      <text x="${S.x + 92}" y="${r1(y + S.rowH / 2 - 8 + S.font * 0.35)}" font-family="Inter" font-weight="900" font-size="${S.font}" fill="${txt}">${escapeXml(x.title || '')}</text>
    </g>`;
  }).join('');
}

export function frameSvg(tl, t) {
  useFormat(tl);
  const b = beatAt(tl, t);
  const pose = florencePose(tl, b, t);
  const fl = florence(pose);
  // střih: krátký zoom punch na začátku každého beatu
  const z = 1 + 0.07 * (1 - ease.out(prog(t, b.t0, b.t0 + 0.25)));
  let shake = '';
  if (b.type === 'number') {
    const hit = b.t0 + 0.85;
    if (t >= hit && t < hit + 0.3) {
      const a = (1 - (t - hit) / 0.3) * 16;
      shake = `translate(${r1(Math.sin(t * 93) * a)} ${r1(Math.cos(t * 71) * a)})`;
    }
  }
  const flash = tl.beats.indexOf(b) > 0 ? Math.max(0, 1 - (t - b.t0) / 0.08) * 0.18 : 0;
  const capY = b.type === 'number' ? L.capNumY : b.type === 'step' ? L.capStepY : L.capY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g transform="${shake} translate(${L.cx} ${L.cy}) scale(${r1(z * 1000) / 1000}) translate(${-L.cx} ${-L.cy})">
    ${background(t, pose.glow, fl.lamp || L.lampDefault)}
    ${fl.svg}
    ${b.type === 'number' ? numberLayer(tl, b, t) : ''}
    ${stepsLayer(tl, b, t)}
    ${b.type === 'outro' ? outroLayer(tl, b, t) : captions(b, t, capY)}
    ${b.type === 'number' && tl.script.footnote ? `<text x="${L.tx}" y="${L.footY}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="25" fill="${C.grey}" opacity="${r1(clamp((t - b.t0 - 1) / 0.3) * 100) / 100}">${escapeXml(tl.script.footnote)}</text>` : ''}
  </g>
  <rect width="${W}" height="${H}" fill="url(#vign)"/>
  ${topLabel(tl.script, t)}
  ${flash > 0 ? `<rect width="${W}" height="${H}" fill="${C.white}" opacity="${r1(flash * 100) / 100}"/>` : ''}
</svg>`;
}

// ───────────────────────────── zvuk ─────────────────────────────

export function audioTrack(tl) {
  const buf = track(tl.duration + 0.3);
  musicNight(buf, tl.duration);
  tl.beats.forEach(b => { if (b.v) duck(buf, b.voiceAt + b.v.start, b.voiceAt + b.v.end); });
  tl.beats.forEach((b, i) => {
    if (i > 0) sfx.whoosh(buf, b.t0);
    if (b.type === 'number') { sfx.riser(buf, b.t0, 0.8); sfx.boom(buf, b.t0 + 0.85); }
    if (b.type === 'outro') sfx.ding(buf, b.t0 + 0.4);
    if (b.type === 'step') sfx.pop(buf, b.t0 + 0.05);
    if (b.v) mixVoice(buf, b.voiceAt, b.v);
    else if (b.sched) b.sched.wordStart.forEach((ws, k) => sfx.tick(buf, ws, k));
  });
  return buf;
}

// ───────────────────────────── validace ─────────────────────────────

export function validate(script) {
  useFormat(script);
  const errors = [], warnings = [];
  const err = m => errors.push(m), warn = m => warnings.push(m);
  if (!/^[a-z0-9-]+$/.test(script.slug || '')) err('slug chybí nebo má neplatné znaky');
  if (!script.article) err('chybí `article` (soubor článku, ze kterého čísla pocházejí)');
  const beats = Array.isArray(script.beats) ? script.beats : [];
  const facts = Array.isArray(script.facts) ? script.facts : [];
  if (!beats.length) err('scénář nemá žádné beaty');
  checkFacts(facts, err);
  let total = 0;
  beats.forEach((b, i) => {
    const at = `beat ${i + 1} (${b.type})`;
    if (!F_BEATS.includes(b.type)) err(`${at}: neznámý typ (styl florence: ${F_BEATS.join(', ')})`);
    if (!(b.dur > 0)) err(`${at}: chybí dur`);
    total += b.dur || 0;
    if (b.mood && !MOODS.includes(b.mood)) err(`${at}: neznámá nálada „${b.mood}" (${MOODS.join(', ')})`);
    if (b.gesture && !GESTURES_F.includes(b.gesture)) err(`${at}: neznámé gesto „${b.gesture}" (${GESTURES_F.join(', ')})`);
    if (b.line) {
      if (b.line.length > 80) err(`${at}: replika má ${b.line.length} znaků (max 80)`);
      const sc = schedule(b.line, 0, { rate: RATE });
      const lead = LEAD[b.type] ?? 0.12;
      const v = b.voice ? loadVoice(b.voice, script.voice_tempo || 1) : null;
      if (b.voice && !v) err(`${at}: hlasový soubor ${b.voice} neexistuje`);
      const speech = v ? v.end - v.start : sc.end;
      if (speech + lead + 0.3 > b.dur) err(`${at}: ${v ? 'hlas' : 'titulky'} běží ${(speech + lead).toFixed(2)} s, beat má ${b.dur} s (nech ≥ 0,3 s rezervu)`);
    } else if (b.type === 'hook' || b.type === 'say' || b.type === 'step') err(`${at}: chybí \`line\` (titulky)`);
    if (b.type === 'step') {
      if (!b.title || b.title.length > 40) err(`${at}: krok musí mít \`title\` do 40 znaků`);
      if (b.title && measure(b.title, L.steps.font, 900) > L.steps.w - 120) err(`${at}: title „${b.title}" je na řádek kroku příliš široký`);
      if (!b.basis) err(`${at}: chybí \`basis\` (paragraf nebo část stanoviska, ze které krok plyne)`);
    }
    if (b.type === 'number') {
      const f = facts.find(x => x.id === b.fact);
      if (!f) err(`${at}: číslo musí odkazovat na fakt (fact) z \`facts\``);
      if (f && b.value != null && String(b.value) !== String(f.value)) err(`${at}: value „${b.value}" ≠ fakt „${f.value}"`);
      if (!b.label) err(`${at}: chybí \`label\` (co číslo znamená)`);
      if (b.compare) {
        const cf = facts.find(x => x.id === b.compare.fact);
        if (!cf) err(`${at}: compare.fact musí odkazovat na fakt`);
        if (cf && b.compare.value != null && String(b.compare.value) !== String(cf.value)) err(`${at}: compare.value ≠ fakt`);
        if (!b.compare.label) err(`${at}: chybí compare.label`);
      }
    }
  });
  checkNumbers(beats.map(b => ({ ...b, compareLabel: b.compare?.label })), facts, err, ['line', 'label', 'cta', 'compareLabel', 'title']);
  const steps = beats.filter(b => b.type === 'step');
  if (steps.length > 6) err(`nejvýš 6 kroků (${steps.length})`);
  if (steps.length * L.steps.rowH + L.steps.y > (L === LANDSCAPE ? L.capStepY - 110 : L.capStepY - 120)) err('kroky by překryly titulky — zkrať seznam');
  if (script.format && !FORMATS[script.format]) err(`neznámý formát „${script.format}"`);
  const maxDur = (FORMATS[script.format] || FORMATS.portrait).maxDur;
  if (beats.length && beats[0].type !== 'hook') err('první beat musí být hook (háček od prvního snímku)');
  if (beats.length && beats[beats.length - 1].type !== 'outro') err('poslední beat musí být outro (karta s odkazem a zdrojem)');
  if (total > maxDur) err(`délka ${total.toFixed(1)} s > ${maxDur} s`);
  if (total && total < LIMITS.minDur) err(`délka ${total.toFixed(1)} s < ${LIMITS.minDur} s`);
  if (!script.source_line) err('chybí `source_line` (zdroj na koncové kartě)');
  if (beats.some(b => b.voice) && !script.voice_credit) err('beat s hlasem vyžaduje `voice_credit` (označení hlasu na koncové kartě)');
  if (beats.some(b => b.voice) && script.format !== 'landscape') err('hlas je povolený jen u videí na šířku pro web (`format: landscape`)');
  if (beats.some(b => b.type === 'number') && !script.footnote) err('chybí `footnote` (co číslo měří, rok)');
  return { errors, warnings, duration: total };
}
