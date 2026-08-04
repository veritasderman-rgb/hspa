// Souvislosti engine — build-time generátor znalostního grafu indikátorů.
//
// Proč: napříč repem žije pět datasetů, které se navzájem znají jen přes
// cizí klíče (indikátory × kauzální model × legislativa × články × claims ×
// závazky Barometru). Tento skript je jednou za pipeline slije do jedné mapy
// `data/souvislosti.json`: pro každý indikátor typované seznamy vazeb, které
// pak stránka indikátoru (BAR7) vykreslí jako blok „Souvislosti".
//
// Sběr vazeb pro indikátor `X`:
//   (a) MODEL      — uzel data/system-model.json, jehož `indicators[]` obsahuje X;
//                    hrany do tohoto uzlu (co ho ovlivňuje) a z něj (co ovlivňuje on).
//   (b) LEGISLATIVA— položky data/legislativa.json (items i plan_items) vázané na X.
//   (c) ČLÁNKY     — data/articles.json přes `linked_indicators` (jen viditelné).
//   (d) CLAIMS     — kvantitativní tvrzení data/claims.json přes `indicator_id`.
//   (e) BAROMETR   — závazky a výroky data/barometr.json přes `linked_indicators`.
//
// Zásady:
//   - Deterministický: stejné vstupy → identický výstup (mimo `generated_at`).
//     Pořadí klíčů = pořadí indikátorů v data/indicators.json, pořadí položek
//     = pořadí ve zdrojovém datasetu. Idempotentní (hlídá test).
//   - Žádné mrtvé cizí klíče: zdrojová vazba se do výstupu dostane jen tehdy,
//     když se cíl dohledá (indikátor v indicators.json, článek v articles.json,
//     legislativa v legislativa.json). Neznámý cíl se tiše přeskočí.
//   - Graceful: každý zdroj je volitelný. Chybějící/nevalidní soubor
//     (typicky barometr.json = fixture) se přeskočí, engine běží dál.
//   - Žádné UI — to je BAR7. Výstup jsou jen data.
//
// Použití:  npm run build:souvislosti  [--dry]
// Zapojeno do refresh pipeline (.github/workflows/refresh.yml) po transformu.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGeneratedJson } from './lib/write-generated.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/** Bezpečné načtení JSON. Vrací fallback při chybějícím/nevalidním souboru. */
export function loadJson(root, rel, fallback = null) {
  try {
    return JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Sestaví znalostní graf souvislostí.
 *
 * @param {object} opts
 * @param {string} [opts.root] — kořen repa (default: 05_M1_Starter)
 * @param {Date}   [opts.now]  — čas generování (injektovatelný kvůli testům)
 * @param {object} [opts.data] — předpřipravené datasety (kvůli testům); jinak čte z disku
 * @returns {object} obsah data/souvislosti.json
 */
export function buildSouvislosti({ root = ROOT, now = new Date(), data } = {}) {
  // Injekce datasetů kvůli testům: klíč PŘÍTOMNÝ v `data` (i s hodnotou null)
  // vyhrává nad čtením z disku — jinak by nešlo otestovat „soubor chybí".
  const pick = (key, rel, fallback) =>
    data && Object.prototype.hasOwnProperty.call(data, key)
      ? data[key] ?? fallback
      : loadJson(root, rel, fallback);
  const indicatorsDoc = pick('indicators', 'data/indicators.json', { indicators: [] });
  const systemModel = pick('systemModel', 'data/system-model.json', { nodes: [], edges: [] });
  const legislativa = pick('legislativa', 'data/legislativa.json', { items: [], plan_items: [] });
  const articlesDoc = pick('articles', 'data/articles.json', { articles: [] });
  const claimsDoc = pick('claims', 'data/claims.json', { claims: [] });
  const barometr = data && Object.prototype.hasOwnProperty.call(data, 'barometr')
    ? data.barometr // fixture / může chybět — injektovaná hodnota (i null) vyhrává
    : loadJson(root, 'data/barometr.json', null);

  const indicators = Array.isArray(indicatorsDoc?.indicators) ? indicatorsDoc.indicators : [];
  const nodes = Array.isArray(systemModel?.nodes) ? systemModel.nodes : [];
  const edges = Array.isArray(systemModel?.edges) ? systemModel.edges : [];
  const legItems = Array.isArray(legislativa?.items) ? legislativa.items : [];
  const planItems = Array.isArray(legislativa?.plan_items) ? legislativa.plan_items : [];
  const articles = Array.isArray(articlesDoc?.articles) ? articlesDoc.articles : [];
  const claims = Array.isArray(claimsDoc?.claims) ? claimsDoc.claims : [];

  // --- Rejstříky pro FK integritu ---
  const indById = new Map(indicators.map((i) => [i.id, i]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // Uzel modelu, do jehož `indicators[]` indikátor patří (indikátor je v jednom uzlu).
  const nodeByIndicator = new Map();
  for (const n of nodes) {
    for (const iid of Array.isArray(n.indicators) ? n.indicators : []) {
      if (!nodeByIndicator.has(iid)) nodeByIndicator.set(iid, n);
    }
  }
  // Článek dohledatelný podle id i podle slug (různé datasety odkazují různě).
  const articleByRef = new Map();
  for (const a of articles) {
    if (a.id) articleByRef.set(a.id, a);
    if (a.slug) articleByRef.set(a.slug, a);
  }
  const legItemById = new Map(legItems.map((it) => [it.id, it]));

  // Akumulátor: indicator_id → typované seznamy vazeb.
  const acc = new Map();
  function bucket(iid) {
    if (!indById.has(iid)) return null; // neznámý indikátor → žádný mrtvý FK
    if (!acc.has(iid)) {
      acc.set(iid, {
        id: iid,
        name: indById.get(iid).name ?? iid,
        model: null,
        legislativa: [],
        articles: [],
        claims: [],
        barometr: { commitments: [], statements: [] },
      });
    }
    return acc.get(iid);
  }

  // --- (a) MODEL: uzel + příchozí/odchozí hrany ---
  for (const iid of indById.keys()) {
    const node = nodeByIndicator.get(iid);
    if (!node) continue;
    const b = bucket(iid);
    const incoming = [];
    const outgoing = [];
    for (const e of edges) {
      if (e.to === node.id && nodeById.has(e.from)) {
        const src = nodeById.get(e.from);
        incoming.push({
          node_id: src.id,
          label: src.label ?? src.id,
          kind: src.kind ?? null,
          layer: src.layer ?? null,
          polarity: e.polarity ?? null,
          strength: e.strength ?? null,
          mechanism: e.mechanism ?? '',
        });
      }
      if (e.from === node.id && nodeById.has(e.to)) {
        const dst = nodeById.get(e.to);
        outgoing.push({
          node_id: dst.id,
          label: dst.label ?? dst.id,
          kind: dst.kind ?? null,
          layer: dst.layer ?? null,
          polarity: e.polarity ?? null,
          strength: e.strength ?? null,
          mechanism: e.mechanism ?? '',
        });
      }
    }
    b.model = {
      node: { id: node.id, label: node.label ?? node.id, kind: node.kind ?? null, layer: node.layer ?? null },
      incoming, // co na indikátor působí (páky/uzly směřující do jeho uzlu)
      outgoing, // co indikátor ovlivňuje
    };
  }

  // --- (b) LEGISLATIVA: items (přímé linked_indicators) ---
  for (const it of legItems) {
    for (const iid of Array.isArray(it.linked_indicators) ? it.linked_indicators : []) {
      const b = bucket(iid);
      if (!b) continue;
      b.legislativa.push({
        kind: 'radar',
        id: it.id,
        title: it.title_short ?? it.title ?? it.id,
        phase: it.phase ?? null,
      });
    }
  }
  // plan_items: vazba na indikátor přes radar_id → item.linked_indicators.
  for (const p of planItems) {
    const linkedItem = p.radar_id ? legItemById.get(p.radar_id) : null;
    const iids = linkedItem && Array.isArray(linkedItem.linked_indicators) ? linkedItem.linked_indicators : [];
    for (const iid of iids) {
      const b = bucket(iid);
      if (!b) continue;
      b.legislativa.push({
        kind: 'plan',
        id: p.id,
        title: p.nazev ?? p.id,
        phase: p.stav ?? null,
        plan_termin: p.plan_termin ?? null,
        radar_id: p.radar_id ?? null,
      });
    }
  }

  // --- (c) ČLÁNKY: přes linked_indicators (jen viditelné = published !== false) ---
  for (const a of articles) {
    if (a.published === false) continue; // drafty se do sdílené vrstvy nedostanou
    for (const iid of Array.isArray(a.linked_indicators) ? a.linked_indicators : []) {
      const b = bucket(iid);
      if (!b) continue;
      b.articles.push({
        id: a.id ?? null,
        slug: a.slug ?? (a.id ? `clanek-${a.id}.html` : null),
        title: a.title ?? a.id ?? '',
        date: a.date ?? null,
        rubric: a.rubric ?? null,
      });
    }
  }

  // --- (d) CLAIMS: přes indicator_id (jen z viditelných článků) ---
  for (const c of claims) {
    if (!c.indicator_id) continue;
    const b = bucket(c.indicator_id);
    if (!b) continue;
    // Dohledej článek claimu. Claims z nepublikovaných draftů se do sdílené
    // vrstvy nedostanou — stejné pravidlo viditelnosti jako u článků výše,
    // jinak by veřejný souvislosti.json prosakoval draft obsah a odkazy.
    const art = c.article ? articleByRef.get(c.article) : null;
    if (art && art.published === false) continue;
    b.claims.push({
      id: c.id,
      article: c.article ?? null,
      article_slug: art?.slug ?? (c.article && /\.html$/.test(c.article) ? c.article : null),
      quote: c.quote ?? '',
      metric: c.metric ?? null,
      value: c.value ?? null,
      unit: c.unit ?? null,
      as_of: c.as_of ?? null,
      relation: c.relation ?? null,
    });
  }

  // --- (e) BAROMETR: závazky + výroky (soubor je volitelný / fixture) ---
  if (barometr && typeof barometr === 'object') {
    for (const cm of Array.isArray(barometr.commitments) ? barometr.commitments : []) {
      for (const li of Array.isArray(cm.linked_indicators) ? cm.linked_indicators : []) {
        const iid = typeof li === 'string' ? li : li?.id;
        if (!iid) continue;
        const b = bucket(iid);
        if (!b) continue;
        b.barometr.commitments.push({
          id: cm.id,
          stav: cm.stav ?? null,
          oblast: cm.oblast ?? null,
          baseline_value: typeof li === 'object' ? (li.baseline_value ?? null) : null,
          baseline_year: typeof li === 'object' ? (li.baseline_year ?? null) : null,
          direction_wanted: typeof li === 'object' ? (li.direction_wanted ?? null) : null,
        });
      }
    }
    for (const st of Array.isArray(barometr.statements) ? barometr.statements : []) {
      for (const li of Array.isArray(st.linked_indicators) ? st.linked_indicators : []) {
        const iid = typeof li === 'string' ? li : li?.id;
        if (!iid) continue;
        const b = bucket(iid);
        if (!b) continue;
        b.barometr.statements.push({
          id: st.id,
          verdikt: st.verdikt ?? null,
          kdo: st.kdo ?? null,
          funkce: st.funkce ?? null,
        });
      }
    }
  }

  // --- Sestavení výstupu v deterministickém pořadí (dle indicators.json) ---
  const out = {};
  let withLinks = 0;
  for (const ind of indicators) {
    const b = acc.get(ind.id);
    if (!b) continue; // indikátor bez jediné vazby se do mapy nepřidává
    const hasAny =
      b.model ||
      b.legislativa.length ||
      b.articles.length ||
      b.claims.length ||
      b.barometr.commitments.length ||
      b.barometr.statements.length;
    if (!hasAny) continue;
    out[ind.id] = b;
    withLinks++;
  }

  return {
    version: '1.0',
    generated_at: now.toISOString(),
    _doc:
      'Souvislosti — build-time znalostní graf indikátorů. Generuje scripts/build-souvislosti.js ' +
      'z indicators + system-model + legislativa + articles + claims + barometr. NEEDITOVAT ručně ' +
      '(přepíše refresh pipeline). Mapa indicator_id → { model, legislativa[], articles[], claims[], barometr }.',
    counts: {
      indicators_total: indicators.length,
      indicators_with_links: withLinks,
      sources: {
        system_model_nodes: nodes.length,
        legislativa_items: legItems.length,
        legislativa_plan_items: planItems.length,
        articles_visible: articles.filter((a) => a.published !== false).length,
        claims: claims.length,
        barometr: Boolean(barometr),
      },
    },
    indicators: out,
  };
}

function main() {
  const result = buildSouvislosti();
  const outPath = resolve(ROOT, 'data/souvislosti.json');
  let written = false;
  if (!DRY) written = writeGeneratedJson(outPath, result, { pretty: true });
  const c = result.counts;
  console.log(
    `souvislosti.json: ${c.indicators_with_links}/${c.indicators_total} indikátorů s vazbami ` +
      `(model ${c.sources.system_model_nodes} uzlů, legislativa ${c.sources.legislativa_items}+${c.sources.legislativa_plan_items}, ` +
      `články ${c.sources.articles_visible}, claims ${c.sources.claims}, barometr ${c.sources.barometr ? 'ano' : 'ne'})` +
      (DRY ? ' [dry]' : written ? '' : ' [beze změny]'),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
