// Testy frontend modulu src/pojistenci.js — exporty a pomocné funkce.
// DOM testing není v rozsahu (manuálně v prohlížeči); zde jen logika.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KRAJ_NAME_BY_CODE,
  KRAJ_CODE_BY_NAME,
  METRICS,
  ZP_COLORS,
  state,
  aggregateZpForCR,
} from '../src/pojistenci.js';

test('pojistenci frontend: KRAJ_NAME_BY_CODE má 14 krajů', () => {
  assert.equal(Object.keys(KRAJ_NAME_BY_CODE).length, 14);
  assert.equal(KRAJ_NAME_BY_CODE['CZ010'], 'Praha');
  assert.equal(KRAJ_NAME_BY_CODE['CZ080'], 'Moravskoslezský kraj');
});

test('pojistenci frontend: KRAJ_CODE_BY_NAME je inverzí KRAJ_NAME_BY_CODE', () => {
  for (const [code, name] of Object.entries(KRAJ_NAME_BY_CODE)) {
    assert.equal(KRAJ_CODE_BY_NAME[name], code, `inverze pro ${code}/${name}`);
  }
});

test('pojistenci frontend: METRICS má 5 metrik se všemi povinnými poli', () => {
  const expected = ['pct_65plus', 'pct_80plus', 'median_age', 'dependency_old', 'vzp_share'];
  assert.deepEqual(Object.keys(METRICS).sort(), expected.sort());
  for (const [key, m] of Object.entries(METRICS)) {
    assert.ok(typeof m.label === 'string' && m.label.length > 0, `${key} chybí label`);
    assert.ok(typeof m.unit === 'string', `${key} chybí unit`);
    assert.ok(typeof m.min === 'number', `${key} chybí min`);
    assert.ok(typeof m.max === 'number', `${key} chybí max`);
    assert.ok(m.max > m.min, `${key} max <= min`);
    assert.ok(['aging', 'context'].includes(m.scheme), `${key} scheme musí být aging|context`);
    assert.ok(typeof m.description === 'string' && m.description.length > 10, `${key} chybí description`);
  }
});

test('pojistenci frontend: ZP_COLORS má 7 unikátních barev pro 7 ZP', () => {
  const expected = ['111', '201', '205', '207', '209', '211', '213'];
  assert.deepEqual(Object.keys(ZP_COLORS).sort(), expected.sort());
  const colors = Object.values(ZP_COLORS);
  assert.equal(new Set(colors).size, 7, 'všechny barvy musí být unikátní');
  for (const c of colors) {
    assert.match(c, /^#[0-9A-Fa-f]{6}$/, `barva ${c} není 6místný hex`);
  }
});

test('pojistenci frontend: aggregateZpForCR() vrací správně agregovaná data pro mock', () => {
  // Mock minimal zpData se 2 kraji a 2 roky.
  const mockZpData = {
    years: [2010, 2025],
    krajs: [
      { code: 'CZ010', name: 'Praha', shortLabel: 'PHA' },
      { code: 'CZ020', name: 'Středočeský', shortLabel: 'STC' },
    ],
    insurers: [
      { code: '111', name: 'VZP' },
      { code: '205', name: 'ČPZP' },
    ],
    data: {
      'CZ010': {
        2010: { counts: { '111': 700, '205': 300 }, shares: { '111': 70, '205': 30 }, total: 1000 },
        2025: { counts: { '111': 800, '205': 200 }, shares: { '111': 80, '205': 20 }, total: 1000 },
      },
      'CZ020': {
        2010: { counts: { '111': 300, '205': 700 }, shares: { '111': 30, '205': 70 }, total: 1000 },
        2025: { counts: { '111': 400, '205': 600 }, shares: { '111': 40, '205': 60 }, total: 1000 },
      },
    },
  };

  // aggregateZpForCR čte state.zpData; nastavíme ho a obnovíme po testu.
  const orig = state.zpData;
  state.zpData = mockZpData;
  try {
    const result = aggregateZpForCR();
    // 2010: VZP 700+300=1000 / total 2000 = 50 %, ČPZP 300+700=1000 / 2000 = 50 %.
    assert.equal(result[2010].total, 2000);
    assert.equal(result[2010].shares['111'], 50);
    assert.equal(result[2010].shares['205'], 50);
    // 2025: VZP 800+400=1200 / 2000 = 60 %, ČPZP 200+600=800 / 2000 = 40 %.
    assert.equal(result[2025].total, 2000);
    assert.equal(result[2025].shares['111'], 60);
    assert.equal(result[2025].shares['205'], 40);
  } finally {
    state.zpData = orig;
  }
});

test('pojistenci frontend: aggregateZpForCR() funguje na reálných datech (součet podílů ~100)', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const realZp = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'pojistenci-d5-zp.json'), 'utf8')
  );
  const orig = state.zpData;
  state.zpData = realZp;
  try {
    const result = aggregateZpForCR();
    for (const y of realZp.years) {
      const sum = Object.values(result[y].shares).reduce((a, b) => a + (b || 0), 0);
      assert.ok(Math.abs(sum - 100) < 1, `ČR ${y}: sum shares = ${sum}`);
    }
    // Sanity: VZP mezi 50–60 % v ČR (podle veřejně známých údajů).
    const vzp2025 = result[2025].shares['111'];
    assert.ok(vzp2025 > 50 && vzp2025 < 65, `VZP 2025 v ČR ~ ${vzp2025} %`);
  } finally {
    state.zpData = orig;
  }
});
