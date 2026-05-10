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
  injectScrollToTop();
}

/**
 * Injectuje fixed scroll-to-top tlačítko do <body>. Zviditelní se po
 * rolování pod prahovou hodnotu (400px). Klik plynule scrolluje nahoru,
 * respektuje prefers-reduced-motion. Idempotent — re-volání nevytvoří
 * duplikát.
 */
export function injectScrollToTop() {
  if (typeof window === 'undefined' || document.getElementById('scrollTopBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'scrollTopBtn';
  btn.className = 'scroll-top-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Zpět nahoru');
  btn.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(btn);

  const THRESHOLD = 400;
  const updateVisible = () => {
    const visible = window.scrollY > THRESHOLD
      && !document.body.classList.contains('mobile-nav-open');
    btn.classList.toggle('visible', visible);
    btn.tabIndex = visible ? 0 : -1;
    btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };
  window.addEventListener('scroll', updateVisible, { passive: true });
  // Také reagujeme na otevření/zavření mobilního drawer (toggle body class)
  const observer = new MutationObserver(updateVisible);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  updateVisible();

  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
}

/**
 * Vyplní sdílenou patičku do elementu #siteFooter na každé stránce.
 */
export function renderFooter(el = document.getElementById('siteFooter')) {
  if (!el) return;
  el.innerHTML = `
    <aside class="newsletter-block" aria-labelledby="newsletterHead">
      <div class="newsletter-inner">
        <div class="ed-kicker">Newsletter</div>
        <h3 class="newsletter-h" id="newsletterHead">Co se v dashboardu hýbe — bez spamu</h3>
        <p class="newsletter-lead">
          Krátký přehled, co je nového: které články vyšly, kde se data změnila, na čem se v projektu pracuje. Maximálně 1× měsíčně. Bez sledovacích pixelů, bez sdílení s třetími stranami.
        </p>

        <!--
          MailerLite — account 2206303, form 186842930008294691.
          Vlastní HTML formulář POSTuje přímo na MailerLite jsonp endpoint
          (target="_blank" → MailerLite po submitu otevře vlastní confirm
          stránku v novém okně). Žádný iframe, žádný external script —
          obejdeme tím X-Frame-Options/CSP omezení i nutnost Universal.js.

          Pokud tento POST nebude fungovat (form v MailerLite UI je třeba
          nakonfigurovaný jako „Embedded" typ s povoleným externím POST),
          stačí nahradit obsah <div id="newsletterMailerLite"> za HTML
          z MailerLite Forms → daný formulář → Embed → Use HTML.
        -->
        <div class="newsletter-form-slot" id="newsletterMailerLite">
          <form
            class="newsletter-form"
            action="https://assets.mailerlite.com/jsonp/2206303/forms/186842930008294691/subscribe"
            method="post"
            target="_blank"
            id="newsletterForm">
            <label for="nlEmail" class="sr-only">E-mail</label>
            <input
              type="email"
              id="nlEmail"
              name="fields[email]"
              placeholder="vase@email.cz"
              autocomplete="email"
              required>
            <input type="hidden" name="ml-submit" value="1">
            <input type="hidden" name="anticsrf" value="true">
            <button type="submit" class="newsletter-submit">Přihlásit se</button>
          </form>
          <label class="newsletter-consent">
            <input type="checkbox" id="nlConsent" required>
            <span>Souhlasím se zasíláním novinek a se zpracováním e-mailu výhradně pro tento účel.</span>
          </label>
          <p class="newsletter-status" id="newsletterStatus" role="status" aria-live="polite"></p>
        </div>

        <p class="newsletter-foot">
          Provozováno přes MailerLite. Po odeslání se v novém okně otevře potvrzení od MailerLite. Více v <a href="o-projektu.html">O projektu</a>.
        </p>
      </div>
    </aside>

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
  injectScrollToTop();
  wireNewsletterForm();
}

/**
 * Validuje GDPR consent před tím, než formulář odešle POST na MailerLite.
 * Native HTML required atribut pokryje validaci e-mailu; my doplňujeme
 * jen consent gating (browser by ho zablokoval taky, ale chceme přátelskou hlášku).
 */
function wireNewsletterForm() {
  if (typeof window === 'undefined') return;
  const form = document.getElementById('newsletterForm');
  if (!form || form.dataset.wired === '1') return;
  form.dataset.wired = '1';
  const status = document.getElementById('newsletterStatus');
  const consent = document.getElementById('nlConsent');
  form.addEventListener('submit', e => {
    if (consent && !consent.checked) {
      e.preventDefault();
      if (status) {
        status.textContent = 'Pro přihlášení potřebujeme váš souhlas se zpracováním e-mailu.';
        status.dataset.tone = 'error';
      }
      consent.focus();
      return;
    }
    if (status) {
      status.textContent = 'Otevíráme potvrzení od MailerLite v novém okně. Zkontrolujte prosím schránku — pošleme vám potvrzovací e-mail (double opt-in).';
      status.dataset.tone = 'info';
    }
  });
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
    { id: 'hspa-prehled', label: 'HSPA přehled',           href: 'hspa-prehled.html',       match: ['hspa-prehled.html'] },
    { id: 'kraje',       label: 'Krajský pohled',          href: 'kraje.html',              match: ['kraje.html'] },
    { id: 'pojistenci',  label: 'Pojištěnci',              href: 'pojistenci.html',         match: ['pojistenci.html'] },
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
  const tabsHtml = tabs.map(t => {
    const active = activeId
      ? t.id === activeId
      : t.match.some(m => path.endsWith(m));
    return `<a href="${t.href}" class="module-tab${active ? ' active' : ''}">${t.label}</a>`;
  }).join('');
  container.innerHTML = tabsHtml;

  injectMobileNav(tabsHtml);
}

/**
 * Injectuje hamburger tlačítko do topbaru a slide-in drawer s navigací do <body>.
 * Aktivní jen na mobilním viewportu (<720px) přes CSS. Idempotent — re-render
 * neduplikuje markup, jen přepíše obsah drawer-listu.
 */
function injectMobileNav(tabsHtml) {
  const topbar = document.querySelector('header.topbar');
  if (!topbar) return;

  let toggle = document.getElementById('mobileNavToggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'mobileNavToggle';
    toggle.className = 'mobile-nav-toggle';
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-label', 'Otevřít menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mobileNavDrawer');
    toggle.innerHTML = `
      <span class="mobile-nav-toggle-bars" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>`;
    topbar.appendChild(toggle);
  }

  let drawer = document.getElementById('mobileNavDrawer');
  let backdrop = document.getElementById('mobileNavBackdrop');
  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobileNavBackdrop';
    backdrop.className = 'mobile-nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    drawer = document.createElement('aside');
    drawer.id = 'mobileNavDrawer';
    drawer.className = 'mobile-nav-drawer';
    drawer.setAttribute('aria-label', 'Hlavní menu');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="mobile-nav-drawer-head">
        <span class="mobile-nav-drawer-title">Menu</span>
        <button type="button" class="mobile-nav-close" aria-label="Zavřít menu">×</button>
      </div>
      <nav class="mobile-nav-list" aria-label="Stránky"></nav>`;
    document.body.appendChild(drawer);
  }
  drawer.querySelector('.mobile-nav-list').innerHTML = tabsHtml;

  if (toggle.dataset.wired === '1') return;
  toggle.dataset.wired = '1';

  const open = () => {
    document.body.classList.add('mobile-nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    const firstLink = drawer.querySelector('a, button');
    firstLink?.focus();
  };
  const close = () => {
    document.body.classList.remove('mobile-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    toggle.focus();
  };
  toggle.addEventListener('click', () => {
    document.body.classList.contains('mobile-nav-open') ? close() : open();
  });
  drawer.querySelector('.mobile-nav-close').addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('mobile-nav-open')) close();
  });
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

/**
 * Vyrenderuje inline markdown z textu — nejprve escapuje HTML, pak nahradí:
 *   - **bold** → <strong>bold</strong>
 *   - *italic* / _italic_ → <em>italic</em>
 *   - `code` → <code>code</code>
 *   - jednoduché URL (http/https) → <a>...</a>
 * Vrací HTML string připravený pro innerHTML.
 *
 * Pro odstavcový/seznamový markdown použijte renderBlockMarkdown.
 */
export function renderInlineMarkdown(s) {
  if (s == null) return '';
  let html = escapeHtml(String(s));
  // Inline code
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
  // Bold (**text** or __text__) — non-greedy
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
  // Italic (single * or _) — vyhne se případům s mezerami u hvězdiček (násobení apod.)
  html = html.replace(/(^|[\s(\[])\*([^*\n]+?)\*(?=$|[\s.,;:!?)\]])/g, '$1<em>$2</em>');
  html = html.replace(/(^|[\s(\[])_([^_\n]+?)_(?=$|[\s.,;:!?)\]])/g, '$1<em>$2</em>');
  return html;
}

/**
 * Detekuje paragraf s inline číslovanou/písmennou výčetkou typu
 * "intro: (1) první ... (2) druhý ... (3) třetí" a převádí ji na proper
 * <ol> seznam. Vrací { intro, items, isNum } nebo null.
 *
 * Bezpečnost: vyžaduje sekvenční markery (1,2,3 nebo a,b,c) bez přeskoků,
 * minimálně 2 markery. Markery musí být odděleny whitespace nebo na začátku.
 * Aby se nesplelo s odkazy typu "§3 odst. 1" (bez závorek), pracujeme jen
 * se závorkovou notací (X).
 */
export function detectInlineEnumeration(text) {
  if (!text || typeof text !== 'string') return null;
  // Normalizace: data občas markují celý "(1) Topic" jako tučný span:
  //   **(1) demografie** — text...   →   (1) **demografie** — text...
  // To pomůže detektoru a zároveň zachová bold u topic.
  text = text.replace(/\*\*\(([0-9a-z])\)\s+([^*]+?)\*\*/g, '($1) **$2**');
  // Případy, kdy je tučný jen marker:  **(1)** text  → (1) text
  text = text.replace(/\*\*\(([0-9a-z])\)\*\*/g, '($1)');

  const markerRe = /(^|[\s])\(([0-9]|[a-z])\)\s/g;
  const markers = [];
  let m;
  while ((m = markerRe.exec(text)) !== null) {
    markers.push({ token: m[2], start: m.index + m[1].length, end: m.index + m[0].length });
  }
  if (markers.length < 2) return null;

  const isNum = /^\d$/.test(markers[0].token);
  for (let i = 0; i < markers.length; i++) {
    const expected = isNum ? String(i + 1) : String.fromCharCode(97 + i);
    if (markers[i].token !== expected) return null;
  }

  const intro = text.slice(0, markers[0].start).trim();
  const items = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length;
    let item = text.slice(start, end).trim();
    item = item.replace(/[;,]\s*$/, '');
    items.push(item);
  }
  return { intro, items, isNum };
}

/**
 * Vyrenderuje blokový markdown:
 *   - dvojitý newline → odstavec
 *   - řádky začínající `- ` nebo `* ` → <ul><li>
 *   - řádky začínající `1. ` (číslo + tečka) → <ol><li>
 *   - paragrafy s inline výčetkou (1)…(2)…(3) nebo (a)…(b)… se převádí
 *     na proper <ol class="md-enum"> s case-insensitive bold prefixem
 *     u "Topic — rest" položek.
 * Inline markdown se aplikuje uvnitř.
 */
export function renderBlockMarkdown(s) {
  if (s == null) return '';
  const text = String(s).replace(/\r\n/g, '\n');
  if (!text.trim()) return '';

  const blocks = /\n/.test(text) ? text.split(/\n{2,}/) : [text];

  return blocks.map(block => {
    const lines = block.split('\n');
    const ulMatch = lines.length > 0 && lines.every(l => /^\s*[-*]\s+/.test(l));
    const olMatch = lines.length > 0 && lines.every(l => /^\s*\d+\.\s+/.test(l));
    if (ulMatch) {
      return `<ul>${lines.map(l => `<li>${renderInlineMarkdown(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    if (olMatch) {
      return `<ol>${lines.map(l => `<li>${renderInlineMarkdown(l.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    }
    const joined = lines.join(' ');

    // Inline výčetka: "intro: (1) … (2) … (3) …"
    const enum_ = detectInlineEnumeration(joined);
    if (enum_) {
      const intro = enum_.intro
        ? `<p>${renderInlineMarkdown(enum_.intro)}</p>`
        : '';
      const lis = enum_.items.map(item => {
        const html = renderInlineMarkdown(item);
        // Zvýrazni první "Topic —/–/-" prefix tučně, pokud už není
        const boldedHtml = boldEnumPrefix(html);
        return `<li>${boldedHtml}</li>`;
      }).join('');
      const tag = enum_.isNum ? 'ol' : 'ol';
      const cls = enum_.isNum ? 'md-enum md-enum-num' : 'md-enum md-enum-alpha';
      return `${intro}<${tag} class="${cls}"${enum_.isNum ? '' : ' style="list-style-type:lower-alpha"'}>${lis}</${tag}>`;
    }

    return `<p>${renderInlineMarkdown(joined)}</p>`;
  }).join('');
}

/**
 * Pokud má položka tvar "Topic — rest" (em-dash, en-dash nebo hyphen),
 * obalí Topic do <strong>. Pokud už <strong> obsahuje, ponechá beze změny.
 * Vstup je už HTML escaped + markdown processed.
 */
function boldEnumPrefix(html) {
  if (/^<strong>/i.test(html.trim())) return html;
  // Hledáme první výskyt — nebo – nebo - (mezi mezerami) v rozumné vzdálenosti
  const m = html.match(/^([^—–\-]{2,80})\s+([—–\-])\s+(.+)$/s);
  if (!m) return html;
  const topic = m[1].trim();
  // Pokud topic obsahuje HTML značky (kromě inline jako <em>, <code>) — neformátujeme
  if (/<\/?(p|ol|ul|li|br|div)/i.test(topic)) return html;
  // První písmeno na velké
  const cap = topic.charAt(0).toLocaleUpperCase('cs-CZ') + topic.slice(1);
  return `<strong>${cap}</strong> ${m[2]} ${m[3]}`;
}
