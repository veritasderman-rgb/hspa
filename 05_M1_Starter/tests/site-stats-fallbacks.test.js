// Drift guard pro statické fallbacky v HTML (data-stat="...").
//
// Historie: původně tenhle test vyžadoval PŘESNOU shodu fallbacku se
// skutečností (UX audit 2026-06-11, §3 — čísla v copy tiše stárla). Záměr byl
// správný, důsledek ne: každý PR, který přidal indikátor, musel bumpnout
// 191→192 v deseti místech napříč čtyřmi soubory. Dva takové PR za noc
// kolidovaly na stejném řádku a při sériovém merge vznikl špatný součet
// (oba nastavily 192, správně mělo být 193) — a test to nepoznal, protože
// „přesná shoda" se kontroluje až proti výsledku.
//
// Nová politika:
//   - Kolísavé počty mají ve statickém HTML jen zaokrouhlenou formulaci
//     („kolem 190“). Mění se jednou za čas, ne každým PR. Přesnou hodnotu
//     doplní za běhu site-stats.js, jak to bylo od začátku zamýšlené.
//   - Zaokrouhlení ale musí zůstat pravdivé — hlídá se tolerance, aby
//     „kolem 190“ nezůstalo viset, až jich bude 260.
//   - Konstanty (frameworkTotal, hspaGap) se dál kontrolují na přesnou shodu;
//     ty se nemění přidáním indikátoru.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSiteStats } from '../src/site-stats.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indicators.json'), 'utf8'));
const stats = getSiteStats({ indicators: data.indicators });

/** Počty rostoucí s každým přidaným indikátorem → jen zaokrouhlený fallback. */
const ROUNDED_KEYS = ['totalIndicators', 'hspaCount', 'monitoringCount'];
/** Hodnoty nezávislé na počtu indikátorů → přesná shoda jako dřív. */
const EXACT_KEYS = ['frameworkTotal', 'hspaGap'];

/** Jak daleko smí zaokrouhlení utéct od skutečnosti, než je to už lež. */
const TOLERANCE = 0.1;

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

function fallbacksFor(html, key) {
  const re = new RegExp(`data-stat="${key}"[^>]*>([^<]*)<`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1].trim());
  return out;
}

test('kolísavé počty mají v HTML jen zaokrouhlený fallback, ne přesné číslo', () => {
  const problems = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const key of ROUNDED_KEYS) {
      for (const fallback of fallbacksFor(html, key)) {
        if (/^\d+$/.test(fallback)) {
          problems.push(
            `${file}: data-stat="${key}" má přesné číslo "${fallback}" — použij „kolem ${Math.round(stats[key] / 10) * 10}“, ` +
              'jinak ho musí bumpnout každý PR s novým indikátorem',
          );
        }
      }
    }
  }
  assert.deepEqual(problems, [], 'Přesná čísla ve fallbacku:\n' + problems.join('\n'));
});

test('zaokrouhlené fallbacky zůstávají pravdivé (nesmí zestárnout)', () => {
  const problems = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const key of ROUNDED_KEYS) {
      for (const fallback of fallbacksFor(html, key)) {
        const m = fallback.match(/(\d+)/);
        if (!m) continue; // čistě slovní formulace je v pořádku
        const claimed = Number(m[1]);
        const real = stats[key];
        if (Math.abs(claimed - real) > Math.max(5, real * TOLERANCE)) {
          problems.push(
            `${file}: data-stat="${key}" tvrdí "${fallback}", skutečnost je ${real} — ` +
              `přepiš na „kolem ${Math.round(real / 10) * 10}“`,
          );
        }
      }
    }
  }
  assert.deepEqual(problems, [], 'Zastaralé zaokrouhlení:\n' + problems.join('\n'));
});

test('konstanty (frameworkTotal, hspaGap) mají v HTML přesnou hodnotu', () => {
  const mismatches = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const key of EXACT_KEYS) {
      for (const fallback of fallbacksFor(html, key)) {
        if (fallback !== String(stats[key])) {
          mismatches.push(`${file}: data-stat="${key}" má fallback "${fallback}", skutečnost je ${stats[key]}`);
        }
      }
    }
  }
  assert.deepEqual(mismatches, [], 'Zastaralé fallbacky:\n' + mismatches.join('\n'));
});
