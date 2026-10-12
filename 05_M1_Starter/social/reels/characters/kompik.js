// KOMPÍK — maskot animovaných příspěvků HSPA Monitoru.
//
// Živý kompas: tělo = ciferník značky HSPA Kompas (kruh, rysky V/J/Z, index ▲ nahoře),
// na temeni sedí STŘELKA — Kompíkova „anténa", ukazovátko a měřič nálady zároveň:
//   35°  = výchozí „správný směr" (shodný úhel se značkou)
//   0°   = nadšení / pozor, fakt!
//   >120° = smutek, zklamání (střelka spadne)
//   točení = zmatek, „počkej, cože?"
// Červená patří JEN hrotu střelky (brand pravidlo). Charakter a pravidla: viz
// .claude/skills/animovane-prispevky/references/postavy.md.
//
// kompik(pose) vrací { svg, hand: {l, r}, head, needleTip } — SVG skupinu
// v souřadnicích scény + globální pozice rukou (pro rekvizity) a hlavy (pro bublinu).

import { C } from '../lib/palette.js';
import { r1 } from '../lib/anim.js';

export const K = {
  R: 150,          // poloměr těla-ciferníku
  LEG: 62,         // délka nohou
  NEEDLE: 124,     // délka střelky
  ARM: 118,
};
const BODY_CY = K.LEG + K.R;   // střed těla nad zemí

const DEG = Math.PI / 180;

function toGlobal(p, { x, y, s, sx, sy, lean }) {
  const lx = p[0] * s * sx, ly = p[1] * s * sy;
  const c = Math.cos(lean * DEG), si = Math.sin(lean * DEG);
  return [x + lx * c - ly * si, y + lx * si + ly * c];
}

/** Tvar paže: rameno → ruka s ohybem. side = -1 levá (z pohledu diváka), +1 pravá. */
function arm(side, a, bend, len, pointing) {
  const sh = [side * (K.R - 10), -BODY_CY + 26];
  const dir = [side * Math.sin(a * DEG), Math.cos(a * DEG)];
  const hand = [sh[0] + dir[0] * len, sh[1] + dir[1] * len];
  const mid = [(sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2];
  const perp = [-dir[1] * side, dir[0] * side];
  const ctrl = [mid[0] + perp[0] * bend * 34, mid[1] + perp[1] * bend * 34];
  let svg = `<path d="M${r1(sh[0])},${r1(sh[1])} Q${r1(ctrl[0])},${r1(ctrl[1])} ${r1(hand[0])},${r1(hand[1])}" fill="none" stroke="${C.ink}" stroke-width="13" stroke-linecap="round"/>`;
  svg += `<circle cx="${r1(hand[0])}" cy="${r1(hand[1])}" r="21" fill="${C.paper}" stroke="${C.ink}" stroke-width="7"/>`;
  if (pointing) {
    const b = [hand[0] + dir[0] * 16, hand[1] + dir[1] * 16];
    const f = [hand[0] + dir[0] * 44, hand[1] + dir[1] * 44];
    svg += `<line x1="${r1(b[0])}" y1="${r1(b[1])}" x2="${r1(f[0])}" y2="${r1(f[1])}" stroke="${C.ink}" stroke-width="20" stroke-linecap="round"/>`;
    svg += `<line x1="${r1(b[0])}" y1="${r1(b[1])}" x2="${r1(f[0])}" y2="${r1(f[1])}" stroke="${C.paper}" stroke-width="7" stroke-linecap="round"/>`;
  }
  return { svg, hand };
}

function eyes({ blink = 0, lookX = 0, lookY = 0, mood = 'normal' }) {
  const out = [];
  const ex = 54, ey = -BODY_CY - 18;
  const dx = lookX * 9, dy = lookY * 7;
  for (const side of [-1, 1]) {
    const cx = side * ex + dx, cy = ey + dy;
    if (mood === 'happy') {
      out.push(`<path d="M${r1(cx - 20)},${r1(cy + 8)} Q${r1(cx)},${r1(cy - 22)} ${r1(cx + 20)},${r1(cy + 8)}" fill="none" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>`);
      continue;
    }
    if (mood === 'closed' || blink > 0.85) {
      out.push(`<path d="M${r1(cx - 19)},${r1(cy)} Q${r1(cx)},${r1(cy + 10)} ${r1(cx + 19)},${r1(cy)}" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`);
      continue;
    }
    const big = mood === 'wide' ? 1.22 : 1;
    const ry = 28 * big * (1 - blink * 0.9);
    const rx = 19 * big;
    out.push(`<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${C.ink}"/>`);
    if (ry > 10) {
      out.push(`<circle cx="${r1(cx - 6 * big)}" cy="${r1(cy - 10 * big)}" r="${r1(6.5 * big)}" fill="${C.white}"/>`);
      out.push(`<circle cx="${r1(cx + 6 * big)}" cy="${r1(cy + 9 * big)}" r="${r1(3 * big)}" fill="${C.white}" opacity="0.8"/>`);
    }
    if (mood === 'sad') {
      // horní víčko přes polovinu oka — smutný pohled
      out.push(`<path d="M${r1(cx - rx - 4)},${r1(cy - 4)} L${r1(cx + rx + 4)},${r1(cy - 4 + side * 9)} L${r1(cx + rx + 4)},${r1(cy - ry - 6)} L${r1(cx - rx - 4)},${r1(cy - ry - 6)} Z" fill="${C.cream}"/>`);
    }
  }
  return out.join('');
}

function brows(kind = 'neutral', lookY = 0) {
  if (kind === 'none') return '';
  const y = -BODY_CY - 66 + lookY * 4;
  const out = [];
  for (const side of [-1, 1]) {
    const xo = side * 76, xi = side * 34;
    let yo = y, yi = y;
    if (kind === 'up') { yo -= 12; yi -= 14; }
    if (kind === 'worried') { yo += 6; yi -= 12; }
    if (kind === 'angry') { yo -= 8; yi += 10; }
    if (kind === 'skeptic') { if (side < 0) { yo -= 14; yi -= 16; } else { yo += 4; yi += 6; } }
    out.push(`<line x1="${r1(xo)}" y1="${r1(yo)}" x2="${r1(xi)}" y2="${r1(yi)}" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>`);
  }
  return out.join('');
}

function mouth({ shape = 'smile', open = 0 }) {
  const y = -BODY_CY + 44;
  if (open > 0.06 || shape === 'grin') {
    const o = shape === 'grin' ? Math.max(open, 0.55) : open;
    const w = 30 + o * 8;
    const depth = 12 + o * 52;
    const top = shape === 'frown' ? -6 : 4;
    return `<path d="M${-w},${y} Q0,${r1(y + top)} ${w},${y} Q${r1(w * 0.9)},${r1(y + depth)} 0,${r1(y + depth)} Q${r1(-w * 0.9)},${r1(y + depth)} ${-w},${y} Z" fill="${C.inkSoft}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>`
      + (o > 0.35 ? `<ellipse cx="0" cy="${r1(y + depth - 9)}" rx="${r1(w * 0.48)}" ry="${r1(5 + o * 6)}" fill="${C.blush}"/>` : '');
  }
  if (shape === 'frown') return `<path d="M-28,${y + 14} Q0,${y - 8} 28,${y + 14}" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`;
  if (shape === 'flat') return `<line x1="-24" y1="${y + 6}" x2="24" y2="${y + 6}" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`;
  if (shape === 'o') return `<ellipse cx="0" cy="${y + 10}" rx="13" ry="17" fill="${C.inkSoft}" stroke="${C.ink}" stroke-width="7"/>`;
  if (shape === 'wobble') return `<path d="M-30,${y + 8} q8,-8 15,0 t15,0 t15,0 t15,0" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`;
  return `<path d="M-32,${y} Q0,${y + 30} 32,${y}" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`;
}

function needle(angle) {
  const L = K.NEEDLE, w = 16, m = -0.42 * L;
  const py = -BODY_CY - K.R + 4;
  return {
    back: `<g transform="translate(0 ${py}) rotate(${r1(angle)})">
      <polygon points="0,10 ${-w},${m} ${w},${m}" fill="${C.cream}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>
      <polygon points="${-w},${m} ${w},${m} 0,${-L}" fill="${C.needle}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>
    </g>`,
    pivot: `<circle cx="0" cy="${py}" r="12" fill="${C.paper}" stroke="${C.ink}" stroke-width="7"/>`,
    tip: [Math.sin(angle * DEG) * L, py - Math.cos(angle * DEG) * L],
  };
}

function legs(walk) {
  const out = [];
  for (const side of [-1, 1]) {
    const ph = walk == null ? 0 : Math.sin(walk + (side > 0 ? Math.PI : 0));
    const lift = walk == null ? 0 : Math.max(0, ph) * 18;
    const fx = side * 46 + ph * 16;
    out.push(`<line x1="${side * 44}" y1="${-K.LEG - 6}" x2="${r1(fx)}" y2="${r1(-lift - 10)}" stroke="${C.ink}" stroke-width="13" stroke-linecap="round"/>`);
    out.push(`<ellipse cx="${r1(fx + side * 12)}" cy="${r1(-lift - 6)}" rx="31" ry="16" fill="${C.ink}"/>`);
    out.push(`<ellipse cx="${r1(fx + side * 4)}" cy="${r1(-lift - 12)}" rx="10" ry="4" fill="${C.white}" opacity="0.35"/>`);
  }
  return out.join('');
}

function dial() {
  const R = K.R, cy = -BODY_CY;
  const ticks = [90, 180, 270].map(a => {
    const c = Math.cos(a * DEG), s = Math.sin(a * DEG);
    return `<line x1="${r1(s * (R - 16))}" y1="${r1(cy - c * (R - 16))}" x2="${r1(s * (R - 36))}" y2="${r1(cy - c * (R - 36))}" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`;
  }).join('');
  const minor = [45, 135, 225, 315].map(a => {
    const c = Math.cos(a * DEG), s = Math.sin(a * DEG);
    return `<line x1="${r1(s * (R - 16))}" y1="${r1(cy - c * (R - 16))}" x2="${r1(s * (R - 27))}" y2="${r1(cy - c * (R - 27))}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`;
  }).join('');
  return `<circle cx="0" cy="${cy}" r="${R}" fill="${C.cream}" stroke="${C.ink}" stroke-width="11"/>
    <circle cx="0" cy="${cy}" r="${R - 44}" fill="none" stroke="${C.sand2}" stroke-width="3"/>
    ${ticks}${minor}
    <polygon points="-15,${cy - R + 13} 15,${cy - R + 13} 0,${cy - R + 38}" fill="${C.ink}"/>`;
}

/**
 * @param {object} p  pozice a výraz
 *   x, y        bod na zemi mezi nohama (souřadnice scény)
 *   s           měřítko (1 = výška ~ 490 px vč. střelky)
 *   lean        náklon (°), squash (y-scale; x se dopočte)
 *   needle      úhel střelky (°; 0 = vzhůru, 35 = „správný směr")
 *   eyes        { blink, lookX, lookY, mood: normal|happy|wide|sad|closed }
 *   brows       neutral|up|worried|angry|skeptic|none
 *   mouth       { shape: smile|grin|frown|flat|o|wobble, open: 0..1 }
 *   armL, armR  { a: úhel od svislice ven (°), bend: -1..1, point: bool }
 *   walk        fáze chůze (rad) nebo null
 *   blush       0..1, sweat: bool, opacity
 */
export function kompik(p = {}) {
  const s = p.s ?? 1, sq = p.squash ?? 1;
  const T = { x: p.x ?? 540, y: p.y ?? 1500, s, sy: sq, sx: 1 + (1 - sq) * 0.7, lean: p.lean ?? 0 };
  const nd = needle(p.needle ?? 35);
  // spadlá střelka (smutek) leží přes okraj ciferníku → kreslí se před tělem
  const na = ((((p.needle ?? 35) % 360) + 540) % 360) - 180;
  const front = Math.abs(na) > 95;
  const aL = arm(-1, p.armL?.a ?? 28, p.armL?.bend ?? 0.4, p.armL?.len ?? K.ARM, p.armL?.point);
  const aR = arm(1, p.armR?.a ?? 28, p.armR?.bend ?? 0.4, p.armR?.len ?? K.ARM, p.armR?.point);
  const blush = p.blush ?? 0.6;
  const cheeks = blush > 0 ? [-1, 1].map(sd =>
    `<ellipse cx="${sd * 92}" cy="${-BODY_CY + 26}" rx="22" ry="14" fill="${C.blush}" opacity="${r1(0.6 * blush)}"/>`).join('') : '';
  const sweat = p.sweat ? `<path d="M${K.R - 18},${-BODY_CY - 92} q14,22 0,30 q-14,-8 0,-30 Z" fill="${C.sky}" stroke="${C.ink}" stroke-width="5"/>` : '';

  const svg = `<g transform="translate(${r1(T.x)} ${r1(T.y)}) rotate(${r1(T.lean)}) scale(${r1(s * T.sx * 1000) / 1000} ${r1(s * T.sy * 1000) / 1000})"${p.opacity != null ? ` opacity="${r1(p.opacity * 100) / 100}"` : ''}>
    <ellipse cx="0" cy="4" rx="${r1(120 / Math.max(0.6, T.sy))}" ry="18" fill="${C.ink}" opacity="0.13"/>
    ${legs(p.walk ?? null)}
    ${front ? '' : nd.back}
    ${aL.svg}${aR.svg}
    ${dial()}
    ${front ? nd.back : ''}
    ${nd.pivot}
    ${cheeks}
    ${eyes(p.eyes || {})}
    ${brows(p.brows, p.eyes?.lookY || 0)}
    ${mouth(p.mouth || {})}
    ${sweat}
  </g>`;
  return {
    svg,
    hand: { l: toGlobal(aL.hand, T), r: toGlobal(aR.hand, T) },
    head: toGlobal([0, -BODY_CY - K.R - 20], T),
    needleTip: toGlobal(nd.tip, T),
  };
}

/** Úhel paže, aby ruka mířila na bod (gx, gy) ve scéně. */
export function aimArm(pose, side, gx, gy) {
  const s = pose.s ?? 1;
  const shx = (pose.x ?? 540) + side * (K.R - 10) * s;
  const shy = (pose.y ?? 1500) + (-BODY_CY + 26) * s;
  const dx = (gx - shx) * side, dy = gy - shy;
  return Math.atan2(dx, dy) / DEG;   // 0 = dolů, 90 = vodorovně ven, 180 = nahoru
}

export const KOMPIK_HEIGHT = BODY_CY + K.R + K.NEEDLE;
