// Nastaví lokální git pro práci s generovanými artefakty.
//
//   npm run setup:git
//
// Proč: .gitattributes označuje generované soubory (search-index.json,
// diagnoza-index.json, souvislosti.json, styles.min.css) jako `merge=generated`.
// Git ale merge drivery nepřenáší klonem — bez tohohle nastavení atribut nic
// nedělá a merge/rebase se na nich pořád zastaví konfliktem.
//
// Driver je `true`: shellový příkaz, který uspěje a nechá %A (aktuální stranu)
// beze změny. Merge tím projde bez konfliktu a výsledek je mezistav —
// po merge je potřeba `npm run build:generated`. Drift testy hlídají,
// že se na to nezapomene.
//
// Skript je idempotentní a NIKDY neselže tvrdě: pouští se i z `postinstall`,
// kde nemusí být git repo (Vercel, tarball, CI bez .git) — v takovém případě
// jen tiše skončí, aby nerozbil instalaci.

import { execFileSync } from 'node:child_process';

// Pořadí záleží: `merge.generated.name` bez `driver` není měkký fallback,
// ale tvrdé „fatal: custom merge driver generated lacks command line“.
// Driver proto vždy první — half-configured stav pak nemůže vzniknout.
const CONFIG = [
  ['merge.generated.driver', 'true'],
  ['merge.generated.name', 'generovaný artefakt — vezmi aktuální stranu, pak přegeneruj'],
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function main() {
  try {
    git(['rev-parse', '--git-dir']);
  } catch {
    // Není git repo (Vercel build, stažený tarball) — nic k nastavení.
    return;
  }

  const changed = [];
  for (const [key, value] of CONFIG) {
    let current = null;
    try {
      current = git(['config', '--local', '--get', key]);
    } catch {
      // klíč zatím není nastaven
    }
    if (current === value) continue;
    git(['config', '--local', key, value]);
    changed.push(key);
  }

  if (changed.length) {
    console.log(`setup:git — nastaveno: ${changed.join(', ')}`);
  } else {
    console.log('setup:git — merge driver „generated“ je už nastaven.');
  }
}

try {
  main();
} catch (err) {
  // Nikdy neshazuj npm install kvůli konfiguraci pohodlí.
  console.warn(`setup:git — přeskočeno (${err.message})`);
}
