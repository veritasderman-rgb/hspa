// Diagnóza — build index křížových vazeb (balík A plánu PLAN-DIAGNOZA.md).
//
// Proč: stránka diagnoza.html skládá pro každý indikátor „spis případu"
// z osmi existujících datasetů. Tento skript vazby posbírá build-time do
// jedné mapy data/diagnoza-index.json — frontend pak jen čte, nic nepočítá.
//
// Zdroje vazeb pro indikátor X:
//   articles      — data/articles.json         (linked_indicators[])
//   levers        — data/levers.json           (effects[].indicator + kind)
//   vyhlaska      — data/vyhlaska-hra.json     (segments[].effects[].indicator;
//                                               kind „none" indikátor nemá → přeskočen)
//   barometr      — data/barometr.json         (commitments[].linked_indicators[].id;
//                                               titulek = zkrácená citace_verbatim,
//                                               závazky vlastní titulek nemají)
//   kompas        — data/personal-checks.json  (checks[].related_indicator)
//   prevence      — data/prevention.json       (themes[].hspa_indicators[])
//   system_nodes  — data/system-model.json     (nodes[].indicators[])
//   region_dataset— data/regions.json          (datasets[].indicator_id, první match)
//
// Zásady:
//   - Indikátor bez jediné vazby se do indexu NEzapisuje.
//   - Žádné mrtvé cizí klíče: vazba na indikátor, který v indicators.json
//     neexistuje, se tiše přeskočí.
//   - Deterministické pořadí (indikátory dle id, položky dle id/slugu),
//     aby diff výstupu zůstal stabilní; hlídá test tests/diagnoza-index.test.js.
//   - Viditelnost článků (isArticleVisible) index neřeší — jen metadata
//     slug + title; filtrování je věc frontendu.
//
// Použití: npm run build:diagnoza

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGeneratedJson } from './lib/write-generated.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(ROOT, 'data', 'diagnoza-index.json');

/** Načte JSON soubor relativně ke kořeni 05_M1_Starter. */
function loadJson(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));
}

/**
 * Zkrátí text na maxLen znaků na hranici slova a přidá výpustku.
 * Používá se pro titulek závazku Barometru (závazky mají jen citaci).
 */
export function shortTitle(text, maxLen = 110) {
  const t = String(text ?? '').trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

/** Řazení dle klíče (id/slug) — lokálně nezávislé, stabilní diff. */
function byKey(key) {
  return (a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);
}

/**
 * Sestaví index křížových vazeb pro Diagnózu.
 *
 * @param {object} opts
 * @param {Date} [opts.now] — čas generování (injektovatelný kvůli testům)
 * @returns {object} obsah data/diagnoza-index.json
 */
export function buildDiagnozaIndex({ now = new Date() } = {}) {
  const indicatorsDoc = loadJson('data/indicators.json');
  const articlesDoc = loadJson('data/articles.json');
  const leversDoc = loadJson('data/levers.json');
  const vyhlaskaDoc = loadJson('data/vyhlaska-hra.json');
  const barometrDoc = loadJson('data/barometr.json');
  const checksDoc = loadJson('data/personal-checks.json');
  const preventionDoc = loadJson('data/prevention.json');
  const systemModelDoc = loadJson('data/system-model.json');
  const regionsDoc = loadJson('data/regions.json');

  // Množina platných indikátorů — vazby na neznámé id se tiše přeskakují.
  const validIds = new Set(
    (indicatorsDoc.indicators ?? []).map((i) => i.id).filter(Boolean),
  );

  // Rozpracovaný spis pro každý indikátor; vzniká líně při první vazbě.
  const files = new Map();
  function fileFor(indicatorId) {
    if (!indicatorId || !validIds.has(indicatorId)) return null;
    if (!files.has(indicatorId)) {
      files.set(indicatorId, {
        articles: [],
        levers: [],
        vyhlaska: [],
        barometr: [],
        kompas: [],
        prevence: [],
        system_nodes: [],
        region_dataset: null,
      });
    }
    return files.get(indicatorId);
  }

  /** Přidá položku do seznamu spisu, duplicitní id/slug přeskočí. */
  function push(indicatorId, listKey, item, dedupeKey) {
    const file = fileFor(indicatorId);
    if (!file) return;
    const list = file[listKey];
    if (list.some((x) => x[dedupeKey] === item[dedupeKey])) return;
    list.push(item);
  }

  // ── Články: linked_indicators[] → { slug, title } ─────────────────────────
  for (const art of articlesDoc.articles ?? []) {
    if (!art?.slug) continue;
    for (const iid of art.linked_indicators ?? []) {
      push(iid, 'articles', { slug: art.slug, title: art.title ?? art.slug }, 'slug');
    }
  }

  // ── Páky simulátoru: effects[].indicator → { id, label, kind } ────────────
  for (const lever of leversDoc.levers ?? []) {
    for (const eff of lever.effects ?? []) {
      if (!eff?.indicator) continue;
      push(eff.indicator, 'levers', {
        id: lever.id,
        label: lever.label ?? lever.id,
        kind: eff.kind ?? null,
      }, 'id');
    }
  }

  // ── Úhradová vyhláška: segments[].effects[].indicator → { id, label } ─────
  // Efekty kind „none" indikátor nemají — guard na eff.indicator je vyřadí.
  for (const seg of vyhlaskaDoc.segments ?? []) {
    for (const eff of seg.effects ?? []) {
      if (!eff?.indicator) continue;
      push(eff.indicator, 'vyhlaska', {
        id: seg.id,
        label: seg.label ?? seg.id,
      }, 'id');
    }
  }

  // ── Barometr: commitments[].linked_indicators[].id → { id, titulek, stav }
  // Závazek nemá vlastní titulek — odvozuje se zkrácením verbatim citace.
  for (const cm of barometrDoc.commitments ?? []) {
    for (const link of cm.linked_indicators ?? []) {
      const iid = typeof link === 'string' ? link : link?.id;
      if (!iid) continue;
      push(iid, 'barometr', {
        id: cm.id,
        titulek: shortTitle(cm.citace_verbatim),
        stav: cm.stav ?? null,
      }, 'id');
    }
  }

  // ── Kompas (osobní prevence): checks[].related_indicator → { id, label } ──
  for (const check of checksDoc.checks ?? []) {
    if (!check?.related_indicator) continue; // related_indicator smí být null
    push(check.related_indicator, 'kompas', {
      id: check.id,
      label: check.label ?? check.id,
    }, 'id');
  }

  // ── Prevence (témata): themes[].hspa_indicators[] → { id, title } ─────────
  for (const theme of preventionDoc.themes ?? []) {
    for (const iid of theme.hspa_indicators ?? []) {
      push(iid, 'prevence', { id: theme.id, title: theme.title ?? theme.id }, 'id');
    }
  }

  // ── Model systému: nodes[].indicators[] → { id, label, kind } ─────────────
  for (const node of systemModelDoc.nodes ?? []) {
    for (const iid of node.indicators ?? []) {
      push(iid, 'system_nodes', {
        id: node.id,
        label: node.label ?? node.id,
        kind: node.kind ?? null,
      }, 'id');
    }
  }

  // ── Kraje: datasets[].indicator_id → id datasetu (první match vyhrává) ────
  for (const ds of regionsDoc.datasets ?? []) {
    const file = fileFor(ds?.indicator_id);
    if (file && file.region_dataset == null) file.region_dataset = ds.id;
  }

  // ── Finalizace: seřadit, spočítat vazby ───────────────────────────────────
  const indicators = {};
  let totalLinks = 0;
  for (const iid of [...files.keys()].sort()) {
    const file = files.get(iid);
    file.articles.sort(byKey('slug'));
    for (const key of ['levers', 'vyhlaska', 'barometr', 'kompas', 'prevence', 'system_nodes']) {
      file[key].sort(byKey('id'));
    }
    const links =
      file.articles.length + file.levers.length + file.vyhlaska.length +
      file.barometr.length + file.kompas.length + file.prevence.length +
      file.system_nodes.length + (file.region_dataset ? 1 : 0);
    if (links === 0) continue; // indikátor bez jediné vazby se nezapisuje
    indicators[iid] = file;
    totalLinks += links;
  }

  return {
    version: '1.0',
    generated_at: now.toISOString(),
    _doc: 'Index křížových vazeb pro Diagnózu (diagnoza.html): pro každý indikátor „spis případu“ — články (linked_indicators), páky simulátoru (levers.json), segmenty úhradové vyhlášky (vyhlaska-hra.json), závazky Barometru (barometr.json; titulek = zkrácená citace, závazky vlastní titulek nemají), osobní kontroly Kompasu (personal-checks.json), preventivní témata (prevention.json), uzly Modelu systému (system-model.json) a krajský dataset (regions.json, první match). Generuje scripts/build-diagnoza-index.js (npm run build:diagnoza) — needitovat ručně. Indikátory bez jediné vazby v indexu nejsou; viditelnost článků řeší frontend přes isArticleVisible.',
    indicators,
  };
}

/** Počet vazeb jednoho spisu (pro výpis i testy). */
export function countLinks(file) {
  return file.articles.length + file.levers.length + file.vyhlaska.length +
    file.barometr.length + file.kompas.length + file.prevence.length +
    file.system_nodes.length + (file.region_dataset ? 1 : 0);
}

// CLI: node scripts/build-diagnoza-index.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const index = buildDiagnozaIndex();
  const written = writeGeneratedJson(OUT_PATH, index, { pretty: true });
  const n = Object.keys(index.indicators).length;
  const m = Object.values(index.indicators).reduce((acc, f) => acc + countLinks(f), 0);
  console.log(
    `OK: diagnoza-index — ${n} indikátorů se spisem, ${m} vazeb celkem` +
      (written ? '' : ' [beze změny]'),
  );
}
