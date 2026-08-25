// Testy rutiny „Střet zájmů v poradních orgánech MZ" (FÁZE 1).
// Hlídají důkazní nároky ze zadání: co nemá zdroj, ven nejde; co je
// neověřené, nesmí do statistik; a fáze 1 nesmí tvrdit stupeň 3+.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { overIdentitu, klasifikujVazbu, jeZdravotnicky, agendaOrganu, relevanceProSkupinu, statutovaPravidla }
  from '../ingest/ppo/build-coi.js';
import { validateCoi } from '../ingest/validate-coi.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cti = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

test('coi: overIdentitu vyžaduje dva nezávislé znaky', () => {
  // jediný znak nestačí — shoda jména není důkaz (zadání §2)
  assert.equal(overIdentitu({ identita: 'profil dokládá angažmá ve Svazu, z. s.' }).overeno, false);
  // ročník + organizace
  assert.equal(overIdentitu({ identita: 'Profil (*1970) uvádí angažmá v Euthymie Praha s.r.o.' }).overeno, true);
  // různé zápisy ročníku musí platit stejně
  for (const t of ['(*1970)', 'nar. 1983', 'roč. 1959', 'ročník 1978']) {
    assert.ok(overIdentitu({ identita: `Profil ${t} a docent psychiatrie` }).overeno,
      `ročník zapsaný jako „${t}" se má rozpoznat`);
  }
  assert.equal(overIdentitu({}).overeno, false);
  assert.equal(overIdentitu({ identita: '' }).overeno, false);
});

test('coi: klasifikujVazbu rozliší povahu subjektu, odborná společnost má přednost', () => {
  assert.equal(klasifikujVazbu('Euthymie Praha s.r.o.'), 'obchodni');
  assert.equal(klasifikujVazbu('Mediclinic a.s.'), 'obchodni');
  // „Česká psychiatrická společnost z.s." je odborná společnost, ne firma
  assert.equal(klasifikujVazbu('Česká psychiatrická společnost z.s.'), 'odborna_spolecnost');
  assert.equal(klasifikujVazbu('Svaz zdravotních pojišťoven ČR, z. s.'), 'odborna_spolecnost');
  assert.equal(klasifikujVazbu('Nadační fond Nový dům'), 'nezisk');
  assert.equal(klasifikujVazbu('Něco bez formy'), 'jine');
});

test('coi: agendaOrganu čte předmět orgánu, ne název osoby', () => {
  const g4 = { predmet: 'objektivizaci posuzování návrhů na zařazování nových zdravotních výkonů', ucel: '' };
  assert.ok(agendaOrganu(g4).includes('uhrady'));
  const gStandard = { predmet: 'tvorba doporučených postupů a standardů péče', ucel: '' };
  assert.ok(agendaOrganu(gStandard).includes('normy'));
  assert.deepEqual(agendaOrganu({ predmet: 'nic konkrétního', ucel: '' }), []);
});

test('coi: relevance je konzervativní a vždy nese pravidlo i doklad', () => {
  const skupina = { id: 4, predmet: 'zařazování zdravotních výkonů a jejich úhrada', ucel: '' };
  const vazby = [{ typ_subjektu: 'obchodni', obor_zdravotnictvi: true }];
  const r = relevanceProSkupinu({ kat: 'neuvedeno' }, skupina, vazby);
  assert.ok(r, 'obchodní vazba v úhradovém orgánu je relevantní (R4)');
  assert.equal(r.stupen, 2, 'fáze 1 nikdy netvrdí víc než stupeň 2');
  assert.ok(r.pravidla.includes('R4'));
  assert.ok(r.doklad.cit.length > 0, 'relevance nese citaci předmětu orgánu');

  // orgán bez rozpoznané agendy → žádná relevance, i když vazby jsou
  assert.equal(relevanceProSkupinu({ kat: 'pojistovna' }, { id: 9, predmet: 'nic', ucel: '' }, vazby), null);
  // obchodní vazba mimo zdravotnictví relevanci nezakládá (viz test R4 níže)
  // žádná vazba → žádná relevance
  assert.equal(relevanceProSkupinu({ kat: 'neuvedeno' }, skupina, []), null);
});

test('coi: sweep statutů reprodukuje 5 z 57 (drift proti korpusu)', () => {
  const dokumenty = [
    { group_id: 1, doctype: 'statut', title: 'Statut', text: 'x'.repeat(300) },
    { group_id: 2, doctype: 'statut', title: 'Statut', text: 'x'.repeat(300) + ' střet zájmů člena ' },
    { group_id: 3, doctype: 'zapis', title: 'Zápis', text: 'střet zájmů'.repeat(50) },  // zápis se nepočítá
    { group_id: 4, doctype: 'statut', title: 'Statut', text: 'krátký' },                 // nečitelný
  ];
  const { seStatutem, sPravidlem } = statutovaPravidla(dokumenty);
  assert.deepEqual([...seStatutem].sort(), [1, 2], 'jen strojově čitelné statuty/JŘ');
  assert.deepEqual([...sPravidlem.keys()], [2]);
  assert.ok(sPravidlem.get(2).titul, 'pravidlo nese doklad (titul dokumentu)');
});

test('coi: data/ppo-coi.json projde validátorem a drží jmenovatele', () => {
  const p = path.join(ROOT, 'data', 'ppo-coi.json');
  assert.ok(fs.existsSync(p), 'chybí data/ppo-coi.json — spusť npm run build:coi');
  const coi = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ppo = cti('ppo.json');
  assert.deepEqual(validateCoi(coi, ppo), []);

  // pokrytí se musí dát dohledat — každé % má jmenovatel
  assert.equal(coi.pokryti.s_profilem + coi.pokryti.bez_profilu, coi.pokryti.osob_celkem);
  assert.equal(coi.pokryti.identita_overena + coi.pokryti.identita_neovereno, coi.pokryti.s_profilem);

  // neověřená identita nesmí nikde přispět do statistik
  for (const o of coi.osoby.filter(x => !x.overeno)) {
    assert.equal(o.relevance.length, 0, `osoba ${o.id}: neověřená, ale nese relevanci`);
  }

  // klíčové pravidlo a limity musí zůstat ve výstupu — publikují se s čísly
  assert.match(coi.metodika.klicove_pravidlo, /není obvinění/);
  assert.ok(coi.metodika.limity.some(l => /jmenovité hlasování|hlasován/i.test(l)),
    'limit o jmenovitém hlasování musí zůstat — nesmí se tvrdit, jak kdo hlasoval');
});

test('coi: orgány s pravidlem ve statutu sedí na doložený sweep', () => {
  const coi = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-coi.json'), 'utf8'));
  const sPravidlem = coi.skupiny.filter(s => s.ma_pravidlo_ve_statutu).map(s => s.g).sort((a, b) => a - b);
  assert.deepEqual(sPravidlem, [16, 199, 205, 211, 230],
    'pět orgánů s pravidlem dle článku clanek-stret-zajmu-poradni-organy-2026.html');
  assert.equal(coi.souhrn.organu_se_statutem, 57, 'jmenovatel 57 statutů');
  for (const s of coi.skupiny.filter(x => x.ma_pravidlo_ve_statutu)) {
    assert.ok(s.pravidlo_doklad?.url, `g${s.g}: pravidlo bez odkazu na dokument`);
  }
});

/* ── opravy nálezů z PR #1085 (nadhodnocená relevance) ───────────────── */

test('coi: obecné financování ani regulace nedělá z orgánu úhradový', () => {
  // Národní rada elektronického zdravotnictví — „včetně jeho financování"
  // sama o sobě NENÍ rozhodování o úhradách
  assert.deepEqual(
    agendaOrganu({ predmet: 'vyjadřuje se k otázkám digitalizace zdravotnictví včetně jeho financování', ucel: '' }),
    [], 'obecné financování není úhradová agenda');
  // Výbor pro AI — regulace není úhradová agenda
  assert.ok(!agendaOrganu({ predmet: 'koordinace a regulace umělé inteligence ve zdravotnictví', ucel: '' })
    .includes('uhrady'));
  assert.ok(!agendaOrganu({ predmet: 'schvaluje rozpočet sekretariátu', ucel: '' }).includes('uhrady'));
  // skutečná úhradová agenda se pozná dál
  assert.ok(agendaOrganu({ predmet: 'stanovení úhrad a bodových hodnot výkonů', ucel: '' }).includes('uhrady'));
  assert.ok(agendaOrganu({ predmet: 'podklady pro dohodovací řízení', ucel: '' }).includes('uhrady'));
});

test('coi: jeZdravotnicky odliší obor podle názvu, raději podinkluzivně', () => {
  assert.ok(jeZdravotnicky('Rokycanská nemocnice, a.s.'));
  assert.ok(jeZdravotnicky('Brimstone Pharma s.r.o.'));
  assert.ok(jeZdravotnicky('PSYCHIATRIE Dědina s.r.o.'));
  // tyhle R4 dřív označovalo za relevantní vazbu — nesmí se to vrátit
  assert.ok(!jeZdravotnicky('SKST Liberec, spol. s r.o.'), 'klub stolního tenisu není zdravotnický subjekt');
  assert.ok(!jeZdravotnicky('VODÁRNA PLZEŇ a.s.'), 'vodárna není zdravotnický subjekt');
  assert.ok(!jeZdravotnicky('Energie Jáchymov s.r.o.'));
});

test('coi: stupeň 2 nikdy nevznikne bez doložené vazby stupně 1', () => {
  const uhradovy = { id: 4, predmet: 'stanovení úhrad zdravotních výkonů', ucel: '' };
  // pojišťovna bez jediné doložené vazby → žádná relevance (kategorie není vazba)
  assert.equal(relevanceProSkupinu({ kat: 'pojistovna' }, uhradovy, []), null);
  assert.equal(relevanceProSkupinu({ kat: 'odborna_spolecnost' },
    { id: 9, predmet: 'tvorba standardů péče', ucel: '' }, []), null);
  // s vazbou už relevance vznikne
  assert.ok(relevanceProSkupinu({ kat: 'pojistovna' }, uhradovy,
    [{ typ_subjektu: 'jine', obor_zdravotnictvi: false }]));
});

test('coi: R4 vyžaduje obchodní vazbu působící ve zdravotnictví', () => {
  const uhradovy = { id: 4, predmet: 'stanovení úhrad zdravotních výkonů', ucel: '' };
  const nezdravotnicka = [{ typ_subjektu: 'obchodni', obor_zdravotnictvi: false }];
  const r1 = relevanceProSkupinu({ kat: 'neuvedeno' }, uhradovy, nezdravotnicka);
  assert.equal(r1, null, 'obchodní vazba mimo zdravotnictví R4 nespouští');
  const zdravotnicka = [{ typ_subjektu: 'obchodni', obor_zdravotnictvi: true }];
  assert.ok(relevanceProSkupinu({ kat: 'neuvedeno' }, uhradovy, zdravotnicka).pravidla.includes('R4'));
});

test('coi: v datech nezůstala relevance bez vazby ani R4 mimo zdravotnictví', () => {
  const coi = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-coi.json'), 'utf8'));
  assert.equal(coi.osoby.filter(o => o.relevance.length && !o.vazby.length).length, 0);
  const spatneR4 = coi.osoby.filter(o => o.relevance.some(r => r.pravidla.includes('R4'))
    && !o.vazby.some(v => v.typ_subjektu === 'obchodni' && v.obor_zdravotnictvi));
  assert.equal(spatneR4.length, 0);
});

/* ── FÁZE 2: karta na detailu orgánu ─────────────────────────────────── */

test('coi: coiKarta hlásí stav pravidla třístavově', async () => {
  const { coiKarta } = await import('../src/ppo-detail.js');
  // statut máme a pravidlo v něm je
  assert.equal(coiKarta({ clenu: 10, clenu_overeno: 3, ma_statut_v_korpusu: true,
    ma_pravidlo_ve_statutu: true }).stavPravidla, 'ma');
  // statut máme, pravidlo v něm není → „není co porušit"
  assert.equal(coiKarta({ clenu: 10, clenu_overeno: 3, ma_statut_v_korpusu: true,
    ma_pravidlo_ve_statutu: false }).stavPravidla, 'nema');
  // statut nemáme → nesmíme tvrdit, že pravidlo chybí
  assert.equal(coiKarta({ clenu: 10, clenu_overeno: 3, ma_statut_v_korpusu: false,
    ma_pravidlo_ve_statutu: false }).stavPravidla, 'nevime');
});

test('coi: coiKarta mlčí, když o orgánu nic nevíme', async () => {
  const { coiKarta } = await import('../src/ppo-detail.js');
  assert.equal(coiKarta(null), null);
  assert.equal(coiKarta({ clenu: 12, clenu_overeno: 0, ma_statut_v_korpusu: false,
    ma_pravidlo_ve_statutu: false, deklarace_v_zapisech: 0 }), null,
  'bez ověřených členů, statutu i deklarací se karta nevykresluje');
  // sám statut stačí — „pravidlo chybí" je taky sdělení
  assert.ok(coiKarta({ clenu: 12, clenu_overeno: 0, ma_statut_v_korpusu: true,
    ma_pravidlo_ve_statutu: false, deklarace_v_zapisech: 0 }));
});

test('coi: souhrnný řez je lehký, bez osobních dat a konzistentní s plným souborem', () => {
  const p = path.join(ROOT, 'data', 'ppo-coi-souhrn.json');
  assert.ok(fs.existsSync(p), 'chybí data/ppo-coi-souhrn.json — spusť npm run build:coi');
  const souhrn = JSON.parse(fs.readFileSync(p, 'utf8'));
  const plny = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo-coi.json'), 'utf8'));
  // detail skupiny nesmí kvůli číslům stahovat jmenné údaje
  assert.equal(souhrn.osoby, undefined, 'souhrnný řez nesmí obsahovat pole osoby');
  assert.ok(fs.statSync(p).size < 200 * 1024, 'souhrnný řez má zůstat malý');
  // čísla musí sedět na plný soubor
  assert.deepEqual(souhrn.skupiny, plny.skupiny);
  assert.deepEqual(souhrn.souhrn, plny.souhrn);
  assert.deepEqual(souhrn.pokryti, plny.pokryti);
  // metodika (limity + klíčové pravidlo) jede s daty, ne zvlášť
  assert.ok(souhrn.metodika?.limity?.length >= 4);
  assert.match(souhrn.metodika.klicove_pravidlo, /není obvinění/);
});
