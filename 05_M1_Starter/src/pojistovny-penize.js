// Srovnávač pojišťoven — stránka Peníze (balíčky A1.2–A1.6, PLAN-SROVNAVAC-ANALYTIK.md).
//
// Čte data/pojistovny-prerozdeleni.json (relativní saldo přerozdělení, výběr měsíc po měsíci),
// data/pojistovny-hospodareni-rady.json (řady MZ 2015–2024) a data/pojistovny-segmenty.json
// (náklady podle segmentů). Každý soubor je nepovinný: chybí-li, sekce ukáže „nedohledáno“.
// Načítá je a renderer volá orchestrátor src/pojistovny.js podle kontejnerů na stránce
// (#zpPrerozdeleni, #zpRady, #zpStatni, #zpSegmenty, #zpFondProvoz). Fond prevence (A6.1) čte navíc
// data/pojistovny-kmen-mesicni.json (kontext: změna kmene k 1. 1. a 1. 7.).
//
// Co se tu ukazuje, jsou fakta zákonem daného mechanismu a vykázaná čísla MZ, ne hodnocení
// pojišťoven: seřazené grafy nesou větu SORT_NOTE, tabulky jsou v pevném pořadí podle kódu.
//
// Čisté funkce (testované bez DOM): buildSaldoChart, buildPodilyPredPo, buildSaldoTabulka,
// saldoTabulkaHtml, buildVyberMesicni, vyberMesicniHtml, UKAZATELE, rokyUkazatele,
// buildRadyChart, buildStatni, statniKarta, buildSegmenty, buildFondProvoz, stavZUrl,
// stavDoUrl, prepinacRokuHtml, radyHtml, buildSlozky, buildNaPojistence. DOM část: renderPenize.
//
// Přepínače (ukazatel, rok, segment, výběr) jsou společná komponenta figureSwitch (src/zp-viz.js, A4.3);
// klik, šipky a zápis ?ukazatel=&rok=&segment=&vyber= do URL řeší src/zp-interact.js, tenhle modul
// jen poslouchá událost `zp:switch` a překreslí příslušný kontejner.

import { esc, fmtKc, dot, set } from './pojistovny-shared.js';
import { rankedBars, segmentedBar, stackedRows, indexedLines, dumbbell, isNum, figureSwitch, readSwitchFromUrl, tableTwin, kratkyPopisek, NA_TEXT } from './zp-viz.js';
import { initZpInteract, MOJE_EVENT, SWITCH_EVENT } from './zp-interact.js';
import { ZP_BY_KOD } from './zp-palette.js';
import { mesicX, mesicLabel, xLabel, fmtZmena, fmtZmenaPct } from './pojistovny-kmen-mesicni.js';

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
    const sl = isNum(r.slozka_rizikova_mld) && isNum(r.slozka_platcova_mld)
      ? ` · z toho riziková (složení kmene) ${sg(r.slozka_rizikova_mld, 1, 'mld Kč')}, plátcová (příjmy plátců) ${sg(r.slozka_platcova_mld, 1, 'mld Kč')}` : '';
    const tip = v == null ? `${z.zkratka}: nedohledáno`
      : `${z.zkratka}: ${sg(v, 1, 'mld Kč')} · ${sg(r.saldo_relativni_pct_vybraneho, 1, '%')} vybraného pojistného`
        + `${isNum(r.saldo_relativni_na_pojistence_kc) ? ` · ${sg(r.saldo_relativni_na_pojistence_kc, 0, 'Kč')} na pojištěnce` : ''}${sl} · ${rok}`;
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
  // poslední celý rok: saldo a jeho dvě složky (součet složek = saldo)
  for (const rd of radky) {
    const r = zpList(PR).find((z) => z.kod === rd.kod)?.rocne?.[posl] || {};
    rd.slozky = {
      rok: posl,
      saldo: isNum(r.saldo_relativni_mld) ? r.saldo_relativni_mld : null,
      riz: isNum(r.slozka_rizikova_mld) ? r.slozka_rizikova_mld : null,
      plat: isNum(r.slozka_platcova_mld) ? r.slozka_platcova_mld : null,
    };
  }
  return { roky, radky };
}

/** Složky relativního salda za poslední celý rok: dvě diverging rankedBars na společné ose (mld Kč). */
export function buildSlozky(PR) {
  const rok = rokPrerozdeleni(PR);
  const mk = (klic) => zpList(PR).map((z) => {
    const r = z.rocne?.[rok] || {};
    return { ...base(z), value: isNum(r[klic]) ? r[klic] : null, rok };
  });
  const riz = mk('slozka_rizikova_mld');
  const plat = mk('slozka_platcova_mld');
  const all = [...riz, ...plat].map((i) => i.value).filter(isNum);
  if (!all.length) return null;
  const maxAbs = Math.max(...all.map(Math.abs));
  const okno = zpList(PR).map((z) => z.rocne?.[rok]?.okno_vyberu).find(Boolean) || null;
  const common = { unit: 'mld Kč', dec: 1, allowNegative: true, signed: true, maxv: maxAbs, minv: -maxAbs, source: SRC_PRER };
  const tip = (i, jmeno) => ({ ...i, tip: i.value == null ? `${i.label}: nedohledáno` : `${i.label}: ${sg(i.value, 1, 'mld Kč')} · ${jmeno} · ${rok}` });
  return {
    rok, okno, maxAbs,
    riz: { items: riz.map((i) => tip(i, 'složka riziková')), opts: { ...common, title: `Složka riziková (složení kmene) ${rok ?? ''}`.trim(), sub: 'Odchylka částky po přerozdělení od rovného dílu na hlavu. Kladná = pojišťovna dostala na pojištěnce víc, než činí průměr sedmi pojišťoven; mechanismus tak vyrovnává rozdíly ve složení a nákladnosti kmene.' } },
    plat: { items: plat.map((i) => tip(i, 'složka plátcová')), opts: { ...common, title: `Složka plátcová (příjmy plátců) ${rok ?? ''}`.trim(), sub: 'Rozdíl mezi rovným dílem na hlavu a dílem podle vybraného pojistného. Kladná = pojišťovna vybrala na pojištěnce méně než průměr, záporná = víc. Obě složky mají stejnou osu a dávají dohromady celé saldo.' } },
  };
}

/** Částky na průměrného pojištěnce za poslední celý rok: vybráno vs. po přerozdělení (Kč), společná osa. */
export function buildNaPojistence(PR) {
  const rok = rokPrerozdeleni(PR);
  const mk = (klic, jmeno) => zpList(PR).map((z) => {
    const v = z.rocne?.[rok]?.[klic];
    return { ...base(z), value: isNum(v) ? v : null, rok, tip: isNum(v) ? `${z.zkratka}: ${fmtKc(v, 0)} Kč na pojištěnce · ${jmeno} · ${rok}` : `${z.zkratka}: nedohledáno` };
  });
  const vyb = mk('vybrano_na_pojistence_kc', 'vybrané pojistné');
  const po = mk('po_prerozdeleni_na_pojistence_kc', 'po přerozdělení');
  const all = [...vyb, ...po].map((i) => i.value).filter(isNum);
  if (!all.length) return null;
  const common = { unit: 'Kč', dec: 0, maxv: Math.max(...all), source: SRC_PRER };
  return {
    rok,
    vybrano: { items: vyb, opts: { ...common, title: `Vybráno na pojištěnce ${rok ?? ''}`.trim(), sub: 'Kč za rok na průměrného pojištěnce. Vybrané pojistné není příjem pojišťovny.' } },
    po: { items: po, opts: { ...common, title: `Připadlo na pojištěnce po přerozdělení ${rok ?? ''}`.trim(), sub: 'Kč za rok na průměrného pojištěnce; to je příjem pojišťovny. Obě osy jsou stejné.' } },
  };
}

export function saldoTabulkaHtml(PR) {
  const t = buildSaldoTabulka(PR);
  if (!t.roky.length || !t.radky.length) return '<p class="zpc-na">Roční saldo zatím není k dispozici (nedohledáno).</p>';
  const rokS = t.radky[0]?.slozky?.rok ?? t.roky[t.roky.length - 1];
  const head = `<tr><th scope="col">Pojišťovna</th>${t.roky.map((y) => `<th scope="col">${y}</th>`).join('')}`
    + `<th scope="col" class="zpc-num-sep">Saldo ${rokS}, mld Kč</th><th scope="col">z toho riziková (složení kmene), mld Kč</th><th scope="col">z toho plátcová (příjmy plátců), mld Kč</th></tr>`;
  const cell = (v) => (isNum(v) ? `<td class="zpc-num">${esc(sg(v, 1))}</td>` : '<td class="zpc-num"><span class="zpc-na">—</span></td>');
  const body = t.radky.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row">${dot(r.kod)}${esc(r.zkratka)}</th>${r.bunky.map((b) => (b.pct == null
    ? '<td class="zpc-num"><span class="zpc-na">—</span></td>'
    : `<td class="zpc-num" title="${esc(`${r.zkratka} ${b.rok}: ${sg(b.mld, 1, 'mld Kč')}`)}">${esc(sg(b.pct, 1))}</td>`)).join('')}`
    + `${cell(r.slozky?.saldo).replace('<td class="zpc-num">', '<td class="zpc-num zpc-num-sep">')}${cell(r.slozky?.riz)}${cell(r.slozky?.plat)}</tr>`).join('');
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Relativní saldo přerozdělení v procentech vybraného pojistného podle let a rozklad salda za poslední rok (tabulka, posuvná)">'
    + `<table><caption class="sr-only">Relativní saldo přerozdělení v % vybraného pojistného, ${t.roky[0]}–${t.roky[t.roky.length - 1]}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`
    + `<p class="zpc-cap">Saldo v % vybraného pojistného dané pojišťovny, ${t.roky[0]}–${t.roky[t.roky.length - 1]} (roky s dvanácti měsíci). Poslední tři sloupce rozkládají saldo za ${rokS} v mld Kč na složku rizikovou (složení kmene) a plátcovou (příjmy plátců); dohromady dávají saldo. Pevné pořadí podle kódu pojišťovny, nejde o hodnocení. Najetím na buňku uvidíte saldo v mld Kč. ${esc(SRC_PRER)}.</p>`;
}

/** Režimy přepínače měsíčního výběru. */
export const VYBER_REZIMY = [
  { id: 'vse', label: 'Všech 7' },
  { id: 'bez-vzp', label: 'Bez VZP ČR' },
];

/**
 * Klouzavý součet za 12 měsíců: prvek i = součet měsíců i−11 … i; prvních 11 prvků a okno
 * s chybějícím měsícem je null (délka řady se zachovává, ať indexy sedí na pole `mesice`).
 * Roční součet odstraňuje sezónní kolísání výběru, které měsíční řadu činí nečitelnou.
 */
export function klouzavySoucet12(pocty) {
  const a = Array.isArray(pocty) ? pocty : [];
  return a.map((_, i) => {
    if (i < 11) return null;
    let sum = 0;
    for (let k = i - 11; k <= i; k++) {
      if (!isNum(a[k])) return null;
      sum += a[k];
    }
    return sum;
  });
}

/** Měsíční výběr pojistného jako klouzavý 12měsíční součet: 7 (nebo 6) sérií od 12. měsíce, index prvního dostupného = 100. */
export function buildVyberMesicni(PR, rezim = 'vse') {
  const mesice = Array.isArray(PR?.mesice) ? PR.mesice : [];
  const zps = zpList(PR).filter((z) => rezim !== 'bez-vzp' || String(z.kod) !== KOD_VZP);
  const od = mesice.length > 11 ? 11 : 0; // první měsíc s úplným dvanáctiměsíčním oknem
  const series = zps.map((z) => {
    const ks = klouzavySoucet12(z.vybrano);
    return { ...base(z), points: mesice.slice(od).map((m, j) => ({ year: mesicX(m), value: isNum(ks[od + j]) ? ks[od + j] : null })) };
  });
  const prvni = mesice[od];
  const posledni = mesice[mesice.length - 1];
  const x0 = prvni ? mesicX(prvni) : 0;
  // značky osy: každý druhý leden od prvního ledna uvnitř řady, popsané jen rokem
  const ticks = mesice.filter((m) => m.endsWith('-01') && mesicX(m) >= x0).filter((_, i) => i % 2 === 0)
    .map((m) => ({ x: mesicX(m), label: m.slice(0, 4) }));
  return {
    series,
    mesice: mesice.slice(od),
    opts: {
      title: `Výběr pojistného: klouzavý 12měsíční součet (index ${prvni ? mesicLabel(prvni) : '12/2019'} = 100)`,
      sub: `Součet posledních 12 měsíců, index ${prvni ? mesicLabel(prvni) : '12/2019'} = 100; měsíční řada v tabulce. Pojistné vybrané každou pojišťovnou (tzv. 100% výběr), ${prvni ? mesicLabel(prvni) : ''} až ${posledni ? mesicLabel(posledni) : ''}.`
        + `${rezim === 'bez-vzp' ? ' Bez VZP ČR; osa je proto jemnější.' : ''}`,
      base: prvni ? mesicX(prvni) : 'first',
      unit: 'tis. Kč', dec: 0,
      xFmt: xLabel, xHead: 'Měsíc', xTicks: ticks,
      source: SRC_PRER,
    },
  };
}

/** Tabulka měsíčních hodnot výběru (měsíc × pojišťovna, tis. Kč): druhé dvojče grafu klouzavého součtu. */
export function vyberMesicniTabulka(PR, rezim = 'vse') {
  const mesice = Array.isArray(PR?.mesice) ? PR.mesice : [];
  const zps = zpList(PR).filter((z) => rezim !== 'bez-vzp' || String(z.kod) !== KOD_VZP);
  if (!mesice.length || !zps.length) return '';
  return tableTwin('Výběr pojistného po měsících, tis. Kč', ['Měsíc', ...zps.map((z) => z.zkratka)],
    mesice.map((m, i) => [esc(mesicLabel(m)), ...zps.map((z) => esc(isNum(z.vybrano?.[i]) ? fmtKc(z.vybrano[i], 0) : 'nedohledáno'))]),
    1, SRC_PRER, 'Zobrazit měsíční řadu jako tabulku');
}

export function vyberMesicniHtml(PR, rezim = 'vse') {
  const ch = buildVyberMesicni(PR, rezim);
  return indexedLines(ch.series, ch.opts) + vyberMesicniTabulka(PR, rezim);
}

// ---------------------------------------------------------------- přepínače

/** Přepínač roku (figureSwitch, id/parametr `rok`). */
export function prepinacRokuHtml(roky, rok) {
  return figureSwitch({ id: 'rok', label: 'Rok', kind: 'radio', selected: rok, options: (roky || []).map((y) => ({ value: y, label: String(y) })) });
}

/** Přepínač rozsahu měsíčního výběru (figureSwitch, id/parametr `vyber`, výchozí `vse`). */
export function prepinacVyberuHtml(rezim) {
  return figureSwitch({ id: 'vyber', label: 'Rozsah grafu', kind: 'radio', selected: rezim, defaultValue: 'vse', options: VYBER_REZIMY.map((r) => ({ value: r.id, label: r.label })) });
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
  // Reference ČR jen u poměrů a hodnot na pojištěnce: součet za celou ČR (mld Kč) nelze srovnávat
  // s jednou pojišťovnou, čára ČR by u absolutních hodnot jen zavádělo.
  const cr = /^mld/.test(u.unit) ? null : crHodnota(R, u.id, r);
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
  const q = `?${p.toString()}`;
  const rok = Number(p.get('rok'));
  return {
    ukazatel: readSwitchFromUrl('ukazatel', UKAZATELE.map((u) => u.id), UKAZATEL_VYCHOZI, q),
    rok: Number.isInteger(rok) && rok > 1990 ? rok : null,
    segment: p.get('segment') || null,
    vyber: readSwitchFromUrl('vyber', VYBER_REZIMY.map((r) => r.id), 'vse', q),
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
  const select = figureSwitch({ id: 'ukazatel', label: 'Ukazatel', kind: 'select', selected: ch.ukazatel.id, defaultValue: UKAZATEL_VYCHOZI, options: UKAZATELE.map((u) => ({ value: u.id, label: u.label })) });
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
/** Krátký popisek skupiny pro legendu a tabulku jednoho obrázku (vysvětlení „Ostatní“ nese podtitulek). */
const SKUPINA_KRATKY = { ambulantni: 'Ambulantní péče', luzkova: 'Lůžková péče', leky: 'Léky na recepty', ostatni: 'Ostatní' };

/** Zkrácený popisek segmentu (≤ max znaků); plný název nese tooltip. */
export const kratkySegment = kratkyPopisek;

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
  const stackRows = zpList(S).map((z) => ({ kod: z.kod, label: z.zkratka || ZP_BY_KOD[String(z.kod)]?.zkratka || z.kod }));
  const stackParts = SEGMENT_SKUPINY.map((g) => ({ key: g.id, label: SKUPINA_KRATKY[g.id] || g.label }));
  const stackVal = (r, p) => {
    const z = zpList(S).find((x) => String(x.kod) === String(r.kod));
    const radky = lv1.filter((x) => x.skupina === p.key).map((x) => z?.rady?.[rok]?.[x.id]?.tis_kc);
    return radky.length > 0 && radky.every(isNum) ? radky.reduce((a, b) => a + b, 0) / 1e6 : null;
  };
  const stacked = {
    rows: stackRows, parts: stackParts, cell: stackVal,
    opts: {
      title: `Náklady na zdravotní služby podle segmentů ${rok}`,
      sub: `Podíl čtyř skupin na nákladech na zdravotní služby, 100 % = náklady celkem. „Ostatní“ jsou lázně, doprava, záchranná služba, zdravotnické prostředky a další. Složení ovlivňuje i věk kmene, nejde o hodnocení.`,
      unit: 'mld Kč', dec: 1, source: `${SRC_SEG} · ${rok}`,
    },
  };
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
    items: velke.map((x) => ({ key: x.s.id, label: kratkySegment(segNazev(x.s)), tip: `${segNazev(x.s)}: skutečnost ${fmtKc(x.v.tis_kc / 1e6, 1)} mld Kč${isNum(x.v.zpp_tis_kc) ? ` · plán ${fmtKc(x.v.zpp_tis_kc / 1e6, 1)} mld Kč` : ''} · ${rok}`, from: isNum(x.v.zpp_tis_kc) ? x.v.zpp_tis_kc / 1e6 : null, to: x.v.tis_kc / 1e6 })),
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
  return { rok, bary, stacked, dumbbell: db, perPojistence, moznosti: vsechny.map((s) => ({ id: s.id, label: `${'– '.repeat(Math.max(0, (urovenV(s, rok) || 1) - 1))}${segNazev(s)}` })) };
}

// ---------------------------------------------------------------- A1.5 fond prevence a provoz

export const FOND_ROK_ID = 'fond_rok';
export const FOND_SLOZKY = [
  { key: 'programy', label: 'Zdravotní programy' },
  { key: 'pobyty', label: 'Ozdravné pobyty' },
  { key: 'ostatni', label: 'Ostatní činnosti' },
];
export const FOND_SUB_PROGRAMY = 'Kč na pojištěnce a rok, bez ozdravných pobytů a „ostatních činností“ (2021–22 testování na covid). VZP má od 2023 stejné zdroje fondu jako zaměstnanecké ZP (§ 7c zák. 551/1991), proto roky před 2023 a po něm nejsou u VZP srovnatelné.';

/** Roky, pro které MZ zveřejnil rozpis fondu po pojišťovnách (Tab. 17, 2018–2024). */
export function fondRoky(R) {
  return rokyUkazatele(R, 'fond_prevence_programy_na_pojistence_kc');
}

/** Rok přepínače fondu z URL (`?fond_rok=`); mimo dostupné roky = poslední rok. */
export function fondRokZUrl(search, roky) {
  const r = Array.isArray(roky) ? roky : [];
  if (!r.length) return null;
  let q = '';
  try { q = `?${new URLSearchParams(String(search ?? '')).toString()}`; } catch (_) { q = ''; }
  return Number(readSwitchFromUrl(FOND_ROK_ID, r.map(String), String(r[r.length - 1]), q));
}

/** Přepínač roku čerpání fondu (figureSwitch, id/parametr `fond_rok`, výchozí poslední rok). */
export function fondPrepinacHtml(roky, rok) {
  return figureSwitch({ id: FOND_ROK_ID, label: 'Rok čerpání fondu', kind: 'radio', selected: rok, defaultValue: String(roky[roky.length - 1] ?? ''), options: roky.map((y) => ({ value: y, label: String(y) })) });
}

const fondVal = (z, id, rok) => val(z.rady?.[id]?.[rok]);

/**
 * Fond prevence jinak (A6.1): (a) zdravotní programy na pojištěnce za rok, (b) složení fondu programy / pobyty / ostatní
 * po pojišťovnách za rok, (c) podíl „ostatních činností“ v ČR 2015–2024. Celkový fond na pojištěnce (programy + pobyty +
 * ostatní) se nezobrazuje: v letech 2021–22 v něm dominovalo covidové testování a pořadí pojišťoven se po očištění obrací.
 * @returns {{roky:number[], rok:number|null, programy:{items,opts}, struktura:{rows,parts,cell,opts,jine:number|null}, ostatniCr:{items,opts}}}
 */
export function buildFond(R, rokVstup = null) {
  const roky = fondRoky(R);
  const rok = roky.includes(Number(rokVstup)) ? Number(rokVstup) : (roky[roky.length - 1] ?? null);
  const zp = zpList(R);
  const crPp = val(R?.cr?.rady?.fond_prevence_programy_na_pojistence_kc?.[rok]);
  const items = zp.map((z) => {
    const v = fondVal(z, 'fond_prevence_programy_na_pojistence_kc', rok);
    const mil = fondVal(z, 'fond_prevence_programy_mil', rok);
    return { ...base(z), value: isNum(v) ? v : null, rok, tip: isNum(v) ? `${z.zkratka}: ${fmtKc(v, 0)} Kč na pojištěnce na zdravotní programy z fondu prevence${isNum(mil) ? ` (${fmtKc(mil, 0)} mil. Kč)` : ''} · ${rok}` : `${z.zkratka}: nedohledáno` };
  });
  const rows = zp.map((z) => ({ ...base(z) }));
  const zpByKod = new Map(zp.map((z) => [String(z.kod), z]));
  const cell = (r, p) => {
    const z = zpByKod.get(String(r.kod));
    const v = z ? fondVal(z, `fond_prevence_${p.key}_mil`, rok) : null;
    return isNum(v) ? v : null;
  };
  const vozp = zpByKod.get('201');
  const jine = vozp ? fondVal(vozp, 'fond_prevence_jine_zdroje_mil', rok) : null;
  const rokyCr = (Array.isArray(R?.roky) ? R.roky : []).filter((y) => isNum(val(R?.cr?.rady?.fond_prevence_ostatni_podil_pct?.[y])));
  const ostItems = rokyCr.map((y) => {
    const p = val(R.cr.rady.fond_prevence_ostatni_podil_pct[y]);
    const o = val(R.cr.rady.fond_prevence_ostatni_mil?.[y]);
    const c = val(R.cr.rady.fond_prevence_celkem_t17_mil?.[y]);
    return { key: `r${y}`, label: String(y), value: p, rok: y, tip: `${y}: ostatní činnosti ${isNum(o) ? fmtKc(o, 0) : 'nedohledáno'} mil. Kč z ${isNum(c) ? fmtKc(c, 0) : 'nedohledáno'} mil. Kč fondu prevence všech sedmi pojišťoven (${fmtKc(p, 1)} %)` };
  });
  return {
    roky, rok,
    programy: {
      items,
      opts: {
        title: `Zdravotní programy z fondu prevence na pojištěnce ${rok ?? ''}`.trim(), sub: FOND_SUB_PROGRAMY,
        unit: 'Kč', dec: 0, source: SRC_RADY,
        ref: isNum(crPp) ? { value: crPp, label: 'ČR', kind: 'line' } : null,
      },
    },
    struktura: {
      rows, parts: FOND_SLOZKY.map((p) => ({ ...p })), cell, jine: isNum(jine) ? jine : null,
      opts: {
        title: `Kam fond prevence teče ${rok ?? ''}`.trim(),
        sub: 'Podíl zdravotních programů, ozdravných pobytů a „ostatních činností“ na součtu těchto tří položek. Co MZ do „ostatních činností“ počítá, Hodnocení nedefinuje; v letech 2021–22 šlo hlavně o antigenní testování.',
        unit: 'mil. Kč', dec: 0, source: SRC_RADY, rowHeader: 'Pojišťovna',
      },
    },
    ostatniCr: {
      items: ostItems,
      opts: {
        title: `Podíl „ostatních činností“ na fondu prevence, ČR ${rokyCr[0] ?? ''}–${rokyCr[rokyCr.length - 1] ?? ''}`.trim(),
        sub: 'Ostatní činnosti jako podíl na celkových nákladech fondu všech sedmi pojišťoven. V letech 2021–22 šlo podle poznámky MZ o antigenní testování zaměstnanců ve firmách a OSVČ, které pojišťovny hradily z fondu na žádost MZ.',
        unit: '%', dec: 1, sort: 'none', source: SRC_RADY,
      },
    },
  };
}

/**
 * Kontext bez kauzality: zdravotní programy na pojištěnce za rok t vedle změny kmene k 1. 7. t a k 1. 1. t+1
 * (čistá změna počtu pojištěnců z měsíčního přerozdělení MZ). Řádky v pevném pořadí podle kódu, pak rok.
 * @returns {{roky:number[], radky:{kod,zkratka,rok,programy:number|null,jul:object|null,led:object|null}[]}|null}
 */
export function buildFondKontext(R, K) {
  const kz = Array.isArray(K?.prestupy?.pojistovny) ? K.prestupy.pojistovny : [];
  if (!kz.length) return null;
  const najdi = (zmeny, rok, termin) => (zmeny || []).find((c) => c.rok === rok && c.termin === termin && isNum(c.zmena)) || null;
  const roky = fondRoky(R).filter((t) => kz.some((p) => najdi(p.zmeny, t, '1. 7.') || najdi(p.zmeny, t + 1, '1. 1.')));
  if (!roky.length) return null;
  const radky = [];
  for (const z of zpList(R)) {
    const k = kz.find((p) => String(p.kod) === String(z.kod));
    for (const t of roky) {
      const v = fondVal(z, 'fond_prevence_programy_na_pojistence_kc', t);
      radky.push({ kod: z.kod, zkratka: z.zkratka, rok: t, programy: isNum(v) ? v : null, jul: najdi(k?.zmeny, t, '1. 7.'), led: najdi(k?.zmeny, t + 1, '1. 1.') });
    }
  }
  return { roky, radky };
}

/** Tabulka kontextu jako tabulkové dvojče (otevřené, s CSV), řádky nesou `data-zp` pro Moje pojišťovna / Porovnat s. */
export function fondKontextHtml(R, K) {
  const t = buildFondKontext(R, K);
  if (!t) return NEDOHLEDANO('Změny kmene k 1. 1. a 1. 7. zatím nejsou k dispozici (nedohledáno).');
  const title = `Zdravotní programy z fondu prevence na pojištěnce a změna kmene ${t.roky[0]}–${t.roky[t.roky.length - 1]}`;
  const source = `${SRC_RADY}; MZ ČR · Přerozdělování pojistného na v.z.p. (měsíční PDF, počet pojištěnců odvozen podílem dvou částek)`;
  const headers = ['Pojišťovna', 'Rok čerpání', 'Programy na pojištěnce, Kč', 'Změna kmene k 1. 7. téhož roku', 'v %', 'Změna kmene k 1. 1. dalšího roku', 'v %'];
  const zm = (c) => (c ? [esc(fmtZmena(c.zmena)), esc(fmtZmenaPct(c.zmena_pct))] : [esc(NA_TEXT), '']);
  const body = t.radky.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row">${dot(r.kod)}${esc(r.zkratka)}</th><td>${r.rok}</td>`
    + `<td class="zpv-num">${isNum(r.programy) ? esc(fmtKc(r.programy, 0)) : esc(NA_TEXT)}</td>`
    + `${zm(r.jul).map((x) => `<td class="zpv-num">${x}</td>`).join('')}${zm(r.led).map((x) => `<td class="zpv-num">${x}</td>`).join('')}</tr>`).join('');
  const head = headers.map((h, i) => `<th scope="col"${i >= 2 ? ' class="zpv-num"' : ''}>${esc(h)}</th>`).join('');
  return '<div class="zpv zpv-figure zpv-fond-kontext">'
    + `<figcaption class="zpv-cap"><span class="zpv-title">${esc('Kontext: zdravotní programy na pojištěnce a změna kmene')}</span>`
    + `<span class="zpv-sub">${esc('Čerpání za rok t vedle změny kmene k 1. 7. t a k 1. 1. t+1. Jen souběh dvou řad, bez vysvětlení: tabulka neříká, že příspěvky z fondu přestupy ovlivnily, ani že přestupy ovlivnily příspěvky. Změna kmene je čistá (příchozí minus odchozí, včetně narození a úmrtí), hrubé toky přestupů MZ nezveřejňuje.')}</span></figcaption>`
    + `<details class="zpv-table" open data-csv-title="${esc(title)}" data-csv-source="${esc(source)}"><summary>Tabulka: programy na pojištěnce a změna kmene</summary>`
    + '<button type="button" class="zpv-csv" data-zpv-csv>Stáhnout CSV</button>'
    + `<div class="zpv-scroll" tabindex="0" role="region" aria-label="${esc(`Tabulka: ${title}`)}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></details></div>`;
}

/** Provoz: využití zákonného limitu přídělu na provoz (zůstává z A1.5). */
export function buildProvoz(R) {
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
    rok, items,
    opts: {
      title: `Využití zákonného limitu přídělu na provoz ${rok ?? ''}`.trim(),
      sub: 'Podíl skutečného přídělu do provozního fondu na maximálním přídělu podle vyhlášky 418/2003 Sb. 100 % = limit vyčerpán.',
      unit: '%', dec: 1, source: SRC_RADY, maxv: 100,
      ref: { value: 100, label: 'zákonný limit', kind: 'line' },
    },
  };
}

/** Zpětně kompatibilní obálka: fond (A6.1) + provoz. */
export function buildFondProvoz(R, rok = null) {
  return { fond: buildFond(R, rok), provoz: buildProvoz(R) };
}

// ---------------------------------------------------------------- profil pojišťovny (A2.3)

/** Řada jedné pojišťovny a ČR (indexedLines) pro profil; ukazatel bez indexového typu nebo bez dat pojišťovny = null. */
export function buildRadyKarta(R, ukazatel, kod) {
  const ch = buildRadyChart(R, ukazatel, null);
  if (ch.typ !== 'index') return null;
  const mine = ch.series.filter((s) => String(s.kod) === String(kod));
  if (!mine.length || !mine[0].points.some((p) => isNum(p.value))) return null;
  const zkr = mine[0].label;
  return {
    ukazatel: ch.ukazatel, roky: ch.roky,
    series: [...mine, ...ch.series.filter((s) => s.key === 'cr')],
    opts: { ...ch.opts, title: `${ch.ukazatel.label}: ${zkr}${ch.series.some((s) => s.key === 'cr') ? ' a ČR' : ''} ${ch.roky[0] ?? ''}–${ch.roky[ch.roky.length - 1] ?? ''}`.replace(/\s+/g, ' ').trim() },
  };
}

/** Pruh segmentů jedné pojišťovny (část buildSegmenty); bez dat null. */
export function buildSegmentyKarta(S, kod) {
  const ch = buildSegmenty(S, null, { kod });
  const b = ch?.bary.find((x) => String(x.kod) === String(kod));
  if (!b || !b.parts.some((p) => isNum(p.value))) return null;
  return { rok: ch.rok, zkratka: b.zkratka, parts: b.parts, opts: { ...b.opts, title: `Náklady na zdravotní služby podle segmentů ${ch.rok}: ${b.zkratka}`, sub: 'Podíl segmentů na nákladech na zdravotní služby; 100 % = náklady celkem. Složení ovlivňuje i věk kmene, nejde o hodnocení.' } };
}

/** Relativní saldo přerozdělení jedné pojišťovny za poslední celý rok; bez dat null. */
export function buildSaldoKarta(PR, kod) {
  const rok = rokPrerozdeleni(PR);
  const z = zpList(PR).find((x) => String(x.kod) === String(kod));
  const r = z?.rocne?.[rok];
  if (!r || !isNum(r.saldo_relativni_mld)) return null;
  return {
    rok, zkratka: z.zkratka, mld: r.saldo_relativni_mld,
    pct: isNum(r.saldo_relativni_pct_vybraneho) ? r.saldo_relativni_pct_vybraneho : null,
    naPojistence: isNum(r.saldo_relativni_na_pojistence_kc) ? r.saldo_relativni_na_pojistence_kc : null,
  };
}

// ---------------------------------------------------------------- DOM

const stav = { ukazatel: UKAZATEL_VYCHOZI, rok: null, segment: null, vyber: 'vse' };
const dataRef = { PR: null, R: null, S: null, K: null };
const fondStav = { rok: null };

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
  const sl = buildSlozky(PR);
  const np = buildNaPojistence(PR);
  const slozkyHtml = sl
    ? '<div class="zpc-charts zpc-slozky">'
      + `<div class="zpc-chart">${rankedBars(sl.riz.items, sl.riz.opts)}</div>`
      + `<div class="zpc-chart">${rankedBars(sl.plat.items, sl.plat.opts)}</div></div>`
      + `<p class="zpc-cap">${esc(`Roční hodnoty za ${sl.rok} počítají výběr za období${sl.okno ? ` ${sl.okno}` : ''} (okno výběru): sloupec měsíce v PDF Ministerstva zdravotnictví je měsíc přerozdělení a rozděluje se v něm pojistné vybrané za předchozí měsíc. Složka riziková a plátcová se sčítají na saldo; kladné saldo RBP a ČPZP je proto plátcové (nižší výběr na pojištěnce), ne dané starším kmenem.`)}</p>`
    : '';
  const naPojHtml = np
    ? '<div class="zpc-charts">'
      + `<div class="zpc-chart">${rankedBars(np.vybrano.items, np.vybrano.opts)}</div>`
      + `<div class="zpc-chart">${rankedBars(np.po.items, np.po.opts)}</div></div>`
    : '';
  return rankedBars(saldo.items, saldo.opts)
    + slozkyHtml
    + '<div class="zpc-charts">'
    + `<div class="zpc-chart">${segmentedBar(pp.pred.parts, pp.pred.opts)}</div>`
    + `<div class="zpc-chart">${segmentedBar(pp.po.parts, pp.po.opts)}</div></div>`
    + naPojHtml
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
  return `<div class="zpc-seg-bary">${stackedRows(ch.stacked.rows, ch.stacked.parts, ch.stacked.cell, ch.stacked.opts)}</div>`
    + `<p class="zpc-note zpc-fp-who">${who}</p>${dumbbell(ch.dumbbell.items, ch.dumbbell.opts)}`
    + figureSwitch({ id: 'segment', label: 'Segment', kind: 'select', selected: ch.perPojistence.segmentId, options: ch.moznosti.map((m) => ({ value: m.id, label: m.label })) })
    + rankedBars(ch.perPojistence.items, ch.perPojistence.opts)
    + '<p class="zpc-cap">Členění listu MZ se mezi ročníky mění: od roku 2023 jsou ozdravovny podřádkem lázní (dříve samostatný řádek), proto řada Lázně 2022 → 2023 není přesně srovnatelná. Zobrazený rok má jednotné členění.</p>'
    + (ch.perPojistence.cr?.odvozeno ? '<p class="zpc-cap">Pásmo je součet nákladů sedmi pojišťoven dělený součtem jejich pojištěnců, MZ ČR jako celek nezveřejňuje.</p>' : '');
}

/** Dvojice grafů závislá na roce: programy na pojištěnce a složení fondu po pojišťovnách. */
function fondFigHtml(f) {
  const st = f.struktura;
  const jine = st.jine != null
    ? `<p class="zpc-cap">${esc(`Do podílů se počítají jen tyto tři položky; VoZP ČR navíc čerpala ${fmtKc(st.jine, 0)} mil. Kč „z jiných zdrojů“ (specifické fondy VoZP ČR).`)}</p>`
    : '';
  return '<div class="zpc-charts">'
    + `<div class="zpc-chart">${rankedBars(f.programy.items, f.programy.opts)}</div>`
    + `<div class="zpc-chart">${stackedRows(st.rows, st.parts, st.cell, st.opts)}${jine}</div></div>`;
}

/** Celá sekce Fond prevence a provoz (A6.1): přepínač roku, dvojice grafů, ČR v čase, kontext, provoz. */
export function fondHtml(R, K, rok = null) {
  const f = buildFond(R, rok);
  const p = buildProvoz(R);
  const sw = f.roky.length > 1 ? `<div class="zpc-ctl"><div class="zpc-ctl-rok"><span class="zpc-ctl-lbl">Rok čerpání fondu</span>${fondPrepinacHtml(f.roky, f.rok)}</div></div>` : '';
  return sw
    + `<div data-fond-fig>${fondFigHtml(f)}</div>`
    + '<div class="zpc-charts">'
    + `<div class="zpc-chart">${rankedBars(f.ostatniCr.items, f.ostatniCr.opts)}</div>`
    + `<div class="zpc-chart">${rankedBars(p.items, p.opts)}</div></div>`
    + fondKontextHtml(R, K);
}

function radyRender() {
  set('zpRady', dataRef.R ? radyHtml(dataRef.R, stav) : NEDOHLEDANO('Řady hospodaření 2015–2024 zatím nejsou k dispozici (nedohledáno).'));
}

/**
 * Vykreslí sekce stránky Peníze podle přítomných kontejnerů. Chybějící dataset = stav „nedohledáno“.
 * @param {{PR?: object|null, R?: object|null, S?: object|null, K?: object|null}} data  K = měsíční kmen (kontext fondu prevence)
 */
export function renderPenize({ PR = null, R = null, S = null, K = null } = {}) {
  Object.assign(dataRef, { PR, R, S, K });
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
      fondStav.rok = fondRokZUrl(globalThis.location?.search, fondRoky(R));
      set('zpFondProvoz', fondHtml(R, K, fondStav.rok));
    }
  }
  vazbaUdalosti(doc);
}

function vazbaUdalosti(doc) {
  if (!doc?.getElementById || vazbaUdalosti.done) return;
  vazbaUdalosti.done = true;
  const pr = doc.getElementById('zpPrerozdeleni');
  const rady = doc.getElementById('zpRady');
  const seg = doc.getElementById('zpSegmenty');
  // Přepínače jsou figureSwitch; klik, šipky a zápis do URL udělal zp-interact, tady jen překreslení.
  doc.addEventListener(SWITCH_EVENT, (e) => {
    const { id, value } = e.detail || {};
    if (id === 'vyber') {
      stav.vyber = VYBER_REZIMY.some((r) => r.id === value) ? value : 'vse';
      const fig = pr?.querySelector('[data-vyber-fig]');
      if (fig && dataRef.PR) prekresli(fig, vyberMesicniHtml(dataRef.PR, stav.vyber));
    } else if (id === 'ukazatel' && rady && dataRef.R) {
      stav.ukazatel = ukazatelById(value) ? value : UKAZATEL_VYCHOZI;
      stav.rok = null;
      prekresli(rady, radyHtml(dataRef.R, stav), 'select[data-switch="ukazatel"]');
    } else if (id === 'rok' && rady && dataRef.R) {
      stav.rok = Number(value);
      prekresli(rady, radyHtml(dataRef.R, stav), `.zpc-switch[data-switch="rok"] button[data-value="${stav.rok}"]`);
    } else if (id === FOND_ROK_ID && dataRef.R) {
      fondStav.rok = Number(value);
      const fig = doc.getElementById('zpFondProvoz')?.querySelector('[data-fond-fig]');
      if (fig) prekresli(fig, fondFigHtml(buildFond(dataRef.R, fondStav.rok)));
    } else if (id === 'segment' && seg && dataRef.S) {
      stav.segment = value || null;
      prekresli(seg, segmentyHtml(dataRef.S, dataRef.R, mojeKod() || KOD_VZP), 'select[data-switch="segment"]');
    } else return;
    zapisUrl(); // sjednotí URL se stavem (např. změna ukazatele maže rok)
  });
  doc.addEventListener(MOJE_EVENT, () => {
    if (seg && dataRef.S) prekresli(seg, segmentyHtml(dataRef.S, dataRef.R, mojeKod() || KOD_VZP));
  });
}
