// Frontend logika stránky pracovni-osoba.html (?id=N) — profil osoby
// působící v pracovních/poradních orgánech MZ. Čte data/ppo.json (skupiny)
// a data/ppo-osoby.json (osoba, členství; u kurátorovaných osob i veřejné
// funkce a externí odkazy z ingest/ppo/osoby-externi.json — FÁZE 4a).
// Datové soubory staví ingest/ppo/build-web.js; detail skupiny: src/ppo-detail.js.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';
import { STAV_LABELS, KAT_LABELS, fmtDate } from './ppo.js';
import { PROF_LABELS, ROLE_ORDER } from './ppo-detail.js';

/** Členství osoby s daty skupin, role dle ROLE_ORDER, pak abecedně. */
export function membershipRows(p, skupinyById) {
  return p.clenstvi
    .map(c => ({ c, s: skupinyById.get(c.g) }))
    .filter(x => x.s)
    .sort((a, b) =>
      (ROLE_ORDER.indexOf(a.c.role) - ROLE_ORDER.indexOf(b.c.role))
      || a.s.nazev.localeCompare(b.s.nazev, 'cs'));
}

/** Kolik orgánů osoba vede ((místo)předseda). */
export function vedeCount(p) {
  return p.clenstvi.filter(c => /edsed/.test(c.role)).length;
}

const $ = id => document.getElementById(id);

function render(p, rows) {
  document.title = `${p.jmeno} · Pracovní skupiny MZ · HSPA Monitor`;
  $('poJmeno').textContent = p.jmeno;

  // lead: kurátorované veřejné funkce, jinak co o osobě říkají data portálu
  const lead = p.externi?.funkce?.length
    ? p.externi.funkce.join(' · ')
    : [p.afiliace?.[0], p.kat !== 'neuvedeno' ? KAT_LABELS[p.kat] : null]
      .filter(Boolean).join(' · ');
  $('poLead').textContent = lead;

  const meta = [];
  if (p.profese && p.profese !== 'neznamo') meta.push(PROF_LABELS[p.profese] ?? p.profese);
  for (const a of p.afiliace ?? []) meta.push(a);
  $('poMeta').innerHTML = meta.map(m => `<span>${escapeHtml(m)}</span>`).join('');

  // klíčová čísla
  const vede = vedeCount(p);
  const jednani = rows.reduce((n, x) => n + (x.s.jednani_celkem || 0), 0);
  const aktivita = rows.map(x => x.s.posledni_aktivita).filter(Boolean).sort().at(-1);
  $('poSkupin').textContent = String(rows.length);
  const roleCounts = rows.reduce((acc, x) => {
    const r = x.c.role === 'Členové' ? 'člen' : x.c.role.toLowerCase();
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  $('poRoleMeta').textContent = Object.entries(roleCounts)
    .map(([r, n]) => `${n}× ${r}`).join(' · ') || '—';
  $('poVede').textContent = String(vede);
  $('poJednani').textContent = String(jednani);
  $('poAktivita').textContent = aktivita
    ? `poslední aktivita ${fmtDate(aktivita)}` : 'bez doloženého jednání';

  const cards = [];

  // členství — odkazy na profily skupin
  cards.push(`<div class="ppo-d-card"><h3>Členství v orgánech</h3>
    <ul class="ppo-links-list">${rows.map(({ c, s: g }) => `<li>
      <div class="ppo-link-head"><a href="pracovni-skupina.html?id=${g.id}">${escapeHtml(g.nazev)}</a>
        ${c.role !== 'Členové' ? `<span class="ppo-vaha">${escapeHtml(c.role)}</span>` : ''}</div>
      <div class="ppo-link-people">${escapeHtml(STAV_LABELS[g.stav] ?? g.stav)}${g.posledni_aktivita ? ` · poslední aktivita ${escapeHtml(fmtDate(g.posledni_aktivita))}` : ' · bez doloženého jednání'}</div>
    </li>`).join('')}</ul></div>`);

  // kurátorované veřejné funkce + externí odkazy (jen ověřené veřejné zdroje)
  if (p.externi) {
    const e = p.externi;
    cards.push(`<div class="ppo-d-card"><h3>Veřejné funkce a externí zdroje</h3>
      ${e.funkce.length ? `<ul class="ppo-a-list">${e.funkce.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
      <div class="ppo-o-links">${e.odkazy.map(o =>
        `<a class="ppo-panel-cta" href="${escapeHtml(o.url)}" target="_blank" rel="noopener">${escapeHtml(o.nazev)} ↗</a>`).join('')}</div>
      ${e.overeno ? `<p class="ppo-d-note">Funkce a odkazy kurátoruje redakce z veřejných zdrojů; ověřeno k ${escapeHtml(fmtDate(e.overeno))}.</p>` : ''}
    </div>`);
  }

  $('poGrid').innerHTML = cards.join('');
}

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  const pid = Number(new URLSearchParams(location.search).get('id'));
  try {
    const [ppoRes, osRes] = await Promise.all([fetch('data/ppo.json'), fetch('data/ppo-osoby.json')]);
    if (!ppoRes.ok || !osRes.ok) throw new Error(`HTTP ${ppoRes.status}/${osRes.status}`);
    const PPO = await ppoRes.json();
    const OS = await osRes.json();
    const p = OS.osoby.find(x => x.id === pid);
    if (!p) {
      document.querySelector('main').innerHTML = renderErrorState(
        `Osoba s id=${pid || '?'} v datech není. Vraťte se na přehled pracovních skupin.`,
        new Error('not found'));
      return;
    }
    const skupinyById = new Map(PPO.skupiny.map(x => [x.id, x]));
    render(p, membershipRows(p, skupinyById));
  } catch (err) {
    console.error('ppo-osoba load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst profil osoby.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('poGrid')) init();
