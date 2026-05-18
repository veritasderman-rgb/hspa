// Reading progress bar + table of contents (TOC) pro dlouhé články.
//
// Auto-bootstrap z src/clanky.js — projde DOM a:
//   1. Naskenuje .article-body h3 → vygeneruje stable slug IDs (pokud chybí)
//   2. Vloží sticky reading progress bar pod topbar
//   3. Pro články ≥ MIN_HEADINGS přidá TOC aside (sticky desktop, collapsible mobile)
//   4. IntersectionObserver na h3 → highlight aktivní sekce v TOC
//   5. Smooth scroll s offsetem pro topbar
//
// Pure DOM, žádné dependencies. Respektuje prefers-reduced-motion.
//
// Test coverage: tests/article-toc.test.js (slug generation, TOC build, edge cases).

const MIN_HEADINGS = 3; // pod tímto počtem h3 TOC nemá smysl

/**
 * Hlavní entry point. Volat po renderu článku.
 * Idempotent — opakované volání nezpůsobí duplikaci.
 *
 * @param {ParentNode} [root=document]
 */
export function enhanceArticleToc(root) {
  if (typeof document === 'undefined') return;
  const scope = root ?? document;
  const article = scope.querySelector('article.article-page');
  if (!article) return;
  const body = article.querySelector('.article-body');
  if (!body) return;

  const headings = buildHeadingIndex(body);
  if (headings.length === 0) return;

  injectProgressBar();
  observeProgress(article);

  if (headings.length >= MIN_HEADINGS) {
    injectToc(article, headings);
    observeActiveHeading(headings);
  }
}

/**
 * Sesbírá h3 z těla článku, doplní jim ID (slug) a vrátí seznam položek.
 *
 * @param {Element} body
 * @returns {Array<{id:string, text:string, el:Element}>}
 */
export function buildHeadingIndex(body) {
  const used = new Set();
  // Posbírej existující ID, aby se nepřepisovaly
  body.querySelectorAll('[id]').forEach(el => used.add(el.id));

  const items = [];
  body.querySelectorAll('h3').forEach(h => {
    let id = h.id;
    if (!id) {
      id = uniqueSlug(slugify(h.textContent || ''), used);
      h.id = id;
    }
    used.add(id);
    items.push({ id, text: (h.textContent || '').trim(), el: h });
  });
  return items;
}

/**
 * Slug generation. Vytvoří URL-safe ID z textu nadpisu:
 *   "Čísla: kde deficit je" → "cisla-kde-deficit-je"
 *
 * @param {string} s
 * @returns {string}
 */
export function slugify(s) {
  if (!s) return 'section';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')        // odstraň diakritiku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')             // non-alphanum → '-'
    .replace(/^-+|-+$/g, '')                 // trim leading/trailing '-'
    .replace(/-{2,}/g, '-')                  // collapse multiple '-'
    .slice(0, 60)
    || 'section';
}

/**
 * Zajistí unikátní slug. Pokud kolize, přidá -2, -3 atd.
 *
 * @param {string} base
 * @param {Set<string>} used
 * @returns {string}
 */
export function uniqueSlug(base, used) {
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// =====================================================================
//  Reading progress bar
// =====================================================================

function injectProgressBar() {
  if (document.getElementById('articleProgress')) return;
  const bar = document.createElement('div');
  bar.id = 'articleProgress';
  bar.className = 'article-progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<span class="article-progress-fill" style="transform:scaleX(0)"></span>';
  document.body.appendChild(bar);
}

function observeProgress(article) {
  const fill = document.querySelector('#articleProgress .article-progress-fill');
  if (!fill) return;
  const update = () => {
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) {
      fill.style.transform = 'scaleX(0)';
      return;
    }
    const scrolled = Math.max(0, -rect.top);
    const pct = Math.min(1, scrolled / total);
    fill.style.transform = `scaleX(${pct.toFixed(4)})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// =====================================================================
//  Table of Contents
// =====================================================================

function injectToc(article, headings) {
  if (article.querySelector('.article-toc')) return;

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const aside = document.createElement('aside');
  aside.className = 'article-toc';
  aside.setAttribute('aria-label', 'Obsah článku');

  // Detail je collapsed default na mobilu; CSS rozhodne. Open na desktopu.
  const items = headings.map((h, i) =>
    `<li><a href="#${h.id}" data-toc-index="${i}" data-toc-id="${h.id}">${escapeHtml(h.text)}</a></li>`
  ).join('');

  aside.innerHTML = `
    <details class="article-toc-details" open>
      <summary class="article-toc-summary">
        <span class="article-toc-title">Obsah článku</span>
        <span class="article-toc-count">${headings.length} sekcí</span>
      </summary>
      <ol class="article-toc-list">${items}</ol>
    </details>`;

  const body = article.querySelector('.article-body');
  body.parentNode.insertBefore(aside, body);

  // Smooth scroll s offsetem pro sticky topbar
  aside.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const topbarH = getTopbarOffset();
      const y = target.getBoundingClientRect().top + window.scrollY - topbarH - 16;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + id);
      target.focus({ preventScroll: true });
    });
  });
}

function getTopbarOffset() {
  const topbar = document.querySelector('header.topbar');
  return topbar ? topbar.getBoundingClientRect().height : 0;
}

function observeActiveHeading(headings) {
  const links = new Map();
  document.querySelectorAll('.article-toc a[data-toc-id]').forEach(a => {
    links.set(a.dataset.tocId, a);
  });
  if (links.size === 0) return;

  const setActive = id => {
    links.forEach((a, key) => {
      const active = key === id;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };

  const topbarH = getTopbarOffset();
  const obs = new IntersectionObserver(entries => {
    // Vybereme heading nejblíže pod topbarem (lowest top >= topbar offset)
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;
    // Heading s nejmenší kladnou (nebo nejméně zápornou) top hodnotou je "aktivní"
    visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    setActive(visible[0].target.id);
  }, {
    rootMargin: `-${topbarH + 24}px 0px -60% 0px`,
    threshold: [0, 1],
  });

  headings.forEach(h => obs.observe(h.el));
}

// =====================================================================
//  Pomocné
// =====================================================================

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
