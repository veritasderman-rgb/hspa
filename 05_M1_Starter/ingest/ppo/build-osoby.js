// FÁZE 1 — osoby: profese z titulů, kategorie afiliace, členství, role.
// Vstup: source/ppo_osoby.csv, source/ppo_clenove.csv
// Výstup: out/osoby.json, out/osoby-nezarazene.csv (pro LLM dočištění)
// Spuštění: node ingest/ppo/build-osoby.js

import { readCsv, writeOut, classifyProfession, classifyAffiliation, SKIP_GROUPS } from './lib.js';

const clenove = readCsv('ppo_clenove.csv');
const osobyCsv = readCsv('ppo_osoby.csv');

// Členství na osobu (z clenove.csv — má group_id i roli)
const byPerson = new Map();
for (const c of clenove) {
  const pid = Number(c.person_id);
  if (!byPerson.has(pid)) byPerson.set(pid, []);
  byPerson.get(pid).push({
    group_id: Number(c.group_id),
    role: c.role,
    affiliation: c.affiliation,
  });
}

const ROLE_WEIGHT = { 'Předseda': 3, 'Místopředseda': 2, 'Tajemník': 1.5, 'Členové': 1, 'Hosté': 0.5 };

const osoby = [];
const nezarazene = [];
for (const o of osobyCsv) {
  const pid = Number(o.person_id);
  const memberships = (byPerson.get(pid) || [])
    .filter(m => !SKIP_GROUPS.has(m.group_id) || true); // členství v komisi 66 zůstává viditelné
  const affAll = [...new Set(memberships.map(m => m.affiliation).filter(Boolean))];
  const prof = classifyProfession(o.person_name, affAll.join(' ; '));
  const affCat = classifyAffiliation(affAll.join(' ; '));
  // Zaměstnanec MZd (vč. jiných ministerstev) — sedí ve skupinách z titulu
  // funkce; žebříčky se proto vedou i BEZ nich (viz PLAN-PPO.md §4.3):
  // zajímavější než úředník všude je externista „všude nasáčkovaný bez funkce".
  const urednik = affCat === 'mz_urednik' || affCat === 'jine_ministerstvo';
  const vlivScore = memberships.reduce((s, m) => s + (ROLE_WEIGHT[m.role] ?? 1), 0);
  osoby.push({
    id: pid,
    jmeno: o.person_name,
    profese: prof,
    afiliace_kategorie: affCat,
    urednik_ministerstva: urednik,
    afiliace: affAll.slice(0, 5),
    clenstvi: memberships.map(m => ({ g: m.group_id, role: m.role })),
    pocet_clenstvi: memberships.length,
    pocet_predsednictvi: memberships.filter(m => m.role === 'Předseda').length,
    vliv_role_score: Math.round(vlivScore * 10) / 10,
    url: `https://ppo.mzcr.cz/person/${pid}`,
  });
  if (affCat === 'nezarazeno' || prof === 'bez_titulu') {
    nezarazene.push({ pid, jmeno: o.person_name, prof, affCat, aff: affAll.join(' | ') });
  }
}

osoby.sort((a, b) => b.vliv_role_score - a.vliv_role_score || b.pocet_clenstvi - a.pocet_clenstvi);
const top = (list, n = 25) => list.slice(0, n).map(o => o.id);
writeOut('osoby.json', {
  version: '1.0',
  zdroj: 'https://ppo.mzcr.cz',
  pocet: osoby.length,
  zebricky: {
    celkovy: top(osoby),
    bez_uredniku: top(osoby.filter(o => !o.urednik_ministerstva)),
    bez_uredniku_a_statnich: top(osoby.filter(o =>
      !o.urednik_ministerstva && o.afiliace_kategorie !== 'statni_instituce')),
  },
  osoby,
});

const csv = ['person_id,jmeno,profese,afiliace_kategorie,afiliace']
  .concat(nezarazene.map(n =>
    `${n.pid},"${n.jmeno.replaceAll('"', '""')}",${n.prof},${n.affCat},"${n.aff.replaceAll('"', '""')}"`))
  .join('\n');
writeOut('osoby-nezarazene.csv', csv);
console.log(`osob: ${osoby.length}, k dočištění LLM: ${nezarazene.length}`);
