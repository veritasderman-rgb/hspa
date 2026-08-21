// FÁZE 1 — skupiny: metadata, role, profesní mix, dokumenty, kadence jednání.
// Vstup: source/ppo_data.json, source/ppo_dokumenty.csv,
//        volitelně source/ppo_korpus_full.jsonl.gz (přesnější datace+typy)
// Výstup: out/skupiny.json
// Spuštění: node ingest/ppo/build-skupiny.js

import { readJson, readCsv, readKorpusIndex, writeOut,
         classifyProfession, SKIP_GROUPS } from './lib.js';

const data = readJson('ppo_data.json');
const dokumenty = readCsv('ppo_dokumenty.csv');
const korpus = readKorpusIndex(); // null dokud neexistuje plný korpus

/* -- klasifikace dokumentu z titulku (stejná logika jako extract, zrcadlo) -- */
const DT = [
  ['zapis', /z[áa]pis/i], ['usneseni', /usnesen/i], ['pozvanka', /pozv[áa]nka/i],
  ['program', /\bprogram\b/i], ['statut', /statut/i], ['jednaci_rad', /jednac[íi]/i],
  ['prezencni', /prezen[cč]n/i], ['stanovisko', /stanovisk/i],
  ['vyrocni_zprava', /v[ýy]ro[čc]n[íi]/i], ['prezentace', /prezentace|\.ppt/i],
];
const doctype = t => (DT.find(([, re]) => re.test(t)) || ['jine'])[0];

const dparse = (s) => {
  let m = s.match(/(\d{1,2})[.\- ]\s?(\d{1,2})[.\- ]\s?(20\d{2})/);
  if (m && +m[1] <= 31 && +m[2] <= 12)
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  m = s.match(/(20\d{2})/);
  return m ? m[1] : null;
};

// Dokumenty po skupinách (korpus má přednost — přesnější, včetně vnořených)
const docsByGroup = new Map();
const push = (gid, d) => {
  if (!docsByGroup.has(gid)) docsByGroup.set(gid, []);
  docsByGroup.get(gid).push(d);
};
if (korpus) {
  for (const r of korpus) {
    if (r.method === 'container') continue;
    push(r.group_id, { title: r.title, url: r.url, date: r.date,
                       doctype: r.doctype, chars: r.chars, doc_id: r.doc_id });
  }
} else {
  for (const d of dokumenty) {
    push(Number(d.group_id), { title: d.titul, url: d.url,
      date: dparse(d.titul + ' ' + d.url), doctype: doctype(d.titul) });
  }
}

const skupiny = [];
for (const g of data.groups) {
  const docs = docsByGroup.get(g.id) || [];
  const analyzovano = !SKIP_GROUPS.has(g.id);

  // kadence: počty jednání (zápis ∪ pozvánka na stejné datum počítat 1×)
  const jednani = new Map(); // date -> {zapis, pozvanka}
  for (const d of docs) {
    if (!['zapis', 'pozvanka', 'usneseni', 'program'].includes(d.doctype)) continue;
    if (!d.date || d.date.length < 10) continue;
    if (!jednani.has(d.date)) jednani.set(d.date, { zapis: false });
    if (d.doctype === 'zapis' || d.doctype === 'usneseni') jednani.get(d.date).zapis = true;
  }
  const roky = {};
  for (const [date] of jednani) {
    const y = date.slice(0, 4);
    roky[y] = (roky[y] || 0) + 1;
  }
  const dates = [...jednani.keys()].sort();
  const posledni = dates.at(-1) ?? docs.map(d => d.date).filter(Boolean).sort().at(-1) ?? null;

  const roleCount = {};
  const profese = {};
  for (const m of g.members) {
    roleCount[m.role] = (roleCount[m.role] || 0) + 1;
    const p = classifyProfession(m.name, m.affiliation || '');
    profese[p] = (profese[p] || 0) + 1;
  }
  const predseda = g.members.find(m => m.role === 'Předseda');

  const mesicuOdAktivity = posledni
    ? Math.round((Date.now() - new Date(posledni.length === 4 ? posledni + '-12-31' : posledni)) / 2.63e9)
    : null;

  skupiny.push({
    id: g.id,
    nazev: g.name,
    gesce: g.sectionUnit,
    sekce: g.info?.['Sekce'] ?? null,
    utvar: g.info?.['Útvar'] ?? null,
    ucel: g.info?.['Účel zřízení'] ?? null,
    predmet: (g.info?.['Předmět činnosti'] ?? '').slice(0, 600) || null,
    zrizeni: g.info?.['Datum zřízení'] ?? null,
    predseda: predseda ? { id: predseda.personId, jmeno: predseda.name } : null,
    pocet_clenu: g.members.length,
    role: roleCount,
    profese,
    dokumenty_celkem: docs.length,
    dokumenty_typy: docs.reduce((a, d) => (a[d.doctype] = (a[d.doctype] || 0) + 1, a), {}),
    jednani_roky: roky,
    jednani_celkem: dates.length,
    posledni_aktivita: posledni,
    stav: !analyzovano ? 'vynechano'
      : mesicuOdAktivity == null ? 'bez_dokumentu'
      : mesicuOdAktivity <= 12 ? 'aktivni'
      : mesicuOdAktivity <= 24 ? 'utlum' : 'spici',
    analyzovano,
    url: `https://ppo.mzcr.cz/group/${g.id}`,
  });
}

skupiny.sort((a, b) => b.jednani_celkem - a.jednani_celkem);
writeOut('skupiny.json', {
  version: '1.0',
  zdroj: 'https://ppo.mzcr.cz',
  korpus_pouzit: Boolean(korpus),
  pocet: skupiny.length,
  skupiny,
});
console.log(`skupin: ${skupiny.length}; stavy:`,
  JSON.stringify(skupiny.reduce((a, s) => (a[s.stav] = (a[s.stav] || 0) + 1, a), {})));
