#!/usr/bin/env node
// PRŮZKUMNÝ běh k Portálu poradních orgánů, pracovních skupin a odborných
// komisí MZd (ppo.mzcr.cz). NIC nezapisuje do datového kontraktu — jen zjistí,
// co portál reálně obsahuje, aby šlo odhadnout, jestli má smysl stavět fetcher.
//
// Proč samostatný skript a workflow: ppo.mzcr.cz je z prostředí agenta
// nedosažitelný (DNS resolvuje, spojení neprojde — issue #1003), zatímco
// runner GitHub Actions na české vládní zdroje běžně dosáhne (refresh.yml
// tahá živá data z ÚZIS, ČSÚ i SÚKL). Průzkum proto musí proběhnout v CI.
//
// Zjišťuje čtyři věci, na kterých stojí odhad pracnosti:
//   1. Dosažitelnost a rozsah — kolik ID existuje, jak jsou hustá.
//   2. Strukturu stránky — je složení v tabulce, v seznamu, nebo ve volném textu?
//   3. Co se publikuje — statut, jednací řád, jmenné složení, termíny, zápisy.
//   4. Úplnost — u kolika skupin je složení a zápisy k dispozici, a u kolika ne.
//
// Použití:
//   node ingest/probe/ppo-probe.js                 # výchozí vzorek
//   node ingest/probe/ppo-probe.js --ids 164,227,237
//   node ingest/probe/ppo-probe.js --scan 1-260    # rozsahový sken (jen HEAD-like)
//   node ingest/probe/ppo-probe.js --out probe-out # kam uložit report a HTML

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const BASE = 'https://ppo.mzcr.cz';
const UA = 'ZdraveCesko-HSPA/1.0 (+https://skorezdravotnictvi.cz; pruzkumny-beh)';
const DELAY_MS = 1200;          // slušnost k cizímu serveru
const TIMEOUT_MS = 20_000;

// Vzorek: skupiny, o kterých z korpusu víme, že existují, + několik sousedů
// pro odhad hustoty ID.
const DEFAULT_IDS = [164, 200, 220, 227, 230, 237, 240];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const body = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, body, contentType: res.headers.get('content-type') || '' };
  } catch (e) {
    return { ok: false, status: 0, body: '', error: String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

// Heuristiky na akademické tituly — jimi se v českých seznamech pozná řádek
// se jménem člena od běžného textu.
const TITLE_RE = /\b(MUDr|MVDr|MDDr|PharmDr|prof|doc|Ing|Mgr|Bc|JUDr|PhDr|RNDr|PaedDr|Ph\.D|CSc|DrSc|DiS|MBA|MHA|MPH)\b\.?/;
const DATE_RE = /\b(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4}|\d{4}-\d{2}-\d{2})\b/g;

function analyse(html, url) {
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  const tables = $('table').map((_, el) => ({
    rows: $(el).find('tr').length,
    cols: $(el).find('tr').first().find('th,td').length,
    headers: $(el).find('th').map((_, th) => $(th).text().trim()).get().slice(0, 8),
  })).get();

  const links = $('a[href]').map((_, a) => ({
    href: new URL($(a).attr('href'), url).href,
    text: $(a).text().replace(/\s+/g, ' ').trim(),
  })).get();

  const docs = links.filter(l => /\.(pdf|docx?|xlsx?)(\?|$)/i.test(l.href));
  const groupLinks = [...new Set(links.filter(l => /\/workGroup\/\d+/.test(l.href)).map(l => l.href))];

  // Kandidáti na jména členů: krátké řádky s akademickým titulem.
  const nameCandidates = [];
  $('li, td, p').each((_, el) => {
    const s = $(el).text().replace(/\s+/g, ' ').trim();
    if (s.length > 4 && s.length < 160 && TITLE_RE.test(s)) nameCandidates.push(s);
  });

  const dates = [...new Set((text.match(DATE_RE) || []))];

  const has = re => re.test(text);
  return {
    url,
    title: ($('title').text() || '').replace(/\s+/g, ' ').trim(),
    h1: $('h1').first().text().replace(/\s+/g, ' ').trim(),
    bytes: html.length,
    text_len: text.length,
    tables: tables.length,
    table_shapes: tables.slice(0, 5),
    doc_links: docs.slice(0, 25),
    doc_count: docs.length,
    group_links_count: groupLinks.length,
    name_candidates: [...new Set(nameCandidates)].slice(0, 40),
    name_candidate_count: new Set(nameCandidates).size,
    dates_found: dates.slice(0, 20),
    signals: {
      statut: has(/statut/i),
      jednaci_rad: has(/jednac[íi]\s*(ř|r)[áa]d/i),
      slozeni: has(/slo(ž|z)en[íi]|(č|c)lenov[éeě]|(č|c)lenstv/i),
      zapis: has(/z[áa]pis/i),
      termin_jednani: has(/term[íi]n|jedn[áa]n[íi]/i),
      predseda: has(/p(ř|r)edsed/i),
      tajemnik: has(/tajemn/i),
    },
  };
}

function parseArgs() {
  const a = process.argv.slice(2);
  const val = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const ids = val('--ids');
  const scan = val('--scan');
  return {
    ids: ids ? ids.split(',').map(Number).filter(Boolean) : null,
    scan: scan ? (() => { const [f, t] = scan.split('-').map(Number); return { from: f, to: t }; })() : null,
    out: val('--out') || 'probe-out',
  };
}

async function main() {
  const { ids, scan, out } = parseArgs();
  if (!existsSync(out)) mkdirSync(out, { recursive: true });

  const report = { probed_at: new Date().toISOString(), base: BASE, index: null, pages: [], scan: null };

  // 1) Existuje přehledová stránka se seznamem skupin?
  console.log('→ zkouším přehledovou stránku…');
  for (const path of ['/', '/workGroups', '/workGroup', '/home']) {
    const r = await get(BASE + path);
    console.log(`   ${String(r.status).padEnd(4)} ${BASE + path}${r.error ? '  ' + r.error : ''}`);
    if (r.ok && r.body) {
      const a = analyse(r.body, BASE + path);
      writeFileSync(join(out, `index${path.replace(/\W+/g, '_')}.html`), r.body);
      report.index = { path, ...a };
      console.log(`      → ${a.group_links_count} odkazů na /workGroup/…`);
      if (a.group_links_count > 0) break;
    }
    await sleep(DELAY_MS);
  }

  // 2) Detail vzorku skupin.
  const sample = ids || DEFAULT_IDS;
  console.log(`\n→ detail ${sample.length} skupin…`);
  for (const id of sample) {
    const url = `${BASE}/workGroup/${id}`;
    const r = await get(url);
    if (!r.ok) {
      console.log(`   ${String(r.status).padEnd(4)} ${url}${r.error ? '  ' + r.error : ''}`);
      report.pages.push({ url, id, status: r.status, error: r.error || null });
    } else {
      const a = analyse(r.body, url);
      writeFileSync(join(out, `workGroup-${id}.html`), r.body);
      report.pages.push({ id, status: r.status, ...a });
      console.log(`   200  #${id}  „${a.h1 || a.title}“`);
      console.log(`        tabulky ${a.tables} · dokumenty ${a.doc_count} · kandidáti na jména ${a.name_candidate_count} · data ${a.dates_found.length}`);
      console.log(`        signály: ${Object.entries(a.signals).filter(([, v]) => v).map(([k]) => k).join(', ') || '—'}`);
    }
    await sleep(DELAY_MS);
  }

  // 3) Volitelný rozsahový sken — kolik ID vůbec existuje.
  if (scan) {
    console.log(`\n→ sken rozsahu ${scan.from}–${scan.to}…`);
    const found = [];
    for (let id = scan.from; id <= scan.to; id++) {
      const r = await get(`${BASE}/workGroup/${id}`);
      if (r.ok && r.body && r.body.length > 500) found.push(id);
      if (id % 20 === 0) console.log(`   …${id} (zatím ${found.length})`);
      await sleep(400);
    }
    report.scan = { from: scan.from, to: scan.to, existing_ids: found, count: found.length };
    console.log(`   nalezeno ${found.length} existujících ID`);
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n✓ report: ${join(out, 'report.json')}`);

  const okPages = report.pages.filter(p => p.status === 200);
  console.log('\n=== SHRNUTÍ ===');
  console.log(`dosažitelných stránek: ${okPages.length}/${report.pages.length}`);
  if (okPages.length) {
    const withNames = okPages.filter(p => p.name_candidate_count >= 3).length;
    const withDocs = okPages.filter(p => p.doc_count > 0).length;
    const withDates = okPages.filter(p => (p.dates_found || []).length > 0).length;
    console.log(`se jmenným složením (≥3 kandidáti): ${withNames}/${okPages.length}`);
    console.log(`s přiloženými dokumenty:            ${withDocs}/${okPages.length}`);
    console.log(`s nalezenými daty jednání:          ${withDates}/${okPages.length}`);
    console.log(`strukturováno tabulkou:             ${okPages.filter(p => p.tables > 0).length}/${okPages.length}`);
  }
  if (!okPages.length) {
    console.log('\n⚠ Žádná stránka nebyla dosažitelná — buď je portál mimo provoz,');
    console.log('  nebo ani runner Actions na ppo.mzcr.cz nedosáhne. V druhém případě');
    console.log('  fetcher postavit nelze a zbývá cesta přes žádosti dle zák. 106/1999 Sb.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
