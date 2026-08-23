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
  oznameni: 'oznámení a sdělení',
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

/** Zkrácený název orgánu pro badge: bez úvodních „Komise pro (přípravu)
 *  programu / Pracovní skupina k…" — v badge stačí jádro názvu. */
export function zkratNazev(nazev) {
  const s = String(nazev ?? '')
    .replace(/^(Komise pro (přípravu )?(program(u)? )?|Pracovní skupina (pro|k) |Meziresortní pracovní skupina pro |Národní )/i, '')
    .trim();
  const out = s.charAt(0).toUpperCase() + s.slice(1);
  return out.length > 42 ? `${out.slice(0, 41)}…` : out;
}

/** Stopwords fulltextového indexu — MUSÍ být identické s STOPWORDS
 *  v ingest/lib/vestniky-fulltext.js (paritu hlídá test). Bez nich by dotaz
 *  „mamografie podle věku" selhal: „podle" v indexu není a AND průnik
 *  by vrátil prázdno. */
const FT_STOPWORDS = new Set([
  'jsou', 'bude', 'budou', 'byla', 'bylo', 'byly', 'jako', 'jeho', 'jeji',
  'jejich', 'ktery', 'ktera', 'ktere', 'kterych', 'kterym', 'kterou', 'nebo',
  'podle', 'pouze', 'take', 'tato', 'tento', 'teto', 'tomto', 'tohoto',
  'aby', 'vsak', 'pokud', 'musi', 'muze', 'mohou', 'byt', 'dle', 'odst',
  'pism', 'zakona', 'ceske', 'ceska', 'republiky', 'republice',
  'zdravotnictvi', 'ministerstva', 'ministerstvo', 'ministerstvem',
  'vestnik', 'vestniku', 'castka', 'castky', 'strana', 'rocnik',
]);

/** Tokenizace dotazu pro fulltextový index — MUSÍ být identická s
 *  ingest/lib/vestniky-fulltext.js (paritu hlídá test): bez diakritiky,
 *  lowercase, termy 4–24 znaků, stopwords, prefix-stemming na 8 znaků. */
export function queryTermsFt(q) {
  const out = new Set();
  for (const m of normText(q).matchAll(/[a-z][a-z0-9]{3,23}/g)) {
    const t = m[0];
    if (FT_STOPWORDS.has(t)) continue;
    out.add(t.length > 8 ? t.slice(0, 8) : t);
  }
  return [...out];
}

/** Id částek, jejichž plný text obsahuje VŠECHNY termy dotazu (AND). */
export function fulltextIds(index, q) {
  const terms = queryTermsFt(q);
  if (!terms.length || !index?.termy) return null;
  let ids = null;
  for (const t of terms) {
    const post = index.termy[t];
    if (!post) return new Set();
    ids = ids ? new Set(post.filter(id => ids.has(id))) : new Set(post);
  }
  return ids;
}

/** Filtr částek (čistá funkce — testovatelná).
 *  q hledá v titulu částky i položkách obsahu; kat/rok filtrují částky,
 *  jejichž obsah kategorii obsahuje. Vrací částky s už zúženým obsahem:
 *  při aktivním hledání/kategorii se ukážou jen odpovídající položky.
 *  ftIds (Set) rozšiřuje zásah o částky se shodou v plném textu PDF —
 *  ty nesou příznak ft (v UI chip „shoda v plném textu"). */
export function filterCastky(castky, { q = '', rok = 'all', kat = 'all', ftIds = null } = {}) {
  const nq = normText(q.trim());
  const out = [];
  for (const c of castky) {
    if (rok !== 'all' && String(c.rok) !== rok) continue;
    let obsah = c.obsah;
    let ft = false;
    if (kat !== 'all') obsah = obsah.filter(o => o.kat === kat);
    if (nq) {
      const titulHit = normText(c.titul).includes(nq);
      const oHits = obsah.filter(o => normText(o.t).includes(nq));
      if (!titulHit && !oHits.length) {
        if (!(ftIds?.has(c.id)) || (kat !== 'all' && !obsah.length)) continue;
        ft = true;
      } else {
        obsah = oHits.length ? oHits : obsah;
      }
    } else if (kat !== 'all' && !obsah.length) {
      continue;
    }
    out.push({ ...c, obsah, ...(ft ? { ft: true } : {}) });
  }
  return out;
}

const $ = id => document.getElementById(id);
const KROK = 30;
let DATA = null, GNAZVY = {}, FTIDX = null, ftLoading = null, CASTKA_URL = new Map();
let fQ = '', fRok = 'all', fKat = 'all', fFt = false, limit = KROK;

/** Lazy-load fulltextového indexu (jen po zaškrtnutí — ~1 MB gzip). */
function nactiFtIndex() {
  ftLoading ??= fetch('data/vestniky-fulltext.json')
    .then(r => (r.ok ? r.json() : null))
    .then(j => { FTIDX = j; })
    .catch(() => { FTIDX = null; });
  return ftLoading;
}

function aktualniFtIds() {
  return fFt && FTIDX && fQ.trim() ? fulltextIds(FTIDX, fQ) : null;
}

const REF_AKCE = { rusi: 'ruší', meni: 'mění', odkazuje: 'odkazuje na' };

/** Chip odkazu na jinou částku: „ruší částku 9/2024" s odkazem, když je v archivu. */
function refChip(r) {
  const label = `${REF_AKCE[r.akce] ?? 'odkazuje na'} částku ${r.cislo}/${r.rok}`;
  const cil = r.c != null ? CASTKA_URL.get(r.c) : null;
  return cil
    ? `<a class="vst-ref vst-ref-${r.akce}" href="${escapeHtml(cil)}" target="_blank" rel="noopener">${escapeHtml(label)} ↗</a>`
    : `<span class="vst-ref vst-ref-${r.akce}">${escapeHtml(label)}</span>`;
}

function katChip(kat) {
  return `<span class="vst-kat vst-kat-${kat}">${escapeHtml(KAT_LABELS[kat] ?? kat)}</span>`;
}

function renderRoky() {
  const counts = new Map();
  for (const c of filterCastky(DATA.castky, { q: fQ, kat: fKat, ftIds: aktualniFtIds() })) {
    if (c.rok) counts.set(String(c.rok), (counts.get(String(c.rok)) ?? 0) + 1);
  }
  if (fRok !== 'all' && !counts.has(fRok)) counts.set(fRok, 0);
  const roky = [...counts.keys()].sort();
  $('vstRoky').innerHTML = roky.map(r =>
    `<button type="button" class="ppo-uk-rok${fRok === r ? ' is-active' : ''}" data-rok="${r}">${r} <span>${counts.get(r)}</span></button>`
  ).join('');
}

function renderList() {
  const rows = filterCastky(DATA.castky, { q: fQ, rok: fRok, kat: fKat, ftIds: aktualniFtIds() });
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
      ? `<ol class="vst-obsah">${c.obsah.map(o => {
        const gs = (o.g ?? []).filter(g => GNAZVY[g]).map(g =>
          `<a class="vst-g" href="pracovni-skupina.html?id=${g}" title="${escapeHtml(GNAZVY[g])}">→ ${escapeHtml(zkratNazev(GNAZVY[g]))}</a>`).join(' ');
        const refs = (o.ref ?? []).map(r => refChip(r)).join(' ');
        return `<li>${escapeHtml(o.t)} ${katChip(o.kat)}${refs ? ` ${refs}` : ''}${gs ? ` ${gs}` : ''}</li>`;
      }).join('')}</ol>`
      : '<p class="vst-noobsah">Obsah se nepodařilo strojově přečíst — otevřete PDF.</p>';
    html.push(`<li class="vst-castka">
      <p class="vst-castka-h"><strong>${escapeHtml(c.titul)}</strong>
        ${c.datum ? `<span class="vst-datum">${escapeHtml(fmtDatum(c.datum))}</span>` : ''}
        ${c.ft ? '<span class="vst-ft-chip" title="Dotaz se nenašel v obsahu, ale v plném textu PDF částky">shoda v plném textu PDF</span>' : ''}
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
    const [res, resV] = await Promise.all([
      fetch('data/vestniky.json'),
      fetch('data/vestniky-vazby.json').catch(() => null),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    if (resV?.ok) GNAZVY = (await resV.json())?.skupiny_nazvy ?? {};
    CASTKA_URL = new Map(DATA.castky.map(c => [c.id, c.url]));

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
    $('vstFt').addEventListener('change', async e => {
      fFt = e.target.checked;
      if (fFt && !FTIDX) { await nactiFtIndex(); }
      limit = KROK; rerender();
    });
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
