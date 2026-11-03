// Bilance fondu prevence sedmi zdravotních pojišťoven z výročních zpráv — balíček A7.1 (c) a A7.2 (PLAN-SROVNAVAC-ANALYTIK.md).
//
// Spouštěj:  node ingest/transform_pojistovny_fond_bilance.js
// Vstup: ingest/manual/pojistovny/vz-text/<kod>-<rokVZ>.txt (přepisy VZ; oddíl „Fond prevence“ podle šablony MZ, příloha č. 7:
//        A. Tvorba a čerpání, B. Příjmy a výdaje bankovního účtu). Výstup: data/pojistovny-fond-bilance.json.
// Idempotentní: stejný vstup = beze změny souboru (generated_at se nemění). Na konci běží validateFondBilance (chyby = exit 1).
//
// Parser čte sloupec „Skutečnost“ (u řádku se dvěma čísly druhé číslo, procento se zahodí) a u každé hodnoty si pamatuje
// číslo řádku přepisu. Co VZ neuvádí, je null s důvodem v `poznamky`; nic se nedopočítává kromě `tvorba.ostatni`
// (= celkem − převod ze ZFZP − pokuty a penále; obálka nese `odvozeno: true`).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateFondBilance } from './lib/validate-fond-bilance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const VZ_DIR = path.join(__dirname, 'manual', 'pojistovny', 'vz-text');
export const OUT_PATH = path.join(ROOT, 'data', 'pojistovny-fond-bilance.json');
export const KODY = ['111', '201', '205', '207', '209', '211', '213'];
export const ROKY = [2022, 2023, 2024, 2025];
/** Datum, ke kterému jsou přepisy VZ v repu zpracované (mění se ručně při doplnění nové VZ). */
export const STAV_K = '2026-11-03';

// ---------------------------------------------------------------------------------- parser tabulek

const NUM = /^(?:-?\d{1,3}(?: \d{3})*|-?\d+)(?:,\d+)?$|^[–-]$/;
const toNum = (s) => (/^[–-]$/.test(s) ? 0 : Number(s.replace(/ /g, '').replace(',', '.')));

/** Číselné kousky na konci řádku (oddělené ≥ 2 mezerami), v textové podobě. */
function trailing(line) {
  const pieces = line.trim().split(/\s{2,}/);
  const out = [];
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (NUM.test(pieces[i])) out.unshift(pieces[i]); else break;
  }
  return { out, pieces };
}

/**
 * Z jedné tabulky (A nebo B) od řádku `start` (index) přečte řádky podle číslování šablony MZ: I., II., III., IV. a podřádky
 * `II.1`, `II.1.2.1`, `III.1` … (podřádky 1–9 patří k posledně viděnému římskému řádku). Řádky, jejichž čísla jsou na
 * navazujícím řádku (popisek přes dva řádky), se spárují s posledním číslem bez hodnot.
 * @returns {Record<string,{hodnota:number, radek:number, radekText:string}>} hodnota = sloupec „Skutečnost“
 */
export function parseTabulku(lines, start) {
  const rows = {};
  let pending = null; let pendLine = -1; let ctx = 'II';
  for (let i = start; i < Math.min(lines.length, start + 80); i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    const m = /^\s*(IV|III|II|I)\.(?:\s|$)|^\s*(\d(?:\.\d){0,2})\s+(?=\S)/.exec(l);
    let id = m ? (m[1] || m[2]) : null;
    if (id && /^(I|II|III|IV)$/.test(id)) ctx = id; else if (id && /^\d$/.test(id)) id = `${ctx}.${id}`;
    const { out, pieces } = trailing(l);
    let vals = null;
    if (out.length) {
      const o = [...out];
      if (id && /\d$/.test(id) && pieces[0] === id.replace(/^[IV]+\./, '') && out.length === pieces.length) o.shift(); // číslo řádku samo
      if (o.length && (/,\d/.test(o[o.length - 1]) || /^[–-]$/.test(o[o.length - 1]))) o.pop(); // procento plnění
      vals = o.map(toNum);
    }
    if (id) {
      if (vals?.length) { rows[id] ??= { hodnota: vals[vals.length - 1], radek: i + 1, radekText: l }; pending = null; } else { pending = id; pendLine = i; }
    } else if (vals?.length && pending && i - pendLine <= 4) {
      rows[pending] ??= { hodnota: vals[vals.length - 1], radek: i + 1, radekText: l };
      pending = null;
    }
    if (rows.IV) break;
  }
  return rows;
}

/** Najde v přepisu VZ tabulky A (tvorba a čerpání) a B (příjmy a výdaje) fondu prevence (Fprev). */
export function najdiTabulky(text) {
  const lines = text.split('\n');
  const res = {};
  lines.forEach((l, i) => {
    if (!/Počáteční zůstatek k 1\.\s?1\./.test(l)) return;
    const back = lines.slice(Math.max(0, i - 14), i + 1).join('\n');
    const hdrs = [...back.matchAll(/Fond\s+(\w+)[^\n]*\((\w+)\)/g)];
    if (hdrs.at(-1)?.[2] !== 'Fprev') return;
    const typ = /Příjmy a v\s?ýdaje/.test(back) ? 'B' : 'A';
    if (res[typ]) return;
    const rows = parseTabulku(lines, i);
    if (rows.IV) res[typ] = rows;
  });
  return { lines, ...res };
}

// ---------------------------------------------------------------------------------- počty využití (A7.2)

/**
 * Počty vyplacených příspěvků / žádostí / osob, které VZ uvádí za celý fond. Ručně vedený seznam (ověřený proti přepisu při
 * každém běhu): `re` musí na řádku `radek` najít číslo. Ostatní ZP počty za fond jako celek neuvádějí (viz `NEUVEDENO`).
 */
const VYUZITI = {
  '209': {
    2023: { pole: 'pocet_prispevku', soubor: '209-2023.txt', radek: 1073, hodnota: 76393 },
    2024: { pole: 'pocet_prispevku', soubor: '209-2024.txt', radek: 1016, hodnota: 85266 },
  },
};
const DEFINICE_PRISPEVKY = 'Počet vyplacených příspěvků z fondu prevence za rok podle výroční zprávy ZPŠ (39 programů a aktivit). Není to počet žádostí ani počet osob: jeden pojištěnec může za rok dostat více příspěvků.';
const NEUVEDENO = {
  '111': 'VZ VZP v oddílu o fondu prevence ani v příloze č. 13 (sloupec „Počet účastníků“ je prázdný) neuvádí počet příspěvků, žádostí ani osob.',
  '201': 'VZ VoZP uvádí u fondu jen náklady po programech, ne počet příspěvků, žádostí ani osob.',
  '205': 'VZ ČPZP uvádí u fondu jen náklady po skupinách programů (příloha č. 13), ne počet příspěvků, žádostí ani osob; sloupec „Počet účastníků“ je vyplněn jen u ozdravných pobytů (152 v roce 2024).',
  '207': 'VZ OZP uvádí u fondu jen náklady po programech, ne počet příspěvků, žádostí ani osob; „Počet účastníků“ je vyplněn jen u ozdravných pobytů (143 v roce 2024). Počet 50 579 pojištěnců ve VZ 2024 se týká programu hodnocení kvality lékaře, ne fondu prevence.',
  '209': 'VZ ZPŠ za rok 2025 není k dispozici; VZ 2022 nemáme (uvádí se jen počet z VZ 2023 a 2024).',
  '211': 'VZ ZP MV uvádí u fondu jen vyplacené částky po programech, ne počet příspěvků ani žádostí; „Počet účastníků“ je vyplněn jen u ozdravných pobytů. Počty žádostí ve VZ se týkají žádostí o úhradu péče a o odstranění tvrdosti, ne fondu prevence.',
  '213': 'VZ RBP uvádí počty osob jen po jednotlivých programech (např. vitamíny, očkování, ortodoncie), ne za fond jako celek; programy se překrývají, takže se nesčítají. Viz poznamky_autora.',
};

// ---------------------------------------------------------------------------------- sestavení datasetu

const stripSp = (s) => s.replace(/\s+/g, ' ').trim();
const cell = (hodnota, soubor, radek, radekText, extra = {}) => ({ hodnota, soubor, radek, citace: stripSp(radekText).slice(0, 220), ...extra });

/** Čistá funkce: sestaví dataset (bez generated_at) z načtených přepisů `{ '<kod>-<rok>.txt': text }`. */
export function sestav(texty) {
  const tab = {};
  for (const [f, t] of Object.entries(texty)) {
    const m = /^(\d{3})-(\d{4})\.txt$/.exec(f);
    if (m) tab[`${m[1]}-${m[2]}`] = { soubor: f, ...najdiTabulky(t) };
  }
  const pojistovny = KODY.map((kod) => {
    const roky = {};
    for (const rok of ROKY) {
      const own = tab[`${kod}-${rok}`];
      const prev = tab[`${kod}-${rok - 1}`];
      const next = tab[`${kod}-${rok + 1}`];
      const poznamky = {};
      const r = { tvorba: { ze_zf: null, pokuty_penale: null, ostatni: null, z_pf: null, celkem: null }, cerpani_celkem: null, cerpani_programy: null, zustatek_pocatecni: null, zustatek_konecny: null, bu_zustatek_pocatecni: null, bu_zustatek_konecny: null };
      const z = (tabulka, id, soubor) => { const x = tabulka?.[id]; return x ? cell(x.hodnota, soubor, x.radek, x.radekText) : null; };
      if (own?.A) {
        r.zustatek_pocatecni = z(own.A, 'I', own.soubor);
        r.tvorba.celkem = z(own.A, 'II', own.soubor);
        r.tvorba.ze_zf = z(own.A, '1.2.1', own.soubor);
        r.tvorba.pokuty_penale = z(own.A, '1.2.2', own.soubor);
        r.tvorba.z_pf = z(own.A, '1.2.3', own.soubor);
        r.cerpani_celkem = z(own.A, 'III', own.soubor);
        r.cerpani_programy = z(own.A, 'III.1', own.soubor);
        r.zustatek_konecny = z(own.A, 'IV', own.soubor);
        if (!r.tvorba.ze_zf) poznamky['tvorba.ze_zf'] = 'Řádek 1.2.1 (převod ze ZFZP z pojistného) je v tabulce VZ prázdný.';
        if (!r.tvorba.pokuty_penale) poznamky['tvorba.pokuty_penale'] = 'Řádek 1.2.2 (pokuty, přirážky, penále) je v tabulce VZ prázdný.';
        if (!r.tvorba.z_pf) poznamky['tvorba.z_pf'] = 'Řádek 1.2.3 (převod z provozního fondu) je v tabulce VZ prázdný.';
        if (r.tvorba.celkem) {
          const a = r.tvorba.ze_zf?.hodnota ?? 0; const b = r.tvorba.pokuty_penale?.hodnota ?? 0;
          r.tvorba.ostatni = { hodnota: r.tvorba.celkem.hodnota - a - b, soubor: own.soubor, radek: r.tvorba.celkem.radek, odvozeno: true, poznamka: 'Tvorba celkem − převod ze ZFZP − pokuty a penále; zahrnuje převod z provozního fondu, úroky, dary a u některých ZP zrušení opravných položek (viz z_pf a poznamky_autora).' };
        }
      }
      if (own?.B) {
        r.bu_zustatek_pocatecni = z(own.B, 'I', own.soubor);
        r.bu_zustatek_konecny = z(own.B, 'IV', own.soubor);
      }
      // sousední rok: konečný zůstatek roku = počáteční zůstatek následujícího roku (a naopak)
      if (!r.zustatek_konecny && next?.A) { r.zustatek_konecny = z(next.A, 'I', next.soubor); if (r.zustatek_konecny) r.zustatek_konecny.poznamka = `Počáteční zůstatek k 1. 1. ${rok + 1} z VZ za ${rok + 1}.`; }
      if (!r.bu_zustatek_konecny && next?.B) { r.bu_zustatek_konecny = z(next.B, 'I', next.soubor); if (r.bu_zustatek_konecny) r.bu_zustatek_konecny.poznamka = `Počáteční zůstatek BÚ k 1. 1. ${rok + 1} z VZ za ${rok + 1}.`; }
      if (!r.zustatek_pocatecni && prev?.A) { r.zustatek_pocatecni = z(prev.A, 'IV', prev.soubor); if (r.zustatek_pocatecni) r.zustatek_pocatecni.poznamka = `Konečný zůstatek k 31. 12. ${rok - 1} z VZ za ${rok - 1}.`; }
      if (!r.bu_zustatek_pocatecni && prev?.B) { r.bu_zustatek_pocatecni = z(prev.B, 'IV', prev.soubor); if (r.bu_zustatek_pocatecni) r.bu_zustatek_pocatecni.poznamka = `Konečný zůstatek BÚ k 31. 12. ${rok - 1} z VZ za ${rok - 1}.`; }
      if (!own) {
        const duvod = `VZ za rok ${rok} není v ingest/manual/pojistovny/vz-text (${kod}-${rok}.txt); tvorba a čerpání se z jiných VZ nedají zjistit.`;
        for (const k of ['tvorba.celkem', 'tvorba.ze_zf', 'tvorba.pokuty_penale', 'tvorba.ostatni', 'tvorba.z_pf', 'cerpani_celkem', 'cerpani_programy']) poznamky[k] = duvod;
      }
      for (const k of ['zustatek_pocatecni', 'zustatek_konecny', 'bu_zustatek_pocatecni', 'bu_zustatek_konecny']) {
        if (!r[k]) poznamky[k] = `Zůstatek nelze zjistit: ${own ? 'VZ' : `VZ za rok ${rok} ani sousední VZ`} ${!own || !prev && !next ? 'nemáme k dispozici' : 'ho neuvádí'}.`;
      }
      // využití (A7.2)
      const v = VYUZITI[kod]?.[rok];
      const vyuziti = { pocet_prispevku: null, pocet_zadosti: null, pocet_osob: null, definice: null };
      if (v) {
        const text = texty[v.soubor].split('\n')[v.radek - 1] ?? '';
        vyuziti[v.pole] = cell(v.hodnota, v.soubor, v.radek, text);
        vyuziti.definice = DEFINICE_PRISPEVKY;
      } else {
        poznamky.vyuziti = NEUVEDENO[kod];
      }
      roky[String(rok)] = { ...r, vyuziti, poznamky };
    }
    return { kod, zkratka: ZKRATKY[kod], roky, poznamky_autora: POZNAMKY[kod] ?? [] };
  });
  const soubory = Object.keys(tab).sort().map((k) => ({ soubor: tab[k].soubor, sha256: crypto.createHash('sha256').update(texty[tab[k].soubor]).digest('hex') }));
  return {
    version: '1.0',
    stav_k: STAV_K,
    _doc: DOC,
    zdroj: {
      nazev: 'Výroční zprávy zdravotních pojišťoven za roky 2023–2025, oddíl „Fond prevence“ a tabulková příloha č. 7 (šablona MZ podle vyhlášky 362/2010 Sb.); přepisy PDF v ingest/manual/pojistovny/vz-text/',
      adresar: 'ingest/manual/pojistovny/vz-text',
      soubory,
    },
    roky: ROKY,
    pojistovny,
  };
}

const ZKRATKY = { 111: 'VZP', 201: 'VoZP', 205: 'ČPZP', 207: 'OZP', 209: 'ZPŠ', 211: 'ZP MV', 213: 'RBP' };

const DOC = [
  'Bilance fondu prevence (Fprev) sedmi zdravotních pojišťoven za roky 2022–2025 z výročních zpráv (VZ). Každá VZ za rok N obsahuje v příloze č. 7 tabulku A („Tvorba a čerpání“, účetně) a B („Příjmy a výdaje“, bankovní účet fondu) ve sloupci „Skutečnost“; zůstatky roku N−1 plynou z počátečního zůstatku VZ za rok N. Všechny částky jsou v tis. Kč, počty v kusech.',
  'Každá hodnota je obálka {hodnota, soubor, radek, citace, poznamka?}: `soubor` = přepis VZ v ingest/manual/pojistovny/vz-text/, `radek` = číslo řádku přepisu, kde je číslo vytištěno, `citace` = text toho řádku (mezery zhuštěné). Co VZ neuvádí nebo co v repu nemáme, je null a důvod je v `roky[rok].poznamky[pole]`.',
  'tvorba.ze_zf = řádek 1.2.1 (převod ze ZFZP – prostředky z pojistného), tvorba.pokuty_penale = řádek 1.2.2 (pokuty, přirážky k pojistnému a penále), tvorba.z_pf = řádek 1.2.3 (převod z provozního fondu; informativně, je obsažen v ostatni), tvorba.celkem = II. Tvorba celkem. tvorba.ostatni je jediná odvozená hodnota (odvozeno: true): celkem − ze_zf − pokuty_penale; u ZP, jejichž tabulka řádek 1.2.1 nevyplňuje, se prázdný řádek bere jako 0. Obsahuje převod z PF, úroky, dary a u ČPZP zrušení opravných položek.',
  'cerpani_celkem = III. Čerpání celkem (účetně; obsahuje i odpisy penále a pokut a tvorbu opravných položek, které s péčí pro pojištěnce nesouvisí), cerpani_programy = III.1 Preventivní programy (shoduje se s Tabulkou č. 3c Hodnocení MZ, u VoZP se Tab. 3c liší o jiné zdroje). Rovnice bilance: zustatek_konecny = zustatek_pocatecni + tvorba.celkem − cerpani_celkem (±1 tis. Kč). bu_zustatek_* jsou zůstatky bankovního účtu fondu (tabulka B), který se od účetního zůstatku liší mj. o závazky vůči pojištěncům, pohledávky za ZFZP a (u OZP podle VZ) neuhrazené pohledávky za plátci pojistného.',
  'vyuziti = počty vyplacených příspěvků / žádostí / osob za fond jako celek, jen tam, kde je VZ uvádí (ZPŠ 2023 a 2024: příspěvky). `definice` říká, co se počítá; příspěvky, žádosti a osoby nejsou totéž a nelze je mezi ZP porovnávat ani vydělit počtem pojištěnců bez té poznámky.',
  'Nic v datasetu nehodnotí pojišťovny: je to účetní evidence toho, kolik se do fondu dostalo, kolik se z něj vyčerpalo a kolik zůstalo.',
].join(' ');

const POZNAMKY = {
  '111': [
    'Od 1. 1. 2023 má VZP stejné zdroje fondu jako ostatní ZP (§ 7c zák. 551/1991 Sb.); struktura tvorby před touto změnou a po ní není srovnatelná. V letech 2024 a 2025 tvoří velkou část tvorby převod z provozního fondu (tvorba.z_pf) a řádek 1.2.1 (převod ze ZFZP z pojistného) je v tabulce VZP prázdný.',
  ],
  '201': [
    'U VoZP se Tab. 3c Hodnocení MZ (fond_prevence_mil) liší od čerpání programů v tabulce A, protože MZ v Tab. 3c počítá i výdaje z jiných zdrojů (specifické fondy VoZP).',
  ],
  '205': [
    'U ČPZP obsahuje tvorba celkem zrušení opravných položek k pokutám a penále a čerpání celkem obsahuje odpis penále a pokut a tvorbu opravných položek (2024: 383 844 a 555 470 tis. Kč); cerpani_celkem tak výrazně převyšuje cerpani_programy a nevypovídá o péči pro pojištěnce.',
  ],
  '207': [
    'U OZP tvoří zdroj fondu jen pokuty a penále včetně dohadných položek (VZ 2024, oddíl 5.6); účetní zůstatek fondu (tabulka A) je z velké části tvořen neuhrazenými pohledávkami za plátci, proto se od zůstatku bankovního účtu (tabulka B) liší.',
  ],
  '209': [
    'U ZPŠ obsahuje čerpání celkem také odpis penále a pokut a snížení fondu na základě odstranění tvrdosti. Počty příspěvků (76 393 v roce 2023, 85 266 v roce 2024) jsou v odstavci 4.7.1 VZ.',
  ],
  '211': [],
  '213': [
    'RBP uvádí počty využití po programech: 2023 vitaminy 7 300 pojištěnců (213-2023.txt ř. 1540), očkovací programy 14 095 pojištěnců (ř. 1581); 2025 vitaminy 13 650 pojištěnců (213-2025.txt ř. 1742), očkovací programy 14 357 pojištěnců (ř. 1783), příspěvek na duševní pohodu 4 395 pojištěnců (ř. 1809). Jde o osoby v jednotlivých programech, které se mohou překrývat, proto je souhrnný pocet_osob null.',
    'VZ RBP za rok 2024 v repu není: pro 2024 je jen počáteční zůstatek (z konce 2023) a konečný zůstatek (z počátku 2025).',
  ],
};

// ---------------------------------------------------------------------------------- běh

export function nactiTexty(dir = VZ_DIR) {
  const out = {};
  for (const f of fs.readdirSync(dir).filter((x) => /^\d{3}-\d{4}\.txt$/.test(x)).sort()) out[f] = fs.readFileSync(path.join(dir, f), 'utf8');
  return out;
}

/** Stejné jako bezCasu v transform_pojistovny_hospodareni_rady.js: porovnání bez generated_at. */
function bezCasu(o) { const c = structuredClone(o); delete c.generated_at; return c; }

export function serializuj(obj) {
  const s = JSON.stringify(obj, null, 2);
  const prim = '(?:-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?|null|true|false|"[^"\\n]*")';
  const objekt = new RegExp(`\\{\\s*"[^"\\n]+": ${prim}(?:,\\s*"[^"\\n]+": ${prim})*\\s*\\}`, 'g');
  const sbal = (m) => m.replace(/\s*\n\s*/g, ' ').replace(/^\{ /, '{').replace(/ \}$/, '}');
  return `${s.replace(objekt, sbal)}\n`;
}

export function run({ out = OUT_PATH, dir = VZ_DIR, zapis = true } = {}) {
  const data = sestav(nactiTexty(dir));
  const predchozi = safeJson(out);
  const zmeneno = !predchozi || JSON.stringify(bezCasu(predchozi)) !== JSON.stringify(bezCasu(data));
  const hotovo = zmeneno ? { version: data.version, generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), ...data } : predchozi;
  const val = validateFondBilance(hotovo, { vzDir: dir, hospodareniRady: safeJson(path.join(ROOT, 'data', 'pojistovny-hospodareni-rady.json')) });
  if (!val.errors.length && zmeneno && zapis) fs.writeFileSync(out, serializuj(hotovo), 'utf8');
  return { zmeneno, data: hotovo, errors: val.errors, warnings: val.warnings };
}
function safeJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    for (const w of r.warnings) console.warn(`  ! ${w}`);
    if (r.errors.length) { for (const e of r.errors) console.error(`  ✗ ${e}`); process.exit(1); }
    console.log(`✓ transform_pojistovny_fond_bilance: ${r.data.pojistovny.length} ZP, roky ${r.data.roky.join(', ')}${r.zmeneno ? '' : ' — beze změny'}`);
  } catch (e) { console.error('✗ transform_pojistovny_fond_bilance:', e.message); process.exit(1); }
}
