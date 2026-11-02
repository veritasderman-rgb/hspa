// Věková a pohlavní standardizace „Kč na pojištěnce“ v datasetu srovnávače pojišťoven — P3.3.
//
// Spouštěj:  node ingest/transform_pojistovny_standardizace.js [--vahy <cesta>] [--dnes YYYY-MM-DD]
//            (po ingest/transform_pojistovny_crp.js; zapojení do `npm run` je třída C, řeší samostatný PR)
//
// Vstupy:
//   data/pojistovny.json                              pojistovny[].hospodareni.{naklady_na_pojistence_kc,
//                                                     fond_prevence_na_pojistence_kc} (rok_hospodareni)
//   data/pojistovny-vek.json                          struktura kmene ZP × 19 pásem × pohlaví + ČR (CRP)
//   ingest/manual/pojistovny/nakladove-indexy-<rok>.json  nákladové váhy podle věku a pohlaví (rok =
//                                                     rok_hospodareni; stav dolozeno | placeholder-bez-vah)
// Výstup: data/pojistovny.json doplněný o obálky
//   hospodareni.naklady_na_pojistence_std_kc a hospodareni.fond_prevence_na_pojistence_std_kc
//   {hodnota, rok, zdroj, poznamka, faktor, stav} + záznam v changelog[].
//
// Vzorec (ingest/lib/standardizace.js, metodika § 4.1):
//   faktor = Σ(podíl_ČR_i × váha_i) / Σ(podíl_ZP_i × váha_i);  std = hodnota × faktor.
// Fond prevence se standardizuje STEJNÝM faktorem jako náklady na zdravotní služby — jen aproximace
// (věkový profil čerpání prevence je jiný než profil nákladů na péči), viz metodika.
// Při stavu vah `placeholder-bez-vah` je faktor 1 a std hodnota = nestandardizovaná; poznámka to říká.
//
// Idempotentní: opakované spuštění se stejnými vstupy soubor nepřepíše a nepřidá druhý changelog
// záznam se stejným dnem a textem.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { faktoryProVsechny, standardizujHodnotu, STAV_PLACEHOLDER, STAV_INDEX_PREROZDELENI } from './lib/standardizace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const P_PATH = path.join(ROOT, 'data', 'pojistovny.json');
export const VEK_PATH = path.join(ROOT, 'data', 'pojistovny-vek.json');
export const vahyPath = (rok) => path.join(__dirname, 'manual', 'pojistovny', `nakladove-indexy-${rok}.json`);

/** Pole, která se standardizují: zdrojové pole → cílové pole. */
export const STD_POLE = {
  naklady_na_pojistence_kc: 'naklady_na_pojistence_std_kc',
  fond_prevence_na_pojistence_kc: 'fond_prevence_na_pojistence_std_kc',
};

const fmtFaktor = (f) => f.toFixed(3).replace('.', ',');

/**
 * Čistá funkce: vrátí nový objekt pojistovny.json se std obálkami a případným changelog záznamem.
 * @param {object} P   data/pojistovny.json
 * @param {object} vek data/pojistovny-vek.json
 * @param {object} vahyDef nakladove-indexy-<rok>.json
 * @param {{dnes: string, vahySoubor?: string}} opts
 */
export function aplikujStandardizaci(P, vek, vahyDef, { dnes, vahySoubor = `nakladove-indexy-${vahyDef.rok}.json` }) {
  const faktory = faktoryProVsechny(vek, vahyDef);
  const placeholder = vahyDef.stav === STAV_PLACEHOLDER;
  const out = structuredClone(P);

  let zachovano = 0;
  for (const z of out.pojistovny) {
    const f = faktory[z.kod];
    if (!f) throw new Error(`standardizace: ZP ${z.kod} chybí v pojistovny-vek.json`);
    const faktor = Math.round(f.faktor * 10000) / 10000;
    for (const [src, dst] of Object.entries(STD_POLE)) {
      const s = z.hospodareni?.[src];
      if (!s) continue;
      // Placeholder (všechny váhy = 1) nesmí přepsat standardizaci indexem z přerozdělení MZ
      // (metodika § 4.2, transform_pojistovny_index_prerozdeleni.js): ta je lepší než nic.
      // Jakmile budou váhy doložené, přepíše se i obálka z indexu.
      if (placeholder && z.hospodareni[dst]?.stav === STAV_INDEX_PREROZDELENI) { zachovano += 1; continue; }
      const aprox = src.startsWith('fond_prevence')
        ? ' Fond prevence je standardizován faktorem nákladů na zdravotní služby — jen aproximace (věkový profil čerpání prevence se liší).'
        : '';
      const poznamka = placeholder
        ? `faktor ${fmtFaktor(faktor)}; nákladové indexy ${vahyDef.rok} zatím nedoloženy (stav ${vahyDef.stav}: všechny váhy = 1), hodnota = nestandardizovaná; struktura kmene CRP ${vek.rok}.${aprox}`
        : `faktor ${fmtFaktor(faktor)}; nákladové indexy ${vahyDef.rok} (${vahyDef.zdroj?.nazev ?? 'zdroj neuveden'}); stav ${vahyDef.stav}; struktura kmene CRP ${vek.rok}, standard = struktura ČR.${aprox}`;
      z.hospodareni[dst] = {
        hodnota: standardizujHodnotu(s.hodnota, faktor),
        rok: s.rok,
        zdroj: `výpočet: ${src} × faktor věkově-pohlavní standardizace (ingest/transform_pojistovny_standardizace.js; data/pojistovny-vek.json; ingest/manual/pojistovny/${vahySoubor})`,
        poznamka,
        faktor,
        stav: vahyDef.stav,
      };
    }
  }

  const zmena = placeholder
    ? (zachovano
      ? `Věková standardizace (P3.3): nákladové indexy ${vahyDef.rok} zatím nedoloženy (placeholder); zachována standardizace indexem nákladovosti kmene z přerozdělení MZ (metodika § 4.2), placeholder ji nepřepisuje.`
      : `Věková standardizace (P3.3): doplněna pole naklady_na_pojistence_std_kc a fond_prevence_na_pojistence_std_kc; nákladové indexy ${vahyDef.rok} zatím nedoloženy (placeholder, faktor 1, hodnota = nestandardizovaná).`)
    : `Věková standardizace (P3.3): pole naklady_na_pojistence_std_kc a fond_prevence_na_pojistence_std_kc přepočtena nákladovými indexy ${vahyDef.rok} (stav ${vahyDef.stav}) na strukturu ČR z CRP ${vek.rok}.`;
  const zdroj = 'PLAN-SROVNAVAC-POJISTOVEN.md P3.3; docs/metodika-srovnavac-pojistoven.md § 4.1';
  out.changelog = Array.isArray(out.changelog) ? out.changelog : [];
  const dataZmenena = JSON.stringify(out.pojistovny) !== JSON.stringify(P.pojistovny);
  const uzJe = out.changelog.some((c) => c.datum === dnes && c.zmena === zmena);
  if (dataZmenena && !uzJe) out.changelog.push({ datum: dnes, zmena, zdroj });
  return { data: out, faktory, zachovano, zmeneno: dataZmenena || (out.changelog.length !== (P.changelog?.length ?? 0)) };
}

/** JSON.stringify(…, 2) s changelogem po jednom řádku na záznam (styl datasetu). */
export function serializuj(P) {
  const s = JSON.stringify(P, null, 2);
  return s.replace(/("changelog": \[)([\s\S]*?)(\n  \])/, (m, a, body, c) => {
    const items = (P.changelog ?? []).map((x) => `    ${JSON.stringify(x)}`).join(',\n');
    return items ? `${a}\n${items}${c}` : m;
  }) + '\n';
}

export function run({ dnes = new Date().toISOString().slice(0, 10), vahy, log = console.log } = {}) {
  if (!fs.existsSync(VEK_PATH)) {
    log(`⚠ transform_pojistovny_standardizace: ${path.basename(VEK_PATH)} chybí (spusť ingest/transform_pojistovny_crp.js) — přeskakuji.`);
    return { skipped: true };
  }
  const P = JSON.parse(fs.readFileSync(P_PATH, 'utf8'));
  const vek = JSON.parse(fs.readFileSync(VEK_PATH, 'utf8'));
  const vPath = vahy ?? vahyPath(P.rok_hospodareni);
  if (!fs.existsSync(vPath)) throw new Error(`chybí nákladové váhy ${vPath}`);
  const vahyDef = JSON.parse(fs.readFileSync(vPath, 'utf8'));
  const { data, faktory, zmeneno } = aplikujStandardizaci(P, vek, vahyDef, { dnes, vahySoubor: path.basename(vPath) });
  if (zmeneno) {
    data.generated_at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    fs.writeFileSync(P_PATH, serializuj(data), 'utf8');
  }
  return { skipped: false, zmeneno, faktory, vahyDef, vek, data };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--vahy') opts.vahy = path.resolve(argv[++i]);
    else if (argv[i] === '--dnes') opts.dnes = argv[++i];
  }
  try {
    const r = run(opts);
    if (!r.skipped) {
      console.log(`✓ transform_pojistovny_standardizace: váhy ${r.vahyDef.rok} (${r.vahyDef.stav}), CRP ${r.vek.rok}${r.zmeneno ? '' : ' — beze změny'}`);
      for (const z of r.data.pojistovny) {
        const h = z.hospodareni;
        console.log(`  ${z.kod} ${z.zkratka}: faktor ${r.faktory[z.kod].faktor.toFixed(4)} · náklady ${h.naklady_na_pojistence_kc?.hodnota} → ${h.naklady_na_pojistence_std_kc?.hodnota} · prevence ${h.fond_prevence_na_pojistence_kc?.hodnota} → ${h.fond_prevence_na_pojistence_std_kc?.hodnota}`);
      }
    }
  } catch (e) { console.error('✗ transform_pojistovny_standardizace:', e.message); process.exit(1); }
}
