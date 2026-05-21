// Build skript — kolorektální screening (kolonoskopie).
//
// Stáhne 6 otevřených datasetů Národního screeningového programu kolorektálního
// karcinomu (ÚZIS ČR / MZ ČR, licence CC BY 4.0) a zagreguje je do kompaktního
// data/kolonoskopie.json, který čte stránka kolonoskopie.html.
//
// Spuštění:  npm run build:kolonoskopie
//
// Data se aktualizují přibližně jednou ročně (uzavřený kalendářní rok), proto
// tento skript NENÍ součástí denního ingest cronu — spouští se ručně a výsledný
// JSON se commituje do repozitáře.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../ingest/lib/csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'ingest', 'cache', 'kolonoskopie');
const OUT_PATH = path.join(ROOT, 'data', 'kolonoskopie.json');
const USER_AGENT = 'ZdraveCesko-HSPA/1.0';

const PORTAL_URL =
  'https://www.nzip.cz/kategorie/327-informacni-system-screeningu-karcinomu-tlusteho-streva-konecniku-otevrena-data';

// Definice 6 datasetů. `gz` = stažený soubor je gzip.
const DATASETS = {
  coverage: {
    code: 'PPS-02-01',
    name: 'Pokrytí cílové populace screeningem',
    url: 'https://data.mzcr.cz/data/distribuce/62/Otevrena-data-PPS-02-01-kolorektum-screening-pokryti-populace.csv',
    page: 'https://www.nzip.cz/data/2069-kolorektum-screening-pokryti-populace-otevrena-data',
    period: '2011–2024',
    file: 'pps-02-01.csv',
  },
  positivity: {
    code: 'PPS-02-02',
    name: 'Podíl pozitivních výsledků TOKS',
    url: 'https://data.mzcr.cz/data/distribuce/394/Otevrena-data-PPS-02-02-kolorektum-toks-podil-pozitivnich.csv',
    page: 'https://www.nzip.cz/data/2090-kolorektum-toks-podil-pozitivnich-otevrena-data',
    period: '2011–2024',
    file: 'pps-02-02.csv',
  },
  fobt: {
    code: 'PPS-02-03',
    name: 'Počet provedených testů TOKS',
    url: 'https://data.mzcr.cz/data/distribuce/395/Otevrena-data-PPS-02-03-kolorektum-toks-pocet.csv',
    page: 'https://www.nzip.cz/data/2091-kolorektum-toks-pocet-otevrena-data',
    period: '2010–2024',
    file: 'pps-02-03.csv',
  },
  colonoscopy: {
    code: 'PPS-02-04',
    name: 'Počet provedených screeningových kolonoskopií',
    url: 'https://data.mzcr.cz/data/distribuce/397/Otevrena-data-PPS-02-04-kolorektum-screeningove-kolonoskopie-pocet.csv',
    page: 'https://www.nzip.cz/data/2092-kolorektum-screeningove-kolonoskopie-pocet-otevrena-data',
    period: '2010–2024',
    file: 'pps-02-04.csv',
  },
  followup: {
    code: 'PPS-02-05',
    name: 'Pozitivní TOKS a návazná kolonoskopie',
    url: 'https://datanzis.uzis.gov.cz/data/PPS-02-KRK/PPS-02-05/Otevrena-data-PPS-02-05-kolorektum-toks-kolonoskopie.csv.gz',
    page: 'https://www.nzip.cz/data/2093-kolorektum-toks-kolonoskopie-otevrena-data',
    period: '2010–2024',
    file: 'pps-02-05.csv',
    gz: true,
  },
  waiting: {
    code: 'PPS-02-07',
    name: 'Průměrná čekací doba na návaznou kolonoskopii',
    url: 'https://datanzis.uzis.gov.cz/data/PPS-02-KRK/PPS-02-07/Otevrena-data-PPS-02-07-kolorektum-cekaci-doba.csv',
    page: 'https://www.nzip.cz/data/2328-kolorektum-cekaci-doba-otevrena-data',
    period: '2019–2024',
    file: 'pps-02-07.csv',
  },
};

// Kanonické názvy krajů (kódy NUTS-3 sdílené s data/cz-regions.geojson a cz-map.js).
const REGION_NAMES = {
  CZ010: 'Hlavní město Praha',
  CZ020: 'Středočeský kraj',
  CZ031: 'Jihočeský kraj',
  CZ032: 'Plzeňský kraj',
  CZ041: 'Karlovarský kraj',
  CZ042: 'Ústecký kraj',
  CZ051: 'Liberecký kraj',
  CZ052: 'Královéhradecký kraj',
  CZ053: 'Pardubický kraj',
  CZ063: 'Kraj Vysočina',
  CZ064: 'Jihomoravský kraj',
  CZ071: 'Olomoucký kraj',
  CZ072: 'Zlínský kraj',
  CZ080: 'Moravskoslezský kraj',
};

const AGE_ORDER = [
  '50–54 let', '55–59 let', '60–64 let', '65–69 let',
  '70–74 let', '75–79 let', '80–84 let', '85 let a více',
];

// ─────────────────────────────────────────────
// Stahování
// ─────────────────────────────────────────────

async function fetchBuffer(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (attempt >= 4) throw new Error(`Stažení selhalo: ${url} — ${err.message}`);
    const wait = 2000 * 2 ** (attempt - 1);
    console.warn(`  retry ${attempt} za ${wait}ms (${err.message})`);
    await new Promise(r => setTimeout(r, wait));
    return fetchBuffer(url, attempt + 1);
  }
}

// Stáhne dataset do cache (pokud tam ještě není). Gzip soubory rovnou rozbalí.
async function ensureCached(ds) {
  const dest = path.join(CACHE_DIR, ds.file);
  if (fs.existsSync(dest)) {
    console.log(`  cache hit: ${ds.code}`);
    return dest;
  }
  console.log(`  stahuji ${ds.code} …`);
  const buf = await fetchBuffer(ds.url);
  if (ds.gz) {
    const { gunzipSync } = await import('node:zlib');
    fs.writeFileSync(dest, gunzipSync(buf));
  } else {
    fs.writeFileSync(dest, buf);
  }
  return dest;
}

// ─────────────────────────────────────────────
// Pomocné agregační funkce
// ─────────────────────────────────────────────

function round(n, d = 1) {
  if (!Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// Sečte numerator/denominator do mapy klíčovanou libovolnou dimenzí.
function makeBucket() {
  return { num: 0, den: 0 };
}

// Časová řada {year → bucket} → seřazené pole.
function seriesFromYearMap(map, project) {
  return [...map.keys()].sort((a, b) => a - b).map(y => project(y, map.get(y)));
}

// ─────────────────────────────────────────────
// PPS-02-01 / 02-03 / 02-04 / 02-02 — řádkové CSV (rok × pohlaví × věk × okres)
// ─────────────────────────────────────────────

// Obecná agregace pro datasety s numerator (+ volitelně denominator) na řádek.
function aggregateRowwise(rows, cfg) {
  const { numField, denField, regionCodeField, regionNameField,
          districtCodeField, districtNameField } = cfg;
  const latestYear = Math.max(...rows.map(r => +r.rok));

  const nat = new Map();      // year → bucket
  const gender = { M: new Map(), Z: new Map() };
  const age = new Map();      // ageName → Map(year → bucket)
  const region = new Map();   // code → Map(year → bucket)
  const distLatest = new Map();   // code → { bucket, name, region }
  const regLatest = new Map();    // code → bucket (latest year)

  for (const r of rows) {
    const year = +r.rok;
    const num = +r[numField] || 0;
    const den = denField ? (+r[denField] || 0) : 0;
    const g = r.pohlavi;
    const ageName = r.vek_nazev;
    const rCode = r[regionCodeField];
    const dCode = r[districtCodeField];

    const add = (bucket) => { bucket.num += num; bucket.den += den; };

    if (!nat.has(year)) nat.set(year, makeBucket());
    add(nat.get(year));

    if (gender[g]) {
      if (!gender[g].has(year)) gender[g].set(year, makeBucket());
      add(gender[g].get(year));
    }

    if (!age.has(ageName)) age.set(ageName, new Map());
    const ageYear = age.get(ageName);
    if (!ageYear.has(year)) ageYear.set(year, makeBucket());
    add(ageYear.get(year));

    if (!region.has(rCode)) region.set(rCode, new Map());
    const regYear = region.get(rCode);
    if (!regYear.has(year)) regYear.set(year, makeBucket());
    add(regYear.get(year));

    if (year === latestYear) {
      if (!regLatest.has(rCode)) regLatest.set(rCode, makeBucket());
      add(regLatest.get(rCode));
      if (!distLatest.has(dCode)) {
        distLatest.set(dCode, {
          bucket: makeBucket(),
          name: r[districtNameField],
          region: rCode,
        });
      }
      add(distLatest.get(dCode).bucket);
    }
  }

  // Projekce bucketu na výsledný objekt podle typu datasetu.
  const project = cfg.project;

  const out = {
    latest_year: latestYear,
    national: seriesFromYearMap(nat, (y, b) => ({ year: y, ...project(b) })),
    by_gender: {
      M: seriesFromYearMap(gender.M, (y, b) => ({ year: y, ...project(b) })),
      Z: seriesFromYearMap(gender.Z, (y, b) => ({ year: y, ...project(b) })),
    },
    by_age: {},
    by_region: {},
    regions_latest: [],
    districts_latest: [],
  };

  for (const ageName of AGE_ORDER) {
    if (age.has(ageName)) {
      out.by_age[ageName] = seriesFromYearMap(age.get(ageName),
        (y, b) => ({ year: y, ...project(b) }));
    }
  }

  for (const [code, yearMap] of region) {
    out.by_region[code] = seriesFromYearMap(yearMap,
      (y, b) => ({ year: y, ...project(b) }));
  }

  out.regions_latest = [...regLatest.entries()]
    .map(([code, b]) => ({ code, name: REGION_NAMES[code] || code, ...project(b) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  out.districts_latest = [...distLatest.entries()]
    .map(([code, d]) => ({
      code, name: d.name, region_code: d.region, ...project(d.bucket),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  return out;
}

// ─────────────────────────────────────────────
// PPS-02-05 — stream párových záznamů TOKS+ → kolonoskopie (1,2 mil. řádků)
// ─────────────────────────────────────────────

async function aggregateFollowup(csvPath) {
  const MAX_WEEKS = 27;
  const nat = new Map();        // year → { t, k }
  const gender = new Map();     // year → { M:{t,k}, Z:{t,k} }
  const age = new Map();        // year → { ageName: {t,k} }
  const region = new Map();     // year → { code: {t,k,weeksSum} }
  const hist = new Array(MAX_WEEKS + 1).fill(0);       // index = týdny
  const histByYear = new Map(); // year → number[]
  let weeksSum = 0, weeksCount = 0;

  const ensure = (map, year) => {
    if (!map.has(year)) map.set(year, {});
    return map.get(year);
  };

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath, 'utf8'),
    crlfDelay: Infinity,
  });

  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    if (!line) continue;
    // Pole datasetu neobsahují čárky uvnitř hodnot → bezpečné dělení.
    const c = line.split(',');
    const vykon = c[1].replace(/"/g, '');
    const g = c[2].replace(/"/g, '');
    const ageName = c[4].replace(/"/g, '');
    const regCode = c[7].replace(/"/g, '');
    const year = +c[9];
    const diff = c[12] ? +c[12].replace(/"/g, '') : null;
    const isK = vykon === 'K';
    const key = isK ? 'k' : 't';

    if (!nat.has(year)) nat.set(year, { t: 0, k: 0 });
    nat.get(year)[key]++;

    const gy = ensure(gender, year);
    (gy[g] ??= { t: 0, k: 0 })[key]++;

    const ay = ensure(age, year);
    (ay[ageName] ??= { t: 0, k: 0 })[key]++;

    const ry = ensure(region, year);
    (ry[regCode] ??= { t: 0, k: 0, weeksSum: 0 })[key]++;

    if (isK && Number.isFinite(diff)) {
      const w = Math.min(Math.max(diff, 0), MAX_WEEKS);
      hist[w]++;
      if (!histByYear.has(year)) histByYear.set(year, new Array(MAX_WEEKS + 1).fill(0));
      histByYear.get(year)[w]++;
      weeksSum += diff;
      weeksCount++;
      ry[regCode].weeksSum += diff;
    }
  }

  const compliance = (b) => (b.t > 0 ? round((b.k / b.t) * 100, 1) : null);
  const latestYear = Math.max(...nat.keys());

  // Medián a 90. percentil z histogramu.
  function percentileFromHist(arr, p) {
    const total = arr.reduce((s, n) => s + n, 0);
    if (!total) return null;
    const target = total * p;
    let cum = 0;
    for (let w = 0; w <= MAX_WEEKS; w++) {
      cum += arr[w];
      if (cum >= target) return w;
    }
    return MAX_WEEKS;
  }

  const out = {
    latest_year: latestYear,
    national: [...nat.keys()].sort((a, b) => a - b).map(y => {
      const b = nat.get(y);
      return { year: y, positive_toks: b.t, colonoscopies: b.k, compliance: compliance(b) };
    }),
    by_gender: { M: [], Z: [] },
    by_age: {},
    by_region: {},
    regions_latest: [],
    weeks_histogram: hist.map((count, weeks) => ({ weeks, count })).slice(1),
    weeks_histogram_by_year: {},
    weeks_stats: {
      mean: weeksCount ? round(weeksSum / weeksCount, 1) : null,
      median: percentileFromHist(hist, 0.5),
      p90: percentileFromHist(hist, 0.9),
      count: weeksCount,
    },
  };

  const years = [...nat.keys()].sort((a, b) => a - b);
  for (const sex of ['M', 'Z']) {
    out.by_gender[sex] = years.filter(y => gender.get(y)?.[sex]).map(y => {
      const b = gender.get(y)[sex];
      return { year: y, positive_toks: b.t, colonoscopies: b.k, compliance: compliance(b) };
    });
  }

  for (const ageName of AGE_ORDER) {
    const arr = years.filter(y => age.get(y)?.[ageName]).map(y => {
      const b = age.get(y)[ageName];
      return { year: y, positive_toks: b.t, colonoscopies: b.k, compliance: compliance(b) };
    });
    if (arr.length) out.by_age[ageName] = arr;
  }

  const regionCodes = new Set();
  for (const y of years) for (const code of Object.keys(region.get(y) || {})) regionCodes.add(code);
  for (const code of regionCodes) {
    out.by_region[code] = years.filter(y => region.get(y)?.[code]).map(y => {
      const b = region.get(y)[code];
      return { year: y, positive_toks: b.t, colonoscopies: b.k, compliance: compliance(b) };
    });
  }

  const regLatest = region.get(latestYear) || {};
  out.regions_latest = Object.entries(regLatest)
    .filter(([code]) => REGION_NAMES[code])
    .map(([code, b]) => ({
      code,
      name: REGION_NAMES[code] || code,
      positive_toks: b.t,
      colonoscopies: b.k,
      compliance: compliance(b),
      mean_weeks: b.k > 0 ? round(b.weeksSum / b.k, 1) : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  for (const [y, arr] of histByYear) {
    out.weeks_histogram_by_year[y] = arr.map((count, weeks) => ({ weeks, count })).slice(1);
  }

  return out;
}

// ─────────────────────────────────────────────
// PPS-02-07 — čekací doba (rok × kvartál × okres)
// ─────────────────────────────────────────────

function aggregateWaiting(rows) {
  const latestYear = Math.max(...rows.map(r => +r.rok));
  const QORDER = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Národní řada — jedna hodnota dny_prumer_cr na (rok, kvartál).
  const natMap = new Map();   // "year-q" → days
  const regionQuarter = new Map(); // code → Map("year-q" → days)
  const regLatestSum = new Map();  // code → { sum, n }
  const distLatest = new Map();    // code → { sum, n, name, region }

  for (const r of rows) {
    const year = +r.rok;
    const q = r.kvartal;
    const key = `${year}|${q}`;
    natMap.set(key, +r.dny_prumer_cr);

    const rCode = r.kraj_kod;
    if (!regionQuarter.has(rCode)) regionQuarter.set(rCode, new Map());
    regionQuarter.get(rCode).set(key, +r.dny_prumer_kraj);

    if (year === latestYear) {
      if (!regLatestSum.has(rCode)) regLatestSum.set(rCode, { sum: 0, n: 0 });
      const rl = regLatestSum.get(rCode);
      rl.sum += +r.dny_prumer_kraj; rl.n++;

      const dCode = r.okres_kod;
      if (!distLatest.has(dCode)) {
        distLatest.set(dCode, { sum: 0, n: 0, name: r.okres_nazev, region: rCode });
      }
      const dl = distLatest.get(dCode);
      dl.sum += +r.dny_prumer_okres; dl.n++;
    }
  }

  const sortKey = (k) => {
    const [y, q] = k.split('|');
    return +y * 10 + QORDER.indexOf(q);
  };

  const national_quarterly = [...natMap.keys()]
    .sort((a, b) => sortKey(a) - sortKey(b))
    .map(k => {
      const [y, q] = k.split('|');
      return { year: +y, quarter: q, days: natMap.get(k) };
    });

  const by_region = {};
  for (const [code, qmap] of regionQuarter) {
    by_region[code] = [...qmap.keys()]
      .sort((a, b) => sortKey(a) - sortKey(b))
      .map(k => {
        const [y, q] = k.split('|');
        return { year: +y, quarter: q, days: qmap.get(k) };
      });
  }

  const regions_latest = [...regLatestSum.entries()]
    .filter(([code]) => REGION_NAMES[code])
    .map(([code, v]) => ({
      code, name: REGION_NAMES[code] || code, days: round(v.sum / v.n, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  const districts_latest = [...distLatest.entries()]
    .map(([code, v]) => ({
      code, name: v.name, region_code: v.region, days: round(v.sum / v.n, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  return { latest_year: latestYear, national_quarterly, by_region, regions_latest, districts_latest };
}

// ─────────────────────────────────────────────
// Hlavní běh
// ─────────────────────────────────────────────

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('Kolonoskopie — build datového souboru\n');

  // 1. Stáhnout vše do cache.
  const paths = {};
  for (const [key, ds] of Object.entries(DATASETS)) {
    paths[key] = await ensureCached(ds);
  }
  console.log('');

  // 2. Načíst malé CSV.
  const readCsv = (p) => parseCsv(fs.readFileSync(p, 'utf8'));

  // 3. PPS-02-01 — pokrytí (numerator = vyšetření, denominator = populace).
  console.log('  agreguji PPS-02-01 (pokrytí) …');
  const coverage = aggregateRowwise(readCsv(paths.coverage), {
    numField: 'pocet_vysetrenych',
    denField: 'populace',
    regionCodeField: 'kraj_nuts_kod',
    districtCodeField: 'okres_lau_kod',
    districtNameField: 'okres_nazev',
    project: (b) => ({
      examined: b.num,
      population: b.den,
      rate: b.den > 0 ? round((b.num / b.den) * 100, 1) : null,
    }),
  });

  // 4. PPS-02-02 — pozitivita (numerator = pozitivní, denominator = vyšetření).
  console.log('  agreguji PPS-02-02 (pozitivita) …');
  const positivity = aggregateRowwise(readCsv(paths.positivity), {
    numField: 'pocet_pozitivnich',
    denField: 'pocet_vysetrenych',
    regionCodeField: 'kraj_nuts_kod',
    districtCodeField: 'okres_lau_kod',
    districtNameField: 'okres_nazev',
    project: (b) => ({
      examined: b.den,
      positive: b.num,
      rate: b.den > 0 ? round((b.num / b.den) * 100, 2) : null,
    }),
  });

  // 5. PPS-02-03 — počet TOKS.
  console.log('  agreguji PPS-02-03 (počet TOKS) …');
  const fobt = aggregateRowwise(readCsv(paths.fobt), {
    numField: 'pocet_vysetreni',
    regionCodeField: 'kraj_nuts_kod',
    districtCodeField: 'okres_lau_kod',
    districtNameField: 'okres_nazev',
    project: (b) => ({ count: b.num }),
  });

  // 6. PPS-02-04 — počet kolonoskopií.
  console.log('  agreguji PPS-02-04 (počet kolonoskopií) …');
  const colonoscopy = aggregateRowwise(readCsv(paths.colonoscopy), {
    numField: 'pocet_vysetreni',
    regionCodeField: 'kraj_nuts_kod',
    districtCodeField: 'okres_lau_kod',
    districtNameField: 'okres_nazev',
    project: (b) => ({ count: b.num }),
  });

  // 7. PPS-02-05 — návaznost TOKS+ → kolonoskopie (stream).
  console.log('  agreguji PPS-02-05 (návazná kolonoskopie, stream) …');
  const followup = await aggregateFollowup(paths.followup);

  // 8. PPS-02-07 — čekací doba.
  console.log('  agreguji PPS-02-07 (čekací doba) …');
  const waiting = aggregateWaiting(readCsv(paths.waiting));

  // 9. Sestavit výstupní JSON.
  const allYears = new Set();
  for (const s of [coverage.national, fobt.national, colonoscopy.national,
                    positivity.national, followup.national]) {
    for (const row of s) allYears.add(row.year);
  }

  const output = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    source: {
      name: 'Národní program screeningu karcinomu tlustého střeva a konečníku',
      publisher: 'ÚZIS ČR · Ministerstvo zdravotnictví ČR',
      license: 'CC BY 4.0',
      authors: 'Hejcmanová K., Ambrožová M., Chloupková R., Ngo O., Májek O.',
      portal: PORTAL_URL,
      datasets: Object.values(DATASETS).map(ds => ({
        code: ds.code, name: ds.name, url: ds.url, page: ds.page, period: ds.period,
      })),
    },
    meta: {
      years: [...allYears].sort((a, b) => a - b),
      latest_year: coverage.latest_year,
      age_groups: AGE_ORDER,
      regions: Object.entries(REGION_NAMES).map(([code, name]) => ({ code, name })),
    },
    coverage,
    positivity,
    fobt,
    colonoscopy,
    followup,
    waiting,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const kb = Math.round(fs.statSync(OUT_PATH).size / 1024);
  console.log(`\nHotovo → ${path.relative(ROOT, OUT_PATH)} (${kb} kB)`);
  console.log(`Roky: ${output.meta.years[0]}–${output.meta.years.at(-1)} · poslední uzavřený: ${output.meta.latest_year}`);
}

main().catch(err => {
  console.error('\nChyba:', err.message);
  process.exitCode = 1;
});
