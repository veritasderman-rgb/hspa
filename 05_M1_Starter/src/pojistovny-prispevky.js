// Srovnávač pojišťoven — stránka Příspěvky (pojistovny-prispevky.html).
//
// „Na co mám u své pojišťovny nárok“: čtenář si vybere pojišťovnu (Moje pojišťovna) a složí
// domácnost (věk, pohlaví, životní situace); stránka ukáže tabulku příspěvků z fondu prevence
// s nejvyšší částkou, kdo z domácnosti ji může čerpat, za jakých podmínek a odkaz na web pojišťovny.
// Nad tím jsou předvolené pohledy (otec se třemi dětmi, těhotná, senior…) a témata (stomatologie,
// očkování, duševní zdraví…).
//
// Data: data/pojistovny-prispevky.json (rešerše webů 7 ZP, každá částka má url a doslovnou citaci;
// ověření citací: node ingest/verify-pojistovny-prispevky.js). Výpočty: src/prispevky-engine.js.
//
// Hranice (PLAN-SROVNAVAC-POJISTOVEN.md § 1, rozhodnutí PS 7. 10. 2026): výše příspěvků není
// hodnocení pojišťovny. Přehled sedmi pojišťoven je proto v pevném pořadí podle kódu, bez řazení,
// a součty jsou popsané jako nejvyšší možné částky, ne jako skóre.
//
// Čisté funkce (testované bez DOM): stavZUrl, urlZeStavu, popiskyClenu, personyHtml, temataHtml,
// domacnostHtml, souhrnHtml, poTematechHtml, tabulkaHtml, situacniHtml, podminkyHtml, prehledHtml, renderPrispevky.

import { esc, loadJson } from './pojistovny-shared.js';
import { readMojeZp, MOJE_EVENT } from './zp-interact.js';
import { ZP_BY_KOD } from './zp-palette.js';
import {
  PERSONY, SITUACE_VOLITELNE, MAX_CLENU, PERIODA_TEXT,
  parseDomacnost, serializeDomacnost, normalizeClen, clenLabel,
  soucetDomacnosti, radkyDomacnosti, kategorieZp, castkaText, kdoText,
} from './prispevky-engine.js';

export const DATA_URL = 'data/pojistovny-prispevky.json';
export const VYCHOZI_PERSONA = PERSONY[0];
const KODY = ['111', '201', '205', '207', '209', '211', '213'];

const kc = (v) => `${Math.round(v).toLocaleString('cs-CZ').replace(/ /g, ' ')} Kč`;
const zk = (z) => ZP_BY_KOD[String(z?.kod)]?.zkratka || z?.zkratka || String(z?.kod ?? '');
const datumCz = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : String(iso ?? '');
};
const zpByKod = (D, kod) => (D?.pojistovny || []).find((z) => String(z.kod) === String(kod)) || null;

// ---------------------------------------------------------------- stav a URL

/** Stav stránky z URL (?d=M42,Z9&tema=stomatologie&zp=111); zp jinak z „Moje pojišťovna“. */
export function stavZUrl(search, mojeZp = null) {
  const q = new URLSearchParams(search || '');
  const clenove = parseDomacnost(q.get('d'));
  const zpQ = q.get('zp');
  const persona = PERSONY.find((p) => p.id === q.get('pohled')) || null;
  const zaklad = clenove.length ? clenove : parseDomacnost((persona || VYCHOZI_PERSONA).kod);
  return {
    zp: KODY.includes(zpQ) ? zpQ : (KODY.includes(mojeZp) ? mojeZp : null),
    clenove: zaklad,
    tema: q.get('tema') || (clenove.length ? null : (persona?.tema || null)),
  };
}

/** Query string pro sdílení aktuálního pohledu (bez pojišťovny: ta je osobní volba čtenáře). */
export function urlZeStavu(stav) {
  const q = new URLSearchParams();
  q.set('d', serializeDomacnost(stav.clenove));
  if (stav.tema) q.set('tema', stav.tema);
  return `?${q.toString().replace(/%2C/g, ',')}`;
}

/** Popisky členů; shodné popisky dostanou pořadí („syn 5 (2)“). */
export function popiskyClenu(clenove) {
  const seen = new Map();
  return (clenove || []).map((c) => {
    const base = clenLabel(c);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });
}

// ---------------------------------------------------------------- ovládání

export function personyHtml(stav) {
  const kod = serializeDomacnost(stav.clenove);
  const chips = PERSONY.map((p) => {
    const on = p.kod === kod && (p.tema || null) === (stav.tema || null);
    return `<button type="button" class="zpc-chip" data-persona="${esc(p.id)}" aria-pressed="${on}">${esc(p.label)}</button>`;
  }).join('');
  return `<div class="zpc-chips" role="group" aria-label="Předvolené pohledy">${chips}</div>`;
}

export function temataHtml(ciselnik, stav) {
  const all = `<button type="button" class="zpc-chip" data-tema="" aria-pressed="${!stav.tema}">Všechno</button>`;
  const chips = (ciselnik || []).map((k) => (
    `<button type="button" class="zpc-chip" data-tema="${esc(k.id)}" aria-pressed="${stav.tema === k.id}">${esc(k.label)}</button>`
  )).join('');
  return `<div class="zpc-chips" role="group" aria-label="Téma příspěvků">${all}${chips}</div>`;
}

export function domacnostHtml(clenove) {
  const rows = (clenove || []).map((c, i) => {
    const sit = SITUACE_VOLITELNE
      .filter((s) => !(s.jenZena && c.pohlavi !== 'Z') && !(s.jenDospely && c.vek < 18))
      .map((s) => `<label class="zpp-sit"><input type="checkbox" data-clen="${i}" data-sit="${esc(s.id)}"${c.situace.includes(s.id) ? ' checked' : ''}> ${esc(s.label)}</label>`)
      .join('');
    return `<li class="zpp-clen">
      <label class="zpp-f"><span>Pohlaví</span>
        <select data-clen="${i}" data-pole="pohlavi"><option value="M"${c.pohlavi === 'M' ? ' selected' : ''}>muž</option><option value="Z"${c.pohlavi === 'Z' ? ' selected' : ''}>žena</option></select></label>
      <label class="zpp-f"><span>Věk</span>
        <input type="number" inputmode="numeric" min="0" max="110" step="1" value="${c.vek}" data-clen="${i}" data-pole="vek"></label>
      <div class="zpp-sits">${sit}</div>
      <button type="button" class="zpp-x" data-odebrat="${i}" aria-label="Odebrat člena ${i + 1}"${clenove.length <= 1 ? ' disabled' : ''}>Odebrat</button>
    </li>`;
  }).join('');
  const plno = (clenove || []).length >= MAX_CLENU;
  return `<ul class="zpp-clenove">${rows}</ul>
    <p class="zpp-add"><button type="button" class="zpc-chip" data-pridat="dospely"${plno ? ' disabled' : ''}>+ dospělý</button>
    <button type="button" class="zpc-chip" data-pridat="dite"${plno ? ' disabled' : ''}>+ dítě</button></p>`;
}

// ---------------------------------------------------------------- výsledek pro jednu pojišťovnu

/** Rozpad nejvyššího možného čerpání po tématech (jen témata, kde domácnost něco čerpat může). */
export function poTematechHtml(zp, clenove, ciselnik) {
  const rows = kategorieZp(zp, ciselnik).map((k) => {
    const s = soucetDomacnosti(zp, clenove, { kategorie: k.id });
    const n = radkyDomacnosti(zp, clenove, { kategorie: k.id }).hlavni.length;
    if (!n) return '';
    return `<tr><th scope="row">${esc(k.label)}</th><td>${s.rocne ? kc(s.rocne) : '—'}</td><td>${s.jednorazove ? kc(s.jednorazove) : '—'}</td><td>${n}</td></tr>`;
  }).join('');
  if (!rows) return '';
  return `<details class="zpc-acc zpc-acc--tbl" open><summary>Rozpad po tématech</summary><div class="zpc-acc-body"><div class="zpc-tbl zpp-tbl-clen" role="region" tabindex="0" aria-label="Nejvyšší možné čerpání domácnosti po tématech (tabulka, posuvná)"><table>
    <caption class="sr-only">Nejvyšší možné čerpání domácnosti po tématech, ${esc(zk(zp))}</caption>
    <thead><tr><th scope="col">Téma</th><th scope="col">Ročně nejvýš</th><th scope="col">Jednorázově nejvýš</th><th scope="col">Příspěvků</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p class="zpc-note">Kde společný strop pokrývá příspěvky z více témat, je součet témat vyšší než celkový součet domácnosti.</p></div></details>`;
}

export function souhrnHtml(zp, clenove, stav) {
  const s = soucetDomacnosti(zp, clenove, { kategorie: stav.tema });
  const labels = popiskyClenu(clenove);
  const rows = s.poClenech.map((x, i) => (
    `<tr><th scope="row">${esc(labels[i])}</th><td>${kc(x.rocne)}</td><td>${x.jednorazove ? kc(x.jednorazove) : '—'}</td><td>${x.polozky.length}</td></tr>`
  )).join('');
  const bez = s.bezCastky ? ` U ${s.bezCastky} příspěvků web částku neuvádí (bodový nebo kreditní systém), v součtu nejsou.` : '';
  return `<ul class="zpv zpv-stats zpp-stats">
      <li class="zpv-tile"><span class="zpv-tile-val"><b class="zpv-tile-num">${esc(kc(s.rocne).replace(' Kč', ''))}</b><span class="zpv-tile-unit">Kč ročně</span></span>
        <span class="zpv-tile-label">součet všech příspěvků, na které máte věkem a pohlavím nárok; vyčerpat je všechny je krajní případ</span></li>
      <li class="zpv-tile"><span class="zpv-tile-val"><b class="zpv-tile-num">${esc(kc(s.jednorazove).replace(' Kč', ''))}</b><span class="zpv-tile-unit">Kč jednorázově</span></span>
        <span class="zpv-tile-label">navíc na věci, které se čerpají jednou (rovnátka, těhotenství, jednorázové programy)</span></li>
    </ul>
    <div class="zpc-tbl zpp-tbl-clen" role="region" tabindex="0" aria-label="Nejvyšší možné čerpání po členech domácnosti (tabulka, posuvná)"><table>
      <caption class="sr-only">Nejvyšší možné čerpání po členech domácnosti, ${esc(zk(zp))}</caption>
      <thead><tr><th scope="col">Člen domácnosti</th><th scope="col">Ročně nejvýš</th><th scope="col">Jednorázově nejvýš</th><th scope="col">Příspěvků</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="zpc-note">Součet nejvyšších částek z webu pojišťovny po uplatnění společných ročních stropů.${bez} Příspěvky jsou nenárokové a každý má své podmínky; kolik lidé skutečně čerpají, ukazuje stránka <a href="pojistovny-prevence.html">Prevence</a>.</p>`;
}

function radekHtml(r, labels, stropy) {
  const p = r.prispevek;
  const per = PERIODA_TEXT[p.perioda] ?? '';
  const strop = p.strop_id ? stropy[p.strop_id] : null;
  const kdo = r.kdo.map((k) => `<li>${esc(labels[k.i])}</li>`).join('');
  const mozna = r.mozna.length
    ? `<small>při splnění situace i: ${esc(r.mozna.map((k) => labels[k.i]).join(', '))}</small>` : '';
  const podm = (p.podminky || []).slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('');
  return `<tr>
    <th scope="row" class="zpc-txt"><b>${esc(p.nazev)}</b>${p.popis ? `<small>${esc(p.popis)}</small>` : ''}</th>
    <td class="zpp-castka"><b>${esc(castkaText(p))}</b>${per ? `<small>${esc(per)}</small>` : ''}${strop ? `<small>společný strop: ${esc(strop.nazev)}</small>` : ''}</td>
    <td class="zpc-txt">${kdo ? `<ul class="zpc-pills">${kdo}</ul>` : ''}${mozna}<small>určeno pro: ${esc(kdoText(p))}</small></td>
    <td class="zpc-txt">${podm ? `<ul class="zpp-podm">${podm}</ul>` : '<span class="zpc-na">bez zvláštních podmínek</span>'}${p.poznamka ? `<small>${esc(p.poznamka)}</small>` : ''}${p.jistota === 'nejasne' ? '<small>Údaj na webu pojišťovny není jednoznačný.</small>' : ''}</td>
    <td><a href="${esc(p.url)}" rel="noopener" title="${esc(p.citace || '')}">web pojišťovny</a></td>
  </tr>`;
}

const HLAVICKA = '<thead><tr><th scope="col">Příspěvek</th><th scope="col">Nejvýš</th><th scope="col">Kdo z vás může čerpat</th><th scope="col">Podmínky</th><th scope="col">Zdroj</th></tr></thead>';

/** Hlavní tabulka: příspěvky, na které má aspoň jeden člen nárok, po kategoriích. */
export function tabulkaHtml(zp, clenove, stav, ciselnik) {
  const { hlavni } = radkyDomacnosti(zp, clenove, { kategorie: stav.tema });
  if (!hlavni.length) return '<p class="zpc-na">V tomto tématu jsme u pojišťovny pro vaši domácnost žádný příspěvek nenašli.</p>';
  const labels = popiskyClenu(clenove);
  const stropy = Object.fromEntries((zp.stropy || []).map((s) => [s.id, s]));
  const body = kategorieZp(zp, ciselnik).map((k) => {
    const rows = hlavni.filter((r) => r.prispevek.kategorie === k.id);
    if (!rows.length) return '';
    return `<tr class="zpp-kat"><th scope="colgroup" colspan="5">${esc(k.label)}</th></tr>${rows.map((r) => radekHtml(r, labels, stropy)).join('')}`;
  }).join('');
  return `<div class="zpc-tbl zpp-tbl" role="region" tabindex="0" aria-label="Příspěvky pro vaši domácnost (tabulka, posuvná)"><table>
    <caption class="sr-only">Příspěvky ${esc(zk(zp))} pro vaši domácnost</caption>${HLAVICKA}<tbody>${body}</tbody></table></div>`;
}

/** Příspěvky, které by šly čerpat až při splnění situace (těhotenství, dárcovství, diagnóza, profese…). */
export function situacniHtml(zp, clenove, stav) {
  const { situacni } = radkyDomacnosti(zp, clenove, { kategorie: stav.tema });
  if (!situacni.length) return '';
  const labels = popiskyClenu(clenove);
  const stropy = Object.fromEntries((zp.stropy || []).map((s) => [s.id, s]));
  return `<details class="zpc-acc zpc-acc--tbl"><summary>Další příspěvky při splnění situace<span class="zpc-n">${situacni.length}</span></summary>
    <div class="zpc-acc-body"><p class="zpc-note">Věkem a pohlavím na ně někdo z vás dosáhne, ale vyžadují situaci, kterou u něj nemáte zaškrtnutou (těhotenství, dárcovství, diagnóza, vybrané povolání, bonusový program). Do součtu se nepočítají.</p>
    <div class="zpc-tbl zpp-tbl" role="region" tabindex="0" aria-label="Další příspěvky při splnění situace (tabulka, posuvná)"><table><caption class="sr-only">Další příspěvky ${esc(zk(zp))} při splnění situace</caption>${HLAVICKA}<tbody>${situacni.map((r) => radekHtml(r, labels, stropy)).join('')}</tbody></table></div></div></details>`;
}

/** Společné stropy, obecné podmínky a co se nepodařilo dohledat. */
export function podminkyHtml(zp) {
  const cit = (x) => `<li>${esc(x.text || x.nazev)}${x.hodnota != null ? ` <b>${x.typ === 'pocet' ? `${x.hodnota}×` : kc(x.hodnota)}</b>` : ''}${x.plati_pro ? ` (${esc(x.plati_pro)})` : ''} <a href="${esc(x.url)}" rel="noopener" title="${esc(x.citace || '')}">zdroj</a></li>`;
  const stropy = (zp.stropy || []).map(cit).join('');
  const obecne = (zp.obecne_podminky || []).map(cit).join('');
  const nen = (zp.nenalezeno || []).map((t) => `<li>${esc(t)}</li>`).join('');
  const pozn = (zp.poznamky || []).map((t) => `<li>${esc(t)}</li>`).join('');
  return `<details class="zpc-acc"><summary>Společné stropy a obecné podmínky ${esc(zk(zp))}</summary><div class="zpc-acc-body">
    ${stropy ? `<h4>Společné stropy</h4><ul>${stropy}</ul>` : ''}
    ${obecne ? `<h4>Obecné podmínky čerpání</h4><ul>${obecne}</ul>` : ''}
    ${pozn ? `<h4>Poznámky k datům</h4><ul>${pozn}</ul>` : ''}
    ${nen ? `<h4>Co se nepodařilo dohledat</h4><ul>${nen}</ul>` : ''}
    <p class="zpc-note">Rozcestník příspěvků pojišťovny: <a href="${esc(zp.rozcestnik_url)}" rel="noopener">${esc(zp.rozcestnik_url)}</a>. Ověřeno ${esc(datumCz(zp.overeno_at))}.</p>
  </div></details>`;
}

// ---------------------------------------------------------------- přehled sedmi pojišťoven

/** Tatáž domácnost u každé pojišťovny; pořadí podle kódu, bez řazení (není to hodnocení). */
export function prehledHtml(D, clenove, stav) {
  const rows = KODY.map((kod) => {
    const zp = zpByKod(D, kod);
    if (!zp) return '';
    const s = soucetDomacnosti(zp, clenove, { kategorie: stav.tema });
    const n = radkyDomacnosti(zp, clenove, { kategorie: stav.tema }).hlavni.length;
    return `<tr${stav.zp === kod ? ' aria-current="true"' : ''} data-zp="${kod}"><th scope="row">${esc(zk(zp))}</th><td>${kc(s.rocne)}</td><td>${s.jednorazove ? kc(s.jednorazove) : '—'}</td><td>${n}</td><td>${s.bezCastky || '—'}</td></tr>`;
  }).join('');
  return `<div class="zpc-tbl" role="region" tabindex="0" aria-label="Tatáž domácnost u sedmi pojišťoven (tabulka, posuvná)"><table>
    <caption class="sr-only">Nejvyšší možné čerpání téže domácnosti u sedmi pojišťoven</caption>
    <thead><tr><th scope="col">Pojišťovna</th><th scope="col">Ročně nejvýš</th><th scope="col">Jednorázově nejvýš</th><th scope="col">Příspěvků pro vás</th><th scope="col">Bez uvedené částky</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p class="zpc-note">Pořadí podle kódu pojišťovny. Jde o součet nejvyšších možných částek, ne o hodnocení: výše příspěvků neříká nic o tom, zda mají dopad na zdraví, a pojišťovny s bodovým systémem částky předem neuvádějí.</p>`;
}

// ---------------------------------------------------------------- skládání stránky

/** HTML celého interaktivního bloku pro daný stav. */
export function renderPrispevky(D, stav) {
  const zp = stav.zp ? zpByKod(D, stav.zp) : null;
  const ciselnik = D?.kategorie || [];
  const temata = zp ? kategorieZp(zp, ciselnik) : ciselnik;
  const labels = popiskyClenu(stav.clenove).join(', ');
  const detail = zp
    ? `<section class="zpp-vysledek" aria-labelledby="zppVysH">
        <h2 class="section-title zpc-h3" id="zppVysH"><span>${esc(zk(zp))}: ${esc(labels)}</span></h2>
        ${souhrnHtml(zp, stav.clenove, stav)}
        ${stav.tema ? '' : poTematechHtml(zp, stav.clenove, ciselnik)}
        ${tabulkaHtml(zp, stav.clenove, stav, ciselnik)}
        ${situacniHtml(zp, stav.clenove, stav)}
        ${podminkyHtml(zp)}
      </section>`
    : '<p class="zpc-box zpp-vyber" role="status">Vyberte nahoře svou pojišťovnu a uvidíte tabulku příspěvků pro vaši domácnost. Níže je mezitím souhrn u všech sedmi.</p>';
  return `<div class="zpc-box zpp-ovl">
      <h4>Kdo jste</h4>
      ${personyHtml(stav)}
      ${domacnostHtml(stav.clenove)}
      <h4 class="zpp-h">Co vás zajímá</h4>
      ${temataHtml(temata, stav)}
    </div>
    ${detail}
    <details class="zpc-acc zpc-acc--tbl"${zp ? '' : ' open'}><summary>Tatáž domácnost u všech sedmi pojišťoven</summary><div class="zpc-acc-body">${prehledHtml(D, stav.clenove, stav)}</div></details>`;
}

// ---------------------------------------------------------------- DOM

export async function bootPrispevky(doc = globalThis.document, win = globalThis.window) {
  const host = doc && doc.getElementById('zpPrispevky');
  if (!host || host.dataset.zppInit === '1') return;
  host.dataset.zppInit = '1';
  host.innerHTML = '<p class="zpc-note" role="status">Načítám příspěvky pojišťoven…</p>';
  const D = await loadJson(DATA_URL);
  if (!D) { host.innerHTML = '<p class="zpc-na">Data o příspěvcích se nepodařilo načíst.</p>'; return; }
  let moje = null;
  try { moje = readMojeZp(); } catch (_) { /* bez localStorage */ }
  const stav = stavZUrl(win?.location?.search || '', moje);
  const stavEl = doc.getElementById('zpPrispevkyStav');
  if (stavEl && D.stav_k) stavEl.textContent = `weby pojišťoven · stav k ${datumCz(D.stav_k)}`;

  const draw = (focusSel = null) => {
    host.innerHTML = renderPrispevky(D, stav);
    try { win?.history?.replaceState(null, '', `${win.location.pathname}${urlZeStavu(stav)}${win.location.hash || ''}`); } catch (_) { /* file:// */ }
    if (focusSel) host.querySelector(focusSel)?.focus();
  };

  host.addEventListener('click', (e) => {
    const t = e.target?.closest?.('button');
    if (!t || !host.contains(t)) return;
    if (t.dataset.persona != null) {
      const p = PERSONY.find((x) => x.id === t.dataset.persona);
      if (!p) return;
      stav.clenove = parseDomacnost(p.kod);
      stav.tema = p.tema || null;
      draw(`[data-persona="${p.id}"]`);
    } else if (t.dataset.tema != null) {
      stav.tema = t.dataset.tema || null;
      draw(`[data-tema="${t.dataset.tema}"]`);
    } else if (t.dataset.pridat) {
      if (stav.clenove.length >= MAX_CLENU) return;
      stav.clenove.push(normalizeClen(t.dataset.pridat === 'dite' ? { pohlavi: 'Z', vek: 8 } : { pohlavi: 'Z', vek: 40 }));
      draw(`[data-pridat="${t.dataset.pridat}"]`);
    } else if (t.dataset.odebrat != null) {
      if (stav.clenove.length <= 1) return;
      stav.clenove.splice(Number(t.dataset.odebrat), 1);
      draw('[data-pridat="dospely"]');
    }
  });
  host.addEventListener('change', (e) => {
    const t = e.target;
    const i = Number(t?.dataset?.clen);
    const c = stav.clenove[i];
    if (!c) return;
    if (t.dataset.pole === 'pohlavi') c.pohlavi = t.value;
    else if (t.dataset.pole === 'vek') c.vek = Number(t.value);
    else if (t.dataset.sit) c.situace = t.checked ? [...c.situace, t.dataset.sit] : c.situace.filter((s) => s !== t.dataset.sit);
    stav.clenove[i] = normalizeClen(c);
    const sel = t.dataset.sit ? `[data-clen="${i}"][data-sit="${t.dataset.sit}"]` : `[data-clen="${i}"][data-pole="${t.dataset.pole}"]`;
    draw(sel);
  });
  doc.addEventListener(MOJE_EVENT, (e) => {
    const kod = e?.detail?.kod ?? null;
    stav.zp = KODY.includes(kod) ? kod : null;
    draw();
  });
  draw();
}

if (typeof document !== 'undefined' && document.getElementById('zpPrispevky')) {
  const boot = () => { bootPrispevky(document, window); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
