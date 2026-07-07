#!/usr/bin/env node
// Sestaví HTML týdenního newsletteru z JSON specu — deterministicky, ve
// stejném designu jako úvodní vydání (paper/ink/červená, e-mail-safe inline
// styly, tabulky). Texty píše redakce/AI do specu, tenhle skript jen skládá.
//
// Použití:
//   node scripts/newsletter-build.js spec.json > newsletter.html
//
// Spec (viz PROMPT_NEWSLETTER_ROUTINE.md):
// {
//   "subject": "…",                    // jen pro kontrolu, do HTML se nevkládá
//   "previewText": "…",                // preheader (skrytý první řádek)
//   "edition_label": "týdenní přehled · 10. července 2026",
//   "intro": {
//     "kicker": "Slovo Florence",
//     "heading": "…",                  // H1 úvodu
//     "paragraphs": ["…", "…"]         // 2–4 odstavce; povolené <strong>, <em>, <a href>
//   },
//   "articles": [                      // 3–4 položky; první = hlavní karta
//     {
//       "kicker": "Rubrika · 8. 7. 2026",
//       "title": "…",
//       "annotation": "…",             // 1–3 věty; povolené <strong>, <em>
//       "url": "https://skorezdravotnictvi.cz/clanek-….html",
//       "badge": "Z archivu",          // volitelné — zelený proužek místo červeného
//       "cta": "Prohlédnout radar →"   // volitelné — text odkazu (default „Číst článek →")
//     }
//   ]
// }
//
// Odhlašovací odkaz je Brevo merge tag {{ unsubscribe }} — nechat beze změny.

import fs from 'node:fs';

const specPath = process.argv[2];
if (!specPath) {
  console.error('Použití: node scripts/newsletter-build.js spec.json > newsletter.html');
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

for (const field of ['previewText', 'edition_label', 'intro', 'articles']) {
  if (!spec[field]) { console.error(`Spec: chybí pole "${field}"`); process.exit(1); }
}
if (!Array.isArray(spec.articles) || spec.articles.length < 1 || spec.articles.length > 4) {
  console.error('Spec: articles musí mít 1–4 položky (cíl rutiny: 3–4).');
  process.exit(1);
}
for (const a of spec.articles) {
  for (const f of ['kicker', 'title', 'annotation', 'url']) {
    if (!a[f]) { console.error(`Spec: článek bez pole "${f}" (${a.title || a.url || '?'})`); process.exit(1); }
  }
  if (!/^https:\/\/skorezdravotnictvi\.cz\//.test(a.url)) {
    console.error(`Spec: url musí mířit na skorezdravotnictvi.cz — ${a.url}`);
    process.exit(1);
  }
}

const esc = s => String(s).replace(/&(?![a-z]+;)/g, '&amp;');

const SANS = "font-family:Arial,Helvetica,sans-serif;";
const SERIF = "font-family:Georgia,'Times New Roman',serif;";

function heroCard(a) {
  const color = a.badge ? '#2f6b1f' : '#b8361e';
  const badge = a.badge ? `${esc(a.badge)} · ` : '';
  return `
      <tr><td class="nl-pad" style="padding:20px 34px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ece0;border-left:4px solid ${color};">
          <tr><td style="padding:20px 22px;">
            <div style="${SANS}font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:${a.badge ? color : '#6b6253'};margin-bottom:8px;">${badge}${esc(a.kicker)}</div>
            <a href="${a.url}" style="text-decoration:none;">
              <div class="nl-hero-title" style="${SERIF}font-size:21px;line-height:1.22;color:#1f1a14;font-weight:700;margin-bottom:8px;">${esc(a.title)}</div>
            </a>
            <p style="margin:0 0 12px;${SANS}font-size:14.5px;line-height:1.55;color:#3a332a;">${esc(a.annotation)}</p>
            <a href="${a.url}" style="${SANS}font-size:14px;font-weight:700;color:#b8361e;text-decoration:underline;">${esc(a.cta || 'Číst článek →')}</a>
          </td></tr>
        </table>
      </td></tr>`;
}

function listCard(a, last) {
  const border = last ? '' : 'border-bottom:1px solid rgba(31,26,20,.14);';
  const badge = a.badge ? `<span style="color:#2f6b1f;">${esc(a.badge)} · </span>` : '';
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:18px 0${last ? ' 4px' : ''};${border}">
          <div style="${SANS}font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#6b6253;margin-bottom:5px;">${badge}${esc(a.kicker)}</div>
          <a href="${a.url}" style="text-decoration:none;"><div class="nl-card-title" style="${SERIF}font-size:18px;line-height:1.25;color:#1f1a14;font-weight:700;margin-bottom:5px;">${esc(a.title)}</div></a>
          <p style="margin:0 0 8px;${SANS}font-size:14px;line-height:1.5;color:#3a332a;">${esc(a.annotation)}</p>
          <a href="${a.url}" style="${SANS}font-size:13.5px;font-weight:700;color:#b8361e;text-decoration:underline;">${esc(a.cta || 'Číst článek →')}</a>
        </td></tr></table>`;
}

const [hero, ...rest] = spec.articles;
const introParas = spec.intro.paragraphs.map((p, i) =>
  `<p class="nl-p" style="margin:0 0 14px;${i === 0 ? SERIF + 'font-size:17px;' : SANS + 'font-size:15px;'}line-height:1.58;color:${i === 0 ? '#1f1a14' : '#3a332a'};">${esc(p)}</p>`
).join('\n        ');

const html = `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skóre zdravotnictví — newsletter</title>
<style>
  /* Mobilní úpravy — aplikují se v klientech s podporou media queries
     (iOS Mail, Gmail app aj.). Desktop drží inline styly beze změny. */
  @media only screen and (max-width:600px) {
    .nl-shell { width:100% !important; }
    .nl-pad { padding-left:20px !important; padding-right:20px !important; }
    .nl-h1 { font-size:23px !important; line-height:1.2 !important; }
    .nl-hero-title { font-size:19px !important; }
    .nl-card-title { font-size:17px !important; }
    .nl-p { font-size:15px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f3ece0;">
<span style="display:none!important;visibility:hidden;opacity:0;color:#f3ece0;height:0;width:0;overflow:hidden;">${esc(spec.previewText)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ece0;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="nl-shell" style="width:600px;max-width:600px;background:#fbf8f1;border:1px solid rgba(31,26,20,.14);">

      <tr><td class="nl-pad" style="padding:26px 34px 18px;border-bottom:2px solid #1f1a14;">
        <div style="${SERIF}font-size:22px;font-weight:700;color:#1f1a14;letter-spacing:-.01em;">HSPA <span style="font-style:italic;font-weight:400;">monitor</span></div>
        <div style="${SANS}font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#6b6253;margin-top:4px;">Skóre zdravotnictví · ${esc(spec.edition_label)}</div>
      </td></tr>

      <tr><td class="nl-pad" style="padding:30px 34px 6px;">
        <div style="${SANS}font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:#b8361e;margin-bottom:12px;">${esc(spec.intro.kicker || 'Slovo Florence')}</div>
        <h1 class="nl-h1" style="margin:0 0 14px;${SERIF}font-size:27px;line-height:1.16;color:#1f1a14;font-weight:700;letter-spacing:-.015em;">${esc(spec.intro.heading)}</h1>
        ${introParas}
      </td></tr>

      <tr><td class="nl-pad" style="padding:14px 34px 0;"><div style="border-top:1px solid rgba(31,26,20,.16);"></div></td></tr>

      <tr><td class="nl-pad" style="padding:24px 34px 0;">
        <div style="${SANS}font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:#b8361e;">Nové na portálu</div>
      </td></tr>
${heroCard(hero)}

      <tr><td class="nl-pad" style="padding:8px 34px 0;">
${rest.map((a, i) => listCard(a, i === rest.length - 1)).join('\n')}
      </td></tr>

      <tr><td class="nl-pad" style="padding:26px 34px 6px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#1f1a14;">
          <a href="https://skorezdravotnictvi.cz/clanky.html" style="display:inline-block;padding:13px 26px;${SANS}font-size:14px;font-weight:700;color:#fbf8f1;text-decoration:none;letter-spacing:.02em;">Všechny články na portálu →</a>
        </td></tr></table>
      </td></tr>

      <tr><td class="nl-pad" style="padding:24px 34px 30px;border-top:1px solid rgba(31,26,20,.16);">
        <p style="margin:0 0 8px;${SANS}font-size:12.5px;line-height:1.6;color:#6b6253;">
          <strong style="color:#1f1a14;">HSPA Monitor — Skóre zdravotnictví</strong> je nezávislý veřejný portál, který měří výkonnost českého zdravotnictví podle metodiky OECD. Sami data nesbíráme — skládáme to nejlepší, co existuje (ÚZIS, ČSÚ, Eurostat, OECD), a u každého čísla necháváme zdroj.
        </p>
        <p style="margin:0;${SANS}font-size:12px;line-height:1.6;color:#8a8072;">
          Dostáváte tento dopis, protože jste přihlášeni k odběru novinek HSPA Monitoru. <a href="{{ unsubscribe }}" style="color:#8a8072;text-decoration:underline;">Odhlásit odběr</a> · <a href="https://skorezdravotnictvi.cz/" style="color:#8a8072;text-decoration:underline;">skorezdravotnictvi.cz</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
`;

process.stdout.write(html);
