// Validátor data/pojistovny-segmenty.json (balíček A1.4). Čistá funkce; transform ho volá před zápisem.
//   node ingest/lib/validate-segmenty.js   → validuje soubor v data/ (exit 1 při chybě)
//
// Kontroly: zdroje[rok] (url, list_3, list_3a), 7 ZP a CELKEM ZP, roky vzestupně po jednom roce, každá hodnota je obálka nebo null, id segmentů jedinečná,
// enum skupin a úrovní, součet řádků úrovně 1 = celkem (±0,5 %), celkem = naklady_zs_mld v pojistovny-hospodareni-rady.json
// (±0,1 %), na_pojistence_kc × pojištěnci ≈ tis_kc × 1000 (±1 %, jen varování).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const KODY = ['111', '201', '205', '207', '209', '211', '213'];
const SKUPINY = ['ambulantni', 'luzkova', 'leky', 'ostatni'];
const TOL_SOUCET = 0.005;
const TOL_HOSP = 0.001;
const TOL_POJISTENEC = 0.01;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const rel = (a, b) => (b === 0 ? (a === 0 ? 0 : Infinity) : Math.abs(a - b) / Math.abs(b));

/** Úroveň segmentu v daném roce (podle kódu ř. v listu). */
export const urovenV = (seg, rok) => seg.uroven_podle_roku?.[String(rok)] ?? seg.uroven;

/** @returns {{errors: string[], warnings: string[], checks: object}} */
export function validateSegmenty(S, { hospodareniRady } = {}) {
  const errors = [];
  const warnings = [];
  const checks = { soucty_urovne1: 0, shoda_s_hospodarenim: 0, na_pojistence: 0, obalky: 0 };
  const err = (s) => errors.push(s);
  if (!S || typeof S !== 'object') return { errors: ['soubor není objekt'], warnings, checks };
  if (S.version !== '1.0') err(`version: očekáváno "1.0", je ${S.version}`);
  const roky = S.roky;
  if (!Array.isArray(roky) || !roky.length || !roky.every(Number.isInteger)) { err('roky: chybí nebo nejsou celá čísla'); return { errors, warnings, checks }; }
  for (let i = 1; i < roky.length; i++) if (roky[i] !== roky[i - 1] + 1) err(`roky: řada není vzestupná po jednom roce (${roky[i - 1]} → ${roky[i]})`);

  for (const rok of roky) {
    const z = S.zdroje?.[String(rok)];
    if (!z || typeof z.url !== 'string' || !/^https:\/\//.test(z.url)) err(`zdroje[${rok}]: chybí url souboru`);
    else if (!z.list_3 || !z.list_3a) err(`zdroje[${rok}]: chybí list_3 / list_3a`);
  }
  const segs = S.segmenty;
  if (!Array.isArray(segs) || !segs.length) { err('segmenty: chybí'); return { errors, warnings, checks }; }
  const ids = new Set();
  for (const s of segs) {
    if (!s.id || typeof s.id !== 'string') err('segmenty: záznam bez id');
    else if (ids.has(s.id)) err(`segmenty: duplicitní id ${s.id}`);
    ids.add(s.id);
    if (!SKUPINY.includes(s.skupina)) err(`segmenty[${s.id}]: skupina „${s.skupina}“ není z ${SKUPINY.join('|')}`);
    if (!Number.isInteger(s.uroven) || s.uroven < 1 || s.uroven > 4) err(`segmenty[${s.id}]: uroven musí být 1–4, je ${s.uroven}`);
    if (!s.nazev) err(`segmenty[${s.id}]: chybí nazev`);
    for (const [r, u] of Object.entries(s.uroven_podle_roku ?? {})) if (!roky.includes(Number(r)) || !Number.isInteger(u) || u < 1 || u > 4) err(`segmenty[${s.id}]: uroven_podle_roku[${r}] = ${u} je neplatné`);
  }
  const poradi = segs.map((s) => s.poradi);
  if (poradi.some((p, i) => p !== i + 1)) err('segmenty: poradi musí být 1…N bez mezer ve stejném pořadí jako pole');

  const kodyV = (S.pojistovny ?? []).map((p) => p.kod);
  if (JSON.stringify(kodyV) !== JSON.stringify(KODY)) err(`pojistovny: očekáváno ${KODY.join(', ')}, je ${kodyV.join(', ')}`);
  const subjekty = [...(S.pojistovny ?? []).map((p) => [p.kod, p]), ['cr', S.cr]];
  if (!S.cr?.rady) err('cr.rady: chybí');

  const pocetPoj = (kod, rok) => {
    const o = hospodareniRady?.pojistovny?.find((p) => p.kod === kod)?.rady?.pojistenci_prumer?.[String(rok)];
    return isNum(o?.hodnota) ? o.hodnota : null;
  };
  const hospNaklady = (kod, rok) => {
    const sub = kod === 'cr' ? hospodareniRady?.cr : hospodareniRady?.pojistovny?.find((p) => p.kod === kod);
    const o = sub?.rady?.naklady_zs_mld?.[String(rok)];
    return isNum(o?.hodnota) ? o.hodnota : null;
  };
  if (!hospodareniRady) warnings.push('pojistovny-hospodareni-rady.json nenačten: kontrola shody s naklady_zs_mld a s počtem pojištěnců přeskočena');

  const kontrolaObalky = (o, kde) => {
    if (o === null) return;
    checks.obalky++;
    if (typeof o !== 'object' || Array.isArray(o)) { err(`${kde}: obálka musí být objekt nebo null`); return; }
    if (!isNum(o.tis_kc)) err(`${kde}.tis_kc: není číslo`);
    else if (o.tis_kc < 0) warnings.push(`${kde}: záporná hodnota tis_kc ${o.tis_kc}`);
    if (o.na_pojistence_kc !== null && !isNum(o.na_pojistence_kc)) err(`${kde}.na_pojistence_kc: není číslo ani null`);
    if (o.zpp_tis_kc !== null && !isNum(o.zpp_tis_kc)) err(`${kde}.zpp_tis_kc: není číslo ani null`);
    if (!Number.isInteger(o.radek) || o.radek < 1) err(`${kde}.radek: musí být kladné celé číslo`);
    if ('zdroj' in o || 'list' in o || 'sloupec' in o) err(`${kde}: zdroj/list/sloupec patří na úroveň souboru (zdroje[rok])`);
  };

  for (const [kod, sub] of subjekty) {
    if (!sub) continue;
    const rady = sub.rady ?? {};
    const celkem = sub.celkem ?? {};
    for (const rok of roky) {
      const r = rady[String(rok)];
      if (!r || typeof r !== 'object') { err(`${kod}.rady[${rok}]: chybí`); continue; }
      for (const id of Object.keys(r)) if (!ids.has(id)) err(`${kod}.rady[${rok}]: neznámý segment ${id}`);
      for (const s of segs) {
        if (!(s.id in r)) { err(`${kod}.rady[${rok}][${s.id}]: chybí klíč (má být obálka nebo null)`); continue; }
        kontrolaObalky(r[s.id], `${kod}.rady[${rok}][${s.id}]`);
      }
      const c = celkem[String(rok)];
      if (c === undefined) { err(`${kod}.celkem[${rok}]: chybí klíč`); continue; }
      kontrolaObalky(c, `${kod}.celkem[${rok}]`);
      if (c === null) { err(`${kod}.celkem[${rok}]: řádek celkem je povinný`); continue; }

      // součet řádků úrovně 1 = celkem
      let soucet = 0; let n = 0;
      for (const s of segs) {
        if (urovenV(s, rok) !== 1) continue;
        const o = r[s.id];
        if (o && isNum(o.tis_kc)) { soucet += o.tis_kc; n++; }
      }
      if (!n) err(`${kod}[${rok}]: žádný řádek úrovně 1`);
      else {
        checks.soucty_urovne1++;
        const d = rel(soucet, c.tis_kc);
        if (d > TOL_SOUCET) err(`${kod}[${rok}]: součet řádků úrovně 1 (${Math.round(soucet)}) se liší od celkem (${Math.round(c.tis_kc)}) o ${(d * 100).toFixed(2)} % (> 0,5 %)`);
      }
      // shoda s hospodařením
      const h = hospNaklady(kod, rok);
      if (h != null) {
        checks.shoda_s_hospodarenim++;
        const d = rel(c.tis_kc / 1e6, h);
        if (d > TOL_HOSP) err(`${kod}[${rok}]: celkem ${(c.tis_kc / 1e6).toFixed(3)} mld. Kč se liší od naklady_zs_mld ${h} o ${(d * 100).toFixed(3)} % (> 0,1 %)`);
      } else if (hospodareniRady && kod !== 'cr') warnings.push(`${kod}[${rok}]: naklady_zs_mld v hospodaření chybí, shoda nekontrolována`);
      // na pojištěnce × pojištěnci ≈ tis_kc
      const poj = kod === 'cr' ? null : pocetPoj(kod, rok);
      const kontrolaPoj = (o, kde) => {
        if (!o || !isNum(o.na_pojistence_kc) || !isNum(o.tis_kc) || o.tis_kc === 0 || poj == null) return;
        checks.na_pojistence++;
        const d = rel(o.na_pojistence_kc * poj, o.tis_kc * 1000);
        if (d > TOL_POJISTENEC) warnings.push(`${kde}: na_pojistence_kc × pojištěnci (${Math.round(o.na_pojistence_kc * poj)}) se liší od tis_kc × 1000 (${Math.round(o.tis_kc * 1000)}) o ${(d * 100).toFixed(2)} %`);
      };
      kontrolaPoj(c, `${kod}.celkem[${rok}]`);
      for (const s of segs) if (urovenV(s, rok) === 1) kontrolaPoj(r[s.id], `${kod}.rady[${rok}][${s.id}]`);
    }
  }

  // chybi[]: každý null segment musí být vysvětlen
  const chybi = Array.isArray(S.chybi) ? S.chybi : null;
  if (!chybi) err('chybi: musí být pole');
  else {
    for (const ch of chybi) {
      if (!ids.has(ch.segment)) err(`chybi: neznámý segment ${ch.segment}`);
      if (!Array.isArray(ch.roky) || !ch.roky.every((r) => roky.includes(r))) err(`chybi[${ch.segment}]: roky mimo rozsah`);
      if (!ch.duvod) err(`chybi[${ch.segment}]: chybí duvod`);
    }
    for (const p of S.pojistovny ?? []) {
      for (const rok of roky) {
        for (const s of segs) {
          if (p.rady?.[String(rok)]?.[s.id] !== null) continue;
          const pokryto = chybi.some((ch) => ch.segment === s.id && ch.roky?.includes(rok) && (ch.kody === 'vsechny' || ch.kody?.includes(p.kod)));
          if (!pokryto) err(`${p.kod}.rady[${rok}][${s.id}]: null bez záznamu v chybi[]`);
        }
      }
    }
  }
  return { errors, warnings, checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-segmenty.json'), 'utf8'));
  let rady = null;
  try { rady = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny-hospodareni-rady.json'), 'utf8')); } catch (_) { /* bez kontroly shody */ }
  const r = validateSegmenty(S, { hospodareniRady: rady });
  for (const w of r.warnings) console.warn(`  ! ${w}`);
  if (r.errors.length) { for (const e of r.errors) console.error(`  ✗ ${e}`); process.exit(1); }
  console.log(`✓ validate-segmenty: ${S.roky[0]}–${S.roky.at(-1)}, ${S.segmenty.length} segmentů (${JSON.stringify(r.checks)})`);
}
