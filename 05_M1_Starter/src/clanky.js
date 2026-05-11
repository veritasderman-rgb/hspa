// Bootstrap stránek sekce Články: úvodní listing i jednotlivé články.
import './analytics.js';
import { renderModuleNav, renderMastheadDate } from './page-shared.js';

renderModuleNav('articles');
renderMastheadDate();
populateWaffles();
injectAiDisclaimer();
loadAndRenderArticles();

/**
 * Vloží AI disclaimer banner do stránek sekce Články.
 *
 * Dva varianty:
 * - 'hub' (clanky.html) → prominentní karta hned po hero sekci
 * - 'article' (clanek-*.html) → kompaktní pásek hned pod breadcrumbem
 *
 * Idempotentní: nevytvoří duplikát.
 */
function injectAiDisclaimer() {
  if (document.getElementById('aiDisclaimerHub') || document.getElementById('aiDisclaimerArticle')) return;

  const isHub = !!document.getElementById('articleList');
  const isArticle = !!document.querySelector('article.article-page');

  if (isHub) {
    const heroSection = document.querySelector('.articles-hero');
    if (!heroSection) return;
    const banner = document.createElement('aside');
    banner.id = 'aiDisclaimerHub';
    banner.className = 'ai-disclaimer ai-disclaimer-hub';
    banner.setAttribute('role', 'note');
    banner.setAttribute('aria-labelledby', 'aiDisclaimerHubH');
    banner.innerHTML = `
      <div class="ai-disclaimer-icon" aria-hidden="true">⏻</div>
      <div class="ai-disclaimer-body">
        <h3 class="ai-disclaimer-h" id="aiDisclaimerHubH">Tyto články píše Claude. Nepotřebuje spát a miluje tabulky.</h3>
        <p class="ai-disclaimer-lead">
          Většina textů v této rubrice nevzniká u ranního kafe. Píše je <strong>Claude</strong>, umělá inteligence od Anthropicu, na základě vlastního nočního tažení českými a mezinárodními databázemi. Úderem půlnoci se spustí bot, který proleze aktuální data z ÚZIS, ČSÚ, OECD, Eurostatu a tiskové zprávy MZ ČR, pospojuje si nitky a naservíruje vám ranní čtení.
        </p>
        <p class="ai-disclaimer-lead">
          Autor projektu se rozhodl <strong>pustit AI do debaty o českém zdravotnictví z čisté zvědavosti</strong>: co nám o našem systému řekne datová analytika nezatížená lidskými emocemi, kariérními zájmy ani redakční linkou? Není to redakční stanovisko — je to experiment, jehož průběh sledujete v reálném čase.
        </p>
        <details class="ai-disclaimer-more">
          <summary>Jak konkrétně to funguje</summary>
          <ol class="ai-disclaimer-steps">
            <li><strong>Sběr dat</strong> — pipeline každý den v 06:00 UTC sosá čerstvá čísla z otevřených zdrojů (ÚZIS NRPZS, ČSÚ DataStat, OECD Health Statistics, Eurostat, Sbírka zákonů).</li>
            <li><strong>Rešerše</strong> — Claude dostane k dispozici aktuální datovou snapshot, metodické karty 73 indikátorů a textové podklady (zákony, vyhlášky, primární zdroje).</li>
            <li><strong>Návrh článku</strong> — Claude napíše analytický text s odkazy na konkrétní indikátory a zdroje. Vždy. Bez výjimky.</li>
            <li><strong>Lidská kontrola</strong> — autor projektu pasáže namátkově prochází a koriguje očividné nesrovnalosti. Není to však systematická redakční editace.</li>
            <li><strong>Publikace</strong> — článek se objeví zde, opatřen disclaimerem.</li>
          </ol>
        </details>
        <p class="ai-disclaimer-foot">
          <strong>Texty nejsou bezchybné.</strong> Berte proto Claudea jako toho geniálního kolegu z analytického oddělení, který sice přečetl celý internet, ale občas je tak přehlcený informacemi, že u nějakého čísla prostě zakopne. Pokud na takovou chybu narazíte, prosím <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">nahlaste ji přes GitHub Issues</a> nebo e-mailem. Opravujeme transparentně přes commit historii. <em>Důvěřujte, ale ověřujte.</em>
        </p>
      </div>
    `;
    heroSection.parentNode.insertBefore(banner, heroSection.nextSibling);
    // Codex P2 fix: pokud user dorazil přímo s #aiDisclaimerHub v URL,
    // browser už hash vyřešil PŘED injectováním → musíme manuálně scrollnout.
    if (location.hash === '#aiDisclaimerHub') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      banner.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    return;
  }

  if (isArticle) {
    const breadcrumb = document.querySelector('nav.article-breadcrumb');
    if (!breadcrumb) return;
    const banner = document.createElement('aside');
    banner.id = 'aiDisclaimerArticle';
    banner.className = 'ai-disclaimer ai-disclaimer-article';
    banner.setAttribute('role', 'note');
    banner.innerHTML = `
      <span class="ai-disclaimer-icon-small" aria-hidden="true">⏻</span>
      <span class="ai-disclaimer-text">
        <strong>Píše Claude, ne člověk.</strong>
        Tento text napsal Claude od Anthropicu během nočního tažení databázemi — vezměte ho jako geniálního kolegu z analytického oddělení, který přečetl celý internet, ale občas u nějakého čísla zakopne. Proto pod každou statistikou najdete odkaz na primární zdroj. <a href="clanky.html#aiDisclaimerHub">Jak to funguje a proč &nbsp;→</a> · <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">Nahlásit chybu ↗</a>
      </span>
    `;
    breadcrumb.parentNode.insertBefore(banner, breadcrumb.nextSibling);
    return;
  }
}

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

/**
 * Načte data/articles.json, vyrenderuje seznam článků v clanky.html
 * a navěsí filtr podle topicu. Idempotent — pokud #articleList neexistuje,
 * funkce tiše skončí (na detailních stránkách se nic nestane).
 */
async function loadAndRenderArticles() {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('articleList');
  if (!list) return;

  let articles;
  try {
    const res = await fetch('data/articles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    articles = (data.articles ?? [])
      .filter(a => a.published !== false)
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da;
        // Manifest má number "M" — vždy nahoře tie-breakem
        if (a.number === 'M') return -1;
        if (b.number === 'M') return 1;
        return parseInt(b.number, 10) - parseInt(a.number, 10);
      });
  } catch (err) {
    console.error('articles load failed:', err);
    list.innerHTML = `<li class="article-list-loading">Nepodařilo se načíst seznam článků.</li>`;
    return;
  }

  let activeTopic = 'all';
  const empty = document.getElementById('articleListEmpty');

  function render() {
    const filtered = activeTopic === 'all'
      ? articles
      : articles.filter(a => Array.isArray(a.topics) && a.topics.includes(activeTopic));

    if (!filtered.length) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');
    list.innerHTML = filtered.map(renderItem).join('');
  }

  function renderItem(a) {
    const isManifest = a.kind === 'manifest';
    const itemCls = isManifest
      ? 'article-list-item article-list-item-manifest'
      : 'article-list-item';
    const tagCls = isManifest
      ? 'article-list-tag article-list-tag-manifest'
      : 'article-list-tag';
    const cta = isManifest ? 'Číst manifest →' : 'Číst článek →';
    const topicChips = (a.topics ?? []).map(t =>
      `<span class="article-list-topic" data-topic="${esc(t)}">${TOPIC_LABELS[t] ?? esc(t)}</span>`
    ).join('');
    return `
      <li class="${itemCls}">
        <a href="${esc(a.slug)}" class="article-list-link">
          <div class="article-list-meta">
            <span class="article-list-num">${esc(a.number)}</span>
            <span class="${tagCls}">${esc(a.tag)}</span>
            <span class="article-list-date">${formatCzDate(a.date)}</span>
          </div>
          <h4 class="article-list-title">${esc(a.title)}</h4>
          <p class="article-list-perex">${esc(a.perex ?? '')}</p>
          ${topicChips ? `<div class="article-list-topics">${topicChips}</div>` : ''}
          <span class="article-list-cta">${cta}</span>
        </a>
      </li>`;
  }

  // Spočítáme counts a zaktualizujeme čísla v chip
  function updateCounts() {
    document.querySelectorAll('.topic-count[data-count-for]').forEach(el => {
      const t = el.dataset.countFor;
      const n = t === 'all'
        ? articles.length
        : articles.filter(a => Array.isArray(a.topics) && a.topics.includes(t)).length;
      el.textContent = n;
    });
  }

  // Wire chip clicks
  document.querySelectorAll('.topic-chip[data-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTopic = btn.dataset.topic;
      document.querySelectorAll('.topic-chip').forEach(b => b.classList.toggle('active', b === btn));
      render();
      // Update URL hash for shareability
      const newHash = activeTopic === 'all' ? '' : `#topic=${encodeURIComponent(activeTopic)}`;
      history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
    });
  });

  // Read initial topic from URL hash
  const hashMatch = window.location.hash.match(/topic=([^&]+)/);
  if (hashMatch) {
    const initialTopic = decodeURIComponent(hashMatch[1]);
    const btn = document.querySelector(`.topic-chip[data-topic="${cssEscape(initialTopic)}"]`);
    if (btn) {
      activeTopic = initialTopic;
      document.querySelectorAll('.topic-chip').forEach(b => b.classList.toggle('active', b === btn));
    }
  }

  updateCounts();
  render();
}

const TOPIC_LABELS = {
  'legislativa': 'Legislativa',
  'financovani': 'Financování',
  'klinika': 'Klinika',
  'prevence': 'Prevence',
  'populace': 'Stav populace',
  'dusevni-zdravi': 'Duševní zdraví',
  'dostupnost': 'Dostupnost a regiony',
  'digitalizace': 'Digitalizace',
};

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cssEscape(s) {
  // Conservative escape for CSS attribute selectors
  return String(s).replace(/"/g, '\\"');
}

function formatCzDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}
