// Srovnávač pojišťoven — registr dotazů a žádostí (balíček P4.1, PLAN-SROVNAVAC-POJISTOVEN.md § 4;
// docs/metodika-srovnavac-pojistoven.md § 4.2–4.4).
//
// Samostatný modul pro kontejner #zpZadosti (pod semaforem). Načte data/zadosti-106.json
// a vyrenderuje matici 7 pojišťoven × typy dotazů (coverageMatrix ze zp-viz.js) a v rozbalovacím
// bloku tabulku s lhůtami (dny do konce lhůty se počítají z odeslano + lhuta_dni).
// Odesílá výhradně člověk — modul jen zobrazuje stav, nic neodesílá.
//
// Stavy v datech (pole `stav` zapisuje člověk): pripravena | odeslana | odpovezeno | po-lhute | bez-odpovedi.
// zadostStav() je odvozuje: „odeslana“ po uplynutí lhůty se zobrazí jako „po lhůtě“.
//
// Čisté funkce (testované bez DOM): parseIso, addDays, daysBetween, lhutaInfo, zadostStav, zadostInfo,
// coverageKey, zadostiCell, zadostiSummary, leadText, matrixHtml, tableHtml, renderZadosti.

import { escapeHtml } from './page-shared.js';
import { coverageMatrix, NA_TEXT } from './zp-viz.js';
import { ZP, zpColor } from './zp-palette.js';
import { initZpInteract } from './zp-interact.js';
import { loadJson } from './pojistovny-shared.js';

export const DATA_URL = 'data/zadosti-106.json';

export const ZADOST_TYPY = {
  'nabidka-spoluprace': 'Nabídka spolupráce',
  'zadost-106': 'Žádost podle zákona 106',
  'pravo-na-odpoved': 'Právo na odpověď',
};
export const ZADOST_STAVY = {
  pripravena: 'připravena k odeslání',
  odeslana: 'odeslána, čeká na odpověď',
  odpovezeno: 'odpovězeno',
  'po-lhute': 'po lhůtě',
  'bez-odpovedi': 'bez odpovědi',
};
/** Popisky stavů v matici pokrytí (ikona + text). */
export const MATRIX_LABELS = { ano: 'odpovězeno', castecne: 'čeká na odpověď', ne: 'po lhůtě / bez odpovědi' };
export const NOT_SENT = 'neodesláno';

const esc = escapeHtml;
const DAY_MS = 86400000;

// ---------------------------------------------------------------------------
// Datumy a lhůty
// ---------------------------------------------------------------------------

/** ISO datum YYYY-MM-DD → ms (UTC půlnoc); neplatné → null. */
export function parseIso(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10) === iso ? ms : null;
}

/** Dnešní datum (místní čas) jako ISO řetězec. */
export function todayIso(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function addDays(iso, n) {
  const ms = parseIso(iso);
  if (ms == null || !Number.isFinite(n)) return null;
  return new Date(ms + n * DAY_MS).toISOString().slice(0, 10);
}

/** Počet dní od `fromIso` do `toIso` (kladné = to je později); neplatný vstup → null. */
export function daysBetween(fromIso, toIso) {
  const a = parseIso(fromIso);
  const b = parseIso(toIso);
  return a == null || b == null ? null : Math.round((b - a) / DAY_MS);
}

/** 1 den, 2 dny, 5 dní. */
export function daysText(n) {
  const a = Math.abs(n);
  return `${a} ${a === 1 ? 'den' : a >= 2 && a <= 4 ? 'dny' : 'dní'}`;
}

export function fmtDateCz(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : '';
}

/**
 * Lhůta žádosti: konec = odeslano + lhuta_dni, zbyva = konec − dnes (záporné = po lhůtě).
 * Bez odeslání (nebo s neplatnými daty) jsou hodnoty null.
 */
export function lhutaInfo(z, dnes) {
  const konec = z && z.odeslano ? addDays(z.odeslano, Number(z.lhuta_dni)) : null;
  return { konec, zbyva: konec ? daysBetween(dnes, konec) : null };
}

/**
 * Odvozený stav žádosti k datu `dnes`.
 * - doručená odpověď → odpovezeno,
 * - odeslana po uplynutí lhůty → po-lhute (zbývá < 0),
 * - ostatní stavy (pripravena, po-lhute, bez-odpovedi) beze změny; neznámý → pripravena.
 */
export function zadostStav(z, dnes) {
  if (!z || typeof z !== 'object') return 'pripravena';
  if (z.doruceno) return 'odpovezeno';
  const stav = ZADOST_STAVY[z.stav] ? z.stav : 'pripravena';
  if (stav === 'odeslana') {
    const { zbyva } = lhutaInfo(z, dnes);
    if (zbyva != null && zbyva < 0) return 'po-lhute';
  }
  return stav;
}

/** Stav + lhůta + věta o lhůtě pro tabulku a tooltip. */
export function zadostInfo(z, dnes) {
  const stav = zadostStav(z, dnes);
  const { konec, zbyva } = lhutaInfo(z, dnes);
  let text;
  if (stav === 'pripravena') {
    text = `lhůta ${daysText(Number(z && z.lhuta_dni) || 0)} začne běžet odesláním`;
  } else if (stav === 'odpovezeno') {
    const took = z.odeslano && z.doruceno ? daysBetween(z.odeslano, z.doruceno) : null;
    text = took == null ? 'odpovězeno' : `odpovězeno za ${daysText(took)}`;
  } else if (zbyva == null) {
    text = 'lhůta nelze určit';
  } else if (zbyva >= 0) {
    text = zbyva === 0 ? `lhůta končí dnes (${fmtDateCz(konec)})` : `zbývá ${daysText(zbyva)} (do ${fmtDateCz(konec)})`;
  } else {
    text = `po lhůtě o ${daysText(zbyva)} (skončila ${fmtDateCz(konec)})`;
  }
  return { stav, konec, zbyva, text };
}

// ---------------------------------------------------------------------------
// Matice pokrytí
// ---------------------------------------------------------------------------

/** Odvozený stav → klíč coverageMatrix (ano = odpovězeno, castecne = čeká, ne = po lhůtě / bez odpovědi, null = připravena). */
export function coverageKey(stav) {
  if (stav === 'odpovezeno') return 'ano';
  if (stav === 'odeslana') return 'castecne';
  if (stav === 'po-lhute' || stav === 'bez-odpovedi') return 'ne';
  return null;
}

/** Nejnovější záznam (nejvyšší kolo, pak nejpozdější odeslání) pro pojišťovnu a typ. */
export function latestZadost(zadosti, kod, typ) {
  const list = (Array.isArray(zadosti) ? zadosti : []).filter((z) => z && z.pojistovna_kod === kod && z.typ === typ);
  if (!list.length) return null;
  return list.reduce((best, z) => {
    if (!best) return z;
    if ((z.kolo || 0) !== (best.kolo || 0)) return (z.kolo || 0) > (best.kolo || 0) ? z : best;
    return String(z.odeslano || '') >= String(best.odeslano || '') ? z : best;
  }, null);
}

/** Buňka matice: {stav, tip} nebo null (neodesláno / žádný záznam). */
export function zadostiCell(zadosti, kod, typ, dnes) {
  const z = latestZadost(zadosti, kod, typ);
  if (!z) return null;
  const info = zadostInfo(z, dnes);
  const key = coverageKey(info.stav);
  const tip = `kolo ${z.kolo} · ${ZADOST_STAVY[info.stav]}${z.odeslano ? ` · odesláno ${fmtDateCz(z.odeslano)}` : ''} · ${info.text}`;
  return key ? { stav: key, tip } : null;
}

export function zadostiSummary(zadosti, dnes) {
  const counts = { pripravena: 0, odeslana: 0, odpovezeno: 0, 'po-lhute': 0, 'bez-odpovedi': 0 };
  const list = Array.isArray(zadosti) ? zadosti : [];
  for (const z of list) counts[zadostStav(z, dnes)] += 1;
  const kola = list.map((z) => Number(z && z.kolo)).filter(Number.isFinite);
  return { total: list.length, counts, maxKolo: kola.length ? Math.max(...kola) : null };
}

/** Úvodní věta nad maticí podle skutečného stavu registru. */
export function leadText(sum) {
  if (!sum.total) return 'Registr zatím neobsahuje žádný dotaz. Odesílá je člověk, ne AI (metodika § 4.3).';
  const c = sum.counts;
  const pieces = [];
  if (c.pripravena) pieces.push(`${c.pripravena} připraveno k odeslání`);
  if (c.odeslana) pieces.push(`${c.odeslana} čeká na odpověď`);
  if (c.odpovezeno) pieces.push(`${c.odpovezeno} odpovězeno`);
  if (c['po-lhute']) pieces.push(`${c['po-lhute']} po lhůtě`);
  if (c['bez-odpovedi']) pieces.push(`${c['bez-odpovedi']} bez odpovědi`);
  const sent = c.odeslana + c.odpovezeno + c['po-lhute'] + c['bez-odpovedi'];
  const tail = sent === 0
    ? ' Zatím nic neodešlo: dotazy odesílá člověk, ne AI (metodika § 4.3), a lhůta začne běžet dnem odeslání.'
    : ' Dotazy odesílá člověk, ne AI (metodika § 4.3); lhůta běží ode dne odeslání.';
  return `Kolo ${sum.maxKolo}: ${pieces.join(', ')}.${tail}`;
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

/** coverageMatrix pojmenuje prázdnou buňku „nedohledáno“; u registru žádostí znamená „neodesláno“. */
export function relabelNotSent(html) {
  return String(html)
    .split(`<span class="zpv-cov-tx">${NA_TEXT}</span>`).join(`<span class="zpv-cov-tx">${NOT_SENT}</span>`)
    .split(`</span>${NA_TEXT}</li>`).join(`</span>${NOT_SENT}</li>`);
}

export function matrixHtml(zadosti, dnes, maxKolo) {
  const rows = ZP.map((z) => ({ kod: z.kod, label: z.zkratka }));
  const cols = Object.keys(ZADOST_TYPY).map((k) => ({ key: k, label: ZADOST_TYPY[k] }));
  const html = coverageMatrix(rows, cols, (r, c) => zadostiCell(zadosti, r.kod, c.key, dnes), {
    title: 'Dotazy pojišťovnám podle typu',
    sub: maxKolo ? `Nejnovější záznam, kolo ${maxKolo}` : 'Nejnovější záznam',
    source: 'vlastní evidence žádostí',
    labels: MATRIX_LABELS,
    rowHeader: 'Pojišťovna',
  });
  return relabelNotSent(html);
}

function sortZadosti(zadosti) {
  const order = Object.keys(ZADOST_TYPY);
  const zpOrder = ZP.map((z) => z.kod);
  return zadosti.slice().sort((a, b) => (a.kolo - b.kolo)
    || (order.indexOf(a.typ) - order.indexOf(b.typ))
    || (zpOrder.indexOf(a.pojistovna_kod) - zpOrder.indexOf(b.pojistovna_kod)));
}

export function tableHtml(zadosti, dnes) {
  const zkr = Object.fromEntries(ZP.map((z) => [z.kod, z.zkratka]));
  const head = '<tr><th scope="col">Pojišťovna</th><th scope="col">Typ</th><th scope="col">Kolo</th><th scope="col">Odesláno</th>'
    + '<th scope="col">Lhůta (dnů)</th><th scope="col">Konec lhůty</th><th scope="col">Doručeno</th><th scope="col">Odpověď (soubor)</th><th scope="col">Stav</th></tr>';
  const body = sortZadosti(zadosti).map((z) => {
    const info = zadostInfo(z, dnes);
    return `<tr data-zp="${esc(z.pojistovna_kod)}" data-stav="${esc(info.stav)}">`
      + `<th scope="row"><span class="zpc-dot" style="--c:${esc(zpColor(z.pojistovna_kod))}" aria-hidden="true"></span>${esc(zkr[z.pojistovna_kod] || z.pojistovna_kod)}</th>`
      + `<td>${esc(ZADOST_TYPY[z.typ] || z.typ)}</td><td>${esc(z.kolo)}</td>`
      + `<td>${z.odeslano ? esc(fmtDateCz(z.odeslano)) : '<span class="zpc-na">neodesláno</span>'}</td>`
      + `<td>${esc(z.lhuta_dni)}</td>`
      + `<td>${info.konec ? esc(fmtDateCz(info.konec)) : '<span class="zpc-na">—</span>'}</td>`
      + `<td>${z.doruceno ? esc(fmtDateCz(z.doruceno)) : '<span class="zpc-na">—</span>'}</td>`
      + `<td>${z.odpoved_soubor ? esc(z.odpoved_soubor) : '<span class="zpc-na">—</span>'}</td>`
      + `<td class="zpz-stav"><b>${esc(ZADOST_STAVY[info.stav])}</b><small>${esc(info.text)}</small></td></tr>`;
  }).join('');
  return `<div class="zpz-scroll" tabindex="0" role="region" aria-label="Evidence žádostí a lhůt (tabulka, posuvná)">`
    + `<table class="zpz-table"><caption class="zpz-sr">Evidence dotazů a žádostí pojišťovnám s lhůtami</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** Celý obsah #zpZadosti. */
export function renderZadosti(data, dnes = todayIso()) {
  const list = data && Array.isArray(data.zadosti) ? data.zadosti : null;
  if (!list) return '<div class="zpz-root"><p class="zpc-note">Registr žádostí se nepodařilo načíst.</p></div>';
  const sum = zadostiSummary(list, dnes);
  const c = sum.counts;
  const sent = list.length ? c.odeslana + c.odpovezeno + c['po-lhute'] + c['bez-odpovedi'] : 0;
  // Dokud nic neodešlo, stránka neukazuje matici „připraveno k odeslání“ (nic neříká);
  // jen jednu větu a sbalenou evidenci. Matice se objeví s prvním odeslaným dotazem.
  const lead = list.length && sent === 0
    ? `Zatím nebyl odeslán žádný dotaz; kolo ${sum.maxKolo ?? 1} se připravuje (${list.length} dotazů). Dotazy odesílá člověk, ne AI (metodika § 4.3); lhůta běží ode dne odeslání.`
    : leadText(sum);
  return '<div class="zpz-root">'
    + '<h3 class="section-title"><span>Dotazy a žádosti pojišťovnám</span></h3>'
    + `<p class="zpz-lead">${esc(lead)}</p>`
    + (sent > 0 ? matrixHtml(list, dnes, sum.maxKolo) : '')
    + `<details class="zpc-acc zpz-acc"><summary>Evidence žádostí a lhůt · ${list.length}</summary><div class="zpc-acc-body">${sent > 0 ? '' : matrixHtml(list, dnes, sum.maxKolo)}${tableHtml(list, dnes)}`
    + '<p class="zpc-note">Lhůta u žádosti podle zákona 106 je 15 dní od přijetí žádosti; u nabídky spolupráce a u návrhu verdiktu (právo na odpověď, 10 dní před zveřejněním) ji stanoví metodika. '
    + 'Registr pro jednoduchost počítá dny do konce lhůty od data odeslání. Plné znění odpovědí se zveřejňuje bez úprav (metodika § 4.2).</p></div></details>'
    + '</div>';
}

// ---------------------------------------------------------------------------
// DOM část
// ---------------------------------------------------------------------------

export async function bootZadosti(doc = globalThis.document) {
  const host = doc && doc.getElementById('zpZadosti');
  if (!host || host.dataset.zpzInit === '1') return;
  host.dataset.zpzInit = '1';
  const data = await loadJson(DATA_URL);
  host.classList.add('zpz');
  host.innerHTML = renderZadosti(data);
  try { initZpInteract(doc); } catch (_) { /* interakce jsou vylepšení */ }
}

if (typeof document !== 'undefined' && document.getElementById('zpZadosti')) {
  const boot = () => { bootZadosti(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
