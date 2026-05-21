// Publikace přes Make.com webhook.
//
// Make.com scénář (viz docs/make-scenario.json) přijme payload, projde
// iterátorem 4 sítě a každou publikuje příslušným modulem. Požadavek je
// autentizován API klíčem (hlavička x-make-apikey) — Make ho ověří proti
// MAKE_WEBHOOK_SECRET.

import { env } from '../config.js';

/** Sestaví payload pro jeden článek ze schválených řádků fronty. */
export function buildMakePayload(articleId, rows, { scheduleAt = null } = {}) {
  const posts = {};
  for (const row of rows) {
    posts[row.network] = {
      text: row.text,
      imageUrl: row.imageUrl ?? null,
      articleUrl: row.articleUrl ?? null,
      ...(row.thread ? { thread: row.thread } : {}),
    };
  }
  return { articleId, scheduleAt, posts };
}

/**
 * Odešle payload na Make.com webhook. Vrací { ok, status }.
 * Vyhodí chybu při chybějící konfiguraci nebo non-2xx odpovědi.
 */
export async function sendToMake(payload, { webhookUrl = env.makeWebhookUrl, secret = env.makeWebhookSecret } = {}) {
  if (!webhookUrl) throw new Error('MAKE_WEBHOOK_URL není nastaven.');

  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['x-make-apikey'] = secret;
  }

  const res = await fetch(webhookUrl, { method: 'POST', headers, body });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Make.com webhook vrátil ${res.status}: ${detail.slice(0, 200)}`);
  }
  return { ok: true, status: res.status };
}
