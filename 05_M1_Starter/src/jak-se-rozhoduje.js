// Frontend logika stránky jak-se-rozhoduje.html — průvodce rozhodováním
// v českém zdravotnictví. Skládá: pět kolejí rozhodování (kurátorský
// data/rozhodovani.json), doložený případ (timeline), diagram aktérů
// (sankey z data/ppo-osoby.json) a úřední tempo (data/ppo-ukoly.json).

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';
import { KAT_LABELS } from './ppo.js';

/* ── čisté funkce (testovatelné) ─────────────────────────────────────── */

/** Data pro sankey aktérů: pro každý orgán z konfigurace spočítá členy
 *  podle kategorie afiliace. Vrací {kategorie:[{kat,n}], organy:[{label,url,
 *  n, toky:[{kat,n}]}]} — kategorie seřazené podle celkového počtu. */
export function sankeyData(osoby, organyCfg) {
  const organy = organyCfg.map(o => {
    const gids = new Set(o.gs ?? [o.g]);
    const toky = new Map();
    let n = 0;
    for (const p of osoby) {
      if (!p.clenstvi.some(c => gids.has(c.g))) continue;
      n++;
      const kat = p.kat ?? 'neuvedeno';
      toky.set(kat, (toky.get(kat) ?? 0) + 1);
    }
    return {
      label: o.label,
      url: o.g ? `pracovni-skupina.html?id=${o.g}` : 'pracovni-skupiny.html',
      n,
      toky: [...toky.entries()].map(([kat, cnt]) => ({ kat, n: cnt })),
    };
  });
  const celkem = new Map();
  for (const o of organy) for (const t of o.toky) celkem.set(t.kat, (celkem.get(t.kat) ?? 0) + t.n);
  const kategorie = [...celkem.entries()]
    .map(([kat, n]) => ({ kat, n }))
    .sort((a, b) => b.n - a.n || a.kat.localeCompare(b.kat));
  // drobné kategorie (pod 3 % celku) slij do „ostatní" — diagram zůstane čitelný
  const total = kategorie.reduce((s, k) => s + k.n, 0);
  const velke = kategorie.filter(k => k.n / total >= 0.03);
  const maleN = total - velke.reduce((s, k) => s + k.n, 0);
  if (maleN > 0) velke.push({ kat: '_ostatni', n: maleN });
  for (const o of organy) {
    const known = new Set(velke.map(k => k.kat));
    const male = o.toky.filter(t => !known.has(t.kat)).reduce((s, t) => s + t.n, 0);
    o.toky = o.toky.filter(t => known.has(t.kat));
    if (male > 0) o.toky.push({ kat: '_ostatni', n: male });
  }
  return { kategorie: velke, organy };
}

/** Statistika úředního tempa: dny od zadání k doloženému splnění.
 *  Vrací {n, median, p25, p75, buckets:[{od,do,n}]} (koše po 60 dnech, cap 2 roky). */
export function tempoStats(ukoly) {
  const dny = ukoly
    .filter(u => u.stav === 'splneno' && u.datum && u.sd)
    .map(u => Math.round((Date.parse(u.sd) - Date.parse(u.datum)) / 86400000))
    .filter(d => d >= 0)
    .sort((a, b) => a - b);
  if (!dny.length) return null;
  const q = p => dny[Math.min(dny.length - 1, Math.floor(dny.length * p))];
  const KOS = 60, MAX = 730;
  const buckets = [];
  for (let od = 0; od < MAX; od += KOS) {
    buckets.push({ od, do: od + KOS, n: dny.filter(d => d >= od && d < od + KOS).length });
  }
  buckets.push({ od: MAX, do: null, n: dny.filter(d => d >= MAX).length });
  return { n: dny.length, median: q(0.5), p25: q(0.25), p75: q(0.75), buckets };
}

/* ── render ──────────────────────────────────────────────────────────── */

const $ = id => document.getElementById(id);

function renderKoleje(koleje) {
  $('rozKoleje').innerHTML = koleje.map(k => `
    <article class="roz-kolej">
      <h3>${escapeHtml(k.nazev)}</h3>
      <p class="roz-otazka">${escapeHtml(k.otazka)}</p>
      <ol class="roz-kroky">${k.kroky.map(s => `
        <li>
          <span class="roz-role">${escapeHtml(s.role)}</span>
          <strong>${s.url ? `<a href="${escapeHtml(s.url)}">${escapeHtml(s.kdo)}</a>`
    : s.ext ? `<a href="${escapeHtml(s.ext)}" target="_blank" rel="noopener">${escapeHtml(s.kdo)} ↗</a>`
      : escapeHtml(s.kdo)}</strong>
          ${s.pozn ? `<span class="roz-pozn">${escapeHtml(s.pozn)}</span>` : ''}
        </li>`).join('')}
      </ol>
    </article>`).join('');
}

function renderPripad(p) {
  $('rozPripadTitul').textContent = p.titul;
  $('rozPripadUvod').textContent = p.uvod;
  const fmt = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : d;
  };
  $('rozPripad').innerHTML = p.kroky.map(k => `
    <li class="roz-p-krok roz-p-${k.typ}">
      <span class="roz-p-datum">${escapeHtml(fmt(k.datum))}</span>
      <p>${escapeHtml(k.co)}${k.url ? ` <a href="${escapeHtml(k.url)}" target="_blank" rel="noopener">částka ↗</a>` : ''}</p>
    </li>`).join('');
  $('rozPripadPata').innerHTML = `Každý krok je doložený v zápisech —
    <a href="pracovni-skupina.html?id=${p.g}">profil komise s časovou osou úkolů</a>.`;
}

function renderSankey(data) {
  const W = 960, ROWH = 34, GAP = 10, COLW = 240, MID = W - 2 * COLW;
  const total = data.kategorie.reduce((s, k) => s + k.n, 0);
  const scale = n => Math.max(2, (n / total) * (data.kategorie.length * ROWH * 0.72));
  const label = k => (k === '_ostatni' ? 'ostatní' : (KAT_LABELS[k] ?? k));

  // levé uzly (kategorie) a pravé uzly (orgány) — pozice odshora
  let y = 8;
  const left = data.kategorie.map(k => {
    const h = scale(k.n);
    const node = { ...k, y, h };
    y += h + GAP;
    return node;
  });
  const Hl = y;
  y = 8;
  const right = data.organy.map(o => {
    const h = Math.max(2, o.toky.reduce((s, t) => s + scale(t.n) * 0.92, 0));
    const node = { ...o, y, h };
    y += h + GAP + 6;
    return node;
  });
  const H = Math.max(Hl, y) + 6;

  const leftOff = new Map(left.map(l => [l.kat, l.y]));
  const rightOff = new Map(right.map((r, i) => [i, r.y]));
  const ribbons = [];
  right.forEach((o, oi) => {
    for (const t of o.toky) {
      const h = scale(t.n) * 0.92;
      const y0 = leftOff.get(t.kat);
      const y1 = rightOff.get(oi);
      if (y0 == null) continue;
      leftOff.set(t.kat, y0 + h);
      rightOff.set(oi, y1 + h);
      const x0 = COLW, x1 = W - COLW;
      const c = (x0 + x1) / 2;
      ribbons.push(`<path class="roz-s-tok" d="M${x0},${(y0 + h / 2).toFixed(1)} C${c},${(y0 + h / 2).toFixed(1)} ${c},${(y1 + h / 2).toFixed(1)} ${x1},${(y1 + h / 2).toFixed(1)}" stroke-width="${h.toFixed(1)}"><title>${escapeHtml(label(t.kat))} → ${escapeHtml(o.label)}: ${t.n} osob</title></path>`);
    }
  });

  const leftHtml = left.map(l => `
    <rect class="roz-s-uzel" x="${COLW - 6}" y="${l.y}" width="6" height="${l.h.toFixed(1)}"/>
    <text class="roz-s-lab" x="${COLW - 12}" y="${(l.y + l.h / 2 + 3.5).toFixed(1)}" text-anchor="end">${escapeHtml(label(l.kat))} <tspan class="roz-s-n">${l.n}</tspan></text>`).join('');
  const rightHtml = right.map(r => `
    <rect class="roz-s-uzel" x="${W - COLW}" y="${r.y}" width="6" height="${r.h.toFixed(1)}"/>
    <a href="${escapeHtml(r.url)}"><text class="roz-s-lab" x="${W - COLW + 12}" y="${(r.y + r.h / 2 + 3.5).toFixed(1)}">${escapeHtml(r.label)} <tspan class="roz-s-n">${r.n}</tspan></text></a>`).join('');

  $('rozSankey').innerHTML = `<svg class="roz-sankey" viewBox="0 0 ${W} ${H.toFixed(0)}" role="img"
    aria-label="Kdo obsazuje rozhodovací orgány: kategorie aktérů a počty osob">${ribbons.join('')}${leftHtml}${rightHtml}</svg>`;
  void MID;
}

function renderTempo(t) {
  if (!t) return;
  $('sTempoMedian').textContent = String(t.median);
  $('sTempoN').textContent = String(t.n);
  $('sTempoIqr').textContent = `${t.p25}–${t.p75}`;
  const max = Math.max(...t.buckets.map(b => b.n), 1);
  $('rozTempo').innerHTML = t.buckets.map(b => `
    <div class="roz-t-bar" title="${b.do ? `${b.od}–${b.do} dní` : `${b.od}+ dní`}: ${b.n} úkolů">
      <i style="height:${Math.max(2, (b.n / max) * 100).toFixed(0)}%"></i>
      <span>${b.do ? b.od : `${b.od}+`}</span>
    </div>`).join('');
}

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  try {
    const [roz, osoby, ukoly] = await Promise.all([
      fetch('data/rozhodovani.json').then(r => { if (!r.ok) throw new Error(`rozhodovani HTTP ${r.status}`); return r.json(); }),
      fetch('data/ppo-osoby.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/ppo-ukoly.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    renderKoleje(roz.koleje);
    renderPripad(roz.pripad);
    if (osoby) renderSankey(sankeyData(osoby.osoby, roz.sankey.organy));
    if (ukoly) renderTempo(tempoStats(ukoly.ukoly));
  } catch (err) {
    console.error('jak-se-rozhoduje load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst data stránky.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('rozKoleje')) init();
