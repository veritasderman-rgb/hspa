// Pojistka proti tvrzením v článcích, která stojí na neověřeném seedu (docs/seed-audit.md).
//
// Tvrzení z data/claims.json s indicator_id a relation exact | derived opakuje hodnotu
// nebo benchmark indikátoru. Je-li ten indikátor v data/indicators.json seed
// (source.origin: "seed") a nikdo ho neověřil (verification_status ≠ "verified"),
// číslo v článku nemá oporu ve zdroji — přesně tak se do textů dostaly CT 28 na milion
// nebo délka hospitalizace 7 dní. Kontrola bere i drafty, protože publikační cron je
// vydává bez dalšího PR.
//
// Stávající případy drží baseline data/seed-claims-baseline.json. Nové tvrzení mimo
// baseline neprojde: indikátor nejdřív ověř, nebo tvrzení navaž jinak. Baseline se
// smí jen zmenšovat — položku, která už seed nepoužívá, odstraní:
//   node ingest/validate-seed-claims.js --update

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(ROOT, 'data', 'seed-claims-baseline.json');

export function isUnverifiedSeed(ind) {
  return Boolean(ind) && ind.source?.origin === 'seed' && ind.verification_status !== 'verified';
}

/* id tvrzení, která opakují hodnotu nebo benchmark neověřeného seedu */
export function seedClaims(claims, indicators) {
  const byId = new Map(indicators.map((i) => [i.id, i]));
  return claims
    .filter((c) => c.indicator_id && (c.relation === 'exact' || c.relation === 'derived'))
    .filter((c) => isUnverifiedSeed(byId.get(c.indicator_id)))
    .map((c) => c.id)
    .sort();
}

/* porovná aktuální stav s baseline: nové = chyba, zmizelé = baseline je potřeba zmenšit */
export function compareBaseline(current, baseline) {
  const base = new Set(baseline);
  const cur = new Set(current);
  return {
    added: current.filter((id) => !base.has(id)),
    stale: baseline.filter((id) => !cur.has(id)),
  };
}

function main() {
  const claims = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'claims.json'), 'utf8')).claims || [];
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8')).indicators || [];
  const current = seedClaims(claims, indicators);
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).claims || [] : [];
  const { added, stale } = compareBaseline(current, baseline);

  if (process.argv.includes('--update')) {
    if (added.length) {
      console.error(`FAIL: --update baseline jen zmenšuje; ${added.length} nových tvrzení na neověřeném seedu:`);
      added.forEach((id) => console.error('  -', id));
      process.exit(1);
    }
    const next = baseline.filter((id) => !stale.includes(id));
    const doc = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    fs.writeFileSync(BASELINE, JSON.stringify({ ...doc, claims: next }, null, 2) + '\n');
    console.log(`OK: baseline zmenšena o ${stale.length} na ${next.length} tvrzení.`);
    return;
  }

  const byId = new Map(claims.map((c) => [c.id, c]));
  let fail = false;
  if (added.length) {
    fail = true;
    console.error(`FAIL: ${added.length} tvrzení stojí na neověřeném seedu (docs/seed-audit.md). Ověř indikátor proti zdroji, nebo tvrzení neopírej o seed:`);
    added.forEach((id) => console.error(`  - ${id} → ${byId.get(id)?.indicator_id}`));
  }
  if (stale.length) {
    fail = true;
    console.error(`FAIL: ${stale.length} položek baseline už seed nepoužívá. Zmenši baseline: node ingest/validate-seed-claims.js --update`);
    stale.forEach((id) => console.error('  -', id));
  }
  if (fail) process.exit(1);
  console.log(`OK: žádné nové tvrzení na neověřeném seedu (baseline ${baseline.length}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
