// Dotazníky srovnávače pojišťoven (balíček P2.4): formulář vyrenderovaný z
// definice sady (data/pojistovny-otazky.json) a vodorovné bary s agregáty.
//
// Frontend o databázi neví. Odpovědi POSTuje na /api/dotaznik, agregáty čte
// z data/pojistovny-dotaznik-agregaty.json (exportuje scripts/export-dotaznik.js).
// Veškerý text jde do DOM přes textContent, nikdy přes innerHTML.
//
// Třídy .zpd-* (styles.css, sekce „Srovnávač pojišťoven: dotazníky“).
// Pravidla otázek (jeden/více/text, pole „upřesnění“) zrcadlí
// api/_dotaznik-validate.js; shodu hlídá tests/zp-dotaznik.test.js.

export const ENDPOINT = '/api/dotaznik';
export const UPRESNENI_SUFFIX = '_upresneni';
export const MAX_TEXT = 2000;

const TYP_LABEL = { pojistovna: 'pojišťovny', pacientska_organizace: 'pacientské organizace', verejnost: 'veřejnost' };

// ------------------------------------------------------------------ definice sady
export function flattenOtazky(sada) {
  if (!sada || typeof sada !== 'object') return [];
  if (Array.isArray(sada.casti)) return sada.casti.flatMap((c) => c?.otazky ?? []);
  return Array.isArray(sada.otazky) ? sada.otazky : [];
}

export function hasUpresneni(q) {
  return Array.isArray(q?.moznosti) && q.moznosti.some((m) => /uveďte/i.test(String(m)));
}

/** 'jeden' | 'vice' | 'text' */
export function questionKind(q) {
  if (!Array.isArray(q?.moznosti) || q.moznosti.length === 0) return 'text';
  return q.vyber === 'jeden' ? 'jeden' : 'vice';
}

/** Nejvyšší délka volného textu (odpověď i upřesnění): `max_delka` otázky, nejvýš MAX_TEXT. */
export function maxDelka(q) {
  const m = q?.max_delka;
  return Number.isInteger(m) && m > 0 ? Math.min(m, MAX_TEXT) : MAX_TEXT;
}

// ------------------------------------------------------------------ odeslání
/**
 * Přečte odpovědi z odkazů na pole formuláře.
 * refs: { [otazka_id]: { kind, inputs: [{value, checked}], extra?: {value} } }
 */
export function collectOdpovedi(sada, refs) {
  const out = {};
  for (const q of flattenOtazky(sada)) {
    const r = refs[q.id];
    if (!r) continue;
    if (r.kind === 'text') {
      const t = String(r.inputs[0]?.value ?? '').trim();
      if (t) out[q.id] = t;
      continue;
    }
    const picked = r.inputs.filter((i) => i.checked).map((i) => i.value);
    if (picked.length) out[q.id] = r.kind === 'jeden' ? picked[0] : picked;
    const extra = String(r.extra?.value ?? '').trim();
    if (extra) out[q.id + UPRESNENI_SUFFIX] = extra;
  }
  return out;
}

export function buildPayload(sada, odpovedi, { token = null, respondentTyp = null } = {}) {
  const typ = respondentTyp || (token ? 'pojistovna' : 'verejnost');
  const payload = {
    sada_id: sada.id,
    sada_verze: String(sada.verze ?? '1'),
    respondent_typ: typ,
    odpovedi,
  };
  if (token && typ !== 'verejnost') payload.token = token;
  return payload;
}

/** Převede odpověď serveru na stav pro uživatele: { kind: 'ok'|'unavailable'|'invalid'|'token'|'rate'|'error', text }. */
export function interpretResponse(status, data) {
  if (status >= 200 && status < 300 && data?.ok !== false) {
    return { kind: 'ok', text: 'Děkujeme, odpovědi jsme přijali. Ukládáme je bez osobních údajů.' };
  }
  if (status === 503) return { kind: 'unavailable', text: 'Dotazník zatím není aktivní. Zkuste to prosím později.' };
  if (status === 403) return { kind: 'token', text: 'Odkaz k dotazníku není platný nebo už byl použit.' };
  if (status === 429) return { kind: 'rate', text: 'Odeslali jste příliš mnoho odpovědí v krátké době. Zkuste to prosím později.' };
  if (status === 400 || status === 404 || status === 413) {
    const detail = Array.isArray(data?.errors) && data.errors.length ? ` (${data.errors.slice(0, 3).join('; ')})` : '';
    return { kind: 'invalid', text: `Odpovědi se nepodařilo ověřit${detail}. Zkontrolujte je prosím.` };
  }
  return { kind: 'error', text: 'Odeslání se nepodařilo. Zkuste to prosím za chvíli znovu.' };
}

/** POST na API. Nikdy nevyhodí výjimku: síťovou chybu vrátí jako stav `error`. */
export async function submitDotaznik(payload, fetchImpl = globalThis.fetch, endpoint = ENDPOINT) {
  if (typeof fetchImpl !== 'function') return interpretResponse(0, null);
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch { /* prázdné nebo nejde o JSON */ }
    return interpretResponse(res.status, data);
  } catch {
    return interpretResponse(0, null);
  }
}

// ------------------------------------------------------------------ DOM pomocníci
function mk(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function docOf(container) {
  return container.ownerDocument || (typeof document !== 'undefined' ? document : null);
}

function clear(container) {
  if (typeof container.replaceChildren === 'function') container.replaceChildren();
  else container.textContent = '';
}

function questionNode(doc, q, uid, refs) {
  const kind = questionKind(q);
  if (kind === 'text') {
    const wrap = mk(doc, 'div', 'zpd-q');
    wrap.setAttribute('data-otazka', q.id);
    const id = `${uid}-${q.id}`;
    const label = mk(doc, 'label', 'zpd-q-text', q.text);
    label.setAttribute('for', id);
    const ta = mk(doc, 'textarea', 'zpd-text');
    ta.setAttribute('id', id);
    ta.setAttribute('name', q.id);
    ta.setAttribute('rows', '4');
    ta.setAttribute('maxlength', String(maxDelka(q)));
    wrap.appendChild(label);
    if (q.napoveda) {
      const hint = mk(doc, 'p', 'zpd-note', q.napoveda);
      hint.setAttribute('id', `${id}-napoveda`);
      ta.setAttribute('aria-describedby', `${id}-napoveda`);
      wrap.appendChild(hint);
    }
    wrap.appendChild(ta);
    refs[q.id] = { kind, inputs: [ta] };
    return wrap;
  }
  const fs = mk(doc, 'fieldset', 'zpd-q');
  fs.setAttribute('data-otazka', q.id);
  fs.appendChild(mk(doc, 'legend', 'zpd-q-text', q.text));
  if (q.napoveda) {
    const hint = mk(doc, 'p', 'zpd-note', q.napoveda);
    hint.setAttribute('id', `${uid}-${q.id}-napoveda`);
    fs.setAttribute('aria-describedby', `${uid}-${q.id}-napoveda`);
    fs.appendChild(hint);
  }
  const inputs = [];
  q.moznosti.forEach((opt) => {
    const lab = mk(doc, 'label', 'zpd-opt');
    const inp = mk(doc, 'input', 'zpd-input');
    inp.setAttribute('type', kind === 'jeden' ? 'radio' : 'checkbox');
    inp.setAttribute('name', q.id);
    inp.value = opt;
    inp.checked = false;
    lab.appendChild(inp);
    lab.appendChild(mk(doc, 'span', 'zpd-opt-text', opt));
    fs.appendChild(lab);
    inputs.push(inp);
  });
  const ref = { kind, inputs };
  if (hasUpresneni(q)) {
    const lab = mk(doc, 'label', 'zpd-more-label', 'Upřesnění (volitelně)');
    const extra = mk(doc, 'input', 'zpd-more');
    extra.setAttribute('type', 'text');
    extra.setAttribute('name', q.id + UPRESNENI_SUFFIX);
    extra.setAttribute('maxlength', String(maxDelka(q)));
    lab.appendChild(extra);
    fs.appendChild(lab);
    ref.extra = extra;
  }
  refs[q.id] = ref;
  return fs;
}

// ------------------------------------------------------------------ formulář
/**
 * Vyrenderuje formulář sady do kontejneru.
 * @param {Element} container
 * @param {object}  sada  sada z pojistovny-otazky.json
 * @param {{token?: string|null, respondentTyp?: string|null, fetchImpl?: Function, endpoint?: string}} opts
 * @returns {{form: Element|null, submit: Function, getPayload: Function}|null}
 */
export function renderDotaznik(container, sada, opts = {}) {
  if (!container || !sada) return null;
  const doc = docOf(container);
  if (!doc) return null;
  const { token = null, fetchImpl, endpoint } = opts;
  const respondentTyp = opts.respondentTyp || (token ? 'pojistovna' : 'verejnost');
  clear(container);

  const povolene = sada.povolene_respondenty;
  const nelze = Array.isArray(povolene) && !povolene.includes(respondentTyp);
  const potrebujeToken = respondentTyp !== 'verejnost' && !token;
  if (nelze || potrebujeToken) {
    const p = mk(doc, 'p', 'zpd-note zpd-note--block',
      nelze
        ? 'Tento dotazník je určen jen adresným respondentům. Veřejnost jej vyplnit nemůže.'
        : 'Tento dotazník se vyplňuje přes osobní odkaz s tokenem, který pojišťovna nebo organizace dostala od redakce.');
    container.appendChild(p);
    return { form: null, submit: async () => null, getPayload: () => null };
  }

  const uid = `zpd-${sada.id}`;
  const refs = {};
  const form = mk(doc, 'form', 'zpd-form');
  form.setAttribute('novalidate', '');
  form.setAttribute('aria-label', sada.nazev || 'Dotazník');
  if (sada.uvod) form.appendChild(mk(doc, 'p', 'zpd-note zpd-note--block', sada.uvod));

  if (Array.isArray(sada.casti)) {
    sada.casti.forEach((c) => {
      const part = mk(doc, 'fieldset', 'zpd-part');
      part.appendChild(mk(doc, 'legend', 'zpd-part-title', `${c.id} · ${c.nazev}`));
      (c.otazky || []).forEach((q) => part.appendChild(questionNode(doc, q, uid, refs)));
      form.appendChild(part);
    });
  } else {
    const part = mk(doc, 'div', 'zpd-part');
    (sada.otazky || []).forEach((q) => part.appendChild(questionNode(doc, q, uid, refs)));
    form.appendChild(part);
  }

  form.appendChild(mk(doc, 'p', 'zpd-note', 'Do textových polí prosím neuvádějte jména, e-maily ani jiné osobní údaje.'));
  const btn = mk(doc, 'button', 'zpd-submit', 'Odeslat odpovědi');
  btn.setAttribute('type', 'submit');
  form.appendChild(btn);
  const status = mk(doc, 'p', 'zpd-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.appendChild(status);
  container.appendChild(form);

  const setStatus = (kind, text) => {
    status.className = kind ? `zpd-status is-${kind}` : 'zpd-status';
    status.textContent = text;
  };
  const getPayload = () => buildPayload(sada, collectOdpovedi(sada, refs), { token, respondentTyp });
  let sending = false;

  async function submit() {
    if (sending) return null;
    const payload = getPayload();
    if (Object.keys(payload.odpovedi).length === 0) {
      setStatus('err', 'Vyplňte prosím alespoň jednu odpověď.');
      return { kind: 'empty' };
    }
    sending = true;
    btn.disabled = true;
    setStatus('wait', 'Odesílám…');
    const r = await submitDotaznik(payload, fetchImpl ?? globalThis.fetch, endpoint);
    sending = false;
    setStatus(r.kind === 'ok' ? 'ok' : 'err', r.text);
    if (r.kind === 'ok') {
      Object.values(refs).forEach((ref) => {
        ref.inputs.forEach((i) => { i.disabled = true; });
        if (ref.extra) ref.extra.disabled = true;
      });
    } else {
      btn.disabled = false;
    }
    return r;
  }

  form.addEventListener('submit', (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    submit();
  });
  return { form, submit, getPayload };
}

// ------------------------------------------------------------------ agregáty
/**
 * Vodorovné bary pro otázky s nabídkou.
 * @param {Element} container
 * @param {object}  agregaty  obsah data/pojistovny-dotaznik-agregaty.json
 * @param {object}  sada
 * @returns {Element|null}  kořen agregátu, nebo null (nic se nevykreslilo)
 */
export function renderDotaznikAgregace(container, agregaty, sada) {
  if (!container || !sada) return null;
  const doc = docOf(container);
  if (!doc) return null;
  const a = agregaty?.sady?.[sada.id];
  clear(container);
  if (!a) return null;

  const root = mk(doc, 'div', 'zpd-agg');
  const n = Number(a.pocet_odpovedi) || 0;
  const typy = Object.entries(a.respondent_typy || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${TYP_LABEL[k] || k} ${v}`)
    .join(', ');
  root.appendChild(mk(doc, 'h4', 'zpd-agg-head', `Zatím odpovědělo ${n}${typy ? ` (${typy})` : ''}`));

  if (n === 0) {
    root.appendChild(mk(doc, 'p', 'zpd-note', 'Zatím nejsou k dispozici žádné odpovědi.'));
    container.appendChild(root);
    return root;
  }
  if (a.skryto) {
    root.appendChild(mk(doc, 'p', 'zpd-note', 'Odpovědí je zatím méně než tři, proto agregát nezobrazujeme (chrání to respondenty před poznáním).'));
    container.appendChild(root);
    return root;
  }

  flattenOtazky(sada).forEach((q) => {
    if (questionKind(q) === 'text') return;
    const counts = a.otazky?.[q.id];
    if (!counts) return;
    const block = mk(doc, 'div', 'zpd-agg-q');
    block.appendChild(mk(doc, 'h5', 'zpd-agg-q-text', q.text));
    const list = mk(doc, 'ul', 'zpd-bars');
    q.moznosti.forEach((opt) => {
      const v = Number(counts[opt]) || 0;
      const pct = Math.max(0, Math.min(100, Math.round((v / n) * 100)));
      const row = mk(doc, 'li', 'zpd-bar');
      row.appendChild(mk(doc, 'span', 'zpd-bar-label', opt));
      const track = mk(doc, 'span', 'zpd-bar-track');
      track.setAttribute('aria-hidden', 'true');
      const fill = mk(doc, 'span', 'zpd-bar-fill');
      fill.setAttribute('style', `--w:${pct}%`);
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(mk(doc, 'span', 'zpd-bar-val', `${v} z ${n}`));
      list.appendChild(row);
    });
    block.appendChild(list);
    root.appendChild(block);
  });
  container.appendChild(root);
  return root;
}
