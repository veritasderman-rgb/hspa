// Stránka Příspěvky srovnávače pojišťoven: jádro (src/prispevky-engine.js), vykreslení
// (src/pojistovny-prispevky.js), dataset data/pojistovny-prispevky.json a jeho validátor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PERSONY, parseClen, parseDomacnost, serializeDomacnost, normalizeClen, clenLabel,
  stavNaroku, soucetClena, soucetDomacnosti, radkyDomacnosti, kategorieZp, castkaText, kdoText,
  seradPodminky, seradRadky, tridaPodminky,
} from '../src/prispevky-engine.js';
import {
  stavZUrl, urlZeStavu, popiskyClenu, personyHtml, temataHtml, domacnostHtml,
  souhrnHtml, tabulkaHtml, situacniHtml, podminkyHtml, prehledHtml, renderPrispevky, PODMINEK_HNED,
} from '../src/pojistovny-prispevky.js';
import { validatePrispevky, castkaVCitaci, KATEGORIE, SITUACE, KODY_ZP } from '../ingest/lib/validate-prispevky.js';
import { htmlToText, squash, polozkyKOvereni } from '../ingest/verify-pojistovny-prispevky.js';
import { ZP_STRANKY } from '../src/pojistovny-shell.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const D = JSON.parse(read('data/pojistovny-prispevky.json'));

// ── vzorová pojišťovna pro testy jádra (nezávislá na skutečných datech) ──
const P = (id, castka, kdo = {}, extra = {}) => ({
  id, nazev: id, popis: '', castka_kc: castka, castka_text: castka == null ? 'dle bodů' : `${castka} Kč`, perioda: 'rok',
  kategorie: 'pohyb', kdo: { vek_od: null, vek_do: null, pohlavi: null, situace: [], text: '', ...kdo },
  podminky: [], strop_id: null, url: 'https://example.cz/a', citace: `až ${castka} Kč`, jistota: 'ano', ...extra,
});
const ZP_T = {
  kod: '111', zkratka: 'Testovací', rozcestnik_url: 'https://example.cz', overeno_at: '2026-11-12',
  obecne_podminky: [], nenalezeno: [], poznamky: [],
  stropy: [
    { id: 'deti-zaklad', nazev: 'děti celkem', typ: 'castka', hodnota: 1500, perioda: 'rok', url: 'https://example.cz', citace: '1 500 Kč' },
    { id: 'tri-rocne', nazev: 'nejvýš 2 příspěvky', typ: 'pocet', hodnota: 2, perioda: 'rok', url: 'https://example.cz', citace: '2' },
  ],
  prispevky: [
    P('sport-deti', 1000, { vek_do: 17 }, { strop_id: 'deti-zaklad' }),
    P('zuby-deti', 1000, { vek_do: 17 }, { strop_id: 'deti-zaklad', kategorie: 'stomatologie' }),
    P('rovnatka', 2000, { vek_do: 17 }, { perioda: 'jednorazove', kategorie: 'stomatologie' }),
    P('sport-dospeli', 500, { vek_od: 18 }, { strop_id: 'tri-rocne' }),
    P('zuby-dospeli', 700, { vek_od: 18 }, { strop_id: 'tri-rocne', kategorie: 'stomatologie' }),
    P('ockovani-dospeli', 300, { vek_od: 18 }, { strop_id: 'tri-rocne', kategorie: 'ockovani' }),
    P('psa', 400, { vek_od: 40, pohlavi: 'M' }, { kategorie: 'onko_prevence' }),
    P('tehotne', 3000, { situace: ['tehotna', 'po_porodu'] }, { perioda: 'tehotenstvi', kategorie: 'tehotenstvi_porod' }),
    P('darci', 2000, { vek_od: 18, situace: ['darce'] }, { kategorie: 'darci' }),
    P('body', null, { vek_od: 18 }, { kategorie: 'ostatni' }),
    P('novorozenec', 1000, { situace: ['novorozenec'] }, { perioda: 'jednorazove', kategorie: 'tehotenstvi_porod' }),
  ],
};

test('parseClen / parseDomacnost / serializeDomacnost: kód domácnosti tam i zpět', () => {
  assert.deepEqual(parseClen('M42'), { pohlavi: 'M', vek: 42, situace: [] });
  assert.deepEqual(parseClen('Z30t'), { pohlavi: 'Z', vek: 30, situace: ['tehotna'] });
  assert.equal(parseClen('X42'), null);
  assert.equal(parseClen('M999'), null);
  const d = parseDomacnost('M42,M5,Z9,M14,nesmysl');
  assert.equal(d.length, 4);
  assert.equal(serializeDomacnost(d), 'M42,M5,Z9,M14');
  assert.equal(serializeDomacnost(parseDomacnost('Z35kd')), 'Z35kd');
  assert.equal(parseDomacnost(Array(20).fill('M30').join(',')).length, 8, 'nejvýš 8 členů');
});

test('normalizeClen: situace, které k členu nejdou, se zahodí', () => {
  assert.deepEqual(normalizeClen({ pohlavi: 'M', vek: 30, situace: ['tehotna', 'darce'] }).situace, ['darce']);
  assert.deepEqual(normalizeClen({ pohlavi: 'Z', vek: 9, situace: ['tehotna', 'darce', 'diagnoza'] }).situace, ['diagnoza']);
  assert.equal(normalizeClen({ pohlavi: 'Z', vek: 300 }).vek, 110);
});

test('clenLabel a popiskyClenu: děti jako syn / dcera, shodné popisky s pořadím', () => {
  assert.equal(clenLabel({ pohlavi: 'M', vek: 42 }), 'muž 42');
  assert.equal(clenLabel({ pohlavi: 'Z', vek: 9 }), 'dcera 9');
  assert.deepEqual(popiskyClenu(parseDomacnost('M42,M5,M5')), ['muž 42', 'syn 5', 'syn 5 (2)']);
});

test('stavNaroku: věk, pohlaví a situace', () => {
  const otec = parseClen('M42');
  const dcera = parseClen('Z9');
  const tehotna = parseClen('Z30t');
  const by = (id) => ZP_T.prispevky.find((p) => p.id === id);
  assert.equal(stavNaroku(by('sport-deti'), otec), 'ne');
  assert.equal(stavNaroku(by('sport-deti'), dcera), 'ano');
  assert.equal(stavNaroku(by('psa'), otec), 'ano');
  assert.equal(stavNaroku(by('psa'), parseClen('Z42')), 'ne');
  assert.equal(stavNaroku(by('psa'), parseClen('M39')), 'ne');
  assert.equal(stavNaroku(by('tehotne'), tehotna), 'ano');
  assert.equal(stavNaroku(by('tehotne'), parseClen('Z30')), 'situace');
  assert.equal(stavNaroku(by('tehotne'), otec), 'ne', 'těhotenský příspěvek muž nedostane ani jako „situaci“');
  assert.equal(stavNaroku(by('tehotne'), dcera), 'ne');
  assert.equal(stavNaroku(by('darci'), otec), 'situace');
  assert.equal(stavNaroku(by('darci'), parseClen('M42k')), 'ano');
  assert.equal(stavNaroku(by('novorozenec'), parseClen('Z0')), 'ano', 'dítě do 1 roku je novorozenec bez zaškrtávání');
  assert.equal(stavNaroku(by('novorozenec'), otec), 'ne', 'novorozenecký příspěvek se dospělému nenabízí');
  assert.equal(stavNaroku(by('novorozenec'), tehotna), 'situace', 'těhotné se nabídne jako budoucí');
  assert.equal(stavNaroku(by('darci'), dcera), 'ne', 'dítě nemůže být dárce');
});

test('stavNaroku: víc situací = životní fáze stačí jedna, ostatní musí platit všechny', () => {
  const dieta = P('dieta-student', 8000, { vek_od: 18, vek_do: 25, situace: ['diagnoza', 'student'] });
  assert.equal(stavNaroku(dieta, parseClen('M20s')), 'situace', 'student bez diagnózy nárok nemá');
  assert.equal(stavNaroku(dieta, parseClen('M20d')), 'situace', 'diagnóza bez statusu studenta nestačí');
  assert.equal(stavNaroku(dieta, parseClen('M20sd')), 'ano');
  const nedonosene = P('nedonosene', 3000, { vek_do: 0, situace: ['novorozenec', 'diagnoza'] });
  assert.equal(stavNaroku(nedonosene, parseClen('M0')), 'situace', 'zdravé miminko příspěvek pro nedonošené nedostane');
  assert.equal(stavNaroku(nedonosene, parseClen('M0d')), 'ano');
  const sbory = P('sbory', 3500, { situace: ['profese', 'darce'] });
  assert.equal(stavNaroku(sbory, parseClen('M40k')), 'situace', 'dárce, který není z vybrané profese');
  const organ = P('organ', 10000, { situace: ['darce', 'jine'] });
  assert.equal(stavNaroku(organ, parseClen('M40k')), 'situace', 'dárce krve není dárce orgánu');
  assert.equal(stavNaroku(organ, parseClen('Z9')), 'ne', 'dítě dárcem být nemůže, nenabízí se ani podmíněně');
  const nipt = P('nipt', 4000, { pohlavi: 'Z', situace: ['tehotna', 'diagnoza'] });
  assert.equal(stavNaroku(nipt, parseClen('Z30t')), 'situace');
  assert.equal(stavNaroku(nipt, parseClen('Z30td')), 'ano');
  const obe = P('obe', 3000, { pohlavi: 'Z', situace: ['tehotna', 'po_porodu'] });
  assert.equal(stavNaroku(obe, parseClen('Z30p')), 'ano', 'těhotná NEBO po porodu');
});

test('dataset: příspěvek vázaný na dvě podmínky se nepočítá tomu, kdo splní jen jednu', () => {
  const soucet = (kod, clen) => soucetClena(D.pojistovny.find((z) => z.kod === kod), parseClen(clen));
  const ma = (kod, clen, id) => soucet(kod, clen).polozky.some((p) => p.id === id);
  assert.equal(ma('111', 'M20s', 'dieta-bezlepkova-studenti'), false, 'VZP: student bez celiakie');
  assert.equal(ma('111', 'M0', 'nedonosene-miminko'), false, 'VZP: donošené miminko');
  assert.equal(ma('211', 'M40k', 'prispevek-za-1-odber-v-roce'), false, 'ZP MV: dárce mimo bezpečnostní sbory');
  assert.equal(ma('211', 'Z30p', 'podpora-vicercat'), false, 'ZP MV: žena po porodu jednoho dítěte');
  assert.equal(ma('111', 'M40k', 'darce-organu'), false, 'VZP: dárce krve není dárce orgánu');
  assert.equal(ma('211', 'M42', 'ockovani-rotaviry'), false, 'ZP MV: rotaviry jen kojencům');
});

test('dataset: vzájemně se vylučující příspěvky mají společný strop', () => {
  const zp = (kod) => D.pojistovny.find((z) => z.kod === kod);
  const strop = (kod, clen, id) => soucetClena(zp(kod), parseClen(clen)).stropy.find((s) => s.id === id);
  assert.equal(strop('111', 'Z9d', 'dieta-bezlepkova-nebo-nizkobilkovinna').uznano, 12000, 'VZP: jen jedna z diet');
  assert.equal(strop('111', 'M40k', 'darce-krve-aktivni-nebo-neaktivni').uznano, 3000, 'VZP: aktivní, nebo neaktivní dárce');
  assert.equal(strop('213', 'M40k', 'darci-pasmo-podle-poctu-odberu').uznano, 3000, 'RBP: jedno pásmo podle počtu odběrů');
  assert.equal(strop('201', 'M40k', 'darci-oceneni-jedno-v-roce').uznano, 4000, 'VoZP: jedno ocenění');
  assert.equal(strop('205', 'M40k', 'darci-oceneni-jedno-v-roce').uznano, 3500, 'ČPZP: jedno ocenění');
  assert.equal(strop('209', 'M20sd', 'celiakie-student-nebo-dospely').uznano, 8000, 'ZPŠ: studentská, nebo dospělá sazba');
  assert.equal(strop('211', 'M40k', 'darci-krve-lazne-nebo-alternativa').uznano, 5000, 'ZP MV: lázně, alternativa, nebo prvodárce');
  for (const z of D.pojistovny) for (const s of z.stropy.filter((x) => x.druh === 'navyseni')) {
    assert.ok(!z.prispevky.some((p) => p.strop_id === s.id), `${z.kod} ${s.id}: navýšení není strop`);
  }
});

test('seradPodminky: nárok a souběh nahoře, doklady a podání žádosti dole, uvnitř skupiny pořadí z dat', () => {
  const vstup = [
    'žádat lze pouze prostřednictvím aplikace Moje VZP',
    'platební doklady s datem úhrady od 1. 1. 2026',
    'permanentka minimálně v hodnotě 800 Kč',
    'nelze kombinovat s variantou sport',
    'doklad o diagnóze při prvním podání žádosti',
    'absolvovaná preventivní prohlídka u praktického lékaře',
    'jen sporty ze seznamu',
  ];
  assert.deepEqual(seradPodminky(vstup), [
    'absolvovaná preventivní prohlídka u praktického lékaře',
    'nelze kombinovat s variantou sport',
    'doklad o diagnóze při prvním podání žádosti',
    'permanentka minimálně v hodnotě 800 Kč',
    'jen sporty ze seznamu',
    'platební doklady s datem úhrady od 1. 1. 2026',
    'žádat lze pouze prostřednictvím aplikace Moje VZP',
  ]);
  assert.equal(vstup[0], 'žádat lze pouze prostřednictvím aplikace Moje VZP', 'vstup se nemění');
  assert.deepEqual(seradPodminky(null), []);
  assert.equal(tridaPodminky('Žádost lze podat pouze elektronicky (eKomunikace)'), 5);
  for (const z of D.pojistovny) for (const p of z.prispevky) {
    assert.deepEqual([...seradPodminky(p.podminky)].sort(), [...p.podminky].sort(), `${z.kod} ${p.id}: řazení nic neztratí`);
  }
});

test('seradRadky: uvnitř tématu od nejvyšší částky, bez částky nakonec, shoda drží pořadí z dat', () => {
  const r = (id, castka) => ({ prispevek: { id, castka_kc: castka } });
  assert.deepEqual(seradRadky([r('a', 500), r('b', null), r('c', 2000), r('d', 500)]).map((x) => x.prispevek.id), ['c', 'a', 'd', 'b']);
});

test('tabulka: žádná podmínka se neztratí, od čtvrté dál jsou po rozkliknutí', () => {
  const podminky = ['žádost do 30. 11. 2026', 'doklad o úhradě', 'jen plavání', 'preventivní prohlídka u praktického lékaře', 'nelze kombinovat s X'];
  const zp = { ...ZP_T, prispevky: [P('x', 100, {}, { podminky })] };
  const html = tabulkaHtml(zp, parseDomacnost('M42'), { tema: null }, KATEGORIE.map((id) => ({ id, label: id })));
  for (const t of podminky) assert.ok(html.includes(t), t);
  assert.match(html, new RegExp(`další podmínky \\(${podminky.length - PODMINEK_HNED}\\)`));
  assert.ok(html.indexOf('preventivní prohlídka') < html.indexOf('<details'), 'preventivní prohlídka je vidět hned');
  assert.ok(html.indexOf('žádost do 30. 11. 2026') > html.indexOf('<details'), 'lhůta žádosti až po rozkliknutí');
  const kratke = tabulkaHtml({ ...ZP_T, prispevky: [P('y', 100, {}, { podminky: ['a', 'b'] })] }, parseDomacnost('M42'), { tema: null }, KATEGORIE.map((id) => ({ id, label: id })));
  assert.doesNotMatch(kratke, /další podmínky/);
});

test('podminkyHtml: navýšení limitu převodem není mezi společnými stropy', () => {
  const zp = { ...ZP_T, stropy: [...ZP_T.stropy, { id: 'navyseni-x', druh: 'navyseni', nazev: 'Navýšení převodem', typ: 'castka', hodnota: 10000, perioda: 'rok', url: 'https://example.cz', citace: '10 000 Kč' }] };
  const html = podminkyHtml(zp);
  assert.match(html, /Navýšení limitu převodem od jiných pojištěnců/);
  assert.ok(html.indexOf('Navýšení převodem') > html.indexOf('Navýšení limitu převodem od jiných pojištěnců'));
  assert.match(html, /nejvýš 2 různé/);
});

test('soucetClena: společný strop v Kč, strop na počet, jednorázové zvlášť, bez částky mimo součet', () => {
  const dite = soucetClena(ZP_T, parseClen('Z9'));
  assert.equal(dite.rocne, 1500, 'sport 1000 + zuby 1000 oříznuto stropem 1500');
  assert.equal(dite.jednorazove, 2000, 'rovnátka');
  assert.equal(dite.stropy[0].orezano, true);
  const otec = soucetClena(ZP_T, parseClen('M42'));
  assert.equal(otec.rocne, 700 + 500 + 400, 'dva nejvyšší ze tří (700 + 500) + PSA 400');
  assert.equal(otec.jednorazove, 0);
  assert.equal(otec.bezCastky, 1);
  const tehotna = soucetClena(ZP_T, parseClen('Z30t'));
  assert.equal(tehotna.jednorazove, 3000);
  assert.equal(soucetClena(ZP_T, parseClen('Z9'), { kategorie: 'stomatologie' }).rocne, 1000, 'filtr tématu');
});

test('soucetDomacnosti: otec 42 a tři děti', () => {
  const s = soucetDomacnosti(ZP_T, parseDomacnost('M42,M5,Z9,M14'));
  assert.equal(s.rocne, 1600 + 3 * 1500);
  assert.equal(s.jednorazove, 3 * 2000);
  assert.equal(s.poClenech.length, 4);
});

test('radkyDomacnosti: u každého příspěvku kdo z domácnosti, situační zvlášť', () => {
  const r = radkyDomacnosti(ZP_T, parseDomacnost('M42,M5,Z9,M14'));
  const sport = r.hlavni.find((x) => x.prispevek.id === 'sport-deti');
  assert.deepEqual(sport.kdo.map((k) => k.i), [1, 2, 3]);
  assert.ok(r.hlavni.some((x) => x.prispevek.id === 'psa'));
  assert.deepEqual(r.situacni.map((x) => x.prispevek.id), ['darci'], 'těhotenský příspěvek se otci s dětmi nenabízí ani podmíněně');
  assert.equal(radkyDomacnosti(ZP_T, parseDomacnost('Z30')).situacni.some((x) => x.prispevek.id === 'tehotne'), true);
});

test('kategorieZp, castkaText, kdoText', () => {
  const cis = KATEGORIE.map((id) => ({ id, label: id }));
  assert.deepEqual(kategorieZp(ZP_T, cis).map((k) => k.id), ['stomatologie', 'ockovani', 'pohyb', 'tehotenstvi_porod', 'onko_prevence', 'darci', 'ostatni']);
  assert.equal(castkaText({ castka_kc: 1500 }), '1 500 Kč');
  assert.equal(castkaText({ castka_kc: null, castka_text: 'dle bodů' }), 'dle bodů');
  assert.equal(kdoText({ kdo: { vek_od: 40, vek_do: null, pohlavi: 'M', situace: [] } }), 'muži od 40 let');
  assert.equal(kdoText({ kdo: { vek_od: null, vek_do: 17, pohlavi: null, situace: [] } }), 'do 17 let');
  assert.equal(kdoText({ kdo: { vek_od: null, vek_do: null, pohlavi: null, situace: ['tehotna', 'po_porodu'] } }), 'těhotné nebo po porodu');
  assert.equal(kdoText({ kdo: {} }), 'všichni pojištěnci');
});

test('PERSONY: každá předvolba je platná domácnost a téma je z číselníku', () => {
  assert.equal(PERSONY[0].id, 'otec-3-deti');
  for (const p of PERSONY) {
    const d = parseDomacnost(p.kod);
    assert.ok(d.length >= 1, p.id);
    assert.equal(serializeDomacnost(d), p.kod, `${p.id}: kód se po normalizaci nemění`);
    if (p.tema) assert.ok(KATEGORIE.includes(p.tema), p.id);
  }
});

test('stavZUrl a urlZeStavu: výchozí pohled, sdílení, pojišťovna z URL má přednost před uloženou', () => {
  const s0 = stavZUrl('', null);
  assert.equal(serializeDomacnost(s0.clenove), 'M42,M5,Z9,M14');
  assert.equal(s0.zp, null);
  assert.equal(stavZUrl('', '205').zp, '205');
  assert.equal(stavZUrl('?zp=111', '205').zp, '111');
  assert.equal(stavZUrl('?zp=999', null).zp, null);
  const s1 = stavZUrl('?d=Z30t&tema=tehotenstvi_porod', null);
  assert.equal(urlZeStavu(s1), '?d=Z30t&tema=tehotenstvi_porod');
  assert.equal(stavZUrl('?pohled=psychika', null).tema, 'dusevni_zdravi');
});

test('vykreslení: ovládání, souhrn, tabulka s tím, kdo může čerpat, a přehled bez řazení', () => {
  const stav = { zp: '111', clenove: parseDomacnost('M42,M5,Z9,M14'), tema: null };
  const cis = KATEGORIE.map((id) => ({ id, label: `Kat ${id}` }));
  assert.match(personyHtml(stav), /data-persona="otec-3-deti" aria-pressed="true"/);
  assert.match(temataHtml(cis, stav), /data-tema="" aria-pressed="true"/);
  const dom = domacnostHtml(stav.clenove);
  assert.equal((dom.match(/class="zpp-clen"/g) || []).length, 4);
  assert.doesNotMatch(dom, /data-clen="1" data-sit="darce"/, 'dítě nemůže být dárce');
  assert.match(dom, /data-clen="0" data-sit="darce"/);
  const sou = souhrnHtml(ZP_T, stav.clenove, stav);
  assert.match(sou, /6 100<\/b>/);
  assert.match(sou, /Kč ročně/);
  assert.match(sou, /nenárokové/);
  const tab = tabulkaHtml(ZP_T, stav.clenove, stav, cis);
  assert.match(tab, /<th scope="colgroup" colspan="5">Kat stomatologie<\/th>/);
  assert.match(tab, /<li>syn 5<\/li><li>dcera 9<\/li><li>syn 14<\/li>/);
  assert.match(tab, /společný strop: děti celkem/);
  assert.match(tab, /href="https:\/\/example\.cz\/a"/);
  assert.doesNotMatch(tab, />darci</, 'situační příspěvek není v hlavní tabulce');
  assert.match(situacniHtml(ZP_T, stav.clenove, stav), /darci/);
  assert.match(podminkyHtml(ZP_T), /1 500 Kč/);
  const D7 = { kategorie: cis, pojistovny: KODY_ZP.map((kod) => ({ ...ZP_T, kod })) };
  const pre = prehledHtml(D7, stav.clenove, stav);
  assert.deepEqual([...pre.matchAll(/data-zp="(\d+)"/g)].map((m) => m[1]), KODY_ZP, 'pořadí podle kódu, žádné řazení podle částky');
  assert.match(pre, /ne o hodnocení/);
  const bez = renderPrispevky(D7, { ...stav, zp: null });
  assert.match(bez, /Vyberte nahoře svou pojišťovnu/);
  assert.match(bez, /<details class="zpc-acc zpc-acc--tbl" open>/);
  assert.match(renderPrispevky(D7, stav), /zppVysH/);
});

test('vykreslení escapuje text z datasetu', () => {
  const zp = { ...ZP_T, prispevky: [P('x', 100, {}, { nazev: '<img src=x onerror=1>', podminky: ['<b>'] })] };
  const html = tabulkaHtml(zp, parseDomacnost('M42'), { tema: null }, KATEGORIE.map((id) => ({ id, label: id })));
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

// ── skutečný dataset ──

test('data/pojistovny-prispevky.json projde validátorem', () => {
  const r = validatePrispevky(D);
  assert.deepEqual(r.errors, []);
  assert.ok(r.checks > 100);
});

test('dataset: 7 pojišťoven, každá má příspěvky pro děti i dospělé a každá částka zdroj na webu pojišťovny', () => {
  assert.deepEqual(D.pojistovny.map((z) => z.kod), KODY_ZP);
  const DOMENY = { 111: 'vzp.cz', 201: 'vozp.cz', 205: 'cpzp.cz', 207: 'ozp.cz', 209: 'zpskoda.cz', 211: 'zpmvcr.cz', 213: 'rbp213.cz' };
  for (const z of D.pojistovny) {
    assert.ok(z.prispevky.length >= 5, `${z.kod}: aspoň 5 příspěvků`);
    assert.ok(radkyDomacnosti(z, parseDomacnost('Z9')).hlavni.length > 0, `${z.kod}: něco pro dítě`);
    assert.ok(radkyDomacnosti(z, parseDomacnost('M42')).hlavni.length > 0, `${z.kod}: něco pro dospělého`);
    for (const p of z.prispevky) {
      const host = new URL(p.url).hostname;
      assert.ok(host === DOMENY[z.kod] || host.endsWith(`.${DOMENY[z.kod]}`), `${z.kod} ${p.id}: zdroj ${host} není web pojišťovny`);
    }
  }
});

test('dataset: součet výchozí domácnosti je u každé pojišťovny konečné nezáporné číslo', () => {
  const dom = parseDomacnost(PERSONY[0].kod);
  for (const z of D.pojistovny) {
    const s = soucetDomacnosti(z, dom);
    assert.ok(Number.isFinite(s.rocne) && s.rocne >= 0, z.kod);
    assert.ok(Number.isFinite(s.jednorazove) && s.jednorazove >= 0, z.kod);
    assert.match(renderPrispevky(D, { zp: z.kod, clenove: dom, tema: null }), /zppVysH/);
  }
});

test('validátor: chytí chybějící zdroj, neznámou kategorii, neexistující strop a špatné věky', () => {
  const kopie = () => JSON.parse(JSON.stringify(D));
  const zmen = (fn) => { const d = kopie(); fn(d.pojistovny[0].prispevky[0], d); return validatePrispevky(d).errors.join('\n'); };
  assert.match(zmen((p) => { p.url = 'http://example.cz'; }), /url: musí začínat https/);
  assert.match(zmen((p) => { p.citace = ''; }), /citace/);
  assert.match(zmen((p) => { p.kategorie = 'jina'; }), /kategorie: neznámá/);
  assert.match(zmen((p) => { p.strop_id = 'neexistuje'; }), /není ve stropy/);
  assert.match(zmen((p) => { p.kdo.vek_od = 50; p.kdo.vek_do = 10; }), /vek_od > vek_do/);
  assert.match(zmen((p) => { p.castka_kc = -5; }), /castka_kc/);
  assert.match(zmen((p, d) => { d.pojistovny.reverse(); }), /v pořadí kódu/);
  assert.equal(SITUACE.includes('tehotna'), true);
});

test('castkaVCitaci: částka zapsaná s mezerou, tečkou i bez oddělovače', () => {
  assert.equal(castkaVCitaci(1000, 'až 1 000 Kč ročně'), true);
  assert.equal(castkaVCitaci(1000, 'až 1 000 Kč'), true);
  assert.equal(castkaVCitaci(1500, 'do výše 1.500,- Kč'), true);
  assert.equal(castkaVCitaci(500, 'příspěvek 500 Kč'), true);
  assert.equal(castkaVCitaci(700, 'příspěvek 500 Kč'), false);
});

test('ověřovač citací: převod HTML na text, porovnání bez bílých znaků, seznam položek', () => {
  assert.equal(squash(htmlToText('<p>až <strong>1&nbsp;000 Kč</strong><br>ročně</p><script>x</script>')), 'až1000Kčročně');
  assert.equal(squash('až 1 000 Kč\n ročně'), 'až1000Kčročně');
  assert.equal(htmlToText('p&rcaron;&iacute;sp&ecaron;vek &scaron;&uring;&Zcaron; &bdquo;a&ldquo;'), 'příspěvek šůŽ „a“');
  const items = polozkyKOvereni(D, '111');
  assert.ok(items.length > 0 && items.every((i) => i.kod === '111' && i.url && i.citace));
});

test('stránka a zapojení: kontejnery, záložka, noindex, sitemap, e2e seznamy', () => {
  const html = read('pojistovny-prispevky.html');
  for (const id of ['zpShell', 'zpMojeZp', 'zpPrispevky', 'zpZdroje']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /data-aktivni="prispevky"/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.match(html, /src="src\/pojistovny-prispevky\.js"/);
  assert.match(html, /nejsou nárokové/);
  assert.match(html, /není hodnocení pojišťovny/);
  const s = ZP_STRANKY.find((x) => x.id === 'prispevky');
  assert.equal(s.href, 'pojistovny-prispevky.html');
  assert.equal(s.skupina, 'pojistenci');
  assert.match(read('scripts/generate-sitemap.js'), /'\/pojistovny-prispevky\.html': \{ typ: 'noindex'/);
  assert.match(read('tests/e2e/a11y.spec.js'), /pojistovny-prispevky\.html/);
  assert.match(read('tests/e2e/visual.spec.js'), /pojistovny-prispevky\.html/);
  assert.match(read('tests/a11y/axe-scan.mjs'), /'pojistovny-prispevky\.html'/);
  assert.match(read('ingest/validate-pojistovny.js'), /prispevky: 'pojistovny-prispevky\.json'/);
});
