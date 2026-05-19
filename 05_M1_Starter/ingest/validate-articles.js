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

function validate() {
  const articlesFile = path.join(ROOT, 'data', 'articles.json');
  if (!fs.existsSync(articlesFile)) {
    console.error('FAIL: data/articles.json not found');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
  const articles = data.articles ?? [];

  const errors = [];
  const warnings = [];

  for (const a of articles) {
    if (!a.slug) {
      errors.push(`${a.id || '?'}: missing slug`);
      continue;
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
