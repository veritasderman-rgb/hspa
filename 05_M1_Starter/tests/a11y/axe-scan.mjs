// WCAG 2.2 AA accessibility scanner (Proud A1).
//
// Spustí lokální statický server nad 05_M1_Starter/, projede reprezentativní
// stránky headless Chromiem a na každé spustí axe-core s tagy
// wcag2a / wcag2aa / wcag21aa / wcag22aa. Výstup zapíše jako markdown report
// do docs/a11y-baseline-<datum>.md a vypíše souhrn.
//
// Použití:
//   npm run test:a11y                 # report-only, exit 0
//   npm run test:a11y -- --ci         # exit 1 při critical/serious violations (CI gate)
//   npm run test:a11y -- --out=path   # vlastní cesta reportu
//
// Předpoklad: nainstalovaný prohlížeč  ->  npx playwright install chromium
// Pokud prohlížeč/balíčky chybí, skript skončí s informativní hláškou a exit 0
// (aby neblokoval prostředí bez Playwrightu); v CI je browser k dispozici.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // 05_M1_Starter/
const PORT = Number(process.env.A11Y_PORT || 8099);

const args = process.argv.slice(2);
const CI = args.includes('--ci');
const outArg = args.find(a => a.startsWith('--out='));

// Reprezentativní průřez webu (1 vzorový článek stačí — sdílejí layout).
const PAGES = [
  'index.html',
  'clanky.html',
  'hspa-prehled.html',
  'tematicke-linie.html',
  'kraje.html',
  'pojistenci.html',
  'prevence.html',
  'strategie.html',
  'glosar.html',
  'jak-funguje.html',
  'o-projektu.html',
  'redakce.html',
  'indicator.html?id=nadeje_doziti_total',
  'clanek-vydaje-prevence.html',
  '404.html',
];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
        const file = path.join(ROOT, rel);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      } catch {
        res.statusCode = 500;
        res.end('error');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

function severityRank(impact) {
  return { critical: 4, serious: 3, moderate: 2, minor: 1 }[impact] || 0;
}

async function main() {
  let chromium, AxeBuilder;
  try {
    ({ chromium } = await import('playwright'));
    ({ default: AxeBuilder } = await import('@axe-core/playwright'));
  } catch (err) {
    console.warn('[a11y] Playwright/@axe-core/playwright není dostupný — přeskakuji sken.');
    console.warn('[a11y] Nainstaluj: npm i -D playwright @axe-core/playwright && npx playwright install chromium');
    console.warn(`[a11y] (${err.message})`);
    process.exit(0);
  }

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    console.warn('[a11y] Nelze spustit Chromium — chybí stažený prohlížeč?');
    console.warn('[a11y] Spusť: npx playwright install chromium');
    console.warn(`[a11y] (${err.message})`);
    process.exit(0);
  }

  const context = await browser.newContext();
  const server = await startServer();
  const base = `http://127.0.0.1:${PORT}/`;
  const results = [];
  let totalViolations = 0;
  let worstRank = 0;

  for (const pagePath of PAGES) {
    const page = await context.newPage();
    const url = base + pagePath;
    const entry = { page: pagePath, violations: [], error: null };
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      for (const v of violations) {
        entry.violations.push({
          id: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 3).map(n => (n.target || []).join(' ')),
        });
        totalViolations += 1;
        worstRank = Math.max(worstRank, severityRank(v.impact));
      }
    } catch (err) {
      entry.error = err.message;
    }
    results.push(entry);
    await page.close();
    const tag = entry.error ? `ERROR ${entry.error}` : `${entry.violations.length} violation(s)`;
    console.log(`[a11y] ${pagePath}: ${tag}`);
  }

  await browser.close();
  server.close();

  // ---- Markdown report ----
  const today = new Date().toISOString().slice(0, 10);
  const outPath = outArg
    ? path.resolve(ROOT, outArg.slice('--out='.length))
    : path.resolve(ROOT, '..', 'docs', `a11y-baseline-${today.slice(0, 7)}.md`);

  const lines = [];
  lines.push(`# WCAG 2.2 AA — axe-core baseline (${today})`);
  lines.push('');
  lines.push(`Automatický sken (\`npm run test:a11y\`) · tagy: ${WCAG_TAGS.join(', ')} · ${PAGES.length} stránek.`);
  lines.push('');
  lines.push(`**Celkem porušení pravidel: ${totalViolations}** (napříč stránkami; stejné pravidlo se může opakovat).`);
  lines.push('');
  lines.push('| Stránka | Porušení | Stav |');
  lines.push('|---|---|---|');
  for (const r of results) {
    const stav = r.error ? `⚠️ chyba` : (r.violations.length === 0 ? '✅ čisté' : `⚠️ ${r.violations.length}`);
    lines.push(`| \`${r.page}\` | ${r.error ? '—' : r.violations.length} | ${stav} |`);
  }
  lines.push('');
  // Agregace pravidel
  const byRule = new Map();
  for (const r of results) {
    for (const v of r.violations) {
      const k = v.id;
      if (!byRule.has(k)) byRule.set(k, { ...v, pages: [], totalNodes: 0 });
      const agg = byRule.get(k);
      agg.pages.push(r.page);
      agg.totalNodes += v.nodes;
    }
  }
  if (byRule.size) {
    lines.push('## Porušená pravidla (agregováno)');
    lines.push('');
    const sorted = [...byRule.values()].sort((a, b) => severityRank(b.impact) - severityRank(a.impact));
    for (const v of sorted) {
      lines.push(`### \`${v.id}\` — ${v.impact ?? 'n/a'}`);
      lines.push(`${v.help}  `);
      lines.push(`Dokumentace: ${v.helpUrl}  `);
      lines.push(`Výskyt: ${v.totalNodes} prvků na stránkách: ${[...new Set(v.pages)].map(p => `\`${p}\``).join(', ')}`);
      lines.push('');
    }
  } else {
    lines.push('Žádná porušení nenalezena. 🎉');
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('> Vygenerováno `tests/a11y/axe-scan.mjs`. Tento report slouží jako baseline pro postupné čištění (Proud A2/A3). Doplňkové WCAG 2.2 success criteria, které axe automaticky neověří (2.4.11 Focus Not Obscured, 2.5.7 Dragging, 2.5.8 Target Size, 3.2.6 Consistent Help), vyžadují manuální kontrolu — viz `docs/accessibility.md`.');
  lines.push('');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`\n[a11y] Report: ${outPath}`);
  console.log(`[a11y] Celkem porušení: ${totalViolations}`);

  if (CI && worstRank >= 3) {
    console.error('[a11y] CI gate: nalezena critical/serious porušení — fail.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('[a11y] FAIL:', err);
  process.exit(1);
});
