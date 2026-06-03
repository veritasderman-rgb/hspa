// Noční triážní skener webu HSPA Monitor.
//
// Deterministická, OFFLINE část noční rutiny (viz PROMPT_NIGHTLY_ROUTINE.md):
// levně projde všechny PUBLIKOVANÉ články a vyrobí tříděný worklist, podle
// kterého pak agent (Claude Code) jedná. Skener sám NIC needituje a nechodí
// na síť — jen čte a reportuje. Akce (oprava, kontrola odkazu, flag) je na
// agentovi podle playbooku.
//
// Co hledá:
//   1. missing-cover     — publikovaný článek bez assets/covers/{slug}.png
//                          (auto-fixable: generate-article-cover + inject)
//   2. topical-expired   — articles.json topical_until už nastalo (téma „vypršelo")
//   3. date-passed       — v textu zmíněné konkrétní datum (D. M. RRRR), které
//                          už uplynulo → článek možná popisuje událost jako
//                          budoucí, ač už nastala (silný signál „needs update")
//   4. year-past         — „do roku RRRR / v roce RRRR" s rokem < letošní
//   5. stale-date        — publikováno před > STALE_MONTHS měsíci (nízká priorita)
//   6. ext-links         — inventář externích odkazů (zdroje) ke kontrole agentem,
//                          s prioritou pro legislativní/EU domény
//
// Výstup:
//   - reports/nightly-audit-RRRR-MM-DD.md  (čitelný report)
//   - reports/nightly-audit-RRRR-MM-DD.json (strojový worklist pro agenta)
//   - stdout: krátké shrnutí
//
// Respektování auditu: článek s `audit.last_reviewed` mladším než
// REVIEW_SKIP_DAYS (14 dní) se ve `check-sources` PŘESKOČÍ (sladěno s triážním
// pravidlem v PROMPT_NIGHTLY_ROUTINE.md — „přeskoč články auditované < 14 dní").
// `date-passed` a `topical-expired` se NEpřeskakují (nové časové signály).
//
// Použití:
//   node scripts/nightly-scan.js              # plný sken, zapíše report
//   node scripts/nightly-scan.js --stdout     # jen vypíše, nezapisuje soubory
//   node scripts/nightly-scan.js --slug=clanek-foo.html   # jen jeden článek
//   node scripts/nightly-scan.js --no-skip-reviewed       # vč. recentně auditovaných

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');
const COVERS_DIR = resolve(ROOT, 'assets/covers');
const REPORTS_DIR = resolve(ROOT, 'reports');

const STALE_MONTHS = 12;        // publikováno dávno → připomenout revizi
const MAX_DATE_HITS = 6;        // strop zmínek dat na článek (proti šumu)
const MAX_EXT_LINKS = 12;       // strop externích odkazů na článek
const REVIEW_SKIP_DAYS = 14;    // článek auditovaný < 14 dní → přeskoč check-sources
                                // (sladěno s triážním pravidlem PROMPT_NIGHTLY_ROUTINE.md;
                                // date-passed/topical-expired se NEpřeskakují — to jsou
                                // nové časové signály, které review nemohla znát)

// Domény, jejichž odkazy mají při kontrole přednost (legislativa, EU, regulátor).
const PRIORITY_LINK_HINTS = [
  'zakonyprolidi.cz', 'e-sbirka', 'esipa.cz', 'eur-lex.europa.eu',
  'psp.cz', 'senat.cz', 'vlada.cz', 'mzcr.cz', 'mzd.gov.cz', 'ncez',
  'sukl.cz', 'uzis.cz', 'health.ec.europa.eu', 'ec.europa.eu',
];

const MONTHS_CS = {
  'ledna': 1, 'leden': 1, 'února': 2, 'únor': 2, 'března': 3, 'březen': 3,
  'dubna': 4, 'duben': 4, 'května': 5, 'květen': 5, 'června': 6, 'červen': 6,
  'července': 7, 'červenec': 7, 'srpna': 8, 'srpen': 8, 'září': 9,
  'října': 10, 'říjen': 10, 'listopadu': 11, 'listopad': 11,
  'prosince': 12, 'prosinec': 12,
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function loadArticles() {
  return JSON.parse(readFileSync(ARTICLES_JSON, 'utf8')).articles ?? [];
}

// Odstraní HTML tagy a vrátí čistý text (pro extrakci vět a dat).
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Vytáhne kontext (okno ±110 znaků) okolo pozice — NE podle tečky, protože
// české datum „18. 5. 2026" obsahuje tečky a rozbilo by větu.
function windowAround(text, idx, len = 0) {
  const start = Math.max(0, idx - 95);
  const end = Math.min(text.length, idx + len + 95);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

// Dopředná formulace v okolí data → výrok byl psán jako budoucí.
const FORWARD_RE = /\b(od|do|účinnost|účinn\w*|nabýv\w*|nabýt|vstoup\w*|platnost\w*|plánuj\w*|plánován\w*|očekáv\w*|měl[aoy]?\s+by|mají\s+|spustí\w*|spuštěn\w*|zaveden\w*|zavede|termín\w*|deadline|bude|budou|chystá\w*|připravuj\w*|projednáv\w*|schválen\w*|má\s+nabýt|má\s+vstoupit|do\s+roku)\b/i;

/**
 * Najde konkrétní data D. M. RRRR, která byla v době psaní BUDOUCÍ (po datu
 * publikace článku), DNES už ale uplynula, a v jejichž okolí je dopředná
 * formulace. To je silný signál „očekávaná událost už nastala → revize".
 *
 * @param {string} text   čistý text článku
 * @param {string} today  YYYY-MM-DD
 * @param {string} pubDate YYYY-MM-DD datum publikace článku (nebo null)
 */
function findPassedDates(text, today, pubDate) {
  const hits = [];
  const re = /\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(text)) !== null) {
    const [whole, d, mo, y] = m;
    if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) continue;
    const iso = `${y}-${String(+mo).padStart(2, '0')}-${String(+d).padStart(2, '0')}`;
    // Musí být: po publikaci (byl budoucí) A už uplynulý (dnes minulý).
    if (iso > today) continue;
    if (pubDate && iso < pubDate) continue; // historické datum — ne signál
    const ctx = windowAround(text, m.index, whole.length);
    if (!FORWARD_RE.test(ctx)) continue;    // bez dopředné formulace = ne signál
    if (seen.has(iso)) continue;
    seen.add(iso);
    hits.push({ date: iso, raw: whole.replace(/\s+/g, ' ').trim(), context: ctx.slice(0, 220) });
    if (hits.length >= MAX_DATE_HITS) break;
  }
  return hits;
}

/**
 * Inventář externích odkazů (http/https), s prioritou pro legislativní domény.
 */
function findExternalLinks(html) {
  const links = [];
  const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const label = stripTags(m[2]).slice(0, 80);
    const priority = PRIORITY_LINK_HINTS.some(h => url.includes(h));
    links.push({ url, label, priority });
    if (links.length >= MAX_EXT_LINKS * 3) break;
  }
  // dedup podle url, priority napřed
  const seen = new Set();
  const dedup = links.filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
  dedup.sort((a, b) => (b.priority - a.priority));
  return dedup.slice(0, MAX_EXT_LINKS);
}

function monthsSince(iso, today) {
  if (!iso) return null;
  const a = new Date(iso), b = new Date(today);
  if (isNaN(a)) return null;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA), b = new Date(isoB);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

// Vytáhne audit.last_reviewed (YYYY-MM-DD) z HTML komentáře v hlavičce článku.
export function parseLastReviewed(html) {
  const m = html.match(/last_reviewed:\s*["']?(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export { daysBetween, REVIEW_SKIP_DAYS, scanArticle };

function scanArticle(article, today, { skipReviewed = true } = {}) {
  const slug = article.slug;
  const htmlPath = resolve(ROOT, slug);
  const flags = [];
  const item = { slug, title: article.title, number: article.number, date: article.date, flags };

  // 1) cover
  const pngPath = resolve(COVERS_DIR, slug.replace(/\.html$/, '.png'));
  if (!existsSync(pngPath)) {
    flags.push({ type: 'missing-cover', severity: 'auto-fix',
      note: 'Chybí náhledová grafika — vygeneruj a injektuj (generate-article-cover.js + inject-article-covers.js).' });
  }

  // 2) topical_until
  if (article.topical_until && article.topical_until <= today) {
    flags.push({ type: 'topical-expired', severity: 'review',
      note: `topical_until ${article.topical_until} už nastalo — téma mohlo přejít do „po události“; zkontroluj aktuálnost.` });
  }

  // 3) stale date
  const age = monthsSince(article.date, today);
  if (age != null && age >= STALE_MONTHS) {
    flags.push({ type: 'stale-date', severity: 'low',
      note: `Publikováno před ${age} měsíci (${article.date}) — zvaž revizi čísel a zdrojů.` });
  }

  // text-based (vyžaduje HTML)
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8');
    const text = stripTags(html);

    // Recentně auditovaný článek (< REVIEW_SKIP_DAYS) → check-sources se přeskočí.
    // date-passed/topical-expired ale surfují dál (nové časové signály).
    const lastReviewed = parseLastReviewed(html);
    const daysSinceReview = lastReviewed ? daysBetween(lastReviewed, today) : null;
    const recentlyReviewed = daysSinceReview != null && daysSinceReview >= 0
      && daysSinceReview < REVIEW_SKIP_DAYS;
    if (lastReviewed) item.last_reviewed = lastReviewed;

    const passed = findPassedDates(text, today, article.date);
    for (const p of passed) {
      flags.push({ type: 'date-passed', severity: 'review', date: p.date,
        note: `Datum ${p.raw} bylo při publikaci budoucí, dnes už uplynulo → ověř, zda článek nepopisuje událost jako očekávanou, ač nastala (a doplň výsledek).`,
        context: p.context });
    }

    const links = findExternalLinks(html);
    if (links.length) {
      item.ext_links = links;
      const prio = links.filter(l => l.priority);
      if (prio.length) {
        if (skipReviewed && recentlyReviewed) {
          // Zaznamenej (pro report), ale neflaguj — auditováno < 14 dní.
          item.check_sources_skipped = { count: prio.length, last_reviewed: lastReviewed };
        } else {
          flags.push({ type: 'check-sources', severity: 'review',
            note: `${prio.length} prioritních (legislativa/EU/regulátor) odkazů ke kontrole na posun.`,
            links: prio.map(l => l.url) });
        }
      }
    }
  } else {
    flags.push({ type: 'no-html', severity: 'review', note: 'HTML soubor článku nenalezen.' });
  }

  return item;
}

function buildReport(items, today) {
  const withFlags = items.filter(i => i.flags.length);
  const byType = {};
  for (const i of withFlags) for (const f of i.flags) byType[f.type] = (byType[f.type] || 0) + 1;

  const sev = t => ({ 'auto-fix': 0, 'review': 1, 'low': 2 }[t] ?? 3);
  const lines = [];
  lines.push(`# Noční audit webu — ${today}`);
  lines.push('');
  lines.push(`Skenováno **${items.length}** publikovaných článků, ` +
             `**${withFlags.length}** má nějaký flag. Generuje \`scripts/nightly-scan.js\`.`);
  lines.push('');
  lines.push('## Souhrn podle typu');
  lines.push('');
  lines.push('| Typ | Počet | Co s tím |');
  lines.push('| --- | ---: | --- |');
  const TYPE_ACTION = {
    'missing-cover': 'Auto-fix: vygenerovat + injektovat cover',
    'topical-expired': 'Revize: aktualizovat na „po události“',
    'date-passed': 'Revize: ověřit budoucí vs. minulý čas u data',
    'check-sources': 'Revize: zkontrolovat zdrojové odkazy (WebFetch)',
    'year-past': 'Nízká: ověřit zmínku roku',
    'stale-date': 'Nízká: zvážit revizi starého článku',
    'no-html': 'Revize: chybí HTML soubor',
  };
  for (const [t, n] of Object.entries(byType).sort((a, b) => sev(flagSeverity(a[0])) - sev(flagSeverity(b[0])))) {
    lines.push(`| \`${t}\` | ${n} | ${TYPE_ACTION[t] || ''} |`);
  }
  lines.push('');

  const skipped = items.filter(i => i.check_sources_skipped);
  if (skipped.length) {
    lines.push(`> ℹ️ \`check-sources\` přeskočeno u **${skipped.length}** článků auditovaných ` +
               `< ${REVIEW_SKIP_DAYS} dní (\`last_reviewed\`). Plný worklist: \`--no-skip-reviewed\`.`);
    lines.push('');
  }

  // Auto-fixovatelné napřed
  const autoFix = withFlags.filter(i => i.flags.some(f => f.severity === 'auto-fix'));
  if (autoFix.length) {
    lines.push('## 🟢 Auto-fix (smí agent udělat sám)');
    lines.push('');
    for (const i of autoFix) {
      const f = i.flags.filter(x => x.severity === 'auto-fix');
      lines.push(`- **${i.slug}** — ${f.map(x => x.note).join(' ')}`);
    }
    lines.push('');
  }

  // Review
  const review = withFlags.filter(i => i.flags.some(f => f.severity === 'review'));
  if (review.length) {
    lines.push('## 🟠 K revizi (flag + draft/issue, NE auto-publikace)');
    lines.push('');
    for (const i of review) {
      lines.push(`### ${i.slug} — ${i.title ?? ''}`);
      for (const f of i.flags.filter(x => x.severity === 'review')) {
        lines.push(`- \`${f.type}\` — ${f.note}`);
        if (f.context) lines.push(`  > …${f.context}…`);
        if (f.links) for (const u of f.links) lines.push(`  - ${u}`);
      }
      lines.push('');
    }
  }

  // Low
  const low = withFlags.filter(i => i.flags.every(f => f.severity === 'low'));
  if (low.length) {
    lines.push('## ⚪ Nízká priorita');
    lines.push('');
    for (const i of low) {
      lines.push(`- **${i.slug}** — ${i.flags.map(f => f.note).join(' ')}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_Skener nic needituje ani nechodí na síť. Akce dle `PROMPT_NIGHTLY_ROUTINE.md`._');
  return lines.join('\n') + '\n';
}

function flagSeverity(type) {
  return ({
    'missing-cover': 'auto-fix', 'topical-expired': 'review', 'date-passed': 'review',
    'check-sources': 'review', 'no-html': 'review', 'year-past': 'low', 'stale-date': 'low',
  })[type] || 'review';
}

function main() {
  const args = process.argv.slice(2);
  const stdoutOnly = args.includes('--stdout');
  // Defaultně přeskakuj check-sources u recentně auditovaných (< 14 dní).
  // --no-skip-reviewed vynutí úplný worklist (vč. recentně auditovaných).
  const skipReviewed = !args.includes('--no-skip-reviewed');
  const slugArg = (args.find(a => a.startsWith('--slug=')) || '').split('=')[1];

  const today = todayUtc();
  let articles = loadArticles().filter(a => a.published === true);
  if (slugArg) articles = articles.filter(a => a.slug === slugArg || a.id === slugArg);

  const items = articles.map(a => scanArticle(a, today, { skipReviewed }));
  const report = buildReport(items, today);

  const withFlags = items.filter(i => i.flags.length);
  const counts = { 'auto-fix': 0, review: 0, low: 0 };
  for (const i of withFlags) for (const f of i.flags) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const skippedCS = items.filter(i => i.check_sources_skipped).length;

  if (!stdoutOnly) {
    mkdirSync(REPORTS_DIR, { recursive: true });
    const mdPath = resolve(REPORTS_DIR, `nightly-audit-${today}.md`);
    const jsonPath = resolve(REPORTS_DIR, `nightly-audit-${today}.json`);
    writeFileSync(mdPath, report);
    writeFileSync(jsonPath, JSON.stringify({ generated_at: new Date().toISOString(), today, items: withFlags }, null, 2) + '\n');
    console.log(`Report: reports/nightly-audit-${today}.md (+ .json)`);
  } else {
    console.log(report);
  }
  const skipNote = skipReviewed && skippedCS
    ? ` | check-sources přeskočeno (auditováno <${REVIEW_SKIP_DAYS} d): ${skippedCS}`
    : '';
  console.log(`Skenováno ${items.length} článků | flagů: auto-fix ${counts['auto-fix']}, review ${counts.review}, low ${counts.low}${skipNote}`);
}

// Spusť jen při přímém spuštění (node scripts/nightly-scan.js), ne při importu z testu.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
