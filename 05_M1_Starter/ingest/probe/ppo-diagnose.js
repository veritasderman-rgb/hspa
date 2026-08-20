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
  for (const port of [443, 80]) {
    const r = { family: 'hostname', ...(await tcpTry('ppo.mzcr.cz', port)) };
    out.tcp.push(r);
    console.log(`   :${String(port).padEnd(4)} ${r.ok ? '✓' : '✗'} ${r.verdict}  (${r.ms} ms)`);
  }
  // Přímo na IP, a to OBOU rodin. Spojení na hostname může tiše spadnout zpět
  // na fungující rodinu a rozbitou AAAA cestu tím zamaskovat.
  const byFamily = [
    ...(Array.isArray(out.dns.A) ? out.dns.A.slice(0, 2).map(ip => ['IPv4', ip]) : []),
    ...(Array.isArray(out.dns.AAAA) ? out.dns.AAAA.slice(0, 2).map(ip => ['IPv6', ip]) : []),
  ];
  for (const [family, ip] of byFamily) {
    const r = { family, ...(await tcpTry(ip, 443)) };
    out.tcp.push(r);
    console.log(`   ${family} ${ip}:443 ${r.ok ? '✓' : '✗'} ${r.verdict}  (${r.ms} ms)`);
  }
  if (!byFamily.some(([f]) => f === 'IPv6')) console.log('   IPv6 — žádný AAAA záznam, cesta po IPv6 neexistuje');
  console.log();

  console.log('4) UA — mění se chování podle User-Agentu?');
  out.ua = [];
  out.ua.push(await httpTry('https://ppo.mzcr.cz/', UA_BOT, 'bot UA'));
  out.ua.push(await httpTry('https://ppo.mzcr.cz/', UA_BROWSER, 'prohlížečový UA'));
  out.ua.push(await httpTry('http://ppo.mzcr.cz/', UA_BROWSER, 'prohlížečový, HTTP'));
  console.log();

  console.log('5) ARCHIV — má Wayback snímky portálu?');
  // Jeden dotaz, tři možné výsledky: snímky / prokazatelně žádné / nedostupné.
  // Splynutí posledních dvou by z výpadku archivu udělalo definitivní "nemá",
  // což je přesně ta chyba, kvůli které tahle diagnostika vznikla.
  const CDX = 'http://web.archive.org/cdx/search/cdx?url=ppo.mzcr.cz*&output=json&limit=40&collapse=urlkey&fl=timestamp,original,statuscode';
  out.wayback = { state: 'unknown' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    const res = await fetch(CDX, { headers: { 'User-Agent': UA_BOT }, signal: ctrl.signal });
    clearTimeout(t);
    const text = await res.text();
    if (!res.ok) {
      out.wayback = { state: 'unavailable', status: res.status };
      console.log(`   archiv neodpověděl použitelně: HTTP ${res.status}`);
    } else {
      let rows;
      try { rows = JSON.parse(text); } catch { rows = null; }
      if (!Array.isArray(rows)) {
        out.wayback = { state: 'unavailable', status: res.status, reason: 'odpověď není JSON' };
        console.log('   archiv vrátil neparsovatelnou odpověď');
      } else {
        const snaps = Math.max(0, rows.length - 1);
        out.wayback = { state: 'ok', snapshots: snaps, rows };
        console.log(`   snímků v archivu: ${snaps}`);
        for (const r of rows.slice(1, 21)) console.log(`     ${r[0]}  ${r[2] || '---'}  ${r[1]}`);
      }
    }
  } catch (e) {
    out.wayback = { state: 'unavailable', reason: e.message };
    console.log(`   archiv nedostupný: ${e.message}`);
  }

  console.log('\n=== ZÁVĚR ===');
  if (!controlOk) {
    console.log('Runner nedosáhl ani na kontrolní weby — o portálu to nevypovídá nic.');
  } else {
    const tcp443 = out.tcp.find(t => t.port === 443 && t.family === 'hostname');
    const okStatus = r => r.status >= 200 && r.status < 400;
    const botOk = out.ua.filter(r => r.label.startsWith('bot')).some(okStatus);
    const browserOk = out.ua.filter(r => r.label.startsWith('prohlížečový')).some(okStatus);

    // Nejdřív HTTP: když něco prošlo, je jedno, co říká TCP.
    if (botOk && browserOk) {
      console.log('HTTP prošlo oběma User-Agenty → portál je dosažitelný; první selhání bylo nejspíš dočasné. Fetcher lze stavět.');
    } else if (browserOk && !botOk) {
      console.log('HTTP prošlo JEN s prohlížečovým UA → server filtruje podle User-Agentu. Řešitelné hlavičkou, ale je to signál o postoji provozovatele.');
    } else if (botOk && !browserOk) {
      console.log('HTTP prošlo jen s botím UA → neobvyklé; zopakovat, může jít o výkyv.');
    } else if (tcp443?.ok) {
      console.log('TCP na :443 projde, ale žádné HTTP neuspělo → blok je na úrovni aplikace/WAF, ne sítě.');
    } else if (tcp443?.code === 'ECONNREFUSED') {
      console.log('Spojení aktivně odmítnuto → služba na portu neběží (portál může být mimo provoz).');
    } else {
      console.log('TCP timeout při funkční kontrole → provoz z cloudu je filtrován (blok IP rozsahů).');
    }

    const v4 = out.tcp.filter(t => t.family === 'IPv4');
    const v6 = out.tcp.filter(t => t.family === 'IPv6');
    if (v6.length && v6.every(t => !t.ok) && v4.some(t => t.ok)) {
      console.log('Po IPv4 to jde, po IPv6 ne → rozbitá AAAA cesta, řešitelné vynucením IPv4.');
    }

    if (out.wayback.state === 'ok') {
      console.log(out.wayback.snapshots
        ? `Wayback má ${out.wayback.snapshots} snímků → strukturu stránky lze odvodit z archivu i bez živého přístupu.`
        : 'Wayback prokazatelně nemá snímky → archiv jako náhradní zdroj odpadá.');
    } else {
      console.log('Wayback se nepodařilo dotázat → o archivu NEVÍME nic; nelze z toho usoudit, že snímky nejsou.');
    }
  }

  console.log('\n' + JSON.stringify(out).slice(0, 20));
}

main().catch(e => { console.error(e); process.exit(1); });
