#!/usr/bin/env node
// Vygeneruje jednorázový token pro adresný dotazník (pojišťovna, pacientská
// organizace) a uloží do Neonu jeho sha256 hash. Token samotný se vypíše
// jednou, do databáze se nedostane.
//
//   DATABASE_URL=postgres://… node scripts/dotaznik-token.js \
//       --sada rizikovi-pojistenci --kod 111 [--typ pojistovna] \
//       [--platnost-dni 60] [--base https://hspa-cesko.cz/pojistovny.html]
//
// Výstup: URL ve tvaru pojistovny.html?dotaznik=<sada>&token=<token>.
// Typy: pojistovna (výchozí; --kod musí být kód ZP), pacientska_organizace
// (--kod je zkratka organizace, např. NAPO). Veřejnost tokeny nepotřebuje.

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getSql } from '../api/_db.js';
import { hashToken, RESPONDENT_TYPY } from '../api/_dotaznik-validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZP_KODY = ['111', '201', '205', '207', '209', '211', '213'];
const KOD_RE = /^[A-Za-z0-9_.-]{1,40}$/;

export function createToken() {
  return randomBytes(24).toString('base64url'); // 32 znaků, 192 bitů
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

export function tokenUrl(base, sada, token) {
  return `${base}?dotaznik=${encodeURIComponent(sada)}&token=${encodeURIComponent(token)}`;
}

/** Ověří argumenty; vrací { ok, errors, value }. */
export function checkArgs(args, sady) {
  const errors = [];
  const typ = args.typ ?? 'pojistovna';
  if (!RESPONDENT_TYPY.includes(typ) || typ === 'verejnost') errors.push('--typ: pojistovna | pacientska_organizace');
  const sada = typeof args.sada === 'string' ? args.sada : '';
  const def = (sady ?? []).find((s) => s.id === sada);
  if (!def) errors.push(`--sada: neznámá sada (${(sady ?? []).map((s) => s.id).join(', ')})`);
  const kod = typeof args.kod === 'string' ? args.kod : '';
  if (!KOD_RE.test(kod)) errors.push('--kod: 1–40 znaků A–Z, a–z, 0–9, _ . -');
  else if (typ === 'pojistovna' && !ZP_KODY.includes(kod)) errors.push(`--kod: u pojišťovny jeden z ${ZP_KODY.join(', ')}`);
  const dny = args['platnost-dni'] === undefined ? 60 : Number(args['platnost-dni']);
  if (!Number.isInteger(dny) || dny < 1 || dny > 365) errors.push('--platnost-dni: celé číslo 1–365');
  return { ok: errors.length === 0, errors, value: { typ, sada, kod, dny } };
}

export async function insertToken(sql, { sada, typ, kod, dny }, token) {
  return sql`
    insert into dotaznik_token (token_hash, sada_id, respondent_typ, respondent_kod, platny_do)
    values (${hashToken(token)}, ${sada}, ${typ}, ${kod}, now() + (${dny} * interval '1 day'))
    returning id, platny_do`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const defs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-otazky.json'), 'utf8'));
  const chk = checkArgs(args, defs.sady);
  if (!chk.ok) {
    console.error('dotaznik-token: neplatné argumenty:\n - ' + chk.errors.join('\n - '));
    process.exit(2);
  }
  const db = await getSql();
  if (!db.sql) {
    console.error(`dotaznik-token: ${db.error}: ${db.message}`);
    process.exit(1);
  }
  const token = createToken();
  const rows = await insertToken(db.sql, chk.value, token);
  const base = typeof args.base === 'string' ? args.base : 'pojistovny.html';
  console.log(`Token pro ${chk.value.typ} ${chk.value.kod}, sada ${chk.value.sada}, platný do ${rows?.[0]?.platny_do ?? `+${chk.value.dny} dní`}`);
  console.log('Odkaz (zobrazí se jen teď, v databázi je jen hash):');
  console.log(tokenUrl(base, chk.value.sada, token));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('dotaznik-token: selhalo:', err?.message);
    process.exit(1);
  });
}
