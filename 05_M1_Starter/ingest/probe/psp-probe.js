#!/usr/bin/env node
// PRŮZKUMNÝ běh k otevřeným datům a webu Poslanecké sněmovny (psp.cz).
// NIC nezapisuje do datového kontraktu. Zjišťuje, z čeho lze postavit
// odchytávač pozměňovacích návrhů mimo původní předmět zákona (PLAN-PRILEPKY.md).
//
// Proč v CI: www.psp.cz z prostředí agenta nejde (spojení se resetuje při TLS,
// zjištěno 18. 11. 2026), stejně jako dřív ppo.mzcr.cz. Runner GitHub Actions
// na české státní weby běžně dosáhne.
//
// Zjišťuje:
//   1. Dosažitelnost klíčových adres.
//   2. Které ZIP archivy otevřených dat existují (rozcestník hp.sqw?k=1300).
//   3. Strukturu tabulek v archivech (soubory .unl: počet sloupců, vzorek řádků).
//   4. Strukturu stránky historie tisku a sněmovního dokumentu (písemný PN).
//   5. V jakém formátu je text pozměňovacího návrhu a text tisku.
//
// Použití: node ingest/probe/psp-probe.js [--tisk 235] [--sd 1813,1796] [--obdobi 10]
// Výstup jde na stdout (čte se z logu workflow).

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const UA = 'ZdraveCesko-HSPA/1.0 (+https://skorezdravotnictvi.cz; pruzkumny-beh)';
const BASE = 'https://www.psp.cz';
const DELAY_MS = 1500;
const TIMEOUT_MS = 60_000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const OBDOBI = arg('obdobi', '10');
const TISK = arg('tisk', '235');
const SD = arg('sd', '1813,1796').split(',').filter(Boolean);

async function get(url, { binary = false } = {}) {
  await sleep(DELAY_MS);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || '';
    const cd = res.headers.get('content-disposition') || '';
    let text = '';
    if (!binary) {
      const m = /charset=([\w-]+)/i.exec(ct) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString('latin1'));
      const enc = (m ? m[1] : 'utf-8').toLowerCase();
      try { text = new TextDecoder(enc).decode(buf); } catch { text = buf.toString('utf8'); }
    }
    return { ok: res.ok, status: res.status, url: res.url, ct, cd, size: buf.length, buf, text };
  } catch (e) {
    return { ok: false, status: 0, url, ct: '', cd: '', size: 0, buf: Buffer.alloc(0), text: '', error: String(e.cause?.code || e.message || e) };
  } finally { clearTimeout(t); }
}

const h = s => console.log(`\n===== ${s} =====`);
const line = r => `${r.status} · ${r.ct || '—'} · ${r.size} B${r.cd ? ' · ' + r.cd : ''}${r.error ? ' · CHYBA ' + r.error : ''}${r.url ? ' · ' + r.url : ''}`;
const clean = s => s.replace(/\s+/g, ' ').trim();

function links($, base) {
  const out = [];
  $('a[href]').each((_, a) => {
    try { out.push({ href: new URL($(a).attr('href'), base).href, text: clean($(a).text()).slice(0, 90) }); } catch { /* neplatný odkaz */ }
  });
  return out;
}

function sniff(buf) {
  if (buf.subarray(0, 2).toString('latin1') === 'PK') return 'zip (docx/odt?)';
  if (buf.subarray(0, 4).toString('hex') === 'd0cf11e0') return 'OLE (starý .doc)';
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf.subarray(0, 5).toString('latin1') === '{\\rtf') return 'rtf';
  return 'jiné/HTML';
}

function unzipInfo(buf, label) {
  const dir = mkdtempSync(join(tmpdir(), 'psp-probe-'));
  const f = join(dir, 'a.zip');
  writeFileSync(f, buf);
  try {
    console.log(execFileSync('unzip', ['-l', f], { encoding: 'utf8', maxBuffer: 1e7 }).split('\n').slice(0, 60).join('\n'));
    execFileSync('unzip', ['-q', '-o', f, '-d', join(dir, 'x')], { maxBuffer: 1e7 });
    return join(dir, 'x');
  } catch (e) {
    console.log(`unzip ${label} selhal: ${e.message}`);
    return null;
  }
}

function unlSample(dir, filter) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (!statSync(p).isFile() || !/\.unl$/i.test(name)) continue;
    const txt = new TextDecoder('windows-1250').decode(readFileSync(p));
    const rows = txt.split(/\r?\n/).filter(Boolean);
    const cols = rows.length ? rows[0].split('|').length - 1 : 0;
    console.log(`\n--- ${name}: ${rows.length} řádků, ${cols} sloupců`);
    rows.slice(0, 2).forEach(r => console.log('  první: ' + r.slice(0, 600)));
    rows.slice(-2).forEach(r => console.log('  poslední: ' + r.slice(0, 600)));
    if (filter) rows.filter(filter).slice(0, 6).forEach(r => console.log('  shoda: ' + r.slice(0, 900)));
  }
}

async function main() {
  console.log(`psp-probe · ${new Date().toISOString()} · období ${OBDOBI} · tisk ${TISK} · sněmovní dokumenty ${SD.join(', ')}`);

  h('1. Dosažitelnost');
  for (const u of [`${BASE}/`, `${BASE}/sqw/hp.sqw?k=1300`, `${BASE}/robots.txt`]) {
    const r = await get(u);
    console.log(`${u}\n  ${line(r)}`);
    if (u.endsWith('robots.txt') && r.ok) console.log(r.text.slice(0, 1200));
  }

  h('2. Rozcestník otevřených dat — odkazy na archivy');
  const idx = await get(`${BASE}/sqw/hp.sqw?k=1300`);
  const zips = new Map();
  if (idx.ok) {
    const $ = cheerio.load(idx.text);
    for (const l of links($, idx.url)) if (/\.zip$/i.test(l.href)) zips.set(l.href, l.text);
    for (const [href, text] of zips) console.log(`${href}  «${text}»`);
    console.log('Podstránky rozcestníku:');
    for (const l of links($, idx.url)) if (/hp\.sqw\?k=13\d\d/.test(l.href)) console.log(`  ${l.href} «${l.text}»`);
  }

  h('3. Archiv tisky.zip — tabulky');
  const tz = await get(`${BASE}/eknih/cdrom/opendata/tisky.zip`, { binary: true });
  console.log(line(tz));
  if (tz.ok) {
    const dir = unzipInfo(tz.buf, 'tisky.zip');
    if (dir) unlSample(dir, r => r.includes(`|${TISK}|`) && r.includes('zdr'));
  }

  h('3b. Další archivy z rozcestníku, které se týkají dokumentů a pozměňovacích návrhů');
  for (const [href, text] of zips) {
    if (!/sd|dok|pn|pozm|navrh/i.test(href + ' ' + text) || /tisky\.zip$/.test(href)) continue;
    const r = await get(href, { binary: true });
    console.log(`\n${href} «${text}»\n  ${line(r)}`);
    if (r.ok && r.size < 80e6) { const dir = unzipInfo(r.buf, href); if (dir) unlSample(dir, row => SD.some(cd => row.includes(`|${cd}|`))); }
  }

  h(`4. Historie tisku ${TISK}`);
  const hist = await get(`${BASE}/sqw/historie.sqw?o=${OBDOBI}&t=${TISK}`);
  console.log(line(hist));
  const follow = new Map();
  if (hist.ok) {
    const $ = cheerio.load(hist.text);
    console.log('title: ' + clean($('title').text()));
    console.log('h1: ' + clean($('h1').first().text()));
    console.log(`div.section: ${$('div.section').length} · ul.document-log: ${$('ul.document-log').length} · li.document-log-item: ${$('li.document-log-item').length}`);
    $('div.section').each((i, s) => {
      console.log(`\n[sekce ${i}] ${clean($(s).find('h2,h3').first().text())}`);
      $(s).find('li.document-log-item').each((_, li) => {
        console.log(`  (${clean($(li).find('span.mark').text())}) ${clean($(li).text()).slice(0, 700)}`);
        $(li).find('a[href]').each((__, a) => console.log(`      → ${new URL($(a).attr('href'), hist.url).href} «${clean($(a).text()).slice(0, 60)}»`));
      });
    });
    if (!$('li.document-log-item').length) console.log('TEXT: ' + clean($('body').text()).slice(0, 4000));
    for (const l of links($, hist.url)) {
      if (/tiskt\.sqw|orig2\.sqw|text2\.sqw|sd\.sqw|pn\.sqw|tisky\.sqw/.test(l.href)) follow.set(l.href, l.text);
    }
  }

  h('5. Sněmovní dokumenty (písemné pozměňovací návrhy)');
  for (const cd of SD) {
    const u = `${BASE}/sqw/sd.sqw?cd=${cd}&o=${OBDOBI}`;
    const r = await get(u);
    console.log(`\n${u}\n  ${line(r)}`);
    if (!r.ok) continue;
    const $ = cheerio.load(r.text);
    console.log('  title: ' + clean($('title').text()));
    console.log('  TEXT: ' + clean($('#main-content, #main, body').first().text()).slice(0, 1800));
    for (const l of links($, r.url)) {
      if (/orig2\.sqw|text2\.sqw|\.docx?$|\.pdf$|sd\.sqw|historie\.sqw|detail\.sqw/.test(l.href)) {
        console.log(`  → ${l.href} «${l.text}»`);
        if (/orig2\.sqw|text2\.sqw|\.docx?$|\.pdf$/.test(l.href)) follow.set(l.href, `SD ${cd}: ${l.text}`);
      }
    }
  }

  h('6. Formát textů (tisk a pozměňovací návrhy)');
  let n = 0;
  for (const [href, text] of follow) {
    if (!/orig2\.sqw|text2\.sqw|tiskt\.sqw|\.docx?$|\.pdf$/.test(href) || n++ >= 10) continue;
    const r = await get(href, { binary: true });
    console.log(`\n${href} «${text}»\n  ${line(r)} · signatura: ${sniff(r.buf)}`);
    if (!r.ok) continue;
    const kind = sniff(r.buf);
    if (kind.startsWith('zip')) {
      const dir = mkdtempSync(join(tmpdir(), 'psp-doc-'));
      writeFileSync(join(dir, 'd.zip'), r.buf);
      try {
        const xml = execFileSync('unzip', ['-p', join(dir, 'd.zip'), 'word/document.xml'], { encoding: 'utf8', maxBuffer: 5e7 });
        console.log('  docx text: ' + clean(xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')).slice(0, 1500));
      } catch (e) { console.log('  docx: word/document.xml nenalezen — ' + e.message.slice(0, 200)); }
    } else if (kind === 'jiné/HTML') {
      const m = /charset=([\w-]+)/i.exec(r.ct) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(r.buf.subarray(0, 2048).toString('latin1'));
      let t; try { t = new TextDecoder((m ? m[1] : 'windows-1250').toLowerCase()).decode(r.buf); } catch { t = r.buf.toString('utf8'); }
      const $ = cheerio.load(t);
      console.log('  html text: ' + clean($('body').text()).slice(0, 1500));
      for (const l of links($, r.url)) if (/orig2\.sqw|\.docx?$|\.pdf$/.test(l.href)) console.log(`  → ${l.href} «${l.text}»`);
    }
  }
  console.log('\nHOTOVO');
}

main().catch(e => { console.error('PROBE SELHAL:', e); process.exit(1); });
