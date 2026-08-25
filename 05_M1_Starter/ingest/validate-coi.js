// Validátor data/ppo-coi.json podle PROMPT_STRET_ZAJMU_ROUTINE.md §4/§9.
// Hlídá důkazní nároky: co nemá zdroj, do výstupu nepatří.
// Spuštění: node ingest/validate-coi.js (součást npm run validate:all)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validateCoi(coi, ppo) {
  const chyby = [];
  const skupinyById = new Map(ppo.skupiny.map(s => [s.id, s]));

  for (const o of coi.osoby) {
    for (const v of o.vazby) {
      if (!v.zdroj_url) chyby.push(`osoba ${o.id}: vazba „${v.subjekt}" bez zdroj_url`);
      if (!v.overeno_dne) chyby.push(`osoba ${o.id}: vazba „${v.subjekt}" bez overeno_dne`);
      if (!v.ico) chyby.push(`osoba ${o.id}: vazba „${v.subjekt}" bez IČO`);
    }
    // stupeň 2+ musí nést doklad, proč se překryv tvrdí
    for (const r of o.relevance) {
      if (r.stupen >= 2 && !(r.doklad && r.doklad.cit)) {
        chyby.push(`osoba ${o.id}: relevance na g${r.g} (stupeň ${r.stupen}) bez dokladu`);
      }
      if (!r.pravidla?.length) chyby.push(`osoba ${o.id}: relevance na g${r.g} bez id pravidla`);
      if (!skupinyById.has(r.g)) chyby.push(`osoba ${o.id}: relevance na neznámý orgán g${r.g}`);
      // FÁZE 1 nesmí tvrdit stupeň 3+ — ten vyžaduje párování na rozhodnutí
      if (r.stupen >= 3) {
        chyby.push(`osoba ${o.id}: stupeň ${r.stupen} ve fázi 1 (vyžaduje doklad z jednání, viz fáze 3)`);
      }
    }
    // neověřená identita nesmí nést relevanci ani vstupovat do statistik
    if (!o.overeno && o.relevance.length) {
      chyby.push(`osoba ${o.id}: neověřená identita, ale nese relevanci`);
    }
    // stupeň 2 je RELEVANTNÍ VAZBA — bez doložené vazby (stupeň 1) nesmí vzniknout
    if (o.relevance.length && !o.vazby.length) {
      chyby.push(`osoba ${o.id}: relevance (stupeň 2) bez jediné doložené vazby (stupeň 1)`);
    }
    // R4 stojí na obchodní vazbě VE ZDRAVOTNICTVÍ — jinak by označovalo
    // vodárny a sportovní kluby (nález na PR #1085)
    if (o.relevance.some(r => r.pravidla?.includes('R4'))
      && !o.vazby.some(v => v.typ_subjektu === 'obchodni' && v.obor_zdravotnictvi)) {
      chyby.push(`osoba ${o.id}: R4 bez obchodní vazby působící ve zdravotnictví`);
    }
  }

  // statistiky musí sedět na data (žádné ručně dopsané číslo)
  const ov = coi.osoby.filter(o => o.overeno);
  const kontroly = [
    ['identita_overena', coi.pokryti.identita_overena, ov.length],
    ['s_profilem', coi.pokryti.s_profilem, coi.osoby.length],
    ['osob_s_vazbou', coi.souhrn.osob_s_vazbou, ov.filter(o => o.vazby.length).length],
    ['osob_s_relevantni_vazbou', coi.souhrn.osob_s_relevantni_vazbou,
      new Set(ov.filter(o => o.relevance.length).map(o => o.id)).size],
    ['organu_celkem', coi.souhrn.organu_celkem, ppo.skupiny.length],
  ];
  for (const [nazev, uvedeno, spocteno] of kontroly) {
    if (uvedeno !== spocteno) chyby.push(`souhrn.${nazev}: uvedeno ${uvedeno}, spočteno ${spocteno}`);
  }

  // jmenovatel se musí dát dohledat u každého orgánu
  for (const s of coi.skupiny) {
    if (s.clenu_overeno > s.clenu_s_profilem || s.clenu_s_profilem > s.clenu) {
      chyby.push(`g${s.g}: nesmyslné pokrytí ${s.clenu_overeno}/${s.clenu_s_profilem}/${s.clenu}`);
    }
    if (s.s_relevantni_vazbou > s.clenu_overeno) {
      chyby.push(`g${s.g}: relevantních (${s.s_relevantni_vazbou}) víc než ověřených (${s.clenu_overeno})`);
    }
    if (s.ma_pravidlo_ve_statutu && !s.pravidlo_doklad?.url) {
      chyby.push(`g${s.g}: tvrdí pravidlo ve statutu bez odkazu na dokument`);
    }
  }

  // metodika musí nést limity — bez nich se čísla nesmí publikovat
  if (!(coi.metodika?.limity?.length >= 4)) chyby.push('metodika: chybí výčet limitů dat');
  if (!coi.metodika?.klicove_pravidlo) chyby.push('metodika: chybí klíčové pravidlo (střet zájmů není obvinění)');

  return chyby;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const p = path.join(ROOT, 'data', 'ppo-coi.json');
  if (!fs.existsSync(p)) {
    console.log('data/ppo-coi.json neexistuje — přeskakuji (spusť npm run build:coi)');
    process.exit(0);
  }
  const coi = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
  const chyby = validateCoi(coi, ppo);
  if (chyby.length) {
    console.error(`✗ ppo-coi.json — ${chyby.length} chyb:`);
    for (const c of chyby.slice(0, 30)) console.error('  · ' + c);
    process.exit(1);
  }
  console.log(`OK: ppo-coi.json — ${coi.pokryti.identita_overena} ověřených osob, `
    + `${coi.skupiny.length} orgánů, každá vazba se zdrojem a datem.`);
}
