// FÁZE 1 rutiny „Střet zájmů v poradních orgánech MZ" (PROMPT_STRET_ZAJMU_ROUTINE.md).
// Staví data/ppo-coi.json: ověřené identity, doložené vazby (stupeň 1),
// relevance vůči předmětu orgánu (stupeň 2) a globální statistiky.
//
// ŽELEZNÉ PRAVIDLO (viz §0 zadání): střet zájmů není obvinění ani překážka
// členství. Builder popisuje STAV (kdo má jakou doloženou vazbu a co o tom
// orgán ví), nikoli úmysl. Stupeň 3+ (potenciální střet, doložený projev)
// FÁZE 1 nepočítá — vyžaduje párování na konkrétní rozhodnutí, viz fáze 3.
//
// Vše deterministické: stejné vstupy ⇒ bajtově stejný výstup (žádný Date.now,
// žádný Math.random). Spuštění: node ingest/ppo/build-coi.js (npm run build:coi)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data');

/* ── stupeň 1: identita ──────────────────────────────────────────────── */

// Znaky, kterými kurátorská poznámka dokládá totožnost. Pravidlo zadání §2:
// shoda jména nestačí, musí sedět aspoň DVA nezávislé znaky.
// Pozn.: poznámky používají několik zápisů ročníku („(*1970)", „nar. 1983",
// „roč. 1959") a názvy organizací se skloňují — vzory proto stojí na kmenech
// a připouštějí mezery uvnitř právních forem („z. s." i „z.s.").
const ZNAKY = [
  ['rocnik', /\(\s*\*\s*\d{4}|\bnar\.\s*\d{4}|\broč(\.|ník)\s*\d{4}|\*\s?\d{4}/i],
  ['organizace', /z\.\s?s\.|s\.\s?r\.\s?o\.|a\.\s?s\.|o\.\s?p\.\s?s\.|z\.\s?ú\.|nadac|ústav|společnost|asociac|komor|klinik|nemocnic|univerzit|fakult|institut|ministerstv|pojišťov|svaz|sdružen|spolk|fond|skupin/i],
  ['role_obor', /odpovíd|působ|profesor|docent|primář|ředitel|předsed|náměst|lékař|farmaceut|právník|zástupce|mikrobiolog|onkolog|epidemiolog|chirurg|internist|porodník|pediatr|sestra|ředitelk|člence|členem/i],
  // shoda s afiliací uvedenou v datech orgánu je samostatný ověřovací argument
  ['afiliace_shoda', /afiliac|shodn[éáý]|přesná shoda|shodné s/i],
  // jedinečnost jména v registru je nejsilnější znak — vylučuje záměnu osob
  ['unikatnost', /jedin[ýáéí]\w*\s+(nositel|profil|osob|jmenovky|jmenovec)|tatáž osoba|jediným? nositel/i],
];

/** Ověří identitu z kurátorské poznámky. Vrací {overeno, znaky}. */
export function overIdentitu(osoba) {
  const t = String(osoba?.identita ?? '');
  const znaky = ZNAKY.filter(([, re]) => re.test(t)).map(([k]) => k);
  return { overeno: znaky.length >= 2, znaky };
}

/* ── stupeň 1: klasifikace vazby ─────────────────────────────────────── */

// POZOR: veřejný rejstřík ani profil na Hlídači v našich datech neuvádí TYP
// role (statutární orgán × společník × zaměstnanec). Klasifikujeme proto jen
// povahu SUBJEKTU podle právní formy, ne roli člověka v něm.
const FORMY = [
  ['odborna_spolecnost', /z\.\s?s\.|spolek|odborná společnost|asociace|komora|unie|sdružení|society/i],
  ['nezisk', /o\.\s?p\.\s?s\.|nadac|nadační fond|obecně prospěšn|ústav\b/i],
  // pozor: \b za „a.s." nikdy nesedne — po tečce na konci názvu není hranice
  // slova, takže „Mediclinic a.s." propadalo do 'jine'
  ['obchodni', /s\.\s?r\.\s?o\.|a\.\s?s\.(?=$|[\s,;)])|spol\.\s?s\s?r\.\s?o\.|k\.\s?s\.(?=$|[\s,;)])|v\.\s?o\.\s?s\./i],
];

/** Povaha subjektu podle právní formy v názvu. */
export function klasifikujVazbu(nazev) {
  for (const [typ, re] of FORMY) if (re.test(String(nazev ?? ''))) return typ;
  return 'jine';
}

// Působí subjekt ve zdravotnictví? Rozhoduje se podle NÁZVU — rejstříkové obory
// (NACE) v našich datech nejsou. Vzor je záměrně PODinkluzivní: raději vazbu
// neoznačit než označit falešně. Bez tohoto testu R4 označovalo za relevantní
// i klub stolního tenisu nebo vodárnu (nález Codexu na PR #1085).
const OBOR_ZDRAVOTNICTVI = /nemocnic|klinik|poliklinik|zdravot|zdrav\.|medic|\bmed\b|med\b|lékár|lekar|lékař|pharm|farmac|dent|stomatolog|labor|ambulan|ordinac|rehabilit|hospic|diagnost|léčeb|léceb|sanator|optik|protet|ortoped|radiolog|onkolog|psychiatr|gyneko|pediatr|záchran|transfuz|imunolog|biotech|vakcín|zdravotnick/i;

/** Působí subjekt (podle názvu) ve zdravotnictví? */
export function jeZdravotnicky(nazev) {
  return OBOR_ZDRAVOTNICTVI.test(String(nazev ?? ''));
}

/* ── stupeň 2: relevance vůči předmětu orgánu ────────────────────────── */

const AGENDA = {
  // POZOR: obecné „financování", „rozpočet" či „regulace" sem NEPATŘÍ — jinak se
  // jako úhradový orgán tváří i Národní rada elektronického zdravotnictví
  // (predmet zmiňuje „včetně jeho financování") nebo Výbor pro umělou
  // inteligenci. Vzor musí zachytit rozhodování o úhradách, cenách a alokaci.
  uhrady: /úhrad|cen[aoěy]|cenov|bodov[éáý]|zdravotních výkon|seznam\w* výkon|kategorizac|smluvní politik|smluvní vztah|dohodovac[ií]|alokac/i,
  normy: /standard|doporučen|postup|metodik|vzdělávac|akreditac|screening|indikátor|kvalit/i,
  produkty: /léčiv|lék[oů]|zdravotnick\w* prostředk|očkov|vakcín|přípravk/i,
};

/** Které agendy orgán podle statutu řeší (z predmet + ucel). */
export function agendaOrganu(skupina) {
  const t = `${skupina?.predmet ?? ''} ${skupina?.ucel ?? ''} ${skupina?.nazev ?? ''}`;
  return Object.entries(AGENDA).filter(([, re]) => re.test(t)).map(([k]) => k);
}

// Konzervativní pravidla stupně 2. Každé nese id, aby šlo ve výstupu doložit,
// PROČ se překryv tvrdí. Při pochybnosti stupeň nezvyšujeme (zadání §3/C).
export const PRAVIDLA = [
  {
    id: 'R1',
    popis: 'člen za zdravotní pojišťovnu v orgánu rozhodujícím o úhradách nebo cenách',
    test: ({ kat, agenda }) => kat === 'pojistovna' && agenda.includes('uhrady'),
  },
  {
    id: 'R2',
    popis: 'člen za poskytovatele nebo jejich asociaci v orgánu rozhodujícím o úhradách nebo cenách',
    test: ({ kat, agenda }) => ['nemocnice', 'asociace_poskytovatelu'].includes(kat) && agenda.includes('uhrady'),
  },
  {
    id: 'R3',
    popis: 'vazba na odbornou společnost či komoru v orgánu tvořícím standardy, vzdělávání nebo screening',
    test: ({ kat, typy, agenda }) =>
      (kat === 'odborna_spolecnost' || kat === 'komora' || typy.has('odborna_spolecnost')) && agenda.includes('normy'),
  },
  {
    id: 'R4',
    popis: 'doložená vazba na obchodní společnost působící ve zdravotnictví v orgánu rozhodujícím o úhradách, lécích nebo prostředcích',
    test: ({ obchodniVeZdravotnictvi, agenda }) =>
      obchodniVeZdravotnictvi && (agenda.includes('uhrady') || agenda.includes('produkty')),
  },
];

/** Relevance jedné osoby vůči jednomu orgánu (stupeň 2). */
export function relevanceProSkupinu(osoba, skupina, vazby) {
  const agenda = agendaOrganu(skupina);
  if (!agenda.length) return null;
  // Stupeň 2 je RELEVANTNÍ VAZBA — bez doložené vazby (stupeň 1 se zdrojem
  // a datem) nesmí vzniknout. Kategorie členství sama o sobě vazba není.
  if (!vazby.length) return null;
  const typy = new Set(vazby.map(v => v.typ_subjektu));
  const obchodniVeZdravotnictvi = vazby.some(v => v.typ_subjektu === 'obchodni' && v.obor_zdravotnictvi);
  const ctx = { kat: osoba.kat, typy, obchodniVeZdravotnictvi, agenda };
  const sedi = PRAVIDLA.filter(p => p.test(ctx));
  if (!sedi.length) return null;
  return {
    g: skupina.id,
    stupen: 2,
    pravidla: sedi.map(p => p.id),
    proc: sedi.map(p => p.popis).join('; '),
    doklad: { typ: 'predmet_organu', cit: (skupina.predmet || skupina.ucel || '').slice(0, 240) },
  };
}

/* ── kontext orgánu: pravidlo ve statutu, deklarace v zápisech ───────── */

const RE_DOKUMENT = /statut|jednac|zrizovac|zřizovac/i;
const RE_STRET = /stř?et\w*\s+zájm|konflikt\w*\s+zájm|podjatost/i;

/** Sweep korpusu: které orgány mají strojově čitelný statut/JŘ a které v něm
 *  zmiňují střet zájmů. Čistá funkce nad polem dokumentů. */
export function statutovaPravidla(dokumenty) {
  const seStatutem = new Set();
  const sPravidlem = new Map();
  for (const d of dokumenty) {
    const jeDokument = RE_DOKUMENT.test(d.doctype || '') || RE_DOKUMENT.test(d.title || '');
    if (!jeDokument || !(d.text && d.text.length > 200)) continue;
    seStatutem.add(d.group_id);
    if (RE_STRET.test(d.text) && !sPravidlem.has(d.group_id)) {
      sPravidlem.set(d.group_id, { titul: d.title, url: d.url });
    }
  }
  return { seStatutem, sPravidlem };
}

/* ── hlavní build ────────────────────────────────────────────────────── */

export function buildCoi({ osoby, externi, skupiny, statut, deklarace, hlasovani, stavK }) {
  const skupinyById = new Map(skupiny.map(s => [s.id, s]));
  const externiById = new Map(externi.map(e => [e.id, e]));

  const osobyOut = [];
  for (const o of osoby) {
    const ext = externiById.get(o.id);
    if (!ext) continue;                       // jen 328 s profilem (fáze 1)
    const { overeno, znaky } = overIdentitu(ext);

    const vazby = (ext.firmy ?? []).map(f => ({
      subjekt: f.nazev,
      ico: f.ico,
      typ_subjektu: klasifikujVazbu(f.nazev),
      obor_zdravotnictvi: jeZdravotnicky(f.nazev),
      // rejstřík v našich datech NEUVÁDÍ typ role — netvrdíme ji
      role: 'vazba dle veřejného rejstříku, typ role není v datech uveden',
      zdroj_url: (ext.odkazy ?? [])[0]?.url ?? null,
      overeno_dne: externi.overeno ?? stavK,
    }));

    const relevance = overeno
      ? (o.clenstvi ?? [])
        .map(c => {
          const s = skupinyById.get(c.g);
          return s ? relevanceProSkupinu(o, s, vazby) : null;
        })
        .filter(Boolean)
      : [];

    osobyOut.push({
      id: o.id,
      overeno,
      identita_znaky: znaky,
      identita_pozn: ext.identita ?? null,
      funkce: ext.funkce ?? [],
      statni_zakazky: ext.statni_zakazky === true,
      vazby,
      relevance,
    });
  }

  const overeneOsoby = osobyOut.filter(o => o.overeno);
  const relevantniIds = new Set(overeneOsoby.filter(o => o.relevance.length).map(o => o.id));

  const skupinyOut = skupiny.map(s => {
    const clenove = osoby.filter(o => (o.clenstvi ?? []).some(c => c.g === s.id));
    const sProfilem = clenove.filter(o => externiById.has(o.id));
    const overeni = sProfilem.filter(o => osobyOut.find(x => x.id === o.id)?.overeno);
    const sVazbou = overeni.filter(o => (osobyOut.find(x => x.id === o.id)?.vazby ?? []).length);
    const sRelevanci = overeni.filter(o =>
      (osobyOut.find(x => x.id === o.id)?.relevance ?? []).some(r => r.g === s.id));
    return {
      g: s.id,
      clenu: clenove.length,
      clenu_s_profilem: sProfilem.length,
      clenu_overeno: overeni.length,
      s_vazbou: sVazbou.length,
      s_relevantni_vazbou: sRelevanci.length,
      agenda: agendaOrganu(s),
      ma_statut_v_korpusu: statut.seStatutem.has(s.id),
      ma_pravidlo_ve_statutu: statut.sPravidlem.has(s.id),
      pravidlo_doklad: statut.sPravidlem.get(s.id) ?? null,
      deklarace_v_zapisech: deklarace.get(s.id) ?? 0,
      rozhodnuti_s_hlasovanim: hlasovani.get(s.id) ?? 0,
    };
  });

  const podlePravidla = {};
  for (const o of overeneOsoby) {
    for (const r of o.relevance) for (const p of r.pravidla) {
      podlePravidla[p] = (podlePravidla[p] ?? 0) + 1;
    }
  }

  return {
    version: '1.0',
    stav_k: stavK,
    zdroj: 'data/ppo-osoby.json × ingest/ppo/osoby-externi.json × ingest/ppo/source/ppo_korpus_full.jsonl.gz',
    metodika: {
      zadani: 'PROMPT_STRET_ZAJMU_ROUTINE.md',
      stupne: '1 vazba · 2 relevantní vazba · 3 potenciální střet · 4 doložený projev · 5 porušení pravidla',
      faze: 'FÁZE 1 počítá stupně 1–2. Stupeň 3+ vyžaduje párování na konkrétní rozhodnutí (fáze 3).',
      klicove_pravidlo: 'Střet zájmů není obvinění ani překážka členství. Vazba, o které se ví, se dá ošetřit; '
        + 'ta, o které se neví, ne. Data popisují stav, nikoli úmysl.',
      limity: [
        'Ověřit šlo jen členy s profilem na Hlídači státu — všechny podíly se počítají z ověřené podmnožiny.',
        'Veřejný rejstřík vidí jen formální vazby; zaměstnanecký poměr, poradenská smlouva ani honorář v něm nejsou. '
          + 'Absence vazby v datech neznamená, že vazba neexistuje.',
        'Typ role ve firmě (statutární orgán × společník) v našich datech uveden není.',
        'Zápisy neuvádějí jmenovité hlasování, jen souhrnný poměr — nelze tvrdit, jak hlasoval konkrétní člen.',
        'U orgánů bez pravidla ve statutu není co porušit; chybějící pravidlo je výtka vůči ministerstvu, nikoli vůči členům.',
      ],
      pravidla_relevance: PRAVIDLA.map(p => ({ id: p.id, popis: p.popis })),
      znaky_identity: {
        pozn: 'Identita je ověřená, když kurátorská poznámka dokládá aspoň DVA nezávislé znaky (zadání §2).',
        tridy: ZNAKY.map(([k]) => k),
      },
    },
    pokryti: {
      osob_celkem: osoby.length,
      s_profilem: osobyOut.length,
      identita_overena: overeneOsoby.length,
      identita_neovereno: osobyOut.length - overeneOsoby.length,
      bez_profilu: osoby.length - osobyOut.length,
    },
    souhrn: {
      organu_celkem: skupiny.length,
      organu_se_statutem: skupinyOut.filter(s => s.ma_statut_v_korpusu).length,
      organu_s_pravidlem: skupinyOut.filter(s => s.ma_pravidlo_ve_statutu).length,
      organu_bez_statutu: skupinyOut.filter(s => !s.ma_statut_v_korpusu).length,
      organu_s_deklaraci_v_zapisech: skupinyOut.filter(s => s.deklarace_v_zapisech > 0).length,
      osob_s_vazbou: overeneOsoby.filter(o => o.vazby.length).length,
      osob_s_relevantni_vazbou: relevantniIds.size,
      osob_se_statni_zakazkou: overeneOsoby.filter(o => o.statni_zakazky).length,
      relevanci_podle_pravidla: podlePravidla,
      rozhodnuti_s_hlasovanim_v_organech_bez_pravidla: skupinyOut
        .filter(s => !s.ma_pravidlo_ve_statutu)
        .reduce((n, s) => n + s.rozhodnuti_s_hlasovanim, 0),
    },
    skupiny: skupinyOut,
    osoby: osobyOut,
  };
}

/* ── I/O ─────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const cti = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  const osoby = cti('ppo-osoby.json').osoby;
  const externiRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'osoby-externi.json'), 'utf8'));
  const externi = externiRaw.osoby;
  externi.overeno = externiRaw.overeno;
  const skupiny = cti('ppo.json').skupiny;

  const korpus = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'source', 'ppo_korpus_full.jsonl.gz')))
    .toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const statut = statutovaPravidla(korpus);

  // deklarace střetu zájmů v zápisech + rozhodnutí se stopou hlasování
  const deklarace = new Map();
  const hlasovani = new Map();
  const RE_HLAS = /\b(PRO|pro)\s*\d+\s*:\s*\d+\s*:\s*\d+|hlasován|jednomysln|per rollam|aklamac/i;
  const anaDir = path.join(DATA, 'ppo-analyza');
  for (const f of fs.readdirSync(anaDir)) {
    const a = JSON.parse(fs.readFileSync(path.join(anaDir, f), 'utf8'));
    for (const j of a.jednani ?? []) {
      const sz = j.stret_zajmu;
      const ma = Array.isArray(sz) ? sz.length > 0 : Boolean(sz && sz !== 'neuvedeno');
      if (ma) deklarace.set(a.group_id, (deklarace.get(a.group_id) ?? 0) + 1);
      for (const r of j.rozhodnuti ?? []) {
        if (RE_HLAS.test(typeof r === 'string' ? r : JSON.stringify(r))) {
          hlasovani.set(a.group_id, (hlasovani.get(a.group_id) ?? 0) + 1);
        }
      }
    }
  }

  const stavK = externiRaw.overeno ?? cti('ppo.json').stav_k ?? null;
  const out = buildCoi({ osoby, externi, skupiny, statut, deklarace, hlasovani, stavK });
  const p = path.join(DATA, 'ppo-coi.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 1) + '\n');

  // Lehký řez pro detail skupiny — bez pole `osoby`. Detail potřebuje jen
  // čísla svého orgánu a metodiku; stahovat kvůli tomu celý soubor (stovky kB)
  // by bylo zbytečné (stejný důvod jako u ppo-ukoly.json v build-web.js).
  const souhrn = {
    version: out.version,
    stav_k: out.stav_k,
    zdroj: out.zdroj,
    metodika: out.metodika,
    pokryti: out.pokryti,
    souhrn: out.souhrn,
    skupiny: out.skupiny,
  };
  const ps = path.join(DATA, 'ppo-coi-souhrn.json');
  fs.writeFileSync(ps, JSON.stringify(souhrn, null, 1) + '\n');

  console.log(`✓ data/ppo-coi.json (${(fs.statSync(p).size / 1024).toFixed(0)} kB)`
    + ` + ppo-coi-souhrn.json (${(fs.statSync(ps).size / 1024).toFixed(0)} kB)`);
  console.log(`  ověřeno ${out.pokryti.identita_overena}/${out.pokryti.s_profilem} osob s profilem `
    + `(z ${out.pokryti.osob_celkem} členů celkem)`);
  console.log(`  orgánů s pravidlem ve statutu: ${out.souhrn.organu_s_pravidlem}/${out.souhrn.organu_se_statutem} `
    + `(${out.souhrn.organu_bez_statutu} orgánů statut v korpusu nemá)`);
  console.log(`  osob s relevantní vazbou: ${out.souhrn.osob_s_relevantni_vazbou}`);
}
