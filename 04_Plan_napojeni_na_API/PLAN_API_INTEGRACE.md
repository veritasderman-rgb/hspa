# Plán napojení prototypu Zdravé Česko na reálná API

**Adresát:** Claude Code (sandboxed dev workflow)
**Cíl:** Z mock prototypu `01_Prototyp_Dashboard/index.html` udělat dashboard, který načítá živá data z veřejných API ÚZIS, NZIP, ČSÚ a OECD a obnovuje je v reálném čase.
**Verze:** 1.0 · květen 2026
**Časový odhad:** 5–7 sezení s Claude Code, pokud každé trvá 60–90 minut.

---

## 1 · Mapování zdrojů na konkrétní API/endpointy

V ČR neexistuje jeden univerzální API gateway. Jednotlivé instituce publikují otevřená data ve třech různých režimech:

### A · ÚZIS — strojové API (OAS 2.0)
Plnohodnotné REST API se Swagger dokumentací. Vhodné pro bezstavové fetche z prohlížeče.

| Endpoint | Co vrací | Formát |
|---|---|---|
| `https://nrpzs.uzis.cz/api/doc` | OpenAPI 2.0 specifikace | JSON |
| `https://nrpzs.uzis.cz/api/v1/mista-poskytovani` | Všechna místa poskytování péče (kompletní seznam) | JSON |
| `https://nrpzs.uzis.cz/api/v1/ciselniky/...` | Číselníky (specializace, formy péče, druhy) | JSON |
| `https://nrpzs.uzis.cz/api/v1/zdravotnicke-zarizeni/{id}/oddeleni` | Oddělení a ordinační doby | JSON |

Bez API klíče (open). Rate limit nezveřejněn — počítej s tím, že server dělá throttling, používej `Cache-Control` a klientské cache.

### B · NZIP / ÚZIS — soubory v Národním katalogu otevřených dat (NKOD)
Datasety publikované jako CSV/JSON, aktualizované měsíčně/ročně. Vhodné pro pravidelný preprocessing, ne pro live fetch.

| Datasety NZIS na NKOD | Co obsahuje |
|---|---|
| Výkony zdravotní péče dle formy péče a odbornosti | Roční řady 2010+, agregát |
| Výkony dle hlavní diagnózy a odbornosti | Diagnózy MKN-10 × specializace |
| Výkony u jednotlivých poskytovatelů včetně diagnózy | Granularita ICZ (anonymizované) |
| NRPZS export | Měsíční snapshot CSV |

URL pattern: `https://data.gov.cz/zdroj/datov%C3%A9-sady/00024341/...`
Distribuce typicky CSV nebo CSVW (CSV + JSON-LD schema).

### C · ČSÚ DataStat — strojové API
JSON API s dimensemi (čas, území, ukazatel). Pro demografická data.

| Endpoint | Co vrací |
|---|---|
| `https://data.csu.gov.cz/...` (DataStat API) | JSON s ukazateli dle dimensí |
| Dimenze `Uz012` | Kraje |
| Datasety: nadeje dozit, mortalita, EU-SILC | Rok × kraj × pohlaví × věk |

Bez klíče. Dokumentace: `csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu`

### D · OECD — pro mezinárodní benchmarky
SDMX-JSON API. Veřejné, bez klíče.
- Health Statistics dataset: `https://stats.oecd.org/SDMX-JSON/data/HEALTH_STAT/...`
- Health at a Glance indikátory přístupné také přes OECD.Stat REST API.

### E · Eurostat — alternativní zdroj pro EU srovnání
JSON-stat 2.0 API. `https://ec.europa.eu/eurostat/api/dissemination/...`

---

## 2 · Architektura: 3 vrstvy

```
┌──────────────────────────────────────────────────────────┐
│  VRSTVA 3 — FRONTEND (browser)                           │
│  index.html · React/Vanilla · Chart.js · fetch()         │
│  čte z /api/* nebo přímo z /data/*.json (statické)       │
└──────────────────────────────────────────────────────────┘
              ▲                              ▲
              │ JSON                         │ JSON (fallback)
┌─────────────┴──────────────┐  ┌────────────┴─────────────┐
│  VRSTVA 2 — BACKEND        │  │  VRSTVA 2b — STATIC      │
│  Node.js / FastAPI         │  │  Pre-rendered JSON v repu│
│  cache + harmonizace       │  │  pro GitHub Pages deploy │
│  endpoint /api/indicators  │  │  /data/indicators.json   │
└──────────────────────────┬─┘  └──────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  VRSTVA 1 — DATA INGESTION (cron)    │
        │  Node/Python skripty, beží 1× denně  │
        │  fetchují ÚZIS, NZIP, ČSÚ, OECD      │
        │  a ukládají do SQLite / JSON souborů │
        └──────────────────────────────────────┘
```

**Doporučení pro MVP:** vynechat backend, jet variantu 2b (static JSON v repu, refresh přes cron/GitHub Actions). Důvody:
- Žádné servery k provozu
- Jednoduchá deployovatelnost (GitHub Pages, Vercel, Netlify)
- Datová refresh frekvence v hodinách až dnech je úplně dostatečná pro HSPA indikátory
- Backend přidat až ve Fázi 2 (filtry, drilldowny, autenticace)

---

## 3 · Cílová struktura repozitáře

```
01_Prototyp_Dashboard/
├── README.md
├── package.json
├── index.html                 # frontend (z mock prototypu)
├── src/
│   ├── app.js                 # hlavní logika, načítání /data/*.json
│   ├── render.js              # vykreslení karet, sparklines
│   ├── audience.js            # přepínač občan/odborník/policy
│   └── styles.css
├── data/                      # generované, .gitignored kromě commit-snapshot
│   ├── indicators.json        # finální datová sada pro frontend
│   ├── regions.json           # data po krajích
│   └── snapshot-YYYYMMDD.json # historický snapshot
├── ingest/
│   ├── fetchers/
│   │   ├── uzis_nrpzs.js      # NRPZS API
│   │   ├── uzis_nzis.js       # výkony, hospitalizace (z NKOD)
│   │   ├── csu.js             # demografie, naděje dožití
│   │   ├── oecd.js            # mezinárodní benchmarky
│   │   └── eurostat.js
│   ├── transform.js           # harmonizace + výpočet indikátorů
│   ├── cache/                 # raw odpovědi (gitignored)
│   └── run.js                 # orchestrátor: fetch → transform → write
├── indicators/                # metodické karty
│   ├── 001_nadeje_doziti.json
│   ├── 002_30d_mortalita_ami.json
│   └── ...
├── tests/
│   └── ingest.test.js
└── .github/workflows/
    └── refresh.yml            # cron: každý den v 06:00 spustí ingest a commitne data/
```

---

## 4 · Datový kontrakt (frontend ↔ data/)

Frontend nesmí vědět nic o ÚZIS, OECD ani ČSÚ. Načítá pouze z `/data/indicators.json` v jednotném tvaru:

```json
{
  "version": "1.0",
  "generated_at": "2026-05-04T06:00:00Z",
  "indicators": [
    {
      "id": "nadeje_doziti_total",
      "name": "Naděje dožití při narození",
      "area": "Výsledky",
      "domain": "Zdravotní stav",
      "subdomain": "Doba dožití",
      "value": 79.9,
      "unit": "let",
      "year": 2024,
      "trend": [
        {"year": 2020, "value": 78.6},
        {"year": 2021, "value": 79.0},
        {"year": 2022, "value": 79.5},
        {"year": 2023, "value": 79.5},
        {"year": 2024, "value": 79.9}
      ],
      "benchmark": {"oecd": 81.1, "eu": 80.9},
      "signal": "warn",
      "source": {
        "name": "ČSÚ",
        "url": "https://csu.gov.cz/zemreli-nadeje-doziti-priciny-smrti",
        "fetched_at": "2026-05-04T06:00:00Z"
      },
      "method_card_url": "/indicators/001_nadeje_doziti.json"
    }
  ]
}
```

**Signal** se počítá automaticky v `transform.js`:
- `good` pokud hodnota lepší než OECD o ≥ 2 % (pro indikátor, kde větší = lepší) nebo o ≥ 2 % menší (kde menší = lepší)
- `warn` pokud v pásmu ±5 %
- `bad` pokud horší o > 5 %

---

## 5 · Implementační milníky pro Claude Code

Každý milník = jedno samostatné sezení. Kopíruj prompt do Claude Code — je psaný tak, aby agent věděl, co má udělat, ověřit a commitnout.

### M1 · Setup repa + datový kontrakt
**Prompt pro Claude Code:**
```
V projektu HSPA založ pracovní strukturu pro nový dashboard v 01_Prototyp_Dashboard/.
Vytvoř package.json s Node 22+, závislostmi: node-fetch, csv-parse, dotenv.
Vytvoř adresářovou strukturu podle PLAN_API_INTEGRACE.md sekce 3.
Vytvoř data/indicators.json se schématem ze sekce 4 a deseti dummy záznamy.
Refaktoruj index.html tak, aby místo inline pole `indicators` načítal `fetch('/data/indicators.json')`.
Ověř: spusť `npx http-server` v adresáři a v prohlížeči potvrď, že se karty zobrazují.
```

### M2 · NRPZS fetcher (nejjednodušší API)
**Prompt:**
```
Implementuj ingest/fetchers/uzis_nrpzs.js. 
Endpoint: https://nrpzs.uzis.cz/api/v1/mista-poskytovani 
Cíl: agregovat počet poskytovatelů podle kraje a typu specializace.
Výstup: ingest/cache/nrpzs_raw.json a ingest/cache/nrpzs_aggregated.json
Implementuj retry s exponential backoff (3 pokusy, 2/4/8 s).
Implementuj klientský cache (skip fetch, pokud cache mladší než 24 h).
Napiš tests/uzis_nrpzs.test.js — minimálně 1 happy path a 1 retry test (mock).
```

### M3 · ČSÚ fetcher pro demografii
**Prompt:**
```
Implementuj ingest/fetchers/csu.js. 
Cílové ukazatele: naděje dožití při narození (M+Ž), naděje dožití ve zdraví (HLY 65+), úmrtnost po krajích.
Použij DataStat JSON API podle https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu
Pro každý ukazatel: identifikuj dataset ID, dimenze (čas, území Uz012, pohlaví), proveď fetch, parsuj JSON, normalizuj na náš datový kontrakt.
Výstup: ingest/cache/csu_demografie.json
Pokud DataStat API není dostupné, použij fallback CSV exporty z csu.gov.cz/produkty/databaze-krok-otevrena-data.
```

### M4 · OECD benchmark fetcher
**Prompt:**
```
Implementuj ingest/fetchers/oecd.js.
Cíl: pro každý český indikátor získat odpovídající OECD průměr.
Použij OECD SDMX-JSON API (https://stats.oecd.org/SDMX-JSON/data/HEALTH_STAT/...).
Mapping: vytvoř ingest/mapping/oecd_codes.json — tabulka náš_indicator_id → OECD code (např. nadeje_doziti_total → "EVIETOTLPOPYRSCSU.HEALTHSTAT").
Výstup: ingest/cache/oecd_benchmarks.json
```

### M5 · Transform a výpočet indikátorů
**Prompt:**
```
Implementuj ingest/transform.js.
Vstup: všechny soubory v ingest/cache/
Logika:
1. Pro každý indikátor v indicators/*.json (metodické karty) najdi odpovídající surová data.
2. Vypočti finální hodnotu (často jen extrakt posledního roku, někdy poměr/agregát — viz metodická karta).
3. Spoč si trend (5letá řada).
4. Připoj benchmark z OECD.
5. Vypočti signal (good/warn/bad) podle pravidla v sekci 4.
6. Zapiš do data/indicators.json a data/regions.json.
Validuj: každý indikátor musí mít všechna pole z datového kontraktu, jinak fail.
Napiš tests/transform.test.js s fixture daty.
```

### M6 · Orchestrátor + GitHub Actions cron
**Prompt:**
```
Implementuj ingest/run.js — orchestrátor, který:
1. Spustí všechny fetchery (sekvenčně, ne paralelně, kvůli rate limitům).
2. Spustí transform.
3. Vytvoří snapshot data/snapshot-YYYYMMDD.json a commitne ho.
4. Pokud cokoliv selhalo, vyhodí non-zero exit a pošle zprávu (stderr).

Vytvoř .github/workflows/refresh.yml: 
- cron: '0 6 * * *' (každý den 6:00 UTC)
- spustí node ingest/run.js
- pokud došlo ke změně v data/, commitne s message "data: refresh YYYY-MM-DD"
- pošle Slack notifikaci při selhání (volitelné, secret)
```

### M7 · Frontend interaktivita
**Prompt:**
```
Vylepši src/app.js a src/render.js v 01_Prototyp_Dashboard/:
1. Přidej "Reload" tlačítko v hlavičce — volá fetch s cache-bust queryparam.
2. Přidej tooltip nad každý indikátor s odkazem na metodickou kartu (lazy load /indicators/{id}.json).
3. Přidej filter na regiony (dropdown v sekci Regiony).
4. Přidej "naposledy aktualizováno" timestamp ze pole generated_at.
5. Implementuj graceful degradation — pokud /data/indicators.json není dostupný, zobraz fallback s posledně cachovanou verzí v localStorage (ale bez ukládání citlivých dat).
6. Přidej CSV export každého indikátoru (download link).
```

### M8 · Verifikační kontrola
**Prompt:**
```
Verifikuj kompletní flow:
1. Spusť `node ingest/run.js` lokálně. Ověř, že všechny fetchery proběhnou.
2. Spusť testy: `npm test`. Všechny musí projít.
3. Lokálně serve dashboard a v prohlížeči ověř:
   - V síťové záložce devtools jsou requesty na /data/*.json úspěšné (200).
   - Karty se vykreslují.
   - Tlačítko Reload pumpne fresh data.
   - Tooltip s metodickou kartou funguje.
4. Vygeneruj report tests/coverage.html a podívej se, kde jsou mezery.
5. Vytvoř Pull Request s checklistem: ✓ ÚZIS · ✓ ČSÚ · ✓ OECD · ✓ tests · ✓ docs.
```

---

## 6 · Co dělat, když API nefunguje (fallback strategie)

Veřejná česká API jsou občas nestabilní. Kvalitní implementace musí fallback řešit, ne ignorovat.

| Selhání | Fallback |
|---|---|
| ÚZIS NRPZS API timeout | Použij `Data ke stažení` archiv CSV z `nrpzs.uzis.cz/index.php?pg=home--download` |
| ČSÚ DataStat 5xx | Stáhni CSV z databáze KROK |
| OECD SDMX-JSON změna formátu | Přepni na Eurostat JSON-stat |
| Žádný zdroj nedostupný | Použij poslední `data/snapshot-*.json` a nastav `generated_at: stale` |

V kódu: každý fetcher má dva režimy — `fetchLive()` a `fetchFallback()`. Wrap v `try/catch` a loguj, co bylo použito.

---

## 7 · Výpočet a metodika "signal" (semafor)

Každý indikátor má metodickou kartu `indicators/{id}.json`:

```json
{
  "id": "nadeje_doziti_total",
  "name": "Naděje dožití při narození",
  "domain": "Zdravotní stav",
  "subdomain": "Doba dožití",
  "definition": "Průměrný počet let, který se dožije novorozenec za daných úmrtnostních poměrů.",
  "unit": "let",
  "direction": "higher_is_better",
  "data_source": {
    "primary": {"type": "csu_datastat", "dataset": "DEM_NADEZE", "dimensions": {"sex": "T", "uzemi": "CZ0"}},
    "fallback": {"type": "csv", "url": "https://csu.gov.cz/.../nadeje-doziti.csv"}
  },
  "benchmark_source": {"type": "oecd", "code": "EVIETOTLPOPYRSCSU.HEALTHSTAT"},
  "signal_thresholds": {"good": 2, "warn": 5},
  "frequency": "yearly",
  "stewards": ["ČSÚ", "ÚZIS"],
  "method_notes": "Standardizováno. Pro ČR jsou data dostupná od 1991.",
  "limitations": "Nezohledňuje rozdíly v kvalitě života, jen v délce."
}
```

Kódy v `transform.js`:

```javascript
function computeSignal(value, benchmark, direction, thresholds) {
  if (benchmark == null) return 'neutral';
  const diff = ((value - benchmark) / benchmark) * 100;
  const adjusted = direction === 'higher_is_better' ? diff : -diff;
  if (adjusted > thresholds.good) return 'good';
  if (adjusted < -thresholds.warn) return 'bad';
  return 'warn';
}
```

---

## 8 · Bezpečnost a etika

- Všechna data agregátní — žádné PII, žádné identifikace pacientů
- Každý fetcher loguje URL, status, čas — auditní stopa v `ingest/cache/audit.log`
- `User-Agent` header: `ZdraveCesko-HSPA/1.0 (kontakt@example.cz)` — pomáhá ÚZIS identifikovat traffic, pokud něco selže
- `robots.txt` respektuj
- Pro NRPZS dodržuj měsíční rytmus aktualizací — nepouštěj cron častěji než jednou denně

---

## 9 · Co NEdělat (časté chyby)

1. **Neukládej data přímo z API do frontendu** — vždy přes transform vrstvu, jinak při změně API rozbiješ UI
2. **Nedělej fetch z prohlížeče přímo na ÚZIS** kvůli CORS — jdi přes svůj backend nebo statickou JSON v repu
3. **Nedělej parallel fetche bez throttlingu** — i veřejná API mají rate limity
4. **Necachuj v localStorage citlivá data** — i agregáty mohou být GDPR-relevantní v určitém kontextu
5. **Nehardcoduj URL endpointů** — drž je v `ingest/config.js` nebo env

---

## 10 · Hand-off checklist pro Claude Code

Před tím, než pustíš Claude Code na první milník, zkontroluj:

- [ ] V repu je tento plán uložen jako `04_Plan_napojeni_na_API/PLAN_API_INTEGRACE.md`
- [ ] Existuje `01_Prototyp_Dashboard/index.html` (současný mock prototyp)
- [ ] Máš Node 22+ nainstalovaný
- [ ] Máš git nakonfigurovaný (jméno, email)
- [ ] Máš GitHub repo (pro CI/CD)

Při zahájení každého sezení dej Claude Code:
1. Tento plán (cesta v projektu)
2. Konkrétní milník (M1–M8)
3. Vstupní stav (co už je hotové)
4. Definici "hotovo" pro tento milník

Po každém milníku ověř výsledek (spusť, prohlédni v prohlížeči, podívej se na diff) a teprve potom commitni a začni další.

---

*Verze 1.0 · květen 2026 · Připraveno pro implementaci v Claude Code.*
