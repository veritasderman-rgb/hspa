#!/usr/bin/env node
// Cron-driven publisher: každý den vybere a publikuje NEJVÝŠE JEDEN článek
// z fronty připravených článků v data/articles.json.
//
// Výběrové pravidlo (každý běh projde VŠECHNY články včetně nově přidaných):
//   1. Kandidát = článek s published:false, který je připravený (projde
//      review hold, viz holdReason) a u kterého scheduled_for (pokud je
//      vyplněno) už nastalo — scheduled_for funguje jako „ne dřív než".
//   2. Mají-li někteří kandidáti pole topical_until (datum, do kdy je téma
//      aktuální), vyhrává ten s NEJBLIŽŠÍM topical_until — aby šel ven dřív,
//      než ztratí aktuálnost.
//   3. Nemá-li žádný kandidát topical_until, vyhrává ten, který je
//      NEJDÉLE PŘIPRAVEN — nejstarší ready_since.
//   Rozhodování při shodě: ready_since → scheduled_for → slug.
//
// ready_since se orazítkuje automaticky: jakmile je článek poprvé připraven
// (projde holdReason) a pole ještě nemá, publisher mu nastaví dnešní datum.
//
// Review hold — článek se NEpublikuje (a ani nestane kandidátem), pokud:
//   (a) má v articles.json _review_note nebo audit.status v HOLD množině,
//   (b) jeho HTML má <meta article:audit-status> v HOLD množině, NEBO
//   (c) jeho HTML nese viditelné draft markery — „(DRAFT)" v <title>,
//       „DRAFT" v masthead-score, „draft" v article-meta-date.
// Takové články musí publikovat člověk po ručním schválení.
//
// Publikovaný článek dostane date = dnešek (zobrazí se s aktuálním datem
// a uplatní se pravidlo viditelnosti v 06:00).
//
// Spouští se přes .github/workflows/publish-articles.yml každý den 04:00 UTC.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTICLES = path.join(ROOT, 'data', 'articles.json');

// Stavy, které cron NESMÍ auto-publikovat — vyžadují člověka.
// (Publikovatelné bez zásahu jsou pouze 'verified' a 'partial'.)
const HOLD_STATUSES = new Set(['draft', 'draft-flagged', 'flagged', 'review-pending', 'needs-rewrite']);

const FAR_FUTURE = '9999-99-99';

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Posoudí HTML článku (čistá funkce). Vrací audit-status z meta tagu
 * a seznam viditelných draft markerů.
 */
export function assessHtml(html) {
  const s = String(html || '');
  const meta = /<meta\s+name=["']article:audit-status["']\s+content=["']([^"']+)["']/i.exec(s);
  const htmlStatus = meta ? meta[1].trim() : null;

  const draftMarkers = [];
  const title = /<title>([^<]*)<\/title>/i.exec(s);
  if (title && /\(DRAFT/i.test(title[1])) draftMarkers.push('"(DRAFT)" v <title>');
  // Pozn.: dříve se hledalo i `<span class="masthead-score">DRAFT` — masthead-score
  // span byl ale odstraněn z všech publikovaných HTML, takže marker je
  // strukturálně nedosažitelný. Zachováváme dva nezávislé markery (title +
  // article-meta-date).
  if (/class="article-meta-date">\s*draft\b/i.test(s)) draftMarkers.push('"draft" v article-meta-date');

  return { htmlStatus, draftMarkers };
}

/**
 * Vrátí důvod, proč článek zadržet v review holdu, nebo null pokud je
 * připraven k automatické publikaci. Čistá funkce.
 *
 * @param {object} article  záznam z articles.json
 * @param {string} html     obsah příslušného HTML souboru článku
 */
export function holdReason(article, html) {
  if (article._review_note) return '_review_note';

  const jsonStatus = article.audit && article.audit.status;
  if (HOLD_STATUSES.has(jsonStatus)) return `articles.json audit.status=${jsonStatus}`;

  const { htmlStatus, draftMarkers } = assessHtml(html);
  if (HOLD_STATUSES.has(htmlStatus)) return `HTML audit-status=${htmlStatus}`;
  if (draftMarkers.length) return `draft markery v HTML (${draftMarkers.join('; ')})`;

  return null;
}

/**
 * Z fronty kandidátů vybere JEDEN článek k publikaci. Čistá funkce.
 *
 * Kandidáti = připravené články, u kterých scheduled_for už nastalo.
 * Pravidlo: nejdřív aktuálnost (nejbližší topical_until), jinak nejdéle
 * připravený (nejstarší ready_since).
 *
 * @param {Array<object>} candidates
 * @returns {{ article: object, basis: 'topical'|'queue' } | null}
 */
export function pickArticleToPublish(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const topical = candidates.filter(a => a.topical_until);
  const basis = topical.length ? 'topical' : 'queue';
  const pool = topical.length ? topical : candidates;
  const key = (v) => String(v == null ? FAR_FUTURE : v);

  const sorted = [...pool].sort((a, b) => {
    if (basis === 'topical') {
      const t = key(a.topical_until).localeCompare(key(b.topical_until));
      if (t) return t;
    }
    const r = key(a.ready_since).localeCompare(key(b.ready_since));
    if (r) return r;
    const s = key(a.scheduled_for).localeCompare(key(b.scheduled_for));
    if (s) return s;
    return String(a.slug || '').localeCompare(String(b.slug || ''));
  });

  return { article: sorted[0], basis };
}

/**
 * Vygeneruje náhledovou grafiku (SVG + PNG) pro právě publikovaný článek a
 * injektuje OG/Twitter meta tagy + <img class="article-cover"> do jeho HTML.
 *
 * Dynamický import — generátor závisí na @resvg/resvg-js; nechceme ho tahat
 * při importu tohoto modulu z testů. Selhání coveru NESMÍ shodit publikaci:
 * článek je už označen jako published a articles.json zapsán, cover je
 * doplňková grafika, kterou lze kdykoli přegenerovat.
 *
 * @param {object} article  právě publikovaný článek (published:true, date=dnes)
 */
async function generateAndInjectCover(article) {
  try {
    const { generateCover } = await import('../ingest/scripts/generate-article-cover.js');
    const { processArticle: injectCover } = await import('../ingest/scripts/inject-article-covers.js');
    const { processArticle: injectSeo } = await import('../ingest/scripts/inject-article-seo.js');
    const { svgPath, pngPath } = generateCover(article, { writeFiles: true });
    const r = injectCover(article);
    // Strukturovaná data + canonical/og:url do <head> (statická, kvůli GEO).
    const seo = injectSeo(article);
    console.log(`  ✓ náhledová grafika: ${path.basename(svgPath)} + ${path.basename(pngPath)} (HTML: ${r.status}, SEO: ${seo.status})`);
  } catch (e) {
    console.warn(`  ⚠ náhledovou grafiku se nepodařilo vygenerovat (${e.message}) — článek publikován bez ní, lze dogenerovat ručně.`);
  }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(ARTICLES, 'utf8'));
  const today = todayUtc();
  let changed = false;

  const candidates = [];   // připravené + scheduled_for už nastalo
  const waiting = [];      // připravené, ale scheduled_for v budoucnu
  const held = [];         // zadržené review holdem

  for (const a of data.articles) {
    if (a.published !== false) continue;

    const file = a.slug ? path.join(ROOT, a.slug) : null;
    if (!file || !fs.existsSync(file)) {
      held.push({ slug: a.slug, reason: 'HTML soubor nenalezen' });
      continue;
    }

    const reason = holdReason(a, fs.readFileSync(file, 'utf8'));
    if (reason) {
      held.push({ slug: a.slug, reason });
      continue;
    }

    // Článek je připravený → orazítkuj ready_since, pokud chybí.
    if (!a.ready_since) {
      a.ready_since = today;
      changed = true;
    }

    // scheduled_for funguje jako „ne dřív než".
    if (a.scheduled_for && a.scheduled_for > today) {
      waiting.push(a);
      continue;
    }
    candidates.push(a);
  }

  const pick = pickArticleToPublish(candidates);

  if (held.length > 0) {
    console.log(`[${today}] ${held.length} článek/ů zadrženo v review hold:`);
    for (const h of held) console.log(`  · ${h.slug} (${h.reason})`);
  }
  if (waiting.length > 0) {
    console.log(`[${today}] ${waiting.length} článek/ů čeká na scheduled_for:`);
    for (const w of waiting) console.log(`  · ${w.slug} (scheduled_for ${w.scheduled_for})`);
  }

  if (!pick) {
    if (changed) {
      data.generated_at = new Date().toISOString();
      fs.writeFileSync(ARTICLES, JSON.stringify(data, null, 2) + '\n');
      console.log(`[${today}] Nic k publikaci — orazítkováno ready_since.`);
    } else {
      console.log(`[${today}] Nic k publikaci.`);
    }
    process.exit(0);
  }

  const { article: winner, basis } = pick;
  winner.published = true;
  winner.date = today; // článek se zveřejní s dnešním datem (pravidlo 06:00)
  changed = true;

  data.generated_at = new Date().toISOString();
  fs.writeFileSync(ARTICLES, JSON.stringify(data, null, 2) + '\n');

  const reasonText = basis === 'topical'
    ? `nejaktuálnější (topical_until ${winner.topical_until})`
    : `nejdéle připraven (ready_since ${winner.ready_since})`;
  console.log(`[${today}] Publikováno 1 článek/ů (${candidates.length} kandidát/ů ve frontě):`);
  console.log(`  - ${winner.slug} :: ${winner.title} — ${reasonText}`);

  // Náhledová grafika se generuje až teď — s aktuálním datem publikace.
  await generateAndInjectCover(winner);
}

// main() jen při přímém spuštění — kvůli importu z testů.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
