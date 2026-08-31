// Geokódování pohotovostí přes adresu z registru NRPZS.
//
// PROČ NE PŘES IDENTIFIKÁTOR: seznam VZP má u každé pohotovosti kód ve tvaru
// „{IČZ}_{typ}“. IČZ je interní číslo zařízení u pojišťovny — s IČO ani
// s kódem místa poskytování v NRPZS nemá nic společného (ověřeno: ze 283
// kódů VZP nesedí na IČO v registru ani jeden). Jediné, co oba zdroje sdílejí,
// je adresa.
//
// JAK SE ADRESY LIŠÍ:
//   VZP    „Vídeňská 800, 14059 Praha“
//   NRPZS  ulice „Vídeňská“, číslo „800/8“, PSČ „14059“, obec „Praha 4“
// Číslo popisné/orientační se zapisuje jednou jako „800“, jindy „800/8“
// nebo „8“, PSČ s mezerou i bez. Klíčem proto je (PSČ nebo obec) + název
// ulice, a číslo slouží k výběru mezi kandidáty, ne k sestavení klíče.
// Na 283 pohotovostech to dá 267 shod na úrovni domu; zbytek spadne na
// střed obce a stránka to u výsledku přizná.

/** Diakritiku a velikost písmen pryč. */
export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Jádro názvu ulice bez čísel a bez zkratek („tř.“, „nám.“, „ul.“),
 * které oba registry píšou různě.
 */
export function streetKey(raw) {
  return norm(raw)
    .replace(/\b(tr|trida|nam|namesti|ul|ulice|nabr|nabrezi)\.?\b/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Množina čísel v textu — „800/8“ → {'800','8'}. */
export function numberSet(raw) {
  return new Set(String(raw ?? '').match(/\d+/g) ?? []);
}

/** PSČ bez mezery, nebo null. */
export function pscKey(raw) {
  const m = /(\d{3})\s?(\d{2})/.exec(String(raw ?? ''));
  return m ? `${m[1]}${m[2]}` : null;
}

/**
 * WKT z NRPZS. POZOR: registr píše POINT(šířka délka), tedy prohozeně proti
 * standardnímu WKT POINT(x y).
 * @returns {{lat: number, lon: number}|null}
 */
export function parseWktPoint(wkt) {
  const m = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(String(wkt ?? ''));
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!(lat >= 48.4 && lat <= 51.2) || !(lon >= 12.0 && lon <= 18.9)) return null;
  return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
}

/**
 * Postaví adresní index nad celým registrem (ne jen nad pohotovostmi —
 * budovu nemocnice zná registr i z jiných jejích pracovišť).
 *
 * @param {Array<Record<string,string>>} rows — řádky NRPZS CSV
 * @returns {Record<string, Array<[number, number, string]>>} klíč → [lat, lon, čísla]
 */
export function buildAddressGeoIndex(rows) {
  /** @type {Record<string, Array<[number, number, string]>>} */
  const index = {};

  for (const r of rows ?? []) {
    const point = parseWktPoint(r.ZZ_GPS);
    if (!point) continue;
    const street = streetKey(r.ZZ_ulice);
    if (!street) continue;

    const numbers = [...numberSet(r.ZZ_cislo_domovni_orientacni)].join('/');
    const psc = pscKey(r.ZZ_PSC);
    const obec = norm(r.ZZ_obec);

    for (const prefix of [psc, obec]) {
      if (!prefix) continue;
      const key = `${prefix}|${street}`;
      index[key] ??= [];
      // Jedna adresa nese často desítky ordinací se shodnými souřadnicemi —
      // duplicity by index nafoukly a k ničemu nejsou.
      if (!index[key].some(([la, lo]) => la === point.lat && lo === point.lon)) {
        index[key].push([point.lat, point.lon, numbers]);
      }
    }
  }

  return index;
}

/**
 * Rozloží adresu z VZP na části.
 * „Boženy Němcové 585/54, 37001, České Budějovice“
 *   → { street: 'Boženy Němcové 585/54', psc: '37001', obec: 'České Budějovice' }
 */
export function splitAddress(address) {
  const s = String(address ?? '').trim();
  if (!s) return { street: null, psc: null, obec: null };

  const parts = s.split(',').map(p => p.trim()).filter(Boolean);
  const street = parts[0] ?? null;
  const psc = pscKey(s);

  let obec = null;
  for (const part of parts.slice(1)) {
    const withoutPsc = part.replace(/\d{3}\s?\d{2}/, '').trim();
    if (withoutPsc) { obec = withoutPsc; break; }
  }
  return { street, psc, obec };
}

/**
 * Najde souřadnice budovy pro danou adresu.
 *
 * @param {Record<string, Array<[number, number, string]>>} index
 * @param {string} address — adresa ve tvaru, v jakém ji uvádí VZP
 * @returns {{lat: number, lon: number, precision: 'house'|'street'}|null}
 *   'house'  — sedí ulice i číslo popisné
 *   'street' — sedí jen ulice (v ulici je jediný záznam registru)
 */
export function geocodeAddress(index, address) {
  const { street, psc, obec } = splitAddress(address);
  if (!street) return null;

  const key = streetKey(street.replace(/[\d/]+\s*[a-z]?$/i, ''));
  if (!key) return null;

  const candidates = (psc && index[`${psc}|${key}`]) || (obec && index[`${norm(obec)}|${key}`]) || null;
  if (!candidates?.length) return null;

  const wanted = numberSet(street);
  const byNumber = candidates.find(([, , nums]) => nums.split('/').some(n => wanted.has(n)));
  if (byNumber) return { lat: byNumber[0], lon: byNumber[1], precision: 'house' };

  // Bez shody čísla bereme ulici jen tehdy, když je v ní jediný záznam —
  // jinak bychom si vybrali libovolný dům v ulici a tvářili se přesně.
  if (candidates.length === 1) return { lat: candidates[0][0], lon: candidates[0][1], precision: 'street' };
  return null;
}
