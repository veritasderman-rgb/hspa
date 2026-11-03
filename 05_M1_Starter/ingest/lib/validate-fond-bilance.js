// Validátor data/pojistovny-fond-bilance.json (balíček A7.1 c + A7.2 plánu PLAN-SROVNAVAC-ANALYTIK.md):
// bilance fondu prevence sedmi ZP z výročních zpráv. Čistá funkce; jediný přístup na disk je kontrola, že přepis VZ
// (`soubor`) existuje a má řádek `radek` (volba `vzDir`, výchozí ingest/manual/pojistovny/vz-text).
// Zapojená do ingest/validate-pojistovny.js (smyčka `dalsi`). Data o pojmenovaných institucích, bez jmen osob.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const VZ_DIR = path.resolve(__dirname, '..', 'manual', 'pojistovny', 'vz-text');
export const KODY_ZP = ['111', '201', '205', '207', '209', '211', '213'];
/** Tituly a oslovení, která by prozrazovala osobu v citacích. */
export const OSOBA_RE = /\b(Ing\.|MUDr\.|Mgr\.|JUDr\.|RNDr\.|Bc\.|PhDr\.|doc\.|prof\.|paní|pan[ae]?)\s/;
const SOUBOR_RE = /^\d{3}-\d{4}\.txt$/;
const POLE_OBALKY = ['zustatek_pocatecni', 'zustatek_konecny', 'bu_zustatek_pocatecni', 'bu_zustatek_konecny', 'cerpani_celkem', 'cerpani_programy'];
const POLE_TVORBY = ['ze_zf', 'pokuty_penale', 'ostatni', 'z_pf', 'celkem'];
const POLE_VYUZITI = ['pocet_prispevku', 'pocet_zadosti', 'pocet_osob'];

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Číselné hodnoty, které řádek přepisu obsahuje (české tisíce po mezeře nebo tečce, desetinná čárka). */
export function cislaNaRadku(line) {
  return [...String(line).matchAll(/-?\d{1,3}(?:[ . ]\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/g)].map((m) => Number(m[0].replace(/[ . ]/g, '').replace(',', '.')));
}

/**
 * @param {object} B dataset
 * @param {{vzDir?:string, hospodareniRady?:object|null, kontrolaSouboru?:boolean}} [opt]
 * @returns {{errors:string[], warnings:string[], checks:number}}
 */
export function validateFondBilance(B, { vzDir = VZ_DIR, hospodareniRady = null, kontrolaSouboru = true } = {}) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); return !!cond; };
  const T = 'pojistovny-fond-bilance.json';
  if (!ok(isObj(B), `${T}: chybí nebo není objekt`)) return { errors, warnings, checks };
  for (const f of ['version', 'generated_at', 'stav_k', '_doc', 'zdroj', 'roky', 'pojistovny']) ok(B[f] != null, `${T} root: missing '${f}'`);
  if (B.stav_k != null) ok(isDate(B.stav_k), `${T}.stav_k: formát RRRR-MM-DD`);
  const roky = Array.isArray(B.roky) ? B.roky : [];
  ok(roky.length > 0 && roky.every(Number.isInteger), `${T}.roky: neprázdné pole celých čísel`);
  ok(isObj(B.zdroj) && isStr(B.zdroj.nazev) && Array.isArray(B.zdroj.soubory), `${T}.zdroj: {nazev, soubory[]}`);
  const radkyCache = new Map();
  const radky = (soubor) => {
    if (!radkyCache.has(soubor)) {
      const p = path.join(vzDir, soubor);
      radkyCache.set(soubor, fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n') : null);
    }
    return radkyCache.get(soubor);
  };

  /** Kontrola jedné obálky {hodnota, soubor, radek, citace?, poznamka?, odvozeno?}; null je v pořádku (důvod je v poznamky). */
  const obalka = (kde, c) => {
    if (c === null) return;
    if (!ok(isObj(c), `${kde}: musí být objekt nebo null`)) return;
    ok(isNum(c.hodnota), `${kde}.hodnota: musí být číslo`);
    ok(isStr(c.soubor) && SOUBOR_RE.test(c.soubor), `${kde}.soubor: tvar <kod>-<rok>.txt`);
    ok(Number.isInteger(c.radek) && c.radek >= 1, `${kde}.radek: celé číslo ≥ 1`);
    if (c.citace !== undefined) ok(isStr(c.citace) && c.citace.length <= 260, `${kde}.citace: neprázdný string do 260 znaků`);
    if (c.poznamka !== undefined) ok(isStr(c.poznamka), `${kde}.poznamka: neprázdný string`);
    if (c.odvozeno !== undefined) ok(c.odvozeno === true, `${kde}.odvozeno: pouze true`);
    for (const t of [c.citace, c.poznamka]) if (typeof t === 'string') ok(!OSOBA_RE.test(t), `${kde}: text obsahuje titul nebo oslovení osoby`);
    if (kontrolaSouboru && isStr(c.soubor) && SOUBOR_RE.test(c.soubor) && Number.isInteger(c.radek)) {
      const r = radky(c.soubor);
      if (ok(r !== null, `${kde}.soubor: ${c.soubor} neexistuje v ${path.relative(path.resolve(__dirname, '..', '..'), vzDir)}`)) {
        ok(c.radek <= r.length, `${kde}.radek: ${c.radek} je za koncem souboru ${c.soubor} (${r.length} řádků)`);
      }
    }
  };

  const kodyV = (B.pojistovny ?? []).map((p) => p.kod);
  ok(JSON.stringify(kodyV) === JSON.stringify(KODY_ZP), `${T}.pojistovny: očekáváno ${KODY_ZP.join(', ')}, je ${kodyV.join(', ')}`);
  for (const p of B.pojistovny ?? []) {
    const P = `ZP ${p.kod}`;
    ok(typeof p.kod === 'string', `${P}.kod: musí být řetězec`);
    ok(isStr(p.zkratka), `${P}.zkratka: chybí`);
    ok(Array.isArray(p.poznamky_autora), `${P}.poznamky_autora: musí být pole`);
    for (const t of p.poznamky_autora ?? []) ok(isStr(t) && !OSOBA_RE.test(t), `${P}.poznamky_autora: neprázdné texty bez titulů osob`);
    ok(isObj(p.roky), `${P}.roky: musí být objekt`);
    for (const rok of roky) {
      const y = p.roky?.[String(rok)];
      const Y = `${P}[${rok}]`;
      if (!ok(isObj(y), `${Y}: chybí rok`)) continue;
      for (const k of POLE_OBALKY) { ok(y[k] !== undefined, `${Y}.${k}: chybí (null je dovoleno)`); obalka(`${Y}.${k}`, y[k] ?? null); }
      if (ok(isObj(y.tvorba), `${Y}.tvorba: musí být objekt`)) for (const k of POLE_TVORBY) { ok(y.tvorba[k] !== undefined, `${Y}.tvorba.${k}: chybí (null je dovoleno)`); obalka(`${Y}.tvorba.${k}`, y.tvorba[k] ?? null); }
      if (ok(isObj(y.vyuziti), `${Y}.vyuziti: musí být objekt`)) {
        for (const k of POLE_VYUZITI) { ok(y.vyuziti[k] !== undefined, `${Y}.vyuziti.${k}: chybí (null je dovoleno)`); obalka(`${Y}.vyuziti.${k}`, y.vyuziti[k] ?? null); }
        const maPocet = POLE_VYUZITI.some((k) => y.vyuziti[k] != null);
        ok(!maPocet || isStr(y.vyuziti.definice), `${Y}.vyuziti.definice: povinná, pokud je vyplněný počet`);
        for (const k of POLE_VYUZITI) if (y.vyuziti[k]?.hodnota !== undefined) ok(Number.isInteger(y.vyuziti[k].hodnota) && y.vyuziti[k].hodnota > 0, `${Y}.vyuziti.${k}.hodnota: kladné celé číslo`);
      }
      if (ok(isObj(y.poznamky), `${Y}.poznamky: musí být objekt`)) {
        for (const [k, t] of Object.entries(y.poznamky)) ok(isStr(t) && !OSOBA_RE.test(t), `${Y}.poznamky.${k}: neprázdný text bez titulů osob`);
        // každé null pole má důvod
        const nully = [...POLE_OBALKY.filter((k) => y[k] == null), ...POLE_TVORBY.filter((k) => y.tvorba?.[k] == null).map((k) => `tvorba.${k}`)];
        for (const k of nully) ok(isStr(y.poznamky[k]), `${Y}.poznamky.${k}: pole je null, chybí důvod`);
        if (y.vyuziti && POLE_VYUZITI.every((k) => y.vyuziti[k] == null)) ok(isStr(y.poznamky.vyuziti), `${Y}.poznamky.vyuziti: počty jsou null, chybí důvod`);
      }
      // bilance: konečný = počáteční + tvorba − čerpání (±1 tis. Kč), kde jsou všechny čtyři
      const [po, ko, tv, ce] = [y.zustatek_pocatecni, y.zustatek_konecny, y.tvorba?.celkem, y.cerpani_celkem].map((c) => c?.hodnota);
      if ([po, ko, tv, ce].every(isNum)) {
        const rozdil = po + tv - ce - ko;
        ok(Math.abs(rozdil) <= 1, `${Y}: konečný zůstatek ${ko} ≠ počáteční ${po} + tvorba ${tv} − čerpání ${ce} (rozdíl ${rozdil} tis. Kč)`);
      } else if (y.tvorba?.celkem || y.cerpani_celkem) {
        warnings.push(`${Y}: neúplná bilance (chybí ${[['zustatek_pocatecni', po], ['zustatek_konecny', ko], ['tvorba.celkem', tv], ['cerpani_celkem', ce]].filter(([, v]) => !isNum(v)).map(([k]) => k).join(', ')})`);
      }
      // složky tvorby
      const z = y.tvorba;
      if (z && isNum(z.celkem?.hodnota) && z.ostatni && z.ostatni.odvozeno === true) {
        const soucet = (z.ze_zf?.hodnota ?? 0) + (z.pokuty_penale?.hodnota ?? 0) + z.ostatni.hodnota;
        ok(Math.abs(soucet - z.celkem.hodnota) <= 1, `${Y}.tvorba: ze_zf + pokuty_penale + ostatni = ${soucet} ≠ celkem ${z.celkem.hodnota}`);
        ok(z.ostatni.hodnota >= -1, `${Y}.tvorba.ostatni = ${z.ostatni.hodnota} < 0`);
      }
      if (isNum(y.cerpani_programy?.hodnota) && isNum(y.cerpani_celkem?.hodnota)) ok(y.cerpani_programy.hodnota <= y.cerpani_celkem.hodnota + 1, `${Y}: čerpání programů ${y.cerpani_programy.hodnota} > čerpání celkem ${y.cerpani_celkem.hodnota}`);
      for (const k of ['zustatek_konecny', 'bu_zustatek_konecny', 'zustatek_pocatecni', 'bu_zustatek_pocatecni']) if (isNum(y[k]?.hodnota)) ok(y[k].hodnota >= 0, `${Y}.${k} = ${y[k].hodnota} < 0`);
    }
    // souvislost let: konečný zůstatek roku = počáteční zůstatek následujícího (±1 tis. Kč)
    for (const rok of roky) {
      const a = p.roky?.[String(rok)]; const b = p.roky?.[String(rok + 1)];
      for (const k of ['zustatek', 'bu_zustatek']) {
        const x = a?.[`${k}_konecny`]?.hodnota; const y2 = b?.[`${k}_pocatecni`]?.hodnota;
        if (isNum(x) && isNum(y2) && Math.abs(x - y2) > 1) warnings.push(`${P}: ${k}_konecny ${rok} = ${x} ≠ ${k}_pocatecni ${rok + 1} = ${y2}`);
      }
    }
  }

  // čerpání programů proti Tab. 3c Hodnocení MZ (±2 %; WARN, VoZP se liší o jiné zdroje)
  const rady = hospodareniRady?.pojistovny;
  if (Array.isArray(rady)) {
    for (const p of B.pojistovny ?? []) {
      const h = rady.find((x) => x.kod === p.kod);
      for (const rok of roky) {
        const mz = h?.rady?.fond_prevence_mil?.[String(rok)]?.hodnota;
        const y = p.roky?.[String(rok)];
        const c = (y?.cerpani_programy ?? y?.cerpani_celkem)?.hodnota;
        if (!isNum(mz) || !isNum(c)) continue;
        const tis = mz * 1000;
        if (Math.abs(c - tis) > Math.abs(tis) * 0.02) warnings.push(`ZP ${p.kod}[${rok}]: čerpání programů ve VZ ${c} tis. Kč se liší od Tab. 3c Hodnocení MZ (${Math.round(tis)} tis. Kč) o ${(((c - tis) / tis) * 100).toFixed(1)} % (> 2 %)`);
      }
    }
  }
  return { errors, warnings, checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(__dirname, '..', '..');
  const B = JSON.parse(fs.readFileSync(path.join(root, 'data', 'pojistovny-fond-bilance.json'), 'utf8'));
  let H = null;
  try { H = JSON.parse(fs.readFileSync(path.join(root, 'data', 'pojistovny-hospodareni-rady.json'), 'utf8')); } catch { /* volitelné */ }
  const r = validateFondBilance(B, { hospodareniRady: H });
  for (const w of r.warnings) console.warn(`  ! ${w}`);
  if (r.errors.length) { for (const e of r.errors) console.error(`  ✗ ${e}`); process.exit(1); }
  console.log(`✓ pojistovny-fond-bilance.json (${r.checks} kontrol)`);
}
