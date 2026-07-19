// Tři židle — testy sdíleného stavu kampaně (hra-stav.js): roundtrip
// localStorage, verze, sdílecí kód (encode/decode) a odmítnutí
// zmanipulovaného vstupu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, STATE_VERSION, ACTS,
  emptyState, loadState, saveAct, resetCampaign,
  shareableInputs, encodeShare, decodeShare,
} from '../src/hra-stav.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('hra-stav: bez úložiště vrací prázdný stav a nepadá', () => {
  assert.deepEqual(loadState(null), emptyState());
  assert.deepEqual(saveAct('ministr', { alloc: { prakticti: 8 } }, null).ministr.alloc, { prakticti: 8 });
  assert.deepEqual(resetCampaign(null), emptyState());
});

test('hra-stav: saveAct/loadState roundtrip přes localStorage, merge aktů', () => {
  const st = fakeStorage();
  saveAct('ministr', { alloc: { akutni_luzkova: 7 }, verdict: { deals: 12 } }, st);
  saveAct('reditel', { decisions: { platy_sester: 'zvysit' } }, st);
  const loaded = loadState(st);
  assert.equal(loaded.version, STATE_VERSION);
  assert.deepEqual(loaded.ministr.alloc, { akutni_luzkova: 7 });
  assert.deepEqual(loaded.reditel.decisions, { platy_sester: 'zvysit' });
  assert.equal(loaded.pacient, null);
  // přepis aktu nemaže ostatní
  saveAct('ministr', { alloc: { akutni_luzkova: 4 } }, st);
  assert.deepEqual(loadState(st).reditel.decisions, { platy_sester: 'zvysit' });
});

test('hra-stav: neznámý akt vyhodí chybu, poškozený/starý stav → prázdný', () => {
  const st = fakeStorage();
  assert.throws(() => saveAct('poslanec', {}, st), /Neznámý akt/);
  st.setItem(STORAGE_KEY, '{rozbité json');
  assert.deepEqual(loadState(st), emptyState());
  st.setItem(STORAGE_KEY, JSON.stringify({ version: 999, ministr: { alloc: {} } }));
  assert.deepEqual(loadState(st), emptyState());
});

test('hra-stav: resetCampaign smaže uložený stav', () => {
  const st = fakeStorage();
  saveAct('pacient', { persona: 'cmp_senior', decisions: {} }, st);
  resetCampaign(st);
  assert.deepEqual(loadState(st), emptyState());
});

test('hra-stav: encodeShare/decodeShare roundtrip nese jen vstupy', () => {
  const st = fakeStorage();
  saveAct('ministr', { alloc: { akutni_luzkova: 7.5, prakticti: 12 }, verdict: { deals: 15 } }, st);
  saveAct('reditel', { decisions: { platy_sester: 'zvysit' }, verdict: { hospodareni: -20 } }, st);
  saveAct('pacient', { persona: 'cmp_senior', decisions: { rezonance: 'cekat' } }, st);
  const code = encodeShare(loadState(st));
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'kód je URL-safe');
  const decoded = decodeShare(code);
  assert.deepEqual(decoded.ministr, { alloc: { akutni_luzkova: 7.5, prakticti: 12 } });
  assert.deepEqual(decoded.reditel, { decisions: { platy_sester: 'zvysit' } });
  assert.deepEqual(decoded.pacient, { persona: 'cmp_senior', decisions: { rezonance: 'cekat' } });
  assert.equal(decoded.ministr.verdict, undefined, 'verdikt se nepřenáší — přepočítá ho engine');
});

test('hra-stav: prázdná kampaň má prázdné vstupy a kód projde roundtripem', () => {
  const inputs = shareableInputs(emptyState());
  assert.deepEqual(inputs, { v: STATE_VERSION, m: null, r: null, p: null });
  assert.deepEqual(decodeShare(encodeShare(emptyState())), emptyState());
});

test('hra-stav: decodeShare odmítá zmanipulované kódy', () => {
  assert.equal(decodeShare(''), null);
  assert.equal(decodeShare('!!!ne-base64!!!'), null);
  assert.equal(decodeShare('x'.repeat(5000)), null, 'příliš dlouhý kód');
  const forge = (obj) => {
    const json = JSON.stringify(obj);
    // zakódování stejnou cestou jako encodeShare — přes stav s vlastním obsahem
    const bytes = new TextEncoder().encode(json);
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
      out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
      if (b !== undefined) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
      if (c !== undefined) out += B64[c & 63];
    }
    return out;
  };
  assert.equal(decodeShare(forge({ v: 999, m: null, r: null, p: null })), null, 'cizí verze');
  assert.equal(decodeShare(forge({ v: 1, m: { akutni_luzkova: 99 }, r: null, p: null })), null, 'alokace mimo rozsah sliderů');
  assert.equal(decodeShare(forge({ v: 1, m: { akutni_luzkova: '7' }, r: null, p: null })), null, 'alokace musí být číslo');
  assert.equal(decodeShare(forge({ v: 1, m: null, r: { a: { nested: true } }, p: null })), null, 'rozhodnutí musí být string');
  assert.equal(decodeShare(forge({ v: 1, m: null, r: null, p: { persona: 'x'.repeat(200) } })), null, 'persona příliš dlouhá');
  assert.equal(decodeShare(forge([1, 2, 3])), null, 'pole místo objektu');
});

test('hra-stav: ACTS drží pořadí kampaně', () => {
  assert.deepEqual(ACTS, ['ministr', 'reditel', 'pacient']);
});
