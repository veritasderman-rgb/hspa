// Mluvený hlas (volitelný) — nahraná replika k beatu místo žvatlání / psacího stroje.
//
// Výchozí videa hlas nemají (Kompík žvatlá, Florence má titulky). U webových videí
// na šířku může vydavatel povolit syntetický český hlas (ElevenLabs, hlas z knihovny,
// nikdy klon skutečné osoby). Beat pak nese `"voice": "social/reels/voice/<slug>/NN.mp3"`
// (cesta od 05_M1_Starter/), soubor je v gitu a render zůstává offline.
//
// loadVoice() dekóduje soubor přes ffmpeg na mono float PCM a najde začátek a konec
// řeči; alignSchedule() natáhne rozvrh slabik (bublina, titulky, pusa) na skutečnou řeč.
//
// Časování řeči je navíc zapsané v `voice/<slug>/timing.json` (vedle mp3, v gitu).
// Kde ffmpeg není (CI runner), validace a kompilace čtou časy odtud; hash souboru
// hlídá, že manifest patří k dnešní nahrávce. Přegeneruje ho každý render, ručně
// `node social/reels/render.js <slug> --voice-timing`.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR } from './audio.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cache = new Map();

export const voicePath = rel => resolve(ROOT, rel);

let ffmpegOk;
export function hasFfmpeg() {
  // REELS_NO_FFMPEG=1 simuluje runner bez ffmpeg (test)
  if (ffmpegOk === undefined) ffmpegOk = process.env.REELS_NO_FFMPEG !== '1' && spawnSync('ffmpeg', ['-version']).status === 0;
  return ffmpegOk;
}

export const timingPath = rel => resolve(dirname(voicePath(rel)), 'timing.json');
const timingKey = (rel, tempo) => `${basename(rel)}@${tempo}`;
const fileHash = path => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);

function readTiming(rel) {
  const p = timingPath(rel);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

/**
 * { pcm: Float32Array | null, start, end (s, řeč), dur (s, celý soubor) } — nebo null, když soubor chybí.
 * Bez ffmpeg vrací časy z timing.json a `pcm: null` (stačí na validaci a kompilaci, ne na render).
 */
export function loadVoice(rel, tempo = 1) {
  const key = `${rel}@${tempo}`;
  if (cache.has(key)) return cache.get(key);
  const path = voicePath(rel);
  if (!existsSync(path)) return null;
  if (!hasFfmpeg()) {
    const e = readTiming(rel)[timingKey(rel, tempo)];
    if (!e) throw new Error(`${rel}: chybí časování v ${basename(dirname(path))}/timing.json a ffmpeg není k dispozici (spusť render.js <slug> --voice-timing)`);
    if (e.sha256 !== fileHash(path)) throw new Error(`${rel}: timing.json neodpovídá nahrávce (soubor se změnil — spusť render.js <slug> --voice-timing)`);
    const info = { pcm: null, start: e.start, end: e.end, dur: e.dur };
    cache.set(key, info);
    return info;
  }
  // tempo ≠ 1: zrychlení bez změny výšky hlasu (ffmpeg atempo)
  const af = tempo !== 1 ? ['-af', `atempo=${tempo}`] : [];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, ...af, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg nedekódoval ${rel}: ${r.stderr}`);
  const b = r.stdout;
  const pcm = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const win = Math.round(SR * 0.01);
  let first = -1, last = -1;
  for (let i = 0; i + win <= pcm.length; i += win) {
    let s = 0;
    for (let k = 0; k < win; k++) s += pcm[i + k] * pcm[i + k];
    if (Math.sqrt(s / win) > 0.02) { if (first < 0) first = i; last = i + win; }
  }
  const info = { pcm, start: first < 0 ? 0 : first / SR, end: last < 0 ? pcm.length / SR : last / SR, dur: pcm.length / SR };
  cache.set(key, info);
  return info;
}

/** Zapíše timing.json pro všechny hlasové beaty scénáře (potřebuje ffmpeg). Vrátí cesty zapsaných souborů. */
export function writeVoiceTiming(script) {
  const tempo = script.voice_tempo || 1;
  const byFile = new Map();
  for (const b of script.beats) {
    if (!b.voice) continue;
    const v = loadVoice(b.voice, tempo);
    if (!v) continue;
    const p = timingPath(b.voice);
    if (!byFile.has(p)) byFile.set(p, readTiming(b.voice));
    byFile.get(p)[timingKey(b.voice, tempo)] = { sha256: fileHash(voicePath(b.voice)), start: v.start, end: v.end, dur: v.dur };
  }
  for (const [p, m] of byFile) {
    const sorted = Object.fromEntries(Object.keys(m).sort().map(k => [k, m[k]]));
    writeFileSync(p, JSON.stringify(sorted, null, 2) + '\n');
  }
  return [...byFile.keys()];
}

/** Natáhne rozvrh slabik a slov na interval skutečné řeči [speakAt, speakAt + délka řeči]. */
export function alignSchedule(sched, speakAt, v) {
  if (!sched?.syl?.length || !v) return sched;
  const a0 = sched.syl[0].t0, a1 = sched.end;
  // Hlas říká víc než bublina/titulek (výčet na tabuli, dovětek) → text jen posuň, nenatahuj.
  const speech = v.end - v.start, ratio = speech / Math.max(1e-6, a1 - a0);
  const b0 = speakAt, b1 = speakAt + (ratio > 1.6 ? a1 - a0 : speech);
  const map = t => b0 + ((t - a0) / Math.max(1e-6, a1 - a0)) * (b1 - b0);
  return {
    ...sched,
    syl: sched.syl.map(s => ({ ...s, t0: map(s.t0), t1: map(s.t1) })),
    wordStart: sched.wordStart.map(map),
    end: b1,
  };
}

/** Kdy začne přehrávání souboru, aby řeč začala přesně v `speakAt`. */
export const voiceStart = (speakAt, v) => speakAt - v.start;

export function mixVoice(buf, t0, v, gain = 0.9) {
  if (!v.pcm) return; // bez ffmpeg (časy z timing.json) jen ticho — render ffmpeg potřebuje stejně
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < v.pcm.length; i++) {
    const j = i0 + i;
    if (j >= 0 && j < buf.length) buf[j] += v.pcm[i] * gain;
  }
}

/** Ztlumí podkres pod hlasem (s náběhem a doběhem 0,12 s). */
export function duck(buf, t0, t1, gain = 0.35, ramp = 0.12) {
  const a = Math.max(0, Math.floor((t0 - ramp) * SR)), b = Math.min(buf.length, Math.ceil((t1 + ramp) * SR));
  for (let j = a; j < b; j++) {
    const t = j / SR;
    const k = t < t0 ? (t0 - t) / ramp : t > t1 ? (t - t1) / ramp : 0;
    buf[j] *= gain + (1 - gain) * Math.min(1, k);
  }
}

export const hasVoice = tl => tl.beats.some(b => b.voice);

/** Otevření pusy podle skutečné hlasitosti hlasu v čase t (0..1), mimo řeč 0. */
export function voiceMouth(b, t) {
  if (!b?.v?.pcm) return voiceSpeaking(b, t) ? 0.5 : 0;
  const ts = t - b.voiceAt;
  if (ts < b.v.start || ts > b.v.end) return 0;
  const i0 = Math.max(0, Math.round((ts - 0.02) * SR)), i1 = Math.min(b.v.pcm.length, Math.round((ts + 0.02) * SR));
  let s = 0;
  for (let i = i0; i < i1; i++) s += b.v.pcm[i] * b.v.pcm[i];
  const rms = Math.sqrt(s / Math.max(1, i1 - i0));
  return Math.min(1, rms * 5);
}

/** Mluví postava v čase t (podle hlasu)? */
export const voiceSpeaking = (b, t) => !!b?.v && t - b.voiceAt >= b.v.start && t - b.voiceAt <= b.v.end;

// ───────────────── hudba a efekty ze souboru (ElevenLabs Music / Sound Effects) ─────────────────
// Na rozdíl od hlasu neřídí časování, takže nepotřebují timing.json: bez ffmpeg
// (CI runner) se jen ověří, že soubor existuje, a do zvuku se nepřimíchají.

const clipCache = new Map();

/** { pcm: Float32Array | null, dur } — nebo null, když soubor chybí. */
export function loadClip(rel) {
  if (clipCache.has(rel)) return clipCache.get(rel);
  const path = voicePath(rel);
  if (!existsSync(path)) return null;
  let info = { pcm: null, dur: 0 };
  if (hasFfmpeg()) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 256 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`ffmpeg nedekódoval ${rel}: ${r.stderr}`);
    const b = r.stdout;
    const pcm = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    info = { pcm, dur: pcm.length / SR };
  }
  clipCache.set(rel, info);
  return info;
}

/** Špička klipu (pro normalizaci hlasitosti nezávisle na tom, jak hlasitě byl vygenerován). */
function clipPeak(c) {
  if (c.peak == null) { let m = 0; for (const v of c.pcm) { const a = Math.abs(v); if (a > m) m = a; } c.peak = m || 1; }
  return c.peak;
}

/** Jednorázový efekt v čase t0; `gain` je cílová špička (0..1). */
export function mixClip(buf, t0, c, gain = 0.5) {
  if (!c?.pcm) return;
  const k = gain / clipPeak(c), i0 = Math.round(t0 * SR);
  for (let i = 0; i < c.pcm.length; i++) {
    const j = i0 + i;
    if (j >= 0 && j < buf.length) buf[j] += c.pcm[i] * k;
  }
}

/** Hudební podkres ze souboru: smyčka přes celou délku, náběh 0,3 s, doběh 0,8 s. */
export function mixMusic(buf, seconds, c, gain = 0.2) {
  if (!c?.pcm?.length) return;
  const k = gain / clipPeak(c), n = Math.min(buf.length, Math.round(seconds * SR));
  // přeskoč ticho na začátku nahrávky
  let off = 0;
  while (off < c.pcm.length - 1 && Math.abs(c.pcm[off]) < 0.01) off++;
  const len = c.pcm.length - off;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const env = Math.min(1, t / 0.3) * Math.min(1, (seconds - t) / 0.8);
    buf[j] += c.pcm[off + (j % len)] * k * Math.max(0, env);
  }
}

/** Efekty u beatů: `"sfx": [{ "file": "social/reels/audio/sfx/x.mp3", "at": 0.4, "gain": 0.5 }]`. */
export function mixBeatSfx(buf, tl) {
  for (const b of tl.beats) for (const e of b.sfx || []) mixClip(buf, b.t0 + (e.at || 0), loadClip(e.file), e.gain ?? 0.5);
}

/** Validace hudby a efektů ze souboru (existence, cesta, časy). */
export function checkAudioFiles(script, err) {
  const ok = f => typeof f === 'string' && /^social\/reels\/audio\/[a-z0-9/_-]+\.mp3$/.test(f);
  if (script.music != null) {
    if (!ok(script.music)) err('`music` musí být cesta social/reels/audio/….mp3');
    else if (!existsSync(voicePath(script.music))) err(`hudba ${script.music} neexistuje`);
    if (script.music_gain != null && !(script.music_gain > 0 && script.music_gain <= 0.5)) err('`music_gain` musí být v rozsahu (0; 0,5]');
  }
  (script.beats || []).forEach((b, i) => (b.sfx || []).forEach((e, k) => {
    const at = `beat ${i + 1} (${b.type}): sfx ${k + 1}`;
    if (!ok(e.file)) err(`${at} — \`file\` musí být cesta social/reels/audio/….mp3`);
    else if (!existsSync(voicePath(e.file))) err(`${at} — soubor ${e.file} neexistuje`);
    if (e.at != null && !(e.at >= 0 && e.at < b.dur)) err(`${at} — \`at\` musí ležet v beatu`);
    if (e.gain != null && !(e.gain > 0 && e.gain <= 1)) err(`${at} — \`gain\` musí být v rozsahu (0; 1]`);
  }));
}
