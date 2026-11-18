#!/usr/bin/env node
// Odchytávač pozměňovacích návrhů mimo původní předmět zákona (zdravotnictví).
// Stáhne otevřená data Poslanecké sněmovny, přečte texty nových písemných
// pozměňovacích návrhů a zapíše nálezy do data/prilepky.json.
//
// Zdroje (ověřeno průzkumným během ingest/probe/psp-probe.js, 18. 11. 2026):
//   tisky.zip, sd.zip            — otevřená data, tisky a sněmovní dokumenty
//   /sqw/sd.sqw?cd=…&o=…         — stránka dokumentu: předkladatel a odkaz na .docx
//   /sqw/text/tiskt.sqw?…        — stránka tisku: odkaz na .docx návrhu zákona
//   /sqw/text/orig2.sqw?idd=…    — samotný .docx
//
// robots.txt Sněmovny cestu /sqw/text/orig2.sqw robotům zakazuje. Vydavatel
// 18. 11. 2026 rozhodl stahovat cíleně: jen .docx pozměňovacích návrhů a tisků,
// které odchytávač potřebuje, každý jednou, s prodlevou a podepsaným
// User-Agentem. Text se neukládá, do stavu jde jen rozbor (které zákony mění).
//
// www.psp.cz není z prostředí agenta dosažitelný; běží v GitHub Actions
// (.github/workflows/prilepky.yml).
//
// Použití: node ingest/fetchers/psp_prilepky.js [--obdobi 10] [--max 300] [--minutes 40] [--dry]
// --minutes je časový rozpočet na čtení nových dokumentů; co se nestihne, počká na další běh.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZip, docxText } from '../lib/zip.js';
import { OPENDATA, PSP, parseUnl, lawBills, writtenAmendments, parseDocPage } from '../lib/psp-opendata.js';
import { loadHealthLaws, analyzeAmendment, amendedLaws, evaluateTisk, extractLawRefs, scopeFromTitleIncomplete, SIGNALY } from '../lib/prilepky.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
export const DATA_FILE = path.join(ROOT, 'data', 'prilepky.json');
export const STATE_FILE = path.join(ROOT, 'ingest', 'data', 'prilepky-stav.json');

const UA = 'ZdraveCesko-HSPA/1.0 (+https://skorezdravotnictvi.cz; odchytavac pozmenovacich navrhu)';
// Verze rozboru textu. Zvýšit při změně pravidel v lib/prilepky.js, která mění, co se z textu
// vyčte — dokumenty se pak přečtou znovu. Stav totiž drží jen rozbor, ne text.
export const VERZE_ROZBORU = 1;
const DELAY_MS = 1000; // nejvýš 1 požadavek za sekundu
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function httpGet(url, { binary = false, fetchImpl = globalThis.fetch, delay = DELAY_MS } = {}) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sleep(delay * attempt);
    try {
      const res = await fetchImpl(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
      if (!res.ok) { last = new Error(`HTTP ${res.status} ${url}`); if (res.status < 500 && res.status !== 429 && res.status !== 408) break; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (binary) return buf;
      const m = /charset=([\w-]+)/i.exec(res.headers.get('content-type') || '');
      return new TextDecoder((m ? m[1] : 'windows-1250').toLowerCase()).decode(buf);
    } catch (e) { last = e; }
  }
  throw last;
}

async function docxFromPage(pageUrl, get) {
  const page = parseDocPage(await get(pageUrl), pageUrl);
  if (!page.docx) return { page, text: null };
  return { page, text: docxText(await get(page.docx, { binary: true })) };
}

/**
 * Jeden běh. Síť jde přes `get`, takže se dá testovat bez ní.
 * @returns {{data: object, state: object, report: object}}
 */
export async function run({ obdobi = 10, max = 300, budgetMs = Infinity, state = null, get = httpGet, log = console.log, now = new Date(), clock = Date.now } = {}) {
  const deadline = clock() + budgetMs;
  state = state && state.obdobi === obdobi && state.verze_rozboru === VERZE_ROZBORU
    ? structuredClone(state) : { obdobi, verze_rozboru: VERZE_ROZBORU, navrhy: {}, tisky: {} };
  const healthLaws = loadHealthLaws();

  const tiskyZip = readZip(await get(`${OPENDATA}/tisky.zip`, { binary: true }));
  const sdZip = readZip(await get(`${OPENDATA}/sd.zip`, { binary: true }));
  const tables = {};
  for (const t of ['tisky', 'druh_tisku', 'typ_zakon', 'typ_stavu', 'stavy']) {
    const f = tiskyZip.get(`${t}.unl`);
    if (!f) throw new Error(`tisky.zip: chybí ${t}.unl — struktura otevřených dat se změnila`);
    tables[t] = parseUnl(f);
  }
  const sdRows = sdZip.get('sd_dokument.unl');
  if (!sdRows) throw new Error('sd.zip: chybí sd_dokument.unl — struktura otevřených dat se změnila');

  const bills = lawBills(tables, obdobi);
  const byCt = new Map(bills.map(b => [b.ct, b]));
  const pns = writtenAmendments(parseUnl(sdRows), obdobi).filter(p => byCt.has(p.ct));
  if (!bills.length) throw new Error(`V otevřených datech není žádný návrh zákona pro období ${obdobi}`);
  log(`Návrhů zákonů: ${bills.length} · písemných pozměňovacích návrhů k nim: ${pns.length}`);

  // 1) Nové pozměňovací návrhy: stáhnout text, uložit jen rozbor.
  const todo = pns.filter(p => !state.navrhy[p.id_dokument]).sort((a, b) => b.id_dokument - a.id_dokument);
  let fetched = 0;
  for (const pn of todo.slice(0, max)) {
    if (clock() > deadline) { log(`Časový rozpočet vyčerpán po ${fetched} dokumentech, zbytek příště.`); break; }
    if (fetched && fetched % 50 === 0) log(`  … přečteno ${fetched} z ${Math.min(todo.length, max)}`);
    const rec = { cd: pn.cd, ct: pn.ct, datum: pn.datum, url: pn.url, autor: null, zmeny: [], ucinnost: null };
    try {
      const { page, text } = await docxFromPage(pn.url, get);
      rec.autor = page.autor;
      if (text) Object.assign(rec, analyzeAmendment(text));
      else rec.bez_textu = true;
    } catch (e) {
      log(`  ! dokument ${pn.cd} (tisk ${pn.ct}): ${e.message}`);
      continue; // zkusí se příště
    }
    state.navrhy[pn.id_dokument] = rec;
    fetched++;
  }

  // 2) Předmět tisku z textu návrhu tam, kde název výčet zákonů nedává celý.
  const pnByCt = new Map();
  for (const rec of Object.values(state.navrhy)) {
    if (!pnByCt.has(rec.ct)) pnByCt.set(rec.ct, []);
    pnByCt.get(rec.ct).push(rec);
  }
  for (const [ct, recs] of pnByCt) {
    const bill = byCt.get(ct);
    if (!bill || state.tisky[ct] || !recs.some(r => r.zmeny.length)) continue;
    const zNazvu = extractLawRefs(bill.uplny_nazev);
    if (zNazvu.length && !scopeFromTitleIncomplete(bill.uplny_nazev)) continue;
    if (clock() > deadline) break; // předmět se doplní příště; do té doby platí výčet z názvu
    try {
      const { text } = await docxFromPage(`${PSP}/sqw/text/tiskt.sqw?O=${obdobi}&CT=${ct}&CT1=0`, get);
      if (text) {
        const navrh = text.split(/DŮVODOVÁ\s+ZPRÁVA|D\s?ů\s?v\s?o\s?d\s?o\s?v\s?á\s+z\s?p\s?r\s?á\s?v\s?a/)[0];
        state.tisky[ct] = { predmet_z_textu: amendedLaws(navrh).map(a => a.cislo) };
      }
    } catch (e) { log(`  ! text tisku ${ct}: ${e.message}`); }
  }

  // 3) Vyhodnocení všech tisků období ze stavu.
  const tisky = [];
  for (const bill of bills) {
    const scopeText = state.tisky[bill.ct]?.predmet_z_textu;
    const res = evaluateTisk({ ...bill, ...(scopeText ? { predmet_z_textu: scopeText } : {}) }, pnByCt.get(bill.ct) ?? [], healthLaws);
    if (res) tisky.push({ ...res, pocet_pn: (pnByCt.get(bill.ct) ?? []).length });
  }
  const order = { vysoka: 0, stredni: 1, nizka: 2 };
  tisky.sort((a, b) => order[a.uroven] - order[b.uroven] || b.ct - a.ct);

  const zbyva = todo.length - fetched;
  const bezTextu = Object.values(state.navrhy).filter(r => r.bez_textu).length;
  const data = {
    version: '1.0',
    generated_at: now.toISOString(),
    _doc: 'Pozměňovací návrhy mimo původní předmět zákona ve zdravotnictví. Generuje ingest/fetchers/psp_prilepky.js z otevřených dat Poslanecké sněmovny; ručně needitovat. Nález popisuje postup, ne politický obsah, a netvrdí, že jde o protiústavní přílepek. Metodika: PLAN-PRILEPKY.md.',
    source: { name: 'Poslanecká sněmovna — otevřená data a sněmovní dokumenty', url: `${PSP}/sqw/hp.sqw?k=1300`, fetched_at: now.toISOString() },
    obdobi,
    pokryti: { navrhu_zakonu: bills.length, pisemnych_pn: pns.length, precteno_pn: Object.keys(state.navrhy).length, pn_bez_textu: bezTextu, pn_ceka: zbyva },
    signaly: SIGNALY,
    tisky,
  };
  return { data, state, report: { fetched, zbyva, bezTextu, nalezu: tisky.length } };
}

/** Zapíše dataset jen při věcné změně (časové značky se neporovnávají). */
export function writeIfChanged(file, data) {
  const strip = d => JSON.stringify({ ...d, generated_at: null, source: { ...d.source, fetched_at: null } });
  if (fs.existsSync(file)) {
    try { if (strip(JSON.parse(fs.readFileSync(file, 'utf8'))) === strip(data)) return false; } catch { /* poškozený soubor přepíšeme */ }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const dry = process.argv.includes('--dry');
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : null;
  run({ obdobi: Number(arg('obdobi', '10')), max: Number(arg('max', '300')), budgetMs: Number(arg('minutes', '40')) * 60_000, state })
    .then(({ data, state: next, report }) => {
      console.log(`Přečteno nových PN: ${report.fetched} · čeká: ${report.zbyva} · bez .docx: ${report.bezTextu} · tisků s nálezem: ${report.nalezu}`);
      for (const t of data.tisky.filter(t => t.navrhy.length)) {
        console.log(`  [${t.uroven}] tisk ${t.ct} ${t.nazev}: ${t.navrhy.map(n => `dok. ${n.cd} → ${n.mimo_predmet.map(z => z.cislo).join(', ')}`).join(' · ')}`);
      }
      if (dry) { console.log(JSON.stringify(data, null, 1)); return; }
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 1) + '\n');
      console.log(writeIfChanged(DATA_FILE, data) ? `Zapsáno ${path.relative(ROOT, DATA_FILE)}` : 'Beze změny.');
    })
    .catch(e => { console.error('psp_prilepky selhal:', e); process.exit(1); });
}
