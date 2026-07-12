// Kvíz: Otestujte se z českého zdravotnictví (kviz.html).
// Otázky generuje src/kviz-engine.js ŽIVĚ z datového kontraktu
// (data/indicators.json) — správnou odpověď určují data, ne redakce.
// Vše běží v prohlížeči, nic se neukládá ani neodesílá.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderRelatedTools } from './page-shared.js';
import { buildQuestions, evaluateAnswer, scoreVerdict } from './kviz-engine.js';

const POCET_OTAZEK = 10;

renderModuleNav('home');
renderMastheadDate();
renderRelatedTools('kviz');

const app = document.getElementById('kvApp');
if (app) {
  fetch('data/indicators.json')
    .then((r) => r.json())
    .then((data) => start(data.indicators || []))
    .catch(() => {
      app.innerHTML = '<p class="kv-error">Data se nepodařilo načíst — zkuste stránku obnovit.</p>';
    });
}

function czNum(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

function start(indicators) {
  const otazky = buildQuestions(indicators, { count: POCET_OTAZEK });
  if (otazky.length < 3) {
    app.innerHTML = '<p class="kv-error">Nedostatek dat pro kvíz.</p>';
    return;
  }
  const stav = { i: 0, spravne: 0, otazky, indicators };
  renderOtazka(stav);
}

function renderOtazka(stav) {
  const q = stav.otazky[stav.i];
  app.textContent = '';

  const karta = el('div', 'kv-card');
  karta.appendChild(el('div', 'kv-progress', `Otázka ${stav.i + 1} / ${stav.otazky.length} · skóre ${stav.spravne}`));

  if (q.type === 'vs_oecd') {
    karta.appendChild(el('h2', 'kv-q', `${q.name}${q.year ? ` (${q.year})` : ''} — je Česko NAD, nebo POD průměrem OECD?`));
    karta.appendChild(el('p', 'kv-hint', `Měří se v jednotce: ${q.unit}.`));
    const btns = el('div', 'kv-answers');
    btns.appendChild(btn('Nad průměrem OECD', () => odpoved(stav, q, true)));
    btns.appendChild(btn('Pod průměrem OECD', () => odpoved(stav, q, false)));
    karta.appendChild(btns);
  } else if (q.type === 'direction') {
    karta.appendChild(el('h2', 'kv-q', `„${q.name}" — když tohle číslo ROSTE, je to pro zdraví dobrá zpráva?`));
    const btns = el('div', 'kv-answers');
    btns.appendChild(btn('Dobrá zpráva 👍', () => odpoved(stav, q, true)));
    btns.appendChild(btn('Špatná zpráva 👎', () => odpoved(stav, q, false)));
    karta.appendChild(btns);
  } else {
    karta.appendChild(el('h2', 'kv-q', `Tipněte si: ${q.name}${q.year ? ` (${q.year})` : ''}`));
    karta.appendChild(el('p', 'kv-hint', `Jednotka: ${q.unit} · tolerance ±${q.tolerancePct} %`));
    const wrap = el('div', 'kv-slider-wrap');
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'kv-slider';
    slider.min = String(q.min);
    slider.max = String(q.max);
    slider.step = String(q.step);
    slider.value = String(q.max / 2);
    const out = el('output', 'kv-slider-out', czNum(q.max / 2));
    slider.addEventListener('input', () => { out.textContent = czNum(Number(slider.value)); });
    wrap.appendChild(slider);
    wrap.appendChild(out);
    karta.appendChild(wrap);
    const potvrdit = btn('Tipuji ✓', () => odpoved(stav, q, Number(slider.value)));
    potvrdit.classList.add('kv-confirm');
    karta.appendChild(potvrdit);
  }

  app.appendChild(karta);
}

function odpoved(stav, q, answer) {
  const vysledek = evaluateAnswer(q, answer);
  if (vysledek.correct) stav.spravne += 1;

  const karta = app.querySelector('.kv-card');
  karta.querySelectorAll('button, input').forEach((b) => { b.disabled = true; });

  const fb = el('div', 'kv-feedback');
  fb.dataset.ok = vysledek.correct ? '1' : '0';
  fb.appendChild(el('div', 'kv-feedback-verdict', vysledek.correct ? '✓ Správně!' : '✗ Vedle'));

  let detail = `Skutečnost: ${czNum(q.value)} ${q.unit}${q.year ? ` (${q.year})` : ''}`;
  if (q.oecd != null) detail += ` · průměr OECD ${czNum(q.oecd)}`;
  if (q.type === 'guess' && Number.isFinite(vysledek.deltaPct)) {
    detail += ` · váš tip byl ${czNum(vysledek.deltaPct, 0)} % od skutečnosti`;
  }
  if (q.type === 'direction') {
    detail += q.correct
      ? ' · u tohoto ukazatele je růst žádoucí'
      : ' · u tohoto ukazatele je žádoucí pokles';
  }
  fb.appendChild(el('p', 'kv-feedback-detail', detail));

  const odkaz = document.createElement('a');
  odkaz.className = 'kv-feedback-link';
  odkaz.href = `indikator-${encodeURIComponent(q.id)}.html`;
  odkaz.textContent = 'Celý příběh čísla: karta indikátoru →';
  fb.appendChild(odkaz);

  const dalsi = btn(stav.i + 1 < stav.otazky.length ? 'Další otázka →' : 'Vyhodnotit kvíz →', () => {
    stav.i += 1;
    if (stav.i < stav.otazky.length) renderOtazka(stav);
    else renderVysledek(stav);
  });
  dalsi.classList.add('kv-next');
  dalsi.disabled = false;
  fb.appendChild(dalsi);

  karta.appendChild(fb);
  dalsi.focus();
}

function renderVysledek(stav) {
  const v = scoreVerdict(stav.spravne, stav.otazky.length);
  app.textContent = '';
  const karta = el('div', 'kv-card kv-result');
  karta.appendChild(el('div', 'kv-result-score', `${stav.spravne} / ${stav.otazky.length}`));
  karta.appendChild(el('h2', 'kv-result-title', v.title));
  karta.appendChild(el('p', 'kv-result-text', v.text));

  const share = btn('Sdílet výsledek', async () => {
    const text = `Kvíz HSPA Monitoru: ${stav.spravne}/${stav.otazky.length} — „${v.title}". Otestujte se z českého zdravotnictví:`;
    const url = 'https://skorezdravotnictvi.cz/kviz';
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        share.textContent = 'Zkopírováno ✓';
      }
    } catch { /* zrušeno uživatelem */ }
  });
  share.classList.add('kv-share');

  const znovu = btn('Nová sada otázek ↻', () => start(stav.indicators));
  znovu.classList.add('kv-restart');

  const akce = el('div', 'kv-answers');
  akce.appendChild(share);
  akce.appendChild(znovu);
  karta.appendChild(akce);

  karta.appendChild(el('p', 'kv-result-foot',
    'Otázky i odpovědi pocházejí z datového kontraktu HSPA Monitoru — stejná čísla, která měří celý portál.'));
  app.appendChild(karta);
}

// ── pomocníci ──
function el(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function btn(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'kv-btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
