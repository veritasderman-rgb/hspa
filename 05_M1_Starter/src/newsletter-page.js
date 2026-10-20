// Stránka Newsletter (newsletter.html): přihlášení k odběru + archiv minulých čísel.
//
// Archiv se renderuje za běhu z data/newsletter-log.json (zdroj pravdy o tom,
// co už odešlo). Provozní poznámky z logu (`note`) se NEZOBRAZUJÍ — jsou
// interní. Názvy článků a indikátorů se berou z data/articles.json a
// data/indicators.json podle slugu / id.
//
// Formulář má jiná ID než formulář v patičce (#newsletterForm) a source
// 'newsletter-page', ale sdílí submitNewsletterSignup (→ /api/subscribe → Brevo).

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible } from './page-shared.js';
import { submitNewsletterSignup } from './newsletter-signup.js';

/** Kolik nejnovějších čísel je vidět hned; zbytek za tlačítkem. */
export const INITIAL_VISIBLE = 6;

/**
 * Položky `articles[]` v logu, které nejsou články (speciální vydání o nových
 * sekcích portálu). Cílová stránka existuje jen pro ty, které jsou zde.
 */
export const SECTION_PAGES = {
  'legislativa': { label: 'Legislativní radar', href: 'legislativa.html' },
  'model-systemu': { label: 'Model systému', href: 'model-systemu.html' },
  'prevence': { label: 'Prevence', href: 'prevence.html' },
};

const TZ = 'Europe/Prague';

/** „26. září 2026“ z ISO data kampaně (časová zóna Praha); null → null. */
export function formatIssueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
}

/** Kalendářní den kampaně (YYYY-MM-DD, Praha) pro atribut datetime. */
export function issueDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('sv-SE', { timeZone: TZ });
}

/**
 * Z logu kampaní a datasetů sestaví veřejný model archivu (nejnovější první).
 * Čistá funkce, testovatelná bez DOM.
 *
 *  - kampaň s `scheduled_for` v budoucnu (naplánovaná, ještě neodeslaná) se
 *    vynechá; úvodní vydání bez data (`scheduled_for: null`) jde na konec
 *  - článek, který není viditelný (draft / budoucí datum), se vypíše bez odkazu
 *  - slug, který není v articles.json ani v SECTION_PAGES, se vynechá
 *  - indikátor, který v indicators.json není, se vynechá
 */
export function buildArchive(log, articles, indicators, now = new Date()) {
  const bySlug = new Map((articles || []).map(a => [a.slug, a]));
  const byId = new Map((indicators || []).map(i => [i.id, i]));
  const campaigns = Array.isArray(log?.campaigns) ? log.campaigns : [];

  const issues = campaigns
    .filter(c => !c.scheduled_for || new Date(c.scheduled_for).getTime() <= now.getTime())
    .map(c => {
      const items = [];
      for (const slug of c.articles || []) {
        const art = bySlug.get(slug);
        if (art) {
          items.push({ kind: 'article', title: art.title || slug, href: isArticleVisible(art, now) ? slug : null });
        } else if (SECTION_PAGES[slug]) {
          items.push({ kind: 'section', title: SECTION_PAGES[slug].label, href: SECTION_PAGES[slug].href });
        }
      }
      const ind = c.featured_indicator ? byId.get(c.featured_indicator) : null;
      return {
        id: c.brevo_campaign_id,
        subject: c.subject || c.name || '',
        iso: c.scheduled_for || null,
        dateLabel: formatIssueDate(c.scheduled_for),
        day: issueDay(c.scheduled_for),
        items,
        indicator: ind ? { id: ind.id, name: ind.name } : null,
      };
    });

  // Nejnovější nahoře; vydání bez data (úvodní) na konci.
  issues.sort((a, b) => {
    if (!a.iso && !b.iso) return 0;
    if (!a.iso) return 1;
    if (!b.iso) return -1;
    return new Date(b.iso).getTime() - new Date(a.iso).getTime();
  });
  return issues;
}

function issueHtml(issue) {
  const date = issue.dateLabel
    ? `<time class="nlp-issue-date" datetime="${escapeHtml(issue.day)}">${escapeHtml(issue.dateLabel)}</time>`
    : '<span class="nlp-issue-date">Úvodní vydání</span>';
  const items = issue.items.map(it => {
    const label = escapeHtml(it.title);
    return it.href
      ? `<li><a href="${escapeHtml(it.href)}">${label}</a></li>`
      : `<li>${label}</li>`;
  }).join('');
  const indicator = issue.indicator
    ? `<p class="nlp-issue-ind"><span class="nlp-issue-ind-label">Indikátor čísla</span> <a href="indicator.html?id=${encodeURIComponent(issue.indicator.id)}">${escapeHtml(issue.indicator.name)}</a></p>`
    : '';
  return `
    <article class="nlp-issue">
      ${date}
      <h3 class="nlp-issue-subject">${escapeHtml(issue.subject)}</h3>
      ${items ? `<ul class="nlp-issue-items">${items}</ul>` : ''}
      ${indicator}
    </article>`;
}

/** HTML celého archivu: prvních INITIAL_VISIBLE čísel + starší za tlačítkem. */
export function archiveHtml(issues) {
  if (!issues.length) return '<p class="nlp-loading">Zatím nebylo odesláno žádné vydání.</p>';
  const head = issues.slice(0, INITIAL_VISIBLE).map(issueHtml).join('');
  const rest = issues.slice(INITIAL_VISIBLE);
  if (!rest.length) return head;
  return `${head}
    <div id="nlpArchiveMore" hidden>${rest.map(issueHtml).join('')}</div>
    <button type="button" class="nlp-more" id="nlpMoreBtn" aria-expanded="false" aria-controls="nlpArchiveMore">Zobrazit starší vydání (${rest.length})</button>`;
}

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function renderArchive() {
  const host = document.getElementById('nlpArchive');
  if (!host) return;
  try {
    const [log, arts, inds] = await Promise.all([
      getJson('data/newsletter-log.json'),
      getJson('data/articles.json'),
      getJson('data/indicators.json'),
    ]);
    const issues = buildArchive(log, arts.articles, inds.indicators);
    host.innerHTML = archiveHtml(issues);
    const btn = document.getElementById('nlpMoreBtn');
    const more = document.getElementById('nlpArchiveMore');
    if (btn && more) {
      btn.addEventListener('click', () => {
        more.hidden = false;
        btn.remove();
      });
    }
  } catch {
    host.innerHTML = '<p class="nlp-loading">Archiv se teď nepodařilo načíst. Zkuste stránku obnovit.</p>';
  }
}

function wireSignupForm() {
  const form = document.getElementById('nlpForm');
  if (!form) return;
  const status = document.getElementById('nlpStatus');
  const consent = document.getElementById('nlpConsent');
  const submitBtn = form.querySelector('.newsletter-submit');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (consent && !consent.checked) {
      if (status) {
        status.textContent = 'Pro přihlášení potřebujeme váš souhlas se zpracováním e-mailu.';
        status.dataset.tone = 'error';
      }
      consent.focus();
      return;
    }
    const email = form.querySelector('#nlpEmail')?.value?.trim();
    if (!email) return;
    if (status) {
      status.textContent = 'Přihlašujeme…';
      status.dataset.tone = 'info';
    }
    if (submitBtn) submitBtn.disabled = true;
    const result = await submitNewsletterSignup(email, 'newsletter-page');
    if (status) {
      status.textContent = result.message;
      status.dataset.tone = result.ok ? 'info' : 'error';
    }
    if (result.ok) {
      form.reset();
      if (consent) consent.checked = false;
    } else if (submitBtn) {
      submitBtn.disabled = false;
    }
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // popups: 'manual' — na stránce samotného newsletteru nevyskakuje nabídka newsletteru.
  renderModuleNav('about', { popups: 'manual' });
  renderMastheadDate();
  wireSignupForm();
  renderArchive();
}
