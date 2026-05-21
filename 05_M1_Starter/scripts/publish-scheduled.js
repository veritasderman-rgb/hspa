#!/usr/bin/env node
// Cron-driven publisher: každý den projde data/articles.json a publikuje
// (nastaví published: true) články se scheduled_for <= dnes — ale POUZE ty,
// které jsou skutečně připravené.
//
// Review hold — článek se NEpublikuje automaticky, pokud:
//   (a) má v articles.json _review_note nebo audit.status v HOLD množině,
//   (b) jeho HTML má <meta article:audit-status> v HOLD množině, NEBO
//   (c) jeho HTML nese viditelné draft markery — „(DRAFT)" v <title>,
//       „DRAFT" v masthead-score, „draft" v article-meta-date.
// Body (b) a (c) jsou pojistka proti případu, kdy je v articles.json
// záznam „čistý" (bez audit/_review_note), ale samotný článek je
// rozpracovaný draft. Takové články musí publikovat člověk po ručním
// schválení (nastavit published: true a vyčistit draft markery).
//
// Spouští se přes .github/workflows/publish-articles.yml každý den 04:00 UTC.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTICLES = path.join(ROOT, 'data', 'articles.json');

// Stavy, které cron NESMÍ auto-publikovat — vyžadují člověka.
// (Publikovatelné bez zásahu jsou pouze 'verified' a 'partial'.)
const HOLD_STATUSES = new Set(['draft', 'draft-flagged', 'flagged', 'review-pending', 'needs-rewrite']);

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Posoudí HTML článku (čistá funkce). Vrací audit-status z meta tagu
 * a seznam viditelných draft markerů.
 */
export function assessHtml(html) {
  const s = String(html || '');
  const meta = /<meta\s+name=["']article:audit-status["']\s+content=["']([^"']+)["']/i.exec(s);
  const htmlStatus = meta ? meta[1].trim() : null;

  const draftMarkers = [];
  const title = /<title>([^<]*)<\/title>/i.exec(s);
  if (title && /\(DRAFT/i.test(title[1])) draftMarkers.push('"(DRAFT)" v <title>');
  if (/<span class="masthead-score">\s*DRAFT/i.test(s)) draftMarkers.push('"DRAFT" v masthead-score');
  if (/class="article-meta-date">\s*draft\b/i.test(s)) draftMarkers.push('"draft" v article-meta-date');

  return { htmlStatus, draftMarkers };
}

/**
 * Vrátí důvod, proč článek zadržet v review holdu, nebo null pokud je
 * připraven k automatické publikaci. Čistá funkce.
 *
 * @param {object} article  záznam z articles.json
 * @param {string} html     obsah příslušného HTML souboru článku
 */
export function holdReason(article, html) {
  if (article._review_note) return '_review_note';

  const jsonStatus = article.audit && article.audit.status;
  if (HOLD_STATUSES.has(jsonStatus)) return `articles.json audit.status=${jsonStatus}`;

  const { htmlStatus, draftMarkers } = assessHtml(html);
  if (HOLD_STATUSES.has(htmlStatus)) return `HTML audit-status=${htmlStatus}`;
  if (draftMarkers.length) return `draft markery v HTML (${draftMarkers.join('; ')})`;

  return null;
}

function main() {
  const data = JSON.parse(fs.readFileSync(ARTICLES, 'utf8'));
  const today = todayUtc();
  const published = [];
  const held = [];

  for (const a of data.articles) {
    if (!(a.published === false && a.scheduled_for && a.scheduled_for <= today)) continue;

    const file = a.slug ? path.join(ROOT, a.slug) : null;
    if (!file || !fs.existsSync(file)) {
      held.push({ slug: a.slug, scheduled: a.scheduled_for, reason: 'HTML soubor nenalezen' });
      continue;
    }

    const reason = holdReason(a, fs.readFileSync(file, 'utf8'));
    if (reason) {
      held.push({ slug: a.slug, scheduled: a.scheduled_for, reason });
      continue;
    }

    a.published = true;
    // scheduled_for ponecháváme pro audit (kdy byl článek publikován).
    published.push({ slug: a.slug, title: a.title, scheduled: a.scheduled_for });
  }

  if (held.length > 0) {
    console.log(`[${today}] ${held.length} článek/ů zadrženo v review hold (nebudou auto-publikovány):`);
    for (const h of held) {
      console.log(`  · ${h.slug} (sched ${h.scheduled}, ${h.reason})`);
    }
  }

  if (published.length === 0) {
    console.log(`[${today}] Nic k publikaci.`);
    process.exit(0);
  }

  data.generated_at = new Date().toISOString();
  fs.writeFileSync(ARTICLES, JSON.stringify(data, null, 2) + '\n');

  console.log(`[${today}] Publikováno ${published.length} článek/ů:`);
  for (const p of published) {
    console.log(`  - ${p.slug} :: ${p.title} (sched ${p.scheduled})`);
  }
}

// main() jen při přímém spuštění — kvůli importu z testů.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
