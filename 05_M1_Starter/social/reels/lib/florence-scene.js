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

export const W = 1080, H = 1920;
export const F_BEATS = ['hook', 'say', 'number', 'outro'];
const RATE = 1.12;              // Florence mluví o kousek rychleji než Kompík
const LEAD = { hook: 0.05, say: 0.12, number: 0.1, outro: 0.5 };

const L = {
  labelY: 250, kickerY: 318,
  capY: 760, capFont: 108, capMaxW: 940,
  numY: 700, labelUnderY: 805, compareY: 880,
  footY: 950,
  flo: { x: 540, y: 2080, s: 1.35 },
};

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
  const beats = [];
  let t = 0;
  for (const b of script.beats) {
    const beat = { ...b, t0: t, t1: t + b.dur };
    if (b.line) {
      beat.sched = schedule(b.line, t + (LEAD[b.type] ?? 0.12), { rate: RATE });
      beat.chunks = chunkWords(beat.sched.words).map(ws => ({ words: ws, t0: beat.sched.wordStart[ws[0].i] }));
      beat.chunks.forEach((c, k) => { c.t1 = beat.chunks[k + 1]?.t0 ?? beat.t1 - 0.05; });
    }
    beats.push(beat);
    t += b.dur;
  }
  return { script, beats, duration: t, style: 'florence' };
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
  <circle cx="540" cy="1250" r="760" fill="url(#lampGlow)" opacity="0.35"/>
  ${glow > 0 ? `<circle cx="${r1(glowAt[0])}" cy="${r1(glowAt[1])}" r="${r1(520 + glow * 260)}" fill="url(#lampGlow)" opacity="${r1(glow * 100) / 100}"/>` : ''}
  ${dots}`;
}

function topLabel(script, t) {
  const text = 'FLORENCE · AI AUTORKA';
  const fs = 29, w = measure(text, fs, 900) + text.length * 2 + 104;
  const k = ease.outBack(prog(t, 0, 0.25));
  return `<g transform="translate(540 ${L.labelY}) scale(${r1(k * 100) / 100})">
    <rect x="${r1(-w / 2)}" y="-33" width="${r1(w)}" height="66" rx="33" fill="${C.ink}" stroke="${C.amber}" stroke-width="4"/>
    <g transform="translate(${r1(-w / 2 + 40)} 0)"><rect x="-9" y="-16" width="18" height="24" rx="5" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="3"/><rect x="-11" y="-21" width="22" height="6" rx="2" fill="${C.amber}"/><rect x="-11" y="8" width="22" height="6" rx="2" fill="${C.amber}"/></g>
    <text x="${r1(-w / 2 + 72)}" y="10" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="2" fill="${C.paper}">${text}</text>
  </g>
  ${script.kicker ? `<text x="540" y="${L.kickerY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="27" letter-spacing="3" fill="${C.grey}">${escapeXml(script.kicker.toUpperCase())}</text>` : ''}`;
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
  const total = widths.reduce((a, w) => a + w, 0) + space * (c.words.length - 1);
  const pop = ease.outBack(prog(t, c.t0, c.t0 + 0.14));
  const sc = lerp(1.25, 1, pop);
  const xs = [];
  let x = 540 - total / 2;
  c.words.forEach((w, k) => { xs.push(x); x += widths[k] + space; });
  const out = [];
  // souvislý zvýrazněný úsek = jeden jantarový štítek
  for (let k = 0; k < c.words.length; k++) {
    if (!c.words[k].emph) continue;
    let e = k;
    while (e + 1 < c.words.length && c.words[e + 1].emph) e++;
    const x0 = xs[k] - 16, x1 = xs[e] + widths[e] + 16;
    out.push(`<rect x="${r1(x0)}" y="${r1(y - fs * 0.86)}" width="${r1(x1 - x0)}" height="${r1(fs * 1.12)}" rx="16" fill="${C.amber}" stroke="${C.ink}" stroke-width="7" transform="rotate(-2 ${r1((x0 + x1) / 2)} ${y})"/>`);
    k = e;
  }
  c.words.forEach((w, k) => {
    const said = t >= b.sched.wordStart[w.i] - 0.02;
    const fill = w.emph ? C.ink : said ? C.paper : C.grey;
    if (!w.emph) out.push(`<text x="${r1(xs[k])}" y="${y}" font-family="Inter" font-weight="900" font-size="${fs}" fill="none" stroke="${C.ink}" stroke-width="16" stroke-linejoin="round">${escapeXml(w.text)}</text>`);
    out.push(`<text x="${r1(xs[k])}" y="${y}" font-family="Inter" font-weight="900" font-size="${fs}" fill="${fill}">${escapeXml(w.text)}</text>`);
  });
  return `<g transform="translate(540 ${y - fs * 0.3}) scale(${r1(sc * 1000) / 1000}) translate(-540 ${-(y - fs * 0.3)})">${out.join('')}</g>`;
}

function numberLayer(tl, b, t) {
  const f = tl.script.facts.find(x => x.id === b.fact);
  const value = String(b.value ?? f?.value ?? '');
  const v = parseValue(value), dec = (value.match(/[.,](\d+)/) || ['', ''])[1].length;
  const k = ease.out(prog(t, b.t0 + 0.15, b.t0 + 0.85));
  const shown = Number.isFinite(v) ? value.replace(/-?\d+(?:[.,]\d+)?/, (v * k).toFixed(dec).replace('.', ',')) : value;
  const hit = b.t0 + 0.85;
  const slam = t >= hit ? 1 + 0.12 * Math.max(0, 1 - (t - hit) / 0.25) : lerp(0.7, 1, k);
  const op = clamp((t - b.t0) / 0.12) * (1 - prog(t, b.t1 - 0.1, b.t1));
  let fs = 300;
  while (fs > 140 && measure(shown, fs, 900) > 960) fs -= 10;
  const parts = [`<g transform="translate(540 ${L.numY}) scale(${r1(slam * 1000) / 1000})" opacity="${r1(op * 100) / 100}">
    <text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="-8" fill="none" stroke="${C.ink}" stroke-width="22" stroke-linejoin="round">${escapeXml(shown)}</text>
    <text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${fs}" letter-spacing="-8" fill="${C.amber}">${escapeXml(shown)}</text>
  </g>`];
  const lop = clamp((t - hit) / 0.2) * (1 - prog(t, b.t1 - 0.1, b.t1));
  if (b.label) parts.push(`<text x="540" y="${L.labelUnderY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="46" fill="${C.paper}" opacity="${r1(lop * 100) / 100}">${escapeXml(b.label)}</text>`);
  if (b.compare) {
    const cf = tl.script.facts.find(x => x.id === b.compare.fact);
    const cop = clamp((t - hit - 0.45) / 0.2) * (1 - prog(t, b.t1 - 0.1, b.t1));
    const txt = `${b.compare.label}: ${b.compare.value ?? cf?.value ?? ''}`;
    const w = measure(txt, 40, 800) + 60;
    parts.push(`<g opacity="${r1(cop * 100) / 100}"><rect x="${r1(540 - w / 2)}" y="${L.compareY - 46}" width="${r1(w)}" height="66" rx="33" fill="none" stroke="${C.grey}" stroke-width="4"/><text x="540" y="${L.compareY}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="${C.grey}">${escapeXml(txt)}</text></g>`);
  }
  return parts.join('');
}

function outroLayer(tl, b, t) {
  const k = a => ease.outBack(prog(t, b.t0 + a, b.t0 + a + 0.35));
  const cta = b.cta || 'Celý rozbor → odkaz v biu';
  const ctaW = measure(cta, 46, 900) + 90;
  const domain = tl.script.domain || 'skorezdravotnictvi.cz';
  return `
  <g transform="translate(540 470) scale(${r1(k(0.05) * 1000) / 1000})">
    <text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="900" font-size="104" letter-spacing="-2" fill="${C.paper}">Florence</text>
    <text x="0" y="62" text-anchor="middle" font-family="Inter" font-weight="800" font-size="38" fill="${C.amber}">AI autorka HSPA Monitoru</text>
  </g>
  <g transform="translate(540 690) rotate(-2) scale(${r1(k(0.25) * 1000) / 1000})">
    <rect x="${r1(-ctaW / 2)}" y="-54" width="${r1(ctaW)}" height="100" rx="50" fill="${C.amber}" stroke="${C.ink}" stroke-width="7"/>
    <text x="0" y="12" text-anchor="middle" font-family="Inter" font-weight="900" font-size="46" fill="${C.ink}">${escapeXml(cta)}</text>
  </g>
  <g opacity="${r1(prog(t, b.t0 + 0.45, b.t0 + 0.8) * 100) / 100}">
    <text x="540" y="830" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="${C.paper}">${escapeXml(domain)}</text>
    <text x="540" y="900" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="${C.grey}">${escapeXml(tl.script.source_line || '')}</text>
    <text x="540" y="936" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="${C.grey}">Text a animace: AI · redakce HSPA Monitor</text>
  </g>`;
}

function florencePose(tl, b, t) {
  const idx = tl.beats.indexOf(b);
  const enter = idx === 0 ? ease.outBack(prog(t, 0, 0.3)) : 1;
  const pop = Math.max(0, 1 - (t - b.t0) / 0.18);
  let gesture = b.gesture || (b.type === 'number' ? 'lamp' : b.type === 'outro' ? 'wave' : 'idle');
  const mood = b.mood || (b.type === 'outro' ? 'smile' : 'neutral');
  const talk = mouthOpen(b.sched, t);
  const speaking = b.sched && t >= b.sched.syl[0]?.t0 && t <= b.sched.end;
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

export function frameSvg(tl, t) {
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
  const capY = b.type === 'number' ? 420 : L.capY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g transform="${shake} translate(540 960) scale(${r1(z * 1000) / 1000}) translate(-540 -960)">
    ${background(t, pose.glow, fl.lamp || [540, 1200])}
    ${fl.svg}
    ${b.type === 'number' ? numberLayer(tl, b, t) : ''}
    ${b.type === 'outro' ? outroLayer(tl, b, t) : captions(b, t, capY)}
    ${b.type === 'number' && tl.script.footnote ? `<text x="540" y="${L.footY}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="25" fill="${C.grey}" opacity="${r1(clamp((t - b.t0 - 1) / 0.3) * 100) / 100}">${escapeXml(tl.script.footnote)}</text>` : ''}
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
  tl.beats.forEach((b, i) => {
    if (i > 0) sfx.whoosh(buf, b.t0);
    if (b.type === 'number') { sfx.riser(buf, b.t0, 0.8); sfx.boom(buf, b.t0 + 0.85); }
    if (b.type === 'outro') sfx.ding(buf, b.t0 + 0.4);
    if (b.sched) b.sched.wordStart.forEach((ws, k) => sfx.tick(buf, ws, k));
  });
  return buf;
}

// ───────────────────────────── validace ─────────────────────────────

export function validate(script) {
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
      if (sc.end + lead + 0.3 > b.dur) err(`${at}: titulky běží ${(sc.end + lead).toFixed(2)} s, beat má ${b.dur} s (nech ≥ 0,3 s rezervu)`);
    } else if (b.type === 'hook' || b.type === 'say') err(`${at}: chybí \`line\` (titulky)`);
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
  checkNumbers(beats.map(b => ({ ...b, compareLabel: b.compare?.label })), facts, err, ['line', 'label', 'cta', 'compareLabel']);
  if (beats.length && beats[0].type !== 'hook') err('první beat musí být hook (háček od prvního snímku)');
  if (beats.length && beats[beats.length - 1].type !== 'outro') err('poslední beat musí být outro (karta s odkazem a zdrojem)');
  if (total > LIMITS.maxDur) err(`délka ${total.toFixed(1)} s > ${LIMITS.maxDur} s`);
  if (total && total < LIMITS.minDur) err(`délka ${total.toFixed(1)} s < ${LIMITS.minDur} s`);
  if (!script.source_line) err('chybí `source_line` (zdroj na koncové kartě)');
  if (beats.some(b => b.type === 'number') && !script.footnote) err('chybí `footnote` (co číslo měří, rok)');
  return { errors, warnings, duration: total };
}
