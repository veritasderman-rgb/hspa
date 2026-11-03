// Srovnávač pojišťoven — per-ZP řez návštěv porodní asistentky (výkon 06211).
//
// Vstup:  ingest/manual/uzis-06211/uzis-06211-2025q1-2026q2.json (normalizovaná odpověď ÚZIS
//         UZIS/080507/2026, Tab. 1–3; viz README.md v témže adresáři)
// Výstup: data/pojistovny-porodni-asistence.json (profil pojistovna.html?zp=, validuje
//         ingest/lib/validate-porodni-asistence.js přes ingest/validate-pojistovny.js)
//
// Deterministické: generated_at = den vyřízení datového požadavku ÚZIS, žádný čas běhu.
// Plán: PLAN-PORODNI-ASISTENCE-06211.md § 5.1 D. Pravidla čtení (§ 3 plánu):
//  - „žen na 100 porodů“ = unikátní ženy s výkonem v čtvrtletí / porody v čtvrtletí × 100, ne podíl rodiček;
//  - čtvrtletí, kde porody pojišťovny klesly pod 60 % předchozího čtvrtletí, je nespolehlivé (neúplný
//    jmenovatel předběžných dat; v datech 2026 Q2 jen OZP: 452 proti 1 191) a hodnota se v něm nepočítá;
//  - krajský řez jen za hlavní období (1. čtvrtletí 2026), buňky pod 100 porodů = malý vzorek.
//
// Použití: node ingest/build-pojistovny-porodni-asistence.js [--check]
//   --check  jen porovná s commitnutým souborem (exit 1 při rozdílu)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'ingest', 'manual', 'uzis-06211', 'uzis-06211-2025q1-2026q2.json');
export const OUT = path.join(ROOT, 'data', 'pojistovny-porodni-asistence.json');
export const SRC_URL = 'https://github.com/veritasderman-rgb/hspa/blob/main/05_M1_Starter/ingest/manual/uzis-06211/uzis-06211-2025q1-2026q2.json';

export const ZP_ZKRATKY = { 111: 'VZP', 201: 'VoZP', 205: 'ČPZP', 207: 'OZP', 209: 'ZPŠ', 211: 'ZPMV', 213: 'RBP' };
export const HLAVNI_OBDOBI = '2026Q1';
export const MALY_VZOREK = 100;
export const POKLES_NESPOLEHLIVE = 0.6;
const METRIKY = ['vykony', 'zeny', 'porody', 'icz_921', 'icz_603'];

const r1 = (x) => Math.round(x * 10) / 10;
const naSto = (zeny, porody) => (porody > 0 ? r1((zeny / porody) * 100) : null);

/** Řada jedné buňky {zp, kraj}: metriky po čtvrtletích + ženy na 100 porodů (null v nespolehlivém čtvrtletí). */
function rada(cell, obdobi, nespolehlive) {
  const out = {};
  for (const m of METRIKY) out[m] = obdobi.map((q) => cell[m]?.[q] ?? 0);
  out.zeny_na_100_porodu = obdobi.map((q, i) => (nespolehlive.includes(q) ? null : naSto(out.zeny[i], out.porody[i])));
  return out;
}

/** Čtvrtletí s propadem porodů pod POKLES_NESPOLEHLIVE předchozího čtvrtletí (jen předběžná období). */
export function nespolehlivaObdobi(cell, obdobi, predbezne) {
  return obdobi.filter((q, i) => i > 0 && predbezne.includes(q)
    && (cell.porody?.[obdobi[i - 1]] ?? 0) > 0
    && (cell.porody?.[q] ?? 0) < POKLES_NESPOLEHLIVE * cell.porody[obdobi[i - 1]]);
}

const rok2025 = (cell) => {
  const q = ['2025Q1', '2025Q2', '2025Q3', '2025Q4'];
  const zeny = q.reduce((a, k) => a + (cell.zeny?.[k] ?? 0), 0);
  const porody = q.reduce((a, k) => a + (cell.porody?.[k] ?? 0), 0);
  return { zeny, porody, zeny_na_100_porodu: naSto(zeny, porody) };
};

export function buildPorodniAsistence(src) {
  const { period: obdobi, preliminary: predbezne, cells, source } = src;
  const byKey = new Map(cells.map((c) => [`${c.zp}|${c.kraj}`, c]));
  const cr = byKey.get('ALL|CZ');
  const pojistovny = Object.keys(ZP_ZKRATKY).map((kod) => {
    const c = byKey.get(`${kod}|CZ`);
    const nesp = nespolehlivaObdobi(c, obdobi, predbezne);
    const kraje = cells
      .filter((x) => x.zp === kod && x.kraj !== 'CZ')
      .map((x) => {
        const porody = x.porody?.[HLAVNI_OBDOBI] ?? 0;
        const zeny = x.zeny?.[HLAVNI_OBDOBI] ?? 0;
        return { kod: x.kraj, nazev: x.kraj_nazev, porody, zeny, zeny_na_100_porodu: naSto(zeny, porody), maly_vzorek: porody < MALY_VZOREK };
      })
      .filter((x) => x.porody > 0)
      .sort((a, b) => a.kod.localeCompare(b.kod));
    return { kod, zkratka: ZP_ZKRATKY[kod], nespolehliva_obdobi: nesp, rok_2025: rok2025(c), rada: rada(c, obdobi, nesp), kraje };
  });
  return {
    version: '1.0',
    generated_at: `${source.answered}T00:00:00Z`,
    stav_k: source.answered,
    _doc: 'Srovnávač pojišťoven — návštěvy porodní asistentky v těhotenství a šestinedělí (výkon 06211) podle pojišťovny ženy. '
      + 'Sestavuje ingest/build-pojistovny-porodni-asistence.js z normalizované odpovědi ÚZIS (ingest/manual/uzis-06211/). '
      + 'zeny_na_100_porodu = unikátní ženy s výkonem v čtvrtletí / porody v čtvrtletí × 100 (ne podíl rodiček; výkon zahrnuje i těhotenství). '
      + 'icz_921 / icz_603 = poskytovatelé (IČZ), kteří výkon v čtvrtletí pojišťovně vykázali, ne smluvní síť. '
      + 'nespolehliva_obdobi = předběžné čtvrtletí s neúplným počtem porodů (hodnota null). '
      + 'kraje = kraj poskytovatele za hlavni_obdobi, maly_vzorek = méně než 100 porodů. Plán: PLAN-PORODNI-ASISTENCE-06211.md § 5.1 D.',
    zdroj: {
      nazev: source.name,
      pozadavek: source.request_id,
      vyrizeno: source.answered,
      url: SRC_URL,
    },
    obdobi,
    predbezne,
    hlavni_obdobi: HLAVNI_OBDOBI,
    limity: src.limitations,
    cr: { rok_2025: rok2025(cr), rada: rada(cr, obdobi, []) },
    pojistovny,
  };
}

export const serialize = (x) => `${JSON.stringify(x, null, 2)}\n`;

function main() {
  const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const out = serialize(buildPorodniAsistence(src));
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== out) { console.error('pojistovny-porodni-asistence.json není v syncu se zdrojem (spusť node ingest/build-pojistovny-porodni-asistence.js)'); process.exit(1); }
    console.log('pojistovny-porodni-asistence.json v syncu');
    return;
  }
  fs.writeFileSync(OUT, out);
  console.log(`data/pojistovny-porodni-asistence.json: 7 pojišťoven × ${src.period.length} čtvrtletí`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
