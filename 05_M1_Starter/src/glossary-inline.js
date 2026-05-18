// Inline glossary tooltips pro články.
//
// Naskenuje .article-body text, najde první výskyt každého termínu z
// data/glossary.json a obalí ho do <abbr class="gloss-term"> s hover tooltipem.
//
// Klíčové vlastnosti:
//   - Pouze první výskyt termínu v článku (žádný šum z opakování).
//   - Word boundary matching (nezachytí "NIS" uvnitř "NIS2"; seřazeno desc length).
//   - Ignoruje text uvnitř <a>, <abbr>, <code>, <pre>, <h2>, <h3>, <h4>.
//   - Idempotent — opakované volání nevytvoří duplikáty.
//   - Bezpečné v non-browser prostředí (no-op).
//
// Test coverage: tests/glossary-inline.test.js (pure helper functions).

const SKIP_TAGS = new Set(['A', 'ABBR', 'CODE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'BUTTON', 'SCRIPT', 'STYLE']);

/**
 * Entry point — obalí inline výskyty glosářových termínů v .article-body.
 *
 * @param {Array<{key:string, full?:string, short_def?:string, anchor?:string}>} terms
 * @param {ParentNode} [root=document]
 */
export function enhanceInlineGlossary(terms, root) {
  if (typeof document === 'undefined') return;
  if (!Array.isArray(terms) || terms.length === 0) return;
  const scope = root ?? document;
  const body = scope.querySelector('.article-body');
  if (!body) return;
  if (body.dataset.glossInlineInit === '1') return;
  body.dataset.glossInlineInit = '1';

  const sorted = sortTermsByLengthDesc(terms);
  const used = new Set();

  walkTextNodes(body, node => {
    const text = node.nodeValue;
    if (!text || !text.trim()) return;

    const replacements = findFirstOccurrences(text, sorted, used);
    if (replacements.length === 0) return;
    replaceWithGlossNodes(node, replacements);
  });
}

/**
 * Seřadí termíny tak, aby delší (např. "NIS2") byly před kratšími ("NIS").
 *
 * @param {Array<{key:string}>} terms
 * @returns {Array<{key:string}>}
 */
export function sortTermsByLengthDesc(terms) {
  return [...terms].sort((a, b) => (b.key?.length ?? 0) - (a.key?.length ?? 0));
}

/**
 * Najde v textu první výskyt každého ne-použitého termínu. Vrátí seřazené
 * podle pozice (vzestupně). Mutuje `used` — přidá tam matched klíče.
 *
 * @param {string} text
 * @param {Array<{key:string}>} sortedTerms
 * @param {Set<string>} used - klíče již použitých termínů (mezi voláními)
 * @returns {Array<{start:number, end:number, term:object, match:string}>}
 */
export function findFirstOccurrences(text, sortedTerms, used) {
  const out = [];
  const occupied = []; // intervaly už zabrané delším matchem

  for (const term of sortedTerms) {
    if (!term.key || used.has(term.key)) continue;
    const re = wordBoundaryRegex(term.key);
    const m = re.exec(text);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    // Pokud overlap s delším termem zabraným dřív → skip
    if (occupied.some(([a, b]) => start < b && end > a)) continue;
    used.add(term.key);
    occupied.push([start, end]);
    out.push({ start, end, term, match: m[0] });
  }
  // Seřaď podle pozice
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Word-boundary regex pro daný klíč (case-sensitive).
 * Hranice: znak před/po nesmí být alphanumeric ani '-' (zachová "AI" v "AI-asistovaný"
 * jako match jen kdyby uživatel akceptoval — my chceme přesný match → '-' také hranice).
 *
 * @param {string} key
 * @returns {RegExp}
 */
export function wordBoundaryRegex(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w\\-])${escaped}(?![\\w\\-])`);
}

// =====================================================================
//  DOM operace
// =====================================================================

function walkTextNodes(root, visit) {
  // TreeWalker nesmí přeskakovat — chceme jen text uvnitř povolených containerů
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p = node.parentNode;
      while (p && p !== root) {
        if (p.nodeType === 1 && SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        // .glossary-abbr (vytvořeno wrapAcronyms) — nepřepisovat
        if (p.nodeType === 1 && (p.classList?.contains('glossary-abbr') || p.classList?.contains('gloss-term'))) {
          return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n);
  targets.forEach(visit);
}

function replaceWithGlossNodes(textNode, replacements) {
  const text = textNode.nodeValue;
  const parent = textNode.parentNode;
  if (!parent) return;
  const frag = document.createDocumentFragment();
  let pos = 0;
  for (const rep of replacements) {
    if (rep.start > pos) frag.appendChild(document.createTextNode(text.slice(pos, rep.start)));
    const abbr = document.createElement('abbr');
    abbr.className = 'gloss-term';
    abbr.dataset.glossKey = rep.term.key;
    if (rep.term.short_def) abbr.title = rep.term.short_def;
    if (rep.term.full) abbr.setAttribute('aria-label', `${rep.term.key} — ${rep.term.full}`);
    abbr.textContent = rep.match;
    frag.appendChild(abbr);
    pos = rep.end;
  }
  if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
  parent.replaceChild(frag, textNode);
}
