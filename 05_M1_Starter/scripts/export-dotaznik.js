#!/usr/bin/env node
// Export agregátů dotazníků z Neonu do data/pojistovny-dotaznik-agregaty.json.
//
//   DATABASE_URL=postgres://… node scripts/export-dotaznik.js
//
// Frontend databázi nezná: stránka čte jen tenhle soubor. Skript používá
// stejný getSql() jako api/dotaznik.js (a stejná pravidla zveřejnění z
// api/_dotaznik-agregace.js: jen otázky s nabídkou, žádné volné texty,
// sady s méně než 3 odpověďmi se skryjí).
//
// Bez DATABASE_URL (nebo bez balíčku @neondatabase/serverless) vypíše hlášku,
// skončí s kódem 1 a soubor nepřepíše. Když se agregáty od posledního exportu
// nezměnily, soubor se také nepřepisuje (žádný šum v gitu kvůli generated_at).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSql } from '../api/_db.js';
import { fetchSadaAgregaty } from '../api/_dotaznik-agregace.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OTAZKY_FILE = path.join(ROOT, 'data', 'pojistovny-otazky.json');
export const OUT_FILE = path.join(ROOT, 'data', 'pojistovny-dotaznik-agregaty.json');
export const VERSION = '1.0.0';

/** Sestaví celý dokument. `sql` je tagged-template klient (Neon nebo test). */
export async function buildExport(sql, defs, now = new Date()) {
  const sady = {};
  for (const def of defs.sady ?? []) {
    if (def.kanal === 'interni') continue; // interní hodnoticí list nemá odpovědi v databázi
    sady[def.id] = await fetchSadaAgregaty(sql, def);
  }
  return { version: VERSION, generated_at: now.toISOString(), sady };
}

const stable = (o) => JSON.stringify({ ...o, generated_at: null });

/** Zapíše soubor, jen když se obsah (mimo generated_at) změnil. Vrací 'zapsano' | 'beze-zmeny'. */
export function writeIfChanged(doc, file = OUT_FILE) {
  if (fs.existsSync(file)) {
    try {
      if (stable(JSON.parse(fs.readFileSync(file, 'utf8'))) === stable(doc)) return 'beze-zmeny';
    } catch { /* poškozený soubor se přepíše */ }
  }
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return 'zapsano';
}

async function main() {
  const db = await getSql();
  if (!db.sql) {
    console.error(`export-dotaznik: ${db.error}: ${db.message}`);
    console.error('Soubor data/pojistovny-dotaznik-agregaty.json zůstal beze změny.');
    process.exit(1);
  }
  const defs = JSON.parse(fs.readFileSync(OTAZKY_FILE, 'utf8'));
  const doc = await buildExport(db.sql, defs);
  const state = writeIfChanged(doc);
  const n = Object.values(doc.sady).reduce((s, x) => s + x.pocet_odpovedi, 0);
  console.log(`export-dotaznik: ${state} (${Object.keys(doc.sady).length} sad, ${n} odpovědí) → ${path.relative(ROOT, OUT_FILE)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('export-dotaznik: selhalo:', err?.message);
    process.exit(1);
  });
}
