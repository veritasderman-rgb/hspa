// Frontend logika stránky pracovni-ukoly.html — dashboard úkolů zadaných
// na jednáních poradních orgánů MZ (data/ppo-ukoly.json, staví
// ingest/ppo/build-web.js z analýz FÁZE 2). Zápisy zachycují ZADÁNÍ úkolu —
// splnění z dat odvodit nelze; „otevřené úkoly" jsou syntézou profilů skupin.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';

/** Normalizace pro hledání: bez diakritiky, lowercase. */
export function normText(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const MESICE_CZ = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

/** ISO datum → „4. září 2025"; nevalidní vstup vrací beze změny. */
export function formatDatumCz(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '');
  if (!m) return d ?? '';
  return `${Number(m[3])}. ${MESICE_CZ[Number(m[2]) - 1]} ${Number(m[1])}`;
}

/** „2026-06" → „od června 2026". */
export function formatOd(od) {
  const m = /^(\d{4})-(\d{2})$/.exec(od ?? '');
  if (!m) return od ? `od ${od}` : '';
  const nom = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'][Number(m[2]) - 1];
  return `od ${nom} ${m[1]}`;
}

/** Deep-link ?skupina=N → hodnota filtru orgánu; neznámé id se ignoruje. */
export function skupinaFromSearch(search, validIds) {
  const raw = new URLSearchParams(search).get('skupina');
  return raw != null && validIds.has(Number(raw)) ? String(Number(raw)) : 'all';
}

/** Osud úkolu pro filtr. Externí „vydáno" je doložené splnění JEN s primy:
 *  true — publikace navazujícího výstupu neprokazuje provedení mezikroku. */
export function osudMatch(u, stav) {
  if (stav === 'all') return true;
  if (stav === 'splneno') return u.stav === 'splneno' || (u.ext?.stav === 'vydano' && u.ext.primy);
  if (stav === 'pokracuje') return u.stav === 'pokracuje';
  return !u.stav && !u.ext; // 'bez' — zápisy i rešerše mlčí
}

/** Filtr úkolů (čistá funkce — testovatelná). rok filtruje podle roku jednání. */
export function filterUkoly(list, { q = '', g = 'all', rok = 'all', stav = 'all' } = {}, nazvy = new Map()) {
  const nq = normText(q.trim());
  return list.filter(u =>
    (g === 'all' || u.g === Number(g))
    && (rok === 'all' || (u.datum ?? '').slice(0, 4) === rok)
    && osudMatch(u, stav)
    && (!nq || normText(`${u.co} ${u.kdo ?? ''} ${nazvy.get(u.g) ?? ''}`).includes(nq)));
}

/** HTML chipů osudu úkolu (doložené splnění / pokračuje / externí výsledek). */
export function osudChips(u, esc) {
  const chips = [];
  if (u.stav === 'splneno') {
    chips.push(`<span class="ppo-uk-ok"${u.dk ? ` title="${esc(u.dk)}"` : ''}>✓ doloženo${u.sd ? ` ${esc(formatDatumCz(u.sd))}` : ''}${u.du ? ` <a href="${esc(u.du)}" target="_blank" rel="noopener">zápis ↗</a>` : ''}</span>`);
  } else if (u.stav === 'pokracuje') {
    chips.push(`<span class="ppo-uk-run"${u.dk ? ` title="${esc(u.dk)}"` : ''}>pokračuje${u.sd ? ` (${esc(formatDatumCz(u.sd))})` : ''}</span>`);
  }
  if (u.ext?.stav === 'vydano' && u.ext.primy) {
    chips.push(`<span class="ppo-uk-ok">✓ vydáno${u.ext.datum ? ` ${esc(formatDatumCz(u.ext.datum))}` : ''}${u.ext.url ? ` <a href="${esc(u.ext.url)}" target="_blank" rel="noopener">${esc(u.ext.nazev ?? 'dokument')} ↗</a>` : ''}</span>`);
  } else if (u.ext?.stav === 'vydano') {
    chips.push(`<span class="ppo-uk-run" title="výsledek navazujícího procesu — nedokládá provedení tohoto konkrétního úkolu">→ výstup vydán${u.ext.datum ? ` ${esc(formatDatumCz(u.ext.datum))}` : ''}${u.ext.url ? ` <a href="${esc(u.ext.url)}" target="_blank" rel="noopener">${esc(u.ext.nazev ?? 'dokument')} ↗</a>` : ''}</span>`);
  } else if (u.ext?.stav === 'v_procesu') {
    chips.push(`<span class="ppo-uk-run">v legislativním procesu${u.ext.url ? ` <a href="${esc(u.ext.url)}" target="_blank" rel="noopener">↗</a>` : ''}</span>`);
  }
  return chips.join(' ');
}

/** Mapa orgánů pro rozcestník: souhrn osudu úkolů po skupině, seřazeno
 *  podle počtu úkolů. spl počítá doložené splnění včetně primy ext
 *  (stejná definice jako filtr „jen doložené splnění"). Čistá funkce. */
export function mapaSkupin(ukoly) {
  const m = new Map();
  for (const u of ukoly) {
    let r = m.get(u.g);
    if (!r) { r = { g: u.g, total: 0, spl: 0, pok: 0, osa: 0 }; m.set(u.g, r); }
    r.total++;
    if (osudMatch(u, 'splneno')) r.spl++;
    else if (u.stav === 'pokracuje') r.pok++;
    // řádek časové osy — STEJNÁ podmínka jako ganttData na detailu skupiny:
    // datované zadání + termín či doklad striktně pozdější než zadání
    const extPrimy = u.ext?.stav === 'vydano' && u.ext.primy;
    const sd = u.sd ?? (extPrimy ? u.ext.datum : null);
    if (u.datum && ((u.t && u.t > u.datum) || (sd && sd > u.datum))) r.osa++;
  }
  return [...m.values()].map(r => ({ ...r, bez: r.total - r.spl - r.pok }))
    .sort((a, b) => b.total - a.total || a.g - b.g);
}

const $ = id => document.getElementById(id);
const KROK = 150;
const MAPA_TOP = 12;
let DATA = null, NAZVY = new Map();
let fQ = '', fG = 'all', fRok = 'all', fStav = 'all', limit = KROK;
let mapaVse = false;

function skupinaLink(g) {
  return `<a href="pracovni-skupina.html?id=${g}">${escapeHtml(NAZVY.get(g) ?? `skupina ${g}`)}</a>`;
}

function renderMapa() {
  const rows = mapaSkupin(DATA.ukoly);
  const max = rows[0]?.total || 1;
  const shown = mapaVse ? rows : rows.slice(0, MAPA_TOP);
  $('ukMapa').innerHTML = shown.map(r => {
    const w = seg => `${(seg / max * 100).toFixed(1)}%`;
    const nazev = NAZVY.get(r.g) ?? `skupina ${r.g}`;
    const tip = `${nazev}: ${r.total} úkolů — ${r.spl} doloženě splněno, ${r.pok} pokračuje, ${r.bez} bez dokladu v zápisech`;
    return `<div class="ppo-um-row">
      <div class="ppo-um-head">
        <button type="button" class="ppo-um-name" data-g="${r.g}" title="Filtrovat dashboard na tento orgán">${escapeHtml(nazev)}</button>
        <span class="ppo-um-n">${r.total}</span>
      </div>
      <button type="button" class="ppo-um-bar" data-g="${r.g}" title="${escapeHtml(tip)}" aria-label="${escapeHtml(tip)}">
        ${r.spl ? `<i class="ppo-um-spl" style="width:${w(r.spl)}"></i>` : ''}${r.pok ? `<i class="ppo-um-pok" style="width:${w(r.pok)}"></i>` : ''}${r.bez ? `<i class="ppo-um-bez" style="width:${w(r.bez)}"></i>` : ''}
      </button>
      <p class="ppo-um-meta">${r.spl ? `<span class="ppo-um-t-spl">${r.spl} doloženě splněno</span>` : ''}${r.pok ? ` · ${r.pok} pokračuje` : ''}${r.bez ? ` · ${r.bez} bez dokladu` : ''}
        ${r.osa >= 3
          ? `<a href="pracovni-skupina.html?id=${r.g}#ukTimeline">detail a časová osa ↗</a>`
          : `<a href="pracovni-skupina.html?id=${r.g}">detail skupiny ↗</a>`}</p>
    </div>`;
  }).join('');
  const btn = $('ukMapaMore');
  btn.classList.toggle('hidden', rows.length <= MAPA_TOP);
  btn.textContent = mapaVse ? 'Zobrazit jen největší' : `Zobrazit všech ${rows.length} orgánů`;
}

function vyberSkupinu(g) {
  fG = String(g);
  fRok = 'all';
  limit = KROK;
  $('ukSkupina').value = fG;
  renderOtevrene(); renderRoky(); renderList();
  document.getElementById('ukListH')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderOtevrene() {
  const rows = filterUkoly(DATA.otevrene, { q: fQ, g: fG }, NAZVY);
  $('ukOpenCount').textContent = String(rows.length);
  $('ukOpenEmpty').classList.toggle('hidden', rows.length > 0);
  $('ukOpen').innerHTML = rows.map(u => `<li class="ppo-uk-item">
    <p class="ppo-uk-co">${escapeHtml(u.co)}</p>
    <p class="ppo-uk-meta">${skupinaLink(u.g)}${u.kdo ? ` · ${escapeHtml(u.kdo)}` : ''}${u.od ? ` <span class="ppo-uk-t">${escapeHtml(formatOd(u.od))}</span>` : ''} ${osudChips(u, escapeHtml)}</p>
  </li>`).join('');
}

function renderRoky() {
  const counts = new Map();
  for (const u of filterUkoly(DATA.ukoly, { q: fQ, g: fG, stav: fStav }, NAZVY)) {
    const r = (u.datum ?? '').slice(0, 4);
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const roky = [...counts.keys()].sort();
  $('ukRoky').innerHTML = roky.map(r =>
    `<button type="button" class="ppo-uk-rok${fRok === r ? ' is-active' : ''}" data-rok="${r}">${r} <span>${counts.get(r)}</span></button>`
  ).join('');
}

function renderList() {
  const rows = filterUkoly(DATA.ukoly, { q: fQ, g: fG, rok: fRok, stav: fStav }, NAZVY);
  $('ukCount').textContent = String(rows.length);
  $('ukEmpty').classList.toggle('hidden', rows.length > 0);
  const shown = rows.slice(0, limit);
  let lastRok = null;
  const html = [];
  for (const u of shown) {
    const r = (u.datum ?? '').slice(0, 4) || 'bez data';
    if (r !== lastRok) { html.push(`<li class="ppo-uk-year" aria-hidden="true">${escapeHtml(r)}</li>`); lastRok = r; }
    html.push(`<li class="ppo-uk-item">
      <p class="ppo-uk-co">${escapeHtml(u.co)}</p>
      <p class="ppo-uk-meta">${skupinaLink(u.g)}${u.datum ? ` · jednání ${escapeHtml(formatDatumCz(u.datum))}` : ''}${u.kdo ? ` · ${escapeHtml(u.kdo)}` : ''}${u.termin ? ` <span class="ppo-uk-t" title="termín dle zápisu">termín: ${escapeHtml(u.termin)}</span>` : ''} ${osudChips(u, escapeHtml)}</p>
    </li>`);
  }
  $('ukList').innerHTML = html.join('');
  $('ukMore').classList.toggle('hidden', rows.length <= limit);
  if (rows.length > limit) $('ukMore').textContent = `Zobrazit dalších ${Math.min(KROK, rows.length - limit)} (celkem ${rows.length})`;
}

function rerender() { renderOtevrene(); renderRoky(); renderList(); }

function wireMapa() {
  renderMapa();
  $('ukMapa').addEventListener('click', e => {
    const b = e.target.closest('button[data-g]');
    if (b) vyberSkupinu(b.dataset.g);
  });
  $('ukMapaMore').addEventListener('click', () => { mapaVse = !mapaVse; renderMapa(); });
}

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  try {
    const res = await fetch('data/ppo-ukoly.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    NAZVY = new Map(DATA.skupiny.map(s => [s.g, s.nazev]));

    $('sUkolu').textContent = String(DATA.pocty.ukoly);
    $('sOtevrene').textContent = String(DATA.pocty.otevrene);
    $('sSkupin').textContent = String(DATA.skupiny.length);

    $('ukSkupina').innerHTML = '<option value="all">Všechny orgány</option>'
      + DATA.skupiny.map(s => `<option value="${s.g}">${escapeHtml(s.nazev)}</option>`).join('');

    // deep-link z detailu skupiny (pracovni-ukoly.html?skupina=N)
    fG = skupinaFromSearch(window.location.search, new Set(DATA.skupiny.map(s => s.g)));
    $('ukSkupina').value = fG;

    $('ukSearch').addEventListener('input', e => { fQ = e.target.value; limit = KROK; rerender(); });
    $('ukSkupina').addEventListener('change', e => { fG = e.target.value; fRok = 'all'; limit = KROK; rerender(); });
    $('ukStav').addEventListener('change', e => { fStav = e.target.value; limit = KROK; rerender(); });
    $('ukRoky').addEventListener('click', e => {
      const b = e.target.closest('button[data-rok]');
      if (!b) return;
      fRok = fRok === b.dataset.rok ? 'all' : b.dataset.rok;
      limit = KROK;
      renderRoky(); renderList();
    });
    $('ukMore').addEventListener('click', () => { limit += KROK; renderList(); });

    wireMapa();
    rerender();
  } catch (err) {
    console.error('ppo-ukoly load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst úkoly z jednání.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('ukList')) init();
