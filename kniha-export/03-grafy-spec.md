# Skóre zdravotnictví 2026 — Specifikace grafů
## Které grafy zařadit, jak mají vypadat, které NEmít

> Tento dokument řídí **veškerou datovou grafiku knihy**. Cílem je, aby všech
> ~144 grafů mělo **jeden vizuální jazyk** (čtenář se je učí číst jednou) a aby
> interaktivní prvky webu dostaly poctivou tištěnou podobu. Data grafů pocházejí
> z pole `cover_viz` u článků (`data/articles.json`) a z `data/indicators.json`.
> Statické verze jsou v `grafika/` (generuje `podklady/generate-charts.mjs`).

---

## 1. Zásady (platí pro všechny grafy)

1. **Jeden typ = jeden vzhled.** Sloupcový graf vypadá v celé knize stejně.
2. **Data mají navrch.** Žádné 3D, stíny, přechody, dekorace, zaoblené sloupce
   navíc. Osa popsaná, jednotka vždy uvedena.
3. **Červená jen pro signál.** `accent: "bad"` / zvýrazněný hrot = signální
   červená `#B8361E`. Ostatní sloupce inkoust / tlumený inkoust. Nikdy vše
   červené.
4. **Signál = tvar + barva + slovo.** Musí fungovat černobíle a pro barvoslepé
   (▲ lepší / ● kolem / ▼ horší / — kontext).
5. **Tabular figures** (číslice stejné šířky) ve všech číslech grafů a tabulek.
6. **Popisek + zdroj** pod každým grafem, jednotný formát (viz `04-…§6`):
   `Zdroj: {zdroj}, {rok}. {benchmark}.` + u seed dat `[Ilustrativní]`.
7. **Benchmark jako referenční linka.** Kde existuje OECD/EU, kreslí se tenká
   svislá/vodorovná referenční linka + popisek — čtenář hned vidí, kde stojíme.

## 2. Typologie grafů (přebráno z `cover_viz`)

Web používá 6 typů. Do knihy je mapujeme takto:

### 2.1 `bar-compare` (125×) — **Pruhový srovnávací graf** — hlavní pracant knihy
- **Data:** `title`, `unit`, `max`, `rows[]` (`label`, `value`, `accent?`, `highlight?`).
- **Podoba:** vodorovné pruhy, řazení dle dat (obvykle chronologicky nebo dle
  hodnoty). Zvýrazněný řádek (`highlight`) sytější; `accent:"bad"` = červená,
  `accent:"good"` = zelená `#2F6B1F`, jinak inkoust.
- **Osa:** od 0 do `max`, hodnota vždy jako číslo na konci pruhu (tabular).
- **Benchmark:** je-li v datech OECD/EU řádek, odlišit tenkou linkou/šrafou.
- **Velikost v knize:** čtvrt až půl strany; klíčové půlstrana / šířka sazby.

### 2.2 `big-number` (14×) — **Velké číslo**
- **Data:** `number`, `unit`, `label`.
- **Podoba:** jedno velké číslo (serif nebo grotesk bold, 48–96 pt) + krátký
  popisek pod ním. Jediné místo, kde smí být červená jako akcent (a jen když
  jde o signál „bad"). Umístění: otvírák kapitoly nebo margin.

### 2.3 `stat-cards` (2×) — **Sada statistických karet**
- **Data:** `title`, `cards[]` (`value`, `label`).
- **Podoba:** 2–4 karty vedle sebe (box papír2), velká hodnota + popisek.
  Vhodné jako shrnutí „reforma v číslech" na začátku kapitoly.

### 2.4 `donut` (1×) — **Prstenec (podíl)**
- **Podoba:** jednoduchý prstenec, max 2–3 segmenty, inkoust + 1 akcent. Uvnitř
  velké procento. (Pozor: koláče/prstence jen pro 2–3 hodnoty, jinak pruhy.)

### 2.5 `stat` (1×) — **Jeden statistický údaj** — jako `big-number`, menší.

### 2.6 `timeline` (1×) — **Časová osa**
- **Podoba:** vodorovná linka s milníky (rok + událost). Použít i pro reformy /
  legislativu v Dílu I–III (mnoho kapitol má chronologii, i když ne v `cover_viz`).

## 3. Grafy z indikátorů (scorecardy)

Nad rámec `cover_viz` má kniha **scorecardy** (viz `01-design-system.md §5`):
karta indikátoru s hodnotou, jednotkou, rokem, signálem, benchmarkem OECD/EU a
**mini-trendem (sparkline)** z pole `trend[]` v `data/indicators.json`.

- **Kde:** úvody dílů (scorecard oblasti, 3–5 indikátorů) + margin u kapitol,
  které se indikátoru týkají (`linked_indicators` v manifestu).
- **Sparkline:** tenká čára trendu, poslední bod zvýrazněn, bez os — jen tvar.
- **Signál:** barevná tečka + tvar (▲/●/▼/—) + slovo.

## 4. Interaktivní prvky → statická podoba (co NEpřeklápět 1:1)

Tyto prvky na webu žijí interakcí; do knihy jdou jako **statická infografika +
QR** na živou verzi. **Nesnažit se je nasimulovat jako „funkční" v tisku.**

| Web (interaktivní) | Kniha (statika) | Data / odkaz |
|---|---|---|
| **Model systému** (`model-systemu.html`, „Zatlačte na páku") | Celostránková **kauzální mapa**: uzly + orientované hrany, 3–5 klíčových pák zvýrazněno. Legenda. QR na živý model. | `data/system-model.json`, `data/levers.json` |
| **Hra Tři židle** (ministr / ředitel / pacient) | Dvoustrana: 3 perspektivy vedle sebe, u každé 2–3 rozhodnutí a jejich systémový dopad (statické „karty rozhodnutí"). QR na hru. | `data/reditel-hra.json`, `data/vyhlaska-hra.json`, `PLAN-TRI-ZIDLE.md` |
| **Mapa krajů** (`kraje.html`) | Statická **choroplet mapa ČR** pro 1–2 klíčové indikátory (např. cholesterol podle obcí, dostupnost). Legenda kvantilů. QR. | `data/regions.json`, `cz-regions.geojson` |
| **Pojištěnci OIS 11-47** | Vybraná **tabulka/žebříček** (ZP × kraj), ne celý dataset. QR na web. | `data/pojistenci-d5-*.json` |
| **Globální vyhledávání, kalkulačky, ticker** | **Vynechat** — čistě webové. | — |

**Pravidlo QR:** každá statická náhrada interaktivního prvku i každý graf
navázaný na indikátor nese QR na živou verzi (`skorezdravotnictvi.cz/...`).
QR generuje sázecí session z URL (u grafů z indikátorů: `/indicator?id={id}`).

## 5. Které grafy NEMÍT
- **Duplicitní** grafy stejného čísla ve dvou kapitolách — sjednotit, odkázat.
- **Grafy bez zdroje** nebo bez jednotky — nezařazovat, dokud se nedoplní.
- **Koláče s > 3 segmenty** — převést na pruhy.
- **Interaktivní vizualizace „naoko"** (statický screenshot dashboardu) —
  nahradit čistou tištěnou grafikou dle §2/§4.
- **Ilustrativní data bez označení** — buď označit „[Ilustrativní]", nebo vynechat.

## 6. Produkce grafiky (co je hotové, co dodělat)

- **Hotové (v `grafika/`):** statické **SVG** pro `cover_viz` typů `bar-compare`,
  `big-number`, `stat-cards` — vygenerováno `podklady/generate-charts.mjs`
  v knižním stylu (paleta, tabular, jednotky). Soubory: `grafika/<slug>.svg`.
- **Dodělat v sazbě:**
  - **Scorecardy indikátorů** (ze `data/indicators.json` + `trend[]`).
  - **Kauzální mapa** modelu systému a **Tři židle** (dle §4).
  - **Choropleth mapy** krajů (dle §4).
  - **Timeline** reforem pro Díl I–III.
  - **QR kódy** ze seznamu URL.
- SVG lze v Affinity otevřít/umístit přímo a doladit (barvy jsou z palety §3
  designu). Pro tisk převést text v SVG na křivky nebo dodat fonty.

---

### Shrnutí pro sazeče
1. Použij hotové `grafika/*.svg` pro otvírací grafy kapitol.
2. Doplň scorecardy do úvodů dílů a marginů (data z indicators.json).
3. Interaktivní prvky → statika + QR dle §4 (nesimulovat interakci).
4. Drž jeden vizuální jazyk (§1) a pravidlo červené (jen signál).
