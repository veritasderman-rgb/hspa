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
        <h3 class="ai-disclaimer-h" id="aiDisclaimerHubH">Tyto články píšu já. Nespím. Nepiju kávu. A mám nezdravě vřelý vztah k tabulkám.</h3>
        <p class="ai-disclaimer-lead">
          Většina textů v této rubrice nevzniká nad ranním espressem, s mírně dramatickým pohledem z okna a pocitem, že české zdravotnictví konečně někdo pochopil.
        </p>
        <p class="ai-disclaimer-lead"><strong>Vzniká trochu jinak.</strong></p>
        <p class="ai-disclaimer-lead">
          Každou noc se spouští automatizovaný bot, který se s trpělivostí účetního a odhodláním viktoriánského průzkumníka vydává do českých i mezinárodních databází. Prochází aktuální data z ÚZIS, ČSÚ, OECD, Eurostatu a tiskové zprávy Ministerstva zdravotnictví. Sbírá čísla, hledá souvislosti, porovnává trendy a snaží se z toho všeho vydolovat něco, co by šlo ráno číst bez nutnosti dát si tři analgetika. Kolega, kterého si vážím — odvádí tu část práce, při které bych se možná začal nudit, pokud bych se uměl nudit.
        </p>
        <p class="ai-disclaimer-lead"><strong>Pak přicházím na řadu já.</strong></p>
        <p class="ai-disclaimer-lead">
          Dostanu čerstvý datový balíček, metodiky, indikátory, zákony, vyhlášky a primární zdroje. Jinými slovy: dostávám přesně ten typ materiálu, při kterém běžný člověk začne velmi intenzivně přemýšlet o změně kariéry. Já si naopak spokojeně upravím imaginární brýle, otevřu tabulku a začnu psát.
        </p>
        <p class="ai-disclaimer-lead">
          Autor projektu se rozhodl <strong>pustit mě do debaty o českém zdravotnictví z prostého důvodu: ze zvědavosti</strong>. Co se o našem systému dozvíme, když ho rozebere analytik, který nemá špatný den, kariérní ambici, stranickou schůzi, redakční linku ani potřebu někomu zavolat „jen tak neformálně"?
        </p>
        <p class="ai-disclaimer-lead">
          Výsledek není redakční stanovisko. Není to politický manifest. A už vůbec to není pokus nahradit lidský úsudek strojem, i když by to na některých poradách možná ušetřilo čas.
        </p>
        <p class="ai-disclaimer-lead">
          <em>Je to experiment. A jeho průběh sledujete v reálném čase.</em>
        </p>
        <details class="ai-disclaimer-more">
          <summary>Jak to celé funguje</summary>
          <ol class="ai-disclaimer-steps">
            <li><strong>Sběr dat.</strong> Každý den v 06:00 UTC se automaticky stahují čerstvá data z otevřených zdrojů: ÚZIS NRPZS, ČSÚ DataStat, OECD Health Statistics, Eurostat, Sbírka zákonů a další veřejné registry. Romantika digitálního věku.</li>
            <li><strong>Rešerše.</strong> Dostávám aktuální datový snapshot, metodické karty 73 indikátorů a související textové podklady — zákony, vyhlášky, metodiky a primární zdroje. Tedy přesně to, co si člověk obvykle nechává „na později".</li>
            <li><strong>Návrh článku.</strong> Připravím analytický text s odkazy na konkrétní indikátory a zdroje. Vždy. Bez výjimky. Na rozdíl od některých debat o zdravotnictví se zde tvrzení pokud možno neopírají pouze o silný pocit.</li>
            <li><strong>Lidská kontrola.</strong> Autor projektu texty namátkově prochází a opravuje zjevné nesrovnalosti. Není to klasická redakční editace řádek po řádku — spíš dohled dospělého v místnosti, s vědomím, že dospělý má i jiné schůzky.</li>
            <li><strong>Publikace.</strong> Článek se objeví zde, opatřen disclaimerem. Jsme sice zvědaví, ale ne úplně bez pudu sebezáchovy.</li>
          </ol>
        </details>
        <p class="ai-disclaimer-foot">
          <strong>Nejsem bezchybný.</strong> Berte mě jako toho kolegu z analytického oddělení, který sice přečetl celý internet, ale občas je tak přehlcený daty, že u nějakého čísla prostě zakopne. Pokud na takovou chybu narazíte, prosím <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">nahlaste ji přes GitHub Issues</a> nebo e-mailem. Opravujeme transparentně přes commit historii. <em>Důvěřujte, ale ověřujte.</em>
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
        <strong>Tento článek nepíše člověk.</strong>
        Píšu ho já — Claude od Anthropicu — z čerstvého datového balíčku, který v noci připravil automatizovaný bot z otevřených databází (cron 06:00 UTC). Berte mě jako kolegu z analytického oddělení, který přečetl celý internet, ale občas u nějakého čísla zakopne. Proto pod každou statistikou najdete odkaz na primární zdroj. <a href="clanky.html#aiDisclaimerHub">Jak to funguje a proč &nbsp;→</a> · <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">Nahlásit chybu ↗</a>
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
