// Animační primitiva pro reels: easingy, tweeny, deterministický šum.
// Všechno je čistá funkce času t (sekundy) — stejný vstup = stejný snímek.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

/** Normalizovaný postup 0..1 mezi časy t0 a t1. */
export const prog = (t, t0, t1) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));

export const ease = {
  linear: k => k,
  inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  // přestřelení — „pop" postaviček a cedulí
  outBack: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  // pružina — doznívání střelky
  outElastic: k => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};

/** Tween hodnoty a→b v intervalu [t0,t1]. */
export function tween(t, t0, t1, a, b, fn = ease.inOut) {
  return lerp(a, b, fn(prog(t, t0, t1)));
}

/**
 * Klíčové snímky: [[t, value, easing?], …] (seřazené podle t).
 * Mimo rozsah drží krajní hodnotu.
 */
export function keys(t, frames) {
  if (!frames.length) return 0;
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, fn] = frames[i];
    const [t0, v0] = frames[i - 1];
    if (t <= t1) return lerp(v0, v1, (fn || ease.inOut)(prog(t, t0, t1)));
  }
  return frames[frames.length - 1][1];
}

/** Squash & stretch dopadu: vrací y-scale (x-scale = 1/y). */
export function squashAt(t, tHit, amount = 0.18, dur = 0.35) {
  if (t < tHit || t > tHit + dur) return 1;
  const k = (t - tHit) / dur;
  return 1 - amount * Math.sin(k * Math.PI * 2.2) * (1 - k);
}

/** Deterministický pseudonáhodný generátor (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash řetězce na seed. */
export function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Mrkání: vrací 0 (otevřeno) … 1 (zavřeno). Rozptýlené podle seedu, ~každé 3 s. */
export function blink(t, seed = 1) {
  const period = 2.6 + (seed % 7) * 0.23;
  const phase = ((seed % 13) / 13) * period;
  const local = (t + phase) % period;
  const d = 0.14;
  if (local > d) return 0;
  return Math.sin((local / d) * Math.PI);
}

export const escapeXml = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const r1 = v => Math.round(v * 10) / 10;
