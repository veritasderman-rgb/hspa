// Validace odpovědi na dotazník proti definici sady (data/pojistovny-otazky.json).
//
// Čistý modul bez závislosti na databázi a bez přístupu k síti: handler
// api/dotaznik.js ho volá po načtení definice, testy ho volají přímo.
// Soubor začíná podtržítkem, takže ho Vercel nevystavuje jako endpoint.
//
// Tvar těla: { sada_id, sada_verze, token?, respondent_typ, respondent_kod?,
//              odpovedi: { <otazka_id>: hodnota | [hodnoty] } }

import { createHash } from 'node:crypto';

export const RESPONDENT_TYPY = ['pojistovna', 'pacientska_organizace', 'verejnost'];
export const MAX_TEXT = 2000;
export const UPRESNENI_SUFFIX = '_upresneni';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;
const KOD_RE = /^[A-Za-z0-9_.-]{1,40}$/;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const RODNE_CISLO_RE = /\b\d{6}\s?\/\s?\d{3,4}\b/;
// eslint-disable-next-line no-control-regex
const CTRL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Všechny otázky sady v pořadí zobrazení (otevřená sada i dotazník s částmi). */
export function flattenOtazky(sada) {
  if (!sada || typeof sada !== 'object') return [];
  if (Array.isArray(sada.casti)) return sada.casti.flatMap((c) => c?.otazky ?? []);
  return Array.isArray(sada.otazky) ? sada.otazky : [];
}

/** Otázka s nabídkou, kde je volba typu „jiné (uveďte)“, má pole pro upřesnění. */
export function hasUpresneni(q) {
  return Array.isArray(q?.moznosti) && q.moznosti.some((m) => /uveďte/i.test(String(m)));
}

/** 'jeden' | 'vice' | 'text'. Bez pole `vyber` se otázka s nabídkou bere jako vícenásobná. */
export function questionKind(q) {
  if (!Array.isArray(q?.moznosti) || q.moznosti.length === 0) return 'text';
  return q.vyber === 'jeden' ? 'jeden' : 'vice';
}

/** sha256 (hex) tokenu — v databázi je jen hash. */
export function hashToken(token) {
  return createHash('sha256').update(String(token), 'utf8').digest('hex');
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanText(v) {
  return String(v).replace(CTRL_RE, '').replace(/\r\n?/g, '\n').trim();
}

/**
 * @param {object} def   sada z pojistovny-otazky.json (jedna položka `sady[]`)
 * @param {object} body  tělo požadavku
 * @returns {{ok: boolean, errors: string[], clean: object|null}}
 */
export function validateOdpoved(def, body) {
  const errors = [];
  const err = (m) => { errors.push(m); };

  if (!isPlainObject(def) || !def.id) return { ok: false, errors: ['sada: neznámá sada'], clean: null };
  if (!isPlainObject(body)) return { ok: false, errors: ['tělo požadavku musí být objekt'], clean: null };

  // --- sada a verze
  if (body.sada_id !== def.id) err(`sada_id: očekáváno '${def.id}'`);
  const verze = typeof body.sada_verze === 'string' ? body.sada_verze.trim() : '';
  if (!verze || verze.length > 32) err('sada_verze: povinný řetězec do 32 znaků');
  else if (def.verze != null && String(def.verze) !== verze) err(`sada_verze: aktuální verze sady je '${def.verze}'`);

  // --- respondent
  const typ = body.respondent_typ;
  if (!RESPONDENT_TYPY.includes(typ)) err(`respondent_typ: ${RESPONDENT_TYPY.join(' | ')}`);
  else if (Array.isArray(def.povolene_respondenty) && !def.povolene_respondenty.includes(typ)) {
    err(`respondent_typ: tuto sadu nelze vyplnit jako '${typ}'`);
  }
  const token = body.token == null || body.token === '' ? null : body.token;
  const kod = body.respondent_kod == null || body.respondent_kod === '' ? null : body.respondent_kod;
  if (kod !== null && (typeof kod !== 'string' || !KOD_RE.test(kod))) err('respondent_kod: 1–40 znaků A–Z, a–z, 0–9, _ . -');
  if (token !== null && (typeof token !== 'string' || !TOKEN_RE.test(token))) err('token: neplatný formát');

  if (typ === 'verejnost') {
    if (token !== null) err('token: veřejnost vyplňuje dotazník bez tokenu');
    if (kod !== null) err('respondent_kod: veřejnost kód neuvádí');
  } else if (RESPONDENT_TYPY.includes(typ) && token === null) {
    err('token: adresná sada vyžaduje platný token');
  }

  // --- odpovědi
  const flat = flattenOtazky(def);
  const byId = new Map(flat.map((q) => [q.id, q]));
  const odpovedi = {};
  if (!isPlainObject(body.odpovedi)) {
    err('odpovedi: musí být objekt { otazka_id: hodnota }');
  } else {
    for (const [key, raw] of Object.entries(body.odpovedi)) {
      const isUp = key.endsWith(UPRESNENI_SUFFIX);
      const qid = isUp ? key.slice(0, -UPRESNENI_SUFFIX.length) : key;
      const q = byId.get(qid);
      if (!q) { err(`odpovedi.${key}: neznámá otázka`); continue; }

      if (isUp) {
        if (!hasUpresneni(q)) { err(`odpovedi.${key}: otázka upřesnění nemá`); continue; }
        if (typeof raw !== 'string') { err(`odpovedi.${key}: upřesnění musí být text`); continue; }
        const t = cleanText(raw);
        if (t.length > MAX_TEXT) { err(`odpovedi.${key}: text je delší než ${MAX_TEXT} znaků`); continue; }
        if (t) odpovedi[key] = t;
        continue;
      }

      const kind = questionKind(q);
      if (kind === 'text') {
        if (typeof raw !== 'string') { err(`odpovedi.${key}: očekáván text`); continue; }
        const t = cleanText(raw);
        if (t.length > MAX_TEXT) { err(`odpovedi.${key}: text je delší než ${MAX_TEXT} znaků`); continue; }
        if (t) odpovedi[key] = t;
        continue;
      }

      const allowed = q.moznosti;
      if (kind === 'jeden') {
        if (raw === '' || raw == null) continue;
        if (typeof raw !== 'string' || !allowed.includes(raw)) { err(`odpovedi.${key}: hodnota mimo nabídku`); continue; }
        odpovedi[key] = raw;
        continue;
      }
      // vícenásobná volba: pole (nebo jedna hodnota) z nabídky, bez duplicit
      const list = Array.isArray(raw) ? raw : (raw === '' || raw == null ? [] : [raw]);
      if (list.some((v) => typeof v !== 'string' || !allowed.includes(v))) { err(`odpovedi.${key}: hodnota mimo nabídku`); continue; }
      const uniq = [...new Set(list)];
      if (uniq.length) odpovedi[key] = uniq;
    }
    if (Object.keys(odpovedi).length === 0 && errors.length === 0) err('odpovedi: formulář je prázdný');
  }

  // --- ochrana veřejného formuláře před osobními údaji ve volném textu
  if (typ === 'verejnost') {
    for (const [key, v] of Object.entries(odpovedi)) {
      if (typeof v === 'string' && (EMAIL_RE.test(v) || RODNE_CISLO_RE.test(v))) {
        err(`odpovedi.${key}: text vypadá jako osobní údaj (e-mail, rodné číslo); neuvádějte je`);
      }
    }
  }

  if (errors.length) return { ok: false, errors, clean: null };
  return {
    ok: true,
    errors: [],
    clean: {
      sada_id: def.id,
      sada_verze: verze,
      respondent_typ: typ,
      respondent_kod: kod,
      token,
      odpovedi,
    },
  };
}
