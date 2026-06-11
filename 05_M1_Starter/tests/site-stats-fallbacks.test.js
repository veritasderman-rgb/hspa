// Drift guard: statické fallback hodnoty v HTML (data-stat="...") musí
// odpovídat skutečným číslům z data/indicators.json. Bez tohoto testu čísla
// v copy tiše stárnou (UX audit 2026-06-11, nález §3) — JS je za běhu sice
// přepíše, ale crawlerům a čtenářům bez JS zůstává HTML fallback.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSiteStats } from '../src/site-stats.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indicators.json'), 'utf8'));
const stats = getSiteStats({ indicators: data.indicators });

// Klíče s deterministickou hodnotou nezávislou na čase/článcích.
const CHECKED_KEYS = ['totalIndicators', 'hspaCount', 'monitoringCount', 'frameworkTotal', 'hspaGap'];

const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

test('HTML fallbacky data-stat odpovídají data/indicators.json', () => {
  const mismatches = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const key of CHECKED_KEYS) {
      const re = new RegExp(`data-stat="${key}"[^>]*>([^<]*)<`, 'g');
      let m;
      while ((m = re.exec(html)) !== null) {
        const fallback = m[1].trim();
        if (fallback !== String(stats[key])) {
          mismatches.push(`${file}: data-stat="${key}" má fallback "${fallback}", skutečnost je ${stats[key]}`);
        }
      }
    }
  }
  assert.deepEqual(mismatches, [], 'Zastaralé fallbacky:\n' + mismatches.join('\n'));
});

test('meta description (data-stat-meta) zmiňuje aktuální počet indikátorů', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = /<meta name="description" content="([^"]*)"[^>]*data-stat-meta/.exec(html);
  assert.ok(m, 'index.html má mít meta description s data-stat-meta');
  assert.ok(
    m[1].includes(String(stats.totalIndicators)),
    `meta description neobsahuje aktuální počet ${stats.totalIndicators}: "${m[1]}"`,
  );
});

test('source.name v indicators.json nejsou syrová interní ID', () => {
  // Interní ID fetcherů (uzis_nrhzs, sukl_atc, share…) nepatří do UI —
  // karta indikátoru je zobrazuje doslova jako „Zdroj: …".
  const raw = data.indicators
    .filter(i => /^[a-z0-9_]+$/.test(i.source?.name ?? ''))
    .map(i => `${i.id}: "${i.source.name}"`);
  assert.deepEqual(raw, [], 'Syrová ID místo názvů zdrojů:\n' + raw.join('\n'));
});
