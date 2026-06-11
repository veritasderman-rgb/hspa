// Drift guard pro nadpisovou hierarchii (SEO):
//   - brand v topbaru NENÍ <h1> (je <p class="brand-title">)
//   - každá obsahová stránka (článek / sekce s hero titulkem) má právě jeden <h1>
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TITLE_CLASSES = ['article-title', 'ed-hero-headline', 'hspa-hero-headline', 'hub-hero-h', 'fn-hero-headline'];

function htmlFiles() {
  return readdirSync(ROOT).filter(f => /\.html$/.test(f));
}
function hasTitleClass(html) {
  return TITLE_CLASSES.some(c => new RegExp(`class="[^"]*\\b${c}\\b`).test(html));
}

test('brand v topbaru není <h1> na obsahových stránkách (je .brand-title)', () => {
  // JS-shell / utility stránky bez statického titulku (indicator, rubrika,
  // dohodovaci-rizeni, 404, embed) si brand <h1> ponechávají — je to jejich
  // jediný statický nadpis, demotace by je nechala bez <h1>.
  for (const f of htmlFiles()) {
    const html = readFileSync(resolve(ROOT, f), 'utf8');
    if (!hasTitleClass(html)) continue;
    // Brand <h1> má dvě varianty: link-wrapped (podstránky) a bare (index).
    assert.ok(!/class="brand-link"><h1/.test(html), `${f}: brand-link nesmí obalovat <h1>`);
    assert.ok(!/<div class="brand">\s*<h1/.test(html), `${f}: brand nesmí začínat <h1>`);
  }
});

test('obsahové stránky mají právě jeden <h1> = titulek', () => {
  for (const f of htmlFiles()) {
    const html = readFileSync(resolve(ROOT, f), 'utf8');
    if (!hasTitleClass(html)) continue; // šablony bez hero titulku přeskoč
    const count = (html.match(/<h1\b/g) || []).length;
    assert.equal(count, 1, `${f} má mít právě 1 <h1> (má ${count})`);
    assert.ok(/<h1[^>]*class="[^"]*\b(article-title|ed-hero-headline|hspa-hero-headline|hub-hero-h|fn-hero-headline)\b/.test(html),
      `${f}: <h1> musí být titulková třída`);
  }
});

test('CSS nemá osiřelé .brand h1 selektory', () => {
  for (const css of ['src/styles.css', 'src/styles.min.css']) {
    const txt = readFileSync(resolve(ROOT, css), 'utf8');
    assert.ok(!/\.brand h1\b/.test(txt), `${css}: zbyl .brand h1 selektor`);
    assert.ok(/\.brand-title\b/.test(txt), `${css}: chybí .brand-title selektor`);
  }
});
