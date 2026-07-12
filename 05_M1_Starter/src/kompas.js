// Osobní zdravotní kompas (kompas.html) — osobní čočka nad daty portálu.
// Vstup: věk, pohlaví, kraj, kouření (jen v prohlížeči, nic se neukládá ani
// neodesílá). Výstup: checklist prevence relevantní profilu + krajský kontext.
// Data: data/personal-checks.json, data/regions.json, data/articles.json.
// Výpočet: src/kompas-engine.js (čistý, testovaný). Informace, NE lékařská rada.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, isArticleVisible, renderRelatedTools } from './page-shared.js';
import { applicableChecks, regionStat } from './kompas-engine.js';

let CHECKS = [];
let REGIONS = { datasets: [] };
let ARTICLES = new Map();

const CATEGORY_LABEL = { prohlidka: 'Preventivní prohlídka', screening: 'Screening', ockovani: 'Očkování' };

// ---------------------------------------------------------------------------
// Profil z formuláře
// ---------------------------------------------------------------------------

function readProfile() {
  const ageRaw = document.getElementById('kompasAge')?.value;
  const age = ageRaw === '' || ageRaw == null ? undefined : Number(ageRaw);
  const sexEl = document.querySelector('input[name="kompasSex"]:checked');
  const sex = sexEl && sexEl.value !== 'all' ? sexEl.value : undefined;
  const smoking = !!document.getElementById('kompasSmoking')?.checked;
  const kraj = document.getElementById('kompasKraj')?.value || '';
  return { age: Number.isFinite(age) ? age : undefined, sex, smoking, kraj };
}

function profileTouched(p) {
  return p.age !== undefined || p.sex !== undefined || p.smoking || p.kraj;
}

// ---------------------------------------------------------------------------
// Kraj select
// ---------------------------------------------------------------------------

function populateKraje() {
  const sel = document.getElementById('kompasKraj');
  if (!sel) return;
  const byCode = new Map();
  for (const ds of REGIONS.datasets || []) {
    for (const r of ds.regions || []) {
      if (r.code && r.name && !byCode.has(r.code)) byCode.set(r.code, r.name);
    }
  }
  const opts = [...byCode.entries()].sort((a, b) => a[1].localeCompare(b[1], 'cs'));
  for (const [code, name] of opts) {
    const o = document.createElement('option');
    o.value = code;
    o.textContent = name;
    sel.appendChild(o);
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function czNum(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 100) / 100).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
}

function renderRegion(check, kraj) {
  if (!check.region_dataset || !kraj) return '';
  const ds = (REGIONS.datasets || []).find(d => d.id === check.region_dataset);
  const stat = regionStat(ds, kraj);
  if (!stat) return '';
  const krajName = ds.regions.find(r => r.code === kraj)?.name || 'váš kraj';
  const cls = stat.better === true ? 'kompas-region-good' : stat.better === false ? 'kompas-region-bad' : 'kompas-region-neutral';
  const cmp = stat.country_avg != null
    ? ` (celostátní průměr ${czNum(stat.country_avg)} ${escapeHtml(stat.unit)})`
    : '';
  const rank = stat.rank ? `${stat.rank}. z ${stat.of} krajů` : '';
  return `
    <p class="kompas-region ${cls}">
      <span class="kompas-region-lbl">Váš kraj (${escapeHtml(krajName)}):</span>
      <strong>${czNum(stat.value)} ${escapeHtml(stat.unit)}</strong>${cmp}
      ${rank ? `<span class="kompas-region-rank">${escapeHtml(rank)}</span>` : ''}
    </p>`;
}

function renderArticles(check) {
  const links = (check.related_articles || [])
    .map(slug => ARTICLES.get(slug))
    .filter(a => a && isArticleVisible(a))
    .map(a => `<a href="${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a>`);
  if (!links.length) return '';
  return `<p class="kompas-links"><span class="kompas-links-lbl">Přečtěte si:</span> ${links.join(' · ')}</p>`;
}

function renderCheck(check, kraj) {
  const cat = CATEGORY_LABEL[check.category] || check.category;
  const src = check.source
    ? `<p class="kompas-src">Zdroj: ${check.source.url
        ? `<a href="${escapeHtml(check.source.url)}" target="_blank" rel="noopener">${escapeHtml(check.source.name)}</a>`
        : escapeHtml(check.source.name)}</p>`
    : '';
  return `
    <article class="kompas-card kompas-cat-${escapeHtml(check.category)}">
      <div class="kompas-card-head">
        <span class="kompas-cat">${escapeHtml(cat)}</span>
        <span class="kompas-interval">${escapeHtml(check.interval)}</span>
      </div>
      <h3 class="kompas-card-title">${escapeHtml(check.label)}</h3>
      <p class="kompas-rec">${escapeHtml(check.recommendation)}</p>
      ${renderRegion(check, kraj)}
      ${renderArticles(check)}
      ${src}
    </article>`;
}

function renderResults() {
  const host = document.getElementById('kompasResultsList');
  if (!host) return;
  const profile = readProfile();

  if (!profileTouched(profile)) {
    host.innerHTML = `<p class="kompas-empty">Vyplňte věk a pohlaví vlevo a Kompas sestaví, co se vás v systému prevence právě týká.</p>`;
    return;
  }

  const list = applicableChecks(CHECKS, profile);
  if (!list.length) {
    host.innerHTML = `<p class="kompas-empty">Pro zadaný profil nemáme v katalogu žádný hrazený preventivní check. Zkuste doplnit věk.</p>`;
    return;
  }

  const intro = `<p class="kompas-count">${list.length} ${czPlural(list.length, 'položka', 'položky', 'položek')} prevence pro váš profil:</p>`;
  host.innerHTML = intro + list.map(c => renderCheck(c, profile.kraj)).join('');
}

function czPlural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
  renderModuleNav('prevention');
  renderMastheadDate();
  renderRelatedTools('kompas');

  const host = document.getElementById('kompasResultsList');
  if (!host) return;
  try {
    const [checksDoc, regionsDoc, artsDoc] = await Promise.all([
      fetch('data/personal-checks.json').then(r => r.json()),
      fetch('data/regions.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
    ]);
    CHECKS = checksDoc.checks ?? [];
    REGIONS = regionsDoc ?? { datasets: [] };
    ARTICLES = new Map((artsDoc.articles ?? []).map(a => [a.slug, a]));

    populateKraje();
    renderResults();

    const form = document.getElementById('kompasForm');
    if (form) {
      form.addEventListener('input', renderResults);
      form.addEventListener('change', renderResults);
      form.addEventListener('reset', () => setTimeout(renderResults, 0));
    }
  } catch (err) {
    host.innerHTML = renderErrorState('Osobní kompas se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
