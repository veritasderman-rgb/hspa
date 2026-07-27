// Validátor data/awareness-weeks.json — registr „Týdnů zdraví".
// V npm run validate:all. Hlídá: unikátní id; validní datumy start<=end;
// týdny se nepřekrývají; status z enumu; popup/copy vyplněné; odkazy
// (články/indikátory/prevence/nástroje) existují; ready týden má aspoň 1 doklad.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VALID_STATUS = new Set(['draft', 'ready', 'archived']);
const VALID_SECTION = new Set(['articles', 'indicators', 'prevention', 'tools']);

function day(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function validateAwarenessWeeks(docOverride) {
  const errors = [];
  // docOverride: testy validují syntetické dokumenty bez zápisu na disk
  const doc = docOverride ?? JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'awareness-weeks.json'), 'utf8'));
  const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const prevention = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  const artSlugs = new Set((articles.articles || []).map(a => a.slug));
  const indIds = new Set((indicators.indicators || []).map(i => i.id));
  const prevIds = new Set((prevention.themes || []).map(t => t.id));

  if (!Array.isArray(doc.weeks) || doc.weeks.length === 0) {
    errors.push('chybí neprázdné pole "weeks"');
    return report(errors);
  }

  const seen = new Set();
  const intervals = [];
  for (const w of doc.weeks) {
    const tag = `týden ${w.id ?? '?'}`;
    if (!w.id) errors.push(`${tag}: chybí id`);
    if (w.id && seen.has(w.id)) errors.push(`${tag}: duplicitní id`);
    if (w.id) seen.add(w.id);
    if (!w.observance || !w.observance_source) errors.push(`${tag}: chybí observance/observance_source`);
    if (!w.kicker || !w.title || !w.lead) errors.push(`${tag}: chybí kicker/title/lead`);
    if (!VALID_STATUS.has(w.status)) errors.push(`${tag}: status musí být draft|ready|archived`);

    const a = day(w.start); const b = day(w.end);
    if (!Number.isFinite(a)) errors.push(`${tag}: neplatný start '${w.start}'`);
    if (!Number.isFinite(b)) errors.push(`${tag}: neplatný end '${w.end}'`);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (b < a) errors.push(`${tag}: end je před start`);
      const span = (b - a) / 86400000 + 1;
      if (span > 14) errors.push(`${tag}: interval delší než 14 dní (${span})`);
      intervals.push({ id: w.id, a, b });
    }

    // Volitelné okno předběžného ohlášení (kampaň „visí dřív"): musí být
    // validní datum PŘED startem a ne absurdně brzy (max 14 dní předstih).
    if (w.announce_from != null) {
      const an = day(w.announce_from);
      if (!Number.isFinite(an)) errors.push(`${tag}: neplatný announce_from '${w.announce_from}'`);
      else if (Number.isFinite(a)) {
        if (an >= a) errors.push(`${tag}: announce_from musí být před start`);
        else if ((a - an) / 86400000 > 14) errors.push(`${tag}: announce_from víc než 14 dní před startem`);
      }
    }

    const p = w.popup || {};
    if (!p.headline || !p.body || !p.cta) errors.push(`${tag}: popup musí mít headline/body/cta`);

    for (const s of w.microsite?.sections || []) {
      if (!VALID_SECTION.has(s.kind)) errors.push(`${tag}: sekce kind '${s.kind}' není articles|indicators|prevention|tools`);
      if (!s.h) errors.push(`${tag}: sekce bez nadpisu`);
    }

    for (const s of w.linked_articles || []) {
      if (!artSlugs.has(s)) errors.push(`${tag}: článek '${s}' není v articles.json`);
      if (!fs.existsSync(path.join(ROOT, s))) errors.push(`${tag}: soubor '${s}' neexistuje`);
    }
    for (const i of w.linked_indicators || []) {
      if (!indIds.has(i)) errors.push(`${tag}: indikátor '${i}' není v indicators.json`);
    }
    for (const t of w.linked_prevention_themes || []) {
      if (!prevIds.has(t)) errors.push(`${tag}: prevence '${t}' není v prevention.json`);
    }

    const hasEvidence = (w.linked_articles || []).length + (w.linked_indicators || []).length > 0;
    if (w.status === 'ready' && !hasEvidence) {
      errors.push(`${tag}: ready týden musí mít aspoň 1 článek nebo indikátor`);
    }

    // Ready týden musí mít kontextový blok (proč záleží / co ovlivňuje / jak na tom je ČR),
    // aby microsite nebyla jen odkazovník.
    if (w.status === 'ready') {
      const c = w.context;
      if (!c || typeof c !== 'object') {
        errors.push(`${tag}: ready týden musí mít context (why/affects/cz)`);
      } else {
        if (!c.why) errors.push(`${tag}: context.why chybí`);
        if (!Array.isArray(c.affects) || c.affects.length === 0) errors.push(`${tag}: context.affects musí být neprázdné pole`);
        if (!c.cz) errors.push(`${tag}: context.cz chybí`);
      }
    }
  }

  // Překryv intervalů
  intervals.sort((x, y) => x.a - y.a);
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].a <= intervals[i - 1].b) {
      errors.push(`překryv termínů: '${intervals[i - 1].id}' a '${intervals[i].id}'`);
    }
  }

  return report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`FAIL: awareness-weeks.json — ${errors.length} chyb:`);
    errors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('OK: validated awareness-weeks.json — týdny, termíny i doklady v pořádku.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validateAwarenessWeeks() ? 0 : 1);
}
