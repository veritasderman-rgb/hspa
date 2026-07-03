#!/usr/bin/env node
// Automatický týdenní newsletter (PROMPT_NEWSLETTER_ROUTINE.md jako kód).
// Spouští GitHub Actions každý čtvrtek (.github/workflows/newsletter-weekly.yml):
//
//   1. vybere 3–4 publikované články, které ještě nebyly v žádném vydání
//      (nejnovější; + max 1 starší „Z archivu"), a 1 indikátor pro úvod
//   2. nechá Claude (Florence) napsat úvod, anotace, subject a preheader
//      — včetně jazykových pravidel češtiny přímo v promptu
//   3. složí HTML přes scripts/newsletter-build.js (deterministický design)
//   4. založí kampaň v Brevu naplánovanou na nejbližší pátek 11:00
//      Europe/Prague (list 2 = všichni odběratelé) a ověří ji zpětným čtením
//   5. zapíše vydání do data/newsletter-log.json (workflow commitne do main)
//
// Env:
//   ANTHROPIC_API_KEY        povinné (krok 2)
//   BREVO_API_KEY            povinné (krok 4) — surový xkeysib-… klíč
//   NEWSLETTER_CLAUDE_MODEL  default claude-sonnet-4-6 (viz social/config.js —
//                            čeština + náklady)
//   BREVO_LIST_ID            default 2
//
// Flags:
//   --dry-run   vše kromě Brevo zápisu a logu (Claude se volá)
//   --offline   žádná API — canned texty; end-to-end test pipeline v CI/sandboxu
//
// Pojistky: min. 2 nové články jinak přeskočí týden; idempotence na pátek
// (druhé spuštění týž týden nic nezaloží); duplicita je horší než vynechání.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');           // 05_M1_Starter/
const SITE = 'https://skorezdravotnictvi.cz';
const LIST_ID = Number(process.env.BREVO_LIST_ID || 2);
const MODEL = process.env.NEWSLETTER_CLAUDE_MODEL || 'claude-sonnet-4-6';
const DRY = process.argv.includes('--dry-run');
const OFFLINE = process.argv.includes('--offline');

const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// ---------------------------------------------------------------- čas

/** Nejbližší pátek (striktně v budoucnu vůči `from`), jako YYYY-MM-DD. */
export function nextFridayYmd(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== 5);
  return d.toISOString().slice(0, 10);
}

/** Offset Europe/Prague pro daný den (řeší letní/zimní čas) — „+02:00". */
export function pragueOffset(ymd) {
  const probe = new Date(`${ymd}T11:00:00Z`);
  const tzName = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Prague', timeZoneName: 'longOffset' })
    .formatToParts(probe).find(p => p.type === 'timeZoneName')?.value ?? '';
  return tzName.match(/([+-]\d{2}:\d{2})/)?.[1] ?? '+01:00';
}

const CZ_MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const czDate = ymd => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d}. ${CZ_MONTHS[m - 1]} ${y}`;
};

// ------------------------------------------------------- výběr obsahu

export function pickArticles(articles, log, today) {
  const sent = new Set(log.campaigns.flatMap(c => c.articles || []));
  const candidates = articles
    .filter(a => a.published !== false && a.date && a.date <= today && a.slug && !sent.has(a.slug))
    .sort((a, b) => b.date.localeCompare(a.date));

  const fresh = candidates.slice(0, 3);
  if (candidates.length < 2) return { picked: [], archive: null };

  // „Z archivu": nejstarší neposlaný kus starší 60 dní; přednost pinned_essential.
  const cutoff = new Date(new Date(today).getTime() - 60 * 86400000).toISOString().slice(0, 10);
  const archivePool = candidates.slice(3).filter(a => a.date < cutoff);
  const archive = archivePool.find(a => a.pinned_essential) || archivePool.at(-1) || null;

  const picked = archive ? [...fresh, archive] : candidates.slice(0, 4);
  return { picked: picked.slice(0, 4), archive };
}

export function pickIndicator(indicators, log, heroArticle) {
  const recent = new Set(log.campaigns.slice(-4).map(c => c.featured_indicator).filter(Boolean));
  const usable = i => !recent.has(i.id) && i.value != null && i.benchmark
    && (i.benchmark.eu != null || i.benchmark.oecd != null) && i.direction !== 'context_dependent';
  // 1) indikátor propojený s hlavním článkem, 2) cokoli se signálem good/bad
  const linked = (heroArticle.linked_indicators || [])
    .map(id => indicators.find(i => i.id === id)).filter(Boolean).filter(usable);
  if (linked.length) return linked[0];
  return indicators.filter(usable).find(i => i.signal === 'bad' || i.signal === 'good') || null;
}

// ------------------------------------------------------------ Florence

const FLORENCE_SYSTEM = `Jsi Florence — transparentně označená AI autorka portálu skorezdravotnictvi.cz (Skóre zdravotnictví), pojmenovaná po Florence Nightingale. Píšeš úvodní slovo týdenního newsletteru a krátké anotace článků.

HLAS: první osoba, přirozená čeština, věcně ale s lehkostí; maximálně jeden jemný vtip na vydání. Žádné vykřičníky, žádná AI klišé („v dnešní uspěchané době", „pojďme se podívat"), žádný marketingový křik. Čísla vždy se zdrojem a rokem.

JAZYK (závazné): české uvozovky „takto", pomlčka –, desetinná čárka, mezera v tisících (10 000), % s mezerou, konzistentní vykání, jednotky s pevnou mezerou. Subject max 65 znaků, hlavní sdělení v jeho první polovině; preheader doplňuje, neopakuje.

Výstup: POUZE validní JSON bez code fence, přesně tvar:
{"subject":"…","previewText":"…","intro":{"heading":"…","paragraphs":["…","…","…"]},"annotations":{"<slug>":"…"}}
intro: 120–180 slov celkem, 2–4 odstavce — pozdrav; komentář hlavního článku (proč číst, jedna pointa/číslo, ne převyprávění); komentář indikátoru (hodnota + benchmark + rok lidskou řečí a co z toho plyne); krátké rozloučení podepsané „— Florence". annotations: pro KAŽDÝ slug 1–3 věty vlastními slovy (ne kopie perexu). V textech nepoužívej HTML kromě <strong> a <em>.`;

function florenceUserPrompt(picked, archive, indicator, fridayCz) {
  const lines = [`Vydání newsletteru vyjde v pátek ${fridayCz}. Články tohoto vydání (první = hlavní):`, ''];
  for (const a of picked) {
    lines.push(`- slug: ${a.slug}`);
    lines.push(`  titulek: ${a.title}`);
    lines.push(`  rubrika: ${a.tag || '—'} · datum: ${a.date}${archive && a.slug === archive.slug ? ' · TENTO JE „Z ARCHIVU"' : ''}`);
    lines.push(`  perex: ${a.perex || '—'}`);
  }
  if (indicator) {
    const bench = indicator.benchmark.eu != null
      ? `průměr EU ${indicator.benchmark.eu}` : `průměr OECD ${indicator.benchmark.oecd}`;
    lines.push('', `Indikátor pro úvod: ${indicator.name} — Česko ${indicator.value} ${indicator.unit || ''}, ${bench}, rok ${indicator.year}, zdroj ${indicator.source?.name || '—'}. Směr: ${indicator.direction === 'lower_is_better' ? 'nižší je lepší' : 'vyšší je lepší'}.`);
  }
  return lines.join('\n');
}

async function writeWithFlorence(picked, archive, indicator, fridayYmd) {
  if (OFFLINE) {
    return {
      subject: 'Testovací vydání — offline režim',
      previewText: 'Kontrolní sestavení newsletteru bez volání API.',
      intro: {
        heading: 'Dobrý den — tohle je zkušební sestavení.',
        paragraphs: [
          'Offline běh rutiny: texty jsou zástupné, pipeline je ostrá.',
          indicator ? `Indikátor týdne: ${indicator.name} — Česko ${indicator.value} ${indicator.unit || ''} (${indicator.year}).` : 'Bez indikátoru.',
          'Hezký víkend. — Florence',
        ],
      },
      annotations: Object.fromEntries(picked.map(a => [a.slug, (a.perex || a.title).slice(0, 180)])),
    };
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: FLORENCE_SYSTEM,
    messages: [{ role: 'user', content: florenceUserPrompt(picked, archive, indicator, czDate(fridayYmd)) }],
  });
  const text = message.content.map(b => b.text || '').join('').trim()
    .replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const out = JSON.parse(text);
  for (const f of ['subject', 'previewText', 'intro', 'annotations']) {
    if (!out[f]) throw new Error(`Florence: ve výstupu chybí "${f}"`);
  }
  if (out.subject.length > 78) out.subject = out.subject.slice(0, 75) + '…';
  return out;
}

// --------------------------------------------------------------- Brevo

async function brevo(pathname, init = {}) {
  const res = await fetch(`https://api.brevo.com/v3${pathname}`, {
    ...init,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${init.method || 'GET'} ${pathname} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

// ----------------------------------------------------------------- main

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const fridayYmd = nextFridayYmd();
  const scheduledAt = `${fridayYmd}T11:00:00.000${pragueOffset(fridayYmd)}`;

  const articlesData = readJson('data/articles.json');
  const articles = Array.isArray(articlesData) ? articlesData : articlesData.articles;
  const log = readJson('data/newsletter-log.json');
  const indicators = readJson('data/indicators.json').indicators;

  // Idempotence: na tenhle pátek už vydání existuje → konec.
  if (log.campaigns.some(c => (c.scheduled_for || '').startsWith(fridayYmd))) {
    console.log(`Vydání na pátek ${fridayYmd} už je v logu — nic nedělám.`);
    return;
  }

  const { picked, archive } = pickArticles(articles, log, today);
  if (picked.length < 2) {
    console.log(`Málo neposlaných článků (${picked.length}) — tento týden vydání přeskočeno.`);
    return;
  }
  const hero = picked[0];
  const indicator = pickIndicator(indicators, log, hero);

  console.log(`Vydání ${fridayYmd} (odeslání ${scheduledAt}):`);
  picked.forEach((a, i) => console.log(`  ${i + 1}. ${a.slug}${archive && a.slug === archive.slug ? ' [Z archivu]' : ''}${i === 0 ? ' [hero]' : ''}`));
  console.log(`  indikátor: ${indicator ? indicator.id : '—'}`);

  if (!OFFLINE && !process.env.ANTHROPIC_API_KEY) throw new Error('Chybí ANTHROPIC_API_KEY');
  if (!OFFLINE && !DRY && !process.env.BREVO_API_KEY) throw new Error('Chybí BREVO_API_KEY');

  const fl = await writeWithFlorence(picked, archive, indicator, fridayYmd);

  const spec = {
    subject: fl.subject,
    previewText: fl.previewText,
    edition_label: `týdenní přehled · ${czDate(fridayYmd)}`,
    intro: { kicker: 'Slovo Florence', heading: fl.intro.heading, paragraphs: fl.intro.paragraphs },
    articles: picked.map(a => ({
      kicker: `${a.tag || 'Analýza'} · ${czDate(a.date)}`,
      title: a.title,
      annotation: fl.annotations[a.slug] || (a.perex || '').slice(0, 200),
      url: `${SITE}/${a.slug}`,
      ...(archive && a.slug === archive.slug ? { badge: 'Z archivu' } : {}),
    })),
  };

  const tmpSpec = path.join(ROOT, 'data', '.newsletter-spec.tmp.json');
  fs.writeFileSync(tmpSpec, JSON.stringify(spec, null, 2));
  const html = execFileSync('node', [path.join(__dirname, 'newsletter-build.js'), tmpSpec], { encoding: 'utf8' });
  fs.unlinkSync(tmpSpec);
  console.log(`HTML sestaveno (${html.length} B), subject: „${fl.subject}"`);

  if (DRY || OFFLINE) {
    const out = path.join(ROOT, 'data', `.newsletter-preview-${fridayYmd}.html`);
    fs.writeFileSync(out, html);
    console.log(`${DRY ? 'Dry-run' : 'Offline'}: Brevo ani log se nemění. Náhled: ${out}`);
    return;
  }

  const created = await brevo('/emailCampaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: `HSPA newsletter — ${fridayYmd} (pátek)`,
      subject: fl.subject,
      previewText: fl.previewText,
      sender: { name: 'HSPA Monitor · Skóre zdravotnictví', email: 'josef@josefpavlovic.cz' },
      replyTo: 'josef@josefpavlovic.cz',
      htmlContent: html,
      recipients: { listIds: [LIST_ID] },
      scheduledAt,
    }),
  });
  const check = await brevo(`/emailCampaigns/${created.id}?excludeHtmlContent=true`);
  console.log(`Brevo kampaň #${created.id} — status ${check.status}, scheduledAt ${check.scheduledAt}, list ${JSON.stringify(check.recipients?.lists)}`);
  if (!['queued', 'scheduled'].includes(check.status)) {
    throw new Error(`Kampaň #${created.id} není naplánovaná (status ${check.status}) — zkontrolujte v Brevu.`);
  }

  log.campaigns.push({
    brevo_campaign_id: created.id,
    name: `HSPA newsletter — ${fridayYmd} (pátek)`,
    subject: fl.subject,
    scheduled_for: scheduledAt,
    articles: picked.map(a => a.slug),
    featured_indicator: indicator ? indicator.id : null,
  });
  fs.writeFileSync(path.join(ROOT, 'data', 'newsletter-log.json'), JSON.stringify(log, null, 2) + '\n');
  console.log('newsletter-log.json aktualizován. Do pátku 11:00 lze kampaň v Brevu zrušit či upravit.');
}

main().catch(err => { console.error('newsletter-run selhal:', err.message); process.exit(1); });
