#!/usr/bin/env node
/**
 * convert-article.mjs — převod clanek-*.html → knižní Markdown
 * ============================================================
 * Součást export balíčku `kniha-export/` pro knihu „Skóre zdravotnictví 2026".
 *
 * CO DĚLÁ
 *   Vezme vybrané články webu (clanek-*.html v 05_M1_Starter/) a převede je do
 *   čistého Markdownu vhodného pro knižní sazbu. Odstraní web-only prvky (nav,
 *   share, TOC, related, scripts, cover meta) a ponechá jen redakční tělo:
 *   nadpis, perex, sekce, odstavce, seznamy, citace, zdroje, datový rámec.
 *   Interaktivní / vizuální komponenty (.av-*, .article-databox) NEROZKRESLUJE —
 *   nechává na jejich místě strukturovanou značku [[GRAF: …]] / [[BOX: …]],
 *   kterou sazeč napáruje na `03-grafy-spec.md` a `grafika/`.
 *
 * VSTUP
 *   podklady/article-manifest.json — seznam vybraných článků, jejich pořadí,
 *   díl (dimenze) a cílová kapitola. Formát viz article-manifest.json.
 *
 * VÝSTUP
 *   manuskript/dil-<n>-<dim>/<NN>-<slug>.md  (jedna kapitola = jeden článek)
 *
 * SPUŠTĚNÍ (z adresáře 05_M1_Starter/, kde jsou clanek-*.html a node_modules):
 *   node ../kniha-export/podklady/convert-article.mjs
 *   node ../kniha-export/podklady/convert-article.mjs --only=manifest-reforma-zdravotnictvi
 *   node ../kniha-export/podklady/convert-article.mjs --list      # jen vypíše plán
 *
 * ZÁVISLOSTI: cheerio (už je v 05_M1_Starter/node_modules).
 *
 * POZNÁMKA: výstup je REDAKČNÍ DRAFT, ne finální sazba. Knižní redakce (krácení,
 * mezititulky, propojení kapitol) probíhá až nad Markdownem nebo v Affinity.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = resolve(__dirname, '..');            // kniha-export/
const SITE_DIR = resolve(EXPORT_DIR, '..', '05_M1_Starter'); // web s clanek-*.html

// cheerio je v 05_M1_Starter/node_modules — načíst odtamtud (ne z podklady/)
const requireFromSite = createRequire(pathToFileURL(join(SITE_DIR, 'package.json')));
const cheerio = requireFromSite('cheerio');
const MANIFEST = join(__dirname, 'article-manifest.json');
const OUT_DIR = join(EXPORT_DIR, 'manuskript');

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
const listOnly = args.includes('--list');

// ---- pomocné převodní funkce -------------------------------------------------

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Inline HTML uzel → Markdown (strong/em/a/code/br). */
function inline($, el) {
  let out = '';
  $(el).contents().each((_, node) => {
    if (node.type === 'text') { out += node.data; return; }
    const tag = node.tagName?.toLowerCase();
    const inner = inline($, node);
    if (tag === 'strong' || tag === 'b') out += `**${inner.trim()}**`;
    else if (tag === 'em' || tag === 'i') out += `*${inner.trim()}*`;
    else if (tag === 'code') out += `\`${inner.trim()}\``;
    else if (tag === 'br') out += '  \n';
    else if (tag === 'a') {
      const href = $(node).attr('href') || '';
      const isInternal = href.startsWith('#') || href.startsWith('clanek-') ||
        href.startsWith('/') || href.includes('skorezdravotnictvi');
      // interní odkazy v knize nedávají smysl jako URL → jen text (+ pozn. pro křížové odkazy)
      out += isInternal ? inner : `[${inner.trim()}](${href})`;
    } else out += inner;
  });
  return out;
}

/** Blokový převod tělesa článku. */
function convertBody($, $body) {
  const parts = [];
  $body.children().each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    const cls = $el.attr('class') || '';

    // Vizuální / interaktivní komponenty → značka pro sazeče
    if (cls.includes('av-') || cls.includes('article-databox') ||
        cls.includes('article-figure') || tag === 'figure' ||
        $el.find('.av-timeline, .av-bar, .av-counter, .av-flow, .av-table').length) {
      const label = clean($el.find('h3, h4, .av-title, figcaption, caption').first().text())
        || clean($el.attr('aria-label')) || 'vizuální prvek';
      const kind = cls.includes('databox') ? 'BOX-DATA'
        : cls.includes('av-timeline') ? 'GRAF-TIMELINE'
        : cls.includes('av-bar') ? 'GRAF-BAR'
        : cls.includes('av-counter') ? 'ČÍSLO'
        : cls.includes('av-flow') ? 'SCHÉMA'
        : cls.includes('av-table') ? 'TABULKA' : 'GRAF';
      // zachovat textový obsah boxu jako podklad
      const txt = clean($el.text());
      parts.push(`\n> [[${kind}: ${label}]]\n> _Podklad:_ ${txt.slice(0, 600)}${txt.length > 600 ? '…' : ''}\n> _Sazba: viz 03-grafy-spec.md + grafika/. Interaktivní → statika + QR._\n`);
      return;
    }
    if (cls.includes('article-review-banner') || cls.includes('editorial-note') ||
        cls.includes('article-toc') || cls.includes('article-share') ||
        cls.includes('deep-dive')) return; // web-only, do knihy nepatří

    if (/^h[1-6]$/.test(tag)) {
      const level = tag === 'h2' ? '##' : tag === 'h3' ? '###' : '####';
      parts.push(`\n${level} ${clean(inline($, el))}\n`);
    } else if (tag === 'p') {
      const t = inline($, el).trim();
      if (t) parts.push(`${t}\n`);
    } else if (tag === 'ul' || tag === 'ol') {
      $el.children('li').each((i, li) => {
        const bullet = tag === 'ol' ? `${i + 1}.` : '-';
        parts.push(`${bullet} ${inline($, li).trim()}`);
      });
      parts.push('');
    } else if (tag === 'blockquote') {
      parts.push(`\n> ${clean(inline($, el))}\n`);
    } else if (tag === 'aside' || tag === 'section' || tag === 'div') {
      // rekurze do neoznačených kontejnerů
      const sub = convertBody($, $el);
      if (sub.trim()) parts.push(sub);
    }
  });
  return parts.join('\n');
}

function convertArticle(entry) {
  const file = join(SITE_DIR, `clanek-${entry.slug}.html`);
  if (!existsSync(file)) return { error: `chybí soubor clanek-${entry.slug}.html` };
  const $ = cheerio.load(readFileSync(file, 'utf8'));
  const $art = $('article.article-page').first();

  const title = clean($art.find('h1.article-title, h1').first().text());
  const tags = $art.find('.article-tags .article-tag, .article-tags a')
    .map((_, e) => clean($(e).text())).get().filter(Boolean);
  const lead = clean($art.find('.article-lead, .article-perex, .manifest-hero-headline + p').first().text());

  const $body = $art.find('.article-body').first();
  const body = $body.length ? convertBody($, $body) : '';

  // zdroje
  const sources = $art.find('.article-sources li, .article-sources p')
    .map((_, e) => clean($(e).text())).get().filter(Boolean);

  // front-matter kapitoly
  const fm = [
    '---',
    `slug: ${entry.slug}`,
    `dil: ${entry.dil}`,
    `poradi: ${entry.poradi}`,
    `audit: ${entry.audit || '?'}`,
    tags.length ? `stitky: ${tags.join(', ')}` : null,
    '---',
  ].filter(Boolean).join('\n');

  const md = [
    fm,
    ``,
    `# ${title}`,
    ``,
    lead ? `**${lead}**\n` : '',
    body,
    sources.length ? `\n---\n\n### Zdroje\n\n${sources.map(s => `- ${s}`).join('\n')}` : '',
    ``,
    `<!-- Zdroj webu: clanek-${entry.slug}.html · skorezdravotnictvi.cz/clanek-${entry.slug} -->`,
  ].join('\n');

  return { md, title, words: body.split(/\s+/).length };
}

// ---- běh ---------------------------------------------------------------------

if (!existsSync(MANIFEST)) {
  console.error(`✗ Chybí ${MANIFEST}. Vytvoř manifest (viz 02-obsah-struktura.md).`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let entries = manifest.chapters || [];
if (only) entries = entries.filter(e => e.slug === only);

console.log(`Plán: ${entries.length} kapitol → ${OUT_DIR}\n`);
let ok = 0, fail = 0;
for (const e of entries) {
  const dirName = `dil-${e.dil}`;
  if (listOnly) { console.log(`  ${dirName}/${String(e.poradi).padStart(2, '0')}-${e.slug}.md`); continue; }
  const res = convertArticle(e);
  if (res.error) { console.warn(`  ✗ ${e.slug}: ${res.error}`); fail++; continue; }
  const outSub = join(OUT_DIR, dirName);
  mkdirSync(outSub, { recursive: true });
  const outFile = join(outSub, `${String(e.poradi).padStart(2, '0')}-${e.slug}.md`);
  writeFileSync(outFile, res.md);
  console.log(`  ✓ ${dirName}/${String(e.poradi).padStart(2, '0')}-${e.slug}.md  (~${res.words} slov) — ${res.title}`);
  ok++;
}
if (!listOnly) console.log(`\nHotovo: ${ok} převedeno, ${fail} chyb.`);
