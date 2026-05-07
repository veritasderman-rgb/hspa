// Bootstrap stránek sekce Články: úvodní listing i jednotlivé články.
import './analytics.js';
import { renderModuleNav, renderMastheadDate } from './page-shared.js';

renderModuleNav('articles');
renderMastheadDate();
populateWaffles();

/**
 * Vyplní libovolný <div class="waffle-100" data-pct="N">…</div> v článku
 * 100 spany, kde prvních N má class="f". Pure HTML/CSS waffle, žádné inline
 * skripty v jednotlivých článcích.
 */
function populateWaffles() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.waffle-100[data-pct]').forEach(el => {
    if (el.dataset.populated === '1') return;
    const pct = Math.max(0, Math.min(100, parseInt(el.dataset.pct, 10) || 0));
    let html = '';
    for (let i = 0; i < 100; i++) html += i < pct ? '<span class="f"></span>' : '<span></span>';
    el.innerHTML = html;
    el.dataset.populated = '1';
  });
}
