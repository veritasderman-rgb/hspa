# UX a obsahový audit — HSPA Monitor (hspa-cesko.cz)

**Datum auditu:** 2026-05-06
**Rozsah:** všechny veřejné stránky v `05_M1_Starter/` (index, indicator, jak-funguje, prevence, strategie, schema, tematicke-linie, glosar, o-projektu)
**Pohled:** koncový uživatel · prohlížeč · vyhledávač (SEO) · čtečky obrazovky (a11y)

Hodnocení používá tři priority:
- **P1 — kritické** (ztráta funkcionality, viditelný obsahový defekt, blokuje SEO/a11y)
- **P2 — důležité** (kazí dojem, drobně poškozuje konverzi/orientaci, obsahová nekonzistence)
- **P3 — drobnost** (kosmetika, ale stojí za opravu)

---

## 1) Obsahové chyby a překlepy

| # | Pri | Stránka(y) | Problém |
|---|---|---|---|
| 1.1 | **P1** | `o-projektu.html` (2×), `schema.html`, `glosar.html`, `tematicke-linie.html` (footer) | **„Oficálním" / „Oficální"** — překlep, správně **„Oficiálním" / „Oficiální"**. Vyskytuje se 6× napříč webem v hlavním obsahu i ve footeru; je to první věc, kterou si návštěvník při bližším čtení všimne, a rozhodně to neprospívá důvěryhodnosti portálu, který se pasuje na zdroj „pro veřejnou debatu". |
| 1.2 | P2 | `index.html` (řádek 174) vs `o-projektu.html` (ř. 61) | **„tým Health Care Quality and Outcome"** vs **„Health Care Quality and Outcomes"** — nekonzistentní pojmenování OECD divize. Správně je „Health Care Quality and **Outcomes** (HCQO)". |
| 1.3 | P2 | `index.html` (ř. 282), `indicator.html` (ř. 60) | Disclaimer ve footeru („58 indikátorů ze 4 oblastí HSPA · Citujte: Pavlovic, J. (2026)") existuje **jen na 2 z 9 stránek**. Citační řádek je hodnotný, měl by být na všech veřejných stránkách (resp. centralizovaný footer). |
| 1.4 | P2 | `index.html` (ed-narrative-step #03) | **„MZ ČR"** s mezerou vs jinde **„MZČR"** bez mezery. Sjednotit (oficiální zkratka je MZ ČR s mezerou, ale na webu převažuje slitá forma — vyberte jedno). |
| 1.5 | P3 | `index.html` (ř. 174) | „**poradního sboru na vysoké úrovni (HLAB)**" — zkratka HLAB není v glosáři ani vysvětlena. Buď doplnit do glosáře, nebo rozepsat (High-Level Advisory Board). |
| 1.6 | P3 | různé stránky — `<small>` v topbar | Většina stránek má v hlavičce slogan **„Hodnocení výkonnosti zdravotního systému ČR"** — výjimky: `jak-funguje.html` („Jak (ne)funguje…"), `strategie.html` („Strategie…"), `schema.html` („Schéma…"), `indicator.html` („Detail indikátoru HSPA"). Naopak `tematicke-linie.html` zobrazuje „Hodnocení výkonnosti…" místo „Tematické linie ČR". Plán pojmenování je dobrý, ale `tematicke-linie.html` z něho vypadává. |
| 1.7 | P3 | `index.html` ř. 195+ | Sektor „Indikátory výkonnosti zdravotního systému" je `<h3>` ale jde o klíčový obsah celé stránky — sémanticky by měl být `<h2>` (viz a11y nadpisová hierarchie níže). |

---

## 2) Navigace a informační architektura

| # | Pri | Problém |
|---|---|---|
| 2.1 | **P1** | **Inkonzistence hlavního menu.** `index.html` má navigaci hardcodovanou v HTML (řádky 28–36) **bez záložky „Tematické linie"**. Všechny ostatní stránky používají `renderModuleNav()` z `src/page-shared.js`, který linii **obsahuje** (ř. 79). Důsledek: uživatel se na `tematicke-linie.html` dostane jen z jiných stránek; z homepage je to slepý uzel. Buď stránku přidat do hardcoded nav, nebo zcela odstranit (rozhodnutí o produktu). |
| 2.2 | P2 | **Audience switch (Veřejnost / Odborníci / Politici)** je vykreslen pouze v `index.html` (ř. 42–46). Logika `setAudience()` v `page-shared.js` funguje globálně přes `localStorage`, ale uživatel nemá UI, kterým by přepínal mimo homepage. Buď switch zobrazit na všech stránkách, nebo z homepage odstranit (a posun obsahu do detailních explainérů). |
| 2.3 | P2 | `index.html` má h1 odkazující sám na sebe **(brand v topbar není `<a class="brand-link">` jako na ostatních stránkách)** — drobná inkonzistence v chování. Sjednoťte. |
| 2.4 | P2 | `tematicke-linie.html` se nezobrazuje v žádném footeru — link na ni nelze najít z navigačního menu na index.html (viz 2.1) ani z footerových odkazů. **Orphan stránka pro vyhledávače i návštěvníky.** |
| 2.5 | P2 | Footer index.html odkazuje **„Metodické karty" → `indicators/`** — to je adresář bez `index.html`. Na Vercel s `cleanUrls: true` se zobrazí 404 / „Not Found". Buď připravit přehledový seznam, nebo z footeru odkaz odstranit. |
| 2.6 | P3 | Footer obsahuje 3 různé varianty napříč stránkami: bohatý footer (index, indicator, jak-funguje, prevence, strategie), zúžený 2-paragrafový (glosar, schema, tematicke-linie, o-projektu). Sjednotit do 1 sdílené komponenty (lze přes `page-shared.js`). |
| 2.7 | P3 | „Zpět na dashboard" odkaz je **ve footeru** některých stránek, ale chybí na detail-page (`indicator.html`) **breadcrumb / zpětný link nad obsahem**. Přidat breadcrumb („Indikátory › Naděje dožití při narození") na detail. |

---

## 3) UX / vizuální detaily

| # | Pri | Problém |
|---|---|---|
| 3.1 | **P1** | **Hardcodované skóre „64 / 100"** v `masthead-score`: stránky `index.html`, `jak-funguje.html`, `strategie.html`, `indicator.html` zobrazí **„64"** ještě před tím, než JS spočítá skutečnou hodnotu z `indicators.json`. Pokud je reálné skóre jiné, viditelně blikne (FOUC „64 → 67"). Zbylé 4 stránky správně zobrazují `—` placeholder. Buď všude zavést `—`, nebo všude nechat na JS přepočet. |
| 3.2 | P2 | „Citujte: Pavlovic, J. (2026). HSPA Monitor. hspa-cesko.cz" je stejný footer disclaimer **i na detail-page bez ohledu na zdroj indikátoru** — uživatel by mohl být zmaten, jestli je to jeho citační formát, nebo zdroj dat. Lepší formulace: „Citace tohoto webu: …" |
| 3.3 | P2 | `index.html` `<details id="heroDetails">` (řádek 159) — **default zavřený**. Klíčový kontext (autoři rámce, OECD publikace, DOI) je tedy default skrytý. Jako TL;DR na úvod je to v pořádku, ale: a) summary text „Co je HSPA · Klikněte pro vysvětlení rámce" je mimořádně dobrý — zachovat; b) zvážit přesun **DOI a citace OECD publikace** přímo do hero, protože to je primární akademický zdroj a ne „bonus". |
| 3.4 | P2 | `index.html` ed-hero-headline je **62 znaků** — dobré. Ale lead pod ním (60). je 5+ vět dlouhý odstavec — **na mobilu zabere celou výšku obrazovky a tlačí scorecard dolů.** Doporučuji zkrátit na 2–3 věty TL;DR a delší kontext nechat v `<details>` níže. |
| 3.5 | P2 | Hero **„Co je HSPA"** v `<details>` má text **„Klikněte pro vysvětlení"** v summary — to je tlačítko, ale na mobilech není zřejmé, že jde o expand/collapse. Zachovat ikonu šipky (✓ máte) a přidat `aria-expanded` (řízeno automaticky `<details>`, ale screen readery ne všechny to čtou hlasitě). |
| 3.6 | P2 | Globálně chybí **sticky topbar**: navigační menu zmizí při scrollu a uživatel musí scrollovat zpět nahoru, aby přepnul modul. Zvažte `position: sticky` na `.topbar` (s `top: 0` a malým box-shadow při scrollu). |
| 3.7 | P2 | Editorial scorecard `Total | Dobré | Ke sledování | Kritické | Bez benchmarku` zobrazuje **„0" v každém poli, dokud se data nenačtou** — ne `—` placeholder. Při pomalém připojení vypadá web prázdně. Použít skeleton placeholder nebo `—`. |
| 3.8 | P3 | Hero 4 statistiky vlevo (`heroPicks`) — když chybí `findInd('lekari_per_1000')` v datech, statistika prostě zmizí bez logování. Pokud projektu záleží na tom, aby tam **vždy** bylo 4 cards, doplnit fallback. |
| 3.9 | P3 | Tlačítko `btn-export` (Export CSV) je přímo v filter-baru bez vysvětlující ikony. Přidat ikonu stahování. |
| 3.10 | P3 | „Skóre českého zdravotnictví: **64** / 100 · OECD průměr **71**" — bez vysvětlení, jak je skóre spočteno. Přidat tooltip / odkaz na metodiku skóre (computeHSPAScore: good=100, warn=50, bad=0, avg). |

---

## 4) SEO (vyhledávače)

| # | Pri | Problém |
|---|---|---|
| 4.1 | **P1** | **Chybí `robots.txt`** — bez něj crawler nemá šanci najít sitemap a respektovat preference. Doplnit minimálně `User-agent: *` + `Sitemap: https://hspa-cesko.cz/sitemap.xml`. |
| 4.2 | **P1** | **Chybí `sitemap.xml`.** Web má 9 statických stránek + dynamickou `indicator.html?id=…` pro 58 indikátorů. Bez sitemap Google neumí spolehlivě indexovat detail-page (parametry v URL znesnadňují discovery). Generovat staticky (skript v ingest pipeline) — `<url>` pro každý indikátor s `<lastmod>` z `data/indicators.json#generated_at`. |
| 4.3 | **P1** | **Open Graph + Twitter Card jen na `index.html`.** Detail indikátoru, jak-funguje, prevence, strategie, schema, tematicke-linie, glosar, o-projektu **nemají žádné OG tagy** — sdílení v sociálních sítích zobrazí jen URL, ne náhled. Nutné minimum na každou stránku: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:locale`. |
| 4.4 | **P1** | **Chybí `og:image` i na index.html.** Bez obrázku se ve sdílení (Facebook, LinkedIn, Twitter, Slack) zobrazí jen text — radikálně sníží CTR. Vytvořit alespoň jeden generický 1200×630 OG image (logo + slogan + skóre + datum). |
| 4.5 | P2 | **Žádný `<link rel="canonical">`** na žádné stránce. Detail-page `indicator.html?id=X` může mít duplicitní content (s různými parametry). Doplnit canonical s normalizovaným URL. |
| 4.6 | P2 | **Žádné JSON-LD strukturované metadata.** Pro statistický portál ideální typy: `Dataset` (pro `data/indicators.json`), `WebSite` + `SearchAction` na homepage, `BreadcrumbList` na detail-page, `DefinedTerm` v glosáři. Bez toho nedostanete rich snippety v SERP. |
| 4.7 | P2 | **Chybí meta description** na: `prevence.html`, `jak-funguje.html`, `strategie.html`. Google se v SERP fallbackuje na první nalezený text — typicky to je topbar + datum + skóre, což má pro CTR mizernou hodnotu. |
| 4.8 | P2 | **Chybí favicon** + `apple-touch-icon`. Web vypadá v záložkách prohlížeče jako default placeholder ⚪ — sníží míru opětovné návštěvy. |
| 4.9 | P2 | **Chybí PWA manifest** (`<link rel="manifest">`). Pro veřejný informační portál není povinný, ale „Add to Home Screen" zlepší engagement na mobilech. |
| 4.10 | P3 | **Chybí `<html lang="cs">` na všech stránkách** ✓ je všude správně nastaveno — jen ověřeno. |
| 4.11 | P3 | Žádné `hreflang` — ale projekt je čistě česky, takže OK (kdyby se přidávala EN verze, bude potřeba). |

---

## 5) Accessibility (a11y, WCAG 2.2 AA)

| # | Pri | Problém |
|---|---|---|
| 5.1 | **P1** | **`masthead-strip` má `aria-hidden="true"` na 6 stránkách** (`prevence`, `indicator`, `glosar`, `jak-funguje`, `tematicke-linie`, `strategie`), **ale `aria-hidden="false"` (default) na 3 stránkách** (`index`, `o-projektu`, `schema`). Důsledek: screen reader na některých stránkách přečte „Pondělí 5. května 2026 · Skóre 64/100 OECD 71", na jiných ne. Inkonzistence. **A:** datum+skóre je důležitá kontextová informace, neměla by být skryta. **B:** pokud chcete být tvrdě konzistentní, sjednoťte `aria-hidden="true"`, ale potom musíte zajistit, že stejnou informaci screen reader najde jinde (hero-stats už je obsahuje pro homepage). |
| 5.2 | **P1** | **`<h1>` v topbar obsahuje navigační odkaz nebo slogan.** Sémanticky je `<h1>` „titulek dokumentu" — ale na všech stránkách je v něm „HSPA monitor · Hodnocení výkonnosti…", což je název webu, ne nadpis stránky. Skutečný titulek stránky je `<h2>` v hero. Důsledek: screen-reader user dostane stejný H1 na všech stránkách. **Oprava:** topbar dát do `<div>` s `role="banner"` a název webu jen jako `<a>`/text; H1 přesunout do hero každé stránky (ed-hero-headline). |
| 5.3 | P2 | **Hierarchie nadpisů přeskakuje.** Index.html používá h1 → h2 (hero) → h3 (sektory) → **h6 (footer)**. Skok h3→h6 porušuje WCAG SC 1.3.1. Použít pro footer h2 nebo (lépe) odstranit nadpisy v footeru a označit `<nav aria-label="…">`. |
| 5.4 | P2 | **`<details>` na index.html** funguje klávesnicí (Tab + Enter), ale focus-ring není výraznější než hover — uživatel klávesnice nepozná, kde je. Zvýraznit `:focus-visible` outline. |
| 5.5 | P2 | **SVG schéma v `schema.html`** má jednotlivé `<g class="schema-node" tabindex="0">` ✓ správně, ale **šipky mezi uzly (paths)** nejsou jakkoli popsané. Screen-reader uživatel se nedozví, jak jsou uzly propojeny. Doplnit `aria-describedby` na node, který odkáže na text mezi uzly (pojistné, regulace, data, péče). Případně přidat `<title>` + `<desc>` přímo v SVG. |
| 5.6 | P2 | **Audience switch buttons** (`Veřejnost / Odborníci / Politici`) **nemají `aria-pressed`** — jejich stav je jen vizuální (`.active` class). Screen reader nepozná, který je vybraný. Přidat `aria-pressed="true"`/`"false"`. |
| 5.7 | P2 | **`audience switch` `role="group"`** ✓ je tam, ale uvnitř jsou `<button>` bez `role="radio"`. Pokud je výběr jen 1, je správnější `role="radiogroup"` + `role="radio" aria-checked`. |
| 5.8 | P2 | **Audience switch tooltipy** (`title="Srozumitelné vysvětlení pro veřejnost"`) jsou viditelné jen na hover s myší. Na mobilech a pro klávesnicové uživatele jsou neviditelné. Dát viditelný subtext nebo aria-describedby. |
| 5.9 | P2 | **`<canvas>` chart elements** mají `aria-label`, ale **žádný textový fallback** pro screen-reader uživatele, který nedokáže canvas přečíst. Přidat skrytou textovou tabulku `<table class="visually-hidden">` se stejnými hodnotami pod každý graf. Aktuálně je tabulka pro regiony viditelná vedle grafu (✓ dobré pattern), ale stejný princip aplikovat na trendové grafy v detail-page a v modálech. |
| 5.10 | P2 | **`skip-link`** chybí na: `jak-funguje.html`, `prevence.html`, `strategie.html`, `tematicke-linie.html`. Je jen na index, indicator, glosar, schema, o-projektu. Doplnit všude. |
| 5.11 | P3 | **`<abbr title="…">`** se na mobilním Safari **vůbec nezobrazuje** (není podpora touch tooltipu). „HSPA" v hlavičce a další zkratky jsou v textu pro mobilní uživatele bez kontextu. Pattern v glosáři (`<abbr class="glossary-abbr">` s `data-def`) má **vlastní popover** ✓ správně — sjednotit a používat všude. |
| 5.12 | P3 | **Kontrast `signal-good/warn/bad`** — bez vizuálního ověření těžko říct, ale typická chyba u status indikátorů: žluté na bílém má < 3:1 kontrast. Zkontrolovat WCAG AA contrast ratio (4.5:1 pro normální text). |
| 5.13 | P3 | **Chybí `prefers-color-scheme: dark`** — i přes zmínku v `CLAUDE.md`. Není to povinnost, ale pro veřejný portál se dobře vyplatí. |

---

## 6) Výkon a prohlížeče

| # | Pri | Problém |
|---|---|---|
| 6.1 | **P1** | **Chart.js z CDN bez SRI hash** (`<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>`). Bez `integrity="sha384-…"` riskujete supply-chain. CSP `script-src` má `'unsafe-inline'` + povolenou doménu, ale to není náhrada za SRI. **Oprava:** přidat `integrity` hash a `crossorigin="anonymous"`. |
| 6.2 | P2 | **Chart.js je blokující `<script>` v `<head>`** bez `defer`/`async`. Renderuje se až po stažení (~70 KB gzip). Přidat `defer`. App.js má `type="module"` — modules jsou implicitně defer ✓ ok. |
| 6.3 | P2 | **Chybí `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>`** — ušetří 50–150 ms RTT na první vykreslení grafu. |
| 6.4 | P2 | **Žádné resource hints** (`preload` pro `data/indicators.json` na homepage). První render čeká, až JS fetchne JSON; preload by paralelizoval. |
| 6.5 | P2 | **Inline styles (`style="..."`)** v `glosar.html` (ř. 47) a `o-projektu.html` (ř. 40). CSP musí povolit `'unsafe-inline'` v `style-src` (✓ povoleno), což oslabuje obranu proti XSS-via-style. Přesuňte do `styles.css`. |
| 6.6 | P2 | **Inline `<script type="module">`** v `schema.html` (ř. 199–334) — 130 řádků JS. CSP `script-src` má `'unsafe-inline'`, takže funguje, ale a) blokuje hashing/nonce přístup, b) duplikuje data (NODES) z `data/explainers.json`. Vytáhnout do `src/schema.js`. |
| 6.7 | P2 | **Chart.js `umd.min.js` (cca 200 KB raw)** — pokud používáte jen line/bar charts, můžete načítat jen `chart.js/auto` ESM build s tree-shaking přes lokální bundling (úspora ~40 %). |
| 6.8 | P2 | **Žádný `<link rel="icon">`** — prohlížeč si vyžádá `/favicon.ico`, server vrátí 404. Drobnost, ale na každém page-loadu jeden zbytečný request. |
| 6.9 | P3 | **Chart.js verze 4.4.0** je ze srpna 2023 — od té doby vyšlo 4.4.1, 4.4.2, 4.4.3 (security/perf opravy). Aktualizovat. |
| 6.10 | P3 | **Mobile breakpointy nesouladné**: použity `768px`, `880px`, `900px`, `560px`, `640px`, `860px`, `480px`. Vytvořte 3–4 standardní breakpointy v CSS proměnných a používejte je důsledně. |
| 6.11 | P3 | **Stale info v CLAUDE.md o počtu testů.** Soubor tvrdí „93 testů, vše musí projít" — reálná suite má 146+ testů a v CI je zelená. Aktualizujte CLAUDE.md, ať nový kontributor zbytečně neladí neexistující regresi. *(Pozn.: v původním auditu bylo uvedeno „2 selhávající testy" — šlo o falešné selhání v auditovacím prostředí bez nainstalovaného `node_modules` (chybějící `csv-parse`). Po `npm install` je suite zelená, nález byl opraven na základě review komentáře od Codex bota.)* |

---

## 7) Bezpečnost

| # | Pri | Poznámka |
|---|---|---|
| 7.1 | P2 | CSP `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net` — `'unsafe-inline'` zbytečně oslabuje obranu, protože **většina inline skriptů je vlastní** a dá se přesunout do `src/`. Po refactoru můžete `'unsafe-inline'` odstranit a zůstane `'self' https://cdn.jsdelivr.net`. |
| 7.2 | P3 | Headers v `vercel.json` mají `X-Frame-Options: DENY` ✓ a `Permissions-Policy: geolocation=(), microphone=(), camera=()` ✓. Doplnit `X-Permitted-Cross-Domain-Policies: none` a `Cross-Origin-Opener-Policy: same-origin`. |

---

## 8) Doporučené další kroky podle priority

### Quick wins (1–2 hodiny)
1. Opravit překlep „Oficálním" → „Oficiálním" (5 stránek). *(P1)*
2. Sjednotit `aria-hidden` na masthead-strip (všude buď true, nebo false). *(P1)*
3. Sjednotit hardcoded skóre — všude `—` placeholder. *(P1)*
4. Přidat „Tematické linie" do hardcoded nav v `index.html` nebo stránku odstranit. *(P1)*
5. Vytvořit `robots.txt` + statický `sitemap.xml`. *(P1)*
6. Přidat `og:image`, `og:url` na `index.html` + dočasně i na detail-page. *(P1)*
7. Doplnit `<link rel="icon">` favicon + `apple-touch-icon`. *(P2)*
8. Doplnit chybějící `meta name="description"` na `prevence.html`, `jak-funguje.html`, `strategie.html`. *(P2)*
9. Aktualizovat počet testů v CLAUDE.md (z „93" na reálný stav). *(P3)*

### Středně velké (1–2 dny)
10. Refactor topbar — `<h1>` přesunout do hero, navbar dát do `<nav role="banner">`. *(P1 a11y)*
11. Vytáhnout inline `<script>` z `schema.html` do `src/schema.js`. *(P2)*
12. Sjednotit footer napříč stránkami do shared komponenty. *(P2)*
13. Sticky topbar + skip-link na všech stránkách. *(P2)*
14. JSON-LD strukturovaná metadata (`Dataset`, `WebSite`, `BreadcrumbList`). *(P2)*
15. Vygenerovat dynamický `sitemap.xml` jako součást ingest pipeline (s `<lastmod>`). *(P2)*
16. SRI hash na Chart.js + `<link rel="preconnect">` + `defer`. *(P2)*

### Větší práce (3+ dní)
17. Globální audience-switch systém (Veřejnost/Odborníci/Politici) na všech stránkách s perzistencí. *(P2)*
18. Kompletní WCAG 2.2 AA audit (kontrast, focus management, screen-reader walkthrough). *(P2 — již na roadmapě v `o-projektu.html`)*
19. Dark mode přes `prefers-color-scheme`. *(P3 — ale dobrý wow-faktor)*
20. PWA manifest + offline mode (servisworker pro `data/indicators.json` cache). *(P3)*

---

## 9) Co web dělá dobře (zachovat)

Aby audit nebyl jen seznam vad — co pozitivně funguje:

- **Editorial hero** s narativní headline (`Češi se dožívají vyššího věku, ale zdravějších let mají méně…`) — silný copy, který vede k akci.
- **Sekce „Kde Česko vede"** — vyvažuje kritickou narativu úspěchy. Pro veřejnou debatu cenné.
- **Skip link, `aria-label`, `aria-live`** — základní a11y patterny jsou na úrovni; problém je jen v konzistenci napříč stránkami.
- **Disclaimer „Není oficiálním portálem MZČR"** — explicitní a poctivé.
- **Otevřená data ve footeru** (`indicators.json`, `regions.json`, `explainers.json`, `strategies.json`, `prevention.json`) — odpovídá závazku CC-BY 4.0.
- **`<details>` pro „Co je HSPA"** — elegantní řešení pro „TL;DR vs. plné vysvětlení".
- **Citační formát ve footeru** — Pavlovic, J. (2026) — přesně ve formě, jakou potřebuje akademická debata.
- **Verifikační statusy** (verified / preliminary / illustrative) v indicator detail — datová poctivost na úrovni renomovaných statistických portálů.
- **CSP + security headers ve Vercel config** — defaultně lépe nastaveno než většina webů.

---

**Závěr:** Web je obsahově silný a má unikátní hodnotu (jediná veřejná občanská implementace OECD HSPA pro ČR). Hlavní rezerva leží v **konzistenci napříč stránkami** (navigace, masthead, meta tagy, footer) a v **discoverability pro vyhledávače** (sitemap, OG, JSON-LD). Drobné překlepy a inkonzistence v aria-značkování jsou snadno opravitelné a měly by být první v plánu — kazí důvěru u návštěvníka, který zkoumá projekt do hloubky (akademik, novinář, úředník).

Po opravě P1 a P2 položek (cca 3–5 dní práce) by web měl být v top 1 % českých veřejných statistických portálů z hlediska technické a obsahové kvality.
