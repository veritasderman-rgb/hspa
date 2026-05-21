// Builder pro data/dohodovaci-rizeni.json — frontend kontrakt stránky
// "Dohodovací řízení — datová podpora".
//
// Vstup:
//   ingest/mapping/nzip_dohodovaci_rizeni_catalog.json  (katalog 44 sad — crawl NZIP)
//   ingest/nzip-extracts/sss-04-02-pristroje-vyvoj-cr.json  (hotová časová řada přístrojů)
//
// Výstup:
//   data/dohodovaci-rizeni.json
//
// Vlna 0: většina sad je "stub" (jen metadata + odkaz na NZIP). Plně naplněná
// je SSS-04-02 (přístroje) jako proof-of-concept; OIS 11-47 (pojištěnci) je
// "external" — odkazuje na stávající interaktivní atlas pojistenci.html.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STARTER = path.resolve(__dirname, '..');

const CATALOG = path.join(__dirname, 'mapping', 'nzip_dohodovaci_rizeni_catalog.json');
const PRISTROJE = path.join(__dirname, 'nzip-extracts', 'sss-04-02-pristroje-vyvoj-cr.json');
const OUT = path.join(STARTER, 'data', 'dohodovaci-rizeni.json');

const DIMENSIONS = [
  { id: 'd1', number: 1, label: 'Ceny a objemy', color: '#7c3a8d',
    description: 'Léčivé přípravky, centrové léky, prostředky zdravotnické techniky — ceny a vykázané objemy.' },
  { id: 'd2', number: 2, label: 'Personální zabezpečení', color: '#0b5394',
    description: 'Platy a mzdy, kapacity a úvazky, věková struktura zdravotníků.' },
  { id: 'd3', number: 3, label: 'Produkce nelůžkové péče', color: '#1f7a4d',
    description: 'Ambulantní péče, lékárny, zátěž praktických lékařů a stomatologů, ZZS.' },
  { id: 'd4', number: 4, label: 'Seznam výkonů', color: '#6b6357',
    description: 'Plánované změny a nové výkony. Bez datových souhrnů ke stažení.' },
  { id: 'd5', number: 5, label: 'Struktura pojištěnců a náklady ZP', color: '#b8361e',
    description: 'Struktura pojistného kmene a náklady zdravotních pojišťoven dle segmentů.' },
  { id: 'd6', number: 6, label: 'Lůžková péče', color: '#a05a08',
    description: 'Hospitalizace, lůžkový fond, DRG, urgentní příjmy, intenzivní a vysoce specializovaná péče.' },
  { id: 'd7', number: 7, label: 'Komunitní ošetřovatelská péče', color: '#2f6b1f',
    description: 'Domácí (home care) ošetřovatelská péče — produkce a úhrady.' },
  { id: 'd8', number: 8, label: 'Jednodenní péče', color: '#0e7490',
    description: 'Smluvně sjednaná a vykázaná jednodenní péče.' },
  { id: 'd9', number: 9, label: 'Doplňkové registry a otevřená data', color: '#475569',
    description: 'Zdravotnická technika, personální kapacity, centra vysoce specializované péče a otevřená data.' },
];

function dimIdFor(dimensionString) {
  const m = /^(\d)/.exec(dimensionString || '');
  if (m) return 'd' + m[1];
  return 'd9';
}

function datasetSlug(oisCode) {
  return (oisCode || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function defaultVisualization(timeSeries) {
  return {
    data_cut: 'national_timeseries',
    primary_chart: timeSeries === 'strong' || timeSeries === 'medium' ? 'line' : 'bars',
    animation: { pattern: 'none', rationale: '', controls: [] },
    uses_3d: false,
    engine: 'chartjs',
    fallback_2d: '',
    rationale: 'Výchozí volba — bude upřesněna datovou a grafickou rozvahou ve vlně příslušné dimenze.',
  };
}

// ---- přístroje SSS-04-02: vytáhne časovou řadu vybraných typů přístrojů ----
function buildPristrojeSeries(extract) {
  const want = [
    { key: 'ct', match: 'výpočetní tomografie', label: 'CT — výpočetní tomografie' },
    { key: 'mr', match: 'Magnetická rezonance', label: 'MR — magnetická rezonance' },
    { key: 'pet', match: 'Pozitronová emisní', label: 'PET — pozitronová emisní tomografie' },
    { key: 'urychlovace', match: 'Lineární urychlovače', label: 'Lineární urychlovače' },
    { key: 'mamograf', match: 'mamografické', label: 'Mamografické RTG' },
  ];
  const perMillion = extract.pocet_na_milion_obyvatel || [];
  const counts = extract.pocet_pristroju || [];
  const years = extract.years || [];
  const series = [];
  for (const w of want) {
    const rowM = perMillion.find((r) => (r.druh || '').includes(w.match));
    const rowC = counts.find((r) => (r.druh || '').includes(w.match));
    if (!rowM) continue;
    series.push({
      key: w.key,
      label: w.label,
      unit: 'na milion obyvatel',
      points: years
        .map((y) => ({ year: y, value: rowM.values[y] }))
        .filter((p) => p.value != null),
      raw_counts: rowC
        ? years.map((y) => ({ year: y, value: rowC.values[y] })).filter((p) => p.value != null)
        : [],
    });
  }
  return series;
}

function buildPristroje(catEntry, extract) {
  const series = buildPristrojeSeries(extract);
  const ct = series.find((s) => s.key === 'ct');
  const lastYear = (extract.years || []).slice(-1)[0];
  const headline = ct
    ? {
        value: ct.points.slice(-1)[0]?.value ?? null,
        unit: 'CT na milion obyvatel',
        year: lastYear,
        label: 'Hustota CT skenerů',
      }
    : null;
  return {
    status: 'ready',
    role_in_negotiation:
      'Přístrojové vybavení je strukturálním vstupem dohodovacího řízení — kapacita zobrazovacích a terapeutických přístrojů určuje dostupnost a strop produkce u řady segmentů péče.',
    what_it_says:
      'Počet sledovaných přístrojů v ČR dlouhodobě roste — u CT, MR i PET prakticky nepřetržitě od roku 2006. Časová řada na milion obyvatel umožňuje srovnání tempa vybavování s mezinárodním standardem.',
    headline,
    series,
    international: {
      available: true,
      status: 'pending',
      comparator: 'OECD — Medical technology (CT/MRI/PET scanners per million population)',
      note: 'Mezinárodní srovnání s OECD se doplní ve Vlně 9 (doplňkové registry) po dohledání srovnatelných řad.',
    },
    visualization: {
      data_cut: 'national_timeseries_multi',
      primary_chart: 'line',
      animation: {
        pattern: 'line-draw',
        rationale: 'Postupné kreslení řady zvýrazní nepřetržitý růst vybavenosti.',
        controls: ['play'],
      },
      uses_3d: false,
      engine: 'chartjs',
      fallback_2d: 'Statická multi-line řada s posledním rokem zvýrazněným.',
      rationale: 'Více typů přístrojů jako srovnatelné řady na milion obyvatel — line chart je nejčitelnější.',
    },
  };
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const extract = JSON.parse(fs.readFileSync(PRISTROJE, 'utf8'));

  const datasets = catalog.datasets.map((d) => {
    const dimId = dimIdFor(d.dimension);
    const base = {
      id: datasetSlug(d.ois_code),
      ois_code: d.ois_code,
      dimension: dimId,
      title: d.title.replace(/\s*\((datový souhrn|otevřená data)\)\s*$/i, '').trim(),
      nzip_page: d.nzip_page,
      reference_period: d.reference_period || '',
      cadence: 'dle ÚZIS, typicky 1–3× ročně',
      time_series: d.time_series || '',
      editions: (d.editions || []).map((e) => e.edition),
      metodika_pdf: d.metodika_pdf || null,
      source: {
        name: 'ÚZIS ČR · NZIP — datová podpora dohodovacího řízení',
        publisher: catalog.publisher,
        nzip_page: d.nzip_page,
        latest_file: (d.editions || []).slice(-1)[0]?.url || null,
      },
      status: 'stub',
      role_in_negotiation: '',
      what_it_says: '',
      headline: null,
      series: [],
      international: null,
      visualization: defaultVisualization(d.time_series),
      regional: false,
    };

    if (d.ois_code === 'SSS-04-02') {
      return { ...base, ...buildPristroje(d, extract) };
    }
    if (d.ois_code === 'OIS-11-47') {
      return {
        ...base,
        status: 'external',
        external_page: 'pojistenci.html',
        role_in_negotiation:
          'Struktura pojistného kmene (věk, pohlaví, okres, pojišťovna) je primárním vstupem Dimenze 5 — určuje rizikové skupiny i regionální nákladové trendy.',
        what_it_says:
          'Plně zpracováno jako interaktivní atlas: animovaná choropletní mapa stárnutí krajů, populační pyramida, tržní podíly 7 pojišťoven a race-chart okresů.',
        headline: {
          value: 10.85,
          unit: 'mil. pojištěnců',
          year: 2025,
          label: 'Pojistný kmen ČR',
        },
        visualization: {
          data_cut: 'regional_timeseries',
          primary_chart: 'choropleth',
          animation: {
            pattern: 'timelapse-choropleth',
            rationale: 'Vývoj krajských rozdílů ve stárnutí je hlavní sdělení.',
            controls: ['slider', 'play'],
          },
          uses_3d: false,
          engine: 'echarts',
          fallback_2d: 'Statická mapa za poslední rok.',
          rationale: 'Hotový atlas — beze změny, přemontován jako detail této sekce.',
        },
      };
    }
    return base;
  });

  const dims = DIMENSIONS.map((dim) => ({
    ...dim,
    dataset_ids: datasets.filter((ds) => ds.dimension === dim.id).map((ds) => ds.id),
  }));

  const out = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    _doc:
      'Frontend kontrakt stránky "Dohodovací řízení — datová podpora". Sady NEJSOU klasické HSPA indikátory — jde o provozní a ekonomická data dohodovacího řízení. Generováno ingest/build-dohodovaci-rizeni.js z katalogu NZIP.',
    source: catalog.source,
    publisher: catalog.publisher,
    root_url: catalog.root_url,
    negotiation_context: {
      title: 'Co je dohodovací řízení',
      lead:
        'Dohodovací řízení je každoroční vyjednávání mezi zdravotními pojišťovnami a zástupci poskytovatelů o výši a podmínkách úhrad zdravotní péče pro následující rok. Jeho výsledek se promítá do úhradové vyhlášky Ministerstva zdravotnictví. Aby vyjednávání stálo na faktech, zveřejňuje ÚZIS ČR rozsáhlou datovou podporu — desítky datových souhrnů o cenách, personálu, produkci i nákladech napříč segmenty péče.',
      negotiation_year: 2027,
      summary: {
        datasets_total: datasets.length,
        dimensions: DIMENSIONS.filter((d) => d.number <= 8).length,
        interactive_only: (catalog.interactive_visualizations || []).length,
      },
    },
    dimensions: dims,
    datasets,
    interactive_only: (catalog.interactive_visualizations || []).map((v) => ({
      page_id: v.page_id,
      title: v.title,
      nzip_page: v.nzip_page,
    })),
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  const ready = datasets.filter((d) => d.status === 'ready').length;
  const ext = datasets.filter((d) => d.status === 'external').length;
  console.log(
    `build-dohodovaci-rizeni: ${datasets.length} sad (${ready} ready, ${ext} external, ${
      datasets.length - ready - ext
    } stub) → data/dohodovaci-rizeni.json`,
  );
}

main();
