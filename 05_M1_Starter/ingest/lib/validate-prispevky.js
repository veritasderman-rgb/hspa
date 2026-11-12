// Validátor data/pojistovny-prispevky.json: katalog příspěvků z fondu prevence a bonusových
// programů 7 zdravotních pojišťoven (stránka pojistovny-prispevky.html, src/prispevky-engine.js).
// Čistá funkce bez diskových zápisů a bez sítě. Že citace opravdu stojí na uvedené adrese,
// ověřuje zvlášť `node ingest/verify-pojistovny-prispevky.js` (stahuje weby pojišťoven).

export const KODY_ZP = ['111', '201', '205', '207', '209', '211', '213'];
export const KATEGORIE = [
  'stomatologie', 'ockovani', 'pohyb', 'dusevni_zdravi', 'tehotenstvi_porod', 'onko_prevence',
  'kardio_metabolicke', 'zrak_sluch', 'rehabilitace_lazne', 'chronicka_onemocneni', 'darci',
  'vitaminy_doplnky', 'ostatni',
];
export const SITUACE = [
  'tehotna', 'po_porodu', 'novorozenec', 'darce', 'diagnoza', 'student', 'profese',
  'novy_pojistenec', 'bonusovy_program', 'jine',
];
export const PERIODY = ['rok', 'jednorazove', 'tehotenstvi', 'jine'];
export const STROP_TYPY = ['castka', 'pocet'];
export const MAX_CITACE = 400;
export const MAX_CASTKA = 100000;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isHttps = (v) => typeof v === 'string' && /^https:\/\/\S+$/.test(v);
const isVek = (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 110);
const digits = (s) => String(s ?? '').replace(/[^\d]/g, '');

/** Je částka (jako řada číslic) vidět v citaci? „1 000 Kč“, „1.000,-“ i „1000“ projdou. */
export function castkaVCitaci(castka, citace) {
  const d = String(castka);
  return String(citace ?? '').replace(/(\d)[\s .](?=\d{3}(\D|$))/g, '$1').includes(d) || digits(citace).includes(d);
}

export function validatePrispevky(D) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const ok = (cond, msg) => { checks += 1; if (!cond) errors.push(msg); return !!cond; };
  const T = 'pojistovny-prispevky.json';
  if (!ok(isObj(D), `${T}: chybí nebo není objekt`)) return { errors, warnings, checks };
  for (const f of ['version', 'generated_at', 'stav_k', 'rok', '_doc', 'kategorie', 'situace', 'pojistovny']) {
    ok(D[f] != null, `${T} root: missing '${f}'`);
  }
  if (D.stav_k != null) ok(isDate(D.stav_k), `${T}.stav_k: formát RRRR-MM-DD`);
  ok(Number.isInteger(D.rok) && D.rok >= 2024 && D.rok <= 2035, `${T}.rok: celé číslo`);
  if (Array.isArray(D.kategorie)) {
    ok(D.kategorie.length === KATEGORIE.length && KATEGORIE.every((id, i) => D.kategorie[i]?.id === id), `${T}.kategorie: musí být ${KATEGORIE.join(', ')} v tomto pořadí`);
    for (const k of D.kategorie) ok(isStr(k?.label), `${T}.kategorie[${k?.id ?? '?'}].label: chybí`);
  }
  if (Array.isArray(D.situace)) {
    ok(D.situace.length === SITUACE.length && SITUACE.every((id, i) => D.situace[i]?.id === id), `${T}.situace: musí být ${SITUACE.join(', ')} v tomto pořadí`);
  }
  if (!ok(Array.isArray(D.pojistovny), `${T}.pojistovny: musí být pole`)) return { errors, warnings, checks };
  ok(D.pojistovny.length === KODY_ZP.length && KODY_ZP.every((k, i) => D.pojistovny[i]?.kod === k), `${T}: 7 pojišťoven v pořadí kódu ${KODY_ZP.join(', ')}`);

  for (const z of D.pojistovny) {
    const tag = `${T} ZP ${z?.kod ?? '?'}`;
    ok(KODY_ZP.includes(z?.kod), `${tag}: neznámý kód`);
    ok(isStr(z?.zkratka), `${tag}: chybí zkratka`);
    ok(isHttps(z?.rozcestnik_url), `${tag}.rozcestnik_url: musí začínat https://`);
    ok(isDate(z?.overeno_at), `${tag}.overeno_at: formát RRRR-MM-DD`);
    for (const f of ['obecne_podminky', 'stropy', 'prispevky', 'nenalezeno', 'poznamky']) ok(Array.isArray(z?.[f]), `${tag}.${f}: musí být pole`);
    for (const f of ['nenalezeno', 'poznamky']) if (Array.isArray(z?.[f])) ok(z[f].every(isStr), `${tag}.${f}: pole neprázdných stringů`);
    for (const [i, c] of (z?.obecne_podminky || []).entries()) {
      const ct = `${tag}.obecne_podminky[${i}]`;
      ok(isStr(c?.text), `${ct}.text: chybí`);
      ok(isHttps(c?.url), `${ct}.url: https`);
      ok(isStr(c?.citace) && c.citace.length <= MAX_CITACE, `${ct}.citace: neprázdný string do ${MAX_CITACE} znaků`);
    }
    const stropIds = new Set();
    for (const s of z?.stropy || []) {
      const st = `${tag}.stropy[${s?.id ?? '?'}]`;
      ok(isStr(s?.id) && /^[a-z0-9-]+$/.test(s.id), `${st}.id: kebab-case`);
      ok(!stropIds.has(s?.id), `${st}: duplicitní id`);
      stropIds.add(s?.id);
      ok(isStr(s?.nazev), `${st}.nazev: chybí`);
      ok(STROP_TYPY.includes(s?.typ), `${st}.typ: ${STROP_TYPY.join(' | ')}`);
      ok(Number.isFinite(s?.hodnota) && s.hodnota > 0 && s.hodnota <= MAX_CASTKA, `${st}.hodnota: kladné číslo`);
      ok(PERIODY.includes(s?.perioda), `${st}.perioda: ${PERIODY.join(' | ')}`);
      ok(s?.druh === undefined || s.druh === 'navyseni', `${st}.druh: jen 'navyseni' (limit navýšený převodem od jiných pojištěnců), nebo pole vynechat`);
      ok(isHttps(s?.url), `${st}.url: https`);
      ok(isStr(s?.citace) && s.citace.length <= MAX_CITACE, `${st}.citace: neprázdný string do ${MAX_CITACE} znaků`);
    }
    if (!ok(Array.isArray(z?.prispevky) && z.prispevky.length > 0, `${tag}.prispevky: neprázdné pole`)) continue;
    const ids = new Set();
    const pouziteStropy = new Set();
    for (const p of z.prispevky) {
      const pt = `${tag}.prispevky[${p?.id ?? '?'}]`;
      ok(isStr(p?.id) && /^[a-z0-9-]+$/.test(p.id), `${pt}.id: kebab-case`);
      ok(!ids.has(p?.id), `${pt}: duplicitní id`);
      ids.add(p?.id);
      ok(isStr(p?.nazev), `${pt}.nazev: chybí`);
      ok(KATEGORIE.includes(p?.kategorie), `${pt}.kategorie: neznámá ('${p?.kategorie}')`);
      ok(PERIODY.includes(p?.perioda), `${pt}.perioda: ${PERIODY.join(' | ')}`);
      if (p?.castka_kc === null) ok(isStr(p?.castka_text), `${pt}: bez castka_kc musí být castka_text`);
      else ok(Number.isFinite(p?.castka_kc) && p.castka_kc > 0 && p.castka_kc <= MAX_CASTKA, `${pt}.castka_kc: kladné číslo do ${MAX_CASTKA} nebo null`);
      const k = p?.kdo;
      if (ok(isObj(k), `${pt}.kdo: chybí`)) {
        ok(isVek(k.vek_od) && isVek(k.vek_do), `${pt}.kdo: vek_od / vek_do celé číslo 0–110 nebo null`);
        if (Number.isInteger(k.vek_od) && Number.isInteger(k.vek_do)) ok(k.vek_od <= k.vek_do, `${pt}.kdo: vek_od > vek_do`);
        ok(k.pohlavi === null || k.pohlavi === 'M' || k.pohlavi === 'Z', `${pt}.kdo.pohlavi: M | Z | null`);
        ok(Array.isArray(k.situace) && k.situace.every((s) => SITUACE.includes(s)), `${pt}.kdo.situace: pole hodnot z ${SITUACE.join(', ')}`);
      }
      ok(Array.isArray(p?.podminky) && p.podminky.every(isStr), `${pt}.podminky: pole stringů`);
      ok(isHttps(p?.url), `${pt}.url: musí začínat https://`);
      ok(isStr(p?.citace) && p.citace.length <= MAX_CITACE, `${pt}.citace: neprázdný string do ${MAX_CITACE} znaků`);
      ok(p?.jistota === 'ano' || p?.jistota === 'nejasne', `${pt}.jistota: ano | nejasne`);
      if (p?.strop_id != null) {
        ok(stropIds.has(p.strop_id), `${pt}.strop_id: '${p.strop_id}' není ve stropy`);
        pouziteStropy.add(p.strop_id);
      }
      if (Number.isFinite(p?.castka_kc) && isStr(p?.citace) && !castkaVCitaci(p.castka_kc, p.citace)) {
        warnings.push(`${pt}: částka ${p.castka_kc} není v citaci vidět (odvozená hodnota?)`);
      }
      if (p?.jistota === 'nejasne') warnings.push(`${pt}: jistota nejasne`);
    }
    const navyseni = new Set((z.stropy || []).filter((x) => x?.druh === 'navyseni').map((x) => x.id));
    for (const id of navyseni) ok(!pouziteStropy.has(id), `${tag}.stropy[${id}]: navýšení není strop, příspěvek se na něj nesmí odkazovat`);
    for (const id of stropIds) if (!pouziteStropy.has(id) && !navyseni.has(id)) warnings.push(`${tag}.stropy[${id}]: žádný příspěvek se na strop neodkazuje`);
  }
  return { errors, warnings, checks };
}
