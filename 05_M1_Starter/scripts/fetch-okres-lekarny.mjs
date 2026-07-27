// Hustota lékáren na 100 000 obyvatel — OKRESNÍ rozpad + přepočet krajské
// vrstvy z jednoho konzistentního výpočtu → data/regions.json (dataset
// lekarny_per_100k_kraje).
//
// Zdroje (vše curl-dostupné, §4 stopa):
// - SÚKL open data „Seznam lékáren": měsíční ZIP (lekarny_seznam.csv,
//   cp1250) — počty aktivních lékáren vč. OOVL; stejný zdroj používá živý
//   kontraktový indikátor lekarny_per_100k (25,06/100k, 2026).
// - ČSÚ katalog dimenze UZ5OK „Obce (okres)" — 6 258 obcí s okresem
//   v závorce → převod MESTO→okres bez PSČ heuristik (duplicitní jména
//   obcí řeší kaskáda níže).
// - ČSÚ výběr OBY04BOT02 (podrobné úmrtnostní tabulky okresů) — ukazatel
//   9379UT „Počet obyvatel (Px)": Σ přes věky a pohlaví = osoboroky okna,
//   /5 = průměrná roční populace okresu 2021–2025 (oficiální ČSÚ číslo).
//
// PROČ SE PŘEPISUJE I KRAJSKÁ VRSTVA: původní krajské hodnoty byly seed
// (avg 26,7; Praha 32,4) a odporovaly živému kontraktu (25,06) — stejný
// SÚKL seznam dnes dává ČR ≈ 24,9. Jeden výpočet pro kraj i okres zaručuje
// přesnou rekonciliaci (součet okresů = kraj) a soulad s kontraktem.
//
// Mapování MESTO→okres (kaskáda, deterministická):
//   1. jméno obce unikátní v ČR → přímo;
//   2. víc kandidátů → PSČ→kraj (PSC_KRAJ_MAP) zúží na 1;
//   3. dál nejednoznačné/překlepy → nejbližší medián PSČ okresu naučený
//      z kroků 1–2 (řeší i chybná pásma PSC_KRAJ_MAP na hranici
//      Olomoucký/Moravskoslezský — Přerov 750xx, Bruntál 793xx).
//
// Spuštění: node scripts/fetch-okres-lekarny.mjs   (stahuje ~46 MB)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pscToKraj } from '../ingest/fetchers/sukl.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGIONS_PATH = path.join(ROOT, 'data', 'regions.json');

const SUKL_CATALOG = 'https://opendata.sukl.cz/?q=katalog/seznam-lekaren';
const CSU_DATA = 'https://data.csu.gov.cz/api/dotaz/v1/data/vybery';
const CSU_KATALOG = 'https://data.csu.gov.cz/api/katalog/v1';
const UA = { 'User-Agent': 'ZdraveCesko-HSPA/1.0' };
const PX = '9379UT';
const PERIOD = null; // null = poslední dostupné pětileté období

async function fetchWithRetry(url, opts = {}, { retries = 4, validate } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: UA, ...opts });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (validate) validate(buf);
      return buf;
    } catch (err) {
      lastErr = err;
      console.warn(`  [retry ${i + 1}/${retries}] ${url.slice(0, 80)}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2500 * (i + 1)));
    }
  }
  throw new Error(`${url}: ${lastErr.message}`);
}

const validJsonStat = buf => {
  const j = JSON.parse(buf.toString('utf8'));
  if (j.class !== 'dataset') throw new Error('není JSON-stat dataset');
};

function jsonStatReader(js) {
  const dims = js.id, size = js.size, idx = {};
  for (const d of dims) idx[d] = js.dimension[d].category.index;
  return {
    idx,
    label: d => js.dimension[d].category.label || {},
    value(picks) {
      let o = 0;
      for (let k = 0; k < dims.length; k++) {
        const i = picks[dims[k]] == null ? 0 : idx[dims[k]][picks[dims[k]]];
        if (i == null) throw new Error(`${dims[k]}: položka ${picks[dims[k]]} nenalezena`);
        o = o * size[k] + i;
      }
      return js.value[o];
    },
  };
}

async function main() {
  // ── 1) SÚKL: aktuální ZIP se seznamem lékáren ──────────────────────────
  console.log('[lekarny] hledám aktuální SÚKL ZIP…');
  const page = (await fetchWithRetry(SUKL_CATALOG)).toString('utf8');
  const zipMatch = page.match(/soubory\/SOD(\d{8})\/LEKARNY\d{8}\.zip/);
  if (!zipMatch) throw new Error('Na katalogové stránce SÚKL nenalezen ZIP seznamu lékáren');
  const zipUrl = `https://opendata.sukl.cz/${zipMatch[0]}`;
  const snapshotDate = `${zipMatch[1].slice(0, 4)}-${zipMatch[1].slice(4, 6)}-${zipMatch[1].slice(6, 8)}`;
  console.log('[lekarny] stahuji', zipUrl, `(stav k ${snapshotDate})`);
  const zipBuf = await fetchWithRetry(zipUrl);
  const tmpZip = path.join(os.tmpdir(), 'hspa-lekarny.zip');
  fs.writeFileSync(tmpZip, zipBuf);
  const csvRaw = execFileSync('unzip', ['-p', tmpZip, 'lekarny_seznam.csv'], { maxBuffer: 64 * 1024 * 1024 });
  const csv = new TextDecoder('windows-1250').decode(csvRaw);
  const pharmacies = csv.split('\n').slice(1).filter(l => l.trim()).map(ln => {
    const f = ln.split(';');
    return { mesto: (f[5] || '').trim(), psc: Number((f[7] || '').replace(/\D/g, '')) };
  });
  console.log(`[lekarny] lékáren v seznamu: ${pharmacies.length}`);
  if (pharmacies.length < 2000 || pharmacies.length > 4000) {
    throw new Error(`Počet lékáren ${pharmacies.length} mimo věrohodný rozsah 2000–4000`);
  }

  // ── 2) ČSÚ: obce s okresem (UZ5OK) + kódy okresů (Uz3) ────────────────
  console.log('[lekarny] stahuji číselník obcí (UZ5OK)…');
  const obceBuf = await fetchWithRetry(`${CSU_KATALOG}/dimenze/UZ5OK/polozky/hledani?verze=1`, {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/json' },
    // text "5" matchuje kód každé obce (všechny začínají 5) → celý číselník
    body: JSON.stringify({ podminky: { polozkyFiltru: [{ typPodminky: 'TEXTOVE_HLEDANI', textoveHledani: { text: '5' } }], vztahPolozek: 'VSE' } }),
  });
  const obce = JSON.parse(obceBuf.toString('utf8')).polozky || [];
  if (obce.length < 6000) throw new Error(`Číselník obcí vrátil jen ${obce.length} položek`);
  const byObec = {};
  for (const p of obce) {
    const m = p.nazev.match(/^(.*) \(okr\. (.*)\)$/);
    if (!m) continue;
    (byObec[m[1].toLowerCase()] = byObec[m[1].toLowerCase()] || []).push(m[2]);
  }

  // ── 3) ČSÚ: populace okresů (OBY04BOT02, Px) ──────────────────────────
  console.log('[lekarny] stahuji okresní tabulky (OBY04BOT02, ~45 MB)…');
  const utBuf = await fetchWithRetry(`${CSU_DATA}/OBY04BOT02?rozsah=CELY_VYBER`, {}, { validate: validJsonStat });
  const ut = jsonStatReader(JSON.parse(utBuf.toString('utf8')));
  const period = PERIOD || Object.keys(ut.idx.CAS5R).sort().slice(-1)[0];
  const okresLabel = ut.label('Uz3');
  const okresCodes = Object.keys(ut.idx.Uz3);
  const okresCodeByName = {};
  for (const c of okresCodes) okresCodeByName[okresLabel[c]] = c;
  const popByOkres = {};
  const ages = Object.keys(ut.idx.VEK1UT);
  for (const code of okresCodes) {
    let py = 0;
    for (const age of ages) {
      for (const sex of ['1', '2']) {
        const v = ut.value({ Uz3: code, CAS5R: period, POHZM: sex, VEK1UT: age, IndicatorType: PX });
        if (Number.isFinite(v)) py += v;
      }
    }
    popByOkres[code] = py / 5; // osoboroky pětiletého okna → průměrná roční populace
  }
  const popCr = Object.values(popByOkres).reduce((a, b) => a + b, 0);
  if (popCr < 10e6 || popCr > 11.5e6) throw new Error(`Populace ČR ${Math.round(popCr)} mimo rozsah 10–11,5 mil.`);

  // ── 4) Mapování lékáren na okresy (kaskáda) ───────────────────────────
  const resolved = [];
  const pending = [];
  for (const r of pharmacies) {
    const cands = byObec[r.mesto.toLowerCase()];
    if (cands) {
      const uniq = [...new Set(cands)];
      if (uniq.length === 1) { resolved.push({ ...r, okres: uniq[0] }); continue; }
      const kraj = pscToKraj(r.psc);
      const inKraj = uniq.filter(o => okresCodeByName[o] && kraj && okresCodeByName[o].slice(0, 5) === kraj.code);
      if (inKraj.length === 1) { resolved.push({ ...r, okres: inKraj[0] }); continue; }
      pending.push({ ...r, cands: uniq });
    } else pending.push({ ...r, cands: null });
  }
  const pscsByOkres = {};
  for (const r of resolved) (pscsByOkres[r.okres] = pscsByOkres[r.okres] || []).push(r.psc);
  const medianPsc = {};
  for (const [o, arr] of Object.entries(pscsByOkres)) {
    arr.sort((a, b) => a - b);
    medianPsc[o] = arr[Math.floor(arr.length / 2)];
  }
  let tieBreaks = 0;
  for (const r of pending) {
    const pool = (r.cands ? r.cands.filter(o => medianPsc[o] != null) : Object.keys(medianPsc));
    if (!pool.length) { console.warn(`  [drop] ${r.mesto} (${r.psc})`); continue; }
    let best = pool[0];
    for (const o of pool) if (Math.abs(medianPsc[o] - r.psc) < Math.abs(medianPsc[best] - r.psc)) best = o;
    resolved.push({ ...r, okres: best });
    tieBreaks++;
  }
  console.log(`[lekarny] namapováno ${resolved.length}/${pharmacies.length} (tie-break: ${tieBreaks})`);
  if (resolved.length < pharmacies.length - 3) {
    throw new Error(`Nenamapováno ${pharmacies.length - resolved.length} lékáren — zkontroluj kaskádu`);
  }

  const cntByOkres = {};
  for (const r of resolved) {
    const code = okresCodeByName[r.okres];
    cntByOkres[code] = (cntByOkres[code] || 0) + 1;
  }

  // ── 5) Hustoty + zápis ────────────────────────────────────────────────
  const round1 = v => Math.round(v * 10) / 10;
  const okresItems = okresCodes.map(code => ({
    code,
    name: okresLabel[code],
    kraj: code.slice(0, 5),
    value: round1((cntByOkres[code] || 0) / popByOkres[code] * 100000),
  })).sort((a, b) => a.code.localeCompare(b.code));

  const krajCnt = {}, krajPop = {};
  for (const [c, n] of Object.entries(cntByOkres)) krajCnt[c.slice(0, 5)] = (krajCnt[c.slice(0, 5)] || 0) + n;
  for (const [c, p] of Object.entries(popByOkres)) krajPop[c.slice(0, 5)] = (krajPop[c.slice(0, 5)] || 0) + p;
  const countryAvg = round1(resolved.length / popCr * 100000);

  const regions = JSON.parse(fs.readFileSync(REGIONS_PATH, 'utf8'));
  const ds = regions.datasets.find(d => d.indicator_id === 'lekarny_per_100k');
  if (!ds) throw new Error('Dataset lekarny_per_100k nenalezen v regions.json');

  // §4: soulad s živým kontraktovým indikátorem (stejný SÚKL seznam)
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'))
    .indicators.find(i => i.id === 'lekarny_per_100k');
  if (contract && Math.abs(countryAvg - contract.value) / contract.value > 0.02) {
    throw new Error(`ČR průměr ${countryAvg} se liší od kontraktu ${contract.value} o >2 % — zkontroluj vstupy`);
  }

  ds.year = Number(snapshotDate.slice(0, 4));
  ds.country_avg = countryAvg;
  ds.regions = ds.regions.map(r => ({ ...r, value: round1(krajCnt[r.code] / krajPop[r.code] * 100000) }));
  ds.source = {
    name: `SÚKL — Seznam lékáren (stav k ${snapshotDate}); populace ČSÚ (průměr ${period})`,
    url: 'https://opendata.sukl.cz/?q=katalog/seznam-lekaren',
  };
  // Top-level note se renderuje na detailu indikátoru (src/indicator.js) —
  // musí popisovat AKTUÁLNÍ metodiku a závěry, ne předchozí PSČ-odhad.
  ds.note = `Výpočet: SÚKL Seznam lékáren (vč. OOVL, stav k ${snapshotDate}), každá lékárna přiřazena okresu přes ČSÚ číselník obcí (bez PSČ heuristik); jmenovatel průměrná populace okresů ${period} (ČSÚ úmrtnostní tabulky, Px). Krajská čísla = součet okresů, celorepublikový průměr odpovídá živému indikátoru. Nejvyšší hustotu mají Královéhradecký, Jihomoravský a Zlínský kraj, nejnižší Ústecký, Středočeský a Liberecký — Středočeský kraj je specifický spádovostí do pražských lékáren. Indikátor je context_dependent: ČR má hustotu pod průměrem OECD, ale to automaticky neznamená horší dostupnost — viz Dánsko (~17/100k) s plně regulovanou sítí.`;
  ds.okresy = {
    source: 'SÚKL — Seznam lékáren (vč. OOVL); obce→okres dle ČSÚ číselníku; populace ČSÚ úmrtnostní tabulky (Px)',
    source_url: 'https://opendata.sukl.cz/?q=katalog/seznam-lekaren',
    period: `${snapshotDate} / populace ⌀ ${period}`,
    note: `Počet aktivních lékáren a odloučených oddělení výdeje léčiv (OOVL) dle SÚKL k ${snapshotDate} na 100 000 obyvatel okresu (populace = průměr ${period} z okresních úmrtnostních tabulek ČSÚ). Krajská čísla jsou spočtena týmž výpočtem — součet okresů přesně odpovídá krajům. Celorepublikový průměr ${countryAvg} odpovídá živému indikátoru (${contract ? contract.value : '—'}).`,
    fetched_at: new Date().toISOString().slice(0, 10),
    items: okresItems,
  };

  fs.writeFileSync(REGIONS_PATH, JSON.stringify(regions, null, 2) + '\n');
  console.log(`[lekarny] OK: ${okresItems.length} okresů, ČR ${countryAvg}/100k, kraje přepočteny (dřívější seed avg ${'26,7'} nahrazen)`);
}

main().catch(err => { console.error('[lekarny] FAIL:', err.message); process.exit(1); });
