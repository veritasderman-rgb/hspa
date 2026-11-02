// Srovnávač zdravotních pojišťoven — pracovní verze (pod heslem, noindex).
//
// Čte výhradně data/pojistovny*.json (frontend nezná zdroje):
//   data/pojistovny.json            kmen (CRP 2025), hospodaření 2024 (MZ+MF, VZ), ZPP 2026, servis, semafor
//   data/pojistovny-aplikace.json   matice funkcí aplikací, uživatelé, rizikové skupiny, další zkoumání
//   data/pojistovny-prevence.json   nabídka podle oblastí, onko screening, duševní zdraví, struktura fondu prevence, odpovědi z VZ
//   data/pojistovny-otazky.json     sady otázek (kolo 1 fond prevence, kolo 2 rizikoví pojištěnci)
// Každý soubor je nepovinný: chybí-li, modul vypíše stav „data zatím nejsou k dispozici“ a zbytek stránky funguje.
//
// Čisté funkce (fmtKc, hbarSvg, sparkSvg, levelBadge) žijí v src/pojistovny-shared.js a jsou odsud re-exportované kvůli testům.
// Moduly 1, 2 a 4 renderuje src/pojistovny-prevence.js; tenhle soubor drží hero, modul 3 (kmen a hospodaření), semafor a init.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter } from './page-shared.js';
import { ZP_COLOR, NA, esc, num, h, fmtKc, hbarSvg, sparkSvg, levelBadge, boolMark, dot, li, set, short, loadJson } from './pojistovny-shared.js';
import { renderApps, renderPrevence, renderOtazky } from './pojistovny-prevence.js';

// Re-export čistých funkcí kvůli tests/pojistovny.test.js.
export { fmtKc, hbarSvg, sparkSvg, levelBadge };

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
