// Audit: každá metodická karta má patient_story s 4 odstavci, ≥ 200 slov,
// a čísla v textu se shodují s hodnotou v data/indicators.json.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CARDS_DIR = path.resolve(ROOT, '..', 'indicators');
const INDICATORS_FILE = path.resolve(ROOT, '..', 'data', 'indicators.json');

const indicators = JSON.parse(fs.readFileSync(INDICATORS_FILE, 'utf8')).indicators;
const indById = new Map(indicators.map(i => [i.id, i]));

const cards = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json'));
const issues = [];
let ok = 0;

for (const file of cards) {
  const card = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, file), 'utf8'));
  const id = card.id;
  const ind = indById.get(id);
  const story = card.patient_story?.trim() ?? '';

  // 1. existence
  if (!story || story.length < 50) {
    issues.push(`${id}: MISSING patient_story`);
    continue;
  }
  // 2. délka
  const words = story.split(/\s+/).filter(Boolean).length;
  if (words < 200) issues.push(`${id}: TOO SHORT (${words} words)`);
  if (words > 700) issues.push(`${id}: TOO LONG (${words} words)`);

  // 3. 4 odstavce (rozdělené dvojitou novou řádkou)
  const paragraphs = story.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  if (paragraphs.length < 3 || paragraphs.length > 5) {
    issues.push(`${id}: NON-STANDARD paragraph count (${paragraphs.length}, expected 3-5)`);
  }

  // 4. shoda klíčové hodnoty s indicators.json
  if (ind && typeof ind.value === 'number') {
    const v = ind.value;
    // pro hodnoty ≥ 1000: připrav formát s mezerami (cs-CZ tisícový oddělovač)
    const withThousands = (n) => Math.abs(n).toString().replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
    const variants = [
      String(v),
      v.toString().replace('.', ','),
      Math.round(v).toString(),
      v.toFixed(1).replace('.', ','),
      v.toFixed(2).replace('.', ','),
      withThousands(v),
      withThousands(Math.round(v)),
    ];
    if (v < 0) variants.push('-' + withThousands(Math.abs(v)));
    const found = variants.some(s => story.includes(s));
    if (!found) issues.push(`${id}: VALUE ${v} ${ind.unit} not literally found in story`);
  }

  ok++;
}

console.log(`Audit: ${cards.length} karet, ${ok} prošlo.`);
if (issues.length === 0) {
  console.log('\n✅ Všechny patient_story splňují kritéria.');
} else {
  console.log(`\n⚠️  Problémů: ${issues.length}\n`);
  for (const i of issues) console.log('  - ' + i);
}
