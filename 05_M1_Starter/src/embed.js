// Vložitelná (embed) karta jednoho indikátoru — pro iframe na cizích webech
// (novináři, úřady, partneři). Záměrně bez nav/footeru, jen samostatná karta:
//   <iframe src="https://hspa-cesko.cz/embed.html?id=nadeje_doziti_total"
//           width="340" height="220" style="border:0" loading="lazy"></iframe>
//
// Renderuje: název, hodnota+jednotka, rok, signal pill, benchmark, odznak
// verifikace, mini-sparkline trendu a zpětný odkaz na detail (target=_top,
// aby klik z iframe otevřel plnou stránku v hostitelském okně).

import { escapeHtml, resolveVerificationStatus } from './page-shared.js';

const DATA_URL = 'data/indicators.json';
const SITE_BASE = 'https://hspa-cesko.cz';

const SIGNAL_LABELS = {
  good: 'Dobré', warn: 'Ke sledování', bad: 'Kritické', neutral: 'Bez benchmarku',
};
const VERIF_LABELS = {
  verified: 'Ověřeno', preliminary: 'Předběžné', illustrative: 'Ilustrativní',
};

function fmtNumber(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
}

/**
 * Mini-sparkline trendu jako inline SVG (bez závislostí). Vrátí '' když je
 * bodů málo. Poslední bod zvýrazněn tečkou.
 */
export function sparklineSvg(trend, { w = 300, h = 40, pad = 4 } = {}) {
  const pts = (trend ?? []).filter(p => Number.isFinite(Number(p.value)));
  if (pts.length < 2) return '';
  const xs = pts.map(p => Number(p.year));
  const ys = pts.map(p => Number(p.value));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const px = x => pad + ((x - minX) / spanX) * (w - 2 * pad);
  const py = y => h - pad - ((y - minY) / spanY) * (h - 2 * pad);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(xs[i]).toFixed(1)},${py(ys[i]).toFixed(1)}`).join(' ');
  const lastX = px(xs[xs.length - 1]).toFixed(1);
  const lastY = py(ys[ys.length - 1]).toFixed(1);
  return `<svg class="embed-spark" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Trend ${minX}–${maxX}">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="3" fill="currentColor"/>
  </svg>`;
}

export function renderEmbedCard(ind) {
  const status = resolveVerificationStatus(ind);
  const verif = status ? VERIF_LABELS[status] ?? status : null;
  const benchmark = ind.benchmark ?? {};
  const benchParts = [];
  if (benchmark.oecd != null) benchParts.push(`OECD ⌀ ${fmtNumber(benchmark.oecd)}`);
  if (benchmark.eu != null) benchParts.push(`EU ⌀ ${fmtNumber(benchmark.eu)}`);
  const detailUrl = `${SITE_BASE}/indikator-${encodeURIComponent(ind.id)}.html`;

  return `
    <article class="embed-card embed-signal-${escapeHtml(ind.signal ?? 'neutral')}">
      <header class="embed-card-head">
        <span class="embed-card-kicker">HSPA Monitor · ${escapeHtml(ind.area ?? '')}</span>
        <h1 class="embed-card-title">${escapeHtml(ind.name ?? ind.id)}</h1>
      </header>
      <div class="embed-card-value">
        <span class="embed-value">${fmtNumber(ind.value)}</span>
        <span class="embed-unit">${escapeHtml(ind.unit ?? '')}</span>
        ${ind.year ? `<span class="embed-year">${escapeHtml(String(ind.year))}</span>` : ''}
      </div>
      <div class="embed-card-meta">
        <span class="signal-pill ${escapeHtml(ind.signal ?? 'neutral')}">${SIGNAL_LABELS[ind.signal] ?? '—'}</span>
        ${benchParts.length ? `<span class="embed-bench">${benchParts.join(' · ')}</span>` : ''}
        ${verif ? `<span class="embed-verif embed-verif-${status}">${verif}</span>` : ''}
      </div>
      ${sparklineSvg(ind.trend)}
      <footer class="embed-card-foot">
        <a href="${escapeHtml(detailUrl)}" target="_top" rel="noopener">Zdroj: HSPA Monitor — ${escapeHtml(ind.source?.name ?? 'detail')} ↗</a>
      </footer>
    </article>`;
}

async function init() {
  if (typeof window === 'undefined') return;
  const root = document.getElementById('embedRoot');
  if (!root) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    root.innerHTML = '<p class="embed-error">Chybí parametr <code>?id=…</code>.</p>';
    return;
  }
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    const data = await res.json();
    const ind = (data.indicators ?? []).find(i => i.id === id);
    if (!ind) {
      root.innerHTML = `<p class="embed-error">Indikátor <code>${escapeHtml(id)}</code> nenalezen.</p>`;
      return;
    }
    document.title = `${ind.name} · HSPA Monitor`;
    root.innerHTML = renderEmbedCard(ind);
  } catch (err) {
    root.innerHTML = '<p class="embed-error">Nepodařilo se načíst data indikátoru.</p>';
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
