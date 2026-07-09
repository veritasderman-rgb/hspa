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
// (projde holdReason) a pole ještě nemá, publisher mu ho nastaví — seed z data
// vzniku (a.date v minulosti), jinak dnešek, aby šly nejstarší drafty ven dřív.
//
// Politika fronty „co je připraveno, jde ven": běžný draft z denní/noční
// rutiny je obsahově hotový a smí být automaticky publikován. Zadrží se jen
// články se SKUTEČNÝM problémem nebo viditelnou redakční poznámkou.
//
// Review hold — článek se NEpublikuje (a ani nestane kandidátem), pokud:
//   (a) má v articles.json _review_note nebo audit.status v HOLD množině
//       (flagged / draft-flagged / needs-rewrite — signalizují problém),
//   (b) jeho HTML má <meta article:audit-status> v HOLD množině, NEBO
//   (c) jeho HTML nese viditelné blokátory — „(DRAFT)" v <title>,
//       „draft" v article-meta-date, nebo <aside class="article-review-banner">.
// Takové články musí uvolnit člověk (odstranit banner / přenastavit status).
//
// Publikovaný článek dostane date = dnešek a status `draft` se povýší na
// `review-pending` (promoteStatusForPublish) — čtenář vidí banner „čeká na
// ověření", validátor publikační hygieny zůstává zelený (published článek
// nikdy nenese status draft), HTML se srovná na robots index (applyPublishToHtml).
// Uplatní se pravidlo viditelnosti v 06:00.
//
// Spouští se přes .github/workflows/publish-articles.yml každý den 04:00 UTC.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTICLES = path.join(ROOT, 'data', 'articles.json');

// Stavy, které cron NESMÍ auto-publikovat — signalizují SKUTEČNÝ problém a
// vyžadují člověka. Fronta se řídí pravidlem „co je připraveno, jde ven":
// běžný `draft` (obsahově hotový článek z denní/noční rutiny) i `review-pending`
// jsou publikovatelné. Zadržíme jen články s nalezeným problémem (`flagged`,
// `draft-flagged`) nebo explicitně vrácené k přepracování (`needs-rewrite`).
// `draft` se při publikaci automaticky povýší na `review-pending` (viz
// promoteStatusForPublish) — čtenář dostane férový banner „čeká na ověření"
// a validátor publikační hygieny zůstává zelený (publikovaný článek nikdy
// nenese status draft).
const HOLD_STATUSES = new Set(['draft-flagged', 'flagged', 'needs-rewrite']);

// Stav, na který se `draft` povýší v okamžiku automatické publikace.
const PUBLISH_STATUS = 'review-pending';

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
  // Interní procesní poznámka — nesmí do publikovaného článku (validátor ji
  // blokuje). Dokud v HTML je, drží článek ve frontě, i když status svádí ven.
  if (/<aside\s+class=["']article-review-banner["']/i.test(s)) draftMarkers.push('<aside article-review-banner>');

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
 * Povýší audit-status právě publikovaného článku v záznamu articles.json.
 * `draft` (nebo chybějící status) → `review-pending`, aby publikovaný článek
 * nikdy nenesl status `draft` (invariant validátoru publikační hygieny) a
 * čtenář dostal férový banner „čeká na ověření". `review-pending`, `partial`
 * a `verified` se nemění. Čistá funkce nad objektem záznamu.
 *
 * @param {object} article  záznam z articles.json (mutuje se in-place)
 * @returns {string|null}   nový status, pokud došlo ke změně; jinak null
 */
export function promoteStatusForPublish(article) {
  const current = article['audit-status'] ?? (article.audit && article.audit.status) ?? null;
  if (current && current !== 'draft') return null; // review-pending/partial/verified beze změny
  article['audit-status'] = PUBLISH_STATUS;
  if (article.audit && typeof article.audit === 'object') article.audit.status = PUBLISH_STATUS;
  return PUBLISH_STATUS;
}

/**
 * Přepíše HTML publikovaného článku do konzistentního stavu:
 *   - <meta article:audit-status> `draft` → `review-pending`
 *   - <meta robots> na `index, follow` (draft mohl být noindex)
 * Idempotentní; když soubor už sedí, nic nezapíše. Vrací seznam provedených
 * změn kvůli logu. Selhání (chybějící soubor) NESMÍ shodit publikaci — volá se
 * v try/catch v main().
 *
 * @param {string} htmlPath  absolutní cesta k HTML článku
 * @returns {string[]}       popis provedených úprav
 */
export function applyPublishToHtml(htmlPath) {
  const changes = [];
  let html = fs.readFileSync(htmlPath, 'utf8');

  const statusRe = /(<meta\s+name=["']article:audit-status["']\s+content=["'])draft(["'])/i;
  if (statusRe.test(html)) {
    html = html.replace(statusRe, `$1${PUBLISH_STATUS}$2`);
    changes.push(`audit-status draft→${PUBLISH_STATUS}`);
  }

  const robotsRe = /(<meta\s+name=["']robots["']\s+content=["'])[^"']*(["'])/i;
  if (robotsRe.test(html) && !/name=["']robots["']\s+content=["']index,\s*follow["']/i.test(html)) {
    html = html.replace(robotsRe, '$1index, follow$2');
    changes.push('robots→index, follow');
  }

  if (changes.length) fs.writeFileSync(htmlPath, html);
  return changes;
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

    // Článek je připravený → orazítkuj ready_since, pokud chybí. Seed z data
    // vzniku (a.date v minulosti), aby se nejstarší připravené drafty vydávaly
    // dřív než čerstvé; jinak dnešek.
    if (!a.ready_since) {
      a.ready_since = (a.date && a.date < today) ? a.date : today;
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
  const promoted = promoteStatusForPublish(winner); // draft → review-pending
  changed = true;

  // HTML do konzistentního publikovaného stavu (status + robots).
  let htmlChanges = [];
  try {
    htmlChanges = applyPublishToHtml(path.join(ROOT, winner.slug));
  } catch (e) {
    console.warn(`  ⚠ HTML článku se nepodařilo upravit (${e.message}) — publikováno, zkontroluj ručně.`);
  }

  data.generated_at = new Date().toISOString();
  fs.writeFileSync(ARTICLES, JSON.stringify(data, null, 2) + '\n');

  const reasonText = basis === 'topical'
    ? `nejaktuálnější (topical_until ${winner.topical_until})`
    : `nejdéle připraven (ready_since ${winner.ready_since})`;
  console.log(`[${today}] Publikováno 1 článek/ů (${candidates.length} kandidát/ů ve frontě):`);
  console.log(`  - ${winner.slug} :: ${winner.title} — ${reasonText}`);
  if (promoted) console.log(`    audit-status → ${promoted} (publikováno s bannerem „čeká na ověření")`);
  if (htmlChanges.length) console.log(`    HTML: ${htmlChanges.join(', ')}`);

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
