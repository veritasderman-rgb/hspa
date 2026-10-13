// Stránka Poplatky u lékaře (poplatky.html).
//
// Renderovací vrstva: kontrola poplatku (rozhodovací stromy z data/poplatky.json),
// generátor stížnosti a podnětu, otevírání plného znění podle kotvy.
// Logika je v src/poplatky-engine.js. Nic se neodesílá ani neukládá —
// vyplněný formulář žije jen v tomto okně.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter, renderRelatedTools, escapeHtml, renderErrorState } from './page-shared.js';
import { findSituation, walk, validateData, buildLetter, VERDICT_LABELS } from './poplatky-engine.js';

const state = { data: null, sit: null, answers: [] };

// ── kontrola poplatku ─────────────────────────────────────────────────────

function renderPick() {
  const host = document.getElementById('popPick');
  if (!host) return;
  host.innerHTML = state.data.situace.map((s) => `
    <button type="button" class="pop-pick" data-sit="${escapeHtml(s.id)}" aria-pressed="false">
      <span class="pop-pick-l">${escapeHtml(s.label)}</span>
      <span class="pop-pick-h">${escapeHtml(s.hint ?? '')}</span>
    </button>`).join('');
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sit]');
    if (!btn) return;
    selectSituation(btn.dataset.sit, { focus: true });
  });
}

function selectSituation(id, { focus = false } = {}) {
  const sit = findSituation(state.data, id);
  if (!sit) return;
  state.sit = sit;
  state.answers = [];
  document.querySelectorAll('#popPick .pop-pick').forEach((b) => {
    const on = b.dataset.sit === id;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  renderPanel(focus);
}

function renderTrail(trail) {
  if (!trail.length) return '';
  return `<ol class="pop-trail">${trail.map((t) => `
    <li><span class="pop-trail-q">${escapeHtml(t.otazka)}</span> <span class="pop-trail-a">${escapeHtml(t.odpoved)}</span></li>`).join('')}</ol>`;
}

function renderCesty(keys) {
  if (!keys?.length) return '';
  const items = keys.map((k) => state.data.cesty[k]).filter(Boolean);
  return `
    <div class="pop-verdict-next">
      <p class="pop-verdict-next-h">Co můžete udělat</p>
      <ol class="pop-next-list">${items.map((c) => `
        <li><strong>${escapeHtml(c.title)}.</strong> ${escapeHtml(c.text)} <span class="pop-law">${escapeHtml(c.law)}</span></li>`).join('')}
      </ol>
    </div>`;
}

function renderPanel(focus = false) {
  const panel = document.getElementById('popPanel');
  if (!panel || !state.sit) return;
  const sit = state.sit;
  const step = walk(sit, state.answers);
  const kaz = sit.kazuistika
    ? `<a class="pop-panel-src" href="#zneni-k${sit.kazuistika}" data-open-doc>Kazuistika ${sit.kazuistika} v plném znění</a>`
    : '<a class="pop-panel-src" href="#zneni-ob" data-open-doc>Obecná část v plném znění</a>';
  const nav = `
    <div class="pop-panel-nav">
      ${state.answers.length ? '<button type="button" class="pop-btn pop-btn-ghost" data-act="back">← Zpět</button>' : ''}
      <button type="button" class="pop-btn pop-btn-ghost" data-act="reset">Začít znovu</button>
      ${kaz}
    </div>`;

  if (step.kind === 'question') {
    const help = step.node.pomoc ? `<p class="pop-q-help">${escapeHtml(state.data.pomoc[step.node.pomoc])}</p>` : '';
    panel.innerHTML = `
      <h3 class="pop-panel-h" tabindex="-1">${escapeHtml(sit.label)}</h3>
      ${renderTrail(step.trail)}
      <fieldset class="pop-q">
        <legend class="pop-q-t">${escapeHtml(step.node.otazka)}</legend>
        ${help}
        <div class="pop-q-opts">${step.node.moznosti.map((o, i) => `
          <button type="button" class="pop-opt" data-ans="${i}">${escapeHtml(o.label)}</button>`).join('')}
        </div>
      </fieldset>
      ${nav}`;
  } else {
    const v = step.verdict;
    const cta = v.typ === 'ne'
      ? `<p class="pop-verdict-cta"><a class="pop-btn" href="#generator" data-prefill="${escapeHtml(sit.id)}">Sestavit stížnost nebo podnět →</a></p>`
      : '';
    panel.innerHTML = `
      <h3 class="pop-panel-h" tabindex="-1">${escapeHtml(sit.label)}</h3>
      ${renderTrail(step.trail)}
      <div class="pop-verdict pop-verdict-${escapeHtml(v.typ)}">
        <p class="pop-verdict-tag">${escapeHtml(VERDICT_LABELS[v.typ] ?? '')}</p>
        <p class="pop-verdict-t">${escapeHtml(v.titulek)}</p>
        <p class="pop-verdict-d">${escapeHtml(v.text)}</p>
        <p class="pop-law">${escapeHtml(v.law)}</p>
      </div>
      ${renderCesty(v.cesty)}
      ${cta}
      ${nav}`;
  }
  if (focus) panel.querySelector('.pop-panel-h')?.focus({ preventScroll: false });
}

function wirePanel() {
  const panel = document.getElementById('popPanel');
  if (!panel) return;
  panel.addEventListener('click', (e) => {
    const ans = e.target.closest('[data-ans]');
    if (ans) {
      state.answers.push(Number(ans.dataset.ans));
      renderPanel(true);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act?.dataset.act === 'back') { state.answers.pop(); renderPanel(true); return; }
    if (act?.dataset.act === 'reset') { state.answers = []; renderPanel(true); return; }
    const pre = e.target.closest('[data-prefill]');
    if (pre) {
      const sel = document.getElementById('popGenSituace');
      if (sel) sel.value = pre.dataset.prefill;
      const typ = document.getElementById('popGenTyp');
      if (typ && pre.dataset.prefill === 'erecept') typ.value = 'sukl';
      updateLetter();
    }
  });
}

// ── generátor ─────────────────────────────────────────────────────────────

const FIELDS = ['typ', 'situace', 'adresat', 'jmeno', 'adresa', 'kontakt', 'pojistovna', 'za', 'poskytovatel', 'datum', 'castka', 'zaplaceno', 'popis', 'nesouhlas'];
const fieldId = (k) => `popGen${k.charAt(0).toUpperCase()}${k.slice(1)}`;

function readForm() {
  const f = {};
  for (const k of FIELDS) f[k] = document.getElementById(fieldId(k))?.value ?? '';
  return f;
}

function updateLetter() {
  const out = document.getElementById('popGenText');
  if (!out) return;
  out.value = buildLetter(state.data, readForm());
}

function setStatus(msg) {
  const el = document.getElementById('popGenStatus');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(setStatus.t);
  setStatus.t = setTimeout(() => { el.textContent = ''; }, 4000);
}

async function copyLetter() {
  const out = document.getElementById('popGenText');
  try {
    await navigator.clipboard.writeText(out.value);
    setStatus('Zkopírováno do schránky.');
  } catch {
    out.focus();
    out.select();
    setStatus('Text je označený — zkopírujte ho Ctrl+C.');
  }
}

function downloadLetter() {
  const text = document.getElementById('popGenText').value;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${readForm().typ === 'stiznost' ? 'stiznost' : 'podani'}-poplatek.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus('Soubor se stahuje.');
}

function printLetter() {
  let sheet = document.getElementById('popPrintSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'popPrintSheet';
    sheet.className = 'pop-print-sheet';
    document.body.appendChild(sheet);
  }
  sheet.textContent = document.getElementById('popGenText').value;
  document.body.classList.add('pop-printing');
  const done = () => { document.body.classList.remove('pop-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1000);
}

function initGenerator() {
  const sel = document.getElementById('popGenSituace');
  if (!sel) return;
  sel.innerHTML = state.data.situace.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.label)}</option>`).join('');
  sel.value = 'jine';
  const form = document.getElementById('popGenForm');
  form.addEventListener('input', updateLetter);
  form.addEventListener('change', updateLetter);
  form.addEventListener('submit', (e) => e.preventDefault());
  document.getElementById('popGenCopy')?.addEventListener('click', copyLetter);
  document.getElementById('popGenDownload')?.addEventListener('click', downloadLetter);
  document.getElementById('popGenPrint')?.addEventListener('click', printLetter);
  updateLetter();
}

// ── plné znění ────────────────────────────────────────────────────────────

/** Otevře <details> plného znění, pokud kotva míří do něj nebo na něj. */
function openForHash(hash) {
  if (!hash || hash.length < 2) return;
  let target;
  try { target = document.querySelector(hash); } catch { return; }
  if (!target) return;
  const det = target.closest('details.pop-doc');
  if (det && !det.open) det.open = true;
  if (det) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}

function initFulltext() {
  const btn = document.getElementById('popOpenAll');
  const docs = () => [...document.querySelectorAll('details.pop-doc')];
  btn?.addEventListener('click', () => {
    const allOpen = docs().every((d) => d.open);
    docs().forEach((d) => { d.open = !allOpen; });
    btn.textContent = allOpen ? 'Rozbalit vše' : 'Sbalit vše';
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#zneni-"]');
    if (a) openForHash(a.getAttribute('href'));
  });
  window.addEventListener('hashchange', () => openForHash(location.hash));
  openForHash(location.hash);
}

// ── init ──────────────────────────────────────────────────────────────────

async function init() {
  renderModuleNav();
  renderMastheadDate();
  renderFooter();
  renderRelatedTools('poplatky');
  initFulltext();
  try {
    const res = await fetch('data/poplatky.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    const errors = validateData(state.data);
    if (errors.length) throw new Error(errors.join('; '));
  } catch (err) {
    const host = document.getElementById('popCheck');
    if (host) host.innerHTML = renderErrorState('Interaktivní kontrolu se nepodařilo načíst. Závěry najdete níže v příkladech a v plném znění.', err);
    return;
  }
  renderPick();
  wirePanel();
  initGenerator();
  const params = new URLSearchParams(location.search);
  if (params.get('situace')) selectSituation(params.get('situace'));
}

init();
