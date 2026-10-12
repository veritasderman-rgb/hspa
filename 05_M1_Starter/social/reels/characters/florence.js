// FLORENCE — AI autorka HSPA Monitoru jako animovaná postava (styl „Florence komentuje").
//
// Kreslená podoba avataru z autor-florence.html: tmavé vlasy s copánkovou korunou
// a pramínky kolem obličeje, štíhlá postava v projmutém čokoládovém sametovém saku,
// bílá halenka s vysokým límcem a broží, modré oči s řasami. Elegantní, sebevědomá,
// s nadhledem — ne vyzývavá (tvář zdravotnického portálu).
// Rekvizita je LAMPA — odkaz na Florence Nightingale, „dámu s lampou": Florence jí
// „posvítí" na číslo. Na klopě nosí vždy viditelný odznak „AI" (GOVERNANCE § 6.5).
//
// florence(p) vrací { svg, head, lamp } — skupinu v souřadnicích scény, polohu hlavy
// a lampy (pro záři). Origin = spodní střed bysty; oči jsou ~600 px nad ním (s = 1).

import { C } from '../lib/palette.js';
import { r1 } from '../lib/anim.js';

export const F = {
  hair: '#3F2618', hairHi: '#5C3A26', braid: '#6E4630', braidHi: '#8A5A3C',
  jacket: '#3E2A21', jacketHi: '#5A3E30', shirt: C.paper,
  skin: '#F5D2B8', skinShade: '#E7B99B', lips: '#C46F66', lipsHi: '#D98A80', iris: '#3F6E9C',
  lampGlass: '#FFD98F', lampMetal: '#2A2420',
};
export const MOODS = ['neutral', 'smile', 'smirk', 'skeptic', 'shocked', 'unimpressed', 'sad', 'excited', 'wink'];
export const GESTURES_F = ['idle', 'point', 'lamp', 'chin', 'facepalm', 'shrug', 'wave'];

const HEAD = { x: 0, y: -600 };
// obličej: oválný, s jemnou bradou (srdčitý tvar)
const FACE = `M-106,-640 C-106,-566 -74,-472 0,-462 C74,-472 106,-566 106,-640 C106,-722 62,-754 0,-754 C-62,-754 -106,-722 -106,-640 Z`;

function eyes(mood, blink, lookX, lookY) {
  const out = [];
  const lid = { unimpressed: 0.5, skeptic: 0.35, sad: 0.3, smirk: 0.15 }[mood] || 0;
  const wide = mood === 'shocked' || mood === 'excited' ? 1.15 : 1;
  for (const sd of [-1, 1]) {
    const cx = sd * 44, cy = HEAD.y + 6;
    if (blink > 0.85 || (mood === 'wink' && sd > 0)) {
      out.push(`<path d="M${cx - 26},${cy} Q${cx},${cy + 12} ${cx + 26},${cy}" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`);
      out.push(`<path d="M${cx + sd * 24},${cy + 2} l${sd * 10},4 M${cx + sd * 18},${cy + 7} l${sd * 8},6" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`);
      continue;
    }
    const rx = 26 * wide, ry = 21 * wide * (1 - blink * 0.9);
    out.push(`<ellipse cx="${cx + sd * 4}" cy="${cy - 12}" rx="${r1(rx + 8)}" ry="15" fill="${C.plum}" opacity="0.28"/>`);
    // mandlový tvar oka
    out.push(`<path d="M${r1(cx - rx)},${cy} Q${cx},${r1(cy - ry * 1.5)} ${r1(cx + rx)},${cy} Q${cx},${r1(cy + ry * 1.25)} ${r1(cx - rx)},${cy} Z" fill="${C.white}" stroke="${C.ink}" stroke-width="4"/>`);
    const ix = cx + lookX * 9, iy = cy + 1 + lookY * 4;
    const ir = 14.5 * Math.min(1, ry / 16);
    out.push(`<circle cx="${r1(ix)}" cy="${r1(iy)}" r="${r1(ir)}" fill="${F.iris}"/>`);
    out.push(`<circle cx="${r1(ix)}" cy="${r1(iy)}" r="${r1(ir * 0.5)}" fill="${C.ink}"/>`);
    out.push(`<circle cx="${r1(ix - 4)}" cy="${r1(iy - 5)}" r="4" fill="${C.white}"/>`);
    out.push(`<circle cx="${r1(ix + 5)}" cy="${r1(iy + 4)}" r="2" fill="${C.white}" opacity="0.8"/>`);
    const l = Math.max(lid, 0);
    if (l > 0) {
      const ly = cy - ry + 2 * ry * l;
      out.push(`<path d="M${r1(cx - rx - 3)},${r1(cy + 1)} Q${cx},${r1(cy - ry * 1.7)} ${r1(cx + rx + 3)},${r1(cy + 1)} L${r1(cx + rx + 3)},${r1(ly)} L${r1(cx - rx - 3)},${r1(ly)} Z" fill="${F.skin}"/>`);
      out.push(`<line x1="${r1(cx - rx)}" y1="${r1(ly)}" x2="${r1(cx + rx)}" y2="${r1(ly)}" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`);
    } else {
      // horní linka (oční linky)
      out.push(`<path d="M${r1(cx - rx - 2)},${r1(cy + 1)} Q${cx},${r1(cy - ry * 1.55)} ${r1(cx + rx + 2)},${r1(cy + 1)}" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`);
    }
    // řasy a „křidélko" linky ve vnějším koutku
    const ox = cx + sd * (rx + 1), oy = cy - 1;
    out.push(`<path d="M${r1(ox - sd * 2)},${r1(oy)} q${sd * 12},-2 ${sd * 18},-12" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M${r1(ox - sd * 8)},${r1(oy - 8)} q${sd * 8},-4 ${sd * 11},-14 M${r1(ox - sd * 16)},${r1(oy - 13)} q${sd * 5},-5 ${sd * 6},-13" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/>`);
  }
  return out.join('');
}

function brows(mood) {
  const y = HEAD.y - 42;
  const cfg = {
    neutral: [0, 0], smile: [-4, -4], smirk: [-2, 2], wink: [-8, -2], skeptic: [-18, 6], shocked: [-18, -18],
    unimpressed: [4, 4], sad: [10, -10], excited: [-12, -12],
  }[mood] || [0, 0];
  return [-1, 1].map(sd => {
    let yo = y + cfg[0], yi = y + cfg[1];
    if (mood === 'skeptic' && sd > 0) { yo = y + 2; yi = y + 4; }
    // tenké klenuté obočí
    return `<path d="M${sd * 74},${r1(yo + 8)} Q${sd * 54},${r1(Math.min(yo, yi) - 10)} ${sd * 24},${r1(yi + 2)}" fill="none" stroke="${F.hair}" stroke-width="6" stroke-linecap="round"/>`;
  }).join('');
}

function lips(y, curve = 0) {
  // zavřené rty: horní s „amorovým lukem", plnější dolní
  return `<g transform="translate(0 ${y}) scale(1.18) translate(0 ${-y})"><path d="M-24,${y} Q-12,${y - 9} 0,${y - 4} Q12,${y - 9} 24,${y} Q12,${y + 2 - curve} 0,${y + 1 - curve} Q-12,${y + 2 - curve} -24,${y} Z" fill="${F.lips}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-24,${y} Q0,${y + 18 - curve} 24,${y} Q12,${y + 3 - curve} 0,${y + 2 - curve} Q-12,${y + 3 - curve} -24,${y} Z" fill="${F.lipsHi}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="-6" cy="${y + 8 - curve * 0.5}" rx="6" ry="2.5" fill="${C.white}" opacity="0.45"/></g>`;
}

function mouth(mood, open) {
  const y = HEAD.y + 88;
  if (open > 0.06) {
    const w = 24 + open * 5, d = 8 + open * 26;
    return `<path d="M${-w},${y} Q-10,${y - 9} 0,${y - 5} Q10,${y - 9} ${w},${y} Q${r1(w * 0.7)},${r1(y + d)} 0,${r1(y + d)} Q${r1(-w * 0.7)},${r1(y + d)} ${-w},${y} Z" fill="${C.inkSoft}" stroke="${F.lips}" stroke-width="6" stroke-linejoin="round"/>`
      + `<path d="M${r1(-w * 0.6)},${y + 2} L${r1(w * 0.6)},${y + 2}" stroke="${C.white}" stroke-width="4" stroke-linecap="round"/>`;
  }
  switch (mood) {
    case 'smirk': case 'skeptic': case 'wink':
      return `<g transform="rotate(-7 0 ${y})">${lips(y, 0)}</g><path d="M22,${y - 2} q8,-3 10,-9" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'shocked':
      return `<ellipse cx="0" cy="${y + 8}" rx="12" ry="16" fill="${C.inkSoft}" stroke="${F.lips}" stroke-width="6"/>`;
    case 'unimpressed':
      return lips(y, 3);
    case 'sad':
      return `<g transform="translate(0 ${2 * y + 6}) scale(1 -1)">${lips(y, 0)}</g>`;
    case 'excited':
      return `<path d="M-32,${y - 4} Q0,${y + 44} 32,${y - 4} Q0,${y + 4} -32,${y - 4} Z" fill="${C.inkSoft}" stroke="${F.lips}" stroke-width="6" stroke-linejoin="round"/><path d="M-22,${y + 1} Q0,${y + 6} 22,${y + 1}" stroke="${C.white}" stroke-width="5" fill="none"/>`;
    default:
      return `${lips(y, -4)}<path d="M-25,${y} q-4,-2 -6,-6 M25,${y} q4,-2 6,-6" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
  }
}

function hair() {
  const hy = HEAD.y;
  // zadní vlasy — drdol a objem za hlavou, nízko na šíji
  const back = `<path d="M-122,${hy + 10} Q-140,${hy - 120} -50,${hy - 168} Q0,${hy - 182} 50,${hy - 168} Q140,${hy - 120} 122,${hy + 10} Q118,${hy + 96} 70,${hy + 118} Q0,${hy + 136} -70,${hy + 118} Q-118,${hy + 96} -122,${hy + 10} Z" fill="${F.hair}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>`;
  // přední vlasy: pěšinka uprostřed, vlny sčesané do stran přes spánky
  const front = `<path d="M-114,${hy + 4} Q-124,${hy - 128} -6,${hy - 154} L0,${hy - 132} L6,${hy - 154} Q124,${hy - 128} 114,${hy + 4} Q108,${hy - 74} 66,${hy - 100} Q24,${hy - 116} 0,${hy - 112} Q-24,${hy - 116} -66,${hy - 100} Q-108,${hy - 74} -114,${hy + 4} Z" fill="${F.hair}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M-24,${hy - 142} Q-84,${hy - 132} -108,${hy - 64} M24,${hy - 142} Q84,${hy - 132} 108,${hy - 64}" fill="none" stroke="${F.hairHi}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-50,${hy - 140} Q-80,${hy - 130} -96,${hy - 106}" fill="none" stroke="${C.white}" stroke-width="5" stroke-linecap="round" opacity="0.35"/>`;
  // pramínky kolem obličeje
  const strands = `<path d="M-110,${hy - 20} Q-128,${hy + 40} -112,${hy + 96} Q-108,${hy + 40} -102,${hy - 6} Z" fill="${F.hair}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M110,${hy - 20} Q128,${hy + 40} 112,${hy + 96} Q108,${hy + 40} 102,${hy - 6} Z" fill="${F.hair}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`;
  // copánková koruna — řada „klásků" po oblouku nad čelem
  const braid = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.05 + (i / (n - 1)) * 0.9);
    const x = Math.cos(a) * 120, y = hy - 76 + Math.sin(a) * 98;
    const rot = (a * 180) / Math.PI + 90 + (i % 2 ? 22 : -22);
    braid.push(`<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="22" ry="13" transform="rotate(${r1(rot)} ${r1(x)} ${r1(y)})" fill="${i % 2 ? F.braid : F.braidHi}" stroke="${C.ink}" stroke-width="4.5"/>`);
  }
  return { back, front: front + strands + braid.join('') };
}

function lampSvg(x, y, glow) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(1.45)">
    <path d="M0,-118 Q-22,-118 -22,-98" fill="none" stroke="${F.lampMetal}" stroke-width="7" stroke-linecap="round"/>
    <path d="M0,-118 Q22,-118 22,-98" fill="none" stroke="${F.lampMetal}" stroke-width="7" stroke-linecap="round"/>
    <polygon points="-34,-96 34,-96 22,-76 -22,-76" fill="${F.lampMetal}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="-30" y="-76" width="60" height="78" rx="14" fill="${F.lampGlass}" stroke="${C.ink}" stroke-width="6"/>
    <ellipse cx="0" cy="-36" rx="${r1(10 + glow * 6)}" ry="${r1(18 + glow * 8)}" fill="${C.white}" opacity="${r1((0.55 + glow * 0.45) * 100) / 100}"/>
    <line x1="-12" y1="-76" x2="-12" y2="2" stroke="${C.ink}" stroke-width="3" opacity="0.4"/>
    <line x1="12" y1="-76" x2="12" y2="2" stroke="${C.ink}" stroke-width="3" opacity="0.4"/>
    <polygon points="-38,2 38,2 30,18 -30,18" fill="${F.lampMetal}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>
  </g>`;
}

function sleeveArm(sh, el, hand, finger = null) {
  const d = `M${sh[0]},${sh[1]} Q${el[0]},${el[1]} ${hand[0]},${hand[1]}`;
  let s = `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="56" stroke-linecap="round"/>`;
  s += `<path d="${d}" fill="none" stroke="${F.jacket}" stroke-width="44" stroke-linecap="round"/>`;
  // bílá manžeta + štíhlá ruka
  s += `<circle cx="${hand[0]}" cy="${hand[1]}" r="27" fill="${F.shirt}" stroke="${C.ink}" stroke-width="5"/>`;
  s += `<ellipse cx="${hand[0]}" cy="${hand[1] - 10}" rx="21" ry="25" fill="${F.skin}" stroke="${C.ink}" stroke-width="5"/>`;
  if (finger) {
    const e = [hand[0] + finger[0], hand[1] - 10 + finger[1]];
    s += `<line x1="${hand[0]}" y1="${hand[1] - 18}" x2="${e[0]}" y2="${e[1]}" stroke="${C.ink}" stroke-width="18" stroke-linecap="round"/><line x1="${hand[0]}" y1="${hand[1] - 18}" x2="${e[0]}" y2="${e[1]}" stroke="${F.skin}" stroke-width="8" stroke-linecap="round"/>`;
  }
  return s;
}

/**
 * @param {object} p
 *   x, y (spodní střed bysty), s (měřítko), tilt (náklon hlavy °), bob (px),
 *   mood (MOODS), gesture (GESTURES_F), blink 0..1, lookX/lookY -1..1,
 *   talk 0..1 (otevření pusy), glow 0..1 (záře lampy), wave (fáze mávání)
 */
export function florence(p = {}) {
  const s = p.s ?? 1, x = p.x ?? 540, y = (p.y ?? 1920) + (p.bob ?? 0);
  const mood = p.mood || 'neutral', g = p.gesture || 'idle';
  const tilt = p.tilt ?? 0;
  const parts = [];
  const front = [];
  let lampAt = null;

  const R = [180, -300], L = [-180, -300];
  if (g === 'point') front.push(sleeveArm(R, [300, -420], [250, -680], [-14, -52]));
  if (g === 'wave') {
    const a = Math.sin(p.wave ?? 0) * 24;
    front.push(sleeveArm(R, [310, -420], [r1(270 + a), -690]));
  }
  if (g === 'lamp') { front.push(sleeveArm(L, [-320, -440], [-260, -680])); lampAt = [-260, -650]; }
  if (g === 'shrug') {
    front.push(sleeveArm(L, [-300, -330], [-290, -480]));
    front.push(sleeveArm(R, [300, -330], [290, -480]));
  }
  if (g === 'chin') front.push(sleeveArm(R, [170, -240], [52, -462]));
  if (g === 'facepalm') front.push(sleeveArm(R, [190, -290], [36, -640]));

  // tělo — projmuté sako (štíhlá ramena, zúžený pas)
  parts.push(`<path d="M-230,40 Q-196,-60 -186,-150 Q-196,-250 -200,-290 Q-196,-330 -120,-348 L-34,-372 L34,-372 L120,-348 Q196,-330 200,-290 Q196,-250 186,-150 Q196,-60 230,40 Z" fill="${F.jacket}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>`);
  parts.push(`<polygon points="-34,-372 34,-372 0,-170" fill="${F.shirt}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`);
  parts.push(`<path d="M-34,-372 L-112,-346 Q-80,-250 -34,-130 L0,-170 Z" fill="${F.jacketHi}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`);
  parts.push(`<path d="M34,-372 L112,-346 Q80,-250 34,-130 L0,-170 Z" fill="${F.jacketHi}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`);
  // knoflíky
  parts.push(`<circle cx="0" cy="-110" r="8" fill="${C.amber}" stroke="${C.ink}" stroke-width="4"/><circle cx="0" cy="-60" r="8" fill="${C.amber}" stroke="${C.ink}" stroke-width="4"/>`);
  // odznak AI (vždy vidět)
  parts.push(`<g transform="translate(118 -240) rotate(-8)"><rect x="-42" y="-25" width="84" height="50" rx="25" fill="${C.sky}" stroke="${C.ink}" stroke-width="5"/><text x="0" y="12" text-anchor="middle" font-family="Inter" font-weight="900" font-size="32" fill="${C.ink}">AI</text></g>`);

  const head = [];
  const hr = hair();
  head.push(hr.back);
  // štíhlý krk, vysoký krajkový límec s broží
  head.push(`<path d="M-30,-470 L-32,-372 L32,-372 L30,-470 Z" fill="${F.skinShade}" stroke="${C.ink}" stroke-width="6"/>`);
  head.push(`<path d="M-46,-372 Q-50,-412 -38,-424 Q0,-412 38,-424 Q50,-412 46,-372 Q0,-358 -46,-372 Z" fill="${F.shirt}" stroke="${C.ink}" stroke-width="6"/>`);
  head.push(`<path d="M-40,-418 q8,8 16,0 q8,8 16,0 q8,8 16,0 q8,8 16,0 q8,8 16,0" fill="none" stroke="${C.grey}" stroke-width="3"/>`);
  head.push(`<circle cx="0" cy="-378" r="12" fill="${C.amber}" stroke="${C.ink}" stroke-width="4"/>`);
  for (const sd of [-1, 1]) {
    head.push(`<ellipse cx="${sd * 104}" cy="${HEAD.y + 10}" rx="15" ry="24" fill="${F.skin}" stroke="${C.ink}" stroke-width="5"/>`);
    head.push(`<circle cx="${sd * 106}" cy="${HEAD.y + 40}" r="6" fill="${C.amber}" stroke="${C.ink}" stroke-width="3"/>`);
  }
  head.push(`<path d="${FACE}" fill="${F.skin}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`);
  head.push(hr.front);
  head.push(`<ellipse cx="-66" cy="${HEAD.y + 50}" rx="17" ry="9" fill="${C.blush}" opacity="0.45"/><ellipse cx="66" cy="${HEAD.y + 50}" rx="17" ry="9" fill="${C.blush}" opacity="0.45"/>`);
  head.push(eyes(mood, p.blink ?? 0, p.lookX ?? 0, p.lookY ?? 0));
  head.push(brows(mood));
  head.push(`<path d="M-3,${HEAD.y + 28} Q-9,${HEAD.y + 52} 3,${HEAD.y + 56}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>`);
  head.push(mouth(mood, p.talk ?? 0));
  head.push(`<circle cx="44" cy="${HEAD.y + 70}" r="3.5" fill="${C.inkSoft}"/>`);

  const glowAmt = p.glow ?? (lampAt ? 0.6 : 0);
  const lamp = lampAt ? lampSvg(lampAt[0], lampAt[1], glowAmt) : '';
  const svg = `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">
    ${parts.join('')}
    <g transform="rotate(${r1(tilt)} 0 -420)">${head.join('')}</g>
    ${front.join('')}
    ${lamp}
  </g>`;
  const tg = ([lx, ly]) => [x + lx * s, y + ly * s];
  return { svg, head: tg([0, HEAD.y]), lamp: lampAt ? tg([lampAt[0], lampAt[1] - 56]) : null };
}
