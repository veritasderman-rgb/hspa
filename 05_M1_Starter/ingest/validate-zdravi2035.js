// Validátor mapování Zdraví 2035 → indikátory kontraktu
// (data/zdravi2035-plneni.json).
//
// Dataset je ručně kurátorovaný přepis strategického dokumentu a redakční
// mapování na data/indicators.json. Dvě rodiny chyb, které tu umí vzniknout:
//  1) odkaz na indikátor, který v kontraktu není (překlep, přejmenování) —
//     stránka by pak tiše ukázala díru místo hodnoty;
//  2) nepoctivé mapování — `match: primo` bez indikátoru, proxy bez vysvětlení,
//     dílčí cíl s indikátory označený jako procesní a podobné vnitřní spory.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const plneni = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'zdravi2035-plneni.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'indicators.json'), 'utf8'));
const known = new Set(indicators.indicators.map(i => i.id));

const MATCHES = ['primo', 'proxy', 'chybi'];
const MERENI = ['primo', 'proxy', 'proces'];
const LEVELS = ['dopad', 'vystup'];

function checkMapping(m, where) {
  if (!m || !MATCHES.includes(m.match)) {
    fail(`${where}: mapping.match musí být jedno z ${MATCHES.join('/')}`);
    return;
  }
  if (m.match !== 'chybi') {
    if (!m.indicator_id) fail(`${where}: match=${m.match} bez indicator_id`);
    else if (!known.has(m.indicator_id)) fail(`${where}: indikátor „${m.indicator_id}“ v kontraktu není`);
    // Proxy bez vysvětlení je nepoctivé — čtenář musí vědět, v čem se
    // metodiky liší, jinak bude srovnávat hodnoty, které srovnat nejdou.
    if (m.match === 'proxy' && !m.note) warn(`${where}: proxy mapování bez vysvětlující poznámky`);
  } else if (m.indicator_id) {
    fail(`${where}: match=chybi nemá nést indicator_id`);
  }
}

// ── strategické cíle a SC ────────────────────────────────────────────────
const goals = new Set((plneni.strategic_goals ?? []).map(g => g.id));
if (goals.size !== 3) fail(`čekány 3 strategické cíle, je ${goals.size}`);

const cile = plneni.cile ?? [];
if (cile.length !== 12) fail(`čekáno 12 specifických cílů, je ${cile.length}`);
const seenSc = new Set();

for (const sc of cile) {
  const where = `SC ${sc.sc}`;
  if (seenSc.has(sc.sc)) fail(`${where}: duplicitní číslo cíle`);
  seenSc.add(sc.sc);
  if (!goals.has(sc.goal)) fail(`${where}: neznámý strategický cíl „${sc.goal}“`);
  if (!sc.title) fail(`${where}: chybí název`);

  const dcs = sc.dilci_cile ?? [];
  // SC bez dílčích cílů musí říct proč — jinak to vypadá jako nedopsaný záznam.
  if (!dcs.length && !sc.dilci_cile_note) fail(`${where}: žádné dílčí cíle a žádné vysvětlení`);

  const nums = new Set();
  for (const d of dcs) {
    const dw = `${where} / dílčí cíl ${d.num}`;
    if (!d.num || !d.text) fail(`${dw}: chybí číslo nebo text`);
    if (nums.has(d.num)) fail(`${dw}: duplicitní číslo`);
    nums.add(d.num);
    if (!String(d.num).startsWith(sc.sc)) fail(`${dw}: číslo nepatří pod SC ${sc.sc}`);
    if (!MERENI.includes(d.mereni)) fail(`${dw}: mereni musí být ${MERENI.join('/')}`);
    const ids = d.indikatory ?? [];
    if (d.mereni === 'proces') {
      if (ids.length) fail(`${dw}: procesní úkol nemá nést indikátory (má ${ids.length})`);
    } else if (!ids.length && !d.note) {
      fail(`${dw}: mereni=${d.mereni} bez indikátorů i bez poznámky, kde se měří`);
    }
    for (const id of ids) {
      if (!known.has(id)) fail(`${dw}: indikátor „${id}“ v kontraktu není`);
    }
  }

  for (const di of sc.doc_indicators ?? []) {
    const dw = `${where} / indikátor dokumentu „${(di.name ?? '?').slice(0, 40)}…“`;
    if (!di.name) fail(`${dw}: chybí název`);
    if (!LEVELS.includes(di.level)) fail(`${dw}: level musí být ${LEVELS.join('/')}`);
    checkMapping(di.mapping, dw);
    // Hodnota bez roku by vypadala jako aktuální — dokument měří k 31.12.2023.
    if (di.baseline && di.baseline.value != null && !di.baseline.year) {
      fail(`${dw}: baseline bez roku`);
    }
  }

  for (const id of sc.kontext_indikatory ?? []) {
    if (!known.has(id)) fail(`${where}: kontextový indikátor „${id}“ v kontraktu není`);
  }
}

for (const r of plneni.ramcove_indikatory ?? []) {
  checkMapping(r.mapping, `rámcový indikátor „${(r.name ?? '?').slice(0, 40)}…“`);
}

// ── zdroj musí být dohledatelný ──────────────────────────────────────────
if (!plneni.document?.url || !plneni.document?.approved) {
  fail('chybí odkaz na dokument nebo datum schválení — mapování by nešlo ověřit');
}
if (!plneni.extracted_at) fail('chybí extracted_at (kdy byl dokument přepsán)');

// ── vazba na registr strategií ───────────────────────────────────────────
const strategies = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'strategies.json'), 'utf8'));
if (!(strategies.strategies ?? []).some(s => s.id === plneni.strategy_id)) {
  fail(`strategy_id „${plneni.strategy_id}“ není v data/strategies.json`);
}

for (const w of warnings) console.warn(`  ⚠ ${w}`);
if (errors.length) {
  console.error(`[validate-zdravi2035] ${errors.length} chyb:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const dcTotal = cile.reduce((n, s) => n + (s.dilci_cile?.length ?? 0), 0);
const diTotal = cile.reduce((n, s) => n + (s.doc_indicators?.length ?? 0), 0);
console.log(`[validate-zdravi2035] OK — 12 SC, ${dcTotal} dílčích cílů, ${diTotal} indikátorů dokumentu, ${warnings.length} varování`);
