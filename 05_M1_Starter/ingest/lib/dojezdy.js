// Dojezdová analýza: jak daleko je z každé obce nejbližší OTEVŘENÁ pohotovost?
//
// PROČ: „283 pohotovostí ve 14 krajích“ je počet, ne dostupnost. Vyhláška
// č. 380/2025 Sb. předepisuje minimum hodin, ale nikde nestanoví, jak daleko
// smí být nejbližší sloužící pracoviště — a to je přesně to, co člověk
// s nemocným dítětem v sobotu v poledne potřebuje vědět. Tahle analýza to
// měří: pro všech ~6 250 obcí spočítá vzdálenost k nejbližší pohotovosti,
// která má v referenční okamžik podle zveřejněné doby otevřeno.
//
// TŘI REFERENČNÍ OKAMŽIKY (pevná data, žádný není státní svátek):
//   streda_20  středa 20:00  — večer pracovního dne; vyhláška předepisuje
//                              službu v okně 16:00–22:00, tady se testuje realita
//   sobota_12  sobota 12:00  — víkendové poledne; vyhláška předepisuje pevnou
//                              dobu 10:00–16:00, nejsilnější garantované okno
//   sobota_23  sobota 23:00  — noc; vyhláška nic nepředepisuje, slouží jen
//                              nepřetržitá pracoviště — analýza ukazuje, kolik
//                              jich je a jak daleko
// Konkrétní datum je jedno — týdenní rozpisy na datu nezávisí (svátky se
// vyhýbáme volbou dnů) — ale pevné datum drží výstup deterministický.
//
// CO SE POČÍTÁ A CO NE: jen pohotovostní služba podle vyhlášky (LPS pro
// dospělé a pro děti) se známou provozní dobou a polohou. Denní nemocniční
// ambulance, urgentní příjmy ani ZZS se NEzapočítávají — měří se síť
// pohotovostí, ne všechna akutní péče; text stránky to říká. Zubní a
// lékárenská služba se v části krajů střídá podle rozpisu ke konkrétním
// datům, takže by „typická sobota“ byla fikce — proto tu nejsou.
//
// VZDÁLENOST je vzdušnou čarou; po silnici počítejte zhruba 1,3–1,5×.
// Hranice 20 km je ilustrativní volba (žádná norma pro dojezd na LPS
// neexistuje), stránka ji tak popisuje.

import { evaluateStatus, haversineKm } from '../../src/pohotovosti-engine.js';

export const SCENARIOS = [
  { id: 'streda_20', at: '2026-09-09T20:00:00', label: 'středa 20:00' },
  { id: 'sobota_12', at: '2026-09-12T12:00:00', label: 'sobota 12:00' },
  { id: 'sobota_23', at: '2026-09-12T23:00:00', label: 'sobota 23:00' },
];

export const DOJEZD_CATEGORIES = ['lps_dospeli', 'lps_deti'];

export const THRESHOLD_KM = 20;

function median(sorted) {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round1 = (km) => Math.round(km * 10) / 10;

/**
 * @param {Array} places   places z data/pohotovosti.json
 * @param {Array} obce     gazetteer [name, lat, lon, okres, lau]
 * @returns {{ summary, perObec }}
 *   summary  → do data/pohotovosti.json (malé: národní čísla + okresy)
 *   perObec  → do data/dojezdy.json (líně načítaná mapa bílých míst)
 */
export function buildDojezdy(places, obce) {
  // Otevřená pracoviště pro každý scénář × kategorii — spočítat jednou,
  // ne 6 250× (evaluateStatus nad ~300 místy × 6 250 obcí by byl zbytečný
  // řádový rozdíl v čase běhu).
  const openSets = {};
  for (const sc of SCENARIOS) {
    const at = new Date(sc.at);
    for (const cat of DOJEZD_CATEGORIES) {
      openSets[`${sc.id}|${cat}`] = places.filter(p =>
        p.category === cat
        && p.lat != null && p.lon != null
        && p.hours
        && evaluateStatus(p.hours, at).state === 'open');
    }
  }

  const perObec = [];
  const perOkres = new Map(); // okres → { cell → number[] }
  const national = {};
  for (const sc of SCENARIOS) {
    national[sc.id] = {};
    for (const cat of DOJEZD_CATEGORIES) {
      national[sc.id][cat] = { open: openSets[`${sc.id}|${cat}`].length, dists: [] };
    }
  }

  for (const [name, lat, lon, okres] of obce) {
    const origin = { lat, lon };
    const dists = [];
    for (const sc of SCENARIOS) {
      for (const cat of DOJEZD_CATEGORIES) {
        const open = openSets[`${sc.id}|${cat}`];
        let best = Infinity;
        for (const p of open) {
          const d = haversineKm(origin, p);
          if (d < best) best = d;
        }
        const km = best === Infinity ? null : round1(best);
        dists.push(km == null ? null : Math.round(km * 10));
        if (km != null) {
          national[sc.id][cat].dists.push(km);
          const key = okres || '(bez okresu)';
          if (!perOkres.has(key)) perOkres.set(key, {});
          const cell = `${sc.id}|${cat}`;
          (perOkres.get(key)[cell] ??= []).push(km);
        }
      }
    }
    perObec.push([name, okres, dists]);
  }

  const okresy = [...perOkres.entries()].map(([okres, cells]) => {
    const stats = {};
    for (const [cell, arr] of Object.entries(cells)) {
      arr.sort((a, b) => a - b);
      stats[cell] = {
        median: round1(median(arr)),
        max: round1(arr[arr.length - 1]),
        over20: arr.filter(d => d > THRESHOLD_KM).length,
      };
    }
    return { okres, obci: Object.values(cells)[0]?.length ?? 0, stats };
  }).sort((a, b) => a.okres.localeCompare(b.okres, 'cs'));

  for (const sc of SCENARIOS) {
    for (const cat of DOJEZD_CATEGORIES) {
      const n = national[sc.id][cat];
      n.dists.sort((a, b) => a - b);
      national[sc.id][cat] = {
        open: n.open,
        median: round1(median(n.dists)),
        max: round1(n.dists[n.dists.length - 1] ?? 0),
        over20: n.dists.filter(d => d > THRESHOLD_KM).length,
        over30: n.dists.filter(d => d > 30).length,
      };
    }
  }

  const reference = {
    scenarios: SCENARIOS,
    categories: DOJEZD_CATEGORIES,
    threshold_km: THRESHOLD_KM,
    poznamka: 'Vzdálenost vzdušnou čarou k nejbližší pohotovosti otevřené podle zveřejněné doby. Počítá se jen pohotovostní služba podle vyhlášky (LPS dospělí/děti) — ne urgentní příjmy, denní ambulance ani ZZS. Hranice 20 km je ilustrativní, žádná norma dojezd na LPS nestanoví.',
  };

  return {
    summary: { ...reference, national, okresy },
    perObec: { ...reference, obci_total: perObec.length, obce: perObec },
  };
}
