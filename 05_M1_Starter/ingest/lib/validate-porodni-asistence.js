// Validátor data/pojistovny-porodni-asistence.json (per-ZP řez výkonu 06211, PLAN-PORODNI-ASISTENCE-06211.md § 5.1 D).
// Čistá funkce bez diskových zápisů. Soulad se zdrojem ÚZIS hlídá tests/pojistovny-porodni-asistence.test.js
// (builder ingest/build-pojistovny-porodni-asistence.js musí dát totožný soubor).

export const KODY_ZP = ['111', '201', '205', '207', '209', '211', '213'];
export const METRIKY = ['vykony', 'zeny', 'porody', 'icz_921', 'icz_603', 'zeny_na_100_porodu'];

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v) && v >= 0;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isQ = (v) => typeof v === 'string' && /^20\d{2}Q[1-4]$/.test(v);

export function validatePorodniAsistence(D) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const ok = (cond, msg) => { checks += 1; if (!cond) errors.push(msg); return !!cond; };
  const T = 'pojistovny-porodni-asistence.json';
  if (!ok(isObj(D), `${T}: chybí nebo není objekt`)) return { errors, warnings, checks };
  for (const f of ['version', 'generated_at', 'stav_k', '_doc', 'zdroj', 'obdobi', 'predbezne', 'hlavni_obdobi', 'limity', 'cr', 'pojistovny']) {
    ok(D[f] != null, `${T} root: missing '${f}'`);
  }
  ok(isDate(D.stav_k), `${T}.stav_k: formát RRRR-MM-DD`);
  if (isObj(D.zdroj)) for (const f of ['nazev', 'pozadavek', 'vyrizeno', 'url']) ok(isStr(D.zdroj[f]), `${T}.zdroj.${f}: chybí`);
  const obdobi = Array.isArray(D.obdobi) ? D.obdobi : [];
  ok(obdobi.length > 0 && obdobi.every(isQ), `${T}.obdobi: neprázdné pole RRRRQn`);
  ok(Array.isArray(D.predbezne) && D.predbezne.every((q) => obdobi.includes(q)), `${T}.predbezne: jen období z obdobi`);
  ok(obdobi.includes(D.hlavni_obdobi), `${T}.hlavni_obdobi: musí být v obdobi`);
  ok(Array.isArray(D.limity) && D.limity.length > 0 && D.limity.every(isStr), `${T}.limity: neprázdné pole stringů`);
  const n = obdobi.length;

  const radaOk = (r, tag, nespolehlive = []) => {
    if (!ok(isObj(r), `${tag}.rada: chybí`)) return false;
    for (const m of METRIKY) {
      if (!ok(Array.isArray(r[m]) && r[m].length === n, `${tag}.rada.${m}: pole délky ${n}`)) return false;
    }
    for (const m of METRIKY.filter((x) => x !== 'zeny_na_100_porodu')) ok(r[m].every(isInt), `${tag}.rada.${m}: celá nezáporná čísla`);
    obdobi.forEach((q, i) => {
      const v = r.zeny_na_100_porodu[i];
      if (nespolehlive.includes(q)) { ok(v === null, `${tag} ${q}: nespolehlivé období musí mít zeny_na_100_porodu null`); return; }
      if (r.porody[i] === 0) { ok(v === null, `${tag} ${q}: bez porodů musí být null`); return; }
      ok(isNum(v) && Math.abs(v - (r.zeny[i] / r.porody[i]) * 100) <= 0.051, `${tag} ${q}: zeny_na_100_porodu ${v} ≠ ženy / porody × 100`);
      ok(r.zeny[i] <= r.vykony[i] || r.vykony[i] === 0, `${tag} ${q}: víc žen než výkonů`);
    });
    return true;
  };

  radaOk(D.cr?.rada, `${T} cr`);
  if (!ok(Array.isArray(D.pojistovny), `${T}.pojistovny: musí být pole`)) return { errors, warnings, checks };
  ok(D.pojistovny.length === KODY_ZP.length, `${T}: musí být ${KODY_ZP.length} pojišťoven (je ${D.pojistovny.length})`);
  const seen = new Set();
  for (const z of D.pojistovny) {
    const tag = `${T} ZP ${z?.kod ?? '?'}`;
    ok(KODY_ZP.includes(z?.kod), `${tag}: neznámý kód`);
    ok(!seen.has(z?.kod), `${tag}: duplicitní kód`);
    seen.add(z?.kod);
    ok(isStr(z?.zkratka), `${tag}.zkratka: chybí`);
    const nesp = Array.isArray(z?.nespolehliva_obdobi) ? z.nespolehliva_obdobi : null;
    if (ok(nesp, `${tag}.nespolehliva_obdobi: musí být pole`)) ok(nesp.every((q) => (D.predbezne || []).includes(q)), `${tag}.nespolehliva_obdobi: jen předběžná období`);
    radaOk(z?.rada, tag, nesp || []);
    if (ok(Array.isArray(z?.kraje), `${tag}.kraje: musí být pole`)) {
      for (const k of z.kraje) {
        const kt = `${tag} kraj ${k?.kod ?? '?'}`;
        ok(/^CZ0\d{2}$/.test(String(k?.kod)) && isStr(k?.nazev), `${kt}: kód NUTS3 a název`);
        ok(isInt(k?.porody) && k.porody > 0 && isInt(k?.zeny), `${kt}: porody > 0 a ženy`);
        ok(isNum(k?.zeny_na_100_porodu) && Math.abs(k.zeny_na_100_porodu - (k.zeny / k.porody) * 100) <= 0.051, `${kt}: zeny_na_100_porodu ≠ ženy / porody × 100`);
        ok(k?.maly_vzorek === (k.porody < 100), `${kt}: maly_vzorek musí odpovídat porody < 100`);
      }
    }
  }
  // součet porodů sedmi pojišťoven = Česko v každém čtvrtletí
  const radyZp = D.pojistovny.map((z) => z?.rada).filter(isObj);
  if (radyZp.length === KODY_ZP.length && isObj(D.cr?.rada) && Array.isArray(D.cr.rada.porody)) {
    obdobi.forEach((q, i) => {
      const sum = radyZp.reduce((a, r) => a + (r.porody?.[i] ?? 0), 0);
      ok(sum === D.cr.rada.porody[i], `${T} ${q}: součet porodů pojišťoven ${sum} ≠ Česko ${D.cr.rada.porody[i]}`);
    });
  }
  return { errors, warnings, checks };
}
