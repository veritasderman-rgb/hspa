// Validace data/evidence-audit.json (registr evidence-auditu, PROMPT_EVIDENCE_AUDIT.md).
// Spouštěj v CI před deployem: node ingest/validate-evidence-audit.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export const ITEM_REQUIRED = ['id', 'type', 'checked_at', 'content_hash', 'run_id', 'tools', 'claims', 'actions'];
export const VALID_TYPES = ['article', 'indicator'];
export const VALID_KINDS = ['effect', 'epidemiology', 'efficacy', 'mechanism', 'measurement', 'policy', 'other'];
export const VALID_VERDICTS = ['supported', 'partial', 'contradicted', 'no-evidence', 'not-applicable', 'unclear'];
export const VALID_CONFIDENCE = ['high', 'medium', 'low'];
export const VALID_FOUND_VIA = ['pubmed', 'consensus', 'article'];
export const VALID_RELATIONS = ['supports', 'partial', 'contradicts', 'context'];
export const VALID_ACTIONS = ['source-added', 'claim-note', 'card-note', 'flagged', 'issue', 'none'];
export const VALID_MODELS = ['sonnet', 'opus', 'fable', 'haiku'];

// Provozní texty nástrojů (počítadla, výzvy k registraci) do registru nepatří.
export const TOOL_BOILERPLATE_RE = /(sign\s*up|upgrade\s+to|searches?\s+remaining|search(?:es)?\s+left|consensus\.app\/(?:pricing|subscribe)|podle\s+Consensus|dle\s+Consensus)/i;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA1_RE = /^[0-9a-f]{40}$/;
const PMID_RE = /^\d{1,9}$/;
const DOI_RE = /^10\.\d{4,9}\/\S+$/;

/**
 * Čistá validace — vrací seznam chyb. FK sady jsou volitelné (prázdná = nekontroluje se).
 */
export function validateEvidenceAudit(data, { articleSlugs = new Set(), indicatorIds = new Set(), claimIds = new Set() } = {}) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['root must be object'];
  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!Array.isArray(data.items)) { errors.push('items must be array'); return errors; }

  const ids = new Set();
  for (const [i, it] of data.items.entries()) {
    const tag = `item[${i}] (${it?.id ?? '?'})`;
    if (!it || typeof it !== 'object') { errors.push(`${tag}: not an object`); continue; }
    for (const f of ITEM_REQUIRED) if (it[f] == null) errors.push(`${tag}: missing required '${f}'`);
    if (it.id) {
      if (ids.has(it.id)) errors.push(`${tag}: duplicate id`);
      ids.add(it.id);
    }
    if (it.type && !VALID_TYPES.includes(it.type)) errors.push(`${tag}: invalid type '${it.type}'`);
    if (it.type === 'article') {
      if (!/^clanek-[\w-]+\.html$/.test(it.id ?? '')) errors.push(`${tag}: article id must be clanek-*.html`);
      else if (articleSlugs.size && !articleSlugs.has(it.id)) errors.push(`${tag}: article '${it.id}' nenalezen v data/articles.json`);
    }
    if (it.type === 'indicator') {
      const m = /^indicator:([\w-]+)$/.exec(it.id ?? '');
      if (!m) errors.push(`${tag}: indicator id must be indicator:{id}`);
      else if (indicatorIds.size && !indicatorIds.has(m[1])) errors.push(`${tag}: indicator '${m[1]}' nenalezen v data/indicators.json`);
    }
    if (it.checked_at && !ISO_DATE_RE.test(it.checked_at)) errors.push(`${tag}: checked_at must be YYYY-MM-DD`);
    if (it.content_hash && !SHA1_RE.test(it.content_hash)) errors.push(`${tag}: content_hash must be sha1 hex`);
    if (it.run_id && typeof it.run_id !== 'string') errors.push(`${tag}: run_id must be string`);
    if (it.tools && (typeof it.tools.pubmed !== 'boolean' || typeof it.tools.consensus !== 'boolean')) {
      errors.push(`${tag}: tools.pubmed / tools.consensus must be boolean`);
    }
    if (it.models) {
      for (const [role, m] of Object.entries(it.models)) {
        if (!VALID_MODELS.includes(m)) errors.push(`${tag}: models.${role} '${m}' not in ${VALID_MODELS.join('|')}`);
      }
    }

    const claims = Array.isArray(it.claims) ? it.claims : [];
    if (it.claims && !Array.isArray(it.claims)) errors.push(`${tag}: claims must be array`);
    const counts = Object.fromEntries(VALID_VERDICTS.map(v => [v, 0]));
    for (const [j, c] of claims.entries()) {
      const ctag = `${tag} claim[${j}]`;
      if (!c || typeof c !== 'object') { errors.push(`${ctag}: not an object`); continue; }
      if (!c.text || typeof c.text !== 'string') errors.push(`${ctag}: missing text`);
      if (c.kind && !VALID_KINDS.includes(c.kind)) errors.push(`${ctag}: invalid kind '${c.kind}'`);
      if (!VALID_VERDICTS.includes(c.verdict)) errors.push(`${ctag}: invalid verdict '${c.verdict}'`);
      else counts[c.verdict]++;
      if (c.confidence && !VALID_CONFIDENCE.includes(c.confidence)) errors.push(`${ctag}: invalid confidence '${c.confidence}'`);
      if (c.claim_id && claimIds.size && !claimIds.has(c.claim_id)) errors.push(`${ctag}: claim_id '${c.claim_id}' nenalezen v data/claims.json`);
      if (['contradicted', 'unclear', 'partial'].includes(c.verdict) && !(c.note && c.note.trim())) {
        errors.push(`${ctag}: verdict '${c.verdict}' requires a note`);
      }
      const ev = Array.isArray(c.evidence) ? c.evidence : [];
      if (c.evidence && !Array.isArray(c.evidence)) errors.push(`${ctag}: evidence must be array`);
      if (['supported', 'partial', 'contradicted'].includes(c.verdict) && !ev.length) {
        errors.push(`${ctag}: verdict '${c.verdict}' requires at least one evidence entry`);
      }
      for (const [k, e] of ev.entries()) {
        const etag = `${ctag} evidence[${k}]`;
        if (!e || typeof e !== 'object') { errors.push(`${etag}: not an object`); continue; }
        const pmid = e.pmid ? String(e.pmid) : '';
        const doi = e.doi ? String(e.doi) : '';
        if (!pmid && !doi) errors.push(`${etag}: needs pmid or doi`);
        if (pmid && !PMID_RE.test(pmid)) errors.push(`${etag}: invalid pmid '${pmid}'`);
        if (doi && !DOI_RE.test(doi)) errors.push(`${etag}: invalid doi '${doi}'`);
        if (!e.title) errors.push(`${etag}: missing title`);
        if (e.year != null && !(Number.isInteger(e.year) && e.year >= 1900 && e.year <= 2100)) errors.push(`${etag}: invalid year`);
        if (!VALID_FOUND_VIA.includes(e.found_via)) errors.push(`${etag}: invalid found_via '${e.found_via}'`);
        if (!VALID_RELATIONS.includes(e.relation)) errors.push(`${etag}: invalid relation '${e.relation}'`);
        if (e.found_via === 'consensus' && e.verified_in_pubmed !== true) {
          errors.push(`${etag}: studie z Consensus musí být ověřena v PubMed (verified_in_pubmed: true)`);
        }
      }
    }
    if (it.summary) {
      for (const v of VALID_VERDICTS) {
        const key = v.replace(/-/g, '_');
        const got = it.summary[key] ?? it.summary[v] ?? 0;
        if (got !== counts[v]) errors.push(`${tag}: summary.${key}=${got} ≠ ${counts[v]} (počet claims s verdiktem ${v}; chybějící klíč = 0)`);
      }
    }

    const actions = Array.isArray(it.actions) ? it.actions : [];
    if (it.actions && !Array.isArray(it.actions)) errors.push(`${tag}: actions must be array`);
    for (const [k, a] of actions.entries()) {
      if (!a || !VALID_ACTIONS.includes(a.type)) errors.push(`${tag} action[${k}]: invalid type '${a?.type}'`);
      if (a?.type === 'issue' && !a.ref) errors.push(`${tag} action[${k}]: issue action needs ref (URL nebo #číslo)`);
    }
    if (counts.contradicted > 0 && !actions.some(a => a.type === 'flagged' || a.type === 'issue')) {
      errors.push(`${tag}: contradicted claim vyžaduje akci flagged nebo issue`);
    }
  }

  const blob = JSON.stringify(data.items ?? []);
  const bp = TOOL_BOILERPLATE_RE.exec(blob);
  if (bp) errors.push(`Provozní text nástroje v registru: „${bp[0]}“ — Consensus/PubMed jsou nástroje, ne zdroje`);
  return errors;
}

export function loadForeignKeys(root = ROOT) {
  const read = (rel) => {
    const f = path.join(root, rel);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  };
  const arts = read('data/articles.json');
  const inds = read('data/indicators.json');
  const claims = read('data/claims.json');
  return {
    articleSlugs: new Set((arts?.articles ?? []).map(a => a.slug)),
    indicatorIds: new Set((inds?.indicators ?? []).map(i => i.id)),
    claimIds: new Set((claims?.claims ?? []).map(c => c.id)),
  };
}

function main() {
  const file = path.join(ROOT, 'data', 'evidence-audit.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/evidence-audit.json not found');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateEvidenceAudit(data, loadForeignKeys());
  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  const items = data.items ?? [];
  const n = (t) => items.filter(i => i.type === t).length;
  const claims = items.reduce((s, i) => s + (i.claims?.length ?? 0), 0);
  console.log(`OK: data/evidence-audit.json — ${items.length} položek (${n('article')} článků, ${n('indicator')} indikátorů), ${claims} tvrzení`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
