# PLAN — „Doložka": každé číslo nese svůj důkaz

**Cíl:** Kvantitativní tvrzení v článcích (registr `data/claims.json`, 1 377 záznamů,
quotes garantovaně doslovně dohledatelné v HTML — vynucuje `claims-verify-quotes` v CI)
se čtenáři zobrazí jako klikatelné „doložky": klik na číslo → panel s průkazem původu
(metrika, hodnota + rok, indikátor, aktuální hodnota datového kontraktu, stav
✓ aktuální / ⚠ změněno, primární zdroj). Plus badge v hlavičce článku a sekce
„Důvěryhodnost" na redakce.html.

## Architektura (závazné kontrakty)

### Balíček A — engine: `src/dolozka-engine.js` + `tests/dolozka.test.js`

Čistý ES modul bez DOM/fetch (testovatelný v node:test). Exporty:

```js
export function normText(s)
// kolabuje whitespace (vč.   a newlines) na jednu mezeru, trim.

export function claimsForArticle(claims, slug)
// claims: pole z data/claims.json (pole .claims). slug: 'clanek-x.html'
// vrací claims s article === slug.

export function locateClaims(bodyText, claims)
// bodyText: normText() celého textu článku. Hledá normText(claim.quote)
// jako substring. Delší quotes první (překryvy: delší vyhrává, kratší
// překrývající se zahodí). Každý quote max 1× (první výskyt).
// vrací [{ claim, start, end }] seřazené podle start (pozice v NORMALIZOVANÉM textu).

export function matchesContract(claimValue, contractValue, tolerancePct)
// true když se kontraktová hodnota rovná claimu po zaokrouhlení na počet
// desetinných míst claimu, NEBO |rozdíl|/|contract|*100 <= tolerancePct (je-li zadán).

export function driftStatus(claim, indicatorsById)
// indicatorsById: Map z data/indicators.json.
// return { status, contractValue?, contractYear?, indicator? }
// status: 'current'  — relation exact + check auto + indicator existuje + matchesContract
//         'changed'  — relation exact + check auto + indikátor existuje + NEmatchuje
//         'reference'— vše ostatní (manual/related/bez indicator_id) → bez verdiktu,
//                      panel ukáže metric + source_note.

export function articleTrustStats(claims, slug, indicatorsById)
// { total, auto, current, changed, reference } pro badge.

export function corpusTrustStats(claims, indicatorsById)
// totéž přes celý korpus + { articles: počet unikátních article } pro redakce.html.
```

### Balíček B — UI: `src/dolozka-inline.js` + CSS `.dlz-*` v `src/styles.css`

```js
export function enhanceDolozka({ claims, indicators, root = document })
// - no-op pokud chybí article.article-page
// - slug = basename location.pathname (fallback: document místo pathname při file://)
// - textový offset-mapping přes TreeWalker (vzor src/glossary-inline.js):
//   skip uvnitř A, BUTTON, SCRIPT, STYLE, .dlz-*, .gloss-*
// - range v JEDNOM text nodu → obal <button class="dlz-chip">…</button>
//   range přes víc nodů → NEobaluj text, vlož jen značku <button class="dlz-mark">
//   za koncový node (fallback, bez rozbíjení DOM)
// - klik → jeden sdílený panel <div class="dlz-panel"> (aria-modal ne, role="dialog"
//   ne — stačí aria-expanded na chipu + role="note" panelu), ESC + klik mimo zavře
// - panel: metrika, „V textu: {value} {unit} ({as_of})", stav z driftStatus():
//   current → „✓ Odpovídá datovému kontraktu ({contractValue}, {contractYear})"
//   changed → „⚠ Kontrakt dnes uvádí {contractValue} ({contractYear}) — text vznikl s hodnotou {value}"
//   reference → „Referenční údaj" + source_note
//   + odkaz „Indikátor →" (indikator-{id}.html) je-li indicator_id
//   + patička „Registr tvrzení HSPA Monitoru · kontrola v prohlížeči"
// - badge: vloží do .article-meta nový <span class="dlz-badge">
//   „{total} čísel s doloženým původem{, ✓ {current} ověřeno proti kontraktu}"
//   (jen když total > 0); badge je odkaz na redakce.html#duveryhodnost
```

CSS: JEN namespace `.dlz-*`, JEN design tokeny (--paper/--paper2/--ink/--ink-mut/
--rule/--red/--good/--warn/--bad/--serif/--sans). Dark mode výhradně přes
`[data-theme="dark"]` tokeny (= žádné vlastní barvy, žádný prefers-color-scheme).
Chip: tečkované podtržení + drobný sufix ✓/⚠ (přes ::after, obsah dle
data-dlz-status). Nenápadné — text musí zůstat čitelný jako běžný text.

### Balíček C — Důvěryhodnost: sekce na `redakce.html` + render v `src/redakce.js`

- `redakce.html`: nová `<section id="duveryhodnost">` (vzor okolních sekcí) s
  krátkým výkladem (registr tvrzení, noční drift-scan, CI kontrola doslovnosti)
  a prázdnými sloty `<span data-dlz-stat="total|auto|current|articles">`.
- `src/redakce.js`: fetch `data/claims.json` + `data/indicators.json`, spočítat
  přes `corpusTrustStats` z `./dolozka-engine.js`, naplnit sloty. Graceful fail
  (catch → sekce zůstane s „—").
- Docs: přidat krátkou sekci do `docs/visual-components.md` (komponenta `.dlz-*`)
  a zmínku do `docs/quickref.md` (kde Doložka žije).

### Integrátor (hlavní session)

- `src/clanky.js`: import + volání `enhanceDolozka` (fetch claims+indicators
  paralelně, .catch → no-op) — AŽ PO všech balíčcích.
- `npm run build:css` (min-sync test), `npm test`, `npm run validate:all`, smoke.

## Vlastnictví souborů (kolize zakázány)

| Balíček | Smí editovat |
|---|---|
| A | `src/dolozka-engine.js`, `tests/dolozka.test.js` |
| B | `src/dolozka-inline.js`, `src/styles.css` (jen append `.dlz-*` blok na konec) |
| C | `redakce.html`, `src/redakce.js`, `docs/visual-components.md`, `docs/quickref.md` |
| Integrátor | `src/clanky.js`, `src/styles.min.css` (build), tento PLAN |

## Pasti

- JSON s českými texty: uvozovky uvnitř stringů U+201E/U+201C („ "), nikdy ASCII ".
- styles.css → po každé změně `npm run build:css` (dělá integrátor, B needituje min).
- Žádný `prefers-color-scheme` — jen tokeny + `[data-theme="dark"]`.
- Quotes mohou křížit inline tagy (`<strong>`) → proto normText + offset mapping
  přes textContent, ne per-node matching jako glosář.
- `data/claims.json` se NEEDITUJE (jen čte).
