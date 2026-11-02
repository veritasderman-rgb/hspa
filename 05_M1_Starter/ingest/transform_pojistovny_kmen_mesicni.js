// Měsíční kmen pojišťoven odvozený z měsíčního přerozdělení pojistného MZ — metodika § 4.3.
//
// Spouštěj:  node ingest/transform_pojistovny_kmen_mesicni.js
//            (nezávislé na ostatních transformech; zapojení do `npm run` je třída C)
//
// Proč: měsíční počty pojištěnců po pojišťovnách MZ nepublikuje, ale publikuje dvě tabulky se
// stejnými řádky: (a) výslednou částku po přerozdělení na POJIŠŤOVNU (tis. Kč) a (b) výslednou částku
// po přerozdělení na jednoho POJIŠTĚNCE (Kč). Obě částky obsahují tytéž mimořádné položky
// (vyúčtování nákladných služeb, opravy chybných údajů, předsunutá platba, mimořádné přerozdělování),
// takže podíl je čistý a z něj vyjde počet pojištěnců, ze kterého MZ přerozdělení daného měsíce počítá.
//
//   počet pojištěnců (ZP, měsíc) = částka na pojišťovnu [tis. Kč] × 1000 / částka na pojištěnce [Kč]
//
// Přesnost: částka na pojištěnce je v PDF zaokrouhlená na celé Kč (≈ 3 000–6 000 Kč), tj. chyba do ±0,02 %
// (u 2026/6 s vyššími částkami méně); částka na pojišťovnu je v tis. Kč, tj. řádově bez chyby. Ověřeno
// proti průměrnému počtu pojištěnců 2024 podle MZ (data/pojistovny.json → hospodareni.pocet_pojistencu):
// odchylka ±0,1 % u všech sedmi ZP (tests/pojistovny-kmen-mesicni.test.js).
// Počet je ODVOZENÁ hodnota, MZ ho takto přímo nezveřejňuje.
//
// Vstupy:
//   ingest/manual/pojistovny/prerozdeleni-mz-pojistovna.json   tis. Kč na pojišťovnu, roky → kódy → pole měsíců
//   ingest/manual/pojistovny/prerozdeleni-mz.json              Kč na pojištěnce, stejná struktura
//   data/pojistovny.json                                       jen zkratky pojišťoven
// Výstup: data/pojistovny-kmen-mesicni.json
//   {version, generated_at, _doc, zdroj, mesice[], pojistovny[{kod, zkratka, pocty[], index_2022_01[]}],
//    celkem{pocty[], index_2022_01[]}, prestupy{terminy[], pojistovny[], celkem}}
//
// Přestupy: změna počtu mezi prosincem a lednem (přestupový termín 1. 1.) a mezi červnem a červencem
// (1. 7.), rok po roce, v absolutních počtech i v %. Je to čistá změna kmene v daném měsíci, ne hrubé
// toky: zahrnuje i narození, úmrtí, stěhování z a do ČR a opravy registru (zdroj to nerozlišuje).
// Chybějící hodnota (null) se nedomýšlí: počet, index i přestupy zůstanou null.
// Idempotentní: stejný vstup = beze změny souboru (generated_at se nemění).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const OUT_PATH = path.join(ROOT, 'data', 'pojistovny-kmen-mesicni.json');
export const POJISTOVNA_PATH = path.join(__dirname, 'manual', 'pojistovny', 'prerozdeleni-mz-pojistovna.json');
export const POJISTENEC_PATH = path.join(__dirname, 'manual', 'pojistovny', 'prerozdeleni-mz.json');
export const P_PATH = path.join(ROOT, 'data', 'pojistovny.json');

export const KODY = ['111', '201', '205', '207', '209', '211', '213'];
export const TERMINY = [
  { termin: '1. 1.', z_mesic: 12, na_mesic: 1, posun_roku: 1 },
  { termin: '1. 7.', z_mesic: 6, na_mesic: 7, posun_roku: 0 },
];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, d) => { const k = 10 ** d; return Math.round(v * k) / k; };
const mm = (n) => String(n).padStart(2, '0');

/** Seznam měsíců „RRRR-MM“ ze struktury roků (rok → kód → pole); délka roku = délka řady '111'. */
export function mesiceZRoku(roky) {
  const out = [];
  for (const rok of Object.keys(roky).sort()) {
    const n = roky[rok]?.['111']?.length;
    if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error(`kmen-mesicni: rok ${rok} nemá platnou řadu '111'`);
    for (let m = 1; m <= n; m++) out.push(`${rok}-${mm(m)}`);
  }
  return out;
}

/** Zřetězí měsíční řady za všechny roky; chybějící/nečíselná hodnota = null. */
function rada(roky, kod) {
  const out = [];
  for (const rok of Object.keys(roky).sort()) {
    const r = roky[rok]?.[kod];
    if (!Array.isArray(r)) throw new Error(`kmen-mesicni: ${rok}/${kod} chybí`);
    for (const v of r) out.push(isNum(v) && v > 0 ? v : null);
  }
  return out;
}

/** Počet pojištěnců = částka na pojišťovnu (tis. Kč) × 1000 / částka na pojištěnce (Kč). */
export function pocetPojistencu(castkaTis, castkaNaPojistence) {
  if (!isNum(castkaTis) || !isNum(castkaNaPojistence) || castkaTis <= 0 || castkaNaPojistence <= 0) return null;
  return Math.round((castkaTis * 1000) / castkaNaPojistence);
}

/** Index vůči prvnímu měsíci řady (= 100), na 2 desetinná místa. */
export function indexRady(pocty) {
  const z = pocty[0];
  return pocty.map((v) => (isNum(v) && isNum(z) && z > 0 ? round((v / z) * 100, 2) : null));
}

/** Změna kmene mezi dvěma měsíci (absolutně a v %); null, když některá hodnota chybí. */
export function zmenaKmene(pred, po) {
  if (!isNum(pred) || !isNum(po) || pred <= 0) return { pred: isNum(pred) ? pred : null, po: isNum(po) ? po : null, zmena: null, zmena_pct: null };
  return { pred, po, zmena: po - pred, zmena_pct: round(((po - pred) / pred) * 100, 2) };
}

/** Přestupové změny jedné řady: pro každý rok a termín (1. 1.: prosinec → leden, 1. 7.: červen → červenec). */
export function prestupyRady(mesice, pocty) {
  const idx = new Map(mesice.map((m, i) => [m, i]));
  const roky = [...new Set(mesice.map((m) => Number(m.slice(0, 4))))].sort((a, b) => a - b);
  const out = [];
  for (const rok of roky) {
    for (const t of TERMINY) {
      const na = `${rok}-${mm(t.na_mesic)}`;
      const z = `${rok - t.posun_roku}-${mm(t.z_mesic)}`;
      if (!idx.has(na) || !idx.has(z)) continue; // před začátkem řady / po jejím konci
      out.push({ rok, termin: t.termin, z, na, ...zmenaKmene(pocty[idx.get(z)], pocty[idx.get(na)]) });
    }
  }
  // chronologicky (podle měsíce „na“)
  return out.sort((a, b) => (a.na < b.na ? -1 : 1));
}

/**
 * Čistá funkce: sestaví dataset (bez generated_at).
 * @param {object} pojistovna prerozdeleni-mz-pojistovna.json (tis. Kč)
 * @param {object} pojistenec prerozdeleni-mz.json (Kč na pojištěnce)
 * @param {Record<string,string>} zkratky kód → zkratka
 */
export function sestavKmenMesicni(pojistovna, pojistenec, zkratky) {
  const rA = pojistovna?.roky;
  const rB = pojistenec?.roky;
  if (!rA || !rB) throw new Error('kmen-mesicni: chybí roky v některém ze vstupů');
  const mesice = mesiceZRoku(rA);
  // pojištěnec musí mít aspoň měsíce pojišťovny (rok 2023–2025 v něm může být delší/stejný, nikdy kratší)
  const mesiceB = new Set(mesiceZRoku(rB));
  for (const m of mesice) if (!mesiceB.has(m)) throw new Error(`kmen-mesicni: měsíc ${m} chybí v prerozdeleni-mz.json`);

  const pocty = (kod) => {
    const a = rada(rA, kod);
    // řada na pojištěnce zarovnaná na měsíce pojišťovny
    const bAll = rada(rB, kod);
    const bIdx = new Map([...mesiceZRoku(rB)].map((m, i) => [m, i]));
    return a.map((v, i) => pocetPojistencu(v, bAll[bIdx.get(mesice[i])]));
  };

  const zp = KODY.map((kod) => {
    const p = pocty(kod);
    return { kod, zkratka: zkratky[kod] ?? kod, pocty: p, index_2022_01: indexRady(p) };
  });
  const celkemP = pocty('celkem');
  const celkem = { pocty: celkemP, index_2022_01: indexRady(celkemP) };

  const prestupy = {
    terminy: TERMINY.map((t) => ({ termin: t.termin, z_mesic: t.z_mesic, na_mesic: t.na_mesic })),
    pojistovny: zp.map((z) => ({ kod: z.kod, zkratka: z.zkratka, zmeny: prestupyRady(mesice, z.pocty) })),
    celkem: { zmeny: prestupyRady(mesice, celkem.pocty) },
  };

  const zdrojA = pojistovna.zdroj ?? {};
  const zdrojB = pojistenec.zdroj ?? {};
  return {
    version: '1.0',
    _doc: 'Měsíční počet pojištěnců sedmi zdravotních pojišťoven, ODVOZENÝ z měsíčního přerozdělení pojistného MZ: počet = částka na pojišťovnu (tis. Kč) × 1000 / částka na jednoho pojištěnce (Kč). MZ počet takto přímo nepublikuje. Obě částky obsahují tytéž mimořádné položky (vyúčtování nákladných služeb, předsunutá platba 4/2026, mimořádné přerozdělování 6/2026 aj.), podíl je proto čistý; zbývá chyba zaokrouhlení částky na pojištěnce (celé Kč, do ±0,02 %). Průměr 12 měsíců 2024 se shoduje s průměrným počtem pojištěnců podle MZ (data/pojistovny.json) na ±0,1 %. Index: leden 2022 = 100. Přestupy: změna počtu mezi prosincem a lednem (termín 1. 1.) a mezi červnem a červencem (termín 1. 7.) — čistá změna kmene, ne hrubé toky (zahrnuje i narození, úmrtí, stěhování a opravy registru). Údaje MZ obsahují jen stav, ne důvod změny. Řazeno podle kódu pojišťovny, nejde o hodnocení.',
    zdroj: {
      nazev: 'MZ ČR · Přerozdělování pojistného na veřejné zdravotní pojištění · částka na pojišťovnu a na jednoho pojištěnce (odvozeno podílem)',
      url: zdrojA.url ?? zdrojB.url ?? null,
      soubory: [...(zdrojA.soubory ?? []), ...(zdrojB.soubory ?? [])],
      vstupy: ['ingest/manual/pojistovny/prerozdeleni-mz-pojistovna.json', 'ingest/manual/pojistovny/prerozdeleni-mz.json'],
      overeno: zdrojA.overeno ?? zdrojB.overeno ?? null,
      vzorec: 'pocet = castka_na_pojistovnu_tis_kc * 1000 / castka_na_pojistence_kc',
    },
    mesice,
    pojistovny: zp,
    celkem,
    prestupy,
  };
}

/** Čitelná serializace: pole čísel a ploché objekty (např. jedna přestupová změna) na jednom řádku. */
export function serializuj(obj) {
  const s = JSON.stringify(obj, null, 2);
  const prim = '(?:-?\\d+(?:\\.\\d+)?|null|"[^"\\n]*")';
  const pole = new RegExp(`\\[\\s*${prim}(?:,\\s*${prim})*\\s*\\]`, 'g');
  const objekt = new RegExp(`\\{\\s*"[^"\\n]+": ${prim}(?:,\\s*"[^"\\n]+": ${prim})*\\s*\\}`, 'g');
  const sbal = (m) => m.replace(/\s*\n\s*/g, ' ').replace(/^([[{]) /, '$1').replace(/ ([\]}])$/, '$1');
  return `${s.replace(pole, sbal).replace(objekt, sbal)}\n`;
}

const bezGenerated = (o) => { const c = structuredClone(o); delete c.generated_at; return c; };

export function run({ out = OUT_PATH, zapis = true } = {}) {
  const A = JSON.parse(fs.readFileSync(POJISTOVNA_PATH, 'utf8'));
  const B = JSON.parse(fs.readFileSync(POJISTENEC_PATH, 'utf8'));
  const P = JSON.parse(fs.readFileSync(P_PATH, 'utf8'));
  const zkratky = Object.fromEntries((P.pojistovny ?? []).map((z) => [String(z.kod), z.zkratka]));
  const data = sestavKmenMesicni(A, B, zkratky);
  let predchozi = null;
  try { predchozi = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (_) { /* soubor ještě není */ }
  const zmeneno = !predchozi || JSON.stringify(bezGenerated(predchozi)) !== JSON.stringify(data);
  const hotovo = { version: data.version, generated_at: zmeneno ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') : predchozi.generated_at, ...data };
  if (zmeneno && zapis) fs.writeFileSync(out, serializuj(hotovo), 'utf8');
  return { zmeneno, data: hotovo };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    const d = r.data;
    console.log(`✓ transform_pojistovny_kmen_mesicni: ${d.mesice[0]} až ${d.mesice[d.mesice.length - 1]} (${d.mesice.length} měsíců)${r.zmeneno ? '' : ' — beze změny'}`);
    for (const z of d.pojistovny) console.log(`  ${z.kod} ${z.zkratka}: ${z.pocty[0]} → ${z.pocty[z.pocty.length - 1]}`);
  } catch (e) { console.error('✗ transform_pojistovny_kmen_mesicni:', e.message); process.exit(1); }
}
