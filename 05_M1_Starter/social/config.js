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
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || '',
  makeWebhookSecret: process.env.MAKE_WEBHOOK_SECRET || '',
};
