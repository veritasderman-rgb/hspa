#!/usr/bin/env node
// DIAGNOSTIKA dosažitelnosti ppo.mzcr.cz.
//
// Průzkumný běh (ppo-probe.js) skončil 0/7 dosažitelných stránek i na runneru
// GitHub Actions. To samo o sobě nerozliší čtyři velmi různé situace:
//   (a) portál je právě mimo provoz,
//   (b) blokuje IP rozsahy cloudu (Azure/GitHub),
//   (c) blokuje strojové User-Agenty,
//   (d) je nedostupný jen po IPv6 / jen na některém portu.
// Rozhodnutí, jestli vůbec stavět fetcher, na tomhle rozdílu stojí.
//
// Skript proto měří:
//   1. KONTROLU — dosáhne runner na jiné české vládní weby? (mzd.gov.cz, uzis.cz)
//      Když ne, problém je na naší straně a o portálu to nevypovídá nic.
//   2. DNS — jaké A/AAAA záznamy ppo.mzcr.cz má.
//   3. TCP — projde holé spojení na :443 a :80? Odliší filtrovaný provoz
//      (timeout) od aktivního odmítnutí (ECONNREFUSED) a od chyby výš (TLS/HTTP).
//   4. UA — chová se server jinak k prohlížečovému User-Agentu?
//   5. ARCHIV — má Wayback snímky? Když ano, portál kdysi strojově přístupný byl
//      a lze z archivu odvodit strukturu stránky i bez živého přístupu.

import net from 'node:net';
import { promises as dns } from 'node:dns';

const TIMEOUT = 12_000;
const UA_BOT = 'ZdraveCesko-HSPA/1.0 (+https://skorezdravotnictvi.cz)';
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

async function httpTry(url, ua, label) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': ua }, signal: ctrl.signal, redirect: 'follow' });
    const body = await res.text().catch(() => '');
    console.log(`   ${String(res.status).padEnd(4)} ${label.padEnd(22)} ${url}  (${Date.now() - started} ms, ${body.length} B)`);
    return { url, label, status: res.status, bytes: body.length, ms: Date.now() - started };
  } catch (e) {
    const cause = e?.cause?.code || e?.cause?.message || e?.name || '';
    console.log(`   ---  ${label.padEnd(22)} ${url}  (${Date.now() - started} ms) ${e.message}${cause ? ' :: ' + cause : ''}`);
    return { url, label, status: 0, error: e.message, cause: String(cause), ms: Date.now() - started };
  } finally { clearTimeout(t); }
}

function tcpTry(host, port) {
  return new Promise(resolve => {
    const started = Date.now();
    const s = new net.Socket();
    let done = false;
    const end = out => { if (done) return; done = true; s.destroy(); resolve({ host, port, ms: Date.now() - started, ...out }); };
    s.setTimeout(TIMEOUT);
    s.once('connect', () => end({ ok: true, verdict: 'spojení navázáno' }));
    s.once('timeout', () => end({ ok: false, verdict: 'timeout — provoz je nejspíš filtrován (zahozen bez odpovědi)' }));
    s.once('error', e => end({ ok: false, verdict: `odmítnuto: ${e.code || e.message}`, code: e.code }));
    s.connect(port, host);
  });
}

async function main() {
  const out = { at: new Date().toISOString() };

  console.log('1) KONTROLA — dosáhne runner na jiné české vládní weby?');
  out.control = [];
  for (const u of ['https://mzd.gov.cz/', 'https://www.uzis.cz/', 'https://mpsv.gov.cz/']) {
    out.control.push(await httpTry(u, UA_BOT, 'kontrola'));
  }
  const controlOk = out.control.filter(r => r.status >= 200 && r.status < 400).length;
  console.log(`   → ${controlOk}/${out.control.length} kontrolních webů odpovědělo\n`);

  console.log('2) DNS — jaké záznamy ppo.mzcr.cz má?');
  out.dns = {};
  for (const type of ['A', 'AAAA', 'CNAME']) {
    try {
      const recs = await dns.resolve('ppo.mzcr.cz', type);
      out.dns[type] = recs;
      console.log(`   ${type.padEnd(6)} ${JSON.stringify(recs)}`);
    } catch (e) {
      out.dns[type] = { error: e.code || e.message };
      console.log(`   ${type.padEnd(6)} — (${e.code || e.message})`);
    }
  }
  console.log();

  console.log('3) TCP — projde holé spojení?');
  out.tcp = [];
  const addrs = Array.isArray(out.dns.A) ? out.dns.A : [];
  for (const port of [443, 80]) {
    const r = await tcpTry('ppo.mzcr.cz', port);
    out.tcp.push(r);
    console.log(`   :${String(port).padEnd(4)} ${r.ok ? '✓' : '✗'} ${r.verdict}  (${r.ms} ms)`);
  }
  for (const ip of addrs.slice(0, 2)) {
    const r = await tcpTry(ip, 443);
    out.tcp.push(r);
    console.log(`   ${ip}:443 ${r.ok ? '✓' : '✗'} ${r.verdict}  (${r.ms} ms)`);
  }
  console.log();

  console.log('4) UA — mění se chování podle User-Agentu?');
  out.ua = [];
  out.ua.push(await httpTry('https://ppo.mzcr.cz/', UA_BOT, 'bot UA'));
  out.ua.push(await httpTry('https://ppo.mzcr.cz/', UA_BROWSER, 'prohlížečový UA'));
  out.ua.push(await httpTry('http://ppo.mzcr.cz/', UA_BROWSER, 'prohlížečový, HTTP'));
  console.log();

  console.log('5) ARCHIV — má Wayback snímky portálu?');
  out.wayback = await httpTry(
    'http://web.archive.org/cdx/search/cdx?url=ppo.mzcr.cz*&output=json&limit=40&collapse=urlkey&fl=timestamp,original,statuscode',
    UA_BOT, 'wayback CDX');
  try {
    const res = await fetch('http://web.archive.org/cdx/search/cdx?url=ppo.mzcr.cz*&output=json&limit=40&collapse=urlkey&fl=timestamp,original,statuscode',
      { headers: { 'User-Agent': UA_BOT } });
    const rows = await res.json();
    out.wayback_rows = rows;
    console.log(`   snímků v archivu: ${Math.max(0, rows.length - 1)}`);
    for (const r of rows.slice(1, 21)) console.log(`     ${r[0]}  ${r[2] || '---'}  ${r[1]}`);
  } catch (e) {
    console.log(`   archiv nedostupný: ${e.message}`);
  }

  console.log('\n=== ZÁVĚR ===');
  if (!controlOk) {
    console.log('Runner nedosáhl ani na kontrolní weby — o portálu to nevypovídá nic.');
  } else {
    const tcp443 = out.tcp.find(t => t.port === 443);
    if (tcp443?.ok) {
      console.log('TCP na :443 projde, ale HTTP ne → blok je na úrovni aplikace/WAF (IP nebo UA).');
    } else if (tcp443?.code === 'ECONNREFUSED') {
      console.log('Spojení aktivně odmítnuto → služba na portu neběží (portál může být mimo provoz).');
    } else {
      console.log('TCP timeout při funkční kontrole → provoz z cloudu je filtrován (blok IP rozsahů).');
    }
    const snaps = Array.isArray(out.wayback_rows) ? Math.max(0, out.wayback_rows.length - 1) : 0;
    console.log(snaps
      ? `Wayback má ${snaps} snímků → strukturu stránky lze odvodit z archivu i bez živého přístupu.`
      : 'Wayback nemá snímky → archiv jako náhradní zdroj odpadá.');
  }

  console.log('\n' + JSON.stringify(out).slice(0, 20));
}

main().catch(e => { console.error(e); process.exit(1); });
