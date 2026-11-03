// Srovnávač pojišťoven — stránka Instituce (balíčky A2.1, A3.1, A3.2, A3.3 a UI k nim;
// PLAN-SROVNAVAC-ANALYTIK.md § 3).
//
// Čte data/pojistovny-instituce.json (zákon, vznik, orgány bez jmen osob, dohled, limit provozu),
// data/pojistovny-smluvni-programy.json (programy pro poskytovatele z webů a výročních zpráv),
// data/pojistovny-dostupnost.json (co pojišťovny publikují o dostupnosti péče a § 16) a pro aparát
// data/pojistovny-hospodareni-rady.json (zaměstnanci, pojištěnci na zaměstnance, využití limitu).
// Každý soubor je nepovinný: chybí-li, sekce ukáže „nedohledáno“. Načítá je a renderer volá orchestrátor
// src/pojistovny.js podle kontejnerů (#zpInstOrgany, #zpInstAparat, #zpInstProgramy, #zpInstDostupnost).
// Síť odborností (#zpSit) kreslí samostatný modul src/pojistovny-sit.js.
//
// Co se tu ukazuje, jsou fakta (kdo koho jmenuje, co pojišťovna publikuje), ne hodnocení: seřazené
// grafy nesou větu SORT_NOTE, matice jsou v pevném pořadí podle kódu, počet programů se nesčítá do
// pořadí. Jména osob v datech nejsou (třída C) a nikde se nedoplňují.
//
// Čisté funkce (testované bez DOM): kdoKratce, obsazeniText, buildOrganyRows, organyTableHtml,
// citaceHtml, zdrojeInstituceHtml, buildAparat, aparatHtml, buildProgramyMatrix, programyZpHtml,
// programyHtml, buildDostupnostMatrix, dostupnostZpHtml, dostupnostHtml, programyKarta, organyKarta,
// dostupnostKarta. DOM část: renderInstituce.

import { esc, fmtKc, dot, set, NA } from './pojistovny-shared.js';
import { rankedBars, indexedLines, dotMatrix, coverageMatrix, isNum } from './zp-viz.js';
import { initZpInteract, MOJE_EVENT } from './zp-interact.js';
import { ZP_BY_KOD } from './zp-palette.js';
import { buildFondProvoz, rokyUkazatele } from './pojistovny-penize.js';

export const SRC_INST = 'Zákony č. 551/1991 Sb. a č. 280/1992 Sb., výroční zprávy pojišťoven 2023–2025';
export const SRC_PROG = 'Weby pojišťoven (sekce pro poskytovatele) a výroční zprávy 2025';
export const SRC_DOST = 'Výroční zprávy 2023–2025 a weby pojišťoven (inventář, ověřeno 3. 11. 2026)';
const SRC_RADY = 'MZ ČR · Hodnocení vývoje systému v.z.p. 2015–2024';

const zpList = (X) => (Array.isArray(X?.pojistovny) ? X.pojistovny : []);
const byKod = (X, kod) => zpList(X).find((z) => String(z.kod) === String(kod)) || null;
/** Zkratka pojišťovny: sjednocená z palety (VoZP, ne „VoZP ČR“ z některých datasetů). */
const zk = (z) => ZP_BY_KOD[String(z?.kod)]?.zkratka || z?.zkratka || String(z?.kod ?? '');
const base = (z) => ({ kod: z.kod, label: zk(z) });
const val = (env) => (env && typeof env === 'object' && 'hodnota' in env ? env.hodnota : env);
const NEDOHLEDANO = (txt) => `<p class="zpc-na">${esc(txt)}</p>`;
const datumCz = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : String(iso ?? '');
};

// ---------------------------------------------------------------- A2.1 orgány

const KDO_KRATCE = {
  'zaměstnanci a osoby bez zdanitelných příjmů': 'zaměstnanci',
  'zaměstnavatelé a osoby samostatně výdělečně činné': 'zaměstnavatelé a OSVČ',
};
/** Krátký popisek skupiny, která orgán obsazuje (z dlouhého „kdo“ v datech). */
export const kdoKratce = (kdo) => KDO_KRATCE[String(kdo ?? '').toLowerCase()] || String(kdo ?? '');

export const PUVOD_TEXT = { statni: 'státní', resortni: 'resortní', podnikova: 'podniková', oborova: 'oborová' };

/** „10 vláda + 20 Poslanecká sněmovna“ / „5 vláda + 5 zaměstnavatelé a OSVČ + 5 zaměstnanci“; bez dat null. */
export function obsazeniText(organ) {
  const o = Array.isArray(organ?.obsazeni) ? organ.obsazeni : [];
  if (!o.length) return null;
  return o.map((x) => `${x.pocet} ${kdoKratce(x.kdo)}`).join(' + ');
}

const clenstviKratce = (n) => String(n ?? '').replace(/,\s*z\.s\.$/, '');

/** Zdroje jedné pojišťovny jako seznam {co, citace, paragraf, url} (jen ty, které mají citaci nebo paragraf). */
export function citaceZp(z) {
  const o = z?.organy || {};
  const items = [
    ['Zákon', z?.zakon?.zdroj],
    ['Vznik', z?.vznik?.zdroj],
    ['Správní rada', o.spravni_rada?.zdroj],
    ['Dozorčí rada', o.dozorci_rada?.zdroj],
    ['Ředitel', o.reditel?.zdroj],
    ['Rozhodčí orgán', o.rozhodci_organ?.zdroj],
    ['Dohled', z?.dohled?.zdroj],
    ['Limit provozu', z?.provozni_limit_pct?.zdroj],
  ];
  return items.filter(([, s]) => s && (s.citace || s.paragraf)).map(([co, s]) => ({ co, citace: s.citace || '', paragraf: s.paragraf || '', url: s.url || '' }));
}

/** Řádky tabulky orgánů: jedna pojišťovna = jeden objekt (bez jmen osob). */
export function buildOrganyRows(I) {
  return zpList(I).map((z) => {
    const o = z.organy || {};
    const sl = Array.isArray(z.vznik?.sloucene) ? z.vznik.sloucene : [];
    const roky = sl.map((s) => s.rok).filter(isNum);
    const rd = o.reditel || {};
    return {
      kod: String(z.kod), zkratka: zk(z), nazev: z.nazev,
      zakon: z.zakon?.cislo || null,
      vznik: {
        rok: z.vznik?.rok ?? null,
        puvod: PUVOD_TEXT[z.vznik?.puvod] || z.vznik?.puvod || null,
        slouceno: sl.length,
        slouceneText: sl.map((s) => `${s.nazev}${isNum(s.rok) ? ` (${s.rok})` : ''}`).join('; '),
        slouceneRozsah: roky.length ? (Math.min(...roky) === Math.max(...roky) ? String(roky[0]) : `${Math.min(...roky)}–${Math.max(...roky)}`) : '',
        poznamka: z.vznik?.poznamka || '',
      },
      spravniRada: { pocet: o.spravni_rada?.pocet ?? null, text: obsazeniText(o.spravni_rada), obdobi: o.spravni_rada?.funkcni_obdobi_let ?? null },
      dozorciRada: { pocet: o.dozorci_rada?.pocet ?? null, text: obsazeniText(o.dozorci_rada), obdobi: o.dozorci_rada?.funkcni_obdobi_let ?? null },
      reditel: { funkce: rd.funkce || null, jmenuje: rd.jmenuje || null, obdobi: rd.funkcni_obdobi_let ?? null, od: rd.ve_funkci_od ?? null },
      dohled: Array.isArray(z.dohled?.organy) ? z.dohled.organy.join(' + ') : null,
      clenstvi: (z.clenstvi || []).map((c) => clenstviKratce(c.nazev)).filter(Boolean),
      limit: isNum(z.provozni_limit_pct?.hodnota) ? { hodnota: z.provozni_limit_pct.hodnota, rok: z.provozni_limit_pct.rok } : null,
      rozhodci: o.rozhodci_organ?.existuje === true,
      citace: citaceZp(z),
    };
  });
}

const orgCell = (o) => (o.pocet == null ? NA
  : `<b>${esc(o.pocet)}</b> členů${o.text ? `<small>${esc(o.text)}</small>` : ''}${o.obdobi ? `<small>funkční období ${esc(o.obdobi)} roky</small>` : ''}`);

/** Tabulka 7 × (zákon · vznik · správní rada · dozorčí rada · ředitel · dohled · členství). */
export function organyTableHtml(I) {
  const rows = buildOrganyRows(I);
  if (!rows.length) return NEDOHLEDANO('Instituční rámec pojišťoven zatím není k dispozici (nedohledáno).');
  const head = ['Pojišťovna', 'Zákon', 'Vznik', 'Správní rada', 'Dozorčí rada', 'Ředitel', 'Dohled', 'Členství']
    .map((h, i) => `<th scope="col"${i ? ' class="zpc-txt"' : ''}>${h}</th>`).join('');
  const body = rows.map((r) => {
    const vznik = r.vznik.rok == null ? NA
      : `<b>${esc(r.vznik.rok)}</b> · ${esc(r.vznik.puvod || '')}`
        + (r.vznik.slouceno ? `<small title="${esc(r.vznik.slouceneText)}">po sloučení ${r.vznik.slouceno === 1 ? 'jedné pojišťovny' : `${r.vznik.slouceno} pojišťoven`} (${esc(r.vznik.slouceneRozsah)})</small>` : '');
    const rd = r.reditel.funkce
      ? `${esc(r.reditel.funkce)}<small>jmenuje ${esc(r.reditel.jmenuje || 'nedohledáno')}${r.reditel.obdobi ? `, na ${esc(r.reditel.obdobi)} roky` : ''}</small>`
      : NA;
    return `<tr data-zp="${esc(r.kod)}"><th scope="row" class="zpc-txt">${dot(r.kod)}${esc(r.zkratka)}</th>`
      + `<td class="zpc-txt">${r.zakon ? esc(r.zakon) : NA}</td>`
      + `<td class="zpc-txt">${vznik}</td>`
      + `<td class="zpc-txt">${orgCell(r.spravniRada)}</td>`
      + `<td class="zpc-txt">${orgCell(r.dozorciRada)}</td>`
      + `<td class="zpc-txt">${rd}</td>`
      + `<td class="zpc-txt">${r.dohled ? esc(r.dohled) : NA}</td>`
      + `<td class="zpc-txt">${r.clenstvi.length ? esc(r.clenstvi.join(', ')) : NA}</td></tr>`;
  }).join('');
  return '<div class="zpc-tbl zpc-inst-tbl" role="region" tabindex="0" aria-label="Zákon, vznik a orgány sedmi pojišťoven (tabulka, posuvná)">'
    + `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Citace a paragrafy jedné pojišťovny jako seznam; bez citací prázdný řetězec. */
export function citaceHtml(citace) {
  if (!citace?.length) return '';
  return `<ul class="zpc-inst-cit">${citace.map((c) => `<li><b>${esc(c.co)}</b>${c.paragraf ? ` · ${esc(c.paragraf)}` : ''}`
    + `${c.citace ? ` <q>${esc(c.citace)}</q>` : ''}`
    + `${c.url ? ` <a href="${esc(c.url)}" rel="noopener">zdroj</a>` : ''}</li>`).join('')}</ul>`;
}

/** Sbalené bloky pod tabulkou: citace po pojišťovnách, zdroje a paragrafy, co se nepodařilo dohledat. */
export function zdrojeInstituceHtml(I) {
  const rows = buildOrganyRows(I);
  if (!rows.length) return '';
  const cit = rows.map((r) => `<details class="zpc-acc" data-zp="${esc(r.kod)}"><summary>${dot(r.kod)}${esc(r.zkratka)}<span class="zpc-n"> · ${r.citace.length}</span></summary>`
    + `<div class="zpc-acc-body">${citaceHtml(r.citace) || '<p class="zpc-na">bez citace</p>'}`
    + `${r.vznik.poznamka ? `<p class="zpc-note">${esc(r.vznik.poznamka)}</p>` : ''}`
    + `${r.vznik.slouceneText ? `<p class="zpc-note"><b>Sloučené pojišťovny:</b> ${esc(r.vznik.slouceneText)}.</p>` : ''}</div></details>`).join('');
  const zdroje = (I.zdroje || []).map((z) => `<li>${esc(z.nazev || z.id || '')}${z.url ? ` — <a href="${esc(z.url)}" rel="noopener">${esc(z.url)}</a>` : ''}`
    + `${z.overeno ? ` <small class="zpc-na">ověřeno ${esc(datumCz(z.overeno))}</small>` : ''}</li>`).join('');
  const lim = I.limit_vzorec;
  const limHtml = lim ? `<p class="zpc-note"><b>Limit nákladů na činnost.</b> ${esc(lim.predpis)}: ${esc(lim.vzorec)}. ${esc(lim.poznamka || '')}</p>` : '';
  const chybi = (I.chybi || []).map((c) => `<li>${c.kod ? `<b>${esc(c.kod)}</b> · ` : ''}<code>${esc(c.pole)}</code> — ${esc(c.duvod)}</li>`).join('');
  return `<details class="zpc-acc"><summary>Citace a paragrafy po pojišťovnách<span class="zpc-n"> · ${rows.length}</span></summary><div class="zpc-acc-body">${cit}</div></details>`
    + `<details class="zpc-acc"><summary>Zdroje a paragrafy<span class="zpc-n"> · ${(I.zdroje || []).length}</span></summary><div class="zpc-acc-body"><ul>${zdroje}</ul>${limHtml}</div></details>`
    + (chybi ? `<details class="zpc-acc"><summary>Co se nepodařilo dohledat<span class="zpc-n"> · ${(I.chybi || []).length}</span></summary><div class="zpc-acc-body"><ul>${chybi}</ul></div></details>` : '');
}

/** Celý obsah #zpInstOrgany. */
export function organyHtml(I) {
  return organyTableHtml(I) + zdrojeInstituceHtml(I);
}

/** Karta orgánů jedné pojišťovny (profil): definiční seznam, bez jmen osob. */
export function organyKarta(I, kod) {
  const r = buildOrganyRows(I).find((x) => x.kod === String(kod));
  if (!r) return NEDOHLEDANO('Instituční rámec této pojišťovny zatím není k dispozici (nedohledáno).');
  const row = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const org = (o) => (o.pocet == null ? NA : `${esc(o.pocet)} členů${o.text ? ` (${esc(o.text)})` : ''}`);
  return '<dl class="zpc-prof-dl">'
    + row('Zákon', r.zakon ? esc(r.zakon) : NA)
    + row('Vznik', r.vznik.rok == null ? NA : `${esc(r.vznik.rok)}, ${esc(r.vznik.puvod || '')}${r.vznik.slouceno ? `, po sloučení ${r.vznik.slouceno === 1 ? 'jedné pojišťovny' : `${r.vznik.slouceno} pojišťoven`}` : ''}`)
    + row('Správní rada', org(r.spravniRada))
    + row('Dozorčí rada', org(r.dozorciRada))
    + row('Ředitel', r.reditel.funkce ? `${esc(r.reditel.funkce)}, jmenuje ${esc(r.reditel.jmenuje || 'nedohledáno')}` : NA)
    + row('Dohled', r.dohled ? esc(r.dohled) : NA)
    + row('Limit nákladů na činnost', r.limit ? `${fmtKc(r.limit.hodnota, 2)} % příjmů (${esc(r.limit.rok)})` : NA)
    + '</dl>';
}

// ---------------------------------------------------------------- aparát

/** Poslední rok, pro který má ukazatel aspoň jedna pojišťovna hodnotu. */
const posledniRok = (R, id) => { const r = rokyUkazatele(R, id); return r[r.length - 1] ?? null; };

/**
 * Tři grafy aparátu: pojištěnců na zaměstnance (pásmo = Σ pojištěnců / Σ zaměstnanců sedmi pojišťoven),
 * využití zákonného limitu přídělu na provoz (z buildFondProvoz) a vývoj počtu zaměstnanců (index).
 * Bez dat null.
 */
export function buildAparat(R) {
  if (!zpList(R).length) return null;
  const rok = posledniRok(R, 'pojistencu_na_zamestnance');
  const items = zpList(R).map((z) => {
    const v = val(z.rady?.pojistencu_na_zamestnance?.[rok]);
    const zam = val(z.rady?.zamestnanci?.[rok]);
    return { ...base(z), value: isNum(v) ? v : null, rok,
      tip: isNum(v) ? `${zk(z)}: ${fmtKc(v, 0)} pojištěnců na jednoho zaměstnance${isNum(zam) ? ` · ${fmtKc(zam, 0)} přepočtených zaměstnanců` : ''} · ${rok}` : `${zk(z)}: nedohledáno` };
  });
  let sp = 0; let sz = 0; let ok = rok != null;
  for (const z of zpList(R)) {
    const p = val(z.rady?.pojistenci_prumer?.[rok]); const zam = val(z.rady?.zamestnanci?.[rok]);
    if (!isNum(p) || !isNum(zam)) { ok = false; break; }
    sp += p; sz += zam;
  }
  const cr = ok && sz > 0 ? sp / sz : null;
  const naZam = {
    rok, items,
    opts: {
      title: `Pojištěnců na jednoho zaměstnance ${rok ?? ''}`.trim(),
      sub: 'Průměrný počet pojištěnců na jednoho přepočteného zaměstnance pojišťovny. Velikost aparátu ovlivňuje i velikost kmene, nejde o hodnocení.',
      unit: 'osob', dec: 0, source: SRC_RADY,
      ref: isNum(cr) ? { value: cr, label: 'průměr sedmi pojišťoven', kind: 'line' } : null,
    },
  };

  const roky = rokyUkazatele(R, 'zamestnanci');
  const prvni = roky[0] ?? null;
  const zamestnanci = {
    roky,
    series: zpList(R).map((z) => ({ ...base(z), points: roky.map((y) => ({ year: y, value: isNum(val(z.rady?.zamestnanci?.[y])) ? val(z.rady.zamestnanci[y]) : null })) })),
    opts: {
      title: `Zaměstnanci pojišťoven ${prvni ?? ''}–${roky[roky.length - 1] ?? ''}`.replace(/\s+/g, ' ').trim(),
      sub: `Přepočtený počet zaměstnanců, index ${prvni ?? ''} = 100; surová hodnota je v tooltipu a v tabulce.`,
      base: prvni ?? 'first', unit: 'osob', dec: 0, source: SRC_RADY,
    },
  };
  return { naZamestnance: naZam, limit: buildFondProvoz(R).provoz, zamestnanci };
}

const ODKAZ_PENIZE = '<p class="zpc-ov-more-wrap"><a class="zpc-ov-more" href="pojistovny-penize.html#fond-provoz">Celé téma: Peníze<span aria-hidden="true"> →</span></a></p>';

/** Obsah #zpInstAparat. */
export function aparatHtml(R) {
  const a = buildAparat(R);
  if (!a) return NEDOHLEDANO('Řady o zaměstnancích a provozu zatím nejsou k dispozici (nedohledáno).');
  return '<div class="zpc-charts">'
    + `<div class="zpc-chart">${rankedBars(a.naZamestnance.items, a.naZamestnance.opts)}</div>`
    + `<div class="zpc-chart">${rankedBars(a.limit.items, a.limit.opts)}</div></div>`
    + `<div class="zpc-chart">${indexedLines(a.zamestnanci.series, a.zamestnanci.opts)}</div>`
    + ODKAZ_PENIZE;
}

// ---------------------------------------------------------------- A3.2 smluvní programy

const KRITERIUM_LABEL = { kvalita: 'kvalita', dostupnost: 'dostupnost', 'e-health': 'e-health', prevence: 'prevence', ekonomika: 'ekonomika' };

/** Matice ZP × kritérium: ano = pojišťovna má aspoň jeden program se sledovaným kritériem, ne = nemá, nic nenalezeno = „—“. */
export function buildProgramyMatrix(SP) {
  const krit = Object.keys(SP?.skala?.kriteria || {});
  const cols = krit.map((k) => ({ key: k, label: KRITERIUM_LABEL[k] || k }));
  const rows = zpList(SP).map((z) => ({ ...base(z), _z: z }));
  const cell = (r, c) => {
    const progs = r._z?.programy || [];
    if (!progs.length) return null; // nic nenalezeno = „—“, ne „ne“
    return progs.some((p) => (p.kriteria || []).includes(c.key));
  };
  return { rows, cols, cell, opts: {
    title: 'Má pojišťovna program pro poskytovatele s kritériem…',
    sub: 'Ano = aspoň jeden bonifikační nebo kvalitativní program na webu či ve výroční zprávě sleduje dané kritérium. Počet programů se nesčítá do pořadí a existence programu není jeho účinek.',
    scoreLabel: 'kritérií', scoreWord: 'kritérií', source: SRC_PROG, rowHeader: 'Pojišťovna',
  } };
}

/** Seznam programů jedné pojišťovny (název s odkazem, segment, kritéria, popis, rok, citace, ověřeno). */
export function programyZpHtml(z, skala = {}) {
  const progs = z?.programy || [];
  if (!progs.length) return `<p class="zpc-na">Při uvedeném hledání nebyl nalezen žádný program${z?.web_pro_poskytovatele ? ` (<a href="${esc(z.web_pro_poskytovatele)}" rel="noopener">web pro poskytovatele</a>)` : ''}.</p>`;
  const li = progs.map((p) => {
    const seg = skala.segmenty?.[p.segment] || p.segment || '';
    const tags = (p.kriteria || []).map((k) => `<span class="zpc-tag">${esc(KRITERIUM_LABEL[k] || k)}</span>`).join('');
    const nazev = p.url ? `<a href="${esc(p.url)}" rel="noopener">${esc(p.nazev)}</a>` : esc(p.nazev);
    return `<li class="zpc-prog"><b>${nazev}</b><span class="zpc-prog-seg">${esc(seg)}${p.od_roku ? ` · od roku ${esc(p.od_roku)}` : ''}</span>`
      + `<span class="zpc-prog-tags">${tags}</span>`
      + `${p.popis ? `<span class="zpc-prog-popis">${esc(p.popis)}</span>` : ''}`
      + `${p.citace ? `<q class="zpc-prog-cit">${esc(p.citace)}</q>` : ''}`
      + `<small class="zpc-prog-meta">${p.zdroj_typ === 'vz' ? 'zdroj: výroční zpráva' : 'zdroj: web pojišťovny'}${p.overeno ? ` · ověřeno ${esc(datumCz(p.overeno))}` : ''}</small></li>`;
  }).join('');
  const pozn = (z.poznamky || []).map((n) => `<li>${esc(n)}</li>`).join('');
  return `<ul class="zpc-prog-list">${li}</ul>${pozn ? `<details class="zpc-acc"><summary>Poznámky k hledání<span class="zpc-n"> · ${(z.poznamky || []).length}</span></summary><div class="zpc-acc-body"><ul>${pozn}</ul></div></details>` : ''}`;
}

/** Obsah #zpInstProgramy: matice + seznam programů po pojišťovnách (vybraná „Moje pojišťovna“ rozbalená). */
export function programyHtml(SP, moje = null) {
  if (!zpList(SP).length) return NEDOHLEDANO('Smluvní programy pro poskytovatele zatím nejsou k dispozici (nedohledáno).');
  const m = buildProgramyMatrix(SP);
  const e = (SP.chybi || []).find((c) => /e-health/i.test(c));
  const lists = zpList(SP).map((z) => `<details class="zpc-acc" data-zp="${esc(z.kod)}"${String(z.kod) === String(moje) ? ' open' : ''}>`
    + `<summary>${dot(z.kod)}${esc(zk(z))}<span class="zpc-n"> · ${(z.programy || []).length}</span></summary>`
    + `<div class="zpc-acc-body">${programyZpHtml(z, SP.skala)}</div></details>`).join('');
  const chybi = (SP.chybi || []).map((c) => `<li>${esc(c)}</li>`).join('');
  return dotMatrix(m.rows, m.cols, m.cell, m.opts)
    + '<p class="zpc-note"><b>Existence programu není jeho účinek.</b> Matice říká, zda pojišťovna něco takového nabízí a co sleduje; hodnocení v oblasti kvalita vzniká až v semaforu po právu pojišťovny na odpověď. Ne = při hledání na webu a ve výroční zprávě nenalezeno, ne že program neexistuje.</p>'
    + (e ? `<p class="zpc-note"><b>E-health.</b> ${esc(e)}</p>` : '')
    + `<h4 class="zpc-inst-h4">Programy po pojišťovnách</h4>${lists}`
    + (chybi ? `<details class="zpc-acc"><summary>Co se nepodařilo dohledat<span class="zpc-n"> · ${(SP.chybi || []).length}</span></summary><div class="zpc-acc-body"><ul>${chybi}</ul></div></details>` : '');
}

/** Programy jedné pojišťovny pro profil. */
export function programyKarta(SP, kod) {
  const z = byKod(SP, kod);
  if (!z) return NEDOHLEDANO('Smluvní programy této pojišťovny zatím nejsou k dispozici (nedohledáno).');
  return programyZpHtml(z, SP.skala);
}

// ---------------------------------------------------------------- A3.1 dostupnost

export const STAV_DOSTUPNOST = { ano: 'ano', castecne: 'částečně', ne: 'nenalezeno' };

/** Matice ZP × 5 sloupců inventáře (ano / částečně / nenalezeno), tooltip = co pojišťovna publikuje. */
export function buildDostupnostMatrix(D, { kod = null } = {}) {
  const cols = (D?.sloupce || []).map((s) => ({ key: s.id, label: s.nazev }));
  const rows = zpList(D).filter((z) => !kod || String(z.kod) === String(kod)).map((z) => ({ ...base(z), _z: z }));
  const cell = (r, c) => {
    const x = r._z?.[c.key];
    if (!x || !STAV_DOSTUPNOST[x.stav]) return null;
    return { stav: x.stav, tip: x.co ? (x.co.length > 160 ? `${x.co.slice(0, 159)}…` : x.co) : null };
  };
  return { rows, cols, cell, opts: {
    title: 'Co pojišťovny veřejně publikují o dostupnosti péče',
    sub: 'Inventář, ne hodnocení dostupnosti: ano = konkrétní údaj se zdrojem, částečně = neúplný nebo neaktuální, nenalezeno = při uvedeném hledání nic. Stav ano u různých pojišťoven neříká totéž.',
    labels: STAV_DOSTUPNOST, source: SRC_DOST, rowHeader: 'Pojišťovna',
  } };
}

const zdrojOdkaz = (x) => {
  if (x.url) return `<a href="${esc(x.url)}" rel="noopener">odkaz</a>`;
  if (x.soubor) return `<small class="zpc-na">${esc(x.soubor)}${x.radek ? `, ř. ${esc(x.radek)}` : ''}</small>`;
  return '';
};

/** Rozpis jedné pojišťovny: pět sloupců, stav, co publikuje, zdroj (URL nebo soubor + řádek) a citace. */
export function dostupnostZpHtml(z, sloupce = []) {
  const li = sloupce.map((s) => {
    const x = z?.[s.id];
    if (!x) return `<li><b>${esc(s.nazev)}</b> — ${NA}</li>`;
    return `<li><b>${esc(s.nazev)}</b> — <span class="zpc-dost-stav" data-stav="${esc(x.stav ?? '')}">${esc(STAV_DOSTUPNOST[x.stav] || 'nedohledáno')}</span>`
      + `${x.rok ? ` <small class="zpc-na">${esc(x.rok)}</small>` : ''}`
      + `<span class="zpc-dost-co">${esc(x.co || '')}</span>`
      + `${x.citace ? `<q class="zpc-prog-cit">${esc(x.citace)}</q>` : ''}`
      + `${zdrojOdkaz(x)}</li>`;
  }).join('');
  const pozn = (z?.poznamky || []).map((n) => `<li>${esc(n)}</li>`).join('');
  return `<ul class="zpc-dost-list">${li}</ul>${pozn ? `<ul class="zpc-dost-pozn">${pozn}</ul>` : ''}`;
}

/** Obsah #zpInstDostupnost. */
export function dostupnostHtml(D) {
  if (!zpList(D).length) return NEDOHLEDANO('Inventář dostupnosti zatím není k dispozici (nedohledáno).');
  const m = buildDostupnostMatrix(D);
  const det = zpList(D).map((z) => `<details class="zpc-acc" data-zp="${esc(z.kod)}"><summary>${dot(z.kod)}${esc(zk(z))}</summary>`
    + `<div class="zpc-acc-body">${dostupnostZpHtml(z, D.sloupce)}</div></details>`).join('');
  const srov = (D.srovnatelnost || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const chybi = (D.chybi || []).map((s) => `<li>${esc(s)}</li>`).join('');
  return coverageMatrix(m.rows, m.cols, m.cell, m.opts)
    + '<p class="zpc-note">Čekací doby po pojišťovnách veřejně nejsou (nepublikuje je žádná). K jedné operaci existuje ukazatel <a href="indicator.html?id=cekaci_doba_kycel">čekací doba na kyčelní kloub</a> ze zdroje VZP ČR; v datech je zatím ilustrativní, ne ověřený údaj z VZP, a inventář ho nenahrazuje. Počty podání pojištěnců k dostupnosti a stížnosti podle § 16a jsou na stránce <a href="pojistovny-aplikace.html#zpStiznosti">Aplikace a servis</a>.</p>'
    + `<h4 class="zpc-inst-h4">Co a kde pojišťovny publikují</h4>${det}`
    + `<details class="zpc-acc"><summary>Proč se čísla nedají seřadit<span class="zpc-n"> · ${(D.srovnatelnost || []).length}</span></summary><div class="zpc-acc-body"><ul>${srov}</ul></div></details>`
    + (chybi ? `<details class="zpc-acc"><summary>Co se nepodařilo dohledat<span class="zpc-n"> · ${(D.chybi || []).length}</span></summary><div class="zpc-acc-body"><ul>${chybi}</ul></div></details>` : '');
}

/** Pět stavů jedné pojišťovny pro profil (coverageMatrix s jedním řádkem) + rozpis. */
export function dostupnostKarta(D, kod) {
  const z = byKod(D, kod);
  if (!z) return NEDOHLEDANO('Inventář dostupnosti této pojišťovny zatím není k dispozici (nedohledáno).');
  const m = buildDostupnostMatrix(D, { kod });
  return coverageMatrix(m.rows, m.cols, m.cell, { ...m.opts, title: `Co publikuje ${zk(z)} o dostupnosti péče` })
    + `<details class="zpc-acc"><summary>Co a kde<span class="zpc-n"> · ${(D.sloupce || []).length}</span></summary><div class="zpc-acc-body">${dostupnostZpHtml(z, D.sloupce)}</div></details>`;
}

// ---------------------------------------------------------------- DOM

const mojeKod = (doc) => {
  const k = doc?.querySelector?.('main')?.getAttribute?.('data-moje-zp');
  return k && ZP_BY_KOD[k] ? k : null;
};

/**
 * Vykreslí sekce stránky Instituce podle přítomných kontejnerů; chybějící dataset = „nedohledáno“.
 * Seznam programů překresluje při změně „Moje pojišťovna“ (vybraná pojišťovna je rozbalená).
 * @param {{I?: object|null, SP?: object|null, D?: object|null, R?: object|null}} data
 */
export function renderInstituce({ I = null, SP = null, D = null, R = null } = {}, doc = globalThis.document) {
  if (!doc) return;
  set('zpInstOrgany', I ? organyHtml(I) : NEDOHLEDANO('Instituční rámec pojišťoven zatím není k dispozici (nedohledáno).'));
  set('zpInstAparat', aparatHtml(R));
  set('zpInstProgramy', programyHtml(SP, mojeKod(doc)));
  set('zpInstDostupnost', dostupnostHtml(D));
  if (!renderInstituce.hook) {
    renderInstituce.hook = true;
    doc.addEventListener(MOJE_EVENT, (e) => {
      const kod = e.detail?.kod ?? null;
      doc.querySelectorAll('#zpInstProgramy details[data-zp]').forEach((d) => { d.open = !!kod && d.getAttribute('data-zp') === kod; });
    });
  }
  try { const r = initZpInteract(doc); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (_) { /* graf funguje i bez interakce */ }
}
