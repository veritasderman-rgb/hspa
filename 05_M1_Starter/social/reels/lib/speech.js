// Řeč Kompíka: rozklad repliky na slova a slabiky + časování.
// Kompík nemluví lidským hlasem — „žvatlá" krátkými tóny po slabikách (styl
// Animal Crossing). Text nese bublina; zvuk dává rytmus a funguje i bez porozumění.
// Z rozvrhu slabik se počítá i otevírání pusy (lip-sync) a postupné odkrývání slov.

const VOWELS = 'aáeéěiíoóuúůyý';
const SYL_DUR = 0.135;     // s na slabiku
const PAUSE = { ',': 0.16, '—': 0.2, '–': 0.2, ':': 0.2, '.': 0.3, '?': 0.32, '!': 0.3, '…': 0.36 };

/** Odhad počtu slabik českého slova (skupiny samohlásek; slabikotvorné r/l). */
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž0-9]/g, '');
  if (!w) return 0;
  if (/^\d+$/.test(w)) return Math.max(1, Math.round(w.length * 1.5));
  let n = 0, prevV = false;
  for (const ch of w) {
    const v = VOWELS.includes(ch);
    if (v && !prevV) n++;
    prevV = v;
  }
  if (n === 0) n = 1;                       // „vlk", „krk", „s"
  return n;
}

/** Rozloží repliku: `Jen *šestnáct*.` → slova s příznakem zvýraznění. */
export function parseLine(line) {
  const out = [];
  let emph = false;
  for (const raw of String(line).split(/\s+/).filter(Boolean)) {
    let t = raw;
    const open = t.startsWith('*');
    if (open) { emph = true; t = t.slice(1); }
    const close = /\*[^a-zA-Z0-9á-žÁ-Ž]*$/.test(t);
    const word = { text: t.replace(/\*/g, ''), emph };
    out.push(word);
    if (close) emph = false;
  }
  return out;
}

/**
 * Rozvrh řeči od času t0.
 * @returns {{ words, syl: [{t0,t1,word,vowel,q}], end, wordStart: number[] }}
 */
export function schedule(line, t0, { rate = 1 } = {}) {
  const words = parseLine(line);
  const syl = [];
  const wordStart = [];
  let t = t0;
  const question = /\?\s*$/.test(line);
  words.forEach((wd, wi) => {
    wordStart.push(t);
    const n = syllables(wd.text);
    const vowelsInWord = (wd.text.toLowerCase().match(/[aáeéěiíoóuúůyý]/g) || ['a']);
    for (let k = 0; k < n; k++) {
      const d = (SYL_DUR / rate) * (wd.emph ? 1.25 : 1);
      syl.push({ t0: t, t1: t + d * 0.86, word: wi, vowel: vowelsInWord[k % vowelsInWord.length], q: false });
      t += d;
    }
    const punct = (wd.text.match(/[,.:?!…—–]+$/) || [''])[0].slice(-1);
    if (PAUSE[punct]) t += PAUSE[punct] / rate;
    else t += 0.04 / rate;
  });
  if (question) syl.slice(-3).forEach(s => { s.q = true; });
  return { words, syl, wordStart, end: t };
}

/** Otevření pusy 0..1 v čase t podle rozvrhu (mírně variuje podle samohlásky). */
export function mouthOpen(sched, t) {
  if (!sched) return 0;
  for (const s of sched.syl) {
    if (t >= s.t0 && t <= s.t1) {
      const k = (t - s.t0) / (s.t1 - s.t0);
      const v = 'aá'.includes(s.vowel) ? 1 : 'oóuúů'.includes(s.vowel) ? 0.75 : 0.6;
      return Math.sin(k * Math.PI) * v;
    }
  }
  return 0;
}
