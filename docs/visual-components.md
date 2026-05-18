# HSPA Monitor — UI Components

Katalog všech vizuálních komponent v `05_M1_Starter/`. Dva oddíly:

1. **Article Visuals** (`.av-*`) — 5 generických komponent pro články v `clanek-*.html`
2. **Page-level komponenty** — hub matrix, scorecard, dim grid, finance donut, podcast card, gap section, AI disclaimer, audit banner

Plus na konci: **Animation patterns** (IntersectionObserver, count-up, bar fills, prefers-reduced-motion).

Pro per-page popis stránek (kde se komponenty používají) viz [`site-architecture.md`](site-architecture.md).

---

# 1. Article Visuals (`.av-*`)

Designsystem pěti vizuálních komponent pro články v `05_M1_Starter/clanek-*.html`.
Cíl: konzistentní, dostupný, low-friction způsob, jak do textu vložit timeline,
srovnávací bary, datovou tabulku, flow diagram a animovaný počet.

- **Zdrojový kód:** `05_M1_Starter/src/article-visuals.js`
- **Styly:** sekce `AV — Article Visuals` v `05_M1_Starter/src/styles.css`
- **Bootstrap:** auto-spuštěno z `src/clanky.js` na každé stránce sekce Články
- **Žádný build step, žádné dependencies** — pure HTML + CSS, JS jen progressive enhancement

## Společné principy

1. **Progressive enhancement.** Markup je samonosný. Když JS selže nebo není povolen,
   komponenty pořád vypadají rozumně — bary jen nebudou mít vypočtené šířky,
   countery zobrazí finální hodnotu napsanou v HTML.
2. **Idempotence.** Opakované volání `enhanceArticleVisuals()` nezpůsobí duplikaci.
   Inicializované elementy se označí atributem `data-av-init="1"`.
3. **Bezbariérovost.** Komponenty respektují `prefers-reduced-motion` (žádná
   animace) a používají sémantický markup (`<ol>`, `<table>`, `<figure>`).
4. **Společný rámec `.av-figure`.** Volitelný wrapper, který dává komponentě
   editorial vzhled (rámeček, kicker titulek, footer s poznámkou o zdroji).

```html
<figure class="av-figure">
  <figcaption class="av-figure-h">Titulek / kicker</figcaption>
  <!-- AV komponenta -->
  <p class="av-figure-note"><strong>Zdroj:</strong> …</p>
</figure>
```

### Rozšířené layouty

`article-page` má `max-width: 720px` (čitelnost serif textu). Pro vizuály, které
v 720 px sloupci tísní (data-table 4+ sloupců, flow 5+ kroků, dlouhá timeline),
jsou k dispozici dva modifikátory:

- **`.av-figure-wide`** — figura překročí 720 px sloupec a roztáhne se na
  `min(1100px, calc(100vw - 48px))`, centrovaná do viewportu. Text zůstává
  v 720 px sloupci. Na mobilu (< 720 px) padá zpět na 100 %.

  ```html
  <figure class="av-figure av-figure-wide">…</figure>
  ```

- **`.av-aside`** / **`.av-aside-left`** — wrapper kolem malého bloku
  (typicky jednoho `.av-counter-block` nebo krátké `.av-bar-compare`-list),
  který se floatuje vedle textu. Na viewportu ≥ 1024 px se posouvá záporným
  marginem do prázdné plochy okolo článku (NYT/Guardian margin chart). Na
  mobilu padá zpět do toku, plná šířka.

  ```html
  <aside class="av-aside">
    <div class="av-counter-block av-counter-block-bad">
      <span class="av-counter" data-value="500000">500 000</span>
      <span class="av-counter-label">pacientů</span>
    </div>
  </aside>
  <p>Text obtéká aside… (nezapomeň na <code>av-aside-clear</code>
  před dalším h3, pokud aside neskončí přirozeně před nadpisem)</p>
  <div class="av-aside-clear"></div>
  ```

Tipy:
- `av-figure-wide` použij pro data-table, flow, timeline, široký bar-compare.
- `av-aside` použij pro 1× counter blok nebo krátký bar (3–4 položky)
  jako margin highlight vedle relevantního odstavce.
- `av-counter-grid` (4 dlaždice) ponechej **bez** wide — počítá s plnou
  šířkou článku.

---

## 1. `.av-timeline` — chronologie

Vertikální timeline s body na ose. Stavy: `done` (vyplněný bod), `now` (červený
puls), `future` (přerušovaný obrys). Pro každou položku: datum/rok, titulek,
volitelný popis a tag.

### Markup

```html
<ol class="av-timeline">
  <li class="av-timeline-item av-timeline-item-done">
    <time class="av-timeline-date">6. 9. 2025</time>
    <h4 class="av-timeline-title">Zákon 264/2025 Sb. publikován</h4>
    <p class="av-timeline-desc">NIS2 transpoziční norma, účinnost 1. 11. 2025.</p>
    <span class="av-timeline-tag">Sbírka</span>
  </li>
  <li class="av-timeline-item av-timeline-item-now">
    <time class="av-timeline-date">květen 2026</time>
    <h4 class="av-timeline-title">Přechodná lhůta</h4>
    <p class="av-timeline-desc">Většina nemocnic 11–13 měsíců do termínu.</p>
    <span class="av-timeline-tag">Teď</span>
  </li>
  <li class="av-timeline-item av-timeline-item-future">
    <time class="av-timeline-date">listopad 2026</time>
    <h4 class="av-timeline-title">Konec přechodné lhůty</h4>
  </li>
</ol>
```

### Třídy stavů

| Třída | Význam |
|---|---|
| `av-timeline-item-done` | hotové (vyplněný bod) |
| `av-timeline-item-now` | probíhá (červený puls) |
| `av-timeline-item-future` | plánováno (přerušovaný obrys) |
| `av-timeline-item-warn` | upozornění (jen tag obarven `--warn`) |

### Kdy použít
- Legislativní procesy (návrh → vláda → PS → Senát → účinnost → přechodná lhůta)
- Historické epochy (3 epochy zmrazení platby státu 1993–2026)
- Roll-out reformy v čase (kapitace, P4P, eHealth modul po modulu)

---

## 2. `.av-bar-compare` — srovnávací bary

Horizontální bar chart bez Chart.js — pure CSS s flexbox / grid. Vhodné pro
3–8 položek, ne pro time-series.

### Markup

```html
<figure class="av-figure">
  <figcaption class="av-figure-h">Podíl státní platby na příjmech systému (%)</figcaption>
  <ol class="av-bar-compare av-bar-compare-list"
      data-max="30" data-unit="%">
    <li class="av-bar-row av-bar-row-highlight"
        data-value="28" data-label="Česko"
        data-note="5,9 mil. státních pojištěnců"></li>
    <li class="av-bar-row" data-value="6"   data-label="Polsko"></li>
    <li class="av-bar-row" data-value="4.4" data-label="Německo"></li>
    <li class="av-bar-row" data-value="4"   data-label="Nizozemsko"></li>
  </ol>
  <p class="av-figure-note">Zdroj: SZP ČR, BMG, NFZ, RIVM (2024).</p>
</figure>
```

### Data atributy
- `data-max` — maximum osy (volitelné, default = nejvyšší hodnota v setu)
- `data-unit` — jednotka přidaná za hodnotu (volitelná, např. `%`, `mld Kč`)
- `data-value` — hodnota (povinné)
- `data-label` — popisek řádku (povinné)
- `data-note` — drobná poznámka pod barem (volitelné)
- `data-display` — vlastní textové vyjádření hodnoty (volitelné, přebije
  auto-formátování — užitečné pro „~3,2 %" nebo „> 100 Kč")

### Modifikátory řádků
- `av-bar-row-highlight` — náš případ (červený)
- `av-bar-row-good` — pozitivní (zelený)
- `av-bar-row-bad` — negativní (červený, jinak než highlight)

### Kdy použít
- Mezinárodní srovnání jedné metriky (CZ vs. DE vs. SK vs. NL)
- Podíly z celku (kde donut by byl příliš)
- Před/po srovnání 2 stavů

---

## 3. `.av-data-table` — datová tabulka

Standardizovaná tabulka pro vícesloupcové srovnání. Sticky první sloupec na
mobilu řešen horizontálním scrollem v `.av-data-table-wrap`.

### Markup

```html
<figure class="av-figure">
  <figcaption class="av-figure-h">Mezinárodní paralely investic do kyberbezpečnosti zdravotnictví</figcaption>
  <div class="av-data-table-wrap">
    <table class="av-data-table">
      <thead>
        <tr>
          <th scope="col">Země</th>
          <th scope="col">Program</th>
          <th scope="col" class="av-num">Rozpočet</th>
          <th scope="col">Období</th>
        </tr>
      </thead>
      <tbody>
        <tr class="av-row-highlight">
          <th scope="row">Česko</th>
          <td>Op. program Zdravotnictví + NPO</td>
          <td class="av-num av-bad">desítky mil. Kč/rok</td>
          <td>2026–2028</td>
        </tr>
        <tr>
          <th scope="row">Francie</th>
          <td>CaRE (ANSSI)</td>
          <td class="av-num">750 mil. EUR</td>
          <td>2023–2027</td>
        </tr>
        <tr>
          <th scope="row">Německo</th>
          <td>KHZG (15 % na IT bezpečnost)</td>
          <td class="av-num av-good">≥ 4,3 mld. EUR</td>
          <td>2020–2024</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="av-figure-note">Zdroj: Cybersecurity Action Plan EK 2025, ANSSI CaRE, BMG.</p>
</figure>
```

### Třídy buněk
- `av-num` — pravé zarovnání + `tabular-nums` (na `<th>` i `<td>`)
- `av-good`, `av-bad`, `av-mut` — sémantická obarvení hodnot

### Třídy řádků
- `av-row-highlight` — zvýraznění (světle červený podtisk, červený popisek)

### Kdy použít
- Mezinárodní srovnání s 3+ sloupci
- RACI / odpovědnostní matrix (kdo × co × kdy)
- Scénáře s parametry (cesta A/B/C × dopady)

---

## 4. `.av-flow` — flow diagram

Horizontální (na desktopu) nebo vertikální (na mobilu) řetěz kroků se šipkami.
Pro lineární proces 3–6 kroků. Pro větvení (RACI, datový tok 1-N) použij
`av-data-table` nebo SVG.

### Markup

```html
<figure class="av-figure">
  <figcaption class="av-figure-h">Datový tok eHealth (NCEZ ↔ ÚZIS ↔ pojišťovny ↔ poskytovatel)</figcaption>
  <ol class="av-flow">
    <li class="av-flow-step av-flow-step-good">
      <span class="av-flow-num"></span>
      <h4 class="av-flow-title">Pacient u praktika</h4>
      <p class="av-flow-desc">eRecept, eŽádanka generována v ambulantním IS.</p>
      <span class="av-flow-tag">Funguje 99 %</span>
    </li>
    <li class="av-flow-step">
      <span class="av-flow-num"></span>
      <h4 class="av-flow-title">NCEZ centrální brána</h4>
      <p class="av-flow-desc">Validace, podpis, předání směrem k laboratoři / lékárně.</p>
    </li>
    <li class="av-flow-step av-flow-step-warn">
      <span class="av-flow-num"></span>
      <h4 class="av-flow-title">Pojišťovna</h4>
      <p class="av-flow-desc">Úhradová kontrola, výplata.</p>
      <span class="av-flow-tag">Latence 30 d</span>
    </li>
  </ol>
</figure>
```

### Modifikátory kroku
- `av-flow-step-good` — zelený top border
- `av-flow-step-warn` — oranžový
- `av-flow-step-bad` — červený

`.av-flow-num` automaticky generuje „Krok 01", „Krok 02" … přes CSS counter.

### Kdy použít
- Lineární proces (žádost → vyřízení → kontrola → výplata)
- Datový tok (kde data vznikají → kam jdou)
- Sled fází reformy

---

## 5. `.av-counter` — animovaný počet

Velké číslo, které animuje od 0 do cílové hodnoty, když uživatel scrolluje do
viewportu. Respektuje `prefers-reduced-motion` — tehdy se zobrazí finální
hodnota okamžitě bez animace.

### Markup (inline v textu)

```html
<p>
  Reforma zasáhne <span class="av-counter"
    data-value="96" data-suffix=" nemocnic">96 nemocnic</span>
  a přibližně <span class="av-counter"
    data-value="200000" data-suffix=" kontaktů ročně">200 000 kontaktů ročně</span>.
</p>
```

### Markup (blok s popisem)

```html
<div class="av-counter-grid">
  <div class="av-counter-block av-counter-block-bad">
    <span class="av-counter" data-value="96">96</span>
    <span class="av-counter-label">nemocnic s LPS</span>
    <span class="av-counter-foot">stav k 1. 1. 2026</span>
  </div>
  <div class="av-counter-block av-counter-block-good">
    <span class="av-counter" data-value="9600" data-prefix="až "
          data-suffix=" Kč">až 9 600 Kč</span>
    <span class="av-counter-label">cílová sazba za výkon</span>
    <span class="av-counter-foot">vs. 90 Kč v 2025</span>
  </div>
</div>
```

### Data atributy
- `data-value` — cílová numerická hodnota (povinné pro animaci; bez tisícových oddělovačů)
- `data-decimals` — počet desetinných míst (default 0)
- `data-prefix`, `data-suffix` — text před/po (volitelné, např. `" Kč"`, `"+"`, `"−"`)
- `data-duration` — doba animace v ms (default 1200, clamp 200–5000)

### Modifikátory bloku
- `av-counter-block-good`, `-warn`, `-bad`, `-neutral` — top border + barva čísla
- (default = červená, varianta `-neutral` = inkoust)

### ⚠️ Kdy NEpoužívat `data-value`

Animace `Intl.NumberFormat('cs-CZ')` přepíše innerText na formátované číslo —
což může zlikvidovat sémantiku původního obsahu. Pokud chceš zachovat plnou
`.av-counter` typografii (velké červené serif číslo) bez animace, jen vynechej
`data-value`. JS pak skip animaci, statický text zůstane.

| Anti-pattern | Co se stane | Fix |
|---|---|---|
| `data-value="2027">1. 1. 2027` | "2 027" — ztratí se den a měsíc | vynechej data-value |
| `data-value="1981">1981` | "1 981" — tisícový oddělovač u roku | vynechej data-value |
| `data-value="15">12–19` | "15" — range se zhroutí na point | vynechej data-value |
| `data-value="4" data-suffix="–8 měs.">4–8 měs.` | "4 –8 měs." během animace | vynechej data-value |
| `data-value="6.4" data-suffix=" %">+6,4 %` | "6,4 %" — chybí znaménko | přidej `data-prefix="+"` |

### Kdy použít
- 2–4 hero čísla na konci sekce („velký dopad")
- Inline zvýraznění klíčové **numerické** hodnoty v odstavci
- Pro **kontextové text** (data, roky, ranges) jen styling bez `data-value`
- **Ne** pro time-series — na to je `.av-timeline` nebo line chart

---

## Migrace z existujících patternů

Existující CSS třídy v `styles.css` jsou bohaté, ale nesourodé. Postupná migrace
(scope mimo etapu 7) — ekvivalence:

| Stávající | AV ekvivalent | Poznámka |
|---|---|---|
| `cmp-funnel` + `cmp-stage` | `av-flow` | Mapování `cmp-stage-bad/good` → `av-flow-step-bad/good`. |
| `rpp-timeline` | `av-timeline` | Markup struktura téměř identická. |
| `article-flow` (in/out 2-sloupcový) | `av-data-table` 2-col **nebo** ponechat | Specifický pattern „funguje × nefunguje". |
| `drg-scenarios` | `av-data-table` | Třídy `drg-bad`, `drg-cap` → `av-bad`, `av-mut`. |
| `waffle-100` | ponechat (specifický 100-cell vizuál) | AV `bar-compare` neřeší 100-cell. |
| `sha-donut` | ponechat (specifický donut) | AV nemá pie/donut variantu. |
| `vakc-gauge`, `kapitace-stairs` | ponechat (case-specific) | Mimo rozsah generického DS. |
| `stat-num`, `num-big`, `big-number`, `hero-stat` | `av-counter` | Animace + jednotné formátování. |
| `cekani-table`, `hly-compare`, `sha-comp-grid` | `av-data-table` | Sjednotit při dalším auditu. |

Migrace je **opt-in** — staré třídy zůstávají funkční, dokud nebude separátní
PR „AV migrace". Nové články píš v `.av-*` označení.

---

## JS API

```js
import { enhanceArticleVisuals } from './article-visuals.js';

// Auto-bootstrap (volá se z clanky.js):
enhanceArticleVisuals();

// Manuálně po pozdějším insertu HTML:
const section = document.querySelector('#novy-blok');
enhanceArticleVisuals(section);
```

Pure helpery (testovatelné):
- `barWidthPct(value, max)` → 0–100
- `formatNumber(value, decimals)` → `"154,6"` (cs-CZ locale)
- `easeOutQuart(t)`, `clampInt(v, min, max, fallback)`

## Testy AV

`05_M1_Starter/tests/article-visuals.test.js` — pure logika + smoke test
(import v `clanky.js`, existence této dokumentace, popsané všechny 5 komponent).
DOM-závislé části testujeme nepřímo přes existenci AV markup v cílových
článcích (které jsou auditovány v `VISUAL_INVENTORY_*.md`).

```bash
cd 05_M1_Starter
npm test
```

---

# 2. Page-level komponenty

Komponenty mimo články — používané na homepage, hubu článků a meta-stránkách.
Na rozdíl od AV nejsou generické (mají per-stránka kontext), ale jsou opakovaně
použitelné v rámci své domény.

## 2.1 Hub matrix — `.hub-matrix-*`

Mřížka navigačních dlaždic s vizuálním vážením podle početu položek. Použito na
`clanky.html` (témata × počet článků) a v menším rozsahu na `index.html` (hub
modulárních odkazů).

| | |
|---|---|
| **Zdrojový kód** | `src/clanky.js` (renderer `hub-matrix-tile`), `src/app.js` (homepage hub) |
| **CSS** | `.hub-matrix-*`, `.hub-section-*`, `.hub-stat-*` v `styles.css` |
| **Použito na** | `clanky.html`, `index.html` |

### Markup

```html
<section class="hub-matrix-section" aria-labelledby="hubMatrixH">
  <div class="ed-kicker">Mapa korpusu</div>
  <h3 class="hub-section-h" id="hubMatrixH">Procházet podle oblasti</h3>
  <p class="hub-matrix-lead">Osm tematických oblastí…</p>
  <div class="hub-matrix-grid" id="hubMatrix" role="navigation">
    <button class="hub-matrix-tile hub-matrix-tile-l" data-topic="financovani">
      <span class="hub-matrix-tile-label">Financování</span>
      <span class="hub-matrix-tile-count">18</span>
    </button>
    <button class="hub-matrix-tile hub-matrix-tile-m" data-topic="prevence">…</button>
    <button class="hub-matrix-tile hub-matrix-tile-s" data-topic="eu-rules">…</button>
  </div>
</section>
```

### Modifikátory velikosti

| Třída | Velikost | Kdy |
|---|---|---|
| `hub-matrix-tile-l` | velká | ≥ 66 % maxima v setu |
| `hub-matrix-tile-m` | střední | 33–66 % |
| `hub-matrix-tile-s` | malá | < 33 % |

Velikost se počítá v JS (`renderHubMatrix(articles)` v `clanky.js`) podle
proporcionálního zastoupení tématu v korpusu.

### Statistiky nad matrix — `.hub-stat-*`

```html
<div class="hub-stats">
  <div class="hub-stat">
    <span class="hub-stat-num av-counter" data-value="65" id="statPublished">—</span>
    <span class="hub-stat-lbl">vydaných článků</span>
  </div>
  <div class="hub-stat">
    <span class="hub-stat-num av-counter" data-value="12" id="statUpcoming">—</span>
    <span class="hub-stat-lbl">v přípravě</span>
  </div>
</div>
```

## 2.2 Scorecard — `.scorecard` / `.sc-*`

Souhrnný přehled signálů (good/warn/bad/neutral). Na homepage nad seznamem
indikátorů.

| | |
|---|---|
| **CSS** | `.scorecard`, `.sc-tile`, `.sc-good/-warn/-bad/-neutral/-total`, `.sc-num`, `.sc-lbl` |
| **Použito na** | `index.html` |

### Markup

```html
<div class="scorecard" id="scorecard" role="region" aria-label="Souhrnný přehled signálů">
  <div class="sc-tile sc-total">
    <span class="sc-num" id="scTotal">80</span>
    <span class="sc-lbl">Celkem</span>
  </div>
  <div class="sc-tile sc-good">
    <span class="sc-num" id="scGood">23</span>
    <span class="sc-lbl">Dobré</span>
  </div>
  <div class="sc-tile sc-warn">…</div>
  <div class="sc-tile sc-bad">…</div>
  <div class="sc-tile sc-neutral">…</div>
</div>
```

Hodnoty se plní z JS po načtení `data/indicators.json` (`countSignals(indicators)`).

## 2.3 Dim grid — `.dim-*` / `.dimnav-*`

Šest dimenzí kvality (přístupnost, kvalita, efektivita, equity, udržitelnost,
bezpečnost) jako grid + sub-navigace. Na homepage a v `hspa-prehled.html`.

| | |
|---|---|
| **Zdrojový kód** | `src/app.js` (homepage), `src/hspa-prehled.js` (přehled) |
| **CSS** | `.dim-card`, `.dim-card-h`, `.dim-card-desc`, `.dim-card-stat`, `.dim-card-link`, `.dimnav-*` |
| **Použito na** | `index.html`, `hspa-prehled.html` |

### Markup

```html
<div class="dim-grid">
  <a class="dim-card" href="hspa-prehled.html#dim-accessibility">
    <span class="dim-card-icon">🚪</span>
    <h3 class="dim-card-h">Přístupnost</h3>
    <p class="dim-card-desc">Mohu se dostat k péči včas?</p>
    <span class="dim-card-stat">
      <span class="av-counter" data-value="12">12</span> indikátorů
    </span>
  </a>
  <!-- × 6 dimenzí -->
</div>
```

Data: `data/dimensions.json` (`dimensions: [{id, name, description, icon, indicator_ids}]`).

## 2.4 Finance donut — `.finance-*`

Donut graf + dlaždice se segmenty výdajů zdravotních pojišťoven. Pouze na
homepage, jediná stránka, která používá Chart.js (canvas).

| | |
|---|---|
| **Zdrojový kód** | inline v `src/app.js`, sekce `renderFinanceDonut()` |
| **CSS** | `.finance-lead`, `.finance-wrap`, `.finance-chart-*`, `.finance-tile-*`, `.finance-cta-*` |
| **Použito na** | `index.html` (jediná stránka s Chart.js) |

### Markup

```html
<div class="finance-wrap">
  <div class="finance-chart-wrap">
    <canvas id="financeDonut" aria-label="Donut graf struktury úhrad ZP"></canvas>
    <div class="finance-chart-center" aria-hidden="true">
      <div class="finance-chart-center-value">
        <span class="av-counter" data-value="459" data-duration="1600">0</span>
      </div>
      <div class="finance-chart-center-unit">mld Kč</div>
      <div class="finance-chart-center-year">2023</div>
    </div>
  </div>

  <div class="finance-tiles">
    <a class="finance-tile finance-tile-luzkova" href="indicator.html?id=podil_vydaje_luzkova_pece">
      <span class="finance-tile-fill" data-target-width="55.9"></span>
      <span class="finance-tile-dot"></span>
      <span class="finance-tile-label">Lůžková péče</span>
      <span class="finance-tile-value">
        <span class="av-counter" data-value="55.9" data-decimals="1">0</span>&nbsp;%
      </span>
      <span class="finance-tile-abs">
        <span class="av-counter" data-value="256.7" data-decimals="1">0</span>&nbsp;mld&nbsp;Kč
      </span>
    </a>
    <!-- ambul, leky, other -->
  </div>
</div>

<aside class="finance-cta">
  <p class="finance-cta-text">Stojí za přečtení…</p>
  <a class="finance-cta-link" href="clanek-financovani-segmenty-2026.html">Číst článek →</a>
</aside>
```

### Klíčové detaily

- `data-target-width="55.9"` — bar fill animace (procenta šířky) animovaná IntersectionObserverem
- `av-counter` uvnitř — count-up animace
- Hard-coded hodnoty v HTML (data nejdou z `indicators.json`) — homepage hero content
- Chart.js načítán z CDN přes `<script src=…>` v `<head>`

## 2.5 Podcast card — `.podcast-*`

Karta posledního dílu podcastu na homepage.

| | |
|---|---|
| **CSS** | `.podcast-card`, `.podcast-cover`, `.podcast-meta`, `.podcast-title`, `.podcast-cta` |
| **Použito na** | `index.html` |

### Markup

```html
<aside class="podcast-card">
  <img class="podcast-cover" src="assets/podcast-cover.jpg" alt="">
  <div class="podcast-body">
    <span class="podcast-meta">Díl 7 · 14 minut · Spotify</span>
    <h3 class="podcast-title">Kam plyne 459 miliard</h3>
    <p class="podcast-desc">Rozhovor s ekonomkou o struktuře výdajů.</p>
    <a class="podcast-cta" href="https://open.spotify.com/show/…">Poslechnout →</a>
  </div>
</aside>
```

## 2.6 Gap section — `.gap-*`

Sekce „co nám chybí" — vizualizace mezery mezi 122 indikátory rámce a 80 v
dashboardu. Progress bars per doména.

| | |
|---|---|
| **Zdrojový kód** | `src/hspa-prehled.js` (renderer) |
| **CSS** | `.gap-section`, `.gap-row`, `.gap-domain`, `.gap-progress`, `.gap-progress-fill`, `.gap-stats` |
| **Použito na** | `hspa-prehled.html`, částečně `index.html` |

### Markup

```html
<section class="gap-section">
  <h3 class="gap-section-h">Co nám chybí</h3>
  <p class="gap-section-lead">
    Z <strong data-stat="frameworkTotal">122</strong> indikátorů máme
    <strong data-stat="hspaCount">71</strong>. Zbývá <strong data-stat="hspaGap">51</strong>.
  </p>

  <div class="gap-rows">
    <div class="gap-row" data-domain="Zdravotní stav">
      <span class="gap-domain">Zdravotní stav</span>
      <div class="gap-progress" aria-label="9 z 12 indikátorů">
        <span class="gap-progress-fill" data-target-width="75"></span>
      </div>
      <span class="gap-progress-text">9 / 12</span>
    </div>
    <!-- × 12 domén -->
  </div>
</section>
```

`data-target-width` se animuje při scrollu (IntersectionObserver, ease-out).

## 2.7 AI disclaimer — `.ai-*`

Banner upozorňující, že část obsahu byla vygenerována AI. Zobrazuje se na
úvodu článku (pod hlavičkou) a v patičce sekcí.

| | |
|---|---|
| **CSS** | `.ai-disclaimer`, `.ai-disclaimer-icon`, `.ai-disclaimer-text`, `.ai-disclaimer-link` |
| **Použito na** | některé `clanek-*.html` (kde audit-status v metadatech to vyžaduje), o-projektu.html |

### Markup

```html
<aside class="ai-disclaimer" role="note">
  <span class="ai-disclaimer-icon" aria-hidden="true">🤖</span>
  <span class="ai-disclaimer-text">
    Tento text vznikl s pomocí AI a byl redakčně ověřen.
    <a class="ai-disclaimer-link" href="o-projektu.html#metodika">Více o metodice</a>
  </span>
</aside>
```

## 2.8 Audit banner — `.audit-*` / `.disclaimer-*`

Top-of-page banner zobrazený nad článkem podle hodnoty `audit-status` v
`data/articles.json`. Renderuje `src/clanky.js` na load.

| Audit status | Banner | Barva |
|---|---|---|
| `verified` | žádný | — |
| `review-pending` | „Tento článek čeká na redakční review." | žlutá |
| `partial` | „Text ověřen, čísla čekají na aktualizaci." | žlutá |
| `flagged` | „Pozor — nalezený problém v textu/datech." | červená |
| `draft-flagged` | „Draft s otevřenými problémy. Nepublikováno." | červená |

### Markup

```html
<div class="audit-banner audit-banner-warn" role="status">
  <span class="audit-banner-icon" aria-hidden="true">⚠️</span>
  <span class="audit-banner-text">
    <strong>Review pending</strong> — Článek byl nedávno upraven a čeká na redakční ověření.
  </span>
  <a class="audit-banner-link" href="redakce.html">Otevřít redakci →</a>
</div>
```

CSS modifikátory: `audit-banner-warn` (žlutá pro review-pending/partial),
`audit-banner-bad` (červená pro flagged/draft-flagged).

---

# 3. Animation patterns

Všechny animace v projektu sdílí stejné principy. Implementace v
`src/article-visuals.js` (helpery + IntersectionObserver bootstrap) a
inline v některých page modulech (např. `src/app.js` pro finance-tile-fill).

## 3.1 IntersectionObserver bootstrap

Animace se spouští, **až když element vstoupí do viewportu** — ne při loadu.
To zachová percieved performance a respektuje user attention.

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (entry.target.dataset.avInit === '1') return;  // idempotence
    entry.target.dataset.avInit = '1';
    animate(entry.target);
    observer.unobserve(entry.target);
  });
}, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

document.querySelectorAll('.av-counter, .finance-tile-fill, .gap-progress-fill')
  .forEach(el => observer.observe(el));
```

**Threshold 0.2** = element musí být alespoň z 20 % v viewportu.
**rootMargin -10%** = trigger se zpozdí, aby animace nezačala hned u horního okraje.

## 3.2 Count-up (`.av-counter`)

Implementace v `src/article-visuals.js`:

```js
function animateCounter(el, value, decimals, duration, prefix, suffix) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = prefix + formatNumber(value, decimals) + suffix;
    return;
  }
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutQuart(t);
    el.textContent = prefix + formatNumber(value * eased, decimals) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
function formatNumber(v, d) {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: d, maximumFractionDigits: d
  }).format(v);
}
```

**Klíčové detaily:**
- `Intl.NumberFormat('cs-CZ')` zajistí české formátování (desetinná čárka, tisícové mezery)
- `easeOutQuart` zpomalí ke konci — vizuálně „přistává" na čísle
- `prefers-reduced-motion` skipuje animaci, finální hodnota okamžitě
- Idempotence přes `data-av-init="1"` flag

## 3.3 Bar fills (`.finance-tile-fill`, `.gap-progress-fill`)

CSS-driven s JS triggerem. Inicializační stav `width: 0`, target přes
`data-target-width`. Po triggeru:

```js
function fillBar(el) {
  const target = parseFloat(el.dataset.targetWidth);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.style.width = target + '%';
    return;
  }
  el.style.transition = 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)';
  requestAnimationFrame(() => { el.style.width = target + '%'; });
}
```

CSS:

```css
.finance-tile-fill,
.gap-progress-fill {
  display: block;
  height: 100%;
  width: 0;
  background: var(--accent);
}
```

## 3.4 Tabular numerals

Všechna animovaná čísla mají `font-variant-numeric: tabular-nums` v CSS.
Bez tohoto by se šířka čísla měnila s každou cifrou a vyvolávalo by to
„skákání" layoutu během animace.

```css
.av-counter,
.sc-num,
.hub-stat-num,
.gap-progress-text,
.finance-tile-value {
  font-variant-numeric: tabular-nums;
}
```

## 3.5 `prefers-reduced-motion`

Každá animační funkce nejdřív checkuje:

```js
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // skip animation, set final state immediately
  return;
}
```

Týká se: count-up, bar fills, scroll progress, in-viewport fade-ins.
**Nevztahuje se na esenciální transitions** (hover, focus) — ty jsou OK.

## 3.6 Idempotence: `data-av-init="1"`

Všechny animované elementy se po inicializaci označí flagem `data-av-init="1"`.
Opakované volání `enhanceArticleVisuals()` (např. po `innerHTML` insert)
nezpůsobí duplicitní animaci.

```js
function enhance(root) {
  root.querySelectorAll('.av-counter:not([data-av-init="1"])').forEach(el => {
    initCounter(el);
    el.dataset.avInit = '1';
  });
}
```

Stejný flag respektují `finance-tile-fill`, `gap-progress-fill`, `av-bar-row-fill`.

## 3.7 Performance

- **RAF (requestAnimationFrame)** používá všechny animace — žádný `setTimeout`/`setInterval`
- **`observer.unobserve(el)`** po prvním spuštění — observer si neudržuje referenci na hotové elementy
- **Žádné JS scroll listenery** — vše přes IntersectionObserver
- **Žádné dependencies** — pure DOM + RAF + IntersectionObserver

---

## Per-stránka katalog komponent

| Stránka | AV komponenty | Page-level komponenty |
|---|---|---|
| `index.html` | counter (intenzivně), bar-compare ojediněle | scorecard, dim-grid, finance-donut, hub-matrix, podcast-card, gap-section |
| `clanek-*.html` | všech 5 | audit-banner (pokud non-verified), ai-disclaimer (občas) |
| `clanky.html` | counter (stats) | hub-matrix, hub-stats |
| `hspa-prehled.html` | counter | gap-section, dim-grid |
| `tematicke-linie.html` | counter | theme-cards (per-stránka, nenamespaceováno do AV) |
| `kraje.html` | counter | kraje-mapa (SVG, page-specific) |
| `pojistenci.html` | counter | pojistenci-atlas (SVG + Canvas, page-specific) |
| `prevence.html` | counter, bar-compare | prevention-cards, action-cards |
| `strategie.html` | counter | strategy-cards, responsibility-matrix, gantt |
| `glosar.html` | — | glossary-search, glossary-list |
| `indicator.html` | bar-compare, counter | indicator-card, cz-map |

---
*Verze 2.0 · květen 2026*
