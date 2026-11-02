// Validace data/pojistovny.json (Hlídač zdravotních pojišťoven) proti datovému kontraktu.
// Spouštěj: node ingest/validate-pojistovny.js   (přidat do validate:all v package.json)
//
// Kontroluje: root pole, 7 pojišťoven s unikátními kódy, CRP blok, hospodaření
// (každá položka {hodnota, rok, zdroj}; hodnota číslo nebo null), konzistenci
// odvozených hodnot (prevence na pojištěnce, náklady na pojištěnce ±2 %),
// semafor (jen povolené oblasti a stavy; stav != null vyžaduje zdůvodnění a zdroj).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'pojistovny.json');

function fail(msg) { console.error('FAIL:', msg); process.exit(1); }
if (!fs.existsSync(FILE)) fail('data/pojistovny.json not found');

const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const errors = [];
const E = (m) => errors.push(m);

for (const f of ['version', 'generated_at', '_doc', 'rok_hospodareni', 'rok_crp', 'oblasti', 'stavy_semaforu', 'zdroje', 'pojistovny']) {
  if (d[f] == null) E(`root: missing '${f}'`);
}
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(d.generated_at ?? '')) E('root: generated_at není ISO 8601 UTC');

export const ZP_CODES = ['111', '201', '205', '207', '209', '211', '213'];
export const OBLASTI = ['prevence', 'dostupnost', 'sit', 'kvalita', 'servis', 'hospodareni'];
export const STAVY = ['dolozeno', 'deklarovano', 'nedolozeno', 'neodpovedela'];

const oblastIds = (d.oblasti ?? []).map((o) => o.id);
for (const o of OBLASTI) if (!oblastIds.includes(o)) E(`oblasti: chybí '${o}'`);
for (const s of STAVY) if (!d.stavy_semaforu?.[s]?.label) E(`stavy_semaforu: chybí '${s}'`);

const HOSP_REQUIRED = ['pocet_pojistencu', 'prijmy_celkem_mld', 'naklady_zdravotni_sluzby_mld', 'naklady_na_pojistence_kc',
  'fond_prevence_naklady_mil', 'fond_prevence_na_pojistence_kc', 'provozni_naklady_pct', 'hospodarsky_vysledek_mld',
  'zustatek_bu_2025_oček_mil', 'zustatek_bu_2026_plan_mil', 'zustatek_2026_pct_vydaju'];

const seen = new Set();
for (const z of d.pojistovny ?? []) {
  const tag = `zp[${z.kod ?? '?'}]`;
  if (!ZP_CODES.includes(String(z.kod))) E(`${tag}: neznámý kód`);
  if (seen.has(z.kod)) E(`${tag}: duplicitní kód`);
  seen.add(z.kod);
  for (const f of ['zkratka', 'nazev', 'web', 'crp', 'hospodareni', 'prevence', 'servis', 'mereni_dopadu', 'semafor']) {
    if (z[f] == null) E(`${tag}: missing '${f}'`);
  }
  const c = z.crp ?? {};
  for (const f of ['pojistenci', 'podil_trhu_pct', 'podil_65plus_pct', 'podil_0_14_pct', 'rust_2015_2025_pct', 'top_kraje', 'podil_trend', 'zdroj']) {
    if (c[f] == null) E(`${tag}.crp: missing '${f}'`);
  }
  if (Array.isArray(c.podil_trend) && c.podil_trend.length < 10) E(`${tag}.crp.podil_trend: příliš krátká řada (${c.podil_trend.length})`);

  const h = z.hospodareni ?? {};
  for (const f of HOSP_REQUIRED) {
    const v = h[f];
    if (v == null) { E(`${tag}.hospodareni: missing '${f}'`); continue; }
    if (typeof v !== 'object') { E(`${tag}.hospodareni.${f}: musí být objekt {hodnota, rok, zdroj}`); continue; }
    if (v.hodnota != null && typeof v.hodnota !== 'number') E(`${tag}.hospodareni.${f}.hodnota: není číslo`);
    if (v.hodnota != null && !v.zdroj) E(`${tag}.hospodareni.${f}: hodnota bez zdroje`);
  }
  // odvozené hodnoty: fond prevence / pojištěnci ≈ fond_prevence_na_pojistence_kc (±2 %)
  const fp = h.fond_prevence_naklady_mil?.hodnota, pp = h.pocet_pojistencu?.hodnota, fpp = h.fond_prevence_na_pojistence_kc?.hodnota;
  if (fp != null && pp && fpp != null) {
    const calc = fp * 1e6 / pp;
    if (Math.abs(calc - fpp) / fpp > 0.02) E(`${tag}: fond_prevence_na_pojistence_kc ${fpp} ≠ výpočet ${calc.toFixed(0)}`);
  }
  const nzs = h.naklady_zdravotni_sluzby_mld?.hodnota, npp = h.naklady_na_pojistence_kc?.hodnota;
  if (nzs != null && pp && npp != null) {
    const calc = nzs * 1e9 / pp;
    if (Math.abs(calc - npp) / npp > 0.02) E(`${tag}: naklady_na_pojistence_kc ${npp} ≠ výpočet ${calc.toFixed(0)}`);
  }
  if (typeof z.mereni_dopadu?.hodnoceni_ve_vz !== 'boolean') E(`${tag}.mereni_dopadu.hodnoceni_ve_vz: musí být boolean`);

  for (const [ob, s] of Object.entries(z.semafor ?? {})) {
    if (!OBLASTI.includes(ob)) E(`${tag}.semafor: neznámá oblast '${ob}'`);
    if (s.stav != null) {
      if (!STAVY.includes(s.stav)) E(`${tag}.semafor.${ob}: neznámý stav '${s.stav}'`);
      if (!s.zduvodneni || !s.zdroj || !s.rok) E(`${tag}.semafor.${ob}: stav bez zdůvodnění/zdroje/roku`);
    }
  }
}
if (seen.size !== 7) E(`pojistovny: očekáváno 7, nalezeno ${seen.size}`);

// Kontrolní součet proti systému (MZ): součet pojištěnců ±0,5 %
const sysP = d.system?.pocet_pojistencu_prumer;
if (sysP) {
  const sum = (d.pojistovny ?? []).reduce((a, z) => a + (z.hospodareni?.pocet_pojistencu?.hodnota ?? 0), 0);
  if (Math.abs(sum - sysP) / sysP > 0.005) E(`součet pojištěnců ${sum} ≠ systém ${sysP}`);
}

if (errors.length) {
  console.error(`validate-pojistovny: ${errors.length} chyb`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`validate-pojistovny: OK (${d.pojistovny.length} ZP, verze ${d.version}, stav ${d.stav})`);
