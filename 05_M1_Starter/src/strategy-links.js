// Reverzní index pro cross-link mezi indikátory ↔ strategiemi ↔ explainery.
//
// Místo ukládání duplicitních polí (`linked_strategies` v každé kartě) se
// pole `linked_indicators` v strategies.json a explainers.json používá
// jako primární zdroj pravdy. Tato funkce ho otočí — pro daný indikátor
// id vrátí všechny strategie a explainery, které ho odkazují.
//
// Použití (frontend):
//   const links = await loadLinks();
//   links.byIndicator('mortalita_inhosp_ami')
//     // → { strategies: [...], explainers: [...] }

/**
 * @typedef {Object} ReverseIndex
 * @property {(id: string) => { strategies: object[], explainers: object[] }} byIndicator
 * @property {(id: string) => object[]} explainersForStrategy
 * @property {(id: string) => object[]} strategiesForExplainer
 * @property {object[]} allStrategies
 * @property {object[]} allExplainers
 */

/**
 * @param {{ strategiesUrl?: string, explainersUrl?: string, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<ReverseIndex>}
 */
export async function loadLinks(opts = {}) {
  const {
    strategiesUrl = 'data/strategies.json',
    explainersUrl = 'data/explainers.json',
    fetchImpl = globalThis.fetch,
  } = opts;

  const [stratsRes, explsRes] = await Promise.all([
    fetchImpl(strategiesUrl).catch(() => null),
    fetchImpl(explainersUrl).catch(() => null),
  ]);

  const strategies = stratsRes?.ok ? (await stratsRes.json()).strategies ?? [] : [];
  const explainers = explsRes?.ok ? (await explsRes.json()).explainers ?? [] : [];

  return buildIndex(strategies, explainers);
}

/**
 * Pure-function index builder — testovatelný bez fetche.
 * @param {object[]} strategies
 * @param {object[]} explainers
 * @returns {ReverseIndex}
 */
export function buildIndex(strategies, explainers) {
  // Indicator → strategies/explainers
  const byIndicator = new Map(); // id → { strategies: Set, explainers: Set }
  const ensure = (id) => {
    if (!byIndicator.has(id)) byIndicator.set(id, { strategies: [], explainers: [] });
    return byIndicator.get(id);
  };

  for (const s of strategies) {
    for (const ind of s.linked_indicators ?? []) ensure(ind).strategies.push(s);
  }
  for (const e of explainers) {
    for (const ind of e.linked_indicators ?? []) ensure(ind).explainers.push(e);
  }

  // Strategy → explainers (ne-přímé, přes sdílený indikátor)
  const explainersForStrategy = (sid) => {
    const s = strategies.find(x => x.id === sid);
    if (!s) return [];
    const sharedIndicators = new Set(s.linked_indicators ?? []);
    return explainers.filter(e =>
      (e.linked_strategies ?? []).includes(sid)
      || (e.linked_indicators ?? []).some(i => sharedIndicators.has(i))
    );
  };

  // Explainer → strategies (přímé z linked_strategies + tranzitivně přes indikátory)
  const strategiesForExplainer = (eid) => {
    const e = explainers.find(x => x.id === eid);
    if (!e) return [];
    const direct = new Set(e.linked_strategies ?? []);
    const sharedIndicators = new Set(e.linked_indicators ?? []);
    return strategies.filter(s =>
      direct.has(s.id)
      || (s.linked_indicators ?? []).some(i => sharedIndicators.has(i))
    );
  };

  return {
    byIndicator: (id) => byIndicator.get(id) ?? { strategies: [], explainers: [] },
    explainersForStrategy,
    strategiesForExplainer,
    allStrategies: strategies,
    allExplainers: explainers,
  };
}
