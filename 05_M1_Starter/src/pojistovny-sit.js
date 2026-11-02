// Srovnávač pojišťoven — síť smluvních odborností, PROTOTYP (balíček P1.6 na stránce
// pojistovny-kmen.html; data a metoda docs/pojistovny-sit.md § 1–5, P3.5).
//
// Samostatný modul pro kontejner #zpSit. Líně (až u viewportu) načte
// data/pojistovny-sit.json a vyrenderuje:
//   (a) heatmapu 7 ZP × 7 odborností: podíl evidovaných míst NRPZS v ČR, na nichž
//       má pojišťovna smluvní IČZ (%), buňky ve 4 stupních podle kvartilů všech
//       49 hodnot + číslo; bez řazení (pořadí velkých ZP z těchto čísel nevyvozovat),
//   (b) <details> s tabulkou kraj × ZP pro odbornost vybranou v <select>.
// Povinné věty o omezení metody a o pobočkách jsou statické v HTML nad #zpSit
// (text převzatý z docs/pojistovny-sit.md), modul je nepřepisuje.
//
// Čisté funkce (testované bez DOM): sitSoucty, kvartilyHranice, levelByHranice,
// buildSitHeatmap, sitKrajRows, sitKrajTableHtml, renderSit.

import { escapeHtml, formatNumberCz } from './page-shared.js';
import { heatmap, isNum } from './zp-viz.js';
import { ZP, ZP_BY_KOD } from './zp-palette.js';
import { initZpInteract } from './zp-interact.js';
import { loadJson } from './pojistovny-shared.js';

const esc = escapeHtml;

export const DATA_URL = 'data/pojistovny-sit.json';
export const DOC_URL = 'https://github.com/veritasderman-rgb/hspa/blob/main/docs/pojistovny-sit.md';

/** Krátké popisky sloupců (kódy číselníku VZP 770, ověřené v docs/pojistovny-sit.md tab. 1). */
export const ODB_KRATKE = {
  '001': 'Praktik pro dospělé',
  '002': 'Praktik pro děti',
  '014': 'Zubní lékař',
  207: 'Alergologie',
  305: 'Psychiatrie',
  404: 'Dermato\u00advenerologie',
  603: 'Gynekologie',
};

const pctText = (v) => (isNum(v) ? `${formatNumberCz(v, { minDecimals: 0, maxDecimals: 0 })} %` : '—');
const zpKody = (sit) => {
  const inData = Object.keys(sit?.matice || {});
  const ordered = ZP.map((z) => z.kod).filter((k) => inData.includes(k));
  return [...ordered, ...inData.filter((k) => !ordered.includes(k))];
};

/**
 * Součty za ČR: pro každou ZP a odbornost počet míst se smlouvou, všech
 * evidovaných míst (celkem_cr) a podíl v %. Chybějící jmenovatel = null.
 * @returns {Record<string, Record<string, {smluvni:number, celkem:number, pct:number|null}>>}
 */
export function sitSoucty(sit) {
  const kraje = (sit?.kraje || []).map((k) => k.kod);
  const out = {};
  for (const kod of zpKody(sit)) {
    out[kod] = {};
    for (const o of sit?.odbornosti || []) {
      let smluvni = 0;
      let celkem = 0;
      for (const k of kraje) {
        const n = sit.matice?.[kod]?.[o.kod]?.[k];
        const c = sit.celkem_cr?.[o.kod]?.[k];
        if (isNum(n)) smluvni += n;
        if (isNum(c)) celkem += c;
      }
      out[kod][o.kod] = { smluvni, celkem, pct: celkem > 0 ? (100 * smluvni) / celkem : null };
    }
  }
  return out;
}

/** Hranice kvartilů (25., 50., 75. percentil, lineární interpolace) — null/NaN se ignorují. */
export function kvartilyHranice(values) {
  const v = (values || []).filter(isNum).sort((a, b) => a - b);
  if (!v.length) return null;
  const q = (p) => {
    const pos = (v.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return v[lo] + (v[hi] - v[lo]) * (pos - lo);
  };
  return [q(0.25), q(0.5), q(0.75)];
}

/** Stupeň 0–3 podle hranic kvartilů (hodnota na hranici patří do nižšího stupně). */
export function levelByHranice(v, h) {
  if (!isNum(v) || !Array.isArray(h)) return null;
  if (v <= h[0]) return 0;
  if (v <= h[1]) return 1;
  if (v <= h[2]) return 2;
  return 3;
}

/** Vstupy pro heatmap() ze zp-viz.js + popisky stupňů s rozsahy. */
export function buildSitHeatmap(sit) {
  const soucty = sitSoucty(sit);
  const cols = (sit?.odbornosti || []).map((o) => ({ key: o.kod, label: ODB_KRATKE[o.kod] || o.nazev }));
  const rows = zpKody(sit).map((kod) => ({ kod, label: ZP_BY_KOD[kod]?.zkratka || kod }));
  const all = rows.flatMap((r) => cols.map((c) => soucty[r.kod]?.[c.key]?.pct));
  const h = kvartilyHranice(all);
  const r0 = (x) => formatNumberCz(x, { minDecimals: 0, maxDecimals: 0 });
  const levels = h
    ? [`do ${r0(h[0])} %`, `${r0(h[0])}–${r0(h[1])} %`, `${r0(h[1])}–${r0(h[2])} %`, `nad ${r0(h[2])} %`]
    : ['1. kvartil', '2. kvartil', '3. kvartil', '4. kvartil'];
  const stav = sit?.ref_datum ? `stav ${fmtDate(sit.ref_datum)}` : '';
  const cell = (r, c) => {
    const s = soucty[r.kod]?.[c.key];
    const lvl = levelByHranice(s?.pct, h);
    if (lvl == null) return null;
    const odb = (sit.odbornosti || []).find((o) => o.kod === c.key)?.nazev || c.label;
    return {
      level: lvl,
      text: pctText(s.pct),
      tip: `${odb}: ${formatNumberCz(s.smluvni)} z ${formatNumberCz(s.celkem)} evidovaných míst · horní odhad${stav ? `, ${stav}` : ''}`,
    };
  };
  return { rows, cols, cell, levels, hranice: h, soucty };
}

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : String(iso || '');
}

/** Řádky tabulky kraj × ZP pro jednu odbornost. */
export function sitKrajRows(sit, odb) {
  const kody = zpKody(sit);
  return (sit?.kraje || []).map((k) => {
    const celkem = sit.celkem_cr?.[odb]?.[k.kod];
    const zp = Object.fromEntries(kody.map((kod) => {
      const n = sit.matice?.[kod]?.[odb]?.[k.kod];
      const nn = isNum(n) ? n : 0;
      return [kod, { n: nn, pct: isNum(celkem) && celkem > 0 ? (100 * nn) / celkem : null }];
    }));
    return { kod: k.kod, nazev: k.nazev, celkem: isNum(celkem) ? celkem : null, zp };
  });
}

export function sitKrajTableHtml(sit, odb) {
  const kody = zpKody(sit);
  const o = (sit?.odbornosti || []).find((x) => x.kod === odb);
  const rows = sitKrajRows(sit, odb);
  const head = `<tr><th scope="col">Kraj</th><th scope="col">Evidovaná místa</th>${kody.map((k) => `<th scope="col">${esc(ZP_BY_KOD[k]?.zkratka || k)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr><th scope="row">${esc(r.nazev)}</th><td>${r.celkem == null ? '—' : formatNumberCz(r.celkem)}</td>`
    + kody.map((k) => {
      const c = r.zp[k];
      return `<td>${formatNumberCz(c.n)}<small>${esc(pctText(c.pct))}</small></td>`;
    }).join('') + '</tr>').join('');
  const label = `Síť odborností po krajích: ${o?.nazev || odb} (tabulka, posuvná)`;
  return `<div class="zpc-tbl zpc-sit-tbl" role="region" tabindex="0" aria-label="${esc(label)}"><table>`
    + `<caption class="sr-only">${esc(`${o?.nazev || odb}: místa se smluvním IČZ pojišťovny a podíl na evidovaných místech kraje`)}</caption>`
    + `<thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** Celý obsah #zpSit. */
export function renderSit(sit, odb) {
  if (!sit || !sit.matice || !Array.isArray(sit.odbornosti) || !sit.odbornosti.length) {
    return '<p class="zpc-note">Data o síti odborností se nepodařilo načíst.</p>';
  }
  const hm = buildSitHeatmap(sit);
  const stav = sit.ref_datum ? fmtDate(sit.ref_datum) : String(sit.rok || '');
  const vyber = odb && sit.odbornosti.some((x) => x.kod === odb) ? odb : sit.odbornosti[0].kod;
  const fig = heatmap(hm.rows, hm.cols, hm.cell, {
    title: 'Podíl evidovaných míst v ČR, na nichž má pojišťovna smluvní zařízení',
    sub: `Procento míst poskytování (NRPZS) dané odbornosti; odstín = kvartil všech ${hm.rows.length * hm.cols.length} hodnot. Stav ${stav}.`,
    levels: hm.levels,
    sortable: false,
    rowHeader: 'Pojišťovna',
    source: `ÚZIS · číselník IČZ (NR-04-64) a NRPZS (NR-01-06), prototyp · ${sit.rok}`,
  });
  const options = sit.odbornosti.map((x) => `<option value="${esc(x.kod)}"${x.kod === vyber ? ' selected' : ''}>${esc(x.nazev)} (${esc(x.kod)})</option>`).join('');
  const metoda = (sit.metoda || []).map((m) => `<li>${esc(m)}</li>`).join('');
  return fig
    + '<details class="zpc-acc zpc-sit-acc"><summary>Kraj po kraji pro vybranou odbornost</summary><div class="zpc-acc-body">'
    + `<label class="zpc-sit-lbl">Odbornost <select class="zpc-sit-select" data-sit-odb>${options}</select></label>`
    + `<div data-sit-tbl>${sitKrajTableHtml(sit, vyber)}</div>`
    + '<p class="zpc-cap">Číslo = místa poskytování dané odbornosti na adrese smluvního zařízení pojišťovny; pod ním podíl na všech evidovaných místech kraje.</p>'
    + `${metoda ? `<p class="zpc-note"><b>Metoda.</b></p><ul>${metoda}</ul>` : ''}`
    + `<p class="zpc-note">Zdroje, limity a návrh indikátorů: <a href="${esc(DOC_URL)}" rel="noopener">docs/pojistovny-sit.md</a>.</p>`
    + '</div></details>';
}

// ---------------------------------------------------------------- DOM

export function bootSit(doc = globalThis.document, win = globalThis.window) {
  const host = doc && doc.getElementById('zpSit');
  if (!host || host.dataset.zpSitInit === '1') return;
  host.dataset.zpSitInit = '1';
  host.innerHTML = '<p class="zpc-note" role="status">Načítám síť smluvních odborností…</p>';
  let started = false;
  const load = async () => {
    if (started) return;
    started = true;
    const sit = await loadJson(DATA_URL);
    host.innerHTML = renderSit(sit);
    try { initZpInteract(doc); } catch (_) { /* interakce jsou vylepšení */ }
  };
  host.addEventListener('change', (e) => {
    const sel = e.target && e.target.matches && e.target.matches('select[data-sit-odb]') ? e.target : null;
    if (!sel) return;
    loadJson(DATA_URL).then((sit) => {
      const box = host.querySelector('[data-sit-tbl]');
      if (box && sit) box.innerHTML = sitKrajTableHtml(sit, sel.value);
    });
  });
  if (win && typeof win.IntersectionObserver === 'function') {
    const io = new win.IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: '600px 0px' });
    io.observe(host);
  } else {
    load();
  }
}

if (typeof document !== 'undefined' && document.getElementById('zpSit')) {
  const boot = () => { bootSit(document, window); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
