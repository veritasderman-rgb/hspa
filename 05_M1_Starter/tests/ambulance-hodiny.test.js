// Crawler denních nemocničních ambulancí — hledá kandidáty, nepublikuje fakta.
//
// Testy hlídají hlavně to, čím se crawler v ostrém běhu spálil: mezi
// „ordinačními hodinami“ se na nemocničních webech míchají polední pauzy,
// návštěvní doba na lůžkovém oddělení a časy odběrové místnosti.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  norm,
  stripHtml,
  candidateLinks,
  extractHourCandidates,
  hospitalTargets,
} from '../ingest/fetchers/ambulance_hodiny.js';

test('stripHtml · vyhodí skripty a styly, zachová text', () => {
  const html = '<div><script>var x = "úrazová ambulance 7:00";</script>'
    + '<style>.a{color:red}</style><p>Úrazová ambulance</p><p>7:00&nbsp;–&nbsp;15:00</p></div>';
  const text = stripHtml(html);
  assert.ok(!text.includes('var x'), 'obsah <script> se nesmí dostat do textu');
  assert.ok(!text.includes('color:red'));
  assert.ok(text.includes('Úrazová ambulance'));
  assert.ok(text.includes('7:00'));
});

test('candidateLinks · bere jen odkazy k akutní péči a jen na doméně nemocnice', () => {
  const html = `
    <a href="/urazova-ambulance">Úrazová ambulance</a>
    <a href="/kariera">Kariéra</a>
    <a href="https://facebook.com/nemocnice/pohotovost">Pohotovost na Facebooku</a>
    <a href="/dokument.pdf">Pohotovost — leták</a>
    <a href="mailto:info@nemocnice.cz">Pohotovost e-mailem</a>`;
  const links = candidateLinks(html, 'https://nemocnice.cz/');
  const hrefs = links.map(l => l.url);

  assert.deepEqual(hrefs, ['https://nemocnice.cz/urazova-ambulance']);
});

test('candidateLinks · konkrétní „úrazová“ má přednost před obecným „pro pacienty“', () => {
  const html = `
    <a href="/pro-pacienty">Pro pacienty</a>
    <a href="/pohotovost">Pohotovost</a>`;
  const links = candidateLinks(html, 'https://nemocnice.cz/');
  assert.equal(links[0].url, 'https://nemocnice.cz/pohotovost');
});

test('extractHourCandidates · bere časy jen v okolí akutního klíčového slova', () => {
  const text = 'Kardiologická poradna ordinuje 8:00 - 12:00. '
    + 'Úrazová ambulance má otevřeno 7:00 - 15:00.';
  const hits = extractHourCandidates(text, { window: 60 });
  const ranges = hits.map(h => h.range);

  assert.ok(ranges.includes('7:00 - 15:00'));
  assert.ok(!ranges.includes('8:00 - 12:00'), 'kardiologická poradna sem nepatří');
});

test('extractHourCandidates · zahodí polední pauzu i návštěvní hodiny', () => {
  // Přesně tyhle dva vzorce se v ostrém běhu tvářily jako provozní doba.
  const pauza = 'Chirurgická ambulance, polední pauza 12:30 - 13:00.';
  const navstevy = 'Úrazová ambulance. Návštěvní hodiny na lůžkovém oddělení 14:00 - 16:30.';

  assert.equal(extractHourCandidates(pauza).length, 0);
  assert.equal(extractHourCandidates(navstevy).length, 0);
});

test('extractHourCandidates · vrací i větu okolo, aby šlo číslo ověřit', () => {
  const text = 'Úrazová pohotovost. Ordinační doba pondělí až pátek 15:30 - 07:00.';
  const [hit] = extractHourCandidates(text);
  assert.equal(hit.range, '15:30 - 07:00');
  assert.ok(hit.snippet.includes('Ordinační doba'), 'bez kontextu se údaj nedá ověřit');
});

test('hospitalTargets · vybere nemocnice s akutním oborem, ambulancí a webem', () => {
  const rows = [
    { poskytovatel_ICO: '1', poskytovatel_nazev: 'Nemocnice A', ZZ_druh_nazev: 'Nemocnice',
      ZZ_obor_pece: 'chirurgie, vnitřní lékařství', ZZ_forma_pece: 'ambulantní péče',
      poskytovatel_web: 'www.a.cz', ZZ_obec: 'Město', ZZ_kraj_nazev: 'Kraj' },
    { poskytovatel_ICO: '2', poskytovatel_nazev: 'Nemocnice bez webu', ZZ_druh_nazev: 'Nemocnice',
      ZZ_obor_pece: 'chirurgie', ZZ_forma_pece: 'ambulantní péče', poskytovatel_web: '' },
    { poskytovatel_ICO: '3', poskytovatel_nazev: 'Ordinace praktika', ZZ_druh_nazev: 'Samostatná ordinace',
      ZZ_obor_pece: 'chirurgie', ZZ_forma_pece: 'ambulantní péče', poskytovatel_web: 'www.c.cz' },
    { poskytovatel_ICO: '4', poskytovatel_nazev: 'Nemocnice jen lůžka', ZZ_druh_nazev: 'Nemocnice',
      ZZ_obor_pece: 'chirurgie', ZZ_forma_pece: 'lůžková péče', poskytovatel_web: 'www.d.cz' },
    { poskytovatel_ICO: '5', poskytovatel_nazev: 'Nemocnice oční', ZZ_druh_nazev: 'Nemocnice',
      ZZ_obor_pece: 'oftalmologie', ZZ_forma_pece: 'ambulantní péče', poskytovatel_web: 'www.e.cz' },
  ];
  const targets = hospitalTargets(rows);

  assert.deepEqual(targets.map(t => t.ico), ['1']);
  assert.equal(targets[0].web, 'http://www.a.cz', 'web bez schématu se doplní');
});

test('hospitalTargets · jeden poskytovatel jen jednou', () => {
  const row = { poskytovatel_ICO: '1', poskytovatel_nazev: 'Nemocnice', ZZ_druh_nazev: 'Nemocnice',
    ZZ_obor_pece: 'chirurgie', ZZ_forma_pece: 'ambulantní péče', poskytovatel_web: 'https://a.cz' };
  assert.equal(hospitalTargets([row, { ...row }, { ...row }]).length, 1);
});

test('norm · srovná diakritiku i velikost písmen', () => {
  assert.equal(norm('Úrazová AMBULANCE'), 'urazova ambulance');
});

test('extractHourCandidates · nadpis s tečkou nad rozpisem zůstane v kontextu', () => {
  // Regrese: dřívější verze řezala kontext na každé hranici věty, takže
  // z „Úrazová pohotovost. Ordinační doba…“ zbyl rozpis bez klíčového slova
  // a nález propadl.
  const text = 'Úrazová pohotovost. Ordinační doba pondělí až pátek 15:30 - 07:00.';
  const [hit] = extractHourCandidates(text);
  assert.ok(hit, 'nález nesmí propadnout kvůli tečce za nadpisem');
  assert.equal(hit.range, '15:30 - 07:00');
});

test('extractHourCandidates · nezacyklí se na textu s více rozsahy', () => {
  // Regrese: `trimToSentence` sahal po sdílené instanci RANGE_RE a nulováním
  // jejího `lastIndex` zacyklil smyčku, která ji právě procházela.
  const text = Array.from({ length: 30 },
    (_, i) => `Úrazová ambulance ${i}. Ordinační doba 7:0${i % 10} - 15:00.`).join(' ');
  const hits = extractHourCandidates(text);
  assert.ok(hits.length > 0 && hits.length <= 12);
});
