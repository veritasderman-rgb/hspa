// Tři židle — sdílený stav herní kampaně (bez DOM, testovatelný).
//
// Kampaň ministr → ředitel nemocnice → pacient si předává VSTUPY hráče
// (alokace, rozhodnutí) přes localStorage; verdikt vždy přepočítají enginy
// jednotlivých aktů. Sdílecí kód je base64url serializace týchž vstupů —
// žádný backend, žádné cookies. Viz PLAN-TRI-ZIDLE.md.

export const STORAGE_KEY = 'zdrave-cesko/hra';
export const STATE_VERSION = 1;

/** Povolené akty kampaně (pořadí = pořadí v kampani). */
export const ACTS = ['ministr', 'reditel', 'pacient'];

export function emptyState() {
  return { version: STATE_VERSION, ministr: null, reditel: null, pacient: null };
}

function defaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // privátní režim — kampaň se nepřenáší, akty fungují samostatně
  }
}

/**
 * Načte stav kampaně. Neznámá verze nebo poškozený JSON → prázdný stav
 * (hra se nikdy nerozbije kvůli starému stavu).
 */
export function loadState(storage = defaultStorage()) {
  if (!storage) return emptyState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STATE_VERSION) return emptyState();
    return { ...emptyState(), ...pickActs(parsed), version: STATE_VERSION };
  } catch {
    return emptyState();
  }
}

/** Uloží výsledek jednoho aktu (merge do existujícího stavu). */
export function saveAct(act, payload, storage = defaultStorage()) {
  if (!ACTS.includes(act)) throw new Error(`Neznámý akt '${act}'`);
  const state = loadState(storage);
  state[act] = payload == null ? null : { ...payload, saved_at_day: payload.saved_at_day ?? null };
  if (storage) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* plné/nedostupné úložiště */ }
  }
  return state;
}

/** Smaže celou kampaň (tlačítko „Hrát znovu od začátku"). */
export function resetCampaign(storage = defaultStorage()) {
  if (storage) {
    try { storage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }
  return emptyState();
}

// ---------------------------------------------------------------------------
// Sdílecí kód — base64url(JSON vstupů). Vlastní base64 (bez btoa/Buffer),
// aby modul běžel identicky v prohlížeči i node:test.
// ---------------------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToB64url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += B64[c & 63];
  }
  return out;
}

function b64urlToBytes(str) {
  const idx = new Map([...B64].map((ch, i) => [ch, i]));
  const out = [];
  let buf = 0, bits = 0;
  for (const ch of str) {
    const v = idx.get(ch);
    if (v === undefined) throw new Error('invalid base64url');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/** Z celého stavu vybere jen herní VSTUPY (verdikty se přepočítají). */
export function shareableInputs(state) {
  return {
    v: STATE_VERSION,
    m: state.ministr?.alloc ?? null,
    r: state.reditel?.decisions ?? null,
    p: state.pacient
      ? { persona: state.pacient.persona ?? null, decisions: state.pacient.decisions ?? null }
      : null,
  };
}

/** Zakóduje stav kampaně do URL-safe sdílecího kódu. */
export function encodeShare(state) {
  const json = JSON.stringify(shareableInputs(state));
  return bytesToB64url(new TextEncoder().encode(json));
}

const MAX_SHARE_CODE_LENGTH = 4096;

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Alokace ministra: { segmentId: 0–15 } — stejné meze jako slidery vyhlášky. */
function validAlloc(alloc) {
  if (!isPlainObject(alloc)) return false;
  return Object.entries(alloc).every(([k, v]) =>
    typeof k === 'string' && k.length <= 40 && Number.isFinite(v) && v >= 0 && v <= 15);
}

/** Rozhodnutí (ředitel/pacient): { decisionId: optionId } — krátké stringy. */
function validDecisions(dec) {
  if (!isPlainObject(dec)) return false;
  return Object.entries(dec).every(([k, v]) =>
    typeof k === 'string' && k.length <= 60 && typeof v === 'string' && v.length <= 60);
}

/**
 * Dekóduje sdílecí kód na stav kampaně. Přísná validace tvaru a rozsahů —
 * kód je nedůvěryhodný vstup z URL; cokoli mimo kontrakt → null.
 */
export function decodeShare(code) {
  if (typeof code !== 'string' || !code || code.length > MAX_SHARE_CODE_LENGTH) return null;
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(b64urlToBytes(code)));
  } catch {
    return null;
  }
  if (!isPlainObject(parsed) || parsed.v !== STATE_VERSION) return null;
  const state = emptyState();
  if (parsed.m != null) {
    if (!validAlloc(parsed.m)) return null;
    state.ministr = { alloc: parsed.m };
  }
  if (parsed.r != null) {
    if (!validDecisions(parsed.r)) return null;
    state.reditel = { decisions: parsed.r };
  }
  if (parsed.p != null) {
    if (!isPlainObject(parsed.p)) return null;
    const persona = parsed.p.persona;
    if (persona != null && (typeof persona !== 'string' || persona.length > 60)) return null;
    if (parsed.p.decisions != null && !validDecisions(parsed.p.decisions)) return null;
    state.pacient = { persona: persona ?? null, decisions: parsed.p.decisions ?? null };
  }
  return state;
}

function pickActs(parsed) {
  const out = {};
  for (const act of ACTS) out[act] = isPlainObject(parsed[act]) ? parsed[act] : null;
  return out;
}
