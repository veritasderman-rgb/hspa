/**
 * recipe-tuner.js — interaktivní prvek „Vylaď školní oběd“.
 *
 * Načte data/skolni-strava.json (statický export z repozitáře jidelny — nový
 * spotřební koš dle vyhlášky 310/2025 Sb.) a vykreslí do elementu
 * [data-recipe-tuner] nástroj, kde si čtenář vybere recept, uvidí jeho profil
 * proti cílovým hodnotám nového koše a může „vyladit“ pár pák reformy
 * (zelenina, celozrnné, luštěniny, přidaný cukr, smažení vs. pečení) a sledovat,
 * jak roste skóre principů Zdravé jídelny.
 *
 * Data jsou ilustrativní (gramáže receptů pro věk 7–10 let), neslouží jako
 * oficiální jídelníček. Žije pouze na stránce článku, kde je element přítomen.
 */

const DATA_URL = 'data/skolni-strava.json';
const BASKET_GROUPS = ['maso', 'ryby', 'mleko', 'tuky', 'cukry', 'zelenina_ovoce', 'brambory', 'celozrnne', 'lusteniny'];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function groupTotals(recipe, state) {
  const t = {};
  for (const g of BASKET_GROUPS) t[g] = 0;
  t.ostatni = 0;
  for (const ing of recipe.ingredients) {
    let group = ing.group;
    let grams = ing.grams;
    if (state.swapWhole && ing.swappable) group = 'celozrnne'; // bílou přílohu počítáme jako celozrnnou
    if (group in t) t[group] += grams;
  }
  if (state.addLegumes) t.lusteniny += 20;
  t.zelenina_ovoce += state.vegAdd;
  t.cukry += state.sugarAdd;
  return t;
}

export function principles(recipe, totals, state) {
  return {
    vegetables: totals.zelenina_ovoce >= 120,
    wholegrain: totals.celozrnne >= 15,
    legumes: totals.lusteniny >= 8,
    lowSugar: totals.cukry <= 5,
    notFried: !state.fried,
    goodFats: true, // recepty v exportu neobsahují palmový/kokosový tuk
  };
}

function fmt(n) {
  return Math.round(n).toLocaleString('cs-CZ');
}

export function initRecipeTuner(root, data) {
  const ages = data.ageCategories;
  const groupMeta = Object.fromEntries(data.foodGroups.map((g) => [g.key, g]));
  const principleMeta = data.reformPrinciples;

  const state = {
    recipeId: data.recipes[0].id,
    age: '7-10',
    vegAdd: 0,
    sugarAdd: 0,
    swapWhole: false,
    addLegumes: false,
    fried: false,
  };

  // ---- statická kostra ----
  root.innerHTML = `
    <div class="rt">
      <div class="rt-controls">
        <label class="rt-field">
          <span class="rt-field-label">Recept</span>
          <select class="rt-select" data-rt="recipe">
            ${data.recipes.map((r) => `<option value="${r.id}">${esc(r.name)} · ${esc(data.categoryLabels[r.category] || r.category)}</option>`).join('')}
          </select>
        </label>
        <label class="rt-field">
          <span class="rt-field-label">Věková kategorie</span>
          <select class="rt-select" data-rt="age">
            ${ages.map((a) => `<option value="${a.key}"${a.key === state.age ? ' selected' : ''}>${esc(a.label)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="rt-score" data-rt="score" aria-live="polite"></div>

      <div class="rt-grid">
        <section class="rt-panel">
          <h4 class="rt-panel-h">Principy reformy v tomto obědě</h4>
          <ul class="rt-principles" data-rt="principles"></ul>
          <div class="rt-meta" data-rt="meta"></div>
        </section>

        <section class="rt-panel">
          <h4 class="rt-panel-h">Profil porce vs. nový spotřební koš</h4>
          <div class="rt-bars" data-rt="bars"></div>
          <p class="rt-foot">Cílová hodnota je porce oběda nového koše pro zvolený věk; pruh ukazuje hmotnost skupiny v obědě. Koš je měsíční průměr — jeden oběd se od cíle liší, smysl dává skladba napříč týdnem.</p>
        </section>
      </div>

      <section class="rt-panel rt-tune">
        <h4 class="rt-panel-h">Vylaď oběd</h4>
        <div class="rt-tune-grid">
          <label class="rt-slider">
            <span>Přidat zeleninu / ovoce <strong data-rt="vegVal">0 g</strong></span>
            <input type="range" min="0" max="150" step="10" value="0" data-rt="veg">
          </label>
          <label class="rt-slider">
            <span>Přidaný cukr (oslazení) <strong data-rt="sugarVal">0 g</strong></span>
            <input type="range" min="0" max="30" step="5" value="0" data-rt="sugar">
          </label>
          <label class="rt-toggle">
            <input type="checkbox" data-rt="swap">
            <span>Bílou přílohu nahradit celozrnnou</span>
          </label>
          <label class="rt-toggle">
            <input type="checkbox" data-rt="legumes">
            <span>Přidat porci luštěnin (+20 g)</span>
          </label>
          <label class="rt-toggle">
            <input type="checkbox" data-rt="fried">
            <span>Připravit smažením místo pečení</span>
          </label>
          <button type="button" class="rt-reset" data-rt="reset">Vrátit recept do původního stavu</button>
        </div>
      </section>

      <p class="rt-source">Data: nový spotřební koš dle vyhlášky 310/2025 Sb. (repozitář školních jídelen). Ilustrativní, neoficiální jídelníček.</p>
    </div>
  `;

  const $ = (sel) => root.querySelector(`[data-rt="${sel}"]`);

  function recipe() {
    return data.recipes.find((r) => r.id === state.recipeId);
  }

  function renderScore(score) {
    const el = $('score');
    const cls = score >= 5 ? 'good' : score >= 3 ? 'warn' : 'bad';
    el.className = `rt-score rt-score-${cls}`;
    el.innerHTML = `<span class="rt-score-num">${score}/6</span><span class="rt-score-label">principů Zdravé jídelny splněno</span>`;
  }

  function renderPrinciples(p) {
    $('principles').innerHTML = principleMeta.map((pm) => {
      const ok = p[pm.key];
      return `<li class="rt-principle rt-principle-${ok ? 'on' : 'off'}">
        <span class="rt-principle-mark" aria-hidden="true">${ok ? '✓' : '○'}</span>
        <span class="rt-principle-text"><strong>${esc(pm.label)}</strong><span>${esc(pm.desc)}</span></span>
      </li>`;
    }).join('');
  }

  function renderBars(totals) {
    const targets = data.basketLunchTargets;
    const tol = data.tolerances;
    let html = '';
    for (const g of BASKET_GROUPS) {
      const target = targets[g][state.age];
      const value = totals[g];
      const min = target * (tol[g].min / 100);
      const max = tol[g].max == null ? null : target * (tol[g].max / 100);
      const scaleMax = Math.max(target * 1.4, value * 1.1, 1);
      const pct = Math.min(100, (value / scaleMax) * 100);
      const targetPct = Math.min(100, (target / scaleMax) * 100);
      let status = 'ok';
      if (value < min) status = 'low';
      else if (max != null && value > max) status = 'high';
      const reform = groupMeta[g].reform;
      let tone = 'ok';
      if (status === 'low' && reform === 'up') tone = 'warn';
      else if (status === 'high' && reform === 'down') tone = 'bad';
      else if (status === 'high') tone = 'warn';
      else if (status === 'low') tone = 'warn';
      const isNew = groupMeta[g].isNew ? '<span class="rt-bar-new">nové</span>' : '';
      html += `<div class="rt-bar rt-bar-${tone}">
        <div class="rt-bar-head"><span class="rt-bar-label">${esc(groupMeta[g].label)}${isNew}</span><span class="rt-bar-val">${fmt(value)} g <span class="rt-bar-target">/ cíl ${fmt(target)} g</span></span></div>
        <div class="rt-bar-track"><span class="rt-bar-fill" style="width:${pct}%"></span><span class="rt-bar-tick" style="left:${targetPct}%"></span></div>
      </div>`;
    }
    // off-basket refined side
    if (totals.ostatni > 0) {
      const scaleMax = Math.max(80, totals.ostatni * 1.1);
      const pct = Math.min(100, (totals.ostatni / scaleMax) * 100);
      html += `<div class="rt-bar rt-bar-off">
        <div class="rt-bar-head"><span class="rt-bar-label">${esc(groupMeta.ostatni.label)}</span><span class="rt-bar-val">${fmt(totals.ostatni)} g</span></div>
        <div class="rt-bar-track"><span class="rt-bar-fill" style="width:${pct}%"></span></div>
      </div>`;
    }
    $('bars').innerHTML = html;
  }

  function renderMeta(r) {
    const norm = data.financialNormativeLunch[state.age];
    const allergs = (r.allergens || []).map((a) => esc(data.allergens[a] || a)).join(', ') || 'žádné z 14 hlavních';
    const tags = [];
    if (r.isSweet) tags.push('<span class="rt-tag rt-tag-warn">sladké jídlo — max 2× měsíčně</span>');
    if (state.fried) tags.push('<span class="rt-tag rt-tag-bad">smažené — max 2× měsíčně</span>');
    $('meta').innerHTML = `
      <div class="rt-meta-row"><span>Polévka</span><strong>${esc(r.soup)}</strong></div>
      <div class="rt-meta-row"><span>Odhad ceny surovin</span><strong>${fmt(r.cost)} Kč <span class="rt-bar-target">(normativ oběda ${fmt(norm.min)}–${fmt(norm.max)} Kč)</span></strong></div>
      <div class="rt-meta-row"><span>Alergeny</span><strong>${allergs}</strong></div>
      ${tags.length ? `<div class="rt-tags">${tags.join('')}</div>` : ''}
    `;
  }

  function render() {
    const r = recipe();
    const totals = groupTotals(r, state);
    const p = principles(r, totals, state);
    const score = Object.values(p).filter(Boolean).length;
    renderScore(score);
    renderPrinciples(p);
    renderBars(totals);
    renderMeta(r);
    $('vegVal').textContent = `+${state.vegAdd} g`;
    $('sugarVal').textContent = `+${state.sugarAdd} g`;
  }

  function resetTuning() {
    state.vegAdd = 0; state.sugarAdd = 0; state.swapWhole = false; state.addLegumes = false; state.fried = false;
    $('veg').value = '0'; $('sugar').value = '0';
    $('swap').checked = false; $('legumes').checked = false; $('fried').checked = false;
  }

  // ---- události ----
  $('recipe').addEventListener('change', (e) => { state.recipeId = e.target.value; resetTuning(); render(); });
  $('age').addEventListener('change', (e) => { state.age = e.target.value; render(); });
  $('veg').addEventListener('input', (e) => { state.vegAdd = +e.target.value; render(); });
  $('sugar').addEventListener('input', (e) => { state.sugarAdd = +e.target.value; render(); });
  $('swap').addEventListener('change', (e) => { state.swapWhole = e.target.checked; render(); });
  $('legumes').addEventListener('change', (e) => { state.addLegumes = e.target.checked; render(); });
  $('fried').addEventListener('change', (e) => { state.fried = e.target.checked; render(); });
  $('reset').addEventListener('click', () => { resetTuning(); render(); });

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
