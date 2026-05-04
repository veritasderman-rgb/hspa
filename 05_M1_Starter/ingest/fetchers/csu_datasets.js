// Registry ČSÚ datasetů pro M3.
// Každá položka definuje:
//   id        – náš HSPA indicator id (musí mít odpovídající metodickou kartu)
//   name      – lidský popis
//   primary   – DataStat JSON API: { kind:'datastat', url, query?, parser? }
//   fallback  – CSV z KROK databáze: { kind:'csv', url, mapping }
//
// URL adresy primary endpointů jsou nejlepší aktuální odhad podle
// dokumentace https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu
// Při prvním reálném ostrém běhu může být potřeba doladit konkrétní
// dataset-ID/parametry — kód je proto napsaný defenzivně a parser zkouší
// několik tvarů odpovědi.

import { CONFIG } from '../config.js';

const API = `${CONFIG.csu.base}${CONFIG.csu.api_path}`;

export const CSU_DATASETS = [
  {
    id: 'nadeje_doziti_total',
    name: 'Naděje dožití při narození (oba pohlaví)',
    primary: {
      kind: 'datastat',
      url: `${API}/DEM01-NADE`,
      query: { uzemi: 'CZ0', pohlavi: 'T', vek: 'V0' },
    },
    fallback: {
      kind: 'csv',
      url: 'https://csu.gov.cz/produkty/zemreli-nadeje-doziti-priciny-smrti-data',
      mapping: { year: 'rok', region: 'uzemi_kod', sex: 'pohlavi_kod', value: 'hodnota' },
      filter: { sex: 'T', region: 'CZ0' },
    },
  },
  {
    id: 'umrtnost_kraje',
    name: 'Hrubá míra úmrtnosti po krajích',
    primary: {
      kind: 'datastat',
      url: `${API}/DEM01-UMR`,
      query: { uzemi: 'KRAJ', pohlavi: 'T' },
    },
    fallback: {
      kind: 'csv',
      url: 'https://csu.gov.cz/produkty/zemreli-data',
      mapping: { year: 'rok', region: 'uzemi_kod', sex: 'pohlavi_kod', value: 'hodnota' },
      filter: { sex: 'T' },
    },
  },
];

export const CSU_INDICATOR_IDS = CSU_DATASETS.map(d => d.id);
