// Jádro stránky Poplatky u lékaře (poplatky.html) — bez DOM, testované
// v tests/poplatky.test.js.
//
// Data: data/poplatky.json. Každá situace je malý rozhodovací strom podle
// jedné kazuistiky metodického stanoviska MZ z 8. 10. 2026: uzly s otázkou
// a možnostmi, listy = verdikty (ne / zalezi / ano / info) s paragrafem
// a doporučenými cestami (stížnost, kraj, pojišťovna, SÚKL, SFÚ).
//
// buildLetter() skládá text stížnosti nebo podnětu jen z toho, co uživatel
// vyplnil. Nic se neodesílá; text žije jen v prohlížeči.

export const VERDICT_TYPES = ['ne', 'zalezi', 'ano', 'info'];

export const VERDICT_LABELS = {
  ne: 'Nesmí',
  zalezi: 'Jen za podmínek',
  ano: 'Smí',
  info: 'Nejdřív ověřte',
};

/** Najde situaci podle id. */
export function findSituation(data, id) {
  return (data?.situace ?? []).find((s) => s.id === id) ?? null;
}

/**
 * Projde strom situace podle zvolených odpovědí (indexy možností).
 * Vrací { kind: 'question', id, node, trail } nebo { kind: 'verdict', id, verdict, trail }.
 * trail = [{ otazka, odpoved }] pro rekapitulaci.
 */
export function walk(situation, answers = []) {
  let key = situation.start;
  const trail = [];
  for (let i = 0; ; i++) {
    if (situation.verdikty?.[key]) {
      return { kind: 'verdict', id: key, verdict: situation.verdikty[key], trail };
    }
    const node = situation.uzly?.[key];
    if (!node) throw new Error(`Situace ${situation.id}: neznámý uzel ${key}`);
    if (i >= answers.length) return { kind: 'question', id: key, node, trail };
    const opt = node.moznosti[answers[i]];
    if (!opt) throw new Error(`Situace ${situation.id}: neplatná odpověď ${answers[i]} v uzlu ${key}`);
    trail.push({ otazka: node.otazka, odpoved: opt.label });
    key = opt.verdikt ?? opt.dalsi;
  }
}

/**
 * Strukturální kontrola dat — používá test i stránka (při chybě nic nerenderuje
 * napůl). Vrací seznam chyb (prázdný = v pořádku).
 */
export function validateData(data) {
  const errors = [];
  const cesty = data?.cesty ?? {};
  for (const s of data?.situace ?? []) {
    const where = `situace ${s.id}`;
    if (!s.label || !s.start) errors.push(`${where}: chybí label nebo start`);
    if (!s.dopis?.predmet || !s.dopis?.pravni) errors.push(`${where}: chybí dopis.predmet/pravni`);
    const uzly = s.uzly ?? {};
    const verdikty = s.verdikty ?? {};
    const reached = new Set();
    const visit = (key, depth) => {
      if (depth > 20) { errors.push(`${where}: cyklus u ${key}`); return; }
      reached.add(key);
      if (verdikty[key]) return;
      const node = uzly[key];
      if (!node) { errors.push(`${where}: odkaz na neexistující uzel ${key}`); return; }
      if (!node.otazka || !Array.isArray(node.moznosti) || node.moznosti.length < 1) {
        errors.push(`${where}: uzel ${key} bez otázky nebo možností`);
        return;
      }
      if (node.pomoc && !data.pomoc?.[node.pomoc]) errors.push(`${where}: uzel ${key} odkazuje na neznámou nápovědu ${node.pomoc}`);
      for (const o of node.moznosti) {
        const next = o.verdikt ?? o.dalsi;
        if (!o.label || !next) errors.push(`${where}: možnost v ${key} bez labelu nebo cíle`);
        else visit(next, depth + 1);
      }
    };
    visit(s.start, 0);
    for (const [k, v] of Object.entries(verdikty)) {
      if (!VERDICT_TYPES.includes(v.typ)) errors.push(`${where}: verdikt ${k} má neznámý typ ${v.typ}`);
      if (!v.titulek || !v.text || !v.law) errors.push(`${where}: verdikt ${k} bez titulku, textu nebo paragrafu`);
      for (const c of v.cesty ?? []) if (!cesty[c]) errors.push(`${where}: verdikt ${k} odkazuje na neznámou cestu ${c}`);
      if (!reached.has(k)) errors.push(`${where}: verdikt ${k} je nedosažitelný`);
    }
    for (const k of Object.keys(uzly)) if (!reached.has(k)) errors.push(`${where}: uzel ${k} je nedosažitelný`);
  }
  return errors;
}

// ── dopis ────────────────────────────────────────────────────────────────

export const LETTER_TYPES = {
  stiznost: { vec: 'Stížnost', adresat: '[název a adresa poskytovatele]' },
  kraj: { vec: 'Stížnost podle § 93 odst. 2 zákona o zdravotních službách', adresat: '[Krajský úřad … kraje / Magistrát hl. m. Prahy, odbor zdravotnictví]' },
  podnet: { vec: 'Podnět k prošetření přestupku', adresat: '[Krajský úřad … kraje / Magistrát hl. m. Prahy, odbor zdravotnictví]' },
  pojistovna: { vec: 'Stížnost na postup smluvního poskytovatele', adresat: '[název vaší zdravotní pojišťovny]' },
  sukl: { vec: 'Podnět k prošetření přestupku podle zákona o léčivech', adresat: 'Státní ústav pro kontrolu léčiv, Šrobárova 49/48, 100 00 Praha 10' },
};

const blank = (v, placeholder) => (v && String(v).trim()) ? String(v).trim() : `[${placeholder}]`;

/** „2026-10-08“ → „8. 10. 2026“; cokoli jiného vrátí beze změny. */
export function formatDateCz(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return iso ?? '';
  return `${Number(m[3])}. ${Number(m[2])}. ${m[1]}`;
}

/**
 * Složí text podání.
 * @param {object} data   data/poplatky.json
 * @param {object} f      hodnoty formuláře (typ, situace, adresat, jmeno, adresa,
 *                        kontakt, pojistovna, za, poskytovatel, datum, castka,
 *                        zaplaceno, popis, nesouhlas)
 * @param {Date}   today
 */
export function buildLetter(data, f, today = new Date()) {
  const typ = LETTER_TYPES[f.typ] ? f.typ : 'stiznost';
  const t = LETTER_TYPES[typ];
  const sit = findSituation(data, f.situace) ?? findSituation(data, 'jine');
  const predmet = sit?.dopis?.predmet ?? 'neoprávněný požadavek na platbu';
  const pravni = sit?.dopis?.pravni ?? '';
  const dnes = `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`;

  const poskytovatel = blank(f.poskytovatel, 'název a adresa poskytovatele, případně IČO');
  const datum = f.datum ? formatDateCz(f.datum) : '[datum]';
  const castka = f.castka && String(f.castka).trim() ? `${String(f.castka).trim()} Kč` : '[částka] Kč';

  const L = [];
  L.push(blank(f.jmeno, 'jméno a příjmení'));
  L.push(blank(f.adresa, 'adresa'));
  if (f.kontakt && f.kontakt.trim()) L.push(f.kontakt.trim());
  L.push('');
  L.push(blank(f.adresat, t.adresat.replace(/^\[|\]$/g, '')));
  L.push('');
  L.push(`V [místo] dne ${dnes}`);
  L.push('');
  L.push(`Věc: ${t.vec} – ${predmet}`);
  L.push('');
  L.push('Vážená paní, vážený pane,');
  L.push('');

  const za = f.za && f.za.trim() ? ` Podání činím ${f.za.trim()}.` : '';
  const pojist = f.pojistovna && f.pojistovna.trim() ? ` Jsem pojištěncem ${f.pojistovna.trim()}.` : '';

  const intro = {
    stiznost: `podávám stížnost podle § 93 odst. 1 zákona č. 372/2011 Sb., o zdravotních službách, proti postupu poskytovatele zdravotních služeb ${poskytovatel}.`,
    kraj: `podávám stížnost podle § 93 odst. 2 zákona č. 372/2011 Sb., o zdravotních službách, proti postupu poskytovatele zdravotních služeb ${poskytovatel}, který zdravotní služby poskytuje ve Vašem správním obvodu.`,
    podnet: `podávám podnět k prošetření přestupku podle § 42 zákona č. 500/2004 Sb., správní řád. Mám za to, že poskytovatel zdravotních služeb ${poskytovatel} mohl spáchat přestupek podle § 117 zákona č. 372/2011 Sb., o zdravotních službách (zejména odst. 2 písm. r) nebo s), případně odst. 3 písm. a) až c)).`,
    pojistovna: `jako pojištěnec Vaší zdravotní pojišťovny si stěžuji na postup Vašeho smluvního poskytovatele zdravotních služeb ${poskytovatel}.`,
    sukl: `podávám podnět k prošetření přestupku podle zákona č. 378/2007 Sb., o léčivech. Poskytovatel zdravotních služeb ${poskytovatel} po mně požadoval platbu za předání či zaslání identifikátoru elektronického receptu.`,
  }[typ];
  L.push(intro + pojist + za);
  L.push('');

  L.push(`Co se stalo: Dne ${datum} po mně poskytovatel požadoval platbu ve výši ${castka}; jde o ${predmet}.`);
  const zapl = {
    ne: 'Platbu jsem odmítl(a).',
    ano: 'Platbu jsem zaplatil(a); doklad o zaplacení přikládám.',
    odmitnut: 'Platbu jsem odmítl(a) a poskytovatel mě poté odmítl přijmout do péče, případně péči ukončil. Podle § 48 odst. 5 zákona o zdravotních službách mi měl vydat písemnou zprávu s uvedením důvodu.',
  }[f.zaplaceno] ?? '';
  if (zapl) L.push(zapl);
  if (f.popis && f.popis.trim()) {
    L.push('');
    L.push(f.popis.trim());
  }
  L.push('');

  if (typ === 'kraj') {
    L.push(`Stížnost jsem nejprve podal(a) poskytovateli. ${f.nesouhlas && f.nesouhlas.trim() ? f.nesouhlas.trim() : '[Kdy jsem obdržel(a) vyřízení stížnosti (případně že ho poskytovatel nevyřídil ve lhůtě 30 dnů) a proč s ním nesouhlasím.]'}`);
    L.push('');
  }

  if (pravni) {
    L.push(`Právní posouzení: ${pravni}`);
    L.push('');
  }

  const zadost = {
    stiznost: `Žádám o vyřízení stížnosti ve lhůtě podle § 93 odst. 3 písm. b) zákona o zdravotních službách${f.zaplaceno === 'ano' ? ' a o vrácení neoprávněně požadované částky' : ''}.`,
    kraj: 'Žádám o prošetření stížnosti a o uložení nápravných opatření. Současně žádám, abyste věc posoudili i jako možný přestupek podle § 117 zákona o zdravotních službách.',
    podnet: 'Podle § 42 správního řádu žádám, abyste mi ve lhůtě 30 dnů sdělili, zda jste zahájili řízení, nebo že jste neshledali důvody k zahájení řízení z moci úřední.',
    pojistovna: 'Žádám, abyste postup poskytovatele prověřili v rámci smluvního vztahu, zvážili podání podnětu příslušnému krajskému úřadu a podle § 46 odst. 1 ve spojení s § 40 odst. 3 zákona č. 48/1997 Sb. mi v případě potřeby zajistili poskytovatele, který mi hrazené služby poskytne bez platby.',
    sukl: 'Podle § 42 správního řádu žádám, abyste mi ve lhůtě 30 dnů sdělili, zda jste zahájili řízení, nebo že jste neshledali důvody k zahájení řízení z moci úřední.',
  }[typ];
  L.push(zadost);
  L.push('');
  L.push('Přílohy: [např. doklad o zaplacení, fotografie ceníku, SMS či e-mail, písemná zpráva poskytovatele, vyřízení stížnosti]');
  L.push('');
  L.push('S pozdravem');
  L.push('');
  L.push('');
  L.push(blank(f.jmeno, 'jméno a příjmení'));
  L.push('(podpis)');
  return L.join('\n');
}
