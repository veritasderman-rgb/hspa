// FÁZE 3 — webové datasety sekce „Pracovní skupiny MZ" (PLAN-PPO.md §5).
// Čte deterministické výstupy FÁZE 1 (ingest/ppo/out/*.json) a LLM analýzu
// FÁZE 2 (ingest/ppo/analyza/*.json) a skládá z nich datový kontrakt:
//
//   data/ppo.json             ← hub + detail: skupiny, síť s předpočítaným
//                               layoutem, žebříčky „spojek", kalendář jednání,
//                               zjištění ze syntézy (lehký souhrn analýzy)
//   data/ppo-osoby.json       ← detail skupiny + profil osoby: 994 osob
//                               s členstvími; u kurátorovaných osob navíc
//                               veřejné funkce a externí odkazy (FÁZE 4a,
//                               ingest/ppo/osoby-externi.json)
//   data/ppo-analyza/{id}.json ← jen detail skupiny: profil z analýzy zápisů
//                               + doložená jednání s rozhodnutími (líně,
//                               jen skupiny s dostupnou analýzou)
//
// Vše deterministické: layout sítě je čistá funkce vstupních dat (žádný
// Math.random, žádné Date.now) — stejné vstupy ⇒ bajtově stejný výstup.
// Spuštění: node ingest/ppo/build-web.js  (nebo npm run build:ppo)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
const ANA = path.join(__dirname, 'analyza');
const DATA = path.resolve(__dirname, '..', '..', 'data');

const readOut = name => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));

/* ---------- layout sítě: radiální shluky podle sekcí MZ ---------------- */
// Identitu shluku nese POZICE + popisek (ne barva — viz docs/visual-components.md,
// monochromní editorial systém). Uzly jedné sekce sedí u sebe na zlatoúhlé
// spirále (hub s nejvyšším stupněm uprostřed), shluky po obvodu kruhu s úhlem
// úměrným odmocnině velikosti. Nakonec deterministická kolizní relaxace.

export const VIEW = { w: 1200, h: 820 };

export function clusterKey(gesce) {
  return String(gesce || '-').split('/')[0].trim() || '-';
}

export function layoutNetwork(uzly, skupinyById) {
  // 1) shluky podle sekce (kód před lomítkem v gesci), setříděné deterministicky
  const byCluster = new Map();
  for (const u of uzly) {
    const key = clusterKey(skupinyById.get(u.id)?.gesce);
    if (!byCluster.has(key)) byCluster.set(key, []);
    byCluster.get(key).push(u);
  }
  const clusters = [...byCluster.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'cs'));

  // 2) úhlové výseče úměrné odhadu POLOMĚRU spirály shluku (ne počtu) —
  // jinak největší shluk přeteče do sousedů; start nahoře, po směru hodin
  const spiralK = n => 9 + Math.sqrt(n) * 2.2;
  const blobR = n => spiralK(n) * Math.sqrt(Math.max(n - 1, 0)) + 26;
  const weights = clusters.map(([, nodes]) => blobR(nodes.length));
  const total = weights.reduce((s, w) => s + w, 0);
  const cx = VIEW.w / 2, cy = VIEW.h / 2;
  const R = Math.min(VIEW.w, VIEW.h) * 0.34;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~2.39996

  let acc = 0;
  const placed = [];
  const shluky = [];
  clusters.forEach(([key, nodes], ci) => {
    const angle = ((acc + weights[ci] / 2) / total) * 2 * Math.PI - Math.PI / 2;
    acc += weights[ci];
    // velké shluky DÁL od středu (jejich spirála si sáhne dovnitř sama),
    // malé blíž; elipsa — plátno je širší než vyšší, ať se šířka využije
    const dist = R * (0.62 + Math.min(weights[ci] / 160, 0.55));
    const ccx = cx + Math.cos(angle) * dist * 1.5;
    const ccy = cy + Math.sin(angle) * dist;

    // 3) zlatoúhlá spirála uvnitř shluku, hub (max stupeň) uprostřed
    const sorted = [...nodes].sort((a, b) => b.stupen - a.stupen || a.id - b.id);
    const k = spiralK(sorted.length);
    sorted.forEach((u, i) => {
      const r = k * Math.sqrt(i);
      const th = i * GOLDEN + angle; // natočení spirály od úhlu shluku (deterministicky)
      placed.push({ id: u.id, stupen: u.stupen, shluk: key,
        x: ccx + Math.cos(th) * r, y: ccy + Math.sin(th) * r });
    });
    shluky.push({ kod: key, pocet: nodes.length, x: ccx, y: ccy });
  });

  // 4) kolizní relaxace — deterministické pořadí dvojic, pevný počet iterací
  const rOf = u => 4 + Math.sqrt(u.stupen || 1) * 1.7;
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i], b = placed[j];
        const min = rOf(a) + rOf(b) + 5;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < min) {
          const push = (min - d) / 2;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
  }
  // 5) svorka do plátna + zaokrouhlení (stabilní diff)
  const M = 26;
  for (const u of placed) {
    u.x = Math.round(Math.min(VIEW.w - M, Math.max(M, u.x)) * 10) / 10;
    u.y = Math.round(Math.min(VIEW.h - M, Math.max(M, u.y)) * 10) / 10;
  }
  // popisky shluků: centroid po relaxaci
  for (const s of shluky) {
    const mine = placed.filter(u => u.shluk === s.kod);
    s.x = Math.round(mine.reduce((sum, u) => sum + u.x, 0) / mine.length * 10) / 10;
    s.y = Math.round(mine.reduce((sum, u) => sum + u.y, 0) / mine.length * 10) / 10;
  }
  placed.sort((a, b) => a.id - b.id);
  return { uzly: placed, shluky };
}

/* ---------- spojky: žebříčky osob napříč skupinami --------------------- */
export function spojkaRow(p, viditelneGids) {
  const clenstvi = p.clenstvi.filter(c => viditelneGids.has(c.g));
  const predsednictvi = clenstvi.filter(c => /edsed/.test(c.role)).length;
  return {
    id: p.id,
    jmeno: p.jmeno,
    kat: p.afiliace_kategorie ?? 'neuvedeno',
    afiliace: (p.afiliace ?? [])[0] ?? null,
    skupin: clenstvi.length,
    predsednictvi,
    skupiny: clenstvi.map(c => c.g).sort((a, b) => a - b),
  };
}

/* ---------- FÁZE 2 analýza: profil skupiny + jednání pro web -------------- */
// Index doc_id → { url, titul } z korpusu (absolutní URL na ppo.mzcr.cz),
// aby doložená jednání i doklady zjištění vedly na primární dokument.
export function korpusUrlIndex(gzPath) {
  const idx = new Map();
  if (!fs.existsSync(gzPath)) return idx;
  const text = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    const r = JSON.parse(line);
    idx.set(r.doc_id, {
      url: r.url?.startsWith('http') ? r.url : `https://ppo.mzcr.cz${r.url ?? ''}`,
      titul: r.title ?? null,
    });
  }
  return idx;
}

// Z analyza/skupina-<gid>.json vyrobí webový soubor: profil beze změny tvaru,
// jednání nejnovější první a jen s poli, která detail vykresluje (aktivní
// osoby a výčty organizací/dokumentů zůstávají v ingest vrstvě).
export function analyzaWebFile(a, docIdx) {
  const jednani = (a.jednani ?? [])
    .map(x => ({
      datum: x.datum ?? null,
      url: docIdx.get(x.doc_id)?.url ?? null,
      temata: x.temata ?? [],
      rozhodnuti: x.rozhodnuti ?? [],
      ukoly: x.ukoly ?? [],
      stret_zajmu: x.stret_zajmu ?? [],
      citace: x.citace ?? [],
    }))
    .sort((x, y) => String(y.datum ?? '').localeCompare(String(x.datum ?? '')));
  return { group_id: a.group_id, profil: a.profil ?? null, jednani };
}

/* ---------- FÁZE 4a: kurátorované veřejné funkce a externí odkazy -------- */
// ingest/ppo/osoby-externi.json drží ručně ověřené veřejné funkce osob
// (Hlídač státu, tiskové zprávy). Merge je přísný: neexistující id nebo
// jméno, které kurátorskému neodpovídá (posun id po nové FÁZE 1 extrakci),
// build shodí — tichý mismatch by připsal funkce cizí osobě.
export function mergeExterni(osoby, externi) {
  if (!externi) return osoby;
  const byId = new Map(osoby.map(p => [p.id, p]));
  for (const e of externi.osoby ?? []) {
    const p = byId.get(e.id);
    if (!p) throw new Error(`osoby-externi: id ${e.id} (${e.jmeno}) v osobách není`);
    if (!p.jmeno.includes(e.jmeno)) {
      throw new Error(`osoby-externi: id ${e.id} — jméno v datech „${p.jmeno}" neobsahuje kurátorské „${e.jmeno}" (posun id po nové extrakci?)`);
    }
    p.externi = {
      funkce: e.funkce ?? [],
      odkazy: e.odkazy ?? [],
      overeno: externi.overeno ?? null,
    };
  }
  return osoby;
}

/* ---------- FÁZE 4b: kurátorované souvislosti skupin se zbytkem webu ----- */
// ingest/ppo/skupiny-souvislosti.json drží ručně vybrané odkazy (články,
// stránky, indikátory) k vybraným skupinám. Guardy: id musí existovat,
// interní cíl (.html) musí být v repu a odkazovaný článek publikovaný —
// mrtvý nebo draftový odkaz shodí build, ne až čtenáře.
export function mergeSouvislosti(skupinyById, reg, { rootDir, publishedSlugs }) {
  if (!reg) return;
  for (const r of reg.skupiny ?? []) {
    const s = skupinyById.get(r.id);
    if (!s) throw new Error(`skupiny-souvislosti: skupina ${r.id} v datech není`);
    for (const o of r.odkazy ?? []) {
      if (!o.nazev || !o.url) throw new Error(`skupiny-souvislosti: skupina ${r.id} — odkaz bez názvu nebo url`);
      if (!/^https?:/.test(o.url)) {
        const file = o.url.split(/[?#]/)[0];
        if (!fs.existsSync(path.join(rootDir, file))) {
          throw new Error(`skupiny-souvislosti: skupina ${r.id} — cíl ${file} v repu není`);
        }
        if (/^clanek-.*\.html$/.test(file) && !publishedSlugs.has(file)) {
          throw new Error(`skupiny-souvislosti: skupina ${r.id} — článek ${file} není publikovaný`);
        }
      }
    }
    s.souvislosti = r.odkazy;
  }
}

function main() {
  const skupinyOut = readOut('skupiny.json');
  const sitOut = readOut('sit.json');
  const osobyOut = readOut('osoby.json');
  const kalendarOut = readOut('kalendar.json');

  // „vynechano" (Přístrojová komise, rozhodnutí vlastníka — PLAN-PPO.md §4.4)
  // se do webu nedostane vůbec.
  //
  // posledni_aktivita z FÁZE 1 obsahuje i špatně vyparsované hodnoty („2068",
  // „2042" — roky z těl dokumentů). Web proto bere výhradně poslední DATOVANÝ
  // ZÁPIS z kalendáře (autoritativní zdroj: kalendar.po_skupine); skupina bez
  // datovaného zápisu má null a UI píše „bez doloženého jednání".
  // FÁZE 2 analýza (pokud je v repu): merged soubory + syntéza
  const analyzy = new Map();
  if (fs.existsSync(ANA)) {
    for (const f of fs.readdirSync(ANA)) {
      const m = /^skupina-(\d+)\.json$/.exec(f);
      if (m) analyzy.set(Number(m[1]), JSON.parse(fs.readFileSync(path.join(ANA, f), 'utf8')));
    }
  }
  const syntezaPath = path.join(ANA, 'synteza.json');
  const synteza = fs.existsSync(syntezaPath) ? JSON.parse(fs.readFileSync(syntezaPath, 'utf8')) : null;
  const docIdx = korpusUrlIndex(path.join(__dirname, 'source', 'ppo_korpus_full.jsonl.gz'));

  const skupiny = skupinyOut.skupiny
    .filter(s => s.stav !== 'vynechano')
    .map(s => ({
      ...s,
      posledni_aktivita: kalendarOut.po_skupine[s.id]?.at(-1) ?? null,
      analyza: analyzy.has(s.id)
        ? { jednani: (analyzy.get(s.id).jednani ?? []).length }
        : null,
    }))
    .sort((a, b) => a.id - b.id);
  const skupinyById = new Map(skupiny.map(s => [s.id, s]));
  const gids = new Set(skupiny.map(s => s.id));

  // FÁZE 4b: kurátorované souvislosti (guard proti mrtvým a draftovým odkazům)
  const souvPath = path.join(__dirname, 'skupiny-souvislosti.json');
  if (fs.existsSync(souvPath)) {
    const rootDir = path.resolve(__dirname, '..', '..');
    const articles = JSON.parse(fs.readFileSync(path.join(DATA, 'articles.json'), 'utf8')).articles ?? [];
    const publishedSlugs = new Set(articles.filter(a => a.published !== false).map(a => a.slug));
    mergeSouvislosti(skupinyById, JSON.parse(fs.readFileSync(souvPath, 'utf8')),
      { rootDir, publishedSlugs });
  }

  // síť: jen uzly existujících skupin; hrany mezi nimi
  const uzlyIn = sitOut.skupiny.filter(u => gids.has(u.id));
  const { uzly, shluky } = layoutNetwork(uzlyIn, skupinyById);
  const hrany = sitOut.hrany_skupina_skupina
    .filter(h => gids.has(h.a) && gids.has(h.b))
    .map(h => ({ a: h.a, b: h.b, vaha: h.vaha, osoby: h.osoby }));

  // spojky — tři pohledy (methodika FÁZE 1: bez hostů)
  const osobyById = new Map(osobyOut.osoby.map(p => [p.id, p]));
  const TOP = 12;
  const spojky = {};
  for (const [key, zebricek] of Object.entries(osobyOut.zebricky)) {
    spojky[key] = zebricek.slice(0, TOP)
      .map(pid => spojkaRow(osobyById.get(pid), gids))
      .filter(r => r.skupin >= 2);
  }

  // stav_k: nejzazší doložená aktivita (deterministické — žádné „dnes")
  const stavK = skupiny.map(s => s.posledni_aktivita).filter(Boolean).sort().at(-1);

  const kalendar = {
    jednani_celkem: kalendarOut.jednani_celkem,
    mesice: kalendarOut.mesice,
    po_skupine: Object.fromEntries(
      Object.entries(kalendarOut.po_skupine).filter(([g]) => gids.has(Number(g)))),
  };

  const ppo = {
    version: '1.0',
    zdroj: 'ppo.mzcr.cz — portál pracovních a poradních orgánů MZ ČR',
    stav_k: stavK,
    pozn: 'FÁZE 1 extrakce (ingest/ppo): členství bez hostů; jednání = dokumenty typu zápis s datem. '
      + 'Přístrojová komise vynechána (PLAN-PPO.md §4.4). Layout sítě předpočítán deterministicky.',
    souhrn: {
      skupin: skupiny.length,
      aktivnich: skupiny.filter(s => s.stav === 'aktivni').length,
      osob: osobyOut.pocet,
      jednani: kalendarOut.jednani_celkem,
      vazeb: hrany.length,
    },
    skupiny,
    sit: {
      pozn: sitOut.pozn,
      view: VIEW,
      uzly,
      shluky,
      hrany,
    },
    spojky,
    kalendar,
    // zjištění ze syntézy FÁZE 2 — teze s doklady (odkazy na primární
    // dokumenty portálu) a odkazy na skupiny; hub je vykresluje jako
    // redakční sekci „Co říkají zápisy"
    zjisteni: (synteza?.zjisteni ?? []).map(z => ({
      teze: z.teze,
      skupiny: (z.skupiny ?? []).filter(g => gids.has(g)),
      doklady: (z.doklad_doc_ids ?? [])
        .map(d => docIdx.get(d))
        .filter(Boolean)
        .map(d => ({ url: d.url, titul: d.titul })),
    })),
  };

  const osoby = {
    version: '1.0',
    zdroj: ppo.zdroj,
    pocet: osobyOut.pocet,
    osoby: osobyOut.osoby.map(p => ({
      id: p.id,
      jmeno: p.jmeno,
      profese: p.profese ?? null,
      kat: p.afiliace_kategorie ?? 'neuvedeno',
      afiliace: (p.afiliace ?? []).slice(0, 2),
      clenstvi: p.clenstvi.filter(c => gids.has(c.g)),
    })).sort((a, b) => a.id - b.id),
  };
  const externiPath = path.join(__dirname, 'osoby-externi.json');
  mergeExterni(osoby.osoby,
    fs.existsSync(externiPath) ? JSON.parse(fs.readFileSync(externiPath, 'utf8')) : null);

  for (const [name, data] of [['ppo.json', ppo], ['ppo-osoby.json', osoby]]) {
    const p = path.join(DATA, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
    console.log(`✓ data/${name} (${(fs.statSync(p).size / 1024).toFixed(0)} kB)`);
  }

  // per-group analýzy pro detail (líně načítané) — adresář se přegenerovává
  // celý, aby v něm nezůstaly soubory skupin, které z analýzy vypadly
  if (analyzy.size) {
    const ANAWEB = path.join(DATA, 'ppo-analyza');
    fs.rmSync(ANAWEB, { recursive: true, force: true });
    fs.mkdirSync(ANAWEB, { recursive: true });
    let kb = 0;
    for (const [gid, a] of [...analyzy.entries()].sort((x, y) => x[0] - y[0])) {
      if (!gids.has(gid)) continue;
      const p = path.join(ANAWEB, `${gid}.json`);
      fs.writeFileSync(p, JSON.stringify(analyzaWebFile(a, docIdx), null, 1) + '\n');
      kb += fs.statSync(p).size / 1024;
    }
    console.log(`✓ data/ppo-analyza/*.json (${analyzy.size} skupin, ${kb.toFixed(0)} kB celkem)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
