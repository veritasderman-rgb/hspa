// Generátor okresních stránek pohotovostí: pohotovost-<okres>.html.
//
// PROČ: člověk v nouzi nejde na skorezdravotnictvi.cz — napíše do Googlu
// „pohotovost Klatovy“. Aby ho vyhledávač měl kam poslat, má každý okres
// s aspoň jedním pracovištěm vlastní stránku se STATICKÝM výpisem (jméno,
// adresa, telefon, rozpis hodin) — obsah je v HTML, ne až v JS, takže ho
// vidí i crawler — plus JSON-LD (MedicalClinic/Dentist/Pharmacy
// s OpeningHoursSpecification), ze kterého umí Google vytáhnout hodiny
// rovnou do výsledku. Živý stav „teď otevřeno“ dokresluje progresivně
// src/pohotovost-okres.js; bez JS stránka funguje dál.
//
// KDY SE REGENERUJE: v tomhle repu při změně dat ručně/PR a týdně v cron
// kroku pohotovostí (refresh.yml) hned po transformu — stránky se přepíšou
// jen když se jejich obsah opravdu změnil, aby commit nebobtnal o 75
// nezměněných souborů. Není součástí build:generated (merge-driver
// mašinerie čtyř artefaktů se na ně nevztahuje — jsou to obsahové stránky
// jako clanek-*.html, jen je píše skript místo člověka).
//
// Výstupy:
//   pohotovost-<slug>.html            (75 stránek)
//   data/pohotovosti-okresy.json      manifest pro sitemap + rozcestník
//   pohotovosti.html                  jen blok FAQPage JSON-LD mezi značkami
//                                     poh-faq:start/end (z practical.triage)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { okresSlug, feedbackIssueUrl } from '../src/pohotovosti-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://skorezdravotnictvi.cz';

const DAY_LABELS = [
  ['mon', 'Pondělí'], ['tue', 'Úterý'], ['wed', 'Středa'], ['thu', 'Čtvrtek'],
  ['fri', 'Pátek'], ['sat', 'Sobota'], ['sun', 'Neděle'], ['holiday', 'Svátek'],
];
const SCHEMA_DAY = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const SCHEMA_TYPE = {
  lps_dospeli: 'MedicalClinic',
  lps_deti: 'MedicalClinic',
  zubni: 'Dentist',
  lekarna: 'Pharmacy',
  ambulance_denni: 'MedicalClinic',
};

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const fmtPhone = (phone) => String(phone ?? '').replace(/^\+420(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');

function hoursTableHtml(hours) {
  if (!hours?.week) return '<p class="pokr-hours-none">Rozpis po dnech viz celostátní vyhledávání.</p>';
  const rows = DAY_LABELS.map(([key, label]) => {
    const ranges = hours.week[key] ?? [];
    const text = ranges.length
      ? ranges.map(([a, b]) => (a === '00:00' && b === '24:00') ? 'nepřetržitě' : `${a}–${b}`).join(', ')
      : '—';
    return `<tr><th scope="row">${label}</th><td>${esc(text)}</td></tr>`;
  }).join('');
  return `<table class="pokr-hours"><caption class="sr-only">Rozpis provozní doby</caption><tbody>${rows}</tbody></table>`;
}

/** OpeningHoursSpecification; interval přes půlnoc nese `closes` dalšího dne tak, jak ho zapsal zdroj. */
function openingSpec(hours) {
  if (!hours?.week) return undefined;
  const spec = [];
  for (const [key, day] of Object.entries(SCHEMA_DAY)) {
    for (const [opens, closes] of hours.week[key] ?? []) {
      spec.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${day}`,
        opens,
        closes: closes === '24:00' ? '23:59' : closes,
      });
    }
  }
  return spec.length ? spec : undefined;
}

function jsonLd(okres, slug, places) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Pohotovosti — okres ${okres}`,
    url: `${SITE}/pohotovost-${slug}`,
    itemListElement: places.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': SCHEMA_TYPE[p.category] ?? 'MedicalClinic',
        name: p.workplace ? `${p.name} — ${p.workplace}` : p.name,
        description: p.category_label,
        address: p.address ? { '@type': 'PostalAddress', streetAddress: p.address, addressLocality: p.obec ?? undefined, postalCode: p.psc ?? undefined, addressCountry: 'CZ' } : undefined,
        geo: p.lat != null ? { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lon } : undefined,
        telephone: p.phone ?? undefined,
        url: p.web ?? undefined,
        openingHoursSpecification: openingSpec(p.hours),
      },
    })),
  };
}

/**
 * @param {object} p       pracoviště z data/pohotovosti.json
 * @param {{generatedAt?: string, feedback?: object}} ctx  datum dat a konfigurace hlášení změn
 */
export function placeHtml(p, ctx = {}) {
  const flags = [];
  if (p.category === 'ambulance_denni') {
    flags.push('běžná ambulance nemocnice, ne pohotovostní služba podle vyhlášky');
    flags.push(p.walk_in === 'ano' ? 'nemocnice uvádí příjem bez objednání' : 'zavolejte předem');
  }
  if (p.geo_source === 'obec') flags.push('poloha jen orientačně (střed obce)');
  // Drift-check: hlavní vyhledávání u změněného zdroje varuje — a člověk,
  // který přišel z Googlu rovnou sem, si stejné varování zaslouží tím spíš.
  // Stránky se regenerují týdně po drift-checku, takže stav sem doteče.
  const drift = p.hours_check?.status === 'drift'
    ? `<p class="pokr-drift"><strong>⚠ Stránka nemocnice se od našeho ověření změnila${
        p.hours_check.checked_at ? ` (zjištěno ${esc(p.hours_check.checked_at)})` : ''} —
      rozpis níže může být zastaralý. Před cestou zavolejte.</strong></p>`
    : '';
  return `
  <article class="pokr-place" data-hours="${esc(JSON.stringify(p.hours ?? null))}">${drift}
    <h3 class="pokr-place-h">${esc(p.name)}${p.workplace ? ` <span class="pokr-workplace">${esc(p.workplace)}</span>` : ''}</h3>
    <p class="pokr-type">${esc(p.category_label ?? '')} <span class="pokr-live" hidden></span></p>
    ${p.address ? `<p class="pokr-addr">${esc(p.address)}</p>` : ''}
    ${p.place_note ? `<p class="pokr-note">${esc(p.place_note)}</p>` : ''}
    ${p.hours?.note ? `<p class="pokr-note">${esc(p.hours.note)}</p>` : ''}
    ${flags.length ? `<p class="pokr-flags">${flags.map(esc).join(' · ')}</p>` : ''}
    <p class="pokr-actions">
      ${p.phone ? `<a class="poh-action poh-action-primary" href="tel:${esc(p.phone)}">Zavolat ${esc(p.phone.replace(/^\+420(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3'))}</a>` : ''}
      ${p.lat != null ? `<a class="poh-action" href="https://mapy.cz/turisticka?q=${p.lat}%2C${p.lon}" target="_blank" rel="noopener">Ukázat na mapě</a>` : ''}
      ${p.web ? `<a class="poh-action" href="${esc(p.web)}" target="_blank" rel="noopener">Web</a>` : ''}
    </p>
    ${hoursTableHtml(p.hours)}
    ${footHtml(p, ctx)}
  </article>`;
}

/** Patička karty: stáří dat a odkaz na hlášení změny (stejný tvar jako na hlavní stránce). */
function footHtml(p, { generatedAt, feedback } = {}) {
  const day = String(generatedAt ?? '').slice(0, 10);
  if (!day) return '';
  const url = feedbackIssueUrl(p, {
    base: feedback?.issues_new_url,
    labels: feedback?.labels ?? [],
    generatedDay: day,
    page: `pohotovost-${okresSlug(p.okres)}.html`,
  });
  const stamp = p.verified_at ? `Ověřeno člověkem ${esc(p.verified_at)}` : `Data k ${esc(day)}`;
  return `<p class="pokr-foot">${stamp} · <a href="${esc(url)}" target="_blank" rel="noopener" title="Otevře předvyplněné hlášení na GitHubu (vyžaduje účet GitHub)">Nahlásit změnu</a></p>`;
}

/**
 * Kompaktní rozcestník čísel pro okresní stránku: řádky rozcestníku
 * s telefonem (155, otrava, krize…) a poradní linka záchranky kraje, když
 * ji kraj má. Plný rozcestník s tlačítky „najít“ je na hlavní stránce.
 */
export function rozcestnikHtml(practical, adviceLine) {
  const rows = (practical?.triage ?? []).filter(r => r.action?.kind === 'tel');
  if (!rows.length && !adviceLine) return '';
  const items = rows.map(r =>
    `      <li><strong>${esc(r.situation)}</strong> — <a href="tel:${esc(r.action.phone)}">${esc(r.action.label)}</a></li>`);
  if (adviceLine) {
    const hours = adviceLine.hours ?? (adviceLine.hours_unknown ? 'provozní dobu web záchranky neuvádí' : '');
    items.push(`      <li><strong>${esc(adviceLine.name)}</strong> (${esc(adviceLine.kraj)}${hours ? `, ${esc(hours)}` : ''}) — <a href="tel:${esc(adviceLine.phone)}">${esc(fmtPhone(adviceLine.phone))}</a>${
      adviceLine.phone_alt ? ` / <a href="tel:${esc(adviceLine.phone_alt)}">${esc(fmtPhone(adviceLine.phone_alt))}</a>` : ''}${
      adviceLine.text ? `: ${esc(adviceLine.text)}` : ''} Není to tísňová linka.</li>`);
  }
  return `
  <section class="pokr-roz" aria-labelledby="pokrRozH">
    <h2 class="pokr-roz-h" id="pokrRozH">Kam s tím? Nejdůležitější čísla</h2>
    <ul class="pokr-roz-list">
${items.join('\n')}
    </ul>
    <p class="pokr-roz-more">Celý rozcestník (zub, dítě, psychická krize, bez praktika, <span lang="en">English</span>, <span lang="uk">Українська</span>):
      <a href="pohotovosti.html#pohRozH">Kam s tím?</a> — podle oficiálních zdrojů, s odkazem a datem ověření u každého řádku.</p>
  </section>`;
}

/** FAQPage JSON-LD z rozcestníku — tytéž otázky a odpovědi, které stránka ukazuje. */
export function faqJsonLd(practical) {
  const rows = (practical?.triage ?? []).filter(r => r.faq?.q && r.faq?.a);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: rows.map(r => ({
      '@type': 'Question',
      name: r.faq.q,
      acceptedAnswer: { '@type': 'Answer', text: r.faq.a },
    })),
  };
}

const FAQ_START = '<!-- poh-faq:start';
const FAQ_END = '<!-- poh-faq:end -->';

/**
 * Přepíše blok FAQPage JSON-LD v pohotovosti.html mezi značkami
 * poh-faq:start/end. Vrací true, když se soubor změnil.
 */
export function writeFaqIntoPage(practical, file = path.resolve(ROOT, 'pohotovosti.html')) {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf(FAQ_START);
  const b = html.indexOf(FAQ_END);
  if (a < 0 || b < 0 || b < a) return false;
  const markerEnd = html.indexOf('-->', a) + 3;
  const json = JSON.stringify(faqJsonLd(practical), null, 1).replace(/</g, '\\u003c');
  const block = `${html.slice(a, markerEnd)}\n<script type="application/ld+json" id="pohFaqLd">\n${json}\n</script>\n`;
  const next = html.slice(0, a) + block + html.slice(b);
  if (next === html) return false;
  fs.writeFileSync(file, next);
  return true;
}

function pageHtml({ okres, slug, kraj, places, generatedAt, hasRotation, practical, adviceLine }) {
  const title = `Pohotovost ${okres} — kde má teď otevřeno`;
  const desc = `Lékařská, dětská, zubní a lékárenská pohotovost v okrese ${okres}: adresy, telefony a ordinační doba ${places.length === 1 ? 'jednoho pracoviště' : `${places.length} pracovišť`}. Z veřejných dat VZP a registru ÚZIS.`;
  const CATEGORY_ORDER = ['lps_dospeli', 'lps_deti', 'zubni', 'lekarna', 'ambulance_denni'];
  const sorted = [...places].sort((a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    || a.name.localeCompare(b.name, 'cs'));

  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · HSPA Monitor</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/pohotovost-${slug}">
<meta property="og:locale" content="cs_CZ">
<link rel="canonical" href="${SITE}/pohotovost-${slug}">
<link rel="stylesheet" href="src/styles.min.css">
<script type="application/ld+json">
${JSON.stringify(jsonLd(okres, slug, sorted), null, 1)}
</script>
</head>
<body>
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar">
  <div class="brand">
    <a href="index.html" class="brand-link"><p class="brand-title"><abbr class="hspa-abbr" title="Health System Performance Assessment — hodnocení výkonnosti zdravotního systému (WHO 2000, OECD 2023)">HSPA</abbr> <em>monitor</em>
      <small>skorezdravotnictvi.cz · Hodnocení výkonnosti zdravotního systému ČR</small>
    </p></a>
  </div>
  <nav class="module-nav" id="moduleNav" aria-label="Moduly dashboardu"></nav>
</header>

<aside class="masthead-strip" aria-label="Aktuální datum vydání">
  <span class="masthead-date" id="mastheadDate"></span>
</aside>

<main id="content">

  <aside class="poh-triage" role="note" aria-label="Kdy volat záchrannou službu">
    <p class="poh-triage-lead">
      <strong>Jde o život?</strong> Bezvědomí, dušnost, silná bolest na hrudi, křeče, silné krvácení,
      podezření na mrtvici nebo infarkt&nbsp;— <strong>nehledejte pohotovost</strong>
      a volejte <a href="tel:155" class="poh-triage-call">155</a> (nebo <a href="tel:112">112</a>).
    </p>
  </aside>
${rozcestnikHtml(practical, adviceLine)}
  <section class="ed-hero ed-hero-slim" aria-labelledby="pokrH">
    <div class="ed-hero-content">
      <div class="ed-kicker">Servisní stránka · Pohotovosti · ${esc(kraj)}</div>
      <h1 class="ed-hero-headline" id="pokrH">Pohotovost v okrese ${esc(okres)}</h1>
      <p class="ed-hero-lead">
        ${places.length === 1 ? 'Jedno pracoviště pohotovostní a akutní péče' : `${places.length} pracovišť pohotovostní a akutní péče`}
        v okrese s adresou, telefonem a rozpisem hodin. Před cestou vždy zavolejte —
        rozpis se může změnit dovolenou nebo zástupem dřív, než ho stihneme obnovit.
      </p>
      <p class="poh-hero-note">
        <a href="pohotovosti.html">→ Celostátní vyhledávání podle vaší polohy</a> najde i pracoviště
        za hranicí okresu — často jsou blíž${hasRotation ? '; zubní služba se v kraji střídá podle rozpisu, který je tam také' : ''}.
      </p>
    </div>
  </section>

  <section class="pokr-list" aria-label="Pracoviště v okrese">
${sorted.map(p => placeHtml(p, { generatedAt, feedback: practical?.feedback })).join('\n')}
  </section>

  <section class="poh-method" aria-labelledby="pokrMetH">
    <h2 class="ed-areas-h" id="pokrMetH">Odkud data jsou</h2>
    <p class="poh-context-p">
      Rozpisy hodin pocházejí z celostátního přehledu VZP a otevřených dat krajů, adresy a polohy
      z registru poskytovatelů ÚZIS; denní nemocniční ambulance jsou ručně ověřené proti webu nemocnice
      a týdně automaticky kontrolované. Stav k ${esc(generatedAt.slice(0, 10))}. Podrobná metodika,
      mapa i vyhledávání podle polohy: <a href="pohotovosti.html">Nejbližší pohotovost</a>.
      Tato stránka není oficiálním zdrojem Ministerstva zdravotnictví ani pojišťoven.
    </p>
  </section>

</main>

<footer class="bottom" id="siteFooter"></footer>

<script type="module" src="src/pohotovost-okres.js"></script>
</body>
</html>
`;
}

export function build() {
  const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'pohotovosti.json'), 'utf8'));
  const byOkres = new Map();
  for (const p of data.places) {
    if (!p.okres) continue;
    if (!byOkres.has(p.okres)) byOkres.set(p.okres, []);
    byOkres.get(p.okres).push(p);
  }
  const rotationKraje = new Set((data.rotations ?? []).map(r => r.kraj_code));
  const adviceByKraj = new Map((data.online?.advice_lines ?? []).map(l => [l.kraj_code, l]));

  const manifest = [];
  let written = 0;
  for (const [okres, places] of [...byOkres.entries()].sort((a, b) => a[0].localeCompare(b[0], 'cs'))) {
    const slug = okresSlug(okres);
    const kraj = places[0].kraj ?? '';
    const html = pageHtml({
      okres, slug, kraj, places,
      generatedAt: data.generated_at,
      hasRotation: rotationKraje.has(places[0].kraj_code),
      practical: data.practical,
      adviceLine: adviceByKraj.get(places[0].kraj_code) ?? null,
    });
    const file = path.resolve(ROOT, `pohotovost-${slug}.html`);
    // Přepis jen při skutečné změně — týdenní cron commituje data a stránky
    // spolu; 75 kosmeticky přegenerovaných souborů by zaneslo každý diff.
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) {
      fs.writeFileSync(file, html);
      written += 1;
    }
    manifest.push({ okres, slug, kraj, kraj_code: places[0].kraj_code, places: places.length });
  }

  const manifestPayload = {
    version: '1.0',
    generated_at: data.generated_at,
    okresy: manifest,
  };
  fs.writeFileSync(path.resolve(ROOT, 'data', 'pohotovosti-okresy.json'),
    `${JSON.stringify(manifestPayload, null, 1)}\n`);

  const faqChanged = writeFaqIntoPage(data.practical);
  console.log(`[pohotovosti-okresy] ${manifest.length} okresů, ${written} stránek přepsáno → pohotovost-*.html + data/pohotovosti-okresy.json${
    faqChanged ? '; FAQPage JSON-LD v pohotovosti.html obnoveno' : ''}`);
  return manifestPayload;
}

if (import.meta.url === `file://${process.argv[1]}`) build();
