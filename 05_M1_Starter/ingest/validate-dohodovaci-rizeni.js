// Validace data/dohodovaci-rizeni.json proti datovému kontraktu.
// Spouštěj v CI před deployem: node ingest/validate-dohodovaci-rizeni.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const file = path.join(ROOT, 'data', 'dohodovaci-rizeni.json');
if (!fs.existsSync(file)) fail('data/dohodovaci-rizeni.json not found — spusť node ingest/build-dohodovaci-rizeni.js');

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];

if (!data.version) errors.push('missing version');
if (!data.generated_at) errors.push('missing generated_at');
if (!data.negotiation_context?.lead) errors.push('missing negotiation_context.lead');

const dims = data.dimensions;
if (!Array.isArray(dims) || dims.length !== 9) {
  fail(`expected 9 dimensions, got ${dims?.length ?? 0}`);
}
const dimIds = new Set();
for (const d of dims) {
  for (const f of ['id', 'number', 'label', 'color', 'description', 'dataset_ids']) {
    if (d[f] == null) errors.push(`dimension[${d.id ?? '?'}]: missing '${f}'`);
  }
  if (d.id) {
    if (dimIds.has(d.id)) errors.push(`duplicate dimension id: ${d.id}`);
    dimIds.add(d.id);
  }
  if (!Array.isArray(d.dataset_ids)) errors.push(`dimension[${d.id}]: dataset_ids must be array`);
}

const datasets = data.datasets;
if (!Array.isArray(datasets) || datasets.length === 0) fail('datasets must be non-empty array');

const VALID_STATUS = new Set(['ready', 'external', 'stub']);
const dsIds = new Set();
for (const ds of datasets) {
  const tag = `dataset[${ds.id ?? '?'}]`;
  for (const f of ['id', 'ois_code', 'dimension', 'title', 'nzip_page', 'status']) {
    if (ds[f] == null) errors.push(`${tag}: missing '${f}'`);
  }
  if (ds.id) {
    if (dsIds.has(ds.id)) errors.push(`duplicate dataset id: ${ds.id}`);
    dsIds.add(ds.id);
  }
  if (ds.status && !VALID_STATUS.has(ds.status)) {
    errors.push(`${tag}: invalid status '${ds.status}'`);
  }
  if (ds.dimension && !dimIds.has(ds.dimension)) {
    errors.push(`${tag}: unknown dimension '${ds.dimension}'`);
  }
  if (ds.status === 'ready') {
    if (!Array.isArray(ds.series) || ds.series.length === 0) {
      errors.push(`${tag}: status 'ready' must have non-empty series`);
    }
    if (!ds.headline) errors.push(`${tag}: status 'ready' should have headline`);
  }
  if (ds.status === 'external' && !ds.external_page) {
    errors.push(`${tag}: status 'external' must have external_page`);
  }
  if (!Array.isArray(ds.visualization?.animation?.controls)) {
    errors.push(`${tag}: missing visualization.animation.controls`);
  }
}

// křížová integrita: dataset_ids ↔ datasets
for (const d of dims) {
  for (const id of d.dataset_ids ?? []) {
    if (!dsIds.has(id)) errors.push(`dimension[${d.id}]: unknown dataset_id '${id}'`);
  }
}
for (const ds of datasets) {
  const dim = dims.find((d) => d.id === ds.dimension);
  if (dim && !dim.dataset_ids.includes(ds.id)) {
    errors.push(`dataset[${ds.id}]: not listed in dimension[${ds.dimension}].dataset_ids`);
  }
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} validation error(s):`);
  errors.forEach((e) => console.error('  -', e));
  process.exit(1);
}

console.log(
  `OK: validated dohodovaci-rizeni.json — ${dims.length} dimenzí, ${datasets.length} datových sad.`,
);
