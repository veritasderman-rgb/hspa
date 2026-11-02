// Přístup k Neonu (Postgres) pro dotazníky srovnávače pojišťoven.
//
// Sdílí ho api/dotaznik.js a skripty scripts/export-dotaznik.js a
// scripts/dotaznik-token.js. Vrací tagged-template klient `sql` z
// @neondatabase/serverless, takže volající nikdy nesestavuje SQL
// spojováním řetězců.
//
// Konfigurace (Vercel → Settings → Environment Variables):
//   DATABASE_URL   connection string projektu hspa-dotazniky (Neon, pooled)
//
// Fail-closed: bez DATABASE_URL nebo bez nainstalovaného balíčku vrací
// getSql() chybu s HTTP 503 a handler nic neukládá.
//
// Pro testy: globalThis.__hspaSqlForTests (funkce `sql`, tagged template)
// má přednost před env i před balíčkem, takže se testuje bez živé DB.
//
// Balíček @neondatabase/serverless je záměrně načítaný dynamicky a NENÍ
// v package.json (přidání závislosti je změna třídy C, dělá ji vydavatel:
// `npm i @neondatabase/serverless`).

export const ERR_NEKONFIGUROVANO = 'dotaznik-neni-nakonfigurovan';
export const ERR_ZAVISLOST = 'chybi-zavislost';

/**
 * Z hodnoty env proměnné vytáhne čistý connection string. Konektory a ruční
 * vkládání ji občas zabalí do uvozovek nebo do příkazu `psql '…'`.
 */
export function normalizeDatabaseUrl(raw) {
  let v = String(raw ?? '').trim();
  if (!v) return '';
  const m = v.match(/postgres(?:ql)?:\/\/[^\s'"]+/i);
  if (!m) return '';
  v = m[0];
  return v;
}

/**
 * @returns {Promise<{sql: Function|null, status?: number, error?: string, message?: string}>}
 */
export async function getSql() {
  const injected = globalThis.__hspaSqlForTests;
  if (typeof injected === 'function') return { sql: injected };

  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    return {
      sql: null,
      status: 503,
      error: ERR_NEKONFIGUROVANO,
      message: 'Dotazník zatím není aktivní (chybí konfigurace databáze).',
    };
  }
  let mod;
  try {
    mod = await import('@neondatabase/serverless');
  } catch {
    return {
      sql: null,
      status: 503,
      error: ERR_ZAVISLOST,
      message: 'Dotazník zatím není aktivní (na serveru chybí databázový balíček).',
    };
  }
  try {
    return { sql: mod.neon(url) };
  } catch {
    return {
      sql: null,
      status: 503,
      error: ERR_NEKONFIGUROVANO,
      message: 'Dotazník zatím není aktivní (neplatná konfigurace databáze).',
    };
  }
}
