// HTTP utility: fetch s retry, exponential backoff a auditním logem.
// Sdílené pro všechny fetchery (M2 NRPZS, M3 ČSÚ, M4 OECD/Eurostat).

import { CONFIG } from '../config.js';
import { appendAudit } from './audit.js';

export class HttpError extends Error {
  constructor(message, { status, url, attempts } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.attempts = attempts;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch s retry + exponential backoff. Retry pouze pro síťové chyby a 5xx/429.
 * 4xx (kromě 429) se nezkouší znovu — chyba na naší straně.
 *
 * @param {string} url
 * @param {{
 *   headers?: Record<string,string>,
 *   timeoutMs?: number,
 *   parse?: 'json'|'text'|'buffer',
 *   fetchImpl?: typeof fetch,
 *   sleepImpl?: (ms:number)=>Promise<void>,
 * }} [options]
 * @returns {Promise<any>}
 */
export async function fetchWithRetry(url, options = {}) {
  const {
    headers = {},
    timeoutMs = 30_000,
    parse = 'json',
    fetchImpl = globalThis.fetch,
    sleepImpl = sleep,
  } = options;

  const backoff = CONFIG.retry.backoff_ms;
  const maxAttempts = CONFIG.retry.max_attempts;
  const mergedHeaders = {
    'User-Agent': CONFIG.uzis.user_agent,
    'Accept': parse === 'json' ? 'application/json' : parse === 'buffer' ? '*/*' : 'text/plain,*/*',
    ...headers,
  };

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(url, { headers: mergedHeaders, signal: controller.signal });
      clearTimeout(timer);

      const elapsedMs = Date.now() - startedAt;
      await appendAudit({ url, status: res.status, attempt, elapsedMs });

      if (res.ok) {
        if (parse === 'buffer') return Buffer.from(await res.arrayBuffer());
        return parse === 'json' ? await res.json() : await res.text();
      }

      const retriable = res.status === 429 || (res.status >= 500 && res.status < 600);
      if (!retriable || attempt === maxAttempts) {
        throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status, url, attempts: attempt });
      }
      lastError = new HttpError(`HTTP ${res.status}`, { status: res.status, url, attempts: attempt });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof HttpError && (err.status < 500 && err.status !== 429)) throw err;
      lastError = err;
      await appendAudit({ url, status: err.status ?? 'ERR', attempt, error: err.message });
      if (attempt === maxAttempts) break;
    }

    await sleepImpl(backoff[attempt - 1] ?? backoff[backoff.length - 1]);
  }

  throw lastError instanceof HttpError
    ? lastError
    : new HttpError(`Network failure for ${url}: ${lastError?.message ?? 'unknown'}`, { url, attempts: maxAttempts });
}

/**
 * GET přes HTTP/2 (node:http2). Některé servery (OECD sdmx.oecd.org) vracejí
 * na velké odpovědi přes HTTP/1.1 (undici/fetch) chybu 500, zatímco přes
 * HTTP/2 (curl) fungují — tohle je ekvivalent `curl --http2`.
 *
 * @param {string} url
 * @param {{ headers?: Record<string,string>, timeoutMs?: number, parse?: 'json'|'text' }} [options]
 * @returns {Promise<any>}
 */
export async function fetchHttp2(url, options = {}) {
  const { headers = {}, timeoutMs = 120_000, parse = 'json' } = options;
  const { connect, constants } = await import('node:http2');
  const zlib = await import('node:zlib');
  const u = new URL(url);

  return new Promise((resolve, reject) => {
    const client = connect(u.origin);
    const timer = setTimeout(() => {
      client.close();
      reject(new HttpError(`HTTP/2 timeout for ${url}`, { url }));
    }, timeoutMs);
    client.on('error', err => { clearTimeout(timer); reject(err); });

    // HTTP/2 zakazuje velká písmena v názvech hlaviček (node vyhodí
    // ERR_INVALID_HTTP_TOKEN) — volající píše „Accept-Language" jako u fetch(),
    // proto normalizujeme. Bez toho by fallback na HTTP/2 spadl dřív, než se
    // vůbec dostane k požadavku.
    const lowerHeaders = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const req = client.request({
      [constants.HTTP2_HEADER_METHOD]: 'GET',
      [constants.HTTP2_HEADER_PATH]: u.pathname + u.search,
      'user-agent': CONFIG.uzis.user_agent,
      accept: '*/*',
      ...lowerHeaders,
    });

    let status = 0;
    let encoding = '';
    const chunks = [];
    req.on('response', h => {
      status = Number(h[constants.HTTP2_HEADER_STATUS]);
      encoding = h['content-encoding'] ?? '';
    });
    req.on('data', c => chunks.push(c));
    req.on('error', err => { clearTimeout(timer); client.close(); reject(err); });
    req.on('end', async () => {
      clearTimeout(timer);
      client.close();
      await appendAudit({ url, status, attempt: 1, transport: 'http2' });
      if (status < 200 || status >= 300) {
        reject(new HttpError(`HTTP ${status} for ${url} (http2)`, { status, url, attempts: 1 }));
        return;
      }
      let buf = Buffer.concat(chunks);
      try {
        if (encoding === 'gzip') buf = zlib.gunzipSync(buf);
        else if (encoding === 'deflate') buf = zlib.inflateSync(buf);
        else if (encoding === 'br') buf = zlib.brotliDecompressSync(buf);
        const text = buf.toString('utf8');
        resolve(parse === 'json' ? JSON.parse(text) : text);
      } catch (err) {
        reject(err);
      }
    });
    req.end();
  });
}
