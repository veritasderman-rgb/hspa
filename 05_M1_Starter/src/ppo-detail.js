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

/* ── FÁZE 2 analýza zápisů (data/ppo-analyza/{id}.json, líně) ─────── */

/** COI události napříč jednáními (nejnovější první, jak jdou v datech). */
export function coiEvents(jednani) {
  return (jednani ?? []).flatMap(j =>
    (j.stret_zajmu ?? []).map(s => ({ datum: j.datum, url: j.url, text: s })));
}

const STAV_TEMA = stav =>
  /^rozhodnuto/.test(stav) ? 'ok' : /^usnulo/.test(stav) ? 'off' : 'run';

function renderAnalyza(a) {
  const p = a.profil ?? {};
  const parts = [];

  if (p.co_dela) {
    parts.push(`<div class="ppo-a-prose">${String(p.co_dela).split(/\n{2,}/)
      .map(t => `<p>${escapeHtml(t)}</p>`).join('')}</div>`);
  }

  const grid = [];
  if (p.hlavni_temata?.length) {
    grid.push(`<div class="ppo-d-card"><h3>Hlavní témata</h3>
      <ul class="ppo-a-temata">${p.hlavni_temata.map(t => `<li>
        <span class="ppo-a-stav ppo-a-stav-${STAV_TEMA(String(t.stav ?? ''))}">${escapeHtml(t.stav ?? '?')}</span>
        <strong>${escapeHtml(t.tema)}</strong>${t.obdobi ? ` <i>${escapeHtml(t.obdobi)}</i>` : ''}
      </li>`).join('')}</ul></div>`);
  }
  if (p.co_se_pripravuje?.length) {
    grid.push(`<div class="ppo-d-card"><h3>Co se připravuje</h3>
      <ul class="ppo-a-list">${p.co_se_pripravuje.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`);
  }
  const coi = coiEvents(a.jednani);
  if (p.transparentnost?.hodnoceni || p.stret_zajmu_procesni || coi.length) {
    const t = p.transparentnost ?? {};
    grid.push(`<div class="ppo-d-card"><h3>Transparentnost a střet zájmů</h3>
      ${t.hodnoceni ? `<p class="ppo-a-p">${escapeHtml(t.hodnoceni)}</p>` : ''}
      ${p.stret_zajmu_procesni ? `<p class="ppo-a-p">${escapeHtml(p.stret_zajmu_procesni)}</p>` : ''}
      ${coi.length ? `<ul class="ppo-a-list ppo-a-coi">${coi.slice(0, 8).map(e =>
        `<li><b>${escapeHtml(fmtDate(e.datum))}</b> ${escapeHtml(e.text)}</li>`).join('')}</ul>
        ${coi.length > 8 ? `<p class="ppo-d-note">…a ${coi.length - 8} dalších záznamů v zápisech.</p>` : ''}` : ''}
    </div>`);
  }
  if (grid.length) parts.push(`<div class="ppo-d-grid">${grid.join('')}</div>`);

  const jed = (a.jednani ?? []).filter(j => j.temata.length || j.rozhodnuti.length);
  if (jed.length) {
    parts.push(`<h3 class="ppo-a-h">Doložená jednání <span class="ppo-a-count">${jed.length}</span></h3>
      <div class="ppo-a-jednani">${jed.map(j => `<details>
        <summary><b>${escapeHtml(fmtDate(j.datum))}</b>
          <span>${escapeHtml(j.temata.slice(0, 3).join(' · ') || '—')}${j.temata.length > 3 ? ' …' : ''}</span></summary>
        ${j.rozhodnuti.length ? `<p class="ppo-a-sub">Rozhodnutí a závěry</p>
          <ul class="ppo-a-list">${j.rozhodnuti.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
        ${j.ukoly.length ? `<p class="ppo-a-sub">Uložené úkoly</p>
          <ul class="ppo-a-list">${j.ukoly.map(u => `<li>${escapeHtml(u.co)}${u.kdo ? ` <i>(${escapeHtml(u.kdo)})</i>` : ''}${u.termin ? ` — ${escapeHtml(u.termin)}` : ''}</li>`).join('')}</ul>` : ''}
        ${j.url ? `<p class="ppo-a-src"><a href="${escapeHtml(j.url)}" target="_blank" rel="noopener">Zdrojový zápis na ppo.mzcr.cz ↗</a></p>` : ''}
      </details>`).join('')}</div>`);
  }

  if (!parts.length) return;
  $('ppoAnalyza').innerHTML = parts.join('');
  $('ppoAnalyzaSec').hidden = false;
}

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
      const names = (e.osoby ?? [])
        .map(pid => ({ pid, jmeno: osobyById.get(pid)?.jmeno }))
        .filter(x => x.jmeno);
      return `<li>
        <div class="ppo-link-head"><a href="pracovni-skupina.html?id=${e.gid}">${escapeHtml(t?.nazev ?? String(e.gid))}</a>
          <span class="ppo-vaha">${e.vaha}&nbsp;${osobaWord(e.vaha)}</span></div>
        ${names.length ? `<div class="ppo-link-people">${names.map(n =>
          `<a href="pracovni-osoba.html?id=${n.pid}">${escapeHtml(n.jmeno)}</a>`).join(' · ')}</div>` : ''}
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
    return `<li><strong><a href="pracovni-osoba.html?id=${p.id}">${escapeHtml(p.jmeno)}</a></strong>${sub ? ` <span class="ppo-role">${escapeHtml(sub)}</span>` : ''}</li>`;
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
    // analýza zápisů (FÁZE 2) se dotahuje líně a její výpadek stránku nerozbije
    if (s.analyza) {
      try {
        const aRes = await fetch(`data/ppo-analyza/${s.id}.json`);
        if (aRes.ok) renderAnalyza(await aRes.json());
      } catch (err) {
        console.error('ppo-analyza load failed:', err);
      }
    }
  } catch (err) {
    console.error('ppo-detail load failed:', err);
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      renderErrorState('Nepodařilo se načíst profil skupiny.', err));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('ppoDetGrid')) init();
