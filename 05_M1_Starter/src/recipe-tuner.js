/**
 * recipe-tuner.js — interaktivní prvek „Sestav školní jídelníček“.
 *
 * Načte data/skolni-strava.json (statický export z repozitáře jidelny — nový
 * spotřební koš dle vyhlášky 310/2025 Sb.) a vykreslí do elementu
 * [data-recipe-tuner] nástroj, ve kterém čtenář skládá jídelníček z více obědů.
 *
 * METODICKY: spotřební koš je MĚSÍČNÍ PRŮMĚR — neplatí na jednotlivý pokrm.
 * Proto se koš porovnává jako průměrná porce na oběd přes celý sestavený
 * jídelníček (cíl: 20 školních dní / měsíc) a navíc se kontrolují pravidla
 * pestrosti (ryby ≥ 2×, bezmasé ≥ 4×, sladké ≤ 2× za 20 dní).
 *
 * Data jsou ilustrativní (gramáže receptů pro věk 7–10 let), neslouží jako
 * oficiální jídelníček. Žije pouze na stránce článku, kde je element přítomen.
 */

const DATA_URL = 'data/skolni-strava.json';
const BASKET_GROUPS = ['maso', 'ryby', 'mleko', 'tuky', 'cukry', 'zelenina_ovoce', 'brambory', 'celozrnne', 'lusteniny'];

// Vyvážený ukázkový měsíc (20 obědů) — splňuje pravidla pestrosti.
const SAMPLE_MONTH = [
  'kure-zelenina-testoviny', 'losos-peceny', 'lusteniny-chili', 'veprove-gulas', 'spagety-bolognese-veg',
  'kure-paprika', 'treska-smetanova', 'cockovy-dhal', 'hovezi-stroganoff', 'bramborak-peceny',
  'kure-bylinkove', 'losos-peceny', 'zeleninove-rizoto', 'veprove-pecene', 'spagety-bolognese-veg',
  'kure-zelenina-testoviny', 'kralik-peceny', 'lusteniny-chili', 'hovezi-svickova', 'tvarohove-knedliky',
];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function fmt(n) {
  return Math.round(n).toLocaleString('cs-CZ');
}

/** Skupinové součty jednoho receptu (s globální záměnou bílé přílohy za celozrnnou). */
export function recipeGroupTotals(recipe, state = {}) {
  const t = {};
  for (const g of BASKET_GROUPS) t[g] = 0;
  t.ostatni = 0;
  for (const ing of recipe.ingredients) {
    let group = ing.group;
    if (state.swapWhole && ing.swappable) group = 'celozrnne';
    if (group in t) t[group] += ing.grams;
  }
  return t;
}

/** Průměrná porce na oběd přes celý jídelníček (koš je průměr, ne jeden pokrm). */
export function planAverages(plan, byId, state = {}) {
  const avg = {};
  for (const g of BASKET_GROUPS) avg[g] = 0;
  avg.ostatni = 0;
  if (!plan.length) return avg;
  for (const id of plan) {
    const r = byId[id];
    if (!r) continue;
    const t = recipeGroupTotals(r, state);
    for (const g of Object.keys(avg)) avg[g] += t[g];
  }
  for (const g of Object.keys(avg)) avg[g] = avg[g] / plan.length;
  return avg;
}

/** Počty pro pravidla pestrosti přes celý jídelníček. */
export function pestrostCounts(plan, byId) {
  const byCategory = {};
  let sweet = 0, withCelozrnne = 0, withLusteniny = 0;
  for (const id of plan) {
    const r = byId[id];
    if (!r) continue;
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    if (r.isSweet) sweet += 1;
    const t = recipeGroupTotals(r, {});
    if (t.celozrnne > 0) withCelozrnne += 1;
    if (t.lusteniny > 0) withLusteniny += 1;
  }
  return { byCategory, sweet, withCelozrnne, withLusteniny, total: plan.length };
}

export function initRecipeTuner(root, data) {
  const ages = data.ageCategories;
  const groupMeta = Object.fromEntries(data.foodGroups.map((g) => [g.key, g]));
  const byId = Object.fromEntries(data.recipes.map((r) => [r.id, r]));
  const targetDays = data.planTargetDays || 20;
  const rules = data.frequencyRules || [];

  const state = { age: '7-10', swapWhole: false, plan: [] };

  root.innerHTML = `
    <div class="rt">
      <div class="rt-controls">
        <label class="rt-field">
          <span class="rt-field-label">Věková kategorie</span>
          <select class="rt-select" data-rt="age">
            ${ages.map((a) => `<option value="${a.key}"${a.key === state.age ? ' selected' : ''}>${esc(a.label)}</option>`).join('')}
          </select>
        </label>
        <label class="rt-toggle rt-toggle-inline">
          <input type="checkbox" data-rt="swap">
          <span>Bílé přílohy → celozrnné (v celém jídelníčku)</span>
        </label>
      </div>

      <section class="rt-panel">
        <div class="rt-panel-head">
          <h4 class="rt-panel-h">Tvůj jídelníček <span class="rt-count" data-rt="count">0 / ${targetDays} obědů</span></h4>
          <div class="rt-quick">
            <button type="button" class="rt-reset" data-rt="sample">Naplnit ukázkový měsíc</button>
            <button type="button" class="rt-reset" data-rt="clear">Vyprázdnit</button>
          </div>
        </div>
        <div class="rt-plan" data-rt="plan"></div>
      </section>

      <div class="rt-score" data-rt="score" aria-live="polite"></div>

      <div class="rt-grid">
        <section class="rt-panel">
          <h4 class="rt-panel-h">Průměrná porce na oběd vs. spotřební koš</h4>
          <div class="rt-bars" data-rt="bars"></div>
          <p class="rt-foot">Spotřební koš je <strong>měsíční průměr</strong> — hodnotí se jídelníček, ne jeden pokrm. Pruh ukazuje průměr na oběd přes všechny obědy v jídelníčku; svislá ryska je cílová porce koše pro zvolený věk.</p>
        </section>

        <section class="rt-panel">
          <h4 class="rt-panel-h">Pravidla pestrosti (na ${targetDays} dní)</h4>
          <ul class="rt-principles" data-rt="pestrost"></ul>
        </section>
      </div>

      <section class="rt-panel rt-tune">
        <h4 class="rt-panel-h">Vyber obědy do jídelníčku</h4>
        <div class="rt-palette" data-rt="palette"></div>
      </section>

      <p class="rt-source">Data: nový spotřební koš a pravidla pestrosti dle vyhlášky 310/2025 Sb. (repozitář školních jídelen). Ilustrativní, neoficiální jídelníček.</p>
    </div>
  `;

  const $ = (sel) => root.querySelector(`[data-rt="${sel}"]`);

  function renderPalette() {
    const cats = {};
    for (const r of data.recipes) (cats[r.category] = cats[r.category] || []).push(r);
    let html = '';
    for (const [cat, list] of Object.entries(cats)) {
      html += `<div class="rt-pal-group"><span class="rt-pal-cat">${esc(data.categoryLabels[cat] || cat)}</span>`;
      html += list.map((r) => `<button type="button" class="rt-pal-item" data-add="${r.id}">${esc(r.name)} <span class="rt-pal-plus">+</span></button>`).join('');
      html += `</div>`;
    }
    $('palette').innerHTML = html;
    $('palette').querySelectorAll('[data-add]').forEach((b) => {
      b.addEventListener('click', () => { state.plan.push(b.dataset.add); render(); });
    });
  }

  function renderPlan() {
    const el = $('plan');
    if (!state.plan.length) {
      el.innerHTML = `<p class="rt-plan-empty">Zatím prázdno — přidej obědy z výběru níže, nebo klikni na „Naplnit ukázkový měsíc“.</p>`;
    } else {
      el.innerHTML = state.plan.map((id, i) => {
        const r = byId[id];
        return `<span class="rt-chip">${esc(r ? r.name : id)}<button type="button" class="rt-chip-x" data-del="${i}" aria-label="Odebrat">×</button></span>`;
      }).join('');
      el.querySelectorAll('[data-del]').forEach((b) => {
        b.addEventListener('click', () => { state.plan.splice(+b.dataset.del, 1); render(); });
      });
    }
    $('count').textContent = `${state.plan.length} / ${targetDays} obědů`;
  }

  function renderBars() {
    const targets = data.basketLunchTargets;
    const tol = data.tolerances;
    const avg = planAverages(state.plan, byId, state);
    let inRange = 0;
    let html = '';
    for (const g of BASKET_GROUPS) {
      const target = targets[g][state.age];
      const value = avg[g];
      const min = target * (tol[g].min / 100);
      const max = tol[g].max == null ? null : target * (tol[g].max / 100);
      const scaleMax = Math.max(target * 1.4, value * 1.1, 1);
      const pct = Math.min(100, (value / scaleMax) * 100);
      const targetPct = Math.min(100, (target / scaleMax) * 100);
      let status = 'ok';
      if (value < min) status = 'low';
      else if (max != null && value > max) status = 'high';
      if (state.plan.length && status === 'ok') inRange += 1;
      const reform = groupMeta[g].reform;
      let tone = 'ok';
      if (!state.plan.length) tone = 'off';
      else if (status === 'high' && reform === 'down') tone = 'bad';
      else if (status !== 'ok') tone = 'warn';
      const isNew = groupMeta[g].isNew ? '<span class="rt-bar-new">nové</span>' : '';
      html += `<div class="rt-bar rt-bar-${tone}">
        <div class="rt-bar-head"><span class="rt-bar-label">${esc(groupMeta[g].label)}${isNew}</span><span class="rt-bar-val">⌀ ${fmt(value)} g <span class="rt-bar-target">/ cíl ${fmt(target)} g</span></span></div>
        <div class="rt-bar-track"><span class="rt-bar-fill" style="width:${pct}%"></span><span class="rt-bar-tick" style="left:${targetPct}%"></span></div>
      </div>`;
    }
    $('bars').innerHTML = html;
    return inRange;
  }

  function renderPestrost() {
    const c = pestrostCounts(state.plan, byId);
    let met = 0, evaluable = 0;
    const items = rules.map((rule) => {
      const count = c.byCategory[rule.category] || (rule.category === 'sladke_jidlo' ? c.sweet : 0);
      let ok = true, evaluated = true;
      if (rule.min != null) { ok = count >= rule.min; }
      if (rule.max != null) { ok = ok && count <= rule.max; }
      // min-pravidlo bez naplněného jídelníčku bereme jako „zatím nehotové“
      if (rule.min != null && state.plan.length < targetDays && count < rule.min) evaluated = false;
      if (evaluated) { evaluable++; if (ok) met++; }
      const cls = !state.plan.length ? 'off' : (ok ? 'on' : (evaluated ? 'off-bad' : 'progress'));
      return `<li class="rt-principle rt-principle-${ok && state.plan.length ? 'on' : 'off'}">
        <span class="rt-principle-mark" aria-hidden="true">${state.plan.length && ok ? '✓' : '○'}</span>
        <span class="rt-principle-text"><strong>${esc(rule.label)} — ${count}×</strong><span>${esc(rule.note)}</span></span>
      </li>`;
    });
    // celozrnné a luštěniny v jídelníčku
    items.push(`<li class="rt-principle rt-principle-${c.withCelozrnne ? 'on' : 'off'}">
      <span class="rt-principle-mark" aria-hidden="true">${c.withCelozrnne ? '✓' : '○'}</span>
      <span class="rt-principle-text"><strong>Celozrnné v ${c.withCelozrnne} z ${c.total} obědů</strong><span>nová skupina koše — čím častěji, tím lépe</span></span>
    </li>`);
    items.push(`<li class="rt-principle rt-principle-${c.withLusteniny ? 'on' : 'off'}">
      <span class="rt-principle-mark" aria-hidden="true">${c.withLusteniny ? '✓' : '○'}</span>
      <span class="rt-principle-text"><strong>Luštěniny v ${c.withLusteniny} z ${c.total} obědů</strong><span>rostlinná bílkovina</span></span>
    </li>`);
    $('pestrost').innerHTML = items.join('');
    return { met, evaluable };
  }

  function renderScore(inRange, pest) {
    const el = $('score');
    if (!state.plan.length) {
      el.className = 'rt-score rt-score-neutral';
      el.innerHTML = `<span class="rt-score-label">Sestav jídelníček a sleduj, jak průměr sedí na koš a jestli platí pravidla pestrosti.</span>`;
      return;
    }
    const cls = inRange >= 7 ? 'good' : inRange >= 4 ? 'warn' : 'bad';
    el.className = `rt-score rt-score-${cls}`;
    el.innerHTML = `<span class="rt-score-num">${inRange}/9</span><span class="rt-score-label">skupin koše má průměr v normě · pestrost ${pest.met}/${pest.evaluable} pravidel</span>`;
  }

  function render() {
    renderPlan();
    const inRange = renderBars();
    const pest = renderPestrost();
    renderScore(inRange, pest);
  }

  $('age').addEventListener('change', (e) => { state.age = e.target.value; render(); });
  $('swap').addEventListener('change', (e) => { state.swapWhole = e.target.checked; render(); });
  $('sample').addEventListener('click', () => { state.plan = [...SAMPLE_MONTH]; render(); });
  $('clear').addEventListener('click', () => { state.plan = []; render(); });

  renderPalette();
  render();
}

async function boot() {
  const root = document.querySelector('[data-recipe-tuner]');
  if (!root) return;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    initRecipeTuner(root, data);
  } catch (err) {
    root.innerHTML = `<p class="rt-error">Interaktivní nástroj se nepodařilo načíst (${esc(err.message)}). Data: nový spotřební koš dle vyhlášky 310/2025 Sb.</p>`;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
