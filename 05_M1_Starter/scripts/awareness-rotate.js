#!/usr/bin/env node
// Týdenní rotace „Týdnů zdraví" — deterministický cron krok.
//
// Microsite tyden.html i globální popup si aktivní týden vybírají samy podle
// dnešního data (interval start–end obsahuje dnešek) a statusu `ready`. Tenhle
// skript proto NEmění obsah — jen posouvá STAV záznamů v data/awareness-weeks.json:
//
//   1. ARCHIVACE: každý `ready`/`draft` týden, jehož `end` už je v minulosti,
//      se překlopí na `archived` (zmizí z popupu i z rozcestníku „Další týdny").
//   2. AKTIVACE: nejbližší nadcházející (nebo právě běžící) `draft`, jehož
//      start je do LEAD_DAYS dní a který je obsahově HOTOVÝ (projde
//      assessReadiness), se překlopí na `ready` — aby popup i microsite naskočily
//      včas. Za jeden běh se aktivuje nejvýše jeden týden.
//
// Obsah jednotlivých týdnů (copy, kontext, odkazy) připravuje člověk/agent
// předem jako `draft` (viz PROMPT_AWARENESS_ROUTINE.md). Tenhle skript je jen
// „přepínač" — nikdy nepíše text a nikdy neaktivuje nekompletní draft.
//
// Spouští se přes .github/workflows/awareness-weekly.yml (týdně).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REG = path.join(ROOT, 'data', 'awareness-weeks.json');

const DAY_MS = 86400000;
const LEAD_DAYS = 14; // jak dlouho před startem smí být draft aktivován

function day(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Článek je „viditelný" (naplní microsite), pokud není draft a jeho datum už
// nastalo. Zjednodušený subset isArticleVisible() — bez pravidla 06:00, které
// pro rozhodnutí o aktivaci týdne není podstatné.
export function isPublishedArticle(a, today) {
  if (!a) return false;
  if (a.published === false) return false;
  if (a.date && a.date > today) return false;
  return true;
}

// Je draft obsahově hotový, aby mohl jít na `ready`? Kritéria zrcadlí validátor
// (validate-awareness-weeks.js) a navíc žádají, aby microsite nebyla prázdná —
// aspoň jeden PUBLIKOVANÝ článek nebo aspoň jeden indikátor.
export function assessReadiness(week, ctx) {
  const reasons = [];
  const arts = week.linked_articles || [];
  const inds = week.linked_indicators || [];

  for (const s of arts) {
    if (!ctx.artById.has(s)) reasons.push(`článek '${s}' není v articles.json`);
    else if (ctx.root && !fs.existsSync(path.join(ctx.root, s))) reasons.push(`soubor '${s}' neexistuje`);
  }
  for (const i of inds) {
    if (!ctx.indIds.has(i)) reasons.push(`indikátor '${i}' není v indicators.json`);
  }
  for (const t of week.linked_prevention_themes || []) {
    if (!ctx.prevIds.has(t)) reasons.push(`prevence '${t}' není v prevention.json`);
  }

  const c = week.context;
  if (!c || !c.why || !Array.isArray(c.affects) || c.affects.length === 0 || !c.cz) {
    reasons.push('context (why/affects/cz) není kompletní');
  }
  const p = week.popup || {};
  if (!p.headline || !p.body || !p.cta) reasons.push('popup (headline/body/cta) není kompletní');
  if (!week.kicker || !week.title || !week.lead) reasons.push('kicker/title/lead není kompletní');

  const visibleArt = arts.some(s => isPublishedArticle(ctx.artById.get(s), ctx.today));
  if (!visibleArt && inds.length === 0) {
    reasons.push('microsite by byla prázdná — chybí publikovaný článek i indikátor');
  }

  return { ready: reasons.length === 0, reasons };
}

// Čistá rotace: dostane doc + dnešek + kontext (indexy) a vrátí mutovaný doc
// se seznamem změn. Aktivuje nejvýše jeden týden za běh.
export function rotate(doc, today, ctx, { leadDays = LEAD_DAYS } = {}) {
  const changes = [];
  const tday = day(today);

  // 1) Archivace doběhnutých
  for (const w of doc.weeks) {
    if ((w.status === 'ready' || w.status === 'draft') && Number.isFinite(day(w.end)) && day(w.end) < tday) {
      w.status = 'archived';
      changes.push({ id: w.id, action: 'archived' });
    }
  }

  // 2) Aktivace nejbližšího hotového draftu v okně LEAD_DAYS
  const candidates = doc.weeks
    .filter(w => w.status === 'draft' && Number.isFinite(day(w.end)) && day(w.end) >= tday)
    .filter(w => day(w.start) - tday <= leadDays * DAY_MS)
    .sort((a, b) => day(a.start) - day(b.start));

  for (const w of candidates) {
    const r = assessReadiness(w, { ...ctx, today });
    if (r.ready) {
      w.status = 'ready';
      changes.push({ id: w.id, action: 'activated' });
      break; // jeden za běh
    }
    changes.push({ id: w.id, action: 'skipped', reasons: r.reasons });
  }

  return { doc, changes };
}

/**
 * Synchronizace og:image v tyden.html s kampaňovým vizuálem aktuálního týdne.
 * Crawlery sociálních sítí neběží JS (client-side injekce je pro náhledy
 * k ničemu — Codex #900), takže statické HTML musí nést správný obrázek.
 * Meta tagy jsou označené data-aw-og="1"; hodnota = absolutní URL og_image
 * vybraného týdne (aktivní ready, jinak nejbližší nadcházející ready),
 * fallback brand og-default. Pure — testovatelné bez disku.
 *
 * @returns {{html: string, url: string, changed: boolean}}
 */
export function syncTydenOgImage(html, weeks, today) {
  const tday = day(today);
  const ready = (weeks || []).filter(w => w.status === 'ready'
    && Number.isFinite(day(w.start)) && Number.isFinite(day(w.end)));
  const active = ready.find(w => day(w.start) <= tday && tday <= day(w.end));
  const upcoming = ready.filter(w => day(w.start) > tday).sort((a, b) => day(a.start) - day(b.start))[0];
  const week = active || upcoming;
  const rel = (week && week.og_image) || 'assets/brand/og-default.png';
  const url = `https://skorezdravotnictvi.cz/${rel.replace(/^\//, '')}`;
  const out = html.replace(
    /(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")[^"]*("[^>]*data-aw-og="1")/g,
    `$1${url}$2`,
  );
  return { html: out, url, changed: out !== html };
}

function loadCtx() {
  const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const prevention = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  return {
    root: ROOT,
    artById: new Map((articles.articles || []).map(a => [a.slug, a])),
    indIds: new Set((indicators.indicators || []).map(i => i.id)),
    prevIds: new Set((prevention.themes || []).map(t => t.id)),
  };
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const doc = JSON.parse(fs.readFileSync(REG, 'utf8'));
  const ctx = loadCtx();
  const { changes } = rotate(doc, today, ctx);

  // og:image v tyden.html drž v syncu s aktuálním týdnem VŽDY (i bez změny
  // stavů) — kampaň mohla dostat nový vizuál mezi rotacemi.
  const tydenPath = path.join(ROOT, 'tyden.html');
  const tydenHtml = fs.readFileSync(tydenPath, 'utf8');
  const og = syncTydenOgImage(tydenHtml, doc.weeks, today);
  if (og.changed) {
    fs.writeFileSync(tydenPath, og.html);
    console.log(`og:image tyden.html → ${og.url}`);
  }

  const acted = changes.filter(c => c.action === 'archived' || c.action === 'activated');
  if (!acted.length) {
    console.log(`Rotace ${today}: žádná změna stavu.`);
    for (const s of changes.filter(c => c.action === 'skipped')) {
      console.log(`  - přeskočeno ${s.id}: ${s.reasons.join('; ')}`);
    }
    return;
  }

  doc.generated_at = new Date().toISOString();
  fs.writeFileSync(REG, JSON.stringify(doc, null, 2) + '\n');
  console.log(`Rotace ${today}: ${acted.length} změn.`);
  for (const c of acted) console.log(`  - ${c.action}: ${c.id}`);
  for (const s of changes.filter(c => c.action === 'skipped')) {
    console.log(`  - přeskočeno ${s.id}: ${s.reasons.join('; ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
