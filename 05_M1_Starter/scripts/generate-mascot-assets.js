// Generátor assetů maskota Kompíka (tvář a logo animovaných příspěvků).
//
// Výstup: assets/brand/maskot/
//   kompik.svg / .png              celá postava (hero póza, mává) — 1080×1350
//   kompik-avatar.svg / .png       profilová „tvář" do kruhu — 1080×1080
//   kompik-logo.svg / .png         logo série „Kompík vysvětluje" — 1600×600
//   kompik-list.png                modelový list: emoce, střelka, obsazení, paleta, pravidla
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
