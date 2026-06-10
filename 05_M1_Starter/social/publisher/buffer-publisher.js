// Publikace přímo do Bufferu (https://buffer.com).
//
// Schválené příspěvky z Notion fronty se
// vloží přímo do Buffer fronty per kanál (profile). Buffer je pak publikuje
// podle nastaveného rozvrhu, nebo v zadaný čas (scheduled_at).
//
// Konfigurace (GitHub Secrets / .env.local):
//   BUFFER_ACCESS_TOKEN          — Buffer access token (Developer → Access Token)
//   BUFFER_PROFILE_FACEBOOK      — profile_id facebookové stránky
//   BUFFER_PROFILE_INSTAGRAM     — profile_id instagramového účtu
//   BUFFER_PROFILE_LINKEDIN      — (volitelně)
//   BUFFER_PROFILE_X             — (volitelně)
//   BUFFER_API_BASE              — (volitelně) override; default https://api.bufferapp.com/1
//
// Profile_ids zjistíš jednorázově: GET {BASE}/profiles.json?access_token=… nebo
// pomocným skriptem `node social/publisher/buffer-list-profiles.js`.

import { env } from '../config.js';

const DEFAULT_BASE = 'https://api.bufferapp.com/1';

/** Vrátí mapu network → profile_id z env (jen nakonfigurované kanály). */
export function bufferProfileMap(e = env) {
  const map = {};
  if (e.bufferProfileFacebook) map.facebook = e.bufferProfileFacebook;
  if (e.bufferProfileInstagram) map.instagram = e.bufferProfileInstagram;
  if (e.bufferProfileLinkedin) map.linkedin = e.bufferProfileLinkedin;
  if (e.bufferProfileX) map.x = e.bufferProfileX;
  return map;
}

/** Absolutní URL obrázku (Buffer media[photo] potřebuje veřejnou URL). */
function absoluteImageUrl(imageUrl, site) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${site.replace(/\/$/, '')}/${String(imageUrl).replace(/^\//, '')}`;
}

/**
 * Vloží jeden příspěvek do Buffer fronty pro daný profil.
 * Bez `scheduledAt` → příspěvek jde na další volný slot Buffer rozvrhu.
 *
 * @returns {Promise<{ok:boolean, id?:string}>}
 */
export async function createBufferUpdate(
  { profileId, text, imageUrl = null, articleUrl = null, scheduledAt = null, now = false, site },
  { token = env.bufferAccessToken, base = env.bufferApiBase || DEFAULT_BASE, fetchImpl = fetch } = {},
) {
  if (!token) throw new Error('BUFFER_ACCESS_TOKEN není nastaven.');
  if (!profileId) throw new Error('Chybí profile_id pro Buffer.');

  const form = new URLSearchParams();
  form.append('access_token', token);
  form.append('profile_ids[]', profileId);
  form.append('text', text);
  const photo = absoluteImageUrl(imageUrl, site);
  if (photo) {
    form.append('media[photo]', photo);
    form.append('media[thumbnail]', photo);
  }
  if (articleUrl) form.append('media[link]', articleUrl);
  if (scheduledAt) form.append('scheduled_at', scheduledAt);
  else if (now) form.append('now', 'true');
  // bez scheduled_at i now → Buffer přidá na další volný slot fronty

  const res = await fetchImpl(`${base.replace(/\/$/, '')}/updates/create.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const detail = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Buffer API ${res.status}: ${detail.slice(0, 200)}`);
  }
  let id;
  try { id = JSON.parse(detail)?.updates?.[0]?.id; } catch { /* ignore */ }
  return { ok: true, id };
}

/**
 * Publikuje schválené řádky jednoho článku do Bufferu (každá síť do svého profilu).
 * Vrací { sent: [{network,id}], skipped: [{network,reason}] }.
 */
export async function publishArticleToBuffer(rows, { scheduleAt = null, site, profiles = bufferProfileMap(), opts = {} } = {}) {
  const sent = [];
  const skipped = [];
  for (const row of rows) {
    const profileId = profiles[row.network];
    if (!profileId) {
      skipped.push({ network: row.network, reason: 'kanál nemá nakonfigurovaný BUFFER_PROFILE_…' });
      continue;
    }
    const r = await createBufferUpdate({
      profileId,
      text: row.text,
      imageUrl: row.imageUrl,
      articleUrl: row.articleUrl,
      scheduledAt: scheduleAt,
      site,
    }, opts);
    sent.push({ network: row.network, id: r.id });
  }
  return { sent, skipped };
}
