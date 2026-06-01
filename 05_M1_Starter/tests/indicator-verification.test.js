// Test helperu resolveVerificationStatus (src/page-shared.js) — jednotné
// odvození verifikačního odznaku z dat indikátoru, sdílené detailem i přehledem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVerificationStatus, verifBadgeHtml } from '../src/page-shared.js';

test('explicitní podporovaný status má přednost', () => {
  assert.equal(resolveVerificationStatus({ verification_status: 'verified' }), 'verified');
  assert.equal(resolveVerificationStatus({ verification_status: 'preliminary' }), 'preliminary');
  assert.equal(resolveVerificationStatus({ verification_status: 'illustrative' }), 'illustrative');
});

test('neznámý/rozpracovaný status → preliminary (nikdy prázdná pill)', () => {
  assert.equal(resolveVerificationStatus({ verification_status: 'review-pending' }), 'preliminary');
  assert.equal(resolveVerificationStatus({ verification_status: 'needs_verification' }), 'preliminary');
});

test('bez statusu se odvodí z původu hodnoty', () => {
  assert.equal(resolveVerificationStatus({ source: { origin: 'seed' } }), 'illustrative');
  assert.equal(resolveVerificationStatus({ source: { origin: 'live' } }), 'preliminary');
});

test('explicitní status přebíjí origin', () => {
  assert.equal(
    resolveVerificationStatus({ verification_status: 'verified', source: { origin: 'seed' } }),
    'verified'
  );
});

test('bez statusu i bez origin → null (žádný odznak)', () => {
  assert.equal(resolveVerificationStatus({}), null);
  assert.equal(resolveVerificationStatus({ source: {} }), null);
  assert.equal(resolveVerificationStatus(null), null);
});

test('verifBadgeHtml: známý stav → pill s textem, neznámý → prázdný řetězec', () => {
  const seed = verifBadgeHtml({ source: { origin: 'seed' } });
  assert.match(seed, /verif-illustrative/);
  assert.match(seed, /Ilustrativní/);
  assert.equal(verifBadgeHtml({}), '');
});
