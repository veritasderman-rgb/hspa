// Testy legislativního radaru (U18): frontend filtr/řazení (src/legislativa.js),
// validátor (ingest/validate-legislation.js) a integrita data/legislativa.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  filterLegislation, sortLegislation, PHASE_LABELS, TYPE_LABELS, PHASE_ORDER,
  PLAN_TYPE_LABELS, PLAN_STAV_LABELS, PLAN_STAV_PROCES,
  planTerminIndex, monthIndex, formatPlanTermin, isPlanItemOverdue,
  computePlanStats, filterPlanItems, sortPlanItems,
} from '../src/legislativa.js';
import { validateLegislation, VALID_PHASES, VALID_TYPES, REQUIRED, VALID_PLAN_TYPES, VALID_PLAN_STAV } from '../ingest/validate-legislation.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SAMPLE = [
  { id: 'l1', title_short: 'Novela zákona o elektronizaci zdravotnictví', title: 'Návrh zákona…', annotation: 'Povinná e-Žádanka a EHDS.', submitter: 'Ministerstvo zdravotnictví', phase: 'pripominky', dates: { last_change: '2026-07-03' } },
  { id: 'l2', title_short: 'Úhradová vyhláška 2026', title: 'Vyhláška…', annotation: 'Hodnoty bodu pro rok 2026.', submitter: 'Ministerstvo zdravotnictví', phase: 'dokonceno', dates: { last_change: '2025-10-23' } },
  { id: 'l3', title_short: 'Novela zákona o návykových látkách', title: 'Návrh zákona…', annotation: 'Psychomodulační látky.', submitter: 'Ministerstvo zdravotnictví', phase: 'pripominky', dates: { last_change: '2026-06-30' } },
  { id: 'l4', title_short: 'Novela ochrany veřejného zdraví', title: 'Návrh zákona…', annotation: 'Pitná voda.', submitter: 'Ministerstvo zdravotnictví', phase: 'vlada', dates: { last_change: '2026-07-03' } },
];

// ===== filterLegislation =====

test('filterLegislation: filtr podle fáze', () => {
  const out = filterLegislation(SAMPLE, { phase: 'pripominky' });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(x => x.id).sort(), ['l1', 'l3']);
});

test('filterLegislation: phase=all (nebo neuvedeno) vrátí vše', () => {
  assert.equal(filterLegislation(SAMPLE, { phase: 'all' }).length, 4);
  assert.equal(filterLegislation(SAMPLE, {}).length, 4);
});

test('filterLegislation: fulltext přes title_short/annotation', () => {
  assert.equal(filterLegislation(SAMPLE, { search: 'e-žádanka' }).length, 1);
  assert.equal(filterLegislation(SAMPLE, { search: 'úhradová' }).length, 1);
  assert.equal(filterLegislation(SAMPLE, { search: 'NEEXISTUJE' }).length, 0);
});

test('filterLegislation: kombinace fáze + search', () => {
  const out = filterLegislation(SAMPLE, { phase: 'pripominky', search: 'návykových' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'l3');
});

// ===== sortLegislation =====

test('sortLegislation: rozjednané fáze před dokončenými, uvnitř fáze novější změna první', () => {
  const out = sortLegislation(SAMPLE);
  assert.deepEqual(out.map(x => x.id), ['l1', 'l3', 'l4', 'l2']);
});

test('sortLegislation: nemutuje vstupní pole', () => {
  const before = SAMPLE.map(x => x.id);
  sortLegislation(SAMPLE);
  assert.deepEqual(SAMPLE.map(x => x.id), before);
});

// ===== konzistence UI ↔ validátor =====

test('PHASE_LABELS pokrývá přesně VALID_PHASES validátoru', () => {
  assert.deepEqual(Object.keys(PHASE_LABELS).sort(), [...VALID_PHASES].sort());
  assert.deepEqual([...PHASE_ORDER].sort(), [...VALID_PHASES].sort());
});

test('TYPE_LABELS pokrývá přesně VALID_TYPES validátoru', () => {
  assert.deepEqual(Object.keys(TYPE_LABELS).sort(), [...VALID_TYPES].sort());
});

// ===== validateLegislation =====

function validItem(overrides = {}) {
  return {
    id: 'test-navrh',
    veklep_id: 'ALBSDTEST123',
    title: 'Návrh zákona, kterým se mění zákon č. 1/2000 Sb.',
    title_short: 'Testovací novela',
    type: 'zakon',
    submitter: 'Ministerstvo zdravotnictví',
    phase: 'pripominky',
    veklep_status: '2 - v připomínkovém řízení',
    veklep_url: 'https://odok.cz/portal/veklep/material/ALBSDTEST123/',
    annotation: 'Testovací anotace.',
    dates: { authorized: '2026-01-01', last_change: '2026-01-02', comments_until: null },
    linked_indicators: [],
    linked_articles: [],
    verified_at: '2026-07-06',
    ...overrides,
  };
}

function validDataset(items) {
  return { version: '1.0', generated_at: '2026-07-06T00:00:00Z', items };
}

test('validateLegislation: validní dataset projde bez chyb', () => {
  assert.deepEqual(validateLegislation(validDataset([validItem()])), []);
});

test('validateLegislation: chybějící povinná pole', () => {
  const item = validItem();
  delete item.annotation;
  delete item.veklep_url;
  const errors = validateLegislation(validDataset([item]));
  assert.ok(errors.some(e => e.includes("missing required 'annotation'")));
  assert.ok(errors.some(e => e.includes("missing required 'veklep_url'")));
});

test('validateLegislation: nevalidní phase a type', () => {
  const errors = validateLegislation(validDataset([
    validItem({ phase: 'snemovna' }),
    validItem({ id: 'x2', veklep_id: 'V2', type: 'smernice' }),
  ]));
  assert.ok(errors.some(e => e.includes("invalid phase 'snemovna'")));
  assert.ok(errors.some(e => e.includes("invalid type 'smernice'")));
});

test('validateLegislation: duplicitní id a veklep_id', () => {
  const errors = validateLegislation(validDataset([validItem(), validItem()]));
  assert.ok(errors.some(e => e.includes('duplicate id')));
  assert.ok(errors.some(e => e.includes('duplicate veklep_id')));
});

test('validateLegislation: veklep_url mimo odok.cz selže', () => {
  const errors = validateLegislation(validDataset([validItem({ veklep_url: 'https://example.com/navrh' })]));
  assert.ok(errors.some(e => e.includes('veklep_url')));
});

test('validateLegislation: špatný formát data', () => {
  const errors = validateLegislation(validDataset([validItem({ dates: { last_change: '3. 7. 2026' } })]));
  assert.ok(errors.some(e => e.includes('dates.last_change')));
});

test('validateLegislation: FK kontrola linked_indicators + linked_articles', () => {
  const refs = { indicatorIds: new Set(['ehealth_adoption']), articleIds: new Set(['ehealth']) };
  const okItem = validItem({ linked_indicators: ['ehealth_adoption'], linked_articles: ['ehealth'] });
  assert.deepEqual(validateLegislation(validDataset([okItem]), refs), []);

  const badItem = validItem({ linked_indicators: ['neexistuje'], linked_articles: ['neexistuje'] });
  const errors = validateLegislation(validDataset([badItem]), refs);
  assert.ok(errors.some(e => e.includes("linked_indicator 'neexistuje'")));
  assert.ok(errors.some(e => e.includes("linked_article 'neexistuje'")));
});

test('validateLegislation: chybějící version/generated_at/items', () => {
  const errors = validateLegislation({});
  assert.ok(errors.some(e => e.includes('version')));
  assert.ok(errors.some(e => e.includes('generated_at')));
  assert.ok(errors.some(e => e.includes('items')));
});

// ===== validateLegislation: legislativní plán MZ (plan_meta + plan_items) =====

function validPlanMeta(overrides = {}) {
  return {
    usneseni: 'č. 123/2026',
    schvaleno: '2026-01-15',
    zdroj_nazev: 'Plán legislativních prací vlády na rok 2026',
    zdroj_url: 'https://vlada.gov.cz/plan-legislativnich-praci.pdf',
    ...overrides,
  };
}

function validPlanItem(overrides = {}) {
  return {
    id: 'novela-neco-2026',
    nazev: 'Novela zákona o něčem',
    popis: 'Plánovaná novela.',
    typ: 'novela_zakona',
    plan_termin: '2026-09',
    ria: true,
    stav: 'nezahajeno',
    veklep_pid: null,
    veklep_url: null,
    radar_id: null,
    plneni_poznamka: '',
    zdroje: [{ nazev: 'Plán legislativních prací', url: 'https://vlada.gov.cz/plan.pdf' }],
    ...overrides,
  };
}

function planDataset(planItems, planMeta = validPlanMeta(), radarItems = [validItem()]) {
  return { version: '1.0', generated_at: '2026-07-06T00:00:00Z', items: radarItems, plan_meta: planMeta, plan_items: planItems };
}

test('validatePlan: enumy pokrývají zadané hodnoty', () => {
  assert.deepEqual([...VALID_PLAN_TYPES].sort(), ['narizeni_vlady', 'novela_narizeni', 'novela_vyhlasky', 'novela_zakona', 'ustavni_zakon', 'vecny_zamer', 'vyhlaska', 'zakon']);
  assert.deepEqual([...VALID_PLAN_STAV].sort(), ['nezahajeno', 'parlament', 'pripominkove_rizeni', 'sbirka', 'stazeno', 'vlada']);
});

test('validatePlan: validní plán projde bez chyb', () => {
  assert.deepEqual(validateLegislation(planDataset([validPlanItem()])), []);
});

test('validatePlan: dataset bez plánu (backward-compat) projde bez chyb', () => {
  assert.deepEqual(validateLegislation(validDataset([validItem()])), []);
});

test('validatePlan: chybějící povinná pole položky', () => {
  const item = validPlanItem();
  delete item.nazev;
  delete item.plan_termin;
  const errors = validateLegislation(planDataset([item]));
  assert.ok(errors.some(e => e.includes("missing required 'nazev'")));
  assert.ok(errors.some(e => e.includes("missing required 'plan_termin'")));
});

test('validatePlan: chybějící povinná pole plan_meta', () => {
  const meta = validPlanMeta();
  delete meta.usneseni;
  const errors = validateLegislation(planDataset([validPlanItem()], meta));
  assert.ok(errors.some(e => e.includes("plan_meta: missing required 'usneseni'")));
});

test('validatePlan: plan_meta chybí, ale plan_items je přítomen', () => {
  const data = { version: '1.0', generated_at: '2026-07-06T00:00:00Z', items: [validItem()], plan_items: [validPlanItem()] };
  const errors = validateLegislation(data);
  assert.ok(errors.some(e => e.includes('plan_meta chybí')));
});

test('validatePlan: nevalidní typ a stav', () => {
  const errors = validateLegislation(planDataset([
    validPlanItem({ typ: 'smernice' }),
    validPlanItem({ id: 'p2', stav: 'snemovna' }),
  ]));
  assert.ok(errors.some(e => e.includes("invalid typ 'smernice'")));
  assert.ok(errors.some(e => e.includes("invalid stav 'snemovna'")));
});

test('validatePlan: plan_termin musí být YYYY-MM (ne YYYY-MM-DD)', () => {
  assert.ok(validateLegislation(planDataset([validPlanItem({ plan_termin: '2026-09-01' })])).some(e => e.includes('plan_termin')));
  assert.ok(validateLegislation(planDataset([validPlanItem({ plan_termin: '2026-13' })])).some(e => e.includes('plan_termin')));
  assert.deepEqual(validateLegislation(planDataset([validPlanItem({ plan_termin: '2026-12' })])), []);
});

test('validatePlan: schvaleno musí být YYYY-MM-DD', () => {
  const errors = validateLegislation(planDataset([validPlanItem()], validPlanMeta({ schvaleno: '2026-01' })));
  assert.ok(errors.some(e => e.includes('schvaleno')));
});

test('validatePlan: zdroj_url mimo vlada.gov.cz selže', () => {
  const errors = validateLegislation(planDataset([validPlanItem()], validPlanMeta({ zdroj_url: 'https://example.com/plan.pdf' })));
  assert.ok(errors.some(e => e.includes('zdroj_url')));
});

test('validatePlan: duplicitní id položky plánu', () => {
  const errors = validateLegislation(planDataset([validPlanItem(), validPlanItem()]));
  assert.ok(errors.some(e => e.includes('duplicate id')));
});

test('validatePlan: ria musí být boolean nebo null', () => {
  assert.ok(validateLegislation(planDataset([validPlanItem({ ria: 'ano' })])).some(e => e.includes('ria')));
  assert.deepEqual(validateLegislation(planDataset([validPlanItem({ ria: null })])), []);
  assert.deepEqual(validateLegislation(planDataset([validPlanItem({ ria: false })])), []);
});

test('validatePlan: veklep_url povinné, když stav != nezahajeno', () => {
  const errors = validateLegislation(planDataset([validPlanItem({ stav: 'pripominkove_rizeni', veklep_url: null })]));
  assert.ok(errors.some(e => e.includes('veklep_url je povinné')));

  const ok = validateLegislation(planDataset([validPlanItem({
    stav: 'pripominkove_rizeni',
    veklep_pid: 'ALBSDPLAN01',
    veklep_url: 'https://odok.cz/portal/veklep/material/ALBSDPLAN01/',
  })]));
  assert.deepEqual(ok, []);
});

test('validatePlan: veklep_url musí mířit na odok.cz', () => {
  const errors = validateLegislation(planDataset([validPlanItem({ stav: 'vlada', veklep_url: 'https://example.com/x' })]));
  assert.ok(errors.some(e => e.includes('odok.cz')));
});

test('validatePlan: FK radar_id proti položkám radaru', () => {
  const radar = [validItem({ id: 'radar-existuje', veklep_id: 'RADAR1' })];
  const ok = validateLegislation(planDataset([validPlanItem({ radar_id: 'radar-existuje' })], validPlanMeta(), radar));
  assert.deepEqual(ok, []);

  const bad = validateLegislation(planDataset([validPlanItem({ radar_id: 'radar-neexistuje' })], validPlanMeta(), radar));
  assert.ok(bad.some(e => e.includes("radar_id 'radar-neexistuje'")));
});

test('validatePlan: zdroje musí být pole objektů s nazev+url', () => {
  assert.ok(validateLegislation(planDataset([validPlanItem({ zdroje: 'neco' })])).some(e => e.includes('zdroje must be array')));
  assert.ok(validateLegislation(planDataset([validPlanItem({ zdroje: [{ nazev: 'X' }] })])).some(e => e.includes("chybí 'url'")));
  assert.ok(validateLegislation(planDataset([validPlanItem({ zdroje: [{ nazev: 'X', url: 'ftp://x' }] })])).some(e => e.includes('http(s)')));
});

test('validatePlan: reálný dataset plánu MZ (usnesení č. 175) projde validátorem', () => {
  const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'legislativa.json'), 'utf8'));
  assert.ok(Array.isArray(data.plan_items) && data.plan_items.length >= 6,
    `plan_items má mít aspoň 6 úkolů MZ z plánu legislativních prací (má ${data.plan_items?.length})`);
  assert.equal(data.plan_meta.usneseni, 'č. 175');
  assert.equal(data.plan_meta.schvaleno, '2026-03-23');
  assert.ok(!data.plan_items.some(p => p.id === 'fixture-placeholder'), 'fixture-placeholder byl nahrazen reálnými daty');
  assert.deepEqual(validateLegislation(data), []);
});

// ===== integrita reálného datasetu =====

test('data/legislativa.json: parsuje se a projde validátorem včetně FK', () => {
  const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'legislativa.json'), 'utf8'));
  const indicatorIds = new Set(
    JSON.parse(readFileSync(resolve(ROOT, 'data', 'indicators.json'), 'utf8')).indicators.map(i => i.id)
  );
  const articleIds = new Set(
    JSON.parse(readFileSync(resolve(ROOT, 'data', 'articles.json'), 'utf8')).articles.map(a => a.id)
  );
  const errors = validateLegislation(data, { indicatorIds, articleIds });
  assert.deepEqual(errors, []);
  assert.ok(data.items.length >= 10, `radar má mít aspoň 10 úvodních záznamů (má ${data.items.length})`);
});

test('data/legislativa.json: každý záznam má neprázdnou anotaci a VeKLEP odkaz s PID', () => {
  const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'legislativa.json'), 'utf8'));
  for (const item of data.items) {
    assert.ok(item.annotation.length > 40, `${item.id}: anotace je podezřele krátká`);
    assert.ok(item.veklep_url.includes(item.veklep_id), `${item.id}: veklep_url neobsahuje veklep_id`);
  }
});

test('legislativa.html: stránka odkazuje na src/legislativa.js a má právě jeden hero <h1>', () => {
  const html = readFileSync(resolve(ROOT, 'legislativa.html'), 'utf8');
  assert.ok(html.includes('src/legislativa.js'));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(/class="ed-hero-headline"/.test(html));
});

// ===== Sekce plánu: render-logika (mapování stavů, po termínu, filtry) =====

test('legislativa.html: obsahuje mount sekce plánu (#legPlanMount)', () => {
  const html = readFileSync(resolve(ROOT, 'legislativa.html'), 'utf8');
  assert.ok(html.includes('id="legPlanMount"'));
});

test('PLAN_TYPE_LABELS pokrývá přesně VALID_PLAN_TYPES validátoru', () => {
  assert.deepEqual(Object.keys(PLAN_TYPE_LABELS).sort(), [...VALID_PLAN_TYPES].sort());
});

test('PLAN_STAV_LABELS pokrývá přesně VALID_PLAN_STAV a mapuje badge třídu', () => {
  assert.deepEqual(Object.keys(PLAN_STAV_LABELS).sort(), [...VALID_PLAN_STAV].sort());
  for (const [stav, def] of Object.entries(PLAN_STAV_LABELS)) {
    assert.ok(def.label, `${stav}: chybí label`);
    assert.match(def.cls, /^leg-plan-badge-(good|warn|bad|neutral)$/, `${stav}: neplatná badge třída`);
  }
  // Signální sémantika: sbirka=good, stazeno=bad (červená jen pro staženo), procesní stavy=warn.
  assert.equal(PLAN_STAV_LABELS.sbirka.cls, 'leg-plan-badge-good');
  assert.equal(PLAN_STAV_LABELS.stazeno.cls, 'leg-plan-badge-bad');
  assert.equal(PLAN_STAV_LABELS.pripominkove_rizeni.cls, 'leg-plan-badge-warn');
  assert.equal(PLAN_STAV_LABELS.nezahajeno.cls, 'leg-plan-badge-neutral');
});

test('PLAN_STAV_PROCES = aktivně projednávané stavy', () => {
  assert.deepEqual([...PLAN_STAV_PROCES].sort(), ['parlament', 'pripominkove_rizeni', 'vlada']);
});

test('planTerminIndex: parsuje YYYY-MM, odmítá nevalidní', () => {
  assert.equal(planTerminIndex('2026-01'), 2026 * 12 + 0);
  assert.equal(planTerminIndex('2026-12'), 2026 * 12 + 11);
  assert.equal(planTerminIndex('2026-13'), null);
  assert.equal(planTerminIndex('2026-00'), null);
  assert.equal(planTerminIndex('2026-09-01'), null);
  assert.equal(planTerminIndex(null), null);
});

test('monthIndex: měsíční index z Date (měsíc 0-based)', () => {
  assert.equal(monthIndex(new Date('2026-07-15T00:00:00')), 2026 * 12 + 6);
});

test('formatPlanTermin: český měsíc + rok', () => {
  assert.equal(formatPlanTermin('2026-06'), 'červen 2026');
  assert.equal(formatPlanTermin('2027-01'), 'leden 2027');
  assert.equal(formatPlanTermin('2026-12'), 'prosinec 2026');
  assert.equal(formatPlanTermin('2026-13'), '2026-13'); // nevalidní měsíc → beze změny
  assert.equal(formatPlanTermin(null), '—');
});

test('isPlanItemOverdue: po termínu = plán v minulosti A stav nezahajeno/pripominkove', () => {
  const now = new Date('2026-07-15T00:00:00'); // aktuální měsíc 2026-07
  // Plán v minulém měsíci, stav nezahajeno → po termínu
  assert.equal(isPlanItemOverdue({ plan_termin: '2026-06', stav: 'nezahajeno' }, now), true);
  // Plán v minulém měsíci, stav pripominkove_rizeni → po termínu
  assert.equal(isPlanItemOverdue({ plan_termin: '2026-03', stav: 'pripominkove_rizeni' }, now), true);
  // Aktuální měsíc → NENÍ po termínu (jen ostře menší)
  assert.equal(isPlanItemOverdue({ plan_termin: '2026-07', stav: 'nezahajeno' }, now), false);
  // Budoucí měsíc → není po termínu
  assert.equal(isPlanItemOverdue({ plan_termin: '2026-12', stav: 'nezahajeno' }, now), false);
  // Plán v minulosti, ale stav už postoupil (vlada) → není po termínu
  assert.equal(isPlanItemOverdue({ plan_termin: '2026-01', stav: 'vlada' }, now), false);
  assert.equal(isPlanItemOverdue({ plan_termin: '2026-01', stav: 'sbirka' }, now), false);
  // Nevalidní termín → není po termínu
  assert.equal(isPlanItemOverdue({ plan_termin: null, stav: 'nezahajeno' }, now), false);
});

const PLAN_SAMPLE = [
  { id: 'p1', nazev: 'A', typ: 'novela_zakona', plan_termin: '2026-03', stav: 'nezahajeno' },       // po termínu
  { id: 'p2', nazev: 'B', typ: 'zakon', plan_termin: '2026-05', stav: 'pripominkove_rizeni' },       // po termínu + proces
  { id: 'p3', nazev: 'C', typ: 'vyhlaska', plan_termin: '2026-09', stav: 'vlada' },                  // proces, budoucí
  { id: 'p4', nazev: 'D', typ: 'zakon', plan_termin: '2026-04', stav: 'sbirka' },                    // ve Sbírce
  { id: 'p5', nazev: 'E', typ: 'novela_vyhlasky', plan_termin: '2026-12', stav: 'nezahajeno' },      // budoucí, nezahájeno
];
const PLAN_NOW = new Date('2026-07-15T00:00:00');

test('computePlanStats: souhrnná počitadla', () => {
  const s = computePlanStats(PLAN_SAMPLE, PLAN_NOW);
  assert.equal(s.total, 5);
  assert.equal(s.inProcess, 2);   // p2, p3
  assert.equal(s.inSbirka, 1);    // p4
  assert.equal(s.notStarted, 2);  // p1, p5
  assert.equal(s.overdue, 2);     // p1, p2
});

test('computePlanStats: prázdný / nevalidní vstup', () => {
  assert.deepEqual(computePlanStats([], PLAN_NOW), { total: 0, inProcess: 0, inSbirka: 0, notStarted: 0, overdue: 0 });
  assert.equal(computePlanStats(undefined, PLAN_NOW).total, 0);
});

test('filterPlanItems: čipy Vše/V procesu/Nezahájeno/Po termínu/Ve Sbírce', () => {
  assert.equal(filterPlanItems(PLAN_SAMPLE, 'all', PLAN_NOW).length, 5);
  assert.deepEqual(filterPlanItems(PLAN_SAMPLE, 'proces', PLAN_NOW).map(x => x.id).sort(), ['p2', 'p3']);
  assert.deepEqual(filterPlanItems(PLAN_SAMPLE, 'nezahajeno', PLAN_NOW).map(x => x.id).sort(), ['p1', 'p5']);
  assert.deepEqual(filterPlanItems(PLAN_SAMPLE, 'poterminu', PLAN_NOW).map(x => x.id).sort(), ['p1', 'p2']);
  assert.deepEqual(filterPlanItems(PLAN_SAMPLE, 'sbirka', PLAN_NOW).map(x => x.id).sort(), ['p4']);
});

test('filterPlanItems: neznámý filtr vrací vše, nemutuje vstup', () => {
  const before = PLAN_SAMPLE.map(x => x.id);
  assert.equal(filterPlanItems(PLAN_SAMPLE, 'xxx', PLAN_NOW).length, 5);
  assert.deepEqual(PLAN_SAMPLE.map(x => x.id), before);
});

test('sortPlanItems: po termínu nahoře, pak podle termínu, nemutuje vstup', () => {
  const sorted = sortPlanItems(PLAN_SAMPLE, PLAN_NOW);
  // p1 (2026-03) a p2 (2026-05) jsou po termínu → první dva, uvnitř podle termínu
  assert.deepEqual(sorted.slice(0, 2).map(x => x.id), ['p1', 'p2']);
  // vstupní pole zůstává nezměněné
  assert.deepEqual(PLAN_SAMPLE.map(x => x.id), ['p1', 'p2', 'p3', 'p4', 'p5']);
});

test('plan_items z reálného datasetu: stavy a typy mají UI labely, overdue odpovídá stavu k 2026-07', () => {
  const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'legislativa.json'), 'utf8'));
  const now = new Date('2026-07-07T12:00:00');
  for (const item of data.plan_items) {
    assert.ok(PLAN_STAV_LABELS[item.stav], `${item.id}: stav '${item.stav}' je v PLAN_STAV_LABELS`);
    assert.ok(PLAN_TYPE_LABELS[item.typ], `${item.id}: typ '${item.typ}' je v PLAN_TYPE_LABELS`);
  }
  // Položky s termínem v budoucnu nejsou po termínu
  const soho = data.plan_items.find(p => p.id === 'plan-zakon-latky-lidskeho-puvodu');
  assert.ok(soho);
  assert.equal(isPlanItemOverdue(soho, now), false);
  // Pitná voda: plán duben 2026, ale stav 'vlada' už není overdue-eligible → ne po termínu
  const voda = data.plan_items.find(p => p.id === 'plan-novela-ochrana-verejneho-zdravi-pitna-voda');
  assert.ok(voda);
  assert.equal(voda.stav, 'vlada');
  assert.equal(isPlanItemOverdue(voda, now), false);
  // EHDS: plán červen 2026, v červenci stále v připomínkovém řízení → po termínu
  const ehds = data.plan_items.find(p => p.id === 'plan-adaptace-ehds');
  assert.ok(ehds);
  assert.equal(isPlanItemOverdue(ehds, now), true);
});

// ── F7: horizont (výhled 2027–2029) ──
test('filterPlanByHorizont: rozdělí položky, chybějící horizont = 2026', async () => {
  const { filterPlanByHorizont, itemHorizont } = await import('../src/legislativa.js');
  const items = [
    { id: 'a' },                                  // bez horizontu → 2026
    { id: 'b', horizont: '2026' },
    { id: 'c', horizont: 'vyhled-2027-2029' },
  ];
  assert.equal(itemHorizont(items[0]), '2026');
  assert.deepEqual(filterPlanByHorizont(items, '2026').map(x => x.id), ['a', 'b']);
  assert.deepEqual(filterPlanByHorizont(items, 'vyhled-2027-2029').map(x => x.id), ['c']);
});

test('data: plan_items mají validní horizont a výhledové položky existují', async () => {
  const fs = await import('node:fs');
  const url = await import('node:url');
  const path = await import('node:path');
  const root = path.dirname(url.fileURLToPath(import.meta.url));
  const d = JSON.parse(fs.readFileSync(path.join(root, '..', 'data', 'legislativa.json'), 'utf8'));
  const VALID = ['2026', 'vyhled-2027-2029'];
  for (const it of d.plan_items) {
    assert.ok(it.horizont == null || VALID.includes(it.horizont), `${it.id}: horizont`);
  }
  const vyhled = d.plan_items.filter(it => it.horizont === 'vyhled-2027-2029');
  assert.ok(vyhled.length >= 4, 'aspoň 4 výhledové položky');
  assert.ok(d.plan_vyhled_meta && /vlada\.gov\.cz/.test(d.plan_vyhled_meta.zdroj_url), 'plan_vyhled_meta se zdrojem');
  // výhledové položky jsou nezahájené (budoucí horizont)
  for (const it of vyhled) assert.equal(it.stav, 'nezahajeno', `${it.id} má být nezahajeno`);
});
