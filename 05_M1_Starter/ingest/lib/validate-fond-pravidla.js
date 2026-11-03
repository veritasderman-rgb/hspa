// Validátor data/pojistovny-fond-pravidla.json (balíček A6.2 plánu PLAN-SROVNAVAC-ANALYTIK.md):
// pravidla čerpání fondu prevence u sedmi ZP a kontroly fondu (NKÚ, MZ, MF).
// Čistá funkce bez diskových zápisů; zapojená do ingest/validate-pojistovny.js (smyčka `dalsi`).
// Třída C: data o pojmenovaných institucích, bez jmen osob (hlídá se titul Ing./MUDr./Mgr. aj.).

export const KODY_ZP = ['111', '201', '205', '207', '209', '211', '213'];
export const PODMINKY = ['registrace_trva', 'bez_preregistrace', 'preventivni_prohlidka', 'bez_dluhu', 'lhuta_podani_dni',
  'strop_dospely_kc', 'strop_dite_kc', 'jen_aplikace', 'podminene_prispevky'];
export const STAVY = ['ano', 'castecne', 'ne'];
export const ORGANY = ['NKÚ', 'MZ', 'MF', 'MZ a MF'];
/** Podmínky s číselnou hodnotou (hodnota je u nich povolená; u ostatních je chyba). */
export const CISELNE = ['lhuta_podani_dni', 'strop_dospely_kc', 'strop_dite_kc'];
/** Jednotka lhůty podání: tak, jak ji pojišťovna uvádí (kalendářní měsíce se nepřepočítávají na dny). */
export const JEDNOTKY_LHUTY = ['dni', 'mesice'];
export const MAX_CITACE = 450;
/** Tituly, jména a oslovení, která by prozrazovala osobu v textu zjištění a reakcí. */
export const OSOBA_RE = /\b(Ing\.|MUDr\.|Mgr\.|JUDr\.|RNDr\.|Bc\.|PhDr\.|doc\.|prof\.|paní|pan[ae]?)\s/;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isHttps = (v) => typeof v === 'string' && /^https:\/\/\S+$/.test(v);

export function validateFondPravidla(D) {
  const errors = [];
  const warnings = [];
  const ok = (cond, msg) => { if (!cond) errors.push(msg); return !!cond; };
  const T = 'pojistovny-fond-pravidla.json';
  if (!ok(isObj(D), `${T}: chybí nebo není objekt`)) return { errors, warnings };
  for (const f of ['version', 'generated_at', 'stav_k', '_doc', 'skala', 'ramec', 'podminky', 'pojistovny', 'zdroje', 'poznamky_autora']) {
    ok(D[f] != null, `${T} root: missing '${f}'`);
  }
  if (D.stav_k != null) ok(isDate(D.stav_k), `${T}.stav_k: formát RRRR-MM-DD`);
  if (isObj(D.skala)) for (const s of [...STAVY, 'null']) ok(isStr(D.skala[s]), `${T}.skala.${s}: chybí popis`);

  // ---- rámec
  const R = D.ramec;
  if (ok(isObj(R), `${T}.ramec: musí být objekt`)) {
    if (ok(Array.isArray(R.zakon) && R.zakon.length >= 4, `${T}.ramec.zakon: aspoň 4 ustanovení`)) {
      R.zakon.forEach((z, i) => {
        const tag = `${T}.ramec.zakon[${i}]`;
        for (const f of ['predpis', 'paragraf', 'obsah']) ok(isStr(z?.[f]), `${tag}.${f}: chybí`);
        ok(isHttps(z?.url), `${tag}.url: musí začínat https://`);
      });
    }
    ok(Number.isFinite(R.strop_pct) && R.strop_pct > 0 && R.strop_pct <= 100, `${T}.ramec.strop_pct: číslo 0–100`);
    ok(isStr(R.strop_popis), `${T}.ramec.strop_popis: chybí`);
    for (const k of ['nenarokovost', 'stanovisko_mz']) {
      const o = R[k];
      if (!ok(isObj(o), `${T}.ramec.${k}: musí být objekt`)) continue;
      ok(isStr(o.citace) && o.citace.length <= MAX_CITACE, `${T}.ramec.${k}.citace: neprázdný string do ${MAX_CITACE} znaků`);
      ok(isHttps(o.url), `${T}.ramec.${k}.url: https`);
      ok(isDate(o.overeno_at), `${T}.ramec.${k}.overeno_at: RRRR-MM-DD`);
    }
  }

  // ---- seznam podmínek
  const ids = [];
  if (ok(Array.isArray(D.podminky), `${T}.podminky: musí být pole`)) {
    D.podminky.forEach((p, i) => {
      for (const f of ['id', 'nazev', 'popis']) ok(isStr(p?.[f]), `${T}.podminky[${i}].${f}: chybí`);
      ids.push(p?.id);
    });
    ok(PODMINKY.every((id, i) => ids[i] === id) && ids.length === PODMINKY.length,
      `${T}.podminky: musí být ${PODMINKY.join(', ')} v tomto pořadí`);
  }

  const checkText = (s, tag) => {
    if (!isStr(s)) return;
    if (OSOBA_RE.test(s)) errors.push(`${tag}: text vypadá, že obsahuje jméno nebo oslovení osoby („${s.match(OSOBA_RE)[0].trim()}“)`);
  };

  // ---- kontrola (sdílená pro ZP i plošné)
  const seenK = new Set();
  const checkKontrola = (k, tag) => {
    if (!ok(isObj(k), `${tag}: musí být objekt`)) return;
    ok(isStr(k.id) && !seenK.has(k.id), `${tag}.id: chybí nebo duplicitní`);
    seenK.add(k.id);
    ok(ORGANY.includes(k.organ), `${tag}.organ: ${ORGANY.join(' | ')} (je '${k.organ}')`);
    ok(isStr(k.cislo), `${tag}.cislo: chybí`);
    ok(Number.isInteger(k.rok_kontroly) && k.rok_kontroly >= 2005 && k.rok_kontroly <= 2030, `${tag}.rok_kontroly: celé číslo`);
    ok(isStr(k.obdobi), `${tag}.obdobi: chybí`);
    ok(isStr(k.predmet), `${tag}.predmet: chybí`);
    ok(Array.isArray(k.zjisteni) && k.zjisteni.length > 0 && k.zjisteni.every(isStr), `${tag}.zjisteni: neprázdné pole vět`);
    ok(isStr(k.reakce), `${tag}.reakce: chybí (i „reakci jsme nedohledali“ je odpověď)`);
    ok(isHttps(k.url), `${tag}.url: musí začínat https://`);
    if (k.url_dalsi != null) ok(isHttps(k.url_dalsi), `${tag}.url_dalsi: https`);
    if (k.castky_kc != null) {
      ok(Array.isArray(k.castky_kc), `${tag}.castky_kc: pole`);
      (k.castky_kc || []).forEach((c, j) => {
        ok(isStr(c?.popis), `${tag}.castky_kc[${j}].popis: chybí`);
        ok(Number.isFinite(c?.kc) && c.kc >= 0, `${tag}.castky_kc[${j}].kc: nezáporné číslo`);
      });
    }
    (k.zjisteni || []).forEach((z, j) => checkText(z, `${tag}.zjisteni[${j}]`));
    checkText(k.reakce, `${tag}.reakce`);
    checkText(k.predmet, `${tag}.predmet`);
  };

  // ---- pojišťovny
  if (!ok(Array.isArray(D.pojistovny), `${T}.pojistovny: musí být pole`)) return { errors, warnings };
  ok(D.pojistovny.length === KODY_ZP.length, `${T}: musí být ${KODY_ZP.length} pojišťoven (je ${D.pojistovny.length})`);
  const seen = new Set();
  for (const p of D.pojistovny) {
    const tag = `${T} ZP ${p?.kod ?? '?'}`;
    ok(KODY_ZP.includes(p?.kod), `${tag}: neznámý kód`);
    ok(!seen.has(p?.kod), `${tag}: duplicitní kód`);
    seen.add(p?.kod);
    ok(isStr(p?.zkratka), `${tag}: chybí zkratka`);
    if (!ok(isObj(p?.podminky), `${tag}.podminky: musí být objekt`)) continue;
    for (const id of PODMINKY) {
      const c = p.podminky[id];
      const ct = `${tag}.${id}`;
      if (!ok(isObj(c), `${ct}: chybí buňka`)) continue;
      if (c.stav === null) {
        ok(isStr(c.poznamka), `${ct}: stav null vyžaduje poznámku (otázka do kola 1)`);
        warnings.push(`${ct}: stav null (nezjištěno)`);
        continue;
      }
      if (!ok(STAVY.includes(c.stav), `${ct}.stav: ${STAVY.join(' | ')} | null (je '${c.stav}')`)) continue;
      ok(isStr(c.citace) && c.citace.length <= MAX_CITACE, `${ct}.citace: neprázdný string do ${MAX_CITACE} znaků`);
      ok(isHttps(c.url), `${ct}.url: musí začínat https://`);
      ok(isDate(c.overeno_at), `${ct}.overeno_at: formát RRRR-MM-DD`);
      if (c.hodnota != null) {
        ok(CISELNE.includes(id), `${ct}.hodnota: u této podmínky se číslo neuvádí`);
        ok(Number.isFinite(c.hodnota) && c.hodnota >= 0, `${ct}.hodnota: nezáporné číslo`);
        ok(c.stav !== 'ne', `${ct}: stav ne nemá hodnotu`);
      }
      if (id === 'lhuta_podani_dni') {
        ok(c.stav !== 'ano' || Number.isFinite(c.hodnota), `${ct}: stav ano vyžaduje hodnotu lhůty`);
        // Jednotka se zachovává, jak ji pojišťovna uvádí: „3 měsíce“ nejsou 90 dní (revize Codex, PR #1372).
        if (c.hodnota != null) ok(JEDNOTKY_LHUTY.includes(c.jednotka), `${ct}.jednotka: ${JEDNOTKY_LHUTY.join(' | ')} (je '${c.jednotka}')`);
      } else if (c.jednotka != null) ok(false, `${ct}.jednotka: uvádí se jen u lhůty podání`);
      if (id.startsWith('strop_') && c.stav === 'ano') ok(Number.isFinite(c.hodnota), `${ct}: stav ano vyžaduje hodnotu v Kč`);
      if (c.poznamka != null) ok(isStr(c.poznamka), `${ct}.poznamka: neprázdný string`);
      checkText(c.poznamka, `${ct}.poznamka`);
    }
    if (!ok(Array.isArray(p.kontroly), `${tag}.kontroly: musí být pole (i prázdné)`)) continue;
    p.kontroly.forEach((k, j) => checkKontrola(k, `${tag}.kontroly[${j}]`));
  }
  for (const k of KODY_ZP) ok(seen.has(k), `${T}: chybí ZP ${k}`);
  if (D.kontroly_plosne != null) {
    if (ok(Array.isArray(D.kontroly_plosne), `${T}.kontroly_plosne: pole`)) D.kontroly_plosne.forEach((k, j) => checkKontrola(k, `${T}.kontroly_plosne[${j}]`));
  }
  if (ok(Array.isArray(D.zdroje) && D.zdroje.length > 0, `${T}.zdroje: neprázdné pole`)) {
    D.zdroje.forEach((z, i) => { ok(isStr(z?.nazev) && isHttps(z?.url), `${T}.zdroje[${i}]: nazev a url (https)`); });
  }
  ok(Array.isArray(D.poznamky_autora) && D.poznamky_autora.every(isStr), `${T}.poznamky_autora: pole stringů`);
  return { errors, warnings };
}
