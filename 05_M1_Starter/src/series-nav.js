// Sériová navigace pro 9dílnou sérii „Jak (ne)reformovat komplexní systém".
//
// Na stránkách clanek-*.html, které do série patří, vykreslí JEDNOTNÝ seznam
// všech dílů (s názvy) — hned pod hlavičkou článku a znovu na jeho konci.
// Aktuální díl je v obou seznamech zvýrazněn červenou tečkou „jste zde".
//
// Idempotentní: na ne-sériových stránkách (nebo při opakovaném volání) tiše
// skončí. Pořadí a čísla odpovídají samočíslování „díl N/9" uvnitř textů
// (registr viz PLAN-SERIE-REFORMA-KOMPLEXITA.md). Při změně série se edituje
// jen pole SERIES níže — propíše se do všech dílů automaticky.
//
// Respektuje viditelnost (isArticleVisible): díl, který ještě není publikovaný
// (published:false nebo datum v budoucnu), se vykreslí jako neaktivní
// („připravujeme"), nikdy ne jako živý odkaz na draft. Seznam tak zůstává
// konzistentní s hubem i v období, kdy série vychází po částech.

import { isArticleVisible } from './page-shared.js';

// Registr sérií. Každá série = { title, hub, lead, parts:[{n,slug,short}] }.
// `lead` je dovětek za názvem v úvodní větě navigace („… — <lead>:").
// Přidání nové série = přidat objekt do SERIES_REGISTRY; in-article navigace
// ji propíše automaticky do všech jejích dílů (detekce podle slugu).
const REFORM_SERIES = {
  title: 'Jak (ne)reformovat komplexní systém',
  hub: 'clanky.html',
  lead: 'detailního průvodce reformou zdravotního systému v devíti dílech',
  parts: [
    { n: 1, slug: 'clanek-teorie-zmeny.html',               short: 'Teorie změny a logický model' },
    { n: 2, slug: 'clanek-rizeni-podle-vysledku.html',      short: 'Řízení podle výsledků' },
    { n: 3, slug: 'clanek-komplexita-reforem.html',         short: 'Komplexita, chaos a okno příležitosti' },
    { n: 4, slug: 'clanek-systemove-mapovani-paky.html',    short: 'Systémové mapování a páky změny' },
    { n: 5, slug: 'clanek-datova-patere-lock-in.html',      short: 'Datová páteř, interoperabilita a lock-in' },
    { n: 6, slug: 'clanek-ukazatele-dashboard.html',        short: 'Ukazatele a dashboard, který vede k akci' },
    { n: 7, slug: 'clanek-platit-za-vysledek-vbhc.html',    short: 'Platit za výsledek (value-based healthcare)' },
    { n: 8, slug: 'clanek-governance-nezavislost.html',     short: 'Governance a nezávislost měřičů' },
    { n: 9, slug: 'clanek-posledni-mile-implementace.html', short: 'Poslední míle: implementace reforem' },
  ],
};

const EPIDEMIOLOGIE_SERIES = {
  title: 'Epidemiologie: věda, která počítá s nákazou',
  hub: 'clanky.html',
  lead: 'vědeckého seriálu o tom, proč epidemiologii a očkování věřit — s principy k vyzkoušení na simulátoru nedovarenytapir.cz, ve čtyřech dílech',
  parts: [
    { n: 1, slug: 'clanek-epidemiologie-1-proc-verit-cislum.html',  short: 'Proč věřit číslům: od mapy cholery k reprodukčnímu číslu' },
    { n: 2, slug: 'clanek-epidemiologie-2-ockovani-dukaz.html',     short: 'Očkování: nejlépe doložená intervence v dějinách medicíny' },
    { n: 3, slug: 'clanek-epidemiologie-3-modely-rozhodovani.html', short: 'Modely, trasování a krizové rozhodování' },
    { n: 4, slug: 'clanek-epidemiologie-4-nedovera-dezinformace.html', short: 'Jak porazit nedůvěru: váhání s očkováním a dezinformace' },
  ],
};

const NAPOJE_SERIES = {
  title: 'Slazené nápoje, energeťáky a šťávy',
  hub: 'clanky.html',
  lead: 'průvodce nápoji a cukrem s důrazem na děti, v šesti dílech',
  parts: [
    { n: 1, slug: 'clanek-napoje-1-tekuty-cukr.html',    short: 'Tekutý cukr: proč na nápojích záleží víc než na zákusku' },
    { n: 2, slug: 'clanek-napoje-2-mytus-stavy.html',     short: 'Mýtus zdravé šťávy: proč 100% džus není lepší než kola' },
    { n: 3, slug: 'clanek-napoje-3-energetaky-deti.html', short: 'Energetické nápoje: co kofein a cukr dělají dětem' },
    { n: 4, slug: 'clanek-napoje-4-alkohol-mytus.html',   short: 'Pivo, víno a mýtus zdravého alkoholu' },
    { n: 5, slug: 'clanek-napoje-5-co-pit.html',          short: 'Co tedy pít: voda, čaj a (pro dospělé) káva' },
    { n: 6, slug: 'clanek-napoje-6-dan-regulace.html',    short: 'Daň, etikety, automaty: co na slazené nápoje platí' },
  ],
};

const DIGI_SERIES = {
  title: 'Digitální zdravotnictví srozumitelně',
  hub: 'clanky.html',
  lead: 'průvodce digitalizací českého zdravotnictví od papírku po EHDS, v pěti dílech',
  parts: [
    { n: 1, slug: 'clanek-digi-1-co-to-je.html',                short: 'Co to je: od papírku k datům' },
    { n: 2, slug: 'clanek-digi-2-jak-funguje-api.html',         short: 'Jak to funguje: co je API a kde jsou data' },
    { n: 3, slug: 'clanek-digi-3-dve-vrstvy-ncez.html',         short: 'Dvě vrstvy: staré ostrovy a páteř NCEZ' },
    { n: 4, slug: 'clanek-digi-4-povinne-dobrovolne-2026.html', short: 'Co je v roce 2026 povinné a co dobrovolné' },
    { n: 5, slug: 'clanek-digi-5-strategie-ehds-2030.html',     short: 'Kam to směřuje: strategie, EHDS a rok 2030' },
  ],
};

export const SERIES_REGISTRY = [REFORM_SERIES, EPIDEMIOLOGIE_SERIES, NAPOJE_SERIES, DIGI_SERIES];

// Zpětná kompatibilita: hub-rozcestník v clanky.js renderuje 9dílnou reformní
// sérii přes tyto dva exporty — necháváme je ukazovat na ni.
export const SERIES = REFORM_SERIES.parts;
export const SERIES_TITLE = REFORM_SERIES.title;

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function detectArticleSlug() {
  // Vercel servíruje s cleanUrls:true → live cesta je „/clanek-foo" bez .html;
  // lokálně (http-server) je „/clanek-foo.html". Normalizuj na tvar se .html,
  // ať odpovídá slugům v articles.json / registru SERIES.
  const last = (location.pathname || '').split('/').filter(Boolean).pop() || '';
  if (last.startsWith('clanek-')) {
    return last.endsWith('.html') ? last : `${last}.html`;
  }
  const ds = document.body?.dataset?.articleSlug;
  if (ds) return ds;
  return null;
}

/**
 * Sestaví seznam všech dílů série s úvodní větou. Aktuální díl je zvýrazněn
 * červenou tečkou „jste zde", publikované díly jsou odkazy, nepublikované
 * jako neaktivní „připravujeme". Stejný seznam se používá nahoře i dole.
 */
function buildSeriesList(series, idx, isVisible) {
  const items = series.parts.map((d, i) => {
    const isCurrent = i === idx;
    const title = escapeHtml(d.short);
    let body;
    if (isCurrent) {
      body = `<span class="series-toc-title series-toc-title-current">${title}</span>` +
             `<span class="series-toc-here"><span class="series-toc-dot" aria-hidden="true"></span>jste zde</span>`;
    } else if (isVisible(d)) {
      body = `<a class="series-toc-title" href="${d.slug}">${title}</a>`;
    } else {
      body = `<span class="series-toc-title series-toc-title-soon">${title}` +
             `<span class="series-toc-soon">připravujeme</span></span>`;
    }
    return `<li class="series-toc-item${isCurrent ? ' series-toc-item-current' : ''}"${isCurrent ? ' aria-current="step"' : ''}>` +
           `<span class="series-toc-num" aria-hidden="true">${d.n}</span>${body}</li>`;
  }).join('');

  const nav = document.createElement('nav');
  nav.className = 'series-toc';
  nav.dataset.seriesRendered = '1';
  nav.setAttribute('aria-label', `Série: ${series.title}`);
  nav.innerHTML =
    `<p class="series-toc-intro">Tento text je <strong>${series.parts[idx].n}. díl</strong> série ` +
    `<a class="series-toc-series-link" href="${series.hub}">„${escapeHtml(series.title)}"</a> — ` +
    `${escapeHtml(series.lead)}:</p>` +
    `<ol class="series-toc-list">${items}</ol>`;
  return nav;
}

/**
 * Sestaví predikát viditelnosti dílu z articles.json (isArticleVisible).
 * Aktuální díl je vždy viditelný (jsme na něm). Při selhání fetch vrací
 * „vše viditelné" — nav se nikdy kvůli síťové chybě nerozpadne.
 */
async function buildVisibilityPredicate(currentSlug) {
  try {
    const res = await fetch('data/articles.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : (raw.articles || []);
    const bySlug = new Map(arr.map(a => [a.slug, a]));
    return (d) => d.slug === currentSlug || isArticleVisible(bySlug.get(d.slug));
  } catch {
    return () => true; // fallback: neblokuj navigaci kvůli chybě načtení
  }
}

/**
 * Vloží sériovou navigaci do aktuálního článku, pokud patří do série —
 * jednou pod hlavičku a jednou na konec. Idempotentní; volá se z clanky.js
 * auto-bootstrapu.
 */
export async function enhanceSeriesNav() {
  if (typeof document === 'undefined') return;
  const articleEl = document.querySelector('article.article-page');
  if (!articleEl) return;
  if (articleEl.querySelector('[data-series-rendered]')) return;

  const slug = detectArticleSlug();
  if (!slug) return;
  // Najdi sérii, do které článek patří (napříč registrem), a index dílu v ní.
  let series = null, idx = -1;
  for (const s of SERIES_REGISTRY) {
    const i = s.parts.findIndex(d => d.slug === slug);
    if (i !== -1) { series = s; idx = i; break; }
  }
  if (!series) return; // článek není součástí žádné série

  const isVisible = await buildVisibilityPredicate(slug);
  // Re-check idempotence po await (ochrana proti souběžnému volání)
  if (articleEl.querySelector('[data-series-rendered]')) return;

  // Nahoře: hned za hlavičkou článku (pod čarou pod perexem/meta)
  const header = articleEl.querySelector('header.article-header');
  if (header) header.insertAdjacentElement('afterend', buildSeriesList(series, idx, isVisible));

  // Dole: na konci článku — stejný seznam
  const bottom = buildSeriesList(series, idx, isVisible);
  bottom.classList.add('series-toc-bottom');
  articleEl.appendChild(bottom);
}
