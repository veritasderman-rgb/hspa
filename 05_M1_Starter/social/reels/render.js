#!/usr/bin/env node
// Renderer animovaných příspěvků s Kompíkem.
//
//   node social/reels/render.js <slug|cesta.json> [volby]
//
//   (bez voleb)        MP4 30 fps (9:16 1080×1920, se `"format": "landscape"` 16:9 1920×1080) + plakát → assets/social/reels/<slug>.mp4 / .png
//   --check            jen validace scénáře (exit 1 při chybě)
//   --all              s --check: validuje všechny scénáře v social/reels/scripts/
//   --sheet            kontaktní arch 4×3 klíčových snímků → <out>/<slug>-arch.png (náhled pro kontrolu)
//   --frame <s>        jeden snímek v čase s (sekundy) → <out>/<slug>-<s>s.png
//   --voice-timing     jen zapíše voice/<slug>/timing.json (časy řeči pro validaci bez ffmpeg; dělá i každý render)
//   --poster-time      vypíše čas plakátu v ms (= thumbnailOffset pro Buffer)
//   --out <adresář>    výstupní adresář (video: assets/social/reels, náhledy: social/reels/out — gitignored)
//   --fps <n>          snímková frekvence (výchozí 30)
//
// Pipeline: scénář → compile() → pro každý snímek frameSvg(t) → resvg (PNG) → ffmpeg
// (H.264 yuv420p + AAC z wav syntetizovaného v lib/audio.js). Nic se nestahuje ze sítě.

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { Resvg } from '@resvg/resvg-js';
import { compile, frameSvg, audioTrack, validate, dims } from './lib/styles.js';
import { writeWav } from './lib/audio.js';
import { RESVG_FONT } from './lib/text.js';
import { writeVoiceTiming } from './lib/voice.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS = resolve(ROOT, 'social', 'reels', 'scripts');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
}
const has = name => process.argv.includes(name);

export function loadScript(ref) {
  const path = ref.endsWith('.json') ? resolve(ref) : resolve(SCRIPTS, `${ref}.json`);
  if (!existsSync(path)) throw new Error(`scénář nenalezen: ${path}`);
  return { path, script: JSON.parse(readFileSync(path, 'utf8')) };
}

export function renderPng(svg, width = 1080) {
  return new Resvg(svg, { font: RESVG_FONT, fitTo: { mode: 'width', value: width } }).render().asPng();
}

function contactSheet(tl, out) {
  const { W, H } = dims(tl);
  const n = 12, cols = W > H ? 3 : 4, tw = W > H ? 480 : 270, th = Math.round(tw * H / W), gap = 12;
  const rows = Math.ceil(n / cols);
  const cells = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(tl.duration - 0.05, (i + 0.5) * (tl.duration / n));
    const png = renderPng(frameSvg(tl, t), tw).toString('base64');
    const x = gap + (i % cols) * (tw + gap), y = gap + Math.floor(i / cols) * (th + gap + 30);
    cells.push(`<image x="${x}" y="${y}" width="${tw}" height="${th}" href="data:image/png;base64,${png}"/>
      <text x="${x + tw / 2}" y="${y + th + 24}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="20" fill="#1F1A14">${t.toFixed(2)} s</text>`);
  }
  const sw = gap + cols * (tw + gap), sh = gap + rows * (th + gap + 30);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" fill="#fff"/>${cells.join('')}</svg>`;
  writeFileSync(out, new Resvg(svg, { font: RESVG_FONT }).render().asPng());
}

/**
 * Čas plakátu (s): `poster_at` ze scénáře, jinak konec pointy (Kompík)
 * nebo 1,6 s po začátku nasvíceného čísla (Florence), jinak polovina videa.
 * Stejná hodnota v ms je `thumbnailOffset` videa v Bufferu.
 */
export function posterTime(tl) {
  if (tl.script.poster_at != null) return tl.script.poster_at;
  const pb = tl.beats.find(b => b.type === 'punch');
  if (pb) return pb.t1 - 0.35;
  const nb = tl.beats.find(b => b.type === 'number');
  if (nb) return Math.min(nb.t1 - 0.2, nb.t0 + 1.6);
  return tl.duration / 2;
}

async function encode(tl, outMp4, fps) {
  const wav = resolve(tmpdir(), `reel-${process.pid}.wav`);
  writeWav(wav, audioTrack(tl));
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-i', wav,
    // kvalita: `crf` ve scénáři (výchozí 22); delší videa na šířku 24–26, ať se vejdou do ~3 MB
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(tl.script.crf || 22), '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-r', String(fps),
    // hlasitost pro sociální sítě (~ −15 LUFS, true peak −1,5 dB)
    '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-movflags', '+faststart', '-shortest', outMp4,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, ko) => ff.on('close', c => (c === 0 ? ok() : ko(new Error(`ffmpeg skončil kódem ${c}`)))));
  const frames = Math.round(tl.duration * fps);
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const png = renderPng(frameSvg(tl, f / fps), dims(tl).W);
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % fps === 0) process.stdout.write(`\r  snímek ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  rmSync(wav, { force: true });
  process.stdout.write(`\r  ${frames} snímků za ${((Date.now() - t0) / 1000).toFixed(0)} s          \n`);
}

async function main() {
  if (has('--check') && has('--all')) {
    let bad = 0;
    for (const f of readdirSync(SCRIPTS).filter(x => x.endsWith('.json')).sort()) {
      const { errors, warnings, duration } = validate(JSON.parse(readFileSync(resolve(SCRIPTS, f), 'utf8')));
      warnings.forEach(w => console.warn(`⚠ ${f}: ${w}`));
      errors.forEach(e => console.error(`✗ ${f}: ${e}`));
      if (errors.length) bad++; else console.log(`✓ ${f} (${duration.toFixed(1)} s)`);
    }
    process.exit(bad ? 1 : 0);
  }
  const ref = process.argv.slice(2).find(a => !a.startsWith('--') && !/^\d+(\.\d+)?$/.test(a) && a !== arg('--out') );
  if (!ref) { console.error('použití: node social/reels/render.js <slug|scénář.json> [--check|--sheet|--frame s] [--out dir]'); process.exit(2); }
  const { path, script } = loadScript(ref);
  const slug = script.slug || basename(path, '.json');
  const { errors, warnings, duration } = validate(script);
  warnings.forEach(w => console.warn(`⚠ ${w}`));
  if (errors.length) { errors.forEach(e => console.error(`✗ ${e}`)); process.exit(1); }
  console.log(`✓ scénář ${slug}: ${script.beats.length} beatů, ${duration.toFixed(1)} s`);
  if (has('--check')) return;
  if (script.beats.some(b => b.voice)) {
    for (const p of writeVoiceTiming(script)) console.log(`✓ časování hlasu → ${p}`);
    if (has('--voice-timing')) return;
  }

  const preview = has('--sheet') || has('--frame');
  const out = resolve(arg('--out', preview ? resolve(ROOT, 'social', 'reels', 'out') : resolve(ROOT, 'assets', 'social', 'reels')));
  mkdirSync(out, { recursive: true });
  const tl = compile(script);
  const fps = Number(arg('--fps', script.fps || 30));

  if (has('--poster-time')) {
    console.log(Math.round(posterTime(tl) * 1000));
    return;
  }
  if (has('--sheet')) {
    const p = resolve(out, `${slug}-arch.png`);
    contactSheet(tl, p);
    console.log(`✓ kontaktní arch → ${p}`);
    return;
  }
  if (has('--frame')) {
    const t = Number(arg('--frame'));
    const p = resolve(out, `${slug}-${t}s.png`);
    writeFileSync(p, renderPng(frameSvg(tl, t), dims(tl).W));
    console.log(`✓ snímek ${t} s → ${p}`);
    return;
  }
  const mp4 = resolve(out, `${slug}.mp4`);
  await encode(tl, mp4, fps);
  const posterT = posterTime(tl);
  writeFileSync(resolve(out, `${slug}.png`), renderPng(frameSvg(tl, posterT), dims(tl).W));
  console.log(`✓ video → ${mp4}\n✓ plakát (${posterT.toFixed(1)} s) → ${resolve(out, `${slug}.png`)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
