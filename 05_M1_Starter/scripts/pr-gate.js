#!/usr/bin/env node
// Vydavatelská brána — mechanické zařazení PR do třídy A / B / C (GOVERNANCE.md § 3).
//
// Třídu určují výhradně dotčené CESTY (a u HTML stránek i to, zda soubor vzniká
// nebo mizí). Žádný úsudek, žádné čtení diffu: brána musí být tak hloupá, aby se
// nikdo — ani model — nemohl „uargumentovat" do nižší třídy. Třída PR = nejvyšší
// třída mezi jeho soubory. Neznámá cesta = C (co není zařazené, čeká na člověka).
//
//   A · auto    — mechanické datové změny bez nového čtenářského textu; merguje editor po zelené CI
//   B · editor  — obsah, indikátory, kód, docs; merguje editor po adversariální revizi
//   C · člověk  — ústava, prompty, workflows, osoby, pohotovosti, nové stránky, závislosti…; merguje jen Josef Pavlovic
//
//   node scripts/pr-gate.js --base origin/main [--head HEAD] [--json|--markdown]
//   node scripts/pr-gate.js --files A path1 M path2 …    (name-status dvojice, pro testy a ruční kontrolu)
//
// Cesty jsou relativní ke KOŘENI repozitáře (jak je dává `git diff --name-status`).

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TRIDY = ['A', 'B', 'C'];
export const LABELS = { A: 'brana-auto', B: 'brana-editor', C: 'brana-clovek' };
export const POPIS = {
  A: 'auto — merge po zelené CI (editor, bez obsahové revize)',
  B: 'editor — adversariální revize nezávislým editorem, pak merge',
  C: 'člověk — čeká na Josefa Pavlovice; editor nemerguje',
};

const S = '05_M1_Starter/';

// Pořadí má význam: první shoda vyhrává. Specifické před obecným, C před B před A.
// `status` omezuje pravidlo na git status (A = přidán, M = změněn, D = smazán, R = přejmenován).
export const PRAVIDLA = [
  // ---- C · člověk -------------------------------------------------------------
  { trida: 'C', id: 'ustava',        test: p => p === 'GOVERNANCE.md' },
  { trida: 'C', id: 'prompty',       test: p => /^PROMPT_[^/]+\.md$/.test(p) || /^05_M1_Starter\/PROMPT_[^/]+\.md$/.test(p) },
  { trida: 'C', id: 'agent-config',  test: p => p === 'CLAUDE.md' || p.startsWith('.claude/') || p.startsWith('.github/') || p === '.gitattributes' },
  { trida: 'C', id: 'planovac',      test: p => p === 'docs/scheduled-sessions.md' },
  { trida: 'C', id: 'kill-switch',   test: p => p === `${S}data/ai-provoz.json` },
  { trida: 'C', id: 'osoby',         test: p => /^05_M1_Starter\/data\/(barometr|ppo-coi|ppo|ppo-osoby)\.json$/.test(p) || p.startsWith(`${S}data/ppo-analyza/`) || p.startsWith(`${S}ingest/ppo/`) },
  { trida: 'C', id: 'pohotovosti',   test: p => /^05_M1_Starter\/data\/(pohotovosti[^/]*|dojezdy|obce-gps)\.json$/.test(p) || /^05_M1_Starter\/pohotovost(i|-[^/]+)\.html$/.test(p) || p === `${S}sw-pohotovosti.js` || /^05_M1_Starter\/src\/pohotovosti[^/]*\.js$/.test(p) },
  { trida: 'C', id: 'zavislosti',    test: p => /^05_M1_Starter\/package(-lock)?\.json$/.test(p) || /(^|\/)vercel\.json$/.test(p) || /(^|\/)\.env/.test(p) },
  { trida: 'C', id: 'soukromi',      test: p => /^05_M1_Starter\/src\/(page-shared|analytics[^/]*|schema)\.js$/.test(p) },
  { trida: 'C', id: 'nova-stranka',  status: ['A', 'R'], test: p => /^05_M1_Starter\/[^/]+\.html$/.test(p) && !/^05_M1_Starter\/(clanek|indikator)-[^/]+\.html$/.test(p) },
  { trida: 'C', id: 'smazany-obsah', status: ['D'],      test: p => /^05_M1_Starter\/(clanek-[^/]+\.html|indicators\/[^/]+\.json)$/.test(p) },

  // ---- A · auto (před B, protože jde o konkrétní soubory uvnitř data/) ---------------------
  { trida: 'A', id: 'radar',         status: ['M'], test: p => p === `${S}data/legislativa.json` },
  { trida: 'A', id: 'cerstvost',     test: p => p === `${S}data/freshness.json` || /^05_M1_Starter\/data\/snapshot-\d{4}-\d{2}-\d{2}\.json$/.test(p) },
  { trida: 'A', id: 'covery',        test: p => p.startsWith(`${S}assets/covers/`) },
  { trida: 'A', id: 'statistiky',    test: p => /^05_M1_Starter\/data\/(ga4-stats|site-stats)[^/]*\.json$/.test(p) },

  // ---- B · editor ------------------------------------------------------------------------
  { trida: 'B', id: 'clanek',        test: p => /^05_M1_Starter\/clanek-[^/]+\.html$/.test(p) },
  { trida: 'B', id: 'indikator-str', test: p => /^05_M1_Starter\/indikator-[^/]+\.html$/.test(p) },
  { trida: 'B', id: 'hub-stranka',   status: ['M'], test: p => /^05_M1_Starter\/[^/]+\.html$/.test(p) },
  { trida: 'B', id: 'karty',         test: p => p.startsWith(`${S}indicators/`) },
  { trida: 'B', id: 'data',          test: p => p.startsWith(`${S}data/`) },
  { trida: 'B', id: 'kod',           test: p => p.startsWith(`${S}src/`) || p.startsWith(`${S}ingest/`) || p.startsWith(`${S}scripts/`) || p.startsWith(`${S}tests/`) || p.startsWith(`${S}social/`) || p.startsWith(`${S}e2e/`) },
  { trida: 'B', id: 'assety',        test: p => p.startsWith(`${S}assets/`) },
  { trida: 'B', id: 'feed-sitemap',  test: p => /^05_M1_Starter\/(feed\.xml|sitemap\.xml|robots\.txt|manifest\.webmanifest)$/.test(p) },
  { trida: 'B', id: 'dokumentace',   test: p => p.startsWith('docs/') || /\.md$/.test(p) },
];

export function zaradSoubor(file, status = 'M') {
  const st = (status || 'M')[0].toUpperCase();
  for (const r of PRAVIDLA) {
    if (r.status && !r.status.includes(st)) continue;
    if (r.test(file)) return { file, status: st, trida: r.trida, pravidlo: r.id };
  }
  return { file, status: st, trida: 'C', pravidlo: 'nezarazeno' };
}

export function classify(entries) {
  // entries: [{file, status}] nebo ["path", …]
  const polozky = entries.map(e => (typeof e === 'string' ? zaradSoubor(e) : zaradSoubor(e.file, e.status)));
  const trida = polozky.reduce((max, p) => (TRIDY.indexOf(p.trida) > TRIDY.indexOf(max) ? p.trida : max), polozky.length ? 'A' : 'B');
  return { trida, label: LABELS[trida], popis: POPIS[trida], polozky };
}

export function diffEntries(base, head = 'HEAD', cwd) {
  const out = execFileSync('git', ['diff', '--name-status', '--find-renames', `${base}...${head}`], { cwd, encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map(line => {
    const parts = line.split('\t');
    const status = parts[0][0];
    // u přejmenování (R100\told\tnew) bereme nový název
    return { status, file: parts[parts.length - 1] };
  });
}

export function markdown(result) {
  const lines = [
    `## Brána PR: třída ${result.trida} — ${result.popis}`,
    '',
    `Label: \`${result.label}\` · soubory: ${result.polozky.length}`,
    '',
    '| Třída | Pravidlo | Soubor |',
    '|---|---|---|',
  ];
  const sorted = [...result.polozky].sort((a, b) => TRIDY.indexOf(b.trida) - TRIDY.indexOf(a.trida) || a.file.localeCompare(b.file));
  for (const p of sorted) lines.push(`| ${p.trida} | ${p.pravidlo} | \`${p.file}\` (${p.status}) |`);
  if (result.trida === 'C') {
    lines.push('', 'Rozhodující soubory třídy C: ' + sorted.filter(p => p.trida === 'C').map(p => `\`${p.file}\``).join(', '));
    lines.push('', 'Podle GOVERNANCE.md § 3 tento PR merguje jen Josef Pavlovic. Editor ho ponechá otevřený.');
  }
  return lines.join('\n') + '\n';
}

function parseFilesArg(argv) {
  const i = argv.indexOf('--files');
  if (i === -1) return null;
  const rest = argv.slice(i + 1).filter(a => !a.startsWith('--'));
  const entries = [];
  for (let k = 0; k < rest.length; k += 1) {
    if (/^[AMDR]$/.test(rest[k]) && rest[k + 1]) { entries.push({ status: rest[k], file: rest[k + 1] }); k += 1; }
    else entries.push({ status: 'M', file: rest[k] });
  }
  return entries;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = n => { const i = argv.indexOf(n); return i === -1 ? undefined : argv[i + 1]; };
  let entries = parseFilesArg(argv);
  if (!entries) {
    const base = get('--base') || 'origin/main';
    const head = get('--head') || 'HEAD';
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    entries = diffEntries(base, head, root);
  }
  const result = classify(entries);
  if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else if (argv.includes('--markdown')) process.stdout.write(markdown(result));
  else {
    console.log(`Třída ${result.trida} (${result.label}) — ${result.popis}`);
    for (const p of result.polozky) console.log(`  ${p.trida}  ${p.pravidlo.padEnd(14)} ${p.status}  ${p.file}`);
  }
  if (argv.includes('--label-only')) console.log(result.label);
}
