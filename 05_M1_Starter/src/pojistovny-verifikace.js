// Souhrn ověření čísel Srovnávače pojišťoven proti výročním zprávám (VZ).
// Čistá funkce verifikaceSouhrnHtml(verifikace) → HTML; modul se po načtení sám vykreslí do #zpVerifikace,
// pokud kontejner na stránce existuje (kontejner a <script type="module" src="src/pojistovny-verifikace.js">
// přidává orchestrátor stránky pojistovny.html). Data: data/pojistovny-verifikace.json
// (scripts/pojistovny-verify.js), manifest stažených VZ: ingest/manual/pojistovny/vz-manifest.json.
// Nenalezené číslo není chyba dat: je to položka k ruční kontrole redakcí.

import { escapeHtml } from './page-shared.js';

export const VERIFIKACE_URL = 'data/pojistovny-verifikace.json';
export const MANIFEST_URL = 'ingest/manual/pojistovny/vz-manifest.json';

const nf = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 4 });
const fmt = (v) => (typeof v === 'number' ? nf.format(v) : '—');

function datumCz(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : '';
}

/**
 * @param {object|null} v  obsah data/pojistovny-verifikace.json
 * @returns {string} HTML (tabulka 7 ZP × nalezeno / nenalezeno / bez textu + rozbalovací seznam nenalezených)
 */
export function verifikaceSouhrnHtml(v) {
  if (!v || !v.souhrn || !v.per_zp) {
    return '<p class="zpc-note zpc-na">Ověření proti výročním zprávám zatím neproběhlo.</p>';
  }
  const s = v.souhrn;
  const rows = Object.entries(v.per_zp)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kod, z]) => `<tr><th scope="row" class="zpc-txt">${escapeHtml(z.zkratka ?? kod)}</th>`
      + `<td>${z.nalezeno}</td><td>${z.nenalezeno ? `<strong>${z.nenalezeno}</strong>` : '0'}</td><td>${z.bez_textu}</td>`
      + `<td class="zpc-na">${z.mimo_rozsah}</td></tr>`)
    .join('');
  const nenalezene = (v.polozky ?? []).filter((p) => p.nalezeno === false);
  const bezTextu = (v.polozky ?? []).filter((p) => p.nalezeno === 'bez-textu');
  const seznam = nenalezene.length
    ? `<details class="zpc-acc"><summary>Nenalezená čísla (${nenalezene.length}) — k ruční kontrole</summary><div class="zpc-acc-body"><ul>`
      + nenalezene.map((p) => `<li><b>${escapeHtml(v.per_zp[p.kod]?.zkratka ?? p.kod)}</b> · <code>${escapeHtml(p.cesta)}</code> = ${escapeHtml(fmt(p.hodnota))} (VZ ${escapeHtml(p.dokument ?? '')})</li>`).join('')
      + '</ul></div></details>'
    : '<p class="zpc-note">Všechna ověřitelná čísla se v textu výročních zpráv našla.</p>';
  const bez = bezTextu.length
    ? `<p class="zpc-note">Bez ověření zůstalo ${bezTextu.length} čísel: výroční zpráva je sken bez textové vrstvy nebo její text chybí.</p>`
    : '';
  return `<div class="zpc-tbl"><table><caption class="zpc-note">Čísla přepsaná z výročních zpráv a jejich kontrola proti textu těchto zpráv`
    + `${v.generated_at ? ` (stav k ${escapeHtml(datumCz(v.generated_at))})` : ''}</caption>`
    + '<thead><tr><th class="zpc-txt">Pojišťovna</th><th>Nalezeno</th><th>Nenalezeno</th><th>Bez textu</th><th>Mimo rozsah</th></tr></thead>'
    + `<tbody>${rows}</tbody>`
    + `<tfoot><tr><th scope="row" class="zpc-txt">Celkem</th><td>${s.nalezeno}</td><td>${s.nenalezeno}</td><td>${s.bez_textu}</td><td class="zpc-na">${s.mimo_rozsah}</td></tr></tfoot>`
    + '</table></div>'
    + '<p class="zpc-note">„Mimo rozsah“ jsou hodnoty, jejichž zdrojem není výroční zpráva (Hodnocení MZ, sněmovní tisk, vlastní výpočet). '
    + 'Shoda se hledá tolerantně: jiný zápis čísla i jiné řády (tis. / mil. / mld.). Čísla s méně než čtyřmi platnými číslicemi se v textu najdou i náhodou, proto je kontrola spolehlivá hlavně u velkých částek.</p>'
    + bez
    + seznam
    + `<p class="zpc-note"><a href="${MANIFEST_URL}">Manifest stažených výročních zpráv (JSON)</a> · <a href="${VERIFIKACE_URL}">Podrobný výsledek ověření (JSON)</a></p>`;
}

async function init() {
  const el = document.getElementById('zpVerifikace');
  if (!el) return;
  try {
    const r = await fetch(VERIFIKACE_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    el.innerHTML = verifikaceSouhrnHtml(await r.json());
  } catch {
    el.innerHTML = verifikaceSouhrnHtml(null);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
