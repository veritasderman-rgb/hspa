// Audit log: append-only záznam každého HTTP volání pro pozdější diagnostiku.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

let writeQueue = Promise.resolve();

export async function appendAudit(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  writeQueue = writeQueue.then(async () => {
    const dir = path.resolve(ROOT, CONFIG.cache.dir);
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, 'audit.log'), line);
  }).catch(() => {});
  return writeQueue;
}
