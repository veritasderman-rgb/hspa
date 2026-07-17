// Doložka — „každé číslo nese svůj důkaz" (balíček A plánu PLAN-DOLOZKA.md)
//
// Čistý výpočetní modul bez DOM a bez fetch (testovatelný v node:test).
// Vstupem jsou záznamy z data/claims.json (registr kvantitativních tvrzení)
// a indikátory z data/indicators.json (datový kontrakt). Výstupem jsou:
//
//   - pozice citátů v normalizovaném textu článku (locateClaims),
//   - verdikt driftu tvrzení vůči kontraktu (driftStatus),
//   - agregované statistiky důvěryhodnosti (articleTrustStats, corpusTrustStats).
//
// Signatury exportů jsou ZÁVAZNÝ kontrakt — navazují na ně dolozka-inline.js
// (UI vrstva) a redakce.js (sekce Důvěryhodnost).

/** Konečné číslo? (odmítá null, undefined, NaN, ±Infinity, ne-čísla) */
function jeCislo(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

/**
 * Normalizace textu pro porovnávání: kolabuje libovolný whitespace
 * (včetně nezlomitelných mezer U+00A0 a newlinů) na jednu mezeru + trim.
 *
 * @param {string} s
 * @returns {string}
 */
export function normText(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\s ]+/g, ' ').trim();
}

/**
 * Vybere tvrzení patřící danému článku.
 *
 * @param {Array<object>} claims — pole .claims z data/claims.json
 * @param {string} slug — např. 'clanek-x.html'
 * @returns {Array<object>}
 */
export function claimsForArticle(claims, slug) {
  if (!Array.isArray(claims)) return [];
  return claims.filter((c) => c && c.article === slug);
}

/**
 * Najde pozice citátů (claim.quote) v normalizovaném textu článku.
 *
 * Pravidla:
 *  - needle = normText(quote BEZ inline HTML tagů) — část quotes v registru
 *    obsahuje markup (</a></strong>, <em>…</em>); DOM vrstva matchuje proti
 *    textContent, kde tagy nejsou (stejné stripování dělá claims-verify),
 *  - claims se STEJNÝM needle (např. „72 % vs. OECD 78 %" = dvě metriky
 *    v jedné citaci) se seskupí do jednoho výskytu — entry nese `claims`
 *    se všemi, `claim` je první z nich (zpětná kompatibilita),
 *  - skupiny se řadí podle délky needle SESTUPNĚ — při překryvu vyhrává
 *    delší quote, kratší překrývající se zahodí,
 *  - každý needle max 1× (první výskyt přes indexOf),
 *  - prázdný nebo nenalezený quote se přeskočí.
 *
 * @param {string} bodyText — normText() celého textu článku
 * @param {Array<object>} claims — tvrzení jednoho článku
 * @returns {Array<{claim: object, claims: Array<object>, start: number, end: number}>} seřazeno podle start
 */
export function locateClaims(bodyText, claims) {
  if (typeof bodyText !== 'string' || !bodyText || !Array.isArray(claims)) return [];

  // Seskupení podle needle (quote bez tagů, normalizovaný).
  const skupiny = new Map();
  for (const claim of claims) {
    const needle = normText(String(claim?.quote ?? '').replace(/<[^>]*>/g, ' '));
    if (!needle) continue;
    if (!skupiny.has(needle)) skupiny.set(needle, []);
    skupiny.get(needle).push(claim);
  }

  // Delší needle první (stabilní vůči překryvům).
  const kandidati = [...skupiny.entries()].sort((a, b) => b[0].length - a[0].length);

  /** Obsazené intervaly [start, end) — překrývající se kratší quotes zahodíme. */
  const obsazeno = [];
  const nalezeno = [];

  for (const [needle, grp] of kandidati) {
    const start = bodyText.indexOf(needle);
    if (start === -1) continue; // nenalezený quote přeskoč
    const end = start + needle.length;
    const koliduje = obsazeno.some((i) => start < i.end && end > i.start);
    if (koliduje) continue; // delší už místo drží
    obsazeno.push({ start, end });
    nalezeno.push({ claim: grp[0], claims: grp, start, end });
  }

  return nalezeno.sort((a, b) => a.start - b.start);
}

/** Počet desetinných míst čísla z jeho stringové reprezentace (bez floating-point šumu). */
function pocetDesetin(x) {
  const s = String(x);
  // Exponentní zápis (např. 1e-7) u reálných claims nenastává — bereme 0.
  if (s.includes('e') || s.includes('E')) return 0;
  const tecka = s.indexOf('.');
  return tecka === -1 ? 0 : s.length - tecka - 1;
}

/**
 * Odpovídá kontraktová hodnota tvrzení?
 *
 * True, když platí aspoň jedno:
 *  (a) contractValue zaokrouhlená na počet desetinných míst claimValue
 *      se rovná claimValue (epsilon 1e-9),
 *  (b) relativní odchylka |claim − contract| / |contract| * 100
 *      <= tolerancePct (contract ≠ 0). Výchozí tolerance 2 % — STEJNÁ jako
 *      v checkClaim nočního skeneru (scripts/nightly-scan.js), aby Doložka
 *      a noční audit dávaly konzistentní verdikty.
 *
 * @param {number} claimValue — hodnota v textu článku
 * @param {number|null} contractValue — aktuální hodnota datového kontraktu
 * @param {number} [tolerancePct=2] — tolerance v procentech (claim.tolerance_pct)
 * @returns {boolean} — contractValue null/NaN → false
 */
export function matchesContract(claimValue, contractValue, tolerancePct = 2) {
  if (!jeCislo(claimValue) || !jeCislo(contractValue)) return false;

  // (a) shoda po zaokrouhlení na desetinná místa claimu
  const desetin = pocetDesetin(claimValue);
  const faktor = 10 ** desetin;
  const zaokrouhleno = Math.round(contractValue * faktor) / faktor;
  if (Math.abs(zaokrouhleno - claimValue) <= 1e-9) return true;

  // (b) procentní tolerance
  const tol = jeCislo(tolerancePct) ? tolerancePct : 2;
  if (tol > 0 && contractValue !== 0) {
    const odchylkaPct = (Math.abs(claimValue - contractValue) / Math.abs(contractValue)) * 100;
    if (odchylkaPct <= tol) return true;
  }

  return false;
}

/**
 * Verdikt driftu jednoho tvrzení vůči datovému kontraktu.
 *
 * status:
 *  - 'current'    — relation exact + check auto + indikátor existuje + matchesContract
 *  - 'historical' — tvrzení je ukotvené ke staršímu roku (as_of < rok kontraktu)
 *                   a ODPOVÍDÁ trendovému bodu daného roku — správná citace
 *                   historie NENÍ drift (stejná sémantika jako checkClaim
 *                   nočního skeneru); nese i dnešní hodnotu kontraktu
 *  - 'changed'    — relation exact + check auto + indikátor existuje + NEmatchuje
 *                   (u historických proti trendovému bodu, jinak proti aktuálu)
 *  - 'reference'  — vše ostatní (manual/related/bez indicator_id/chybějící
 *                   indikátor, historické tvrzení bez trendového bodu) → bez verdiktu
 *
 * @param {object} claim — záznam z data/claims.json
 * @param {Map<string, object>} indicatorsById — Map z data/indicators.json
 * @returns {{status: string, indicator: object|null, contractValue?: number,
 *   contractYear?: number|null, historicalValue?: number, historicalYear?: number}}
 */
export function driftStatus(claim, indicatorsById) {
  const ind =
    claim?.indicator_id && indicatorsById instanceof Map
      ? indicatorsById.get(claim.indicator_id) ?? null
      : null;

  if (
    !claim ||
    claim.relation !== 'exact' ||
    claim.check !== 'auto' ||
    !claim.indicator_id ||
    !ind ||
    !jeCislo(ind.value)
  ) {
    return { status: 'reference', indicator: ind };
  }

  const contractYear = jeCislo(ind.year) ? ind.year : null;

  // Historické tvrzení (as_of starší než rok kontraktu): porovnat proti
  // trendovému bodu daného roku. Správná citace historie není drift.
  if (jeCislo(claim.as_of) && contractYear != null && claim.as_of < contractYear) {
    const bod = (ind.trend ?? []).find((t) => t && t.year === claim.as_of);
    if (bod && jeCislo(Number(bod.value))) {
      const shodaH = matchesContract(claim.value, Number(bod.value), claim.tolerance_pct);
      if (shodaH) {
        return {
          status: 'historical',
          indicator: ind,
          historicalValue: Number(bod.value),
          historicalYear: claim.as_of,
          contractValue: ind.value,
          contractYear,
        };
      }
      return {
        status: 'changed',
        indicator: ind,
        historicalValue: Number(bod.value),
        historicalYear: claim.as_of,
        contractValue: ind.value,
        contractYear,
      };
    }
    // Historické tvrzení bez trendového bodu — nelze ověřit, poctivá reference.
    return { status: 'reference', indicator: ind };
  }

  const shoda = matchesContract(claim.value, ind.value, claim.tolerance_pct);
  return {
    status: shoda ? 'current' : 'changed',
    indicator: ind,
    contractValue: ind.value,
    contractYear,
  };
}

/** Společný agregátor statusů přes seznam tvrzení. */
function spocitejStaty(claims, indicatorsById) {
  const stat = { total: 0, auto: 0, current: 0, historical: 0, changed: 0, reference: 0 };
  for (const claim of claims) {
    stat.total += 1;
    const { status } = driftStatus(claim, indicatorsById);
    stat[status] += 1;
    if (status === 'current' || status === 'historical' || status === 'changed') stat.auto += 1;
  }
  return stat;
}

/**
 * Statistika důvěryhodnosti jednoho článku (pro badge v hlavičce).
 *
 * @param {Array<object>} claims — celé pole .claims z data/claims.json
 * @param {string} slug — 'clanek-x.html'
 * @param {Map<string, object>} indicatorsById
 * @returns {{total: number, auto: number, current: number, changed: number, reference: number}}
 */
export function articleTrustStats(claims, slug, indicatorsById) {
  return spocitejStaty(claimsForArticle(claims, slug), indicatorsById);
}

/**
 * Statistika důvěryhodnosti celého korpusu (pro sekci na redakce.html).
 *
 * @param {Array<object>} claims — celé pole .claims z data/claims.json
 * @param {Map<string, object>} indicatorsById
 * @returns {{total: number, auto: number, current: number, changed: number, reference: number, articles: number}}
 */
export function corpusTrustStats(claims, indicatorsById) {
  const pole = Array.isArray(claims) ? claims : [];
  const stat = spocitejStaty(pole, indicatorsById);
  const slugy = new Set();
  for (const claim of pole) {
    if (claim?.article) slugy.add(claim.article);
  }
  return { ...stat, articles: slugy.size };
}
