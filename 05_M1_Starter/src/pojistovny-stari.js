// Srovnávač pojišťoven — stáří dat na jednom místě.
//
// Každá podstránka srovnávače ukazuje (1) pod nadpisem jednu větu „Data: CRP 2025 · MZ 2024 ·
// VZ 2024“ a (2) nad patičkou „Zdroje dat srovnávače“ sbalený blok „Stáří dat na této stránce“:
// tabulka dataset · k datu/rok · zdroj · stav. Obojí vzniká z jednoho registru (STARI_REGISTR),
// který hodnoty čte za běhu z datových souborů, jež stránka načítá (žádné natvrdo psané roky):
//   pojistovny.json   rok_crp, rok_hospodareni, system.plan_2026_*, hospodareni_2025, generated_at
//   prevence.json     pojistovny[].rok_vz, pojistovny[].reserse.datum
//   aplikace.json     roky ze zdroje[].nazev a uzivatele.rok, generated_at
//   otazky.json       generated_at, version
//   sit.json          ref_datum, rok, stav
//   stiznosti.json    stav_k, pojistovny[].roky[].rok
//   opendata.json     stav_k
//   vek.json          rok (zatím ho žádná stránka nenačítá, řádek se proto nikde nezobrazí)
//   hospodareni-rady.json  roky[] (MZ Hodnocení 2015–2024), prerozdeleni.json  mesice[] (1/2019 až poslední měsíc),
//   segmenty.json     roky[] (náklady podle segmentů); všechny tři jsou na stránce Peníze
//   instituce.json, smluvni-programy.json, dostupnost.json  stav_k (stránka Instituce)
// Řádek, jehož soubor stránka nenačetla, se vynechá. Míchají-li se na stránce dva roky téže
// veličiny (např. náklady 2024 a 2025, výroční zprávy o prevenci 2020/2024/2025), blok přidá
// varování — srovnání pojišťoven patří jen do jednoho roku.
//
// Čisté funkce (testované bez DOM): stariRadky, stariVarovani, stariVeta, stariVetaHtml,
// stariDatHtml. DOM část: renderStariDat (volá ji init v src/pojistovny.js).

import { esc, loadJson, datumCz } from './pojistovny-shared.js';

export const ZP_DATASETY = {
  pojistovny: 'data/pojistovny.json',
  prevence: 'data/pojistovny-prevence.json',
  aplikace: 'data/pojistovny-aplikace.json',
  otazky: 'data/pojistovny-otazky.json',
  sit: 'data/pojistovny-sit.json',
  stiznosti: 'data/pojistovny-stiznosti.json',
  opendata: 'data/pojistovny-opendata.json',
  vek: 'data/pojistovny-vek.json',
  hospodareniRady: 'data/pojistovny-hospodareni-rady.json',
  prerozdeleni: 'data/pojistovny-prerozdeleni.json',
  segmenty: 'data/pojistovny-segmenty.json',
  instituce: 'data/pojistovny-instituce.json',
  smluvniProgramy: 'data/pojistovny-smluvni-programy.json',
  dostupnost: 'data/pojistovny-dostupnost.json',
  porodniAsistence: 'data/pojistovny-porodni-asistence.json',
  fondPravidla: 'data/pojistovny-fond-pravidla.json',
};

/** Datasety, které stránka načítá mimo orchestrátor (src/pojistovny.js) vlastním modulem. */
export const STARI_DOPLNEK = { instituce: ['sit'], aplikace: ['stiznosti', 'opendata'], prevence: ['fondPravidla'] };

/** Pojmenování veličin pro varování (klíč `velicina` v registru). */
export const STARI_VELICINY = {
  kmen: 'Počty pojištěnců',
  hospodareni: 'Příjmy, náklady a hospodářský výsledek',
  vzPrevence: 'Odpovědi z výročních zpráv o prevenci',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const uniq = (arr) => [...new Set(arr.filter(isNum))].sort((a, b) => a - b);
const isoDen = (s) => String(s ?? '').slice(0, 10);
const rozsah = (a) => (a.length === 0 ? '' : a.length === 1 || a[0] === a[a.length - 1] ? String(a[0]) : `${a[0]}–${a[a.length - 1]}`);
const vyjmenuj = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} a ${a[a.length - 1]}` : a.join(''));
const POJ_STAV = { 'pracovni-navrh': 'pracovní návrh' };

const sestaven = (ds) => (ds?.generated_at ? `soubor sestaven ${datumCz(isoDen(ds.generated_at))}` : '');
const stavPoj = (d) => [POJ_STAV[d?.stav] || d?.stav || '', sestaven(d)].filter(Boolean).join(' · ');
const roky = (text) => [...String(text ?? '').matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));

/**
 * Registr řádků. `vyber(dataset)` vrací {kDatu, kratce, roky, stav, zdroj?} nebo null, když
 * dataset daný údaj nemá. `stranky` = na kterých stránkách se údaj ukazuje (id ze ZP_STRANKY nebo `profil`
 * = pojistovna.html, která není záložka; prázdné = žádná, řádek vznikne jen při volání bez `strana`). `velicina` seskupuje řádky pro
 * detekci míchání roků: varování vzniká, když řádky jedné veličiny nesou aspoň dva různé roky.
 */
export const STARI_REGISTR = [
  {
    id: 'crp', dataset: 'pojistovny', velicina: 'kmen', stranky: ['prehled', 'kmen', 'profil'],
    nazev: 'Kmen pojištěnců', zdroj: 'ÚZIS ČR · Centrální registr pojištěnců (OIS 11-47)',
    vyber: (d) => (isNum(d?.rok_crp) ? { kDatu: String(d.rok_crp), kratce: `CRP ${d.rok_crp}`, roky: [d.rok_crp], stav: stavPoj(d) } : null),
  },
  {
    id: 'hosp', dataset: 'pojistovny', velicina: 'hospodareni', stranky: ['prehled', 'kmen', 'penize', 'profil'],
    nazev: 'Hospodaření pojišťoven', zdroj: 'MZ ČR + MF · Hodnocení vývoje systému v.z.p.',
    vyber: (d) => (isNum(d?.rok_hospodareni) ? { kDatu: String(d.rok_hospodareni), kratce: `MZ ${d.rok_hospodareni}`, roky: [d.rok_hospodareni], stav: stavPoj(d) } : null),
  },
  {
    id: 'hosp25', dataset: 'pojistovny', velicina: 'hospodareni', stranky: ['kmen'],
    nazev: 'Hospodaření z výročních zpráv 2025', zdroj: 'Výroční zprávy pojišťoven',
    vyber: (d) => {
      const zps = d?.pojistovny || [];
      const maji = zps.filter((z) => z?.hospodareni_2025 && typeof z.hospodareni_2025 === 'object' && Object.keys(z.hospodareni_2025).length);
      if (!maji.length) return null;
      const r = uniq(maji.flatMap((z) => Object.values(z.hospodareni_2025).map((v) => v?.rok)));
      const rok = r.length ? r : [2025];
      return { kDatu: rozsah(rok), kratce: `VZ ${rozsah(rok)}`, roky: rok, stav: `u ${maji.length} ze ${zps.length} pojišťoven (${maji.map((z) => z.zkratka).join(', ')})` };
    },
  },
  {
    id: 'zpp', dataset: 'pojistovny', velicina: 'plan2026', stranky: ['prehled', 'kmen', 'penize', 'profil'],
    nazev: 'Zdravotně pojistné plány 2026', zdroj: 'Poslanecká sněmovna · sněmovní tisk 280',
    vyber: (d) => (isNum(d?.system?.plan_2026_vydaje_mld) ? { kDatu: '2026 (plán)', kratce: 'ZPP 2026', roky: [2026], stav: stavPoj(d) } : null),
  },
  {
    id: 'prevence', dataset: 'prevence', velicina: 'vzPrevence', stranky: ['prehled', 'prevence', 'profil'],
    nazev: 'Prevence: odpovědi z výročních zpráv a fond prevence', zdroj: 'Výroční zprávy pojišťoven; nabídka z webů pojišťoven (redakční rešerše)',
    vyber: (p) => {
      const zps = (p?.pojistovny || []).filter((z) => isNum(z?.rok_vz));
      if (!zps.length) return null;
      const cetnost = new Map();
      for (const z of zps) cetnost.set(z.rok_vz, (cetnost.get(z.rok_vz) || 0) + 1);
      const hlavni = [...cetnost.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
      const vyjimky = zps.filter((z) => z.rok_vz !== hlavni).map((z) => `${z.zkratka} ${z.rok_vz}`);
      const text = `${hlavni}${vyjimky.length ? ` (${vyjimky.join(', ')})` : ''}`;
      const dny = (p.pojistovny || []).map((z) => isoDen(z?.reserse?.datum)).filter(Boolean).sort();
      const rese = dny.length ? `rešerše webů ${dny[0] === dny[dny.length - 1] ? datumCz(dny[0]) : `${datumCz(dny[0])} až ${datumCz(dny[dny.length - 1])}`}` : '';
      return { kDatu: text, kratce: `VZ ${text}`, roky: uniq(zps.map((z) => z.rok_vz)), stav: [rese, 'stupně nabídky jsou redakční odhad'].filter(Boolean).join(' · ') };
    },
  },
  {
    id: 'aplikace', dataset: 'aplikace', velicina: 'aplikace', stranky: ['prehled', 'aplikace', 'gramotnost', 'profil'],
    nazev: 'Aplikace pojišťoven a rizikové skupiny', zdroj: 'Analýza digitalizace (interní) a výroční zprávy pojišťoven',
    vyber: (a) => {
      const r = uniq([...(a?.zdroje || []).flatMap((z) => roky(z?.nazev)), ...(a?.aplikace || []).map((x) => x?.uzivatele?.rok)]);
      if (!r.length) return null;
      return { kDatu: rozsah(r), kratce: `aplikace ${rozsah(r)}`, roky: [], stav: sestaven(a) };
    },
  },
  {
    id: 'otazky', dataset: 'otazky', velicina: 'otazky', stranky: ['gramotnost', 'metodika'],
    nazev: 'Sady otázek a dotazníků', zdroj: 'Pracovní skupina · docs/pojistovny-dotazniky.md',
    vyber: (o) => (o?.generated_at ? { kDatu: datumCz(isoDen(o.generated_at)), kratce: `otázky ${datumCz(isoDen(o.generated_at))}`, roky: [], stav: o.version ? `verze ${o.version}` : '' } : null),
  },
  {
    id: 'sit', dataset: 'sit', velicina: 'sit', stranky: ['instituce'],
    nazev: 'Síť smluvních odborností', zdroj: 'NRPZS (ÚZIS) a číselník IČZ pojišťoven (NZIP)',
    vyber: (s) => {
      const rok = isNum(s?.rok) ? s.rok : (s?.ref_datum ? Number(isoDen(s.ref_datum).slice(0, 4)) : null);
      if (!s?.ref_datum && !isNum(rok)) return null;
      const kDatu = s.ref_datum ? datumCz(isoDen(s.ref_datum)) : String(rok);
      return { kDatu, kratce: `NRPZS ${isNum(rok) ? rok : kDatu}`, roky: isNum(rok) ? [rok] : [], stav: [s.stav, sestaven(s)].filter(Boolean).join(' · ') };
    },
  },
  {
    id: 'stiznosti', dataset: 'stiznosti', velicina: 'stiznosti', stranky: ['aplikace', 'profil'],
    nazev: 'Stížnosti a podněty na dostupnost', zdroj: 'Výroční zprávy pojišťoven (§ 16a zákona 106/1999 Sb., § 40 zákona 48/1997 Sb.)',
    vyber: (s) => {
      if (!s?.stav_k) return null;
      const r = uniq((s.pojistovny || []).flatMap((z) => (z?.roky || []).map((x) => x?.rok)));
      return { kDatu: `stav k ${datumCz(s.stav_k)}${r.length ? ` (VZ ${rozsah(r)})` : ''}`, kratce: `stížnosti k ${datumCz(s.stav_k)}`, roky: [], stav: 'každá pojišťovna počítá něco jiného, nesrovnávat v žebříčku' };
    },
  },
  {
    id: 'opendata', dataset: 'opendata', velicina: 'opendata', stranky: ['aplikace'],
    nazev: 'Otevřená data pojišťoven (audit)', zdroj: 'Weby pojišťoven, NKOD (data.gov.cz), výroční zprávy',
    vyber: (o) => (o?.stav_k ? { kDatu: `stav k ${datumCz(o.stav_k)}`, kratce: `open data k ${datumCz(o.stav_k)}`, roky: [], stav: o.version ? `verze ${o.version}` : '' } : null),
  },
  {
    id: 'hospodareniRady', dataset: 'hospodareniRady', velicina: 'hospodareniRady', stranky: ['penize', 'kmen', 'instituce', 'profil'],
    nazev: 'Řady hospodaření 2015–2024', zdroj: 'MZ ČR + MF · Hodnocení vývoje systému v.z.p. (tabulková příloha a PDF)',
    vyber: (r) => {
      const r2 = uniq(r?.roky || []);
      return r2.length ? { kDatu: rozsah(r2), kratce: `MZ ${rozsah(r2)}`, roky: [], stav: sestaven(r) } : null;
    },
  },
  {
    id: 'prerozdeleni', dataset: 'prerozdeleni', velicina: 'prerozdeleni', stranky: ['penize', 'prehled', 'profil'],
    nazev: 'Přerozdělení pojistného', zdroj: 'MZ ČR · Přerozdělování pojistného na v.z.p. (měsíční PDF)',
    vyber: (p) => {
      const m = Array.isArray(p?.mesice) ? p.mesice : [];
      if (!m.length) return null;
      const lab = (x) => { const mt = /^(\d{4})-(\d{2})$/.exec(String(x)); return mt ? `${Number(mt[2])}/${mt[1]}` : String(x); };
      const rozpeti = `${lab(m[0])}–${lab(m[m.length - 1])}`;
      return { kDatu: rozpeti, kratce: `přerozdělení ${rozpeti}`, roky: [], stav: [isNum(p.posledni_rok_rocni) ? `roční saldo za ${p.posledni_rok_rocni}` : '', sestaven(p)].filter(Boolean).join(' · ') };
    },
  },
  {
    id: 'segmenty', dataset: 'segmenty', velicina: 'segmenty', stranky: ['penize', 'profil'],
    nazev: 'Náklady podle segmentů', zdroj: 'MZ ČR + MF · Hodnocení vývoje systému v.z.p., tab. č. 3 a 3a',
    vyber: (x) => {
      const r2 = uniq((Array.isArray(x?.roky) ? x.roky : []).map(Number));
      return r2.length ? { kDatu: rozsah(r2), kratce: `segmenty ${rozsah(r2)}`, roky: [], stav: sestaven(x) } : null;
    },
  },
  {
    id: 'instituce', dataset: 'instituce', velicina: 'instituce', stranky: ['instituce', 'profil'],
    nazev: 'Zákon, vznik a orgány pojišťoven', zdroj: 'Zákony č. 551/1991 Sb. a č. 280/1992 Sb., výroční zprávy pojišťoven 2023–2025',
    vyber: (d) => (d?.stav_k ? { kDatu: `stav k ${datumCz(d.stav_k)}`, kratce: `instituce k ${datumCz(d.stav_k)}`, roky: [], stav: sestaven(d) } : null),
  },
  {
    id: 'smluvniProgramy', dataset: 'smluvniProgramy', velicina: 'smluvniProgramy', stranky: ['instituce', 'profil'],
    nazev: 'Smluvní programy pro poskytovatele', zdroj: 'Weby pojišťoven (sekce pro poskytovatele), výroční zprávy 2025',
    vyber: (d) => (d?.stav_k ? { kDatu: `weby k ${datumCz(d.stav_k)}`, kratce: `programy k ${datumCz(d.stav_k)}`, roky: [], stav: 'existence programu není jeho účinek' } : null),
  },
  {
    id: 'dostupnost', dataset: 'dostupnost', velicina: 'dostupnost', stranky: ['instituce', 'profil'],
    nazev: 'Co pojišťovny publikují o dostupnosti', zdroj: 'Výroční zprávy 2023–2025 a weby pojišťoven (inventář)',
    vyber: (d) => (d?.stav_k ? { kDatu: `stav k ${datumCz(d.stav_k)}`, kratce: `dostupnost k ${datumCz(d.stav_k)}`, roky: [], stav: 'nenalezeno neznamená, že údaj pojišťovna nemá' } : null),
  },
  {
    id: 'porodniAsistence', dataset: 'porodniAsistence', velicina: 'porodniAsistence', stranky: ['profil'],
    nazev: 'Návštěvy porodní asistentky po porodu (výkon 06211)', zdroj: 'ÚZIS ČR · Národní registr hrazených zdravotních služeb (datový požadavek)',
    vyber: (x) => {
      const o = Array.isArray(x?.obdobi) ? x.obdobi : [];
      if (!o.length) return null;
      const q = (s) => String(s).replace(/^(\d{4})Q(\d)$/, 'Q$2 $1');
      return { kDatu: `${q(o[0])}–${q(o[o.length - 1])}`, kratce: `ÚZIS 06211 ${q(o[o.length - 1])}`, roky: [], stav: (x.predbezne || []).length ? `${(x.predbezne || []).map(q).join(' a ')} předběžně · ${sestaven(x)}` : sestaven(x) };
    },
  },
  {
    id: 'fondPravidla', dataset: 'fondPravidla', velicina: 'fondPravidla', stranky: ['prevence'],
    nazev: 'Pravidla čerpání fondu prevence a kontroly', zdroj: 'Weby pojišťoven (podmínky 2026), NKÚ, MZ ČR (Hodnocení kap. 4.4), zákony č. 551/1991 Sb. a č. 280/1992 Sb.',
    vyber: (d) => (d?.stav_k ? { kDatu: `weby k ${datumCz(d.stav_k)}`, kratce: `pravidla fondu k ${datumCz(d.stav_k)}`, roky: [], stav: 'podmínky platné v roce 2026, pojišťovny je během roku mění' } : null),
  },
  {
    id: 'vek', dataset: 'vek', velicina: 'kmen', stranky: [],
    nazev: 'Věková a pohlavní struktura kmene', zdroj: 'ÚZIS ČR · Centrální registr pojištěnců (OIS 11-47)',
    vyber: (v) => (isNum(v?.rok) ? { kDatu: String(v.rok), kratce: `věk ${v.rok}`, roky: [v.rok], stav: sestaven(v) } : null),
  },
];

/**
 * Řádky stáří dat pro stránku.
 * @param {Record<string, object|null>} datasety  klíče z ZP_DATASETY (pojistovny, prevence, …); null/chybí = nenačteno
 * @param {string|null} [strana]  id stránky; bez něj se berou všechny řádky, jejichž dataset je k dispozici
 * @returns {Array<{id, velicina, dataset, nazev, kDatu, zdroj, stav, kratce, roky}>}
 */
export function stariRadky(datasety, strana = null) {
  const ds = datasety || {};
  const out = [];
  for (const r of STARI_REGISTR) {
    if (strana && !r.stranky.includes(strana)) continue;
    const data = ds[r.dataset];
    if (data == null) continue;
    let v = null;
    try { v = r.vyber(data); } catch (_) { v = null; }
    if (!v) continue;
    out.push({ id: r.id, velicina: r.velicina, dataset: r.dataset, nazev: r.nazev, zdroj: v.zdroj || r.zdroj, kDatu: v.kDatu, stav: v.stav || '', kratce: v.kratce, roky: v.roky || [] });
  }
  return out;
}

/**
 * Varování: veličina, jejíž řádky nesou aspoň dva různé roky. Vrací věty (prostý text).
 * @returns {string[]}
 */
export function stariVarovani(radky) {
  const skupiny = new Map();
  for (const r of radky || []) {
    if (!r.roky?.length) continue;
    const g = skupiny.get(r.velicina) || { roky: new Set(), kratce: [] };
    r.roky.forEach((y) => g.roky.add(y));
    g.kratce.push(r.kratce);
    skupiny.set(r.velicina, g);
  }
  const out = [];
  for (const [velicina, g] of skupiny) {
    if (g.roky.size < 2) continue;
    const label = STARI_VELICINY[velicina] || velicina;
    out.push(`${label} jsou na této stránce z více let (${vyjmenuj([...g.roky].sort((a, b) => a - b))}): ${g.kratce.join(' · ')}. Pojišťovny porovnávejte jen v rámci jednoho roku.`);
  }
  return out;
}

/** Jedna věta pod nadpisem: „Data: CRP 2025 · MZ 2024 · VZ 2024“ (prázdný text bez řádků). */
export function stariVeta(radky) {
  const k = (radky || []).map((r) => r.kratce).filter(Boolean);
  return k.length ? `Data: ${k.join(' · ')}` : '';
}

export function stariVetaHtml(radky) {
  const v = stariVeta(radky);
  return v ? `<p class="zpc-stari">${esc(v)}</p>` : '';
}

/** Sbalený blok „Stáří dat na této stránce“ (prázdný řetězec, když není co ukázat). */
export function stariDatHtml(datasety, { strana = null } = {}) {
  const radky = stariRadky(datasety, strana);
  if (!radky.length) return '';
  const warn = stariVarovani(radky);
  const rows = radky.map((r) => `<tr data-stari="${esc(r.id)}"><th scope="row" class="zpc-txt">${esc(r.nazev)}</th>`
    + `<td class="zpc-txt">${esc(r.kDatu)}</td><td class="zpc-txt">${esc(r.zdroj)}</td><td class="zpc-txt">${esc(r.stav)}</td></tr>`).join('');
  return `<details class="zpc-acc zpc-stari-acc"><summary>Stáří dat na této stránce<span class="zpc-n"> · ${radky.length}${warn.length ? ' · míchají se roky' : ''}</span></summary>`
    + '<div class="zpc-acc-body">'
    + warn.map((w) => `<p class="zpc-stari-warn" role="note"><b>Pozor, míchají se roky.</b> ${esc(w)}</p>`).join('')
    + '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Stáří dat na této stránce (tabulka, posuvná)"><table>'
    + '<thead><tr><th scope="col" class="zpc-txt">Dataset</th><th scope="col" class="zpc-txt">K datu / rok</th><th scope="col" class="zpc-txt">Zdroj</th><th scope="col" class="zpc-txt">Stav</th></tr></thead>'
    + `<tbody>${rows}</tbody></table></div></div></details>`;
}

/**
 * Vykreslí větu pod nadpis (.zpc-stari) a blok nad patičku Zdroje (#zpStari před #zpZdroje).
 * Datasety, které stránka načítá mimo orchestrátor (STARI_DOPLNEK), dočte přes sdílenou cache
 * loadJson (stejný fetch, který použije modul stránky).
 * @param {{datasety?: object, strana?: string, doc?: Document}} [opt]
 * @returns {Promise<{radky: Array, varovani: string[]}>}
 */
export async function renderStariDat({ datasety = {}, strana, doc = globalThis.document } = {}) {
  if (!doc) return { radky: [], varovani: [] };
  const tema = strana || doc.getElementById('zpShell')?.dataset?.aktivni || null;
  const ds = { ...datasety };
  const doplnit = (STARI_DOPLNEK[tema] || []).filter((n) => ds[n] == null);
  const nacteno = await Promise.all(doplnit.map((n) => loadJson(ZP_DATASETY[n])));
  doplnit.forEach((n, i) => { ds[n] = nacteno[i]; });
  const radky = stariRadky(ds, tema);

  const old = doc.querySelector('p.zpc-stari');
  if (old) old.remove();
  const veta = stariVetaHtml(radky);
  const head = doc.querySelector('.zpc-mod-head');
  if (veta && head) head.insertAdjacentHTML('afterend', veta);
  else if (veta) doc.querySelector('.ed-hero-content')?.insertAdjacentHTML('beforeend', veta);

  const foot = doc.getElementById('zpZdroje');
  if (foot) {
    let host = doc.getElementById('zpStari');
    if (!host) {
      host = doc.createElement('div');
      host.id = 'zpStari';
      host.className = 'zpc-stari-wrap';
      foot.parentNode.insertBefore(host, foot);
    }
    host.innerHTML = stariDatHtml(ds, { strana: tema });
  }
  return { radky, varovani: stariVarovani(radky) };
}
