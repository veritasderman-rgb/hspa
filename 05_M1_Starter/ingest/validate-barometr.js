// Validace data/barometr.json (Barometr politických prohlášení).
// Enumy a invarianty pocházejí PŘÍMO z docs/metodika-barometr.md (§3, §4, §7).
// Spouštěj v CI před deployem: node ingest/validate-barometr.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Kanonické enumy (docs/metodika-barometr.md §7) ---
export const VALID_STAV = [
  'nema_meritelny_obsah',
  'ceka_na_data',
  'plni_se',
  'bez_pohybu',
  'opacny_smer',
  'splneno',
];

export const VALID_VERDIKT = [
  'sedi_s_daty',
  'nesedi',
  'zavadejici_kontext',
  'neoveritelne',
];

export const VALID_DIRECTION_WANTED = ['higher_is_better', 'lower_is_better'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function nonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Validuje obsah datasetu Barometru. Vrací pole chybových hlášek
 * (prázdné = validní). Exportováno pro testy.
 *
 * @param {object} data — parsed data/barometr.json
 * @param {{indicatorIds?: Set<string>, legislationIds?: Set<string>}} refs — foreign keys
 */
export function validateBarometr(data, refs = {}) {
  const errors = [];
  const { indicatorIds, legislationIds } = refs;

  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!data.meta || typeof data.meta !== 'object') {
    errors.push('meta must be object');
  } else {
    const src = data.meta.source;
    if (!src || typeof src !== 'object') {
      errors.push('meta.source must be object');
    } else {
      if (!nonEmptyString(src.nazev)) errors.push('meta.source.nazev musí být neprázdný');
      if (!nonEmptyString(src.url)) errors.push('meta.source.url musí být neprázdný');
      if (!nonEmptyString(src.datum)) errors.push('meta.source.datum musí být neprázdný');
    }
    // changelog: každá položka nese datum a důvod (§6)
    if (data.meta.changelog != null) {
      if (!Array.isArray(data.meta.changelog)) {
        errors.push('meta.changelog must be array');
      } else {
        for (const [i, c] of data.meta.changelog.entries()) {
          const tag = `meta.changelog[${i}]`;
          if (!nonEmptyString(c.datum) || !DATE_RE.test(c.datum)) errors.push(`${tag}: datum '${c.datum}' není YYYY-MM-DD`);
          if (!nonEmptyString(c.duvod)) errors.push(`${tag}: chybí důvod`);
        }
      }
    }
  }

  if (!Array.isArray(data.commitments)) {
    errors.push('commitments must be array');
  } else {
    validateCommitments(data.commitments, { indicatorIds, legislationIds }, errors);
  }

  if (!Array.isArray(data.statements)) {
    errors.push('statements must be array');
  } else {
    validateStatements(data.statements, { indicatorIds }, errors);
  }

  return errors;
}

function validateCommitments(commitments, { indicatorIds, legislationIds }, errors) {
  const ids = new Set();
  for (const [i, c] of commitments.entries()) {
    const tag = `commitment[${i}] (${c.id ?? '?'})`;

    if (!nonEmptyString(c.id)) errors.push(`${tag}: chybí id`);
    else if (ids.has(c.id)) errors.push(`${tag}: duplicate id`);
    else ids.add(c.id);

    // Verbatim citace nesmí být prázdná; zdroj s URL a datem (§1, §2, §7)
    if (!nonEmptyString(c.citace_verbatim)) errors.push(`${tag}: citace_verbatim nesmí být prázdná`);
    const z = c.zdroj;
    if (!z || typeof z !== 'object') {
      errors.push(`${tag}: chybí zdroj {nazev, url, datum}`);
    } else {
      if (!nonEmptyString(z.nazev)) errors.push(`${tag}: zdroj.nazev musí být neprázdný`);
      if (!nonEmptyString(z.url)) errors.push(`${tag}: zdroj.url musí být neprázdný`);
      if (!nonEmptyString(z.datum) || !DATE_RE.test(z.datum)) errors.push(`${tag}: zdroj.datum '${z.datum}' není YYYY-MM-DD`);
    }

    if (!nonEmptyString(c.interpretace)) errors.push(`${tag}: chybí interpretace`);

    // Stav enum (§3.1, §7)
    if (!VALID_STAV.includes(c.stav)) errors.push(`${tag}: neplatný stav '${c.stav}' (povolené: ${VALID_STAV.join(', ')})`);

    // Checkpoint: závazek se stav ≠ nema_meritelny_obsah musí mít neprázdné
    // linked_indicators (každý s baseline_value, baseline_year, direction_wanted)
    // NEBO neprázdné legislativa_ids (§2, §3, §7)
    const li = Array.isArray(c.linked_indicators) ? c.linked_indicators : [];
    const legs = Array.isArray(c.legislativa_ids) ? c.legislativa_ids : [];
    if (c.linked_indicators != null && !Array.isArray(c.linked_indicators)) errors.push(`${tag}: linked_indicators must be array`);
    if (c.legislativa_ids != null && !Array.isArray(c.legislativa_ids)) errors.push(`${tag}: legislativa_ids must be array`);

    const hasCheckpoint = li.length > 0 || legs.length > 0;
    if (c.stav !== 'nema_meritelny_obsah' && !hasCheckpoint) {
      errors.push(`${tag}: stav '${c.stav}' vyžaduje aspoň jeden checkpoint (linked_indicators nebo legislativa_ids)`);
    }

    // Baseline povinná u měřitelných linked_indicators + FK na indikátory
    for (const [j, l] of li.entries()) {
      const ltag = `${tag}.linked_indicators[${j}] (${l?.id ?? '?'})`;
      if (!l || typeof l !== 'object') { errors.push(`${ltag}: musí být objekt`); continue; }
      if (!nonEmptyString(l.id)) errors.push(`${ltag}: chybí id`);
      else if (indicatorIds?.size && !indicatorIds.has(l.id)) errors.push(`${ltag}: indikátor '${l.id}' nenalezen v data/indicators.json`);
      if (typeof l.baseline_value !== 'number') errors.push(`${ltag}: baseline_value musí být číslo`);
      if (!Number.isInteger(l.baseline_year)) errors.push(`${ltag}: baseline_year musí být celé číslo (rok)`);
      if (!VALID_DIRECTION_WANTED.includes(l.direction_wanted)) errors.push(`${ltag}: neplatný direction_wanted '${l.direction_wanted}'`);
    }

    // FK na legislativu
    if (legislationIds?.size) {
      for (const legId of legs) {
        if (!legislationIds.has(legId)) errors.push(`${tag}: legislativa_id '${legId}' nenalezen v data/legislativa.json`);
      }
    }

    // stav_duvod povinný u všech stavů kromě ceka_na_data (§3.6, §7)
    if (c.stav !== 'ceka_na_data' && !nonEmptyString(c.stav_duvod)) {
      errors.push(`${tag}: stav_duvod je povinný pro stav '${c.stav}'`);
    }

    if (c.stav_od != null && !DATE_RE.test(c.stav_od)) errors.push(`${tag}: stav_od '${c.stav_od}' není YYYY-MM-DD`);

    // historie: každá položka nese datum a důvod (§3.6, §6)
    if (c.historie != null) {
      if (!Array.isArray(c.historie)) errors.push(`${tag}: historie must be array`);
      else for (const [j, h] of c.historie.entries()) {
        const htag = `${tag}.historie[${j}]`;
        if (!nonEmptyString(h.datum) || !DATE_RE.test(h.datum)) errors.push(`${htag}: datum '${h.datum}' není YYYY-MM-DD`);
        if (!nonEmptyString(h.duvod)) errors.push(`${htag}: chybí důvod`);
      }
    }
  }
}

function validateStatements(statements, { indicatorIds }, errors) {
  const ids = new Set();
  for (const [i, s] of statements.entries()) {
    const tag = `statement[${i}] (${s.id ?? '?'})`;

    if (!nonEmptyString(s.id)) errors.push(`${tag}: chybí id`);
    else if (ids.has(s.id)) errors.push(`${tag}: duplicate id`);
    else ids.add(s.id);

    // Verbatim výrok nesmí být prázdný; kdo/kdy + kde s URL (§4.4)
    if (!nonEmptyString(s.vyrok_verbatim)) errors.push(`${tag}: vyrok_verbatim nesmí být prázdný`);
    if (!nonEmptyString(s.kdo)) errors.push(`${tag}: chybí kdo`);
    if (!nonEmptyString(s.kdy) || !DATE_RE.test(s.kdy)) errors.push(`${tag}: kdy '${s.kdy}' není YYYY-MM-DD`);
    const k = s.kde;
    if (!k || typeof k !== 'object') {
      errors.push(`${tag}: chybí kde {nazev, url}`);
    } else {
      if (!nonEmptyString(k.nazev)) errors.push(`${tag}: kde.nazev musí být neprázdný`);
      if (!nonEmptyString(k.url)) errors.push(`${tag}: kde.url musí být neprázdný`);
    }

    // Verdikt enum (§4.2, §7)
    if (!VALID_VERDIKT.includes(s.verdikt)) errors.push(`${tag}: neplatný verdikt '${s.verdikt}' (povolené: ${VALID_VERDIKT.join(', ')})`);

    // verdikt_zduvodneni povinné vždy (§4.4 bod 5, §7)
    if (!nonEmptyString(s.verdikt_zduvodneni)) errors.push(`${tag}: verdikt_zduvodneni je povinné`);

    // FK na indikátory
    if (s.linked_indicators != null) {
      if (!Array.isArray(s.linked_indicators)) errors.push(`${tag}: linked_indicators must be array`);
      else if (indicatorIds?.size) {
        for (const id of s.linked_indicators) {
          if (!indicatorIds.has(id)) errors.push(`${tag}: linked_indicator '${id}' nenalezen v data/indicators.json`);
        }
      }
    }
    if (s.zdroje != null && !Array.isArray(s.zdroje)) errors.push(`${tag}: zdroje must be array`);
  }
}

/** Načte množinu id z datasetu (top-level pole nebo více polí). */
function loadIdSet(file, keys) {
  const p = path.join(ROOT, file);
  const set = new Set();
  if (!fs.existsSync(p)) return set;
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const key of keys) {
    for (const x of data[key] ?? []) if (x?.id) set.add(x.id);
  }
  return set;
}

function main() {
  const file = path.join(ROOT, 'data', 'barometr.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/barometr.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  const indicatorIds = loadIdSet('data/indicators.json', ['indicators']);
  // Legislativa FK: radar (items) i plán (plan_items) — obojí platné cíle
  const legislationIds = loadIdSet('data/legislativa.json', ['items', 'plan_items']);

  const errors = validateBarometr(data, { indicatorIds, legislationIds });

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: validated ${data.commitments.length} commitments + ${data.statements.length} statements (barometr).`);
}

// Spusť main jen při přímém volání (ne při importu z testů)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
