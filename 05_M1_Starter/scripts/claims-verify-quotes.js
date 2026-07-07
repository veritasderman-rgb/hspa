// Deterministická verifikace registru tvrzení (PLAN-CLAIMS.md §2):
// každý claim.quote musí být doslovným úryvkem textu svého článku
// (po odstranění tagů a normalizaci bílých znaků). Tvrzení s neexistujícím
// úryvkem do registru nepatří — parafráze nelze strojově dohledat zpět.
//
// Použití:
//   node scripts/claims-verify-quotes.js          # report + exit 1 při selhání
//   node scripts/claims-verify-quotes.js --json   # JSON seznam vadných id na stdout

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Normalizace pro porovnání: entity → znaky, tagy pryč, bílé znaky (vč. NBSP
// a měkkých pomlček) na jednu mezeru, typografické uvozovky sjednocené.
export function normalizeText(s) {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/­/g, '')
    .replace(/[„“”]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[\s ]+/g, ' ')
    .trim();
}

export function verifyQuote(quote, articleTextNormalized) {
  return articleTextNormalized.includes(normalizeText(quote));
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const file = resolve(ROOT, 'data/claims.json');
  if (!existsSync(file)) {
    console.error('FAIL: data/claims.json not found');
    process.exit(1);
  }
  const claims = JSON.parse(readFileSync(file, 'utf8')).claims ?? [];

  const articleCache = new Map();
  const failures = [];
  for (const c of claims) {
    const p = resolve(ROOT, c.article);
    if (!articleCache.has(p)) {
      articleCache.set(p, existsSync(p) ? normalizeText(readFileSync(p, 'utf8')) : null);
    }
    const text = articleCache.get(p);
    if (text == null) {
      failures.push({ id: c.id, reason: 'article-missing' });
      continue;
    }
    if (!verifyQuote(c.quote, text)) {
      failures.push({ id: c.id, reason: 'quote-not-found' });
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(failures));
    process.exit(failures.length ? 1 : 0);
  }
  if (failures.length) {
    console.error(`FAIL: ${failures.length}/${claims.length} tvrzení neprošlo quote-verifikací:`);
    for (const f of failures) console.error(`  - ${f.id} (${f.reason})`);
    process.exit(1);
  }
  console.log(`OK: ${claims.length} tvrzení, všechny quotes doslovně dohledatelné.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
