// Validátor data/pojistovny-hospodareni-rady.json (balíček A1.1). Čistá funkce; zapojení do validateAll dělá orchestrátor.
//   node ingest/lib/validate-hospodareni-rady.js   → validuje soubor v data/ (exit 1 při chybě)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const KODY = ['111', '201', '205', '207', '209', '211', '213'];
const ZAKLADNI = [
  'pojistenci_prumer', 'zamestnanci', 'prijmy_celkem_mld', 'pojistne_po_prerozdeleni_mld', 'vliv_prerozdeleni_mld', 'naklady_zs_mld',
  'naklady_na_pojistence_kc', 'zustatek_bu_zfzp_mld', 'rezervni_fond_mld', 'hospodarsky_vysledek_mld', 'pohledavky_po_lhute_mil', 'zavazky_po_lhute_mil',
];
const SOUCTY = ['pojistenci_prumer', 'prijmy_celkem_mld', 'naklady_zs_mld', 'vliv_prerozdeleni_mld', 'pojistne_po_prerozdeleni_mld', 'pojistne_pred_prerozdelenim_mld'];
// rok hospodaření v pojistovny.json: [klíč v hospodareni, řada, absolutní tolerance (zaokrouhlení v pojistovny.json)]
const PROTI_P = [
  ['pocet_pojistencu', 'pojistenci_prumer', 0.5],
  ['prijmy_celkem_mld', 'prijmy_celkem_mld', 0.0006],
  ['naklady_na_pojistence_kc', 'naklady_na_pojistence_kc', 0.6],
  ['hospodarsky_vysledek_mld', 'hospodarsky_vysledek_mld', 0.0015],
];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function nactiP() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8')); } catch { return null; }
}

/** @returns {{errors: string[], warnings: string[]}} */
export function validateHospodareniRady(R, { pojistovny } = {}) {
  const errors = [];
  const warnings = [];
  const err = (s) => errors.push(s);
  if (!R || typeof R !== 'object') return { errors: ['soubor není objekt'], warnings };
  if (R.version !== '1.0') err(`version: očekáváno "1.0", je ${R.version}`);
  const roky = R.roky;
  if (!Array.isArray(roky) || !roky.length || !roky.every(Number.isInteger)) { err('roky: chybí nebo nejsou celá čísla'); return { errors, warnings }; }
  if (roky[0] !== 2015) err(`roky: řada má začínat 2015, začíná ${roky[0]}`);
  for (let i = 1; i < roky.length; i++) if (roky[i] !== roky[i - 1] + 1) err(`roky: řada není vzestupná po jednom roce (${roky[i - 1]} → ${roky[i]})`);
  const kodyV = (R.pojistovny ?? []).map((p) => p.kod);
  if (JSON.stringify(kodyV) !== JSON.stringify(KODY)) err(`pojistovny: očekáváno ${KODY.join(', ')}, je ${kodyV.join(', ')}`);

  const kontrolaRady = (kde, rady) => {
    if (!rady || typeof rady !== 'object') { err(`${kde}: chybí rady`); return; }
    for (const [id, rada] of Object.entries(rady)) {
      for (const rok of roky) {
        const c = rada?.[String(rok)];
        if (c === undefined) { err(`${kde}.${id}: chybí rok ${rok}`); continue; }
        if (c === null) continue;
        if (!isNum(c.hodnota)) err(`${kde}.${id}[${rok}]: hodnota není číslo`);
        if (c.rok !== rok) err(`${kde}.${id}[${rok}]: rok v obálce je ${c.rok}`);
        if (typeof c.zdroj !== 'string' || !c.zdroj.startsWith('https://')) err(`${kde}.${id}[${rok}]: zdroj musí být https URL`);
        if (typeof c.list !== 'string' || !c.list) err(`${kde}.${id}[${rok}]: chybí list`);
        if (c.radek !== null && c.radek !== undefined && !Number.isInteger(c.radek)) err(`${kde}.${id}[${rok}]: radek není celé číslo`);
      }
    }
  };
  for (const p of R.pojistovny ?? []) {
    kontrolaRady(`ZP ${p.kod}`, p.rady);
    if (!Array.isArray(p.historicke)) err(`ZP ${p.kod}: historicke není pole`);
    for (const id of ZAKLADNI) {
      for (const rok of roky) if (p.rady?.[id]?.[String(rok)] == null) err(`ZP ${p.kod}.${id}[${rok}]: základní řada nesmí být null`);
    }
    for (const rok of roky) {
      const g = (id) => p.rady?.[id]?.[String(rok)]?.hodnota;
      const sp = g('statni_pojistenci_pct');
      if (isNum(sp) && (sp < 40 || sp > 70)) err(`ZP ${p.kod}.statni_pojistenci_pct[${rok}] = ${sp} mimo 40–70`);
      const pn = g('provozni_naklady_pct');
      if (isNum(pn) && (pn < 0.5 || pn > 5)) err(`ZP ${p.kod}.provozni_naklady_pct[${rok}] = ${pn} mimo 0,5–5`);
      const vl = g('vliv_prerozdeleni_mld'); const po = g('pojistne_po_prerozdeleni_mld'); const pred = g('pojistne_pred_prerozdelenim_mld');
      if (isNum(vl) && isNum(po) && isNum(pred) && Math.abs(vl - (po - pred)) > 0.0015) err(`ZP ${p.kod}[${rok}]: vliv_prerozdeleni (${vl}) ≠ po − před (${(po - pred).toFixed(6)})`);
    }
  }
  kontrolaRady('cr', R.cr?.rady);
  kontrolaRady('zamestnanecke', R.zamestnanecke?.rady);

  // součet ZP = cr (±0,5 %)
  for (const id of SOUCTY) {
    for (const rok of roky) {
      const cr = R.cr?.rady?.[id]?.[String(rok)]?.hodnota;
      const casti = (R.pojistovny ?? []).map((p) => p.rady?.[id]?.[String(rok)]?.hodnota);
      if (!isNum(cr) || !casti.every(isNum)) { if (SOUCTY.slice(0, 4).includes(id)) err(`součet ${id}[${rok}]: chybí hodnota ZP nebo cr`); continue; }
      const s = casti.reduce((a, b) => a + b, 0);
      if (Math.abs(s - cr) > Math.abs(cr) * 0.005) err(`součet ${id}[${rok}]: Σ ZP = ${s} vs cr = ${cr} (> 0,5 %)`);
    }
  }

  // rok hospodaření = pojistovny.json (±0,1 % nebo zaokrouhlení v souboru)
  const P = pojistovny ?? nactiP();
  if (P?.rok_hospodareni && roky.includes(P.rok_hospodareni)) {
    const rok = String(P.rok_hospodareni);
    for (const z of P.pojistovny ?? []) {
      const p = (R.pojistovny ?? []).find((x) => x.kod === String(z.kod));
      if (!p) continue;
      for (const [kP, kR, abs] of PROTI_P) {
        const a = z.hospodareni?.[kP]?.hodnota;
        const b = p.rady?.[kR]?.[rok]?.hodnota;
        if (!isNum(a) || !isNum(b)) { err(`${z.kod}.${kR}[${rok}]: nelze porovnat s pojistovny.json (${kP})`); continue; }
        if (Math.abs(a - b) > Math.max(Math.abs(a) * 0.001, abs)) err(`${z.kod}.${kR}[${rok}] = ${b} ≠ pojistovny.json ${kP} = ${a} (> 0,1 %)`);
      }
    }
  }
  if (!Array.isArray(R.chybi)) err('chybi: není pole');
  return { errors, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const f = path.join(ROOT, 'data', 'pojistovny-hospodareni-rady.json');
  const r = validateHospodareniRady(JSON.parse(fs.readFileSync(f, 'utf8')));
  for (const w of r.warnings) console.warn(`  ! ${w}`);
  if (r.errors.length) { for (const e of r.errors) console.error(`  ✗ ${e}`); process.exit(1); }
  console.log('✓ pojistovny-hospodareni-rady.json');
}
