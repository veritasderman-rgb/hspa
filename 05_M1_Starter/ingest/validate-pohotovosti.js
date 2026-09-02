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

// Pohotovostní služby podle vyhlášky č. 380/2025 Sb. — jen u nich se posuzuje
// zákonné minimum a jen jich se týkají prahy pokrytí.
const CATEGORIES = ['lps_dospeli', 'lps_deti', 'zubni', 'lekarna'];
// Kurátorovaná vrstva: běžné nemocniční ambulance s ručně ověřenou provozní
// dobou. Ve výpisu jsou vedle pohotovostí, ale vyhláška se na ně nevztahuje.
const PLACE_CATEGORIES = [...CATEGORIES, 'ambulance_denni'];
const GEO_SOURCES = ['nrpzs', 'kraj', 'obec'];

/** Prahy „tohle už není hubený výsledek, ale rozbitý ingest“. */
const MIN_PLACES = 150;
const MIN_WITH_HOURS_RATIO = 0.8;
const MIN_EXACT_GEO_RATIO = 0.8;
const MIN_REGIONS = 14;
const MIN_OBCE = 5000;

const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Telefon: mezinárodní tvar, nebo krátké tísňové / evropské harmonizované
// číslo (155, 112, 116 123) — ta se nikdy nepíší s předvolbou.
const PHONE_RE = /^(\+\d{9,15}|1\d{2}|116\d{3})$/;
/** Druhy tlačítek v rozcestníku; renderer jiný druh tiše nevykreslí. */
const ACTION_KINDS = ['tel', 'find', 'href', 'anchor', 'poradna'];
const FIND_CATEGORIES = [...PLACE_CATEGORIES, 'akutni'];

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
  const pohotovosti = places.filter(p => p.category !== 'ambulance_denni');
  if (pohotovosti.length < MIN_PLACES) {
    fail(`jen ${pohotovosti.length} pohotovostí (minimum ${MIN_PLACES}) — ingest nejspíš spadl na změněné šabloně zdroje`);
  }

  const seenIds = new Set();
  let withHours = 0;
  let exactGeo = 0;
  let counted = 0;

  for (const p of places) {
    const where = `pohotovost ${p.id ?? '(bez id)'}`;

    for (const field of ['id', 'name', 'category', 'kraj_code']) {
      if (!p[field]) fail(`${where}: chybí povinné pole ${field}`);
    }
    if (seenIds.has(p.id)) fail(`${where}: duplicitní id`);
    seenIds.add(p.id);

    if (p.category && !PLACE_CATEGORIES.includes(p.category)) {
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
    if (p.phone && !/^\+\d{9,15}$/.test(p.phone)) {
      fail(`${where}: telefon „${p.phone}“ není v mezinárodním tvaru`);
    }
    if (p.web && !/^https?:\/\//.test(p.web)) {
      fail(`${where}: web „${p.web}“ nemá schéma http(s)`);
    }

    checkHours(p.hours, where);
    // Prahy pokrytí se počítají jen z pohotovostí. Devět ručně ověřených
    // ambulancí by je jinak zředilo a poměr by přestal měřit to, kvůli čemu
    // vznikl — jestli se ingest VZP nerozpadl.
    if (p.category !== 'ambulance_denni') {
      counted += 1;
      if (p.hours) withHours += 1;
      if (p.geo_source && p.geo_source !== 'obec') exactGeo += 1;
    }

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

  if (counted) {
    const hoursRatio = withHours / counted;
    if (hoursRatio < MIN_WITH_HOURS_RATIO) {
      fail(`ordinační dobu má jen ${Math.round(hoursRatio * 100)} % míst (minimum ${MIN_WITH_HOURS_RATIO * 100} %)`);
    }
    const geoRatio = exactGeo / counted;
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

  // Neakutní poradní linky záchranných služeb. Telefonní číslo, na které
  // stránka posílá lidi „když nevíte, jestli s tím někam jít“, je tvrzení
  // o cizí službě — bez zdroje, data ověření a provozní doby by nešlo
  // poznat, že linka mezitím zanikla nebo změnila číslo.
  const seenKraj = new Set();
  for (const line of online.advice_lines ?? []) {
    const where = `poradní linka ${line.id ?? line.kraj_code ?? '?'}`;
    for (const field of ['id', 'kraj_code', 'kraj', 'name', 'phone']) {
      if (!line[field]) fail(`${where}: chybí povinné pole ${field}`);
    }
    // Provozní dobu buď zdroj uvádí, nebo se poctivě přizná, že ji neuvádí —
    // třetí možnost („nějaká bude“) stránka nesmí tvrdit.
    if (!line.hours && line.hours_unknown !== true) fail(`${where}: chybí hours (nebo hours_unknown: true, když ji web ZZS neuvádí)`);
    if (line.hours && line.hours_unknown) fail(`${where}: hours a hours_unknown si odporují`);
    // Zveřejněná doba musí být i strojově čitelná — jinak by stránka linku
    // nabízela i v noci, kdy ji nikdo nezvedne.
    if (line.hours && !line.hours_spec) fail(`${where}: hours bez hours_spec (strojový rozvrh pro „otevřeno teď“)`);
    if (line.hours_spec) checkHours(line.hours_spec, `${where}.hours_spec`);
    if (!/^\+\d{9,15}$/.test(String(line.phone ?? ''))) fail(`${where}: telefon není v mezinárodním tvaru`);
    if (line.phone_alt != null && !/^\+\d{9,15}$/.test(String(line.phone_alt))) fail(`${where}: phone_alt není v mezinárodním tvaru`);
    if (!line.quote) fail(`${where}: chybí doslovný citát ze zdroje (drift-check)`);
    // 155 a 112 jsou tísňové linky — poradní linka je z definice jiné číslo.
    if (/^\+420(155|112)$/.test(String(line.phone ?? ''))) fail(`${where}: tísňové číslo není poradní linka`);
    if (!line.source?.url) fail(`${where}: chybí odkaz na zdroj`);
    if (!ISO_DATE_RE.test(String(line.verified_at ?? ''))) fail(`${where}: verified_at není YYYY-MM-DD`);
    if (line.kraj_code && !known.has(line.kraj_code)) fail(`${where}: kraj ${line.kraj_code} není v registru krajů`);
    if (seenKraj.has(line.kraj_code)) fail(`${where}: kraj ${line.kraj_code} má víc poradních linek — stránka nabízí jednu`);
    seenKraj.add(line.kraj_code);
  }
  if (online.advice_lines_note && !online.advice_lines_note.source?.url) {
    fail('online.advice_lines_note: poznámka o krajích bez linky potřebuje zdroj');
  }
}

/** Blok s tvrzením o cizí službě musí mít zdroj a datum ověření. */
function checkSourced(obj, where) {
  if (!obj?.source?.url) fail(`${where}: chybí odkaz na zdroj`);
  if (!ISO_DATE_RE.test(String(obj?.verified_at ?? ''))) fail(`${where}: verified_at není YYYY-MM-DD`);
}

function checkAction(a, where) {
  if (!a || !ACTION_KINDS.includes(a.kind)) { fail(`${where}: action.kind musí být ${ACTION_KINDS.join('/')}`); return; }
  if (!a.label) fail(`${where}: tlačítko bez popisku`);
  if (a.kind === 'tel' && !PHONE_RE.test(String(a.phone ?? ''))) fail(`${where}: tel bez platného čísla`);
  if (a.kind === 'href' && !/^https?:\/\//.test(String(a.url ?? ''))) fail(`${where}: href bez URL se schématem`);
  if (a.kind === 'anchor' && !/^#\w/.test(String(a.href ?? ''))) fail(`${where}: anchor musí mířit na kotvu (#id)`);
  if (a.kind === 'find') {
    const cats = a.categories ?? [];
    if (!cats.length || cats.some(c => !FIND_CATEGORIES.includes(c))) fail(`${where}: find s neznámou kategorií (${cats.join(',') || 'žádná'})`);
  }
}

function validatePractical(data) {
  const pr = data.practical;
  if (!pr) { fail('chybí sekce `practical` (poplatek a co si vzít s sebou)'); return; }

  const fee = pr.fee;
  if (!fee) {
    fail('practical: chybí blok `fee` (regulační poplatek)');
  } else {
    // Výše poplatku je právní fakt, který se mění novelou — bez zdroje
    // a data ověření by na stránce tiše zastaral a lidé by podle něj
    // počítali s jinou částkou, než jakou u přepážky zaplatí.
    if (!(fee.amount_czk > 0 && fee.amount_czk < 10_000)) fail('practical.fee: amount_czk je mimo rozumný rozsah');
    if (!fee.text) fail('practical.fee: chybí text');
    if (!fee.source?.url) fail('practical.fee: chybí odkaz na zdroj výše poplatku');
    if (!ISO_DATE_RE.test(String(fee.verified_at ?? ''))) fail('practical.fee: verified_at není YYYY-MM-DD');
    if (!Array.isArray(fee.exemptions) || !fee.exemptions.length) fail('practical.fee: chybí výjimky z poplatku');
  }

  const steps = pr.before_you_go ?? [];
  if (steps.length < 4) fail(`practical.before_you_go: jen ${steps.length} položek (čekány aspoň 4)`);
  const ids = new Set();
  for (const s of steps) {
    const where = `practical.before_you_go/${s.id ?? '(bez id)'}`;
    if (!s.id) fail(`${where}: chybí id`);
    if (ids.has(s.id)) fail(`${where}: duplicitní id`);
    ids.add(s.id);
    if (!s.title) fail(`${where}: chybí title`);
    if (!s.text) fail(`${where}: chybí text`);
  }
  // „Zavolejte předem“ je pointa celé sekce — kdyby vypadla, zbyde
  // z rady checklist na doklady.
  if (!ids.has('zavolejte')) fail('practical.before_you_go: chybí krok `zavolejte` (zavolat předem)');

  // ── Rozcestník „Kam s tím?“ ──
  // Stránka na „kam patřím“ nesmí odpovídat vlastním úsudkem. Každý řádek
  // je proto přepis oficiálního zdroje se zdrojem a datem ověření; otázka
  // a odpověď pro FAQPage JSON-LD jsou součástí řádku, aby statická
  // hlavička a živá sekce nemohly říkat každá něco jiného.
  const triage = pr.triage ?? [];
  if (triage.length < 6) fail(`practical.triage: jen ${triage.length} řádků (čekáno aspoň 6)`);
  const tids = new Set();
  let hasLife = false;
  for (const r of triage) {
    const where = `practical.triage/${r.id ?? '(bez id)'}`;
    if (!r.id) fail(`${where}: chybí id`);
    if (tids.has(r.id)) fail(`${where}: duplicitní id`);
    tids.add(r.id);
    if (!r.situation) fail(`${where}: chybí situation`);
    if (!r.text) fail(`${where}: chybí text`);
    checkAction(r.action, where);
    if (r.secondary) checkAction(r.secondary, `${where}/secondary`);
    if (!r.faq?.q || !r.faq?.a) fail(`${where}: chybí faq.q / faq.a (FAQPage JSON-LD)`);
    if (!String(r.faq?.q ?? '').endsWith('?')) fail(`${where}: faq.q má být otázka (končí otazníkem)`);
    checkSourced(r, where);
    for (const sr of r.sources ?? []) if (!sr?.url) fail(`${where}: položka v sources bez url`);
    if (r.action?.kind === 'tel' && r.action.phone === '155') hasLife = true;
  }
  if (!hasLife) fail('practical.triage: chybí řádek s voláním 155 (ohrožení života)');

  // ── Co vás na pohotovosti čeká ──
  const expectations = pr.expectations ?? [];
  if (expectations.length < 2) fail(`practical.expectations: jen ${expectations.length} položek (čekány aspoň 2)`);
  const eids = new Set();
  for (const e of expectations) {
    const where = `practical.expectations/${e.id ?? '(bez id)'}`;
    if (!e.id || !e.title || !e.text) fail(`${where}: chybí id/title/text`);
    if (eids.has(e.id)) fail(`${where}: duplicitní id`);
    eids.add(e.id);
    checkSourced(e, where);
  }

  // ── Bez praktika ──
  if (!pr.no_gp) {
    fail('practical: chybí blok `no_gp` (co dělat bez praktického lékaře)');
  } else {
    if (!pr.no_gp.title || !pr.no_gp.short || !pr.no_gp.text) fail('practical.no_gp: chybí title/short/text');
    const links = pr.no_gp.links ?? [];
    if (!links.length) fail('practical.no_gp: chybí odkaz, kam jít');
    for (const l of links) if (!l.label || !/^https?:\/\//.test(String(l.url ?? ''))) fail('practical.no_gp: odkaz bez popisku nebo URL');
    checkSourced(pr.no_gp, 'practical.no_gp');
  }

  // ── English · Українська ──
  // Přeložený je text; fakta (čísla, poplatek, pojištění) nesou tytéž
  // zdroje jako česká verze. Tísňové číslo v každé jazykové verzi je
  // minimum, bez kterého blok nemá smysl.
  const intl = pr.intl ?? {};
  for (const lang of ['en', 'uk']) {
    const b = intl[lang];
    const where = `practical.intl.${lang}`;
    if (!b) { fail(`${where}: chybí`); continue; }
    if (!b.title) fail(`${where}: chybí title`);
    const items = b.items ?? [];
    if (items.length < 5) fail(`${where}: jen ${items.length} položek (čekáno aspoň 5)`);
    for (const it of items) {
      if (!it.q || !it.a) fail(`${where}: položka bez q/a`);
      if (it.tel && !PHONE_RE.test(String(it.tel))) fail(`${where}: tel „${it.tel}“ není platné číslo`);
      if (it.url && !/^https?:\/\//.test(String(it.url))) fail(`${where}: url bez schématu`);
    }
    if (!items.some(it => it.tel === '155' || it.tel === '112')) fail(`${where}: chybí položka s tísňovým číslem`);
    if (!(b.sources ?? []).some(sr => sr.url)) fail(`${where}: chybí zdroje`);
    if (!ISO_DATE_RE.test(String(b.verified_at ?? ''))) fail(`${where}: verified_at není YYYY-MM-DD`);
  }

  // ── Zpětná vazba ──
  if (pr.feedback && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/new$/.test(String(pr.feedback.issues_new_url ?? ''))) {
    fail('practical.feedback.issues_new_url musí být GitHub „…/issues/new“');
  }

  // ── Aplikace (Záchranka) — nepovinné, ale když jsou, se zdrojem ──
  for (const a of pr.apps ?? []) {
    const where = `practical.apps/${a.id ?? '(bez id)'}`;
    if (!a.id || !a.name || !/^https?:\/\//.test(String(a.url ?? '')) || !a.text) fail(`${where}: chybí id/name/url/text`);
    checkSourced(a, where);
  }
}

function validateAmbulance(data) {
  const rows = (data.places ?? []).filter(p => p.category === 'ambulance_denni');
  if (!rows.length) { warn('žádná denní nemocniční ambulance — v ordinační době nemá stránka co nabídnout'); return; }

  for (const p of rows) {
    const where = `denní ambulance ${p.id}`;
    // Publikovaná provozní doba nemocniční ambulance nevzniká ze strojového
    // čtení, ale z toho, že ji člověk přepsal ze stránky nemocnice. Bez
    // citátu, odkazu a data ověření by při revizi nešlo poznat, jestli se
    // zdroj mezitím změnil — a číslo by tiše zastaralo.
    if (!p.quote) fail(`${where}: chybí doslovný citát ze zdroje`);
    if (!p.detail_url) fail(`${where}: chybí odkaz na zdrojovou stránku`);
    if (!ISO_DATE_RE.test(String(p.verified_at ?? ''))) fail(`${where}: verified_at není YYYY-MM-DD`);
    if (!p.hours) fail(`${where}: chybí provozní doba — bez ní je záznam k ničemu`);
    if (!['ano', 'neuvedeno'].includes(String(p.walk_in))) fail(`${where}: walk_in musí být „ano“ nebo „neuvedeno“`);
    if (p.lat == null || p.lon == null) fail(`${where}: chybí souřadnice (join na registr selhal?)`);
    if (p.geo_source !== 'nrpzs') fail(`${where}: poloha není z registru (${p.geo_source})`);
    // Běžná ambulance nespadá pod vyhlášku o pohotovostních službách —
    // „nesplňuje minimum“ by u ní bylo obvinění z něčeho, co po ní nikdo nechce.
    if (p.meets_minimum !== null) fail(`${where}: meets_minimum musí být null (vyhláška se na běžnou ambulanci nevztahuje)`);
    // Drift-check: strojově víme jen, ŽE se zdroj změnil — proto warning,
    // ne fail. Údaj zůstává na stránce s viditelným varováním, dokud ho
    // člověk nepřeověří (a nezvedne verified_at).
    if (p.hours_check) {
      if (!['ok', 'drift', 'nedostupne'].includes(p.hours_check.status)) {
        fail(`${where}: neznámý stav drift-checku „${p.hours_check.status}“`);
      }
      if (p.hours_check.status === 'drift') {
        warn(`${where}: zdrojová stránka se od ověření (${p.verified_at}) změnila — hodiny přeověřit`);
      }
    }
  }

  if (data.coverage?.pohotovosti_total == null) {
    fail('coverage: chybí pohotovosti_total — hero by tvrdilo, že denní ambulance jsou pohotovosti');
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
    validatePractical(data);
    validateAmbulance(data);
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
  const all = data?.places ?? [];
  const amb = all.filter(p => p.category === 'ambulance_denni').length;
  console.log(`[validate-pohotovosti] OK — ${all.length - amb} pohotovostí + ${amb} denních ambulancí, ${warnings.length} varování`);
}

main();
