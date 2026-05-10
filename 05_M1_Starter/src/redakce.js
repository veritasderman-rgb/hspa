// Frontend logika redakční fronty (redakce.html).
// Načítá data/articles.json a renderuje záznamy s published === false,
// seřazené podle scheduled_for vzestupně. Stránka je noindex,
// ale veřejná pro každého, kdo zná URL.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

renderModuleNav(null);  // žádný aktivní tab
renderMastheadDate();
loadAndRenderQueue();

async function loadAndRenderQueue() {
  const list = document.getElementById('redakceList');
  const empty = document.getElementById('redakceEmpty');
  const meta = document.getElementById('redakceMeta');
  if (!list) return;

  let articles;
  try {
    const r = await fetch('data/articles.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    articles = (d.articles ?? [])
      .filter(a => a.published === false)
      .sort((a, b) => (a.scheduled_for || '').localeCompare(b.scheduled_for || ''));
  } catch (err) {
    list.innerHTML = `<li class="article-list-loading">Nepodařilo se načíst data: ${escapeHtml(err.message)}</li>`;
    return;
  }

  if (!articles.length) {
    list.innerHTML = '';
    empty?.classList.remove('hidden');
    if (meta) meta.textContent = '';
    return;
  }

  empty?.classList.add('hidden');
  if (meta) meta.textContent = `${articles.length} článek/ů ve frontě · řazeno podle plánovaného data publikace`;

  const today = new Date().toISOString().slice(0, 10);

  list.innerHTML = articles.map(a => {
    const isOverdue = a.scheduled_for && a.scheduled_for < today;
    const isToday = a.scheduled_for === today;
    const stateCls = isOverdue ? 'redakce-state-overdue' : (isToday ? 'redakce-state-today' : 'redakce-state-future');
    const stateLabel = isOverdue ? 'PO TERMÍNU' : (isToday ? 'DNES' : 'NAPLÁNOVÁNO');
    const dateNice = formatDate(a.scheduled_for);
    return `
      <li class="redakce-row">
        <div class="redakce-row-head">
          <span class="redakce-state ${stateCls}">${stateLabel}</span>
          <span class="redakce-date">${escapeHtml(dateNice)}</span>
          <span class="redakce-num">#${escapeHtml(a.number ?? '?')}</span>
          <span class="redakce-tag">${escapeHtml(a.tag ?? 'Analýza')}</span>
        </div>
        <h4 class="redakce-title">
          <a href="${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a>
        </h4>
        ${a.perex ? `<p class="redakce-perex">${escapeHtml(a.perex)}</p>` : ''}
        <div class="redakce-row-foot">
          <a class="redakce-cta" href="${escapeHtml(a.slug)}">Otevřít celý článek →</a>
          <span class="redakce-id">${escapeHtml(a.id)}</span>
        </div>
      </li>
    `;
  }).join('');
}

function formatDate(iso) {
  if (!iso) return '?';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
