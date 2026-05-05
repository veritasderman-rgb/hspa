// SDMX-JSON parser pro OECD Stats (legacy stats.oecd.org formát).
// Reference: https://sdmx.org/wp-content/uploads/SDMX-JSON-spec.pdf
//
// Struktura odpovědi:
//   structure.dimensions.series[]  — dimenze, které drží konstantní hodnotu pro celou sérii (LOCATION, VAR, ...)
//   structure.dimensions.observation[] — typicky TIME_PERIOD
//   dataSets[0].series             — { "0:1:0": { observations: { "0": [value, ...] } } }
//
// Klíč série je "i:j:k:..." kde čísla jsou indexy do values dimenzí ve series.
// Klíč observace je "0", "1", ... což je index do values dimenzí v observation.

/**
 * Parsuj SDMX-JSON odpověď na ploché observace.
 * Každá observace má klíče = id série dimenzí + 'time' + 'value'.
 * @param {any} raw
 * @returns {Array<Record<string, any>>}
 */
export function parseSdmxJson(raw) {
  const dataSet = raw?.dataSets?.[0];
  const seriesDims = raw?.structure?.dimensions?.series ?? [];
  const obsDims = raw?.structure?.dimensions?.observation ?? [];
  if (!dataSet || !raw?.structure) return [];

  const seriesEntries = Object.entries(dataSet.series ?? {});
  const out = [];

  for (const [seriesKey, serie] of seriesEntries) {
    const tags = decodeKey(seriesKey, seriesDims);
    for (const [obsKey, obsValue] of Object.entries(serie.observations ?? {})) {
      const obsTags = decodeKey(obsKey, obsDims);
      const value = Array.isArray(obsValue) ? obsValue[0] : obsValue;
      out.push({
        ...tags,
        ...obsTags,
        time: obsTags.TIME_PERIOD ?? obsTags.TIME ?? null,
        value: value == null ? null : Number(value),
      });
    }
  }
  return out;
}

function decodeKey(key, dims) {
  if (!key) return {};
  const parts = key.split(':').map(Number);
  const tags = {};
  dims.forEach((d, i) => {
    const valueDef = d.values?.[parts[i]];
    if (valueDef?.id != null) tags[d.id] = valueDef.id;
  });
  return tags;
}

/**
 * Spočti aritmetický průměr přes pole čísel (ignoruje null/NaN).
 */
export function average(values) {
  const xs = values.filter(v => Number.isFinite(v));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
