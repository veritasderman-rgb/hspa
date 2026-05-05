// Gzip utility — stream decode `.csv.gz` přes node:zlib.
// Použito ÚZIS NZIS fetcherem (NRH ~100 MB rozbalené, OOM-safe stream parsing).

import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

/**
 * Stáhne gzipped resource a stream-em ho dekomprimuje do souboru.
 * @param {string} url
 * @param {string} destPath — kam uložit rozbalený soubor (cache)
 * @param {{ headers?: Record<string,string>, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{ bytes: number }>} — velikost rozbaleného souboru
 */
export async function downloadAndGunzipToFile(url, destPath, opts = {}) {
  const { headers = {}, fetchImpl = globalThis.fetch } = opts;
  const res = await fetchImpl(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  if (!res.body) throw new Error(`Empty body for ${url}`);

  const out = fs.createWriteStream(destPath);
  const nodeStream = Readable.fromWeb(res.body);
  await pipeline(nodeStream, createGunzip(), out);
  const stat = fs.statSync(destPath);
  return { bytes: stat.size };
}

/**
 * Pro malé soubory (testy) — gunzip Buffer → string.
 * @param {Buffer|Uint8Array} buf
 * @returns {Promise<string>}
 */
export async function gunzipBufferToString(buf) {
  const { gunzip } = await import('node:zlib');
  return new Promise((resolve, reject) => {
    gunzip(buf, (err, out) => (err ? reject(err) : resolve(out.toString('utf8'))));
  });
}
