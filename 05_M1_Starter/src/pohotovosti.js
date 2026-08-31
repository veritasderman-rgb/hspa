// Stránka „Kde je nejbližší pohotovost“ (pohotovosti.html).
//
// Renderovací vrstva. Veškerá logika (svátky, otevřeno/zavřeno, vzdálenost,
// vyhledání obce) sedí v `pohotovosti-engine.js`, aby šla testovat bez DOM.
//
// Datové vstupy:
//   data/pohotovosti.json        — pohotovosti, rotace, pokrytí, právní kontext
//   data/obce-gps.json           — gazetteer obcí (líně, až uživatel začne psát)
//   data/pohotovosti-akutni.json — urgentní příjmy a akutní chirurgie (líně)
//
// Zásada, kterou tahle stránka drží nade vše: nikdy netvrdit víc, než zdroj
// říká. Když ordinační doba chybí, je to „neuvedeno“, ne „zavřeno“. Když je
// poloha jen střed obce, stojí to u výsledku. Když je to registrová domněnka,
// je označená.

import './analytics.js';
import {
  renderModuleNav,
  renderMastheadDate,
  renderFooter,
  renderRelatedTools,
  escapeHtml,
  renderErrorState,
} from './page-shared.js';
import {
  evaluateStatus,
  formatDistance,
  formatRange,
  searchObce,
  rankPlaces,
  rotationDuty,
  nextRotationDate,
  dayKeyFor,
  regionCodeAt,
} from './pohotovosti-engine.js';

const PAGE_SIZE = 8;

/** Pořadí a popisky filtrů. „Chirurgická“ míří do akutní vrstvy z registru. */
const TYPE_FILTERS = [
  { id: 'lps_dospeli', label: 'Dospělí', title: 'Lékařská pohotovostní služba pro dospělé' },
  { id: 'lps_deti', label: 'Děti', title: 'Lékařská pohotovostní služba pro děti a dorost' },
  { id: 'zubni', label: 'Zubní', title: 'Pohotovostní služba v oboru zubní lékařství' },
  { id: 'lekarna', label: 'Lékárna', title: 'Lékárenská pohotovostní služba' },
  { id: 'akutni', label: 'Urgentní příjem a chirurgie', title: 'Nemocniční urgentní příjmy a pracoviště akutní chirurgie z registru ÚZIS — nejde o pohotovostní službu podle vyhlášky' },
];

const DAY_LABELS = [
  ['mon', 'Pondělí'], ['tue', 'Úterý'], ['wed', 'Středa'], ['thu', 'Čtvrtek'],
  ['fri', 'Pátek'], ['sat', 'Sobota'], ['sun', 'Neděle'], ['holiday', 'Svátek'],
];

const CATEGORY_COLORS = {
  lps_dospeli: '#1f6feb',
  lps_deti: '#0f9d58',
  zubni: '#b4531f',
  lekarna: '#7b3fb8',
  akutni: '#b3261e',
};

const state = {
  data: null,
  obce: null,
  acute: null,
  origin: null,        // {lat, lon, label, precise}
  categories: new Set(['lps_dospeli']),
  openOnly: true,
  shown: PAGE_SIZE,
  rows: [],
  chart: null,
  geojson: null,
};

// ─────────────────────────────────────────────────────────────────────────
// Načítání dat
// ─────────────────────────────────────────────────────────────────────────

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/** Gazetteer je 340 kB — tahá se až ve chvíli, kdy ho uživatel opravdu potřebuje. */
async function ensureObce() {
  if (state.obce) return state.obce;
  const payload = await loadJson('data/obce-gps.json');
  state.obce = payload.obce ?? [];
  return state.obce;
}

/** Hranice krajů — sdílené mapou a určením kraje výchozího bodu. */
async function ensureRegions() {
  if (state.geojson) return state.geojson;
  state.geojson = await loadJson('data/cz-regions.geojson');
  return state.geojson;
}

/** Akutní vrstva z registru — také líně, jde o dalších 190 kB. */
async function ensureAcute() {
  if (state.acute) return state.acute;
  const payload = await loadJson('data/pohotovosti-akutni.json');
  state.acute = payload.places ?? [];
  return state.acute;
}

// ─────────────────────────────────────────────────────────────────────────
// Filtry
// ─────────────────────────────────────────────────────────────────────────

function renderTypeChips() {
  const host = document.getElementById('pohTypes');
  if (!host) return;
  host.innerHTML = TYPE_FILTERS.map(t => `
    <button type="button" class="poh-chip${state.categories.has(t.id) ? ' is-on' : ''}"
            data-type="${t.id}" aria-pressed="${state.categories.has(t.id)}" title="${escapeHtml(t.title)}">
      <span class="poh-chip-dot" style="background:${CATEGORY_COLORS[t.id]}" aria-hidden="true"></span>${escapeHtml(t.label)}
    </button>`).join('');

  host.querySelectorAll('.poh-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.type;
      if (state.categories.has(id)) state.categories.delete(id);
      else state.categories.add(id);
      // Bez jediného zvoleného typu by výpis byl prázdný a vypadal jako chyba.
      if (!state.categories.size) state.categories.add(id);
      if (state.categories.has('akutni')) await ensureAcute();
      state.shown = PAGE_SIZE;
      renderTypeChips();
      update();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Vyhledání výchozího bodu
// ─────────────────────────────────────────────────────────────────────────

/**
 * Dohledá kraj výchozího bodu z hranic krajů. Běží až po prvním vykreslení —
 * výpis pohotovostí na kraji nezávisí a nemá na co čekat; dotčená je jen
 * sekce rotace, která se překreslí, jakmile je odpověď na světě.
 */
async function resolveOriginRegion(origin) {
  try {
    const geojson = await ensureRegions();
    if (state.origin !== origin) return; // uživatel mezitím hledal odjinud
    origin.krajCode = regionCodeAt(geojson, origin.lat, origin.lon);
    renderRotationSection();
  } catch {
    // Bez hranic krajů se sekce rotace prostě neomezí na jeden kraj.
  }
}

function setOrigin(origin) {
  state.origin = origin;
  state.shown = PAGE_SIZE;
  const el = document.getElementById('pohOrigin');
  if (el) {
    el.innerHTML = origin
      ? `Hledám od: <strong>${escapeHtml(origin.label)}</strong>${origin.precise ? '' : ' <span class="poh-approx">(střed obce)</span>'} · <button type="button" class="poh-reset" id="pohReset">zrušit</button>`
      : 'Zadejte obec nebo použijte polohu — výpis se pak seřadí podle vzdálenosti.';
    const reset = document.getElementById('pohReset');
    if (reset) reset.addEventListener('click', () => { setOrigin(null); update(); });
  }
  update();
  if (origin) resolveOriginRegion(origin);
}

function closeSuggest() {
  const box = document.getElementById('pohSuggest');
  const input = document.getElementById('pohQuery');
  if (box) { box.hidden = true; box.innerHTML = ''; }
  if (input) input.setAttribute('aria-expanded', 'false');
}

async function onQueryInput(value) {
  const box = document.getElementById('pohSuggest');
  const input = document.getElementById('pohQuery');
  if (!box) return;

  if (String(value ?? '').trim().length < 2) { closeSuggest(); return; }

  const obce = await ensureObce();
  const hits = searchObce(obce, value);
  if (!hits.length) { closeSuggest(); return; }

  box.innerHTML = hits.map((h, i) => `
    <li role="option" id="pohSuggest-${i}" tabindex="-1" data-lat="${h.lat}" data-lon="${h.lon}" data-name="${escapeHtml(h.name)}">
      <strong>${escapeHtml(h.name)}</strong>${h.okres ? ` <span class="poh-suggest-okres">okres ${escapeHtml(h.okres)}</span>` : ''}
    </li>`).join('');
  box.hidden = false;
  if (input) input.setAttribute('aria-expanded', 'true');

  box.querySelectorAll('li').forEach(li => {
    const pick = () => {
      if (input) input.value = li.dataset.name;
      closeSuggest();
      setOrigin({ lat: Number(li.dataset.lat), lon: Number(li.dataset.lon), label: li.dataset.name, precise: false });
    };
    li.addEventListener('click', pick);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
}

function wireGeolocation() {
  const btn = document.getElementById('pohGeoBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setOriginError('Prohlížeč polohu neumí. Napište prosím název obce.');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Zjišťuji polohu…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.disabled = false;
        btn.innerHTML = '<span aria-hidden="true">◎</span> Moje poloha';
        setOrigin({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'moje poloha',
          precise: true,
        });
      },
      () => {
        btn.disabled = false;
        btn.innerHTML = '<span aria-hidden="true">◎</span> Moje poloha';
        setOriginError('Polohu se nepodařilo zjistit (nejspíš není povolená). Napište prosím název obce.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

function setOriginError(message) {
  const el = document.getElementById('pohOrigin');
  if (el) el.innerHTML = `<span class="poh-origin-err">${escapeHtml(message)}</span>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Výpis
// ─────────────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (status.state === 'open') {
    if (status.nonstop) return '<span class="poh-badge poh-badge-open">Otevřeno nepřetržitě</span>';
    return `<span class="poh-badge poh-badge-open">Otevřeno${status.until ? ` do ${escapeHtml(status.until)}` : ''}</span>`;
  }
  if (status.state === 'unknown') {
    return '<span class="poh-badge poh-badge-unknown">Provozní doba neuvedena</span>';
  }
  if (status.next) {
    const when = status.nextDate ? relativeDay(status.nextDate) : '';
    return `<span class="poh-badge poh-badge-closed">Zavřeno · otevírá ${escapeHtml(when)} ${escapeHtml(status.next)}</span>`;
  }
  return '<span class="poh-badge poh-badge-closed">Zavřeno</span>';
}

/** „dnes“ / „zítra“ / „v sobotu“ — datum v absolutním tvaru čte hůř. */
function relativeDay(isoDay) {
  const today = new Date();
  const [y, m, d] = isoDay.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const diff = Math.round((target - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  if (diff <= 0) return 'dnes v';
  if (diff === 1) return 'zítra v';
  const names = ['v neděli v', 'v pondělí v', 'v úterý v', 've středu v', 've čtvrtek v', 'v pátek v', 'v sobotu v'];
  if (diff < 7) return names[target.getDay()];
  return `${target.getDate()}. ${target.getMonth() + 1}. v`;
}

function hoursTable(hours) {
  if (!hours) return '';
  if (hours.kind === 'rotation') {
    const rows = (hours.shifts ?? []).slice(0, 8).map(s => `
      <tr><th scope="row">${escapeHtml(formatCzDate(s.from))}</th><td>${s.ranges.map(formatRange).map(escapeHtml).join(', ')}</td></tr>`).join('');
    return `<table class="poh-hours"><caption>Termíny služby</caption><tbody>${rows}</tbody></table>`;
  }
  const todayKey = dayKeyFor(new Date());
  const rows = DAY_LABELS.map(([key, label]) => {
    const ranges = hours.week?.[key] ?? [];
    const text = ranges.length ? ranges.map(formatRange).map(escapeHtml).join(', ') : 'zavřeno';
    return `<tr${key === todayKey ? ' class="is-today"' : ''}><th scope="row">${label}</th><td>${text}</td></tr>`;
  }).join('');
  return `<table class="poh-hours"><caption>Ordinační hodiny</caption><tbody>${rows}</tbody></table>`;
}

function formatCzDate(iso) {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  return Number.isFinite(d) ? `${d}. ${m}. ${y}` : String(iso ?? '');
}

function mapsUrl(place) {
  const q = place.address ? `${place.name}, ${place.address}` : place.name;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;
}

function placeCard(row, index) {
  const cardId = `poh-card-${index}`;
  const p = row.place;
  const distance = formatDistance(row.distanceKm);
  const isAcute = p.category === 'akutni';

  const meta = [];
  if (distance) meta.push(`<span class="poh-dist">${escapeHtml(distance)} vzdušnou čarou</span>`);
  if (p.okres) meta.push(escapeHtml(p.okres));
  if (p.geo_source === 'obec') meta.push('<span class="poh-approx">poloha jen orientačně (střed obce)</span>');

  const flags = [];
  if (p.meets_minimum === false) {
    flags.push('<span class="poh-flag poh-flag-warn" title="Zveřejněná ordinační doba nedosahuje minima podle vyhlášky č. 380/2025 Sb.">pod zákonným minimem</span>');
  }
  if (isAcute && p.derived_note) {
    flags.push(`<span class="poh-flag">${escapeHtml(p.derived_note)}</span>`);
  }

  return `
  <li class="poh-card" id="${cardId}">
    <div class="poh-card-head">
      <div>
        <h3 class="poh-card-title">${escapeHtml(p.name)}</h3>
        ${p.workplace ? `<p class="poh-card-workplace">${escapeHtml(p.workplace)}</p>` : ''}
      </div>
      ${statusBadge(row.status)}
    </div>

    <p class="poh-card-type">${escapeHtml(p.category_label ?? '')}</p>
    ${p.address ? `<p class="poh-card-address">${escapeHtml(p.address)}</p>` : ''}
    ${p.place_note ? `<p class="poh-card-note">${escapeHtml(p.place_note)}</p>` : ''}
    ${meta.length ? `<p class="poh-card-meta">${meta.join(' · ')}</p>` : ''}
    ${flags.length ? `<p class="poh-card-flags">${flags.join(' ')}</p>` : ''}

    <div class="poh-card-actions">
      ${p.phone ? `<a class="poh-action poh-action-primary" href="tel:${escapeHtml(p.phone)}">Zavolat ${escapeHtml(formatPhone(p.phone))}</a>` : ''}
      <a class="poh-action" href="${escapeHtml(mapsUrl(p))}" target="_blank" rel="noopener">Ukázat na mapě</a>
      ${p.web ? `<a class="poh-action" href="${escapeHtml(p.web)}" target="_blank" rel="noopener">Web pracoviště</a>` : ''}
      ${p.detail_url ? `<a class="poh-action" href="${escapeHtml(p.detail_url)}" target="_blank" rel="noopener">Záznam u VZP</a>` : ''}
    </div>

    ${p.hours ? `<details class="poh-card-hours"><summary>Celý rozpis</summary>${hoursTable(p.hours)}</details>` : ''}
    ${Array.isArray(p.minimum_checks) && p.minimum_checks.length ? `
      <details class="poh-card-hours">
        <summary>Proč je pod minimem</summary>
        <ul class="poh-checks">${p.minimum_checks.map(c => `
          <li class="${c.ok ? 'is-ok' : 'is-bad'}"><span aria-hidden="true">${c.ok ? '✓' : '✕'}</span> ${escapeHtml(c.rule)} — ${escapeHtml(c.detail)}</li>`).join('')}
        </ul>
      </details>` : ''}
  </li>`;
}

function formatPhone(phone) {
  const m = /^\+420(\d{3})(\d{3})(\d{3})$/.exec(String(phone ?? ''));
  return m ? `${m[1]} ${m[2]} ${m[3]}` : String(phone ?? '');
}

/**
 * Akutní vrstva z registru se do výpisu vejde jen po převodu na stejný tvar
 * jako pohotovosti. Ordinační dobu registr nevede — proto `hours: null`,
 * což se zobrazí jako „provozní doba neuvedena“, ne jako „zavřeno“.
 */
function acuteAsPlace(a) {
  const labels = {
    urgentni_prijem: 'Urgentní příjem nemocnice',
    chirurgicka: 'Nemocnice s akutní chirurgií',
    zzs: 'Základna záchranné služby',
  };
  const primary = a.categories.includes('urgentni_prijem') ? 'urgentni_prijem'
    : a.categories.includes('chirurgicka') ? 'chirurgicka' : 'zzs';
  const derived = a.evidence?.[primary] === 'odvozeno';
  return {
    ...a,
    category: 'akutni',
    category_label: labels[primary],
    hours: null,
    meets_minimum: null,
    derived_note: derived ? 'zařazení odvozeno z registru, ne z výslovného údaje' : null,
    workplace: null,
  };
}

function visiblePlaces() {
  const base = (state.data?.places ?? []);
  const wantAcute = state.categories.has('akutni');
  const acute = wantAcute ? (state.acute ?? []).map(acuteAsPlace) : [];
  return [...base, ...acute];
}

const FALLBACK_MIN = 3;

function update() {
  const categories = [...state.categories];
  const all = visiblePlaces();
  state.rows = rankPlaces(all, {
    origin: state.origin,
    categories,
    openOnly: state.openOnly,
  });

  // V deset dopoledne nemá otevřeno skoro nic — a přísný filtr by pak vrátil
  // dvě nemocnice na druhém konci republiky. Když je otevřených málo, ukážeme
  // pod nimi i nejbližší zavřené s časem, kdy otevřou. Odpověď na „kam jet“
  // je pořád potřeba, i když je teď zavřeno.
  state.fallbackRows = [];
  if (state.openOnly && state.rows.length < FALLBACK_MIN) {
    const shownIds = new Set(state.rows.map(r => r.place.id));
    state.fallbackRows = rankPlaces(all, { origin: state.origin, categories, openOnly: false })
      .filter(r => !shownIds.has(r.place.id) && r.status.state === 'closed')
      .slice(0, 5);
  }

  renderList();
  renderMap();
  renderRotationSection();
}

function renderList() {
  const list = document.getElementById('pohList');
  const empty = document.getElementById('pohEmpty');
  const more = document.getElementById('pohMore');
  const heading = document.getElementById('pohResultsH');
  if (!list) return;

  const slice = state.rows.slice(0, state.shown);
  list.innerHTML = slice.map(placeCard).join('');

  if (heading) {
    heading.textContent = state.origin
      ? `Nejbližší pohotovosti od ${state.origin.label}`
      : 'Pohotovosti podle výběru';
  }

  if (empty) {
    const noResults = !state.rows.length && !state.fallbackRows?.length;
    empty.hidden = !noResults;
    if (noResults) {
      empty.innerHTML = state.openOnly
        ? 'V tomhle výběru nemá teď nic otevřeno. Zkuste odškrtnout „jen ty, které mají teď otevřeno“, nebo přidat další typ služby.'
        : 'Pro tenhle výběr nemáme žádný záznam. Zkuste přidat další typ služby.';
    }
  }

  renderFallback();

  if (more) {
    more.hidden = state.rows.length <= state.shown;
    more.textContent = `Zobrazit další (zbývá ${state.rows.length - state.shown})`;
  }
}

/** Nejbližší zavřené, když je otevřených málo — s časem, kdy otevřou. */
function renderFallback() {
  const host = document.getElementById('pohFallback');
  if (!host) return;
  const rows = state.fallbackRows ?? [];
  if (!rows.length) { host.hidden = true; host.innerHTML = ''; return; }

  host.hidden = false;
  host.innerHTML = `
    <h3 class="poh-fallback-h">${state.rows.length ? 'Nejbližší další, teď zavřené' : 'Teď nemá otevřeno nic v okolí — tady otevřou nejdřív'}</h3>
    <p class="poh-fallback-lead">Když potíže nepočkají do otevírací doby, volejte <a href="tel:155">155</a>.
      Operátor poradí, kam jet, nebo pošle posádku.</p>
    <ol class="poh-list">${rows.map((r, i) => placeCard(r, `f${i}`)).join('')}</ol>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Mapa
// ─────────────────────────────────────────────────────────────────────────

async function renderMap() {
  const host = document.getElementById('pohMap');
  if (!host) return;
  if (typeof echarts === 'undefined') {
    const fb = document.getElementById('pohMapFallback');
    if (fb) fb.hidden = false;
    return;
  }

  if (!state.chart) {
    try {
      const geojson = await ensureRegions();
      echarts.registerMap('cz-regions-poh', geojson);
      state.chart = echarts.init(host);
      state.chart.on('click', (params) => {
        // Bod, který je teď zavřený, ve výpisu být nemusí (filtr „jen otevřené“).
        const idx = params?.data?.rowIndex;
        if (idx == null) return;
        if (idx >= state.shown) { state.shown = idx + 1; renderList(); }
        document.getElementById(`poh-card-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      window.addEventListener('resize', () => state.chart?.resize());
    } catch (err) {
      const fb = document.getElementById('pohMapFallback');
      if (fb) fb.hidden = false;
      return;
    }
  }

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Mapa ignoruje filtr „jen otevřené“ a kreslí celou síť zvolených typů —
  // prázdná mapa v deset dopoledne by vypadala jako rozbitá stránka. Stav se
  // místo toho propíše do průhlednosti bodu a do popisku.
  const mapRows = rankPlaces(visiblePlaces(), {
    origin: state.origin,
    categories: [...state.categories],
    openOnly: false,
  });
  const indexInList = new Map(state.rows.map((r, i) => [r.place.id, i]));

  const series = TYPE_FILTERS
    .filter(t => state.categories.has(t.id))
    .map(t => ({
      name: t.label,
      type: 'scatter',
      coordinateSystem: 'geo',
      geoIndex: 0,
      symbolSize: 8,
      data: mapRows
        .filter(row => row.place.category === t.id && row.place.lon != null)
        .map(row => ({
          name: row.place.name,
          value: [row.place.lon, row.place.lat],
          rowIndex: indexInList.get(row.place.id) ?? null,
          statusLabel: row.status.state === 'open' ? 'otevřeno' : row.status.state === 'closed' ? 'teď zavřeno' : 'doba neuvedena',
          obec: row.place.obec ?? '',
          itemStyle: {
            color: CATEGORY_COLORS[t.id],
            opacity: row.status.state === 'open' ? 0.95 : 0.3,
          },
        })),
    }));

  state.chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (p) => `<strong>${escapeHtml(p.data?.name ?? '')}</strong><br>${escapeHtml(p.data?.obec ?? '')}<br>${escapeHtml(p.data?.statusLabel ?? '')}`,
    },
    legend: { bottom: 0, textStyle: { color: dark ? '#ddd' : '#333' } },
    geo: {
      map: 'cz-regions-poh',
      roam: false,
      itemStyle: {
        areaColor: dark ? '#22262b' : '#f3f1ec',
        borderColor: dark ? '#4a5158' : '#c9c3b6',
      },
      emphasis: { disabled: true },
    },
    series,
  }, { replaceMerge: ['series'] });
}

// ─────────────────────────────────────────────────────────────────────────
// Rotace
// ─────────────────────────────────────────────────────────────────────────

/**
 * Kraj, ve kterém uživatel hledá — z hranic krajů, ne z nejbližší pohotovosti.
 *
 * Nejbližší pracoviště u hranice krajů leží často za ní: Bezuchov (okres
 * Přerov, Olomoucký kraj) má nejblíž Bystřici pod Hostýnem ve Zlínském kraji.
 * Rozpis rotace by pak ukázal cizí kraj a ten správný skryl. Bod v polygonu
 * sedí na všech 6 251 obcích, u kterých se dá výsledek ověřit proti okresu.
 *
 * Než se hranice krajů načtou, vrací null — sekce rotace pak ukáže rozpisy
 * ze všech krajů, což je horší, ale ne zavádějící.
 */
function currentKrajCode() {
  return state.origin?.krajCode ?? null;
}

function renderRotationSection() {
  const section = document.getElementById('pohRotationSection');
  const lead = document.getElementById('pohRotationLead');
  const body = document.getElementById('pohRotationBody');
  if (!section || !body) return;

  // Zajímají jen rozpisy typu, který uživatel hledá; a když už víme, odkud
  // hledá, tak jen z jeho kraje — rozpis z druhého konce republiky mu není nic platný.
  const code = currentKrajCode();
  const relevant = (state.data?.rotations ?? [])
    .filter(r => state.categories.has(r.category))
    .filter(r => !code || r.kraj_code === code);

  if (!relevant.length) { section.hidden = true; return; }

  section.hidden = false;
  if (lead) {
    lead.textContent = 'V některých krajích nemá pohotovost jedno stálé místo — ordinace se ve službě střídají. '
      + 'Níže je rozpis, jak ho zveřejňuje VZP.';
  }

  body.innerHTML = relevant.map(rot => {
    const duty = rotationDuty(rot, new Date());
    const next = nextRotationDate(rot, new Date());
    const items = (duty.length ? duty.map(d => d.practice) : rot.practices.slice(0, 6));

    return `
      <article class="poh-rot">
        <h3 class="poh-rot-title">${escapeHtml(rot.category_label)} · ${escapeHtml(rot.kraj)}</h3>
        <p class="poh-rot-when">${duty.length
          ? 'Dnes slouží:'
          : next ? `Dnes se neslouží. Nejbližší termín: <strong>${escapeHtml(formatCzDate(next))}</strong>. Ve službě bývají:` : 'Rozpis termínů zdroj neuvádí.'}</p>
        <ul class="poh-rot-list">
          ${items.map(p => `
            <li>
              <strong>${escapeHtml(p.name)}</strong>
              ${p.address ? `<span class="poh-rot-addr">${escapeHtml(p.address)}</span>` : ''}
              ${p.phone ? `<a class="poh-action poh-action-primary" href="tel:${escapeHtml(p.phone)}">${escapeHtml(formatPhone(p.phone))}</a>` : ''}
            </li>`).join('')}
        </ul>
        <p class="poh-rot-src"><a href="${escapeHtml(rot.index_url)}" target="_blank" rel="noopener">Celý rozpis u VZP</a></p>
      </article>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────
// Kontext a metodika
// ─────────────────────────────────────────────────────────────────────────

function renderContext() {
  const c = state.data?.coverage;
  if (!c) return;

  const heroStats = document.getElementById('pohHeroStats');
  if (heroStats) {
    heroStats.innerHTML = `Sledujeme <strong>${c.places_total}</strong> pohotovostí ve všech 14 krajích — `
      + `u <strong>${c.places_with_hours}</strong> z nich známe ordinační dobu.`;
  }

  const statRow = document.getElementById('pohContextStats');
  if (statRow) {
    const assessed = Object.values(c.by_category).reduce((n, v) => n + v.assessed, 0);
    const meets = Object.values(c.by_category).reduce((n, v) => n + v.meets_minimum, 0);
    const stats = [
      [c.places_total, 'pohotovostí v celé ČR', 'Lékařské pro dospělé i děti, zubní a lékárenské dohromady.'],
      [`${c.regions_with_open_data} ze ${c.regions_total}`, 'krajů má otevřená data', 'Zbytek zveřejňuje jen webovou stránku, kterou nelze strojově číst.'],
      [assessed ? `${Math.round((meets / assessed) * 100)} %` : '—', 'splňuje zákonné minimum', `Podle zveřejněné doby: ${meets} z ${assessed} posuzovaných.`],
      [c.rotation_practices, 'ordinací ve střídavé službě', `V ${c.rotations_total} krajských rozpisech, hlavně u zubní pohotovosti.`],
    ];
    statRow.innerHTML = stats.map(([value, label, note]) => `
      <div class="poh-stat">
        <span class="poh-stat-value">${escapeHtml(String(value))}</span>
        <span class="poh-stat-label">${escapeHtml(label)}</span>
        <span class="poh-stat-note">${escapeHtml(note)}</span>
      </div>`).join('');
  }

  const minList = document.getElementById('pohMinimumList');
  const scope = state.data?.legal?.decree?.minimum_scope ?? {};
  if (minList) {
    const labels = state.data?.categories ?? {};
    minList.innerHTML = Object.entries(scope).map(([key, text]) => `
      <li><strong>${escapeHtml(labels[key] ?? key)}</strong> — ${escapeHtml(text)}</li>`).join('');
  }

  const countEl = document.getElementById('pohOpenDataCount');
  if (countEl) countEl.textContent = String(c.regions_with_open_data);

  const approx = document.getElementById('pohApproxCount');
  if (approx) approx.textContent = String(c.geo_sources?.obec ?? 0);

  const rows = document.getElementById('pohRegionRows');
  if (rows) {
    rows.innerHTML = (state.data.regions ?? []).map(r => {
      const k = c.by_kraj?.[r.kraj_code];
      const assessed = k?.assessed ?? 0;
      return `
        <tr>
          <th scope="row">${escapeHtml(r.kraj)}</th>
          <td class="poh-num">${k?.total ?? 0}</td>
          <td class="poh-num">${assessed ? `${k.meets_minimum} z ${assessed}` : '—'}</td>
          <td>${r.has_open_data
            ? `<a href="${escapeHtml(r.open_data_url)}" target="_blank" rel="noopener">ano</a>`
            : '<span class="poh-no">ne</span>'}</td>
          <td><a href="${escapeHtml(r.web)}" target="_blank" rel="noopener">${escapeHtml(r.web_label ?? r.kraj)}</a></td>
        </tr>`;
    }).join('');
  }

  const sources = document.getElementById('pohSources');
  if (sources) {
    sources.innerHTML = (state.data.sources ?? []).map(s => `
      <li>
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>
        — ${escapeHtml(s.role)}
        ${s.fetched_at ? `<span class="poh-src-date">Staženo ${escapeHtml(formatCzDate(s.fetched_at.slice(0, 10)))}.</span>` : ''}
      </li>`).join('') + `
      <li>
        <a href="${escapeHtml(state.data.legal?.decree?.url ?? '#')}" target="_blank" rel="noopener">${escapeHtml(state.data.legal?.decree?.title ?? '')}</a>
        — zákonné minimum, se kterým porovnáváme zveřejněnou ordinační dobu.
      </li>`;
  }

  const updated = document.getElementById('pohUpdated');
  if (updated && state.data.generated_at) {
    updated.textContent = `Data aktualizována ${formatCzDate(state.data.generated_at.slice(0, 10))}. Přehled se obnovuje týdně.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────

function wireForm() {
  const input = document.getElementById('pohQuery');
  if (input) {
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => onQueryInput(input.value), 150);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSuggest();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        document.querySelector('#pohSuggest li')?.focus();
      }
    });
  }

  const form = document.getElementById('pohForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      // Enter nesmí stránku odeslat — jen vybere první návrh.
      e.preventDefault();
      const obce = await ensureObce();
      const hit = searchObce(obce, input?.value ?? '', 1)[0];
      if (hit) {
        input.value = hit.name;
        closeSuggest();
        setOrigin({ lat: hit.lat, lon: hit.lon, label: hit.name, precise: false });
      }
    });
  }

  const openNow = document.getElementById('pohOpenNow');
  if (openNow) {
    openNow.addEventListener('change', () => {
      state.openOnly = openNow.checked;
      state.shown = PAGE_SIZE;
      update();
    });
  }

  const more = document.getElementById('pohMore');
  if (more) {
    more.addEventListener('click', () => { state.shown += PAGE_SIZE; renderList(); });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.poh-field')) closeSuggest();
  });

  // Přepnutí tmavého režimu mění barvy podkladu mapy.
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => renderMap())
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
}

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav();
  renderMastheadDate();
  renderFooter();
  renderRelatedTools('pohotovosti');

  try {
    state.data = await loadJson('data/pohotovosti.json');
  } catch (err) {
    renderErrorState('Data o pohotovostech se nepodařilo načíst.', err);
    return;
  }

  renderTypeChips();
  renderContext();
  wireForm();
  wireGeolocation();
  setOrigin(null);
}

init();
