// Centrální konfigurace pro všechny fetchery a transform vrstvu.
// Žádné secrets — používá se v open-source repu.

export const CONFIG = {
  // ÚZIS · NRPZS — REST API (OAS 2.0)
  uzis: {
    nrpzs_base: 'https://nrpzs.uzis.cz/api/v1',
    docs: 'https://nrpzs.uzis.cz/api/doc',
    user_agent: 'ZdraveCesko-HSPA/1.0 (kontakt@example.cz)',
  },

  // ČSÚ · DataStat (Český statistický úřad)
  csu: {
    base: 'https://data.csu.gov.cz',
    docs: 'https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu',
    krok_db: 'https://csu.gov.cz/produkty/databaze-krok-otevrena-data',
  },

  // OECD · SDMX-JSON
  oecd: {
    base: 'https://stats.oecd.org/SDMX-JSON/data',
    dataset_health: 'HEALTH_STAT',
    docs: 'https://data.oecd.org/api/sdmx-json-documentation/',
  },

  // Eurostat · JSON-stat 2.0
  eurostat: {
    base: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data',
    docs: 'https://ec.europa.eu/eurostat/web/main/data/web-services',
  },

  // Cache & retry chování
  cache: {
    dir: 'ingest/cache',
    ttl_hours: 24,
  },
  retry: {
    max_attempts: 3,
    backoff_ms: [2000, 4000, 8000],
  },

  // Globální pauza mezi requesty (rate limiting)
  throttle_ms: 500,
};
