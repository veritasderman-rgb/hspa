# HSPA Monitor — Article Visuals (design system)

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
- `data-value` — cílová numerická hodnota (povinné; bez tisícových oddělovačů)
- `data-decimals` — počet desetinných míst (default 0)
- `data-prefix`, `data-suffix` — text před/po (volitelné, např. `" Kč"`)
- `data-duration` — doba animace v ms (default 1200, clamp 200–5000)

### Modifikátory bloku
- `av-counter-block-good`, `-warn`, `-bad`, `-neutral` — top border + barva čísla
- (default = červená, varianta `-neutral` = inkoust)

### Kdy použít
- 2–4 hero čísla na konci sekce („velký dopad“)
- Inline zvýraznění klíčové hodnoty v odstavci
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

## Testy

`05_M1_Starter/tests/article-visuals.test.js` — pure logika + smoke test
(import v `clanky.js`, existence této dokumentace, popsané všechny 5 komponent).
DOM-závislé části testujeme nepřímo přes existenci AV markup v cílových
článcích (které jsou auditovány v `VISUAL_INVENTORY_*.md`).

```bash
cd 05_M1_Starter
npm test
```
