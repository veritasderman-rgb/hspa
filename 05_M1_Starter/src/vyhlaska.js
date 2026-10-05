// Úhradová vyhláška: zahrajte si na ministra (vyhlaska.html).
// Hráč rozděluje modelovou obálku růstu úhrad mezi 17 segmentů; zástupci
// segmentů argumentují (doložená čísla) a podle gapu vs. modelový požadavek
// eskalují: dohoda → podpis s výhradami → bez dohody → protest/stávková
// pohotovost. Data: data/vyhlaska-hra.json; výpočet: src/vyhlaska-engine.js.
//
// v3 (říjen 2026): značka požadavku a zóny nálady přímo na posuvníku, řádek
// „Chybí X p. b. → …", relativní spravedlnost, trilema verdiktu, projekce
// struktury na 1/5/10/20 let, „Co si odnést", mobilní lišta, inline glosář,
// herní newsletter popup (po verdiktu, ne na časovač) a GA eventy.
// Modelová hra, ne predikce. Viz PLAN-VYHLASKA-HRA.md.

import './analytics.js';
import { trackEvent } from './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import {
  totalCost, moodContext, moodExplain, effectsFor, verdict, trilemma, takeaways,
  structureProjection, yearsToShare, vyhlaskaParams, coverageFor, effectiveAlloc,
  LUZKOVA_GROUP, MOOD_LABELS, TRILEMMA_AXES, TRILEMMA_LABELS,
} from './vyhlaska-engine.js';
import { saveAct, loadState, encodeShare } from './hra-stav.js';
import { renderCampaignStepper } from './hra-stepper.js';
import { armGameNewsletter } from './hra-newsletter.js';
import { enhanceInlineGlossary } from './glossary-inline.js';
import { initGlossaryPopover } from './glossary-popover.js';

let DOC = null;
let SEGMENTS = [];
let INDICATORS = new Map();
let SCALE = 1; // objem dnešního roku / součet baseline (viz DOC.scale_note)
let PARAMS = { envelopeMld: 0, scale: 1, reserveMld: 0 }; // vyhlaskaParams(DOC): obálka, škála, rezerva
let HORIZON = 1; // projekce struktury: 1 | 5 | 10 | 20 let téže vyhlášky
let NL = null; // herní newsletter (hra-newsletter.js)
let GLOSS = null; // rozšířená hesla glosáře (aliasy) pro inline označení
let verdictTracked = false;

const STRENGTH_LABEL = { weak: 'slabě', medium: 'středně', strong: 'silně' };
const MOOD_CLASS = { boost: 'boost', agree: 'agree', grudging: 'grudging', no_deal: 'nodeal', protest: 'protest' };
const MOOD_CHIP = { boost: 'Rozšíření péče', agree: 'Dohoda', grudging: 'S výhradami', no_deal: 'Bez dohody', protest: 'Protest' };
const SLIDER_MAX = 15;
const HORIZONS = [1, 5, 10, 20];
const TONE_LABEL = { good: 'v pořádku', mid: 'napjaté', bad: 'obětováno' };
const SACRIFICE_LABEL = { dohody: 'dohody', reforma: 'reformu struktury', bilance: 'bilanci' };

// Pojmy, které hra používá a medik je nemusí znát — slovníček pod metodikou
// (data/glossary.json). Inline glosář navíc označí přesné výskyty v textu.
const GAME_TERMS = [
  'dohodovací řízení', 'úhradová vyhláška', 'hodnota bodu', 'kapitace', 'DRG',
  'centrová léčba', '§ 16', 'odvratitelné hospitalizace', 'státní pojištěnci',
];

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
  host.innerHTML = groups.map((g, i) => `
    <div class="vh-group" id="vh-group-${i}">
      <h3 class="vh-group-h">${escapeHtml(g.name)}
        <span class="vh-group-sum">${czNum(g.items.reduce((a, s) => a + s.baseline_share_pct, 0))} % úhrad · ${g.items.length} ${g.items.length === 1 ? 'segment' : g.items.length < 5 ? 'segmenty' : 'segmentů'}</span>
      </h3>
      ${g.items.map(renderSegment).join('')}
    </div>`).join('');
  const nav = document.getElementById('vhGroupNav');
  if (nav) {
    nav.innerHTML = groups.map((g, i) => `<a class="vh-group-pill" href="#vh-group-${i}">${escapeHtml(g.name)} <span>${czNum(g.items.reduce((a, s) => a + s.baseline_share_pct, 0), 0)} %</span></a>`).join('');
  }
}

/** Klíčová čísla hry nad posuvníky — z dat, ne z textu. */
function renderHeroStats() {
  const host = document.getElementById('vhHeroStats');
  if (!host) return;
  const negotiating = SEGMENTS.filter(s => s.dr_segment !== false).length;
  const tiles = [
    { v: `${czNum(DOC.current_total_mld, 0)} mld`, l: `proteče letos systémem (${DOC.current_year})` },
    { v: `${czNum(PARAMS.envelopeMld, 0)} mld`, l: 'obálka růstu, kterou rozdělujete' },
    { v: `${czNum(PARAMS.reserveMld)} mld`, l: 'rezerva pojišťoven — necelé dva dny výdajů' },
    { v: `${SEGMENTS.length}`, l: `segmentů péče, ${negotiating} z nich vyjednává` },
  ];
  host.innerHTML = tiles.map(t => `<div class="vh-stat"><span class="vh-stat-v">${escapeHtml(t.v)}</span><span class="vh-stat-l">${escapeHtml(t.l)}</span></div>`).join('');
}

/**
 * Stupnice pod posuvníkem: zóny nálady odvozené z požadavku segmentu
 * (protest < d−4 ≤ bez dohody < d−2 ≤ výhrady < d ≤ dohoda < d+2 ≤ rozšíření)
 * a značka požadavku. Čistě vizuální (aria-hidden) — logiku vysvětluje řádek .vh-gap.
 */
function renderSliderScale(s) {
  const d = s.demand_pct;
  const clamp = (v) => Math.min(SLIDER_MAX, Math.max(0, v));
  const pct = (v) => (clamp(v) / SLIDER_MAX) * 100;
  const zones = [
    ['protest', 0, d - 4],
    ['nodeal', d - 4, d - 2],
    ['grudging', d - 2, d],
    ['agree', d, d + 2],
    ['boost', d + 2, SLIDER_MAX],
  ];
  return `
      <div class="vh-slider-scale" aria-hidden="true">
        ${zones.map(([k, a, b]) => {
          const w = pct(b) - pct(a);
          return w > 0 ? `<span class="vh-zone vh-zone-${k}" style="left:${pct(a)}%;width:${w}%"></span>` : '';
        }).join('')}
        <span class="vh-demand-tick" style="left:${pct(d)}%"><i>žádá +${czNum(d)} %</i></span>
      </div>`;
}

function renderSegment(s) {
  const id = escapeHtml(s.id);
  const r = s.representative || {};
  const initials = escapeHtml((r.role || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase());
  return `
    <div class="vh-segment" data-segment-id="${id}" data-mood="none">
      <div class="vh-seg-head">
        <div class="vh-seg-title-wrap">
          <span class="vh-seg-label">${escapeHtml(s.label)}</span>
          <span class="vh-seg-sublabel">${escapeHtml(s.sublabel || '')} · ${czNum(s.baseline_share_pct)} % úhrad · ${czNum(s.baseline_mld)} mld (${DOC.baseline_year})</span>
        </div>
        <span class="vh-seg-state vh-seg-state-none" id="vh-state-${id}" aria-live="off">nenastaveno</span>
      </div>
      <div class="vh-rep">
        <span class="vh-rep-avatar" aria-hidden="true">${initials}</span>
        <div class="vh-rep-body">
          <span class="vh-rep-role">${escapeHtml(r.role || '')} <span class="vh-rep-demand-chip">žádá +${czNum(s.demand_pct)} %</span></span>
          <p class="vh-rep-arg">„${escapeHtml(r.argument || '')}“</p>
          <p class="vh-rep-demand"><span class="vh-rep-demand-why">${escapeHtml(s.demand_reasoning || '')}</span></p>
        </div>
      </div>
      <div class="vh-seg-control">
        <label class="sr-only" for="vh-${id}">Růst úhrad segmentu ${escapeHtml(s.label)} v procentech (požadavek +${czNum(s.demand_pct)} %)</label>
        <div class="vh-slider-wrap">
          <input type="range" id="vh-${id}" class="vh-slider" min="0" max="${SLIDER_MAX}" step="0.5" value="0"
                 aria-describedby="vh-gap-${id} vh-mood-${id}" aria-valuetext="+0 %">
          ${renderSliderScale(s)}
        </div>
        <output class="vh-seg-value" id="vh-out-${id}" for="vh-${id}">+0 %</output>
      </div>
      <p class="vh-gap" id="vh-gap-${id}"></p>
      <p class="vh-mood vh-mood-protest" id="vh-mood-${id}"></p>
    </div>`;
}

function updateSegmentUi(s, alloc, eff, ctx) {
  const pct = alloc[s.id] || 0;
  const paid = eff[s.id] ?? pct;
  const out = document.getElementById(`vh-out-${s.id}`);
  const slider = document.getElementById(`vh-${s.id}`);
  const cut = pct - paid >= 0.05;
  const txt = cut ? `+${czNum(pct)} % → kryto +${czNum(paid)} %` : `+${czNum(pct)} %`;
  if (out) out.textContent = txt;
  if (slider) slider.setAttribute('aria-valuetext', txt);

  // nálada z toho, co segment skutečně dostane (krytí), se slibem pro pravidlo nesplněného slibu
  const ex = moodExplain(s, paid, ctx, pct);
  const gapEl = document.getElementById(`vh-gap-${s.id}`);
  if (gapEl) {
    gapEl.textContent = ex.text;
    gapEl.className = `vh-gap${ex.escalated || ex.broken ? ' vh-gap-escalated' : ''}`;
  }

  const mood = ex.mood;
  const card = slider?.closest('.vh-segment');
  if (card) card.dataset.mood = pct > 0 ? MOOD_CLASS[mood] : 'none';
  const chip = document.getElementById(`vh-state-${s.id}`);
  if (chip) {
    chip.textContent = pct > 0 ? MOOD_CHIP[mood] : 'nenastaveno';
    chip.className = `vh-seg-state vh-seg-state-${pct > 0 ? MOOD_CLASS[mood] : 'none'}`;
  }
  if (out) out.className = `vh-seg-value vh-seg-value-${pct > 0 ? MOOD_CLASS[mood] : 'none'}`;
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
    const within = cost > cap && cost <= cap + PARAMS.reserveMld;
    fillEl.classList.toggle('vh-envelope-over', cost > cap + PARAMS.reserveMld);
    fillEl.classList.toggle('vh-envelope-warn', within);
  }
  if (noteEl) {
    if (cost > cap) {
      const cov = coverageFor(cost, cap, PARAMS.reserveMld);
      noteEl.innerHTML = cov.uncoveredMld > 0
        ? `⚠ <strong>Deficit ${czNum(cost - cap)} mld Kč — nad rezervu systému (${czNum(PARAMS.reserveMld)} mld).</strong> Pojišťovny kryjí jen <strong>${Math.round(cov.ratio * 100)} %</strong> slibu a krátí všem poměrně; zástupci reagují na to, co dostanou. Viz <a href="clanek-deficit-vzp-2026.html">deficit VZP</a>.`
        : `⚠ <strong>Deficit ${czNum(cost - cap)} mld Kč.</strong> Rezerva systému (${czNum(PARAMS.reserveMld)} mld, necelé dva dny výdajů) to letos unese — příští rok ale začínáte bez polštáře. Viz <a href="clanek-deficit-vzp-2026.html">deficit VZP</a>.`;
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
    trackEvent('hra_preset', { akt: 'ministr', preset: preset.id });
    refresh();
  });
}

// ---------------------------------------------------------------------------
// Render — výsledky
// ---------------------------------------------------------------------------

function renderTrilemma(v) {
  const t = trilemma(v);
  const chips = TRILEMMA_AXES.map(a => {
    const ax = t.axes[a];
    return `<div class="vh-tri-axis vh-tri-axis-${ax.tone}">
        <span class="vh-tri-lbl">${escapeHtml(TRILEMMA_LABELS[a])}</span>
        <span class="vh-tri-val">${escapeHtml(ax.value)}</span>
        <span class="vh-tri-note">${escapeHtml(ax.note || '')} · ${TONE_LABEL[ax.tone]}</span>
      </div>`;
  }).join('');
  let sentence;
  if (t.sacrificed.length) {
    sentence = `<strong>Vaše vyhláška obětovala ${t.sacrificed.map(a => SACRIFICE_LABEL[a]).join(' a ')}.</strong> Tři cíle, jedna obálka — něco musí ustoupit vždycky; otázka je, co a komu to řeknete.`;
  } else if (TRILEMMA_AXES.every(a => t.axes[a].tone === 'good')) {
    sentence = '<strong>Všechny tři cíle najednou.</strong> V reálném dohodovacím řízení se to nestává — zkuste, co se stane, když nemocnicím dáte, co žádají.';
  } else {
    sentence = '<strong>Nic jste neobětovali — ale ani nic nezměnili.</strong> Přesně tak vypadá vyhláška většiny let.';
  }
  return `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Trilema vyhlášky</h3>
      <div class="vh-tri-wrap">
        ${renderTriangle(t)}
        <div class="vh-trilemma" role="group" aria-label="Tři cíle vyhlášky">${chips}</div>
      </div>
      <p class="vh-tri-sentence">${sentence}</p>
    </div>`;
}

/** Trojúhelník trilematu: vrcholy obarvené tónem osy, spojnice slabě. Dekorativní (chipy nesou text). */
function renderTriangle(t) {
  const P = { dohody: [75, 16], reforma: [24, 96], bilance: [126, 96] };
  const L = { dohody: [75, 8], reforma: [24, 113], bilance: [126, 113] };
  const SHORT = { dohody: 'Dohody', reforma: 'Reforma', bilance: 'Bilance' };
  const tone = (a) => t.axes[a].tone;
  return `<svg class="vh-tri-svg" viewBox="0 0 150 120" width="150" height="120" aria-hidden="true" focusable="false">
    <polygon points="75,16 24,96 126,96" class="vh-tri-edge"></polygon>
    ${TRILEMMA_AXES.map(a => `<circle cx="${P[a][0]}" cy="${P[a][1]}" r="9" class="vh-tri-node vh-tri-node-${tone(a)}"></circle>`).join('')}
    ${TRILEMMA_AXES.map(a => `<text x="${L[a][0]}" y="${L[a][1]}" text-anchor="middle" class="vh-tri-txt">${SHORT[a]}</text>`).join('')}
  </svg>`;
}

function renderStructure(v, alloc) {
  const horizon = HORIZON;
  const luzAfter = horizon === 1 ? v.luzkovaShareAfter : structureProjection(SEGMENTS, alloc, LUZKOVA_GROUP, [horizon])[0].share;
  const drift = luzAfter - v.luzkovaShareBefore;
  const years = yearsToShare(SEGMENTS, alloc, LUZKOVA_GROUP, 30);
  const driftOne = v.luzkovaShareAfter - v.luzkovaShareBefore;
  let note;
  if (driftOne < -0.05) {
    note = `Vaší vyhláškou klesá — směrem k OECD. Jedním rokem se struktura pohne jen o desetiny: setrvačnost je hlavní zjištění. ${Number.isFinite(years) && years > 0
      ? `Kdyby stejná vyhláška platila každý rok, na průměr OECD byste dosáhli za <strong>${years} let</strong>.`
      : 'Ani při stejné vyhlášce každý rok byste průměr OECD do sta let nedohnali.'}`;
  } else if (driftOne > 0.05) {
    note = 'Vaší vyhláškou lůžkový blok dál roste — od OECD se vzdalujete, a každý další rok stejné vyhlášky rozdíl násobí.';
  } else {
    note = 'Plošný růst strukturu nemění — přesně tak vzniká setrvačnost. Zkuste přepnout na 10 let: nestane se nic ani potom.';
  }
  const afterLabel = horizon === 1 ? 'Po vaší vyhlášce' : `Po ${horizon} letech téže vyhlášky`;
  return `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Struktura systému</h3>
      <div class="vh-horizon-row" role="group" aria-label="Horizont projekce">
        <span>Stejná vyhláška každý rok:</span>
        ${HORIZONS.map(h => `<button type="button" class="vh-horizon" data-years="${h}" aria-pressed="${h === horizon}">${h === 1 ? '1 rok' : `${h} let`}</button>`).join('')}
      </div>
      <div class="vh-share-row"><span class="vh-share-lbl">Lůžkový blok před</span><div class="vh-share-bar"><div class="vh-share-fill" style="width:${v.luzkovaShareBefore}%"></div></div><span class="vh-share-val">${czNum(v.luzkovaShareBefore)} %</span></div>
      <div class="vh-share-row"><span class="vh-share-lbl">${afterLabel}</span><div class="vh-share-bar"><div class="vh-share-fill vh-share-fill-after" style="width:${Math.min(100, luzAfter)}%"></div></div><span class="vh-share-val">${czNum(luzAfter)} %</span></div>
      <div class="vh-share-row"><span class="vh-share-lbl">Průměr OECD</span><div class="vh-share-bar"><div class="vh-share-fill vh-share-fill-oecd" style="width:30%"></div></div><span class="vh-share-val">~30 %</span></div>
      <p class="vh-verdict-note">Lůžkový blok = akutní nemocnice + centrová léčba + následná péče (NRHZS 2023: 56,3 %). ${horizon > 1 ? `Za ${horizon} let: ${drift < 0 ? '−' : '+'}${czNum(Math.abs(drift))} p. b. — definitorický přepočet za předpokladu stejné vyhlášky každý rok, ne predikce. ` : ''}${note}</p>
    </div>`;
}

function renderResults(alloc) {
  const host = document.getElementById('vhResultsList');
  if (!host) return;
  const anySet = SEGMENTS.some(s => (alloc[s.id] || 0) > 0);
  if (!anySet) {
    host.innerHTML = `<p class="vh-empty">Nastavte růst segmentům vlevo (nebo zkuste preset) a tady uvidíte verdikt: kolik dohod uzavřete, co jste obětovali, jak se pohne struktura systému a co na to indikátory.</p>`;
    renderMobileBar(null);
    return;
  }

  const v = verdict(SEGMENTS, alloc, PARAMS.envelopeMld, SCALE, PARAMS.reserveMld);
  const paid = v.effective; // co se skutečně vyplatí (krytí) — struktura, efekty i projekce z toho
  const effects = effectsFor(SEGMENTS, paid, INDICATORS);

  // 1) Trilema — syntéza před detaily
  const triHtml = renderTrilemma(v);

  // 2) Dohody vs. realita
  const dealsTone = v.protests > 0 ? 'bad' : v.deals === v.segmentsTotal ? 'good' : 'mid';
  const dealsHtml = `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Dohody</h3>
      <p class="vh-verdict-big vh-tone-${dealsTone}">${v.deals} z ${v.segmentsTotal} vyjednávacích segmentů podepsalo</p>
      <p class="vh-verdict-note">${v.coverage < 1 ? `⚠ Pojišťovny kryjí jen <strong>${Math.round(v.coverage * 100)} %</strong> slibu (deficit ${czNum(v.deficitMld)} mld nad rezervu ${czNum(v.reserve)} mld) — zástupci reagují na to, co dostanou. ` : ''}${v.brokenPromises > 0 ? `✕ ${v.brokenPromises}× slib bez krytí (eskalace o stupeň). ` : ''}${v.boosts > 0 ? `✚ ${v.boosts}× rozšíření péče (výrazně nad požadavek → delší ordinační hodiny, nové kapacity, vstup nových metod). ` : ''}${v.protests > 0 ? `⚠ ${v.protests}× protest/stávková pohotovost. ` : ''}${v.escalations > 0 ? `↑ ${v.escalations}× eskalace o stupeň kvůli relativní spravedlnosti (segment pod průměrem ${czNum(v.avgPct)} %, zatímco jiný dostal víc, než žádal). ` : ''}Realita DR 2027: dohoda ve 12 z 15 segmentů (jedna částečná); bez dohody akutní i následná lůžková péče a mimolůžkoví ambulantní specialisté.</p>
    </div>`;

  // 3) Struktura — podíl lůžkového bloku vs. OECD, s projekcí
  const structHtml = renderStructure(v, paid);

  // 4) Efekty na indikátory
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
          (${escapeHtml(STRENGTH_LABEL[e.strength] || '')}; segment o ${czNum(e.above_avg_pb)} p. b. nad průměrem ${czNum(v.avgPct)} %) — ${escapeHtml(e.note || '')}</p>`;
      }).join('') : `<p class="vh-verdict-note">Žádný segment neroste nadprůměrně (průměr ${czNum(v.avgPct)} %) → žádné relativní posílení, žádný doložený efekt. Efekt se zapne, jakmile segment přeroste průměr — plošné přidání strukturu nemění.</p>`}
      ${none.length ? `<p class="vh-effect-none">U segmentů ${none.map(e => escapeHtml(SEGMENTS.find(s => s.id === e.segment)?.label || e.segment)).join(', ')} doložený efekt na sledované indikátory nemáme — hra to přiznává.</p>` : ''}
    </div>`;

  // 5) Co si odnést — podle toho, co hráč udělal
  const years = yearsToShare(SEGMENTS, paid, LUZKOVA_GROUP, 30);
  const tk = takeaways(SEGMENTS, alloc, v, { scale: SCALE, yearsToOecd: years });
  const tkHtml = `
    <div class="vh-verdict-block">
      <h3 class="vh-verdict-h">Co si odnést</h3>
      ${tk.map(t => `<p class="vh-takeaway">${escapeHtml(t.text)}${t.href ? ` <a href="${escapeHtml(t.href)}">Více →</a>` : ''}</p>`).join('')}
    </div>`;

  // 6) Kampaň Tři židle: vyhláška podepsána → pokračování jako ředitel
  saveAct('ministr', {
    alloc,
    deficit_mld: Math.max(0, Math.round((v.cost - v.envelope) * 10) / 10),
    coverage_ratio: v.coverage,
    verdict: { deals: v.deals, boosts: v.boosts, protests: v.protests, escalations: v.escalations, brokenPromises: v.brokenPromises, deficit: v.deficit, coverage: v.coverage, cost: v.cost },
  });
  const shareCode = encodeShare(loadState());
  const ctaHtml = `
    <div class="vh-verdict-block vh-campaign-cta">
      <h3 class="vh-verdict-h">Kampaň Tři židle</h3>
      <p class="vh-verdict-note">Vyhláška je na světě. Teď si vyzkoušejte, jak se s ní žije o patro níž —
        rozpočet vaší modelové nemocnice se odvodí z růstu, který jste právě přidělili lůžkové péči${v.coverage < 1 ? `, krácený na ${Math.round(v.coverage * 100)} % — pojišťovny víc nemají` : ''}. Čekárny ambulancí si do aktu III ponese to, co jste jim tady nastavili.</p>
      <a class="vh-campaign-link" href="reditel.html" data-track="pokracovat">Pokračovat jako ředitel nemocnice →</a>
      <a class="vh-campaign-link vh-campaign-link-sec" href="porovnani.html?k=${encodeURIComponent(shareCode)}" data-track="porovnani">Porovnat svou vyhlášku s kolegy →</a>
    </div>`;

  host.innerHTML = triHtml + dealsHtml + structHtml + effHtml + tkHtml + ctaHtml;
  if (GLOSS) { delete host.dataset.glossInlineInit; enhanceInlineGlossary(GLOSS, host); }
  renderMobileBar(v);

  if (!verdictTracked) {
    verdictTracked = true;
    trackEvent('hra_verdikt', { akt: 'ministr' });
  }
  NL?.verdictReady();
}

/** Kompaktní lišta pro mobil (verdikt je pod 17 kartami) — čerpání, dohody, protesty. */
function renderMobileBar(v) {
  const bar = document.getElementById('vhMobileBar');
  if (!bar) return;
  if (!v) {
    bar.hidden = true;
    document.body.classList.remove('vh-has-bar');
    return;
  }
  bar.hidden = false;
  document.body.classList.add('vh-has-bar');
  bar.innerHTML = `
    <span class="vh-mobile-bar-txt"><strong class="${v.deficit ? 'vh-tone-bad' : ''}">${czNum(v.cost)} / ${czNum(v.envelope)} mld</strong>${v.coverage < 1 ? ` · <span class="vh-tone-bad">kryto ${Math.round(v.coverage * 100)} %</span>` : ''} · ${v.deals}/${v.segmentsTotal} dohod${v.protests ? ` · <span class="vh-tone-bad">${v.protests}× protest</span>` : ''}</span>
    <a class="vh-mobile-bar-btn" href="#vhResults">Verdikt ↓</a>`;
}

function renderSources() {
  const host = document.getElementById('vhSources');
  if (!host) return;
  const seen = new Set();
  const items = [];
  const push = (s) => { if (s && !seen.has(s)) { seen.add(s); items.push(s); } };
  push(DOC.baseline_total_source);
  push(DOC.envelope?.source);
  push(DOC.envelope?.reserve_source);
  push(DOC.real_2027_context?.source);
  for (const s of SEGMENTS) {
    push(s.baseline_source);
    (s.representative?.argument_sources || []).forEach(push);
    for (const eff of s.effects || []) push(eff.source);
  }
  host.innerHTML = items.map(s => `<li>${escapeHtml(s)}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Glosář pro mediky: slovníček pod metodikou + inline označení v textu
// ---------------------------------------------------------------------------

async function initGlossary() {
  let terms = [];
  try {
    const g = await fetch('data/glossary.json').then(r => r.json());
    terms = Array.isArray(g?.terms) ? g.terms : [];
  } catch {
    return; // glosář je bonus — hra bez něj běží
  }
  const host = document.getElementById('vhGlossary');
  if (host) {
    const byKey = new Map(terms.map(t => [t.key, t]));
    const items = GAME_TERMS.map(k => byKey.get(k)).filter(Boolean);
    host.innerHTML = items.length ? `
      <div class="vh-glossary-grid">
        ${items.map(t => `<article class="vh-gloss-card">
          <h3 class="vh-gloss-key"><a href="glosar.html#${escapeHtml(t.anchor)}">${escapeHtml(t.key)}</a></h3>
          ${t.full && t.full !== t.key ? `<p class="vh-gloss-full">${escapeHtml(t.full)}</p>` : ''}
          <p class="vh-gloss-def">${escapeHtml(t.short_def)}</p>
        </article>`).join('')}
      </div>` : '';
  }
  // Skloněné tvary (glossary.json → aliases) + varianta s velkým počátečním
  // písmenem: inline matcher hledá přesný tvar, herní text hesla skloňuje.
  const expanded = expandGlossaryAliases(terms);
  GLOSS = expanded;
  document.querySelectorAll('[data-gloss-scope]').forEach(el => enhanceInlineGlossary(expanded, el));
  initGlossaryPopover(expanded);
}

/** Heslo → [heslo, aliasy, velká počáteční písmena]; alias nese `canonical` a `display` (kanonické heslo). */
export function expandGlossaryAliases(terms) {
  const out = [];
  for (const t of terms) {
    const forms = new Set([t.key, ...(Array.isArray(t.aliases) ? t.aliases : [])]);
    for (const f of [...forms]) {
      if (f && /^[a-záčďéěíňóřšťúůýž]/.test(f)) forms.add(f[0].toUpperCase() + f.slice(1));
    }
    for (const f of forms) {
      if (!f) continue;
      out.push(f === t.key ? { ...t, display: t.key } : { ...t, key: f, canonical: t.key, display: t.key });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Wiring + bootstrap
// ---------------------------------------------------------------------------

function refresh() {
  const alloc = currentAlloc();
  const eff = effectiveAlloc(SEGMENTS, alloc, PARAMS);
  const ctx = moodContext(SEGMENTS, eff);
  SEGMENTS.forEach(s => updateSegmentUi(s, alloc, eff, ctx));
  renderEnvelope(alloc);
  renderResults(alloc);
  renderCampaignStepper('ministr');
}

async function init() {
  renderModuleNav('financing', { popups: 'manual' });
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
    PARAMS = vyhlaskaParams(doc);
    SCALE = PARAMS.scale;

    renderHeroStats();
    renderSegments();
    renderPresets();
    renderSources();

    const form = document.getElementById('vhControls');
    NL = armGameNewsletter({ hook: doc.newsletter_hook ?? null, activityEl: form });

    // obnova vyhlášky z kampaně (návrat na stránku) — stejné vstupy, stejný verdikt
    const saved = loadState().ministr?.alloc;
    if (saved) {
      for (const s of SEGMENTS) {
        const el = document.getElementById(`vh-${s.id}`);
        if (el && Number.isFinite(Number(saved[s.id]))) el.value = Number(saved[s.id]);
      }
    }
    refresh();

    form.addEventListener('input', refresh);
    form.addEventListener('reset', () => setTimeout(refresh, 0));

    const results = document.getElementById('vhResultsList');
    results?.addEventListener('click', (e) => {
      const h = e.target.closest('.vh-horizon');
      if (h) {
        HORIZON = Number(h.dataset.years) || 1;
        trackEvent('hra_horizont', { akt: 'ministr', roky: HORIZON });
        renderResults(currentAlloc());
        return;
      }
      const link = e.target.closest('[data-track]');
      if (link) trackEvent(link.dataset.track === 'pokracovat' ? 'hra_pokracovat' : 'hra_porovnani', { z: 'ministr' });
    });

    initGlossary();
  } catch (err) {
    host.innerHTML = renderErrorState('Hru se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
