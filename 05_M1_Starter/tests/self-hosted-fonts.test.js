// Písma a vložený podcast vs. CSP webu.
//
// Kontext: styles.css importoval písma z fonts.googleapis.com, ale CSP ve
// vercel.json (style-src 'self', default-src 'self') cizí původ nepouští —
// Inter ani Source Serif 4 se na produkci nikdy nenačetly a web běžel na
// záložních písmech. Podobně tlačítko podcastu vkládá iframe z Google Drive,
// který bez frame-src zůstal prázdný. Test drží obojí pohromadě: co stránka
// načítá, musí CSP dovolit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

test('styles.css nenačítá nic z cizího původu', () => {
  assert.doesNotMatch(css, /@import\s+url\(\s*['"]?https?:/i, 'externí @import CSP zablokuje');
  assert.doesNotMatch(css, /url\(\s*['"]?https?:\/\//i, 'externí url() CSP zablokuje');
});

test('každý soubor z @font-face existuje v assets/fonts', () => {
  const files = [...css.matchAll(/url\('\.\.\/(assets\/fonts\/[^']+)'\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 4, 'čekám latin + latin-ext pro Inter i Source Serif 4');
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f)), `chybí ${f}`);
  for (const fam of ['Inter', 'Source Serif 4']) {
    assert.match(css, new RegExp(`@font-face\\s*{[^}]*font-family:\\s*'${fam}'`), `chybí @font-face pro ${fam}`);
  }
});

test('samostatný web pohotovostí si písma bere s sebou', async () => {
  const { ASSET_FILES } = await import('../scripts/build-pohotovosti-site.js');
  const files = [...css.matchAll(/url\('\.\.\/(assets\/fonts\/[^']+)'\)/g)].map((m) => m[1]);
  for (const f of files) assert.ok(ASSET_FILES.includes(f), `${f} není v ASSET_FILES`);
});

test('CSP dovolí iframe podcastu, který stránky vkládají', () => {
  const catchAll = vercel.headers.find((r) => r.source.startsWith('/((?!'));
  const csp = catchAll.headers.find((h) => h.key === 'Content-Security-Policy').value;
  const hosts = new Set();
  for (const page of ['hspa-prehled.html', 'o-projektu.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/data-podcast-src="(https:\/\/[^/"]+)/g)) hosts.add(m[1]);
  }
  assert.ok(hosts.size > 0, 'čekám aspoň jeden vložený podcast');
  const frameSrc = /frame-src ([^;]+)/.exec(csp)?.[1] ?? '';
  for (const h of hosts) assert.ok(frameSrc.split(/\s+/).includes(h), `frame-src nepouští ${h}`);
});
