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

/** Obsah karty „Vazby členů a pravidla" pro jeden orgán (čistá funkce).
 *  Vrací null, když o orgánu nic nevíme — prázdná karta je horší než žádná.
 *
 *  ŽELEZNÉ PRAVIDLO (PROMPT_STRET_ZAJMU_ROUTINE.md §0/§6): jednotkou sdělení
 *  je ORGÁN, ne člověk. Karta nikoho nejmenuje, nehodnotí a neobviňuje —
 *  popisuje, kolik členů má doloženou vazbu a co s tím orgán (ne)dělá.
 *  Každé číslo nese jmenovatel, protože ověřit šlo jen část členů. */
export function coiKarta(c) {
  if (!c) return null;
  const znameCokoli = c.clenu_overeno > 0 || c.ma_statut_v_korpusu || c.deklarace_v_zapisech > 0;
  if (!znameCokoli) return null;
  return {
    clenu: c.clenu,
    overeno: c.clenu_overeno,
    sVazbou: c.s_vazbou,
    sRelevantni: c.s_relevantni_vazbou,
    maPravidlo: c.ma_pravidlo_ve_statutu === true,
    maStatut: c.ma_statut_v_korpusu === true,
    pravidloUrl: c.pravidlo_doklad?.url ?? null,
    deklarace: c.deklarace_v_zapisech ?? 0,
    hlasovani: c.rozhodnuti_s_hlasovanim ?? 0,
    // stav pravidla se hlásí třístavově — „statut nemáme" NENÍ „pravidlo chybí"
    stavPravidla: c.ma_pravidlo_ve_statutu ? 'ma'
      : (c.ma_statut_v_korpusu ? 'nema' : 'nevime'),
  };
}

const COI_PRAVIDLO_TEXT = {
  ma: 'Statut nebo jednací řád orgánu střet zájmů výslovně upravuje.',
  nema: 'Statut ani jednací řád orgánu o střetu zájmů nic neříká — není tedy pravidlo, které by šlo porušit.',
  nevime: 'Statut orgánu nemáme ve strojově čitelné podobě, takže o jeho pravidlech nemůžeme nic tvrdit.',
};

function renderCoi(c) {
  const k = coiKarta(c);
  if (!k) return '';
  const pomer = k.overeno
    ? `<p class="ppo-a-p"><b>${k.sRelevantni}</b> z <b>${k.overeno}</b> ověřených členů má doloženou vazbu,
       která se týká agendy tohoto orgánu${k.sVazbou !== k.sRelevantni
        ? ` (nějakou doloženou vazbu má ${k.sVazbou} z nich)` : ''}.
       Orgán má celkem ${k.clenu} ${osobaWord(k.clenu)}; ověřit šlo ${k.overeno}.</p>`
    : `<p class="ppo-a-p">U tohoto orgánu nemáme ověřeného žádného člena, takže o vazbách jeho členů
       nic netvrdíme. Orgán má ${k.clenu} ${osobaWord(k.clenu)}.</p>`;
  return `<div class="ppo-d-card ppo-coi"><h3>Vazby členů a pravidla střetu zájmů</h3>
    <p class="ppo-coi-lead">Vazba na vnější subjekt <b>není překážka členství</b> — odbornost ji nutně nese.
      Smyslem je, aby se o ní vědělo a dala se ošetřit.</p>
    ${pomer}
    <p class="ppo-a-p ppo-coi-rule ppo-coi-rule-${k.stavPravidla}">${COI_PRAVIDLO_TEXT[k.stavPravidla]}
      ${k.pravidloUrl ? `<a href="${escapeHtml(k.pravidloUrl)}" rel="external noopener">Dokument →</a>` : ''}</p>
    <p class="ppo-a-p">${k.deklarace
      ? `V zápisech jsme napočítali <b>${k.deklarace}</b> jednání, kde střet zájmů zazněl.`
      : 'V žádném z analyzovaných zápisů střet zájmů nezazněl.'}${k.hlasovani
      ? ` Hlasování je doloženo u ${k.hlasovani} rozhodnutí.` : ''}</p>
    <p class="ppo-d-note">Vazby dohledáváme jen u členů s veřejným profilem na Hlídači státu a jen ve
      veřejných zdrojích; rejstřík vidí formální vazby, ne zaměstnání či honoráře — <b>chybějící vazba
      v datech neznamená, že vazba neexistuje</b>. Zápisy neuvádějí jmenovité hlasování, takže o hlasování
      jednotlivých členů nevypovídáme.</p>
  </div>`;
}

/** Souhrn úkolů skupiny pro kartu na detailu (čistá funkce — testovatelná). */
export function ukolySouhrn(a) {
  return {
    otevrene: a.profil?.otevrene_ukoly ?? [],
    zadanych: (a.jednani ?? []).reduce((n, j) => n + (j.ukoly ?? []).length, 0),
  };
}

/** Řádky časové osy úkolů (čistá funkce): jen úkoly s datovaným zadáním
 *  a termínem či dokladem osudu — graf nesmí předstírat znalost, kterou nemá. */
export function ganttData(a, limit = 30) {
  const rows = [];
  for (const j of a.jednani ?? []) {
    if (!j.datum) continue;
    for (const u of j.ukoly ?? []) {
      const t = u.t && u.t > j.datum ? u.t : null;
      // externí výsledek je dokladem splnění jen s primy (publikace navazujícího
      // výstupu neprokazuje provedení mezikroku)
      const extPrimy = u.ext?.stav === 'vydano' && u.ext.primy;
      const rawSd = u.sd ?? (extPrimy ? u.ext.datum : null) ?? null;
      const sd = rawSd && rawSd > j.datum ? rawSd : null;
      if (!sd && !t) continue;
      rows.push({
        co: u.co,
        start: j.datum,
        t,
        sd,
        stav: extPrimy ? 'splneno' : (u.stav ?? null),
      });
    }
  }
  rows.sort((x, y) => y.start.localeCompare(x.start) || x.co.localeCompare(y.co, 'cs'));
  const shown = rows.slice(0, limit);
  const dates = shown.flatMap(r => [r.start, r.t, r.sd].filter(Boolean));
  return {
    rows: shown,
    total: rows.length,
    min: dates.length ? dates.reduce((a2, b) => (a2 < b ? a2 : b)) : null,
    max: dates.length ? dates.reduce((a2, b) => (a2 > b ? a2 : b)) : null,
  };
}

/** SVG časové osy úkolů (zadáno → termín/doklad splnění). */
function renderGantt(g) {
  const W = 1000, LAB = 360, ROW = 24, TOP = 20;
  const day = d => Date.parse(d);
  const span = Math.max(day(g.max) - day(g.min), 86400000 * 60);
  const x = d => LAB + ((day(d) - day(g.min)) / span) * (W - LAB - 14);
  const H = TOP + g.rows.length * ROW + 8;

  // roční gridlines
  const y0 = Number(g.min.slice(0, 4)) + 1, y1 = Number(g.max.slice(0, 4));
  let grid = '';
  for (let y = y0; y <= y1; y++) {
    const gx = x(`${y}-01-01`);
    grid += `<line class="ppo-g-grid" x1="${gx.toFixed(1)}" y1="${TOP - 6}" x2="${gx.toFixed(1)}" y2="${H - 4}"/>`
      + `<text class="ppo-g-year" x="${gx.toFixed(1)}" y="${TOP - 9}">${y}</text>`;
  }

  const rows = g.rows.map((r, i) => {
    const y = TOP + i * ROW + ROW / 2;
    const sx = x(r.start);
    const parts = [
      `<text class="ppo-g-lab" x="0" y="${y + 3.5}">${escapeHtml(r.co.length > 52 ? r.co.slice(0, 51) + '…' : r.co)}<title>${escapeHtml(r.co)}</title></text>`,
      `<circle class="ppo-g-start" cx="${sx.toFixed(1)}" cy="${y}" r="3"/>`,
    ];
    if (r.sd) {
      parts.push(`<line class="ppo-g-bar${r.stav === 'pokracuje' ? ' ppo-g-dash' : ''}" x1="${sx.toFixed(1)}" y1="${y}" x2="${x(r.sd).toFixed(1)}" y2="${y}"/>`);
      parts.push(`<circle class="${r.stav === 'splneno' ? 'ppo-g-done' : 'ppo-g-runend'}" cx="${x(r.sd).toFixed(1)}" cy="${y}" r="${r.stav === 'splneno' ? 4.5 : 3}"/>`);
    }
    if (r.t) {
      if (!r.sd) parts.push(`<line class="ppo-g-plan" x1="${sx.toFixed(1)}" y1="${y}" x2="${x(r.t).toFixed(1)}" y2="${y}"/>`);
      parts.push(`<line class="ppo-g-tick" x1="${x(r.t).toFixed(1)}" y1="${y - 5}" x2="${x(r.t).toFixed(1)}" y2="${y + 5}"><title>termín dle zápisu</title></line>`);
    }
    return parts.join('');
  }).join('');

  return `<svg class="ppo-gantt" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Časová osa úkolů: zadání, termíny a doložená splnění">${grid}${rows}</svg>
  <p class="ppo-g-legend"><span><svg width="26" height="10"><circle cx="5" cy="5" r="3" class="ppo-g-start"/><line class="ppo-g-plan" x1="8" y1="5" x2="20" y2="5"/><line class="ppo-g-tick" x1="20" y1="0" x2="20" y2="10"/></svg> zadáno → termín</span>
    <span><svg width="26" height="10"><line class="ppo-g-bar" x1="2" y1="5" x2="18" y2="5"/><circle class="ppo-g-done" cx="20" cy="5" r="4"/></svg> doložené splnění</span>
    <span><svg width="26" height="10"><line class="ppo-g-bar ppo-g-dash" x1="2" y1="5" x2="18" y2="5"/><circle class="ppo-g-runend" cx="20" cy="5" r="3"/></svg> pokračuje (poslední stopa)</span></p>`;
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
  const uk = ukolySouhrn(a);
  if (uk.otevrene.length || uk.zadanych) {
    grid.push(`<div class="ppo-d-card"><h3>Otevřené úkoly</h3>
      ${uk.otevrene.length ? `<ul class="ppo-a-list">${uk.otevrene.slice(0, 6).map(u => `<li>${escapeHtml(u.co)}${u.kdo ? ` <i>(${escapeHtml(u.kdo)})</i>` : ''}</li>`).join('')}</ul>
        ${uk.otevrene.length > 6 ? `<p class="ppo-d-note">…a ${uk.otevrene.length - 6} dalších otevřených úkolů.</p>` : ''}`
        : '<p class="ppo-a-p">Analýza zápisů žádný otevřený úkol neeviduje.</p>'}
      <p class="ppo-a-src"><a href="pracovni-ukoly.html?skupina=${a.group_id}">Všech ${uk.zadanych} úkolů zadaných na jednáních — v dashboardu úkolů →</a></p>
    </div>`);
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

  const gantt = ganttData(a);
  if (gantt.rows.length >= 3) {
    parts.push(`<h3 class="ppo-a-h" id="ukTimeline">Časová osa úkolů <span class="ppo-a-count">${gantt.rows.length}${gantt.total > gantt.rows.length ? ` z ${gantt.total}` : ''}</span></h3>
      <div class="ppo-gantt-wrap">${renderGantt(gantt)}</div>
      <p class="ppo-d-note">Jen úkoly s datovaným zadáním a termínem či doloženým osudem${gantt.total > gantt.rows.length ? ` (${gantt.rows.length} nejnovějších z ${gantt.total})` : ''};
      splnění značíme výhradně tam, kde ho pozdější zápis nebo externí zdroj výslovně zachycuje —
      úkol bez značky není nesplněný. Vše ostatní v <a href="pracovni-ukoly.html?skupina=${a.group_id}">dashboardu úkolů</a>.</p>`);
  }

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

  // kurátorované souvislosti se zbytkem webu (FÁZE 4b, skupiny-souvislosti.json)
  if (s.souvislosti?.length) {
    cards.push(`<div class="ppo-d-card"><h3>Souvislosti na webu</h3>
      <ul class="ppo-links-list">${s.souvislosti.map(o => `<li>
        <div class="ppo-link-head"><a href="${escapeHtml(o.url)}">${escapeHtml(o.nazev)}</a></div>
      </li>`).join('')}</ul></div>`);
  }

  // agenda orgánu ve Věstníku MZ (deterministický match z archivu věstníků)
  if (s.vestnik?.length) {
    cards.push(`<div class="ppo-d-card"><h3>Ve Věstníku MZ</h3>
      <ul class="ppo-links-list">${s.vestnik.map(o => `<li>
        <div class="ppo-link-head"><a href="${escapeHtml(o.url)}" target="_blank" rel="noopener">${escapeHtml(o.t)}</a></div>
        <div class="ppo-link-sub">${escapeHtml(o.titul)}</div>
      </li>`).join('')}</ul>
      ${s.vestnik_celkem > s.vestnik.length ? `<p class="ppo-d-note">…a ${s.vestnik_celkem - s.vestnik.length} dalších položek.</p>` : ''}
      <a class="ppo-panel-cta" href="vestniky-mz.html">Archiv Věstníků MZ →</a></div>`);
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
    // ověřený veřejný profil (FÁZE 4a kurátorský registr) — malý externí odkaz
    const hs = p.externi?.odkazy?.find(o => o.url.startsWith('https://www.hlidacstatu.cz/'));
    return `<li><strong><a href="pracovni-osoba.html?id=${p.id}">${escapeHtml(p.jmeno)}</a></strong>${sub ? ` <span class="ppo-role">${escapeHtml(sub)}</span>` : ''}${hs ? ` <a class="ppo-hs" href="${escapeHtml(hs.url)}" target="_blank" rel="noopener" title="Ověřený veřejný profil na Hlídači státu">Hlídač&nbsp;↗</a>` : ''}</li>`;
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
    // vazby členů a pravidla střetu zájmů — líně z lehkého řezu (bez pole osoby)
    fetch('data/ppo-coi-souhrn.json')
      .then(r => (r.ok ? r.json() : null))
      .then(coi => {
        const html = coi && renderCoi(coi.skupiny.find(x => x.g === s.id));
        // #ppoDetGrid je stabilní kotva hlavního renderu; .ppo-d-grid vzniká
        // jen u orgánů s analýzou zápisů, takže by karta u většiny zmizela
        if (html) $('ppoDetGrid')?.insertAdjacentHTML('beforeend', html);
      })
      .catch(err => console.error('ppo-coi load failed:', err));
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
