#!/usr/bin/env node
// Cron-driven publisher: každý den projde data/articles.json a publikuje
// (nastaví published: true) všechny články se scheduled_for <= dnes.
//
// Spouští se přes GitHub Actions workflow .github/workflows/publish-articles.yml
// každý den v 04:00 UTC (= 06:00 CEST / 05:00 CET ráno).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTICLES = path.join(ROOT, 'data', 'articles.json');

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function main() {
  const data = JSON.parse(fs.readFileSync(ARTICLES, 'utf8'));
  const today = todayUtc();
  const published = [];
  const held = [];

  for (const a of data.articles) {
    if (!(a.published === false && a.scheduled_for && a.scheduled_for <= today)) continue;

    // Review hold: pokud audit označí článek jako review-pending nebo je přítomno
    // pole _review_note (explicitní redakční hold), cron jej nesmí auto-publikovat.
    // Republikaci musí provést člověk po manuálním schválení (nastavit published: true
    // a odebrat _review_note / přepnout audit.status na 'verified').
    const auditStatus = a.audit && a.audit.status;
    if (auditStatus === 'review-pending' || auditStatus === 'needs-rewrite' || auditStatus === 'flagged' || a._review_note) {
      held.push({ slug: a.slug, scheduled: a.scheduled_for, reason: a._review_note ? '_review_note' : `audit.status=${auditStatus}` });
      continue;
    }

    a.published = true;
    // scheduled_for ponecháváme pro audit (kdy byl článek publikován)
    // Pokud chcete pole odstranit po publikaci, odkomentujte:
    // delete a.scheduled_for;
    published.push({ slug: a.slug, title: a.title, scheduled: a.scheduled_for });
  }

  if (held.length > 0) {
    console.log(`[${today}] ${held.length} článek/ů zadrženo v review hold (nebudou auto-publikovány):`);
    for (const h of held) {
      console.log(`  - ${h.slug} (sched ${h.scheduled}, ${h.reason})`);
    }
  }

  if (published.length === 0) {
    console.log(`[${today}] Nic k publikaci.`);
    process.exit(0);
  }

  data.generated_at = new Date().toISOString();
  fs.writeFileSync(ARTICLES, JSON.stringify(data, null, 2) + '\n');

  console.log(`[${today}] Publikováno ${published.length} článek/ů:`);
  for (const p of published) {
    console.log(`  - ${p.slug} :: ${p.title} (sched ${p.scheduled})`);
  }
}

main();
