// Generátor assetů maskota Kompíka (tvář a logo animovaných příspěvků).
//
// Výstup: assets/brand/maskot/
//   kompik.svg / .png              celá postava (hero póza, mává) — 1080×1350
//   kompik-avatar.svg / .png       profilová „tvář" do kruhu — 1080×1080
//   kompik-logo.svg / .png         logo série „Kompík vysvětluje" — 1600×600
//   kompik-list.png                modelový list: emoce, střelka, obsazení, paleta, pravidla
//   florence-avatar / florence     tvář a postava stylu „Florence komentuje"
//   florence-list.png              modelový list Florence (nálady × gesta)
//
// Spuštění:  node scripts/generate-mascot-assets.js
// Postava se kreslí ze stejného kódu jako videa (social/reels/characters/), takže
// se logo a animace nikdy nerozejdou.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { kompik } from '../social/reels/characters/kompik.js';
import { person, ROLES } from '../social/reels/characters/cast.js';
import { florence, MOODS as FL_MOODS } from '../social/reels/characters/florence.js';
import { C } from '../social/reels/lib/palette.js';
import { RESVG_FONT } from '../social/reels/lib/text.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'brand', 'maskot');
mkdirSync(OUT, { recursive: true });

const svgDoc = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;

function save(name, w, h, body, title) {
  const svg = svgDoc(w, h, body, title);
  writeFileSync(resolve(OUT, `${name}.svg`), svg);
  writeFileSync(resolve(OUT, `${name}.png`), new Resvg(svg, { font: RESVG_FONT }).render().asPng());
  console.log(`✓ ${name}.svg + .png (${w}×${h})`);
}

// 1) celá postava
save('kompik', 1080, 1350, `<rect width="1080" height="1350" fill="${C.sand}"/>
  <circle cx="540" cy="700" r="470" fill="none" stroke="${C.sand2}" stroke-width="10"/>
  ${kompik({ x: 540, y: 1180, s: 1.55, needle: 35, eyes: { mood: 'happy' }, brows: 'up', mouth: { shape: 'grin' }, armR: { a: 150, bend: -0.3 }, armL: { a: 40 } }).svg}`,
'Kompík — maskot HSPA Monitoru');

// 2) avatar — hlava v kruhu na jantarovém pozadí (profilovka, ikona série)
save('kompik-avatar', 1080, 1080, `<rect width="1080" height="1080" fill="${C.amber}"/>
  <circle cx="540" cy="540" r="470" fill="${C.amberSoft}"/>
  ${kompik({ x: 540, y: 1270, s: 2.35, needle: 35, eyes: { mood: 'normal', lookY: -0.1 }, brows: 'up', mouth: { shape: 'smile' }, armL: { a: 4, len: 50 }, armR: { a: 4, len: 50 } }).svg}`,
'Kompík — tvář animovaných příspěvků');

// 3) logo série
save('kompik-logo', 1600, 600, `<rect width="1600" height="600" rx="60" fill="${C.sand}"/>
  ${kompik({ x: 300, y: 560, s: 0.98, needle: 35, eyes: { mood: 'happy' }, mouth: { shape: 'grin' }, armR: { a: 150, bend: -0.3 } }).svg}
  <text x="560" y="280" font-family="Inter" font-weight="900" font-size="150" letter-spacing="-4" fill="${C.ink}">Kompík</text>
  <text x="566" y="390" font-family="Inter" font-weight="800" font-size="78" fill="${C.inkSoft}">vysvětluje</text>
  <text x="568" y="480" font-family="Inter" font-weight="700" font-size="40" fill="${C.inkSoft}">HSPA Monitor · skorezdravotnictvi.cz</text>`,
'Kompík vysvětluje — logo série animovaných příspěvků');

// 4) modelový list (jen PNG — reference pro skill a lidi)
const EMO = [
  ['curious', 'zvědavý', { needle: 0, eyes: { lookY: -0.5 }, brows: 'up', mouth: { shape: 'o' } }],
  ['explain', 'vysvětluje', { needle: 35, armR: { a: 100, point: true, bend: 0 } }],
  ['worried', 'ustaraný', { needle: 72, brows: 'worried', mouth: { shape: 'flat' }, sweat: true, armL: { a: 18 }, armR: { a: 18 } }],
  ['shocked', 'v šoku', { needle: 0, eyes: { mood: 'wide' }, brows: 'up', mouth: { shape: 'o' }, armL: { a: 158 }, armR: { a: 158 } }],
  ['sad', 'smutný', { needle: 118, eyes: { mood: 'sad', lookY: 0.4 }, brows: 'worried', mouth: { shape: 'frown' }, armL: { a: 8 }, armR: { a: 8 } }],
  ['happy', 'radost', { needle: 35, eyes: { mood: 'happy' }, brows: 'up', mouth: { shape: 'grin' }, armL: { a: 150 }, armR: { a: 150 } }],
  ['proud', 'hrdý', { needle: 35, eyes: { mood: 'happy' }, mouth: { shape: 'smile' }, armL: { a: 52, bend: -1.3, len: 92 }, armR: { a: 52, bend: -1.3, len: 92 } }],
  ['skeptic', 'skeptický', { needle: 58, eyes: { lookX: 0.5 }, brows: 'skeptic', mouth: { shape: 'wobble' } }],
];
const W = 2000, H = 2300;
let body = `<rect width="${W}" height="${H}" fill="${C.paper}"/>
  <text x="80" y="130" font-family="Inter" font-weight="900" font-size="84" fill="${C.ink}">Kompík — modelový list</text>
  <text x="80" y="200" font-family="Inter" font-weight="700" font-size="36" fill="${C.inkSoft}">Živý kompas HSPA Monitoru. Střelka na hlavě = ukazovátko i měřič nálady. Červená jen na hrotu střelky.</text>`;
EMO.forEach(([id, label, pose], i) => {
  const cx = 250 + (i % 4) * 500, base = 760 + Math.floor(i / 4) * 640;
  body += `<rect x="${cx - 225}" y="${base - 500}" width="450" height="590" rx="36" fill="${C.sand}"/>`;
  body += kompik({ x: cx, y: base, s: 0.82, ...pose }).svg;
  body += `<text x="${cx}" y="${base + 60}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="40" fill="${C.ink}">${label}</text>`;
  body += `<text x="${cx}" y="${base - 450}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="${C.inkSoft}">emotion: "${id}" · střelka ${pose.needle}°</text>`;
});
const roles = Object.keys(ROLES);
body += `<text x="80" y="1750" font-family="Inter" font-weight="900" font-size="52" fill="${C.ink}">Obsazení (role ve scénáři)</text>`;
roles.forEach((r, i) => {
  const x = 170 + i * 260;
  body += person({ role: r, x, y: 2060, s: 1.2, seed: i * 7 + 3, mood: 'happy' });
  body += `<text x="${x}" y="2120" text-anchor="middle" font-family="Inter" font-weight="800" font-size="34" fill="${C.ink}">${r}</text>`;
});
const pal = [['ink', C.ink], ['paper', C.paper], ['sand', C.sand], ['amber', C.amber], ['green', C.green], ['sky', C.sky], ['plum', C.plum], ['střelka', C.needle]];
pal.forEach(([n, c], i) => {
  const x = 80 + i * 235;
  body += `<rect x="${x}" y="2180" width="80" height="80" rx="16" fill="${c}" stroke="${C.ink}" stroke-width="4"/>`;
  body += `<text x="${x + 96}" y="2232" font-family="Inter" font-weight="800" font-size="30" fill="${C.ink}">${n}</text>`;
});
writeFileSync(resolve(OUT, 'kompik-list.png'), new Resvg(svgDoc(W, H, body, 'Kompík — modelový list'), { font: RESVG_FONT, fitTo: { mode: 'width', value: 1600 } }).render().asPng());
console.log('✓ kompik-list.png');

// ───────────── Florence (styl „Florence komentuje") ─────────────
const FL_BG = `<rect width="1080" height="1080" fill="${C.night}"/><circle cx="540" cy="560" r="460" fill="${C.amber}" opacity="0.12"/>`;
save('florence-avatar', 1080, 1080, `${FL_BG}
  ${florence({ x: 540, y: 1960, s: 2.2, mood: 'wink', tilt: -4 }).svg}`,
'Florence — AI autorka HSPA Monitoru (animovaná podoba)');

save('florence', 1080, 1350, `<rect width="1080" height="1350" fill="${C.night}"/>
  <circle cx="300" cy="420" r="420" fill="${C.amber}" opacity="0.14"/>
  ${florence({ x: 540, y: 1450, s: 1.25, mood: 'smile', gesture: 'lamp', glow: 1 }).svg}
  <g transform="translate(540 110)"><rect x="-260" y="-36" width="520" height="72" rx="36" fill="${C.ink}" stroke="${C.amber}" stroke-width="4"/>
  <text x="0" y="12" text-anchor="middle" font-family="Inter" font-weight="900" font-size="32" letter-spacing="2" fill="${C.paper}">FLORENCE · AI AUTORKA</text></g>`,
'Florence s lampou — AI autorka HSPA Monitoru');

{
  const moods = FL_MOODS, gestures = ['idle', 'point', 'lamp', 'chin', 'facepalm', 'shrug', 'wave', 'idle', 'idle'];
  const W2 = 2250, H2 = 1900;
  let b = `<rect width="${W2}" height="${H2}" fill="${C.night}"/>
    <text x="70" y="110" font-family="Inter" font-weight="900" font-size="80" fill="${C.paper}">Florence — modelový list</text>
    <text x="70" y="175" font-family="Inter" font-weight="700" font-size="34" fill="${C.grey}">AI autorka HSPA Monitoru. Lampa = „dáma s lampou", nasvítí číslo. Odznak AI vždy viditelný.</text>`;
  moods.forEach((m, i) => {
    const cx = 225 + (i % 5) * 450, base = 1010 + Math.floor(i / 5) * 840;
    b += `<rect x="${cx - 210}" y="${base - 780}" width="420" height="770" rx="30" fill="#241A12"/>`;
    b += `<g clip-path="url(#c${i})">${florence({ x: cx, y: base + 40, s: 0.74, mood: m, gesture: gestures[i] }).svg}</g>`;
    b += `<clipPath id="c${i}"><rect x="${cx - 210}" y="${base - 780}" width="420" height="770" rx="30"/></clipPath>`;
    b += `<text x="${cx}" y="${base - 730}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="${C.paper}">mood: "${m}" · ${gestures[i]}</text>`;
  });
  writeFileSync(resolve(OUT, 'florence-list.png'), new Resvg(svgDoc(W2, H2, b, 'Florence — modelový list'), { font: RESVG_FONT, fitTo: { mode: 'width', value: 1600 } }).render().asPng());
  console.log('✓ florence-list.png');
}
