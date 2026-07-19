// Tři židle — hub herní kampaně (hra.html). Jeden systém, tři pohledy:
// ministr (vyhlaska.html) → ředitel nemocnice (reditel.html) → pacient
// (pribeh-pacienta.html) + epilog na Modelu systému. Hub ukazuje postup,
// po dokončení všech aktů výsledovku kampaně a sdílecí odkaz (jen herní
// vstupy, bez backendu). Verdikty se vždy přepočítávají enginy aktů.
// Viz PLAN-TRI-ZIDLE.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import { loadState, saveAct, resetCampaign, encodeShare, decodeShare } from './hra-stav.js';
import { verdict as vyhlaskaVerdict } from './vyhlaska-engine.js';
import { verdict as reditelVerdict } from './reditel-engine.js';
import { journeyOutcome, waitingFromCampaign } from './pribeh-engine.js';

let VYHLASKA = null;
let REDITEL = null;
let PRIBEH = null;
let SHARED = null; // stav ze sdíleného odkazu (?k=), jinak null

const AXIS_LABELS = { hospodareni: 'Hospodaření', personal: 'Personál', pacienti: 'Pacienti' };
const TONE_LABEL = { good: 'v pořádku', mid: 'napjaté', bad: 'kritické' };
const WAIT_LABEL = { kratsi: 'kratší čekání', stejne: 'běžné čekání', delsi: 'delší čekání' };

function czNum(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

function state() {
  return SHARED ?? loadState();
}

// ---------------------------------------------------------------------------
// Přepočet verdiktů z uložených VSTUPŮ (jediný zdroj pravdy = enginy aktů)
// ---------------------------------------------------------------------------

function ministrSummary(st) {
  if (!st.ministr?.alloc) return null;
  const scale = VYHLASKA.current_total_mld / VYHLASKA.segments.reduce((a, s) => a + s.baseline_mld, 0);
  return vyhlaskaVerdict(VYHLASKA.segments, st.ministr.alloc, VYHLASKA.envelope.amount_mld, scale);
}

function reditelSummary(st) {
  if (!st.reditel?.decisions || !Object.keys(st.reditel.decisions).length) return null;
  return reditelVerdict(REDITEL, st.reditel.decisions, st.ministr);
}

function pacientSummary(st) {
  const persona = PRIBEH.personas.find(p => p.id === st.pacient?.persona);
  if (!persona) return null;
  const rd = reditelSummary(st);
  const waiting = rd ? rd.waiting : waitingFromCampaign(null);
  const outcome = journeyOutcome(persona, st.pacient?.decisions || {}, waiting, PRIBEH.waiting_shift_weeks);
  return { persona, outcome };
}

// ---------------------------------------------------------------------------
// Render — karty aktů
// ---------------------------------------------------------------------------

function actCard({ num, title, desc, href, cta, status, detail }) {
  return `
    <div class="hra-act hra-act-${status}">
      <div class="hra-act-head">
        <span class="hra-act-num" aria-hidden="true">${num}</span>
        <span class="hra-act-title">${escapeHtml(title)}</span>
        <span class="hra-act-status">${status === 'done' ? 'dokončeno' : status === 'progress' ? 'rozehráno' : 'nehráno'}</span>
      </div>
      <p class="hra-act-desc">${desc}</p>
      ${detail ? `<p class="hra-act-detail">${detail}</p>` : ''}
      <a class="hra-act-cta" href="${href}">${escapeHtml(cta)}</a>
    </div>`;
}

function renderActs() {
  const host = document.getElementById('hraActs');
  if (!host) return;
  const st = state();
  const m = ministrSummary(st);
  const r = reditelSummary(st);
  const p = pacientSummary(st);

  const mDetail = m
    ? `Vaše vyhláška: <strong>${m.deals} z ${m.segmentsTotal}</strong> dohod${m.protests ? `, ${m.protests}× protest` : ''}${m.deficit ? `, deficit ${czNum(m.cost - m.envelope)} mld` : ', bez deficitu'}.`
    : null;
  const rDetail = r
    ? `Váš rok: ${Object.entries(r.tones).map(([ax, t]) => `${AXIS_LABELS[ax]} <strong class="hra-tone-${t}">${TONE_LABEL[t]}</strong>`).join(' · ')}.`
    : null;
  const pDetail = p
    ? `${escapeHtml(p.persona.label)}: <strong>${czNum(p.outcome.weeks, 0)} týdnů</strong> v systému, ${czNum(p.outcome.oop_kc, 0)} Kč z kapsy (${WAIT_LABEL[p.outcome.waiting]}).`
    : null;

  host.innerHTML = [
    actCard({
      num: 'I', title: 'Ministr — úhradová vyhláška', href: 'vyhlaska.html',
      desc: 'Rozdělte 40 miliard růstu mezi 17 segmentů péče a ustůjte reakce jejich zástupců.',
      cta: m ? 'Upravit vyhlášku →' : 'Zahrát akt I →',
      status: m ? 'done' : 'todo', detail: mDetail,
    }),
    actCard({
      num: 'II', title: 'Ředitel nemocnice — rok s vaší vyhláškou', href: 'reditel.html',
      desc: 'Rozpočet vám určil akt I. Čtyři kvartály rozhodnutí o platech, přesčasech a odděleních.',
      cta: r?.complete ? 'Přehrát rok →' : r ? 'Dohrát akt II →' : 'Zahrát akt II →',
      status: r?.complete ? 'done' : r ? 'progress' : 'todo', detail: rDetail,
    }),
    actCard({
      num: 'III', title: 'Pacient (a lékař) — cesta systémem', href: 'pribeh-pacienta.html',
      desc: 'Projděte cestu persony čekárnami, které jste sami nastavili — a přehrajte si ji očima lékaře.',
      cta: p?.outcome.complete ? 'Projít znovu →' : p ? 'Dohrát akt III →' : 'Zahrát akt III →',
      status: p?.outcome.complete ? 'done' : p ? 'progress' : 'todo', detail: pDetail,
    }),
    actCard({
      num: '∞', title: 'Epilog — Tři židle na mapě systému', href: 'model-systemu.html?role=pacient',
      desc: 'Celá kauzální mapa s přepínačem rolí: co každá židle vidí jasně, co má v mlze — a kde se zájmy střetávají.',
      cta: 'Otevřít mapu →',
      status: (m && r?.complete && p?.outcome.complete) ? 'done' : 'todo', detail: null,
    }),
  ].join('');
}

// ---------------------------------------------------------------------------
// Render — výsledovka kampaně
// ---------------------------------------------------------------------------

function renderSummary() {
  const host = document.getElementById('hraSummary');
  if (!host) return;
  const st = state();
  const m = ministrSummary(st);
  const r = reditelSummary(st);
  const p = pacientSummary(st);

  if (!m || !r?.complete || !p?.outcome.complete) {
    const played = [m, r, p].filter(Boolean).length;
    host.innerHTML = `<p class="hra-note">${played === 0
      ? 'Kampaň zatím nezačala. Každý akt jde hrát i samostatně — ale teprve v řadě za sebou uvidíte, jak rozhodnutí shora stékají dolů.'
      : `Odehráno ${played} ze 3 aktů. Výsledovka se odemkne po dokončení všech tří.`}</p>`;
    return;
  }

  const shareCode = encodeShare(st);
  const shareUrl = `${location.origin}${location.pathname}?k=${shareCode}`;
  host.innerHTML = `
    <div class="hra-summary-grid">
      <div class="hra-sum-block">
        <h3 class="hra-sum-h">Co jste podepsali</h3>
        <p class="hra-sum-body">${m.deals} z ${m.segmentsTotal} segmentů podepsalo${m.protests ? `, ${m.protests}× protest` : ''}.
        ${m.deficit ? `Vyhláška je ${czNum(m.cost - m.envelope)} mld nad obálkou — deficit doženete jinde.` : `Rezerva ${czNum(m.balance)} mld zůstala.`}
        Lůžkový blok: ${czNum(m.luzkovaShareBefore)} → ${czNum(m.luzkovaShareAfter)} % úhrad.</p>
      </div>
      <div class="hra-sum-block">
        <h3 class="hra-sum-h">Jak dopadla nemocnice</h3>
        <p class="hra-sum-body">${Object.entries(r.tones).map(([ax, t]) => `${AXIS_LABELS[ax]}: <strong class="hra-tone-${t}">${TONE_LABEL[t]}</strong>`).join(' · ')}.
        ${r.reactions.length ? `Reakce roku: ${r.reactions.map(x => escapeHtml(x.label)).join(', ')}.` : 'Rok bez otřesů.'}</p>
      </div>
      <div class="hra-sum-block">
        <h3 class="hra-sum-h">Jak to prožil pacient</h3>
        <p class="hra-sum-body">${escapeHtml(p.persona.label)} (${escapeHtml(p.persona.sublabel)}):
        ${czNum(p.outcome.weeks, 0)} týdnů v systému, ${czNum(p.outcome.oop_kc, 0)} Kč z kapsy —
        ve vaší nemocnici s ${WAIT_LABEL[p.outcome.waiting]}.</p>
      </div>
    </div>
    <p class="hra-sum-moral">Jeden systém. Tři židle. Každé z těch čísel jste způsobili vy — jen pokaždé z jiné židle.</p>
    ${SHARED ? `
      <div class="hra-share">
        <p class="hra-note">Prohlížíte sdílenou kampaň. Chcete ji rozehrát dál jako svou?</p>
        <button type="button" class="hra-btn" id="hraAdopt">Převzít kampaň</button>
        <a class="hra-btn hra-btn-sec" href="hra.html">Hrát vlastní od začátku</a>
      </div>` : `
      <div class="hra-share">
        <label class="hra-share-lbl" for="hraShareUrl">Sdílejte svou kampaň (odkaz nese jen herní volby):</label>
        <div class="hra-share-row">
          <input class="hra-share-url" id="hraShareUrl" type="text" readonly value="${escapeHtml(shareUrl)}">
          <button type="button" class="hra-btn" id="hraCopy">Kopírovat</button>
        </div>
        <button type="button" class="hra-btn hra-btn-sec" id="hraReset">Smazat kampaň a hrát znovu</button>
      </div>`}`;

  document.getElementById('hraCopy')?.addEventListener('click', async () => {
    const input = document.getElementById('hraShareUrl');
    try {
      await navigator.clipboard.writeText(input.value);
      document.getElementById('hraCopy').textContent = 'Zkopírováno ✓';
    } catch {
      input.select(); // fallback: aspoň označit k ručnímu kopírování
    }
  });
  document.getElementById('hraReset')?.addEventListener('click', () => {
    if (confirm('Opravdu smazat celou kampaň (všechny tři akty)?')) {
      resetCampaign();
      renderActs();
      renderSummary();
    }
  });
  document.getElementById('hraAdopt')?.addEventListener('click', () => {
    // Sdílený kód nese jen VSTUPY — odvozené verdikty při převzetí rovnou
    // dopočítáme enginy, aby stepper i hub ukázaly správný stav (dokončeno)
    // bez nutnosti akty znovu prohrát.
    resetCampaign();
    if (SHARED.ministr) saveAct('ministr', SHARED.ministr);
    if (SHARED.reditel) {
      const r = reditelSummary(SHARED);
      saveAct('reditel', {
        ...SHARED.reditel,
        ...(r ? { verdict: { axes: r.axes, tones: r.tones, waiting: r.waiting, complete: r.complete } } : {}),
      });
    }
    if (SHARED.pacient) {
      const p = pacientSummary(SHARED);
      saveAct('pacient', {
        ...SHARED.pacient,
        ...(p ? { outcome: { weeks: p.outcome.weeks, oop_kc: p.outcome.oop_kc, complete: p.outcome.complete, waiting: p.outcome.waiting } } : {}),
      });
    }
    location.href = 'hra.html';
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
  renderModuleNav('explainers');
  renderMastheadDate();
  renderRelatedTools('tri-zidle');

  const host = document.getElementById('hraActs');
  if (!host) return;
  try {
    [VYHLASKA, REDITEL, PRIBEH] = await Promise.all([
      fetch('data/vyhlaska-hra.json').then(r => r.json()),
      fetch('data/reditel-hra.json').then(r => r.json()),
      fetch('data/pribeh-pacienta.json').then(r => r.json()),
    ]);

    const code = new URLSearchParams(location.search).get('k');
    if (code) {
      SHARED = decodeShare(code);
      const banner = document.getElementById('hraSharedBanner');
      if (banner) {
        banner.hidden = !SHARED;
        if (!SHARED) {
          banner.hidden = false;
          banner.textContent = 'Sdílený odkaz se nepodařilo přečíst — ukazujeme vaši vlastní kampaň.';
        }
      }
    }

    renderActs();
    renderSummary();
  } catch (err) {
    host.innerHTML = renderErrorState('Kampaň se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
