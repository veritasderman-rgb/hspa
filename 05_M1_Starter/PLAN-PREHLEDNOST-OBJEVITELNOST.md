# PLAN — Přehlednost a objevitelnost článků

**Vstupní bod pro práci na navigaci, vyhledávání a věcných souvislostech článků.**
Vzniklo ze zamyšlení nad stavem webu k 2026-08-03: korpus přerostl chronologický
model prezentace a potřebuje strukturální odpověď.

---

## 1) Diagnóza — co dnes máme a proč to přestává stačit

### Měřítko

- **212 článků** v `data/articles.json` (177 publikovaných, 35 draftů).
- Denní + noční rutina přidávají ~1 článek/den → **za rok ~500 článků**.
- CLAUDE.md i fallback texty v kódu stále mluví o „65 článcích"
  (`src/article-related.js` HUB_FALLBACK_CARDS) — čísla driftují.

### Taxonomie — máme jich pět, žádná není úplná

| Pole | Stav | Problém |
|---|---|---|
| `rubric` | 8 řízených hodnot, 100 % pokrytí | ✅ jediná zdravá osa — pohání chips na hubu + `rubrika.html` |
| `topics` | 8 hodnot, ~totožné s rubric | duplikuje rubric; jediné využití je related-overlap, kde je moc hrubé |
| `tag` | volný text, **68 unikátních hodnot**, 30+ singletonů | chaos: „Legislativa" vs „Legislativa a reforma", „Financování" vs „Financování péče" vs „Financování · efektivita" |
| `kind` | 89× chybí, mix `analysis`/`analyza`/`article`/`clanek` | nekonzistentní, nic ho nevaliduje |
| `linked_indicators` | 200/212 článků | ✅ **nejcennější sémantická síť webu** — dnes využitá jen na indicator detail + „Příbuzné sekce" |

Navíc dvě kurátorské vrstvy mimo data:

- **Série** (6 sérií: reforma 9 dílů, epidemiologie, nápoje, digi, AI, PM/PH)
  jsou natvrdo v `src/series-nav.js` — přidání série = editace JS, hub
  zobrazuje jen jednu z nich.
- **Tematické linie** (`data/themes.json`, 5 linií) se na články vážou jen
  nepřímo přes `indicator_ids`. CLAUDE.md tvrdí „8 linií" — drift.

### Hub `clanky.html`

Struktura je dobrá (hero → Aktuálně → Série → Essentials → Rubriky → filtr +
seznam), ale škáluje špatně:

1. Sekce „Všechny články" = jeden chronologický seznam, chips jen 1. úroveň
   (8 rubrik), stránkování „dalších 12" → u 177 článků nekonečné klikání,
   starší texty fakticky nedohledatelné jinak než vyhledáváním.
2. Hub search filtruje jen title/perex/topics — nehledá v textu článků.
3. Filtr nemá stav v URL — vyfiltrovaný pohled nejde sdílet ani nalinkovat.

### Homepage

Články na homepage = 3 nejnovější karty (regeneruje publish skript). Čistě
chronologické okno — žádná věcná mapa korpusu. Vzhledem k délce homepage
(hero, rozcestník, články, 8 nástrojů, narativ, dimenze, indikátory, regiony,
finance) je to asi správný rozsah, ale výběr by měl být chytřejší než
„poslední tři".

### Vyhledávání

- Site-wide overlay (`src/search.js`) existuje a je dobrý: články + indikátory
  + glosář, `/` a `Cmd+K`, recent searches, a11y focus trap. Overlay má i
  mobilní styly (96vw modal).
- **Na mobilu se ale nedá otevřít**: tlačítko `.site-search-trigger` je pod
  600 px `display: none` (komentář v CSS říká „na mobilu jen via keyboard
  nebo hamburger" — jenže mobil klávesnici nemá a hamburger drawer žádnou
  položku Hledat neobsahuje). → **Mobil nemá vyhledávání vůbec.**
- Index hledá jen title + perex + tag + topics článku — ne fulltext.

### Související články na stránce článku

`pickRelatedArticles()` v `src/article-related.js` skóruje overlap `topics`.
Při 8 hrubých hodnotách a 177 článcích (63 sdílí „prevence") je výběr skoro
náhodný. Přitom `linked_indicators` (200/212 článků, granularita ~190
indikátorů) by dal řádově přesnější příbuznost — a už se načítají.

---

## 2) Principy řešení

1. **Chronologie není architektura.** Proud „nejnovější" je jedna vrstva
   (novinky). Rovnocenné vstupy musí být věcné osy: rubriky (8),
   kolekce/série a sémantická síť přes indikátory. Cíl: každý článek
   dosažitelný ≤3 kliky bez vyhledávání a bez listování.
2. **Jedna primární taxonomie, bohaté vazby.** `rubric` = primární osa
   (výlučná, 8 hodnot). `linked_indicators` = sémantická síť. Kolekce
   (série + linie) = kurátorská vrstva. `tag` zredukovat na řízený slovník;
   `topics` zrušit nebo srovnat s rubric.
3. **Kurátorství do dat, ne do kódu.** Série patří do `articles.json`
   (`series: {id, part}`), registr sérií do JSON. Přidání série nesmí
   znamenat editaci JS.
4. **Governance předem.** Při 1 článku/den se taxonomie bez validátoru
   rozpadne za měsíc. Co nemá schema check ve `validate-articles.js`,
   to fakticky neexistuje.

---

## 3) Návrh po vlnách

### Vlna 1 — rychlé opravy (1 session, žádná architektonická změna)

**1a. Vyhledávání na mobilu** *(nejvyšší priorita — chybějící core funkce)*
- Ikonové tlačítko ⌕ v topbaru vedle hamburgeru (`≤600px` viditelné,
  desktop trigger zůstává), otevírá stejný overlay.
- Položka „⌕ Hledat" nahoře v mobile drawer (`.mobile-nav-drawer-head`
  actions, nebo první položka `.mobile-nav-list`).
- Overlay input `font-size: 16px` na mobilu (jinak iOS zoomuje stránku).
- Test: nesmí kontrolovat jen existenci v DOM (ta je splněná i dnes —
  desktopový trigger existuje, jen je pod 600 px skrytý přes CSS). Akceptační
  test musí ověřit **computed visibility/focusability při viewportu < 600 px**
  a existenci ovladatelného prvku v draweru (např. jsdom + matchMedia mock,
  nebo aspoň assert na CSS pravidla: mobilní trigger nesmí být v žádném
  `@media` bloku `display: none`).

**1b. Hygiena metadat**
- `kind`: normalizovat (`analyza`→`analysis`, `clanek`→`article`), doplnit
  89 chybějících, validátor s výčtem povolených hodnot.
- `tag`: mapping tabulka 68 → ~25 řízených hodnot (sloučit varianty
  „Financování*", „Legislativa*", „Prevence*"…), `validate-articles.js`
  fail na hodnotu mimo slovník. Slovník jako `data/tags.json` (id, label),
  ať ho čte i frontend.
- Aktualizovat driftující statická čísla (CLAUDE.md „65 článků",
  HUB_FALLBACK_CARDS) — ideálně dynamicky, jinak sweep.

### Vlna 2 — věcné souvislosti (příbuznost přes indikátory, série do dat)

**2a. Related články přes `linked_indicators`**
- Skóre příbuznosti: overlap `linked_indicators` (váha 3) + shodná `rubric`
  (1) + shodný řízený `tag` (2); tie-break novější datum.
- Pod každým článkem blok „**Související články**" (3–4 karty s perexem)
  — viditelnější než dnešní karta v „Příbuzných sekcích".
- Stejný skórer použít v overlay search pro sekci „mohlo by vás zajímat"
  a na homepage (viz 2c).

**2b. Série a linie jako data („kolekce")**
- `articles.json`: nové pole `series: { id, part }`; registr sérií
  přesunout z `series-nav.js` do `data/series.json` (id, title, lead, hub).
- `series-nav.js` čte z dat; hub sekce Série ukazuje **všechny** série
  jako karty kolekcí (ne jen reformní devítku).
- `themes.json`: doplnit explicitní vazbu na články (buď `article_slugs`,
  nebo derivovat přes `linked_indicators` — jednotně a testovaně) a srovnat
  počet linií s realitou (5, ne 8). `tematicke-linie.html` tím povýší na
  plnohodnotné kolekce: linie = kurátorský výběr článků + indikátorů + akcí.
- Dlouhodobě: série i linie jsou týž koncept — **kolekce** (ordered vs
  unordered). Jedna datová struktura, dva rendery.

**2c. Homepage okno do korpusu**
- Místo „poslední 3": 1 nejnovější + 2 věcně vybrané (např. z rubrik, které
  v posledních 14 dnech nic neměly — rotace zajistí, že homepage neukazuje
  třikrát téma týdne).
- Pod karty přidat kompaktní řádek rubrik (8 odkazů s počty) — mapa korpusu
  za 1 řádek prostoru.

### Vlna 3 — hub jako archiv, rubriky jako landing pages

**3a. Rubriky povýšit**
- `rubrika.html` má dnes `canonical → clanky.html` (anti-duplicitní
  opatření). Při 20–50 článcích na rubriku si každá zaslouží vlastní
  indexovanou landing page: perex rubriky (co pokrývá, klíčové indikátory),
  2–3 essentials rubriky, pak plný chronologický seznam. Canonical na sebe.
- Nav „Články" → dropdown s 8 rubrikami (vzor existuje: Indikátory,
  Financování už dropdowny mají).

**3b. Archiv místo nekonečného seznamu**
- „Všechny články" seskupit po měsících (`<h4>Červenec 2026</h4>`), boční
  osnova roků/měsíců; „dalších 12" nahradit načtením celého měsíce.
- Stav filtrů v URL (`?rubrika=prevence&q=okovani`) — sdílitelné pohledy,
  funkční zpět-tlačítko.

**3c. Fulltextový index**
- Build krok (cron/publish pipeline) vygeneruje `data/search-index.json`:
  slug, title, perex + **celý normalizovaný text článku** (stripnuté HTML,
  bez skriptů/AV markup, lowercase, sbalené whitespace). Jen výňatek
  (nadpisy + prvních N slov) by nebyl fulltext — dotaz vyskytující se až
  v druhé polovině textu by článek nenašel. Statický web → index se počítá
  při publikaci, ne v prohlížeči.
- Odhad velikosti: long-form ~1 500–2 500 slov/článek → 212 článků ≈ 2–3 MB
  raw, ~0,7–1 MB gzipped. Pro lazy fetch při prvním hledání přijatelné;
  kdyby index přerostl (500+ článků), rozdělit na shardy po rocích nebo
  držet v indexu jen normalizovaná slova bez duplicit (bag-of-words
  per článek), což velikost srazí o ~40–60 %.
- Overlay i hub search jej použijí (lazy fetch při prvním hledání, jako
  dnes); do doby načtení indexu se hledá nad metadaty jako teď.

### Vlna 4 — governance (aby to vydrželo)

- **Publikační kontrakt článku** (vynucený ve `validate-articles.js`, fail):
  `rubric` ∈ 8 · `kind` ∈ výčet · `tag` ∈ `data/tags.json` (max 3) ·
  ≥1 `linked_indicators` (nebo explicitní `linked_indicators: []`
  s důvodem) · volitelně `series`/`theme`.
- **Rutiny aktualizovat**: PROMPT_DAILY_ROUTINE a NIGHTLY doplnit o krok
  „zařaď do kolekce, ověř tagy proti slovníku, zvaž vazbu na existující
  sérii" — souvislosti vznikají při psaní, ne zpětně.
- **Nightly sweep**: report sirotčích tagů, článků bez `linked_indicators`,
  kolekcí bez nových článků >90 dní, driftu statických čísel.

---

## 4) Pořadí a odhad

| Krok | Efekt | Náročnost |
|---|---|---|
| 1a mobil search | chybějící core funkce | S (1 session) |
| 1b hygiena metadat | předpoklad všeho dalšího | S–M |
| 2a related přes indikátory | největší skok v „souvislostech" | M |
| 2b série/kolekce do dat | škálovatelné kurátorství | M |
| 3a rubriky landing pages | SEO + orientace | M |
| 3b archiv + URL stav | dohledatelnost starších textů | M |
| 3c fulltext index | hloubka vyhledávání | M |
| 4 governance | udržitelnost | S, průběžně |

Doporučené pořadí: **1a → 1b → 2a → 2b → 3a → 3b → 3c**, vlna 4 průběžně
od 1b (validátor roste s každou vlnou).

---

## 5) Co záměrně neděláme

- **Žádný externí search engine** (Algolia apod.) — statický web bez klíčů
  je princip projektu; předpočítaný JSON index stačí.
- **Žádná nová hlavní navigační položka** — nav je plná; rubriky žijí jako
  dropdown pod Články.
- **Nerozbíjet URL článků** — `clanek-*.html` slugy jsou stabilní, veškerá
  struktura se staví nad nimi (kolekce, rubriky, index).
