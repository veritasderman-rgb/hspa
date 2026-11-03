// Srovnávač zdravotních pojišťoven — moduly 1 (aplikace), 2 (prevence) a 4 (otázky).
// Orchestruje src/pojistovny.js; data viz hlavička tohoto souboru tam.
//
// Balíčky P2.2 + P2.3 z PLAN-SROVNAVAC-POJISTOVEN.md:
//   - formy grafů podle § 2.4 (dotMatrix, heatmap, coverageMatrix, segmentedBar, dumbbell z src/zp-viz.js),
//   - progressive disclosure podle § 2.6 (lead = 1 věta, vysvětlení v <details class="zpc-acc">),
//   - „Moje pojišťovna“: struktura fondu prevence se řídí výběrem z main[data-moje-zp] / eventu zp:moje-change.
//
// Čisté přípravy dat (testovatelné v node, bez DOM):
//   buildAppMatrix, buildKriteriaMatrix, buildPrevHeatmap, buildOnkoMatrix, buildDusevniHeatmap,
//   buildFondParts, coverageState, buildCoverage, odhadniSkupinu.

import { NA, esc, num, fmtKc, levelBadge, dot, li, set, short, datumCz, loadJson, LEVELS, LEVEL_LABEL } from './pojistovny-shared.js';
import { heatmap, dotMatrix, coverageMatrix, segmentedBar, dumbbell, rankedBars, isNum, kratkyPopisek } from './zp-viz.js';
import { initZpInteract, MOJE_EVENT } from './zp-interact.js';
import { ZP_BY_KOD } from './zp-palette.js';

const zkratka = (kod) => ZP_BY_KOD[String(kod)]?.zkratka || String(kod);

/** Doplní počet do <span id=…> v summary rozklikávací vysvětlivky („· 7“). */
function setN(id, n) {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (el) el.textContent = n == null ? '' : ` · ${n}`;
}

/** Po překreslení grafů znovu promítne „Moje pojišťovna“, animace a tooltipy (idempotentní). */
function refreshInteract() {
  try { const r = initZpInteract(); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (_) { /* bez interakce stránka funguje */ }
}

// ---------------------------------------------------------------- modul 1: aplikace

const fmtUsers = (u) => {
  if (!u || !isNum(u.hodnota)) return null;
  const mil = u.hodnota / 1e6;
  return `${fmtKc(mil, mil >= 1 ? 1 : 2)} mil. uživatelů${u.rok ? ` (${u.rok})` : ''}`;
};

/** Matice funkcí aplikací: řádky = 7 ZP (sub = název aplikace + uživatelé), sloupce = funkce. */
export function buildAppMatrix(a) {
  const apps = a?.aplikace || [];
  const cols = (a?.funkce || []).map((f) => ({ key: f.id, label: f.label }));
  const rows = apps.map((x) => {
    const known = Object.values(x.funkce || {}).some((v) => v != null);
    const users = fmtUsers(x.uzivatele);
    const parts = [x.nazev || null, known ? users : 'funkce bez údajů'].filter(Boolean);
    return { kod: x.kod, label: x.zp, sub: parts.join(' · '), _app: x };
  });
  const cell = (r, c) => {
    const v = r._app?.funkce?.[c.key];
    return v === true || v === false || v === 'partial' ? v : null;
  };
  return { rows, cols, cell };
}

/**
 * Souhrn „kolik pojišťoven funkci má“ (A0.1): ano = 1, částečně = ½, ne = 0; aplikace bez
 * jediného známého údaje (u ZPŠ) se nepočítá. `max` = počet aplikací se známými funkcemi.
 * @returns {{items: Array<{key,label,value,tip}>, max: number}}
 */
export function buildFunkceSouhrn(a) {
  const funkce = Array.isArray(a?.funkce) ? a.funkce : [];
  const apps = (a?.aplikace || []).filter((x) => Object.values(x.funkce || {}).some((v) => v === true || v === false || v === 'partial'));
  const items = funkce.map((f) => {
    const vals = apps.map((x) => x.funkce?.[f.id]);
    const value = vals.reduce((n, v) => n + (v === true ? 1 : v === 'partial' ? 0.5 : 0), 0);
    const chybi = apps.filter((x) => x.funkce?.[f.id] === false).map((x) => zkratka(x.kod));
    const tip = `${f.label}: ${fmtKc(value, value % 1 ? 1 : 0)} z ${apps.length} pojišťoven`
      + (chybi.length ? ` · chybí: ${chybi.join(', ')}` : '');
    // popisek zkrácený na ≤ 22 znaků (nazev_kratky z dat, jinak ořez), plný název v tooltipu
    return { key: f.id, label: f.nazev_kratky || kratkyPopisek(f.label, 22), value, tip };
  });
  const bez = (a?.aplikace || []).filter((x) => !apps.includes(x)).map((x) => zkratka(x.kod));
  return { items, max: apps.length, bez };
}

const STUPEN_DOT = { 0: false, 1: 'partial', 2: true };

/** Matice kritérií přívětivosti (návrh, P2.3): prázdné `kriteria` = všechny buňky „—“. */
export function buildKriteriaMatrix(a) {
  const k = a?.kriteria_privetivosti;
  const cols = (k?.kriteria || []).map((c) => ({ key: c.id, label: c.label }));
  const rows = (a?.aplikace || []).map((x) => ({ kod: x.kod, label: x.zp, sub: x.nazev || '', _app: x }));
  const cell = (r, c) => {
    const st = r._app?.kriteria?.[c.key]?.stupen;
    return Object.prototype.hasOwnProperty.call(STUPEN_DOT, st) ? STUPEN_DOT[st] : null;
  };
  const hodnoceno = rows.reduce((n, r) => n + cols.filter((c) => cell(r, c) !== null).length, 0);
  return { rows, cols, cell, hodnoceno, stav: k?.stav || null, skala: k?.skala || {} };
}

export function renderApps(a) {
  if (!a) {
    set('zpAppMatrix', '<p class="zpc-na">Data o aplikacích zatím nejsou k dispozici.</p>');
    return;
  }
  const m = buildAppMatrix(a);
  const source = (a.zdroje || []).map((z) => z.nazev).join('; ');
  set('zpAppMatrix', dotMatrix(m.rows, m.cols, m.cell, {
    title: 'Funkce aplikací pojišťoven',
    sub: 'Plné kolečko = funkce je dostupná, poloviční = částečně. Součet za aplikaci se nepočítá: kolik funkcí aplikace má, neříká nic o tom, jak se používá.',
    score: false,
    source,
    rowHeader: 'Pojišťovna · aplikace',
  }));
  const fs = buildFunkceSouhrn(a);
  set('zpAppFunkce', rankedBars(fs.items, {
    title: 'Kolik pojišťoven funkci má',
    sub: `Součet za aplikace se známými funkcemi${fs.bez.length ? ` (${fs.bez.join(', ')} nedohledáno)` : ''}, částečně = ½; dole jsou funkce, které chybějí nejčastěji.`,
    unit: '', dec: 1, maxv: fs.max, labw: 13, source,
    sortNote: 'Řazeno podle počtu pojišťoven, nejde o hodnocení.',
  }));
  set('zpAppCap', 'Počty uživatelů uvádějí ve výročních zprávách jen VZP a OZP; u ostatních je nutný dotaz. U ZPŠ nejsou funkce známy.');

  // P2.3: schéma přívětivosti — zatím bez hodnot
  const km = buildKriteriaMatrix(a);
  if (km.cols.length) {
    const skala = Object.entries(km.skala).map(([k, v]) => `${k} = ${esc(v)}`).join(', ');
    set('zpAppKriteria',
      `<p class="zpc-note">Návrh ${km.cols.length} kritérií (zdroj: ${esc(a.kriteria_privetivosti.zdroj || '')}), stav: ${esc(km.stav || 'návrh')}. Škála: ${skala}. ${km.hodnoceno ? '' : 'Zatím nehodnoceno, hodnoty doplní IT expert po schválení kritérií.'}</p>`
      + dotMatrix(km.rows, km.cols, km.cell, {
        title: 'Přívětivost aplikací (návrh kritérií, zatím nehodnoceno)',
        score: false,
        source: a.kriteria_privetivosti.zdroj || '',
        rowHeader: 'Pojišťovna',
      }));
    setN('zpAppKriteriaN', km.cols.length);
  }
  set('zpAppSummary', li(a.shrnuti));
  set('zpAppNotes', li(a.rozpory));
  setN('zpAppSummaryN', (a.shrnuti || []).length);
  setN('zpAppNotesN', (a.rozpory || []).length);
  refreshInteract();
  renderRizikove(a);
}

// ---------------------------------------------------------------- modul 4 (část): rizikové skupiny

/** Skupina může být objekt {nazev, kriteria} (data), nebo prostý řetězec (starší tvar). */
export function normSkupina(s) {
  if (s && typeof s === 'object') return { nazev: String(s.nazev ?? ''), kriteria: s.kriteria ? String(s.kriteria) : '' };
  return { nazev: String(s ?? ''), kriteria: '' };
}

function renderRizikove(a) {
  const r = a.rizikove_skupiny || {};
  const sk = (r.skupiny || []).map(normSkupina).filter((s) => s.nazev);
  const modely = (r.predikcni_modely || []).map(zkratka);
  const chybi = (r.chybejici_data || []).map((x) => `<li>${esc(x)}</li>`).join('');
  set('zpRizikove',
    `<ul class="zpc-rg">${sk.map((s) => `<li><b>${esc(s.nazev)}</b>${s.kriteria ? `<small>${esc(s.kriteria)}</small>` : ''}</li>`).join('') || '<li class="zpc-na">—</li>'}</ul>`
    + `<p class="zpc-rg-line"><b>Predikční modely mají:</b> ${modely.map(esc).join(', ') || '—'}. Ostatní používají jednoduchá pravidla.</p>`
    + `<p class="zpc-rg-line"><b>Chybějící data:</b></p><ul class="zpc-pills">${chybi || '<li class="zpc-na">—</li>'}</ul>`);
  set('zpRizikovePopis', r.popis ? `<p>${esc(r.popis)}</p>` : '');
  set('zpDalsi', (a.dalsi_zkoumani || []).map((t) => `<li><b>${esc(t.tema)}.</b> ${esc(t.otazka || '')} <span class="zpc-na">Metriky: ${(t.metriky || []).map(esc).join('; ') || '—'}</span></li>`).join('') || '<li class="zpc-na">—</li>');
  setN('zpRizikoveN', sk.length);
  setN('zpDalsiN', (a.dalsi_zkoumani || []).length);
}

// ---------------------------------------------------------------- modul 2: prevence

/** Stupeň z dat (řetězec enumu) → číselná úroveň 0..3, jinak null. */
export function levelOf(stupen) {
  if (stupen == null) return null;
  if (typeof stupen === 'number') return stupen >= 0 && stupen <= 3 ? stupen : null;
  const n = LEVELS[String(stupen).toLowerCase()];
  return n == null ? null : n;
}

/**
 * Počet položek v popisu rešerše: části oddělené čárkou nebo středníkem („screeningy, omezené
 * benefity“ = 2). Čárka v závorce se počítá taky (výčet programů); prázdný popis = 0.
 */
export function pocetPolozek(popis) {
  if (popis == null) return 0;
  return String(popis).split(/[,;]/).map((s) => s.trim()).filter(Boolean).length;
}

const polozekCz = (n) => `${n} ${n === 1 ? 'položku' : n >= 2 && n <= 4 ? 'položky' : 'položek'}`;

/** Věta pod maticí nabídky: co znamená číslo a co odstín. */
export const PREV_HEAT_FOOT = 'Číslo v buňce = počet položek v textu rešerše (části popisu oddělené čárkou nebo středníkem), ne ověřený počet programů: záleží na podrobnosti zápisu („HPV, klíšťovka, chřipka“ = 3, „široká škála očkování“ = 1). Odstín = redakční stupeň.';

/**
 * Heatmapa nabídky 7 ZP × 9 oblastí. Barva buňky = redakční stupeň, text v buňce = počet
 * položek v textu rešerše („—“ = prázdný popis), NE ověřený počet programů: číslo závisí na
 * podrobnosti zápisu rešerše, proto to věta pod maticí i tooltip říkají; tooltip nese stupeň a popis.
 */
export function buildPrevHeatmap(p) {
  const rows = (p?.pojistovny || []).map((z) => ({ kod: z.kod, label: z.zkratka, sub: z.rok_vz ? `VZ ${z.rok_vz}` : '', _z: z }));
  const cols = (p?.oblasti || []).map((o) => ({ key: o.id, label: o.label }));
  const cell = (r, c) => {
    const o = r._z.oblasti?.[c.key];
    const level = levelOf(o?.stupen);
    if (level == null) return null;
    const n = pocetPolozek(o?.popis);
    return {
      level,
      text: n ? String(n) : '—',
      tipText: `stupeň ${LEVEL_LABEL[level]}`,
      tip: n ? `popis rešerše má ${polozekCz(n)}: ${o.popis}` : 'rešerše na webu nenašla konkrétní program',
    };
  };
  return { rows, cols, cell };
}

const ONKO_LABEL = { prsu: 'Prs', delozni_hrdlo: 'Děložní hrdlo', kolorektum: 'Kolorektum', prostata: 'Prostata', plice: 'Plíce' };

/** Onkologický screening 7 ZP × 5 (dotMatrix); stupeň nadstandardu jde do `sub` řádku. */
export function buildOnkoMatrix(p) {
  const cols = (p?.onko_screening_sloupce || []).map((c) => ({ key: c, label: ONKO_LABEL[c] || c }));
  const rows = (p?.pojistovny || []).map((z) => {
    const n = z.onko_screening?.nadstandard;
    const lvl = levelOf(n?.stupen);
    const proc = n?.popis ? ` — ${short(n.popis, 80)}` : '';
    return { kod: z.kod, label: z.zkratka, sub: lvl == null ? '' : `nadstandard: ${LEVEL_LABEL[lvl]}${proc}`, _z: z };
  });
  const cell = (r, c) => {
    const v = r._z.onko_screening?.[c.key];
    return v === true || v === false ? v : null;
  };
  return { rows, cols, cell };
}

/**
 * „Proč ten stupeň“: pro každou pojišťovnu seznam oblastí se stupněm a s tím, co
 * rešerše na webu našla (popis). Stupeň bez popisu dostane „bez uvedeného důvodu“,
 * aby bylo vidět, kde odhad nemá oporu. Zahrnuje matici oblastí, nadstandard
 * onkologického screeningu a duševní zdraví.
 */
export function buildPrevProc(p) {
  const oblasti = p?.oblasti || [];
  const dus = p?.dusevni_sloupce || [];
  return (p?.pojistovny || []).map((z) => {
    const items = [];
    const push = (skupina, label, o) => {
      const lvl = levelOf(o?.stupen);
      if (lvl == null) return;
      items.push({ skupina, label, level: lvl, stupen: LEVEL_LABEL[lvl], popis: o?.popis ? String(o.popis) : '' });
    };
    for (const o of oblasti) push('Nabídka', o.label, z.oblasti?.[o.id]);
    push('Onkologický screening', 'nadstandard', z.onko_screening?.nadstandard);
    for (const c of dus) push('Duševní zdraví', c.label, z.dusevni?.[c.id]);
    const bezDuvodu = items.filter((i) => !i.popis).length;
    return { kod: z.kod, zkratka: z.zkratka, rok_vz: z.rok_vz ?? null, reserse: z.reserse?.datum ? { datum: z.reserse.datum, url: z.reserse.url || null } : null, items, bezDuvodu };
  });
}

export function prevProcHtml(p) {
  const list = buildPrevProc(p);
  if (!list.length) return '<p class="zpc-na">—</p>';
  return list.map((z) => `<details class="zpc-acc zpc-proc" data-zp="${esc(z.kod)}"><summary>${dot(z.kod)}${esc(z.zkratka)}<span class="zpc-n">${z.items.length} položek${z.bezDuvodu ? ` · ${z.bezDuvodu} bez uvedeného důvodu` : ''}`
    + `${z.reserse ? ` · rešerše webu ${esc(datumCz(z.reserse.datum))}` : ''}</span></summary><div class="zpc-acc-body">`
    + `${z.reserse?.url ? `<p class="zpc-note">Rešerše webu ${esc(datumCz(z.reserse.datum))}: <a href="${esc(z.reserse.url)}" rel="noopener">stránka prevence ${esc(z.zkratka)}</a>.</p>` : ''}<ul>`
    + z.items.map((i) => `<li><b>${esc(i.skupina)} · ${esc(i.label)}</b> · ${levelBadge(i.level)} ${i.popis ? esc(i.popis) : '<span class="zpc-na">bez uvedeného důvodu</span>'}</li>`).join('')
    + '</ul></div></details>').join('');
}

/** Duševní zdraví 7 ZP × 5 (heatmapa). */
export function buildDusevniHeatmap(p) {
  const cols = (p?.dusevni_sloupce || []).map((c) => ({ key: c.id, label: c.label }));
  const rows = (p?.pojistovny || []).map((z) => ({ kod: z.kod, label: z.zkratka, sub: z.rok_vz ? `VZ ${z.rok_vz}` : '', _z: z }));
  const cell = (r, c) => {
    const o = r._z.dusevni?.[c.key];
    const level = levelOf(o?.stupen);
    return level == null ? null : { level, tip: o?.popis || undefined };
  };
  return { rows, cols, cell };
}

// ---- skupiny položek fondu prevence

/** Pevný slovník skupin (shodný s `fond_prevence_skupiny` v data/pojistovny-prevence.json). */
export const FOND_SKUPINY = [
  { id: 'screening', label: 'Screening a onkologie' },
  { id: 'ockovani', label: 'Očkování' },
  { id: 'pohyb', label: 'Pohyb a rehabilitace' },
  { id: 'dusevni', label: 'Duševní zdraví' },
  { id: 'dentalni', label: 'Zubní péče' },
  { id: 'tehotenstvi_deti', label: 'Těhotenství a děti' },
  { id: 'zivotni_styl', label: 'Životní styl a chronická onemocnění' },
  { id: 'ostatni', label: 'Ostatní a nezařazeno' },
];

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Pořadí pravidel je důležité: první shoda vyhrává (očkování před screeningem u „HPV“,
// děti/těhotenství před duševním zdravím u „psychoprofylaxe“, zuby před dětmi u „zubní kaz u dětí“).
const SKUPINA_PRAVIDLA = [
  ['ockovani', /ockov|vakcin|klistov|chripk|meningokok|pneumokok|hepatit|\bhpv\b|rotavir|pasov|infekcn|imunit/],
  ['dentalni', /\bzub|dental|chrup|ortodont|stomatolog|fluorid/],
  ['tehotenstvi_deti', /tehotn|porod|miminko|maminka|novorozen|kojen|\bdeti\b|\bdetsk|dorost|skolk|\bskol|prazdnin/],
  ['dusevni', /dusevn|psych|stres|mentaln/],
  ['screening', /onkolog|nador|karcinom|rakovin|screening|melanom|\bprsu\b|prostat|kolorekt|mamograf|stitn|odhalov|zjistov|paruk/],
  ['pohyb', /pohyb|sport|plavan|kondicn|rehabilit|rekondic|cviceni|aktivniho zivotniho stylu|permanent/],
  ['zivotni_styl', /zivotni styl|zdravy zpusob|zdrave starnuti|zdravy podnik|zdravi 90|bonus|obezit|nadvah|\bbmi\b|kouren|diabet|\bdm\b|dietn|celiak|fenylketon|kardiovask|osteopor|vyziv|vitamin|chronick|motivacn|predia/],
];

/**
 * Přiřadí účelovou položku fondu prevence do jedné z 8 skupin (slovník FOND_SKUPINY)
 * podle klíčových slov v názvu. Nic nenajde → „ostatni“.
 */
export function odhadniSkupinu(nazev) {
  const t = norm(nazev);
  for (const [id, re] of SKUPINA_PRAVIDLA) if (re.test(t)) return id;
  return 'ostatni';
}

const skupinaLabel = (id, skupiny = FOND_SKUPINY) => (skupiny.find((s) => s.id === id) || { label: id }).label;

/**
 * Příprava dat pro segmentovaný pruh a dumbbell fondu prevence jedné pojišťovny.
 * @param {object} z  záznam pojistovny[] z pojistovny-prevence.json
 * @param {{skupiny?: boolean, slovnik?: Array}} [opt]  skupiny=true → součty podle skupin
 * @returns {null|{kod, zkratka, rok, jednotka, mode, parts, bell, fromLabel, fromMode, nItems, total, notes}}
 */
export function buildFondParts(z, { skupiny = false, slovnik = FOND_SKUPINY } = {}) {
  const f = z?.fond_prevence_struktura;
  const pol = Array.isArray(f?.polozky) ? f.polozky : [];
  if (!pol.length) return null;
  const rok = f.rok ?? z.rok_vz ?? null;
  // plán je k dispozici, jen když ho má ZP u celku (OZP ve VZ sloupec ZPP nemá)
  const fromMode = isNum(f.celkem?.zpp) ? 'plan' : 'predchozi';
  const fromOf = (p) => (fromMode === 'plan' ? p.zpp : p.predchozi_rok);

  let units;
  if (skupiny) {
    const by = new Map();
    for (const p of pol) {
      const id = p.skupina || odhadniSkupinu(p.nazev);
      const g = by.get(id) || { key: id, label: skupinaLabel(id, slovnik), value: 0, from: null, n: 0 };
      if (isNum(p.skutecnost)) g.value += p.skutecnost;
      const fv = fromOf(p);
      if (isNum(fv)) g.from = (g.from ?? 0) + fv;
      g.n += 1;
      by.set(id, g);
    }
    units = [...by.values()].map((g) => ({ key: g.key, label: `${g.label} (${g.n})`, value: g.value, from: g.from }));
  } else {
    units = pol.map((p, i) => ({
      key: `p${i}`,
      label: short(p.nazev, 60),
      full: p.nazev,
      value: isNum(p.skutecnost) ? p.skutecnost : null,
      from: isNum(fromOf(p)) ? fromOf(p) : null,
    }));
  }

  const positive = units.filter((u) => isNum(u.value) && u.value > 0);
  const total = positive.reduce((a, u) => a + u.value, 0);
  const parts = positive.map((u) => ({
    key: u.key,
    label: u.label,
    value: u.value,
    tip: `${u.full || u.label}: ${fmtKc(u.value)} ${f.jednotka || 'tis. Kč'} · ${fmtKc(total ? (100 * u.value) / total : 0, 1)} % · VZ ${z.rok_vz ?? ''}`,
  }));
  const kod = String(z.kod);
  const bell = [...positive].sort((a, b) => b.value - a.value).slice(0, 6)
    .map((u) => ({ kod, key: u.key, label: u.label, from: u.from, to: u.value }));

  const notes = [];
  if (fromMode === 'predchozi') notes.push(`${z.zkratka} ve výroční zprávě neuvádí plán fondu, proto je porovnání s předchozím rokem${isNum(rok) ? ` (${rok - 1})` : ''}.`);
  if (isNum(rok) && rok !== 2024) notes.push(`Údaje za rok ${rok}: novější výroční zpráva nebyla v podkladu.`);
  return {
    kod, zkratka: z.zkratka, rok, jednotka: f.jednotka || 'tis. Kč', mode: skupiny ? 'skupiny' : 'polozky',
    parts, bell, fromLabel: fromMode === 'plan' ? 'plán ZPP' : 'předchozí rok', fromMode,
    nItems: pol.length, nGroups: new Set(pol.map((p) => p.skupina || odhadniSkupinu(p.nazev))).size,
    total, notes,
  };
}

// ---- odpovědi z VZ: matice pokrytí

const NEGATIVNI = /(vz|zprava)\s+neuvadi|neuvadi|neexistuje|nemeri|neni\s+uvedeno/;

/**
 * Stav odpovědi z VZ: 'ano' (věcná odpověď), 'castecne' (krátká/obecná, nebo záporná s dalším obsahem),
 * 'ne' (chybí; nebo jen „VZ neuvádí“).
 */
export function coverageState(v) {
  const text = (Array.isArray(v) ? v.filter(Boolean).join(', ') : v == null ? '' : String(v)).trim();
  if (!text) return 'ne';
  const negativni = NEGATIVNI.test(norm(text).slice(0, 80));
  if (negativni) return text.length < 40 ? 'ne' : 'castecne';
  return text.length < 40 ? 'castecne' : 'ano';
}

export const VZ_OTAZKY = [
  ['programy_seznam', 'Jaké programy nabízí', 'Programy'],
  ['cile', 'Cíle a zaměření', 'Cíle'],
  ['naklady_poznamka', 'Náklady a zdroje fondu', 'Náklady a zdroje'],
  ['mereni_dopadu', 'Jak měří dopad', 'Měření dopadu'],
  ['kanaly', 'Komunikační kanály', 'Kanály'],
  ['hodnoceni_efektivity', 'Hodnocení účinnosti, interní metodika', 'Hodnocení účinnosti'],
  ['frekvence', 'Jak často vyhodnocuje', 'Frekvence'],
];

export function buildCoverage(p) {
  const rows = (p?.pojistovny || []).map((z) => ({ kod: z.kod, label: z.zkratka, sub: z.rok_vz ? `VZ ${z.rok_vz}` : '', _z: z }));
  const cols = VZ_OTAZKY.map(([key, , label]) => ({ key, label }));
  const cell = (r, c) => {
    const v = r._z.odpovedi?.[c.key];
    const stav = coverageState(v);
    const tip = stav === 'ne' ? undefined : short(Array.isArray(v) ? v.join(', ') : v, 90);
    return { stav, tip };
  };
  return { rows, cols, cell };
}

// ---- stav sekce fondu prevence (výběr ZP, režim)

const fp = { p: null, local: '111', mode: 'auto', bound: false }; // local = výchozí VZP ČR bez výběru

function mojeZp() {
  if (typeof document === 'undefined') return null;
  const k = document.querySelector('main')?.dataset?.mojeZp;
  return k && ZP_BY_KOD[k] ? k : null;
}

function fpHtml() {
  const zps = fp.p?.pojistovny || [];
  const moje = mojeZp();
  const kod = moje || fp.local;
  const z = zps.find((x) => x.kod === kod) || zps[0];
  if (!z) return '<p class="zpc-na">Struktura fondu prevence není k dispozici.</p>';
  const slovnik = fp.p?.fond_prevence_skupiny || FOND_SKUPINY;
  const nItems = z.fond_prevence_struktura?.polozky?.length || 0;
  const offerGroups = nItems >= 10;
  const mode = fp.mode === 'auto' ? (nItems > 20 ? 'skupiny' : 'polozky') : fp.mode;
  const d = buildFondParts(z, { skupiny: offerGroups && mode === 'skupiny', slovnik });

  // Lokální přepínač pojišťovny tu není (revize P1.5): sekce sleduje jen „Moje pojišťovna“,
  // bez výběru ukazuje VZP ČR a větu, ať si čtenář vybere nahoře.
  const head = moje
    ? `<p class="zpc-note zpc-fp-who">Zobrazeno: ${dot(z.kod)}<b>${esc(z.zkratka)}</b> (vaše pojišťovna). Jinou zvolíte v řádku „Moje pojišťovna“ nahoře.</p>`
    : `<p class="zpc-note zpc-fp-who">Zobrazeno: ${dot(z.kod)}<b>${esc(z.zkratka)}</b> (výchozí). Vyberte svou pojišťovnu nahoře.</p>`;

  const toggle = offerGroups
    ? `<div class="zpc-chips zpc-fp-mode" role="group" aria-label="Členění struktury fondu">`
      + `<button type="button" class="zpc-chip" data-fp-mode="polozky" aria-pressed="${mode === 'polozky' ? 'true' : 'false'}">podle položek (${nItems})</button>`
      + `<button type="button" class="zpc-chip" data-fp-mode="skupiny" aria-pressed="${mode === 'skupiny' ? 'true' : 'false'}">podle skupin (${d?.nGroups ?? ''})</button></div>`
    : '';

  if (!d) return `${head}<p class="zpc-na">Struktura není v dostupných dokumentech.</p>`;

  const f = z.fond_prevence_struktura;
  const src = `${z.zkratka} · výroční zpráva · ${z.rok_vz}`;
  const seg = segmentedBar(d.parts, {
    title: `Struktura čerpání fondu prevence (${d.jednotka}, ${d.rok ?? ''})`,
    sub: d.mode === 'skupiny' ? 'Součty účelových položek podle skupin (odhad podle názvu položky).' : 'Pět největších položek a zbytek jako „Ostatní“.',
    maxParts: 6,
    otherLabel: d.mode === 'skupiny' ? 'Další skupiny' : 'Ostatní',
    source: src,
  });
  const bell = dumbbell(d.bell, {
    title: `${cap(d.fromLabel)} → skutečnost, šest největších ${d.mode === 'skupiny' ? 'skupin' : 'položek'} (${d.jednotka})`,
    sub: d.notes.join(' ') || undefined,
    fromLabel: d.fromLabel,
    toLabel: 'skutečnost',
    sortNote: 'Řazeno podle skutečnosti.',
    source: src,
  });
  return head + toggle + seg + bell + fpTable(z, f);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function fpTable(z, f) {
  const tot = f.celkem?.skutecnost || f.polozky.reduce((a, x) => a + (x.skutecnost || 0), 0) || 1;
  const rows = [...f.polozky].sort((a, b) => (b.skutecnost || 0) - (a.skutecnost || 0)).map((x) => `<tr><th scope="row" class="zpc-txt">${esc(x.nazev)}</th><td>${num(x.zpp)}</td><td>${num(x.skutecnost)}</td><td>${x.skutecnost != null ? fmtKc(100 * x.skutecnost / tot, 1) + ' %' : NA}</td><td>${x.zpp && x.skutecnost != null ? fmtKc(100 * x.skutecnost / x.zpp, 0) + ' %' : NA}</td><td>${num(x.predchozi_rok)}</td></tr>`).join('');
  return `<details class="zpc-acc"><summary>Tabulka všech položek<span class="zpc-n"> ·${f.polozky.length}</span></summary><div class="zpc-acc-body">`
    + `<div class="zpc-tbl" role="region" tabindex="0" aria-label="Struktura fondu prevence (tabulka, posuvná)"><table><thead><tr><th class="zpc-txt">Účelová položka (${esc(f.jednotka || 'tis. Kč')}, ${esc(f.rok || '')})</th><th>Plán (ZPP)</th><th>Skutečnost</th><th>Podíl</th><th>Plnění plánu</th><th>Předchozí rok</th></tr></thead><tbody>${rows}</tbody>`
    + `<tfoot><tr><th class="zpc-txt">Celkem</th><td>${num(f.celkem?.zpp)}</td><td><b>${num(f.celkem?.skutecnost)}</b></td><td>100 %</td><td>${f.celkem?.zpp && f.celkem?.skutecnost ? fmtKc(100 * f.celkem.skutecnost / f.celkem.zpp, 0) + ' %' : NA}</td><td>${num(f.celkem?.predchozi_rok)}</td></tr></tfoot></table></div>`
    + `${z.poznamka ? `<p class="zpc-cap">${esc(z.poznamka)}</p>` : ''}</div></details>`;
}

/** Překreslí sekci fondu naráz (jedno přiřazení innerHTML), bez poskoku layoutu. */
function renderFond(focusSel = null) {
  const box = document.getElementById('zpFpStruktura');
  if (!box || !fp.p) return;
  const h = box.offsetHeight;
  if (h) box.style.minHeight = `${h}px`;
  box.innerHTML = fpHtml();
  refreshInteract();
  if (focusSel) box.querySelector(focusSel)?.focus({ preventScroll: true });
  if (h) requestAnimationFrame(() => requestAnimationFrame(() => { box.style.minHeight = ''; }));
}

function bindFond() {
  if (fp.bound || typeof document === 'undefined') return;
  fp.bound = true;
  const box = document.getElementById('zpFpStruktura');
  box?.addEventListener('click', (e) => {
    const t = e.target.closest?.('button');
    if (!t || !box.contains(t)) return;
    if (t.hasAttribute('data-fp-mode')) {
      fp.mode = t.getAttribute('data-fp-mode');
      renderFond(`[data-fp-mode="${fp.mode}"]`);
    }
  });
  document.addEventListener(MOJE_EVENT, () => { fp.mode = 'auto'; renderFond(); });
}

export function renderPrevence(p, d) {
  if (!p) {
    for (const id of ['zpPrevMatrix', 'zpPrevOnko', 'zpPrevDusevni', 'zpFpStruktura', 'zpOdpovedi']) set(id, '<p class="zpc-na">Data o preventivních programech zatím nejsou k dispozici.</p>');
  } else {
    const zps = p.pojistovny || [];
    const srcWeb = 'pojišťovny · weby a výroční zprávy (redakční rešerše) · 2026';
    // nabídka 7 × 9
    const hm = buildPrevHeatmap(p);
    set('zpPrevMatrix', heatmap(hm.rows, hm.cols, hm.cell, {
      title: 'Nabídka preventivních programů podle oblastí',
      sub: 'Barva je odhad redakce z webu pojišťovny, ne měření. Proč: najeďte na buňku, nebo rozbalte seznam pod maticí. Kliknutím na sloupec seřadíte podle stupně.',
      source: srcWeb, sortable: true, rowHeader: 'Pojišťovna', foot: PREV_HEAT_FOOT,
    }));
    // onko
    const on = buildOnkoMatrix(p);
    set('zpPrevOnko', dotMatrix(on.rows, on.cols, on.cell, { title: 'Onkologický screening', sub: 'Plné kolečko = pojišťovna screening podporuje.', score: false, source: srcWeb, rowHeader: 'Pojišťovna' })); // plán A § 1: nabídka se nehodnotí, proto bez součtu
    set('zpPrevNadstandard', zps.map((z) => { const n = z.onko_screening?.nadstandard; return `<li><b>${esc(z.zkratka)}</b> · ${levelBadge(n?.stupen)} ${esc(n?.popis || '')}</li>`; }).join('') || '<li class="zpc-na">—</li>');
    setN('zpPrevNadstandardN', zps.length);
    // duševní
    const ds = buildDusevniHeatmap(p);
    set('zpPrevDusevni', heatmap(ds.rows, ds.cols, ds.cell, { title: 'Duševní zdraví', sub: 'Stupeň nabídky z webu podle typu programu; co rešerše našla, je u buňky a v seznamu „Proč ten stupeň“.', source: srcWeb, sortable: true, rowHeader: 'Pojišťovna' }));
    // proč ten stupeň: viditelné zdůvodnění každé buňky (nejen v tooltipu)
    set('zpPrevProc', prevProcHtml(p));
    setN('zpPrevProcN', `${zps.length} pojišťoven`);

    // fond prevence (podle „Moje pojišťovna“)
    fp.p = p;
    bindFond();
    set('zpFpStruktura', fpHtml());
    renderPravidla().catch(() => {});

    // doložené výsledky
    const dol = zps.flatMap((z) => (z.dolozene_vysledky || []).map((v) => `<li><b>${esc(z.zkratka)}</b> · ${esc(v.program)}: ${esc(v.vysledek)}${v.rok ? ` (${esc(v.rok)})` : ''}</li>`));
    set('zpDolozene', dol.join('') || '<li class="zpc-na">Žádná výroční zpráva neuvádí měřitelný výsledek programu.</li>');
    setN('zpDolozeneN', dol.length);

    // odpovědi na 7 otázek: matice pokrytí + plné znění
    const cv = buildCoverage(p);
    set('zpOdpovediMatrix', coverageMatrix(cv.rows, cv.cols, cv.cell, {
      title: 'Co výroční zprávy odpovídají na sedm otázek',
      sub: 'Prázdná místa jsou přesně to, na co se pojišťoven zeptáme.',
      source: 'pojišťovny · výroční zprávy · 2024 (ZPŠ 2020, OZP 2025)', rowHeader: 'Pojišťovna',
    }));
    set('zpOdpovedi', zps.map((z) => `<details class="zpc-acc"><summary>${dot(z.kod)}${esc(z.zkratka)} <span class="zpc-na">· ${esc(z.rok_vz ? `VZ ${z.rok_vz}` : '')}</span></summary><div class="zpc-acc-body"><dl>${VZ_OTAZKY.map(([k, l]) => { const v = z.odpovedi?.[k]; const txt = Array.isArray(v) ? v.map(esc).join(', ') : esc(v || ''); return `<dt>${l}</dt><dd>${txt || '<span class="zpc-na">VZ neuvádí</span>'}</dd>`; }).join('')}</dl></div></details>`).join(''));
    setN('zpOdpovediN', `${zps.length} pojišťoven`);
    refreshInteract();
  }
  // měření dopadu z pojistovny.json (VZ 2024) — nezávislé na prevence souboru
  if (d) {
    const zs = d.pojistovny || [];
    set('zpMereni', zs.map((z) => `<li><b>${esc(z.zkratka)}</b>: ${z.mereni_dopadu?.hodnoceni_ve_vz === true ? '<span class="zpc-yes">ano</span>' : z.mereni_dopadu?.hodnoceni_ve_vz === false ? '<span class="zpc-no">ne</span>' : NA} <span class="zpc-na">${esc(short(z.mereni_dopadu?.citace, 160))}</span></li>`).join(''));
    setN('zpMereniN', `${zs.filter((z) => z.mereni_dopadu?.hodnoceni_ve_vz === true).length} z ${zs.length} ano`);
  }
}

// ---------------------------------------------------------------- pravidla fondu a kontroly (A6.2)
// Čte data/pojistovny-fond-pravidla.json (třída C: pojmenované instituce, žádná jména osob).
// Podmínka není dobrá ani špatná, proto neutrální tón matice; počet kontrol se nesčítá ani neřadí.

export const PRAVIDLA_URL = 'data/pojistovny-fond-pravidla.json';
/** Podmínky v matici ano / částečně / ne; lhůta a stropy jsou číselné a mají vlastní tabulku. */
export const PRAVIDLA_MATICE = ['registrace_trva', 'bez_preregistrace', 'preventivni_prohlidka', 'bez_dluhu', 'jen_aplikace', 'podminene_prispevky'];
const PRAVIDLA_STAV = { ano: 'ano', castecne: 'částečně', ne: 'ne' };

const pravidlaZps = (f) => (Array.isArray(f?.pojistovny) ? f.pojistovny : []);
const podminkaNazev = (f, id) => (f?.podminky || []).find((p) => p.id === id)?.nazev || id;

/** Matice podmínek: řádky = ZP (7), sloupce = PRAVIDLA_MATICE, buňka = {stav, tip} (null = nedohledáno). */
export function buildPravidlaMatrix(f) {
  const rows = pravidlaZps(f).map((z) => ({ kod: z.kod, label: z.zkratka, _z: z }));
  const cols = PRAVIDLA_MATICE.map((id) => ({ key: id, label: podminkaNazev(f, id) }));
  const cell = (r, c) => {
    const b = r._z.podminky?.[c.key];
    if (!b || !PRAVIDLA_STAV[b.stav]) return null;
    const tip = [b.poznamka, b.citace ? `„${short(b.citace, 140)}“` : ''].filter(Boolean).join(' · ');
    return { stav: b.stav, tip };
  };
  return { rows, cols, cell };
}

/** Rozbalovací seznam citací: každá buňka matice s doslovnou citací, odkazem a datem ověření. */
export function pravidlaCitaceHtml(f) {
  const ids = [...PRAVIDLA_MATICE, 'lhuta_podani_dni', 'strop_dospely_kc', 'strop_dite_kc'];
  return pravidlaZps(f).map((z) => {
    const dl = ids.map((id) => {
      const b = z.podminky?.[id];
      const nm = esc(podminkaNazev(f, id));
      if (!b) return `<dt>${nm}</dt><dd class="zpc-na">nedohledáno</dd>`;
      if (b.stav == null) return `<dt>${nm}: <span class="zpc-na">nedohledáno</span></dt><dd>${esc(b.poznamka || '')}</dd>`;
      const cit = `<q>${esc(b.citace)}</q> <a href="${esc(b.url)}" rel="noopener">zdroj</a> <span class="zpc-na">· ověřeno ${esc(datumCz(b.overeno_at))}</span>`;
      return `<dt>${nm}: ${esc(PRAVIDLA_STAV[b.stav] || b.stav)}${b.hodnota != null ? ` (${esc(fmtKc(b.hodnota, 0))})` : ''}</dt><dd>${cit}${b.poznamka ? `<br><small>${esc(b.poznamka)}</small>` : ''}</dd>`;
    }).join('');
    return `<details class="zpc-acc" data-zp="${esc(z.kod)}"><summary>${dot(z.kod)}${esc(z.zkratka)}</summary><div class="zpc-acc-body"><dl>${dl}</dl></div></details>`;
  }).join('');
}

/** Lhůta podání v jednotce, kterou pojišťovna uvádí: „3 měsíce“ zůstávají měsíce (kalendářní), ne 90 dní. */
export function lhutaText(b) {
  if (!(b?.stav === 'ano' && Number.isFinite(b.hodnota))) return null;
  const n = b.hodnota;
  if (b.jednotka === 'mesice') return `${fmtKc(n, 0)} ${n === 1 ? 'měsíc' : n >= 2 && n <= 4 ? 'měsíce' : 'měsíců'}`;
  return `${fmtKc(n, 0)} ${n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní'}`;
}
const LHUTA_TEXT = lhutaText;
/** Text jedné buňky stropu: částka, „bez souhrnného stropu“, jiný limit, nebo null (nedohledáno). */
export function stropText(b) {
  if (!b || b.stav == null) return null;
  if (b.stav === 'ne') return 'bez souhrnného stropu';
  if (Number.isFinite(b.hodnota)) return `${fmtKc(b.hodnota, 0)} Kč${b.stav === 'castecne' ? ' (jen část)' : ''}`;
  return 'jiný limit než v Kč';
}

/** Řádky tabulky lhůta + stropy (jedna pojišťovna = jeden řádek). */
export function buildLimity(f) {
  return pravidlaZps(f).map((z) => ({
    kod: z.kod, zkratka: z.zkratka,
    lhuta: LHUTA_TEXT(z.podminky?.lhuta_podani_dni), lhutaPozn: z.podminky?.lhuta_podani_dni?.poznamka || '',
    dospely: stropText(z.podminky?.strop_dospely_kc), dospelyPozn: z.podminky?.strop_dospely_kc?.poznamka || z.podminky?.strop_dospely_kc?.citace || '',
    dite: stropText(z.podminky?.strop_dite_kc), ditePozn: z.podminky?.strop_dite_kc?.poznamka || z.podminky?.strop_dite_kc?.citace || '',
  }));
}

/** Tabulka lhůt a stropů jako tabulkové dvojče s CSV (stejný vzor jako kontext fondu na Penězích). */
export function limityHtml(f) {
  const rows = buildLimity(f);
  if (!rows.length) return '';
  const title = 'Lhůta podání žádosti a roční strop příspěvků z fondu prevence (pravidla 2026)';
  const source = 'pojišťovny · podmínky čerpání z fondu prevence (weby k 3. 11. 2026, citace u každé buňky)';
  const headers = ['Pojišťovna', 'Lhůta podání od úhrady', 'Roční strop, dospělý', 'Roční strop, dítě'];
  const td = (v, pozn) => (v ? `<td class="zpc-txt">${esc(v)}${pozn ? `<small>${esc(short(pozn, 130))}</small>` : ''}</td>` : `<td class="zpc-txt">${NA}</td>`);
  const body = rows.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row">${dot(r.kod)}${esc(r.zkratka)}</th>${td(r.lhuta, r.lhutaPozn)}${td(r.dospely, r.dospelyPozn)}${td(r.dite, r.ditePozn)}</tr>`).join('');
  const head = headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  return '<div class="zpv zpv-figure zpv-fond-limity">'
    + `<figcaption class="zpv-cap"><span class="zpv-title">${esc('Lhůta podání a roční strop')}</span>`
    + `<span class="zpv-sub">${esc('Strop je jen to, co pojišťovna stanoví jako souhrn za rok; bez něj mají limity jednotlivé příspěvky. Výše stropu nevypovídá o štědrosti: pojišťovny mají jiné programy, jiné částky u jednotlivých příspěvků a jiné mechanismy (kredity, počet příspěvků).')}</span></figcaption>`
    + `<details class="zpv-table" open data-csv-title="${esc(title)}" data-csv-source="${esc(source)}"><summary>Tabulka: lhůta a strop</summary>`
    + '<button type="button" class="zpv-csv" data-zpv-csv>Stáhnout CSV</button>'
    + `<div class="zpv-scroll" tabindex="0" role="region" aria-label="${esc(`Tabulka: ${title}`)}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></details></div>`;
}

/** Úvod sekce: zákonný rámec, nenárokovost a stanovisko MZ z dat (čísla a citace nejsou v kódu). */
export function ramecHtml(f) {
  const R = f?.ramec;
  if (!R) return '';
  const par = (R.zakon || []).map((z) => z.paragraf).filter((x, i, a) => a.indexOf(x) === i);
  const zdroje = `zdroje fondu: ${R.strop_pct != null ? `až ${esc(String(R.strop_pct))} % pojistného` : 'zákonný strop'} po přerozdělení za předchozí rok, jen při neschodkovém plánu, a pokuty a penále`;
  return `<p class="zpc-note zpc-fp-ramec">Zákon určuje jen ${zdroje} a obecný účel (${esc(par.join(', '))}). `
    + `<b>Na příspěvek není právní nárok</b>; ministerstvo to potvrzuje a pravidla pojišťoven neřídí. `
    + `${R.stanovisko_mz?.obsah ? esc(R.stanovisko_mz.obsah) : ''} `
    + `Stav pravidel: ${esc(datumCz(f.stav_k))}; pojišťovny je během roku mění.</p>`;
}

/** Kontroly jako jeden seznam seřazený od nejnovějších; plošné kontroly (všech sedm ZP) nemají kód pojišťovny. */
export function buildKontroly(f) {
  const out = [];
  for (const z of pravidlaZps(f)) for (const k of (z.kontroly || [])) out.push({ ...k, kod: z.kod, zkratka: z.zkratka });
  for (const k of (f?.kontroly_plosne || [])) out.push({ ...k, kod: null, zkratka: 'všechny pojišťovny' });
  return out.sort((a, b) => b.rok_kontroly - a.rok_kontroly || String(a.cislo).localeCompare(String(b.cislo), 'cs'));
}

const fmtKcCelkem = (kc) => `${fmtKc(kc, 0)} Kč`;
/** Časová osa kontrol: rok, orgán a číslo, pojišťovna, předmět, zjištění (rozbalovací), částky, reakce, odkaz. */
export function kontrolyHtml(f) {
  const ks = buildKontroly(f);
  if (!ks.length) return '<p class="zpc-na">Kontroly zatím nejsou k dispozici.</p>';
  const items = ks.map((k) => {
    const who = k.kod ? `${dot(k.kod)}${esc(k.zkratka)}` : esc(k.zkratka);
    const castky = (k.castky_kc || []).length
      ? `<ul class="zpc-kr-castky">${k.castky_kc.map((c) => `<li>${esc(fmtKcCelkem(c.kc))} · ${esc(c.popis)}</li>`).join('')}</ul>` : '';
    const dalsi = k.url_dalsi ? ` · <a href="${esc(k.url_dalsi)}" rel="noopener">zpravodajství</a>` : '';
    return `<li class="zpc-kr"${k.kod ? ` data-zp="${esc(k.kod)}"` : ''} id="kontrola-${esc(k.id)}">`
      + `<span class="zpc-kr-rok">${esc(String(k.rok_kontroly))}</span>`
      + `<div class="zpc-kr-body"><p class="zpc-kr-hlava"><b>${esc(k.organ)} ${esc(k.cislo)}</b> · ${who} <span class="zpc-na">· kontrolované období ${esc(k.obdobi)}</span></p>`
      + `<p class="zpc-kr-predmet">${esc(k.predmet)}</p>`
      + `<details class="zpc-acc"><summary>Zjištění<span class="zpc-n"> · ${k.zjisteni.length}</span></summary><div class="zpc-acc-body"><ul>${li(k.zjisteni)}</ul>${castky}</div></details>`
      + `<p class="zpc-kr-reakce"><b>Reakce:</b> ${esc(k.reakce)}</p>`
      + `<p class="zpc-kr-zdroj"><a href="${esc(k.url)}" rel="noopener">Zdroj</a>${dalsi}</p></div></li>`;
  }).join('');
  return `<ol class="zpc-kontroly" aria-label="Kontroly fondu prevence podle roku, od nejnovějších">${items}</ol>`
    + '<p class="zpc-cap">Počet kontrol u pojišťovny neřadíme ani nesčítáme: závisí na plánu kontrolního orgánu, ne na kvalitě pojišťovny. U OZP, ZPŠ a RBP jsme zveřejněný kontrolní závěr NKÚ k fondu prevence nenašli, což neznamená, že kontrola neproběhla.</p>';
}

/** Celá sekce (čistá funkce, HTML); matice a tabulka jdou přes zp-viz. */
export function pravidlaHtml(f) {
  if (!f || !pravidlaZps(f).length) return '<p class="zpc-na">Pravidla fondu prevence zatím nejsou k dispozici.</p>';
  const m = buildPravidlaMatrix(f);
  const matice = coverageMatrix(m.rows, m.cols, m.cell, {
    title: 'Podmínky čerpání příspěvků z fondu prevence',
    sub: 'Podmínka není dobrá ani špatná, je to pravidlo, které si každá pojišťovna určuje sama. Doslovnou citaci najdete po najetí na buňku a v seznamu pod maticí.',
    source: `pojišťovny · podmínky čerpání fondu prevence · weby k ${datumCz(f.stav_k)}`,
    rowHeader: 'Pojišťovna', tone: 'neutral', labels: PRAVIDLA_STAV,
  });
  return ramecHtml(f) + matice
    + `<details class="zpc-acc"><summary>Citace a odkazy ke každé buňce<span class="zpc-n"> · ${pravidlaZps(f).length} pojišťoven</span></summary><div class="zpc-acc-body">${pravidlaCitaceHtml(f)}</div></details>`
    + limityHtml(f)
    + '<h4 class="zpc-h4">Kdo fond kontroloval a co našel</h4>'
    + '<p class="zpc-note">Veřejně dostupné kontroly Nejvyššího kontrolního úřadu (NKÚ) a ministerstev zdravotnictví a financí. Jde o popis zjištění z kontrolních závěrů, ne o naše hodnocení; reakce pojišťoven jsou uvedeny, pokud je zveřejnily.</p>'
    + kontrolyHtml(f);
}

/** Vykreslí sekci do #zpFpPravidla; data si dočte přes sdílenou cache (stejný fetch použije patička Zdroje). */
export async function renderPravidla() {
  const box = typeof document !== 'undefined' ? document.getElementById('zpFpPravidla') : null;
  if (!box) return;
  const f = await loadJson(PRAVIDLA_URL);
  box.innerHTML = pravidlaHtml(f);
  refreshInteract();
}

// ---------------------------------------------------------------- modul 4: otázky
/** Pořadí sad podle fází (docs/pojistovny-dotazniky.md § Přehled); neznámé sady až na konec v pořadí JSON. */
export const SADY_PORADI = ['aplikace-privetivost', 'fond-prevence', 'pobocky-definice', 'dostupnost-prechody', 'napo-pacientske-organizace', 'pravo-na-odpoved', 'rizikovi-pojistenci', 'pojistenci-anketa'];

const KANAL_LABEL = { 'web-token': 'osobní odkaz od redakce', 'web-verejnost': 'veřejně na webu, bez tokenu', 'dopis+web': 'dopis s nabídkou spolupráce + web', interni: 'vyplňuje redakce (interní list)' };

/** Části sady: `casti[]`, nebo jediná nepojmenovaná část z `otazky[]` (sady bez členění). */
export function sadaCasti(sada) {
  if (Array.isArray(sada?.casti) && sada.casti.length) return sada.casti;
  return Array.isArray(sada?.otazky) && sada.otazky.length ? [{ id: null, nazev: null, otazky: sada.otazky }] : [];
}

/** Všechny sady seřazené podle fází, každá s počtem otázek. */
export function buildOtazkySady(o) {
  const sady = (o?.sady || []).filter((s) => s && s.id);
  const idx = (s) => { const i = SADY_PORADI.indexOf(s.id); return i < 0 ? SADY_PORADI.length : i; };
  return sady
    .map((s, i) => ({ sada: s, poradi: i }))
    .sort((a, b) => idx(a.sada) - idx(b.sada) || a.poradi - b.poradi)
    .map(({ sada }) => ({ sada, pocet: sadaCasti(sada).reduce((n, c) => n + (c.otazky || []).length, 0) }));
}

function otazkaHtml(q, n) {
  const vyber = q.moznosti?.length ? ` <small class="zpc-na">(${q.vyber === 'jeden' ? 'jedna volba' : 'více voleb'})</small>` : '';
  const opts = q.moznosti?.length ? `<span class="zpc-opts">${q.moznosti.map(esc).join(' · ')}</span>` : '';
  const nap = q.napoveda ? `<span class="zpc-opts">Nápověda: ${esc(q.napoveda)}</span>` : '';
  const del = !q.moznosti?.length && q.max_delka ? `<span class="zpc-opts">Volný text, nejvýš ${esc(String(q.max_delka))} znaků.</span>` : '';
  return `<li value="${n}"><small class="zpc-na">${esc(q.id)}</small> ${esc(q.text)}${vyber}${opts}${nap}${del}</li>`;
}

const OBLAST_NAZEV = { prevence: 'Prevence s dopadem', dostupnost: 'Dostupnost a čekací doby', sit: 'Síť a ohrožené oblasti', kvalita: 'Kvalita ve smluvní politice', servis: 'Klientský servis a informování', hospodareni: 'Hospodaření a transparentnost' };

/** Vyhodnocovací metodika sady (pole vyhodnoceni): oblasti semaforu, vstup, pravidla, výstup. */
export function vyhodnoceniHtml(v, oblastiNazvy = OBLAST_NAZEV) {
  if (!v || typeof v !== 'object') return '';
  const obl = (v.oblasti || []).map((id) => oblastiNazvy[id] || id).map(esc).join(', ');
  return '<div class="zpc-vyhod"><p><b>Vyhodnocení</b>' + (obl ? ` · oblast semaforu: ${obl}` : '') + '</p>'
    + (v.vstup ? `<p>${esc(v.vstup)}</p>` : '')
    + ((v.pravidla || []).length ? `<ol>${v.pravidla.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : '')
    + (v.vystup ? `<p><b>Výstup:</b> ${esc(v.vystup)}</p>` : '')
    + '</div>';
}

/**
 * Návrh dotazníků 1…n: znění všech sad v pořadí fází (zdroj data/pojistovny-otazky.json).
 * opts.proces = false vynechá procesní texty (úvod pro respondenta, právní základ, kanál);
 * opts.vyhodnoceni = false vynechá vyhodnocovací metodiku.
 */
export function otazkySadyHtml(o, opts = {}) {
  const { proces = true, vyhodnoceni = true } = opts;
  const list = buildOtazkySady(o);
  if (!list.length) return '<p class="zpc-na">Sady otázek zatím nejsou k dispozici.</p>';
  return list.map(({ sada, pocet }, i) => {
    let n = 0;
    const casti = sadaCasti(sada).map((c) => `${c.nazev ? `<p><b>${c.id ? `${esc(c.id)} · ` : ''}${esc(c.nazev)}</b></p>` : ''}<ol>${(c.otazky || []).map((q) => otazkaHtml(q, ++n)).join('')}</ol>`).join('');
    const meta = (proces
      ? [sada.faze, sada.respondent, KANAL_LABEL[sada.kanal] || sada.kanal, `verze ${sada.verze ?? '1'}`]
      : [sada.faze, sada.respondent]).filter(Boolean).map(esc).join(' · ');
    return `<details class="zpc-acc zpc-q" id="dotaznik-${esc(sada.id)}"><summary>${i + 1}. ${esc(sada.nazev)}<span class="zpc-n">${pocet} otázek</span></summary><div class="zpc-acc-body">`
      + (meta ? `<p class="zpc-note">${meta}</p>` : '')
      + (proces && sada.uvod ? `<p>${esc(sada.uvod)}</p>` : '')
      + (proces && sada.pravni_zaklad ? `<p class="zpc-note">${esc(sada.pravni_zaklad)}</p>` : '')
      + casti
      + (vyhodnoceni ? vyhodnoceniHtml(sada.vyhodnoceni) : '')
      + '</div></details>';
  }).join('');
}

export function renderOtazky(o) {
  if (!o) { set('zpOtazky', '<p class="zpc-na">Sady otázek zatím nejsou k dispozici.</p>'); return; }
  const list = buildOtazkySady(o);
  // data-rezim="metodika" na kontejneru = jen otázky a vyhodnocení, bez procesních textů
  const box = document.getElementById('zpOtazky');
  const proces = box?.dataset?.rezim !== 'metodika';
  set('zpOtazky', otazkySadyHtml(o, { proces }));
  setN('zpOtazkyN', `${list.length} sad · ${list.reduce((n, x) => n + x.pocet, 0)} otázek`);
}

