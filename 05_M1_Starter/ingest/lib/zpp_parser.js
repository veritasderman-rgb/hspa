// ZPP PDF parser: extrahuje tabulku "Výdaje na zdravotní služby podle segmentů péče"
// z PDF zdravotně pojistných plánů. Struktura je standardizovaná vyhláškou
// č. 362/2010 Sb., takže jedna heuristika pokrývá všechny 7 ZP.
//
// Strategie:
//   1. Z PDF pomocí pdfjs-dist (nebo seed JSON v offline režimu) získáme pole
//      textových položek s pozicemi {str, x, y, page}.
//   2. Najdeme stránku s tabulkou — kotvíme na nadpis "Výdaje na zdravotní
//      služby podle segmentů péče" nebo "VÝDAJE NA ZDRAVOTNÍ SLUŽBY" + "segment".
//   3. Tabulku parsujeme řádek po řádku: text v levém sloupci = název segmentu,
//      čísla v pravých sloupcích = hodnoty pro plánovaný rok (v tis. Kč).
//   4. Aliasy ze zpp_segments.json mapují řádky na canonical segment id.
//   5. Vrátíme strukturu { year, payer, total_tis_kc, segments: { id: value } }.
//
// Pdfjs-dist je optional dependency — pokud není nainstalovaný, parser hlásí
// chybu a fallback je čtení ručně zpracovaných JSON dat z ingest/manual/zpp/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const ZPP_SEGMENTS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'zpp_segments.json'), 'utf8')
);

/**
 * Načte text z PDF souboru. Pokud není pdfjs-dist nainstalovaný, vrátí null
 * a volající musí použít fallback (ingest/manual/zpp/{zp}-{year}.json).
 * @param {string} filePath
 * @returns {Promise<Array<{text: string, x: number, y: number, page: number}>|null>}
 */
export async function extractTextItems(filePath, { maxPages } = {}) {
  let pdfjs;
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    return null;
  }
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const items = [];
  const last = maxPages ? Math.min(doc.numPages, maxPages) : doc.numPages;
  for (let p = 1; p <= last; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      const transform = item.transform || [];
      items.push({
        text: (item.str ?? '').trim(),
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        page: p,
      });
    }
  }
  return items;
}

/**
 * Zorganizuje text items do řádků podle Y-souřadnice (stejná stránka,
 * tolerance ±3 px).
 */
export function groupIntoRows(items, tolerance = 3) {
  const byPage = new Map();
  for (const it of items) {
    if (!it.text) continue;
    if (!byPage.has(it.page)) byPage.set(it.page, []);
    byPage.get(it.page).push(it);
  }
  const rows = [];
  for (const [page, pageItems] of byPage) {
    pageItems.sort((a, b) => b.y - a.y || a.x - b.x);
    let current = null;
    for (const it of pageItems) {
      if (!current || Math.abs(current.y - it.y) > tolerance) {
        current = { page, y: it.y, items: [] };
        rows.push(current);
      }
      current.items.push(it);
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}

/**
 * Najde stránku s tabulkou segmentů — hledá kotvící text.
 */
export function findSegmentTablePages(rows) {
  const anchors = [];
  for (const row of rows) {
    const text = row.items.map(i => i.text).join(' ').toLowerCase();
    if (
      text.includes('výdaje na zdravotní služby') &&
      (text.includes('segment') || text.includes('podle druhů péče'))
    ) {
      anchors.push(row.page);
    }
  }
  return [...new Set(anchors)];
}

/**
 * Parsuje řádek tabulky: levý sloupec = název segmentu, ostatní = čísla.
 * Vrací { label, values: [n1, n2, ...] } nebo null pokud řádek není datový.
 */
export function parseTableRow(items) {
  const texts = items.map(i => i.text).filter(t => t);
  if (!texts.length) return null;
  const numbers = [];
  const labelParts = [];
  for (const t of texts) {
    // Číslo: "1 234 567" nebo "1234567,89" nebo "12 345" — povolí mezeru jako tisícový oddělovač
    const cleaned = t.replace(/\s/g, '').replace(/ /g, '').replace(',', '.');
    const n = Number(cleaned);
    if (Number.isFinite(n) && cleaned.length > 0 && /^[\d.,-]+$/.test(cleaned)) {
      numbers.push(n);
    } else if (numbers.length === 0) {
      labelParts.push(t);
    }
  }
  const label = labelParts.join(' ').trim();
  if (!label || numbers.length === 0) return null;
  return { label, values: numbers };
}

/**
 * Mapuje název segmentu z ZPP na canonical segment id ze zpp_segments.json.
 * Vrací { id, label, color } nebo null.
 */
export function resolveSegment(label) {
  const norm = label.toLowerCase();
  for (const [id, seg] of Object.entries(ZPP_SEGMENTS.segments)) {
    for (const alias of seg.aliases) {
      if (norm.includes(alias.toLowerCase())) {
        return { id, label: seg.label, color: seg.color };
      }
    }
  }
  return null;
}

/**
 * Hlavní agregace: z PDF items → { year, payer, segments: { id: value_tis_kc } }.
 *
 * @param {object} opts
 * @param {Array} opts.items  výstup extractTextItems
 * @param {string} opts.payer kód ZP, např. "111"
 * @param {number} opts.year  plánovaný rok ZPP
 */
export function parseZpp({ items, payer, year }) {
  if (!items?.length) {
    return { payer, year, segments: {}, total_tis_kc: 0, parsed: false };
  }
  const rows = groupIntoRows(items);
  const tablePages = findSegmentTablePages(rows);

  const segments = {};
  for (const row of rows) {
    if (tablePages.length && !tablePages.includes(row.page)) continue;
    const parsed = parseTableRow(row.items);
    if (!parsed) continue;
    const seg = resolveSegment(parsed.label);
    if (!seg) continue;
    // Heuristika: bereme první významnou hodnotu (obvykle = plánovaný rok).
    const val = parsed.values.find(v => Math.abs(v) >= 1000);
    if (val == null) continue;
    segments[seg.id] = (segments[seg.id] ?? 0) + val;
  }

  const total = Object.values(segments).reduce((a, v) => a + v, 0);
  return { payer, year, segments, total_tis_kc: total, parsed: true };
}

/**
 * Sloučí ZPP segmenty do 4 vizuálních uzlů Sankey (luzkova, ambulantni,
 * leky, ostatni) podle sankey_buckets v zpp_segments.json.
 */
export function bucketize(segments) {
  const buckets = ZPP_SEGMENTS.sankey_buckets;
  const out = {};
  for (const [bucket, segIds] of Object.entries(buckets)) {
    if (bucket === 'comment') continue;
    out[bucket] = segIds.reduce((a, id) => a + (segments[id] ?? 0), 0);
  }
  return out;
}
