// FÁZE 3 — webové datasety sekce „Pracovní skupiny MZ" (PLAN-PPO.md §5).
// Čte deterministické výstupy FÁZE 1 (ingest/ppo/out/*.json) a skládá z nich
// dva soubory datového kontraktu:
//
//   data/ppo.json        ← hub + detail: skupiny, síť s předpočítaným layoutem,
//                          žebříčky „spojek", kalendář jednání
//   data/ppo-osoby.json  ← jen detail skupiny: 994 osob s členstvími
//                          (načítá se líně, hub ho nepotřebuje)
//
// Vše deterministické: layout sítě je čistá funkce vstupních dat (žádný
// Math.random, žádné Date.now) — stejné vstupy ⇒ bajtově stejný výstup.
// Spuštění: node ingest/ppo/build-web.js  (nebo npm run build:ppo)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
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
  const skupiny = skupinyOut.skupiny
    .filter(s => s.stav !== 'vynechano')
    .map(s => {
      // jednání KOMPLETNĚ z kalendáře datovaných zápisů — jediný zdroj pravdy
      // pro počet, roky i poslední aktivitu (nález Codex review PR #1034:
      // jednani_celkem/jednani_roky ze skupiny.json se s kalendářem rozcházely)
      const data = kalendarOut.po_skupine[s.id] ?? [];
      const roky = {};
      for (const d of data) roky[d.slice(0, 4)] = (roky[d.slice(0, 4)] ?? 0) + 1;
      return {
        ...s,
        jednani_celkem: data.length,
        jednani_roky: roky,
        posledni_aktivita: data.at(-1) ?? null,
      };
    })
    .sort((a, b) => a.id - b.id);
  const skupinyById = new Map(skupiny.map(s => [s.id, s]));
  const gids = new Set(skupiny.map(s => s.id));

  // síť: hrany mezi existujícími skupinami; stupeň uzlu = počet INCIDENTNÍCH
  // HRAN skupina–skupina (legenda „velikost = počet vazeb na jiné skupiny").
  // Pozor: sit.json má ve `stupen` bipartitní stupeň (počet členů) — ten se
  // sem nesmí propsat (nález Codex review PR #1034).
  const hrany = sitOut.hrany_skupina_skupina
    .filter(h => gids.has(h.a) && gids.has(h.b))
    .map(h => ({ a: h.a, b: h.b, vaha: h.vaha, osoby: h.osoby }));
  const deg = new Map();
  for (const h of hrany) {
    deg.set(h.a, (deg.get(h.a) ?? 0) + 1);
    deg.set(h.b, (deg.get(h.b) ?? 0) + 1);
  }
  const uzlyIn = sitOut.skupiny
    .filter(u => gids.has(u.id) && deg.has(u.id))
    .map(u => ({ id: u.id, stupen: deg.get(u.id) }));
  const { uzly, shluky } = layoutNetwork(uzlyIn, skupinyById);

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

  for (const [name, data] of [['ppo.json', ppo], ['ppo-osoby.json', osoby]]) {
    const p = path.join(DATA, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
    console.log(`✓ data/${name} (${(fs.statSync(p).size / 1024).toFixed(0)} kB)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
