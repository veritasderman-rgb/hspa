// Sdílený echarts choropleth 14 krajů ČR (NUTS-3).
// Používá ho krajský přehled (kraje.js) i stránka kolorektálního screeningu
// (kolonoskopie.js), aby měly jednotné UX mapy.
//
// echarts musí být naloadovaný globálně přes CDN <script> ve stránce.
// Mapa se joinuje na properties.name z data/cz-regions.geojson.

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
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export function formatValShort(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

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
    ? { color: ['#FFF4E6', '#E2E8F0', '#E0E7FF'] }
    : betterHigher
      ? { color: ['#FCE8E6', '#FFF7E0', '#E6F4EA', '#1F7A1F'] }
      : { color: ['#1F7A1F', '#E6F4EA', '#FFF7E0', '#FCE8E6'] };

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
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
      textStyle: { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
      formatter(v) { return formatVal(v) + ' ' + unit; },
    },
    series: [{
      name: dataset.name || '',
      type: 'map',
      map: 'cz-regions',
      roam: false,
      label: {
        show: true,
        formatter(params) {
          const r = params.data;
          return r ? formatValShort(r.value) : '';
        },
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        color: '#1f1a14',
      },
      itemStyle: { borderColor: '#1f1a14', borderWidth: 0.8 },
      emphasis: {
        itemStyle: { borderWidth: 2, borderColor: '#b8361e' },
        label: { color: '#b8361e' },
      },
      data,
    }],
  };
}
