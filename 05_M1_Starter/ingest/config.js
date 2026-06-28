// Centrální konfigurace pro všechny fetchery a transform vrstvu.
// Žádné secrets — používá se v open-source repu.

export const CONFIG = {
  // ÚZIS · NRPZS — REST API (OAS 2.0) je nespolehlivé (503/timeout, „fetch failed"
  // v GitHub Actions). Primárně čteme stabilní open-data CSV distribuci (gov.cz),
  // kterou ÚZIS aktualizuje měsíčně; nrpzs_base/docs ponecháno jen pro referenci.
  uzis: {
    nrpzs_base: 'https://nrpzs.uzis.cz/api/v1',
    nrpzs_opendata_csv: 'https://datanzis.uzis.gov.cz/data/NR-01-NRPZS/NR-01-06/Otevrena-data-NR-01-06-nrpzs-mista-poskytovani-zdravotnich-sluzeb.csv',
    docs: 'https://nrpzs.uzis.cz/api/doc',
    user_agent: 'ZdraveCesko-HSPA/1.0 (kontakt@example.cz)',
  },

  // ČSÚ · DataStat (Český statistický úřad)
  csu: {
    base: 'https://data.csu.gov.cz',
    api_path: '/api/v1/data',
    docs: 'https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu',
    krok_db: 'https://csu.gov.cz/produkty/databaze-krok-otevrena-data',
    user_agent: 'ZdraveCesko-HSPA/1.0 (kontakt@example.cz)',
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
    // HSPA_CACHE_DIR: override pro testy — unit testy fetcherů volají writeCache
    // a bez izolace by přepisovaly reálné agregáty (viz docs/traps.md).
    dir: process.env.HSPA_CACHE_DIR ?? 'ingest/cache',
    ttl_hours: 24,
  },
  retry: {
    max_attempts: 3,
    backoff_ms: [2000, 4000, 8000],
  },

  // Globální pauza mezi requesty (rate limiting)
  throttle_ms: 500,
};
