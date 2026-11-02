// Věková a pohlavní standardizace ukazatelů „Kč na pojištěnce“ (srovnávač pojišťoven, P3.3).
//
// Čistý modul bez I/O. Metodika: docs/metodika-srovnavac-pojistoven.md § 4.1.
//
// Postup (nepřímá standardizace přes nákladové indexy)
// ----------------------------------------------------
// Pro každou buňku i = (věkové pásmo × pohlaví) známe
//   p_ZP,i  podíl buňky na kmeni pojišťovny (CRP, OIS 11-47),
//   p_CR,i  podíl buňky na všech pojištěncích ČR,
//   w_i     relativní nákladovou váhu buňky (nákladový index přerozdělení, § 21 zák. 592/1992 Sb.).
//
// Očekávaný index kmene  E_ZP = Σ p_ZP,i × w_i   (kolik by kmen stál při jednotkových nákladech ČR)
// Očekávaný index ČR     E_CR = Σ p_CR,i × w_i
// Faktor                 f    = E_CR / E_ZP
// Standardizovaná hodnota      = hodnota_na_pojistence × f
//
// f > 1: kmen je „levnější“ než ČR (mladší / příznivější struktura) → standardizace hodnotu zvýší.
// f < 1: kmen je „dražší“ (starší) → standardizace hodnotu sníží.
// f = 1: stejná struktura, nebo všechny váhy stejné (placeholder) → beze změny.
//
// Výsledek odpovídá otázce: „Kolik by pojišťovna vydala na pojištěnce, kdyby měla věkovou
// a pohlavní strukturu celé ČR a její relativní náklady v každé buňce zůstaly stejné?“

/** Stav sady vah, kdy chybí doložené indexy: všechny váhy = 1, faktor = 1. */
export const STAV_PLACEHOLDER = 'placeholder-bez-vah';
/** Stav sady vah převzaté z doloženého veřejného zdroje (vyhláška MZ). */
export const STAV_DOLOZENO = 'dolozeno';
export const STAVY_VAH = [STAV_DOLOZENO, STAV_PLACEHOLDER];
/** Stav obálky *_std_kc, kterou vytvořil transform_pojistovny_index_prerozdeleni.js (metodika § 4.2); placeholder ji nepřepisuje. */
export const STAV_INDEX_PREROZDELENI = 'index-prerozdeleni';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Převede absolutní strukturu {"<pasmo>:<pohlavi>": počet} na podíly (součet 1).
 * @param {Record<string, number>} struktura
 * @returns {Record<string, number>}
 */
export function podily(struktura) {
  const total = Object.values(struktura ?? {}).reduce((a, b) => a + (isNum(b) ? b : 0), 0);
  if (!(total > 0)) throw new Error('standardizace: prázdná struktura (součet 0)');
  const out = {};
  for (const [k, v] of Object.entries(struktura)) out[k] = (isNum(v) ? v : 0) / total;
  return out;
}

/**
 * Rozvine definici vah do klíčů struktury CSV.
 *
 * Definice (`ingest/manual/pojistovny/nakladove-indexy-<rok>.json`) nese váhy po skupinách
 * přerozdělení (`vahy`, klíč "<skupina>:<pohlavi>") a mapu `mapovani_pasem`
 * { "<pásmo CSV>": "<skupina přerozdělení>" }. Bez mapy se klíče berou 1:1.
 *
 * @param {{vahy: Record<string, number>, mapovani_pasem?: Record<string, string>}} def
 * @param {string[]} pasma  pásma CSV (např. ["0", "1-4", …, "85+"])
 * @param {string[]} pohlavi např. ["M", "F"]
 * @returns {Record<string, number>} váha pro každou buňku "<pasmo>:<pohlavi>"
 */
export function rozvinVahy(def, pasma, pohlavi) {
  const out = {};
  const map = def?.mapovani_pasem ?? {};
  for (const p of pasma) {
    const skupina = map[p] ?? p;
    for (const s of pohlavi) {
      const w = def?.vahy?.[`${skupina}:${s}`];
      if (!isNum(w) || w <= 0) throw new Error(`standardizace: chybí kladná váha pro ${skupina}:${s} (pásmo ${p})`);
      out[`${p}:${s}`] = w;
    }
  }
  return out;
}

/**
 * Očekávaný nákladový index struktury: Σ podíl_i × váha_i.
 * @param {Record<string, number>} struktura absolutní počty
 * @param {Record<string, number>} vahy váha pro každou buňku struktury
 */
export function ocekavanyIndex(struktura, vahy) {
  const p = podily(struktura);
  let e = 0;
  for (const [k, share] of Object.entries(p)) {
    if (share === 0) continue;
    const w = vahy?.[k];
    if (!isNum(w)) throw new Error(`standardizace: chybí váha pro buňku ${k}`);
    e += share * w;
  }
  return e;
}

/**
 * Faktor nepřímé standardizace kmene pojišťovny na strukturu ČR.
 *
 *   faktor = Σ(podíl_ČR_i × váha_i) / Σ(podíl_ZP_i × váha_i)
 *
 * @param {{strukturaZp: Record<string, number>, strukturaCr: Record<string, number>, vahy: Record<string, number>}} a
 *   struktury jsou absolutní počty pojištěnců po buňkách "<pasmo>:<pohlavi>",
 *   vahy relativní nákladové váhy pro tytéž buňky (měřítko vah nehraje roli).
 * @returns {{faktor: number, ocekavany_index_zp: number, ocekavany_index_cr: number}}
 */
export function primaStandardizace({ strukturaZp, strukturaCr, vahy }) {
  const ezp = ocekavanyIndex(strukturaZp, vahy);
  const ecr = ocekavanyIndex(strukturaCr, vahy);
  if (!(ezp > 0)) throw new Error('standardizace: očekávaný index kmene ZP není kladný');
  // zaokrouhlení na 12 míst odstraní šum plovoucí čárky (placeholder váhy dají přesně 1)
  const faktor = Math.round((ecr / ezp) * 1e12) / 1e12;
  return { faktor, ocekavany_index_zp: ezp, ocekavany_index_cr: ecr };
}

/**
 * Standardizovaná hodnota na pojištěnce = hodnota × faktor (zaokrouhleno na celé Kč).
 * @param {number|null} hodnotaNaPojistence
 * @param {number} faktor
 * @returns {number|null}
 */
export function standardizujHodnotu(hodnotaNaPojistence, faktor) {
  if (!isNum(hodnotaNaPojistence)) return null;
  if (!isNum(faktor) || faktor <= 0) throw new Error(`standardizace: neplatný faktor ${faktor}`);
  return Math.round(hodnotaNaPojistence * faktor);
}

/**
 * Faktory pro všechny pojišťovny z datasetu `data/pojistovny-vek.json`.
 *
 * @param {{pasma: string[], pohlavi: string[], cr: {struktura: Record<string, number>},
 *          pojistovny: Array<{kod: string, struktura: Record<string, number>}>}} vek
 * @param {{stav: string, vahy: Record<string, number>, mapovani_pasem?: Record<string, string>}} vahyDef
 * @returns {Record<string, {faktor: number, ocekavany_index: number, stav: string}>}
 *   `ocekavany_index` = E_ZP / E_ČR (relativní nákladovost kmene vůči ČR; 1/faktor).
 */
export function faktoryProVsechny(vek, vahyDef) {
  if (!STAVY_VAH.includes(vahyDef?.stav)) throw new Error(`standardizace: neznámý stav vah '${vahyDef?.stav}'`);
  const vahy = rozvinVahy(vahyDef, vek.pasma, vek.pohlavi);
  const out = {};
  for (const z of vek.pojistovny) {
    const r = primaStandardizace({ strukturaZp: z.struktura, strukturaCr: vek.cr.struktura, vahy });
    out[z.kod] = {
      faktor: r.faktor,
      ocekavany_index: r.ocekavany_index_zp / r.ocekavany_index_cr,
      stav: vahyDef.stav,
    };
  }
  return out;
}
