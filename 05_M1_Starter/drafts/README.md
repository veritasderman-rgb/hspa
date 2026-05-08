# `drafts/` — pracovní redakční rozpracované články

Tento adresář obsahuje **rozpracované draftové články**, které **nejsou součástí veřejné navigace** HSPA Monitoru.

## Pravidla

- Soubor `drafts/clanek-*.html` se **nezobrazuje** v `clanky.html` ani v hlavním rozcestníku.
- Není propojen v `data/articles.json` — `loadAndRenderHomeArticles()` v `src/app.js` o něm neví.
- Vyhledávače nezindexují (každý draft má `<meta name="robots" content="noindex, nofollow">`).
- CSS odkazuje relativně přes `../src/styles.css`, takže draft lze otevřít přímo souborovým prohlížečem nebo přes `npm run serve` na adrese `http://localhost:8080/drafts/clanek-...html`.

## Workflow zveřejnění

Když se draft připraví k publikaci:

1. Přesun: `mv drafts/clanek-XYZ.html clanek-XYZ.html`
2. V `<head>`: změnit `noindex, nofollow` → `index, follow`, opravit cestu k `src/styles.css`, doplnit `<script type="module" src="src/clanky.js"></script>` před `</body>`.
3. Záznam do `data/articles.json` (id, slug, kind, title, perex, date, linked_indicators).
4. Záznam do `clanky.html` jako `<li class="article-list-item">`.
5. Validace: `npm test && npm run validate:all`.

## Aktuální drafty

- **`clanek-novela-290-2025-prava-pacientu.html`** — komplexní analýza novely zákona o zdravotních službách č. 290/2025 Sb. (účinnost od 1. 1. 2026). Připraveno k publikaci po ověření prováděcích vyhlášek 462/2025 Sb. a 432/2025 Sb.
