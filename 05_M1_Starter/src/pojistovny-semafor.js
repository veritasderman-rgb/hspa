// Srovnávač pojišťoven — UI semaforu (balíček P4.1, PLAN-SROVNAVAC-POJISTOVEN.md § 2.4, § 4;
// docs/metodika-srovnavac-pojistoven.md § 3–4).
//
// Samostatný modul pro kontejner #zpSemafor (modul 5). Načte data/pojistovny.json
// (semafor = pojistovny[].semafor[oblast], changelog[]), vyrenderuje tabulku stavů
// 7 × 6, pod ní rozbalovací „Stanoviska pojišťoven (právo na odpověď)“ a „Změny (changelog)“.
//
// Pravidla zobrazení:
//  - stav je vždy ikona + text, nikdy jen barva (WCAG 1.4.1): ✓ doloženo, ◐ deklarováno,
//    ✕ nedoloženo, ⊘ neodpověděla, ○ zatím nehodnoceno (null),
//  - null je výchozí stav a vypadá záměrně prázdně (věta nad tabulkou, šedé buňky),
//  - zdůvodnění, zdroj a rok jsou v data-tip buňky (tooltip dodává zp-interact.js),
//  - stanovisko pojišťovny (volitelné pole stanovisko_pojistovny) se cituje doslova.
//
// Čisté funkce (testované bez DOM): semaforCell, semaforTip, semaforSummary, stanoviska,
// changelogSorted, renderSemafor. DOM část je dole.

import { escapeHtml } from './page-shared.js';
import { zpColor } from './zp-palette.js';
import { initZpInteract } from './zp-interact.js';
import { loadJson } from './pojistovny-shared.js';

export const DATA_URL = 'data/pojistovny.json';
export const EMPTY_SENTENCE = 'První verdikty vzniknou po kole 1 a právu na odpověď.';
export const NO_STATEMENT = 'Žádné stanovisko zatím nebylo doručeno.';

const esc = escapeHtml;

/** Ikona a tón stavu. Tón null = šedá (zatím nehodnoceno). */
export const STAV_META = {
  dolozeno: { icon: '✓', tone: 'good', label: 'doloženo daty' },
  deklarovano: { icon: '◐', tone: 'warn', label: 'deklarováno, nedoloženo' },
  nedolozeno: { icon: '✕', tone: 'bad', label: 'nedoloženo' },
  neodpovedela: { icon: '⊘', tone: 'neutral', label: 'neodpověděla / mimo lhůtu' },
};
export const NULL_META = { icon: '○', tone: 'none', label: 'zatím nehodnoceno' };

/**
 * Ikony stavů jako inline SVG (16 × 16, tah currentColor). Textové znaky ◐ ⊘ ○ mají v různých
 * fontech různou velikost a některé systémy je vůbec nemají; SVG vypadá všude stejně.
 * Znak ze STAV_META.icon zůstává v data-icon (tisk, testy, textová alternativa).
 */
const SVG_OPEN = '<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">';
export const ICON_SVG = {
  dolozeno: `${SVG_OPEN}<polyline points="3 8.5 6.5 12 13 4.5"/></svg>`,
  deklarovano: `${SVG_OPEN}<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none"/></svg>`,
  nedolozeno: `${SVG_OPEN}<line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>`,
  neodpovedela: `${SVG_OPEN}<circle cx="8" cy="8" r="5.5"/><line x1="4.2" y1="11.8" x2="11.8" y2="4.2"/></svg>`,
  null: `${SVG_OPEN}<circle cx="8" cy="8" r="5.5" stroke-dasharray="2 2.4"/></svg>`,
};

/** Ikona stavu: <span class="zps-ic zps-tone-…" data-icon="✓"> + SVG (celé aria-hidden, text stavu je vedle). */
export function iconHtml(cell) {
  return `<span class="zps-ic zps-tone-${cell.tone}" data-icon="${esc(cell.icon)}" aria-hidden="true">${ICON_SVG[cell.key] || ICON_SVG.null}</span>`;
}

// ---------------------------------------------------------------------------
// Čisté funkce
// ---------------------------------------------------------------------------

/**
 * Popis buňky semaforu. `stavy` = data.stavy_semaforu (label přepisuje výchozí).
 * Neznámý nebo prázdný stav se chová jako null (zatím nehodnoceno).
 * @returns {{key:string, icon:string, label:string, tone:string, hodnoceno:boolean}}
 */
export function semaforCell(stav, stavy) {
  const meta = typeof stav === 'string' ? STAV_META[stav] : null;
  if (!meta) return { key: 'null', icon: NULL_META.icon, label: NULL_META.label, tone: NULL_META.tone, hodnoceno: false };
  const fromData = stavy && stavy[stav] && typeof stavy[stav].label === 'string' && stavy[stav].label.trim();
  return { key: stav, icon: meta.icon, label: fromData || meta.label, tone: meta.tone, hodnoceno: true };
}

/** Text tooltipu buňky: zdůvodnění + zdroj + rok (nebo vysvětlení prázdného stavu). */
export function semaforTip(zkratka, oblastNazev, s, cell) {
  const head = `${zkratka} · ${oblastNazev}: ${cell.label}`;
  if (!cell.hodnoceno) return `${head}. ${EMPTY_SENTENCE}`;
  const parts = [head];
  if (s && s.zduvodneni) parts.push(String(s.zduvodneni));
  if (s && s.zdroj) parts.push(String(s.zdroj));
  if (s && s.rok != null) parts.push(String(s.rok));
  return parts.join(' · ');
}

/** Souhrn: kolik polí z kolika je hodnoceno a po stavech. */
export function semaforSummary(data) {
  const oblasti = Array.isArray(data && data.oblasti) ? data.oblasti : [];
  const zps = Array.isArray(data && data.pojistovny) ? data.pojistovny : [];
  const pocty = { dolozeno: 0, deklarovano: 0, nedolozeno: 0, neodpovedela: 0 };
  let hodnoceno = 0;
  for (const z of zps) {
    for (const o of oblasti) {
      const st = z && z.semafor && z.semafor[o.id] && z.semafor[o.id].stav;
      if (typeof st === 'string' && pocty[st] != null) { pocty[st] += 1; hodnoceno += 1; }
    }
  }
  return { total: zps.length * oblasti.length, hodnoceno, pocty };
}

/** Doručená stanoviska pojišťoven (volitelné pole stanovisko_pojistovny), v pořadí ZP × oblast. */
export function stanoviska(data) {
  const out = [];
  const oblasti = Array.isArray(data && data.oblasti) ? data.oblasti : [];
  for (const z of (data && data.pojistovny) || []) {
    for (const o of oblasti) {
      const t = z && z.semafor && z.semafor[o.id] && z.semafor[o.id].stanovisko_pojistovny;
      if (typeof t === 'string' && t.trim()) {
        out.push({ kod: z.kod, zkratka: z.zkratka, oblast: o.id, oblastNazev: o.nazev, text: t });
      }
    }
  }
  return out;
}

/** Changelog od nejnovějšího (stabilně pro stejné datum). */
export function changelogSorted(data) {
  const list = Array.isArray(data && data.changelog) ? data.changelog : [];
  return list
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c && typeof x.c === 'object')
    .sort((a, b) => String(b.c.datum).localeCompare(String(a.c.datum)) || a.i - b.i)
    .map((x) => x.c);
}

/** 2026-11-02 → „2. 11. 2026“; neplatné vstupy vrací beze změny. */
export function fmtDateCz(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : String(iso ?? '');
}

function shortText(s, n) {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

// ---------------------------------------------------------------------------
// HTML (čisté stringy)
// ---------------------------------------------------------------------------

function legendHtml(stavy) {
  const items = Object.keys(STAV_META).map((k) => {
    const c = semaforCell(k, stavy);
    return `<li>${iconHtml(c)}${esc(c.label)}</li>`;
  });
  items.push(`<li>${iconHtml(semaforCell(null, stavy))}${esc(NULL_META.label)}</li>`);
  return `<ul class="zps-legend" aria-label="Stavy semaforu">${items.join('')}</ul>`;
}

function cellHtml(z, o, stavy) {
  const s = z.semafor && z.semafor[o.id];
  const cell = semaforCell(s && s.stav, stavy);
  const tip = esc(semaforTip(z.zkratka, o.nazev, s, cell));
  const note = cell.hodnoceno && s && s.zduvodneni ? `<small>${esc(shortText(s.zduvodneni, 110))}</small>` : '';
  // Fokusovatelné jsou jen buňky s obsahem; prázdné mají tooltip při najetí, text čte čtečka z buňky.
  const focus = cell.hodnoceno ? ' tabindex="0"' : '';
  return `<td class="zps-cell zpv-mark" data-stav="${esc(cell.key)}" data-oblast="${esc(o.id)}" data-tip="${tip}"${focus}>`
    + `${iconHtml(cell)}<span class="zps-tx">${esc(cell.label)}</span>${note}</td>`;
}

export function tableHtml(data) {
  const oblasti = Array.isArray(data.oblasti) ? data.oblasti : [];
  const zps = Array.isArray(data.pojistovny) ? data.pojistovny : [];
  const stavy = data.stavy_semaforu || {};
  const head = `<tr><th scope="col">Pojišťovna</th>${oblasti.map((o) => `<th scope="col" title="${esc(o.popis || '')}">${esc(o.nazev)}</th>`).join('')}</tr>`;
  const body = zps.map((z) => `<tr data-zp="${esc(z.kod)}"><th scope="row"><span class="zpc-dot" style="--c:${esc(zpColor(z.kod))}" aria-hidden="true"></span>${esc(z.zkratka)}</th>`
    + `${oblasti.map((o) => cellHtml(z, o, stavy)).join('')}</tr>`).join('');
  return `<div class="zps-scroll" tabindex="0" role="region" aria-label="Semafor metodiky: 7 pojišťoven × 6 oblastí (tabulka, posuvná)">`
    + `<table class="zps-table"><caption class="zps-sr">Semafor metodiky: stav hodnocení každé pojišťovny v šesti oblastech</caption>`
    + `<thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

export function stanoviskaHtml(data) {
  const list = stanoviska(data);
  const body = list.length
    ? list.map((s) => `<blockquote class="zps-quote" data-zp="${esc(s.kod)}"><p>${esc(s.text)}</p>`
      + `<footer>Stanovisko ${esc(s.zkratka)} k oblasti „${esc(s.oblastNazev)}“, doslova</footer></blockquote>`).join('')
    : `<p class="zps-none">${NO_STATEMENT}</p>`;
  return `<details class="zpc-acc zps-acc zps-stanoviska"><summary>Stanoviska pojišťoven (právo na odpověď) · ${list.length}</summary>`
    + `<div class="zpc-acc-body">${body}`
    + `<p class="zpc-note">Pojišťovna dostane návrh verdiktu 10 dní před zveřejněním. Její stanovisko se zveřejní vedle verdiktu, doslova a bez úprav (metodika § 4.4).</p></div></details>`;
}

export function changelogHtml(data) {
  const list = changelogSorted(data);
  const body = list.length
    ? `<ol class="zps-log">${list.map((c) => `<li><time datetime="${esc(c.datum)}">${esc(fmtDateCz(c.datum))}</time>`
      + `<span class="zps-log-tx">${esc(c.zmena)}</span>${c.zdroj ? `<em class="zps-log-src">${esc(c.zdroj)}</em>` : ''}</li>`).join('')}</ol>`
    : '<p class="zps-none">Zatím žádná změna.</p>';
  return `<details class="zpc-acc zps-acc zps-changelog"><summary>Změny (changelog) · ${list.length}</summary>`
    + `<div class="zpc-acc-body">${body}`
    + `<p class="zpc-note">Každá změna skóre nebo dat má záznam s datem a důvodem (metodika § 4.7).</p></div></details>`;
}

/** Celý obsah #zpSemafor. */
export function renderSemafor(data) {
  if (!data || !Array.isArray(data.pojistovny) || !Array.isArray(data.oblasti)) {
    return '<div class="zps-root"><p class="zpc-note">Semafor se nepodařilo načíst.</p></div>';
  }
  const sum = semaforSummary(data);
  const intro = sum.hodnoceno === 0
    ? `<p class="zps-intro zps-intro--empty"><b>${EMPTY_SENTENCE}</b> Tabulka je zatím záměrně prázdná: žádná pojišťovna nebyla v žádné oblasti hodnocena.</p>`
    : `<p class="zps-intro">Hodnoceno ${sum.hodnoceno} z ${sum.total} polí. Každý verdikt nese zdůvodnění, zdroj a rok (najeďte na buňku).</p>`;
  return `<div class="zps-root">${intro}${legendHtml(data.stavy_semaforu)}${tableHtml(data)}${stanoviskaHtml(data)}${changelogHtml(data)}</div>`;
}

// ---------------------------------------------------------------------------
// DOM část
// ---------------------------------------------------------------------------

/**
 * Připojí semafor do #zpSemafor. Kontejner v HTML nese třídu zpc-tbl (scroll box) —
 * modul ji odebere, protože uvnitř má vlastní posuvnou oblast a rozbalovací bloky.
 * Kdyby obsah kontejneru přepsal jiný skript (starší vykreslení v pojistovny.js),
 * modul ho jednou vrátí (MutationObserver, nejvýš 3×).
 */
export async function bootSemafor(doc = globalThis.document) {
  const host = doc && doc.getElementById('zpSemafor');
  if (!host || host.dataset.zpsInit === '1') return;
  host.dataset.zpsInit = '1';
  const data = await loadJson(DATA_URL);
  const html = renderSemafor(data);

  host.classList.remove('zpc-tbl');
  host.classList.add('zps');
  ['role', 'tabindex', 'aria-label'].forEach((a) => host.removeAttribute(a));

  let repairs = 0;
  const paint = () => {
    host.innerHTML = html;
    try { initZpInteract(doc); } catch (_) { /* interakce jsou vylepšení */ }
  };
  paint();

  if (typeof MutationObserver === 'function') {
    const mo = new MutationObserver(() => {
      if (host.querySelector('.zps-root') || repairs >= 3) return;
      repairs += 1;
      paint();
    });
    mo.observe(host, { childList: true });
  }
}

if (typeof document !== 'undefined' && document.getElementById('zpSemafor')) {
  const boot = () => { bootSemafor(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
