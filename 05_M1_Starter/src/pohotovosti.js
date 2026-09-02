// Stránka „Kde je nejbližší pohotovost“ (pohotovosti.html).
//
// Renderovací vrstva. Veškerá logika (svátky, otevřeno/zavřeno, vzdálenost,
// vyhledání obce) sedí v `pohotovosti-engine.js`, aby šla testovat bez DOM.
//
// Datové vstupy:
//   data/pohotovosti.json        — pohotovosti, rotace, pokrytí, právní kontext
//   data/obce-gps.json           — gazetteer obcí (líně, až uživatel začne psát)
//   data/pohotovosti-akutni.json — urgentní příjmy a akutní chirurgie (líně)
//   sw-pohotovosti.js            — offline cache (network-first, jen tahle stránka)
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
  haversineKm,
  careAdvice,
  isWorkingHours,
  okresSlug,
  feedbackIssueUrl,
  FEEDBACK_ISSUES_URL,
} from './pohotovosti-engine.js';

const PAGE_SIZE = 8;

/** Pořadí a popisky filtrů. „Chirurgická“ míří do akutní vrstvy z registru. */
const TYPE_FILTERS = [
  { id: 'lps_dospeli', label: 'Dospělí', title: 'Lékařská pohotovostní služba pro dospělé' },
  { id: 'lps_deti', label: 'Děti', title: 'Lékařská pohotovostní služba pro děti a dorost' },
  { id: 'zubni', label: 'Zubní', title: 'Pohotovostní služba v oboru zubní lékařství' },
  { id: 'lekarna', label: 'Lékárna', title: 'Lékárenská pohotovostní služba' },
  { id: 'ambulance_denni', label: 'Denní ambulance', title: 'Úrazové a chirurgické ambulance nemocnic s ručně ověřenou provozní dobou — kam jít v ordinační době, kdy pohotovost ze zákona neslouží' },
  { id: 'akutni', label: 'Urgentní příjem a chirurgie', title: 'Urgentní příjmy, nemocnice s akutní chirurgií a základny záchranné služby z registru ÚZIS — nejde o pohotovostní službu podle vyhlášky a registr u nich nevede provozní dobu' },
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
  ambulance_denni: '#0b7285',
  akutni: '#b3261e',
};

/**
 * Kam vede „Nahlásit změnu“, když data nenesou vlastní konfiguraci
 * (`practical.feedback`). Repo je veřejné; předvyplněné issue je jediný
 * kanál zpětné vazby, který nevyžaduje provoz serveru ani sběr e-mailů.
 */
const FEEDBACK_FALLBACK_URL = FEEDBACK_ISSUES_URL;

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
    renderAdvice(); // online pohotovost, infolinka a poradní linka závisí na kraji
    // Celostátní přehled online pohotovostí se tím nezúží — jen vytáhne
    // službu vlastního kraje dopředu a tomu, kdo ji nemá, to napíše.
    renderOnlineSection();
    renderTriage();
    renderAdviceLines();
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
  if (origin) {
    resolveOriginRegion(origin);
    // V ordinační době je nejbližší urgentní příjem součástí odpovědi,
    // takže se akutní vrstva dotáhne i bez zapnutého filtru.
    if (isWorkingHours()) ensureAcute().then(() => { renderAdvice(); }).catch(() => {});
  }
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
  if (p.category === 'ambulance_denni') {
    flags.push(p.walk_in === 'ano'
      ? '<span class="poh-flag poh-flag-ok" title="Nemocnice na svém webu uvádí, že sem pacienti chodí i bez objednání.">i bez objednání</span>'
      : '<span class="poh-flag" title="Nemocnice neuvádí, zda ošetří i neobjednané — zavolejte předem.">zavolejte předem</span>');
    flags.push('<span class="poh-flag" title="Není to pohotovostní služba podle vyhlášky č. 380/2025 Sb., ale běžná ambulance nemocnice — proto se u ní zákonné minimum neposuzuje.">běžná ambulance, ne pohotovost</span>');
    // Týdenní drift-check: když se zdrojová stránka od ověření změnila,
    // hodiny mohou být zastaralé — a stránka to musí říct dřív, než někdo vyrazí.
    if (p.hours_check?.status === 'drift') {
      flags.push('<span class="poh-flag poh-flag-warn" title="Automatická týdenní kontrola zjistila, že se stránka nemocnice od našeho ověření změnila. Hodiny níže mohou být zastaralé — před cestou zavolejte.">zdroj se změnil — ověřte telefonicky</span>');
    }
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
      ${shareActionsHtml(p, row)}
    </div>
    <p class="poh-card-foot">${cardFootHtml(p)}</p>

    ${p.hours ? `<details class="poh-card-hours"><summary>Celý rozpis</summary>${hoursTable(p.hours)}</details>` : ''}
    ${p.quote ? `
      <details class="poh-card-hours">
        <summary>Podle čeho je doba zapsaná</summary>
        <blockquote class="poh-quote">${escapeHtml(p.quote)}</blockquote>
        <p class="poh-quote-src">
          <a href="${escapeHtml(p.detail_url ?? '#')}" target="_blank" rel="noopener">${escapeHtml(p.source_name ?? 'zdroj')}</a>${
            p.verified_at ? `, ověřeno ${escapeHtml(formatCzDate(p.verified_at))}` : ''}.
          Provozní dobu nemocničních ambulancí nevede žádný registr — tenhle údaj přepsal člověk ze stránky nemocnice.
          ${p.hours_check ? hoursCheckLine(p.hours_check) : ''}
        </p>
      </details>` : ''}
    ${Array.isArray(p.minimum_checks) && p.minimum_checks.length ? `
      <details class="poh-card-hours">
        <summary>Proč je pod minimem</summary>
        <ul class="poh-checks">${p.minimum_checks.map(c => `
          <li class="${c.ok ? 'is-ok' : 'is-bad'}"><span aria-hidden="true">${c.ok ? '✓' : '✕'}</span> ${escapeHtml(c.rule)} — ${escapeHtml(c.detail)}</li>`).join('')}
        </ul>
      </details>` : ''}
  </li>`;
}

/**
 * Věta o poslední automatické kontrole citátu. „Nedostupné“ se nehlásí jako
 * problém — o driftu v tu chvíli nevíme nic a falešný poplach by devalvoval
 * ten skutečný.
 */
function hoursCheckLine(check) {
  const when = check.checked_at ? ` ${escapeHtml(formatCzDate(check.checked_at))}` : '';
  if (check.status === 'ok') return `Automatická kontrola${when}: citát na stránce nemocnice stále je.`;
  if (check.status === 'drift') return `<strong>Automatická kontrola${when}: stránka nemocnice se změnila — hodiny mohou být zastaralé.</strong>`;
  return '';
}

function formatPhone(phone) {
  const m = /^\+420(\d{3})(\d{3})(\d{3})$/.exec(String(phone ?? ''));
  return m ? `${m[1]} ${m[2]} ${m[3]}` : String(phone ?? '');
}

function generatedDay() {
  return String(state.data?.generated_at ?? '').slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────
// Karta do ruky: SMS, sdílení, zpětná vazba
//
// Kdo pohotovost hledá, často pro někoho jiného — a ten, kdo pojede, chce
// adresu a telefon v telefonu, ne otevřenou stránku. Text je záměrně holý:
// jméno, typ, adresa, telefon, stav a datum dat, nic víc.
// ─────────────────────────────────────────────────────────────────────────

/** Text karty pro SMS a sdílení. */
function shareTextFor(p, row) {
  const st = row?.status;
  const stateText = st?.state === 'open'
    ? `teď otevřeno${st.until ? ` do ${st.until}` : ''}`
    : st?.state === 'closed' ? `teď zavřeno${st.next ? `, otevírá ${st.next}` : ''}` : null;
  const gen = generatedDay();
  return [
    p.workplace ? `${p.name} — ${p.workplace}` : p.name,
    p.category_label,
    p.address,
    p.phone ? `Tel.: ${formatPhone(p.phone)}` : null,
    stateText,
    `skorezdravotnictvi.cz/pohotovosti${gen ? ` (data k ${formatCzDate(gen)})` : ''}`,
  ].filter(Boolean).join('\n');
}

function shareActionsHtml(p, row) {
  const text = shareTextFor(p, row);
  // `sms:?&body=` čtou Android i iOS; samotné `?body=` iOS starších verzí ignoroval.
  const sms = `sms:?&body=${encodeURIComponent(text)}`;
  return `
      <a class="poh-action poh-action-quiet" href="${escapeHtml(sms)}" title="Poslat adresu a telefon esemeskou — třeba tomu, kdo pojede">SMS</a>
      <button type="button" class="poh-action poh-action-quiet" data-share-text="${escapeHtml(text)}" title="Sdílet nebo zkopírovat adresu a telefon">Sdílet</button>`;
}

/** Předvyplněné hlášení změny — sdílená definice v enginu. */
function feedbackUrl(p) {
  const fb = state.data?.practical?.feedback;
  return feedbackIssueUrl(p, {
    base: fb?.issues_new_url ?? FEEDBACK_FALLBACK_URL,
    labels: fb?.labels ?? [],
    generatedDay: generatedDay(),
  });
}

/** Patička karty: jak stará data jsou a kam nahlásit, že už neplatí. */
function cardFootHtml(p) {
  const gen = generatedDay();
  const stamp = p.verified_at
    ? `ověřeno člověkem ${formatCzDate(p.verified_at)}`
    : gen ? `data k ${formatCzDate(gen)}` : '';
  return `${escapeHtml(stamp)}${stamp ? ' · ' : ''}<a href="${escapeHtml(feedbackUrl(p))}" target="_blank" rel="noopener" title="Otevře předvyplněné hlášení na GitHubu (vyžaduje účet GitHub)">Nahlásit změnu</a>`;
}

/** Sdílení: nativní dialog, kde je; jinak schránka. */
async function shareOrCopy(text, btn) {
  const url = `${location.origin}${location.pathname}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Pohotovost', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    flashButton(btn, 'Zkopírováno');
  } catch {
    // Uživatel sdílení zavřel, nebo schránka není k dispozici — tlačítko
    // zůstane, jak bylo; nic se nerozbilo.
  }
}

function flashButton(btn, label) {
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = label;
  setTimeout(() => { btn.textContent = orig; }, 1800);
}

function wireShare() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-share-text]');
    if (card) { shareOrCopy(card.dataset.shareText, card); return; }
    const list = e.target.closest('[data-share-list]');
    if (list) {
      const rows = state.rows.slice(0, 3);
      if (!rows.length) return;
      shareOrCopy(rows.map(r => shareTextFor(r.place, r)).join('\n\n'), list);
    }
  });
  document.getElementById('pohPrint')?.addEventListener('click', () => window.print());
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

  renderAdvice();
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
  const tools = document.getElementById('pohTools');
  if (tools) tools.hidden = !state.rows.length;

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

// ─────────────────────────────────────────────────────────────────────────
// Co dělat teď
//
// Nejdůležitější blok stránky. Bez něj odpovídala doslovně na „která
// pohotovost má otevřeno“ — a v pondělí dopoledne, kdy pohotovost ze zákona
// neslouží, poslala uživatele z Mariánských Lázní do Prahy, 115 km daleko.
// ─────────────────────────────────────────────────────────────────────────

/** Online pohotovost kraje, ve kterém uživatel hledá (když v něm nějaká je). */
function onlineForOrigin() {
  const code = currentKrajCode();
  if (!code) return null;
  return (state.data?.online?.services ?? []).find(sv => sv.kraj_code === code) ?? null;
}

/** Infolinka kraje, ve kterém uživatel hledá. */
function infolineForOrigin() {
  const code = currentKrajCode();
  if (!code) return null;
  return (state.data?.online?.infolines ?? []).find(l => l.kraj_code === code) ?? null;
}

/** Provozní doba poradní linky, nebo poctivé „web ji neuvádí“. */
function adviceLineHours(l) {
  if (l?.hours) return l.hours;
  return l?.hours_unknown ? 'provozní dobu web záchranky neuvádí, ověříte při zavolání' : '';
}

/** Neakutní poradní linka záchranné služby kraje, ve kterém uživatel hledá. */
function adviceLineForOrigin() {
  const code = currentKrajCode();
  if (!code) return null;
  return (state.data?.online?.advice_lines ?? []).find(l => l.kraj_code === code) ?? null;
}

/**
 * Nejbližší urgentní příjem — jediné pracoviště, u kterého registr přímo
 * dokládá neobjednanou akutní péči.
 */
function nearestUrgent() {
  if (!state.origin || !state.acute) return null;
  const hits = state.acute
    .filter(a => a.categories.includes('urgentni_prijem') && a.lat != null)
    .map(a => ({ place: acuteAsPlace(a), distanceKm: haversineKm(state.origin, a) }))
    .sort((x, y) => (x.distanceKm ?? Infinity) - (y.distanceKm ?? Infinity));
  return hits[0] ?? null;
}

/**
 * Nejbližší denní úrazová ambulance nemocnice. Na rozdíl od `nearestUrgent`
 * u ní známe provozní dobu, takže se dá říct „má teď otevřeno“, ne jen
 * „existuje“.
 */
function nearestAmbulance() {
  if (!state.origin) return null;
  return rankPlaces(state.data?.places ?? [], {
    origin: state.origin,
    categories: ['ambulance_denni'],
    openOnly: false,
    now: new Date(),
  })[0] ?? null;
}

/** Kategorie, podle které se řídí první kontakt v ordinační době. */
function primaryCategory() {
  for (const c of ['lps_dospeli', 'lps_deti', 'zubni', 'lekarna']) {
    if (state.categories.has(c)) return c;
  }
  return 'lps_dospeli';
}

function renderAdvice() {
  const host = document.getElementById('pohAdvice');
  if (!host) return;

  const now = new Date();
  const category = primaryCategory();
  const lpsRows = rankPlaces(state.data?.places ?? [], {
    origin: state.origin,
    categories: [category],
    openOnly: false,
    now,
  });

  const advice = careAdvice({
    now,
    hasOrigin: Boolean(state.origin),
    category,
    online: onlineForOrigin(),
    nearestOpen: lpsRows.find(r => r.status.state === 'open') ?? null,
    nearestLps: lpsRows[0] ?? null,
    nearestUrgent: nearestUrgent(),
    nearestAmbulance: nearestAmbulance(),
    adviceLine: adviceLineForOrigin(),
  });

  const infoline = infolineForOrigin();
  const parts = [];

  if (advice.mode === 'ordinacni_doba') {
    parts.push(`
      <p class="poh-advice-lead">
        <strong>Teď je běžná ordinační doba — pohotovost ještě neslouží.</strong>
        Pohotovostní služba ze zákona nastupuje až po ordinačních hodinách
        (v pracovní den zpravidla od 16:00). Do té doby patří akutní potíže
        k lékaři, u kterého jste registrovaní.
      </p>`);
  } else {
    parts.push(`
      <p class="poh-advice-lead">
        <strong>Teď je čas pohotovosti.</strong> Ordinace mají zavřeno, takže
        s potížemi, které nepočkají do rána, jděte na pohotovost níže.
      </p>`);
  }

  parts.push('<ol class="poh-advice-steps">');
  for (const step of advice.steps) parts.push(adviceStepHtml(step));
  parts.push('</ol>');

  if (advice.openIsFar && advice.mode === 'pohotovost') {
    const km = formatDistance(advice.steps.find(s => s.kind === 'lps_otevrena')?.distanceKm);
    parts.push(`
      <p class="poh-advice-warn">
        Nejbližší otevřená pohotovost je ${escapeHtml(km ?? 'daleko')} od vás. Než se
        vydáte na cestu, zavolejte tam — a při zhoršení stavu volejte
        <a href="tel:155">155</a>.
      </p>`);
  }

  if (infoline) {
    parts.push(`
      <p class="poh-advice-infoline">
        <strong>${escapeHtml(infoline.kraj)}</strong> provozuje nepřetržitou informační linku
        o pohotovostech: <a href="tel:${escapeHtml(infoline.phone)}">${escapeHtml(formatPhone(infoline.phone))}</a>.
      </p>`);
  }

  host.innerHTML = parts.join('');
}

/** Text prvního kontaktu podle toho, co uživatel hledá. */
const PRVNI_KONTAKT_TEXT = {
  praktik: {
    what: 'Zavolejte svému praktickému lékaři',
    why: 'V ordinační době je to první adresa. Praktik vás objedná na akutní vyšetření nebo poradí po telefonu.',
  },
  detsky_lekar: {
    what: 'Zavolejte dětskému lékaři',
    why: 'V ordinační době řeší akutní potíže dítěte praktický lékař pro děti a dorost, u kterého je registrované.',
  },
  zubar: {
    what: 'Zavolejte svému zubaři',
    why: 'S akutní bolestí zubu vás vlastní zubař zpravidla vezme mimo objednané pacienty. Zubní pohotovost slouží až mimo ordinační hodiny — a ve většině krajů jen o víkendech a svátcích.',
  },
  lekarna: {
    what: 'Zajděte do kterékoli otevřené lékárny',
    why: 'V ordinační době mají běžné lékárny otevřeno. Lékárenská pohotovost je režim pro večery, noci a svátky.',
  },
};

function adviceStepHtml(step) {
  if (step.kind === 'prvni_kontakt') {
    const t = PRVNI_KONTAKT_TEXT[step.contact] ?? PRVNI_KONTAKT_TEXT.praktik;
    // „Zavolejte praktikovi“ je k ničemu tomu, kdo žádného nemá — a takových
    // lidí přibývá. Věta i odkaz jsou z dat (NZIP), ne z hlavy.
    const noGp = state.data?.practical?.no_gp;
    const noGpHtml = noGp && (step.contact === 'praktik' || step.contact === 'detsky_lekar')
      ? `<span class="poh-advice-hint">${escapeHtml(noGp.short ?? noGp.title ?? '')} ${(noGp.links ?? [])
          .map(l => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`).join(' · ')}</span>`
      : '';
    return `
      <li class="poh-advice-step">
        <span class="poh-advice-what">${escapeHtml(t.what)}</span>
        <span class="poh-advice-why">${escapeHtml(t.why)}</span>
        ${noGpHtml}
      </li>`;
  }

  if (step.kind === 'poradna') {
    const l = step.line;
    return `
      <li class="poh-advice-step poh-advice-step-poradna">
        <span class="poh-advice-what">${escapeHtml(l.name)} — ${escapeHtml(adviceLineHours(l))}</span>
        <span class="poh-advice-why">${escapeHtml(l.text ?? '')} Není to tísňová linka — při ohrožení života volejte 155.</span>
        <a class="poh-action poh-action-primary" href="tel:${escapeHtml(l.phone)}">Zavolat ${escapeHtml(formatPhone(l.phone))}</a>
        ${l.phone_alt ? `<a class="poh-action" href="tel:${escapeHtml(l.phone_alt)}">nebo ${escapeHtml(formatPhone(l.phone_alt))}</a>` : ''}
      </li>`;
  }

  if (step.kind === 'zadejte_polohu') {
    return `
      <li class="poh-advice-step">
        <span class="poh-advice-what">Zadejte obec nebo použijte polohu</span>
        <span class="poh-advice-why">Bez ní nedokážeme říct, co je k vám nejblíž — a hádat to nebudeme.</span>
      </li>`;
  }

  if (step.kind === 'online') {
    const sv = step.service;
    return `
      <li class="poh-advice-step poh-advice-step-online">
        <span class="poh-advice-what">${escapeHtml(sv.name)} — online, ${escapeHtml(sv.availability === 'nonstop' ? 'nepřetržitě' : sv.availability)}</span>
        <span class="poh-advice-why">
          Zdarma pro ${escapeHtml(sv.free_for)}. Spojení s lékařem
          ${sv.response_minutes ? `do ${sv.response_minutes} minut ` : ''}přes
          ${escapeHtml((sv.channels ?? []).join(' nebo '))}, nikam se nejezdí.
          Vhodné na ${escapeHtml(sv.good_for)}.
          ${sv.not_for ? `<em>Není pro ${escapeHtml(sv.not_for)}.</em>` : ''}
        </span>
        <a class="poh-action poh-action-primary" href="${escapeHtml(sv.url)}" target="_blank" rel="noopener">Otevřít ${escapeHtml(sv.name)}</a>
      </li>`;
  }

  if (step.kind === 'ambulance_denni') {
    const p = step.place;
    const walkIn = p.walk_in === 'ano'
      ? 'Nemocnice uvádí, že sem pacienti chodí i bez objednání.'
      : 'Jestli sem chodí i neobjednaní, nemocnice neuvádí — zavolejte předem.';
    return `
      <li class="poh-advice-step poh-advice-step-ambulance">
        <span class="poh-advice-what">${escapeHtml(p.name)}${p.workplace ? ` — ${escapeHtml(p.workplace)}` : ''}${step.distanceKm != null ? ` · ${escapeHtml(formatDistance(step.distanceKm))}` : ''}</span>
        <span class="poh-advice-why">
          Denní úrazová a chirurgická ambulance nemocnice, teď otevřeno${step.status?.until ? ` do ${escapeHtml(step.status.until)}` : ''}.
          ${escapeHtml(walkIn)} ${escapeHtml(p.address ?? '')}
        </span>
        ${p.phone ? `<a class="poh-action poh-action-primary" href="tel:${escapeHtml(p.phone)}">Zavolat ${escapeHtml(formatPhone(p.phone))}</a>` : ''}
      </li>`;
  }

  if (step.kind === 'urgent') {
    const p = step.place;
    return `
      <li class="poh-advice-step">
        <span class="poh-advice-what">${escapeHtml(p.name)}${step.distanceKm != null ? ` — ${escapeHtml(formatDistance(step.distanceKm))}` : ''}</span>
        <span class="poh-advice-why">
          Urgentní příjem nemocnice. Přijímá i bez objednání a bez ohledu na hodinu.
          Je pro vážné stavy, ne pro to, co počká na ordinační hodiny.
          ${escapeHtml(p.address ?? '')}
        </span>
        ${p.phone ? `<a class="poh-action" href="tel:${escapeHtml(p.phone)}">Zavolat ${escapeHtml(formatPhone(p.phone))}</a>` : ''}
      </li>`;
  }

  if (step.kind === 'lps_otevrena') {
    const p = step.place;
    return `
      <li class="poh-advice-step">
        <span class="poh-advice-what">${escapeHtml(p.name)}${step.distanceKm != null ? ` — ${escapeHtml(formatDistance(step.distanceKm))}` : ''}</span>
        <span class="poh-advice-why">${escapeHtml(p.category_label ?? '')}, teď otevřeno${step.status?.until ? ` do ${escapeHtml(step.status.until)}` : ''}. ${escapeHtml(p.address ?? '')}</span>
        ${p.phone ? `<a class="poh-action poh-action-primary" href="tel:${escapeHtml(p.phone)}">Zavolat ${escapeHtml(formatPhone(p.phone))}</a>` : ''}
      </li>`;
  }

  if (step.kind === 'lps_pozdeji') {
    const p = step.place;
    const when = step.status?.next
      ? `${relativeDay(step.status.nextDate ?? '')} ${step.status.next}`
      : 'podle rozpisu';
    // Tohle pracoviště prokazatelně přijímá lidi bez objednání — provozuje
    // pohotovost. Že tam přes den funguje i běžná ambulance, je pravděpodobné,
    // ale registr to nepotvrzuje, takže se říká „zeptejte se“, ne „přijďte“.
    const hint = step.daytimeHint && p.phone
      ? ' Zavolejte tam i teď — bývá tu přes den běžná ambulance téhož zařízení.'
      : '';
    return `
      <li class="poh-advice-step">
        <span class="poh-advice-what">${escapeHtml(p.name)}${step.distanceKm != null ? ` — ${escapeHtml(formatDistance(step.distanceKm))}` : ''}</span>
        <span class="poh-advice-why">Nejbližší pohotovost od vás. Otevírá ${escapeHtml(when)}.${escapeHtml(hint)} ${escapeHtml(p.address ?? '')}</span>
        ${p.phone ? `<a class="poh-action" href="tel:${escapeHtml(p.phone)}">Zavolat ${escapeHtml(formatPhone(p.phone))}</a>` : ''}
      </li>`;
  }

  return '';
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
// Než vyrazíte
//
// Druhá půlka odpovědi. Otevírací doba se mění dovolenými a zástupy rychleji,
// než ji kdokoli stihne zveřejnit, takže „zavolejte předem“ není zdvořilostní
// fráze, ale oprava chyby, kterou tahle stránka sama nedokáže odstranit.
// ─────────────────────────────────────────────────────────────────────────

function renderBeforeYouGo() {
  const host = document.getElementById('pohBefore');
  const pr = state.data?.practical;
  if (!host || !pr) return;

  const steps = (pr.before_you_go ?? []).map(s => `
    <li class="poh-before-item${s.emphasis ? ' poh-before-item-key' : ''}">
      <span class="poh-before-title">${escapeHtml(s.title)}</span>
      <span class="poh-before-text">${escapeHtml(s.text)}</span>
    </li>`).join('');

  const fee = pr.fee;
  const feeHtml = fee ? `
    <div class="poh-fee">
      <p class="poh-fee-lead">
        <strong>${escapeHtml(fee.label ?? 'Poplatek')}: ${escapeHtml(String(fee.amount_czk))} Kč.</strong>
        ${escapeHtml(fee.text ?? '')}
      </p>
      <p class="poh-fee-ex">Neplatí ho ten, u koho platí některá z výjimek: ${
        (fee.exemptions ?? []).map(e => escapeHtml(e)).join('; ')}.</p>
      ${fee.note ? `<p class="poh-fee-note">${escapeHtml(fee.note)}</p>` : ''}
      <p class="poh-fee-src">
        Zdroj: <a href="${escapeHtml(fee.source?.url ?? '#')}" target="_blank" rel="noopener">${escapeHtml(fee.source?.name ?? 'zdroj')}</a>${
          fee.verified_at ? `, ověřeno ${escapeHtml(formatCzDate(fee.verified_at))}` : ''}.
      </p>
    </div>` : '';

  // Co člověka na místě čeká — triáž podle závažnosti, čekání, co pohotovost
  // neudělá. Přepis oficiálního zdroje, každá položka s odkazem.
  const expectations = pr.expectations ?? [];
  const exHtml = expectations.length ? `
    <div class="poh-expect">
      <h3 class="poh-h3">Co vás na pohotovosti čeká</h3>
      <ul class="poh-expect-list">${expectations.map(e => `
        <li>
          <strong>${escapeHtml(e.title)}</strong> ${escapeHtml(e.text)}
          ${e.source?.url ? `<a class="poh-expect-src" href="${escapeHtml(e.source.url)}" target="_blank" rel="noopener">${escapeHtml(e.source.name ?? 'zdroj')}</a>` : ''}
        </li>`).join('')}
      </ul>
    </div>` : '';

  host.innerHTML = `<ol class="poh-before-list">${steps}</ol>${feeHtml}${exHtml}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Rozcestník „Kam s tím?“
//
// Vyhledávání odpovídá na „kde“, ne na „kam patřím“. To je druhá otázka —
// a stránka na ni nesmí odpovídat vlastním úsudkem. Každý řádek je proto
// přepis oficiálního zdroje (NZIP, záchranná služba, ministerstvo)
// s odkazem a datem ověření; stránka jen převádí odpověď na tlačítko:
// zavolat, vyhledat, otevřít. Bez dat se sekce nevykreslí vůbec.
// ─────────────────────────────────────────────────────────────────────────

function triageActionHtml(action, { primary = true } = {}) {
  if (!action) return '';
  const cls = `poh-action${primary ? ' poh-action-primary' : ''}`;
  const label = escapeHtml(action.label ?? '');
  if (action.kind === 'tel') return `<a class="${cls}" href="tel:${escapeHtml(action.phone)}">${label}</a>`;
  if (action.kind === 'href') return `<a class="${cls}" href="${escapeHtml(action.url)}" target="_blank" rel="noopener">${label}</a>`;
  if (action.kind === 'anchor') return `<a class="${cls}" href="${escapeHtml(action.href)}">${label}</a>`;
  if (action.kind === 'find') {
    return `<button type="button" class="${cls}" data-find="${escapeHtml((action.categories ?? []).join(','))}">${label}</button>`;
  }
  if (action.kind === 'poradna') return poradnaActionHtml(action, cls);
  return '';
}

/** Poradní linka záchranky je krajská — tlačítko se mění podle toho, odkud uživatel hledá. */
function poradnaActionHtml(action, cls) {
  const line = adviceLineForOrigin();
  if (line) {
    return `<a class="${cls}" href="tel:${escapeHtml(line.phone)}">${escapeHtml(line.name)} · ${escapeHtml(formatPhone(line.phone))}</a>
      <span class="poh-roz-hint">${escapeHtml(adviceLineHours(line))}</span>`;
  }
  const hint = state.origin
    ? 'Ve vašem kraji záchranná služba neakutní poradní linku neprovozuje — přehled krajů, kde je, níže.'
    : 'Zadejte obec nahoře — poradní linku má jen část krajů.';
  return `<a class="poh-action" href="#pohPoradny">${escapeHtml(action.label ?? 'Poradní linky podle krajů')}</a>
    <span class="poh-roz-hint">${escapeHtml(hint)}</span>`;
}

function renderTriage() {
  const host = document.getElementById('pohTriageGrid');
  if (!host) return;
  const rows = state.data?.practical?.triage ?? [];
  const section = host.closest('section');
  if (!rows.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;

  host.innerHTML = rows.map(r => `
    <li class="poh-roz-card${r.urgent ? ' poh-roz-card-urgent' : ''}" id="roz-${escapeHtml(r.id)}">
      <h3 class="poh-roz-title">${escapeHtml(r.situation)}</h3>
      ${r.examples ? `<p class="poh-roz-ex">${escapeHtml(r.examples)}</p>` : ''}
      <p class="poh-roz-text">${escapeHtml(r.text)}</p>
      <p class="poh-roz-actions">${triageActionHtml(r.action)}${r.secondary ? ` ${triageActionHtml(r.secondary, { primary: false })}` : ''}</p>
      ${r.source?.url ? `<p class="poh-roz-src">Podle: ${[r.source, ...(r.sources ?? [])]
        .map(sr => `<a href="${escapeHtml(sr.url)}" target="_blank" rel="noopener">${escapeHtml(sr.name ?? 'zdroj')}</a>`).join('; ')}${
        r.verified_at ? `, ověřeno ${escapeHtml(formatCzDate(r.verified_at))}` : ''}.</p>` : ''}
    </li>`).join('');

  // „Najít“ přepne filtr typu a vrátí uživatele k vyhledávání — s polohou
  // rovnou k odpovědi „Co dělat teď“, bez polohy do pole pro obec.
  host.querySelectorAll('[data-find]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cats = String(btn.dataset.find ?? '').split(',').filter(Boolean);
      if (!cats.length) return;
      state.categories = new Set(cats);
      state.shown = PAGE_SIZE;
      if (cats.includes('akutni')) await ensureAcute().catch(() => {});
      renderTypeChips();
      update();
      const target = document.getElementById(state.origin ? 'pohAdviceH' : 'pohQuery');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!state.origin) document.getElementById('pohQuery')?.focus({ preventScroll: true });
    });
  });
}

/** Celostátní přehled poradních linek záchranek — ukazuje se všem, jako online pohotovosti. */
function renderAdviceLines() {
  const host = document.getElementById('pohPoradny');
  if (!host) return;
  const lines = state.data?.online?.advice_lines ?? [];
  if (!lines.length) { host.hidden = true; return; }
  host.hidden = false;
  const mine = currentKrajCode();
  const note = state.data?.online?.advice_lines_note;

  host.innerHTML = `
    <h3 class="poh-h3" id="pohPoradnyH">Poradní linky záchranek: kam volat, když nejde o život</h3>
    <p class="poh-roz-lead">
      Část krajských záchranných služeb provozuje vedle tísňové linky 155 i linku pro
      neakutní stavy — pro chvíle, kdy nevíte, jestli s tím někam jít. Nevolejte na ni
      při ohrožení života; tam patří 155.
    </p>
    <ul class="poh-poradna-list">${lines.map(l => `
      <li class="poh-poradna${l.kraj_code === mine ? ' is-mine' : ''}">
        ${l.kraj_code === mine ? '<span class="poh-online-badge">Ve vašem kraji</span>' : ''}
        <span class="poh-poradna-kraj">${escapeHtml(l.kraj)}</span>
        <span class="poh-poradna-name">${escapeHtml(l.name)}</span>
        <a class="poh-action poh-action-primary" href="tel:${escapeHtml(l.phone)}">${escapeHtml(formatPhone(l.phone))}</a>
        ${l.phone_alt ? `<a class="poh-action" href="tel:${escapeHtml(l.phone_alt)}">${escapeHtml(formatPhone(l.phone_alt))}</a>` : ''}
        <span class="poh-poradna-hours">${escapeHtml(adviceLineHours(l))}${l.since ? ` · od ${escapeHtml(formatSince(l.since))}` : ''}</span>
        ${l.text ? `<span class="poh-poradna-text">${escapeHtml(l.text)}</span>` : ''}
        <span class="poh-poradna-src">Zdroj: <a href="${escapeHtml(l.source?.url ?? '#')}" target="_blank" rel="noopener">${escapeHtml(l.source?.name ?? 'zdroj')}</a>${
          l.verified_at ? `, ověřeno ${escapeHtml(formatCzDate(l.verified_at))}` : ''}.</span>
      </li>`).join('')}
    </ul>
    ${note?.text ? `<p class="poh-poradna-note">${escapeHtml(note.text)}${
      note.source?.url ? ` <a href="${escapeHtml(note.source.url)}" target="_blank" rel="noopener">${escapeHtml(note.source.name ?? 'zdroj')}</a>` : ''}</p>` : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────
// English · Українська
//
// Kdo nemluví česky, na téhle stránce hledá jednu věc: jaké číslo volat,
// co je „pohotovost“, kolik se platí a co s pojištěním. Fakta jsou tatáž
// jako v české verzi a nesou stejné zdroje; přeložený je jen text.
// ─────────────────────────────────────────────────────────────────────────

const INTL_LANGS = [['en', 'English'], ['uk', 'Українська']];

function renderIntl() {
  const host = document.getElementById('pohIntlBody');
  if (!host) return;
  const intl = state.data?.practical?.intl;
  const langs = INTL_LANGS.filter(([code]) => intl?.[code]);
  const wrap = host.closest('details');
  if (!langs.length) { if (wrap) wrap.hidden = true; return; }
  if (wrap) wrap.hidden = false;

  host.innerHTML = langs.map(([code, label]) => {
    const b = intl[code];
    return `
    <section class="poh-intl-block" lang="${code}" aria-label="${escapeHtml(label)}">
      <h3 class="poh-intl-h">${escapeHtml(b.title)}</h3>
      ${b.lead ? `<p class="poh-intl-lead">${escapeHtml(b.lead)}</p>` : ''}
      <dl class="poh-intl-list">${(b.items ?? []).map(it => `
        <dt>${escapeHtml(it.q)}</dt>
        <dd>${escapeHtml(it.a)}
          ${it.tel ? `<a class="poh-action poh-action-primary" href="tel:${escapeHtml(it.tel)}">${escapeHtml(it.tel_label ?? it.tel)}</a>` : ''}
          ${it.url ? `<a class="poh-action" href="${escapeHtml(it.url)}" target="_blank" rel="noopener">${escapeHtml(it.url_label ?? it.url)}</a>` : ''}
        </dd>`).join('')}
      </dl>
      ${(b.sources ?? []).length ? `<p class="poh-intl-src">${escapeHtml(b.sources_label ?? 'Sources')}: ${
        b.sources.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`).join(', ')}${
        b.verified_at ? ` (${escapeHtml(b.verified_label ?? 'verified')} ${escapeHtml(b.verified_at)})` : ''}.</p>` : ''}
    </section>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────
// Offline
//
// Kdo hledá pohotovost, má často jednu čárku signálu. Service worker
// (sw-pohotovosti.js) drží poslední stažená data a skripty téhle stránky,
// takže vyhledávání podle obce funguje i bez připojení — a stránka to
// poctivě řekne, včetně toho, jak stará data ukazuje.
// ─────────────────────────────────────────────────────────────────────────

function registerOffline() {
  if (typeof navigator === 'undefined') return;
  if ('serviceWorker' in navigator) {
    try {
      // Cesty odvozené od umístění modulu, aby fungovaly i mimo kořen domény.
      const sw = new URL('../sw-pohotovosti.js', import.meta.url).pathname;
      const scope = new URL('../pohotovost', import.meta.url).pathname;
      navigator.serviceWorker.register(sw, { scope }).catch(() => {});
    } catch {
      // Bez service workeru stránka funguje dál, jen ne offline.
    }
  }

  const banner = document.getElementById('pohOffline');
  if (!banner) return;
  const sync = () => {
    const offline = navigator.onLine === false;
    banner.hidden = !offline;
    if (offline) {
      const gen = generatedDay();
      banner.innerHTML = `<strong>Jste offline.</strong> Ukazujeme naposledy stažená data${
        gen ? ` (k ${escapeHtml(formatCzDate(gen))})` : ''}. Volání na <a href="tel:155">155</a> funguje i bez dat.`;
    }
  };
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
}

// ─────────────────────────────────────────────────────────────────────────
// Online pohotovosti — celostátní přehled
//
// Sekce se ukazuje všem, ne jen návštěvníkovi z kraje, který službu má.
// Že ji dva kraje provozují a dvanáct ne, je zjištění o systému; kdyby ji
// stránka schovala každému, kdo bydlí jinde, nikdo by se o ní nedozvěděl.
// ─────────────────────────────────────────────────────────────────────────

function serviceCardHtml(sv, { mine = false } = {}) {
  const facts = [
    sv.availability === 'nonstop' ? 'nepřetržitě' : sv.availability,
    sv.response_minutes ? `lékař do ${sv.response_minutes} minut` : null,
    (sv.channels ?? []).length ? (sv.channels ?? []).join(' nebo ') : null,
    sv.doctor ? `ošetří ${sv.doctor}` : null,
  ].filter(Boolean);

  return `
    <article class="poh-online-card${mine ? ' poh-online-card-mine' : ''}">
      ${mine ? '<span class="poh-online-badge">Ve vašem kraji</span>' : ''}
      <h3 class="poh-online-name">${escapeHtml(sv.name)}</h3>
      <p class="poh-online-kraj">${escapeHtml(sv.kraj)}${sv.since ? ` · od ${escapeHtml(formatSince(sv.since))}` : ''}</p>
      <ul class="poh-online-facts">${facts.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      <p class="poh-online-free"><strong>Zdarma pro</strong> ${escapeHtml(sv.free_for)}.</p>
      <p class="poh-online-good"><strong>Vhodné na</strong> ${escapeHtml(sv.good_for)}.</p>
      ${sv.not_for ? `<p class="poh-online-not">Není pro ${escapeHtml(sv.not_for)}.</p>` : ''}
      ${(sv.can_issue ?? []).length ? `<p class="poh-online-issue">Lékař může vystavit: ${escapeHtml((sv.can_issue ?? []).join(', '))}.</p>` : ''}
      <a class="poh-action poh-action-primary" href="${escapeHtml(sv.url)}" target="_blank" rel="noopener">Otevřít ${escapeHtml(sv.name)}</a>
      <p class="poh-online-src">
        Zdroj: <a href="${escapeHtml(sv.source?.url ?? '#')}" target="_blank" rel="noopener">${escapeHtml(sv.source?.name ?? 'zdroj')}</a>${
          sv.verified_at ? `, ověřeno ${escapeHtml(formatCzDate(sv.verified_at))}` : ''}.
      </p>
    </article>`;
}

/** „2024“ nebo „2025-03-01“ → čitelné datum, bez hádání dne u pouhého roku. */
function formatSince(since) {
  const s = String(since ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? formatCzDate(s) : s;
}

function renderOnlineSection() {
  const host = document.getElementById('pohOnline');
  const online = state.data?.online;
  if (!host || !online) return;

  const mineCode = currentKrajCode();
  const services = [...(online.services ?? [])].sort((a, b) => {
    if (a.kraj_code === mineCode) return -1;
    if (b.kraj_code === mineCode) return 1;
    return String(a.kraj).localeCompare(String(b.kraj), 'cs');
  });

  const parts = [];

  if (mineCode && !services.some(sv => sv.kraj_code === mineCode)) {
    const kraj = (state.data.regions ?? []).find(r => r.kraj_code === mineCode)?.kraj;
    const planned = (online.not_available?.planned ?? []).find(p => p.kraj_code === mineCode);
    parts.push(`
      <p class="poh-online-mine-none">
        <strong>${escapeHtml(kraj ?? 'Váš kraj')}</strong> online pohotovost neprovozuje.${
          planned ? ` ${escapeHtml(planned.note)}` : ''}
        Služby níže jsou zdarma jen pro obyvatele svých krajů — jinému je mohou odmítnout nebo zpoplatnit.
      </p>`);
  }

  parts.push(`<div class="poh-online-grid">${
    services.map(sv => serviceCardHtml(sv, { mine: sv.kraj_code === mineCode })).join('')}</div>`);

  const na = online.not_available;
  if (na) {
    const planned = (na.planned ?? []).map(p => `<li><strong>${escapeHtml(p.kraj)}</strong> — ${escapeHtml(p.note)}</li>`).join('');
    parts.push(`
      <div class="poh-online-rest">
        <h3 class="poh-h3">Zbytek republiky</h3>
        ${planned ? `<ul class="poh-online-planned">${planned}</ul>` : ''}
        ${na.declined_note ? `<p class="poh-online-declined">${escapeHtml(na.declined_note)}</p>` : ''}
        <p class="poh-online-src">
          Zdroj: <a href="${escapeHtml(na.source?.url ?? '#')}" target="_blank" rel="noopener">${escapeHtml(na.source?.name ?? 'zdroj')}</a>${
            na.verified_at ? `, ověřeno ${escapeHtml(formatCzDate(na.verified_at))}` : ''}.
        </p>
      </div>`);
  }

  const lines = online.infolines ?? [];
  if (lines.length) {
    parts.push(`
      <div class="poh-online-rest">
        <h3 class="poh-h3">Krajské informační linky o pohotovostech</h3>
        <ul class="poh-infoline-list">${lines.map(l => `
          <li>
            <strong>${escapeHtml(l.kraj)}</strong> —
            <a href="tel:${escapeHtml(l.phone)}">${escapeHtml(formatPhone(l.phone))}</a>.
            ${escapeHtml(l.description ?? '')}
          </li>`).join('')}</ul>
      </div>`);
  }

  host.innerHTML = parts.join('');
}

// ─────────────────────────────────────────────────────────────────────────
// Dojezdová analýza — kam síť nedosáhne
//
// Počty pracovišť jsou statistika; tady se měří dostupnost: vzdálenost každé
// obce k nejbližší pohotovosti, která má v referenční čas podle zveřejněné
// doby otevřeno. Souhrn jede z hlavního souboru; mapa všech ~6 250 obcí se
// (i s gazetteerem) dotahuje líně, až když čtenář sekci skutečně otevře —
// dohromady je to přes 600 kB, které nesmí zdržovat člověka, co jen hledá,
// kam teď zajít.
// ─────────────────────────────────────────────────────────────────────────

const DOJEZD_BANDS = [
  { max: 10, label: 'do 10 km', color: '#0f9d58' },
  { max: 20, label: '10–20 km', color: '#e8a13c' },
  { max: 30, label: '20–30 km', color: '#d95f02' },
  { max: Infinity, label: 'přes 30 km', color: '#b3261e' },
];

// Ve 3. pádě — vypisuje se za „k nejbližší otevřené …“.
const DOJEZD_CATEGORY_LABEL = {
  lps_dospeli: 'pohotovosti pro dospělé',
  lps_deti: 'pohotovosti pro děti a dorost',
};

const dojezdState = { scenario: 'streda_20', category: 'lps_dospeli', chart: null, perObec: null };

async function ensureDojezdy() {
  if (dojezdState.perObec) return dojezdState.perObec;
  dojezdState.perObec = await loadJson('data/dojezdy.json');
  return dojezdState.perObec;
}

function dojezdIndex(dj) {
  return dj.scenarios.findIndex(s => s.id === dojezdState.scenario) * dj.categories.length
    + dj.categories.indexOf(dojezdState.category);
}

function renderDojezdSection() {
  const dj = state.data?.dojezdy;
  const host = document.getElementById('pohDojezdLead');
  if (!dj || !host) return;

  // Titulní zjištění se počítá z dat — kdyby ho někdo napsal do HTML natvrdo,
  // příští refresh by z něj udělal lež.
  const st = dj.national.streda_20;
  const so = dj.national.sobota_12;
  const noc = dj.national.sobota_23;
  const obciTotal = dj.okresy.reduce((n, o) => n + o.obci, 0);
  const pct = (n) => `${Math.round((n / obciTotal) * 100)} %`;
  host.innerHTML = `
    Vyhláška předepisuje pohotovostní službu ve všední den v okně 16:00–22:00 — a přesto je ve
    <strong>středu ve 20:00</strong> dál než 20&nbsp;km od nejbližší otevřené pohotovosti pro dospělé
    <strong>${st.lps_dospeli.over20.toLocaleString('cs-CZ')} obcí</strong> (${pct(st.lps_dospeli.over20)});
    u pohotovosti pro děti je to <strong>${st.lps_deti.over20.toLocaleString('cs-CZ')} obcí</strong>
    (${pct(st.lps_deti.over20)}). Nejhustší je síť v sobotu v poledne
    (medián ${String(so.lps_dospeli.median).replace('.', ',')}&nbsp;km), v noci slouží jen
    <strong>${noc.lps_dospeli.open}</strong> nepřetržitých pracovišť pro dospělé
    a <strong>${noc.lps_deti.open}</strong> pro děti v celé republice.`;

  const statRow = document.getElementById('pohDojezdStats');
  if (statRow) {
    const stats = [
      [`${st.lps_dospeli.open}`, 'pohotovostí otevřeno ve středu ve 20:00', 'Pro dospělé, v okně, které vyhláška předepisuje.'],
      [pct(st.lps_deti.over20), 'obcí je večer dál než 20 km od dětské', `${st.lps_deti.over20.toLocaleString('cs-CZ')} obcí z ${obciTotal.toLocaleString('cs-CZ')}.`],
      [`${noc.lps_dospeli.open}`, 'pohotovostí slouží v sobotu ve 23:00', 'Noc je územím urgentních příjmů — vyhláška ji nepředepisuje.'],
      [`${String(dj.national[dojezdState.scenario][dojezdState.category].max).replace('.', ',')} km`, 'má to nejhůř položená obec', 'Ve zvoleném čase, vzdušnou čarou.'],
    ];
    statRow.innerHTML = stats.map(([value, label, note]) => `
      <div class="poh-stat">
        <span class="poh-stat-value">${escapeHtml(String(value))}</span>
        <span class="poh-stat-label">${escapeHtml(label)}</span>
        <span class="poh-stat-note">${escapeHtml(note)}</span>
      </div>`).join('');
  }

  const scenarioSel = document.getElementById('pohDojezdScenario');
  if (scenarioSel && !scenarioSel.options.length) {
    scenarioSel.innerHTML = dj.scenarios.map(sc =>
      `<option value="${escapeHtml(sc.id)}">${escapeHtml(sc.label)}</option>`).join('');
    scenarioSel.value = dojezdState.scenario;
    scenarioSel.addEventListener('change', () => {
      dojezdState.scenario = scenarioSel.value;
      renderDojezdSection();
      renderDojezdMap();
    });
    const catSel = document.getElementById('pohDojezdCategory');
    catSel?.addEventListener('change', () => {
      dojezdState.category = catSel.value;
      renderDojezdSection();
      renderDojezdMap();
    });
  }

  renderDojezdTable(dj);

  const method = document.getElementById('pohDojezdMethod');
  if (method) {
    method.textContent = `${dj.poznamka} Referenční časy: ${dj.scenarios.map(s => s.label).join(', ')} — konkrétní datum nehraje roli, týdenní rozpisy na něm nezávisí.`;
  }
}

function renderDojezdTable(dj) {
  const cell = `${dojezdState.scenario}|${dojezdState.category}`;
  const rows = dj.okresy
    .map(o => ({ okres: o.okres, obci: o.obci, ...o.stats[cell] }))
    .filter(r => r.median != null)
    .sort((a, b) => b.median - a.median);

  const fmt = (r) => `
    <tr>
      <th scope="row">${escapeHtml(r.okres)}</th>
      <td class="poh-num">${String(r.median).replace('.', ',')} km</td>
      <td class="poh-num">${String(r.max).replace('.', ',')} km</td>
      <td class="poh-num">${r.over20} z ${r.obci}</td>
    </tr>`;
  const top = document.getElementById('pohDojezdRows');
  if (top) top.innerHTML = rows.slice(0, 12).map(fmt).join('');
  const all = document.getElementById('pohDojezdRowsAll');
  if (all) all.innerHTML = rows.map(fmt).join('');
}

async function renderDojezdMap() {
  const host = document.getElementById('pohDojezdMap');
  const dj = state.data?.dojezdy;
  if (!host || !dj || typeof echarts === 'undefined') return;

  let perObec;
  let gazetteer;
  try {
    [perObec, gazetteer] = await Promise.all([ensureDojezdy(), ensureObce()]);
    const geojson = await ensureRegions();
    echarts.registerMap('cz-regions-poh', geojson);
  } catch {
    return; // sekce funguje i bez mapy — tabulka a čísla zůstávají
  }

  if (!dojezdState.chart) {
    dojezdState.chart = echarts.init(host);
    window.addEventListener('resize', () => dojezdState.chart?.resize());
  }

  // Join po jménu + okresu: dojezdy.json nenosí souřadnice (jsou už
  // v gazetteeru, který stránka stejně používá pro vyhledávání).
  const coord = new Map(gazetteer.map(([name, lat, lon, okres]) => [`${name}|${okres}`, [lon, lat]]));
  const idx = dojezdIndex(perObec);
  const bandData = DOJEZD_BANDS.map(() => []);
  for (const [name, okres, dists] of perObec.obce) {
    const v = dists[idx];
    if (v == null) continue;
    const km = v / 10;
    const pos = coord.get(`${name}|${okres}`);
    if (!pos) continue;
    const band = DOJEZD_BANDS.findIndex(b => km <= b.max);
    bandData[band].push({ name, value: [...pos, km], obec: name, okres });
  }

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  dojezdState.chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (p) => `<strong>${escapeHtml(p.data?.obec ?? '')}</strong> (${escapeHtml(p.data?.okres ?? '')})<br>${String(p.data?.value?.[2] ?? '').replace('.', ',')} km k nejbližší otevřené`,
    },
    geo: {
      map: 'cz-regions-poh',
      roam: false,
      silent: true,
      itemStyle: {
        areaColor: dark ? '#22262b' : '#f3f1ec',
        borderColor: dark ? '#555' : '#bbb',
      },
    },
    series: DOJEZD_BANDS.map((band, i) => ({
      name: band.label,
      type: 'scatter',
      coordinateSystem: 'geo',
      geoIndex: 0,
      symbolSize: 3.2,
      itemStyle: { color: band.color, opacity: 0.75 },
      data: bandData[i],
    })),
  }, true);

  const legend = document.getElementById('pohDojezdLegend');
  if (legend) {
    legend.innerHTML = 'Každá tečka je obec: '
      + DOJEZD_BANDS.map((b, i) =>
        `<span class="poh-dojezd-band"><span class="poh-chip-dot" style="background:${b.color}" aria-hidden="true"></span>${escapeHtml(b.label)} (${bandData[i].length.toLocaleString('cs-CZ')})</span>`).join(' · ')
      + ` — vzdálenost k nejbližší otevřené ${escapeHtml(DOJEZD_CATEGORY_LABEL[dojezdState.category])}.`;
  }
}

/** Mapa (620 kB dat) se načte, až když se sekce blíží do viewportu. */
function wireDojezdLazyLoad() {
  const section = document.querySelector('.poh-dojezd');
  if (!section || !state.data?.dojezdy) return;
  if (typeof IntersectionObserver === 'undefined') {
    renderDojezdMap();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      io.disconnect();
      renderDojezdMap();
    }
  }, { rootMargin: '400px' });
  io.observe(section);
}

/**
 * Rozcestník na generované okresní stránky. Odkazy se skládají ze stejného
 * slugu jako builder (okresSlug v enginu) — jediná definice tvaru URL.
 */
function renderOkresIndex() {
  const host = document.getElementById('pohOkresLinks');
  if (!host) return;
  const okresy = [...new Set((state.data?.places ?? []).map(p => p.okres).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'cs'));
  host.innerHTML = okresy.map(o =>
    `<li><a href="pohotovost-${escapeHtml(okresSlug(o))}.html">${escapeHtml(o)}</a></li>`).join('');
}

// ─────────────────────────────────────────────────────────────────────────
// Kontext a metodika
// ─────────────────────────────────────────────────────────────────────────

function renderContext() {
  const c = state.data?.coverage;
  if (!c) return;

  const heroStats = document.getElementById('pohHeroStats');
  if (heroStats) {
    const poh = c.pohotovosti_total ?? c.places_total;
    heroStats.innerHTML = `Sledujeme <strong>${poh}</strong> pohotovostí ve všech 14 krajích`
      + `${c.ambulance_denni ? ` a <strong>${c.ambulance_denni}</strong> denních nemocničních ambulancí` : ''}`
      + ` — u <strong>${c.places_with_hours}</strong> z nich známe provozní dobu.`;
  }

  const statRow = document.getElementById('pohContextStats');
  if (statRow) {
    const assessed = Object.values(c.by_category).reduce((n, v) => n + v.assessed, 0);
    const meets = Object.values(c.by_category).reduce((n, v) => n + v.meets_minimum, 0);
    const stats = [
      [c.pohotovosti_total ?? c.places_total, 'pohotovostí v celé ČR', 'Lékařské pro dospělé i děti, zubní a lékárenské dohromady.'],
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

  const ambCount = document.getElementById('pohAmbCount');
  if (ambCount) ambCount.textContent = String(c.ambulance_denni ?? 0);

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
  renderTriage();
  renderAdviceLines();
  renderIntl();
  renderBeforeYouGo();
  renderOnlineSection();
  renderDojezdSection();
  wireDojezdLazyLoad();
  renderOkresIndex();
  wireForm();
  wireGeolocation();
  wireShare();
  registerOffline();
  setOrigin(null);
}

init();
