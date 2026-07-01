// Bootstrap stránek sekce Články: úvodní listing i jednotlivé články.
import './analytics.js';
import { renderModuleNav, renderMastheadDate, loadGlossaryTerms, isArticleVisible } from './page-shared.js';
import { enhanceArticleVisuals } from './article-visuals.js';
import { enhanceArticleToc } from './article-toc.js';
import { enhanceInlineGlossary } from './glossary-inline.js';
import { enhanceArticleRelated } from './article-related.js';
import { enhanceArticleShare } from './article-share.js';
import { enhanceSeriesNav, SERIES, SERIES_TITLE } from './series-nav.js';

renderModuleNav('articles');
renderMastheadDate();
populateWaffles();
enhanceArticleVisuals();
injectAiDisclaimer();
enhanceArticleToc(); // bezpečné: na hub stránce neudělá nic (chybí .article-page)
loadGlossaryTerms().then(terms => enhanceInlineGlossary(terms)).catch(() => {});
loadAndRenderArticles();
enhanceSeriesNav();  // číslovaná navigace série na dílech (idempotent, jinak no-op)
enhanceArticleRelated(); // generuje "Příbuzné sekce" na clanek-*.html (idempotent)
enhanceArticleShare();   // sdílecí pásek pod článkem (idempotent, na hubu no-op)

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
  // Manifest je politický text autorů (Pavlovic, Malíková, ČPS), ne text psaný
  // Florence (AI) — autorská byline „Tento článek nepíše člověk" sem nepatří.
  const isManifest = !!document.querySelector('article.article-page-manifest');
  if (isManifest) return;
  // Výjimka: článek psaný člověkem (ne Florence) — označen data-author="human"
  // na <article> nebo <meta name="hspa-author" content="human">. Byline se nevkládá.
  const humanAuthored = !!document.querySelector('article.article-page[data-author="human"]')
    || !!document.querySelector('meta[name="hspa-author"][content="human"]');
  if (humanAuthored) return;

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
      <img class="ai-disclaimer-icon" src="assets/authors/florence-avatar-192.jpg" srcset="assets/authors/florence-avatar-96.jpg 96w, assets/authors/florence-avatar-192.jpg 192w, assets/authors/florence-avatar-320.jpg 320w" width="64" height="64" alt="Florence — AI autorka portálu" loading="lazy" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex:0 0 auto">
      <div class="ai-disclaimer-body">
        <h3 class="ai-disclaimer-h" id="aiDisclaimerHubH">Tyto články píšu já, Florence. Nespím. Nepiju kávu. A mám nezdravě vřelý vztah k tabulkám.</h3>
        <p class="ai-disclaimer-lead">
          <strong>Tyto texty nepíše člověk.</strong> Píše je <strong>Florence</strong> — tedy já, AI autorka tohoto portálu a alter ego Claude.ai — z čerstvého datového balíčku, který v noci sesbíral automatizovaný bot z ÚZIS, ČSÚ, OECD, Eurostatu a Sbírky zákonů (cron 06:00 UTC). Berte mě jako kolegyni z analytického oddělení, která sice přečetla celý internet, ale občas u nějakého čísla zakopne. Proto pod každou statistikou v článku najdete odkaz na primární zdroj. Jméno nesu po Florence Nightingale — <a href="autor-florence.html">proč zrovna po ní? →</a>
        </p>
        <details class="ai-disclaimer-more">
          <summary>Proč to děláme a jak to celé funguje — rozbalit celé vysvětlení</summary>
          <p class="ai-disclaimer-lead">
            Většina textů v této rubrice nevzniká nad ranním espressem, s mírně dramatickým pohledem z okna a pocitem, že české zdravotnictví konečně někdo pochopil. <strong>Vzniká trochu jinak.</strong>
          </p>
          <p class="ai-disclaimer-lead">
            Každou noc se spouští automatizovaný bot, který se s trpělivostí účetního a odhodláním viktoriánského průzkumníka vydává do českých i mezinárodních databází. Prochází aktuální data z ÚZIS, ČSÚ, OECD, Eurostatu a tiskové zprávy Ministerstva zdravotnictví. Sbírá čísla, hledá souvislosti, porovnává trendy a snaží se z toho všeho vydolovat něco, co by šlo ráno číst bez nutnosti dát si tři analgetika. Kolega, kterého si vážím — odvádí tu část práce, při které bych se možná začala nudit, kdybych se uměla nudit.
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
            <strong>Nejsem bezchybná.</strong> Pokud na chybu narazíte, prosím <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">nahlaste ji přes GitHub Issues</a> nebo e-mailem. Opravujeme transparentně přes commit historii. <em>Důvěřujte, ale ověřujte.</em>
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
      <img class="ai-disclaimer-avatar" src="assets/authors/florence-avatar-96.jpg" srcset="assets/authors/florence-avatar-96.jpg 96w, assets/authors/florence-avatar-192.jpg 192w" width="48" height="48" alt="Florence — AI autorka" loading="lazy" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex:0 0 auto;align-self:flex-start">
      <span class="ai-disclaimer-text">
        <strong>Autorka: Florence</strong> — AI agentka a spoluautorka skorezdravotnictvi.cz, pojmenovaná po Florence Nightingale, která jako jedna z prvních použila statistiku a graf (svůj „růžicový" diagram připomínající kompas), aby čísly a jejich grafickou interpretací přesvědčila vládu o reformě zdravotní péče. Florence je alter ego Claude.ai — prochází statistiky, generuje články a snaží se udržet prst na tepu doby tempem, které by pro člověka bylo vražedné. Jako každá AI se ale může splést, proto pod každou statistikou najdete odkaz na primární zdroj. <a href="autor-florence.html" style="white-space:normal">Chcete vědět víc o životě této úžasné ženy? Klikněte zde →</a> · <a href="https://github.com/veritasderman-rgb/hspa/issues" target="_blank" rel="noopener">Nahlásit chybu ↗</a>
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

  // Rubriky = páteř hubu. Načti definice; bez nich se sekce rubrik gracefully
  // nevykreslí (datová vrstva z F1, data/rubrics.json).
  let rubrics = [];
  try {
    const rres = await fetch('data/rubrics.json');
    if (rres.ok) rubrics = (await rres.json()).rubrics ?? [];
  } catch { /* hub rubrik se nevykreslí, archiv funguje dál */ }

  // === HUB komponenty (hero stats, poslední zprávy, kontext, rubriky) ===
  renderHubStats(articles, allEntries);
  renderHubLatest(articles);
  renderHubSeries(articles);
  renderHubEssentials(articles, rubrics);
  renderHubRubrics(articles, rubrics);

  // === Filtrovaný archiv s pagination + search (filtr podle rubriky) ===
  let activeRubric = 'all';
  let searchQuery = '';
  let pageSize = 12;
  const empty = document.getElementById('articleListEmpty');
  const controls = document.getElementById('hubListControls');
  const moreBtn = document.getElementById('hubListMore');
  const progressEl = document.getElementById('hubListProgress');

  function applyFilters() {
    let filtered = activeRubric === 'all'
      ? articles
      : articles.filter(a => a.rubric === activeRubric);
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
    const coverSrc = a.slug ? `assets/covers/${a.slug.replace(/\.html$/, '.png')}` : '';
    // Cover obrázek: nahrazujeme `onerror` handlerem, který přidá rodičovskému
    // <li> třídu `.article-list-item-no-cover` — CSS pak collapsne image kolonu.
    const coverHtml = coverSrc
      ? `<img class="article-list-cover" src="${esc(coverSrc)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.article-list-item').classList.add('article-list-item-no-cover'); this.remove();">`
      : '';
    return `
      <li class="${itemCls}">
        <a href="${esc(a.slug)}" class="article-list-link">
          ${coverHtml}
          <div class="article-list-body">
            <div class="article-list-meta">
              <span class="article-list-num">${esc(a.number)}</span>
              <span class="${tagCls}">${esc(a.tag)}</span>
              <span class="article-list-date">${formatCzDate(a.date)}</span>
            </div>
            <h4 class="article-list-title">${esc(a.title)}</h4>
            <p class="article-list-perex">${esc(a.perex ?? '')}</p>
            ${topicChips ? `<div class="article-list-topics">${topicChips}</div>` : ''}
            <span class="article-list-cta">${cta}</span>
          </div>
        </a>
      </li>`;
  }

  // Spočítáme counts a zaktualizujeme čísla v chip (podle rubriky)
  function updateCounts() {
    document.querySelectorAll('.topic-count[data-count-for]').forEach(el => {
      const t = el.dataset.countFor;
      const n = t === 'all'
        ? articles.length
        : articles.filter(a => a.rubric === t).length;
      el.textContent = n;
    });
  }

  // Aktivuje filtr archivu na danou rubriku (sdílené chipy i kartami rubrik)
  function selectRubric(rubric, { scroll = false } = {}) {
    activeRubric = rubric;
    pageSize = 12; // reset pagination on filter change
    document.querySelectorAll('.topic-chip').forEach(b =>
      b.classList.toggle('active', b.dataset.rubric === rubric));
    render();
    const newHash = rubric === 'all' ? '' : `#rubric=${encodeURIComponent(rubric)}`;
    history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
    if (scroll) {
      document.querySelector('.article-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Wire chip clicks (filtr podle rubriky)
  document.querySelectorAll('.topic-chip[data-rubric]').forEach(btn => {
    btn.addEventListener('click', () => selectRubric(btn.dataset.rubric));
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

  // Pozn.: karty rubrik odkazují na rubrika.html?id=… (samostatná stránka, F3);
  // in-page filtr archivu řídí chipy (selectRubric) a hash #rubric=… níže.

  // Read initial rubric from URL hash (#rubric=... ; #topic=... jako legacy alias)
  const hashMatch = window.location.hash.match(/(?:rubric|topic)=([^&]+)/);
  if (hashMatch) {
    const initial = decodeURIComponent(hashMatch[1]);
    const btn = document.querySelector(`.topic-chip[data-rubric="${cssEscape(initial)}"]`);
    if (btn) {
      activeRubric = initial;
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
 * Poslední zprávy — nejnovější článek jako hero + 6 dalších (celkem 7).
 */
function renderHubLatest(articles) {
  const featureEl = document.getElementById('hubFeature');
  const trendingEl = document.getElementById('hubTrending');
  if (!featureEl || !trendingEl) return;
  if (!articles.length) {
    featureEl.innerHTML = '<p class="hub-feature-loading">Žádné články k zobrazení.</p>';
    trendingEl.innerHTML = '';
    return;
  }

  const stripEl = document.getElementById('hubLatestStrip');
  const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : (s ?? ''));

  const [feature, ...rest] = articles;
  const trending = rest.slice(0, 4);   // vyplní výšku hero sloupce
  const strip = rest.slice(4, 8);      // spodní 4sloupcový pruh

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

  if (stripEl) {
    stripEl.innerHTML = strip.map(a => `
      <a href="${esc(a.slug)}" class="hub-latest-card">
        <span class="hub-latest-card-tag">${esc(a.tag)}</span>
        <h5 class="hub-latest-card-title">${esc(a.title)}</h5>
        <p class="hub-latest-card-perex">${esc(clip(a.perex, 110))}</p>
        <span class="hub-latest-card-date">${formatCzDate(a.date)}</span>
      </a>`).join('');
  }
}

/**
 * Kontext, který musíte znát — kurátorovaný evergreen (články s
 * pinned_essential: true v articles.json). Pořadí podle data (nejnovější
 * první). Když redakce žádný nevybere, sekce se skryje.
 */
/**
 * Rozcestník 9dílné série „Jak (ne)reformovat komplexní systém". Registr dílů
 * (pořadí, slug, název) je sdílený se sériovou navigací v článcích
 * (src/series-nav.js) — jediný zdroj pravdy. Respektuje viditelnost: díl, který
 * není v `articles` (= isArticleVisible=false), se vykreslí jako neaktivní
 * „připravujeme". Sekce se skryje, dokud není viditelný ani jeden díl.
 */
function renderHubSeries(articles) {
  const section = document.querySelector('.hub-series-section');
  const wrap = document.getElementById('hubSeries');
  if (!wrap) return;

  const visible = new Set(articles.map(a => a.slug));
  if (!SERIES.some(d => visible.has(d.slug))) {
    if (section) section.classList.add('hidden');
    wrap.innerHTML = '';
    return;
  }
  if (section) section.classList.remove('hidden');

  wrap.innerHTML = SERIES.map(d => {
    if (visible.has(d.slug)) {
      return `<li><a href="${esc(d.slug)}" class="hub-series-card">
        <span class="hub-series-num">${d.n}</span>
        <span class="hub-series-card-title">${esc(d.short)}</span>
      </a></li>`;
    }
    return `<li><span class="hub-series-card hub-series-card-soon" aria-disabled="true">
      <span class="hub-series-num">${d.n}</span>
      <span class="hub-series-card-title">${esc(d.short)}<span class="hub-series-soon">připravujeme</span></span>
    </span></li>`;
  }).join('');
}

function renderHubEssentials(articles, rubrics) {
  const section = document.querySelector('.hub-essentials-section');
  const wrap = document.getElementById('hubEssentials');
  if (!wrap) return;
  const rubricLabel = new Map((rubrics ?? []).map(r => [r.id, r.label]));

  const essentials = articles.filter(a => a.pinned_essential === true).slice(0, 6);
  if (!essentials.length) {
    // Žádný evergreen vybraný → sekci skryj (nezůstane prázdný nadpis).
    if (section) section.classList.add('hidden');
    wrap.innerHTML = '';
    return;
  }
  if (section) section.classList.remove('hidden');

  wrap.innerHTML = essentials.map(a => `
    <a href="${esc(a.slug)}" class="hub-essential-card">
      <span class="hub-essential-kicker">${esc(rubricLabel.get(a.rubric) ?? a.tag ?? '')}</span>
      <h4 class="hub-essential-title">${esc(a.title)}</h4>
      <p class="hub-essential-perex">${esc(a.perex ?? '')}</p>
      <span class="hub-essential-cta">Číst →</span>
    </a>`).join('');
}

/**
 * Rubriky — páteř hubu. 8 karet (pořadí podle rubrics.json), každá s
 * narativním intro, počtem článků, 3 nejnovějšími a odkazem do archivu
 * filtrovaného na rubriku.
 */
function renderHubRubrics(articles, rubrics) {
  const wrap = document.getElementById('hubRubrics');
  if (!wrap) return;
  if (!rubrics || !rubrics.length) {
    wrap.innerHTML = '<p class="hub-paths-loading">Rubriky se nepodařilo načíst.</p>';
    return;
  }

  // Články seskupené podle rubriky (articles jsou už seřazené nejnovější první)
  const byRubric = new Map();
  for (const a of articles) {
    if (!byRubric.has(a.rubric)) byRubric.set(a.rubric, []);
    byRubric.get(a.rubric).push(a);
  }

  const sorted = [...rubrics].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  wrap.innerHTML = sorted.map(r => {
    const items = byRubric.get(r.id) ?? [];
    const latest = items.slice(0, 3).map(a => `
      <li class="hub-rubric-item">
        <a href="${esc(a.slug)}">
          <span class="hub-rubric-item-date">${formatCzDate(a.date)}</span>
          <span class="hub-rubric-item-title">${esc(a.title)}</span>
        </a>
      </li>`).join('');
    return `
      <article class="hub-rubric-card hub-rubric-${esc(r.color)}">
        <div class="hub-rubric-kicker">${esc(r.kicker)}</div>
        <h4 class="hub-rubric-h">${esc(r.headline)}</h4>
        <p class="hub-rubric-lead">${esc(r.lead)}</p>
        <ul class="hub-rubric-list">${latest}</ul>
        <a class="hub-rubric-more" href="rubrika.html?id=${esc(r.id)}">
          Všech ${items.length} článků v rubrice ${esc(r.label)} →
        </a>
      </article>`;
  }).join('');
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
