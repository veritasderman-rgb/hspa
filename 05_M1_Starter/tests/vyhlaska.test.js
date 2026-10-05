// Úhradová vyhláška v2 — testy datového kontraktu (vyhlaska-hra.json,
// plná segmentace dle číselníku ZPP) + enginu (škálování na letošní objem,
// skupinová definitorika, eskalace).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  totalCost, avgGrowthPct, newShares, groupShare, moodFor, effectsFor, verdict, LUZKOVA_GROUP,
  moodContext, fairnessEscalates, moodExplain, structureProjection, yearsToShare,
  trilemma, takeaways, demandSplit, segmentWaitSignals,
  vyhlaskaParams, coverageFor, effectiveAlloc, promiseBroken, moodDetail,
} from '../src/vyhlaska-engine.js';
import { validateVyhlaskaHra } from '../ingest/validate-vyhlaska-hra.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vyhlaska-hra.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const byId = new Map(indicators.indicators.map(i => [i.id, i]));
const SEG = doc.segments;
const SCALE = doc.current_total_mld / SEG.reduce((a, s) => a + s.baseline_mld, 0);
const PARAMS = vyhlaskaParams(doc);
const RES = doc.envelope.reserve_mld;
const flat = (pct) => Object.fromEntries(SEG.map(s => [s.id, pct]));

test('vyhlaska-hra.json prochází validátorem (zdroje, eskalace, efekty, presety)', () => {
  assert.equal(validateVyhlaskaHra(), true);
});

test('data: 17 segmentů dle číselníku ZPP, součet = 456,1 mld (NRHZS 2023)', () => {
  assert.equal(SEG.length, 17);
  const sum = SEG.reduce((a, s) => a + s.baseline_mld, 0);
  assert.ok(Math.abs(sum - 456.1) < 0.05, `součet ${sum.toFixed(2)}`);
  // lůžkový blok = 256,7 (musí sedět na publikovaný údaj segmentu 2)
  const luz = LUZKOVA_GROUP.reduce((a, id) => a + SEG.find(s => s.id === id).baseline_mld, 0);
  assert.ok(Math.abs(luz - 256.7) < 0.05, `lůžkový blok ${luz.toFixed(2)}`);
});

test('data: tři segmenty bez dohody v DR 2027 označeny dle reality', () => {
  assert.match(SEG.find(s => s.id === 'akutni_luzkova').real_2027, /bez dohody/);
  assert.match(SEG.find(s => s.id === 'nasledna_luzkova').real_2027, /bez dohody/);
  assert.match(SEG.find(s => s.id === 'ambulantni_specialiste').real_2027, /bez dohody/);
});

test('engine: totalCost škáluje na letošní objem (7 % všem ≈ 39,4 mld)', () => {
  const cost = totalCost(SEG, flat(7), SCALE);
  assert.ok(Math.abs(cost - 0.07 * doc.current_total_mld) < 0.05, `cost=${cost}`);
  assert.ok(cost <= doc.envelope.amount_mld, 'status quo se vejde do obálky');
});

test('engine: plné požadavky všech segmentů obálku přesahují (napětí hry)', () => {
  const demands = Object.fromEntries(SEG.map(s => [s.id, s.demand_pct]));
  assert.ok(totalCost(SEG, demands, SCALE) > doc.envelope.amount_mld, 'nelze uspokojit všechny');
});

test('engine: newShares/groupShare — plošný růst strukturu nemění, selektivní ano', () => {
  const luzFlat = groupShare(SEG, flat(8), LUZKOVA_GROUP);
  assert.ok(Math.abs(luzFlat - 56.3) < 0.1, `plošně → lůžkový blok 56,3 (má ${luzFlat})`);
  const sum = Object.values(newShares(SEG, flat(8))).reduce((a, x) => a + x.share_pct, 0);
  assert.ok(Math.abs(sum - 100) < 0.001, 'podíly se sčítají na 100');

  const reform = groupShare(SEG, { ...flat(8), akutni_luzkova: 4, prakticti: 14 }, LUZKOVA_GROUP);
  assert.ok(reform < 56.3, 'přibrzděné nemocnice → podíl lůžkového bloku klesá');
});

test('engine: moodFor — eskalační žebřík podle gapu vs. požadavek (vč. pozitivního extrému)', () => {
  const akut = SEG.find(s => s.id === 'akutni_luzkova'); // demand 9
  assert.equal(moodFor(akut, 11), 'boost', '≥ +2 nad požadavek → rozšíření péče');
  assert.equal(moodFor(akut, 9), 'agree');
  assert.equal(moodFor(akut, 7.5), 'grudging');
  assert.equal(moodFor(akut, 5.5), 'no_deal');
  assert.equal(moodFor(akut, 3), 'protest');
  // každý segment má boost text (konkrétní příslib: hodiny/kapacity/metody)
  for (const s of SEG) assert.ok(s.escalation.boost?.length > 20, `${s.id}: chybí boost`);
});

test('engine: effectsFor — directional jen při nadprůměrném růstu, definitional skupinově', () => {
  const flat7 = effectsFor(SEG, flat(7), byId);
  const acscFlat = flat7.find(e => e.indicator === 'hospitalizace_acsc');
  assert.equal(acscFlat.active, false, 'plošný růst → žádné relativní posílení');
  const def = flat7.find(e => e.kind === 'definitional');
  assert.equal(def.active, true);
  assert.ok(Math.abs(def.after - 56.3) < 0.1, 'plošně → podíl lůžkového bloku beze změny');
  assert.ok(Math.abs(def.before - def.after) < 0.1);

  const reform = effectsFor(SEG, { ...flat(6), prakticti: 12, stomatologie: 12 }, byId);
  const acsc = reform.find(e => e.indicator === 'hospitalizace_acsc');
  assert.equal(acsc.active, true, 'praktici nadprůměrně → ACSC efekt aktivní');
  assert.equal(acsc.polarity, 'down');
  const zuby = reform.find(e => e.indicator === 'nesplnena_potreba_zubni_pece');
  assert.equal(zuby.active, true, 'stomatologie nadprůměrně → efekt aktivní');
});

test('engine: verdict — deficit, dohody a posun podílu lůžkového bloku', () => {
  const v = verdict(SEG, flat(10), doc.envelope.amount_mld, SCALE); // 56,3 mld > 40
  assert.equal(v.deficit, true, '10 % všem = deficit');
  const v2 = verdict(SEG, flat(7), doc.envelope.amount_mld, SCALE);
  assert.equal(v2.deficit, false);
  // dohody se počítají jen přes 15 vyjednávacích segmentů DR (centrová léčba
  // a zákonné položky mají dr_segment: false) — srovnatelné s realitou 12/15
  assert.equal(v2.segmentsTotal, 15);
  assert.equal(SEG.filter(s => s.dr_segment === false).length, 2);
  assert.ok(Math.abs(v2.luzkovaShareAfter - v2.luzkovaShareBefore) < 0.1, 'plošný růst podíl nemění');
  const reform = verdict(SEG, { ...flat(7), akutni_luzkova: 4, prakticti: 12 }, doc.envelope.amount_mld, SCALE);
  assert.ok(reform.luzkovaShareAfter < reform.luzkovaShareBefore, 'reformní vyhláška podíl lůžkového bloku snižuje');
  // pozitivní extrém: praktici 12 % vs. požadavek 8 % → boost počítán ve verdiktu
  assert.ok(reform.boosts >= 1, 'štědrá alokace → aspoň jedno rozšíření péče');
  // plošných 7 % → boost jen u „ostatní" (zákonné položky, požadavek 5 %)
  assert.equal(verdict(SEG, flat(7), doc.envelope.amount_mld, SCALE).boosts, 1);
  assert.equal(verdict(SEG, flat(5), doc.envelope.amount_mld, SCALE).boosts, 0, 'skromná vyhláška → žádné rozšíření');
});

test('data: presety pokrývají všechny segmenty a vejdou se do obálky (škálováno)', () => {
  for (const p of doc.presets) {
    assert.equal(Object.keys(p.alloc).length, SEG.length, `${p.id}: alokace pro všech 17`);
    const cost = totalCost(SEG, p.alloc, SCALE);
    assert.ok(cost <= doc.envelope.amount_mld + 0.05, `${p.id}: ${cost.toFixed(1)} ≤ ${doc.envelope.amount_mld}`);
  }
});

test('engine: avgGrowthPct — vážený průměr odpovídá plošné sazbě', () => {
  assert.ok(Math.abs(avgGrowthPct(SEG, flat(7)) - 7) < 0.001);
});

// ---------------------------------------------------------------------------
// v3 — relativní spravedlnost, vysvětlení gapu, projekce, trilema, takeaways,
// signály čekání (viz PLAN-VYHLASKA-HRA.md § v3)
// ---------------------------------------------------------------------------

const preset = (id) => doc.presets.find(p => p.id === id).alloc;

test('engine v3: relativní spravedlnost — segment pod průměrem eskaluje o stupeň, když jiný dostal boost', () => {
  const akut = SEG.find(s => s.id === 'akutni_luzkova'); // požadavek 9
  assert.equal(moodFor(akut, 5), 'no_deal', 'bez kontextu: gap −4 → bez dohody');
  const reform = preset('reformni'); // praktici 10 vs 8 → boost
  const ctx = moodContext(SEG, reform);
  assert.ok(ctx.boostedIds.includes('prakticti'));
  assert.ok(reform.akutni_luzkova < ctx.avgPct, 'nemocnice v reformním presetu rostou pod průměrem');
  assert.equal(fairnessEscalates(akut, reform.akutni_luzkova, ctx), true);
  assert.equal(moodFor(akut, reform.akutni_luzkova, ctx), 'protest', 'bez dohody + pod průměrem + cizí boost → protest');
  // segment NAD průměrem neeskaluje, i když podepisuje s výhradami
  const nasl = SEG.find(s => s.id === 'nasledna_luzkova'); // 8 vs 9
  assert.ok(reform.nasledna_luzkova > ctx.avgPct);
  assert.equal(moodFor(nasl, reform.nasledna_luzkova, ctx), 'grudging');
  // boost jen od vyjednávacích segmentů: zákonné položky („ostatní", dr_segment false) nikoho neprovokují
  const flatCtx = moodContext(SEG, { ...flat(7), prakticti: 7.5 });
  assert.deepEqual(flatCtx.boostedIds, []);
  assert.equal(moodFor(akut, 7, flatCtx), 'grudging');
  // dohoda a protest se kontextem nemění
  assert.equal(moodFor(akut, 9, ctx), 'agree');
  assert.equal(moodFor(akut, 2, ctx), 'protest');
});

test('engine v3: moodExplain — slovní vysvětlení gapu pro UI', () => {
  const akut = SEG.find(s => s.id === 'akutni_luzkova');
  assert.equal(moodExplain(akut, 6).text, 'Chybí 3 p. b. k požadavku → bez dohody');
  assert.equal(moodExplain(akut, 9).text, 'Přesně na požadavku → dohoda');
  assert.equal(moodExplain(akut, 9.5).text, '+0,5 p. b. nad požadavek → dohoda');
  assert.equal(moodExplain(akut, 11.5).text, '+2,5 p. b. nad požadavek → rozšíření péče');
  assert.equal(moodExplain(akut, 7.5).text, 'Chybí 1,5 p. b. k požadavku → podpis s výhradami');
  const reform = preset('reformni');
  const ex = moodExplain(akut, reform.akutni_luzkova, moodContext(SEG, reform));
  assert.equal(ex.escalated, true);
  assert.equal(ex.base, 'no_deal');
  assert.equal(ex.mood, 'protest');
  assert.match(ex.text, /roste pod průměrem systému .* → protest$/);
});

test('engine v3: projekce struktury — stejná vyhláška N let; status quo se nehne, reformní klesá, nemocniční roste', () => {
  assert.equal(groupShare(SEG, preset('status_quo'), LUZKOVA_GROUP, 0), 56.3, 'years=0 → výchozí stav');
  assert.equal(groupShare(SEG, preset('status_quo'), LUZKOVA_GROUP, 20), 56.3, 'plošný růst ani za 20 let');
  const proj = structureProjection(SEG, preset('reformni'), LUZKOVA_GROUP, [1, 5, 10, 20]);
  assert.deepEqual(proj.map(p => p.years), [1, 5, 10, 20]);
  assert.ok(proj[0].share > proj[1].share && proj[1].share > proj[2].share && proj[2].share > proj[3].share, 'monotónně klesá');
  assert.ok(Math.abs(proj[2].share - 50.7) < 0.15, `reformní 10 let ≈ 50,7 % (má ${proj[2].share})`);
  assert.ok(groupShare(SEG, preset('nemocnicni'), LUZKOVA_GROUP, 10) > 65, 'nemocniční priorita 10 let → přes 65 %');
  // podíly po N letech se pořád sčítají na 100
  const sum = Object.values(newShares(SEG, preset('reformni'), 10)).reduce((a, x) => a + x.share_pct, 0);
  assert.ok(Math.abs(sum - 100) < 0.001);
});

test('engine v3: yearsToShare — kolik let k OECD při stejné vyhlášce', () => {
  assert.equal(yearsToShare(SEG, preset('status_quo'), LUZKOVA_GROUP, 30), null, 'status quo: nikdy');
  assert.equal(yearsToShare(SEG, preset('nemocnicni'), LUZKOVA_GROUP, 30), null, 'podíl roste: nikdy');
  const y = yearsToShare(SEG, preset('reformni'), LUZKOVA_GROUP, 30);
  assert.ok(y >= 40 && y <= 45, `reformní preset → OECD za ~42 let (má ${y})`);
  assert.equal(yearsToShare(SEG, preset('reformni'), LUZKOVA_GROUP, 60), 0, 'cíl nad výchozím stavem → 0');
  assert.equal(yearsToShare(SEG, preset('reformni'), LUZKOVA_GROUP, 30, 10), null, 'strop maxYears → null');
});

test('engine v3: trilema — status quo samé „mid" (12/15 jako realita), nemocniční priorita obětuje dohody i reformu', () => {
  const sq = verdict(SEG, preset('status_quo'), doc.envelope.amount_mld, SCALE);
  assert.equal(sq.deals, 12, 'plošných 7 % = 12 z 15 dohod, přesně jako DR 2027');
  assert.equal(sq.protests, 0);
  const t = trilemma(sq);
  assert.equal(t.axes.dohody.tone, 'mid');
  assert.equal(t.axes.reforma.tone, 'mid');
  assert.equal(t.axes.bilance.tone, 'good');
  assert.deepEqual(t.sacrificed, []);

  const tn = trilemma(verdict(SEG, preset('nemocnicni'), doc.envelope.amount_mld, SCALE));
  assert.equal(tn.axes.dohody.tone, 'bad');
  assert.equal(tn.axes.reforma.tone, 'bad');
  assert.equal(tn.axes.bilance.tone, 'good');
  assert.deepEqual(tn.sacrificed, ['dohody', 'reforma']);

  const over = trilemma(verdict(SEG, flat(10), doc.envelope.amount_mld, SCALE));
  assert.equal(over.axes.bilance.tone, 'bad');
  assert.ok(over.deficitMld > 3);
  assert.match(over.axes.bilance.value, /^−/);
});

test('engine v3: verdict nese eskalace a průměr; reformní preset má nemocnice v protestu', () => {
  const vr = verdict(SEG, preset('reformni'), doc.envelope.amount_mld, SCALE);
  assert.ok(vr.escalations >= 1, 'aspoň jedna eskalace relativní spravedlností');
  assert.equal(vr.moods.find(m => m.id === 'akutni_luzkova').mood, 'protest');
  assert.equal(vr.moods.find(m => m.id === 'akutni_luzkova').escalated, true);
  assert.ok(Number.isFinite(vr.avgPct));
  assert.equal(verdict(SEG, flat(7), doc.envelope.amount_mld, SCALE).escalations, 0, 'plošně nikdo neeskaluje');
});

test('engine v3: takeaways — vybírá podle toho, co hráč udělal, nejvýš tři', () => {
  const sq = preset('status_quo');
  const t = takeaways(SEG, sq, verdict(SEG, sq, doc.envelope.amount_mld, SCALE), { scale: SCALE });
  assert.ok(t.length >= 1 && t.length <= 3);
  assert.ok(t.some(x => x.id === 'status_quo'), 'všem stejně → setrvačnost');

  const nem = preset('nemocnicni');
  const tn = takeaways(SEG, nem, verdict(SEG, nem, doc.envelope.amount_mld, SCALE), { scale: SCALE });
  assert.ok(tn.some(x => x.id === 'protest'), 'protesty mimo nemocnice → precedent 2023');

  const ref = preset('reformni');
  const vr = verdict(SEG, ref, doc.envelope.amount_mld, SCALE);
  const tr = takeaways(SEG, ref, vr, { scale: SCALE, yearsToOecd: yearsToShare(SEG, ref, LUZKOVA_GROUP) });
  assert.equal(tr.length, 3);
  assert.ok(tr.some(x => x.id === 'dr2027'), 'nemocnice bez dohody → zopakované DR 2027');
  assert.ok(tr.some(x => x.id === 'reform'), 'lůžkový blok klesl → tempo k OECD');
  assert.match(tr.find(x => x.id === 'reform').text, /za 4\d let/);

  const over = takeaways(SEG, flat(10), verdict(SEG, flat(10), doc.envelope.amount_mld, SCALE), { scale: SCALE });
  assert.ok(over.some(x => x.id === 'deficit'));

  // fallback „jedna páka" — všem na požadavek kromě nemocnic přesně na požadavek (nic jiného nenastane)
  const demands = Object.fromEntries(SEG.map(s => [s.id, s.demand_pct]));
  const v = verdict(SEG, demands, doc.envelope.amount_mld, SCALE); // deficit → 'deficit', ne fallback
  assert.ok(takeaways(SEG, demands, v, { scale: SCALE }).some(x => x.id === 'deficit'));
});

test('engine v3: demandSplit — hra je potají jednorozměrná (nemocnice vs. všichni ostatní)', () => {
  const split = demandSplit(SEG, SCALE, doc.envelope.amount_mld);
  assert.ok(Math.abs(split.total - 48.9) < 0.15, `plné požadavky ≈ 48,9 mld (má ${split.total})`);
  assert.ok(Math.abs(split.hospital - 21.9) < 0.15, `nemocnice ≈ 21,9 mld (má ${split.hospital})`);
  assert.ok(split.others < doc.envelope.amount_mld, 'všichni ostatní se do obálky vejdou na plný požadavek');
  assert.ok(split.leftover > 0 && split.leftover < split.hospital, 'na nemocnice zbude méně, než chtějí');
});

test('engine v3: segmentWaitSignals — boost nebo doložený pokles čekání → kratší, protest → delší', () => {
  const sig = segmentWaitSignals(SEG, preset('reformni'));
  assert.equal(sig.prakticti, 'kratsi', 'boost (10 vs 8) → rozšíření hodin');
  assert.equal(sig.akutni_luzkova, 'delsi', 'protest po eskalaci → omezení');
  const sq = segmentWaitSignals(SEG, flat(7));
  assert.deepEqual(Object.values(sq).filter(v => v === 'delsi'), [], 'status quo: nikdo neprotestuje');
  const spec = segmentWaitSignals(SEG, { ...flat(6), ambulantni_specialiste: 7.5 });
  assert.equal(spec.ambulantni_specialiste, 'kratsi', 'nadprůměr → aktivní efekt na čekací doby specialistů');
  const none = segmentWaitSignals(SEG, { ...flat(6), ambulantni_specialiste: 6 });
  assert.equal(none.ambulantni_specialiste, undefined, 'bez signálu = beze změny');
});

test('data v3: newsletter_hook je úplný, datovaný a má fallback po termínu', () => {
  const h = doc.newsletter_hook;
  assert.ok(h.headline && h.lead && h.cta && h.source && h.fallback_headline && h.fallback_lead);
  assert.match(h.valid_until, /^\d{4}-\d{2}-\d{2}$/);
});

// ---------------------------------------------------------------------------
// v3.1 — krytí vyhlášky: deficit má následky už v aktu I
// ---------------------------------------------------------------------------

test('data v3.1: rezerva systému 2,8 mld se zdrojem a vysvětleným pravidlem krytí', () => {
  assert.equal(doc.envelope.reserve_mld, 2.8);
  assert.match(doc.envelope.reserve_source, /2,8 miliardy/);
  assert.ok(doc.envelope.coverage_note.length > 50);
  assert.equal(PARAMS.reserveMld, 2.8);
  assert.equal(PARAMS.envelopeMld, 40);
  assert.ok(Math.abs(PARAMS.scale - SCALE) < 1e-12);
});

test('engine v3.1: coverageFor — v obálce 1, deficit do rezervy 1 (polštář), nad rezervu poměrné krácení', () => {
  assert.deepEqual(coverageFor(39.4, 40, 2.8), { ratio: 1, deficitMld: 0, uncoveredMld: 0, fundedMld: 39.4 });
  const inReserve = coverageFor(42, 40, 2.8);
  assert.equal(inReserve.ratio, 1);
  assert.equal(inReserve.deficitMld, 2);
  assert.equal(inReserve.uncoveredMld, 0);
  const over = coverageFor(84.5, 40, 2.8);
  assert.ok(Math.abs(over.ratio - 42.8 / 84.5) < 1e-9);
  assert.equal(over.deficitMld, 44.5);
  assert.equal(over.uncoveredMld, 41.7);
  assert.equal(over.fundedMld, 42.8);
  assert.equal(coverageFor(0, 40, 2.8).ratio, 1);
  assert.equal(coverageFor(50, 40).ratio, 0.8, 'bez rezervy krátí hned nad obálkou');
});

test('engine v3.1: effectiveAlloc — slíbeno × krytí, v obálce beze změny', () => {
  const eff = effectiveAlloc(SEG, flat(7), PARAMS);
  assert.ok(Math.abs(eff.akutni_luzkova - 7) < 1e-9, 'status quo je plně kryt');
  const all15 = effectiveAlloc(SEG, flat(15), PARAMS);
  assert.ok(Math.abs(all15.akutni_luzkova - 15 * 42.8 / (0.15 * doc.current_total_mld)) < 1e-6);
  assert.ok(all15.prakticti > 7.5 && all15.prakticti < 7.7, `všem 15 % = reálně ~7,6 % (má ${all15.prakticti})`);
});

test('engine v3.1: nesplněný slib — krácení ≥ 1 p. b., které zhorší stav, eskaluje o stupeň', () => {
  const akut = SEG.find(s => s.id === 'akutni_luzkova'); // požadavek 9
  assert.equal(promiseBroken(akut, 15, 7.6, 'grudging'), true, 'slib boost, realita výhrady → zlomeno');
  assert.equal(promiseBroken(akut, 8, 7.6, 'grudging'), false, 'krácení 0,4 p. b. je běžná regulace');
  assert.equal(promiseBroken(akut, 9.5, 8.5, 'grudging'), true, 'přesně 1 p. b. + zhoršení (agree → grudging)');
  assert.equal(promiseBroken(akut, 5, 3, 'protest'), true, 'slib (bez dohody) byl lepší než realita (protest) → zlomeno; hlouběji než protest to nejde');
  assert.equal(moodDetail(akut, 3, null, 5).mood, 'protest', 'protest je dno');
  assert.equal(promiseBroken(akut, 5, 3, 'no_deal'), false, 'slib 5 = no_deal, realita no_deal: žádné zhoršení');
  assert.equal(promiseBroken(akut, null, 7, 'grudging'), false, 'bez slibu se pravidlo nepoužije');
  const d = moodDetail(akut, 7.6, null, 15);
  assert.deepEqual([d.base, d.escalated, d.broken, d.mood], ['grudging', false, true, 'no_deal']);
  assert.equal(moodFor(akut, 7.6, null, 15), 'no_deal');
  assert.equal(moodFor(akut, 7.6, null, null), 'grudging', 'bez slibu jen základ');
  const ex = moodExplain(akut, 7.6, null, 15);
  assert.match(ex.text, /^Slíbeno \+15 %, kryto \+7,6 %: chybí 1,4 p\. b\. k požadavku → podpis s výhradami · slib bez krytí \(o 7,4 p\. b\. méně/);
  assert.match(ex.text, /→ bez dohody$/);
});

test('engine v3.1: „všem 15 %" se rozpadne — krytí ~51 %, většina bez dohody, protesty; status quo nedotčen', () => {
  const v = verdict(SEG, flat(15), doc.envelope.amount_mld, SCALE, RES);
  assert.ok(v.coverage > 0.5 && v.coverage < 0.52, `krytí ≈ 0,51 (má ${v.coverage})`);
  assert.equal(v.deficit, true);
  assert.ok(v.uncoveredMld > 40, `nekryto > 40 mld (má ${v.uncoveredMld})`);
  assert.ok(v.deals <= 5, `nejvýš 5 z 15 dohod (má ${v.deals})`);
  assert.ok(v.protests >= 3, `aspoň 3 protesty (má ${v.protests})`);
  assert.ok(v.brokenPromises >= 10, `většina segmentů dostala slib bez krytí (má ${v.brokenPromises})`);
  const drBoosts = v.moods.filter(m => m.mood === 'boost' && SEG.find(s => s.id === m.id).dr_segment !== false).length;
  assert.equal(drBoosts, 0, 'žádné rozšíření péče ze vzduchu u vyjednávacích segmentů (zákonné položky s požadavkem 5 % jsou kryté i při 7,6 %)');
  const t = trilemma(v);
  assert.equal(t.axes.bilance.tone, 'bad');
  assert.equal(t.axes.dohody.tone, 'bad');
  assert.match(t.axes.bilance.note, /nekryto/);
  const tk = takeaways(SEG, flat(15), v, { scale: SCALE });
  assert.equal(tk[0].id, 'deficit', 'nekrytý deficit je první věta');
  assert.match(tk[0].text, /51 % slibu/);

  // status quo: plně kryto, stejný verdikt jako dřív
  const sq = verdict(SEG, preset('status_quo'), doc.envelope.amount_mld, SCALE, RES);
  assert.equal(sq.coverage, 1);
  assert.equal(sq.deals, 12);
  assert.equal(sq.brokenPromises, 0);
  assert.equal(trilemma(sq).axes.bilance.tone, 'good');
});

test('engine v3.1: deficit do výše rezervy = polštář (bilance napjatá, žádné krácení), nad ni krátí', () => {
  // 7,5 % všem ≈ 42,2 mld: deficit 2,2 < rezerva 2,8 → kryto plně
  const v = verdict(SEG, flat(7.5), doc.envelope.amount_mld, SCALE, RES);
  assert.equal(v.deficit, true);
  assert.equal(v.coverage, 1);
  assert.equal(v.uncoveredMld, 0);
  assert.equal(trilemma(v).axes.bilance.tone, 'mid');
  assert.match(trilemma(v).axes.bilance.note, /rezerva/);
  assert.equal(takeaways(SEG, flat(7.5), v, { scale: SCALE }).find(x => x.id === 'deficit').text.includes('unese'), true);
  // 8 % všem ≈ 45 mld: deficit 5 > rezerva → krácení ~5 %, ale jen drobné (žádný zlomený slib)
  const v8 = verdict(SEG, flat(8), doc.envelope.amount_mld, SCALE, RES);
  assert.ok(v8.coverage > 0.94 && v8.coverage < 0.96, `krytí ≈ 0,95 (má ${v8.coverage})`);
  assert.equal(v8.brokenPromises, 0, 'krácení 0,4 p. b. nikoho nezlomí');
  assert.equal(trilemma(v8).axes.bilance.tone, 'bad');
});

test('engine v3.1: segmentWaitSignals s params — nekrytý slib boostu nezkracuje čekárny, protest z krácení prodlužuje', () => {
  const sig = segmentWaitSignals(SEG, flat(15), PARAMS);
  assert.equal(sig.prakticti, undefined, 'slib boostu bez krytí = žádné rozšíření hodin');
  assert.equal(sig.stomatologie, 'delsi', 'stomatologie po krácení v protestu');
  const sigNoParams = segmentWaitSignals(SEG, flat(15));
  assert.equal(sigNoParams.prakticti, 'kratsi', 'bez params se počítá ze slibu (zpětná kompatibilita)');
  const ref = segmentWaitSignals(SEG, preset('reformni'), PARAMS);
  assert.equal(ref.prakticti, 'kratsi', 'krytý boost zkracuje');
});
