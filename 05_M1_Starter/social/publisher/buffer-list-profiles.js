// Jednorázový pomocník: vypíše Buffer profily (kanály) a jejich profile_id,
// abys je mohl vložit do BUFFER_PROFILE_FACEBOOK / _INSTAGRAM atd.
//
// Spuštění:  BUFFER_ACCESS_TOKEN=… node social/publisher/buffer-list-profiles.js

import { env } from '../config.js';

const base = (env.bufferApiBase || 'https://api.bufferapp.com/1').replace(/\/$/, '');
if (!env.bufferAccessToken) {
  console.error('Chybí BUFFER_ACCESS_TOKEN.');
  process.exit(1);
}
const res = await fetch(`${base}/profiles.json?access_token=${encodeURIComponent(env.bufferAccessToken)}`);
if (!res.ok) {
  console.error(`Buffer API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  process.exit(1);
}
const profiles = await res.json();
for (const p of profiles) {
  console.log(`${(p.service || '?').padEnd(12)} ${p.id}  ${p.formatted_username || p.formatted_service || ''}`);
}
console.log(`\nNastav podle service: BUFFER_PROFILE_FACEBOOK / _INSTAGRAM / _LINKEDIN / _X = <id>`);
