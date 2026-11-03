// Validátor data/pojistovny-prerozdeleni.json (balíček A1.2). Čistá funkce, nic nečte z disku.
//
//   validatePrerozdeleni(P, opts) → { errors: string[], warnings: string[] }
//
// Kontroly: 7 ZP se správnými kódy · měsíce souvislé a stejně dlouhé řady · vybrano > 0 (kde není null) ·
// Σ 7 ZP = řádek „Celkem“ ±2 tis. Kč měsíčně (vybrano i po_prerozdeleni) · rozdil = po − vybrano ·
// roční součty odpovídají měsíčním a mají 12 měsíců · Σ saldo_relativni_mld za rok = 0 (±0,001 mld. Kč) a
// Σ měsíčních rozdil_relativni = 0 (±2 tis. Kč) · posledni_rok_rocni = poslední rok s 12 měsíci · Σ složek
// (riziková + plátcová) = saldo_relativni_mld ±0,001 · okno výběru 12/(Y−1)–11/Y · posunutý součet výběru
// (sloupce 2/Y až 1/Y+1) = „výběr“ v Tab. 1 MZ Hodnocení (data/pojistovny-hospodareni-rady.json,
// pojistne_pred_prerozdelenim_mld; předává se v opts.rady) ±0,1 % jako chyba.

export const KODY = ['111', '201', '205', '207', '209', '211', '213'];
const TOL_TIS = 2;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const sum = (a) => a.reduce((x, y) => x + y, 0);

export function validatePrerozdeleni(P, opts = {}) {
  const errors = [];
  const warnings = [];
  const e = (s) => errors.push(s);
  const w = (s) => warnings.push(s);
  const hosp = opts.rady ?? null;

  if (!P || typeof P !== 'object') return { errors: ['dataset chybí'], warnings };
  const mesice = P.mesice;
  if (!Array.isArray(mesice) || !mesice.length) return { errors: ['mesice[] chybí'], warnings };

  // měsíce souvislé
  mesice.forEach((m, i) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) { e(`mesice[${i}] „${m}“ není RRRR-MM`); return; }
    if (i > 0) {
      const [y0, m0] = mesice[i - 1].split('-').map(Number);
      const [y1, m1] = m.split('-').map(Number);
      if ((y1 * 12 + m1) - (y0 * 12 + m0) !== 1) e(`mesice: mezera/duplicita mezi ${mesice[i - 1]} a ${m}`);
    }
  });
  const N = mesice.length;
  if (P.posledni_mesic !== mesice[N - 1]) e(`posledni_mesic ${P.posledni_mesic} ≠ ${mesice[N - 1]}`);

  // 7 ZP
  const zp = Array.isArray(P.pojistovny) ? P.pojistovny : [];
  const kody = zp.map((z) => z.kod);
  if (zp.length !== 7 || KODY.some((k) => !kody.includes(k))) e(`pojistovny: očekáváno ${KODY.join(', ')}, je ${kody.join(', ') || 'nic'}`);
  const rady = ['vybrano', 'po_prerozdeleni', 'rozdil'];
  const radky = [...zp.map((z) => ({ id: z.kod, o: z })), { id: 'celkem', o: P.celkem ?? {} }];
  for (const { id, o } of radky) {
    for (const r of rady) {
      if (!Array.isArray(o[r]) || o[r].length !== N) { e(`${id}.${r}: délka ${o[r]?.length} ≠ ${N} měsíců`); continue; }
      o[r].forEach((v, i) => { if (v !== null && !isNum(v)) e(`${id}.${r}[${i}] není číslo ani null`); });
    }
    if (Array.isArray(o.vybrano)) o.vybrano.forEach((v, i) => { if (v !== null && !(v > 0)) e(`${id}.vybrano ${mesice[i]}: ${v} není > 0`); });
    if (Array.isArray(o.vybrano) && Array.isArray(o.po_prerozdeleni) && Array.isArray(o.rozdil)) {
      o.vybrano.forEach((v, i) => {
        const p = o.po_prerozdeleni[i];
        const exp = isNum(v) && isNum(p) ? p - v : null;
        if (o.rozdil[i] !== exp) e(`${id}.rozdil ${mesice[i]}: ${o.rozdil[i]} ≠ po − vybráno (${exp})`);
      });
    }
  }

  // Σ 7 ZP = celkem ±2 tis. Kč
  for (const r of ['vybrano', 'po_prerozdeleni']) {
    if (!P.celkem?.[r]) continue;
    for (let i = 0; i < N; i++) {
      const v = zp.map((z) => z[r]?.[i]);
      if (v.some((x) => !isNum(x))) { if (v.some(isNum)) e(`${r} ${mesice[i]}: u části pojišťoven chybí hodnota`); continue; }
      const c = P.celkem[r][i];
      if (!isNum(c) || Math.abs(sum(v) - c) > TOL_TIS) e(`${r} ${mesice[i]}: Σ 7 ZP ${sum(v)} ≠ celkem ${c} (±${TOL_TIS} tis. Kč)`);
    }
  }

  // roční řádky
  const roky = [...new Set(mesice.map((m) => m.slice(0, 4)))];
  const radkyRocne = [...zp.map((z) => ({ id: z.kod, o: z })), { id: 'celkem', o: P.celkem ?? {} }];
  for (const { id, o } of radkyRocne) {
    if (!o.rocne || typeof o.rocne !== 'object') { e(`${id}.rocne chybí`); continue; }
    for (const rok of roky) {
      const r = o.rocne[rok];
      if (!r) { e(`${id}.rocne[${rok}] chybí`); continue; }
      const idx = mesice.map((m, i) => (m.startsWith(rok) ? i : -1)).filter((i) => i >= 0);
      if (r.mesicu !== idx.length) e(`${id}.rocne[${rok}].mesicu ${r.mesicu} ≠ ${idx.length}`);
      const uplny = idx.length === 12 && ['vybrano', 'po_prerozdeleni'].every((k) => idx.every((i) => isNum(o[k]?.[i])));
      if (!uplny) {
        for (const k of ['vybrano_mld', 'po_prerozdeleni_mld', 'rozdil_mld', 'saldo_relativni_mld', 'saldo_relativni_pct_vybraneho']) {
          if (r[k] !== null && r[k] !== undefined) e(`${id}.rocne[${rok}].${k}: neúplný rok musí mít null`);
        }
        continue;
      }
      const exp = (k) => sum(idx.map((i) => o[k][i])) / 1e6;
      if (Math.abs(r.vybrano_mld - exp('vybrano')) > 0.0006) e(`${id}.rocne[${rok}].vybrano_mld ${r.vybrano_mld} ≠ Σ měsíců ${exp('vybrano').toFixed(3)}`);
      if (Math.abs(r.po_prerozdeleni_mld - exp('po_prerozdeleni')) > 0.0006) e(`${id}.rocne[${rok}].po_prerozdeleni_mld ${r.po_prerozdeleni_mld} ≠ Σ měsíců`);
      if (Math.abs(r.rozdil_mld - (r.po_prerozdeleni_mld - r.vybrano_mld)) > 0.0015) e(`${id}.rocne[${rok}].rozdil_mld nesedí na po − vybráno`);
      if (id !== 'celkem') {
        if (!isNum(r.saldo_relativni_mld)) e(`${id}.rocne[${rok}].saldo_relativni_mld chybí`);
        else if (isNum(r.vybrano_mld) && Math.abs(r.saldo_relativni_pct_vybraneho - (r.saldo_relativni_mld / r.vybrano_mld) * 100) > 0.006) e(`${id}.rocne[${rok}].saldo_relativni_pct_vybraneho nesedí`);
      }
    }
  }

  // Σ relativních sald = 0
  for (const rok of roky) {
    const r = zp.map((z) => z.rocne?.[rok]);
    if (r.every((x) => x && isNum(x.saldo_relativni_mld))) {
      const s = sum(r.map((x) => x.saldo_relativni_mld));
      if (Math.abs(s) > 0.001) e(`Σ saldo_relativni_mld ${rok} = ${s.toFixed(4)} mld. Kč, má být 0 (±0,001)`);
    } else if (r.some((x) => x && isNum(x.saldo_relativni_mld))) e(`saldo_relativni_mld ${rok}: u části pojišťoven chybí`);
  }
  for (let i = 0; i < N; i++) {
    const v = zp.map((z) => z.rozdil_relativni?.[i]);
    if (v.some((x) => x === undefined)) { e(`rozdil_relativni: chybí řada nebo délka ≠ ${N}`); break; }
    if (v.every(isNum)) { const s = sum(v); if (Math.abs(s) > TOL_TIS) e(`Σ rozdil_relativni ${mesice[i]} = ${s.toFixed(1)} tis. Kč, má být 0 (±${TOL_TIS})`); }
    else if (v.some(isNum)) e(`rozdil_relativni ${mesice[i]}: u části pojišťoven chybí`);
  }
  {
    const uplne = roky.filter((y) => mesice.filter((m) => m.startsWith(y)).length === 12);
    const exp = uplne.length ? Number(uplne[uplne.length - 1]) : null;
    if (P.posledni_rok_rocni !== exp) e(`posledni_rok_rocni ${P.posledni_rok_rocni} ≠ ${exp}`);
  }

  // okno výběru a složky salda
  for (const z of zp) {
    for (const rok of roky) {
      const r = z.rocne?.[rok];
      if (!r) continue;
      const exp = r.mesicu === 12 ? `12/${Number(rok) - 1}–11/${rok}` : null;
      if (r.okno_vyberu !== exp) e(`${z.kod}.rocne[${rok}].okno_vyberu ${r.okno_vyberu} ≠ ${exp}`);
      const a1 = r.slozka_rizikova_mld;
      const a2 = r.slozka_platcova_mld;
      if ((a1 === null) !== (a2 === null)) e(`${z.kod}.rocne[${rok}]: složky salda musí být obě nebo žádná`);
      else if (a1 !== null && Math.abs(a1 + a2 - r.saldo_relativni_mld) > 0.001) e(`${z.kod}.rocne[${rok}]: slozka_rizikova + slozka_platcova ${(a1 + a2).toFixed(4)} ≠ saldo_relativni_mld ${r.saldo_relativni_mld}`);
    }
  }
  for (const rok of roky) {
    const sl = zp.map((z) => z.rocne?.[rok]?.slozka_rizikova_mld);
    if (sl.every(isNum)) { const s = sum(sl); if (Math.abs(s) > 0.001) e(`Σ slozka_rizikova_mld ${rok} = ${s.toFixed(4)}, má být 0`); }
  }

  // posunutý součet výběru (sloupce 2/Y až 1/Y+1 = výběr za kalendářní rok Y) vs. Tab. 1 MZ Hodnocení
  const tab1 = hosp?.cr?.rady?.pojistne_pred_prerozdelenim_mld;
  if (tab1) {
    for (const [rok, o] of Object.entries(tab1)) {
      const od = mesice.indexOf(`${rok}-02`);
      const doo = mesice.indexOf(`${Number(rok) + 1}-01`);
      const ref = o?.hodnota;
      if (od < 0 || doo < 0 || !isNum(ref)) continue;
      const v = zp.map((z) => z.vybrano.slice(od, doo + 1));
      if (v.some((a) => a.some((x) => !isNum(x)))) continue;
      const mine = sum(v.map(sum)) / 1e6;
      const dif = (mine / ref - 1) * 100;
      if (Math.abs(dif) > 0.1) e(`výběr za rok ${rok} (sloupce 2/${rok}–1/${Number(rok) + 1}): Σ 7 ZP ${mine.toFixed(3)} mld vs Tab. 1 MZ ${ref.toFixed(3)} mld (${dif.toFixed(2)} %) — mimo ±0,1 %`);
    }
  }
  return { errors, warnings };
}
