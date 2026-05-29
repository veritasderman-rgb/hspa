// Frontend renderer pro data/analytics-public.json — veřejný mini-dashboard
// na o-projektu.html v sekci "Co lidé na portálu čtou".
//
// Načítá `data/analytics-public.json` (auto-generováno cronem), vypisuje:
//   - Top 10 indikátorů týdne (klikací → indicator.html)
//   - Top 10 článků týdne (klikací → clanek-*.html)
//   - Nejhledanější odborné pojmy (glosář)
//   - Odkud návštěvníci přicházejí (source/medium)
//   - Top sdílení (linkedin/twitter/...)
//   - Trend návštěvnosti 30 dnů (jednoduchá sparkline)
//
// Pokud data ještě nejsou (placeholder seed), zobrazí klidnou no-data
// zprávu. Žádný retry, žádné polling — jen statický fetch.

const FORMAT_NUM = new Intl.NumberFormat('cs-CZ');
const FORMAT_DATE = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNum(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return FORMAT_NUM.format(Math.round(n));
}

function fmtSeconds(s) {
  if (!Number.isFinite(s) || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m} m ${sec} s` : `${sec} s`;
}

function isPlaceholder(data) {
  return data?.status === 'seed'
    || ((data?.top_indicators?.length ?? 0) === 0
      && (data?.top_articles?.length ?? 0) === 0
      && (data?.top_glossary_terms?.length ?? 0) === 0);
}

function renderNoData(slot, generatedAt) {
  const date = generatedAt
    ? FORMAT_DATE.format(new Date(generatedAt))
    : '—';
  slot.innerHTML = `
    <p class="apub-empty">
      Veřejný dashboard se aktivuje automaticky <strong>jakmile bude nastaven Service Account a GA Property ID</strong>
      v GitHub Secrets. Do té doby zde nezobrazujeme žádná „mock" čísla. Stav k ${escapeHtml(date)}.
      Detail v <a href="https://github.com/veritasderman-rgb/hspa/blob/main/05_M1_Starter/PLAN-GA4-ROZSIRENI.md" target="_blank" rel="noopener">PLAN-GA4-ROZSIRENI.md</a>.
    </p>`;
}

/**
 * Renderuje seznam ranking-style položek (top indikátory, top články atd.).
 */
function renderRanking(items, formatItem) {
  if (!items || items.length === 0) {
    return '<p class="apub-empty-small">Zatím prázdné — čekáme na nasbírání dat.</p>';
  }
  const rows = items.map((item, i) => {
    const { label, value, sublabel, href } = formatItem(item, i);
    const title = href
      ? `<a class="apub-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
      : escapeHtml(label);
    const sub = sublabel ? `<div class="apub-sublabel">${escapeHtml(sublabel)}</div>` : '';
    return `<li class="apub-row">
      <span class="apub-rank">${i + 1}</span>
      <span class="apub-item">${title}${sub}</span>
      <span class="apub-value">${escapeHtml(value)}</span>
    </li>`;
  }).join('');
  return `<ol class="apub-list">${rows}</ol>`;
}

/**
 * Vykreslí jednoduchou SVG sparkline pro 30denní trend návštěvnosti.
 */
function renderTrendSparkline(trend) {
  if (!trend || trend.length === 0) {
    return '<p class="apub-empty-small">Trend zatím nedostupný.</p>';
  }
  const values = trend.map(t => t.users || 0);
  const max = Math.max(...values, 1);
  const W = 600, H = 80;
  const dx = W / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${(i * dx).toFixed(1)},${(H - (v / max) * (H - 6) - 3).toFixed(1)}`).join(' ');
  const last = trend[trend.length - 1];
  const lastDate = last?.date ? FORMAT_DATE.format(new Date(last.date)) : '—';
  return `
    <figure class="apub-trend" aria-label="Trend návštěvnosti za posledních 30 dnů">
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width:100%;height:80px;">
        <polyline fill="none" stroke="var(--red, #b8361e)" stroke-width="2" points="${points}"/>
        <circle cx="${((values.length - 1) * dx).toFixed(1)}" cy="${(H - (values[values.length - 1] / max) * (H - 6) - 3).toFixed(1)}" r="3.5" fill="var(--red, #b8361e)"/>
      </svg>
      <figcaption class="apub-trend-caption">
        Návštěvníci posledních 30 dnů · poslední den (${escapeHtml(lastDate)}): <strong>${fmtNum(last?.users)}</strong>
      </figcaption>
    </figure>`;
}

function renderDashboard(data) {
  const slot = document.getElementById('analyticsPublicSlot');
  if (!slot) return;

  if (isPlaceholder(data)) {
    renderNoData(slot, data?.generated_at);
    return;
  }

  const generatedDate = data.generated_at ? FORMAT_DATE.format(new Date(data.generated_at)) : '—';
  const periodLabel = data.period
    ? `${FORMAT_DATE.format(new Date(data.period.from))} – ${FORMAT_DATE.format(new Date(data.period.to))}`
    : '—';

  const indicatorsHtml = renderRanking(data.top_indicators ?? [], (item) => ({
    label: item.id,
    value: `${fmtNum(item.clicks)}×`,
    href: `indicator.html?id=${encodeURIComponent(item.id)}`,
  }));

  const articlesHtml = renderRanking(data.top_articles ?? [], (item) => ({
    label: item.slug,
    value: `${fmtNum(item.views)} zobrazení`,
    sublabel: `průměrný čas: ${fmtSeconds(item.avg_engagement_s)}`,
    href: `${item.slug}.html`,
  }));

  const termsHtml = renderRanking(data.top_glossary_terms ?? [], (item) => ({
    label: item.term,
    value: `${fmtNum(item.opens)}×`,
    href: 'glosar.html',
  }));

  const sourcesHtml = renderRanking(data.traffic_sources ?? [], (item) => ({
    label: item.source ?? '(direct)',
    value: `${fmtNum(item.users)} návštěvníků`,
    sublabel: item.medium && item.medium !== '(none)' ? `medium: ${item.medium}` : null,
  }));

  const sharesHtml = renderRanking(data.share_breakdown ?? [], (item) => ({
    label: item.channel,
    value: `${fmtNum(item.count)}×`,
  }));

  const externalHtml = renderRanking(data.external_sources ?? [], (item) => ({
    label: item.source,
    value: `${fmtNum(item.clicks)} kliků`,
  }));

  const trendHtml = renderTrendSparkline(data.traffic_trend_30d ?? []);

  slot.innerHTML = `
    <div class="apub-meta">
      <span>Období: <strong>${escapeHtml(periodLabel)}</strong></span>
      <span>Generováno: ${escapeHtml(generatedDate)}</span>
    </div>

    ${trendHtml}

    <div class="apub-grid">
      <div class="apub-card">
        <h4 class="apub-card-h">Top 10 indikátorů</h4>
        <p class="apub-card-desc">Co lidé v hub matrix klíčí.</p>
        ${indicatorsHtml}
      </div>

      <div class="apub-card">
        <h4 class="apub-card-h">Top 10 článků</h4>
        <p class="apub-card-desc">Reálně otevřené long-form texty.</p>
        ${articlesHtml}
      </div>

      <div class="apub-card">
        <h4 class="apub-card-h">Nejhledanější odborné pojmy</h4>
        <p class="apub-card-desc">Kandidáti na lepší vysvětlení přímo v textu.</p>
        ${termsHtml}
      </div>

      <div class="apub-card">
        <h4 class="apub-card-h">Odkud přicházejí</h4>
        <p class="apub-card-desc">Zdroj/medium návštěv.</p>
        ${sourcesHtml}
      </div>

      <div class="apub-card">
        <h4 class="apub-card-h">Sdílení článků</h4>
        <p class="apub-card-desc">Který kanál vede.</p>
        ${sharesHtml}
      </div>

      <div class="apub-card">
        <h4 class="apub-card-h">Klíče na primární zdroje</h4>
        <p class="apub-card-desc">Kam návštěvníci jdou za daty.</p>
        ${externalHtml}
      </div>
    </div>`;
}

async function init() {
  const slot = document.getElementById('analyticsPublicSlot');
  if (!slot) return;

  try {
    const res = await fetch('data/analytics-public.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    console.warn('analytics-public.json load failed:', err);
    slot.innerHTML = `<p class="apub-empty">Statistiky se zatím nepodařilo načíst.</p>`;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}

// Export pro testy
export { isPlaceholder, fmtNum, fmtSeconds, renderTrendSparkline };
