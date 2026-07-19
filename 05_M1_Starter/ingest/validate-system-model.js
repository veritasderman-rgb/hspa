// Validace data/system-model.json (kauzální model systému, PLAN-SYSTEM-MODEL.md).
// Spouštěj v CI před deployem: node ingest/validate-system-model.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const NODE_REQUIRED = ['id', 'label', 'layer', 'kind', 'x', 'y', 'desc'];
const EDGE_REQUIRED = ['id', 'from', 'to', 'polarity', 'mechanism', 'strength'];
const VALID_LAYERS = ['Struktury', 'Procesy', 'Výstupy', 'Výsledky'];
const VALID_KINDS = ['lever', 'flow', 'outcome'];
const VALID_POLARITIES = ['plus', 'minus'];
const VALID_STRENGTHS = ['strong', 'weak'];
const PERSPECTIVE_ROLES = ['pacient', 'lekar', 'reditel'];
const VALID_VISIBILITY = ['clear', 'fog'];

function loadIdSet(file, key, field = 'id') {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return new Set();
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  return new Set((data[key] ?? []).map(x => x[field]));
}

function validate() {
  const file = path.join(ROOT, 'data', 'system-model.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/system-model.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];

  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!Array.isArray(data.nodes)) errors.push('nodes must be array');
  if (!Array.isArray(data.edges)) errors.push('edges must be array');
  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }

  const validIndicatorIds = loadIdSet('data/indicators.json', 'indicators');
  const validArticleSlugs = loadIdSet('data/articles.json', 'articles', 'slug');
  const validExplainerIds = loadIdSet('data/explainers.json', 'explainers');

  const nodeIds = new Set();
  for (const [i, n] of data.nodes.entries()) {
    const tag = `node[${i}] (${n.id ?? '?'})`;
    for (const f of NODE_REQUIRED) {
      if (n[f] == null) errors.push(`${tag}: missing required '${f}'`);
    }
    if (n.id) {
      if (nodeIds.has(n.id)) errors.push(`${tag}: duplicate id`);
      nodeIds.add(n.id);
    }
    if (n.layer && !VALID_LAYERS.includes(n.layer)) errors.push(`${tag}: invalid layer '${n.layer}'`);
    if (n.kind && !VALID_KINDS.includes(n.kind)) errors.push(`${tag}: invalid kind '${n.kind}'`);
    if (n.x != null && typeof n.x !== 'number') errors.push(`${tag}: x must be number`);
    if (n.y != null && typeof n.y !== 'number') errors.push(`${tag}: y must be number`);
    for (const id of n.indicators ?? []) {
      if (validIndicatorIds.size && !validIndicatorIds.has(id)) {
        errors.push(`${tag}: indicator '${id}' nenalezen v data/indicators.json`);
      }
    }
    for (const slug of n.articles ?? []) {
      if (validArticleSlugs.size && !validArticleSlugs.has(slug)) {
        errors.push(`${tag}: article '${slug}' nenalezen v data/articles.json`);
      }
      if (!fs.existsSync(path.join(ROOT, slug))) {
        errors.push(`${tag}: soubor '${slug}' neexistuje`);
      }
    }
    for (const id of n.explainers ?? []) {
      if (validExplainerIds.size && !validExplainerIds.has(id)) {
        errors.push(`${tag}: explainer '${id}' nenalezen v data/explainers.json`);
      }
    }
    const hasEvidence = (n.indicators ?? []).length > 0 || (n.articles ?? []).length > 0;
    if (!hasEvidence) errors.push(`${tag}: uzel nemá žádný indikátor ani článek (model drží jen doložené uzly)`);

    // Perspektivy Tři židle: každý uzel nese pohled všech tří rolí
    if (!n.perspectives) {
      errors.push(`${tag}: chybí perspectives (Tři židle — pacient/lekar/reditel)`);
    } else {
      for (const role of PERSPECTIVE_ROLES) {
        const p = n.perspectives[role];
        if (!p) { errors.push(`${tag}: perspectives.${role} chybí`); continue; }
        if (!VALID_VISIBILITY.includes(p.visibility)) errors.push(`${tag}: perspectives.${role}.visibility musí být clear|fog`);
        if (!p.alt_label) errors.push(`${tag}: perspectives.${role}.alt_label chybí`);
        if (!p.note) errors.push(`${tag}: perspectives.${role}.note chybí`);
      }
    }
  }

  const edgeIds = new Set();
  const connected = new Set();
  for (const [i, e] of data.edges.entries()) {
    const tag = `edge[${i}] (${e.id ?? '?'})`;
    for (const f of EDGE_REQUIRED) {
      if (e[f] == null) errors.push(`${tag}: missing required '${f}'`);
    }
    if (e.id) {
      if (edgeIds.has(e.id)) errors.push(`${tag}: duplicate id`);
      edgeIds.add(e.id);
    }
    if (e.from && !nodeIds.has(e.from)) errors.push(`${tag}: from '${e.from}' není uzel`);
    if (e.to && !nodeIds.has(e.to)) errors.push(`${tag}: to '${e.to}' není uzel`);
    if (e.from && e.from === e.to) errors.push(`${tag}: self-loop není povolen`);
    if (e.polarity && !VALID_POLARITIES.includes(e.polarity)) errors.push(`${tag}: invalid polarity '${e.polarity}'`);
    if (e.strength && !VALID_STRENGTHS.includes(e.strength)) errors.push(`${tag}: invalid strength '${e.strength}'`);
    for (const slug of e.articles ?? []) {
      if (validArticleSlugs.size && !validArticleSlugs.has(slug)) {
        errors.push(`${tag}: article '${slug}' nenalezen v data/articles.json`);
      }
    }
    if (e.conflict != null && typeof e.conflict !== 'boolean') errors.push(`${tag}: conflict musí být boolean`);
    if (e.conflict && !e.conflict_note) errors.push(`${tag}: conflict hrana musí mít conflict_note (čí zisk je čí náklad)`);
    connected.add(e.from);
    connected.add(e.to);
  }

  for (const id of nodeIds) {
    if (!connected.has(id)) errors.push(`node ${id}: osiřelý uzel bez jediné hrany`);
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: validated ${data.nodes.length} nodes + ${data.edges.length} edges (system-model).`);
}

validate();
