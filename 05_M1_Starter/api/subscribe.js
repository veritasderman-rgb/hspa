// Vercel serverless function — přihlášení k newsletteru přes Brevo.
//
// Proč existuje: web je statický a Brevo API klíč nesmí být v klientském
// kódu. Formuláře (footer + popup, viz src/newsletter-signup.js) POSTují
// { email, source } sem a tahle funkce kontakt založí/aktualizuje v Brevu.
//
// Konfigurace (Vercel → Settings → Environment Variables):
//   BREVO_API_KEY          povinné — API klíč z Brevo (Settings → SMTP & API → API Keys)
//   BREVO_LIST_ID          volitelné — ID cílového listu (default 2 = hlavní list účtu SkoreZdravko)
//   BREVO_DOI_TEMPLATE_ID  volitelné — když je nastavené, použije se double opt-in
//                          (Brevo šablona potvrzovacího e-mailu) místo přímého zápisu
//   BREVO_DOI_REDIRECT     volitelné — kam Brevo přesměruje po potvrzení DOI
//                          (default https://skorezdravotnictvi.cz/?nl=potvrzeno)
//
// Bez BREVO_API_KEY vrací 503, aby formulář ukázal srozumitelnou chybu
// místo tichého zahození adresy.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      message: 'Přihlašování je dočasně nedostupné (chybí konfigurace).',
    });
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const source = String(req.body?.source ?? 'web').slice(0, 32);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, message: 'Zadejte prosím platnou e-mailovou adresu.' });
  }

  const listId = Number(process.env.BREVO_LIST_ID || 2);
  const doiTemplateId = Number(process.env.BREVO_DOI_TEMPLATE_ID || 0);
  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  };
  // NEWSLETTER_SOURCE je textový atribut — v Brevu ho stačí jednou založit
  // (Contacts → Settings → Contact attributes), jinak ho Brevo tiše ignoruje.
  const attributes = { NEWSLETTER_SOURCE: source };

  try {
    let brevoRes;
    if (doiTemplateId > 0) {
      // Double opt-in: Brevo pošle potvrzovací e-mail, do listu kontakt
      // zapíše až po kliknutí. Vyžaduje DOI šablonu vytvořenou v Brevu.
      brevoRes = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          attributes,
          includeListIds: [listId],
          templateId: doiTemplateId,
          redirectionUrl: process.env.BREVO_DOI_REDIRECT
            || 'https://skorezdravotnictvi.cz/?nl=potvrzeno',
        }),
      });
    } else {
      // Single opt-in: kontakt jde do listu rovnou. Souhlas sbírá checkbox
      // ve formuláři; updateEnabled=true dělá z opakovaného přihlášení no-op.
      brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, attributes, listIds: [listId], updateEnabled: true }),
      });
    }

    // 201 created / 204 updated / 200 DOI accepted → hotovo.
    if (brevoRes.ok) {
      return res.status(200).json({ ok: true });
    }

    // Duplicitní kontakt hlásíme jako úspěch — z pohledu uživatele je přihlášen.
    let detail = null;
    try { detail = await brevoRes.json(); } catch { /* prázdné tělo */ }
    if (detail?.code === 'duplicate_parameter') {
      return res.status(200).json({ ok: true });
    }

    console.error('brevo subscribe failed', brevoRes.status, detail?.code, detail?.message);
    return res.status(502).json({
      ok: false,
      message: 'Přihlášení se teď nepovedlo. Zkuste to prosím za chvíli znovu.',
    });
  } catch (err) {
    console.error('brevo subscribe error', err?.message);
    return res.status(502).json({
      ok: false,
      message: 'Přihlášení se teď nepovedlo. Zkuste to prosím za chvíli znovu.',
    });
  }
}
