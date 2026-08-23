// Frontend logika stránky pracovni-skupiny.html (hub sekce „Pracovní skupiny MZ").
// Čte data/ppo.json (skupiny + síť s předpočítaným layoutem + spojky + kalendář)
// a renderuje: SVG síť s bočním panelem, žebříčky spojek, heatmapu jednání
// a filtrovatelný katalog skupin. Datové soubory staví ingest/ppo/build-web.js.
//
// Vizuální jazyk: monochromní inkoust; identitu shluků nese pozice + popisek
// sekce, velikost uzlu počet vazeb, červená JEN pro výběr (viz
// docs/visual-components.md). Stav skupiny má vždy textový štítek, ne jen barvu.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';

export const STAV_LABELS = {
  aktivni: 'aktivní',
  spici: 'spící',
  utlum: 'v útlumu',
  bez_dokumentu: 'bez dokumentů',
};

export const KAT_LABELS = {
  mz_urednik: 'úředník MZ',
  statni_instituce: 'státní instituce',
  pojistovna: 'zdravotní pojišťovna',
  odborna_spolecnost: 'odborná společnost',
  komora: 'profesní komora',
  nemocnice: 'nemocnice',
  akademie: 'akademická sféra',
  pacientska_org: 'pacientská organizace',
  asociace_poskytovatelu: 'asociace poskytovatelů',
  kraj_obec: 'kraj / obec',
  jine_ministerstvo: 'jiné ministerstvo',
  odbory: 'odbory',
  neuvedeno: 'afiliace neuvedena',
  nezarazeno: 'nezařazeno',
};

/** Hrany s váhou ≥ minW. Čistá funkce (testovatelná). */
export function filterHrany(hrany, minW) {
  return hrany.filter(h => h.vaha >= minW);
}

/** Poloměr uzlu ze stupně — sdílená konvence layoutu (build) i renderu. */
export function nodeRadius(stupen) {
  return 4 + Math.sqrt(stupen || 1) * 1.7;
}

/** Řádky heatmapy: roky sestupně, 12 měsíců, n z mapy "YYYY-MM" → počet. */
export function heatRows(mesice) {
  const years = [...new Set(Object.keys(mesice).map(k => k.slice(0, 4)))].sort().reverse();
  return years.map(y => ({
    rok: y,
    mesice: Array.from({ length: 12 }, (_, i) => {
      const key = `${y}-${String(i + 1).padStart(2, '0')}`;
      return { key, n: mesice[key] ?? 0 };
    }),
  }));
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

/* ── stav modulu ─────────────────────────────────────────────────────── */
let PPO = null;
let uzlyById = new Map();
let skupinyById = new Map();
let sousedni = new Map();   // gid → [{gid, vaha}] podle aktuálního filtru
let minVaha = 3;
let selected = null;

const $ = id => document.getElementById(id);

/* ── síť ─────────────────────────────────────────────────────────────── */
function buildSousedni(hrany) {
  const m = new Map();
  for (const h of hrany) {
    if (!m.has(h.a)) m.set(h.a, []);
    if (!m.has(h.b)) m.set(h.b, []);
    m.get(h.a).push({ gid: h.b, vaha: h.vaha });
    m.get(h.b).push({ gid: h.a, vaha: h.vaha });
  }
  for (const list of m.values()) list.sort((x, y) => y.vaha - x.vaha || x.gid - y.gid);
  return m;
}

function renderNet() {
  const { view, uzly, shluky } = PPO.sit;
  const hrany = filterHrany(PPO.sit.hrany, minVaha);
  sousedni = buildSousedni(hrany);
  const neighborSet = selected != null
    ? new Set([selected, ...(sousedni.get(selected) ?? []).map(s => s.gid)])
    : null;

  const edgeEls = hrany.map(h => {
    const a = uzlyById.get(h.a), b = uzlyById.get(h.b);
    if (!a || !b) return '';
    const hl = selected != null && (h.a === selected || h.b === selected);
    const dim = selected != null && !hl;
    const w = hl ? Math.min(1 + h.vaha * 0.5, 4.5) : Math.min(0.6 + h.vaha * 0.35, 3.5);
    const op = hl ? 0.85 : dim ? 0.04 : Math.min(0.1 + h.vaha * 0.07, 0.5);
    return `<line class="ppo-edge${hl ? ' ppo-edge-hl' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${w}" opacity="${op}"/>`;
  }).join('');

  const nodeEls = uzly.map(u => {
    const s = skupinyById.get(u.id);
    const cls = ['ppo-node'];
    if (s?.stav === 'aktivni') cls.push('ppo-node-aktivni');
    if (selected === u.id) cls.push('ppo-node-sel');
    else if (neighborSet && !neighborSet.has(u.id)) cls.push('ppo-node-dim');
    const title = `${s?.nazev ?? u.id} · ${u.stupen} vazeb`;
    return `<circle class="${cls.join(' ')}" data-gid="${u.id}" cx="${u.x}" cy="${u.y}" r="${nodeRadius(u.stupen).toFixed(1)}" tabindex="0" role="button" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title></circle>`;
  }).join('');

  // popisek pod spodním okrajem shluku (nad uzly, s papírovým halo),
  // aby ho nepohřbily kruhy sedící na centroidu
  const lblEls = shluky.filter(c => c.pocet >= 2 && c.kod !== '-').map(c => {
    const mine = uzly.filter(u => u.shluk === c.kod);
    const yBottom = Math.max(...mine.map(u => u.y + nodeRadius(u.stupen))) + 16;
    return `<text class="ppo-cluster-lbl" x="${c.x}" y="${Math.min(yBottom, view.h - 6)}">${escapeHtml(c.kod)}</text>`;
  }).join('');

  $('ppoNetMount').innerHTML =
    `<svg class="ppo-net-svg" viewBox="0 0 ${view.w} ${view.h}" role="img" aria-label="Síť ${uzly.length} pracovních skupin propojených sdílenými členy">
      <g>${edgeEls}</g><g>${nodeEls}</g><g>${lblEls}</g>
    </svg>`;
}

function renderPanel() {
  const el = $('ppoPanel');
  if (selected == null) {
    el.innerHTML = `
      <div class="ppo-panel-kicker">Detail skupiny</div>
      <h3>Vyberte skupinu v mapě</h3>
      <p class="ppo-panel-meta">Kliknutím na kruh zobrazíte, s kým skupina sdílí členy.
      Kompletní profil — účel, složení, jednání — je na stránce každé skupiny.</p>`;
    return;
  }
  const s = skupinyById.get(selected);
  const sous = (sousedni.get(selected) ?? []).slice(0, 8);
  const rows = sous.map(x => {
    const t = skupinyById.get(x.gid);
    return `<li><a href="pracovni-skupina.html?id=${x.gid}">${escapeHtml(t?.nazev ?? String(x.gid))}</a>
      <span class="ppo-vaha">${x.vaha}&nbsp;${x.vaha === 1 ? 'osoba' : x.vaha < 5 ? 'osoby' : 'osob'}</span></li>`;
  }).join('');
  el.innerHTML = `
    <div class="ppo-panel-kicker">${escapeHtml(s.sekce ?? 'Skupina')}</div>
    <h3>${escapeHtml(s.nazev)}</h3>
    <p class="ppo-panel-meta">${escapeHtml(STAV_LABELS[s.stav] ?? s.stav)} · ${s.posledni_aktivita ? `poslední doložená aktivita ${fmtDate(s.posledni_aktivita)}` : 'bez zápisu s datem'}</p>
    <div class="ppo-panel-stats">
      <div class="ppo-panel-stat"><b>${s.pocet_clenu}</b><span>členů</span></div>
      <div class="ppo-panel-stat"><b>${s.jednani_celkem}</b><span>jednání</span></div>
      <div class="ppo-panel-stat"><b>${(sousedni.get(selected) ?? []).length}</b><span>vazeb (filtr)</span></div>
    </div>
    ${rows ? `<div class="ppo-panel-kicker">Sdílí členy s</div><ul class="ppo-panel-links">${rows}</ul>` : '<p class="ppo-panel-meta">Při aktuálním filtru bez vazeb — zkuste „všechny vazby".</p>'}
    <a class="ppo-panel-cta" href="pracovni-skupina.html?id=${s.id}">Celý profil skupiny →</a>`;
}

function selectGroup(gid) {
  selected = selected === gid ? null : gid;
  renderNet();
  renderPanel();
}

function wireNet() {
  $('ppoNetMount').addEventListener('click', e => {
    const c = e.target.closest('.ppo-node');
    if (c) selectGroup(Number(c.dataset.gid));
  });
  $('ppoNetMount').addEventListener('keydown', e => {
    const c = e.target.closest('.ppo-node');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectGroup(Number(c.dataset.gid)); }
  });
  document.querySelectorAll('.ppo-net-controls [data-minw]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ppo-net-controls [data-minw]').forEach(b => b.classList.toggle('active', b === btn));
      minVaha = Number(btn.dataset.minw);
      renderNet();
      renderPanel();
    });
  });
}

/* ── izolované skupiny ───────────────────────────────────────────────── */
function renderIso() {
  const inNet = new Set(PPO.sit.uzly.map(u => u.id));
  const iso = PPO.skupiny.filter(s => !inNet.has(s.id));
  if (!iso.length) return;
  $('ppoIsoNote').textContent =
    `${iso.length} skupin v síti není — s žádnou jinou nesdílejí ani jednoho člena (často nově zřízené nebo úzce specializované orgány):`;
  $('ppoIsoChips').innerHTML = iso.map(s =>
    `<a href="pracovni-skupina.html?id=${s.id}">${escapeHtml(s.nazev)}</a>`).join('');
}

/* ── spojky ──────────────────────────────────────────────────────────── */
function spojkyCol(title, sub, rows) {
  const max = Math.max(...rows.map(r => r.skupin), 1);
  const items = rows.map(r => `
    <div class="ppo-spojka">
      <a class="ppo-spojka-name" href="pracovni-osoba.html?id=${r.id}">${escapeHtml(r.jmeno)}</a>
      <span class="ppo-spojka-num">${r.skupin}×${r.predsednictvi ? ` · ${r.predsednictvi}× (místo)předseda` : ''}</span>
      <span class="ppo-spojka-aff">${escapeHtml(r.afiliace ?? KAT_LABELS[r.kat] ?? r.kat)}</span>
      <span class="ppo-spojka-bar" aria-hidden="true"><i style="width:${(r.skupin / max * 100).toFixed(0)}%"></i></span>
    </div>`).join('');
  return `<div class="ppo-spojky-col"><h3>${title}</h3><p class="ppo-spojky-sub">${sub}</p>${items}</div>`;
}

function renderSpojky() {
  const sp = PPO.spojky;
  $('ppoSpojky').innerHTML =
    spojkyCol('Napříč vším', 'včetně úřednictva MZ a státních institucí — kdo síť fakticky obsluhuje',
      sp.celkovy ?? []) +
    spojkyCol('Hlas zvenčí', 'bez úředníků MZ a státních institucí — pojišťovny, poskytovatelé, odborné společnosti',
      sp.bez_uredniku_a_statnich ?? []);
}

/* ── teasery „Prozkoumat dál" ────────────────────────────────────────── */

/** Ukázka úkolů pro teaser: HTML řádků z souhrn.ukoly_ukazka. Čistá funkce.
 *  Karta je celá <a>, takže řádky jsou neinteraktivní text (bez vnořených odkazů). */
export function ukazkaHtml(ukazka, nazvy, esc, fmt) {
  if (!ukazka?.length) return '';
  const rows = ukazka.map(u => `<span class="ppo-more-row">${esc(u.co)}
    <small>${esc(nazvy.get(u.g) ?? `skupina ${u.g}`)}${u.datum ? ` · ${esc(fmt(u.datum))}` : ''}</small></span>`);
  return `<span class="ppo-more-sample-h">Z posledních jednání</span>${rows.join('')}`;
}

function renderMore() {
  const so = PPO.souhrn;
  const num = n => (typeof n === 'number' ? n.toLocaleString('cs-CZ') : '—');
  $('ppoMoreOsob').textContent = num(so.osob);
  $('ppoMoreVice').textContent = num(so.vice_organu);
  $('ppoMoreDvoj').textContent = num(so.dvojroli);
  $('ppoMoreUkolu').textContent = num(so.ukoly?.ukoly);
  $('ppoMoreSplneno').textContent = num(so.ukoly?.splneno);
  $('ppoMoreOtevrene').textContent = num(so.ukoly?.otevrene);
  const nazvy = new Map(PPO.skupiny.map(s => [s.id, s.nazev]));
  $('ppoMoreUkazka').innerHTML = ukazkaHtml(so.ukoly_ukazka, nazvy, escapeHtml, fmtDate);
}

/* ── heatmapa ────────────────────────────────────────────────────────── */
function renderHeat() {
  const rows = heatRows(PPO.kalendar.mesice);
  const max = Math.max(...rows.flatMap(r => r.mesice.map(m => m.n)), 1);
  const mesNames = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const head = `<tr><th></th>${mesNames.map(m => `<th scope="col">${m}</th>`).join('')}</tr>`;
  const body = rows.map(r => `<tr><th scope="row">${r.rok}</th>${r.mesice.map(m => {
    const a = m.n ? (0.14 + 0.78 * (m.n / max)).toFixed(2) : 0;
    return `<td><span class="ppo-cell" style="--a:${a}" ${m.n ? `data-n="${m.n}"` : ''} title="${m.key} · ${m.n} jednání"></span></td>`;
  }).join('')}</tr>`).join('');
  $('ppoHeat').innerHTML = `<table aria-label="Počet jednání po měsících">${head}${body}</table>
    <figcaption class="ppo-d-note">Nejsilnější měsíc: ${max} jednání. Jen jednání doložená zveřejněným zápisem.</figcaption>`;
}

/* ── katalog ─────────────────────────────────────────────────────────── */
let fStav = 'all', fSekce = 'all', fQ = '';

function renderTable() {
  const rows = PPO.skupiny
    .filter(s => fStav === 'all' || s.stav === fStav)
    .filter(s => fSekce === 'all' || (s.gesce ?? '').split('/')[0] === fSekce)
    .filter(s => !fQ || s.nazev.toLowerCase().includes(fQ) || (s.ucel ?? '').toLowerCase().includes(fQ))
    .sort((a, b) => (b.posledni_aktivita ?? '').localeCompare(a.posledni_aktivita ?? '') || a.nazev.localeCompare(b.nazev, 'cs'));
  $('ppoCount').textContent = String(rows.length);
  $('ppoEmpty').classList.toggle('hidden', rows.length > 0);
  $('ppoTableWrap').innerHTML = rows.length ? `
    <table class="ppo-table">
      <thead><tr><th>Skupina</th><th>Gesce</th><th class="num">Členů</th><th class="num">Jednání</th><th>Poslední aktivita</th><th>Stav</th></tr></thead>
      <tbody>${rows.map(s => `
        <tr>
          <td><a href="pracovni-skupina.html?id=${s.id}">${escapeHtml(s.nazev)}</a></td>
          <td class="ppo-gesce">${escapeHtml(s.gesce ?? '—')}</td>
          <td class="num">${s.pocet_clenu}</td>
          <td class="num">${s.jednani_celkem || '—'}</td>
          <td>${fmtDate(s.posledni_aktivita)}</td>
          <td><span class="ppo-stav ppo-stav-${s.stav}">${escapeHtml(STAV_LABELS[s.stav] ?? s.stav)}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';
}

function wireTable() {
  document.querySelectorAll('.filters-row [data-stav]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filters-row [data-stav]').forEach(b => b.classList.toggle('active', b === btn));
      fStav = btn.dataset.stav;
      renderTable();
    });
  });
  const sekce = [...new Set(PPO.skupiny.map(s => (s.gesce ?? '').split('/')[0]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'cs'));
  $('ppoSekceFilter').innerHTML = `<option value="all">Všechny sekce</option>`
    + sekce.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  $('ppoSekceFilter').addEventListener('change', e => { fSekce = e.target.value; renderTable(); });
  $('ppoSearch').addEventListener('input', e => { fQ = e.target.value.trim().toLowerCase(); renderTable(); });
}

/* ── init ────────────────────────────────────────────────────────────── */
function renderZjisteni() {
  const zj = PPO.zjisteni ?? [];
  if (!zj.length) return;
  $('ppoZjisteni').innerHTML = zj.map(z => {
    const skup = z.skupiny.map(g =>
      `<a href="pracovni-skupina.html?id=${g}">${escapeHtml(skupinyById.get(g)?.nazev ?? String(g))}</a>`);
    const dok = z.doklady.map((d, i) =>
      `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener" title="${escapeHtml(d.titul ?? '')}">dokument ${i + 1} ↗</a>`);
    return `<li>${escapeHtml(z.teze)}
      <span class="ppo-zj-meta">${skup.join(' · ')}${dok.length ? ` — doklady: ${dok.join(', ')}` : ''}</span>
    </li>`;
  }).join('');
  $('ppoZjisteniSec').hidden = false;
}

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  try {
    const res = await fetch('data/ppo.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    PPO = await res.json();
    uzlyById = new Map(PPO.sit.uzly.map(u => [u.id, u]));
    skupinyById = new Map(PPO.skupiny.map(s => [s.id, s]));

    $('statSkupin').textContent = String(PPO.souhrn.skupin);
    $('statAktivnich').textContent = String(PPO.souhrn.aktivnich);
    $('statOsob').textContent = String(PPO.souhrn.osob);
    $('statJednani').textContent = String(PPO.souhrn.jednani);
    $('statVazeb').textContent = String(PPO.souhrn.vazeb);
    $('ppoStavK').textContent = fmtDate(PPO.stav_k);

    renderNet();
    renderPanel();
    wireNet();
    renderIso();
    renderSpojky();
    renderMore();
    renderHeat();
    renderZjisteni();
    wireTable();
    renderTable();
  } catch (err) {
    console.error('ppo load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst data pracovních skupin.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('ppoNetMount')) init();
