// Parser tabulek „Přerozdělování pojistného“ Ministerstva zdravotnictví (PDF → pdftotext -layout).
//
// Tabulky `prerozdelovani_pojistovna_vyber_*.pdf` (částka vybraná na pojistném, tzv. 100% výběr) a
// `prerozdelovani_pojistovna_vysledek_*.pdf` (výsledná částka po přerozdělení) mají stejnou stavbu:
// bloky po letech, hlavička „RRRR   1/RRRR  2/RRRR …“, řádky „Název (kód) 12 čísel“ (tis. Kč, mezera jako
// oddělovač tisíců) a dva součtové řádky („Celkem zaměstnanecké zdravotní pojišťovny“, „Celkem zdravotní
// pojišťovny“). Čísla od sebe odděluje jediná mezera stejně jako tisíce, proto je rozdělení do sloupců
// určené polohou pravého okraje čísla pod hlavičkou měsíce (sloupce jsou v PDF zarovnané doprava).
// Chybějící měsíce (rok, který ještě neskončil) = null; nic se neodhaduje.

export const KODY = ['111', '201', '205', '207', '209', '211', '213'];

/** Skupiny číslic z textu za názvem řádku: [{txt, end}] (end = index za poslední číslicí). */
function tokeny(text) {
  const out = [];
  const re = /\d+/g;
  let m;
  while ((m = re.exec(text))) out.push({ txt: m[0], end: m.index + m[0].length });
  return out;
}

/**
 * Je posloupnost skupin platné číslo? První 1–3 číslice (bez nuly na začátku), další přesně 3;
 * nejvýš 3 skupiny (do 999 999 999) a aspoň `min` skupin (hodnoty v těchto tabulkách jsou ≥ 1 000).
 */
function platneCislo(tok, od, do_, min = 2) {
  const n = do_ - od;
  if (n < min || n > 3) return false;
  const first = tok[od].txt;
  if (first.length > 3 || (first.length > 1 && first[0] === '0')) return false;
  for (let i = od + 1; i < do_; i++) if (tok[i].txt.length !== 3) return false;
  return true;
}

/**
 * Rozdělí skupiny číslic řádku do N čísel tak, aby jejich pravé okraje co nejlépe seděly na pravé okraje
 * sloupců hlavičky. Vrací { hodnoty, cena } nebo null, když rozdělení neexistuje.
 */
export function rozdel(tok, hlavickaEnds, N) {
  const T = tok.length;
  if (N < 1 || N > hlavickaEnds.length || T < N) return null;
  const INF = Infinity;
  // dp[i][k] = minimální cena rozdělení prvních i skupin na k čísel
  const dp = Array.from({ length: T + 1 }, () => new Array(N + 1).fill(INF));
  const back = Array.from({ length: T + 1 }, () => new Array(N + 1).fill(-1));
  dp[0][0] = 0;
  for (let i = 1; i <= T; i++) {
    for (let k = 1; k <= Math.min(N, i); k++) {
      for (let j = i - 1; j >= k - 1; j--) {
        if (dp[j][k - 1] === INF) continue;
        if (!platneCislo(tok, j, i)) { if (i - j > 3) break; continue; }
        const c = dp[j][k - 1] + Math.abs(tok[i - 1].end - hlavickaEnds[k - 1]);
        if (c < dp[i][k]) { dp[i][k] = c; back[i][k] = j; }
      }
    }
  }
  if (dp[T][N] === INF) return null;
  const hodnoty = [];
  let i = T;
  for (let k = N; k >= 1; k--) {
    const j = back[i][k];
    hodnoty.unshift(Number(tok.slice(j, i).map((t) => t.txt).join('')));
    i = j;
  }
  return { hodnoty, cena: dp[T][N] };
}

const RE_KOD = /\((\d{3})\)\s*(.*)$/;

/**
 * Parser textu z pdftotext -layout.
 * @returns {{ roky: Record<string, Record<string, (number|null)[]>>, celkem: Record<string,(number|null)[]>, zamestnanecke: Record<string,(number|null)[]> }}
 *   roky[rok][kod] = 12 hodnot (tis. Kč, null = měsíc ještě není); celkem[rok] a zamestnanecke[rok] = řádky součtů.
 */
export function parseVyber(text) {
  const radky = String(text).split(/\r?\n/);
  const roky = {};
  const celkem = {};
  const zamestnanecke = {};
  let blok = null; // { rok, ends[], radky: [{klic, tok}] }

  const uzavri = () => {
    if (!blok) return;
    const M = blok.ends.length;
    // počet vyplněných sloupců bloku = N s nejnižší celkovou cenou přes všechny řádky
    let nejlepsi = null;
    for (let N = 1; N <= M; N++) {
      let suma = 0;
      let ok = true;
      for (const r of blok.radky) {
        const x = rozdel(r.tok, blok.ends, N);
        if (!x) { ok = false; break; }
        suma += x.cena;
      }
      if (ok && (!nejlepsi || suma < nejlepsi.suma)) nejlepsi = { N, suma };
    }
    if (nejlepsi && blok.radky.length) {
      const rok = blok.rok;
      roky[rok] = {};
      for (const r of blok.radky) {
        const h = rozdel(r.tok, blok.ends, nejlepsi.N).hodnoty;
        const rada = [...h, ...new Array(M - h.length).fill(null)];
        if (r.klic === 'celkem') celkem[rok] = rada;
        else if (r.klic === 'zamestnanecke') zamestnanecke[rok] = rada;
        else roky[rok][r.klic] = rada;
      }
    }
    blok = null;
  };

  for (const radek of radky) {
    const h = radek.match(/^\s*(\d{4})\s+1\/\d{4}\b/);
    if (h) {
      uzavri();
      const ends = [];
      const re = /\b(\d{1,2})\/(\d{4})\b/g;
      let m;
      while ((m = re.exec(radek))) ends.push(m.index + m[0].length);
      blok = { rok: h[1], ends, radky: [] };
      continue;
    }
    if (!blok) continue;
    let klic = null;
    let zbytek = null;
    const k = radek.match(RE_KOD);
    if (k && KODY.includes(k[1])) { klic = k[1]; zbytek = k[2]; }
    else if (/^\s*Celkem zaměstnanecké/i.test(radek)) { klic = 'zamestnanecke'; zbytek = radek.replace(/^\s*Celkem zaměstnanecké zdravotní pojišťovny/i, ''); }
    else if (/^\s*Celkem zdravotní pojišťovny/i.test(radek)) { klic = 'celkem'; zbytek = radek.replace(/^\s*Celkem zdravotní pojišťovny/i, ''); }
    if (!klic) continue;
    const offset = radek.length - zbytek.length;
    const tok = tokeny(zbytek).map((t) => ({ txt: t.txt, end: t.end + offset }));
    if (tok.length) blok.radky.push({ klic, tok });
  }
  uzavri();
  return { roky, celkem, zamestnanecke };
}

/** Sloučí více parsovaných souborů; novější soubor (později v poli) vyhrává, rozdíly v překryvu se hlásí. */
export function sloucitParsovane(parsovane) {
  const roky = {};
  const rozdily = [];
  for (const p of parsovane) {
    for (const [rok, r] of Object.entries(p.roky)) {
      const cil = (roky[rok] ??= {});
      const radky = { ...r, celkem: p.celkem[rok], zamestnanecke: p.zamestnanecke[rok] };
      for (const [k, rada] of Object.entries(radky)) {
        if (!rada) continue;
        const stara = cil[k];
        if (stara) {
          rada.forEach((v, i) => { if (v !== null && stara[i] !== null && stara[i] !== v) rozdily.push(`${rok}/${k}/${i + 1}: ${stara[i]} vs ${v}`); });
          // starší null se doplní z novějšího, jinak platí novější
          cil[k] = rada.map((v, i) => (v !== null ? v : stara[i] ?? null));
        } else cil[k] = rada.slice();
      }
    }
  }
  return { roky, rozdily };
}

/** Kontrola: součet 7 ZP = řádek „Celkem“ (±tol tis. Kč) a součet zaměstnaneckých = řádek zaměstnanecké. */
export function zkontrolujSoucty(roky, tol = 2) {
  const chyby = [];
  if (!roky) return chyby;
  for (const [rok, r] of Object.entries(roky)) {
    const M = r.celkem?.length ?? 0;
    for (let i = 0; i < M; i++) {
      const vals = KODY.map((k) => r[k]?.[i]);
      if (vals.some((v) => v == null)) {
        if (vals.some((v) => v != null)) chyby.push(`${rok}/${i + 1}: část pojišťoven chybí`);
        continue;
      }
      const sum = vals.reduce((a, b) => a + b, 0);
      if (r.celkem[i] == null || Math.abs(sum - r.celkem[i]) > tol) chyby.push(`${rok}/${i + 1}: Σ 7 ZP ${sum} ≠ celkem ${r.celkem[i]}`);
      if (r.zamestnanecke?.[i] != null) {
        const z = vals.slice(1).reduce((a, b) => a + b, 0);
        if (Math.abs(z - r.zamestnanecke[i]) > tol) chyby.push(`${rok}/${i + 1}: Σ zaměstnaneckých ${z} ≠ řádek ${r.zamestnanecke[i]}`);
      }
    }
  }
  return chyby;
}

// ---------------------------------------------------------------------------------- názvy souborů MZ

export const MZ_STRANKA = 'https://mzd.gov.cz/prerozdelovani-pojistneho-na-verejne-zdravotni-pojisteni/';
export const MZ_UPLOADS = 'https://mzd.gov.cz/wp-content/uploads/2014/11/';

/** Odkazy na PDF s výběrem / výsledkem přerozdělení ze stránky MZ: [{typ, rok, mesic, soubor, url}]. */
export function parseOdkazy(html) {
  const out = new Map();
  const re = /(?:https?:\/\/[^\s"'<>]*?\/)?(prerozdelovani_pojistovna_(vyber|vysledek)_(\d{4})_(\d{2})\.pdf)/gi;
  let m;
  while ((m = re.exec(String(html)))) {
    const soubor = m[1].toLowerCase();
    out.set(soubor, { typ: m[2].toLowerCase(), rok: Number(m[3]), mesic: Number(m[4]), soubor, url: MZ_UPLOADS + soubor });
  }
  return [...out.values()].sort((a, b) => a.typ.localeCompare(b.typ) || a.rok - b.rok || a.mesic - b.mesic);
}

/** Nejnovější soubor daného typu z odkazů (podle roku a měsíce v názvu), nebo null. */
export function nejnovejsi(odkazy, typ) {
  const s = odkazy.filter((o) => o.typ === typ);
  return s.length ? s.reduce((a, b) => (b.rok * 100 + b.mesic > a.rok * 100 + a.mesic ? b : a)) : null;
}

// ---------------------------------------------------------------------------------- výstupní JSON

/**
 * Sestaví obsah ingest/manual/pojistovny/prerozdeleni-mz-vyber.json ve stejném tvaru jako
 * prerozdeleni-mz-pojistovna.json (roky → kód → řada měsíců, tis. Kč), navíc řádek zamestnanecke.
 * @param {{ vyber: {roky:object}, vysledekDoplnek?: {roky:object}|null, soubory: string[], souboryDoplnek?: string[], overeno: string }} v
 */
/** Ořízne koncové null (měsíce, které MZ ještě nezveřejnilo) — stejný tvar jako prerozdeleni-mz-pojistovna.json. */
export function orizniRoky(roky) {
  const out = {};
  for (const rok of Object.keys(roky).sort()) {
    const r = roky[rok];
    const n = Math.max(...Object.values(r).map((a) => { let k = a.length; while (k > 0 && a[k - 1] === null) k--; return k; }));
    out[rok] = Object.fromEntries(Object.entries(r).map(([k, a]) => [k, a.slice(0, n)]));
  }
  return out;
}

export function sestavVyberJson({ vyber, vysledekDoplnek = null, soubory, souboryDoplnek = [], overeno, stazeno_at = null }) {
  const roky = orizniRoky(vyber.roky);
  const out = {
    _doc: 'Částka vybraná na pojistném na veřejné zdravotní pojištění po pojišťovnách (tzv. 100% výběr; tis. Kč, měsíčně) a řádky „Celkem zaměstnanecké zdravotní pojišťovny“ (zamestnanecke) a „Celkem zdravotní pojišťovny“ (celkem). Přepsáno strojově z PDF Ministerstva zdravotnictví (stránka Přerozdělování pojistného na veřejné zdravotní pojištění, soubor prerozdelovani_pojistovna_vyber_<rok>_<měsíc>.pdf; řada 2019–2021 v souboru 2021_12, 2022–2024 v 2024_12, 2024–2026 v nejnovějším souboru; překryv 2024 je shodný) parserem ingest/lib/mz-prerozdeleni.js, spouští ingest/fetchers/mz-prerozdeleni.js. Součet sedmi ZP odpovídá řádku „Celkem“ s odchylkou nejvýše 2 tis. Kč (zaokrouhlení v PDF). Měsíce, které MZ ještě nezveřejnilo, zde nejsou (rok 2026 má jen zveřejněné měsíce). Sekce doplnek_po_prerozdeleni nese výslednou částku po přerozdělení na pojišťovnu (stejná tabulka jako prerozdeleni-mz-pojistovna.json) za roky 2019–2021, které MZ zveřejnilo v souboru prerozdelovani_pojistovna_vysledek_2021_12.pdf; do prerozdeleni-mz-pojistovna.json se nepřidávají, protože měsíční kmen (ingest/transform_pojistovny_kmen_mesicni.js) začíná v lednu 2022. Spojeno v data/pojistovny-prerozdeleni.json (ingest/transform_pojistovny_prerozdeleni.js). Časová osa: sloupec „1/2024“ je měsíc přerozdělení a obsahuje výběr za předchozí kalendářní měsíc (§ 21 odst. 1 písm. c) a § 21b odst. 1 zákona č. 592/1992 Sb.); součet sloupců 2/Y až 1/Y+1 odpovídá „výběru“ v Tab. 1 Hodnocení MZ (oddíl B).',
    zdroj: {
      nazev: 'MZ ČR · Přerozdělování pojistného na veřejné zdravotní pojištění · Částka vybraná na pojistném (tzv. 100% výběr) dle pojišťoven',
      url: MZ_STRANKA,
      soubory,
      overeno,
      ...(stazeno_at ? { stazeno_at } : {}),
      jednotka: 'tis. Kč za měsíc',
    },
    roky,
  };
  if (vysledekDoplnek) {
    const r = orizniRoky(vysledekDoplnek.roky);
    out.doplnek_po_prerozdeleni = {
      zdroj: {
        nazev: 'MZ ČR · Přerozdělování pojistného na veřejné zdravotní pojištění · Výsledná částka po přerozdělení připadající na pojišťovnu',
        url: MZ_STRANKA,
        soubory: souboryDoplnek,
        overeno,
        jednotka: 'tis. Kč za měsíc',
      },
      roky: r,
    };
  }
  return out;
}

/** Čitelná serializace: pole čísel na jednom řádku. */
export function serializuj(obj) {
  const s = JSON.stringify(obj, null, 2);
  const pole = /\[\s*(?:-?\d+|null)(?:,\s*(?:-?\d+|null))*\s*\]/g;
  return `${s.replace(pole, (m) => m.replace(/\s*\n\s*/g, ' ').replace(/^\[ /, '[').replace(/ \]$/, ']'))}\n`;
}
