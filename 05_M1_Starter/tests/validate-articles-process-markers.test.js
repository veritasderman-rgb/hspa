// Předpublikační formulace v TĚLE článku (nejen v hlavičce).
//
// Kontext: dávka 24 zadržených článků nesla věty typu „Článek je rozpracovaný
// draft — před publikací ověřit …" přímo v .article-sources-disclaimer.
// Detektor bannerů kouká jen do <header class="article-header">, takže je
// nezachytil, a chyběl vzor pro „rozpracovaný" (existující /pracovn[íi]\s+draft/
// sedí na „pracovní draft", ne na „rozpracovaný draft"). Tenhle test drží
// pokrytí i hranici proti falešným poplachům.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findInternalProcessNotes } from '../ingest/validate-articles.js';

const wrap = (inner) => `<html><body><main><article>${inner}</article></main></body></html>`;

test('zachytí předpublikační formulace ve viditelném těle článku', () => {
  const cases = [
    '<p>Článek je rozpracovaný draft — před publikací ověřit aktuální data.</p>',
    '<p><strong>Článek je rozpracovaný draft</strong> — čeká na redakční ověření zdrojů.</p>',
    '<p>Doplnění per-kraj čísel je bodem před publikací.</p>',
    '<p>Body 2021 a 2023 jsou v tomto draftu orientačně rekonstruovány.</p>',
    '<p>Tento draft ho uvádí kvalitativně.</p>',
    '<p>Před publikací doplnit přesné čerpání z otevřených dat.</p>',
  ];
  for (const html of cases) {
    const hits = findInternalProcessNotes(wrap(html));
    assert.ok(hits.length > 0, `neodhaleno: ${html}`);
  }
});

test('neplácne článek, který píše o cizím draftu nebo auditu', () => {
  const cases = [
    '<p>Vláda projednala rozpracovaný draft novely zákona o zdravotních službách.</p>',
    '<p>NKÚ zveřejnil audit hospodaření nemocnic.</p>',
    '<p>Ministerstvo zveřejnilo draft strategie ještě před publikací výroční zprávy.</p>',
    '<p>Data ověřena 2026-08-20 proti primárnímu zdroji; novější vlna nevyšla.</p>',
  ];
  for (const html of cases) {
    const hits = findInternalProcessNotes(wrap(html));
    assert.equal(hits.length, 0, `falešný poplach na: ${html} → ${JSON.stringify(hits)}`);
  }
});

test('poznámky v HTML komentáři jsou v pořádku — tam patří', () => {
  const html = wrap('<p>Běžný text článku.</p>')
    .replace('<main>', '<main><!-- audit: Článek je rozpracovaný draft — před publikací ověřit zdroje. -->');
  assert.equal(findInternalProcessNotes(html).length, 0);
});
