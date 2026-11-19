// Sekce „Co se do zákona dostalo až ve Sněmovně“ na legislativa.html.
// Čte data/prilepky.json (generuje ingest/fetchers/psp_prilepky.js) a ukazuje
// pozměňovací návrhy, které mění zákon mimo původní předmět tisku.
// Web nález popisuje a dokládá citací; verdikt „přílepek“ nevynáší.

import { escapeHtml } from './page-shared.js';

export const UROVEN_LABELS = {
  vysoka: { label: 'Jiná oblast práva', cls: 'leg-plan-badge-bad' },
  stredni: { label: 'Další zdravotnický zákon', cls: 'leg-plan-badge-warn' },
  nizka: { label: 'Postup projednávání', cls: 'leg-plan-badge-neutral' },
};

const PREDKLADATEL = { vlada: 'vládní návrh', poslanci: 'poslanecký návrh', senat: 'senátní návrh', kraj: 'návrh kraje', jiny: 'návrh' };

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : '';
}

// Číselník stavů Sněmovny má i technické hodnoty; čtenáři je přeložíme.
export const stavLabel = stav => (stav === 'KONEC' ? 'projednávání ukončeno' : stav === 'START' ? null : stav ?? null);

const zakon = z => `zákon č.&nbsp;${escapeHtml(z.cislo)}&nbsp;Sb.${z.nazev ? `, ${escapeHtml(z.nazev)}` : ''}`;

export function renderNavrh(n) {
  const kdo = [n.autor ? escapeHtml(n.autor) : null, formatDate(n.datum)].filter(Boolean).join(' · ');
  return `
    <li class="prl-pn">
      <div class="prl-pn-head">
        <a href="${escapeHtml(n.url)}" target="_blank" rel="noopener">Sněmovní dokument ${n.cd}</a>${kdo ? ` <span class="prl-pn-meta">${kdo}</span>` : ''}
      </div>
      <ul class="prl-zakony">
        ${n.mimo_predmet.map(z => `
          <li>
            <span class="prl-zakon">Mění ${zakon(z)}</span>
            <blockquote class="prl-citace">${escapeHtml(z.citace)}</blockquote>
          </li>`).join('')}
      </ul>
    </li>`;
}

export function renderTisk(t, signaly = {}) {
  const u = UROVEN_LABELS[t.uroven] ?? UROVEN_LABELS.nizka;
  const predmet = t.predmet.length ? `Původní návrh měnil: ${t.predmet.map(c => `č.&nbsp;${escapeHtml(c)}&nbsp;Sb.`).join(', ')}` : 'Původní návrh je nový zákon.';
  const proces = (t.signaly ?? []).map(s => `<li>${escapeHtml(signaly[s] ?? s)}</li>`).join('');
  return `
    <article class="prl-tisk" id="tisk-${t.ct}">
      <header class="prl-tisk-head">
        <span class="leg-plan-badge ${u.cls}">${u.label}</span>
        <h3><a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">Tisk ${t.ct}</a> · ${escapeHtml(t.nazev)}</h3>
        <p class="prl-tisk-meta">${escapeHtml(PREDKLADATEL[t.predkladatel_typ] ?? 'návrh')}${t.predkladatel ? ` (${escapeHtml(t.predkladatel)})` : ''}${t.predlozeno ? `, předloženo ${formatDate(t.predlozeno)}` : ''}${stavLabel(t.stav) ? ` · ${escapeHtml(stavLabel(t.stav))}` : ''}. ${predmet}</p>
      </header>
      ${t.navrhy.length ? `<ul class="prl-pns">${t.navrhy.map(renderNavrh).join('')}</ul>` : ''}
      ${proces ? `<ul class="prl-proces">${proces}</ul>` : ''}
    </article>`;
}

export function renderSection(data) {
  const sNavrhem = data.tisky.filter(t => t.navrhy.length);
  const jenProces = data.tisky.filter(t => !t.navrhy.length);
  const p = data.pokryti ?? {};
  return `
    <div class="leg-plan-head">
      <div class="leg-part-divider" aria-hidden="true">
        <span class="leg-part-num">3</span>
        <span class="leg-part-tag">Sněmovna</span>
        <span class="leg-part-line"></span>
      </div>
      <div class="ed-kicker">Pozměňovací návrhy</div>
      <h2 id="prlHeading">Co se do zákona dostalo až ve Sněmovně</h2>
      <p class="leg-plan-lead">
        Vládní návrh projde připomínkami ministerstev, pojišťoven i odborné veřejnosti. Pozměňovací
        návrh poslance ne. Tady jsou návrhy, které ve zdravotnictví mění zákon, o němž původní tisk
        nebyl: zdravotnický zákon vložený do cizího tisku, nebo cizí zákon vložený do zdravotnického.
        U každého je doslovná citace a odkaz na dokument Sněmovny.
      </p>
    </div>
    ${sNavrhem.length ? sNavrhem.map(t => renderTisk(t, data.signaly)).join('') : `<p class="prl-empty">${p.pn_ceka ? 'V dosud přečtených pozměňovacích návrzích žádný takový není. Starší návrhy tohoto volebního období se teprve dočítají.' : 'V tomto volebním období jsme zatím žádný takový pozměňovací návrh nenašli.'}</p>`}
    ${jenProces.length ? `
      <details class="prl-more">
        <summary>Zdravotnické návrhy bez připomínkového řízení nebo se zrychleným postupem (${jenProces.length})</summary>
        ${jenProces.map(t => renderTisk(t, data.signaly)).join('')}
      </details>` : ''}
    <p class="prl-note">
      Stroj porovnává, které zákony mění původní návrh a které pozměňovací návrh. Neposuzuje obsah
      ani to, zda změna s původním návrhem věcně souvisí; to je otázka pro Ústavní soud, ne pro nás.
      Přečteno ${p.precteno_pn ?? '—'} z ${p.pisemnych_pn ?? '—'} písemných pozměňovacích návrhů
      k ${p.navrhu_zakonu ?? '—'} návrhům zákonů ${data.obdobi}. volebního období${p.pn_bez_textu ? `; ${p.pn_bez_textu} z nich Sněmovna zveřejnila jen jako PDF a stroj je nečte` : ''}.
      Návrhy přednesené jen ústně ve druhém čtení a návrhy výborů v datech nejsou.
      Zdroj: <a href="${escapeHtml(data.source?.url ?? 'https://www.psp.cz/sqw/hp.sqw?k=1300')}" target="_blank" rel="noopener">otevřená data Poslanecké sněmovny</a>, stav k ${formatDate(data.generated_at)}.
      Celý legislativní proces napříč obory sledují <a href="https://cosepece.cz/" target="_blank" rel="noopener">Hlídač zákonů</a> a <a href="https://snemovna.hlidacstatu.cz/" target="_blank" rel="noopener">Hlídač státu</a>.
    </p>`;
}

async function init() {
  const mount = document.getElementById('prlMount');
  if (!mount) return;
  try {
    const res = await fetch('data/prilepky.json');
    // Tělo neúspěšné odpovědi je potřeba zahodit, jinak požadavek zůstane otevřený
    // (stránka pak nikdy nedosáhne síťového klidu a e2e testy vyprší).
    if (!res.ok) { await res.body?.cancel(); return; }
    const data = await res.json();
    if (!Array.isArray(data.tisky)) return;
    mount.innerHTML = renderSection(data);
    mount.hidden = false;
  } catch { /* sekce je doplněk; bez dat zůstane skrytá */ }
}

if (typeof document !== 'undefined') init();
