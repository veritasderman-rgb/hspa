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
//  - data/pojistovny-sit.json        (volitelný, P3.5 prototyp) matice ZP × odbornost × kraj, validateSit() na konci souboru
//  - data/pojistovny-vek.json        (volitelný, P3.3) 7 ZP, součet struktury = celkem ±0,1 %,
//                                    ČR celkem = součet ZP ±0,5 %; hospodareni.*_std_kc obálka s faktorem 0,5–2 a stavem
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
/** Volitelné datasety: když soubor chybí, validace se přeskočí (P3.3 věková struktura z CRP). */
export const OPTIONAL_FILES = {
  vek: 'pojistovny-vek.json',
  zadosti: 'zadosti-106.json',
  sit: 'pojistovny-sit.json',
};
export const STD_STAVY = ['dolozeno', 'placeholder-bez-vah'];

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

  const { pojistovny: P, aplikace: A, prevence: V, otazky: Q, vek: VK } = datasets ?? {};

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

      // crp.pojistenci_trend (P3.1, graf index 2010 = 100): povinná řada ≥ 10 bodů {year, insured},
      // roky vzestupně bez duplicit; poslední bod má sedět s crp.pojistenci (jinak WARN)
      const pt = c.pojistenci_trend;
      if (ok(Array.isArray(pt), `${tag}.crp.pojistenci_trend: chybí nebo není pole`)) {
        ok(pt.length >= 10, `${tag}.crp.pojistenci_trend: příliš krátká řada (${pt.length}, min. 10)`);
        let prev = -Infinity;
        pt.forEach((p, i) => {
          ok(isObj(p) && Number.isInteger(p.year) && p.year > prev, `${tag}.crp.pojistenci_trend[${i}].year: musí být celé číslo, roky vzestupně bez duplicit`);
          ok(isObj(p) && isNum(p.insured) && p.insured > 0, `${tag}.crp.pojistenci_trend[${i}].insured: musí být kladné číslo`);
          if (isObj(p) && Number.isInteger(p.year)) prev = p.year;
        });
        const last = pt[pt.length - 1];
        if (isObj(last) && isNum(last.insured) && isNum(c.pojistenci) && last.insured !== c.pojistenci) {
          warn(`${tag}.crp.pojistenci_trend: poslední bod (${last.insured}) ≠ crp.pojistenci (${c.pojistenci})`);
        }
      }

      const h = z.hospodareni ?? {};
      for (const f of HOSP_REQUIRED) {
        if (!ok(h[f] != null, `${tag}.hospodareni: missing '${f}'`)) continue;
        checkEnvelope(h[f], `${tag}.hospodareni.${f}`);
      }

      // volitelná standardizovaná pole *_std_kc (P3.3): obálka + faktor 0,5–2 + stav vah
      for (const [k, v] of Object.entries(h)) {
        if (!/_std_kc$/.test(k)) continue;
        const stag = `${tag}.hospodareni.${k}`;
        checkEnvelope(v, stag);
        if (!isObj(v)) continue;
        ok(isNum(v.faktor) && v.faktor >= 0.5 && v.faktor <= 2, `${stag}.faktor: musí být číslo 0,5–2 (${JSON.stringify(v.faktor)})`);
        ok(STD_STAVY.includes(v.stav), `${stag}.stav: '${v.stav}' není z ${JSON.stringify(STD_STAVY)}`);
        ok(isStr(v.poznamka), `${stag}.poznamka: chybí (faktor, rok indexů, stav)`);
        const base = h[k.replace(/_std_kc$/, '_kc')]?.hodnota;
        if (v.stav === 'placeholder-bez-vah' && isNum(base) && isNum(v.hodnota)) {
          ok(v.hodnota === base, `${stag}: placeholder bez vah musí mít hodnotu = nestandardizované (${v.hodnota} ≠ ${base})`);
        }
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
        if (s?.stanovisko_pojistovny != null) ok(isStr(s.stanovisko_pojistovny), `${tag}.semafor.${ob}.stanovisko_pojistovny: musí být neprázdný string (doslovné stanovisko)`);
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
    // P2.3: schéma kritérií přívětivosti (volitelné; prázdné aplikace[].kriteria = zatím nehodnoceno)
    const kritIds = [];
    const kp = A.kriteria_privetivosti;
    const skalaKeys = Object.keys(kp?.skala ?? {});
    if (kp != null && ok(isObj(kp), `${AT}: kriteria_privetivosti musí být objekt`)) {
      ok(['navrh', 'schvaleno'].includes(kp.stav), `${AT} kriteria_privetivosti.stav: 'navrh'|'schvaleno' (${JSON.stringify(kp.stav)})`);
      ok(isStr(kp.zdroj), `${AT} kriteria_privetivosti: chybí zdroj`);
      ok(skalaKeys.length > 0 && skalaKeys.every((k) => /^\d+$/.test(k)), `${AT} kriteria_privetivosti.skala: neprázdný objekt s číselnými klíči`);
      if (ok(Array.isArray(kp.kriteria), `${AT} kriteria_privetivosti.kriteria musí být pole`)) {
        kp.kriteria.forEach((k, i) => {
          ok(isStr(k?.id), `${AT} kriteria_privetivosti.kriteria[${i}]: chybí id`);
          ok(isStr(k?.label), `${AT} kriteria_privetivosti.kriteria[${i}]: chybí label`);
          ok(!kritIds.includes(k?.id), `${AT} kriteria_privetivosti.kriteria: duplicitní id '${k?.id}'`);
          kritIds.push(k?.id);
        });
      }
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
        if (a?.kriteria != null && ok(isObj(a.kriteria), `${tag}.kriteria: musí být objekt`)) {
          for (const [k, v] of Object.entries(a.kriteria)) {
            ok(kritIds.includes(k), `${tag}.kriteria: neznámé id '${k}'`);
            ok(isObj(v) && skalaKeys.includes(String(v.stupen)), `${tag}.kriteria.${k}.stupen: '${v?.stupen}' není ze škály ${JSON.stringify(skalaKeys)}`);
            ok(isStr(v?.zdroj) && isNum(v?.rok), `${tag}.kriteria.${k}: chybí zdroj nebo rok`);
          }
        }
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
    const skupinaIds = [];
    (V.fond_prevence_skupiny ?? []).forEach((s, i) => {
      ok(isStr(s?.id) && isStr(s?.label), `${VT} fond_prevence_skupiny[${i}]: chybí id nebo label`);
      ok(!skupinaIds.includes(s?.id), `${VT} fond_prevence_skupiny: duplicitní id '${s?.id}'`);
      skupinaIds.push(s?.id);
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
          if (skupinaIds.length) ok(skupinaIds.includes(p?.skupina), `${tag}.fond_prevence_struktura.polozky[${i}].skupina: '${p?.skupina}' chybí nebo není ve slovníku fond_prevence_skupiny`);
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

  // ---------------------------------------------------------------- pojistovny-vek.json (volitelný)
  const KT = 'pojistovny-vek.json';
  if (VK != null && ok(isObj(VK), `${KT}: není objekt`)) {
    for (const f of ['version', 'generated_at', 'rok', 'zdroj', 'pasma', 'pohlavi', 'cr', 'pojistovny']) ok(VK[f] != null, `${KT} root: missing '${f}'`);
    ok(Array.isArray(VK.pasma) && VK.pasma.length === 19, `${KT}: pasma musí mít 19 položek`);
    ok(JSON.stringify(VK.pohlavi) === JSON.stringify(['M', 'F']), `${KT}: pohlavi musí být ["M","F"]`);
    const cells = (VK.pasma ?? []).flatMap((p) => (VK.pohlavi ?? []).map((s) => `${p}:${s}`));
    const checkStruct = (o, tag) => {
      if (!ok(isObj(o?.struktura), `${tag}.struktura: musí být objekt`)) return 0;
      for (const c of cells) ok(isNum(o.struktura[c]) && o.struktura[c] >= 0, `${tag}.struktura: chybí nebo záporná buňka '${c}'`);
      ok(Object.keys(o.struktura).length === cells.length, `${tag}.struktura: neočekávané buňky (${Object.keys(o.struktura).length} ≠ ${cells.length})`);
      const sum = Object.values(o.struktura).reduce((a, b) => a + (isNum(b) ? b : 0), 0);
      if (ok(isNum(o.celkem) && o.celkem > 0, `${tag}.celkem: musí být kladné číslo`)) {
        ok(Math.abs(sum - o.celkem) / o.celkem <= 0.001, `${tag}: součet struktury ${sum} ≠ celkem ${o.celkem} (±0,1 %)`);
      }
      return o.celkem ?? 0;
    };
    const codes = new Set();
    let sumZp = 0;
    for (const z of VK.pojistovny ?? []) {
      const tag = `${KT} pojistovny[${z?.kod ?? '?'}]`;
      ok(ZP_CODES.includes(String(z?.kod)), `${tag}: neznámý kód ZP`);
      ok(!codes.has(z?.kod), `${tag}: duplicitní kód`);
      codes.add(z?.kod);
      sumZp += checkStruct(z, tag);
      ok(isNum(z?.podil_65plus_pct), `${tag}.podil_65plus_pct: musí být číslo`);
    }
    ok(codes.size === 7, `${KT}: pojistovny očekáváno 7, nalezeno ${codes.size}`);
    const cr = checkStruct(VK.cr, `${KT} cr`);
    if (cr > 0) ok(Math.abs(sumZp - cr) / cr <= 0.005, `${KT}: ČR celkem ${cr} ≠ součet ZP ${sumZp} (±0,5 %)`);
    // soulad s crp blokem v pojistovny.json (stejný zdroj a rok): podíl 65+ ±0,2 p. b.
    if (isObj(P) && VK.rok === P.rok_crp) {
      for (const z of VK.pojistovny ?? []) {
        const pz = (P.pojistovny ?? []).find((x) => String(x.kod) === String(z.kod));
        const ref = pz?.crp?.podil_65plus_pct;
        if (isNum(ref) && isNum(z.podil_65plus_pct)) {
          ok(Math.abs(ref - z.podil_65plus_pct) <= 0.2, `${KT} pojistovny[${z.kod}]: podíl 65+ ${z.podil_65plus_pct} ≠ pojistovny.json crp ${ref} (±0,2 p. b.)`);
        }
      }
    }
  }

  if (datasets?.zadosti != null) {
    const zr = validateZadosti(datasets.zadosti);
    errors.push(...zr.errors);
    warnings.push(...zr.warnings);
    checks += zr.checks;
  }

  if (datasets?.sit != null) {
    const sr = validateSit(datasets.sit);
    errors.push(...sr.errors);
    warnings.push(...sr.warnings);
    checks += sr.checks;
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
  for (const [key, file] of Object.entries(OPTIONAL_FILES)) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) out[key] = JSON.parse(fs.readFileSync(p, 'utf8'));
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
  const vek = datasets.vek ? `, věková struktura CRP ${datasets.vek.rok}` : '';
  console.log(`validate-pojistovny: OK: 4 datasety, ${checks} kontrol (${P.pojistovny.length} ZP, verze ${P.version}, stav ${P.stav}${vek}${warnings.length ? `, ${warnings.length} WARN` : ''})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

/**
 * Registr dotazů a žádostí pojišťovnám (data/zadosti-106.json, volitelný dataset).
 * Hlídá enumy, kódy ZP, ISO data, unikátní id a konzistenci stavu s daty odeslání/doručení.
 * (Enumy jsou uvnitř funkce: main() se volá už při načtení modulu, před vyhodnocením konstant níže.)
 */
export function validateZadosti(Z) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); return !!cond; };
  const typy = ['nabidka-spoluprace', 'zadost-106', 'pravo-na-odpoved'];
  const stavy = ['pripravena', 'odeslana', 'odpovezeno', 'po-lhute', 'bez-odpovedi'];
  const T = 'zadosti-106.json';

  if (!ok(isObj(Z), `${T}: chybí nebo není objekt`)) return { errors, warnings, checks };
  ok(isStr(Z.version), `${T}: chybí version`);
  ok(isStr(Z.generated_at), `${T}: chybí generated_at`);
  if (Z.changelog != null && ok(Array.isArray(Z.changelog), `${T} changelog: musí být pole`)) {
    Z.changelog.forEach((c, i) => {
      const tag = `${T} changelog[${i}]`;
      if (!ok(isObj(c), `${tag}: musí být objekt`)) return;
      ok(isIsoDate(c.datum), `${tag}.datum: není ISO datum YYYY-MM-DD (${JSON.stringify(c.datum)})`);
      ok(isStr(c.zmena), `${tag}.zmena: musí být neprázdný string`);
      ok(typeof c.zdroj === 'string', `${tag}.zdroj: musí být string`);
    });
  }
  if (!ok(Array.isArray(Z.zadosti), `${T} zadosti: musí být pole`)) return { errors, warnings, checks };

  const ids = new Set();
  const trojice = new Set();
  Z.zadosti.forEach((z, i) => {
    const tag = `${T} zadosti[${i}]`;
    if (!ok(isObj(z), `${tag}: musí být objekt`)) return;
    if (ok(isStr(z.id), `${tag}.id: chybí`)) {
      ok(!ids.has(z.id), `${tag}.id: duplicitní '${z.id}'`);
      ids.add(z.id);
    }
    ok(Number.isInteger(z.kolo) && z.kolo >= 1, `${tag}.kolo: musí být celé číslo ≥ 1 (${JSON.stringify(z.kolo)})`);
    ok(typy.includes(z.typ), `${tag}.typ: '${z.typ}' není z enumu ${JSON.stringify(typy)}`);
    ok(ZP_CODES.includes(z.pojistovna_kod), `${tag}.pojistovna_kod: neznámý kód '${z.pojistovna_kod}'`);
    ok(z.odeslano == null || isIsoDate(z.odeslano), `${tag}.odeslano: musí být null nebo ISO datum (${JSON.stringify(z.odeslano)})`);
    ok(Number.isInteger(z.lhuta_dni) && z.lhuta_dni >= 1, `${tag}.lhuta_dni: musí být celé číslo ≥ 1 (${JSON.stringify(z.lhuta_dni)})`);
    ok(z.doruceno == null || isIsoDate(z.doruceno), `${tag}.doruceno: musí být null nebo ISO datum (${JSON.stringify(z.doruceno)})`);
    ok(z.odpoved_soubor == null || (isStr(z.odpoved_soubor) && !/^\/|\.\./.test(z.odpoved_soubor)),
      `${tag}.odpoved_soubor: musí být null nebo relativní název souboru bez '..' (${JSON.stringify(z.odpoved_soubor)})`);
    if (!ok(stavy.includes(z.stav), `${tag}.stav: '${z.stav}' není z enumu ${JSON.stringify(stavy)}`)) return;

    if (z.stav === 'pripravena') {
      ok(z.odeslano == null && z.doruceno == null, `${tag}: stav 'pripravena' nesmí mít odeslano ani doruceno (nic nebylo odesláno)`);
    } else {
      ok(isIsoDate(z.odeslano), `${tag}: stav '${z.stav}' vyžaduje datum odeslano`);
    }
    if (z.stav === 'odpovezeno') ok(isIsoDate(z.doruceno), `${tag}: stav 'odpovezeno' vyžaduje datum doruceno`);
    if (z.doruceno != null) {
      ok(z.stav === 'odpovezeno', `${tag}: doruceno je vyplněno, stav musí být 'odpovezeno' (je '${z.stav}')`);
      if (isIsoDate(z.odeslano) && isIsoDate(z.doruceno)) ok(z.doruceno >= z.odeslano, `${tag}: doruceno (${z.doruceno}) je dřív než odeslano (${z.odeslano})`);
    }
    if (z.odpoved_soubor != null && z.stav !== 'odpovezeno') warnings.push(`${tag}: odpoved_soubor u stavu '${z.stav}'`);
    const t = `${z.kolo}|${z.typ}|${z.pojistovna_kod}`;
    if (trojice.has(t)) warnings.push(`${tag}: další záznam pro kolo ${z.kolo}, typ ${z.typ}, ZP ${z.pojistovna_kod}`);
    trojice.add(t);
  });
  return { errors, warnings, checks };
}

/**
 * Síť smluvních poskytovatelů per ZP × odbornost × kraj (data/pojistovny-sit.json, volitelný prototyp).
 * Hlídá tvar, kódy ZP a krajů, nezáporná celá čísla, že buňka ZP nepřekročí celkem v NRPZS
 * (pojišťovna nemůže mít víc smluvních míst, než kolik jich registr eviduje) a že kvalita párování sedí.
 * (Konstanty jsou uvnitř funkce: main() se volá už při načtení modulu, před vyhodnocením konstant níže.)
 */
export function validateSit(S) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); return !!cond; };
  const ZP = ['111', '201', '205', '207', '209', '211', '213'];
  const T = 'pojistovny-sit.json';

  if (!ok(isObj(S), `${T}: chybí nebo není objekt`)) return { errors, warnings, checks };
  ok(isStr(S.version), `${T}: chybí version`);
  ok(isStr(S.generated_at) && !Number.isNaN(Date.parse(S.generated_at)), `${T}: generated_at není ISO čas`);
  ok(Number.isInteger(S.rok) && S.rok >= 2010 && S.rok <= 2100, `${T}: rok musí být celé číslo (${JSON.stringify(S.rok)})`);
  ok(isObj(S.zdroj) && isObj(S.zdroj.nrpzs) && isObj(S.zdroj.icz), `${T}: zdroj musí obsahovat nrpzs a icz`);
  ok(isStr(S.jednotka), `${T}: chybí jednotka (co se počítá)`);

  const odb = Array.isArray(S.odbornosti) ? S.odbornosti : [];
  ok(odb.length > 0, `${T}: odbornosti musí být neprázdné pole`);
  const kody = new Set();
  odb.forEach((o, i) => {
    ok(isObj(o) && /^\d{3}$/.test(String(o.kod)) && isStr(o.nazev), `${T} odbornosti[${i}]: čekám {kod:'NNN', nazev}`);
    ok(!kody.has(o?.kod), `${T} odbornosti[${i}]: duplicitní kód '${o?.kod}'`);
    kody.add(o?.kod);
  });
  const kr = Array.isArray(S.kraje) ? S.kraje : [];
  ok(kr.length >= 14, `${T}: kraje musí mít aspoň 14 položek (je ${kr.length})`);
  const krKody = new Set();
  kr.forEach((k, i) => {
    ok(isObj(k) && isStr(k.kod) && isStr(k.nazev), `${T} kraje[${i}]: čekám {kod, nazev}`);
    ok(!krKody.has(k?.kod), `${T} kraje[${i}]: duplicitní kód '${k?.kod}'`);
    krKody.add(k?.kod);
  });

  const checkCells = (cell, tag) => {
    if (!ok(isObj(cell), `${tag}: musí být objekt kraj → počet`)) return;
    for (const [k, v] of Object.entries(cell)) {
      ok(krKody.has(k), `${tag}: neznámý kraj '${k}'`);
      ok(Number.isInteger(v) && v >= 0, `${tag}.${k}: musí být nezáporné celé číslo (${JSON.stringify(v)})`);
    }
  };

  if (ok(isObj(S.celkem_cr), `${T}: chybí celkem_cr`)) {
    for (const k of kody) {
      if (ok(isObj(S.celkem_cr[k]), `${T} celkem_cr: chybí odbornost ${k}`)) checkCells(S.celkem_cr[k], `${T} celkem_cr[${k}]`);
    }
  }
  if (ok(isObj(S.matice), `${T}: chybí matice`)) {
    for (const zp of ZP) ok(isObj(S.matice[zp]), `${T} matice: chybí ZP ${zp}`);
    for (const zp of Object.keys(S.matice)) {
      ok(ZP.includes(zp), `${T} matice: neznámý kód ZP '${zp}'`);
      for (const k of kody) {
        const cell = S.matice[zp]?.[k];
        if (!ok(isObj(cell), `${T} matice[${zp}]: chybí odbornost ${k}`)) continue;
        checkCells(cell, `${T} matice[${zp}][${k}]`);
        for (const [kraj, v] of Object.entries(cell)) {
          const tot = S.celkem_cr?.[k]?.[kraj] ?? 0;
          ok(v <= tot, `${T} matice[${zp}][${k}][${kraj}]: ${v} > celkem v registru ${tot} (smluvních míst nemůže být víc než evidovaných)`);
        }
      }
    }
  }
  if (ok(isObj(S.kvalita), `${T}: chybí kvalita (statistika párování IČZ → NRPZS)`)) {
    for (const zp of ZP) {
      const q = S.kvalita[zp];
      if (!ok(isObj(q), `${T} kvalita: chybí ZP ${zp}`)) continue;
      const sum = ['adresa', 'okres', 'jediny', 'nepriraditelne'].reduce((a, x) => a + (q[x] || 0), 0);
      ok(Number.isInteger(q.icz_smluvni) && sum === q.icz_smluvni, `${T} kvalita[${zp}]: adresa+okres+jediny+nepriraditelne (${sum}) ≠ icz_smluvni (${q.icz_smluvni})`);
      if (q.icz_smluvni > 0 && q.nepriraditelne / q.icz_smluvni > 0.25) warnings.push(`${T} kvalita[${zp}]: ${Math.round(100 * q.nepriraditelne / q.icz_smluvni)} % IČZ nepřiřazeno k místu NRPZS (> 25 %)`);
    }
  }
  return { errors, warnings, checks };
}
