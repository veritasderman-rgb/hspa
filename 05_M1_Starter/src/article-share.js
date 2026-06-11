// Sdílecí pásek pod každým článkem (clanek-*.html).
//
// Best practice pro web bez sledovacích cookies: žádný cizí JS ani SDK —
// jen nativní Web Share API (mobil) + odkazy na share-intenty platforem
// a „kopírovat odkaz". Instagram nemá webový share-intent pro odkaz, takže
// samostatné IG tlačítko zde záměrně není (IG pokryje mobilní share sheet).
//
// Idempotentní: na hub stránce (chybí article.article-page) neudělá nic;
// opakované volání pásek nezdvojí.

import { SITE_URL } from './page-shared.js';

const ICONS = {
  share: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18 8a3 3 0 1 0-2.82-4H15a3 3 0 0 0 .17 1L8.8 8.6a3 3 0 1 0 0 6.8l6.37 3.6A3 3 0 1 0 18 16a3 3 0 0 0-1.83.62L9.8 13.02a3.04 3.04 0 0 0 0-2.04l6.37-3.6A3 3 0 0 0 18 8z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.24 2H21.5l-7.1 8.12L22.9 22h-6.6l-5.17-6.77L5.2 22H1.94l7.6-8.69L1.5 2h6.77l4.67 6.18L18.24 2zm-1.16 18h1.8L7.02 3.9H5.1l11.98 16.1z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0zM3.3 8.4h3.28V21H3.3V8.4zm6.04 0h3.14v1.72h.04c.44-.83 1.5-1.7 3.1-1.7 3.32 0 3.93 2.18 3.93 5.02V21h-3.28v-5.86c0-1.4-.03-3.2-1.95-3.2-1.96 0-2.25 1.52-2.25 3.1V21H9.34V8.4z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.07L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 0 1 6.96 12.56l-.2.32.78 2.85-2.92-.77-.31.18A8.2 8.2 0 1 1 12 3.8zm-3.1 4c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.71 2.7 4.21 3.68 2.07.82 2.49.66 2.94.62.45-.04 1.45-.59 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.72-1.67-.8-.22-.08-.38-.12-.54.12-.16.24-.62.8-.76.96-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.46-.4-.4-.54-.41h-.46z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.2V18h16V7.2l-8 5.3-8-5.3zM5.5 7L12 11.3 18.5 7h-13z"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 0 1.4 0l4-4a3 3 0 1 0-4.24-4.24L10.46 6.5l1.42 1.42 1.3-1.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 0 0 1.36zm2.8-2.8a1 1 0 0 0-1.4 0l-4 4a3 3 0 1 0 4.24 4.24l1.3-1.3-1.42-1.42-1.3 1.3a1 1 0 1 1-1.4-1.42l4-4a1 1 0 0 0 0-1.4z"/></svg>',
};

export function enhanceArticleShare() {
  if (typeof document === 'undefined') return;
  const article = document.querySelector('article.article-page');
  if (!article) return;                       // hub / jiná stránka → nic
  if (document.getElementById('articleShare')) return; // idempotence

  const url = `${SITE_URL}${location.pathname}`;
  const title = (document.title || 'HSPA Monitor').replace(/\s*[—–|]\s*HSPA Monitor.*$/i, '').trim();
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const targets = [
    { id: 'facebook', label: 'Sdílet na Facebooku', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'x', label: 'Sdílet na X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { id: 'linkedin', label: 'Sdílet na LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'whatsapp', label: 'Poslat přes WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { id: 'email', label: 'Poslat e-mailem', href: `mailto:?subject=${t}&body=${t}%0A%0A${u}` },
  ];

  const linksHtml = targets.map(x =>
    `<a class="article-share-btn article-share-${x.id}" href="${x.href}" target="_blank" rel="noopener" aria-label="${x.label} (otevře se v novém okně)" title="${x.label}">${ICONS[x.id]}</a>`
  ).join('');

  const section = document.createElement('section');
  section.id = 'articleShare';
  section.className = 'article-share';
  section.setAttribute('aria-label', 'Sdílet článek');
  section.innerHTML = `
    <span class="article-share-label">Sdílet článek</span>
    <div class="article-share-row">
      ${linksHtml}
      <button type="button" class="article-share-btn article-share-copy" aria-label="Kopírovat odkaz na článek" title="Kopírovat odkaz">${ICONS.link}</button>
      <span class="article-share-toast" id="articleShareToast" role="status" aria-live="polite"></span>
    </div>`;

  article.appendChild(section);

  // Nativní Web Share (mobil) — přidá se jen když je k dispozici.
  if (typeof navigator !== 'undefined' && navigator.share) {
    const nativeBtn = document.createElement('button');
    nativeBtn.type = 'button';
    nativeBtn.className = 'article-share-btn article-share-native';
    nativeBtn.setAttribute('aria-label', 'Sdílet…');
    nativeBtn.title = 'Sdílet…';
    nativeBtn.innerHTML = ICONS.share;
    nativeBtn.addEventListener('click', () => {
      navigator.share({ title, url }).catch(() => {});
    });
    section.querySelector('.article-share-row').prepend(nativeBtn);
  }

  // Kopírovat odkaz.
  const copyBtn = section.querySelector('.article-share-copy');
  const toast = section.querySelector('#articleShareToast');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.textContent = 'Odkaz zkopírován';
    } catch {
      toast.textContent = url;
    }
    setTimeout(() => { toast.textContent = ''; }, 2500);
  });
}
