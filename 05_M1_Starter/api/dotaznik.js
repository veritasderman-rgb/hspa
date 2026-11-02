// Vercel serverless function — dotazníky srovnávače pojišťoven (balíček P2.4).
//
// Proč existuje: definice dotazníku je v repu (data/pojistovny-otazky.json),
// odpovědi jdou do Neonu (Postgres). Frontend o databázi neví: POSTuje sem a
// veřejné agregáty čte ze souboru data/pojistovny-dotaznik-agregaty.json,
// který exportuje scripts/export-dotaznik.js.
//
//   POST /api/dotaznik                      uloží odpověď
//        { sada_id, sada_verze, token?, respondent_typ, respondent_kod?, odpovedi }
//   GET  /api/dotaznik?sada=<id>&agregace=1  agregáty pro graf (cache 5 min)
//
// Konfigurace (Vercel → Settings → Environment Variables):
//   DATABASE_URL   povinné — connection string Neon projektu hspa-dotazniky
//
// Bez DATABASE_URL (nebo bez balíčku @neondatabase/serverless) vrací 503
// { error: 'dotaznik-neni-nakonfigurovan' | 'chybi-zavislost' }; nic se
// neukládá a formulář ukáže srozumitelnou hlášku.
//
// Soukromí (GOVERNANCE § 2 bod 5): žádné osobní údaje, IP adresa se do DB
// neukládá. Rate limit drží v paměti instance jen hash IP se solí, která se
// mění s každým startem instance, a po vypršení okna záznam zmizí.

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getSql } from './_db.js';
import { validateOdpoved, hashToken } from './_dotaznik-validate.js';
import { fetchSadaAgregaty } from './_dotaznik-agregace.js';

export const RATE_MAX = 5;                 // odeslání na okno
export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_BODY_CHARS = 64 * 1024;
const MAX_TRACKED_KEYS = 5000;

const SALT = randomBytes(16).toString('hex');
const rateHits = new Map();                // hash IP → [časy odeslání]
const aggCache = new Map();                // sada → { at, data }
let defsCache = null;

/** Posuvné okno: true = povoleno (a započteno), false = limit vyčerpán. */
export function checkRateLimit(key, now = Date.now(), max = RATE_MAX, windowMs = RATE_WINDOW_MS) {
  const hits = (rateHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    rateHits.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  rateHits.set(key, hits);
  if (rateHits.size > MAX_TRACKED_KEYS) {
    for (const [k, v] of rateHits) {
      if (!v.some((t) => now - t < windowMs)) rateHits.delete(k);
    }
    if (rateHits.size > MAX_TRACKED_KEYS) rateHits.clear();
  }
  return { ok: true };
}

export function __resetForTests() {
  rateHits.clear();
  aggCache.clear();
  defsCache = null;
}

function clientKey(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim();
  const ip = fwd || String(req.headers?.['x-real-ip'] ?? '') || String(req.socket?.remoteAddress ?? '') || 'unknown';
  return createHash('sha256').update(SALT + ip).digest('hex');
}

/** Definice sad z repa. Na Vercelu ji do funkce přidává vercel.json (functions.includeFiles). */
export function loadDefs() {
  if (defsCache) return defsCache;
  const url = new URL('../data/pojistovny-otazky.json', import.meta.url);
  defsCache = JSON.parse(readFileSync(url, 'utf8'));
  return defsCache;
}

function parseBody(req) {
  let b = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { return null; }
  }
  return b && typeof b === 'object' && !Array.isArray(b) ? b : null;
}

function fail(res, status, error, message, extra = {}) {
  return res.status(status).json({ ok: false, error, message, ...extra });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return fail(res, 405, 'metoda-neni-povolena', 'Method Not Allowed');
  }
  res.setHeader('Cache-Control', 'no-store');

  const db = await getSql();
  if (!db.sql) return fail(res, db.status ?? 503, db.error, db.message);
  const sql = db.sql;

  let defs;
  try { defs = loadDefs(); } catch (err) {
    console.error('dotaznik: definice sad nejsou k dispozici', err?.message);
    return fail(res, 500, 'definice-nedostupna', 'Dotazník se teď nepodařilo načíst.');
  }
  const findSada = (id) => (defs.sady ?? []).find((s) => s.id === id);

  // ----------------------------------------------------------------- GET agregace
  if (req.method === 'GET') {
    const q = req.query ?? {};
    if (String(q.agregace ?? '') !== '1') return fail(res, 400, 'chybi-agregace', 'Použijte ?sada=<id>&agregace=1.');
    const def = findSada(String(q.sada ?? ''));
    if (!def) return fail(res, 404, 'neznama-sada', 'Neznámá sada.');
    const now = Date.now();
    const hit = aggCache.get(def.id);
    let data = hit && now - hit.at < CACHE_TTL_MS ? hit.data : null;
    if (!data) {
      try {
        data = await fetchSadaAgregaty(sql, def);
      } catch (err) {
        console.error('dotaznik: čtení agregátů selhalo', err?.message);
        return fail(res, 500, 'chyba-databaze', 'Agregáty se teď nepodařilo načíst.');
      }
      aggCache.set(def.id, { at: now, data });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ ok: true, sada: def.id, ...data });
  }

  // ----------------------------------------------------------------- POST odpověď
  const rate = checkRateLimit(clientKey(req));
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return fail(res, 429, 'prilis-mnoho-pozadavku', 'Příliš mnoho odeslání. Zkuste to prosím později.');
  }

  const body = parseBody(req);
  if (!body) return fail(res, 400, 'neplatne-telo', 'Tělo požadavku musí být JSON objekt.');
  if (JSON.stringify(body).length > MAX_BODY_CHARS) return fail(res, 413, 'telo-je-prilis-velke', 'Odpověď je příliš dlouhá.');

  const def = findSada(String(body.sada_id ?? ''));
  if (!def) return fail(res, 404, 'neznama-sada', 'Neznámá sada.');

  const v = validateOdpoved(def, body);
  if (!v.ok) return fail(res, 400, 'neplatna-odpoved', 'Odpovědi se nepodařilo ověřit.', { errors: v.errors });
  const c = v.clean;
  const odpovediJson = JSON.stringify(c.odpovedi);

  try {
    let rows;
    if (c.respondent_typ === 'verejnost') {
      rows = await sql`
        insert into dotaznik_odpoved (sada_id, sada_verze, respondent_typ, respondent_kod, odpovedi)
        values (${c.sada_id}, ${c.sada_verze}, ${'verejnost'}, ${null}, ${odpovediJson}::jsonb)
        returning id`;
    } else {
      // Jedním příkazem: token se označí za použitý jen tehdy, když je platný,
      // nepoužitý a patří k této sadě; odpověď se vloží ve stejném příkazu.
      // Typ respondenta a kód vždy určuje token, ne tělo požadavku.
      rows = await sql`
        with t as (
          update dotaznik_token
             set pouzit_at = now()
           where token_hash = ${hashToken(c.token)}
             and sada_id = ${c.sada_id}
             and pouzit_at is null
             and (platny_do is null or platny_do > now())
          returning id, respondent_typ, respondent_kod
        )
        insert into dotaznik_odpoved (sada_id, sada_verze, respondent_typ, respondent_kod, odpovedi, token_id)
        select ${c.sada_id}, ${c.sada_verze}, t.respondent_typ, t.respondent_kod, ${odpovediJson}::jsonb, t.id
          from t
        returning id`;
    }
    if (c.respondent_typ !== 'verejnost' && (!Array.isArray(rows) || rows.length === 0)) {
      return fail(res, 403, 'neplatny-token', 'Odkaz k dotazníku není platný nebo už byl použit.');
    }
    aggCache.delete(c.sada_id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('dotaznik: uložení odpovědi selhalo', err?.message);
    return fail(res, 500, 'chyba-databaze', 'Odpověď se teď nepodařilo uložit. Zkuste to prosím za chvíli znovu.');
  }
}
