// Úhradová vyhláška: zahrajte si na ministra (vyhlaska.html).
// Hráč rozděluje modelovou obálku růstu úhrad mezi 8 segmentů; zástupci
// segmentů argumentují (doložená čísla) a podle gapu vs. modelový požadavek
// eskalují: dohoda → podpis s výhradami → bez dohody → protest/stávková
// pohotovost. Data: data/vyhlaska-hra.json; výpočet: src/vyhlaska-engine.js.
// Modelová hra, ne predikce. Viz PLAN-VYHLASKA-HRA.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import { totalCost, moodFor, effectsFor, verdict, MOOD_LABELS } from './vyhlaska-engine.js';
import { saveAct } from './hra-stav.js';
import { renderCampaignStepper } from './hra-stepper.js';

let DOC = null;
let SEGMENTS = [];
let INDICATORS = new Map();
let SCALE = 1; // objem dnešního roku / součet baseline (viz DOC.scale_note)

const STRENGTH_LABEL = { weak: 'slabě', medium: 'středně', strong: 'silně' };
const MOOD_CLASS = { boost: 'boost', agree: 'agree', grudging: 'grudging', no_deal: 'nodeal', protest: 'protest' };

function czNum(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

function currentAlloc() {
  const alloc = {};
  for (const s of SEGMENTS) {
    const el = document.getElementById(`vh-${s.id}`);
    alloc[s.id] = el ? Number(el.value) || 0 : 0;
  }
  return alloc;
}

// ---------------------------------------------------------------------------
// Render — segmentové karty
// ---------------------------------------------------------------------------

function renderSegments() {
  const host = document.getElementById('vhSegmentsList');
  if (!host) return;
  // seskup podle s.group (pořadí dle prvního výskytu v datech)
  const groups = [];
  for (const s of SEGMENTS) {
    let g = groups.find(x => x.name === (s.group || 'Segmenty'));
    if (!g) { g = { name: s.group || 'Segmenty', items: [] }; groups.push(g); }
    g.items.push(s);
  }
  host.innerHTML = groups.map(g => `
    <div class="vh-group">
      <h3 class="vh-group-h">${escapeHtml(g.name)}
        <span class="vh-group-sum">${czNum(g.items.reduce((a, s) => a + s.baseline_share_pct, 0))} % úhrad</span>
      </h3>
      ${g.items.map(renderSegment).join('')}
    </div>`).join('');
}

function renderSegment(s) {
  const id = escapeHtml(s.id);
  const r = s.representative || {};
  const initials = escapeHtml((r.role || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase());
  return `
    <div class="vh-segment" data-segment-id="${id}">
      <div class="vh-seg-head">
        <div class="vh-seg-title-wrap">
          <span class="vh-seg-label">${escapeHtml(s.label)}</span>
          <span class="vh-seg-sublabel">${escapeHtml(s.sublabel || '')}</span>
        </div>
        <span class="vh-seg-baseline">${czNum(s.baseline_share_pct)} % úhrad · ${czNum(s.baseline_mld)} mld (${DOC.baseline_year})</span>
      </div>
      <div class="vh-rep">
        <span class="vh-rep-avatar" aria-hidden="true">${initials}</span>
        <div class="vh-rep-body">
          <span class="vh-rep-role">${escapeHtml(r.role || '')}</span>
          <p class="vh-rep-arg">„${escapeHtml(r.argument || '')}“</p>
          <p class="vh-rep-demand">Požaduje <strong>+${czNum(s.demand_pct)} %</strong>
            <span class="vh-rep-demand-why">(${escapeHtml(s.demand_reasoning || '')})</span></p>
        </div>
      </div>
      <div class="vh-seg-control">
        <label class="sr-only" for="vh-${id}">Růst úhrad segmentu ${escapeHtml(s.label)} v procentech</label>
        <input type="range" id="vh-${id}" class="vh-slider" min="0" max="15" step="0.5" value="0"
               aria-describedby="vh-mood-${id}" aria-valuetext="+0 %">
        <output class="vh-seg-value" id="vh-out-${id}" for="vh-${id}">+0 %</output>
      </div>
      <p class="vh-mood vh-mood-protest" id="vh-mood-${id}"></p>
    </div>`;
}

function updateSegmentUi(s, alloc) {
  const pct = alloc[s.id] || 0;
  const out = document.getElementById(`vh-out-${s.id}`);
  const slider = document.getElementById(`vh-${s.id}`);
  const txt = `+${czNum(pct)} %`;
  if (out) out.textContent = txt;
  if (slider) slider.setAttribute('aria-valuetext', txt);

  const mood = moodFor(s, pct);
  const moodEl = document.getElementById(`vh-mood-${s.id}`);
  if (moodEl) {
    moodEl.className = `vh-mood vh-mood-${MOOD_CLASS[mood]}`;
    const reaction = s.escalation?.[mood] || '';
    const precedent = mood === 'protest' && s.protest_precedent_source
      ? ` <span class="vh-mood-src">(precedent: ${escapeHtml(s.protest_precedent_source)})</span>` : '';
    const icon = mood === 'boost' ? '✚ ' : '';
    moodEl.innerHTML = `<strong>${icon}${escapeHtml(MOOD_LABELS[mood])}.</strong> „${escapeHtml(reaction)}“${precedent}`;
  }
}

// ---------------------------------------------------------------------------
// Render — obálka + presety
// ---------------------------------------------------------------------------

function renderEnvelope(alloc) {
  const cost = totalCost(SEGMENTS, alloc, SCALE);
  const cap = DOC.envelope.amount_mld;
  const valEl = document.getElementById('vhEnvelopeValue');
  const fillEl = document.getElementById('vhEnvelopeFill');
  const noteEl = document.getElementById('vhEnvelopeNote');
  if (valEl) valEl.textContent = `${czNum(cost)} / ${czNum(cap)} mld Kč`;
  if (fillEl) {
    fillEl.style.width = `${Math.min(100, (cost / cap) * 100)}%`;
    fillEl.classList.toggle('vh-envelope-over', cost > cap);
  }
  if (noteEl) {
    if (cost > cap) {
      noteEl.innerHTML = `⚠ <strong>Deficit ${czNum(cost - cap)} mld Kč.</strong> Vyhláška nad možnosti pojistného prohlubuje schodek systému — viz <a href="clanek-deficit-vzp-2026.html">deficit VZP</a>.`;
      noteEl.className = 'vh-envelope-note vh-envelope-note-over';
    } else {
      noteEl.textContent = `Rezerva ${czNum(cap - cost)} mld Kč. ${escapeHtml(DOC.envelope.note || '')}`;
      noteEl.className = 'vh-envelope-note';
    }
  }
}

function renderPresets() {
  const host = document.getElementById('vhPresets');
  if (!host) return;
  host.innerHTML = (DOC.presets || []).map(p => `
    <button type="button" class="vh-preset" data-preset-id="${escapeHtml(p.id)}" title="${escapeHtml(p.desc)}">
      ${escapeHtml(p.label)}
    </button>`).join('');
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('.vh-preset');
    if (!btn) return;
    const preset = DOC.presets.find(p => p.id === btn.dataset.presetId);
    if (!preset) return;
    for (const s of SEGMENTS) {
      const el = document.getElementById(`vh-${s.id}`);
      if (el) el.value = preset.alloc[s.id] ?? 0;
    }
    refresh();
  });
}

// ---------------------------------------------------------------------------
// Render — výsledky
// ---------------------------------------------------------------------------

function renderResults(alloc) {
  const host = document.getElementById('vhResultsList');
  if (!host) return;
  const anySet = SEGMENTS.some(s => (alloc[s.id] || 0) > 0);
  if (!anySet) {
    host.innerHTML = `<p class="vh-empty">Nastavte růst segmentům vlevo (nebo zkuste preset) a tady uvidíte verdikt: kolik dohod uzavřete, jak se pohne struktura systému a co na to indikátory.</p>`;
    return;
  }

  const v = verdict(SEGMENTS, alloc, DOC.envelope.amount_mld, SCALE);
  const effects = effectsFor(SEGMENTS, alloc, INDICATORS);

  // 1) Dohody vs. realita
  const dealsTone = v.protests > 0 ? 'bad' : v.deals === v.segmentsTotal ? 'good' : 'mid';
  const dealsHtml = `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Dohody</h3>
      <p class="vh-verdict-big vh-tone-${dealsTone}">${v.deals} z ${v.segmentsTotal} vyjednávacích segmentů podepsalo</p>
      <p class="vh-verdict-note">${v.boosts > 0 ? `✚ ${v.boosts}× rozšíření péče (výrazně nad požadavek → delší ordinační hodiny, nové kapacity, vstup nových metod). ` : ''}${v.protests > 0 ? `⚠ ${v.protests}× protest/stávková pohotovost. ` : ''}Realita DR 2027: dohoda ve 12 z 15 segmentů (jedna částečná); bez dohody akutní i následná lůžková péče a mimolůžkoví ambulantní specialisté.</p>
    </div>`;

  // 2) Struktura — podíl lůžkového bloku vs. OECD
  const luzAfter = v.luzkovaShareAfter;
  const drift = luzAfter - v.luzkovaShareBefore;
  const structHtml = `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Struktura systému</h3>
      <div class="vh-share-row"><span class="vh-share-lbl">Lůžkový blok před</span><div class="vh-share-bar"><div class="vh-share-fill" style="width:${v.luzkovaShareBefore}%"></div></div><span class="vh-share-val">${czNum(v.luzkovaShareBefore)} %</span></div>
      <div class="vh-share-row"><span class="vh-share-lbl">Po vaší vyhlášce</span><div class="vh-share-bar"><div class="vh-share-fill vh-share-fill-after" style="width:${luzAfter}%"></div></div><span class="vh-share-val">${czNum(luzAfter)} %</span></div>
      <div class="vh-share-row"><span class="vh-share-lbl">Průměr OECD</span><div class="vh-share-bar"><div class="vh-share-fill vh-share-fill-oecd" style="width:30%"></div></div><span class="vh-share-val">~30 %</span></div>
      <p class="vh-verdict-note">Lůžkový blok = akutní nemocnice + centrová léčba + následná péče (NRHZS 2023: 56,3 %). ${drift < -0.05 ? `Vaší vyhláškou klesá o ${czNum(Math.abs(drift))} p. b. — směrem k OECD. Jedním rokem se struktura pohne jen o desetiny: setrvačnost je hlavní zjištění.` : drift > 0.05 ? `Vaší vyhláškou dál roste (+${czNum(drift)} p. b.) — od OECD se vzdalujete.` : 'Plošný růst strukturu nemění — přesně tak vzniká setrvačnost.'}</p>
    </div>`;

  // 3) Efekty na indikátory
  const active = effects.filter(e => e.kind === 'directional' && e.active);
  const none = effects.filter(e => e.kind === 'none');
  const effHtml = `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Doložené efekty na indikátory</h3>
      ${active.length ? active.map(e => {
        const ind = INDICATORS.get(e.indicator);
        const arrow = e.polarity === 'down' ? '↓' : '↑';
        return `<p class="vh-effect"><span class="vh-effect-arrow vh-arrow-${e.polarity}" aria-hidden="true">${arrow}</span>
          <strong>${escapeHtml(ind?.name || e.indicator)}</strong> ${escapeHtml(e.polarity === 'down' ? 'klesá' : 'roste')}
          (${escapeHtml(STRENGTH_LABEL[e.strength] || '')}) — ${escapeHtml(e.note || '')}</p>`;
      }).join('') : `<p class="vh-verdict-note">Žádný segment neroste nadprůměrně → žádné relativní posílení, žádný doložený efekt. Plošné přidání strukturu nemění.</p>`}
      ${none.length ? `<p class="vh-effect-none">U segmentů ${none.map(e => escapeHtml(SEGMENTS.find(s => s.id === e.segment)?.label || e.segment)).join(', ')} doložený efekt na sledované indikátory nemáme — hra to přiznává.</p>` : ''}
    </div>`;

  // 4) Kampaň Tři židle: vyhláška podepsána → pokračování jako ředitel
  saveAct('ministr', { alloc, verdict: { deals: v.deals, boosts: v.boosts, protests: v.protests, deficit: v.deficit, cost: v.cost } });
  const ctaHtml = `
    <div class="vh-verdict-block vh-campaign-cta">
      <h3 class="vh-verdict-h">Kampaň Tři židle</h3>
      <p class="vh-verdict-note">Vyhláška je na světě. Teď si vyzkoušejte, jak se s ní žije o patro níž —
        rozpočet vaší modelové nemocnice se odvodí z růstu, který jste právě přidělili lůžkové péči.</p>
      <a class="vh-campaign-link" href="reditel.html">Pokračovat jako ředitel nemocnice →</a>
    </div>`;

  host.innerHTML = dealsHtml + structHtml + effHtml + ctaHtml;
}

function renderSources() {
  const host = document.getElementById('vhSources');
  if (!host) return;
  const seen = new Set();
  const items = [];
  const push = (s) => { if (s && !seen.has(s)) { seen.add(s); items.push(s); } };
  push(DOC.baseline_total_source);
  push(DOC.envelope?.source);
  push(DOC.real_2027_context?.source);
  for (const s of SEGMENTS) {
    push(s.baseline_source);
    (s.representative?.argument_sources || []).forEach(push);
    for (const eff of s.effects || []) push(eff.source);
  }
  host.innerHTML = items.map(s => `<li>${escapeHtml(s)}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Wiring + bootstrap
// ---------------------------------------------------------------------------

function refresh() {
  const alloc = currentAlloc();
  SEGMENTS.forEach(s => updateSegmentUi(s, alloc));
  renderEnvelope(alloc);
  renderResults(alloc);
  renderCampaignStepper('ministr');
}

async function init() {
  renderModuleNav('financing');
  renderMastheadDate();
  renderRelatedTools('vyhlaska');

  const host = document.getElementById('vhSegmentsList');
  if (!host) return;
  try {
    const [doc, inds] = await Promise.all([
      fetch('data/vyhlaska-hra.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
    ]);
    DOC = doc;
    SEGMENTS = doc.segments ?? [];
    INDICATORS = new Map((inds.indicators ?? []).map(i => [i.id, i]));
    const baseSum = SEGMENTS.reduce((a, s) => a + s.baseline_mld, 0);
    SCALE = Number.isFinite(doc.current_total_mld) && baseSum > 0
      ? doc.current_total_mld / baseSum : 1;

    renderSegments();
    renderPresets();
    renderSources();
    refresh();

    const form = document.getElementById('vhControls');
    form.addEventListener('input', refresh);
    form.addEventListener('reset', () => setTimeout(refresh, 0));
  } catch (err) {
    host.innerHTML = renderErrorState('Hru se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
