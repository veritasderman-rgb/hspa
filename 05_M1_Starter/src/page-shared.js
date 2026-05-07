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
  renderFooter();
}

/**
 * Vyplní sdílenou patičku do elementu #siteFooter na každé stránce.
 */
export function renderFooter(el = document.getElementById('siteFooter')) {
  if (!el) return;
  el.innerHTML = `
    <div class="row">
      <div>
        <h6>O projektu</h6>
        <p>Občanská implementace OECD HSPA rámce pro ČR. Autor: Josef Pavlovic. Není oficálním portálem MZČR.</p>
        <p><a href="o-projektu.html">Metodika, zdroje a disclaimer →</a></p>
      </div>
      <div>
        <h6>Data a otevřenost</h6>
        <p>
          <a href="data/indicators.json">indicators.json</a> ·
          <a href="data/regions.json">regions.json</a> ·
          <a href="indicators/">Metodické karty</a><br>
          Licence CC-BY 4.0 · Data: ÚZIS, ČSÚ, OECD, Eurostat
        </p>
        <p class="footer-privacy">Web nepoužívá sledovací cookies. Žádné osobní údaje nejsou zpracovávány.</p>
      </div>
      <div>
        <h6>Zpětná vazba</h6>
        <p>
          <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">Nahlásit chybu nebo navrhnout indikátor ↗</a><br>
          <a href="https://github.com/veritasderman-rgb/hspa" target="_blank" rel="noopener">Zdrojový kód (GitHub) ↗</a>
        </p>
      </div>
    </div>
    <div class="disclaimer">
      Josef Pavlovic · CC-BY 4.0 · Není oficálním portálem MZČR ani OECD ·
      Citujte: Pavlovic, J. (2026). HSPA Monitor. hspa-cesko.cz
    </div>
  `;
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
    const explainEl = document.getElementById('scoreExplainVal');
    if (explainEl && score != null) explainEl.textContent = score;
  }).catch(() => {});
}

/**
 * Render společné navigační lišty mezi moduly. Volá se z každé stránky,
 * automaticky zvýrazní aktivní záložku podle window.location.pathname.
 */
export function renderModuleNav(activeId) {
  const path = window.location.pathname;
  const tabs = [
    { id: 'indicators',  label: 'Indikátory',              href: 'index.html',              match: ['index.html', '/'] },
    { id: 'explainers',  label: 'Jak funguje',             href: 'jak-funguje.html',        match: ['jak-funguje.html'] },
    { id: 'prevention',  label: 'Co s tím můžu dělat já', href: 'prevence.html',           match: ['prevence.html'] },
    { id: 'articles',    label: 'Články',                  href: 'clanky.html',             match: ['clanky.html'] },
    { id: 'themes',      label: 'Tematické linie',         href: 'tematicke-linie.html',    match: ['tematicke-linie.html'] },
    { id: 'strategies',  label: 'Strategie',               href: 'strategie.html',          match: ['strategie.html'] },
    { id: 'about',       label: 'O projektu',              href: 'o-projektu.html',         match: ['o-projektu.html'] },
    { id: 'glossary',    label: 'Glosář',                  href: 'glosar.html',             match: ['glosar.html'] },
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

let _glossaryTermsCache = null;

/**
 * Načte a cachuje termíny glosáře. Bezpečné pro opakované volání.
 */
export async function loadGlossaryTerms() {
  if (_glossaryTermsCache) return _glossaryTermsCache;
  try {
    const data = await fetch('data/glossary.json').then(r => r.json());
    _glossaryTermsCache = data.terms ?? [];
  } catch {
    _glossaryTermsCache = [];
  }
  return _glossaryTermsCache;
}

/**
 * Wrappuje známé zkratky v HTML stringu do <abbr> s tooltip.
 * Volat PŘED vložením do innerHTML. Bezpečné — operuje na escaped stringu.
 * Příklad: wrapAcronyms('Hodnotí OECD data', glossaryTerms) → 'Hodnotí <abbr ...>OECD</abbr> data'
 */
export function wrapAcronyms(html, terms) {
  if (!html || !terms || !terms.length) return html;
  // Build one combined regex so each text segment is processed in a single pass —
  // prevents later terms from matching inside <abbr> attributes just injected.
  const escaped = terms.map(t => t.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const combined = new RegExp(`(?<![\\w\\-])(${escaped.join('|')})(?![\\w\\-])`, 'g');
  const byKey = new Map(terms.map(t => [t.key, t]));
  // Split into alternating text/tag segments; only replace inside text (even indices)
  const parts = html.split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(combined, match => {
      const t = byKey.get(match);
      if (!t) return match;
      return `<abbr class="glossary-abbr" data-def="${escapeHtml(t.short_def)}" title="${escapeHtml(t.full)}">${match}</abbr>`;
    });
  }
  return parts.join('');
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
