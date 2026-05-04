// File-based TTL cache pro raw odpovědi z API.
// Sdílené pro všechny fetchery.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

export function cachePath(name) {
  return path.resolve(ROOT, CONFIG.cache.dir, name);
}

export function ensureCacheDir() {
  const dir = path.resolve(ROOT, CONFIG.cache.dir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Načti cachovaný JSON, pokud je čerstvý (mladší než TTL).
 * @param {string} name — relativní jméno v cache adresáři, např. 'nrpzs_raw.json'
 * @param {number} [ttlHours] — override TTL
 * @returns {any|null}
 */
export function readCacheIfFresh(name, ttlHours = CONFIG.cache.ttl_hours) {
  const file = cachePath(name);
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  const ageMs = Date.now() - stat.mtimeMs;
  if (ageMs > ttlHours * 3_600_000) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function writeCache(name, data) {
  ensureCacheDir();
  fs.writeFileSync(cachePath(name), JSON.stringify(data, null, 2));
}
