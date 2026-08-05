// Strukturální kontrola HTML stránek — rozvaha párových značek.
//
// Proč: při přestavbě sazby na vedra.html zmizel jeden `</div>`, kterým se
// zavíral obal tabulky. Následek nebyl vidět ve zdrojáku ani v žádném z 960
// testů — prohlížeč chybu tiše opravil tak, že vnořil následující <figure>
// dovnitř bloku, takže ilustrace spadla pod text místo do vedlejšího sloupce.
// Rozbitá sazba na produkci, zelená CI.
//
// Kontrolujeme značky, které nesmí být samozavírací a jejichž nepárovost
// posouvá layout: div, section, article, figure, main, ul, ol, table.
// Komentáře a <script>/<style> bloky se vyřezávají — obsahují text, který
// vypadá jako značky, ale HTML parser ho tak nečte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAGS = ['div', 'section', 'article', 'figure', 'main', 'ul', 'ol', 'table'];

function strip(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
}

function imbalance(html) {
  const body = strip(html);
  const out = [];
  for (const tag of TAGS) {
    const open = (body.match(new RegExp(`<${tag}(?=[\\s>])`, 'gi')) ?? []).length;
    const close = (body.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length;
    if (open !== close) out.push(`${tag}: ${open}× otevřeno, ${close}× zavřeno`);
  }
  return out;
}

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

test('párové značky v HTML stránkách sedí (nepárový </div> tiše rozbije sazbu)', () => {
  const broken = [];
  for (const file of pages) {
    const bad = imbalance(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    if (bad.length) broken.push(`${file} — ${bad.join('; ')}`);
  }
  assert.deepEqual(broken, [], `Nepárové značky:\n${broken.join('\n')}`);
});

test('detektor rozvahy skutečně chytí chybějící </div>', () => {
  // Pojistka proti testu, který by kvůli chybě v regexu vždy procházel.
  assert.deepEqual(imbalance('<div><div></div>'), ['div: 2× otevřeno, 1× zavřeno']);
  assert.deepEqual(imbalance('<div class="a"><p>x</p></div>'), []);
  // <!-- --> a <script> se nesmí počítat
  assert.deepEqual(imbalance('<div></div><!-- <div> --><script>"<div>"</script>'), []);
});
