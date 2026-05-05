// Sdílené komponenty napříč stránkami: hlavička s audience switchem,
// navigační lišta mezi moduly (Indikátory / Strategie / Jak to funguje).

export const AUDIENCE_KEY = 'zdrave-cesko/audience';
export const AUDIENCES = ['public', 'expert', 'policy'];

export function getAudience() {
  try {
    const saved = localStorage.getItem(AUDIENCE_KEY);
    return AUDIENCES.includes(saved) ? saved : 'public';
  } catch { return 'public'; }
}

export function setAudience(value) {
  if (!AUDIENCES.includes(value)) return;
  try { localStorage.setItem(AUDIENCE_KEY, value); } catch {}
  document.body.dataset.audience = value;
  document.querySelectorAll('.audience-switch button').forEach(b => {
    const isActive = b.dataset.aud === value;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', String(isActive));
    b.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  document.dispatchEvent(new CustomEvent('audiencechange', { detail: value }));
}

export function wireAudienceSwitch() {
  const initial = getAudience();
  document.body.dataset.audience = initial;
  document.querySelectorAll('.audience-switch button').forEach(btn => {
    const isActive = btn.dataset.aud === initial;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(isActive));
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
    btn.addEventListener('click', () => setAudience(btn.dataset.aud));
  });
}

/**
 * Render společné navigační lišty mezi moduly.
 * Volá se z každé stránky, automaticky zvýrazní aktivní záložku
 * podle window.location.pathname.
 */
export function renderModuleNav(activeId) {
  const path = window.location.pathname;
  const tabs = [
    { id: 'indicators', label: 'Indikátory', href: 'index.html', match: ['index.html', '/'] },
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
 * Render audience-aware text — vrátí správnou variantu podle aktuální audience.
 * @param {{ tldr_public?: string, tldr_expert?: string, tldr_policy?: string }} obj
 */
export function audienceText(obj, audience = getAudience()) {
  return obj[`tldr_${audience}`] ?? obj.tldr_public ?? obj.tldr ?? '';
}

/**
 * Pomocná funkce pro escape HTML před injection do innerHTML.
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
