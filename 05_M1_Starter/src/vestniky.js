// Frontend logika stránky vestniky-mz.html — HTML archiv Věstníků MZ.
// Čte data/vestniky.json (staví ingest/fetchers/vestniky.js: WP REST API
// mzd.gov.cz + extrakce obsahu starších částek z PDF). Částka = jedno číslo
// Věstníku; položka obsahu = jeden dokument v něm (metodika, standard,
// cenový předpis…). Hledání jde přes položky, filtry přes rok a kategorii.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';

/** Normalizace pro hledání: bez diakritiky, lowercase. */
export function normText(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const KAT_LABELS = {
  screening: 'screening',
  ockovani: 'očkování',
  centra: 'centra péče',
  leciva: 'léčiva',
  cenove: 'ceny a úhrady',
  standardy: 'standardy a metodiky',
  vzdelavani: 'vzdělávání',
  spravni: 'správní',
  dotace: 'dotace',
  ostatni: 'ostatní',
};

const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

/** ISO datum → „20. srpna 2026"; nevalidní vstup vrací beze změny. */
export function fmtDatum(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '');
  if (!m) return d ?? '';
  return `${Number(m[3])}. ${MESICE[Number(m[2]) - 1]} ${m[1]}`;
}

/** Filtr částek (čistá funkce — testovatelná).
 *  q hledá v titulu částky i položkách obsahu; kat/rok filtrují částky,
 *  jejichž obsah kategorii obsahuje. Vrací částky s už zúženým obsahem:
 *  při aktivním hledání/kategorii se ukážou jen odpovídající položky. */
export function filterCastky(castky, { q = '', rok = 'all', kat = 'all' } = {}) {
  const nq = normText(q.trim());
  const out = [];
  for (const c of castky) {
    if (rok !== 'all' && String(c.rok) !== rok) continue;
    let obsah = c.obsah;
    if (kat !== 'all') obsah = obsah.filter(o => o.kat === kat);
    if (nq) {
      const titulHit = normText(c.titul).includes(nq);
      const oHits = obsah.filter(o => normText(o.t).includes(nq));
      if (!titulHit && !oHits.length) continue;
      obsah = oHits.length ? oHits : obsah;
    } else if (kat !== 'all' && !obsah.length) {
      continue;
    }
    out.push({ ...c, obsah });
  }
  return out;
}

const $ = id => document.getElementById(id);
const KROK = 30;
let DATA = null;
let fQ = '', fRok = 'all', fKat = 'all', limit = KROK;

function katChip(kat) {
  return `<span class="vst-kat vst-kat-${kat}">${escapeHtml(KAT_LABELS[kat] ?? kat)}</span>`;
}

function renderRoky() {
  const counts = new Map();
  for (const c of filterCastky(DATA.castky, { q: fQ, kat: fKat })) {
    if (c.rok) counts.set(String(c.rok), (counts.get(String(c.rok)) ?? 0) + 1);
  }
  if (fRok !== 'all' && !counts.has(fRok)) counts.set(fRok, 0);
  const roky = [...counts.keys()].sort();
  $('vstRoky').innerHTML = roky.map(r =>
    `<button type="button" class="ppo-uk-rok${fRok === r ? ' is-active' : ''}" data-rok="${r}">${r} <span>${counts.get(r)}</span></button>`
  ).join('');
}

function renderList() {
  const rows = filterCastky(DATA.castky, { q: fQ, rok: fRok, kat: fKat });
  $('vstCount').textContent = String(rows.length);
  $('vstEmpty').classList.toggle('hidden', rows.length > 0);
  const shown = rows.slice(0, limit);
  let lastRok = null;
  const html = [];
  for (const c of shown) {
    const r = c.rok ? String(c.rok) : 'bez roku';
    if (r !== lastRok) { html.push(`<li class="ppo-uk-year" aria-hidden="true">${escapeHtml(r)}</li>`); lastRok = r; }
    const links = [
      c.url ? `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">stránka MZ ↗</a>` : '',
      c.pdf ? `<a href="${escapeHtml(c.pdf)}" target="_blank" rel="noopener">PDF ↗</a>` : '',
    ].filter(Boolean).join(' · ');
    const obsah = c.obsah.length
      ? `<ol class="vst-obsah">${c.obsah.map(o =>
        `<li>${escapeHtml(o.t)} ${katChip(o.kat)}</li>`).join('')}</ol>`
      : '<p class="vst-noobsah">Obsah se nepodařilo strojově přečíst — otevřete PDF.</p>';
    html.push(`<li class="vst-castka">
      <p class="vst-castka-h"><strong>${escapeHtml(c.titul)}</strong>
        ${c.datum ? `<span class="vst-datum">${escapeHtml(fmtDatum(c.datum))}</span>` : ''}
        <span class="vst-links">${links}</span></p>
      ${obsah}
    </li>`);
  }
  $('vstList').innerHTML = html.join('');
  $('vstMore').classList.toggle('hidden', rows.length <= limit);
  if (rows.length > limit) $('vstMore').textContent = `Zobrazit dalších ${Math.min(KROK, rows.length - limit)} (celkem ${rows.length})`;
}

function rerender() { renderRoky(); renderList(); }

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  try {
    const res = await fetch('data/vestniky.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();

    $('sCastek').textContent = String(DATA.pocty.castky);
    $('sPolozek').textContent = String(DATA.pocty.polozky);
    const roky = DATA.castky.map(c => c.rok).filter(Boolean);
    $('sRozsah').textContent = `${Math.min(...roky)}–${Math.max(...roky)}`;

    const kats = [...new Set(DATA.castky.flatMap(c => c.obsah.map(o => o.kat)))]
      .sort((a, b) => (KAT_LABELS[a] ?? a).localeCompare(KAT_LABELS[b] ?? b, 'cs'));
    $('vstKat').innerHTML = '<option value="all">Všechny kategorie</option>'
      + kats.map(k => `<option value="${k}">${escapeHtml(KAT_LABELS[k] ?? k)}</option>`).join('');

    $('vstSearch').addEventListener('input', e => { fQ = e.target.value; limit = KROK; rerender(); });
    $('vstKat').addEventListener('change', e => { fKat = e.target.value; limit = KROK; rerender(); });
    $('vstRoky').addEventListener('click', e => {
      const b = e.target.closest('button[data-rok]');
      if (!b) return;
      fRok = fRok === b.dataset.rok ? 'all' : b.dataset.rok;
      limit = KROK;
      rerender();
    });
    $('vstMore').addEventListener('click', () => { limit += KROK; renderList(); });

    rerender();
  } catch (err) {
    console.error('vestniky load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst archiv věstníků.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('vstList')) init();
