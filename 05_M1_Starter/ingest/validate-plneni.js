// Validátor datasetů „Plní se …?" — mapování strategií na indikátory
// kontraktu (data/zdravi2035-plneni.json + data/plneni-*.json).
//
// Datasety jsou ručně kurátorované přepisy strategických dokumentů
// a redakční mapování na data/indicators.json. Dvě rodiny chyb, které tu
// umí vzniknout:
//  1) odkaz na indikátor, který v kontraktu není (překlep, přejmenování) —
//     stránka by pak tiše ukázala díru místo hodnoty;
//  2) nepoctivé mapování — `match: primo` bez indikátoru, proxy bez
//     vysvětlení, dílčí cíl s indikátory označený jako procesní a podobné
//     vnitřní spory.
//
// Nahrazuje původní validate-zdravi2035.js (jeden dataset) — pravidla pro
// Zdraví 2035 zůstávají přísnější (fixní počty, povinný level, číslování
// dílčích cílů pod SC), novější datasety mají obecný režim, protože každý
// dokument čísluje a strukturuje jinak.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Per-dataset očekávání. `expectGoals`/`expectCile` = fixní počty (jen tam,
// kde je dokument definuje natvrdo), `levelRequired` = doc_indicators musí
// nést level dopad/výstup, `numUnderSc` = číslo dílčího cíle musí začínat
// číslem SC (Zdraví 2035 konvence „2.1.4").
const DATASETS = [
  { file: 'zdravi2035-plneni.json', expectGoals: 3, expectCile: 12, levelRequired: true, numUnderSc: true },
  { file: 'plneni-onko-2030.json' },
  { file: 'plneni-kv-2035.json' },
  { file: 'plneni-amr.json' },
  { file: 'plneni-dusevni-zdravi.json' },
  { file: 'plneni-zdravi-2030.json' },
];

const MATCHES = ['primo', 'proxy', 'chybi'];
const MERENI = ['primo', 'proxy', 'proces'];
const LEVELS = ['dopad', 'vystup'];

const indicators = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'indicators.json'), 'utf8'));
const known = new Set(indicators.indicators.map(i => i.id));
const strategies = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'strategies.json'), 'utf8'));
const strategyIds = new Set((strategies.strategies ?? []).map(s => s.id));

let totalErrors = 0;
let totalWarnings = 0;

function validateDataset(cfg) {
  const errors = [];
  const warnings = [];
  const fail = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const file = path.resolve(ROOT, 'data', cfg.file);
  if (!fs.existsSync(file)) {
    fail('soubor neexistuje');
    return { errors, warnings, summary: '' };
  }
  const plneni = JSON.parse(fs.readFileSync(file, 'utf8'));

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

  // ── strategické cíle a SC ──────────────────────────────────────────────
  const goals = new Set((plneni.strategic_goals ?? []).map(g => g.id));
  if (cfg.expectGoals != null && goals.size !== cfg.expectGoals) {
    fail(`čekáno ${cfg.expectGoals} strategických cílů, je ${goals.size}`);
  }
  if (!goals.size) fail('žádné strategic_goals');

  const cile = plneni.cile ?? [];
  if (cfg.expectCile != null && cile.length !== cfg.expectCile) {
    fail(`čekáno ${cfg.expectCile} specifických cílů, je ${cile.length}`);
  }
  if (!cile.length) fail('žádné cíle');
  const seenSc = new Set();

  for (const sc of cile) {
    const where = `SC ${sc.sc}`;
    if (seenSc.has(sc.sc)) fail(`${where}: duplicitní číslo cíle`);
    seenSc.add(sc.sc);
    if (!goals.has(sc.goal)) fail(`${where}: neznámý strategický cíl „${sc.goal}“`);
    if (!sc.title) fail(`${where}: chybí název`);

    const dcs = sc.dilci_cile ?? [];
    // SC bez dílčích cílů musí říct proč — jinak to vypadá jako nedopsaný záznam.
    if (!dcs.length && !sc.dilci_cile_note && !sc.poznamka) fail(`${where}: žádné dílčí cíle a žádné vysvětlení`);

    const nums = new Set();
    for (const d of dcs) {
      const dw = `${where} / dílčí cíl ${d.num}`;
      if (!d.num || !d.text) fail(`${dw}: chybí číslo nebo text`);
      if (nums.has(d.num)) fail(`${dw}: duplicitní číslo`);
      nums.add(d.num);
      if (cfg.numUnderSc && !String(d.num).startsWith(String(sc.sc))) fail(`${dw}: číslo nepatří pod SC ${sc.sc}`);
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
      if (cfg.levelRequired && !LEVELS.includes(di.level)) fail(`${dw}: level musí být ${LEVELS.join('/')}`);
      if (!cfg.levelRequired && di.level != null && !LEVELS.includes(di.level)) fail(`${dw}: neznámý level „${di.level}“`);
      checkMapping(di.mapping, dw);
      // Hodnota bez roku by vypadala jako aktuální — dokumenty měří
      // k pevnému datu.
      if (di.baseline && di.baseline.value != null && !di.baseline.year) {
        fail(`${dw}: baseline bez roku`);
      }
    }

    for (const id of sc.kontext_indikatory ?? []) {
      if (!known.has(id)) fail(`${where}: kontextový indikátor „${id}“ v kontraktu není`);
    }

    // Oficiální hodnocení (retrospektivy) musí být dohledatelné ke zdroji.
    if (sc.hodnoceni && (!sc.hodnoceni.text || !sc.hodnoceni.zdroj)) {
      fail(`${where}: hodnoceni musí mít text i zdroj (dokument + strana)`);
    }
  }

  for (const r of plneni.ramcove_indikatory ?? []) {
    checkMapping(r.mapping, `rámcový indikátor „${(r.name ?? '?').slice(0, 40)}…“`);
  }

  // ── zdroj musí být dohledatelný ────────────────────────────────────────
  if (!plneni.document?.url) {
    fail('chybí odkaz na dokument — mapování by nešlo ověřit');
  }
  if (!plneni.document?.approved && !plneni.document?.note) {
    fail('chybí datum schválení dokumentu (nebo note, proč není známé)');
  }
  if (!plneni.extracted_at) fail('chybí extracted_at (kdy byl dokument přepsán)');

  // ── vazba na registr strategií ─────────────────────────────────────────
  if (!strategyIds.has(plneni.strategy_id)) {
    fail(`strategy_id „${plneni.strategy_id}“ není v data/strategies.json`);
  }

  const dcTotal = cile.reduce((n, s) => n + (s.dilci_cile?.length ?? 0), 0);
  const diTotal = cile.reduce((n, s) => n + (s.doc_indicators?.length ?? 0), 0);
  return { errors, warnings, summary: `${cile.length} cílů, ${dcTotal} dílčích, ${diTotal} indikátorů dokumentu` };
}

for (const cfg of DATASETS) {
  const { errors, warnings, summary } = validateDataset(cfg);
  for (const w of warnings) console.warn(`  ⚠ ${cfg.file}: ${w}`);
  if (errors.length) {
    console.error(`[validate-plneni] ${cfg.file}: ${errors.length} chyb:`);
    for (const e of errors) console.error(`  ✗ ${e}`);
  } else {
    console.log(`[validate-plneni] ${cfg.file} OK — ${summary}${warnings.length ? `, ${warnings.length} varování` : ''}`);
  }
  totalErrors += errors.length;
  totalWarnings += warnings.length;
}

if (totalErrors) {
  console.error(`[validate-plneni] CELKEM ${totalErrors} chyb`);
  process.exit(1);
}
console.log(`[validate-plneni] OK — ${DATASETS.length} datasetů, ${totalWarnings} varování`);
