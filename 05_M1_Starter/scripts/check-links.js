#!/usr/bin/env node
// Klasifikace externích odkazů pro noční rutinu (issue #1003).
//
// Problém, který řeší: `curl` vrací u MRTVÉ domény i u domény blokované
// síťovou politikou běhového prostředí shodně kód 000. V reportu pak není
// poznat rozdíl mezi „ověřeno OK" a „nedalo se ověřit" — a tichý slepý bod
// se čte jako úspěch. Rozlišit je umí až DNS.
//
// Klasifikace (fatální = zastavuje běh, viz FATAL):
//   ok            — HTTP 2xx/3xx; 401/403 = bot-block, ale doména žije
//   http_err      — 404/410: zdroj je prokazatelně pryč                [FATÁLNÍ]
//   dead          — DNS řeklo ENOTFOUND: doména neexistuje             [FATÁLNÍ]
//   blocked       — DNS resolvuje, spojení neprojde → politika prostředí, NEOVĚŘENO
//   rate_limited  — 429: jsme přiškrceni, o odkazu to nevypovídá
//   server_err    — 5xx: chyba na straně serveru, může být přechodná
//   other         — jiný stavový kód (405, 451…) — k ručnímu posouzení
//   unknown       — DNS selhalo přechodně (EAI_AGAIN ap.), nelze rozhodnout
//
// Fatální jsou jen stavy, které PROKAZUJÍ mrtvý cíl. Přechodné a politikou
// způsobené stavy se hlásí, ale běh neshazují — jinak by rutina padala na
// cizím výpadku a nutila lidi ji obcházet.
//
// Použití:
//   node scripts/check-links.js https://a.cz https://b.cz
//   node scripts/check-links.js --file seznam.txt
//   node scripts/check-links.js --corpus
//   node scripts/check-links.js --json      # exit kód platí i zde

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

export const FATAL = new Set(['http_err', 'dead']);

/**
 * Tři stavy, ne dva. `EAI_AGAIN` je přechodné selhání resolveru — tvrdit
 * na jeho základě „doména neexistuje" by bylo nepravdivé.
 * @returns {Promise<'yes'|'no'|'unknown'>}
 */
export async function resolveHost(host) {
  try {
    await dns.lookup(host);
    return 'yes';
  } catch (e) {
    if (e && e.code === 'ENOTFOUND') return 'no';
    return 'unknown';
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

/**
 * @param {string} url
 * @param {{http?: (u:string)=>Promise<number>, dnsLookup?: (h:string)=>Promise<'yes'|'no'|'unknown'>}} deps
 *        Injektovatelné závislosti — testy díky nim nepotřebují síť.
 */
export async function classify(url, deps = {}) {
  const http = deps.http ?? httpStatus;
  const lookup = deps.dnsLookup ?? resolveHost;

  let host;
  try {
    host = new URL(url).hostname;
    if (!host) throw new Error('bez hostitele');
  } catch {
    return { url, host: null, status: 'invalid', code: null };
  }

  const code = await http(url);
  if (code >= 200 && code < 400) return { url, host, status: 'ok', code };
  if (code === 401 || code === 403) return { url, host, status: 'ok', code, note: 'bot-block, doména žije' };
  if (code === 429) return { url, host, status: 'rate_limited', code, note: 'přiškrceno, o odkazu nevypovídá' };
  if (code === 404 || code === 410) return { url, host, status: 'http_err', code, note: 'zdroj je pryč' };
  if (code >= 500) return { url, host, status: 'server_err', code, note: 'chyba serveru, může být přechodná' };
  if (code > 0) return { url, host, status: 'other', code, note: 'neobvyklý kód — posoudit ručně' };

  // Kód 0 — teprve teď se ptáme DNS, protože jen ono odliší mrtvé od blokovaného.
  const r = await lookup(host);
  if (r === 'no') return { url, host, status: 'dead', code: 0, note: 'ENOTFOUND — doména neexistuje' };
  if (r === 'yes') return { url, host, status: 'blocked', code: 0, note: 'DNS resolvuje, spojení neprojde — politika prostředí, NEověřeno' };
  return { url, host, status: 'unknown', code: 0, note: 'DNS selhalo přechodně — nelze rozhodnout' };
}

function corpusLinks() {
  const urls = new Set();
  for (const f of readdirSync(ROOT).filter(f => /^clanek-.*\.html$/.test(f))) {
    for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(/href="(https?:\/\/[^"]+)"/g)) urls.add(m[1]);
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
    urls = readFileSync(args[args.indexOf('--file') + 1], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  }
  if (args.includes('--corpus')) urls = corpusLinks();
  if (!urls.length) {
    console.error('Použití: node scripts/check-links.js <url…> | --file <soubor> | --corpus [--json]');
    process.exit(2);
  }

  const results = [];
  const CONC = 6;
  for (let i = 0; i < urls.length; i += CONC) {
    results.push(...await Promise.all(urls.slice(i, i + CONC).map(u => classify(u))));
  }

  const fatal = results.filter(r => FATAL.has(r.status));

  if (asJson) {
    console.log(JSON.stringify({ checked_at: new Date().toISOString(), fatal: fatal.length, results }, null, 2));
  } else {
    const by = s => results.filter(r => r.status === s);
    console.log(`Zkontrolováno ${results.length} odkazů:\n`);
    for (const [s, popis] of [
      ['ok', ''], ['http_err', '← zdroj je pryč, opravit'], ['dead', '← doména neexistuje, NELZE jen přepsat URL'],
      ['blocked', '← NEOVĚŘENO, nečíst jako OK'], ['rate_limited', '← přiškrceno, zkusit později'],
      ['server_err', '← chyba serveru, může být přechodná'], ['other', '← posoudit ručně'],
      ['unknown', '← DNS selhalo, nelze rozhodnout'], ['invalid', '← neplatné URL'],
    ]) {
      if (by(s).length) console.log(`  ${s.padEnd(13)}${String(by(s).length).padStart(4)}   ${popis}`);
    }
    for (const s of ['http_err', 'dead', 'blocked', 'rate_limited', 'server_err', 'other', 'unknown']) {
      if (!by(s).length) continue;
      console.log(`\n[${s}]`);
      for (const r of by(s)) console.log(`  ${r.code || '---'}  ${r.url}${r.note ? '   (' + r.note + ')' : ''}`);
    }
  }

  // Exit kód platí i v --json režimu, aby ho automatizace nemohla přehlédnout.
  if (fatal.length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
