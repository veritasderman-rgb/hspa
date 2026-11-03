// Validátor datasetu data/pojistovny-smluvni-programy.json (inventář programů pro poskytovatele).
// Hlídá strukturu a zdroje; neposuzuje obsah (existence programu není hodnocení).

export const SEGMENTY = ['VPL', 'PLDD', 'AS', 'stomatologie', 'nemocnice', 'lekarna', 'fyzioterapie', 'domaci_pece', 'vice', 'jiny'];
export const KRITERIA = ['kvalita', 'dostupnost', 'e-health', 'prevence', 'ekonomika'];
export const KODY = ['111', '201', '205', '207', '209', '211', '213'];
export const ZDROJ_TYPY = ['web', 'vz'];

const isHttps = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

export function validateSmluvniProgramy(S) {
  const errors = [];
  const warnings = [];
  if (!S || typeof S !== 'object') return { errors: ['dataset není objekt'], warnings };
  if (!isDate(S.stav_k)) errors.push('stav_k: chybí nebo není YYYY-MM-DD');
  if (typeof S._doc !== 'string' || !S._doc) errors.push('_doc: chybí');
  for (const k of SEGMENTY) if (!S.skala?.segmenty?.[k]) errors.push(`skala.segmenty.${k}: chybí popis`);
  for (const k of KRITERIA) if (!S.skala?.kriteria?.[k]) errors.push(`skala.kriteria.${k}: chybí popis`);
  if (!Array.isArray(S.chybi)) errors.push('chybi: musí být pole');

  const zp = Array.isArray(S.pojistovny) ? S.pojistovny : [];
  if (zp.length !== KODY.length) errors.push(`pojistovny: čekáno ${KODY.length}, je ${zp.length}`);
  const kody = zp.map((z) => z.kod);
  if (JSON.stringify(kody) !== JSON.stringify(KODY)) errors.push(`pojistovny: pořadí/kódy musí být ${KODY.join(', ')}`);

  const ids = new Set();
  for (const z of zp) {
    const w = `ZP ${z.kod}`;
    if (!z.zkratka) errors.push(`${w}: chybí zkratka`);
    if (z.web_pro_poskytovatele !== null && !isHttps(z.web_pro_poskytovatele)) errors.push(`${w}: web_pro_poskytovatele musí být https URL nebo null`);
    if (!Array.isArray(z.programy)) { errors.push(`${w}: programy musí být pole`); continue; }
    if (!Array.isArray(z.poznamky)) errors.push(`${w}: poznamky musí být pole`);
    if (z.programy.length === 0) {
      const n = z.nenalezeno;
      if (!n || typeof n.popis !== 'string' || !n.popis) errors.push(`${w}: bez programů chybí nenalezeno.popis`);
      else if (!Array.isArray(n.url) || n.url.length === 0 || !n.url.every(isHttps)) errors.push(`${w}: nenalezeno.url musí být neprázdné pole https URL`);
      if (n && !isDate(n.overeno)) errors.push(`${w}: nenalezeno.overeno chybí`);
    }
    for (const p of z.programy) {
      const pw = `${w} / ${p.id}`;
      if (typeof p.id !== 'string' || !p.id.startsWith(`${z.kod}-`)) errors.push(`${pw}: id musí začínat "${z.kod}-"`);
      if (ids.has(p.id)) errors.push(`${pw}: duplicitní id`);
      ids.add(p.id);
      if (!p.nazev) errors.push(`${pw}: chybí nazev`);
      if (!SEGMENTY.includes(p.segment)) errors.push(`${pw}: neplatný segment "${p.segment}"`);
      if (!Array.isArray(p.kriteria) || p.kriteria.length === 0 || !p.kriteria.every((k) => KRITERIA.includes(k))) errors.push(`${pw}: kriteria musí být neprázdná podmnožina ${KRITERIA.join('|')}`);
      else if (new Set(p.kriteria).size !== p.kriteria.length) errors.push(`${pw}: kriteria se opakují`);
      if (!p.popis) errors.push(`${pw}: chybí popis`);
      if (p.od_roku !== null && !(Number.isInteger(p.od_roku) && p.od_roku >= 1990 && p.od_roku <= 2100)) errors.push(`${pw}: od_roku musí být rok nebo null`);
      if (!isHttps(p.url)) errors.push(`${pw}: url musí být https`);
      if (typeof p.citace !== 'string' || !p.citace.trim()) errors.push(`${pw}: chybí citace`);
      else if (p.citace.length > 200) errors.push(`${pw}: citace delší než 200 znaků (${p.citace.length})`);
      if (!isDate(p.overeno)) errors.push(`${pw}: overeno musí být YYYY-MM-DD`);
      if (!ZDROJ_TYPY.includes(p.zdroj_typ)) errors.push(`${pw}: zdroj_typ musí být web|vz`);
    }
  }
  const vse = zp.flatMap((z) => z.programy || []);
  if (!vse.some((p) => (p.kriteria || []).includes('e-health'))) warnings.push('žádný program s kritériem e-health (viz chybi)');
  return { errors, warnings };
}
