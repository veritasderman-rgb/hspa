// Frontend logika stránky pracovni-skupina.html (?id=N) — profil jednoho
// pracovního/poradního orgánu MZ. Čte data/ppo.json (skupina, hrany, kalendář)
// a data/ppo-osoby.json (jména členů + sdílené osoby na hranách).
// Datové soubory staví ingest/ppo/build-web.js; hub: src/ppo.js.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';
import { STAV_LABELS, KAT_LABELS, fmtDate } from './ppo.js';

export const PROF_LABELS = {
  lekar: 'lékaři',
  zubni_lekar: 'zubní lékaři',
  farmaceut: 'farmaceuti',
  pravnik: 'právníci',
  sestra_nelekar_zdrav: 'sestry a nelékařští zdravotníci',
  nelekar_vs: 'VŠ nelékaři (Ing., Mgr., …)',
  veterinar: 'veterinární lékaři',
  bez_titulu: 'bez titulu',
  neznamo: 'neurčeno',
};

export const ROLE_ORDER = ['Předseda', 'Místopředseda', 'Tajemník', 'Členové', 'Hosté'];

/** Členové skupiny gid z ppo-osoby.json, setřídění rolí dle ROLE_ORDER. */
export function membersOf(osoby, gid) {
  return osoby
    .map(p => ({ p, c: p.clenstvi.find(c => c.g === gid) }))
    .filter(x => x.c)
    .sort((a, b) =>
      (ROLE_ORDER.indexOf(a.c.role) - ROLE_ORDER.indexOf(b.c.role))
      || a.p.jmeno.localeCompare(b.p.jmeno, 'cs'));
}

/** Hrany dotýkající se gid, sestupně podle váhy. */
export function edgesOf(hrany, gid) {
  return hrany
    .filter(h => h.a === gid || h.b === gid)
    .map(h => ({ gid: h.a === gid ? h.b : h.a, vaha: h.vaha, osoby: h.osoby }))
    .sort((a, b) => b.vaha - a.vaha || a.gid - b.gid);
}

const $ = id => document.getElementById(id);

function osobaWord(n) { return n === 1 ? 'osoba' : n < 5 ? 'osoby' : 'osob'; }

function render(PPO, OS, s) {
  const skupinyById = new Map(PPO.skupiny.map(x => [x.id, x]));
  const osobyById = new Map(OS.osoby.map(p => [p.id, p]));

  document.title = `${s.nazev} · Pracovní skupiny MZ · HSPA Monitor`;
  $('ppoDetSekce').textContent = s.sekce ?? s.gesce ?? '—';
  $('ppoDetHeadline').textContent = s.nazev;
  $('ppoDetUcel').textContent = s.ucel || s.predmet || '';

  const meta = [];
  if (s.predseda?.jmeno) meta.push(`předsedá ${s.predseda.jmeno}`);
  if (s.zrizeni) meta.push(`zřízena ${s.zrizeni}`);
  if (s.utvar) meta.push(s.utvar);
  meta.push(STAV_LABELS[s.stav] ?? s.stav);
  $('ppoDetMeta').innerHTML = meta.map(m => `<span>${escapeHtml(m)}</span>`).join('');

  const edges = edgesOf(PPO.sit.hrany, s.id);
  $('dClenu').textContent = String(s.pocet_clenu);
  $('dRoleMeta').textContent = Object.entries(s.role ?? {})
    .map(([r, n]) => `${n}× ${r.toLowerCase()}`).join(' · ') || '—';
  $('dJednani').textContent = String(s.jednani_celkem || 0);
  $('dAktivita').textContent = s.posledni_aktivita
    ? `poslední aktivita ${fmtDate(s.posledni_aktivita)}` : 'bez doloženého jednání';
  $('dVazeb').textContent = String(edges.length);
  $('dDokumenty').textContent = `${s.dokumenty_celkem ?? 0} dokumentů na portálu`;

  const cards = [];

  // účel + předmět (plné znění, pokud se liší od leadu)
  if (s.predmet && s.predmet !== s.ucel) {
    cards.push(`<div class="ppo-d-card"><h3>Předmět činnosti</h3>
      <p style="margin:0;font-size:13.5px;line-height:1.55">${escapeHtml(s.predmet)}</p></div>`);
  }

  // jednání po letech
  const roky = Object.entries(s.jednani_roky ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (roky.length) {
    const max = Math.max(...roky.map(([, n]) => n));
    cards.push(`<div class="ppo-d-card"><h3>Jednání po letech</h3>
      <div class="ppo-years">${roky.map(([y, n]) =>
        `<div class="ppo-year"><b>${n}</b><i style="height:${Math.max(4, n / max * 62)}px" title="${y}: ${n} jednání"></i><span>’${y.slice(2)}</span></div>`
      ).join('')}</div>
      <p class="ppo-d-note">Jen jednání doložená zveřejněným zápisem.</p></div>`);
  }

  // profesní složení
  const prof = Object.entries(s.profese ?? {}).sort((a, b) => b[1] - a[1]);
  if (prof.length) {
    const max = Math.max(...prof.map(([, n]) => n));
    cards.push(`<div class="ppo-d-card"><h3>Profesní složení</h3>
      <div class="ppo-prof">${prof.map(([k, n]) =>
        `<span>${escapeHtml(PROF_LABELS[k] ?? k)}</span><span class="ppo-prof-bar"><i style="width:${(n / max * 100).toFixed(0)}%"></i></span><span class="num">${n}</span>`
      ).join('')}</div>
      <p class="ppo-d-note">Odvozeno z titulů ve jmenném seznamu — orientační.</p></div>`);
  }

  // napojené skupiny se jmény sdílených členů
  if (edges.length) {
    const items = edges.slice(0, 10).map(e => {
      const t = skupinyById.get(e.gid);
      const names = (e.osoby ?? []).map(pid => osobyById.get(pid)?.jmeno).filter(Boolean);
      return `<li>
        <div class="ppo-link-head"><a href="pracovni-skupina.html?id=${e.gid}">${escapeHtml(t?.nazev ?? String(e.gid))}</a>
          <span class="ppo-vaha">${e.vaha}&nbsp;${osobaWord(e.vaha)}</span></div>
        ${names.length ? `<div class="ppo-link-people">${escapeHtml(names.join(' · '))}</div>` : ''}
      </li>`;
    }).join('');
    cards.push(`<div class="ppo-d-card"><h3>Sdílí členy se skupinami</h3>
      <ul class="ppo-links-list">${items}</ul>
      ${edges.length > 10 ? `<p class="ppo-d-note">…a dalších ${edges.length - 10} skupin se slabší vazbou.</p>` : ''}</div>`);
  }

  // dokumenty na portálu
  const doky = Object.entries(s.dokumenty_typy ?? {}).filter(([k]) => k !== 'jine').sort((a, b) => b[1] - a[1]);
  cards.push(`<div class="ppo-d-card"><h3>Na portálu ministerstva</h3>
    <p style="margin:0 0 10px;font-size:13.5px">${doky.length
      ? doky.map(([k, n]) => `${n}× ${escapeHtml(k)}`).join(' · ')
      : 'bez kategorizovaných dokumentů'}${(s.dokumenty_typy?.jine ? ` · ${s.dokumenty_typy.jine}× ostatní` : '')}</p>
    <a class="ppo-panel-cta" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">Primární zdroj: ppo.mzcr.cz ↗</a></div>`);

  $('ppoDetGrid').innerHTML = cards.join('');

  // členové
  const members = membersOf(OS.osoby, s.id);
  $('ppoMembers').innerHTML = members.map(({ p, c }) => {
    const aff = p.afiliace?.[0] ?? (p.kat && p.kat !== 'neuvedeno' ? KAT_LABELS[p.kat] : null);
    const role = c.role === 'Členové' ? null : c.role;
    const sub = [role, aff].filter(Boolean).join(' · ');
    return `<li><strong>${escapeHtml(p.jmeno)}</strong>${sub ? ` <span class="ppo-role">${escapeHtml(sub)}</span>` : ''}</li>`;
  }).join('');
}

async function init() {
  renderModuleNav('strategies');
  renderMastheadDate();
  const gid = Number(new URLSearchParams(location.search).get('id'));
  try {
    const [ppoRes, osRes] = await Promise.all([fetch('data/ppo.json'), fetch('data/ppo-osoby.json')]);
    if (!ppoRes.ok || !osRes.ok) throw new Error(`HTTP ${ppoRes.status}/${osRes.status}`);
    const PPO = await ppoRes.json();
    const OS = await osRes.json();
    const s = PPO.skupiny.find(x => x.id === gid);
    if (!s) {
      document.querySelector('main').innerHTML = renderErrorState(
        `Skupina s id=${gid || '?'} v datech není. Kompletní seznam je na přehledu.`,
        new Error('not found'));
      return;
    }
    render(PPO, OS, s);
  } catch (err) {
    console.error('ppo-detail load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst profil skupiny.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('ppoDetGrid')) init();
