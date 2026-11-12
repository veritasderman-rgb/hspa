#!/usr/bin/env node
// Ověření citací v data/pojistovny-prispevky.json proti webům pojišťoven.
//
// Pro každou adresu v datasetu (příspěvky, stropy, obecné podmínky) stáhne stránku nebo PDF,
// převede ji na text a hledá v něm doslovnou citaci. Porovnává se bez bílých znaků, takže
// nevadí zalomení řádků ani značky uvnitř věty. Stahuje nejvýš 1 požadavek za sekundu
// s hlavičkou User-Agent: ZdraveCesko-HSPA/1.0.
//
//   node ingest/verify-pojistovny-prispevky.js            # všech 7 pojišťoven
//   node ingest/verify-pojistovny-prispevky.js --zp 111   # jen jedna
//   node ingest/verify-pojistovny-prispevky.js --json out.json
//
// Výsledek: ok (citace nalezena) · drift (stránka stažena, citace v ní není) · nedostupne
// (HTTP chyba, timeout, nebo stránka skládaná JavaScriptem, kterou curl nevidí).
// Exit 1, pokud je aspoň jeden drift. Nic nezapisuje do datasetu.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'ZdraveCesko-HSPA/1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
  ndash: '–', mdash: '—', hellip: '…', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚', laquo: '«', raquo: '»',
  deg: '°', sect: '§', times: '×', euro: '€', copy: '©', reg: '®', middot: '·', bull: '•', frac12: '½', plusmn: '±', szlig: 'ß',
};
// &aacute; &ecaron; &uring; … = základní písmeno + kombinující znak (po NFC jeden znak)
const DIA = { acute: '\u0301', caron: '\u030c', ring: '\u030a', uml: '\u0308', circ: '\u0302', grave: '\u0300', tilde: '\u0303', cedil: '\u0327' };

export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([A-Za-z])(acute|caron|ring|uml|circ|grave|tilde|cedil);/g, (_, ch, d) => (ch + DIA[d]).normalize('NFC'))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

/** Text bez bílých znaků a neviditelných oddělovačů, NFC; pro porovnání citace se zdrojem. */
export function squash(s) {
  return String(s ?? '').normalize('NFC').replace(/[\s ­​-‍⁠﻿]+/g, '');
}

function fetchText(url) {
  const tmp = path.join(os.tmpdir(), `prisp-${process.pid}-${Date.now()}`);
  try {
    const head = execFileSync('curl', ['-sL', '-A', UA, '--max-time', '40', '-o', tmp, '-w', '%{http_code} %{content_type}', url], { encoding: 'utf8' });
    const [code, ...ct] = head.trim().split(' ');
    if (code !== '200') return { ok: false, duvod: `HTTP ${code}` };
    const buf = fs.readFileSync(tmp);
    const isPdf = /pdf/i.test(ct.join(' ')) || buf.subarray(0, 5).toString() === '%PDF-';
    if (isPdf) return { ok: true, text: execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) };
    return { ok: true, text: htmlToText(buf.toString('utf8')) };
  } catch (e) {
    return { ok: false, duvod: String(e.message || e).split('\n')[0].slice(0, 120) };
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) { /* nic */ }
  }
}

export function polozkyKOvereni(D, jenKod = null) {
  const out = [];
  for (const z of D.pojistovny || []) {
    if (jenKod && z.kod !== jenKod) continue;
    for (const p of z.prispevky || []) out.push({ kod: z.kod, typ: 'prispevek', id: p.id, url: p.url, citace: p.citace });
    for (const s of z.stropy || []) out.push({ kod: z.kod, typ: 'strop', id: s.id, url: s.url, citace: s.citace });
    for (const [i, c] of (z.obecne_podminky || []).entries()) out.push({ kod: z.kod, typ: 'podminka', id: String(i), url: c.url, citace: c.citace });
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const file = arg('--data') || path.join(ROOT, 'data', 'pojistovny-prispevky.json');
  const D = JSON.parse(fs.readFileSync(file, 'utf8'));
  const items = polozkyKOvereni(D, arg('--zp'));
  const cache = new Map();
  const vysledky = [];
  for (const it of items) {
    if (!cache.has(it.url)) {
      const r = fetchText(it.url);
      cache.set(it.url, r.ok ? { ok: true, sq: squash(r.text) } : r);
      await sleep(1000);
    }
    const page = cache.get(it.url);
    const stav = !page.ok ? 'nedostupne' : (page.sq.includes(squash(it.citace)) ? 'ok' : 'drift');
    vysledky.push({ ...it, stav, duvod: page.ok ? undefined : page.duvod });
  }
  const pocty = {};
  for (const v of vysledky) {
    pocty[v.kod] ??= { ok: 0, drift: 0, nedostupne: 0 };
    pocty[v.kod][v.stav] += 1;
  }
  for (const [kod, p] of Object.entries(pocty)) console.log(`${kod}: ok ${p.ok} · drift ${p.drift} · nedostupné ${p.nedostupne}`);
  for (const v of vysledky.filter((x) => x.stav !== 'ok')) console.log(`  ${v.stav.toUpperCase()} ${v.kod} ${v.typ} ${v.id} ${v.url}${v.duvod ? ` (${v.duvod})` : ''}`);
  const out = arg('--json');
  if (out) fs.writeFileSync(out, JSON.stringify({ overeno_at: new Date().toISOString(), pocty, vysledky }, null, 2));
  process.exit(vysledky.some((v) => v.stav === 'drift') ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
