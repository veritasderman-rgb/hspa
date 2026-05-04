// Transform vrstva: harmonizace surových dat z fetcherů + výpočet finálních indikátorů.
// V M1 pouze stub. Plná implementace v M5.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Vypočte semafor (good/warn/bad) podle hodnoty a benchmarku.
 * @param {number} value — naše hodnota
 * @param {number} benchmark — referenční hodnota (typicky OECD průměr)
 * @param {'higher_is_better'|'lower_is_better'|'context_dependent'} direction
 * @param {{good: number, warn: number}} thresholds — procenta
 * @returns {'good'|'warn'|'bad'|'neutral'}
 */
export function computeSignal(value, benchmark, direction, thresholds) {
  if (value == null || benchmark == null) return 'neutral';
  if (direction === 'context_dependent') return 'neutral';
  const diff = ((value - benchmark) / benchmark) * 100;
  const adjusted = direction === 'higher_is_better' ? diff : -diff;
  if (adjusted > thresholds.good) return 'good';
  if (adjusted < -thresholds.warn) return 'bad';
  return 'warn';
}

/**
 * Načte všechny metodické karty z indicators/.
 */
export function loadMethodCards() {
  const dir = path.join(ROOT, 'indicators');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const content = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    content._method_card_path = `indicators/${f}`;
    return content;
  });
}

/**
 * Hlavní transform funkce. V M5 bude číst surová data z ingest/cache/
 * a produkovat data/indicators.json. V M1 je toto stub, který validuje
 * existující data/indicators.json a doplní signal pole, pokud chybí.
 */
export async function transform() {
  console.log('[transform] M1 stub — TODO M5: harmonize raw fetcher outputs into data/indicators.json');
  const cards = loadMethodCards();
  console.log(`[transform] Loaded ${cards.length} method cards.`);

  // Validuj existující data/indicators.json
  const dataPath = path.join(ROOT, 'data', 'indicators.json');
  if (fs.existsSync(dataPath)) {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`[transform] Found ${data.indicators.length} indicators in data/indicators.json.`);

    // Sanity check: každý indikátor v dat musí mít odpovídající kartu
    for (const ind of data.indicators) {
      const card = cards.find(c => c.id === ind.id);
      if (!card) console.warn(`[transform] WARN: indicator '${ind.id}' has no method card.`);
    }
  } else {
    console.warn('[transform] data/indicators.json not found.');
  }
}

// Entry point pro `npm run transform`
if (import.meta.url === `file://${process.argv[1]}`) {
  transform().catch(err => {
    console.error('[transform] FAIL:', err);
    process.exit(1);
  });
}
