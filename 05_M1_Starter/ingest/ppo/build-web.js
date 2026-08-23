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
export function analyzaWebFile(a, docIdx, registry = {}) {
  const jednani = (a.jednani ?? [])
    .map(x => ({
      datum: x.datum ?? null,
      url: docIdx.get(x.doc_id)?.url ?? null,
      temata: x.temata ?? [],
      rozhodnuti: x.rozhodnuti ?? [],
      // úkoly nesou i osud z FÁZE 6 (t = normalizovaný termín, stav/sd/dk/du,
      // ext) — detail skupiny z nich staví časovou osu úkolů bez dalšího fetch
      ukoly: (x.ukoly ?? []).map((u, i) => ({
        ...u,
        t: parseTermin(u.termin),
        ...osudUkolu(x.doc_id, i, registry),
      })),
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

// Kurátorské korekce kategorizace osob (osoby-externi.json, pole `korekce`):
// FÁZE 1 kategorizuje z jmenných seznamů portálu a u části osob vyjde
// `neuvedeno` — když je ale funkce ověřená (např. politický náměstek MZ),
// patří osoba do správné kategorie i žebříčků. Korekce se aplikuje PŘED
// stavbou spojek: přepíše kategorii/afiliaci a osobu s kategorií
// `mz_urednik` vyřadí z žebříčků bez úředníků, se `statni_instituce`
// z žebříčku bez úředníků a státních institucí (zrcadlí filtr FÁZE 1).
export function applyKorekce(osobyOut, reg) {
  if (!reg) return;
  const byId = new Map(osobyOut.osoby.map(p => [p.id, p]));
  for (const e of reg.osoby ?? []) {
    if (!e.korekce) continue;
    const p = byId.get(e.id);
    if (!p) throw new Error(`osoby-externi korekce: id ${e.id} v osobách není`);
    if (!p.jmeno.includes(e.jmeno)) {
      throw new Error(`osoby-externi korekce: id ${e.id} — jméno „${p.jmeno}" neobsahuje „${e.jmeno}"`);
    }
    if (e.korekce.kat) p.afiliace_kategorie = e.korekce.kat;
    if (e.korekce.afiliace) {
      p.afiliace = [...e.korekce.afiliace, ...(p.afiliace ?? []).filter(a => !e.korekce.afiliace.includes(a))];
    }
    if (e.korekce.kat === 'mz_urednik') {
      for (const key of ['bez_uredniku', 'bez_uredniku_a_statnich']) {
        osobyOut.zebricky[key] = osobyOut.zebricky[key].filter(pid => pid !== e.id);
      }
    } else if (e.korekce.kat === 'statni_instituce') {
      osobyOut.zebricky.bez_uredniku_a_statnich =
        osobyOut.zebricky.bez_uredniku_a_statnich.filter(pid => pid !== e.id);
    }
  }
}

// FÁZE 4d — dvojrole: orgány s úhradovým/regulačním dosahem (název-based,
// stejná heuristika jako redakční analýza „Židle a živnost").
export const UHRADOVY_ORGAN = /seznamu zdravotních výkonů|kategorizac|úhrad|cen(ov|y|ám)|dohodovac|poskytovatelů|léčiv|lékov|farmak|antibiotik/i;

// Z registru (osoby s polem firmy) staví data/ppo-dvojrole.json — čistě
// faktickou tabulku osoba → orgány → firemní angažmá dle obchodního
// rejstříku (Hlídač státu). Řadí: úhradové orgány první, pak počet firem.
export function buildDvojrole(externiReg, osobyById, skupinyById, gids) {
  if (!externiReg) return [];
  return externiReg.osoby
    .filter(e => e.firmy?.length)
    .map(e => {
      const p = osobyById.get(e.id);
      const skupiny = p.clenstvi
        .filter(c => gids.has(c.g))
        .map(c => ({ g: c.g, role: c.role, nazev: skupinyById.get(c.g).nazev,
          uhradovy: UHRADOVY_ORGAN.test(skupinyById.get(c.g).nazev) }));
      return { id: e.id, jmeno: p.jmeno,
        url: e.odkazy.find(o => o.url.startsWith('https://www.hlidacstatu.cz/'))?.url ?? null,
        statni_zakazky: !!e.statni_zakazky, firmy: e.firmy, skupiny };
    })
    .filter(x => x.skupiny.length)
    .sort((a, b) =>
      (b.skupiny.some(s => s.uhradovy) - a.skupiny.some(s => s.uhradovy))
      || b.firmy.length - a.firmy.length || a.id - b.id);
}

/* ---------- FÁZE 4b: kurátorované souvislosti skupin se zbytkem webu ----- */
// ingest/ppo/skupiny-souvislosti.json drží ručně vybrané odkazy (články,
// stránky, indikátory) k vybraným skupinám. Guardy: id musí existovat,
// interní cíl (.html) musí být v repu a odkazovaný článek publikovaný —
// mrtvý nebo draftový odkaz shodí build, ne až čtenáře.
/** Karta „Ve Věstníku MZ": na záznam skupiny přidá položky obsahu věstníků,
 *  které deterministicky matchují její agendu (vestniky_souvislosti.json).
 *  Nejnovější první, max 8 na skupinu; skupiny bez zásahu pole nedostanou. */
export function mergeVestnik(skupinyById, vestniky, mapping, max = 8) {
  for (const r of mapping?.skupiny ?? []) {
    const s = skupinyById.get(r.g);
    if (!s) continue;
    const re = new RegExp(r.re, 'i');
    const hits = [];
    for (const c of vestniky?.castky ?? []) {
      for (const o of c.obsah) {
        if (re.test(o.t)) hits.push({ t: o.t, titul: c.titul, url: c.url, datum: c.datum });
      }
    }
    if (hits.length) {
      hits.sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''));
      s.vestnik = hits.slice(0, max);
      s.vestnik_celkem = hits.length;
    }
  }
}

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

/* ---------- FÁZE 5: dashboard úkolů z jednání ---------------------------- */
// Zápisy zachycují ZADÁNÍ úkolů (co, kdo, termín) — jejich splnění z dat
// odvodit nelze; „otevřené úkoly" jsou syntézou analýzy profilu skupiny.
// parseTermin převádí volné české formulace termínů na ISO datum, pokud to
// jde bez hádání; jinak vrací null a UI zobrazí termín jako text.

const MESICE = {
  leden: 1, ledna: 1, unor: 2, unora: 2, brezen: 3, brezna: 3, duben: 4, dubna: 4,
  kveten: 5, kvetna: 5, cerven: 6, cervna: 6, cervenec: 7, cervence: 7,
  srpen: 8, srpna: 8, zari: 9, rijen: 10, rijna: 10, listopad: 11, listopadu: 11,
  prosinec: 12, prosince: 12,
};
const MESIC_RE = Object.keys(MESICE).join('|');
const deacc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const iso = (y, m, d) => {
  y = Number(y); m = Number(m); d = Number(d);
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const konecMesice = (y, m) => iso(y, m, new Date(Number(y), Number(m), 0).getDate());

export function parseTermin(s) {
  if (!s) return null;
  const t = deacc(s);
  // Datum, před nímž stojí relativní vazba („cca 14 dnů PŘED jednáním PS
  // 24. 11. 2016", „OD obdržení…"), termín jen ukotvuje — skutečná lhůta je
  // relativní a normalizované datum by lhalo. Takový termín zůstává textem.
  const relativni = m => /(^|\s)(pred|po|od)(\s|$)/.test(t.slice(0, m.index));
  let m;
  if ((m = /(\d{4})-(\d{2})-(\d{2})/.exec(t))) return relativni(m) ? null : iso(m[1], m[2], m[3]);
  if ((m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})/.exec(t))) return relativni(m) ? null : iso(m[3], m[2], m[1]);
  if ((m = new RegExp(`(\\d{1,2})\\.\\s*(${MESIC_RE})\\s+(\\d{4})`).exec(t))) {
    return relativni(m) ? null : iso(m[3], MESICE[m[2]], m[1]);
  }
  if ((m = /do konce roku (\d{4})/.exec(t))) return iso(m[1], 12, 31);
  if ((m = new RegExp(`do konce (${MESIC_RE})\\s+(\\d{4})`).exec(t))) {
    return konecMesice(m[2], MESICE[m[1]]);
  }
  if ((m = new RegExp(`(?:^|\\s)(${MESIC_RE})\\s+(\\d{4})`).exec(t))) {
    return relativni(m) ? null : konecMesice(m[2], MESICE[m[1]]);
  }
  return null;
}

// Datum jednání z FÁZE 2 může nést špatně vyparsovaný rok z těla dokumentu
// („2065" — stejný problém jako posledni_aktivita). Mimo věrohodný rozsah
// portálu (2004 až příští rok) se datum zahazuje — úkol zůstává jako nedatovaný.
const datumOk = d => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? '')) return false;
  const y = Number(d.slice(0, 4));
  return y >= 2004 && y <= new Date().getFullYear() + 1;
};

/* ---------- FÁZE 6: osud úkolů (sledování napříč zápisy + rešerše) ------- */
// ingest/ppo/ukoly-stav/skupina-{gid}.json — LLM sledování: pro každý úkol
// (klíč doc_id + index v jednání) stav splneno/pokracuje/bez_dokladu
// s DOSLOVNÝM dokladem z pozdějšího zápisu; citace jsou před commitem strojově
// ověřeny proti korpusu. ingest/ppo/ukoly-legislativa.json — kurátorská externí
// rešerše legislativních úkolů (Věstník MZ, VeKLEP, Sbírka). bez_dokladu se do
// webových dat nepropisuje (absence polí = zápisy mlčí).

export function loadUkolyRegistry(dir, legPath) {
  const stavy = new Map();
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!/^skupina-\d+\.json$/.test(f)) continue;
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const u of d.ukoly ?? []) stavy.set(`${u.doc_id}:${u.i}`, u);
    }
  }
  const leg = fs.existsSync(legPath) ? JSON.parse(fs.readFileSync(legPath, 'utf8')) : null;
  const legJ = new Map();
  const legO = new Map();
  for (const e of leg?.zaznamy ?? []) {
    if (e.typ === 'jednani') legJ.set(`${e.doc_id}:${e.i}`, e);
    else if (e.typ === 'otevreny') legO.set(`${e.g}|${e.co}`, e);
    else throw new Error(`ukoly-legislativa: neznámý typ '${e.typ}'`);
  }
  return { stavy, legJ, legO };
}

// Pole osudu jednoho úkolu z jednání: stav/sd/dk/du (sledování) + ext (rešerše).
function osudUkolu(docId, i, { stavy, legJ, docIdx, jednaniDatum }) {
  const out = {};
  const st = stavy?.get(`${docId}:${i}`);
  if (st && st.stav !== 'bez_dokladu') {
    // Chronologie podle data JEDNÁNÍ (ne data uploadu dokumentu v korpusu):
    // doklad z jednání, které nepředchází zadání, splnění doložit nemůže.
    const td = jednaniDatum?.get(docId);
    const dd = jednaniDatum?.get(st.doklad_doc_id);
    if (td && dd && dd <= td) {
      console.warn(`⚠ osud ${docId}:${i}: doklad z jednání ${dd} nenásleduje po zadání ${td} — ignorován`);
    } else {
      out.stav = st.stav;
      out.sd = st.doklad_datum ?? null;
      out.dk = st.doklad ?? null;
      out.du = docIdx?.get(st.doklad_doc_id)?.url ?? null;
    }
  }
  const ext = legJ?.get(`${docId}:${i}`);
  if (ext?.vysledek && ext.vysledek.stav !== 'nedohledano') out.ext = ext.vysledek;
  return out;
}

// Z analýz FÁZE 2 poskládá plochý seznam úkolů zadaných na jednáních
// (jen skupiny přítomné ve webových datech) + otevřené úkoly z profilů,
// obohacený o osud úkolu z registrů FÁZE 6 (pokud existují).
export function buildUkoly(analyzy, gids, registry = {}) {
  const ukoly = [];
  const otevrene = [];
  for (const [gid, a] of [...analyzy.entries()].sort((x, y) => x[0] - y[0])) {
    if (!gids.has(gid)) continue;
    for (const j of a.jednani ?? []) {
      (j.ukoly ?? []).forEach((u, i) => {
        ukoly.push({
          g: gid,
          datum: datumOk(j.datum) ? j.datum : null,
          co: u.co,
          kdo: u.kdo ?? null,
          termin: u.termin ?? null,
          t: parseTermin(u.termin),
          ...osudUkolu(j.doc_id, i, registry),
        });
      });
    }
    for (const u of a.profil?.otevrene_ukoly ?? []) {
      const row = { g: gid, co: u.co, kdo: u.kdo ?? null, od: u.od ?? null };
      const ext = registry.legO?.get(`${gid}|${u.co}`);
      if (ext?.vysledek && ext.vysledek.stav !== 'nedohledano') row.ext = ext.vysledek;
      otevrene.push(row);
    }
  }
  // nejnovější jednání první; bez data na konec — stabilně podle skupiny
  ukoly.sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? '') || a.g - b.g);
  otevrene.sort((a, b) => (b.od ?? '').localeCompare(a.od ?? '') || a.g - b.g);
  return { ukoly, otevrene };
}

function main() {
  const skupinyOut = readOut('skupiny.json');
  const sitOut = readOut('sit.json');
  const osobyOut = readOut('osoby.json');
  const externiPath = path.join(__dirname, 'osoby-externi.json');
  const externiReg = fs.existsSync(externiPath)
    ? JSON.parse(fs.readFileSync(externiPath, 'utf8')) : null;
  applyKorekce(osobyOut, externiReg);
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

  // karta „Ve Věstníku MZ" — deterministický match obsahu archivu věstníků
  // na agendu orgánu (pravidla ingest/mapping/vestniky_souvislosti.json)
  const vestPath = path.join(DATA, 'vestniky.json');
  const vestMapPath = path.resolve(__dirname, '..', 'mapping', 'vestniky_souvislosti.json');
  if (fs.existsSync(vestPath) && fs.existsSync(vestMapPath)) {
    mergeVestnik(skupinyById,
      JSON.parse(fs.readFileSync(vestPath, 'utf8')),
      JSON.parse(fs.readFileSync(vestMapPath, 'utf8')));
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
  mergeExterni(osoby.osoby, externiReg);

  const dvojrole = {
    version: '1.0',
    zdroj: 'ppo.mzcr.cz (členství) + hlidacstatu.cz / obchodní rejstřík (firemní angažmá)',
    overeno: externiReg?.overeno ?? null,
    pozn: 'Čistě faktický přehled: osoby s ověřeným profilem na Hlídači státu, jejich angažmá '
      + 've firmách a spolcích dle veřejných rejstříků a členství v orgánech MZ. Angažmá neurčuje '
      + 'velikost podílu; statni_zakazky = firmy z profilu mají smlouvy v registru smluv. '
      + 'Členství zástupců je u řady orgánů deklarovaným mandátem.',
    osoby: buildDvojrole(externiReg, osobyById, skupinyById, gids),
  };
  dvojrole.pocet = dvojrole.osoby.length;

  // mapa doc_id → datum jednání ze VŠECH analýz (pro chronologickou
  // validaci dokladů v osudUkolu — datum uploadu v korpusu nestačí)
  const jednaniDatum = new Map();
  for (const a of analyzy.values()) {
    for (const j of a.jednani ?? []) if (j.doc_id && j.datum) jednaniDatum.set(j.doc_id, j.datum);
  }
  const registry = { ...loadUkolyRegistry(path.join(__dirname, 'ukoly-stav'),
    path.join(__dirname, 'ukoly-legislativa.json')), docIdx, jednaniDatum };
  const ukolyData = buildUkoly(analyzy, gids, registry);
  const ukoly = {
    version: '1.1',
    zdroj: 'zápisy z jednání na ppo.mzcr.cz (analýza FÁZE 2 + sledování osudu FÁZE 6)',
    pozn: 'Úkoly zadané na jednáních dle zveřejněných zápisů (co, kdo, termín). Pole '
      + 't = termín převedený na ISO datum, pokud je formulace jednoznačná. Osud úkolu: '
      + 'stav splneno/pokracuje jen s DOSLOVNÝM dokladem z pozdějšího zápisu (sd = datum '
      + 'dokladu, dk = citace, du = odkaz na zápis); absence stavu znamená, že zápisy '
      + 'o osudu úkolu mlčí — NEJDE o tvrzení, že úkol nebyl splněn. Pole ext = externě '
      + 'dohledaný výsledek legislativních úkolů (Věstník MZ, VeKLEP, Sbírka). „Otevřené '
      + 'úkoly" jsou syntézou analýzy profilu skupiny k datu poslední analýzy.',
    skupiny: [...new Set([...ukolyData.ukoly, ...ukolyData.otevrene].map(u => u.g))]
      .sort((a, b) => a - b)
      .map(g => ({ g, nazev: skupinyById.get(g).nazev })),
    ukoly: ukolyData.ukoly,
    otevrene: ukolyData.otevrene,
    pocty: {
      ukoly: ukolyData.ukoly.length,
      otevrene: ukolyData.otevrene.length,
      splneno: ukolyData.ukoly.filter(u => u.stav === 'splneno').length,
      pokracuje: ukolyData.ukoly.filter(u => u.stav === 'pokracuje').length,
      ext: [...ukolyData.ukoly, ...ukolyData.otevrene].filter(u => u.ext).length,
    },
  };

  // Teasery „Prozkoumat dál" na hubu čtou počty a ukázku ze souhrn —
  // hub tak nemusí kvůli třem číslům stahovat celé ppo-ukoly.json (~740 kB)
  ppo.souhrn.dvojroli = dvojrole.pocet;
  ppo.souhrn.vice_organu = osoby.osoby.filter(o => o.clenstvi.length >= 4).length;
  ppo.souhrn.ukoly = { ...ukoly.pocty };
  ppo.souhrn.ukoly_ukazka = ukolyData.ukoly.slice(0, 2)
    .map(u => ({ co: u.co, g: u.g, datum: u.datum ?? null }));

  for (const [name, data] of [['ppo.json', ppo], ['ppo-osoby.json', osoby], ['ppo-dvojrole.json', dvojrole], ['ppo-ukoly.json', ukoly]]) {
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
      fs.writeFileSync(p, JSON.stringify(analyzaWebFile(a, docIdx, registry), null, 1) + '\n');
      kb += fs.statSync(p).size / 1024;
    }
    console.log(`✓ data/ppo-analyza/*.json (${analyzy.size} skupin, ${kb.toFixed(0)} kB celkem)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
