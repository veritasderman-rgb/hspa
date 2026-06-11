// Jednorázová (idempotentní) transformace nadpisové hierarchie kvůli SEO:
//
//   - Brand „HSPA monitor" v topbaru přestává být <h1> → <p class="brand-title">
//     (brand není hlavní téma stránky; byl <h1> na všech ~150 stránkách).
//   - Skutečný titulek stránky se povyšuje na <h1>:
//       • články:  <h2 class="article-title">      → <h1 ...>
//       • sekce:   <h2 class="ed-hero-headline">   → <h1 ...>  (+ varianty hero tříd)
//
// Tím má každá obsahová stránka právě jeden <h1> = její titulek. Stránky bez
// hero titulku (šablony indicator/rubrika/embed, 404, dohodovaci-rizeni) se
// NEMĚNÍ — brand u nich zůstává <h1>, aby nezůstaly bez nadpisu.
//
// Idempotentní: po proběhnutí už brand není <h1>, takže opětovné spuštění nic
// nezmění. Spárováno s CSS (.brand .brand-title) v src/styles.css.
//
// Použití: node scripts/promote-h1-headings.js [--dry]

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

// Třídy primárního titulku (hero/headline), které se povyšují na <h1>.
const TITLE_CLASSES = [
  'article-title',
  'ed-hero-headline',
  'hspa-hero-headline',
  'hub-hero-h',
  'fn-hero-headline',
];

// Brand <h1> v topbaru vždy začíná `<h1><abbr class="hspa-abbr"` a končí `</h1>`
// (uvnitř může být <em> a <small>; žádné vnořené <h1>).
const BRAND_RE = /<h1>(\s*<abbr class="hspa-abbr"[\s\S]*?)<\/h1>/;

function promoteTitle(html, cls) {
  const re = new RegExp(`<h2(\\s[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*)>([\\s\\S]*?)<\\/h2>`);
  if (!re.test(html)) return { html, changed: false };
  return { html: html.replace(re, `<h1$1>$2</h1>`), changed: true };
}

export function transform(html) {
  // Najdi titulkovou třídu na stránce.
  const cls = TITLE_CLASSES.find(c =>
    new RegExp(`<h2\\s[^>]*class="[^"]*\\b${c}\\b`).test(html)
  );
  if (!cls) return { html, status: 'skip-no-title' };
  if (!BRAND_RE.test(html)) return { html, status: 'skip-no-brand-h1' };

  let out = html.replace(BRAND_RE, '<p class="brand-title">$1</p>');
  const { html: out2, changed } = promoteTitle(out, cls);
  if (!changed) return { html, status: 'skip-title-not-h2' };
  return { html: out2, status: 'updated', cls };
}

function main() {
  const files = readdirSync(ROOT).filter(f => /\.html$/.test(f));
  const counts = {};
  for (const f of files) {
    const p = resolve(ROOT, f);
    const html = readFileSync(p, 'utf8');
    const { html: out, status, cls } = transform(html);
    counts[status] = (counts[status] || 0) + 1;
    if (status === 'updated') {
      if (!DRY) writeFileSync(p, out);
      console.log(`✓ ${f} (${cls})`);
    }
  }
  console.log('\nSummary:');
  for (const [k, v] of Object.entries(counts)) if (v > 0) console.log(`  ${k}: ${v}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
