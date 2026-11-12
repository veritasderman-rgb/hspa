// Srovnávač pojišťoven — jádro stránky Příspěvky (pojistovny-prispevky.html).
//
// Čisté funkce bez DOM nad data/pojistovny-prispevky.json: kdo z domácnosti má na který
// příspěvek nárok (věk, pohlaví, životní situace), jak se uplatní společné roční stropy
// a kolik nejvýš může domácnost u jedné pojišťovny čerpat. Testuje tests/pojistovny-prispevky.test.js.
//
// Co čísla znamenají: součet NEJVYŠŠÍCH možných částek podle webů pojišťoven, kdyby člověk
// vyčerpal všechno, na co má věkem a pohlavím nárok, a splnil podmínky každého příspěvku
// (doklad, preventivní prohlídka, lhůta). Příspěvky z fondu prevence jsou nenárokové; skutečné
// čerpání je řádově nižší (stránka Prevence, „nárok a čerpání“). Součet není hodnocení pojišťovny.

/** Životní situace, které si čtenář může u člena domácnosti zapnout. */
export const SITUACE_VOLITELNE = [
  { id: 'tehotna', label: 'těhotná', jenZena: true, jenDospely: true },
  { id: 'po_porodu', label: 'do roka po porodu', jenZena: true, jenDospely: true },
  { id: 'darce', label: 'dárce krve nebo plazmy', jenDospely: true },
  { id: 'diagnoza', label: 'léčí se, má doporučení lékaře' },
  { id: 'student', label: 'student' },
];

/** Situace, které se v součtu nikdy nepočítají samy od sebe (jen se vypíšou jako „pro vybrané skupiny“). */
export const SITUACE_POPIS = {
  tehotna: 'těhotné',
  po_porodu: 'po porodu',
  novorozenec: 'novorozenci',
  darce: 'dárci',
  diagnoza: 's diagnózou nebo doporučením lékaře',
  student: 'studenti',
  profese: 'vybraná povolání a zaměstnavatelé',
  novy_pojistenec: 'noví pojištěnci',
  bonusovy_program: 'členové bonusového programu',
  jine: 'jiná podmínka',
};

/** Předvolené domácnosti („pohled člověka“). `tema` = kategorie, která se s pohledem rovnou vyfiltruje. */
export const PERSONY = [
  { id: 'otec-3-deti', label: 'Otec 42 let a 3 děti', kod: 'M42,M5,Z9,M14' },
  { id: 'rodina-2-2', label: 'Rodina 2 + 2', kod: 'M40,Z38,Z7,M11' },
  { id: 'tehotna', label: 'Těhotná', kod: 'Z30t', tema: 'tehotenstvi_porod' },
  { id: 'zena', label: 'Žena 42 let', kod: 'Z42' },
  { id: 'muz', label: 'Muž 42 let', kod: 'M42' },
  { id: 'psychika', label: 'Psychické potíže', kod: 'Z35d', tema: 'dusevni_zdravi' },
  { id: 'student', label: 'Student 20 let', kod: 'M20s' },
  { id: 'senior', label: 'Senior 68 let', kod: 'Z68' },
];

const FLAG = { t: 'tehotna', p: 'po_porodu', k: 'darce', d: 'diagnoza', s: 'student' };
const FLAG_REV = Object.fromEntries(Object.entries(FLAG).map(([k, v]) => [v, k]));
export const MAX_CLENU = 8;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Jeden člen: { pohlavi: 'M'|'Z', vek: 0–110, situace: [..] }. Neplatný vstup → null. */
export function parseClen(token) {
  const m = /^([MZ])(\d{1,3})([tpkds]*)$/.exec(String(token ?? '').trim());
  if (!m) return null;
  const vek = Number(m[2]);
  if (vek > 110) return null;
  const situace = [...new Set(m[3].split('').map((f) => FLAG[f]))];
  return normalizeClen({ pohlavi: m[1], vek, situace });
}

/** Odstraní situace, které k členu nejdou (těhotný muž, dítě dárce). */
export function normalizeClen(clen) {
  const vek = Math.max(0, Math.min(110, Math.round(Number(clen?.vek) || 0)));
  const pohlavi = clen?.pohlavi === 'Z' ? 'Z' : 'M';
  const ok = (id) => {
    const def = SITUACE_VOLITELNE.find((s) => s.id === id);
    if (!def) return false;
    if (def.jenZena && pohlavi !== 'Z') return false;
    if (def.jenDospely && vek < 18) return false;
    return true;
  };
  const situace = [...new Set(Array.isArray(clen?.situace) ? clen.situace : [])].filter(ok);
  return { pohlavi, vek, situace };
}

/** „M42,Z9,Z30t“ → pole členů (neplatné tokeny se zahodí, nejvýš MAX_CLENU). */
export function parseDomacnost(kod) {
  return String(kod ?? '').split(',').map(parseClen).filter(Boolean).slice(0, MAX_CLENU);
}

export function serializeDomacnost(clenove) {
  return (clenove || []).map((c) => `${c.pohlavi}${c.vek}${(c.situace || []).map((s) => FLAG_REV[s] || '').join('')}`).join(',');
}

/** Krátký popisek člena pro tabulku: „muž 42“, „dcera 9“, „syn 14“, „žena 30, těhotná“. */
export function clenLabel(clen, { deti = true } = {}) {
  const dite = clen.vek < 18;
  const kdo = dite && deti ? (clen.pohlavi === 'Z' ? 'dcera' : 'syn') : (clen.pohlavi === 'Z' ? 'žena' : 'muž');
  return `${kdo} ${clen.vek}`;
}

/** Situace člena včetně odvozených (dítě do 1 roku = novorozenec). */
export function situaceClena(clen) {
  const s = new Set(clen.situace || []);
  if (clen.vek === 0) s.add('novorozenec');
  return s;
}

/** Životní fáze: mezi sebou se berou jako „nebo“ (těhotná nebo po porodu). Ostatní situace musí platit všechny. */
export const SITUACE_FAZE = ['tehotna', 'po_porodu', 'novorozenec'];

/**
 * Stav nároku člena na příspěvek:
 *  'ano'     věk, pohlaví i situace sedí (nebo příspěvek situaci nevyžaduje),
 *  'situace' věk a pohlaví sedí, ale příspěvek vyžaduje situaci, kterou člen nemá,
 *  'ne'      věk nebo pohlaví nesedí.
 *
 * Víc situací u jednoho příspěvku: životní fáze (těhotná, po porodu, novorozenec) stačí jedna z nich,
 * každá další situace je podmínka navíc. „student + diagnóza“ tedy znamená studenta s diagnózou,
 * „novorozenec + diagnóza“ nedonošené nebo nemocné miminko, ne každého studenta a každé miminko.
 */
export function stavNaroku(prispevek, clen) {
  const kdo = prispevek?.kdo || {};
  if (isNum(kdo.vek_od) && clen.vek < kdo.vek_od) return 'ne';
  if (isNum(kdo.vek_do) && clen.vek > kdo.vek_do) return 'ne';
  if ((kdo.pohlavi === 'M' || kdo.pohlavi === 'Z') && kdo.pohlavi !== clen.pohlavi) return 'ne';
  const req = Array.isArray(kdo.situace) ? kdo.situace : [];
  if (!req.length) return 'ano';
  const ma = situaceClena(clen);
  const faze = req.filter((s) => SITUACE_FAZE.includes(s));
  const dalsi = req.filter((s) => !SITUACE_FAZE.includes(s));
  const fazeOk = !faze.length || faze.some((s) => ma.has(s));
  const chybi = dalsi.filter((s) => !ma.has(s));
  if (fazeOk && !chybi.length) return 'ano';
  // situace, která u člena nastat nemůže (těhotný muž, dvaačtyřicetiletý novorozenec), se nenabízí ani podmíněně
  const fazeMozna = fazeOk || faze.some((s) => muzeNastat(s, clen, ma));
  return fazeMozna && chybi.every((s) => muzeNastat(s, clen, ma)) ? 'situace' : 'ne';
}

/** Může daná situace u člena vůbec nastat? Příspěvky pro novorozence se podmíněně nabízejí jen těhotné nebo ženě po porodu. */
export function muzeNastat(situace, clen, ma = situaceClena(clen)) {
  if (situace === 'tehotna' || situace === 'po_porodu') return clen.pohlavi === 'Z' && clen.vek >= 15;
  if (situace === 'novorozenec') return clen.vek === 0 || ma.has('tehotna') || ma.has('po_porodu');
  if (situace === 'darce') return clen.vek >= 18;
  return true;
}

/**
 * Pořadí podmínek pro čtenáře: nejdřív to, co rozhoduje o nároku (preventivní prohlídka, souběh
 * s jiným příspěvkem), pak ostatní věcné podmínky, potom doklady a nakonec jak a do kdy žádat.
 * Uvnitř skupiny zůstává pořadí z datasetu.
 */
export function tridaPodminky(text) {
  const t = String(text ?? '').toLowerCase();
  if (/preventivn\S* prohl[íi]d/.test(t)) return 0;
  if (/nelze[^.;]{0,60}(kombinovat|zároveň|současně|spolu s)|nekombinuj|společn\S* (limit|strop)|celkem nejvýše|jen jeden z|krátí/.test(t)) return 1;
  if (/diagnóz|potvrzení[^,;.]{0,40}lékař|doporučení|indikac|těhotensk\S* průkaz/.test(t)) return 2;
  if (/^(žád|termín|lhůt|podání)|žádat lze|žádost(i)? (lze|je třeba|je nutné|se podává|o příspěvek)|lze podat|podat (do|nejpozději)|elektronick|ekomunikac|aplikac\S* moje vzp|datov\S* schránk/.test(t)) return 5;
  if (/doklad|účten|paragon|faktur/.test(t)) return 4;
  return 3;
}

export function seradPodminky(podminky) {
  return (Array.isArray(podminky) ? podminky : [])
    .map((text, i) => ({ text, i, t: tridaPodminky(text) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.text);
}

/**
 * Pořadí řádků uvnitř tématu: nejdřív příspěvky s částkou od nejvyšší, bez částky nakonec;
 * při shodě zůstává pořadí z datasetu (pořadí na webu pojišťovny).
 */
export function seradRadky(radky) {
  return (radky || [])
    .map((r, i) => ({ r, i, c: isNum(r?.prispevek?.castka_kc) ? r.prispevek.castka_kc : -1 }))
    .sort((a, b) => b.c - a.c || a.i - b.i)
    .map((x) => x.r);
}

const jeRocni = (perioda) => perioda === 'rok';

/**
 * Nejvyšší možné čerpání jednoho člena u jedné pojišťovny.
 * Příspěvky se společným stropem (strop_id) se sečtou a oříznou: strop typu „castka“ na hodnotu
 * v Kč, typ „pocet“ na N nejvyšších příspěvků. Příspěvky bez částky se nepočítají (počet je v bezCastky).
 * @returns {{rocne:number, jednorazove:number, bezCastky:number, polozky:Array, stropy:Array}}
 */
export function soucetClena(zp, clen, { kategorie = null } = {}) {
  const stropById = Object.fromEntries((zp?.stropy || []).map((s) => [s.id, s]));
  const polozky = (zp?.prispevky || [])
    .filter((p) => (kategorie ? p.kategorie === kategorie : true))
    .filter((p) => stavNaroku(p, clen) === 'ano');
  let rocne = 0;
  let jednorazove = 0;
  let bezCastky = 0;
  const skupiny = new Map();
  for (const p of polozky) {
    if (!isNum(p.castka_kc)) { bezCastky += 1; continue; }
    const strop = p.strop_id ? stropById[p.strop_id] : null;
    if (strop) {
      if (!skupiny.has(strop.id)) skupiny.set(strop.id, { strop, items: [] });
      skupiny.get(strop.id).items.push(p);
    } else if (jeRocni(p.perioda)) rocne += p.castka_kc;
    else jednorazove += p.castka_kc;
  }
  const stropy = [];
  for (const { strop, items } of skupiny.values()) {
    const sum = items.reduce((a, p) => a + p.castka_kc, 0);
    let uznano = sum;
    if (strop.typ === 'pocet' && isNum(strop.hodnota)) {
      uznano = items.map((p) => p.castka_kc).sort((a, b) => b - a).slice(0, strop.hodnota).reduce((a, b) => a + b, 0);
    } else if (isNum(strop.hodnota)) {
      uznano = Math.min(sum, strop.hodnota);
    }
    if (jeRocni(strop.perioda || 'rok')) rocne += uznano; else jednorazove += uznano;
    stropy.push({ id: strop.id, nazev: strop.nazev, soucet: sum, uznano, orezano: uznano < sum, pocet: items.length });
  }
  return { rocne, jednorazove, bezCastky, polozky, stropy };
}

/** Součet za celou domácnost u jedné pojišťovny + rozpad po členech. */
export function soucetDomacnosti(zp, clenove, opts = {}) {
  const poClenech = (clenove || []).map((clen) => ({ clen, ...soucetClena(zp, clen, opts) }));
  return {
    rocne: poClenech.reduce((a, x) => a + x.rocne, 0),
    jednorazove: poClenech.reduce((a, x) => a + x.jednorazove, 0),
    bezCastky: poClenech.reduce((a, x) => a + x.bezCastky, 0),
    poClenech,
  };
}

/**
 * Řádky tabulky „co lze čerpat“: pro každý příspěvek pojišťovny seznam členů s nárokem.
 * `hlavni` = aspoň jeden člen má nárok; `situacni` = nikdo nárok nemá, ale někdo by ho měl
 * při splnění situace (těhotenství, dárcovství, diagnóza, vybraná profese…).
 */
export function radkyDomacnosti(zp, clenove, { kategorie = null } = {}) {
  const hlavni = [];
  const situacni = [];
  for (const p of zp?.prispevky || []) {
    if (kategorie && p.kategorie !== kategorie) continue;
    const stavy = (clenove || []).map((clen, i) => ({ i, clen, stav: stavNaroku(p, clen) }));
    const ano = stavy.filter((s) => s.stav === 'ano');
    const sit = stavy.filter((s) => s.stav === 'situace');
    if (ano.length) hlavni.push({ prispevek: p, kdo: ano, mozna: sit });
    else if (sit.length) situacni.push({ prispevek: p, kdo: [], mozna: sit });
  }
  return { hlavni, situacni };
}

/** Kategorie, ve kterých má pojišťovna aspoň jeden příspěvek, v pořadí číselníku. */
export function kategorieZp(zp, ciselnik) {
  const ma = new Set((zp?.prispevky || []).map((p) => p.kategorie));
  return (ciselnik || []).filter((k) => ma.has(k.id));
}

/** „1 500 Kč“; bez čísla vrátí text z webu nebo pomlčku. */
export function castkaText(p) {
  if (isNum(p?.castka_kc)) return `${p.castka_kc.toLocaleString('cs-CZ').replace(/ /g, ' ')} Kč`;
  return p?.castka_text || '—';
}

export const PERIODA_TEXT = { rok: 'ročně', jednorazove: 'jednorázově', tehotenstvi: 'za těhotenství', jine: '' };

/** Lidsky čitelné vymezení cílové skupiny z polí kdo.* („ženy 18–39 let, těhotné“). */
export function kdoText(prispevek) {
  const k = prispevek?.kdo || {};
  const kdo = k.pohlavi === 'Z' ? 'ženy' : k.pohlavi === 'M' ? 'muži' : null;
  let vek = null;
  if (isNum(k.vek_od) && isNum(k.vek_do)) vek = k.vek_od === k.vek_do ? `${k.vek_od} let` : `${k.vek_od}–${k.vek_do} let`;
  else if (isNum(k.vek_od)) vek = `od ${k.vek_od} let`;
  else if (isNum(k.vek_do)) vek = `do ${k.vek_do} let`;
  const sit = (Array.isArray(k.situace) ? k.situace : []).map((s) => SITUACE_POPIS[s] || s);
  const parts = [[kdo, vek].filter(Boolean).join(' '), sit.join(' nebo ')].filter(Boolean);
  return parts.join(', ') || 'všichni pojištěnci';
}
