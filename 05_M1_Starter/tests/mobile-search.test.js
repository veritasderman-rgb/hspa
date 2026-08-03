// Vyhledávání musí být dostupné i na mobilu (viewport ≤ 720 px, kde se
// skrývá .module-nav s desktopovým triggerem). Test hlídá past, na kterou
// upozornila review plánu: pouhá existence prvku v DOM nestačí — desktopový
// trigger v DOM vždy byl, jen ho CSS na mobilu skrylo. Proto se tu ověřují
// přímo CSS pravidla viditelnosti a wiring v page-shared.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
const pageShared = readFileSync(join(root, 'src', 'page-shared.js'), 'utf8');

/**
 * Vytáhne obsahy všech @media bloků z CSS (brace counting — media bloky
 * v styles.css nejsou vnořené do dalších at-rules).
 */
function extractMediaBlocks(cssText) {
  const blocks = [];
  const re = /@media[^{]*\{/g;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < cssText.length && depth > 0) {
      if (cssText[i] === '{') depth++;
      else if (cssText[i] === '}') depth--;
      i++;
    }
    blocks.push({ condition: m[0], body: cssText.slice(re.lastIndex, i - 1) });
  }
  return blocks;
}

/** Vrátí deklarace pro selektor uvnitř zadaného CSS textu. */
function declarationsFor(cssText, selector) {
  const out = [];
  const re = new RegExp(`(^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{([^}]*)\\}`, 'g');
  let m;
  while ((m = re.exec(cssText)) !== null) out.push(m[2]);
  return out;
}

test('mobilní search trigger je pod 720 px viditelný (display: inline-flex v @media)', () => {
  const mobileBlocks = extractMediaBlocks(css).filter(b => /max-width:\s*720px/.test(b.condition));
  const shown = mobileBlocks.some(b =>
    declarationsFor(b.body, '.mobile-search-trigger').some(d => /display:\s*inline-flex/.test(d))
  );
  assert.ok(shown, '.mobile-search-trigger musí mít display: inline-flex v @media (max-width: 720px)');
});

test('žádný @media blok mobilní search trigger neskrývá', () => {
  for (const b of extractMediaBlocks(css)) {
    for (const d of declarationsFor(b.body, '.mobile-search-trigger')) {
      assert.ok(!/display:\s*none/.test(d),
        `.mobile-search-trigger nesmí být display:none v bloku ${b.condition}`);
    }
  }
});

test('drawer položka Hledat není v žádném @media skrytá', () => {
  for (const b of extractMediaBlocks(css)) {
    for (const d of declarationsFor(b.body, '.mobile-nav-search')) {
      assert.ok(!/display:\s*none/.test(d),
        `.mobile-nav-search nesmí být display:none v bloku ${b.condition}`);
    }
  }
});

test('search input má font-size ≥ 16 px (iOS pod 16 px zoomuje stránku)', () => {
  const decls = declarationsFor(css, '.site-search-input');
  assert.ok(decls.length > 0, '.site-search-input musí v CSS existovat');
  const sizes = decls.flatMap(d => [...d.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x => Number(x[1])));
  assert.ok(sizes.length > 0, '.site-search-input musí mít font-size v px');
  for (const s of sizes) assert.ok(s >= 16, `font-size ${s}px je pod 16px — iOS zoom`);
});

test('page-shared.js injektuje mobilní trigger i drawer položku a obě otevírají overlay', () => {
  assert.ok(pageShared.includes("'mobileSearchTrigger'"), 'topbar trigger #mobileSearchTrigger');
  assert.ok(pageShared.includes('mobile-nav-search'), 'drawer položka .mobile-nav-search');
  // Oba prvky používají stejný mechanismus jako desktopový trigger:
  // syntetický keydown '/' → openOverlay() v search.js.
  const dispatches = pageShared.match(/dispatchEvent\(new KeyboardEvent\('keydown', \{ key: '\/'/g) ?? [];
  assert.ok(dispatches.length >= 3, `očekávám ≥3 dispatch místa (desktop + topbar mobil + drawer), nalezeno ${dispatches.length}`);
});
