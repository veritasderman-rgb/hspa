// Generátor shrnutí článku pro sociální sítě.
//
// Pro každý článek vytvoří 4 verze (Facebook, Instagram, LinkedIn, X) přes
// Anthropic API. System prompt je sdílený, kontext článku je v user message
// označený cache_control — napříč 4 voláními se tak text článku cachuje
// (volání běží sériově, aby cache z 1. volání ohřála volání 2–4).
//
// CLI:
//   node social/generators/summary-generator.js <article-id>
//
// Vyžaduje ANTHROPIC_API_KEY (GitHub Secret / .env.local).

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts/base.js';
import facebook from './prompts/facebook.js';
import instagram from './prompts/instagram.js';
import linkedin from './prompts/linkedin.js';
import x from './prompts/x.js';

// claude-sonnet-4-6 — zvolen pro češtinu + náklady (projekt má strop ~€20/měs).
// Přepsatelné přes SOCIAL_CLAUDE_MODEL (např. claude-opus-4-7 pro max. kvalitu).
export const MODEL = process.env.SOCIAL_CLAUDE_MODEL || 'claude-sonnet-4-6';

export const NETWORKS = { facebook, instagram, linkedin, x };

// Tvrdý limit X (Twitter) na jeden tweet.
export const TWEET_LIMIT = 280;

/** Vrátí varování pro tweety přes limit (prázdné pole = vlákno je v pořádku). */
export function oversizedTweets(thread) {
  return thread
    .map((t, i) => ({ i, len: t.length }))
    .filter(t => t.len > TWEET_LIMIT)
    .map(t => `tweet ${t.i + 1}/${thread.length} má ${t.len} znaků (limit ${TWEET_LIMIT})`);
}

/** Sestaví kontext článku — stabilní blok sdílený všemi 4 voláními (cachuje se). */
export function buildArticleContext(article) {
  const lines = [
    'ČLÁNEK KE ZPRACOVÁNÍ',
    '',
    `Titulek: ${article.title}`,
    `Perex: ${article.perex}`,
    `URL: ${article.url}`,
  ];
  if (article.tag) lines.push(`Rubrika: ${article.tag}`);
  if (article.topics?.length) lines.push(`Témata: ${article.topics.join(', ')}`);

  if (article.keyStats?.length) {
    lines.push('', 'Klíčové statistiky z článku (čísla ověřená v textu):');
    for (const s of article.keyStats) {
      lines.push(`- ${s.display} — ${s.label}${s.foot ? ` (${s.foot})` : ''}`);
    }
  }

  if (article.linkedIndicators?.length) {
    lines.push('', 'Propojené indikátory (ověřená data z datového kontraktu HSPA):');
    for (const i of article.linkedIndicators) {
      const bench = i.benchmark
        ? ' · benchmark ' + Object.entries(i.benchmark).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')
        : '';
      lines.push(`- ${i.name}: ${i.value} ${i.unit ?? ''} (${i.year ?? '—'})${bench}`);
    }
  }

  lines.push('', 'Plný text článku:', article.fullText || '(text nedostupný)');
  return lines.join('\n');
}

function extractText(message) {
  return message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
}

/** Rozdělí výstup pro X na vlákno tweetů (oddělovač = řádek „---"). */
export function splitThread(text) {
  return text
    .split(/\n\s*---\s*\n/)
    .map(t => t.trim())
    .filter(Boolean);
}

/** Vygeneruje jednu verzi (jedna síť). */
export async function generateSummary(article, networkKey, { client, model = MODEL }) {
  const net = NETWORKS[networkKey];
  if (!net) throw new Error(`Neznámá síť: ${networkKey}`);

  const message = await client.messages.create({
    model,
    max_tokens: 1500,
    thinking: { type: 'disabled' },
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        // Kontext článku — identický napříč sítěmi → cache_control.
        { type: 'text', text: buildArticleContext(article), cache_control: { type: 'ephemeral' } },
        // Síťově specifické zadání — liší se, proto až za cachovaným blokem.
        { type: 'text', text: net.taskSpec },
      ],
    }],
  });

  const text = extractText(message);
  const result = { network: networkKey, label: net.label, text, usage: message.usage };
  if (networkKey === 'x') {
    result.thread = splitThread(text);
    // Tweety přes 280 znaků by selhaly při publikaci — označ je pro schvalovací krok.
    const warnings = oversizedTweets(result.thread);
    if (warnings.length) result.warnings = warnings;
  }
  return result;
}

/** Vygeneruje všechny 4 verze. Sériově — kvůli prompt cache. */
export async function generateAllSummaries(article, { apiKey = process.env.ANTHROPIC_API_KEY, model = MODEL } = {}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY není nastaven (GitHub Secret nebo .env.local).');
  const client = new Anthropic({ apiKey });

  const summaries = {};
  for (const key of Object.keys(NETWORKS)) {
    summaries[key] = await generateSummary(article, key, { client, model });
  }
  return summaries;
}

// --- CLI -------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const id = process.argv[2];
  if (!id) {
    console.error('Použití: node social/generators/summary-generator.js <article-id>');
    process.exit(1);
  }
  const { listVisibleArticles } = await import('../sources/article-detector.js');
  const article = listVisibleArticles().find(a => a.id === id);
  if (!article) {
    console.error(`Článek "${id}" nenalezen mezi viditelnými články.`);
    process.exit(1);
  }
  try {
    const summaries = await generateAllSummaries(article, { model: MODEL });
    for (const r of Object.values(summaries)) {
      console.log(`\n${'='.repeat(60)}\n${r.label}  (${r.text.length} znaků)\n${'='.repeat(60)}\n${r.text}`);
      for (const w of r.warnings ?? []) console.log(`  ⚠ ${w}`);
    }
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`Anthropic API chyba ${err.status}: ${err.message}`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}
