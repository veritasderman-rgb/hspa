// Sdílený echarts choropleth 14 krajů ČR (NUTS-3).
// Používá ho krajský přehled (kraje.js), stránka kolorektálního screeningu
// (kolonoskopie.js) i financování (financovani.js), aby měly jednotné UX mapy.
//
// echarts musí být naloadovaný globálně přes CDN <script> ve stránce.
// Mapa se joinuje na properties.name z data/cz-regions.geojson.
//
// Theme-aware: barvy textů/okrajů se čtou z CSS tokenů (--ink, --rule2, --red…)
// při každém sestavení option a barevné rampy mají světlou i tmavou variantu.
// applyChoropleth() navíc registruje graf k automatickému překreslení při
// přepnutí data-theme (tokenový přepínač webu) — bez toho by mapa po přepnutí
// zůstala ve starých barvách.

import { escapeHtml } from './page-shared.js';

// Kódy NUTS-3 → názvy, které PŘESNĚ sedí na properties.name v geojsonu.
export const REGION_NAME_BY_CODE = {
  CZ010: 'Praha',
  CZ020: 'Středočeský kraj',
  CZ031: 'Jihočeský kraj',
  CZ032: 'Plzeňský kraj',
  CZ041: 'Karlovarský kraj',
  CZ042: 'Ústecký kraj',
  CZ051: 'Liberecký kraj',
  CZ052: 'Královéhradecký kraj',
  CZ053: 'Pardubický kraj',
  CZ063: 'Vysočina',
  CZ064: 'Jihomoravský kraj',
  CZ071: 'Olomoucký kraj',
  CZ072: 'Zlínský kraj',
  CZ080: 'Moravskoslezský kraj',
};

let _mapRegistered = false;

/** Zaregistruje geojson krajů do echarts pod názvem 'cz-regions' (idempotentně). */
export function registerCzMap(geojson) {
  if (_mapRegistered) return true;
  if (typeof echarts === 'undefined') return false;
  echarts.registerMap('cz-regions', geojson);
  _mapRegistered = true;
  return true;
}

export function formatVal(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  // České formátování: mezera mezi tisíci, desetinná čárka
  const maxDecimals = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: maxDecimals });
}

export function formatValShort(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const maxDecimals = Math.abs(n) >= 100 ? 0 : 1;
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: maxDecimals });
}

/** True, když je aktivní tmavý režim (tokenový přepínač data-theme). */
export function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * Přečte designové tokeny webu za běhu — mapa tak drží krok s CSS bez
 * duplikace hodnot. Fallbacky odpovídají světlé paletě ze styles.css.
 */
function themeTokens() {
  const fallback = { ink: '#1f1a14', inkMut: 'rgba(31,26,20,0.66)', paper: '#fbf8f1', red: '#b8361e' };
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return fallback;
  const cs = getComputedStyle(document.documentElement);
  const read = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
  return {
    ink: read('--ink', fallback.ink),
    inkMut: read('--ink-mut', fallback.inkMut),
    paper: read('--paper', fallback.paper),
    red: read('--red', fallback.red),
  };
}

// Barevné rampy choroplethu. Světlá varianta = pastely s tmavým inkoustem,
// tmavá = hluboké tóny se světlým inkoustem — aby popisky (var(--ink))
// zůstaly čitelné v obou režimech.
const RAMPS = {
  light: {
    good: ['#FCE8E6', '#FFF7E0', '#E6F4EA', '#1F7A1F'],
    context: ['#FFF4E6', '#E2E8F0', '#E0E7FF'],
  },
  dark: {
    good: ['#5a231a', '#4a3b1c', '#26401f', '#4f9c3a'],
    context: ['#4a3b1c', '#3a3630', '#28304d'],
  },
};

/**
 * Sestaví echarts `option` pro choropleth krajů.
 * @param {{regions:Array<{code:string,value:number}>, country_avg?:number,
 *          unit?:string, direction?:string, name?:string}} dataset
 */
export function buildChoroplethOption(dataset) {
  const direction = dataset.direction || 'higher_is_better';
  const isContextDependent = direction === 'context_dependent';
  const betterHigher = direction !== 'lower_is_better';
  const unit = dataset.unit || '';
  const avg = dataset.country_avg;
  const dark = isDarkTheme();
  const tok = themeTokens();
  const ramp = RAMPS[dark ? 'dark' : 'light'];

  const data = (dataset.regions || []).map(r => ({
    name: REGION_NAME_BY_CODE[r.code] || r.code,
    value: r.value,
    code: r.code,
  }));

  const values = data.map(x => x.value).filter(v => Number.isFinite(v));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  // Barevné schéma: zelená = lépe, červená = hůře; context_dependent neutrální.
  const inRange = isContextDependent
    ? { color: ramp.context }
    : betterHigher
      ? { color: ramp.good }
      : { color: [...ramp.good].reverse() };

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tok.ink,
      borderWidth: 0,
      textStyle: { color: tok.paper, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      formatter(params) {
        const r = params.data;
        if (!r) return escapeHtml(params.name);
        const diff = avg != null && avg !== 0 ? ((r.value - avg) / avg) * 100 : null;
        const diffStr = diff != null
          ? `<br/>${diff >= 0 ? '+' : ''}${diff.toFixed(1)} % od průměru ČR`
          : '';
        return `<strong>${escapeHtml(params.name)}</strong><br/>` +
               `${formatVal(r.value)} ${escapeHtml(unit)}${diffStr}`;
      },
    },
    visualMap: {
      type: 'continuous',
      min,
      max: max === min ? min + 1 : max,
      left: 'left',
      bottom: 12,
      calculable: true,
      inRange,
      text: isContextDependent
        ? ['vyšší', 'nižší']
        : betterHigher ? ['lépe', 'hůře'] : ['hůře', 'lépe'],
      textStyle: { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: tok.inkMut },
      formatter(v) { return formatVal(v) + ' ' + unit; },
    },
    series: [{
      name: dataset.name || '',
      type: 'map',
      map: 'cz-regions',
      roam: false,
      // Praha je enkláva Středočeského — bez selectedMode ať klik nezanechává
      // trvalý výběr; hover/emphasis stačí (viz díra v geojsonu).
      selectedMode: false,
      label: {
        show: true,
        formatter(params) {
          const r = params.data;
          return r ? formatValShort(r.value) : '';
        },
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        color: tok.ink,
        textShadowColor: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)',
        textShadowBlur: 2,
      },
      itemStyle: { borderColor: tok.ink, borderWidth: 0.8 },
      emphasis: {
        itemStyle: { borderWidth: 2, borderColor: tok.red },
        label: { color: tok.red },
      },
      data,
    }],
  };
}

/* ── Automatické překreslení při přepnutí tématu ─────────────────────────
   Registr chart → poslední dataset. Jediný MutationObserver sleduje
   data-theme na <html>; při změně se všem živým grafům přestaví option
   (barvy se přečtou znovu). Zaniklé grafy (isDisposed) se z registru
   uklidí. */

const _themedCharts = new Map(); // chart -> dataset
let _themeObserver = null;

function ensureThemeObserver() {
  if (_themeObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  _themeObserver = new MutationObserver(() => {
    for (const [chart, dataset] of _themedCharts) {
      if (!chart || (typeof chart.isDisposed === 'function' && chart.isDisposed())) {
        _themedCharts.delete(chart);
        continue;
      }
      chart.setOption(buildChoroplethOption(dataset), true);
    }
  });
  _themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/**
 * Nastaví grafu choropleth option A zaregistruje ho k překreslení při
 * přepnutí světlý/tmavý režim. Preferované API pro stránky (místo přímého
 * chart.setOption(buildChoroplethOption(...))).
 */
export function applyChoropleth(chart, dataset) {
  if (!chart) return;
  chart.setOption(buildChoroplethOption(dataset), true);
  _themedCharts.set(chart, dataset);
  ensureThemeObserver();
}
