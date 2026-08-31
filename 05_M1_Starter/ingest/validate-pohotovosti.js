#!/usr/bin/env node
// Validátor datového kontraktu pohotovostí (data/pohotovosti.json).
//
// Co hlídá a proč zrovna tohle:
//
//   • Stránku otevírá člověk v nouzi. Chybějící souřadnice, rozbitá ordinační
//     doba nebo pohotovost bez telefonu nejsou kosmetika — je to rozdíl mezi
//     „vím kam jet“ a „hledám dál“.
//   • Zdroje jsou scrapované HTML a otevřená data cizích úřadů. Když se
//     šablona změní, transform doběhne bez chyby a tiše vyrobí prázdno.
//     Prahové kontroly (MIN_*) proto musí spadnout nahlas.
//   • Časy musí být strojově porovnatelné, jinak výpočet „otevřeno teď“ mlčky
//     řekne „zavřeno“ u místa, které má otevřeno.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_KEYS } from './lib/pohotovosti-hours.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CATEGORIES = ['lps_dospeli', 'lps_deti', 'zubni', 'lekarna'];
const GEO_SOURCES = ['nrpzs', 'kraj', 'obec'];

/** Prahy „tohle už není hubený výsledek, ale rozbitý ingest“. */
const MIN_PLACES = 150;
const MIN_WITH_HOURS_RATIO = 0.8;
const MIN_EXACT_GEO_RATIO = 0.8;
const MIN_REGIONS = 14;
const MIN_OBCE = 5000;

const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function readJson(rel) {
  const file = path.resolve(ROOT, rel);
  if (!fs.existsSync(file)) {
    fail(`chybí ${rel} — spusť \`npm run data:pohotovosti\``);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`${rel} není platný JSON: ${err.message}`);
    return null;
  }
}

/** Ověří jeden interval [od, do]. */
function checkRange(range, where) {
  if (!Array.isArray(range) || range.length !== 2) {
    fail(`${where}: interval musí být dvojice [od, do], je ${JSON.stringify(range)}`);
    return;
  }
  for (const t of range) {
    if (!TIME_RE.test(String(t))) fail(`${where}: čas „${t}“ není ve tvaru HH:MM`);
  }
}

function checkHours(hours, where) {
  if (hours == null) return;
  if (hours.kind === 'weekly') {
    if (!hours.week || typeof hours.week !== 'object') {
      fail(`${where}: weekly rozvrh bez pole week`);
      return;
    }
    for (const day of DAY_KEYS) {
      const ranges = hours.week[day];
      if (!Array.isArray(ranges)) {
        fail(`${where}: den „${day}“ musí být pole (je ${typeof ranges})`);
        continue;
      }
      ranges.forEach((r, i) => checkRange(r, `${where} → ${day}[${i}]`));
    }
    return;
  }
  if (hours.kind === 'rotation') {
    if (!Array.isArray(hours.shifts)) {
      fail(`${where}: rotation bez pole shifts`);
      return;
    }
    hours.shifts.forEach((s, i) => {
      if (!ISO_DATE_RE.test(String(s.from))) fail(`${where} → shift[${i}]: from „${s.from}“ není YYYY-MM-DD`);
      if (!ISO_DATE_RE.test(String(s.to))) fail(`${where} → shift[${i}]: to „${s.to}“ není YYYY-MM-DD`);
      if (String(s.to) < String(s.from)) fail(`${where} → shift[${i}]: to je dřív než from`);
      (s.ranges ?? []).forEach((r, j) => checkRange(r, `${where} → shift[${i}].ranges[${j}]`));
    });
    return;
  }
  fail(`${where}: neznámý typ provozní doby „${hours.kind}“`);
}

function validatePlaces(data) {
  const places = data.places ?? [];
  if (places.length < MIN_PLACES) {
    fail(`jen ${places.length} pohotovostí (minimum ${MIN_PLACES}) — ingest nejspíš spadl na změněné šabloně zdroje`);
  }

  const seenIds = new Set();
  let withHours = 0;
  let exactGeo = 0;

  for (const p of places) {
    const where = `pohotovost ${p.id ?? '(bez id)'}`;

    for (const field of ['id', 'name', 'category', 'kraj_code']) {
      if (!p[field]) fail(`${where}: chybí povinné pole ${field}`);
    }
    if (seenIds.has(p.id)) fail(`${where}: duplicitní id`);
    seenIds.add(p.id);

    if (p.category && !CATEGORIES.includes(p.category)) {
      fail(`${where}: neznámá kategorie „${p.category}“`);
    }
    if (p.kraj_code && !/^CZ0\d{2}$/.test(p.kraj_code)) {
      fail(`${where}: kraj_code „${p.kraj_code}“ není NUTS-3 kód`);
    }

    // Souřadnice: bez nich místo z výpisu podle vzdálenosti vypadne úplně.
    if (p.lat == null || p.lon == null) {
      fail(`${where}: chybí souřadnice — nedá se seřadit podle vzdálenosti`);
    } else {
      if (!(p.lat >= 48.4 && p.lat <= 51.2)) fail(`${where}: zeměpisná šířka ${p.lat} je mimo ČR`);
      if (!(p.lon >= 12.0 && p.lon <= 18.9)) fail(`${where}: zeměpisná délka ${p.lon} je mimo ČR`);
    }
    if (p.geo_source && !GEO_SOURCES.includes(p.geo_source)) {
      fail(`${where}: neznámý geo_source „${p.geo_source}“`);
    }
    if (p.geo_source && p.geo_source !== 'obec') exactGeo += 1;

    if (p.phone && !/^\+\d{9,15}$/.test(p.phone)) {
      fail(`${where}: telefon „${p.phone}“ není v mezinárodním tvaru`);
    }
    if (p.web && !/^https?:\/\//.test(p.web)) {
      fail(`${where}: web „${p.web}“ nemá schéma http(s)`);
    }

    checkHours(p.hours, where);
    if (p.hours) withHours += 1;

    if (p.meets_minimum != null && typeof p.meets_minimum !== 'boolean') {
      fail(`${where}: meets_minimum musí být boolean nebo null`);
    }
    // Vyhodnocení „nesplňuje minimum“ je tvrzení o konkrétním poskytovateli —
    // bez rozpisu kontrol není doložené a nesmí se zobrazit.
    if (p.meets_minimum === false && !(Array.isArray(p.minimum_checks) && p.minimum_checks.length)) {
      fail(`${where}: meets_minimum=false bez rozpisu minimum_checks`);
    }
    if (!p.phone && !p.web && !p.detail_url) {
      warn(`${where}: žádný kontakt (telefon, web ani odkaz na zdroj)`);
    }
  }

  if (places.length) {
    const hoursRatio = withHours / places.length;
    if (hoursRatio < MIN_WITH_HOURS_RATIO) {
      fail(`ordinační dobu má jen ${Math.round(hoursRatio * 100)} % míst (minimum ${MIN_WITH_HOURS_RATIO * 100} %)`);
    }
    const geoRatio = exactGeo / places.length;
    if (geoRatio < MIN_EXACT_GEO_RATIO) {
      fail(`přesnou polohu má jen ${Math.round(geoRatio * 100)} % míst (minimum ${MIN_EXACT_GEO_RATIO * 100} %) — adresní join na registr se rozpadl`);
    }
  }
}

function validateRegions(data) {
  const regions = data.regions ?? [];
  if (regions.length < MIN_REGIONS) {
    fail(`registr krajů má ${regions.length} položek, čekáno ${MIN_REGIONS}`);
  }
  for (const r of regions) {
    if (!/^CZ0\d{2}$/.test(r.kraj_code ?? '')) fail(`kraj ${r.kraj ?? '?'}: chybný kraj_code`);
    if (!r.web || !/^https?:\/\//.test(r.web)) fail(`kraj ${r.kraj ?? r.kraj_code}: chybí nebo je chybný odkaz na stránku kraje`);
    if (r.has_open_data && !r.open_data_url) fail(`kraj ${r.kraj}: má otevřená data, ale chybí odkaz na datovou sadu`);
  }

  // Každý kraj musí mít aspoň jednu pohotovost. Kdyby ne, buď se rozsypal
  // join na kraj, nebo je to zpráva, kterou musí vidět člověk.
  const byKraj = data.coverage?.by_kraj ?? {};
  for (const r of regions) {
    if (!byKraj[r.kraj_code]?.total) warn(`kraj ${r.kraj}: v datech není ani jedna pohotovost`);
  }
}

function validateRotations(data) {
  for (const rot of data.rotations ?? []) {
    const where = `rotace ${rot.id ?? '?'}`;
    if (!rot.kraj_code || !/^CZ0\d{2}$/.test(rot.kraj_code)) fail(`${where}: chybný kraj_code`);
    if (rot.category && !CATEGORIES.includes(rot.category)) fail(`${where}: neznámá kategorie „${rot.category}“`);
    if (!rot.index_url) fail(`${where}: chybí odkaz na rozpis u zdroje`);
    for (const d of rot.dates ?? []) {
      if (!ISO_DATE_RE.test(d)) fail(`${where}: termín „${d}“ není YYYY-MM-DD`);
    }
    for (const p of rot.practices ?? []) {
      checkHours(p.hours, `${where} → ${p.name ?? '?'}`);
    }
  }
}

function validateOnline(data) {
  const online = data.online;
  if (!online) { fail('chybí sekce `online` (krajské online pohotovosti)'); return; }

  for (const sv of online.services ?? []) {
    const where = `online služba ${sv.id ?? '(bez id)'}`;
    for (const field of ['id', 'kraj_code', 'name', 'url', 'free_for', 'good_for']) {
      if (!sv[field]) fail(`${where}: chybí povinné pole ${field}`);
    }
    if (sv.kraj_code && !/^CZ0\d{2}$/.test(sv.kraj_code)) fail(`${where}: kraj_code není NUTS-3`);
    if (sv.url && !/^https?:\/\//.test(sv.url)) fail(`${where}: url nemá schéma http(s)`);
    // Podmínky služby jsou tvrzení o cizí službě — bez zdroje a data ověření
    // je stránka nemá kde obhájit a zastarají tiše.
    if (!sv.source?.url) fail(`${where}: chybí odkaz na zdroj podmínek`);
    if (!ISO_DATE_RE.test(String(sv.verified_at ?? ''))) fail(`${where}: verified_at není YYYY-MM-DD`);
    if (sv.response_minutes != null && !(sv.response_minutes > 0 && sv.response_minutes <= 240)) {
      fail(`${where}: response_minutes ${sv.response_minutes} je mimo rozumný rozsah`);
    }
    if (!Array.isArray(sv.channels) || !sv.channels.length) fail(`${where}: chybí způsob spojení (channels)`);
  }

  for (const line of online.infolines ?? []) {
    const where = `infolinka ${line.kraj_code ?? '?'}`;
    if (!/^\+\d{9,15}$/.test(String(line.phone ?? ''))) fail(`${where}: telefon není v mezinárodním tvaru`);
    if (!line.source?.url) fail(`${where}: chybí odkaz na zdroj`);
    if (!ISO_DATE_RE.test(String(line.verified_at ?? ''))) fail(`${where}: verified_at není YYYY-MM-DD`);
  }

  // Služba musí patřit kraji, který v registru zdrojů existuje — jinak by ji
  // stránka nikomu nenabídla a nikdo by si toho nevšiml.
  const known = new Set((data.regions ?? []).map(r => r.kraj_code));
  for (const sv of online.services ?? []) {
    if (sv.kraj_code && !known.has(sv.kraj_code)) fail(`online služba ${sv.id}: kraj ${sv.kraj_code} není v registru krajů`);
  }
}

function validateLegal(data) {
  const decree = data.legal?.decree;
  if (!decree?.url || !decree?.title) {
    fail('chybí odkaz na vyhlášku, podle které se posuzuje zákonné minimum');
  }
  for (const cat of CATEGORIES) {
    if (!decree?.minimum_scope?.[cat]) fail(`chybí popis zákonného minima pro kategorii ${cat}`);
  }
  if (!data.legal?.law?.title) fail('chybí odkaz na zákon, kterým odpovědnost přešla na pojišťovny');
}

function validateObce() {
  const obce = readJson('data/obce-gps.json');
  if (!obce) return;
  if ((obce.count ?? 0) < MIN_OBCE) {
    fail(`gazetteer má ${obce.count} obcí (minimum ${MIN_OBCE}) — vyhledávání podle města by nefungovalo`);
  }
  const bad = (obce.obce ?? []).filter(([, lat, lon]) => !(lat >= 48.4 && lat <= 51.2 && lon >= 12.0 && lon <= 18.9));
  if (bad.length) fail(`gazetteer má ${bad.length} obcí se souřadnicemi mimo ČR (např. ${bad[0][0]})`);
}

function validateAcute() {
  const acute = readJson('data/pohotovosti-akutni.json');
  if (!acute) return;
  const ACUTE_CATEGORIES = ['urgentni_prijem', 'chirurgicka', 'zzs'];
  for (const p of acute.places ?? []) {
    if (!p.id || !p.name) fail(`akutní pracoviště bez id nebo názvu: ${JSON.stringify(p).slice(0, 80)}`);
    if (p.lat != null && !(p.lat >= 48.4 && p.lat <= 51.2)) fail(`akutní pracoviště ${p.id}: šířka mimo ČR`);
    for (const c of p.categories ?? []) {
      if (!ACUTE_CATEGORIES.includes(c)) fail(`akutní pracoviště ${p.id}: neznámá kategorie „${c}“`);
    }
  }
  // Urgentní příjem je jediné pracoviště, u kterého registr přímo dokládá
  // neobjednanou akutní péči — stránka na něj v ordinační době odkazuje.
  const urgent = (acute.places ?? []).filter(p => (p.categories ?? []).includes('urgentni_prijem')).length;
  if (urgent < 20) fail(`jen ${urgent} urgentních příjmů (čekáno přes 20) — klasifikátor se rozpadl`);
}

function main() {
  const data = readJson('data/pohotovosti.json');
  if (data) {
    validatePlaces(data);
    validateRegions(data);
    validateRotations(data);
    validateOnline(data);
    validateLegal(data);
  }
  validateObce();
  validateAcute();

  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  if (errors.length) {
    console.error(`\n[validate-pohotovosti] ${errors.length} chyb:`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  const n = data?.places?.length ?? 0;
  console.log(`[validate-pohotovosti] OK — ${n} pohotovostí, ${warnings.length} varování`);
}

main();
