// Frontend logika stránky financovani-poskytovatele.html (F4).
// Načítá data/providers.json a renderuje filtr, top-20 bar chart a tabulku.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

const REGION_NAMES = {
  CZ010: 'Praha', CZ020: 'Středočeský', CZ031: 'Jihočeský', CZ032: 'Plzeňský',
  CZ041: 'Karlovarský', CZ042: 'Ústecký', CZ051: 'Liberecký', CZ052: 'Královéhradecký',
  CZ053: 'Pardubický', CZ063: 'Vysočina', CZ064: 'Jihomoravský', CZ071: 'Olomoucký',
  CZ072: 'Zlínský', CZ080: 'Moravskoslezský',
};

let DATA = { providers: [], segments_legend: {}, caveats: [], year: null };
let CHART = null;
const STATE = { kraj: '', segment: '', q: '', sort: 'celkem', sortDir: 'desc' };

async function loadData() {
  try {
    const res = await fetch('data/providers.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    console.error('providers.json load failed:', err);
    document.getElementById('fnpTbody').innerHTML =
      '<tr><td colspan="7">Data se nepodařilo načíst.</td></tr>';
  }
}

function fmtCzk(value, unit) {
  if (value == null) return '—';
  if (unit === 'mld') return (value / 1e9).toFixed(2).replace('.', ',');
  if (unit === 'mil') return (value / 1e6).toFixed(0);
  return value.toLocaleString('cs-CZ');
}

function applyFilter() {
  const q = STATE.q.toLowerCase();
  return DATA.providers.filter(p =>
    (!STATE.kraj || p.kraj === STATE.kraj) &&
    (!STATE.segment || p.segment === STATE.segment) &&
    (!q || p.nazev.toLowerCase().includes(q) || p.ico.includes(q))
  );
}

function sortRows(rows) {
  const key = STATE.sort;
  const dir = STATE.sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va, vb;
    if (key === 'celkem') {
      va = a.leky_kc + a.zp_kc; vb = b.leky_kc + b.zp_kc;
    } else {
      va = a[key]; vb = b[key];
    }
    if (typeof va === 'string') return dir * va.localeCompare(vb, 'cs');
    return dir * ((va ?? 0) - (vb ?? 0));
  });
}

function renderFilterOptions() {
  const krajs = [...new Set(DATA.providers.map(p => p.kraj).filter(Boolean))].sort();
  const segments = [...new Set(DATA.providers.map(p => p.segment).filter(Boolean))].sort();

  const krajSelect = document.getElementById('fnpKraj');
  for (const k of krajs) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = `${REGION_NAMES[k] ?? k} (${k})`;
    krajSelect.appendChild(opt);
  }

  const segSelect = document.getElementById('fnpSegment');
  for (const s of segments) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = DATA.segments_legend?.[s]?.label ?? s;
    segSelect.appendChild(opt);
  }
}

function renderTable() {
  const rows = sortRows(applyFilter());
  const tbody = document.getElementById('fnpTbody');
  const count = document.getElementById('fnpTableCount');
  count.textContent = `${rows.length} záznamů`;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7">Žádné záznamy odpovídající filtru.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(p => {
    const segLeg = DATA.segments_legend?.[p.segment];
    const segLabel = segLeg?.label ?? p.segment;
    const segColor = segLeg?.color ?? '#999';
    const total = p.leky_kc + p.zp_kc;
    const nrpzsUrl = `https://nrpzs.uzis.cz/?pg=detail-zdravotnickeho-zarizeni&id=${encodeURIComponent(p.ico)}`;
    return `<tr>
      <td><strong>${escapeHtml(p.nazev)}</strong><br><span class="fnp-ico">IČO ${escapeHtml(p.ico)}</span></td>
      <td>${escapeHtml(REGION_NAMES[p.kraj] ?? p.kraj ?? '')}</td>
      <td><span class="fnp-seg-chip" style="background:${segColor}20;color:${segColor};border-color:${segColor}">${escapeHtml(segLabel)}</span></td>
      <td class="av-num">${fmtCzk(p.leky_kc, 'mld')}</td>
      <td class="av-num">${fmtCzk(p.zp_kc, 'mil')}</td>
      <td class="av-num"><strong>${fmtCzk(total, 'mld')}</strong></td>
      <td><a href="${nrpzsUrl}" target="_blank" rel="noopener">detail&nbsp;↗</a></td>
    </tr>`;
  }).join('');
}

function renderBarChart() {
  const ctx = document.getElementById('fnpBarChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const rows = sortRows(applyFilter()).slice(0, 20);
  const labels = rows.map(p => p.nazev.length > 36 ? p.nazev.slice(0, 35) + '…' : p.nazev);
  const totals = rows.map(p => (p.leky_kc + p.zp_kc) / 1e9);

  if (CHART) CHART.destroy();
  CHART = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Léky + ZP (mld Kč)',
        data: totals,
        backgroundColor: rows.map(p => DATA.segments_legend?.[p.segment]?.color ?? '#999'),
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'mld Kč' },
          grid: { color: 'rgba(31,26,20,0.06)' },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const p = rows[c.dataIndex];
              return `${c.parsed.x.toFixed(2)} mld Kč (léky ${(p.leky_kc / 1e9).toFixed(2)} + ZP ${(p.zp_kc / 1e6).toFixed(0)} mil)`;
            },
          },
        },
      },
    },
  });
}

function renderCaveats() {
  const ul = document.getElementById('fnpCaveatList');
  if (!ul || !DATA.caveats?.length) return;
  ul.innerHTML = DATA.caveats.map(c => `<li>${escapeHtml(c)}</li>`).join('');
}

function rerender() {
  renderTable();
  renderBarChart();
}

function bindFilter() {
  const kraj = document.getElementById('fnpKraj');
  const seg = document.getElementById('fnpSegment');
  const search = document.getElementById('fnpSearch');
  const reset = document.getElementById('fnpFilterReset');

  kraj.addEventListener('change', () => { STATE.kraj = kraj.value; rerender(); });
  seg.addEventListener('change', () => { STATE.segment = seg.value; rerender(); });
  search.addEventListener('input', () => { STATE.q = search.value; rerender(); });
  reset.addEventListener('click', () => {
    STATE.kraj = STATE.segment = STATE.q = '';
    kraj.value = seg.value = search.value = '';
    rerender();
  });

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (STATE.sort === key) {
        STATE.sortDir = STATE.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        STATE.sort = key;
        STATE.sortDir = 'desc';
      }
      rerender();
    });
    th.style.cursor = 'pointer';
  });
}

async function init() {
  renderModuleNav('financovani');
  renderMastheadDate();
  await loadData();
  document.getElementById('fnpYearLabel').textContent = `rok ${DATA.year ?? '—'}`;
  renderFilterOptions();
  bindFilter();
  renderCaveats();
  rerender();
}

if (typeof window !== 'undefined') init();
