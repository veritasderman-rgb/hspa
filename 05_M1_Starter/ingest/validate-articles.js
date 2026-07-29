// Validace publikační hygieny článků (clanek-*.html).
// Spouštěj v CI před deployem: node ingest/validate-articles.js
//
// Co kontroluje:
//   1. Konzistence articles.json ↔ HTML soubory (existence, datum, slug)
//   2. Detekce redakčních / draft / status bannerů, které se neměly dostat
//      do publikovaného článku. Pravidlo: jakýkoli <p>, <aside>, <div>
//      v <header class="article-header"> obsahující frází jako
//      "Status:", "draft", "review-pending", "pracovní", "auditní revizi",
//      "audit-status" → fail.
//   3. Článek s audit-status=draft/flagged/draft-flagged MUSÍ mít
//      published: false v articles.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REDACTION_PATTERNS = [
  /Status:\s*(pracovní|draft|review[\s-]pending|flagged)/i,
  /pracovn[íi]\s+draft/i,
  /auditn[ií]\s+revizi/i,
  /TODO[:\s]/,
  /XXX[:\s]/,
  /FIXME[:\s]/,
  // Generic banner shapes (background warning + Status: …)
  /background:\s*#fff7e6[^>]*>\s*<strong>\s*Status:/i,
];

const NON_PUBLISHABLE_STATUSES = new Set(['draft', 'flagged', 'draft-flagged']);

function extractMeta(html) {
  const m = /<meta\s+name=["']article:audit-status["']\s+content=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

function extractHeaderBlock(html) {
  // Najdi <header class="article-header"> … </header>
  const m = /<header\s+class=["']article-header["'][^>]*>([\s\S]*?)<\/header>/i.exec(html);
  return m ? m[1] : null;
}

function findRedactionBanners(html) {
  const header = extractHeaderBlock(html) || html.slice(0, 8000);
  const hits = [];
  for (const re of REDACTION_PATTERNS) {
    const m = re.exec(header);
    if (m) hits.push({ pattern: re.source, snippet: m[0].slice(0, 120) });
  }
  return hits;
}

/**
 * Detekuje <aside class="article-review-banner"> kdekoli v <main>.
 * Tento banner je interní redakční / procesní poznámka (status revize,
 * „vytvořeno daily routine", „čeká na ruční schválení") a NEPATŘÍ do
 * publikovaného článku. V draftu je tolerován (draft je v UI skrytý).
 */
function findReviewBanner(html) {
  const m = /<aside\s+class=["']article-review-banner["'][\s\S]*?<\/aside>/i.exec(html);
  if (!m) return null;
  return m[0].replace(/\s+/g, ' ').slice(0, 140);
}

/**
 * Interní procesní žargon ve VIDITELNÉ vrstvě článku — nezávisle na tom, jakou
 * třídu jeho obal nese (issue #847: blok „Pozn. k revizi" unikl do čtenářské
 * vrstvy v <aside class="article-audit-note">, kterou detektor bannerů neznal).
 * Fráze jsou volené tak, aby šlo o redakční proces, ne o téma článku — proto
 * ne samotné „draft" či „audit" (článek smí psát o návrhu zákona i o auditu NKÚ).
 * HTML komentáře se odstraňují: `audit:` blok v hlavičce je správné místo,
 * kam tyhle poznámky patří.
 */
const INTERNAL_PROCESS_MARKERS = [
  /Republikace\s+teprve\s+po/i,
  /(?:Status|status)\s+(?:článku\s+)?(?:je\s+|ponechán\s*(?:jako)?\s*)?[:\s]\s*(?:review-pending|draft|partial|flagged)/,
  /\b(?:podléhá|čeká\s+na)\s+ručním?u?\s+schválení/i,
  /vytvořeno\s+daily\s+routine/i,
  /\baudit-status\b/i,
  /\breview-pending\b/i,
  /\bdraft-flagged\b/i,
  /\b(?:TODO|FIXME|XXX):/,
];

function findInternalProcessNotes(html) {
  const visible = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const body = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(visible)?.[1] ?? visible;
  const text = body.replace(/<[^>]+>/g, ' ');
  const hits = [];
  for (const re of INTERNAL_PROCESS_MARKERS) {
    const m = re.exec(text);
    if (m) {
      const at = Math.max(0, m.index - 40);
      hits.push({
        pattern: re.source,
        snippet: text.slice(at, m.index + 90).replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return hits;
}

function validate() {
  const articlesFile = path.join(ROOT, 'data', 'articles.json');
  if (!fs.existsSync(articlesFile)) {
    console.error('FAIL: data/articles.json not found');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
  const articles = data.articles ?? [];

  // Rubriky (páteř sekce Články) — každý publikovaný článek musí mít platné `rubric`.
  const rubricsFile = path.join(ROOT, 'data', 'rubrics.json');
  let validRubrics = null;
  if (fs.existsSync(rubricsFile)) {
    validRubrics = new Set(JSON.parse(fs.readFileSync(rubricsFile, 'utf8')).rubrics.map(r => r.id));
  }

  const errors = [];
  const warnings = [];

  for (const a of articles) {
    if (!a.slug) {
      errors.push(`${a.id || '?'}: missing slug`);
      continue;
    }

    // Kontrola rubriky (jen pro publikované — drafty smí rubric doplnit později)
    if (validRubrics) {
      if (!a.rubric) {
        if (a.published !== false) {
          errors.push(`${a.id} (${a.slug}): chybí pole "rubric" (publikovaný článek musí mít rubriku)`);
        } else {
          warnings.push(`${a.id}: draft bez rubriky (doplň před publikací)`);
        }
      } else if (!validRubrics.has(a.rubric)) {
        errors.push(`${a.id} (${a.slug}): rubric="${a.rubric}" není v data/rubrics.json`);
      }
    }
    const file = path.join(ROOT, a.slug);
    if (!fs.existsSync(file)) {
      errors.push(`${a.id}: HTML file ${a.slug} not found`);
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');

    // Konzistence audit-status ↔ published
    const auditStatus = extractMeta(html);
    if (auditStatus && NON_PUBLISHABLE_STATUSES.has(auditStatus)) {
      if (a.published !== false) {
        errors.push(`${a.id}: audit-status="${auditStatus}" v HTML, ale published !== false v articles.json (musí být false)`);
      }
    }

    // Detekce redakčních bannerů v publikovaných článcích
    const banners = findRedactionBanners(html);
    if (banners.length && a.published !== false) {
      for (const b of banners) {
        errors.push(`${a.id} (${a.slug}): redakční banner ponechán v publikovaném článku: /${b.pattern}/ — "${b.snippet}"`);
      }
    } else if (banners.length) {
      // Draft → jen varování, draft se nepublikuje (filter v UI)
      warnings.push(`${a.id}: ${banners.length} redakčních markerů v draftu (OK pokud zůstane published:false)`);
    }

    // <aside class="article-review-banner"> — interní procesní poznámka,
    // nepatří do publikovaného článku (v draftu tolerováno).
    const reviewBanner = findReviewBanner(html);
    if (reviewBanner && a.published !== false) {
      errors.push(`${a.id} (${a.slug}): <aside class="article-review-banner"> v publikovaném článku — interní redakční poznámka, odstraň před publikací: "${reviewBanner}"`);
    } else if (reviewBanner) {
      warnings.push(`${a.id}: article-review-banner v draftu (musí být odstraněn před publikací)`);
    }

    // Interní procesní žargon ve viditelné vrstvě — nezávisle na obalu (#847).
    const internalNotes = findInternalProcessNotes(html);
    if (internalNotes.length && a.published !== false) {
      for (const n of internalNotes) {
        errors.push(`${a.id} (${a.slug}): interní redakční poznámka ve viditelném textu (/${n.pattern}/) — patří do HTML komentáře "audit:", ne do článku: "${n.snippet}"`);
      }
    } else if (internalNotes.length) {
      warnings.push(`${a.id}: ${internalNotes.length} interních procesních markerů ve viditelném textu draftu (odstraň před publikací)`);
    }
  }

  console.log(`Articles validated: ${articles.length}`);
  if (warnings.length) {
    console.log(`Warnings: ${warnings.length}`);
    for (const w of warnings) console.log('  ⚠ ' + w);
  }
  if (errors.length) {
    console.error(`\nFAIL: ${errors.length} error(s):`);
    for (const e of errors) console.error('  ✗ ' + e);
    process.exit(1);
  }
  console.log('\nOK: všechny články prošly publikační hygienou.');
}

validate();
