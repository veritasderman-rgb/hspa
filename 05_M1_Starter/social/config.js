// Sdílená konfigurace distribučního systému.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SOCIAL_DIR = __dirname;
export const ROOT = resolve(__dirname, '..');                 // 05_M1_Starter/
export const OUT_DIR = resolve(__dirname, 'out');
export const STATE_PATH = resolve(__dirname, 'state/last-run.json');
export const FONTS_DIR = resolve(__dirname, 'assets/fonts');

// Kanonická doména pro odkazy v příspěvcích.
export const SITE = 'https://skorezdravotnictvi.cz';

export const NETWORKS = ['facebook', 'instagram', 'linkedin', 'x'];

// Rozměry doprovodné grafiky per síť (px).
export const IMAGE_SIZES = {
  facebook:  { w: 1200, h: 630,  orient: 'landscape' },
  linkedin:  { w: 1200, h: 627,  orient: 'landscape' },
  x:         { w: 1600, h: 900,  orient: 'landscape' },
  instagram: { w: 1080, h: 1350, orient: 'portrait' },
};

// Brand tokeny — sladěno s src/styles.css.
export const BRAND = {
  paper: '#fbf8f1',
  paper2: '#f3eee2',
  ink: '#1f1a14',
  inkMut: '#5f574e',
  red: '#b8361e',
  rule: 'rgba(31,26,20,0.14)',
};

// Tag → akcentová barva (zkráceno z ingest/scripts/generate-article-cover.js).
export const TAG_COLORS = {
  'Financování': '#a05a08', 'Politika': '#9c3450', 'Legislativa': '#5f4a8c',
  'Reforma': '#5f4a8c', 'Manifest': '#b8361e', 'Klinika': '#2c5a8a',
  'Procesy péče': '#2c5a8a', 'Primární péče': '#2c5a8a', 'Kardio': '#9c3450',
  'Onkologie': '#9c3450', 'Mortalita': '#b8361e', 'Prevence': '#2f6d4f',
  'Bezpečnost péče': '#2f6d4f', 'Bezpečnost preskripce': '#2f6d4f',
  'Životní styl': '#2f6d4f', 'Stav populace': '#2c7a87',
  'Duševní zdraví': '#5f4a8c', 'Dostupnost': '#2c5a8a',
  'Dlouhodobá péče': '#a36728', 'Vzácná onemocnění': '#5f4a8c',
};

/** Akcentová barva pro tag článku (fallback: brand red). */
export function tagColor(tag) {
  if (!tag) return BRAND.red;
  const head = String(tag).split('·')[0].trim();
  return TAG_COLORS[head] || BRAND.red;
}

// Model pro generátor shrnutí — viz summary-generator.js.
export const MODEL = process.env.SOCIAL_CLAUDE_MODEL || 'claude-sonnet-4-6';

// Tajemství / konfigurace z prostředí (GitHub Secrets / .env.local).
export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  notionKey: process.env.NOTION_API_KEY || '',
  notionDatabaseId: process.env.NOTION_DATABASE_ID || '',
  // Buffer — přímá publikace do fronty kanálů (FB/IG/LinkedIn/X).
  bufferAccessToken: process.env.BUFFER_ACCESS_TOKEN || '',
  bufferApiBase: process.env.BUFFER_API_BASE || '',
  bufferProfileFacebook: process.env.BUFFER_PROFILE_FACEBOOK || '',
  bufferProfileInstagram: process.env.BUFFER_PROFILE_INSTAGRAM || '',
  bufferProfileLinkedin: process.env.BUFFER_PROFILE_LINKEDIN || '',
  bufferProfileX: process.env.BUFFER_PROFILE_X || '',
};

// ---------------------------------------------------------------------------
// Atribuce: každý odkaz na článek, který odchází na sociální sítě, nese UTM.
// GA4 (scripts/fetch-ga4-stats.js) sbírá sessionSource/sessionMedium, porada
// (PROMPT_PORADA.md) z toho čte „návštěvy ze sítí“ bez hádání. Konvence:
//   utm_source   = síť (facebook | instagram | linkedin | x)
//   utm_medium   = social
//   utm_campaign = pipeline (notion-fronta | rutina-buffer | linkedin-tydenni)
// Stejnou konvenci používá rutina (PROMPT_ROUTINE.md, blok B) a copywriting
// manuál (docs/social-copywriting-manual.md § 7).
export const UTM_MEDIUM = 'social';
export const UTM_CAMPAIGNS = { notion: 'notion-fronta', rutina: 'rutina-buffer', linkedin: 'linkedin-tydenni' };

/**
 * Přidá UTM parametry k URL článku. Idempotentní: URL, která už utm_source
 * nese, se nemění (aby se parametry nezdvojily při opakovaném průchodu).
 * Prázdná nebo nevalidní URL se vrací beze změny.
 */
export function utmUrl(url, { source, campaign = UTM_CAMPAIGNS.notion, medium = UTM_MEDIUM } = {}) {
  if (!url || !source) return url ?? null;
  let u;
  try { u = new URL(url); } catch { return url; }
  if (u.searchParams.has('utm_source')) return url;
  u.searchParams.set('utm_source', String(source));
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}
