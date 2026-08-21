// FÁZE 1 — kalendář aktivity: měsíční heatmapa jednání celého portálu
// + řada dat jednání na skupinu (pro sparkliny na hubu).
// Vstup: source/ppo_dokumenty.csv (nebo korpus, když existuje)
// Výstup: out/kalendar.json
// Spuštění: node ingest/ppo/build-kalendar.js

import { readCsv, readKorpusIndex, writeOut, SKIP_GROUPS } from './lib.js';

const korpus = readKorpusIndex();
const dparse = (s) => {
  const m = s.match(/(\d{1,2})[.\- ]\s?(\d{1,2})[.\- ]\s?(20\d{2})/);
  if (m && +m[1] <= 31 && +m[2] <= 12)
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return null;
};
const isJednani = t => /z[áa]pis|pozv[áa]nka|usnesen|\bprogram\b/i.test(t);

let events = []; // {gid, date}
if (korpus) {
  events = korpus
    .filter(r => ['zapis', 'pozvanka', 'usneseni', 'program'].includes(r.doctype)
              && r.date && r.date.length === 10)
    .map(r => ({ gid: r.group_id, date: r.date }));
} else {
  events = readCsv('ppo_dokumenty.csv')
    .filter(d => isJednani(d.titul))
    .map(d => ({ gid: Number(d.group_id), date: dparse(d.titul + ' ' + d.url) }))
    .filter(e => e.date);
}
events = events.filter(e => !SKIP_GROUPS.has(e.gid));

// dedup: skupina + datum = jedno jednání
const seen = new Set();
events = events.filter(e => {
  const k = e.gid + '|' + e.date;
  if (seen.has(k)) return false;
  seen.add(k); return true;
});

const mesice = {};
const poSkupine = {};
for (const e of events) {
  const m = e.date.slice(0, 7);
  mesice[m] = (mesice[m] || 0) + 1;
  if (!poSkupine[e.gid]) poSkupine[e.gid] = [];
  poSkupine[e.gid].push(e.date);
}
for (const g of Object.keys(poSkupine)) poSkupine[g].sort();

writeOut('kalendar.json', {
  version: '1.0',
  pozn: 'Jednání = unikátní (skupina, datum) ze zápisů/pozvánek/usnesení/programů.',
  jednani_celkem: events.length,
  mesice: Object.fromEntries(Object.entries(mesice).sort()),
  po_skupine: poSkupine,
});
console.log(`jednání celkem: ${events.length}, měsíců s aktivitou: ${Object.keys(mesice).length}`);
