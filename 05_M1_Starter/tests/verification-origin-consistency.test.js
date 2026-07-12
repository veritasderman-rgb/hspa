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
const KNOWN_SEED_VERIFIED_EXCEPTIONS = new Set([
  'absolventi_lekarstvi_per_100k',
  'cholesterol_prumer_dospeli',
  'konzumace_ovoce_zeleniny',
  'plodnost_mladistvych_15_19',
  'prezit_karcinom_plic_5let',
  'vydaje_prevence_pct',
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
