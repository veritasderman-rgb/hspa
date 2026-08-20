#!/usr/bin/env node
// CÍLENÝ dotaz do Wayback archivu na DETAILY pracovních skupin ppo.mzcr.cz.
//
// Navazuje na diagnostiku, která zjistila, že portál filtruje provoz
// z datových center (TCP timeout na :443 i :80 při funkčních kontrolních
// webech) — živě je tedy z CI nedosažitelný. Archiv je poslední levná cesta.
//
// Předchozí běh napočítal 40 snímků a usoudil z toho, že "strukturu lze
// odvodit z archivu". To byl ukvapený závěr: dotaz byl řazený abecedně
// s limitem 40, takže se k /workGroup/ vůbec nedostal, a co vrátil, bylo
// převážně smetí (.well-known 404, spam, náhodné cesty). Počet snímků není
// totéž co použitelný obsah — tenhle skript to rozlišuje.
//
// Ptá se na tři věci:
//   1. Má archiv vůbec snímky cest /workGroup/* ? Kolika skupin a z kdy?
//   2. Když ano, jde snímek stáhnout a je v něm skutečný obsah?
//   3. Obsahuje jmenné složení, dokumenty a termíny — tedy to, kvůli čemu
//      by rejstřík vznikal?
//
// Použití: node ingest/probe/ppo-archive.js [--sample 5]

import { analyse } from './ppo-probe.js';

const UA = 'ZdraveCesko-HSPA/1.0 (+https://skorezdravotnictvi.cz; pruzkumny-beh)';
const TIMEOUT = 25_000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    return { ok: res.ok, status: res.status, body: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, body: '', error: e.message };
  } finally { clearTimeout(t); }
}

async function cdx(query, label) {
  const url = `http://web.archive.org/cdx/search/cdx?${query}`;
  const r = await getText(url);
  if (!r.ok) {
    console.log(`   ✗ ${label}: archiv neodpověděl použitelně (HTTP ${r.status}${r.error ? ', ' + r.error : ''}) — o archivu tím NEVÍME nic`);
    return { state: 'unavailable', status: r.status };
  }
  let rows;
  try { rows = JSON.parse(r.body); } catch { rows = null; }
  if (!Array.isArray(rows)) {
    console.log(`   ✗ ${label}: odpověď není JSON — NEVÍME nic`);
    return { state: 'unavailable', reason: 'non-json' };
  }
  const data = rows.slice(1);
  console.log(`   ${data.length ? '✓' : '·'} ${label}: ${data.length} záznamů`);
  return { state: 'ok', rows: data };
}

async function main() {
  const n = Number((process.argv[process.argv.indexOf('--sample') + 1]) || 5) || 5;
  const out = { at: new Date().toISOString() };

  console.log('1) Má archiv snímky detailů pracovních skupin?\n');
  const q = 'output=json&collapse=urlkey&fl=timestamp,original,statuscode,mimetype&limit=400';
  const detail = await cdx(`url=ppo.mzcr.cz/workGroup*&matchType=prefix&${q}`, '/workGroup* (prefix)');
  const root = await cdx(`url=ppo.mzcr.cz&${q}&limit=60`, 'kořen portálu');
  out.detail = detail; out.root = root;

  if (detail.state !== 'ok') {
    console.log('\n=== ZÁVĚR ===\nArchiv se nepodařilo dotázat — cesta přes archiv NENÍ vyloučená, jen neověřená. Zopakovat.');
    return;
  }

  // Které skupiny a z jakých let?
  const ok200 = detail.rows.filter(r => r[2] === '200');
  const ids = new Map();
  for (const r of ok200) {
    const m = String(r[1]).match(/\/workGroup\/(\d+)/);
    if (m) {
      const id = m[1];
      if (!ids.has(id) || r[0] > ids.get(id)) ids.set(id, r[0]);
    }
  }
  const years = [...new Set(ok200.map(r => String(r[0]).slice(0, 4)))].sort();
  console.log(`\n   snímků se stavem 200: ${ok200.length}`);
  console.log(`   unikátních ID skupin: ${ids.size}${ids.size ? '  → ' + [...ids.keys()].slice(0, 25).join(', ') + (ids.size > 25 ? ' …' : '') : ''}`);
  console.log(`   roky snímků: ${years.join(', ') || '—'}`);
  out.unique_ids = [...ids.keys()];
  out.years = years;

  if (!ids.size) {
    console.log('\n=== ZÁVĚR ===');
    console.log('Archiv NEMÁ ani jeden použitelný snímek detailu skupiny.');
    console.log('Cesta přes archiv odpadá — zbývá runner s českou IP, ruční export, nebo žádosti dle zák. 106/1999 Sb.');
    return;
  }

  // 2) Zkus stáhnout vzorek snímků a podívej se, co v nich je.
  console.log(`\n2) Vzorek ${Math.min(n, ids.size)} snímků — je v nich obsah?\n`);
  out.samples = [];
  for (const [id, ts] of [...ids.entries()].slice(0, n)) {
    // id_ = originální obsah bez wayback banneru a bez přepisu odkazů
    const url = `http://web.archive.org/web/${ts}id_/https://ppo.mzcr.cz/workGroup/${id}`;
    const r = await getText(url);
    if (!r.ok || !r.body) {
      console.log(`   ✗ #${id} (${ts}) — nestaženo (HTTP ${r.status})`);
      out.samples.push({ id, ts, ok: false, status: r.status });
      await sleep(1500); continue;
    }
    const a = analyse(r.body, url);
    out.samples.push({ id, ts, ok: true, bytes: a.bytes, tables: a.tables, docs: a.doc_count, names: a.name_candidate_count, dates: (a.dates_found || []).length, signals: a.signals, h1: a.h1 });
    console.log(`   ✓ #${id} (${ts})  „${(a.h1 || a.title || '').slice(0, 70)}“`);
    console.log(`       ${a.bytes} B · tabulky ${a.tables} · dokumenty ${a.doc_count} · jména ${a.name_candidate_count} · data ${a.dates_found.length}`);
    console.log(`       signály: ${Object.entries(a.signals).filter(([, v]) => v).map(([k]) => k).join(', ') || '—'}`);
    if (a.name_candidates.length) {
      console.log(`       ukázka jmen: ${a.name_candidates.slice(0, 3).map(s => s.slice(0, 60)).join(' | ')}`);
    }
    await sleep(1500);
  }

  console.log('\n=== ZÁVĚR ===');
  const good = out.samples.filter(s => s.ok);
  const withNames = good.filter(s => s.names >= 3);
  if (!good.length) {
    console.log('Snímky jsou v indexu, ale nejde je stáhnout → archiv jako zdroj nepoužitelný.');
  } else if (withNames.length) {
    console.log(`${withNames.length}/${good.length} stažených snímků obsahuje jmenné složení → rejstřík lze postavit z archivu.`);
    console.log(`Pokrytí: ${ids.size} skupin, roky ${years.join('/')}. POZOR: archiv je historický řez, ne živá data —`);
    console.log('aktuálnost by se musela doplňovat jinou cestou (ruční export nebo žádosti dle zák. 106/1999 Sb.).');
  } else {
    console.log(`Snímky se stahují, ale jmenné složení v nich není (${good.length} zkoušených) → archiv sám na rejstřík nestačí.`);
  }
  console.log('\n' + JSON.stringify({ ids: out.unique_ids.length, years, samples: out.samples.length }));
}

main().catch(e => { console.error(e); process.exit(1); });
