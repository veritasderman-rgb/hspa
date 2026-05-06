// Detail page for a single HSPA indicator (indikator.html?id=...).
// Renders: hero with value/trend, OECD/EU benchmark, what-affects-it explainer,
// regional breakdown as tile cartogram + table, links to related strategies / explainers.

import { renderModuleNav, escapeHtml } from './page-shared.js';

// NUTS-3 Czech regions, each placed on a 7×3 tile grid. Position is a rough
// geographic approximation (col=west→east, row=north→south).
const TILE_LAYOUT = {
  CZ041: { col: 1, row: 2, short: 'KV', name: 'Karlovarský' },
  CZ042: { col: 2, row: 1, short: 'UL', name: 'Ústecký' },
  CZ051: { col: 3, row: 1, short: 'LB', name: 'Liberecký' },
  CZ052: { col: 4, row: 1, short: 'KH', name: 'Královéhradecký' },
  CZ032: { col: 2, row: 2, short: 'PL', name: 'Plzeňský' },
  CZ010: { col: 3, row: 2, short: 'PR', name: 'Praha' },
  CZ020: { col: 4, row: 2, short: 'SC', name: 'Středočeský' },
  CZ053: { col: 5, row: 2, short: 'PA', name: 'Pardubický' },
  CZ071: { col: 6, row: 2, short: 'OL', name: 'Olomoucký' },
  CZ080: { col: 7, row: 2, short: 'MS', name: 'Moravskoslezský' },
  CZ031: { col: 3, row: 3, short: 'JC', name: 'Jihočeský' },
  CZ063: { col: 4, row: 3, short: 'VY', name: 'Vysočina' },
  CZ064: { col: 5, row: 3, short: 'JM', name: 'Jihomoravský' },
  CZ072: { col: 6, row: 3, short: 'ZL', name: 'Zlínský' },
};

// Krátká vysvětlení faktorů ovlivňujících konkrétní indikátory.
// Pokud indikátor není v mapě, použije se obecný fallback dle area/domain.
const INFLUENCE_FACTORS = {
  nadeje_doziti_total: {
    why: 'Naděje dožití při narození je sumární ukazatel mortality napříč všemi věky a příčinami. V mezinárodním srovnání reflektuje souběh kvality péče, prevence, behaviorálních rizik a socioekonomických determinant zdraví.',
    factors: [
      'Kuřáctví, alkohol, obezita — Česko má dlouhodobě vyšší prevalenci než průměr OECD',
      'Mortalita z kardiovaskulárních a onkologických příčin — > 70 % rozdílu mezi ČR a top‑OECD',
      'Pokrytí preventivních programů (screening prsu, cervix, kolorektální)',
      'Socioekonomické nerovnosti — rozdíl mezi Prahou a strukturálně postiženými regiony (Ústecký, Karlovarský) je ~3 roky',
    ],
    levers: [
      'Národní strategie podpory veřejného zdraví — protitabákové intervence, nutriční regulace',
      'Reforma primární péče — kontinuita péče u chronicky nemocných (KVN, diabetes)',
      'Investice do screeningu — adresní zvaní, navýšení účasti na 70 % cílové populace',
    ],
  },
  nadeje_doziti_zeny: {
    why: 'Naděje dožití žen v ČR je o 4–6 let vyšší než u mužů — typický gender‑gap. Mezinárodní gap proti OECD je menší než u mužů, ale stále existuje.',
    factors: [
      'Nižší expozice rizikovým návykům (kouření, alkohol) než u mužů',
      'Vyšší účast v preventivních programech (gynekologie, screening prsu)',
      'Mortalita z KVN nastupuje u žen s ~10letým zpožděním (vliv estrogenů do menopauzy)',
    ],
    levers: [
      'Pokrytí mamografického a cervikálního screeningu',
      'Včasná detekce a léčba osteoporózy a kardiovaskulárních rizik po menopauze',
    ],
  },
  kojenecka_umrtnost: {
    why: 'Kojenecká úmrtnost je klasický OECD/WHO HSPA indikátor. Reflektuje kvalitu prenatální, perinatologické a neonatologické péče, dostupnost péče matkám i obecné socioekonomické podmínky populace. Česko patří dlouhodobě k absolutní špičce OECD.',
    factors: [
      'Síť 12 perinatologických center (PCIP) garantujících plnou regionální dostupnost intenzivní neonatologické péče nad 1 500 g hmotnosti / 32. týden gestace',
      'Vysoké pokrytí prenatální péče (gynekologické vyšetření v každém trimestru, ultrazvuková screening v 11.–14. a 18.–22. týdnu)',
      'Strukturovaný systém přepravy rizikových rodiček a novorozenců (in‑utero transport)',
      'Socioekonomické podmínky matky — vzdělání, věk, kouření v těhotenství, dostupnost prenatální péče',
    ],
    levers: [
      'Udržení sítě PCIP a dostupnosti přepravy do 60 minut',
      'Snížení podregistrace prenatální péče u sociálně vyloučených matek',
      'Programy na snížení kouření v těhotenství (zejména v Ústeckém a Karlovarském kraji)',
    ],
  },
  mortalita_kardiovaskularni: {
    why: 'Kardiovaskulární mortalita je dominantní příčinou úmrtí v ČR (~40 % všech úmrtí). Česko má proti průměru OECD nadmortalitu cca o 30 %; tento rozdíl tvoří většinu rozdílu naděje dožití proti západní Evropě.',
    factors: [
      'Kuřáctví — > 22 % populace 15+ kouří denně (OECD průměr ~16 %)',
      'Hypertenze — 40 % populace, kontrolovaná pouze u ~68 %',
      'Obezita a fyzická inaktivita — > 20 % obézních (BMI ≥ 30)',
      'Pozdní záchyt — diagnostika často až ve fázi akutního infarktu',
    ],
    levers: [
      'Programy primární prevence (Zdravé sídliště, MIDIA‑KVN)',
      'Efektivní kontrola hypertenze a hypercholesterolemie v ambulantní péči',
      'Síť kardiocenter (12 komplexních + 11 perkutánních center) — dostupnost akutní intervenční kardiologie',
    ],
  },
  mortalita_onkologicka: {
    why: 'Onkologická mortalita reflektuje souhru incidence, časnosti záchytu (screening), kvality léčby a přístupu k inovativním terapiím. Česko má vysokou incidenci některých nádorů (kolorektum, ledviny, prostata) a střední úroveň screeningu.',
    factors: [
      'Pokrytí adresního zvaní na screening (kolorektum, prsa, cervix)',
      'Vysoká prevalence rizikových faktorů (alkohol, obezita, kuřáctví)',
      'Síť 13 Komplexních onkologických center (KOC) a regionálních center',
      'Časový odstup mezi diagnózou a zahájením léčby',
    ],
    levers: [
      'Národní onkologický program — populační screening + adresní zvaní',
      'Akcelerace HTA pro inovativní onkologické terapie (immuno- a target therapy)',
      'Cluster Center for Cancer Care + Národní portál onkologické péče',
    ],
  },
  cekaci_doba_kycel: {
    why: 'Čekací doba na elektivní operaci kyčle je zástupce dostupnosti plánované péče. Není to pouze otázka kapacity — odráží i alokaci úhrad mezi lůžkové segmenty, regulační omezení (volume cap) a smluvní politiku zdravotních pojišťoven.',
    factors: [
      'Volume cap v úhradové vyhlášce — limit počtu hrazených operací na nemocnici',
      'Regulační omezení v lůžkové akutní péči',
      'Migrace pacientů mezi kraji za kratší čekací dobou',
      'Roční dohodovací řízení a alokace prostředků na lůžkovou péči',
    ],
    levers: [
      'Centrální čekací listy a transparentní reporting čekacích dob (povinnost ze zákona 372/2011 Sb.)',
      'Reforma volume capu — adaptivní úhrada podle skutečné poptávky a klinických indikátorů',
      'Smluvní strategie pojišťoven — nákup kapacity v nedostatkových regionech',
    ],
  },
  spotreba_antibiotik: {
    why: 'Spotřeba antibiotik je proxy pro kvalitu antibiotic stewardship — mírnější ATB politika snižuje rezistenci a vedlejší účinky. ČR má proti severským zemím vyšší preskripci, zejména v ambulantní péči.',
    factors: [
      'Preskripční zvyklosti v ambulantní péči (PRL/L, pediatři)',
      'Akreditace a klinické audity v lůžkových zařízeních (centrum CARE)',
      'Pacientská poptávka po ATB u virových onemocnění',
      'Dostupnost rychlé diagnostiky (CRP, streptest)',
    ],
    levers: [
      'Národní akční plán pro AMR (NAP AMR 2023–2027) — koordinace MZ + SZÚ + ÚZIS',
      'Plošná dostupnost POCT diagnostiky v primární péči',
      'Klinická vodítka odborných společností (ČSAP, SIL)',
    ],
  },
  vakcinace_mmr_deti: {
    why: 'MMR (spalničky, příušnice, zarděnky) — proočkovanost druhou dávkou je klíčová pro herd immunity (≥ 95 %). ČR od 2018 klesá pod tuto hranici v některých krajích, což se projevuje opakovanými epidemickými ohnisky spalniček.',
    factors: [
      'Postoje rodičů (vakcinační hesitancy) — výrazněji v Praze a Karlovarském kraji',
      'Dostupnost a komunikace praktického lékaře pro děti a dorost',
      'Mediální narativ a desinformace o bezpečnosti vakcín',
      'Povinnost očkování (zákon 258/2000 Sb. + vyhláška 537/2006 Sb.)',
    ],
    levers: [
      'Komunikační kampaně SZÚ a Národního zdravotnického informačního systému',
      'Reaktivní vakcinace v ohniscích pomocí mobilních týmů',
      'Důsledné vymáhání povinného očkování pro zápis do mateřských škol',
    ],
  },
  obezita_prevalence: {
    why: 'Obezita je hlavní rizikový faktor pro KVN, diabetes 2. typu a několik typů nádorů. Česko má prevalenci ≥ 20 %, výrazně nad OECD průměrem.',
    factors: [
      'Nutriční vzorec (vysoká spotřeba zpracovaných potravin a slazených nápojů)',
      'Fyzická inaktivita — < 50 % populace splňuje WHO doporučení 150 min/týden',
      'Socioekonomické faktory (vzdělání, příjem) — silná korelace v ÚL, KV, MS',
      'Marketing potravin směrem k dětem',
    ],
    levers: [
      'Zdanění slazených nápojů (nezavedeno v ČR)',
      'Reforma školního stravování — implementace metodiky Zdravá školní jídelna',
      'Hrazená strukturovaná intervence v primární péči (kód SZV 01207, 01208)',
    ],
  },
  kuractvi_denni: {
    why: 'Kouření zůstává v ČR hlavním modifikovatelným rizikovým faktorem KVN, plicních nádorů a CHOPN. Prevalence ~22 % (OECD ~16 %).',
    factors: [
      'Cenová politika — spotřební daň z tabáku (ČR pod EU mediánem)',
      'Bezbariérovost odvykací léčby (terapeutické intervence + farmakoterapie)',
      'Ochrana před pasivním kouřením (zákon 65/2017 Sb.)',
      'Marketing alternativních nikotinových výrobků',
    ],
    levers: [
      'Postupné navyšování spotřební daně z tabáku',
      'Plné hrazení odvykací léčby v primární péči (SZV kódy 01411, 01412)',
      'Centra léčby závislosti na tabáku (~40 v ČR, dostupnost limitovaná)',
    ],
  },
  screening_mamograficky: {
    why: 'Mamografický screening odhaluje karcinom prsu v early‑stage — > 95 % 5letého přežití u stadia I vs. < 30 % u stadia IV. Cílová populace: ženy 45–69 let, intervalu 2 roky.',
    factors: [
      'Adresní zvaní (centralizováno přes ÚZIS od 2014)',
      'Dostupnost akreditovaných screeningových center (~75 v ČR)',
      'Sociokulturní bariéry (strach, časový rozpočet, mobilita)',
      'Spolupráce gynekologů a praktických lékařů',
    ],
    levers: [
      'Cílené zvaní neúčastnic přes praktického lékaře (od 2024)',
      'Mobilní mamografická pracoviště pro periferní regiony',
      'Komunikační kampaň MZ + Liga proti rakovině',
    ],
  },
  sebevrazdy_per_100k: {
    why: 'Sebevražednost reflektuje dostupnost a kvalitu psychiatrické péče, prevenci v rizikových skupinách, sociální determinanty a kontrolu prostředků. Česko má mezi OECD vyšší míru, zejména u mužů 45+.',
    factors: [
      'Dostupnost psychiatrické a psychologické péče (čekací doby na první kontakt)',
      'Reforma duševního zdraví — Centra duševního zdraví (CDZ), zatím ~40 z plánovaných 100',
      'Socioekonomické faktory (nezaměstnanost, exekuce, izolace)',
      'Konzumace alkoholu — > 50 % sebevražd v intoxikaci',
    ],
    levers: [
      'Dokončení sítě CDZ (Reforma péče o duševní zdraví 2014–2030)',
      'Linka první psychické pomoci (116 123) + národní krizové linky',
      'Pohotovostní psychiatrie 24/7 v každém kraji',
    ],
  },
  mortalita_preventabilni: {
    why: 'Preventovatelná mortalita (def. Eurostat/OECD) jsou úmrtí do 74 let, jimž bylo možné předejít primární prevencí nebo zdravou životosprávou. ČR má hodnotu ~195/100k vs. OECD průměr ~130 — výrazný rozdíl.',
    factors: [
      'Behaviorální rizika (alkohol, kouření, obezita)',
      'Socioekonomické nerovnosti (Ústecký a Karlovarský kraj > +25 % nad průměrem)',
      'Dopravní úrazy a mortalita v důsledku nehod',
      'Pokrytí preventivních programů a dispenzární péče',
    ],
    levers: [
      'Národní strategie veřejného zdraví (Zdraví 2030)',
      'Cílené intervence pro strukturálně postižené regiony',
      'Reforma primární péče s důrazem na prevenci',
    ],
  },
  lekari_per_1000: {
    why: 'Hustota lékařů je strukturový HSPA indikátor — kapacita systému poskytovat péči. ČR má 4,1 lékaře na 1 000 obyvatel, lehce nad OECD průměrem (3,7), ale s velkou regionální nerovností (Praha 5,2 vs. Karlovarský 3,4).',
    factors: [
      'Migrační saldo — odchody do EU vs. příchody (zejm. SK, UA)',
      'Věková struktura — ~30 % praktických lékařů > 60 let',
      'Atraktivita regionu (nemocnice, mzdy, infrastruktura)',
      'Distribuce specializačních míst (rezidenční místa hradí MZ ČR)',
    ],
    levers: [
      'Stipendia pro praktické lékaře v periferních regionech',
      'Krajské motivační programy (byty, příplatky)',
      'Reforma postgraduálního vzdělávání (kratší dráha pro praktiky)',
    ],
  },
};

const GENERIC_INFLUENCE = {
  why: 'Tento indikátor je jedním z 43 měřítek HSPA rámce pro Českou republiku. Jeho hodnota reflektuje souhru klinických, organizačních, finančních a behaviorálních faktorů.',
  factors: [
    'Behaviorální rizikové faktory v populaci',
    'Dostupnost a kvalita péče (struktura, organizace, čekací doby)',
    'Úhradové parametry a alokace prostředků',
    'Socioekonomické determinanty zdraví',
  ],
  levers: [
    'Politické rámce (Zdraví 2030, sektorové strategie MZ ČR)',
    'Operativní nástroje (úhradová vyhláška, smluvní politika ZP)',
    'Programy primární a sekundární prevence',
  ],
};

function getInfluence(id) {
  return INFLUENCE_FACTORS[id] ?? GENERIC_INFLUENCE;
}

// ============= TILE CARTOGRAM =============

function tileColor(value, countryAvg, direction, allValues) {
  // Spojitá divergující škála: lepší = zelená, horší = červená,
  // rozsah dán nejvyšším / nejnižším z hodnot oproti průměru.
  if (value == null) return '#E2E8F0';
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const range = Math.max(countryAvg - min, max - countryAvg) || 1;
  const diffNorm = (value - countryAvg) / range; // -1..+1

  const isBetter = direction === 'higher_is_better' ? diffNorm > 0 : diffNorm < 0;
  const intensity = Math.min(1, Math.abs(diffNorm));
  if (Math.abs(diffNorm) < 0.05) return '#F1F5F9'; // near average

  if (isBetter) {
    // light → strong green
    const opacity = 0.25 + 0.55 * intensity;
    return `rgba(56, 118, 29, ${opacity.toFixed(2)})`;
  } else {
    const opacity = 0.25 + 0.6 * intensity;
    return `rgba(180, 95, 6, ${opacity.toFixed(2)})`;
  }
}

function renderTileCartogram(dataset) {
  if (!dataset || !Array.isArray(dataset.regions)) return '';
  const direction = dataset.direction ?? 'higher_is_better';
  const countryAvg = dataset.country_avg;
  const allValues = dataset.regions.map(r => r.value);
  const byCode = Object.fromEntries(dataset.regions.map(r => [r.code, r]));

  // Výpočet rozměrů viewBox
  const COL_W = 100;
  const ROW_H = 92;
  const PAD = 8;
  let maxCol = 0, maxRow = 0;
  for (const t of Object.values(TILE_LAYOUT)) {
    if (t.col > maxCol) maxCol = t.col;
    if (t.row > maxRow) maxRow = t.row;
  }
  const W = (maxCol + 1) * COL_W;
  const H = (maxRow + 1) * ROW_H + 12;

  const tiles = Object.entries(TILE_LAYOUT).map(([code, t]) => {
    const r = byCode[code];
    const value = r?.value ?? null;
    const fill = value != null ? tileColor(value, countryAvg, direction, allValues) : '#F1F5F9';
    const x = t.col * COL_W;
    const y = t.row * ROW_H;
    const valueText = value != null
      ? (value < 100 ? value.toFixed(1) : Math.round(value).toString())
      : '—';
    const diff = value != null ? value - countryAvg : null;
    const tooltip = `${t.name} (${code})\n${valueText} ${dataset.unit}\nΔ od průměru ČR: ${diff != null ? (diff > 0 ? '+' : '') + diff.toFixed(diff < 0.1 && diff > -0.1 ? 2 : 1) : '—'}`;

    return `
      <g class="tile" tabindex="0" role="img" aria-label="${escapeHtml(tooltip.replace(/\n/g, '. '))}">
        <title>${escapeHtml(tooltip)}</title>
        <rect x="${x + PAD}" y="${y + PAD}" width="${COL_W - 2 * PAD}" height="${ROW_H - 2 * PAD}"
              rx="6" ry="6" fill="${fill}" stroke="#94A3B8" stroke-width="1" />
        <text x="${x + COL_W / 2}" y="${y + ROW_H / 2 - 6}" text-anchor="middle"
              font-size="13" font-weight="700" fill="#1F2D3A">${t.short}</text>
        <text x="${x + COL_W / 2}" y="${y + ROW_H / 2 + 14}" text-anchor="middle"
              font-size="14" font-weight="600" fill="#1F2D3A">${valueText}</text>
      </g>`;
  }).join('');

  const legend = `
    <div class="cartogram-legend">
      <span class="leg-item"><span class="leg-swatch" style="background: rgba(56,118,29,0.7)"></span>lépe než průměr ČR</span>
      <span class="leg-item"><span class="leg-swatch" style="background: #F1F5F9; border: 1px solid #94A3B8"></span>v okolí průměru</span>
      <span class="leg-item"><span class="leg-swatch" style="background: rgba(180,95,6,0.7)"></span>hůře než průměr ČR</span>
      <span class="leg-item leg-cz">Průměr ČR: <strong>${countryAvg} ${dataset.unit}</strong></span>
    </div>`;

  return `
    <div class="cartogram-wrap">
      <svg class="cz-cartogram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa krajů ČR — hodnoty indikátoru po krajích">
        ${tiles}
      </svg>
      ${legend}
    </div>`;
}

function renderRegionTable(dataset) {
  if (!dataset?.regions?.length) return '';
  const direction = dataset.direction ?? 'higher_is_better';
  const betterHigher = direction !== 'lower_is_better';
  const sorted = [...dataset.regions].sort((a, b) => betterHigher ? b.value - a.value : a.value - b.value);
  const rows = sorted.map(r => {
    const diff = (r.value - dataset.country_avg);
    const isBetter = betterHigher ? diff > 0 : diff < 0;
    const diffCls = Math.abs(diff) < 0.05 ? '' : (isBetter ? 'pos' : 'neg');
    const diffStr = (diff > 0 ? '+' : '') + diff.toFixed(Math.abs(diff) < 1 ? 2 : 1);
    return `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${r.value < 100 ? r.value.toFixed(1) : Math.round(r.value)}</td>
        <td class="diff ${diffCls}">${diffStr}</td>
      </tr>`;
  }).join('');
  return `
    <table class="regions-table">
      <thead>
        <tr><th>Kraj</th><th>${escapeHtml(dataset.unit)}</th><th>Δ od průměru ČR</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ============= MAIN RENDER =============

const SIGNAL_LABEL = {
  good: 'lépe než benchmark',
  warn: 'mírně horší než benchmark',
  bad: 'výrazně horší než benchmark',
  neutral: 'bez benchmarku',
};

const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextové',
};

function findRegionalDataset(regionsRoot, indicator) {
  if (!regionsRoot?.datasets?.length) return null;
  // 1) přesná shoda přes indicator_id
  let ds = regionsRoot.datasets.find(d => d.indicator_id === indicator.id);
  if (ds) return ds;
  // 2) shoda přes ID datasetu
  ds = regionsRoot.datasets.find(d => d.id === indicator.id);
  return ds ?? null;
}

function renderTrendChart(canvasId, indicator) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !Array.isArray(indicator.trend) || indicator.trend.length < 2) return null;

  const color = indicator.signal === 'good' ? '#38761D'
    : indicator.signal === 'warn' ? '#B45F06'
    : indicator.signal === 'bad' ? '#990000' : '#0B5394';

  const labels = indicator.trend.map(t => t.year);
  const datasets = [{
    label: 'ČR',
    data: indicator.trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];
  if (indicator.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => indicator.benchmark.oecd),
      borderColor: '#4A90D9', borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (indicator.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => indicator.benchmark.eu),
      borderColor: '#E69138', borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line no-undef
  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: reducedMotion ? { duration: 0 } : { duration: 500 },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 11 }, boxWidth: 16 } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 11 }, maxTicksLimit: 5 } },
      },
    },
  });
}

function renderRegionalBarChart(canvasId, dataset) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !dataset?.regions?.length) return null;
  const direction = dataset.direction ?? 'higher_is_better';
  const betterHigher = direction !== 'lower_is_better';
  const sorted = [...dataset.regions].sort((a, b) => betterHigher ? b.value - a.value : a.value - b.value);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line no-undef
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{
        data: sorted.map(r => r.value),
        backgroundColor: sorted.map(r => {
          const aboveAvg = r.value >= dataset.country_avg;
          const isGood = betterHigher ? aboveAvg : !aboveAvg;
          return isGood ? '#38761D' : '#B45F06';
        }),
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: reducedMotion ? { duration: 0 } : { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.x.toFixed(c.parsed.x < 100 ? 1 : 0)} ${dataset.unit}` } },
      },
      scales: {
        x: {
          min: Math.min(...sorted.map(r => r.value)) * 0.97,
          max: Math.max(...sorted.map(r => r.value)) * 1.03,
        },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });
}

function renderBenchmarkRow(label, value, unit, color, max) {
  if (value == null || max === 0) return '';
  const pct = Math.min(100, Math.round(value / max * 100));
  return `
    <div class="bm-row">
      <span class="bm-key">${escapeHtml(label)}</span>
      <div class="bm-track"><div class="bm-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="bm-val">${value}</span>
    </div>`;
}

function renderBenchmarkGauge(indicator) {
  const cz = indicator.value;
  const oecd = indicator.benchmark?.oecd;
  const eu = indicator.benchmark?.eu;
  const best = indicator.benchmark?.oecd_best;
  if (oecd == null && eu == null && best == null) return '';

  const refs = [cz, oecd, eu, best].filter(v => v != null);
  const max = Math.max(...refs);

  const signalColor = indicator.signal === 'good' ? '#38761D'
    : indicator.signal === 'warn' ? '#B45F06'
    : indicator.signal === 'bad' ? '#990000' : '#0B5394';

  return `
    <div class="bm-gauge bm-gauge-detail">
      ${renderBenchmarkRow('ČR', cz, indicator.unit, signalColor, max)}
      ${renderBenchmarkRow('OECD', oecd, indicator.unit, '#4A90D9', max)}
      ${renderBenchmarkRow('EU', eu, indicator.unit, '#E69138', max)}
      ${renderBenchmarkRow('Top OECD', best, indicator.unit, '#16A34A', max)}
    </div>`;
}

function renderInfluence(id) {
  const inf = getInfluence(id);
  return `
    <section class="detail-section influence-block">
      <h3>Co ovlivňuje tento indikátor</h3>
      <p class="influence-why">${escapeHtml(inf.why)}</p>
      <div class="influence-grid">
        <div>
          <h4>Hlavní faktory</h4>
          <ul>${inf.factors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </div>
        <div>
          <h4>Reformní páky</h4>
          <ul>${inf.levers.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>`;
}

function renderRegional(dataset) {
  if (!dataset) {
    return `
      <section class="detail-section">
        <h3>Regionální rozpad</h3>
        <p class="section-note">Krajský dataset pro tento indikátor zatím není v <code>data/regions.json</code>.
          Příští iterace ingest pipeline doplní data z ÚZIS NRH (po obcích / krajích) a ČSÚ Krajská statistika.</p>
      </section>`;
  }

  return `
    <section class="detail-section regional-section">
      <h3>Regionální rozpad podle 14 krajů</h3>
      <p class="section-note">${escapeHtml(dataset.regions.length)} krajů · ${dataset.year} · průměr ČR: <strong>${dataset.country_avg} ${escapeHtml(dataset.unit)}</strong>. Mapa je <em>tile cartogram</em> — geograficky uspořádané dlaždice, každý kraj jeden čtverec.</p>
      ${renderTileCartogram(dataset)}
      <div class="regional-side-by-side">
        <div class="regional-bar-wrap">
          <h4>Žebříček krajů</h4>
          <div class="regions-chart-wrap"><canvas id="regionalBarCanvas"></canvas></div>
        </div>
        <div class="regional-table-wrap">
          <h4>Tabulka</h4>
          ${renderRegionTable(dataset)}
        </div>
      </div>
    </section>`;
}

function renderRelatedLinks(strategies, explainers, indicatorId) {
  const linkedStrategies = strategies.filter(s => (s.linked_indicators ?? []).includes(indicatorId));
  const linkedExplainers = explainers.filter(e => (e.linked_indicators ?? []).includes(indicatorId));
  if (!linkedStrategies.length && !linkedExplainers.length) return '';
  return `
    <section class="detail-section">
      <h3>Související strategie a vysvětlení</h3>
      ${linkedStrategies.length ? `
        <div class="chip-row">
          ${linkedStrategies.map(s =>
            `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a>`
          ).join('')}
        </div>` : ''}
      ${linkedExplainers.length ? `
        <div class="chip-row" style="margin-top:10px">
          ${linkedExplainers.map(e =>
            `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.title)}</a>`
          ).join('')}
        </div>` : ''}
    </section>`;
}

function renderHero(indicator, card) {
  const yoyArrow = (() => {
    const t = indicator.trend;
    if (!Array.isArray(t) || t.length < 2) return '';
    const last = t[t.length - 1].value;
    const prev = t[t.length - 2].value;
    if (prev === 0) return '';
    const pct = ((last - prev) / prev) * 100;
    if (Math.abs(pct) < 0.5) return '<span class="trend trend-flat" title="Stabilní">→ stabilní</span>';
    const dir = indicator.direction ?? 'context_dependent';
    const positive = pct > 0;
    let cls = 'flat';
    if (dir !== 'context_dependent') {
      const isImprovement = (dir === 'higher_is_better' && positive) || (dir === 'lower_is_better' && !positive);
      cls = isImprovement ? 'good' : 'bad';
    }
    return `<span class="trend trend-${cls}">${positive ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)} % YoY</span>`;
  })();

  return `
    <header class="indicator-hero">
      <div class="hero-meta">
        <span class="area-tag">${escapeHtml(indicator.area)} · ${escapeHtml(indicator.domain)}${indicator.subdomain ? ' · ' + escapeHtml(indicator.subdomain) : ''}</span>
      </div>
      <h2>${escapeHtml(indicator.name)}</h2>
      <p class="hero-definition">${escapeHtml(card?.definition || '—')}</p>
      <div class="hero-summary">
        <div class="hero-value">
          <span class="signal-pill ${indicator.signal}">${escapeHtml(SIGNAL_LABEL[indicator.signal] ?? indicator.signal)}</span>
          <div class="hero-value-row">
            <span class="big-value">${indicator.value}</span>
            <span class="unit">${escapeHtml(indicator.unit)}</span>
            <span class="year-badge">${indicator.year ?? '?'}</span>
          </div>
          <div class="hero-arrow">${yoyArrow}</div>
        </div>
        <div class="hero-bench">
          ${renderBenchmarkGauge(indicator)}
        </div>
      </div>
    </header>`;
}

function renderMethodBlock(card, indicator) {
  if (!card) return '';
  return `
    <section class="detail-section method-section">
      <h3>Metodika a omezení</h3>
      <dl class="method-dl">
        <dt>Definice</dt><dd>${escapeHtml(card.definition ?? '—')}</dd>
        <dt>Jednotka</dt><dd>${escapeHtml(card.unit ?? indicator.unit)}</dd>
        <dt>Směr</dt><dd>${escapeHtml(DIRECTION_LABEL[card.direction] ?? card.direction ?? '—')}</dd>
        <dt>Frekvence</dt><dd>${escapeHtml(card.frequency ?? '—')}</dd>
        <dt>Garanti</dt><dd>${escapeHtml((card.stewards || []).join(', ') || '—')}</dd>
        ${card.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} %, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
        ${card.method_notes ? `<dt>Metodika</dt><dd>${escapeHtml(card.method_notes)}</dd>` : ''}
        ${card.limitations ? `<dt>Omezení</dt><dd>${escapeHtml(card.limitations)}</dd>` : ''}
      </dl>
      ${card.data_source ? renderDataSources(card.data_source) : ''}
      <p class="source-line">Aktuální zdroj hodnoty: <strong>${escapeHtml(indicator.source?.name ?? '—')}</strong>${indicator.source?.url ? ` · <a href="${escapeHtml(indicator.source.url)}" target="_blank" rel="noopener">${escapeHtml(indicator.source.url)} ↗</a>` : ''}</p>
    </section>`;
}

function renderDataSources(ds) {
  const blocks = [];
  if (ds.primary) blocks.push(`<div class="ds-block"><h4>Primární zdroj</h4>${renderDsObj(ds.primary)}</div>`);
  if (ds.fallback) blocks.push(`<div class="ds-block"><h4>Záložní zdroj</h4>${renderDsObj(ds.fallback)}</div>`);
  return `<div class="ds-grid">${blocks.join('')}</div>`;
}

function renderDsObj(o) {
  const pairs = Object.entries(o).filter(([k]) => k !== 'note');
  const note = o.note ? `<p class="ds-note">${escapeHtml(o.note)}</p>` : '';
  const tbl = pairs.length
    ? `<table class="ds-table">${pairs.map(([k, v]) =>
        `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</td></tr>`
      ).join('')}</table>`
    : '';
  return tbl + note;
}

// ============= INIT =============

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('indicators');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const root = document.getElementById('indicatorDetail');

  if (!id) {
    root.innerHTML = `
      <a class="back-link" href="index.html">← zpět na seznam indikátorů</a>
      <p class="status error">Chybí parametr <code>?id=...</code> v URL. Otevřete detail indikátoru kliknutím na kartu na <a href="index.html">hlavní stránce</a>.</p>`;
    return;
  }

  try {
    const [indRes, regRes, cardRes, stratsRes, explsRes] = await Promise.all([
      fetch('data/indicators.json'),
      fetch('data/regions.json').catch(() => null),
      fetch(`indicators/${encodeURIComponent(id)}.json`).catch(() => null),
      fetch('data/strategies.json').catch(() => null),
      fetch('data/explainers.json').catch(() => null),
    ]);
    if (!indRes.ok) throw new Error(`indicators.json HTTP ${indRes.status}`);
    const indData = await indRes.json();
    const indicator = (indData.indicators ?? []).find(i => i.id === id);
    if (!indicator) {
      root.innerHTML = `
        <a class="back-link" href="index.html">← zpět na seznam indikátorů</a>
        <p class="status error">Indikátor <code>${escapeHtml(id)}</code> nenalezen v <a href="data/indicators.json">data/indicators.json</a>.</p>`;
      return;
    }

    const card = cardRes && cardRes.ok ? await cardRes.json() : null;
    const regionsRoot = regRes && regRes.ok ? await regRes.json() : null;
    const dataset = findRegionalDataset(regionsRoot, indicator);
    const stratsRoot = stratsRes && stratsRes.ok ? await stratsRes.json() : { strategies: [] };
    const explsRoot = explsRes && explsRes.ok ? await explsRes.json() : { explainers: [] };

    document.title = `${indicator.name} · Zdravé Česko – HSPA`;

    root.innerHTML = `
      <a class="back-link" href="index.html">← zpět na seznam indikátorů</a>
      ${renderHero(indicator, card)}
      <section class="detail-section">
        <h3>Trend a srovnání s benchmarky</h3>
        <div class="modal-chart-wrap" style="height: 280px;"><canvas id="trendCanvas"></canvas></div>
      </section>
      ${renderInfluence(indicator.id)}
      ${renderRegional(dataset)}
      ${renderMethodBlock(card, indicator)}
      ${renderRelatedLinks(stratsRoot.strategies ?? [], explsRoot.explainers ?? [], indicator.id)}`;

    renderTrendChart('trendCanvas', indicator);
    renderRegionalBarChart('regionalBarCanvas', dataset);
  } catch (err) {
    console.error('indicator detail load failed:', err);
    root.innerHTML = `
      <a class="back-link" href="index.html">← zpět na seznam indikátorů</a>
      <p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
  }
}

if (typeof window !== 'undefined') init();

// Pure exports for tests
export { findRegionalDataset, tileColor, getInfluence, TILE_LAYOUT };
