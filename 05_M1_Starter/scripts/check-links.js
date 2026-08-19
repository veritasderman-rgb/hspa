#!/usr/bin/env node
// Klasifikace externích odkazů pro noční rutinu (issue #1003).
//
// Problém, který řeší: `curl` vrací u MRTVÉ domény i u domény blokované
// síťovou politikou běhového prostředí shodně kód 000. V reportu pak není
// poznat rozdíl mezi „ověřeno OK" a „nedalo se ověřit" — a tichý slepý bod
// se čte jako úspěch. Rozlišit je umí až DNS dotaz.
//
// Klasifikace:
//   ok       — HTTP odpověď (2xx/3xx, případně 401/403 = bot-block, ale doména žije)
//   http_err — HTTP odpověď 404/410/5xx → odkaz je opravdu rozbitý
//   dead     — doména se nerozresolvuje (NXDOMAIN) → odkaz je mrtvý
//   blocked  — doména se resolvuje, ale spojení neprojde → politika prostředí,
//              NELZE číst jako ověřený zdroj
//
// Použití:
//   node scripts/check-links.js https://a.cz https://b.cz
//   node scripts/check-links.js --file seznam.txt
//   node scripts/check-links.js --corpus            # všechny prioritní odkazy z článků
//   node scripts/check-links.js --json              # strojový výstup

import { promises as dns } from 'node:dns';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'ZdraveCesko-HSPA/1.0';
const TIMEOUT_S = 12;

export async function resolves(host) {
  try {
    await dns.lookup(host);
    return true;
  } catch (e) {
    if (e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN') return false;
    return false;
  }
}

export async function httpStatus(url) {
  try {
    const { stdout } = await execFileAsync('curl', [
      '-sS', '-o', '/dev/null', '-w', '%{http_code}',
      '-L', '--max-time', String(TIMEOUT_S), '-A', UA, url,
    ], { timeout: (TIMEOUT_S + 3) * 1000 });
    return parseInt(String(stdout).trim().slice(0, 3), 10) || 0;
  } catch {
    return 0;
  }
}

export async function classify(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return { url, status: 'invalid', code: null, host: null };
  }
  const code = await httpStatus(url);
  if (code >= 200 && code < 400) return { url, host, status: 'ok', code };
  if (code === 401 || code === 403) return { url, host, status: 'ok', code, note: 'bot-block, doména žije' };
  if (code > 0) return { url, host, status: 'http_err', code };
  // Kód 0 — teprve teď se ptáme DNS, protože jen ono odliší mrtvé od blokovaného.
  const alive = await resolves(host);
  return alive
    ? { url, host, status: 'blocked', code: 0, note: 'DNS resolvuje, spojení neprojde — politika prostředí, NEověřeno' }
    : { url, host, status: 'dead', code: 0, note: 'NXDOMAIN — doména neexistuje' };
}

function corpusLinks() {
  const urls = new Set();
  for (const f of readdirSync(ROOT).filter(f => /^clanek-.*\.html$/.test(f))) {
    const html = readFileSync(join(ROOT, f), 'utf8');
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) urls.add(m[1]);
  }
  const dir = join(ROOT, 'indicators');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/"(https?:\/\/[^"]+)"/g)) urls.add(m[1]);
    }
  }
  return [...urls];
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  let urls = args.filter(a => /^https?:\/\//.test(a));
  if (args.includes('--file')) {
    const p = args[args.indexOf('--file') + 1];
    urls = readFileSync(p, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  }
  if (args.includes('--corpus')) urls = corpusLinks();
  if (!urls.length) {
    console.error('Použití: node scripts/check-links.js <url…> | --file <soubor> | --corpus [--json]');
    process.exit(2);
  }

  const results = [];
  const CONC = 6;
  for (let i = 0; i < urls.length; i += CONC) {
    results.push(...await Promise.all(urls.slice(i, i + CONC).map(classify)));
  }

  if (asJson) {
    console.log(JSON.stringify({ checked_at: new Date().toISOString(), results }, null, 2));
    return;
  }

  const by = s => results.filter(r => r.status === s);
  console.log(`Zkontrolováno ${results.length} odkazů:\n`);
  console.log(`  ok        ${by('ok').length}`);
  console.log(`  http_err  ${by('http_err').length}   ← rozbitý odkaz, opravit`);
  console.log(`  dead      ${by('dead').length}   ← doména neexistuje, NELZE jen přepsat URL`);
  console.log(`  blocked   ${by('blocked').length}   ← NEOVĚŘENO, nečíst jako OK`);
  for (const s of ['http_err', 'dead', 'blocked']) {
    if (!by(s).length) continue;
    console.log(`\n[${s}]`);
    for (const r of by(s)) console.log(`  ${r.code || '---'}  ${r.url}${r.note ? '   (' + r.note + ')' : ''}`);
  }
  // Blokované NEjsou chyba běhu — jsou to neověřené zdroje. Chyba je jen mrtvý/rozbitý odkaz.
  if (by('http_err').length || by('dead').length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
