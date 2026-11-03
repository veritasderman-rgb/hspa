// Struktura nákladů na zdravotní služby podle segmentů péče (7 ZP × 2015→) z Hodnocení vývoje systému v. z. p. (MZ ČR) — balíček A1.4.
//
// Spouštěj:  node ingest/transform_pojistovny_segmenty.js   (po `node ingest/fetchers/mz-hodnoceni.js`)
// Vstup: ingest/cache/mz-hodnoceni/ (manifest.json + vz<rok>_hodnoceni_tab_3-3a-3b-3c.xlsx, listy „Tabulka č. 3“ a „Tabulka č. 3a“).
// Výstup: data/pojistovny-segmenty.json. Idempotentní: stejný vstup = beze změny souboru (generated_at se nemění).
// Na konci běží validateSegmenty (chyby = exit 1, soubor se nezapíše).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet, sheetNames } from './lib/xlsx.js';
import { KODY, STRANKA_URL, findSheet, parseTab3Segmenty } from './lib/mz-hodnoceni.js';
import { validateSegmenty } from './lib/validate-segmenty.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const OUT_PATH = path.join(ROOT, 'data', 'pojistovny-segmenty.json');
export const RADY_PATH = path.join(ROOT, 'data', 'pojistovny-hospodareni-rady.json');
export const P_PATH = path.join(ROOT, 'data', 'pojistovny.json');
export const CACHE_DIR = path.join(ROOT, 'ingest', 'cache', 'mz-hodnoceni');

// ---------------------------------------------------------------------------------- slovník segmentů

/** Text řádku bez diakritiky, malými písmeny, bez předpony „v tom:/z toho:“, bez odkazu na poznámku pod čarou. */
export const normText = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s+/g, ' ').trim()
  .replace(/^(v tom|z toho)\s*:\s*/, '')
  .replace(/\s+\d\)\s*$/, '')
  .trim();

/** Čitelný název řádku: původní text bez předpony a poznámky, jednomezerový, s velkým prvním písmenem. */
export const nazevRadku = (s) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim().replace(/^(v tom|z toho)\s*:\s*/i, '').replace(/\s+\d\)\s*$/, '').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const slug = (s) => normText(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const CAST = (pref, kratkyPrefix) => [
  { id: `${pref}_amb`, kratky: `${kratkyPrefix}: předepsané u ambulantních poskytovatelů`, parent: `${pref}_celkem`, re: /^predepsane u poskytovatelu ambulantni/ },
  { id: `${pref}_amb_vpl`, kratky: `${kratkyPrefix}: u praktických lékařů a PLDD`, parent: `${pref}_amb`, re: /^u poskytovatele v oboru vseobecne/ },
  { id: `${pref}_amb_spec`, kratky: `${kratkyPrefix}: u specializované ambulantní péče`, parent: `${pref}_amb`, re: /^u poskytovatele specializovane/ },
  { id: `${pref}_luz`, kratky: `${kratkyPrefix}: předepsané u lůžkových poskytovatelů`, parent: `${pref}_celkem`, re: /^predepsane u poskytovatelu luzkove/ },
];

/**
 * Slovník: pořadí pravidel = pořadí zkoušení. `parent` = id řádku, který je podle kódu ř. nadřazený (rozlišuje stejné popisky
 * na různých místech, např. léky na recepty vs. zdravotnické prostředky). Řádek, který nesedí na žádné pravidlo, je CHYBA
 * (nic se neřadí „někam“): při změně struktury listu MZ je třeba slovník doplnit.
 */
export const PRAVIDLA = [
  // ambulantní péče
  { id: 'amb_celkem', kratky: 'Ambulantní péče celkem', re: /^na ambulantni peci celkem/ },
  { id: 'amb_stomatologie', kratky: 'Stomatologie (zubní lékaři)', re: /zubni lekarstvi|ambulantnich stomatologickych/ },
  { id: 'amb_vpl', kratky: 'Praktičtí lékaři pro dospělé (001)', parent: 'amb_pl_pldd', re: /odbornost 001\)/ },
  { id: 'amb_pldd', kratky: 'Praktičtí lékaři pro děti a dorost (002)', parent: 'amb_pl_pldd', re: /odbornost 002\)/ },
  { id: 'amb_pl_pldd', kratky: 'Praktičtí lékaři a PLDD', re: /^(na zdravotni peci v oboru vseobecne prakticke lekarstvi a prakticke|skupina prakticky)/ },
  { id: 'amb_gynekologie', kratky: 'Gynekologie a porodnictví', re: /gynekolog/ },
  { id: 'amb_fyzio', kratky: 'Fyzioterapie / léčebná rehabilitace', re: /^na lecebne rehabilitacni peci|fyzioterapie/ },
  { id: 'amb_lab_rdg', kratky: 'Laboratoře a radiodiagnostika', re: /^na diagnostickou peci|mimoluzkovych laboratornich/ },
  { id: 'amb_lab', kratky: 'Laboratoře', parent: 'amb_lab_rdg', re: /^(poskytovatele )?laborator/ },
  { id: 'amb_rdg', kratky: 'Radiologie a zobrazovací metody', parent: 'amb_lab_rdg', re: /^(radiologie a zobrazovaci|poskytovatele radiodiagnostickych)/ },
  { id: 'amb_soudni', kratky: 'Soudní lékařství', parent: 'amb_lab_rdg', re: /^soudni lekarstvi/ },
  { id: 'amb_patologie', kratky: 'Patologie', parent: 'amb_lab_rdg', re: /^patologie/ },
  { id: 'amb_domaci', kratky: 'Domácí péče', re: /^na domaci peci|domacich zdravotnich sluzeb/ },
  { id: 'amb_domaci_925', kratky: 'Domácí péče (odbornost 925)', parent: 'amb_domaci', re: /^domaci pece/ },
  { id: 'amb_domaci_paliativni', kratky: 'Domácí paliativní péče (926)', parent: 'amb_domaci', re: /paliativni/ },
  { id: 'amb_spec', kratky: 'Specializovaná ambulantní péče', re: /^na specializovanou ambulantni|mimoluzkovych ambulantnich specializovanych/ },
  { id: 'amb_spec_leky_spec_pracoviste', kratky: 'Léky na specializovaných pracovištích (ambulance)', parent: 'amb_spec', re: /^leciv.*pouze poskytovatelum/ },
  { id: 'amb_spec_leky_par16', kratky: 'Léky hrazené podle § 16 (ambulance)', parent: 'amb_spec_leky_spec_pracoviste', re: /^leciv.*na zaklade § 16/ },
  { id: 'amb_osoby_umistene', kratky: 'Osoby umístěné z jiných než zdravotních důvodů', re: /osobam umistenym u nich/ },
  { id: 'amb_hemodialyza', kratky: 'Ambulantní hemodialýza (128)', re: /hemodialyz/ },
  { id: 'amb_socialni_d', kratky: 'Zdravotní péče v zařízeních sociálních služeb (§ 22 písm. d)', re: /v zarizenich socialnich sluzeb \(§ 22 pism\. d\)/ },
  { id: 'amb_socialni_e', kratky: 'Ošetřovatelská a rehabilitační péče v zařízeních sociálních služeb (§ 22 písm. e)', re: /^na osetrovatelskou a rehabilitacni/ },
  { id: 'amb_socialni_913', kratky: 'Sociální služby poskytující zdravotní péči (913)', re: /socialnich sluzeb poskytujicich zdravotni/ },
  // lůžková péče
  { id: 'luz_celkem', kratky: 'Lůžková péče celkem', re: /^na luzkovou zdravotni peci celkem/ },
  { id: 'luz_nemocnice', kratky: 'Nemocnice', parent: 'luz_celkem', re: /^samostatni poskytovatele luzkove, ambulantni|v nemocnicich$/ },
  { id: 'luz_nem_ambulantni', kratky: 'Nemocnice: ambulantní péče', parent: 'luz_nemocnice', re: /^ambulantni pece/ },
  { id: 'luz_nem_akutni', kratky: 'Nemocnice: akutní lůžková péče', parent: 'luz_nemocnice', re: /^akutni luzkova/ },
  { id: 'luz_nem_nasledna', kratky: 'Nemocnice: následná lůžková péče', parent: 'luz_nemocnice', re: /^nasledna luzkova/ },
  { id: 'luz_nem_ostatni', kratky: 'Nemocnice: ostatní (LPS, přeprava …)', parent: 'luz_nemocnice', re: /^ostatni \(/ },
  { id: 'luz_nem_leky_spec_pracoviste', kratky: 'Nemocnice: léky na specializovaných pracovištích', parent: 'luz_nemocnice', re: /^leciv.*pouze poskytovatelum/ },
  { id: 'luz_nem_leky_par16', kratky: 'Nemocnice: léky hrazené podle § 16', parent: 'luz_nem_leky_spec_pracoviste', re: /^leciv.*na zaklade § 16/ },
  { id: 'luz_nasledna_dlouhodoba', kratky: 'Následná a dlouhodobá lůžková péče (skupina)', parent: 'luz_celkem', re: /^skupina poskytovatelu nasledne a dlouhodobe/ },
  { id: 'luz_olu_psychiatricke', kratky: 'OLÚ: psychiatrické', parent: 'luz_olu', re: /^psychiatricke/ },
  { id: 'luz_olu_rehabilitacni', kratky: 'OLÚ: rehabilitační', parent: 'luz_olu', re: /^rehabilitacni/ },
  { id: 'luz_olu_trn', kratky: 'OLÚ: pneumologie a ftizeologie (TRN)', parent: 'luz_olu', re: /^pneumologie/ },
  { id: 'luz_olu_ostatni', kratky: 'OLÚ: ostatní', parent: 'luz_olu', re: /^ostatni$/ },
  { id: 'luz_olu', kratky: 'Odborné léčebné ústavy (OLÚ)', re: /^samostatni poskytovatele (luzkove nasledne|nasledne luzkove) pece od/ },
  { id: 'luz_ldn_osetrovatelska', kratky: 'LDN a ošetřovatelská lůžka', re: /00005[^)]*\)[ ,]*00024/ },
  { id: 'luz_ldn', kratky: 'Léčebny dlouhodobě nemocných (LDN)', re: /osetrovaciho dne 00024/ },
  { id: 'luz_osetrovatelska', kratky: 'Ošetřovatelská lůžka', re: /osetrovaciho dne 00005/ },
  { id: 'luz_nip', kratky: 'Následná intenzivní péče', re: /luzka nasledne intenzivni/ },
  { id: 'luz_hospic', kratky: 'Hospice', re: /hospicoveho typu/ },
  // léky na recepty, zdravotnické prostředky
  { id: 'leky_celkem', kratky: 'Léky na recepty celkem', re: /^na leky vydane na recepty/ },
  ...CAST('leky', 'Léky na recepty').map((p) => ({ ...p, parent: p.parent === 'leky_celkem' ? 'leky_celkem' : p.parent })),
  { id: 'zp_celkem', kratky: 'Zdravotnické prostředky na poukazy celkem', re: /^na zdravotnicke prostredky vydane na poukazy/ },
  ...CAST('zp', 'Zdravotnické prostředky'),
  // ostatní segmenty první úrovně
  { id: 'lazne', kratky: 'Lázně (lázeňská léčebně rehabilitační péče)', re: /^na lazenskou|^skupina poskytovatelu lazenske/ },
  { id: 'lazne_komplexni', kratky: 'Lázně: komplexní péče', parent: 'lazne', re: /^komplexni lazenska/ },
  { id: 'lazne_prispevkova', kratky: 'Lázně: příspěvková péče', parent: 'lazne', re: /^prispevkova lazenska/ },
  { id: 'ozdravovny', kratky: 'Ozdravovny', re: /sluzby v ozdravovnach$/ },
  { id: 'doprava', kratky: 'Zdravotnická doprava', re: /^na prepravu|^skupina poskytovatelu zdravotnicke dopravni/ },
  { id: 'zzs', kratky: 'Záchranná služba (ZZS, LPS)', re: /zachrann(e|ou) sluz/ },
  { id: 'zahranici', kratky: 'Léčení v zahraničí', re: /^na leceni v zahranici/ },
  { id: 'vratky_16b', kratky: 'Vratky podle § 16b', re: /^financni prostredky \(vratky\)/ },
  { id: 'ockovani', kratky: 'Očkovací látky', re: /^naklady na ockovaci latky/ },
  { id: 'ostatni', kratky: 'Ostatní náklady na zdravotní služby', re: /^ostatni naklady na zdravotni sluzby/ },
];

/** Skupina podle hierarchie listu: 1.x = ambulantní, 2.x = lůžková, 6/7 (léky) = leky; vše ostatní = ostatni. */
export const skupinaId = (id) => (id.startsWith('amb_') ? 'ambulantni' : id.startsWith('luz_') ? 'luzkova' : id.startsWith('leky_') ? 'leky' : 'ostatni');

/** Přiřadí řádkům jednoho ročníku id segmentů. Vrací {mapa: Map<kod,{id,...radek}>, chyby}. */
export function priradId(radky, rok) {
  const idPoKodu = new Map();
  const out = [];
  const chyby = [];
  for (const r of radky) {
    if (r.kod === 'I.') continue;
    const cesty = r.kod.split('.');
    const parentKod = cesty.length > 1 ? cesty.slice(0, -1).join('.') : null;
    const parentId = parentKod ? idPoKodu.get(parentKod) ?? null : null;
    const t = normText(r.text);
    const hit = PRAVIDLA.find((p) => p.re.test(t) && (!p.parent || p.parent === parentId));
    if (!hit) { chyby.push(`${rok}: řádek ${r.radek} (ř. ${r.kod}) „${r.text.slice(0, 80)}“ nesedí na žádný segment slovníku (nadřazený: ${parentId ?? '—'})`); continue; }
    if (idPoKodu.has(r.kod)) { chyby.push(`${rok}: duplicitní kód ř. ${r.kod}`); continue; }
    idPoKodu.set(r.kod, hit.id);
    out.push({ ...r, id: hit.id, uroven: cesty.length, parentId });
  }
  const videno = new Map();
  for (const o of out) {
    if (videno.has(o.id)) chyby.push(`${rok}: segment ${o.id} přiřazen dvěma řádkům (ř. ${videno.get(o.id)} a ${o.kod})`);
    videno.set(o.id, o.kod);
  }
  return { radky: out, chyby };
}

// ---------------------------------------------------------------------------------- sestavení datasetu


/**
 * Čistá funkce: ročníky { rok, tab3: {radky}, tab3a: {radky} } → dataset (bez generated_at).
 * @param {{ bundles: {rok:number, tab3:{radky:object[]}, tab3a:{radky:object[]}}[], soubory: Record<number,{url:string, soubor?:string, sha256?:string}>, zkratky: Record<string,string>, stazeno_at?: string|null }} v
 */
export function sestavSegmenty({ bundles, soubory, zkratky, stazeno_at = null }) {
  const chyby = [];
  const roky = bundles.map((b) => b.rok).sort((a, b) => a - b);
  const byRok = new Map();
  for (const b of bundles) {
    const p3 = priradId(b.tab3.radky, b.rok);
    chyby.push(...p3.chyby);
    // 3a musí mít stejné řádky (kód ř. a číslo řádku listu; popisky se v drobnostech liší, např. „součet ř. 1–11“ vs „1–12“)
    const stejne = b.tab3a.radky.length === b.tab3.radky.length && b.tab3a.radky.every((r, i) => r.kod === b.tab3.radky[i].kod && r.radek === b.tab3.radky[i].radek);
    if (!stejne) chyby.push(`${b.rok}: řádky Tabulky č. 3a se neshodují s Tabulkou č. 3`);
    const a3 = new Map(b.tab3a.radky.map((r) => [r.kod, r]));
    byRok.set(b.rok, { ...p3, a3, celkem: b.tab3.radky.find((r) => r.kod === 'I.') });
  }

  // pořadí: od nejnovějšího ročníku, segmenty zmizelé v novějších ročnících se vloží za svého předchůdce z daného ročníku
  const poradi = [];
  for (const rok of [...roky].reverse()) {
    let predchozi = null;
    for (const r of byRok.get(rok).radky) {
      if (!poradi.includes(r.id)) {
        const i = predchozi == null ? 0 : poradi.indexOf(predchozi) + 1;
        poradi.splice(i, 0, r.id);
      }
      predchozi = r.id;
    }
  }
  const nazvy = {}; const urovne = {}; const urovnePoRoce = {};
  for (const rok of roky) {
    for (const r of byRok.get(rok).radky) {
      nazvy[r.id] = nazevRadku(r.text); // přepíše se ročníkem nejnovějším
      urovne[r.id] = r.uroven;
      (urovnePoRoce[r.id] ??= {})[rok] = r.uroven;
    }
  }
  const kratky = Object.fromEntries(PRAVIDLA.map((p) => [p.id, p.kratky]));
  const segmenty = poradi.map((id, i) => {
    const vary = new Set(Object.values(urovnePoRoce[id])).size > 1;
    return {
      id, nazev: nazvy[id], nazev_kratky: kratky[id], skupina: skupinaId(id), uroven: urovne[id], ...(vary ? { uroven_podle_roku: urovnePoRoce[id] } : {}), poradi: i + 1,
    };
  });

  const r2 = (v) => Math.round(v * 100) / 100;
  const obalka = (rok, ref3, ref3a, zpp) => {
    if (!ref3) return null;
    return {
      tis_kc: Math.round(ref3.hodnota),
      na_pojistence_kc: ref3a ? r2(ref3a.hodnota) : null,
      zpp_tis_kc: zpp ? Math.round(zpp.hodnota) : null,
      radek: ref3.radek,
    };
  };
  const rada = (klic) => {
    const rady = {}; const celkem = {};
    for (const rok of roky) {
      const b = byRok.get(rok);
      const poId = new Map(b.radky.map((r) => [r.id, r]));
      rady[String(rok)] = {};
      for (const id of poradi) {
        const r = poId.get(id);
        if (!r) { rady[String(rok)][id] = null; continue; }
        const h = r.hodnoty[klic]; const h3a = b.a3.get(r.kod)?.hodnoty[klic];
        rady[String(rok)][id] = obalka(rok, h?.skut ?? null, h3a?.skut ?? null, h?.zpp ?? null);
      }
      const c = b.celkem; const c3a = b.a3.get('I.');
      celkem[String(rok)] = obalka(rok, c.hodnoty[klic]?.skut ?? null, c3a?.hodnoty[klic]?.skut ?? null, c.hodnoty[klic]?.zpp ?? null);
    }
    return { rady, celkem };
  };
  const pojistovny = KODY.map((kod) => ({ kod, zkratka: zkratky[kod] ?? kod, ...rada(kod) }));
  const cr = rada('cr');

  // chybí: segment v ročníku neexistuje / existuje, ale hodnotu některé ZP list neuvádí
  const chybi = [];
  for (const id of poradi) {
    const nene = roky.filter((rok) => !byRok.get(rok).radky.some((r) => r.id === id));
    if (nene.length) chybi.push({ segment: id, roky: nene, kody: 'vsechny', duvod: `Řádek „${kratky[id]}“ v Tabulce č. 3 Hodnocení MZ za tyto ročníky není (jiné členění listu); nedopočítáváno` });
    const bezHodnoty = {};
    for (const rok of roky) {
      if (nene.includes(rok)) continue;
      const kodyBez = KODY.filter((kod) => pojistovny.find((p) => p.kod === kod).rady[String(rok)][id] == null);
      if (kodyBez.length) (bezHodnoty[kodyBez.join(',')] ??= []).push(rok);
    }
    for (const [k, rr] of Object.entries(bezHodnoty)) chybi.push({ segment: id, roky: rr, kody: k.split(','), duvod: 'List uvádí řádek, ale ne číselnou hodnotu pro tyto pojišťovny' });
  }

  const soubor = [];
  const zdroje = {};
  for (const rok of roky) {
    const u = soubory[rok]?.['xlsx-3']?.url;
    if (u) zdroje[String(rok)] = { url: u, list_3: 'Tabulka č. 3', list_3a: 'Tabulka č. 3a' }; const s = soubory[rok]?.['xlsx-3']; if (s) soubor.push({ rok, typ: 'xlsx-3', soubor: s.soubor ?? s.url.split('/').pop(), url: s.url, sha256: s.sha256 ?? null }); }
  return {
    chyby,
    data: {
      version: '1.0',
      _doc: [
        'Struktura nákladů ZFZP na zdravotní služby podle segmentů péče (VZP, 201, 205, 207, 209, 211, 213 a CELKEM ZP) za roky 2015→ z Hodnocení vývoje systému veřejného zdravotního pojištění (MZ ČR), listy „Tabulka č. 3“ (tis. Kč) a „Tabulka č. 3a“ (Kč na pojištěnce) tabulkové přílohy.',
        'Každá hodnota je obálka {tis_kc, na_pojistence_kc, zpp_tis_kc, radek}: tis_kc = „Skutečnost“ daného roku v tis. Kč (zaokrouhleno na celé tis. Kč, v listu mají některé hodnoty z let 2020–2021 desetinná místa); na_pojistence_kc = totéž z Tabulky č. 3a v Kč na pojištěnce (2 desetinná místa); zpp_tis_kc = plán (zdravotně pojistný plán) téhož roku v tis. Kč; radek = číslo řádku jako v Excelu, shodné v Tabulce č. 3 i 3a (transform to hlídá). Zdroj je na úrovni souboru: zdroje[rok] = {url souboru XLSX, list_3, list_3a}; sloupec hodnoty v listu se dohledá podle hlaviček (blok ZP, „Skutečnost“ / „ZPP“ daného roku). Segment, který ročník v listu nemá, je null a je vyjmenován v chybi[]; nic se nedopočítává ani nesčítá.',
        'Celkem ZS (řádek I. „Náklady na zdravotní služby celkem čerpané z oddílu A“) je v poli celkem u každé ZP a u cr; součet řádků úrovně 1 = celkem (validátor ±0,5 %) a celkem = naklady_zs_mld v pojistovny-hospodareni-rady.json (±0,1 %). „Úroveň 1“ jsou řádky s kódem ř. 1, 2, 3 … (ř. 1–12 v letech 2015–2022, ř. 1–11 od 2023); úroveň 2 jsou podskupiny (1.1, 2.1 …), úroveň 3 a 4 jsou podřádky (1.2.1, 1.7.1.1 …) – u nich součty podskupin neplatí vždy (řádky „z toho“ jsou jen části podskupiny, např. léky na specializovaných pracovištích). Úroveň je podle kódu ř. v listu, ne podle domněnky; pokud se úroveň téhož segmentu mezi ročníky liší, je v `uroven_podle_roku` (pole `uroven` platí pro nejnovější ročník, kde segment je).',
        'Segment `id` je slug stabilní napříč ročníky, přiřazený podle normalizovaného popisku řádku (slovník v ingest/transform_pojistovny_segmenty.js); nově nepoužité kódy ř. se nepřiřazují náhodně, ale transform spadne a slovník se doplní. `nazev` = popisek řádku z nejnovějšího ročníku, kde segment je (bez předpony „v tom:“), `nazev_kratky` = zkrácený popisek pro zobrazení.',
        'Skupina (`skupina`) podle hierarchie listu: ambulantni = ř. 1 a podřádky (poskytovatelé nevykazující kód ošetřovacího dne); luzkova = ř. 2 a podřádky (nemocnice, OLÚ, LDN, ošetřovatelská lůžka, hospice, NIP); leky = léky vydané na recepty (ř. 6, resp. 7 do 2022) a jejich podřádky; ostatni = vše ostatní první úrovně: lázně a ozdravovny, zdravotnická doprava, záchranná služba, zdravotnické prostředky na poukazy, léčení v zahraničí, vratky podle § 16b, očkovací látky a ostatní náklady. Sporné: zdravotnické prostředky (zp_*, ř. 7/8) a léčení v zahraničí (zahranici) jsou záměrně v `ostatni`, protože nejsou ani ambulantní, ani lůžkovou péčí, ani léky na recept; léky předepsané v nemocnici (leky_luz) zůstávají ve skupině `leky` (jsou součástí ř. 6/7, ne ř. 2).',
        'Změny členění listu mezi ročníky (zjištěno z popisků a kódů řádků, nic z toho se nepřepočítává): (1) od 2023 má list samostatný řádek ambulantní hemodialýzy (odbornost 128, amb_hemodialyza); v letech 2015–2022 list řádek hemodialýzy nemá a ř. 1.7 je definován jako „odbornosti neuvedené v ř. 1.1–1.6“, takže ji pravděpodobně obsahuje – řady amb_spec 2022 a 2023 proto nejsou přesně srovnatelné. (2) Do 2022 list uváděl ř. 1.8 (osoby umístěné u poskytovatele z jiných než zdravotních důvodů), 1.9 (sociální služby, § 22 písm. d) a 1.10 (ošetřovatelská a rehabilitační péče v sociálních službách, § 22 písm. e); od 2023 je jediný řádek sociálních služeb (odbornost 913, § 22 písm. e) – vymezení se liší, proto jsou to tři různá id (amb_socialni_d, amb_socialni_e, amb_socialni_913), ne jedna řada. (3) Diagnostika (amb_lab_rdg) se od 2023 dělí jen na laboratoře a radiodiagnostiku; soudní lékařství a patologie samostatně nejsou. (4) Od 2023 jsou ozdravovny podřádek lázní (dříve samostatný ř. 4; uroven_podle_roku), takže řada lazne 2022→2023 není přesně srovnatelná. (5) Od 2023 je následná a dlouhodobá lůžková péče nově členěna (luz_nasledna_dlouhodoba): OLÚ jsou luz_olu (do 2022 ř. 2.2 s podřádky psychiatrické/rehabilitační/TRN/ostatní; od 2023 s jiným vymezením, bez těchto podřádků), LDN a ošetřovatelská lůžka jsou sloučena do luz_ldn_osetrovatelska (do 2022 luz_ldn a luz_osetrovatelska zvlášť), přibylo NIP (luz_nip) a v nemocnicích zmizela následná lůžková péče (luz_nem_nasledna). (6) Záchranná služba (zzs) zahrnuje od 2020 odbornost 799 a od 2023 také přepravu pacientů neodkladné péče a LPS. (7) Léky na recepty a zdravotnické prostředky od 2023 nemají podřádky „u praktických lékařů a PLDD“ / „u specializované ambulantní péče“. (8) Domácí paliativní péče (926) je samostatně od 2018; léky podle § 16 od 2018 do 2022.',
        'Zdroj: soubory XLSX „vz<rok>_hodnoceni_tab_3-3a-3b-3c.xlsx“ (viz zdroj.soubory); stažení a parsery balíček A1.1 (ingest/fetchers/mz-hodnoceni.js, ingest/lib/mz-hodnoceni.js).',
      ].join(' '),
      zdroj: {
        nazev: 'MZ ČR · Hodnocení vývoje systému veřejného zdravotního pojištění (tabulková příloha XLSX: Tabulka č. 3 a 3a)',
        url: STRANKA_URL,
        soubory: soubor,
        stazeno_at,
      },
      roky,
      zdroje,
      segmenty,
      pojistovny,
      cr,
      chybi,
    },
  };
}

/** Čitelný, ale úsporný JSON: objekty roku (rady[rok], celkem) a položky seznamů segmenty/chybi/soubory jsou na jednom řádku. */
export function serializuj(obj) {
  const jednoRadek = new Set(['segmenty', 'chybi', 'soubory', 'zdroje']);
  const ser = (v, depth, klic) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (depth >= 4 || (depth >= 2 && jednoRadek.has(klic))) return JSON.stringify(v);
    const pad = '  '.repeat(depth + 1);
    const konec = '  '.repeat(depth);
    if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad + ser(x, depth + 1, klic)).join(',\n')}\n${konec}]` : '[]';
    const e = Object.entries(v);
    return e.length ? `{\n${e.map(([k, x]) => `${pad}${JSON.stringify(k)}: ${ser(x, depth + 1, k)}`).join(',\n')}\n${konec}}` : '{}';
  };
  return `${ser(obj, 0, '')}\n`;
}

const bezGenerated = (o) => { const c = structuredClone(o); delete c.generated_at; return c; };

function nactiBundle(rok, soubory, cacheDir) {
  const f = path.join(cacheDir, soubory['xlsx-3'].soubor ?? soubory['xlsx-3'].url.split('/').pop());
  const jmena = sheetNames(f);
  const list = (nazev) => {
    const nm = findSheet(jmena, nazev);
    if (!nm) throw new Error(`${rok}: list „${nazev}“ nenalezen`);
    return parseTab3Segmenty(readSheet(f, nm), { rok });
  };
  return { rok, tab3: list('Tabulka č. 3'), tab3a: list('Tabulka č. 3a') };
}

export function run({ out = OUT_PATH, cacheDir = CACHE_DIR, radyPath = RADY_PATH, zapis = true } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(cacheDir, 'manifest.json'), 'utf8'));
  const poRocich = {};
  for (const p of manifest.polozky) if (p.stav === 'ok') (poRocich[p.rok] ??= {})[p.typ] = { url: p.url, soubor: p.soubor, sha256: p.sha256 };
  const roky = Object.keys(poRocich).map(Number).sort((a, b) => a - b).filter((r) => poRocich[r]['xlsx-3']);
  const parseChyby = [];
  const bundles = [];
  for (const r of roky) {
    try { bundles.push(nactiBundle(r, poRocich[r], cacheDir)); } catch (e) { parseChyby.push(`${r}: ${e.message}`); }
  }
  const P = JSON.parse(fs.readFileSync(P_PATH, 'utf8'));
  const zkratky = Object.fromEntries((P.pojistovny ?? []).map((z) => [String(z.kod), z.zkratka]));
  const stazeno = manifest.polozky.map((p) => p.stazeno_at).filter(Boolean).sort().pop() ?? null;
  const { data, chyby } = sestavSegmenty({ bundles, soubory: poRocich, zkratky, stazeno_at: stazeno });
  let hospodareniRady = null;
  try { hospodareniRady = JSON.parse(fs.readFileSync(radyPath, 'utf8')); } catch (_) { /* validátor upozorní */ }
  const val = validateSegmenty(data, { hospodareniRady });
  let predchozi = null;
  try { predchozi = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (_) { /* ještě není */ }
  const zmeneno = !predchozi || JSON.stringify(bezGenerated(predchozi)) !== JSON.stringify(data);
  const hotovo = { version: data.version, generated_at: zmeneno ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') : predchozi.generated_at, ...data };
  const errors = [...parseChyby, ...chyby, ...val.errors];
  if (!errors.length && zmeneno && zapis) fs.writeFileSync(out, serializuj(hotovo), 'utf8');
  return { zmeneno, data: hotovo, errors, warnings: val.warnings, checks: val.checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    for (const w of r.warnings) console.warn(`  ! ${w}`);
    if (r.errors.length) { for (const e of r.errors) console.error(`  ✗ ${e}`); process.exit(1); }
    const d = r.data;
    console.log(`✓ transform_pojistovny_segmenty: ${d.roky[0]}–${d.roky.at(-1)}, ${d.pojistovny.length} ZP, ${d.segmenty.length} segmentů, ${d.chybi.length} záznamů v chybi[]${r.zmeneno ? '' : ' — beze změny'}`);
  } catch (e) { console.error('✗ transform_pojistovny_segmenty:', e.message); process.exit(1); }
}
