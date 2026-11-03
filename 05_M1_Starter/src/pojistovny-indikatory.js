// Podstránka „Indikátory a pojišťovny“ (pojistovny-indikatory.html): inventář
// indikátorů a datových zdrojů o zdravotních pojišťovnách, zvlášť těch, které
// říkají, kdo je u koho pojištěn. Stížnosti na dostupnost a přehled otevřených dat pojišťoven
// (bootServis) jsou od A0.5 na stránce „Aplikace a servis“.
//
// Vstupy:
//   data/pojistovny-indikatory.json  inventář (sekce strucne, kontrakt, datasety, kdo_u_koho, navrhy, mezery)
//   data/indicators.json             datový kontrakt: název, jednotka, rok, zdroj a stav ověření indikátorů
//   data/pojistovny-opendata.json    audit otevřených dat 7 ZP (volitelný; bez souboru se blok vynechá)
//
// Čisté funkce (build*/…Html) jsou bez DOM kvůli testům; bootIndikatory() plní kontejnery
// #zpIndStrucne, #zpIndKontrakt, #zpIndAuto, #zpIndDatasety, #zpIndKdo, #zpIndNavrhy,
// #zpIndMezery; bootServis() plní #zpStiznosti a #zpOpendata na stránce „Aplikace a servis“. Zdroje a shell kreslí pojistovny.js jako na ostatních podstránkách.

import { escapeHtml } from './page-shared.js';
import { loadJson } from './pojistovny-shared.js';
import { zpColor, ZP } from './zp-palette.js';

export const INV_URL = 'data/pojistovny-indikatory.json';
export const KONTRAKT_URL = 'data/indicators.json';
export const OPENDATA_URL = 'data/pojistovny-opendata.json';
export const STIZNOSTI_URL = 'data/pojistovny-stiznosti.json';
export const POJ_URL = 'data/pojistovny.json';

const esc = escapeHtml;
const NA = '<span class="zpc-na">—</span>';
const VERIF_LABEL = { verified: 'ověřeno', preliminary: 'předběžné', seed: 'seed', flagged: 'k revizi' };

const linkOrText = (url, text) => (url ? `<a href="${esc(url)}" rel="noopener">${esc(text)}</a>` : esc(text));
const dot = (kod) => `<span class="zpc-dot" style="--c:${zpColor(kod) || 'var(--ink)'}"></span>`;

// ---------------------------------------------------------------- kontrakt

/** Mapa id → indikátor kontraktu. */
export function indexKontrakt(kontrakt) {
  const list = Array.isArray(kontrakt?.indicators) ? kontrakt.indicators : [];
  return new Map(list.map((i) => [i.id, i]));
}

/** Položky inventáře obohacené z kontraktu; chybějící id dostane `chybi: true`. */
export function buildKontraktSkupiny(inv, kontrakt) {
  const map = indexKontrakt(kontrakt);
  return (inv?.kontrakt?.skupiny || []).map((g) => ({
    id: g.id,
    nazev: g.nazev,
    polozky: (g.polozky || []).map((p) => {
      const i = map.get(p.id);
      return i
        ? { id: p.id, granularita: p.granularita || '', nazev: i.name, jednotka: i.unit, rok: i.year, zdroj: i.source?.name || '', url: i.source?.url || '', overeni: i.verification_status || '', area: i.area || '', domain: i.domain || '', chybi: false }
        : { id: p.id, granularita: p.granularita || '', nazev: p.id, jednotka: '', rok: null, zdroj: '', url: '', overeni: '', area: '', domain: '', chybi: true };
    }),
  }));
}

/**
 * Indikátory, které vznikají z dat pojišťoven (NRHZS, VZP, KZP …), ale pojišťovnu jako rozměr nemají.
 * Výběr podle regulárních výrazů z inventáře (auto_dotaz); karty indikátorů stránka nenačítá,
 * hledá jen v kontraktu (source.name, name), takže výsledek je dolní odhad proti dokumentu.
 */
export function buildAutoSeznam(inv, kontrakt, vyloucit = new Set()) {
  const q = inv?.kontrakt?.auto_dotaz || {};
  let reZ = null; let reN = null;
  try { reZ = q.regex_zdroj ? new RegExp(q.regex_zdroj, 'i') : null; } catch (_) { reZ = null; }
  try { reN = q.regex_nazev ? new RegExp(q.regex_nazev) : null; } catch (_) { reN = null; }
  const list = Array.isArray(kontrakt?.indicators) ? kontrakt.indicators : [];
  return list
    .filter((i) => !vyloucit.has(i.id))
    .filter((i) => (reZ && reZ.test(i.source?.name || '')) || (reN && reN.test(i.name || '')))
    .map((i) => ({ id: i.id, nazev: i.name, jednotka: i.unit, rok: i.year, zdroj: i.source?.name || '', url: i.source?.url || '', overeni: i.verification_status || '', area: i.area || '', domain: i.domain || '' }))
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
}

function overeniHtml(v) {
  if (!v) return NA;
  return `<span class="zpc-tag zpc-tag--${esc(v)}">${esc(VERIF_LABEL[v] || v)}</span>`;
}

function radekIndikatoru(p, sGran) {
  return `<tr><th scope="row" class="zpc-txt"><a href="indicator.html?id=${esc(p.id)}">${esc(p.nazev)}</a><small>${esc(p.id)}${p.area ? ` · ${esc(p.area)} / ${esc(p.domain)}` : ''}</small></th>`
    + `<td class="zpc-txt">${esc(p.jednotka || '')}</td><td>${p.rok ?? NA}</td>`
    + `<td class="zpc-txt">${p.zdroj ? linkOrText(p.url, p.zdroj) : NA}</td>`
    + (sGran ? `<td class="zpc-txt">${esc(p.granularita || '')}</td>` : '')
    + `<td class="zpc-txt">${overeniHtml(p.overeni)}</td></tr>`;
}

export function kontraktHtml(skupiny) {
  if (!skupiny.length) return '<p class="zpc-na">Inventář se nepodařilo načíst.</p>';
  return skupiny.map((g) => `<h4>${esc(g.nazev)}<span class="zpc-n">${g.polozky.length}</span></h4>`
    + '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Indikátory kontraktu (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Indikátor</th><th scope="col" class="zpc-txt">Jednotka</th><th scope="col">Rok</th><th scope="col" class="zpc-txt">Zdroj</th><th scope="col" class="zpc-txt">Za co hodnota je</th><th scope="col" class="zpc-txt">Ověření</th></tr></thead><tbody>'
    + g.polozky.map((p) => (p.chybi ? `<tr><th scope="row" class="zpc-txt">${esc(p.id)}<small>v kontraktu chybí</small></th><td colspan="5" class="zpc-txt">${esc(p.granularita)}</td></tr>` : radekIndikatoru(p, true))).join('')
    + '</tbody></table></div>').join('');
}

export function autoHtml(list) {
  if (!list.length) return '<p class="zpc-na">Žádný indikátor neodpovídá dotazu.</p>';
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Indikátory z dat pojišťoven (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Indikátor</th><th scope="col" class="zpc-txt">Jednotka</th><th scope="col">Rok</th><th scope="col" class="zpc-txt">Zdroj</th><th scope="col" class="zpc-txt">Ověření</th></tr></thead><tbody>'
    + list.map((p) => radekIndikatoru(p, false)).join('') + '</tbody></table></div>';
}

// ---------------------------------------------------------------- datasety, kdo u koho, návrhy

export function datasetyHtml(inv) {
  const list = inv?.datasety?.polozky || [];
  if (!list.length) return NA;
  const mark = (v) => (v === 'ano' ? '<span class="zpc-yes">ano</span>' : v === 'ne' ? '<span class="zpc-no">ne</span>' : `<span class="zpc-part">${esc(v)}</span>`);
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Datové sady s rozměrem pojišťovna (tabulka, posuvná)"><table><thead><tr><th scope="col">#</th><th scope="col" class="zpc-txt">Soubor</th><th scope="col" class="zpc-txt">Dimenze</th><th scope="col" class="zpc-txt">Roky</th><th scope="col" class="zpc-txt">Zdroj</th><th scope="col" class="zpc-txt">Aktualizace</th><th scope="col" class="zpc-txt">Na webu</th><th scope="col">Per ZP</th></tr></thead><tbody>'
    + list.map((d) => `<tr><th scope="row">${esc(d.k)}</th><td class="zpc-txt"><code>${esc(d.soubor)}</code></td><td class="zpc-txt">${esc(d.dimenze)}</td><td class="zpc-txt">${esc(d.roky)}</td><td class="zpc-txt">${esc(d.zdroj)}</td><td class="zpc-txt">${esc(d.aktualizace)}</td><td class="zpc-txt">${esc(d.web)}</td><td>${mark(d.per_zp)}</td></tr>`).join('')
    + '</tbody></table></div>';
}

export function kdoUKohoHtml(inv) {
  const k = inv?.kdo_u_koho || {};
  const list = k.polozky || [];
  const odp = k.odpovedi || [];
  if (!list.length) return NA;
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Zdroje o tom, kdo je u koho pojištěn (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Zdroj</th><th scope="col" class="zpc-txt">Co přesně měří</th><th scope="col" class="zpc-txt">Rozlišení</th><th scope="col" class="zpc-txt">Časový základ</th><th scope="col" class="zpc-txt">Kdo a jak často</th><th scope="col" class="zpc-txt">V repu</th></tr></thead><tbody>'
    + list.map((z) => `<tr><th scope="row" class="zpc-txt">${linkOrText(z.url, z.zdroj)}</th><td class="zpc-txt">${esc(z.meri)}</td><td class="zpc-txt">${esc(z.rozliseni)}</td><td class="zpc-txt">${esc(z.casovy_zaklad)}</td><td class="zpc-txt">${esc(z.kdo)}</td><td class="zpc-txt">${esc(z.v_repu)}</td></tr>`).join('')
    + '</tbody></table></div>'
    + (odp.length ? `<h4>Na co data odpovídají</h4><dl class="zpc-dl">${odp.map((o) => `<dt>${esc(o.otazka)}</dt><dd>${esc(o.odpoved)}</dd>`).join('')}</dl>` : '');
}

export function navrhyHtml(inv) {
  const list = inv?.navrhy?.polozky || [];
  if (!list.length) return NA;
  const stav = (v) => (/^ano/.test(v) ? 'zpc-yes' : /^ne\b/.test(v) ? 'zpc-no' : 'zpc-part');
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Navržené indikátory per pojišťovna (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Navržené id</th><th scope="col" class="zpc-txt">Název</th><th scope="col" class="zpc-txt">Zdroj</th><th scope="col" class="zpc-txt">Granularita</th><th scope="col" class="zpc-txt">Jde spočítat z repa?</th></tr></thead><tbody>'
    + list.map((n) => `<tr><th scope="row" class="zpc-txt"><code>${esc(n.id)}</code></th><td class="zpc-txt">${esc(n.nazev)}</td><td class="zpc-txt">${esc(n.zdroj)}</td><td class="zpc-txt">${esc(n.granularita)}</td><td class="zpc-txt"><span class="${stav(n.v_repu)}">${esc(n.v_repu)}</span></td></tr>`).join('')
    + '</tbody></table></div>';
}

export const li = (arr) => (arr || []).map((s) => `<li>${esc(s)}</li>`).join('') || '<li class="zpc-na">—</li>';

// ---------------------------------------------------------------- otevřená data

const OD_STAV = { ano: ['zpc-yes', 'ano'], castecne: ['zpc-part', 'částečně'], ne: ['zpc-no', 'ne'] };
const odStav = (s) => { const [cls, t] = OD_STAV[s] || ['zpc-na', s ?? '—']; return `<span class="${cls}">${esc(t)}</span>`; };

/** Souhrn auditu otevřených dat: řádek za pojišťovnu (web · NKOD · VZ a jiné). */
export function buildOpendataSouhrn(od) {
  const byKod = new Map((od?.pojistovny || []).map((z) => [String(z.kod), z]));
  return ZP.map((z) => {
    const r = byKod.get(z.kod);
    return {
      kod: z.kod, zkratka: z.zkratka,
      web: r?.web_opendata?.stav ?? null, web_url: r?.web_opendata?.url ?? null, sady: (r?.web_opendata?.datove_sady || []).length,
      nkod: r?.nkod?.stav ?? null, nkod_pocet: r?.nkod?.pocet_sad ?? 0, nkod_url: r?.nkod?.url ?? null,
      vz: r?.vyrocni_zpravy_a_jine?.stav ?? null,
      shrnuti: r?.shrnuti || '', overeno: r?.overeno || od?.stav_k || '', _r: r || null,
    };
  });
}

export function opendataHtml(od) {
  if (!od || !Array.isArray(od.pojistovny) || !od.pojistovny.length) return '<p class="zpc-note">Audit otevřených dat pojišťoven zatím není k dispozici.</p>';
  const rows = buildOpendataSouhrn(od);
  const table = '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Otevřená data pojišťoven (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Pojišťovna</th><th scope="col">Open data na webu</th><th scope="col">Sady</th><th scope="col">NKOD</th><th scope="col">VZ a jiné</th><th scope="col" class="zpc-txt">Shrnutí</th></tr></thead><tbody>'
    + rows.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row" class="zpc-txt">${dot(r.kod)}${esc(r.zkratka)}</th><td>${r.web_url ? `<a href="${esc(r.web_url)}" rel="noopener">${odStav(r.web)}</a>` : odStav(r.web)}</td><td>${r.sady || NA}</td><td>${r.nkod_url ? `<a href="${esc(r.nkod_url)}" rel="noopener">${odStav(r.nkod)}</a>` : odStav(r.nkod)}${r.nkod_pocet ? ` <small>${r.nkod_pocet} sad</small>` : ''}</td><td>${odStav(r.vz)}</td><td class="zpc-txt">${esc(r.shrnuti)}</td></tr>`).join('')
    + '</tbody></table></div>';
  const detail = rows.map((r) => {
    const z = r._r; if (!z) return '';
    const sady = (z.web_opendata?.datove_sady || []).map((s) => `<li>${linkOrText(s.url, s.nazev)}${s.format ? ` · ${esc(s.format)}` : ''}${s.periodicita ? ` · ${esc(s.periodicita)}` : ''}${s.licence ? ` · ${esc(s.licence)}` : ''}${s.obsah ? `<br><small>${esc(s.obsah)}</small>` : ''}</li>`).join('');
    const nkod = (z.nkod?.sady || []).map((s) => `<li>${linkOrText(s.url, s.nazev)}</li>`).join('');
    const vz = (z.vyrocni_zpravy_a_jine?.odkazy || []).map((s) => `<li>${linkOrText(s.url, s.nazev)}</li>`).join('');
    return `<details class="zpc-acc" data-zp="${esc(r.kod)}"><summary>${dot(r.kod)}${esc(r.zkratka)}<span class="zpc-n">ověřeno ${esc(r.overeno)}</span></summary><div class="zpc-acc-body">`
      + `<p><b>Web:</b> ${odStav(r.web)} ${esc(z.web_opendata?.popis || '')}</p>${sady ? `<ul>${sady}</ul>` : ''}`
      + `<p><b>Národní katalog otevřených dat:</b> ${odStav(r.nkod)}${r.nkod_pocet ? `, ${r.nkod_pocet} sad` : ''}${r.nkod_url ? ` · ${linkOrText(r.nkod_url, 'záznam v NKOD')}` : ''}</p>${nkod ? `<ul>${nkod}</ul>` : ''}`
      + `<p><b>Výroční zprávy a jiné dokumenty:</b> ${odStav(r.vz)} ${esc(z.vyrocni_zpravy_a_jine?.popis || '')}</p>${vz ? `<ul>${vz}</ul>` : ''}`
      + (z.zadosti_o_data?.popis ? `<p><b>Žádosti o data:</b> ${esc(z.zadosti_o_data.popis)}${z.zadosti_o_data.url ? ` · ${linkOrText(z.zadosti_o_data.url, 'odkaz')}` : ''}</p>` : '')
      + ((z.zdroje || []).length ? `<p class="zpc-note">Prohledáno: ${z.zdroje.map((u) => `<a href="${esc(u)}" rel="noopener">${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`).join(' · ')}</p>` : '')
      + '</div></details>';
  }).join('');
  const centr = (od.centralni_zdroje || []).map((c) => `<li><b>${linkOrText(c.url, c.nazev)}</b> — ${esc(c.co_obsahuje || '')}${c.format ? ` · ${esc(c.format)}` : ''}${c.periodicita ? ` · ${esc(c.periodicita)}` : ''}${c.licence ? ` · ${esc(c.licence)}` : ''}</li>`).join('');
  return `<p class="zpc-note">Stav k ${esc(od.stav_k || '')}. ${esc(od.skala ? `Škála: ano = ${od.skala.ano}; částečně = ${od.skala.castecne}; ne = ${od.skala.ne}.` : '')}</p>`
    + table
    + `<details class="zpc-acc"><summary>Podrobnosti podle pojišťoven<span class="zpc-n">${rows.filter((r) => r._r).length}</span></summary><div class="zpc-acc-body">${detail}</div></details>`
    + (centr ? `<h4>Centrální zdroje, kde jsou data o pojišťovnách otevřená bez ohledu na pojišťovnu<span class="zpc-n">${(od.centralni_zdroje || []).length}</span></h4><ul class="zpc-list">${centr}</ul>` : '');
}

// ---------------------------------------------------------------- stížnosti a podněty na dostupnost (z VZ)

const fmtN = (v) => (v == null ? null : new Intl.NumberFormat('cs-CZ').format(Math.round(v)));

/**
 * Řádky tabulky stížností: pojišťovna × roky; na 100 tis. pojištěnců jen tam, kde definice
 * pokrývá všechna podání k dostupnosti (VZP ČR, ČPZP) a kde je známý průměrný kmen (MZ 2024).
 */
export function buildStiznosti(st, poj) {
  const kmen = new Map((poj?.pojistovny || []).map((z) => [z.kod, z.hospodareni?.pocet_pojistencu?.hodnota ?? null]));
  const roky = [...new Set((st?.pojistovny || []).flatMap((z) => (z.roky || []).map((r) => r.rok)))].sort();
  const plne = new Set(['111', '205']);
  const rows = ZP.map((z) => {
    const r = (st?.pojistovny || []).find((x) => String(x.kod) === z.kod);
    const byRok = Object.fromEntries((r?.roky || []).map((y) => [y.rok, y]));
    const posledni = (r?.roky || []).filter((y) => y.podani_dostupnost != null).at(-1) || null;
    // přepočet na kmen ze stejného roku, jako je kmen MZ (rok_hospodareni); jinak nic
    const rokKmen = poj?.rok_hospodareni ?? null;
    const proKmen = rokKmen != null && byRok[rokKmen]?.podani_dostupnost != null ? byRok[rokKmen] : null;
    const n = kmen.get(z.kod);
    const na100k = proKmen && plne.has(z.kod) && n ? Math.round(proKmen.podani_dostupnost / n * 100000) : null;
    return { kod: z.kod, zkratka: z.zkratka, definice: r?.definice || '', byRok, posledni, na100k, s16a: roky.map((rok) => byRok[rok]?.stiznosti_16a ?? null), _r: r || null };
  });
  return { roky, rows };
}

export function stiznostiHtml(st, poj) {
  if (!st || !Array.isArray(st.pojistovny)) return '<p class="zpc-note">Data o stížnostech zatím nejsou k dispozici.</p>';
  const { roky, rows } = buildStiznosti(st, poj);
  const head = roky.map((r) => `<th scope="col">${r}</th>`).join('');
  const table = '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Podání pojištěnců k dostupnosti péče podle výročních zpráv (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Pojišťovna</th>' + head + '<th scope="col">Na 100 tis. pojištěnců</th><th scope="col" class="zpc-txt">Co pojišťovna počítá</th><th scope="col" class="zpc-txt">Nejčastěji</th></tr></thead><tbody>'
    + rows.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row" class="zpc-txt">${dot(r.kod)}${esc(r.zkratka)}</th>`
      + roky.map((rok) => { const y = r.byRok[rok]; return `<td>${y ? (y.podani_dostupnost != null ? fmtN(y.podani_dostupnost) : '<span class="zpc-na" title="výroční zpráva počet neuvádí">neuvádí</span>') : NA}</td>`; }).join('')
      + `<td>${r.na100k != null ? `${fmtN(r.na100k)}<small>podání i kmen ${esc(String(poj?.rok_hospodareni ?? ''))}</small>` : '<span class="zpc-na" title="jiná definice, nepřepočítává se">—</span>'}</td>`
      + `<td class="zpc-txt">${esc(r.definice)}</td><td class="zpc-txt">${esc((r.posledni?.nejcastejsi || r._r?.roky?.at(-1)?.nejcastejsi || []).join(', '))}</td></tr>`).join('')
    + '</tbody></table></div>';
  const mv = rows.find((r) => r.kod === '211');
  const mvRadky = mv ? Object.values(mv.byRok).filter((y) => y.podani_celkem != null) : [];
  const mvHtml = mvRadky.length ? `<p class="zpc-note"><b>ZP MV ČR</b> jako jediná uvádí i celkový počet podání, kolik z nich bylo oprávněných a jak dlouho vyřízení trvalo: ${mvRadky.map((y) => `${y.rok}: ${fmtN(y.podani_celkem)} podání, ${y.opravnene_stiznosti} oprávněných, průměrně ${String(y.doba_vyrizeni_dni).replace('.', ',')} dne`).join('; ')}.</p>` : '';
  const s16 = '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Stížnosti podle § 16a zákona 106/1999 Sb. (tabulka, posuvná)"><table><thead><tr><th scope="col" class="zpc-txt">Pojišťovna</th>' + head + '</tr></thead><tbody>'
    + rows.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row" class="zpc-txt">${dot(r.kod)}${esc(r.zkratka)}</th>${r.s16a.map((v) => `<td>${v == null ? NA : v}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
  const detail = rows.filter((r) => r._r).map((r) => `<details class="zpc-acc" data-zp="${esc(r.kod)}"><summary>${dot(r.kod)}${esc(r.zkratka)}<span class="zpc-n">${(r._r.roky || []).length} VZ</span></summary><div class="zpc-acc-body"><ul>`
    + (r._r.roky || []).map((y) => `<li><b>${y.rok}</b> · ${esc(y.poznamka || '')} <small class="zpc-na">(${esc(y.soubor)}, ř. ${y.radek})</small></li>`).join('') + '</ul></div></details>').join('');
  return `<p class="zpc-note">Stav k ${esc(st.stav_k || '')}. Hodnoty jsou přepsané z kapitoly 4.6.1 výročních zpráv (místní a časová dostupnost podle § 40 zákona č. 48/1997 Sb.); „neuvádí“ = zpráva má jen slovní popis.</p>`
    + table + mvHtml
    + `<details class="zpc-acc"><summary>Proč se čísla nedají seřadit<span class="zpc-n">${(st.srovnatelnost || []).length}</span></summary><div class="zpc-acc-body"><ul>${li(st.srovnatelnost)}</ul></div></details>`
    + '<h4 class="zpc-inst-h4">Stížnosti podle § 16a zákona č. 106/1999 Sb. (jediná položka se stejnou definicí u všech)</h4>' + s16
    + `<details class="zpc-acc"><summary>Citace a řádky ve výročních zprávách<span class="zpc-n">${rows.filter((r) => r._r).length}</span></summary><div class="zpc-acc-body">${detail}</div></details>`;
}

// ---------------------------------------------------------------- DOM

const set = (doc, id, html) => { const el = doc.getElementById(id); if (el) el.innerHTML = html; };
const setN = (doc, id, n) => { const el = doc.getElementById(id); if (el) el.textContent = ` · ${n}`; };

export async function bootIndikatory(doc = globalThis.document) {
  const host = doc && doc.getElementById('zpIndKontrakt');
  if (!host || host.dataset.zpiInit === '1') return;
  host.dataset.zpiInit = '1';
  const [inv, kontrakt] = await Promise.all([loadJson(INV_URL), loadJson(KONTRAKT_URL)]);
  set(doc, 'zpIndStrucne', `<ol class="zpc-strucne">${li(inv?.strucne)}</ol>`);
  const skupiny = buildKontraktSkupiny(inv, kontrakt);
  set(doc, 'zpIndKontrakt', kontraktHtml(skupiny));
  setN(doc, 'zpIndKontraktN', skupiny.reduce((n, g) => n + g.polozky.length, 0));
  const vyloucit = new Set(skupiny.flatMap((g) => g.polozky.map((p) => p.id)));
  const auto = buildAutoSeznam(inv, kontrakt, vyloucit);
  set(doc, 'zpIndAuto', autoHtml(auto));
  setN(doc, 'zpIndAutoN', auto.length);
  set(doc, 'zpIndDatasety', datasetyHtml(inv));
  setN(doc, 'zpIndDatasetyN', (inv?.datasety?.polozky || []).length);
  set(doc, 'zpIndKdo', kdoUKohoHtml(inv));
  set(doc, 'zpIndNavrhy', navrhyHtml(inv));
  setN(doc, 'zpIndNavrhyN', (inv?.navrhy?.polozky || []).length);
  set(doc, 'zpIndMezery', li(inv?.mezery));
}

/**
 * Klientský servis, stížnosti na dostupnost a otevřená data (A0.5): přesunuto na stránku
 * „Aplikace a servis“. Plní #zpStiznosti a #zpOpendata; idempotentní přes dataset flag.
 */
export async function bootServis(doc = globalThis.document) {
  const hosts = doc ? ['zpStiznosti', 'zpOpendata'].map((id) => doc.getElementById(id)).filter(Boolean) : [];
  if (!hosts.length || hosts[0].dataset.zpiInit === '1') return;
  hosts.forEach((el) => { el.dataset.zpiInit = '1'; });
  const [od, st, poj] = await Promise.all([loadJson(OPENDATA_URL), loadJson(STIZNOSTI_URL), loadJson(POJ_URL)]);
  set(doc, 'zpOpendata', opendataHtml(od));
  set(doc, 'zpStiznosti', stiznostiHtml(st, poj));
}

if (typeof document !== 'undefined' && (document.getElementById('zpIndKontrakt') || document.getElementById('zpStiznosti') || document.getElementById('zpOpendata'))) {
  const boot = () => {
    if (document.getElementById('zpIndKontrakt')) bootIndikatory(document);
    if (document.getElementById('zpStiznosti') || document.getElementById('zpOpendata')) bootServis(document);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
