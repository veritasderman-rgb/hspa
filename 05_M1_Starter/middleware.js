// Vercel Edge Middleware — ochrana pracovní verze Srovnávače zdravotních pojišťoven heslem.
//
// Chrání stránku /pojistovny(.html) a její datové soubory /data/pojistovny*.json
// HTTP Basic Auth. Heslo se čte z proměnné prostředí POJISTOVNY_HESLO
// (Vercel → Project → Settings → Environment Variables; nastavit pro Production
// i Preview). Uživatelské jméno je libovolné. Bez nastavené proměnné middleware
// zavírá (503) — nikdy nepustí stránku ven nechráněnou omylem.
//
// Navíc posílá X-Robots-Tag: noindex, aby se stránka neindexovala ani přes odkaz.
// Po zveřejnění (rozhodnutí vydavatele, třída C): smazat tento soubor nebo
// vyprázdnit matcher, odstranit <meta name="robots" content="noindex"> ze stránky
// a zapsat ji do STATIC_PAGES v scripts/generate-sitemap.js.

export const config = {
  matcher: ['/pojistovny', '/pojistovny.html', '/data/pojistovny.json', '/data/pojistovny-:path*'],
};

const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow, noarchive' };

function unauthorized(message = 'Pracovní verze. Zadejte heslo.') {
  return new Response(message, {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Srovnavac zdravotnich pojistoven (pracovni verze)", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...NOINDEX,
    },
  });
}

export default function middleware(request) {
  const heslo = process.env.POJISTOVNY_HESLO;
  if (!heslo) {
    return new Response('Stránka je dočasně nedostupná (chybí POJISTOVNY_HESLO).', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...NOINDEX },
    });
  }
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return unauthorized();
  let decoded = '';
  try { decoded = atob(auth.slice(6)); } catch { return unauthorized('Neplatná hlavička Authorization.'); }
  const sep = decoded.indexOf(':');
  const password = sep >= 0 ? decoded.slice(sep + 1) : decoded;
  if (password !== heslo) return unauthorized('Špatné heslo.');

  // Projde dál; jen přidá noindex a zakáže cache sdílenou mezi uživateli.
  const headers = new Headers({ ...NOINDEX, 'Cache-Control': 'private, no-store' });
  return new Response(null, { headers: { 'x-middleware-next': '1', ...Object.fromEntries(headers) } });
}
