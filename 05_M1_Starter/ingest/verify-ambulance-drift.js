// Hlídání driftu ručně ověřených provozních dob nemocničních ambulancí.
//
// Každý záznam v ingest/mapping/nemocnicni-ambulance.json nese doslovný citát
// (`quote`) ze zdrojové stránky — doklad, podle kterého redakce hodiny zapsala.
// `verified_at` je ale jen datum: říká, kdy člověk stránku četl, ne že od té
// doby platí. Nemocnice hodiny mění bez ohlášení a stránka by je vozila dál.
//
// Tenhle skript proto dělá totéž co drift-check nad data/claims.json, jen nad
// cizími weby: stáhne každou zdrojovou stránku a ověří, že citát je na ní pořád
// DOSLOVNĚ dohledatelný (po normalizaci bílých znaků; elipsa […] dělí citát na
// fragmenty, které musí být na stránce všechny a ve stejném pořadí).
//
// Výsledek se zapisuje do ingest/cache/ambulance_drift.json a transform ho
// propíše do data/pohotovosti.json jako `hours_check` u každé ambulance:
//   ok          citát nalezen — hodiny na webu nemocnice se nezměnily
//   drift       citát zmizel — stránka se změnila a údaj MUSÍ znovu ověřit člověk
//   nedostupne  stránka nešla stáhnout — o driftu nevíme nic (≠ drift!)
//
// Frontend drift ukazuje jako varování na kartě („zdroj se změnil — ověřte
// telefonicky“), validátor jako warning. Nic se nemaže automaticky: strojově
// poznáme jen, ŽE se stránka změnila, ne JAK — nové hodiny musí přečíst člověk.
//
// Spouštění: `npm run verify:ambulance-drift` — týdně v refresh.yml (krok
// pohotovostí, před transformem, aby se výsledek dostal do commitnutých dat).
// Exit 1 při driftu, 0 jinak (nedostupný web není drift).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from './config.js';
import { writeCache, ensureCacheDir } from './lib/cache.js';
import { stripHtml } from './fetchers/ambulance_hodiny.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING_FILE = path.resolve(__dirname, 'mapping', 'nemocnicni-ambulance.json');
export const CACHE_NAME = 'ambulance_drift.json';

/** Sjednotí bílé znaky a interpunkci natolik, aby kosmetická změna šablony nebyla drift. */
export function normalizeForMatch(text) {
  return String(text ?? '')
    .replace(/ /g, ' ')
    // Různé pomlčky a spojovníky na jeden tvar — redakce cituje, co viděla,
    // ale šablona webu si mezi – — - přepíná bez změny významu.
    .replace(/[‐-―−]/g, '-')
    .replace(/[„“”"']/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rozdělí citát na fragmenty podle elipsy […] / [...] / …. */
export function splitQuote(quote) {
  return String(quote ?? '')
    .split(/\s*(?:\[…\]|\[\.\.\.\]|(?<=\s)…(?=\s))\s*/)
    .map(f => normalizeForMatch(f))
    .filter(Boolean);
}

/**
 * Je citát na stránce pořád dohledatelný?
 * Fragmenty musí být přítomné všechny a v pořadí, v jakém je citát uvádí —
 * jinak by „drift“ prošel jen proto, že se čísla přeskládala k jiným dnům.
 * @returns {{ok: true} | {ok: false, missing: string}}
 */
export function quoteFoundIn(pageText, quote) {
  const haystack = normalizeForMatch(pageText);
  let cursor = 0;
  for (const fragment of splitQuote(quote)) {
    const at = haystack.indexOf(fragment, cursor);
    if (at === -1) return { ok: false, missing: fragment };
    cursor = at + fragment.length;
  }
  return { ok: true };
}

async function fetchPage(url, { timeoutMs = 25_000, fetchImpl = globalThis.fetch } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': CONFIG.uzis.user_agent, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ac.signal,
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { html: await res.text() };
  } catch (e) {
    return { error: String(e?.message ?? e).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

/** Zkontroluje jeden záznam proti živé stránce. Exportováno kvůli testům. */
export async function checkEntry(entry, opts = {}) {
  const url = entry?.source?.url;
  if (!url) return { id: entry.id, status: 'drift', detail: 'záznam nemá zdrojové URL' };
  const page = await fetchPage(url, opts);
  if (page.error) return { id: entry.id, status: 'nedostupne', detail: page.error, url };
  const found = quoteFoundIn(stripHtml(page.html), entry.quote);
  if (found.ok) return { id: entry.id, status: 'ok', url };
  return { id: entry.id, status: 'drift', missing: found.missing, url };
}

export async function run(opts = {}) {
  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  const entries = mapping.places ?? [];
  const results = {};
  const concurrency = opts.concurrency ?? 6;
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      const r = await checkEntry(entry, opts);
      results[r.id] = r;
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const checkedAt = new Date().toISOString();
  ensureCacheDir();
  writeCache(CACHE_NAME, { checked_at: checkedAt, results });

  const counts = { ok: 0, drift: 0, nedostupne: 0 };
  for (const r of Object.values(results)) counts[r.status] += 1;
  return { checked_at: checkedAt, results, counts };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run()
    .then(({ results, counts }) => {
      for (const r of Object.values(results).sort((a, b) => a.id.localeCompare(b.id))) {
        const mark = r.status === 'ok' ? '✓' : r.status === 'drift' ? '✗' : '·';
        const extra = r.status === 'drift' && r.missing ? ` — chybí: „${r.missing.slice(0, 70)}…“`
          : r.status === 'nedostupne' ? ` — ${r.detail}` : '';
        console.log(`  ${mark} ${r.id}${extra}`);
      }
      console.log(`[ambulance-drift] ok: ${counts.ok} · drift: ${counts.drift} · nedostupné: ${counts.nedostupne}`);
      console.log('→ ingest/cache/ambulance_drift.json');
      if (counts.drift > 0) {
        console.error('[ambulance-drift] DRIFT — zdrojové stránky se změnily, hodiny musí znovu ověřit člověk.');
        process.exit(1);
      }
    })
    .catch(e => {
      console.error('[ambulance-drift] FAIL:', e.message);
      process.exit(1);
    });
}
