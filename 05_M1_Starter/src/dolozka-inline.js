// Doložka — inline průkaz původu kvantitativních tvrzení v článcích.
//
// Čte registr tvrzení (data/claims.json) a datový kontrakt
// (data/indicators.json), najde doslovné quotes v textu článku a obalí je
// klikacím chipem se stavem ✓ aktuální / ⚠ změněno / · reference. Klik na
// chip otevře sdílený panel s metrikou, hodnotou v textu, verdiktem proti
// datovému kontraktu a odkazem na stránku indikátoru. Do .article-meta
// přidá badge „{N} čísel s doloženým původem".
//
// Klíčový rozdíl proti glossary-inline.js: quotes mohou křížit inline tagy
// (<strong>, <em>…), proto se nematchuje per-node, ale přes NORMALIZOVANÝ
// textContent celého článku s offsetovou mapou znak → {textNode, offset}.
//
// Kontrakt: PLAN-DOLOZKA.md, Balíček B. Engine: src/dolozka-engine.js
// (čistá logika — normalizace, lokalizace quotes, drift verdikt, statistiky).
//
// Idempotentní; bezpečné v non-browser prostředí (no-op).

import {
  normText,
  claimsForArticle,
  locateClaims,
  driftStatus,
  articleTrustStats,
} from './dolozka-engine.js';

/** Text uvnitř těchto tagů se nematchuje (odkazy, tlačítka, skripty). */
const SKIP_TAGS = new Set(['A', 'BUTTON', 'SCRIPT', 'STYLE']);

const PANEL_FOOT = 'Registr tvrzení HSPA Monitoru · kontrola v prohlížeči';

/**
 * Entry point — obohatí článek o doložkové chipy, sdílený panel a badge.
 *
 * @param {Object} opts
 * @param {Array|{claims: Array}} opts.claims - obsah data/claims.json (objekt) nebo přímo pole .claims
 * @param {Array|{indicators: Array}} opts.indicators - obsah data/indicators.json (objekt) nebo přímo pole .indicators
 * @param {ParentNode} [opts.root=document]
 */
export function enhanceDolozka({ claims, indicators, root = document } = {}) {
  if (typeof document === 'undefined') return;
  const scope = root || document;
  const article = scope.querySelector('article.article-page');
  if (!article) return;                                // hub / jiná stránka → nic
  if (scope.querySelector('.dlz-panel')) return;       // idempotence (sdílený panel už existuje)
  if (article.dataset.dlzInit === '1') return;         // idempotence (běh bez panelu, root mimo body)
  article.dataset.dlzInit = '1';

  const slug = (typeof location !== 'undefined' && location.pathname)
    ? (location.pathname.split('/').pop() || '')
    : '';

  const claimList = Array.isArray(claims)
    ? claims
    : (claims && Array.isArray(claims.claims) ? claims.claims : []);
  const articleClaims = claimsForArticle(claimList, slug);
  if (!Array.isArray(articleClaims) || articleClaims.length === 0) return;

  const indicatorList = Array.isArray(indicators)
    ? indicators
    : (indicators && Array.isArray(indicators.indicators) ? indicators.indicators : []);
  const indicatorsById = new Map(indicatorList.map(i => [i.id, i]));

  // ── Offsetová mapa: normalizovaný text článku → pozice v text nodech ──
  const { nodes, text, map } = buildOffsetMap(article);
  const located = locateClaims(text, articleClaims) || [];

  const doc = article.ownerDocument || document;

  // ── Sdílený panel (jeden pro všechny chipy) ──
  const panel = doc.createElement('div');
  panel.className = 'dlz-panel';
  panel.setAttribute('role', 'note');
  panel.hidden = true;
  (doc.body || article).appendChild(panel);

  let activeChip = null;

  function closePanel() {
    if (activeChip) activeChip.setAttribute('aria-expanded', 'false');
    activeChip = null;
    panel.hidden = true;
  }

  function openPanel(chip, grp, verdicts) {
    fillPanel(panel, grp, verdicts);
    chip.setAttribute('aria-expanded', 'true');
    activeChip = chip;
    positionPanel(panel, chip);
  }

  // Zavírání: klik mimo panel/chip + ESC (vrátí fokus na chip).
  doc.addEventListener('click', (e) => {
    if (!activeChip || panel.hidden) return;
    const t = e.target;
    if (!(t instanceof Element)) { closePanel(); return; }
    if (panel.contains(t) || t.closest('.dlz-chip')) return;
    closePanel();
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeChip) {
      const chip = activeChip;
      closePanel();
      chip.focus();
    }
  });

  // ── Chipy: zpětné mapování (start, end) → DOM. Odzadu, aby splitText
  //    neinvalidoval offsety dřívějších claims ve stejném text nodu. ──
  for (let k = located.length - 1; k >= 0; k--) {
    const { claim, claims: grpRaw, start, end } = located[k];
    // Jeden quote může nést víc tvrzení („72 % vs. OECD 78 %" = dvě metriky)
    // — chip je jeden, panel ukáže všechny; stav chipu = nejhorší ze skupiny.
    const grp = Array.isArray(grpRaw) && grpRaw.length ? grpRaw : [claim];
    const startRef = map[start];
    const endRef = map[end - 1];
    if (!startRef || !endRef) continue;
    const verdicts = grp.map((c) => driftStatus(c, indicatorsById));
    const status = verdicts.some((v) => v && v.status === 'changed') ? 'changed'
      : verdicts.some((v) => v && v.status === 'current') ? 'current'
      : verdicts.some((v) => v && v.status === 'historical') ? 'historical'
      : 'reference';

    const chip = doc.createElement('button');
    chip.type = 'button';
    chip.className = 'dlz-chip';
    chip.dataset.dlzStatus = status;
    chip.setAttribute('aria-expanded', 'false');

    if (startRef.nodeIndex === endRef.nodeIndex) {
      // Quote leží v jednom text nodu → splitText a obal chipem.
      const node = nodes[startRef.nodeIndex];
      const parent = node.parentNode;
      if (!parent) continue;
      const mid = node.splitText(startRef.offset);
      mid.splitText(endRef.offset + 1 - startRef.offset);
      chip.textContent = mid.nodeValue;
      parent.replaceChild(chip, mid);
    } else {
      // Quote kříží text nody (inline tagy) → NEobalovat, jen značka
      // hned ZA koncovým nodem. Obsah = jen stavová ikonka (CSS ::after).
      const endNode = nodes[endRef.nodeIndex];
      const parent = endNode.parentNode;
      if (!parent) continue;
      chip.classList.add('dlz-mark');
      chip.setAttribute('aria-label',
        `Doložka: ${normText(String(claim.metric || 'kvantitativní tvrzení'))}`);
      parent.insertBefore(chip, endNode.nextSibling);
    }

    chip.addEventListener('click', () => {
      if (activeChip === chip) { closePanel(); return; }
      closePanel();
      openPanel(chip, grp, verdicts);
    });
  }

  // ── Badge v .article-meta ──
  addBadge(article, articleTrustStats(claimList, slug, indicatorsById));
}

// =====================================================================
//  Offsetová mapa (TreeWalker přes SHOW_TEXT)
// =====================================================================

/**
 * Projde text nody článku (mimo A/BUTTON/SCRIPT/STYLE a tříd dlz-*, gloss-*)
 * a postaví normalizovaný text (běhy whitespace → jedna mezera, trim —
 * stejná sémantika jako normText z engine) spolu s mapou: pro každý znak
 * normalizovaného textu odkaz {nodeIndex, offset} do surového text nodu.
 * Mezera vzniklá kolapsem běhu whitespace ukazuje na PRVNÍ whitespace
 * znak běhu.
 *
 * @param {Element} article
 * @returns {{nodes: Text[], text: string, map: Array<{nodeIndex:number, offset:number}>}}
 */
function buildOffsetMap(article) {
  const doc = article.ownerDocument || document;
  const walker = doc.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isSkippedText(node, article)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  let text = '';
  const map = [];
  // Otevřený běh whitespace: odkaz na jeho první znak (flushne se s další
  // ne-whitespace; trailing běh se zahodí = trim zprava, leading = zleva).
  let pendingSpace = null;

  for (let i = 0; i < nodes.length; i++) {
    const value = nodes[i].nodeValue || '';
    for (let j = 0; j < value.length; j++) {
      if (/\s/.test(value[j])) {
        if (text.length > 0 && pendingSpace === null) {
          pendingSpace = { nodeIndex: i, offset: j };
        }
      } else {
        if (pendingSpace !== null) {
          text += ' ';
          map.push(pendingSpace);
          pendingSpace = null;
        }
        text += value[j];
        map.push({ nodeIndex: i, offset: j });
      }
    }
  }
  return { nodes, text, map };
}

/** True, když text node leží uvnitř přeskočeného tagu nebo elementu s třídou dlz-* / gloss-*. */
function isSkippedText(node, boundary) {
  let p = node.parentNode;
  while (p && p !== boundary) {
    if (p.nodeType === 1) {
      if (SKIP_TAGS.has(p.tagName)) return true;
      if (p.classList) {
        for (const cls of p.classList) {
          if (cls.startsWith('dlz-') || cls.startsWith('gloss-')) return true;
        }
      }
    }
    p = p.parentNode;
  }
  return false;
}

// =====================================================================
//  Panel
// =====================================================================

/**
 * Naplní sdílený panel obsahem pro skupinu tvrzení sdílejících jeden quote
 * (typicky 1, u citací typu „72 % vs. OECD 78 %" i víc). Bez innerHTML —
 * jen createElement/textContent, data z JSON se nikdy neinterpretují jako HTML.
 */
function fillPanel(panel, grp, verdicts) {
  const doc = panel.ownerDocument;
  panel.textContent = '';

  grp.forEach((claim, i) => {
    const box = doc.createElement('div');
    box.className = 'dlz-panel-claim';
    panel.appendChild(box);

    const add = (cls, textValue) => {
      const el = doc.createElement('div');
      el.className = cls;
      el.textContent = textValue;
      box.appendChild(el);
      return el;
    };

    add('dlz-panel-metric', normText(String(claim.metric || 'Kvantitativní tvrzení')));

    const unit = claim.unit ? ` ${claim.unit}` : '';
    const asOf = claim.as_of != null ? ` (${claim.as_of})` : '';
    add('dlz-panel-text', `V textu: ${fmtNum(claim.value)}${unit}${asOf}`);

    const verdict = verdicts[i];
    const status = verdict && verdict.status ? verdict.status : 'reference';
    const v = add('dlz-panel-verdict', '');
    v.dataset.status = status;
    if (status === 'current') {
      v.textContent = `✓ Odpovídá datovému kontraktu (${fmtNum(verdict.contractValue)}, ${verdict.contractYear})`;
    } else if (status === 'historical') {
      v.textContent = `✓ Odpovídá historii (${verdict.historicalYear}: ${fmtNum(verdict.historicalValue)}) · dnes ${fmtNum(verdict.contractValue)} (${verdict.contractYear})`;
    } else if (status === 'changed') {
      v.textContent = verdict.historicalYear != null
        ? `⚠ Trend ${verdict.historicalYear} uvádí ${fmtNum(verdict.historicalValue)} — text má ${fmtNum(claim.value)}`
        : `⚠ Kontrakt dnes uvádí ${fmtNum(verdict.contractValue)} (${verdict.contractYear}) — text vznikl s hodnotou ${fmtNum(claim.value)}`;
    } else {
      v.textContent = 'Referenční údaj';
    }

    if (claim.source_note) {
      add('dlz-panel-note', normText(String(claim.source_note)));
    }

    if (claim.indicator_id) {
      const a = doc.createElement('a');
      a.className = 'dlz-panel-link';
      a.href = `indikator-${encodeURIComponent(String(claim.indicator_id))}.html`;
      a.textContent = 'Indikátor →';
      box.appendChild(a);
    }
  });

  const foot = doc.createElement('div');
  foot.className = 'dlz-panel-foot';
  foot.textContent = PANEL_FOOT;
  panel.appendChild(foot);
}

/** Umístí panel pod aktivní chip (page souřadnice, clamp na šířku viewportu). */
function positionPanel(panel, chip) {
  const doc = panel.ownerDocument;
  const win = doc.defaultView || window;
  const rect = chip.getBoundingClientRect();
  const scrollX = win.scrollX || 0;
  const scrollY = win.scrollY || 0;

  panel.hidden = false; // zviditelnit před měřením šířky
  const width = panel.offsetWidth || 0;
  const viewportW = doc.documentElement ? doc.documentElement.clientWidth : 0;

  let left = rect.left + scrollX;
  const maxLeft = scrollX + viewportW - width - 16;
  if (left > maxLeft) left = Math.max(scrollX + 16, maxLeft);

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(rect.bottom + scrollY + 8)}px`;
}

// =====================================================================
//  Badge + formátování
// =====================================================================

/** Přidá do .article-meta badge s počtem doložených čísel (jen když total > 0). */
function addBadge(article, stats) {
  if (!stats || !stats.total) return;
  const meta = article.querySelector('.article-meta');
  if (!meta || meta.querySelector('.dlz-badge')) return;
  const doc = article.ownerDocument;

  const sep = doc.createElement('span');
  sep.className = 'article-meta-sep';
  sep.textContent = '·';

  const badge = doc.createElement('a');
  badge.className = 'dlz-badge';
  badge.href = 'redakce.html#duveryhodnost';
  const overeno = (stats.current || 0) + (stats.historical || 0);
  let label = `${stats.total} čísel s doloženým původem`;
  if (overeno > 0) label += ` · ✓ ${overeno} ověřeno`;
  badge.textContent = label;

  meta.appendChild(sep);
  meta.appendChild(badge);
}

/** Číslo v českém formátu (desetinná čárka, max 2 desetinná místa). */
function fmtNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
  }
  return v == null ? '' : String(v);
}
