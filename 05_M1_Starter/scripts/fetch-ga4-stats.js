// scripts/fetch-ga4-stats.js
//
// Fetches aggregated stats from GA4 Data API and writes data/analytics-public.json.
// Spouštěno přes GitHub Actions (cron 06:15 UTC).
//
// Required env:
//   GA_SERVICE_ACCOUNT_KEY — JSON klíč service accountu (jako string)
//   GA_PROPERTY_ID         — numeric GA4 property ID
//
// Optional env:
//   GA_PERIOD_DAYS         — kolik dnů zpět (default 7)
//   GA_OUTPUT_PATH         — kam zapsat output (default data/analytics-public.json)
//
// Setup kroky:
//   1) Google Cloud Console → vytvořit Service Account
//   2) Stáhnout JSON klíč → uložit do GitHub Secret GA_SERVICE_ACCOUNT_KEY
//   3) V GA Admin → Account Access Management → přidat sa-email jako Viewer
//   4) Property ID najít v GA Admin → Property Settings
//
// LOCAL TESTING:
//   GA_SERVICE_ACCOUNT_KEY="$(cat ./sa-key.json)" GA_PROPERTY_ID=12345 npm run fetch:ga4
//
// V CI bez secrets script tiše skončí success a nezmění data — zabraňuje
// crashloopu workflow na PRs z forků a v early-stage období.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OUTPUT_PATH = process.env.GA_OUTPUT_PATH
  ?? path.join(ROOT, 'data', 'analytics-public.json');
const PERIOD_DAYS = parseInt(process.env.GA_PERIOD_DAYS ?? '7', 10);
const TRAFFIC_TREND_DAYS = 30;

function isoDateNDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function logInfo(msg, ...rest) {
  console.log(`[ga4-stats] ${msg}`, ...rest);
}
function logWarn(msg, ...rest) {
  console.warn(`[ga4-stats] WARN: ${msg}`, ...rest);
}

/**
 * Verify configuration. Returns null (= skip) when running in CI without
 * secrets — explicitly NOT failing because:
 *   - PRs z forků nemají access do secrets
 *   - V early-stage GA Property ID a Service Account ještě nemusí být nastavené
 *
 * @returns {{ propertyId: string, credentials: object } | null}
 */
function loadConfig() {
  const key = process.env.GA_SERVICE_ACCOUNT_KEY;
  const propertyId = process.env.GA_PROPERTY_ID;

  if (!key || !propertyId) {
    logWarn('GA_SERVICE_ACCOUNT_KEY nebo GA_PROPERTY_ID chybí — script se přeskočí.');
    logWarn('Pro setup viz scripts/fetch-ga4-stats.js header comment.');
    return null;
  }

  let credentials;
  try {
    credentials = JSON.parse(key);
  } catch (err) {
    throw new Error(`GA_SERVICE_ACCOUNT_KEY není validní JSON: ${err.message}`);
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('GA_SERVICE_ACCOUNT_KEY chybí client_email nebo private_key.');
  }

  return { propertyId, credentials };
}

/**
 * Pomocná funkce pro běh GA4 runReport přes @google-analytics/data SDK.
 * Vrací rows array. Defenzivně catch error a vrací prázdné pole — jeden
 * neúspěšný dotaz nesmí zabít celý refresh.
 */
async function runReport(client, propertyId, request) {
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      ...request,
    });
    return response.rows ?? [];
  } catch (err) {
    logWarn(`GA4 query failed (dimensions=${(request.dimensions ?? []).map(d => d.name).join(',')}): ${err.message}`);
    return [];
  }
}

async function fetchAll(client, propertyId) {
  const from = isoDateNDaysAgo(PERIOD_DAYS);
  const to = isoDateNDaysAgo(0);
  const trendFrom = isoDateNDaysAgo(TRAFFIC_TREND_DAYS);

  logInfo(`Period: ${from} → ${to} (${PERIOD_DAYS} days)`);

  // Top indikátory podle eventu indicator_click (Úroveň 1)
  const indicatorRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'customEvent:indicator_id' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'indicator_click' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 10,
  });

  // Top články podle page_view filtrovaného na /clanek-*
  const articleRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'userEngagementDuration' },
      { name: 'totalUsers' },
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'BEGINS_WITH', value: '/clanek-' },
      },
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  });

  // Top glossary termy z eventu glossary_term_open
  const termRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'customEvent:term' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'glossary_term_open' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 10,
  });

  // Traffic sources (sessionSource / sessionMedium)
  const sourceRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    limit: 10,
  });

  // Share breakdown (Úroveň 2)
  const shareRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'customEvent:channel' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'share_click' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 6,
  });

  // External source clicks (Úroveň 1)
  const externalRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'customEvent:source' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'external_source_click' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 10,
  });

  // Daily trend (30 days)
  const trendRows = await runReport(client, propertyId, {
    dateRanges: [{ startDate: trendFrom, endDate: to }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'totalUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  return {
    from,
    to,
    indicatorRows,
    articleRows,
    termRows,
    sourceRows,
    shareRows,
    externalRows,
    trendRows,
  };
}

function shapeOutput({ from, to, indicatorRows, articleRows, termRows, sourceRows, shareRows, externalRows, trendRows }) {
  // Helper: získá string z prvního dimensionValue, číslo z první metricValue
  const dimVal = (row, i = 0) => row.dimensionValues?.[i]?.value ?? null;
  const metVal = (row, i = 0) => {
    const v = row.metricValues?.[i]?.value;
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    period: { from, to, days: PERIOD_DAYS },
    note: 'Agregovaná statistika z Google Analytics 4. Žádné osobní údaje. Generováno GitHub Action cronem každý den v 06:15 UTC.',

    top_indicators: indicatorRows
      .filter(r => dimVal(r))
      .map(r => ({ id: dimVal(r), clicks: metVal(r) ?? 0 })),

    top_articles: articleRows
      .filter(r => dimVal(r))
      .map(r => {
        const slug = dimVal(r).replace(/^\//, '').replace(/\.html$/, '');
        const views = metVal(r, 0) ?? 0;
        const engagement = metVal(r, 1) ?? 0;
        return {
          slug,
          views,
          avg_engagement_s: views > 0 ? Math.round(engagement / views) : 0,
          users: metVal(r, 2) ?? 0,
        };
      }),

    top_glossary_terms: termRows
      .filter(r => dimVal(r))
      .map(r => ({ term: dimVal(r), opens: metVal(r) ?? 0 })),

    traffic_sources: sourceRows
      .filter(r => dimVal(r))
      .map(r => ({
        source: dimVal(r, 0),
        medium: dimVal(r, 1),
        users: metVal(r) ?? 0,
      })),

    share_breakdown: shareRows
      .filter(r => dimVal(r))
      .map(r => ({ channel: dimVal(r), count: metVal(r) ?? 0 })),

    external_sources: externalRows
      .filter(r => dimVal(r))
      .map(r => ({ source: dimVal(r), clicks: metVal(r) ?? 0 })),

    traffic_trend_30d: trendRows
      .filter(r => dimVal(r))
      .map(r => {
        // GA4 vrací YYYYMMDD ve formátu '20260529'
        const raw = dimVal(r);
        const iso = raw && raw.length === 8
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw;
        return { date: iso, users: metVal(r) ?? 0 };
      }),
  };
}

async function main() {
  const config = loadConfig();
  if (!config) {
    // Žádná konfigurace — skip s exit 0, nezhroutí workflow
    logInfo('Skipping refresh (no credentials). To enable, set GA_SERVICE_ACCOUNT_KEY and GA_PROPERTY_ID.');
    process.exit(0);
  }

  // Dynamic import — @google-analytics/data je optional dep
  let BetaAnalyticsDataClient;
  try {
    const sdk = await import('@google-analytics/data');
    BetaAnalyticsDataClient = sdk.BetaAnalyticsDataClient;
  } catch (err) {
    throw new Error(`@google-analytics/data package not installed. Run: npm install --save @google-analytics/data\n${err.message}`);
  }

  const client = new BetaAnalyticsDataClient({ credentials: config.credentials });

  logInfo(`Fetching GA4 stats for property ${config.propertyId}...`);
  const raw = await fetchAll(client, config.propertyId);
  const output = shapeOutput(raw);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  logInfo(`Wrote ${OUTPUT_PATH}`);
  logInfo(`Summary: ${output.top_indicators.length} indicators, ${output.top_articles.length} articles, ${output.top_glossary_terms.length} terms, ${output.traffic_trend_30d.length} trend points`);
}

// Run only when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[ga4-stats] FATAL:', err);
    process.exit(1);
  });
}

// Exports for tests
export { isoDateNDaysAgo, shapeOutput, loadConfig };
