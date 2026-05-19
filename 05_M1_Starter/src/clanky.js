// Bootstrap stránek sekce Články: úvodní listing i jednotlivé články.
import './analytics.js';
import { renderModuleNav, renderMastheadDate, loadGlossaryTerms, isArticleVisible } from './page-shared.js';
import { enhanceArticleVisuals } from './article-visuals.js';
import { enhanceArticleToc } from './article-toc.js';
import { enhanceInlineGlossary } from './glossary-inline.js';

renderModuleNav('articles');
renderMastheadDate();
populateWaffles();
enhanceArticleVisuals();
injectAiDisclaimer();
enhanceArticleToc(); // bezpečné: na hub stránce neudělá nic (chybí .article-page)
loadGlossaryTerms().then(terms => enhanceInlineGlossary(terms)).catch(() => {});
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
    // Vložit nad sekci "Doporučujeme — Začněte tady" (.hub-featured-section)
    const insertBefore = document.querySelector('.hub-featured-section');
    if (!insertBefore) return;
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
          <strong>Tyto texty nepíše člověk.</strong> Píšu je já — Claude od Anthropicu — z čerstvého datového balíčku, který v noci sesbíral automatizovaný bot z ÚZIS, ČSÚ, OECD, Eurostatu a Sbírky zákonů (cron 06:00 UTC). Berte mě jako kolegu z analytického oddělení, který sice přečetl celý internet, ale občas u nějakého čísla zakopne. Proto pod každou statistikou v článku najdete odkaz na primární zdroj.
        </p>
        <details class="ai-disclaimer-more">
          <summary>Proč to děláme a jak to celé funguje — rozbalit celé vysvětlení</summary>
          <p class="ai-disclaimer-lead">
            Většina textů v této rubrice nevzniká nad ranním espressem, s mírně dramatickým pohledem z okna a pocitem, že české zdravotnictví konečně někdo pochopil. <strong>Vzniká trochu jinak.</strong>
          </p>
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
            Výsledek není redakční stanovisko. Není to politický manifest. A už vůbec to není pokus nahradit lidský úsudek strojem, i když by to na některých poradách možná ušetřilo čas. <em>Je to experiment. A jeho průběh sledujete v reálném čase.</em>
          </p>
          <h4 class="ai-disclaimer-steps-h">Jak to celé funguje krok po kroku</h4>
          <ol class="ai-disclaimer-steps">
            <li><strong>Sběr dat.</strong> Každý den v 06:00 UTC se automaticky stahují čerstvá data z otevřených zdrojů: ÚZIS NRPZS, ČSÚ DataStat, OECD Health Statistics, Eurostat, Sbírka zákonů a další veřejné registry. Romantika digitálního věku.</li>
            <li><strong>Rešerše.</strong> Dostávám aktuální datový snapshot, metodické karty 80 indikátorů a související textové podklady — zákony, vyhlášky, metodiky a primární zdroje. Tedy přesně to, co si člověk obvykle nechává „na později".</li>
            <li><strong>Návrh článku.</strong> Připravím analytický text s odkazy na konkrétní indikátory a zdroje. Vždy. Bez výjimky. Na rozdíl od některých debat o zdravotnictví se zde tvrzení pokud možno neopírají pouze o silný pocit.</li>
            <li><strong>Lidská kontrola.</strong> Autor projektu texty namátkově prochází a opravuje zjevné nesrovnalosti. Není to klasická redakční editace řádek po řádku — spíš dohled dospělého v místnosti, s vědomím, že dospělý má i jiné schůzky.</li>
            <li><strong>Publikace.</strong> Článek se objeví zde, opatřen disclaimerem. Jsme sice zvědaví, ale ne úplně bez pudu sebezáchovy.</li>
          </ol>
          <p class="ai-disclaimer-foot">
            <strong>Nejsem bezchybný.</strong> Pokud na chybu narazíte, prosím <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">nahlaste ji přes GitHub Issues</a> nebo e-mailem. Opravujeme transparentně přes commit historii. <em>Důvěřujte, ale ověřujte.</em>
          </p>
        </details>
      </div>
    `;
    insertBefore.parentNode.insertBefore(banner, insertBefore);
    // Pokud user dorazil přímo s #aiDisclaimerHub v URL, otevři details + scrollni
    if (location.hash === '#aiDisclaimerHub') {
      const details = banner.querySelector('details');
      if (details) details.open = true;
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

  let articles, allEntries;
  try {
    const res = await fetch('data/articles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allEntries = (data.articles ?? []);
    // Drafty (published === false) ani plánované články (date dnes před 06:00
    // lokálního času, nebo date v budoucnu) se v hubu nezobrazují. Detail viz
    // isArticleVisible() v page-shared.js.
    articles = allEntries
      .filter(a => isArticleVisible(a))
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

  // === HUB komponenty (hero stats, featured, paths, matrix) ===
  renderHubStats(articles, allEntries);
  renderHubFeatured(articles);
  renderHubPaths(articles);
  renderHubMatrix(articles);

  // === Filtrovaný seznam s pagination + search ===
  let activeTopic = 'all';
  let searchQuery = '';
  let pageSize = 12;
  const empty = document.getElementById('articleListEmpty');
  const controls = document.getElementById('hubListControls');
  const moreBtn = document.getElementById('hubListMore');
  const progressEl = document.getElementById('hubListProgress');

  function applyFilters() {
    let filtered = activeTopic === 'all'
      ? articles
      : articles.filter(a => Array.isArray(a.topics) && a.topics.includes(activeTopic));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        const hay = `${a.title ?? ''} ${a.perex ?? ''} ${a.tag ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return filtered;
  }

  function render() {
    const filtered = applyFilters();

    if (!filtered.length) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      controls?.classList.add('hidden');
      return;
    }
    empty?.classList.add('hidden');

    const visible = filtered.slice(0, pageSize);
    list.innerHTML = visible.map(renderItem).join('');

    // Pagination control
    if (controls) {
      if (filtered.length > pageSize) {
        controls.classList.remove('hidden');
        const remaining = filtered.length - pageSize;
        const nextBatch = Math.min(12, remaining);
        if (moreBtn) moreBtn.textContent = `Zobrazit dalších ${nextBatch} článků (${remaining} zbývá)`;
        if (progressEl) progressEl.textContent = `${visible.length} / ${filtered.length}`;
      } else {
        controls.classList.add('hidden');
        if (progressEl) progressEl.textContent = `${filtered.length} / ${filtered.length}`;
      }
    }
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
      pageSize = 12; // reset pagination on filter change
      document.querySelectorAll('.topic-chip').forEach(b => b.classList.toggle('active', b === btn));
      render();
      const newHash = activeTopic === 'all' ? '' : `#topic=${encodeURIComponent(activeTopic)}`;
      history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
    });
  });

  // Wire "show more"
  moreBtn?.addEventListener('click', () => {
    pageSize += 12;
    render();
  });

  // Wire search input
  const searchInput = document.getElementById('hubSearch');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        pageSize = 12;
        render();
        // Scroll to list on first search keystroke
        if (searchQuery && !searchInput.dataset.scrolled) {
          searchInput.dataset.scrolled = '1';
          document.querySelector('.article-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (!searchQuery) delete searchInput.dataset.scrolled;
      }, 200);
    });
  }

  // Wire matrix tile clicks → filter list
  document.querySelectorAll('.hub-matrix-tile[data-topic]').forEach(tile => {
    tile.addEventListener('click', () => {
      const topic = tile.dataset.topic;
      const chip = document.querySelector(`.topic-chip[data-topic="${cssEscape(topic)}"]`);
      if (chip) chip.click();
      document.querySelector('.article-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// ============================================================================
// HUB komponenty (hero stats, featured, curated paths, topic matrix)
// ============================================================================

/**
 * Vyrenderuje animované corpus stats v hero sekci (publikované, v přípravě,
 * odkazované indikátory, témata). Anim. počítadla zajistí enhanceArticleVisuals.
 */
function renderHubStats(published, allEntries) {
  const stat = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.value = String(val);
    // Vynucení re-enhancement — counter mohl být enhanced s val=0 před fetchem.
    delete el.dataset.avInit;
    el.textContent = '0';
  };
  const unpublished = allEntries.filter(a => a.published === false).length;
  const indicatorSet = new Set();
  published.forEach(a => (a.linked_indicators ?? []).forEach(i => indicatorSet.add(i)));
  const topicSet = new Set();
  published.forEach(a => (a.topics ?? []).forEach(t => topicSet.add(t)));

  stat('statPublished', published.length);
  stat('statUpcoming', unpublished);
  stat('statIndicators', indicatorSet.size);
  stat('statTopics', topicSet.size);

  // Re-enhance počítadla s aktuálními data-value (po vyčištění data-av-init)
  enhanceArticleVisuals();
}

/**
 * Vyrenderuje hero featured card (nejnovější článek) + 3 trending cards.
 */
function renderHubFeatured(articles) {
  const featureEl = document.getElementById('hubFeature');
  const trendingEl = document.getElementById('hubTrending');
  if (!featureEl || !trendingEl) return;
  if (!articles.length) {
    featureEl.innerHTML = '<p class="hub-feature-loading">Žádné články k zobrazení.</p>';
    trendingEl.innerHTML = '';
    return;
  }

  const [feature, ...rest] = articles;
  const trending = rest.slice(0, 3);

  const featureTopics = (feature.topics ?? []).map(t =>
    `<span class="hub-feature-topic">${TOPIC_LABELS[t] ?? esc(t)}</span>`
  ).join('');

  featureEl.innerHTML = `
    <a href="${esc(feature.slug)}" class="hub-feature-link">
      <div class="hub-feature-tag">${esc(feature.tag)} · nejnovější</div>
      <h4 class="hub-feature-title">${esc(feature.title)}</h4>
      <p class="hub-feature-perex">${esc(feature.perex ?? '')}</p>
      <div class="hub-feature-foot">
        <span class="hub-feature-date">${formatCzDate(feature.date)}</span>
        ${featureTopics ? `<span class="hub-feature-topics">${featureTopics}</span>` : ''}
        <span class="hub-feature-cta">Číst →</span>
      </div>
    </a>`;

  trendingEl.innerHTML = trending.map(a => `
    <a href="${esc(a.slug)}" class="hub-trending-card">
      <span class="hub-trending-tag">${esc(a.tag)}</span>
      <h5 class="hub-trending-title">${esc(a.title)}</h5>
      <span class="hub-trending-date">${formatCzDate(a.date)}</span>
    </a>`).join('');
}

/**
 * Curated reading paths — manuálně sestavené tematické cesty.
 * Každá cesta = label, perex, seznam slugs (filtrované proti dostupným článkům).
 */
const READING_PATHS = [
  {
    label: 'Reforma 2026',
    color: 'good',
    perex: 'Sada změn, které přišly s rokem 2026 — pohotovosti, novely zákonů, financování.',
    slugs: [
      'clanek-reforma-pohotovosti-290-2025.html',
      'clanek-financovani-segmenty-2026.html',
      'clanek-deficit-pojisteni-2026.html',
      'clanek-uhradova-vyhlaska.html',
      'clanek-novela-paliativni-pece.html',
      'clanek-novela-elektronizace-2026.html',
    ],
  },
  {
    label: 'Onkologie v Česku',
    color: 'bad',
    perex: 'Od screeningu po centralizaci péče — kde český systém vede a kde zaostává.',
    slugs: [
      'clanek-rakovina-tlusteho-streva.html',
      'clanek-mamograf-rakovina-prsu.html',
      'clanek-cervix-hpv.html',
      'clanek-screening-rakoviny-plic.html',
      'clanek-prezit-rakoviny.html',
      'clanek-onkologicky-koordinator-2026.html',
    ],
  },
  {
    label: 'Životní styl: kde Česko zaostává',
    color: 'warn',
    perex: 'Čtyři rizikové faktory, ve kterých jsme stabilně nad průměrem OECD.',
    slugs: [
      'clanek-alkohol-spotreba.html',
      'clanek-koureni.html',
      'clanek-bmi-obezita.html',
      'clanek-pohyb.html',
    ],
  },
  {
    label: 'Nárok pojištěnce a vize reformy',
    color: 'neutral',
    perex: 'Trilogie o tom, co dnes nárokujete + autorský manifest reformy.',
    slugs: [
      'clanek-narok-pojistence-1-co-to-je.html',
      'clanek-narok-pojistence-2-demograficky-tlak.html',
      'clanek-narok-pojistence-3-co-s-tim.html',
      'clanek-manifest-reforma-zdravotnictvi.html',
    ],
  },
  {
    label: 'Digitalizace zdravotnictví',
    color: 'good',
    perex: 'eHealth, EZKarta, EHDS, telemedicína — kde Česko stojí a kde EU tlačí.',
    slugs: [
      'clanek-ehealth.html',
      'clanek-ezkarta-ehealth.html',
      'clanek-ehds-evropsky-prostor-zdravotni-data.html',
      'clanek-novela-elektronizace-2026.html',
    ],
  },
];

function renderHubPaths(articles) {
  const wrap = document.getElementById('hubPaths');
  if (!wrap) return;
  const bySlug = new Map(articles.map(a => [a.slug, a]));

  const html = READING_PATHS.map(path => {
    const found = path.slugs.map(s => bySlug.get(s)).filter(Boolean);
    if (!found.length) return '';
    const items = found.map(a => `
      <li class="hub-path-item">
        <a href="${esc(a.slug)}">
          <span class="hub-path-item-tag">${esc(a.tag)}</span>
          <span class="hub-path-item-title">${esc(a.title)}</span>
        </a>
      </li>`).join('');
    return `
      <article class="hub-path-card hub-path-card-${esc(path.color)}">
        <h4 class="hub-path-h">${esc(path.label)}</h4>
        <p class="hub-path-perex">${esc(path.perex)}</p>
        <ol class="hub-path-list">${items}</ol>
        <span class="hub-path-count">${found.length} článků</span>
      </article>`;
  }).filter(Boolean).join('');

  wrap.innerHTML = html || '<p class="hub-paths-loading">Žádné cesty zatím nelze sestavit.</p>';
}

/**
 * Vyrenderuje matrix dlaždic — 8 témat s počtem článků.
 * Velikost dlaždice (CSS class) reflektuje počet článků.
 */
function renderHubMatrix(articles) {
  const wrap = document.getElementById('hubMatrix');
  if (!wrap) return;
  const topics = Object.keys(TOPIC_LABELS);
  const counts = new Map(topics.map(t => [t, 0]));
  articles.forEach(a => (a.topics ?? []).forEach(t => {
    if (counts.has(t)) counts.set(t, counts.get(t) + 1);
  }));
  const max = Math.max(...counts.values(), 1);

  const html = topics.map(t => {
    const n = counts.get(t);
    const ratio = n / max;
    let sizeClass = 'hub-matrix-tile-s';
    if (ratio >= 0.66) sizeClass = 'hub-matrix-tile-l';
    else if (ratio >= 0.33) sizeClass = 'hub-matrix-tile-m';
    return `
      <button type="button" class="hub-matrix-tile ${sizeClass}" data-topic="${esc(t)}" aria-label="${esc(TOPIC_LABELS[t])} — ${n} článků">
        <span class="hub-matrix-tile-label">${esc(TOPIC_LABELS[t])}</span>
        <span class="hub-matrix-tile-count">${n}</span>
      </button>`;
  }).join('');
  wrap.innerHTML = html;
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
