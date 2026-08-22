// Frontend logika stránky pracovni-osoby.html — „Kdo je kdo" v poradních
// orgánech MZ: prohledávatelný adresář všech osob (data/ppo-osoby.json,
// ověřené profily nesou externi z FÁZE 4) + faktická sekce „Dvojrole"
// (data/ppo-dvojrole.json: osoba → orgány → firemní angažmá dle rejstříku).
// Datové soubory staví ingest/ppo/build-web.js.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';
import { KAT_LABELS } from './ppo.js';

/** Normalizace pro hledání: bez diakritiky, lowercase. */
export function normText(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Řadicí klíč: příjmení (poslední slovo jména bez titulů a přípon za čárkou). */
export function prijmeniKey(jmeno) {
  const base = String(jmeno).split(',')[0].trim();
  const parts = base.split(/\s+/).filter(w => !/\./.test(w));
  return normText(parts[parts.length - 1] ?? base);
}

/** Filtr adresáře (čistá funkce — testovatelná). */
export function filterOsoby(osoby, { q = '', kat = 'all', jenOverene = false } = {}) {
  const nq = normText(q.trim());
  return osoby.filter(p =>
    (kat === 'all' || p.kat === kat)
    && (!jenOverene || p.externi)
    && (!nq || normText(`${p.jmeno} ${(p.afiliace ?? []).join(' ')} ${(p.externi?.funkce ?? []).join(' ')}`).includes(nq)));
}

const $ = id => document.getElementById(id);
let OS = null, DVOJ = null;
let fQ = '', fKat = 'all', fOverene = false, fJenUhradove = false;

function hsLink(p) {
  const hs = p.externi?.odkazy?.find(o => o.url.startsWith('https://www.hlidacstatu.cz/'));
  return hs ? ` <a class="ppo-hs" href="${escapeHtml(hs.url)}" target="_blank" rel="noopener" title="Ověřený veřejný profil na Hlídači státu">Hlídač&nbsp;↗</a>` : '';
}

function renderDir() {
  const rows = filterOsoby(OS.osoby, { q: fQ, kat: fKat, jenOverene: fOverene })
    .sort((a, b) => prijmeniKey(a.jmeno).localeCompare(prijmeniKey(b.jmeno), 'cs')
      || a.jmeno.localeCompare(b.jmeno, 'cs'));
  $('dirCount').textContent = String(rows.length);
  $('dirEmpty').classList.toggle('hidden', rows.length > 0);
  $('ppoDir').innerHTML = rows.map(p => {
    const aff = p.externi?.funkce?.[0] ?? p.afiliace?.[0]
      ?? (p.kat !== 'neuvedeno' ? KAT_LABELS[p.kat] : null);
    return `<li>
      <strong><a href="pracovni-osoba.html?id=${p.id}">${escapeHtml(p.jmeno)}</a></strong>
      <span class="ppo-dir-aff">${aff ? escapeHtml(aff) : '—'}${p.kat !== 'neuvedeno' && p.afiliace?.[0] ? ` · ${escapeHtml(KAT_LABELS[p.kat] ?? p.kat)}` : ''}</span>
      <span class="ppo-dir-n" title="počet členství">${p.clenstvi.length}×</span>${hsLink(p)}
    </li>`;
  }).join('');
}

function renderDvojrole() {
  const rows = DVOJ.osoby.filter(o => !fJenUhradove || o.skupiny.some(s => s.uhradovy));
  $('dvCount').textContent = String(rows.length);
  $('ppoDvojrole').innerHTML = `
    <table class="ppo-table">
      <thead><tr><th>Osoba</th><th>Orgány MZ</th><th>Firemní angažmá dle rejstříku</th></tr></thead>
      <tbody>${rows.map(o => `
        <tr>
          <td><strong><a href="pracovni-osoba.html?id=${o.id}">${escapeHtml(o.jmeno)}</a></strong>
            ${o.url ? `<br><a class="ppo-hs" href="${escapeHtml(o.url)}" target="_blank" rel="noopener">Hlídač&nbsp;↗</a>` : ''}
            ${o.statni_zakazky ? '<br><span class="ppo-dv-flag" title="firmy z profilu mají smlouvy v registru smluv">dodavatel státu</span>' : ''}</td>
          <td>${o.skupiny.map(s => `<a href="pracovni-skupina.html?id=${s.g}">${escapeHtml(s.nazev)}</a>${s.role !== 'Členové' ? ` <span class="ppo-role">${escapeHtml(s.role)}</span>` : ''}${s.uhradovy ? ' <span class="ppo-dv-uhr" title="orgán s úhradovým či regulačním dosahem">úhradový</span>' : ''}`).join('<br>')}</td>
          <td class="ppo-dv-firmy">${o.firmy.slice(0, 6).map(f => escapeHtml(f.nazev)).join(' · ')}${o.firmy.length > 6 ? ` <span class="ppo-role">…a ${o.firmy.length - 6} dalších</span>` : ''}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  try {
    const [osRes, dvRes] = await Promise.all([fetch('data/ppo-osoby.json'), fetch('data/ppo-dvojrole.json')]);
    if (!osRes.ok || !dvRes.ok) throw new Error(`HTTP ${osRes.status}/${dvRes.status}`);
    OS = await osRes.json();
    DVOJ = await dvRes.json();

    $('sOsob').textContent = String(OS.osoby.length);
    $('sOverenych').textContent = String(OS.osoby.filter(p => p.externi).length);
    $('sDvojrole').textContent = String(DVOJ.pocet);

    const kats = [...new Set(OS.osoby.map(p => p.kat))]
      .sort((a, b) => (KAT_LABELS[a] ?? a).localeCompare(KAT_LABELS[b] ?? b, 'cs'));
    $('dirKat').innerHTML = '<option value="all">Všechny kategorie</option>'
      + kats.map(k => `<option value="${k}">${escapeHtml(KAT_LABELS[k] ?? k)}</option>`).join('');

    $('dirSearch').addEventListener('input', e => { fQ = e.target.value; renderDir(); });
    $('dirKat').addEventListener('change', e => { fKat = e.target.value; renderDir(); });
    $('dirOverene').addEventListener('change', e => { fOverene = e.target.checked; renderDir(); });
    $('dvUhradove').addEventListener('change', e => { fJenUhradove = e.target.checked; renderDvojrole(); });

    renderDir();
    renderDvojrole();
  } catch (err) {
    console.error('ppo-osoby load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst adresář osob.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('ppoDir')) init();
