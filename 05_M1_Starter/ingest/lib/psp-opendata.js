// Otevřená data Poslanecké sněmovny (https://www.psp.cz/sqw/hp.sqw?k=1300):
// soubory .unl (Windows-1250, oddělovač |, bez hlavičky, řádek končí |).
// Pořadí sloupců ověřil průzkumný běh ingest/probe/psp-probe.js 18. 11. 2026
// na tisku 235 a sněmovních dokumentech 1796 a 1813.

import * as cheerio from 'cheerio';

export const PSP = 'https://www.psp.cz';
export const OPENDATA = `${PSP}/eknih/cdrom/opendata`;

// Volební období → id orgánu „Poslanecká sněmovna“ v tabulkách (10. období = 174).
export const organObdobi = obdobi => 164 + Number(obdobi);

export function parseUnl(buf) {
  return new TextDecoder('windows-1250').decode(buf)
    .split(/\r?\n/).filter(Boolean)
    .map(r => r.split('|').slice(0, -1).map(c => c.trim()));
}

const isoDate = s => {
  let m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(s ?? '');
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /^(\d{4}-\d{2}-\d{2})/.exec(s ?? '');
  return m ? m[1] : null;
};

/** typ_zakon.unl: „VL - vláda“, „PO - poslanec“, „UT - Moravskoslezský kraj“… → typ předkladatele. */
export function predkladatelTyp(label) {
  const k = (label ?? '').slice(0, 2).toUpperCase();
  if (k === 'VL') return 'vlada';
  if (k === 'PO') return 'poslanci';
  if (k === 'SE') return 'senat';
  if (k.startsWith('U') || /kraj|hlavní město/i.test(label ?? '')) return 'kraj';
  return 'jiny';
}

/** Když číselník typ neurčí (skupina poslanců mívá jiný kód), rozhodne začátek úplného názvu. */
export function predkladatelTypZNazvu(nazev) {
  if (/^Vládní\s+návrh/i.test(nazev ?? '')) return 'vlada';
  if (/^Návrh\s+poslan/i.test(nazev ?? '')) return 'poslanci';
  if (/^Senátní\s+návrh|^Návrh\s+Senátu/i.test(nazev ?? '')) return 'senat';
  if (/^Návrh\s+[Zz]astupitelstva/i.test(nazev ?? '')) return 'kraj';
  return 'jiny';
}

/**
 * Návrhy zákonů jednoho volebního období z tisky.unl.
 * Sloupce: 0 id_tisk · 1 id_druh · 2 id_stav · 3 ct · 4 cislo_za · 5 id_navrh (typ_zakon) ·
 * 7 id orgánu období · 9 navrhovatel · 10 název · 11 předloženo · 15 úplný název · 18 návrh § 90/2.
 */
export function lawBills(tables, obdobi) {
  const organ = String(organObdobi(obdobi));
  const druh = new Map(tables.druh_tisku.map(r => [r[0], r[2]]));
  const typ = new Map(tables.typ_zakon.map(r => [r[0], r[1]]));
  const typStavu = new Map((tables.typ_stavu ?? []).map(r => [r[0], r[1]]));
  const stavy = new Map((tables.stavy ?? []).map(r => [r[0], r[1]]));
  const out = [];
  for (const r of tables.tisky) {
    if (r[7] !== organ || r[4] !== '0') continue;
    if (!/návrh.*zákon/i.test(druh.get(r[1]) ?? '')) continue;
    const ct = Number(r[3]);
    out.push({
      id_tisk: Number(r[0]),
      ct,
      nazev: r[10],
      uplny_nazev: r[15] || r[10],
      predkladatel_typ: (t => (t === 'jiny' ? predkladatelTypZNazvu(r[15] || r[10]) : t))(predkladatelTyp(typ.get(r[5]))),
      predkladatel: r[9] || null,
      predlozeno: isoDate(r[11]),
      stav: typStavu.get(stavy.get(r[2])) ?? null,
      navrzeno_90_2: r[18] === '1',
      url: `${PSP}/sqw/historie.sqw?o=${obdobi}&t=${ct}`,
    });
  }
  return out;
}

/**
 * Písemné pozměňovací návrhy jednoho období ze sd_dokument.unl.
 * Sloupce: 0 id_dokument · 1 id orgánu období · 2 číslo dokumentu · 3 typ · 6 číslo tisku ·
 * 7 id_osoba · 8 předloženo. Řádek bez čísla tisku není pozměňovací návrh k tisku.
 */
export function writtenAmendments(rows, obdobi) {
  const organ = String(organObdobi(obdobi));
  return rows
    .filter(r => r[1] === organ && /^\d+$/.test(r[6] ?? ''))
    .map(r => ({
      id_dokument: Number(r[0]),
      cd: Number(r[2]),
      ct: Number(r[6]),
      datum: isoDate(r[8]),
      url: `${PSP}/sqw/sd.sqw?cd=${r[2]}&o=${obdobi}`,
    }));
}

/** Stránka sněmovního dokumentu nebo tisku: předkladatel a odkaz na .docx. */
export function parseDocPage(html, baseUrl) {
  const $ = cheerio.load(html);
  let docx = null;
  $('a[href]').each((_, a) => {
    if (!docx && /\.docx$/i.test($(a).text().trim())) docx = new URL($(a).attr('href'), baseUrl).href;
  });
  const autor = $('a[href*="detail.sqw?id="]').filter((_, a) => !/Předseda/i.test($(a).text())).first().text().replace(/\s+/g, ' ').trim() || null;
  const jePN = /pozměňovací/i.test($('h1, #main-content').first().text() + $('title').text() + $('body').text().slice(0, 4000));
  return { docx, autor, jePN };
}
