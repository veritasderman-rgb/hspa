// Bootstrap stránek sekce Články: úvodní listing i jednotlivé články.
import './analytics.js';
import { renderModuleNav, renderMastheadDate } from './page-shared.js';

renderModuleNav('articles');
renderMastheadDate();
populateWaffles();
loadAndRenderArticles();

/**
 * Vyplní libovolný <div class="waffle-100" data-pct="N">…</div> v článku
 * 100 spany, kde prvních N má class="f". Pure HTML/CSS waffle, žádné inline
 * skripty v jednotlivých článcích.
 */
function populateWaffles() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.waffle-100[data-pct]').forEach(el => {
    if (el.dataset.populated === '1') return;
    const pct = Math.max(0, Math.min(100, parseInt(el.dataset.pct, 10) || 0));
    let html = '';
    for (let i = 0; i < 100; i++) html += i < pct ? '<span class="f"></span>' : '<span></span>';
    el.innerHTML = html;
    el.dataset.populated = '1';
  });
}

/**
 * Načte data/articles.json, vyrenderuje seznam článků v clanky.html
 * a navěsí filtr podle topicu. Idempotent — pokud #articleList neexistuje,
 * funkce tiše skončí (na detailních stránkách se nic nestane).
 */
async function loadAndRenderArticles() {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('articleList');
  if (!list) return;

  let articles;
  try {
    const res = await fetch('data/articles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    articles = (data.articles ?? [])
      .filter(a => a.published !== false)
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da;
        // Manifest má number "M" — vždy nahoře tie-breakem
        if (a.number === 'M') return -1;
        if (b.number === 'M') return 1;
        return parseInt(b.number, 10) - parseInt(a.number, 10);
      });
  } catch (err) {
    console.error('articles load failed:', err);
    list.innerHTML = `<li class="article-list-loading">Nepodařilo se načíst seznam článků.</li>`;
    return;
  }

  let activeTopic = 'all';
  const empty = document.getElementById('articleListEmpty');

  function render() {
    const filtered = activeTopic === 'all'
      ? articles
      : articles.filter(a => Array.isArray(a.topics) && a.topics.includes(activeTopic));

    if (!filtered.length) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');
    list.innerHTML = filtered.map(renderItem).join('');
  }

  function renderItem(a) {
    const isManifest = a.kind === 'manifest';
    const itemCls = isManifest
      ? 'article-list-item article-list-item-manifest'
      : 'article-list-item';
    const tagCls = isManifest
      ? 'article-list-tag article-list-tag-manifest'
      : 'article-list-tag';
    const cta = isManifest ? 'Číst manifest →' : 'Číst článek →';
    const topicChips = (a.topics ?? []).map(t =>
      `<span class="article-list-topic" data-topic="${esc(t)}">${TOPIC_LABELS[t] ?? esc(t)}</span>`
    ).join('');
    return `
      <li class="${itemCls}">
        <a href="${esc(a.slug)}" class="article-list-link">
          <div class="article-list-meta">
            <span class="article-list-num">${esc(a.number)}</span>
            <span class="${tagCls}">${esc(a.tag)}</span>
            <span class="article-list-date">${formatCzDate(a.date)}</span>
          </div>
          <h4 class="article-list-title">${esc(a.title)}</h4>
          <p class="article-list-perex">${esc(a.perex ?? '')}</p>
          ${topicChips ? `<div class="article-list-topics">${topicChips}</div>` : ''}
          <span class="article-list-cta">${cta}</span>
        </a>
      </li>`;
  }

  // Spočítáme counts a zaktualizujeme čísla v chip
  function updateCounts() {
    document.querySelectorAll('.topic-count[data-count-for]').forEach(el => {
      const t = el.dataset.countFor;
      const n = t === 'all'
        ? articles.length
        : articles.filter(a => Array.isArray(a.topics) && a.topics.includes(t)).length;
      el.textContent = n;
    });
  }

  // Wire chip clicks
  document.querySelectorAll('.topic-chip[data-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTopic = btn.dataset.topic;
      document.querySelectorAll('.topic-chip').forEach(b => b.classList.toggle('active', b === btn));
      render();
      // Update URL hash for shareability
      const newHash = activeTopic === 'all' ? '' : `#topic=${encodeURIComponent(activeTopic)}`;
      history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
    });
  });

  // Read initial topic from URL hash
  const hashMatch = window.location.hash.match(/topic=([^&]+)/);
  if (hashMatch) {
    const initialTopic = decodeURIComponent(hashMatch[1]);
    const btn = document.querySelector(`.topic-chip[data-topic="${cssEscape(initialTopic)}"]`);
    if (btn) {
      activeTopic = initialTopic;
      document.querySelectorAll('.topic-chip').forEach(b => b.classList.toggle('active', b === btn));
    }
  }

  updateCounts();
  render();
}

const TOPIC_LABELS = {
  'legislativa': 'Legislativa',
  'financovani': 'Financování',
  'klinika': 'Klinika',
  'prevence': 'Prevence',
  'populace': 'Stav populace',
  'dusevni-zdravi': 'Duševní zdraví',
  'dostupnost': 'Dostupnost a regiony',
  'digitalizace': 'Digitalizace',
};

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cssEscape(s) {
  // Conservative escape for CSS attribute selectors
  return String(s).replace(/"/g, '\\"');
}

function formatCzDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}
