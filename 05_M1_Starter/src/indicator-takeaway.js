// Sdílené čisté (DOM-free) pomůcky nad indikátorem z datového kontraktu:
// plain-language verdikt (buildTakeaway), kompaktní sparkline (sparklineSvg)
// a drobné formátovací funkce. Vyčleněno z indicator.js, aby je mohly použít
// i jiné stránky (persona minihomepage) BEZ importu indicator.js, jehož modul
// při načtení spouští init() vázaný na indicator.html.

import { formatNumberCz } from './page-shared.js';

/** Formát hodnoty: ≥100 bez desetin, jinak 1 desetina; null → „—". */
export function formatValue(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return formatNumberCz(n, { maxDecimals: Math.abs(n) >= 100 ? 0 : 1 });
}

/** Meziroční změna z posledních dvou bodů trendu; cls dle směru (good/bad/flat). */
export function computeYoy(ind) {
  const t = ind?.trend;
  if (!Array.isArray(t) || t.length < 2) return null;
  const last = t[t.length - 1]?.value;
  const prev = t[t.length - 2]?.value;
  if (last == null || prev == null || prev === 0) return null;
  const pct = (last - prev) / prev * 100;
  if (Math.abs(pct) < 0.5) return { glyph: '→', cls: 'flat', pct };
  const positive = pct > 0;
  const dir = ind.direction ?? 'context_dependent';
  let cls = 'flat';
  if (dir !== 'context_dependent') {
    const isImprovement = (dir === 'higher_is_better' && positive) || (dir === 'lower_is_better' && !positive);
    cls = isImprovement ? 'good' : 'bad';
  }
  return { glyph: positive ? '↑' : '↓', cls, pct };
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Sestaví jednovětý plain-language verdikt indikátoru z dat kontraktu.
 *
 * Cíl: první věc, kterou návštěvník na detailu přečte, je VÝZNAM („co to
 * znamená a jak si Česko stojí"), ne surové číslo. Verdikt se generuje čistě
 * z dat (hodnota vs benchmark, směr, signál, meziroční pohyb), takže ho dostane
 * i indikátor bez metodické karty a bez ručně psaného příběhu.
 *
 * @param {object} ind — záznam z data/indicators.json
 * @returns {{ text: string, tone: string }} tone ∈ good|warn|bad|neutral
 */
export function buildTakeaway(ind) {
  if (!ind || ind.value == null || !Number.isFinite(Number(ind.value))) {
    return { text: '', tone: 'neutral' };
  }
  const unit = ind.unit ? ` ${ind.unit}` : '';
  const parts = [];

  // 1) Pozice vůči benchmarku (OECD preferováno, jinak EU).
  const b = ind.benchmark || {};
  const ref = b.oecd != null ? { v: Number(b.oecd), label: 'OECD' }
    : b.eu != null ? { v: Number(b.eu), label: 'EU' }
    : null;
  let benchClause = '';
  if (ref && Number.isFinite(ref.v) && ref.v !== 0) {
    const diffPct = (Number(ind.value) - ref.v) / Math.abs(ref.v) * 100;
    const absPct = Math.abs(diffPct);
    if (absPct < 2) {
      benchClause = `zhruba na úrovni průměru ${ref.label}`;
    } else {
      const dir = diffPct > 0 ? 'nad' : 'pod';
      benchClause = `o ${formatNumberCz(absPct, { minDecimals: 0, maxDecimals: 0 })} % ${dir} průměrem ${ref.label} (${formatValue(ref.v)}${unit})`;
    }
  }

  let s1 = `Česko: ${formatValue(ind.value)}${unit}`;
  if (benchClause) s1 += ` — ${benchClause}`;
  parts.push(s1 + '.');

  // 2) Směr + verdikt ze signálu.
  const dir = ind.direction ?? 'context_dependent';
  if (dir === 'context_dependent') {
    parts.push('Jde o kontextový ukazatel — odchylka sama o sobě neznamená lepší ani horší výkon.');
  } else {
    const dirClause = dir === 'higher_is_better' ? 'vyšší je lepší' : 'nižší je lepší';
    const verdict = ind.signal === 'good' ? 'a Česko si vede dobře'
      : ind.signal === 'bad' ? 'a Česko zaostává'
      : ind.signal === 'warn' ? 'a je to ke sledování'
      : '';
    parts.push(cap(dirClause) + (verdict ? `, ${verdict}` : '') + '.');
  }

  // 3) Meziroční pohyb.
  const yoy = computeYoy(ind);
  if (yoy) {
    if (yoy.cls === 'flat' || Math.abs(yoy.pct) < 0.5) {
      parts.push('Meziročně beze změny.');
    } else {
      const moveWord = yoy.pct > 0 ? 'roste' : 'klesá';
      const qual = yoy.cls === 'good' ? ' (zlepšení)' : yoy.cls === 'bad' ? ' (zhoršení)' : '';
      parts.push(`Meziročně ${moveWord} o ${formatNumberCz(Math.abs(yoy.pct), { minDecimals: 1, maxDecimals: 1 })} %${qual}.`);
    }
  }

  return { text: parts.join(' '), tone: ind.signal ?? 'neutral' };
}

/**
 * Kompaktní inline-SVG sparkline trendu (bez CDN knihovny).
 * Vrací '' pro méně než 2 body.
 */
export function sparklineSvg(trend, signal) {
  const pts = (trend || []).filter(t => Number.isFinite(Number(t.value)));
  if (pts.length < 2) return '';
  const color = signal === 'good' ? '#38761D'
    : signal === 'warn' ? '#B45F06'
    : signal === 'bad' ? '#990000' : '#0B5394';
  const W = 104, H = 30, PAD = 3;
  const vals = pts.map(t => Number(t.value));
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const coords = pts.map((t, i) => {
    const x = PAD + (i / (pts.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((Number(t.value) - min) / span) * (H - 2 * PAD);
    return [x, y];
  });
  const poly = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = coords[coords.length - 1];
  return `<svg class="ind-hero-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Náčrt trendu">
    <polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.6" fill="${color}"/>
  </svg>`;
}
