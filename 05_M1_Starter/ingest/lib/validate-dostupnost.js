// Validátor data/pojistovny-dostupnost.json (balíčky A3.1 a A3.3 plánu PLAN-SROVNAVAC-ANALYTIK.md):
// inventář, co pojišťovny publikují o dostupnosti péče (5 sloupců × 7 ZP).
// Čistá funkce bez diskových zápisů; ověření citací proti textům VZ dělá tests/pojistovny-dostupnost-data.test.js.

export const KODY_ZP = ['111', '201', '205', '207', '209', '211', '213'];
export const SLOUPCE = ['cekaci_doby', 'sit_nedostatkove', 'zajisteni_pece', 'lhuty_307', 'par16'];
export const STAVY = ['ano', 'castecne', 'ne'];
export const MAX_CITACE = 200;
export const CITACE_TYPY = ['text', 'prepis-z-obrazku'];

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function validateDostupnost(D) {
  const errors = [];
  const warnings = [];
  const ok = (cond, msg) => { if (!cond) errors.push(msg); return !!cond; };
  const T = 'pojistovny-dostupnost.json';
  if (!ok(isObj(D), `${T}: chybí nebo není objekt`)) return { errors, warnings };
  for (const f of ['version', 'generated_at', 'stav_k', '_doc', 'skala', 'sloupce', 'pojistovny', 'srovnatelnost', 'chybi']) {
    ok(D[f] != null, `${T} root: missing '${f}'`);
  }
  if (D.stav_k != null) ok(isDate(D.stav_k), `${T}.stav_k: formát RRRR-MM-DD`);
  if (isObj(D.skala)) for (const s of STAVY) ok(isStr(D.skala[s]), `${T}.skala.${s}: chybí popis`);
  if (Array.isArray(D.sloupce)) {
    ok(D.sloupce.length === SLOUPCE.length && SLOUPCE.every((id, i) => D.sloupce[i]?.id === id), `${T}.sloupce: musí být ${SLOUPCE.join(', ')} v tomto pořadí`);
    for (const c of D.sloupce) for (const f of ['id', 'nazev', 'popis', 'pravni_zaklad']) ok(isStr(c?.[f]), `${T}.sloupce[${c?.id ?? '?'}].${f}: chybí`);
  }
  for (const f of ['srovnatelnost', 'chybi']) {
    if (D[f] != null) ok(Array.isArray(D[f]) && D[f].length > 0 && D[f].every(isStr), `${T}.${f}: neprázdné pole stringů`);
  }
  if (!ok(Array.isArray(D.pojistovny), `${T}.pojistovny: musí být pole`)) return { errors, warnings };
  ok(D.pojistovny.length === KODY_ZP.length, `${T}: musí být ${KODY_ZP.length} pojišťoven (je ${D.pojistovny.length})`);
  const seen = new Set();
  for (const p of D.pojistovny) {
    const tag = `${T} ZP ${p?.kod ?? '?'}`;
    ok(KODY_ZP.includes(p?.kod), `${tag}: neznámý kód`);
    ok(!seen.has(p?.kod), `${tag}: duplicitní kód`);
    seen.add(p?.kod);
    ok(isStr(p?.zkratka), `${tag}: chybí zkratka`);
    if (p?.poznamky != null) ok(Array.isArray(p.poznamky) && p.poznamky.every(isStr), `${tag}.poznamky: pole stringů`);
    for (const col of SLOUPCE) {
      const c = p?.[col];
      const ct = `${tag}.${col}`;
      if (!ok(isObj(c), `${ct}: chybí buňka`)) continue;
      if (c.stav === null) { warnings.push(`${ct}: stav null (nezjištěno)`); continue; }
      if (!ok(STAVY.includes(c.stav), `${ct}.stav: ${STAVY.join(' | ')} | null (je '${c.stav}')`)) continue;
      ok(isStr(c.co), `${ct}.co: chybí popis, co přesně se publikuje (nebo kde se hledalo)`);
      ok(Number.isInteger(c.rok) && c.rok >= 2015 && c.rok <= 2030, `${ct}.rok: celé číslo`);
      ok(isDate(c.overeno), `${ct}.overeno: formát RRRR-MM-DD`);
      const hasUrl = c.url != null;
      const hasFile = c.soubor != null || c.radek != null;
      if (hasUrl) ok(typeof c.url === 'string' && /^https:\/\//.test(c.url), `${ct}.url: musí začínat https://`);
      if (hasFile) ok(isStr(c.soubor) && Number.isInteger(c.radek) && c.radek >= 1, `${ct}: soubor a radek (celé číslo ≥ 1) patří k sobě`);
      if (c.citace != null) {
        ok(isStr(c.citace) && c.citace.length <= MAX_CITACE, `${ct}.citace: neprázdný string do ${MAX_CITACE} znaků`);
      }
      if (c.citace_typ != null) ok(CITACE_TYPY.includes(c.citace_typ), `${ct}.citace_typ: ${CITACE_TYPY.join(' | ')} (výchozí text)`);
      if (c.citace_typ === 'prepis-z-obrazku') ok(hasUrl && !hasFile, `${ct}: přepis z obrázku patří k url, ne k souboru VZ`);
      if (c.stav === 'ano' || c.stav === 'castecne') {
        ok(hasUrl || (isStr(c.soubor) && Number.isInteger(c.radek)), `${ct}: stav ${c.stav} vyžaduje url nebo soubor + radek`);
        ok(isStr(c.citace), `${ct}: stav ${c.stav} vyžaduje citaci`);
      }
    }
  }
  for (const k of KODY_ZP) ok(seen.has(k), `${T}: chybí ZP ${k}`);
  return { errors, warnings };
}
