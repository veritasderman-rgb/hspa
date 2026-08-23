// Model systému (model-systemu.html) — interaktivní kauzální mapa českého
// zdravotnictví. Data: data/system-model.json (uzly + hrany, kurátorovaný
// layout), živé hodnoty: data/indicators.json. Viz PLAN-SYSTEM-MODEL.md.
//
// SVG se generuje z dat (vzor cz-map.js), interakce vzor schema.js:
// klik/Enter na uzel → detail panel + zvýraznění hran; u pák (kind=lever)
// navíc režim „Zatlačit na páku" — deterministický BFS downstream.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';

const LAYER_ORDER = ['Struktury', 'Procesy', 'Výstupy', 'Výsledky'];
const LAYER_CLASS = {
  'Struktury': 'struktury',
  'Procesy': 'procesy',
  'Výstupy': 'vystupy',
  'Výsledky': 'vysledky',
};
const KIND_LABELS = { lever: 'Páka', flow: 'Průtok systémem', outcome: 'Výsledek' };
const SIGNAL_LABELS = { good: 'dobré', warn: 'varování', bad: 'špatné', neutral: 'neutrální' };

const NODE_W = 150;
const NODE_H = 56;

// ---------------------------------------------------------------------------
// Pure helpery (testovatelné bez DOM)
// ---------------------------------------------------------------------------

export function edgesFor(nodeId, edges) {
  return {
    incoming: edges.filter(e => e.to === nodeId),
    outgoing: edges.filter(e => e.from === nodeId),
  };
}

/**
 * BFS downstream: všechny uzly dosažitelné z nodeId po směru hran
 * (bez startovního uzlu) + množina hran na cestách. Deterministický
 * základ režimu „Zatlačit na páku".
 */
export function downstreamOf(nodeId, edges) {
  const nodes = new Set();
  const usedEdges = new Set();
  const queue = [nodeId];
  const visited = new Set([nodeId]);
  while (queue.length) {
    const cur = queue.shift();
    for (const e of edges) {
      if (e.from !== cur) continue;
      usedEdges.add(e.id);
      if (!visited.has(e.to)) {
        visited.add(e.to);
        nodes.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return { nodes: [...nodes], edges: [...usedEdges] };
}

export function layerNodes(layer, nodes) {
  return nodes.filter(n => n.layer === layer);
}

export const PERSPECTIVE_ROLES = ['pacient', 'lekar', 'reditel'];
export const ROLE_LABELS = { pacient: 'Pacient', lekar: 'Lékař', reditel: 'Ředitel nemocnice' };

/** Pohled role na uzel (Tři židle); null pro neznámou roli/uzel bez perspektiv. */
export function perspectiveFor(node, role) {
  return node?.perspectives?.[role] ?? null;
}

/** Uzly, které daná role vidí jen v mlze (visibility: fog). */
export function fogNodesFor(role, nodes) {
  return nodes.filter(n => perspectiveFor(n, role)?.visibility === 'fog').map(n => n.id);
}

/** Hrany označené jako střet zájmů rolí (conflict: true). */
export function conflictEdges(edges) {
  return edges.filter(e => e.conflict === true);
}

// Rozdělí label na max 2 řádky pro SVG <tspan> (šířka uzlu ~150 px ≈ 18 znaků).
export function splitLabel(label, maxChars = 18) {
  const words = String(label).split(' ');
  if (label.length <= maxChars || words.length === 1) return [label];
  let best = [label, ''];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (a.length <= maxChars + 4 && b.length <= maxChars + 4 && diff < bestDiff) {
      best = [a, b];
      bestDiff = diff;
    }
  }
  return best[1] ? best : [label];
}

// ---------------------------------------------------------------------------
// Stav modulu
// ---------------------------------------------------------------------------

let MODEL = { nodes: [], edges: [] };
let INDICATORS = new Map();
let ARTICLES = new Map();
let activeNodeId = null;
let leverModeFor = null;
let activeRole = null;      // Tři židle: null = vše | pacient | lekar | reditel
let conflictsOn = false;    // zvýraznění hran se střetem zájmů rolí

const nodeById = id => MODEL.nodes.find(n => n.id === id);

// ---------------------------------------------------------------------------
// SVG render
// ---------------------------------------------------------------------------

function edgePath(e) {
  const a = nodeById(e.from);
  const b = nodeById(e.to);
  if (!a || !b) return '';
  const dy = b.y - a.y;
  // Uzly ve stejné (pod)řadě → boční oblouk nad řadou, ať hrana neprochází uzly.
  if (Math.abs(dy) <= NODE_H) {
    const dir = b.x > a.x ? 1 : -1;
    const x1 = a.x + dir * NODE_W / 2, y1 = a.y;
    const x2 = b.x - dir * (NODE_W / 2 + 8), y2 = b.y;
    const bow = Math.min(a.y, b.y) - 52;
    return `M ${x1} ${y1} C ${x1 + dir * 44} ${bow}, ${x2 - dir * 44} ${bow}, ${x2} ${y2}`;
  }
  // Svislé vedení z okraje uzlu k okraji uzlu (kauzalita teče dolů, výjimečně vzhůru).
  const down = dy > 0;
  const x1 = a.x, y1 = down ? a.y + NODE_H / 2 : a.y - NODE_H / 2;
  const x2 = b.x, y2 = down ? b.y - NODE_H / 2 - 7 : b.y + NODE_H / 2 + 7;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

function renderSvg(host) {
  const bands = LAYER_ORDER.map((layer, i) => {
    const y = 8 + i * 190;
    return `<g class="msys-band" aria-hidden="true">
      <rect x="4" y="${y}" width="992" height="184" rx="10" class="msys-band-rect msys-band-${LAYER_CLASS[layer]}"></rect>
      <text x="16" y="${y + 20}" class="msys-band-label">${escapeHtml(layer.toUpperCase())}</text>
    </g>`;
  }).join('');

  const edges = MODEL.edges.map(e =>
    `<path class="msys-edge msys-edge-${e.polarity} msys-edge-${e.strength}" data-edge="${escapeHtml(e.id)}"
       d="${edgePath(e)}" marker-end="url(#msys-arrow-${e.polarity})"></path>`
  ).join('');

  const nodes = MODEL.nodes.map(n => {
    const lines = splitLabel(n.label);
    const tspans = lines.map((l, i) =>
      `<tspan x="${n.x}" dy="${i === 0 ? (lines.length > 1 ? '-0.25em' : '0.32em') : '1.15em'}">${escapeHtml(l)}</tspan>`
    ).join('');
    return `<g class="msys-node msys-node-${LAYER_CLASS[n.layer]}${n.kind === 'lever' ? ' msys-node-lever' : ''}"
      data-node="${escapeHtml(n.id)}" tabindex="0" role="button"
      aria-label="${escapeHtml(`${n.label} (${n.layer}${n.kind === 'lever' ? ', páka' : ''})`)}">
      <rect x="${n.x - NODE_W / 2}" y="${n.y - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="9"></rect>
      <text x="${n.x}" y="${n.y}" text-anchor="middle">${tspans}</text>
      ${n.kind === 'lever' ? `<circle class="msys-lever-dot" cx="${n.x - NODE_W / 2 + 11}" cy="${n.y - NODE_H / 2 + 11}" r="3.5"></circle>` : ''}
    </g>`;
  }).join('');

  host.innerHTML = `
    <svg class="msys-svg" viewBox="0 0 1000 768" role="group"
         aria-label="Kauzální mapa zdravotního systému — ${MODEL.nodes.length} oblastí ve 4 vrstvách HSPA. Interaktivní: vyberte uzel.">
      <defs>
        <marker id="msys-arrow-plus" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" class="msys-arrowhead-plus"></path>
        </marker>
        <marker id="msys-arrow-minus" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" class="msys-arrowhead-minus"></path>
        </marker>
      </defs>
      ${bands}
      <g class="msys-edges">${edges}</g>
      <g class="msys-nodes">${nodes}</g>
    </svg>`;
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function indicatorChip(id) {
  const ind = INDICATORS.get(id);
  if (!ind) return '';
  const val = typeof ind.value === 'number'
    ? ind.value.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })
    : escapeHtml(String(ind.value ?? '—'));
  return `<a class="msys-ind" href="indikator-${encodeURIComponent(id)}.html">
    <span class="msys-ind-signal msys-signal-${escapeHtml(ind.signal ?? 'neutral')}"
          title="Signál: ${escapeHtml(SIGNAL_LABELS[ind.signal] ?? 'neutrální')}" aria-hidden="true"></span>
    <span class="msys-ind-name">${escapeHtml(ind.name)}</span>
    <span class="msys-ind-value">${val}&nbsp;${escapeHtml(ind.unit ?? '')} <small>(${escapeHtml(String(ind.year ?? '?'))})</small></span>
  </a>`;
}

function articleLink(slug) {
  const a = ARTICLES.get(slug);
  if (!a) return '';
  return `<li><a href="${escapeHtml(slug)}">${escapeHtml(a.title)}</a></li>`;
}

function edgeLine(e, dir) {
  const other = nodeById(dir === 'out' ? e.to : e.from);
  if (!other) return '';
  const sign = e.polarity === 'plus' ? '＋' : '−';
  const arrow = dir === 'out' ? '→' : '←';
  return `<li class="msys-panel-edge msys-panel-edge-${e.polarity}">
    <button type="button" class="msys-jump" data-jump="${escapeHtml(other.id)}">${arrow} ${escapeHtml(other.label)}</button>
    <span class="msys-edge-sign" aria-label="${e.polarity === 'plus' ? 'podporuje' : 'zatěžuje'}">${sign}</span>
    <span class="msys-edge-mech">${escapeHtml(e.mechanism)}</span>
    ${e.conflict ? `<span class="msys-edge-conflict-note">⚡ Střet zájmů: ${escapeHtml(e.conflict_note)}</span>` : ''}
  </li>`;
}

// ---------------------------------------------------------------------------
// Tři židle — přepínač rolí + konflikty
// ---------------------------------------------------------------------------

function renderRoleBar() {
  const host = document.getElementById('msysRoles');
  if (!host) return;
  const chip = (role, label) => `
    <button type="button" class="msys-role${activeRole === role ? ' msys-role-active' : ''}"
      data-role="${role ?? ''}" role="radio" aria-checked="${activeRole === role}">${label}</button>`;
  host.innerHTML = `
    <div class="msys-role-group" role="radiogroup" aria-label="Perspektiva role (Tři židle)">
      <span class="msys-role-lbl">Tři židle:</span>
      ${chip(null, 'Vše')}
      ${PERSPECTIVE_ROLES.map(r => chip(r, ROLE_LABELS[r])).join('')}
    </div>
    <button type="button" class="msys-conflicts${conflictsOn ? ' msys-conflicts-active' : ''}"
      aria-pressed="${conflictsOn}" id="msysConflictsBtn">⚡ Ukázat konflikty rolí</button>
    <p class="msys-role-note" aria-live="polite">${activeRole
      ? `Ztlumené oblasti ${ROLE_LABELS[activeRole].toLowerCase()} ze své židle nevidí — rozhodují o něm jiní. Klik na uzel ukáže, jak ho tato role zažívá.`
      : conflictsOn
        ? 'Zvýrazněné vazby jsou střety zájmů: zisk jedné židle je náklad jiné. Klik na uzel ukáže detail.'
        : 'Jeden systém, tři pohledy: vyberte roli a uvidíte, co z mapy skutečně vidí — a co je pro ni v mlze.'}</p>`;

  host.querySelectorAll('.msys-role').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role || null;
      activeRole = activeRole === role ? null : role;
      renderRoleBar();
      applyHighlights();
      if (activeNodeId) renderPanel(activeNodeId);
    });
  });
  document.getElementById('msysConflictsBtn')?.addEventListener('click', () => {
    conflictsOn = !conflictsOn;
    renderRoleBar();
    applyHighlights();
  });
}

function renderPanel(nodeId) {
  const panel = document.getElementById('msysPanel');
  const node = nodeById(nodeId);
  if (!panel || !node) return;

  const { incoming, outgoing } = edgesFor(nodeId, MODEL.edges);
  const inds = (node.indicators ?? []).map(indicatorChip).filter(Boolean).join('');
  const arts = (node.articles ?? []).map(articleLink).filter(Boolean).join('');

  const leverBtn = node.kind === 'lever'
    ? `<button type="button" class="msys-lever-btn${leverModeFor === nodeId ? ' msys-lever-btn-on' : ''}" id="msysLeverBtn" data-lever="${escapeHtml(nodeId)}">
         ${leverModeFor === nodeId ? '✕ Zrušit zvýraznění' : '⟶ Zatlačit na páku'}
       </button>`
    : '';

  let leverSummary = '';
  if (leverModeFor === nodeId) {
    const ds = downstreamOf(nodeId, MODEL.edges);
    const byLayer = LAYER_ORDER
      .map(l => ({ l, names: ds.nodes.map(nodeById).filter(n => n && n.layer === l).map(n => n.label) }))
      .filter(x => x.names.length);
    leverSummary = `<div class="msys-lever-summary">
      <p><strong>Tato páka ovlivňuje ${ds.nodes.length} oblastí</strong> po směru kauzálních vazeb:</p>
      ${byLayer.map(x => `<p class="msys-lever-layer"><strong>${escapeHtml(x.l)}:</strong> ${escapeHtml(x.names.join(', '))}</p>`).join('')}
    </div>`;
  }

  panel.innerHTML = `
    <div class="msys-panel-inner">
      <div class="msys-panel-head">
        <span class="msys-panel-layer msys-badge-${LAYER_CLASS[node.layer]}">${escapeHtml(node.layer)}</span>
        <span class="msys-panel-kind">${escapeHtml(KIND_LABELS[node.kind] ?? node.kind)}</span>
      </div>
      <h3 class="msys-panel-name">${escapeHtml(node.label)}</h3>
      <p class="msys-panel-desc">${escapeHtml(node.desc)}</p>
      ${activeRole && perspectiveFor(node, activeRole) ? (() => {
        const p = perspectiveFor(node, activeRole);
        return `<div class="msys-persp msys-persp-${p.visibility}">
          <span class="msys-persp-role">Očima role ${escapeHtml(ROLE_LABELS[activeRole])}${p.visibility === 'fog' ? ' · v mlze' : ''}</span>
          <strong class="msys-persp-alt">„${escapeHtml(p.alt_label)}“</strong>
          <p class="msys-persp-note">${escapeHtml(p.note)}</p>
        </div>`;
      })() : ''}
      ${leverBtn}
      ${leverSummary}
      ${node.rozhoduje?.length ? `<h4>Kdo o tom rozhoduje</h4><ul class="msys-rozhoduje">${node.rozhoduje.map(r => `<li><strong>${r.url ? `<a href="${escapeHtml(r.url)}">${escapeHtml(r.kdo)}</a>` : escapeHtml(r.kdo)}</strong>${r.pozn ? ` — ${escapeHtml(r.pozn)}` : ''}</li>`).join('')}</ul>` : ''}
      ${inds ? `<h4>Co to měří na dashboardu</h4><div class="msys-ind-list">${inds}</div>` : ''}
      ${outgoing.length ? `<h4>Ovlivňuje</h4><ul class="msys-panel-edges">${outgoing.map(e => edgeLine(e, 'out')).join('')}</ul>` : ''}
      ${incoming.length ? `<h4>Je ovlivněno</h4><ul class="msys-panel-edges">${incoming.map(e => edgeLine(e, 'in')).join('')}</ul>` : ''}
      ${arts ? `<h4>Přečtěte si k tomu</h4><ul class="msys-panel-articles">${arts}</ul>` : ''}
    </div>`;

  const btn = document.getElementById('msysLeverBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      leverModeFor = leverModeFor === nodeId ? null : nodeId;
      applyHighlights();
      renderPanel(nodeId);
    });
  }
  panel.querySelectorAll('.msys-jump').forEach(b => {
    b.addEventListener('click', () => selectNode(b.dataset.jump));
  });
}

function renderPanelEmpty() {
  const panel = document.getElementById('msysPanel');
  if (!panel) return;
  panel.innerHTML = `<div class="msys-panel-inner msys-panel-empty">
    <p><strong>Vyberte oblast v mapě.</strong> Uzly s tečkou jsou <em>páky</em> —
    místa, za která jde v systému „zatlačit“. Po výběru páky uvidíte, co všechno
    po směru kauzálních vazeb ovlivňuje.</p>
    <p>Zelená šipka = vazba oblast podporuje, oranžová = zatěžuje.
    Každý uzel je podložený indikátory dashboardu a články.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Interakce + zvýraznění
// ---------------------------------------------------------------------------

function applyHighlights() {
  const svg = document.querySelector('.msys-svg');
  if (!svg) return;
  const hot = new Set();
  const affected = new Set();
  const neighbors = new Set();

  if (leverModeFor) {
    const ds = downstreamOf(leverModeFor, MODEL.edges);
    ds.nodes.forEach(id => affected.add(id));
    ds.edges.forEach(id => hot.add(id));
  } else if (activeNodeId) {
    const { incoming, outgoing } = edgesFor(activeNodeId, MODEL.edges);
    for (const e of [...incoming, ...outgoing]) {
      hot.add(e.id);
      neighbors.add(e.from === activeNodeId ? e.to : e.from);
    }
  }

  const dimming = Boolean(leverModeFor || activeNodeId);
  svg.classList.toggle('msys-dimmed', dimming);
  const conflicts = conflictsOn ? new Set(conflictEdges(MODEL.edges).map(e => e.id)) : new Set();
  svg.classList.toggle('msys-conflicts-on', conflictsOn);
  svg.querySelectorAll('.msys-edge').forEach(el => {
    el.classList.toggle('msys-edge-hot', hot.has(el.dataset.edge));
    el.classList.toggle('msys-edge-conflict', conflicts.has(el.dataset.edge));
  });
  const fog = activeRole ? new Set(fogNodesFor(activeRole, MODEL.nodes)) : new Set();
  svg.classList.toggle('msys-role-on', Boolean(activeRole));
  svg.querySelectorAll('.msys-node').forEach(el => {
    const id = el.dataset.node;
    el.classList.toggle('msys-node-active', id === activeNodeId);
    el.classList.toggle('msys-node-affected', affected.has(id));
    el.classList.toggle('msys-node-neighbor', neighbors.has(id));
    el.classList.toggle('msys-node-fog', fog.has(id));
  });
}

function selectNode(nodeId) {
  activeNodeId = nodeId;
  if (leverModeFor && leverModeFor !== nodeId) leverModeFor = null;
  applyHighlights();
  renderPanel(nodeId);
  const el = document.querySelector(`.msys-node[data-node="${CSS.escape(nodeId)}"]`);
  if (el) el.focus({ preventScroll: true });
}

function resetSelection() {
  activeNodeId = null;
  leverModeFor = null;
  applyHighlights();
  renderPanelEmpty();
}

function wireInteractions() {
  const svg = document.querySelector('.msys-svg');
  if (!svg) return;
  svg.querySelectorAll('.msys-node').forEach(el => {
    el.addEventListener('click', ev => { ev.stopPropagation(); selectNode(el.dataset.node); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });
  svg.addEventListener('click', ev => {
    if (ev.target === svg || ev.target.closest('.msys-band')) resetSelection();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (activeNodeId || leverModeFor)) resetSelection();
  });
}

// ---------------------------------------------------------------------------
// Mobilní / a11y fallback seznam
// ---------------------------------------------------------------------------

function renderFallbackList() {
  const list = document.getElementById('msysFallbackList');
  if (!list) return;
  list.innerHTML = LAYER_ORDER.map(layer => {
    const items = layerNodes(layer, MODEL.nodes).map(n => {
      const inds = (n.indicators ?? []).slice(0, 3).map(indicatorChip).filter(Boolean).join('');
      const { outgoing } = edgesFor(n.id, MODEL.edges);
      const affects = outgoing.map(e => nodeById(e.to)).filter(Boolean).map(x => x.label).join(', ');
      const persp = PERSPECTIVE_ROLES
        .map(r => ({ r, p: perspectiveFor(n, r) }))
        .filter(x => x.p)
        .map(x => `<li><strong>${escapeHtml(ROLE_LABELS[x.r])}${x.p.visibility === 'fog' ? ' (v mlze)' : ''}:</strong> „${escapeHtml(x.p.alt_label)}“ — ${escapeHtml(x.p.note)}</li>`)
        .join('');
      return `<li>
        <strong>${escapeHtml(n.label)}</strong>${n.kind === 'lever' ? ' <em>(páka)</em>' : ''}<br>
        ${escapeHtml(n.desc)}
        ${affects ? `<br><small>Ovlivňuje: ${escapeHtml(affects)}</small>` : ''}
        ${persp ? `<ul class="msys-fallback-persp">${persp}</ul>` : ''}
        ${inds ? `<div class="msys-ind-list">${inds}</div>` : ''}
      </li>`;
    }).join('');
    return `<li class="msys-fallback-layer"><h3>${escapeHtml(layer)}</h3><ul>${items}</ul></li>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  renderModuleNav('explainers');
  renderMastheadDate();
  renderRelatedTools('model-systemu');

  const host = document.getElementById('msysGraph');
  if (!host) return;
  try {
    const [model, inds, arts] = await Promise.all([
      fetch('data/system-model.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
    ]);
    MODEL = { nodes: model.nodes ?? [], edges: model.edges ?? [] };
    INDICATORS = new Map((inds.indicators ?? []).map(i => [i.id, i]));
    ARTICLES = new Map((arts.articles ?? []).map(a => [a.slug, a]));

    renderSvg(host);
    renderRoleBar();
    wireInteractions();
    renderPanelEmpty();
    renderFallbackList();

    // deep-link ?role= (hub kampaně Tři židle odkazuje na konkrétní židli)
    const urlRole = new URLSearchParams(location.search).get('role');
    if (PERSPECTIVE_ROLES.includes(urlRole)) {
      activeRole = urlRole;
      renderRoleBar();
      applyHighlights();
    }

    const statsEl = document.getElementById('msysStats');
    if (statsEl) {
      const levers = MODEL.nodes.filter(n => n.kind === 'lever').length;
      statsEl.textContent = `${MODEL.nodes.length} oblastí · ${MODEL.edges.length} kauzálních vazeb · ${levers} pák`;
    }
  } catch (err) {
    host.innerHTML = renderErrorState('Model systému se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
