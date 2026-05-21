// Tenký wrapper nad SheetJS (xlsx) pro ingest pipeline.
// Sjednocuje čtení XLSX datových souhrnů NZIP — vrací listy jako pole polí.

import XLSX from 'xlsx';

/** Načte workbook ze souboru. */
export function readWorkbook(filePath, opts = {}) {
  return XLSX.readFile(filePath, { cellDates: false, ...opts });
}

/** Vrátí názvy listů v souboru. */
export function sheetNames(filePath) {
  return readWorkbook(filePath, { bookSheets: true }).SheetNames;
}

/**
 * Načte list jako pole řádků (každý řádek = pole buněk).
 * @param {string} filePath
 * @param {string|number} sheet  název listu nebo index (0 = první)
 * @param {object} opts  { maxRows }
 */
export function readSheet(filePath, sheet = 0, opts = {}) {
  const wb = readWorkbook(filePath, opts.maxRows ? { sheetRows: opts.maxRows } : {});
  const name = typeof sheet === 'number' ? wb.SheetNames[sheet] : sheet;
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`xlsx: list '${sheet}' nenalezen v ${filePath}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
}

/**
 * Najde index řádku hlavičky — první řádek s alespoň `minCells` neprázdnými
 * buňkami, volitelně obsahující všechny řetězce z `mustContain`.
 */
export function findHeaderRow(rows, { minCells = 5, mustContain = [] } = {}) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const filled = r.filter((c) => c != null && String(c).trim() !== '').length;
    if (filled < minCells) continue;
    if (mustContain.length) {
      const joined = r.map((c) => String(c ?? '')).join(' | ');
      if (!mustContain.every((m) => joined.includes(m))) continue;
    }
    return i;
  }
  return -1;
}

/** Normalizace buňky na číslo (null pokud nelze). */
export function num(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Ořeže whitespace z textové buňky. */
export function txt(v) {
  return v == null ? '' : String(v).replace(/\s+/g, ' ').trim();
}
