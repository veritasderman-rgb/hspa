// Přerozdělení pojistného: výběr vs. výsledek po pojišťovnách (balíček A1.2 plánu PLAN-SROVNAVAC-ANALYTIK.md).
//
// Spouštěj:  node ingest/transform_pojistovny_prerozdeleni.js
//            (nezávislé na ostatních transformech; zapojení do `npm run` je třída C, balíček A1.6)
//
// Vstupy:
//   ingest/manual/pojistovny/prerozdeleni-mz-vyber.json        100% výběr 2019→ (tis. Kč/měsíc) + doplnek_po_prerozdeleni 2019–2021
//   ingest/manual/pojistovny/prerozdeleni-mz-pojistovna.json   částka po přerozdělení 2022→ (tis. Kč/měsíc)
//   data/pojistovny.json                                       jen zkratky
//   data/pojistovny-hospodareni-rady.json                      (volitelný, balíček A1.1) jen pojistenci_prumer
//   data/pojistovny-kmen-mesicni.json                          (volitelný) záloha pro průměrný počet pojištěnců
// Výstup: data/pojistovny-prerozdeleni.json (idempotentní: beze změny vstupu se soubor nepřepíše).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePrerozdeleni } from './lib/validate-prerozdeleni.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const OUT_PATH = path.join(ROOT, 'data', 'pojistovny-prerozdeleni.json');
export const VYBER_PATH = path.join(__dirname, 'manual', 'pojistovny', 'prerozdeleni-mz-vyber.json');
export const POJISTOVNA_PATH = path.join(__dirname, 'manual', 'pojistovny', 'prerozdeleni-mz-pojistovna.json');
export const P_PATH = path.join(ROOT, 'data', 'pojistovny.json');
export const RADY_PATH = path.join(ROOT, 'data', 'pojistovny-hospodareni-rady.json');
export const KMEN_PATH = path.join(ROOT, 'data', 'pojistovny-kmen-mesicni.json');

export const KODY = ['111', '201', '205', '207', '209', '211', '213'];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, d) => { const k = 10 ** d; return Math.round(v * k) / k; };
const mm = (n) => String(n).padStart(2, '0');
const sum = (a) => a.reduce((x, y) => x + y, 0);

/** Řada měsíců „RRRR-MM“ ze struktury roky[rok][kod][] (délka roku = délka řady '111'). */
export function mesiceZRoku(roky) {
  const out = [];
  for (const rok of Object.keys(roky).sort()) {
    const n = roky[rok]?.['111']?.length;
    if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error(`prerozdeleni: rok ${rok} nemá platnou řadu '111'`);
    for (let m = 1; m <= n; m++) out.push(`${rok}-${mm(m)}`);
  }
  return out;
}

/** Hodnota řady `kod` v měsíci „RRRR-MM“ ze zdrojů (první, který ji má), jinak null. */
function hodnota(zdroje, kod, mesic) {
  const [rok, m] = mesic.split('-');
  for (const z of zdroje) {
    const v = z?.[rok]?.[kod]?.[Number(m) - 1];
    if (isNum(v)) return v;
  }
  return null;
}

/** Hodnota z A1.1 (obálka {hodnota}) nebo null: rady[ukazatel][rok]. */
function zRady(zpRady, ukazatel, rok) {
  const v = zpRady?.rady?.[ukazatel]?.[String(rok)];
  const h = v && typeof v === 'object' ? v.hodnota : v;
  return isNum(h) ? h : null;
}

/**
 * Roční agregace jedné řady (pojišťovna nebo celkem). `koef` = Σ po přerozdělení / Σ vybráno všech 7 ZP za rok
 * (jen pro pojišťovny; pro celkem null). Relativní saldo = po − vybráno × koef (aritmetická identita, ne odhad).
 */
function rocneRadu({ mesice, vybrano, po_prerozdeleni: po, rozdil, pojistenci, koef = null, slozky = null }) {
  const out = {};
  const roky = [...new Set(mesice.map((m) => m.slice(0, 4)))];
  for (const rok of roky) {
    const idx = mesice.map((m, i) => (m.startsWith(rok) ? i : -1)).filter((i) => i >= 0);
    const uplny = idx.length === 12 && idx.every((i) => isNum(vybrano[i]) && isNum(po[i]));
    const r = {
      vybrano_mld: null, po_prerozdeleni_mld: null, rozdil_mld: null,
      okno_vyberu: null,
      saldo_relativni_mld: null, saldo_relativni_pct_vybraneho: null,
      slozka_rizikova_mld: null, slozka_platcova_mld: null,
      pojistenci_prumer: null, pojistenci_zdroj: null,
      vybrano_na_pojistence_kc: null, po_prerozdeleni_na_pojistence_kc: null,
      rozdil_na_pojistence_kc: null, saldo_relativni_na_pojistence_kc: null, mesicu: idx.length,
    };
    if (uplny) {
      r.okno_vyberu = `12/${Number(rok) - 1}–11/${rok}`;
      r.vybrano_mld = round(sum(idx.map((i) => vybrano[i])) / 1e6, 3);
      r.po_prerozdeleni_mld = round(sum(idx.map((i) => po[i])) / 1e6, 3);
      r.rozdil_mld = round(r.po_prerozdeleni_mld - r.vybrano_mld, 3);
      const k = koef?.(rok);
      if (isNum(k)) {
        r.saldo_relativni_mld = round((sum(idx.map((i) => po[i])) - sum(idx.map((i) => vybrano[i])) * k) / 1e6, 4);
        r.saldo_relativni_pct_vybraneho = round((r.saldo_relativni_mld / r.vybrano_mld) * 100, 2);
      }
      const pj = pojistenci?.(rok);
      if (pj) { r.pojistenci_prumer = pj.hodnota; r.pojistenci_zdroj = pj.zdroj; }
      if (r.pojistenci_prumer) {
        r.rozdil_na_pojistence_kc = Math.round((r.rozdil_mld * 1e9) / r.pojistenci_prumer);
        r.vybrano_na_pojistence_kc = Math.round((r.vybrano_mld * 1e9) / r.pojistenci_prumer);
        r.po_prerozdeleni_na_pojistence_kc = Math.round((r.po_prerozdeleni_mld * 1e9) / r.pojistenci_prumer);
        if (r.saldo_relativni_mld !== null) r.saldo_relativni_na_pojistence_kc = Math.round((r.saldo_relativni_mld * 1e9) / r.pojistenci_prumer);
      }
    }
    const sl = uplny && slozky?.(rok, r);
    if (sl) { r.slozka_rizikova_mld = sl.rizikova; r.slozka_platcova_mld = sl.platcova; }
    out[rok] = r;
  }
  return out;
}

/**
 * Čistá funkce: sestaví dataset (bez generated_at).
 * @param {{vyber:object, pojistovna:object, zkratky:Record<string,string>, rady?:object|null, kmen?:object|null}} v
 */
export function sestavPrerozdeleni({ vyber, pojistovna, zkratky, rady = null, kmen = null }) {
  const rV = vyber?.roky;
  if (!rV) throw new Error('prerozdeleni: chybí roky ve výběru');
  const mesice = mesiceZRoku(rV);
  const zdrojePo = [pojistovna?.roky, vyber?.doplnek_po_prerozdeleni?.roky];

  const radaPoZP = (kod) => ({
    vybrano: mesice.map((m) => hodnota([rV], kod, m)),
    po_prerozdeleni: mesice.map((m) => hodnota(zdrojePo, kod, m)),
  });
  const rozdilRada = (r) => r.vybrano.map((v, i) => (isNum(v) && isNum(r.po_prerozdeleni[i]) ? r.po_prerozdeleni[i] - v : null));

  // průměrný počet pojištěnců: A1.1 (Hodnocení MZ), jinak průměr 12 měsíců z měsíčního kmene
  const kmenZP = (kod) => kmen?.pojistovny?.find((z) => z.kod === kod);
  const pojistenciFn = (kod) => (rok) => {
    const h = zRady(rady?.pojistovny?.find((z) => String(z.kod) === kod), 'pojistenci_prumer', rok);
    if (h) return { hodnota: Math.round(h), zdroj: 'hospodareni-rady' };
    const km = kmen?.mesice && kmenZP(kod)?.pocty;
    if (km) {
      const ix = kmen.mesice.map((m, i) => (m.startsWith(rok) ? i : -1)).filter((i) => i >= 0);
      if (ix.length === 12 && ix.every((i) => isNum(km[i]))) return { hodnota: Math.round(sum(ix.map((i) => km[i])) / 12), zdroj: 'kmen-mesicni' };
    }
    return null;
  };

  const zpRadky = KODY.map((kod) => {
    const r = radaPoZP(kod);
    return { kod, zkratka: zkratky[kod] ?? kod, ...r, rozdil: rozdilRada(r) };
  });
  const roky = [...new Set(mesice.map((m) => m.slice(0, 4)))];
  const idxRoku = (rok) => mesice.map((m, i) => (m.startsWith(rok) ? i : -1)).filter((i) => i >= 0);
  const vsechnyNumRok = (rok) => { const ix = idxRoku(rok); return ix.length === 12 && zpRadky.every((z) => ix.every((i) => isNum(z.vybrano[i]) && isNum(z.po_prerozdeleni[i]))); };
  // koeficient roku: Σ po / Σ vybráno přes 7 ZP a 12 měsíců
  const koefRoku = (rok) => {
    if (!vsechnyNumRok(rok)) return null;
    const ix = idxRoku(rok);
    return sum(zpRadky.map((z) => sum(ix.map((i) => z.po_prerozdeleni[i])))) / sum(zpRadky.map((z) => sum(ix.map((i) => z.vybrano[i]))));
  };
  // rozklad relativního salda identitou (jen když mají pojistenci_prumer všechny ZP):
  //   riziková = po − n/N × ΣP (odchylka od rovného dílu na hlavu), plátcová = n/N × ΣP − vybráno × ΣP/ΣV
  const slozkyRoku = (kod) => (rok, r) => {
    const pj = KODY.map((k) => pojistenciFn(k)(rok));
    if (!pj.every(Boolean)) return null;
    const ix = idxRoku(rok);
    const SP = sum(zpRadky.map((z) => sum(ix.map((i) => z.po_prerozdeleni[i])))) / 1e6;
    const SV = sum(zpRadky.map((z) => sum(ix.map((i) => z.vybrano[i])))) / 1e6;
    const podil = pj[KODY.indexOf(kod)].hodnota / sum(pj.map((x) => x.hodnota));
    const z = zpRadky.find((x) => x.kod === kod);
    const P = sum(ix.map((i) => z.po_prerozdeleni[i])) / 1e6;   // nezaokrouhleně, ať se složky sečtou na saldo
    const V = sum(ix.map((i) => z.vybrano[i])) / 1e6;
    return { rizikova: round(P - podil * SP, 4), platcova: round(podil * SP - V * (SP / SV), 4) };
  };
  // měsíční relativní rozdíl (tis. Kč): po − vybráno × (Σ po / Σ vybráno přes 7 ZP v témže měsíci)
  const koefMesice = mesice.map((_, i) => {
    if (!zpRadky.every((z) => isNum(z.vybrano[i]) && isNum(z.po_prerozdeleni[i]))) return null;
    return sum(zpRadky.map((z) => z.po_prerozdeleni[i])) / sum(zpRadky.map((z) => z.vybrano[i]));
  });
  const zp = zpRadky.map((z) => ({
    ...z,
    rozdil_relativni: z.vybrano.map((v, i) => (koefMesice[i] !== null && isNum(v) ? round(z.po_prerozdeleni[i] - v * koefMesice[i], 1) : null)),
    rocne: rocneRadu({ mesice, ...z, pojistenci: pojistenciFn(z.kod), koef: koefRoku, slozky: slozkyRoku(z.kod) }),
  }));

  // celkem (řádek „Celkem zdravotní pojišťovny“ z MZ)
  const rc = radaPoZP('celkem');
  const celkemRozdil = rozdilRada(rc);
  const celkem = {
    ...rc, rozdil: celkemRozdil,
    rocne: rocneRadu({
      mesice, ...rc, rozdil: celkemRozdil,
      pojistenci: (rok) => { const v = zp.map((z) => z.rocne[rok].pojistenci_prumer); return v.every(isNum) ? { hodnota: sum(v), zdroj: zp[0].rocne[rok].pojistenci_zdroj } : null; },
    }),
  };

  const rokyRocni = roky.filter((y) => idxRoku(y).length === 12 && zp.every((z) => isNum(z.rocne[y].vybrano_mld)));

  const zdrojV = vyber.zdroj ?? {};
  const zdrojP = pojistovna.zdroj ?? {};
  return {
    version: '1.0',
    _doc: [
      'Přerozdělení pojistného na veřejné zdravotní pojištění po sedmi zdravotních pojišťovnách: kolik pojišťovna vybrala (tzv. 100% výběr) a kolik jí po přerozdělení MZ připadlo. Měsíčně (tis. Kč) od ledna 2019, po letech (mld. Kč) jen za roky s 12 měsíci.\nČasová osa: mesice[] jsou měsíce přerozdělení tak, jak je označuje MZ (sloupec „1/2024“). Sloupec obsahuje výběr za PŘEDCHOZÍ kalendářní měsíc (pojišťovna podle § 21 odst. 1 písm. c) a § 21b odst. 1 zákona č. 592/1992 Sb. sděluje výši pojistného vybraného za předchozí kalendářní měsíc), a tutéž částku po přerozdělení. Roční řádek rocne[rok] je proto okno výběru 12/(rok−1)–11/rok (pole okno_vyberu). Důkaz: součet sloupců 2/Y až 1/Y+1 odpovídá „výběru“ v Tab. 1 Hodnocení MZ (oddíl B, hotovostní) na desetiny procenta (2024: 342,559 vs 342,591 mld. Kč); validátor to hlídá. Identita salda tím není dotčená, obě strany mají stejný základ.',
      '100% výběr: podle § 20–21a zákona č. 592/1992 Sb. se veškeré pojistné vybrané pojišťovnami (včetně části paušálních záloh připadající na pojistné) spolu s platbou státu za státní pojištěnce (§ 7 zákona č. 48/1997 Sb.) a úroky ze zvláštního účtu shromáždí na zvláštním účtu přerozdělování a MZ ho každý měsíc rozdělí mezi pojišťovny podle počtu pojištěnců, jejich věku a pohlaví (nákladové indexy), farmaceuticko-nákladových skupin (PCG) a samostatně vypořádaných nákladných služeb. Pojistné, které pojišťovna vybere, tedy není její příjem; příjmem je částka po přerozdělení.',
      'rozdil = po_prerozdeleni − vybrano (hrubý rozdíl). Zahrnuje i to, co do přerozdělování přišlo zvenčí: platbu státu, paušální daň a úroky. Součet rozdílů všech sedmi pojišťoven proto není nula, ale odpovídá těmto vnějším příjmům (2024: zhruba 155,6 mld. Kč; podle Hodnocení MZ platba státu 151,5 mld. a paušální daň 4,1 mld.). Tab. 1c Hodnocení MZ („vliv přerozdělování“) je téměř totéž číslo jako tento rozdíl (VZP 2024: 103,378 mld. v Hodnocení vs. 103,373 mld. zde), ne platba státu; 1c odpovídá do ±0,2 % (jiné časové okno, viz posun měsíců).',
      'saldo_relativni_mld = po_prerozdeleni − vybrano × (Σ po_prerozdeleni všech sedmi ZP / Σ vybrano všech sedmi ZP), za rok z ročních součtů; rozdil_relativni[] je totéž po měsících (tis. Kč, podíl se počítá v témže měsíci). Je to aritmetická identita, ne odhad: o kolik pojišťovna dostala víc nebo míň, než kdyby se celý objem po přerozdělení (vybrané pojistné + platba státu + paušální daň + úroky) rozdělil v poměru jejího podílu na vybraném pojistném. Součet přes sedm pojišťoven je z konstrukce nula. saldo_relativni_pct_vybraneho je saldo v % jejího vybraného pojistného; saldo_relativni_na_pojistence_kc je saldo na pojištěnce a rok (jen kde je pojistenci_prumer).',
      'Čisté saldo vůči platbě státu (po − vybrano − platba státu na pojišťovnu) z veřejných dat spočítat nejde: platba státu jde na zvláštní účet přerozdělování, ne na konkrétní pojišťovnu, a MZ ji po pojišťovnách nezveřejňuje. Odhad podle počtu státních pojištěnců se záměrně nepoužívá (byl by to odhad, ne zveřejněný údaj).',
      'Je to fakt zákonem daného mechanismu (nejde o hodnocení pojišťoven): kladné saldo znamená, že pojišťovna dostala víc, než by odpovídalo jejímu podílu na vybraném pojistném, záporné méně; mechanismus tak vyrovnává rozdíly ve složení kmene a výši příjmů plátců pojistného. Řazeno podle kódu pojišťovny.',
      'pojistenci_prumer: průměrný počet pojištěnců za rok z Hodnocení MZ (pojistovny-hospodareni-rady.json, pojistenci_zdroj „hospodareni-rady“), jinak průměr 12 měsíců z odvozeného měsíčního kmene (pojistovny-kmen-mesicni.json, „kmen-mesicni“; kmen začíná v lednu 2022), jinak null.',
      'Roky 2019–2021 ve výsledné částce po přerozdělení jsou z prerozdeleni-mz-vyber.json (doplnek_po_prerozdeleni), roky od 2022 z prerozdeleni-mz-pojistovna.json. Neúplný rok (mesicu < 12) má roční hodnoty null; posledni_rok_rocni je poslední rok s 12 měsíci. Mimořádné položky (vyúčtování nákladných služeb v srpnu, předsunutá platba, mimořádné přerozdělování 6/2026 aj.) jsou v měsíčních hodnotách obsaženy, v MZ PDF jsou popsány na druhé straně.',
      'Složky relativního salda (jen kde jsou pojistenci_prumer všech sedmi ZP; identita, nic se neodhaduje): slozka_rizikova_mld = po_prerozdeleni − n/N × ΣP (odchylka částky po přerozdělení od rovného dílu na hlavu; n = pojištěnci ZP, N = Σ pojištěnci 7 ZP, ΣP = Σ po přerozdělení) a slozka_platcova_mld = n/N × ΣP − vybrano × ΣP/ΣV (rozdíl mezi rovným dílem na hlavu a dílem podle vybraného pojistného). Součet obou složek je saldo_relativni_mld. Kladné saldo RBP a ČPZP tak nevzniká starším kmenem (částka po přerozdělení na pojištěnce je u nich pod průměrem), ale nižším výběrem na pojištěnce; záporné saldo ZPŠ je téměř celé plátcové (vysoký výběr na pojištěnce). vybrano_na_pojistence_kc a po_prerozdeleni_na_pojistence_kc jsou roční částky na průměrného pojištěnce.',
    ].join('\n'),
    zdroj: {
      stazeno_at: zdrojV.stazeno_at ?? zdrojV.overeno ?? null,
      vyber: { nazev: zdrojV.nazev ?? null, url: zdrojV.url ?? null, soubory: zdrojV.soubory ?? [], overeno: zdrojV.overeno ?? null },
      po_prerozdeleni: { nazev: zdrojP.nazev ?? null, url: zdrojP.url ?? null, soubory: [...new Set([...(vyber.doplnek_po_prerozdeleni?.zdroj?.soubory ?? []), ...(zdrojP.soubory ?? [])])], overeno: zdrojP.overeno ?? null },
      pocet_pojistencu: 'data/pojistovny-hospodareni-rady.json (A1.1, MZ Hodnocení), jinak data/pojistovny-kmen-mesicni.json',
      vstupy: ['ingest/manual/pojistovny/prerozdeleni-mz-vyber.json', 'ingest/manual/pojistovny/prerozdeleni-mz-pojistovna.json'],
    },
    mesice,
    pojistovny: zp,
    celkem,
    posledni_rok_rocni: rokyRocni.length ? Number(rokyRocni[rokyRocni.length - 1]) : null,
    posledni_mesic: mesice[mesice.length - 1],
  };
}

/** Čitelná serializace: pole čísel a ploché objekty na jednom řádku. */
export function serializuj(obj) {
  const s = JSON.stringify(obj, null, 2);
  const prim = '(?:-?\\d+(?:\\.\\d+)?|null|"[^"\\n]*")';
  const pole = new RegExp(`\\[\\s*${prim}(?:,\\s*${prim})*\\s*\\]`, 'g');
  const objekt = new RegExp(`\\{\\s*"[^"\\n]+": ${prim}(?:,\\s*"[^"\\n]+": ${prim})*\\s*\\}`, 'g');
  const sbal = (m) => m.replace(/\s*\n\s*/g, ' ').replace(/^([[{]) /, '$1').replace(/ ([\]}])$/, '$1');
  return `${s.replace(pole, sbal).replace(objekt, sbal)}\n`;
}

const bezGenerated = (o) => { const c = structuredClone(o); delete c.generated_at; return c; };
const cti = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

export function run({ out = OUT_PATH, zapis = true, vstupy = {} } = {}) {
  const vyber = vstupy.vyber ?? cti(VYBER_PATH);
  const pojistovna = vstupy.pojistovna ?? cti(POJISTOVNA_PATH);
  const P = vstupy.P ?? cti(P_PATH);
  if (!vyber || !pojistovna) throw new Error('chybí prerozdeleni-mz-vyber.json nebo prerozdeleni-mz-pojistovna.json');
  const rady = 'rady' in vstupy ? vstupy.rady : cti(RADY_PATH);
  const kmen = 'kmen' in vstupy ? vstupy.kmen : cti(KMEN_PATH);
  const zkratky = Object.fromEntries((P?.pojistovny ?? []).map((z) => [String(z.kod), z.zkratka]));
  const data = sestavPrerozdeleni({ vyber, pojistovna, zkratky, rady, kmen });
  const v = validatePrerozdeleni(data, { rady });
  if (v.errors.length) throw new Error(`validatePrerozdeleni: ${v.errors.slice(0, 8).join(' | ')}`);
  const predchozi = cti(out);
  const zmeneno = !predchozi || JSON.stringify(bezGenerated(predchozi)) !== JSON.stringify(data);
  const hotovo = { version: data.version, generated_at: zmeneno ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') : predchozi.generated_at, ...data };
  if (zmeneno && zapis) fs.writeFileSync(out, serializuj(hotovo), 'utf8');
  return { zmeneno, data: hotovo, warnings: v.warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    const d = r.data;
    console.log(`✓ transform_pojistovny_prerozdeleni: ${d.mesice[0]} až ${d.posledni_mesic} (${d.mesice.length} měsíců)${r.zmeneno ? '' : ' — beze změny'}; poslední celý rok: ${d.posledni_rok_rocni}`);
    for (const z of d.pojistovny) { const y = z.rocne['2024']; console.log(`  ${z.kod} ${z.zkratka}: 2024 vybráno ${y.vybrano_mld} mld, po přerozdělení ${y.po_prerozdeleni_mld} mld, rozdíl ${y.rozdil_mld} mld, relativní saldo ${y.saldo_relativni_mld} mld (${y.saldo_relativni_pct_vybraneho} %)`); }
    for (const wn of r.warnings) console.warn(`  ! ${wn}`);
  } catch (e) { console.error('✗ transform_pojistovny_prerozdeleni:', e.message); process.exit(1); }
}
