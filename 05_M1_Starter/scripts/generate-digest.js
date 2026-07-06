// Generátor týdenního newsletter digestu — markdown DRAFT pro redakci.
// NIC neodesílá: výstup je reports/digest-RRRR-MM-DD.md, který redakce
// zkopíruje do Breva (kampaň se zakládá v Brevu; signup viz newsletter-signup.js).
//
// Obsah digestu:
//   1. Co se změnilo v datech — diff aktuálního data/indicators.json proti
//      snapshotu před ~7 dny (změna hodnoty, signálu, nové verifikace).
//   2. Nové články za posledních 7 dní (viditelné, dle articles.json).
//   3. Stav verifikace (kolik Ověřeno / Předběžné / Ilustrativní).
//
// Použití:
//   node scripts/generate-digest.js              # zapíše report
//   node scripts/generate-digest.js --stdout     # jen vypíše
//   node scripts/generate-digest.js --days=14    # jiné okno

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE_BASE = 'https://hspa-cesko.cz';

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? true;
    }
  }
  return out;
}

function isoDaysAgo(days, from = new Date()) {
  return new Date(from.getTime() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Najde snapshot nejbližší (≤) zadanému datu; vrací {date, file} nebo null. */
export function findSnapshotOnOrBefore(targetIso, dir = resolve(ROOT, 'data')) {
  const re = /^snapshot-(\d{4}-\d{2}-\d{2})\.json$/;
  const candidates = readdirSync(dir)
    .map(f => f.match(re))
    .filter(Boolean)
    .map(m => m[1])
    .filter(d => d <= targetIso)
    .sort();
  if (!candidates.length) return null;
  const date = candidates[candidates.length - 1];
  return { date, file: resolve(dir, `snapshot-${date}.json`) };
}

function effStatus(i) {
  const v = i.verification_status;
  if (['verified', 'preliminary', 'illustrative'].includes(v)) return v;
  if (v) return 'preliminary';
  return i.source?.origin === 'seed' ? 'illustrative' : 'preliminary';
}

/**
 * Diff dvou seznamů indikátorů → { valueChanges, signalChanges, newlyVerified }.
 */
export function diffIndicators(oldList, newList) {
  const oldById = new Map((oldList ?? []).map(i => [i.id, i]));
  const valueChanges = [];
  const signalChanges = [];
  const newlyVerified = [];
  for (const n of newList ?? []) {
    const o = oldById.get(n.id);
    if (!o) continue;
    if (o.value !== n.value && n.value != null) {
      valueChanges.push({ id: n.id, name: n.name, from: o.value, to: n.value, unit: n.unit ?? '', year: n.year });
    }
    if (o.signal !== n.signal && n.signal) {
      signalChanges.push({ id: n.id, name: n.name, from: o.signal, to: n.signal });
    }
    if (effStatus(o) !== 'verified' && effStatus(n) === 'verified') {
      newlyVerified.push({ id: n.id, name: n.name, value: n.value, unit: n.unit ?? '', year: n.year });
    }
  }
  return { valueChanges, signalChanges, newlyVerified };
}

function fmt(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
}

export function buildDigest({ indicators, snapshot, snapshotDate, articles, today, days }) {
  const lines = [];
  lines.push(`# HSPA Monitor — týdenní digest (${today})`);
  lines.push('');
  lines.push(`> DRAFT pro newsletter — zkopírovat do Breva po redakční kontrole.`);
  lines.push('');

  // 1) Nové články
  const since = isoDaysAgo(days, new Date(`${today}T12:00:00Z`));
  const fresh = (articles ?? [])
    .filter(a => a.published !== false && a.date && a.date > since && a.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  lines.push(`## Nové články (${fresh.length})`);
  lines.push('');
  if (fresh.length) {
    for (const a of fresh) {
      lines.push(`- **[${a.title}](${SITE_BASE}/${a.slug})** (${a.date})`);
      if (a.perex) lines.push(`  ${String(a.perex).slice(0, 220)}${a.perex.length > 220 ? '…' : ''}`);
    }
  } else {
    lines.push('_Žádný nový článek v okně._');
  }
  lines.push('');

  // 2) Změny v datech
  const diff = diffIndicators(snapshot?.indicators, indicators);
  lines.push(`## Co se změnilo v datech (proti snapshotu ${snapshotDate ?? '—'})`);
  lines.push('');
  if (diff.newlyVerified.length) {
    lines.push(`### Nově ověřené indikátory (${diff.newlyVerified.length})`);
    for (const c of diff.newlyVerified) {
      lines.push(`- **${c.name}** — ${fmt(c.value)} ${c.unit} (${c.year ?? '?'}) · [detail](${SITE_BASE}/indikator-${c.id}.html)`);
    }
    lines.push('');
  }
  if (diff.signalChanges.length) {
    lines.push(`### Změny signálu (${diff.signalChanges.length})`);
    for (const c of diff.signalChanges) {
      lines.push(`- **${c.name}**: ${c.from} → **${c.to}** · [detail](${SITE_BASE}/indikator-${c.id}.html)`);
    }
    lines.push('');
  }
  if (diff.valueChanges.length) {
    lines.push(`### Změny hodnot (${diff.valueChanges.length})`);
    for (const c of diff.valueChanges.slice(0, 15)) {
      lines.push(`- ${c.name}: ${fmt(c.from)} → **${fmt(c.to)}** ${c.unit} (${c.year ?? '?'})`);
    }
    if (diff.valueChanges.length > 15) lines.push(`- … a ${diff.valueChanges.length - 15} dalších`);
    lines.push('');
  }
  if (!diff.newlyVerified.length && !diff.signalChanges.length && !diff.valueChanges.length) {
    lines.push('_Beze změn v datovém kontraktu._');
    lines.push('');
  }

  // 3) Stav verifikace
  const counts = { verified: 0, preliminary: 0, illustrative: 0 };
  for (const i of indicators ?? []) counts[effStatus(i)] += 1;
  lines.push('## Stav verifikace dat');
  lines.push('');
  lines.push(`Ověřeno **${counts.verified}** · Předběžné **${counts.preliminary}** · Ilustrativní **${counts.illustrative}** (celkem ${indicators?.length ?? 0} indikátorů)`);
  lines.push('');
  lines.push(`---`);
  lines.push(`_Vygeneroval scripts/generate-digest.js · ${SITE_BASE} · odhlášení v patičce newsletteru._`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const days = Number(args.days ?? 7);
  const today = new Date().toISOString().slice(0, 10);

  const indicators = JSON.parse(readFileSync(resolve(ROOT, 'data/indicators.json'), 'utf8')).indicators ?? [];
  const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8')).articles ?? [];
  const snap = findSnapshotOnOrBefore(isoDaysAgo(days));
  const snapshot = snap ? JSON.parse(readFileSync(snap.file, 'utf8')) : null;

  const md = buildDigest({ indicators, snapshot, snapshotDate: snap?.date, articles, today, days });

  if (args.stdout) {
    console.log(md);
    return;
  }
  const dir = resolve(ROOT, 'reports');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const out = resolve(dir, `digest-${today}.md`);
  writeFileSync(out, md);
  console.log(`Digest: reports/digest-${today}.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
