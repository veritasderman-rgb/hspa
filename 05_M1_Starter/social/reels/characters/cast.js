// Vedlejší postavičky („obsazení"). Jednoduché fazolky se stejnou linkou jako Kompík:
// tlustý inkoustový obrys, kulatá hlava, tečkové oči. Role se poznají podle oblečení
// a doplňku, NIKDY podle karikatury skutečné osoby (GOVERNANCE § 2.5).
//
// Role: sestra · lekar · pacient · senior · dite · urednik · zachranar
// person(p) → SVG skupina; origin = bod na zemi mezi nohama, výška ~ 190 px při s = 1.

import { C } from '../lib/palette.js';
import { r1, rng } from '../lib/anim.js';

const SKINS = [C.skin1, C.skin2, C.skin3];
const HAIRS = [C.ink, C.inkSoft, '#8A5A2B', '#D9B26A', C.grey];

export const ROLES = {
  sestra:    { outfit: C.sky,    trim: C.skyDeep,  acc: 'cap' },
  lekar:     { outfit: C.paper,  trim: C.grey,     acc: 'stetho' },
  pacient:   { outfit: C.amber,  trim: '#E09A20',  acc: null },
  senior:    { outfit: C.plum,   trim: '#8E66B4',  acc: 'cane', hair: C.grey },
  dite:      { outfit: C.green,  trim: C.greenDeep, acc: null, small: true },
  urednik:   { outfit: C.grey,   trim: C.inkSoft,  acc: 'tie' },
  zachranar: { outfit: C.green,  trim: C.greenDeep, acc: 'stripe' },
};

/**
 * @param {object} p
 *   role, x, y, s, seed (pestrost pleti/vlasů), hop (výška poskoku px),
 *   mood: happy|neutral|sad|wow, blink 0..1, wave (fáze mávání, rad) | null,
 *   tint: přebarvení oblečení (např. při „zešednutí" skupiny), opacity, lookX
 */
export function person(p = {}) {
  const role = ROLES[p.role] || ROLES.pacient;
  const rand = rng(p.seed ?? 1);
  const skin = SKINS[Math.floor(rand() * SKINS.length)];
  const hair = role.hair || HAIRS[Math.floor(rand() * (HAIRS.length - 1))];
  const hairStyle = Math.floor(rand() * 4); // 0 krátké, 1 drdol, 2 kudrny, 3 culík
  const outfit = p.tint || role.outfit;
  const s = (p.s ?? 1) * (role.small ? 0.78 : 1);
  const x = p.x ?? 540, y = (p.y ?? 1400) - (p.hop ?? 0);
  const blink = p.blink ?? 0;
  const lx = (p.lookX ?? 0) * 4;
  const sw = 6;

  const parts = [];
  // stín (zůstává na zemi i při poskoku → kompenzace hop/s)
  parts.push(`<ellipse cx="0" cy="${r1(4 + (p.hop ?? 0) / s)}" rx="${r1(46 - Math.min(20, (p.hop ?? 0) / 4))}" ry="9" fill="${C.ink}" opacity="0.13"/>`);
  // nohy
  for (const sd of [-1, 1]) parts.push(`<ellipse cx="${sd * 18}" cy="-6" rx="17" ry="10" fill="${C.ink}"/>`);
  // ruce
  const wave = p.wave;
  for (const sd of [-1, 1]) {
    let a = 22;
    if (wave != null && sd > 0) a = 150 + Math.sin(wave) * 22;
    if (p.armsUp) a = 155;
    const shx = sd * 34, shy = -84;
    const hx = shx + sd * Math.sin(a * Math.PI / 180) * 44, hy = shy + Math.cos(a * Math.PI / 180) * 44;
    parts.push(`<line x1="${shx}" y1="${shy}" x2="${r1(hx)}" y2="${r1(hy)}" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>`);
    parts.push(`<circle cx="${r1(hx)}" cy="${r1(hy)}" r="10" fill="${skin}" stroke="${C.ink}" stroke-width="5"/>`);
  }
  // trup (fazolka)
  parts.push(`<rect x="-40" y="-118" width="80" height="108" rx="38" fill="${outfit}" stroke="${C.ink}" stroke-width="${sw}"/>`);
  if (role.acc === 'stetho') {
    parts.push(`<path d="M-16,-112 Q-22,-70 0,-62 Q22,-70 16,-112" fill="none" stroke="${C.ink}" stroke-width="4"/>`);
    parts.push(`<circle cx="0" cy="-60" r="7" fill="${C.grey}" stroke="${C.ink}" stroke-width="4"/>`);
    parts.push(`<line x1="0" y1="-118" x2="0" y2="-20" stroke="${C.grey}" stroke-width="3"/>`);
  }
  if (role.acc === 'tie') parts.push(`<polygon points="-7,-114 7,-114 4,-70 0,-62 -4,-70" fill="${C.amber}" stroke="${C.ink}" stroke-width="3"/>`);
  if (role.acc === 'stripe') parts.push(`<rect x="-40" y="-66" width="80" height="12" fill="${C.amberSoft}" stroke="${C.ink}" stroke-width="3"/>`);
  if (role.trim && role.acc !== 'stripe') parts.push(`<path d="M-24,-116 L0,-96 L24,-116" fill="none" stroke="${role.trim}" stroke-width="5" stroke-linecap="round"/>`);
  if (role.acc === 'cane') {
    parts.push(`<path d="M58,-2 L58,-72 Q58,-86 46,-86" fill="none" stroke="#8A5A2B" stroke-width="7" stroke-linecap="round"/>`);
  }
  // hlava
  const hy = -150;
  // vlasy vzadu
  if (hairStyle === 1) parts.push(`<circle cx="0" cy="${hy - 36}" r="15" fill="${hair}" stroke="${C.ink}" stroke-width="5"/>`);
  if (hairStyle === 3) parts.push(`<ellipse cx="34" cy="${hy - 4}" rx="11" ry="20" fill="${hair}" stroke="${C.ink}" stroke-width="5"/>`);
  parts.push(`<circle cx="0" cy="${hy}" r="36" fill="${skin}" stroke="${C.ink}" stroke-width="${sw}"/>`);
  // vlasy vpředu
  if (role.hair) {
    parts.push(`<circle cx="-30" cy="${hy - 14}" r="12" fill="${hair}" stroke="${C.ink}" stroke-width="4"/>`);
    parts.push(`<circle cx="30" cy="${hy - 14}" r="12" fill="${hair}" stroke="${C.ink}" stroke-width="4"/>`);
  } else if (hairStyle === 2) {
    parts.push(`<path d="M-34,${hy - 6} q4,-30 20,-30 q8,-10 18,-2 q16,-6 20,10 q8,8 2,22 q-12,-14 -30,-16 q-14,0 -30,16 Z" fill="${hair}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`);
  } else {
    parts.push(`<path d="M-35,${hy - 4} Q-34,${hy - 38} 0,${hy - 38} Q34,${hy - 38} 35,${hy - 4} Q16,${hy - 22} -35,${hy - 4} Z" fill="${hair}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`);
  }
  if (role.acc === 'cap') {
    parts.push(`<path d="M-26,${hy - 30} L-20,${hy - 52} L20,${hy - 52} L26,${hy - 30} Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`);
    parts.push(`<line x1="-14" y1="${hy - 42}" x2="14" y2="${hy - 42}" stroke="${C.skyDeep}" stroke-width="4" stroke-linecap="round"/>`);
  }
  // obličej
  const mood = p.mood || 'happy';
  for (const sd of [-1, 1]) {
    const ex = sd * 13 + lx, ey = hy + 2;
    if (blink > 0.85 || mood === 'closed') {
      parts.push(`<line x1="${ex - 5}" y1="${ey}" x2="${ex + 5}" y2="${ey}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`);
    } else {
      const ry = (mood === 'wow' ? 8 : 6) * (1 - blink * 0.85);
      parts.push(`<ellipse cx="${r1(ex)}" cy="${ey}" rx="${mood === 'wow' ? 5.5 : 4.5}" ry="${r1(ry)}" fill="${C.ink}"/>`);
    }
  }
  parts.push(`<ellipse cx="-22" cy="${hy + 14}" rx="7" ry="4" fill="${C.blush}" opacity="0.55"/>`);
  parts.push(`<ellipse cx="22" cy="${hy + 14}" rx="7" ry="4" fill="${C.blush}" opacity="0.55"/>`);
  const my = hy + 17;
  if (mood === 'sad') parts.push(`<path d="M-9,${my + 5} Q0,${my - 3} 9,${my + 5}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`);
  else if (mood === 'wow') parts.push(`<ellipse cx="0" cy="${my + 3}" rx="5" ry="7" fill="${C.inkSoft}" stroke="${C.ink}" stroke-width="3"/>`);
  else if (mood === 'neutral') parts.push(`<line x1="-7" y1="${my + 2}" x2="7" y2="${my + 2}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`);
  else parts.push(`<path d="M-10,${my} Q0,${my + 10} 10,${my}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`);

  const sq = p.squash ?? 1;
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(s * (1 + (1 - sq) * 0.7) * 1000) / 1000} ${r1(s * sq * 1000) / 1000})"${p.opacity != null ? ` opacity="${r1(p.opacity * 100) / 100}"` : ''}>${parts.join('')}</g>`;
}

export const PERSON_HEIGHT = 190;
