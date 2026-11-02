// Srovnávač zdravotních pojišťoven — moduly 1 (aplikace), 2 (prevence) a 4 (otázky).
// Orchestruje src/pojistovny.js; data viz hlavička tohoto souboru tam.

import { NA, esc, num, h, fmtKc, levelBadge, boolMark, dot, li, set, short } from './pojistovny-shared.js';

// ---------------------------------------------------------------- modul 1: aplikace
export function renderApps(a) {
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
export function renderPrevence(p, d) {
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
    const sel = `<label class="zpc-note" for="zpFpSelect">Pojišťovna: </label><select id="zpFpSelect" class="zpc-note">${zps.map((z) => `<option value="${z.kod}">${esc(z.zkratka)} (${esc(z.fond_prevence_struktura?.rok || z.rok_vz || '')})</option>`).join('')}</select><div id="zpFpTable" class="zpc-tbl" role="region" tabindex="0" aria-label="Struktura fondu prevence (tabulka, posuvná)"></div>`;
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

// ---------------------------------------------------------------- modul 4: otázky
export function renderOtazky(o) {
  if (!o) { set('zpOtazky', '<p class="zpc-na">Sady otázek zatím nejsou k dispozici.</p>'); return; }
  const sada = (o.sady || []).find((s) => s.id === 'rizikovi-pojistenci') || (o.sady || [])[1];
  if (!sada) return;
  set('zpOtazky', (sada.casti || []).map((c) => `<p><b>${esc(c.id)} · ${esc(c.nazev)}</b></p><ol>${(c.otazky || []).map((q) => `<li>${esc(q.text)}${q.moznosti?.length ? `<span class="zpc-opts">${q.moznosti.map(esc).join(' · ')}</span>` : ''}</li>`).join('')}</ol>`).join(''));
}
