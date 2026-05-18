// Site-wide vyhledávání přes články, indikátory a glosář.
//
// Globální keyboard shortcut:
//   '/'      — otevře overlay (Discord-style)
//   Cmd/Ctrl+K — otevře overlay (universal pattern)
//   Esc      — zavře overlay
//   ↑/↓      — navigace mezi výsledky
//   Enter    — otevře vybraný výsledek
//
// Index obsahuje 3 typy položek (articles, indicators, glossary), které
// se fetchují async až při prvním otevření overlay. Recent searches se
// ukládají do localStorage (max 8 položek).
//
// Žádné externí dependencies — substring matching s lehkým scoringem
// (token boundary + prefix match → vyšší skóre).

const LS_RECENT = 'zdrave-cesko/search-recent';
const MAX_RECENT = 8;
const MAX_RESULTS_PER_SECTION = 6;

let _index = null;
let _overlay = null;
let _activeIdx = 0;
let _currentResults = [];

/**
 * Globální bootstrap — připne keyboard listener a injectuje overlay
 * (lazy: overlay DOM se vytvoří až při prvním otevření).
 * Bezpečné v non-browser prostředí (no-op).
 */
export function initSiteSearch() {
  if (typeof window === 'undefined') return;
  if (window.__siteSearchInit) return;
  window.__siteSearchInit = true;

  document.addEventListener('keydown', e => {
    // Ignoruj pokud je fokus v input/textarea/select/contenteditable
    const t = e.target;
    const inField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

    if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openOverlay();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openOverlay();
      return;
    }
    if (e.key === 'Escape' && _overlay && !_overlay.hidden) {
      closeOverlay();
    }
  });
}

// =====================================================================
//  Index building
// =====================================================================

/**
 * Sestaví flat index ze 3 datových zdrojů.
 *
 * @param {Object} sources
 * @param {Array} [sources.articles]
 * @param {Array} [sources.indicators]
 * @param {Array} [sources.glossary]
 * @returns {Array<{id:string,type:string,label:string,sub:string,url:string,haystack:string}>}
 */
export function buildIndex({ articles = [], indicators = [], glossary = [] } = {}) {
  const out = [];

  for (const a of articles) {
    if (a.published === false) continue;
    const label = a.title ?? '';
    const sub = a.perex ?? '';
    out.push({
      id: a.slug,
      type: 'article',
      label,
      sub,
      url: a.slug,
      haystack: `${label} ${sub} ${a.tag ?? ''} ${(a.topics ?? []).join(' ')}`.toLowerCase(),
    });
  }

  for (const i of indicators) {
    const label = i.name ?? '';
    const sub = [i.domain, i.subdomain].filter(Boolean).join(' · ');
    out.push({
      id: i.id,
      type: 'indicator',
      label,
      sub,
      url: `indicator.html?id=${encodeURIComponent(i.id)}`,
      haystack: `${label} ${sub} ${i.area ?? ''} ${i.dimension ?? ''}`.toLowerCase(),
    });
  }

  for (const g of glossary) {
    const label = g.key ?? '';
    const sub = g.full ?? g.short_def ?? '';
    out.push({
      id: g.anchor ?? g.key,
      type: 'glossary',
      label,
      sub,
      url: `glosar.html${g.anchor ? '#' + g.anchor : ''}`,
      haystack: `${label} ${sub}`.toLowerCase(),
    });
  }

  return out;
}

/**
 * Najde položky odpovídající query. Skoring:
 *   - exact match v label: +100
 *   - prefix label match: +50
 *   - každý token match v label: +20
 *   - každý token match v haystack: +5
 *
 * @param {string} query
 * @param {Array} index
 * @returns {Array} seřazené sestupně podle skóre
 */
export function searchIndex(query, index) {
  if (!query || !query.trim() || !Array.isArray(index)) return [];
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = [];
  for (const item of index) {
    let score = 0;
    const labelLower = item.label.toLowerCase();
    if (labelLower === q) score += 100;
    else if (labelLower.startsWith(q)) score += 50;
    for (const tok of tokens) {
      if (labelLower.includes(tok)) score += 20;
      else if (item.haystack.includes(tok)) score += 5;
    }
    if (score > 0) scored.push({ ...item, _score: score });
  }
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

// =====================================================================
//  Overlay UI
// =====================================================================

async function loadIndex() {
  if (_index) return _index;
  try {
    const [aRes, iRes, gRes] = await Promise.allSettled([
      fetch('data/articles.json').then(r => r.ok ? r.json() : null),
      fetch('data/indicators.json').then(r => r.ok ? r.json() : null),
      fetch('data/glossary.json').then(r => r.ok ? r.json() : null),
    ]);
    _index = buildIndex({
      articles: aRes.status === 'fulfilled' ? (aRes.value?.articles ?? []) : [],
      indicators: iRes.status === 'fulfilled' ? (iRes.value?.indicators ?? []) : [],
      glossary: gRes.status === 'fulfilled' ? (gRes.value?.terms ?? []) : [],
    });
  } catch {
    _index = [];
  }
  return _index;
}

function ensureOverlay() {
  if (_overlay) return _overlay;
  _overlay = document.createElement('div');
  _overlay.id = 'siteSearchOverlay';
  _overlay.className = 'site-search-overlay';
  _overlay.hidden = true;
  _overlay.setAttribute('role', 'dialog');
  _overlay.setAttribute('aria-modal', 'true');
  _overlay.setAttribute('aria-label', 'Vyhledávání');
  _overlay.innerHTML = `
    <div class="site-search-backdrop" data-close="1"></div>
    <div class="site-search-modal">
      <div class="site-search-header">
        <span class="site-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          class="site-search-input"
          id="siteSearchInput"
          placeholder="Hledat články, indikátory a pojmy…"
          autocomplete="off"
          aria-label="Hledat na webu"
          aria-controls="siteSearchResults"
        >
        <kbd class="site-search-esc" aria-hidden="true">Esc</kbd>
      </div>
      <div class="site-search-results" id="siteSearchResults" role="listbox" aria-label="Výsledky vyhledávání"></div>
      <div class="site-search-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigace</span>
        <span><kbd>Enter</kbd> otevřít</span>
        <span><kbd>Esc</kbd> zavřít</span>
      </div>
    </div>`;
  document.body.appendChild(_overlay);

  // Wire up
  _overlay.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', closeOverlay);
  });
  const input = _overlay.querySelector('#siteSearchInput');
  input.addEventListener('input', () => renderResults(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); openActive(); }
  });

  return _overlay;
}

async function openOverlay() {
  ensureOverlay();
  await loadIndex();
  _overlay.hidden = false;
  document.body.classList.add('site-search-open');
  const input = _overlay.querySelector('#siteSearchInput');
  input.value = '';
  input.focus();
  renderResults('');
}

function closeOverlay() {
  if (!_overlay) return;
  _overlay.hidden = true;
  document.body.classList.remove('site-search-open');
}

function renderResults(query) {
  const wrap = _overlay.querySelector('#siteSearchResults');
  if (!wrap) return;

  if (!query || !query.trim()) {
    const recent = loadRecent();
    if (recent.length === 0) {
      wrap.innerHTML = `<div class="site-search-empty">Začněte psát. Hledá se napříč články, indikátory a glosářem.</div>`;
      _currentResults = [];
      return;
    }
    wrap.innerHTML = `
      <div class="site-search-section">
        <div class="site-search-section-h">Naposledy hledáno</div>
        <ul class="site-search-list">
          ${recent.map((r, i) => `
            <li class="site-search-item${i === 0 ? ' active' : ''}" data-url="${escapeAttr(r.url)}" role="option" data-idx="${i}">
              <span class="site-search-item-type type-${escapeAttr(r.type)}">${typeLabel(r.type)}</span>
              <span class="site-search-item-label">${escapeHtml(r.label)}</span>
            </li>`).join('')}
        </ul>
      </div>`;
    _currentResults = recent;
    _activeIdx = 0;
    wireResultClicks();
    return;
  }

  const all = searchIndex(query, _index ?? []);
  if (all.length === 0) {
    wrap.innerHTML = `
      <div class="site-search-empty">
        Nic nenalezeno pro „${escapeHtml(query)}".
        <br><a href="https://www.google.com/search?q=site:hspa-cesko.cz+${encodeURIComponent(query)}" target="_blank" rel="noopener">Hledat na webu Google →</a>
      </div>`;
    _currentResults = [];
    return;
  }

  // Skupin podle typu
  const byType = { article: [], indicator: [], glossary: [] };
  for (const r of all) {
    if (byType[r.type] && byType[r.type].length < MAX_RESULTS_PER_SECTION) byType[r.type].push(r);
  }

  const visible = [...byType.article, ...byType.indicator, ...byType.glossary];
  _currentResults = visible;
  _activeIdx = 0;

  wrap.innerHTML = ['article', 'indicator', 'glossary']
    .map(type => {
      if (byType[type].length === 0) return '';
      const items = byType[type].map((r, i) => {
        const globalIdx = visible.indexOf(r);
        return `
          <li class="site-search-item${globalIdx === 0 ? ' active' : ''}" data-url="${escapeAttr(r.url)}" data-idx="${globalIdx}" role="option">
            <span class="site-search-item-type type-${escapeAttr(type)}">${typeLabel(type)}</span>
            <span class="site-search-item-body">
              <span class="site-search-item-label">${highlight(r.label, query)}</span>
              ${r.sub ? `<span class="site-search-item-sub">${highlight(r.sub, query)}</span>` : ''}
            </span>
          </li>`;
      }).join('');
      return `
        <div class="site-search-section">
          <div class="site-search-section-h">${typeSectionLabel(type)} (${byType[type].length})</div>
          <ul class="site-search-list">${items}</ul>
        </div>`;
    }).join('');

  wireResultClicks();
}

function wireResultClicks() {
  _overlay.querySelectorAll('.site-search-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      _activeIdx = idx;
      openActive();
    });
    el.addEventListener('mouseenter', () => {
      const idx = parseInt(el.dataset.idx, 10);
      if (Number.isFinite(idx)) setActive(idx, false);
    });
  });
}

function moveActive(delta) {
  if (_currentResults.length === 0) return;
  const next = (_activeIdx + delta + _currentResults.length) % _currentResults.length;
  setActive(next, true);
}

function setActive(idx, scroll) {
  _activeIdx = idx;
  const items = _overlay.querySelectorAll('.site-search-item');
  items.forEach((el, i) => {
    el.classList.toggle('active', parseInt(el.dataset.idx, 10) === idx);
    if (scroll && parseInt(el.dataset.idx, 10) === idx) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

function openActive() {
  const item = _currentResults[_activeIdx];
  if (!item) return;
  saveRecent(item);
  window.location.href = item.url;
}

// =====================================================================
//  Recent searches (localStorage)
// =====================================================================

function loadRecent() {
  try {
    const raw = localStorage.getItem(LS_RECENT);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

function saveRecent(item) {
  try {
    const recent = loadRecent().filter(r => r.url !== item.url);
    recent.unshift({ type: item.type, label: item.label, url: item.url });
    localStorage.setItem(LS_RECENT, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

// =====================================================================
//  Pomocné
// =====================================================================

function typeLabel(t) {
  return t === 'article' ? 'Článek' : t === 'indicator' ? 'Indikátor' : t === 'glossary' ? 'Pojem' : t;
}

function typeSectionLabel(t) {
  return t === 'article' ? 'Články' : t === 'indicator' ? 'Indikátory' : t === 'glossary' ? 'Glosář' : t;
}

export function highlight(text, query) {
  const escapedText = escapeHtml(text);
  if (!query) return escapedText;
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return escapedText;
  const re = new RegExp('(' + tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  return escapedText.replace(re, '<mark>$1</mark>');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}
