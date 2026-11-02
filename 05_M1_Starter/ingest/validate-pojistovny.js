// Validace datasetů srovnávače zdravotních pojišťoven proti datovému kontraktu.
// Spouštěj: node ingest/validate-pojistovny.js   (zapojení do validate:all je třída C, řeší se zvlášť)
//
// Hlídá všechny čtyři datasety:
//  - data/pojistovny.json            root pole, 7 ZP s unikátními kódy, CRP blok, hospodareni
//                                    (každá položka {hodnota, rok, zdroj}), hospodareni_2025 (null nebo
//                                    stejné obálky), konzistence odvozených hodnot, semafor, volitelný changelog[]
//  - data/pojistovny-aplikace.json   funkce[], aplikace[7], funkce true|false|null, uzivatele, rizikové skupiny, rozpory
//  - data/pojistovny-prevence.json   enum stupňů, oblasti, matice 7 ZP, onko/duševní sloupce, struktura fondu prevence
//  - data/pojistovny-otazky.json     sady otázek (typ otevrene | dotaznik), unikátní id
//
// Chyby (FAIL) končí exit 1. Varování (WARN) proces nezastaví (např. součet položek fondu prevence
// neodpovídá souhrnu ±1 % — některé výroční zprávy zaokrouhlují).
// Jádro je čistá funkce validateAll(datasets) → {errors, warnings, checks}; CLI jen načte soubory.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

export const FILES = {
  pojistovny: 'pojistovny.json',
  aplikace: 'pojistovny-aplikace.json',
  prevence: 'pojistovny-prevence.json',
  otazky: 'pojistovny-otazky.json',
};

export const ZP_CODES = ['111', '201', '205', '207', '209', '211', '213'];
export const OBLASTI = ['prevence', 'dostupnost', 'sit', 'kvalita', 'servis', 'hospodareni'];
export const STAVY = ['dolozeno', 'deklarovano', 'nedolozeno', 'neodpovedela'];

const HOSP_REQUIRED = ['pocet_pojistencu', 'prijmy_celkem_mld', 'naklady_zdravotni_sluzby_mld', 'naklady_na_pojistence_kc',
  'fond_prevence_naklady_mil', 'fond_prevence_na_pojistence_kc', 'provozni_naklady_pct', 'hospodarsky_vysledek_mld',
  'zustatek_bu_2025_oček_mil', 'zustatek_bu_2026_plan_mil', 'zustatek_2026_pct_vydaju'];

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function validateAll(datasets) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  // ok(): počítá kontrolu; při nesplnění zapíše chybu
  const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); return !!cond; };
  const warn = (msg) => warnings.push(msg);

  const { pojistovny: P, aplikace: A, prevence: V, otazky: Q } = datasets ?? {};

  // Obálka {hodnota, rok, zdroj}: hodnota číslo nebo null; hodnota bez zdroje je chyba.
  function checkEnvelope(v, tag) {
    if (!ok(isObj(v), `${tag}: musí být objekt {hodnota, rok, zdroj}`)) return;
    ok(v.hodnota == null || isNum(v.hodnota), `${tag}.hodnota: není číslo`);
    if (v.hodnota != null) ok(!!v.zdroj, `${tag}: hodnota bez zdroje`);
  }

  // ---------------------------------------------------------------- pojistovny.json
  if (ok(isObj(P), 'pojistovny.json: chybí nebo není objekt')) {
    for (const f of ['version', 'generated_at', '_doc', 'rok_hospodareni', 'rok_crp', 'oblasti', 'stavy_semaforu', 'zdroje', 'pojistovny']) {
      ok(P[f] != null, `pojistovny.json root: missing '${f}'`);
    }
    ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(P.generated_at ?? ''), 'pojistovny.json root: generated_at není ISO 8601 UTC');

    const oblastIds = (P.oblasti ?? []).map((o) => o.id);
    for (const o of OBLASTI) ok(oblastIds.includes(o), `pojistovny.json oblasti: chybí '${o}'`);
    for (const s of STAVY) ok(!!P.stavy_semaforu?.[s]?.label, `pojistovny.json stavy_semaforu: chybí '${s}'`);

    // volitelný changelog[] (může chybět nebo být prázdný)
    if (P.changelog != null) {
      if (ok(Array.isArray(P.changelog), 'pojistovny.json changelog: musí být pole')) {
        P.changelog.forEach((c, i) => {
          const tag = `pojistovny.json changelog[${i}]`;
          if (!ok(isObj(c), `${tag}: musí být objekt`)) return;
          ok(isIsoDate(c.datum), `${tag}.datum: není ISO datum YYYY-MM-DD (${JSON.stringify(c.datum)})`);
          ok(isStr(c.zmena), `${tag}.zmena: musí být neprázdný string`);
          ok(typeof c.zdroj === 'string', `${tag}.zdroj: musí být string`);
        });
      }
    }

    const seen = new Set();
    for (const z of P.pojistovny ?? []) {
      const tag = `zp[${z.kod ?? '?'}]`;
      ok(ZP_CODES.includes(String(z.kod)), `${tag}: neznámý kód`);
      ok(!seen.has(z.kod), `${tag}: duplicitní kód`);
      seen.add(z.kod);
      for (const f of ['zkratka', 'nazev', 'web', 'crp', 'hospodareni', 'prevence', 'servis', 'mereni_dopadu', 'semafor']) {
        ok(z[f] != null, `${tag}: missing '${f}'`);
      }
      const c = z.crp ?? {};
      for (const f of ['pojistenci', 'podil_trhu_pct', 'podil_65plus_pct', 'podil_0_14_pct', 'rust_2015_2025_pct', 'top_kraje', 'podil_trend', 'zdroj']) {
        ok(c[f] != null, `${tag}.crp: missing '${f}'`);
      }
      if (Array.isArray(c.podil_trend)) ok(c.podil_trend.length >= 10, `${tag}.crp.podil_trend: příliš krátká řada (${c.podil_trend.length})`);

      const h = z.hospodareni ?? {};
      for (const f of HOSP_REQUIRED) {
        if (!ok(h[f] != null, `${tag}.hospodareni: missing '${f}'`)) continue;
        checkEnvelope(h[f], `${tag}.hospodareni.${f}`);
      }

      // hospodareni_2025: null (nebo chybí), nebo objekt obálek se stejnými pravidly
      if (z.hospodareni_2025 != null) {
        if (ok(isObj(z.hospodareni_2025), `${tag}.hospodareni_2025: musí být null nebo objekt obálek`)) {
          for (const [k, v] of Object.entries(z.hospodareni_2025)) {
            if (k === 'rok') continue; // případný skalární rok bloku
            checkEnvelope(v, `${tag}.hospodareni_2025.${k}`);
          }
        }
      }

      // odvozené hodnoty: fond prevence / pojištěnci ≈ fond_prevence_na_pojistence_kc (±2 %)
      const fp = h.fond_prevence_naklady_mil?.hodnota, pp = h.pocet_pojistencu?.hodnota, fpp = h.fond_prevence_na_pojistence_kc?.hodnota;
      if (fp != null && pp && fpp != null) {
        const calc = fp * 1e6 / pp;
        ok(Math.abs(calc - fpp) / fpp <= 0.02, `${tag}: fond_prevence_na_pojistence_kc ${fpp} ≠ výpočet ${calc.toFixed(0)}`);
      }
      const nzs = h.naklady_zdravotni_sluzby_mld?.hodnota, npp = h.naklady_na_pojistence_kc?.hodnota;
      if (nzs != null && pp && npp != null) {
        const calc = nzs * 1e9 / pp;
        ok(Math.abs(calc - npp) / npp <= 0.02, `${tag}: naklady_na_pojistence_kc ${npp} ≠ výpočet ${calc.toFixed(0)}`);
      }
      ok(typeof z.mereni_dopadu?.hodnoceni_ve_vz === 'boolean', `${tag}.mereni_dopadu.hodnoceni_ve_vz: musí být boolean`);

      for (const [ob, s] of Object.entries(z.semafor ?? {})) {
        ok(OBLASTI.includes(ob), `${tag}.semafor: neznámá oblast '${ob}'`);
        if (s?.stav != null) {
          ok(STAVY.includes(s.stav), `${tag}.semafor.${ob}: neznámý stav '${s.stav}'`);
          ok(!!(s.zduvodneni && s.zdroj && s.rok), `${tag}.semafor.${ob}: stav bez zdůvodnění/zdroje/roku`);
        }
      }
    }
    ok(seen.size === 7, `pojistovny: očekáváno 7, nalezeno ${seen.size}`);

    // Kontrolní součet proti systému (MZ): součet pojištěnců ±0,5 %
    const sysP = P.system?.pocet_pojistencu_prumer;
    if (sysP) {
      const sum = (P.pojistovny ?? []).reduce((a, z) => a + (z.hospodareni?.pocet_pojistencu?.hodnota ?? 0), 0);
      ok(Math.abs(sum - sysP) / sysP <= 0.005, `součet pojištěnců ${sum} ≠ systém ${sysP}`);
    }
  }

  // ---------------------------------------------------------------- pojistovny-aplikace.json
  const AT = 'pojistovny-aplikace.json';
  if (ok(isObj(A), `${AT}: chybí nebo není objekt`)) {
    for (const f of ['version', 'generated_at', '_doc', 'funkce', 'aplikace', 'rizikove_skupiny', 'rozpory']) {
      ok(A[f] != null, `${AT} root: missing '${f}'`);
    }
    const funkceIds = [];
    if (ok(Array.isArray(A.funkce), `${AT}: funkce musí být pole`)) {
      const labels = new Set();
      A.funkce.forEach((f, i) => {
        ok(isStr(f?.id), `${AT} funkce[${i}]: chybí id`);
        ok(isStr(f?.label), `${AT} funkce[${i}]: chybí label`);
        ok(!funkceIds.includes(f?.id), `${AT} funkce: duplicitní id '${f?.id}'`);
        ok(!labels.has(f?.label), `${AT} funkce: duplicitní label '${f?.label}'`);
        funkceIds.push(f?.id);
        labels.add(f?.label);
      });
    }
    if (ok(Array.isArray(A.aplikace), `${AT}: aplikace musí být pole`)) {
      const codes = new Set();
      for (const a of A.aplikace) {
        const tag = `${AT} aplikace[${a?.kod ?? '?'}]`;
        ok(ZP_CODES.includes(String(a?.kod)), `${tag}: neznámý kód ZP`);
        ok(!codes.has(a?.kod), `${tag}: duplicitní kód`);
        codes.add(a?.kod);
        if (ok(isObj(a?.funkce), `${tag}.funkce: musí být objekt`)) {
          for (const [k, v] of Object.entries(a.funkce)) {
            ok(funkceIds.includes(k), `${tag}.funkce: neznámé id '${k}'`);
            ok(v === true || v === false || v === null, `${tag}.funkce.${k}: musí být true|false|null (${JSON.stringify(v)})`);
          }
        }
        if (a?.uzivatele != null) checkEnvelope(a.uzivatele, `${tag}.uzivatele`);
      }
      ok(A.aplikace.length === 7, `${AT}: aplikace očekáváno 7, nalezeno ${A.aplikace.length}`);
      for (const k of ZP_CODES) ok(codes.has(k), `${AT}: chybí aplikace pro ZP ${k}`);
    }
    const rs = A.rizikove_skupiny;
    if (ok(isObj(rs), `${AT}: rizikove_skupiny musí být objekt`)) {
      ok(Array.isArray(rs.skupiny) && rs.skupiny.length > 0, `${AT} rizikove_skupiny.skupiny: musí být neprázdné pole`);
      for (const k of rs.predikcni_modely ?? []) ok(ZP_CODES.includes(String(k)), `${AT} rizikove_skupiny.predikcni_modely: neznámý kód '${k}'`);
    }
    if (ok(Array.isArray(A.rozpory), `${AT}: rozpory musí být pole`)) {
      A.rozpory.forEach((r, i) => ok(typeof r === 'string', `${AT} rozpory[${i}]: musí být string`));
    }
  }

  // ---------------------------------------------------------------- pojistovny-prevence.json
  const VT = 'pojistovny-prevence.json';
  if (ok(isObj(V), `${VT}: chybí nebo není objekt`)) {
    for (const f of ['version', 'generated_at', '_doc', 'stupne', 'oblasti', 'onko_screening_sloupce', 'dusevni_sloupce', 'pojistovny']) {
      ok(V[f] != null, `${VT} root: missing '${f}'`);
    }
    const stupne = Object.keys(V.stupne ?? {});
    ok(stupne.length > 0, `${VT}: stupne musí být neprázdný enum`);
    const stupenOk = (s) => s === null || stupne.includes(s);

    const oblIds = [];
    (V.oblasti ?? []).forEach((o, i) => {
      ok(isStr(o?.id), `${VT} oblasti[${i}]: chybí id`);
      ok(!oblIds.includes(o?.id), `${VT} oblasti: duplicitní id '${o?.id}'`);
      oblIds.push(o?.id);
    });
    const onkoCols = V.onko_screening_sloupce ?? [];
    const dusIds = (V.dusevni_sloupce ?? []).map((s) => s.id);

    const codes = new Set();
    for (const z of V.pojistovny ?? []) {
      const tag = `${VT} pojistovny[${z?.kod ?? '?'}]`;
      ok(ZP_CODES.includes(String(z?.kod)), `${tag}: neznámý kód ZP`);
      ok(!codes.has(z?.kod), `${tag}: duplicitní kód`);
      codes.add(z?.kod);
      ok(isNum(z?.rok_vz), `${tag}.rok_vz: musí být číslo (${JSON.stringify(z?.rok_vz)})`);

      for (const [id, o] of Object.entries(z?.oblasti ?? {})) {
        ok(oblIds.includes(id), `${tag}.oblasti: neznámé id '${id}'`);
        ok(isObj(o) && 'stupen' in o && stupenOk(o.stupen), `${tag}.oblasti.${id}.stupen: '${o?.stupen}' není z enumu ${JSON.stringify(stupne)} ani null`);
      }
      for (const [k, v] of Object.entries(z?.onko_screening ?? {})) {
        if (k === 'nadstandard') { // jediná výjimka: objekt se stupněm
          ok(isObj(v) && stupenOk(v.stupen ?? null), `${tag}.onko_screening.nadstandard.stupen: '${v?.stupen}' není z enumu`);
          continue;
        }
        ok(onkoCols.includes(k), `${tag}.onko_screening: neznámý sloupec '${k}'`);
        ok(typeof v === 'boolean' || v === null, `${tag}.onko_screening.${k}: musí být boolean|null (${JSON.stringify(v)})`);
      }
      for (const [k, v] of Object.entries(z?.dusevni ?? {})) {
        ok(dusIds.includes(k), `${tag}.dusevni: neznámý sloupec '${k}'`);
        ok(isObj(v) && stupenOk(v.stupen ?? null), `${tag}.dusevni.${k}.stupen: '${v?.stupen}' není z enumu`);
      }

      const fps = z?.fond_prevence_struktura;
      if (fps != null) {
        const pol = Array.isArray(fps.polozky) ? fps.polozky : [];
        ok(Array.isArray(fps.polozky), `${tag}.fond_prevence_struktura.polozky: musí být pole`);
        let sum = 0;
        pol.forEach((p, i) => {
          ok(p?.skutecnost === null || isNum(p?.skutecnost), `${tag}.fond_prevence_struktura.polozky[${i}].skutecnost: musí být číslo|null`);
          if (isNum(p?.skutecnost)) sum += p.skutecnost;
        });
        const celkem = fps.celkem?.skutecnost;
        if (isNum(celkem) && celkem !== 0) {
          checks++;
          const diff = Math.abs(sum - celkem) / Math.abs(celkem);
          if (diff > 0.01) {
            warn(`${tag}.fond_prevence_struktura: součet položek ${sum} ≠ celkem ${celkem} (rozdíl ${(diff * 100).toFixed(1)} %, ${pol.length} položek, rok_vz ${z.rok_vz})`);
          }
        }
      }
    }
    ok(codes.size === 7, `${VT}: pojistovny očekáváno 7, nalezeno ${codes.size}`);
    for (const k of ZP_CODES) ok(codes.has(k), `${VT}: chybí ZP ${k}`);
  }

  // ---------------------------------------------------------------- pojistovny-otazky.json
  const QT = 'pojistovny-otazky.json';
  if (ok(isObj(Q), `${QT}: chybí nebo není objekt`)) {
    for (const f of ['version', 'generated_at', '_doc', 'sady']) ok(Q[f] != null, `${QT} root: missing '${f}'`);
    if (ok(Array.isArray(Q.sady), `${QT}: sady musí být pole`)) {
      const sadaIds = new Set();
      for (const s of Q.sady) {
        const tag = `${QT} sada[${s?.id ?? '?'}]`;
        ok(isStr(s?.id), `${tag}: chybí id`);
        ok(!sadaIds.has(s?.id), `${tag}: duplicitní id sady`);
        sadaIds.add(s?.id);
        ok(isStr(s?.nazev), `${tag}: chybí nazev`);
        if (s?.verze != null) ok(isStr(s.verze) && s.verze.length <= 32, `${tag}.verze: neprázdný string do 32 znaků`);
        const qids = new Set();
        const checkQ = (q, qtag, withOptions) => {
          ok(isStr(q?.id), `${qtag}: chybí id otázky`);
          ok(!qids.has(q?.id), `${qtag}: duplicitní id otázky '${q?.id}' v sadě`);
          qids.add(q?.id);
          ok(isStr(q?.text), `${qtag}: chybí text`);
          if (q?.vyber != null) {
            ok(q.vyber === 'jeden' || q.vyber === 'vice', `${qtag}.vyber: jeden | vice (je '${q.vyber}')`);
            ok(Array.isArray(q?.moznosti), `${qtag}.vyber: dává smysl jen u otázky s moznosti[]`);
          }
          if (withOptions) {
            ok(Array.isArray(q?.moznosti) && q.moznosti.length > 0 && q.moznosti.every(isStr), `${qtag}.moznosti: musí být neprázdné pole stringů`);
          }
        };
        if (s?.typ === 'otevrene') {
          if (ok(Array.isArray(s.otazky) && s.otazky.length > 0, `${tag}: typ otevrene vyžaduje neprázdné otazky[]`)) {
            s.otazky.forEach((q, i) => checkQ(q, `${tag}.otazky[${i}]`, false));
          }
        } else if (s?.typ === 'dotaznik') {
          if (ok(Array.isArray(s.casti) && s.casti.length > 0, `${tag}: typ dotaznik vyžaduje neprázdné casti[]`)) {
            const cIds = new Set();
            s.casti.forEach((c, ci) => {
              const ctag = `${tag}.casti[${ci}]`;
              ok(isStr(c?.id), `${ctag}: chybí id`);
              ok(!cIds.has(c?.id), `${ctag}: duplicitní id části '${c?.id}'`);
              cIds.add(c?.id);
              ok(isStr(c?.nazev), `${ctag}: chybí nazev`);
              if (ok(Array.isArray(c?.otazky) && c.otazky.length > 0, `${ctag}: chybí otazky[]`)) {
                c.otazky.forEach((q, i) => checkQ(q, `${ctag}.otazky[${i}]`, true));
              }
            });
          }
        } else {
          ok(false, `${tag}: neznámý typ '${s?.typ}' (otevrene | dotaznik)`);
        }
      }
    }
  }

  return { errors, warnings, checks };
}

export function loadDatasets(dir = DATA_DIR) {
  const out = {};
  for (const [key, file] of Object.entries(FILES)) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) throw new Error(`data/${file} not found`);
    out[key] = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return out;
}

function main() {
  let datasets;
  try { datasets = loadDatasets(); } catch (e) { console.error('FAIL:', e.message); process.exit(1); }
  const { errors, warnings, checks } = validateAll(datasets);
  for (const w of warnings) console.warn(' WARN:', w);
  if (errors.length) {
    console.error(`validate-pojistovny: ${errors.length} chyb`);
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }
  const P = datasets.pojistovny;
  console.log(`validate-pojistovny: OK: 4 datasety, ${checks} kontrol (${P.pojistovny.length} ZP, verze ${P.version}, stav ${P.stav}${warnings.length ? `, ${warnings.length} WARN` : ''})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
