// Zvuk animovaných příspěvků — celý syntetizovaný v kódu (žádné licencované samply,
// žádná placená služba, deterministický výstup). Tři vrstvy:
//   1. hudební podkres (veselá smyčka I–V–vi–IV, při „smutné" pointě se ztiší)
//   2. Kompíkovo žvatlání (tón na slabiku, otázka stoupá)
//   3. efekty: pop, plop (postavička naskočí — stoupající tón = „počítání"),
//      whoosh, slam, ding, tada, smutný trombon (wah-wah-waaah)
// Výstup: 16bit mono WAV 44,1 kHz → ffmpeg ho přimíchá do MP4 (AAC).

import { writeFileSync } from 'node:fs';
import { rng } from './anim.js';

export const SR = 44100;

export function track(seconds) { return new Float32Array(Math.ceil(seconds * SR)); }

const TAU = Math.PI * 2;

function addTone(buf, t0, dur, { f0, f1 = f0, gain = 0.3, wave = 'sine', attack = 0.005, release = 0.06, vibrato = 0, vibRate = 6 }) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && i0 + i < buf.length; i++) {
    const t = i / SR;
    const k = t / dur;
    let f = f0 * Math.pow(f1 / f0, k);
    if (vibrato) f *= 1 + vibrato * Math.sin(TAU * vibRate * t);
    ph += (TAU * f) / SR;
    let s;
    if (wave === 'square') s = Math.sin(ph) + Math.sin(3 * ph) / 3 + Math.sin(5 * ph) / 5;
    else if (wave === 'tri') s = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else if (wave === 'saw') s = Math.sin(ph) + Math.sin(2 * ph) / 2 + Math.sin(3 * ph) / 3 + Math.sin(4 * ph) / 4;
    else if (wave === 'bell') s = Math.sin(ph) + 0.5 * Math.sin(2.01 * ph) + 0.25 * Math.sin(3.98 * ph);
    else s = Math.sin(ph);
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    buf[i0 + i] += s * gain * Math.max(0, env);
  }
}

function addNoise(buf, t0, dur, { gain = 0.2, seed = 7, lp0 = 0.05, lp1 = 0.5, release = 0.08 }) {
  const r = rng(seed);
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const n = Math.floor(dur * SR);
  let y = 0;
  for (let i = 0; i < n && i0 + i < buf.length; i++) {
    const k = i / n;
    const a = lp0 + (lp1 - lp0) * Math.sin(k * Math.PI);   // jednoduchý low-pass „sweep"
    y += a * ((r() * 2 - 1) - y);
    const env = Math.min(1, (i / SR) / 0.01) * Math.min(1, (dur - i / SR) / release);
    buf[i0 + i] += y * gain * env;
  }
}

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

export const sfx = {
  pop: (b, t) => addTone(b, t, 0.11, { f0: 320, f1: 980, gain: 0.32, release: 0.05 }),
  plop: (b, t, k = 0) => addTone(b, t, 0.07, { f0: 520 * Math.pow(2, Math.min(k, 24) / 24), f1: 820 * Math.pow(2, Math.min(k, 24) / 24), gain: 0.13, wave: 'tri', release: 0.04 }),
  whoosh: (b, t) => addNoise(b, t, 0.35, { gain: 0.32, lp0: 0.02, lp1: 0.35, seed: 11 }),
  slam: (b, t) => { addTone(b, t, 0.28, { f0: 140, f1: 48, gain: 0.55, release: 0.2 }); addNoise(b, t, 0.18, { gain: 0.3, lp0: 0.3, lp1: 0.6, seed: 5 }); },
  ding: (b, t) => { addTone(b, t, 1.1, { f0: NOTE(88), gain: 0.18, wave: 'bell', release: 1.0 }); addTone(b, t + 0.09, 1.0, { f0: NOTE(93), gain: 0.12, wave: 'bell', release: 0.9 }); },
  tada: (b, t) => [72, 76, 79, 84].forEach((n, i) => addTone(b, t + i * 0.09, i === 3 ? 0.6 : 0.14, { f0: NOTE(n), gain: 0.2, wave: 'square', release: i === 3 ? 0.45 : 0.05 })),
  sad: (b, t) => [[58, 0.32], [57, 0.32], [56, 0.32], [55, 1.0]].reduce((tt, [n, d], i) => {
    addTone(b, tt, d, { f0: NOTE(n), gain: 0.22, wave: 'saw', attack: 0.03, release: 0.12, vibrato: i === 3 ? 0.02 : 0.004, vibRate: 5.5 });
    return tt + d + 0.04;
  }, t),
  spin: (b, t) => { for (let i = 0; i < 6; i++) addTone(b, t + i * 0.06, 0.05, { f0: 900 + i * 120, gain: 0.08, wave: 'tri' }); },
  boing: (b, t) => addTone(b, t, 0.4, { f0: 180, f1: 420, gain: 0.25, vibrato: 0.08, vibRate: 18, release: 0.2 }),
  // styl Florence: psací stroj, hluboký úder, náběh
  tick: (b, t, k = 0) => { addNoise(b, t, 0.03, { gain: 0.16, lp0: 0.7, lp1: 0.95, seed: 31 + k, release: 0.02 }); addTone(b, t, 0.03, { f0: 1800 + (k % 3) * 140, gain: 0.04, wave: 'tri', release: 0.02 }); },
  boom: (b, t) => { addTone(b, t, 0.9, { f0: 95, f1: 38, gain: 0.7, release: 0.7 }); addNoise(b, t, 0.25, { gain: 0.25, lp0: 0.2, lp1: 0.5, seed: 9 }); },
  riser: (b, t, d = 0.6) => { addNoise(b, t, d, { gain: 0.22, lp0: 0.02, lp1: 0.6, seed: 13, release: 0.02 }); addTone(b, t, d, { f0: 220, f1: 880, gain: 0.06, wave: 'saw', release: 0.03 }); },
};

/**
 * Noční podkres stylu Florence: mollová smyčka Am–F–C–G, 96 BPM, kopák na dobu,
 * šum na offbeatu, měkké plucky. Tlumenější a „tajemnější" než Kompíkova smyčka.
 */
export function musicNight(buf, seconds, { bpm = 96, gain = 0.08 } = {}) {
  const beat = 60 / bpm;
  const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const steps = Math.ceil(seconds / (beat / 2));
  for (let i = 0; i < steps; i++) {
    const t = i * (beat / 2);
    if (t > seconds - 0.2) break;
    const chord = prog[Math.floor(i / 8) % 4];
    if (i % 2 === 0) addTone(buf, t, 0.22, { f0: 120, f1: 45, gain: gain * 3.2, release: 0.16 });
    if (i % 4 === 2) addNoise(buf, t, 0.12, { gain: gain * 1.1, lp0: 0.35, lp1: 0.6, seed: i, release: 0.08 });
    if (i % 2 === 1) addNoise(buf, t, 0.03, { gain: gain * 0.6, lp0: 0.8, lp1: 0.95, seed: 100 + i, release: 0.02 });
    if (i % 2 === 0) addTone(buf, t, beat * 0.9, { f0: NOTE(chord[0] - 24), gain: gain * 1.6, release: 0.3 });
    if ([0, 3, 5].includes(i % 8)) addTone(buf, t, beat * 0.6, { f0: NOTE(chord[(i % 8) % 3] + 12), gain: gain * 0.8, wave: 'tri', release: 0.25 });
  }
}

/** Žvatlání po slabikách. base = výška hlasu (Hz). */
export function babble(buf, sched, { base = 560, gain = 0.15, seed = 3 } = {}) {
  const r = rng(seed);
  const vf = { a: 1, á: 1, e: 1.12, é: 1.12, ě: 1.12, i: 1.26, í: 1.26, y: 1.26, ý: 1.26, o: 0.9, ó: 0.9, u: 0.82, ú: 0.82, ů: 0.82 };
  sched.syl.forEach((s, i) => {
    const jitter = 0.94 + r() * 0.12;
    let f = base * (vf[s.vowel] || 1) * jitter;
    const rise = s.q ? 1 + 0.18 * (i - (sched.syl.length - 3)) : 1;
    f *= rise;
    const d = Math.max(0.05, s.t1 - s.t0);
    addTone(buf, s.t0, d, { f0: f, f1: f * (s.q ? 1.12 : 0.97), gain, wave: 'square', attack: 0.004, release: 0.03 });
  });
}

/**
 * Hudební podkres. mood(t) → 'up' | 'down' (při 'down' tóny ztlumí a zmollí).
 * 112 BPM, osminová arpeggia + basa na dobu + jemný šum na offbeatu.
 */
export function music(buf, seconds, { bpm = 112, gain = 0.07, mood = () => 'up' } = {}) {
  const beat = 60 / bpm;
  const prog = [[48, 52, 55, 60], [43, 47, 50, 55], [45, 48, 52, 57], [41, 45, 48, 53]]; // C G Am F
  const steps = Math.ceil(seconds / (beat / 2));
  for (let i = 0; i < steps; i++) {
    const t = i * (beat / 2);
    if (t > seconds - 0.2) break;
    const bar = Math.floor(i / 8) % 4;
    const chord = prog[bar];
    const down = mood(t) === 'down';
    const g = down ? gain * 0.45 : gain;
    const note = chord[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]] + 12 - (down && bar % 2 === 0 ? 1 : 0);
    addTone(buf, t, beat * 0.45, { f0: NOTE(note), gain: g * 0.9, wave: 'tri', release: 0.12 });
    if (i % 2 === 0) addTone(buf, t, beat * 0.9, { f0: NOTE(chord[0] - 12), gain: g * 1.4, release: 0.3 });
    if (i % 2 === 1 && !down) addNoise(buf, t, 0.04, { gain: g * 0.5, lp0: 0.6, lp1: 0.9, seed: i, release: 0.03 });
  }
}

/** Normalizace + zápis WAV (16bit PCM mono). */
export function writeWav(path, buf, { peak = 0.89 } = {}) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const k = max > peak ? peak / max : 1;
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * k)) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}
