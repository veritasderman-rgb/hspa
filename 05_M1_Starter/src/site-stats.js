// Centrální výpočet souhrnných statistik pro celý web.
// Jediný zdroj pravdy pro čísla zobrazovaná v HTML šablonách.
//
// Místo hardcoded "80 indikátorů" v HTML použijte:
//   <span data-stat="totalIndicators">80</span>
//
// applyDataStats() naskenuje DOM a doplní hodnoty automaticky.
//
// Klíče:
//   totalIndicators  — celkový počet indikátorů (všechny rámce)
//   hspaCount        — počet striktních HSPA indikátorů (framework=hspa)
//   monitoringCount  — počet doplňkových monitoring indikátorů (framework=monitoring)
//   frameworkTotal   — celkový počet indikátorů v oficiálním rámci OECD (122)
//   hspaGap          — kolik z 122 zbývá doplnit (frameworkTotal - hspaCount)
//   score            — HSPA skóre 0–100 (good=100, warn=50, bad=0)
//   scoreGood        — počet indikátorů se signal=good
//   scoreWarn        — počet indikátorů se signal=warn
//   scoreBad         — počet indikátorů se signal=bad
//   scoreNeutral     — počet indikátorů se signal=neutral (ne ve výpočtu)
//   oecdScore        — reference (71, OECD průměr)
//
// Architektonický důvod: minimalizovat riziko "tichého stárnutí" čísel
// v copy. Změna v indicators.json → změna v UI bez code change.

const FRAMEWORK_TOTAL = 122;
const OECD_REFERENCE_SCORE = 71;

/**
 * Spočítá HSPA skóre.
 *
 * Pravidla:
 *   - good=100, warn=50, bad=0 → průměr přes všechny "scoreable" indikátory
 *   - Neutral (chybí benchmark) i 'illustrative' verification_status jsou ignorovány
 *   - Pokud `verification_status` chybí (legacy data), bere se to jako "v pořádku"
 *     a indikátor je započten (důležité — bez tohoto by skóre na neoznačených
 *     datech vracelo null a UI by zobrazoval pomlčku).
 *
 * @param {Array<{signal?:string, verification_status?:string}>} indicators
 * @returns {number|null} 0–100 nebo null, pokud žádný indikátor není scoreable
 */
export function computeScore(indicators) {
  if (!Array.isArray(indicators)) return null;
  const scoreable = indicators.filter(i => {
    if (i.verification_status === 'illustrative') return false;
    return i.signal && i.signal !== 'neutral';
  });
  if (scoreable.length === 0) return null;
  const sum = scoreable.reduce((acc, i) => {
    if (i.signal === 'good') return acc + 100;
    if (i.signal === 'warn') return acc + 50;
    return acc;
  }, 0);
  return Math.round(sum / scoreable.length);
}

/**
 * Spočítá rozpad signálů (good/warn/bad/neutral).
 *
 * @param {Array<{signal?:string}>} indicators
 * @returns {{good:number,warn:number,bad:number,neutral:number,scoreable:number}}
 */
export function computeSignalBreakdown(indicators) {
  const out = { good: 0, warn: 0, bad: 0, neutral: 0, scoreable: 0 };
  if (!Array.isArray(indicators)) return out;
  for (const i of indicators) {
    const s = i.signal;
    if (s === 'good' || s === 'warn' || s === 'bad') {
      out[s]++;
      if (i.verification_status !== 'illustrative') out.scoreable++;
    } else if (s === 'neutral') {
      out.neutral++;
    }
  }
  return out;
}

/**
 * Vrátí kompletní sadu site-wide statistik.
 *
 * @param {Object} args
 * @param {Array} args.indicators - z data/indicators.json (pole .indicators)
 * @param {Array} [args.articles] - z data/articles.json (pole .articles), volitelné
 * @returns {Object}
 */
export function getSiteStats({ indicators = [], articles = [] } = {}) {
  const breakdown = computeSignalBreakdown(indicators);
  const score = computeScore(indicators);
  const hspaCount = indicators.filter(i => (i.framework ?? 'hspa') === 'hspa').length;
  const monitoringCount = indicators.filter(i => i.framework === 'monitoring').length;
  const publishedArticles = articles.filter(a => a.published !== false);
  const indicatorSet = new Set();
  publishedArticles.forEach(a => (a.linked_indicators ?? []).forEach(i => indicatorSet.add(i)));

  return {
    totalIndicators: indicators.length,
    hspaCount,
    monitoringCount,
    frameworkTotal: FRAMEWORK_TOTAL,
    hspaGap: Math.max(0, FRAMEWORK_TOTAL - hspaCount),
    score,
    oecdScore: OECD_REFERENCE_SCORE,
    scoreGood: breakdown.good,
    scoreWarn: breakdown.warn,
    scoreBad: breakdown.bad,
    scoreNeutral: breakdown.neutral,
    scoreScoreable: breakdown.scoreable,
    articleCount: publishedArticles.length,
    referencedIndicatorCount: indicatorSet.size,
  };
}

/**
 * Naskenuje DOM, najde elementy s [data-stat="<key>"] a doplní jim text
 * podle vrácených statistik. Volitelně formátuje skóre s breakdown
 * tooltipem (title attribute).
 *
 * @param {Object} stats - výstup getSiteStats()
 * @param {ParentNode} [root=document]
 */
export function applyDataStats(stats, root) {
  if (typeof document === 'undefined') return;
  const scope = root ?? document;
  scope.querySelectorAll('[data-stat]').forEach(el => {
    const key = el.getAttribute('data-stat');
    if (!(key in stats)) return;
    const val = stats[key];
    if (val == null) {
      el.textContent = '—';
      return;
    }
    el.textContent = String(val);
    // .av-counter musí dostat data-value, jinak by nastartovala s 0 a nepřepočítala se
    if (el.classList.contains('av-counter') && Number.isFinite(Number(val))) {
      el.dataset.value = String(val);
      delete el.dataset.avInit;
    }
    // Breakdown tooltip pro skóre
    if (key === 'score' && Number.isFinite(stats.score)) {
      const parts = [
        `${stats.scoreGood ?? 0} dobré (×100)`,
        `${stats.scoreWarn ?? 0} ke sledování (×50)`,
        `${stats.scoreBad ?? 0} kritické (×0)`,
      ];
      if (stats.scoreNeutral) parts.push(`${stats.scoreNeutral} bez benchmarku (mimo výpočet)`);
      el.setAttribute('title', `Průměr ${stats.scoreScoreable ?? 0} indikátorů: ${parts.join(' · ')}`);
    }
  });
}

/**
 * Pohodlný "fetch + apply" pro stránky, které nemají vlastní data loading.
 * Bezpečné v non-browser prostředí (no-op).
 */
export async function loadAndApplyDataStats() {
  if (typeof window === 'undefined') return null;
  try {
    const [indRes, artRes] = await Promise.allSettled([
      fetch('data/indicators.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('data/articles.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
    ]);
    const indData = indRes.status === 'fulfilled' ? indRes.value : null;
    const artData = artRes.status === 'fulfilled' ? artRes.value : null;
    const stats = getSiteStats({
      indicators: indData?.indicators ?? [],
      articles: artData?.articles ?? [],
    });
    applyDataStats(stats);
    return stats;
  } catch {
    return null;
  }
}
