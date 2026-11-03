// Čisté parsery pro Hodnocení vývoje systému veřejného zdravotního pojištění (MZ ČR) — balíček A1.1.
// Bez sítě a bez zápisů na disk; používá je ingest/fetchers/mz-hodnoceni.js,
// ingest/transform_pojistovny_hospodareni_rady.js a tests/mz-hodnoceni.test.js.
//
// Vstup parserů tabulek je pole polí (řádky listu z ingest/lib/xlsx.js `readSheet`), parserů PDF text
// z `pdftotext -layout`. Sloupce se hledají podle HLAVIČEK (bloky v hlavičkovém řádku, rok a „skutečnost“
// v podhlavičkách), ne podle pevných indexů: mezi ročníky 2015–2024 se pozice sloupců posouvají
// (tab.č.1 má bloky po 5 sloupcích, 2015–2017 má navíc sloupce „záloha od ČKA“ a „ZPP“ v jiném pořadí;
// Tabulka č. 3 má v ročnících 2015–2022 sloupec „m. j.“, v dalších ne).
// Každá nalezená hodnota nese `radek` (číslo řádku v listu jako v Excelu, od 1) a `sloupec` (písmeno sloupce).

import { num } from './xlsx.js';
import { decodeEntities } from './pojistovny-vz.js';

export const STRANKA_URL = 'https://mzd.gov.cz/hodnoceni-vyvoje-systemu-verejneho-zdravotniho-pojisteni/';
export const KODY = ['111', '201', '205', '207', '209', '211', '213'];

// ---------------------------------------------------------------------------------- obecné pomocné

export const colLetter = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
/** Bez mezer, tečky a diakritiky na lowercase — pro porovnání názvů listů a štítků. */
export const squash = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s.]/g, '');
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const cell = (rows, r, c) => (rows[r] ? rows[r][c] : undefined);
const ref = (r, c, hodnota) => ({ hodnota, radek: r + 1, sloupec: colLetter(c) });
const kodOf = (v) => {
  const s = norm(v);
  return KODY.includes(s) ? s : null;
};
const yearIn = (v) => {
  if (isNum(v)) return v;
  const m = /(?<!\d)(20\d\d)(?!\d)/.exec(String(v ?? ''));
  return m ? Number(m[1]) : null;
};

/** Najde název listu podle normalizovaného klíče („tab.č.1“ = „tab. č.1“ = „Tab. č. 1“). */
export function findSheet(names, key) {
  const k = squash(key);
  return names.find((n) => squash(n) === k) ?? null;
}

// ---------------------------------------------------------------------------------- odkazy na stránce

export function typSouboru(url) {
  const base = String(url).split(/[?#]/)[0].split('/').pop() ?? '';
  if (/\.pdf$/i.test(base)) return 'pdf';
  if (/tab_?3/i.test(base) && /\.xlsx$/i.test(base)) return 'xlsx-3';
  if (/tab_?1/i.test(base) && /\.xlsx$/i.test(base)) return 'xlsx-1';
  return null;
}

/**
 * Z HTML stránky vytáhne odkazy na vz<rok>_hodnoceni*.(pdf|xlsx).
 * @returns {{rok:number, typ:'pdf'|'xlsx-1'|'xlsx-3'|null, url:string, soubor:string}[]} podle roku a typu, bez duplicit
 */
export function parseLinks(html, pageUrl = STRANKA_URL) {
  const out = [];
  const seen = new Set();
  const re = /href\s*=\s*["']([^"']*?vz(\d{4})_hodnoceni[^"']*?\.(?:pdf|xlsx))["']/gi;
  let m;
  while ((m = re.exec(String(html)))) {
    let url;
    try { url = new URL(decodeEntities(m[1]), pageUrl).href; } catch { continue; }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ rok: Number(m[2]), typ: typSouboru(url), url, soubor: url.split('/').pop() });
  }
  const poradi = { pdf: 0, 'xlsx-1': 1, 'xlsx-3': 2 };
  return out.sort((a, b) => a.rok - b.rok || (poradi[a.typ] ?? 9) - (poradi[b.typ] ?? 9));
}

// ---------------------------------------------------------------------------------- tab.č.1

/**
 * Bloky hlavičky tab.č.1: id → { od, do } (sloupce). Štítek bloku je v řádku 0, upřesnění (výběr / vč. vlivu
 * přerozdělování / po lhůtě splatnosti) v řádku 1.
 */
const TAB1_BLOKY = [
  { id: 'pojistenci_prumer', re: /^pr[uů]m[eě]rn[yý] po[cč]et poj/i },
  { id: 'zamestnanci', re: /^pr[uů]m[eě]rn[yý] p[rř]epo[cč]ten/i },
  { id: 'pojistne_vybrane', re: /^p[rř][ií]jmy z pojistn[eé]ho/i, sub: /v[yý]b[eě]r/i },
  { id: 'pojistne_po_prerozdeleni', re: /^p[rř][ií]jmy z pojistn[eé]ho/i, sub: /p[rř]erozd[eě]l/i },
  { id: 'prijmy_celkem', re: /^p[rř][ií]jmy celkem/i },
  { id: 'vydaje_celkem', re: /^v[yý]daje celkem/i },
  { id: 'saldo_celkem', re: /^saldo p[rř][ií]jm[uů] a v[yý]daj[uů] celkem/i },
  { id: 'zavazky_po_lhute', re: /^z toho z[aá]vazky v[uů][cč]i/i, sub: /po lh[uů]t[eě]/i },
  { id: 'pohledavky_po_lhute', re: /^z toho pohled[aá]vky za pl[aá]tci/i, sub: /po lh[uů]t[eě]/i },
];

/**
 * @param {any[][]} rows list `tab.č.1`
 * @param {{rok:number}} opts
 * @returns {{ polozky: Record<string, Record<string, {hodnota:number, radek:number, sloupec:string}|null>>, chyby: string[] }}
 *   polozky[id][kod|'cr'|'zzp'] — hodnoty tak, jak jsou v listu (osoby; tis. Kč; počet zaměstnanců)
 */
export function parseTab1(rows, { rok }) {
  const chyby = [];
  const hlav = rows.findIndex((r) => r && norm(r[0]) === 'Kód');
  if (hlav < 1) throw new Error('tab.č.1: nenalezen hlavičkový řádek „Kód“');
  const rYear = hlav + 1;
  const rKind = hlav + 2;
  // začátky bloků = neprázdné buňky v řádku 0 (štítek), posun od sloupce 2
  const starts = [];
  rows[0].forEach((c, j) => { if (j >= 2 && norm(c)) starts.push(j); });
  const width = Math.max(...rows.slice(0, hlav + 3).map((r) => r?.length ?? 0));
  const bloky = {};
  starts.forEach((s, i) => {
    const konec = i + 1 < starts.length ? starts[i + 1] : width;
    const lab = norm(rows[0][s]);
    const sub = norm(cell(rows, 1, s));
    const def = TAB1_BLOKY.find((b) => b.re.test(lab) && (!b.sub || b.sub.test(sub)) && !bloky[b.id]);
    if (def) bloky[def.id] = { od: s, do: konec };
  });
  // sloupec „skutečnost / stav k 31. 12.“ za zadaný rok v bloku
  const sloupec = (b) => {
    for (let c = b.od; c < b.do; c++) {
      if (yearIn(cell(rows, rYear, c)) === rok && /^(skute[cč]nost|stav k)/i.test(norm(cell(rows, rKind, c)))) return c;
    }
    return null;
  };
  const sloupce = {};
  for (const def of TAB1_BLOKY) {
    if (!bloky[def.id]) { chyby.push(`tab.č.1: blok ${def.id} nenalezen`); continue; }
    sloupce[def.id] = sloupec(bloky[def.id]);
    if (sloupce[def.id] == null) chyby.push(`tab.č.1: blok ${def.id} nemá sloupec skutečnosti za ${rok}`);
  }

  // řádky Části A (před „Část B“), první výskyt kódu
  const polozky = {};
  for (const id of Object.keys(sloupce)) polozky[id] = {};
  for (let r = hlav + 3; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    if (/[CČ]\s*[aá]\s*s\s*t\s+B/i.test(norm(row[1]))) break;
    const label = squash(row[0]);
    let klic = kodOf(row[0]);
    if (!klic && label.startsWith('celkemzzp')) klic = 'zzp';
    else if (!klic && label.startsWith('celkemzp') && !label.includes('slouc')) klic = 'cr';
    if (!klic) continue;
    for (const [id, c] of Object.entries(sloupce)) {
      if (c == null || polozky[id][klic]) continue;
      const v = row[c];
      polozky[id][klic] = isNum(v) ? ref(r, c, v) : null;
    }
  }
  return { polozky, chyby };
}

// ---------------------------------------------------------------------------------- tab.č.1a

/** Limit nákladů na činnost: { kod: { limit_tis, prideleno_tis, rozdil_tis } } (+ cr, zzp), tis. Kč. */
export function parseTab1a(rows, { rok }) {
  const hlav = rows.findIndex((r) => r && norm(r[0]) === 'Kód');
  if (hlav < 0) throw new Error('tab.č.1a: nenalezen hlavičkový řádek „Kód“');
  let start = null;
  rows[hlav].forEach((c, j) => { if (start == null && yearIn(c) === rok && /^rok/i.test(norm(c))) start = j; });
  if (start == null) throw new Error(`tab.č.1a: nenalezen blok „Rok ${rok}“`);
  const out = { limit_tis: {}, prideleno_tis: {} };
  for (let r = hlav + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    if (/[CČ]\s*[aá]\s*s\s*t\s+B/i.test(norm(row[1]))) break;
    const label = squash(row[0]);
    let klic = kodOf(row[0]);
    if (!klic && label.startsWith('celkemzzp')) klic = 'zzp';
    else if (!klic && label.startsWith('celkemzp')) klic = 'cr';
    if (!klic) continue;
    if (out.limit_tis[klic]) continue;
    const lim = row[start];
    const pri = row[start + 1];
    out.limit_tis[klic] = isNum(lim) ? ref(r, start, lim) : null;
    out.prideleno_tis[klic] = isNum(pri) ? ref(r, start + 1, pri) : null;
  }
  return out;
}

// ---------------------------------------------------------------------------------- tab.č.1b a 1d

const ZP_HLAVICKY = {
  vzpcr: '111', vozpcr: '201', cpzp: '205', ozp: '207', zps: '209', zpmvcr: '211', zpmv: '211', rbp: '213',
  celkem: 'cr', zzpcelkem: 'zzp',
};

/** Sloupce hlavičky „VZP ČR | VoZP ČR | … | CELKEM“ → { kod|'cr'|'zzp': index sloupce }. */
export function zpSloupce(headerRow) {
  const out = {};
  (headerRow ?? []).forEach((c, j) => {
    if (j === 0) return;
    const k = ZP_HLAVICKY[squash(c)];
    if (k && out[k] == null) out[k] = j;
  });
  return out;
}

/**
 * Řádek tabulky s hlavičkou ZP po sloupcích (1b, 1d). Hledá první řádek, jehož štítek (sloupec A) odpovídá `label`,
 * a to jen v prvním bloku (než se hlavička znovu zopakuje — druhý blok je předchozí rok).
 * @returns {Record<string, {hodnota:number, radek:number, sloupec:string}|null>} kod|'cr'|'zzp' → hodnota (tis. Kč)
 */
export function parseTabZpRadek(rows, label) {
  const sl = zpSloupce(rows[0]);
  if (!Object.keys(sl).length) throw new Error('tab.č.1b/1d: nenalezena hlavička ZP v řádku 1');
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    if (Object.keys(zpSloupce(row)).length >= 5) break; // opakovaná hlavička = předchozí rok
    if (!label.test(norm(row[0]))) continue;
    const out = {};
    for (const [k, c] of Object.entries(sl)) out[k] = isNum(row[c]) ? ref(r, c, row[c]) : null;
    return out;
  }
  return null;
}

// ---------------------------------------------------------------------------------- tab.č.1c

/** „Výstupy z přerozdělování platby státu“: sloupec s hlavičkou = rok, hodnoty v tis. Kč. */
export function parseTab1c(rows, { rok }) {
  const hlav = rows.findIndex((r) => r && norm(r[0]) === 'Kód');
  if (hlav < 0) throw new Error('tab.č.1c: nenalezen hlavičkový řádek „Kód“');
  let c = null;
  rows[hlav].forEach((v, j) => { if (c == null && j >= 2 && isNum(yearIn(v)) && yearIn(v) === rok && norm(v).length <= 4) c = j; });
  if (c == null) throw new Error(`tab.č.1c: nenalezen sloupec ${rok}`);
  const out = {};
  for (let r = hlav + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const label = squash(row[0]);
    let klic = kodOf(row[0]);
    if (!klic && label.startsWith('saldocelkemzzp')) klic = 'zzp';
    else if (!klic && label.startsWith('saldocelkemzp')) klic = 'cr';
    if (!klic || out[klic]) continue;
    out[klic] = isNum(row[c]) ? ref(r, c, row[c]) : null;
  }
  return out;
}

// ---------------------------------------------------------------------------------- Tabulka č. 3 a 3a

/**
 * Náklady na zdravotní služby celkem (ř. I., „čerpané z oddílu A“) za rok a pojišťovnu: Tabulka č. 3 (tis. Kč)
 * a 3a (Kč na pojištěnce). Bloky pojišťoven se hledají podle hlavičky „111 – Všeobecná …“.
 */
export function parseTab3Celkem(rows, { rok }) {
  const hlav = rows.findIndex((r) => r && r.some((c) => /^\d{3}\s*[–-]\s*\S/.test(norm(c))));
  if (hlav < 0) throw new Error('Tabulka č. 3: nenalezena hlavička bloků pojišťoven');
  const rYear = hlav + 1;
  const rKind = hlav + 2;
  const starts = [];
  rows[hlav].forEach((c, j) => {
    const t = norm(c);
    let klic = null;
    const m = /^(\d{3})\s*[–-]/.exec(t);
    if (m && KODY.includes(m[1])) klic = m[1];
    else if (/^zam[eě]stnaneck[eé] zdravotn[ií] poj/i.test(t)) klic = 'zzp';
    else if (/^zdravotn[ií] poj[ií][sš][tť]ovny celkem/i.test(t)) klic = 'cr';
    if (klic) starts.push({ klic, od: j });
  });
  const width = Math.max(...rows.slice(0, hlav + 4).map((r) => r?.length ?? 0));
  const sloupce = {};
  starts.forEach((s, i) => {
    const konec = i + 1 < starts.length ? starts[i + 1].od : width;
    for (let c = s.od; c < konec; c++) {
      if (yearIn(cell(rows, rYear, c)) === rok && /^skute[cč]nost/i.test(norm(cell(rows, rKind, c)))) { sloupce[s.klic] = c; break; }
    }
  });
  // řádek I. = první řádek s popiskem „Náklady na zdravotní služby celkem“ ve sloupci C (index 2)
  const r = rows.findIndex((row, i) => i > rKind && /^n[aá]klady na zdravotn[ií] slu[zž]by celkem/i.test(norm(row?.[2])));
  if (r < 0) throw new Error('Tabulka č. 3: nenalezen řádek „Náklady na zdravotní služby celkem“');
  const out = {};
  for (const [klic, c] of Object.entries(sloupce)) out[klic] = isNum(rows[r][c]) ? ref(r, c, rows[r][c]) : null;
  return out;
}

// ---------------------------------------------------------------------------------- Tabulka č. 3c

/**
 * Fond prevence (náklady na preventivní zdravotní péči): { celkem: {kod|cr|zzp → hodnota tis. Kč},
 * na_pojistence: {kod|cr|zzp → hodnota Kč} }. Řádky ZP mají v 2. sloupci kód.
 */
export function parseTab3c(rows, { rok }) {
  const hlav = rows.findIndex((r) => r && norm(r[1]) === 'ř.' && /ukazatel/i.test(norm(r[2])));
  if (hlav < 0) throw new Error('Tabulka č. 3c: nenalezen hlavičkový řádek');
  let c = null;
  const maxw = Math.max(...rows.slice(hlav, hlav + 2).map((r) => r?.length ?? 0));
  for (let j = 0; j < maxw; j++) {
    if (yearIn(cell(rows, hlav, j)) === rok && /^rok/i.test(norm(cell(rows, hlav, j))) && /^skute[cč]nost$/i.test(norm(cell(rows, hlav + 1, j)))) { c = j; break; }
  }
  if (c == null) throw new Error(`Tabulka č. 3c: nenalezen sloupec „Rok ${rok} Skutečnost“`);
  const out = { celkem: {}, na_pojistence: {} };
  let sekce = null;
  for (let r = hlav + 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const lab = norm(row[2]);
    if (/^pr[uů]m[eě]rn[eé] n[aá]klady na preventivn/i.test(lab)) { sekce = out.na_pojistence.__videno ? null : 'na_pojistence'; out.na_pojistence.__videno = true; }
    else if (/^n[aá]klady na preventivn[ií]/i.test(lab)) { sekce = out.celkem.__videno ? null : 'celkem'; out.celkem.__videno = true; }
    else if (/^(pr[uů]m[eě]rn[eé] )?n[aá]klady na /i.test(lab)) sekce = null;
    else if (/^ř\.$/.test(norm(row[1]))) { sekce = null; continue; }
    if (!sekce) continue;
    // řádek součtu v rámci sekce (popisek je ve sloupci C), pak ZP (kód ve sloupci B), pak „z toho: zaměstnanecké“
    let klic = null;
    if (/^(pr[uů]m[eě]rn[eé] )?n[aá]klady na preventivn/i.test(lab)) klic = 'cr';
    else if (kodOf(row[1])) klic = kodOf(row[1]);
    else if (/zam[eě]stnaneck[eé] zdravotn[ií] poj/i.test(norm(row[3])) || /zam[eě]stnaneck[eé] zdravotn[ií] poj/i.test(lab)) klic = 'zzp';
    if (!klic || out[sekce][klic]) continue;
    out[sekce][klic] = isNum(row[c]) ? ref(r, c, row[c]) : null;
  }
  delete out.celkem.__videno;
  delete out.na_pojistence.__videno;
  return out;
}

// ---------------------------------------------------------------------------------- PDF: číselné řádky

/**
 * Rozdělí řádek s čísly zapsanými česky („6 150 186   703 630 1 310 233“) na `n` čísel a vrátí VŠECHNY možné
 * rozklady. Skupiny tisíců jsou oddělené jednou mezerou a mají přesně 3 číslice; sloupce odděluje obvykle ≥ 2 mezery,
 * u úzkých sloupců ale i jedna („79 048 760 042 248 310“) — takový řádek je víceznačný a volí se mezi rozklady podle
 * kontrolních vztahů (viz parseTab7, parseTab4Vydaje). Číslo nezačíná nulou a má nejvýše `maxDigits` číslic.
 * Rozklady, které dělí uprostřed jednomezerového shluku, jsou seřazeny až za ty, které dělí na širokých mezerách.
 * @returns {number[][]}
 */
export function rozdelCisla(text, n, { maxDigits = 8, limit = 20000 } = {}) {
  const tokeny = [...String(text).matchAll(/(\d+)( *)/g)].map((m) => ({ t: m[1], gap: m[2].length }));
  const out = [];
  const rec = (i, acc, pen) => {
    if (out.length >= limit || acc.length > n) return;
    if (i === tokeny.length) { if (acc.length === n) out.push({ v: acc, pen }); return; }
    const prvni = tokeny[i].t;
    if (prvni.length > 1 && prvni.startsWith('0')) return;
    let hodnota = prvni;
    let j = i;
    for (;;) {
      if (hodnota.length > maxDigits) break;
      const dalsi = tokeny[j + 1];
      // dělení za tokenem j: nejasné, pokud mezi tokeny je jediná mezera a další token má 3 číslice
      const nejasne = dalsi && tokeny[j].gap === 1 && dalsi.t.length === 3 ? 1 : 0;
      rec(j + 1, [...acc, Number(hodnota)], pen + nejasne);
      if (!dalsi || tokeny[j].gap !== 1 || dalsi.t.length !== 3 || prvni.length > 3) break;
      hodnota += dalsi.t;
      j++;
    }
  };
  rec(0, [], 0);
  return out.sort((a, b) => a.pen - b.pen).map((k) => k.v);
}

/** Procenta s desetinnou čárkou („55,7 %  53,5 %“, „1,9%“); vrátí pole právě `n` čísel, jinak null. */
export function procenta(text, n) {
  const out = [];
  const re = /(\d+(?:,\d+)?)\s*%/g;
  let m;
  while ((m = re.exec(text))) out.push(Number(m[1].replace(',', '.')));
  return out.length === n ? out : null;
}

const POR_ZP = ['111', '201', '205', '207', '209', '211', '213'];
const mapujZp = (arr) => Object.fromEntries(POR_ZP.map((k, i) => [k, arr[i]]));
const bezPopisku = (l, re) => String(l).replace(re, ' ');

// ---------------------------------------------------------------------------------- PDF Tab. 7

/**
 * Tabulka „Pojištěnci a zaměstnanci systému v. z. p. dle zdravotních pojišťoven“ (Tab. 7 v ročnících 2018–2024):
 * průměrný počet pojištěnců, z toho státem hrazených, podíl, zaměstnanci, pojištěnců na 1 zaměstnance.
 * V ročnících 2015–2017 tabulka v PDF není (jen graf) → null. Víceznačné rozklady čísel se rozhodují podle vytištěného
 * podílu (státní/pojištěnci) a vytištěného poměru (pojištěnci/zaměstnanci).
 * @returns {null | { pojistenci, statni, statni_pct_mz, zamestnanci, pojistencu_na_zamestnance }} každé = {kod → číslo}
 */
export function parseTab7(text) {
  const radky = String(text).split(/\r?\n/);
  const iStat = radky.findIndex((l) => /^\s*z toho st[aá]tem hrazen/i.test(l));
  if (iStat < 0) return null;
  let iPoj = -1;
  for (let i = iStat - 1; i >= Math.max(0, iStat - 6); i--) {
    if (/\d{1,3}(?: \d{3})+|\d{4,}/.test(radky[i])) { iPoj = i; break; }
  }
  if (iPoj < 0) return null;
  let pct = null;
  let iPct = -1;
  for (let i = iStat + 1; i <= iStat + 4; i++) {
    const p = procenta(radky[i] ?? '', 7);
    if (p) { pct = p; iPct = i; break; }
  }
  if (!pct) return null;
  let iZam = -1;
  for (let i = iPct + 1; i <= iPct + 5; i++) if (/^\s*zam[eě]stnanc[uů]/i.test(radky[i] ?? '')) { iZam = i; break; }
  let iPom = -1;
  if (iZam >= 0) for (let i = iZam + 1; i <= iZam + 3; i++) if (/poj[ií][sš]t[eě]nc[uů] na 1 zam/i.test(radky[i] ?? '')) { iPom = i; break; }
  if (iZam < 0 || iPom < 0) return null;

  const kPoj = rozdelCisla(radky[iPoj].replace(/^[^\d]*/, ''), 7, { maxDigits: 7 });
  const kStat = rozdelCisla(bezPopisku(radky[iStat], /^\s*z toho st[aá]tem hrazen[ýy]ch/i), 7, { maxDigits: 7 });
  const kZam = rozdelCisla(bezPopisku(radky[iZam], /^\s*zam[eě]stnanc[uů]/i), 7, { maxDigits: 5 });
  const kPom = rozdelCisla(bezPopisku(radky[iPom], /^\s*poj[ií][sš]t[eě]nc[uů] na 1 zam[eě]stnance/i), 7, { maxDigits: 5 });
  if (!kPoj.length || !kStat.length || !kZam.length || !kPom.length) return null;

  // 1) pojištěnci × státní podle podílu (tolerance = zaokrouhlení vytištěného podílu)
  const tol = pct.every(Number.isInteger) ? 0.5 : 0.06;
  let best = null;
  for (const P of kPoj) {
    for (const S of kStat) {
      let e = 0;
      for (let i = 0; i < 7; i++) {
        const d = Math.abs((S[i] / P[i]) * 100 - pct[i]);
        if (d > tol) { e = Infinity; break; }
        e += d;
      }
      if (e < (best?.e ?? Infinity)) best = { e, P, S };
    }
  }
  if (!best) return null;
  // 2) zaměstnanci × poměr podle P / Z ≈ vytištěný poměr (zaokrouhleno na celé číslo)
  let best2 = null;
  for (const Z of kZam) {
    for (const R of kPom) {
      let e = 0;
      for (let i = 0; i < 7; i++) {
        const d = Math.abs(best.P[i] / Z[i] - R[i]);
        if (d > 1.5) { e = Infinity; break; }
        e += d;
      }
      if (e < (best2?.e ?? Infinity)) best2 = { e, Z, R };
    }
  }
  if (!best2) return null;
  return {
    pojistenci: mapujZp(best.P),
    statni: mapujZp(best.S),
    statni_pct_mz: mapujZp(pct),
    zamestnanci: mapujZp(best2.Z),
    pojistencu_na_zamestnance: mapujZp(best2.R),
  };
}

// ---------------------------------------------------------------------------------- PDF Tab. 4

/**
 * Tabulka „Výdaje systému v. z. p. dle zdravotních pojišťoven“ (Tab. 4 v ročnících 2018–2024): výdaje celkem a výdaje
 * na vlastní činnost (mil. Kč) a jejich podíl na výdajích celkem (%, jak jej tiskne MZ). V ročnících 2015–2017 tabulka
 * v PDF není → null. Popisek řádku bývá zalomený (číselný řádek leží mezi dvěma částmi popisku).
 * @returns {null | { vydaje_celkem_mil, vlastni_cinnost_mil, podil_pct }} každé = {kod → číslo}
 */
export function parseTab4Vydaje(text) {
  const radky = String(text).split(/\r?\n/);
  const re = /^\s*v[yý]daje celkem/i;
  for (let iCelkem = 0; iCelkem < radky.length; iCelkem++) {
    if (!re.test(radky[iCelkem])) continue;
    const kCelkem = rozdelCisla(bezPopisku(radky[iCelkem], re), 7, { maxDigits: 7 });
    if (!kCelkem.length) continue;
    const okno = radky.slice(iCelkem, iCelkem + 26);
    const iVlastni = okno.findIndex((l) => /v[yý]daje na vlastn[ií]/i.test(l));
    const iPodil = okno.findIndex((l) => /^\s*pod[ií]l na v[yý]daj[ií]ch celkem/i.test(l));
    if (iVlastni < 0 || iPodil < iVlastni) continue;
    let iCisla = -1;
    for (let i = iVlastni; i < iPodil; i++) {
      const cisla = okno[i].replace(/[^\d ]+/g, ' ').trim();
      if (cisla && rozdelCisla(cisla, 7, { maxDigits: 7 }).length) { iCisla = i; break; }
    }
    const pct = procenta(okno[iPodil], 7);
    if (iCisla < 0 || !pct) continue;
    const kVlastni = rozdelCisla(okno[iCisla].replace(/[^\d ]+/g, ' ').trim(), 7, { maxDigits: 6 });
    let best = null;
    for (const V of kVlastni) {
      for (const C of kCelkem) {
        let e = 0;
        for (let i = 0; i < 7; i++) {
          const d = Math.abs((V[i] / C[i]) * 100 - pct[i]);
          if (d > 0.06) { e = Infinity; break; }
          e += d;
        }
        if (e < (best?.e ?? Infinity)) best = { e, V, C };
      }
    }
    if (best) return { vydaje_celkem_mil: mapujZp(best.C), vlastni_cinnost_mil: mapujZp(best.V), podil_pct: mapujZp(pct) };
  }
  return null;
}

// ---------------------------------------------------------------------------------- PDF Tab. 16 a 17 (fond prevence)

const POMLCKA = /^[–—-]$/;
const FOND_RADKY = ['programy', 'pobyty', 'ostatni', 'jine_zdroje', 'celkem'];
const FOND_POPISKY = [/zdravotn[ií] programy/i, /ozdravn[eé] pobyty/i, /ostatn[ií] [cč]innosti/i, /z jin[yý]ch zdroj/i, /celkov[eé] n[aá]klady/i];

/**
 * Rozdělí číselnou část řádku tabulky na buňky. Sloupce jsou odděleny ≥ 2 mezerami, tisíce jednou („1 782“),
 * pomlčka „–“ je buňka (nula / neuvedeno) → null. Vrací pole buněk nebo null, když řádek není číselný.
 */
function bunkyRadku(line, ocekavano) {
  const telo = String(line).replace(/^[^\d–—-]*/, '').trim();
  if (!telo) return null;
  const tokeny = telo.split(/\s{2,}/);
  const out = [];
  let nevalidni = false;
  for (const t of tokeny) {
    if (POMLCKA.test(t)) { out.push(null); continue; }
    if (!/^\d{1,3}( \d{3})*$|^\d+$/.test(t)) { nevalidni = true; if (!/^[\d ]+$/.test(t)) return null; continue; }
    out.push(Number(t.replace(/ /g, '')));
  }
  if (nevalidni && !(ocekavano && /^[\d ]+$/.test(telo))) return null;
  // úzké sloupce: „922 304 1 161 291“ (sloupec odděluje jediná mezera) → rozklad na očekávaný počet buněk
  if (ocekavano && out.length !== ocekavano && /^[\d ]+$/.test(telo)) return rozdelCisla(telo, ocekavano, { maxDigits: 7 })[0] ?? out;
  return out;
}

/**
 * Řádky tabulky fondu prevence (programy, pobyty, ostatní, jiné zdroje, celkem): popisek je v PDF zalomený na dva
 * řádky a čísla leží podle ročníku na prvním, druhém nebo (2021) prostředním řádku, proto se řádky berou jako první
 * pět číselných řádků v okně a popisky se jen ověřují v pořadí. `od` = index řádku hlavičky tabulky.
 * @returns {{ hlavicka: string[], radky: (number|null)[][] }|null}
 */
function okenkoFondu(radky, od, nSloupcu) {
  const hlavicka = [];
  const cisla = [];
  for (let i = od; i < Math.min(radky.length, od + 24) && cisla.length < FOND_RADKY.length; i++) {
    const b = /Ukazatel|[ÚU][cč]elov[aá] polo[zž]ka|^\s*\(v (?:mil|tis)\. K[cč]\)/i.test(radky[i]) ? null : bunkyRadku(radky[i], nSloupcu ?? cisla[0]?.length);
    if (b && b.length >= 6 && b.length === (nSloupcu ?? cisla[0]?.length ?? b.length)) cisla.push(b);
    else if (!cisla.length) hlavicka.push(radky[i]);
  }
  if (cisla.length < FOND_RADKY.length) return null;
  const okno = radky.slice(od, od + 28).join('\n');
  let pozice = 0;
  for (const re of FOND_POPISKY) {
    const m = re.exec(okno.slice(pozice));
    if (!m) return null;
    pozice += m.index + m[0].length;
  }
  return { hlavicka, radky: cisla };
}

/**
 * Tabulka „Náklady na preventivní zdravotní péči (a další programy) čerpané z fondu prevence ZP a specifických fondů
 * VoZP ČR podle zdravotních pojišťoven v roce <rok>“ (Tab. 17 v ročnících 2018–2024; v 2015–2017 není → null), mil. Kč.
 * Sloupce VZP ČR, VoZP ČR, ČPZP, OZP, ZPŠ, ZP MV ČR, RBP; „–“ = null (nula / neuvedeno).
 * @returns {null | { programy, pobyty, ostatni, jine_zdroje, celkem }} každé = {kod → číslo|null}
 */
export function parseTab17(text, { rok } = {}) {
  const radky = String(text).split(/\r?\n/);
  const re = new RegExp(`^\\s*Tab(?:ulka|\\.)?\\s*(?:č\\.\\s*)?17\\s*:`, 'i');
  for (let i = 0; i < radky.length; i++) {
    if (!re.test(radky[i])) continue;
    const nadpis = radky.slice(i, i + 3).join(' ');
    if (rok != null && !new RegExp(`v roce ${rok}(?!\\d)`).test(nadpis)) continue;
    if (!/Ukazatel/i.test(radky.slice(i + 1, i + 6).join('\n'))) continue;
    const t = okenkoFondu(radky, i + 1, 7);
    if (!t) continue;
    const out = {};
    FOND_RADKY.forEach((id, j) => { out[id] = mapujZp(t.radky[j]); });
    return out;
  }
  return null;
}

/**
 * Vývoj nákladů fondu prevence za celou ČR (Tab. 16; v ročnících 2015–2017 Tab. 8 v tis. Kč): šestiletá okna
 * v každém PDF + sloupec ZPP (plán) posledního roku. Hodnoty v mil. Kč.
 * @returns {null | { jednotka: 'mil'|'tis', roky: Record<number, {programy,pobyty,ostatni,jine_zdroje,celkem}>, zpp: null|{rok:number, programy,pobyty,ostatni,jine_zdroje,celkem} }}
 */
export function parseTab16(text) {
  const radky = String(text).split(/\r?\n/);
  const re = /^\s*Tab(?:ulka|\.)?\s*(?:č\.\s*)?(?:16\s*:|8\s*:\s*N[aá]klady na preventivn)/i;
  for (let i = 0; i < radky.length; i++) {
    if (!re.test(radky[i])) continue;
    const okno = radky.slice(i + 1, i + 8).join('\n');
    if (!/Ukazatel|[ÚU][cč]elov[aá] polo[zž]ka/i.test(okno)) continue;
    const t = okenkoFondu(radky, i + 1, null);
    if (!t) continue;
    // hlavička: řádek s nejvíce roky (u 2019+ je ve 2. řádku, rok ZPP se opakuje v 1.)
    let roky = [];
    for (const h of t.hlavicka) {
      const r = [...h.matchAll(/(?<!\d)(20\d\d)(?!\d)/g)].map((m) => Number(m[1]));
      if (r.length > roky.length) roky = r;
    }
    if (roky.length < 2) continue;
    const sloupce = [];
    roky.forEach((r) => { if (sloupce.at(-1) !== r) sloupce.push(r); });
    const n = t.radky[0].length;
    if (n !== sloupce.length && n !== sloupce.length + 1) continue;
    const tis = /v tis\. K[cč]/i.test(t.hlavicka.join('\n'));
    const prevod = (v) => (v == null ? null : tis ? Math.round(v) / 1000 : v);
    const hodnotyAt = (j) => Object.fromEntries(FOND_RADKY.map((id, k) => [id, prevod(t.radky[k][j])]));
    const out = { jednotka: tis ? 'tis' : 'mil', roky: {}, zpp: null };
    sloupce.forEach((r, j) => { out.roky[r] = hodnotyAt(j); });
    if (n === sloupce.length + 1) out.zpp = { rok: sloupce.at(-1), ...hodnotyAt(n - 1) };
    return out;
  }
  return null;
}

/**
 * Hodnota ČR za rok z Tab. 16 PDF téhož roku (sloupec roku). V PDF Hodnocení 2018 jsou sloupce „2018“ a „2018 ZPP“
 * zaměněny (914 / 876 programy; skutečnost 876 sedí na součet Tab. 17 a na řady v Hodnocení 2019–2020): když součet
 * celkem Tab. 17 neodpovídá sloupci roku (±3 mil.), ale odpovídá sloupci ZPP, použije se ZPP a vrátí se poznámka.
 * @returns {null | { hodnoty: {programy,pobyty,ostatni,jine_zdroje,celkem}, poznamka: string|null }}
 */
export function vyberTab16(tab16, rok, tab17 = null) {
  const skut = tab16?.roky?.[rok];
  if (!skut) return null;
  if (tab17 && tab16.zpp?.rok === rok) {
    const soucet = Object.values(tab17.celkem).reduce((a, v) => a + (v ?? 0), 0);
    if (Math.abs(skut.celkem - soucet) > 3 && Math.abs(tab16.zpp.celkem - soucet) <= 3) {
      const { rok: _r, ...zpp } = tab16.zpp;
      return { hodnoty: zpp, poznamka: `V PDF Hodnocení ${rok} jsou sloupce „${rok}“ (${skut.celkem}) a „${rok} ZPP“ (${zpp.celkem}) zaměněny; použit sloupec, který sedí na součet Tab. 17 (${soucet}) a na Hodnocení ${rok + 1}` };
    }
  }
  return { hodnoty: { ...skut }, poznamka: null };
}

// ---------------------------------------------------------------------------------- jeden ročník

/** Kanonické klíče listů → klíč pro findSheet. */
export const LISTY = {
  tab1: { soubor: 'xlsx-1', nazev: 'tab.č.1' },
  tab1a: { soubor: 'xlsx-1', nazev: 'tab.č.1a' },
  tab1b: { soubor: 'xlsx-1', nazev: 'tab.č.1b' },
  tab1c: { soubor: 'xlsx-1', nazev: 'tab.č.1c' },
  tab1d: { soubor: 'xlsx-1', nazev: 'tab. č. 1d' },
  tab3: { soubor: 'xlsx-3', nazev: 'Tabulka č. 3' },
  tab3a: { soubor: 'xlsx-3', nazev: 'Tabulka č. 3a' },
  tab3c: { soubor: 'xlsx-3', nazev: 'Tabulka č. 3c' },
};

/**
 * Spustí parsery nad všemi listy jednoho ročníku. `listy[klíč]` = pole polí (viz LISTY), `pdfText` = pdftotext -layout.
 * Chybějící list nebo výjimka parseru nezastaví zpracování: vrátí `null` pro danou tabulku a zapíše text do `chyby`.
 */
export function parseRok({ rok, listy, pdfText }) {
  const chyby = [];
  const zkus = (nazev, fn) => {
    try {
      return fn();
    } catch (e) {
      chyby.push(`${rok} ${nazev}: ${e.message}`);
      return null;
    }
  };
  const r = (k) => {
    if (!listy[k]) throw new Error('list chybí');
    return listy[k];
  };
  const tab1 = zkus('tab.č.1', () => {
    const t = parseTab1(r('tab1'), { rok });
    chyby.push(...t.chyby.map((c) => `${rok} ${c}`));
    return t.polozky;
  });
  return {
    rok,
    tab1,
    tab1a: zkus('tab.č.1a', () => parseTab1a(r('tab1a'), { rok })),
    zustatek: zkus('tab.č.1b', () => parseTabZpRadek(r('tab1b'), /^kz na bankovn[ií]m [uú][cč]tu zfzp/i)),
    tab1c: zkus('tab.č.1c', () => parseTab1c(r('tab1c'), { rok })),
    rezervni: zkus('tab. č. 1d', () => parseTabZpRadek(r('tab1d'), /^a\.\s*skute[cč]n[eé] napln[eě]n[ií]/i)),
    tab3: zkus('Tabulka č. 3', () => parseTab3Celkem(r('tab3'), { rok })),
    tab3a: zkus('Tabulka č. 3a', () => parseTab3Celkem(r('tab3a'), { rok })),
    tab3c: zkus('Tabulka č. 3c', () => parseTab3c(r('tab3c'), { rok })),
    tab7: pdfText == null ? null : zkus('PDF Tab. 7', () => parseTab7(pdfText)),
    tab4: pdfText == null ? null : zkus('PDF Tab. 4', () => parseTab4Vydaje(pdfText)),
    tab17: pdfText == null ? null : zkus('PDF Tab. 17', () => parseTab17(pdfText, { rok })),
    tab16: pdfText == null ? null : zkus('PDF Tab. 16', () => parseTab16(pdfText)),
    chyby,
  };
}

// ---------------------------------------------------------------------------------- Tabulka č. 3 a 3a: segmenty (A1.4)

/**
 * Struktura nákladů na zdravotní služby podle segmentů (Tabulka č. 3 v tis. Kč, 3a v Kč na pojištěnce): všechny řádky
 * s kódem ř. (I., 1, 1.1, 1.2.1 …, bez II. a III.) a pro každou ZP (kód, `zzp`, `cr`) sloupce „Skutečnost“ a „ZPP“ aktuálního
 * roku. Sloupce se hledají podle hlaviček jako v parseTab3Celkem. Kód ř. je v 2. sloupci (B), popisek ve 3. (C).
 * @returns {{radky: {kod:string, text:string, radek:number, hodnoty: Record<string,{skut:object|null, zpp:object|null}>}[]}}
 *   `radek` = číslo řádku listu jako v Excelu; řádek celkem (I.) má kod 'I.'.
 */
export function parseTab3Segmenty(rows, { rok }) {
  const hlav = rows.findIndex((r) => r && r.some((c) => /^\d{3}\s*[–-]\s*\S/.test(norm(c))));
  if (hlav < 0) throw new Error('Tabulka č. 3: nenalezena hlavička bloků pojišťoven');
  const rYear = hlav + 1;
  const rKind = hlav + 2;
  const starts = [];
  rows[hlav].forEach((c, j) => {
    const t = norm(c);
    let klic = null;
    const m = /^(\d{3})\s*[–-]/.exec(t);
    if (m && KODY.includes(m[1])) klic = m[1];
    else if (/^zam[eě]stnaneck[eé] zdravotn[ií] poj/i.test(t)) klic = 'zzp';
    else if (/^zdravotn[ií] poj[ií][sš][tť]ovny celkem/i.test(t)) klic = 'cr';
    if (klic) starts.push({ klic, od: j });
  });
  const width = Math.max(...rows.slice(0, hlav + 4).map((r) => r?.length ?? 0));
  const sloupce = {};
  starts.forEach((s, i) => {
    const konec = i + 1 < starts.length ? starts[i + 1].od : width;
    for (let c = s.od; c < konec; c++) {
      if (yearIn(cell(rows, rYear, c)) !== rok) continue;
      const druh = norm(cell(rows, rKind, c));
      if (/^skute[cč]nost$/i.test(druh) || /^skute[cč]nost/i.test(druh)) sloupce[s.klic] = { ...sloupce[s.klic], skut: sloupce[s.klic]?.skut ?? c };
      else if (/^zpp$/i.test(druh)) sloupce[s.klic] = { ...sloupce[s.klic], zpp: c };
    }
  });
  const radky = [];
  for (let r = rKind + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const b = row[1];
    if (b == null || b === '') continue;
    if (typeof b === 'number' && !Number.isInteger(b)) throw new Error(`Tabulka č. 3: kód ř. na řádku ${r + 1} je neceločíselný (${b}), nelze rozlišit 1.1 a 1.10`);
    const kod = norm(b);
    if (/^II/.test(kod)) break;
    if (!/^(I\.|\d+(\.\d+)*)$/.test(kod)) continue;
    const hodnoty = {};
    for (const [klic, s] of Object.entries(sloupce)) {
      hodnoty[klic] = {
        skut: s.skut != null && isNum(row[s.skut]) ? ref(r, s.skut, row[s.skut]) : null,
        zpp: s.zpp != null && isNum(row[s.zpp]) ? ref(r, s.zpp, row[s.zpp]) : null,
      };
    }
    radky.push({ kod, text: norm(row[2]), radek: r + 1, hodnoty });
  }
  if (!radky.length || radky[0].kod !== 'I.') throw new Error('Tabulka č. 3: nenalezen řádek I. (Náklady na zdravotní služby celkem)');
  return { radky };
}
