// Glosářový popover — vysvětlení pojmu přímo u slova, bez odskoku.
//
// Inline glosář (glossary-inline.js) označí první výskyt každého hesla jako
// <abbr class="gloss-term" data-gloss-key="…">. Tento modul k němu přidá
// kartu, která se rozbalí po najetí myší, po fokusu z klávesnice nebo po
// ťuknutí na dotykovém displeji (klik přepíná): heslo, plný název, krátká
// definice a odkaz na celé heslo v glosáři. Jedna karta pro celou stránku,
// idempotentní inicializace. Nativní `title` se u označených pojmů ruší,
// aby se nezobrazovaly dva tooltipy. Čistá část (positionFor) je testovaná.
// Používají herní stránky (Tři židle); články zatím nechávají nativní title.

const POP_ID = 'glossPop';
const SHOW_DELAY_MS = 90;
const HIDE_DELAY_MS = 160;
const GUTTER = 12;

/**
 * Umístění karty vůči kotvě (fixed souřadnice). Preferuje místo pod slovem,
 * nad ním jen když se dolů nevejde; vodorovně se drží levého okraje slova
 * a nikdy nepřeteče viewport (okraj GUTTER).
 * @param {{left:number, top:number, width:number, height:number}} anchor
 * @param {{width:number, height:number}} pop
 * @param {{width:number, height:number}} viewport
 * @returns {{left:number, top:number, placement:'below'|'above'}}
 */
export function positionFor(anchor, pop, viewport) {
  const maxLeft = Math.max(GUTTER, viewport.width - pop.width - GUTTER);
  const left = Math.min(Math.max(GUTTER, anchor.left), maxLeft);
  const belowTop = anchor.top + anchor.height + 8;
  const fitsBelow = belowTop + pop.height + GUTTER <= viewport.height;
  const aboveTop = anchor.top - pop.height - 8;
  if (fitsBelow || aboveTop < GUTTER) {
    return { left, top: Math.max(GUTTER, belowTop), placement: 'below' };
  }
  return { left, top: aboveTop, placement: 'above' };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Zapne popover pro .gloss-term v daných scopech.
 * @param {Array<{key:string, full?:string, short_def?:string, anchor?:string}>} terms
 * @param {{scopeSelector?: string, glossaryHref?: string}} [opts]
 */
export function initGlossaryPopover(terms, { scopeSelector = '[data-gloss-scope]', glossaryHref = 'glosar.html' } = {}) {
  if (typeof document === 'undefined' || !Array.isArray(terms) || !terms.length) return null;
  const byKey = new Map(terms.map(t => [t.key, t]));

  // Označené pojmy: fokusovatelné, bez nativního title (karta ho nahrazuje)
  document.querySelectorAll(`${scopeSelector} .gloss-term`).forEach((el) => {
    if (el.dataset.glossPop === '1') return;
    el.dataset.glossPop = '1';
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (el.title) { el.dataset.glossTitle = el.title; el.removeAttribute('title'); }
  });

  let pop = document.getElementById(POP_ID);
  if (pop) return pop; // už inicializováno (idempotentní)

  pop = document.createElement('div');
  pop.id = POP_ID;
  pop.className = 'gloss-pop';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.appendChild(pop);

  let current = null; // aktuální kotva
  let showTimer = null;
  let hideTimer = null;
  let pinned = false; // otevřeno ťuknutím/klikem — nezavírá se po odjetí myši

  const render = (term) => {
    pop.innerHTML = `
      <span class="gloss-pop-key">${esc(term.display || term.key)}</span>
      ${term.full && term.full !== (term.display || term.key) ? `<span class="gloss-pop-full">${esc(term.full)}</span>` : ''}
      <p class="gloss-pop-def">${esc(term.short_def || '')}</p>
      ${term.anchor ? `<a class="gloss-pop-link" href="${esc(glossaryHref)}#${esc(term.anchor)}">Celé heslo v glosáři →</a>` : ''}`;
  };

  const place = () => {
    if (!current) return;
    const a = current.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    const pos = positionFor(
      { left: a.left, top: a.top, width: a.width, height: a.height },
      { width: p.width, height: p.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    pop.style.left = `${Math.round(pos.left)}px`;
    pop.style.top = `${Math.round(pos.top)}px`;
    pop.dataset.placement = pos.placement;
  };

  const show = (el) => {
    const term = byKey.get(el.dataset.glossKey);
    if (!term) return;
    if (current && current !== el) current.removeAttribute('aria-describedby');
    current = el;
    el.setAttribute('aria-describedby', POP_ID);
    render(term);
    pop.hidden = false;
    pop.style.maxWidth = `${Math.min(340, window.innerWidth - 2 * GUTTER)}px`;
    place();
    pop.classList.add('gloss-pop--visible');
  };

  const hide = () => {
    pinned = false;
    if (current) current.removeAttribute('aria-describedby');
    current = null;
    pop.classList.remove('gloss-pop--visible');
    pop.hidden = true;
  };

  const scheduleShow = (el) => {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(el), SHOW_DELAY_MS);
  };
  const scheduleHide = () => {
    clearTimeout(showTimer);
    if (pinned) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  };

  const termOf = (target) => target?.closest?.(`${scopeSelector} .gloss-term[data-gloss-pop="1"]`) || null;

  document.addEventListener('mouseover', (e) => {
    const el = termOf(e.target);
    if (el) scheduleShow(el);
    else if (pop.contains(e.target)) clearTimeout(hideTimer);
  });
  document.addEventListener('mouseout', (e) => {
    const el = termOf(e.target);
    const toPop = pop.contains(e.relatedTarget);
    if ((el || pop.contains(e.target)) && !toPop && !termOf(e.relatedTarget)) scheduleHide();
  });
  document.addEventListener('focusin', (e) => {
    const el = termOf(e.target);
    if (el) show(el);
  });
  document.addEventListener('focusout', (e) => {
    if (termOf(e.target) && !pop.contains(e.relatedTarget)) scheduleHide();
  });
  // Dotyk / klik: přepíná a „připne" kartu, aby nezmizela s pohybem prstu
  document.addEventListener('click', (e) => {
    const el = termOf(e.target);
    if (el) {
      e.preventDefault();
      if (current === el && !pop.hidden) { hide(); return; }
      clearTimeout(showTimer);
      show(el);
      pinned = true;
      return;
    }
    if (!pop.hidden && !pop.contains(e.target)) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) hide();
    if ((e.key === 'Enter' || e.key === ' ') && termOf(e.target)) {
      e.preventDefault();
      if (!pop.hidden && current === e.target) hide();
      else { show(e.target); pinned = true; }
    }
  });
  let raf = null;
  const onMove = () => {
    if (pop.hidden) return;
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = null; place(); });
  };
  window.addEventListener('scroll', onMove, { passive: true });
  window.addEventListener('resize', onMove);

  return pop;
}
