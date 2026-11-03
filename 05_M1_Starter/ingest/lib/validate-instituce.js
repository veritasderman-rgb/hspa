// Validace data/pojistovny-instituce.json (balíček A2.1 PLAN-SROVNAVAC-ANALYTIK.md).
// Čistá funkce: validateInstituce(I) -> { errors, warnings }. Bez I/O.
//
// Hlídá: 7 ZP s unikátními kódy, enumy (puvod, zakon.cislo), VZP podle 551/1991 a zaměstnanecké podle 280/1992,
// součet obsazeni[].pocet = pocet u každé rady, zdroj u každého pole (citace + paragraf nebo výroční zpráva,
// URL musí být uvedena v zdroje[]), stav_k jako datum, zákaz klíčů s osobními údaji (jmeno, prijmeni, osoby, ...).

export const KODY = ['111', '201', '205', '207', '209', '211', '213'];
export const PUVODY = ['statni', 'resortni', 'podnikova', 'oborova'];
export const DATUM_TYPY = ['zapis_or', 'zrizovaci_listina', 'rozhodnuti_mpsv', 'zakon'];
export const ZAKONY = ['551/1991 Sb.', '280/1992 Sb.'];
export const ZAKAZANE_KLICE = ['jmeno', 'prijmeni', 'osoby', 'osoba', 'clenove', 'predseda', 'mistopredseda'];

const RE_DATUM = /^\d{4}-\d{2}-\d{2}$/;
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isInt = (v) => Number.isInteger(v);
const isHttps = (v) => typeof v === 'string' && /^https:\/\/\S+$/.test(v);

function zakazaneKlice(o, path, errors) {
  if (Array.isArray(o)) { o.forEach((x, i) => zakazaneKlice(x, `${path}[${i}]`, errors)); return; }
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (ZAKAZANE_KLICE.includes(k.toLowerCase())) errors.push(`${path}.${k}: klíč s osobními údaji není v datasetu povolen (jména členů orgánů jsou třída C)`);
      zakazaneKlice(v, `${path}.${k}`, errors);
    }
  }
}

export function validateInstituce(I) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  if (!I || typeof I !== 'object') return { errors: ['kořen není objekt'], warnings };

  if (!isStr(I.version)) err('version chybí');
  if (!isStr(I.generated_at) || Number.isNaN(Date.parse(I.generated_at))) err('generated_at není ISO datum');
  if (!isStr(I.stav_k) || !RE_DATUM.test(I.stav_k)) err('stav_k musí být datum RRRR-MM-DD');
  if (!isStr(I._doc)) err('_doc chybí');

  // zdroje[]
  const urlZdroju = new Set();
  const idZdroju = new Set();
  if (!Array.isArray(I.zdroje) || I.zdroje.length === 0) err('zdroje[] chybí');
  for (const [i, z] of (I.zdroje || []).entries()) {
    const p = `zdroje[${i}]`;
    if (!isStr(z.id)) err(`${p}.id chybí`);
    else if (idZdroju.has(z.id)) err(`${p}.id duplicitní: ${z.id}`);
    else idZdroju.add(z.id);
    if (!isStr(z.nazev)) err(`${p}.nazev chybí`);
    if (!isHttps(z.url)) err(`${p}.url musí být https`);
    else urlZdroju.add(z.url);
    if (!isStr(z.overeno) || !RE_DATUM.test(z.overeno)) err(`${p}.overeno musí být datum RRRR-MM-DD`);
  }

  // zdroj u pole: citace + (paragraf | vz.soubor+strana) + url z zdroje[]
  function zdroj(z, p) {
    if (!z || typeof z !== 'object') { err(`${p}: zdroj chybí`); return; }
    if (!isStr(z.citace)) err(`${p}: zdroj.citace chybí`);
    const maVz = z.vz && isStr(z.vz.soubor) && isInt(z.vz.strana) && z.vz.strana > 0;
    if (!isStr(z.paragraf) && !maVz) err(`${p}: zdroj musí mít paragraf nebo vz {soubor, strana}`);
    if (!isHttps(z.url)) err(`${p}: zdroj.url musí být https`);
    else if (!urlZdroju.has(z.url)) err(`${p}: zdroj.url není uvedena v zdroje[]: ${z.url}`);
    for (const [i, v] of (z.potvrzeni_vz || []).entries()) {
      if (!isStr(v.soubor) || !isInt(v.strana) || v.strana < 1) err(`${p}: potvrzeni_vz[${i}] musí mít soubor a stranu`);
      if (!isHttps(v.vz_url) || !urlZdroju.has(v.vz_url)) err(`${p}: potvrzeni_vz[${i}].vz_url není v zdroje[]`);
    }
    if (z.vz && !isHttps(z.vz.vz_url)) err(`${p}: vz.vz_url musí být https`);
  }

  if (!Array.isArray(I.pojistovny)) { err('pojistovny[] chybí'); return { errors, warnings }; }
  if (I.pojistovny.length !== 7) err(`pojistovny[] musí mít 7 záznamů, má ${I.pojistovny.length}`);
  const kody = I.pojistovny.map((p) => p.kod);
  if (new Set(kody).size !== kody.length) err('kódy pojišťoven nejsou unikátní');
  for (const k of KODY) if (!kody.includes(k)) err(`chybí pojišťovna ${k}`);

  for (const P of I.pojistovny) {
    const pfx = `pojistovny[${P.kod}]`;
    if (!KODY.includes(P.kod)) err(`${pfx}: neznámý kód`);
    for (const f of ['zkratka', 'nazev', 'sidlo_mesto']) if (!isStr(P[f])) err(`${pfx}.${f} chybí`);
    if (!/^\d{8}$/.test(P.ico || '')) err(`${pfx}.ico musí mít 8 číslic`);
    else if (P.ico_zdroj) { if (!isInt(P.ico_zdroj.strana)) err(`${pfx}.ico_zdroj.strana chybí`); } else err(`${pfx}.ico_zdroj chybí`);

    // zákon
    const zk = P.zakon || {};
    if (!ZAKONY.includes(zk.cislo)) err(`${pfx}.zakon.cislo musí být ${ZAKONY.join(' | ')}`);
    else if (P.kod === '111' && zk.cislo !== '551/1991 Sb.') err(`${pfx}: VZP se řídí zákonem 551/1991 Sb.`);
    else if (P.kod !== '111' && zk.cislo !== '280/1992 Sb.') err(`${pfx}: zaměstnanecká pojišťovna se řídí zákonem 280/1992 Sb.`);
    if (!isStr(zk.nazev)) err(`${pfx}.zakon.nazev chybí`);
    zdroj(zk.zdroj, `${pfx}.zakon`);

    // vznik
    const v = P.vznik || {};
    if (!isInt(v.rok) || v.rok < 1990 || v.rok > 2000) err(`${pfx}.vznik.rok mimo 1990–2000`);
    if (!PUVODY.includes(v.puvod)) err(`${pfx}.vznik.puvod musí být ${PUVODY.join(' | ')}`);
    if (P.kod === '111' && v.puvod !== 'statni') err(`${pfx}: VZP má původ statni`);
    if (v.datum != null && !RE_DATUM.test(v.datum)) err(`${pfx}.vznik.datum není datum`);
    if (!('datum_typ' in v)) err(`${pfx}.vznik.datum_typ musí být uveden (nebo null)`);
    else if (v.datum_typ !== null && !DATUM_TYPY.includes(v.datum_typ)) err(`${pfx}.vznik.datum_typ musí být ${DATUM_TYPY.join(' | ')} nebo null`);
    if (v.datum_typ == null && v.datum != null) warn(`${pfx}.vznik.datum_typ je null (musí být v chybi[])`);
    if (v.datum_zapisu_or != null && !RE_DATUM.test(v.datum_zapisu_or)) err(`${pfx}.vznik.datum_zapisu_or není datum`);
    if (!isStr(v.poznamka)) err(`${pfx}.vznik.poznamka chybí`);
    if (!Array.isArray(v.sloucene)) err(`${pfx}.vznik.sloucene musí být pole`);
    for (const [i, s] of (v.sloucene || []).entries()) {
      if (!isStr(s.nazev) || !isInt(s.rok)) err(`${pfx}.vznik.sloucene[${i}] musí mít nazev a rok`);
      if (!('kod' in s)) err(`${pfx}.vznik.sloucene[${i}].kod musí být uveden (nebo null)`);
    }
    zdroj(v.zdroj, `${pfx}.vznik`);

    // orgány
    const O = P.organy || {};
    for (const [klic, ocekavano] of [['spravni_rada', P.kod === '111' ? 30 : 15], ['dozorci_rada', P.kod === '111' ? 13 : 9]]) {
      const R = O[klic];
      const rp = `${pfx}.organy.${klic}`;
      if (!R) { err(`${rp} chybí`); continue; }
      if (!isInt(R.pocet) || R.pocet < 1) err(`${rp}.pocet musí být kladné celé číslo`);
      if (!Array.isArray(R.obsazeni) || R.obsazeni.length === 0) err(`${rp}.obsazeni[] chybí`);
      else {
        let sum = 0;
        for (const [i, o] of R.obsazeni.entries()) {
          if (!isStr(o.kdo)) err(`${rp}.obsazeni[${i}].kdo chybí`);
          if (!isInt(o.pocet) || o.pocet < 0) err(`${rp}.obsazeni[${i}].pocet musí být celé číslo >= 0`);
          else sum += o.pocet;
        }
        if (sum !== R.pocet) err(`${rp}: součet obsazeni[].pocet (${sum}) se nerovná pocet (${R.pocet})`);
      }
      if (!isInt(R.funkcni_obdobi_let) || R.funkcni_obdobi_let < 1) err(`${rp}.funkcni_obdobi_let chybí`);
      zdroj(R.zdroj, rp);
      if (isInt(R.pocet) && R.pocet !== ocekavano) warn(`${rp}.pocet ${R.pocet} se liší od zákonného ${ocekavano}`);
    }
    const R = O.reditel;
    if (!R) err(`${pfx}.organy.reditel chybí`);
    else {
      if (!isStr(R.funkce)) err(`${pfx}.organy.reditel.funkce chybí`);
      if (!isStr(R.jmenuje)) err(`${pfx}.organy.reditel.jmenuje chybí`);
      if (R.ve_funkci_od != null && !RE_DATUM.test(R.ve_funkci_od)) err(`${pfx}.organy.reditel.ve_funkci_od není datum`);
      zdroj(R.zdroj, `${pfx}.organy.reditel`);
    }
    const RO = O.rozhodci_organ;
    if (!RO) err(`${pfx}.organy.rozhodci_organ chybí`);
    else {
      if (typeof RO.existuje !== 'boolean') err(`${pfx}.organy.rozhodci_organ.existuje musí být boolean`);
      zdroj(RO.zdroj, `${pfx}.organy.rozhodci_organ`);
    }

    // dohled
    const D = P.dohled || {};
    if (!Array.isArray(D.organy) || !D.organy.includes('MZ ČR') || !D.organy.includes('MF ČR')) err(`${pfx}.dohled.organy musí obsahovat MZ ČR a MF ČR`);
    zdroj(D.zdroj, `${pfx}.dohled`);

    // limit provozu
    const L = P.provozni_limit_pct;
    if (!L) err(`${pfx}.provozni_limit_pct chybí`);
    else {
      if (L.hodnota !== null && (typeof L.hodnota !== 'number' || L.hodnota < 2 || L.hodnota > 4)) err(`${pfx}.provozni_limit_pct.hodnota mimo 2–4 %`);
      if (L.hodnota === null && !isStr(L.poznamka)) err(`${pfx}.provozni_limit_pct je null bez poznamka`);
      if (L.hodnota !== null) {
        if (!isInt(L.rok)) err(`${pfx}.provozni_limit_pct.rok chybí`);
        zdroj(L.zdroj, `${pfx}.provozni_limit_pct`);
      }
      for (const [i, d] of (L.dalsi_roky || []).entries()) {
        if (!isInt(d.rok) || typeof d.hodnota !== 'number') err(`${pfx}.provozni_limit_pct.dalsi_roky[${i}] musí mít rok a hodnota`);
        zdroj(d.zdroj, `${pfx}.provozni_limit_pct.dalsi_roky[${i}]`);
      }
    }

    // členství
    if (!Array.isArray(P.clenstvi)) err(`${pfx}.clenstvi musí být pole`);
    for (const [i, c] of (P.clenstvi || []).entries()) {
      if (!isStr(c.nazev)) err(`${pfx}.clenstvi[${i}].nazev chybí`);
      if (c.url != null && !isHttps(c.url)) err(`${pfx}.clenstvi[${i}].url musí být https nebo null`);
      zdroj(c.zdroj, `${pfx}.clenstvi[${i}]`);
    }

    // weby
    const W = P.weby || {};
    if (!isHttps(W.hlavni)) err(`${pfx}.weby.hlavni musí být https`);
    for (const f of ['pro_poskytovatele', 'vyrocni_zpravy']) {
      if (W[f] === undefined) err(`${pfx}.weby.${f} musí být uveden (nebo null)`);
      else if (W[f] !== null && !isHttps(W[f])) err(`${pfx}.weby.${f} musí být https nebo null`);
    }
    if (!Array.isArray(P.poznamky)) err(`${pfx}.poznamky musí být pole`);
  }

  // chybi[]
  if (!Array.isArray(I.chybi)) err('chybi[] musí být pole');
  for (const [i, c] of (I.chybi || []).entries()) if (!isStr(c.pole) || !isStr(c.duvod)) err(`chybi[${i}] musí mít pole a duvod`);

  zakazaneKlice(I, 'kořen', errors);
  return { errors, warnings };
}

export default validateInstituce;
