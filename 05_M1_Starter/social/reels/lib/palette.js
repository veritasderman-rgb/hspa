// Paleta animovaných příspěvků. Vychází z brandu HSPA Kompas
// (docs/visual-components.md § 0): inkoust + papír, ČERVENÁ PATŘÍ JEN HROTU STŘELKY.
// Postavičky a scény proto barví teplé neutrály, jantar, zeleň a nebeská modř —
// nikdy červenou. Hlídá test tests/reels-engine.test.js.

export const C = {
  ink: '#1F1A14',        // obrysy, text
  inkSoft: '#4A3F33',    // vnitřek pusy, stíny
  paper: '#FBF8F1',      // tělo Kompíka, bubliny
  cream: '#FFF6E2',      // ciferník
  sand: '#F3E9D6',       // pozadí scény (světlé)
  sand2: '#E9DBC1',      // podlaha, vzor
  night: '#16110B',      // tmavé pozadí (shodné s IG kartami)
  amber: '#FFB53A',      // warn / zvýraznění
  amberSoft: '#FFD98F',
  green: '#5FD083',      // good
  greenDeep: '#2E9E5B',
  sky: '#8EC5E8',        // neutrální skupina (OECD, EU)
  skyDeep: '#3F8CC0',
  plum: '#B48AD8',       // doplňková postavička
  blush: '#FFB38A',      // tváře
  skin1: '#F6D2B0',
  skin2: '#D9A37A',
  skin3: '#9C6B48',
  grey: '#A99E8C',
  white: '#FFFFFF',
  // ↓ jediná výjimka — hrot střelky Kompíka
  needle: '#B8361E',
};

/** Barvy, které smí nést postavičky (obleky, cedule, skupiny). */
export const CAST_COLORS = ['amber', 'green', 'sky', 'plum', 'sand2', 'grey', 'paper', 'skyDeep', 'greenDeep'];

export const FONT = {
  sans: 'Inter',
  serif: 'Source Serif 4',
};
