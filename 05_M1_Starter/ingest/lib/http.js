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
 *   parse?: 'json'|'text',
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
    'Accept': parse === 'json' ? 'application/json' : 'text/plain,*/*',
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
