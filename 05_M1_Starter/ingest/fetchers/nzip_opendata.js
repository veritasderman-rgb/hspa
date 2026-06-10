// NZIP / ÚZIS open-data fetcher (data.mzcr.cz, distribuované přes katalog NZIP).
//
// Kontext (viz docs/traps.md): národní katalog data.gov.cz CKAN API je mrtvé,
// ale NZIP „Datové zpravodajství" (nzip.cz/modul/datove-zpravodajstvi) je živý
// rozcestník — každá detailní stránka /data/{id}-{slug} odkazuje na stabilní
// CSV distribuci na data.mzcr.cz:
//   https://data.mzcr.cz/data/distribuce/{distId}/{soubor}.csv
//   + schéma:  https://data.mzcr.cz/data/schemata/{distId}/{soubor}.csv-metadata.json
//
// Distribuční ID nelze odvodit → discoverCsvUrl() ho dohledá scrapingem
// detailní stránky NZIP (analogicky discoverLekarnyUrl v sukl.js).
//
// Agregační režimy (mapping ingest/mapping/nzip_opendata_codes.json):
//   - "microdata_ratio": mikrodata 1 řádek = 1 osoba/případ; podíl řádků,
//        kde flag_col === flag_value, group by rok → procento. (Stream parser,
//        soubory bývají 100–300 MB.)
//   - "aggregate_ratio": agregát s čitatelem a jmenovatelem ve sloupcích;
//        suma num_col / suma denom_col za rok → procento.
//   - "aggregate_sum": agregát; suma value_col za rok (+ volitelný filtr).
//
// Pro velké soubory NEukládáme celé CSV do cache (jako jiné fetchery), jen
// vypočtený výsledek { trend:[{year,value}], cz:{value,year}, source }.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry } from '../lib/http.js';
import { writeCache } from '../lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const NZIP_DETAIL = 'https://www.nzip.cz/data';

export function loadNzipMapping() {
  const file = path.join(ROOT, 'ingest', 'mapping', 'nzip_opendata_codes.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).indicators ?? {};
}

/**
 * Z detailní stránky NZIP /data/{id}-{slug} vytáhne první CSV distribuci
 * na data.mzcr.cz. Vrací { csvUrl, metaUrl } nebo vyhodí chybu.
 * @param {number|string} nzipId  — číselné ID datové sady v NZIP katalogu
 * @param {string} [slug]         — slug (volitelný; URL funguje i bez něj přes redirect)
 */
export async function discoverCsvUrl(nzipId, slug = '', opts = {}) {
  const { fetchImpl } = opts;
  const url = `${NZIP_DETAIL}/${nzipId}${slug ? '-' + slug : ''}`;
  const html = await fetchWithRetry(url, { fetchImpl, parse: 'text' });
  const m = html.match(/https:\/\/data\.mzcr\.cz\/data\/distribuce\/(\d+)\/([^"'\s]+\.csv)/i);
  if (!m) throw new Error(`NZIP ${nzipId}: CSV distribuce nenalezena na ${url}`);
  const csvUrl = m[0];
  const metaUrl = `https://data.mzcr.cz/data/schemata/${m[1]}/${m[2]}-metadata.json`;
  return { csvUrl, metaUrl, distId: Number(m[1]) };
}

/** Najde index sloupce v hlavičce CSV (case-insensitive, trim). */
function colIndex(header, name) {
  const target = String(name).trim().toLowerCase();
  return header.findIndex(h => h.trim().toLowerCase() === target);
}

/**
 * Streamovaně agreguje CSV podle režimu mappingu.
 * @returns {{ trend:{year:number,value:number}[], cz:{value:number,year:number} }}
 */
export async function aggregateCsvStream(csvUrl, mapping, opts = {}) {
  const { fetchImpl = globalThis.fetch } = opts;
  const res = await fetchImpl(csvUrl, { headers: { 'User-Agent': 'ZdraveCesko-HSPA/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${csvUrl}`);

  // res.body je WHATWG ReadableStream (undici fetch) → převedeme na Node Readable.
  // V testech přichází rovnou Node Readable (má .on) → použijeme přímo.
  const nodeStream = typeof res.body?.on === 'function' ? res.body : Readable.fromWeb(res.body);
  const rl = readline.createInterface({ input: nodeStream, crlfDelay: Infinity });
  const delim = mapping.delimiter ?? ',';
  let header = null;
  let idx = {};
  // rok -> { num, denom }
  const byYear = {};
  const yearCol = mapping.year_col ?? 'rok';
  const mode = mapping.mode;

  for await (const line of rl) {
    if (!line) continue;
    const parts = splitCsvLine(line, delim);
    if (!header) {
      header = parts;
      idx = {
        year: colIndex(header, yearCol),
        flag: mapping.flag_col ? colIndex(header, mapping.flag_col) : -1,
        num: mapping.num_col ? colIndex(header, mapping.num_col) : -1,
        denom: mapping.denom_col ? colIndex(header, mapping.denom_col) : -1,
        value: mapping.value_col ? colIndex(header, mapping.value_col) : -1,
        filter: mapping.filter_col ? colIndex(header, mapping.filter_col) : -1,
      };
      continue;
    }
    const y = parseInt(parts[idx.year], 10);
    if (!Number.isFinite(y) || y < 1990 || y > 2100) continue;
    if (mapping.filter_col && idx.filter >= 0) {
      if (String(parts[idx.filter]).trim() !== String(mapping.filter_value).trim()) continue;
    }
    const b = byYear[y] ??= { num: 0, denom: 0 };
    if (mode === 'microdata_ratio') {
      b.denom += 1;
      if (String(parts[idx.flag]).trim() === String(mapping.flag_value).trim()) b.num += 1;
    } else if (mode === 'aggregate_ratio') {
      b.num += toNum(parts[idx.num]);
      b.denom += toNum(parts[idx.denom]);
    } else if (mode === 'aggregate_sum') {
      b.num += toNum(parts[idx.value]);
      b.denom = 1;
    }
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  if (!years.length) throw new Error('NZIP agregace: žádná data');
  const scale = mapping.scale ?? (mode === 'aggregate_sum' ? 1 : 100);
  const compute = (b) => {
    if (mode === 'aggregate_sum') return round(b.num, mapping.decimals ?? 0);
    return b.denom > 0 ? round((b.num / b.denom) * scale, mapping.decimals ?? 1) : null;
  };
  const trendYears = mapping.trend_years ?? 6;
  const trend = years.slice(-trendYears)
    .map(y => ({ year: y, value: compute(byYear[y]) }))
    .filter(p => p.value != null);
  const latest = trend[trend.length - 1];
  return { trend, cz: { value: latest.value, year: latest.year } };
}

function toNum(s) {
  const n = Number(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
// Jednoduchý CSV splitter — data.mzcr.cz nepoužívá uvozovky v číselných agregátech.
function splitCsvLine(line, delim) {
  return line.split(delim);
}

export async function fetchNzipIndicator(indicatorId, mapping, opts = {}) {
  const { csvUrl } = mapping.csv_url
    ? { csvUrl: mapping.csv_url }
    : await discoverCsvUrl(mapping.nzip_id, mapping.slug ?? '', opts);
  const { trend, cz } = await aggregateCsvStream(csvUrl, mapping, opts);
  const out = {
    cz, trend,
    source: {
      name: mapping.source_name ?? 'ÚZIS · NZIS (otevřená data NZIP)',
      url: mapping.source_url ?? `https://www.nzip.cz/data/${mapping.nzip_id}`,
      csv_url: csvUrl,
    },
    fetched_at: new Date().toISOString(),
  };
  writeCache(`nzip_${indicatorId}.json`, out);
  return out;
}

export async function fetchNzipOpendata(opts = {}) {
  const mapping = loadNzipMapping();
  const summary = { ok: [], failed: [] };
  for (const [id, m] of Object.entries(mapping)) {
    try {
      const r = await fetchNzipIndicator(id, m, opts);
      summary.ok.push({ id, value: r.cz.value, year: r.cz.year });
      console.log(`  ✓ NZIP ${id}: ${r.cz.value} (${r.cz.year})`);
    } catch (err) {
      summary.failed.push({ id, error: err.message });
      console.error(`  FAIL NZIP ${id}: ${err.message}`);
    }
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNzipOpendata({}).then(s => {
    console.log(`NZIP open data: ${s.ok.length} ok, ${s.failed.length} failed`);
    if (s.failed.length) process.exitCode = 1;
  });
}
