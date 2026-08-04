// Generované artefakty commitnuté do repa — smlouva mezi .gitattributes,
// `npm run build:generated` a drift guardy.
//
// Kontext: soubory označené v .gitattributes jako `merge=generated` se při
// merge/rebase neptají na konflikt — git vezme aktuální stranu. Výsledek je
// mezistav, který je potřeba přegenerovat. Aby se na to nedalo zapomenout,
// musí mít KAŽDÝ takový soubor drift guard (test, který selže, když neodpovídá
// zdrojům) a musí ho umět přegenerovat `npm run build:generated`.
//
// Tenhle soubor hlídá právě tu smlouvu + doplňuje drift guardy, které jinde
// nebyly (search-index.json, souvislosti.json). Ostatní mají vlastní testy:
//   diagnoza-index.json → tests/diagnoza-index.test.js
//   styles.min.css      → tests/css-min.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex } from '../scripts/build-search-index.js';
import { buildSouvislosti } from '../scripts/build-souvislosti.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const stripStamp = (doc) => JSON.stringify({ ...doc, generated_at: null });

/** Cesty s `merge=generated` z kořenového .gitattributes (relativně k 05_M1_Starter). */
function generatedPaths() {
  const raw = fs.readFileSync(path.join(REPO, '.gitattributes'), 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [pattern, ...attrs] = trimmed.split(/\s+/);
    if (!attrs.includes('merge=generated')) continue;
    assert.ok(
      pattern.startsWith('05_M1_Starter/'),
      `.gitattributes: „${pattern}“ leží mimo 05_M1_Starter — build:generated ho nepřegeneruje`,
    );
    out.push(pattern.slice('05_M1_Starter/'.length));
  }
  return out;
}

test('.gitattributes: každý merge=generated soubor umí přegenerovat npm run build:generated', () => {
  const pkg = readJson('package.json');
  const cmd = pkg.scripts['build:generated'];
  assert.ok(cmd, 'package.json postrádá skript build:generated');

  // Zdrojové soubory všech builderů zřetězených v build:generated.
  const builderSources = [...cmd.matchAll(/npm run ([\w:-]+)/g)]
    .map(([, name]) => pkg.scripts[name])
    .filter(Boolean)
    .flatMap((sub) => [...sub.matchAll(/(scripts\/[\w.-]+)/g)].map(([, file]) => file))
    .map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'));

  assert.ok(builderSources.length > 0, 'build:generated neodkazuje na žádný builder');

  const declared = generatedPaths();
  assert.ok(declared.length > 0, '.gitattributes neoznačuje žádný merge=generated soubor');

  for (const rel of declared) {
    assert.ok(
      fs.existsSync(path.join(ROOT, rel)),
      `.gitattributes odkazuje na neexistující soubor ${rel}`,
    );
    const name = path.basename(rel);
    assert.ok(
      builderSources.some((src) => src.includes(name)),
      `${rel} má merge=generated, ale žádný builder z build:generated ho nezapisuje — ` +
        'buď doplň builder, nebo atribut odeber (tiché převzetí jedné strany by ztratilo data)',
    );
  }
});

test('search-index.json je v syncu se zdroji (npm run build:search-index)', () => {
  const fresh = buildSearchIndex(readJson('data/articles.json'), (slug) => {
    const file = path.join(ROOT, slug);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  });
  assert.equal(
    stripStamp(fresh),
    stripStamp(readJson('data/search-index.json')),
    'data/search-index.json neodpovídá článkům — spusť `npm run build:search-index` a commitni výstup',
  );
});

test('souvislosti.json je v syncu se zdroji (npm run build:souvislosti)', () => {
  assert.equal(
    stripStamp(buildSouvislosti()),
    stripStamp(readJson('data/souvislosti.json')),
    'data/souvislosti.json neodpovídá zdrojům — spusť `npm run build:souvislosti` a commitni výstup',
  );
});
