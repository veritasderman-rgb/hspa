// Okresní landing pages pohotovostí — builder a jeho výstupy.
//
// Záměrně se NEtestuje, že commitnuté stránky jsou bit po bitu synchronní
// s data/pohotovosti.json — přesně takový drift-test dělal z každého PR
// konflikt (viz CLAUDE.md o generovaných artefaktech). Synchronizaci
// obstarává týdenní cron; tady se hlídá, že builder produkuje validní
// stránky a manifest sedí na soubory.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { okresSlug } from '../src/pohotovosti-engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data/pohotovosti-okresy.json'), 'utf8'));

test('okresy · manifest pokrývá republiku a soubory existují', () => {
  assert.ok(manifest.okresy.length >= 70, `jen ${manifest.okresy.length} okresů`);
  for (const o of manifest.okresy) {
    assert.equal(o.slug, okresSlug(o.okres), `${o.okres}: slug nesedí na sdílenou definici`);
    assert.ok(fs.existsSync(path.resolve(ROOT, `pohotovost-${o.slug}.html`)),
      `chybí pohotovost-${o.slug}.html`);
    assert.ok(o.places >= 1);
    assert.match(o.kraj_code ?? '', /^CZ0\d{2}$/);
  }
  // Slug je zároveň identita souboru — duplicitní slug by tiše přepsal cizí okres.
  const slugs = manifest.okresy.map(o => o.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicitní slug');
});

test('okresy · stránka nese statický obsah, JSON-LD s hodinami a canonical', () => {
  const sample = manifest.okresy.find(o => o.slug === 'klatovy') ?? manifest.okresy[0];
  const html = fs.readFileSync(path.resolve(ROOT, `pohotovost-${sample.slug}.html`), 'utf8');

  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.ok(html.includes(`rel="canonical" href="https://skorezdravotnictvi.cz/pohotovost-${sample.slug}"`));
  assert.ok(html.includes(`okrese ${sample.okres}`), 'h1/lead musí jmenovat okres');
  // Obsah je v HTML staticky — crawler nespouští JS.
  assert.match(html, /class="pokr-hours"|pokr-hours-none/);
  assert.match(html, /href="tel:\+420/);
  assert.match(html, /href="pohotovosti.html"/, 'odkaz na celostátní vyhledávání');

  const ldMatch = /<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/.exec(html);
  assert.ok(ldMatch, 'chybí JSON-LD');
  const ld = JSON.parse(ldMatch[1]);
  assert.equal(ld['@type'], 'ItemList');
  assert.equal(ld.itemListElement.length, sample.places);
  const withHours = ld.itemListElement.filter(i => i.item.openingHoursSpecification?.length);
  assert.ok(withHours.length >= 1, 'aspoň jedno pracoviště musí mít openingHoursSpecification');
  for (const spec of withHours.flatMap(i => i.item.openingHoursSpecification)) {
    assert.match(spec.opens, /^\d{2}:\d{2}$/);
    assert.match(spec.closes, /^\d{2}:\d{2}$/);
    assert.notEqual(spec.closes, '24:00', 'schema.org nezná 24:00 — mapuje se na 23:59');
  }
});

test('okresy · data-hours na kartách je parsovatelné (živé badge z něj čtou)', () => {
  const sample = manifest.okresy[0];
  const html = fs.readFileSync(path.resolve(ROOT, `pohotovost-${sample.slug}.html`), 'utf8');
  const attrs = [...html.matchAll(/data-hours="([^"]*)"/g)];
  assert.equal(attrs.length, sample.places);
  for (const [, raw] of attrs) {
    const decoded = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    JSON.parse(decoded); // nesmí hodit
  }
});

test('okresy · sitemap zná všechny okresní stránky', () => {
  const xml = fs.readFileSync(path.resolve(ROOT, 'sitemap.xml'), 'utf8');
  for (const o of manifest.okresy) {
    assert.ok(xml.includes(`/pohotovost-${o.slug}<`), `sitemap: chybí pohotovost-${o.slug}`);
  }
});
