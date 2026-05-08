// Pokročilé vizualizace pro audience „policy" v stránce jak-funguje.html (M-EXPL-4):
//   1. Vizuální Gantt timeline pro proces (rozšíření číslované osy)
//   2. DRG kalkulátor — interaktivní simulace vlivu komplikací na úhradu

import { escapeHtml } from './page-shared.js';

// ===== Gantt timeline =====

/**
 * Postaví Gantt-style timeline z process.steps, kde každý krok má from/to.
 * Pokud krok nemá `to`, použije se začátek dalšího kroku jako konec.
 */
export function buildGanttModel(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  // Doplnit chybějící to z následujícího from
  const sorted = [...steps].map((s, i) => {
    const fromDate = parseDate(s.from);
    const explicitTo = s.to ? parseDate(s.to) : null;
    return { idx: i, phase: s.phase, from: fromDate, to: explicitTo };
  }).filter(s => s.from);

  // Žádný step neměl validní `from` → graceful skip render
  if (sorted.length === 0) return null;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (!sorted[i].to) sorted[i].to = sorted[i + 1].from;
  }
  // Poslední krok bez `to` → 14 dnů default
  const last = sorted[sorted.length - 1];
  if (last && !last.to) last.to = new Date(last.from.getTime() + 14 * 86400000);

  const minDate = sorted[0].from;
  const maxDate = sorted.reduce((m, s) => s.to > m ? s.to : m, sorted[0].to);
  const span = maxDate - minDate;
  if (span <= 0) return null;

  return {
    minDate, maxDate, span,
    items: sorted.map(s => ({
      phase: s.phase,
      from: s.from,
      to: s.to,
      leftPct: ((s.from - minDate) / span) * 100,
      widthPct: Math.max(((s.to - s.from) / span) * 100, 1),
    })),
  };
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function renderGantt(steps) {
  const model = buildGanttModel(steps);
  if (!model) return '';

  // Měsíční ticky
  const ticks = [];
  const tickDate = new Date(model.minDate.getFullYear(), model.minDate.getMonth(), 1);
  while (tickDate <= model.maxDate) {
    const pct = ((tickDate - model.minDate) / model.span) * 100;
    if (pct >= 0 && pct <= 100) {
      ticks.push({
        label: `${tickDate.toLocaleString('cs-CZ', { month: 'short' })} ${tickDate.getFullYear()}`,
        pct,
      });
    }
    tickDate.setMonth(tickDate.getMonth() + 1);
  }

  return `
    <div class="gantt-wrap">
      <div class="gantt-header">
        ${ticks.map(t => `<span class="gantt-tick" style="left: ${t.pct}%">${escapeHtml(t.label)}</span>`).join('')}
      </div>
      <div class="gantt-rows">
        ${model.items.map((item, i) => `
          <div class="gantt-row">
            <span class="gantt-label">${escapeHtml(item.phase)}</span>
            <span class="gantt-track">
              <span class="gantt-bar gantt-phase-${i % 4}" style="left: ${item.leftPct}%; width: ${item.widthPct}%"
                    title="${escapeHtml(item.phase)} (${fmtDate(item.from)} – ${fmtDate(item.to)})">
                <span class="gantt-bar-label">${fmtDate(item.from)}</span>
              </span>
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ===== DRG kalkulátor =====

/**
 * Zjednodušená kalkulace odhadu RW podle 3 vstupů:
 *   - MKN-10 prefix (ovlivňuje base RW podle MDC kategorie)
 *   - závažnost (none / cc / mcc)
 *   - kraj (ovlivňuje base rate, default Praha)
 *
 * Hodnoty jsou ilustrativní — pro reálnou kalkulaci je nutný plný CZ-DRG grouper.
 */
const MDC_BASE_RW = {
  // Příklady reprezentativních DRG bází podle MDC; hodnoty zaokrouhlené průměry
  'I21': 1.8, 'I22': 1.8, 'I20': 1.0,        // AIM, angina (MDC04)
  'I60': 2.5, 'I61': 2.7, 'I62': 2.5, 'I63': 2.0, 'I64': 1.6,  // CMP (MDC01)
  'J18': 1.2, 'J44': 0.9, 'J45': 0.6,        // pneumonie, COPD, astma (MDC04 dýchací)
  'C18': 3.0, 'C19': 3.0, 'C20': 3.2, 'C50': 2.4,  // onko (MDC09/10)
  'M16': 2.2, 'M17': 2.0,                     // kloubní náhrady (MDC08)
  'O80': 0.4, 'O82': 0.7,                     // porod (MDC14)
  'K80': 0.8, 'K35': 0.7,                     // žlučník, apendix (MDC06)
  'E10': 0.7, 'E11': 0.7,                     // diabetes (MDC10)
};

const SEVERITY_MULTIPLIER = {
  none: 1.0,
  cc: 1.6,    // Complications and Comorbidities
  mcc: 2.8,   // Major CC
};

const REGION_BASE_RATE = {
  // Ilustrativní base rate v Kč podle kraje (1.7× rozpětí)
  CZ010: 47000, CZ020: 42000, CZ031: 39000, CZ032: 38000,
  CZ041: 35000, CZ042: 34000, CZ051: 36000, CZ052: 38000,
  CZ053: 37000, CZ063: 36000, CZ064: 41000, CZ071: 40000,
  CZ072: 38000, CZ080: 39000,
};

const REGION_NAMES = {
  CZ010: 'Praha', CZ020: 'Středočeský', CZ031: 'Jihočeský', CZ032: 'Plzeňský',
  CZ041: 'Karlovarský', CZ042: 'Ústecký', CZ051: 'Liberecký', CZ052: 'Královéhradecký',
  CZ053: 'Pardubický', CZ063: 'Vysočina', CZ064: 'Jihomoravský', CZ071: 'Olomoucký',
  CZ072: 'Zlínský', CZ080: 'Moravskoslezský',
};

/**
 * @param {{ mkn10: string, severity: 'none'|'cc'|'mcc', region: string }} input
 */
export function calculateDrg({ mkn10, severity, region }) {
  if (!mkn10) return null;
  const prefix = String(mkn10).toUpperCase().slice(0, 3);
  const baseRw = MDC_BASE_RW[prefix];
  if (!baseRw) {
    return {
      ok: false,
      reason: `Pro MKN-10 prefix ${prefix} nemáme v ukázkové tabulce váhu. (Plný grouper by ho zařadil přes MDC.)`,
    };
  }
  const sevMult = SEVERITY_MULTIPLIER[severity ?? 'none'] ?? 1;
  const finalRw = baseRw * sevMult;
  const rate = REGION_BASE_RATE[region] ?? REGION_BASE_RATE.CZ010;
  const cost = Math.round(finalRw * rate);
  return {
    ok: true,
    prefix,
    baseRw,
    severity: severity ?? 'none',
    sevMultiplier: sevMult,
    finalRw: Math.round(finalRw * 100) / 100,
    region,
    regionName: REGION_NAMES[region] ?? region,
    baseRate: rate,
    cost,
  };
}

export function renderDrgCalculator() {
  const exampleCodes = ['I21', 'I63', 'J18', 'C18', 'M16', 'O80', 'K80', 'E11'];
  return `
    <form class="drg-calc" id="drgCalcForm" autocomplete="off">
      <div class="drg-row">
        <label for="drgMkn10">Hlavní diagnóza (MKN-10)</label>
        <input type="text" id="drgMkn10" name="mkn10" placeholder="např. I21" maxlength="6" required>
        <small class="drg-hint">Zkus některý: ${exampleCodes.map(c => `<button type="button" class="drg-suggest" data-code="${c}">${c}</button>`).join(' ')}</small>
      </div>
      <div class="drg-row">
        <label for="drgSeverity">Komplikace / komorbidity</label>
        <select id="drgSeverity" name="severity">
          <option value="none">Bez komplikací</option>
          <option value="cc">CC — komorbidity</option>
          <option value="mcc">MCC — vážné komplikace</option>
        </select>
      </div>
      <div class="drg-row">
        <label for="drgRegion">Kraj nemocnice</label>
        <select id="drgRegion" name="region">
          ${Object.entries(REGION_NAMES).map(([code, name]) =>
            `<option value="${code}"${code === 'CZ010' ? ' selected' : ''}>${name}</option>`
          ).join('')}
        </select>
      </div>
      <button type="submit" class="btn-primary">Spočítat odhad</button>
    </form>
    <div class="drg-result" id="drgResult"></div>
    <p class="drg-disclaimer">
      <strong>Ilustrativní kalkulace.</strong> Reálná úhrada vychází z plného CZ-DRG grouperu, který bere v úvahu desítky parametrů. Tato simulace ukazuje pouze řádový dopad komplikací a regionálního rozpětí základní sazby úhrady (~1,7×).
    </p>
  `;
}

export function wireDrgCalculator() {
  const form = document.getElementById('drgCalcForm');
  if (!form) return;
  const result = document.getElementById('drgResult');

  // Quick-suggest buttons
  form.querySelectorAll('.drg-suggest').forEach(btn => {
    btn.addEventListener('click', () => {
      form.querySelector('#drgMkn10').value = btn.dataset.code;
      form.requestSubmit();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const out = calculateDrg({
      mkn10: data.get('mkn10'),
      severity: data.get('severity'),
      region: data.get('region'),
    });
    if (!out) { result.innerHTML = ''; return; }
    if (!out.ok) {
      result.innerHTML = `<p class="drg-warn">${escapeHtml(out.reason)}</p>`;
      return;
    }
    const noCompCost = Math.round(out.baseRw * out.baseRate);
    const diff = out.cost - noCompCost;
    const diffPct = noCompCost > 0 ? Math.round((diff / noCompCost) * 100) : 0;
    result.innerHTML = `
      <h4>Odhad úhrady</h4>
      <div class="drg-result-grid">
        <div><dt>MKN-10 prefix</dt><dd>${escapeHtml(out.prefix)}</dd></div>
        <div><dt>Base RW (bez komplikací)</dt><dd>${out.baseRw.toFixed(2)}</dd></div>
        <div><dt>Násobitel závažnosti</dt><dd>×${out.sevMultiplier.toFixed(2)} (${escapeHtml(severityLabel(out.severity))})</dd></div>
        <div><dt>Finální RW</dt><dd><strong>${out.finalRw.toFixed(2)}</strong></dd></div>
        <div><dt>Základní sazba úhrady kraje</dt><dd>${out.baseRate.toLocaleString('cs-CZ')} Kč (${escapeHtml(out.regionName)})</dd></div>
        <div class="drg-final"><dt>Odhad úhrady</dt><dd><strong>${out.cost.toLocaleString('cs-CZ')} Kč</strong></dd></div>
      </div>
      ${out.severity !== 'none' ? `
        <p class="drg-comparison">
          Stejný případ <strong>bez komplikací</strong> by stál cca <strong>${noCompCost.toLocaleString('cs-CZ')} Kč</strong>
          — komplikace přidávají <strong>${diff.toLocaleString('cs-CZ')} Kč (+${diffPct} %)</strong>.
        </p>
      ` : ''}
    `;
  });
}

function severityLabel(s) {
  return ({ none: 'bez komplikací', cc: 'CC komorbidity', mcc: 'MCC vážné komplikace' })[s] ?? s;
}

// =====================================================================
// Doplňkové grafické výstupy pro vybrané explainery (M-EXPL-VIS-1).
// Cíl: tam, kde explainer pracuje s konkrétními čísly, doplnit jednoduchý
// vizuál, který data ilustruje (sloupcový graf, srovnávací tabulka, timeline).
// =====================================================================

const EXPLAINER_VISUALS = {
  deficit_zdravotniho_pojisteni: renderDeficitChart,
  dohodovaci_rizeni: renderDohodRizeniTimeline,
  dansko_stroke_care: renderDanskoCzechCompare,
  spoluucast_pacienta: renderSpoluucastBars,
  pohotovosti_2026: renderPohotovostBeforeAfter,
  kompetence_nelekarske_2026: renderKompetenceTable,
  sit_nemocnic: renderSitNemocnicBars,
};

export function renderExplainerVisuals(e) {
  const fn = EXPLAINER_VISUALS[e.id];
  if (!fn) return '';
  try {
    return fn(e);
  } catch (err) {
    console.warn('renderExplainerVisuals failed for', e.id, err);
    return '';
  }
}

function renderDeficitChart() {
  // Vývoj rezerv pojišťoven (mld. Kč) vs. souhrnný deficit (mld. Kč)
  const data = [
    { year: '2023', rezervy: 51.4, deficit: -2.1 },
    { year: '2024', rezervy: 47.7, deficit: -3.7 },
    { year: '2025e', rezervy: 45.2, deficit: -2.5 },
    { year: '2026p', rezervy: 41.7, deficit: -12.2 },
    { year: '2027p', rezervy: 30.5, deficit: -11.2 },
    { year: '2028p', rezervy: 18.0, deficit: -12.5 },
  ];
  const max = 55;
  return `
    <section class="detail-section">
      <h3>Vývoj rezerv pojišťoven a souhrnného deficitu</h3>
      <p class="section-note">Modelace projekce při zachování stávající mechaniky (sazby, valorizace, struktura péče). Zdroje: rozpočty pojišťoven 2026, MZ ČR, SZP. Hodnoty 2025–2028 jsou odhadem / projekcí.</p>
      <div class="ex-bars" role="img" aria-label="Sloupcový graf vývoje rezerv pojišťoven a deficitu">
        ${data.map(d => `
          <div class="ex-bar-row">
            <span class="ex-bar-label">${d.year}</span>
            <span class="ex-bar-track">
              <span class="ex-bar-fill ex-bar-fill-pos" style="width: ${(d.rezervy / max) * 100}%">
                <span class="ex-bar-value">${d.rezervy.toFixed(1)} mld. Kč</span>
              </span>
            </span>
            <span class="ex-bar-side ex-bar-side-neg">deficit ${d.deficit.toFixed(1)} mld.</span>
          </div>
        `).join('')}
      </div>
      <p class="ex-bar-foot">Při tempu projekce 2026–2028 vyčerpání rezerv mezi koncem 2028 a polovinou 2030 — bez systémového opatření (sazba, valorizace, struktura péče).</p>
    </section>
  `;
}

function renderDohodRizeniTimeline() {
  const milestones = [
    { month: 'leden', what: 'Zahájení dohodovacího řízení (DŘ)', kind: 'start' },
    { month: 'únor–březen', what: 'Analytická komise — sběr dat za uplynulé období', kind: 'mid' },
    { month: 'duben', what: 'Konec přípravné fáze, zahájení vlastního DŘ', kind: 'mid' },
    { month: 'květen–červen', what: 'Vyjednávání mezi pojišťovnami a poskytovateli', kind: 'mid' },
    { month: '30. září', what: 'Termín dohody (zákonný)', kind: 'deadline' },
    { month: 'říjen', what: 'V případě nedohody — návrh úhradové vyhlášky MZ ČR', kind: 'fallback' },
    { month: '31. října', what: 'Poslední termín pro vydání úhradové vyhlášky', kind: 'deadline' },
    { month: 'listopad–prosinec', what: 'Smlouvy mezi pojišťovnami a poskytovateli', kind: 'end' },
    { month: '1. ledna', what: 'Účinnost úhrad pro nový rok', kind: 'start' },
  ];
  return `
    <section class="detail-section">
      <h3>Roční cyklus dohodovacího řízení</h3>
      <p class="section-note">Zákonný harmonogram §17 zákona 48/1997 Sb. Dohoda v roce 2026 byla uzavřena pouze ve 3 z 15 segmentů — zbytek řešen úhradovou vyhláškou.</p>
      <ol class="ex-cycle">
        ${milestones.map(m => `
          <li class="ex-cycle-step ex-cycle-${m.kind}">
            <span class="ex-cycle-when">${m.month}</span>
            <span class="ex-cycle-what">${m.what}</span>
          </li>
        `).join('')}
      </ol>
    </section>
  `;
}

function renderDanskoCzechCompare() {
  const rows = [
    { metric: '30denní úmrtnost po CMP', cz: '11,2 %', dk: '~5,5 %', better: 'dk' },
    { metric: 'Počet stroke center', cz: '45 (32 IC + 13 KCC)', dk: '22', better: '—' },
    { metric: 'Door-to-needle (cíl)', cz: 'bez národního cíle', dk: '≤ 25 min', better: 'dk' },
    { metric: 'Národní stroke registr', cz: 'IKTA-registr (od 2018)', dk: 'DSR (od 2003)', better: 'dk' },
    { metric: 'Centralizace reformy', cz: 'fáze 2010–2025 (postupná)', dk: 'jednorázová 2007', better: '—' },
    { metric: 'Bonus-malus na čas/kvalitu', cz: 'není v úhradě', dk: 'částečně přes rámcové smlouvy', better: 'dk' },
  ];
  return `
    <section class="detail-section">
      <h3>Srovnání ČR vs. Dánsko — péče o cévní mozkovou příhodu</h3>
      <table class="ex-compare">
        <thead>
          <tr><th>Metrika</th><th>ČR</th><th>Dánsko</th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.metric}</td>
              <td class="${r.better === 'cz' ? 'ex-cell-good' : ''}">${r.cz}</td>
              <td class="${r.better === 'dk' ? 'ex-cell-good' : ''}">${r.dk}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderSpoluucastBars() {
  const data = [
    { country: 'Švýcarsko', value: 26 },
    { country: 'Řecko', value: 33 },
    { country: 'OECD průměr', value: 20, highlight: 'mid' },
    { country: 'EU průměr', value: 18 },
    { country: 'Česká republika', value: 15, highlight: 'cz' },
    { country: 'Francie', value: 9 },
    { country: 'Lucembursko', value: 8 },
  ];
  const max = 35;
  return `
    <section class="detail-section">
      <h3>Podíl přímých plateb pacientů (out-of-pocket) na celkových zdravotních výdajích</h3>
      <p class="section-note">% celkových zdravotních výdajů, OECD Health Statistics 2023. Vyšší podíl = vyšší zatížení pacienta.</p>
      <div class="ex-bars" role="img" aria-label="Sloupcový graf out-of-pocket podílu, ČR vs. OECD">
        ${data.map(d => `
          <div class="ex-bar-row">
            <span class="ex-bar-label">${d.country}</span>
            <span class="ex-bar-track">
              <span class="ex-bar-fill ex-bar-fill-${d.highlight === 'cz' ? 'cz' : (d.highlight === 'mid' ? 'neutral' : 'pos')}" style="width: ${(d.value / max) * 100}%">
                <span class="ex-bar-value">${d.value} %</span>
              </span>
            </span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderPohotovostBeforeAfter() {
  const rows = [
    { metric: 'Odpovědnost za zajištění', before: 'Kraj', after: 'Zdravotní pojišťovna' },
    { metric: 'Právní základ', before: '§110 zák. 372/2011 Sb. (původní znění)', after: '§110 + zákon 48/1997 Sb.' },
    { metric: 'Financování', before: 'Krajský rozpočet + dotace MZ ČR', after: 'Z fondu zdravotní pojišťovny' },
    { metric: 'Kontraktace', before: 'Kraj smluvně s poskytovateli', after: 'ZP smluvně s poskytovateli, dohledem MZ' },
    { metric: 'Pokrytí stomatologie', before: 'Krajská povinnost (často nesplněná)', after: 'Samostatný režim DŘ ČSK↔ZP — v 2026 dohoda jen ve 4 krajích' },
    { metric: 'Sankce za nedostupnost', before: 'Slabě vymahatelné (ombudsman)', after: 'Sankce pojišťovny + dohled MZ' },
  ];
  return `
    <section class="detail-section">
      <h3>Reforma pohotovostí — před vs. po (od 1. 1. 2026)</h3>
      <p class="section-note">Zákon 290/2025 Sb. přesunul odpovědnost za pohotovostní službu z krajů na zdravotní pojišťovny.</p>
      <table class="ex-compare">
        <thead>
          <tr><th>Aspekt</th><th>Do 31. 12. 2025</th><th>Od 1. 1. 2026</th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr><td>${r.metric}</td><td>${r.before}</td><td>${r.after}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderKompetenceTable() {
  const rows = [
    {
      role: 'Lékárník — vakcinace',
      cz_old: 'Pouze lékař (ordinace, OOVL)',
      cz_new: 'Vakcinace v lékárně (chřipka, COVID, klíšť. encefalitida) — Q2/2026',
      precedent: 'UK: Community Pharmacy Service (2019); FR: décret 2019-357',
    },
    {
      role: 'Sestra — preskripce',
      cz_old: 'Bez vlastní preskripce',
      cz_new: 'Sesterská preskripce (zdravotnické prostředky, vybrané OTC) — Q3/2026',
      precedent: 'UK: Independent Nurse Prescribing (2006); IRL: 2007',
    },
    {
      role: 'Záchranář — samostatnost',
      cz_old: 'Pod indikací lékaře',
      cz_new: 'Rozšíření samostatných výkonů (nař. vlády 309/2024 Sb.) — účinné',
      precedent: 'UK Paramedic, US EMT-P, NL Ambulanceverpleegkundige',
    },
    {
      role: 'Fyzioterapeut',
      cz_old: 'Po indikaci lékaře',
      cz_new: 'Direct access (bez doporučení) — návrh Q4/2026',
      precedent: 'UK NHS Direct Access (2008); SE, FI, NL standardně',
    },
    {
      role: 'Klinický psycholog',
      cz_old: 'Po indikaci',
      cz_new: 'Rozšíření samostatné péče v rámci reformy psychiatrie',
      precedent: 'NL POH-GGZ, UK IAPT',
    },
  ];
  return `
    <section class="detail-section">
      <h3>Kompetence nelékařských povolání — co se mění v 2026</h3>
      <p class="section-note">Klíčový zákon: 96/2004 Sb. + vyhláška 55/2011 Sb. Navržené změny v rámci legislativní agendy 2026 (priorita ministra Vojtěcha).</p>
      <table class="ex-compare ex-compare-3col">
        <thead>
          <tr><th>Role</th><th>Stav před</th><th>Stav po (2026)</th><th>Mezinárodní precedens</th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr><td><strong>${r.role}</strong></td><td>${r.cz_old}</td><td>${r.cz_new}</td><td>${r.precedent}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderSitNemocnicBars() {
  const data = [
    { type: 'Krajské (zřizovatel kraj)', count: 65 },
    { type: 'Soukromé / akciové (AGEL, Penta, Mediterra…)', count: 38 },
    { type: 'Městské / obecní', count: 22 },
    { type: 'Fakultní (FN)', count: 11 },
    { type: 'Specializované státní (IKEM, ÚVN, NÚDZ, NÚH…)', count: 8 },
    { type: 'Vojenské (mimo ÚVN)', count: 3 },
    { type: 'Církevní / neziskové', count: 3 },
  ];
  const total = data.reduce((s, d) => s + d.count, 0);
  return `
    <section class="detail-section">
      <h3>Síť nemocnic v ČR podle zřizovatele</h3>
      <p class="section-note">Orientační rozdělení cca ${total} akutních lůžkových zařízení (2024–2025). Zdroj: NRPZS ÚZIS, výroční zprávy řetězců.</p>
      <div class="ex-bars" role="img" aria-label="Síť nemocnic podle zřizovatele">
        ${data.map(d => `
          <div class="ex-bar-row">
            <span class="ex-bar-label">${d.type}</span>
            <span class="ex-bar-track">
              <span class="ex-bar-fill ex-bar-fill-pos" style="width: ${(d.count / 70) * 100}%">
                <span class="ex-bar-value">${d.count}</span>
              </span>
            </span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}
