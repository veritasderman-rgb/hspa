// Detail jednoho indikátoru. Načítá:
//   data/indicators.json     — hodnota, trend, benchmark, signál
//   indicators/{id}.json     — metodická karta (definice, omezení, zdroje)
//   data/regions.json        — krajský rozpad (pokud existuje)
//   data/strategies.json     — provázané strategie
//   data/explainers.json     — provázané vysvětlení mechanismů
//
// URL: indikator.html?id=<id_indikatoru>

import { renderModuleNav, escapeHtml } from './page-shared.js';
import { renderRegionCartogram, wireRegionCartogram } from './cz-region-map.js';

const SIGNAL_LABEL = {
  good: 'Dobré',
  warn: 'Ke sledování',
  bad: 'Kritické',
  neutral: 'Bez benchmarku',
};

const DIRECTION_LABEL = {
  higher_is_better: 'Vyšší = lepší',
  lower_is_better: 'Nižší = lepší',
  context_dependent: 'Kontextové (bez jednoznačného směru)',
};

let trendChart = null;

async function loadAll() {
  const [indRes, regRes, strRes, explRes] = await Promise.all([
    fetch('data/indicators.json'),
    fetch('data/regions.json').catch(() => null),
    fetch('data/strategies.json').catch(() => null),
    fetch('data/explainers.json').catch(() => null),
  ]);
  if (!indRes.ok) throw new Error(`HTTP ${indRes.status} (indicators.json)`);
  const indData = await indRes.json();
  const regData = regRes?.ok ? await regRes.json() : null;
  const strData = strRes?.ok ? await strRes.json() : { strategies: [] };
  const explData = explRes?.ok ? await explRes.json() : { explainers: [] };
  return { indicators: indData.indicators ?? [], regions: regData, strategies: strData.strategies ?? [], explainers: explData.explainers ?? [] };
}

async function loadMethodCard(indicator) {
  if (!indicator.method_card_url) return null;
  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function findRegionalDataset(regions, indicatorId) {
  if (!regions?.datasets) return null;
  return regions.datasets.find(ds => ds.indicator_id === indicatorId) || null;
}

function findCrossLinks(indicatorId, strategies, explainers) {
  return {
    strategies: strategies.filter(s => (s.linked_indicators ?? []).includes(indicatorId)),
    explainers: explainers.filter(e => (e.linked_indicators ?? []).includes(indicatorId)),
  };
}

function fmtValue(v) {
  if (v == null) return '–';
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function renderHeroBlock(ind, card) {
  const sigLabel = SIGNAL_LABEL[ind.signal] ?? ind.signal;
  return `
    <header class="ind-detail-header">
      <a class="back-link" href="index.html">← zpět na přehled indikátorů</a>
      <div class="ind-detail-meta">
        <span class="cat-badge">${escapeHtml(ind.area)} · ${escapeHtml(ind.domain)}${ind.subdomain ? ' · ' + escapeHtml(ind.subdomain) : ''}</span>
        <span class="signal-pill ${ind.signal}">${escapeHtml(sigLabel)}</span>
      </div>
      <h2>${escapeHtml(ind.name)}</h2>
      ${card?.definition ? `<p class="ind-detail-subtitle">${escapeHtml(card.definition)}</p>` : ''}
    </header>

    <section class="ind-hero">
      <div class="ind-hero-value">
        <div class="ind-hero-num">${fmtValue(ind.value)}</div>
        <div class="ind-hero-unit">${escapeHtml(ind.unit)}</div>
        <div class="ind-hero-year">rok ${ind.year ?? '?'}</div>
      </div>
      <div class="ind-hero-bench">
        ${benchmarkRow('Průměr ČR', ind.value, '#0B5394')}
        ${ind.benchmark?.oecd != null ? benchmarkRow('OECD průměr', ind.benchmark.oecd, '#4A90D9') : ''}
        ${ind.benchmark?.eu != null ? benchmarkRow('EU průměr', ind.benchmark.eu, '#E69138') : ''}
        ${ind.benchmark?.oecd_best != null ? benchmarkRow('Nejlepší OECD', ind.benchmark.oecd_best, '#16A34A') : ''}
      </div>
    </section>
  `;
}

function benchmarkRow(label, value, color) {
  return `
    <div class="ind-bench-row">
      <span class="ind-bench-label">${escapeHtml(label)}</span>
      <span class="ind-bench-value" style="color:${color}">${fmtValue(value)}</span>
    </div>
  `;
}

function renderTrendBlock(ind) {
  if (!Array.isArray(ind.trend) || ind.trend.length < 2) return '';
  return `
    <section class="ind-section">
      <h3>Vývoj v čase</h3>
      <p class="ind-section-desc">Národní hodnota za poslední dostupné roky. Srovnání s OECD/EU průměrem v podobě referenčních linek.</p>
      <div class="ind-chart-wrap"><canvas id="indTrendCanvas"></canvas></div>
    </section>
  `;
}

function renderRegionalBlock(dataset) {
  if (!dataset) return '';
  return `
    <section class="ind-section">
      <h3>Krajský rozpad (NUTS-3)</h3>
      <p class="ind-section-desc">Hodnoty pro 14 krajů. Schematická tile-mapa zobrazuje barevně odchylku od celostátního průměru, kompletní hodnoty jsou v tabulce pod ní.</p>
      <div id="regionMapHost"></div>
      <div class="ind-region-table-wrap">
        <table class="regions-table">
          <thead><tr><th>Kraj</th><th>${escapeHtml(dataset.name)} (${escapeHtml(dataset.unit)})</th><th>Δ od průměru ČR</th></tr></thead>
          <tbody>
            ${dataset.regions
              .slice()
              .sort((a, b) => dataset.direction === 'lower_is_better' ? a.value - b.value : b.value - a.value)
              .map(r => {
                const diff = r.value - dataset.country_avg;
                const better = dataset.direction === 'lower_is_better' ? diff < 0 : diff > 0;
                const cls = Math.abs(diff) < 0.01 ? '' : (better ? 'pos' : 'neg');
                return `<tr>
                  <td>${escapeHtml(r.name)}</td>
                  <td>${fmtValue(r.value)}</td>
                  <td class="diff ${cls}">${diff >= 0 ? '+' : ''}${fmtValue(diff)}</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderContextBlock(ind, card) {
  // "Co indikátor ovlivňuje" + "Proč je důležitý"
  const meaningParts = [];
  if (card?.method_notes) {
    meaningParts.push(`<div class="ind-context-block">
      <h4>Metodika měření</h4>
      <p>${escapeHtml(card.method_notes)}</p>
    </div>`);
  }
  if (card?.limitations) {
    meaningParts.push(`<div class="ind-context-block">
      <h4>Omezení a interpretační rizika</h4>
      <p>${escapeHtml(card.limitations)}</p>
    </div>`);
  }
  // Co indikátor ovlivňuje — heuristika podle subdomain/domain (curated)
  const driver = INDICATOR_DRIVERS[ind.id];
  if (driver) {
    meaningParts.push(`<div class="ind-context-block ind-context-drivers">
      <h4>Co tento indikátor ovlivňuje</h4>
      <ul>${driver.factors.map(f => `<li><strong>${escapeHtml(f.name)}</strong> — ${escapeHtml(f.explanation)}</li>`).join('')}</ul>
    </div>`);
    meaningParts.push(`<div class="ind-context-block ind-context-importance">
      <h4>Proč je důležitý</h4>
      <p>${escapeHtml(driver.importance)}</p>
    </div>`);
  }
  if (!meaningParts.length) return '';
  return `
    <section class="ind-section">
      <h3>Kontext: co stojí za hodnotou</h3>
      ${meaningParts.join('')}
    </section>
  `;
}

function renderSignalBlock(ind, card) {
  const t = card?.signal_thresholds;
  if (!t) return '';
  return `
    <section class="ind-section ind-signal-block">
      <h3>Jak se hodnotí signál</h3>
      <ul class="ind-signal-rules">
        <li><span class="signal good"></span> <strong>Dobré</strong> — odchylka od OECD průměru lepší než +${t.good} %</li>
        <li><span class="signal warn"></span> <strong>Ke sledování</strong> — odchylka v rozmezí −${t.warn} % až +${t.good} %</li>
        <li><span class="signal bad"></span> <strong>Kritické</strong> — odchylka horší než −${t.warn} %</li>
        <li><span class="signal neutral"></span> <strong>Bez benchmarku</strong> — chybí srovnávací hodnota nebo je směr kontextový</li>
      </ul>
      <p class="ind-section-desc">Směr indikátoru: <strong>${escapeHtml(DIRECTION_LABEL[ind.direction] ?? ind.direction ?? '—')}</strong>. Aktuální hodnocení: <span class="signal-pill ${ind.signal}">${escapeHtml(SIGNAL_LABEL[ind.signal] ?? ind.signal)}</span>.</p>
    </section>
  `;
}

function renderCrossLinksBlock(crossLinks) {
  const { strategies, explainers } = crossLinks;
  if (!strategies.length && !explainers.length) return '';
  let html = '<section class="ind-section"><h3>Souvislosti</h3>';
  if (strategies.length) {
    html += `<h4 class="ind-cross-h4">Strategické dokumenty</h4>
      <div class="chip-row">${strategies.map(s =>
        `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a>`
      ).join('')}</div>`;
  }
  if (explainers.length) {
    html += `<h4 class="ind-cross-h4">Mechanismy a procesy</h4>
      <div class="chip-row">${explainers.map(e =>
        `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.title)}</a>`
      ).join('')}</div>`;
  }
  html += '</section>';
  return html;
}

function renderSourcesBlock(ind, card) {
  const blocks = [];
  // primary z metodické karty
  if (card?.data_source?.primary) {
    blocks.push(renderSourceBlock('Primární zdroj', card.data_source.primary));
  }
  if (card?.data_source?.fallback) {
    blocks.push(renderSourceBlock('Záložní zdroj', card.data_source.fallback));
  }
  if (card?.benchmark_source) {
    blocks.push(renderSourceBlock('Zdroj benchmarku', card.benchmark_source));
  }
  // Vždy alespoň základní info ze source
  blocks.push(`
    <div class="ind-source-block">
      <h4>Aktualizace dat</h4>
      <dl class="ind-source-dl">
        <dt>Garant publikace</dt><dd>${escapeHtml(ind.source?.name ?? '—')}</dd>
        <dt>URL zdroje</dt><dd>${ind.source?.url ? `<a href="${escapeHtml(ind.source.url)}" target="_blank" rel="noopener">${escapeHtml(ind.source.url)}</a>` : '—'}</dd>
        <dt>Načteno</dt><dd>${escapeHtml(ind.source?.fetched_at ?? '—')}</dd>
        <dt>Původ záznamu</dt><dd>${escapeHtml(ind.source?.origin ?? '—')}</dd>
        <dt>Frekvence sběru</dt><dd>${escapeHtml(card?.frequency ?? '—')}</dd>
        <dt>Zodpovědné instituce</dt><dd>${(card?.stewards ?? []).map(escapeHtml).join(', ') || '—'}</dd>
      </dl>
    </div>
  `);
  return `
    <section class="ind-section">
      <h3>Zdroje a metodika</h3>
      ${blocks.join('')}
      <p class="ind-source-note">Metodická karta v JSON formátu: <a href="${escapeHtml(ind.method_card_url ?? '')}">${escapeHtml(ind.method_card_url ?? '—')}</a></p>
    </section>
  `;
}

function renderSourceBlock(label, src) {
  const rows = Object.entries(src)
    .filter(([k]) => k !== 'note')
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${typeof v === 'object' ? escapeHtml(JSON.stringify(v)) : escapeHtml(String(v))}</dd>`)
    .join('');
  const note = src.note ? `<p class="ind-source-note">${escapeHtml(src.note)}</p>` : '';
  return `
    <div class="ind-source-block">
      <h4>${escapeHtml(label)}</h4>
      <dl class="ind-source-dl">${rows}</dl>
      ${note}
    </div>
  `;
}

function renderTrendChart(ind) {
  const canvas = document.getElementById('indTrendCanvas');
  if (!canvas) return;
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  const trend = ind.trend || [];
  if (trend.length < 2) return;
  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';
  const labels = trend.map(t => t.year);
  const datasets = [{
    label: 'ČR',
    data: trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 5, pointHoverRadius: 7, borderWidth: 2.5,
  }];
  if (ind.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD',
      data: labels.map(() => ind.benchmark.oecd),
      borderColor: '#4A90D9', backgroundColor: 'transparent',
      borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (ind.benchmark?.eu != null) {
    datasets.push({
      label: 'EU',
      data: labels.map(() => ind.benchmark.eu),
      borderColor: '#E69138', backgroundColor: 'transparent',
      borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  // eslint-disable-next-line no-undef
  trendChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? { duration: 0 } : { duration: 500 },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 12 }, boxWidth: 18 } },
        tooltip: { displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 12 }, maxTicksLimit: 6 } },
      },
    },
  });
}

// ====== KURÁTOROVANÝ KONTEXT (drivers + importance) ======
// Stručné, edičně psané texty: co ovlivňuje hodnotu indikátoru a proč je
// indikátor zásadní. Zámena za databázi nutná není — držíme to v kódu, ať
// to lze snadno auditovat a verzovat. Texty jsou psány věcně, bez emocí.

const INDICATOR_DRIVERS = {
  vakcinace_hpv_divky: {
    factors: [
      { name: 'Doporučení pediatrů a praktických lékařů pro děti a dorost', explanation: 'Aktivní výzva při preventivní prohlídce v 11–13 letech zvyšuje proočkovanost o 15–25 p.b. (data registru Daktela 2023).' },
      { name: 'Mediální kampaně a politické signály', explanation: 'Po roce 2018 (kampaň Loono, doplnění chlapců) proočkovanost dočasně rostla. Konspirační vlny během COVID-19 a po něm propad o 8 p.b.' },
      { name: 'Krajská dostupnost specialistů', explanation: 'Kraje s nižší hustotou pediatrů a vyšší socioekonomickou deprivací (Karlovarský, Ústecký) mají systematicky o 10–15 p.b. nižší proočkovanost.' },
      { name: 'Cena a hrazení', explanation: 'Od 1.4.2012 plně hrazeno z v.z.p. pro dívky 13–14 let, od 1.1.2018 i pro chlapce, od 1.1.2024 dolní hranice posunuta na 11 let. Nehrazené dohánění nad 14 let stojí 4–8 tis. Kč.' },
    ],
    importance: 'HPV způsobuje 99 % případů karcinomu děložního čípku, 90 % análního karcinomu a podstatnou část tumorů hlavy a krku. WHO Global Strategy 2020 stanovila cíl 90 % proočkovanosti dívek do 15 let do roku 2030. ČR je s ~50 % v dolní polovině zemí EU. Národní onkologický plán 2030 si proočkovanost HPV stanovil jako jeden ze tří klíčových preventivních cílů.',
  },
  nadeje_doziti_total: {
    factors: [
      { name: 'Mortalita na kardiovaskulární nemoci', explanation: 'KVN tvoří ~40 % všech úmrtí v ČR; pokles standardizované mortality o 10 % zvyšuje naději dožití přibližně o 0,8 roku.' },
      { name: 'Mortalita na zhoubné novotvary', explanation: 'Druhá nejčastější příčina úmrtí (~25 %); pozdní záchyt a podprůměrné pokrytí screeningy ČR snižují potenciál prodloužení.' },
      { name: 'Životní styl: kouření, alkohol, obezita', explanation: 'ČR má dlouhodobě nadprůměrné hodnoty ve všech třech rizikových faktorech vůči EU.' },
      { name: 'Socioekonomické nerovnosti', explanation: 'Rozdíl mezi nejbohatším a nejchudším okresem činí v ČR ~4,5 roku; rozdíl Praha vs. Karlovarský/Ústecký 3,1–3,8 roku.' },
    ],
    importance: 'Naděje dožití je nejagregovanější výsledkový indikátor zdravotního stavu populace — shrnuje souhrnný dopad zdravotnictví, prevence, životního stylu a sociálních determinant. Strategie Zdraví 2030 (NSP 2020+) si stanovila cíl naděje dožití 80 let do 2030 (současný stav 79,9).',
  },
  cekaci_doba_kycel: {
    factors: [
      { name: 'Kapacita ortopedických center', explanation: 'Limit operačních sálů a ortopedických chirurgů; Karlovarský a Moravskoslezský kraj mají dlouhodobě podprůměrnou kapacitu na 100 tis. obyv.' },
      { name: 'Smluvní politika pojišťoven', explanation: 'Volume cap úhradové vyhlášky stropuje počet operací za rok; překročení je hrazeno se srážkou nebo nehrazeno.' },
      { name: 'Geografická centralizace', explanation: 'Špičková centra v Praze mají nejkratší čekací doby; pacient z Karlovarska často čeká 2× déle, pokud se nerozhodne dojíždět.' },
      { name: 'Triage a indikace', explanation: 'Přísnější indikační kritéria některých center prodlužují seznamy; absence národního registru čekacích dob neumožňuje přesouvat pacienty mezi centry.' },
    ],
    importance: 'Čekací doba na elektivní výkon je klíčový ukazatel kvality dostupnosti péče v rámci HSPA. Kyčel je vlajková ukazka — výsledky pro koleno, katarakta, kardiochirurgie obvykle korelují. ČR má cca 2× delší medián než zeměpisně srovnatelné Rakousko nebo Dánsko.',
  },
  screening_mamograficky: {
    factors: [
      { name: 'Adresné zvaní pojišťovnami', explanation: 'Od 2014 mají ZP zákonnou povinnost zvát ženy 45–69 let. Kvalita personalizace zvaní (e-mail, SMS, telefon) ovlivňuje účast o 10–20 p.b.' },
      { name: 'Geografická dostupnost screeningových center', explanation: 'Síť 70 akreditovaných center; v Karlovarském kraji jsou jen dvě, což zvyšuje čas a náklady cesty pro pacientku.' },
      { name: 'Vzdělání a socioekonomický status', explanation: 'Ženy s vysokoškolským vzděláním mají účast o 25 p.b. vyšší než ženy se základním vzděláním (data NRC 2023).' },
      { name: 'Doporučení gynekologa nebo praktika', explanation: 'Aktivní výzva při preventivní prohlídce zvyšuje účast 1,5–2× v následujícím roce.' },
    ],
    importance: 'Mamografický screening prokazatelně snižuje úmrtnost na karcinom prsu o 20–30 % v populaci 50–69 let (Cochrane review 2013). Cíl Národního onkologického plánu 2030: 70 % účast (současně cca 51 %). Karcinom prsu je nejčastější ženská malignita s ~7 700 nových případů ročně.',
  },
  screening_kolorektalni: {
    factors: [
      { name: 'Adresné zvaní pojišťovnami od 2014', explanation: 'Zvou se osoby 50–75 let. Účast je výrazně nižší než u mamografického screeningu kvůli typu vyšetření (TOKS / kolonoskopie).' },
      { name: 'Stigma kolonoskopie', explanation: 'Bariéra ze studu, obavy z vyšetření a střevní přípravy. TOKS jako vstupní test zvyšuje vstupní účast.' },
      { name: 'Geografická dostupnost', explanation: 'Síť cca 200 endoskopických pracovišť, ale dostupnost mimo krajská města klesá. Kraje s nejhorší dostupností (Karlovarský, Vysočina) mají nejnižší účast.' },
      { name: 'Aktivní role praktického lékaře', explanation: 'Distribuce TOKS a edukace pacienta v ordinaci PL je nejúčinnější intervenční kanál; bonifikace v úhradové vyhlášce posiluje motivaci.' },
    ],
    importance: 'Kolorektální karcinom je v ČR po plicním druhým nejsmrtelnějším karcinomem, s nadprůměrnou incidencí v EU. Screening prokazatelně snižuje mortalitu o 20 %. Současná účast (~25 %) je hluboko pod cíli Národního onkologického plánu 2030 (45 %) i průměrem EU (~35 %).',
  },
  sebevrazdy_per_100k: {
    factors: [
      { name: 'Dostupnost ambulantní psychiatrické a psychologické péče', explanation: 'Reforma péče o duševní zdraví (CDZ, multidisciplinární týmy) běží od 2017, ale pokrytí center duševního zdraví je nehomogenní.' },
      { name: 'Socioekonomická situace', explanation: 'Vysoká nezaměstnanost, exekuce, sociální vyloučení korelují s vyšší sebevražedností; Karlovarský a Ústecký kraj mají dlouhodobě nadprůměrné hodnoty.' },
      { name: 'Genderová asymetrie', explanation: 'Muži tvoří 75–80 % všech dokonaných sebevražd — větší letálnost zvolených metod. U žen častější jsou suicidální pokusy bez fatálního následku.' },
      { name: 'Konzumace alkoholu a chronická bolest', explanation: 'Riziko sebevraždy se u alkoholové závislosti zvyšuje 5–10×; u nedostatečně léčené chronické bolesti 3×.' },
    ],
    importance: 'Sebevraždy jsou jedním z hlavních ukazatelů selhávání systému péče o duševní zdraví a sociálních sítí. Národní akční plán prevence sebevražd 2020–2030 stanovil cíl pokles o 30 % do 2030 (z hodnot ~13 na ~9 / 100 tis.). Aktuální trend je stagnace.',
  },
  kuractvi_denni: {
    factors: [
      { name: 'Cenová politika a daně', explanation: 'Spotřební daň na cigarety v ČR patří k nejnižším v EU; ekonomická dostupnost je 2× vyšší než v Dánsku nebo Irsku.' },
      { name: 'Zákaz kouření v provozovnách', explanation: 'Zákon 65/2017 Sb. snížil expozici sekundárnímu kouři, ale počet kuřáků klesá pomaleji než v zemích s komplexní strategií.' },
      { name: 'Dostupnost odvykací podpory', explanation: 'Centra léčby závislosti na tabáku jsou cca v 60 nemocnicích; náhradní nikotinová terapie není plně hrazena.' },
      { name: 'Marketing alternativ (e-cigarety, nahřívaný tabák)', explanation: 'Rychlý nárůst používání alternativ posun rizikového profilu; epidemiologické dopady budou viditelné až v 2030–2040.' },
    ],
    importance: 'Kouření zůstává největší modifikovatelnou příčinou předčasné mortality (přibližně 20 % všech úmrtí v ČR souvisí s tabákem). Strategie Zdraví 2030 cíli 17 % do 2030. Současná hodnota ~21 % řadí ČR mezi šest nejhorších zemí OECD.',
  },
  pm25_expozice: {
    factors: [
      { name: 'Lokální vytápění tuhými palivy', explanation: 'Dominantní zdroj v zimním období v Moravskoslezském a Ústeckém kraji; kotlíkové dotace situaci zlepšily, ale 30 % domácností stále topí starými kotli.' },
      { name: 'Doprava', explanation: 'Hlavní zdroj v městských aglomeracích (Praha, Brno); pokles emisí dieselových vozidel po 2018 zlepšil situaci, ale obnova vozového parku je pomalá.' },
      { name: 'Průmysl', explanation: 'Ostravsko-karvinská aglomerace s těžkým průmyslem dlouhodobě překračuje doporučení WHO 2× i více.' },
      { name: 'Přeshraniční transport', explanation: 'Polské uhelné elektrárny a domácnosti přispívají do imise v severní části Moravskoslezského kraje 25–35 %.' },
    ],
    importance: 'Doporučení WHO 2021: roční průměr PM2.5 ≤ 5 µg/m³ (revize z původních 10 µg/m³ podle nových důkazů kardiovaskulárního a onkologického rizika). ČR překračuje doporučení 2,5–3,8× v závislosti na kraji. EEA odhaduje ~5 800 předčasných úmrtí ročně v ČR připadajících na PM2.5.',
  },
  obezita_prevalence: {
    factors: [
      { name: 'Stravovací návyky', explanation: 'Vyšší konzumace zpracovaných potravin, slazených nápojů a nižší konzumace ovoce/zeleniny než EU průměr.' },
      { name: 'Pohybová aktivita', explanation: 'ČR patří k zemím s nejnižším podílem dospělých dosahujících doporučení WHO (≥150 min/týden střední intenzity).' },
      { name: 'Socioekonomický gradient', explanation: 'Obezita je výrazněji rozšířená u nižšího vzdělání a příjmu; rozdíl 10–15 p.b. mezi nejvyšší a nejnižší vzdělanostní skupinou.' },
      { name: 'Strukturální faktory urbanismu', explanation: 'Auto-orientovaná města a absence pěší/cyklistické infrastruktury snižují incidentální fyzickou aktivitu.' },
    ],
    importance: 'Obezita je rizikový faktor pro KVN, diabetes 2. typu, řadu malignit a muskuloskeletální onemocnění. ČR patří k zemím s nejvyšší prevalencí v EU; trend je stagnační, mladší kohorty mají dynamičtější nárůst. Strategie Zdraví 2030 sleduje cíl zastavit nárůst obezity v dospělé populaci.',
  },
  vakcinace_mmr_deti: {
    factors: [
      { name: 'Vakcinační kalendář a tlak na rodiče', explanation: 'Povinné očkování podle zákona 258/2000 Sb. + vyhlášky 537/2006 Sb.; nesplnění blokuje přijetí do MŠ (ÚS Pl. ÚS 19/14).' },
      { name: 'Antivakcinační kampaně', explanation: 'Po sérii epidemií spalniček 2017–2019 propad důvěry; krajské rozdíly korelují s lokální organizovanou opozicí.' },
      { name: 'Dostupnost dětských lékařů', explanation: 'V regionech s podprůměrnou hustotou pediatrů (Karlovarský, Vysočina) klesá realizace plánu vakcinace o 3–5 p.b.' },
      { name: 'Migrace a chybějící historie', explanation: 'Děti z Ukrajiny po 2022 zvyšují variabilitu naměřené proočkovanosti; mnoho má neúplné záznamy.' },
    ],
    importance: 'Pro herd immunity proti spalničkám je třeba ≥95 % proočkovanost. ČR poklesla pod tuto hranici, což vede k pravidelným lokálním ohniskům. SZÚ varuje od 2018; krajské rozdíly mezi 88–96 %.',
  },
};

async function renderDetail(id, data) {
  const root = document.getElementById('indicatorDetail');
  const ind = data.indicators.find(x => x.id === id);
  if (!ind) {
    root.innerHTML = `<p class="status error">Indikátor <code>${escapeHtml(id)}</code> nenalezen. <a href="index.html">Zpět na přehled</a>.</p>`;
    return;
  }
  // dočasný loader
  root.innerHTML = '<p class="status">Načítám metodickou kartu…</p>';

  const card = await loadMethodCard(ind);
  const regionalDataset = findRegionalDataset(data.regions, ind.id);
  const crossLinks = findCrossLinks(ind.id, data.strategies, data.explainers);

  document.title = `${ind.name} · Zdravé Česko`;

  root.innerHTML = `
    ${renderHeroBlock(ind, card)}
    ${renderTrendBlock(ind)}
    ${renderRegionalBlock(regionalDataset)}
    ${renderContextBlock(ind, card)}
    ${renderSignalBlock(ind, card)}
    ${renderCrossLinksBlock(crossLinks)}
    ${renderSourcesBlock(ind, card)}
  `;

  renderTrendChart(ind);
  if (regionalDataset) {
    const host = document.getElementById('regionMapHost');
    if (host) {
      host.innerHTML = renderRegionCartogram(regionalDataset);
      wireRegionCartogram(host);
    }
  }
}

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('indicators');
  const id = new URLSearchParams(window.location.search).get('id');
  const root = document.getElementById('indicatorDetail');
  if (!id) {
    root.innerHTML = `<p class="status error">URL neobsahuje parametr <code>?id=&lt;id_indikatoru&gt;</code>. <a href="index.html">Zpět na přehled</a>.</p>`;
    return;
  }
  try {
    const data = await loadAll();
    await renderDetail(id, data);
  } catch (err) {
    root.innerHTML = `<p class="status error">Chyba při načítání: ${escapeHtml(err.message)}.</p>`;
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();

// Exporty pro testy (Node test runner)
export { findRegionalDataset, findCrossLinks, fmtValue, INDICATOR_DRIVERS };
