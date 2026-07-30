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
  const t = Date.UTC(y, m - 1, d);
  // Round-trip kontrola: Date.UTC neexistující dny tiše normalizuje
  // (2026-02-31 → 3. března) — takové datum odmítáme.
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return NaN;
  return t;
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

    // Volitelné hero médium (video/obrázek vedle úvodního textu microsite).
    // alt je povinný (přístupnost) a odkazované soubory musí existovat.
    if (w.hero_media != null) {
      const hm = w.hero_media;
      if (!['video', 'image'].includes(hm.kind)) {
        errors.push(`${tag}: hero_media.kind musí být video|image`);
      }
      if (!hm.src) errors.push(`${tag}: hero_media.src chybí`);
      else if (!fs.existsSync(path.join(ROOT, hm.src))) {
        errors.push(`${tag}: hero_media.src '${hm.src}' neexistuje`);
      }
      if (hm.poster && !fs.existsSync(path.join(ROOT, hm.poster))) {
        errors.push(`${tag}: hero_media.poster '${hm.poster}' neexistuje`);
      }
      if (!hm.alt) errors.push(`${tag}: hero_media.alt chybí (přístupnost)`);
    }

    // Volitelný datový příběh (animované vizuály na microsite). Každý vizuál
    // MUSÍ nést zdroj (note) — čísla bez atribuce na web nepatří.
    if (w.data_story != null) {
      const ds = w.data_story;
      if (!Array.isArray(ds.items) || ds.items.length === 0) {
        errors.push(`${tag}: data_story musí mít neprázdné pole items`);
      } else {
        ds.items.forEach((it, i) => {
          const itag = `${tag}: data_story[${i}]`;
          if (!it || !['counters', 'trend', 'bars'].includes(it.kind)) {
            errors.push(`${itag}: kind musí být counters|trend|bars`); return;
          }
          if (!it.note) errors.push(`${itag}: chybí note se zdrojem dat`);
          if (it.kind === 'trend') {
            const pts = Array.isArray(it.points) ? it.points : [];
            if (pts.length < 2) errors.push(`${itag}: trend potřebuje aspoň 2 body`);
            for (const pt of pts) {
              if (!pt || !Number.isFinite(pt.year) || !Number.isFinite(pt.value)) {
                errors.push(`${itag}: bod trendu musí mít číselné year a value`); break;
              }
            }
            // Osa X potřebuje rozpětí — body se shodným rokem by trendGeometry
            // odmítla a graf by se vykreslil prázdný (Codex #899).
            const years = new Set(pts.filter(pt => pt && Number.isFinite(pt.year)).map(pt => pt.year));
            if (pts.length >= 2 && years.size < 2) {
              errors.push(`${itag}: body trendu musí mít aspoň 2 různé roky`);
            }
          } else if (it.kind === 'counters') {
            const cs = Array.isArray(it.items) ? it.items : [];
            if (!cs.length) errors.push(`${itag}: counters potřebují aspoň 1 položku`);
            for (const c of cs) {
              if (!c || !c.label) { errors.push(`${itag}: counter bez label`); break; }
              if (!Number.isFinite(c.value) && !c.display) {
                errors.push(`${itag}: counter potřebuje číselné value nebo display`); break;
              }
            }
          } else if (it.kind === 'bars') {
            const rs = Array.isArray(it.rows) ? it.rows : [];
            if (!rs.length) errors.push(`${itag}: bars potřebují aspoň 1 řádek`);
            for (const r of rs) {
              if (!r || !r.label || !Number.isFinite(r.value)) {
                errors.push(`${itag}: řádek bars musí mít label a číselné value`); break;
              }
            }
          }
        });
      }
    }

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
