// Odlehčený shell pro samostatný web pohotovostí (druhý výstup repa,
// PLAN-POHOTOVOSTI-DOMENA.md). Build (scripts/build-pohotovosti-site.js)
// ho zkopíruje do dist-pohotovosti/src/page-shared.js, takže
// src/pohotovosti.js a src/pohotovost-okres.js importují tytéž názvy jako
// na HSPA Monitoru — ale bez navigace dashboardu, mastheadu, newsletteru,
// popupů „Týdnů zdraví“ a veder a bez sdílených dat (articles, indicators).
//
// PROČ: kdo hledá pohotovost, je ve stresu, na mobilu, často v noci —
// dostane jednu obrazovku, 155 nahoře a nic, co by ho zdržovalo.
//
// Exporty musí pokrývat vše, co si obě stránky z page-shared.js berou
// (hlídá tests/pohotovosti-site.test.js). Konfiguraci webu (název, doménu,
// odkazy zpět na HSPA) vkládá build do stránky jako window.POH_SITE.

export const THEME_KEY = 'hspa-theme';

(function initThemeEarly() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (_) { /* bez úložiště → světlý motiv */ }
})();

function siteConfig() {
  const cfg = (typeof window !== 'undefined' && window.POH_SITE) || {};
  return {
    name: cfg.name || 'Kde je pohotovost',
    url: cfg.url || '/',
    operator: cfg.operator || { name: 'Zdravé Česko · HSPA Monitor', url: 'https://skorezdravotnictvi.cz', analysis_url: 'https://skorezdravotnictvi.cz/' },
    hspa_links: Array.isArray(cfg.hspa_links) ? cfg.hspa_links : [],
    data_stamp: cfg.data_stamp || null,
  };
}

/** Escape HTML pro injekci do innerHTML (shodné s page-shared.js). */
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Navigace dashboardu tu není — hlavička je statická v HTML shellu. */
export function renderModuleNav() {}

/** Masthead s datem vydání na servisním webu nemá co dělat. */
export function renderMastheadDate() {}

/** Patička: kdo web provozuje, odkud jsou data a kam nahlásit chybu. Bez newsletteru. */
export function renderFooter(el = (typeof document !== 'undefined' ? document.getElementById('siteFooter') : null)) {
  if (!el) return;
  const c = siteConfig();
  el.innerHTML = `
    <div class="row poh-site-footer">
      <div>
        <h4 class="footer-col-h">Kdo to provozuje</h4>
        <p>${escapeHtml(c.name)} je servisní nástroj projektu <a href="${escapeHtml(c.operator.url)}" rel="noopener">${escapeHtml(c.operator.name)}</a>.
        Není oficiálním zdrojem Ministerstva zdravotnictví, zdravotních pojišťoven ani záchranné služby.</p>
        <p><a href="${escapeHtml(c.operator.analysis_url)}" rel="noopener">Proč pohotovosti chybí a kde: analýza na HSPA Monitoru →</a></p>
      </div>
      <div>
        <h4 class="footer-col-h">Odkud jsou data</h4>
        <p>Rozpisy hodin z celostátního přehledu VZP a otevřených dat krajů, adresy z registru poskytovatelů ÚZIS,
        denní nemocniční ambulance ověřené proti webům nemocnic. Před cestou vždy zavolejte.</p>
        <p class="footer-privacy">Web nepoužívá sledovací cookies a neukládá polohu. Poloha se použije jen v prohlížeči k seřazení výsledků.</p>
      </div>
      <div>
        <h4 class="footer-col-h">Něco nesedí?</h4>
        <p><a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">Nahlásit změnu hodin nebo chybu ↗</a><br>
        <a href="https://github.com/veritasderman-rgb/hspa" target="_blank" rel="noopener">Zdrojový kód (GitHub) ↗</a></p>
      </div>
    </div>
    <div class="disclaimer">
      ${escapeHtml(c.operator.name)} · CC-BY 4.0 · Není oficiálním portálem MZČR ani ZZS · V ohrožení života volejte 155
    </div>`;
}

/** „Prozkoumejte dál“ vede na HSPA Monitor (absolutní odkazy), ne na nástroje dashboardu. */
export function renderRelatedTools(activeId, el = (typeof document !== 'undefined' ? document.getElementById('toolSiblings') : null)) {
  if (!el) return;
  const c = siteConfig();
  if (!c.hspa_links.length) { el.hidden = true; return; }
  el.innerHTML = `
    <div class="ed-kicker">Souvislosti</div>
    <h2 class="tool-siblings-h">Proč pohotovosti chybí — data na HSPA Monitoru</h2>
    <div class="tool-siblings-grid">
      ${c.hspa_links.map(t => `
        <a class="tool-sibling-card" href="${escapeHtml(t.href)}" rel="noopener">
          <span class="tool-sibling-title">${escapeHtml(t.label)}</span>
          <span class="tool-sibling-desc">${escapeHtml(t.desc || '')}</span>
          <span class="tool-sibling-cta">Otevřít →</span>
        </a>`).join('')}
    </div>`;
}

/** Chybový stav bez odkazu na „O projektu“ (na servisním webu není). */
export function renderErrorState(message, error) {
  const detail = error?.message ? escapeHtml(error.message) : '';
  return `
    <div class="empty-state" role="alert">
      <p class="empty-state-msg">${escapeHtml(message)}</p>
      ${detail ? `<p class="empty-state-detail"><code>${detail}</code></p>` : ''}
      <div class="empty-state-actions">
        <button class="empty-state-btn" type="button" onclick="window.location.reload()">Zkusit znovu</button>
        <a class="empty-state-btn empty-state-btn-sec" href="tel:155">V ohrožení života volejte 155</a>
      </div>
    </div>`;
}
