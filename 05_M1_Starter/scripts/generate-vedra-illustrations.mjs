// Generátor ilustrací pro stránku „Vedra a zdraví" (vedra.html).
//
//   GEMINI_API_KEY=... node scripts/generate-vedra-illustrations.mjs
//   GEMINI_API_KEY=... node scripts/generate-vedra-illustrations.mjs --only=auto
//   node scripts/generate-vedra-illustrations.mjs --list
//
// Proč skript a ne ručně nahrané obrázky: ilustrace musí jít přegenerovat,
// když se změní text sekce nebo brand paleta. Zadání je proto v repu, ne
// v historii chatu.
//
// Styl je vázaný na brand webu (docs/visual-components.md §0): papír #fbf8f1,
// inkoust #1f1a14 a červená #b8361e VÝHRADNĚ na jeden akcentní prvek. Ilustrace
// nesmí obsahovat text — web je vícejazyčně čitelný jen díky tomu, že popisky
// jsou v HTML, ne vypálené v obrázku (a čtečka obrazovky text v JPEGu nepřečte).
//
// Klíč se bere z prostředí a NIKDY se necommituje.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'vedra');

const MODEL = 'gemini-3-pro-image';
const TARGET_WIDTH = 1200;   // víc web nepotřebuje, i na retina 2× v 600px slotu
const JPEG_QUALITY = 0.82;

/** Společná část zadání — drží všechny ilustrace v jednom vizuálním jazyce. */
const STYLE = `
STYLE: Hand-drawn editorial ink illustration in the manner of a quality broadsheet
newspaper. Fine cross-hatching and confident line work. Flat and restrained.
NOT cartoonish, NOT 3D, NOT photorealistic, NO gradients, NO soft shading.

STRICT PALETTE — use only these three values:
- background: warm paper #fbf8f1
- all linework and hatching: dark ink #1f1a14
- exactly ONE accent in red #b8361e, used sparingly, only on the single most
  important element in the picture

ABSOLUTELY NO text, letters, numbers, digits, labels, watermarks or logos
anywhere in the image.
Composition: landscape 16:9, generous margins, subject clearly centered,
plenty of empty paper around it.
`.trim();

const ILLUSTRATIONS = [
  {
    id: 'hero',
    alt: 'Kresba města v horkém dni — rozpálené ulice, lidé vyhledávající stín, nad nimi vysoké slunce.',
    subject: `A Czech town square during a heat wave seen from a low angle: heat shimmer
rising from the pavement, a few people seeking shade under a tree and an awning,
an empty bench in full sun. The sun high above dominates the composition.
The red accent belongs ONLY to the sun.`,
  },
  {
    id: 'upal',
    alt: 'Kresba srovnávající úžeh a úpal — vlevo slunce dopadající na hlavu, vpravo přehřátá postava bez slunce.',
    subject: `A diptych comparison inside one frame, separated by a thin vertical rule.
LEFT: a human head and neck seen from behind with sharp sun rays striking the top
of the head — localised sunstroke. RIGHT: a whole seated human figure indoors,
slumped, with heat radiating from the entire body and no sun present at all —
whole-body heat stroke. The red accent belongs ONLY to the overheated body on the right.`,
  },
  {
    id: 'skupiny',
    alt: 'Kresba rizikových skupin — senior, malé dítě, těhotná žena a člověk s léky.',
    subject: `Four figures standing in a row, drawn simply and with dignity, not caricature:
an elderly person with a cane, a small child, a pregnant woman, and an adult holding
a pill organiser. Equal visual weight, calm posture. The red accent is a single thin
line beneath all four, connecting them.`,
  },
  {
    id: 'leky',
    alt: 'Kresba léků na slunci — blistr tablet a lahvička vedle teploměru ukazujícího vysokou teplotu.',
    subject: `A blister pack of tablets and a small medicine bottle lying on a sunlit surface
next to a thermometer whose column is very high. Sun rays fall across them.
The red accent belongs ONLY to the thermometer column.`,
  },
  {
    id: 'klimatizace',
    alt: 'Kresba proudění vzduchu v kabině auta — vzduch míří kolem cestujícího, ne přímo na něj.',
    subject: `Cross-section of a car cabin from the side showing air flow from the dashboard
vents as smooth curved arrows that sweep around and past a seated driver rather than
striking the face directly. Calm, technical, diagrammatic. The red accent belongs ONLY
to the airflow arrows.`,
  },
  {
    id: 'auto',
    alt: 'Kresba zaparkovaného auta na slunci v řezu — uvnitř stoupá horký vzduch, teploměr ukazuje extrémní teplotu.',
    subject: `A parked car in blazing sun shown in cross-section so that trapped heat inside
is visible as rising wavy warm air; a thermometer inside the cabin reading dangerously
high. The car is closed and empty. The red accent belongs ONLY to the thermometer.`,
  },
  {
    id: 'noci',
    alt: 'Kresba tropické noci — ložnice s otevřeným oknem, měsíc venku a teploměr, který neklesá.',
    subject: `A bedroom at night: an open window with a crescent moon and still, warm air outside,
a person lying awake on top of the sheets, and a thermometer on the wall whose column
stays high despite the darkness. The red accent belongs ONLY to the thermometer column.`,
  },
  {
    id: 'voda',
    alt: 'Kresba dohledu u vody — dospělý sleduje dítě brodící se u břehu.',
    subject: `A lake or river shore: a small child wading in shallow water near the bank while
an adult sits close by on the shore, clearly watching, not distracted. Calm summer scene,
no danger depicted, the point is attentive supervision. The red accent belongs ONLY to
the adult's line of sight, drawn as a subtle thin line toward the child.`,
  },
];

// ── generování ───────────────────────────────────────────────────────

async function generate(spec, key) {
  const prompt = `Editorial illustration for a Czech public-health web page about heat waves.\n\nSUBJECT: ${spec.subject}\n\n${STYLE}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${spec.id}: HTTP ${res.status} — ${JSON.stringify(json).slice(0, 300)}`);
  }
  const part = (json.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData);
  if (!part) {
    throw new Error(`${spec.id}: odpověď neobsahuje obrázek — ${JSON.stringify(json).slice(0, 300)}`);
  }
  return Buffer.from(part.inlineData.data, 'base64');
}

/**
 * Zmenší a rekomprimuje obrázek přes Chromium canvas.
 *
 * Proč takhle: sharp ani ImageMagick v projektu nejsou a kvůli osmi obrázkům
 * nemá smysl přidávat nativní závislost. Playwright s Chromiem tu je kvůli
 * e2e testům, takže tohle nic nepřidává. Model vrací ~800 kB na kus; po
 * převzorkování na 1200 px zůstane kolem 150 kB.
 */
async function shrink(buffers) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  const out = {};
  for (const [id, buf] of Object.entries(buffers)) {
    const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
    const encoded = await page.evaluate(
      async ({ src, width, quality }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const scale = Math.min(1, width / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', quality);
      },
      { src: dataUrl, width: TARGET_WIDTH, quality: JPEG_QUALITY },
    );
    out[id] = Buffer.from(encoded.split(',')[1], 'base64');
  }

  await browser.close();
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    for (const s of ILLUSTRATIONS) console.log(`${s.id.padEnd(14)} ${s.alt}`);
    return;
  }

  const onlyArg = args.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',') : null;
  const specs = only ? ILLUSTRATIONS.filter((s) => only.includes(s.id)) : ILLUSTRATIONS;
  if (!specs.length) throw new Error(`--only nevybralo žádnou ilustraci (známé: ${ILLUSTRATIONS.map((s) => s.id).join(', ')})`);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('Chybí GEMINI_API_KEY v prostředí. Klíč se do repa nezapisuje.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const raw = {};
  for (const spec of specs) {
    process.stdout.write(`  ${spec.id} … `);
    raw[spec.id] = await generate(spec, key);
    console.log(`${Math.round(raw[spec.id].length / 1024)} kB`);
  }

  console.log('Zmenšuji…');
  const small = await shrink(raw);

  for (const [id, buf] of Object.entries(small)) {
    const file = path.join(OUT_DIR, `${id}.jpg`);
    fs.writeFileSync(file, buf);
    console.log(`  assets/vedra/${id}.jpg — ${Math.round(buf.length / 1024)} kB`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

export { ILLUSTRATIONS };
