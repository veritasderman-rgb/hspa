// Detekce nově publikovaných článků pro distribuci na sociální sítě.
//
// Zdroj pravdy je data/articles.json + clanek-*.html v repu — žádný RSS,
// žádné polling webu. Nové články = ty, které jsou viditelné (published,
// datum v minulosti) a ještě nejsou v social/state/last-run.json.
//
// CLI:
//   node social/sources/article-detector.js           — detekce nových (vs. state)
//   node social/sources/article-detector.js --all      — všechny viditelné články
//   node social/sources/article-detector.js --json     — plný JSON výstup
//   node social/sources/article-detector.js --seed     — zapíše state se všemi
//                                                        aktuálně viditelnými ID
//
// Programově: import { detectNewArticles, markProcessed } from './article-detector.js'

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');               // 05_M1_Starter/
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');
const INDICATORS_JSON = resolve(ROOT, 'data/indicators.json');
const STATE_PATH = resolve(__dirname, '../state/last-run.json');

const SITE = 'https://skorezdravotnictvi.cz';

// --- Viditelnost článku (port z src/page-shared.js isArticleVisible) -------

/**
 * Wall-clock složky [rok, měsíc, den, hodina] daného okamžiku v zóně
 * Europe/Prague — nezávislé na časové zóně hostu. Detektor běží v GitHub
 * Actions (UTC), ale pravidlo publikace je v 06:00 českého času.
 */
function pragueParts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
  });
  const p = {};
  for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
  return [Number(p.year), Number(p.month), Number(p.day), Number(p.hour) % 24];
}

/**
 * Článek je viditelný, pokud je published a jeho release okamžik
 * (06:00 v Europe/Prague v den `date`) už nastal.
 */
export function isArticleVisible(article, now = new Date()) {
  if (!article || article.published === false) return false;
  const ds = article.date || article.published_at || article.scheduled_for;
  if (!ds) return true;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ds));
  if (!m) return true;
  const release = [Number(m[1]), Number(m[2]), Number(m[3]), 6];
  const current = pragueParts(now);
  for (let i = 0; i < 4; i++) {
    if (current[i] !== release[i]) return current[i] > release[i];
  }
  return true; // přesně 06:00 → viditelný
}

// --- Extrakce dat z HTML článku -------------------------------------------

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#8195;': ' ', '&#160;': ' ' };

function decodeEntities(s) {
  return s.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#8195;|&#160;/g, m => ENTITIES[m] || ' ')
          .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
          .replace(/&[a-z]+;/gi, ' ');
}

/**
 * KeyStat = strukturovaná statistika z .av-counter v článku.
 * Vrací { value, display, label, foot } — value je strojové číslo z data-value,
 * display je člověkem čitelná podoba (např. "11,2 %").
 */
export function extractKeyStats(html) {
  const re = /<span class="av-counter"[^>]*\bdata-value="([^"]*)"[^>]*>([\s\S]*?)<\/span>([\s\S]{0,500}?)<span class="av-counter-label">([\s\S]*?)<\/span>(?:\s*<span class="av-counter-foot">([\s\S]*?)<\/span>)?/g;
  const stats = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    // gap mezi counterem a labelem nesmí obsahovat další counter — jinak nepatří k sobě
    if (/<span class="av-counter"/.test(m[3])) continue;
    stats.push({
      value: m[1].trim(),
      display: decodeEntities(m[2]).replace(/<[^>]+>/g, '').trim(),
      label: decodeEntities(m[4]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      foot: m[5] ? decodeEntities(m[5]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null,
    });
  }
  return stats;
}

/** Plný text článku (obsah <article>, bez značek) pro vstup do Claude API. */
export function extractFullText(html) {
  const start = html.indexOf('<article');
  const end = html.lastIndexOf('</article>');
  let s = (start !== -1 && end !== -1) ? html.slice(start, end) : html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
       .replace(/<style[\s\S]*?<\/style>/gi, ' ')
       .replace(/<!--[\s\S]*?-->/g, ' ')
       .replace(/<[^>]+>/g, ' ');
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

// --- Sestavení Article objektu --------------------------------------------

function loadIndicatorMap() {
  if (!existsSync(INDICATORS_JSON)) return new Map();
  const list = JSON.parse(readFileSync(INDICATORS_JSON, 'utf8')).indicators ?? [];
  return new Map(list.map(i => [i.id, i]));
}

/** Ověřená čísla z propojených indikátorů (data/indicators.json). */
function resolveIndicators(ids, indicatorMap) {
  return (ids ?? []).map(id => {
    const i = indicatorMap.get(id);
    if (!i) return null;
    return {
      id: i.id, name: i.name, value: i.value, unit: i.unit,
      year: i.year, signal: i.signal, direction: i.direction,
      benchmark: i.benchmark ?? null,
    };
  }).filter(Boolean);
}

/**
 * Sestaví plný Article objekt z metadat v articles.json + HTML souboru.
 * Pole, na která navazuje generátor shrnutí a grafiky.
 */
export function buildArticle(raw, indicatorMap = loadIndicatorMap()) {
  const htmlPath = resolve(ROOT, raw.slug);
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  return {
    id: raw.id,
    slug: raw.slug,
    url: `${SITE}/${raw.slug.replace(/\.html$/, '')}`,
    number: raw.number ?? null,
    tag: raw.tag ?? null,
    date: raw.date ?? raw.scheduled_for ?? null,
    title: raw.title ?? '',
    perex: raw.perex ?? '',
    topics: raw.topics ?? [],
    linkedIndicators: resolveIndicators(raw.linked_indicators, indicatorMap),
    keyStats: html ? extractKeyStats(html) : [],
    fullText: html ? extractFullText(html) : '',
  };
}

// --- Stav posledního běhu --------------------------------------------------

export function loadState(statePath = STATE_PATH) {
  if (!existsSync(statePath)) return { last_run: null, processed_ids: [] };
  const s = JSON.parse(readFileSync(statePath, 'utf8'));
  return { last_run: s.last_run ?? null, processed_ids: s.processed_ids ?? [] };
}

export function saveState(state, statePath = STATE_PATH) {
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
}

/** Po úspěšné publikaci přidá ID do processed_ids. */
export function markProcessed(ids, statePath = STATE_PATH, now = new Date()) {
  const state = loadState(statePath);
  const set = new Set(state.processed_ids);
  for (const id of ids) set.add(id);
  const next = { last_run: now.toISOString(), processed_ids: [...set] };
  saveState(next, statePath);
  return next;
}

// --- Detekce ---------------------------------------------------------------

/** Všechny aktuálně viditelné články jako plné Article objekty. */
export function listVisibleArticles(now = new Date()) {
  const raw = JSON.parse(readFileSync(ARTICLES_JSON, 'utf8')).articles ?? [];
  const indicatorMap = loadIndicatorMap();
  return raw.filter(a => isArticleVisible(a, now)).map(a => buildArticle(a, indicatorMap));
}

/**
 * Nové články = viditelné a zatím nezpracované (nejsou v processed_ids).
 * Nemutuje stav — to dělá až markProcessed() po úspěšné publikaci.
 */
export function detectNewArticles({ now = new Date(), statePath = STATE_PATH } = {}) {
  const processed = new Set(loadState(statePath).processed_ids);
  return listVisibleArticles(now).filter(a => !processed.has(a.id));
}

// --- CLI -------------------------------------------------------------------

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const args = new Set(process.argv.slice(2));
  const now = new Date();

  if (args.has('--seed')) {
    const ids = listVisibleArticles(now).map(a => a.id);
    saveState({ last_run: now.toISOString(), processed_ids: ids });
    console.log(`Seed: ${ids.length} viditelných článků zapsáno jako zpracované do state/last-run.json`);
  } else {
    const articles = args.has('--all') ? listVisibleArticles(now) : detectNewArticles({ now });
    if (args.has('--json')) {
      console.log(JSON.stringify(articles, null, 2));
    } else {
      const label = args.has('--all') ? 'viditelných' : 'nových';
      console.log(`Detekováno ${articles.length} ${label} článků:\n`);
      for (const a of articles) {
        console.log(`  ${a.id}`);
        console.log(`    ${a.title}`);
        console.log(`    ${a.url}  ·  ${a.date}  ·  ${a.tag ?? '—'}`);
        console.log(`    keyStats: ${a.keyStats.length}  ·  indikátory: ${a.linkedIndicators.length}  ·  text: ${a.fullText.length} znaků`);
        console.log('');
      }
    }
  }
}
