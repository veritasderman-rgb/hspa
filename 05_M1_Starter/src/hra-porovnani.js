// Tři židle — Porovnání kampaní (porovnani.html): seminární režim.
// Každý hráč zkopíruje sdílecí odkaz (hra.html?k=…, nese jen herní vstupy),
// vyučující je vloží po řádcích — tabulka postaví vyhlášky, roky ředitele
// i cesty pacientů vedle sebe. Žádný backend: kódy se dekódují v prohlížeči
// a verdikty přepočítají enginy aktů (stejné jako na hubu). Odkaz na tuto
// stránku s ?k=A&k=B je sdílitelné porovnání. Čisté funkce
// (parseCampaignInput, buildComparison) jsou testované; DOM část je tenká.
// Viz PLAN-VYHLASKA-HRA.md § v3.

import './analytics.js';
import { trackEvent } from './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import { decodeShare, encodeShare, loadState } from './hra-stav.js';
import {
  verdict as vyhlaskaVerdict, trilemma, groupShare, yearsToShare, segmentWaitSignals,
  LUZKOVA_GROUP, TRILEMMA_AXES, TRILEMMA_LABELS,
} from './vyhlaska-engine.js';
import { verdict as reditelVerdict } from './reditel-engine.js';
import { journeyOutcome, waitingFromCampaign } from './pribeh-engine.js';

const CODE_IN_URL = /[?&]k=([A-Za-z0-9_-]+)/g;
const BARE_CODE = /^[A-Za-z0-9_-]{8,}$/;
const AXIS_LABELS = { hospodareni: 'Hospodaření', personal: 'Personál', pacienti: 'Pacienti' };
const TONE_LABEL = { good: 'v pořádku', mid: 'napjaté', bad: 'kritické' };
const WAIT_LABEL = { kratsi: 'kratší', stejne: 'běžné', delsi: 'delší' };

const round1 = (v) => Math.round(v * 10) / 10;

/** Kódy kampaní v jednom tokenu: z odkazu (všechna ?k=/&k=) nebo holý kód. */
export function extractCodes(token) {
  const fromUrl = [...String(token).matchAll(CODE_IN_URL)].map(m => m[1]);
  if (fromUrl.length) return fromUrl;
  return BARE_CODE.test(token) ? [token] : [];
}

/**
 * Jeden řádek = jedna kampaň: „[jméno] odkaz-nebo-kód". Odkaz je cokoli
 * s ?k=… (hra.html i porovnani.html — ten může nést víc kódů najednou), kód
 * je samotný base64url token. Jméno = zbytek řádku bez odkazu, zbavený
 * oddělovačů (: | — – - =); prázdné jméno → „Kampaň N".
 * @returns {Array<{label:string, code:string|null, raw:string}>}
 */
export function parseCampaignInput(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let codes = [];
    let used = null;
    for (const t of line.split(/\s+/)) {
      const c = extractCodes(t);
      if (c.length) { codes = c; used = t; break; }
    }
    const label = (used ? line.replace(used, '') : '')
      .replace(/^[\s:|—–\-=]+/, '').replace(/[\s:|—–\-=]+$/, '').trim();
    if (!codes.length) {
      out.push({ label: label || line, code: null, raw: line });
    } else if (codes.length === 1) {
      out.push({ label: label || `Kampaň ${out.length + 1}`, code: codes[0], raw: line });
    } else {
      codes.forEach((code, i) => out.push({ label: `${label || 'Kampaň'} ${i + 1}`, code, raw: line }));
    }
  }
  return out;
}

/**
 * Sestaví porovnání (čistá funkce): sloupce = kampaně, řádky = alokace
 * po segmentech, verdikt vyhlášky, trilema, rok ředitele, cesta pacienta.
 * Neplatný kód → sloupec invalid (řádky null). Hodnoty počítají enginy aktů.
 * @param {Array<{label, code}>} entries
 * @param {{VYHLASKA:object, REDITEL:object, PRIBEH:object}} docs
 */
export function buildComparison(entries, { VYHLASKA, REDITEL, PRIBEH }) {
  const scale = VYHLASKA.current_total_mld / VYHLASKA.segments.reduce((a, s) => a + s.baseline_mld, 0);
  const cols = entries.map((e) => {
    const st = e.code ? decodeShare(e.code) : null;
    if (!st) return { label: e.label, invalid: true, code: e.code };
    const alloc = st.ministr?.alloc || null;
    const m = alloc ? vyhlaskaVerdict(VYHLASKA.segments, alloc, VYHLASKA.envelope.amount_mld, scale) : null;
    const t = m ? trilemma(m) : null;
    const share10 = alloc ? groupShare(VYHLASKA.segments, alloc, LUZKOVA_GROUP, 10) : null;
    const years = alloc ? yearsToShare(VYHLASKA.segments, alloc, LUZKOVA_GROUP, 30) : null;
    const ministr = st.ministr ? { ...st.ministr, deficit_mld: m ? Math.max(0, round1(m.cost - m.envelope)) : 0 } : null;
    const r = st.reditel?.decisions && Object.keys(st.reditel.decisions).length
      ? reditelVerdict(REDITEL, st.reditel.decisions, ministr) : null;
    const persona = PRIBEH.personas.find(p => p.id === st.pacient?.persona) || null;
    const p = persona
      ? journeyOutcome(persona, st.pacient?.decisions || {}, r ? r.waiting : waitingFromCampaign(null),
        PRIBEH.waiting_shift_weeks, alloc ? segmentWaitSignals(VYHLASKA.segments, alloc) : {})
      : null;
    return { label: e.label, invalid: false, code: e.code, alloc, m, t, share10, years, r, persona, p };
  });

  const v = (fn) => cols.map(c => (c.invalid ? null : fn(c)));
  const rows = [];
  for (const s of VYHLASKA.segments) {
    rows.push({
      group: 'Alokace růstu (%)', label: s.label, hint: `žádá +${s.demand_pct} %`, kind: 'num', mark: 'spread',
      values: v(c => (c.alloc ? Number(c.alloc[s.id]) || 0 : null)),
    });
  }
  rows.push({ group: 'Vyhláška', label: 'Cena vyhlášky (mld Kč)', kind: 'num', mark: null, values: v(c => c.m?.cost ?? null) });
  rows.push({ group: 'Vyhláška', label: 'Bilance vůči obálce (mld Kč)', kind: 'num', mark: 'max', values: v(c => c.m?.balance ?? null) });
  rows.push({ group: 'Vyhláška', label: 'Dohody (z 15 vyjednávacích)', kind: 'num', mark: 'max', values: v(c => c.m?.deals ?? null) });
  rows.push({ group: 'Vyhláška', label: 'Protesty', kind: 'num', mark: 'min', values: v(c => c.m?.protests ?? null) });
  rows.push({ group: 'Vyhláška', label: 'Eskalace (relativní spravedlnost)', kind: 'num', mark: 'min', values: v(c => c.m?.escalations ?? null) });
  rows.push({ group: 'Vyhláška', label: 'Lůžkový blok po 1 roce (%)', kind: 'num', mark: 'min', values: v(c => c.m?.luzkovaShareAfter ?? null) });
  rows.push({ group: 'Vyhláška', label: 'Lůžkový blok po 10 letech téže vyhlášky (%)', kind: 'num', mark: 'min', values: v(c => c.share10) });
  rows.push({
    group: 'Vyhláška', label: 'Let k průměru OECD (stejná vyhláška každý rok)', kind: 'text', mark: null,
    values: v(c => (c.alloc ? (c.years == null ? 'nikdy' : c.years === 0 ? 'už tam' : `${c.years}`) : null)),
  });
  for (const a of TRILEMMA_AXES) {
    rows.push({ group: 'Trilema vyhlášky', label: TRILEMMA_LABELS[a], kind: 'tone', mark: null,
      values: v(c => (c.t ? { tone: c.t.axes[a].tone, text: c.t.axes[a].value } : null)) });
  }
  rows.push({ group: 'Ředitel (akt II)', label: 'Růst rozpočtu nemocnice (%)', kind: 'num', mark: 'max', values: v(c => c.r?.growthPct ?? null) });
  for (const ax of ['hospodareni', 'personal', 'pacienti']) {
    rows.push({ group: 'Ředitel (akt II)', label: AXIS_LABELS[ax], kind: 'tone', mark: null,
      values: v(c => (c.r ? { tone: c.r.tones[ax], text: TONE_LABEL[c.r.tones[ax]] } : null)) });
  }
  rows.push({ group: 'Ředitel (akt II)', label: 'Čekací doby pro pacienta', kind: 'text', mark: null, values: v(c => (c.r ? WAIT_LABEL[c.r.waiting] : null)) });
  rows.push({ group: 'Pacient (akt III)', label: 'Persona', kind: 'text', mark: null, values: v(c => c.persona?.label ?? null) });
  rows.push({ group: 'Pacient (akt III)', label: 'Týdnů v systému', kind: 'num', mark: 'min', values: v(c => c.p?.weeks ?? null) });
  rows.push({ group: 'Pacient (akt III)', label: 'Z kapsy (Kč)', kind: 'num', mark: 'min', values: v(c => c.p?.oop_kc ?? null) });

  return {
    columns: cols.map(c => ({ label: c.label, invalid: c.invalid, code: c.code })),
    rows,
    shareCodes: cols.filter(c => !c.invalid).map(c => c.code),
  };
}

/** Index hodnot k označení: spread = max i min, max/min = jen „nejlepší". */
export function markIndexes(values, mark) {
  const nums = values.map((x, i) => (Number.isFinite(x) ? { x, i } : null)).filter(Boolean);
  if (!mark || nums.length < 2) return { max: new Set(), min: new Set() };
  const hi = Math.max(...nums.map(n => n.x));
  const lo = Math.min(...nums.map(n => n.x));
  if (hi === lo) return { max: new Set(), min: new Set() };
  const max = new Set(nums.filter(n => n.x === hi).map(n => n.i));
  const min = new Set(nums.filter(n => n.x === lo).map(n => n.i));
  if (mark === 'max') return { max, min: new Set() };
  if (mark === 'min') return { max: new Set(), min };
  return { max, min };
}

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

let DOCS = null;

function czNum(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

function renderTable(cmp) {
  const host = document.getElementById('hpTable');
  if (!host) return;
  if (!cmp.columns.length) {
    host.innerHTML = '<p class="hp-empty">Vložte aspoň jeden sdílecí odkaz nebo kód kampaně.</p>';
    return;
  }
  const head = `<tr><th scope="col">Ukazatel</th>${cmp.columns.map(c => `<th scope="col"${c.invalid ? ' class="hp-invalid"' : ''}>${escapeHtml(c.label)}${c.invalid ? '<br><small>neplatný kód</small>' : ''}</th>`).join('')}</tr>`;
  let lastGroup = null;
  const body = cmp.rows.map((row) => {
    const groupRow = row.group !== lastGroup
      ? `<tr class="hp-group"><th scope="rowgroup" colspan="${cmp.columns.length + 1}">${escapeHtml(row.group)}</th></tr>` : '';
    lastGroup = row.group;
    const marks = row.kind === 'num' ? markIndexes(row.values, row.mark) : { max: new Set(), min: new Set() };
    const cells = row.values.map((val, i) => {
      if (val == null) return '<td>—</td>';
      if (row.kind === 'tone') return `<td class="hp-tone-${escapeHtml(val.tone)}">${escapeHtml(val.text)}</td>`;
      if (row.kind === 'text') return `<td>${escapeHtml(val)}</td>`;
      const cls = row.mark === 'spread'
        ? (marks.max.has(i) ? 'hp-max' : marks.min.has(i) ? 'hp-min' : '')
        : (marks.max.has(i) || marks.min.has(i) ? 'hp-best' : '');
      return `<td class="${cls}">${czNum(val, Number.isInteger(val) ? 0 : 1)}</td>`;
    }).join('');
    return `${groupRow}<tr><th scope="row">${escapeHtml(row.label)}${row.hint ? ` <span class="hp-hint">${escapeHtml(row.hint)}</span>` : ''}</th>${cells}</tr>`;
  }).join('');
  const shareUrl = cmp.shareCodes.length
    ? `${location.origin}${location.pathname}?${cmp.shareCodes.map(c => `k=${encodeURIComponent(c)}`).join('&')}` : '';
  host.innerHTML = `
    <div class="hp-table-wrap"><table class="hp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <p class="hp-note">Tučně = nejvyšší hodnota v řádku alokací, šedě = nejnižší; zeleně = „nejlepší" směr daného ukazatele (víc dohod, míň protestů, nižší podíl lůžkového bloku, kratší cesta). Trilema a osy ředitele: v pořádku / napjaté / obětováno či kritické.</p>
    ${shareUrl ? `
    <div class="hp-share">
      <label class="hp-note" for="hpShareUrl">Sdílet toto porovnání (odkaz nese jen herní volby všech kampaní):</label>
      <input class="hp-share-url" id="hpShareUrl" type="text" readonly value="${escapeHtml(shareUrl)}">
    </div>` : ''}`;
  if (shareUrl) {
    try { history.replaceState(null, '', shareUrl); } catch { /* file:// apod. */ }
  }
}

function renderFromInput() {
  const ta = document.getElementById('hpInput');
  const entries = parseCampaignInput(ta?.value || '');
  const cmp = buildComparison(entries, DOCS);
  renderTable(cmp);
  trackEvent('hra_porovnani', { n: cmp.columns.length, neplatne: cmp.columns.filter(c => c.invalid).length });
}

async function init() {
  renderModuleNav('explainers', { popups: 'manual' });
  renderMastheadDate();
  renderRelatedTools('tri-zidle');

  const host = document.getElementById('hpTable');
  if (!host) return;
  try {
    const [VYHLASKA, REDITEL, PRIBEH] = await Promise.all([
      fetch('data/vyhlaska-hra.json').then(r => r.json()),
      fetch('data/reditel-hra.json').then(r => r.json()),
      fetch('data/pribeh-pacienta.json').then(r => r.json()),
    ]);
    DOCS = { VYHLASKA, REDITEL, PRIBEH };

    const ta = document.getElementById('hpInput');
    const codes = new URLSearchParams(location.search).getAll('k');
    if (ta && codes.length) ta.value = codes.map((c, i) => `Kampaň ${i + 1}: ${c}`).join('\n');

    document.getElementById('hpRender')?.addEventListener('click', renderFromInput);
    ta?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) renderFromInput(); });

    // Vlastní rozehraná kampaň (localStorage) jde přidat jedním klikem
    const mine = document.getElementById('hpAddMine');
    const st = loadState();
    if (mine) {
      if (st.ministr?.alloc || st.reditel?.decisions || st.pacient?.persona) {
        mine.addEventListener('click', () => {
          if (!ta) return;
          ta.value = `${ta.value.trim()}\n Moje kampaň: ${encodeShare(st)}`.trim();
          renderFromInput();
        });
      } else {
        mine.hidden = true;
      }
    }

    if (codes.length) renderFromInput();
    else host.innerHTML = '<p class="hp-empty">Zatím žádná kampaň. Vložte odkazy nahoře, nebo přidejte svou.</p>';
  } catch (err) {
    host.innerHTML = renderErrorState('Porovnání se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
