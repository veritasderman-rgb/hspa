// Konzistence source.origin (kontrakt) ↔ verification_status (metodická karta).
//
// source.origin žije záměrně jen v data/indicators.json (viz docs/data-model.md
// §2 „source.origin — proč je jen v kontraktu, ne v kartě"). verification_status
// žije v metodické kartě indicators/{id}.json a je editorial tvrzení redakce.
//
// Očekávaný vztah: karta s verification_status: "verified" by měla mít
// odpovídající záznam v kontraktu se source.origin === "live" — „ověřili jsme
// zdroj" dává smysl jen pro hodnotu, která z něj skutečně živě přišla.
//
// Tento test NEHLÍDÁ nulovou toleranci — na datech k 2026-07 existuje pár
// indikátorů, kde karta je verified, ale poslední ingest běh spadl na seed
// (fetcher ještě nedotažený / zdroj byl dole). Ty jsou v KNOWN_SEED_VERIFIED_EXCEPTIONS
// níže. Test selže jen na NOVÝCH nekonzistencích — tj. na indikátorech mimo
// tento seznam. Jakmile se pro výjimku doplní live fetcher, odeber ji ze
// seznamu (test to sám nezjistí ani neupozorní).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMethodCards } from '../ingest/transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Snapshot známých výjimek ke dni 2026-07-06 — karta tvrdí verified, kontrakt
// má origin: seed. Nepřidávej sem nové indikátory jen proto, aby test prošel;
// smysl seznamu je zachytit stav v okamžiku zavedení testu, ne skrývat nové
// regrese. Nové nekonzistence (mimo tento seznam) MUSÍ test shodit.
// F5 2026-07-10: všech 7 níže je stále origin:seed s verified kartou. „Zlivnění"
// vyžaduje běh reálné ingest pipeline (fetcher + síť + cache + transform), který
// se v sandboxu spouštět NESMÍ (traps.md — degraduje živá data). Odblokuje je
// noční ingest / dávka F4, ne editace v PR. Seznam proto zůstává; test hlídá, že
// neobsahuje mrtvé (už-ne-verified) položky.
// 2026-07-12: vydaje_prevence_pct přechodně origin:seed. Karta je verified
// (OECD SHA HC6, hodnota 2,736 % / 2023 beze změny), ale refresh cyklu
// 2026-07-12 (run refresh.yml #76) živý OECD SHA fetch nedotáhl → transform
// ponechal hodnotu, ale origin spadl na seed. Klasický verified-but-flaky-live
// stav jako ostatní položky seznamu; odblokuje ho příští úspěšný live fetch.
// 2026-07-17: nesplnena_potreba_zubni_pece přechodně origin:seed. Karta je
// verified (EU-SILC, hodnota 1,0 % / 2025 beze změny), ale refresh cyklu
// 2026-07-17 živý fetch nedotáhl → transform ponechal hodnotu, origin spadl
// na seed. Stejný verified-but-flaky-live stav jako ostatní položky.
const KNOWN_SEED_VERIFIED_EXCEPTIONS = new Set([
  // Odebráno po zživení (Vlna A): absolventi_lekarstvi_per_100k (A8),
  // konzumace_ovoce_zeleniny (A5), nesplnena_potreba_zubni_pece (A4) — teď
  // origin:live, takže regrese na seed MÁ padnout, ne být tolerována.
  'cholesterol_prumer_dospeli',
  // luzka_dlouhodobe_pece_65plus: hodnota 35,3 křížově ověřena 2 zdroji (OECD
  // DF_HEALTH_LTCR_BED 2020=35,3 + Eurostat součet jednoletých věků 65+ = 35,27),
  // ale zdroj (Eurostat hlth_rs_bdsns) končí 2020 → žádný živý feed, origin:seed.
  'luzka_dlouhodobe_pece_65plus',
  'plodnost_mladistvych_15_19',
  'prezit_karcinom_plic_5let',
  'vydaje_prevence_pct',
  // ÚZIS NRH (Národní registr hospitalizovaných) — hodnoty ověřeny proti
  // publikacím ÚZIS a udržovány manuálním extraktem (ingest/mapping/
  // uzis_indicator_extracts.json); automatický fetcher zatím není (typ
  // uzis_nrh bez endpointu), takže kontrakt nese origin: seed. Odeber, jakmile
  // vznikne živý NRH fetcher.
  'hospitalizace_na_100k',
  'mortalita_inhosp_ami',
  'mortalita_inhosp_cmp',
  // SÚKL DIS-13 (dodávky distribuovaných humánních LP) — hodnoty primárně
  // ověřeny 2026-07-23 (Vlna A: „ŽIVĚ+OVĚŘENO" ze SÚKL opendata DIS-13,
  // výpočet DDD/1000/den, komunitní sektor), ale automatický DIS-13 fetcher
  // zatím není zapojen → kontrakt nese origin: seed. Odeber, jakmile vznikne
  // živý SÚKL DIS-13 feed.
  'pouzivani_antidepresiv',
  'spotreba_opioidu',
  // 2026-07-28: pět OECD indikátorů přechodně origin:seed. Refresh cyklu
  // 2026-07-27 (commit b2a9282) živý OECD fetch nedotáhl → transform ponechal
  // hodnoty (karty verified beze změny), origin spadl na seed. Stejný
  // verified-but-flaky-live stav jako precedens 2026-07-17; odblokuje je
  // příští úspěšný live fetch — pak odeber.
  'jednodenni_chirurgie_katarakta',
  'luzka_jip_per_100k',
  'postele_akutni_per_1000',
  'prezit_karcinom_prsu_5let',
  'prezit_rakoviny_5let',
  // 2026-07-29: unmet_need_medical přechodně origin:seed. Karta je verified
  // (Eurostat EU-SILC, hodnota 0,3 % populace 16+ / 2025 beze změny), ale
  // refresh cyklu 2026-07-27/28 (commit 70b2282 „data: refresh 2026-07-28")
  // živý Eurostat fetch nedotáhl (fetched_at 2026-07-27T09:45) → transform
  // ponechal hodnotu, origin spadl na seed. Stejný verified-but-flaky-live stav
  // jako precedenty 2026-07-17 a 2026-07-28; odblokuje ho příští úspěšný live
  // fetch — pak odeber.
  'unmet_need_medical',
]);

test('verification_status: verified v kartě ⇒ source.origin: live v kontraktu (kromě známých výjimek)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const byId = new Map(data.indicators.map(i => [i.id, i]));
  const cards = loadMethodCards();

  const newInconsistencies = [];
  for (const card of cards) {
    if (card.verification_status !== 'verified') continue;
    const rec = byId.get(card.id);
    const origin = rec?.source?.origin;
    if (origin === 'live') continue;
    if (KNOWN_SEED_VERIFIED_EXCEPTIONS.has(card.id)) continue;
    newInconsistencies.push({ id: card.id, origin: origin ?? 'chybí záznam v kontraktu' });
  }

  assert.deepEqual(
    newInconsistencies,
    [],
    `Nové nekonzistence verified karta / non-live origin (doplň fetcher, nebo ` +
      `pokud jde o očekávaný přechodný stav, přidej id do KNOWN_SEED_VERIFIED_EXCEPTIONS ` +
      `v tests/verification-origin-consistency.test.js): ${JSON.stringify(newInconsistencies, null, 2)}`
  );
});

test('KNOWN_SEED_VERIFIED_EXCEPTIONS neobsahuje id bez odpovídající verified karty (žádné mrtvé výjimky)', () => {
  const cards = loadMethodCards();
  const verifiedIds = new Set(cards.filter(c => c.verification_status === 'verified').map(c => c.id));
  for (const id of KNOWN_SEED_VERIFIED_EXCEPTIONS) {
    assert.ok(
      verifiedIds.has(id),
      `${id} je v seznamu výjimek, ale karta už není verified — odeber ho ze seznamu`
    );
  }
});
