// Srovnávač pojišťoven — stránka Peníze (balíčky A1.2–A1.6, PLAN-SROVNAVAC-ANALYTIK.md).
//
// Čte data/pojistovny-prerozdeleni.json (relativní saldo přerozdělení, výběr měsíc po měsíci),
// data/pojistovny-hospodareni-rady.json (řady MZ 2015–2024) a data/pojistovny-segmenty.json
// (náklady podle segmentů). Každý soubor je nepovinný: chybí-li, sekce ukáže „nedohledáno“.
// Načítá je a renderer volá orchestrátor src/pojistovny.js podle kontejnerů na stránce
// (#zpPrerozdeleni, #zpRady, #zpStatni, #zpSegmenty, #zpFondProvoz).
//
// Co se tu ukazuje, jsou fakta zákonem daného mechanismu a vykázaná čísla MZ, ne hodnocení
// pojišťoven: seřazené grafy nesou větu SORT_NOTE, tabulky jsou v pevném pořadí podle kódu.
//
// Čisté funkce (testované bez DOM): buildSaldoChart, buildPodilyPredPo, buildSaldoTabulka,
// saldoTabulkaHtml, buildVyberMesicni, vyberMesicniHtml, UKAZATELE, rokyUkazatele,
// buildRadyChart, buildStatni, statniKarta, buildSegmenty, buildFondProvoz, stavZUrl,
// stavDoUrl, prepinacRokuHtml, radyHtml. DOM část: renderPenize.

import { esc, fmtKc, dot, set } from './pojistovny-shared.js';
import { rankedBars, segmentedBar, indexedLines, dumbbell, isNum } from './zp-viz.js';
import { initZpInteract, MOJE_EVENT } from './zp-interact.js';
import { ZP_BY_KOD } from './zp-palette.js';
import { mesicX, mesicLabel, xLabel } from './pojistovny-kmen-mesicni.js';

export const SRC_PRER = 'MZ ČR · Přerozdělování pojistného na v.z.p. (PDF, měsíční a roční)';
export const SRC_RADY = 'MZ ČR · Hodnocení vývoje systému v.z.p. 2015–2024';
export const SRC_SEG = 'MZ ČR · Hodnocení vývoje systému v.z.p. · tab. č. 3 a 3a (náklady ZFZP, akruálně)';
const KOD_VZP = '111';

/** Číslo se znaménkem (typografické minus, plus u kladných) a jednotkou. */
export function sg(v, dec = 1, unit = '') {
  if (!isNum(v)) return 'nedohledáno';
  const body = fmtKc(Math.abs(v), dec);
  const z = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${z}${body}${unit ? ` ${unit}` : ''}`;
}

const zpList = (X) => (Array.isArray(X?.pojistovny) ? X.pojistovny : []);
const base = (z) => ({ kod: z.kod, label: z.zkratka });
const val = (env) => (env && typeof env === 'object' && 'hodnota' in env ? env.hodnota : env);

// ---------------------------------------------------------------- A1.2 přerozdělení

/** Rok grafů přerozdělení = poslední rok s 12 měsíci (z dat, ne natvrdo). */
export function rokPrerozdeleni(PR) {
  const r = PR?.posledni_rok_rocni;
  return isNum(r) ? r : null;
}

/** Diverging rankedBars: relativní saldo přerozdělení po pojišťovnách (mld Kč). */
export function buildSaldoChart(PR) {
  const rok = rokPrerozdeleni(PR);
  const items = zpList(PR).map((z) => {
    const r = z.rocne?.[rok] || {};
    const v = isNum(r.saldo_relativni_mld) ? r.saldo_relativni_mld : null;
    const tip = v == null ? `${z.zkratka}: nedohledáno`
      : `${z.zkratka}: ${sg(v, 1, 'mld Kč')} · ${sg(r.saldo_relativni_pct_vybraneho, 1, '%')} vybraného pojistného`
        + `${isNum(r.saldo_relativni_na_pojistence_kc) ? ` · ${sg(r.saldo_relativni_na_pojistence_kc, 0, 'Kč')} na pojištěnce` : ''} · ${rok}`;
    return { ...base(z), value: v, rok, tip };
  });
  return {
    rok,
    items,
    opts: {
      title: `Relativní saldo přerozdělení ${rok ?? ''} po pojišťovnách`.replace(/\s+/g, ' ').trim(),
      sub: 'O kolik pojišťovna dostala víc (+) nebo míň (−), než kdyby se celý objem po přerozdělení rozdělil v poměru jejího podílu na vybraném pojistném. Součet je nula. Je to fakt zákonného mechanismu, ne hodnocení.',
      unit: 'mld Kč', dec: 1, allowNegative: true, signed: true, source: SRC_PRER,
    },
  };
}

/** Dva segmentedBary: podíl na vybraném pojistném vs. na částce po přerozdělení (týž rok). */
export function buildPodilyPredPo(PR) {
  const rok = rokPrerozdeleni(PR);
  const mk = (klic, title, sub) => ({
    parts: zpList(PR).map((z) => ({ ...base(z), value: isNum(z.rocne?.[rok]?.[klic]) ? z.rocne[rok][klic] : null, rok })),
    opts: { title: `${title} ${rok ?? ''}`.trim(), sub, unit: 'mld Kč', dec: 1, maxParts: 7, source: SRC_PRER },
  });
  return {
    rok,
    pred: mk('vybrano_mld', 'Podíl na vybraném pojistném', 'Kolik pojistného pojišťovna vybrala (tzv. 100% výběr). Vybrané pojistné není příjem pojišťovny.'),
    po: mk('po_prerozdeleni_mld', 'Podíl na částce po přerozdělení', 'Kolik jí po přerozdělení připadlo. Rozdíl proti pruhu nahoře je právě saldo.'),
  };
}

/** Roční relativní saldo v % vybraného pojistného: řádky v pevném pořadí podle kódu. */
export function buildSaldoTabulka(PR) {
  const posl = rokPrerozdeleni(PR);
  const roky = [...new Set(zpList(PR).flatMap((z) => Object.keys(z.rocne || {}).map(Number)))]
    .filter((y) => isNum(posl) ? y <= posl : true).sort((a, b) => a - b);
  const radky = zpList(PR).map((z) => ({
    kod: z.kod,
    zkratka: z.zkratka,
    bunky: roky.map((y) => {
      const r = z.rocne?.[y] || {};
      return { rok: y, pct: isNum(r.saldo_relativni_pct_vybraneho) ? r.saldo_relativni_pct_vybraneho : null, mld: isNum(r.saldo_relativni_mld) ? r.saldo_relativni_mld : null };
    }),
  }));
  return { roky, radky };
}

export function saldoTabulkaHtml(PR) {
  const t = buildSaldoTabulka(PR);
  if (!t.roky.length || !t.radky.length) return '<p class="zpc-na">Roční saldo zatím není k dispozici (nedohledáno).</p>';
  const head = `<tr><th scope="col">Pojišťovna</th>${t.roky.map((y) => `<th scope="col">${y}</th>`).join('')}</tr>`;
  const body = t.radky.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row">${dot(r.kod)}${esc(r.zkratka)}</th>${r.bunky.map((b) => (b.pct == null
    ? '<td class="zpc-num"><span class="zpc-na">—</span></td>'
    : `<td class="zpc-num" title="${esc(`${r.zkratka} ${b.rok}: ${sg(b.mld, 1, 'mld Kč')}`)}">${esc(sg(b.pct, 1))}</td>`)).join('')}</tr>`).join('');
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Relativní saldo přerozdělení v procentech vybraného pojistného podle let (tabulka, posuvná)">'
    + `<table><caption class="sr-only">Relativní saldo přerozdělení v % vybraného pojistného, ${t.roky[0]}–${t.roky[t.roky.length - 1]}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`
    + `<p class="zpc-cap">Saldo v % vybraného pojistného dané pojišťovny, ${t.roky[0]}–${t.roky[t.roky.length - 1]} (roky s dvanácti měsíci). Pevné pořadí podle kódu pojišťovny, nejde o hodnocení. Najetím na buňku uvidíte saldo v mld Kč. ${esc(SRC_PRER)}.</p>`;
}

/** Režimy přepínače měsíčního výběru. */
export const VYBER_REZIMY = [
  { id: 'vse', label: 'Všech 7' },
  { id: 'bez-vzp', label: 'Bez VZP ČR' },
];

/** Měsíční výběr pojistného: 7 (nebo 6) sérií, index prvního měsíce = 100, značky osy po lednech. */
export function buildVyberMesicni(PR, rezim = 'vse') {
  const mesice = Array.isArray(PR?.mesice) ? PR.mesice : [];
  const zps = zpList(PR).filter((z) => rezim !== 'bez-vzp' || String(z.kod) !== KOD_VZP);
  const series = zps.map((z) => ({
    ...base(z),
    points: mesice.map((m, i) => ({ year: mesicX(m), value: isNum(z.vybrano?.[i]) ? z.vybrano[i] : null })),
  }));
  const prvniRok = mesice.length ? Number(mesice[0].slice(0, 4)) : 0;
  const ticks = mesice.filter((m) => m.endsWith('-01') && (Number(m.slice(0, 4)) - prvniRok) % 2 === 0).map((m) => ({ x: mesicX(m), label: m.slice(0, 4) }));
  const prvni = mesice[0];
  const posledni = mesice[mesice.length - 1];
  return {
    series,
    opts: {
      title: 'Výběr pojistného měsíc po měsíci (index 1/2019 = 100)',
      sub: `Pojistné vybrané každou pojišťovnou (tzv. 100% výběr) vůči ${prvni ? mesicLabel(prvni) : 'prvnímu měsíci'} (= 100), ${prvni ? mesicLabel(prvni) : ''} až ${posledni ? mesicLabel(posledni) : ''}. Měsíční výkyvy jsou velké (výběr kolísá během roku), sledujte spíš směr řady.`
        + `${rezim === 'bez-vzp' ? ' Bez VZP ČR; osa je proto jemnější.' : ''}`,
      base: mesice.length ? mesicX(mesice[0]) : 'first',
      unit: 'tis. Kč', dec: 0,
      xFmt: xLabel, xHead: 'Měsíc', xTicks: ticks,
      source: SRC_PRER,
    },
  };
}

export function vyberMesicniHtml(PR, rezim = 'vse') {
  const ch = buildVyberMesicni(PR, rezim);
  return indexedLines(ch.series, ch.opts);
}

// ---------------------------------------------------------------- přepínače

/** Radiogroup z tlačítek (roving tabindex); `attr` je název data-atributu s id volby. */
export function radioHtml(label, moznosti, aktualni, attr) {
  const btn = (m) => {
    const on = String(m.id) === String(aktualni);
    return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" ${attr}="${esc(m.id)}">${esc(m.label)}</button>`;
  };
  return `<div class="zpc-switch" role="radiogroup" aria-label="${esc(label)}">${(moznosti || []).map(btn).join('')}</div>`;
}

/** Přepínač roku (A4.3 ho později zobecní). */
export function prepinacRokuHtml(roky, rok) {
  return radioHtml('Rok', (roky || []).map((y) => ({ id: y, label: String(y) })), rok, 'data-rok');
}

export function prepinacVyberuHtml(rezim) {
  return radioHtml('Rozsah grafu', VYBER_REZIMY, rezim, 'data-vyber');
}

// ---------------------------------------------------------------- A1.1 řady hospodaření

/**
 * Ukazatele přepínače řad. `typ: 'index'` = indexedLines (základ 2015 = 100, surová hodnota v tooltipu a tabulce),
 * `'bary'` = rankedBars za zvolený rok (procenta a salda, kde index nedává smysl). `cr` = přidat řadu ČR
 * (jen u ukazatelů na pojištěnce / poměrů; součty by index ČR nevysvětlil).
 */
export const UKAZATELE = [
  { id: 'naklady_na_pojistence_kc', typ: 'index', cr: true, label: 'Náklady na zdravotní služby na pojištěnce', unit: 'Kč', dec: 0,
    sub: 'Náklady ZFZP (akruálně) na jednoho pojištěnce a rok, nestandardizováno na věk.' },
  { id: 'prijmy_celkem_mld', typ: 'index', cr: false, label: 'Příjmy celkem', unit: 'mld Kč', dec: 1,
    sub: 'Příjmy pojišťovny po přerozdělení.' },
  { id: 'naklady_zs_mld', typ: 'index', cr: false, label: 'Náklady na zdravotní služby', unit: 'mld Kč', dec: 1,
    sub: 'Náklady na zdravotní služby čerpané z ZFZP (akruálně).' },
  { id: 'provozni_naklady_pct', typ: 'bary', cr: false, label: 'Výdaje na vlastní činnost, % výdajů celkem', unit: '%', dec: 1,
    sub: 'Podíl výdajů na vlastní činnost na výdajích celkem (MZ, jen 2018–2024). Neshoduje se se zákonným limitem nákladů na činnost.' },
  { id: 'statni_pojistenci_pct', typ: 'bary', cr: false, label: 'Státní pojištěnci, % kmene', unit: '%', dec: 1,
    sub: 'Za státní pojištěnce (děti, důchodci, nezaměstnaní…) platí pojistné stát (MZ, jen 2018–2024).' },
  { id: 'zustatek_bu_zfzp_mld', typ: 'bary', cr: false, label: 'Zůstatek na bankovním účtu ZFZP k 31. 12.', unit: 'mld Kč', dec: 1,
    sub: 'Zůstatek na bankovním účtu základního fondu zdravotního pojištění ke konci roku.' },
  { id: 'hospodarsky_vysledek_mld', typ: 'bary', cr: false, label: 'Hospodářský výsledek (saldo příjmů a výdajů)', unit: 'mld Kč', dec: 1, signed: true,
    sub: 'Saldo příjmů a výdajů celkem; záporné hodnoty doleva od nuly.' },
  { id: 'fond_prevence_na_pojistence_kc', typ: 'index', cr: true, label: 'Fond prevence na pojištěnce', unit: 'Kč', dec: 0,
    sub: 'Čerpání fondu prevence na pojištěnce. Kontext, ne hlavní ukazatel (rozhodnutí PS 7. 10. 2026).' },
  { id: 'pojistencu_na_zamestnance', typ: 'index', cr: true, label: 'Pojištěnců na zaměstnance', unit: 'osob', dec: 0,
    sub: 'Průměrný počet pojištěnců na jednoho (přepočteného) zaměstnance pojišťovny (jen 2018–2024).' },
];

export const UKAZATEL_VYCHOZI = 'naklady_na_pojistence_kc';
export const ukazatelById = (id) => UKAZATELE.find((u) => u.id === id) || null;

/** Řada pojišťovny / ČR pro ukazatel: [{year, value}]. */
function radaBody(radyObj, id, roky) {
  return roky.map((y) => ({ year: y, value: isNum(val(radyObj?.[id]?.[y])) ? val(radyObj[id][y]) : null }));
}

/** Roky, pro které má aspoň jedna pojišťovna hodnotu ukazatele (vzestupně). */
export function rokyUkazatele(R, id) {
  const roky = Array.isArray(R?.roky) ? R.roky : [];
  return roky.filter((y) => zpList(R).some((z) => isNum(val(z.rady?.[id]?.[y]))));
}

/** ČR hodnota za rok: z cr.rady, u podílu státních pojištěnců jinak vážený průměr sedmi pojišťoven (pojištěnci). */
export function crHodnota(R, id, rok) {
  const c = val(R?.cr?.rady?.[id]?.[rok]);
  if (isNum(c)) return { value: c, label: 'ČR', odvozeno: false };
  if (id === 'statni_pojistenci_pct') {
    let st = 0; let po = 0;
    for (const z of zpList(R)) {
      const s = val(z.rady?.statni_pojistenci?.[rok]); const p = val(z.rady?.pojistenci_prumer?.[rok]);
      if (!isNum(s) || !isNum(p)) return null;
      st += s; po += p;
    }
    return po > 0 ? { value: (st / po) * 100, label: 'průměr sedmi pojišťoven', odvozeno: true } : null;
  }
  return null;
}

/**
 * Graf pro zvolený ukazatel a rok. Index: {typ:'index', series, opts}; bary: {typ:'bary', items, opts, roky, rok}.
 * Neznámý ukazatel padá na výchozí; rok mimo dostupné roky na poslední dostupný.
 */
export function buildRadyChart(R, ukazatel, rok) {
  const u = ukazatelById(ukazatel) || ukazatelById(UKAZATEL_VYCHOZI);
  const roky = rokyUkazatele(R, u.id);
  const allRoky = Array.isArray(R?.roky) ? R.roky : [];
  if (u.typ === 'index') {
    const series = zpList(R).map((z) => ({ ...base(z), points: radaBody(z.rady, u.id, allRoky) }));
    if (u.cr && allRoky.some((y) => isNum(val(R?.cr?.rady?.[u.id]?.[y])))) {
      series.push({ key: 'cr', label: 'ČR', points: radaBody(R.cr.rady, u.id, allRoky) });
    }
    const prvni = roky[0];
    return {
      typ: 'index', ukazatel: u, roky, rok: null, series,
      opts: {
        title: `${u.label} ${roky[0] ?? ''}–${roky[roky.length - 1] ?? ''}`.replace(/\s+/g, ' ').trim(),
        sub: `${u.sub} Index ${prvni ?? ''} = 100; surová hodnota je v tooltipu a v tabulce.`,
        base: prvni ?? 'first', unit: u.unit, dec: u.dec, source: SRC_RADY,
      },
    };
  }
  const r = roky.includes(Number(rok)) ? Number(rok) : roky[roky.length - 1];
  const items = zpList(R).map((z) => ({ ...base(z), value: isNum(val(z.rady?.[u.id]?.[r])) ? val(z.rady[u.id][r]) : null, rok: r }));
  const cr = crHodnota(R, u.id, r);
  const hasNeg = items.some((i) => isNum(i.value) && i.value < 0);
  return {
    typ: 'bary', ukazatel: u, roky, rok: r, items, cr,
    opts: {
      title: `${u.label}, ${r ?? ''}`.replace(/\s+/g, ' ').replace(/,\s*$/, '').trim(),
      sub: u.sub, unit: u.unit, dec: u.dec, source: SRC_RADY,
      allowNegative: hasNeg || u.signed === true, signed: u.signed === true,
      ref: cr ? { value: cr.value, label: cr.label, kind: 'line' } : null,
    },
  };
}

/** Stav přepínače z URL (?ukazatel=…&rok=…&segment=…&vyber=…); neznámé hodnoty = výchozí. */
export function stavZUrl(search) {
  let p;
  try { p = new URLSearchParams(String(search ?? '')); } catch (_) { p = new URLSearchParams(''); }
  const u = p.get('ukazatel');
  const rok = Number(p.get('rok'));
  const v = p.get('vyber');
  return {
    ukazatel: ukazatelById(u) ? u : UKAZATEL_VYCHOZI,
    rok: Number.isInteger(rok) && rok > 1990 ? rok : null,
    segment: p.get('segment') || null,
    vyber: VYBER_REZIMY.some((r) => r.id === v) ? v : 'vse',
  };
}

/** Parametry do URL: výchozí hodnoty se nezapisují. */
export function stavDoUrl(stav, search = '') {
  let p;
  try { p = new URLSearchParams(String(search ?? '')); } catch (_) { p = new URLSearchParams(''); }
  const set1 = (k, v, vychozi) => { if (v == null || v === '' || v === vychozi) p.delete(k); else p.set(k, String(v)); };
  set1('ukazatel', stav.ukazatel, UKAZATEL_VYCHOZI);
  set1('rok', stav.rok, null);
  set1('segment', stav.segment, null);
  set1('vyber', stav.vyber, 'vse');
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Select ukazatele + (u typu bary) přepínač roku + graf. */
export function radyHtml(R, stav) {
  const ch = buildRadyChart(R, stav.ukazatel, stav.rok);
  const opts = UKAZATELE.map((u) => `<option value="${esc(u.id)}"${u.id === ch.ukazatel.id ? ' selected' : ''}>${esc(u.label)}</option>`).join('');
  const select = `<label class="zpc-ctl-lbl" for="zpRadySel">Ukazatel</label><select class="zpc-sit-select" id="zpRadySel" data-rady-sel>${opts}</select>`;
  const rokSw = ch.typ === 'bary' && ch.roky.length > 1 ? `<div class="zpc-ctl-rok"><span class="zpc-ctl-lbl" id="zpRadyRokLbl">Rok</span>${prepinacRokuHtml(ch.roky, ch.rok)}</div>` : '';
  const fig = ch.typ === 'index' ? indexedLines(ch.series, ch.opts) : rankedBars(ch.items, ch.opts);
  const odv = ch.typ === 'bary' && ch.cr?.odvozeno ? `<p class="zpc-cap">${esc(`Pásmo „${ch.cr.label}“ je podíl součtu státních pojištěnců na součtu pojištěnců sedmi pojišťoven, MZ ČR jako celek nezveřejňuje.`)}</p>` : '';
  return `<div class="zpc-ctl">${select}${rokSw}</div><div class="zpc-rady-fig" data-rady-fig>${fig}${odv}</div>`;
}

// ---------------------------------------------------------------- A1.3 státní pojištěnci

/** rankedBars podílu státem hrazených pojištěnců v posledním roce s údaji, s pásmem ČR. */
export function buildStatni(R) {
  const roky = rokyUkazatele(R, 'statni_pojistenci_pct');
  const rok = roky[roky.length - 1] ?? null;
  const items = zpList(R).map((z) => ({ ...base(z), value: isNum(val(z.rady?.statni_pojistenci_pct?.[rok])) ? val(z.rady.statni_pojistenci_pct[rok]) : null, rok }));
  const cr = rok ? crHodnota(R, 'statni_pojistenci_pct', rok) : null;
  return {
    rok, items, cr,
    opts: {
      title: `Státní pojištěnci, podíl na kmeni ${rok ?? ''}`.trim(),
      sub: 'Za státní pojištěnce (děti, důchodci, nezaměstnaní…) platí pojistné stát; podíl je u všech pojišťoven podobný.',
      unit: '%', dec: 1, source: SRC_RADY,
      ref: cr ? { value: cr.value, label: cr.label, kind: 'line' } : null,
    },
  };
}

/** Podíl státních pojištěnců pro kartu pojišťovny na Kmeni: {hodnota, rok} | null (soubor chybí / údaj nedohledán). */
export function statniKarta(R, kod) {
  const z = zpList(R).find((x) => String(x.kod) === String(kod));
  if (!z) return null;
  const roky = rokyUkazatele(R, 'statni_pojistenci_pct');
  for (let i = roky.length - 1; i >= 0; i--) {
    const v = val(z.rady?.statni_pojistenci_pct?.[roky[i]]);
    if (isNum(v)) return { hodnota: v, rok: roky[i] };
  }
  return null;
}

// ---------------------------------------------------------------- A1.4 segmenty

/** Skupiny segmentů (pole `skupina` v datech) pro pruhy part-to-whole. */
export const SEGMENT_SKUPINY = [
  { id: 'ambulantni', label: 'Ambulantní péče' },
  { id: 'luzkova', label: 'Lůžková péče' },
  { id: 'leky', label: 'Léky na recepty' },
  { id: 'ostatni', label: 'Ostatní (lázně, doprava, záchranná služba, zdravotnické prostředky…)' },
];
const segNazev = (s) => s?.nazev_kratky || s?.nazev || '';
/** Úroveň segmentu v daném roce: `uroven_podle_roku?.[rok] ?? uroven` (členění listu se mezi ročníky mění). */
export const urovenV = (seg, rok) => seg?.uroven_podle_roku?.[rok] ?? seg?.uroven;
const segmentyUrovne = (S, uroven, rok) => (Array.isArray(S?.segmenty) ? S.segmenty : []).filter((s) => s && urovenV(s, rok) === uroven);

/** Poslední rok v datech segmentů (roky[] nebo klíče rady). */
export function rokSegmenty(S) {
  const z = zpList(S);
  const roky = (Array.isArray(S?.roky) ? S.roky : z.flatMap((x) => Object.keys(x.rady || {}))).map(Number).filter(isNum);
  return roky.length ? Math.max(...roky) : null;
}

const segHodnota = (S, kod, rok, id) => zpList(S).find((z) => String(z.kod) === String(kod))?.rady?.[rok]?.[id] || null;

/**
 * Segmenty podle kontraktu plánu § 6: bary[] (segmentedBar na ZP, úroveň 1, 100 % = celkem, maxParts 5),
 * dumbbell (ZPP → skutečnost, 6 největších segmentů úrovně 1 vybrané ZP), perPojistence (rankedBars na pojištěnce
 * pro zvolený segment s pásmem ČR). Bez dat: null.
 */
export function buildSegmenty(S, R, { kod = KOD_VZP, segment = null } = {}) {
  const rok = rokSegmenty(S);
  if (!rok || !zpList(S).length) return null;
  const lv1 = segmentyUrovne(S, 1, rok);
  const vsechny = (Array.isArray(S.segmenty) ? S.segmenty : []).filter((s) => s);
  const bary = zpList(S).map((z) => ({
    kod: z.kod, zkratka: z.zkratka || ZP_BY_KOD[String(z.kod)]?.zkratka || z.kod,
    parts: SEGMENT_SKUPINY.map((g) => {
      const radky = lv1.filter((x) => x.skupina === g.id).map((x) => z.rady?.[rok]?.[x.id]?.tis_kc);
      const ok = radky.length > 0 && radky.every(isNum);
      return { key: g.id, label: g.label, value: ok ? radky.reduce((a, b) => a + b, 0) / 1e6 : null };
    }),
  })).map((b) => ({
    ...b,
    opts: { title: b.zkratka, sub: undefined, unit: 'mld Kč', dec: 1, maxParts: 5, source: `${SRC_SEG} · ${rok}` },
  }));

  const zpSel = zpList(S).find((z) => String(z.kod) === String(kod)) || zpList(S)[0];
  const zkr = zpSel?.zkratka || ZP_BY_KOD[String(zpSel?.kod)]?.zkratka || '';
  const velke = lv1.map((s) => ({ s, v: zpSel?.rady?.[rok]?.[s.id] }))
    .filter((x) => isNum(x.v?.tis_kc)).sort((a, b) => b.v.tis_kc - a.v.tis_kc).slice(0, 6);
  const db = {
    kod: zpSel?.kod, zkratka: zkr,
    items: velke.map((x) => ({ key: x.s.id, label: segNazev(x.s), from: isNum(x.v.zpp_tis_kc) ? x.v.zpp_tis_kc / 1e6 : null, to: x.v.tis_kc / 1e6 })),
    opts: { title: `${zkr}: plán → skutečnost ${rok}, šest největších segmentů`, sub: 'Zdravotně pojistný plán (ZPP) a skutečnost, mld Kč. Vybraná pojišťovna podle „Moje pojišťovna“, jinak VZP ČR.',
      unit: 'mld Kč', dec: 1, fromLabel: 'plán', toLabel: 'skutečnost', sortNote: 'Řazeno podle skutečnosti.', source: `${SRC_SEG} · ${rok}` },
  };

  const segId = vsechny.some((s) => s.id === segment) ? segment : (lv1[0]?.id ?? vsechny[0]?.id ?? null);
  const seg = vsechny.find((s) => s.id === segId) || null;
  const itemsPP = zpList(S).map((z) => ({
    kod: z.kod, label: z.zkratka || ZP_BY_KOD[String(z.kod)]?.zkratka || z.kod, rok,
    value: isNum(z.rady?.[rok]?.[segId]?.na_pojistence_kc) ? z.rady[rok][segId].na_pojistence_kc : null,
  }));
  let crv = val(S?.cr?.rady?.[rok]?.[segId]?.na_pojistence_kc);
  let crOdv = false;
  if (!isNum(crv)) {
    let sum = 0; let po = 0; let ok = true;
    for (const z of zpList(S)) {
      const t = z.rady?.[rok]?.[segId]?.tis_kc; const p = val(zpList(R).find((x) => String(x.kod) === String(z.kod))?.rady?.pojistenci_prumer?.[rok]);
      if (!isNum(t) || !isNum(p)) { ok = false; break; }
      sum += t * 1000; po += p;
    }
    crv = ok && po > 0 ? sum / po : null;
    crOdv = isNum(crv);
  }
  const perPojistence = {
    segmentId: segId, segment: seg, cr: isNum(crv) ? { value: crv, odvozeno: crOdv } : null,
    items: itemsPP,
    opts: {
      title: `${segNazev(seg) || 'Segment'} na pojištěnce ${rok}`, sub: 'Kč za rok na jednoho pojištěnce, nestandardizováno na věk.',
      unit: 'Kč', dec: 0, source: `${SRC_SEG} · ${rok}`,
      ref: isNum(crv) ? { value: crv, label: crOdv ? 'průměr sedmi pojišťoven' : 'ČR', kind: 'line' } : null,
    },
  };
  return { rok, bary, dumbbell: db, perPojistence, moznosti: vsechny.map((s) => ({ id: s.id, label: `${'– '.repeat(Math.max(0, (urovenV(s, rok) || 1) - 1))}${segNazev(s)}` })) };
}

// ---------------------------------------------------------------- A1.5 fond prevence a provoz

export function buildFondProvoz(R) {
  const fondCh = buildRadyChart(R, 'fond_prevence_na_pojistence_kc', null);
  const roky = rokyUkazatele(R, 'provozni_vyuziti_limitu_pct');
  const rok = roky[roky.length - 1] ?? null;
  const items = zpList(R).map((z) => {
    const v = val(z.rady?.provozni_vyuziti_limitu_pct?.[rok]);
    const naklady = val(z.rady?.provozni_naklady_mil?.[rok]);
    const pridel = val(z.rady?.provozni_pridel_mil?.[rok]);
    const limit = val(z.rady?.provozni_limit_pridelu_mil?.[rok]);
    const tip = isNum(v)
      ? `${z.zkratka}: ${fmtKc(v, 1)} % maximálního přídělu na provoz · příděl ${isNum(pridel) ? fmtKc(pridel, 0) : 'nedohledán'} mil. Kč z limitu ${isNum(limit) ? fmtKc(limit, 0) : 'nedohledán'} mil. Kč${isNum(naklady) ? ` · výdaje na vlastní činnost ${fmtKc(naklady, 0)} mil. Kč` : ''} · ${rok}`
      : `${z.zkratka}: nedohledáno`;
    return { ...base(z), value: isNum(v) ? v : null, rok, tip };
  });
  return {
    fond: {
      series: fondCh.series,
      opts: { ...fondCh.opts, title: `Fond prevence na pojištěnce ${fondCh.roky[0] ?? ''}–${fondCh.roky[fondCh.roky.length - 1] ?? ''}`,
        sub: 'Kontext, ne hlavní ukazatel (rozhodnutí PS 7. 10. 2026): kolik Kč na pojištěnce pojišťovna z fondu prevence vyčerpala. Index 2015 = 100; surová hodnota je v tooltipu.' },
    },
    provoz: {
      rok, items,
      opts: {
        title: `Využití zákonného limitu přídělu na provoz ${rok ?? ''}`.trim(),
        sub: 'Podíl skutečného přídělu do provozního fondu na maximálním přídělu podle vyhlášky 418/2003 Sb. 100 % = limit vyčerpán.',
        unit: '%', dec: 1, source: SRC_RADY, maxv: 100,
        ref: { value: 100, label: 'zákonný limit', kind: 'line' },
      },
    },
  };
}

// ---------------------------------------------------------------- DOM

const stav = { ukazatel: UKAZATEL_VYCHOZI, rok: null, segment: null, vyber: 'vse' };
const dataRef = { PR: null, R: null, S: null };

function zapisUrl() {
  try {
    const u = new URL(globalThis.location.href);
    u.search = stavDoUrl(stav, u.search);
    globalThis.history.replaceState(null, '', u);
  } catch (_) { /* bez history API se stav jen nezapíše */ }
}

function mojeKod() {
  const k = globalThis.document?.querySelector?.('main')?.dataset?.mojeZp;
  return k && ZP_BY_KOD[k] ? k : null;
}

function refreshInteract() {
  try { const r = initZpInteract(); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (_) { /* graf funguje i bez interakce */ }
}

/**
 * Překreslí obsah hostitele bez skoku layoutu: výška se drží, předchozí render zbledne na 60 %
 * (třída is-busy), v dalším snímku se vymění obsah a zase se vrátí plná sytost.
 */
function prekresli(host, html, focusSel = null) {
  if (!host) return;
  const h = host.offsetHeight;
  if (h) host.style.minHeight = `${h}px`;
  host.classList.add('is-busy');
  const swap = () => {
    host.innerHTML = html;
    refreshInteract();
    if (focusSel) host.querySelector(focusSel)?.focus({ preventScroll: true });
    const done = () => { host.classList.remove('is-busy'); host.style.minHeight = ''; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(done); else done();
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(swap); else swap();
}

const NEDOHLEDANO = (txt) => `<p class="zpc-na">${esc(txt)}</p>`;

function prerozdeleniHtml(PR, rezim) {
  const saldo = buildSaldoChart(PR);
  const pp = buildPodilyPredPo(PR);
  return rankedBars(saldo.items, saldo.opts)
    + '<div class="zpc-charts">'
    + `<div class="zpc-chart">${segmentedBar(pp.pred.parts, pp.pred.opts)}</div>`
    + `<div class="zpc-chart">${segmentedBar(pp.po.parts, pp.po.opts)}</div></div>`
    + `<h3 class="section-title"><span>Relativní saldo v % vybraného pojistného ${buildSaldoTabulka(PR).roky[0] ?? ''}–${saldo.rok ?? ''}</span></h3>`
    + saldoTabulkaHtml(PR)
    + '<h3 class="section-title"><span>Výběr pojistného měsíc po měsíci</span></h3>'
    + prepinacVyberuHtml(rezim)
    + `<div class="zpc-kmen-fig" data-vyber-fig>${vyberMesicniHtml(PR, rezim)}</div>`;
}

function segmentyHtml(S, R, kod) {
  const ch = buildSegmenty(S, R, { kod, segment: stav.segment });
  if (!ch) return NEDOHLEDANO('Náklady podle segmentů zatím nejsou k dispozici.');
  const moje = mojeKod();
  const who = moje
    ? `Zobrazeno: ${dot(ch.dumbbell.kod)}<b>${esc(ch.dumbbell.zkratka)}</b> (vaše pojišťovna). Jinou zvolíte v řádku „Moje pojišťovna“ nahoře.`
    : `Zobrazeno: ${dot(ch.dumbbell.kod)}<b>${esc(ch.dumbbell.zkratka)}</b> (výchozí). Vyberte svou pojišťovnu nahoře.`;
  const opts = ch.moznosti.map((m) => `<option value="${esc(m.id)}"${m.id === ch.perPojistence.segmentId ? ' selected' : ''}>${esc(m.label)}</option>`).join('');
  const bars = ch.bary.map((b, i) => segmentedBar(b.parts, { ...b.opts, sub: i === 0 ? `Podíl segmentů na nákladech na zdravotní služby ${ch.rok}; 100 % = náklady celkem. Čtyři skupiny: ambulantní a lůžková péče, léky na recepty a ostatní.` : undefined })).join('');
  return `<div class="zpc-seg-bary">${bars}</div>`
    + `<p class="zpc-note zpc-fp-who">${who}</p>${dumbbell(ch.dumbbell.items, ch.dumbbell.opts)}`
    + `<div class="zpc-ctl"><label class="zpc-ctl-lbl" for="zpSegSel">Segment</label><select class="zpc-sit-select" id="zpSegSel" data-seg-sel>${opts}</select></div>`
    + rankedBars(ch.perPojistence.items, ch.perPojistence.opts)
    + '<p class="zpc-cap">Členění listu MZ se mezi ročníky mění: od roku 2023 jsou ozdravovny podřádkem lázní (dříve samostatný řádek), proto řada Lázně 2022 → 2023 není přesně srovnatelná. Zobrazený rok má jednotné členění.</p>'
    + (ch.perPojistence.cr?.odvozeno ? '<p class="zpc-cap">Pásmo je součet nákladů sedmi pojišťoven dělený součtem jejich pojištěnců, MZ ČR jako celek nezveřejňuje.</p>' : '');
}

function radyRender() {
  set('zpRady', dataRef.R ? radyHtml(dataRef.R, stav) : NEDOHLEDANO('Řady hospodaření 2015–2024 zatím nejsou k dispozici (nedohledáno).'));
}

/**
 * Vykreslí sekce stránky Peníze podle přítomných kontejnerů. Chybějící dataset = stav „nedohledáno“.
 * @param {{PR?: object|null, R?: object|null, S?: object|null}} data
 */
export function renderPenize({ PR = null, R = null, S = null } = {}) {
  Object.assign(dataRef, { PR, R, S });
  const doc = globalThis.document;
  Object.assign(stav, stavZUrl(globalThis.location?.search));
  set('zpPrerozdeleni', PR ? prerozdeleniHtml(PR, stav.vyber) : NEDOHLEDANO('Data o přerozdělení zatím nejsou k dispozici (nedohledáno).'));
  radyRender();
  if (doc?.getElementById('zpStatni')) {
    if (!R) set('zpStatni', NEDOHLEDANO('Podíl státních pojištěnců zatím není k dispozici (nedohledáno).'));
    else { const st = buildStatni(R); set('zpStatni', rankedBars(st.items, st.opts) + (st.cr?.odvozeno ? `<p class="zpc-cap">${esc(`Pásmo „${st.cr.label}“ je podíl součtu státních pojištěnců na součtu pojištěnců sedmi pojišťoven.`)}</p>` : '')); }
  }
  if (doc?.getElementById('zpSegmenty')) set('zpSegmenty', S ? segmentyHtml(S, R, mojeKod() || KOD_VZP) : NEDOHLEDANO('Náklady podle segmentů zatím nejsou k dispozici.'));
  if (doc?.getElementById('zpFondProvoz')) {
    if (!R) set('zpFondProvoz', NEDOHLEDANO('Fond prevence a provoz zatím nejsou k dispozici (nedohledáno).'));
    else {
      const fp = buildFondProvoz(R);
      set('zpFondProvoz', `<div class="zpc-charts"><div class="zpc-chart">${indexedLines(fp.fond.series, fp.fond.opts)}</div>`
        + `<div class="zpc-chart">${rankedBars(fp.provoz.items, fp.provoz.opts)}</div></div>`);
    }
  }
  vazbaUdalosti(doc);
}

function vazbaUdalosti(doc) {
  if (!doc?.getElementById || vazbaUdalosti.done) return;
  vazbaUdalosti.done = true;
  const pr = doc.getElementById('zpPrerozdeleni');
  pr?.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button[data-vyber]') : null;
    if (!b) return;
    stav.vyber = b.getAttribute('data-vyber');
    pr.querySelectorAll('button[data-vyber]').forEach((x) => {
      const on = x.getAttribute('data-vyber') === stav.vyber;
      x.setAttribute('aria-checked', String(on));
      x.setAttribute('tabindex', on ? '0' : '-1');
    });
    const fig = pr.querySelector('[data-vyber-fig]');
    if (fig) prekresli(fig, vyberMesicniHtml(dataRef.PR, stav.vyber));
    zapisUrl();
  });
  const rady = doc.getElementById('zpRady');
  rady?.addEventListener('change', (e) => {
    const sel = e.target.closest ? e.target.closest('select[data-rady-sel]') : null;
    if (!sel) return;
    stav.ukazatel = sel.value;
    stav.rok = null;
    prekresli(rady, radyHtml(dataRef.R, stav), 'select[data-rady-sel]');
    zapisUrl();
  });
  rady?.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button[data-rok]') : null;
    if (!b) return;
    stav.rok = Number(b.getAttribute('data-rok'));
    prekresli(rady, radyHtml(dataRef.R, stav), `button[data-rok="${stav.rok}"]`);
    zapisUrl();
  });
  rady?.addEventListener('keydown', (e) => {
    const b = e.target.closest ? e.target.closest('button[role="radio"]') : null;
    const krok = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!b || !krok) return;
    e.preventDefault();
    const all = [...b.parentElement.querySelectorAll('button[role="radio"]')];
    const next = all[(all.indexOf(b) + krok + all.length) % all.length];
    next?.click();
  });
  pr?.addEventListener('keydown', (e) => {
    const b = e.target.closest ? e.target.closest('button[data-vyber]') : null;
    const krok = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!b || !krok) return;
    e.preventDefault();
    const all = [...b.parentElement.querySelectorAll('button[data-vyber]')];
    const next = all[(all.indexOf(b) + krok + all.length) % all.length];
    next?.click();
    next?.focus();
  });
  const seg = doc.getElementById('zpSegmenty');
  seg?.addEventListener('change', (e) => {
    const sel = e.target.closest ? e.target.closest('select[data-seg-sel]') : null;
    if (!sel) return;
    stav.segment = sel.value;
    prekresli(seg, segmentyHtml(dataRef.S, dataRef.R, mojeKod() || KOD_VZP), 'select[data-seg-sel]');
    zapisUrl();
  });
  doc.addEventListener(MOJE_EVENT, () => {
    if (seg && dataRef.S) prekresli(seg, segmentyHtml(dataRef.S, dataRef.R, mojeKod() || KOD_VZP));
  });
}

