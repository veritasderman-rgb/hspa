// Sdílené komponenty napříč stránkami: navigační lišta mezi moduly.

const LS_AUDIENCE = 'zdrave-cesko/audience';

export function getAudience() {
  try { return localStorage.getItem(LS_AUDIENCE) || 'public'; } catch { return 'public'; }
}

export function setAudience(aud) {
  try { localStorage.setItem(LS_AUDIENCE, aud); } catch {}
  document.body.dataset.audience = aud;
  document.querySelectorAll('.aud-btn').forEach(b => b.classList.toggle('active', b.dataset.aud === aud));
}

/**
 * Vrátí TL;DR text indikátoru/strategie/explaineru podle uložené audience preference.
 * Fallback: public → expert.
 */
export function audienceText(obj) {
  const aud = getAudience();
  if (aud === 'expert') return obj.tldr_expert ?? obj.tldr_public ?? obj.tldr ?? '';
  if (aud === 'policy') return obj.tldr_policy ?? obj.tldr_expert ?? obj.tldr_public ?? obj.tldr ?? '';
  return obj.tldr_public ?? obj.tldr_expert ?? obj.tldr ?? '';
}

/**
 * Vyplní datum do hlavičky (masthead-strip) v editorial stylu.
 * Příklad: "Pondělí 5. května 2026"
 */
export function renderMastheadDate(el = document.getElementById('mastheadDate')) {
  if (!el) return;
  const d = new Date();
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  el.textContent = `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  renderHSPAScore();
}

/**
 * Spočítá HSPA skóre z indikátorů.
 * Verified + preliminary indikátory: good=100, warn=50, bad=0, neutral ignorováno.
 * Illustrative indikátory ignorovány úplně.
 */
export function computeHSPAScore(indicators) {
  const scoreable = indicators.filter(i =>
    (i.verification_status === 'verified' || i.verification_status === 'preliminary') &&
    i.signal && i.signal !== 'neutral'
  );
  if (scoreable.length === 0) return null;
  const sum = scoreable.reduce((acc, i) => {
    if (i.signal === 'good') return acc + 100;
    if (i.signal === 'warn') return acc + 50;
    return acc;
  }, 0);
  return Math.round(sum / scoreable.length);
}

/**
 * Načte indikátory a zobrazí HSPA skóre do elementu #czScore.
 */
export function renderHSPAScore() {
  fetch('data/indicators.json').then(r => r.json()).then(data => {
    const score = computeHSPAScore(data.indicators);
    const el = document.getElementById('czScore');
    if (el && score != null) el.textContent = score;
  }).catch(() => {});
}

/**
 * Render společné navigační lišty mezi moduly. Volá se z každé stránky,
 * automaticky zvýrazní aktivní záložku podle window.location.pathname.
 */
export function renderModuleNav(activeId) {
  const path = window.location.pathname;
  const tabs = [
    { id: 'indicators',  label: 'Indikátory',              href: 'index.html',          match: ['index.html', '/'] },
    { id: 'explainers',  label: 'Jak funguje',             href: 'jak-funguje.html',    match: ['jak-funguje.html'] },
    { id: 'prevention',  label: 'Co s tím můžu dělat já', href: 'prevence.html',       match: ['prevence.html'] },
    { id: 'strategies',  label: 'Strategie',               href: 'strategie.html',      match: ['strategie.html'] },
    { id: 'about',       label: 'O projektu',              href: 'o-projektu.html',     match: ['o-projektu.html'] },
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
