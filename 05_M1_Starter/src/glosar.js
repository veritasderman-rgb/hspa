// Frontend logika stránky glosar.html.
// Načítá data/glossary.json a renderuje prohledávatelný seznam pojmů.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

let allTerms = [];
let activeFilter = '';

function sortedTerms(terms, search) {
  const q = search.trim().toLowerCase();
  if (!q) return [...terms].sort((a, b) => a.key.localeCompare(b.key, 'cs'));
  return terms
    .filter(t =>
      t.key.toLowerCase().includes(q) ||
      t.full.toLowerCase().includes(q) ||
      t.short_def.toLowerCase().includes(q)
    )
    .sort((a, b) => a.key.localeCompare(b.key, 'cs'));
}

function groupByLetter(terms) {
  const groups = new Map();
  for (const t of terms) {
    const letter = t.key[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(t);
  }
  return groups;
}

function renderList() {
  const container = document.getElementById('glossaryList');
  const searchVal = document.getElementById('glossarySearch')?.value ?? '';
  const terms = sortedTerms(allTerms, searchVal);

  if (!terms.length) {
    container.innerHTML = `<p class="glossary-empty">Žádný termín neodpovídá hledání „${escapeHtml(searchVal)}".</p>`;
    return;
  }

  const groups = groupByLetter(terms);
  let html = '';
  for (const [letter, ts] of groups) {
    html += `<div class="glossary-group" id="letter-${escapeHtml(letter)}">
      <div class="glossary-group-letter">${escapeHtml(letter)}</div>`;
    for (const t of ts) {
      html += `<a class="glossary-term" id="${escapeHtml(t.anchor)}" href="#${escapeHtml(t.anchor)}">
        <div class="glossary-term-key">${escapeHtml(t.key)}</div>
        <div class="glossary-term-body">
          <div class="glossary-term-full">${escapeHtml(t.full)}</div>
          <div class="glossary-term-def">${escapeHtml(t.short_def)}</div>
        </div>
      </a>`;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

function renderAlphaNav() {
  const nav = document.getElementById('glossaryAlphaNav');
  if (!nav) return;
  const letters = [...new Set(allTerms.map(t => t.key[0].toUpperCase()))].sort();
  nav.innerHTML = letters.map(l =>
    `<button class="glossary-alpha-btn" data-letter="${escapeHtml(l)}">${escapeHtml(l)}</button>`
  ).join('');
  nav.querySelectorAll('.glossary-alpha-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(`letter-${btn.dataset.letter}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

async function init() {
  renderModuleNav('glossary');
  renderMastheadDate();

  try {
    const data = await fetch('data/glossary.json').then(r => r.json());
    allTerms = data.terms ?? [];
  } catch {
    document.getElementById('glossaryList').innerHTML =
      '<p class="glossary-empty">Nepodařilo se načíst data glosáře.</p>';
    return;
  }

  renderAlphaNav();
  renderList();

  const search = document.getElementById('glossarySearch');
  if (search) {
    search.addEventListener('input', () => renderList());
    // Předvyplnit z ?q= parametru
    const q = new URLSearchParams(location.search).get('q');
    if (q) { search.value = q; renderList(); }
  }

  // Skroll na anchor z URL
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 100);
  }
}

if (typeof window !== 'undefined') init();
