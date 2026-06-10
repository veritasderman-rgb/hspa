# Známé pasti a jak se jim vyhnout

Konkrétní problémy, do kterých Claude session padla v minulosti. Nelze obejít neznalostí — musí se ověřit dopředu.

---

## JSON traps

### 1. České uvozovky v JSON `notes` (FATAL)

**Trap**: V `data/strategies.json` / `data/explainers.json` v poli `notes` použiješ české uvozovky `„"` obsahující anglické `"` uvnitř → `JSON.parse` selže s `SyntaxError: Expected ',' or '}' after property value`.

**Příklad selhání**:
```json
"notes": "Konference „Data místo dojmů. Měření kvality" (NIKEZ 2025)"
```
Zde `„Data místo dojmů. Měření kvality"` obsahuje `"` na konci, ale JSON to interpretuje jako uzavření string value → break.

**Řešení**: Přeformulovat bez vnořených anglických uvozovek, nebo escapovat backslash:
```json
"notes": "Konference Data místo dojmů (NIKEZ 2025)"
"notes": "Konference \"Data místo dojmů\" (NIKEZ 2025)"
```

**Detekce**: `node -e "JSON.parse(require('fs').readFileSync('data/{file}.json'))"`. Pokud projde, OK.

### 2. Trailing commas v JSON

JSON standard neumožňuje trailing commas. Pokud editor je vloží, `JSON.parse` selže. Validátor `validate.js` to detekuje s clear error.

### 3. Validní `scope` pro strategie (NE `institutional`!)

Schema (`ingest/validate-strategies.js`):
```js
const VALID_SCOPES = ['framework', 'program', 'action_plan', 'strategy', 'guideline'];
```

`institutional` zde NENÍ. Pokud chceš zachytit instituci jako rámec (např. NIKEZ), použij `scope: framework`.

### 4. Validní `category` pro explainery

Schema (`ingest/validate-explainers.js`):
```js
const VALID_CATEGORIES = ['money', 'classification', 'actors', 'process', 'inspiration'];
```

Pokud zavádíš nový explainer typu „regulační rámec" nebo „klinický koncept", patří pravděpodobně do `process` nebo `inspiration`.

---

## HTML/CSS traps

### 5. Stylesheet path: `src/styles.css` NE `../src/styles.css`

Některé starší články omylem mají `<link rel="stylesheet" href="../src/styles.css">` — to nefunguje (článek je v root level vedle `src/`, ne v podadresáři).

**Vždy**:
```html
<link rel="stylesheet" href="src/styles.css">
<script type="module" src="src/clanky.js"></script>
```

### 6. Duplicit CSS pravidla `.masthead-strip`

Po PR #402 (cleanup persona/score) zůstal duplikát `.masthead-strip` block. PR #405 ho odstranil, ale podobná duplicity může vzniknout znovu při ručních editacích. Vždy ověř, že každý selector je definován **jen jednou** v `styles.css`.

### 7. `<aside class="article-review-banner">` v publikovaném článku

`validate-articles.js` zablokuje merge, pokud:
- `audit-status: verified | review-pending | partial`
- `published: true`
- Soubor obsahuje `<aside class="article-review-banner">`

Banner je interní procesní poznámka — patří do HTML komentáře `<!-- audit: ... -->`, NIKDY do viditelného textu.

---

## Test traps

### 8. 6 pre-existing test failures (xlsx, csv-parse)

`npm test` ukazuje:
```
# pass 349
# fail 6
```

Tyto 6 selhání pocházejí z chybějících npm packages `xlsx` a `csv-parse` v některých dev environmentech:
```
tests/csu.test.js
tests/csu_sha.test.js
tests/social-distribution.test.js
tests/sukl.test.js
tests/sukl_mr.test.js
tests/uzis_nzis.test.js
```

**Nejsou způsobeny tvými změnami**. Pokud jejich počet zůstane na 6, OK. Pokud naroste, něco je rozbité.

**Fix permanentně**: `npm install` (devDependencies obsahují `xlsx` v dev, ale ne v repu z důvodu velikosti).

### 9. Daily routine commitne soubory, které měníš

Cron 06:00 UTC commituje:
- `data/snapshot-YYYY-MM-DD.json`
- `data/freshness.json` (update)
- `discovery/discovery-YYYY-MM-DD.md`
- `discovery/routing-YYYY-MM-DD.md`
- Občas i `data/indicators.json` při live refresh

**Pokud tvůj PR drží dlouho a cron mezitím proběhne**: rebase na latest main před push, jinak konflikt.

---

## Git workflow traps

### 10. Lokální branch divergence od remote main

Pokud spustíš `git pull origin main` a daily routine mezitím přidal commity, `main` na remote bude napřed.

**Vždy ze stavu remote**:
```bash
git fetch origin main
git checkout main
git reset --hard origin/main    # destruktivní, ale safe pokud nic lokálně needitovaného
# NEBO
git pull --ff-only origin main  # safe, fail pokud divergence
```

Pak teprve `git checkout -b claude/...`.

### 11. PR target = `main`

Vždy `--base main`. Nepúšet PR proti jinému branchi (například feature branch z jiného PR).

### 12. Webhook subscribe je per-session

Pokud sesssion vytvořila PR a dostala `subscribe_pr_activity` webhook, zůstane subscribed do merge / close / unsubscribe. **Neopakuj subscribe** — duplicate eventy.

---

## Visual / SVG traps

### 13. Inline SVG `<text>` font-family

V inline SVG v HTML je font-family řešený CSS, ale když SVG rasterizuje `@resvg/resvg-js` (cover generátor), používá fallback font systému. Pro reproducible covery deklaruj font v `<style>` uvnitř SVG, ne externě.

### 14. `prefers-reduced-motion` MUSÍ být u každé nové animace

Pravidlo:
```css
@keyframes nsvDraw { to { stroke-dashoffset: 0; } }
.nsv-anim-line { animation: nsvDraw 1.6s ease forwards; }

@media (prefers-reduced-motion: reduce) {
  .nsv-anim-line { animation: none; stroke-dashoffset: 0; }
}
```

A11y guideline — pokud chybí, audit selže.

### 15. SVG `viewBox` aspect ratio musí ladit s container

Pokud inline SVG má `viewBox="0 0 1200 630"` a container je `max-width: 100%`, výška scale-uje proporcionálně. Pokud zapomeneš `viewBox`, SVG bude zobrazený s default width 300px na desktop — vypadá to rozbitě.

---

## Data freshness traps

### 16. Stará data (`year`) ve `data/indicators.json`

Validátor `verify-freshness.js`:
- Warn > 7 dní starý `fetched_at`
- Fail > 30 dní

Pokud daily routine nepublikuje něco nového, `fetched_at` zaostává. Pokud ti CI selže s freshness error, není to tvá chyba — je to selhání cronu.

### 17. Snapshoty `data/snapshot-*.json` patří do gitu

Nejsou gitignored! Cron commituje denní snapshot. Ale ty bys neměl(a) tyto soubory ručně měnit.

---

## License a sourcing traps

### 18. Re-publikace dat bez explicitní licence

Pokud zdroj nepublikuje CC licence (CC-BY, CC-BY-SA, CC0), **defaultem platí autorský zákon**. Re-publikace bez souhlasu = právně problematické.

**Workflow**:
1. Před scrapingem ověř licenci na webu zdroje.
2. Pokud chybí, e-mail provozovateli s žádostí.
3. Souhlas zaznamenej do `data/{source}-scraping-log.json` nebo do `source_attribution` v JSON.
4. V UI viditelně atribuj.

Aktuální status:
- PUK (KZP) — ✅ souhlas
- INDIKO (FBMI ČVUT) — ✅ souhlas
- ÚZIS otevřená data — veřejně licensované (CC-BY většinou)
- OECD HAaG — veřejně dostupný PDF, citace s odkazem dostačuje
- Eurostat — veřejná data, CC-BY

### 19. Scraping vs API

Pokud zdroj nabízí JSON/CSV/API endpoint, **vždy ho preferovat** před scrapingem. Důvody:
- Stabilita (HTML struktura se mění, API méně)
- Etika (méně zatěžuje server zdroje)
- Údržba (parser scraperu vyžaduje pravidelnou údržbu)

---

## Performance traps

### 20. Cover obrázky > 100 KB

Generátor `generate-article-cover.js` vyrábí PNG cca 30-80 KB. Pokud přes 100 KB, něco je s SVG (možná příliš detailní path, neoptimalizovaný `viewBox`, embedded base64).

Lighthouse penalizuje > 200 KB obrázky.

### 21. Inline SVG > 50 KB

Pokud složitý decision tree má 10+ nodes, SVG markup roste. Pokud `narok-svg-figure` blok přes 50 KB, zvaž rozsekání do více figures.

### 22. JS bundle size

Celkový JS na stránku by neměl přesáhnout 100 KB. `src/` celkem ~18 000 LOC = ~300 KB nezavedené, ale jednotlivá stránka načítá jen vlastní entry point + sdílené `page-shared.js` + dependency tree.

Žádný bundler, žádný tree-shaking — všechno se posílá tak, jak je. Pokud přidáváš nový JS modul, drž ho focused.

---

## Recovery patterns

### Pokud cron commituje uprostřed mého PR

```bash
git fetch origin main
git rebase origin/main   # nebo merge
# Pokud conflict v data/snapshot-*.json: použij verzi z origin/main (jejich snapshot)
git rebase --continue
git push --force-with-lease origin claude/branch-name
```

### Pokud validátor selže na neviditelný diff

Často to jsou:
1. Trailing whitespace (málokdy)
2. České uvozovky (viz § 1)
3. Smazaný `id` referenced z `linked_indicators`
4. Trailing comma

Spusť konkrétní validátor s plnou cestou:
```bash
node ingest/validate-strategies.js
node ingest/validate-explainers.js
node ingest/validate-articles.js
```

Error message obvykle ukáže konkrétní řádek.

### Pokud Vercel preview HTTP 500 ale lokální HTTP 200

Pravděpodobně:
1. Chybí `<meta charset>` (Vercel je striktní)
2. Cors blokuje fetch v JS (lokálně OK přes file:// nebo http-server, na Vercelu strict)
3. Nepodporovaný ES2024 feature v starším Node runtime (Vercel default je Node 20)

Otevři `https://vercel.com/{team}/{project}` → Deployments → konkrétní build → Runtime Logs.

---

## Ingest / fetcher traps (doplněno 2026-06-10)

### Unit testy fetcherů přepisují reálnou ingest/cache

**Trap**: Testy `fetchSukl*` (a obecně fetcherů volajících `writeCache`) zapisují
do skutečné `ingest/cache/` — po `npm test` jsou agregáty (např.
`sukl_mr_aggregated.json`) přepsané miniaturními testovacími daty. Pokud po
testech spustíš transform nebo cílený zápis do `data/indicators.json` z cache,
zapíšeš testovací hodnoty (stalo se: `vypadky_leciv_aktivni` → 1).

**Řešení**: Po `npm test` VŽDY znovu spusť živé fetchery před jakýmkoli čtením
cache; hodnoty do datového kontraktu zapisuj jen z čerstvě fetchnuté cache.
(Dlouhodobý fix: testy přesměrovat do temp dir — zatím neimplementováno.)

### data.gov.cz CKAN API je mrtvé (404)

**Trap**: `nrhzs_providers.js` a postupy stavěné na
`data.gov.cz/api/3/action/package_search` dostanou 404 — národní katalog přešel
na NKOD2 (funguje jen SPARQL endpoint `data.gov.cz/sparql`). Stejně tak
`data.mzcr.cz/api/3/...` neexistuje.

**Řešení**: Nové ÚZIS/NKOD integrace stavět na SPARQL dotazech do NKOD2; datové
sady NRHZS jsou 7z archivy (potřeba dekomprese, `unzipEntry` v `sukl.js` umí jen ZIP).

### OECD sdmx.oecd.org: HTTP 500 na velké odpovědi přes HTTP/1.1

**Trap**: Velké dataflows (PYLL, SURG_PROC, SHA…) vrací přes node fetch/undici
HTTP 500; přes HTTP/2 (curl) fungují. Malé datasety projdou — záludné při
testování „funguje mi to".

**Řešení**: `oecd_sdmx2.js` má fallback `fetchHttp2` (lib/http.js) — při 5xx
automaticky přepne transport. U obřích datasetů (DSD_SHA) navíc použij
`key`-path filtr v mappingu, ne `/all`.

### SÚKL přesouvá soubory do datovaných adresářů

**Trap**: URL typu `/soubory/LEKARNY{datum}.csv` neexistují — aktuální seznam
lékáren je `/soubory/SOD{YYYYMMDD}/LEKARNY{YYYYMMDD}.zip` a datum nelze odvodit.

**Řešení**: `discoverLekarnyUrl()` čte odkaz z katalogové stránky. Pro nové SÚKL
datové sady vždy discovery z katalogu, nikdy hádání URL. (MR feed `mr.zip` je
výjimka — stabilní cesta.)

### ÚZIS data.mzcr.cz: katalog (CKAN API i web) je mrtvý, fungují jen přímé distribuce (2026-06-10)

**Trap**: Pro zlivnění nových ÚZIS indikátorů je potřeba znát distribuční URL
(`https://data.mzcr.cz/data/distribuce/{ID}/...csv[.gz]`). Discovery selhává:
- `data.mzcr.cz/api/3/action/package_search|package_list` → **404**
- `opendata.mzcr.cz/api/3/action/package_show?id=...` → **HTML** (ne JSON; portál migroval)
- `data.mzcr.cz/dataset?q=...` a `/sitemap.xml` → **404**
- NKOD2 SPARQL (`data.gov.cz/sparql`) → dotazy na ÚZIS/NRHZS vrací **prázdný** result

**Co funguje**: přímé distribuce s pevně známým číselným ID (ověřeno: kolorektál
`/62/`, mamograf `/263/`, NRH `/469/`). Těch 6 už je v `ingest/mapping/uzis_codes.json`.

**Řešení pro nový ÚZIS indikátor**: distribution ID nelze dohledat strojově —
otevřít data.mzcr.cz v prohlížeči, najít datovou sadu, zkopírovat URL distribuce
(CSV/CSV.GZ) do `primary_url` v `uzis_codes.json` + napsat extractor (každý ÚZIS
export má jinou strukturu sloupců). Bez ID **NEHÁDAT** — nechat seed.
