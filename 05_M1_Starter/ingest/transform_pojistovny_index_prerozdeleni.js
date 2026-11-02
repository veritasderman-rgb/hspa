// Standardizace „Kč na pojištěnce“ indexem nákladovosti kmene z měsíčního přerozdělení MZ — metodika § 4.2.
//
// Spouštěj:  node ingest/transform_pojistovny_index_prerozdeleni.js [--dnes YYYY-MM-DD]
//            (po ingest/transform_pojistovny_standardizace.js; zapojení do `npm run` je třída C)
//
// Proč: nákladové indexy věkových skupin pro rok 2024 MZ nezveřejnilo (posílá je jen Dozorčímu
// orgánu a pojišťovnám, § 20c zák. 592/1992 Sb.), takže věkově-pohlavní standardizace (§ 4.1)
// zůstává v placeholderu. MZ ale každý měsíc zveřejňuje výslednou částku po přerozdělení na
// jednoho pojištěnce podle pojišťoven; podle poznámky MZ rozdíly mezi pojišťovnami vznikají
// „rozdílnou strukturou pojištěnců a odlišným podílem zvlášť nákladných hrazených služeb“.
// Podíl mediánu pojišťovny k mediánu všech pojišťoven je tedy oficiální index nákladovosti
// kmene (věk, pohlaví, PCG, nákladné služby), kterým lze Kč na pojištěnce standardizovat.
//
// Vstupy:
//   data/pojistovny.json                              hospodareni.{naklady_na_pojistence_kc, fond_prevence_na_pojistence_kc}
//   ingest/manual/pojistovny/prerozdeleni-mz.json     měsíční Kč na pojištěnce po přerozdělení (ZP + celkem), rok = rok_hospodareni
// Výstup: data/pojistovny.json → hospodareni.index_prerozdeleni {hodnota, rok, zdroj, poznamka, median_kc, median_cr_kc}
//   a přepočtené obálky naklady_na_pojistence_std_kc / fond_prevence_na_pojistence_std_kc
//   {hodnota, rok, zdroj, poznamka, faktor, stav: "index-prerozdeleni"} + záznam v changelog[].
//
// Vzorec: index = medián_ZP / medián_celkem; faktor = 1 / index; std = hodnota × faktor.
// Medián místo průměru: jednotlivé měsíce nesou mimořádná vyúčtování (nákladné služby, opravy),
// která s nákladovostí kmene nesouvisí. Idempotentní (stejný vstup = beze změny souboru).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializuj, STD_POLE } from './transform_pojistovny_standardizace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const P_PATH = path.join(ROOT, 'data', 'pojistovny.json');
export const MZ_PATH = path.join(__dirname, 'manual', 'pojistovny', 'prerozdeleni-mz.json');
export const STAV_INDEX = 'index-prerozdeleni';

const fmt = (f, d = 3) => f.toFixed(d).replace('.', ',');

export function median(arr) {
  const a = (arr || []).filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) throw new Error('median: prázdné pole');
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Index a faktor pro každou ZP z měsíční řady daného roku. */
export function indexyZRady(mz, rok) {
  const r = mz?.roky?.[String(rok)];
  if (!r || !Array.isArray(r.celkem)) throw new Error(`prerozdeleni-mz.json: chybí rok ${rok} nebo řada celkem`);
  if (r.celkem.length !== 12) throw new Error(`prerozdeleni-mz.json: rok ${rok} celkem nemá 12 měsíců`);
  const mCr = median(r.celkem);
  const out = {};
  for (const [kod, rada] of Object.entries(r)) {
    if (kod === 'celkem') continue;
    if (!Array.isArray(rada) || rada.length !== 12) throw new Error(`prerozdeleni-mz.json: ${rok}/${kod} nemá 12 měsíců`);
    const m = median(rada);
    const index = m / mCr;
    out[kod] = { median_kc: m, median_cr_kc: mCr, index: Math.round(index * 10000) / 10000, faktor: Math.round((1 / index) * 10000) / 10000 };
  }
  return out;
}

/**
 * Čistá funkce: vrátí nový objekt pojistovny.json s indexem a std obálkami.
 * @param {object} P data/pojistovny.json
 * @param {object} mz prerozdeleni-mz.json
 * @param {{dnes: string}} opts
 */
export function aplikujIndex(P, mz, { dnes }) {
  const rok = P.rok_hospodareni;
  const idx = indexyZRady(mz, rok);
  const out = structuredClone(P);
  const zdrojText = `${mz.zdroj?.nazev ?? 'MZ ČR, přerozdělování pojistného'} (${mz.zdroj?.url ?? ''}; ingest/manual/pojistovny/prerozdeleni-mz.json)`;
  for (const z of out.pojistovny) {
    const i = idx[z.kod];
    if (!i) throw new Error(`index-prerozdeleni: ZP ${z.kod} chybí v prerozdeleni-mz.json (${rok})`);
    z.hospodareni.index_prerozdeleni = {
      hodnota: i.index,
      rok,
      zdroj: zdrojText,
      poznamka: `medián měsíční částky po přerozdělení na pojištěnce ${rok}: ${i.median_kc} Kč proti ${i.median_cr_kc} Kč za všechny pojišťovny; index > 1 = nákladnější kmen (věk, pohlaví, PCG, nákladné služby). Medián místo průměru kvůli mimořádným vyúčtováním v jednotlivých měsících.`,
      median_kc: i.median_kc,
      median_cr_kc: i.median_cr_kc,
    };
    for (const [src, dst] of Object.entries(STD_POLE)) {
      const s = z.hospodareni?.[src];
      if (!s || typeof s.hodnota !== 'number') continue;
      const aprox = src.startsWith('fond_prevence')
        ? ' Fond prevence je standardizován stejným faktorem jako náklady na zdravotní služby — jen aproximace (věkový profil čerpání prevence se liší).'
        : '';
      z.hospodareni[dst] = {
        hodnota: Math.round(s.hodnota * i.faktor),
        rok: s.rok,
        zdroj: `výpočet: ${src} × faktor z indexu nákladovosti kmene (ingest/transform_pojistovny_index_prerozdeleni.js; ingest/manual/pojistovny/prerozdeleni-mz.json)`,
        poznamka: `faktor ${fmt(i.faktor)} = 1 / index ${fmt(i.index)} (medián měsíční částky po přerozdělení ${rok}, MZ); stav ${STAV_INDEX}: standardizace indexem nákladovosti kmene z přerozdělení, ne věkově-pohlavními indexy (ty MZ pro ${rok} nezveřejnilo, metodika § 4.2).${aprox}`,
        faktor: i.faktor,
        stav: STAV_INDEX,
      };
    }
  }
  const zmena = `Standardizace nákladů na pojištěnce indexem nákladovosti kmene z měsíčního přerozdělení MZ (metodika § 4.2): pole index_prerozdeleni a přepočet naklady_na_pojistence_std_kc / fond_prevence_na_pojistence_std_kc (stav ${STAV_INDEX}, rok ${rok}); nahrazuje placeholder věkově-pohlavní standardizace, dokud MZ nezveřejní nákladové indexy věkových skupin.`;
  const zdroj = 'MZ ČR · přerozdělování pojistného (měsíční PDF) · ingest/manual/pojistovny/prerozdeleni-mz.json; docs/metodika-srovnavac-pojistoven.md § 4.2';
  out.changelog = Array.isArray(out.changelog) ? out.changelog : [];
  const dataZmenena = JSON.stringify(out.pojistovny) !== JSON.stringify(P.pojistovny);
  const uzJe = out.changelog.some((c) => c.zmena === zmena);
  if (dataZmenena && !uzJe) out.changelog.push({ datum: dnes, zmena, zdroj });
  return { data: out, idx, zmeneno: dataZmenena };
}

export function run({ dnes = new Date().toISOString().slice(0, 10) } = {}) {
  const P = JSON.parse(fs.readFileSync(P_PATH, 'utf8'));
  const mz = JSON.parse(fs.readFileSync(MZ_PATH, 'utf8'));
  const { data, idx, zmeneno } = aplikujIndex(P, mz, { dnes });
  if (zmeneno) {
    data.generated_at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    fs.writeFileSync(P_PATH, serializuj(data), 'utf8');
  }
  return { zmeneno, idx, data };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--dnes') opts.dnes = argv[++i];
  try {
    const r = run(opts);
    console.log(`✓ transform_pojistovny_index_prerozdeleni: rok ${r.data.rok_hospodareni}${r.zmeneno ? '' : ' — beze změny'}`);
    for (const z of r.data.pojistovny) {
      const h = z.hospodareni; const i = r.idx[z.kod];
      console.log(`  ${z.kod} ${z.zkratka}: index ${i.index.toFixed(4)} · faktor ${i.faktor.toFixed(4)} · náklady ${h.naklady_na_pojistence_kc?.hodnota} → ${h.naklady_na_pojistence_std_kc?.hodnota} · prevence ${h.fond_prevence_na_pojistence_kc?.hodnota} → ${h.fond_prevence_na_pojistence_std_kc?.hodnota}`);
    }
  } catch (e) { console.error('✗ transform_pojistovny_index_prerozdeleni:', e.message); process.exit(1); }
}
