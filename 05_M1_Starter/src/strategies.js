// Frontend logika stránky strategie.html.
// Načítá data/strategies.json + data/explainers.json (pro tranzitivní cross-link)
// a renderuje rozcestí (level filter, search) nebo detail (z URL ?id=...).

import { audienceText, renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';
import { buildIndex, loadLinks } from './strategy-links.js';
import { renderTimeline, renderResponsibilityMatrix } from './strategy-policy-views.js';

const LEVEL_LABELS = {
  national: 'Národní ČR',
  sector: 'Sektorové (screening, programy)',
  institution: 'Instituce',
  eu: 'Evropská unie',
  global: 'Globální (WHO, OECD)',
  standard: 'Datové standardy',
};

const STATUS_LABELS = {
  active: { label: 'platná', cls: 'st-active' },
  proposed: { label: 'v přípravě', cls: 'st-proposed' },
  obsolete: { label: 'neaktuální', cls: 'st-obsolete' },
  revision_due: { label: 'k revizi', cls: 'st-revision' },
};

let allStrategies = [];
let linkIndex = null;
let activeLevel = 'all';
let activeSearch = '';

export function filterStrategies(items, { level, search }) {
  let xs = items;
  if (level && level !== 'all') xs = xs.filter(s => s.level === level);
  if (search) {
    const q = search.toLowerCase();
    xs = xs.filter(s =>
      (s.title || '').toLowerCase().includes(q)
      || (s.subtitle || '').toLowerCase().includes(q)
      || (s.owner || '').toLowerCase().includes(q)
      || (s.topics ?? []).some(t => t.toLowerCase().includes(q))
      || (s.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }
  return xs;
}

function renderList() {
  const grid = document.getElementById('strategyGrid');
  const empty = document.getElementById('emptyState');
  const filtered = filterStrategies(allStrategies, { level: activeLevel, search: activeSearch });

  document.getElementById('countBadge').textContent =
    `${filtered.length} strateg${filtered.length === 1 ? 'ie' : (filtered.length < 5 ? 'ie' : 'ií')}`;

  // Audience „policy" — extra sekce nad gridem (timeline + responsibility matrix)
  renderPolicyExtras(filtered);

  if (!filtered.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Seskupení podle úrovně
  const byLevel = {};
  for (const s of filtered) (byLevel[s.level] ??= []).push(s);

  const order = ['national', 'sector', 'institution', 'eu', 'global', 'standard'];
  grid.innerHTML = order
    .filter(l => byLevel[l]?.length)
    .map(level => {
      const items = byLevel[level];
      return `
        <section class="level-block">
          <h3 class="level-title">${escapeHtml(LEVEL_LABELS[level] ?? level)} <span class="badge">${items.length}</span></h3>
          <div class="strategy-cards">
            ${items.map(renderCard).join('')}
          </div>
        </section>
      `;
    }).join('');
}

function renderCard(s) {
  const status = STATUS_LABELS[s.status] ?? { label: s.status, cls: '' };
  const horizon = s.horizon
    ? `${s.horizon.from ?? '?'}–${s.horizon.to ?? '?'}`
    : '';
  const tldr = audienceText(s);
  return `
    <a class="strategy-card" href="strategie.html?id=${encodeURIComponent(s.id)}">
      <div class="card-meta">
        <span class="status-pill ${status.cls}">${escapeHtml(status.label)}</span>
        ${horizon ? `<span class="card-horizon">${escapeHtml(horizon)}</span>` : ''}
      </div>
      <h4>${escapeHtml(s.title)}</h4>
      ${s.subtitle ? `<div class="card-sub">${escapeHtml(s.subtitle)}</div>` : ''}
      <p class="card-tldr">${escapeHtml(tldr.slice(0, 200))}${tldr.length > 200 ? '…' : ''}</p>
      <div class="card-footer">
        <span class="card-owner">${escapeHtml(s.owner ?? '')}</span>
        ${(s.linked_indicators ?? []).length
          ? `<span class="card-indicators">${s.linked_indicators.length} indikátor${s.linked_indicators.length === 1 ? '' : (s.linked_indicators.length < 5 ? 'y' : 'ů')}</span>`
          : ''}
      </div>
    </a>
  `;
}

function renderDetail(id) {
  const s = allStrategies.find(x => x.id === id);
  const detail = document.getElementById('detailView');
  const list = document.getElementById('listView');
  if (!s) {
    detail.innerHTML = `<p>Strategie <code>${escapeHtml(id)}</code> nenalezena. <a href="strategie.html">Zpět na seznam</a>.</p>`;
    detail.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  list.classList.add('hidden');
  detail.classList.remove('hidden');

  const status = STATUS_LABELS[s.status] ?? { label: s.status, cls: '' };
  const horizon = s.horizon ? `${s.horizon.from ?? '?'}–${s.horizon.to ?? '?'}` : '';
  const tldr = audienceText(s);

  // Cross-link: indikátory + explainery
  const relatedExplainers = linkIndex?.explainersForStrategy(s.id) ?? [];
  const relatedStrategies = (s.related_strategies ?? [])
    .map(id => allStrategies.find(x => x.id === id))
    .filter(Boolean);

  detail.innerHTML = `
    <a class="back-link" href="strategie.html">← zpět na rozcestí</a>
    <header class="detail-header">
      <div class="detail-meta">
        <span class="status-pill ${status.cls}">${escapeHtml(status.label)}</span>
        ${horizon ? `<span>${escapeHtml(horizon)}</span>` : ''}
        <span>Garant: <strong>${escapeHtml(s.owner ?? '?')}</strong></span>
        ${(s.co_owners ?? []).length ? `<span>Spolu-garanti: ${s.co_owners.map(escapeHtml).join(', ')}</span>` : ''}
      </div>
      <h2>${escapeHtml(s.title)}</h2>
      ${s.subtitle ? `<p class="detail-subtitle">${escapeHtml(s.subtitle)}</p>` : ''}
    </header>

    <section class="detail-tldr">
      <p>${escapeHtml(tldr)}</p>
    </section>

    ${(s.linked_indicators ?? []).length ? `
      <section class="detail-section">
        <h3>Sledované indikátory</h3>
        <div class="chip-row">
          ${s.linked_indicators.map(id =>
            `<a class="chip" href="indicator.html?id=${encodeURIComponent(id)}">${escapeHtml(id)}</a>`
          ).join('')}
        </div>
      </section>
    ` : ''}

    ${relatedStrategies.length ? `
      <section class="detail-section">
        <h3>Související strategie</h3>
        <div class="chip-row">
          ${relatedStrategies.map(rs =>
            `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(rs.id)}">${escapeHtml(rs.title)}</a>`
          ).join('')}
        </div>
      </section>
    ` : ''}

    ${relatedExplainers.length ? `
      <section class="detail-section">
        <h3>Související vysvětlení</h3>
        <div class="chip-row">
          ${relatedExplainers.map(e =>
            `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.title)}</a>`
          ).join('')}
        </div>
      </section>
    ` : ''}

    ${(s.documents ?? []).length ? `
      <section class="detail-section">
        <h3>Dokumenty</h3>
        <ul class="docs-list">
          ${s.documents.map(d => `
            <li>
              <a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(d.title)}</a>
              ${d.lang ? `<span class="lang">${escapeHtml(d.lang)}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    ${s.monitoring ? `
      <section class="detail-section monitoring-block">
        <h3>Monitoring</h3>
        <p>
          Frekvence: <strong>${escapeHtml(s.monitoring.frequency ?? 'neurčeno')}</strong>.
          ${s.monitoring.next_review ? `Další revize plánována: <strong>${escapeHtml(s.monitoring.next_review)}</strong>.` : ''}
          ${s.monitoring.report_url ? `<a href="${escapeHtml(s.monitoring.report_url)}" target="_blank" rel="noopener">Monitoring report ↗</a>` : ''}
        </p>
      </section>
    ` : ''}

    <footer class="detail-footer">
      <span>Ověřeno: ${escapeHtml(s.verified_at ?? '?')}</span>
      ${s.verification_status ? `<span class="verification-badge ${s.verification_status}">${escapeHtml(s.verification_status)}</span>` : ''}
    </footer>
  `;
}

function renderPolicyExtras(filtered) {
  const target = document.getElementById('policyExtras');
  if (!target) return;
  if (filtered.length === 0) {
    target.innerHTML = '';
    target.classList.add('hidden');
    return;
  }
  target.classList.remove('hidden');
  target.innerHTML = `
    <section class="policy-block">
      <header class="policy-block-header">
        <h3>Časová osa strategií</h3>
        <p class="section-note">Horizonty platnosti aktivních strategií. Klik na pruh otevře detail.</p>
      </header>
      ${renderTimeline(filtered)}
    </section>
    <section class="policy-block">
      <header class="policy-block-header">
        <h3>Mapa zodpovědnosti</h3>
        <p class="section-note">Kdo je vlastníkem/spolu-garantem které strategie. Top 16 institucí podle počtu strategií.</p>
      </header>
      ${renderResponsibilityMatrix(filtered)}
    </section>
  `;
}

function wireFilters() {
  document.querySelectorAll('.level-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.level-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLevel = btn.dataset.level;
      renderList();
    });
  });

  const search = document.getElementById('searchBox');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        activeSearch = search.value.trim();
        renderList();
      }, 200);
    });
  }
}

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('strategies');
  renderMastheadDate();

  try {
    const [stratsRes, explsRes] = await Promise.all([
      fetch('data/strategies.json'),
      fetch('data/explainers.json').catch(() => null),
    ]);
    if (!stratsRes.ok) throw new Error(`HTTP ${stratsRes.status}`);
    const stratsData = await stratsRes.json();
    const explsData = explsRes?.ok ? await explsRes.json() : { explainers: [] };

    allStrategies = stratsData.strategies ?? [];
    linkIndex = buildIndex(allStrategies, explsData.explainers ?? []);

    wireFilters();

    const id = new URLSearchParams(window.location.search).get('id');
    if (id) renderDetail(id);
    else renderList();
  } catch (err) {
    console.error('strategies load failed:', err);
    document.getElementById('listView').innerHTML =
      `<p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
  }
}

if (typeof window !== 'undefined') init();
