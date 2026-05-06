// Sdílené komponenty napříč stránkami: navigační lišta mezi moduly
// (Indikátory / Strategie / Jak to funguje).

/**
 * Vrátí TL;DR text indikátoru/strategie/explaineru.
 * Vždy preferuje expert variantu (nejvíc obsahu pro publikum se zájmem
 * o problematiku); fallback přes public na bázi.
 */
export function audienceText(obj) {
  return obj.tldr_expert ?? obj.tldr_policy ?? obj.tldr_public ?? obj.tldr ?? '';
}

/**
 * Render společné navigační lišty mezi moduly. Volá se z každé stránky,
 * automaticky zvýrazní aktivní záložku podle window.location.pathname.
 */
export function renderModuleNav(activeId) {
  const path = window.location.pathname;
  const tabs = [
    { id: 'indicators', label: 'Indikátory', href: 'index.html', match: ['index.html', '/', 'indikator.html'] },
    { id: 'strategies', label: 'Strategie', href: 'strategie.html', match: ['strategie.html'] },
    { id: 'explainers', label: 'Jak to funguje', href: 'jak-funguje.html', match: ['jak-funguje.html'] },
  ];

  const container = document.getElementById('moduleNav');
  if (!container) return;
  container.innerHTML = tabs.map(t => {
    const active = activeId
      ? t.id === activeId
      : t.match.some(m => path.endsWith(m));
    return `<a href="${t.href}" class="module-tab${active ? ' active' : ''}">${t.label}</a>`;
  }).join('');
}

/**
 * Escape HTML pro injekci do innerHTML.
 */
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
