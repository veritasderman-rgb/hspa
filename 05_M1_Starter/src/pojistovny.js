// Srovnávač zdravotních pojišťoven — pracovní verze (pod heslem, noindex).
//
// Čte výhradně data/pojistovny*.json (frontend nezná zdroje):
//   data/pojistovny.json            kmen (CRP 2025), hospodaření 2024 (MZ+MF, VZ), ZPP 2026, servis, semafor
//   data/pojistovny-aplikace.json   matice funkcí aplikací, uživatelé, rizikové skupiny, další zkoumání
//   data/pojistovny-prevence.json   nabídka podle oblastí, onko screening, duševní zdraví, struktura fondu prevence, odpovědi z VZ
//   data/pojistovny-otazky.json     sady otázek (kolo 1 fond prevence, kolo 2 rizikoví pojištěnci)
// Každý soubor je nepovinný: chybí-li, modul vypíše stav „data zatím nejsou k dispozici“ a zbytek stránky funguje.
//
// Čisté funkce (fmtKc, hbarSvg, sparkSvg, levelBadge) jsou exportované kvůli testům (tests/pojistovny.test.js).

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter, escapeHtml, formatNumberCz } from './page-shared.js';

const ZP_COLOR = {
  '111': 'var(--ink)', '201': '#4a6fa5', '205': '#38761d', '207': '#7a6a9c',
  '209': '#b8860b', '211': '#0b5394', '213': '#b45f06',
};
const NA = '<span class="zpc-na" title="nedohledáno">—</span>';
const esc = escapeHtml;

export function fmtKc(v, dec = 0) {
  if (v == null || v === '') return '—';
  return formatNumberCz(v, { minDecimals: dec, maxDecimals: dec });
}
const num = (v, dec = 0) => (v == null ? NA : fmtKc(v, dec));
const h = (obj) => (obj && typeof obj === 'object' && 'hodnota' in obj ? obj.hodnota : obj);

/** Vodorovný sloupcový graf (SVG, škálovaný; hodnota null = „nedohledáno“). */
export function hbarSvg(items, { unit = '', dec = 1, ref = null, refLabel = '', width = 640, maxv = null } = {}) {
  const vals = items.map((i) => i.value).filter((v) => v != null);
  if (!vals.length) return '<p class="zpc-na">Data nejsou k dispozici.</p>';
  const mx = maxv ?? Math.max(...vals, ref ?? 0) * 1.12;
  const rh = 26, gap = 8, labW = 120, valW = 92;
  const hgt = items.length * (rh + gap) + 28;
  const bw = width - labW - valW - 8;
  let out = `<svg viewBox="0 0 ${width} ${hgt}" width="100%" role="img" aria-label="graf" style="max-width:${width}px;font-family:var(--sans)">`;
  if (ref != null) {
    const x = labW + bw * ref / mx;
    out += `<line x1="${x.toFixed(1)}" y1="2" x2="${x.toFixed(1)}" y2="${hgt - 16}" stroke="var(--red)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    out += `<text x="${(x + 4).toFixed(1)}" y="${hgt - 4}" font-size="11" fill="var(--red)">${esc(refLabel)}</text>`;
  }
  items.forEach((it, i) => {
    const y = 8 + i * (rh + gap);
    out += `<text x="${labW - 8}" y="${(y + rh * 0.68).toFixed(1)}" text-anchor="end" font-size="13" fill="var(--ink)">${esc(it.label)}</text>`;
    if (it.value == null) {
      out += `<text x="${labW + 4}" y="${(y + rh * 0.68).toFixed(1)}" font-size="12" fill="var(--ink-mut)">nedohledáno</text>`;
      return;
    }
    const w = Math.max(2, bw * it.value / mx);
    out += `<rect x="${labW}" y="${y}" width="${w.toFixed(1)}" height="${rh}" fill="${it.color}" rx="2"/>`;
    const txt = fmtKc(it.value, dec) + unit;
    out += `<text x="${(labW + w + 6).toFixed(1)}" y="${(y + rh * 0.68).toFixed(1)}" font-size="13" font-weight="600" fill="var(--ink)" style="font-variant-numeric:tabular-nums">${esc(txt)}</text>`;
    if (it.sub) out += `<text x="${(labW + w + 6 + txt.length * 7.5 + 6).toFixed(1)}" y="${(y + rh * 0.68).toFixed(1)}" font-size="11" fill="var(--ink-mut)">${esc(it.sub)}</text>`;
  });
  return out + '</svg>';
}

/** Sparkline tržního podílu. */
export function sparkSvg(trend, color, w = 120, hh = 28) {
  const vals = trend.map((t) => t.share_pct);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = (mx - mn) || 1;
  const pts = vals.map((v, i) => [2 + i * (w - 4) / (vals.length - 1), hh - 2 - (v - mn) / rng * (hh - 6)]);
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" aria-hidden="true"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.4" fill="${color}"/></svg>`;
}

const LEVELS = { nejsilnejsi: 3, silne: 2, zakladni: 1, minimalni: 0 };
const LEVEL_LABEL = { 3: 'nejsilnější', 2: 'silné', 1: 'základní', 0: 'minimální' };
export function levelBadge(stupen) {
  if (stupen == null) return NA;
  const n = typeof stupen === 'number' ? stupen : LEVELS[String(stupen).toLowerCase()];
  if (n == null) return esc(String(stupen));
  return `<span class="zpc-lvl zpc-lvl-${n}">${LEVEL_LABEL[n]}</span>`;
}
const boolMark = (v) => (v === true ? '<span class="zpc-yes">✓</span>' : v === false ? '<span class="zpc-no">✗</span>' : v === 'partial' ? '<span class="zpc-part">◐</span>' : NA);
const dot = (kod) => `<span class="zpc-dot" style="--c:${ZP_COLOR[kod] || 'var(--ink)'}"></span>`;
const li = (arr) => (arr || []).map((s) => `<li>${esc(s)}</li>`).join('') || '<li class="zpc-na">—</li>';
const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
const short = (s, n = 70) => (s ? (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s)) : '');

async function loadJson(url, attempt = 0) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    if (attempt < 1) { await new Promise((res) => setTimeout(res, 300)); return loadJson(url, attempt + 1); }
    console.warn('pojistovny:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------- hero
function renderHero(d) {
  if (!d) return;
  const s = d.system || {}, c = d.system_crp || {};
  const stat = (n, unit, lbl, meta) => `<div class="ed-stat ed-stat-static"><div class="ed-stat-num">${n} <span class="ed-stat-unit">${unit}</span></div><div class="ed-stat-lbl">${lbl}</div><div class="ed-stat-meta">${meta}</div></div>`;
  set('zpHeroStats',
    stat(fmtKc((c.pojistenci_2025 || 0) / 1e6, 2), 'mil.', 'pojištěnců v CRP (2025)', `7 pojišťoven · senioři 65+ tvoří ${fmtKc(c.podil_65plus_pct, 1)} % kmene`) +
    stat(fmtKc(s.vydaje_celkem_mld, 1), 'mld Kč', 'výdaje systému v.z.p. 2024', 'plán 2026 už 570,8 mld (sněmovní tisk 280)') +
    stat(fmtKc(s.fond_prevence_naklady_celkem_mld, 2), 'mld Kč', 'čerpání fondů prevence 2024', `${fmtKc(s.fond_prevence_na_pojistence_kc)} Kč na pojištěnce; bez společného vyhodnocení dopadu`) +
    stat(fmtKc(s.saldo_mld, 1), 'mld Kč', 'saldo systému 2024', 'kladně hospodařily jen VoZP a ZPŠ; 2026 plán −14,9 mld'));
}

// ---------------------------------------------------------------- modul 1: aplikace
function renderApps(a) {
  if (!a) { set('zpAppMatrix', '<p class="zpc-na">Data o aplikacích zatím nejsou k dispozici.</p>'); return; }
  const fn = a.funkce || [];
  const head = `<tr><th class="zpc-txt">Pojišťovna · aplikace</th>${fn.map((f) => `<th>${esc(f.label)}</th>`).join('')}<th>Funkce</th><th>Uživatelé</th></tr>`;
  const rows = (a.aplikace || []).map((x) => {
    const vals = fn.map((f) => x.funkce?.[f.id]);
    const cnt = vals.filter((v) => v === true).length;
    const known = vals.filter((v) => v != null).length;
    const u = x.uzivatele || {};
    return `<tr><th scope="row" class="zpc-txt">${dot(x.kod)}<b>${esc(x.zp)}</b> · ${esc(x.nazev || '—')}${x.nazev_alt ? `<small>v analýze jako „${esc(x.nazev_alt)}“</small>` : ''}</th>` +
      vals.map((v) => `<td>${boolMark(v)}</td>`).join('') +
      `<td>${known ? `${cnt} / ${known}` : NA}</td><td>${u.hodnota != null ? `${fmtKc(u.hodnota / 1e6, 1)} mil.<small>${esc(u.rok || '')} · ${esc(short(u.poznamka, 60))}</small>` : '<span class="zpc-na">neuvádí</span>'}</td></tr>`;
  }).join('');
  set('zpAppMatrix', `<table class="zpc-matrix"><thead>${head}</thead><tbody>${rows}</tbody></table>`);
  set('zpAppCap', `✓ funkce potvrzena, ✗ chybí, — bez údaje. Zdroje: ${(a.zdroje || []).map((z) => esc(z.nazev)).join('; ')}. Počty uživatelů uvádějí ve výročních zprávách jen VZP a OZP; u ostatních je nutný dotaz.`);
  set('zpAppSummary', li(a.shrnuti));
  set('zpAppNotes', li(a.rozpory));
  // modul 4 (rizikové skupiny + další zkoumání) čerpá ze stejného souboru
  const r = a.rizikove_skupiny || {};
  set('zpRizikove', `<p>${esc(r.popis || '')}</p><p><b>Skupiny:</b> ${(r.skupiny || []).map(esc).join(', ') || '—'}.</p><p><b>Predikční modely:</b> ${(r.predikcni_modely || []).join(', ') || '—'}.</p><p><b>Chybějící data:</b> ${(r.chybejici_data || []).map(esc).join(', ') || '—'}.</p>`);
  set('zpDalsi', (a.dalsi_zkoumani || []).map((t) => `<li><b>${esc(t.tema)}.</b> ${esc(t.otazka || '')} <span class="zpc-na">Metriky: ${(t.metriky || []).map(esc).join('; ') || '—'}</span></li>`).join('') || '<li class="zpc-na">—</li>');
}

// ---------------------------------------------------------------- modul 2: prevence
function renderPrevence(p, d) {
  if (!p) {
    for (const id of ['zpPrevMatrix', 'zpPrevOnko', 'zpPrevDusevni', 'zpFpStruktura', 'zpOdpovedi']) set(id, '<p class="zpc-na">Data o preventivních programech zatím nejsou k dispozici.</p>');
  } else {
    const obl = p.oblasti || [];
    const zps = p.pojistovny || [];
    // matice oblastí
    set('zpPrevMatrix', `<table class="zpc-matrix"><thead><tr><th class="zpc-txt">Pojišťovna</th>${obl.map((o) => `<th>${esc(o.label)}</th>`).join('')}</tr></thead><tbody>` +
      zps.map((z) => `<tr><th scope="row" class="zpc-txt">${dot(z.kod)}${esc(z.zkratka)}</th>${obl.map((o) => { const c = z.oblasti?.[o.id]; return `<td>${levelBadge(c?.stupen)}<span class="zpc-desc">${esc(c?.popis || '')}</span></td>`; }).join('')}</tr>`).join('') + '</tbody></table>');
    // onko
    const oc = p.onko_screening_sloupce || [];
    const ocLabel = { prsu: 'Prs', delozni_hrdlo: 'Děložní hrdlo', kolorektum: 'Kolorektum', prostata: 'Prostata', plice: 'Plíce' };
    set('zpPrevOnko', `<table class="zpc-matrix"><thead><tr><th class="zpc-txt">ZP</th>${oc.map((c) => `<th>${esc(ocLabel[c] || c)}</th>`).join('')}<th>Nadstandard</th></tr></thead><tbody>` +
      zps.map((z) => { const o = z.onko_screening || {}; return `<tr><th scope="row" class="zpc-txt">${dot(z.kod)}${esc(z.zkratka)}</th>${oc.map((c) => `<td>${boolMark(o[c])}</td>`).join('')}<td>${levelBadge(o.nadstandard?.stupen)}<span class="zpc-desc">${esc(o.nadstandard?.popis || '')}</span></td></tr>`; }).join('') + '</tbody></table>');
    // duševní
    const ds = p.dusevni_sloupce || [];
    set('zpPrevDusevni', `<table class="zpc-matrix"><thead><tr><th class="zpc-txt">ZP</th>${ds.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>` +
      zps.map((z) => `<tr><th scope="row" class="zpc-txt">${dot(z.kod)}${esc(z.zkratka)}</th>${ds.map((c) => `<td>${levelBadge(z.dusevni?.[c.id]?.stupen)}</td>`).join('')}</tr>`).join('') + '</tbody></table>');
    // struktura fondu prevence — výběr ZP
    const sel = `<label class="zpc-note" for="zpFpSelect">Pojišťovna: </label><select id="zpFpSelect" class="zpc-note">${zps.map((z) => `<option value="${z.kod}">${esc(z.zkratka)} (${esc(z.fond_prevence_struktura?.rok || z.rok_vz || '')})</option>`).join('')}</select><div id="zpFpTable" class="zpc-tbl"></div>`;
    set('zpFpStruktura', sel);
    const renderFp = (kod) => {
      const z = zps.find((x) => x.kod === kod); const f = z?.fond_prevence_struktura;
      if (!f || !f.polozky?.length) { set('zpFpTable', '<p class="zpc-na">Struktura není v dostupných dokumentech.</p>'); return; }
      const tot = f.celkem?.skutecnost || f.polozky.reduce((a, x) => a + (x.skutecnost || 0), 0) || 1;
      const rows = [...f.polozky].sort((a, b) => (b.skutecnost || 0) - (a.skutecnost || 0)).map((x) => `<tr><th scope="row" class="zpc-txt">${esc(x.nazev)}</th><td>${num(x.zpp)}</td><td>${num(x.skutecnost)}</td><td>${x.skutecnost != null ? fmtKc(100 * x.skutecnost / tot, 1) + ' %' : NA}</td><td>${x.zpp && x.skutecnost != null ? fmtKc(100 * x.skutecnost / x.zpp, 0) + ' %' : NA}</td><td>${num(x.predchozi_rok)}</td></tr>`).join('');
      set('zpFpTable', `<table><thead><tr><th class="zpc-txt">Účelová položka (${esc(f.jednotka || 'tis. Kč')}, ${esc(f.rok || '')})</th><th>Plán (ZPP)</th><th>Skutečnost</th><th>Podíl</th><th>Plnění plánu</th><th>Předchozí rok</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th class="zpc-txt">Celkem</th><td>${num(f.celkem?.zpp)}</td><td><b>${num(f.celkem?.skutecnost)}</b></td><td>100 %</td><td>${f.celkem?.zpp && f.celkem?.skutecnost ? fmtKc(100 * f.celkem.skutecnost / f.celkem.zpp, 0) + ' %' : NA}</td><td>${num(f.celkem?.predchozi_rok)}</td></tr></tfoot></table>${z.poznamka ? `<p class="zpc-cap">${esc(z.poznamka)}</p>` : ''}`);
    };
    const selEl = document.getElementById('zpFpSelect');
    if (selEl) { selEl.addEventListener('change', (e) => renderFp(e.target.value)); renderFp(selEl.value); }
    // doložené výsledky
    const dol = zps.flatMap((z) => (z.dolozene_vysledky || []).map((v) => `<li><b>${esc(z.zkratka)}</b> · ${esc(v.program)}: ${esc(v.vysledek)}${v.rok ? ` (${esc(v.rok)})` : ''}</li>`));
    set('zpDolozene', dol.join('') || '<li class="zpc-na">Žádná výroční zpráva neuvádí měřitelný výsledek programu.</li>');
    // odpovědi na 7 otázek
    const Q = [['programy_seznam', 'Jaké programy nabízí'], ['cile', 'Cíle a zaměření'], ['naklady_poznamka', 'Náklady a zdroje fondu'], ['mereni_dopadu', 'Jak měří dopad'], ['kanaly', 'Komunikační kanály'], ['hodnoceni_efektivity', 'Hodnocení účinnosti, interní metodika'], ['frekvence', 'Jak často vyhodnocuje']];
    set('zpOdpovedi', zps.map((z) => `<details class="zpc-acc"><summary>${dot(z.kod)}${esc(z.zkratka)} <span class="zpc-na">· ${esc(z.rok_vz ? `VZ ${z.rok_vz}` : '')}</span></summary><div class="zpc-acc-body"><dl>${Q.map(([k, l]) => { const v = z.odpovedi?.[k]; const txt = Array.isArray(v) ? v.map(esc).join(', ') : esc(v || ''); return `<dt>${l}</dt><dd>${txt || '<span class="zpc-na">VZ neuvádí</span>'}</dd>`; }).join('')}</dl></div></details>`).join(''));
  }
  // měření dopadu z pojistovny.json (VZ 2024) — nezávislé na prevence souboru
  if (d) set('zpMereni', (d.pojistovny || []).map((z) => `<li><b>${esc(z.zkratka)}</b>: ${z.mereni_dopadu?.hodnoceni_ve_vz === true ? '<span class="zpc-yes">ano</span>' : z.mereni_dopadu?.hodnoceni_ve_vz === false ? '<span class="zpc-no">ne</span>' : NA} <span class="zpc-na">${esc(short(z.mereni_dopadu?.citace, 160))}</span></li>`).join(''));
}

// ---------------------------------------------------------------- modul 3: kmen a hospodaření
function renderKmen(d) {
  if (!d) { set('zpCards', '<p class="zpc-na">Základní dataset chybí.</p>'); return; }
  const zps = d.pojistovny || [];
  set('zpCards', zps.map((z) => {
    const c = z.crp, hs = z.hospodareni, p = z.prevence || {}, s = z.servis || {};
    const top = c.top_kraje?.[0];
    const g = c.rust_2015_2025_pct;
    const yr = (v) => (v != null && p.rok_udaju && p.rok_udaju !== 2024 ? `<small class="zpc-na"> (${p.rok_udaju})</small>` : '');
    return `<article class="zpc-card" id="zp-${z.kod}" style="--c:${ZP_COLOR[z.kod]}">
      <header><span class="zpc-kod">${z.kod}</span><h3>${esc(z.zkratka)}</h3><span class="zpc-full">${esc(z.nazev)}</span></header>
      <div class="zpc-kpi"><b>${fmtKc(c.pojistenci / 1e6, 2)} mil.</b><span>pojištěnců 2025 · ${fmtKc(c.podil_trhu_pct, 1)} % trhu</span>${sparkSvg(c.podil_trend, ZP_COLOR[z.kod])}</div>
      <dl>
        <div><dt>Senioři 65+</dt><dd>${fmtKc(c.podil_65plus_pct, 1)} %</dd></div>
        <div><dt>Děti 0–14</dt><dd>${fmtKc(c.podil_0_14_pct, 1)} %</dd></div>
        <div><dt>Kmen 2015→2025</dt><dd style="color:${g > 0 ? 'var(--good)' : 'var(--bad)'}">${g > 0 ? '+' : ''}${fmtKc(g, 1)} %</dd></div>
        <div><dt>Těžiště</dt><dd>${esc(top?.nazev || '')} (${fmtKc(top?.pct_kmene, 0)} % kmene)</dd></div>
        <div><dt>Náklady na pojištěnce</dt><dd>${num(h(hs.naklady_na_pojistence_kc))} Kč</dd></div>
        <div><dt>Fond prevence celkem</dt><dd>${num(h(hs.fond_prevence_naklady_mil))} mil. Kč</dd></div>
        <div><dt>Max. příspěvek dospělý / dítě</dt><dd>${num(p.max_prispevek_dospely_kc)}${yr(p.max_prispevek_dospely_kc)} / ${num(p.max_prispevek_dite_kc)}${yr(p.max_prispevek_dite_kc)} Kč</dd></div>
        <div><dt>Aplikace</dt><dd>${esc(short(s.mobilni_aplikace, 28)) || NA}</dd></div>
        <div><dt>Saldo 2024</dt><dd>${num(h(hs.hospodarsky_vysledek_mld), 1)} mld Kč</dd></div>
        <div><dt>Rezerva konec 2026</dt><dd>${num(h(hs.zustatek_2026_pct_vydaju), 1)} % výdajů</dd></div>
      </dl></article>`;
  }).join(''));
  const items = (fn, extra = {}) => zps.map((z) => ({ label: z.zkratka, color: ZP_COLOR[z.kod], ...fn(z) }));
  set('zpChartShare', hbarSvg(items((z) => ({ value: z.crp.podil_trhu_pct, sub: `${fmtKc(z.crp.pojistenci / 1e6, 2)} mil.` })), { unit: ' %' }));
  set('zpChart65', hbarSvg(items((z) => ({ value: z.crp.podil_65plus_pct })), { unit: ' %', ref: d.system_crp?.podil_65plus_pct, refLabel: `ČR ${fmtKc(d.system_crp?.podil_65plus_pct, 1)} %` }));
  set('zpChartNzs', hbarSvg(items((z) => ({ value: h(z.hospodareni.naklady_na_pojistence_kc) })), { unit: ' Kč', dec: 0 }));
  set('zpChartZust', hbarSvg(items((z) => ({ value: h(z.hospodareni.zustatek_2026_pct_vydaju), sub: h(z.hospodareni.zavazky_po_splatnosti_2026_plan_mil) ? `závazky po splatnosti ${fmtKc(h(z.hospodareni.zavazky_po_splatnosti_2026_plan_mil))} mil.` : '' })), { unit: ' %', ref: 3.5, refLabel: 'kritická hranice 3–4 %', maxv: 7 }));
  set('zpTableFin', `<table><thead><tr><th>Pojišťovna</th><th>Pojištěnci (průměr)</th><th>Příjmy mld</th><th>Náklady na ZS mld</th><th>Náklady na pojištěnce Kč</th><th>Fond prevence mil.</th><th>Prevence na pojištěnce Kč</th><th>Provoz % příjmů</th><th>Limit %</th><th>Saldo mld</th><th>Zůstatek BÚ 2025 mil.</th><th>Zůstatek BÚ 2026 mil.</th></tr></thead><tbody>` +
    zps.map((z) => { const x = z.hospodareni; return `<tr><th scope="row">${dot(z.kod)}${esc(z.zkratka)}</th><td>${num(h(x.pocet_pojistencu))}</td><td>${num(h(x.prijmy_celkem_mld), 1)}</td><td>${num(h(x.naklady_zdravotni_sluzby_mld), 1)}</td><td>${num(h(x.naklady_na_pojistence_kc))}</td><td>${num(h(x.fond_prevence_naklady_mil))}</td><td>${num(h(x.fond_prevence_na_pojistence_kc))}</td><td>${num(h(x.provozni_naklady_pct), 2)}</td><td>${num(h(x.provozni_limit_pct), 2)}</td><td>${num(h(x.hospodarsky_vysledek_mld), 1)}</td><td>${num(h(x['zustatek_bu_2025_oček_mil']))}</td><td>${num(h(x.zustatek_bu_2026_plan_mil))}</td></tr>`; }).join('') + '</tbody></table>');
  set('zpTablePrev', `<table><thead><tr><th>Pojišťovna</th><th class="zpc-txt">Aplikace</th><th>Pobočky</th><th>Online přepážka</th><th class="zpc-txt">Bonusový program</th><th class="zpc-txt">Pro zaměstnavatele</th></tr></thead><tbody>` +
    zps.map((z) => { const s = z.servis || {}, p = z.prevence || {}; const b = p.bonusovy_program || {}, e = p.programy_pro_zamestnavatele || {}; return `<tr><th scope="row">${dot(z.kod)}${esc(z.zkratka)}</th><td class="zpc-txt">${esc(s.mobilni_aplikace || '') || NA}</td><td>${num(s.pocet_pobocek)}${s.pocet_pobocek_poznamka ? `<small>${esc(short(s.pocet_pobocek_poznamka, 90))}</small>` : ''}</td><td>${boolMark(s.online_prepazka)}</td><td class="zpc-txt">${b.nazev ? esc(short(b.nazev, 110)) : b.existuje === null ? '<span class="zpc-na">nenalezen</span>' : NA}</td><td class="zpc-txt">${e.nazev ? esc(short(e.nazev, 90)) : e.existuje === null ? '<span class="zpc-na">nenalezen</span>' : NA}</td></tr>`; }).join('') + '</tbody></table>');
  set('zpNotes', zps.flatMap((z) => (z.poznamky || []).slice(0, 2).map((n) => `<li><b>${esc(z.zkratka)}</b> — ${esc(n)}</li>`)).join('') || '<li class="zpc-na">—</li>');
  set('zpChybi', li(d.chybi));
  // semafor
  const obl = d.oblasti || [], stavy = d.stavy_semaforu || {};
  const sig = { good: 'g', warn: 'w', bad: 'b', neutral: '' };
  set('zpSemafor', `<table class="zpc-matrix"><thead><tr><th class="zpc-txt">Pojišťovna</th>${obl.map((o) => `<th title="${esc(o.popis)}">${esc(o.nazev)}</th>`).join('')}</tr></thead><tbody>` +
    zps.map((z) => `<tr><th scope="row" class="zpc-txt">${dot(z.kod)}${esc(z.zkratka)}</th>${obl.map((o) => { const s = z.semafor?.[o.id]; const st = s?.stav ? stavy[s.stav] : null; return `<td>${st ? `<span class="zpc-sem"><span class="${sig[st.signal] || ''}">${esc(st.label)}</span></span><span class="zpc-desc">${esc(short(s.zduvodneni, 120))}</span>` : '<span class="zpc-na">zatím nehodnoceno</span>'}</td>`; }).join('')}</tr>`).join('') + '</tbody></table>');
  set('zpSources', (d.zdroje || []).map((z) => `<li>${esc(z.nazev || z.id)}${z.url ? ` — <a href="${esc(z.url)}" rel="noopener">${esc(z.url)}</a>` : ''}${z.clanek ? ` · <a href="${esc(z.clanek)}">článek</a>` : ''}</li>`).join(''));
}

// ---------------------------------------------------------------- modul 4: otázky
function renderOtazky(o) {
  if (!o) { set('zpOtazky', '<p class="zpc-na">Sady otázek zatím nejsou k dispozici.</p>'); return; }
  const sada = (o.sady || []).find((s) => s.id === 'rizikovi-pojistenci') || (o.sady || [])[1];
  if (!sada) return;
  set('zpOtazky', (sada.casti || []).map((c) => `<p><b>${esc(c.id)} · ${esc(c.nazev)}</b></p><ol>${(c.otazky || []).map((q) => `<li>${esc(q.text)}${q.moznosti?.length ? `<span class="zpc-opts">${q.moznosti.map(esc).join(' · ')}</span>` : ''}</li>`).join('')}</ol>`).join(''));
}

// ---------------------------------------------------------------- init
async function init() {
  renderModuleNav('pojistovny');
  renderMastheadDate();
  if (typeof renderFooter === 'function') renderFooter();
  const [d, a, p, o] = await Promise.all([
    loadJson('data/pojistovny.json'), loadJson('data/pojistovny-aplikace.json'),
    loadJson('data/pojistovny-prevence.json'), loadJson('data/pojistovny-otazky.json'),
  ]);
  renderHero(d); renderApps(a); renderPrevence(p, d); renderKmen(d); renderOtazky(o);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}
