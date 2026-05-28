# Plán: Klinická kvalita péče v ČR

**Cíl:** Nová podstránka `kvalita-pece.html` integrující klinické indikátory z PUK (KZP) a INDIKO (FBMI ČVUT) do HSPA Monitoru. Stránka s těžkou grafikou, krajským pohledem, transparentní atribucí zdrojů.

**Souhlas k re-publikaci dat:** PUK ✅ (KZP), INDIKO ✅ (FBMI ČVUT).
**Datová akvizice:** scraping (oba portály nepublikují strojově čitelné API).
**Status plánu:** ready to implement.
**Verze:** 1.0 · 2026-05-27.

---

## 1) Rozhodnutí a architektura

### Klíčová rozhodnutí

| # | Otázka | Volba |
|---|---|---|
| 1 | Název v menu | **„Kvalita péče"** |
| 2 | Položka v menu | **Submenu** pod „Indikátory" — řeší přeplněnost (11 → 9 top-level tabů) |
| 3 | INDIKO licence | OK (písemný souhlas FBMI ČVUT) |
| 4 | Krajská heatmapa | **14 krajů × 8 indikátorů** |
| 4B | Datová akvizice | **Scraping** s explicitní transparentností v UI |

### Submenu architektura

11 top-level tabů přeplňuje navigaci. Zavádíme **jednu úroveň dropdownů** pro 2 přirozené clustery:

```
Indikátory ▼              Financování ▼            ostatní zůstává standalone
├ HSPA přehled            ├ Financování            • Krajský pohled
├ Kvalita péče ◀ NEW     ├ Dohodovací řízení      • Co s tím můžu dělat já
└ Atlas pojištěnců        └ Poskytovatelé péče     • ● Články (editorial marker)
                                                    • Jak funguje
                                                    • Strategie
                                                    • O projektu
                                                    • Glosář
```

**Výsledek:** 11 záložek → **9 top-level + 2 submenu**.
**Aktivní stav:** pokud je current page child, parent se zvýrazní jako `.active`.
**Mobile drawer:** submenu se rozvine inline (accordion) v existujícím drawer markup.
**A11y:** `aria-haspopup="menu"`, `aria-expanded` na fokus/blur, klávesnicová navigace.

---

## 2) Stránka `kvalita-pece.html` — specifikace

### Layout (7 sekcí + hero + závěr)

```
┌─────────────────────────────────────────────────┐
│  HERO: „Klinická kvalita péče v ČR"            │
│  Lead — proč in-hospital ≠ skutečný outcome    │
│  Source disclaimer: PUK (KZP) + INDIKO (ČVUT)  │
│  Scraping disclosure                            │
├─────────────────────────────────────────────────┤
│  § 1  Bezpečnost pacientů → pooperační sepse   │
│        AHRQ PSI-13 · 1,03 % národní reference  │
├─────────────────────────────────────────────────┤
│  § 2  Akutní kardiologická péče → 30d AMI      │
│        In-hosp 5,2 % vs 30d post-admission 7,4 %│
├─────────────────────────────────────────────────┤
│  § 3  Akutní mozková příhoda                   │
│        Trombolýza + trombektomie + 30d mort.   │
│        Process flow SVG od ZZS po rehabilitaci │
├─────────────────────────────────────────────────┤
│  § 4  Antibiotická preskripce (AMR ambulantně) │
│        CZ-AWaRe + WHO-AWaRe + fluorochinolony  │
│        Trend chart 2017–2024                   │
├─────────────────────────────────────────────────┤
│  § 5  Komplexní onkologická chirurgie [PUK]    │
│        Volume → outcome scatter SVG            │
│        4 diagnózy: pankreas, plíce, kolorekt., │
│        jícen · 90denní mortalita               │
├─────────────────────────────────────────────────┤
│  § 6  Cesta onkologického pacienta [INDIKO]    │
│        Podezření → diagnostika → MDT → léčba   │
│        3 diagnózy: plíce, prsu, pankreas       │
│        Time-cascade SVG (dny v každé fázi)     │
├─────────────────────────────────────────────────┤
│  § 7  Krajská heatmapa                         │
│        14 krajů × 8 klíčových indikátorů       │
│        Barevné kódování dle odchylky od národn.│
├─────────────────────────────────────────────────┤
│  ZÁVĚR + metodika + zdroje + související četba │
└─────────────────────────────────────────────────┘
```

### Sourcing disclaimer (viditelný v hero)

> **Zdroj dat:** Portál ukazatelů kvality (PUK, Kancelář zdravotního pojištění) + INDIKO (FBMI ČVUT). Data získávána **scrapingem veřejně dostupných stránek**, protože ani jeden z portálů zatím nepublikuje strojově čitelné JSON/API endpoint. Re-publikováno s písemným souhlasem obou provozovatelů. Pro aktuální hodnoty doporučujeme primární zdroje.

### Vizualizační rejstřík

| Sekce | Vizuál | Komponenta | Animace |
|---|---|---|---|
| Hero | velký number-counter „1,03 %" sepse | `.av-counter-block` | count-up |
| § 1 sepse | bar-compare ČR vs AHRQ benchmark + heatmap 14 krajů | `.av-bar-compare` + `.clinical-heatmap` | bar fill |
| § 2 AMI | dual-reading: in-hosp 5,2 vs 30d 7,4 % + OECD 6,5 | nový `.dual-reading` SVG | crossfade |
| § 3 CMP | **process flow SVG** ZZS → IT centrum → trombo → rehab | custom inline SVG | sequential draw-in |
| § 4 AWaRe | trend line chart 2017–2024 | nový `.av-trend-line` SVG | draw-in |
| § 5 chirurgie | **scatter plot SVG** volume × mortalita | custom SVG | dots fade-in po skupinách |
| § 6 INDIKO | **time-cascade SVG** — vodorovné pruhy s mediánem dní | custom SVG | cumulative reveal |
| § 7 kraje | **heatmap mřížka** 14×8 | CSS grid + dynamic styles | fade-in po sloupcích |
| Závěr | metodický callout + sources | `.article-callout-caveat` | — |

### Nové CSS komponenty (rozšíření knihovny `.narok-svg-figure`)

- `.clinical-scatter` — volume vs outcome plot (X = počet výkonů/rok, Y = mortalita, dot per nemocnice)
- `.clinical-cascade` — vodorovný flow s drop-off mezi fázemi (časový pohled)
- `.clinical-heatmap` — 14×N mřížka pro krajské srovnání s color-coded buňkami
- `.dual-reading` — dvě číselné karty vedle sebe s rozdíly
- `.av-trend-line` — line chart pro časové řady

Všechny respektují `prefers-reduced-motion`.

---

## 3) Datový kontrakt

### Nový soubor `data/clinical-quality.json`

```json
{
  "version": "1.0",
  "generated_at": "2026-05-27T...",
  "source_attribution": {
    "puk": {
      "name": "Portál ukazatelů kvality (PUK)",
      "provider": "Kancelář zdravotního pojištění",
      "url": "https://puk.kancelarzp.cz/",
      "license": "Souhlas k re-publikaci agregovaných hodnot s atribucí (KZP, e-mail [datum])",
      "data_acquisition": "scraping",
      "scraping_note": "PUK nepublikuje strojově čitelný API endpoint. Data získávána scrapingem veřejně dostupných HTML stránek detail-karet ukazatelů."
    },
    "indiko": {
      "name": "INDIKO — portál indikátorů kvality péče",
      "provider": "FBMI ČVUT (CzechHTA, ved. Aleš Tichopád)",
      "url": "https://indiko.cz/",
      "license": "Souhlas FBMI ČVUT k re-publikaci agregovaných hodnot s atribucí",
      "data_acquisition": "scraping",
      "scraping_note": "INDIKO nepublikuje strojově čitelný API endpoint. Data získávána scrapingem veřejně dostupných HTML stránek diagnostických cest."
    }
  },
  "indicators": [
    {
      "id": "pooperacni_sepse_psi13",
      "section": "safety",
      "name": "Pooperační sepse",
      "value_national": 1.03,
      "unit": "%",
      "year": 2024,
      "method": "AHRQ PSI-13, log. regrese, adjustace dle skupiny výkonů",
      "source": "puk",
      "source_url": "https://puk.kancelarzp.cz/pooperacni-sepse/",
      "by_region": [/* 14 krajů */],
      "trend": [/* roční řada */],
      "benchmarks": { "ahrq_us": [0.7, 1.2] }
    }
  ]
}
```

### Klíčové rozlišení od `indicators.json`

- HSPA `indicators.json` = abstrahované HSPA framework indikátory (80, OECD signal logic)
- `clinical-quality.json` = klinické indikátory z PUK/INDIKO se zachovanou metodikou KZP/ČVUT
- Samostatná validace, samostatný source-attribution layer
- Respektuje licenční podmínky obou portálů (data se nemíchají s naší HSPA logikou)

### Indikátory pro § 7 heatmapu (14 × 8)

1. Pooperační sepse (PUK PSI-13)
2. 30d mortalita AMI (PUK)
3. 30d mortalita CMP (PUK)
4. Trombektomie CMP — % využití (PUK)
5. AWaRe preskripce praktici (PUK)
6. 90d mortalita resekce kolorektálního karcinomu (PUK)
7. % MDT projednání karcinom plic (INDIKO)
8. Čas k diagnóze karcinom prsu (INDIKO)

---

## 4) Implementační fáze

### Fáze 0 — Submenu architektura (1 večer)

Vstupní brána. Lze udělat samostatně, **nepatří k hlavnímu PR**.

- `src/page-shared.js` → `renderModuleNav()` rozšířit o `children: [...]` pole
- `src/styles.css` → `.module-submenu`, `.module-tab-has-submenu`, caret „▼"
- Dropdown přes CSS `:hover` + `:focus-within` (no JS handler)
- A11y: `aria-haspopup="menu"`, `aria-expanded`
- Mobile drawer: inline accordion
- Active state propagation child → parent

**Deliverable:** PR-1 — submenu funguje na desktop + mobile, „Indikátory" má dropdown s HSPA přehled + Atlas pojištěnců (zatím; Kvalita péče přibude v Fázi 1).

### Fáze 1 — Skelet + § 1 sepse (1–2 večery)

- `kvalita-pece.html` — full skelet, 7 sekcí placeholders + hero + závěr
- Sekce § 1 (pooperační sepse) plně implementována
- `data/clinical-quality.json` — pouze 1 indikátor (sepse) s ručně zadanými hodnotami
- `src/clinical-quality.js` — renderer (modulární; přidává sekce ze JSON)
- 3 nové CSS komponenty (`.clinical-scatter`, `.clinical-cascade`, `.clinical-heatmap`) — stubs
- Submenu doplněno o „Kvalita péče"
- Cross-link z HSPA přehledu
- Source attribution footer + scraping disclosure

**Deliverable:** PR-2 — stránka existuje, § 1 funkční, ostatní sekce mají skelet s placeholders.

### Fáze 2 — PUK indikátory § 2–5, § 7 (3 večery)

- § 2 AMI dual-reading
- § 3 CMP process flow (nejnáročnější vizuál — custom SVG, ZZS → IT centrum → trombolýza/trombektomie → 30d → rehab)
- § 4 AWaRe trend line 2017–2024
- § 5 chirurgie scatter plot (4 diagnózy)
- § 7 krajská heatmapa (zatím s PUK daty pro AMI/CMP/sepse/AWaRe + 1 ze 4 chirurgických)
- Zbývající indikátory v `clinical-quality.json` (ručně zadané z PUK)

**Deliverable:** PR-3 — PUK kompletní, INDIKO ještě chybí.

### Fáze 3 — INDIKO integrace § 6 (1–2 večery)

- § 6 cesta onkologického pacienta — time-cascade SVG pro 3 diagnózy
- INDIKO data doplněna do `clinical-quality.json`
- Cross-link na existující explainer `indiko_portal`
- § 7 heatmap doplněna o 3 INDIKO indikátory (8 celkem)

**Deliverable:** PR-4 — všech 7 sekcí plně funkčních s daty.

### Fáze 4 — Scrapery + ETL (2 večery)

- `ingest/fetchers/puk.js` — scraping 42 PUK detail stránek pomocí `cheerio`
- `ingest/fetchers/indiko.js` — scraping `indiko.cz`
- `ingest/validate-clinical-quality.js` — schema check, 14 krajů check, atribuce check
- Cron integrace (GitHub Actions, 06:00 UTC)
- `freshness.json` — nová kategorie `clinical`
- **Transparentní logging:** scraper píše do `data/clinical-scraping-log.json` (datum, URL, počet vytažených hodnot) — auditní stopa
- Nová dependency: `cheerio@1.x`

**Deliverable:** PR-5 — automatický refresh dat, žádná manuální údržba JSON.

### Fáze 5 — Verifikace a QA (1–2 večery) ⭐ NEW

Před publikací musí každý PR projít:

**5.1 Static validation**
- [ ] `npm run validate:all` — všechny validátory OK
- [ ] `npm test` — 351+ testů, žádné nové selhání
- [ ] `node --check` na všech upravených JS souborech
- [ ] JSON schema check pro `clinical-quality.json`
- [ ] Validate-clinical-quality.js spuštěn manuálně

**5.2 Smoke tests**
- [ ] `kvalita-pece.html` → HTTP 200 (lokálně + Vercel preview)
- [ ] Každá sekce § 1–7 obsahuje očekávané vizuály (grep curl output)
- [ ] Source attribution footer přítomný
- [ ] Scraping disclosure viditelný v hero
- [ ] Submenu funguje (Indikátory dropdown)

**5.3 A11y audit**
- [ ] Klávesnicová navigace funguje (Tab přes submenu, Enter aktivuje)
- [ ] Screen reader test (VoiceOver / NVDA) — labelu submenu se předčítají
- [ ] Kontrast textu min. 4.5:1 (Lighthouse)
- [ ] Všechny `<img>` mají `alt` atribut (i prázdný pro dekorativní)
- [ ] SVG figures mají `role="img"` + `aria-label`
- [ ] `prefers-reduced-motion` — animace se vypnou

**5.4 Performance audit**
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Cover obrázek < 100 KB
- [ ] Inline SVG suma < 50 KB
- [ ] LCP < 2.5s na 4G
- [ ] CLS < 0.1
- [ ] Total JS bundle pro stránku < 100 KB

**5.5 Cross-browser test**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS 17+)
- [ ] Mobile Chrome (Android)

**5.6 Licenční a sourcing audit**
- [ ] Každé tvrzení na stránce má atribuci (PUK nebo INDIKO nebo OECD nebo ÚZIS)
- [ ] Source URL fungují (HTTP 200, ne 404/redirect)
- [ ] Scraping disclosure odpovídá realitě (data byla skutečně scrapnutá)
- [ ] Licence README v `data/clinical-quality.json` aktuální
- [ ] Datum souhlasu KZP + FBMI ČVUT zaznamenáno (e-mail timestamp)

**5.7 Content QA**
- [ ] Žádné překlepy (zejména medicínské termíny: PSI-13, AWaRe, trombolýza)
- [ ] Žádné zastaralé hodnoty (PUK data ne starší 6 měsíců)
- [ ] Mezinárodní benchmarky aktuální (HAaG 2025, AHRQ poslední rok)
- [ ] Disclaimer „není redakční stanovisko, je experiment" konzistentní s ostatním webem

**Deliverable:** Fáze 5 nemá vlastní PR, ale gate před každým PR-2 až PR-5 merge.

### Fáze 6 — Grafika a media (1 večer) ⭐ NEW

**6.1 Stránkový cover (1200×630)**
- [ ] Editorial styl ve stylu portálu (Source Serif 4 + Inter, paper background)
- [ ] Brand mark „HSPA monitor · Kvalita péče"
- [ ] Lead-čísla: 1,03 % sepse · 7,4 % AMI · 11,2 % CMP
- [ ] Reusable generátor: `scripts/generate-page-cover.js` (extension k existujícímu)
- [ ] Output: `assets/social/kvalita-pece.png` + `.svg`
- [ ] Vložit jako `og:image` v `<head>`

**6.2 Social share cards**
- [ ] LinkedIn (1200×630) — již z 6.1
- [ ] Facebook (1200×630) — již z 6.1
- [ ] Twitter (1600×900) — varianta
- [ ] Instagram (1080×1080) — square varianta (volitelné)

**6.3 Inline SVG cover na hub stránce**
- [ ] Cover pro `clanky.html` hub matrix (300×170 thumbnail)
- [ ] Cover thumbnail v menu submenu (volitelně)

**6.4 Schema.org JSON-LD**
- [ ] `<script type="application/ld+json">` v `<head>`
- [ ] Type: `Dataset` + `WebPage`
- [ ] Distribuce zdrojů: PUK + INDIKO + ÚZIS
- [ ] `dateModified` automaticky z `clinical-quality.json` `generated_at`

**6.5 Open Graph meta tags**
- [ ] `og:type` = website
- [ ] `og:title`, `og:description`, `og:image`, `og:url`
- [ ] `twitter:card` = `summary_large_image`
- [ ] `twitter:image`, `twitter:title`, `twitter:description`

**6.6 Favicon a manifest** (pokud chybí, jinak skip)
- [ ] Aktuální favicon na stránce funguje
- [ ] Webmanifest správný

**Deliverable:** Fáze 6 je součástí PR-2 (Fáze 1, skelet), ne samostatný PR.

### Fáze 7 — Publication checklist (před merge poslední PR) ⭐ NEW

Finální pre-publikační kontrola:

**7.1 Editorial**
- [ ] Audit-status = `verified` (pokud všechny scénáře projdou) nebo `review-pending` s konkrétními otevřenými body
- [ ] Datum publikace v `<meta property="article:published_time">` nastaven
- [ ] Žádné `TODO`, `XXX`, `FIXME` v textu
- [ ] Žádné inline auditní bannery (`article-review-banner`)

**7.2 Cross-linking**
- [ ] Z `clanky.html` hub matrix odkazuje na novou stránku
- [ ] Z `hspa-prehled.html` v sekci „Příbuzné sekce" odkazuje na novou stránku
- [ ] Z `kraje.html` v sekci „Příbuzné sekce" odkazuje na novou stránku
- [ ] Z `prevence.html` v sekci „Příbuzné sekce" odkazuje na novou stránku
- [ ] Z `o-projektu.html` timeline doplněn milník o spuštění Kvality péče
- [ ] Existující explainer `indiko_portal` linkuje na § 6 nové stránky
- [ ] Strategie `nikez_zdravotnictvi` linkuje na § 1 (sepse) nové stránky

**7.3 Sitemap a SEO**
- [ ] `sitemap.xml` regenerován (pokud existuje, jinak vytvořit)
- [ ] `robots.txt` povoluje crawling
- [ ] Canonical URL nastavena
- [ ] Lang attribute `cs` všude

**7.4 Analytics**
- [ ] GA4 event tracking funguje (auto přes globální `analytics.js`)
- [ ] Vercel Analytics propojen
- [ ] Custom event pro „download data" (pokud bude tlačítko export JSON)

**7.5 Backup a rollback**
- [ ] Plán rollback: kterým commitem revert pokud něco selže
- [ ] Snapshot dat v `data/snapshot-YYYY-MM-DD.json` zachycuje nová pole
- [ ] CHANGELOG nebo `BACKLOG.md` aktualizován

**7.6 Announcement**
- [ ] Launch banner pro LinkedIn vygenerován (`scripts/generate-launch-banner.js` s upravenými countery)
- [ ] Text postu připraven (Facebook + LinkedIn verze)
- [ ] Po publikaci: PR → `monitorovací den 1` — kontrola GA, Vercel Analytics, žádné console errory

**Deliverable:** Žádný separátní PR, ale checklist v PR-5 description.

---

## 5) Pořadí PR

1. **PR-1** — Submenu architektura (Fáze 0)
2. **PR-2** — Stránka skelet + § 1 sepse + cover (Fáze 1 + 6)
3. **PR-3** — § 2–5 + § 7 PUK kompletace (Fáze 2)
4. **PR-4** — § 6 INDIKO (Fáze 3)
5. **PR-5** — Scrapery + ETL + final QA + publication checklist (Fáze 4 + 5 + 7)

Každý PR projde Fází 5 (Verifikace) jako gate. Fáze 6 součástí PR-2. Fáze 7 součástí PR-5.

---

## 6) Otevřené body

| # | Otázka | Status |
|---|---|---|
| 1 | Cheerio dependency v `package.json` (devDependency) | čeká schválení |
| 2 | Submenu může být CSS-only (žádný JS handler kromě a11y)? | pravděpodobně ano |
| 3 | INDIKO scraping — kolik diagnostických cest stahovat? | zatím 3 (plíce, prsu, pankreas) |
| 4 | Krajská heatmap — barevná škála 5-stupňová (silně dobrá → silně špatná)? | navrhuji ano |
| 5 | Bude export `clinical-quality.json` jako CSV downloadable? | volitelně, Fáze 4 |

---

## 7) Rizika a kontingence

| Riziko | Dopad | Mitigace |
|---|---|---|
| PUK změní strukturu HTML | scraper selže | Validátor + e-mail alert; manuál fallback se starým snapshotem |
| INDIKO publish přerušen | data zastarají | Použít sourcing disclaimer „k datu X"; auto-detect old data |
| Souhlas KZP/FBMI revokován | musíme stáhnout data | Page přejde na „odkazové" zobrazení (jen URL na primární zdroj) |
| Cheerio breaking change | parser selže | Pin major version, CI test |
| Performance — 14×8 heatmap pomalé | bad LCP | SVG bez DOM-heavy elementů, gzip |

---

## 8) Klíčové soubory

**Nové:**
- `kvalita-pece.html`
- `data/clinical-quality.json`
- `data/clinical-scraping-log.json`
- `src/clinical-quality.js`
- `ingest/fetchers/puk.js`
- `ingest/fetchers/indiko.js`
- `ingest/validate-clinical-quality.js`
- `assets/social/kvalita-pece.png` + `.svg`
- `scripts/generate-page-cover.js` (volitelně extension)

**Upravené:**
- `src/styles.css` (~150 nových řádků pro klinické komponenty)
- `src/page-shared.js` (submenu renderer)
- `package.json` (cheerio dependency)
- `data/freshness.json` (nová kategorie `clinical`)
- 5+ HTML stránek (cross-link „Příbuzné sekce")
- `o-projektu.html` (timeline milestone)
- `data/explainers.json` (cross-link `indiko_portal`)
- `data/strategies.json` (cross-link `nikez_zdravotnictvi`)

---

## 9) Estimace času

| Fáze | Náročnost | Sloupec |
|---|---|---|
| 0 — Submenu | 1 večer | (1 PR) |
| 1 — Skelet + sepse + cover | 1–2 večery | (1 PR) |
| 2 — PUK indikátory | 3 večery | (1 PR) |
| 3 — INDIKO | 1–2 večery | (1 PR) |
| 4 — Scrapery | 2 večery | (1 PR) |
| 5 — Verifikace | průběžně | (gate) |
| 6 — Grafika | 1 večer | (součást PR-2) |
| 7 — Publication | 0,5 večera | (součást PR-5) |
| **Celkem** | **~9–11 večerů** | **5 PR** |

---

## 10) Aktualizace tohoto plánu

Tento dokument je living spec. Aktualizovat v každé z následujících situací:
- Nový PR uzavřen / merged
- Změna scope (přidaná/odebraná sekce)
- Změna licence kteréhokoli zdroje
- Pivot na ETL strategii (např. KZP zveřejní API)
- Nový kandidát na klinický indikátor (po dohodě)

Verze: 1.0 (2026-05-27) — initial.
