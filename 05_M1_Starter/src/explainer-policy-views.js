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
      <strong>Ilustrativní kalkulace.</strong> Reálná úhrada vychází z plného CZ-DRG grouperu, který bere v úvahu desítky parametrů. Tato simulace ukazuje pouze řádový dopad komplikací a regionálního rozpětí base rate (~1.7×).
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
        <div><dt>Base rate kraje</dt><dd>${out.baseRate.toLocaleString('cs-CZ')} Kč (${escapeHtml(out.regionName)})</dd></div>
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
