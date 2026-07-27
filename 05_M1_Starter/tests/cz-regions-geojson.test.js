// Topologie geojsonu krajů — regresní test na „neklikatelnou Prahu".
//
// Praha (CZ010) je enkláva uvnitř Středočeského kraje (CZ020). Pokud polygon
// Středočeského nemá interior ring (díru) na Prahu, jeho fill Prahu celou
// překryje — a protože se v echarts vykresluje PO Praze (pořadí features),
// veškerý hover/klik v území Prahy trefí Středočeský kraj. Symptom na webu:
// na Prahu „nejde kliknout" na kraje.html, financovani.html i kolonoskopie.html.
//
// Fix = díra: vnější ring Prahy vložený jako coordinates[1] Středočeského
// s OPAČNÝM windingem (canvas/zrender používá nonzero fill rule — při stejném
// windingu by winding number zůstal ≠ 0 a díra by nefungovala).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cz-regions.geojson'), 'utf8'));

const byCode = Object.fromEntries(geo.features.map(f => [f.properties.code, f]));

function signedArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

// Winding number (nonzero rule) přes všechny ringy polygonu — stejná sémantika
// jako canvas fill()/isPointInPath a zrender contain.
function windingNumber(pt, rings) {
  let wn = 0;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xj, yj] = ring[j];
      const [xi, yi] = ring[i];
      if (yj <= pt[1]) {
        if (yi > pt[1] && (xi - xj) * (pt[1] - yj) - (pt[0] - xj) * (yi - yj) > 0) wn++;
      } else if (yi <= pt[1] && (xi - xj) * (pt[1] - yj) - (pt[0] - xj) * (yi - yj) < 0) {
        wn--;
      }
    }
  }
  return wn;
}

function centroid(ring) {
  let cx = 0, cy = 0;
  for (const p of ring) { cx += p[0]; cy += p[1]; }
  return [cx / ring.length, cy / ring.length];
}

test('geojson má 14 krajů a Praha/Středočeský existují', () => {
  assert.equal(geo.features.length, 14);
  assert.ok(byCode.CZ010, 'chybí Praha');
  assert.ok(byCode.CZ020, 'chybí Středočeský kraj');
});

test('Středočeský kraj má díru na Prahu (interior ring)', () => {
  const rings = byCode.CZ020.geometry.coordinates;
  assert.equal(rings.length, 2,
    'Středočeský musí mít 2 ringy (vnější hranice + díra na Prahu) — bez díry překrývá Prahu a krade jí hover/klik');
});

test('díra má opačný winding než vnější ring (nonzero fill rule)', () => {
  const [outer, hole] = byCode.CZ020.geometry.coordinates;
  const a1 = signedArea(outer);
  const a2 = signedArea(hole);
  assert.ok(a1 * a2 < 0,
    `winding díry musí být opačný (outer ${a1 > 0 ? 'CCW' : 'CW'}, hole ${a2 > 0 ? 'CCW' : 'CW'}) — jinak nonzero rule díru nevytvoří`);
});

test('centroid Prahy NENÍ ve výplni Středočeského (winding number = 0)', () => {
  const phaCentroid = centroid(byCode.CZ010.geometry.coordinates[0]);
  const wn = windingNumber(phaCentroid, byCode.CZ020.geometry.coordinates);
  assert.equal(wn, 0,
    'centroid Prahy má mít winding number 0 vůči Středočeskému — jinak fill Středočeského Prahu překrývá');
});

test('centroid Prahy JE ve výplni Prahy', () => {
  const phaCentroid = centroid(byCode.CZ010.geometry.coordinates[0]);
  const wn = windingNumber(phaCentroid, byCode.CZ010.geometry.coordinates);
  assert.notEqual(wn, 0, 'centroid Prahy musí ležet uvnitř polygonu Prahy');
});

test('díra geometricky odpovídá vnějšímu ringu Prahy (stejné body)', () => {
  const hole = byCode.CZ020.geometry.coordinates[1];
  const pha = byCode.CZ010.geometry.coordinates[0];
  const key = p => p[0].toFixed(4) + ',' + p[1].toFixed(4);
  assert.deepEqual(new Set(hole.map(key)), new Set(pha.map(key)),
    'díra ve Středočeském musí kopírovat hranici Prahy');
});

test('ostatní kraje mají nadále jediný ring (fix nesmí nic rozbít)', () => {
  for (const f of geo.features) {
    const code = f.properties.code;
    if (code === 'CZ020') continue;
    assert.equal(f.geometry.coordinates.length, 1, `${code} má mít 1 ring`);
  }
});
