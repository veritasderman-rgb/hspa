// Builder vazeb archivu Věstníků MZ na indikátory: z data/vestniky.json
// a pravidel ingest/mapping/vestniky_souvislosti.json staví malý soubor
// data/vestniky-vazby.json, který lazy-loadují detail indikátoru (box
// „Úřední rámec") a archiv věstníků (názvy skupin pro badge u položek).
// Deterministický — stejné vstupy ⇒ stejný výstup; drift hlídá test.
//
// Spuštění: node ingest/build-vestniky-vazby.js  (npm run build:vestniky:vazby)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmpCastkyDesc } from './lib/vestniky-sort.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MAX_NA_KLIC = 12;

/** Sestaví vazby (čistá funkce — testovatelná). */
export function buildVazby(vestniky, mapping, skupinyNazvy) {
  const polozky = [];
  for (const c of vestniky.castky) {
    for (const o of c.obsah) {
      // rok/číslo nesou chronologii (uvnitř řady) — c.datum je u starých
      // ročníků datum migrace na web MZ; napříč řadami (NIKEZ) řadí komparátor
      // podle data, viz ingest/lib/vestniky-sort.js
      polozky.push({ c: c.id, titul: c.titul, rok: c.rok, cislo: c.cislo, datum: c.datum, url: c.url, pdf: c.pdf, t: o.t });
    }
  }
  const match = rules => Object.fromEntries(rules.map(r => {
    const re = new RegExp(r.re, 'i');
    const hits = polozky.filter(p => re.test(p.t))
      .sort(cmpCastkyDesc)
      .slice(0, MAX_NA_KLIC)
      .map(({ datum, ...rest }) => rest);
    return [r.g ?? r.id, hits];
  }).filter(([, hits]) => hits.length));

  return {
    version: '1.0',
    zdroj: 'data/vestniky.json × ingest/mapping/vestniky_souvislosti.json',
    pozn: 'Deterministické prolinkování obsahu Věstníků MZ: indikatory → box „Úřední rámec" '
      + 'na detailu indikátoru; skupiny_nazvy → popisky badge v archivu. Vazby jsou '
      + 'navigační pomůcka podle klíčových slov, ne úplný výčet.',
    skupiny_nazvy: skupinyNazvy,
    indikatory: match(mapping.indikatory ?? []),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const vestniky = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vestniky.json'), 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'vestniky_souvislosti.json'), 'utf8'));
  const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
  const gids = new Set((mapping.skupiny ?? []).map(r => r.g));
  const nazvy = Object.fromEntries(ppo.skupiny.filter(s => gids.has(s.id)).map(s => [s.id, s.nazev]));
  for (const g of gids) if (!nazvy[g]) throw new Error(`vestniky_souvislosti: skupina ${g} v ppo.json není`);
  const out = buildVazby(vestniky, mapping, nazvy);
  const p = path.join(ROOT, 'data', 'vestniky-vazby.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 1) + '\n');
  console.log(`✓ data/vestniky-vazby.json (${(fs.statSync(p).size / 1024).toFixed(0)} kB, `
    + `${Object.keys(out.indikatory).length} indikátorů)`);
}
