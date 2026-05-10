// Testy frontend modulu src/pojistenci.js — exporty a pomocné funkce.
// DOM testing není v rozsahu (manuálně v prohlížeči); zde jen logika.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KRAJ_NAME_BY_CODE,
  KRAJ_CODE_BY_NAME,
  METRICS,
  ZP_COLORS,
  RACE_METRICS,
  state,
  aggregateZpForCR,
  aggregateCRMetric,
  topOkresyForYear,
  jumperOkresy,
  getRaceValue,
  fourGroupsForOkres,
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

// ========== M3 testy: race chart + okres detail ==========

test('pojistenci frontend M3: RACE_METRICS má 3 metriky se správnou strukturou', () => {
  assert.deepEqual(Object.keys(RACE_METRICS).sort(), ['count_80plus', 'pct_65plus', 'pct_80plus'].sort());
  for (const [key, m] of Object.entries(RACE_METRICS)) {
    assert.ok(typeof m.label === 'string' && m.label.length > 0, `${key} label`);
    assert.ok(typeof m.unit === 'string', `${key} unit`);
    assert.ok(typeof m.isPercent === 'boolean', `${key} isPercent`);
    assert.ok(typeof m.description === 'string', `${key} description`);
  }
  // count_80plus není procento; ostatní ano.
  assert.equal(RACE_METRICS.count_80plus.isPercent, false);
  assert.equal(RACE_METRICS.pct_80plus.isPercent, true);
  assert.equal(RACE_METRICS.pct_65plus.isPercent, true);
});

test('pojistenci frontend M3: getRaceValue() — count_80plus = sum(80-84:M, 80-84:Z, 85+:M, 85+:Z)', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const okresData = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'pojistenci-d5-okres.json'), 'utf8')
  );
  const orig = state.okresData;
  state.okresData = okresData;
  try {
    // Praha (CZ0100) v roce 2025 — ručně sčítáme.
    const block = okresData.data['CZ0100']['2025'];
    const expected =
      (block.byAgeSex['80-84:M'] || 0) +
      (block.byAgeSex['80-84:Z'] || 0) +
      (block.byAgeSex['85+:M'] || 0) +
      (block.byAgeSex['85+:Z'] || 0);
    assert.equal(getRaceValue('CZ0100', 2025, 'count_80plus'), expected);
    assert.ok(expected > 50000, `Praha 2025 80+ count = ${expected}, čekáno > 50k`);

    // pct_80plus = stejný poměr jako z block.pct_80plus
    assert.equal(getRaceValue('CZ0100', 2025, 'pct_80plus'), block.pct_80plus);
    assert.equal(getRaceValue('CZ0100', 2025, 'pct_65plus'), block.pct_65plus);
  } finally {
    state.okresData = orig;
  }
});

test('pojistenci frontend M3: topOkresyForYear() vrací 10 okresů seřazených sestupně', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const okresData = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'pojistenci-d5-okres.json'), 'utf8')
  );
  const orig = state.okresData;
  state.okresData = okresData;
  try {
    const top = topOkresyForYear(2025, 'count_80plus');
    assert.equal(top.length, 10);
    // Sestupné pořadí.
    for (let i = 1; i < top.length; i++) {
      assert.ok(top[i].value <= top[i - 1].value, `pořadí porušeno na ${i}`);
    }
    // Praha musí být v top 10 podle absolutního počtu 80+.
    const praha = top.find(o => o.code === 'CZ0100');
    assert.ok(praha, 'Praha musí být v top 10 podle count_80plus 2025');
    // Kraj atribut.
    for (const o of top) {
      assert.match(o.kraj, /^CZ\d{3}$/, `${o.code} kraj má neplatný formát ${o.kraj}`);
    }
  } finally {
    state.okresData = orig;
  }
});

test('pojistenci frontend M3: jumperOkresy() — 2010 vs aktuální rok', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const okresData = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'pojistenci-d5-okres.json'), 'utf8')
  );
  const orig = state.okresData;
  state.okresData = okresData;
  try {
    // Pro 2010 → 2010 by množina měla být prázdná.
    assert.equal(jumperOkresy(2010, 'count_80plus').size, 0);
    // Pro 2010 → 2025 by měla obsahovat alespoň 0 (může být i prázdná, pokud je
    // top 10 stabilní — nicméně Set musí existovat).
    const jumpers25 = jumperOkresy(2025, 'count_80plus');
    assert.ok(jumpers25 instanceof Set);
  } finally {
    state.okresData = orig;
  }
});

test('pojistenci frontend M3: fourGroupsForOkres() rozdělí věk do 4 skupin', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const okresData = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'pojistenci-d5-okres.json'), 'utf8')
  );
  const orig = state.okresData;
  state.okresData = okresData;
  try {
    const fg = fourGroupsForOkres('CZ0100', 2025);
    assert.ok(fg);
    assert.deepEqual(Object.keys(fg).sort(), ['0-14', '15-64', '65-79', '80+'].sort());
    // Součet 4 skupin musí dát celkový total.
    const total = fg['0-14'] + fg['15-64'] + fg['65-79'] + fg['80+'];
    const block = okresData.data['CZ0100']['2025'];
    assert.equal(total, block.total, `součet 4 skupin ${total} ≠ total ${block.total}`);
  } finally {
    state.okresData = orig;
  }
});

test('pojistenci frontend M3: aggregateCRMetric(year, pct_65plus) je v rozumných mezích', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const krajData = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'pojistenci-d5-kraj.json'), 'utf8')
  );
  const origKraj = state.krajData;
  state.krajData = krajData;
  try {
    const cr2010 = aggregateCRMetric(2010, 'pct_65plus');
    const cr2025 = aggregateCRMetric(2025, 'pct_65plus');
    // ČR je mezi nejmladší a nejstarší kraj — průměr cca 15–22 %.
    assert.ok(cr2010 > 14 && cr2010 < 18, `ČR 2010 % 65+ = ${cr2010}, čekáno 14–18`);
    assert.ok(cr2025 > 19 && cr2025 < 23, `ČR 2025 % 65+ = ${cr2025}, čekáno 19–23`);
    // Stárnutí: 2025 > 2010.
    assert.ok(cr2025 > cr2010, `ČR má stárnout: 2010 ${cr2010} → 2025 ${cr2025}`);
  } finally {
    state.krajData = origKraj;
  }
});
