// CSV utility — wrapper nad csv-parse pro fallback CSV soubory z ČSÚ KROK,
// Eurostatu a OECD. Defenzivně mapuje názvy sloupců.

import { parse } from 'csv-parse/sync';

/**
 * Parsuj CSV text na pole objektů.
 * @param {string} text
 * @param {{ delimiter?: string, columns?: boolean | string[] }} [options]
 * @returns {Array<Record<string, string>>}
 */
export function parseCsv(text, options = {}) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    ...options,
  });
}
