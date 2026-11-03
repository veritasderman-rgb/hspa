// Řady hospodaření sedmi zdravotních pojišťoven 2015→ z Hodnocení vývoje systému v. z. p. (MZ ČR) — balíček A1.1.
//
// Spouštěj:  node ingest/transform_pojistovny_hospodareni_rady.js   (po `node ingest/fetchers/mz-hodnoceni.js`)
// Vstup: ingest/cache/mz-hodnoceni/ (manifest.json + vz<rok>_hodnoceni*.xlsx|pdf). Výstup: data/pojistovny-hospodareni-rady.json.
// Idempotentní: stejný vstup = beze změny souboru (generated_at se nemění). Na konci běží validateHospodareniRady (chyby = exit 1).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readSheet, sheetNames } from './lib/xlsx.js';
import { KODY, LISTY, STRANKA_URL, findSheet, parseRok, vyberTab16 } from './lib/mz-hodnoceni.js';
import { validateHospodareniRady } from './lib/validate-hospodareni-rady.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const OUT_PATH = path.join(ROOT, 'data', 'pojistovny-hospodareni-rady.json');
export const P_PATH = path.join(ROOT, 'data', 'pojistovny.json');
export const KODY_PATH = path.join(__dirname, 'mapping', 'pojistovny_kody.json');
export const CACHE_DIR = path.join(ROOT, 'ingest', 'cache', 'mz-hodnoceni');

const round = (v, d) => { const k = 10 ** d; return Math.round(v * k) / k; };
const mld = (v) => round(v / 1e6, 6); // tis. Kč → mld. Kč
const mil = (v) => round(v / 1e3, 3); // tis. Kč → mil. Kč

const PDF7 = 'PDF Tab. 7 (Pojištěnci a zaměstnanci systému v. z. p. dle zdravotních pojišťoven)';
const PDF4 = 'PDF Tab. 4 (Výdaje systému v. z. p. dle zdravotních pojišťoven)';

/**
 * Definice ukazatelů: zdroj (xlsx-1 | xlsx-3 | pdf), list a funkce (b, klic) → {ref:{hodnota,radek,sloupec}|null, hodnota}.
 * `klic` = kód ZP, 'cr' (CELKEM ZP) nebo 'zzp' (CELKEM zaměstnanecké ZP).
 */
const ref1 = (id) => (b, k) => { const x = b.tab1?.[id]?.[k]; return x ? { ref: x, hodnota: x.hodnota } : null; };
const refConv = (fn, conv) => (b, k) => { const x = fn(b, k); return x ? { ref: x.ref, hodnota: conv(x.hodnota) } : null; };
const pdfMap = (sel, pdfKey) => (b, k) => {
  const v = b[pdfKey]?.[sel]?.[k];
  return typeof v === 'number' ? { ref: { radek: null, sloupec: null }, hodnota: v } : null;
};
const PDF17 = 'PDF Tab. 17 (Náklady na preventivní zdravotní péči a další programy čerpané z fondu prevence ZP a specifických fondů VoZP ČR podle zdravotních pojišťoven; ČR celkem z Tab. 16)';
const POMLCKA_POZN = 'MZ uvádí „–“ (nula / neuvedeno)';
const NULA_ROUND = (v) => round(v, 2);
/**
 * Složka fondu prevence (mil. Kč) za ZP z Tab. 17, za ČR (`cr`) z Tab. 16 téhož PDF (viz vyberTab16) a za zaměstnanecké ZP
 * (`zzp`) jako součet šesti ZP bez VZP. `sel` = programy | pobyty | ostatni | jine_zdroje | celkem. „–“ = 0 s poznámkou;
 * „Z jiných zdrojů“ má jen VoZP ČR (ostatní ZP null).
 * @returns {{ref:{radek:null,sloupec:null}, hodnota:number, poznamka?:string, list?:string}|null}
 */
function fondSlozka(b, k, sel) {
  const ref = { radek: null, sloupec: null };
  if (k === 'cr') {
    const v = vyberTab16(b.tab16, b.rok, b.tab17);
    const h = v?.hodnoty?.[sel];
    return typeof h === 'number' ? { ref, hodnota: h, list: 'PDF Tab. 16 (Vývoj nákladů na preventivní zdravotní péči čerpaných z fondu prevence ZP a specifických fondů VoZP ČR; sloupec roku)', ...(v.poznamka ? { poznamka: v.poznamka } : {}) } : null;
  }
  if (!b.tab17) return null;
  if (k === 'zzp') {
    const casti = KODY.filter((kod) => kod !== '111').map((kod) => fondSlozka(b, kod, sel));
    const platne = casti.filter(Boolean);
    if (sel === 'jine_zdroje') return platne.length ? { ref, hodnota: platne.reduce((a, c) => a + c.hodnota, 0) } : null;
    return platne.length === casti.length ? { ref, hodnota: platne.reduce((a, c) => a + c.hodnota, 0) } : null;
  }
  if (sel === 'jine_zdroje' && k !== '201') return null;
  const v = b.tab17[sel]?.[k];
  if (v === undefined) return null;
  if (v === null) return sel === 'celkem' ? null : { ref, hodnota: 0, poznamka: POMLCKA_POZN };
  return { ref, hodnota: v };
}
const fond = (sel) => (b, k) => fondSlozka(b, k, sel);
const fondDef = (sel, jednotka = 'mil. Kč') => ({ zdroj: 'pdf', list: PDF17, jednotka, f: fond(sel) });

export const UKAZATELE = {
  pojistenci_prumer: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'osoby', zakladni: true, f: ref1('pojistenci_prumer') },
  statni_pojistenci: { zdroj: 'pdf', list: PDF7, jednotka: 'osoby', f: pdfMap('statni', 'tab7') },
  statni_pojistenci_pct: {
    zdroj: 'pdf', list: `${PDF7}; podíl vypočten z počtů`, jednotka: '%',
    f: (b, k) => {
      const s = b.tab7?.statni?.[k]; const p = b.tab7?.pojistenci?.[k];
      return typeof s === 'number' && typeof p === 'number' ? { ref: { radek: null, sloupec: null }, hodnota: round((s / p) * 100, 2) } : null;
    },
  },
  zamestnanci: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'osoby (přepočtený počet)', zakladni: true, f: ref1('zamestnanci') },
  pojistencu_na_zamestnance: { zdroj: 'pdf', list: PDF7, jednotka: 'osoby', f: pdfMap('pojistencu_na_zamestnance', 'tab7') },
  prijmy_celkem_mld: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'mld. Kč', zakladni: true, f: refConv(ref1('prijmy_celkem'), mld) },
  pojistne_pred_prerozdelenim_mld: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'mld. Kč', f: refConv(ref1('pojistne_vybrane'), mld) },
  pojistne_po_prerozdeleni_mld: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'mld. Kč', zakladni: true, f: refConv(ref1('pojistne_po_prerozdeleni'), mld) },
  vliv_prerozdeleni_mld: {
    zdroj: 'xlsx-1', list: 'tab.č.1c', jednotka: 'mld. Kč', zakladni: true,
    f: refConv((b, k) => (b.tab1c?.[k] ? { ref: b.tab1c[k], hodnota: b.tab1c[k].hodnota } : null), mld),
  },
  naklady_zs_mld: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3', jednotka: 'mld. Kč', zakladni: true,
    f: refConv((b, k) => (b.tab3?.[k] ? { ref: b.tab3[k], hodnota: b.tab3[k].hodnota } : null), mld),
  },
  naklady_na_pojistence_kc: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3a', jednotka: 'Kč', zakladni: true,
    f: refConv((b, k) => (b.tab3a?.[k] ? { ref: b.tab3a[k], hodnota: b.tab3a[k].hodnota } : null), (v) => round(v, 2)),
  },
  provozni_naklady_mil: { zdroj: 'pdf', list: PDF4, jednotka: 'mil. Kč', f: (b, k) => (k === 'cr' || k === 'zzp' ? null : pdfMap('vlastni_cinnost_mil', 'tab4')(b, k)) },
  provozni_naklady_pct: { zdroj: 'pdf', list: PDF4, jednotka: '%', f: (b, k) => (k === 'cr' || k === 'zzp' ? null : pdfMap('podil_pct', 'tab4')(b, k)) },
  provozni_limit_pct: { zdroj: 'xlsx-1', list: 'tab.č.1a', jednotka: '%', f: () => null },
  provozni_limit_pridelu_mil: {
    zdroj: 'xlsx-1', list: 'tab.č.1a', jednotka: 'mil. Kč',
    f: refConv((b, k) => (b.tab1a?.limit_tis?.[k] ? { ref: b.tab1a.limit_tis[k], hodnota: b.tab1a.limit_tis[k].hodnota } : null), mil),
  },
  provozni_pridel_mil: {
    zdroj: 'xlsx-1', list: 'tab.č.1a', jednotka: 'mil. Kč',
    f: refConv((b, k) => (b.tab1a?.prideleno_tis?.[k] ? { ref: b.tab1a.prideleno_tis[k], hodnota: b.tab1a.prideleno_tis[k].hodnota } : null), mil),
  },
  provozni_vyuziti_limitu_pct: {
    zdroj: 'xlsx-1', list: 'tab.č.1a; podíl skutečného přídělu na maximálním limitu přídělu', jednotka: '%',
    f: (b, k) => {
      const l = b.tab1a?.limit_tis?.[k]; const p = b.tab1a?.prideleno_tis?.[k];
      return l && p && l.hodnota > 0 ? { ref: p, hodnota: round((p.hodnota / l.hodnota) * 100, 2) } : null;
    },
  },
  zustatek_bu_zfzp_mld: { zdroj: 'xlsx-1', list: 'tab.č.1b', jednotka: 'mld. Kč', zakladni: true, f: refConv((b, k) => (b.zustatek?.[k] ? { ref: b.zustatek[k], hodnota: b.zustatek[k].hodnota } : null), mld) },
  rezervni_fond_mld: { zdroj: 'xlsx-1', list: 'tab. č. 1d', jednotka: 'mld. Kč', zakladni: true, f: refConv((b, k) => (b.rezervni?.[k] ? { ref: b.rezervni[k], hodnota: b.rezervni[k].hodnota } : null), mld) },
  pohledavky_po_lhute_mil: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'mil. Kč', zakladni: true, f: refConv(ref1('pohledavky_po_lhute'), mil) },
  zavazky_po_lhute_mil: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'mil. Kč', zakladni: true, f: refConv(ref1('zavazky_po_lhute'), mil) },
  hospodarsky_vysledek_mld: { zdroj: 'xlsx-1', list: 'tab.č.1', jednotka: 'mld. Kč', zakladni: true, f: refConv(ref1('saldo_celkem'), mld) },
  fond_prevence_mil: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3c', jednotka: 'mil. Kč',
    f: refConv((b, k) => (b.tab3c?.celkem?.[k] ? { ref: b.tab3c.celkem[k], hodnota: b.tab3c.celkem[k].hodnota } : null), mil),
  },
  fond_prevence_na_pojistence_kc: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3c', jednotka: 'Kč',
    f: refConv((b, k) => (b.tab3c?.na_pojistence?.[k] ? { ref: b.tab3c.na_pojistence[k], hodnota: b.tab3c.na_pojistence[k].hodnota } : null), (v) => round(v, 2)),
  },
  // A7.1: fond jako peněženka — plán (ZPP) téhož roku, plnění plánu a podíl na pojistném po přerozdělení předchozího roku.
  fond_prevence_zpp_mil: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3c; sloupec „Rok ZPP“ (plán pojišťovny)', jednotka: 'mil. Kč',
    f: refConv((b, k) => (b.tab3c?.zpp_celkem?.[k] ? { ref: b.tab3c.zpp_celkem[k], hodnota: b.tab3c.zpp_celkem[k].hodnota } : null), mil),
  },
  fond_prevence_plneni_zpp_pct: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3c; skutečnost / sloupec „Rok ZPP“ × 100', jednotka: '%',
    f: (b, k) => {
      const s = b.tab3c?.celkem?.[k]; const z = b.tab3c?.zpp_celkem?.[k];
      return s && z && z.hodnota > 0 ? { ref: s, hodnota: round((s.hodnota / z.hodnota) * 100, 4) } : null;
    },
  },
  fond_prevence_podil_pojistneho_pct: {
    zdroj: 'xlsx-3', list: 'Tabulka č. 3c (fond prevence celkem, tis. Kč) / tab.č.1 předchozího roku (pojistné po přerozdělení, tis. Kč) × 100', jednotka: '%',
    f: (b, k, prev) => {
      const s = b.tab3c?.celkem?.[k]; const p = prev?.tab1?.pojistne_po_prerozdeleni?.[k];
      if (!s || !p || !(p.hodnota > 0)) return null;
      return { ref: s, hodnota: round((s.hodnota / p.hodnota) * 100, 3), ...(k === '111' && b.rok < 2023 ? { poznamka: 'před 2023 jiný režim zdrojů fondu u VZP (§ 7c zák. 551/1991 platí pro VZP od 1. 1. 2023)' } : {}) };
    },
  },
  // A6.1: kam fond prevence teče (Tab. 17; ČR z Tab. 16). Celkový fond (výše) sčítá zdravotní programy, ozdravné pobyty a „ostatní činnosti“.
  fond_prevence_programy_mil: fondDef('programy'),
  fond_prevence_pobyty_mil: fondDef('pobyty'),
  fond_prevence_ostatni_mil: fondDef('ostatni'),
  fond_prevence_jine_zdroje_mil: fondDef('jine_zdroje'),
  fond_prevence_celkem_t17_mil: fondDef('celkem'),
  fond_prevence_programy_na_pojistence_kc: {
    zdroj: 'pdf', list: `${PDF17}; zdravotní programy / průměrný počet pojištěnců (tab.č.1)`, jednotka: 'Kč',
    f: (b, k) => {
      const p = fondSlozka(b, k, 'programy'); const poj = b.tab1?.pojistenci_prumer?.[k];
      return p && poj && poj.hodnota > 0 ? { ref: p.ref, hodnota: NULA_ROUND((p.hodnota * 1e6) / poj.hodnota), ...(p.poznamka ? { poznamka: p.poznamka } : {}) } : null;
    },
  },
  fond_prevence_ostatni_podil_pct: {
    zdroj: 'pdf', list: `${PDF17}; ostatní činnosti / celkové náklady`, jednotka: '%',
    f: (b, k) => {
      const o = fondSlozka(b, k, 'ostatni'); const c = fondSlozka(b, k, 'celkem');
      return o && c && c.hodnota > 0 ? { ref: o.ref, hodnota: NULA_ROUND((o.hodnota / c.hodnota) * 100) } : null;
    },
  },
};
const NOVE_FOND = ['fond_prevence_programy_mil', 'fond_prevence_pobyty_mil', 'fond_prevence_ostatni_mil', 'fond_prevence_jine_zdroje_mil', 'fond_prevence_celkem_t17_mil', 'fond_prevence_programy_na_pojistence_kc', 'fond_prevence_ostatni_podil_pct'];
export const ZAKLADNI_RADY = Object.entries(UKAZATELE).filter(([, d]) => d.zakladni).map(([id]) => id);

const DUVODY = (id, rok) => {
  if (NOVE_FOND.includes(id)) {
    if (rok < 2018) return `Tab. 17 v Hodnocení za rok ${rok} není (PDF má jen celkové řady fondu prevence za ČR, bez rozpisu po ZP; ČR viz cr.rady)`;
    if (id === 'fond_prevence_jine_zdroje_mil') return `Tab. 17 v Hodnocení za rok ${rok} uvádí „Z jiných zdrojů“ jen u VoZP ČR (specifické fondy); u ostatních ZP je řádek pomlčka`;
  }
  if (id === 'fond_prevence_podil_pojistneho_pct' && rok === 2015) return 'Strop fondu se počítá z pojistného po přerozdělení předchozího roku; ročník Hodnocení 2014 v datasetu není (řady začínají 2015), podíl pro 2015 nelze spočítat';
  if (['statni_pojistenci', 'statni_pojistenci_pct', 'pojistencu_na_zamestnance'].includes(id)) {
    return `Hodnocení MZ za rok ${rok} nemá v PDF tabulku „Pojištěnci a zaměstnanci … dle zdravotních pojišťoven“ (Tab. 7) s čísly po ZP, jen graf; nedopočítáváno`;
  }
  if (['provozni_naklady_mil', 'provozni_naklady_pct'].includes(id)) return `PDF Hodnocení MZ za rok ${rok} nemá tabulku „Výdaje systému v. z. p. dle zdravotních pojišťoven“ (Tab. 4) s výdaji na vlastní činnost`;
  if (id === 'provozni_limit_pct') return 'Hodnocení MZ uvádí limit nákladů na činnost (vyhl. 418/2003 Sb.) jen v tis. Kč (tab.č.1a), ne jako % z rozvrhové základny; k dispozici provozni_limit_pridelu_mil, provozni_pridel_mil, provozni_vyuziti_limitu_pct';
  return `hodnota v Hodnocení MZ za rok ${rok} nenalezena (viz list ${UKAZATELE[id].list})`;
};

/**
 * Čistá funkce: sestaví dataset (bez generated_at) z už naparsovaných ročníků.
 * @param {{ bundles: object[], soubory: Record<number, Record<string,{url:string, sha256?:string, soubor?:string}>>, zkratky: Record<string,string>, stazeno_at?: string|null, neaktivni?: object[] }} v
 */
export function sestavRady({ bundles, soubory, zkratky, stazeno_at = null, neaktivni = [] }) {
  const roky = bundles.map((b) => b.rok).sort((a, b) => a - b);
  const byRok = new Map(bundles.map((b) => [b.rok, b]));
  const bunka = (id, def, b, k) => {
    const r = def.f(b, k, byRok.get(b.rok - 1));
    if (!r) return null;
    const url = soubory[b.rok]?.[def.zdroj]?.url;
    return { hodnota: r.hodnota, rok: b.rok, zdroj: url ?? null, list: r.list ?? def.list, radek: r.ref.radek ?? null, sloupec: r.ref.sloupec ?? null, ...(r.poznamka ? { poznamka: r.poznamka } : {}) };
  };
  const rady = (k) => {
    const o = {};
    for (const [id, def] of Object.entries(UKAZATELE)) {
      o[id] = {};
      for (const rok of roky) o[id][String(rok)] = bunka(id, def, byRok.get(rok), k);
    }
    return o;
  };
  const pojistovny = KODY.map((kod) => ({ kod, zkratka: zkratky[kod] ?? kod, rady: rady(kod), historicke: [] }));

  const skupiny = new Map();
  for (const id of Object.keys(UKAZATELE)) {
    for (const rok of roky) {
      const chybejici = KODY.filter((kod) => pojistovny.find((p) => p.kod === kod).rady[id][String(rok)] == null);
      if (!chybejici.length) continue;
      const duvod = DUVODY(id, rok);
      const key = `${id}|${duvod.replace(String(rok), 'ROK')}`;
      if (!skupiny.has(key)) skupiny.set(key, { ukazatel: id, roky: [], kody: chybejici, duvod });
      const s = skupiny.get(key);
      s.roky.push(rok);
      if (chybejici.length > s.kody.length) s.kody = chybejici;
    }
  }
  const chybi = [...skupiny.values()].map((s) => ({ ...s, kody: s.kody.length === KODY.length ? 'vsechny' : s.kody, duvod: s.duvod.replace(/za rok \d{4}/, `za rok ${s.roky[0]}${s.roky.length > 1 ? ` a další ročníky (${s.roky.join(', ')})` : ''}`) }));

  const soubor = [];
  for (const rok of roky) for (const [typ, s] of Object.entries(soubory[rok] ?? {})) soubor.push({ rok, typ, soubor: s.soubor ?? s.url.split('/').pop(), url: s.url, sha256: s.sha256 ?? null });
  return {
    version: '1.0',
    _doc: [
      'Řady hospodaření sedmi zdravotních pojišťoven za roky z Hodnocení vývoje systému veřejného zdravotního pojištění (MZ ČR), jeden ročník = jedna hodnota „skutečnost“ daného roku z tabulkové přílohy (XLSX) a z PDF. Každá hodnota je obálka {hodnota, rok, zdroj, list, radek, sloupec}: `zdroj` = URL souboru, `list` = list/tabulka, `radek` = číslo řádku listu jako v Excelu (od 1), `sloupec` = písmeno sloupce; u hodnot z PDF jsou radek/sloupec null. Co v ročníku není, je null a řada je vyjmenována v `chybi[]`; nic se nedopočítává kromě uvedených podílů.',
      'Jednotky: mld. Kč a mil. Kč jsou přepočtem z tis. Kč listů MZ (tis./1e6 resp. tis./1e3); počty v osobách; naklady_na_pojistence_kc a fond_prevence_na_pojistence_kc v Kč.',
      'vliv_prerozdeleni_mld je list tab.č.1c Hodnocení MZ („Vliv přerozdělování“ / v PDF „Výstupy z přerozdělování platby státu“): částka po přerozdělení minus pojistné vybrané před přerozdělením (VZP 2024: 103,378 mld.); součet za všechny ZP odpovídá platbě státu a paušální dani přerozdělené do systému. NENÍ to platba státu na jednotlivou pojišťovnu (tu MZ po ZP nezveřejňuje), a proto čisté saldo přerozdělení z těchto dat nevzniká. pojistne_pred_prerozdelenim_mld a pojistne_po_prerozdeleni_mld jsou sloupce „Příjmy z pojistného – výběr“ a „vč. vlivu přerozdělování“ v tab.č.1; platí vliv_prerozdeleni = po − před (validátor to kontroluje).',
      'naklady_zs_mld a naklady_na_pojistence_kc: ř. I. „Náklady na zdravotní služby celkem čerpané z oddílu A“ v Tabulce č. 3 a 3a (akruální náklady ZFZP, shoda s pojistovny.json pro 2024). hospodarsky_vysledek_mld: tab.č.1 „Saldo příjmů a výdajů celkem vč. zdaňovaných“. zustatek_bu_zfzp_mld: tab.č.1b „KZ na bankovním účtu ZFZP k 31. 12.“; rezervni_fond_mld: tab. č. 1d „Skutečné naplnění rezervního fondu“. pohledavky_po_lhute_mil: pohledávky za plátci pojistného po lhůtě splatnosti; zavazky_po_lhute_mil: závazky vůči poskytovatelům po lhůtě splatnosti (tab.č.1; shoda s PDF Tab. 5 a tab.č.1b).',
      'Fond prevence (balíček A6.1): fond_prevence_mil / fond_prevence_na_pojistence_kc (Tabulka č. 3c) jsou celkové náklady fondu včetně ozdravných pobytů a „ostatních činností“ (v letech 2021–2022 hlavně antigenní testování na covid, které MZ vykazuje v „ostatních činnostech“). Rozpis po ZP je z PDF Tab. 17 (mil. Kč, ročníky 2018–2024; dříve v PDF není): fond_prevence_programy_mil (zdravotní programy), fond_prevence_pobyty_mil (ozdravné pobyty), fond_prevence_ostatni_mil (ostatní činnosti), fond_prevence_jine_zdroje_mil (jen VoZP ČR, specifické fondy; u ostatních ZP null), fond_prevence_celkem_t17_mil (řádek Celkové náklady). Pomlčka „–“ v Tab. 17 je uložena jako 0 s poznámkou. U `cr` jsou stejné řady z Tab. 16 (u 2015–2017 Tab. 8 v tis. Kč přepočtená na mil. Kč) ze sloupce roku v PDF téhož roku; v PDF 2018 jsou sloupce „2018“ a „2018 ZPP“ zaměněny, proto je u 2018 použit sloupec, který sedí na Tab. 17 (poznámka v buňce). fond_prevence_programy_na_pojistence_kc = zdravotní programy / průměrný počet pojištěnců (tab.č.1) v Kč (MZ zaokrouhluje na mil. Kč, u ZPŠ je chyba zaokrouhlení kolem 3 %); fond_prevence_ostatni_podil_pct = ostatní činnosti / celkové náklady Tab. 17 × 100. Co MZ počítá do „ostatních činností“, Hodnocení nedefinuje. Od 1. 1. 2023 má VZP stejné zdroje fondu jako zaměstnanecké ZP (§ 7c zák. 551/1991), proto skok VZP 2023 → 2024 není srovnatelný s předchozími roky.',
      'Fond prevence (balíček A7.1): fond_prevence_zpp_mil = plán fondu prevence (sloupec „Rok ZPP“ Tabulky č. 3c, tj. plán pojišťovny schválený v zdravotně pojistném plánu; mil. Kč); fond_prevence_plneni_zpp_pct = skutečnost Tab. 3c / plán ZPP × 100 (MZ tiskne totéž ve sloupci „ZPP (v %)“; hodnoty se mohou lišit o zaokrouhlení skutečnosti); fond_prevence_podil_pojistneho_pct = fond_prevence_mil roku / (pojistne_po_prerozdeleni_mld předchozího roku × 1 000) × 100, tedy poměr k základně, ze které zákon strop 3 % počítá (§ 7c zák. 551/1991, § 18b zák. 280/1992: až 3 % pojistného po přerozdělení za předchozí rok ze ZF při neschodkovém ZPP; nad strop se ale do fondu smí dostat i pokuty, penále, přirážky a provozní fond, takže podíl nad 3 % není automaticky porušení). Rok 2015 je null (chybí 2014). U VZP před rokem 2023 platil jiný režim zdrojů fondu (poznámka v buňce), podíl se s pozdějšími roky nesrovnává.',
      'statni_pojistenci, pojistencu_na_zamestnance: PDF Tab. 7 (jen ročníky 2018–2024, dříve jen graf). statni_pojistenci_pct = statni_pojistenci / průměrný počet pojištěnců z téže PDF tabulky × 100 na 2 desetinná místa (MZ tiskne zaokrouhleno, v roce 2018 na celá procenta). provozni_naklady_mil = „výdaje na vlastní činnost“ a provozni_naklady_pct = jejich „podíl na výdajích celkem“, jak je tiskne MZ v PDF Tab. 4 (2018–2024): výdaje na vlastní činnost (výdajový ukazatel MF vč. fondů, zahrnuje jinou činnost) / výdaje celkem. Tento podíl se liší od zákonného limitu nákladů na činnost.',
      'provozni_limit_pct je pro všechny roky null: MZ uvádí limit (§ 7 vyhl. 418/2003 Sb.) jen v tis. Kč; z tab.č.1a jsou proto provozni_limit_pridelu_mil, provozni_pridel_mil a provozni_vyuziti_limitu_pct (= příděl / maximální limit přídělu × 100).',
      '`cr` = řádek CELKEM ZP (sedm činných ZP), `zamestnanecke` = CELKEM zaměstnanecké ZP (bez VZP). `historicke[]` je prázdné: v letech 2015–2024 se kódy sedmi ZP nezměnily, sloučené/likvidované ZP v Hodnocení čísla nemají (ingest/mapping/pojistovny_kody.json, `neaktivni_zp`).',
    ].join(' '),
    zdroj: {
      nazev: 'MZ ČR · Hodnocení vývoje systému veřejného zdravotního pojištění (tabulková příloha XLSX a PDF za každý rok)',
      url: STRANKA_URL,
      soubory: soubor,
      stazeno_at,
    },
    roky,
    jednotky: Object.fromEntries(Object.entries(UKAZATELE).map(([id, d]) => [id, d.jednotka])),
    pojistovny,
    cr: { rady: rady('cr') },
    zamestnanecke: { rady: rady('zzp') },
    neaktivni_zp: neaktivni,
    chybi,
  };
}

export function serializuj(obj) {
  const s = JSON.stringify(obj, null, 2);
  const prim = '(?:-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?|null|"[^"\\n]*")';
  const objekt = new RegExp(`\\{\\s*"[^"\\n]+": ${prim}(?:,\\s*"[^"\\n]+": ${prim})*\\s*\\}`, 'g');
  const pole = new RegExp(`\\[\\s*${prim}(?:,\\s*${prim})*\\s*\\]`, 'g');
  const sbal = (m) => m.replace(/\s*\n\s*/g, ' ').replace(/^([[{]) /, '$1').replace(/ ([\]}])$/, '$1');
  return `${s.replace(objekt, sbal).replace(pole, sbal)}\n`;
}
/**
 * Porovnání bez časových razítek: `generated_at` i každé `stazeno_at` (kdekoli v objektu) se vynechají.
 * V CI není cache, takže by jinak každý běh přinesl nové `stazeno_at` a soubor by se přepsal i bez změny dat
 * (workflow pojistovny-mz.yml by otevíral PR jen s razítky). Exportováno kvůli testům.
 */
export function bezCasu(o) {
  const c = structuredClone(o);
  const strip = (x) => {
    if (Array.isArray(x)) { x.forEach(strip); return; }
    if (x && typeof x === 'object') { delete x.generated_at; delete x.stazeno_at; Object.values(x).forEach(strip); }
  };
  strip(c);
  return c;
}

function nactiBundle(rok, soubory, cacheDir) {
  const listy = {};
  const cesty = Object.fromEntries(Object.entries(soubory).map(([t, s]) => [t, path.join(cacheDir, s.soubor ?? s.url.split('/').pop())]));
  for (const [k, d] of Object.entries(LISTY)) {
    const f = cesty[d.soubor];
    if (!f || !fs.existsSync(f)) continue;
    const nm = findSheet(sheetNames(f), d.nazev);
    if (nm) listy[k] = readSheet(f, nm);
  }
  let pdfText = null;
  if (cesty.pdf && fs.existsSync(cesty.pdf)) {
    pdfText = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', cesty.pdf, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  }
  return parseRok({ rok, listy, pdfText });
}

export function run({ out = OUT_PATH, cacheDir = CACHE_DIR, zapis = true } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(cacheDir, 'manifest.json'), 'utf8'));
  const poRocich = {};
  for (const p of manifest.polozky) if (p.stav === 'ok') (poRocich[p.rok] ??= {})[p.typ] = { url: p.url, soubor: p.soubor, sha256: p.sha256 };
  const roky = Object.keys(poRocich).map(Number).sort((a, b) => a - b).filter((r) => poRocich[r]['xlsx-1'] && poRocich[r]['xlsx-3']);
  const bundles = roky.map((r) => nactiBundle(r, poRocich[r], cacheDir));
  const P = JSON.parse(fs.readFileSync(P_PATH, 'utf8'));
  const zkratky = Object.fromEntries((P.pojistovny ?? []).map((z) => [String(z.kod), z.zkratka]));
  const mapKody = JSON.parse(fs.readFileSync(KODY_PATH, 'utf8'));
  const neaktivni = Object.entries(mapKody).filter(([k, v]) => !k.startsWith('_') && v.stav !== 'aktivni').map(([kod, v]) => ({ kod: kod.replace(/-.*/, ''), ...v }));
  const stazeno = manifest.polozky.map((p) => p.stazeno_at).filter(Boolean).sort().pop() ?? null;
  const data = sestavRady({ bundles, soubory: poRocich, zkratky, stazeno_at: stazeno, neaktivni });
  const parseChyby = bundles.flatMap((b) => b.chyby);
  const val = validateHospodareniRady(data, { pojistovny: P });
  let predchozi = null;
  try { predchozi = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (_) { /* ještě není */ }
  const zmeneno = !predchozi || JSON.stringify(bezCasu(predchozi)) !== JSON.stringify(bezCasu(data));
  // Beze změny dat zůstává předchozí soubor včetně razítek (stazeno_at, generated_at); jinak nová razítka.
  const hotovo = zmeneno ? { version: data.version, generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), ...data } : predchozi;
  if (!val.errors.length && !parseChyby.length && zmeneno && zapis) fs.writeFileSync(out, serializuj(hotovo), 'utf8');
  return { zmeneno, data: hotovo, errors: [...parseChyby, ...val.errors], warnings: val.warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    for (const w of r.warnings) console.warn(`  ! ${w}`);
    if (r.errors.length) { for (const e of r.errors) console.error(`  ✗ ${e}`); process.exit(1); }
    const d = r.data;
    console.log(`✓ transform_pojistovny_hospodareni_rady: ${d.roky[0]}–${d.roky.at(-1)}, ${d.pojistovny.length} ZP, ${Object.keys(UKAZATELE).length} ukazatelů${r.zmeneno ? '' : ' — beze změny'}`);
  } catch (e) { console.error('✗ transform_pojistovny_hospodareni_rady:', e.message); process.exit(1); }
}
