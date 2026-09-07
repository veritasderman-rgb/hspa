#!/usr/bin/env node
// Fronta evidence-auditu: které články a indikátory ověřit proti recenzované
// literatuře (PubMed / Consensus) a v jakém pořadí.
//
// Zdroj pravdy o tom, co už bylo ověřeno, je commitovaný registr
// data/evidence-audit.json (zapisuje ho orchestrace z PROMPT_EVIDENCE_AUDIT.md).
// Fronta samotná je odvozený artefakt — necommituje se, píše se do reports/
// (gitignored) a orchestrace si ji přepočítá na začátku každého běhu.
//
// Stav položky:
//   pending — v registru není (nikdy neověřeno)
//   stale   — v registru je, ale obsah se od kontroly změnil (content_hash),
//             nebo je kontrola starší než --max-age-days (default 365)
//   done    — ověřeno a obsah beze změny
//
// Priorita (vyšší = dřív):
//   článek:    3×odkazy na studie + 2×zmínky o studiích (strop 10) + ruční claims
//              + 2 (analysis) / 1 (explainer)
//   indikátor: 3 (HSPA framework) + oblast (Výsledky 3 … Struktury 0)
//              + navázané články (strop 8) + 1 bez literatury v kartě + zmínky (strop 3)
//
// CLI:
//   node scripts/evidence-audit-queue.js                      # report do reports/ + souhrn
//   node scripts/evidence-audit-queue.js --batch              # JSON dávky na stdout
//   node scripts/evidence-audit-queue.js --batch --articles 12 --indicators 8
//   node scripts/evidence-audit-queue.js --status             # jen počty
//   node scripts/evidence-audit-queue.js --hash clanek-x.html # content_hash souboru
//   Přepínače: --today YYYY-MM-DD, --all (i done), --max-age-days N, --out cesta

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { LITERATURE_LINK_HINTS } from './nightly-scan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, '..');

export const DEFAULT_MAX_AGE_DAYS = 365;
export const DEFAULT_BATCH = { articles: 12, indicators: 8 };

// Zmínky, které naznačují tvrzení opřené o výzkum (heuristika pro prioritu,
// ne pro ověření). „evidence" záměrně chybí — v češtině znamená i evidenci
// (registr), ne důkaz.
export const STUDY_MENTION_RE = /\b(studi[eíi]\w*|výzkum\w*|meta-?analýz\w*|systematick\w+\s+přehled\w*|randomizovan\w*|kohort\w*|klinick\w+\s+(?:studi|zkoušk)\w*|Lancet\w*|BMJ|NEJM|JAMA|Cochran\w*|PubMed)\b/giu;

const AREA_WEIGHT = { 'Výsledky': 3, 'Výstupy': 2, 'Procesy': 1, 'Struktury': 0 };
const STATUS_ORDER = { pending: 0, stale: 1, done: 2 };

export function contentHash(text) {
  return createHash('sha1').update(text).digest('hex');
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function countStudyMentions(text) {
  const m = text.match(STUDY_MENTION_RE);
  return m ? m.length : 0;
}

export function countLiteratureLinks(html) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map(m => m[1]);
  return hrefs.filter(u => LITERATURE_LINK_HINTS.some(h => u.includes(h))).length;
}

export function hasLiterature(text) {
  return /doi\.org\/|pubmed\.ncbi|PMID/i.test(text);
}

export function daysBetween(isoA, isoB) {
  const a = Date.parse(isoA), b = Date.parse(isoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** Stav položky vůči registru. */
export function itemStatus(entry, hash, today, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  if (!entry) return 'pending';
  if (entry.content_hash !== hash) return 'stale';
  const age = daysBetween(entry.checked_at, today);
  if (age == null || age > maxAgeDays) return 'stale';
  return 'done';
}

export function scoreArticle(signals, kind) {
  const kindBonus = kind === 'analysis' ? 2 : kind === 'explainer' ? 1 : 0;
  return signals.lit_links * 3
    + Math.min(signals.study_mentions, 10) * 2
    + signals.claims_manual
    + kindBonus;
}

export function scoreIndicator(signals, { framework, area }) {
  return (framework === 'hspa' ? 3 : 0)
    + (AREA_WEIGHT[area] ?? 0)
    + Math.min(signals.linked_articles, 8)
    + (signals.has_literature ? 0 : 1)
    + Math.min(signals.study_mentions, 3);
}

function reasonsArticle(s, status) {
  const r = [];
  if (status === 'stale') r.push('obsah se od poslední kontroly změnil');
  if (s.lit_links) r.push(`${s.lit_links}× odkaz na studii`);
  if (s.study_mentions) r.push(`${s.study_mentions}× zmínka o studii/výzkumu`);
  if (s.claims_manual) r.push(`${s.claims_manual} ručně ověřovaných tvrzení v claims`);
  if (!r.length) r.push('bez signálů — nízká priorita');
  return r;
}

function reasonsIndicator(s, status, framework) {
  const r = [];
  if (status === 'stale') r.push('karta se od poslední kontroly změnila');
  if (framework === 'hspa') r.push('HSPA indikátor');
  if (s.linked_articles) r.push(`${s.linked_articles} navázaných článků`);
  if (!s.has_literature) r.push('karta bez odkazu na literaturu');
  if (s.study_mentions) r.push(`${s.study_mentions}× zmínka o studii v kartě`);
  return r;
}

function sortItems(items) {
  return items.sort((a, b) =>
    (STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    || (b.priority - a.priority)
    || String(b.date ?? '').localeCompare(String(a.date ?? ''))
    || a.id.localeCompare(b.id, 'cs'));
}

/**
 * Sestaví frontu. Čistá vůči času — `today` se předává (default dnešek UTC).
 * @returns {{generated_for: string, articles: object[], indicators: object[], counts: object}}
 */
export function buildQueue({ root = DEFAULT_ROOT, today = new Date().toISOString().slice(0, 10), maxAgeDays = DEFAULT_MAX_AGE_DAYS } = {}) {
  const articlesAll = readJson(resolve(root, 'data/articles.json'), { articles: [] }).articles ?? [];
  const indicators = readJson(resolve(root, 'data/indicators.json'), { indicators: [] }).indicators ?? [];
  const claims = readJson(resolve(root, 'data/claims.json'), { claims: [] }).claims ?? [];
  const registry = readJson(resolve(root, 'data/evidence-audit.json'), { items: [] }).items ?? [];
  const byId = new Map(registry.map(e => [e.id, e]));

  const claimsByArticle = new Map();
  for (const c of claims) {
    if (!claimsByArticle.has(c.article)) claimsByArticle.set(c.article, []);
    claimsByArticle.get(c.article).push(c);
  }
  const linkedByIndicator = new Map();

  const articles = [];
  for (const a of articlesAll) {
    if (a.published === false) continue;
    if (!a.date || a.date > today) continue;
    const path = resolve(root, a.slug);
    if (!existsSync(path)) continue;
    for (const ind of a.linked_indicators ?? []) {
      linkedByIndicator.set(ind, (linkedByIndicator.get(ind) ?? 0) + 1);
    }
    const html = readFileSync(path, 'utf8');
    const text = stripTags(html);
    const cl = claimsByArticle.get(a.slug) ?? [];
    const signals = {
      lit_links: countLiteratureLinks(html),
      study_mentions: countStudyMentions(text),
      claims_total: cl.length,
      claims_manual: cl.filter(c => c.check === 'manual' || c.relation === 'external').length,
      linked_indicators: (a.linked_indicators ?? []).length,
    };
    const hash = contentHash(html);
    const entry = byId.get(a.slug);
    const status = itemStatus(entry, hash, today, maxAgeDays);
    articles.push({
      id: a.slug, type: 'article', path: a.slug, title: a.title, date: a.date,
      kind: a.kind, rubric: a.rubric, audit_status: a['audit-status'],
      content_hash: hash, signals, priority: scoreArticle(signals, a.kind), status,
      last_checked: entry?.checked_at ?? null, reasons: reasonsArticle(signals, status),
    });
  }

  const inds = [];
  for (const i of indicators) {
    const cardRel = `indicators/${i.id}.json`;
    const cardPath = resolve(root, cardRel);
    const cardText = existsSync(cardPath) ? readFileSync(cardPath, 'utf8') : JSON.stringify(i);
    let card = {};
    try { card = JSON.parse(cardText); } catch { card = {}; }
    const prose = [card.definition, card.method_notes, card.limitations, card.patient_story,
      card.benchmark_source?.note, card.data_source?.primary?.note].filter(Boolean).join(' ');
    const signals = {
      linked_articles: linkedByIndicator.get(i.id) ?? 0,
      has_literature: hasLiterature(cardText),
      study_mentions: countStudyMentions(prose),
    };
    const hash = contentHash(cardText);
    const id = `indicator:${i.id}`;
    const entry = byId.get(id);
    const status = itemStatus(entry, hash, today, maxAgeDays);
    inds.push({
      id, type: 'indicator', path: existsSync(cardPath) ? cardRel : null, indicator_id: i.id,
      title: i.name, area: i.area, domain: i.domain, framework: i.framework ?? null,
      content_hash: hash, signals, priority: scoreIndicator(signals, i), status,
      last_checked: entry?.checked_at ?? null, reasons: reasonsIndicator(signals, status, i.framework),
    });
  }

  sortItems(articles);
  sortItems(inds);
  const count = list => ({
    total: list.length,
    pending: list.filter(x => x.status === 'pending').length,
    stale: list.filter(x => x.status === 'stale').length,
    done: list.filter(x => x.status === 'done').length,
  });
  return { generated_for: today, articles, indicators: inds, counts: { articles: count(articles), indicators: count(inds) } };
}

/** Vybere další dávku: nejdřív pending, pak stale; done jen s includeDone. */
export function pickBatch(queue, { articles = DEFAULT_BATCH.articles, indicators = DEFAULT_BATCH.indicators, includeDone = false } = {}) {
  const take = (list, n) => list.filter(x => includeDone || x.status !== 'done').slice(0, Math.max(0, n));
  return [...take(queue.articles, articles), ...take(queue.indicators, indicators)];
}

function parseArgs(argv) {
  const o = { batch: false, status: false, all: false, articles: DEFAULT_BATCH.articles, indicators: DEFAULT_BATCH.indicators, maxAgeDays: DEFAULT_MAX_AGE_DAYS, today: null, out: null, hash: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--batch') o.batch = true;
    else if (a === '--status') o.status = true;
    else if (a === '--all') o.all = true;
    else if (a === '--articles') o.articles = Number(next());
    else if (a === '--indicators') o.indicators = Number(next());
    else if (a === '--max-age-days') o.maxAgeDays = Number(next());
    else if (a === '--today') o.today = next();
    else if (a === '--out') o.out = next();
    else if (a === '--hash') o.hash = next();
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.hash) {
    const p = resolve(process.cwd(), opts.hash);
    if (!existsSync(p)) { console.error(`Soubor nenalezen: ${opts.hash}`); process.exit(1); }
    console.log(contentHash(readFileSync(p, 'utf8')));
    return;
  }
  const queue = buildQueue({ today: opts.today ?? undefined, maxAgeDays: opts.maxAgeDays });
  if (opts.batch) {
    console.log(JSON.stringify(pickBatch(queue, { articles: opts.articles, indicators: opts.indicators, includeDone: opts.all }), null, 2));
    return;
  }
  const c = queue.counts;
  const line = (k, v) => `${k}: ${v.pending} čeká · ${v.stale} zastaralých · ${v.done} hotovo (z ${v.total})`;
  console.log(`Evidence-audit fronta k ${queue.generated_for}`);
  console.log(line('Články   ', c.articles));
  console.log(line('Indikátory', c.indicators));
  if (opts.status) return;
  const outPath = opts.out ? resolve(process.cwd(), opts.out) : resolve(DEFAULT_ROOT, 'reports', 'evidence-audit-queue.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(queue, null, 2) + '\n');
  console.log(`→ ${outPath}`);
  const top = pickBatch(queue, { articles: 5, indicators: 3 });
  console.log('\nDalší dávka (ukázka 5 + 3):');
  for (const t of top) console.log(`  [${t.status}] p=${t.priority} ${t.id} — ${t.reasons.join('; ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
