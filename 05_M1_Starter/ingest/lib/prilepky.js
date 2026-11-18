// Jádro odchytávače pozměňovacích návrhů mimo původní předmět zákona
// (zdravotnictví). Čisté funkce bez sítě a bez souborů: dostanou tisk, jeho
// historii a texty písemných pozměňovacích návrhů, vrátí signály.
//
// Co je „mimo předmět“: pozměňovací návrh mění zákon, který původní návrh
// neměnil. Nález popisuje postup a formu, ne politický obsah, a neříká, že jde
// o protiústavní přílepek (to posuzuje Ústavní soud, nález Pl. ÚS 77/06).
// Plán a metodika: PLAN-PRILEPKY.md.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadHealthLaws(file = path.join(__dirname, '..', 'mapping', 'zdravotnicke-zakony.json')) {
  const { zakony } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(zakony.map(z => [z.cislo, z.nazev]));
}

export const SIGNALY = {
  zdravotnicky_zakon_v_cizim_tisku: 'Pozměňovací návrh mění zdravotnický zákon v tisku, který se zdravotnictví netýkal.',
  cizi_zakon_ve_zdravotnickem_tisku: 'Pozměňovací návrh ke zdravotnickému tisku mění zákon z jiné oblasti.',
  jiny_zdravotnicky_zakon: 'Pozměňovací návrh mění další zdravotnický zákon, který původní návrh neměnil.',
  bez_pripominkoveho_rizeni: 'Návrh nepředložila vláda, takže neprošel meziresortním připomínkovým řízením.',
  navrh_schvalit_v_prvnim_cteni: 'Navrženo schválit už v prvním čtení (§ 90 odst. 2 jednacího řádu).',
  zmena_ucinnosti: 'Pozměňovací návrh mění datum účinnosti.',
};

const VYSOKA = new Set(['zdravotnicky_zakon_v_cizim_tisku', 'cizi_zakon_ve_zdravotnickem_tisku']);
const STREDNI = new Set(['jiny_zdravotnicky_zakon']);

export function urovenZe(signaly) {
  if (signaly.some(s => VYSOKA.has(s))) return 'vysoka';
  if (signaly.some(s => STREDNI.has(s))) return 'stredni';
  return signaly.length ? 'nizka' : null;
}

const norm = s => String(s ?? '').replace(/[   ]/g, ' ');
const cislo = (n, r) => `${Number(n)}/${r}`;

/** Všechna čísla zákonů zmíněná v textu („č. 48/1997 Sb.“), bez opakování. */
export function extractLawRefs(text) {
  const out = new Set();
  for (const m of norm(text).matchAll(/č\.\s*(\d{1,4})\s*\/\s*(\d{4})\s*Sb\./g)) out.add(cislo(m[1], m[2]));
  return [...out];
}

// Hlavička novelizace: „Zákon č. X Sb., …, se mění takto:“ nebo „V zákoně č. X Sb. …
// se …“. Velké písmeno odlišuje hlavičku od výčtu novel („ve znění zákona č. …“).
const HEAD_RE = /(?:Zákon|V\s+zákoně|V\s+zákonu)\s+č\.\s*(\d{1,4})\s*\/\s*(\d{4})\s*Sb\./g;
const VERB_RE = /(?<!\p{L})se\s+(?:.{0,400}?\s)?(?:mění|doplňuje|doplňují|vkládá|vkládají|zrušuje|zrušují|nahrazuje|nahrazují)(?!\p{L})/su;
const MAX_TAIL = 12000; // výčet novel u zákona č. 48/1997 Sb. má tisíce znaků

/**
 * Zákony, které text skutečně novelizuje (ne jen zmiňuje).
 * @returns {{cislo: string, citace: string}[]}
 */
export function amendedLaws(text) {
  const t = norm(text);
  const heads = [...t.matchAll(HEAD_RE)];
  const out = new Map();
  heads.forEach((m, i) => {
    const start = m.index;
    const end = Math.min(i + 1 < heads.length ? heads[i + 1].index : t.length, start + MAX_TAIL);
    const verb = VERB_RE.exec(t.slice(start, end));
    if (!verb) return;
    const c = cislo(m[1], m[2]);
    if (out.has(c)) return;
    // Citace: začátek hlavičky + okolí slovesa, doslovně z textu.
    const head = t.slice(start, Math.min(start + 160, start + verb.index)).replace(/\s+/g, ' ').trim();
    const tail = t.slice(start + verb.index, Math.min(end, start + verb.index + 220)).replace(/\s+/g, ' ').trim();
    out.set(c, { cislo: c, citace: verb.index > 160 ? `${head} … ${tail}` : `${head} ${tail}`.trim() });
  });
  return [...out.values()];
}

/** Mění text datum účinnosti? Vrací doslovný úryvek, nebo null. */
export function effectivityChange(text) {
  const t = norm(text).replace(/\s+/g, ' ');
  const m = /[^.]{0,160}nabývá\s+účinnosti[^.]{0,200}\./.exec(t);
  return m ? m[0].trim() : null;
}

const KLICOVA_SLOVA = /zdravotn|léčiv|lékař|lékárn|nemocnic|pojišťov[en]\w* .{0,40}zdrav|hygien|návykov/i;

/** Rozbor jednoho pozměňovacího návrhu; výsledek se ukládá, text ne. */
export function analyzeAmendment(text) {
  return { zmeny: amendedLaws(text), ucinnost: effectivityChange(text) };
}

/** Je tisk zdravotnický? Podle zákonů v předmětu, předkladatele a názvu. */
export function isHealthTisk(tisk, scope, healthLaws) {
  if (scope.some(c => healthLaws.has(c))) return true;
  if (/zdravotnictv/i.test(tisk.predkladatel ?? '')) return true;
  return KLICOVA_SLOVA.test(tisk.uplny_nazev ?? tisk.nazev ?? '');
}

/** Název slibuje i změny zákonů, které nevyjmenovává („a další související zákony“, „o změně některých zákonů“). */
export function scopeFromTitleIncomplete(nazev) {
  return /(dalších|další|některých|některé|souvisejících|související)\s+(souvisejících\s+|dalších\s+)?zákon/i.test(nazev ?? '');
}

/**
 * Předmět tisku: zákony, které mění původní návrh. Z textu návrhu, když ho
 * máme; jinak z úplného názvu. „a další související zákony“ v názvu znamená,
 * že výčet z názvu není úplný (predmet_neuplny).
 */
export function tiskScope(tisk) {
  if (Array.isArray(tisk.predmet_z_textu)) {
    return { zakony: [...new Set([...extractLawRefs(tisk.uplny_nazev ?? ''), ...tisk.predmet_z_textu])], neuplny: false };
  }
  const zTextu = tisk.text ? amendedLaws(tisk.text.split(/D\s?ů\s?v\s?o\s?d\s?o\s?v\s?á\s+z\s?p\s?r\s?á\s?v\s?a|DŮVODOVÁ\s+ZPRÁVA/)[0]).map(a => a.cislo) : [];
  const zNazvu = extractLawRefs(tisk.uplny_nazev ?? '');
  const zakony = [...new Set([...zNazvu, ...zTextu])];
  const neuplny = !tisk.text && scopeFromTitleIncomplete(tisk.uplny_nazev);
  return { zakony, neuplny };
}

/**
 * Vyhodnotí jeden tisk.
 * @param {{ct:number, nazev:string, uplny_nazev?:string, predkladatel_typ?:string, predkladatel?:string,
 *          text?:string, navrzeno_90_2?:boolean}} tisk
 * @param {{cd:number|string, autor?:string, datum?:string, url?:string, text?:string, zmeny?:object[], ucinnost?:string|null}[]} navrhy
 *        buď s textem, nebo s hotovým rozborem (analyzeAmendment)
 * @param {Map<string,string>} healthLaws
 * @returns {null | object} null = tisk se zdravotnictví netýká a nic v něm není
 */
export function evaluateTisk(tisk, navrhy, healthLaws) {
  const scope = tiskScope(tisk);
  const zdravotnicky = isHealthTisk(tisk, scope.zakony, healthLaws);
  const inScope = new Set(scope.zakony);

  const outNavrhy = [];
  for (const pn of navrhy ?? []) {
    if (!pn.zmeny && !pn.text) continue;
    const rozbor = pn.zmeny ? pn : analyzeAmendment(pn.text);
    const amended = rozbor.zmeny;
    const mimo = amended.filter(a => !inScope.has(a.cislo));
    const signaly = [];
    if (!zdravotnicky && mimo.some(a => healthLaws.has(a.cislo))) signaly.push('zdravotnicky_zakon_v_cizim_tisku');
    if (zdravotnicky && mimo.some(a => !healthLaws.has(a.cislo))) signaly.push('cizi_zakon_ve_zdravotnickem_tisku');
    if (zdravotnicky && mimo.some(a => healthLaws.has(a.cislo))) signaly.push('jiny_zdravotnicky_zakon');
    // V cizím tisku nás zajímají jen zdravotnické zákony; ostatní přílepky řeší obecné nástroje.
    const relevantni = zdravotnicky ? mimo : mimo.filter(a => healthLaws.has(a.cislo));
    if (!signaly.length) continue;
    if (rozbor.ucinnost) signaly.push('zmena_ucinnosti');
    outNavrhy.push({
      cd: Number(pn.cd),
      autor: pn.autor ?? null,
      datum: pn.datum ?? null,
      url: pn.url ?? null,
      meni_zakony: amended.map(a => a.cislo),
      mimo_predmet: relevantni.map(a => ({
        cislo: a.cislo,
        nazev: healthLaws.get(a.cislo) ?? null,
        zdravotnicky: healthLaws.has(a.cislo),
        citace: a.citace,
      })),
      signaly,
      uroven: urovenZe(signaly),
    });
  }

  const signalyTisku = [];
  if (zdravotnicky && tisk.predkladatel_typ && tisk.predkladatel_typ !== 'vlada') signalyTisku.push('bez_pripominkoveho_rizeni');
  if (zdravotnicky && tisk.navrzeno_90_2) signalyTisku.push('navrh_schvalit_v_prvnim_cteni');

  if (!outNavrhy.length && !signalyTisku.length) return null;

  const order = { vysoka: 0, stredni: 1, nizka: 2 };
  outNavrhy.sort((a, b) => order[a.uroven] - order[b.uroven] || a.cd - b.cd);
  const uroven = outNavrhy.length ? outNavrhy[0].uroven : urovenZe(signalyTisku);
  return {
    ct: Number(tisk.ct),
    nazev: tisk.nazev,
    uplny_nazev: tisk.uplny_nazev ?? null,
    predkladatel_typ: tisk.predkladatel_typ ?? null,
    predkladatel: tisk.predkladatel ?? null,
    predlozeno: tisk.predlozeno ?? null,
    stav: tisk.stav ?? null,
    url: tisk.url ?? null,
    zdravotnicky,
    predmet: scope.zakony,
    predmet_neuplny: scope.neuplny,
    signaly: signalyTisku,
    uroven,
    navrhy: outNavrhy,
  };
}
